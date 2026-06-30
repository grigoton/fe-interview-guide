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
      ru: `## Идея

\`debounce\` группирует частые вызовы в один. Закрываем таймер в замыкании; каждый вызов сбрасывает предыдущий \`setTimeout\`.

- **leading** — выполнить на первом вызове, пока «тихий» период не начался.
- **trailing** — выполнить после паузы (поведение по умолчанию).
- Сохраняем \`this\` и аргументы последнего вызова.

## Сложность

O(1) на вызов, память O(1).

## Edge cases

- \`leading && trailing\` — при одиночном вызове не должно быть двойного срабатывания. Флаг \`lastArgs\` помогает не вызывать trailing, если уже сработал leading и больше вызовов не было.
- \`cancel()\` должен очищать таймер и сбрасывать состояние.

## Follow-up интервьюера

«Чем debounce отличается от throttle?» — throttle гарантирует вызов раз в N мс, debounce — только после паузы. «Как вернуть результат вызова?» — обычно debounce ничего не возвращает; для значения используют промис, который резолвится при срабатывании trailing.`,
      en: `## Idea

\`debounce\` collapses bursts of calls into one. Keep the timer in a closure; each call clears the previous \`setTimeout\`.

- **leading** — run on the first call before the quiet period starts.
- **trailing** — run after the pause (default behaviour).
- Preserve \`this\` and the latest arguments.

## Complexity

O(1) per call, O(1) memory.

## Edge cases

- \`leading && trailing\` must not double-fire on a single call. Tracking \`lastArgs\` avoids a trailing call when leading already fired and nothing followed.
- \`cancel()\` must clear the timer and reset state.

## Interviewer follow-up

"How is debounce different from throttle?" — throttle guarantees a call every N ms; debounce fires only after a pause. "How do you return the result?" — debounce usually returns nothing; expose a promise resolved on the trailing call if a value is needed.`
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
      ru: `## Идея

Запоминаем время последнего вызова. Если прошло больше \`wait\` — вызываем сразу; иначе планируем отложенный вызов на остаток окна, сохраняя последние аргументы.

## Сложность

O(1) на вызов, O(1) память.

## Edge cases

- Без trailing-логики «хвостовое» событие теряется — частая ошибка на собеседовании.
- Сбрасывать \`lastArgs\` после срабатывания, иначе будет лишний вызов.

## Follow-up интервьюера

«Реализуйте через requestAnimationFrame для скролла» — это привязывает частоту к кадрам (~60fps) и избегает рассинхрона с рендером. «Как объединить leading/trailing в одну реализацию с debounce?» — Lodash так и делает: debounce с maxWait == throttle.`,
      en: `## Idea

Track the timestamp of the last run. If more than \`wait\` has passed, run immediately; otherwise schedule a trailing call for the remaining window, keeping the latest args.

## Complexity

O(1) per call, O(1) memory.

## Edge cases

- Without trailing logic the final event is dropped — a common interview miss.
- Reset \`lastArgs\` after firing or you get an extra call.

## Interviewer follow-up

"Implement it with requestAnimationFrame for scrolling" — that ties the rate to frames (~60fps) and avoids desync with paint. "How do throttle and debounce unify?" — Lodash treats throttle as debounce with maxWait.`
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
      ru: `## Идея

Создаём новый промис. Заводим счётчик завершённых и массив результатов нужной длины. Каждый элемент оборачиваем в \`Promise.resolve\`, чтобы поддержать «сырые» значения, и пишем результат по индексу — порядок сохраняется независимо от скорости.

## Сложность

O(n) по времени и памяти.

## Edge cases

- Пустой массив → немедленный resolve с \`[]\`.
- Первый reject «закорачивает» всё (но остальные промисы продолжают исполняться — отменить их нельзя).
- Не-thenable значения должны проходить через \`Promise.resolve\`.

## Follow-up интервьюера

«Чем отличается от allSettled?» — allSettled никогда не реджектится. «Что с порядком?» — \`all\` гарантирует порядок входа, не порядок завершения.`,
      en: `## Idea

Create a new promise. Keep a completed counter and a results array of the right length. Wrap each item in \`Promise.resolve\` to support raw values and write each result by index — order is preserved regardless of timing.

## Complexity

O(n) time and memory.

## Edge cases

- Empty array → resolves immediately with \`[]\`.
- The first reject short-circuits (other promises keep running — you cannot cancel them).
- Non-thenable values must go through \`Promise.resolve\`.

## Interviewer follow-up

"How is it different from allSettled?" — allSettled never rejects. "What about order?" — \`all\` guarantees input order, not completion order.`
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
      ru: `## Идея

Похоже на \`all\`, но **никогда не реджектится**. На каждый промис вешаем оба колбэка и записываем дескриптор статуса по индексу. Счётчик уменьшается в обоих случаях.

## Сложность

O(n) время и память.

## Edge cases

- Пустой ввод → resolve с \`[]\`.
- Любой reject не прерывает остальные — все результаты собираются.

## Follow-up интервьюера

«Когда выбрать allSettled вместо all?» — когда нужно дождаться всех операций и обработать частичные сбои (например, несколько независимых сетевых запросов на дашборде). «Как реализовать без счётчика?» — через \`Promise.all\` обёрнутых промисов, которые никогда не реджектятся.`,
      en: `## Idea

Like \`all\` but it **never rejects**. Attach both callbacks to each promise and write a status descriptor by index. The counter decrements in both branches.

## Complexity

O(n) time and memory.

## Edge cases

- Empty input → resolves with \`[]\`.
- A reject never aborts the rest — every result is collected.

## Interviewer follow-up

"When choose allSettled over all?" — when you must wait for every operation and handle partial failures (e.g. several independent network calls on a dashboard). "Can you build it on Promise.all?" — yes, by mapping each promise to one that never rejects.`
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
      ru: `## Идея

**race**: подписываемся на все промисы; первый, кто резолвится или реджектится, выигрывает — последующие \`resolve/reject\` игнорируются (промис «оседает» один раз).

**any**: зеркало race по логике — первый fulfilled выигрывает; копим причины ошибок и реджектим \`AggregateError\`, когда счётчик дошёл до нуля.

## Сложность

O(n) время, O(n) память (для any — массив причин).

## Edge cases

- \`race([])\` зависает навсегда (промис никогда не оседает) — это поведение по спецификации.
- \`any([])\` сразу реджектится \`AggregateError\` с пустым массивом.

## Follow-up интервьюера

«В чём разница race и any?» — race реагирует на первое завершение любого рода, any игнорирует ошибки до тех пор, пока есть надежда на успех.`,
      en: `## Idea

**race**: subscribe to all promises; the first to resolve or reject wins — later settle attempts are ignored (a promise settles once).

**any**: the mirror in spirit — the first fulfilled wins; collect rejection reasons and reject with \`AggregateError\` once the counter hits zero.

## Complexity

O(n) time, O(n) memory (any keeps the reasons array).

## Edge cases

- \`race([])\` never settles — that is per spec.
- \`any([])\` rejects immediately with an empty \`AggregateError\`.

## Interviewer follow-up

"race vs any?" — race reacts to the first settlement of any kind; any ignores rejections while a success is still possible.`
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
      ru: `## Идея

Держим набор «активных» промисов. Для каждого элемента запускаем задачу, добавляем её в \`executing\`; когда задача завершается, убираем из набора. Если набор достиг \`limit\` — \`await Promise.race(executing)\`, чтобы освободить слот.

## Сложность

O(n) запусков; в любой момент в памяти максимум \`limit\` активных задач + результаты O(n).

## Edge cases

- Результаты пишем по индексу, порядок завершения не важен.
- Ошибка в одной задаче должна реджектить весь пул (или собирайте через allSettled — зависит от требований).
- \`limit >= items.length\` ⇒ обычный \`Promise.all\`.

## Follow-up интервьюера

«Почему race, а не all внутри?» — race резолвится, как только освобождается один слот, а не все. «Как сделать отменяемым?» — пробрасывайте AbortSignal в iteratorFn.`,
      en: `## Idea

Keep a set of in-flight promises. For each item, start a task and add it to \`executing\`; when it finishes, remove it. When the set reaches \`limit\`, \`await Promise.race(executing)\` to free a slot.

## Complexity

O(n) launches; at any moment at most \`limit\` active tasks plus O(n) results.

## Edge cases

- Write results by index — completion order is irrelevant.
- One failing task should reject the whole pool (or collect via allSettled — depends on requirements).
- \`limit >= items.length\` reduces to a plain \`Promise.all\`.

## Interviewer follow-up

"Why race, not all inside?" — race resolves as soon as one slot frees, not all of them. "How to make it cancelable?" — thread an AbortSignal into iteratorFn.`
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
      ru: `## Идея

Цикл попыток. На каждой неудаче ждём растущую задержку \`baseDelay * factor^attempt\`. Опционально добавляют **jitter** (случайное смещение), чтобы избежать «грозового стада» при массовых ретраях.

## Сложность

O(retries) попыток; задержки растут экспоненциально — суммарное время ограничено.

## Edge cases

- Не ретраить «фатальные» ошибки (4xx) — добавьте предикат \`shouldRetry\`.
- \`retries = 0\` ⇒ один вызов без повторов.
- Поддержка отмены через AbortSignal.

## Follow-up интервьюера

«Зачем jitter?» — снимает синхронные всплески нагрузки. «Как ограничить max delay?» — \`Math.min(cap, baseDelay * factor^attempt)\`.`,
      en: `## Idea

Loop over attempts. On each failure wait a growing delay \`baseDelay * factor^attempt\`. Often add **jitter** (random offset) to avoid a thundering herd of synchronized retries.

## Complexity

O(retries) attempts; delays grow exponentially so total time is bounded.

## Edge cases

- Do not retry fatal errors (4xx) — add a \`shouldRetry\` predicate.
- \`retries = 0\` means a single call, no retry.
- Support cancellation via AbortSignal.

## Interviewer follow-up

"Why jitter?" — it spreads out synchronized load spikes. "How to cap the delay?" — \`Math.min(cap, baseDelay * factor^attempt)\`.`
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
      ru: `## Идея

Классический приём — \`reduce\` поверх промис-цепочки: каждый шаг \`await\`-ит предыдущий и добавляет свой результат. С \`async/await\` нагляднее — простой \`for...of\`.

## Сложность

O(n) по времени (последовательно), O(n) память под результаты.

## Edge cases

- Ошибка в любой задаче прерывает цепочку (если не обернуть в try/catch).
- Пустой массив → \`[]\`.
- Не путать с \`Promise.all\` (тот запускает всё параллельно сразу).

## Follow-up интервьюера

«Почему нельзя \`tasks.map(t => t())\` + await all для последовательности?» — \`map\` запустит все промисы немедленно, параллельно. Для последовательности нужен \`reduce\` или \`for...of\` с await внутри.`,
      en: `## Idea

The classic trick is a \`reduce\` over a promise chain: each step \`await\`s the previous and appends its result. With \`async/await\` a plain \`for...of\` is clearer.

## Complexity

O(n) time (sequential), O(n) memory for results.

## Edge cases

- An error in any task breaks the chain unless wrapped in try/catch.
- Empty array → \`[]\`.
- Do not confuse with \`Promise.all\` (which starts everything in parallel).

## Interviewer follow-up

"Why can't \`tasks.map(t => t())\` + await all be sequential?" — \`map\` fires all promises immediately, in parallel. Sequencing needs \`reduce\` or \`for...of\` with await inside.`
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
      ru: `## Идея

Нативные промисы **нельзя отменить** — обещание уже дано. Два подхода:

**A — обёртка:** после \`cancel()\` глотаем результат и не вызываем колбэки потребителя (реджектим \`{ isCanceled: true }\` или вовсе не оседаем). Утечки нет — исходный промис всё равно завершится, просто его результат игнорируется.

**B — AbortController:** настоящая отмена сетевого запроса. \`controller.signal\` передаётся в \`fetch\`; \`abort()\` реджектит \`AbortError\`.

## Сложность

O(1).

## Edge cases

- Вариант A не останавливает побочные эффекты исходного промиса (запрос всё равно уйдёт).
- AbortError нужно отлавливать отдельно от настоящих ошибок.

## Follow-up интервьюера

«Почему промис нельзя отменить нативно?» — модель «обещания» односторонняя; стандарт остановился на AbortController как на отдельном механизме сигналов.`,
      en: `## Idea

Native promises **cannot be canceled** — the promise is already made. Two approaches:

**A — wrapper:** after \`cancel()\`, swallow the outcome and never call the consumer callbacks (reject with \`{ isCanceled: true }\` or just hang). No leak — the original promise still settles, its result is simply ignored.

**B — AbortController:** real cancellation of a network request. \`controller.signal\` is passed to \`fetch\`; \`abort()\` rejects with \`AbortError\`.

## Complexity

O(1).

## Edge cases

- Variant A does not stop the original promise's side effects (the request still goes out).
- Catch AbortError separately from real errors.

## Interviewer follow-up

"Why can't promises be canceled natively?" — the "promise" model is one-way; the standard settled on AbortController as a separate signal mechanism.`
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
      ru: `## Идея

Возвращаем функцию, которая собирает переданные аргументы и добавляет в конец собственный колбэк. В колбэке: есть \`err\` → reject, иначе resolve(result). Сохраняем \`this\` через \`apply\`.

## Сложность

O(1) обёртка.

## Edge cases

- Колбэк может вызвать несколько значений (\`callback(err, a, b)\`) — нативный \`util.promisify\` берёт только первое, но поддерживает кастомизацию через \`util.promisify.custom\`.
- Функция, не следующая error-first соглашению, не promisify-ится корректно.
- Сохранение \`this\` важно для методов.

## Follow-up интервьюера

«Что если колбэк вызывается дважды?» — промис оседает один раз, второй вызов игнорируется. «Как поддержать несколько результатов?» — резолвить массивом.`,
      en: `## Idea

Return a function that gathers its args and appends its own callback. In the callback: if \`err\` → reject, else resolve(result). Preserve \`this\` via \`apply\`.

## Complexity

O(1) wrapper.

## Edge cases

- A callback may pass multiple values (\`callback(err, a, b)\`) — native \`util.promisify\` takes only the first, but allows \`util.promisify.custom\`.
- Functions not following the error-first convention won't promisify correctly.
- Preserving \`this\` matters for methods.

## Interviewer follow-up

"What if the callback fires twice?" — the promise settles once; the second call is ignored. "How to support multiple results?" — resolve with an array.`
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
      ru: `## Идея

Рекурсивная обёртка \`curried\`: если накоплено аргументов \`>= fn.length\` — вызываем \`fn\`; иначе возвращаем новую функцию, которая дособирает аргументы.

## Сложность

O(n) вызовов, O(n) память на накопленные аргументы.

## Edge cases

- Функции с rest-параметрами имеют \`length\` без учёта них — арность определяется неверно; нужен явный аргумент arity.
- Функции с дефолтными параметрами тоже занижают \`length\`.

## Follow-up интервьюера

«Зачем каррирование на практике?» — частичное применение, конфигурируемые хелперы (\`const add5 = curry(add)(5)\`), point-free стиль. «Как поддержать placeholder (_)?» — хранить позиции пропусков и подставлять при доборе аргументов (как в Lodash).`,
      en: `## Idea

A recursive wrapper \`curried\`: if collected args \`>= fn.length\`, call \`fn\`; otherwise return a new function that keeps gathering args.

## Complexity

O(n) calls, O(n) memory for accumulated args.

## Edge cases

- Functions with rest params report \`length\` ignoring them — arity is wrong; pass arity explicitly.
- Default parameters also lower \`length\`.

## Interviewer follow-up

"Why curry in practice?" — partial application, configurable helpers (\`const add5 = curry(add)(5)\`), point-free style. "Support a placeholder (_)?" — track gap positions and fill them as args arrive (like Lodash).`
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
      ru: `## Идея

Оба — свёртка через \`reduce\`/\`reduceRight\`. \`pipe\` читается естественно (порядок данных), \`compose\` — математическая нотация.

## Сложность

O(n) функций на вызов.

## Edge cases

- Первая (по направлению) функция может принимать несколько аргументов; остальные — одно значение.
- Пустой список ⇒ функция идентичности.
- Для async версии используем \`reduce\` с \`await\`, чтобы прокидывать промисы.

## Follow-up интервьюера

«compose или pipe в Redux?» — \`compose\` применяет middleware (enhancers) справа налево. «Как типизировать в TS?» — перегрузки на каждое число аргументов или вариативные tuple-типы.`,
      en: `## Idea

Both are folds via \`reduce\`/\`reduceRight\`. \`pipe\` reads naturally (data order), \`compose\` matches math notation.

## Complexity

O(n) functions per call.

## Edge cases

- The first function (in flow direction) may take multiple args; the rest take a single value.
- Empty list ⇒ identity function.
- For the async version use \`reduce\` with \`await\` to thread promises.

## Interviewer follow-up

"compose or pipe in Redux?" — \`compose\` applies enhancers right-to-left. "How to type it in TS?" — overloads per arg count or variadic tuple types.`
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
      ru: `## Идея

Замыкаем \`Map\`. Ключ строим resolver-ом (по умолчанию первый аргумент или JSON всех). Если ключ в кэше — возвращаем; иначе считаем, кладём, возвращаем.

## Сложность

O(1) на попадание; память растёт без ограничения — это риск.

## Edge cases

- \`JSON.stringify\` теряет порядок свойств не теряет, но не сериализует функции/undefined/Symbol и циклы — отсюда коллизии ключей.
- Объекты как аргументы лучше ключевать через \`WeakMap\` (избегает утечек) — но только для single-arg.
- Чистота функции обязательна, иначе кэш врёт.

## Follow-up интервьюера

«Как ограничить размер кэша?» — LRU-эвикция. «Чем плох JSON-ключ?» — медленно и неоднозначно для сложных объектов; используйте \`Map\` с кортежами или WeakMap.`,
      en: `## Idea

Close over a \`Map\`. Build the key with the resolver (default: the first arg or JSON of all). On a hit return it; otherwise compute, store, return.

## Complexity

O(1) per hit; memory grows unbounded — a real risk.

## Edge cases

- \`JSON.stringify\` does not serialize functions/undefined/Symbol and breaks on cycles — causing key collisions.
- Object args are better keyed via \`WeakMap\` (no leaks) but only for a single arg.
- The function must be pure or the cache lies.

## Interviewer follow-up

"How to bound the cache?" — LRU eviction. "What's wrong with a JSON key?" — slow and ambiguous for complex objects; use a \`Map\` of tuples or WeakMap.`
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
      ru: `## Идея

Флаг \`called\` и сохранённый \`result\` в замыкании. Первый вызов выполняет \`fn\` и кэширует результат; дальше всегда возвращаем кэш и **не** вызываем \`fn\` повторно. \`this\` и аргументы пробрасываем у первого вызова.

## Сложность

O(1).

## Edge cases

- Если \`fn\` бросает на первом вызове — стоит ли «считать вызов состоявшимся»? Обычно нет: оставляем флаг \`called=false\`, чтобы можно было повторить. Решение зависит от требований.
- Сохраняем \`fn = null\` после вызова, чтобы дать сборщику освободить замыкания.

## Follow-up интервьюера

«Где используется?» — singleton-инициализация, обработчики событий, которые должны сработать один раз. «Чем отличается от memoize?» — once игнорирует аргументы; memoize кэширует по ключу.`,
      en: `## Idea

A \`called\` flag and a stored \`result\` in the closure. The first call runs \`fn\` and caches the result; afterwards always return the cache and never call \`fn\` again. Forward \`this\` and args on the first call.

## Complexity

O(1).

## Edge cases

- If \`fn\` throws on the first call, should it count as "called"? Usually no: keep \`called=false\` so it can retry. Depends on requirements.
- Set \`fn = null\` after running to let the GC release captured closures.

## Interviewer follow-up

"Where is it used?" — singleton init, event handlers that must fire once. "How is it different from memoize?" — once ignores arguments; memoize caches by key.`
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
      ru: `## Идея

Рекурсия с **WeakMap** для уже скопированных объектов — это решает циклы и сохраняет shared-ссылки. Для специальных типов (Date, RegExp, Map, Set) — отдельные ветки конструирования.

## Сложность

O(n) по числу узлов и время, и память.

## Edge cases

- Циклы: \`a.self = a\` — без WeakMap будет бесконечная рекурсия и переполнение стека.
- \`JSON.parse(JSON.stringify(x))\` НЕ годится: теряет функции, undefined, Symbol, Date превращает в строку, ломается на циклах.
- Прототип, getter/setter, неперечислимые свойства — в простой версии теряются.

## Follow-up интервьюера

«Почему WeakMap, а не Map?» — слабые ссылки не мешают сборке мусора и привязаны к жизни ключей. «Когда structuredClone?» — нативно с 2022, поддерживает циклы и многие типы, но не функции/DOM-узлы.`,
      en: `## Idea

Recursion with a **WeakMap** of already-cloned objects — this handles cycles and preserves shared references. For special types (Date, RegExp, Map, Set) use dedicated construction branches.

## Complexity

O(n) in node count, both time and memory.

## Edge cases

- Cycles: \`a.self = a\` — without the WeakMap you get infinite recursion and a stack overflow.
- \`JSON.parse(JSON.stringify(x))\` is wrong: it drops functions, undefined, Symbol, turns Date into a string, and breaks on cycles.
- Prototype, getters/setters, non-enumerable props are lost in the simple version.

## Interviewer follow-up

"Why WeakMap not Map?" — weak refs don't block GC and are tied to key lifetime. "When use structuredClone?" — native since 2022, handles cycles and many types, but not functions/DOM nodes.`
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
      ru: `## Идея

Сначала быстрая проверка \`Object.is\` (ловит \`NaN\` и различает \`+0/-0\`). Если оба — объекты, сравниваем число ключей и рекурсивно каждый ключ.

## Сложность

O(n) по числу узлов.

## Edge cases

- \`NaN === NaN\` ложно — поэтому \`Object.is\`.
- Разное число ключей ⇒ не равны (ранний выход).
- Циклические структуры зациклят наивную версию — нужна та же WeakMap-техника, что в deepClone.
- Date/RegExp требуют отдельной логики (сравнение getTime/source).

## Follow-up интервьюера

«Как обработать циклы?» — отслеживать пары посещённых объектов. «Чем отличается от React shallowEqual?» — shallow сравнивает только первый уровень по ссылке, O(ключей), и используется в memo/PureComponent ради скорости.`,
      en: `## Idea

Start with a fast \`Object.is\` (catches \`NaN\` and distinguishes \`+0/-0\`). If both are objects, compare key counts then recurse per key.

## Complexity

O(n) in node count.

## Edge cases

- \`NaN === NaN\` is false — hence \`Object.is\`.
- Different key counts ⇒ unequal (early exit).
- Cyclic structures loop the naive version — apply the same WeakMap technique as in deepClone.
- Date/RegExp need dedicated logic (compare getTime/source).

## Interviewer follow-up

"How to handle cycles?" — track visited object pairs. "How does React's shallowEqual differ?" — it compares only the first level by reference, O(keys), used in memo/PureComponent for speed.`
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
      ru: `## Идея

Для каждого source проходим ключи. Если и в target, и в source значение — «чистый» объект, рекурсивно сливаем; иначе значение source перезаписывает. Возвращаем новый объект, не мутируя вход.

## Сложность

O(n) по суммарному числу ключей.

## Edge cases

- Массивы: чаще перезаписывают, но возможна и стратегия конкатенации/слияния по индексу — уточните у интервьюера.
- \`null\` — это объект по \`typeof\`, но не «чистый»: должен перезаписывать.
- Опасность prototype pollution: ключи \`__proto__\`, \`constructor\` нужно отфильтровать.

## Follow-up интервьюера

«Что с массивами?» — обсудите стратегию (replace vs concat vs index-merge). «Как защититься от prototype pollution?» — пропускать опасные ключи и использовать \`Object.create(null)\`.`,
      en: `## Idea

For each source, walk its keys. If both target and source values are plain objects, merge recursively; otherwise the source value overwrites. Return a new object without mutating the input.

## Complexity

O(n) over total key count.

## Edge cases

- Arrays: usually overwrite, but concat / index-merge strategies exist — clarify with the interviewer.
- \`null\` is an object by \`typeof\` but not "plain": it must overwrite.
- Prototype pollution risk: filter out \`__proto__\`, \`constructor\` keys.

## Interviewer follow-up

"What about arrays?" — discuss replace vs concat vs index-merge. "How to guard against prototype pollution?" — skip dangerous keys and use \`Object.create(null)\`.`
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
      ru: `## Идея

Нормализуем path в массив ключей (регуляркой разбираем \`[index]\` и точки). Идём по ключам, на каждом шаге проверяя, что текущий контейнер не \`null/undefined\`. Если «провалились» — возвращаем default.

## Сложность

O(d), где d — глубина пути.

## Edge cases

- Промежуточный \`null/undefined\` ⇒ default, без TypeError.
- Значение \`undefined\` по существующему ключу: lodash вернёт default; различать «нет ключа» vs «значение undefined» сложно — обычно не различают.
- Числовые индексы массива.

## Follow-up интервьюера

«Чем заменяется в современном JS?» — оператором опциональной цепочки \`a?.b?.[0]?.c\`, но он не работает с динамическим строковым путём — тут \`get\` всё ещё полезен.`,
      en: `## Idea

Normalize path into a key array (regex to split \`[index]\` and dots). Walk the keys, checking the current container is not \`null/undefined\` at each step. If it drops out, return the default.

## Complexity

O(d) where d is path depth.

## Edge cases

- An intermediate \`null/undefined\` ⇒ default, no TypeError.
- A value of \`undefined\` at an existing key: lodash returns the default; distinguishing "missing" vs "undefined value" is hard and usually skipped.
- Numeric array indices.

## Interviewer follow-up

"What replaces it in modern JS?" — optional chaining \`a?.b?.[0]?.c\`, but that can't take a dynamic string path — so \`get\` is still useful.`
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
      ru: `## Идея

Нормализуем путь. Идём до предпоследнего ключа, создавая отсутствующие контейнеры: если следующий ключ числовой — создаём массив, иначе объект. На последнем ключе присваиваем значение.

Для immutable-версии копируем каждый уровень по пути (path copying), как делают Immer/Redux.

## Сложность

O(d) для мутирующей; O(d) копий для immutable.

## Edge cases

- Числовой ключ ⇒ массив, строковый ⇒ объект.
- Перезапись примитива на пути контейнером (или предупреждение).
- prototype pollution: фильтровать \`__proto__\`.

## Follow-up интервьюера

«Как сделать immutable эффективно?» — структурное разделение (structural sharing): копируем только узлы вдоль пути, остальное переиспользуем по ссылке.`,
      en: `## Idea

Normalize the path. Walk to the second-to-last key, creating missing containers: if the next key is numeric, make an array, else an object. At the last key, assign the value.

The immutable version copies each level along the path (path copying), like Immer/Redux.

## Complexity

O(d) for the mutating version; O(d) copies for immutable.

## Edge cases

- Numeric key ⇒ array, string key ⇒ object.
- Overwriting a primitive on the path with a container (or warn).
- Prototype pollution: filter \`__proto__\`.

## Interviewer follow-up

"How to make it efficiently immutable?" — structural sharing: copy only nodes along the path, reuse the rest by reference.`
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
      ru: `## Идея

\`Map<event, Set<listener>>\`. \`on\` добавляет в Set и возвращает функцию отписки. \`once\` оборачивает листенер так, чтобы он удалял себя после первого вызова. \`emit\` копирует листенеры перед итерацией (защита от модификации во время вызова).

## Сложность

\`on/off\` — O(1) (Set), \`emit\` — O(k) по числу подписчиков.

## Edge cases

- Отписка во время \`emit\`: итерация по копии Set предотвращает пропуск/повтор.
- \`once\`: сохраняем ссылку на обёртку, чтобы \`off\` находил оригинал (храним \`wrapper.original\`).
- Ошибка в одном листенере не должна ломать остальных — обернуть в try/catch (зависит от требований).

## Follow-up интервьюера

«Зачем Set вместо массива?» — O(1) удаление и дедуп. «Как избежать утечек?» — всегда отписываться (возвращаемый unsubscribe помогает в компонентах).`,
      en: `## Idea

\`Map<event, Set<listener>>\`. \`on\` adds to the Set and returns an unsubscribe function. \`once\` wraps the listener so it removes itself after the first call. \`emit\` copies the listeners before iterating (guards against mutation during dispatch).

## Complexity

\`on/off\` is O(1) (Set), \`emit\` is O(k) over subscribers.

## Edge cases

- Unsubscribing during \`emit\`: iterating a copy of the Set avoids skip/repeat.
- \`once\`: keep a reference to the wrapper so \`off\` can find the original (store \`wrapper.original\`).
- An error in one listener shouldn't break others — wrap in try/catch (depends on requirements).

## Interviewer follow-up

"Why Set over an array?" — O(1) removal and dedup. "How to avoid leaks?" — always unsubscribe (the returned unsubscribe helps in components).`
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
      ru: `## Идея

Трюк: положить функцию как временное свойство на объект \`thisArg\`, вызвать как метод (так \`this\` станет нужным), затем удалить свойство. Используем \`Symbol\`, чтобы не затереть существующий ключ.

\`bind\` возвращает новую функцию с пред-применёнными аргументами. Тонкость: при вызове через \`new\` связанный \`this\` игнорируется, а используется свежесозданный объект — проверяем \`instanceof\`.

## Сложность

O(1) обёртки.

## Edge cases

- \`thisArg = null/undefined\` ⇒ в non-strict указывает на globalThis.
- Примитивный \`thisArg\` оборачивается в объект (boxing).
- \`new (boundFn)\` должен работать как конструктор.

## Follow-up интервьюера

«Почему bind + new особенный?» — спецификация требует, чтобы оператор new имел приоритет над связанным this.`,
      en: `## Idea

Trick: place the function as a temporary property on \`thisArg\`, call it as a method (so \`this\` becomes the right object), then delete the property. Use a \`Symbol\` to avoid clobbering an existing key.

\`bind\` returns a new function with pre-applied args. Subtlety: when called via \`new\`, the bound \`this\` is ignored and the freshly created object is used — check \`instanceof\`.

## Complexity

O(1) wrappers.

## Edge cases

- \`thisArg = null/undefined\` ⇒ globalThis in non-strict.
- A primitive \`thisArg\` is boxed into an object.
- \`new (boundFn)\` must work as a constructor.

## Interviewer follow-up

"Why is bind + new special?" — the spec requires the new operator to take precedence over the bound this.`
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
      ru: `## Идея

Оператор \`new\` делает четыре шага:
1. Создать пустой объект, чей \`[[Prototype]]\` — \`Constructor.prototype\`.
2. Вызвать конструктор с \`this\` = новый объект.
3. Если конструктор вернул **объект** — вернуть его; иначе — наш новый объект.

\`Object.create(Constructor.prototype)\` выполняет шаг 1; \`apply\` — шаг 2.

## Сложность

O(1).

## Edge cases

- Конструктор может вернуть примитив — он игнорируется, возвращается созданный объект.
- Возврат объекта/функции из конструктора подменяет результат.
- \`Constructor.prototype\` может быть не объектом (тогда прототип — \`Object.prototype\`).

## Follow-up интервьюера

«Что вернётся, если конструктор вернёт \`42\`?» — игнорируется, вернётся созданный объект. «А если вернёт \`{}\`?» — вернётся этот объект.`,
      en: `## Idea

The \`new\` operator does four steps:
1. Create an empty object whose \`[[Prototype]]\` is \`Constructor.prototype\`.
2. Call the constructor with \`this\` = the new object.
3. If the constructor returns an **object**, return it; otherwise return our new object.

\`Object.create(Constructor.prototype)\` does step 1; \`apply\` does step 2.

## Complexity

O(1).

## Edge cases

- A constructor returning a primitive is ignored; the created object is returned.
- Returning an object/function from the constructor overrides the result.
- \`Constructor.prototype\` may not be an object (then the prototype is \`Object.prototype\`).

## Interviewer follow-up

"What if the constructor returns \`42\`?" — ignored, the created object is returned. "And if it returns \`{}\`?" — that object is returned.`
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
      ru: `## Идея

**Рекурсия:** \`reduce\`; если элемент — массив и глубина > 0, разворачиваем с \`depth-1\`, иначе кладём как есть.

**Итеративно:** стек из пар \`[элемент, оставшаяся_глубина]\`, чтобы избежать переполнения на очень глубоких структурах. Результат в обратном порядке — реверсим в конце или используем unshift аккуратно.

## Сложность

O(n) по числу элементов; глубина стека рекурсии — O(d).

## Edge cases

- \`depth = 0\` ⇒ возвращаем копию без изменений.
- Очень глубокая вложенность ⇒ рекурсия может переполнить стек; итеративная безопаснее.
- Разреженные массивы.

## Follow-up интервьюера

«Чем плох \`arr.flat(Infinity)\`?» — почти ничем; вопрос проверяет понимание рекурсии. «Как обойтись без рекурсии?» — стек, как показано.`,
      en: `## Idea

**Recursive:** \`reduce\`; if an element is an array and depth > 0, flatten with \`depth-1\`, else push it as-is.

**Iterative:** a stack of \`[item, remainingDepth]\` pairs to avoid overflow on very deep structures. The result comes out reversed — reverse at the end or use unshift carefully.

## Complexity

O(n) over elements; recursion stack depth is O(d).

## Edge cases

- \`depth = 0\` ⇒ return a shallow copy unchanged.
- Very deep nesting ⇒ recursion may overflow; the iterative version is safer.
- Sparse arrays.

## Interviewer follow-up

"What's wrong with \`arr.flat(Infinity)\`?" — almost nothing; the question tests recursion understanding. "How to avoid recursion?" — a stack, as shown.`
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
      ru: `## Идея

Идём по массиву с шагом \`size\` и берём \`slice(i, i + size)\`. Просто и без лишних копий внутри.

## Сложность

O(n) по времени, O(n) память под результат.

## Edge cases

- \`size <= 0\` ⇒ вернуть \`[]\` или бросить ошибку — уточните контракт.
- Пустой массив ⇒ \`[]\`.
- \`size\` больше длины ⇒ один чанк со всеми элементами.

## Follow-up интервьюера

«Можно ли через \`Array.from({length: Math.ceil(n/size)})\`?» — да, элегантный one-liner. «Где применяется?» — пагинация, батчинг запросов, рендер сеткой по строкам.`,
      en: `## Idea

Step through the array by \`size\` and take \`slice(i, i + size)\`. Simple, no inner copies.

## Complexity

O(n) time, O(n) memory for the result.

## Edge cases

- \`size <= 0\` ⇒ return \`[]\` or throw — clarify the contract.
- Empty array ⇒ \`[]\`.
- \`size\` greater than length ⇒ one chunk with everything.

## Interviewer follow-up

"Could you use \`Array.from({length: Math.ceil(n/size)})\`?" — yes, an elegant one-liner. "Where is it used?" — pagination, request batching, grid rendering by rows.`
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
      ru: `## Идея

\`reduce\` по массиву: для каждого элемента вычисляем ключ, лениво создаём массив-бакет и пушим элемент.

## Сложность

O(n) по времени, O(n) память.

## Edge cases

- \`keyFn\` может быть строкой-именем свойства — поддержите оба варианта.
- Ключи приводятся к строке (object keys) — числовые и строковые \`'1'\` сольются. Для строгости используйте \`Map\`.
- Пустой массив ⇒ \`{}\`.

## Follow-up интервьюера

«Чем плох объект как контейнер групп?» — теряется тип ключа и порядок для числовых ключей. «Что нового в платформе?» — \`Object.groupBy\` / \`Map.groupBy\` (ES2024).`,
      en: `## Idea

\`reduce\` over the array: compute the key for each element, lazily create the bucket array, push the element.

## Complexity

O(n) time, O(n) memory.

## Edge cases

- \`keyFn\` may be a property-name string — support both.
- Keys are stringified (object keys) — numeric and string \`'1'\` collide. Use a \`Map\` for strictness.
- Empty array ⇒ \`{}\`.

## Interviewer follow-up

"What's wrong with an object container?" — it loses key type and ordering for numeric keys. "What's new in the platform?" — \`Object.groupBy\` / \`Map.groupBy\` (ES2024).`
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
      ru: `## Идея

Для примитивов — \`new Set(arr)\` и обратно в массив (Set хранит порядок вставки). Для объектов — \`Set\` посещённых ключей: проходим, пропускаем уже виденные.

## Сложность

O(n) по времени, O(n) память.

## Edge cases

- \`NaN\` корректно дедуплицируется в \`Set\` (один \`NaN\`).
- \`+0\` и \`-0\` в Set считаются равными.
- Объекты по ссылке: \`Set\` не дедуплицирует структурно равные объекты — нужен keyFn.

## Follow-up интервьюера

«Почему не \`indexOf\` в \`filter\`?» — это O(n²). \`Set\` даёт O(n). «Как дедуплицировать структурно?» — сериализовать ключ или сравнивать deepEqual (дороже).`,
      en: `## Idea

For primitives, \`new Set(arr)\` back to an array (Set preserves insertion order). For objects, a \`Set\` of seen keys: iterate, skip already-seen.

## Complexity

O(n) time, O(n) memory.

## Edge cases

- \`NaN\` dedupes correctly in a \`Set\` (a single \`NaN\`).
- \`+0\` and \`-0\` are treated as equal in a Set.
- Objects are by reference: a \`Set\` won't dedupe structurally equal objects — use keyFn.

## Interviewer follow-up

"Why not \`indexOf\` inside \`filter\`?" — that's O(n²). A \`Set\` gives O(n). "How to dedupe structurally?" — serialize a key or compare deepEqual (costlier).`
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
      ru: `## Идея

Проходим по \`this\` индексным циклом, передаём в колбэк \`(value, i, this)\`. \`myReduce\`: если \`initialValue\` не передан — берём первый элемент как аккумулятор и стартуем со второго; если массив пуст и нет initial — бросаем TypeError (как нативный).

## Сложность

O(n) по времени, O(1)/O(n) память.

## Edge cases

- Разреженные массивы: нативные map/filter пропускают «дыры» — для строгости проверяйте \`i in this\`.
- Пустой reduce без initial ⇒ TypeError.
- Второй аргумент \`thisArg\` для колбэка (опционально).

## Follow-up интервьюера

«Что делает reduce при пустом массиве?» — без initial — бросает; с initial — возвращает initial. «Почему важен третий аргумент колбэка?» — даёт доступ к исходному массиву внутри трансформации.`,
      en: `## Idea

Walk \`this\` with an index loop, passing \`(value, i, this)\` to the callback. \`myReduce\`: if no \`initialValue\`, use the first element as the accumulator and start at index 1; if the array is empty and there's no initial, throw a TypeError (like native).

## Complexity

O(n) time, O(1)/O(n) memory.

## Edge cases

- Sparse arrays: native map/filter skip holes — for strictness check \`i in this\`.
- Empty reduce without initial ⇒ TypeError.
- An optional \`thisArg\` for the callback.

## Interviewer follow-up

"What does reduce do on an empty array?" — without initial it throws; with initial it returns the initial. "Why the third callback arg?" — it gives access to the source array inside the transform.`
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
      ru: `## Идея

**range:** считаем число шагов \`ceil((end-start)/step)\` и генерируем через \`Array.from\`. Поддержим отрицательный шаг.

**zip:** длина результата — минимум из длин входных массивов; для каждого индекса собираем кортеж из i-х элементов.

## Сложность

range — O(n) элементов; zip — O(min_len × arrays).

## Edge cases

- range: \`step = 0\` ⇒ бесконечность, нужно отбросить/бросить ошибку.
- range с \`start > end\` и положительным шагом ⇒ пустой массив.
- zip без аргументов ⇒ \`[]\`; разные длины ⇒ обрезка по короткому (или \`undefined\`-заполнение — уточнить).

## Follow-up интервьюера

«Как сделать unzip?» — \`zip(...zipped)\` транспонирует обратно. «Ленивый range?» — генератор \`function*\`, экономит память на больших диапазонах.`,
      en: `## Idea

**range:** compute the step count \`ceil((end-start)/step)\` and generate via \`Array.from\`. Support a negative step.

**zip:** the result length is the min input length; for each index collect a tuple of the i-th elements.

## Complexity

range is O(n) elements; zip is O(min_len × arrays).

## Edge cases

- range: \`step = 0\` ⇒ infinite, reject/throw.
- range with \`start > end\` and a positive step ⇒ empty array.
- zip with no args ⇒ \`[]\`; differing lengths ⇒ truncate to shortest (or fill with \`undefined\` — clarify).

## Interviewer follow-up

"How to unzip?" — \`zip(...zipped)\` transposes back. "Lazy range?" — a \`function*\` generator saves memory on large ranges.`
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
      ru: `## Идея

Кладём \`b\` в \`Set\` для O(1) проверки принадлежности. Фильтруем \`a\`: для intersection — \`set.has(x)\`, для difference — \`!set.has(x)\`. Опционально дедуп результата.

## Сложность

O(n + m) по времени, O(m) память на Set.

## Edge cases

- Дубликаты в \`a\` сохраняются — при необходимости оберните в \`unique\`.
- Объекты сравниваются по ссылке: для структурного сравнения нужен ключ.
- Пустые массивы ⇒ корректные граничные результаты.

## Follow-up интервьюера

«Почему не вложенный \`includes\`?» — O(n×m). Set даёт линейность. «Что в платформе нового?» — нативные \`Set.prototype.intersection/difference\` (2024) для самих множеств.`,
      en: `## Idea

Put \`b\` into a \`Set\` for O(1) membership checks. Filter \`a\`: \`set.has(x)\` for intersection, \`!set.has(x)\` for difference. Optionally dedupe the result.

## Complexity

O(n + m) time, O(m) memory for the Set.

## Edge cases

- Duplicates in \`a\` are kept — wrap in \`unique\` if needed.
- Objects compare by reference: use a key for structural comparison.
- Empty arrays ⇒ correct edge results.

## Interviewer follow-up

"Why not a nested \`includes\`?" — O(n×m). A Set makes it linear. "Anything new in the platform?" — native \`Set.prototype.intersection/difference\` (2024) for actual sets.`
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
      ru: `## Идея

Один проход с \`Map\`: для каждого \`x\` ищем дополнение \`target - x\`. Если оно уже встречалось — нашли пару; иначе запоминаем \`x → index\`. Это превращает наивный O(n²) в O(n).

## Сложность

O(n) по времени, O(n) память.

## Edge cases

- Дубликаты: запоминаем индекс **до** добавления текущего, чтобы не использовать элемент дважды.
- Нет решения ⇒ вернуть \`[]\`/\`null\` (по условию обычно есть).
- Отрицательные числа и ноль работают без изменений.

## Follow-up интервьюера

«А если массив отсортирован?» — два указателя дают O(n) при O(1) памяти. «Найти все пары?» — нужна аккуратная обработка дубликатов и сортировка.`,
      en: `## Idea

A single pass with a \`Map\`: for each \`x\` look for the complement \`target - x\`. If it's already seen, we found the pair; otherwise store \`x → index\`. This turns the naive O(n²) into O(n).

## Complexity

O(n) time, O(n) memory.

## Edge cases

- Duplicates: store the index **before** adding the current one to avoid reusing an element.
- No solution ⇒ return \`[]\`/\`null\` (the prompt usually guarantees one).
- Negative numbers and zero work unchanged.

## Interviewer follow-up

"What if the array is sorted?" — two pointers give O(n) with O(1) memory. "Find all pairs?" — needs careful duplicate handling and sorting.`
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
      ru: `## Идея

Стек. На открывающую скобку кладём ожидаемую закрывающую. На закрывающую — снимаем верх стека и сверяем. В конце стек должен быть пуст.

## Сложность

O(n) по времени, O(n) память (в худшем случае все открывающие).

## Edge cases

- Закрывающая при пустом стеке ⇒ \`false\`.
- Непустой стек в конце ⇒ \`false\` (есть незакрытые).
- Чужие символы: либо игнорировать, либо считать невалидными — уточните.

## Follow-up интервьюера

«А если допустимы любые символы между скобок?» — игнорируем не-скобки. «Минимальное число вставок для баланса?» — вариация со счётчиками, тоже O(n).`,
      en: `## Idea

A stack. On an opener, push the expected closer. On a closer, pop the top and compare. At the end the stack must be empty.

## Complexity

O(n) time, O(n) memory (worst case all openers).

## Edge cases

- A closer with an empty stack ⇒ \`false\`.
- A non-empty stack at the end ⇒ \`false\` (unclosed openers).
- Other characters: ignore them or treat as invalid — clarify.

## Interviewer follow-up

"What if any characters may appear between brackets?" — ignore non-brackets. "Minimum insertions to balance?" — a counter variation, also O(n).`
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
      ru: `## Идея

Три проблемы и их решения:
1. **Лишние запросы** → дебаунс ввода (~300мс).
2. **Race condition** (старый ответ приходит позже нового) → отменяем предыдущий запрос через \`AbortController\` и/или сверяем «номер запроса».
3. **Отрисовка** только последнего актуального ответа.

## Сложность

O(1) на нажатие плюс сетевой запрос.

## Edge cases

- Пустой ввод ⇒ отменить запрос и очистить список.
- AbortError ловить и **не** показывать как ошибку.
- Кеширование одинаковых запросов (опционально).

## Follow-up интервьюера

«Почему недостаточно только дебаунса?» — даже после дебаунса два быстрых запроса могут разъехаться по времени ответа; нужна отмена/версионирование. «Как ещё бороться с гонкой?» — токен последнего запроса (\`lastSeq\`).`,
      en: `## Idea

Three problems and fixes:
1. **Excess requests** → debounce input (~300ms).
2. **Race condition** (an old response arrives after a newer one) → cancel the previous request via \`AbortController\` and/or check a request sequence number.
3. **Render** only the latest valid response.

## Complexity

O(1) per keystroke plus the network call.

## Edge cases

- Empty input ⇒ cancel the request and clear the list.
- Catch AbortError and do **not** surface it as an error.
- Optional caching of identical queries.

## Interviewer follow-up

"Why isn't debounce enough?" — even after debounce, two quick requests can resolve out of order; you need cancellation/versioning. "Another way to fight races?" — a last-request token (\`lastSeq\`).`
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
      ru: `## Идея

\`Map\` в JS хранит ключи в порядке вставки. «Использование» = удалить ключ и снова вставить (он становится самым свежим). Самый старый — первый ключ \`map.keys().next().value\`, его и вытесняем при переполнении.

Канонический ответ — двусвязный список + хеш-таблица; \`Map\` даёт то же O(1) проще.

## Сложность

\`get\`/\`put\` — O(1) (амортизированно).

## Edge cases

- \`get\` несуществующего ключа ⇒ \`-1\`/\`undefined\` и **не** меняет порядок.
- \`put\` существующего ключа обновляет значение и «освежает» его.
- \`capacity = 0\` — крайний случай.

## Follow-up интервьюера

«Почему Map, а не объект?» — Map гарантирует порядок и O(1) delete. «Как сделать LFU?» — нужен счётчик частот и более сложная структура (списки по частотам).`,
      en: `## Idea

A JS \`Map\` keeps keys in insertion order. "Use" = delete the key and reinsert it (it becomes newest). The oldest is the first key \`map.keys().next().value\`, which we evict on overflow.

The canonical answer is a doubly linked list + hash map; a \`Map\` gives the same O(1) more simply.

## Complexity

\`get\`/\`put\` are O(1) amortized.

## Edge cases

- \`get\` of a missing key ⇒ \`-1\`/\`undefined\` and does **not** change order.
- \`put\` of an existing key updates the value and refreshes it.
- \`capacity = 0\` is an edge case.

## Interviewer follow-up

"Why Map not an object?" — Map guarantees order and O(1) delete. "How to make it LFU?" — needs frequency counters and a more complex structure (frequency buckets).`
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
      ru: `## Идея

- **Наивная рекурсия:** \`fib(n) = fib(n-1) + fib(n-2)\` — экспоненциальная O(2ⁿ) из-за повторных подзадач.
- **Мемоизация:** кэшируем результаты — O(n) время, O(n) память (+стек).
- **Итеративно:** храним два последних значения — O(n) время, O(1) память. Оптимально.

## Сложность

Наивно O(2ⁿ); мемо O(n)/O(n); итеративно O(n)/O(1).

## Edge cases

- \`n = 0\` → 0, \`n = 1\` → 1.
- Большие \`n\` переполняют \`Number\` (>78); используйте \`BigInt\`.
- Отрицательный \`n\` — уточнить контракт.

## Follow-up интервьюера

«Можно ли быстрее O(n)?» — да, матричное возведение в степень или формула Бине дают O(log n). «Почему наивная экспоненциальна?» — дерево вызовов дублирует подзадачи; мемоизация устраняет дубли.`,
      en: `## Idea

- **Naive recursion:** \`fib(n) = fib(n-1) + fib(n-2)\` — exponential O(2ⁿ) from repeated subproblems.
- **Memoized:** cache results — O(n) time, O(n) memory (+stack).
- **Iterative:** keep the last two values — O(n) time, O(1) memory. Optimal in space.

## Complexity

Naive O(2ⁿ); memo O(n)/O(n); iterative O(n)/O(1).

## Edge cases

- \`n = 0\` → 0, \`n = 1\` → 1.
- Large \`n\` overflows \`Number\` (>78); use \`BigInt\`.
- Negative \`n\` — clarify the contract.

## Interviewer follow-up

"Can you beat O(n)?" — yes, matrix exponentiation or Binet's formula give O(log n). "Why is naive exponential?" — the call tree duplicates subproblems; memoization removes the duplicates.`
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
      ru: `## Идея

Анаграммы имеют одинаковый **канонический ключ**. Простейший ключ — отсортированные буквы слова. Группируем по этому ключу в \`Map\`.

## Сложность

O(n · k log k), где k — длина слова (из-за сортировки). Можно O(n · k) с ключом-частотой букв (массив из 26 счётчиков).

## Edge cases

- Регистр и пробелы — уточнить, нормализуем ли.
- Юникод/несколько алфавитов: частотный ключ на 26 не годится — используйте сортировку или Map частот.
- Пустые строки группируются вместе.

## Follow-up интервьюера

«Как избежать сортировки?» — ключ из подсчёта частот символов, O(k) вместо O(k log k). «А для Unicode?» — нормализация \`String.prototype.normalize\` и частотный объект.`,
      en: `## Idea

Anagrams share a **canonical key**. The simplest key is the word's sorted letters. Group by that key in a \`Map\`.

## Complexity

O(n · k log k), where k is word length (due to sorting). It can be O(n · k) with a letter-frequency key (a 26-slot count array).

## Edge cases

- Case and spaces — clarify whether to normalize.
- Unicode/multiple alphabets: a 26-slot key won't do — use sorting or a frequency Map.
- Empty strings group together.

## Interviewer follow-up

"How to avoid sorting?" — a character-frequency key, O(k) instead of O(k log k). "And for Unicode?" — \`String.prototype.normalize\` plus a frequency object.`
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
      ru: `## Идея

Алгоритм Кадане. На каждом элементе решаем: продолжить текущий подмассив или начать новый с этого элемента — \`current = max(x, current + x)\`. Отслеживаем глобальный максимум.

Интуиция: если накопленная сумма стала отрицательной, она только мешает будущему — выгоднее «сбросить» начало.

## Сложность

O(n) по времени, O(1) память. Один проход.

## Edge cases

- Все числа отрицательные ⇒ ответ — максимальный одиночный элемент (инициализируйте \`best\` первым элементом, не нулём).
- Один элемент ⇒ он сам.
- Чтобы вернуть и границы подмассива — храните стартовый индекс.

## Follow-up интервьюера

«Как вернуть сами индексы?» — фиксировать start при сбросе и end при обновлении best. «А максимальное произведение подмассива?» — нужно вести и min, и max из-за смены знака.`,
      en: `## Idea

Kadane's algorithm. At each element decide: extend the current subarray or start fresh — \`current = max(x, current + x)\`. Track the global maximum.

Intuition: once the running sum goes negative it can only hurt the future, so resetting the start pays off.

## Complexity

O(n) time, O(1) memory. Single pass.

## Edge cases

- All negatives ⇒ the answer is the largest single element (initialize \`best\` with the first element, not zero).
- Single element ⇒ itself.
- To return the bounds, track the start index.

## Interviewer follow-up

"How to return the indices?" — record start on reset and end on a best update. "Maximum product subarray?" — track both min and max because of sign flips.`
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
      ru: `## Идея

Сужаем \`[lo, hi]\` вдвое за шаг. Ключевые тонкости: вычисление середины без переполнения \`lo + (hi - lo >> 1)\` и корректные границы цикла, чтобы не зациклиться.

**Lower bound** — инвариант: ищем первую позицию, где условие \`>= target\` истинно; при \`a[mid] >= target\` двигаем \`hi = mid\`, иначе \`lo = mid + 1\`.

## Сложность

O(log n) по времени, O(1) память.

## Edge cases

- Пустой массив ⇒ \`-1\`.
- Дубликаты: классический поиск вернёт любой; для первого/последнего — lower/upper bound.
- Off-by-one — самая частая ошибка; держите чёткий инвариант (\`<=\` vs \`<\`).

## Follow-up интервьюера

«Почему \`mid = (lo+hi)/2\` опасно?» — переполнение в языках с фикс. int (в JS менее критично, но привычка полезна). «Найти точку вставки?» — это и есть lower bound.`,
      en: `## Idea

Halve \`[lo, hi]\` each step. Key subtleties: compute the midpoint without overflow \`lo + (hi - lo >> 1)\`, and use correct loop bounds to avoid infinite loops.

**Lower bound** — invariant: find the first position where \`>= target\` holds; if \`a[mid] >= target\` move \`hi = mid\`, else \`lo = mid + 1\`.

## Complexity

O(log n) time, O(1) memory.

## Edge cases

- Empty array ⇒ \`-1\`.
- Duplicates: classic search returns any match; for first/last use lower/upper bound.
- Off-by-one is the most common bug — keep a clear invariant (\`<=\` vs \`<\`).

## Interviewer follow-up

"Why is \`mid = (lo+hi)/2\` risky?" — overflow in fixed-int languages (less critical in JS, but a good habit). "Find the insertion point?" — that's the lower bound.`
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
      ru: `## Идея

Рекурсивно обходим ключи. Если значение — «чистый» объект, спускаемся, наращивая префикс \`prefix.key\`; иначе пишем лист в результат.

\`unflatten\` — обратная операция: разбиваем ключ по точкам и строим вложенность (как \`set\` по пути).

## Сложность

O(n) по числу листьев.

## Edge cases

- Массивы: оставить как есть или индексировать (\`a.0.b\`) — уточнить контракт.
- \`null\` — лист, не рекурсируем.
- Ключи, содержащие точку, ломают обратимость — нужен другой разделитель/экранирование.

## Follow-up интервьюера

«Где применяется?» — i18n-словари, query-параметры форм, конфиги, диффы. «Что с массивами и точками в ключах?» — обсудите экранирование и индексацию.`,
      en: `## Idea

Recursively walk keys. If a value is a plain object, descend, extending the prefix \`prefix.key\`; otherwise write the leaf into the result.

\`unflatten\` is the inverse: split a key by dots and rebuild nesting (like \`set\` by path).

## Complexity

O(n) over leaves.

## Edge cases

- Arrays: keep as-is or index them (\`a.0.b\`) — clarify the contract.
- \`null\` is a leaf, don't recurse.
- Keys containing a dot break round-tripping — use a different separator/escaping.

## Interviewer follow-up

"Where is it used?" — i18n dictionaries, form query params, configs, diffs. "What about arrays and dots in keys?" — discuss escaping and indexing.`
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
      ru: `## Идея

Рекурсия по типам. Примитивы — прямое преобразование (строки в кавычках, с экранированием). Массивы: сериализуем каждый элемент; \`undefined\`/функция → \`"null"\`. Объекты: пропускаем пары, где значение \`undefined\`/функция.

## Сложность

O(n) по числу узлов.

## Edge cases

- \`undefined\` на верхнем уровне ⇒ нативно возвращает \`undefined\` (не строку).
- \`NaN\`/\`Infinity\` ⇒ \`"null"\`.
- Циклы ⇒ нативный JSON бросает \`TypeError\`.
- Экранирование кавычек, \\n, \\t в строках.

## Follow-up интервьюера

«Что делает нативный с Date?» — вызывает \`toJSON()\` (ISO-строка). «А с \`undefined\` в массиве vs объекте?» — в массиве → null, в объекте ключ пропускается. Это любимый каверзный вопрос.`,
      en: `## Idea

Recurse by type. Primitives convert directly (strings quoted and escaped). Arrays: serialize each element; \`undefined\`/function → \`"null"\`. Objects: skip pairs whose value is \`undefined\`/function.

## Complexity

O(n) over nodes.

## Edge cases

- \`undefined\` at the top level ⇒ native returns \`undefined\` (not a string).
- \`NaN\`/\`Infinity\` ⇒ \`"null"\`.
- Cycles ⇒ native JSON throws a \`TypeError\`.
- Escape quotes, \\n, \\t in strings.

## Interviewer follow-up

"What does native do with Date?" — it calls \`toJSON()\` (ISO string). "And \`undefined\` in an array vs object?" — in an array → null, in an object the key is skipped. A favourite trick question.`
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
      ru: `## Идея

Проходим аргументы. Строки/числа — добавляем как есть (если truthy). Массивы — рекурсивно обрабатываем. Объекты — добавляем ключ, если значение truthy. Собираем и склеиваем через пробел.

## Сложность

O(n) по суммарному числу токенов.

## Edge cases

- Falsy-аргументы (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`) игнорируются.
- Вложенные массивы любой глубины.
- Дубликаты классов обычно не дедуплицируются (как в clsx) — уточнить.

## Follow-up интервьюера

«Зачем это в UI?» — условные классы без конкатенации строк и тернарников в JSX/шаблонах. «Как дедуплицировать?» — \`[...new Set(...)]\` ценой порядка/скорости (clsx сознательно не делает).`,
      en: `## Idea

Iterate the arguments. Strings/numbers — add as-is when truthy. Arrays — recurse. Objects — add the key when the value is truthy. Collect and join with spaces.

## Complexity

O(n) over total tokens.

## Edge cases

- Falsy args (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`) are ignored.
- Nested arrays of any depth.
- Duplicate classes usually aren't deduped (like clsx) — clarify.

## Interviewer follow-up

"Why is this useful in UI?" — conditional classes without string concatenation and ternaries in JSX/templates. "How to dedupe?" — \`[...new Set(...)]\` at the cost of order/speed (clsx deliberately skips it).`
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
      ru: `## Идея

\`IntersectionObserver\` асинхронно сообщает о пересечении sentinel-элемента с вьюпортом — без слушателей scroll и ручных расчётов \`getBoundingClientRect\` (которые дёргают layout).

При \`isIntersecting\` грузим следующую страницу. Флаг \`loading\` блокирует параллельные запросы; когда данные кончились — \`disconnect()\`.

## Сложность

O(1) на коллбэк; браузер сам батчит наблюдения.

## Edge cases

- Гонка: без флага \`loading\` несколько срабатываний инициируют дубликаты — обязательная защита.
- \`rootMargin\` для предзагрузки заранее (например, \`"200px"\`).
- Очистка: \`disconnect()\` при размонтировании, иначе утечка.

## Follow-up интервьюера

«Чем лучше scroll-листенера?» — не блокирует main thread, не требует throttle, работает вне layout. «rootMargin зачем?» — подгружать заранее для плавности.`,
      en: `## Idea

\`IntersectionObserver\` reports the sentinel's intersection with the viewport asynchronously — no scroll listeners or manual \`getBoundingClientRect\` (which thrash layout).

On \`isIntersecting\` load the next page. A \`loading\` flag blocks concurrent requests; when data runs out, \`disconnect()\`.

## Complexity

O(1) per callback; the browser batches observations.

## Edge cases

- Race: without a \`loading\` flag multiple fires trigger duplicate loads — guard required.
- \`rootMargin\` for prefetching ahead (e.g. \`"200px"\`).
- Cleanup: \`disconnect()\` on unmount or you leak.

## Interviewer follow-up

"Why better than a scroll listener?" — it doesn't block the main thread, needs no throttle, runs off layout. "Why rootMargin?" — to prefetch ahead for smoothness.`
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
      ru: `## Идея

Замыкаем \`state\` и \`Set\` подписчиков. \`setState\` принимает либо частичный объект, либо функцию-апдейтер от текущего состояния; мержим неизменяемо (\`{ ...state, ...partial }\`) и оповещаем подписчиков. \`subscribe\` добавляет listener в Set и возвращает функцию удаления.

## Сложность

\`getState\`/\`setState\` — O(подписчиков) на уведомление; \`subscribe\` — O(1).

## Edge cases

- Иммутабельность: всегда новый объект состояния, иначе сравнения по ссылке во вьюхах сломаются.
- Отписка во время уведомления — итерация по копии Set.
- Функция-апдейтер должна получать актуальное состояние (важно для последовательных вызовов).

## Follow-up интервьюера

«Как добавить селекторы и точечные подписки?» — listener получает state, сам сравнивает срез (как в Zustand с \`equalityFn\`). «Где reducer?» — это Redux-вариант: \`setState\` заменяется на \`dispatch(action)\` + \`reducer\`.`,
      en: `## Idea

Close over \`state\` and a \`Set\` of subscribers. \`setState\` takes either a partial object or an updater function of the current state; merge immutably (\`{ ...state, ...partial }\`) and notify. \`subscribe\` adds a listener to the Set and returns a remover.

## Complexity

\`getState\`/\`setState\` is O(subscribers) per notify; \`subscribe\` is O(1).

## Edge cases

- Immutability: always a new state object, or reference comparisons in views break.
- Unsubscribing during notification — iterate a copy of the Set.
- The updater function must receive the current state (matters for sequential calls).

## Interviewer follow-up

"How to add selectors and targeted subscriptions?" — the listener receives state and compares a slice itself (like Zustand's \`equalityFn\`). "Where's the reducer?" — that's the Redux flavour: replace \`setState\` with \`dispatch(action)\` + \`reducer\`.`
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
