import { InterviewQuestion } from '../interfaces/question.interface';

export const LIVE_CODING_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'lc-001',
    category: 'live-coding',
    level: 'Medium',
    tags: ['debounce', 'timers', 'closures'],
    question: {
      ru: 'Реализуйте функцию debounce(fn, wait, options). Вызов должен откладываться на wait мс после последнего обращения. Поддержите опции leading (вызвать сразу) и trailing (вызвать в конце), а также метод cancel(). Пример: окно ресайза, поиск по вводу.',
      en: 'Implement debounce(fn, wait, options). The call must be delayed until wait ms after the last invocation. Support leading (fire immediately) and trailing (fire at the end) options, plus a cancel() method. Example: window resize, search-as-you-type.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

\`debounce(fn, wait)\` возвращает новую функцию, которая **склеивает пачку частых вызовов в один**. Пока вас дёргают чаще, чем раз в \`wait\` мс, \`fn\` не выполняется — она сработает только после паузы. Всё состояние живёт в замыкании: один таймер плюс аргументы последнего вызова.

Аналогия: **лифт, который ждёт опоздавших**. Двери должны закрыться через \`wait\` секунд, но каждый новый забежавший пассажир сбрасывает отсчёт заново. Лифт поедет, только когда никто больше не подбегает. Опция \`leading\` — «поехать сразу с первым пассажиром», \`trailing\` — «поехать в конце, когда все зашли».

## Идея решения по шагам

1. Заводим в замыкании три переменные: \`timer\` — id текущего \`setTimeout\`, \`lastArgs\` — аргументы последнего вызова, \`lastThis\` — его контекст.
2. Пишем внутреннюю \`invoke()\`: делает \`fn.apply(lastThis, lastArgs)\` и сразу **обнуляет** \`lastArgs\`/\`lastThis\`. Это метка «вызов уже отработал, второй раз не надо».
3. В самой обёртке \`debounced(...args)\` первым делом сохраняем \`lastArgs = args\` и \`lastThis = this\` — чтобы отложенный вызов знал, с чем его звать.
4. Считаем \`callNow = leading && timer === null\`. Смысл: «нас просили сработать сразу, и прямо сейчас тишина — таймера нет».
5. \`clearTimeout(timer)\` гасит прошлый отложенный вызов, и ставим новый на \`wait\` мс. Внутри таймера: \`timer = null\`, и если \`trailing && lastArgs\` — зовём \`invoke()\`.
6. Если \`callNow\` — зовём \`invoke()\` прямо сейчас (уже после того, как таймер поставлен).
7. \`debounced.cancel\` чистит таймер и обнуляет всё состояние.

## Разбор кода

\`lastArgs\` играет двойную роль: это и «чем звать функцию», и **флаг «вызов ещё не отработал»**. Именно поэтому \`invoke()\` его зануляет, а в таймере стоит проверка \`if (trailing && lastArgs)\`. Без этого при \`leading + trailing\` одиночный вызов сработал бы дважды: сразу и ещё раз в конце окна.

Порядок в \`debounced\` тоже не случаен. Сначала считаем \`callNow\` (пока \`timer\` ещё старый), потом перезапускаем таймер, и только потом делаем \`invoke()\`. Если бы \`invoke()\` шёл до \`setTimeout\`, он занулил бы \`lastArgs\`, и планировщик уже не отличил бы «сработали сразу» от «ещё ничего не было».

\`lastThis\` нужен, потому что \`debounced\` могут повесить методом на объект: \`obj.onScroll = debounce(handler, 100)\`. Стрелка тут не подойдёт — нужен именно \`function\`, чтобы поймать динамический \`this\`.

## Сложность и edge cases

- **Время:** O(1) на вызов, **память:** O(1) — храним ровно один таймер и один набор аргументов, ничего не накапливаем.
- \`leading && trailing\` при **одиночном** вызове не должен давать двойное срабатывание — за это отвечает обнуление \`lastArgs\`.
- \`cancel()\` обязан и снять таймер, и сбросить состояние, иначе отложенный вызов «выстрелит» после размонтирования компонента.
- Оба флага выключены (\`leading: false, trailing: false\`) — функция не сработает никогда, это валидно, но стоит проговорить.
- \`wait = 0\` — вызов уезжает в макротаск, то есть всё равно асинхронно.

## Как рассуждать вслух

> Сначала уточню: нужны ли опции \`leading\` и \`cancel\` и надо ли возвращать результат. Дальше — классический debounce на замыкании: держу \`timer\`, \`lastArgs\` и \`lastThis\`. Каждый вызов сохраняет аргументы, гасит прошлый \`setTimeout\` и ставит новый на \`wait\` мс, поэтому пока вызовы идут чаще, чем \`wait\`, ничего не выполняется — как лифт, который ждёт опоздавших. Если \`leading\` включён и таймера сейчас нет, значит это первый вызов после тишины: вызываю сразу, а \`invoke()\` заодно зануляет \`lastArgs\`. Тогда trailing в конце окна не выстрелит второй раз — его отсечёт проверка \`if (trailing && lastArgs)\`. По сложности O(1) на вызов и O(1) памяти. Из краевых случаев назову одиночный вызов при \`leading + trailing\` и \`cancel()\`, который обязан и таймер снять, и состояние сбросить.

## Follow-up, которые зададут

- **Чем debounce отличается от throttle?** — throttle гарантирует вызов раз в N мс во время потока событий, debounce — только после паузы.
- **Как вернуть результат вызова?** — сам debounce ничего не возвращает; отдают промис, который резолвится при срабатывании trailing (у каждого вызова свой, либо один общий на окно).
- **Зачем \`lastThis\` и почему не стрелка?** — чтобы работать как метод объекта: стрелка потеряла бы динамический \`this\`.
- **Как это связать с React/Angular?** — обёртку надо создавать один раз (\`useMemo\`/поле класса) и звать \`cancel()\` при размонтировании, иначе будет утечка и вызов на мёртвом компоненте.
- **Добавьте \`maxWait\`** — запоминаем время первого вызова серии и, если прошло больше \`maxWait\`, вызываем принудительно; это ровно то, как Lodash строит throttle поверх debounce.`,
      en: `## In short: what they're asking for

\`debounce(fn, wait)\` returns a new function that **collapses a burst of calls into one**. While you are being poked more often than once per \`wait\` ms, \`fn\` never runs — it fires only after a pause. All the state lives in a closure: one timer plus the latest arguments.

Analogy: **a lift that waits for latecomers**. The doors should close after \`wait\` seconds, but every new passenger running in resets the countdown. The lift leaves only when nobody else is running. The \`leading\` option means "leave immediately with the first passenger", \`trailing\` means "leave at the end, once everyone is in".

## The idea, step by step

1. Keep three variables in the closure: \`timer\` — the id of the current \`setTimeout\`, \`lastArgs\` — the arguments of the latest call, \`lastThis\` — its context.
2. Write an inner \`invoke()\`: it does \`fn.apply(lastThis, lastArgs)\` and immediately **nulls** \`lastArgs\`/\`lastThis\`. That is the marker "this call has already run, don't repeat it".
3. In the wrapper \`debounced(...args)\`, first store \`lastArgs = args\` and \`lastThis = this\` so the deferred run knows what to call with.
4. Compute \`callNow = leading && timer === null\`. Meaning: "we were asked to fire immediately, and right now it's quiet — no timer".
5. \`clearTimeout(timer)\` kills the previous deferred run, then schedule a new one for \`wait\` ms. Inside the timer: set \`timer = null\` and, if \`trailing && lastArgs\`, call \`invoke()\`.
6. If \`callNow\`, call \`invoke()\` right away — after the timer has been scheduled.
7. \`debounced.cancel\` clears the timer and resets all state.

## Walking through the code

\`lastArgs\` plays two roles at once: it is both "what to call the function with" and a **flag meaning "the call hasn't run yet"**. That's exactly why \`invoke()\` nulls it and why the timer checks \`if (trailing && lastArgs)\`. Without that, a single call under \`leading + trailing\` would fire twice: once immediately and once at the end of the window.

The order inside \`debounced\` is deliberate too. First compute \`callNow\` (while \`timer\` still holds the old value), then restart the timer, and only then \`invoke()\`. If \`invoke()\` ran before \`setTimeout\`, it would null \`lastArgs\` and the scheduler could no longer tell "already fired" from "nothing happened yet".

\`lastThis\` matters because \`debounced\` may be attached as a method: \`obj.onScroll = debounce(handler, 100)\`. An arrow function would not work here — you need a real \`function\` to capture the dynamic \`this\`.

## Complexity and edge cases

- **Time:** O(1) per call, **memory:** O(1) — exactly one timer and one argument set, nothing accumulates.
- \`leading && trailing\` must not double-fire on a **single** call — the nulling of \`lastArgs\` prevents that.
- \`cancel()\` must clear the timer *and* reset state, otherwise a deferred call fires after the component unmounts.
- Both flags off (\`leading: false, trailing: false\`) means the function never runs — valid, but worth saying out loud.
- \`wait = 0\` still defers to a macrotask, so it remains asynchronous.

## How to think out loud

> First I'll clarify whether we need \`leading\`, a \`cancel()\` method, and whether the result has to be returned. Then it's a classic closure-based debounce: I keep \`timer\`, \`lastArgs\` and \`lastThis\`. Every call stores the arguments, clears the previous \`setTimeout\` and schedules a new one for \`wait\` ms, so while calls arrive faster than \`wait\` nothing runs — like a lift waiting for latecomers. If \`leading\` is on and there is no timer, this is the first call after silence: I invoke immediately, and \`invoke()\` also nulls \`lastArgs\`. That way the trailing call at the end of the window won't fire twice — \`if (trailing && lastArgs)\` filters it out. Complexity is O(1) per call and O(1) memory. For edge cases I'd mention a single call under \`leading + trailing\`, and \`cancel()\` which must clear both the timer and the state.

## Follow-ups they'll ask

- **How is debounce different from throttle?** — throttle guarantees a call every N ms during a stream of events; debounce fires only after a pause.
- **How do you return the result?** — debounce itself returns nothing; you expose a promise resolved on the trailing call (either one per call or one per window).
- **Why \`lastThis\`, why not an arrow function?** — so it works as an object method; an arrow would lose the dynamic \`this\`.
- **How does this map to React/Angular?** — create the wrapper once (\`useMemo\`/class field) and call \`cancel()\` on unmount, otherwise you leak and fire on a dead component.
- **Add \`maxWait\`** — remember when the burst started and force a call once \`maxWait\` has elapsed; that's exactly how Lodash builds throttle on top of debounce.`
    },
    codeSnippet: `function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    fn.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    const callNow = leading && timer === null;

    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) invoke();
    }, wait);

    if (callNow) invoke();
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = lastThis = null;
  };

  return debounced;
}`
  },
  {
    id: 'lc-002',
    category: 'live-coding',
    level: 'Medium',
    tags: ['throttle', 'timers', 'rate-limit'],
    question: {
      ru: 'Реализуйте throttle(fn, wait): функция вызывается не чаще одного раза в wait мс. Первый вызов — сразу, последующие в течение окна игнорируются, но последний вызов должен сработать в конце окна (trailing). Пример: обработка scroll.',
      en: 'Implement throttle(fn, wait): the function runs at most once per wait ms. The first call fires immediately, calls within the window are ignored, but the last one fires at the end of the window (trailing). Example: scroll handler.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

\`throttle(fn, wait)\` — обёртка, которая **пропускает не больше одного вызова за \`wait\` мс**. Первый вызов идёт сразу, всё, что пришло внутри окна, схлопывается в один отложенный вызов в конце. Приём — замыкание с меткой времени последнего запуска.

Аналогия: **турникет в метро**. Он пускает одного человека в секунду. Толпа напирает, но проходит ровно один — остальные ждут. Разница с debounce: debounce (лифт) ждёт полной тишины и может не сработать вообще, пока событий много; throttle стабильно выдаёт по вызову в такт.

## Идея решения по шагам

1. В замыкании держим: \`last\` — метку времени последнего фактического запуска (стартуем с \`0\`), \`timer\` — id отложенного вызова, \`lastArgs\` и \`lastThis\` — данные последнего обращения.
2. На каждом вызове берём \`now = Date.now()\` и считаем \`remaining = wait - (now - last)\` — «сколько ещё нельзя».
3. **Всегда** сохраняем \`lastArgs = args\` и \`lastThis = this\`, даже если сейчас вызывать нельзя: именно эти аргументы уйдут в trailing.
4. Если \`remaining <= 0\` — окно истекло: гасим висящий \`timer\` (если был), обновляем \`last = now\` и вызываем \`fn\` немедленно.
5. Иначе, если таймера ещё нет (\`!timer\`), ставим \`setTimeout\` ровно на \`remaining\` мс. Внутри: обновляем \`last = Date.now()\`, \`timer = null\` и вызываем \`fn\` с последними сохранёнными аргументами.
6. Если таймер уже стоит — не делаем ничего: он и так выстрелит с самыми свежими данными.
7. \`throttled.cancel\` снимает таймер и сбрасывает \`last = 0\`.

## Разбор кода

Ключевая строка — \`const remaining = wait - (now - last);\`. Это «сколько миллисекунд ещё осталось до открытия турникета». Отрицательное или нулевое значение = можно проходить сразу.

Условие \`else if (!timer)\` — самая важная деталь. Без него каждый scroll-эвент ставил бы новый таймер, и в конце вы получили бы шквал вызовов вместо одного. Планируем **только первый** отложенный вызов в окне, а свежесть данных обеспечивается тем, что \`lastArgs\` перезаписываются на каждом обращении.

Обратите внимание: \`lastArgs\` присваиваются **до** ветвления, а не внутри веток — так один и тот же код обслуживает и немедленный, и отложенный путь.

В немедленной ветке стоит \`clearTimeout(timer)\`. Он нужен на случай, когда таймер был запланирован, но события прекратились, а потом пришло новое уже после конца окна — иначе получили бы два вызова подряд.

## Сложность и edge cases

- **Время:** O(1) на вызов, **память:** O(1) — храним число, id таймера и один набор аргументов.
- Без trailing-логики теряется «хвостовое» событие: пользователь домотал скролл, а последний пересчёт не произошёл. Это самая частая ошибка на собеседовании.
- Первый вызов при \`last = 0\` всегда проходит сразу, потому что \`now - 0\` заведомо больше \`wait\`.
- Двойное срабатывание на границе окна: немедленный вызов обязан снять уже запланированный таймер.
- \`cancel()\` нужен при размонтировании, иначе отложенный вызов уйдёт в мёртвый компонент.

## Как рассуждать вслух

> Уточню, нужны ли leading и trailing — по умолчанию сделаю оба. Держу в замыкании \`last\` — время последнего запуска, плюс \`timer\`, \`lastArgs\` и \`lastThis\`. На каждом вызове считаю \`remaining = wait - (now - last)\`: сколько ещё ждать. Аргументы сохраняю всегда, до всякого ветвления. Если \`remaining <= 0\` — окно закрылось, гашу висящий таймер, обновляю \`last\` и зову \`fn\` сразу. Иначе ставлю \`setTimeout\` на остаток окна, но только если таймера ещё нет — иначе на каждом скролл-эвенте копились бы таймеры. Это турникет: один проход в такт, остальные схлопываются в последний. Сложность O(1) по времени и памяти. Из краевого — не потерять хвостовое событие и не выстрелить дважды на границе окна.

## Follow-up, которые зададут

- **Чем throttle отличается от debounce?** — throttle выдаёт вызовы равномерно во время потока событий, debounce ждёт полной паузы и может не сработать, пока события идут.
- **Реализуйте через \`requestAnimationFrame\`** — вместо таймера ставим флаг и \`requestAnimationFrame\`; частота привяжется к кадрам (~60fps) и не будет рассинхрона с рендером.
- **Как объединить с debounce в одну реализацию?** — Lodash так и делает: throttle это debounce с \`maxWait === wait\`.
- **Что если \`Date.now()\` прыгнет (перевод часов)?** — берите \`performance.now()\`, он монотонный.
- **Нужен ли вариант без leading?** — да, для «не дёргать сервер сразу»: тогда первый вызов тоже уходит в отложенную ветку.`,
      en: `## In short: what they're asking for

\`throttle(fn, wait)\` is a wrapper that **lets at most one call through per \`wait\` ms**. The first call goes straight through; everything that arrives inside the window collapses into a single deferred call at the end. The trick is a closure holding the timestamp of the last run.

Analogy: **a turnstile**. It lets one person through per second. The crowd pushes, but exactly one passes — the rest wait. The difference from debounce: debounce (the lift) waits for complete silence and may never fire while events keep coming; throttle steadily emits one call per beat.

## The idea, step by step

1. Keep in the closure: \`last\` — the timestamp of the last actual run (start at \`0\`), \`timer\` — the deferred call id, \`lastArgs\` and \`lastThis\` — data from the most recent call.
2. On every call take \`now = Date.now()\` and compute \`remaining = wait - (now - last)\` — "how long we still can't run".
3. **Always** store \`lastArgs = args\` and \`lastThis = this\`, even if we can't run now: those are the arguments the trailing call will use.
4. If \`remaining <= 0\` the window has expired: clear any pending \`timer\`, set \`last = now\` and call \`fn\` immediately.
5. Otherwise, if there is no timer yet (\`!timer\`), schedule a \`setTimeout\` for exactly \`remaining\` ms. Inside: set \`last = Date.now()\`, \`timer = null\`, and call \`fn\` with the stored arguments.
6. If a timer already exists, do nothing — it will fire with the freshest data anyway.
7. \`throttled.cancel\` clears the timer and resets \`last = 0\`.

## Walking through the code

The key line is \`const remaining = wait - (now - last);\`. It reads as "milliseconds left until the turnstile opens". Zero or negative means go right now.

The \`else if (!timer)\` guard is the most important detail. Without it every scroll event would schedule another timer and you'd get a burst of calls at the end instead of one. We schedule **only the first** deferred call in a window; freshness comes from \`lastArgs\` being overwritten on every call.

Note that \`lastArgs\` is assigned **before** the branching, not inside the branches — so one piece of code serves both the immediate and the deferred path.

The immediate branch contains \`clearTimeout(timer)\`. It covers the case where a timer was scheduled, events stopped, and a new one arrived after the window closed — otherwise you'd get two calls back to back.

## Complexity and edge cases

- **Time:** O(1) per call, **memory:** O(1) — a number, a timer id and one argument set.
- Without trailing logic the final event is dropped: the user finished scrolling and the last recalculation never happened. This is the classic interview miss.
- The very first call with \`last = 0\` always passes immediately, since \`now - 0\` is certainly greater than \`wait\`.
- Double firing on the window boundary: the immediate branch must cancel an already scheduled timer.
- \`cancel()\` is needed on unmount, otherwise the deferred call lands on a dead component.

## How to think out loud

> I'll check whether leading and trailing are both required — by default I'll do both. I keep \`last\` (time of the last run) in a closure, plus \`timer\`, \`lastArgs\` and \`lastThis\`. On each call I compute \`remaining = wait - (now - last)\`: how long we still have to wait. I store the arguments unconditionally, before any branching. If \`remaining <= 0\` the window is closed: clear any pending timer, update \`last\` and call \`fn\` right away. Otherwise I schedule a \`setTimeout\` for the leftover window, but only if no timer exists yet — otherwise every scroll event would pile up timers. It's a turnstile: one person per beat, everyone else collapses into the last one. Complexity is O(1) in time and memory. Edge cases: don't drop the trailing event and don't fire twice on the boundary.

## Follow-ups they'll ask

- **How is throttle different from debounce?** — throttle emits calls evenly during a stream of events; debounce waits for a full pause and may never fire while events keep arriving.
- **Implement it with \`requestAnimationFrame\`** — replace the timer with a flag plus \`requestAnimationFrame\`; the rate ties to frames (~60fps) with no desync against paint.
- **How do throttle and debounce unify?** — Lodash treats throttle as debounce with \`maxWait === wait\`.
- **What if \`Date.now()\` jumps (clock change)?** — use \`performance.now()\`, it's monotonic.
- **Do you ever want a no-leading variant?** — yes, for "don't hit the server instantly": then the first call also goes through the deferred branch.`
    },
    codeSnippet: `function throttle(fn, wait) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn.apply(lastThis, lastArgs);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  }

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    last = 0;
  };

  return throttled;
}`
  },
  {
    id: 'lc-003',
    category: 'live-coding',
    level: 'Medium',
    tags: ['promises', 'polyfill', 'concurrency'],
    question: {
      ru: 'Напишите полифил Promise.all(iterable). Он принимает массив промисов (или значений) и возвращает промис, который резолвится массивом результатов в исходном порядке или реджектится первой же ошибкой.',
      en: 'Write a polyfill for Promise.all(iterable). It takes an array of promises (or values) and returns a promise that resolves with the results array in original order, or rejects with the first error.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Нужно запустить пачку асинхронных задач **параллельно**, дождаться всех и вернуть результаты **в том порядке, в каком задачи лежали на входе**. Если хоть одна упала — сразу отдать её ошибку. Приём: заранее выделенный массив результатов плюс счётчик оставшихся.

Аналогия: **гардероб с номерками**. Вы сдали 5 пальто, каждому дали свой номер. Пальто выдают в случайном порядке, но вы кладёте каждое **на его полку по номеру**. Когда полок без пальто не осталось (счётчик дошёл до нуля) — можно уходить.

## Идея решения по шагам

1. Возвращаем \`new Promise((resolve, reject) => { ... })\`.
2. Внутри превращаем вход в массив: \`const items = Array.from(iterable)\` — задача говорит про iterable, а не только про массив.
3. Готовим \`const results = new Array(items.length)\` — те самые «полки по номерам» — и \`let remaining = items.length\` — счётчик незакрытых задач.
4. Если \`remaining === 0\`, сразу \`resolve(results)\` и выходим: пустой вход не должен зависнуть навсегда.
5. Идём по \`items.forEach((item, i) => ...)\`. Индекс \`i\` — это и есть номерок.
6. Каждый элемент оборачиваем: \`Promise.resolve(item).then(onOk, reject)\`. Обёртка нужна, чтобы обычные значения и «чужие» thenable тоже работали.
7. В \`onOk\`: пишем \`results[i] = value\`, уменьшаем \`remaining\`, и если он стал нулём — \`resolve(results)\`.
8. В качестве обработчика ошибки передаём сам \`reject\` — первая же ошибка «закорачивает» весь агрегат.

## Разбор кода

Почему **счётчик**, а не \`results.length\`? Потому что \`results\` создан заранее нужной длины, и его \`length\` не меняется. А проверять «все ли ячейки заполнены» перебором было бы O(n) на каждое завершение, то есть O(n²) суммарно. Счётчик даёт O(1).

Почему запись **по индексу**, а не \`results.push(value)\`? \`push\` записал бы результаты в порядке завершения — быстрый запрос обогнал бы медленный, и порядок сломался бы. Индекс \`i\` из \`forEach\` фиксирует место заранее.

Двухаргументный \`.then(onOk, reject)\` вместо \`.then(onOk).catch(reject)\` — тонкость: во втором варианте \`catch\` поймал бы и ошибку, брошенную внутри самого \`onOk\`. Здесь нам нужен только провал исходного промиса.

Важное свойство: цикл **запускает всё сразу**, промисы уже выполняются параллельно. Мы лишь подписываемся на их завершение.

Повторный \`resolve\`/\`reject\` безопасен: промис фиксируется первым вызовом, остальные игнорируются молча — поэтому дополнительного флага «уже завершились» не нужно.

## Сложность и edge cases

- **Время:** O(n) на обход и подписку, **память:** O(n) — массив результатов на n элементов. Общее время ожидания — это время самого медленного промиса, а не сумма.
- Пустой вход → немедленный \`resolve([])\`; без раннего \`return\` промис завис бы навсегда.
- Первый reject закорачивает результат, но **остальные промисы продолжают выполняться** — отменить их нельзя, и их ошибки могут стать unhandled rejection.
- «Сырые» значения (\`promiseAll([1, 2, p])\`) обязаны проходить через \`Promise.resolve\`.
- Дырки в \`results\` невозможны: пока счётчик не ноль, мы не резолвим.
- Очень большой вход — вы одномоментно открываете n соединений; тут интервьюер обычно просит лимит параллельности.

## Как рассуждать вслух

> Уточню, что на входе может быть любой iterable и что элементы могут быть не промисами. Возвращаю новый промис. Внутри делаю \`Array.from\`, завожу \`results\` нужной длины и счётчик \`remaining\`. Пустой вход резолвлю сразу, иначе промис зависнет. Дальше \`forEach\` с индексом: каждый элемент оборачиваю в \`Promise.resolve\`, чтобы работали и обычные значения, и подписываюсь. В успехе пишу \`results[i] = value\` — именно по индексу, а не push, иначе порядок будет по скорости, а не по входу. Это как гардероб: пальто выдают вразнобой, но каждое ложится на свою полку. Уменьшаю счётчик и на нуле резолвлю. В ошибку передаю сам \`reject\` — первая же ошибка закорачивает всё. Сложность O(n) по времени и памяти, ждём столько, сколько самый медленный.

## Follow-up, которые зададут

- **Чем отличается от \`allSettled\`?** — \`allSettled\` никогда не реджектится и отдаёт дескрипторы \`{ status, value | reason }\` по каждому элементу.
- **Что с порядком?** — \`all\` гарантирует порядок **входа**, а не порядок завершения; это и обеспечивает запись по индексу.
- **Отменяются ли остальные промисы при первом reject?** — нет, они продолжают работать; для реальной отмены нужен \`AbortController\`.
- **Реализуйте \`Promise.race\` и \`Promise.any\`** — \`race\`: подписать все на общий \`resolve\`/\`reject\`, первый выигрывает. \`any\`: наоборот, первый успех резолвит, а счётчик ошибок при нуле отдаёт \`AggregateError\`.
- **Добавьте лимит параллельности (пул на N)** — держим указатель на следующую задачу и запускаем не более N воркеров, каждый по завершении берёт следующий индекс.
- **Почему счётчик, а не проверка массива?** — иначе O(n) проверка на каждое завершение, суммарно O(n²).`,
      en: `## In short: what they're asking for

Run a batch of async tasks **in parallel**, wait for all of them, and return the results **in the order the tasks appeared in the input**. If any one fails, hand back that error immediately. The trick: a pre-sized results array plus a counter of what's left.

Analogy: **a cloakroom with numbered tags**. You hand in five coats, each gets a number. Coats come back in random order, but you put each one **on its own numbered shelf**. When no shelf is empty (the counter hits zero) you can leave.

## The idea, step by step

1. Return \`new Promise((resolve, reject) => { ... })\`.
2. Inside, materialise the input: \`const items = Array.from(iterable)\` — the spec says iterable, not just array.
3. Prepare \`const results = new Array(items.length)\` — the numbered shelves — and \`let remaining = items.length\`, the count of unfinished tasks.
4. If \`remaining === 0\`, \`resolve(results)\` and return right away: an empty input must not hang forever.
5. Loop with \`items.forEach((item, i) => ...)\`. The index \`i\` is the cloakroom tag.
6. Wrap each item: \`Promise.resolve(item).then(onOk, reject)\`. The wrap is what makes plain values and foreign thenables work.
7. In \`onOk\`: write \`results[i] = value\`, decrement \`remaining\`, and when it hits zero call \`resolve(results)\`.
8. Pass \`reject\` itself as the error handler — the first failure short-circuits the whole aggregate.

## Walking through the code

Why a **counter** rather than \`results.length\`? Because \`results\` was created at full length up front, so its \`length\` never changes. And scanning "are all slots filled?" would be O(n) per completion, i.e. O(n²) overall. A counter makes it O(1).

Why write **by index** instead of \`results.push(value)\`? \`push\` would record results in completion order — a fast request would overtake a slow one and the ordering would break. The \`forEach\` index reserves the slot ahead of time.

Two-argument \`.then(onOk, reject)\` instead of \`.then(onOk).catch(reject)\` is a subtlety: the second form would also catch an error thrown inside \`onOk\`. Here we only care about the source promise failing.

Important property: the loop **starts everything at once** — the promises are already running in parallel. We merely subscribe to their completion.

Calling \`resolve\`/\`reject\` twice is harmless: a promise settles on the first call and silently ignores the rest, so no extra "already done" flag is needed.

## Complexity and edge cases

- **Time:** O(n) to iterate and subscribe, **memory:** O(n) for the results array. Total wall time equals the slowest promise, not the sum.
- Empty input → immediate \`resolve([])\`; without the early \`return\` the promise would hang forever.
- The first reject short-circuits the result, but **the other promises keep running** — you cannot cancel them, and their failures may surface as unhandled rejections.
- Raw values (\`promiseAll([1, 2, p])\`) must go through \`Promise.resolve\`.
- Holes in \`results\` are impossible: we don't resolve until the counter reaches zero.
- Very large input means opening n connections at once — this is where the interviewer usually asks for a concurrency limit.

## How to think out loud

> I'll confirm the input can be any iterable and may contain non-promises. I return a new promise. Inside I do \`Array.from\`, allocate \`results\` at full length and a \`remaining\` counter. An empty input resolves immediately, otherwise the promise would hang. Then \`forEach\` with the index: I wrap each item in \`Promise.resolve\` so plain values work, and subscribe. On success I write \`results[i] = value\` — by index, not push, otherwise the order follows speed instead of input. It's a cloakroom: coats come back in any order but each lands on its own shelf. I decrement the counter and resolve at zero. For the failure handler I pass \`reject\` directly, so the first error short-circuits everything. O(n) time and memory, and we wait as long as the slowest promise.

## Follow-ups they'll ask

- **How is it different from \`allSettled\`?** — \`allSettled\` never rejects; it returns \`{ status, value | reason }\` descriptors for every item.
- **What about ordering?** — \`all\` guarantees **input** order, not completion order; that's exactly why we write by index.
- **Do the remaining promises get cancelled on the first reject?** — no, they keep running; real cancellation needs an \`AbortController\`.
- **Implement \`Promise.race\` and \`Promise.any\`** — \`race\`: subscribe everything to a shared \`resolve\`/\`reject\`, first one wins. \`any\`: the first success resolves, and when the failure counter empties you throw \`AggregateError\`.
- **Add a concurrency limit (pool of N)** — keep a pointer to the next task and run at most N workers, each picking up the next index when it finishes.
- **Why a counter instead of checking the array?** — otherwise it's an O(n) check per completion, O(n²) overall.`
    },
    codeSnippet: `function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      resolve(results);
      return;
    }

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => {
          results[i] = value;
          remaining -= 1;
          if (remaining === 0) resolve(results);
        },
        reject
      );
    });
  });
}`
  },
  {
    id: 'lc-004',
    category: 'live-coding',
    level: 'Medium',
    tags: ['promises', 'polyfill', 'error-handling'],
    question: {
      ru: 'Реализуйте полифил Promise.allSettled(iterable). Он всегда резолвится массивом объектов { status: "fulfilled", value } или { status: "rejected", reason } — по одному на каждый входной промис, в исходном порядке.',
      en: 'Implement a polyfill for Promise.allSettled(iterable). It always resolves with an array of { status: "fulfilled", value } or { status: "rejected", reason } objects — one per input promise, in original order.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

То же, что \`all\`, но с одним принципиальным отличием: **результат никогда не падает**. Дождаться всех, и про каждого рассказать — получилось или нет. Приём тот же: массив «полок» по индексам и счётчик оставшихся.

Аналогия: **перекличка в классе**. Учитель не уходит, пока не отметил каждого: «пришёл» или «болеет». Причина отсутствия записывается в журнал, но перекличку не срывает. \`all\` — это наоборот прораб, который бросает всё при первой же проблеме.

## Идея решения по шагам

1. Возвращаем \`new Promise((resolve) => { ... })\` — обратите внимание, \`reject\` тут даже не нужен, его можно не принимать.
2. \`const items = Array.from(iterable)\`, \`const results = new Array(items.length)\`, \`let remaining = items.length\`.
3. Пустой вход → \`resolve(results)\` и \`return\`.
4. Заводим общий хелпер \`settle(i, descriptor)\`: пишет \`results[i] = descriptor\`, уменьшает \`remaining\`, и на нуле — \`resolve(results)\`. Он один на оба исхода.
5. В \`forEach\` подписываемся двумя обработчиками: успех → \`settle(i, { status: 'fulfilled', value })\`, ошибка → \`settle(i, { status: 'rejected', reason })\`.
6. Всё. Ни в одной ветке нет \`reject\` — поэтому агрегат не может упасть.

## Разбор кода

Главная идея — вынести общую часть в \`settle\`. И успех, и провал делают ровно одно и то же: положить дескриптор на свою полку и убавить счётчик. Отличаются только формой объекта. Если этого не сделать, вы дважды напишете один и тот же декремент и дважды рискуете забыть проверку на ноль.

Обратите внимание на **имена полей**: у успеха это \`value\`, у провала — \`reason\`. Это спецификация, интервьюер проверяет именно их. И у объекта присутствует **только одно** из двух полей, а не оба со значением \`undefined\`.

\`Promise.resolve(item)\` по-прежнему нужен: вход может содержать обычные значения, а у них нет \`.then\`.

Двухаргументный \`.then(onOk, onErr)\` здесь особенно уместен: он гарантирует, что если бы \`onOk\` бросил исключение, оно не превратилось бы в «rejected» для того же элемента.

## Сложность и edge cases

- **Время:** O(n), **память:** O(n) — по дескриптору на элемент. Ждём столько, сколько самый медленный промис.
- Пустой вход → \`resolve([])\` немедленно; без раннего \`return\` промис не осел бы никогда.
- Любой reject **не прерывает** остальные — все результаты собираются, unhandled rejection не возникает, потому что каждая ошибка обработана.
- Не-thenable значения → всегда \`{ status: 'fulfilled', value }\`.
- Все промисы упали — всё равно \`resolve\`, просто массив целиком из \`rejected\`.

## Как рассуждать вслух

> Это \`all\`, из которого выкинули короткое замыкание. Возвращаю новый промис — причём \`reject\` мне не понадобится вообще, агрегат по спецификации не падает. Внутри \`Array.from\`, массив \`results\` нужной длины и счётчик \`remaining\`. Пустой вход резолвлю сразу. Дальше вынесу общий \`settle(i, descriptor)\`: кладёт дескриптор по индексу, убавляет счётчик, на нуле резолвит — успех и провал делают одно и то же, различается только форма объекта: \`{ status: 'fulfilled', value }\` либо \`{ status: 'rejected', reason }\`. Подписываюсь двумя колбэками через \`.then(onOk, onErr)\`. Это перекличка: отмечаем каждого, причина отсутствия попадает в журнал, но перекличку не срывает. Сложность O(n) по времени и памяти.

## Follow-up, которые зададут

- **Когда выбрать \`allSettled\` вместо \`all\`?** — когда нужно дождаться всех операций и обработать частичные сбои: например, несколько независимых виджетов на дашборде.
- **Как реализовать без счётчика?** — через \`Promise.all\` от промисов, обёрнутых так, что они никогда не реджектятся: \`p.then(v => ({status:'fulfilled', value:v}), e => ({status:'rejected', reason:e}))\`.
- **Точные имена полей?** — \`value\` для успеха, \`reason\` для провала; присутствует ровно одно из них.
- **Возникнет ли unhandled rejection?** — нет, каждая ошибка перехвачена вторым колбэком.
- **Как отличить «все упали» от «все прошли»?** — просто отфильтровать результат по \`status\`; агрегат об этом ничего не сообщает.`,
      en: `## In short: what they're asking for

Same as \`all\` but with one crucial difference: **the result never fails**. Wait for everyone and report, for each one, whether it worked. Same trick: an indexed array of shelves plus a counter of what's left.

Analogy: **a roll call in class**. The teacher doesn't leave until every name is marked "present" or "off sick". The reason for an absence goes in the register but doesn't abort the roll call. \`all\` is the opposite — a foreman who downs tools at the first problem.

## The idea, step by step

1. Return \`new Promise((resolve) => { ... })\` — note we don't even need \`reject\`, so don't accept it.
2. \`const items = Array.from(iterable)\`, \`const results = new Array(items.length)\`, \`let remaining = items.length\`.
3. Empty input → \`resolve(results)\` and \`return\`.
4. Write one shared helper \`settle(i, descriptor)\`: it stores \`results[i] = descriptor\`, decrements \`remaining\`, and resolves at zero. One helper for both outcomes.
5. In \`forEach\`, subscribe with two handlers: success → \`settle(i, { status: 'fulfilled', value })\`, failure → \`settle(i, { status: 'rejected', reason })\`.
6. That's it. Neither branch calls \`reject\`, so the aggregate cannot fail.

## Walking through the code

The main idea is factoring the shared part into \`settle\`. Success and failure do exactly the same thing: put a descriptor on its shelf and decrement the counter. Only the shape of the object differs. Skip this and you'll write the same decrement twice and risk forgetting the zero check twice.

Note the **field names**: \`value\` for success, \`reason\` for failure. That's the spec, and it's exactly what the interviewer checks. Also, the object carries **only one** of the two fields, not both with one set to \`undefined\`.

\`Promise.resolve(item)\` is still needed: the input may hold plain values that have no \`.then\`.

The two-argument \`.then(onOk, onErr)\` is especially apt here: it guarantees that if \`onOk\` threw, the throw wouldn't be re-labelled as a rejection of the same item.

## Complexity and edge cases

- **Time:** O(n), **memory:** O(n) — one descriptor per item. Wall time equals the slowest promise.
- Empty input → immediate \`resolve([])\`; without the early \`return\` the promise would never settle.
- A rejection **never aborts** the rest — every result is collected, and no unhandled rejection appears because every error is handled.
- Non-thenable values always produce \`{ status: 'fulfilled', value }\`.
- If everything rejects it still resolves — just with an array entirely of \`rejected\` entries.

## How to think out loud

> This is \`all\` with the short-circuit removed. I return a new promise — and I won't need \`reject\` at all, since by spec the aggregate never fails. Inside: \`Array.from\`, a \`results\` array at full length, a \`remaining\` counter. Empty input resolves immediately. Then I factor out \`settle(i, descriptor)\`: store by index, decrement, resolve at zero — success and failure do the same thing and differ only in shape, \`{ status: 'fulfilled', value }\` versus \`{ status: 'rejected', reason }\`. I subscribe with both callbacks via \`.then(onOk, onErr)\`. It's a roll call: everyone gets marked, an absence reason goes into the register but doesn't stop the process. O(n) in time and memory.

## Follow-ups they'll ask

- **When choose \`allSettled\` over \`all\`?** — when you must wait for every operation and handle partial failures, e.g. several independent widgets on a dashboard.
- **Can you build it without a counter?** — yes, via \`Promise.all\` over promises wrapped so they never reject: \`p.then(v => ({status:'fulfilled', value:v}), e => ({status:'rejected', reason:e}))\`.
- **Exact field names?** — \`value\` on success, \`reason\` on failure; exactly one of them is present.
- **Will there be an unhandled rejection?** — no, every error is caught by the second callback.
- **How do you tell "all failed" from "all passed"?** — filter the result by \`status\`; the aggregate itself says nothing about it.`
    },
    codeSnippet: `function promiseAllSettled(iterable) {
  return new Promise((resolve) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      resolve(results);
      return;
    }

    const settle = (i, descriptor) => {
      results[i] = descriptor;
      remaining -= 1;
      if (remaining === 0) resolve(results);
    };

    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => settle(i, { status: 'fulfilled', value }),
        (reason) => settle(i, { status: 'rejected', reason })
      );
    });
  });
}`
  },
  {
    id: 'lc-005',
    category: 'live-coding',
    level: 'Medium',
    tags: ['promises', 'polyfill', 'race'],
    question: {
      ru: 'Реализуйте полифилы Promise.race(iterable) и Promise.any(iterable). race резолвится/реджектится первым завершившимся промисом. any резолвится первым успешным, а если все упали — реджектится AggregateError.',
      en: 'Implement polyfills for Promise.race(iterable) and Promise.any(iterable). race settles with the first promise to finish. any resolves with the first fulfilled promise, and if all reject it rejects with an AggregateError.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Обе функции — про «кто первый». \`race\` берёт **первого пришедшего к финишу, неважно как** — победил он или сломал ногу. \`any\` берёт **первого, кто реально победил**, а падения терпит до последнего.

Аналогия: \`race\` — это забег, где судья фиксирует того, кто первым пересёк линию или первым сошёл с дистанции. \`any\` — это ключи от квартиры: перебираем связку, первый подошедший ключ и есть ответ; если не подошёл ни один — жалуемся сразу на всю связку (\`AggregateError\`).

Главный приём, который делает обе функции такими короткими: **промис оседает ровно один раз**. Можно смело вызывать \`resolve\` десять раз — сработает только первый, остальные молча игнорируются. Флаг «уже завершились» не нужен.

## Идея решения по шагам

**race:**
1. \`return new Promise((resolve, reject) => { ... })\`.
2. Просто пройти по входу: \`for (const item of iterable)\`.
3. Каждому элементу сказать \`Promise.resolve(item).then(resolve, reject)\` — подписать их **все на один и тот же** внешний \`resolve\`/\`reject\`.
4. Больше ничего. Кто первый дёрнет — тот и зафиксировал результат.

**any:**
1. \`return new Promise((resolve, reject) => { ... })\`.
2. \`const items = Array.from(iterable)\`, \`const errors = new Array(items.length)\` — полки под причины, \`let remaining = items.length\` — счётчик ещё живых надежд.
3. Пустой вход → сразу \`reject(new AggregateError([], 'All promises were rejected'))\` и \`return\`.
4. По каждому элементу: успех → сразу внешний \`resolve\` (передаём его напрямую). Ошибка → пишем \`errors[i] = err\`, убавляем \`remaining\`.
5. Когда \`remaining === 0\` — надежд не осталось: \`reject(new AggregateError(errors, '...'))\`.

## Разбор кода

В \`race\` обратите внимание, что \`resolve\` и \`reject\` передаются **как есть**, без обёрток в стрелки. Это и есть весь алгоритм: «подписать всех на общий финиш». Никаких счётчиков — потому что нам не нужно знать, сколько промисов ещё бегут.

В \`any\` роли зеркальны: \`resolve\` передаётся напрямую (первый успех выигрывает мгновенно), а вот ошибка требует накопления. Ошибки пишутся **по индексу**, а не через \`push\` — чтобы \`AggregateError.errors\` шёл в порядке входа, а не в порядке падения.

Ранний \`return\` в пустом случае — не косметика. У \`any\` пустой вход должен упасть немедленно, а вот \`race([])\` по спецификации **зависает навсегда**: цикл ничего не подписал, никто никогда не дёрнет \`resolve\`. И это правильное поведение, которое надо проговорить.

\`AggregateError(errors, message)\` — стандартный конструктор: первый аргумент это итерируемое с ошибками, они лягут в поле \`.errors\`.

## Сложность и edge cases

- **Время:** O(n) на подписку в обоих случаях. **Память:** \`race\` — O(1) собственного состояния, \`any\` — O(n) под массив причин.
- \`race([])\` не оседает никогда — по спецификации, не баг.
- \`any([])\` реджектится немедленно с пустым \`AggregateError\`.
- Оба варианта **не отменяют** проигравшие промисы — они продолжают работать в фоне.
- \`race\` с уже завершившимся промисом в списке зафиксируется на следующем тике микротасков, а не синхронно.
- В \`any\` не-thenable значение (например, число) выигрывает сразу, потому что \`Promise.resolve\` делает его успешным.

## Как рассуждать вслух

> Обе строятся на том, что промис оседает один раз — повторные \`resolve\` игнорируются, поэтому флаг «уже завершились» не нужен. Для \`race\` этого достаточно: прохожу по входу и подписываю каждый элемент через \`Promise.resolve(item).then(resolve, reject)\` на один и тот же внешний финиш. Кто первый дёрнул, тот и выиграл, неважно, успехом или ошибкой. Для \`any\` логика зеркальная: \`resolve\` передаю напрямую — первый успех выигрывает, а ошибки надо копить. Завожу массив \`errors\` по длине входа, пишу причины по индексу, чтобы сохранить порядок, и счётчик \`remaining\`. Когда он дошёл до нуля, надежд не осталось — реджекчу \`AggregateError\`. Отдельно проговорю: \`any([])\` падает сразу, а \`race([])\` по спецификации висит вечно. Сложность O(n).

## Follow-up, которые зададут

- **В чём разница \`race\` и \`any\`?** — \`race\` реагирует на первое завершение любого рода, \`any\` игнорирует ошибки, пока есть надежда на успех.
- **Что делает \`race([])\`?** — висит вечно; ничего не подписано, промис не оседает. Это поведение по спецификации.
- **Почему в \`race\` не нужен счётчик и флаг?** — потому что промис фиксируется первым \`resolve\`/\`reject\`, дальнейшие вызовы бесплатно игнорируются.
- **Отменяются ли проигравшие?** — нет; для отмены нужен \`AbortController\`, пробрасываемый в каждую задачу.
- **Как сделать таймаут на запрос?** — \`race([fetchPromise, rejectAfter(ms)])\`; это самое частое применение \`race\`.
- **Зачем ошибки по индексу, а не \`push\`?** — чтобы \`AggregateError.errors\` соответствовал порядку входа, а не порядку падений.`,
      en: `## In short: what they're asking for

Both functions are about "who's first". \`race\` takes **the first one to reach the finish line, however it got there** — winner or stretcher. \`any\` takes **the first one that actually won**, and tolerates failures to the very end.

Analogy: \`race\` is a sprint where the judge records whoever first crosses the line or first drops out. \`any\` is a keyring: try keys one by one, the first key that fits is the answer; if none fits, you complain about the whole bunch at once (\`AggregateError\`).

The key trick that makes both so short: **a promise settles exactly once**. You can call \`resolve\` ten times — only the first counts, the rest are silently ignored. No "already done" flag needed.

## The idea, step by step

**race:**
1. \`return new Promise((resolve, reject) => { ... })\`.
2. Just walk the input: \`for (const item of iterable)\`.
3. For each item call \`Promise.resolve(item).then(resolve, reject)\` — subscribe them **all to the same** outer \`resolve\`/\`reject\`.
4. Nothing else. Whoever fires first fixes the result.

**any:**
1. \`return new Promise((resolve, reject) => { ... })\`.
2. \`const items = Array.from(iterable)\`, \`const errors = new Array(items.length)\` — shelves for reasons — and \`let remaining = items.length\`, the count of surviving hopes.
3. Empty input → immediately \`reject(new AggregateError([], 'All promises were rejected'))\` and \`return\`.
4. Per item: success → the outer \`resolve\` directly. Failure → write \`errors[i] = err\` and decrement \`remaining\`.
5. When \`remaining === 0\` no hope is left: \`reject(new AggregateError(errors, '...'))\`.

## Walking through the code

In \`race\`, note that \`resolve\` and \`reject\` are passed **as-is**, not wrapped in arrows. That is the entire algorithm: "subscribe everyone to a shared finish line". No counters, because we never need to know how many are still running.

In \`any\` the roles mirror: \`resolve\` is passed straight through (the first success wins instantly), while failures need accumulating. Errors are stored **by index**, not via \`push\`, so \`AggregateError.errors\` follows input order rather than failure order.

The early \`return\` in the empty case isn't cosmetic. \`any\` on an empty input must fail immediately, whereas \`race([])\` per spec **hangs forever**: the loop subscribed nothing, so nobody will ever call \`resolve\`. That's correct behaviour and worth saying out loud.

\`AggregateError(errors, message)\` is the standard constructor: the first argument is an iterable of errors, which lands in the \`.errors\` property.

## Complexity and edge cases

- **Time:** O(n) to subscribe in both cases. **Memory:** \`race\` — O(1) of its own state, \`any\` — O(n) for the reasons array.
- \`race([])\` never settles — per spec, not a bug.
- \`any([])\` rejects immediately with an empty \`AggregateError\`.
- Neither variant **cancels** the losers — they keep running in the background.
- \`race\` with an already-settled promise in the list still settles on the next microtask tick, not synchronously.
- In \`any\`, a non-thenable value (say, a number) wins immediately because \`Promise.resolve\` makes it fulfilled.

## How to think out loud

> Both rely on the fact that a promise settles once — repeat \`resolve\` calls are ignored, so no "already done" flag is needed. For \`race\` that alone is enough: I walk the input and subscribe each item via \`Promise.resolve(item).then(resolve, reject)\` to the same outer finish line. Whoever fires first wins, success or failure alike. For \`any\` the logic mirrors: I pass \`resolve\` straight through so the first success wins, but failures have to be accumulated. I allocate an \`errors\` array at input length, store reasons by index to keep the order, and keep a \`remaining\` counter. When it hits zero there's no hope left, so I reject with an \`AggregateError\`. I'd also call out that \`any([])\` fails instantly while \`race([])\` hangs forever by spec. O(n) either way.

## Follow-ups they'll ask

- **\`race\` vs \`any\`?** — \`race\` reacts to the first settlement of any kind; \`any\` ignores rejections while a success is still possible.
- **What does \`race([])\` do?** — hangs forever; nothing is subscribed so the promise never settles. That's per spec.
- **Why does \`race\` need no counter or flag?** — because the promise locks in on the first \`resolve\`/\`reject\` and later calls are free no-ops.
- **Are the losers cancelled?** — no; real cancellation needs an \`AbortController\` threaded into every task.
- **How do you build a request timeout?** — \`race([fetchPromise, rejectAfter(ms)])\`; that's the single most common use of \`race\`.
- **Why store errors by index rather than \`push\`?** — so \`AggregateError.errors\` matches input order, not failure order.`
    },
    codeSnippet: `function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}

function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        remaining -= 1;
        if (remaining === 0) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    });
  });
}`
  },
  {
    id: 'lc-006',
    category: 'live-coding',
    level: 'Hard',
    tags: ['async', 'concurrency', 'pool'],
    question: {
      ru: 'Реализуйте asyncPool(limit, items, iteratorFn): выполняет асинхронную iteratorFn над каждым элементом, но не более limit задач одновременно. Возвращает промис с массивом результатов в исходном порядке. Пример: загрузка 1000 файлов по 5 параллельно.',
      en: 'Implement asyncPool(limit, items, iteratorFn): runs an async iteratorFn over each item with at most limit tasks in flight. Returns a promise of results in original order. Example: upload 1000 files 5 at a time.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Есть 1000 задач и всего 5 «рук». Надо прогнать все задачи, но **держать в воздухе не больше \`limit\` одновременно**, и вернуть результаты в исходном порядке. Приём: множество активных промисов + \`Promise.race\` как «ждать, пока освободится хотя бы один слот».

Аналогия: **касса в супермаркете, где открыто ровно 5 окошек**. Очередь длинная, но пускаем по одному в свободное окошко. Как только кто-то расплатился — заходит следующий. Не ждём, пока освободятся все пять, ждём **первое освободившееся** — вот почему внутри \`race\`, а не \`all\`.

## Идея решения по шагам

1. Функция \`async\`, чтобы можно было писать \`await\` прямо в цикле.
2. Готовим \`const results = new Array(items.length)\` — полки по индексам — и \`const executing = new Set()\` — «занятые окошки».
3. Обычный \`for\` по индексам. Копируем \`const index = i\` — так значение точно зафиксируется в замыкании колбэка.
4. Запускаем задачу: \`const p = Promise.resolve(iteratorFn(items[index], index)).then(res => { ... })\`. Обёртка в \`Promise.resolve\` нужна на случай, если \`iteratorFn\` синхронная.
5. Внутри \`.then\`: пишем \`results[index] = res\` и **удаляем себя** из набора: \`executing.delete(p)\`.
6. Кладём \`executing.add(p)\` — окошко занято.
7. Если \`executing.size >= limit\` — \`await Promise.race(executing)\`. Это пауза до момента, когда хоть одна задача финиширует и освободит слот.
8. После цикла — \`await Promise.all(executing)\`: последние (меньше \`limit\`) задачи ещё летят, их надо дождаться.
9. \`return results\`.

## Разбор кода

Самая хитрая строка — \`executing.delete(p)\` внутри \`.then\`, которая ссылается на \`p\`, объявленную этим же выражением. Это работает, потому что колбэк выполнится **позже**, когда \`const p\` уже инициализирована. Классическая «ловушка в лоб» на собеседовании — не пугайтесь её.

Почему \`Set\`, а не массив? Потому что нужно **удалять по значению** за O(1). Из массива пришлось бы искать индекс через \`indexOf\`.

Почему \`await Promise.race(...)\` **после** \`add\`, а не до? Потому что проверять переполнение надо уже с учётом только что запущенной задачи. Обратите внимание на \`>= limit\`, а не \`> limit\`: набор ровно из \`limit\` элементов уже полон.

Финальный \`await Promise.all(executing)\` обязателен. Без него функция вернула бы \`results\` с дырками — цикл заканчивается, а «хвост» из последних задач ещё в полёте.

Результаты пишутся **по индексу**, поэтому порядок завершения совершенно не важен: медленная первая задача не сдвинет остальные.

Про ошибки: если задача упадёт, промис \`p\` реджектится, и упадёт ближайший \`await race\` или финальный \`await all\` — пул реджектится целиком. Если нужно собрать частичные результаты, оборачивайте \`iteratorFn\` в \`.catch\` и складывайте дескрипторы, как в \`allSettled\`.

## Сложность и edge cases

- **Время:** O(n) запусков плюс сумма ожиданий; фактическое время ≈ (общая работа) / \`limit\`. **Память:** O(n) под результаты и максимум \`limit\` живых промисов одновременно.
- \`items\` пустой — цикл не выполнится, \`Promise.all(∅)\` резолвится сразу, вернём \`[]\`.
- \`limit >= items.length\` — вырождается в обычный \`Promise.all\`, ни одного ожидания в цикле.
- \`limit <= 0\` — условие \`size >= limit\` истинно всегда, получится последовательное выполнение (или бесконечная блокировка при 0 — стоит явно валидировать).
- Ошибка в одной задаче реджектит весь пул; уже запущенные задачи **не отменяются**.
- Очень большой \`items\` — сам массив всё равно O(n) в памяти, зато соединений одновременно только \`limit\`.

## Как рассуждать вслух

> Уточню, надо ли падать на первой ошибке или собирать частичные результаты. Делаю \`async\`-функцию: массив \`results\` по длине входа и \`Set\` активных промисов \`executing\`. Иду обычным \`for\`, фиксирую \`index\` в константе, запускаю \`iteratorFn\` через \`Promise.resolve\` на случай синхронной функции. В \`.then\` пишу результат по индексу и удаляю промис из \`Set\` — сам себя, это законно, потому что колбэк сработает позже. Добавляю в \`Set\` и, если размер дошёл до \`limit\`, делаю \`await Promise.race(executing)\`: жду именно **первое** освободившееся окошко, а не все. Это касса на пять окон. После цикла обязательно \`await Promise.all(executing)\` — иначе хвост задач останется в полёте и в результатах будут дырки. В памяти максимум \`limit\` живых задач, результаты O(n).

## Follow-up, которые зададут

- **Почему \`race\`, а не \`all\` внутри цикла?** — \`race\` разблокирует нас, как только освободится **один** слот; \`all\` заставил бы ждать всю пятёрку и загубил бы утилизацию.
- **Зачем финальный \`await Promise.all(executing)\`?** — в конце остаётся до \`limit\` незавершённых задач; без него вернём массив с дырками.
- **Как сделать отменяемым?** — пробрасывать \`AbortSignal\` в \`iteratorFn\` и прекращать запуск новых задач при \`signal.aborted\`.
- **Как не падать на первой ошибке?** — обернуть вызов в \`.catch\` и класть в \`results\` дескриптор \`{ status, reason }\`, то есть поведение \`allSettled\`.
- **Почему \`Set\`, а не массив?** — удаление по значению за O(1); из массива пришлось бы искать \`indexOf\`.
- **Как добавить ретраи на элемент?** — обернуть \`iteratorFn\` в \`retry\`, пул об этом знать не должен.`,
      en: `## In short: what they're asking for

You have 1000 tasks and only 5 "hands". Run them all but keep **at most \`limit\` in flight at any moment**, and return results in the original order. The trick: a set of active promises plus \`Promise.race\` as "wait until at least one slot frees".

Analogy: **a supermarket with exactly five tills open**. The queue is long, but people enter one free till at a time. As soon as someone pays, the next one goes in. We don't wait for all five to clear, we wait for **the first** to clear — which is exactly why \`race\` is used inside, not \`all\`.

## The idea, step by step

1. Make the function \`async\` so you can \`await\` right inside the loop.
2. Prepare \`const results = new Array(items.length)\` — indexed shelves — and \`const executing = new Set()\` — the busy tills.
3. A plain indexed \`for\` loop. Copy \`const index = i\` so the value is pinned in the callback's closure.
4. Launch the task: \`const p = Promise.resolve(iteratorFn(items[index], index)).then(res => { ... })\`. The \`Promise.resolve\` wrap covers a synchronous \`iteratorFn\`.
5. Inside \`.then\`: write \`results[index] = res\` and **remove itself** from the set: \`executing.delete(p)\`.
6. Do \`executing.add(p)\` — the till is now busy.
7. If \`executing.size >= limit\`, \`await Promise.race(executing)\`. This pauses until some task finishes and frees a slot.
8. After the loop, \`await Promise.all(executing)\`: the final (fewer than \`limit\`) tasks are still in flight and must be awaited.
9. \`return results\`.

## Walking through the code

The trickiest line is \`executing.delete(p)\` inside \`.then\`, referring to the very \`p\` that expression is defining. It works because the callback runs **later**, when \`const p\` is already initialised. It's a classic interview head-scratcher — don't let it spook you.

Why a \`Set\` and not an array? Because we need **delete by value** in O(1). With an array you'd have to \`indexOf\` first.

Why is \`await Promise.race(...)\` **after** \`add\` and not before? Because the overflow check must account for the task just launched. Note \`>= limit\`, not \`> limit\`: a set of exactly \`limit\` entries is already full.

The final \`await Promise.all(executing)\` is mandatory. Without it the function returns \`results\` with holes — the loop ends while the tail of tasks is still in flight.

Results are written **by index**, so completion order is irrelevant: a slow first task doesn't shift the others.

On errors: if a task fails, promise \`p\` rejects and the nearest \`await race\` (or the final \`await all\`) throws — the whole pool rejects. To collect partial results, wrap \`iteratorFn\` in a \`.catch\` and store descriptors like \`allSettled\` does.

## Complexity and edge cases

- **Time:** O(n) launches plus the waiting; wall time ≈ (total work) / \`limit\`. **Memory:** O(n) for results and at most \`limit\` live promises at once.
- Empty \`items\` — the loop never runs, \`Promise.all(∅)\` resolves at once, we return \`[]\`.
- \`limit >= items.length\` degenerates to a plain \`Promise.all\` with no waiting inside the loop.
- \`limit <= 0\` makes \`size >= limit\` always true, giving sequential execution (or a permanent block at 0 — worth validating explicitly).
- One failing task rejects the whole pool; already-running tasks are **not cancelled**.
- Very large \`items\` still costs O(n) memory for the array itself, but only \`limit\` connections are open at once.

## How to think out loud

> I'd clarify whether we fail fast or collect partial results. I write an \`async\` function with a \`results\` array at input length and a \`Set\` of in-flight promises called \`executing\`. I loop with a plain \`for\`, pin \`index\` in a const, and launch \`iteratorFn\` through \`Promise.resolve\` in case it's synchronous. In \`.then\` I write the result by index and delete the promise from the set — it deletes itself, which is fine because the callback runs later. I add it to the set, and if the size reaches \`limit\` I \`await Promise.race(executing)\`: I wait for the **first** free till, not all of them. That's the five-tills supermarket. After the loop I must \`await Promise.all(executing)\`, otherwise the tail is still in flight and results have holes. Memory is at most \`limit\` live tasks plus O(n) results.

## Follow-ups they'll ask

- **Why \`race\` and not \`all\` inside the loop?** — \`race\` unblocks as soon as **one** slot frees; \`all\` would make us wait for the whole batch and wreck utilisation.
- **Why the final \`await Promise.all(executing)\`?** — up to \`limit\` tasks are unfinished at the end; without it you return an array with holes.
- **How to make it cancellable?** — thread an \`AbortSignal\` into \`iteratorFn\` and stop launching new tasks once \`signal.aborted\`.
- **How to avoid failing on the first error?** — wrap the call in \`.catch\` and store a \`{ status, reason }\` descriptor, i.e. \`allSettled\` semantics.
- **Why a \`Set\` and not an array?** — O(1) delete by value; an array would need an \`indexOf\` scan.
- **How to add per-item retries?** — wrap \`iteratorFn\` in \`retry\`; the pool shouldn't know about it.`
    },
    codeSnippet: `async function asyncPool(limit, items, iteratorFn) {
  const results = new Array(items.length);
  const executing = new Set();

  for (let i = 0; i < items.length; i++) {
    const index = i;
    const p = Promise.resolve(iteratorFn(items[index], index)).then((res) => {
      results[index] = res;
      executing.delete(p);
    });
    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}`
  },
  {
    id: 'lc-007',
    category: 'live-coding',
    level: 'Medium',
    tags: ['async', 'retry', 'backoff'],
    question: {
      ru: 'Реализуйте retry(fn, { retries, baseDelay, factor }): вызывает асинхронную fn, и при ошибке повторяет до retries раз с экспоненциальной задержкой (baseDelay * factor^attempt). Если все попытки провалились — реджектит последней ошибкой.',
      en: 'Implement retry(fn, { retries, baseDelay, factor }): calls async fn and on error retries up to retries times with exponential backoff (baseDelay * factor^attempt). If all attempts fail, reject with the last error.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Дёрнуть асинхронную функцию, и если она упала — **повторить, но каждый раз ждать дольше**. Задержка растёт экспоненциально: \`baseDelay * factor^attempt\`. Если кончились попытки — бросить последнюю ошибку. Приём: обычный \`for\` с \`try/catch\` внутри \`async\`-функции.

Аналогия: **звоните человеку, который не берёт трубку**. Первый раз перезваниваете через 10 секунд, потом через 20, потом через 40. Не долбите каждую секунду — и себе нервы бережёте, и абоненту. \`jitter\` — это «плюс случайные пару секунд», чтобы вы и ещё сто таких же звонящих не попали в одну и ту же секунду.

## Идея решения по шагам

1. Заводим хелпер \`sleep(ms)\` — промис, который резолвится через \`setTimeout\`. Одна строка, но пишите её обязательно.
2. Объявляем \`async function retry(fn, { retries = 3, baseDelay = 200, factor = 2 } = {})\`. Значение по умолчанию у самого объекта — чтобы вызов \`retry(fn)\` без опций не упал.
3. Заводим \`let lastError\` — сюда складываем последнюю пойманную ошибку.
4. Цикл \`for (let attempt = 0; attempt <= retries; attempt++)\`. Внимание на \`<=\`: \`retries = 3\` значит **4 вызова** — один основной и три повтора.
5. Внутри \`try\`: \`return await fn(attempt)\`. Успех сразу выходит из функции.
6. В \`catch\`: сохраняем \`lastError = err\`. Если \`attempt === retries\` — попытки исчерпаны, \`break\`.
7. Иначе считаем задержку \`baseDelay * Math.pow(factor, attempt)\`, добавляем случайный \`jitter\` и делаем \`await sleep(delay + jitter)\`.
8. После цикла — \`throw lastError\`.

## Разбор кода

\`return await fn(attempt)\` — почему именно \`await\`, а не просто \`return fn(attempt)\`? Потому что без \`await\` промис вернулся бы наружу **до** того, как упадёт, и \`catch\` его бы не поймал. Это очень частая ошибка и любимый вопрос интервьюера.

Номер попытки передаётся в \`fn(attempt)\` — полезно для логов и для того, чтобы функция могла вести себя иначе на повторе.

Проверка \`if (attempt === retries) break;\` стоит **до** \`sleep\`. Иначе после последней неудачи вы бы бессмысленно проспали задержку, а потом всё равно бросили ошибку.

Формула задержки: \`attempt = 0\` даёт \`baseDelay\`, \`1\` — \`baseDelay * factor\`, \`2\` — \`baseDelay * factor²\`. При \`base = 200, factor = 2\` это 200, 400, 800 мс.

\`jitter = Math.random() * baseDelay\` — размазывание. Если тысяча клиентов упала одновременно, без jitter они ретраят синхронно и добивают сервер повторно («грозовое стадо»).

\`lastError\` нужен, потому что после \`break\` мы уже вне \`catch\` и переменной \`err\` не видно.

## Сложность и edge cases

- **Время:** O(retries) вызовов, суммарная задержка — геометрическая прогрессия ≈ \`baseDelay * (factor^(retries+1) - 1) / (factor - 1)\`, то есть ограничена и предсказуема. **Память:** O(1).
- \`retries = 0\` — ровно один вызов, без повторов и без сна.
- Фатальные ошибки (400, 401, 404) ретраить бессмысленно — нужен предикат \`shouldRetry(err)\`, иначе вы четыре раза получите тот же 404.
- Отмена: без \`AbortSignal\` пользователь ушёл со страницы, а ретраи ещё месят сеть.
- Идемпотентность: повторять \`GET\` безопасно, \`POST\` «создать заказ» — нет.
- Очень большой \`factor\` или \`retries\` — задержка улетает в минуты; нужен потолок \`Math.min(cap, ...)\`.

## Как рассуждать вслух

> Сначала уточню: сколько попыток, надо ли ретраить все ошибки и нужна ли отмена. Пишу хелпер \`sleep\` через \`setTimeout\` и \`async\`-функцию с циклом \`for (attempt = 0; attempt <= retries; attempt++)\` — обращаю внимание, что при \`retries = 3\` вызовов будет четыре. Внутри \`try\` пишу \`return await fn(attempt)\`, именно с \`await\`: без него промис уедет наружу и \`catch\` его не увидит. В \`catch\` сохраняю ошибку в \`lastError\`, и если это была последняя попытка — выхожу из цикла, чтобы не спать зря. Иначе жду \`baseDelay * factor^attempt\` плюс случайный jitter — это как перезвон с растущей паузой, а jitter не даёт тысяче клиентов ретраить в одну секунду. После цикла бросаю \`lastError\`. Память O(1), суммарное ожидание — геометрическая прогрессия.

## Follow-up, которые зададут

- **Зачем jitter?** — снимает синхронные всплески нагрузки: без него все упавшие клиенты ретраят одновременно и добивают сервер.
- **Как ограничить максимальную задержку?** — \`Math.min(cap, baseDelay * Math.pow(factor, attempt))\`.
- **Как не ретраить 4xx?** — предикат \`shouldRetry(err)\` в опциях; на \`false\` бросаем сразу.
- **Почему \`return await\`, а не \`return\`?** — без \`await\` промис выходит из \`try\` до отклонения и \`catch\` не срабатывает.
- **Как добавить отмену?** — принимать \`AbortSignal\`, проверять \`signal.aborted\` перед каждой попыткой и отменять \`sleep\` по событию \`abort\`.
- **Что делать с не-идемпотентными запросами?** — либо не ретраить, либо использовать idempotency key на сервере.
- **Чем это отличается от circuit breaker?** — retry борется с разовым сбоем, circuit breaker перестаёт ходить к сервису вообще, когда тот стабильно лежит.`,
      en: `## In short: what they're asking for

Call an async function and, if it fails, **retry — but wait longer each time**. The delay grows exponentially: \`baseDelay * factor^attempt\`. When attempts run out, throw the last error. The trick: a plain \`for\` loop with \`try/catch\` inside an \`async\` function.

Analogy: **calling someone who isn't picking up**. You ring back after 10 seconds, then 20, then 40. You don't hammer every second — it saves your nerves and theirs. \`jitter\` is the "plus a random couple of seconds" so that you and a hundred other callers don't all land on the same second.

## The idea, step by step

1. Write a \`sleep(ms)\` helper — a promise resolved by \`setTimeout\`. One line, but always write it.
2. Declare \`async function retry(fn, { retries = 3, baseDelay = 200, factor = 2 } = {})\`. The default on the object itself is what lets \`retry(fn)\` work with no options.
3. Keep \`let lastError\` — the most recent caught error goes here.
4. Loop \`for (let attempt = 0; attempt <= retries; attempt++)\`. Note the \`<=\`: \`retries = 3\` means **4 calls** — one original plus three retries.
5. Inside \`try\`: \`return await fn(attempt)\`. A success exits the function immediately.
6. In \`catch\`: store \`lastError = err\`. If \`attempt === retries\`, attempts are exhausted — \`break\`.
7. Otherwise compute \`baseDelay * Math.pow(factor, attempt)\`, add a random \`jitter\`, and \`await sleep(delay + jitter)\`.
8. After the loop, \`throw lastError\`.

## Walking through the code

\`return await fn(attempt)\` — why \`await\` and not just \`return fn(attempt)\`? Because without \`await\` the promise leaves the function **before** it rejects, and \`catch\` never sees it. This is a very common bug and a favourite interviewer question.

The attempt number is passed into \`fn(attempt)\` — handy for logging and for letting the function behave differently on a retry.

The check \`if (attempt === retries) break;\` sits **before** the \`sleep\`. Otherwise, after the final failure you'd pointlessly sleep and then throw anyway.

The delay formula: \`attempt = 0\` gives \`baseDelay\`, \`1\` gives \`baseDelay * factor\`, \`2\` gives \`baseDelay * factor²\`. With \`base = 200, factor = 2\` that's 200, 400, 800 ms.

\`jitter = Math.random() * baseDelay\` spreads things out. If a thousand clients fail at once, without jitter they retry in lockstep and finish the server off (the thundering herd).

\`lastError\` is needed because after \`break\` we're outside the \`catch\` and \`err\` is no longer in scope.

## Complexity and edge cases

- **Time:** O(retries) calls; total delay is a geometric series ≈ \`baseDelay * (factor^(retries+1) - 1) / (factor - 1)\`, so it's bounded and predictable. **Memory:** O(1).
- \`retries = 0\` means exactly one call, no retry and no sleep.
- Fatal errors (400, 401, 404) are pointless to retry — you need a \`shouldRetry(err)\` predicate, otherwise you fetch the same 404 four times.
- Cancellation: without an \`AbortSignal\`, the user navigates away while retries keep hammering the network.
- Idempotency: retrying a \`GET\` is safe, retrying "create order" \`POST\` is not.
- A large \`factor\` or \`retries\` sends the delay into minutes; you want a cap via \`Math.min(cap, ...)\`.

## How to think out loud

> First I'd clarify the attempt count, whether every error should be retried, and whether cancellation is needed. I write a \`sleep\` helper over \`setTimeout\` and an \`async\` function with \`for (attempt = 0; attempt <= retries; attempt++)\` — noting that \`retries = 3\` means four calls. Inside \`try\` I write \`return await fn(attempt)\`, with the \`await\`: without it the promise escapes the \`try\` and \`catch\` never fires. In \`catch\` I store the error in \`lastError\`, and if that was the last attempt I break out so I don't sleep for nothing. Otherwise I wait \`baseDelay * factor^attempt\` plus a random jitter — like calling back with growing pauses, where jitter stops a thousand clients retrying on the same second. After the loop I throw \`lastError\`. O(1) memory, and total waiting is a geometric series.

## Follow-ups they'll ask

- **Why jitter?** — it breaks up synchronised load spikes: without it every failed client retries at once and finishes the server off.
- **How do you cap the delay?** — \`Math.min(cap, baseDelay * Math.pow(factor, attempt))\`.
- **How do you avoid retrying 4xx?** — a \`shouldRetry(err)\` predicate in the options; rethrow immediately when it returns \`false\`.
- **Why \`return await\` rather than \`return\`?** — without \`await\` the promise leaves \`try\` before rejecting and \`catch\` never runs.
- **How do you add cancellation?** — accept an \`AbortSignal\`, check \`signal.aborted\` before each attempt and abort the \`sleep\` on the \`abort\` event.
- **What about non-idempotent requests?** — either don't retry, or use a server-side idempotency key.
- **How is this different from a circuit breaker?** — retry fights a one-off blip; a circuit breaker stops calling the service at all while it's consistently down.`
    },
    codeSnippet: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { retries = 3, baseDelay = 200, factor = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const delay = baseDelay * Math.pow(factor, attempt);
      const jitter = Math.random() * baseDelay;
      await sleep(delay + jitter);
    }
  }
  throw lastError;
}`
  },
  {
    id: 'lc-008',
    category: 'live-coding',
    level: 'Medium',
    tags: ['async', 'sequence', 'reduce'],
    question: {
      ru: 'Дан массив функций, каждая возвращает промис. Выполните их строго последовательно (следующая стартует только после завершения предыдущей) и верните массив результатов. Также покажите sleep(ms).',
      en: 'Given an array of functions each returning a promise, run them strictly in sequence (each starts only after the previous finishes) and return the results array. Also show sleep(ms).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Есть массив **функций** (не промисов!), каждая при вызове возвращает промис. Надо прогнать их **строго по одной**: следующая стартует только когда предыдущая закончилась. Собрать результаты в массив.

Аналогия: **очередь в поликлинике по одному кабинету**. Второй пациент заходит, только когда вышел первый. Сравните с \`Promise.all\` — там всех запустили одновременно, как будто открыли десять кабинетов сразу.

Ключевая деталь, ради которой задача и придумана: массив хранит **функции**, а не уже запущенные промисы. Промис стартует в момент создания — если бы вам дали готовые промисы, последовательность была бы уже невозможна.

## Идея решения по шагам

**Версия на \`for...of\` (пишите её первой, она читаемее):**
1. \`async function runSequential(tasks)\`.
2. Завести \`const results = []\`.
3. \`for (const task of tasks)\` — и внутри \`results.push(await task())\`. Именно \`task()\` — вызываем функцию здесь, в этой итерации, а не заранее.
4. \`return results\`.

**Версия на \`reduce\` (если попросят без async/await):**
1. Стартовое значение свёртки — \`Promise.resolve([])\`, «пустой аккумулятор в промисе».
2. На каждом шаге строим цепочку: \`chain.then(acc => task().then(res => [...acc, res]))\`.
3. \`task()\` вызывается **внутри** \`.then\`, то есть только после завершения предыдущего звена — вот где рождается последовательность.
4. Итог свёртки — промис финального массива.

Плюс хелпер \`sleep = ms => new Promise(r => setTimeout(r, ms))\` — им удобно демонстрировать задержки.

## Разбор кода

В \`for...of\` версии вся магия в том, что \`await\` внутри цикла **реально останавливает цикл**. Тело следующей итерации не начнётся, пока промис не осел. Это работает только с \`for\`/\`for...of\`/\`while\` — в \`forEach\` \`await\` бесполезен, потому что колбэки запускаются независимо.

В \`reduce\`-версии аккумулятор \`chain\` — это **промис**, а не значение. Каждый шаг цикла не выполняет работу, а лишь **пристраивает следующее звено** к цепочке. Сам \`reduce\` отрабатывает мгновенно и синхронно, строя цепочку целиком; выполнение начинается потом.

Обратите внимание на \`[...acc, res]\` — создаём новый массив вместо \`acc.push(res)\`. Так чище функционально, но за это платим O(n²) на копированиях; в проде можно и мутировать.

Самое важное для интервью: \`tasks.map(t => t())\` **сразу запустит всё параллельно**, потому что \`map\` синхронно вызывает каждую функцию. Никакой последующий \`await\` этого уже не исправит.

## Сложность и edge cases

- **Время:** O(n) шагов, но общее время — **сумма** длительностей всех задач (в отличие от \`Promise.all\`, где это максимум). **Память:** O(n) под результаты; у \`reduce\`-версии со спредом фактически O(n²) операций копирования.
- Пустой массив → цикл не выполнится, вернём \`[]\`.
- Ошибка в любой задаче **прерывает цепочку**: \`await\` бросит, остальные задачи даже не запустятся. Если надо продолжать — оборачивайте каждый шаг в \`try/catch\`.
- Одна задача — просто её результат в массиве из одного элемента.
- Очень длинный массив — цепочка промисов длинная, но стек не растёт (каждое звено это микротаск), так что переполнения не будет.

## Как рассуждать вслух

> Сразу обращу внимание: на входе массив функций, а не промисов — это принципиально, потому что промис стартует в момент создания, и готовые промисы последовательно уже не выстроить. Делаю \`async\`-функцию, завожу \`results\`, иду \`for...of\` и внутри пишу \`results.push(await task())\`. \`await\` внутри \`for\` реально тормозит цикл — следующая итерация не начнётся, пока не осел промис. Это очередь в один кабинет. Отдельно проговорю, почему нельзя \`tasks.map(t => t())\`: \`map\` синхронно вызовет все функции и запустит их параллельно. Если попросят без \`async/await\`, соберу через \`reduce\` со стартом \`Promise.resolve([])\`, где \`task()\` вызывается внутри \`.then\`. Время — сумма всех задач, память O(n). Пустой массив вернёт \`[]\`, ошибка обрывает цепочку.

## Follow-up, которые зададут

- **Почему \`tasks.map(t => t())\` + \`await Promise.all\` не даёт последовательности?** — \`map\` вызывает все функции синхронно, промисы стартуют одновременно.
- **Почему \`await\` не работает внутри \`forEach\`?** — \`forEach\` не ждёт возвращаемый промис колбэка; нужен \`for...of\` или \`for\`.
- **Как продолжить после ошибки?** — \`try/catch\` вокруг каждого шага, складывать в результат дескриптор ошибки.
- **Как ограничить время всей цепочки?** — \`Promise.race\` цепочки с таймаутом, либо проверять дедлайн перед каждым шагом.
- **Как сделать «последовательно, но по N сразу»?** — это уже \`asyncPool\` с лимитом параллельности.
- **Не переполнится ли стек на 100 000 задач?** — нет, звенья цепочки выполняются как микротаски, а не как вложенные вызовы.`,
      en: `## In short: what they're asking for

You get an array of **functions** (not promises!), each returning a promise when called. Run them **strictly one at a time**: the next starts only once the previous finished. Collect the results into an array.

Analogy: **a clinic queue with one consulting room**. The second patient goes in only when the first came out. Compare that with \`Promise.all\`, which is like opening ten rooms at once.

The detail the whole task hinges on: the array holds **functions**, not already-started promises. A promise starts the moment it's created — if you were handed ready promises, sequencing would already be impossible.

## The idea, step by step

**The \`for...of\` version (write this first, it reads better):**
1. \`async function runSequential(tasks)\`.
2. Declare \`const results = []\`.
3. \`for (const task of tasks)\` and inside \`results.push(await task())\`. Note \`task()\` — the function is called here, in this iteration, not upfront.
4. \`return results\`.

**The \`reduce\` version (if they ask for it without async/await):**
1. The seed of the fold is \`Promise.resolve([])\` — "an empty accumulator wrapped in a promise".
2. Each step builds the chain: \`chain.then(acc => task().then(res => [...acc, res]))\`.
3. \`task()\` is called **inside** \`.then\`, i.e. only after the previous link finished — that's where sequencing comes from.
4. The fold's result is a promise of the final array.

Plus the helper \`sleep = ms => new Promise(r => setTimeout(r, ms))\`, handy for demonstrating delays.

## Walking through the code

In the \`for...of\` version the magic is that \`await\` inside the loop **actually pauses the loop**. The next iteration's body doesn't begin until the promise settles. This only works with \`for\`/\`for...of\`/\`while\` — inside \`forEach\`, \`await\` is useless because the callbacks are fired independently.

In the \`reduce\` version, the accumulator \`chain\` is a **promise**, not a value. Each loop step doesn't do work — it just **attaches the next link** to the chain. \`reduce\` itself finishes instantly and synchronously, building the whole chain; execution follows afterwards.

Note \`[...acc, res]\` — a new array instead of \`acc.push(res)\`. Functionally cleaner, but you pay O(n²) in copying; production code may just mutate.

The single most important point for the interview: \`tasks.map(t => t())\` **starts everything in parallel immediately**, because \`map\` calls each function synchronously. No amount of later \`await\` can undo that.

## Complexity and edge cases

- **Time:** O(n) steps, but wall time is the **sum** of all task durations (unlike \`Promise.all\`, where it's the max). **Memory:** O(n) for results; the spread-based \`reduce\` version really performs O(n²) copy operations.
- Empty array → the loop never runs, we return \`[]\`.
- An error in any task **breaks the chain**: \`await\` throws and the remaining tasks never even start. To carry on, wrap each step in \`try/catch\`.
- A single task simply yields a one-element array.
- A very long array makes a long promise chain, but the stack doesn't grow (each link is a microtask), so no overflow.

## How to think out loud

> First I'll point out that the input is an array of functions, not promises — that's essential, because a promise starts when it's created and ready promises can no longer be sequenced. I write an \`async\` function, declare \`results\`, loop with \`for...of\` and write \`results.push(await task())\`. \`await\` inside a \`for\` genuinely halts the loop — the next iteration won't begin until the promise settles. It's a one-room clinic queue. I'd also call out why \`tasks.map(t => t())\` fails: \`map\` calls every function synchronously and fires them in parallel. If they want it without \`async/await\`, I'd fold with \`reduce\` seeded by \`Promise.resolve([])\`, calling \`task()\` inside \`.then\`. Time is the sum of all tasks, memory O(n). Empty input gives \`[]\`, and an error breaks the chain.

## Follow-ups they'll ask

- **Why doesn't \`tasks.map(t => t())\` + \`await Promise.all\` give a sequence?** — \`map\` calls every function synchronously, so all promises start at once.
- **Why doesn't \`await\` work inside \`forEach\`?** — \`forEach\` ignores the promise the callback returns; use \`for...of\` or \`for\`.
- **How do you continue after an error?** — \`try/catch\` around each step, pushing an error descriptor into the results.
- **How do you bound the total time?** — \`race\` the chain against a timeout, or check a deadline before each step.
- **How would you do "sequential but N at a time"?** — that's \`asyncPool\` with a concurrency limit.
- **Won't 100,000 tasks blow the stack?** — no, the chain links run as microtasks, not nested calls.`
    },
    codeSnippet: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// for...of version
async function runSequential(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

// reduce version (no async/await)
function runSequentialReduce(tasks) {
  return tasks.reduce(
    (chain, task) =>
      chain.then((acc) => task().then((res) => [...acc, res])),
    Promise.resolve([])
  );
}`
  },
  {
    id: 'lc-009',
    category: 'live-coding',
    level: 'Hard',
    tags: ['async', 'cancellation', 'abort-controller'],
    question: {
      ru: 'Реализуйте отменяемый промис. Вариант A: makeCancelable(promise) с методом cancel(), который заставляет промис «зависнуть» (не резолвиться). Вариант B: функция, использующая AbortController для отмены fetch. Покажите оба.',
      en: 'Implement a cancelable promise. Variant A: makeCancelable(promise) with a cancel() method that makes the promise "hang" (never resolve). Variant B: a function using AbortController to cancel a fetch. Show both.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Проверяют, понимаете ли вы, что **промис нельзя отменить**. Обещание уже дано, назад его не забрать. Поэтому «отмена» бывает двух видов: либо мы **перестаём слушать** результат (вариант A), либо у самой операции есть встроенный рубильник (вариант B — \`AbortController\` для \`fetch\`).

Аналогия: вы заказали пиццу. Вариант A — вы просто не открываете дверь курьеру: пиццу всё равно приготовили и привезли, вы её игнорируете. Вариант B — вы позвонили в пиццерию до того, как её поставили в печь, и заказ реально отменили.

## Идея решения по шагам

**Вариант A — \`makeCancelable(promise)\`:**
1. Заводим флаг \`let canceled = false\` в замыкании.
2. Создаём новый промис-обёртку \`wrapped\` и подписываемся на исходный **двумя** колбэками.
3. В колбэке успеха: если \`canceled\` — реджектим маркером \`{ isCanceled: true }\`, иначе \`resolve(value)\`.
4. В колбэке ошибки: если \`canceled\` — тот же маркер, иначе прокидываем настоящую \`reject(error)\`.
5. Возвращаем объект \`{ promise: wrapped, cancel: () => (canceled = true) }\`.
6. Потребитель в \`.catch\` смотрит на \`err.isCanceled\` и молча выходит, если это отмена.

**Вариант B — \`fetchCancelable(url)\`:**
1. \`const controller = new AbortController()\`.
2. Передаём \`controller.signal\` в \`fetch(url, { signal })\`.
3. Возвращаем \`{ promise, cancel: () => controller.abort() }\`.
4. При \`abort()\` \`fetch\` реджектится ошибкой с \`name === 'AbortError'\` — её ловим отдельно от настоящих сетевых ошибок.

## Разбор кода

В варианте A обратите внимание: \`cancel()\` **не трогает исходный промис вообще**. Он лишь ставит флаг, который читается позже, в момент завершения. Именно поэтому это «не открывать дверь», а не «отменить заказ».

Почему обёртка реджектится маркером, а не просто «зависает»? Оба варианта встречаются. Маркер \`{ isCanceled: true }\` лучше тем, что потребитель может явно отличить отмену от успеха. «Зависание» (никогда не вызывать ни \`resolve\`, ни \`reject\`) проще, но оставляет висящий \`.then\` — правда, GC его подберёт вместе с промисом, настоящей утечки нет.

Флаг проверяется **в обоих** колбэках. Если проверить только в успехе, то отменённый запрос, который потом упадёт по сети, всё равно покажет пользователю ошибку — типичный баг.

В варианте B ключевое — \`signal\` это **односторонний канал сигнала**. Он не часть промиса; \`AbortController\` придуман как отдельный механизм именно потому, что в промис отмену встроить не смогли. Тот же \`signal\` можно передать в несколько операций и отменить их разом.

## Сложность и edge cases

- **Время и память:** O(1) в обоих вариантах — один флаг или один контроллер.
- Вариант A **не останавливает побочные эффекты**: запрос всё равно уйдёт, сервер всё равно создаст запись, таймер всё равно отработает. Отменяется только доставка результата вам.
- \`AbortError\` надо ловить отдельно: \`if (err.name === 'AbortError') return;\` — иначе пользователь увидит «ошибка сети» при обычном уходе со страницы.
- \`cancel()\` после того, как промис уже осел, — безвредный no-op, флаг просто никто не прочитает.
- Двойной \`cancel()\` тоже безопасен.
- Один \`AbortController\` нельзя переиспользовать: после \`abort()\` сигнал навсегда в состоянии \`aborted\`, нужен новый контроллер на каждый запрос.

## Как рассуждать вслух

> Сразу скажу главное: нативный промис отменить нельзя, обещание уже дано. Поэтому вариантов два. Первый — обёртка: держу флаг \`canceled\` в замыкании, создаю новый промис и подписываюсь на исходный двумя колбэками; если флаг взведён, реджекчу маркером \`{ isCanceled: true }\` вместо реального результата, причём проверяю флаг в обеих ветках, иначе отменённый упавший запрос всё равно покажет ошибку. Это «не открывать дверь курьеру» — пиццу уже везут, побочные эффекты не останавливаются. Второй вариант — настоящая отмена через \`AbortController\`: передаю \`controller.signal\` в \`fetch\`, а \`cancel\` зовёт \`abort()\`; \`fetch\` реджектится \`AbortError\`, который надо ловить отдельно от сетевых ошибок. Оба варианта O(1). В React обычно зову \`cancel\` в cleanup эффекта.

## Follow-up, которые зададут

- **Почему промис нельзя отменить нативно?** — модель «обещания» односторонняя: потребитель не имеет власти над продюсером. Был proposal с \`Promise.cancel\`, его отклонили в пользу \`AbortController\`.
- **Есть ли утечка памяти в варианте A?** — нет: исходный промис оседает, обёртка тоже, GC заберёт всё. Утечка была бы, если бы отменённый колбэк держал ссылку на большой объект.
- **Как отличить отмену от реальной ошибки?** — маркер \`isCanceled\` в варианте A, \`err.name === 'AbortError'\` в варианте B.
- **Как отменить несколько запросов сразу?** — передать один \`signal\` во все, один \`abort()\` погасит все.
- **Где это применяют на практике?** — гонка запросов при быстрой печати в поиске: отменяем предыдущий запрос, чтобы устаревший ответ не перезаписал свежий.
- **Отменяется ли \`Promise.all\` при отмене одного из промисов?** — нет; отменять надо каждую операцию через её собственный сигнал.`,
      en: `## In short: what they're asking for

They're checking whether you know that **a promise cannot be cancelled**. The promise is already made; you can't take it back. So "cancellation" comes in two flavours: either we **stop listening** to the result (variant A), or the operation itself has a built-in kill switch (variant B — \`AbortController\` for \`fetch\`).

Analogy: you ordered a pizza. Variant A is simply not opening the door to the courier: the pizza was still made and delivered, you just ignore it. Variant B is phoning the pizzeria before it went into the oven and actually cancelling the order.

## The idea, step by step

**Variant A — \`makeCancelable(promise)\`:**
1. Keep a flag \`let canceled = false\` in the closure.
2. Create a wrapper promise \`wrapped\` and subscribe to the original with **both** callbacks.
3. In the success callback: if \`canceled\`, reject with the marker \`{ isCanceled: true }\`, otherwise \`resolve(value)\`.
4. In the failure callback: if \`canceled\`, the same marker, otherwise forward the real \`reject(error)\`.
5. Return \`{ promise: wrapped, cancel: () => (canceled = true) }\`.
6. The consumer's \`.catch\` inspects \`err.isCanceled\` and bails out quietly when it's a cancellation.

**Variant B — \`fetchCancelable(url)\`:**
1. \`const controller = new AbortController()\`.
2. Pass \`controller.signal\` into \`fetch(url, { signal })\`.
3. Return \`{ promise, cancel: () => controller.abort() }\`.
4. On \`abort()\` the \`fetch\` rejects with an error whose \`name === 'AbortError'\` — catch that separately from real network errors.

## Walking through the code

In variant A, note that \`cancel()\` **never touches the original promise**. It only raises a flag that is read later, at settlement time. That's exactly why this is "not opening the door", not "cancelling the order".

Why reject with a marker rather than just hanging? Both are seen in the wild. The \`{ isCanceled: true }\` marker is nicer because the consumer can distinguish cancellation from success explicitly. Hanging (never calling \`resolve\` or \`reject\`) is simpler but leaves a dangling \`.then\` — though the GC collects it along with the promise, so it isn't a real leak.

The flag is checked in **both** callbacks. Check it only on success and a cancelled request that later fails on the network will still surface an error to the user — a classic bug.

In variant B the key point is that \`signal\` is a **one-way signalling channel**. It isn't part of the promise; \`AbortController\` exists as a separate mechanism precisely because cancellation couldn't be built into promises. The same \`signal\` can be handed to several operations and cancel them all at once.

## Complexity and edge cases

- **Time and memory:** O(1) in both variants — one flag or one controller.
- Variant A **doesn't stop side effects**: the request still goes out, the server still creates the record, the timer still fires. Only delivery of the result to you is cancelled.
- \`AbortError\` needs separate handling: \`if (err.name === 'AbortError') return;\` — otherwise users see "network error" when they simply navigate away.
- Calling \`cancel()\` after the promise already settled is a harmless no-op; nobody reads the flag.
- Double \`cancel()\` is safe too.
- One \`AbortController\` cannot be reused: after \`abort()\` the signal stays aborted forever, so create a new controller per request.

## How to think out loud

> Let me state the main point first: a native promise can't be cancelled, the promise is already made. So there are two options. First, a wrapper: I keep a \`canceled\` flag in a closure, create a new promise and subscribe to the original with both callbacks; if the flag is set I reject with a \`{ isCanceled: true }\` marker instead of the real outcome, and I check the flag in both branches — otherwise a cancelled request that later fails would still show an error. That's "not opening the door" — the pizza is already on its way, side effects don't stop. Second, real cancellation via \`AbortController\`: I pass \`controller.signal\` into \`fetch\` and \`cancel\` calls \`abort()\`; \`fetch\` rejects with \`AbortError\`, which I catch separately from network errors. Both are O(1). In React I'd call \`cancel\` from the effect cleanup.

## Follow-ups they'll ask

- **Why can't promises be cancelled natively?** — the promise model is one-way: the consumer has no power over the producer. A \`Promise.cancel\` proposal existed and was dropped in favour of \`AbortController\`.
- **Does variant A leak memory?** — no: the original promise settles, the wrapper settles, the GC reclaims both. A leak would only appear if the ignored callback held a reference to something huge.
- **How do you tell a cancellation from a real error?** — the \`isCanceled\` marker in variant A, \`err.name === 'AbortError'\` in variant B.
- **How do you cancel several requests at once?** — hand the same \`signal\` to all of them; one \`abort()\` kills them all.
- **Where is this used in practice?** — request races in search-as-you-type: cancel the previous request so a stale response can't overwrite a fresh one.
- **Does \`Promise.all\` cancel when one input is cancelled?** — no; each operation must be aborted through its own signal.`
    },
    codeSnippet: `// Variant A: wrapper that ignores the result after cancel
function makeCancelable(promise) {
  let canceled = false;
  const wrapped = new Promise((resolve, reject) => {
    promise.then(
      (value) => (canceled ? reject({ isCanceled: true }) : resolve(value)),
      (error) => (canceled ? reject({ isCanceled: true }) : reject(error))
    );
  });
  return { promise: wrapped, cancel: () => (canceled = true) };
}

// Variant B: real cancellation with AbortController
function fetchCancelable(url) {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal });
  return { promise, cancel: () => controller.abort() };
}`
  },
  {
    id: 'lc-010',
    category: 'live-coding',
    level: 'Medium',
    tags: ['promises', 'promisify', 'node'],
    question: {
      ru: 'Реализуйте promisify(fn): превращает функцию с колбэком стиля Node (последний аргумент — callback(err, result)) в функцию, возвращающую промис. Пример: promisify(fs.readFile)("a.txt").',
      en: 'Implement promisify(fn): converts a Node-style callback function (last arg is callback(err, result)) into one that returns a promise. Example: promisify(fs.readFile)("a.txt").'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Взять старомодную функцию, которая отдаёт результат через колбэк \`(err, result)\`, и превратить её в функцию, возвращающую промис. Приём: обёртка, которая **сама подставляет последним аргументом свой колбэк** и внутри него дёргает \`resolve\`/\`reject\`.

Аналогия: **переходник с розетки старого образца на новую**. Устройство внутри не меняется — меняется только разъём, которым оно подключается к вашему коду.

Про error-first: в Node принято, что первый аргумент колбэка — ошибка, и она \`null\`, если всё хорошо. Именно на это соглашение мы и опираемся.

## Идея решения по шагам

1. \`promisify(fn)\` возвращает **обычную \`function\`** (не стрелку!) — это важно для \`this\`.
2. Обёртка принимает \`...args\` — те аргументы, что дал вызывающий, без последнего колбэка.
3. Внутри возвращаем \`new Promise((resolve, reject) => { ... })\`.
4. Зовём исходную: \`fn.call(this, ...args, ourCallback)\` — то есть подмешиваем свой колбэк **в конец** списка.
5. Наш колбэк принимает \`(err, ...results)\`.
6. Если \`err\` истинна — \`reject(err)\` и выходим.
7. Иначе \`resolve(results.length > 1 ? results : results[0])\` — один результат отдаём как есть, несколько — массивом.

## Разбор кода

\`fn.call(this, ...)\` — здесь \`this\` это контекст, с которым вызвали **обёртку**. Если написать стрелку вместо \`function\`, \`this\` возьмётся из места создания, и метод вроде \`obj.method\` потеряет свой объект. Это ровно то, ради чего интервьюер задаёт вопрос.

Колбэк принимает \`(err, ...results)\` через rest, а не \`(err, result)\`. Это позволяет поддержать функции, которые отдают несколько значений: \`callback(null, a, b)\`. Тернарник \`results.length > 1 ? results : results[0]\` решает, отдать массив или единственное значение. Нативный \`util.promisify\` в этом месте строже: он всегда берёт **только первое** значение, а для остальных случаев есть \`util.promisify.custom\`.

Проверка \`if (err)\` — именно на truthy, а не \`err !== null\`. Соглашение допускает и \`undefined\` в успешном случае. Побочный эффект: если функция передаст в качестве ошибки пустую строку или \`0\`, мы это не заметим — но так делают все реализации.

Обёртка **ничего не выполняет заранее**: \`fn\` вызывается только когда вызвали обёртку, внутри конструктора промиса, то есть синхронно относительно вызова.

## Сложность и edge cases

- **Время и память:** O(1) — обёртка добавляет один промис и один колбэк на вызов. Никаких структур данных.
- Колбэк вызвали **дважды** — промис оседает один раз, второй вызов молча игнорируется. Ошибку это не поднимет, но и вреда не будет.
- Функция **не следует** error-first соглашению (например, \`setTimeout\` или \`fs.exists\`) — promisify даст неверный результат: первый аргумент будет принят за ошибку.
- Колбэк не вызвали никогда — промис зависнет навсегда; спасает только внешний таймаут.
- \`fn\` бросила **синхронно** — исключение вылетит внутри конструктора \`Promise\`, значит промис корректно реджектится (приятный бонус конструктора).
- Сохранение \`this\` критично для методов: \`promisify(obj.method).call(obj, ...)\`.

## Как рассуждать вслух

> Уточню, что функция следует Node-соглашению error-first: последний аргумент — колбэк \`(err, result)\`. Возвращаю обычную \`function\`, а не стрелку, потому что мне нужен динамический \`this\` — иначе метод объекта потеряет контекст. Внутри создаю промис и вызываю исходную через \`fn.call(this, ...args, myCallback)\`, то есть подставляю свой колбэк последним аргументом. В колбэке: если \`err\` истинна — \`reject\`, иначе \`resolve\`. Колбэк принимаю как \`(err, ...results)\`, чтобы поддержать функции с несколькими значениями: если результатов больше одного, резолвлю массивом, иначе первым элементом. Это переходник со старой розетки на новую. Обёртка O(1). Из краевого: двойной вызов колбэка безвреден, промис оседает один раз, а вот функция, не следующая error-first, промисифицируется неправильно.

## Follow-up, которые зададут

- **Что если колбэк вызовется дважды?** — промис оседает один раз, второй вызов игнорируется.
- **Как поддержать несколько результатов?** — принимать \`(err, ...results)\` и резолвить массивом; нативный \`util.promisify\` берёт только первое значение, а кастомизация делается через символ \`util.promisify.custom\`.
- **Почему обычная \`function\`, а не стрелка?** — чтобы поймать динамический \`this\` и не сломать вызов как метода объекта.
- **Что с \`fs.exists\`?** — он нарушает соглашение (передаёт \`boolean\` первым аргументом), поэтому не promisify-ится корректно; в Node для него есть \`custom\`.
- **Обратная операция — \`callbackify\`?** — обернуть промис: \`fn(...args).then(v => cb(null, v), e => cb(e))\`.
- **Что если \`fn\` бросит синхронно?** — исключение внутри конструктора \`Promise\` автоматически превращается в reject, обрабатывать отдельно не надо.
- **Зависнет ли промис, если колбэк не вызовут?** — да, навсегда; нужен внешний таймаут через \`Promise.race\`.`,
      en: `## In short: what they're asking for

Take an old-fashioned function that delivers its result through an \`(err, result)\` callback and turn it into one that returns a promise. The trick: a wrapper that **appends its own callback as the last argument** and calls \`resolve\`/\`reject\` from inside it.

Analogy: **a plug adapter between an old socket and a new one**. The device itself doesn't change — only the connector it uses to plug into your code.

On error-first: Node's convention is that the callback's first argument is the error, and it's \`null\` when everything went fine. That convention is exactly what we lean on.

## The idea, step by step

1. \`promisify(fn)\` returns a **plain \`function\`** (not an arrow!) — this matters for \`this\`.
2. The wrapper takes \`...args\` — whatever the caller passed, without the trailing callback.
3. Inside, return \`new Promise((resolve, reject) => { ... })\`.
4. Call the original: \`fn.call(this, ...args, ourCallback)\` — i.e. splice our callback onto the **end** of the argument list.
5. Our callback accepts \`(err, ...results)\`.
6. If \`err\` is truthy — \`reject(err)\` and return.
7. Otherwise \`resolve(results.length > 1 ? results : results[0])\` — one result as-is, several as an array.

## Walking through the code

\`fn.call(this, ...)\` — here \`this\` is the context the **wrapper** was called with. Use an arrow instead of \`function\` and \`this\` gets captured from the definition site, so a method like \`obj.method\` loses its object. That's precisely why the interviewer asks.

The callback takes \`(err, ...results)\` via rest, not \`(err, result)\`. That supports functions delivering several values: \`callback(null, a, b)\`. The ternary \`results.length > 1 ? results : results[0]\` decides between an array and a single value. Native \`util.promisify\` is stricter here: it always takes **only the first** value, and other cases go through \`util.promisify.custom\`.

The check is \`if (err)\` on truthiness, not \`err !== null\`. The convention allows \`undefined\` on success too. Side effect: if the function passes an empty string or \`0\` as the error, we'd miss it — but every implementation does the same.

The wrapper **runs nothing eagerly**: \`fn\` is called only when the wrapper is called, inside the promise constructor, i.e. synchronously with respect to that call.

## Complexity and edge cases

- **Time and memory:** O(1) — the wrapper adds one promise and one callback per call. No data structures.
- The callback fires **twice** — the promise settles once and the second call is silently ignored. No error, no harm.
- A function that **doesn't follow** error-first (say \`setTimeout\` or \`fs.exists\`) promisifies incorrectly: its first argument is taken as an error.
- The callback never fires — the promise hangs forever; only an external timeout saves you.
- \`fn\` throws **synchronously** — the exception escapes inside the \`Promise\` constructor, so the promise rejects correctly (a nice bonus of the constructor).
- Preserving \`this\` is critical for methods: \`promisify(obj.method).call(obj, ...)\`.

## How to think out loud

> I'll confirm the function follows Node's error-first convention: the last argument is a \`(err, result)\` callback. I return a plain \`function\`, not an arrow, because I need the dynamic \`this\` — otherwise an object method loses its context. Inside I create a promise and call the original via \`fn.call(this, ...args, myCallback)\`, splicing my callback in as the final argument. In the callback: if \`err\` is truthy, \`reject\`, otherwise \`resolve\`. I take the callback as \`(err, ...results)\` to support functions with several values: more than one result resolves as an array, otherwise the first element. It's an adapter from an old socket to a new one. The wrapper is O(1). Edge cases: a double callback call is harmless since a promise settles once, but a function that ignores error-first will promisify wrongly.

## Follow-ups they'll ask

- **What if the callback fires twice?** — the promise settles once; the second call is ignored.
- **How do you support multiple results?** — accept \`(err, ...results)\` and resolve with an array; native \`util.promisify\` takes only the first value, and customisation goes through the \`util.promisify.custom\` symbol.
- **Why a plain \`function\` rather than an arrow?** — to capture the dynamic \`this\` and not break calls made as object methods.
- **What about \`fs.exists\`?** — it breaks the convention (it passes a \`boolean\` first), so it doesn't promisify correctly; Node ships a \`custom\` for it.
- **What's the inverse, \`callbackify\`?** — wrap the promise: \`fn(...args).then(v => cb(null, v), e => cb(e))\`.
- **What if \`fn\` throws synchronously?** — a throw inside the \`Promise\` constructor automatically becomes a rejection, no extra handling needed.
- **Does the promise hang if the callback is never called?** — yes, forever; you need an external timeout via \`Promise.race\`.`
    },
    codeSnippet: `function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, ...results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 1 ? results : results[0]);
        }
      });
    });
  };
}`
  },
  {
    id: 'lc-011',
    category: 'live-coding',
    level: 'Hard',
    tags: ['currying', 'closures', 'recursion'],
    question: {
      ru: 'Реализуйте curry(fn). curry(fn)(a)(b)(c) === fn(a,b,c), при этом любые промежуточные группировки аргументов работают: curry(fn)(a,b)(c) и curry(fn)(a)(b,c). Используйте fn.length для определения арности.',
      en: 'Implement curry(fn) so that curry(fn)(a)(b)(c) === fn(a,b,c), and any intermediate grouping works: curry(fn)(a,b)(c) and curry(fn)(a)(b,c). Use fn.length for arity.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Превратить функцию от трёх аргументов в такую, которую можно кормить аргументами **по частям, в любой нарезке**, и она сработает, когда наберётся достаточно. Приём: рекурсивная обёртка, которая копит аргументы и сравнивает их количество с арностью.

Аналогия: **автомат с кофе, который варит за 90 рублей**. Кидаете 50 — он показывает «внесено 50, ждём». Кидаете ещё 40 — варит. Не важно, кинули вы одной монетой или тремя: важно, набралась ли сумма. \`fn.length\` — это и есть ценник на автомате.

## Идея решения по шагам

1. Сигнатура \`curry(fn, arity = fn.length)\` — арность вычисляем из функции, но даём возможность передать явно.
2. Возвращаем **именованное** функциональное выражение \`function curried(...args)\` — имя нужно, чтобы рекурсивно ссылаться на себя изнутри.
3. Внутри одна развилка: \`if (args.length >= arity)\` — набралось достаточно, вызываем \`fn.apply(this, args)\` и возвращаем результат.
4. Иначе возвращаем новую функцию \`(...next) => curried.apply(this, [...args, ...next])\` — она склеивает уже накопленное с новой порцией и снова прогоняет через ту же проверку.
5. Всё. Рекурсия здесь ровно на одном уровне логики: «мало → верни собирателя, хватит → вызови».

## Разбор кода

Сравнение \`>=\`, а не \`===\` — специально: вызов \`cs(1, 2, 3, 4)\` с лишним аргументом должен сработать, а не зациклиться.

\`[...args, ...next]\` создаёт **новый** массив, не мутируя старый. Это принципиально: одну частично применённую функцию можно переиспользовать многократно. \`const add5 = cs(5)\` — и потом \`add5(1, 2)\`, \`add5(3, 4)\` независимо друг от друга. Если бы мы делали \`args.push(...next)\`, второй вызов увидел бы мусор от первого.

Возврат — **стрелка**, и это осознанно: она наследует \`this\` из \`curried\`, а \`curried.apply(this, ...)\` дальше пробрасывает его вниз по цепочке. Так каррированный метод не потеряет свой объект.

Параметр \`arity\` по умолчанию берётся из \`fn.length\`, но \`length\` в JS **считает только обязательные параметры до первого дефолтного или rest**. У \`(a, b = 1, c)\` длина равна 1, у \`(...args)\` — 0. Поэтому явный второй аргумент — не роскошь, а необходимость.

## Сложность и edge cases

- **Время:** O(1) на каждый промежуточный вызов, всего до n вызовов на полное применение. **Память:** O(n) на накопленные аргументы, плюс по замыканию на каждый недобранный шаг.
- Функция с **rest-параметрами**: \`fn.length\` их не считает, арность определится как 0 — функция вызовется сразу же на первом обращении. Передавайте \`arity\` явно.
- **Дефолтные параметры** тоже занижают \`length\` — та же беда.
- Лишние аргументы (\`cs(1,2,3,4)\`) — благодаря \`>=\` просто уходят в \`fn\`, не ломая логику.
- \`arity === 0\` — функция вызовется на первом же обращении \`cs()\`.
- Вызов без аргументов на промежуточном шаге (\`cs(1)()\`) — \`args.length\` не вырос, вернётся ещё один собиратель; бесконечно так можно, но безвредно.
- \`undefined\` как аргумент считается полноценным аргументом — \`length\` массива вырос.

## Как рассуждать вслух

> Уточню, надо ли поддерживать placeholder и функции с rest. Пишу \`curry(fn, arity = fn.length)\` и внутри возвращаю именованное выражение \`function curried(...args)\` — имя нужно для рекурсии. Логика одна развилка: если накопленных аргументов \`>= arity\`, зову \`fn.apply(this, args)\`; иначе возвращаю стрелку, которая склеит старые аргументы с новыми и снова вызовет \`curried\`. Это кофейный автомат: копим монеты, пока не набралась сумма, а сколькими монетами — неважно. Склеиваю через спред в новый массив, а не мутирую — иначе частично применённую функцию нельзя было бы переиспользовать. Беру \`>=\`, а не \`===\`, чтобы лишние аргументы не зациклили. Отдельно проговорю, что \`fn.length\` не считает rest и дефолтные параметры, поэтому арность лучше передавать явно. Сложность O(n) по вызовам и памяти.

## Follow-up, которые зададут

- **Зачем каррирование на практике?** — частичное применение и конфигурируемые хелперы: \`const add5 = curry(add)(5)\`, point-free стиль, удобные мапперы.
- **Почему \`fn.length\` ненадёжен?** — он считает только параметры до первого дефолтного или rest; \`(a, b = 1, c)\` даёт 1, \`(...args)\` даёт 0.
- **Как поддержать placeholder \`_\`?** — хранить позиции пропусков и заполнять их по мере поступления аргументов, как в Lodash.
- **Почему спред, а не \`push\`?** — чтобы частично применённую функцию можно было переиспользовать: мутация накопителя загрязнила бы следующий вызов.
- **Чем каррирование отличается от частичного применения?** — каррирование превращает n-арную функцию в цепочку унарных, \`bind\`/partial просто фиксирует несколько аргументов за один шаг.
- **Как типизировать в TypeScript?** — перегрузками на каждое число аргументов или вариативными tuple-типами; полностью универсально это до сих пор больно.
- **Не переполнится ли стек?** — нет, каждый промежуточный вызов возвращается наружу, глубина рекурсии не накапливается.`,
      en: `## In short: what they're asking for

Turn a three-argument function into one you can feed **in pieces, in any grouping**, and which fires once enough has arrived. The trick: a recursive wrapper that accumulates arguments and compares the count against the arity.

Analogy: **a coffee machine that charges 90p**. Drop in 50p and it shows "50p accepted, waiting". Drop in 40p more and it brews. Whether you paid with one coin or three doesn't matter — only whether the total is reached. \`fn.length\` is the price tag on the machine.

## The idea, step by step

1. Signature \`curry(fn, arity = fn.length)\` — derive the arity from the function, but allow passing it explicitly.
2. Return a **named** function expression \`function curried(...args)\` — the name is what lets it call itself recursively.
3. Inside there's one branch: \`if (args.length >= arity)\` — enough collected, so call \`fn.apply(this, args)\` and return the result.
4. Otherwise return a new function \`(...next) => curried.apply(this, [...args, ...next])\` — it merges what's collected with the new batch and runs the same check again.
5. That's it. The recursion is one level of logic: "not enough → return a collector; enough → call".

## Walking through the code

The comparison is \`>=\`, not \`===\`, on purpose: \`cs(1, 2, 3, 4)\` with an extra argument must fire rather than loop forever.

\`[...args, ...next]\` builds a **new** array without mutating the old one. That's essential: a partially applied function can be reused many times. \`const add5 = cs(5)\` then \`add5(1, 2)\` and \`add5(3, 4)\` independently. With \`args.push(...next)\` the second call would see leftovers from the first.

The returned value is an **arrow**, deliberately: it inherits \`this\` from \`curried\`, and \`curried.apply(this, ...)\` forwards it further down the chain. A curried method therefore keeps its object.

The \`arity\` default comes from \`fn.length\`, but in JS \`length\` **counts only the required parameters up to the first default or rest**. \`(a, b = 1, c)\` has length 1; \`(...args)\` has 0. So the explicit second argument isn't a luxury, it's a necessity.

## Complexity and edge cases

- **Time:** O(1) per intermediate call, up to n calls for a full application. **Memory:** O(n) for the accumulated arguments, plus one closure per unfinished step.
- Functions with **rest params**: \`fn.length\` ignores them, so arity reads as 0 and the function fires on the very first call. Pass \`arity\` explicitly.
- **Default parameters** also lower \`length\` — same trap.
- Extra arguments (\`cs(1,2,3,4)\`) simply flow into \`fn\` thanks to \`>=\`, breaking nothing.
- \`arity === 0\` means the function fires on the first call, \`cs()\`.
- A no-argument intermediate call (\`cs(1)()\`) doesn't grow \`args.length\`, so it returns another collector — you can do that forever, harmlessly.
- \`undefined\` counts as a real argument — the array length still grows.

## How to think out loud

> I'd check whether placeholders and rest-parameter functions need supporting. I write \`curry(fn, arity = fn.length)\` and return a named expression \`function curried(...args)\` — the name is there for recursion. One branch: if the collected count is \`>= arity\`, call \`fn.apply(this, args)\`; otherwise return an arrow that merges the old arguments with the new ones and calls \`curried\` again. It's the coffee machine: collect coins until the total is reached, and the number of coins doesn't matter. I merge with a spread into a new array rather than mutating — otherwise a partially applied function couldn't be reused. I use \`>=\` rather than \`===\` so extra arguments don't loop forever. I'd also note \`fn.length\` ignores rest and default parameters, so the arity is best passed explicitly. O(n) in calls and memory.

## Follow-ups they'll ask

- **Why curry in practice?** — partial application and configurable helpers: \`const add5 = curry(add)(5)\`, point-free style, tidy mappers.
- **Why is \`fn.length\` unreliable?** — it counts only parameters before the first default or rest; \`(a, b = 1, c)\` gives 1, \`(...args)\` gives 0.
- **How do you support a \`_\` placeholder?** — track the gap positions and fill them as arguments arrive, the way Lodash does.
- **Why spread instead of \`push\`?** — so a partially applied function can be reused; mutating the accumulator would poison the next call.
- **How is currying different from partial application?** — currying turns an n-ary function into a chain of unary ones; \`bind\`/partial just fixes several arguments in one step.
- **How would you type it in TypeScript?** — overloads per argument count or variadic tuple types; a fully general typing is still painful.
- **Will the stack overflow?** — no, each intermediate call returns outward, so recursion depth never accumulates.`
    },
    codeSnippet: `function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}

// usage
const sum = (a, b, c) => a + b + c;
const cs = curry(sum);
cs(1)(2)(3);   // 6
cs(1, 2)(3);   // 6
cs(1)(2, 3);   // 6`
  },
  {
    id: 'lc-012',
    category: 'live-coding',
    level: 'Medium',
    tags: ['compose', 'pipe', 'functional'],
    question: {
      ru: 'Реализуйте compose(...fns) и pipe(...fns). compose выполняет функции справа налево (compose(f,g)(x) === f(g(x))), pipe — слева направо. Поддержите асинхронный вариант pipe для промисов.',
      en: 'Implement compose(...fns) and pipe(...fns). compose runs functions right-to-left (compose(f,g)(x) === f(g(x))); pipe runs left-to-right. Also show an async pipe for promises.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Склеить несколько маленьких функций в одну большую, чтобы результат каждой шёл на вход следующей. \`pipe\` идёт **слева направо**, \`compose\` — **справа налево**. Приём: свёртка списка функций через \`reduce\` / \`reduceRight\`.

Аналогия: **конвейер на заводе**. Деталь едет по ленте и на каждой станции с ней что-то делают. \`pipe\` — вы смотрите на конвейер сверху и читаете станции в порядке движения. \`compose\` — та же лента, но записанная как в учебнике математики: \`f(g(x))\`, где ближайшее к \`x\` выполняется первым.

## Идея решения по шагам

**pipe:**
1. \`const pipe = (...fns) => (x) => ...\` — принимаем список функций, возвращаем новую функцию одного аргумента.
2. Внутри \`fns.reduce((acc, fn) => fn(acc), x)\`.
3. Начальное значение свёртки — сам \`x\`. Аккумулятор \`acc\` это «деталь в текущем состоянии», \`fn\` — очередная станция.

**compose:**
1. То же самое, но \`fns.reduceRight(...)\` — идём по массиву с конца.
2. Больше ничего не меняется: тело колбэка идентично.

**pipeAsync:**
1. Начальное значение — \`Promise.resolve(x)\`, то есть аккумулятор всегда **промис**.
2. Каждый шаг: \`(acc, fn) => Promise.resolve(acc).then(fn)\` — подвешиваем следующую функцию к цепочке.
3. Результат — промис итогового значения; каждая \`fn\` может быть как синхронной, так и асинхронной.

## Разбор кода

Вся разница между \`pipe\` и \`compose\` — **одна буква в имени метода**. Это стоит проговорить вслух: \`reduce\` vs \`reduceRight\`. Если запомнили одно, второе пишется автоматически.

Форма \`(...fns) => (x) => ...\` — двухуровневая стрелка. Первый уровень собирает конвейер (выполняется один раз), второй прогоняет через него данные (выполняется на каждый вход). Собранный конвейер можно сохранить в константу и переиспользовать.

В \`pipeAsync\` обратите внимание, что \`reduce\` **не выполняет работу**, а строит цепочку \`.then(...).then(...)\`. Она отработает потом, асинхронно. Обёртка \`Promise.resolve(acc)\` формально избыточна, потому что \`acc\` уже промис на каждом шаге, — но она защищает от случая, когда какая-то \`fn\` вернула не промис, и делает код читаемее.

Проверьте себя на примере: \`pipe(add1, double)(3)\` = \`double(add1(3))\` = 8, а \`compose(add1, double)(3)\` = \`add1(double(3))\` = 7. Разные ответы на одних и тех же функциях — это и есть суть вопроса.

## Сложность и edge cases

- **Время:** O(n) вызовов на каждый прогон данных, где n — число функций. **Память:** O(1) сверх самих функций (для \`pipeAsync\` — O(n) звеньев цепочки промисов).
- Пустой список \`pipe()\` — \`reduce\` вернёт начальное значение, то есть получим **функцию идентичности**. Это корректное и ожидаемое поведение.
- Одна функция — просто она сама.
- **Многоаргументность:** в этой реализации конвейер принимает ровно один аргумент. Чтобы первая функция могла брать несколько, пишут вариант с \`(...args)\` для первого шага: \`(...args) => rest.reduce((acc, fn) => fn(acc), first(...args))\`.
- Если какая-то функция вернула \`undefined\`, оно поедет дальше по конвейеру — молчаливый баг, стоит упомянуть.
- В \`pipeAsync\` ошибка на любом шаге реджектит всю цепочку и последующие функции не вызываются.

## Как рассуждать вслух

> Обе функции — это свёртка списка функций. Пишу \`pipe\` как \`(...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)\`: начальное значение — сам \`x\`, аккумулятор — деталь на конвейере, каждая \`fn\` — станция. \`compose\` отличается ровно одним словом: \`reduceRight\` вместо \`reduce\`, потому что математическая запись \`f(g(x))\` выполняется справа налево. Проверю на примере: \`pipe(add1, double)(3)\` даёт 8, а \`compose\` тех же функций — 7. Пустой список вернёт начальное значение, то есть функцию идентичности — это корректно. Для асинхронного варианта беру начальным значением \`Promise.resolve(x)\` и на каждом шаге делаю \`.then(fn)\` — \`reduce\` при этом только строит цепочку, выполняется она потом. Сложность O(n) вызовов на прогон, памяти O(1).

## Follow-up, которые зададут

- **\`compose\` или \`pipe\` в Redux?** — \`compose\` применяет enhancers справа налево, это его классическое место в \`createStore\`.
- **Что вернёт \`pipe()\` без аргументов?** — функцию идентичности: \`reduce\` по пустому массиву отдаёт начальное значение.
- **Как поддержать несколько аргументов у первой функции?** — выделить первую отдельно и свернуть остальные: \`(...args) => rest.reduce((acc, fn) => fn(acc), first(...args))\`.
- **Как типизировать в TS?** — перегрузки на каждое число аргументов либо вариативные tuple-типы; полностью общего решения нет.
- **Чем это связано с middleware и HOC?** — и то и другое ровно \`compose\`: оборачиваем функцию функцией.
- **В чём разница с методом \`.then\` цепочкой?** — \`pipeAsync\` даёт тот же результат, но конвейер собирается заранее и переиспользуется.
- **Как добавить обработку ошибок на шаг?** — обернуть каждую \`fn\` в try/catch-декоратор до сборки конвейера.`,
      en: `## In short: what they're asking for

Glue several small functions into one big one so that each result feeds the next. \`pipe\` runs **left to right**, \`compose\` runs **right to left**. The trick: fold the list of functions with \`reduce\` / \`reduceRight\`.

Analogy: **a factory conveyor belt**. A part travels along and each station does something to it. \`pipe\` is looking at the belt from above and reading the stations in travel order. \`compose\` is the same belt written in maths notation: \`f(g(x))\`, where whatever sits closest to \`x\` runs first.

## The idea, step by step

**pipe:**
1. \`const pipe = (...fns) => (x) => ...\` — take a list of functions, return a new one-argument function.
2. Inside: \`fns.reduce((acc, fn) => fn(acc), x)\`.
3. The fold's seed is \`x\` itself. The accumulator \`acc\` is "the part in its current state", \`fn\` is the next station.

**compose:**
1. The same, but \`fns.reduceRight(...)\` — walk the array from the end.
2. Nothing else changes: the callback body is identical.

**pipeAsync:**
1. The seed is \`Promise.resolve(x)\`, so the accumulator is always a **promise**.
2. Each step: \`(acc, fn) => Promise.resolve(acc).then(fn)\` — hang the next function onto the chain.
3. The result is a promise of the final value; each \`fn\` may be sync or async.

## Walking through the code

The only difference between \`pipe\` and \`compose\` is **one word in the method name**: \`reduce\` vs \`reduceRight\`. Say that out loud — remember one and the other writes itself.

The shape \`(...fns) => (x) => ...\` is a two-level arrow. The first level assembles the conveyor (runs once), the second pushes data through it (runs per input). The assembled conveyor can be stored in a const and reused.

In \`pipeAsync\`, note that \`reduce\` **does no work** — it builds a \`.then(...).then(...)\` chain that executes later, asynchronously. The \`Promise.resolve(acc)\` wrap is formally redundant since \`acc\` is already a promise at each step, but it guards against an \`fn\` returning a non-promise and keeps the code readable.

Sanity-check on the example: \`pipe(add1, double)(3)\` = \`double(add1(3))\` = 8, while \`compose(add1, double)(3)\` = \`add1(double(3))\` = 7. Different answers from identical functions — that's the whole point of the question.

## Complexity and edge cases

- **Time:** O(n) calls per data pass, where n is the number of functions. **Memory:** O(1) beyond the functions themselves (for \`pipeAsync\`, O(n) promise chain links).
- An empty list \`pipe()\` — \`reduce\` returns the seed, so you get the **identity function**. That's correct and expected.
- A single function is just itself.
- **Multiple arguments:** this implementation takes exactly one argument. To let the first function take several, split it out: \`(...args) => rest.reduce((acc, fn) => fn(acc), first(...args))\`.
- If a function returns \`undefined\`, it travels on down the belt — a silent bug worth mentioning.
- In \`pipeAsync\`, a failure at any step rejects the whole chain and later functions never run.

## How to think out loud

> Both are folds over a list of functions. I write \`pipe\` as \`(...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x)\`: the seed is \`x\` itself, the accumulator is the part on the conveyor, each \`fn\` is a station. \`compose\` differs by exactly one word — \`reduceRight\` instead of \`reduce\` — because the maths notation \`f(g(x))\` evaluates right to left. I'd sanity-check it: \`pipe(add1, double)(3)\` gives 8 while \`compose\` of the same gives 7. An empty list returns the seed, i.e. the identity function, which is correct. For the async version I seed with \`Promise.resolve(x)\` and do \`.then(fn)\` per step — \`reduce\` only builds the chain, execution follows later. Complexity is O(n) calls per pass and O(1) memory.

## Follow-ups they'll ask

- **\`compose\` or \`pipe\` in Redux?** — \`compose\` applies enhancers right to left; that's its classic home in \`createStore\`.
- **What does \`pipe()\` with no arguments return?** — the identity function: reducing an empty array yields the seed.
- **How do you support multiple arguments on the first function?** — split the first one out and fold the rest: \`(...args) => rest.reduce((acc, fn) => fn(acc), first(...args))\`.
- **How would you type it in TS?** — overloads per argument count or variadic tuple types; there's no fully general solution.
- **How does this relate to middleware and HOCs?** — both are exactly \`compose\`: wrapping a function in a function.
- **How is it different from a \`.then\` chain?** — \`pipeAsync\` gives the same result, but the pipeline is assembled once and reused.
- **How would you add per-step error handling?** — wrap each \`fn\` in a try/catch decorator before assembling the pipeline.`
    },
    codeSnippet: `const compose = (...fns) => (x) =>
  fns.reduceRight((acc, fn) => fn(acc), x);

const pipe = (...fns) => (x) =>
  fns.reduce((acc, fn) => fn(acc), x);

const pipeAsync = (...fns) => (x) =>
  fns.reduce(
    (acc, fn) => Promise.resolve(acc).then(fn),
    Promise.resolve(x)
  );

// usage
const add1 = (n) => n + 1;
const double = (n) => n * 2;
pipe(add1, double)(3);    // (3+1)*2 = 8
compose(add1, double)(3); // (3*2)+1 = 7`
  },
  {
    id: 'lc-013',
    category: 'live-coding',
    level: 'Medium',
    tags: ['memoize', 'caching', 'closures'],
    question: {
      ru: 'Реализуйте memoize(fn, resolver?). Кэширует результаты по ключу из аргументов. По умолчанию ключ — JSON-сериализация аргументов, но можно передать кастомный resolver. Покажите на тяжёлой вычислительной функции.',
      en: 'Implement memoize(fn, resolver?). Caches results by an args-derived key. The default key is a JSON serialization of args, but a custom resolver may be provided. Demonstrate on an expensive computation.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Обёртка, которая **запоминает уже посчитанные ответы**: если функцию зовут с теми же аргументами второй раз, она не считает заново, а достаёт из кэша. Приём: \`Map\` в замыкании плюс функция построения ключа из аргументов.

Аналогия: **тетрадка с решёнными задачами**. Прежде чем решать, заглядываете в тетрадку: «эту уже считали, вот ответ». Вся сложность задачи не в кэше, а в том, **как превратить набор аргументов в один ключ**.

## Идея решения по шагам

1. Внутри \`memoize\` создаём \`const cache = new Map()\` — она живёт в замыкании и общая для всех вызовов обёртки.
2. Возвращаем обычную \`function memoized(...args)\` (не стрелку — нужен \`this\`).
3. Строим ключ: \`const key = resolver ? resolver(...args) : JSON.stringify(args)\`. Кастомный resolver — способ обойти слабости JSON.
4. Проверяем \`if (cache.has(key)) return cache.get(key)\`. Именно \`has\`, а не \`get(key) !== undefined\` — иначе закэшированный \`undefined\` будет пересчитываться вечно.
5. Промах: \`const result = fn.apply(this, args)\`, затем \`cache.set(key, result)\`, затем \`return result\`.
6. Вешаем \`memoized.clear = () => cache.clear()\` — без этого кэш невозможно сбросить.

## Разбор кода

\`cache.has(key)\` вместо проверки значения — самая частая правка, которую просит интервьюер. Если функция легально возвращает \`undefined\`, \`null\` или \`0\`, проверка «по значению» не сработает.

\`JSON.stringify(args)\` — дефолтный ключ, и его надо честно раскритиковать самому. Он **не сериализует** функции, \`undefined\` и \`Symbol\` (они просто исчезают), падает на циклических ссылках, и — главное — **зависит от порядка полей**: \`{a:1,b:2}\` и \`{b:2,a:1}\` дадут разные ключи для одинаковых по смыслу объектов. Плюс он медленный: на больших объектах сериализация может стоить дороже самой функции.

Порядок операций \`compute → set → return\`, а не \`set\` после \`return\` — очевидно, но на доске люди путают.

\`fn.apply(this, args)\` — сохраняем контекст, чтобы мемоизировать методы объекта. Но осторожно: ключ **не включает \`this\`**, поэтому один кэш будет общим для разных экземпляров. Если это важно, кладите \`this\` в ключ или держите кэш на экземпляре.

Кэш **никогда не чистится сам**. Это утечка по построению, и о ней надо сказать до того, как спросят.

## Сложность и edge cases

- **Время:** O(1) на попадание (хеш-таблица) плюс стоимость построения ключа — а она может быть O(размер аргументов) при \`JSON.stringify\`. **Память:** O(числа уникальных ключей), растёт **без ограничения**.
- Функция обязана быть **чистой**. Мемоизировать \`Math.random()\` или запрос к серверу — значит навсегда заморозить первый ответ.
- Аргументы-объекты: два разных объекта с одинаковым содержимым дадут один ключ через JSON — иногда это то, что надо, иногда баг. Для ключа-по-ссылке берут \`WeakMap\` (и он же спасает от утечки), но только для одного аргумента.
- \`undefined\` и \`null\` в аргументах: \`JSON.stringify([undefined])\` даёт \`"[null]"\` — коллизия с реальным \`null\`.
- \`NaN\`, \`Infinity\`, \`Date\` — JSON превращает их в \`null\` или строку, теряя тип.
- Функция бросила исключение — результат не кэшируется, следующий вызов попробует снова. Обычно это желаемое поведение.

## Как рассуждать вслух

> Уточню, чистая ли функция и какие у неё аргументы — от этого зависит стратегия ключа. Замыкаю \`Map\` и возвращаю обычную \`function\`, чтобы сохранить \`this\`. Ключ строю через \`resolver\`, если его дали, иначе \`JSON.stringify(args)\`. Проверяю \`cache.has(key)\`, а не значение: иначе закэшированный \`undefined\` будет пересчитываться каждый раз. На промахе считаю через \`fn.apply(this, args)\`, кладу в кэш и возвращаю. Добавлю \`clear()\`. Это тетрадка с решёнными задачами. Сам честно скажу про слабости JSON-ключа: он зависит от порядка полей, теряет \`undefined\` и функции, падает на циклах и медленный на больших объектах. И главное — кэш растёт без ограничения, поэтому в проде нужен LRU или \`WeakMap\`. Попадание O(1), память O(числа уникальных ключей).

## Follow-up, которые зададут

- **Как ограничить размер кэша?** — LRU-эвикция: \`Map\` в JS сохраняет порядок вставки, поэтому «самый старый» — это \`cache.keys().next().value\`; при переполнении удаляем его, а при попадании переставляем ключ в конец.
- **Чем плох JSON-ключ?** — медленный, зависит от порядка полей, теряет \`undefined\`/функции/\`Symbol\`, падает на циклах.
- **Почему \`has\`, а не сравнение с \`undefined\`?** — чтобы функция, легально возвращающая \`undefined\`, кэшировалась.
- **Когда \`WeakMap\`?** — когда ключ это объект и надо, чтобы кэш не мешал сборке мусора; работает только для одного аргумента-объекта.
- **Чем memoize отличается от \`once\`?** — \`once\` игнорирует аргументы и запускает функцию ровно один раз; memoize держит по записи на каждый набор аргументов.
- **Как мемоизировать асинхронную функцию?** — кэшировать **промис**, а не результат; тогда параллельные вызовы с одним ключом схлопнутся в один запрос. Ошибку из кэша обычно удаляют.
- **Нужен ли TTL?** — да, если данные устаревают: храните \`{ value, expiresAt }\` и проверяйте время при попадании.`,
      en: `## In short: what they're asking for

A wrapper that **remembers answers it already computed**: call the function twice with the same arguments and the second time it pulls from a cache instead of recomputing. The trick: a \`Map\` in a closure plus a function that turns arguments into one key.

Analogy: **a notebook of solved problems**. Before solving, you check the notebook: "did this one already, here's the answer." The hard part isn't the cache — it's **how you turn a set of arguments into a single key**.

## The idea, step by step

1. Inside \`memoize\`, create \`const cache = new Map()\` — it lives in the closure and is shared across all calls of the wrapper.
2. Return a plain \`function memoized(...args)\` (not an arrow — we need \`this\`).
3. Build the key: \`const key = resolver ? resolver(...args) : JSON.stringify(args)\`. A custom resolver is how you sidestep JSON's weaknesses.
4. Check \`if (cache.has(key)) return cache.get(key)\`. \`has\`, not \`get(key) !== undefined\` — otherwise a cached \`undefined\` gets recomputed forever.
5. On a miss: \`const result = fn.apply(this, args)\`, then \`cache.set(key, result)\`, then \`return result\`.
6. Attach \`memoized.clear = () => cache.clear()\` — without it the cache can never be reset.

## Walking through the code

\`cache.has(key)\` instead of a value check is the correction interviewers ask for most often. If the function legitimately returns \`undefined\`, \`null\` or \`0\`, a value-based check breaks.

\`JSON.stringify(args)\` is the default key, and you should criticise it yourself. It **doesn't serialise** functions, \`undefined\` or \`Symbol\` (they just vanish), throws on circular references, and — crucially — **depends on property order**: \`{a:1,b:2}\` and \`{b:2,a:1}\` produce different keys for semantically identical objects. It's also slow: on big objects the serialisation can cost more than the function itself.

The order \`compute → set → return\` rather than setting after returning is obvious, yet people muddle it on a whiteboard.

\`fn.apply(this, args)\` preserves the context so object methods can be memoized. Careful though: the key **doesn't include \`this\`**, so one cache is shared across instances. If that matters, put \`this\` in the key or keep the cache per instance.

The cache **never evicts anything**. That's a leak by construction, and you should say so before they ask.

## Complexity and edge cases

- **Time:** O(1) per hit (hash table) plus the cost of building the key — which can be O(argument size) with \`JSON.stringify\`. **Memory:** O(number of distinct keys), growing **without bound**.
- The function must be **pure**. Memoizing \`Math.random()\` or a server call freezes the first answer forever.
- Object arguments: two distinct objects with identical content collapse to one JSON key — sometimes desirable, sometimes a bug. For identity-based keys use a \`WeakMap\` (which also fixes the leak), but only for a single argument.
- \`undefined\` and \`null\` in arguments: \`JSON.stringify([undefined])\` yields \`"[null]"\` — a collision with a real \`null\`.
- \`NaN\`, \`Infinity\`, \`Date\` — JSON turns them into \`null\` or a string, losing the type.
- If the function throws, nothing is cached and the next call retries. That's usually what you want.

## How to think out loud

> I'd ask whether the function is pure and what its arguments look like — that drives the key strategy. I close over a \`Map\` and return a plain \`function\` to preserve \`this\`. The key comes from \`resolver\` if given, otherwise \`JSON.stringify(args)\`. I check \`cache.has(key)\`, not the value: otherwise a cached \`undefined\` would recompute every time. On a miss I call \`fn.apply(this, args)\`, store it and return. I'd add a \`clear()\`. It's a notebook of solved problems. I'd volunteer the weaknesses of the JSON key myself: property-order dependent, loses \`undefined\` and functions, throws on cycles, slow on big objects. And the big one — the cache grows unbounded, so production needs an LRU or a \`WeakMap\`. A hit is O(1); memory is O(distinct keys).

## Follow-ups they'll ask

- **How do you bound the cache?** — LRU eviction: a JS \`Map\` preserves insertion order, so the oldest key is \`cache.keys().next().value\`; delete it on overflow and re-insert a key on a hit to move it to the end.
- **What's wrong with a JSON key?** — slow, order-dependent, loses \`undefined\`/functions/\`Symbol\`, throws on cycles.
- **Why \`has\` rather than comparing to \`undefined\`?** — so a function that legitimately returns \`undefined\` gets cached.
- **When would you use a \`WeakMap\`?** — when the key is an object and the cache must not block garbage collection; only works with a single object argument.
- **How is memoize different from \`once\`?** — \`once\` ignores arguments and runs the function exactly once; memoize keeps one entry per argument set.
- **How do you memoize an async function?** — cache the **promise**, not the result; then concurrent calls with the same key collapse into one request. Errors are usually evicted from the cache.
- **Do you need a TTL?** — yes when data goes stale: store \`{ value, expiresAt }\` and check the time on a hit.`
    },
    codeSnippet: `function memoize(fn, resolver) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  memoized.clear = () => cache.clear();
  return memoized;
}

// usage
const slowSquare = (n) => { /* heavy */ return n * n; };
const fast = memoize(slowSquare);
fast(9); // computes
fast(9); // cached`
  },
  {
    id: 'lc-014',
    category: 'live-coding',
    level: 'Medium',
    tags: ['once', 'closures', 'guards'],
    question: {
      ru: 'Реализуйте once(fn): возвращает функцию, которая вызывает fn только один раз; при последующих вызовах возвращает закэшированный результат первого вызова. Пример: ленивая инициализация, одноразовый init.',
      en: 'Implement once(fn): returns a function that calls fn only once; subsequent calls return the cached result of the first call. Example: lazy init, one-time setup.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Обёртка-«одноразовый предохранитель»: первый вызов проходит и выполняет \`fn\`, все следующие возвращают тот же результат, не трогая \`fn\`. Приём: флаг и сохранённое значение в замыкании.

Аналогия: **турникет по разовому билету**. Первый раз билет пропускает и «прожигается». Дальше вы можете тыкать им в турникет сколько угодно — он показывает тот же самый ответ и внутрь никого не пускает.

## Идея решения по шагам

1. В \`once(fn)\` заводим в замыкании \`let called = false\` и \`let result\` (без начального значения — оно \`undefined\`).
2. Возвращаем обычную \`function (...args)\` — нужен динамический \`this\`.
3. Внутри одна проверка: \`if (!called) { ... }\`.
4. В теле: сначала \`called = true\`, потом \`result = fn.apply(this, args)\`, потом \`fn = null\`.
5. За \`if\` — безусловное \`return result\`. Оно обслуживает и первый вызов, и все последующие.

## Разбор кода

\`fn = null\` после вызова — не косметика. Обёртка живёт долго (её вешают в модуль или на объект), а \`fn\` может замыкать тяжёлые данные: DOM-узлы, ответ сервера, целый конфиг. Обнулив ссылку, вы даёте сборщику мусора всё это забрать. На собеседовании эту строчку почти никто не пишет, а она сильно повышает оценку.

\`called = true\` стоит **до** вызова \`fn\`. Это защита от рекурсии: если \`fn\` внутри себя случайно позовёт обёртку, она не уйдёт в бесконечный цикл, а вернёт \`undefined\`.

Обратная сторона того же порядка — **поведение при исключении**. Если \`fn\` бросит, флаг уже взведён, \`fn\` при этом ещё не обнулился, а \`result\` остался \`undefined\`. То есть повторить инициализацию будет нельзя. Это осознанный компромисс, и его стоит проговорить: если нужен ретрай, ставьте \`called = true\` **после** успешного вызова.

Аргументы и \`this\` пробрасываются **только у первого вызова** — второй их молча игнорирует. Это тоже надо сказать вслух, потому что выглядит неожиданно.

## Сложность и edge cases

- **Время:** O(1) на любой вызов, **память:** O(1) — флаг плюс одно значение.
- \`fn\` бросила на первом вызове: в этой реализации повтор невозможен, вернётся \`undefined\`. Если требуется ретрай — переносим \`called = true\` в конец \`try\`-блока.
- \`fn\` вернула \`undefined\` — всё корректно: мы полагаемся на флаг, а не на значение.
- Вызов с разными аргументами: второй вызов вернёт результат **первого**, аргументы игнорируются. Это принципиальное отличие от \`memoize\`.
- Асинхронная \`fn\`: закэшируется **промис**, а не значение — что как раз удобно, все ждут один и тот же запрос.
- Рекурсивный вызов изнутри \`fn\` вернёт \`undefined\`, а не зациклится.

## Как рассуждать вслух

> Уточню, что должно происходить, если функция бросит на первом вызове. Держу в замыкании флаг \`called\` и переменную \`result\`, возвращаю обычную \`function\` ради динамического \`this\`. Внутри проверяю \`if (!called)\`: взвожу флаг, вызываю \`fn.apply(this, args)\`, сохраняю результат и обнуляю \`fn\`, чтобы сборщик мусора забрал всё, что она замыкала — обёртка живёт долго, а данные могут быть тяжёлыми. Ниже безусловный \`return result\`, он обслуживает и первый вызов, и все остальные. Это турникет по разовому билету. Отмечу, что флаг взводится до вызова — это защищает от рекурсии, но означает, что после исключения повторить нельзя; если нужен ретрай, переставлю флаг после успешного вызова. И что аргументы второго вызова игнорируются — в отличие от memoize. Всё O(1).

## Follow-up, которые зададут

- **Где применяется?** — ленивая инициализация синглтона, одноразовые обработчики событий, «показать онбординг только раз», регистрация полифилов.
- **Чем отличается от \`memoize\`?** — \`once\` игнорирует аргументы и держит ровно один результат; \`memoize\` хранит по записи на каждый набор аргументов.
- **Зачем \`fn = null\`?** — освободить замкнутые функцией данные для сборщика мусора; иначе долгоживущая обёртка держит их вечно.
- **Что если \`fn\` бросит?** — здесь вызов считается состоявшимся и повтора не будет; при необходимости взводите флаг после успеха.
- **Как сделать \`once\` для промиса?** — то же самое, просто кэшируется промис; параллельные вызовы схлопнутся в один запрос, но и ошибка закэшируется навсегда.
- **Как добавить \`reset()\`?** — метод, который сбрасывает \`called\` и \`result\`; правда, тогда нельзя обнулять \`fn\`.
- **Есть ли это в стандарте?** — есть \`addEventListener(..., { once: true })\`, но это про событие, а не про функцию.`,
      en: `## In short: what they're asking for

A "single-use fuse" wrapper: the first call goes through and runs \`fn\`, every later call returns the same result without touching \`fn\`. The trick: a flag and a stored value in a closure.

Analogy: **a turnstile with a single-use ticket**. The first time the ticket lets you in and gets punched. After that you can wave it at the turnstile as much as you like — same answer, nobody gets through.

## The idea, step by step

1. In \`once(fn)\` keep \`let called = false\` and \`let result\` (no initialiser — it's \`undefined\`) in the closure.
2. Return a plain \`function (...args)\` — we need the dynamic \`this\`.
3. Inside there's a single check: \`if (!called) { ... }\`.
4. In the body: first \`called = true\`, then \`result = fn.apply(this, args)\`, then \`fn = null\`.
5. After the \`if\`, an unconditional \`return result\`. It serves both the first call and all the rest.

## Walking through the code

\`fn = null\` after the call isn't cosmetic. The wrapper lives a long time (it gets stored in a module or on an object), and \`fn\` may close over heavy data: DOM nodes, a server response, a whole config. Nulling the reference lets the GC reclaim all of it. Almost nobody writes this line in an interview, and it noticeably raises the score.

\`called = true\` comes **before** calling \`fn\`. That guards against recursion: if \`fn\` accidentally calls the wrapper from inside itself, it won't loop forever — it returns \`undefined\`.

The flip side of that same order is **behaviour on throw**. If \`fn\` throws, the flag is already set, \`fn\` hasn't been nulled yet, and \`result\` stays \`undefined\`. So the initialisation can't be retried. That's a deliberate trade-off worth stating: if you want retries, set \`called = true\` **after** a successful call.

Arguments and \`this\` are forwarded **only on the first call** — the second silently ignores them. Say this out loud too, because it surprises people.

## Complexity and edge cases

- **Time:** O(1) for any call, **memory:** O(1) — a flag plus one value.
- \`fn\` throws on the first call: in this implementation there's no retry and \`undefined\` comes back. If retries are needed, move \`called = true\` to the end of a \`try\` block.
- \`fn\` returning \`undefined\` works fine: we rely on the flag, not the value.
- Called with different arguments: the second call returns the **first** result and ignores the arguments. That's the fundamental difference from \`memoize\`.
- An async \`fn\` caches the **promise**, not the value — convenient, since everyone awaits the same request.
- A recursive call from inside \`fn\` returns \`undefined\` rather than looping.

## How to think out loud

> I'd clarify what should happen if the function throws on the first call. I keep a \`called\` flag and a \`result\` variable in a closure and return a plain \`function\` for the dynamic \`this\`. Inside I check \`if (!called)\`: set the flag, call \`fn.apply(this, args)\`, store the result and null out \`fn\` so the GC can reclaim whatever it captured — the wrapper lives long and the data can be heavy. Below sits an unconditional \`return result\`, serving both the first call and the rest. It's a single-use turnstile ticket. I'd note the flag is set before the call, which guards against recursion but means a throw can't be retried; if retries matter I'd set the flag after success. And that the second call's arguments are ignored — unlike memoize. Everything is O(1).

## Follow-ups they'll ask

- **Where is it used?** — lazy singleton init, one-shot event handlers, "show the onboarding only once", polyfill registration.
- **How is it different from \`memoize\`?** — \`once\` ignores arguments and keeps exactly one result; \`memoize\` keeps one entry per argument set.
- **Why \`fn = null\`?** — to free whatever the function captured for the GC; otherwise a long-lived wrapper pins it forever.
- **What if \`fn\` throws?** — here the call counts as made and there's no retry; set the flag after success if you need one.
- **How would you do \`once\` for a promise?** — the same code; it just caches the promise, so concurrent calls collapse into one request — but an error is cached forever too.
- **How would you add \`reset()\`?** — a method that clears \`called\` and \`result\`; though then you can't null out \`fn\`.
- **Is there anything like it in the platform?** — \`addEventListener(..., { once: true })\`, but that's about the event, not the function.`
    },
    codeSnippet: `function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
      fn = null; // release reference
    }
    return result;
  };
}`
  },
  {
    id: 'lc-015',
    category: 'live-coding',
    level: 'Hard',
    tags: ['deep-clone', 'recursion', 'cycles'],
    question: {
      ru: 'Реализуйте deepClone(value): глубокое копирование объектов и массивов. Корректно обработайте циклические ссылки (через WeakMap), Date, RegExp, Map, Set. Примитивы возвращаются как есть.',
      en: 'Implement deepClone(value): deep copy of objects and arrays. Correctly handle circular references (via WeakMap), Date, RegExp, Map, Set. Primitives are returned as-is.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Скопировать структуру целиком, до самого дна, так чтобы копия и оригинал больше никак не были связаны. Приём: **рекурсия плюс \`WeakMap\` уже скопированных объектов** — она же решает проблему циклических ссылок.

Аналогия: **перерисовываете карту метро от руки**. Идёте по линиям и перерисовываете станции. \`WeakMap\` — это список «эту станцию я уже нарисовал, вот она на моём листе». Без такого списка на кольцевой линии вы будете рисовать вечно.

## Идея решения по шагам

1. Сигнатура \`deepClone(value, seen = new WeakMap())\` — «журнал посещённых» передаётся вниз по рекурсии.
2. **Выход из рекурсии:** \`if (value === null || typeof value !== 'object') return value\`. Примитивы копировать не надо, они и так по значению. Проверка на \`null\` обязательна, потому что \`typeof null === 'object'\`.
3. **Защита от циклов:** \`if (seen.has(value)) return seen.get(value)\` — если этот объект уже копировали, отдаём готовую копию.
4. **Простые спецтипы** — \`Date\` через \`new Date(value)\`, \`RegExp\` через \`new RegExp(value.source, value.flags)\`. Внутри у них нечего рекурсивно обходить, поэтому в \`seen\` их можно не класть.
5. **Map/Set** — создаём пустой контейнер, **сразу** кладём в \`seen\`, и только потом наполняем рекурсивными клонами. Для \`Map\` клонируем и ключи, и значения.
6. **Массив или объект** — \`Array.isArray(value) ? [] : {}\`, снова **сразу** в \`seen\`, затем цикл по \`Reflect.ownKeys(value)\` с рекурсивным клонированием каждого значения.
7. \`return result\`.

## Разбор кода

Самое важное во всём решении — **порядок двух строк**:

\`\`\`js
const result = Array.isArray(value) ? [] : {};
seen.set(value, result);   // ДО обхода потомков!
\`\`\`

Если поставить \`seen.set\` после цикла, защита от циклов не сработает: при \`a.self = a\` рекурсия дойдёт до \`a\` снова, не найдёт его в журнале и уйдёт в бесконечность. Кладём **пустую заготовку** и заполняем её потом — к моменту, когда рекурсия вернётся к этому узлу, ссылка уже корректна.

Почему \`WeakMap\`, а не \`Map\`? Ключи в \`WeakMap\` держатся **слабо**: если объект больше нигде не нужен, сборщик заберёт и его, и запись. Обычная \`Map\` держала бы весь исходный граф в памяти до конца работы функции — и, если бы \`seen\` жила дольше, это была бы утечка.

\`Reflect.ownKeys\` вместо \`Object.keys\` — берёт и строковые ключи, и **символы**. Полноты ради стоит упомянуть, что неперечислимые свойства он тоже вернёт, а вот дескрипторы (getter/setter) при копировании через \`result[key] = ...\` всё равно превратятся в обычные значения.

Прототип в этой версии **теряется**: клон объекта класса станет обычным объектом. Если нужно сохранить — \`Object.create(Object.getPrototypeOf(value))\` вместо \`{}\`.

## Сложность и edge cases

- **Время:** O(n) по числу узлов графа — каждый узел посещаем ровно один раз благодаря \`seen\`. **Память:** O(n) под копию плюс O(n) под журнал; глубина стека — O(глубины структуры).
- Циклы (\`a.self = a\`) и **общие ссылки** (\`{x: shared, y: shared}\`): \`WeakMap\` решает обе задачи — во втором случае в копии тоже будет один общий объект, а не два разных.
- \`JSON.parse(JSON.stringify(x))\` **не годится**: теряет функции, \`undefined\`, \`Symbol\`, превращает \`Date\` в строку, \`NaN\`/\`Infinity\` в \`null\` и падает на циклах.
- Функции не клонируются — копируется ссылка (обычно это и требуется).
- Очень глубокая структура (список на 100 000 уровней) — **переполнение стека**; лечится переписыванием на явный стек и цикл.
- Getter/setter, неперечислимые свойства, прототип — в этой версии теряются.
- \`Symbol\` как значение копируется по ссылке — это нормально, он примитив.

## Как рассуждать вслух

> Уточню, какие типы надо поддержать и важен ли прототип. Пишу рекурсию с дополнительным параметром \`seen = new WeakMap()\`. Первым делом выход: если значение не объект или \`null\` — возвращаю как есть, не забывая, что \`typeof null\` это \`'object'\`. Дальше проверяю \`seen\`: если объект уже клонировали, отдаю готовую копию — так решаются и циклы, и общие ссылки. Потом ветки под \`Date\`, \`RegExp\`, \`Map\`, \`Set\`, а в конце общий случай массив или объект. Ключевой момент: заготовку кладу в \`seen\` **до** обхода детей, иначе на \`a.self = a\` рекурсия уйдёт в бесконечность. \`WeakMap\`, а не \`Map\`, чтобы не держать исходный граф и не мешать сборщику. Обхожу через \`Reflect.ownKeys\`, чтобы захватить символы. Время и память O(n) по узлам, глубина стека — по глубине структуры.

## Follow-up, которые зададут

- **Почему \`WeakMap\`, а не \`Map\`?** — слабые ссылки не мешают сборке мусора и не удерживают исходный граф.
- **Почему \`seen.set\` до обхода детей?** — иначе циклическая ссылка не найдёт заготовку в журнале и рекурсия уйдёт в бесконечность.
- **Чем плох \`JSON.parse(JSON.stringify(x))\`?** — теряет функции, \`undefined\`, \`Symbol\`, ломает \`Date\`, \`NaN\`, \`Infinity\` и падает на циклах.
- **Когда брать \`structuredClone\`?** — нативный API (с 2022 везде): поддерживает циклы, \`Date\`, \`Map\`, \`Set\`, \`ArrayBuffer\`, но **не умеет** функции, DOM-узлы и прототипы классов.
- **Как сохранить прототип?** — \`Object.create(Object.getPrototypeOf(value))\` вместо литерала \`{}\`.
- **Как избежать переполнения стека на глубокой структуре?** — переписать на итеративный обход с явным стеком.
- **Что с getter/setter?** — копировать через \`Object.getOwnPropertyDescriptors\` и \`Object.defineProperty\`, иначе геттер выполнится и превратится в статичное значение.`,
      en: `## In short: what they're asking for

Copy a whole structure, all the way down, so that copy and original share nothing any more. The trick: **recursion plus a \`WeakMap\` of already-cloned objects** — which is also what solves circular references.

Analogy: **redrawing a metro map by hand**. You follow the lines and redraw the stations. The \`WeakMap\` is your list of "I already drew this station, here it is on my sheet". Without such a list, a circle line would keep you drawing forever.

## The idea, step by step

1. Signature \`deepClone(value, seen = new WeakMap())\` — the "visited log" is threaded down the recursion.
2. **Recursion base:** \`if (value === null || typeof value !== 'object') return value\`. Primitives need no copying. The \`null\` check is mandatory because \`typeof null === 'object'\`.
3. **Cycle guard:** \`if (seen.has(value)) return seen.get(value)\` — if we already cloned this object, hand back the existing copy.
4. **Simple special types** — \`Date\` via \`new Date(value)\`, \`RegExp\` via \`new RegExp(value.source, value.flags)\`. They have no children to recurse into, so they needn't go into \`seen\`.
5. **Map/Set** — create the empty container, put it into \`seen\` **immediately**, and only then fill it with recursive clones. For a \`Map\`, clone both keys and values.
6. **Array or object** — \`Array.isArray(value) ? [] : {}\`, again into \`seen\` **immediately**, then loop over \`Reflect.ownKeys(value)\` cloning each value recursively.
7. \`return result\`.

## Walking through the code

The single most important thing in the whole solution is **the order of two lines**:

\`\`\`js
const result = Array.isArray(value) ? [] : {};
seen.set(value, result);   // BEFORE walking the children!
\`\`\`

Put \`seen.set\` after the loop and the cycle guard stops working: with \`a.self = a\` the recursion reaches \`a\` again, doesn't find it in the log, and runs forever. We register an **empty shell** and fill it later — by the time recursion returns to this node, the reference is already correct.

Why \`WeakMap\` and not \`Map\`? \`WeakMap\` holds its keys **weakly**: if an object is no longer needed anywhere, the GC reclaims it along with the entry. A regular \`Map\` would pin the whole source graph in memory for the function's lifetime — and would be a leak if \`seen\` outlived the call.

\`Reflect.ownKeys\` rather than \`Object.keys\` picks up both string keys and **symbols**. For completeness: it also returns non-enumerable properties, though descriptors (getters/setters) still collapse into plain values when copied with \`result[key] = ...\`.

The prototype is **lost** in this version: cloning a class instance gives a plain object. To keep it, use \`Object.create(Object.getPrototypeOf(value))\` instead of \`{}\`.

## Complexity and edge cases

- **Time:** O(n) in graph nodes — each node is visited exactly once thanks to \`seen\`. **Memory:** O(n) for the copy plus O(n) for the log; stack depth is O(structure depth).
- Cycles (\`a.self = a\`) and **shared references** (\`{x: shared, y: shared}\`): the \`WeakMap\` solves both — in the second case the copy also gets one shared object, not two distinct ones.
- \`JSON.parse(JSON.stringify(x))\` **won't do**: it drops functions, \`undefined\` and \`Symbol\`, turns \`Date\` into a string, \`NaN\`/\`Infinity\` into \`null\`, and throws on cycles.
- Functions aren't cloned — the reference is copied (usually what you want).
- A very deep structure (a 100,000-level list) **overflows the stack**; the fix is an explicit stack and a loop.
- Getters/setters, non-enumerable properties and the prototype are lost in this version.
- A \`Symbol\` value is copied by reference — fine, it's a primitive.

## How to think out loud

> I'd confirm which types must be supported and whether the prototype matters. I write a recursion with an extra \`seen = new WeakMap()\` parameter. First the base case: if the value isn't an object, or is \`null\`, return it as-is — remembering \`typeof null\` is \`'object'\`. Then I check \`seen\`: if this object was already cloned, return the existing copy — that handles both cycles and shared references. Then branches for \`Date\`, \`RegExp\`, \`Map\`, \`Set\`, and finally the general array-or-object case. The key move: I register the shell in \`seen\` **before** walking the children, otherwise \`a.self = a\` sends the recursion to infinity. \`WeakMap\` rather than \`Map\` so I don't pin the source graph. I iterate with \`Reflect.ownKeys\` to catch symbols. Time and memory are O(n) in nodes, stack depth follows structure depth.

## Follow-ups they'll ask

- **Why \`WeakMap\` and not \`Map\`?** — weak references don't block GC and don't retain the source graph.
- **Why \`seen.set\` before walking children?** — otherwise a circular reference finds no shell in the log and recursion runs forever.
- **What's wrong with \`JSON.parse(JSON.stringify(x))\`?** — it loses functions, \`undefined\` and \`Symbol\`, mangles \`Date\`, \`NaN\` and \`Infinity\`, and throws on cycles.
- **When would you reach for \`structuredClone\`?** — the native API (universally available since 2022): it handles cycles, \`Date\`, \`Map\`, \`Set\`, \`ArrayBuffer\`, but **cannot** do functions, DOM nodes or class prototypes.
- **How do you preserve the prototype?** — \`Object.create(Object.getPrototypeOf(value))\` instead of an \`{}\` literal.
- **How do you avoid a stack overflow on a deep structure?** — rewrite it as an iterative walk with an explicit stack.
- **What about getters/setters?** — copy via \`Object.getOwnPropertyDescriptors\` and \`Object.defineProperty\`, otherwise the getter runs and freezes into a static value.`
    },
    codeSnippet: `function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const result = new Map();
    seen.set(value, result);
    value.forEach((v, k) => result.set(deepClone(k, seen), deepClone(v, seen)));
    return result;
  }
  if (value instanceof Set) {
    const result = new Set();
    seen.set(value, result);
    value.forEach((v) => result.add(deepClone(v, seen)));
    return result;
  }

  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], seen);
  }
  return result;
}`
  },
  {
    id: 'lc-016',
    category: 'live-coding',
    level: 'Hard',
    tags: ['deep-equal', 'recursion', 'comparison'],
    question: {
      ru: 'Реализуйте deepEqual(a, b): структурное сравнение значений любой вложенности. Сравните примитивы, массивы, объекты. Корректно обработайте NaN (NaN равен NaN) и разные типы.',
      en: 'Implement deepEqual(a, b): structural comparison of arbitrarily nested values. Compare primitives, arrays, objects. Correctly handle NaN (NaN equals NaN) and differing types.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Сравнить две структуры **по содержимому**, а не по ссылке, на любой глубине. Приём: рекурсия «сначала быстрые отсечки, потом поход вглубь».

Аналогия: **сверяете два экземпляра договора**. Сначала смотрите, одинаковое ли число страниц — если нет, дальше можно не читать. Потом идёте по пунктам и сверяете каждый; если пункт сам содержит подпункты, спускаетесь в него.

## Идея решения по шагам

1. **Быстрый успех:** \`if (Object.is(a, b)) return true\`. Это ловит одинаковые примитивы, одну и ту же ссылку и — важно — \`NaN\` с \`NaN\`.
2. **Быстрый провал:** если хоть один не объект или равен \`null\` — значит они разные примитивы (иначе шаг 1 уже сработал бы), возвращаем \`false\`.
3. **Спецтип:** если оба \`Date\` — сравниваем \`a.getTime() === b.getTime()\`, потому что у дат нет собственных ключей и общий алгоритм счёл бы любые две даты равными.
4. **Считаем ключи:** \`Reflect.ownKeys(a)\` и \`Reflect.ownKeys(b)\`. Если длины разные — \`return false\`, ранний выход.
5. **Рекурсия по ключам:** \`keysA.every(key => hasOwnProperty(b, key) && deepEqual(a[key], b[key]))\`. Проверка наличия ключа нужна, потому что длины могут совпасть при разных наборах ключей.
6. \`every\` сам делает короткое замыкание — на первом же \`false\` обход прекращается.

## Разбор кода

\`Object.is\` вместо \`===\` — центральная деталь. \`NaN === NaN\` даёт \`false\`, а по-человечески две «не-числа» должны быть равны. Побочно \`Object.is\` различает \`+0\` и \`-0\`, что для сравнения структур обычно и правильно.

Строка проверки на не-объекты выглядит громоздко (\`typeof a !== 'object' || typeof b !== 'object' || a === null || b === null\`), но каждая её часть нужна: \`typeof null === 'object'\`, поэтому \`null\` пришлось отсечь отдельно, иначе \`Reflect.ownKeys(null)\` бросит.

Ветка \`Date\` — пример того, что **общий алгоритм не работает для встроенных типов**: у объекта \`Date\` нет собственных перечислимых свойств, значит \`keysA.length === keysB.length === 0\` и любые две даты оказались бы «равны». Та же проблема у \`RegExp\` (сравнивайте \`source\` и \`flags\`), \`Map\` и \`Set\`.

\`Object.prototype.hasOwnProperty.call(b, key)\` вместо \`b.hasOwnProperty(key)\` — защита от объектов, созданных через \`Object.create(null)\`, у которых метода просто нет.

\`Reflect.ownKeys\` захватывает и символьные ключи — чуть строже, чем \`Object.keys\`.

## Сложность и edge cases

- **Время:** O(n) по числу узлов в меньшей структуре, с ранним выходом на первом расхождении. **Память:** O(глубины) на стек рекурсии.
- \`NaN\` vs \`NaN\` — равны благодаря \`Object.is\`; \`+0\` vs \`-0\` — не равны.
- Разное число ключей — мгновенный \`false\`.
- Одинаковое число ключей, но разные имена — ловит проверка \`hasOwnProperty\`.
- **Циклические структуры** зациклят эту версию до переполнения стека. Лечение — та же техника, что в \`deepClone\`: \`WeakMap\` посещённых **пар** объектов.
- \`Date\` обработан, а \`RegExp\`, \`Map\`, \`Set\`, \`ArrayBuffer\` — нет; их надо добавлять отдельными ветками.
- Массив против объекта с числовыми ключами (\`[1,2]\` и \`{0:1,1:2}\`) — эта версия сочтёт их равными, потому что не сверяет тип контейнера. Стоит упомянуть как известное упрощение.
- Функции сравниваются по ссылке — иначе никак.

## Как рассуждать вслух

> Начинаю с быстрых отсечек. Первая — \`Object.is(a, b)\`, а не \`===\`: она ловит одинаковые ссылки, одинаковые примитивы и, главное, \`NaN\` с \`NaN\`, которые через \`===\` не равны. Вторая — если хоть одно значение не объект или \`null\`, возвращаю \`false\`, потому что равные примитивы уже отсеялись; \`null\` проверяю отдельно, так как \`typeof null\` это \`'object'\`. Дальше отдельная ветка для \`Date\` — у дат нет собственных ключей, и без неё любые две даты оказались бы равны; сравниваю \`getTime()\`. Потом беру \`Reflect.ownKeys\` у обоих, сравниваю длины — ранний выход — и прохожу \`every\` с рекурсией, проверяя ещё и наличие ключа у \`b\`. Это сверка двух договоров: сначала число страниц, потом пункт за пунктом. Время O(n) по узлам, память — глубина рекурсии. Отдельно скажу, что циклы эту версию положат, лечится \`WeakMap\` посещённых пар.

## Follow-up, которые зададут

- **Почему \`Object.is\`, а не \`===\`?** — \`===\` считает \`NaN !== NaN\`; \`Object.is\` даёт \`true\` и заодно различает \`+0\`/\`-0\`.
- **Как обработать циклы?** — вести \`WeakMap\` посещённых **пар** \`(a, b)\`; если пара уже в обработке, считаем её равной и не спускаемся глубже.
- **Чем отличается от React \`shallowEqual\`?** — тот сравнивает только первый уровень по ссылке, работает за O(числа ключей) и используется в \`memo\`/\`PureComponent\` ради скорости.
- **Что с \`Map\` и \`Set\`?** — нужны отдельные ветки: у \`Set\` сравнивать размер и наличие каждого элемента, у \`Map\` — размер плюс рекурсивное сравнение значений по ключам.
- **Почему \`hasOwnProperty.call\`, а не \`b.hasOwnProperty\`?** — объект мог быть создан через \`Object.create(null)\` и не иметь этого метода.
- **Как сравнить массивы быстрее?** — сначала проверить \`Array.isArray\` у обоих и \`length\`, это дешевле, чем собирать ключи.
- **Где это применяется в реальности?** — сравнение пропсов, дедупликация запросов, тесты (\`toEqual\` в Jest), сравнение состояния в стор-селекторах.`,
      en: `## In short: what they're asking for

Compare two structures **by content**, not by reference, at any depth. The trick: recursion with "cheap checks first, then descend".

Analogy: **checking two copies of a contract**. First you see whether the page counts match — if not, no need to read on. Then you go clause by clause; if a clause has sub-clauses, you descend into it.

## The idea, step by step

1. **Fast yes:** \`if (Object.is(a, b)) return true\`. This catches identical primitives, the same reference and — importantly — \`NaN\` vs \`NaN\`.
2. **Fast no:** if either isn't an object or is \`null\`, they must be different primitives (equal ones already returned in step 1), so return \`false\`.
3. **Special type:** if both are \`Date\`, compare \`a.getTime() === b.getTime()\`, because dates have no own keys and the generic algorithm would call any two dates equal.
4. **Count keys:** \`Reflect.ownKeys(a)\` and \`Reflect.ownKeys(b)\`. Different lengths → \`return false\`, an early exit.
5. **Recurse per key:** \`keysA.every(key => hasOwnProperty(b, key) && deepEqual(a[key], b[key]))\`. The presence check is needed because equal counts don't imply equal key sets.
6. \`every\` short-circuits by itself — it stops at the first \`false\`.

## Walking through the code

\`Object.is\` instead of \`===\` is the central detail. \`NaN === NaN\` is \`false\`, yet intuitively two "not-a-numbers" should compare equal. As a side effect \`Object.is\` distinguishes \`+0\` from \`-0\`, which is usually right for structural comparison.

The non-object guard looks bulky (\`typeof a !== 'object' || typeof b !== 'object' || a === null || b === null\`), but every part earns its place: \`typeof null === 'object'\`, so \`null\` needs its own check, otherwise \`Reflect.ownKeys(null)\` throws.

The \`Date\` branch shows that **the generic algorithm fails for built-in types**: a \`Date\` object has no own enumerable properties, so \`keysA.length === keysB.length === 0\` and any two dates would look equal. The same problem hits \`RegExp\` (compare \`source\` and \`flags\`), \`Map\` and \`Set\`.

\`Object.prototype.hasOwnProperty.call(b, key)\` rather than \`b.hasOwnProperty(key)\` guards against objects created with \`Object.create(null)\`, which simply lack the method.

\`Reflect.ownKeys\` also picks up symbol keys — slightly stricter than \`Object.keys\`.

## Complexity and edge cases

- **Time:** O(n) in the nodes of the smaller structure, with an early exit at the first difference. **Memory:** O(depth) for the recursion stack.
- \`NaN\` vs \`NaN\` — equal thanks to \`Object.is\`; \`+0\` vs \`-0\` — not equal.
- Different key counts — an immediate \`false\`.
- Equal counts but different names — caught by the \`hasOwnProperty\` check.
- **Cyclic structures** will loop this version into a stack overflow. The fix is the \`deepClone\` technique: a \`WeakMap\` of visited **pairs** of objects.
- \`Date\` is handled but \`RegExp\`, \`Map\`, \`Set\`, \`ArrayBuffer\` are not; they need their own branches.
- An array versus an object with numeric keys (\`[1,2]\` vs \`{0:1,1:2}\`) compares equal here, since we never check the container type. Worth calling out as a known simplification.
- Functions compare by reference — there's no alternative.

## How to think out loud

> I start with cheap checks. First \`Object.is(a, b)\` rather than \`===\`: it catches identical references, identical primitives and crucially \`NaN\` vs \`NaN\`, which \`===\` says are different. Second, if either value isn't an object or is \`null\`, I return \`false\`, since equal primitives already passed; \`null\` needs its own check because \`typeof null\` is \`'object'\`. Then a dedicated \`Date\` branch — dates have no own keys, so without it any two dates would look equal; I compare \`getTime()\`. Next I take \`Reflect.ownKeys\` on both, compare lengths for an early exit, and run \`every\` with recursion, also checking the key exists on \`b\`. It's like checking two copies of a contract: page count first, then clause by clause. Time is O(n) in nodes, memory is the recursion depth. I'd note cycles break this version and are fixed with a \`WeakMap\` of visited pairs.

## Follow-ups they'll ask

- **Why \`Object.is\` and not \`===\`?** — \`===\` treats \`NaN !== NaN\`; \`Object.is\` returns \`true\` and also distinguishes \`+0\`/\`-0\`.
- **How do you handle cycles?** — keep a \`WeakMap\` of visited **pairs** \`(a, b)\`; if a pair is already in progress, treat it as equal and don't descend.
- **How does React's \`shallowEqual\` differ?** — it compares only the first level by reference, runs in O(key count) and is used by \`memo\`/\`PureComponent\` for speed.
- **What about \`Map\` and \`Set\`?** — they need their own branches: for a \`Set\` compare size and membership, for a \`Map\` compare size plus recursive value comparison per key.
- **Why \`hasOwnProperty.call\` and not \`b.hasOwnProperty\`?** — the object may come from \`Object.create(null)\` and lack the method.
- **How could you compare arrays faster?** — check \`Array.isArray\` on both and compare \`length\` first; that's cheaper than collecting keys.
- **Where is this used in practice?** — prop comparison, request deduplication, tests (Jest's \`toEqual\`), state comparison in store selectors.`
    },
    codeSnippet: `function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key])
  );
}`
  },
  {
    id: 'lc-017',
    category: 'live-coding',
    level: 'Hard',
    tags: ['deep-merge', 'recursion', 'objects'],
    question: {
      ru: 'Реализуйте deepMerge(target, ...sources): рекурсивно сливает объекты. Вложенные объекты мержатся, примитивы и массивы из source перезаписывают target. Не мутируйте target (верните новый объект).',
      en: 'Implement deepMerge(target, ...sources): recursively merges objects. Nested objects are merged; primitives and arrays from the source overwrite the target. Do not mutate target (return a new object).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Наложить один объект конфигурации на другой так, чтобы **вложенные объекты дополняли друг друга, а не затирались целиком**. Приём: рекурсия по ключам с одним решающим вопросом на каждом шаге — «оба значения чистые объекты или нет».

Аналогия: **накладываете кальку с правками на чертёж**. Если на кальке нарисована целая новая деталь — она заменяет старую. А если калька уточняет только одну линию внутри детали — вы спускаетесь внутрь и правите линию, не выбрасывая остальную деталь. \`Object.assign\` — это «выкинуть деталь целиком», \`deepMerge\` — «править по линиям».

## Идея решения по шагам

1. Сначала пишем предикат \`isPlainObject(v)\`: не \`null\`, \`typeof === 'object'\`, **не массив**, и прототип строго \`Object.prototype\` либо \`null\`. Это отсекает \`Date\`, \`Map\`, экземпляры классов — их сливать нельзя, только заменять.
2. \`const output = { ...target }\` — сразу делаем поверхностную копию, чтобы не мутировать вход.
3. Идём \`for (const source of sources)\`. Если source не чистый объект — \`continue\`.
4. Внутри — \`for (const key of Object.keys(source))\`.
5. **Защита:** \`if (key === '__proto__' || key === 'constructor') continue\`.
6. Берём \`sVal = source[key]\` и \`tVal = output[key]\` и выбираем одно из трёх:
   - оба чистые объекты → \`deepMerge(tVal, sVal)\` — сливаем вглубь;
   - только \`sVal\` чистый объект → \`deepMerge({}, sVal)\` — **глубокая копия** источника;
   - иначе → просто \`sVal\`, перезапись.
7. Возвращаем \`output\`.

## Разбор кода

Ветка \`deepMerge({}, sVal)\` — та, которую забывают чаще всего. Без неё вложенный объект из source попал бы в результат **по ссылке**: потом кто-то мутирует результат и незаметно портит исходный source. Слияние с пустым объектом даёт честную глубокую копию.

Проверка прототипа в \`isPlainObject\` (\`Object.getPrototypeOf(v) === Object.prototype\`) строже, чем просто \`typeof v === 'object'\`. Она нужна, чтобы не разбирать по ключам \`new Date()\` или экземпляр класса — такой «слитый» объект потерял бы прототип и перестал работать.

\`Array.isArray(v)\` в предикате — это и есть выбранная **стратегия для массивов: перезапись целиком**. Другие стратегии (конкатенация, слияние по индексу) тоже встречаются, поэтому стратегию надо уточнить у интервьюера до написания кода.

Пропуск \`__proto__\` и \`constructor\` — защита от **prototype pollution**. Если злоумышленник пришлёт JSON вида \`{"__proto__": {"isAdmin": true}}\`, наивный merge добавит свойство в \`Object.prototype\`, и оно появится у **всех** объектов приложения. Это реальная CVE-категория, и упоминание её сильно поднимает оценку.

\`{ ...target }\` копирует только верхний уровень; глубина обеспечивается рекурсией, каждый уровень которой снова делает свою копию.

## Сложность и edge cases

- **Время:** O(n) по суммарному числу ключей во всех источниках. **Память:** O(n) под результат, стек — O(глубины вложенности).
- \`null\` в source: \`typeof null === 'object'\`, но \`isPlainObject\` его отсекает, значит \`null\` **перезаписывает** — обычно это и нужно.
- \`undefined\` в source: тоже перезапишет значение из target. Многие реализации это специально пропускают — уточняйте.
- Массивы: здесь **заменяются целиком**. \`[1,2,3]\` + \`[9]\` даст \`[9]\`, а не \`[9,2,3]\`.
- \`Date\`, \`Map\`, экземпляры классов — перезаписываются по ссылке, вглубь не идём.
- Ключи \`__proto__\`/\`constructor\` — отфильтрованы.
- Пустой список источников — вернём просто копию target.
- Циклические ссылки в source зациклят рекурсию; при необходимости добавьте \`WeakMap\`, как в \`deepClone\`.
- Символьные ключи \`Object.keys\` не увидит — для полноты нужен \`Reflect.ownKeys\`.

## Как рассуждать вслух

> Первым делом уточню стратегию для массивов — заменять целиком или конкатенировать; я по умолчанию заменяю. Пишу предикат \`isPlainObject\`: не \`null\`, объект, не массив, и прототип строго \`Object.prototype\` или \`null\` — так я не полезу разбирать \`Date\` или экземпляр класса. Делаю \`output = { ...target }\`, чтобы не мутировать вход. Дальше по каждому источнику и каждому ключу три случая: оба значения чистые объекты — рекурсивно сливаю; только источник объект — делаю \`deepMerge({}, sVal)\`, то есть глубокую копию, иначе результат будет держать ссылку на исходный объект и мутации потекут наружу; в остальных случаях просто перезаписываю. Обязательно пропускаю ключи \`__proto__\` и \`constructor\` — иначе это дыра prototype pollution. Это как накладывать кальку на чертёж. Сложность O(n) по ключам, стек — по глубине.

## Follow-up, которые зададут

- **Что делать с массивами?** — обсудить стратегию: замена (по умолчанию), конкатенация, слияние по индексу или по ключу элемента. Универсального ответа нет.
- **Как защититься от prototype pollution?** — фильтровать \`__proto__\`, \`constructor\`, \`prototype\`, а базу строить через \`Object.create(null)\`.
- **Почему \`deepMerge({}, sVal)\`, а не просто \`sVal\`?** — иначе результат разделит ссылку с источником и мутация результата испортит вход.
- **Чем отличается от \`Object.assign\` и спреда?** — те копируют только верхний уровень, вложенный объект заменяется целиком.
- **Что с \`null\` и \`undefined\` в источнике?** — здесь перезаписывают; многие библиотеки пропускают \`undefined\`, это вопрос требований.
- **Как обработать циклы?** — \`WeakMap\` посещённых объектов, как в \`deepClone\`.
- **Почему проверяется прототип, а не просто \`typeof\`?** — чтобы не разбирать по ключам \`Date\`, \`Map\` и экземпляры классов, которые после такого «слияния» сломаются.`,
      en: `## In short: what they're asking for

Lay one config object over another so that **nested objects complement each other instead of being wiped wholesale**. The trick: recursion over keys with one decisive question at each step — "are both values plain objects or not?"

Analogy: **overlaying a tracing-paper revision onto a blueprint**. If the tracing shows a whole new part, it replaces the old one. If it only refines one line inside a part, you descend into that part and fix the line without throwing the rest away. \`Object.assign\` is "throw the whole part away"; \`deepMerge\` is "edit line by line".

## The idea, step by step

1. First write the predicate \`isPlainObject(v)\`: not \`null\`, \`typeof === 'object'\`, **not an array**, and its prototype is exactly \`Object.prototype\` or \`null\`. That excludes \`Date\`, \`Map\` and class instances — those must be replaced, never merged.
2. \`const output = { ...target }\` — take a shallow copy up front so the input isn't mutated.
3. Loop \`for (const source of sources)\`. If a source isn't a plain object, \`continue\`.
4. Inside, \`for (const key of Object.keys(source))\`.
5. **Guard:** \`if (key === '__proto__' || key === 'constructor') continue\`.
6. Take \`sVal = source[key]\` and \`tVal = output[key]\` and pick one of three:
   - both are plain objects → \`deepMerge(tVal, sVal)\` — merge deeper;
   - only \`sVal\` is a plain object → \`deepMerge({}, sVal)\` — a **deep copy** of the source;
   - otherwise → just \`sVal\`, an overwrite.
7. Return \`output\`.

## Walking through the code

The \`deepMerge({}, sVal)\` branch is the one people forget most. Without it a nested source object lands in the result **by reference**: someone later mutates the result and silently corrupts the original source. Merging into an empty object gives a genuine deep copy.

The prototype check in \`isPlainObject\` (\`Object.getPrototypeOf(v) === Object.prototype\`) is stricter than plain \`typeof v === 'object'\`. It's what stops us taking a \`new Date()\` or a class instance apart key by key — such a "merged" object would lose its prototype and stop working.

\`Array.isArray(v)\` in the predicate is the chosen **array strategy: replace wholesale**. Other strategies (concat, index-merge) exist, so clarify the strategy with the interviewer before writing code.

Skipping \`__proto__\` and \`constructor\` guards against **prototype pollution**. If an attacker sends JSON like \`{"__proto__": {"isAdmin": true}}\`, a naive merge writes that property onto \`Object.prototype\` and it appears on **every** object in the app. That's a real CVE class, and mentioning it noticeably raises your score.

\`{ ...target }\` copies only the top level; depth comes from the recursion, each level of which makes its own copy.

## Complexity and edge cases

- **Time:** O(n) over the total key count across all sources. **Memory:** O(n) for the result, stack O(nesting depth).
- \`null\` in a source: \`typeof null === 'object'\`, but \`isPlainObject\` rejects it, so \`null\` **overwrites** — usually what you want.
- \`undefined\` in a source also overwrites the target value. Many implementations deliberately skip it — clarify.
- Arrays are **replaced wholesale** here. \`[1,2,3]\` + \`[9]\` gives \`[9]\`, not \`[9,2,3]\`.
- \`Date\`, \`Map\` and class instances are overwritten by reference; we never descend into them.
- \`__proto__\`/\`constructor\` keys are filtered out.
- An empty source list simply returns a copy of the target.
- Circular references in a source will loop the recursion; add a \`WeakMap\` like in \`deepClone\` if needed.
- \`Object.keys\` misses symbol keys — use \`Reflect.ownKeys\` for completeness.

## How to think out loud

> First I'd settle the array strategy — replace wholesale or concatenate; my default is replace. I write an \`isPlainObject\` predicate: not \`null\`, an object, not an array, and with a prototype of exactly \`Object.prototype\` or \`null\` — so I never take a \`Date\` or a class instance apart. I do \`output = { ...target }\` so the input isn't mutated. Then per source and per key there are three cases: both values plain objects — recurse and merge; only the source is an object — do \`deepMerge({}, sVal)\`, i.e. a deep copy, otherwise the result would share a reference with the source and mutations would leak out; anything else — overwrite. I always skip \`__proto__\` and \`constructor\`, otherwise this is a prototype pollution hole. It's tracing paper over a blueprint. O(n) in keys, stack proportional to depth.

## Follow-ups they'll ask

- **What do you do with arrays?** — discuss the strategy: replace (the default), concat, index-merge, or merge by element key. There's no universal answer.
- **How do you guard against prototype pollution?** — filter \`__proto__\`, \`constructor\`, \`prototype\`, and build the base with \`Object.create(null)\`.
- **Why \`deepMerge({}, sVal)\` rather than just \`sVal\`?** — otherwise the result shares a reference with the source and mutating the result corrupts the input.
- **How is this different from \`Object.assign\` and spread?** — those copy only the top level; a nested object is replaced wholesale.
- **What about \`null\` and \`undefined\` in a source?** — here they overwrite; many libraries skip \`undefined\`, so it's a requirements question.
- **How do you handle cycles?** — a \`WeakMap\` of visited objects, as in \`deepClone\`.
- **Why check the prototype rather than just \`typeof\`?** — so you never take \`Date\`, \`Map\` or class instances apart key by key, which would break them.`
    },
    codeSnippet: `const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

function deepMerge(target, ...sources) {
  const output = { ...target };
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor') continue;
      const sVal = source[key];
      const tVal = output[key];
      output[key] =
        isPlainObject(tVal) && isPlainObject(sVal)
          ? deepMerge(tVal, sVal)
          : isPlainObject(sVal)
          ? deepMerge({}, sVal)
          : sVal;
    }
  }
  return output;
}`
  },
  {
    id: 'lc-018',
    category: 'live-coding',
    level: 'Medium',
    tags: ['get', 'path', 'objects'],
    question: {
      ru: 'Реализуйте get(obj, path, defaultValue) в стиле lodash. path — строка "a.b[0].c" или массив ["a","b",0,"c"]. Возвращает значение по пути или defaultValue, если путь не существует.',
      en: 'Implement lodash-style get(obj, path, defaultValue). path is a string "a.b[0].c" or an array ["a","b",0,"c"]. Returns the value at the path or defaultValue if it does not exist.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Достать значение из глубины объекта по **строковому пути**, не свалившись с \`TypeError\`, если по дороге встретился \`undefined\`. Задача из двух половин: сначала **привести путь к массиву ключей**, потом **аккуратно пройти по нему циклом**.

Аналогия: **идёте по адресу «дом 5, подъезд 2, этаж 3, квартира 12»**. На каждом шаге проверяете, существует ли следующий уровень. Нет подъезда — не идёте искать этаж, а спокойно говорите «не нашли» и отдаёте значение по умолчанию.

## Идея решения по шагам

1. **Нормализация пути.** Если \`path\` уже массив — берём как есть. Если строка — превращаем скобки в точки: \`path.replace(/\\[(\\w+)\\]/g, '.$1')\`, потом \`.split('.')\` и \`.filter(Boolean)\`, чтобы выбросить пустые куски.
2. Заводим \`let result = obj\` — «текущее место, где мы стоим».
3. Цикл \`for (const key of keys)\`.
4. **Перед каждым шагом** проверяем \`if (result == null) return defaultValue\`. Именно нестрогое \`==\`: оно ловит и \`null\`, и \`undefined\` одной проверкой.
5. Спускаемся: \`result = result[key]\`.
6. После цикла — \`return result === undefined ? defaultValue : result\`.

## Разбор кода

Регулярка \`/\\[(\\w+)\\]/g\` превращает \`a.b[0].c\` в \`a.b.0.c\`. Дальше индекс массива это просто строковый ключ — и это работает, потому что в JS \`arr['0']\` эквивалентно \`arr[0]\`. Никакого \`parseInt\` не нужно.

\`.filter(Boolean)\` нужен для случаев вроде \`'[0].a'\` — после замены получится \`'.0.a'\`, и \`split('.')\` даст пустую первую строку. Фильтр её выбрасывает.

Проверка \`result == null\` стоит **в начале** тела цикла, а не в конце. Так мы не обращаемся к свойству у \`null\` — а это и есть тот самый \`TypeError\`, ради которого задачу дают.

Финальная проверка \`result === undefined\` — отдельная и не сливается с циклом: она обрабатывает случай, когда путь пройден целиком, но последнего ключа не оказалось. Именно так ведёт себя lodash: \`undefined\` в результате всегда заменяется на default.

Отсюда важное следствие: **отличить «ключа нет» от «ключ есть, но его значение \`undefined\`» эта реализация не может**. Lodash тоже не отличает, и это осознанное упрощение.

## Сложность и edge cases

- **Время:** O(d) на проход по пути плюс O(длины строки) на разбор регуляркой, где d — глубина. **Память:** O(d) под массив ключей.
- Промежуточный \`null\`/\`undefined\` → default, без исключения.
- Значение по существующему ключу равно \`undefined\` → всё равно default; различить нельзя.
- Пустой путь (\`''\`) → \`filter(Boolean)\` даст пустой массив, цикл не выполнится, вернём сам \`obj\`.
- \`obj\` равен \`null\` → первая же проверка вернёт default.
- Числовые индексы работают через строковые ключи.
- Ключи с точками внутри (\`{'a.b': 1}\`) этой регуляркой **не поддерживаются** — путь придётся передавать массивом.
- Значение \`false\`, \`0\` или \`''\` возвращается корректно, потому что сравнение строго с \`undefined\`, а не проверка на truthy.

## Как рассуждать вслух

> Разбиваю задачу на две части: нормализовать путь и пройти по нему. Если путь массив — беру как есть, если строка — регуляркой превращаю \`[0]\` в \`.0\`, делю по точкам и фильтрую пустые куски; индексы дальше работают как строковые ключи, потому что \`arr['0']\` это то же самое, что \`arr[0]\`. Дальше веду переменную \`result\`, стартующую с \`obj\`, и на каждой итерации **сначала** проверяю \`result == null\` нестрогим равенством, чтобы одной проверкой поймать и \`null\`, и \`undefined\`, и только потом спускаюсь. Это как идти по адресу: нет подъезда — не ищем этаж. В конце возвращаю default, если результат \`undefined\`. Отмечу, что отличить отсутствующий ключ от ключа со значением \`undefined\` так нельзя — lodash ведёт себя так же. Сложность O(глубины).

## Follow-up, которые зададут

- **Чем это заменяется в современном JS?** — опциональной цепочкой \`a?.b?.[0]?.c\` и \`??\` для дефолта. Но она не работает с **динамическим** строковым путём, поэтому \`get\` всё ещё нужен.
- **Как отличить «нет ключа» от «значение undefined»?** — только через \`key in obj\` или \`hasOwnProperty\` на предпоследнем шаге; lodash этого не делает.
- **Почему \`== null\`, а не \`=== null\`?** — нестрогое сравнение ловит сразу и \`null\`, и \`undefined\`, что здесь ровно то, что нужно.
- **Что если ключ содержит точку?** — строковый путь такое не выразит, передавайте путь массивом.
- **Как сделать типобезопасным в TS?** — шаблонные литеральные типы разбирают путь и выводят тип результата; для больших объектов это тяжело для компилятора.
- **Как то же самое сделать для записи?** — это задача \`set\`: идти до предпоследнего ключа, создавая недостающие контейнеры.
- **Не сломается ли на \`__proto__\` в пути?** — на чтении это безопасно, но такой ключ стоит фильтровать из соображений гигиены.`,
      en: `## In short: what they're asking for

Pull a value out of a deep object by a **string path**, without blowing up with a \`TypeError\` when something along the way is \`undefined\`. The task has two halves: first **normalise the path into an array of keys**, then **walk it carefully in a loop**.

Analogy: **following an address — "block 5, entrance 2, floor 3, flat 12"**. At each step you check the next level exists. No entrance 2? You don't go hunting for floor 3 — you calmly say "not found" and hand back the default.

## The idea, step by step

1. **Normalise the path.** If \`path\` is already an array, take it as-is. If it's a string, turn brackets into dots: \`path.replace(/\\[(\\w+)\\]/g, '.$1')\`, then \`.split('.')\` and \`.filter(Boolean)\` to drop empty chunks.
2. Declare \`let result = obj\` — "where we currently stand".
3. Loop \`for (const key of keys)\`.
4. **Before each step** check \`if (result == null) return defaultValue\`. Loose \`==\` on purpose: it catches both \`null\` and \`undefined\` in one comparison.
5. Descend: \`result = result[key]\`.
6. After the loop, \`return result === undefined ? defaultValue : result\`.

## Walking through the code

The regex \`/\\[(\\w+)\\]/g\` turns \`a.b[0].c\` into \`a.b.0.c\`. From then on an array index is just a string key — which works because in JS \`arr['0']\` is the same as \`arr[0]\`. No \`parseInt\` needed.

\`.filter(Boolean)\` handles cases like \`'[0].a'\`: after the replacement it becomes \`'.0.a'\`, and \`split('.')\` produces an empty first entry. The filter discards it.

The \`result == null\` check sits at the **start** of the loop body, not the end. That way we never touch a property on \`null\` — which is precisely the \`TypeError\` the task exists to avoid.

The final \`result === undefined\` check is separate rather than folded into the loop: it covers the case where the path was fully walked but the last key was missing. That's exactly lodash's behaviour — an \`undefined\` result is always replaced by the default.

An important consequence: this implementation **cannot distinguish "key missing" from "key present with value \`undefined\`"**. Lodash doesn't either — it's a deliberate simplification.

## Complexity and edge cases

- **Time:** O(d) to walk the path plus O(string length) for the regex parse, where d is depth. **Memory:** O(d) for the key array.
- An intermediate \`null\`/\`undefined\` → the default, no exception.
- A value of \`undefined\` at an existing key → still the default; you can't tell them apart.
- An empty path (\`''\`) → \`filter(Boolean)\` gives an empty array, the loop doesn't run, and \`obj\` itself is returned.
- \`obj\` being \`null\` → the very first check returns the default.
- Numeric indices work as string keys.
- Keys containing dots (\`{'a.b': 1}\`) are **not supported** by this regex — pass the path as an array instead.
- Values of \`false\`, \`0\` or \`''\` come back correctly, because the comparison is strictly against \`undefined\`, not a truthiness test.

## How to think out loud

> I split this into two parts: normalise the path, then walk it. If the path is an array I take it as-is; if it's a string I use a regex to turn \`[0]\` into \`.0\`, split on dots and filter out empties — indices then work as string keys since \`arr['0']\` is the same as \`arr[0]\`. Then I keep a \`result\` variable starting at \`obj\` and on each iteration check \`result == null\` with loose equality **first**, catching both \`null\` and \`undefined\` in one go, and only then descend. It's like following an address: no entrance, so don't hunt for the floor. At the end I return the default when the result is \`undefined\`. I'd note you can't tell a missing key from a key holding \`undefined\` this way — lodash behaves the same. Complexity is O(depth).

## Follow-ups they'll ask

- **What replaces this in modern JS?** — optional chaining \`a?.b?.[0]?.c\` plus \`??\` for the default. But it can't take a **dynamic** string path, so \`get\` still earns its keep.
- **How do you distinguish "missing" from "undefined value"?** — only via \`key in obj\` or \`hasOwnProperty\` at the second-to-last step; lodash doesn't bother.
- **Why \`== null\` rather than \`=== null\`?** — loose equality catches \`null\` and \`undefined\` at once, which is exactly what's wanted.
- **What if a key contains a dot?** — a string path can't express that; pass the path as an array.
- **How would you make it type-safe in TS?** — template literal types can parse the path and infer the result type; on large objects that gets expensive for the compiler.
- **How would you do the same for writing?** — that's \`set\`: walk to the second-to-last key, creating missing containers.
- **Does \`__proto__\` in the path break anything?** — reading is safe, but filter that key out for hygiene.`
    },
    codeSnippet: `function get(obj, path, defaultValue) {
  const keys = Array.isArray(path)
    ? path
    : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);

  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result === undefined ? defaultValue : result;
}

// get({ a: { b: [{ c: 42 }] } }, 'a.b[0].c'); // 42`
  },
  {
    id: 'lc-019',
    category: 'live-coding',
    level: 'Medium',
    tags: ['set', 'path', 'immutability'],
    question: {
      ru: 'Реализуйте set(obj, path, value) в стиле lodash: устанавливает значение по пути "a.b[0].c", создавая отсутствующие промежуточные объекты/массивы. Покажите immutable-вариант (без мутации исходного объекта).',
      en: 'Implement lodash-style set(obj, path, value): sets a value at path "a.b[0].c", creating missing intermediate objects/arrays. Show an immutable variant (no mutation of the original).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Записать значение вглубь по строковому пути, **создавая недостающие уровни по дороге**, и при этом **не испортить исходный объект**. Приём называется **path copying**: копируем только те узлы, что лежат на пути, а всё остальное переиспользуем по ссылке.

Аналогия: **правите одну строку в бумажном отчёте, который нельзя черкать**. Вы перепечатываете только ту страницу, где правка, и обложку-скоросшиватель. Остальные страницы просто перекладываете в новую папку как есть. Именно так работают Redux и Immer — это и называется structural sharing.

## Идея решения по шагам

1. Выносим общий хелпер \`toKeys(path)\` — та же нормализация, что в \`get\`: \`[0]\` → \`.0\`, \`split('.')\`, \`filter(Boolean)\`.
2. Копируем **корень**: \`const root = Array.isArray(obj) ? [...obj] : { ...obj }\`. Тип контейнера сохраняем.
3. Заводим курсор \`let node = root\` — он всегда указывает на **уже скопированный** уровень.
4. Цикл до **предпоследнего** ключа: \`for (let i = 0; i < keys.length - 1; i++)\`. Последний ключ обрабатывается отдельно, потому что там присваивание, а не спуск.
5. Пропускаем опасный ключ: \`if (key === '__proto__') continue\`.
6. Смотрим \`next = node[key]\` и решаем, чем заменить этот уровень:
   - это массив → \`[...next]\`;
   - это непустое значение → \`{ ...next }\`;
   - ничего нет → создаём с нуля, и вот тут смотрим на **следующий** ключ: если он состоит из цифр (\`/^\\d+$/\`), нужен массив \`[]\`, иначе объект \`{}\`.
7. Двигаем курсор: \`node = node[key]\`.
8. После цикла — присваиваем: \`node[keys[keys.length - 1]] = value\`.
9. Возвращаем \`root\`.

## Разбор кода

Ключевая мысль: **курсор всегда стоит на копии**. Мы никогда не пишем в исходный объект — на каждом шаге сначала подменяем \`node[key]\` свежей копией, и только потом на неё переходим. Поэтому исходный \`obj\` остаётся нетронутым, а всё, что не лежало на пути, физически осталось тем же объектом в памяти.

Строка \`const isArr = /^\\d+$/.test(String(keys[i + 1]))\` — самая неочевидная. Мы заглядываем **на шаг вперёд**, чтобы понять, какой контейнер создавать. Путь \`a.0.b\` должен породить массив, а \`a.b.c\` — объект. \`String(...)\` нужен, потому что путь могли передать массивом с настоящими числами.

Тернарник в присваивании \`node[key]\` читается как лестница из трёх случаев: «уже массив → копируем массивом», «уже что-то есть → копируем объектом», «пусто → создаём нужный тип».

\`if (key === '__proto__') continue\` — защита от prototype pollution. Без неё путь \`__proto__.isAdmin\` дописал бы свойство в прототип всех объектов.

Мутирующий вариант устроен так же, но без копий: просто идём и создаём недостающие контейнеры прямо в \`obj\`.

## Сложность и edge cases

- **Время:** O(d) шагов, но каждый шаг делает поверхностную копию уровня, поэтому честнее O(d × среднее число ключей на уровне). **Память:** O(d) новых объектов — остальное дерево переиспользуется.
- Числовой следующий ключ → создаём массив, строковый → объект.
- На пути стоит **примитив** (\`{a: 5}\` и путь \`a.b\`): \`next != null\`, спред примитива даст \`{}\` — значение будет затёрто контейнером. Стоит проговорить, что lodash делает так же.
- \`__proto__\` в пути — отфильтрован.
- Путь из одного ключа — цикл не выполнится, сразу присваиваем в копию корня.
- Пустой путь — \`keys[keys.length - 1]\` даст \`undefined\`, получится ключ \`"undefined"\`; лучше проверить и вернуть \`obj\`.
- Создание массива с большим индексом (\`a[1000]\`) породит разреженный массив с дырками.
- Циклические ссылки в исходном объекте копирование по пути не сломает, потому что мы копируем только уровни на пути.

## Как рассуждать вслух

> Нормализую путь тем же хелпером, что и в \`get\`. Дальше — path copying: копирую корень с сохранением типа, завожу курсор \`node\`, который всегда стоит на уже скопированном уровне. Иду до предпоследнего ключа: на каждом шаге сначала подменяю \`node[key]\` свежей копией — спред массива или объекта, а если там пусто, создаю контейнер, заглянув на следующий ключ: цифры значит массив, иначе объект. Потом перевожу курсор на эту копию. Последний ключ обрабатываю после цикла обычным присваиванием. Так исходный объект не мутируется, а всё, что не на пути, переиспользуется по ссылке — это structural sharing, как в Redux и Immer. Аналогия: перепечатываем только исправленную страницу, остальные перекладываем как есть. Копий O(глубины). Обязательно фильтрую \`__proto__\`, иначе это prototype pollution.

## Follow-up, которые зададут

- **Как сделать immutable эффективно?** — structural sharing: копировать только узлы вдоль пути, остальное переиспользовать по ссылке. Именно это здесь и сделано.
- **Как Immer добивается того же с виду мутирующим кодом?** — через \`Proxy\`: он записывает, какие узлы вы тронули, и на выходе строит ту же path-копию.
- **Почему смотрим на следующий ключ, а не на текущий?** — потому что тип создаваемого контейнера определяется тем, чем в него будут индексировать.
- **Что если на пути примитив?** — здесь он затирается контейнером; альтернатива — бросать ошибку. Уточняйте требования.
- **Как защититься от prototype pollution?** — фильтровать \`__proto__\`, \`constructor\`, \`prototype\` в ключах.
- **Чем это отличается от мутирующего \`set\`?** — мутирующий не делает копий, работает за O(d) без аллокаций, но ломает сравнение по ссылке в React/Redux.
- **Почему React не увидит изменение при мутации?** — потому что сравнение идёт по ссылке: корень остался тем же объектом, значит «ничего не изменилось».`,
      en: `## In short: what they're asking for

Write a value deep into an object by a string path, **creating missing levels on the way**, without **corrupting the original object**. The technique is called **path copying**: copy only the nodes that lie on the path and reuse everything else by reference.

Analogy: **editing one line of a paper report you're not allowed to scribble on**. You retype only the page with the edit, plus the binder cover. The other pages just move into the new folder as they are. That's exactly how Redux and Immer work — it's called structural sharing.

## The idea, step by step

1. Extract a shared \`toKeys(path)\` helper — the same normalisation as in \`get\`: \`[0]\` → \`.0\`, \`split('.')\`, \`filter(Boolean)\`.
2. Copy the **root**: \`const root = Array.isArray(obj) ? [...obj] : { ...obj }\`, preserving the container type.
3. Keep a cursor \`let node = root\` — it always points at an **already copied** level.
4. Loop to the **second-to-last** key: \`for (let i = 0; i < keys.length - 1; i++)\`. The last key is handled separately because it's an assignment, not a descent.
5. Skip the dangerous key: \`if (key === '__proto__') continue\`.
6. Look at \`next = node[key]\` and decide what to replace this level with:
   - it's an array → \`[...next]\`;
   - it's some non-nullish value → \`{ ...next }\`;
   - nothing there → build it from scratch, and here you look at the **next** key: if it's all digits (\`/^\\d+$/\`) you need an array \`[]\`, otherwise an object \`{}\`.
7. Move the cursor: \`node = node[key]\`.
8. After the loop, assign: \`node[keys[keys.length - 1]] = value\`.
9. Return \`root\`.

## Walking through the code

The key idea: **the cursor always stands on a copy**. We never write into the original — at each step we first replace \`node[key]\` with a fresh copy and only then move onto it. So the original \`obj\` stays untouched, and everything off the path is physically the same object in memory.

The line \`const isArr = /^\\d+$/.test(String(keys[i + 1]))\` is the least obvious. We peek **one step ahead** to decide which container to create. The path \`a.0.b\` should produce an array while \`a.b.c\` should produce an object. \`String(...)\` is there because the path may have been passed as an array of real numbers.

The ternary assigning \`node[key]\` reads as a three-rung ladder: "already an array → copy as array", "already something → copy as object", "empty → create the right type".

\`if (key === '__proto__') continue\` guards against prototype pollution. Without it the path \`__proto__.isAdmin\` would add a property to every object's prototype.

The mutating variant is structured the same way but without copies: walk along creating missing containers directly in \`obj\`.

## Complexity and edge cases

- **Time:** O(d) steps, but each step shallow-copies a level, so honestly it's O(d × average keys per level). **Memory:** O(d) new objects — the rest of the tree is reused.
- A numeric next key → create an array; a string one → an object.
- A **primitive** on the path (\`{a: 5}\` with path \`a.b\`): \`next != null\`, so spreading a primitive yields \`{}\` and the value is replaced by a container. Worth saying lodash behaves the same way.
- \`__proto__\` in the path is filtered out.
- A single-key path — the loop doesn't run and we assign straight into the root copy.
- An empty path makes \`keys[keys.length - 1]\` \`undefined\`, producing a literal \`"undefined"\` key; better to check and return \`obj\`.
- Creating an array with a large index (\`a[1000]\`) produces a sparse array full of holes.
- Circular references in the source don't break path copying, since we only copy levels along the path.

## How to think out loud

> I normalise the path with the same helper as in \`get\`. Then it's path copying: I copy the root preserving its type and keep a \`node\` cursor that always sits on an already-copied level. I loop to the second-to-last key: at each step I first replace \`node[key]\` with a fresh copy — spreading an array or object, or, when it's empty, creating a container by peeking at the next key: digits means array, otherwise object. Then I move the cursor onto that copy. The final key is a plain assignment after the loop. That way the original isn't mutated and everything off the path is reused by reference — structural sharing, exactly as in Redux and Immer. The analogy: retype only the corrected page and move the rest across. O(depth) copies. And I always filter \`__proto__\`, otherwise it's prototype pollution.

## Follow-ups they'll ask

- **How do you make immutability efficient?** — structural sharing: copy only nodes along the path and reuse the rest by reference. That's exactly what's done here.
- **How does Immer get the same result from apparently mutating code?** — with a \`Proxy\`: it records which nodes you touched and produces the same path copy on exit.
- **Why look at the next key rather than the current one?** — because the container type is determined by what will index into it.
- **What if there's a primitive on the path?** — here it's replaced by a container; the alternative is to throw. Clarify the requirements.
- **How do you guard against prototype pollution?** — filter \`__proto__\`, \`constructor\` and \`prototype\` out of the keys.
- **How does this differ from a mutating \`set\`?** — the mutating one makes no copies and runs in O(d) with no allocation, but it breaks reference comparison in React/Redux.
- **Why won't React notice a mutation?** — because comparison is by reference: the root is the same object, so "nothing changed".`
    },
    codeSnippet: `function toKeys(path) {
  return Array.isArray(path)
    ? path
    : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
}

function setImmutable(obj, path, value) {
  const keys = toKeys(path);
  const root = Array.isArray(obj) ? [...obj] : { ...obj };
  let node = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key === '__proto__') continue;
    const next = node[key];
    const isArr = /^\\d+$/.test(String(keys[i + 1]));
    node[key] = Array.isArray(next) ? [...next] : next != null ? { ...next } : (isArr ? [] : {});
    node = node[key];
  }
  node[keys[keys.length - 1]] = value;
  return root;
}`
  },
  {
    id: 'lc-020',
    category: 'live-coding',
    level: 'Hard',
    tags: ['event-emitter', 'pub-sub', 'observer'],
    question: {
      ru: 'Реализуйте класс EventEmitter с методами on(event, listener), off(event, listener), once(event, listener) и emit(event, ...args). on возвращает функцию отписки. Это основа паттерна pub/sub.',
      en: 'Implement an EventEmitter class with on(event, listener), off(event, listener), once(event, listener) and emit(event, ...args). on returns an unsubscribe function. This is the core of the pub/sub pattern.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Написать «радиостанцию»: кто хочет — подписывается на канал, кто-то вещает в канал, и все подписчики получают сообщение. Структура данных прямо диктуется задачей: **\`Map\` из имени события в \`Set\` его слушателей**.

Аналогия: **редакционная рассылка**. \`Map\` — картотека тем, у каждой темы свой список подписчиков (\`Set\`). \`emit\` — разослать письмо всем из списка. \`once\` — подписка на один выпуск: письмо пришло, и подписчик сам вычеркнул себя из списка.

## Идея решения по шагам

1. Приватное поле \`#events = new Map()\`. Ключ — имя события, значение — \`Set\` функций.
2. **\`on(event, listener)\`:** если такого события ещё нет — \`this.#events.set(event, new Set())\`. Добавляем слушателя в \`Set\`. **Возвращаем функцию отписки** \`() => this.off(event, listener)\` — это то, что забывают чаще всего.
3. **\`off(event, listener)\`:** \`this.#events.get(event)?.delete(listener)\`. Опциональная цепочка спасает от отписки на несуществующем событии.
4. **\`once(event, listener)\`:** создаём обёртку \`wrapper\`, которая **сначала** отписывает саму себя (\`this.off(event, wrapper)\`), а **потом** зовёт оригинальный \`listener\`. Подписываем обёртку через \`this.on\` и возвращаем её результат — то есть ту же функцию отписки.
5. **\`emit(event, ...args)\`:** достаём \`Set\`; если его нет — \`return false\`. Иначе делаем **копию** \`[...listeners]\` и вызываем каждый с аргументами. Возвращаем \`true\`.

## Разбор кода

Строка \`[...listeners].forEach(...)\` — самая важная в \`emit\`. Копия нужна, потому что слушатель во время вызова может подписаться или отписаться, а модификация \`Set\` прямо во время его обхода приводит к пропущенным или лишним вызовам. Особенно это критично для \`once\`, который **всегда** удаляет себя изнутри обхода.

В \`once\` порядок строк тоже не случаен: \`this.off\` идёт **до** вызова \`listener\`. Если бы слушатель бросил исключение, он всё равно остался бы отписанным — иначе «одноразовый» слушатель залип бы навсегда.

\`wrapper\` — стрелочная функция, чтобы \`this\` внутри указывал на эмиттер. Обратите внимание: в \`#events\` лежит именно \`wrapper\`, а не оригинальный \`listener\`. Поэтому вызов \`off(event, listener)\` с **оригинальной** функцией такую подписку не снимет. Практичное решение — хранить \`wrapper.original = listener\` и искать по нему в \`off\`; в этой реализации вместо этого возвращается готовая функция отписки.

Почему \`Set\`, а не массив? Удаление за O(1) вместо \`indexOf\` + \`splice\` за O(k), плюс бесплатная дедупликация: подписаться одной и той же функцией дважды не получится.

\`emit\` возвращает \`boolean\` — «были ли слушатели». Так же ведёт себя Node-овский \`EventEmitter\`.

## Сложность и edge cases

- **Время:** \`on\` и \`off\` — O(1) благодаря \`Set\`. \`emit\` — O(k) по числу подписчиков плюс O(k) на копию массива. **Память:** O(общего числа подписок).
- **Отписка во время \`emit\`** — решается копией; без неё \`once\` в паре с другими слушателями даёт пропуски.
- **Подписка во время \`emit\`** — новый слушатель в этом же выпуске не сработает, и это правильное поведение.
- **Ошибка в одном слушателе** обрывает всю рассылку. Если это недопустимо, каждый вызов оборачивают в \`try/catch\` и складывают ошибки. Зависит от требований — проговорите вслух.
- Двойная отписка безвредна: \`Set.delete\` просто вернёт \`false\`.
- \`emit\` на событии без подписчиков → \`false\`, ничего не падает.
- Один и тот же \`listener\` на два разных события — независимые записи, всё корректно.
- **Утечки памяти:** эмиттер держит сильные ссылки на слушатели, а те замыкают компоненты. Не отписались — компонент живёт вечно.

## Как рассуждать вслух

> Структура напрашивается сама: \`Map\` из имени события в \`Set\` слушателей. \`Set\` беру ради удаления за O(1) и бесплатной дедупликации. \`on\` создаёт \`Set\` при первой подписке, добавляет слушателя и **возвращает функцию отписки** — это удобно в компонентах и часто забывают. \`off\` через опциональную цепочку, чтобы не падать на несуществующем событии. \`once\` оборачиваю: обёртка сначала отписывает себя, потом зовёт оригинал — именно в таком порядке, чтобы исключение не оставило её подписанной. В \`emit\` обязательно копирую \`Set\` перед обходом: слушатель может отписаться прямо во время вызова, а \`once\` так делает всегда. Это как редакционная рассылка по картотеке тем. \`on\`/\`off\` за O(1), \`emit\` за O(k). Отдельно скажу про утечки: без отписки эмиттер держит компонент живым.

## Follow-up, которые зададут

- **Зачем \`Set\` вместо массива?** — удаление за O(1) вместо \`indexOf\` + \`splice\`, плюс дедупликация подписок.
- **Зачем копировать \`Set\` в \`emit\`?** — слушатель может подписаться или отписаться во время обхода; без копии будут пропуски и повторы.
- **Как \`off\` снимет подписку, сделанную через \`once\`?** — надо хранить \`wrapper.original = listener\` и сравнивать по нему; здесь вместо этого возвращается готовая функция отписки.
- **Как избежать утечек памяти?** — всегда отписываться; возвращаемый \`unsubscribe\` кладут в cleanup эффекта или \`ngOnDestroy\`.
- **Что если слушатель бросит исключение?** — сейчас рассылка оборвётся; оберните каждый вызов в \`try/catch\` и соберите ошибки, если нужна изоляция.
- **Как сделать асинхронный \`emit\`?** — собрать промисы всех слушателей и вернуть \`Promise.all\`, либо разослать через микротаск, чтобы не блокировать вызывающего.
- **Чем это отличается от RxJS \`Subject\`?** — \`Subject\` даёт композицию через операторы, отписку через \`Subscription\` и понятие завершения потока; \`EventEmitter\` — голый pub/sub.
- **Как добавить wildcard-подписку на все события?** — отдельный \`Set\` для \`'*'\`, который вызывается в \`emit\` всегда.`,
      en: `## In short: what they're asking for

Build a "radio station": whoever wants to subscribes to a channel, someone broadcasts on it, and every subscriber receives the message. The data structure follows straight from the problem: a **\`Map\` from event name to a \`Set\` of its listeners**.

Analogy: **a newsroom mailing list**. The \`Map\` is the topic index; each topic has its own subscriber list (\`Set\`). \`emit\` mails everyone on the list. \`once\` is a single-issue subscription: the letter arrives and the subscriber crosses themselves off.

## The idea, step by step

1. A private field \`#events = new Map()\`. Key: event name; value: a \`Set\` of functions.
2. **\`on(event, listener)\`:** if the event doesn't exist yet, \`this.#events.set(event, new Set())\`. Add the listener to the \`Set\`. **Return an unsubscribe function** \`() => this.off(event, listener)\` — the bit people forget most.
3. **\`off(event, listener)\`:** \`this.#events.get(event)?.delete(listener)\`. Optional chaining saves you from unsubscribing on a non-existent event.
4. **\`once(event, listener)\`:** create a \`wrapper\` that **first** unsubscribes itself (\`this.off(event, wrapper)\`) and **then** calls the original \`listener\`. Subscribe the wrapper via \`this.on\` and return its result — the same unsubscribe function.
5. **\`emit(event, ...args)\`:** fetch the \`Set\`; if absent, \`return false\`. Otherwise take a **copy**, \`[...listeners]\`, and call each with the arguments. Return \`true\`.

## Walking through the code

The line \`[...listeners].forEach(...)\` is the most important one in \`emit\`. The copy is needed because a listener may subscribe or unsubscribe while being called, and mutating a \`Set\` mid-iteration causes skipped or duplicated calls. It's especially critical for \`once\`, which **always** removes itself from inside the iteration.

The order inside \`once\` is deliberate too: \`this.off\` comes **before** calling \`listener\`. If the listener threw, it would still be unsubscribed — otherwise a "one-shot" listener would get stuck forever.

\`wrapper\` is an arrow function so \`this\` inside points at the emitter. Note that \`#events\` stores the \`wrapper\`, not the original \`listener\`. So calling \`off(event, listener)\` with the **original** function won't remove that subscription. The practical fix is storing \`wrapper.original = listener\` and matching on it in \`off\`; this implementation returns a ready-made unsubscribe function instead.

Why a \`Set\` and not an array? O(1) removal instead of \`indexOf\` + \`splice\` at O(k), plus free deduplication: you can't subscribe the same function twice.

\`emit\` returns a boolean — "were there any listeners?" — matching Node's \`EventEmitter\`.

## Complexity and edge cases

- **Time:** \`on\` and \`off\` are O(1) thanks to the \`Set\`. \`emit\` is O(k) over subscribers plus O(k) for the copy. **Memory:** O(total subscriptions).
- **Unsubscribing during \`emit\`** — solved by the copy; without it \`once\` alongside other listeners causes skips.
- **Subscribing during \`emit\`** — the new listener doesn't fire for this issue, which is the correct behaviour.
- **An error in one listener** aborts the whole broadcast. If that's unacceptable, wrap each call in \`try/catch\` and collect the errors. It depends on requirements — say so out loud.
- Double unsubscribe is harmless: \`Set.delete\` just returns \`false\`.
- \`emit\` on an event with no subscribers → \`false\`, nothing breaks.
- The same \`listener\` on two different events gives independent entries and works fine.
- **Memory leaks:** the emitter holds strong references to listeners, which close over components. Skip the unsubscribe and the component lives forever.

## How to think out loud

> The structure picks itself: a \`Map\` from event name to a \`Set\` of listeners. I choose \`Set\` for O(1) removal and free deduplication. \`on\` creates the \`Set\` on first subscription, adds the listener and **returns an unsubscribe function** — handy in components and often forgotten. \`off\` uses optional chaining so it doesn't blow up on an unknown event. For \`once\` I wrap: the wrapper unsubscribes itself first, then calls the original — in that order, so an exception can't leave it subscribed. In \`emit\` I always copy the \`Set\` before iterating, because a listener may unsubscribe mid-dispatch and \`once\` always does. It's a newsroom mailing list over a topic index. \`on\`/\`off\` are O(1), \`emit\` is O(k). I'd also flag leaks: without unsubscribing, the emitter keeps the component alive.

## Follow-ups they'll ask

- **Why a \`Set\` rather than an array?** — O(1) removal instead of \`indexOf\` + \`splice\`, plus deduplicated subscriptions.
- **Why copy the \`Set\` in \`emit\`?** — a listener may subscribe or unsubscribe during iteration; without the copy you get skips and repeats.
- **How does \`off\` remove a \`once\` subscription?** — store \`wrapper.original = listener\` and match on it; here the returned unsubscribe function serves instead.
- **How do you avoid memory leaks?** — always unsubscribe; the returned \`unsubscribe\` goes into an effect cleanup or \`ngOnDestroy\`.
- **What if a listener throws?** — right now the broadcast aborts; wrap each call in \`try/catch\` and collect errors if you need isolation.
- **How would you make \`emit\` async?** — collect the listeners' promises and return \`Promise.all\`, or dispatch on a microtask so the caller isn't blocked.
- **How is this different from an RxJS \`Subject\`?** — a \`Subject\` gives operator composition, \`Subscription\`-based teardown and a notion of stream completion; \`EventEmitter\` is bare pub/sub.
- **How would you add a wildcard subscription?** — a separate \`Set\` for \`'*'\` that \`emit\` always invokes.`
    },
    codeSnippet: `class EventEmitter {
  #events = new Map();

  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.#events.get(event)?.delete(listener);
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const listeners = this.#events.get(event);
    if (!listeners) return false;
    [...listeners].forEach((fn) => fn(...args));
    return true;
  }
}`
  },
  {
    id: 'lc-021',
    category: 'live-coding',
    level: 'Hard',
    tags: ['this-binding', 'polyfill', 'prototypes'],
    question: {
      ru: 'Реализуйте полифилы Function.prototype.myCall, myApply и myBind. Они должны корректно устанавливать this, передавать аргументы и (для bind) поддерживать частичное применение и работу с new.',
      en: 'Implement polyfills for Function.prototype.myCall, myApply and myBind. They must set this correctly, pass arguments, and (for bind) support partial application and the new operator.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Задача проверяет, понимаете ли вы **единственное правило про \`this\`**: он определяется тем, **как вызвали** функцию. Вызвали как метод объекта — \`this\` это объект. Отсюда весь трюк: чтобы подсунуть нужный \`this\`, надо на мгновение сделать функцию методом этого объекта.

Аналогия: **чтобы человек говорил от лица компании, его надо на минуту оформить в штат**. Оформили, дали сказать речь, уволили. Никаких следов не осталось — ровно это и делает \`myCall\`.

## Идея решения по шагам

**myCall(thisArg, ...args):**
1. Нормализуем контекст: \`thisArg = thisArg ?? globalThis\` — \`null\`/\`undefined\` в нестрогом режиме означают глобальный объект.
2. \`const ctx = Object(thisArg)\` — **боксинг**: примитив вроде \`5\` или \`'abc'\` превращаем в объект-обёртку, иначе на него нельзя повесить свойство.
3. Создаём уникальный ключ: \`const key = Symbol('fn')\`. Символ гарантирует, что мы не затрём существующее свойство объекта.
4. \`ctx[key] = this\` — здесь \`this\` это **сама функция**, на которой вызвали \`myCall\`.
5. Вызываем как метод: \`const result = ctx[key](...args)\`. Именно точка перед скобками и делает \`this\` равным \`ctx\`.
6. Убираем следы: \`delete ctx[key]\`, возвращаем \`result\`.

**myApply(thisArg, args = []):** одна строка — \`return this.myCall(thisArg, ...args)\`. Единственная разница с \`call\` — аргументы приходят массивом.

**myBind(thisArg, ...bound):**
1. Сохраняем \`const fn = this\` — исходную функцию.
2. Объявляем \`function boundFn(...args)\` (обычную, не стрелку — нужен собственный \`this\`).
3. Внутри проверяем \`const isNew = this instanceof boundFn\` — «нас позвали через \`new\`?».
4. Вызываем \`fn.apply(isNew ? this : thisArg, [...bound, ...args])\` — при \`new\` привязанный контекст **игнорируется**, склеиваем частично применённые и новые аргументы.
5. Чиним цепочку прототипов: \`boundFn.prototype = Object.create(fn.prototype || null)\`.

## Разбор кода

\`Symbol('fn')\` вместо строкового ключа — та деталь, ради которой задачу и любят. Если написать \`ctx.__temp = this\`, вы рискуете затереть настоящее свойство объекта и потерять его после \`delete\`.

\`Object(thisArg)\` — боксинг. \`Object(5)\` даёт \`Number\`-обёртку, \`Object('a')\` — \`String\`-обёртку. Без этого шага присваивание свойства примитиву в строгом режиме бросит \`TypeError\`. Побочный эффект: внутри функции \`this\` будет объектом-обёрткой, а не примитивом — ровно так и ведёт себя нативный \`call\` в нестрогом режиме.

В \`myBind\` центральная строка — \`this instanceof boundFn\`. Когда \`boundFn\` вызывают через \`new\`, движок создаёт новый объект с прототипом \`boundFn.prototype\` и подставляет его как \`this\`. Проверка \`instanceof\` это распознаёт. По спецификации **оператор \`new\` имеет приоритет над привязанным \`this\`** — поэтому в этом случае мы передаём \`this\`, а не \`thisArg\`.

\`boundFn.prototype = Object.create(fn.prototype || null)\` нужен, чтобы \`new boundFn()\` создавал объект, который \`instanceof\` исходной функции. Без этой строки цепочка прототипов оборвётся и проверка \`instanceof\` внутри \`boundFn\` тоже перестанет работать корректно.

Аргументы склеиваются как \`[...bound, ...args]\` — сначала зафиксированные при \`bind\`, потом переданные при вызове. Это и есть частичное применение.

## Сложность и edge cases

- **Время и память:** O(1) на обёртку плюс O(числа аргументов) на их копирование. Никаких структур данных.
- \`thisArg\` равен \`null\`/\`undefined\` → \`globalThis\` (в нестрогом режиме; в строгом нативный \`call\` оставил бы \`undefined\`).
- Примитивный \`thisArg\` → боксится в объект-обёртку.
- \`new boundFn()\` обязан работать как конструктор и **игнорировать** привязанный контекст.
- Если исходная функция стрелочная, \`call\`/\`apply\`/\`bind\` на неё **не действуют** — у стрелок нет собственного \`this\`.
- Функция бросила исключение — \`delete ctx[key]\` не выполнится, свойство останется. В боевом коде это \`try/finally\`; на собеседовании стоит хотя бы упомянуть.
- Двойной \`bind\` (\`f.bind(a).bind(b)\`) — второй не переопределит контекст, потому что первый уже жёстко его зафиксировал.
- \`fn.prototype\` отсутствует (у стрелок и методов классов) — отсюда \`|| null\` в \`Object.create\`.

## Как рассуждать вслух

> Опираюсь на единственное правило: \`this\` определяется способом вызова, а при вызове через точку он равен объекту слева. Поэтому в \`myCall\` я временно делаю функцию методом переданного объекта. Сначала нормализую контекст: \`null\` и \`undefined\` заменяю на \`globalThis\`, примитив прогоняю через \`Object()\`, чтобы забоксить — иначе свойство не повесить. Ключ беру \`Symbol\`, чтобы не затереть существующее свойство. Присваиваю функцию, вызываю через точку, удаляю свойство и возвращаю результат. \`myApply\` — это \`myCall\` со спредом массива. В \`myBind\` возвращаю обычную функцию, склеиваю зафиксированные и новые аргументы, и главное — проверяю \`this instanceof boundFn\`: при вызове через \`new\` оператор имеет приоритет над привязанным контекстом, поэтому передаю свежий \`this\`. Ещё чиню прототип через \`Object.create\`, чтобы \`instanceof\` работал. Всё O(1).

## Follow-up, которые зададут

- **Почему связка \`bind\` + \`new\` особенная?** — спецификация требует, чтобы оператор \`new\` имел приоритет над привязанным \`this\`: конструктор должен получить свежесозданный объект.
- **Зачем \`Symbol\`, а не строковый ключ?** — чтобы гарантированно не затереть существующее свойство объекта и не потерять его после \`delete\`.
- **Зачем \`Object(thisArg)\`?** — боксинг примитива: на число или строку нельзя повесить свойство.
- **Чем \`call\` отличается от \`apply\`?** — только формой передачи аргументов: список против массива. Со спредом разница почти исчезла.
- **Работает ли \`bind\` на стрелочной функции?** — нет, у стрелок нет собственного \`this\`, привязка игнорируется.
- **Зачем строка с \`boundFn.prototype\`?** — чтобы \`new boundFn()\` давал объект, который \`instanceof\` исходной функции.
- **Что если функция бросит между присваиванием и \`delete\`?** — свойство останется на объекте; надёжнее обернуть в \`try/finally\`.
- **Что быстрее в реальном коде?** — нативные \`call\`/\`apply\` сильно оптимизированы движком, полифил заметно медленнее; это чисто учебное упражнение.`,
      en: `## In short: what they're asking for

This task tests whether you know **the one rule about \`this\`**: it's decided by **how the function was called**. Call it as an object's method and \`this\` is that object. Hence the whole trick: to inject a \`this\`, make the function momentarily a method of that object.

Analogy: **to have someone speak on behalf of a company, you put them on the payroll for a minute**. Hire, let them give the speech, fire. No trace left — that's exactly what \`myCall\` does.

## The idea, step by step

**myCall(thisArg, ...args):**
1. Normalise the context: \`thisArg = thisArg ?? globalThis\` — \`null\`/\`undefined\` mean the global object in sloppy mode.
2. \`const ctx = Object(thisArg)\` — **boxing**: a primitive like \`5\` or \`'abc'\` becomes a wrapper object, otherwise you can't attach a property to it.
3. Create a unique key: \`const key = Symbol('fn')\`. A symbol guarantees we don't clobber an existing property.
4. \`ctx[key] = this\` — here \`this\` is **the function itself**, the one \`myCall\` was invoked on.
5. Call it as a method: \`const result = ctx[key](...args)\`. It's the dot before the parentheses that makes \`this\` equal \`ctx\`.
6. Clean up: \`delete ctx[key]\`, then return \`result\`.

**myApply(thisArg, args = []):** one line — \`return this.myCall(thisArg, ...args)\`. The only difference from \`call\` is that arguments arrive as an array.

**myBind(thisArg, ...bound):**
1. Capture \`const fn = this\` — the original function.
2. Declare \`function boundFn(...args)\` (a plain function, not an arrow — we need its own \`this\`).
3. Inside, check \`const isNew = this instanceof boundFn\` — "were we called with \`new\`?".
4. Call \`fn.apply(isNew ? this : thisArg, [...bound, ...args])\` — under \`new\` the bound context is **ignored**, and we concatenate the pre-applied and new arguments.
5. Repair the prototype chain: \`boundFn.prototype = Object.create(fn.prototype || null)\`.

## Walking through the code

\`Symbol('fn')\` instead of a string key is the detail this task exists for. Write \`ctx.__temp = this\` and you risk clobbering a real property and losing it after the \`delete\`.

\`Object(thisArg)\` is boxing. \`Object(5)\` gives a \`Number\` wrapper, \`Object('a')\` a \`String\` wrapper. Without this, assigning a property to a primitive throws a \`TypeError\` in strict mode. Side effect: inside the function \`this\` is a wrapper object rather than a primitive — exactly how native \`call\` behaves in sloppy mode.

In \`myBind\` the central line is \`this instanceof boundFn\`. When \`boundFn\` is invoked via \`new\`, the engine creates a fresh object whose prototype is \`boundFn.prototype\` and passes it as \`this\`. The \`instanceof\` check detects that. Per spec, **the \`new\` operator takes precedence over the bound \`this\`** — which is why we pass \`this\`, not \`thisArg\`, in that case.

\`boundFn.prototype = Object.create(fn.prototype || null)\` makes \`new boundFn()\` produce an object that is \`instanceof\` the original function. Without that line the prototype chain breaks and even the \`instanceof\` check inside \`boundFn\` stops behaving correctly.

Arguments are concatenated as \`[...bound, ...args]\` — first those fixed at \`bind\` time, then those passed at call time. That's partial application.

## Complexity and edge cases

- **Time and memory:** O(1) per wrapper plus O(argument count) for copying them. No data structures.
- \`thisArg\` of \`null\`/\`undefined\` → \`globalThis\` (sloppy mode; native \`call\` in strict mode would leave it \`undefined\`).
- A primitive \`thisArg\` gets boxed into a wrapper object.
- \`new boundFn()\` must work as a constructor and **ignore** the bound context.
- If the original is an arrow function, \`call\`/\`apply\`/\`bind\` have **no effect** — arrows have no own \`this\`.
- If the function throws, \`delete ctx[key]\` never runs and the property lingers. Production code uses \`try/finally\`; in an interview at least mention it.
- Double binding (\`f.bind(a).bind(b)\`) — the second has no effect, the first already locked the context in.
- \`fn.prototype\` may be absent (arrows, class methods) — hence the \`|| null\` in \`Object.create\`.

## How to think out loud

> I lean on the single rule: \`this\` is decided by the call form, and a dotted call makes it the object on the left. So in \`myCall\` I temporarily make the function a method of the given object. First I normalise the context: \`null\` and \`undefined\` become \`globalThis\`, and I run primitives through \`Object()\` to box them — you can't attach a property otherwise. I use a \`Symbol\` key so I can't clobber an existing property. Then assign the function, call it through the dot, delete the property and return the result. \`myApply\` is \`myCall\` with the array spread. In \`myBind\` I return a plain function, concatenate the fixed and new arguments, and crucially check \`this instanceof boundFn\`: under \`new\` the operator takes precedence over the bound context, so I pass the fresh \`this\`. I also repair the prototype via \`Object.create\` so \`instanceof\` works. Everything is O(1).

## Follow-ups they'll ask

- **Why is \`bind\` + \`new\` special?** — the spec requires \`new\` to take precedence over the bound \`this\`: the constructor must receive the freshly created object.
- **Why a \`Symbol\` and not a string key?** — so you provably don't clobber an existing property and lose it after the \`delete\`.
- **Why \`Object(thisArg)\`?** — boxing a primitive: you can't attach a property to a number or a string.
- **How does \`call\` differ from \`apply\`?** — only in argument form: a list versus an array. With spread the difference has all but vanished.
- **Does \`bind\` work on an arrow function?** — no, arrows have no own \`this\` and the binding is ignored.
- **Why the \`boundFn.prototype\` line?** — so \`new boundFn()\` yields an object that is \`instanceof\` the original function.
- **What if the function throws between the assignment and the \`delete\`?** — the property stays on the object; wrapping in \`try/finally\` is safer.
- **What's faster in real code?** — native \`call\`/\`apply\` are heavily optimised by the engine; the polyfill is noticeably slower. This is purely an exercise.`
    },
    codeSnippet: `Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg ?? globalThis;
  const key = Symbol('fn');
  const ctx = Object(thisArg);
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};

Function.prototype.myApply = function (thisArg, args = []) {
  return this.myCall(thisArg, ...args);
};

Function.prototype.myBind = function (thisArg, ...bound) {
  const fn = this;
  function boundFn(...args) {
    const isNew = this instanceof boundFn;
    return fn.apply(isNew ? this : thisArg, [...bound, ...args]);
  }
  boundFn.prototype = Object.create(fn.prototype || null);
  return boundFn;
};`
  },
  {
    id: 'lc-022',
    category: 'live-coding',
    level: 'Hard',
    tags: ['new-operator', 'prototypes', 'polyfill'],
    question: {
      ru: 'Реализуйте функцию myNew(Constructor, ...args), эмулирующую оператор new: создаёт объект с правильным прототипом, вызывает конструктор с этим объектом как this и возвращает объект (или объект, возвращённый конструктором, если он вернул объект).',
      en: 'Implement myNew(Constructor, ...args) emulating the new operator: create an object with the correct prototype, call the constructor with that object as this, and return it (or the object the constructor returns, if it returns one).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Разобрать оператор \`new\` на составные части. Он не магия, а **три механические операции**: создать пустой объект с нужным прототипом, вызвать конструктор с этим объектом в роли \`this\`, и решить, что вернуть.

Аналогия: **сборка мебели по инструкции**. \`Object.create(Constructor.prototype)\` — достали пустой корпус нужной модели (он уже «знает» свою инструкцию — прототип). \`Constructor.apply(instance, args)\` — прикрутили полки и ручки. А в конце — маленькая странность стандарта: если конструктор сам вернул готовый шкаф, отдаём его, а наш корпус выбрасываем.

## Идея решения по шагам

1. Определяем прототип. Обычно это \`Constructor.prototype\`, но если он не объект (например, кто-то присвоил туда число), берём \`Object.prototype\`.
2. Создаём заготовку: \`const instance = Object.create(proto)\`. Это шаг «объект с правильной цепочкой прототипов».
3. Запускаем конструктор с нашим объектом: \`const result = Constructor.apply(instance, args)\`. Здесь конструктор навешивает поля через \`this.x = ...\`.
4. Решаем, что вернуть. Правило: если \`result\` — **объект или функция** (и не \`null\`), возвращаем \`result\`; во всех остальных случаях возвращаем \`instance\`.

## Разбор кода

Проверка возвращаемого значения выглядит длинно, и каждая её часть нужна:

\`\`\`js
result !== null && (typeof result === 'object' || typeof result === 'function')
\`\`\`

\`result !== null\` — потому что \`typeof null === 'object'\`, и без этой проверки \`return null\` из конструктора подменил бы результат. \`typeof result === 'function'\` — потому что по спецификации функция тоже объект и тоже перебивает возврат.

Отсюда прямой ответ на любимый вопрос: конструктор вернул \`42\` — **игнорируем**, отдаём \`instance\`. Вернул \`{}\` — отдаём этот объект, а собранный \`instance\` уходит в мусор.

Проверка \`typeof Constructor.prototype === 'object' && !== null\` — редкий, но показательный случай. У обычной функции \`prototype\` всегда объект, но его можно перезаписать: \`function F(){}; F.prototype = 42\`. Тогда \`new F()\` создаст объект с прототипом \`Object.prototype\`. Знание этого нюанса отличает «выучил» от «понял».

\`Object.create(proto)\` — самая честная запись шага «выставить \`[[Prototype]]\`». Альтернатива \`instance.__proto__ = proto\` работает, но считается устаревшей и медленнее.

Важно: \`apply\` вызывает конструктор **как обычную функцию** с подменённым \`this\`. Поэтому эта эмуляция не сработает для классов ES6 — они помечены как требующие \`new\` и бросят \`TypeError\`.

## Сложность и edge cases

- **Время и память:** O(1) плюс то, что делает сам конструктор.
- Конструктор вернул **примитив** (число, строка, \`undefined\`, \`null\`) — игнорируем, возвращаем \`instance\`.
- Конструктор вернул **объект или функцию** — она подменяет результат, наш \`instance\` теряется.
- \`Constructor.prototype\` не объект — прототипом станет \`Object.prototype\`.
- Стрелочная функция — у неё нет \`prototype\` и нет своего \`this\`, конструктором быть не может.
- **Класс ES6** — \`Constructor.apply(...)\` бросит \`TypeError: Class constructor cannot be invoked without 'new'\`. Настоящая эмуляция потребовала бы \`Reflect.construct\`.
- Конструктор бросил исключение — оно просто пробрасывается, объект не возвращается.

## Как рассуждать вслух

> Оператор \`new\` это три шага, и я их просто выпишу. Первый — создать объект с прототипом \`Constructor.prototype\` через \`Object.create\`; здесь же учту редкий случай, когда \`prototype\` перезаписали не объектом — тогда беру \`Object.prototype\`. Второй — вызвать конструктор через \`apply\` с этим объектом как \`this\`, чтобы присваивания \`this.x\` попали куда надо. Третий, и самый интересный — решить, что вернуть: если конструктор вернул объект или функцию, по спецификации возвращается именно она, а мой экземпляр выбрасывается; примитив игнорируется. Обязательно проверяю \`result !== null\` отдельно, потому что \`typeof null\` это \`'object'\`. Это как сборка мебели: достали корпус, прикрутили полки, но если из коробки вдруг выехал готовый шкаф — отдаём его. Всё O(1). Отмечу, что для классов ES6 такой полифил не сработает, там нужен \`Reflect.construct\`.

## Follow-up, которые зададут

- **Что вернётся, если конструктор вернёт \`42\`?** — примитив игнорируется, вернётся созданный экземпляр.
- **А если вернёт \`{}\`?** — вернётся этот объект, а созданный экземпляр будет отброшен.
- **А если вернёт \`null\`?** — \`null\` не объект в смысле спецификации, вернётся экземпляр. Поэтому проверка \`!== null\` обязательна.
- **Почему \`Object.create\`, а не \`{}\` с \`__proto__\`?** — \`Object.create\` это стандартный и быстрый способ задать прототип; \`__proto__\` устарел.
- **Сработает ли это для класса ES6?** — нет, класс нельзя вызвать без \`new\`; нужен \`Reflect.construct(Constructor, args)\`.
- **Где здесь \`new.target\`?** — внутри настоящего \`new\` он равен конструктору; в этой эмуляции он будет \`undefined\`, что заметно для кода, который его проверяет.
- **Как связано с \`instanceof\`?** — \`instanceof\` идёт по цепочке прототипов, а мы её выставили первым шагом, поэтому \`myNew(F) instanceof F\` истинно.`,
      en: `## In short: what they're asking for

Take the \`new\` operator apart. It isn't magic — it's **three mechanical operations**: create an empty object with the right prototype, call the constructor with that object as \`this\`, and decide what to return.

Analogy: **assembling flat-pack furniture**. \`Object.create(Constructor.prototype)\` is fetching the empty carcass of the right model (it already "knows" its instructions — the prototype). \`Constructor.apply(instance, args)\` screws on the shelves and handles. And then a small quirk of the spec: if the constructor itself hands back a finished wardrobe, you deliver that and bin your carcass.

## The idea, step by step

1. Determine the prototype. Normally it's \`Constructor.prototype\`, but if that isn't an object (say somebody assigned a number to it), fall back to \`Object.prototype\`.
2. Create the blank: \`const instance = Object.create(proto)\`. That's the "object with the right prototype chain" step.
3. Run the constructor against it: \`const result = Constructor.apply(instance, args)\`. This is where the constructor attaches fields via \`this.x = ...\`.
4. Decide what to return. The rule: if \`result\` is an **object or a function** (and not \`null\`), return \`result\`; in every other case return \`instance\`.

## Walking through the code

The return-value check looks long, and every part of it earns its place:

\`\`\`js
result !== null && (typeof result === 'object' || typeof result === 'function')
\`\`\`

\`result !== null\` because \`typeof null === 'object'\`, and without it a \`return null\` from the constructor would override the result. \`typeof result === 'function'\` because per spec a function is an object too and also overrides the return.

That directly answers the favourite question: the constructor returns \`42\` — **ignored**, we hand back \`instance\`. It returns \`{}\` — we hand back that object and the assembled \`instance\` becomes garbage.

The \`typeof Constructor.prototype === 'object' && !== null\` check is a rare but telling case. A normal function's \`prototype\` is always an object, but it can be overwritten: \`function F(){}; F.prototype = 42\`. Then \`new F()\` creates an object with \`Object.prototype\` as its prototype. Knowing this separates "memorised" from "understood".

\`Object.create(proto)\` is the honest way to express "set the \`[[Prototype]]\`". The alternative \`instance.__proto__ = proto\` works but is deprecated and slower.

Important: \`apply\` calls the constructor **as a plain function** with a substituted \`this\`. So this emulation won't work for ES6 classes — they're marked as requiring \`new\` and will throw a \`TypeError\`.

## Complexity and edge cases

- **Time and memory:** O(1) plus whatever the constructor itself does.
- The constructor returns a **primitive** (number, string, \`undefined\`, \`null\`) — ignored, we return \`instance\`.
- The constructor returns an **object or function** — it overrides the result and our \`instance\` is lost.
- \`Constructor.prototype\` isn't an object — the prototype becomes \`Object.prototype\`.
- An arrow function has no \`prototype\` and no own \`this\`, so it can never be a constructor.
- An **ES6 class** makes \`Constructor.apply(...)\` throw \`TypeError: Class constructor cannot be invoked without 'new'\`. A real emulation would need \`Reflect.construct\`.
- If the constructor throws, the error just propagates and no object comes back.

## How to think out loud

> The \`new\` operator is three steps and I'll just write them out. First, create an object whose prototype is \`Constructor.prototype\` via \`Object.create\` — and handle the rare case where \`prototype\` was overwritten with a non-object, falling back to \`Object.prototype\`. Second, call the constructor via \`apply\` with that object as \`this\`, so \`this.x\` assignments land in the right place. Third, and most interesting, decide what to return: if the constructor returned an object or a function, the spec says that value wins and my instance is discarded; a primitive is ignored. I check \`result !== null\` separately because \`typeof null\` is \`'object'\`. It's flat-pack furniture: fetch the carcass, screw on the shelves, but if a finished wardrobe rolls out of the box, deliver that one. All O(1). I'd note this polyfill won't work for ES6 classes — those need \`Reflect.construct\`.

## Follow-ups they'll ask

- **What if the constructor returns \`42\`?** — a primitive is ignored and the created instance is returned.
- **And if it returns \`{}\`?** — that object is returned and the created instance is discarded.
- **And if it returns \`null\`?** — \`null\` isn't an object in spec terms, so the instance is returned. Hence the mandatory \`!== null\` check.
- **Why \`Object.create\` rather than \`{}\` plus \`__proto__\`?** — \`Object.create\` is the standard, fast way to set a prototype; \`__proto__\` is deprecated.
- **Does this work for an ES6 class?** — no, a class can't be called without \`new\`; you need \`Reflect.construct(Constructor, args)\`.
- **Where does \`new.target\` fit?** — inside a real \`new\` it equals the constructor; in this emulation it's \`undefined\`, which is observable to code that checks it.
- **How does this relate to \`instanceof\`?** — \`instanceof\` walks the prototype chain, which we set in step one, so \`myNew(F) instanceof F\` is true.`
    },
    codeSnippet: `function myNew(Constructor, ...args) {
  const proto =
    typeof Constructor.prototype === 'object' && Constructor.prototype !== null
      ? Constructor.prototype
      : Object.prototype;
  const instance = Object.create(proto);
  const result = Constructor.apply(instance, args);
  return result !== null && (typeof result === 'object' || typeof result === 'function')
    ? result
    : instance;
}`
  },
  {
    id: 'lc-023',
    category: 'live-coding',
    level: 'Medium',
    tags: ['flatten', 'recursion', 'arrays'],
    question: {
      ru: 'Реализуйте flatten(arr, depth = Infinity): разворачивает вложенные массивы до заданной глубины. Покажите рекурсивную и итеративную (через стек) версии. Пример: flatten([1,[2,[3,[4]]]], 2) === [1,2,3,[4]].',
      en: 'Implement flatten(arr, depth = Infinity): flattens nested arrays to a given depth. Show recursive and iterative (stack-based) versions. Example: flatten([1,[2,[3,[4]]]], 2) === [1,2,3,[4]].'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Развернуть вложенные массивы в один плоский, но **не глубже заданного уровня**. Задача-близнец: одну версию пишут рекурсией, вторую — циклом со **своим собственным стеком**. Второй вариант и есть настоящая цель вопроса: показать, что рекурсию всегда можно развернуть в цикл.

Аналогия: **распаковываете матрёшек из коробок**. Открыли коробку — внутри могут быть предметы и другие коробки. Предметы кладёте на стол, коробки — открываете дальше. \`depth\` — это правило «глубже трёх коробок не лезу, дальше кладу коробку на стол как есть».

## Идея решения по шагам

**Рекурсивная версия:**
1. \`flatten(arr, depth = Infinity)\` возвращает \`arr.reduce(..., [])\` — аккумулятор начинается с пустого массива.
2. Для каждого элемента одна развилка: \`Array.isArray(item) && depth > 0\`?
3. Да → \`acc.concat(flatten(item, depth - 1))\` — рекурсивно разворачиваем с уменьшенной глубиной.
4. Нет → \`acc.concat(item)\` — кладём как есть. Ветка «нет» покрывает и не-массивы, и массивы на исчерпанной глубине.

**Итеративная версия:**
1. Заполняем стек парами: \`const stack = arr.map(item => [item, depth])\` — рядом с каждым элементом храним, сколько ему ещё разрешено разворачиваться.
2. \`const result = []\`.
3. Пока стек не пуст: \`const [item, d] = stack.pop()\`.
4. Если \`Array.isArray(item) && d > 0\` — вместо того чтобы класть в результат, **разбираем** элемент обратно в стек: \`stack.push(...item.map(el => [el, d - 1]))\`.
5. Иначе — \`result.push(item)\`.
6. В конце \`return result.reverse()\`.

## Разбор кода

Пара \`[элемент, оставшаяся глубина]\` — центральная идея итеративной версии. Рекурсия хранила глубину бесплатно, в параметре каждого вызова; в цикле её приходится нести с собой вручную. Это общий приём: **всё, что рекурсия держала в стеке вызовов, при развороте в цикл переезжает в элементы вашего стека**.

\`.reverse()\` в конце — расплата за \`pop()\`. Стек работает по принципу «последний пришёл — первый вышел», поэтому элементы выходят в обратном порядке. Альтернатива — \`shift()\` вместо \`pop()\`, но это O(n) на операцию и суммарно O(n²). Один \`reverse()\` за O(n) в конце дешевле.

В рекурсивной версии \`acc.concat(...)\` создаёт **новый массив на каждом шаге**. Это красиво, но даёт O(n²) в худшем случае. На интервью честнее сказать: «в проде я бы писал \`acc.push(...)\` и возвращал тот же \`acc\`».

Обратите внимание, что \`depth - 1\` спускается вниз, а не вверх: мы не считаем, на каком уровне находимся, а считаем, сколько уровней ещё разрешено.

## Сложность и edge cases

- **Время:** O(n) по числу всех элементов на всех уровнях в итеративной версии; в рекурсивной с \`concat\` — до O(n²) из-за копирования массивов. **Память:** O(n) под результат; рекурсия дополнительно тратит O(d) стека вызовов, итеративная — O(n) на свой стек.
- \`depth = 0\` — возвращаем копию массива без изменений.
- \`depth = Infinity\` — разворачиваем полностью, до дна.
- Пустой массив → \`[]\`, пустые вложенные массивы просто исчезают.
- **Очень глубокая вложенность** (тысячи уровней) — рекурсия переполнит стек; итеративная версия выдержит, потому что её стек лежит в куче.
- Разреженные массивы: \`reduce\` и \`map\` **пропускают дырки**, поэтому \`[1, , 3]\` даст \`[1, 3]\` — это отличается от поведения \`Array.prototype.flat\`, который дырки тоже убирает, так что здесь совпадает.
- Не-массивы любого типа (объекты, строки) кладутся целиком: строка не разворачивается на символы.

## Как рассуждать вслух

> Уточню, нужна ли глубина и можно ли пользоваться нативным \`flat\`. Рекурсивно всё просто: \`reduce\` с пустым аккумулятором, и на каждом элементе одна проверка — если это массив и глубина ещё осталась, рекурсивно разворачиваю с \`depth - 1\`, иначе кладу как есть. Дальше покажу итеративную версию, ради которой задачу и дают: завожу стек пар «элемент и оставшаяся глубина». Это ключевой момент — то, что рекурсия хранила в параметрах вызова, в цикле надо нести рядом с элементом. Достаю через \`pop\`, и если это массив с ненулевой глубиной, не кладу в результат, а разбираю обратно в стек с уменьшенной глубиной. В конце делаю \`reverse\`, потому что \`pop\` выдаёт элементы задом наперёд. Это распаковка вложенных коробок. Время O(n), память O(n); рекурсия дополнительно ест O(глубины) стека и может его переполнить.

## Follow-up, которые зададут

- **Чем плох \`arr.flat(Infinity)\`?** — практически ничем, он нативный и быстрый; вопрос проверяет понимание рекурсии и умение развернуть её в цикл.
- **Как обойтись без рекурсии?** — явный стек пар \`[элемент, глубина]\`, как показано; это спасает от переполнения стека вызовов.
- **Почему в конце \`reverse()\`?** — \`pop()\` достаёт с конца, поэтому результат собирается в обратном порядке; \`shift()\` избавил бы от реверса, но стоил бы O(n²).
- **Как ускорить рекурсивную версию?** — заменить \`concat\` на \`push(...)\` в общий аккумулятор: \`concat\` копирует массив на каждом шаге.
- **Что со строками?** — они не массивы, поэтому кладутся целиком и на символы не разбираются.
- **Как посчитать максимальную глубину массива?** — та же рекурсия, но вместо сбора элементов возвращаем \`1 + max\` по детям.
- **Как развернуть только один уровень?** — \`depth = 1\`, либо нативный \`arr.flat()\` без аргумента.`,
      en: `## In short: what they're asking for

Unwrap nested arrays into one flat array, but **no deeper than a given level**. It's a twin task: one version written with recursion, the other with a loop and **your own explicit stack**. That second version is the real point of the question — showing that recursion can always be unrolled into a loop.

Analogy: **unpacking nested boxes**. You open a box and find items and more boxes. Items go on the table, boxes get opened further. \`depth\` is the rule "I won't go deeper than three boxes; beyond that the box goes on the table as-is".

## The idea, step by step

**Recursive version:**
1. \`flatten(arr, depth = Infinity)\` returns \`arr.reduce(..., [])\` — the accumulator starts as an empty array.
2. For each element there's one branch: \`Array.isArray(item) && depth > 0\`?
3. Yes → \`acc.concat(flatten(item, depth - 1))\` — recurse with a decremented depth.
4. No → \`acc.concat(item)\` — push as-is. The "no" branch covers both non-arrays and arrays at exhausted depth.

**Iterative version:**
1. Seed the stack with pairs: \`const stack = arr.map(item => [item, depth])\` — each element carries how much unwrapping it's still allowed.
2. \`const result = []\`.
3. While the stack isn't empty: \`const [item, d] = stack.pop()\`.
4. If \`Array.isArray(item) && d > 0\`, don't push it to the result — **break it back into the stack**: \`stack.push(...item.map(el => [el, d - 1]))\`.
5. Otherwise \`result.push(item)\`.
6. Finally \`return result.reverse()\`.

## Walking through the code

The \`[item, remaining depth]\` pair is the central idea of the iterative version. Recursion stored the depth for free, in each call's parameter; in a loop you must carry it yourself. This is the general technique: **everything recursion kept on the call stack moves into the elements of your own stack**.

The trailing \`.reverse()\` is the price of \`pop()\`. A stack is last-in-first-out, so elements come out backwards. The alternative is \`shift()\` instead of \`pop()\`, but that's O(n) per operation and O(n²) overall. One O(n) \`reverse()\` at the end is cheaper.

In the recursive version \`acc.concat(...)\` creates **a new array on every step**. Elegant, but O(n²) in the worst case. In an interview it's honest to say: "in production I'd use \`acc.push(...)\` and return the same \`acc\`".

Note that \`depth - 1\` counts down, not up: we don't track which level we're on, we track how many levels are still permitted.

## Complexity and edge cases

- **Time:** O(n) over all elements at all levels in the iterative version; the recursive one with \`concat\` can reach O(n²) from array copying. **Memory:** O(n) for the result; recursion additionally costs O(d) of call stack, the iterative version O(n) for its own stack.
- \`depth = 0\` — return a copy of the array unchanged.
- \`depth = Infinity\` — flatten all the way down.
- An empty array gives \`[]\`; empty nested arrays simply vanish.
- **Very deep nesting** (thousands of levels) overflows the call stack in the recursive version; the iterative one survives because its stack lives on the heap.
- Sparse arrays: \`reduce\` and \`map\` **skip holes**, so \`[1, , 3]\` yields \`[1, 3]\` — which matches \`Array.prototype.flat\`, as it removes holes too.
- Non-arrays of any kind (objects, strings) are pushed whole: a string is not split into characters.

## How to think out loud

> I'd check whether depth is required and whether native \`flat\` is allowed. Recursively it's simple: \`reduce\` from an empty accumulator, one check per element — if it's an array and depth remains, recurse with \`depth - 1\`, otherwise push as-is. Then I'd show the iterative version, which is why this task exists: a stack of "element plus remaining depth" pairs. That's the key move — what recursion kept in call parameters must travel alongside the element in a loop. I \`pop\`, and if it's an array with depth left, I don't push it to the result; I break it back into the stack with a decremented depth. At the end I \`reverse\`, because \`pop\` emits elements backwards. It's unpacking nested boxes. O(n) time and memory; recursion additionally eats O(depth) of stack and can overflow it.

## Follow-ups they'll ask

- **What's wrong with \`arr.flat(Infinity)\`?** — essentially nothing, it's native and fast; the question tests your grasp of recursion and unrolling it into a loop.
- **How do you avoid recursion?** — an explicit stack of \`[item, depth]\` pairs, as shown; it saves you from a call-stack overflow.
- **Why the trailing \`reverse()\`?** — \`pop()\` takes from the end, so the result builds backwards; \`shift()\` would avoid the reverse but cost O(n²).
- **How do you speed up the recursive version?** — replace \`concat\` with \`push(...)\` into a shared accumulator; \`concat\` copies the array at every step.
- **What about strings?** — they aren't arrays, so they're pushed whole and never split into characters.
- **How would you compute an array's maximum depth?** — the same recursion, but instead of collecting elements return \`1 + max\` over the children.
- **How do you flatten just one level?** — \`depth = 1\`, or native \`arr.flat()\` with no argument.`
    },
    codeSnippet: `// recursive
function flatten(arr, depth = Infinity) {
  return arr.reduce(
    (acc, item) =>
      Array.isArray(item) && depth > 0
        ? acc.concat(flatten(item, depth - 1))
        : acc.concat(item),
    []
  );
}

// iterative (stack)
function flattenIter(arr, depth = Infinity) {
  const stack = arr.map((item) => [item, depth]);
  const result = [];
  while (stack.length) {
    const [item, d] = stack.pop();
    if (Array.isArray(item) && d > 0) {
      stack.push(...item.map((el) => [el, d - 1]));
    } else {
      result.push(item);
    }
  }
  return result.reverse();
}`
  },
  {
    id: 'lc-024',
    category: 'live-coding',
    level: 'Medium',
    tags: ['chunk', 'arrays', 'slicing'],
    question: {
      ru: 'Реализуйте chunk(arr, size): разбивает массив на подмассивы длиной size (последний может быть короче). Пример: chunk([1,2,3,4,5], 2) === [[1,2],[3,4],[5]].',
      en: 'Implement chunk(arr, size): splits an array into subarrays of length size (the last may be shorter). Example: chunk([1,2,3,4,5], 2) === [[1,2],[3,4],[5]].'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Разрезать массив на куски по \`size\` элементов. Последний кусок может оказаться неполным. Весь приём — **цикл с шагом \`size\` вместо шага 1** плюс \`slice\`.

Аналогия: **раскладываете колоду карт по конвертам по 5 штук**. Идёте по колоде не по одной карте, а сразу пятёрками. Последний конверт может оказаться неполным — это нормально, выбрасывать остаток не надо.

## Идея решения по шагам

1. Сначала защита от бессмыслицы: \`if (size <= 0) return []\`. Без неё цикл \`i += size\` никогда не сдвинется и повесит вкладку.
2. Заводим \`const result = []\`.
3. Цикл \`for (let i = 0; i < arr.length; i += size)\` — обратите внимание, шаг \`size\`, а не \`1\`. Это единственная нестандартная деталь.
4. На каждой итерации \`result.push(arr.slice(i, i + size))\`.
5. Возвращаем \`result\`.

**Однострочный вариант:** \`Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))\`. Здесь \`Math.ceil\` заранее считает **число** кусков, а второй аргумент \`Array.from\` служит маппером по индексу куска.

## Разбор кода

Красота решения в том, что \`slice\` **сам обрезает выход за границу**. \`[1,2,3,4,5].slice(4, 6)\` вернёт \`[5]\`, а не бросит ошибку и не добавит \`undefined\`. Поэтому никакой отдельной обработки последнего неполного куска не нужно — люди часто пишут лишний \`Math.min\`, и это признак того, что человек не уверен в \`slice\`.

\`slice\` создаёт **новый массив, но копирует ссылки** — это поверхностная копия. Объекты внутри кусков те же самые, что и в исходном массиве. Стоит сказать вслух, чтобы показать понимание.

В однострочнике \`Array.from({ length: n })\` — стандартный способ создать массив заданной длины и **сразу заполнить** его через маппер. Без второго аргумента получился бы массив с дырками, по которому \`map\` не пройдёт.

Формула \`Math.ceil(arr.length / size)\` даёт именно то число кусков, которое нужно: 5 элементов по 2 — это \`ceil(2.5) = 3\` куска.

## Сложность и edge cases

- **Время:** O(n) — каждый элемент копируется ровно один раз суммарно по всем \`slice\`. **Память:** O(n) под результат.
- \`size <= 0\` — здесь возвращаем \`[]\`. Альтернатива — бросить ошибку; контракт стоит уточнить у интервьюера, потому что \`chunk(arr, 0)\` без защиты это бесконечный цикл.
- Пустой массив → \`[]\`, цикл не выполнится.
- \`size\` больше длины → один кусок со всеми элементами.
- \`size\` дробный (\`2.5\`) → \`slice\` округлит границы вниз, куски получатся неровные; при желании \`size = Math.floor(size)\`.
- Последний кусок короче — это норма, а не ошибка.
- Массив из одного элемента → \`[[x]]\`.

## Как рассуждать вслух

> Уточню, что делать при \`size <= 0\` — вернуть пустой массив или бросить; я поставлю ранний выход, потому что иначе цикл с шагом ноль зависнет навсегда. Дальше всё просто: иду циклом от нуля до конца массива, но шаг делаю \`size\`, а не единицу, и на каждой итерации кладу в результат \`arr.slice(i, i + size)\`. Отдельно обрабатывать последний неполный кусок не нужно: \`slice\` сам обрезает выход за границу и вернёт столько, сколько осталось. Это как раскладывать колоду по конвертам по пять карт — последний конверт может быть неполным. Время O(n), память O(n) под результат. Ещё отмечу, что \`slice\` даёт поверхностную копию: объекты внутри кусков те же, что в исходном массиве. Если попросят покороче, покажу вариант через \`Array.from\` с \`Math.ceil(length / size)\`.

## Follow-up, которые зададут

- **Можно ли через \`Array.from({length: Math.ceil(n/size)})\`?** — да, это элегантный однострочник; \`Math.ceil\` считает число кусков, маппер режет по индексу.
- **Где это применяется?** — пагинация, батчинг запросов к API по N штук, рендер сетки по строкам, разбиение загрузки файла на части.
- **Что делать при \`size <= 0\`?** — вернуть \`[]\` или бросить \`RangeError\`; главное — не оставить бесконечный цикл.
- **Куски — копии или ссылки?** — \`slice\` делает поверхностную копию: сам массив новый, но объекты внутри общие с исходным.
- **Как разбить не по размеру, а на N равных частей?** — считать \`size = Math.ceil(arr.length / n)\` и звать тот же \`chunk\`.
- **Как сделать ленивым для очень большого массива?** — генератор с \`yield arr.slice(i, i + size)\`, тогда куски не хранятся все сразу.
- **Есть ли это в стандарте?** — на подходе \`Array.prototype.chunk\`-подобные предложения и есть \`Iterator.prototype.chunks\` в новых итератор-хелперах, но повсеместной поддержки пока нет.`,
      en: `## In short: what they're asking for

Cut an array into pieces of \`size\` elements. The last piece may be short. The whole trick is **a loop that steps by \`size\` instead of 1**, plus \`slice\`.

Analogy: **dealing a deck of cards into envelopes of five**. You walk the deck five cards at a time rather than one. The last envelope may be short — that's fine, you don't throw the remainder away.

## The idea, step by step

1. First, guard against nonsense: \`if (size <= 0) return []\`. Without it the \`i += size\` loop never advances and hangs the tab.
2. Declare \`const result = []\`.
3. Loop \`for (let i = 0; i < arr.length; i += size)\` — note the step is \`size\`, not \`1\`. That's the only unusual detail.
4. Each iteration: \`result.push(arr.slice(i, i + size))\`.
5. Return \`result\`.

**One-liner variant:** \`Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))\`. Here \`Math.ceil\` computes the **number** of chunks up front, and \`Array.from\`'s second argument acts as a mapper over the chunk index.

## Walking through the code

The beauty of this solution is that \`slice\` **clamps out-of-range ends by itself**. \`[1,2,3,4,5].slice(4, 6)\` returns \`[5]\` — no error, no \`undefined\` padding. So the final short chunk needs no special handling; people often add a redundant \`Math.min\`, which signals they don't trust \`slice\`.

\`slice\` creates **a new array but copies references** — it's a shallow copy. The objects inside the chunks are the same ones as in the source array. Worth saying out loud to show you understand.

In the one-liner, \`Array.from({ length: n })\` is the standard way to create an array of a given length and **fill it immediately** via the mapper. Without the second argument you'd get an array of holes that \`map\` would skip.

The formula \`Math.ceil(arr.length / size)\` yields exactly the chunk count you need: 5 elements by 2 is \`ceil(2.5) = 3\` chunks.

## Complexity and edge cases

- **Time:** O(n) — each element is copied exactly once across all the \`slice\` calls. **Memory:** O(n) for the result.
- \`size <= 0\` — we return \`[]\` here. The alternative is throwing; clarify the contract, because \`chunk(arr, 0)\` without a guard is an infinite loop.
- Empty array → \`[]\`, the loop never runs.
- \`size\` larger than the length → a single chunk holding everything.
- A fractional \`size\` (\`2.5\`) makes \`slice\` truncate the bounds, giving uneven chunks; use \`size = Math.floor(size)\` if that matters.
- A short final chunk is normal, not an error.
- A one-element array → \`[[x]]\`.

## How to think out loud

> I'd clarify what \`size <= 0\` should do — return an empty array or throw; I'll add an early return, because a loop with a zero step hangs forever. After that it's simple: loop from zero to the array length, but step by \`size\` rather than 1, and each iteration push \`arr.slice(i, i + size)\`. The last short chunk needs no special case: \`slice\` clamps past the end and returns whatever's left. It's dealing a deck into envelopes of five, where the last envelope may be short. O(n) time and O(n) memory for the result. I'd also note \`slice\` gives a shallow copy: objects inside the chunks are shared with the source. If they want it shorter, I'd show the \`Array.from\` version with \`Math.ceil(length / size)\`.

## Follow-ups they'll ask

- **Could you use \`Array.from({length: Math.ceil(n/size)})\`?** — yes, an elegant one-liner; \`Math.ceil\` gives the chunk count and the mapper slices by index.
- **Where is this used?** — pagination, batching API requests N at a time, rendering a grid row by row, splitting a file upload into parts.
- **What should \`size <= 0\` do?** — return \`[]\` or throw a \`RangeError\`; the key is not leaving an infinite loop.
- **Are the chunks copies or references?** — \`slice\` makes a shallow copy: the array is new but the objects inside are shared with the source.
- **How do you split into N equal parts instead of by size?** — compute \`size = Math.ceil(arr.length / n)\` and call the same \`chunk\`.
- **How would you make it lazy for a huge array?** — a generator that does \`yield arr.slice(i, i + size)\`, so chunks aren't all held at once.
- **Is there anything standard?** — chunk-like proposals are in flight and the new iterator helpers include \`chunks\`, but universal support isn't there yet.`
    },
    codeSnippet: `function chunk(arr, size) {
  if (size <= 0) return [];
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// one-liner variant
const chunk2 = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );`
  },
  {
    id: 'lc-025',
    category: 'live-coding',
    level: 'Medium',
    tags: ['group-by', 'arrays', 'reduce'],
    question: {
      ru: 'Реализуйте groupBy(arr, keyFn): группирует элементы по ключу, который вычисляет keyFn (или по имени свойства). Возвращает объект { ключ: [элементы] }. Пример: группировка пользователей по age.',
      en: 'Implement groupBy(arr, keyFn): groups elements by the key produced by keyFn (or by a property name). Returns an object { key: [items] }. Example: group users by age.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Разложить массив по «корзинам»: у каждого элемента спрашиваем ключ и кладём его в корзину с этим именем. Приём: один проход \`reduce\` с **ленивым созданием корзины**.

Аналогия: **сортировка почты по ячейкам**. Берёте письмо, смотрите индекс, ищете ячейку. Ячейки нет — заводите её прямо сейчас и кладёте письмо. Ходить по ящику дважды не нужно: один проход, каждое письмо трогаем один раз.

## Идея решения по шагам

1. **Нормализуем ключ.** \`key\` может прийти как функция или как имя свойства. Одна строка приводит оба случая к функции: \`const getKey = typeof key === 'function' ? key : (item) => item[key]\`.
2. Дальше \`arr.reduce((acc, item) => { ... }, {})\` — аккумулятор стартует с пустого объекта.
3. Внутри вычисляем \`const k = getKey(item)\`.
4. **Ленивое создание корзины и push одной строкой:** \`(acc[k] ??= []).push(item)\`.
5. Обязательно \`return acc\` — самая частая ошибка в \`reduce\` это забыть вернуть аккумулятор.

## Разбор кода

Строка \`(acc[k] ??= []).push(item)\` заслуживает разбора, потому что она делает три вещи разом. Оператор \`??=\` присваивает \`[]\` только если \`acc[k]\` равен \`null\` или \`undefined\`; при этом всё выражение **возвращает итоговое значение**, то есть массив. К нему сразу применяется \`.push\`. Разворачивается это в:

\`\`\`js
if (acc[k] === undefined) acc[k] = [];
acc[k].push(item);
\`\`\`

Почему именно \`??=\`, а не \`||=\`? В этом месте разницы нет, потому что пустой массив истинный. Но \`??=\` точнее выражает намерение «создать, только если ничего нет».

Нормализация \`getKey\` — маленькая, но важная деталь: она делает всю остальную функцию **однородной**. Ветвление происходит один раз, до цикла, а не на каждом элементе.

Аккумулятор — обычный объект \`{}\`. Отсюда следует главное ограничение: **ключи объекта всегда строки**. Число \`20\` и строка \`'20'\` попадут в одну корзину, а \`Symbol\` и \`null\` превратятся в \`'null'\`. Если типы ключей важны, аккумулятор надо менять на \`Map\`.

## Сложность и edge cases

- **Время:** O(n) — один проход, ключ считается один раз на элемент, \`push\` за O(1). **Память:** O(n), каждый элемент лежит ровно в одной корзине.
- Пустой массив → \`{}\`.
- Числовые ключи приводятся к строкам: \`20\` и \`'20'\` **сольются**. Кроме того, целочисленные строковые ключи в объекте перечисляются **по возрастанию**, а не в порядке вставки — порядок групп теряется.
- \`keyFn\` вернула \`undefined\` → корзина с именем \`'undefined'\`, что обычно баг в данных, но код не упадёт.
- Ключ \`'__proto__'\` — опасный случай: присваивание в объектный литерал через него может не создать обычное свойство. Лечится аккумулятором \`Object.create(null)\` или \`Map\`.
- Одинаковые элементы попадают в одну корзину как отдельные записи, дедупликации нет.
- Очень большой массив — память O(n), но фактически хранятся ссылки, не копии.

## Как рассуждать вслух

> Сначала приведу \`key\` к единому виду: если это строка, оберну в функцию \`item => item[key]\`, чтобы дальше код был однородным. Дальше один проход \`reduce\` со стартовым пустым объектом. Для каждого элемента считаю ключ и делаю \`(acc[k] ??= []).push(item)\` — оператор \`??=\` создаёт массив, только если корзины ещё нет, и возвращает её, так что \`push\` применяется сразу. Не забываю вернуть аккумулятор. Это как раскладывать почту по ячейкам: нет ячейки — завожу на месте. Время O(n), память O(n). Обязательно проговорю ограничение: ключи объекта это строки, поэтому \`20\` и \`'20'\` сольются, а целочисленные ключи ещё и переупорядочатся по возрастанию. Если это важно, беру \`Map\` вместо объекта — там ключ сохраняет тип и порядок вставки.

## Follow-up, которые зададут

- **Чем плох объект как контейнер групп?** — ключи приводятся к строкам, теряется тип, а целочисленные ключи перечисляются по возрастанию, а не в порядке вставки.
- **Что нового в платформе?** — \`Object.groupBy\` и \`Map.groupBy\` из ES2024 делают ровно это; \`Map.groupBy\` как раз решает проблему с типами ключей.
- **Как сделать через \`Map\`?** — тот же цикл, но \`if (!map.has(k)) map.set(k, [])\` и \`map.get(k).push(item)\`.
- **Что с ключом \`__proto__\`?** — используйте \`Object.create(null)\` как стартовое значение либо \`Map\`, иначе присваивание может не создать свойство.
- **Как сгруппировать по нескольким полям?** — \`keyFn\` возвращает составную строку вроде \`a + '|' + b\`, либо используйте вложенные \`Map\`.
- **Как получить сразу агрегаты, а не массивы?** — тот же \`reduce\`, но в корзине не массив, а счётчик или сумма.
- **Почему \`??=\`, а не \`||=\`?** — здесь разницы нет, но \`??=\` точнее по смыслу: создаём, только если значения нет.`,
      en: `## In short: what they're asking for

Sort an array into "buckets": ask each element for its key and drop it into the bucket with that name. The trick: a single \`reduce\` pass with **lazy bucket creation**.

Analogy: **sorting post into pigeonholes**. You take a letter, read the postcode, find the slot. No slot? You create one on the spot and drop the letter in. No need to walk the sack twice: one pass, each letter touched once.

## The idea, step by step

1. **Normalise the key.** \`key\` may arrive as a function or as a property name. One line collapses both into a function: \`const getKey = typeof key === 'function' ? key : (item) => item[key]\`.
2. Then \`arr.reduce((acc, item) => { ... }, {})\` — the accumulator starts as an empty object.
3. Inside, compute \`const k = getKey(item)\`.
4. **Lazy bucket creation plus push in one line:** \`(acc[k] ??= []).push(item)\`.
5. Always \`return acc\` — forgetting to return the accumulator is the classic \`reduce\` bug.

## Walking through the code

The line \`(acc[k] ??= []).push(item)\` deserves unpacking, because it does three things at once. The \`??=\` operator assigns \`[]\` only when \`acc[k]\` is \`null\` or \`undefined\`, and the whole expression **evaluates to the resulting value**, i.e. the array. \`.push\` is then applied straight to it. It expands to:

\`\`\`js
if (acc[k] === undefined) acc[k] = [];
acc[k].push(item);
\`\`\`

Why \`??=\` and not \`||=\`? Here it makes no difference, since an empty array is truthy. But \`??=\` expresses the intent more precisely: create only when there's nothing.

The \`getKey\` normalisation is small but important: it makes the rest of the function **uniform**. The branching happens once, before the loop, not per element.

The accumulator is a plain \`{}\` object. Hence the main limitation: **object keys are always strings**. The number \`20\` and the string \`'20'\` land in the same bucket, and a \`Symbol\` or \`null\` becomes \`'null'\`. If key types matter, switch the accumulator to a \`Map\`.

## Complexity and edge cases

- **Time:** O(n) — one pass, the key computed once per element, \`push\` at O(1). **Memory:** O(n), each element sits in exactly one bucket.
- Empty array → \`{}\`.
- Numeric keys stringify: \`20\` and \`'20'\` **collide**. Worse, integer-like string keys in an object enumerate **in ascending order**, not insertion order — so group ordering is lost.
- \`keyFn\` returning \`undefined\` → a bucket named \`'undefined'\`, usually a data bug, but the code won't crash.
- The key \`'__proto__'\` is a hazard: assigning through it on an object literal may not create a normal property. Fix with an \`Object.create(null)\` accumulator or a \`Map\`.
- Identical elements go into the same bucket as separate entries; there's no deduplication.
- A very large array costs O(n) memory, but it stores references, not copies.

## How to think out loud

> First I normalise \`key\`: if it's a string I wrap it in \`item => item[key]\` so the rest of the code is uniform. Then a single \`reduce\` pass seeded with an empty object. For each element I compute the key and do \`(acc[k] ??= []).push(item)\` — \`??=\` creates the array only when the bucket is missing and evaluates to it, so \`push\` applies immediately. I remember to return the accumulator. It's sorting post into pigeonholes: no slot, so make one. O(n) time and memory. I'd definitely flag the limitation: object keys are strings, so \`20\` and \`'20'\` collide and integer-like keys get reordered ascending. If that matters I'd use a \`Map\` instead, which preserves key type and insertion order.

## Follow-ups they'll ask

- **What's wrong with an object as the container?** — keys stringify, losing their type, and integer-like keys enumerate in ascending order rather than insertion order.
- **What's new in the platform?** — ES2024's \`Object.groupBy\` and \`Map.groupBy\` do exactly this; \`Map.groupBy\` solves the key-type problem.
- **How would you do it with a \`Map\`?** — the same loop, but \`if (!map.has(k)) map.set(k, [])\` and \`map.get(k).push(item)\`.
- **What about a \`__proto__\` key?** — seed with \`Object.create(null)\` or use a \`Map\`, otherwise the assignment may not create a property.
- **How do you group by several fields?** — have \`keyFn\` return a composite string like \`a + '|' + b\`, or use nested \`Map\`s.
- **How do you get aggregates instead of arrays?** — the same \`reduce\`, but the bucket holds a counter or a sum instead of an array.
- **Why \`??=\` rather than \`||=\`?** — no practical difference here, but \`??=\` states the intent better: create only when the value is absent.`
    },
    codeSnippet: `function groupBy(arr, key) {
  const getKey = typeof key === 'function' ? key : (item) => item[key];
  return arr.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// groupBy([{ age: 20 }, { age: 30 }, { age: 20 }], 'age');
// { '20': [...], '30': [...] }`
  },
  {
    id: 'lc-026',
    category: 'live-coding',
    level: 'Medium',
    tags: ['unique', 'dedupe', 'sets'],
    question: {
      ru: 'Реализуйте unique(arr) для удаления дубликатов примитивов и uniqueBy(arr, keyFn) для дедупликации объектов по вычисляемому ключу. Сохраните порядок первого появления.',
      en: 'Implement unique(arr) to dedupe primitives and uniqueBy(arr, keyFn) to dedupe objects by a computed key. Preserve first-occurrence order.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Убрать повторы, **сохранив порядок первого появления**. Для примитивов задача решается одной строкой через \`Set\`. Для объектов — тем же \`Set\`, но хранящим не сами объекты, а **вычисленные ключи**.

Аналогия: **список гостей на входе**. У охранника блокнот с уже вошедшими. Пришёл человек — смотрим блокнот: если фамилия там есть, разворачиваем; если нет — записываем и пускаем. Проверка по блокноту мгновенная, поэтому очередь идёт за один проход.

## Идея решения по шагам

**unique (примитивы):**
1. \`new Set(arr)\` — конструктор сам выбрасывает дубликаты.
2. \`[...set]\` обратно в массив. Порядок сохранится, потому что \`Set\` помнит порядок вставки.
3. Итого одна строка: \`const unique = (arr) => [...new Set(arr)]\`.

**uniqueBy (объекты):**
1. Заводим \`const seen = new Set()\` — блокнот ключей — и \`const result = []\`.
2. Идём \`for (const item of arr)\`.
3. Считаем \`const key = keyFn(item)\`.
4. Если \`!seen.has(key)\` — добавляем ключ в \`seen\` **и** элемент в \`result\`.
5. Иначе просто пропускаем.
6. Возвращаем \`result\`.

## Разбор кода

Почему нельзя просто \`new Set(arrayOfObjects)\`? Потому что \`Set\` сравнивает объекты **по ссылке**. Два разных объекта \`{id: 1}\` и \`{id: 1}\` для него разные, и дедупликации не произойдёт. Отсюда весь смысл \`keyFn\`: она сводит объект к примитиву, который уже сравнивается по значению.

В \`uniqueBy\` в результат кладётся **сам \`item\`**, а не \`key\`. Мы дедуплицируем по ключу, но возвращаем исходные объекты — и именно первое вхождение, потому что все последующие отсекаются проверкой.

Главная альтернатива, которую надо уметь раскритиковать: \`arr.filter((x, i) => arr.indexOf(x) === i)\`. Работает, читается красиво, но \`indexOf\` внутри \`filter\` даёт **O(n²)** — на массиве в 100 000 элементов это уже секунды. \`Set\` превращает проверку принадлежности в O(1).

\`Set\` использует алгоритм SameValueZero. Практические следствия: \`NaN\` **дедуплицируется корректно** (в \`Set\` окажется один \`NaN\`), хотя \`NaN === NaN\` ложно; а \`+0\` и \`-0\` считаются одинаковыми.

## Сложность и edge cases

- **Время:** O(n) — один проход, каждая проверка \`has\` за O(1). **Память:** O(n) под \`Set\` и результат. Наивный вариант через \`indexOf\` был бы O(n²).
- \`NaN\` дедуплицируется правильно, останется один.
- \`+0\` и \`-0\` считаются равными и схлопнутся в один.
- Объекты в \`unique\` **не** дедуплицируются структурно — только по ссылке; для этого и нужен \`uniqueBy\`.
- \`keyFn\` вернула объект — тогда \`Set\` снова сравнивает по ссылке и ничего не схлопнется; ключ обязан быть примитивом.
- Пустой массив → \`[]\`.
- \`undefined\` и \`null\` — обычные значения, дедуплицируются как все.
- Очень большой массив — O(n) дополнительной памяти под \`Set\`; если это критично, придётся сортировать и сравнивать соседей, но тогда потеряется порядок.

## Как рассуждать вслух

> Для примитивов это одна строка: \`[...new Set(arr)]\`. \`Set\` выбрасывает дубликаты и при этом помнит порядок вставки, так что порядок первого появления сохраняется автоматически. Сразу проговорю, почему не \`filter\` с \`indexOf\`: там квадратичная сложность, а \`Set\` даёт проверку за O(1) и общий O(n). Для объектов так не выйдет, потому что \`Set\` сравнивает их по ссылке, и два одинаковых по содержимому объекта останутся оба. Поэтому в \`uniqueBy\` держу \`Set\` **ключей**: иду по массиву, считаю \`keyFn(item)\`, если ключа в блокноте нет — записываю его и кладу сам элемент в результат. Это как список гостей на входе. Время O(n), память O(n). Из тонкостей: \`Set\` работает по SameValueZero, поэтому \`NaN\` схлопывается корректно, а \`+0\` и \`-0\` считаются одинаковыми.

## Follow-up, которые зададут

- **Почему не \`indexOf\` внутри \`filter\`?** — это O(n²); \`Set\` даёт O(n) за счёт проверки принадлежности за O(1).
- **Почему \`new Set\` не дедуплицирует объекты?** — он сравнивает по ссылке, а не по содержимому.
- **Как дедуплицировать структурно?** — \`keyFn\` через \`JSON.stringify\` (быстро, но чувствителен к порядку полей) или попарное сравнение \`deepEqual\` (корректнее, но O(n²)).
- **Что с \`NaN\`?** — \`Set\` использует SameValueZero, поэтому \`NaN\` считается равным \`NaN\` и остаётся один.
- **Как оставить **последнее** вхождение вместо первого?** — идти по массиву с конца, а результат в конце развернуть.
- **Как дедуплицировать по нескольким полям?** — \`keyFn\` собирает составную строку, либо используйте вложенные \`Map\`.
- **Есть ли способ без дополнительной памяти?** — отсортировать и убрать соседние дубли за O(n log n), но тогда порядок первого появления теряется.`,
      en: `## In short: what they're asking for

Remove duplicates **preserving first-occurrence order**. For primitives it's a one-liner with a \`Set\`. For objects it's the same \`Set\`, except it holds **computed keys** rather than the objects themselves.

Analogy: **a guest list at the door**. The bouncer has a notebook of who's already in. Someone arrives — check the notebook: if the name is there, turn them away; if not, write it down and let them in. The lookup is instant, so the queue moves in a single pass.

## The idea, step by step

**unique (primitives):**
1. \`new Set(arr)\` — the constructor drops duplicates by itself.
2. \`[...set]\` back to an array. Order is preserved because a \`Set\` remembers insertion order.
3. One line total: \`const unique = (arr) => [...new Set(arr)]\`.

**uniqueBy (objects):**
1. Declare \`const seen = new Set()\` — the notebook of keys — and \`const result = []\`.
2. Loop \`for (const item of arr)\`.
3. Compute \`const key = keyFn(item)\`.
4. If \`!seen.has(key)\`, add the key to \`seen\` **and** the element to \`result\`.
5. Otherwise skip it.
6. Return \`result\`.

## Walking through the code

Why not simply \`new Set(arrayOfObjects)\`? Because a \`Set\` compares objects **by reference**. Two distinct objects \`{id: 1}\` and \`{id: 1}\` are different to it and nothing dedupes. That's the entire point of \`keyFn\`: it reduces an object to a primitive, which then compares by value.

In \`uniqueBy\` we push **the \`item\` itself**, not the \`key\`. We dedupe by key but return the original objects — specifically the first occurrence, since every later one is filtered out by the check.

The main alternative you should be able to criticise: \`arr.filter((x, i) => arr.indexOf(x) === i)\`. It works and reads nicely, but \`indexOf\` inside \`filter\` is **O(n²)** — on 100,000 elements that's seconds. A \`Set\` turns membership into O(1).

A \`Set\` uses SameValueZero. Practical consequences: \`NaN\` **dedupes correctly** (one \`NaN\` in the set) even though \`NaN === NaN\` is false; and \`+0\` and \`-0\` count as the same.

## Complexity and edge cases

- **Time:** O(n) — one pass with O(1) \`has\` checks. **Memory:** O(n) for the \`Set\` and the result. The naive \`indexOf\` variant would be O(n²).
- \`NaN\` dedupes correctly and one copy survives.
- \`+0\` and \`-0\` compare equal and collapse into one.
- Objects in \`unique\` do **not** dedupe structurally — only by reference; that's what \`uniqueBy\` is for.
- If \`keyFn\` returns an object, the \`Set\` is back to reference comparison and nothing collapses; the key must be a primitive.
- Empty array → \`[]\`.
- \`undefined\` and \`null\` are ordinary values and dedupe like everything else.
- A very large array costs O(n) extra memory for the \`Set\`; if that's critical you'd sort and compare neighbours, but then you lose the ordering.

## How to think out loud

> For primitives it's one line: \`[...new Set(arr)]\`. A \`Set\` drops duplicates and remembers insertion order, so first-occurrence ordering is preserved for free. I'd immediately say why not \`filter\` with \`indexOf\`: that's quadratic, whereas a \`Set\` gives O(1) membership and O(n) overall. For objects it doesn't work, because a \`Set\` compares them by reference and two structurally identical objects both survive. So in \`uniqueBy\` I keep a \`Set\` of **keys**: walk the array, compute \`keyFn(item)\`, and if the key isn't in the notebook, record it and push the element. It's a guest list at the door. O(n) time and memory. One subtlety: \`Set\` uses SameValueZero, so \`NaN\` dedupes correctly while \`+0\` and \`-0\` count as equal.

## Follow-ups they'll ask

- **Why not \`indexOf\` inside \`filter\`?** — it's O(n²); a \`Set\` gives O(n) thanks to O(1) membership tests.
- **Why doesn't \`new Set\` dedupe objects?** — it compares by reference, not by content.
- **How do you dedupe structurally?** — a \`keyFn\` using \`JSON.stringify\` (fast but order-sensitive) or pairwise \`deepEqual\` (more correct but O(n²)).
- **What about \`NaN\`?** — a \`Set\` uses SameValueZero, so \`NaN\` equals \`NaN\` and only one survives.
- **How do you keep the **last** occurrence instead of the first?** — walk the array backwards and reverse the result at the end.
- **How do you dedupe by several fields?** — have \`keyFn\` build a composite string, or use nested \`Map\`s.
- **Is there a way without extra memory?** — sort and drop adjacent duplicates in O(n log n), but that loses first-occurrence order.`
    },
    codeSnippet: `const unique = (arr) => [...new Set(arr)];

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

// uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (x) => x.id);`
  },
  {
    id: 'lc-027',
    category: 'live-coding',
    level: 'Medium',
    tags: ['polyfill', 'array-methods', 'prototypes'],
    question: {
      ru: 'Реализуйте полифилы Array.prototype.myMap, myFilter и myReduce. Соблюдайте контракт: передавайте (element, index, array) в колбэк, корректно обрабатывайте initialValue в reduce.',
      en: 'Implement polyfills for Array.prototype.myMap, myFilter and myReduce. Honour the contract: pass (element, index, array) to the callback and handle reduce initialValue correctly.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Написать три самых ходовых метода массива вручную. Сам цикл тривиален — задача проверяет, **знаете ли вы их точный контракт**: три аргумента колбэка, необязательный \`thisArg\`, поведение \`reduce\` без начального значения и пропуск дырок в разреженных массивах.

Аналогия: **три способа обработать конвейер деталей**. \`map\` — каждую деталь красим и кладём обратно, штук столько же. \`filter\` — детали не меняем, но бракованные убираем. \`reduce\` — складываем все детали в одну коробку по своему правилу; коробка на выходе одна.

## Идея решения по шагам

**myMap(cb, thisArg):**
1. \`const result = []\`, обычный индексный \`for\` по \`this.length\`.
2. Проверяем \`if (i in this)\` — это пропуск дырок в разреженном массиве.
3. Пишем **по индексу**: \`result[i] = cb.call(thisArg, this[i], i, this)\`. Именно \`result[i]\`, а не \`push\` — так дырки сохранятся в результате.

**myFilter(cb, thisArg):**
1. То же начало, но результат собираем через \`push\`.
2. Условие двойное: \`if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i])\`.
3. Важно: в результат кладём **исходный элемент**, а не то, что вернул колбэк.

**myReduce(cb, initial):**
1. \`let acc = initial\`, \`let start = 0\`.
2. Проверяем \`if (arguments.length < 2)\` — начальное значение **не передали**.
3. В этом случае: пустой массив → \`throw new TypeError('Reduce of empty array with no initial value')\`. Иначе \`acc = this[0]\`, \`start = 1\`.
4. Цикл с \`start\` до конца: \`acc = cb(acc, this[i], i, this)\`.
5. Возвращаем \`acc\`.

## Разбор кода

\`arguments.length < 2\` — ключевая строка \`reduce\`, и заменить её на \`initial === undefined\` **нельзя**. Вызов \`arr.reduce(fn, undefined)\` означает «начальное значение равно \`undefined\`», и это законно; проверка по значению перепутала бы его с «аргумент не передавали».

\`i in this\` — проверка «есть ли реально элемент на этом индексе». В разреженном массиве \`[1, , 3]\` длина равна 3, но индекса 1 физически нет. Нативные \`map\` и \`filter\` такие дырки пропускают, и наш полифил обязан вести себя так же.

В \`myMap\` присваивание \`result[i] = ...\` вместо \`result.push(...)\` — тонкость, следующая из предыдущего пункта. Если бы дырка была пропущена, а результат собирался через \`push\`, индексы бы сдвинулись. Присваивание по индексу сохраняет и позиции, и дырки.

\`cb.call(thisArg, ...)\` — поддержка второго аргумента методов. Мало кто им пользуется, но он есть в спецификации, и его упоминание показывает знание контракта.

Три аргумента колбэка \`(value, i, this)\` — не украшение. Третий даёт доступ к исходному массиву прямо внутри трансформации, например чтобы сравнить элемент с соседним.

Обратите внимание: в \`myReduce\` колбэк вызывается **без** \`thisArg\` — у нативного \`reduce\` этого параметра просто нет, там второй аргумент это начальное значение.

## Сложность и edge cases

- **Время:** O(n) у всех трёх. **Память:** O(n) у \`map\` и \`filter\` под результат, O(1) у \`reduce\` сверх аккумулятора.
- **Пустой \`reduce\` без начального значения** → \`TypeError\`. С начальным значением → вернёт его без единого вызова колбэка.
- \`reduce\` на массиве из одного элемента без начального значения → вернёт этот элемент, колбэк не вызовется ни разу.
- Разреженные массивы: дырки пропускаются во всех трёх; в \`map\` они остаются дырками и в результате.
- Изменение массива во время обхода: \`this.length\` читается на каждой итерации, поэтому добавленные элементы могут попасть в обход. Нативные методы фиксируют длину заранее — тонкое расхождение, о котором стоит знать.
- \`thisArg\` не передан → в колбэке \`this\` будет \`undefined\` в строгом режиме.
- Очень большой массив — \`map\` и \`filter\` аллоцируют новый массив, \`reduce\` нет.

## Как рассуждать вслух

> Сам цикл тут простой, поэтому сосредоточусь на контракте. Во всех трёх иду индексным \`for\` по \`this.length\` и передаю в колбэк три аргумента: значение, индекс и сам массив. Добавляю проверку \`i in this\`, чтобы пропускать дырки в разреженных массивах — нативные методы делают именно так. В \`myMap\` пишу результат **по индексу**, а не через \`push\`, иначе после пропущенной дырки все позиции съедут. В \`myFilter\` кладу в результат исходный элемент, а не возврат колбэка. Поддерживаю \`thisArg\` через \`cb.call\`. Самое интересное — \`myReduce\`: проверяю \`arguments.length < 2\`, а не \`initial === undefined\`, потому что \`undefined\` может быть законным начальным значением. Если начального нет и массив пуст — бросаю \`TypeError\`, как нативный; иначе беру первый элемент за аккумулятор и стартую со второго. Всё за O(n).

## Follow-up, которые зададут

- **Что делает \`reduce\` на пустом массиве?** — без начального значения бросает \`TypeError\`, с начальным возвращает его, не вызвав колбэк ни разу.
- **Почему \`arguments.length < 2\`, а не \`initial === undefined\`?** — потому что \`undefined\` может быть законным начальным значением, и различить эти случаи по значению нельзя.
- **Почему важен третий аргумент колбэка?** — он даёт доступ к исходному массиву прямо внутри трансформации, например для сравнения с соседями.
- **Зачем \`i in this\`?** — чтобы пропускать дырки в разреженных массивах, как это делают нативные методы.
- **Почему в \`myMap\` присваивание по индексу, а не \`push\`?** — чтобы сохранить позиции и дырки; \`push\` после пропуска сдвинул бы все последующие элементы.
- **Что если изменить массив во время обхода?** — нативные методы фиксируют длину до начала, наш полифил читает её каждый раз; поведение разойдётся.
- **Как реализовать \`forEach\` и \`some\`/\`every\`?** — тот же цикл; \`some\`/\`every\` дополнительно делают ранний выход.
- **Почему нельзя реализовать \`reduce\` через \`forEach\`?** — можно, но потеряется ранний \`TypeError\` и станет неудобно управлять стартовым индексом.`,
      en: `## In short: what they're asking for

Write the three workhorse array methods by hand. The loop itself is trivial — the task tests whether you know **their exact contract**: three callback arguments, an optional \`thisArg\`, \`reduce\`'s behaviour without an initial value, and skipping holes in sparse arrays.

Analogy: **three ways to process a conveyor of parts**. \`map\` — paint each part and put it back; the count stays the same. \`filter\` — don't change the parts, just remove the defective ones. \`reduce\` — put every part into one box according to your rule; one box comes out.

## The idea, step by step

**myMap(cb, thisArg):**
1. \`const result = []\`, a plain indexed \`for\` over \`this.length\`.
2. Check \`if (i in this)\` — that's how you skip holes in a sparse array.
3. Write **by index**: \`result[i] = cb.call(thisArg, this[i], i, this)\`. Use \`result[i]\`, not \`push\`, so holes survive into the result.

**myFilter(cb, thisArg):**
1. Same start, but collect the result with \`push\`.
2. A double condition: \`if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i])\`.
3. Important: push **the source element**, not what the callback returned.

**myReduce(cb, initial):**
1. \`let acc = initial\`, \`let start = 0\`.
2. Check \`if (arguments.length < 2)\` — the initial value **wasn't passed**.
3. In that case: an empty array → \`throw new TypeError('Reduce of empty array with no initial value')\`. Otherwise \`acc = this[0]\` and \`start = 1\`.
4. Loop from \`start\` to the end: \`acc = cb(acc, this[i], i, this)\`.
5. Return \`acc\`.

## Walking through the code

\`arguments.length < 2\` is the key line of \`reduce\`, and you **cannot** replace it with \`initial === undefined\`. Calling \`arr.reduce(fn, undefined)\` means "the initial value is \`undefined\`", which is legal; a value check would confuse it with "no argument passed".

\`i in this\` asks "is there really an element at this index?". In the sparse array \`[1, , 3]\` the length is 3 but index 1 physically doesn't exist. Native \`map\` and \`filter\` skip such holes, and our polyfill must match.

In \`myMap\`, assigning \`result[i] = ...\` instead of \`result.push(...)\` follows from that. If a hole were skipped and the result built with \`push\`, all later indices would shift. Index assignment preserves both positions and holes.

\`cb.call(thisArg, ...)\` supports the methods' second parameter. Few people use it, but it's in the spec and mentioning it shows you know the contract.

The three callback arguments \`(value, i, this)\` aren't decoration. The third gives access to the source array inside the transform — handy for comparing an element with its neighbour.

Note that in \`myReduce\` the callback is invoked **without** a \`thisArg\` — native \`reduce\` has no such parameter, its second argument is the initial value.

## Complexity and edge cases

- **Time:** O(n) for all three. **Memory:** O(n) for \`map\` and \`filter\` results, O(1) beyond the accumulator for \`reduce\`.
- **Empty \`reduce\` with no initial value** → \`TypeError\`. With an initial value it returns it without ever invoking the callback.
- \`reduce\` on a single-element array with no initial returns that element, again with zero callback calls.
- Sparse arrays: holes are skipped in all three; in \`map\` they remain holes in the result.
- Mutating the array mid-iteration: \`this.length\` is read every iteration, so appended elements can be visited. Native methods snapshot the length up front — a subtle divergence worth knowing.
- No \`thisArg\` passed → \`this\` inside the callback is \`undefined\` in strict mode.
- On a very large array, \`map\` and \`filter\` allocate a new array; \`reduce\` doesn't.

## How to think out loud

> The loop is simple, so I'll focus on the contract. All three use an indexed \`for\` over \`this.length\` and pass three arguments to the callback: value, index and the array itself. I add an \`i in this\` check to skip holes in sparse arrays — that's what the native methods do. In \`myMap\` I write the result **by index** rather than with \`push\`, otherwise a skipped hole shifts everything after it. In \`myFilter\` I push the source element, not the callback's return. I support \`thisArg\` via \`cb.call\`. The interesting one is \`myReduce\`: I check \`arguments.length < 2\` rather than \`initial === undefined\`, because \`undefined\` can be a legitimate initial value. With no initial and an empty array I throw a \`TypeError\` like the native does; otherwise I take the first element as the accumulator and start from index 1. All O(n).

## Follow-ups they'll ask

- **What does \`reduce\` do on an empty array?** — with no initial value it throws a \`TypeError\`; with one it returns it and never calls the callback.
- **Why \`arguments.length < 2\` and not \`initial === undefined\`?** — because \`undefined\` can be a legitimate initial value and the two cases are indistinguishable by value.
- **Why does the third callback argument matter?** — it gives access to the source array inside the transform, e.g. to compare with neighbours.
- **Why \`i in this\`?** — to skip holes in sparse arrays, matching native behaviour.
- **Why index assignment in \`myMap\` rather than \`push\`?** — to preserve positions and holes; \`push\` after a skip would shift everything after it.
- **What if the array is mutated during iteration?** — native methods snapshot the length up front while our polyfill re-reads it, so behaviour diverges.
- **How would you implement \`forEach\` and \`some\`/\`every\`?** — the same loop; \`some\`/\`every\` additionally short-circuit.
- **Could \`reduce\` be built on \`forEach\`?** — yes, but you'd lose the early \`TypeError\` and it gets awkward to manage the start index.`
    },
    codeSnippet: `Array.prototype.myMap = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = cb.call(thisArg, this[i], i, this);
  }
  return result;
};

Array.prototype.myFilter = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i]);
  }
  return result;
};

Array.prototype.myReduce = function (cb, initial) {
  let acc = initial;
  let start = 0;
  if (arguments.length < 2) {
    if (this.length === 0) throw new TypeError('Reduce of empty array with no initial value');
    acc = this[0];
    start = 1;
  }
  for (let i = start; i < this.length; i++) {
    acc = cb(acc, this[i], i, this);
  }
  return acc;
};`
  },
  {
    id: 'lc-028',
    category: 'live-coding',
    level: 'Medium',
    tags: ['range', 'zip', 'arrays'],
    question: {
      ru: 'Реализуйте range(start, end, step) (генерирует массив чисел) и zip(...arrays) (объединяет массивы поэлементно: zip([1,2],[a,b]) === [[1,a],[2,b]]). Длина zip — по самому короткому массиву.',
      en: 'Implement range(start, end, step) (generates an array of numbers) and zip(...arrays) (combines arrays element-wise: zip([1,2],[a,b]) === [[1,a],[2,b]]). zip length follows the shortest array.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Две маленькие утилиты, объединённые одним приёмом: **сначала вычислить длину результата, потом заполнить его через \`Array.from\` с маппером по индексу**. Никаких \`while\` и накопления в цикле.

Аналогии: \`range\` — **разметка линейки**: знаете начало, конец и цену деления, значит заранее знаете, сколько будет засечек. \`zip\` — **застёжка-молния**: два ряда зубцов соединяются попарно, и молния кончается там, где кончился **короткий** ряд.

## Идея решения по шагам

**range(start, end, step = 1):**
1. Защита: \`if (step === 0) throw new Error('step cannot be 0')\` — иначе бесконечность.
2. Считаем количество: \`const count = Math.max(Math.ceil((end - start) / step), 0)\`.
3. Генерируем: \`Array.from({ length: count }, (_, i) => start + i * step)\`.

**zip(...arrays):**
1. Пустой вызов: \`if (arrays.length === 0) return []\`.
2. Длина результата — минимум: \`const len = Math.min(...arrays.map(a => a.length))\`.
3. Собираем кортежи: \`Array.from({ length: len }, (_, i) => arrays.map(a => a[i]))\`.

## Разбор кода

Формула \`Math.ceil((end - start) / step)\` элегантно **работает и для отрицательного шага**. Для \`range(5, 0, -1)\` получим \`ceil(-5 / -1) = 5\` — ровно пять чисел. Отдельной ветки «идём назад» писать не нужно, знаки сокращаются сами.

\`Math.max(..., 0)\` — защита от бессмысленного направления. \`range(5, 0)\` с шагом \`+1\` даст \`ceil(-5) = -5\`, а \`Array.from({length: -5})\` создал бы пустой массив, но полагаться на это некрасиво: явный \`max\` делает намерение читаемым.

\`start + i * step\` вместо накопления \`current += step\` — не только короче, но и **точнее**: при дробном шаге накопление копит ошибку с плавающей точкой, а умножение считает каждый элемент от исходной точки.

В \`zip\` вложенность читается наизнанку: **внешний** \`Array.from\` идёт по индексам (это строки результата), а **внутренний** \`arrays.map\` идёт по массивам (это колонки). По сути это транспонирование матрицы.

\`Math.min(...arrays.map(a => a.length))\` — обрезка по самому короткому. Это стандартное поведение \`zip\`, но альтернатива (дополнять \`undefined\` до самого длинного) тоже встречается, поэтому стратегию стоит уточнить.

## Сложность и edge cases

- **range:** время и память O(n), где n — число элементов. **zip:** время O(len × количество массивов), память столько же — мы создаём len кортежей.
- \`step = 0\` — бросаем ошибку, иначе бесконечный диапазон.
- \`range(5, 0)\` с положительным шагом → пустой массив, не ошибка.
- \`range(0, 5, -1)\` — тоже пустой: направление не совпадает.
- Дробный шаг (\`0.1\`) — накопится погрешность плавающей точки; формула \`start + i * step\` минимизирует её, но не убирает.
- \`zip()\` без аргументов → \`[]\`.
- \`zip\` с одним массивом → массив одноэлементных кортежей.
- Один из массивов пустой → результат пустой, потому что минимум равен нулю.
- \`Math.min(...)\` со **спредом** очень большого массива может упереться в лимит аргументов; на сотнях тысяч массивов надёжнее \`reduce\`.

## Как рассуждать вслух

> Обе функции строю одинаково: сначала вычисляю длину результата, потом заполняю через \`Array.from\` с маппером по индексу — без \`while\` и без накопления. В \`range\` первым делом отсекаю \`step === 0\`, иначе получится бесконечность. Количество элементов считаю как \`ceil((end - start) / step)\`, и эта формула сама работает для отрицательного шага, потому что знаки сокращаются; оборачиваю в \`Math.max(..., 0)\` на случай, когда направление не совпадает. Значение беру как \`start + i * step\`, а не накоплением, чтобы не копить ошибку на дробном шаге. В \`zip\` длина — минимум по всем массивам, это молния, которая кончается на коротком ряду. Внешний \`Array.from\` идёт по индексам, внутренний \`map\` по массивам — фактически транспонирование. \`range\` за O(n), \`zip\` за O(длина × число массивов).

## Follow-up, которые зададут

- **Как сделать unzip?** — \`zip(...zipped)\`: повторное применение транспонирует матрицу обратно.
- **Как сделать ленивый \`range\`?** — генератор \`function*\` с \`yield\`; на диапазоне в миллион элементов это экономит всю память.
- **Что если массивы в \`zip\` разной длины?** — здесь обрезаем по короткому; альтернатива — дополнять \`undefined\` до длины самого длинного, уточните требование.
- **Почему \`start + i * step\`, а не накопление?** — накопление копит погрешность плавающей точки при дробном шаге.
- **Работает ли формула для отрицательного шага?** — да, знаки в делении сокращаются, отдельная ветка не нужна.
- **Что делать при \`step = 0\`?** — бросать ошибку; иначе диапазон бесконечен.
- **Чем \`Array.from({length: n}, fn)\` лучше \`new Array(n).fill().map()\`?** — один проход вместо двух и никакого промежуточного массива дырок.`,
      en: `## In short: what they're asking for

Two small utilities sharing one technique: **compute the result length first, then fill it with \`Array.from\` and an index mapper**. No \`while\` loops, no accumulating.

Analogies: \`range\` is **marking up a ruler**: knowing the start, the end and the interval, you already know how many ticks there'll be. \`zip\` is **a zipper**: two rows of teeth join in pairs, and the zip ends where the **shorter** row ends.

## The idea, step by step

**range(start, end, step = 1):**
1. Guard: \`if (step === 0) throw new Error('step cannot be 0')\`, otherwise it's infinite.
2. Count the elements: \`const count = Math.max(Math.ceil((end - start) / step), 0)\`.
3. Generate: \`Array.from({ length: count }, (_, i) => start + i * step)\`.

**zip(...arrays):**
1. Empty call: \`if (arrays.length === 0) return []\`.
2. The result length is the minimum: \`const len = Math.min(...arrays.map(a => a.length))\`.
3. Build the tuples: \`Array.from({ length: len }, (_, i) => arrays.map(a => a[i]))\`.

## Walking through the code

The formula \`Math.ceil((end - start) / step)\` elegantly **works for a negative step too**. For \`range(5, 0, -1)\` you get \`ceil(-5 / -1) = 5\` — exactly five numbers. No separate "going backwards" branch is needed; the signs cancel.

\`Math.max(..., 0)\` guards against a nonsensical direction. \`range(5, 0)\` with step \`+1\` gives \`ceil(-5) = -5\`, and \`Array.from({length: -5})\` would produce an empty array anyway — but relying on that is sloppy; the explicit \`max\` states the intent.

\`start + i * step\` rather than accumulating \`current += step\` is not only shorter but **more accurate**: with a fractional step, accumulation compounds floating-point error, whereas multiplication computes each element from the origin.

In \`zip\` the nesting reads inside-out: the **outer** \`Array.from\` walks the indices (the result's rows) and the **inner** \`arrays.map\` walks the arrays (the columns). It's effectively a matrix transpose.

\`Math.min(...arrays.map(a => a.length))\` truncates to the shortest. That's standard \`zip\` behaviour, but the alternative (padding with \`undefined\` to the longest) also exists, so clarify the strategy.

## Complexity and edge cases

- **range:** O(n) time and memory, where n is the element count. **zip:** O(len × number of arrays) in both — we create len tuples.
- \`step = 0\` — throw, otherwise the range is infinite.
- \`range(5, 0)\` with a positive step → an empty array, not an error.
- \`range(0, 5, -1)\` is also empty: the direction doesn't match.
- A fractional step (\`0.1\`) accumulates floating-point error; \`start + i * step\` minimises but doesn't eliminate it.
- \`zip()\` with no arguments → \`[]\`.
- \`zip\` with a single array → an array of one-element tuples.
- If any array is empty, the result is empty, since the minimum is zero.
- \`Math.min(...)\` with a **spread** over a huge array can hit the argument limit; with hundreds of thousands of arrays, a \`reduce\` is safer.

## How to think out loud

> I build both the same way: compute the result length first, then fill it with \`Array.from\` and an index mapper — no \`while\`, no accumulation. In \`range\` I first reject \`step === 0\`, otherwise it's infinite. The count is \`ceil((end - start) / step)\`, and that formula works for a negative step by itself because the signs cancel; I wrap it in \`Math.max(..., 0)\` for when the direction doesn't match. I compute values as \`start + i * step\` rather than accumulating, so a fractional step doesn't compound error. In \`zip\` the length is the minimum across all arrays — a zipper ending at the shorter row. The outer \`Array.from\` walks indices, the inner \`map\` walks arrays, which is effectively a transpose. \`range\` is O(n), \`zip\` is O(length × number of arrays).

## Follow-ups they'll ask

- **How do you unzip?** — \`zip(...zipped)\`: applying it again transposes the matrix back.
- **How do you make \`range\` lazy?** — a \`function*\` generator with \`yield\`; over a million-element range that saves all the memory.
- **What if the \`zip\` arrays differ in length?** — here we truncate to the shortest; the alternative pads with \`undefined\` to the longest — clarify the requirement.
- **Why \`start + i * step\` and not accumulation?** — accumulation compounds floating-point error with a fractional step.
- **Does the formula work for a negative step?** — yes, the signs cancel in the division; no separate branch is needed.
- **What should \`step = 0\` do?** — throw; otherwise the range is infinite.
- **Why is \`Array.from({length: n}, fn)\` better than \`new Array(n).fill().map()\`?** — one pass instead of two and no intermediate array of holes.`
    },
    codeSnippet: `function range(start, end, step = 1) {
  if (step === 0) throw new Error('step cannot be 0');
  const count = Math.max(Math.ceil((end - start) / step), 0);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

function zip(...arrays) {
  if (arrays.length === 0) return [];
  const len = Math.min(...arrays.map((a) => a.length));
  return Array.from({ length: len }, (_, i) => arrays.map((a) => a[i]));
}

// range(0, 5);        // [0,1,2,3,4]
// zip([1, 2], ['a', 'b']); // [[1,'a'],[2,'b']]`
  },
  {
    id: 'lc-029',
    category: 'live-coding',
    level: 'Medium',
    tags: ['set-ops', 'arrays', 'intersection'],
    question: {
      ru: 'Реализуйте intersection(a, b) (элементы, присутствующие в обоих массивах) и difference(a, b) (элементы a, которых нет в b). Сохраните порядок из a, обеспечьте линейную сложность.',
      en: 'Implement intersection(a, b) (elements present in both arrays) and difference(a, b) (elements of a not in b). Preserve order from a and ensure linear complexity.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Две функции над массивами: \`intersection(a, b)\` — элементы, которые есть в обоих, \`difference(a, b)\` — элементы \`a\`, которых нет в \`b\`. Порядок берём из \`a\`, сложность обязана быть линейной. Весь фокус в одной идее: **второй массив кладём в \`Set\`, а первый просто фильтруем**.

Аналогия: \`Set\` — это **список гостей на входе в клуб**. Наивный подход: на каждого пришедшего заново пробегать глазами весь список сверху вниз — это O(n×m). Умный: один раз переложить список в голову охраннику, и дальше на каждый вопрос «он в списке?» ответ приходит мгновенно.

## Идея решения по шагам

**intersection(a, b):**
1. \`const setB = new Set(b)\` — один проход по \`b\`, разовая плата за мгновенные проверки дальше.
2. \`return a.filter(x => setB.has(x))\` — порядок из \`a\` сохраняется сам собой, потому что мы идём по \`a\`.

**difference(a, b):**
1. Тот же \`setB\`, построенный из \`b\`.
2. \`return a.filter(x => !setB.has(x))\` — единственное отличие от пересечения — отрицание.

Если результат нужен без повторов — оберните: \`[...new Set(intersection(a, b))]\`.

## Разбор кода

\`new Set(b)\` строится за один проход по \`b\` — это те самые O(m), которые мы платим **один раз**, вместо того чтобы платить их на каждом элементе \`a\`. Именно эта строка превращает квадрат в линию.

\`filter\` выбран не случайно: он гарантирует **порядок и полноту из \`a\`** — ничего не переставляет и не схлопывает дубликаты. Требование «сохраните порядок из a» выполняется бесплатно, отдельная сортировка не нужна.

Две функции отличаются ровно одним символом \`!\`. На собеседовании это стоит проговорить вслух — «difference это то же самое с отрицанием предиката» — и не переписывать всё заново.

\`setB\` намеренно создаётся внутри каждой функции, а не переиспользуется: функции остаются независимыми и чистыми. Если вызовов с одним и тем же \`b\` много, \`Set\` стоит построить снаружи и передавать внутрь.

Неочевидное: \`Set\` сравнивает по \`SameValueZero\`. \`NaN\` находит сам себя (в отличие от \`indexOf\`), а \`+0\` и \`-0\` считаются одинаковыми. Объекты сравниваются **по ссылке**, поэтому два одинаковых по содержимому объекта в пересечение не попадут.

## Сложность и edge cases

- **Время:** O(n + m), **память:** O(m) — построение \`Set\` линейно по \`b\`, а каждая из n проверок \`has\` стоит O(1).
- Пустой \`a\` ⇒ пустой результат в обоих случаях.
- Пустой \`b\` ⇒ intersection пустой, difference возвращает копию \`a\`.
- Дубликаты в \`a\` сохраняются: \`intersection([1,1,2],[1])\` даст \`[1,1]\`. Нужен уникальный результат — оберните в \`unique\`.
- Дубликаты в \`b\` роли не играют — \`Set\` схлопывает их сам.
- Объекты сравниваются по ссылке; для структурного сравнения нужен ключ (\`JSON.stringify\` или бизнес-\`id\`).
- \`NaN\` работает корректно, потому что \`Set\` использует \`SameValueZero\`.

## Как рассуждать вслух

> Сначала уточню два момента: сравниваем примитивы или объекты и нужно ли дедуплицировать результат — от этого зависит, что будет ключом. Дальше беру самый простой линейный приём: второй массив кладу в \`Set\`. Это разовая плата O(m), зато каждая проверка принадлежности потом стоит O(1). Наивный вариант с \`includes\` внутри \`filter\` дал бы O(n×m), и на десятках тысяч элементов разница уже очень заметна. Потом просто фильтрую первый массив: для пересечения по \`has\`, для разности — по отрицанию \`has\`. Порядок из \`a\` сохраняется сам собой, потому что я иду по \`a\` и ничего не сортирую. Итого O(n + m) по времени и O(m) по памяти. Из краевых случаев назову дубликаты в \`a\` — они все попадут в результат — и объекты, которые \`Set\` сравнивает по ссылке, а не по содержимому.

## Follow-up, которые зададут

- **Почему не вложенный \`includes\`?** — это O(n×m); \`Set\` делает проверку константной и даёт линейность.
- **Что нового в платформе?** — нативные \`Set.prototype.intersection\`/\`difference\`/\`union\` (2024), но они работают с самими \`Set\`, а не с массивами.
- **Как сравнивать объекты структурно?** — считать ключ (\`JSON.stringify\` или \`id\`) и класть в \`Set\` ключи, а не объекты.
- **Как получить симметричную разность?** — \`[...difference(a, b), ...difference(b, a)]\`.
- **Как убрать дубликаты из результата?** — \`[...new Set(result)]\`, но это дополнительный проход и память.
- **Что если \`b\` огромный, а \`a\` крошечный?** — всё равно O(n + m): построение \`Set\` по \`b\` неизбежно. Если \`b\` переиспользуется — стройте \`Set\` один раз снаружи.`,
      en: `## In short: what they're asking for

Two array helpers: \`intersection(a, b)\` returns the elements present in both, \`difference(a, b)\` returns the elements of \`a\` missing from \`b\`. Order comes from \`a\` and the complexity must be linear. The whole trick is one idea: **put the second array into a \`Set\` and just filter the first one**.

Analogy: a \`Set\` is **the guest list at a club door**. The naive approach re-reads the whole list top to bottom for every arriving person — that's O(n×m). The smart one loads the list into the bouncer's head once, and from then on every "is he on the list?" is answered instantly.

## The idea, step by step

**intersection(a, b):**
1. \`const setB = new Set(b)\` — one pass over \`b\`, a one-off payment for instant lookups afterwards.
2. \`return a.filter(x => setB.has(x))\` — order from \`a\` is preserved automatically because we walk \`a\`.

**difference(a, b):**
1. The same \`setB\` built from \`b\`.
2. \`return a.filter(x => !setB.has(x))\` — the only difference from intersection is the negation.

If the result must be duplicate-free, wrap it: \`[...new Set(intersection(a, b))]\`.

## Walking through the code

\`new Set(b)\` is built in one pass over \`b\` — that's the O(m) we pay **once**, instead of paying it for every element of \`a\`. That single line is what turns a square into a line.

\`filter\` is not an accidental choice: it guarantees **order and completeness from \`a\`** — it never reorders and never collapses duplicates. The "preserve order from a" requirement is satisfied for free, with no sorting.

The two functions differ by exactly one \`!\`. Say that out loud in the interview — "difference is the same thing with the predicate negated" — instead of rewriting everything from scratch.

\`setB\` is deliberately created inside each function rather than shared: the functions stay independent and pure. If you call them many times with the same \`b\`, build the \`Set\` outside and pass it in.

The non-obvious bit: a \`Set\` compares with \`SameValueZero\`. \`NaN\` finds itself (unlike \`indexOf\`), and \`+0\` and \`-0\` count as equal. Objects compare **by reference**, so two structurally identical objects will not show up in the intersection.

## Complexity and edge cases

- **Time:** O(n + m), **memory:** O(m) — building the \`Set\` is linear in \`b\`, and each of the n \`has\` checks is O(1).
- Empty \`a\` ⇒ an empty result in both cases.
- Empty \`b\` ⇒ intersection is empty, difference returns a copy of \`a\`.
- Duplicates in \`a\` survive: \`intersection([1,1,2],[1])\` gives \`[1,1]\`. If you need a unique result, wrap it in \`unique\`.
- Duplicates in \`b\` don't matter — the \`Set\` collapses them itself.
- Objects compare by reference; structural comparison needs a key (\`JSON.stringify\` or a business \`id\`).
- \`NaN\` behaves correctly because \`Set\` uses \`SameValueZero\`.

## How to think out loud

> First I'd clarify two things: are we comparing primitives or objects, and should the result be deduplicated — that decides what the key is. Then I go for the simplest linear technique: put the second array into a \`Set\`. That's a one-off O(m) cost, and every membership check afterwards is O(1). The naive version, \`includes\` inside \`filter\`, would be O(n×m), which really starts to show at tens of thousands of elements. After that I just filter the first array: \`has\` for intersection, negated \`has\` for difference. Order from \`a\` is preserved for free because I walk \`a\` and never sort anything. Overall that's O(n + m) time and O(m) memory. For edge cases I'd mention duplicates in \`a\` — they all survive into the result — and objects, which a \`Set\` compares by reference rather than by content.

## Follow-ups they'll ask

- **Why not a nested \`includes\`?** — that's O(n×m); a \`Set\` makes the check constant and the whole thing linear.
- **Anything new in the platform?** — native \`Set.prototype.intersection\`/\`difference\`/\`union\` (2024), but they operate on \`Set\`s, not arrays.
- **How do you compare objects structurally?** — compute a key (\`JSON.stringify\` or an \`id\`) and put keys into the \`Set\`, not the objects.
- **How do you get the symmetric difference?** — \`[...difference(a, b), ...difference(b, a)]\`.
- **How do you dedupe the result?** — \`[...new Set(result)]\`, at the cost of one extra pass and memory.
- **What if \`b\` is huge and \`a\` is tiny?** — still O(n + m): building the \`Set\` over \`b\` is unavoidable. If \`b\` is reused, build the \`Set\` once outside.`
    },
    codeSnippet: `function intersection(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function difference(a, b) {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}

// intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
// difference([1, 2, 3], [2, 3, 4]);   // [1]`
  },
  {
    id: 'lc-030',
    category: 'live-coding',
    level: 'Medium',
    tags: ['two-sum', 'hash-map', 'algorithms'],
    question: {
      ru: 'Two Sum: дан массив чисел и target. Верните индексы двух чисел, сумма которых равна target. Каждый вход имеет ровно одно решение, один элемент нельзя использовать дважды. Добейтесь O(n).',
      en: 'Two Sum: given an array of numbers and a target, return the indices of the two numbers that add up to target. Exactly one solution exists; you may not use the same element twice. Achieve O(n).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Найти два числа, дающих в сумме \`target\`, и вернуть их **индексы**. Наивно — два вложенных цикла, O(n²). Правильный ответ — **один проход и \`Map\`, в которой мы запоминаем всё, что уже видели**.

Аналогия: \`Map\` здесь — **гардероб с номерками**. Идя по массиву, вы для каждого числа спрашиваете гардеробщика: «а не сдавал ли кто-нибудь номерок \`target - x\`?» Если сдавал — пара найдена мгновенно. Если нет — сдаёте свой номерок и идёте дальше. Никто не перебирает вешалки заново.

## Идея решения по шагам

1. Заводим \`const seen = new Map()\` — она хранит **значение → индекс** для всех уже пройденных элементов.
2. Идём обычным \`for\` по индексам \`i\` (нужны именно индексы, поэтому не \`for...of\`).
3. Считаем недостающее слагаемое: \`const complement = target - nums[i]\`.
4. \`if (seen.has(complement)) return [seen.get(complement), i]\` — первый индекс берём из карты, второй — текущий.
5. Только **после** проверки кладём текущий элемент: \`seen.set(nums[i], i)\`.
6. Дошли до конца — пары нет, возвращаем \`[]\`.

## Разбор кода

Ключ в \`Map\` — **значение**, а не индекс. Это принципиально: искать мы будем именно по значению (\`complement\`), а индекс — это полезная нагрузка, которую мы потом вернём.

Порядок «сначала проверить, потом записать» — самая важная строчка задачи. Если поменять местами, то при \`target = 8\` и элементе \`4\` мы бы нашли сами себя и вернули \`[i, i]\`, использовав один элемент дважды. Проверка до записи гарантирует, что в \`seen\` лежат **только предыдущие** элементы.

Возвращаем \`[seen.get(complement), i]\` именно в таком порядке — индекс из карты всегда меньше текущего, так что результат отсортирован по возрастанию.

Дубликаты значений в \`seen\` перезаписывают друг друга (второй \`3\` затрёт индекс первой \`3\`), и это безопасно: при гарантии единственного решения нам достаточно любого одного индекса. Но для случая \`[3, 3]\` и \`target = 6\` всё сработает верно — первая тройка успела лечь в карту до того, как мы дошли до второй.

\`Map\`, а не объект: \`Map\` не приводит числовые ключи к строкам, не спотыкается о \`'constructor'\` и даёт честный O(1).

## Сложность и edge cases

- **Время:** O(n) — один проход, каждая операция \`Map\` амортизированно O(1). **Память:** O(n) — в худшем случае в карту попадёт весь массив.
- Пустой массив или один элемент ⇒ цикл не найдёт пару, вернём \`[]\`.
- Решения нет ⇒ \`[]\` (или \`null\` — уточните контракт, по условию решение обычно гарантировано).
- Дубликаты: \`[3, 3]\`, \`target = 6\` → \`[0, 1]\`, работает благодаря порядку «проверка до записи».
- Отрицательные числа и ноль работают без единого изменения — вычитание не требует знака.
- Один элемент нельзя использовать дважды — это обеспечивается тем же порядком строк.
- Дробные числа: \`0.1 + 0.2 !== 0.3\`, точное сравнение может не сработать — уточните, целые ли числа.

## Как рассуждать вслух

> Сначала уточню: возвращаем индексы или значения, гарантировано ли ровно одно решение и что делать, если пары нет. Наивное решение — два вложенных цикла за O(n²), но его можно сразу свести к линейному, если запоминать пройденное. Завожу \`Map\` вида «значение → индекс» и иду одним проходом. Для каждого числа считаю дополнение \`target - x\` и спрашиваю карту, встречалось ли оно раньше. Если да — сразу возвращаю пару индексов. Если нет — кладу текущее число в карту и иду дальше. Принципиально важно проверять **до** записи, иначе на элементе, равном половине target, я найду сам себя и использую один элемент дважды. Получается O(n) по времени и O(n) по памяти — мы меняем память на скорость. Отрицательные числа и дубликаты работают без изменений.

## Follow-up, которые зададут

- **А если массив отсортирован?** — два указателя с краёв: O(n) по времени и O(1) по памяти, карта не нужна.
- **Как вернуть все пары, а не одну?** — не выходить по первому совпадению, а накапливать результат; понадобится аккуратная дедупликация.
- **Почему проверка идёт до записи?** — иначе элемент найдёт сам себя, когда \`nums[i] * 2 === target\`.
- **Three Sum?** — сортировка плюс внешний цикл и два указателя внутри, O(n²).
- **Почему \`Map\`, а не объект?** — объект приводит ключи к строкам и наследует свойства прототипа; \`Map\` чище и предсказуемее.
- **Что если чисел миллионы и память дорога?** — сортировка с двумя указателями: O(n log n) по времени, зато O(1) дополнительной памяти, но индексы придётся сохранять до сортировки.`,
      en: `## In short: what they're asking for

Find two numbers that add up to \`target\` and return their **indices**. The naive way is two nested loops, O(n²). The expected answer is **one pass plus a \`Map\` that remembers everything seen so far**.

Analogy: the \`Map\` is **a cloakroom with numbered tags**. As you walk the array, for every number you ask the attendant: "has anyone handed in tag \`target - x\`?" If yes, the pair is found instantly. If not, you hand in your own tag and move on. Nobody rescans the racks.

## The idea, step by step

1. Create \`const seen = new Map()\` holding **value → index** for every element already visited.
2. Walk with a plain indexed \`for\` loop over \`i\` (we need indices, hence not \`for...of\`).
3. Compute the missing addend: \`const complement = target - nums[i]\`.
4. \`if (seen.has(complement)) return [seen.get(complement), i]\` — the first index comes from the map, the second is the current one.
5. Only **after** the check store the current element: \`seen.set(nums[i], i)\`.
6. If the loop finishes, there's no pair — return \`[]\`.

## Walking through the code

The \`Map\` key is the **value**, not the index. That's essential: we look things up by value (\`complement\`), and the index is the payload we return later.

"Check first, then write" is the single most important line of this task. Swap the two and, with \`target = 8\` and an element \`4\`, we'd find ourselves and return \`[i, i]\`, using one element twice. Checking before writing guarantees \`seen\` contains **only earlier** elements.

We return \`[seen.get(complement), i]\` in that order — the map index is always smaller than the current one, so the result comes out ascending.

Duplicate values overwrite each other in \`seen\` (a second \`3\` clobbers the index of the first), which is safe: with a guaranteed unique solution any one index will do. And \`[3, 3]\` with \`target = 6\` still works — the first 3 was stored before we reached the second.

A \`Map\` rather than an object: \`Map\` doesn't coerce numeric keys to strings, doesn't trip over \`'constructor'\`, and gives honest O(1).

## Complexity and edge cases

- **Time:** O(n) — a single pass with amortised O(1) \`Map\` operations. **Memory:** O(n) — in the worst case the entire array ends up in the map.
- An empty array or a single element ⇒ the loop finds nothing and returns \`[]\`.
- No solution ⇒ \`[]\` (or \`null\` — clarify the contract; the prompt usually guarantees one).
- Duplicates: \`[3, 3]\` with \`target = 6\` → \`[0, 1]\`, thanks to the check-before-write order.
- Negative numbers and zero work with no changes — subtraction doesn't care about sign.
- The same element can't be used twice, which the same line ordering guarantees.
- Floats: \`0.1 + 0.2 !== 0.3\`, so exact matching may fail — clarify whether the input is integers.

## How to think out loud

> First I'd clarify: do we return indices or values, is exactly one solution guaranteed, and what should happen when no pair exists. The naive solution is two nested loops at O(n²), but it collapses to linear as soon as we remember what we've seen. So I create a \`Map\` of value → index and make a single pass. For each number I compute the complement \`target - x\` and ask the map whether it appeared earlier. If it did, I immediately return the pair of indices. If not, I store the current number and move on. It's crucial to check **before** writing, otherwise an element equal to half the target will find itself and get used twice. That gives O(n) time and O(n) memory — we trade memory for speed. Negative numbers and duplicates need no special handling at all.

## Follow-ups they'll ask

- **What if the array is sorted?** — two pointers from the ends: O(n) time and O(1) memory, no map needed.
- **How do you return all pairs, not just one?** — don't return on the first match, accumulate instead; you'll need careful dedup.
- **Why is the check before the write?** — otherwise an element finds itself whenever \`nums[i] * 2 === target\`.
- **Three Sum?** — sort, then an outer loop with two pointers inside, O(n²).
- **Why a \`Map\` and not an object?** — objects stringify keys and inherit prototype properties; \`Map\` is cleaner and more predictable.
- **What if there are millions of numbers and memory is tight?** — sort plus two pointers: O(n log n) time but O(1) extra memory, though you'd have to record indices before sorting.`
    },
    codeSnippet: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}

// twoSum([2, 7, 11, 15], 9); // [0, 1]`
  },
  {
    id: 'lc-031',
    category: 'live-coding',
    level: 'Medium',
    tags: ['parentheses', 'stack', 'algorithms'],
    question: {
      ru: 'Valid Parentheses: дана строка из скобок ()[]{}. Определите, корректно ли они сбалансированы (каждая открывающая закрыта парной и в правильном порядке). Пример: "([{}])" → true, "(]" → false.',
      en: 'Valid Parentheses: given a string of brackets ()[]{}. Decide whether they are correctly balanced (each opener closed by its matching pair in the right order). Example: "([{}])" → true, "(]" → false.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Проверить, что скобки в строке закрыты правильными парами и в правильном порядке. Структура данных здесь ровно одна и она напрашивается сама — **стек**. Последняя открытая скобка должна закрыться первой, а это и есть LIFO.

Аналогия: **стопка тарелок**. Каждая открывающая скобка — тарелка, которую вы кладёте сверху. Закрывающая — попытка снять верхнюю. Если сверху лежит не та тарелка, которую вы ждали, — порядок нарушен. А если в конце вечера в стопке что-то осталось, значит, кто-то не убрал за собой.

## Идея решения по шагам

1. Заводим словарь пар: \`const pairs = { '(': ')', '[': ']', '{': '}' }\` и пустой массив \`const stack = []\`.
2. Идём по строке через \`for...of\` — символ за символом.
3. Если символ **открывающий** (\`ch in pairs\`) — кладём в стек **не его самого, а ожидаемую закрывающую**: \`stack.push(pairs[ch])\`.
4. Если символ **закрывающий** — снимаем верх и сравниваем: \`if (stack.pop() !== ch) return false\`.
5. Всё остальное игнорируем.
6. В конце \`return stack.length === 0\` — пустой стек означает, что незакрытых не осталось.

## Разбор кода

Главный трюк — **класть в стек ожидаемую закрывающую скобку, а не открывающую**. Тогда на шаге сравнения не нужен второй словарь «закрывающая → открывающая» и не нужен \`if\` на три ветки: сравнение схлопывается в одну строчку \`stack.pop() !== ch\`.

\`stack.pop()\` на **пустом** стеке возвращает \`undefined\`, а \`undefined !== ')'\` — истина, и функция честно вернёт \`false\`. То есть случай «закрывающая пришла первой» обрабатывается бесплатно, без отдельной проверки \`stack.length === 0\`. Это тот самый неочевидный момент, который стоит проговорить вслух — иначе интервьюер решит, что вы его не заметили.

Проверка \`ch in pairs\` смотрит и по цепочке прототипов, но здесь это безопасно: символы всегда односимвольные, а \`'constructor'\` длиной в один символ не бывает. Строгий вариант — \`Object.hasOwn(pairs, ch)\` или объект через \`Object.create(null)\`.

Явное перечисление \`ch === ')' || ch === ']' || ch === '}'\` вместо \`else\` — сознательное решение: посторонние символы попадают в «ничего не делаем». Если по условию строка состоит только из скобок, ветку можно упростить до \`else\`.

Финальная проверка \`stack.length === 0\` ловит вторую половину ошибок: строка \`"((("\` не спотыкается ни на одном сравнении, но оставляет три невыполненных обязательства.

## Сложность и edge cases

- **Время:** O(n) — один проход, \`push\`/\`pop\` амортизированно O(1). **Память:** O(n) — в худшем случае (\`"((((("\`) в стеке окажется вся строка.
- Пустая строка ⇒ \`true\`: нарушать нечего.
- Закрывающая при пустом стеке (\`")("\`) ⇒ \`false\` благодаря \`undefined\` из \`pop()\`.
- Непустой стек в конце (\`"("\`) ⇒ \`false\`.
- Перепутанный порядок (\`"([)]"\`) ⇒ \`false\`: снимаем \`]\`, а пришла \`)\`.
- Одиночный символ ⇒ всегда \`false\`, кроме случая, когда это не скобка.
- Посторонние символы: здесь игнорируются — уточните, допустимы ли они вообще.
- Очень длинная строка: стек ограничен только памятью, рекурсию тут писать не стоит.

## Как рассуждать вслух

> Сначала уточню, могут ли в строке быть символы кроме скобок и что с ними делать. Задача на порядок вложенности, а любое «последним пришёл — первым ушёл» — это стек, поэтому беру массив и работаю с ним через \`push\` и \`pop\`. Хитрость, которая экономит код: на открывающую скобку я кладу в стек **не её, а ту закрывающую, которую жду**. Тогда на закрывающей достаточно снять верх и сравнить одним \`!==\`, без второго словаря. Приятный побочный эффект: если стек пуст, \`pop\` вернёт \`undefined\`, сравнение не сойдётся, и случай «закрывающая пришла первой» обработается сам. В конце проверяю, что стек пуст, — это ловит незакрытые скобки. Один проход, O(n) по времени и O(n) по памяти в худшем случае, когда вся строка состоит из открывающих.

## Follow-up, которые зададут

- **А если между скобками любые символы?** — просто игнорируем не-скобки, как в этом решении; логика не меняется.
- **Минимальное число вставок для баланса?** — вариация со счётчиками открытых и «долга» по закрывающим, тоже O(n).
- **Длина самой длинной корректной подстроки?** — стек **индексов** плюс база; тоже один проход.
- **Можно ли обойтись O(1) памяти?** — только для одного типа скобок (счётчик вместо стека); для трёх типов порядок вложенности без стека не восстановить.
- **Почему в стек кладём ожидаемую закрывающую?** — чтобы сравнение было одним \`!==\` и не требовало обратного словаря.
- **Что вернёт \`pop()\` на пустом стеке?** — \`undefined\`, и это как раз даёт корректный \`false\` без лишней проверки.
- **Как учесть кавычки или экранирование?** — это уже мини-парсер: нужен флаг «внутри строки», скобки внутри кавычек не считаются.`,
      en: `## In short: what they're asking for

Check that the brackets in a string are closed by matching pairs in the right order. There's exactly one data structure for this and it suggests itself — **a stack**. The last opened bracket must close first, and that is LIFO.

Analogy: **a stack of plates**. Every opening bracket is a plate you put on top. A closing bracket is an attempt to take the top one off. If the plate on top isn't the one you expected, the order is broken. And if anything is still stacked at the end of the evening, someone didn't clean up.

## The idea, step by step

1. Build a pair table: \`const pairs = { '(': ')', '[': ']', '{': '}' }\` and an empty \`const stack = []\`.
2. Walk the string with \`for...of\`, character by character.
3. If the character is an **opener** (\`ch in pairs\`), push **not the character itself but the closer you expect**: \`stack.push(pairs[ch])\`.
4. If it's a **closer**, pop the top and compare: \`if (stack.pop() !== ch) return false\`.
5. Ignore everything else.
6. At the end \`return stack.length === 0\` — an empty stack means nothing was left unclosed.

## Walking through the code

The key trick is **pushing the expected closer rather than the opener**. That way the comparison step needs no second "closer → opener" table and no three-way \`if\`: it collapses into the single line \`stack.pop() !== ch\`.

\`stack.pop()\` on an **empty** stack returns \`undefined\`, and \`undefined !== ')'\` is true, so the function correctly returns \`false\`. In other words, "a closer arrived first" is handled for free, without a separate \`stack.length === 0\` check. That's the non-obvious detail worth saying out loud — otherwise the interviewer assumes you missed it.

The \`ch in pairs\` check also walks the prototype chain, but that's safe here: characters are always single, and \`'constructor'\` is never one character long. The strict version is \`Object.hasOwn(pairs, ch)\` or an object made with \`Object.create(null)\`.

Spelling out \`ch === ')' || ch === ']' || ch === '}'\` instead of a plain \`else\` is deliberate: foreign characters fall into the "do nothing" case. If the prompt guarantees brackets only, the branch can be simplified to \`else\`.

The final \`stack.length === 0\` catches the other half of the failures: \`"((("\` never trips a comparison but leaves three unfulfilled promises.

## Complexity and edge cases

- **Time:** O(n) — one pass with amortised O(1) \`push\`/\`pop\`. **Memory:** O(n) — in the worst case (\`"((((("\`) the whole string sits on the stack.
- Empty string ⇒ \`true\`: there's nothing to violate.
- A closer with an empty stack (\`")("\`) ⇒ \`false\`, thanks to \`undefined\` from \`pop()\`.
- A non-empty stack at the end (\`"("\`) ⇒ \`false\`.
- Crossed order (\`"([)]"\`) ⇒ \`false\`: we pop \`]\` but received \`)\`.
- A single character ⇒ always \`false\`, unless it isn't a bracket at all.
- Foreign characters are ignored here — clarify whether they're allowed.
- A very long string: the stack is bounded only by memory, so don't write this recursively.

## How to think out loud

> First I'd clarify whether characters other than brackets can appear and what to do with them. This is a nesting-order problem, and anything "last in, first out" means a stack, so I take an array and use \`push\` and \`pop\`. The trick that saves code: on an opening bracket I push **not the bracket itself but the closer I'm expecting**. Then on a closing bracket I only need to pop the top and compare with a single \`!==\`, no reverse lookup table required. There's a nice side effect: if the stack is empty, \`pop\` returns \`undefined\`, the comparison fails, and the "a closer came first" case handles itself. At the end I check that the stack is empty, which catches unclosed brackets. One pass, O(n) time and O(n) memory in the worst case where the whole string is openers.

## Follow-ups they'll ask

- **What if any characters may appear between brackets?** — just ignore non-brackets, exactly as this solution does; the logic is unchanged.
- **Minimum insertions to balance?** — a variation with counters for open brackets and outstanding closers, also O(n).
- **Length of the longest valid substring?** — a stack of **indices** plus a base index; still one pass.
- **Can you do it in O(1) memory?** — only for a single bracket type (a counter instead of a stack); with three types you can't reconstruct nesting order without a stack.
- **Why push the expected closer?** — so the comparison is a single \`!==\` and needs no reverse table.
- **What does \`pop()\` return on an empty stack?** — \`undefined\`, which is exactly what produces the correct \`false\` with no extra check.
- **How would you handle quotes or escaping?** — that's a mini parser: you need an "inside a string" flag so brackets in quotes don't count.`
    },
    codeSnippet: `function isValid(s) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (const ch of s) {
    if (ch in pairs) {
      stack.push(pairs[ch]);
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.pop() !== ch) return false;
    }
  }
  return stack.length === 0;
}

// isValid('([{}])'); // true
// isValid('(]');     // false`
  },
  {
    id: 'lc-032',
    category: 'live-coding',
    level: 'Hard',
    tags: ['autocomplete', 'debounce', 'cancellation'],
    question: {
      ru: 'Реализуйте typeahead/autocomplete: при вводе делается запрос к API, но запросы дебаунсятся, а устаревшие (race condition) отменяются, чтобы не показать результат старого запроса поверх нового. Используйте AbortController.',
      en: 'Implement a typeahead/autocomplete: each keystroke queries an API, but requests are debounced, and stale ones (race conditions) are canceled so an old response never overwrites a newer one. Use AbortController.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Поисковая подсказка: пользователь печатает — мы ходим в API. Проверяют не умение вызвать \`fetch\`, а понимание **трёх защит**: дебаунс (не слать запрос на каждую букву), отмена через \`AbortController\` (не тратить сеть на устаревшее) и **счётчик поколений** (не отрисовать старый ответ поверх нового).

Аналогия: **официант и кухня**. Дебаунс — не бежать на кухню, пока гость ещё листает меню. \`abort\` — отозвать заказ, если гость передумал. Номер заказа (\`seq\`) — на случай, если старое блюдо всё-таки доехало до зала: смотрим на номерок и не ставим его на стол.

## Идея решения по шагам

1. Замыкаем три переменные: \`timer\` (id таймаута), \`controller\` (текущий \`AbortController\`) и \`seq\` (счётчик запросов, растёт монотонно).
2. Возвращаем функцию \`onInput(query)\` — её вешают на событие ввода.
3. На каждом вводе первым делом гасим старое: \`clearTimeout(timer)\` и \`if (controller) controller.abort()\`.
4. Если строка пустая (\`!query.trim()\`) — \`render([])\` и выходим, запрос не нужен.
5. Ставим таймер на \`wait\` мс. Внутри: создаём новый \`controller\`, берём номер поколения \`const current = ++seq\`.
6. \`await fetchResults(query, controller.signal)\`, и рисуем только если \`current === seq\`, то есть за время ответа не появился запрос новее.
7. В \`catch\` отличаем настоящую ошибку от отмены: \`if (err.name !== 'AbortError') render([], err)\`.

## Разбор кода

Три защиты решают **три разные** проблемы, и это главное, что нужно проговорить. Дебаунс режет **количество** запросов. \`abort\` экономит **сеть и сервер**, убивая заведомо ненужное. \`seq\` защищает **UI** — на случай, когда ответ уже улетел из сети в микротаску и отменить его поздно.

\`clearTimeout(timer)\` и \`controller.abort()\` стоят **до** проверки на пустую строку. Порядок важен: очищая поле, пользователь должен и увидеть пустой список, и остановить летящий запрос — иначе через секунду подсказки вернутся в пустое поле.

\`const current = ++seq\` — снимок поколения, захваченный замыканием конкретного вызова. Когда \`await\` разрешится, глобальный \`seq\` мог уже уйти вперёд; сравнение \`current === seq\` и есть «мой ли это ответ». Обратите внимание: \`seq\` инкрементируется внутри таймаута, а не при вводе, — считаем реально отправленные запросы.

\`err.name !== 'AbortError'\` обязателен: прерванный \`fetch\` **реджектит** промис, и без этой проверки пользователь на каждое нажатие видел бы сообщение об ошибке.

\`controller\` создаётся внутри таймаута, а не снаружи: раньше он просто не нужен, а лишние объекты на каждую букву создавать незачем.

Возврат функции из \`createTypeahead\` — обычное замыкание: состояние живёт между вызовами, но снаружи недоступно, и на странице можно завести несколько независимых полей поиска.

## Сложность и edge cases

- **Время:** O(1) на нажатие клавиши — вся работа сводится к паре присваиваний плюс сетевой запрос. **Память:** O(1) — три переменные в замыкании независимо от объёма ввода.
- Пустой ввод и ввод из одних пробелов ⇒ отменяем запрос и чистим список.
- \`AbortError\` ловим и **не** показываем как ошибку.
- Быстрая печать: летит ровно один запрос — после паузы в \`wait\` мс.
- Гонка после дебаунса: два запроса всё же ушли, ответы вернулись в обратном порядке — спасает \`seq\`.
- Пользователь стёр всё, пока запрос летел ⇒ \`abort\` плюс \`render([])\`.
- Размонтирование компонента ⇒ нужен внешний \`cleanup\`, который вызовет \`clearTimeout\` и \`abort\` (в этой версии его нет — стоит упомянуть).
- Кеш одинаковых запросов — необязательная, но приятная оптимизация поверх.

## Как рассуждать вслух

> Сначала уточню задержку дебаунса и минимальную длину запроса. Дальше проговорю, что здесь три независимые проблемы. Первая — слишком много запросов, её решает дебаунс: сбрасываю таймер на каждом вводе и стреляю только после паузы. Вторая — устаревшие запросы висят в сети, их убиваю \`AbortController\`: перед новым запросом вызываю \`abort\` у предыдущего. Третья, самая коварная, — гонка: ответ мог уже прийти, и отменять поздно, поэтому веду счётчик поколений, запоминаю номер в замыкании и после \`await\` рисую, только если номер всё ещё актуален. Отдельно ловлю \`AbortError\` и не показываю его пользователю — это не ошибка, а наше собственное решение. Пустой ввод обрабатываю сразу: отменяю запрос и чищу список. Стоимость O(1) на нажатие плюс сама сеть.

## Follow-up, которые зададут

- **Почему недостаточно одного дебаунса?** — даже после паузы уходят два запроса, и ответы могут вернуться в обратном порядке; нужна отмена или версионирование.
- **Почему одного \`abort\` мало?** — если ответ уже получен и разбирается, отмена ничего не даст; \`seq\` — вторая линия обороны.
- **Чем это отличается от throttle?** — throttle шлёт равномерно во время печати, дебаунс — один раз после паузы; для поиска нужен дебаунс.
- **Как это выглядит в RxJS?** — \`debounceTime\` плюс \`switchMap\`: \`switchMap\` сам отписывается от предыдущего запроса, заменяя и \`abort\`, и \`seq\`.
- **Как добавить кеш?** — \`Map\` по строке запроса; при попадании рисуем мгновенно и не идём в сеть, но нужна инвалидация.
- **Что с очисткой при размонтировании?** — вернуть из фабрики \`cancel()\`, который делает \`clearTimeout\` и \`abort\`, и звать его в \`ngOnDestroy\`/\`useEffect cleanup\`.
- **Как показать состояние загрузки?** — флаг вокруг \`await\`, но сбрасывать его тоже нужно только для актуального поколения.`,
      en: `## In short: what they're asking for

A search suggestion box: the user types, we hit an API. They're not testing whether you can call \`fetch\` — they're testing whether you know the **three defences**: debouncing (don't fire on every keystroke), cancellation via \`AbortController\` (don't waste the network on stale work), and a **generation counter** (never render an old response over a newer one).

Analogy: **a waiter and a kitchen**. Debounce is not running to the kitchen while the guest is still browsing the menu. \`abort\` is cancelling the order when they change their mind. The ticket number (\`seq\`) is for when an old dish reaches the floor anyway: you check the number and don't put it on the table.

## The idea, step by step

1. Close over three variables: \`timer\` (the timeout id), \`controller\` (the current \`AbortController\`) and \`seq\` (a monotonically growing request counter).
2. Return an \`onInput(query)\` function to attach to the input event.
3. On every keystroke, kill the old work first: \`clearTimeout(timer)\` and \`if (controller) controller.abort()\`.
4. If the query is blank (\`!query.trim()\`), \`render([])\` and return — no request needed.
5. Schedule a timer for \`wait\` ms. Inside it, create a fresh \`controller\` and take a generation snapshot \`const current = ++seq\`.
6. \`await fetchResults(query, controller.signal)\`, and render only if \`current === seq\`, i.e. no newer request appeared while we waited.
7. In \`catch\`, distinguish a real failure from a cancellation: \`if (err.name !== 'AbortError') render([], err)\`.

## Walking through the code

The three defences solve **three different** problems, and that's the key thing to articulate. Debounce cuts the **number** of requests. \`abort\` saves **network and server** by killing work that's already pointless. \`seq\` protects the **UI**, for when the response has already left the network and reached a microtask, too late to cancel.

\`clearTimeout(timer)\` and \`controller.abort()\` come **before** the blank-query check. That ordering matters: clearing the field should both empty the list and stop the in-flight request — otherwise suggestions pop back into an empty box a second later.

\`const current = ++seq\` is a generation snapshot captured by that specific call's closure. By the time the \`await\` settles, the shared \`seq\` may have moved on; comparing \`current === seq\` is exactly the question "is this response still mine?". Note that \`seq\` is incremented inside the timeout, not on input — we count requests actually sent.

\`err.name !== 'AbortError'\` is mandatory: an aborted \`fetch\` **rejects** its promise, and without this check the user would see an error message on every keystroke.

\`controller\` is created inside the timeout rather than outside: it isn't needed earlier, and there's no point allocating an object per character typed.

Returning a function from \`createTypeahead\` is a plain closure: state lives between calls but stays private, and you can have several independent search boxes on one page.

## Complexity and edge cases

- **Time:** O(1) per keystroke — the work is a couple of assignments plus the network call. **Memory:** O(1) — three closure variables regardless of input volume.
- Blank input or whitespace-only input ⇒ cancel the request and clear the list.
- Catch \`AbortError\` and do **not** surface it as an error.
- Fast typing: exactly one request goes out, after a \`wait\` ms pause.
- A race after debouncing: two requests did go out and came back out of order — \`seq\` saves you.
- The user clears the field mid-flight ⇒ \`abort\` plus \`render([])\`.
- Component unmount ⇒ you need an external \`cleanup\` calling \`clearTimeout\` and \`abort\` (this version lacks one — worth mentioning).
- Caching identical queries is an optional but welcome optimisation on top.

## How to think out loud

> First I'd clarify the debounce delay and the minimum query length. Then I'd point out that there are three independent problems here. The first is too many requests, solved by debouncing: I reset the timer on every keystroke and only fire after a pause. The second is stale requests still in flight, killed with \`AbortController\`: before each new request I abort the previous one. The third, the sneaky one, is the race — the response may already have arrived, too late to cancel — so I keep a generation counter, snapshot the number in the closure, and after the \`await\` I render only if that number is still current. I also catch \`AbortError\` specifically and never show it to the user, because it isn't a failure, it's our own decision. Blank input is handled immediately: cancel and clear the list. The cost is O(1) per keystroke plus the network itself.

## Follow-ups they'll ask

- **Why isn't debouncing alone enough?** — even after a pause two requests go out, and they can resolve out of order; you need cancellation or versioning.
- **Why isn't \`abort\` alone enough?** — if the response has already been received and is being parsed, cancelling does nothing; \`seq\` is the second line of defence.
- **How does this differ from throttling?** — throttle fires at a steady rate while typing, debounce fires once after a pause; search wants debounce.
- **What does this look like in RxJS?** — \`debounceTime\` plus \`switchMap\`: \`switchMap\` unsubscribes from the previous request itself, replacing both \`abort\` and \`seq\`.
- **How would you add caching?** — a \`Map\` keyed by query string; on a hit render instantly and skip the network, though you'll need invalidation.
- **What about cleanup on unmount?** — return a \`cancel()\` from the factory that does \`clearTimeout\` and \`abort\`, and call it from \`ngOnDestroy\`/\`useEffect\` cleanup.
- **How do you show a loading state?** — a flag around the \`await\`, but it must also be cleared only for the current generation.`
    },
    codeSnippet: `function createTypeahead(fetchResults, render, wait = 300) {
  let timer = null;
  let controller = null;
  let seq = 0;

  return function onInput(query) {
    clearTimeout(timer);
    if (controller) controller.abort();

    if (!query.trim()) {
      render([]);
      return;
    }

    timer = setTimeout(async () => {
      controller = new AbortController();
      const current = ++seq;
      try {
        const results = await fetchResults(query, controller.signal);
        if (current === seq) render(results); // ignore stale
      } catch (err) {
        if (err.name !== 'AbortError') render([], err);
      }
    }, wait);
  };
}`
  },
  {
    id: 'lc-033',
    category: 'live-coding',
    level: 'Hard',
    tags: ['lru-cache', 'data-structures', 'map'],
    question: {
      ru: 'Реализуйте LRU Cache с операциями get(key) и put(key, value) за O(1). При достижении capacity вытесняется наименее недавно использованный элемент. Подсказка: используйте свойство порядка Map.',
      en: 'Implement an LRU Cache with O(1) get(key) and put(key, value). When capacity is reached, evict the least-recently-used entry. Hint: exploit the ordering property of Map.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Кэш фиксированного размера, у которого и чтение, и запись работают за O(1), а при переполнении выбрасывается тот элемент, к которому дольше всего не обращались. Классический ответ — хеш-таблица плюс двусвязный список, но в JS есть читерский приём: **\`Map\` уже хранит ключи в порядке вставки**, и этого достаточно.

Аналогия: **стопка бумаг на столе**. Взяли лист — положили обратно **наверх**. Когда стол переполнен, в мусор идёт самый нижний лист, до которого никто не дотягивался дольше всех.

## Идея решения по шагам

1. В конструкторе сохраняем \`this.capacity\` и заводим \`this.map = new Map()\`. Инвариант: **первый ключ в \`Map\` — самый старый, последний — самый свежий**.
2. \`get(key)\`: если ключа нет — сразу \`undefined\`, порядок не трогаем.
3. Ключ есть — читаем значение, потом \`delete(key)\` и снова \`set(key, value)\`. Пара «удалить + вставить» перекладывает ключ в конец, то есть делает его самым свежим.
4. Возвращаем значение.
5. \`put(key, value)\`: если ключ уже есть — \`delete\` (иначе \`set\` обновит значение, но **не сдвинет** позицию).
6. \`set(key, value)\` — ключ становится самым свежим.
7. Проверяем переполнение: \`if (this.map.size > this.capacity)\` берём самый старый ключ \`this.map.keys().next().value\` и удаляем его.

## Разбор кода

Вся конструкция держится на одном свойстве: **\`Map\` итерируется в порядке вставки**, и \`set\` существующего ключа этот порядок **не меняет**. Отсюда обязательная пара \`delete\` + \`set\`: без \`delete\` значение обновится, но ключ так и останется «старым» и будет вытеснен раньше времени. Это самая частая ошибка в этой задаче.

\`this.map.keys().next().value\` — способ достать первый ключ, не материализуя весь массив ключей. \`keys()\` возвращает **ленивый** итератор, \`next()\` дёргает ровно один элемент. Написать \`[...this.map.keys()][0]\` — та же семантика, но O(n) на каждое вытеснение, что убивает обещанный O(1).

Проверка \`size > capacity\` идёт **после** вставки, а не до. Это упрощает логику: мы позволяем себе на мгновение превысить лимит на единицу и тут же убираем лишнее. Побочный эффект — при \`capacity = 0\` вставленный элемент немедленно вытесняет сам себя, и кэш честно остаётся пустым.

В \`get\` отсутствующий ключ возвращает \`undefined\` и **не трогает порядок** — промах не должен считаться обращением. В формулировке LeetCode ждут \`-1\`; уточните контракт, а заодно упомяните, что \`undefined\` неотличим от реально сохранённого \`undefined\` — если это важно, надёжнее \`has\`.

Канонический вариант с двусвязным списком и хеш-таблицей делает ровно то же самое: список хранит порядок, таблица даёт доступ к узлу за O(1). \`Map\` просто прячет этот список внутри движка — стоит сказать вслух, что вы знаете и «ручную» реализацию.

## Сложность и edge cases

- **Время:** O(1) амортизированно на \`get\` и \`put\` — \`has\`, \`get\`, \`delete\`, \`set\` и взятие первого ключа через итератор все константны. **Память:** O(capacity).
- \`get\` несуществующего ключа ⇒ \`undefined\` (или \`-1\` по условию LeetCode) и порядок не меняется.
- \`put\` существующего ключа обновляет значение **и** освежает позицию.
- \`capacity = 0\` ⇒ кэш всегда пуст: элемент вытесняет сам себя.
- \`capacity = 1\` ⇒ каждый новый \`put\` вытесняет предыдущий.
- Ключ \`NaN\` работает (\`Map\` использует \`SameValueZero\`), объекты как ключи сравниваются по ссылке.
- Хранимое значение \`undefined\` неотличимо от промаха — при необходимости возвращайте \`{ hit, value }\`.
- Отрицательная или дробная \`capacity\` — стоит валидировать в конструкторе.

## Как рассуждать вслух

> Сначала уточню контракт: что возвращать при промахе и считается ли \`put\` существующего ключа обращением. Дальше скажу, что канонический ответ — двусвязный список плюс хеш-таблица, но в JS я возьму \`Map\`, потому что она уже хранит ключи в порядке вставки и даёт мне готовый список «от старого к свежему» бесплатно. Держу инвариант: первый ключ — самый давно не используемый, последний — самый свежий. Тогда «использование» — это \`delete\` и повторный \`set\`, и обязательно именно в таком порядке, потому что \`set\` существующего ключа значение обновит, а позицию не сдвинет. При переполнении беру первый ключ через \`keys().next().value\` — это ленивый итератор, а не копия всех ключей, иначе O(1) превратился бы в O(n). Обе операции константные, память O(capacity).

## Follow-up, которые зададут

- **Почему \`Map\`, а не объект?** — объект не гарантирует порядок (целочисленные ключи всплывают наверх) и приводит ключи к строкам; \`Map\` даёт порядок вставки и честный O(1) \`delete\`.
- **Как это выглядит без \`Map\`?** — двусвязный список для порядка плюс хеш-таблица «ключ → узел»; \`Map\` просто прячет этот список внутри.
- **Почему \`delete\` перед \`set\`?** — \`set\` существующего ключа обновляет значение, но оставляет его на прежней позиции, и вытеснение сработает неправильно.
- **Почему нельзя \`[...map.keys()][0]\`?** — это копирование всех ключей, O(n) на каждое вытеснение вместо O(1).
- **Как сделать LFU?** — нужен счётчик обращений и корзины по частотам, структура заметно сложнее.
- **Как добавить TTL?** — хранить \`{ value, expiresAt }\` и проверять срок в \`get\`, считая просроченное промахом.
- **Потокобезопасность / многовкладочность?** — в одном JS-потоке проблемы нет; для нескольких вкладок нужен общий слой хранения и синхронизация.
- **Считается ли \`put\` обращением?** — да, в стандартной семантике LRU запись тоже освежает элемент.`,
      en: `## In short: what they're asking for

A fixed-size cache where both reads and writes are O(1), and on overflow the entry untouched for the longest time gets evicted. The textbook answer is a hash map plus a doubly linked list, but JavaScript offers a shortcut: **a \`Map\` already keeps keys in insertion order**, and that's all you need.

Analogy: **a stack of papers on a desk**. Pick a sheet up, put it back **on top**. When the desk overflows, the bin gets the bottom sheet — the one nobody has reached for in the longest time.

## The idea, step by step

1. In the constructor store \`this.capacity\` and create \`this.map = new Map()\`. The invariant: **the first key in the \`Map\` is the oldest, the last one is the freshest**.
2. \`get(key)\`: if the key is absent, return \`undefined\` immediately and leave the order alone.
3. If it's present, read the value, then \`delete(key)\` and \`set(key, value)\` again. The delete-plus-insert pair moves the key to the end, making it the most recent.
4. Return the value.
5. \`put(key, value)\`: if the key already exists, \`delete\` it first (otherwise \`set\` updates the value but does **not** move the position).
6. \`set(key, value)\` — the key becomes the freshest.
7. Check for overflow: \`if (this.map.size > this.capacity)\` take the oldest key via \`this.map.keys().next().value\` and delete it.

## Walking through the code

The whole design rests on one property: **a \`Map\` iterates in insertion order**, and \`set\` on an existing key does **not** change that order. Hence the mandatory \`delete\` + \`set\` pair: without the \`delete\` the value updates but the key stays "old" and gets evicted prematurely. That's the most common bug in this task.

\`this.map.keys().next().value\` grabs the first key without materialising the whole key list. \`keys()\` returns a **lazy** iterator and \`next()\` pulls exactly one element. Writing \`[...this.map.keys()][0]\` has the same semantics but costs O(n) per eviction, which destroys the promised O(1).

The \`size > capacity\` check happens **after** the insert, not before. That simplifies the logic: we briefly allow one entry over the limit and immediately trim it. A neat side effect is that with \`capacity = 0\` the inserted entry instantly evicts itself and the cache honestly stays empty.

In \`get\`, a missing key returns \`undefined\` and **doesn't touch the order** — a miss shouldn't count as a use. The LeetCode phrasing expects \`-1\`; clarify the contract, and mention that \`undefined\` is indistinguishable from a genuinely stored \`undefined\` — if that matters, \`has\` is safer.

The canonical linked-list version does exactly the same job: the list holds the order, the hash map gives O(1) access to a node. A \`Map\` just hides that list inside the engine — say out loud that you also know the manual implementation.

## Complexity and edge cases

- **Time:** O(1) amortised for \`get\` and \`put\` — \`has\`, \`get\`, \`delete\`, \`set\` and pulling the first key from the iterator are all constant. **Memory:** O(capacity).
- \`get\` of a missing key ⇒ \`undefined\` (or \`-1\` per LeetCode) with no order change.
- \`put\` of an existing key updates the value **and** refreshes its position.
- \`capacity = 0\` ⇒ the cache is always empty: the entry evicts itself.
- \`capacity = 1\` ⇒ every new \`put\` evicts the previous one.
- A \`NaN\` key works (\`Map\` uses \`SameValueZero\`); object keys compare by reference.
- A stored \`undefined\` is indistinguishable from a miss — return \`{ hit, value }\` if that matters.
- A negative or fractional \`capacity\` is worth validating in the constructor.

## How to think out loud

> First I'd clarify the contract: what to return on a miss, and whether a \`put\` of an existing key counts as a use. Then I'd say the canonical answer is a doubly linked list plus a hash map, but in JavaScript I'll take a \`Map\`, because it already stores keys in insertion order and hands me an oldest-to-newest list for free. I keep the invariant that the first key is the least recently used and the last one is the freshest. Then "using" an entry means \`delete\` followed by \`set\`, in exactly that order, because \`set\` on an existing key updates the value but leaves the position untouched. On overflow I take the first key with \`keys().next().value\` — a lazy iterator rather than a copy of every key, otherwise the O(1) would silently become O(n). Both operations are constant time, memory is O(capacity).

## Follow-ups they'll ask

- **Why a \`Map\` and not an object?** — objects don't guarantee order (integer-like keys float to the top) and coerce keys to strings; \`Map\` gives insertion order and a genuine O(1) \`delete\`.
- **What does this look like without \`Map\`?** — a doubly linked list for order plus a hash map from key to node; \`Map\` merely hides that list internally.
- **Why \`delete\` before \`set\`?** — \`set\` on an existing key updates the value but keeps its old position, so eviction picks the wrong entry.
- **Why not \`[...map.keys()][0]\`?** — that copies every key, O(n) per eviction instead of O(1).
- **How would you make it LFU?** — you need access counters and frequency buckets; the structure gets noticeably more complex.
- **How would you add a TTL?** — store \`{ value, expiresAt }\` and check expiry in \`get\`, treating expired entries as misses.
- **Thread safety / multiple tabs?** — a single JS thread has no issue; across tabs you need a shared storage layer and synchronisation.
- **Does \`put\` count as a use?** — yes, in standard LRU semantics a write refreshes the entry too.`
    },
    codeSnippet: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value); // mark as most recently used
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}`
  },
  {
    id: 'lc-034',
    category: 'live-coding',
    level: 'Medium',
    tags: ['fibonacci', 'memoization', 'dynamic-programming'],
    question: {
      ru: 'Вычислите n-е число Фибоначчи. Покажите три подхода: наивная рекурсия, рекурсия с мемоизацией, итеративный O(1) по памяти. Объясните разницу в сложности.',
      en: 'Compute the n-th Fibonacci number. Show three approaches: naive recursion, memoized recursion, and an iterative O(1)-space one. Explain the complexity differences.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Формально — n-е число Фибоначчи, фактически — **демонстрация эволюции от экспоненты к линии**. Ждут, что вы покажете три версии и внятно объясните, почему наивная рекурсия катастрофически медленная, а две другие нет.

Аналогия: наивная рекурсия — это студент, который на каждый вопрос заново выводит всю теорему с нуля, включая куски, выведенные пять минут назад. Мемоизация — **тетрадка с решёнными задачами**: посмотрел, нашёл, списал у себя же. Итеративный вариант — тот, кто понял, что для ответа нужны всего **две последние строчки**, и тетрадь ему вообще не нужна.

## Идея решения по шагам

**Наивная рекурсия (только назвать, не писать):**
1. \`if (n < 2) return n\`, иначе \`fib(n-1) + fib(n-2)\`.
2. Проблема: дерево вызовов раздваивается на каждом уровне, \`fib(n-3)\` считается снова и снова.

**Мемоизация:**
1. Заводим кэш: параметр \`memo = new Map()\` со значением по умолчанию.
2. База: \`if (n < 2) return n\`.
3. Попадание в кэш: \`if (memo.has(n)) return memo.get(n)\` — на этой строке отсекается вся дублирующая часть дерева.
4. Считаем \`fibMemo(n-1, memo) + fibMemo(n-2, memo)\`, **прокидывая тот же \`memo\`**.
5. Сохраняем \`memo.set(n, value)\` и возвращаем.

**Итеративно, O(1) по памяти:**
1. \`let [a, b] = [0, 1]\` — \`a\` это \`fib(i)\`, \`b\` это \`fib(i+1)\`.
2. Крутим цикл \`n\` раз, на каждом шаге сдвигая окно: \`[a, b] = [b, a + b]\`.
3. Возвращаем \`a\`.

## Разбор кода

В \`fibMemo\` кэш — **параметр**, а не переменная снаружи. Плюс: функция остаётся чистой, каждый внешний вызов начинает с пустой тетрадки. Минус: между разными вызовами кэш не переиспользуется. Именно поэтому \`memo\` обязательно передавать в оба рекурсивных вызова — забыть про это классическая ошибка, после которой мемоизация просто перестаёт работать, а код выглядит правильным.

\`memo.has(n)\` вместо \`if (memo.get(n))\` — принципиально: \`fib(0) === 0\`, а \`0\` ложен, и проверка через значение отправила бы нас пересчитывать нулевой случай бесконечно.

Порядок строк в мемо-версии стандартен для любой мемоизации: **база → проверка кэша → вычисление → запись в кэш**. Этот скелет одинаков для всех задач динамического программирования, его стоит держать в голове как шаблон.

В итеративной версии \`[a, b] = [b, a + b]\` — деструктуризация массива, и она работает потому, что **правая часть вычисляется целиком до присваивания**. Без неё пришлось бы заводить временную переменную: \`const t = a + b; a = b; b = t;\`. Разница только в читаемости.

Цикл выполняется ровно \`n\` раз, и возвращается \`a\`, а не \`b\`. Проверьте на \`n = 0\`: цикл не выполнится ни разу, вернётся \`a = 0\`. При \`n = 1\` один шаг даёт \`a = 1\`. База обрабатывается сама, отдельных \`if\` не нужно.

## Сложность и edge cases

- **Наивно:** время O(2ⁿ) (точнее O(φⁿ) ≈ 1.618ⁿ), память O(n) на стек. Уже при n ≈ 45 это секунды.
- **Мемо:** время O(n) — каждое значение считается ровно один раз; память O(n) на кэш плюс O(n) на стек.
- **Итеративно:** время O(n), память O(1) — храним всего два числа. Это и есть эталонный ответ.
- \`n = 0\` → 0, \`n = 1\` → 1 — база покрыта во всех вариантах.
- Отрицательный \`n\`: в итеративной версии цикл не выполнится и вернётся \`0\`; корректнее бросить ошибку — уточните контракт.
- Точность: с \`fib(79)\` результат превышает \`Number.MAX_SAFE_INTEGER\` и становится приблизительным. Нужны точные значения — \`BigInt\` (\`0n\`, \`1n\`).
- Большое \`n\` в рекурсивной версии (порядка десятков тысяч) уронит стек — \`Maximum call stack size exceeded\`; итеративная версия к этому невосприимчива.

## Как рассуждать вслух

> Уточню, нужны ли большие \`n\`: от этого зависит, хватит ли обычного \`Number\` или потребуется \`BigInt\`. Наивная рекурсия читается как определение, но работает за экспоненту: дерево вызовов пересчитывает одни и те же подзадачи. Первое лечение — мемоизация: завожу кэш, при входе проверяю его, при выходе записываю результат. Каждое значение считается ровно один раз, получается O(n) по времени, но O(n) по памяти на кэш и стек. Дальше замечу, что для \`fib(n)\` нужны только два предыдущих числа, а не вся таблица, поэтому перехожу к итеративной версии: держу два числа и на каждом шаге сдвигаю окно через деструктуризацию. Это O(n) по времени и O(1) по памяти, и стек не переполнится. Отдельно упомяну потерю точности примерно с 79-го числа.

## Follow-up, которые зададут

- **Почему наивная версия экспоненциальна?** — дерево вызовов раздваивается на каждом уровне и пересчитывает одни и те же подзадачи; мемоизация схлопывает дубли.
- **Можно ли быстрее O(n)?** — да: матричное возведение в степень или формула Бине дают O(log n), но у Бине проблемы с точностью на больших \`n\`.
- **Чем мемоизация отличается от табуляции?** — мемоизация идёт сверху вниз и ленива, табуляция снизу вверх и без рекурсии; итеративный вариант — это и есть табуляция, свёрнутая до двух переменных.
- **Почему \`memo.has\`, а не \`if (memo.get(n))\`?** — \`fib(0)\` равен нулю, а ноль ложен, и проверка по значению сломалась бы на базовом случае.
- **Что будет на очень больших \`n\` в рекурсии?** — переполнение стека; спасают итерация или трамплин.
- **Как получить точные большие числа?** — \`BigInt\`: начинать с \`[0n, 1n]\`, арифметика та же.
- **Почему кэш это параметр, а не внешняя переменная?** — функция остаётся чистой; если нужен общий кэш между вызовами, поднимите \`Map\` в замыкание.
- **Нужно вернуть всю последовательность?** — тогда O(n) памяти неизбежны, и логичнее табуляция в массив.`,
      en: `## In short: what they're asking for

Formally, the n-th Fibonacci number; in practice, **a demonstration of the journey from exponential to linear**. They expect you to show three versions and explain clearly why the naive recursion is catastrophically slow while the other two aren't.

Analogy: naive recursion is the student who re-derives an entire theorem from scratch for every question, including the parts derived five minutes ago. Memoization is **a notebook of solved problems**: look it up, copy from your own past self. The iterative version is the student who realised the answer needs only **the last two lines**, and doesn't need a notebook at all.

## The idea, step by step

**Naive recursion (mention it, don't write it):**
1. \`if (n < 2) return n\`, otherwise \`fib(n-1) + fib(n-2)\`.
2. The problem: the call tree branches at every level, and \`fib(n-3)\` is recomputed over and over.

**Memoized:**
1. Create the cache as a default parameter: \`memo = new Map()\`.
2. Base case: \`if (n < 2) return n\`.
3. Cache hit: \`if (memo.has(n)) return memo.get(n)\` — this single line prunes the entire duplicated half of the tree.
4. Compute \`fibMemo(n-1, memo) + fibMemo(n-2, memo)\`, **passing the same \`memo\` down**.
5. Store with \`memo.set(n, value)\` and return.

**Iterative, O(1) memory:**
1. \`let [a, b] = [0, 1]\` — \`a\` is \`fib(i)\`, \`b\` is \`fib(i+1)\`.
2. Loop \`n\` times, sliding the window each step: \`[a, b] = [b, a + b]\`.
3. Return \`a\`.

## Walking through the code

In \`fibMemo\` the cache is a **parameter**, not an outer variable. Upside: the function stays pure and every top-level call starts with a blank notebook. Downside: the cache isn't reused across separate calls. That's exactly why \`memo\` must be passed into both recursive calls — forgetting it is the classic bug that silently disables memoization while the code still looks right.

\`memo.has(n)\` rather than \`if (memo.get(n))\` matters: \`fib(0) === 0\`, and \`0\` is falsy, so a value-based check would send us recomputing the zero case forever.

The line order in the memoized version is standard for any memoization: **base case → cache check → compute → write to cache**. That skeleton is identical across dynamic-programming problems and is worth keeping in your head as a template.

In the iterative version \`[a, b] = [b, a + b]\` is array destructuring, and it works because **the right-hand side is evaluated completely before assignment**. Without it you'd need a temporary: \`const t = a + b; a = b; b = t;\`. The only difference is readability.

The loop runs exactly \`n\` times and returns \`a\`, not \`b\`. Check it against \`n = 0\`: the loop never runs and returns \`a = 0\`. For \`n = 1\` a single step gives \`a = 1\`. The base cases take care of themselves, no extra \`if\` needed.

## Complexity and edge cases

- **Naive:** O(2ⁿ) time (more precisely O(φⁿ) ≈ 1.618ⁿ), O(n) stack memory. At n ≈ 45 that's already seconds.
- **Memoized:** O(n) time — each value is computed exactly once; O(n) memory for the cache plus O(n) for the stack.
- **Iterative:** O(n) time, O(1) memory — just two numbers. This is the answer they're after.
- \`n = 0\` → 0, \`n = 1\` → 1 — the base case is covered in every version.
- Negative \`n\`: the iterative loop never runs and returns \`0\`; throwing is cleaner — clarify the contract.
- Precision: from \`fib(79)\` the result exceeds \`Number.MAX_SAFE_INTEGER\` and becomes approximate. For exact values use \`BigInt\` (\`0n\`, \`1n\`).
- Large \`n\` in the recursive version (tens of thousands) blows the stack with \`Maximum call stack size exceeded\`; the iterative version is immune.

## How to think out loud

> I'd check whether large \`n\` matters, since that decides whether a plain \`Number\` is enough or we need \`BigInt\`. I'd start with the naive recursion just to talk about it: it reads exactly like the definition, but it runs in exponential time because the call tree recomputes the same subproblems tens of thousands of times. The first fix is memoization: keep a cache, check it on entry, write the result on exit. Then every value is computed exactly once, which gives O(n) time but O(n) memory for the cache plus the stack. Next I'd point out that \`fib(n)\` only needs the two previous numbers, not the whole table, so I move to the iterative version: hold two numbers and slide the window each step with destructuring. That's O(n) time and O(1) memory, with no stack to overflow. I'd also mention the precision loss starting around the 79th number.

## Follow-ups they'll ask

- **Why is the naive version exponential?** — the call tree branches at every level and recomputes identical subproblems; memoization collapses the duplicates.
- **Can you beat O(n)?** — yes: matrix exponentiation or Binet's formula give O(log n), though Binet's loses precision at large \`n\`.
- **How does memoization differ from tabulation?** — memoization is top-down and lazy, tabulation is bottom-up without recursion; the iterative version is tabulation collapsed to two variables.
- **Why \`memo.has\` instead of \`if (memo.get(n))\`?** — \`fib(0)\` is zero, and zero is falsy, so a value check would break on the base case.
- **What happens at very large \`n\` in the recursive version?** — a stack overflow; iteration or a trampoline fixes it.
- **How do you get exact large numbers?** — \`BigInt\`: start from \`[0n, 1n]\`, the arithmetic is unchanged.
- **Why is the cache a parameter rather than an outer variable?** — it keeps the function pure; if you want a shared cache across calls, lift the \`Map\` into a closure.
- **What if you need the whole sequence?** — then O(n) memory is unavoidable and tabulating into an array is the natural choice.`
    },
    codeSnippet: `// memoized
function fibMemo(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}

// iterative O(1) space
function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}`
  },
  {
    id: 'lc-035',
    category: 'live-coding',
    level: 'Medium',
    tags: ['anagram', 'hash-map', 'strings'],
    question: {
      ru: 'Group Anagrams: дан массив строк, сгруппируйте анаграммы (слова из одинаковых букв). Пример: ["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"],["tan","nat"],["bat"]].',
      en: 'Group Anagrams: given an array of strings, group the anagrams (words with the same letters). Example: ["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"],["tan","nat"],["bat"]].'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Разложить слова по кучкам так, чтобы в одной кучке лежали слова из одних и тех же букв. Ключевая мысль: нужно придумать **канонический ключ** — такое представление слова, которое одинаково у всех анаграмм и разное у всех остальных. Самый простой ключ — буквы слова, отсортированные по алфавиту.

Аналогия: **буквы из «Эрудита» на подставке**. Разложите фишки слова по алфавиту — и \`eat\`, \`tea\`, \`ate\` дают абсолютно одинаковую подставку \`aet\`. Дальше остаётся раскладывать слова по коробочкам, подписанным этой подставкой.

## Идея решения по шагам

1. Заводим \`const groups = new Map()\` — ключ это канонический вид, значение это массив исходных слов.
2. Идём по словам через \`for...of\`.
3. Для каждого слова считаем ключ: \`const key = [...word].sort().join('')\` — разбить на символы, отсортировать, склеить обратно.
4. Если такого ключа ещё нет — заводим пустой массив: \`if (!groups.has(key)) groups.set(key, [])\`.
5. Кладём **исходное** слово (не ключ!) в группу: \`groups.get(key).push(word)\`.
6. Возвращаем \`[...groups.values()]\` — сами ключи в ответе не нужны, только группы.

## Разбор кода

\`[...word]\` вместо \`word.split('')\` — не стилистика, а корректность: спред идёт по **кодовым точкам**, а \`split('')\` рубит по 16-битным юнитам и разваливает суррогатные пары (эмодзи, редкие иероглифы). На латинице разницы нет, но упомянуть это стоит — интервьюер услышит внимание к деталям.

\`.sort()\` без компаратора сортирует как строки — для одиночных символов это ровно то, что нужно, и компаратор писать не надо. \`.join('')\` возвращает строку, потому что ключом \`Map\` удобнее иметь примитив: массив сравнивался бы по ссылке и каждое слово попало бы в свою группу.

Пара «\`has\` → \`set\` пустого массива → \`get().push\`» — стандартная идиома группировки. Её можно сократить до \`groups.get(key) ?? []\`, а в современном рантайме до \`Object.groupBy\`/\`Map.groupBy\`, но развёрнутый вариант нагляднее на доске.

Важно, что в массив кладётся \`word\`, а не \`key\`: ключ — только служебная метка для поиска коробки, в ответе нужны исходные слова.

\`Map\` сохраняет порядок вставки, поэтому группы выходят в порядке первого появления слова из каждой группы — приятное свойство, если тест сравнивает результат строго.

## Сложность и edge cases

- **Время:** O(n · k log k), где n — число слов, k — средняя длина: для каждого слова платим сортировку k log k. **Память:** O(n · k) — храним все слова плюс ключи.
- Частотный ключ (26 счётчиков вместо сортировки) снижает время до O(n · k) — быстрее асимптотически, но на реальных коротких словах выигрыш почти не виден.
- Пустой входной массив ⇒ \`[]\`.
- Пустые строки дают пустой ключ и группируются вместе.
- Регистр: \`Eat\` и \`tea\` не совпадут — уточните, нужен ли \`toLowerCase()\`.
- Пробелы и знаки препинания попадают в ключ как обычные символы — уточните, чистим ли строку.
- Юникод: 26 счётчиков не годятся, нужна сортировка или \`Map\` частот; составные символы стоит прогнать через \`normalize('NFC')\`.
- Одно слово ⇒ группа из одного элемента, это нормальный результат.

## Как рассуждать вслух

> Сначала уточню детали: важен ли регистр, могут ли встречаться пробелы и не-латиница. Дальше формулирую главную мысль: анаграммы отличаются только порядком букв, значит мне нужно каноническое представление, одинаковое для всей группы. Беру самое простое — отсортированные буквы слова, склеенные в строку. Завожу \`Map\` из этого ключа в массив слов, прохожу список один раз, для каждого слова считаю ключ и кладу слово в соответствующую коробку. В конце возвращаю значения карты. Спред \`[...word]\` беру вместо \`split('')\`, чтобы не разваливать суррогатные пары. По сложности это O(n · k log k): линейно по числу слов, а логарифм появляется из сортировки внутри каждого слова. Если нужно строго линейно, ключ можно строить подсчётом частот символов вместо сортировки.

## Follow-up, которые зададут

- **Как избавиться от сортировки?** — строить ключ подсчётом частот символов, O(k) вместо O(k log k); например строка вида \`a2b1c0...\`.
- **А для Unicode?** — \`normalize('NFC')\` плюс частотная \`Map\`; фиксированный массив на 26 позиций там не работает.
- **Почему \`[...word]\`, а не \`split('')\`?** — спред идёт по кодовым точкам и не разбивает суррогатные пары.
- **Почему ключ это строка, а не массив?** — \`Map\` сравнивает объекты по ссылке, и каждый массив был бы отдельным ключом.
- **Есть ли готовый метод?** — \`Object.groupBy\`/\`Map.groupBy\` (2024) делают ровно эту группировку одной строкой.
- **Как проверить, что два слова анаграммы?** — сравнить их канонические ключи, O(k log k), или сравнить частотные словари за O(k).
- **Что если слов миллионы, а память ограничена?** — хранить не слова, а их индексы; ключи можно хешировать до чисел.
- **Как задать порядок групп?** — \`Map\` уже даёт порядок первого появления; иное упорядочивание — отдельная сортировка результата.`,
      en: `## In short: what they're asking for

Sort words into buckets so that each bucket holds words made of exactly the same letters. The key insight is to invent a **canonical key** — a representation that's identical for every anagram in a group and different for everything else. The simplest such key is the word's letters sorted alphabetically.

Analogy: **Scrabble tiles on a rack**. Arrange a word's tiles alphabetically and \`eat\`, \`tea\` and \`ate\` all produce the exact same rack, \`aet\`. From there it's just dropping words into boxes labelled with that rack.

## The idea, step by step

1. Create \`const groups = new Map()\` — key is the canonical form, value is an array of original words.
2. Walk the words with \`for...of\`.
3. Compute each word's key: \`const key = [...word].sort().join('')\` — split into characters, sort, join back.
4. If the key is new, create an empty bucket: \`if (!groups.has(key)) groups.set(key, [])\`.
5. Push the **original** word (not the key!) into the bucket: \`groups.get(key).push(word)\`.
6. Return \`[...groups.values()]\` — the keys aren't part of the answer, only the groups.

## Walking through the code

\`[...word]\` rather than \`word.split('')\` isn't style, it's correctness: spreading iterates **code points**, while \`split('')\` cuts on 16-bit units and tears surrogate pairs apart (emoji, rare CJK). On plain Latin there's no difference, but mentioning it signals attention to detail.

\`.sort()\` without a comparator sorts as strings, which is exactly right for single characters — no comparator needed. \`.join('')\` yields a string because a \`Map\` key should be a primitive: an array would compare by reference and every word would land in its own group.

The trio "\`has\` → \`set\` an empty array → \`get().push\`" is the standard grouping idiom. You could shorten it with \`groups.get(key) ?? []\`, or in a modern runtime use \`Object.groupBy\`/\`Map.groupBy\`, but the explicit version is clearer on a whiteboard.

Note that \`word\` gets pushed, not \`key\`: the key is merely the label on the box, while the answer needs the original words.

A \`Map\` preserves insertion order, so groups come out ordered by the first appearance of each group's first word — a pleasant property if a test compares results strictly.

## Complexity and edge cases

- **Time:** O(n · k log k), where n is the word count and k the average length: each word pays a k log k sort. **Memory:** O(n · k) — we store every word plus its key.
- A frequency key (26 counters instead of a sort) brings time down to O(n · k) — asymptotically faster, though on real short words the gain is barely visible.
- An empty input array ⇒ \`[]\`.
- Empty strings produce an empty key and group together.
- Case: \`Eat\` and \`tea\` won't match — clarify whether \`toLowerCase()\` is wanted.
- Spaces and punctuation become ordinary characters in the key — clarify whether to strip them.
- Unicode: 26 counters won't do; use sorting or a frequency \`Map\`, and run composed characters through \`normalize('NFC')\`.
- A single word ⇒ a group of one, which is a valid result.

## How to think out loud

> First I'd clarify the details: does case matter, can there be spaces or non-Latin characters. Then I'd state the core idea: anagrams differ only in letter order, so I need a canonical representation that's identical across a group. I take the simplest one — the word's letters sorted and joined into a string. I keep a \`Map\` from that key to an array of words, walk the list once, compute the key for each word and drop the word into the matching box. At the end I return the map's values. I use the spread \`[...word]\` rather than \`split('')\` so surrogate pairs don't get torn apart. Complexity is O(n · k log k): linear in the number of words, with the logarithm coming from sorting inside each word. If it must be strictly linear, I'd build the key by counting character frequencies instead of sorting.

## Follow-ups they'll ask

- **How do you avoid the sort?** — build the key by counting character frequencies, O(k) instead of O(k log k); e.g. a string like \`a2b1c0...\`.
- **And for Unicode?** — \`normalize('NFC')\` plus a frequency \`Map\`; a fixed 26-slot array doesn't work there.
- **Why \`[...word]\` and not \`split('')\`?** — spreading iterates code points and doesn't split surrogate pairs.
- **Why is the key a string rather than an array?** — a \`Map\` compares objects by reference, so every array would be a distinct key.
- **Is there a built-in for this?** — \`Object.groupBy\`/\`Map.groupBy\` (2024) do exactly this grouping in one line.
- **How do you check whether two words are anagrams?** — compare their canonical keys, O(k log k), or compare frequency maps in O(k).
- **What if there are millions of words and memory is tight?** — store indices instead of words, and hash the keys down to numbers.
- **How do you control group ordering?** — a \`Map\` already gives first-appearance order; anything else means sorting the result separately.`
    },
    codeSnippet: `function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}

// groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']);`
  },
  {
    id: 'lc-036',
    category: 'live-coding',
    level: 'Hard',
    tags: ['sliding-window', 'kadane', 'algorithms'],
    question: {
      ru: 'Maximum Subarray (алгоритм Кадане): найдите непрерывный подмассив с максимальной суммой и верните эту сумму. Пример: [-2,1,-3,4,-1,2,1,-5,4] → 6 (подмассив [4,-1,2,1]). Добейтесь O(n).',
      en: 'Maximum Subarray (Kadane\'s algorithm): find the contiguous subarray with the largest sum and return that sum. Example: [-2,1,-3,4,-1,2,1,-5,4] → 6 (subarray [4,-1,2,1]). Achieve O(n).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Найти непрерывный кусок массива с максимальной суммой. Перебор всех подмассивов — O(n²) или даже O(n³), а нужен один проход. Приём называется **алгоритм Кадане**, и он сводится к одному решению на каждом шаге: **продолжать текущий отрезок или начать новый прямо здесь**.

Аналогия: **накопленный долг в баре**. Вы идёте по дням и ведёте счёт. Если накопленная сумма ушла в минус, тащить этот минус в будущее бессмысленно — любой следующий день начнётся с гандикапа. Выгоднее забыть прошлое и открыть новый счёт с сегодняшнего дня. При этом лучший результат за всю историю вы записываете отдельно и никогда не стираете.

## Идея решения по шагам

1. Заводим две переменные: \`current\` — лучшая сумма отрезка, **заканчивающегося ровно на текущем элементе**, и \`best\` — лучшая сумма за всю историю.
2. Обе инициализируем **первым элементом**, а не нулём: \`let best = nums[0]; let current = nums[0];\`.
3. Идём циклом с \`i = 1\` (нулевой уже учтён).
4. На каждом шаге принимаем решение: \`current = Math.max(nums[i], current + nums[i])\`. Левый вариант — начать новый отрезок с текущего элемента, правый — продолжить старый.
5. Обновляем рекорд: \`best = Math.max(best, current)\`.
6. Возвращаем \`best\`.

## Разбор кода

Две переменные отвечают на **два разных вопроса**, и путать их нельзя. \`current\` — локальный ответ «какой лучший отрезок кончается здесь», \`best\` — глобальный рекорд. Именно поэтому нужны обе: \`current\` может проседать, а \`best\` только растёт.

\`Math.max(nums[i], current + nums[i])\` — сердце алгоритма. Первый аргумент выигрывает ровно тогда, когда \`current < 0\`, то есть когда накопленная сумма стала обузой. Это и есть «сброс»: формально мы не обнуляем ничего, просто выбираем начать заново.

Инициализация **первым элементом, а не нулём** — самая частая ошибка. С нулём массив из одних отрицательных чисел вернул бы \`0\` (пустой подмассив), а по условию подмассив должен быть непустым, и правильный ответ — наименее плохой элемент. Обязательно проговорите это вслух: интервьюер почти наверняка проверит именно этот случай.

Цикл стартует с \`i = 1\`, потому что нулевой элемент уже зашит в инициализацию. Начать с \`i = 0\` тоже можно, но тогда инициализировать \`current\` нужно нулём, а \`best\` — минус бесконечностью, и логика станет менее очевидной.

Порядок строк важен: сначала обновляем \`current\`, потом сравниваем с \`best\`. Наоборот — и рекорд отстанет на один шаг.

## Сложность и edge cases

- **Время:** O(n) — ровно один проход, на каждом элементе константная работа. **Память:** O(1) — две переменные, независимо от размера входа.
- Все числа отрицательные ⇒ ответ это максимальный одиночный элемент, что и обеспечивает инициализация первым элементом.
- Один элемент ⇒ он сам, цикл не выполняется ни разу.
- Пустой массив ⇒ \`nums[0]\` это \`undefined\`, и функция вернёт \`undefined\`. В этой версии защиты нет — упомяните, что добавили бы ранний \`return\` или бросили ошибку.
- Все нули ⇒ \`0\`, корректно.
- Смешанные знаки — основной интересный случай, ради него алгоритм и придуман.
- Очень большие числа: сумма может выйти за \`Number.MAX_SAFE_INTEGER\`, тогда нужен \`BigInt\`.
- Нужны границы отрезка — храните \`start\` (обновляется при сбросе) и \`end\` (при обновлении \`best\`).

## Как рассуждать вслух

> Сначала уточню: подмассив обязан быть непустым и могут ли все числа быть отрицательными — от этого зависит инициализация. Перебор всех подмассивов дал бы квадрат, но здесь хватает одного прохода, это алгоритм Кадане. Веду две переменные: \`current\` это лучшая сумма отрезка, который заканчивается ровно на текущем элементе, и \`best\` это глобальный рекорд. На каждом шаге принимаю одно решение — продолжить накопленный отрезок или начать новый с текущего элемента. Интуиция простая: если накопленная сумма ушла в минус, она будущему только мешает, выгоднее начать заново. Обе переменные инициализирую первым элементом, а не нулём, иначе на массиве из одних отрицательных вернётся ноль вместо наименее плохого элемента. Итог: O(n) по времени и O(1) по памяти.

## Follow-up, которые зададут

- **Как вернуть сами индексы?** — запоминать \`start\` в момент сброса и фиксировать \`start\`/\`end\` каждый раз, когда обновляется \`best\`.
- **Почему инициализация первым элементом, а не нулём?** — иначе на массиве из одних отрицательных чисел вернётся \`0\`, то есть пустой подмассив, что противоречит условию.
- **Максимальное произведение подмассива?** — вести одновременно минимум и максимум, потому что отрицательное число меняет их местами.
- **Что если подмассив может быть пустым?** — тогда ответ это \`Math.max(best, 0)\`, и инициализация нулём становится корректной.
- **Как решить это через префиксные суммы?** — ответ равен \`prefix[i] - min(prefix[j])\` для \`j < i\`; та же O(n), другой взгляд на ту же идею.
- **А круговой массив?** — либо обычный Кадане, либо «вся сумма минус минимальный подмассив»; берём максимум из двух.
- **Максимальная сумма ровно k элементов?** — это уже скользящее окно фиксированной длины, не Кадане.
- **Как это выглядит как динамическое программирование?** — \`dp[i] = max(nums[i], dp[i-1] + nums[i])\`; \`current\` это \`dp\`, свёрнутая до одной переменной.`,
      en: `## In short: what they're asking for

Find the contiguous slice of the array with the largest sum. Checking every subarray is O(n²) or even O(n³), but one pass is enough. The technique is **Kadane's algorithm**, and it boils down to a single decision at each step: **extend the current run or start a new one right here**.

Analogy: **a running bar tab**. You walk through the days keeping a tally. If the accumulated total has gone negative, carrying that debt forward is pointless — every future day would start with a handicap. Better to forget the past and open a fresh tab today. Meanwhile you record the best result you've ever had separately, and never erase it.

## The idea, step by step

1. Keep two variables: \`current\` — the best sum of a run **ending exactly at the current element** — and \`best\` — the best sum seen anywhere.
2. Initialise both with the **first element**, not zero: \`let best = nums[0]; let current = nums[0];\`.
3. Loop from \`i = 1\` (element zero is already accounted for).
4. Each step, make the decision: \`current = Math.max(nums[i], current + nums[i])\`. The left option starts a new run at the current element, the right one extends the old run.
5. Update the record: \`best = Math.max(best, current)\`.
6. Return \`best\`.

## Walking through the code

The two variables answer **two different questions** and must not be conflated. \`current\` is the local answer, "what's the best run ending here", while \`best\` is the global record. That's exactly why you need both: \`current\` can dip, \`best\` only ever climbs.

\`Math.max(nums[i], current + nums[i])\` is the heart of the algorithm. The first argument wins precisely when \`current < 0\`, i.e. when the accumulated sum has become a burden. That's the "reset": formally we zero nothing out, we simply choose to start over.

Initialising with the **first element rather than zero** is the classic mistake. With zero, an all-negative array would return \`0\` (the empty subarray), whereas the problem requires a non-empty one and the right answer is the least-bad element. Say this out loud — the interviewer will almost certainly test that case.

The loop starts at \`i = 1\` because element zero is baked into the initialisation. Starting at \`i = 0\` also works, but then \`current\` must start at zero and \`best\` at negative infinity, which makes the logic less obvious.

The line order matters: update \`current\` first, then compare with \`best\`. The other way round and the record lags one step behind.

## Complexity and edge cases

- **Time:** O(n) — exactly one pass with constant work per element. **Memory:** O(1) — two variables regardless of input size.
- All negatives ⇒ the answer is the largest single element, which the first-element initialisation guarantees.
- A single element ⇒ itself; the loop never runs.
- An empty array ⇒ \`nums[0]\` is \`undefined\` and the function returns \`undefined\`. This version has no guard — mention that you'd add an early return or throw.
- All zeros ⇒ \`0\`, correct.
- Mixed signs is the genuinely interesting case, and the reason the algorithm exists.
- Very large numbers: the sum can exceed \`Number.MAX_SAFE_INTEGER\`, which would call for \`BigInt\`.
- If you need the bounds, track \`start\` (updated on a reset) and \`end\` (updated when \`best\` improves).

## How to think out loud

> First I'd clarify whether the subarray must be non-empty and whether all numbers can be negative — that decides the initialisation. Brute-forcing every subarray would be quadratic, but one pass suffices here; this is Kadane's algorithm. I keep two variables: \`current\`, the best sum of a run ending exactly at the current element, and \`best\`, the global record. At each step I make one decision — extend the accumulated run or start a new one at the current element — which is the max of \`nums[i]\` and \`current + nums[i]\`. The intuition is simple: once the running sum goes negative it only hurts the future, so starting over pays off. I initialise both variables with the first element rather than zero, otherwise an all-negative array returns zero instead of the least-bad element. That gives O(n) time and O(1) memory.

## Follow-ups they'll ask

- **How do you return the indices?** — record \`start\` at the moment of a reset, and capture \`start\`/\`end\` every time \`best\` improves.
- **Why initialise with the first element instead of zero?** — otherwise an all-negative array returns \`0\`, i.e. the empty subarray, which contradicts the problem.
- **Maximum product subarray?** — track the minimum alongside the maximum, because a negative number swaps them.
- **What if the subarray may be empty?** — then the answer is \`Math.max(best, 0)\`, and initialising with zero becomes correct.
- **How would you solve it with prefix sums?** — the answer is \`prefix[i] - min(prefix[j])\` for \`j < i\`; same O(n), a different view of the same idea.
- **What about a circular array?** — either plain Kadane, or "total sum minus the minimum subarray"; take the max of the two.
- **Maximum sum of exactly k elements?** — that's a fixed-size sliding window, not Kadane.
- **How is this dynamic programming?** — \`dp[i] = max(nums[i], dp[i-1] + nums[i])\`; \`current\` is that \`dp\` collapsed into a single variable.`
    },
    codeSnippet: `function maxSubArray(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}

// maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6`
  },
  {
    id: 'lc-037',
    category: 'live-coding',
    level: 'Medium',
    tags: ['binary-search', 'algorithms', 'arrays'],
    question: {
      ru: 'Реализуйте бинарный поиск в отсортированном массиве: верните индекс target или -1. Затем реализуйте вариант «нижняя граница» (первый индекс, где элемент >= target). Объясните, почему важна форма цикла.',
      en: 'Implement binary search in a sorted array: return the index of target or -1. Then implement the lower-bound variant (first index where element >= target). Explain why the loop shape matters.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Бинарный поиск все знают на словах, а на доске половина кандидатов делает off-by-one и уходит в бесконечный цикл. Проверяют не идею «делим пополам», а **дисциплину работы с границами**: какой отрезок вы держите — закрытый или полуоткрытый — и согласованы ли с ним условие цикла и сдвиги.

Аналогия: **игра «угадай число»**. Ведущий говорит «больше» или «меньше», и вы каждый раз режете диапазон пополам. Двадцать вопросов хватает на миллион чисел — это и есть логарифм.

## Идея решения по шагам

**binarySearch — закрытый отрезок \`[lo, hi]\`, оба конца входят:**
1. \`lo = 0\`, \`hi = arr.length - 1\`.
2. Цикл \`while (lo <= hi)\` — знак «равно» обязателен, иначе отрезок из одного элемента не проверится.
3. \`const mid = lo + ((hi - lo) >> 1)\`.
4. Попали — \`return mid\`.
5. \`arr[mid] < target\` ⇒ ответ правее: \`lo = mid + 1\`.
6. Иначе ответ левее: \`hi = mid - 1\`.
7. Вышли из цикла — элемента нет, \`return -1\`.

**lowerBound — полуоткрытый отрезок \`[lo, hi)\`, правый конец не входит:**
1. \`lo = 0\`, \`hi = arr.length\` — на единицу больше, это не опечатка.
2. Цикл \`while (lo < hi)\` — без «равно».
3. Инвариант: ответ всегда лежит внутри \`[lo, hi]\`; слева от \`lo\` все элементы строго меньше \`target\`, начиная с \`hi\` — все не меньше.
4. \`arr[mid] >= target\` ⇒ \`mid\` сам может быть ответом, поэтому \`hi = mid\`, **не** \`mid - 1\`.
5. Иначе \`lo = mid + 1\`.
6. Возвращаем \`lo\` — на выходе \`lo === hi\` и это первая позиция, где элемент \`>= target\`.

## Разбор кода

Две функции нарочно написаны в **двух разных конвенциях**, и в этом весь смысл задачи. В первой отрезок закрытый, поэтому условие \`lo <= hi\` и сдвиги на \`±1\`. Во второй полуоткрытый, поэтому \`lo < hi\` и \`hi = mid\` без вычитания. Смешать их — гарантированный баг: \`lo <= hi\` вместе с \`hi = mid\` даёт **бесконечный цикл**, когда \`lo === hi\`.

Почему в \`lowerBound\` именно \`hi = mid\`: элемент \`arr[mid]\` удовлетворяет условию \`>= target\`, а значит сам является кандидатом в ответ, и выбрасывать его нельзя. А \`lo = mid + 1\` безопасно: \`arr[mid]\` строго меньше \`target\` и ответом быть не может.

\`lo + ((hi - lo) >> 1)\` вместо \`(lo + hi) / 2\` — привычка из языков с фиксированным \`int\`, где сумма может переполниться. В JS числа шире, но привычка полезна, а \`>> 1\` заодно даёт целочисленное деление без \`Math.floor\`. Нюанс: \`>>\` работает с 32-битными числами, так что для массивов длиннее двух миллиардов элементов нужен \`Math.floor\`.

Сдвиг всегда на \`mid ± 1\` в первой функции — гарантия **прогресса**: отрезок обязан сокращаться на каждой итерации, иначе цикл зациклится. Это то, что стоит проверить вслух на массиве из двух элементов.

\`lowerBound\` возвращает \`lo\` и **никогда не возвращает \`-1\`**: если \`target\` больше всех, ответом будет \`arr.length\`. Это делает функцию точкой вставки — на неё опирается сортированная вставка и подсчёт вхождений.

## Сложность и edge cases

- **Время:** O(log n) — отрезок уменьшается вдвое на каждой итерации, поэтому шагов около \`log₂ n\`. **Память:** O(1) — три числа, рекурсии нет.
- Пустой массив ⇒ \`binarySearch\` вернёт \`-1\` (цикл не выполнится), \`lowerBound\` вернёт \`0\`.
- Один элемент ⇒ отрабатывает за одну итерацию, это главный тест на \`<=\` против \`<\`.
- \`target\` меньше всех ⇒ \`lowerBound\` даёт \`0\`; больше всех ⇒ \`arr.length\`.
- Дубликаты: обычный поиск вернёт **любое** вхождение, а \`lowerBound\` — строго первое.
- Массив не отсортирован ⇒ результат бессмысленный, предусловие нужно проговорить.
- \`NaN\` в массиве ломает все сравнения — любое сравнение с \`NaN\` ложно.
- Off-by-one — самая частая ошибка; держите инвариант в голове и проверяйте на массивах длины 1 и 2.

## Как рассуждать вслух

> Уточню, что массив отсортирован и что вернуть, если элемента нет. Дальше сразу зафиксирую конвенцию границ, потому что именно на ней здесь все и спотыкаются. В обычном поиске держу закрытый отрезок: \`hi\` это последний индекс, условие \`lo <= hi\`, а сдвиги на \`mid + 1\` и \`mid - 1\`, чтобы отрезок гарантированно сокращался. Для нижней границы конвенция другая: отрезок полуоткрытый, \`hi\` равен длине массива, условие \`lo < hi\`, и при попадании я двигаю \`hi = mid\` без минуса, потому что сам \`mid\` ещё может оказаться ответом. Возвращаю \`lo\` — это первая позиция, где элемент не меньше цели, то есть заодно и точка вставки. Обе версии O(log n) по времени и O(1) по памяти. Проверю на массивах из одного и двух элементов — там и вылезают off-by-one.

## Follow-up, которые зададут

- **Почему \`mid = (lo + hi) / 2\` считается плохой практикой?** — переполнение \`int\` в языках с фиксированной разрядностью; в JS не критично, но привычка полезна.
- **Как найти точку вставки?** — это и есть \`lowerBound\`; она возвращает \`arr.length\`, если цель больше всех.
- **Как найти последнее вхождение?** — \`upperBound\` (условие \`> target\`) минус единица.
- **Как посчитать количество вхождений?** — \`upperBound(x) - lowerBound(x)\`, обе за O(log n).
- **Почему в \`lowerBound\` \`hi = mid\`, а не \`mid - 1\`?** — \`arr[mid]\` удовлетворяет условию и сам может быть ответом, отбрасывать его нельзя.
- **Откуда берётся бесконечный цикл?** — из смешения конвенций: \`lo <= hi\` вместе с \`hi = mid\` не даёт прогресса при \`lo === hi\`.
- **Поиск в повёрнутом отсортированном массиве?** — та же схема, но сначала определяем, какая половина отсортирована, и решаем, куда идти.
- **Можно ли писать рекурсивно?** — можно, но это O(log n) памяти на стек вместо O(1), и на собеседовании итеративный вариант ценят выше.
- **Как искать не в массиве, а по предикату?** — бинарный поиск по ответу: та же схема на монотонной функции «да/нет».`,
      en: `## In short: what they're asking for

Everyone can describe binary search, yet half the candidates produce an off-by-one at the whiteboard and spin into an infinite loop. What's really being tested isn't the "halve it" idea but **boundary discipline**: which interval are you maintaining — closed or half-open — and are the loop condition and the pointer moves consistent with it?

Analogy: **the guess-the-number game**. The host says "higher" or "lower" and you halve the range each time. Twenty questions cover a million numbers — that's the logarithm.

## The idea, step by step

**binarySearch — a closed interval \`[lo, hi]\`, both ends included:**
1. \`lo = 0\`, \`hi = arr.length - 1\`.
2. Loop \`while (lo <= hi)\` — the equals sign is mandatory, otherwise a one-element interval is never examined.
3. \`const mid = lo + ((hi - lo) >> 1)\`.
4. On a hit, \`return mid\`.
5. \`arr[mid] < target\` ⇒ the answer is to the right: \`lo = mid + 1\`.
6. Otherwise it's to the left: \`hi = mid - 1\`.
7. Falling out of the loop means it's absent: \`return -1\`.

**lowerBound — a half-open interval \`[lo, hi)\`, right end excluded:**
1. \`lo = 0\`, \`hi = arr.length\` — one larger, and that's not a typo.
2. Loop \`while (lo < hi)\` — no equals sign.
3. Invariant: the answer always lies inside \`[lo, hi]\`; everything left of \`lo\` is strictly less than \`target\`, everything from \`hi\` onwards is not less.
4. \`arr[mid] >= target\` ⇒ \`mid\` itself might be the answer, so \`hi = mid\`, **not** \`mid - 1\`.
5. Otherwise \`lo = mid + 1\`.
6. Return \`lo\` — on exit \`lo === hi\`, the first position where the element is \`>= target\`.

## Walking through the code

The two functions are deliberately written in **two different conventions**, and that's the whole point of the exercise. The first uses a closed interval, hence \`lo <= hi\` and \`±1\` moves. The second uses a half-open one, hence \`lo < hi\` and \`hi = mid\` with no subtraction. Mixing them is a guaranteed bug: \`lo <= hi\` combined with \`hi = mid\` produces an **infinite loop** when \`lo === hi\`.

Why \`hi = mid\` in \`lowerBound\`: \`arr[mid]\` satisfies \`>= target\`, so it is itself a candidate answer and must not be discarded. \`lo = mid + 1\` is safe because \`arr[mid]\` is strictly less than \`target\` and can't be the answer.

\`lo + ((hi - lo) >> 1)\` instead of \`(lo + hi) / 2\` is a habit from fixed-width \`int\` languages where the sum can overflow. JS numbers are wider, but the habit is good, and \`>> 1\` throws in integer division for free without \`Math.floor\`. A caveat: \`>>\` operates on 32-bit values, so arrays longer than about two billion elements need \`Math.floor\`.

Always moving by \`mid ± 1\` in the first function guarantees **progress**: the interval must shrink every iteration or the loop never ends. That's the thing to verify out loud on a two-element array.

\`lowerBound\` returns \`lo\` and **never returns \`-1\`**: if \`target\` exceeds everything, the answer is \`arr.length\`. That makes it an insertion point, which is what sorted insertion and occurrence counting rely on.

## Complexity and edge cases

- **Time:** O(log n) — the interval halves every iteration, so there are about \`log₂ n\` steps. **Memory:** O(1) — three numbers and no recursion.
- Empty array ⇒ \`binarySearch\` returns \`-1\` (the loop never runs), \`lowerBound\` returns \`0\`.
- A single element ⇒ resolved in one iteration; this is the key test of \`<=\` versus \`<\`.
- \`target\` below everything ⇒ \`lowerBound\` gives \`0\`; above everything ⇒ \`arr.length\`.
- Duplicates: plain search returns **any** occurrence, \`lowerBound\` returns strictly the first.
- An unsorted array ⇒ meaningless results; state the precondition explicitly.
- A \`NaN\` in the array breaks every comparison, since any comparison with \`NaN\` is false.
- Off-by-one is the most common bug — keep the invariant in mind and test arrays of length 1 and 2.

## How to think out loud

> I'd confirm the array is sorted and ask what to return when the element is missing. Then I'd immediately pin down the boundary convention, because that's exactly where people trip here. For plain search I keep a closed interval: \`hi\` is the last index, the condition is \`lo <= hi\`, and the moves are \`mid + 1\` and \`mid - 1\` so the interval is guaranteed to shrink. I compute the midpoint as \`lo + ((hi - lo) >> 1)\` — a habit against overflow that also gives integer division. For the lower bound the convention differs: the interval is half-open, \`hi\` equals the array length, the condition is \`lo < hi\`, and on a match I set \`hi = mid\` with no minus one, because \`mid\` itself may still be the answer. I return \`lo\`, the first position where the element is not less than the target, which doubles as the insertion point. Both versions are O(log n) time and O(1) memory. I'd sanity-check arrays of one and two elements, since that's where off-by-ones surface.

## Follow-ups they'll ask

- **Why is \`mid = (lo + hi) / 2\` considered bad practice?** — \`int\` overflow in fixed-width languages; not critical in JS, but the habit is worth keeping.
- **How do you find the insertion point?** — that's \`lowerBound\`; it returns \`arr.length\` when the target exceeds everything.
- **How do you find the last occurrence?** — \`upperBound\` (condition \`> target\`) minus one.
- **How do you count occurrences?** — \`upperBound(x) - lowerBound(x)\`, both O(log n).
- **Why \`hi = mid\` in \`lowerBound\` rather than \`mid - 1\`?** — \`arr[mid]\` satisfies the condition and may itself be the answer, so it can't be discarded.
- **Where does the infinite loop come from?** — mixing conventions: \`lo <= hi\` together with \`hi = mid\` makes no progress when \`lo === hi\`.
- **Search in a rotated sorted array?** — the same skeleton, but first determine which half is sorted and decide which way to go.
- **Can you write it recursively?** — you can, but that's O(log n) stack instead of O(1), and interviewers prefer the iterative form.
- **How do you search by a predicate rather than an array?** — binary search on the answer: the same skeleton over a monotonic yes/no function.`
    },
    codeSnippet: `function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

function lowerBound(arr, target) {
  let lo = 0;
  let hi = arr.length; // exclusive
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}`
  },
  {
    id: 'lc-038',
    category: 'live-coding',
    level: 'Hard',
    tags: ['flatten-object', 'recursion', 'objects'],
    question: {
      ru: 'Реализуйте flattenObject(obj, prefix?): превращает вложенный объект в плоский с ключами-путями через точку. Пример: { a: { b: 1, c: { d: 2 } } } → { "a.b": 1, "a.c.d": 2 }. Покажите и обратную операцию unflatten.',
      en: 'Implement flattenObject(obj, prefix?): turns a nested object into a flat one with dot-path keys. Example: { a: { b: 1, c: { d: 2 } } } → { "a.b": 1, "a.c.d": 2 }. Also show the inverse unflatten.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Превратить дерево объекта в плоский словарь, где ключ — это полный путь через точку, и уметь собрать всё обратно. Приём — **обычная рекурсия с накоплением префикса**: спускаясь на уровень ниже, дописываем к пути очередной сегмент.

Аналогия: **дерево папок и список полных путей**. \`flatten\` — это команда «покажи все файлы одним списком»: вместо вложенных папок получаем строки вида \`docs/2024/report.pdf\`. \`unflatten\` — обратная операция: по списку путей восстановить структуру папок.

## Идея решения по шагам

**flattenObject(obj, prefix = '', result = {}):**
1. Идём по \`Object.entries(obj)\` — сразу получаем и ключ, и значение.
2. Строим путь: если \`prefix\` пуст, путь равен \`key\`, иначе \`prefix + '.' + key\`. Тернарник \`prefix ? ... : key\` нужен, чтобы не получить ведущую точку.
3. Решаем, лист это или ветка: ветка — только «чистый» объект, то есть \`value !== null && typeof value === 'object' && !Array.isArray(value)\`.
4. Ветка ⇒ рекурсивный вызов с новым префиксом и **тем же** \`result\`.
5. Лист ⇒ \`result[path] = value\`.
6. Возвращаем \`result\`.

**unflatten(flat):**
1. Заводим пустой \`result\`.
2. Для каждой пары режем путь: \`const keys = path.split('.')\`.
3. Ведём курсор \`let node = result\` и идём по сегментам.
4. Последний сегмент ⇒ \`node[k] = value\`.
5. Не последний ⇒ спускаемся, создавая уровень при необходимости: \`node = node[k] ??= {}\`.

## Разбор кода

\`result\` передаётся **параметром вниз по рекурсии**, а не собирается из возвращаемых значений. Так все листья пишутся в один и тот же объект, и не нужно на каждом уровне мержить промежуточные результаты через спред — это заметно дешевле по аллокациям.

Тройная проверка «это ветка» разобрана на три части не случайно. \`typeof null === 'object'\` — историческая особенность JS, без явной проверки на \`null\` мы бы полезли рекурсией в него и упали. \`!Array.isArray\` — сознательное решение считать массив листом; это первое, о чём стоит спросить интервьюера.

Пустой объект \`{}\` в значении **исчезает** из результата: \`Object.entries({})\` пуст, рекурсия ничего не запишет. Это реальная потеря информации при обратном преобразовании, и упоминание этого факта отличает вдумчивый ответ от заученного.

В \`unflatten\` строка \`node = node[k] ??= {}\` делает два дела сразу: создаёт уровень, если его ещё нет, и возвращает его, чтобы курсор туда спустился. Работает потому, что присваивание в JS — **выражение**, возвращающее присвоенное значение. Оператор \`??=\` (а не \`||=\`) важен: с \`||=\` существующий уровень со значением \`0\` или \`''\` был бы затёрт.

Проверка \`i === keys.length - 1\` разделяет «дойти» и «положить»: все сегменты кроме последнего — навигация, последний — запись значения.

## Сложность и edge cases

- **Время:** O(n) по числу узлов дерева — каждый посещается ровно один раз; плюс O(глубина) на конкатенацию пути. **Память:** O(число листьев) на результат и O(глубина) на стек рекурсии.
- Пустой объект ⇒ \`{}\`.
- Вложенный пустой объект \`{ a: {} }\` ⇒ **исчезает**, обратное преобразование его не восстановит.
- \`null\` — лист, рекурсию туда не пускаем.
- Массивы: здесь остаются как есть; альтернатива — индексировать (\`a.0.b\`) — уточните контракт.
- Ключи с точкой внутри ломают обратимость: \`{ 'a.b': 1 }\` и \`{ a: { b: 1 } }\` дают одинаковый плоский вид. Нужен другой разделитель или экранирование.
- Циклические ссылки ⇒ бесконечная рекурсия; нужен \`WeakSet\` посещённых.
- Очень глубокая вложенность ⇒ переполнение стека; лечится явным стеком вместо рекурсии.
- \`unflatten\` с ключом \`__proto__\` — дыра prototype pollution; на проде такие сегменты нужно отбрасывать.

## Как рассуждать вслух

> Сначала уточню два контракта: что делаем с массивами — оставляем как есть или индексируем — и гарантированно ли в ключах нет точек. Дальше это обычный обход дерева рекурсией с накоплением пути: иду по \`Object.entries\`, для каждой пары собираю путь из префикса и ключа, и если значение это чистый объект, спускаюсь глубже, а иначе пишу лист в результат. Отдельно проверяю \`null\`, потому что \`typeof null\` это \`'object'\` и без проверки рекурсия туда провалится. Обратная операция режет ключ по точкам и идёт курсором вглубь, создавая недостающие уровни. Сложность линейная по числу узлов, память — по числу листьев плюс глубина стека. Из подвохов назову ключи с точкой внутри и пустые вложенные объекты, которые при сплющивании просто исчезают.

## Follow-up, которые зададут

- **Где это применяется на практике?** — словари i18n, query-параметры форм, конфиги, диффы состояний, отправка вложенных форм на бэкенд.
- **Что делать с массивами?** — либо лист (как здесь), либо индексация вида \`a.0.b\`; второе обратимо, но раздувает ключи.
- **Что если в ключе есть точка?** — обратимость ломается; нужен другой разделитель или экранирование, либо путь как массив сегментов.
- **Почему проверяется \`null\` отдельно?** — \`typeof null === 'object'\`, и без этой проверки рекурсия провалится внутрь \`null\`.
- **Что с циклическими ссылками?** — бесконечная рекурсия; ведите \`WeakSet\` посещённых объектов.
- **Чем \`??=\` лучше \`||=\` в \`unflatten\`?** — \`||=\` затрёт существующие \`0\`, \`''\` и \`false\`, а \`??=\` реагирует только на \`null\`/\`undefined\`.
- **Как защититься от prototype pollution?** — отбрасывать сегменты \`__proto__\`, \`constructor\`, \`prototype\` и создавать объекты через \`Object.create(null)\`.
- **Как сделать это без рекурсии?** — явный стек пар «объект, префикс» и цикл \`while\`; спасает от переполнения на глубоких структурах.
- **Полностью ли обратима операция?** — нет: теряются пустые объекты, а ключи с точками становятся неоднозначными.`,
      en: `## In short: what they're asking for

Turn an object tree into a flat dictionary whose keys are full dot-separated paths, and be able to rebuild it. The technique is **plain recursion with an accumulated prefix**: as you descend a level, you append another segment to the path.

Analogy: **a folder tree versus a list of full paths**. \`flatten\` is the "show me every file as one list" command: instead of nested folders you get lines like \`docs/2024/report.pdf\`. \`unflatten\` is the reverse: rebuild the folder structure from that list of paths.

## The idea, step by step

**flattenObject(obj, prefix = '', result = {}):**
1. Walk \`Object.entries(obj)\` so you get key and value together.
2. Build the path: if \`prefix\` is empty the path is just \`key\`, otherwise \`prefix + '.' + key\`. The \`prefix ? ... : key\` ternary exists to avoid a leading dot.
3. Decide leaf versus branch: a branch is only a plain object, i.e. \`value !== null && typeof value === 'object' && !Array.isArray(value)\`.
4. Branch ⇒ recurse with the new prefix and the **same** \`result\`.
5. Leaf ⇒ \`result[path] = value\`.
6. Return \`result\`.

**unflatten(flat):**
1. Start with an empty \`result\`.
2. For each pair, cut the path: \`const keys = path.split('.')\`.
3. Keep a cursor \`let node = result\` and walk the segments.
4. Last segment ⇒ \`node[k] = value\`.
5. Not last ⇒ descend, creating the level if needed: \`node = node[k] ??= {}\`.

## Walking through the code

\`result\` is passed **down as a parameter** rather than assembled from return values. That way every leaf writes into the same object and there's no need to merge intermediate results with a spread at each level — noticeably cheaper in allocations.

The three-part "is this a branch" check is split deliberately. \`typeof null === 'object'\` is a historical JS quirk, and without an explicit \`null\` check we'd recurse into it and crash. \`!Array.isArray\` is a conscious decision to treat arrays as leaves — the first thing to ask the interviewer about.

An empty object \`{}\` as a value **disappears** from the result: \`Object.entries({})\` is empty, so recursion writes nothing. That's genuine information loss on the round trip, and mentioning it is what separates a thoughtful answer from a memorised one.

In \`unflatten\`, the line \`node = node[k] ??= {}\` does two things at once: it creates the level if it doesn't exist and returns it so the cursor can descend. It works because assignment in JS is an **expression** returning the assigned value. Using \`??=\` rather than \`||=\` matters: with \`||=\` an existing level holding \`0\` or \`''\` would be clobbered.

The \`i === keys.length - 1\` check separates "navigate" from "store": every segment but the last is navigation, the last one writes the value.

## Complexity and edge cases

- **Time:** O(n) over tree nodes — each is visited exactly once, plus O(depth) for path concatenation. **Memory:** O(leaf count) for the result and O(depth) for the recursion stack.
- An empty object ⇒ \`{}\`.
- A nested empty object \`{ a: {} }\` ⇒ **disappears**; the inverse can't restore it.
- \`null\` is a leaf, don't recurse into it.
- Arrays are kept as-is here; the alternative is indexing them (\`a.0.b\`) — clarify the contract.
- Keys containing a dot break round-tripping: \`{ 'a.b': 1 }\` and \`{ a: { b: 1 } }\` flatten identically. Use a different separator or escaping.
- Circular references ⇒ infinite recursion; you need a \`WeakSet\` of visited objects.
- Very deep nesting ⇒ stack overflow; fixed by an explicit stack instead of recursion.
- \`unflatten\` with a \`__proto__\` key is a prototype-pollution hole; strip such segments in production.

## How to think out loud

> First I'd nail down two contracts: what happens to arrays — kept as-is or indexed — and whether keys are guaranteed free of dots. After that it's an ordinary recursive tree walk with an accumulated path: I iterate \`Object.entries\`, build each path from the prefix plus the key, and if the value is a plain object I descend, otherwise I write the leaf into the result. I pass the accumulator down as a parameter so I never have to merge objects at every level. I check \`null\` separately because \`typeof null\` is \`'object'\` and recursion would fall straight into it. The inverse splits the key on dots and walks a cursor down, creating missing levels along the way. Complexity is linear in the number of nodes, memory is the leaf count plus stack depth. For gotchas I'd flag keys containing dots and nested empty objects, which simply vanish when flattened.

## Follow-ups they'll ask

- **Where is this used in practice?** — i18n dictionaries, form query params, configs, state diffs, posting nested forms to a backend.
- **What should happen with arrays?** — either treat them as leaves (as here) or index them as \`a.0.b\`; the latter round-trips but bloats keys.
- **What if a key contains a dot?** — round-tripping breaks; use a different separator, escaping, or paths as arrays of segments.
- **Why is \`null\` checked separately?** — \`typeof null === 'object'\`, so without it recursion descends into \`null\`.
- **What about circular references?** — infinite recursion; keep a \`WeakSet\` of visited objects.
- **Why \`??=\` rather than \`||=\` in \`unflatten\`?** — \`||=\` would clobber existing \`0\`, \`''\` and \`false\`, while \`??=\` only reacts to \`null\`/\`undefined\`.
- **How do you guard against prototype pollution?** — drop \`__proto__\`, \`constructor\` and \`prototype\` segments and build objects with \`Object.create(null)\`.
- **How would you do it without recursion?** — an explicit stack of "object, prefix" pairs and a \`while\` loop; it survives deep structures.
- **Is the operation fully reversible?** — no: empty objects are lost and keys containing dots become ambiguous.`
    },
    codeSnippet: `function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? \`\${prefix}.\${key}\` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, path, result);
    } else {
      result[path] = value;
    }
  }
  return result;
}

function unflatten(flat) {
  const result = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split('.');
    let node = result;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) node[k] = value;
      else node = node[k] ??= {};
    });
  }
  return result;
}`
  },
  {
    id: 'lc-039',
    category: 'live-coding',
    level: 'Hard',
    tags: ['json-stringify', 'recursion', 'serialization'],
    question: {
      ru: 'Реализуйте упрощённый jsonStringify(value): сериализует строки (с кавычками), числа, boolean, null, массивы и объекты. Корректно обработайте undefined и функции (пропускаются в объектах, превращаются в null в массивах).',
      en: 'Implement a simplified jsonStringify(value): serialize strings (quoted), numbers, booleans, null, arrays and objects. Handle undefined and functions correctly (skipped in objects, become null in arrays).'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Написать свой \`JSON.stringify\`. Сама рекурсия тут простая — проверяют **знание странностей спецификации**: почему \`undefined\` в массиве превращается в \`null\`, а в объекте ключ просто исчезает, и почему \`NaN\` сериализуется как \`null\`.

Аналогия: **экскурсовод по зданию**. Он обходит комнаты рекурсивно и описывает каждую словами. Если попадается комната, которую описать нельзя (служебное помещение), поведение зависит от контекста: в нумерованном списке комнат нельзя пропустить номер, поэтому пишем «закрыто», а в списке «название — описание» такую строчку просто не пишем.

## Идея решения по шагам

1. **Сначала \`null\`**: \`if (value === null) return 'null'\`. Обязательно первым, потому что дальше мы смотрим на \`typeof\`, а \`typeof null === 'object'\`.
2. Сохраняем \`const type = typeof value\` и разбираем примитивы:
   - число ⇒ \`Number.isFinite(value) ? String(value) : 'null'\`, потому что \`NaN\` и \`Infinity\` в JSON не существуют;
   - булево ⇒ \`String(value)\`;
   - строка ⇒ \`JSON.stringify(value)\`, чтобы даром получить кавычки и экранирование;
   - \`undefined\` или функция ⇒ возвращаем **сам \`undefined\`**, а не строку. Это сигнал «меня нельзя сериализовать».
3. **Массив**: сериализуем каждый элемент и подменяем несериализуемое: \`jsonStringify(v) ?? 'null'\`. Склеиваем через запятую и оборачиваем в квадратные скобки.
4. **Объект**: для каждой пары считаем \`serialized\`; если он \`undefined\` — возвращаем \`null\` вместо строки и потом отбрасываем через \`.filter(Boolean)\`. Иначе собираем строку вида ключ-двоеточие-значение, где ключ прогоняется через \`JSON.stringify\` ради кавычек.
5. Склеиваем пары через запятую и оборачиваем в фигурные скобки.

## Разбор кода

Центральная идея — **возврат \`undefined\` как сигнала**, а не как результата. Функция возвращает либо строку, либо \`undefined\`, означающее «этот узел в JSON не попадает». Именно поэтому обработка расходится: массив обязан сохранить длину и подставляет \`'null'\` через \`??\`, а объект просто выкидывает пару. Это и есть тот самый пункт спецификации, который любят спрашивать.

Проверка на \`null\` стоит **до** всех остальных, и это не стилистика. \`typeof null\` возвращает \`'object'\` — историческая ошибка JS, — так что без раннего выхода \`null\` уехал бы в ветку объектов и мы бы вызвали \`Object.entries(null)\`, получив исключение.

\`Number.isFinite\` вместо глобального \`isFinite\` — важная деталь: глобальный сначала приводит аргумент к числу, из-за чего \`isFinite('42')\` истинно. \`Number.isFinite\` не приводит ничего.

\`JSON.stringify(value)\` внутри собственного \`jsonStringify\` для строк — сознательный «чит» ради экранирования. Проговорите его вслух: вручную пришлось бы заменять \`"\`, обратный слэш, переводы строк, табы и управляющие символы через \`\\uXXXX\`. Интервьюер обычно разрешает, но хочет услышать, что вы понимаете, что именно спрятали.

\`?? 'null'\` в массиве, а не \`|| 'null'\`: \`??\` реагирует только на \`null\` и \`undefined\`, а \`||\` подменял бы и любую пустую строку, которую вернула бы сериализация. Разница между этими двумя операторами здесь принципиальна.

\`.filter(Boolean)\` отбрасывает \`null\`-заглушки от пропущенных пар. Приём безопасен, потому что валидная пара всегда непустая строка вида ключ-двоеточие-значение.

## Сложность и edge cases

- **Время:** O(n) по числу узлов дерева, каждый обходится один раз; плюс стоимость склейки строк. **Память:** O(n) на результат и O(глубина) на стек.
- \`undefined\` на верхнем уровне ⇒ функция возвращает \`undefined\` (не строку) — как нативный \`JSON.stringify\`.
- \`undefined\` и функция **в массиве** ⇒ \`null\`; **в объекте** ⇒ ключ исчезает. Любимый каверзный вопрос.
- \`NaN\` и \`Infinity\` ⇒ \`'null'\`.
- \`-0\` ⇒ \`'0'\`, как и в нативной реализации.
- Пустой массив ⇒ \`'[]'\`, пустой объект ⇒ \`'{}'\`.
- Циклические ссылки ⇒ бесконечная рекурсия и переполнение стека; нативный бросает \`TypeError\`.
- \`Date\` в этой упрощённой версии даст \`'{}'\`, потому что \`toJSON()\` не вызывается; нативный вернул бы ISO-строку.
- \`Symbol\` и \`BigInt\` не обработаны: они провалятся в ветку объектов и дадут \`'{}'\`; нативный пропускает символ и бросает \`TypeError\` на \`BigInt\`.
- \`Map\`/\`Set\` сериализуются как \`'{}'\` — и в нативной реализации тоже, это не баг.

## Как рассуждать вслух

> Уточню объём: поддерживаем ли \`Date\`, replacer и отступы — по умолчанию делаю базовую версию. Пишу рекурсию по типам, но первой строкой обязательно проверяю \`null\`, потому что \`typeof null\` это \`'object'\` и без этого он уедет в ветку объектов. Дальше примитивы: числа с проверкой на конечность, потому что \`NaN\` и \`Infinity\` в JSON не существуют и становятся \`null\`; строки прогоняю через нативный \`JSON.stringify\` ради экранирования. Ключевой момент: для \`undefined\` и функций возвращаю не строку, а сам \`undefined\` — это сигнал «узел не сериализуется». Дальше контекст решает: в массиве длина обязана сохраниться, поэтому подставляю \`null\`, а в объекте пару просто выбрасываю. Сложность линейная по числу узлов. Из подвохов назову циклические ссылки, на которых нативный бросает \`TypeError\`.

## Follow-up, которые зададут

- **Чем отличается \`undefined\` в массиве и в объекте?** — в массиве становится \`null\` (длина обязана сохраниться), в объекте ключ выбрасывается целиком.
- **Что нативный делает с \`Date\`?** — вызывает \`toJSON()\` и получает ISO-строку; чтобы повторить, нужно проверять наличие метода \`toJSON\` перед разбором объекта.
- **Как обработать циклические ссылки?** — вести \`WeakSet\` посещённых объектов и бросать \`TypeError\`, как нативный.
- **Почему \`NaN\` и \`Infinity\` становятся \`null\`?** — в спецификации JSON таких литералов просто нет.
- **Как реализовать второй и третий аргументы?** — replacer применяется к каждой паре до сериализации, а отступы требуют прокидывать текущий уровень вложенности.
- **Что с \`BigInt\` и \`Symbol\`?** — нативный бросает \`TypeError\` на \`BigInt\` и игнорирует \`Symbol\`; эта версия обе ситуации не покрывает.
- **Почему проверка \`null\` идёт первой?** — \`typeof null === 'object'\`, иначе \`Object.entries(null)\` бросит исключение.
- **Как экранировать строки вручную?** — заменять кавычку, обратный слэш и управляющие символы, остальное кодировать в \`\\uXXXX\`.
- **Как написать обратный \`JSON.parse\`?** — это уже полноценный парсер: токенизация плюс рекурсивный спуск.`,
      en: `## In short: what they're asking for

Write your own \`JSON.stringify\`. The recursion itself is easy — what's being tested is **knowledge of the spec's oddities**: why \`undefined\` inside an array becomes \`null\` while inside an object the key simply vanishes, and why \`NaN\` serialises as \`null\`.

Analogy: **a tour guide in a building**. They walk the rooms recursively and describe each one. When a room can't be described (a service closet), the behaviour depends on context: in a numbered list of rooms you can't skip a number, so you write "closed", whereas in a name-and-description list you just omit the line.

## The idea, step by step

1. **\`null\` first**: \`if (value === null) return 'null'\`. It must come first because everything after branches on \`typeof\`, and \`typeof null === 'object'\`.
2. Store \`const type = typeof value\` and handle the primitives:
   - number ⇒ \`Number.isFinite(value) ? String(value) : 'null'\`, because \`NaN\` and \`Infinity\` don't exist in JSON;
   - boolean ⇒ \`String(value)\`;
   - string ⇒ \`JSON.stringify(value)\`, which gives quoting and escaping for free;
   - \`undefined\` or function ⇒ return **the actual \`undefined\`**, not a string. That's the "I'm not serialisable" signal.
3. **Array**: serialise each element and substitute the unserialisable ones with \`jsonStringify(v) ?? 'null'\`. Join with commas and wrap in square brackets.
4. **Object**: compute \`serialized\` for each pair; if it's \`undefined\`, yield \`null\` instead of a string and drop it later with \`.filter(Boolean)\`. Otherwise build a key-colon-value string, running the key through \`JSON.stringify\` for the quotes.
5. Join the pairs with commas and wrap in braces.

## Walking through the code

The central idea is **returning \`undefined\` as a signal**, not as a result. The function returns either a string or \`undefined\` meaning "this node doesn't make it into the JSON". That's exactly why handling diverges: an array must preserve its length and substitutes \`'null'\` via \`??\`, while an object simply drops the pair. This is the very spec detail interviewers love to probe.

The \`null\` check comes **before** everything else, and that isn't style. \`typeof null\` returns \`'object'\` — a historical JS mistake — so without the early return \`null\` would fall into the object branch and \`Object.entries(null)\` would throw.

\`Number.isFinite\` rather than the global \`isFinite\` matters: the global one coerces its argument first, so \`isFinite('42')\` is true. \`Number.isFinite\` coerces nothing.

Calling \`JSON.stringify(value)\` for strings inside your own \`jsonStringify\` is a deliberate cheat for escaping. Say so out loud: doing it by hand means replacing \`"\`, backslashes, newlines, tabs and control characters with \`\\uXXXX\` escapes. Interviewers usually allow it but want to hear that you know what you hid.

\`?? 'null'\` in the array branch rather than \`|| 'null'\`: \`||\` would also replace a legitimately empty string, whereas \`??\` reacts only to \`null\` and \`undefined\`. That distinction is load-bearing here.

\`.filter(Boolean)\` drops the \`null\` placeholders left by skipped pairs. It's safe because a valid pair is always a non-empty key-colon-value string.

## Complexity and edge cases

- **Time:** O(n) over tree nodes, each visited once, plus the cost of joining strings. **Memory:** O(n) for the result and O(depth) for the stack.
- \`undefined\` at the top level ⇒ the function returns \`undefined\` (not a string), matching native \`JSON.stringify\`.
- \`undefined\` and functions **in an array** ⇒ \`null\`; **in an object** ⇒ the key disappears. The favourite trick question.
- \`NaN\` and \`Infinity\` ⇒ \`'null'\`.
- \`-0\` ⇒ \`'0'\`, same as native.
- An empty array ⇒ \`'[]'\`, an empty object ⇒ \`'{}'\`.
- Circular references ⇒ infinite recursion and a stack overflow; native throws a \`TypeError\`.
- A \`Date\` yields \`'{}'\` in this simplified version because \`toJSON()\` is never called; native would produce an ISO string.
- \`Symbol\` and \`BigInt\` aren't handled: they fall into the object branch and yield \`'{}'\`, whereas native skips symbols and throws a \`TypeError\` on \`BigInt\`.
- \`Map\`/\`Set\` serialise as \`'{}'\` — native does the same, so that's not a bug.

## How to think out loud

> I'd scope it first: do we support \`Date\`, \`toJSON\`, the replacer argument and indentation — by default I'll write the base version without them. It's a recursion over types, but the very first line must check \`null\`, because \`typeof null\` is \`'object'\` and otherwise it falls into the object branch. Then the primitives: numbers with a finiteness check, since \`NaN\` and \`Infinity\` don't exist in JSON and become \`null\`; strings I run through native \`JSON.stringify\` for escaping, and I'd say so openly. The key move: for \`undefined\` and functions I return the actual \`undefined\` rather than a string — that's the "this node isn't serialisable" signal. Then context decides: an array must preserve its length so I substitute \`null\`, while an object drops the pair entirely. Complexity is linear in the number of nodes. For gotchas I'd mention circular references, where native throws a \`TypeError\`.

## Follow-ups they'll ask

- **How does \`undefined\` differ between an array and an object?** — in an array it becomes \`null\` (length must be preserved), in an object the key is dropped entirely.
- **What does native do with a \`Date\`?** — it calls \`toJSON()\` and gets an ISO string; to match it, check for a \`toJSON\` method before walking the object.
- **How would you handle circular references?** — keep a \`WeakSet\` of visited objects and throw a \`TypeError\` like native does.
- **Why do \`NaN\` and \`Infinity\` become \`null\`?** — the JSON spec simply has no literals for them.
- **How would you implement the second and third arguments?** — the replacer runs on each pair before serialisation, and indentation requires threading the current nesting level through.
- **What about \`BigInt\` and \`Symbol\`?** — native throws a \`TypeError\` on \`BigInt\` and ignores \`Symbol\`; this version covers neither.
- **Why is the \`null\` check first?** — \`typeof null === 'object'\`, so otherwise \`Object.entries(null)\` throws.
- **How would you escape strings by hand?** — replace the quote, the backslash and control characters, encoding the rest as \`\\uXXXX\`.
- **How would you write the inverse \`JSON.parse\`?** — that's a full parser: tokenisation plus recursive descent.`
    },
    codeSnippet: `function jsonStringify(value) {
  if (value === null) return 'null';

  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (type === 'boolean') return String(value);
  if (type === 'string') return JSON.stringify(value); // escaping
  if (type === 'undefined' || type === 'function') return undefined;

  if (Array.isArray(value)) {
    const items = value.map((v) => jsonStringify(v) ?? 'null');
    return \`[\${items.join(',')}]\`;
  }

  const entries = Object.entries(value)
    .map(([k, v]) => {
      const serialized = jsonStringify(v);
      return serialized === undefined ? null : \`\${JSON.stringify(k)}:\${serialized}\`;
    })
    .filter(Boolean);
  return \`{\${entries.join(',')}}\`;
}`
  },
  {
    id: 'lc-040',
    category: 'live-coding',
    level: 'Medium',
    tags: ['classnames', 'clsx', 'utility'],
    question: {
      ru: 'Реализуйте утилиту classNames(...args) (аналог clsx): принимает строки, числа, объекты { className: boolean } и вложенные массивы; возвращает строку из классов с истинными значениями, разделённых пробелом. Пример: classNames("a", { b: true, c: false }, ["d"]) === "a b d".',
      en: 'Implement a classNames(...args) utility (clsx-like): accepts strings, numbers, objects { className: boolean }, and nested arrays; returns a space-separated string of truthy classes. Example: classNames("a", { b: true, c: false }, ["d"]) === "a b d".'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Утилита, которую каждый фронтендер использует ежедневно, но мало кто писал сам. Задача — собрать строку классов из разнородного мусора: строк, чисел, объектов вида «имя класса → включён ли он» и вложенных массивов. Приём — **перебор аргументов с разбором по типу и рекурсией для массивов**.

Аналогия: **сборы в поездку**. Вам сваливают в кучу вещи, списки вещей и списки списков. Вы разбираете кучу рекурсивно и кладёте в чемодан только то, напротив чего стоит галочка. Всё, что «выключено» или пустое, просто не берёте.

## Идея решения по шагам

1. Принимаем \`...args\` и заводим накопитель \`const classes = []\`.
2. Идём по аргументам \`for...of\`.
3. Первой строкой отсекаем мусор: \`if (!arg) continue\` — это разом убирает \`false\`, \`null\`, \`undefined\`, \`0\`, \`''\` и \`NaN\`.
4. Смотрим \`typeof arg\`:
   - строка или число ⇒ кладём как есть;
   - массив ⇒ рекурсивно \`classNames(...arg)\`, и результат кладём **только если он непустой**;
   - объект ⇒ идём по \`Object.entries\` и кладём **ключ**, если значение truthy.
5. Возвращаем \`classes.join(' ')\`.

## Разбор кода

Порядок проверок критичен: **\`Array.isArray\` обязан идти до ветки \`typeof === 'object'\`**, потому что для массива \`typeof\` тоже возвращает \`'object'\`. Поменяете местами — и массив уедет в объектную ветку, где \`Object.entries\` вернёт пары «индекс → элемент», и в классы попадут числа \`0\`, \`1\`, \`2\`.

\`if (!arg) continue\` в самом начале — это шесть проверок в одной строке. Именно она делает утилиту удобной: в JSX можно писать \`cond && 'active'\`, не заботясь о том, что при ложном условии прилетит \`false\`.

Побочный эффект того же \`!arg\`: число \`0\` отбрасывается как класс. \`clsx\` ведёт себя точно так же, и это осознанный компромисс, а не баг — но стоит проговорить.

\`if (inner)\` вокруг результата рекурсии защищает от **двойных пробелов**. Пустой массив вернёт пустую строку, и без проверки она попала бы в \`classes\`, а \`join(' ')\` склеил бы её в лишний разделитель — CSS не сломается, но строка станет грязной.

Рекурсия через \`classNames(...arg)\` красива и короткая, но у неё есть цена: спред раскладывает массив в **аргументы**, а их количество ограничено (порядка десятков тысяч). На реальных классах это недостижимо, но настоящий \`clsx\` ради производительности использует обычный цикл без спреда.

Значения объекта не приводятся и не проверяются на тип — важна только truthy-ность, поэтому \`{ active: someCount }\` работает ровно так, как ожидается.

## Сложность и edge cases

- **Время:** O(n) по суммарному числу токенов во всех аргументах и вложенных массивах — каждый посещается один раз. **Память:** O(n) на массив-накопитель плюс O(глубина) на стек рекурсии.
- Вызов без аргументов ⇒ пустая строка.
- Falsy-аргументы (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`, \`NaN\`) игнорируются.
- Число \`0\` не попадёт в классы из-за общей falsy-проверки — как и в \`clsx\`.
- Вложенные массивы любой глубины работают за счёт рекурсии.
- Пустой массив или объект без truthy-значений ⇒ ничего не добавляют и не создают лишних пробелов.
- Дубликаты классов **не** дедуплицируются — как в \`clsx\`; уточните, нужно ли.
- Порядок классов сохраняется в порядке аргументов, что важно для каскада CSS.
- \`undefined\` и функции внутри массива отсекаются той же falsy-проверкой (функция truthy — попадёт как \`[object Function]\`; на практике такого не передают).

## Как рассуждать вслух

> Уточню поддерживаемые типы: строки, числа, объекты-словари и вложенные массивы — этого набора хватает, чтобы повторить \`clsx\`. Прохожу аргументы циклом, первой же строкой отбрасываю всё falsy — это разом закрывает \`false\`, \`null\`, \`undefined\`, пустую строку и ноль, и именно благодаря этому в шаблоне можно спокойно писать условие через логическое И. Дальше разбор по типу: строки и числа кладу как есть, массивы обрабатываю рекурсией, а у объектов беру ключи, у которых значение истинно. Важная деталь: проверку на массив ставлю **до** проверки на объект, потому что \`typeof\` массива тоже \`'object'\`, и иначе в классы попадут индексы. В конце склеиваю через пробел. Сложность линейная по числу токенов. Дубликаты сознательно не убираю — \`clsx\` тоже этого не делает.

## Follow-up, которые зададут

- **Зачем это нужно в UI?** — условные классы без конкатенации строк и лестниц из тернарников в JSX или шаблонах.
- **Почему проверка на массив идёт раньше объекта?** — \`typeof []\` это \`'object'\`, и массив ушёл бы не в ту ветку, добавив в классы индексы.
- **Как дедуплицировать классы?** — \`[...new Set(classes)]\` перед \`join\`, но это лишний проход; \`clsx\` сознательно этого не делает.
- **Почему \`0\` не попадает в классы?** — общая falsy-проверка; такое же поведение у \`clsx\`, и это осознанный компромисс.
- **Чем это отличается от \`tailwind-merge\`?** — тот ещё и разрешает конфликты утилитарных классов, оставляя последний из группы; \`clsx\` просто склеивает.
- **Как избежать рекурсии со спредом?** — обычный цикл с явным стеком или рекурсия, принимающая массив напрямую; спред упирается в лимит аргументов.
- **Как типизировать это в TypeScript?** — рекурсивный тип \`type Value = string | number | null | undefined | boolean | Record<string, unknown> | Value[]\`.
- **Что если нужен другой разделитель или префикс?** — вынести в опции, но тогда теряется совместимость с \`clsx\` по сигнатуре.`,
      en: `## In short: what they're asking for

A utility every front-end developer uses daily yet few have written. The job is to build a class string out of a pile of mixed input: strings, numbers, objects shaped as "class name → is it on", and nested arrays. The technique is **iterating the arguments, dispatching on type, and recursing into arrays**.

Analogy: **packing for a trip**. People hand you items, lists of items, and lists of lists. You unpack the pile recursively and put into the suitcase only what has a tick next to it. Anything switched off or empty simply doesn't come along.

## The idea, step by step

1. Take \`...args\` and create an accumulator \`const classes = []\`.
2. Walk the arguments with \`for...of\`.
3. Filter junk on the first line: \`if (!arg) continue\` — that removes \`false\`, \`null\`, \`undefined\`, \`0\`, \`''\` and \`NaN\` in one go.
4. Dispatch on \`typeof arg\`:
   - string or number ⇒ push as-is;
   - array ⇒ recurse with \`classNames(...arg)\` and push the result **only if it's non-empty**;
   - object ⇒ walk \`Object.entries\` and push the **key** when the value is truthy.
5. Return \`classes.join(' ')\`.

## Walking through the code

Check order is critical: **\`Array.isArray\` must come before the \`typeof === 'object'\` branch**, because \`typeof\` also returns \`'object'\` for arrays. Swap them and an array falls into the object branch, where \`Object.entries\` yields index-to-element pairs and the numbers \`0\`, \`1\`, \`2\` end up as class names.

\`if (!arg) continue\` up front is six checks in one line. It's what makes the utility pleasant to use: in JSX you can write \`cond && 'active'\` without worrying that a false condition sends \`false\` through.

A side effect of that same \`!arg\`: the number \`0\` gets dropped as a class. \`clsx\` behaves identically, so it's a deliberate trade-off rather than a bug — but worth saying out loud.

The \`if (inner)\` guard around the recursion result prevents **double spaces**. An empty array returns an empty string, and without the guard it would land in \`classes\` and \`join(' ')\` would turn it into a stray separator — CSS survives, but the string gets dirty.

Recursing via \`classNames(...arg)\` is elegant and short, but it has a cost: the spread turns the array into **arguments**, and there's a limit on those (tens of thousands). Real class lists never get there, but the actual \`clsx\` uses a plain loop without a spread for performance.

Object values are neither coerced nor type-checked — only truthiness matters, so \`{ active: someCount }\` behaves exactly as you'd expect.

## Complexity and edge cases

- **Time:** O(n) over the total number of tokens across all arguments and nested arrays, each visited once. **Memory:** O(n) for the accumulator plus O(depth) for the recursion stack.
- No arguments ⇒ an empty string.
- Falsy arguments (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`, \`NaN\`) are ignored.
- The number \`0\` never becomes a class because of the blanket falsy check — same as \`clsx\`.
- Nested arrays of any depth work thanks to the recursion.
- An empty array or an object with no truthy values contributes nothing and creates no stray spaces.
- Duplicate classes are **not** deduplicated, as in \`clsx\`; clarify whether that's wanted.
- Class order follows argument order, which matters for the CSS cascade.
- \`undefined\` inside arrays is removed by the same falsy check (a function is truthy and would land as \`[object Function]\`, though nobody passes those in practice).

## How to think out loud

> I'd confirm the supported types: strings, numbers, dictionary objects and nested arrays — that set is enough to reproduce \`clsx\`. I loop over the arguments and drop everything falsy on the very first line, which covers \`false\`, \`null\`, \`undefined\`, the empty string and zero at once, and that's precisely what lets you write a logical-AND condition inline in a template. Then I dispatch on type: strings and numbers go in as-is, arrays go through recursion, and for objects I take the keys whose values are truthy. One important detail: the array check goes **before** the object check, because \`typeof\` an array is also \`'object'\`, and otherwise the indices would end up as class names. Finally I join with spaces. Complexity is linear in the number of tokens. I deliberately don't dedupe — \`clsx\` doesn't either.

## Follow-ups they'll ask

- **Why is this useful in UI?** — conditional classes without string concatenation and ladders of ternaries in JSX or templates.
- **Why does the array check come before the object one?** — \`typeof []\` is \`'object'\`, so the array would take the wrong branch and add indices as classes.
- **How would you dedupe classes?** — \`[...new Set(classes)]\` before the \`join\`, at the cost of an extra pass; \`clsx\` deliberately skips it.
- **Why doesn't \`0\` become a class?** — the blanket falsy check; \`clsx\` behaves the same way, and it's a conscious trade-off.
- **How does this differ from \`tailwind-merge\`?** — that one also resolves conflicts between utility classes, keeping the last of a group; \`clsx\` merely concatenates.
- **How would you avoid recursing with a spread?** — a plain loop with an explicit stack, or a recursion that takes the array directly; the spread hits the argument-count limit.
- **How would you type this in TypeScript?** — a recursive type: \`type Value = string | number | null | undefined | boolean | Record<string, unknown> | Value[]\`.
- **What if you need a different separator or prefix?** — move it into options, though that breaks signature compatibility with \`clsx\`.`
    },
    codeSnippet: `function classNames(...args) {
  const classes = [];
  for (const arg of args) {
    if (!arg) continue;
    const type = typeof arg;
    if (type === 'string' || type === 'number') {
      classes.push(arg);
    } else if (Array.isArray(arg)) {
      const inner = classNames(...arg);
      if (inner) classes.push(inner);
    } else if (type === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

// classNames('a', { b: true, c: false }, ['d']); // 'a b d'`
  },
  {
    id: 'lc-041',
    category: 'live-coding',
    level: 'Hard',
    tags: ['intersection-observer', 'infinite-scroll', 'dom'],
    question: {
      ru: 'Реализуйте бесконечную прокрутку (infinite scroll) с IntersectionObserver: когда «sentinel»-элемент в конце списка появляется во вьюпорте, подгружается следующая страница данных. Защититесь от повторных одновременных загрузок.',
      en: 'Implement infinite scroll with IntersectionObserver: when a "sentinel" element at the end of the list enters the viewport, the next page of data is loaded. Guard against duplicate concurrent loads.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Подгрузка следующей страницы, когда пользователь долистал до конца списка. Правильный ответ в 2020-х — **не слушать \`scroll\`, а поставить в конец списка невидимый элемент-«растяжку» (sentinel) и наблюдать за ним через \`IntersectionObserver\`**. Второй по важности пункт — защита от дублирующихся загрузок.

Аналогия: **датчик на конвейере**. Вместо того чтобы каждую секунду бегать и измерять линейкой, сколько осталось до края, вы ставите один фотоэлемент в конце ленты. Он сам пискнет, когда до него доедут. А чтобы не запустить два одинаковых заказа на новую партию, вешаете табличку «заказ уже в пути».

## Идея решения по шагам

1. Принимаем \`sentinel\` (DOM-узел в конце списка), \`loadMore\` (асинхронная функция, возвращающая «есть ли ещё данные») и опции с \`rootMargin\`.
2. Заводим два флага в замыкании: \`loading\` — «запрос уже летит» и \`done\` — «данные кончились».
3. Создаём \`new IntersectionObserver(callback, { rootMargin })\`.
4. В колбэке берём \`entries[0]\` — наблюдаем ровно один элемент.
5. Ранний выход: \`if (!entry.isIntersecting || loading || done) return\`. Три условия сразу отсекают уход элемента из вьюпорта, параллельную загрузку и исчерпанный список.
6. Ставим \`loading = true\`, в \`try\` вызываем \`await loadMore()\`.
7. Если вернулось «больше нет» — \`done = true\` и \`observer.disconnect()\`.
8. В \`finally\` обязательно \`loading = false\` — иначе одна сетевая ошибка навсегда заблокирует подгрузку.
9. Запускаем наблюдение \`observer.observe(sentinel)\` и **возвращаем функцию очистки** \`() => observer.disconnect()\`.

## Разбор кода

Два флага решают **две разные** задачи, и объединять их нельзя. \`loading\` временный и защищает от гонки: колбэк может сработать несколько раз, пока первый запрос ещё летит. \`done\` постоянный и говорит «список закончился». Без \`loading\` быстрый скролл легко выстрелит три одинаковых запроса подряд.

\`try/finally\` вокруг \`await\` — не формальность. Если \`loadMore\` бросит (сеть отвалилась), без \`finally\` флаг \`loading\` навсегда останется \`true\`, и подгрузка молча умрёт. \`finally\` возвращает систему в рабочее состояние даже после ошибки.

Неочевидное: внутри колбэка используется переменная \`observer\`, которая объявляется **этой же** инструкцией \`const\`. Это работает, потому что колбэк вызывается позже, когда инициализация уже завершилась и временная мёртвая зона пройдена. На доске стоит сказать это вслух — выглядит как ошибка, но ею не является.

\`rootMargin: '200px'\` расширяет область наблюдения на 200 пикселей **за** границу вьюпорта: загрузка стартует до того, как пользователь реально доскроллил, и он не видит спиннер. Это дешёвый способ сделать скролл плавным.

\`entries[0]\` безопасно только потому, что мы наблюдаем ровно один элемент. Наблюдали бы несколько — пришлось бы перебирать массив.

Возврат функции очистки — обязательная часть контракта. Без \`disconnect()\` наблюдатель держит ссылку на DOM-узел и колбэк, и после размонтирования компонента это утечка памяти.

## Сложность и edge cases

- **Время:** O(1) на срабатывание колбэка — вся работа сводится к проверке флагов; сами вычисления пересечений браузер делает вне основного потока и батчит. **Память:** O(1) — два флага и один наблюдатель.
- Гонка: без флага \`loading\` несколько срабатываний запустят дубликаты запросов — защита обязательна.
- Ошибка сети: \`finally\` возвращает \`loading = false\`, иначе список «залипнет» навсегда.
- Данные кончились ⇒ \`done = true\` плюс \`disconnect()\`, чтобы не тратить ресурсы.
- Размонтирование компонента ⇒ вызвать возвращённую функцию очистки, иначе утечка.
- **Короткая страница:** если после загрузки sentinel всё ещё во вьюпорте, повторного колбэка может не быть — пересечение не менялось. Лечится проверкой после загрузки или подгрузкой, пока страница не заполнится.
- \`sentinel\` должен быть **после** списка в DOM и иметь ненулевую высоту, иначе наблюдение бессмысленно.
- Скролл внутри контейнера, а не окна ⇒ передавайте \`root\` в опциях наблюдателя.
- Быстрый скролл до конца ⇒ пользователь может «перепрыгнуть» несколько страниц; помогает больший \`rootMargin\`.

## Как рассуждать вслух

> Сначала уточню, скроллится окно или контейнер и что возвращает \`loadMore\`. Дальше главное архитектурное решение: не вешаю слушатель \`scroll\`, потому что он срабатывает десятки раз в секунду, требует throttle и вызывает \`getBoundingClientRect\`, который дёргает layout. Вместо этого ставлю в конец списка невидимый sentinel и наблюдаю за ним через \`IntersectionObserver\` — браузер считает пересечения сам, вне основного потока. Внутри колбэка держу два флага: \`loading\` защищает от параллельных запросов при быстром скролле, \`done\` окончательно отключает наблюдение, когда данные закончились. Сброс \`loading\` кладу в \`finally\`, иначе одна ошибка сети заблокирует подгрузку навсегда. Через \`rootMargin\` начинаю грузить за 200 пикселей до края. И обязательно возвращаю функцию очистки с \`disconnect\`.

## Follow-up, которые зададут

- **Чем это лучше слушателя \`scroll\`?** — не грузит основной поток, не требует throttle, не заставляет считать \`getBoundingClientRect\` и не вызывает принудительный reflow.
- **Зачем \`rootMargin\`?** — расширяет зону срабатывания за границу экрана, чтобы данные подгружались заранее и спиннер не мелькал.
- **Что если после загрузки sentinel всё ещё виден?** — колбэк может не сработать повторно; проверяйте состояние после загрузки или грузите в цикле, пока страница не заполнится.
- **Как обработать ошибку загрузки?** — \`catch\` с показом кнопки «повторить»; \`finally\` в любом случае снимает \`loading\`.
- **Как быть со скроллом внутри контейнера?** — передать \`root: container\` в опции наблюдателя.
- **Чем это отличается от виртуализации?** — infinite scroll добавляет элементы в DOM бесконечно; виртуализация рендерит только видимые. На больших списках нужны обе.
- **Зачем \`threshold\`?** — задаёт долю видимости для срабатывания; здесь достаточно значения по умолчанию.
- **Что с восстановлением позиции при возврате назад?** — нужно сохранять число загруженных страниц и позицию скролла, иначе пользователь окажется в начале.
- **Как это оформить в Angular или React?** — обёртка в директиву или хук, где возвращённая функция очистки вызывается в \`ngOnDestroy\` или в cleanup эффекта.`,
      en: `## In short: what they're asking for

Load the next page when the user scrolls to the end of the list. The modern answer is **not to listen to \`scroll\` at all, but to place an invisible sentinel element at the end of the list and watch it with an \`IntersectionObserver\`**. The second most important part is guarding against duplicate loads.

Analogy: **a sensor on a conveyor belt**. Instead of running over with a ruler every second to measure the distance to the edge, you install one photocell at the end of the belt. It beeps by itself when something reaches it. And to avoid placing two identical orders for a new batch, you hang up a sign saying "order already on its way".

## The idea, step by step

1. Take a \`sentinel\` (a DOM node at the end of the list), \`loadMore\` (an async function returning whether more data exists) and options with \`rootMargin\`.
2. Keep two closure flags: \`loading\` — "a request is in flight" — and \`done\` — "the data ran out".
3. Create \`new IntersectionObserver(callback, { rootMargin })\`.
4. In the callback take \`entries[0]\` — we observe exactly one element.
5. Early return: \`if (!entry.isIntersecting || loading || done) return\`. Three conditions at once cover leaving the viewport, a concurrent load and an exhausted list.
6. Set \`loading = true\` and, inside \`try\`, \`await loadMore()\`.
7. If it reports "no more", set \`done = true\` and call \`observer.disconnect()\`.
8. In \`finally\` always reset \`loading = false\` — otherwise a single network error blocks loading forever.
9. Start observing with \`observer.observe(sentinel)\` and **return a cleanup function** \`() => observer.disconnect()\`.

## Walking through the code

The two flags solve **two different** problems and must not be merged. \`loading\` is temporary and guards the race: the callback can fire several times while the first request is still in flight. \`done\` is permanent and means "the list is exhausted". Without \`loading\`, fast scrolling easily fires three identical requests in a row.

The \`try/finally\` around the \`await\` isn't ceremony. If \`loadMore\` throws (the network drops), without \`finally\` the \`loading\` flag stays \`true\` forever and loading silently dies. \`finally\` restores a working state even after a failure.

The non-obvious bit: the callback uses the \`observer\` variable declared by that very same \`const\` statement. It works because the callback runs later, once initialisation has completed and the temporal dead zone has passed. Say that out loud at the whiteboard — it looks like a bug and isn't one.

\`rootMargin: '200px'\` extends the observation area 200 pixels **beyond** the viewport edge: loading starts before the user has actually reached the bottom, so they never see a spinner. It's a cheap way to make scrolling feel smooth.

\`entries[0]\` is safe only because we observe exactly one element. With several targets you'd have to iterate the array.

Returning a cleanup function is a mandatory part of the contract. Without \`disconnect()\` the observer holds references to the DOM node and the callback, which leaks memory after the component unmounts.

## Complexity and edge cases

- **Time:** O(1) per callback — the work is just a flag check; the intersection maths itself is done by the browser off the main thread and batched. **Memory:** O(1) — two flags and one observer.
- Race: without the \`loading\` flag multiple fires trigger duplicate requests — the guard is mandatory.
- Network error: \`finally\` resets \`loading = false\`, otherwise the list gets stuck forever.
- Data exhausted ⇒ \`done = true\` plus \`disconnect()\` so nothing keeps running.
- Component unmount ⇒ call the returned cleanup function or you leak.
- **Short page:** if the sentinel is still in the viewport after a load, the callback may not fire again — the intersection state never changed. Fix it by re-checking after each load, or loading until the page fills.
- The \`sentinel\` must sit **after** the list in the DOM and have non-zero height, otherwise observing it is pointless.
- Scrolling inside a container rather than the window ⇒ pass \`root\` in the observer options.
- A fast flick to the bottom may skip several pages; a larger \`rootMargin\` helps.

## How to think out loud

> First I'd clarify whether the window or an inner container scrolls, and what \`loadMore\` returns — I need a "are there more pages" signal. Then the key architectural decision: I don't attach a \`scroll\` listener, because it fires dozens of times a second, needs throttling and tends to call \`getBoundingClientRect\`, which forces layout. Instead I put an invisible sentinel at the end of the list and observe it with an \`IntersectionObserver\` — the browser computes intersections itself, off the main thread, and calls back only when the state actually changes. Inside the callback I keep two flags: \`loading\` guards against concurrent requests during fast scrolling, and \`done\` permanently stops observing once the data runs out. I reset \`loading\` in a \`finally\`, otherwise one network error would block loading forever. Via \`rootMargin\` I start fetching 200 pixels before the edge so the user never sees a spinner. And I always return a cleanup function that calls \`disconnect\`.

## Follow-ups they'll ask

- **Why is this better than a \`scroll\` listener?** — it doesn't load the main thread, needs no throttling, avoids \`getBoundingClientRect\` and never forces a reflow.
- **Why \`rootMargin\`?** — it extends the trigger zone beyond the screen edge so data arrives early and the spinner never flashes.
- **What if the sentinel is still visible after a load?** — the callback may not fire again; re-check after each load or keep loading until the page fills.
- **How do you handle a failed load?** — a \`catch\` that shows a retry button; \`finally\` clears \`loading\` either way.
- **What about scrolling inside a container?** — pass \`root: container\` in the observer options.
- **How does this differ from virtualisation?** — infinite scroll keeps appending nodes to the DOM; virtualisation renders only the visible ones. Large lists need both.
- **What is \`threshold\` for?** — it sets what fraction of visibility triggers the callback; the default is fine here.
- **What about restoring position on back navigation?** — you must persist the number of loaded pages and the scroll offset, otherwise the user lands back at the top.
- **How would you wrap this in Angular or React?** — as a directive or hook where the returned cleanup runs in \`ngOnDestroy\` or the effect's cleanup.`
    },
    codeSnippet: `function setupInfiniteScroll(sentinel, loadMore, { rootMargin = '200px' } = {}) {
  let loading = false;
  let done = false;

  const observer = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || loading || done) return;
      loading = true;
      try {
        const hasMore = await loadMore();
        if (!hasMore) {
          done = true;
          observer.disconnect();
        }
      } finally {
        loading = false;
      }
    },
    { rootMargin }
  );

  observer.observe(sentinel);
  return () => observer.disconnect(); // cleanup
}`
  },
  {
    id: 'lc-042',
    category: 'live-coding',
    level: 'Medium',
    tags: ['state-store', 'subscribe', 'observer'],
    question: {
      ru: 'Реализуйте минимальный state store (как Redux/Zustand-ядро): createStore(initialState) с методами getState(), setState(partial | updater) и subscribe(listener). setState уведомляет подписчиков; subscribe возвращает функцию отписки.',
      en: 'Implement a minimal state store (a Redux/Zustand-style core): createStore(initialState) with getState(), setState(partial | updater) and subscribe(listener). setState notifies subscribers; subscribe returns an unsubscribe function.'
    },
    answer: {
      ru: `## Коротко: что от вас хотят

Ядро Redux или Zustand в двадцать строк. Три метода: прочитать состояние, изменить его и подписаться на изменения. Приём — **замыкание над состоянием плюс паттерн «наблюдатель»**: список подписчиков, которых дёргают после каждого изменения.

Аналогия: **рассылка новостей**. Редакция хранит текущий выпуск (\`state\`), у неё есть список подписчиков (\`listeners\`). Как только выходит новый выпуск, письмо уходит всем сразу. А подписка возвращает не «билет», а **готовую кнопку «отписаться»** — это удобнее, чем помнить, кого и как потом удалять.

## Идея решения по шагам

1. В замыкании держим \`let state = initialState\` и \`const listeners = new Set()\`. \`Set\`, а не массив: удаление за O(1) и защита от случайной двойной подписки.
2. \`getState = () => state\` — просто возвращает текущую ссылку.
3. \`setState(partial)\`:
   - разбираем форму аргумента: \`const next = typeof partial === 'function' ? partial(state) : partial\` — так поддерживаются оба вызова, объектом и функцией-апдейтером;
   - мержим **иммутабельно**: \`state = { ...state, ...next }\` — обязательно новый объект;
   - оповещаем: \`[...listeners].forEach(listener => listener(state))\`.
4. \`subscribe(listener)\`: \`listeners.add(listener)\` и **возвращаем** \`() => listeners.delete(listener)\`.
5. Возвращаем наружу объект \`{ getState, setState, subscribe }\`. Само \`state\` наружу не отдаём — только через геттер.

## Разбор кода

\`typeof partial === 'function'\` — та самая развилка, которая делает API удобным. Объектная форма годится, когда новое значение не зависит от старого. Функциональная обязательна, когда зависит: два подряд идущих \`setState(s => ({ count: s.count + 1 }))\` дадут \`+2\`, потому что апдейтер получает **актуальное** состояние на момент вызова, а не значение, захваченное раньше.

\`state = { ...state, ...next }\` создаёт **новый объект** — это не про красоту, а про работоспособность. Вьюхи и мемоизация сравнивают состояние по ссылке; мутируй мы старый объект, ссылка не изменилась бы и ни один \`OnPush\` или \`memo\` не перерисовался бы. Обратная сторона — мерж **поверхностный**: вложенный объект заменяется целиком, а не сливается.

\`[...listeners]\` перед \`forEach\` — снимок, и это не лишняя аллокация. Если подписчик внутри своего колбэка вызовет отписку (типичный сценарий: компонент размонтируется в ответ на изменение), модификация \`Set\` прямо во время итерации по нему приведёт к пропуску или непредсказуемому обходу. Копия делает проход безопасным.

\`subscribe\` возвращает **функцию отписки**, а не \`unsubscribe(listener)\` отдельным методом. Так подписчику не нужно хранить ссылку на самого себя, и цепочка идеально ложится в \`useEffect\` и \`ngOnDestroy\`.

\`Set\` вместо массива даёт O(1) на удаление вместо \`indexOf\` плюс \`splice\`. Побочный эффект: одна и та же функция, подписанная дважды, окажется в наборе один раз — обычно это желаемое поведение, но упомянуть стоит.

Здесь нет сравнения старого и нового состояния: подписчики получают уведомление даже когда фактически ничего не поменялось. Это первое, что стоит признать вслух как известное ограничение.

## Сложность и edge cases

- **Время:** \`getState\` и \`subscribe\` — O(1); \`setState\` — O(k) от числа подписчиков плюс O(размер состояния) на поверхностный спред. **Память:** O(k) на подписчиков плюс копия при каждом обновлении.
- Иммутабельность: всегда новый объект состояния, иначе сравнение по ссылке во вьюхах перестанет работать.
- Отписка во время уведомления — спасает итерация по копии \`Set\`.
- Апдейтер должен получать актуальное состояние — важно для последовательных вызовов.
- Одинаковое значение ⇒ подписчики всё равно уведомляются; нужна проверка \`Object.is\` или сравнение срезов.
- Вложенные объекты: мерж поверхностный, \`{ user: { name } }\` затрёт весь \`user\` целиком.
- Ошибка внутри одного подписчика прервёт \`forEach\` и остальные не получат уведомление — оберните вызов в \`try/catch\`.
- \`setState\` внутри подписчика ⇒ рекурсивное оповещение вплоть до переполнения стека; в проде такое обычно запрещают.
- Одна и та же функция, подписанная дважды, хранится в \`Set\` один раз, и одна отписка удалит её полностью.

## Как рассуждать вслух

> Уточню, нужен ли reducer или достаточно прямого \`setState\`, и нужны ли селекторы. Дальше строю ядро на замыкании: держу \`state\` и \`Set\` подписчиков внутри функции, наружу отдаю только три метода. В \`setState\` поддерживаю обе формы аргумента: объект, когда новое значение не зависит от старого, и функцию-апдейтер, когда зависит — она получает актуальное состояние, поэтому два инкремента подряд отработают корректно. Мержу всегда в новый объект, потому что вьюхи и мемоизация сравнивают состояние по ссылке. Оповещаю по копии \`Set\`, а не по нему самому: подписчик может отписаться прямо в колбэке, и модификация коллекции во время обхода сломала бы итерацию. \`subscribe\` возвращает готовую функцию отписки для вызова при размонтировании. Уведомление стоит O(числа подписчиков), остальное константно.

## Follow-up, которые зададут

- **Как добавить селекторы и точечные подписки?** — подписчик получает состояние, сам вычисляет срез и сравнивает его с прошлым; так устроен Zustand с \`equalityFn\`.
- **Где здесь reducer?** — это редакс-вариант: \`setState\` заменяется на \`dispatch(action)\` плюс чистая функция \`reducer(state, action)\`.
- **Почему \`Set\`, а не массив?** — удаление за O(1) вместо \`indexOf\` и \`splice\`, плюс защита от дублей.
- **Зачем копировать \`Set\` перед обходом?** — подписчик может отписаться прямо в колбэке, а изменение коллекции во время итерации по ней небезопасно.
- **Как не уведомлять, если ничего не изменилось?** — сравнивать до и после (\`Object.is\` по срезу или поверхностное сравнение) и звать подписчиков только при реальном изменении.
- **Как поддержать вложенные обновления?** — либо глубокий мерж, либо immer с черновиком, либо явно требовать полный срез от вызывающего.
- **Как добавить middleware вроде логгера?** — обернуть \`setState\` цепочкой функций, каждая из которых вызывает следующую.
- **Что если подписчик бросит исключение?** — сейчас оповещение прервётся; в проде каждый вызов оборачивают в \`try/catch\`.
- **Как это связать с Angular?** — обернуть в сервис и выставить наружу сигнал или \`BehaviorSubject\`, подписавшись на стор один раз.
- **Как поддержать асинхронность?** — она живёт снаружи: дождались ответа и вызвали \`setState\`; сам стор остаётся синхронным.`,
      en: `## In short: what they're asking for

The core of Redux or Zustand in twenty lines. Three methods: read the state, change it, subscribe to changes. The technique is **a closure over the state plus the observer pattern**: a list of subscribers notified after every change.

Analogy: **a newsletter**. The editors keep the current issue (\`state\`) and a subscriber list (\`listeners\`). The moment a new issue comes out, it goes to everyone at once. And subscribing hands you back not a ticket but **a ready-made unsubscribe button** — far handier than remembering who to remove and how.

## The idea, step by step

1. In the closure keep \`let state = initialState\` and \`const listeners = new Set()\`. A \`Set\` rather than an array: O(1) removal and protection against accidental double subscription.
2. \`getState = () => state\` — simply returns the current reference.
3. \`setState(partial)\`:
   - detect the argument shape: \`const next = typeof partial === 'function' ? partial(state) : partial\`, which supports both the object and updater-function calls;
   - merge **immutably**: \`state = { ...state, ...next }\` — always a new object;
   - notify: \`[...listeners].forEach(listener => listener(state))\`.
4. \`subscribe(listener)\`: \`listeners.add(listener)\` and **return** \`() => listeners.delete(listener)\`.
5. Return \`{ getState, setState, subscribe }\`. The \`state\` itself never escapes — only through the getter.

## Walking through the code

\`typeof partial === 'function'\` is the fork that makes the API pleasant. The object form is fine when the new value doesn't depend on the old one. The function form is mandatory when it does: two consecutive \`setState(s => ({ count: s.count + 1 }))\` calls add up to \`+2\`, because the updater receives the **current** state at call time rather than a value captured earlier.

\`state = { ...state, ...next }\` creates a **new object**, and that's about correctness, not elegance. Views and memoization compare state by reference; if we mutated the old object the reference wouldn't change and no \`OnPush\` or \`memo\` would ever re-render. The flip side is that the merge is **shallow**: a nested object is replaced wholesale rather than merged.

\`[...listeners]\` before the \`forEach\` is a snapshot, not a wasted allocation. If a subscriber unsubscribes from inside its own callback (the classic case: a component unmounts in response to a change), mutating the \`Set\` while iterating it can skip entries or iterate unpredictably. The copy makes the pass safe.

\`subscribe\` returns an **unsubscribe function** rather than exposing a separate \`unsubscribe(listener)\`. That way the subscriber never needs a reference to itself, and it plugs straight into \`useEffect\` and \`ngOnDestroy\`.

A \`Set\` instead of an array gives O(1) removal rather than \`indexOf\` plus \`splice\`. Side effect: the same function subscribed twice is stored once — usually the desired behaviour, but worth mentioning.

There's no comparison between old and new state here: subscribers are notified even when nothing actually changed. That's the first limitation to acknowledge out loud.

## Complexity and edge cases

- **Time:** \`getState\` and \`subscribe\` are O(1); \`setState\` is O(k) in the number of subscribers plus O(state size) for the shallow spread. **Memory:** O(k) for subscribers plus one copy per update.
- Immutability: always a new state object, or reference comparison in views stops working.
- Unsubscribing during a notification is handled by iterating a copy of the \`Set\`.
- The updater must receive the current state — this matters for consecutive calls.
- Setting an identical value still notifies everyone; you'd need an \`Object.is\` check or slice comparison.
- Nested objects: the merge is shallow, so \`{ user: { name } }\` wipes out the entire \`user\`.
- An exception inside one subscriber aborts the \`forEach\` and the rest never hear about it — wrap each call in \`try/catch\`.
- Calling \`setState\` inside a subscriber ⇒ recursive notification up to a stack overflow; production stores usually forbid it.
- The same function subscribed twice is stored once in the \`Set\`, and a single unsubscribe removes it entirely.

## How to think out loud

> I'd check whether a reducer is required or a direct \`setState\` is enough, and whether selectors are needed. Then I build the core on a closure: \`state\` and a \`Set\` of subscribers live inside the function, and only three methods escape, so nobody can corrupt the state directly. In \`setState\` I support both argument shapes: an object when the new value doesn't depend on the old one, and an updater function when it does — the updater gets the current state, so two consecutive increments behave correctly. I always merge into a new object, because views and memoization compare state by reference. I notify over a copy of the \`Set\` rather than the set itself: a subscriber may well unsubscribe inside its own callback, and mutating a collection while iterating it would break the pass. \`subscribe\` returns a ready-made unsubscribe function, which is convenient to call on unmount. Notification costs O(number of subscribers); everything else is constant.

## Follow-ups they'll ask

- **How would you add selectors and targeted subscriptions?** — the subscriber receives the state, derives its slice and compares it with the previous one; that's how Zustand's \`equalityFn\` works.
- **Where's the reducer here?** — that's the Redux flavour: replace \`setState\` with \`dispatch(action)\` plus a pure \`reducer(state, action)\`.
- **Why a \`Set\` rather than an array?** — O(1) removal instead of \`indexOf\` and \`splice\`, plus protection against duplicates.
- **Why copy the \`Set\` before iterating?** — a subscriber may unsubscribe inside its callback, and mutating a collection while iterating it isn't safe.
- **How do you avoid notifying when nothing changed?** — compare before and after (\`Object.is\` on a slice or a shallow comparison) and only call subscribers on a real change.
- **How would you support nested updates?** — a deep merge, immer with a draft, or requiring the caller to pass the full slice explicitly.
- **How would you add middleware such as a logger?** — wrap \`setState\` in a chain of functions where each one calls the next.
- **What if a subscriber throws?** — right now notification aborts; production stores wrap each call in \`try/catch\`.
- **How does this bind to Angular?** — wrap it in a service exposing a signal or a \`BehaviorSubject\`, subscribing to the store once.
- **How do you support async?** — it lives outside: await the response and then call \`setState\`; the store itself stays synchronous.`
    },
    codeSnippet: `function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  const getState = () => state;

  const setState = (partial) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
    [...listeners].forEach((listener) => listener(state));
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, subscribe };
}

// const store = createStore({ count: 0 });
// store.subscribe((s) => console.log(s.count));
// store.setState((s) => ({ count: s.count + 1 }));`
  }
];
