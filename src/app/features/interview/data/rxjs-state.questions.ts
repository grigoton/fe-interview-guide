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
      ru: `## 🧩 Простыми словами

Observable — это не сами данные, а **рецепт**, как их получить. Представь запечатанный конверт с инструкцией: «когда откроешь — сделай вот это». Пока конверт не открыли (не вызвали \`subscribe()\`), внутри ничего не происходит. А каждый, кто открывает свой конверт, запускает инструкцию заново, с самого начала.

### Что такое Observable под капотом

\`Observable\` — это, по сути, обёртка над функцией подписки. Когда ты пишешь \`new Observable(fn)\`, ты передаёшь функцию вида \`(subscriber) => teardown\`. Эта функция **не выполняется сразу**. Она ждёт, пока кто-то не вызовет \`subscribe()\`. Только тогда «инструкция» запускается и начинает выдавать значения.

\`teardown\` (о нём подробнее в отдельном вопросе) — это то, что вернёт функция подписки: код очистки, который сработает, когда поток закончится или подписку отменят.

### Ленивость (lazy)

- Сам по себе Observable — это лишь **описание** потока, а не выполняющийся код. Как ноты, которые ещё никто не играет.
- Логика внутри \`new Observable(fn)\` запускается **заново на каждую подписку**. Подписался — оркестр заиграл; подписался второй раз — заиграл ещё раз, с начала.
- Именно поэтому в Angular HTTP-запрос **не уйдёт**, пока ты не подпишешься (или пока \`async\` pipe не подпишется за тебя). Нет подписки — нет запроса.

### Unicast (одноадресность)

- Каждая подписка создаёт **отдельное** выполнение всей цепочки. Два подписчика — два независимых запуска, каждый со своими данными.
- Это противоположность \`Subject\` (multicast — многоадресность), где **один** источник раздаёт значения **многим** подписчикам сразу. Про Subject есть отдельный вопрос.

### Контракт Observer

Observer («наблюдатель») — это объект с методами, которые получают то, что выдаёт поток:

- \`next(value)\` — приходит значение; может вызываться \`0..N\` раз;
- \`error(err)\` — ошибка; **терминальный** (завершающий), максимум 1 раз;
- \`complete()\` — поток успешно закончился; **терминальный**, максимум 1 раз.

Есть строгая **грамматика** (правило порядка вызовов): \`next* (error | complete)?\`. Читается так: сколько угодно \`next\`, а потом максимум один \`error\` **или** один \`complete\`. После терминального сигнала значения больше не приходят и срабатывает teardown.

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // проигнорировано — поток уже завершён
  return () => console.log('teardown');
});
\`\`\`

Здесь \`next(2)\` не дойдёт до подписчика: после \`complete()\` поток закрыт. За соблюдением этого правила следит \`Subscriber\` — «безопасная» обёртка над твоим Observer. Он гарантирует контракт (глушит сигналы после завершения), ловит исключения и вызывает teardown.

## ⚠️ Подводные камни

- Забыл подписаться — код внутри Observable **вообще не выполнится**. Частая ошибка новичков: «почему запрос не уходит?».
- Ждёшь, что два подписчика поделят один запрос? Нет: cold Observable даст **два** независимых запуска. Делёж — это уже multicast/\`share()\`.
- После \`complete()\` или \`error()\` любые \`next\` бессмысленны — их проглотит Subscriber.

## 🎯 Запомни

- Observable — ленивый **рецепт**: ничего не происходит без \`subscribe()\`.
- Unicast: каждая подписка — свой независимый запуск с нуля.
- Контракт Observer: \`next*\` затем максимум один \`error\` **или** \`complete\`, после чего teardown.`,
      en: `## 🧩 In plain words

An Observable is not the data itself — it is a **recipe** for producing it. Picture a sealed envelope with an instruction inside: "when you open me, do this." Until someone opens it (calls \`subscribe()\`), nothing happens inside. And every person who opens their own envelope runs the instruction again, from the very beginning.

### What an Observable is under the hood

An \`Observable\` is essentially a wrapper around a subscribe function. When you write \`new Observable(fn)\`, you pass a function shaped like \`(subscriber) => teardown\`. That function **does not run immediately**. It waits until someone calls \`subscribe()\`. Only then does the "instruction" start and begin producing values.

\`teardown\` (covered in its own question) is what the subscribe function returns: cleanup code that fires when the stream ends or the subscription is cancelled.

### Laziness

- An Observable by itself is just a **description** of a stream, not running code. Like sheet music that nobody is playing yet.
- The logic inside \`new Observable(fn)\` re-runs **on every subscription**. Subscribe once and the orchestra plays; subscribe again and it plays again, from the top.
- That is exactly why in Angular an HTTP request **is not fired** until you subscribe (or until the \`async\` pipe subscribes for you). No subscription, no request.

### Unicast

- Each subscription creates a **separate** execution of the whole chain. Two subscribers means two independent runs, each with its own data.
- This is the opposite of a \`Subject\` (multicast), where **one** source fans values out to **many** subscribers at once. Subjects have their own question.

### The Observer contract

An Observer is an object with methods that receive whatever the stream produces:

- \`next(value)\` — a value arrives; may be called \`0..N\` times;
- \`error(err)\` — an error; **terminal** (ending), at most once;
- \`complete()\` — the stream finished successfully; **terminal**, at most once.

There is a strict **grammar** (a rule for call order): \`next* (error | complete)?\`. Read it as: any number of \`next\`, then at most one \`error\` **or** one \`complete\`. After a terminal signal, no more values flow and teardown runs.

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2); // ignored — the stream is already done
  return () => console.log('teardown');
});
\`\`\`

Here \`next(2)\` never reaches the subscriber: after \`complete()\` the stream is closed. Enforcing this rule is the job of the \`Subscriber\` — a "safe" wrapper around your Observer. It guarantees the contract (swallows signals after completion), catches exceptions, and triggers teardown.

## ⚠️ Common pitfalls

- Forgot to subscribe? The code inside the Observable **never runs at all**. A classic beginner bug: "why isn't the request firing?"
- Expecting two subscribers to share one request? They won't: a cold Observable gives **two** independent runs. Sharing requires multicast/\`share()\`.
- After \`complete()\` or \`error()\`, any \`next\` is pointless — the Subscriber swallows it.

## 🎯 Key takeaways

- An Observable is a lazy **recipe**: nothing happens without \`subscribe()\`.
- Unicast: each subscription is its own independent run from scratch.
- Observer contract: \`next*\` then at most one \`error\` **or** \`complete\`, then teardown.`
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
      ru: `## 🧩 Простыми словами

Когда поток что-то запускает — таймер, слушатель события, WebSocket — кто-то должен потом это **выключить**. Teardown («уборка», «демонтаж») — это как кнопка выключения, которую ты вешаешь прямо рядом с прибором, когда его включаешь. Отпустил подписку — RxJS сам нажмёт эту кнопку. Забыл повесить кнопку — прибор будет работать вечно и жрать память.

### Что такое teardown

Функция, которую ты **возвращаешь** из \`new Observable(subscriber => { ... return teardown })\`, вызывается, когда поток заканчивается любым из трёх способов:

- подписчик сам вызвал \`unsubscribe()\` (отменил подписку);
- источник завершился через \`complete()\`;
- источник упал через \`error()\`.

Teardown — это место, где ты **освобождаешь ресурсы**: \`clearInterval\`, \`removeEventListener\`, закрытие WebSocket, отмена HTTP-запроса. Всё, что ты «включил» при подписке, здесь надо «выключить».

### Под капотом

Объект \`Subscription\` (подписка) хранит список «финализаторов» — функций очистки. Оператор \`pipe\` строит **цепочку** подписок: внешняя подписка добавляет внутреннюю как ребёнка (child). Когда ты вызываешь \`unsubscribe()\` у родителя, рекурсивно отписываются все потомки. Так teardown **распространяется вниз** по всей цепочке операторов — тебе не нужно вручную чистить каждое звено.

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // обязательно!
});
const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // остановит interval
\`\`\`

Здесь при подписке запускается \`setInterval\`. Teardown \`() => clearInterval(id)\` — это та самая «кнопка выключения». Через 3.5 секунды \`unsubscribe()\` нажимает её, и таймер останавливается. Без строки с \`clearInterval\` таймер тикал бы вечно.

### Реальный паттерн: обёртка над браузерным API

Так же безопасно оборачивают любой браузерный API, например \`ResizeObserver\`:

\`\`\`ts
function fromResize(el: Element): Observable<DOMRectReadOnly> {
  return new Observable((subscriber) => {
    const ro = new ResizeObserver((entries) => {
      subscriber.next(entries[0].contentRect);
    });
    ro.observe(el);
    // teardown: отключаемся, когда уходит последний подписчик
    return () => ro.disconnect();
  });
}
\`\`\`

Подписка создаёт \`ResizeObserver\` и начинает следить за элементом; teardown вызывает \`ro.disconnect()\`, освобождая наблюдатель, когда подписка кончилась.

### Почему это критично

- Без teardown \`setInterval\` или слушатель события **продолжат работать** после отписки. Это **утечка памяти** и «фантомные» эмиссии — код реагирует на события, которые уже никому не нужны.
- Важный нюанс: после отписки Subscriber **игнорирует** \`next\` (значения до подписчика не дойдут), но **сам источник** — таймер, сокет — так просто не остановится. Остановить его должен именно твой teardown.
- Идемпотентность: повторный \`unsubscribe()\` безопасен. Teardown выполнится **ровно один раз**, второй вызов ничего не сломает.

## ⚠️ Подводные камни

- Забыл \`return\` из функции подписки → ресурс никогда не освободится. Молчаливая утечка, которую тяжело поймать.
- Полагаться на то, что «Subscriber всё равно игнорирует next» — ошибка: источник (таймер, запрос) продолжит тратить ресурсы.
- Длинноживущие подписки в компонентах без отписки при уничтожении — классический источник утечек в Angular (используй \`takeUntilDestroyed\`, \`async\` pipe и т.п.).

## 🎯 Запомни

- Всё, что «включил» при подписке — «выключи» в teardown.
- Teardown срабатывает при \`unsubscribe()\`, \`complete()\` **и** \`error()\`.
- \`unsubscribe()\` рекурсивно чистит всю цепочку \`pipe\` и безопасен при повторном вызове.`,
      en: `## 🧩 In plain words

When a stream starts something — a timer, an event listener, a WebSocket — someone has to **switch it off** later. Teardown is like an off-switch you mount right next to the device the moment you turn it on. Let go of the subscription and RxJS presses that switch for you. Forget to mount the switch and the device runs forever, eating memory.

### What teardown is

The function you **return** from \`new Observable(subscriber => { ... return teardown })\` is invoked when the stream ends in any of three ways:

- the subscriber itself calls \`unsubscribe()\` (cancels the subscription);
- the source completes via \`complete()\`;
- the source errors via \`error()\`.

Teardown is where you **release resources**: \`clearInterval\`, \`removeEventListener\`, closing a WebSocket, cancelling an HTTP request. Whatever you "turned on" at subscribe time, you "turn off" here.

### Under the hood

A \`Subscription\` object holds a list of "finalizers" — cleanup functions. The \`pipe\` operator builds a **chain** of subscriptions: the outer subscription adds the inner one as a child. When you call \`unsubscribe()\` on the parent, all children are recursively unsubscribed. So teardown **propagates down** the whole operator chain — you don't have to clean each link by hand.

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // mandatory!
});
const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // stops the interval
\`\`\`

Here subscribing starts a \`setInterval\`. The teardown \`() => clearInterval(id)\` is that off-switch. After 3.5 seconds \`unsubscribe()\` presses it and the timer stops. Without the \`clearInterval\` line the timer would tick forever.

### A real pattern: wrapping a browser API

The same safe wrapping applies to any browser API, for example \`ResizeObserver\`:

\`\`\`ts
function fromResize(el: Element): Observable<DOMRectReadOnly> {
  return new Observable((subscriber) => {
    const ro = new ResizeObserver((entries) => {
      subscriber.next(entries[0].contentRect);
    });
    ro.observe(el);
    // teardown: disconnect when the last subscriber leaves
    return () => ro.disconnect();
  });
}
\`\`\`

Subscribing creates a \`ResizeObserver\` and starts watching the element; the teardown calls \`ro.disconnect()\`, freeing the observer once the subscription ends.

### Why it matters

- Without teardown the \`setInterval\` or event listener **keeps running** after unsubscription. That is a **memory leak** and "phantom" emissions — code reacting to events nobody needs anymore.
- Key nuance: after unsubscribing, the Subscriber **ignores** \`next\` (values never reach the subscriber), but the **source itself** — timer, socket — will not stop on its own. Only your teardown can stop it.
- Idempotency: a repeated \`unsubscribe()\` is safe. Teardown runs **exactly once**; a second call breaks nothing.

## ⚠️ Common pitfalls

- Forgetting the \`return\` from the subscribe function → the resource is never released. A silent leak that is hard to catch.
- Relying on "the Subscriber ignores next anyway" is a mistake: the source (timer, request) keeps burning resources.
- Long-lived component subscriptions with no unsubscribe on destroy — a classic leak source in Angular (use \`takeUntilDestroyed\`, the \`async\` pipe, etc.).

## 🎯 Key takeaways

- Whatever you "turned on" at subscribe time — "turn off" in teardown.
- Teardown fires on \`unsubscribe()\`, \`complete()\`, **and** \`error()\`.
- \`unsubscribe()\` recursively cleans the whole \`pipe\` chain and is safe to call twice.`
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
      ru: `## 🧩 Простыми словами

Разница между cold и hot Observable — это разница между **фильмом по запросу** и **прямым эфиром**. Cold: каждый зритель включает фильм и смотрит с самого начала, у каждого своя копия. Hot: идёт живая трансляция, подключился позже — пропустил начало, и все смотрят одну и ту же картинку одновременно.

### Cold Observable (холодный)

- Источник данных создаётся **внутри** Observable и **заново на каждую подписку**.
- Каждый подписчик получает свою «копию» потока с самого начала — независимо от других.
- Примеры: \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`.

Отсюда вытекает: два подписчика на один \`HttpClient.get\` — это **два** запроса, а не один поделённый.

### Hot Observable (горячий)

- Источник данных существует **вне** Observable и **разделяется** между подписчиками.
- Подписчики получают значения «с того момента, как подключились», и могут пропустить ранние эмиссии.
- Примеры: \`Subject\`, \`fromEvent(document, 'click')\`, WebSocket. Клики происходят независимо от того, слушаешь ты их или нет.

### Аналогия

Cold — фильм на Netflix: каждый смотрит с начала, у каждого свой сеанс. Hot — прямой эфир: подключился позже — начало пропустил, и картинка у всех общая.

### Как сделать cold горячим

Через **multicasting** (многоадресность) — поделить **одно** выполнение источника между всеми подписчиками, вместо того чтобы запускать его заново для каждого:

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // refCount-мультикаст

// все подписчики разделяют один interval
hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
\`\`\`

Без \`share()\` подписчик \`B\` завёл бы свой собственный \`interval\` с нуля. С \`share()\` он подключается к уже идущему потоку \`A\` — и потому увидит примерно \`2, 3, 4...\`, пропустив начало, ровно как опоздавший зритель прямого эфира.

Как это работает: операторы \`share()\`, \`shareReplay()\`, \`connectable()\` и (устаревший) \`multicast()\` вставляют \`Subject\` между источником и подписчиками. Источник запускается **один раз**, а \`Subject\` раздаёт его значения всем сразу. Это и превращает cold в hot. Приставка \`refCount\` в \`share()\` значит: источник включается, когда появляется первый подписчик, и выключается, когда уходит последний.

## ⚠️ Подводные камни

- «Почему запрос ушёл дважды?» — потому что \`HttpClient.get\` cold, а ты подписался дважды. Лечится \`shareReplay(1)\`.
- Hot-поток может **пропустить** значения, которые пришли до подписки. Если поздним подписчикам нужно «последнее» значение — нужен \`shareReplay\`/\`BehaviorSubject\`, а не голый \`Subject\`.
- \`shareReplay\` с буфером держит значения в памяти — большой буфер может стать утечкой.

## 🎯 Запомни

- Cold — своя копия потока на каждого, запускается на подписку (\`http\`, \`interval\`).
- Hot — один общий источник для всех, значения идут независимо от подписок (\`Subject\`, \`fromEvent\`).
- Cold → hot делается через multicasting: \`share()\`/\`shareReplay()\` вставляют общий \`Subject\`.`,
      en: `## 🧩 In plain words

The difference between cold and hot Observables is the difference between a **movie on demand** and a **live broadcast**. Cold: every viewer starts the movie and watches from the beginning, each with their own copy. Hot: a live broadcast is playing — connect late and you missed the start, and everyone sees the same picture at the same time.

### Cold Observable

- The data producer is created **inside** the Observable and **anew on each subscription**.
- Each subscriber gets its own "copy" of the stream from the beginning — independent of the others.
- Examples: \`of\`, \`from\`, \`HttpClient.get\`, \`interval\`.

It follows that two subscribers on one \`HttpClient.get\` means **two** requests, not one shared.

### Hot Observable

- The data producer lives **outside** the Observable and is **shared** among subscribers.
- Subscribers receive values "from the moment they connect" and may miss early emissions.
- Examples: \`Subject\`, \`fromEvent(document, 'click')\`, a WebSocket. Clicks happen whether or not you're listening.

### Analogy

Cold is a movie on Netflix: everyone watches from the start, each with their own session. Hot is a live broadcast: connect late and you missed the beginning, and the picture is shared by all.

### How to make cold hot

Through **multicasting** — sharing **one** execution of the source among all subscribers, instead of re-running it for each:

\`\`\`ts
const cold$ = interval(1000);
const hot$ = cold$.pipe(share()); // refCount multicast

// all subscribers share one interval
hot$.subscribe(x => console.log('A', x));
setTimeout(() => hot$.subscribe(x => console.log('B', x)), 2500);
\`\`\`

Without \`share()\`, subscriber \`B\` would spin up its own \`interval\` from zero. With \`share()\`, it joins the already-running stream of \`A\` — so it sees roughly \`2, 3, 4...\`, missing the start, exactly like a viewer who joined the live broadcast late.

How it works: the operators \`share()\`, \`shareReplay()\`, \`connectable()\` and the (deprecated) \`multicast()\` insert a \`Subject\` between the source and the subscribers. The source runs **once** and the \`Subject\` fans its values out to everyone at once. That is what turns cold into hot. The \`refCount\` part of \`share()\` means: the source starts when the first subscriber arrives and stops when the last one leaves.

## ⚠️ Common pitfalls

- "Why did the request fire twice?" — because \`HttpClient.get\` is cold and you subscribed twice. Fixed with \`shareReplay(1)\`.
- A hot stream can **miss** values emitted before you subscribed. If late subscribers need the "latest" value, use \`shareReplay\`/\`BehaviorSubject\`, not a bare \`Subject\`.
- \`shareReplay\` with a buffer holds values in memory — a large buffer can become a leak.

## 🎯 Key takeaways

- Cold — its own copy of the stream per subscriber, started on subscribe (\`http\`, \`interval\`).
- Hot — one shared source for all, values flow regardless of subscriptions (\`Subject\`, \`fromEvent\`).
- Cold → hot is done via multicasting: \`share()\`/\`shareReplay()\` insert a shared \`Subject\`.`
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
      ru: `## 🧩 Простыми словами

Subject — это одновременно и «микрофон», и «динамик»: ты можешь в него говорить (\`next\`) и его слушать (подписаться). В отличие от обычного Observable, он **hot** и **multicast** — один источник вещает на много подписчиков сразу. А четыре его разновидности отличаются одним: **что услышит тот, кто подключился поздно** — ничего, последнее значение, историю или только финал.

### Subject — «чистая» шина

- Нет ни начального значения, ни буфера (памяти прошлых значений).
- Новый подписчик видит только эмиссии, пришедшие **после** его подписки. Опоздал — пропустил.
- Когда применять: шина событий, сценарии в духе \`EventEmitter\`.

### BehaviorSubject — «текущее состояние»

- Требует **начальное значение** и всегда хранит «текущее».
- Новый подписчик **сразу** получает последнее значение, даже если подключился поздно.
- Есть синхронный геттер \`.value\` — можно прочитать значение прямо сейчас, без подписки.
- Когда применять: **состояние** (текущий пользователь, текущая тема). Основа простого state-сервиса.

### ReplaySubject — «повтор истории»

- Буферизует последние \`bufferSize\` значений (опционально — ещё и в пределах \`windowTime\`, окна по времени).
- Новый подписчик получает **весь буфер** сразу — «догоняет» пропущенное.
- Когда применять: кэш последних N событий; дать поздним подписчикам историю.
- **Осторожно**: большой буфер = удержание ссылок в памяти = риск утечки.

### AsyncSubject — «только финал»

- Эмитит **только последнее** значение и **только когда вызван \`complete()\`**.
- Похоже на промис: важен один итоговый результат.
- Когда применять: результат «однократной» операции.

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0  ← сразу текущее
b.next(1);                              // A 1
b.subscribe(v => console.log('B', v)); // B 1  ← поздний видит последнее

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();     // async 2 ← только финал, при complete
\`\`\`

Обрати внимание: \`BehaviorSubject\` сразу выдал \`A 0\`, а поздний подписчик \`B\` получил актуальное \`1\`. \`AsyncSubject\` промолчал на \`1\` и \`2\` и выдал \`2\` только в момент \`complete()\`.

### Как выбрать

- Состояние (нужно «текущее») → **BehaviorSubject**
- Просто события → **Subject**
- Replay-кэш последних N → **ReplaySubject**
- Один финальный результат → **AsyncSubject**

## ⚠️ Подводные камни

- Голый \`Subject\` для состояния — частая ошибка: поздний подписчик не увидит текущего значения. Для состояния бери \`BehaviorSubject\`.
- \`ReplaySubject\` с большим (или бесконечным) буфером держит все значения в памяти — источник утечек.
- \`AsyncSubject\` без \`complete()\` не выдаст вообще ничего — легко забыть завершить.
- \`.value\` есть только у \`BehaviorSubject\`; у остальных Subject синхронного геттера нет.

## 🎯 Запомни

- Subject = Observable + Observer; он hot и multicast (один вещает многим).
- Отличие разновидностей — что получит поздний подписчик: ничего / последнее / историю / только финал.
- Быстрый выбор: состояние → BehaviorSubject, события → Subject, история → ReplaySubject, финал → AsyncSubject.`,
      en: `## 🧩 In plain words

A Subject is both a "microphone" and a "speaker": you can talk into it (\`next\`) and listen to it (subscribe). Unlike a plain Observable, it is **hot** and **multicast** — one source broadcasts to many subscribers at once. Its four flavors differ in just one thing: **what a late joiner hears** — nothing, the latest value, the history, or only the final value.

### Subject — the "plain" bus

- No initial value and no buffer (no memory of past values).
- A new subscriber only sees emissions that arrive **after** it subscribed. Late means missed.
- When to use: an event bus, \`EventEmitter\`-like scenarios.

### BehaviorSubject — "current state"

- Requires an **initial value** and always holds the "current" one.
- A new subscriber **immediately** receives the latest value, even if it joined late.
- Has a synchronous \`.value\` getter — you can read the value right now, without subscribing.
- When to use: **state** (current user, current theme). The basis of a simple state service.

### ReplaySubject — "replay the history"

- Buffers the last \`bufferSize\` values (optionally also within a \`windowTime\`, a time window).
- A new subscriber receives the **whole buffer** at once — it "catches up" on what it missed.
- When to use: a cache of the last N events; give late subscribers the history.
- **Caution**: a large buffer = references held in memory = leak risk.

### AsyncSubject — "the final value only"

- Emits **only the last** value and **only when \`complete()\` is called**.
- Promise-like: only one final result matters.
- When to use: the result of a "one-shot" operation.

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0  ← current value immediately
b.next(1);                              // A 1
b.subscribe(v => console.log('B', v)); // B 1  ← late joiner sees the latest

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();     // async 2 ← final only, on complete
\`\`\`

Notice: \`BehaviorSubject\` emitted \`A 0\` right away, and the late subscriber \`B\` got the current \`1\`. \`AsyncSubject\` stayed silent on \`1\` and \`2\` and emitted \`2\` only at the moment of \`complete()\`.

### How to choose

- State (need the "current" value) → **BehaviorSubject**
- Plain events → **Subject**
- Replay cache of the last N → **ReplaySubject**
- One final result → **AsyncSubject**

## ⚠️ Common pitfalls

- Using a bare \`Subject\` for state is a common mistake: a late subscriber won't see the current value. For state use \`BehaviorSubject\`.
- A \`ReplaySubject\` with a large (or unbounded) buffer holds every value in memory — a leak source.
- An \`AsyncSubject\` without \`complete()\` emits nothing at all — easy to forget to complete.
- Only \`BehaviorSubject\` has \`.value\`; the other Subjects have no synchronous getter.

## 🎯 Key takeaways

- A Subject = Observable + Observer; it is hot and multicast (one broadcasts to many).
- The flavors differ in what a late subscriber gets: nothing / latest / history / final only.
- Quick pick: state → BehaviorSubject, events → Subject, history → ReplaySubject, final → AsyncSubject.`
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
      ru: `## 🧩 Простыми словами

Представь, что несколько человек хотят посмотреть один и тот же фильм. Без \`shareReplay\` каждый запускает фильм заново с начала — это как отдельный сетевой запрос для каждого подписчика. \`shareReplay\` — это как один общий экран: фильм проигрывается один раз, а всем, кто подойдёт позже, показывают запись последних кадров. Проблема в том, что этот «экран» иногда забывают выключить, и он работает вечно, впустую тратя ресурсы. Вот об этой утечке и о её настройках мы и поговорим.

### Что вообще делает shareReplay

Обычный Observable (поток данных) — «холодный»: каждый новый подписчик запускает всю работу с нуля. Если это HTTP-запрос, то три подписчика = три одинаковых запроса на сервер.

\`shareReplay\` делает поток «горячим» и общим: он **мультикастит** источник (одна работа на всех) через внутренний \`ReplaySubject\`. \`ReplaySubject\` — это специальный объект, который **запоминает** последние значения и **проигрывает** их (replay) каждому новому подписчику. Поэтому опоздавший подписчик мгновенно получает уже готовый результат, не запуская работу заново. Отлично подходит для кэширования ответа сервера.

### Проблема refCount по умолчанию

\`refCount\` (счётчик ссылок) — это счётчик активных подписчиков. Ключевой вопрос: что делать, когда счётчик упал до нуля, то есть **все отписались**?

В старых версиях \`shareReplay(n)\` работал с \`refCount: false\`. Это значит: даже когда все ушли, подписка на источник **оставалась открытой**. Для HTTP это не страшно (запрос всё равно завершится сам). Но если источник бесконечный — \`interval\` (таймер, тикающий вечно) или WebSocket — он **продолжал крутиться вечно**, хотя его уже никто не слушает. Это и есть **утечка памяти и ресурсов**.

Решение — передавать явный объект настроек:

\`\`\`ts
source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

При \`refCount: true\` источник **отписывается**, как только счётчик подписчиков падает до нуля, и **переподписывается** заново, когда появляется новый подписчик. Никто не слушает — работа останавливается.

### Буфер держит значения в памяти

\`bufferSize\` — сколько последних значений хранить для проигрывания новым подписчикам. Внутренний \`ReplaySubject\` держит эти значения в памяти **всё время своей жизни**.

Мелочь для чисел, но если в буфере лежат тяжёлые объекты (большие массивы, ответы API), а \`bufferSize\` большой — ты незаметно удерживаешь много памяти. Обычно достаточно \`bufferSize: 1\` — хранить только самое свежее значение.

### Тонкость: это не «вечный кэш»

Здесь легко ошибиться в ожиданиях:

- С \`refCount: true\` после ухода **всех** подписчиков буфер **теряется**. Следующий подписчик запустит запрос **заново**. То есть это кэш «пока кто-то смотрит», а не навсегда.
- Если нужен именно вечный кэш одного значения, оставляй \`refCount: false\` — но **осознанно**. Это безопасно только если источник сам **завершается** (делает \`complete\`), как HTTP-запрос. Для бесконечного источника это прямая дорога к утечке.

## ⚠️ Подводные камни

- \`refCount: false\` (старое поведение по умолчанию) + бесконечный источник (\`interval\`, WebSocket) = вечная утечка.
- Ожидание «вечного кэша» от \`refCount: true\` — после ухода всех подписчиков запрос повторится.
- Большой \`bufferSize\` с тяжёлыми объектами тихо удерживает память.

## 🎯 Запомни

- HTTP-кэш (источник завершается сам): \`shareReplay({ bufferSize: 1, refCount: false })\` приемлем.
- Бесконечный источник (\`interval\`/WebSocket): **обязательно** \`refCount: true\`, иначе утечка.
- \`refCount: true\` = кэш «пока есть подписчики», а не вечный.`,
      en: `## 🧩 In plain words

Imagine several people want to watch the same movie. Without \`shareReplay\`, each one starts the movie over from the beginning — that's like a separate network request per subscriber. \`shareReplay\` is like one shared screen: the movie plays once, and anyone who shows up late gets a replay of the last frames. The catch: people sometimes forget to turn that "screen" off, so it keeps running forever, wasting resources. That leak, and the settings that control it, is what this is about.

### What shareReplay actually does

A plain Observable (a stream of data) is "cold": every new subscriber starts all the work from scratch. If it's an HTTP request, three subscribers = three identical requests to the server.

\`shareReplay\` makes the stream "hot" and shared: it **multicasts** the source (one job for everyone) through an internal \`ReplaySubject\`. A \`ReplaySubject\` is a special object that **remembers** the last values and **replays** them to each new subscriber. So a late subscriber instantly gets the ready result without re-running the work. Great for caching a server response.

### The default refCount problem

\`refCount\` (reference count) is a counter of active subscribers. The key question: what happens when the count drops to zero — that is, when **everyone has unsubscribed**?

In older versions \`shareReplay(n)\` used \`refCount: false\`. That means: even after everyone left, the subscription to the source **stayed open**. For HTTP that's harmless (the request completes on its own anyway). But if the source is infinite — an \`interval\` (a timer ticking forever) or a WebSocket — it **kept running forever**, even though no one was listening. That's a **memory and resource leak**.

The fix is to pass an explicit config object:

\`\`\`ts
source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
\`\`\`

With \`refCount: true\` the source **unsubscribes** as soon as the subscriber count drops to zero, and **resubscribes** when a new subscriber appears. Nobody listening — the work stops.

### The buffer holds values in memory

\`bufferSize\` is how many recent values to keep for replaying to new subscribers. The internal \`ReplaySubject\` holds those values in memory **for its entire lifetime**.

Trivial for a couple of numbers, but if the buffer holds heavy objects (large arrays, API responses) and \`bufferSize\` is big, you're silently retaining a lot of memory. Usually \`bufferSize: 1\` — keeping only the freshest value — is enough.

### The subtlety: this is not an "eternal cache"

It's easy to get the expectations wrong here:

- With \`refCount: true\`, once **all** subscribers leave, the buffer is **lost**. The next subscriber re-runs the request. So it's a cache that lasts "while someone is watching", not forever.
- If you truly want an eternal cache of a single value, keep \`refCount: false\` — but **deliberately**. That's only safe if the source **completes** on its own (does \`complete\`), like an HTTP request. For an infinite source it's a direct path to a leak.

## ⚠️ Common pitfalls

- \`refCount: false\` (the old default) + an infinite source (\`interval\`, WebSocket) = a permanent leak.
- Expecting an "eternal cache" from \`refCount: true\` — after all subscribers leave, the request repeats.
- A large \`bufferSize\` with heavy objects silently retains memory.

## 🎯 Key takeaways

- HTTP cache (source completes on its own): \`shareReplay({ bufferSize: 1, refCount: false })\` is acceptable.
- Infinite source (\`interval\`/WebSocket): **always** \`refCount: true\`, otherwise you leak.
- \`refCount: true\` = a cache "while there are subscribers", not forever.`
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
      ru: `## 🧩 Простыми словами

Представь, что на каждое событие (например, нажатие клавиши в поиске) тебе нужно запустить какую-то отдельную задачу — сетевой запрос. Возникает вопрос: а что делать, если события сыплются быстрее, чем задачи успевают выполниться? Наложить их параллельно? Встать в очередь? Отменить старую и начать новую? Игнорировать новые, пока старая не закончится? Именно на этот вопрос отвечают четыре оператора: \`switchMap\`, \`mergeMap\`, \`concatMap\` и \`exhaustMap\`. Отличаются они только стратегией — что делать с одновременными задачами.

### Что общего у всех четырёх

Все четыре — это **higher-order mapping** операторы. «Higher-order» (высшего порядка) значит, что каждое входящее значение превращается не в простое значение, а в целый **внутренний Observable** (например, в новый HTTP-запрос). Оператор запускает этот внутренний поток и **«уплощает»** (flatten) его результат обратно в основной поток. Разница только в том, как они управляют несколькими такими внутренними потоками одновременно.

### switchMap — «нужен только последний»

Когда приходит новое входящее значение, \`switchMap\` **отменяет** (делает unsubscribe) предыдущий внутренний поток и переключается на новый. Как переключение канала на телевизоре: старый мгновенно выключается.

Применение: **поиск по мере ввода (typeahead)**, реакция на смену параметров маршрута. Если пользователь допечатал буквы, старый запрос уже не нужен — \`switchMap\` его отменит.

### mergeMap (flatMap) — «все сразу, параллельно»

\`mergeMap\` запускает все внутренние потоки **параллельно** и ничего не отменяет. Результаты приходят вперемешку (interleaved), по мере готовности. Можно ограничить число одновременных потоков вторым аргументом: \`mergeMap(fn, concurrency)\`.

Применение: независимые параллельные операции, например загрузка нескольких файлов сразу.

**Риск**: порядок результатов не гарантирован; если источник быстрый, а ограничения нет — получишь лавину одновременных запросов.

### concatMap — «строго по очереди»

\`concatMap\` выстраивает **очередь**: следующий внутренний поток стартует только после того, как предыдущий **завершился** (\`complete\`). Это гарантирует **порядок**.

Применение: последовательные операции записи, где важна очерёдность — запись логов, транзакции.

### exhaustMap — «занят, не мешай»

Пока активен текущий внутренний поток, \`exhaustMap\` **игнорирует** все новые входящие значения. Как будто говорит: «я занят, приходи позже». Только когда текущий поток завершится, он снова готов принять новое значение.

Применение: кнопка **«Сохранить»** или **логин** — защита от двойного клика. Пока запрос идёт, повторные нажатия ничего не запустят.

### Пример: поиск с отменой устаревшего запроса

\`\`\`ts
// typeahead: отменяем устаревший запрос
input$.pipe(
  debounceTime(200),
  switchMap(q => api.search(q))
);
\`\`\`

Здесь \`debounceTime(200)\` ждёт паузу в 200 мс в наборе текста (чтобы не слать запрос на каждую букву), а \`switchMap\` гарантирует, что если пользователь снова что-то напечатал, старый запрос отменяется и остаётся только результат последнего.

## ⚠️ Подводные камни

- \`mergeMap\` без ограничения \`concurrency\` на быстром источнике = лавина запросов и риск утечки.
- \`switchMap\` для операций записи (POST/сохранение) опасен: он может **отменить** незавершённый запрос на полпути. Для записи чаще нужен \`concatMap\` или \`exhaustMap\`.
- \`concatMap\` с медленными или бесконечными внутренними потоками копит очередь — задержки растут.

## 🎯 Запомни

- \`switchMap\` — отменяет старое, оставляет последнее (поиск, навигация).
- \`mergeMap\` — всё параллельно, порядок не гарантирован (независимые задачи).
- \`concatMap\` — строгая очередь и порядок (последовательные записи).
- \`exhaustMap\` — игнорирует новое, пока занят (кнопки от двойного клика).
- По памяти: \`switchMap\` отменяет и потому безопаснее всего; \`mergeMap\` без лимита — самый рискованный.`,
      en: `## 🧩 In plain words

Imagine every event (say, a keypress in a search box) needs to kick off some separate task — a network request. The question is: what do you do when events arrive faster than the tasks can finish? Run them in parallel? Queue them up? Cancel the old one and start fresh? Ignore new ones until the current one is done? These four operators — \`switchMap\`, \`mergeMap\`, \`concatMap\`, and \`exhaustMap\` — each answer that question with a different strategy for handling concurrent tasks.

### What all four have in common

All four are **higher-order mapping** operators. "Higher-order" means each incoming value is turned not into a plain value but into a whole **inner Observable** (for example, a new HTTP request). The operator subscribes to that inner stream and **flattens** its result back into the main stream. The only difference is how they manage several such inner streams at the same time.

### switchMap — "only the latest matters"

When a new incoming value arrives, \`switchMap\` **cancels** (unsubscribes) the previous inner stream and switches to the new one. Like changing the channel on a TV: the old one shuts off instantly.

Use: **type-as-you-search (typeahead)**, reacting to route-param changes. If the user typed more letters, the old request is no longer needed — \`switchMap\` cancels it.

### mergeMap (flatMap) — "all at once, in parallel"

\`mergeMap\` runs all inner streams **in parallel** and cancels nothing. Results come back interleaved, as they're ready. You can cap the number of simultaneous streams with a second argument: \`mergeMap(fn, concurrency)\`.

Use: independent parallel operations, such as uploading several files at once.

**Risk**: the order of results isn't guaranteed; if the source is fast and there's no cap, you get a flood of simultaneous requests.

### concatMap — "strictly one at a time"

\`concatMap\` forms a **queue**: the next inner stream starts only after the previous one has **completed** (\`complete\`). This guarantees **order**.

Use: sequential write operations where ordering matters — writing logs, transactions.

### exhaustMap — "busy, don't bother me"

While the current inner stream is active, \`exhaustMap\` **ignores** all new incoming values. As if saying: "I'm busy, come back later." Only once the current stream completes is it ready to accept a new value again.

Use: a **Save** button or a **login** — protection against double clicks. While the request is in flight, repeated taps launch nothing.

### Example: search that cancels the stale request

\`\`\`ts
// typeahead: cancel the stale request
input$.pipe(
  debounceTime(200),
  switchMap(q => api.search(q))
);
\`\`\`

Here \`debounceTime(200)\` waits for a 200 ms pause in typing (so it doesn't fire a request on every letter), and \`switchMap\` ensures that if the user types again, the old request is cancelled and only the latest result survives.

## ⚠️ Common pitfalls

- \`mergeMap\` with no \`concurrency\` cap on a fast source = a flood of requests and a leak risk.
- \`switchMap\` for write operations (POST/save) is dangerous: it can **cancel** an in-flight request halfway. For writes you usually want \`concatMap\` or \`exhaustMap\`.
- \`concatMap\` with slow or infinite inner streams builds up a queue — delays grow.

## 🎯 Key takeaways

- \`switchMap\` — cancels the old, keeps the latest (search, navigation).
- \`mergeMap\` — all in parallel, order not guaranteed (independent tasks).
- \`concatMap\` — strict queue and order (sequential writes).
- \`exhaustMap\` — ignores new while busy (buttons against double clicks).
- On memory: \`switchMap\` cancels and is therefore the safest; unbounded \`mergeMap\` is the riskiest.`
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
      ru: `## 🧩 Простыми словами

Часто нужно объединить несколько потоков данных в один — например, взять фильтры, сортировку и текущего пользователя, и на их основе что-то посчитать. Но объединять можно по-разному: реагировать на любое изменение? дождаться, пока все закончат? брать снимок по команде? спаривать значения строго по порядку? Четыре оператора — \`combineLatest\`, \`forkJoin\`, \`withLatestFrom\` и \`zip\` — делают именно это, но с разной логикой «когда и что выдавать». Разберём каждый на простой аналогии.

### combineLatest — «реагируй на любое изменение»

\`combineLatest\` выдаёт массив из **последних** значений каждого источника, причём **при любой** новой эмиссии **любого** из них. Изменился хоть один — пересчитали всё.

Важная деталь: он **не выдаёт ничего**, пока **каждый** источник не выдал хотя бы одно значение. Всем нужно «прогреться».

Применение: реактивное представление, собранное из нескольких потоков — например, список, зависящий от фильтров и сортировки одновременно.

### forkJoin — «дождись, пока все закончат»

\`forkJoin\` ждёт **завершения** (\`complete\`) всех источников и **один раз** выдаёт массив их **последних** значений. Это прямой аналог \`Promise.all\`.

**Важно**: если хоть один источник **никогда не завершается** — \`forkJoin\` не выдаст **ничего**. А если хоть один упадёт с ошибкой — весь \`forkJoin\` завершится ошибкой.

Применение: несколько параллельных HTTP-запросов при инициализации, когда нужны все результаты сразу.

### withLatestFrom — «снимок по команде»

\`withLatestFrom\` выдаёт значение, только когда эмитит **первичный** (главный) источник, и **прикрепляет** к нему последние значения остальных. Вторичные источники **сами по себе не запускают** эмиссию — они лишь «дают справку» о своём текущем значении.

Применение: «при клике возьми текущее значение формы». Клик — это команда, форма — справочные данные.

### zip — «спаривание по индексу»

\`zip\` объединяет значения строго **по порядковому номеру**: 1-е значение одного с 1-м другого, 2-е со 2-м и так далее. Как застёжка-молния, сцепляющая зубчики попарно. Он идёт в темпе **самого медленного** источника, а значения быстрых **буферизует** (копит) в ожидании пары.

Применение: строгое попарное сопоставление. Используется редко, и осторожно — буфер быстрых источников может расти.

### Пример: снимок фильтров по сабмиту

\`\`\`ts
// withLatestFrom: текущее значение фильтра при сабмите
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([_, filters]) => api.load(filters))
);
\`\`\`

Здесь эмиссию запускает только \`submit$\` (нажатие «Применить»). В этот момент \`withLatestFrom\` подставляет текущее значение \`filters$\`. Само изменение фильтров запрос **не** запускает — только сабмит.

## ⚠️ Подводные камни

- \`forkJoin\` на бесконечном потоке **никогда не сработает** — он ждёт \`complete\`, которого не будет.
- Ожидать от \`combineLatest\` вывода до того, как **каждый** источник выдал хотя бы одно значение — он молчит, пока не «прогреются» все.
- Путать \`combineLatest\` и \`withLatestFrom\`: у первого эмиссию запускает **любой** источник, у второго — только **главный**.
- Буфер \`zip\` может неограниченно расти, если один источник сильно быстрее другого.

## 🎯 Запомни

- \`combineLatest\` — последние значения всех, эмиссия при изменении любого.
- \`forkJoin\` — как \`Promise.all\`: один раз, после завершения всех.
- \`withLatestFrom\` — снимок последних значений по триггеру главного источника.
- \`zip\` — строгое попарное сцепление по индексу.`,
      en: `## 🧩 In plain words

You often need to combine several data streams into one — say, take the filters, the sort order, and the current user, and compute something from them. But there are different ways to combine: react to every change? wait until they all finish? grab a snapshot on command? pair values up strictly in order? These four operators — \`combineLatest\`, \`forkJoin\`, \`withLatestFrom\`, and \`zip\` — each do that with different "when and what to emit" logic. Let's take each with a simple analogy.

### combineLatest — "react to any change"

\`combineLatest\` emits an array of the **latest** values of every source, and it does so **on any** new emission from **any** of them. If even one changes, everything is recomputed.

Important detail: it **emits nothing** until **every** source has produced at least one value. They all need to "warm up" first.

Use: a reactive view assembled from several streams — for example, a list that depends on filters and sort order at the same time.

### forkJoin — "wait until everyone finishes"

\`forkJoin\` waits for **all** sources to **complete** (\`complete\`) and then **once** emits an array of their **last** values. It's a direct analogue of \`Promise.all\`.

**Important**: if even one source **never completes**, \`forkJoin\` emits **nothing**. And if any one errors, the whole \`forkJoin\` errors.

Use: several parallel HTTP requests at initialization, when you need all results together.

### withLatestFrom — "snapshot on command"

\`withLatestFrom\` emits a value only when the **primary** (main) source emits, and it **attaches** the latest values of the others. The secondary sources **don't trigger** an emission by themselves — they just "report" their current value.

Use: "on click, take the current form value." The click is the command; the form is the reference data.

### zip — "pairing by index"

\`zip\` combines values strictly **by position**: the 1st value of one with the 1st of another, the 2nd with the 2nd, and so on. Like a zipper joining teeth in pairs. It runs at the pace of the **slowest** source and **buffers** (stockpiles) the faster ones' values while they wait for a partner.

Use: strict pairwise matching. Rarely used, and with care — the buffer for faster sources can grow.

### Example: a snapshot of filters on submit

\`\`\`ts
// withLatestFrom: current filter value on submit
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([_, filters]) => api.load(filters))
);
\`\`\`

Here only \`submit$\` (pressing "Apply") triggers an emission. At that moment \`withLatestFrom\` plugs in the current value of \`filters$\`. Changing the filters does **not** fire the request — only the submit does.

## ⚠️ Common pitfalls

- \`forkJoin\` on an infinite stream **never fires** — it waits for a \`complete\` that never comes.
- Expecting \`combineLatest\` to emit before **every** source has produced at least one value — it stays silent until all have "warmed up".
- Confusing \`combineLatest\` and \`withLatestFrom\`: the former is triggered by **any** source, the latter only by the **primary** one.
- The \`zip\` buffer can grow unbounded if one source is much faster than the other.

## 🎯 Key takeaways

- \`combineLatest\` — latest values of all, emits when any one changes.
- \`forkJoin\` — like \`Promise.all\`: once, after all complete.
- \`withLatestFrom\` — a snapshot of latest values, triggered by the primary source.
- \`zip\` — strict pairwise coupling by index.`
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
      ru: `## 🧩 Простыми словами

Представь несколько водопроводных труб, и тебе надо собрать воду из них в одну. Можно открыть все краны сразу — вода из всех труб потечёт вперемешку. А можно открывать по очереди: сначала первая труба, а когда она иссякнет — вторая. Первый способ — это \`merge\`, второй — \`concat\`. Оба объединяют несколько потоков в один, но \`merge\` делает это одновременно, а \`concat\` — строго по очереди.

### merge — всё одновременно

\`merge\` подписывается на **все** источники сразу и выдаёт значения по мере их поступления, вперемешку (interleaved). Кто первый выдал — того и показали.

Общий поток **завершается**, только когда завершились **все** источники.

Применение: объединить несколько источников событий в один поток — например, клики из разных кнопок или сообщения из нескольких WebSocket-каналов.

### concat — строго по очереди

\`concat\` подписывается на источники **по одному**: следующий стартует только после того, как предыдущий **завершился** (\`complete\`). Порядок источников при этом **сохраняется**.

**Важно и коварно**: если первый источник **бесконечный** (например, \`interval\` или WebSocket, которые никогда не завершаются), очередь до второго источника **никогда** не дойдёт — \`concat\` будет вечно ждать \`complete\` первого.

Применение: сначала показать закэшированные данные, затем — свежие сетевые; выполнить последовательные шаги в строгом порядке.

### Код

\`\`\`ts
// merge: все события в один поток
merge(saveClicks$, autoSave$).subscribe(triggerSave);

// concat: сначала локальный кэш, потом сервер
concat(cache$, network$).subscribe(render);
\`\`\`

В первом случае и ручное сохранение, и автосохранение сливаются в один поток триггеров. Во втором — сперва отрисуем данные из кэша, а когда \`cache$\` завершится, подхватим данные из сети.

### Аналогия

- \`merge\` — несколько труб сливаются в одну, всё течёт одновременно.
- \`concat\` — труба за трубой, строго последовательно.

### Связь с операторами проекции

Полезная параллель: \`mergeMap\` относится к \`merge\` так же, как \`concatMap\` — к \`concat\`. Это те же самые стратегии конкурентности (параллельно против «по очереди»), только применённые к higher-order проекции — когда каждое значение превращается во внутренний Observable.

## ⚠️ Подводные камни

- \`concat\`, где первый источник бесконечен: до остальных дело **никогда** не дойдёт — частая скрытая ошибка.
- Ждать сохранения порядка от \`merge\` — его нет, значения приходят вперемешку по мере готовности.

## 🎯 Запомни

- \`merge\` — все источники сразу, вперемешку; нужен, когда порядок не важен.
- \`concat\` — по очереди, с сохранением порядка; следующий ждёт \`complete\` предыдущего.
- \`merge\` : \`concat\` = \`mergeMap\` : \`concatMap\` — те же стратегии.`,
      en: `## 🧩 In plain words

Picture several water pipes, and you need to collect their water into one. You can open all the taps at once — water from every pipe flows in, mixed together. Or you can open them one at a time: first pipe first, and when it runs dry, the second. The first way is \`merge\`, the second is \`concat\`. Both combine several streams into one, but \`merge\` does it simultaneously and \`concat\` strictly in sequence.

### merge — everything at once

\`merge\` subscribes to **all** sources at once and emits values as they arrive, interleaved. Whoever emits first is shown first.

The combined stream **completes** only when **all** sources have completed.

Use: combine several event sources into one stream — for example, clicks from different buttons, or messages from several WebSocket channels.

### concat — strictly in sequence

\`concat\` subscribes to sources **one at a time**: the next starts only after the previous one has **completed** (\`complete\`). The order of the sources is **preserved**.

**Important and sneaky**: if the first source is **infinite** (say, an \`interval\` or a WebSocket that never completes), the queue **never** reaches the second source — \`concat\` waits forever for the first to \`complete\`.

Use: show cached data first, then fresh network data; run sequential steps in strict order.

### Code

\`\`\`ts
// merge: all events into one stream
merge(saveClicks$, autoSave$).subscribe(triggerSave);

// concat: local cache first, then server
concat(cache$, network$).subscribe(render);
\`\`\`

In the first case, both manual saves and auto-saves merge into one stream of triggers. In the second, we first render data from the cache, and once \`cache$\` completes, we pick up data from the network.

### Analogy

- \`merge\` — several pipes feeding one, everything flowing at once.
- \`concat\` — pipe after pipe, strictly sequential.

### Relationship to projection operators

A useful parallel: \`mergeMap\` is to \`merge\` what \`concatMap\` is to \`concat\`. They're the same concurrency strategies (parallel vs. one-at-a-time), just applied to higher-order projection — where each value is turned into an inner Observable.

## ⚠️ Common pitfalls

- \`concat\` where the first source is infinite: the rest are **never** reached — a common hidden bug.
- Expecting \`merge\` to preserve order — it doesn't; values arrive interleaved as they're ready.

## 🎯 Key takeaways

- \`merge\` — all sources at once, interleaved; use it when order doesn't matter.
- \`concat\` — one at a time, order preserved; the next waits for the previous to \`complete\`.
- \`merge\` : \`concat\` = \`mergeMap\` : \`concatMap\` — the same strategies.`
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
      ru: `## 🧩 Простыми словами

Представь поток данных как конвейер. Если на конвейере что-то ломается, он **останавливается целиком** — это и есть ошибка в RxJS. После поломки лента больше не поедет: новых данных не будет, «успешного завершения» тоже. Обработка ошибок в RxJS — это способ либо поставить «запасной конвейер» вместо сломанного (\`catchError\`), либо перезапустить сломанный и попробовать ещё раз (\`retry\`).

### Ошибка — это терминальное (окончательное) событие

В потоке (Observable) бывает три типа сигналов: \`next\` (пришли данные), \`complete\` (данные кончились, всё хорошо) и \`error\` (что-то сломалось). Сигнал \`error\` — **терминальный**: после него не будет ни \`next\`, ни \`complete\`, и запускается _teardown_ — автоматическая уборка ресурсов (отписка, закрытие таймеров и т.п.).

Если ошибку никак не поймать, она «всплывает» наверх. В Angular такая необработанная ошибка попадает в глобальный \`ErrorHandler\`.

### catchError — поймать и подменить

\`catchError\` перехватывает ошибку и **возвращает новый Observable**. У тебя два варианта: либо восстановиться (отдать запасное значение), либо пробросить ошибку дальше.

\`\`\`ts
api.load().pipe(
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // восстановление
    return throwError(() => err);                    // проброс дальше
  })
);
\`\`\`

Здесь \`of(EMPTY_RESULT)\` создаёт мини-поток с одним запасным значением, а \`throwError(() => err)\` заново «выбрасывает» ошибку, чтобы её обработал кто-то выше.

### Где ставить catchError: важность вложенности

_Higher-order оператор_ — это оператор, который для каждого входящего значения запускает свой внутренний Observable (например, \`mergeMap\` — на каждый id делает свой запрос). Если внутренний запрос упадёт, а \`catchError\` стоит **снаружи**, то умрёт весь внешний поток. Чтобы одна неудача не убила остальные, ставь \`catchError\` **внутри** оператора:

\`\`\`ts
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

Теперь упавший запрос для одного \`id\` просто отдаст \`null\`, а остальные продолжат работать.

### retry — попробовать ещё раз

\`retry(n)\` при ошибке **переподписывается** на источник — до \`n\` раз. Ключевой момент: большинство источников _cold_ (холодные) — то есть при каждой подписке они запускаются с нуля. Поэтому переподписка буквально означает «сделать HTTP-запрос заново».

### retry с задержкой и backoff

Просто долбить сервер повторами сразу — плохо. Современный API \`retry({ count, delay })\` позволяет ждать между попытками. \`delay\` — это либо число миллисекунд, либо функция, возвращающая Observable-сигнал (для _экспоненциального backoff_ — когда пауза растёт с каждой попыткой):

\`\`\`ts
retry({
  count: 3,
  delay: (err, retryCount) => timer(2 ** retryCount * 500)
});
\`\`\`

\`timer(...)\` создаёт Observable, который «тикнет» через заданное время — так и получается пауза перед следующей попыткой. Это современная замена устаревшему \`retryWhen\`.

## ⚠️ Подводные камни

- \`retry\` повторяет **весь** источник целиком, поэтому все побочные эффекты (логи, аналитика, запись в базу) выполнятся заново на каждой попытке.
- Если поставить \`catchError\` слишком высоко (снаружи \`mergeMap\`), одна ошибка убьёт весь поток.
- Забыть \`throwError\` внутри \`catchError\` — значит незаметно «проглотить» ошибку, которую надо было пробросить.

## 🎯 Запомни

- \`error\` — терминальное событие: после него поток мёртв, дальше только уборка.
- \`catchError\` ловит ошибку и возвращает **новый** Observable — восстановиться или пробросить.
- Ставь \`catchError\` **внутри** higher-order оператора, чтобы одна неудача не убила весь поток.
- \`retry\` переподписывается (повторяет запрос); \`retry({ count, delay })\` добавляет паузы и backoff.`,
      en: `## 🧩 In plain words

Think of a data stream as a conveyor belt. If something breaks on the belt, it **stops entirely** — that is an error in RxJS. Once it breaks, the belt never moves again: no new data, no "successful finish" either. Error handling in RxJS is how you either put a "backup belt" in place of the broken one (\`catchError\`) or restart the broken one and try again (\`retry\`).

### An error is a terminal (final) event

A stream (Observable) sends three kinds of signals: \`next\` (here's data), \`complete\` (data's done, all good), and \`error\` (something broke). The \`error\` signal is **terminal**: nothing follows it — no \`next\`, no \`complete\` — and _teardown_ runs (automatic cleanup: unsubscribing, closing timers, and so on).

If nobody catches the error, it "bubbles up." In Angular an unhandled error lands in the global \`ErrorHandler\`.

### catchError — catch and substitute

\`catchError\` intercepts the error and **returns a new Observable**. You have two options: recover (hand back a fallback value) or rethrow the error.

\`\`\`ts
api.load().pipe(
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // recover
    return throwError(() => err);                    // rethrow
  })
);
\`\`\`

Here \`of(EMPTY_RESULT)\` creates a tiny stream with one fallback value, and \`throwError(() => err)\` re-emits the error so someone upstream can handle it.

### Where to put catchError: why nesting matters

A _higher-order operator_ is one that starts an inner Observable for each incoming value (for example, \`mergeMap\` fires a request per id). If an inner request fails and \`catchError\` sits **outside**, the whole outer stream dies. So one failure doesn't kill the rest, put \`catchError\` **inside** the operator:

\`\`\`ts
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

Now a failed request for one \`id\` just yields \`null\`, and the others keep going.

### retry — try again

On error, \`retry(n)\` **resubscribes** to the source — up to \`n\` times. The key point: most sources are _cold_ — they start from scratch on every subscription. So resubscribing literally means "make the HTTP request again."

### retry with delay and backoff

Hammering the server with instant retries is bad. The modern API \`retry({ count, delay })\` lets you wait between attempts. \`delay\` is either a number of milliseconds or a function returning an Observable signal (for _exponential backoff_ — where the pause grows with each attempt):

\`\`\`ts
retry({
  count: 3,
  delay: (err, retryCount) => timer(2 ** retryCount * 500)
});
\`\`\`

\`timer(...)\` creates an Observable that "ticks" after the given time — that's how you get a pause before the next attempt. This is the modern replacement for the deprecated \`retryWhen\`.

## ⚠️ Common pitfalls

- \`retry\` repeats the **whole** source, so all side effects (logs, analytics, DB writes) run again on every attempt.
- Placing \`catchError\` too high (outside \`mergeMap\`) lets a single error kill the entire stream.
- Forgetting \`throwError\` inside \`catchError\` silently "swallows" an error you meant to rethrow.

## 🎯 Key takeaways

- \`error\` is terminal: after it the stream is dead, only cleanup follows.
- \`catchError\` catches an error and returns a **new** Observable — recover or rethrow.
- Put \`catchError\` **inside** a higher-order operator so one failure doesn't kill the whole stream.
- \`retry\` resubscribes (repeats the request); \`retry({ count, delay })\` adds pauses and backoff.`
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
      ru: `## 🧩 Простыми словами

Когда запрос к серверу падает, глупо тут же долбить его снова и снова — сервер и так перегружен. Умнее подождать чуть-чуть, потом подольше, потом ещё дольше. Это и есть **экспоненциальный backoff** — «отступаю всё дальше с каждой неудачей». Раньше это писали через громоздкий \`retryWhen\`, а теперь есть простой и понятный \`retry({ delay })\`.

### Чем плох retryWhen

\`retryWhen(notifier => ...)\` получал поток ошибок и сам решал, когда переподписаться (повторить). Проблема в том, что он **сложный и неинтуитивный**: очень легко случайно создать бесконечный цикл повторов, или потерять исходную ошибку — забыл пробросить её, когда попытки кончились, и поток тихо «завис». Из-за этих граблей в RxJS 7.x его пометили как _deprecated_ (устаревший) в пользу \`retry({ delay })\`.

### Современный backoff

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

Разберём: \`retryCount\` — номер текущей попытки. \`2 ** (retryCount - 1)\` даёт паузы 1, 2, 4, 8… секунд — они растут вдвое каждый раз. \`timer(...)\` создаёт сигнал «подожди столько-то и повтори». А \`throwError\` для ошибок 4xx означает «эту ошибку не лечим повтором — пробрасываем дальше».

### Ключевые идеи

- **Backoff**: задержка растёт экспоненциально (\`2 ** n\`), чтобы не «забивать» уже падающий сервер.
- **Jitter** (джиттер, случайная добавка): не даёт эффекта «thundering herd» — когда тысячи клиентов ретраят синхронно в одну и ту же миллисекунду и снова кладут сервер. Случайный разброс разводит их по времени.
- **Селективность**: повторяем только то, что реально может починиться само (5xx, сетевые сбои). Ошибки 4xx (например, 404 или 401) от повтора не исправятся — их сразу пробрасываем.
- **Cap** (потолок): \`Math.min(..., 30_000)\` ограничивает максимальную паузу 30 секундами, чтобы не ждать вечность.

### Когда всё же нужен «retryWhen-стиль»

Иногда повтор надо синхронизировать с внешним событием — например, повторить запрос только когда браузер снова вышел в онлайн (\`fromEvent(window, 'online')\`). Функция \`delay\` это тоже покрывает: просто верни из неё нужный Observable-«сигнал», и повтор дождётся именно его.

## ⚠️ Подводные камни

- Забыть про селективность и ретраить 4xx — бесполезная трата попыток (они не починятся).
- Backoff без cap может дать безумно долгие паузы на дальних попытках.
- Без jitter массовые клиенты создадут пиковую нагрузку в один момент.

## 🎯 Запомни

- \`retryWhen\` устарел: сложный, легко словить бесконечный цикл или потерять ошибку.
- Используй \`retry({ count, delay })\` — \`delay\` возвращает \`timer(...)\` для паузы.
- Формула backoff: экспонента + jitter + cap + повтор только восстановимых ошибок.`,
      en: `## 🧩 In plain words

When a request to the server fails, it's silly to instantly hammer it again and again — the server is already struggling. It's smarter to wait a little, then longer, then longer still. That's **exponential backoff** — "I back off further with each failure." This used to be written with the clunky \`retryWhen\`; now there's the simple, clear \`retry({ delay })\`.

### What's wrong with retryWhen

\`retryWhen(notifier => ...)\` received a stream of errors and decided for itself when to resubscribe (retry). The trouble is it's **complex and unintuitive**: it's very easy to accidentally create an infinite retry loop, or lose the original error — forget to rethrow it when attempts run out, and the stream quietly "hangs." Because of these traps, RxJS 7.x marked it _deprecated_ in favor of \`retry({ delay })\`.

### Modern backoff

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

Breaking it down: \`retryCount\` is the current attempt number. \`2 ** (retryCount - 1)\` gives pauses of 1, 2, 4, 8… seconds — doubling each time. \`timer(...)\` creates a "wait this long, then retry" signal. And \`throwError\` for 4xx errors means "a retry won't fix this one — rethrow it."

### Key ideas

- **Backoff**: the delay grows exponentially (\`2 ** n\`) so you don't keep hammering an already-failing server.
- **Jitter** (a random addition): prevents a "thundering herd" — where thousands of clients retry in sync at the same millisecond and knock the server over again. A random spread staggers them in time.
- **Selectivity**: retry only what can actually recover on its own (5xx, network glitches). 4xx errors (like 404 or 401) won't be fixed by retrying — rethrow them immediately.
- **Cap**: \`Math.min(..., 30_000)\` bounds the maximum pause at 30 seconds so you don't wait forever.

### When you still need "retryWhen-style"

Sometimes a retry must sync with an external event — for example, retry only when the browser comes back online (\`fromEvent(window, 'online')\`). The \`delay\` function covers this too: just return the appropriate Observable "signal" from it, and the retry will wait for exactly that.

## ⚠️ Common pitfalls

- Skipping selectivity and retrying 4xx wastes attempts (they won't recover).
- Backoff without a cap can produce absurdly long pauses on later attempts.
- Without jitter, many clients create a spike of load at the same instant.

## 🎯 Key takeaways

- \`retryWhen\` is deprecated: complex, easy to hit an infinite loop or lose the error.
- Use \`retry({ count, delay })\` — \`delay\` returns a \`timer(...)\` for the pause.
- The backoff formula: exponential + jitter + cap + retry only recoverable errors.`
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
      ru: `## 🧩 Простыми словами

Представь блок \`try/finally\` в обычном коде: что бы ни случилось внутри — успех, ошибка, ранний выход — блок \`finally\` выполнится всегда. \`finalize\` в RxJS — это ровно такой \`finally\`, но для потока. Он гарантированно сработает при любом завершении подписки, поэтому идеально подходит для уборки: спрятать спиннер, разблокировать кнопку.

### Что делает finalize

\`finalize(fn)\` выполняет функцию \`fn\` **ровно один раз** при **любом** способе завершения подписки:

- \`complete()\` — поток успешно закончился;
- \`error()\` — поток упал с ошибкой;
- \`unsubscribe()\` — от потока отписались вручную (или через \`takeUntil\`).

Это «\`finally\` для потока» — лучший инструмент для очистки UI-состояния.

\`\`\`ts
this.loading = true;
api.load().pipe(
  finalize(() => this.loading = false) // сработает в любом случае
).subscribe({ next: ..., error: ... });
\`\`\`

Спиннер погаснет и при успехе, и при ошибке, и при отписке — ни один случай не забыт.

### Чем finalize отличается от complete-колбэка

Колбэк \`complete\` внутри \`subscribe(...)\` вызывается **только** при успешном завершении. Он НЕ сработает при ошибке и НЕ сработает при отписке. Поэтому если спрятать спиннер только в \`complete\`, при ошибке он «зависнет» на экране навсегда.

### Чем finalize отличается от tap

\`tap({ complete: ... })\` — это оператор для побочных эффектов, но он тоже **не покрывает unsubscribe** и требует отдельной ветки \`error\`, если хочешь поймать и ошибку. Получается три разных места. \`finalize\` — одна-единственная точка сразу для всех трёх случаев.

### Тонкости порядка выполнения

- \`finalize\` срабатывает **после** того, как финальное уведомление (\`complete\` или \`error\`) уже доставлено подписчику — то есть в самом конце.
- Если в одном \`pipe\` несколько \`finalize\`, они вызываются снизу вверх: тот, что ближе к подписке (внутренний), — раньше.
- В связке с \`takeUntil\` (частый способ отписки в Angular) \`finalize\` тоже сработает — удобно логировать «поток закрыт».

## ⚠️ Подводные камни

- Гасить спиннер в колбэке \`complete\` — классическая ошибка: при \`error\` он останется висеть.
- \`finalize\` НЕ ловит и НЕ обрабатывает ошибку — он просто выполняет уборку. Ошибку по-прежнему нужно ловить в \`error\`-колбэке или через \`catchError\`.

## 🎯 Запомни

- \`finalize\` = \`finally\` для потока: срабатывает при \`complete\`, \`error\` и \`unsubscribe\`.
- Колбэк \`complete\` — только при успехе; \`tap\` не покрывает unsubscribe.
- Идеален для сброса UI-состояния (спиннер, блокировка кнопки) в одном месте.`,
      en: `## 🧩 In plain words

Think of a \`try/finally\` block in ordinary code: whatever happens inside — success, error, early exit — the \`finally\` block always runs. \`finalize\` in RxJS is exactly that \`finally\`, but for a stream. It's guaranteed to run on any termination of the subscription, which makes it perfect for cleanup: hide a spinner, re-enable a button.

### What finalize does

\`finalize(fn)\` runs the function \`fn\` **exactly once** on **any** way the subscription ends:

- \`complete()\` — the stream finished successfully;
- \`error()\` — the stream failed with an error;
- \`unsubscribe()\` — the stream was unsubscribed manually (or via \`takeUntil\`).

It is the "\`finally\` for a stream" — the best tool for cleaning up UI state.

\`\`\`ts
this.loading = true;
api.load().pipe(
  finalize(() => this.loading = false) // runs no matter what
).subscribe({ next: ..., error: ... });
\`\`\`

The spinner turns off on success, on error, and on unsubscribe — no case forgotten.

### How finalize differs from the complete callback

The \`complete\` callback inside \`subscribe(...)\` runs **only** on successful completion. It does NOT run on error and does NOT run on unsubscribe. So if you hide the spinner only in \`complete\`, on an error it will "hang" on screen forever.

### How finalize differs from tap

\`tap({ complete: ... })\` is an operator for side effects, but it also **does not cover unsubscribe** and needs a separate \`error\` branch if you want to catch errors too. That's three different places. \`finalize\` is one single point for all three cases at once.

### Ordering subtleties

- \`finalize\` runs **after** the final notification (\`complete\` or \`error\`) has already been delivered to the subscriber — that is, at the very end.
- With multiple \`finalize\` in one \`pipe\`, they fire bottom-up: the one closest to the subscription (innermost) runs first.
- Combined with \`takeUntil\` (a common unsubscribe pattern in Angular), \`finalize\` still runs — handy for logging "stream closed."

## ⚠️ Common pitfalls

- Hiding the spinner in the \`complete\` callback is a classic bug: on \`error\` it stays stuck.
- \`finalize\` does NOT catch or handle the error — it just does cleanup. You still need to catch the error in an \`error\` callback or via \`catchError\`.

## 🎯 Key takeaways

- \`finalize\` = \`finally\` for a stream: runs on \`complete\`, \`error\`, and \`unsubscribe\`.
- The \`complete\` callback runs only on success; \`tap\` doesn't cover unsubscribe.
- Ideal for resetting UI state (spinner, button lock) in a single place.`
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
      ru: `## 🧩 Простыми словами

Scheduler (планировщик) — это «диспетчер», который решает **когда** и **в каком контексте** выполнится работа в потоке: прямо сейчас, чуть позже в микрозадаче, ещё позже как таймер или перед следующей перерисовкой экрана. Меняя планировщик, ты управляешь таймингом, не переписывая логику. Это тонкий, но мощный инструмент для плавного UI и предсказуемого порядка выполнения.

### Что такое scheduler

Scheduler — это абстракция над идеей «выполнить вот эту работу». Он контролирует **когда** и **в каком контексте** доставляются уведомления потока (\`next\`/\`error\`/\`complete\`), а также управляет конкурентностью (одновременностью) и таймингом. Проще говоря — это стратегия «в какую очередь браузера положить задачу».

### Виды планировщиков

Чтобы понять их, вспомни, как браузер выполняет задачи: сначала весь синхронный код, потом _микрозадачи_ (промисы), потом _макрозадачи_ (таймеры), а перед отрисовкой — \`requestAnimationFrame\`.

- **queueScheduler** — синхронно, но через очередь. Очередь нужна, чтобы при рекурсивных эмиссиях не переполнить стек вызовов. По умолчанию синхронный.
- **asapScheduler** — _микрозадача_ (\`Promise.then\` / \`queueMicrotask\`). Выполнится сразу после текущего синхронного кода, но раньше любых таймеров.
- **asyncScheduler** — _макрозадача_ (\`setTimeout\` / \`setInterval\`). Именно его используют операторы \`delay\`, \`interval\`, \`timer\`.
- **animationFrameScheduler** — \`requestAnimationFrame\`. Для плавных анимаций, синхронизированных с перерисовкой экрана (repaint).

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(...); // синхронно, по порядку
of('async').pipe(observeOn(asapScheduler));  // доставка в микрозадаче
\`\`\`

### subscribeOn против observeOn

Это два оператора, которые применяют планировщик, но к разным моментам жизни потока.

- **subscribeOn(scheduler)** — задаёт контекст, в котором произойдёт сама **подписка**, то есть запуск источника. Влияет на «начало» — где выполнится код, стартующий поток.
- **observeOn(scheduler)** — задаёт контекст, в котором **доставляются уведомления** (\`next\`/\`error\`/\`complete\`) для всех операторов **ниже** по цепочке. Влияет на «после».

\`\`\`ts
source$.pipe(
  subscribeOn(asyncScheduler),        // сама подписка отложена
  map(heavyTransform),
  observeOn(animationFrameScheduler)  // эмиссии доставляются в rAF
);
\`\`\`

Мнемоника: \`subscribeOn\` — про то, где _начать_ (одна точка на весь поток, где бы его ни поставили); \`observeOn\` — про то, где _продолжить_ доставку вниз по конвейеру.

### Зачем это нужно

- Разбить тяжёлую синхронную работу на кусочки, чтобы не заблокировать UI и не подвесить интерфейс.
- Явно контролировать порядок выполнения: микрозадачи против макрозадач.
- В тестах использовать \`TestScheduler\` — он даёт «виртуальное время» и marble-тесты (наглядные диаграммы потока), позволяя проверять асинхронный код синхронно и мгновенно.

## ⚠️ Подводные камни

- \`subscribeOn\` влияет на подписку целиком независимо от места в \`pipe\`; \`observeOn\` действует только на то, что стоит **ниже** него. Их легко перепутать.
- Лишние планировщики без нужды усложняют код и добавляют задержки — по умолчанию RxJS и так работает синхронно, где это уместно.

## 🎯 Запомни

- Scheduler решает **когда** и **в каком контексте** выполнится работа потока.
- Иерархия: \`queue\` (синхронно) → \`asap\` (микрозадача) → \`async\` (макрозадача) → \`animationFrame\` (перед repaint).
- \`subscribeOn\` — контекст **подписки** (начало); \`observeOn\` — контекст **доставки** уведомлений вниз (после).`,
      en: `## 🧩 In plain words

A scheduler is a "dispatcher" that decides **when** and **in what context** the work in a stream runs: right now, a bit later in a microtask, later still as a timer, or just before the next screen repaint. By swapping the scheduler you control timing without rewriting logic. It's a subtle but powerful tool for smooth UI and predictable execution order.

### What a scheduler is

A scheduler is an abstraction over the idea of "do this work." It controls **when** and **in what context** a stream's notifications (\`next\`/\`error\`/\`complete\`) are delivered, and it governs concurrency and timing. Put simply, it's a strategy for "which browser queue to put the task in."

### Kinds of scheduler

To understand them, recall how the browser runs tasks: first all synchronous code, then _microtasks_ (promises), then _macrotasks_ (timers), and before painting — \`requestAnimationFrame\`.

- **queueScheduler** — synchronous, but via a queue. The queue prevents a stack overflow during recursive emissions. Synchronous by default.
- **asapScheduler** — a _microtask_ (\`Promise.then\` / \`queueMicrotask\`). Runs right after the current synchronous code, but before any timers.
- **asyncScheduler** — a _macrotask_ (\`setTimeout\` / \`setInterval\`). This is what \`delay\`, \`interval\`, and \`timer\` use.
- **animationFrameScheduler** — \`requestAnimationFrame\`. For smooth animations synced with the screen repaint.

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(...); // synchronous, in order
of('async').pipe(observeOn(asapScheduler));  // delivery in a microtask
\`\`\`

### subscribeOn versus observeOn

These are two operators that apply a scheduler, but to different moments in the stream's life.

- **subscribeOn(scheduler)** — sets the context in which the **subscription** itself happens, i.e. the source start. It affects the "beginning" — where the code that starts the stream runs.
- **observeOn(scheduler)** — sets the context in which **notifications** (\`next\`/\`error\`/\`complete\`) are delivered for every operator **downstream**. It affects the "after."

\`\`\`ts
source$.pipe(
  subscribeOn(asyncScheduler),        // the subscription itself is deferred
  map(heavyTransform),
  observeOn(animationFrameScheduler)  // emissions delivered in rAF
);
\`\`\`

Mnemonic: \`subscribeOn\` is about where to _start_ (one point for the whole stream, wherever you place it); \`observeOn\` is about where to _continue_ delivery down the pipeline.

### Why this matters

- Break heavy synchronous work into chunks so you don't block the UI and freeze the interface.
- Explicitly control execution order: microtasks versus macrotasks.
- In tests, use \`TestScheduler\` — it gives "virtual time" and marble tests (visual stream diagrams), letting you verify async code synchronously and instantly.

## ⚠️ Common pitfalls

- \`subscribeOn\` affects the whole subscription regardless of its position in the \`pipe\`; \`observeOn\` affects only what sits **below** it. They're easy to confuse.
- Adding schedulers you don't need complicates the code and injects delays — by default RxJS already runs synchronously where appropriate.

## 🎯 Key takeaways

- A scheduler decides **when** and **in what context** a stream's work runs.
- Hierarchy: \`queue\` (sync) → \`asap\` (microtask) → \`async\` (macrotask) → \`animationFrame\` (before repaint).
- \`subscribeOn\` = the **subscription** context (the start); \`observeOn\` = the context for **delivering** notifications downstream (the after).`
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
      ru: `## 🧩 Простыми словами

Представь конвейер на заводе: деталь едет по ленте и проходит станки один за другим. В RxJS данные едут через \`.pipe()\`, а каждый «станок» — это оператор. Оператор — это всего лишь функция, которая берёт входной поток и возвращает новый поток. Написать свой оператор — значит сделать свой «станок».

### Оператор — это просто функция

В RxJS поток данных называется \`Observable\` (наблюдаемый источник — то, на что можно «подписаться» и получать значения по мере их появления). Оператор имеет тип \`OperatorFunction<T, R>\` — это функция вида \`(source: Observable<T>) => Observable<R>\`: на вход поток значений типа \`T\`, на выход поток значений типа \`R\`.

Метод \`.pipe()\` просто берёт исходный поток и прогоняет его через цепочку таких функций слева направо — как деталь через станки.

### Способ 1: собрать из готовых операторов (предпочтительно)

Чаще всего свой оператор не нужно писать «с нуля» — достаточно склеить несколько существующих через \`pipe\`:

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

Здесь \`debounceTime\` ждёт паузы, а \`distinctUntilChanged\` отбрасывает повторы. Функция \`pipe\` (без источника, «свободная» версия) склеивает их в один переиспользуемый оператор. Это просто, читаемо и почти всегда достаточно.

### Способ 2: «с нуля» через new Observable

Когда нужна нестандартная логика, которую не собрать из готовых кубиков, возвращаем функцию, создающую новый \`Observable\` вручную:

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

Что тут происходит: мы подписываемся на входной \`source\`, а \`subscriber\` — это тот, кто слушает наш новый поток. Для каждого значения (\`next\`) мы один раз (при первом значении) дёргаем \`fn\`, а потом просто передаём значение дальше. Ошибки (\`error\`) и завершение (\`complete\`) тоже пробрасываем. В конце возвращаем функцию **teardown** («уборка») — она отписывается от источника, когда наш поток больше не нужен.

\`MonoTypeOperatorFunction<T>\` — это частный случай \`OperatorFunction<T, T>\`: тип на входе и выходе одинаковый (mono = один тип).

## ⚠️ Подводные камни

- Проксируй все три уведомления — \`next\`, \`error\` и \`complete\`. Забудешь \`error\` — ошибки «проглотятся» и поток зависнет.
- Обязательно возвращай teardown, отписывающийся от источника, иначе получишь утечку памяти.
- Сохраняй ленивость: код внутри \`new Observable\` не должен ничего делать до подписки — всё запускается только когда кто-то подписался.
- Не пиши «с нуля», если задачу решает композиция готовых операторов.

## 🎯 Запомни

- Оператор = функция \`(source) => newObservable\`, а \`.pipe()\` прогоняет поток через цепочку таких функций.
- Способ 1 (склеить готовые через \`pipe\`) — по умолчанию; способ 2 (\`new Observable\`) — только когда композиции не хватает.
- В способе 2 всегда пробрасывай \`next\`/\`error\`/\`complete\` и возвращай teardown.`,
      en: `## 🧩 In plain words

Picture a factory conveyor belt: a part rides along and passes through machines one after another. In RxJS the data rides through \`.pipe()\`, and each "machine" is an operator. An operator is just a function that takes an input stream and returns a new stream. Writing your own operator means building your own "machine."

### An operator is just a function

In RxJS a stream of data is called an \`Observable\` (an observable source — something you can "subscribe" to and receive values from as they appear). An operator has the type \`OperatorFunction<T, R>\` — a function of the shape \`(source: Observable<T>) => Observable<R>\`: in comes a stream of values of type \`T\`, out comes a stream of type \`R\`.

The \`.pipe()\` method simply takes the source stream and runs it through a chain of such functions, left to right — like a part passing through machines.

### Way 1: compose existing operators (preferred)

Most of the time you don't need to write an operator from scratch — you just glue several existing ones together with \`pipe\`:

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

Here \`debounceTime\` waits for a pause and \`distinctUntilChanged\` drops repeats. The \`pipe\` function (the standalone version, with no source) glues them into one reusable operator. It's simple, readable, and almost always enough.

### Way 2: "from scratch" via new Observable

When you need non-standard logic that can't be assembled from ready-made blocks, return a function that builds a new \`Observable\` manually:

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

What happens here: we subscribe to the incoming \`source\`, and \`subscriber\` is whoever is listening to our new stream. For each value (\`next\`) we call \`fn\` once (on the very first value), then just pass the value along. Errors (\`error\`) and completion (\`complete\`) are forwarded too. Finally we return a **teardown** function ("cleanup") — it unsubscribes from the source when our stream is no longer needed.

\`MonoTypeOperatorFunction<T>\` is a special case of \`OperatorFunction<T, T>\`: the input and output types are the same (mono = one type).

## ⚠️ Common pitfalls

- Proxy all three notifications — \`next\`, \`error\`, and \`complete\`. Forget \`error\` and errors get swallowed and the stream hangs.
- Always return a teardown that unsubscribes from the source, otherwise you leak memory.
- Preserve laziness: code inside \`new Observable\` should do nothing until subscription — everything runs only once someone subscribes.
- Don't write "from scratch" if composing existing operators solves the task.

## 🎯 Key takeaways

- An operator = a function \`(source) => newObservable\`, and \`.pipe()\` runs the stream through a chain of such functions.
- Way 1 (glue existing operators with \`pipe\`) is the default; Way 2 (\`new Observable\`) only when composition isn't enough.
- In Way 2 always forward \`next\`/\`error\`/\`complete\` and return a teardown.`
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
      ru: `## 🧩 Простыми словами

Подписка на поток (subscription) — это как открытый кран: пока ты его не закрыл, вода течёт. Если компонент на странице уничтожен (пользователь ушёл на другую вкладку), а кран остался открытым, RxJS продолжает гонять код, который держит ссылку на уже мёртвый компонент. Память не освобождается — это и есть **утечка**. Ниже — способы «закрывать кран» автоматически.

### Откуда берутся утечки

Когда компонент Angular уничтожается, но подписка всё ещё жива, её колбэки продолжают вызываться и удерживают ссылки на компонент, не давая сборщику мусора его убрать. Результат — растущее потребление памяти и странные баги (код старого компонента реагирует на события).

Особенно опасны **бесконечные** потоки — те, что никогда не завершаются сами: \`interval\` (таймер), \`fromEvent\` (события DOM), \`BehaviorSubject\` (хранилище значения). А вот завершающиеся потоки (например, HTTP-запрос выдал ответ и закрылся) вызывают teardown — «самоуборку» — сами, так что за них можно не переживать так сильно.

### 1. async pipe (предпочтительно)

\`\`\`html
<div>{{ data$ | async }}</div>
\`\`\`

Специальная «труба» \`async\` в шаблоне сама подписывается на поток и **автоматически** отписывается, когда компонент уничтожается. Ручного кода — ноль, забыть отписаться невозможно. Это способ по умолчанию.

### 2. takeUntilDestroyed (Angular 16+)

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(...);
}
\`\`\`

Оператор \`takeUntilDestroyed\` завершает поток, когда компонент уничтожается. \`DestroyRef\` — это объект Angular, который знает момент уничтожения. Если вызвать оператор в «контексте инъекции» (например, прямо в поле класса или конструкторе), \`destroyRef\` можно вообще не передавать — Angular подставит его сам.

### 3. takeUntil + Subject (классика)

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`

\`Subject\` — это поток, в который можно вручную «толкать» значения. Идея: заводим свой поток-сигнал \`destroy$\`, а \`takeUntil\` слушает его и обрывает основную подписку, как только в \`destroy$\` что-то придёт. В \`ngOnDestroy\` (метод, вызываемый при уничтожении компонента) мы посылаем сигнал \`.next()\` и закрываем сам сигнал \`.complete()\`.

**Важно**: \`takeUntil\` должен стоять **последним** в \`pipe\`. Если после него есть другие операторы, они могут пережить отписку и продолжить работать.

### 4. Subscription.add / ручной unsubscribe

Можно сложить все подписки в один объект \`Subscription\` и вызвать у него \`.unsubscribe()\` в \`ngOnDestroy\`. Работает, но многословно и легко забыть добавить очередную подписку.

## ⚠️ Подводные камни

- Забытая подписка на бесконечный поток — самая частая причина утечки; завершающиеся потоки прощают эту ошибку, бесконечные — нет.
- \`takeUntil\` не на последнем месте в pipe — операторы ниже могут пережить отписку.
- Ручной \`unsubscribe\` легко забыть при добавлении новой подписки — поэтому это последний выбор.

## 🎯 Запомни

- Порядок предпочтения: async pipe → takeUntilDestroyed → takeUntil; ручной unsubscribe — крайний случай.
- Бесконечные потоки (\`interval\`, \`fromEvent\`, \`BehaviorSubject\`) обязательно отписывай, HTTP чаще закрывается сам.
- В мире Signals \`toSignal\` управляет жизненным циклом сам — отписываться руками не нужно.`,
      en: `## 🧩 In plain words

A subscription to a stream is like an open tap: until you close it, water keeps flowing. If a component on the page is destroyed (the user navigated away) but the tap is still open, RxJS keeps running code that holds a reference to the already-dead component. The memory is never freed — that's a **leak**. Below are ways to "close the tap" automatically.

### Where leaks come from

When an Angular component is destroyed but the subscription is still alive, its callbacks keep firing and hold references to the component, preventing the garbage collector from removing it. The result is growing memory usage and strange bugs (an old component's code reacting to events).

**Infinite** streams are especially dangerous — the ones that never complete on their own: \`interval\` (a timer), \`fromEvent\` (DOM events), \`BehaviorSubject\` (a value store). Completing streams (e.g. an HTTP request that delivered a response and closed) trigger teardown — "self-cleanup" — by themselves, so you don't need to worry about them as much.

### 1. async pipe (preferred)

\`\`\`html
<div>{{ data$ | async }}</div>
\`\`\`

The special \`async\` "pipe" in the template subscribes to the stream itself and **automatically** unsubscribes when the component is destroyed. Zero manual code, impossible to forget. This is the default choice.

### 2. takeUntilDestroyed (Angular 16+)

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(...);
}
\`\`\`

The \`takeUntilDestroyed\` operator completes the stream when the component is destroyed. \`DestroyRef\` is an Angular object that knows the destruction moment. If you call the operator inside an "injection context" (e.g. right in a class field or the constructor), you can omit \`destroyRef\` entirely — Angular fills it in for you.

### 3. takeUntil + Subject (classic)

\`\`\`ts
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`

A \`Subject\` is a stream you can manually "push" values into. The idea: create your own signal-stream \`destroy$\`, and \`takeUntil\` listens to it and cuts off the main subscription the moment \`destroy$\` emits. In \`ngOnDestroy\` (the method called when the component is destroyed) we send the signal with \`.next()\` and close the signal itself with \`.complete()\`.

**Important**: \`takeUntil\` must be **last** in the \`pipe\`. If other operators come after it, they can outlive the unsubscription and keep running.

### 4. Subscription.add / manual unsubscribe

You can collect all subscriptions into a single \`Subscription\` object and call \`.unsubscribe()\` on it in \`ngOnDestroy\`. It works, but it's verbose and easy to forget to add the next subscription.

## ⚠️ Common pitfalls

- A forgotten subscription to an infinite stream is the most common leak cause; completing streams forgive this mistake, infinite ones don't.
- \`takeUntil\` not placed last in the pipe — operators below it can outlive the unsubscription.
- Manual \`unsubscribe\` is easy to forget when adding a new subscription — that's why it's the last resort.

## 🎯 Key takeaways

- Preference order: async pipe → takeUntilDestroyed → takeUntil; manual unsubscribe is the last resort.
- Always unsubscribe from infinite streams (\`interval\`, \`fromEvent\`, \`BehaviorSubject\`); HTTP usually closes itself.
- In the Signals world, \`toSignal\` manages the lifecycle itself — no manual unsubscription needed.`
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
      ru: `## 🧩 Простыми словами

Представь, что событие сыплется слишком часто — например, каждое нажатие клавиши или каждый пиксель прокрутки. Обрабатывать каждое — дорого и не нужно. Эти четыре оператора — как разные «фильтры-регуляторы напора»: они прореживают быстрый поток. Разница только в том, **какое** значение они пропускают и **когда**.

### debounceTime(ms)

Эмитит значение, только если после него **прошло \`ms\` тишины** (ни одного нового значения). Пока поток продолжает сыпать, оператор откладывает выдачу и ждёт паузы.

- Применение: **поиск по мере ввода** — ждём, пока пользователь перестанет печатать, и только потом отправляем запрос.
- Marble-диаграмма (визуальная схема потока): \`a-b-c----| → ------c-|\` — выдаётся только последнее \`c\`, после паузы.

### throttleTime(ms)

Эмитит **первое** значение сразу, а затем игнорирует всё входящее следующие \`ms\` миллисекунд. Потом снова готов пропустить первое.

- Применение: **обработка scroll/resize**, защита кнопки от частых кликов — нужна мгновенная реакция плюс ограничение частоты.
- Marble: \`a-b-c-d-e| → a---d---|\` (leading — «ведущее», т.е. первое в окне).

### auditTime(ms)

Когда пришло значение, ждёт \`ms\` и эмитит **последнее** значение на момент истечения этого окна. Похож на throttle, но выдаёт не первое, а **trailing** («хвостовое», последнее) значение.

- Применение: «отдавай последнее актуальное значение раз в N мс».

### sampleTime(ms)

Каждые \`ms\` (по тику внутреннего таймера, а не по приходу события) эмитит **последнее** пришедшее значение, если оно вообще было.

- Применение: периодический «снимок» текущего состояния потока через равные промежутки.

\`\`\`ts
search$.pipe(debounceTime(300), distinctUntilChanged());
scroll$.pipe(throttleTime(100));
\`\`\`

Здесь поиск ждёт паузы в 300 мс перед запросом, а обработчик скролла срабатывает не чаще раза в 100 мс.

## ⚠️ Подводные камни

- \`debounceTime\` может «молчать» вечно, если значения идут без пауз — ни одно не пройдёт, пока не наступит тишина.
- \`throttleTime\` по умолчанию выдаёт leading-значение; итоговое (последнее) можно упустить, если не настроить trailing.
- \`sampleTime\` привязан к таймеру, а не к событиям — между тиками можно «пропустить» промежуточные значения.

## 🎯 Запомни

- **debounce** — «подожди тишины» (последнее значение после паузы).
- **throttle** — «первое, потом игнор на время».
- **audit** — «последнее в конце окна».
- **sample** — «последнее по тику таймера».`,
      en: `## 🧩 In plain words

Imagine an event firing far too often — every keystroke, or every pixel of scroll. Handling each one is expensive and unnecessary. These four operators are like different "flow-rate regulators": they thin out a fast stream. The only difference is **which** value they let through and **when**.

### debounceTime(ms)

Emits a value only if **\`ms\` of silence** passed after it (no new values). While the stream keeps firing, the operator defers the emission and waits for a pause.

- Use: **search-as-you-type** — wait until the user stops typing, then send the request.
- Marble diagram (a visual sketch of the stream): \`a-b-c----| → ------c-|\` — only the last \`c\` comes out, after the pause.

### throttleTime(ms)

Emits the **first** value immediately, then ignores everything incoming for the next \`ms\` milliseconds. After that it's ready to let another first value through.

- Use: **scroll/resize handling**, protecting a button from rapid clicks — you want an immediate reaction plus a rate limit.
- Marble: \`a-b-c-d-e| → a---d---|\` (leading — i.e. the first one in the window).

### auditTime(ms)

When a value arrives, it waits \`ms\` and emits the **latest** value at the moment that window expires. Like throttle, but it emits the **trailing** (last) value instead of the first.

- Use: "give me the latest current value once every N ms".

### sampleTime(ms)

Every \`ms\` (driven by an internal timer tick, not by an arriving event) it emits the **latest** received value, if there was one at all.

- Use: a periodic "snapshot" of the stream's current state at regular intervals.

\`\`\`ts
search$.pipe(debounceTime(300), distinctUntilChanged());
scroll$.pipe(throttleTime(100));
\`\`\`

Here search waits for a 300 ms pause before querying, and the scroll handler fires no more than once per 100 ms.

## ⚠️ Common pitfalls

- \`debounceTime\` can stay "silent" forever if values keep coming without pauses — nothing passes until there's silence.
- \`throttleTime\` emits the leading value by default; you can miss the final (latest) value unless you enable trailing.
- \`sampleTime\` is tied to a timer, not to events — you can "skip" intermediate values between ticks.

## 🎯 Key takeaways

- **debounce** — "wait for silence" (latest value after a pause).
- **throttle** — "first one, then ignore for a while".
- **audit** — "latest at the end of the window".
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
      ru: `## 🧩 Простыми словами

\`distinctUntilChanged\` — это фильтр «не повторяйся». Он пропускает значение дальше по потоку, только если оно **отличается от предыдущего**. Как охранник, который не пускает двух одинаковых людей подряд, но если между ними прошёл кто-то другой — пустит снова. Главная ловушка: с объектами он сравнивает не содержимое, а «удостоверение личности» (ссылку), и легко ошибается.

### Как он работает

Оператор пропускает значение, только если оно отличается от **предыдущего эмитированного** (выданного) значения. По умолчанию сравнение идёт через \`Object.is\` — это строгое сравнение, почти как \`===\`.

\`\`\`ts
of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
// → 1, 2, 3, 1
\`\`\`

Обрати внимание: отсеиваются только **подряд идущие** дубликаты. Последняя \`1\` пройдёт, потому что прямо перед ней было \`3\` — значит, значение «изменилось».

### Подводный камень с объектами

Объекты сравниваются **по ссылке**, а не по содержимому. Два разных объекта с одинаковыми полями для \`Object.is\` — «разные»:

\`\`\`ts
state$.pipe(distinctUntilChanged())
// {a:1} !== {a:1} → пройдут оба раза
\`\`\`

Если поток на каждом шаге создаёт новый объект (а это типично для immutable-обновлений, где вместо изменения старого объекта делают новую копию), оператор не отфильтрует вообще ничего — все «новые» объекты считаются разными.

### Решение 1: свой компаратор

Передай функцию сравнения, которая смотрит на нужное поле:

\`\`\`ts
distinctUntilChanged((prev, curr) => prev.id === curr.id)
\`\`\`

### Решение 2: distinctUntilKeyChanged

Короткая форма, когда сравниваем по одному ключу:

\`\`\`ts
distinctUntilKeyChanged('id')
\`\`\`

### Решение 3: сравнение по проекции

Второй аргумент — функция-проекция: она вытаскивает из значения то, что реально важно, и сравнивают уже это:

\`\`\`ts
distinctUntilChanged(
  (a, b) => a === b,
  (state) => state.user.name // эмитим только при смене имени
)
\`\`\`

Здесь поток пропустит новое состояние, только если изменилось именно \`user.name\`, даже если весь объект пересоздался.

### Зачем это нужно

Оператор убирает лишние эмиссии и, как следствие, лишние перерисовки UI. В state-менеджменте (например, NgRx) селекторы и так мемоизируют результат, но \`distinctUntilChanged\` полезен в самописных потоках состояния.

## ⚠️ Подводные камни

- Фильтруются только **подряд идущие** повторы — \`1,2,1\` пропустит обе единицы.
- С объектами дефолтное сравнение по ссылке часто бесполезно — новый объект всегда «другой».
- Глубокое сравнение (\`isEqual\` из lodash) решает проблему, но оно дорогое — применяй осторожно на горячих потоках.

## 🎯 Запомни

- \`distinctUntilChanged\` пропускает значение, только если оно отличается от **предыдущего** (сравнение подряд).
- По умолчанию объекты сравниваются **по ссылке** — для них передавай компаратор, \`distinctUntilKeyChanged\` или проекцию.
- Цель — убрать дубли и лишние перерисовки; глубокое сравнение используй осмотрительно.`,
      en: `## 🧩 In plain words

\`distinctUntilChanged\` is a "don't repeat yourself" filter. It lets a value through only if it **differs from the previous** one. Like a bouncer who won't let two identical people in back-to-back, but if someone different passed between them, they'll let it in again. The main trap: with objects it compares not the contents but the "ID card" (the reference), and gets fooled easily.

### How it works

The operator lets a value through only if it differs from the **previously emitted** value. By default the comparison uses \`Object.is\` — a strict comparison, almost like \`===\`.

\`\`\`ts
of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged())
// → 1, 2, 3, 1
\`\`\`

Note: only **consecutive** duplicates are filtered out. The trailing \`1\` passes because \`3\` came right before it — so the value "changed."

### The object pitfall

Objects are compared **by reference**, not by content. Two different objects with identical fields are "different" to \`Object.is\`:

\`\`\`ts
state$.pipe(distinctUntilChanged())
// {a:1} !== {a:1} → both pass
\`\`\`

If the stream creates a new object at each step (typical of immutable updates, where instead of mutating the old object you make a fresh copy), the operator filters nothing at all — every "new" object counts as different.

### Solution 1: a custom comparator

Pass a comparison function that looks at the field you care about:

\`\`\`ts
distinctUntilChanged((prev, curr) => prev.id === curr.id)
\`\`\`

### Solution 2: distinctUntilKeyChanged

A shorthand when comparing by a single key:

\`\`\`ts
distinctUntilKeyChanged('id')
\`\`\`

### Solution 3: comparison by projection

The second argument is a projection function: it extracts what actually matters from the value, and that's what gets compared:

\`\`\`ts
distinctUntilChanged(
  (a, b) => a === b,
  (state) => state.user.name // emit only when the name changes
)
\`\`\`

Here the stream passes a new state only if \`user.name\` specifically changed, even if the whole object was recreated.

### Why it matters

The operator removes redundant emissions and, as a result, redundant UI re-renders. In state management (e.g. NgRx) selectors already memoize their result, but \`distinctUntilChanged\` is useful in hand-rolled state streams.

## ⚠️ Common pitfalls

- Only **consecutive** repeats are filtered — \`1,2,1\` lets both ones through.
- With objects the default reference comparison is often useless — a new object is always "different".
- Deep comparison (\`isEqual\` from lodash) solves it but is expensive — use it carefully on hot streams.

## 🎯 Key takeaways

- \`distinctUntilChanged\` passes a value only if it differs from the **previous** one (consecutive comparison).
- By default objects are compared **by reference** — for them pass a comparator, \`distinctUntilKeyChanged\`, or a projection.
- The goal is removing duplicates and redundant re-renders; use deep comparison judiciously.`
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
      ru: `## 🧩 Простыми словами

Представь популярное видео на YouTube: миллион людей смотрят один и тот же ролик, но сервер отдаёт его *один раз*, а не запускает миллион отдельных копий. \`share()\` в RxJS делает то же самое с потоком данных: несколько подписчиков делят **одно** выполнение источника вместо того, чтобы каждый запускал своё. Это называется multicasting — «вещание для многих».

По умолчанию Observable в RxJS **холодный** (cold): каждый, кто подписался, получает свою собственную независимую копию работы (свой HTTP-запрос, свой таймер). \`share()\`, \`connectable\` и старый \`multicast\` — это инструменты, чтобы превратить такой поток в **горячий** (hot), то есть общий на всех.

### Механика multicasting

Multicasting — это когда мы вставляем \`Subject\` между источником и подписчиками. \`Subject\` — это особый объект RxJS, который умеет одновременно быть и слушателем (подписывается на источник), и вещателем (раздаёт значения дальше). Источник подписывается на Subject **один раз**, а Subject уже раздаёт полученные значения всем downstream-подписчикам (тем, кто стоит «ниже по течению»). Так одно выполнение холодного источника делится между многими.

### share()

\`share()\` — это автоматизированный multicast с refCount. RefCount (reference counting) — это счётчик активных подписчиков.

- При **первом** подписчике \`share()\` подписывается на источник через внутренний \`Subject\`.
- Последующие подписчики просто делят это же выполнение — новый запрос не запускается.
- Когда счётчик подписчиков падает до **нуля**, \`share()\` отписывается от источника (останавливает работу).
- Если после обнуления приходит новый подписчик — источник запускается **заново, с нуля**.

В RxJS 7 \`share()\` принимает объект конфигурации: \`connector\` (фабрика, создающая Subject), \`resetOnError\`, \`resetOnComplete\` и \`resetOnRefCountZero\`. Эти флаги управляют тем, сбрасывать ли (перезапускать) общее выполнение при ошибке, завершении или когда подписчиков стало ноль.

\`\`\`ts
source$.pipe(
  share({ resetOnRefCountZero: false }) // не сбрасывать при 0 подписчиков
);
\`\`\`

Здесь \`resetOnRefCountZero: false\` говорит: даже если все отписались, не выбрасывай накопленное состояние — держи выполнение живым, чтобы следующий подписчик продолжил, а не начал заново.

### connectable()

\`connectable(source)\` создаёт особый Observable типа \`Connectable\`. Его отличие: он **не подписывается** на источник автоматически при первой подписке. Он ждёт, пока ты вручную не вызовешь \`.connect()\`. Это даёт **ручной контроль** над моментом старта вещания — полезно, когда нужно сначала подключить всех подписчиков, а уже потом одним движением запустить поток, чтобы никто не пропустил первые значения.

\`\`\`ts
const shared = connectable(source$);
shared.subscribe(a); shared.subscribe(b);
const conn = shared.connect(); // вещание стартует именно здесь
// conn.unsubscribe() — остановить вещание
\`\`\`

### multicast (устаревший)

\`multicast(subjectFactory)\` в связке с \`refCount()\` — это старый низкоуровневый API, который делал то же самое, но вручную. Его заменили на \`connectable\` и \`share\`. Он был многословным и легко приводил к ошибкам с refCount (например, поток запускался или останавливался не тогда, когда ожидалось), поэтому его пометили deprecated (устаревшим).

## ⚠️ Подводные камни

- По умолчанию \`share()\` в RxJS 7 **перезапускает** источник, когда подписчиков стало ноль, а потом появился новый. Если тебе нужно кэшировать результат, поставь \`resetOnRefCountZero: false\` (или используй \`shareReplay\`).
- \`connectable\` без вызова \`.connect()\` вообще не начнёт работу — легко забыть и получить «мёртвый» поток.
- Не путай холодный и горячий: \`share()\` превращает cold в hot, и опоздавший подписчик может пропустить уже отданные значения.

## 🎯 Запомни

- Multicasting = один \`Subject\` посередине, одно выполнение источника на всех.
- \`share()\` — автоматический multicast с refCount: стартует на первом подписчике, останавливается на нуле, перезапускается при новом.
- \`connectable()\` + \`.connect()\` — ручной контроль момента старта вещания.
- \`multicast\` устарел; используй \`share\` или \`connectable\`.`,
      en: `## 🧩 In plain words

Think of a popular YouTube video: a million people watch the same clip, but the server serves it *once* rather than spinning up a million separate copies. \`share()\` in RxJS does the same for a data stream: several subscribers share **one** execution of the source instead of each one starting its own. This is called multicasting — "broadcasting to many."

By default, an Observable in RxJS is **cold**: everyone who subscribes gets their own independent copy of the work (their own HTTP request, their own timer). \`share()\`, \`connectable\`, and the old \`multicast\` are the tools for turning such a stream **hot** — that is, shared across everyone.

### Multicasting mechanics

Multicasting means inserting a \`Subject\` between the source and the subscribers. A \`Subject\` is a special RxJS object that can be both a listener (it subscribes to the source) and a broadcaster (it hands values onward). The source subscribes to the Subject **once**, and the Subject fans the incoming values out to all downstream subscribers (those "further down the stream"). Thus one execution of a cold source is shared among many.

### share()

\`share()\` is an automated multicast with refCount. RefCount (reference counting) is a counter of active subscribers.

- On the **first** subscriber, \`share()\` subscribes to the source through an internal \`Subject\`.
- Later subscribers simply share that same execution — no new request is started.
- When the subscriber count drops to **zero**, \`share()\` unsubscribes from the source (stops the work).
- If a new subscriber arrives after zero — the source starts again, **from scratch**.

In RxJS 7, \`share()\` takes a config object: \`connector\` (a factory that creates the Subject), \`resetOnError\`, \`resetOnComplete\`, and \`resetOnRefCountZero\`. These flags control whether the shared execution is reset (restarted) on error, on completion, or when the subscriber count hits zero.

\`\`\`ts
source$.pipe(
  share({ resetOnRefCountZero: false }) // do not reset at 0 subscribers
);
\`\`\`

Here \`resetOnRefCountZero: false\` says: even if everyone unsubscribes, don't throw away the accumulated state — keep the execution alive so the next subscriber continues rather than starting over.

### connectable()

\`connectable(source)\` creates a special Observable of type \`Connectable\`. Its distinguishing trait: it does **not subscribe** to the source automatically on the first subscription. It waits until you manually call \`.connect()\`. This gives **manual control** over when the broadcast starts — useful when you want to wire up all subscribers first, then start the stream in one move so nobody misses the early values.

\`\`\`ts
const shared = connectable(source$);
shared.subscribe(a); shared.subscribe(b);
const conn = shared.connect(); // the broadcast starts right here
// conn.unsubscribe() — to stop the broadcast
\`\`\`

### multicast (deprecated)

\`multicast(subjectFactory)\` paired with \`refCount()\` is the old low-level API that did the same thing manually. It was replaced by \`connectable\` and \`share\`. It was verbose and easily led to refCount mistakes (for example, the stream starting or stopping at the wrong moment), which is why it is now deprecated.

## ⚠️ Common pitfalls

- By default, \`share()\` in RxJS 7 **restarts** the source when the subscriber count hits zero and a new one later appears. If you need to cache the result, set \`resetOnRefCountZero: false\` (or use \`shareReplay\`).
- A \`connectable\` without a \`.connect()\` call never starts at all — easy to forget and end up with a "dead" stream.
- Don't confuse cold and hot: \`share()\` turns cold into hot, so a late subscriber may miss values already emitted.

## 🎯 Key takeaways

- Multicasting = one \`Subject\` in the middle, one source execution for everyone.
- \`share()\` is an automatic multicast with refCount: starts on the first subscriber, stops at zero, restarts on a new one.
- \`connectable()\` + \`.connect()\` gives manual control over when the broadcast begins.
- \`multicast\` is deprecated; use \`share\` or \`connectable\`.`
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
      ru: `## 🧩 Простыми словами

Представь конвейер на фабрике. Ты не бегаешь к каждому станку вручную — ты кладёшь деталь на ленту, а дальше она сама проезжает через все обработки и на выходе становится готовым продуктом. Паттерн «action stream» устроен так же: вместо «при клике вызови метод и вручную обнови данные» ты **бросаешь событие в поток** (в Subject), а поток сам, по заранее описанным правилам, превращает это событие в загруженные данные.

\`Subject\` здесь — это «входная лента конвейера»: объект RxJS, в который можно вручную «класть» значения методом \`.next()\`, и все, кто подписан, их получат. Это делает архитектуру **декларативной** (описываем *что* должно произойти) вместо **императивной** (пошагово командуем *как*).

### Идея

Мы заводим **поток действий** (Subject) и декларативно описываем, как из него получить данные. Это фундамент реактивной архитектуры — та же идея лежит в основе NgRx Effects. Компонент не занимается логикой загрузки: он лишь сообщает «пользователь ввёл текст», а весь пайплайн запроса описан один раз в потоке.

### Структура

- \`Subject\` — источник «команд»: поиск, перезагрузка, смена страницы. В него компонент кладёт события.
- \`switchMap\` / \`exhaustMap\` — оператор, который превращает команду в HTTP-запрос с нужной семантикой отмены (об этом ниже).
- Результат — Observable состояния, который шаблон потребляет через \`async\` pipe (Angular сам подписывается и отписывается).

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

Что здесь по шагам: \`debounceTime(300)\` ждёт паузу в 300 мс, чтобы не слать запрос на каждую букву. \`distinctUntilChanged()\` пропускает повтор, если текст не изменился. \`switchMap\` берёт запрос к API и, если пришла новая команда, **отменяет** предыдущий незавершённый запрос. \`startWith(...)\` сразу выдаёт состояние «идёт загрузка», а \`catchError\` ловит ошибку и превращает её в аккуратное состояние вместо падения потока. Метод \`search()\` — единственное «императивное» место: он просто кладёт слово в Subject.

### Почему это хорошо

- **switchMap** отменяет устаревший запрос — не будет гонки, когда медленный старый ответ приходит после нового и перезатирает результат.
- **startWith** декларативно даёт состояние загрузки — не нужно вручную ставить флаг \`loading = true\`.
- **catchError внутри** \`switchMap\` (а не снаружи) не убивает внешний поток: после ошибки пользователь может искать снова. Если бы \`catchError\` стоял снаружи, ошибка завершила бы весь \`search$\` навсегда.
- Состояние \`{ loading, data, error }\` — единый view-model (объект, описывающий всё, что нужно шаблону), с ним удобно рисовать UI.

### Связь с состоянием

Этот паттерн масштабируется: до полноценного state-сервиса на \`BehaviorSubject\` (Subject, который хранит текущее значение), или до NgRx, где \`search$\` становится action (действием), а pipe превращается в effect (обработчик побочных эффектов).

## ⚠️ Подводные камни

- Ставь \`catchError\` **внутри** \`switchMap\`, а не снаружи, иначе одна ошибка навсегда завершит поток действий.
- \`switchMap\` отменяет предыдущий запрос — это хорошо для поиска, но для формы, которую нельзя прерывать (например, отправка платежа), бери \`exhaustMap\` или \`concatMap\`.
- Не забудь дать поток в шаблон через \`async\` pipe, иначе придётся вручную подписываться и отписываться, рискуя утечкой памяти.

## 🎯 Запомни

- Action stream = \`Subject\` для событий + операторы, декларативно превращающие событие в данные.
- \`switchMap\` даёт отмену устаревших запросов; \`startWith\` — состояние загрузки; \`catchError\` внутри — устойчивость к ошибкам.
- Единый view-model \`{ loading, data, error }\` удобно потреблять через \`async\` pipe.
- Это тот же принцип, что в NgRx Effects, только вручную и в меньшем масштабе.`,
      en: `## 🧩 In plain words

Picture a factory conveyor belt. You don't run to each machine by hand — you drop a part onto the belt, and it rides through every processing step and comes out the other end as a finished product. The "action stream" pattern works the same way: instead of "on click, call a method and manually update the data," you **throw an event into a stream** (into a Subject), and the stream itself turns that event into loaded data by rules you described once.

Here a \`Subject\` is the "belt's entry point": an RxJS object you can manually "drop" values into with \`.next()\`, and everyone subscribed receives them. This makes the architecture **declarative** (we describe *what* should happen) instead of **imperative** (step-by-step commanding *how*).

### The idea

We set up an **action stream** (a Subject) and declaratively describe how to derive data from it. This is the foundation of reactive architecture — the same idea behind NgRx Effects. The component doesn't handle load logic: it just announces "the user typed text," and the whole request pipeline is described once inside the stream.

### Structure

- A \`Subject\` — the source of "commands": search, reload, page change. The component drops events into it.
- \`switchMap\` / \`exhaustMap\` — the operator that turns a command into an HTTP request with the right cancellation semantics (see below).
- The result is a state Observable that the template consumes via the \`async\` pipe (Angular subscribes and unsubscribes for you).

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

Step by step: \`debounceTime(300)\` waits for a 300 ms pause so we don't fire a request on every keystroke. \`distinctUntilChanged()\` skips a repeat if the text hasn't changed. \`switchMap\` runs the API request and, if a new command arrives, **cancels** the previous unfinished one. \`startWith(...)\` immediately emits a "loading" state, and \`catchError\` catches an error and turns it into a tidy state instead of killing the stream. The \`search()\` method is the one "imperative" spot: it just drops a word into the Subject.

### Why it is good

- **switchMap** cancels the stale request — no race where a slow old response arrives after a new one and overwrites the result.
- **startWith** provides the loading state declaratively — no need to manually set a \`loading = true\` flag.
- **catchError inside** \`switchMap\` (not outside) does not kill the outer stream: after an error the user can search again. If \`catchError\` sat outside, one error would end \`search$\` forever.
- The \`{ loading, data, error }\` state is a single view-model (an object holding everything the template needs), convenient for rendering the UI.

### Relationship to state

This pattern scales up: to a full state service on a \`BehaviorSubject\` (a Subject that holds a current value), or to NgRx, where \`search$\` becomes an action and the pipe becomes an effect (a side-effect handler).

## ⚠️ Common pitfalls

- Put \`catchError\` **inside** \`switchMap\`, not outside, or a single error will permanently end the action stream.
- \`switchMap\` cancels the previous request — great for search, but for a form you must not interrupt (e.g. submitting a payment), use \`exhaustMap\` or \`concatMap\`.
- Remember to feed the stream to the template via the \`async\` pipe, otherwise you must subscribe/unsubscribe manually and risk a memory leak.

## 🎯 Key takeaways

- Action stream = a \`Subject\` for events + operators that declaratively turn an event into data.
- \`switchMap\` cancels stale requests; \`startWith\` gives the loading state; \`catchError\` inside gives error resilience.
- A single \`{ loading, data, error }\` view-model is convenient to consume via the \`async\` pipe.
- It's the same principle as NgRx Effects, just manual and at a smaller scale.`
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
      ru: `## 🧩 Простыми словами

Представь, что тебе нужно проверить будильник, который звонит через 8 часов. Ждать реальные 8 часов — безумие. Хочется «промотать время вперёд» как в кино. \`TestScheduler\` в RxJS делает ровно это: он даёт **виртуальное время**, и тест, где поток ждёт три секунды, проходит за доли миллисекунды.

А чтобы наглядно описать, «что и когда» выдаёт поток, используют **marble-диаграммы** (marble — «шарик»): короткую строку из символов, где по горизонтали течёт время, а буквы — это выданные значения. Это как нотная запись для потока данных.

### Проблема тестирования времени

Потоки с операторами \`debounceTime\`, \`delay\`, \`interval\` зависят от времени. Тестировать их с настоящими таймерами — медленно (тест буквально ждёт) и хрупко (иногда не успевает, тест «моргает» — то падает, то нет). \`TestScheduler\` решает это: он подсовывает операторам **виртуальное время** — они планируют работу не на реальных часах, а на воображаемой шкале, которую тест проматывает мгновенно.

### Marble-диаграммы

Строка ASCII описывает поток во времени. Символы:

- \`-\` — один «кадр» времени (frame, по умолчанию 1 мс). Просто пустой тик, ничего не произошло.
- \`a\`, \`b\` — эмиссии значений (в этот момент поток что-то выдал).
- \`|\` — complete (поток успешно завершился).
- \`#\` — error (поток упал с ошибкой).
- \`()\` — синхронная группировка: всё в скобках произошло в одном кадре, одновременно.
- \`^\` — точка подписки (используется для hot-потоков — момент, когда мы подписались).

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

Здесь мы создаём \`TestScheduler\`, передавая ему функцию сравнения (что считать «совпало»). Внутри \`scheduler.run\` мы описываем источник строкой-диаграммой и говорим: после \`map\` результат должен выглядеть точно так же. \`map(x => x)\` ничего не меняет, поэтому ожидаемая диаграмма совпадает с исходной.

### Тест с debounceTime

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source =   cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)'); // только последний после паузы
});
\`\`\`

\`debounceTime(3)\` пропускает значение, только если после него была пауза в 3 кадра без новых значений. Значения \`a\` и \`b\` идут слишком часто и «затираются» следующими. А \`c\` — последнее перед долгой паузой, поэтому проходит. \`(c|)\` означает, что \`c\` и завершение случились в одном кадре.

### Ключевые помощники

- \`cold(marble, values)\` — создаёт cold Observable (каждый подписчик получает свою копию, старт с начала строки).
- \`hot(marble)\` — создаёт hot Observable; символ \`^\` отмечает точку подписки.
- \`expectObservable(...).toBe(...)\` — сверяет фактическую диаграмму с ожидаемой.
- \`expectSubscriptions(...)\` — проверяет тайминги подписки и отписки (когда подписались, когда отписались).

Внутри \`scheduler.run\` все асинхронные операторы автоматически используют этот scheduler — реального времени не тратится вообще.

## ⚠️ Подводные камни

- Выравнивай диаграммы по вертикали пробелами — символ на позиции N в ожидаемой строке должен совпадать по времени с той же позицией в исходной, иначе легко ошибиться в кадрах.
- Пиши асинхронные проверки только **внутри** колбэка \`scheduler.run\` — снаружи виртуальное время не действует.
- Помни: один \`-\` это ровно один кадр (1 мс), а \`debounceTime(3)\` считает именно кадры, не символы.

## 🎯 Запомни

- \`TestScheduler\` = виртуальное время: тесты с задержками проходят мгновенно и стабильно.
- Marble-строка описывает поток во времени: \`-\` кадр, буква значение, \`|\` complete, \`#\` error, \`()\` группировка, \`^\` подписка.
- Весь код пиши внутри \`scheduler.run(...)\`, там операторы сами берут виртуальное время.
- \`cold\`/\`hot\` создают потоки, \`expectObservable\`/\`expectSubscriptions\` их проверяют.`,
      en: `## 🧩 In plain words

Imagine you need to test an alarm that rings in 8 hours. Waiting a real 8 hours is insane — you'd want to "fast-forward time" like in a movie. \`TestScheduler\` in RxJS does exactly that: it gives you **virtual time**, so a test where a stream waits three seconds runs in a fraction of a millisecond.

And to visually describe "what emits and when," people use **marble diagrams** (a marble being a little ball): a short string of symbols where time flows left to right and letters are emitted values. It's like sheet music for a data stream.

### The problem of testing time

Streams with operators like \`debounceTime\`, \`delay\`, \`interval\` depend on time. Testing them with real timers is slow (the test literally waits) and flaky (sometimes it doesn't finish in time and "flickers" — passing then failing). \`TestScheduler\` fixes this: it feeds operators **virtual time** — they schedule work not on a real clock but on an imaginary timeline the test fast-forwards instantly.

### Marble diagrams

An ASCII string describes a stream over time. The symbols:

- \`-\` — one time "frame" (1 ms by default). Just an empty tick, nothing happened.
- \`a\`, \`b\` — value emissions (the stream emitted something at that moment).
- \`|\` — complete (the stream finished successfully).
- \`#\` — error (the stream failed with an error).
- \`()\` — synchronous grouping: everything in parentheses happened in one frame, simultaneously.
- \`^\` — subscription point (used for hot streams — the moment we subscribed).

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

Here we create a \`TestScheduler\`, passing it a comparison function (what counts as "matched"). Inside \`scheduler.run\` we describe the source with a diagram string and assert: after \`map\`, the result should look exactly the same. \`map(x => x)\` changes nothing, so the expected diagram matches the source.

### Testing debounceTime

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source =   cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)'); // only the last after a pause
});
\`\`\`

\`debounceTime(3)\` lets a value through only if it was followed by a 3-frame pause with no new values. \`a\` and \`b\` come too quickly and get "overwritten" by the next value. \`c\` is the last one before a long pause, so it passes. \`(c|)\` means \`c\` and completion happened in the same frame.

### Key helpers

- \`cold(marble, values)\` — creates a cold Observable (each subscriber gets its own copy, starting from the beginning of the string).
- \`hot(marble)\` — creates a hot Observable; the \`^\` symbol marks the subscription point.
- \`expectObservable(...).toBe(...)\` — compares the actual diagram with the expected one.
- \`expectSubscriptions(...)\` — checks subscription and unsubscription timings (when we subscribed, when we unsubscribed).

Inside \`scheduler.run\`, all async operators automatically use this scheduler — no real time is spent at all.

## ⚠️ Common pitfalls

- Align diagrams vertically with spaces — the symbol at position N in the expected string must line up in time with the same position in the source, or you'll miscount frames.
- Write async assertions only **inside** the \`scheduler.run\` callback — virtual time doesn't apply outside it.
- Remember: one \`-\` is exactly one frame (1 ms), and \`debounceTime(3)\` counts frames, not symbols.

## 🎯 Key takeaways

- \`TestScheduler\` = virtual time: tests with delays run instantly and reliably.
- A marble string describes a stream over time: \`-\` frame, letter value, \`|\` complete, \`#\` error, \`()\` grouping, \`^\` subscription.
- Write all code inside \`scheduler.run(...)\`, where operators pick up virtual time automatically.
- \`cold\`/\`hot\` create streams; \`expectObservable\`/\`expectSubscriptions\` assert on them.`
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
      ru: `## 🧩 Простыми словами

Представь склад с одним строгим журналом учёта. Никто не может тайком взять товар с полки — можно только подать **заявку** («выдать 5 коробок»), кладовщик запишет её в журнал и обновит остатки. Все смотрят в один и тот же журнал и всегда видят одинаковую, актуальную картину. NgRx устроен так же: есть единое хранилище состояния (**store**), и менять его можно только через официальные заявки (**actions**), которые обрабатывает строгий регистратор (**reducer**).

NgRx — это реализация паттерна Redux для Angular поверх RxJS. Главная идея — **однонаправленный поток данных**: изменения всегда идут в одну сторону, по кругу, без хаотичных мутаций из разных мест.

### Принцип

Два столпа NgRx: **однонаправленный поток данных** (данные текут по одному предсказуемому маршруту) и **единый источник истины** — весь важный state живёт в одном хранилище (store), а не размазан по десяткам компонентов.

### Составные части

#### Store

Единый **иммутабельный** (неизменяемый — его не правят на месте, а заменяют новой версией) объект состояния, обёрнутый в Observable. Компоненты **читают** из него через селекторы (функции-выборки нужного куска состояния) и никогда не меняют его напрямую.

#### Actions

Actions описывают, «что произошло» — это событие с полем \`type\` (уникальное имя) и необязательным payload (данными). Создаются через \`createAction\`:

\`\`\`ts
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);
\`\`\`

\`loadUsers\` — команда «начать загрузку», без данных. \`loadUsersSuccess\` несёт с собой массив пользователей (\`props<{ users: User[] }>()\` описывает форму payload). Имена в скобках \`[Users]\` — это «источник» события, помогает читать логи.

#### Reducers

Reducer — это **чистая функция** вида \`(state, action) => newState\`. Чистая (pure) значит: при тех же входных данных всегда тот же результат, без побочных эффектов. Reducer никогда не мутирует старое состояние, а возвращает **новый** объект:

\`\`\`ts
export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

\`on(action, handler)\` связывает конкретный action с тем, как он меняет state. \`{ ...s, loading: true }\` — это «копия старого состояния плюс изменённое поле»: спред-оператор \`...s\` копирует всё старое, чтобы не мутировать оригинал.

### Поток

Данные текут по кругу в одну сторону: \`Компонент → dispatch(action) → Reducer → новый State → Selector → Компонент\`. \`dispatch\` — это «подать заявку в журнал». Побочные эффекты (например, HTTP-запросы) живут не в reducers (они обязаны быть чистыми), а в отдельных **Effects**.

### Зачем это нужно

- **Предсказуемость**: состояние меняется только через actions, поэтому легко отлаживать — в Redux DevTools можно даже «путешествовать во времени», отматывая действия назад.
- **Тестируемость**: reducers — чистые функции, их тривиально проверять (дал вход — сверил выход).
- **Масштаб**: подходит для крупных приложений со сложным разделяемым состоянием, где многим частям нужны одни и те же данные.

**Цена**: много boilerplate (шаблонного кода — actions, reducers, effects, selectors на каждую фичу). Для простых случаев NgRx избыточен — трезво взвешивай, нужен ли он.

## ⚠️ Подводные камни

- Никогда не мутируй state в reducer напрямую (\`state.users.push(...)\`) — всегда возвращай новый объект через спред, иначе сломаешь смену обнаружения изменений и DevTools.
- Не делай HTTP-запросы и другие побочные эффекты в reducer — только в Effects; reducer обязан оставаться чистым.
- Не тащи NgRx в маленькое приложение ради «правильности» — boilerplate может перевесить пользу.

## 🎯 Запомни

- NgRx = Redux для Angular: единый store, изменения только через actions, однонаправленный поток.
- Reducers — чистые функции \`(state, action) => newState\`, они возвращают новый объект, а не мутируют старый.
- Побочные эффекты живут в Effects, не в reducers.
- Мощно и предсказуемо, но многословно — для простых приложений часто избыточно.`,
      en: `## 🧩 In plain words

Picture a warehouse with one strict logbook. Nobody can secretly grab stock off a shelf — you can only file a **request** ("release 5 boxes"), the clerk records it in the log and updates the counts. Everyone reads the same log and always sees the same, up-to-date picture. NgRx works the same way: there's one state store (**store**), and you can only change it through official requests (**actions**) processed by a strict registrar (**reducer**).

NgRx is a Redux-pattern implementation for Angular built on RxJS. Its core idea is **unidirectional data flow**: changes always travel in one direction, in a loop, with no chaotic mutations from scattered places.

### Principle

Two pillars of NgRx: **unidirectional data flow** (data travels one predictable route) and a **single source of truth** — all important state lives in one store rather than smeared across dozens of components.

### Building blocks

#### Store

A single **immutable** (never edited in place — replaced with a new version instead) state object wrapped in an Observable. Components **read** from it via selectors (functions that pick out the slice of state they need) and never change it directly.

#### Actions

Actions describe "what happened" — an event with a \`type\` field (a unique name) and an optional payload (data). Created via \`createAction\`:

\`\`\`ts
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);
\`\`\`

\`loadUsers\` is a "start loading" command with no data. \`loadUsersSuccess\` carries an array of users (\`props<{ users: User[] }>()\` describes the payload's shape). The names in brackets \`[Users]\` are the event's "source," which makes logs easier to read.

#### Reducers

A reducer is a **pure function** of the form \`(state, action) => newState\`. Pure means: given the same inputs, always the same result, with no side effects. A reducer never mutates the old state; it returns a **new** object:

\`\`\`ts
export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

\`on(action, handler)\` links a specific action to how it changes state. \`{ ...s, loading: true }\` means "a copy of the old state plus a changed field": the spread operator \`...s\` copies everything old so the original isn't mutated.

### Flow

Data travels in a one-way loop: \`Component → dispatch(action) → Reducer → new State → Selector → Component\`. \`dispatch\` means "file a request into the log." Side effects (such as HTTP requests) live not in reducers (which must stay pure) but in separate **Effects**.

### Why it matters

- **Predictability**: state changes only through actions, so it's easy to debug — Redux DevTools even lets you "time-travel," rewinding actions.
- **Testability**: reducers are pure functions, trivial to test (feed input, check output).
- **Scale**: suits large apps with complex shared state, where many parts need the same data.

**Cost**: lots of boilerplate (repetitive code — actions, reducers, effects, selectors per feature). For simple cases NgRx is overkill — soberly weigh whether you need it.

## ⚠️ Common pitfalls

- Never mutate state directly in a reducer (\`state.users.push(...)\`) — always return a new object via spread, or you'll break change detection and DevTools.
- Don't do HTTP requests or other side effects in a reducer — only in Effects; the reducer must stay pure.
- Don't drag NgRx into a small app for "correctness" — the boilerplate can outweigh the benefit.

## 🎯 Key takeaways

- NgRx = Redux for Angular: one store, changes only through actions, unidirectional flow.
- Reducers are pure functions \`(state, action) => newState\` that return a new object instead of mutating the old one.
- Side effects live in Effects, not in reducers.
- Powerful and predictable but verbose — often overkill for simple apps.`
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
      ru: `## 🧩 Простыми словами

Представь конвейер на почте. По ленте едут «команды» (actions) — например «загрузи пользователей». Reducer — это учётчик, который просто меняет цифры в журнале и не имеет права звонить по телефону или ходить наружу. Но кто-то же должен реально сходить на сервер за данными? Это и есть **Effect** — сотрудник, который слушает ленту команд, делает «грязную» работу снаружи (запрос в сеть, переход по ссылке, таймер), а потом кладёт на ленту новую команду с результатом.

### Что такое Effect

Effect — это слой для **побочных эффектов** (side effects): всё, что выходит за пределы чистого пересчёта состояния — HTTP-запросы, навигация, таймеры. «Побочный эффект» означает действие, влияющее на внешний мир, а не просто вычисление нового значения.

Effect слушает поток actions, выполняет асинхронную работу и **диспатчит (отправляет) новые actions** в результате. Благодаря этому reducer-ы остаются чистыми — они только считают новое состояние из старого и никогда не лезут наружу.

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

Разберём построчно: \`this.actions$\` — поток всех actions в приложении. \`ofType(loadUsers)\` — фильтр: пропускаем только action \`loadUsers\`. \`switchMap\` запускает HTTP-запрос. \`map\` превращает успешный ответ в action \`loadUsersSuccess\`. \`catchError\` ловит ошибку и превращает её в action \`loadUsersFailure\`. Оба этих action поедут обратно на ленту и попадут в reducer.

### Выбор оператора — критичен

Внутри Effect ты решаешь, что делать, если пришла новая команда, пока старая ещё выполняется. За это отвечает выбор оператора «высшего порядка» (он берёт входную команду и запускает вложенный поток — запрос):

- **switchMap** — отменяет предыдущий запрос при появлении нового. Хорошо для «загрузить по фильтру» (старый результат уже не нужен), но опасно для «сохранить» — недоделанные команды сохранения потеряются.
- **concatMap** — выстраивает очередь и сохраняет порядок. Лучший выбор для записей/мутаций, где важно ничего не потерять и не перепутать порядок.
- **mergeMap** — запускает всё параллельно, без гарантий порядка. Быстро, но за порядок не отвечает.
- **exhaustMap** — игнорирует новые команды, пока активна текущая. Идеально для «refresh» или «login», чтобы двойной клик не отправил два запроса.

### Обработка ошибок — обязательна

\`catchError\` должен стоять **внутри** \`switchMap\`, оборачивая именно внутренний запрос. Почему это так важно? В RxJS любой поток, поймавший ошибку, **завершается навсегда**. Если поставить \`catchError\` снаружи — на уровне \`actions$\` — то после первой же неудачной загрузки **весь effect-поток завершится** и перестанет реагировать на actions до перезагрузки страницы. А если \`catchError\` внутри, ошибка гасится только на уровне одного запроса, а внешний поток \`actions$\` продолжает жить и слушать команды.

### Тонкости

- Effect по умолчанию диспатчит то, что вернул. Если эффект ничего не должен отправлять обратно (например, просто пишет в лог или делает навигацию) — укажи \`createEffect(..., { dispatch: false })\`.
- Не диспатчь тот же action, на который слушаешь → получишь бесконечный цикл (команда рождает саму себя).
- Effects тестируются подачей на вход заранее заготовленных потоков actions («маршальные» потоки, marble-тесты).

## ⚠️ Подводные камни

- \`catchError\` снаружи \`switchMap\` = effect «умирает» после первой ошибки.
- \`switchMap\` на операциях сохранения теряет команды при быстрых кликах.
- Диспатч того же action, на который подписан, = бесконечный цикл.
- Забыл \`{ dispatch: false }\` там, где нечего диспатчить, → NgRx попытается диспатчить \`undefined\`.

## 🎯 Запомни

- Effect делает «грязную» работу (HTTP, навигация) и возвращает результат новым action, чтобы reducer оставался чистым.
- Оператор выбирают по семантике: \`switchMap\` для чтения по фильтру, \`concatMap\` для записей, \`exhaustMap\` для login/refresh.
- \`catchError\` всегда **внутри** внутреннего запроса, иначе один сбой убивает весь поток навсегда.`,
      en: `## 🧩 In plain words

Picture a conveyor belt at a post office. "Commands" (actions) ride down the belt — for example "load the users". A reducer is a clerk who only updates numbers in a ledger; it is not allowed to make phone calls or step outside. But someone has to actually go to the server for the data. That is the **Effect** — a worker who listens to the belt of commands, does the "dirty" outside work (a network request, a navigation, a timer), and then puts a new command with the result back on the belt.

### What an Effect is

An Effect is the layer for **side effects**: anything beyond pure recalculation of state — HTTP requests, navigation, timers. A "side effect" means an action that touches the outside world, not just computing a new value.

An Effect listens to the actions stream, performs async work, and **dispatches new actions** as a result. Because of this, reducers stay pure — they only compute new state from old state and never reach outside.

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

Line by line: \`this.actions$\` is the stream of every action in the app. \`ofType(loadUsers)\` is a filter that lets only the \`loadUsers\` action through. \`switchMap\` fires the HTTP request. \`map\` turns a successful response into a \`loadUsersSuccess\` action. \`catchError\` catches a failure and turns it into a \`loadUsersFailure\` action. Both of those actions ride back onto the belt and reach the reducer.

### Operator choice is critical

Inside an Effect you decide what to do when a new command arrives while an old one is still running. That is the job of the "higher-order" operator (it takes the incoming command and starts an inner stream — the request):

- **switchMap** — cancels the previous request when a new one arrives. Good for "load by filter" (the old result is no longer needed), but dangerous for "save" — unfinished save commands get lost.
- **concatMap** — forms a queue and preserves order. The best choice for writes/mutations where losing nothing and keeping order matters.
- **mergeMap** — runs everything in parallel, no ordering guarantees. Fast, but does not care about order.
- **exhaustMap** — ignores new commands while the current one is active. Ideal for "refresh" or "login" so a double click cannot fire two requests.

### Error handling is mandatory

\`catchError\` must sit **inside** \`switchMap\`, wrapping the inner request itself. Why does this matter so much? In RxJS any stream that catches an error **completes forever**. If you put \`catchError\` on the outside — at the \`actions$\` level — then after the very first failed load the **whole effect stream completes** and stops reacting to actions until a page reload. But if \`catchError\` is inside, the error is swallowed only at the level of one request, and the outer \`actions$\` stream keeps living and listening.

### Subtleties

- An Effect dispatches whatever it returns by default. If it should send nothing back (say it only logs or navigates), set \`createEffect(..., { dispatch: false })\`.
- Do not dispatch the same action you listen to → you get an infinite loop (the command gives birth to itself).
- Effects are tested by feeding in prepared action streams (marble tests).

## ⚠️ Common pitfalls

- \`catchError\` outside \`switchMap\` = the effect "dies" after the first error.
- \`switchMap\` on save operations loses commands on rapid clicks.
- Dispatching the same action you subscribe to = an infinite loop.
- Forgetting \`{ dispatch: false }\` where there is nothing to dispatch → NgRx tries to dispatch \`undefined\`.

## 🎯 Key takeaways

- An Effect does the "dirty" work (HTTP, navigation) and returns the result as a new action so the reducer stays pure.
- Pick the operator by semantics: \`switchMap\` for filtered reads, \`concatMap\` for writes, \`exhaustMap\` for login/refresh.
- \`catchError\` always goes **inside** the inner request, otherwise one failure kills the whole stream forever.`
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
      ru: `## 🧩 Простыми словами

Представь большой склад (state — всё состояние приложения). Тебе постоянно нужна не вся кладовка, а конкретная полка — например «видимые пользователи». **Селектор** — это функция-кладовщик, которая знает, где лежит нужная полка, и приносит именно её. А **мемоизация** — это записка на двери: «пока на входных полках ничего не менялось, я не бегаю пересчитывать, а отдаю то, что уже приносил в прошлый раз». Так мы не тратим силы на повторную дорогую работу.

### Что такое селектор

Селектор — это **чистая функция** (pure function — та, что при одинаковом входе всегда даёт одинаковый выход и ничего не меняет снаружи) для извлечения данных из состояния и производных вычислений над ними. Компоненты подписываются через \`store.select(selector)\` и получают только нужный им срез состояния, а не всё дерево целиком.

### createSelector и мемоизация

\`createSelector\` создаёт **мемоизированный** селектор. Мемоизация — это кэширование результата, чтобы не пересчитывать одно и то же. Селектор состоит из двух частей: входных селекторов (откуда брать данные) и projector-функции (что из этих данных вычислить).

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

Здесь \`selectUsers\` и \`selectFilter\` — входы (достают список и строку фильтра), а последняя функция — projector, который фильтрует список по подстроке.

### Как работает мемоизация

- Селектор запоминает **последний результат** и **последние входные значения**.
- При новом вызове он сравнивает входы **по ссылке** (оператор \`===\`, то есть «это тот же самый объект в памяти?»).
- Если входы не изменились — возвращает **закэшированный** результат, вообще не запуская projector.
- Это критично: projector (фильтрация, сортировка) может быть дорогим, а \`store.select\` эмитит (выдаёт новое значение) на **каждое** изменение состояния — даже если менялась совсем другая часть склада.

### Композиция

Селекторы **компонуются**: результат одного селектора можно подать на вход другому. Так строится граф зависимостей, где кэши переиспользуются — если базовый селектор вернул старый результат, зависимый от него тоже не будет пересчитываться.

## ⚠️ Подводные камни

- Мемоизация сравнивает по ссылке. Если projector создаёт новый объект, но входы не менялись — кэш всё равно сработает, projector не запустится, всё хорошо. Но если какой-то вход — **новый объект при каждом вызове** (нарушена иммутабельность, объект пересоздаётся зря), кэш становится бесполезным и projector крутится каждый раз.
- Кэш хранит только **один** последний результат. Для параметризованных селекторов (один и тот же селектор с разными аргументами, например «пользователь по id») используют фабрики — функцию, которая создаёт \`createSelector\` под конкретный аргумент, или передачу \`props\`.
- \`store.select\` сам применяет \`distinctUntilChanged\` — отсекает подряд идущие дубликаты по ссылке, поэтому компонент не будет дёргаться, если срез не изменился.

## 🎯 Запомни

- Селектор — чистая функция, которая достаёт нужный срез состояния; компоненты подписываются на него, а не на всё состояние.
- \`createSelector\` кэширует результат и пересчитывает projector только когда входы поменялись **по ссылке**.
- Мемоизация работает лишь при честной иммутабельности: не пересоздавай неизменившиеся объекты, иначе кэш бесполезен.`,
      en: `## 🧩 In plain words

Picture a big warehouse (state — your whole app's data). You rarely need the entire warehouse, just one specific shelf — say "visible users". A **selector** is a clerk function that knows where that shelf is and brings back exactly that. And **memoization** is a note on the door: "as long as nothing on the source shelves changed, I won't run off to recompute — I'll hand you what I brought last time." That way we don't waste effort redoing expensive work.

### What a selector is

A selector is a **pure function** (a function that, given the same input, always returns the same output and changes nothing outside) for extracting values from state and deriving new ones. Components subscribe via \`store.select(selector)\` and receive only the slice they need, not the whole tree.

### createSelector and memoization

\`createSelector\` builds a **memoized** selector. Memoization means caching the result so you don't recompute the same thing. A selector has two parts: input selectors (where to get the data) and a projector function (what to compute from that data).

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

Here \`selectUsers\` and \`selectFilter\` are the inputs (they pull the list and the filter string), and the last function is the projector, which filters the list by substring.

### How memoization works

- The selector remembers the **last result** and the **last input values**.
- On a new call it compares the inputs **by reference** (the \`===\` operator, i.e. "is this the very same object in memory?").
- If the inputs are unchanged it returns the **cached** result without running the projector at all.
- This is critical: the projector (filtering, sorting) can be expensive, while \`store.select\` emits (produces a new value) on **every** state change — even when a completely different part of the warehouse changed.

### Composition

Selectors **compose**: the result of one selector can be an input to another. This builds a dependency graph where caches are reused — if a base selector returns its old result, everything depending on it also skips recomputation.

## ⚠️ Common pitfalls

- Memoization compares by reference. If the projector creates a new object but the inputs did not change, the cache still works, the projector does not run, all good. But if some input is a **new object on every call** (immutability is broken, the object is recreated needlessly), the cache becomes useless and the projector runs every time.
- The cache holds only **one** last result. For parameterized selectors (the same selector with different arguments, e.g. "user by id") use factories — a function that builds a \`createSelector\` for a specific argument — or pass \`props\`.
- \`store.select\` itself applies \`distinctUntilChanged\` — it drops consecutive reference-equal duplicates, so a component won't churn if the slice didn't actually change.

## 🎯 Key takeaways

- A selector is a pure function that pulls out the slice of state you need; components subscribe to it, not to the whole state.
- \`createSelector\` caches the result and re-runs the projector only when inputs change **by reference**.
- Memoization only works with honest immutability: don't recreate unchanged objects, or the cache is worthless.`
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
      ru: `## 🧩 Простыми словами

Представь, что данные о пользователях лежат кучей карточек в коробке (массив). Чтобы найти нужного человека по номеру, ты перебираешь карточки одну за другой. А теперь представь картотеку с ящичками, подписанными по id: подошёл к нужному ящику и сразу достал карточку — не перебирая всё. Это и есть **нормализация**: хранить сущности не списком, а словарём «id → объект». **Entity Adapter** из NgRx — это готовая картотека с инструментами: добавить, обновить, удалить карточку правильно и без лишнего кода.

### Проблема денормализованного состояния

Хранить коллекции как массивы объектов неудобно: поиск или обновление по id требует перебора всего массива, а если одни и те же данные лежат в нескольких местах — они рассинхронизируются (в одном месте обновил, в другом забыл). **Нормализация** решает это: сущности хранятся как словарь по id, а данные не дублируются.

### Entity Adapter

\`@ngrx/entity\` предоставляет \`createEntityAdapter\`, который управляет коллекцией в форме \`EntityState\`:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // порядок
  entities: { [id: string]: T };   // словарь по id
}
\`\`\`

Здесь \`entities\` — та самая картотека (быстрый доступ по id), а \`ids\` — отдельный список, хранящий **порядок** элементов (в словаре порядка нет, поэтому его держат отдельно).

### Что даёт

Готовые **immutable**-операции для reducer-ов. «Immutable» значит: метод не меняет старое состояние, а возвращает новое — это обязательное правило NgRx.

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

\`selectId\` говорит адаптеру, какое поле считать ключом. \`sortComparer\` задаёт порядок сортировки. Дальше методы \`addOne\`, \`updateOne\`, \`setAll\` делают всю работу с картотекой за тебя, возвращая новое состояние. Есть и другие: \`addMany\`, \`upsertOne\` (добавить или обновить), \`removeOne\` и т.д.

### Готовые селекторы

\`\`\`ts
const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

Адаптер сам отдаёт селекторы: \`selectAll\` — массив всех сущностей, \`selectEntities\` — словарь, \`selectIds\` — список id, \`selectTotal\` — количество.

## ⚠️ Подводные камни

- Не забудь \`selectId\`, если id хранится не в поле \`id\`, а, например, в \`userId\` — иначе адаптер не найдёт ключ.
- \`sortComparer\` влияет на порядок в \`selectAll\` и \`ids\`; если сортировка не нужна, можно передать \`false\` — так быстрее.
- \`updateOne\` ждёт объект вида \`{ id, changes }\`, а не целую сущность — это частая ошибка.

## 🎯 Запомни

- Нормализация = хранить сущности словарём по id, а порядок — отдельным массивом \`ids\`. Доступ по id становится **O(1)**.
- Entity Adapter даёт готовые иммутабельные CRUD-методы (\`addOne\`, \`updateOne\`, \`setAll\`…) и готовые селекторы (\`selectAll\` и др.).
- Меньше boilerplate и корректная иммутабельность «из коробки» → мемоизация селекторов работает как надо.`,
      en: `## 🧩 In plain words

Imagine user data sitting as a pile of cards in a box (an array). To find one person by number you flip through the cards one by one. Now imagine a filing cabinet with little drawers labeled by id: walk to the right drawer and pull the card instantly, no flipping. That is **normalization**: store entities not as a list but as a dictionary of "id → object". The **Entity Adapter** in NgRx is a ready-made filing cabinet with tools: add, update, and remove a card correctly and with no extra code.

### The problem with denormalized state

Storing collections as arrays of objects is awkward: lookup or update by id requires iterating the whole array, and if the same data lives in several places it drifts out of sync (updated here, forgotten there). **Normalization** fixes this: entities are stored as a dictionary keyed by id, with no duplication.

### Entity Adapter

\`@ngrx/entity\` provides \`createEntityAdapter\`, which manages a collection in \`EntityState\` form:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // order
  entities: { [id: string]: T };   // dictionary by id
}
\`\`\`

Here \`entities\` is that filing cabinet (fast access by id), and \`ids\` is a separate list that keeps the **order** of items (a dictionary has no order, so it is tracked separately).

### What it provides

Ready-made **immutable** operations for reducers. "Immutable" means the method does not mutate the old state but returns a new one — a mandatory NgRx rule.

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

\`selectId\` tells the adapter which field is the key. \`sortComparer\` sets the sort order. Then \`addOne\`, \`updateOne\`, \`setAll\` do all the cabinet work for you, returning new state. There are more: \`addMany\`, \`upsertOne\` (add or update), \`removeOne\`, and so on.

### Ready-made selectors

\`\`\`ts
const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

The adapter hands you selectors: \`selectAll\` — an array of all entities, \`selectEntities\` — the dictionary, \`selectIds\` — the id list, \`selectTotal\` — the count.

## ⚠️ Common pitfalls

- Don't forget \`selectId\` if the id lives in a field other than \`id\` (say \`userId\`), or the adapter can't find the key.
- \`sortComparer\` affects the order in \`selectAll\` and \`ids\`; if you don't need sorting you can pass \`false\` for speed.
- \`updateOne\` expects an object of the form \`{ id, changes }\`, not a whole entity — a common mistake.

## 🎯 Key takeaways

- Normalization = store entities as a dictionary by id, with order in a separate \`ids\` array. Access by id becomes **O(1)**.
- The Entity Adapter gives ready-made immutable CRUD methods (\`addOne\`, \`updateOne\`, \`setAll\`…) and ready-made selectors (\`selectAll\`, etc.).
- Less boilerplate and correct immutability out of the box → selector memoization works as intended.`
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
      ru: `## 🧩 Простыми словами

Раньше, чтобы подключить кусочек состояния в NgRx, приходилось вручную писать много однотипных бумажек: назвать «фичу», зарегистрировать reducer, отдельно описать селектор на всю фичу и по селектору на каждое поле. Скучно и легко ошибиться. **createFeature** — это как готовый набор «всё в одном»: ты один раз описываешь имя и reducer, а он сам генерирует все базовые селекторы. Меньше файлов, меньше ручной писанины.

### Проблема

Классический NgRx требует вручную: объявить feature key (имя-ключ фичи), зарегистрировать reducer, написать \`createFeatureSelector\` (селектор, достающий всю ветку фичи из state) и кучу \`createSelector\` для каждого отдельного среза. Много повторяющегося кода (boilerplate — шаблонный код, который приходится писать снова и снова).

### createFeature

\`createFeature\` объединяет имя и reducer в один объект и автоматически генерирует селекторы для каждого поля состояния:

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

Обрати внимание: ты нигде не писал \`selectUsers\` и \`selectLoading\` руками — \`createFeature\` создал их сам, по одному на каждое поле состояния (\`users\`, \`loading\`).

### Что даёт

- Авто-генерация \`selectFeatureState\` (селектор всей фичи) и селектора **на каждое свойство** состояния.
- Не нужно вручную писать feature selector и базовые селекторы полей.
- Простая регистрация: \`provideState(usersFeature)\` — одной строкой, без отдельных строк для ключа и reducer-а.

### extraSelectors

Производные (вычисляемые) селекторы добавляются через \`extraSelectors\`, причём в качестве входов можно брать те самые авто-сгенерированные селекторы:

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

Здесь \`selectVisibleUsers\` собирается из уже готовых \`selectUsers\` и \`selectFilter\` — не нужно заново описывать, откуда брать эти данные.

### Итог

\`createFeature\` — это «standalone-эра» NgRx (эпоха standalone-компонентов Angular, без NgModule): меньше файлов, меньше ручных селекторов, всё связано в одном объекте. Хорошо сочетается с \`provideStore\`/\`provideState\` в standalone-приложениях.

## ⚠️ Подводные камни

- Авто-селекторы называются по именам полей состояния: переименовал поле — переименовался и селектор. Учитывай при рефакторинге.
- Сложную логику не пихай в reducer; производные вычисления — место для \`extraSelectors\`, а не для дублирования данных в state.

## 🎯 Запомни

- \`createFeature\` объединяет имя + reducer и авто-генерирует \`selectFeatureState\` и селектор на каждое поле — меньше boilerplate.
- Производные селекторы добавляй через \`extraSelectors\`, переиспользуя авто-сгенерированные как входы.
- Регистрируется одной строкой \`provideState(feature)\` — идеально для standalone-приложений.`,
      en: `## 🧩 In plain words

Wiring a slice of state into NgRx used to mean filling out a lot of repetitive paperwork by hand: name the "feature", register the reducer, write a selector for the whole feature, and one selector per field. Tedious and easy to get wrong. **createFeature** is like an all-in-one kit: you describe the name and reducer once, and it generates all the basic selectors for you. Fewer files, less hand-writing.

### The problem

Classic NgRx requires you to manually declare a feature key (the feature's name/key), register the reducer, write \`createFeatureSelector\` (a selector that pulls the whole feature branch out of state), and a pile of \`createSelector\` for each individual slice. Lots of boilerplate (boilerplate = template code you write over and over).

### createFeature

\`createFeature\` bundles the name and reducer into one object and auto-generates selectors for every state field:

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

Notice you never wrote \`selectUsers\` or \`selectLoading\` by hand — \`createFeature\` created them for you, one per state field (\`users\`, \`loading\`).

### What it provides

- Auto-generation of \`selectFeatureState\` (a selector for the whole feature) and a selector **for each state property**.
- No need to hand-write the feature selector and the basic field selectors.
- Simple registration: \`provideState(usersFeature)\` — one line, without separate lines for the key and the reducer.

### extraSelectors

Derived (computed) selectors are added via \`extraSelectors\`, and you can feed the auto-generated selectors in as inputs:

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

Here \`selectVisibleUsers\` is built from the already-made \`selectUsers\` and \`selectFilter\` — no need to re-describe where that data comes from.

### Bottom line

\`createFeature\` is the "standalone era" of NgRx (the age of Angular standalone components, no NgModule): fewer files, fewer manual selectors, everything tied together in one object. It pairs well with \`provideStore\`/\`provideState\` in standalone apps.

## ⚠️ Common pitfalls

- Auto-selectors are named after the state field names: rename a field and the selector name changes too. Keep this in mind when refactoring.
- Don't stuff complex logic into the reducer; derived computations belong in \`extraSelectors\`, not in duplicated data inside state.

## 🎯 Key takeaways

- \`createFeature\` bundles name + reducer and auto-generates \`selectFeatureState\` plus a selector per field — less boilerplate.
- Add derived selectors via \`extraSelectors\`, reusing the auto-generated ones as inputs.
- It registers with a single \`provideState(feature)\` line — ideal for standalone apps.`
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
      ru: `## 🧩 Простыми словами

Представь, что классический NgRx Store — это большая почтовая система: чтобы что-то изменить, ты пишешь письмо (action), его сортируют (reducer), а побочные дела (запросы к серверу) обрабатывает отдельная служба (effects). Работает надёжно, но бумажной волокиты много.

\`@ngrx/signals\` SignalStore — это то же хранилище состояния, но собранное из простых кубиков (functions) вокруг Angular **Signals**. Signal — это «умная ячейка» со значением, которую читаешь как функцию: \`store.users()\`. Меняешь состояние напрямую одной командой, без писем и служб. Меньше церемоний, больше дела.

### Что такое Signal (коротко)

Signal — это контейнер со значением, который сам запоминает, кто его читает. Когда значение меняется, все, кто от него зависит (шаблон, вычисления), обновляются автоматически. Читается синхронно, вызовом как функции: \`count()\`.

### Как выглядит signalStore

Store собирается из «фич» (features) — маленьких функций, каждая добавляет свой кусочек: состояние, вычисления, методы.

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

Здесь \`withState\` задаёт начальные данные, \`withComputed\` — производные значения, \`withMethods\` — действия (в том числе асинхронные). \`patchState\` обновляет часть состояния — как \`Object.assign\`, но для store.

### Чем отличается от классического Store

- **Состояние — это Signals**, а не Observable. Доступ синхронный: \`store.users()\`. Вложенные срезы тоже становятся signals.
- **Нет обязательной церемонии** actions/reducers/effects. Изменения — через \`patchState\`. По духу это ближе к обычному сервису-фасаду.
- **Computed** через \`withComputed\` — мемоизированные (кэшируемые) производные, как селекторы, но на signals.
- **Методы** держат логику (включая async) прямо внутри store, а не в отдельном effects-файле.

### Расширяемость

- \`withEntities\` — аналог Entity Adapter для signals: удобная работа со списками сущностей по id.
- \`rxMethod\` — мост к RxJS: метод принимает Observable или значение, а внутри можно применить \`switchMap\` и другие операторы для асинхронных эффектов с отменой предыдущего запроса.
- Кастомные фичи (\`signalStoreFeature\`) — переиспользуемые «миксины» поведения, которые можно вставлять в разные store.

## ⚠️ Подводные камни

- Отсутствие строгих actions означает и отсутствие бесплатной «истории действий» — time-travel отладка и аудит здесь не из коробки.
- \`patchState\` не делает глубокого слияния: он заменяет указанные поля верхнего уровня, вложенные объекты нужно обновлять целиком.
- Signals синхронны: для сложной асинхронности (debounce, отмена) всё равно нужен RxJS через \`rxMethod\`.

## 🎯 Запомни

- SignalStore — функциональный, композируемый store на Signals с минимумом boilerplate.
- Состояние читается синхронно (\`store.x()\`), меняется через \`patchState\`, без actions/reducers/effects.
- Бери его для локального и feature-состояния; классический Store — для очень крупных приложений со строгим аудитом действий и time-travel.`,
      en: `## 🧩 In plain words

Think of the classic NgRx Store as a big postal system: to change anything you write a letter (an action), a sorting office processes it (a reducer), and side jobs like server calls are handled by a separate department (effects). Reliable, but lots of paperwork.

\`@ngrx/signals\` SignalStore is the same kind of state container, but built from simple building blocks (functions) around Angular **Signals**. A signal is a "smart cell" holding a value that you read by calling it like a function: \`store.users()\`. You change state directly with one command — no letters, no separate department. Less ceremony, more work done.

### What a Signal is (quickly)

A signal is a container for a value that remembers who reads it. When the value changes, everything that depends on it (the template, computed values) updates automatically. It is read synchronously, by calling it: \`count()\`.

### What signalStore looks like

The store is assembled from "features" — small functions, each adding a piece: state, computed values, methods.

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

Here \`withState\` sets the initial data, \`withComputed\` defines derived values, and \`withMethods\` holds actions (including async ones). \`patchState\` updates part of the state — like \`Object.assign\`, but for the store.

### Differences from the classic Store

- **State is Signals**, not Observables. Access is synchronous: \`store.users()\`. Nested slices also become signals.
- **No mandatory** actions/reducers/effects ceremony. Changes go through \`patchState\`. In spirit it is closer to a plain facade service.
- **Computed** via \`withComputed\` — memoized (cached) derivations, like selectors but on signals.
- **Methods** keep logic (including async) right inside the store, not in a separate effects file.

### Extensibility

- \`withEntities\` — the Entity Adapter equivalent for signals: convenient handling of entity lists keyed by id.
- \`rxMethod\` — a bridge to RxJS: a method takes an Observable or a value, and inside you can use \`switchMap\` and other operators for async effects that cancel the previous request.
- Custom features (\`signalStoreFeature\`) — reusable behavior "mixins" you can plug into different stores.

## ⚠️ Common pitfalls

- No strict actions means no free "action history" — time-travel debugging and auditing are not built in here.
- \`patchState\` does not deep-merge: it replaces the named top-level fields, so nested objects must be updated as a whole.
- Signals are synchronous: for complex async work (debounce, cancellation) you still need RxJS via \`rxMethod\`.

## 🎯 Key takeaways

- SignalStore is a functional, composable store on Signals with minimal boilerplate.
- State is read synchronously (\`store.x()\`) and changed via \`patchState\`, without actions/reducers/effects.
- Reach for it for local and feature state; the classic Store fits very large apps needing strict action auditing and time-travel.`
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
      ru: `## 🧩 Простыми словами

Представь администратора отеля на ресепшене. Ты не бегаешь сам на кухню, в прачечную и к охране — ты говоришь администратору: «завтрак в номер», а он уже сам разбирается, кому позвонить. Facade в NgRx — это такой администратор: сервис-обёртка, за которой спрятаны все детали store, actions и selectors. Компонент общается только с фасадом простыми словами (\`load\`, \`add\`), а не с внутренней «кухней» NgRx.

### Что это

Facade — это сервис, скрывающий детали NgRx (store, actions, selectors) за простым API. Термины по-быстрому: **store** — хранилище состояния; **action** — «команда-письмо» об изменении; **selector** — функция для чтения куска состояния. Компоненты работают с фасадом, а не напрямую со store.

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

Фасад выставляет наружу потоки данных (\`users$\`, \`loading$\`) и понятные методы-команды (\`load\`, \`add\`), пряча за ними \`select\` и \`dispatch\`.

Компонент при этом остаётся простым:

\`\`\`ts
facade.load();
// в шаблоне: {{ facade.users$ | async }}
\`\`\`

### Плюсы

- **Инкапсуляция**: компонент ничего не знает про actions/selectors, его проще тестировать (мокаем один фасад).
- **Меньше связности**: можно сменить реализацию (NgRx → SignalStore) без правки компонентов.
- **Читаемость**: компонент описывает намерения (\`load\`, \`add\`), а не механику.
- Единая точка для view-моделей — можно объединить несколько селекторов в один удобный поток.

### Минусы

- **Лишний слой**: ещё один файл, особенно если фасад просто проксирует вызовы один-в-один.
- Риск превратить фасад в «god service» — огромный сервис, куда свалено всё подряд.
- Скрывает явность потока actions: некоторые команды считают это анти-паттерном для Redux, потому что теряется «трассируемость» — из компонента уже не видно, какой именно action был отправлен.

## ⚠️ Подводные камни

- Не добавляй фасад «на всякий случай» в мелкую фичу — он себя не окупит.
- Один фасад на один feature-модуль; не делай общий фасад на всё приложение.
- Держи фасад тонким: только выборки и команды, без бизнес-логики, которой место в эффектах/редьюсерах.

## 🎯 Запомни

- Facade — сервис-обёртка над NgRx с простым API из выборок и команд.
- Плюсы: инкапсуляция, слабая связность, читаемые компоненты; минусы: лишний слой и потеря явности actions.
- Оправдан в крупных feature-модулях с многими компонентами; для маленьких фич избыточен.`,
      en: `## 🧩 In plain words

Picture a hotel front-desk clerk. You don't run to the kitchen, laundry, and security yourself — you tell the clerk "breakfast to my room," and they figure out who to call. A facade in NgRx is that clerk: a service wrapper that hides all the store, actions, and selectors details. The component talks to the facade in plain words (\`load\`, \`add\`), never touching the NgRx "kitchen" inside.

### What it is

A facade is a service that hides NgRx details (store, actions, selectors) behind a simple API. Quick glossary: the **store** holds state; an **action** is a "command letter" describing a change; a **selector** is a function that reads a slice of state. Components work with the facade, not directly with the store.

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

The facade exposes data streams (\`users$\`, \`loading$\`) and clear command methods (\`load\`, \`add\`), hiding \`select\` and \`dispatch\` behind them.

The component then stays simple:

\`\`\`ts
facade.load();
// template: {{ facade.users$ | async }}
\`\`\`

### Pros

- **Encapsulation**: the component knows nothing about actions/selectors, so it is easier to test (mock one facade).
- **Lower coupling**: you can swap the implementation (NgRx → SignalStore) without touching components.
- **Readability**: the component expresses intent (\`load\`, \`add\`), not mechanics.
- A single place for view-models — you can combine several selectors into one convenient stream.

### Cons

- **Extra layer**: another file, especially if the facade just proxies calls one-to-one.
- Risk of turning the facade into a "god service" — a huge service where everything gets dumped.
- Hides the explicitness of the action stream: some teams call this a Redux anti-pattern because you lose "traceability" — from the component you can no longer see which exact action was dispatched.

## ⚠️ Common pitfalls

- Don't add a facade "just in case" to a tiny feature — it won't pay for itself.
- One facade per feature module; don't build a single facade for the whole app.
- Keep the facade thin: only selections and commands, no business logic that belongs in effects/reducers.

## 🎯 Key takeaways

- A facade is a service wrapper over NgRx with a simple API of selections and commands.
- Pros: encapsulation, low coupling, readable components; cons: an extra layer and lost action explicitness.
- Worth it in large feature modules with many components; overkill for small features.`
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
      ru: `## 🧩 Простыми словами

NgRx любит порядок как строгая бухгалтерия: отдельно бланки (actions), отдельно правила проводок (reducers), отдельно отдел внешних дел (effects) — много папок, зато всё прозрачно. NGXS смотрит на ту же задачу по-другому: он собирает данные и их обработчики в один класс, в привычном Angular-стиле с декораторами и внедрением зависимостей. Меньше файлов, ближе к обычному сервису. Под капотом обе библиотеки всё равно используют RxJS.

### Философия NGXS

NGXS — альтернативный state-менеджмент, нацеленный на **меньше boilerplate** (шаблонного кода) и более «ангуляровский», объектно-ориентированный стиль: классы, декораторы, DI (dependency injection — механизм, которым Angular сам подаёт зависимости в конструктор).

### State

Состояние — это класс с декоратором \`@State\`, который объединяет данные и обработчики действий в одном месте:

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

Здесь \`defaults\` — начальное состояние, а \`ctx\` (StateContext) даёт \`patchState\`/\`setState\` для обновления. \`patchState\` меняет часть полей, \`setState\` заменяет состояние целиком.

### Actions

Actions — это классы с полезной нагрузкой (payload). Отправляются через \`store.dispatch(new LoadUsers())\`. Ключевое отличие: обработчик действия живёт **в том же state-классе** (метод с \`@Action\`), а не в отдельном effects-файле.

### Selectors

\`@Selector()\` создаёт мемоизированный (кэширующий результат) селектор как метод класса — способ «вытащить» и переработать кусок состояния для компонентов:

\`\`\`ts
@Selector()
static activeUsers(state: UsersStateModel) {
  return state.list.filter(u => u.active);
}
\`\`\`

### Отличия от NgRx

- **Меньше файлов**: нет разделения на reducer/effect/selector — всё лежит в одном state-классе.
- **Императивнее**: \`patchState\`/\`setState\` вместо чистых reducer-функций.
- **Async прямо в \`@Action\`**: можно вернуть Observable или Promise из обработчика — встроенная замена effects.
- NgRx строже следует Redux (чистые функции, явные actions), что лучше для очень крупных команд и аудита; NGXS быстрее в разработке для средних проектов.

## ⚠️ Подводные камни

- Свобода \`patchState\` соблазняет размазать логику по методам — держи обработчики маленькими и предсказуемыми.
- «Всё в одном классе» удобно, пока state-класс не разросся; крупные состояния всё равно стоит дробить.
- Императивные мутации сложнее отслеживать, чем явный поток actions в NgRx — для строгого аудита это минус.

## 🎯 Запомни

- NGXS: state, actions и selectors собраны в классах с декораторами, обработчики \`@Action\` живут рядом с данными.
- Async возвращается прямо из \`@Action\` — отдельные effects не нужны.
- NGXS — меньше boilerplate и быстрее для средних проектов; NgRx строже и лучше для очень крупных с аудитом.`,
      en: `## 🧩 In plain words

NgRx loves order like strict accounting: separate forms (actions), separate posting rules (reducers), a separate external-affairs department (effects) — many folders, but everything is transparent. NGXS approaches the same job differently: it bundles the data and its handlers into one class, in the familiar Angular style with decorators and dependency injection. Fewer files, closer to a plain service. Under the hood both libraries still use RxJS.

### NGXS philosophy

NGXS is an alternative state manager aimed at **less boilerplate** (repetitive template code) and a more "Angular-ish", object-oriented style: classes, decorators, DI (dependency injection — the mechanism by which Angular supplies dependencies to a constructor).

### State

State is a class with a \`@State\` decorator that bundles data and action handlers in one place:

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

Here \`defaults\` is the initial state, and \`ctx\` (StateContext) provides \`patchState\`/\`setState\` for updates. \`patchState\` changes some fields, \`setState\` replaces the whole state.

### Actions

Actions are classes carrying a payload. They are dispatched via \`store.dispatch(new LoadUsers())\`. A key difference: the action handler lives **in the same state class** (a method with \`@Action\`), not in a separate effects file.

### Selectors

\`@Selector()\` creates a memoized (result-caching) selector as a class method — a way to "pull out" and reshape a slice of state for components:

\`\`\`ts
@Selector()
static activeUsers(state: UsersStateModel) {
  return state.list.filter(u => u.active);
}
\`\`\`

### Differences from NgRx

- **Fewer files**: no split into reducer/effect/selector — everything sits in one state class.
- **More imperative**: \`patchState\`/\`setState\` instead of pure reducer functions.
- **Async right in \`@Action\`**: you can return an Observable or Promise from a handler — a built-in effects replacement.
- NgRx follows Redux more strictly (pure functions, explicit actions), which is better for very large teams and auditing; NGXS is faster to develop with for medium projects.

## ⚠️ Common pitfalls

- The freedom of \`patchState\` tempts you to smear logic across methods — keep handlers small and predictable.
- "Everything in one class" is convenient until the state class grows huge; large states should still be split up.
- Imperative mutations are harder to trace than NgRx's explicit action stream — a downside for strict auditing.

## 🎯 Key takeaways

- NGXS: state, actions, and selectors are gathered in decorated classes, and \`@Action\` handlers live next to the data.
- Async is returned straight from \`@Action\` — no separate effects needed.
- NGXS means less boilerplate and faster work for medium projects; NgRx is stricter and better for very large, audit-heavy apps.`
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
      ru: `## 🧩 Простыми словами

Представь два способа узнавать погоду. Первый — радио, которое весь день бубнит новости по мере событий: включил, слушаешь поток (это **RxJS**). Второй — табло на стене, где всегда висит текущая температура: посмотрел — увидел значение прямо сейчас (это **Signals**). Оба полезны, и иногда нужно связать одно с другим: превратить радиопоток в табло или наоборот. Именно это делают \`toSignal\` и \`toObservable\`.

### Две модели реактивности

- **RxJS** — push-поток событий во времени: значения «приходят» сами, есть операторы и отмена. Идеален для асинхронных событий (HTTP, WebSocket, debounce). «Push» значит, что источник сам проталкивает значения подписчику.
- **Signals** — синхронные значения с автоматическим отслеживанием зависимостей. Идеальны для состояния UI и шаблонов: читаешь как функцию, всё зависящее обновляется само.

Пакет \`@angular/core/rxjs-interop\` даёт мосты между этими мирами.

### toSignal — из Observable в Signal

Берёт Observable и превращает его в signal, хранящий последнее пришедшее значение:

\`\`\`ts
import { toSignal } from '@angular/core/rxjs-interop';

readonly user = toSignal(this.userService.user$, { initialValue: null });
// в шаблоне: {{ user()?.name }}
\`\`\`

- Подписывается на Observable и держит последнее значение как signal.
- **Автоматически отписывается** при уничтожении компонента (внутри injection context) — утечек нет.
- Требует \`initialValue\` (значение до первой эмиссии) или \`requireSync: true\` — для источников, которые выдают значение сразу, вроде \`BehaviorSubject\`.

### toObservable — из Signal в Observable

Берёт signal и превращает его в поток, чтобы дальше применить операторы RxJS:

\`\`\`ts
import { toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');
readonly results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
);
\`\`\`

- Под капотом использует \`effect\` (реакцию на изменения signal), чтобы отслеживать значение и эмитить его в Observable.
- Эмиссии происходят **асинхронно**, на эффект-тик, а не синхронно при каждом \`set\`. То есть несколько быстрых изменений подряд могут «схлопнуться» до последнего.

### Когда что использовать

- Состояние, которое читается в шаблоне → Signal (или \`toSignal\` на конце потока).
- Сложная асинхронная логика (debounce, switchMap, retry) → RxJS, а затем \`toSignal\` для удобного потребления в шаблоне.
- \`toObservable\` → когда нужно подать signal на вход RxJS-конвейера (как \`query\` выше).

## ⚠️ Подводные камни

- Забыл \`initialValue\` без \`requireSync\` — TypeScript будет считать тип \`T | undefined\`, и в шаблоне придётся защищаться от \`undefined\`.
- \`requireSync: true\` бросит ошибку, если источник не выдаёт значение синхронно, — используй его только с \`BehaviorSubject\`-подобными.
- \`toObservable\` эмитит асинхронно: не рассчитывай получить значение прямо в той же строке после \`set\`.
- Оба моста должны создаваться в injection context (поле класса/конструктор), иначе автоотписка не сработает.

## 🎯 Запомни

- RxJS — поток событий во времени; Signals — синхронное текущее значение с авто-зависимостями.
- \`toSignal(obs$)\` — Observable → Signal, сам подписывается и отписывается; нужен \`initialValue\` или \`requireSync\`.
- \`toObservable(sig)\` — Signal → Observable (через \`effect\`), эмитит асинхронно; удобно подать signal в RxJS-конвейер.`,
      en: `## 🧩 In plain words

Picture two ways to learn the weather. The first is a radio droning news all day as things happen: switch it on and listen to the stream (that's **RxJS**). The second is a board on the wall always showing the current temperature: glance at it and see the value right now (that's **Signals**). Both are useful, and sometimes you need to connect one to the other — turn the radio stream into a board, or vice versa. That is exactly what \`toSignal\` and \`toObservable\` do.

### Two reactivity models

- **RxJS** — a push stream of events over time: values "arrive" on their own, with operators and cancellation. Ideal for async events (HTTP, WebSocket, debounce). "Push" means the source pushes values to the subscriber.
- **Signals** — synchronous values with automatic dependency tracking. Ideal for UI state and templates: read one like a function, and everything depending on it updates by itself.

The \`@angular/core/rxjs-interop\` package provides bridges between these worlds.

### toSignal — Observable to Signal

Takes an Observable and turns it into a signal that holds the latest emitted value:

\`\`\`ts
import { toSignal } from '@angular/core/rxjs-interop';

readonly user = toSignal(this.userService.user$, { initialValue: null });
// in template: {{ user()?.name }}
\`\`\`

- Subscribes to the Observable and keeps the latest value as a signal.
- **Automatically unsubscribes** when the component is destroyed (inside an injection context) — no leaks.
- Requires \`initialValue\` (the value before the first emission) or \`requireSync: true\` — for sources that emit immediately, like a \`BehaviorSubject\`.

### toObservable — Signal to Observable

Takes a signal and turns it into a stream so you can apply RxJS operators:

\`\`\`ts
import { toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');
readonly results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q))
);
\`\`\`

- Under the hood it uses an \`effect\` (a reaction to signal changes) to track the value and emit it into the Observable.
- Emissions happen **asynchronously**, on the effect tick, not synchronously on every \`set\`. So several rapid changes in a row may "collapse" to the last one.

### When to use which

- State read in the template → Signal (or \`toSignal\` at the end of a stream).
- Complex async logic (debounce, switchMap, retry) → RxJS, then \`toSignal\` for convenient consumption in the template.
- \`toObservable\` → when you need to feed a signal into an RxJS pipeline input (like \`query\` above).

## ⚠️ Common pitfalls

- Forget \`initialValue\` without \`requireSync\` and TypeScript treats the type as \`T | undefined\`, forcing you to guard against \`undefined\` in the template.
- \`requireSync: true\` throws if the source doesn't emit synchronously — use it only with \`BehaviorSubject\`-like sources.
- \`toObservable\` emits asynchronously: don't expect to read the value on the very next line after \`set\`.
- Both bridges must be created in an injection context (class field/constructor), or auto-unsubscribe won't work.

## 🎯 Key takeaways

- RxJS is a stream of events over time; Signals are a synchronous current value with automatic dependencies.
- \`toSignal(obs$)\` — Observable → Signal, subscribes and unsubscribes itself; needs \`initialValue\` or \`requireSync\`.
- \`toObservable(sig)\` — Signal → Observable (via \`effect\`), emits asynchronously; handy for feeding a signal into an RxJS pipeline.`
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
      ru: `## 🧩 Простыми словами

Когда вы подписываетесь на поток данных (Observable), эту подписку нужно потом «закрыть» — иначе она продолжит работать даже после того, как компонент исчез с экрана, и это утечка памяти. Раньше приходилось вручную заводить специальный «выключатель», нажимать его при уничтожении компонента и следить, чтобы всё было подключено правильно. \`takeUntilDestroyed\` — это готовый «автовыключатель»: он сам замечает, что компонент уничтожается, и обрывает подписку. Меньше рутины, меньше шансов ошибиться.

### Что это такое

\`takeUntilDestroyed\` — это оператор RxJS из пакета \`@angular/core/rxjs-interop\` (появился в Angular 16+). Оператор — это функция, которую вставляют в \`.pipe(...)\`, чтобы изменить поведение потока. Этот конкретный оператор автоматически **отписывает** поток (прекращает получать из него значения), когда уничтожается компонент, директива или сервис, которому он принадлежит. Делает он это, опираясь на \`DestroyRef\` — служебный объект Angular, который умеет сообщать «этот владелец уничтожается прямо сейчас».

### Два режима работы

**Внутри injection context** (в конструкторе или при инициализации поля класса) оператор сам достаёт \`DestroyRef\` из окружения — ничего передавать не нужно:

\`\`\`ts
export class MyComponent {
  data$ = this.service.stream$.pipe(
    takeUntilDestroyed() // DestroyRef берётся из контекста инъекции
  );
}
\`\`\`

Injection context — это те моменты, когда Angular «конструирует» ваш класс и знает, кому он принадлежит. Конструктор и инициализаторы полей — как раз такие моменты.

**Вне injection context** (например, в методе \`ngOnInit\`, который вызывается позже) контекста уже нет, поэтому \`DestroyRef\` нужно получить заранее и передать явно:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$.pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe();
}
\`\`\`

### Как это устроено под капотом

У \`DestroyRef\` есть метод \`onDestroy(cb)\` — он регистрирует колбэк (функцию), которую Angular вызовет в момент уничтожения владельца. Внутри \`takeUntilDestroyed\` создаётся \`Subject\` (специальный поток, в который можно «толкать» значения вручную). Когда срабатывает колбэк уничтожения, этот Subject эмитит значение, и дальше применяется обычная логика \`takeUntil\` — «получай значения из потока, пока другой поток не подаст сигнал; как только сигнал пришёл — заверши подписку».

### Почему это лучше ручного takeUntil + Subject

- **Меньше кода**: не нужно заводить поле \`destroy$\`, писать метод \`ngOnDestroy\` и вызывать в нём \`.next()\` и \`.complete()\`.
- **Меньше ошибок**: классический ручной паттерн легко испортить — забыть \`complete()\`, забыть отписаться или поставить \`takeUntil\` не на своё место.
- **Работает не только в компонентах**: в сервисах и директивах, где \`ngOnDestroy\` менее очевиден, \`DestroyRef\` всё равно даёт чёткую точку уничтожения.
- **Прямая интеграция с жизненным циклом Angular** через \`DestroyRef\`, а не через ручную обвязку.

## ⚠️ Подводные камни

- Как и обычный \`takeUntil\`, ставьте \`takeUntilDestroyed\` **последним** в цепочке \`.pipe(...)\` — после операторов, которые должны успеть отработать. Если поставить его раньше, нижестоящие операторы могут «пережить» отписку и продолжить эмитить.
- Вне injection context (в \`ngOnInit\` и других методах) обязательно передавайте \`DestroyRef\` явно — иначе будет ошибка, потому что оператор не сможет найти контекст сам.

## 🎯 Запомни

- \`takeUntilDestroyed\` = автоматическая отписка при уничтожении владельца, без ручного \`destroy$\` и \`ngOnDestroy\`.
- В конструкторе/инициализаторе поля вызывайте без аргументов; в методах передавайте \`inject(DestroyRef)\`.
- Ставьте его последним в \`.pipe(...)\`.`,
      en: `## 🧩 In plain words

When you subscribe to a stream of data (an Observable), that subscription later needs to be "closed" — otherwise it keeps running even after the component has left the screen, and that is a memory leak. It used to mean manually creating a special "off switch," flipping it when the component is destroyed, and making sure everything is wired up correctly. \`takeUntilDestroyed\` is a ready-made "auto off switch": it notices on its own that the component is being destroyed and cuts off the subscription. Less boilerplate, fewer chances to get it wrong.

### What it is

\`takeUntilDestroyed\` is an RxJS operator from the \`@angular/core/rxjs-interop\` package (added in Angular 16+). An operator is a function you drop into \`.pipe(...)\` to change how a stream behaves. This particular operator automatically **unsubscribes** a stream (stops receiving values from it) when the component, directive, or service that owns it is destroyed. It does this by leaning on \`DestroyRef\` — an Angular helper object that can announce "this owner is being destroyed right now."

### Two modes of operation

**Inside an injection context** (in a constructor or a class-field initializer) the operator grabs \`DestroyRef\` from its surroundings itself — you pass nothing:

\`\`\`ts
export class MyComponent {
  data$ = this.service.stream$.pipe(
    takeUntilDestroyed() // DestroyRef comes from the injection context
  );
}
\`\`\`

An injection context is the moment when Angular is "constructing" your class and knows who it belongs to. Constructors and field initializers are exactly such moments.

**Outside an injection context** (for example, in \`ngOnInit\`, which runs later) there is no context anymore, so you must obtain \`DestroyRef\` ahead of time and pass it explicitly:

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$.pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe();
}
\`\`\`

### How it works under the hood

\`DestroyRef\` has a method \`onDestroy(cb)\` — it registers a callback (a function) that Angular will invoke the moment the owner is destroyed. Internally \`takeUntilDestroyed\` creates a \`Subject\` (a special stream you can push values into manually). When the destroy callback fires, that Subject emits a value, and then the regular \`takeUntil\` logic kicks in — "take values from the stream until another stream signals; once the signal arrives, complete the subscription."

### Why it is better than manual takeUntil + Subject

- **Less code**: no \`destroy$\` field, no \`ngOnDestroy\` method, no \`.next()\` / \`.complete()\` calls inside it.
- **Fewer mistakes**: the classic manual pattern is easy to get wrong — forgetting \`complete()\`, forgetting to unsubscribe, or placing \`takeUntil\` in the wrong spot.
- **Works beyond components**: in services and directives where \`ngOnDestroy\` is less obvious, \`DestroyRef\` still gives a clear destruction point.
- **Direct integration with the Angular lifecycle** via \`DestroyRef\`, rather than through hand-rolled wiring.

## ⚠️ Common pitfalls

- Like plain \`takeUntil\`, place \`takeUntilDestroyed\` **last** in the \`.pipe(...)\` chain — after operators that must finish their work. If you put it earlier, downstream operators can "outlive" the unsubscription and keep emitting.
- Outside an injection context (in \`ngOnInit\` and other methods) always pass \`DestroyRef\` explicitly — otherwise you get an error, because the operator cannot find the context on its own.

## 🎯 Key takeaways

- \`takeUntilDestroyed\` = automatic unsubscription when the owner is destroyed, without a manual \`destroy$\` and \`ngOnDestroy\`.
- In a constructor / field initializer call it with no arguments; in methods pass \`inject(DestroyRef)\`.
- Put it last in \`.pipe(...)\`.`
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
      ru: `## 🧩 Простыми словами

Представьте, что данные в приложении приходят «порциями во времени» — например, счётчик, который тикает каждую секунду. Обычно, чтобы показать такое в шаблоне, вам нужно вручную подписаться на источник, забирать новое значение и не забыть отписаться, когда компонент уходит с экрана. \`async pipe\` — это маленький помощник, который делает всё это за вас прямо в HTML: подписывается, показывает свежее значение и сам отписывается. А ещё он «толкает» Angular обновить картинку, когда пришло новое значение.

### Что делает async pipe

\`AsyncPipe\` — это встроенный пайп Angular (пайп — это преобразователь значений в шаблоне, пишется через \`|\`). Он подписывается на \`Observable\` (поток значений) или \`Promise\`, возвращает последнее эмитированное значение для отображения и **автоматически отписывается**, когда хост-компонент уничтожается. Это убирает целый класс утечек памяти, потому что вам не нужно помнить об отписке вручную.

### Под капотом

- В своём методе \`transform\` (метод, который вызывает Angular, чтобы получить значение для показа) пайп сравнивает переданный ему сейчас Observable с тем, что был раньше. Если это **новый** источник — пайп отписывается от старого и подписывается на новый.
- Когда источник эмитит новое значение (\`next\`), пайп сохраняет это значение и вызывает \`ChangeDetectorRef.markForCheck()\` — то есть помечает компонент «грязным» (нуждающимся в перерисовке).
- В методе \`ngOnDestroy\` самого пайпа происходит \`unsubscribe\` — отписка.

### Взаимодействие с change detection

Change detection (обнаружение изменений) — это процесс, которым Angular решает, какие части экрана перерисовать. Вызов \`markForCheck()\` особенно важен для стратегии **OnPush**. При OnPush компонент проверяется не на каждый тик приложения, а только когда его явно пометили «грязным». \`async pipe\` помечает компонент при каждой новой эмиссии значения — поэтому шаблон обновляется сам, без ручного вызова \`detectChanges\`.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<span>{{ count$ | async }}</span>\`
})
\`\`\`

Здесь \`count$\` — это поток, а \`| async\` заставляет Angular показывать его последнее значение и обновлять \`<span>\` при каждом новом тике счётчика.

### Async pipe и zoneless

Zone.js — это библиотека, которую Angular исторически использовал, чтобы «замечать» асинхронные события и запускать change detection. В zoneless-режиме (без Zone.js) её нет. \`async pipe\` продолжает работать и там, и при OnPush, потому что он опирается на \`markForCheck\`, а не на Zone.js — он сам сообщает Angular, что пора обновиться.

### Альтернатива с Signals

С появлением Signals (реактивных значений Angular) есть альтернатива — функция \`toSignal\`, которая превращает Observable в signal. Она тоже триггерит обновление шаблона, но делает это через граф зависимостей signals, а не через \`markForCheck\`.

## ⚠️ Подводные камни

- **Несколько \`| async\` на один и тот же поток** = несколько подписок = несколько выполнений cold-источника (например, несколько одинаковых HTTP-запросов). Cold Observable — это поток, который запускает свою работу заново на каждую подписку. Решение: оператор \`shareReplay\` (делает поток общим для всех подписчиков) или конструкция \`@if (data$ | async; as data)\`, которая подписывается один раз и переиспользует значение.
- Если передавать в пайп **новый** Observable на каждый цикл change detection (например, вызов \`obj.method()\` создаёт новый поток прямо в шаблоне), пайп будет постоянно переподписываться. Храните поток в поле класса, а не создавайте на лету.

## 🎯 Запомни

- \`async pipe\` = подписка + показ последнего значения + автоотписка, прямо в шаблоне.
- Он вызывает \`markForCheck()\` на каждую эмиссию, поэтому отлично работает с OnPush и zoneless.
- Один поток — один \`| async\`; для нескольких использований применяйте \`shareReplay\` или \`@if ... as\`.
- Никогда не создавайте Observable прямо в шаблоне — держите его в поле класса.`,
      en: `## 🧩 In plain words

Imagine data in your app arriving "in portions over time" — for example, a counter that ticks every second. Normally, to show something like that in the template you have to manually subscribe to the source, grab each new value, and remember to unsubscribe when the component leaves the screen. The \`async pipe\` is a little helper that does all of this for you right in the HTML: it subscribes, shows the latest value, and unsubscribes on its own. It also "nudges" Angular to refresh the picture whenever a new value arrives.

### What the async pipe does

\`AsyncPipe\` is a built-in Angular pipe (a pipe is a value transformer used in templates, written with \`|\`). It subscribes to an \`Observable\` (a stream of values) or a \`Promise\`, returns the latest emitted value for display, and **automatically unsubscribes** when the host component is destroyed. This removes a whole class of memory leaks, because you never have to remember to unsubscribe by hand.

### Under the hood

- In its \`transform\` method (the method Angular calls to get the value to display) the pipe compares the Observable passed in now with the one it had before. If it is a **new** source, the pipe unsubscribes from the old one and subscribes to the new one.
- When the source emits a new value (\`next\`), the pipe stores that value and calls \`ChangeDetectorRef.markForCheck()\` — that is, it marks the component "dirty" (in need of re-rendering).
- In the pipe's own \`ngOnDestroy\` method it performs \`unsubscribe\`.

### Interaction with change detection

Change detection is the process by which Angular decides which parts of the screen to re-render. The \`markForCheck()\` call is especially important for the **OnPush** strategy. With OnPush the component is checked not on every application tick, but only when it has been explicitly marked "dirty." The \`async pipe\` marks the component on every new emission — so the template updates by itself, with no manual \`detectChanges\` call.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<span>{{ count$ | async }}</span>\`
})
\`\`\`

Here \`count$\` is a stream, and \`| async\` makes Angular show its latest value and refresh the \`<span>\` on every new tick of the counter.

### Async pipe and zoneless

Zone.js is a library that Angular historically used to "notice" asynchronous events and trigger change detection. In zoneless mode (without Zone.js) it is gone. The \`async pipe\` keeps working there, and with OnPush, because it relies on \`markForCheck\` rather than on Zone.js — it tells Angular itself that it is time to update.

### The Signals alternative

With the arrival of Signals (Angular's reactive values) there is an alternative — the \`toSignal\` function, which turns an Observable into a signal. It also triggers template updates, but does so through the signal dependency graph rather than through \`markForCheck\`.

## ⚠️ Common pitfalls

- **Multiple \`| async\` on the same stream** = multiple subscriptions = multiple executions of a cold source (for example, several identical HTTP calls). A cold Observable is a stream that restarts its work on each subscription. Fix: the \`shareReplay\` operator (makes the stream shared across subscribers) or the \`@if (data$ | async; as data)\` construct, which subscribes once and reuses the value.
- If you pass a **new** Observable to the pipe on every change detection cycle (for example, \`obj.method()\` creating a fresh stream right in the template), the pipe keeps resubscribing. Store the stream in a class field instead of creating it on the fly.

## 🎯 Key takeaways

- \`async pipe\` = subscribe + show the latest value + auto-unsubscribe, right in the template.
- It calls \`markForCheck()\` on every emission, so it works great with OnPush and zoneless.
- One stream, one \`| async\`; for multiple uses apply \`shareReplay\` or \`@if ... as\`.
- Never create an Observable directly in the template — keep it in a class field.`
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
      ru: `## 🧩 Простыми словами

Signals и RxJS — два инструмента для работы с меняющимися данными, но они про разное. Signals — это как показания термометра на стене: посмотрел — и вот текущее значение, всегда доступно «прямо сейчас». RxJS — это как лента новостей: события приходят одно за другим во времени, и ты реагируешь на каждое по мере поступления. Простое правило: **состояние держи в Signals, а события и асинхронность — в RxJS**.

### Природа инструментов

**Signals** — модель **синхронного состояния** с автоматическим отслеживанием зависимостей. У сигнала всегда есть значение, доступное «прямо сейчас»: создаёте через \`signal()\`, читаете как \`mySignal()\`. Это **pull-модель**: значение вычисляется/читается в момент обращения к нему. «Автотрекинг зависимостей» означает, что если одно вычисляемое значение использует сигнал, Angular сам запомнит эту связь и пересчитает результат, когда сигнал изменится.

**RxJS** — модель **асинхронных событий во времени**. Это **push-модель**: значения «толкаются» подписчику по мере появления. У RxJS богатая система операторов (функций-преобразователей потока) и встроенная отмена подписок.

### Где уместны Signals

- Локальное состояние UI: булевы флаги, выбранная вкладка, данные формы.
- Производные значения через \`computed\` (сигнал, вычисляемый из других сигналов).
- Связывание состояния с шаблоном — особенно в режимах zoneless и OnPush.
- Простые синхронные вычисления, где нет асинхронности.

### Где уместен RxJS

- Асинхронные события: HTTP-запросы, WebSocket, события DOM, таймеры.
- Координация во времени: \`debounceTime\` (подождать паузу перед реакцией), \`switchMap\` (переключиться на новый поток, отменив старый), \`combineLatest\` (объединить последние значения нескольких потоков), \`retry\` (повторить при ошибке).
- Отмена устаревших операций — например, гонки запросов при поиске, когда важен только последний.
- Сложные конвейеры преобразований потока.

### Граница и связка двух миров

Распространённый паттерн: **RxJS добывает и преобразует данные → Signal потребляет их в шаблоне**. Мосты между мирами — функции \`toSignal\` (Observable → signal) и \`toObservable\` (signal → Observable):

\`\`\`ts
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] }
);
\`\`\`

Здесь \`query\` — сигнал с текстом поиска. \`toObservable\` превращает его в поток, RxJS ждёт паузу 300 мс и делает запрос, отменяя предыдущий, а \`toSignal\` возвращает результат обратно в виде сигнала, удобного для шаблона. \`initialValue: []\` задаёт значение до первого ответа.

## ⚠️ Подводные камни

- Не пытайтесь делать \`debounce\`/\`switchMap\` на голых signals — для координации во времени они неудобны, это территория RxJS.
- Не держите простой синхронный флаг в \`BehaviorSubject\`, если хватит обычного \`signal\` — это лишняя сложность.
- Не забывайте про мосты \`toSignal\`/\`toObservable\` на стыке: они позволяют не тянуть один инструмент туда, где сильнее другой.

## 🎯 Запомни

- Signals = синхронное состояние «прямо сейчас» (pull); RxJS = асинхронные события во времени (push).
- Состояние — в Signals, события и асинхронность — в RxJS.
- На стыке используйте \`toSignal\` и \`toObservable\` как мосты: RxJS добывает данные, Signal их отображает.`,
      en: `## 🧩 In plain words

Signals and RxJS are two tools for working with changing data, but they are about different things. Signals are like the reading on a wall thermometer: you glance at it and there is the current value, always available "right now." RxJS is like a news feed: events arrive one after another over time, and you react to each as it comes. Simple rule: **keep state in Signals, and events and async in RxJS**.

### The nature of the tools

**Signals** are a model of **synchronous state** with automatic dependency tracking. A signal always has a value available "right now": you create it with \`signal()\` and read it as \`mySignal()\`. This is a **pull model**: the value is computed/read at the moment you access it. "Automatic dependency tracking" means that if one computed value uses a signal, Angular remembers that link itself and recomputes the result when the signal changes.

**RxJS** is a model of **asynchronous events over time**. This is a **push model**: values are pushed to the subscriber as they appear. RxJS has a rich system of operators (stream-transforming functions) and built-in subscription cancellation.

### Where Signals fit

- Local UI state: boolean flags, the selected tab, form data.
- Derived values via \`computed\` (a signal calculated from other signals).
- Binding state to the template — especially in zoneless and OnPush modes.
- Simple synchronous computations with no async involved.

### Where RxJS fits

- Async events: HTTP requests, WebSocket, DOM events, timers.
- Time coordination: \`debounceTime\` (wait for a pause before reacting), \`switchMap\` (switch to a new stream, cancelling the old one), \`combineLatest\` (combine the latest values of several streams), \`retry\` (retry on error).
- Cancelling stale operations — for example, request races in search, where only the last one matters.
- Complex stream transformation pipelines.

### The boundary and the bridge between the two worlds

A common pattern: **RxJS fetches and transforms data → a Signal consumes it in the template**. The bridges between the worlds are the functions \`toSignal\` (Observable → signal) and \`toObservable\` (signal → Observable):

\`\`\`ts
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] }
);
\`\`\`

Here \`query\` is a signal holding the search text. \`toObservable\` turns it into a stream, RxJS waits a 300 ms pause and makes the request, cancelling the previous one, and \`toSignal\` returns the result back as a signal that is convenient for the template. \`initialValue: []\` sets the value before the first response.

## ⚠️ Common pitfalls

- Do not try to do \`debounce\`/\`switchMap\` on bare signals — for time coordination they are awkward; that is RxJS territory.
- Do not keep a simple synchronous flag in a \`BehaviorSubject\` when a plain \`signal\` is enough — that is needless complexity.
- Do not forget the \`toSignal\`/\`toObservable\` bridges at the seam: they let you avoid stretching one tool into where the other is stronger.

## 🎯 Key takeaways

- Signals = synchronous state "right now" (pull); RxJS = asynchronous events over time (push).
- State in Signals, events and async in RxJS.
- At the seam use \`toSignal\` and \`toObservable\` as bridges: RxJS fetches the data, a Signal displays it.`
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
      ru: `## 🧩 Простыми словами

Observable — это как рецепт, а не готовое блюдо: пока вы не вызвали \`subscribe()\`, ничего не происходит. \`subscribe()\` — это команда «начать готовить». В этот момент RxJS разворачивает всю цепочку операторов, запускает источник данных и начинает передавать значения от него к вашим колбэкам. А ещё он возвращает «пульт», которым можно всё выключить и убрать за собой. Давайте пройдём этот путь по шагам.

### 1. Нормализация Observer

\`subscribe()\` принимает либо объект-Observer вида \`{ next, error, complete }\`, либо просто функцию-\`next\`. Observer — это «слушатель» с тремя реакциями: \`next\` (пришло значение), \`error\` (ошибка), \`complete\` (поток завершился). Что бы вы ни передали, внутри RxJS оборачивает это в \`SafeSubscriber\` — экземпляр класса \`Subscriber\`.

### 2. Subscriber как страж контракта

\`Subscriber\` наследуется от \`Subscription\` (объект подписки, который умеет «отключаться») и одновременно реализует интерфейс Observer. Он выполняет роль стража правил:

- гарантирует **грамматику** потока \`next* (error|complete)?\` — то есть «сколько угодно значений, затем максимум одно терминальное событие»: после \`error\` или \`complete\` любые последующие \`next\` игнорируются;
- ловит исключения, брошенные внутри ваших колбэков, чтобы они не роняли всё;
- хранит флаг \`closed\` (закрыт ли поток) и список teardown-логики — функций очистки (это возможно, потому что он Subscription).

### 3. Запуск producer-функции

Observable вызывает свою внутреннюю функцию \`_subscribe(subscriber)\` — ту самую, что передали в конструктор Observable. Она называется producer, потому что «производит» значения. Если поток собран через \`pipe\` из операторов, это превращается в цепочку: каждый оператор оборачивает \`subscriber\` в свой собственный «operator-subscriber», который преобразует или фильтрует значения и передаёт их дальше.

\`\`\`ts
// упрощённая модель оператора map
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)), // трансформация значения
      error: e => sub.error(e),
      complete: () => sub.complete()
    });
  });
}
\`\`\`

Здесь видно: \`map\` создаёт новый Observable, который подписывается на исходный \`source\`, применяет функцию \`fn\` к каждому значению и толкает результат дальше в \`sub\`.

### 4. Поток значений

Когда producer вызывает \`subscriber.next(v)\`, значение проходит вверх по цепочке operator-subscriber-ов — каждый уровень его преобразует — и в итоге доходит до вашего конечного Observer.

### 5. Возврат Subscription

\`subscribe()\` возвращает объект \`Subscription\` — это и есть «пульт» для отписки. Producer-функция, в свою очередь, возвращает teardown (функцию очистки: закрыть сокет, снять слушатель события, очистить таймер), и этот teardown регистрируется в Subscription.

### 6. Завершение и teardown

Когда происходит \`complete()\`, \`error()\` или вы вручную вызываете \`unsubscribe()\`, устанавливается флаг \`closed\`, и рекурсивно вызываются все зарегистрированные teardown-функции вниз по цепочке — освобождая ресурсы на каждом уровне.

### Ключевая идея

Каждая подписка — это **независимое выполнение** (unicast): два \`subscribe()\` на один cold Observable запускают источник дважды. А вся цепочка операторов разворачивается «изнутри наружу» именно в момент подписки, а не при создании Observable.

## ⚠️ Подводные камни

- Ничего не выполняется, пока не вызван \`subscribe()\` — Observable «ленивый». Забыли подписаться — код внутри не сработает.
- Не отписались от бесконечного потока — ресурс (сокет, таймер, слушатель) продолжит жить: возможна утечка.
- Cold Observable выполняется заново на каждую подписку; если нужно разделить одно выполнение между подписчиками — используйте \`share\`/\`shareReplay\`.

## 🎯 Запомни

- \`subscribe()\` = обернуть Observer в \`Subscriber\`, запустить producer-цепочку, вернуть \`Subscription\`.
- \`Subscriber\` стережёт грамматику \`next* (error|complete)?\` и ловит ошибки колбэков.
- Каждая подписка независима (unicast); teardown вызывается вниз по цепочке при завершении или \`unsubscribe()\`.`,
      en: `## 🧩 In plain words

An Observable is like a recipe, not a finished dish: until you call \`subscribe()\`, nothing happens. \`subscribe()\` is the "start cooking" command. At that moment RxJS unfolds the whole chain of operators, kicks off the data source, and starts passing values from it to your callbacks. It also hands you back a "remote control" you can use to switch everything off and clean up. Let us walk this path step by step.

### 1. Observer normalization

\`subscribe()\` accepts either an Observer object shaped like \`{ next, error, complete }\` or just a \`next\` function. An Observer is a "listener" with three reactions: \`next\` (a value arrived), \`error\` (something failed), \`complete\` (the stream finished). Whatever you pass, RxJS internally wraps it in a \`SafeSubscriber\` — an instance of the \`Subscriber\` class.

### 2. The Subscriber as contract guard

\`Subscriber\` extends \`Subscription\` (a subscription object that knows how to "shut down") and at the same time implements the Observer interface. It acts as a rules guard:

- it enforces the stream **grammar** \`next* (error|complete)?\` — that is, "any number of values, then at most one terminal event": after \`error\` or \`complete\`, any further \`next\` calls are ignored;
- it catches exceptions thrown inside your callbacks so they do not bring everything down;
- it holds a \`closed\` flag (is the stream closed?) and a list of teardown logic — cleanup functions (possible because it is a Subscription).

### 3. Running the producer function

The Observable calls its internal \`_subscribe(subscriber)\` — the very function passed to the Observable's constructor. It is called the producer because it "produces" values. If the stream is assembled via \`pipe\` from operators, this becomes a chain: each operator wraps the \`subscriber\` in its own "operator-subscriber" that transforms or filters values and passes them on.

\`\`\`ts
// simplified model of the map operator
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)), // transform the value
      error: e => sub.error(e),
      complete: () => sub.complete()
    });
  });
}
\`\`\`

You can see it here: \`map\` creates a new Observable that subscribes to the original \`source\`, applies the function \`fn\` to each value, and pushes the result onward into \`sub\`.

### 4. Value flow

When the producer calls \`subscriber.next(v)\`, the value travels up the chain of operator-subscribers — each level transforms it — and finally reaches your final Observer.

### 5. Returning the Subscription

\`subscribe()\` returns a \`Subscription\` object — this is the "remote control" for unsubscribing. The producer function, in turn, returns teardown (a cleanup function: close a socket, remove an event listener, clear a timer), and this teardown is registered in the Subscription.

### 6. Completion and teardown

When \`complete()\`, \`error()\`, or a manual \`unsubscribe()\` happens, the \`closed\` flag is set and all registered teardown functions are recursively invoked down the chain — releasing resources at each level.

### The key idea

Each subscription is an **independent execution** (unicast): two \`subscribe()\` calls on one cold Observable start the source twice. And the whole operator chain unfolds "inside out" precisely at the moment of subscription, not when the Observable is created.

## ⚠️ Common pitfalls

- Nothing runs until \`subscribe()\` is called — an Observable is "lazy." Forget to subscribe and the code inside never fires.
- Fail to unsubscribe from an infinite stream and the resource (socket, timer, listener) keeps living: a possible leak.
- A cold Observable re-executes on every subscription; if you need to share one execution across subscribers, use \`share\`/\`shareReplay\`.

## 🎯 Key takeaways

- \`subscribe()\` = wrap the Observer in a \`Subscriber\`, run the producer chain, return a \`Subscription\`.
- The \`Subscriber\` guards the \`next* (error|complete)?\` grammar and catches callback errors.
- Each subscription is independent (unicast); teardown is invoked down the chain on completion or \`unsubscribe()\`.`
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
      ru: `## 🧩 Простыми словами

Представь коробку, в которой лежит текущее состояние приложения (например, счётчик). Ты не лезешь в неё руками, а бросаешь внутрь «записки-команды»: «прибавь», «убавь», «поставь 5». Специальный работник читает записки по очереди, меняет число в коробке и каждый раз показывает всем новое значение. Это и есть мини-Redux на RxJS — маленький собственный «магазин состояния» без сторонних библиотек.

### Что мы вообще строим

**State store (хранилище состояния)** — это единое место, где живут данные приложения, и удобный способ их читать и обновлять. В RxJS его можно собрать двумя способами. Оба крутятся вокруг **Observable** — «потока значений во времени», на который можно подписаться (\`subscribe\`) и получать новые значения по мере их появления.

### Вариант 1: через scan (декларативный, «как Redux»)

\`scan\` — это как обычный \`reduce\` у массива, но растянутый во времени. Обычный \`reduce\` проходит по массиву и накапливает результат; \`scan\` делает то же самое, но по потоку событий: на каждое новое событие он берёт прошлое состояние, применяет к нему функцию и выдаёт новое состояние.

Здесь события — это **actions (действия)**, описанные как объекты с полем \`type\`. Поток действий — это \`Subject\` (труба, в которую можно и класть значения через \`next\`, и слушать их).

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

Что тут происходит по шагам: \`dispatch\` кидает действие в \`actions$\`; \`scan\` берёт текущее состояние (стартовое — \`{ count: 0 }\`) и возвращает новое; \`startWith\` выдаёт начальное значение сразу при подписке, чтобы UI не ждал первого действия; \`shareReplay\` раздаёт результат всем подписчикам (о нём ниже). Функция внутри \`scan\` — **чистая (pure)**: она зависит только от входных \`state\` и \`action\` и ничего не мутирует, поэтому её легко тестировать.

### Вариант 2: через BehaviorSubject (императивный, проще)

**BehaviorSubject** — это особый \`Subject\`, который всегда помнит своё последнее значение и отдаёт его каждому новому подписчику сразу. То есть у него всегда есть «текущее значение», которое можно прочитать синхронно через \`.value\`.

\`\`\`ts
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

Здесь обновление состояния — это просто «взять текущее значение, слить с изменениями и положить обратно» через \`next\`. \`snapshot\` даёт мгновенный снимок состояния без подписки — удобно, когда нужно прочитать значение прямо сейчас.

### Сравнение двух вариантов

- **scan** — декларативный, переходы состояния чистые, ближе к Redux, легко тестировать; но нет синхронного снимка (нельзя просто спросить «какое сейчас значение»).
- **BehaviorSubject** — есть \`.value\` (мгновенный снимок), проще для обычных CRUD-обновлений; но переходы императивные (меняешь состояние вручную).

## ⚠️ Подводные камни

- Без \`shareReplay({ bufferSize: 1, refCount: true })\` каждый новый \`subscribe\` запустит \`scan\` заново со своим отдельным состоянием — подписчики не будут делить одно хранилище. \`bufferSize: 1\` означает «запомни и отдай последнее значение», а \`refCount: true\` — «отключись от источника, когда ушёл последний подписчик».
- \`asObservable()\` прячет метод \`next\` от потребителей: снаружи на поток можно только подписаться, но не пушить в него значения напрямую. Это инкапсуляция — обновления идут только через твои методы (\`patch\`, \`dispatch\`).

## 🎯 Запомни

- \`scan\` = «reduce во времени»: чистые переходы состояния на поток действий, стиль Redux.
- \`BehaviorSubject\` = состояние с памятью и синхронным \`.value\`; проще для императивных обновлений.
- \`shareReplay({bufferSize:1, refCount:true})\` обязателен, чтобы все делили одно состояние и получали последнее.
- \`asObservable()\` = инкапсуляция: наружу отдаём только чтение.`,
      en: `## 🧩 In plain words

Picture a box holding your app's current state (say, a counter). You never reach in with your hands — instead you toss in "command notes": "add one", "subtract one", "set it to 5". A worker reads the notes one by one, updates the number in the box, and each time shows everyone the new value. That is a mini-Redux built on RxJS — your own tiny "state store" without any external library.

### What we are actually building

A **state store** is a single place where your app's data lives, plus a convenient way to read and update it. In RxJS you can assemble one in two ways. Both revolve around an **Observable** — a "stream of values over time" that you can \`subscribe\` to and receive new values as they arrive.

### Option 1: with scan (declarative, "Redux-like")

\`scan\` is like an array's \`reduce\`, but stretched over time. A normal \`reduce\` walks an array and accumulates a result; \`scan\` does the same over a stream of events: on each new event it takes the previous state, applies a function, and emits the new state.

Here the events are **actions**, described as objects with a \`type\` field. The stream of actions is a \`Subject\` — a pipe you can both push values into (via \`next\`) and listen to.

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

Step by step: \`dispatch\` pushes an action into \`actions$\`; \`scan\` takes the current state (seed is \`{ count: 0 }\`) and returns the new one; \`startWith\` emits an initial value immediately on subscription so the UI does not wait for the first action; \`shareReplay\` fans the result out to all subscribers (more below). The function inside \`scan\` is **pure**: it depends only on its \`state\` and \`action\` inputs and mutates nothing, which makes it easy to test.

### Option 2: with BehaviorSubject (imperative, simpler)

A **BehaviorSubject** is a special \`Subject\` that always remembers its latest value and hands it to every new subscriber immediately. In other words it always has a "current value" you can read synchronously via \`.value\`.

\`\`\`ts
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

Here a state update is simply "take the current value, merge in the changes, put it back" via \`next\`. \`snapshot\` gives an instant read of the state without subscribing — handy when you need the value right now.

### Comparing the two

- **scan** — declarative, pure state transitions, closer to Redux, easy to test; but no synchronous snapshot (you cannot just ask "what is the value now").
- **BehaviorSubject** — has \`.value\` (an instant snapshot), simpler for everyday CRUD updates; but transitions are imperative (you change state by hand).

## ⚠️ Common pitfalls

- Without \`shareReplay({ bufferSize: 1, refCount: true })\` every new \`subscribe\` re-runs \`scan\` with its own separate state — subscribers will not share one store. \`bufferSize: 1\` means "remember and replay the last value", and \`refCount: true\` means "unsubscribe from the source when the last subscriber leaves".
- \`asObservable()\` hides the \`next\` method from consumers: from the outside you can only subscribe, not push values in directly. That is encapsulation — updates flow only through your methods (\`patch\`, \`dispatch\`).

## 🎯 Key takeaways

- \`scan\` = "reduce over time": pure state transitions driven by a stream of actions, Redux-style.
- \`BehaviorSubject\` = state with memory and a synchronous \`.value\`; simpler for imperative updates.
- \`shareReplay({bufferSize:1, refCount:true})\` is required so everyone shares one state and gets the latest.
- \`asObservable()\` = encapsulation: expose read-only access to the outside.`
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
      ru: `## 🧩 Простыми словами

Представь, что один источник новостей обновляет сразу два табло: на одном пишется число, на другом — то же число, умноженное на два. В идеале оба табло должны меняться одновременно. Но техника обновляет их по очереди: сначала первое, потом второе. И вот в этот крошечный промежуток кто-то, кто следит за обоими табло, видит рассинхрон: первое уже новое, второе ещё старое. Этот мгновенный несогласованный «полукадр» и называется **glitch**.

### Что такое glitch

**Glitch («глитч», промежуточное состояние)** — это кратковременное, логически несогласованное значение, которое \`combineLatest\` выдаёт, когда два его входных потока **происходят из одного источника** (так называемая diamond dependency — «ромбовидная зависимость»: источник разветвляется на A и B, а потом снова сходится в combineLatest).

\`combineLatest\` — оператор, который берёт по одному последнему значению из каждого входного потока и выдаёт их вместе. Проблема в том, что он реагирует на **каждую** эмиссию любого входа.

\`\`\`ts
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));

combineLatest([a$, b$]).subscribe(console.log);
// При новой эмиссии source: combineLatest сработает дважды —
// сначала [новое a, старое b], потом [новое a, новое b].
// Первая эмиссия — это glitch (a обновился, b ещё нет).
\`\`\`

### Почему так происходит

RxJS работает по **push-модели**: источник сам «проталкивает» значение подписчикам синхронно, один за другим. Когда \`source$\` эмитит новое значение, оно сначала доходит до \`a$\`, и combineLatest тут же выдаёт пару \`[новое a, старое b]\`. Только потом значение доходит до \`b$\`, и combineLatest выдаёт согласованную пару \`[новое a, новое b]\`. Первая пара — это и есть glitch: она реальна, подписчик её видит, но она логически «неправильная».

### Решение 1: комбинировать ДО разветвления

Самый надёжный способ — не разводить источник на два потока и потом сводить обратно, а сделать все производные вычисления одним \`map\` сразу после источника. Тогда новое значение всегда рождается целиком и согласованным:

\`\`\`ts
source$.pipe(map(x => ({ a: x, b: x * 2 })));
\`\`\`

### Решение 2: схлопнуть синхронную пачку

Операторы \`auditTime(0)\` или \`debounceTime(0)\`, поставленные после \`combineLatest\`, «схлопывают» пачку синхронных эмиссий в одну — последнюю, уже согласованную. Ноль здесь значит «дождись конца текущего синхронного цикла и возьми последнее значение»:

\`\`\`ts
combineLatest([a$, b$]).pipe(auditTime(0));
\`\`\`

### Решение 3: Signals не глитчат

Граф \`computed\` в Angular Signals устроен как **glitch-free**: производное значение пересчитывается только один раз — после того как все его зависимости согласованы. Это достигается pull-моделью (значение вычисляется лениво, когда его спрашивают) и топологическим порядком обхода графа зависимостей. Поэтому для сложного производного состояния Signals часто удобнее RxJS.

## ⚠️ Подводные камни

- Glitch незаметен в простых случаях, но ломает логику, когда по промежуточной паре срабатывает побочный эффект (запрос на сервер, запись в стор) — эффект выполнится на «мусорных» данных.
- \`auditTime(0)\`/\`debounceTime(0)\` лечат симптом, но добавляют микрозадержку (эмиссия уходит на следующий тик) — иногда это нежелательно.
- Glitch возникает именно из-за общего источника. Если потоки независимы, промежуточная пара — это нормальное, а не ошибочное состояние.

## 🎯 Запомни

- Glitch — это мгновенное несогласованное значение из \`combineLatest\` при diamond-зависимости (два потока из одного источника).
- Причина — push-модель RxJS: входы обновляются по очереди, между ними успевает вылететь «полусогласованная» пара.
- Лучшее лекарство — комбинировать до разветвления (\`map\` в объект); как заплатка — \`auditTime(0)\`.
- Angular Signals glitch-free по устройству — вариант для сложного производного состояния.`,
      en: `## 🧩 In plain words

Imagine one news source updating two scoreboards at once: one shows a number, the other shows the same number times two. Ideally both boards change simultaneously. But the machinery updates them one at a time: first one, then the other. In that tiny gap, anyone watching both boards sees them out of sync: the first is already new, the second is still old. That momentary inconsistent "half-frame" is called a **glitch**.

### What a glitch is

A **glitch (intermediate state)** is a brief, logically inconsistent value that \`combineLatest\` emits when two of its input streams **derive from the same source** — a so-called diamond dependency: the source branches into A and B, then rejoins in \`combineLatest\`.

\`combineLatest\` is an operator that takes the latest value from each input stream and emits them together. The catch is that it reacts to **every** emission of any input.

\`\`\`ts
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));

combineLatest([a$, b$]).subscribe(console.log);
// On a new source emission combineLatest fires twice —
// first [new a, old b], then [new a, new b].
// The first emission is the glitch (a updated, b not yet).
\`\`\`

### Why it happens

RxJS works on a **push model**: the source itself pushes a value to subscribers synchronously, one after another. When \`source$\` emits a new value, it first reaches \`a$\`, and combineLatest immediately emits the pair \`[new a, old b]\`. Only then does the value reach \`b$\`, and combineLatest emits the consistent pair \`[new a, new b]\`. The first pair is the glitch: it is real, the subscriber sees it, but it is logically "wrong".

### Fix 1: combine BEFORE branching

The most reliable approach is to not split the source into two streams and rejoin them, but to do all derivations in a single \`map\` right after the source. Then a new value is always born whole and consistent:

\`\`\`ts
source$.pipe(map(x => ({ a: x, b: x * 2 })));
\`\`\`

### Fix 2: collapse the synchronous burst

The operators \`auditTime(0)\` or \`debounceTime(0)\`, placed after \`combineLatest\`, collapse a burst of synchronous emissions into one — the last, already consistent one. Zero here means "wait for the end of the current synchronous cycle and take the last value":

\`\`\`ts
combineLatest([a$, b$]).pipe(auditTime(0));
\`\`\`

### Fix 3: Signals do not glitch

Angular Signals' \`computed\` graph is **glitch-free** by design: a derived value is recomputed only once — after all its dependencies have settled. This is achieved by a pull model (the value is computed lazily, when asked for) and a topological traversal order of the dependency graph. That is why Signals are often more convenient than RxJS for complex derived state.

## ⚠️ Common pitfalls

- A glitch is invisible in simple cases, but it breaks logic when a side effect (a server request, a store write) fires on the intermediate pair — the effect runs on garbage data.
- \`auditTime(0)\`/\`debounceTime(0)\` treat the symptom but add a micro-delay (the emission moves to the next tick) — sometimes undesirable.
- A glitch arises specifically because of a shared source. If the streams are independent, the intermediate pair is normal, not an error.

## 🎯 Key takeaways

- A glitch is a momentary inconsistent value from \`combineLatest\` under a diamond dependency (two streams from one source).
- The cause is RxJS's push model: inputs update one at a time, and a "half-consistent" pair slips out in between.
- The best cure is to combine before branching (\`map\` into one object); as a patch, use \`auditTime(0)\`.
- Angular Signals are glitch-free by design — an option for complex derived state.`
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
      ru: `## 🧩 Простыми словами

Представь кассу в супермаркете. Покупатели (значения) подходят к ленте быстрее, чем кассир успевает их обслуживать. Что делать с очередью? Можно поставить несколько касс, но не бесконечно. Можно кого-то попросить прийти позже. Можно вообще пропускать часть покупателей. Вот эта проблема «поток приходит быстрее, чем мы успеваем обработать» и называется **backpressure**, а способы с ней справиться — это стратегии управления потоком.

### Что такое backpressure

**Backpressure (обратное давление)** — ситуация, когда **producer (источник) эмитит значения быстрее**, чем consumer (потребитель) успевает их обрабатывать. В «классическом» RxJS нет встроенного механизма reactive-streams backpressure (как в Project Reactor на бэкенде), где потребитель может сказать источнику «притормози». Вместо этого RxJS даёт набор операторов, которыми ты сам решаешь, что делать с «лишними» значениями. Их две группы: lossy (теряющие значения) и буферизующие (накапливающие).

### Стратегия 1: lossy — отбрасывать лишнее

Эти операторы сознательно пропускают только часть значений:

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — прореживают поток по времени, отдавая лишь некоторые значения (например, не чаще раза в 300 мс).
- \`exhaustMap\` — пока обрабатывается текущее значение, полностью игнорирует новые.

### Стратегия 2: буферизация — копить

Эти операторы ничего не теряют, а откладывают на потом:

- \`bufferTime\`, \`bufferCount\` — собирают значения в пачки (по времени или по количеству).
- \`concatMap\` — выстраивает задачи в очередь и выполняет строго по одной. Но если источник стабильно быстрее обработки, очередь (буфер) растёт бесконечно → риск утечки памяти.

### Стратегия 3: ограничить конкурентность mergeMap

\`mergeMap\` по умолчанию запускает **все** внутренние операции параллельно. Но у него есть второй аргумент — \`concurrency\`, который задаёт максимум **одновременных** внутренних подписок. Остальные ждут в очереди и стартуют по мере освобождения слотов.

\`\`\`ts
// не более 3 параллельных загрузок одновременно
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

Здесь \`uploadFile\` — это функция, возвращающая Observable (например, HTTP-запрос). \`mergeMap(fn, 3)\` держит максимум три запроса «в полёте»; четвёртый стартует, только когда завершится один из трёх.

### Почему это важно

- Неограниченный \`mergeMap\` на быстром источнике может породить **тысячи** одновременных HTTP-запросов → исчерпание браузерных соединений, перегрузка и падение сервера.
- \`concurrency = 1\` превращает \`mergeMap\` в аналог \`concatMap\` — очередь строго по одному.

### Как выбрать стратегию

- Нужны все значения, но под контролем → \`mergeMap(fn, N)\` или \`concatMap\`.
- Можно терять промежуточные значения → \`switchMap\` / \`throttleTime\` / \`auditTime\`.
- Защита от дабл-кликов (не запускать второе, пока идёт первое) → \`exhaustMap\`.

## ⚠️ Подводные камни

- \`concatMap\` не теряет данные, но на быстром бесконечном источнике его очередь растёт неограниченно — это скрытая утечка памяти. Не путай «не теряет» с «безопасно».
- Lossy-операторы (\`throttle\`, \`debounce\`, \`switchMap\`) молча выкидывают значения — убедись, что терять их действительно допустимо (не подходит для платежей, отправки форм и т.п.).
- В классическом RxJS нет «настоящего» backpressure — источник не притормаживается, ты лишь решаешь судьбу уже пришедших значений.

## 🎯 Запомни

- Backpressure = источник быстрее потребителя; RxJS не тормозит источник, а даёт операторы решить судьбу «лишних» значений.
- Три пути: обработать с лимитом (\`mergeMap(fn, N)\` / \`concatMap\`), выстроить в очередь (буферы), или отбросить (\`throttle\` / \`switchMap\` / \`exhaustMap\`).
- Второй аргумент \`mergeMap\` — лимит одновременных подписок; \`concurrency = 1\` = \`concatMap\`.
- Неограниченный \`mergeMap\` на быстром источнике = лавина параллельных запросов. Всегда ставь лимит осознанно.`,
      en: `## 🧩 In plain words

Picture a supermarket checkout. Customers (values) reach the belt faster than the cashier can serve them. What do you do with the queue? You could open several registers, but not infinitely many. You could ask some to come back later. Or you could just skip some customers entirely. That problem — "the stream arrives faster than we can handle it" — is called **backpressure**, and the ways to cope with it are flow-control strategies.

### What backpressure is

**Backpressure** is when a **producer emits values faster** than the consumer can process them. "Classic" RxJS has no built-in reactive-streams backpressure mechanism (like Project Reactor on the backend), where the consumer can tell the source to "slow down". Instead, RxJS gives you a set of operators with which you decide what to do with the "extra" values. They fall into two groups: lossy (drop values) and buffering (accumulate them).

### Strategy 1: lossy — drop the extra

These operators deliberately let only some values through:

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — thin the stream by time, passing only some values (e.g. at most once per 300 ms).
- \`exhaustMap\` — while the current value is being processed, it completely ignores new ones.

### Strategy 2: buffering — accumulate

These operators lose nothing but defer work for later:

- \`bufferTime\`, \`bufferCount\` — collect values into batches (by time or by count).
- \`concatMap\` — queues tasks and runs them strictly one at a time. But if the source is consistently faster than processing, the queue (buffer) grows without bound → memory-leak risk.

### Strategy 3: limit mergeMap concurrency

By default \`mergeMap\` starts **all** inner operations in parallel. But it has a second argument — \`concurrency\` — that sets the maximum number of **simultaneous** inner subscriptions. The rest wait in a queue and start as slots free up.

\`\`\`ts
// at most 3 parallel uploads at once
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

Here \`uploadFile\` is a function returning an Observable (e.g. an HTTP request). \`mergeMap(fn, 3)\` keeps at most three requests "in flight"; the fourth starts only when one of the three finishes.

### Why it matters

- An unbounded \`mergeMap\` on a fast source can spawn **thousands** of simultaneous HTTP requests → browser connection exhaustion, overload, and server crashes.
- \`concurrency = 1\` turns \`mergeMap\` into the equivalent of \`concatMap\` — a strict one-at-a-time queue.

### How to choose a strategy

- Need all values but under control → \`mergeMap(fn, N)\` or \`concatMap\`.
- Can drop intermediate values → \`switchMap\` / \`throttleTime\` / \`auditTime\`.
- Double-click protection (do not start a second while the first runs) → \`exhaustMap\`.

## ⚠️ Common pitfalls

- \`concatMap\` loses no data, but on a fast infinite source its queue grows unbounded — a hidden memory leak. Do not confuse "loses nothing" with "safe".
- Lossy operators (\`throttle\`, \`debounce\`, \`switchMap\`) silently discard values — make sure losing them is truly acceptable (not for payments, form submissions, etc.).
- Classic RxJS has no "true" backpressure — the source is never slowed down; you only decide the fate of values that already arrived.

## 🎯 Key takeaways

- Backpressure = source faster than consumer; RxJS does not slow the source but gives operators to decide the fate of "extra" values.
- Three paths: process with a limit (\`mergeMap(fn, N)\` / \`concatMap\`), queue (buffers), or drop (\`throttle\` / \`switchMap\` / \`exhaustMap\`).
- The second argument of \`mergeMap\` is the concurrency limit; \`concurrency = 1\` = \`concatMap\`.
- An unbounded \`mergeMap\` on a fast source = an avalanche of parallel requests. Always set a limit deliberately.`
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
      ru: `## 🧩 Простыми словами

Не забивают гвозди отбойным молотком. Управление состоянием в Angular — про то же самое: подбирать инструмент под масштаб задачи, а не тащить тяжёлый NgRx в каждый проект. Сначала разберись, какого типа у тебя состояние, а потом выбирай — от простого поля компонента до полноценного Redux-хранилища.

### Сначала раздели виды состояния

Ключевая идея: **не всё состояние одинаково**, и разным видам нужны разные инструменты.

- **Локальное UI-состояние** (открыт ли дропдаун, активная вкладка) — живёт в самом компоненте: обычное поле или \`signal\`.
- **Серверное состояние / кэш** (данные, пришедшие из API) — часто лучше обслуживается кэшом в духе \`@tanstack/query\` или сервисом с \`shareReplay\`, а не «затягиванием» серверных данных в клиентский стор.
- **Глобальное клиентское состояние** (текущий пользователь, тема оформления, корзина) — это то, ради чего и нужен store (централизованное хранилище).

### Лестница сложности

Думай об этом как о ступеньках: поднимайся выше только когда реально прижало.

### Ступень 1: локальные поля / Signals

Самое простое. Для изолированного состояния одного компонента. Ноль boilerplate (шаблонного кода). **Signal** — это реактивная «ячейка» со значением, которая сама уведомляет об изменениях.

### Ступень 2: сервис с BehaviorSubject / SignalStore

Паттерн «Service with a Subject»: сервис прячет состояние внутри и отдаёт наружу Observable или signal. Этого достаточно для среднего разделяемого состояния в рамках feature-модуля.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

Здесь \`items\` — приватное состояние (список товаров), \`total\` — **computed** (производное значение, автоматически пересчитывается при изменении \`items\`), а \`add\` — метод обновления. Снаружи видно только \`total\` и методы, само состояние инкапсулировано.

### Ступень 3: @ngrx/signals SignalStore

Структурированное хранилище со встроенной поддержкой computed-значений, методов и entities (коллекций сущностей). Берут, когда простого сервиса уже мало, но полный Redux ещё избыточен.

### Ступень 4: NgRx Store / NGXS

Полноценный Redux: **actions** (описания событий), **reducers** (чистые функции переходов состояния), **effects** (обработка побочных эффектов, например запросов), DevTools и time-travel (отладка с «перемоткой» состояния). Оправдан для крупных приложений со сложным, широко разделяемым состоянием, несколькими командами и требованиями аудита изменений.

### По каким критериям выбирать

- **Масштаб и размер команды**: больше людей и фич → нужна более строгая структура.
- **Сложность асинхронности**: много гонок и отмен запросов → выигрывают RxJS-effects.
- **Нужен ли аудит / DevTools / time-travel** → аргумент в пользу NgRx.
- **Цена boilerplate**: строгие решения требуют много шаблонного кода — не плати эту цену без необходимости.

## ⚠️ Подводные камни

- Заводить NgRx «на вырост» в маленьком проекте — частая ошибка: много кода, мало пользы, команда тонет в церемониях.
- Тянуть серверные данные (ответы API) в глобальный стор и вручную их синхронизировать — источник багов; для этого есть кэш-решения (query-библиотеки).
- Смешивать все виды состояния в одном месте — сначала раздели локальное, серверное и глобальное, и только потом выбирай инструмент под каждое.

## 🎯 Запомни

- Сначала классифицируй состояние: локальное UI / серверный кэш / глобальное клиентское — под каждое свой инструмент.
- Лестница: поле или signal → сервис с Subject/signal → SignalStore → NgRx. Поднимайся только по необходимости.
- NgRx оправдан масштабом, сложной асинхронностью и потребностью в DevTools/аудите — не boilerplate ради boilerplate.
- Правило: начинай с простого, усложняй только когда боль реальна.`,
      en: `## 🧩 In plain words

You do not drive a nail with a jackhammer. State management in Angular is the same idea: match the tool to the scale of the job, rather than dragging heavy NgRx into every project. First figure out what kind of state you have, then choose — from a simple component field all the way to a full Redux store.

### First, separate the kinds of state

The key idea: **not all state is the same**, and different kinds need different tools.

- **Local UI state** (is a dropdown open, which tab is active) — lives in the component itself: a plain field or a \`signal\`.
- **Server state / cache** (data fetched from an API) — often better served by a \`@tanstack/query\`-style cache or a service with \`shareReplay\`, rather than "pulling" server data into a client store.
- **Global client state** (current user, theme, shopping cart) — this is what a store (a centralized state container) is actually for.

### The complexity ladder

Think of it as rungs: climb higher only when it genuinely hurts.

### Rung 1: local fields / Signals

The simplest. For isolated single-component state. Zero boilerplate. A **signal** is a reactive "cell" holding a value that notifies about its own changes.

### Rung 2: service with a BehaviorSubject / SignalStore

The "Service with a Subject" pattern: the service hides state inside and exposes an Observable or signal. This is enough for moderate shared state within a feature module.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

Here \`items\` is private state (the list of products), \`total\` is a **computed** (a derived value that recomputes automatically when \`items\` changes), and \`add\` is the update method. From the outside only \`total\` and the methods are visible; the state itself is encapsulated.

### Rung 3: @ngrx/signals SignalStore

A structured store with built-in support for computed values, methods, and entities (collections of records). You reach for it when a plain service is no longer enough but full Redux is still overkill.

### Rung 4: NgRx Store / NGXS

Full Redux: **actions** (event descriptions), **reducers** (pure state-transition functions), **effects** (handling side effects such as requests), DevTools, and time-travel (debugging by "rewinding" state). Justified for large apps with complex, widely shared state, multiple teams, and change-auditing requirements.

### Criteria for choosing

- **Scale and team size**: more people and features → you need stricter structure.
- **Async complexity**: many races and request cancellations → RxJS effects pay off.
- **Need for auditing / DevTools / time-travel** → an argument for NgRx.
- **Cost of boilerplate**: strict solutions require a lot of boilerplate — do not pay that price unnecessarily.

## ⚠️ Common pitfalls

- Setting up NgRx "for future growth" in a small project is a common mistake: lots of code, little benefit, the team drowns in ceremony.
- Pulling server data (API responses) into a global store and syncing it by hand is a bug source; use cache solutions (query libraries) for that.
- Mixing all kinds of state in one place — first separate local, server, and global state, and only then pick a tool for each.

## 🎯 Key takeaways

- First classify state: local UI / server cache / global client — each gets its own tool.
- The ladder: field or signal → service with a Subject/signal → SignalStore → NgRx. Climb only as needed.
- NgRx is justified by scale, complex async, and the need for DevTools/auditing — not boilerplate for its own sake.
- Rule: start simple, add complexity only when the pain is real.`
    }
  }
];
