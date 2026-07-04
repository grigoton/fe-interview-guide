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
      ru: `## 🧩 Простыми словами

Представь, что кто-то в лифте много раз жмёт кнопку «закрыть двери». Разумный лифт не дёргается на каждый тычок — он ждёт, пока ты угомонишься, и только через секунду тишины закрывает двери. Вот это и есть \`debounce\`: он ловит шквал частых событий и превращает их в один вызов после паузы. Классические примеры — обработка ресайза окна и «поиск на лету», когда мы не хотим слать запрос на каждую нажатую букву.

### Что делает debounce

\`debounce(fn, wait, options)\` — это обёртка. Ты даёшь ей функцию \`fn\` и время ожидания \`wait\` (в миллисекундах), а она возвращает новую функцию. Каждый раз, когда новую функцию дёргают, она сбрасывает свой внутренний таймер и заводит его заново. Реальный вызов \`fn\` случится, только если после последнего обращения прошло \`wait\` мс тишины.

Таймер живёт в **замыкании** — это переменная внутри функции, которую видят вложенные функции даже после того, как внешняя завершилась. Благодаря замыканию каждый экземпляр debounce помнит свой собственный \`timer\`.

### Опции leading и trailing

- **trailing** (поведение по умолчанию) — вызвать \`fn\` в конце, после паузы. Это «дождаться, пока пользователь закончил печатать».
- **leading** — вызвать \`fn\` сразу на первом обращении, ещё до начала тихого периода. Полезно, когда нужна мгновенная реакция на первый клик, а повторы отсечь.

Внутри мы сохраняем \`this\` и аргументы последнего вызова (\`lastArgs\`, \`lastThis\`), чтобы вызвать \`fn\` ровно с теми данными, что пришли последними, и в правильном контексте.

### Как это выглядит в коде

\`\`\`js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
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
}
\`\`\`

Разберём по шагам. При каждом вызове мы запоминаем свежие аргументы и контекст. \`callNow\` истинно, только если включён \`leading\` и таймера ещё нет (то есть это первый вызов в серии). Затем \`clearTimeout(timer)\` отменяет предыдущий отложенный вызов, и мы заводим новый \`setTimeout\` на \`wait\` мс. Когда таймер наконец сработает, он обнулит \`timer\` и, если включён \`trailing\` и остались невыполненные аргументы, вызовет \`invoke()\`. А \`callNow\` срабатывает синхронно сразу — это и есть leading-вызов.

Метод \`cancel()\` нужен, чтобы досрочно всё погасить: очистить таймер и сбросить сохранённое состояние (например, при размонтировании компонента).

### Сложность

O(1) на каждый вызов и O(1) по памяти — мы храним лишь один таймер и последние аргументы.

## ⚠️ Подводные камни

- При \`leading && trailing\` одиночный вызов не должен сработать дважды. Проверка \`lastArgs\` в таймере спасает: если leading уже отработал и больше вызовов не было, \`invoke()\` внутри \`invoke\` обнулил \`lastArgs\`, и trailing не выстрелит повторно.
- Забыть про \`cancel()\` — типичная утечка: таймер продолжит жить и может дёрнуть \`fn\` уже после того, как это стало не нужно.
- Не сохранить \`this\` — и метод объекта потеряет свой контекст. Поэтому мы бережём \`lastThis\` и зовём через \`fn.apply\`.

## 🎯 Запомни

- \`debounce\` = «подожди тишины, потом вызови один раз». Таймер сбрасывается на каждом обращении.
- \`leading\` — вызов сразу, \`trailing\` — вызов после паузы; по умолчанию только trailing.
- Всегда давай метод \`cancel()\` для отмены отложенного вызова.
- Отличие от throttle: throttle гарантирует вызов раз в N мс, debounce — только после паузы.`,
      en: `## 🧩 In plain words

Picture someone in an elevator mashing the "close doors" button. A smart elevator doesn't jerk on every tap — it waits until you stop, and only after a second of quiet does it close the doors. That's \`debounce\`: it catches a burst of frequent events and turns them into a single call after a pause. Classic examples are handling window resize and "search-as-you-type", where we don't want to fire a request on every keystroke.

### What debounce does

\`debounce(fn, wait, options)\` is a wrapper. You hand it a function \`fn\` and a wait time \`wait\` (in milliseconds), and it returns a new function. Every time that new function is called, it resets its internal timer and starts it over. The real call to \`fn\` happens only if \`wait\` ms of silence pass after the last invocation.

The timer lives in a **closure** — a variable inside a function that the nested functions can still see even after the outer function has finished. Thanks to the closure, each debounce instance remembers its own \`timer\`.

### The leading and trailing options

- **trailing** (the default) — call \`fn\` at the end, after the pause. This is "wait until the user has stopped typing".
- **leading** — call \`fn\` immediately on the first invocation, before the quiet period even starts. Useful when you want an instant reaction to the first click and to swallow the repeats.

Inside, we save \`this\` and the arguments of the latest call (\`lastArgs\`, \`lastThis\`) so we can call \`fn\` with exactly the data that arrived last, in the right context.

### What it looks like in code

\`\`\`js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
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
}
\`\`\`

Step by step. On every call we record the fresh arguments and context. \`callNow\` is true only if \`leading\` is on and there is no timer yet (i.e. this is the first call in a burst). Then \`clearTimeout(timer)\` cancels the previous pending call, and we start a new \`setTimeout\` for \`wait\` ms. When the timer finally fires, it clears \`timer\` and, if \`trailing\` is on and there are still pending arguments, calls \`invoke()\`. The \`callNow\` branch runs synchronously right away — that's the leading call.

The \`cancel()\` method lets you shut everything down early: clear the timer and reset the saved state (for example, when a component unmounts).

### Complexity

O(1) per call and O(1) memory — we only keep one timer and the latest arguments.

## ⚠️ Common pitfalls

- With \`leading && trailing\` a single call must not fire twice. The \`lastArgs\` check in the timer saves you: if leading already ran and nothing followed, \`invoke\` cleared \`lastArgs\`, so trailing won't fire again.
- Forgetting \`cancel()\` is a classic leak: the timer keeps living and may fire \`fn\` after it's no longer needed.
- Not preserving \`this\` means an object method loses its context. That's why we keep \`lastThis\` and call via \`fn.apply\`.

## 🎯 Key takeaways

- \`debounce\` = "wait for silence, then call once". The timer resets on every invocation.
- \`leading\` fires immediately, \`trailing\` fires after the pause; the default is trailing only.
- Always expose a \`cancel()\` method to abort a pending call.
- Difference from throttle: throttle guarantees a call every N ms, debounce fires only after a pause.`
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
      ru: `## 🧩 Простыми словами

\`throttle\` (дросселирование) — это как турникет в метро, который пускает не чаще одного человека раз в несколько секунд. Сколько бы событий ни прилетало подряд, функция выполнится максимум один раз за окно \`wait\` мс. Первый вызов проходит сразу, лишние в середине окна отбрасываются, но самый последний обязательно сработает в конце окна, чтобы ничего не потерять. Классический пример — обработчик прокрутки страницы, который стреляет десятки раз в секунду.

### Чем throttle отличается от debounce

Легко перепутать. \`debounce\` ждёт **тишины** и потом вызывает один раз. \`throttle\` не ждёт тишины — он просто **ограничивает частоту**: вызов раз в \`wait\` мс, регулярно, пока события идут. Debounce хорош для «поиска на лету», throttle — для скролла и ресайза, где нужна плавная, но не бешеная реакция.

### Как это работает

Мы запоминаем время последнего запуска (\`last\`). При каждом обращении считаем, сколько времени осталось до конца окна: \`remaining = wait - (now - last)\`.

- Если \`remaining <= 0\`, окно уже прошло — вызываем \`fn\` немедленно и обновляем \`last\`.
- Если окно ещё идёт и таймера нет — планируем **trailing-вызов** на остаток окна, сохранив последние аргументы. Так «хвостовое» событие не потеряется.

### Код

\`\`\`js
function throttle(fn, wait) {
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
}
\`\`\`

Разберём. \`Date.now()\` даёт текущее время в миллисекундах. При первом вызове \`last\` равно 0, поэтому \`remaining\` большое отрицательное — окно «прошло», и \`fn\` выполняется сразу (это leading-поведение). Дальше в течение окна \`remaining > 0\`, поэтому мы лишь ставим один отложенный таймер на конец окна. Пока он ждёт, новые вызовы просто обновляют \`lastArgs\`/\`lastThis\`, но новых таймеров не создают (\`!timer\`). Когда таймер срабатывает, он вызывает \`fn\` с самыми свежими аргументами — это и есть trailing. Метод \`cancel()\` гасит таймер и сбрасывает состояние.

### Сложность

O(1) на каждый вызов, O(1) по памяти.

## ⚠️ Подводные камни

- Забыть trailing-логику — и последнее событие в серии потеряется. Это частая ошибка на собеседовании: скролл «замирает» на предпоследнем положении.
- Не сбросить таймер и \`lastArgs\` после срабатывания — получишь лишний, дублирующий вызов.
- Использование \`Date.now()\` завязано на системные часы; для анимаций точнее \`performance.now()\`.

## 🎯 Запомни

- \`throttle\` = «не чаще раза в N мс», регулярно, пока идут события. Debounce ждёт паузы.
- Первый вызов — сразу (leading), последний — в конце окна (trailing).
- Для скролла удобна версия на \`requestAnimationFrame\`: привязывает частоту к кадрам (~60fps) и синхронизирует с отрисовкой.
- В Lodash throttle — это debounce с параметром \`maxWait\`.`,
      en: `## 🧩 In plain words

\`throttle\` is like a subway turnstile that lets at most one person through every few seconds. No matter how many events come in a row, the function runs at most once per \`wait\` ms window. The first call goes through immediately, extra calls in the middle of the window are dropped, but the very last one is guaranteed to fire at the end of the window so nothing is lost. The classic example is a scroll handler that fires dozens of times per second.

### How throttle differs from debounce

Easy to mix up. \`debounce\` waits for **silence** and then calls once. \`throttle\` doesn't wait for silence — it just **caps the rate**: one call per \`wait\` ms, steadily, as long as events keep coming. Debounce fits "search-as-you-type"; throttle fits scroll and resize, where you want a smooth but not frantic reaction.

### How it works

We remember the timestamp of the last run (\`last\`). On every invocation we compute how much of the window is left: \`remaining = wait - (now - last)\`.

- If \`remaining <= 0\`, the window has already passed — call \`fn\` immediately and update \`last\`.
- If the window is still open and there's no timer yet — schedule a **trailing call** for the rest of the window, saving the latest arguments. That way the tail event isn't lost.

### The code

\`\`\`js
function throttle(fn, wait) {
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
}
\`\`\`

Let's break it down. \`Date.now()\` gives the current time in milliseconds. On the first call \`last\` is 0, so \`remaining\` is a large negative number — the window has "passed", and \`fn\` runs right away (that's the leading behaviour). During the window \`remaining > 0\`, so we only set one pending timer for the end of the window. While it waits, new calls simply update \`lastArgs\`/\`lastThis\` but create no new timers (\`!timer\`). When the timer fires, it calls \`fn\` with the freshest arguments — that's the trailing call. The \`cancel()\` method clears the timer and resets state.

### Complexity

O(1) per call, O(1) memory.

## ⚠️ Common pitfalls

- Forgetting the trailing logic drops the final event in a burst. It's a common interview miss: the scroll handler "freezes" one step before the real position.
- Not resetting the timer and \`lastArgs\` after firing gives you an extra, duplicate call.
- \`Date.now()\` depends on the system clock; for animations \`performance.now()\` is more precise.

## 🎯 Key takeaways

- \`throttle\` = "no more than once per N ms", steadily, while events flow. Debounce waits for a pause.
- First call fires immediately (leading), the last one fires at the end of the window (trailing).
- For scrolling, a \`requestAnimationFrame\` version is handy: it ties the rate to frames (~60fps) and syncs with paint.
- In Lodash, throttle is debounce with a \`maxWait\` option.`
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
      ru: `## 🧩 Простыми словами

\`Promise.all\` — это как отправить несколько курьеров и ждать, пока вернутся все, чтобы собрать полный заказ. Ты даёшь массив промисов (обещаний), а получаешь один общий промис. Он выполнится (resolve) массивом всех результатов — но только когда вернутся абсолютно все. А если хоть один курьер провалился (reject), общий промис немедленно падает с этой первой ошибкой. Написать такой полифил (самодельную замену встроенной функции) — популярная задача на собеседовании.

### Основная идея

Мы создаём новый промис и внутри заводим два помощника: массив \`results\` нужной длины и счётчик \`remaining\` — сколько промисов ещё не завершилось. Каждый элемент оборачиваем в \`Promise.resolve(...)\`. Это важный трюк: если во входном массиве лежит «сырое» значение (число, строка), а не промис, \`Promise.resolve\` превратит его в уже выполненный промис. Так код работает единообразно и с промисами, и с обычными значениями.

Результат каждого промиса мы записываем **по его индексу** \`results[i]\`. Поэтому порядок в итоговом массиве совпадает с порядком входа, даже если быстрые промисы завершились раньше медленных. Когда счётчик дойдёт до нуля — все готовы, резолвим \`results\`.

### Код

\`\`\`js
function promiseAll(iterable) {
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
}
\`\`\`

Разберём. \`Array.from(iterable)\` превращает любой перебираемый объект (массив, Set) в обычный массив. Если он пуст, сразу резолвим пустым \`[]\` — иначе счётчик уже 0 и \`resolve\` не вызвался бы никогда. Далее по каждому элементу: \`.then\` принимает два колбэка — успех и ошибку. В успехе пишем значение по индексу и уменьшаем счётчик; при нуле — общий resolve. Во втором аргументе стоит просто \`reject\` — то есть **первая же ошибка** любого промиса мгновенно реджектит весь \`promiseAll\`. Это называется «короткое замыкание» (short-circuit).

### Сложность

O(n) по времени и O(n) по памяти — по одному проходу и по слоту результата на каждый промис.

## ⚠️ Подводные камни

- Пустой массив нужно обработать отдельно: иначе \`resolve\` не сработает и общий промис зависнет навсегда.
- После первого reject остальные промисы **продолжают исполняться** — отменить их нельзя, промисы в JS неотменяемы. Просто их результат уже никого не интересует.
- Забыть \`Promise.resolve\` — и код упадёт на «сырых» значениях, у которых нет метода \`.then\`.

## 🎯 Запомни

- \`Promise.all\` = «дождись всех или упади на первой ошибке».
- Порядок результатов = порядок входа, а не порядок завершения (пишем по индексу).
- Первый reject «закорачивает» весь результат.
- Отличие от \`allSettled\`: тот никогда не реджектится и всегда возвращает статус каждого промиса.`,
      en: `## 🧩 In plain words

\`Promise.all\` is like sending out several couriers and waiting for all of them to return so you can assemble the full order. You give it an array of promises, and you get one combined promise back. It resolves with an array of all the results — but only once every single one has returned. And if even one courier fails (rejects), the combined promise fails immediately with that first error. Writing this polyfill (a hand-made replacement for the built-in) is a popular interview task.

### The core idea

We create a new promise and, inside it, set up two helpers: a \`results\` array of the right length and a \`remaining\` counter — how many promises are still pending. We wrap each item in \`Promise.resolve(...)\`. That's an important trick: if the input array holds a raw value (a number, a string) instead of a promise, \`Promise.resolve\` turns it into an already-fulfilled promise. So the code works uniformly for both promises and plain values.

We write each promise's result **by its index** \`results[i]\`. That way the order of the final array matches the input order, even if the fast promises finish before the slow ones. When the counter hits zero, everyone is done, so we resolve \`results\`.

### The code

\`\`\`js
function promiseAll(iterable) {
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
}
\`\`\`

Let's break it down. \`Array.from(iterable)\` turns any iterable (array, Set) into a plain array. If it's empty, we resolve immediately with \`[]\` — otherwise the counter is already 0 and \`resolve\` would never be called. Then for each item: \`.then\` takes two callbacks — success and error. In success we write the value by index and decrement the counter; at zero we resolve the whole thing. The second argument is simply \`reject\` — so the **very first error** of any promise instantly rejects the whole \`promiseAll\`. This is called short-circuiting.

### Complexity

O(n) time and O(n) memory — one pass and one result slot per promise.

## ⚠️ Common pitfalls

- The empty array must be handled separately: otherwise \`resolve\` never fires and the combined promise hangs forever.
- After the first reject the other promises **keep running** — you can't cancel them, promises in JS aren't cancellable. Their result simply no longer matters.
- Forgetting \`Promise.resolve\` breaks the code on raw values that have no \`.then\` method.

## 🎯 Key takeaways

- \`Promise.all\` = "wait for all, or fail on the first error".
- Result order = input order, not completion order (we write by index).
- The first reject short-circuits the whole result.
- Difference from \`allSettled\`: that one never rejects and always returns each promise's status.`
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
      ru: `## 🧩 Простыми словами

\`Promise.allSettled\` — это добрый старший брат \`Promise.all\`. Он тоже ждёт, пока завершатся все промисы, но, в отличие от \`all\`, **никогда не падает целиком**. Даже если часть операций провалилась, ты получишь полный отчёт: по каждому промису — либо «получилось, вот значение», либо «не получилось, вот причина». Это как разослать письма и дождаться ответа от каждого адресата — неважно, согласие это или отказ, главное узнать судьбу каждого.

### Основная идея

Устройство почти как у \`Promise.all\`, с одним ключевым отличием: мы вешаем на каждый промис **оба** колбэка — и на успех, и на ошибку — и в обоих случаях записываем результат, а не реджектим общий промис. Для каждого промиса формируется объект-**дескриптор** (описатель статуса):

- при успехе — \`{ status: "fulfilled", value }\`;
- при ошибке — \`{ status: "rejected", reason }\`.

Счётчик \`remaining\` уменьшается в любом из двух случаев, потому что промис в любом исходе считается «завершённым» (settled). Результаты пишем по индексу, так что порядок совпадает с входным.

### Код

\`\`\`js
function promiseAllSettled(iterable) {
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
}
\`\`\`

Обрати внимание: у внешнего промиса есть только \`resolve\` и нет \`reject\` — это визуально подчёркивает, что упасть он не может. Вспомогательная функция \`settle\` пишет дескриптор по индексу и уменьшает счётчик; когда все завершились, резолвит массив. \`Promise.resolve(item)\` снова нужен, чтобы принимать и «сырые» значения. Пустой ввод обрабатываем отдельно, иначе общий промис зависнет.

### Сложность

O(n) по времени и O(n) по памяти.

## ⚠️ Подводные камни

- Легко по привычке добавить \`reject\` во внешний промис — но у \`allSettled\` его быть не должно, иначе теряется весь смысл.
- Пустой массив, как и в \`all\`, надо обработать отдельно, иначе зависание.
- Дескриптор должен точно соответствовать спецификации: ключи именно \`status\`/\`value\`/\`reason\`.

## 🎯 Запомни

- \`allSettled\` = «дождись всех и расскажи про каждого», никогда не реджектится.
- Каждый элемент — объект \`{ status, value }\` или \`{ status, reason }\`, порядок = входной.
- Выбирай его, когда нужно завершить все независимые операции и обработать частичные сбои (например, несколько сетевых запросов на дашборде).
- Можно построить и поверх \`Promise.all\`, обернув каждый промис в тот, что никогда не реджектится.`,
      en: `## 🧩 In plain words

\`Promise.allSettled\` is the kind older sibling of \`Promise.all\`. It also waits for every promise to finish, but unlike \`all\` it **never fails as a whole**. Even if some operations failed, you get a full report: for each promise, either "succeeded, here's the value" or "failed, here's the reason". It's like mailing out letters and waiting for a reply from every recipient — whether it's a yes or a no doesn't matter, what matters is learning the fate of each one.

### The core idea

The structure is almost identical to \`Promise.all\`, with one key difference: we attach **both** callbacks to each promise — success and error — and in both cases we record the result instead of rejecting the combined promise. For each promise we build a **descriptor** object (a status descriptor):

- on success — \`{ status: "fulfilled", value }\`;
- on failure — \`{ status: "rejected", reason }\`.

The \`remaining\` counter decrements in either branch, because a promise counts as "settled" whatever the outcome. We write results by index, so the order matches the input.

### The code

\`\`\`js
function promiseAllSettled(iterable) {
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
}
\`\`\`

Notice: the outer promise has only \`resolve\` and no \`reject\` — a visual reminder that it can't fail. The helper \`settle\` writes the descriptor by index and decrements the counter; when everyone is done, it resolves the array. \`Promise.resolve(item)\` is again there to accept raw values too. We handle empty input separately, otherwise the combined promise would hang.

### Complexity

O(n) time and O(n) memory.

## ⚠️ Common pitfalls

- It's easy to add \`reject\` to the outer promise out of habit — but \`allSettled\` must not have one, or it loses its whole point.
- The empty array, just like in \`all\`, must be handled separately, or it hangs.
- The descriptor must match the spec exactly: the keys are precisely \`status\`/\`value\`/\`reason\`.

## 🎯 Key takeaways

- \`allSettled\` = "wait for all and report on each one"; it never rejects.
- Each element is a \`{ status, value }\` or \`{ status, reason }\` object, order = input order.
- Choose it when you must finish all independent operations and handle partial failures (e.g. several network calls on a dashboard).
- You can also build it on top of \`Promise.all\` by wrapping each promise in one that never rejects.`
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
      ru: `## 🧩 Простыми словами

Промис — это «обещание» результата, который придёт позже: он либо **исполнится** (resolve, всё хорошо), либо **отклонится** (reject, ошибка). Представь несколько курьеров, которых ты отправил за одним и тем же товаром. \`race\` — это как «принять того, кто вернулся первым, неважно с товаром или с отказом». \`any\` — «жду первого, кто реально принесёт товар; отказы игнорирую, и только если ВСЕ вернулись с пустыми руками — расстраиваюсь».

### Что делает Promise.race

\`Promise.race(iterable)\` берёт список промисов (\`iterable\` — любой перебираемый набор, например массив) и «оседает» (settles — окончательно фиксирует свой исход) вместе с тем, кто завершился **первым** — неважно, успехом или ошибкой. Все остальные результаты после этого просто игнорируются.

Ключевой факт: промис можно «осадить» только один раз. Первый вызов \`resolve\` или \`reject\` побеждает, последующие ничего не делают. Поэтому полифил такой короткий:

\`\`\`js
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}
\`\`\`

Мы подписываемся на каждый элемент. \`Promise.resolve(item)\` оборачивает значение в промис (на случай, если это не промис, а обычное число). Как только любой из них завершается, он дёргает общий \`resolve\` или \`reject\` — и первый выигрывает.

### Что делает Promise.any

\`Promise.any(iterable)\` ждёт **первый успешный** промис. Ошибки он терпит: копит их причины, и только когда провалились **все**, отклоняется с особой ошибкой \`AggregateError\` — это встроенный класс ошибки, который несёт внутри **массив всех** причин отказа (свойство \`.errors\`).

\`\`\`js
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
}
\`\`\`

Логика: успех сразу зовёт \`resolve\` (первый победил). Ошибку мы записываем в \`errors[i]\` по индексу и уменьшаем счётчик \`remaining\`. Когда счётчик дошёл до нуля — надежды не осталось, отклоняемся с \`AggregateError\`.

### Сложность

Оба работают за O(n) по времени (проходим список один раз). Память: \`race\` — O(1) сверх входа, \`any\` — O(n), потому что хранит массив причин ошибок.

## ⚠️ Подводные камни

- \`race([])\` с пустым списком **зависает навсегда** — промису нечем «осесть». Это поведение по спецификации, не баг.
- \`any([])\` наоборот — сразу отклоняется \`AggregateError\` с пустым массивом причин.
- Не путай \`AggregateError\` с обычной \`Error\`: причины лежат в \`.errors\`, а не в \`.message\`.

## 🎯 Запомни

- \`race\` = первый **завершившийся** побеждает, успех или ошибка — без разницы.
- \`any\` = первый **успешный** побеждает; ошибки копятся и «стреляют» через \`AggregateError\`, только если провалились все.
- Промис оседает лишь однажды — на этом и держится вся элегантность полифила \`race\`.`,
      en: `## 🧩 In plain words

A promise is a "promise" of a result that arrives later: it either **fulfills** (resolve, all good) or **rejects** (reject, error). Imagine sending several couriers after the same item. \`race\` is "take whoever comes back first, whether with the goods or with a refusal." \`any\` is "wait for the first one who actually brings the goods; ignore refusals, and only get upset if EVERYONE comes back empty-handed."

### What Promise.race does

\`Promise.race(iterable)\` takes a list of promises (\`iterable\` — any enumerable collection, e.g. an array) and **settles** (locks in its final outcome) together with whichever one finishes **first** — success or error, doesn't matter. Every other result after that is simply ignored.

Key fact: a promise can settle only once. The first call to \`resolve\` or \`reject\` wins; later ones do nothing. That's why the polyfill is so short:

\`\`\`js
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}
\`\`\`

We subscribe to every element. \`Promise.resolve(item)\` wraps the value in a promise (in case it's not a promise but a plain number). As soon as any of them finishes, it calls the shared \`resolve\` or \`reject\` — and the first one wins.

### What Promise.any does

\`Promise.any(iterable)\` waits for the **first fulfilled** promise. It tolerates errors: it collects their reasons, and only when **all** have rejected does it reject with a special \`AggregateError\` — a built-in error class that carries an **array of all** rejection reasons (its \`.errors\` property).

\`\`\`js
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
}
\`\`\`

The logic: a success immediately calls \`resolve\` (first one wins). An error we store in \`errors[i]\` by index and decrement the \`remaining\` counter. When it hits zero — no hope left — we reject with \`AggregateError\`.

### Complexity

Both are O(n) time (one pass over the list). Memory: \`race\` is O(1) beyond the input, \`any\` is O(n) because it holds the array of rejection reasons.

## ⚠️ Common pitfalls

- \`race([])\` with an empty list **hangs forever** — there's nothing to settle it with. This is per spec, not a bug.
- \`any([])\` does the opposite — it rejects immediately with an \`AggregateError\` holding an empty reasons array.
- Don't confuse \`AggregateError\` with a plain \`Error\`: the reasons live in \`.errors\`, not in \`.message\`.

## 🎯 Key takeaways

- \`race\` = first to **settle** wins, success or error alike.
- \`any\` = first to **fulfill** wins; errors pile up and fire an \`AggregateError\` only if all fail.
- A promise settles just once — that single fact is what makes the \`race\` polyfill so elegant.`
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
      ru: `## 🧩 Простыми словами

Представь, что нужно загрузить 1000 файлов, но сервер выдержит только 5 одновременно. \`asyncPool\` — это «диспетчер очереди»: он держит ровно \`limit\` задач «в работе», и как только одна освобождается — сразу запускает следующую. Никакой простой, но и не перегружаем систему. Результаты возвращаются в том же порядке, в каком шли элементы, даже если завершались они вразнобой.

### Идея пула

Заводим набор «активных» задач (\`executing\`). Идём по элементам: для каждого запускаем \`iteratorFn\`, кладём его промис в набор. Когда задача завершится — убираем её из набора. Если набор дорос до \`limit\`, мы **ждём** (\`await Promise.race(executing)\`), пока хоть одна задача не финиширует и не освободит слот. Только тогда идём дальше.

\`\`\`js
async function asyncPool(limit, items, iteratorFn) {
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
}
\`\`\`

### Разбор по шагам

- \`results\` — массив под ответы, заполняем **по индексу** (\`results[index] = res\`), поэтому порядок завершения не важен, порядок в итоге всегда исходный.
- \`executing\` — это \`Set\` (множество) активных промисов. \`Set\` удобен тем, что из него легко удалить конкретный элемент через \`.delete()\`.
- Каждый промис \`p\`, завершившись, сам вычищает себя из набора: \`executing.delete(p)\`.
- \`Promise.race(executing)\` резолвится, как только **первая** задача из набора закончилась — то есть как только освободился один слот. Именно поэтому здесь \`race\`, а не \`all\`: нам не нужно ждать все, достаточно одной.
- После цикла остаются «хвостовые» задачи, которые ещё не успели финишировать — их дожидаемся через \`await Promise.all(executing)\`.

### Сложность

O(n) запусков всего. В любой момент времени в памяти живёт максимум \`limit\` активных задач плюс массив результатов на O(n).

## ⚠️ Подводные камни

- Ошибка в одной задаче отклонит весь пул (первый же \`reject\` в цепочке всплывёт). Если нужно «пусть падают по отдельности, а мы соберём всё» — оборачивай \`iteratorFn\` в \`try/catch\` или используй логику в духе \`allSettled\`.
- Если \`limit >= items.length\`, пул вырождается в обычный \`Promise.all\` — всё стартует практически сразу.
- Не забудь заполнять \`results\` именно по индексу; если делать \`results.push()\`, порядок сломается.

## 🎯 Запомни

- Пул = «не больше \`limit\` задач в полёте одновременно», освободился слот — запустили следующую.
- \`Promise.race(executing)\` ждёт освобождения **одного** слота, \`Promise.all\` ждал бы все — поэтому внутри именно \`race\`.
- Пиши результаты по индексу — тогда исходный порядок сохраняется бесплатно.`,
      en: `## 🧩 In plain words

Imagine you need to upload 1000 files, but the server only tolerates 5 at once. \`asyncPool\` is a "queue dispatcher": it keeps exactly \`limit\` tasks "in flight," and the moment one frees up it launches the next. No idle time, but we never overload the system either. Results come back in the same order the items went in, even if the tasks finished out of order.

### The pool idea

Keep a set of "in-flight" tasks (\`executing\`). Walk the items: for each one launch \`iteratorFn\` and put its promise in the set. When a task finishes, remove it from the set. If the set grows to \`limit\`, we **wait** (\`await Promise.race(executing)\`) until at least one task finishes and frees a slot. Only then do we move on.

\`\`\`js
async function asyncPool(limit, items, iteratorFn) {
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
}
\`\`\`

### Step by step

- \`results\` — the answers array, filled **by index** (\`results[index] = res\`), so completion order doesn't matter; the final order is always the original one.
- \`executing\` — a \`Set\` of active promises. A \`Set\` is handy because you can remove a specific element from it via \`.delete()\`.
- Each promise \`p\`, once done, cleans itself out of the set: \`executing.delete(p)\`.
- \`Promise.race(executing)\` resolves as soon as the **first** task in the set finishes — i.e. as soon as one slot frees. That's exactly why it's \`race\`, not \`all\`: we don't need to wait for all of them, just one.
- After the loop there are "tail" tasks that haven't finished yet — we await them with \`await Promise.all(executing)\`.

### Complexity

O(n) launches total. At any moment memory holds at most \`limit\` active tasks plus the O(n) results array.

## ⚠️ Common pitfalls

- An error in one task rejects the whole pool (the first \`reject\` in the chain bubbles up). If you want "let them fail individually and collect everything," wrap \`iteratorFn\` in \`try/catch\` or use \`allSettled\`-style logic.
- If \`limit >= items.length\`, the pool degenerates into a plain \`Promise.all\` — everything starts almost immediately.
- Don't forget to fill \`results\` by index; using \`results.push()\` would break the order.

## 🎯 Key takeaways

- Pool = "no more than \`limit\` tasks in flight at once"; a slot frees, the next one launches.
- \`Promise.race(executing)\` waits for **one** slot to free; \`Promise.all\` would wait for all — that's why it's \`race\` inside.
- Write results by index and the original order is preserved for free.`
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
      ru: `## 🧩 Простыми словами

Сеть иногда «моргает»: запрос упал не потому, что всё сломано, а случайно. \`retry\` — это «попробуй ещё раз, но не долби сервер в упор». После каждой неудачи он ждёт всё дольше и дольше (это называется **экспоненциальная задержка**, backoff), давая системе шанс прийти в себя. Как со звонком другу: не дозвонился — подожди, потом ещё, увеличивая паузы, а не звони 100 раз в секунду.

### Идея

Крутим цикл попыток. Если \`fn\` отработала — сразу возвращаем результат. Если упала — запоминаем ошибку, ждём растущую паузу \`baseDelay * factor^attempt\` и пробуем снова. Когда попытки кончились — отклоняемся **последней** пойманной ошибкой.

Формула задержки: на попытке 0 ждём \`baseDelay\`, на попытке 1 — \`baseDelay * factor\`, на попытке 2 — \`baseDelay * factor²\` и так далее. При \`baseDelay=200, factor=2\` это 200 мс, 400 мс, 800 мс — пауза удваивается.

\`\`\`js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
}
\`\`\`

### Разбор

- \`sleep(ms)\` — крошечный помощник: промис, который резолвится через \`ms\` миллисекунд через \`setTimeout\`. Именно его мы \`await\`-им, чтобы «поспать» между попытками.
- \`try/catch\` внутри цикла ловит ошибку каждой попытки. Успех — \`return\` выходит из функции сразу.
- \`if (attempt === retries) break;\` — если это была последняя попытка, не спим зря, а выходим и бросаем ошибку.
- \`jitter\` («дрожание») — случайная добавка \`Math.random() * baseDelay\`. Зачем: если 1000 клиентов упали одновременно, без jitter они и повторят все разом, снова уронив сервер («эффект грозового стада», thundering herd). Случайный сдвиг «размазывает» их во времени.

### Сложность

Не более \`retries\` повторов. Паузы растут экспоненциально, поэтому суммарное время ожидания ограничено и предсказуемо.

## ⚠️ Подводные камни

- Не стоит ретраить **фатальные** ошибки — например HTTP 4xx (неверный запрос, 404): повтор не поможет. Добавь предикат \`shouldRetry(err)\`, который решает, есть ли смысл.
- \`retries = 0\` означает ровно один вызов без повторов (цикл выполнится один раз при \`attempt = 0\`).
- Без ограничения сверху задержка может вырасти до абсурда — прикрути «потолок» через \`Math.min(cap, ...)\`.

## 🎯 Запомни

- Экспоненциальный backoff = каждая следующая пауза в \`factor\` раз длиннее предыдущей.
- \`jitter\` (случайный сдвиг) спасает от синхронных всплесков нагрузки при массовых ретраях.
- Ретраить имеет смысл только временные сбои; на фатальные ошибки нужен \`shouldRetry\`.`,
      en: `## 🧩 In plain words

The network sometimes "blinks": a request fails not because everything's broken but by chance. \`retry\` is "try again, but don't hammer the server point-blank." After each failure it waits longer and longer (this is called **exponential backoff**), giving the system a chance to recover. Like calling a friend: no answer — wait, then again, stretching the pauses, rather than dialing 100 times a second.

### The idea

Spin a loop of attempts. If \`fn\` succeeds — return the result right away. If it fails — remember the error, wait a growing pause \`baseDelay * factor^attempt\`, and try again. When attempts run out — reject with the **last** caught error.

The delay formula: on attempt 0 wait \`baseDelay\`, on attempt 1 wait \`baseDelay * factor\`, on attempt 2 wait \`baseDelay * factor²\`, and so on. With \`baseDelay=200, factor=2\` that's 200 ms, 400 ms, 800 ms — the pause doubles.

\`\`\`js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
}
\`\`\`

### Breakdown

- \`sleep(ms)\` — a tiny helper: a promise that resolves after \`ms\` milliseconds via \`setTimeout\`. We \`await\` it to "nap" between attempts.
- \`try/catch\` inside the loop catches each attempt's error. On success, \`return\` exits the function immediately.
- \`if (attempt === retries) break;\` — if this was the last attempt, don't sleep pointlessly; break out and throw the error.
- \`jitter\` — a random add-on, \`Math.random() * baseDelay\`. Why: if 1000 clients fail at the same instant, without jitter they'd all retry at once too, taking the server down again (the "thundering herd" effect). A random offset "smears" them across time.

### Complexity

At most \`retries\` retries. Pauses grow exponentially, so total wait time is bounded and predictable.

## ⚠️ Common pitfalls

- Don't retry **fatal** errors — e.g. HTTP 4xx (bad request, 404): retrying won't help. Add a \`shouldRetry(err)\` predicate that decides whether it's worth it.
- \`retries = 0\` means exactly one call, no retries (the loop runs once at \`attempt = 0\`).
- Without an upper cap the delay can balloon absurdly — clamp it with \`Math.min(cap, ...)\`.

## 🎯 Key takeaways

- Exponential backoff = each next pause is \`factor\` times longer than the previous one.
- \`jitter\` (a random offset) saves you from synchronized load spikes during mass retries.
- Only retry transient failures; fatal errors need a \`shouldRetry\` guard.`
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
      ru: `## 🧩 Простыми словами

Есть список асинхронных задач, и их нужно выполнить **строго по очереди**: следующая стартует только когда предыдущая полностью закончилась. Это как эстафета — палочку нельзя передать, пока бегун не добежал. Противоположность — \`Promise.all\`, где все стартуют одновременно, «наперегонки». Здесь же важна именно очередь: например, когда каждый шаг зависит от результата предыдущего или нельзя нагружать сервер параллельно.

### Вариант с for...of

Самый читаемый способ — обычный цикл \`for...of\` с \`await\` внутри. \`await\` внутри цикла буквально «останавливает» выполнение до завершения текущей задачи, и только потом идёт следующая итерация.

\`\`\`js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSequential(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
\`\`\`

\`task()\` вызывает функцию, получая промис; \`await\` ждёт его; результат кладём в \`results\`. Поскольку каждая итерация ждёт свою задачу, задачи не пересекаются.

\`sleep(ms)\` тут — вспомогательный промис, который резолвится через заданное время (\`setTimeout\`). Удобно, если задача должна «подождать».

### Вариант с reduce (без async/await)

Классический трюк — \`reduce\` поверх промис-цепочки. Мы строим одну длинную цепочку \`.then()\`: каждый шаг ждёт накопленный результат (\`acc\`), выполняет свою задачу и добавляет результат в массив.

\`\`\`js
function runSequentialReduce(tasks) {
  return tasks.reduce(
    (chain, task) =>
      chain.then((acc) => task().then((res) => [...acc, res])),
    Promise.resolve([])
  );
}
\`\`\`

Начальное значение \`reduce\` — \`Promise.resolve([])\` (уже готовый промис с пустым массивом). На каждом шаге \`chain.then(...)\` пристраивает следующую задачу **в конец** цепочки, поэтому она не запустится, пока не отработала предыдущая. \`[...acc, res]\` — это накопление результатов в новый массив.

### Сложность

O(n) по времени, потому что задачи идут последовательно (их длительности складываются, а не перекрываются). O(n) память под массив результатов.

## ⚠️ Подводные камни

- Ошибка в любой задаче прервёт всю цепочку (промис отклонится), если не обернуть шаг в \`try/catch\`.
- Пустой массив задач корректно вернёт \`[]\`.
- Главная ловушка: \`tasks.map(t => t())\` **запускает все промисы немедленно**, параллельно — даже если потом сделать \`await Promise.all(...)\`. \`map\` только собирает уже стартовавшие промисы. Для настоящей последовательности нужен \`reduce\` или \`for...of\` с \`await\` внутри.

## 🎯 Запомни

- Последовательность = \`await\` внутри \`for...of\` **или** цепочка через \`reduce\`.
- \`map(t => t())\` стартует всё сразу — это параллельность, а не очередь.
- \`Promise.all\` — про «все разом», последовательный запуск — про «один за другим».`,
      en: `## 🧩 In plain words

You have a list of async tasks and must run them **strictly one after another**: the next starts only once the previous fully finishes. It's like a relay race — you can't pass the baton until the runner arrives. The opposite is \`Promise.all\`, where everything starts at once, racing each other. Here the queue matters: for example, when each step depends on the previous result, or you can't hit the server in parallel.

### The for...of version

The most readable approach is a plain \`for...of\` loop with \`await\` inside. \`await\` inside the loop literally "pauses" execution until the current task finishes, and only then does the next iteration begin.

\`\`\`js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSequential(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
\`\`\`

\`task()\` calls the function, yielding a promise; \`await\` waits for it; the result goes into \`results\`. Because each iteration waits for its task, the tasks never overlap.

\`sleep(ms)\` here is a helper promise that resolves after a given time (\`setTimeout\`). Handy when a task needs to "wait."

### The reduce version (no async/await)

The classic trick is a \`reduce\` over a promise chain. We build one long \`.then()\` chain: each step waits for the accumulated result (\`acc\`), runs its task, and appends the result to the array.

\`\`\`js
function runSequentialReduce(tasks) {
  return tasks.reduce(
    (chain, task) =>
      chain.then((acc) => task().then((res) => [...acc, res])),
    Promise.resolve([])
  );
}
\`\`\`

The \`reduce\` seed is \`Promise.resolve([])\` (an already-settled promise holding an empty array). At each step \`chain.then(...)\` attaches the next task **to the end** of the chain, so it won't start until the previous one finishes. \`[...acc, res]\` accumulates results into a new array.

### Complexity

O(n) time, because the tasks run sequentially (their durations add up rather than overlap). O(n) memory for the results array.

## ⚠️ Common pitfalls

- An error in any task breaks the whole chain (the promise rejects) unless you wrap the step in \`try/catch\`.
- An empty task array correctly returns \`[]\`.
- The main trap: \`tasks.map(t => t())\` **fires all promises immediately**, in parallel — even if you later do \`await Promise.all(...)\`. \`map\` just collects already-started promises. True sequencing needs \`reduce\` or \`for...of\` with \`await\` inside.

## 🎯 Key takeaways

- Sequencing = \`await\` inside \`for...of\` **or** a chain via \`reduce\`.
- \`map(t => t())\` starts everything at once — that's parallelism, not a queue.
- \`Promise.all\` is "all at once"; sequential execution is "one after another."`
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
      ru: `## 🧩 Простыми словами

Обычный промис — это как письмо, которое уже отправили: вернуть его нельзя, оно всё равно дойдёт. Но иногда результат нам стал не нужен (пользователь ушёл со страницы), и мы хотим «отменить». Есть два честных способа: либо просто **игнорировать** ответ, когда он придёт (обёртка), либо по-настоящему **оборвать** сетевой запрос через \`AbortController\`.

### Почему промис нельзя отменить «по-настоящему»

Промис — это одностороннее «обещание»: тот, кто его создал, обещал когда-нибудь дать результат. У получателя нет рычага, чтобы залезть внутрь и остановить работу. Стандарт языка специально не дал промисам метод \`cancel()\` — вместо этого для отмены придумали отдельный механизм сигналов (\`AbortController\`). Поэтому «отмена» промиса — это всегда либо трюк с игнорированием, либо отмена того, что промис оборачивает.

### Вариант A: обёртка, которая глотает результат

Идея: заводим флаг \`canceled\`. Когда исходный промис завершится, мы смотрим на флаг. Если отмена была — не отдаём результат потребителю (реджектим специальным объектом \`{ isCanceled: true }\` или вообще «подвешиваем» промис, ничего не вызывая). Если отмены не было — работаем как обычно.

\`\`\`js
// Вариант A: обёртка, игнорирующая результат после cancel
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
\`\`\`

Важно понимать: исходный промис всё равно завершится и его побочные эффекты (например, сам сетевой запрос) никуда не денутся — мы лишь **не показываем** результат потребителю. Утечки памяти при этом нет: промис оседает один раз и освобождается.

### Вариант B: настоящая отмена через AbortController

\`AbortController\` — встроенный объект-«рубильник». У него есть \`signal\`, который мы передаём в \`fetch\`. Когда мы вызываем \`controller.abort()\`, браузер реально прерывает запрос, а промис \`fetch\` реджектится ошибкой с именем \`AbortError\`.

\`\`\`js
// Вариант B: реальная отмена с AbortController
function fetchCancelable(url) {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal });
  return { promise, cancel: () => controller.abort() };
}
\`\`\`

Сложность обоих вариантов — O(1): мы просто оборачиваем работу, лишних проходов нет.

## ⚠️ Подводные камни

- Вариант A **не останавливает** саму работу: запрос всё равно уйдёт на сервер, таймер отработает и т.д. Отменяется только доставка результата.
- \`AbortError\` нужно ловить отдельно и не путать с настоящей ошибкой сети — это не сбой, а ожидаемая отмена.

## 🎯 Запомни

- Нативные промисы отменить нельзя — модель «обещания» односторонняя.
- Вариант A = игнорировать результат (побочные эффекты остаются).
- Вариант B = \`AbortController\` реально обрывает \`fetch\`, реджектя \`AbortError\`.`,
      en: `## 🧩 In plain words

A regular promise is like a letter you already mailed: you can't unsend it, it will still arrive. But sometimes we no longer need the result (the user left the page) and want to "cancel." There are two honest ways: either just **ignore** the answer when it comes (a wrapper), or **truly abort** the network request via \`AbortController\`.

### Why a promise can't be "really" canceled

A promise is a one-way "promise": whoever created it pledged to deliver a result someday. The receiver has no lever to reach inside and stop the work. The language spec deliberately gave promises no \`cancel()\` method — instead a separate signal mechanism (\`AbortController\`) was invented for cancellation. So "canceling" a promise is always either an ignore-the-result trick, or canceling whatever the promise wraps.

### Variant A: a wrapper that swallows the result

The idea: keep a \`canceled\` flag. When the original promise settles, we check the flag. If cancel happened, we don't pass the result to the consumer (reject with a special \`{ isCanceled: true }\` object, or just "hang" the promise, calling nothing). If no cancel, we behave normally.

\`\`\`js
// Variant A: wrapper that ignores the result after cancel
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
\`\`\`

Key point: the original promise still settles and its side effects (e.g. the network request itself) don't go away — we merely **don't show** the result to the consumer. There's no memory leak: the promise settles once and is freed.

### Variant B: real cancellation via AbortController

\`AbortController\` is a built-in "kill switch" object. It has a \`signal\` that we pass into \`fetch\`. When we call \`controller.abort()\`, the browser truly interrupts the request and the \`fetch\` promise rejects with an error named \`AbortError\`.

\`\`\`js
// Variant B: real cancellation with AbortController
function fetchCancelable(url) {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal });
  return { promise, cancel: () => controller.abort() };
}
\`\`\`

Complexity of both variants is O(1): we just wrap the work, no extra passes.

## ⚠️ Common pitfalls

- Variant A does **not** stop the actual work: the request still goes to the server, the timer still fires, etc. Only the delivery of the result is canceled.
- Catch \`AbortError\` separately and don't confuse it with a real network error — it's not a failure, it's an expected cancellation.

## 🎯 Key takeaways

- Native promises can't be canceled — the "promise" model is one-way.
- Variant A = ignore the result (side effects remain).
- Variant B = \`AbortController\` truly aborts the \`fetch\`, rejecting with \`AbortError\`.`
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
      ru: `## 🧩 Простыми словами

Раньше в Node функции работали через **колбэки**: ты передаёшь функцию, которую вызовут, когда работа закончится. Причём по соглашению первый аргумент этого колбэка — ошибка (\`err\`), а второй — результат. \`promisify\` — это переводчик: он берёт такую «колбэчную» функцию и превращает её в функцию, которая возвращает **промис**, чтобы можно было писать \`await\` вместо вложенных колбэков.

### Что такое «error-first колбэк»

В Node принято соглашение: последний аргумент функции — это колбэк вида \`callback(err, result)\`. Если что-то пошло не так, \`err\` заполнен, а \`result\` пустой. Если всё хорошо — \`err\` равен \`null\`, а в \`result\` лежит ответ. Именно на это соглашение и опирается \`promisify\`.

### Как это работает

Возвращаем новую функцию. Она берёт все аргументы, которые ей передали, и **добавляет в конец свой собственный колбэк**. Внутри этого колбэка правило простое: есть \`err\` → \`reject\`, иначе \`resolve(result)\`.

\`\`\`js
function promisify(fn) {
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
}
\`\`\`

Разберём ключевые моменты:

- \`...args\` — собираем все переданные аргументы (например, имя файла).
- \`fn.call(this, ...args, callback)\` — вызываем исходную функцию с этими аргументами плюс наш колбэк в конце. \`this\` пробрасываем через \`call\`, чтобы методы объектов (\`obj.method\`) не потеряли свой контекст.
- Если исходный колбэк вернул несколько значений (\`callback(err, a, b)\`), мы отдаём массив; если одно — просто это значение.

Сложность — O(1): это тонкая обёртка, никаких циклов.

## ⚠️ Подводные камни

- Нативный \`util.promisify\` берёт только **первое** значение результата. Для нестандартных случаев есть символ \`util.promisify.custom\`, которым можно задать своё поведение.
- Функция, которая **не** следует соглашению error-first, промисифицируется неправильно.
- Не забывай про \`this\` (\`call\`/\`apply\`) — иначе методы объектов сломаются.
- Если колбэк вдруг вызовется дважды, промис осядет только один раз; второй вызов молча игнорируется (промис нельзя переоседать).

## 🎯 Запомни

- \`promisify\` = переводчик из колбэк-стиля в промис-стиль.
- Правило колбэка: \`err\` → reject, иначе resolve.
- Сохраняй \`this\` через \`call\`/\`apply\`, иначе методы потеряют контекст.`,
      en: `## 🧩 In plain words

Older Node functions worked via **callbacks**: you pass a function that gets called when the work finishes. By convention, that callback's first argument is the error (\`err\`) and the second is the result. \`promisify\` is a translator: it takes such a callback-style function and turns it into one that returns a **promise**, so you can write \`await\` instead of nested callbacks.

### What an "error-first callback" is

Node has a convention: a function's last argument is a callback shaped like \`callback(err, result)\`. If something went wrong, \`err\` is filled and \`result\` is empty. If all is well, \`err\` is \`null\` and \`result\` holds the answer. \`promisify\` relies on exactly this convention.

### How it works

We return a new function. It takes whatever arguments it's given and **appends its own callback at the end**. Inside that callback the rule is simple: if there's \`err\` → \`reject\`, otherwise \`resolve(result)\`.

\`\`\`js
function promisify(fn) {
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
}
\`\`\`

The key points:

- \`...args\` — gather all passed arguments (e.g. the file name).
- \`fn.call(this, ...args, callback)\` — call the original function with those arguments plus our callback at the end. We forward \`this\` via \`call\` so object methods (\`obj.method\`) don't lose their context.
- If the original callback returned multiple values (\`callback(err, a, b)\`), we resolve with an array; if one, just that value.

Complexity is O(1): it's a thin wrapper, no loops.

## ⚠️ Common pitfalls

- Native \`util.promisify\` takes only the **first** result value. For non-standard cases there's a \`util.promisify.custom\` symbol to define your own behavior.
- A function that does **not** follow the error-first convention won't promisify correctly.
- Don't forget \`this\` (\`call\`/\`apply\`) — otherwise object methods break.
- If the callback happens to fire twice, the promise settles only once; the second call is silently ignored (a promise can't re-settle).

## 🎯 Key takeaways

- \`promisify\` = translator from callback-style to promise-style.
- Callback rule: \`err\` → reject, otherwise resolve.
- Preserve \`this\` via \`call\`/\`apply\`, or methods lose their context.`
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
      ru: `## 🧩 Простыми словами

Каррирование (currying) — это когда функцию, которой нужно несколько аргументов, можно «кормить» ими по частям. Представь торговый автомат: обычно кидаешь все монеты сразу, а карри-версия позволяет докидывать по одной, и напиток выпадет ровно тогда, когда набралась нужная сумма. \`curry(fn)(a)(b)(c)\` даёт тот же результат, что и \`fn(a, b, c)\`, но аргументы можно передавать любыми группами.

### Что такое арность и fn.length

**Арность** — это сколько аргументов ждёт функция. В JS её можно узнать через \`fn.length\`: у \`(a, b, c) => ...\` свойство \`length\` равно 3. Наша задача — собирать аргументы до тех пор, пока их не наберётся столько, сколько нужно функции.

### Рекурсивная сборка аргументов

Пишем внутреннюю функцию \`curried\`. Логика: если аргументов уже накопилось **достаточно** (\`>= arity\`) — вызываем настоящую \`fn\`. Если нет — возвращаем новую функцию, которая примет ещё аргументы и добавит их к уже собранным, после чего снова себя проверит.

\`\`\`js
function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}

// использование
const sum = (a, b, c) => a + b + c;
const cs = curry(sum);
cs(1)(2)(3);   // 6
cs(1, 2)(3);   // 6
cs(1)(2, 3);   // 6
\`\`\`

Почему работают любые группировки: мы не считаем «сколько вызовов было», мы считаем **сколько всего аргументов собралось**. Поэтому \`(1)(2)(3)\`, \`(1,2)(3)\` и \`(1)(2,3)\` — для нас одно и то же: три аргумента набраны, вызываем \`fn\`.

Сложность: O(n) вызовов и O(n) памяти на хранение накопленных аргументов, где n — арность.

### Зачем это на практике

- **Частичное применение**: зафиксировать первый аргумент и получить готовый хелпер — \`const add5 = curry(add)(5)\`.
- **Конфигурируемые функции** и point-free стиль, где данные передаются последними.

## ⚠️ Подводные камни

- У функций с **rest-параметрами** (\`(...args) => ...\`) \`length\` равен 0 — rest не считается. Арность определится неверно, поэтому в таких случаях передавай \`arity\` вторым аргументом явно.
- **Дефолтные параметры** тоже занижают \`length\`: у \`(a, b = 1) => ...\` длина равна 1, а не 2.
- Чтобы поддержать placeholder (\`_\`, как в Lodash), нужно хранить позиции пропусков и подставлять новые аргументы именно в них.

## 🎯 Запомни

- Каррирование = передавать аргументы по частям, вызов срабатывает при наборе арности.
- Считаем **общее число собранных аргументов**, а не число вызовов.
- \`fn.length\` врёт при rest- и дефолтных параметрах — задавай \`arity\` вручную.`,
      en: `## 🧩 In plain words

Currying is when a function that needs several arguments can be "fed" them in pieces. Picture a vending machine: normally you drop all your coins at once, but a curried version lets you add them one at a time, and the drink pops out exactly when the total is reached. \`curry(fn)(a)(b)(c)\` gives the same result as \`fn(a, b, c)\`, but you can pass the arguments in any grouping.

### What arity and fn.length are

**Arity** is how many arguments a function expects. In JS you read it via \`fn.length\`: for \`(a, b, c) => ...\` the \`length\` is 3. Our job is to gather arguments until we have as many as the function needs.

### Recursive argument gathering

We write an inner function \`curried\`. The logic: if we've already gathered **enough** arguments (\`>= arity\`), call the real \`fn\`. If not, return a new function that accepts more arguments, appends them to the ones already collected, and re-checks itself.

\`\`\`js
function curry(fn, arity = fn.length) {
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
cs(1)(2, 3);   // 6
\`\`\`

Why any grouping works: we don't count "how many calls happened," we count **how many arguments total have been collected**. So \`(1)(2)(3)\`, \`(1,2)(3)\` and \`(1)(2,3)\` are all the same to us: three args gathered, call \`fn\`.

Complexity: O(n) calls and O(n) memory to store accumulated args, where n is the arity.

### Why it's useful in practice

- **Partial application**: fix the first argument and get a ready-made helper — \`const add5 = curry(add)(5)\`.
- **Configurable functions** and point-free style, where data is passed last.

## ⚠️ Common pitfalls

- Functions with **rest params** (\`(...args) => ...\`) report \`length\` of 0 — rest isn't counted. Arity comes out wrong, so pass \`arity\` explicitly as the second argument in those cases.
- **Default parameters** also lower \`length\`: \`(a, b = 1) => ...\` has length 1, not 2.
- To support a placeholder (\`_\`, like in Lodash), you must track gap positions and slot new arguments into them.

## 🎯 Key takeaways

- Currying = pass arguments in pieces; the call fires once arity is reached.
- Count the **total number of gathered args**, not the number of calls.
- \`fn.length\` lies with rest and default params — set \`arity\` manually.`
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
      ru: `## 🧩 Простыми словами

\`compose\` и \`pipe\` — это способ склеить несколько функций в одну «трубу», по которой прогоняется значение. Представь конвейер: деталь проходит через станки один за другим, и на выходе — готовый продукт. Разница только в направлении чтения: \`pipe\` идёт слева направо (в порядке движения данных), а \`compose\` — справа налево (как в математике \`f(g(x))\`).

### compose и pipe через reduce

Обе функции — это **свёртка** (fold): мы берём начальное значение и по очереди применяем к нему каждую функцию, накапливая результат. \`reduce\` идёт по массиву слева направо, \`reduceRight\` — справа налево.

\`\`\`js
const compose = (...fns) => (x) =>
  fns.reduceRight((acc, fn) => fn(acc), x);

const pipe = (...fns) => (x) =>
  fns.reduce((acc, fn) => fn(acc), x);
\`\`\`

- \`pipe(add1, double)(3)\` → сначала \`add1(3) = 4\`, потом \`double(4) = 8\`. Читается слева направо, как список шагов.
- \`compose(add1, double)(3)\` → сначала \`double(3) = 6\`, потом \`add1(6) = 7\`. Правая функция срабатывает первой — как во вложенном вызове \`add1(double(3))\`.

Здесь \`acc\` (accumulator) — это «деталь на конвейере», текущее значение, которое передаётся дальше по цепочке.

### Асинхронный pipe для промисов

Если функции возвращают промисы (например, обращаются к сети), обычный \`pipe\` не подойдёт: следующей функции нужно дождаться результата предыдущей. Решение — оборачивать каждый шаг в \`Promise.resolve(...).then(fn)\`, чтобы цепочка ждала разрешения промиса перед следующим шагом.

\`\`\`js
const pipeAsync = (...fns) => (x) =>
  fns.reduce(
    (acc, fn) => Promise.resolve(acc).then(fn),
    Promise.resolve(x)
  );

// использование
const add1 = (n) => n + 1;
const double = (n) => n * 2;
pipe(add1, double)(3);    // (3+1)*2 = 8
compose(add1, double)(3); // (3*2)+1 = 7
\`\`\`

\`Promise.resolve(acc)\` гарантирует, что \`acc\` — всегда промис (даже если функция вернула обычное значение), а \`.then(fn)\` подставляет разрешённый результат в следующую функцию.

Сложность — O(n) по числу функций на каждый вызов.

## ⚠️ Подводные камни

- Только **первая** функция (по направлению потока) может принимать несколько аргументов; все следующие получают ровно одно значение — результат предыдущей.
- Пустой список функций должен работать как **функция идентичности** (вернуть аргумент как есть).
- Не смешивай синхронный \`pipe\` с функциями, возвращающими промисы — получишь \`[object Promise]\` вместо значения. Для промисов бери \`pipeAsync\`.

## 🎯 Запомни

- \`pipe\` — слева направо, \`compose\` — справа налево; оба через \`reduce\`/\`reduceRight\`.
- \`compose(f, g)(x) === f(g(x))\` — правая функция первой.
- Для промисов используй \`pipeAsync\` с \`Promise.resolve(...).then(fn)\`.`,
      en: `## 🧩 In plain words

\`compose\` and \`pipe\` glue several functions into one "pipeline" that a value flows through. Picture an assembly line: a part passes through machines one after another, and out comes the finished product. The only difference is reading direction: \`pipe\` goes left-to-right (in data-flow order), while \`compose\` goes right-to-left (like math notation \`f(g(x))\`).

### compose and pipe via reduce

Both functions are a **fold**: we take a starting value and apply each function to it in turn, accumulating the result. \`reduce\` walks the array left-to-right, \`reduceRight\` right-to-left.

\`\`\`js
const compose = (...fns) => (x) =>
  fns.reduceRight((acc, fn) => fn(acc), x);

const pipe = (...fns) => (x) =>
  fns.reduce((acc, fn) => fn(acc), x);
\`\`\`

- \`pipe(add1, double)(3)\` → first \`add1(3) = 4\`, then \`double(4) = 8\`. Reads left-to-right, like a list of steps.
- \`compose(add1, double)(3)\` → first \`double(3) = 6\`, then \`add1(6) = 7\`. The rightmost function runs first — like the nested call \`add1(double(3))\`.

Here \`acc\` (accumulator) is the "part on the conveyor," the current value passed down the chain.

### Async pipe for promises

If functions return promises (e.g. they hit the network), a plain \`pipe\` won't do: the next function must wait for the previous one's result. The fix is to wrap each step in \`Promise.resolve(...).then(fn)\` so the chain waits for the promise to resolve before the next step.

\`\`\`js
const pipeAsync = (...fns) => (x) =>
  fns.reduce(
    (acc, fn) => Promise.resolve(acc).then(fn),
    Promise.resolve(x)
  );

// usage
const add1 = (n) => n + 1;
const double = (n) => n * 2;
pipe(add1, double)(3);    // (3+1)*2 = 8
compose(add1, double)(3); // (3*2)+1 = 7
\`\`\`

\`Promise.resolve(acc)\` guarantees \`acc\` is always a promise (even if a function returned a plain value), and \`.then(fn)\` feeds the resolved result into the next function.

Complexity is O(n) in the number of functions per call.

## ⚠️ Common pitfalls

- Only the **first** function (in flow direction) may take multiple arguments; every following one gets exactly a single value — the previous result.
- An empty function list should behave as the **identity function** (return the argument unchanged).
- Don't mix synchronous \`pipe\` with promise-returning functions — you'll get \`[object Promise]\` instead of a value. Use \`pipeAsync\` for promises.

## 🎯 Key takeaways

- \`pipe\` — left-to-right, \`compose\` — right-to-left; both via \`reduce\`/\`reduceRight\`.
- \`compose(f, g)(x) === f(g(x))\` — the rightmost function runs first.
- For promises use \`pipeAsync\` with \`Promise.resolve(...).then(fn)\`.`
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
      ru: `## 🧩 Простыми словами

Представь калькулятор, который считает что-то долго. Если ты дважды спрашиваешь «сколько будет то же самое?», глупо считать заново — можно запомнить ответ в блокнотик и во второй раз просто заглянуть в него. \`memoize\` — это как раз такой блокнотик вокруг функции: один раз посчитали, дальше отдаём готовое.

### Что такое мемоизация

**Мемоизация** — это кэширование (запоминание) результатов функции по её аргументам. Ключевое правило: одинаковые аргументы → одинаковый результат, поэтому пересчитывать бессмысленно. Работает только для **чистых функций** — тех, что зависят лишь от входных данных и не имеют побочных эффектов (не читают время, случайные числа, внешнее состояние).

### Как устроено

Мы прячем \`Map\` (структуру ключ-значение) внутри **замыкания** — то есть внутренняя функция помнит переменную \`cache\`, даже когда внешняя \`memoize\` уже завершилась. Алгоритм на каждый вызов:

1. Построить ключ из аргументов.
2. Если ключ уже есть в кэше — вернуть сохранённое значение.
3. Иначе — посчитать, положить в кэш, вернуть.

\`\`\`js
function memoize(fn, resolver) {
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

// использование
const slowSquare = (n) => { /* тяжёлое вычисление */ return n * n; };
const fast = memoize(slowSquare);
fast(9); // считает
fast(9); // берёт из кэша
\`\`\`

### Про ключ и resolver

Ключ должен быть строкой или чем-то, что \`Map\` умеет сравнивать. По умолчанию мы берём \`JSON.stringify(args)\` — превращаем все аргументы в строку. Но иногда это плохой ключ, поэтому можно передать свой **resolver** — функцию, которая сама решает, как из аргументов сделать ключ (например, взять только \`id\` объекта).

### Сложность

Попадание в кэш — O(1) (мгновенно). Но есть цена: память растёт **без ограничения**, ведь мы храним каждый новый результат и никогда не выкидываем старые.

## ⚠️ Подводные камни

- \`JSON.stringify\` не сериализует функции, \`undefined\` и \`Symbol\`, а на циклических объектах падает — отсюда неверные или совпадающие ключи (коллизии).
- Порядок свойств в объекте влияет на строку: \`{a:1,b:2}\` и \`{b:2,a:1}\` дадут разные ключи, хотя объекты одинаковы по смыслу.
- Для объектов-аргументов лучше \`WeakMap\` (не держит объект в памяти, избегает утечек), но только когда аргумент один.
- Если функция не чистая — кэш начнёт врать, отдавая устаревшие ответы.

## 🎯 Запомни

- Мемоизация меняет процессорное время на память: считаем один раз, дальше читаем.
- Работает только для чистых функций.
- Дефолтный JSON-ключ прост, но медленный и ненадёжный для сложных объектов — тогда нужен свой resolver.
- Кэш растёт бесконечно; в проде ограничивай размер (например, LRU-эвикцией — выкидыванием давно не использованных записей).`,
      en: `## 🧩 In plain words

Picture a calculator that takes a long time to compute something. If you ask it the exact same question twice, recomputing is wasteful — better to jot the answer in a notepad and just look it up next time. \`memoize\` is that notepad wrapped around a function: compute once, then hand back the saved answer.

### What memoization is

**Memoization** means caching (remembering) a function's results by its arguments. The key rule: same arguments → same result, so recomputing is pointless. It only works for **pure functions** — ones that depend only on their inputs and have no side effects (no reading the clock, random numbers, or outside state).

### How it works

We hide a \`Map\` (a key-value store) inside a **closure** — meaning the inner function still remembers the \`cache\` variable even after the outer \`memoize\` has finished running. On every call the algorithm is:

1. Build a key from the arguments.
2. If the key is already in the cache — return the stored value.
3. Otherwise — compute, store it, return.

\`\`\`js
function memoize(fn, resolver) {
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
const slowSquare = (n) => { /* heavy computation */ return n * n; };
const fast = memoize(slowSquare);
fast(9); // computes
fast(9); // cached
\`\`\`

### About the key and resolver

The key must be a string, or something a \`Map\` can compare. By default we use \`JSON.stringify(args)\` — turning all arguments into one string. But that's sometimes a poor key, so you can pass your own **resolver** — a function that decides how to turn arguments into a key (for example, use only an object's \`id\`).

### Complexity

A cache hit is O(1) (instant). But there's a cost: memory grows **unbounded**, since we store every new result and never throw old ones away.

## ⚠️ Common pitfalls

- \`JSON.stringify\` doesn't serialize functions, \`undefined\`, or \`Symbol\`, and it throws on cyclic objects — leading to wrong or colliding keys.
- Property order affects the string: \`{a:1,b:2}\` and \`{b:2,a:1}\` produce different keys even though the objects mean the same thing.
- For object arguments a \`WeakMap\` is better (doesn't pin the object in memory, avoids leaks), but only when there's a single argument.
- If the function isn't pure, the cache will lie, returning stale answers.

## 🎯 Key takeaways

- Memoization trades CPU time for memory: compute once, then read.
- Works only for pure functions.
- The default JSON key is simple but slow and unreliable for complex objects — pass a custom resolver then.
- The cache grows forever; in production bound its size (e.g. LRU eviction — dropping least-recently-used entries).`
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
      ru: `## 🧩 Простыми словами

Представь автоматическую дверь, которая должна открыться ровно один раз — на первый толчок. Сколько бы людей потом ни толкали, ничего не происходит, дверь уже открыта. \`once\` делает из любой функции такую «одноразовую»: первый вызов срабатывает, все следующие просто возвращают тот же результат.

### Как устроено

Внутри **замыкания** (внутренняя функция помнит переменные внешней даже после её завершения) храним два значения: флаг \`called\` — «уже вызывали?» — и \`result\` — сохранённый результат первого вызова.

Логика проста: если ещё не вызывали, ставим флаг, выполняем \`fn\`, запоминаем результат. Дальше всегда возвращаем этот запомненный результат и \`fn\` **больше не трогаем**. Аргументы и \`this\` (контекст вызова) пробрасываем от первого вызова.

\`\`\`js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
      fn = null; // отпускаем ссылку
    }
    return result;
  };
}
\`\`\`

### Зачем \`fn = null\`

После первого вызова \`fn\` больше не нужна. Обнуляя ссылку, мы позволяем **сборщику мусора** (механизму, освобождающему неиспользуемую память) убрать функцию и всё, что она держала в замыкании. Мелочь, но приятно для памяти.

### Где применяется

- Ленивая инициализация — тяжёлую настройку выполняем один раз при первом обращении.
- Singleton — гарантируем единственный экземпляр объекта.
- Обработчики событий, которые должны сработать лишь однажды (например, «отправить форму» без риска двойной отправки).

## ⚠️ Подводные камни

- Если \`fn\` бросит исключение на первом вызове — считать ли вызов «состоявшимся»? В примере выше флаг уже стал \`true\`, значит повтор невозможен. Часто хотят наоборот: оставить \`called=false\`, чтобы можно было повторить попытку. Решай по требованиям.
- Не путай с \`memoize\`: \`once\` игнорирует аргументы и всегда отдаёт результат самого первого вызова; \`memoize\` кэширует разные результаты по разным ключам-аргументам.

## 🎯 Запомни

- \`once\` = «выполнить ровно один раз, дальше отдавать закэшированное».
- Секрет — флаг + сохранённый результат в замыкании.
- Отличие от memoize: once не смотрит на аргументы.
- Обнуление \`fn\` после вызова — маленькая, но полезная оптимизация памяти.`,
      en: `## 🧩 In plain words

Picture an automatic door meant to open exactly once — on the first push. However many people shove it afterwards, nothing happens; it's already open. \`once\` turns any function into that kind of one-shot: the first call runs, every later call just returns the same result.

### How it works

Inside a **closure** (the inner function remembers the outer function's variables even after it has finished) we keep two things: a \`called\` flag — "have we run yet?" — and \`result\` — the saved result of the first call.

The logic is simple: if we haven't run yet, flip the flag, execute \`fn\`, remember the result. From then on always return that saved result and never touch \`fn\` again. We forward the arguments and \`this\` (the call context) from the first call.

\`\`\`js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
      fn = null; // release the reference
    }
    return result;
  };
}
\`\`\`

### Why \`fn = null\`

After the first call \`fn\` is no longer needed. By nulling the reference we let the **garbage collector** (the mechanism that frees unused memory) reclaim the function and everything it held in the closure. A small thing, but kind to memory.

### Where it's used

- Lazy initialization — run expensive setup once, on first access.
- Singleton — guarantee a single instance of an object.
- Event handlers that should fire only once (e.g. "submit form" with no risk of a double submit).

## ⚠️ Common pitfalls

- If \`fn\` throws on the first call, should the call count as "done"? In the example above the flag is already \`true\`, so no retry is possible. Often you want the opposite: keep \`called=false\` so it can retry. Decide by your requirements.
- Don't confuse it with \`memoize\`: \`once\` ignores arguments and always returns the very first call's result; \`memoize\` caches different results under different argument keys.

## 🎯 Key takeaways

- \`once\` = "run exactly once, then hand back the cached result."
- The trick is a flag plus a stored result in a closure.
- Difference from memoize: once doesn't look at arguments.
- Nulling \`fn\` after the call is a small but useful memory optimization.`
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
      ru: `## 🧩 Простыми словами

Копировать объект «поверхностно» — как дать другу тот же общий блокнот: он пишет на своей странице, а меняется твой блокнот. **Глубокое копирование** делает отдельную копию всего дерева, вплоть до самых вложенных страниц, чтобы правки в копии не задевали оригинал. \`deepClone\` как раз строит такую полностью независимую копию.

### Зачем нужна рекурсия

Объект может содержать объекты, те — ещё объекты, и так вглубь. Поэтому мы копируем **рекурсивно**: функция вызывает саму себя для каждого вложенного значения, пока не дойдёт до примитивов (число, строка, \`boolean\`, \`null\`, \`undefined\`, \`Symbol\`), которые копировать не нужно — они и так неизменяемы, возвращаем как есть.

### Проблема циклов и WeakMap

Что если объект ссылается сам на себя? Например \`a.self = a\`. Наивная рекурсия зайдёт в бесконечный круг и переполнит стек. Решение — **WeakMap** (хранилище «оригинал → его копия»). Перед тем как копировать объект, мы кладём в WeakMap связку «этот оригинал → эта копия». Встретив тот же объект снова, просто берём готовую копию. Это и разрывает циклы, и сохраняет **общие ссылки** (если два поля указывали на один объект, в копии они тоже укажут на один).

Почему именно \`WeakMap\`, а не обычный \`Map\`? У WeakMap **слабые ссылки** на ключи: они не мешают сборщику мусора освободить объекты, когда те больше не нужны. Меньше риск утечек памяти.

### Специальные типы

Обычный перебор свойств не воссоздаст \`Date\`, \`RegExp\`, \`Map\`, \`Set\` правильно — для них нужны отдельные ветки, которые строят новый экземпляр того же типа:

\`\`\`js
function deepClone(value, seen = new WeakMap()) {
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
}
\`\`\`

Обрати внимание: для \`Map\`, \`Set\`, массивов и объектов мы кладём заготовку \`result\` в \`seen\` **до** копирования содержимого — иначе цикл внутри не найдёт себя. \`Reflect.ownKeys\` берёт все собственные ключи, включая \`Symbol\`-ключи.

### Сложность

O(n) по числу узлов дерева — и по времени, и по памяти: каждый узел посещается и копируется один раз.

## ⚠️ Подводные камни

- \`JSON.parse(JSON.stringify(x))\` — соблазнительный однострочник, но ломается: теряет функции, \`undefined\`, \`Symbol\`, превращает \`Date\` в строку и падает на циклах.
- Без WeakMap циклическая ссылка (\`a.self = a\`) вызовет бесконечную рекурсию и переполнение стека.
- Простая версия теряет прототип, геттеры/сеттеры и неперечислимые свойства — копируются только значения.

### Когда брать structuredClone

С 2022 года в браузерах и Node есть встроенный \`structuredClone(x)\`: он умеет циклы и многие типы. Но не копирует функции и DOM-узлы — для них по-прежнему нужна своя реализация.

## 🎯 Запомни

- Глубокая копия = полностью независимое дерево; рекурсия спускается до примитивов.
- WeakMap «оригинал → копия» решает циклы и сохраняет общие ссылки, не мешая сборке мусора.
- \`Date\`, \`RegExp\`, \`Map\`, \`Set\` требуют отдельных веток.
- \`JSON\`-трюк ненадёжен; нативный \`structuredClone\` часто лучший выбор, кроме функций и DOM.`,
      en: `## 🧩 In plain words

A "shallow" copy of an object is like handing a friend the same shared notebook: he writes on his page and your notebook changes too. A **deep copy** makes a separate copy of the whole tree, all the way down to the deepest nested pages, so edits to the copy never touch the original. \`deepClone\` builds exactly that fully independent copy.

### Why recursion

An object can hold objects, which hold more objects, and so on down. So we copy **recursively**: the function calls itself for each nested value until it reaches primitives (number, string, \`boolean\`, \`null\`, \`undefined\`, \`Symbol\`), which don't need copying — they're immutable, so we return them as-is.

### The cycle problem and WeakMap

What if an object refers to itself? For example \`a.self = a\`. Naive recursion loops forever and overflows the stack. The fix is a **WeakMap** (a store of "original → its copy"). Before copying an object, we record "this original → this copy" in the WeakMap. If we meet the same object again, we just grab the ready copy. This both breaks cycles and preserves **shared references** (if two fields pointed at one object, the copy's two fields point at one too).

Why a \`WeakMap\` rather than a plain \`Map\`? A WeakMap holds **weak references** to its keys: they don't stop the garbage collector from freeing objects once they're no longer needed. Less risk of memory leaks.

### Special types

A plain property loop won't rebuild \`Date\`, \`RegExp\`, \`Map\`, or \`Set\` correctly — each needs its own branch that constructs a fresh instance of the same type:

\`\`\`js
function deepClone(value, seen = new WeakMap()) {
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
}
\`\`\`

Note: for \`Map\`, \`Set\`, arrays, and objects we put the empty \`result\` into \`seen\` **before** copying the contents — otherwise a cycle inside couldn't find itself. \`Reflect.ownKeys\` grabs all own keys, including \`Symbol\` keys.

### Complexity

O(n) in the number of tree nodes — in both time and memory: each node is visited and copied once.

## ⚠️ Common pitfalls

- \`JSON.parse(JSON.stringify(x))\` is a tempting one-liner but it's broken: it drops functions, \`undefined\`, \`Symbol\`, turns \`Date\` into a string, and throws on cycles.
- Without the WeakMap a circular reference (\`a.self = a\`) causes infinite recursion and a stack overflow.
- The simple version loses the prototype, getters/setters, and non-enumerable properties — only values are copied.

### When to use structuredClone

Since 2022 browsers and Node ship a built-in \`structuredClone(x)\`: it handles cycles and many types. But it won't copy functions or DOM nodes — for those you still need your own implementation.

## 🎯 Key takeaways

- A deep copy = a fully independent tree; recursion descends to primitives.
- A WeakMap of "original → copy" solves cycles and preserves shared references without blocking GC.
- \`Date\`, \`RegExp\`, \`Map\`, \`Set\` each need their own branch.
- The \`JSON\` trick is unreliable; native \`structuredClone\` is often the best choice, except for functions and DOM.`
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
      ru: `## 🧩 Простыми словами

Оператор \`===\` для объектов сравнивает не содержимое, а «это буквально та же коробка?». Два разных объекта с одинаковыми полями он считает разными. \`deepEqual\` заглядывает **внутрь**: спускается по всем вложенным уровням и проверяет, что структура и значения совпадают — как сверять две копии документа строка за строкой.

### С чего начинаем: Object.is

Сначала быстрая проверка \`Object.is(a, b)\`. Это как \`===\`, но с двумя правильными отличиями: он считает \`NaN\` равным \`NaN\` (обычное \`NaN === NaN\` даёт \`false\`, хотя нам это неудобно), и различает \`+0\` и \`-0\`. Если \`Object.is\` вернул \`true\` — значения точно равны, дальше копать не надо.

### Рекурсивный спуск

Если это не одно и то же примитивное значение, проверяем: оба ли операнда — объекты (и не \`null\`). Если хотя бы один не объект — они не равны. Если оба объекты, сравниваем **число собственных ключей**: разное количество → сразу не равны (ранний выход, экономит работу). Иначе рекурсивно (функция вызывает себя) сравниваем значение каждого ключа.

\`\`\`js
function deepEqual(a, b) {
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
}
\`\`\`

\`Reflect.ownKeys\` берёт все собственные ключи (включая \`Symbol\`). Проверка \`hasOwnProperty\` гарантирует, что ключ из \`a\` реально есть у \`b\`, а не унаследован от прототипа. \`every\` вернёт \`true\`, только если все ключи совпали.

### Специальные типы

\`Date\` — объект, но его собственных перечислимых ключей нет, поэтому наивное сравнение решило бы, что любые две даты равны. Отдельная ветка сравнивает их по \`getTime()\` (числу миллисекунд). Аналогично \`RegExp\` сравнивают по \`source\` и \`flags\`.

### Сложность

O(n) по числу узлов — каждый узел структуры посещается один раз.

## ⚠️ Подводные камни

- \`NaN === NaN\` даёт \`false\` — именно поэтому старт через \`Object.is\`.
- Циклические структуры (\`a.self = a\`) зациклят эту наивную версию. Чтобы защититься, отслеживай уже сравненные **пары** объектов — той же техникой WeakMap, что в deepClone.
- Разное число ключей — быстрый способ отсеять неравные объекты, не заходя вглубь.
- Не путай с поверхностным сравнением React (\`shallowEqual\`): оно сравнивает только первый уровень по ссылке, работает за O(числа ключей) и используется в \`memo\`/\`PureComponent\` ради скорости — но не заметит различий в глубине.

## 🎯 Запомни

- Начинай с \`Object.is\`: он ловит \`NaN\` и различает \`±0\`.
- Дальше рекурсивно сверяй число ключей и значение каждого ключа.
- \`Date\`/\`RegExp\` и другие спец-типы нуждаются в отдельной логике.
- Циклы ломают наивную версию — защищайся WeakMap-отслеживанием пар.`,
      en: `## 🧩 In plain words

For objects, \`===\` doesn't compare contents — it asks "is this literally the same box?" Two different objects with identical fields count as unequal. \`deepEqual\` looks **inside**: it walks every nested level and checks that the structure and values match — like comparing two copies of a document line by line.

### Where we start: Object.is

First a fast \`Object.is(a, b)\` check. It's like \`===\` but with two helpful differences: it treats \`NaN\` as equal to \`NaN\` (plain \`NaN === NaN\` is \`false\`, which is inconvenient here), and it distinguishes \`+0\` from \`-0\`. If \`Object.is\` returns \`true\`, the values are definitely equal and there's no need to dig deeper.

### Recursive descent

If it's not the same primitive value, we check whether both operands are objects (and not \`null\`). If either isn't an object, they're unequal. If both are objects, we compare the **number of own keys**: a different count → immediately unequal (an early exit that saves work). Otherwise we recursively (the function calls itself) compare the value at each key.

\`\`\`js
function deepEqual(a, b) {
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
}
\`\`\`

\`Reflect.ownKeys\` grabs all own keys (including \`Symbol\`s). The \`hasOwnProperty\` check guarantees the key from \`a\` genuinely exists on \`b\` rather than being inherited from a prototype. \`every\` returns \`true\` only if all keys matched.

### Special types

A \`Date\` is an object, but it has no own enumerable keys, so a naive comparison would declare any two dates equal. A dedicated branch compares them by \`getTime()\` (their millisecond count). Similarly, \`RegExp\`s are compared by \`source\` and \`flags\`.

### Complexity

O(n) in the number of nodes — each node in the structure is visited once.

## ⚠️ Common pitfalls

- \`NaN === NaN\` is \`false\` — precisely why we start with \`Object.is\`.
- Cyclic structures (\`a.self = a\`) will loop this naive version forever. To guard against it, track already-compared **pairs** of objects — the same WeakMap technique as in deepClone.
- Different key counts are a quick way to reject unequal objects without descending.
- Don't confuse it with React's shallow comparison (\`shallowEqual\`): that compares only the first level by reference, runs in O(number of keys), and is used in \`memo\`/\`PureComponent\` for speed — but it won't notice differences deeper down.

## 🎯 Key takeaways

- Start with \`Object.is\`: it catches \`NaN\` and distinguishes \`±0\`.
- Then recursively compare key counts and each key's value.
- \`Date\`/\`RegExp\` and other special types need dedicated logic.
- Cycles break the naive version — guard with WeakMap pair-tracking.`
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть две коробки с настройками — базовая и «поверх неё». \`deepMerge\` аккуратно накладывает вторую на первую: если внутри обеих лежит вложенная коробочка с одинаковым названием, он лезет внутрь и сливает уже их содержимое, а не просто выбрасывает старую. При этом исходные коробки он не трогает — собирает и возвращает новую.

«Deep» (глубокий) значит, что слияние идёт рекурсивно, до самого дна вложенности, а не только на верхнем уровне.

### Что такое «чистый объект» и почему это важно

_Рекурсия_ — это когда функция вызывает сама себя для более мелкой части задачи. Здесь мы рекурсивно заходим внутрь вложенных объектов.

Ключевой вопрос: когда лезть внутрь, а когда просто перезаписать? Ответ — только для «чистых» объектов (plain object), то есть обычных \`{ ... }\`. Массивы, \`null\`, даты, классы — не чистые объекты, их мы перезаписываем целиком.

\`\`\`js
const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
\`\`\`

Проверка читается так: значение не \`null\`, оно объект по \`typeof\`, оно не массив, и его прототип — либо стандартный \`Object.prototype\`, либо \`null\` (у объектов, созданных через \`Object.create(null)\`). Это отсекает даты, \`Map\`, экземпляры классов.

### Как работает само слияние

\`\`\`js
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
}
\`\`\`

По шагам:

1. \`const output = { ...target }\` — делаем поверхностную копию, чтобы не мутировать (не менять) вход. Возвращаем всегда новый объект.
2. Перебираем каждый \`source\` (их может быть несколько) и для каждого проходим его ключи.
3. Для каждого ключа три случая. Если и в target, и в source лежат чистые объекты — сливаем их рекурсивно. Если чистый объект только в source — тоже сливаем, но с пустым \`{}\`, чтобы получить глубокую копию, а не ссылку на чужой объект. Иначе (примитив, массив, \`null\`) — просто перезаписываем значением source.

Тот случай \`deepMerge({}, sVal)\` важен: без него мы бы записали ссылку на объект из source, и позже его изменение «протекло» бы в наш результат.

### Сложность

O(n), где n — суммарное число ключей во всех объектах: каждый ключ обрабатывается один раз.

## ⚠️ Подводные камни

- \`null\` по \`typeof\` — это \`'object'\`, но не чистый объект. Он должен перезаписывать, а не сливаться. Именно поэтому в \`isPlainObject\` первым делом стоит \`v !== null\`.
- Массивы по умолчанию перезаписываются целиком. Но бывает нужна другая стратегия (конкатенация или слияние по индексу) — уточни у интервьюера.
- Prototype pollution — атака, когда через ключ \`__proto__\` или \`constructor\` злоумышленник дописывает свойства в прототип всех объектов. Поэтому такие ключи мы пропускаем.

## 🎯 Запомни

- Глубоко сливаем только «чистые» объекты; массивы, \`null\` и прочее — перезаписываем.
- Никогда не мутируй target — копируй уровни и возвращай новый объект.
- Оборачивай одиночный source-объект в \`deepMerge({}, sVal)\`, чтобы не тащить чужие ссылки.
- Фильтруй \`__proto__\` и \`constructor\` — это защита от prototype pollution.`,
      en: `## 🧩 In plain words

Imagine you have two boxes of settings — a base one and an "on top of it" one. \`deepMerge\` carefully layers the second onto the first: if both contain a nested little box with the same name, it goes inside and merges *their* contents too, instead of just throwing the old one away. And it never touches the original boxes — it builds and returns a brand new one.

"Deep" means the merge goes recursively, all the way down the nesting, not just at the top level.

### What a "plain object" is and why it matters

_Recursion_ is when a function calls itself on a smaller piece of the problem. Here we recurse into nested objects.

The key question: when do we go inside, and when do we just overwrite? Answer — only for "plain" objects, i.e. ordinary \`{ ... }\`. Arrays, \`null\`, dates, class instances are not plain objects, so we overwrite them wholesale.

\`\`\`js
const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
\`\`\`

Read the check as: the value isn't \`null\`, it's an object by \`typeof\`, it's not an array, and its prototype is either the standard \`Object.prototype\` or \`null\` (for objects made via \`Object.create(null)\`). This filters out dates, \`Map\`, class instances.

### How the merge itself works

\`\`\`js
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
}
\`\`\`

Step by step:

1. \`const output = { ...target }\` — make a shallow copy so we don't mutate (change) the input. We always return a new object.
2. Loop over each \`source\` (there can be several) and, for each, walk its keys.
3. For each key there are three cases. If both target and source hold plain objects — merge them recursively. If only the source has a plain object — merge too, but into an empty \`{}\`, so we get a deep copy rather than a reference to someone else's object. Otherwise (primitive, array, \`null\`) — just overwrite with the source value.

That \`deepMerge({}, sVal)\` case matters: without it we'd store a reference to the source's object, and later mutating it would "leak" into our result.

### Complexity

O(n), where n is the total number of keys across all objects: each key is processed once.

## ⚠️ Common pitfalls

- \`null\` is \`'object'\` by \`typeof\`, but not a plain object. It must overwrite, not merge. That's exactly why \`isPlainObject\` starts with \`v !== null\`.
- Arrays overwrite wholesale by default. Sometimes another strategy is wanted (concat or index-merge) — clarify with the interviewer.
- Prototype pollution is an attack where, via a \`__proto__\` or \`constructor\` key, an attacker writes properties onto every object's prototype. That's why we skip those keys.

## 🎯 Key takeaways

- Deep-merge only "plain" objects; arrays, \`null\`, and the rest get overwritten.
- Never mutate target — copy levels and return a new object.
- Wrap a lone source object in \`deepMerge({}, sVal)\` so you don't drag in foreign references.
- Filter \`__proto__\` and \`constructor\` — that's your prototype-pollution guard.`
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
      ru: `## 🧩 Простыми словами

\`get\` — это безопасный способ достать значение из глубоко вложенного объекта по «адресу». Вместо того чтобы писать \`obj.a.b[0].c\` и рисковать ошибкой, если по дороге встретится \`undefined\`, ты пишешь \`get(obj, 'a.b[0].c', defaultValue)\`. Если весь путь существует — вернётся значение, если где-то оборвался — вернётся запасное значение по умолчанию, и никакой ошибки.

Это классическая функция из библиотеки lodash; интервьюеры любят просить её написать, потому что она проверяет работу со строками, массивами и защитным программированием.

### Шаг 1: превращаем путь в список ключей

Путь может прийти строкой \`"a.b[0].c"\` или уже готовым массивом \`["a","b",0,"c"]\`. Приводим оба варианта к массиву ключей.

\`\`\`js
const keys = Array.isArray(path)
  ? path
  : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
\`\`\`

Регулярное выражение \`/\\[(\\w+)\\]/g\` находит куски вида \`[0]\` и заменяет их на \`.0\` — то есть превращает синтаксис массива в обычную точечную запись. После этого \`split('.')\` режет строку по точкам, а \`filter(Boolean)\` выкидывает пустые куски (например, если строка начиналась с точки). Из \`"a.b[0].c"\` получаем \`["a","b","0","c"]\`.

### Шаг 2: идём по ключам с проверкой

\`\`\`js
function get(obj, path, defaultValue) {
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

// get({ a: { b: [{ c: 42 }] } }, 'a.b[0].c'); // 42
\`\`\`

Идея простая: начинаем с самого объекта и на каждом шаге спускаемся на уровень глубже. Ключевая строка — \`if (result == null) return defaultValue\`. Здесь \`== null\` (с двумя равно) ловит сразу и \`null\`, и \`undefined\`. Если текущий контейнер пустой, продолжать нельзя — иначе \`result[key]\` выбросит \`TypeError\`. Поэтому мы сразу возвращаем default.

В конце ещё одна проверка: если дошли до конца, но значение оказалось \`undefined\`, тоже возвращаем default.

### Сложность

O(d), где d — глубина пути (количество ключей). Просто идём по цепочке один раз.

## ⚠️ Подводные камни

- Промежуточный \`null\` или \`undefined\` должен давать default, а не падать с ошибкой. Проверка \`result == null\` на каждом шаге — обязательна.
- Различить «ключа нет» и «ключ есть, но значение \`undefined\`» практически невозможно простыми средствами. Lodash в обоих случаях возвращает default — обычно это и не важно.
- Числовые индексы массива в строке (\`[0]\`) в квадратных скобках нужно корректно распарсить — этим занимается регулярка.

## 🎯 Запомни

- Нормализуй путь в массив ключей, затем иди по нему в цикле.
- На каждом шаге проверяй \`result == null\` — это защита от \`TypeError\`.
- В современном JS похожую задачу решает опциональная цепочка \`a?.b?.[0]?.c\`, но она не умеет в динамический строковый путь — поэтому \`get\` всё ещё нужен.`,
      en: `## 🧩 In plain words

\`get\` is a safe way to pull a value out of a deeply nested object by its "address". Instead of writing \`obj.a.b[0].c\` and risking a crash if something along the way is \`undefined\`, you write \`get(obj, 'a.b[0].c', defaultValue)\`. If the whole path exists — you get the value; if it breaks off somewhere — you get a fallback default, and no error.

It's a classic function from the lodash library; interviewers love asking for it because it tests string handling, arrays, and defensive programming all at once.

### Step 1: turn the path into a list of keys

The path can arrive as a string \`"a.b[0].c"\` or as a ready-made array \`["a","b",0,"c"]\`. We normalize both into a key array.

\`\`\`js
const keys = Array.isArray(path)
  ? path
  : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
\`\`\`

The regular expression \`/\\[(\\w+)\\]/g\` finds chunks like \`[0]\` and replaces them with \`.0\` — turning array syntax into plain dot notation. Then \`split('.')\` cuts the string on dots, and \`filter(Boolean)\` drops empty chunks (e.g. if the string started with a dot). From \`"a.b[0].c"\` we get \`["a","b","0","c"]\`.

### Step 2: walk the keys with a guard

\`\`\`js
function get(obj, path, defaultValue) {
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

// get({ a: { b: [{ c: 42 }] } }, 'a.b[0].c'); // 42
\`\`\`

The idea is simple: start from the object itself and step one level deeper each iteration. The key line is \`if (result == null) return defaultValue\`. Here \`== null\` (loose equality) catches both \`null\` and \`undefined\` at once. If the current container is empty, we can't continue — otherwise \`result[key]\` would throw a \`TypeError\`. So we return the default immediately.

At the end there's one more check: if we reached the end but the value is \`undefined\`, we also return the default.

### Complexity

O(d), where d is the path depth (number of keys). We just walk the chain once.

## ⚠️ Common pitfalls

- An intermediate \`null\` or \`undefined\` must yield the default, not crash. The \`result == null\` check on every step is mandatory.
- Distinguishing "key missing" from "key present but value is \`undefined\`" is basically impossible by simple means. Lodash returns the default in both cases — usually that's fine.
- Numeric array indices in the string (\`[0]\`) inside brackets need proper parsing — that's what the regex handles.

## 🎯 Key takeaways

- Normalize the path into a key array, then walk it in a loop.
- On every step check \`result == null\` — that's your \`TypeError\` guard.
- In modern JS, optional chaining \`a?.b?.[0]?.c\` solves the same task, but it can't take a dynamic string path — so \`get\` is still useful.`
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
      ru: `## 🧩 Простыми словами

\`set\` — это зеркальный брат \`get\`: он не читает, а записывает значение вглубь объекта по «адресу» вроде \`"a.b[0].c"\`. Причём если по дороге каких-то вложенных контейнеров ещё нет — он создаёт их сам. А в _immutable_-варианте (без мутации) он делает это, не портя исходный объект: возвращает новую версию, а всё, что не меняли, переиспользует.

Именно так под капотом работают Redux и Immer, когда ты «меняешь» состояние, не меняя старое.

### Шаг 1: нормализуем путь

Как и в \`get\`, приводим путь к массиву ключей. Логика та же: регуляркой превращаем \`[0]\` в \`.0\`, режем по точкам, выкидываем пустое.

\`\`\`js
function toKeys(path) {
  return Array.isArray(path)
    ? path
    : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
}
\`\`\`

### Шаг 2: immutable-запись с копированием пути

_Мутация_ — это изменение объекта на месте. _Immutable_ (неизменяемый) подход означает: старый объект остаётся как был, а мы возвращаем новый. Хитрость в том, чтобы копировать не весь объект целиком, а только узлы вдоль пути — это называется **path copying** (копирование пути).

\`\`\`js
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
}
\`\`\`

Разберём по частям:

1. \`const root = Array.isArray(obj) ? [...obj] : { ...obj }\` — копируем корень. Дальше меняем только копию.
2. Цикл идёт до предпоследнего ключа (\`keys.length - 1\`), спускаясь вглубь. На каждом уровне мы создаём свежую копию следующего контейнера: если там уже массив — \`[...next]\`, если объект — \`{ ...next }\`, а если контейнера ещё нет (\`next == null\`) — создаём новый с нуля.
3. Тип нового контейнера зависит от следующего ключа: \`isArr\` проверяет регуляркой \`/^\\d+$/\`, состоит ли следующий ключ только из цифр. Если да — нужен массив \`[]\`, иначе объект \`{}\`. Логично: \`a[0]\` требует массив под ключом \`a\`.
4. \`node = node[key]\` — переходим на только что скопированный уровень и повторяем.
5. В самом конце присваиваем значение по последнему ключу.

Ключевой момент: мы копируем только те узлы, что лежат на пути к цели. Всё остальное дерево остаётся общим со старым объектом — это называется **structural sharing** (структурное разделение). Поэтому даже для огромного состояния операция дёшева.

### Сложность

O(d) по глубине пути — и для обычной мутирующей версии, и для immutable (просто в immutable на каждом уровне делается ещё поверхностная копия).

## ⚠️ Подводные камни

- Тип создаваемого контейнера решается по следующему ключу: цифры ⇒ массив, иначе объект. Забудешь — получишь объект с ключами \`"0"\`, \`"1"\` вместо массива.
- Если на пути лежит примитив (например, число), а надо копать глубже — его придётся перезаписать контейнером (или предупредить). В коде выше ветка \`next != null ? {...next}\` для примитива даст странный результат, так что на практике это уточняют.
- Prototype pollution: ключ \`__proto__\` фильтруем, чтобы нельзя было испортить прототип.

## 🎯 Запомни

- \`set\` создаёт отсутствующие контейнеры по дороге; тип — массив или объект — выбирается по следующему ключу.
- Immutable-версия копирует только узлы вдоль пути (path copying), остальное переиспользует по ссылке (structural sharing).
- Именно так работают Redux/Immer — понимание \`set\` объясняет, почему immutable-обновления дёшевы.
- Фильтруй \`__proto__\` от prototype pollution.`,
      en: `## 🧩 In plain words

\`set\` is the mirror sibling of \`get\`: instead of reading, it writes a value deep into an object by an "address" like \`"a.b[0].c"\`. And if some nested containers along the way don't exist yet — it creates them itself. In the _immutable_ variant (no mutation) it does this without spoiling the original object: it returns a new version, and anything you didn't touch is reused.

This is exactly how Redux and Immer work under the hood when you "change" state without changing the old one.

### Step 1: normalize the path

Just like in \`get\`, we turn the path into a key array. Same logic: a regex turns \`[0]\` into \`.0\`, split on dots, drop empties.

\`\`\`js
function toKeys(path) {
  return Array.isArray(path)
    ? path
    : path.replace(/\\[(\\w+)\\]/g, '.$1').split('.').filter(Boolean);
}
\`\`\`

### Step 2: immutable write with path copying

_Mutation_ is changing an object in place. The _immutable_ approach means: the old object stays as it was, and we return a new one. The trick is to copy not the whole object, but only the nodes along the path — this is called **path copying**.

\`\`\`js
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
}
\`\`\`

Breaking it down:

1. \`const root = Array.isArray(obj) ? [...obj] : { ...obj }\` — copy the root. From here on we only touch the copy.
2. The loop runs to the second-to-last key (\`keys.length - 1\`), descending inward. At each level we make a fresh copy of the next container: if it's already an array — \`[...next]\`, if an object — \`{ ...next }\`, and if the container doesn't exist yet (\`next == null\`) — create a new one from scratch.
3. The new container's type depends on the *next* key: \`isArr\` uses the regex \`/^\\d+$/\` to test whether the next key is all digits. If so — we need an array \`[]\`, else an object \`{}\`. Makes sense: \`a[0]\` requires an array under key \`a\`.
4. \`node = node[key]\` — move onto the level we just copied and repeat.
5. At the very end we assign the value at the last key.

The key point: we copy only the nodes on the path to the target. The rest of the tree stays shared with the old object — this is called **structural sharing**. That's why even for a huge state the operation is cheap.

### Complexity

O(d) over path depth — both for the plain mutating version and for the immutable one (the immutable one just makes an extra shallow copy at each level).

## ⚠️ Common pitfalls

- The created container's type is decided by the next key: digits ⇒ array, else object. Forget it and you get an object with keys \`"0"\`, \`"1"\` instead of an array.
- If a primitive (e.g. a number) sits on the path but you need to dig deeper, you must overwrite it with a container (or warn). In the code above, the \`next != null ? {...next}\` branch on a primitive gives an odd result, so in practice this is clarified.
- Prototype pollution: filter the \`__proto__\` key so the prototype can't be spoiled.

## 🎯 Key takeaways

- \`set\` creates missing containers along the way; the type — array or object — is chosen by the next key.
- The immutable version copies only the nodes along the path (path copying) and reuses the rest by reference (structural sharing).
- This is exactly how Redux/Immer work — understanding \`set\` explains why immutable updates are cheap.
- Filter \`__proto__\` against prototype pollution.`
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
      ru: `## 🧩 Простыми словами

\`EventEmitter\` — это радиостанция для твоего кода. Одни части кода «настраиваются на волну» (подписываются на событие через \`on\`), а другие «выходят в эфир» (запускают событие через \`emit\`). Как только кто-то крикнул в эфир — все, кто подписан на эту волну, слышат сигнал и реагируют. Это сердце паттерна **pub/sub** (publish/subscribe — публикация/подписка): издатель не знает, кто его слушает, и наоборот.

Так общаются между собой части приложения, не завязываясь друг на друга напрямую.

### Хранилище: Map из событий в Set листенеров

_Листенер_ (listener) — это функция-обработчик, которую вызовут, когда сработает событие. Храним всё в структуре \`Map<событие, Set<листенеров>>\`: по имени события — набор функций.

_Map_ — это словарь «ключ → значение». _Set_ — набор уникальных значений (дубликаты автоматически отбрасываются). Set удобен: добавление и удаление за O(1), плюс один и тот же листенер не запишется дважды.

\`\`\`js
class EventEmitter {
  #events = new Map();
\`\`\`

\`#events\` с решёткой — это _приватное поле_: снаружи класса к нему не подобраться, только методы эмиттера им управляют.

### on: подписка с возвратом функции отписки

\`\`\`js
  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.#events.get(event)?.delete(listener);
  }
\`\`\`

\`on\` при первой подписке на событие создаёт для него пустой Set, потом добавляет туда листенер. Важная деталь — он возвращает функцию отписки. Это удобно: вызвал её — и отписался, не надо помнить имя события и ссылку на функцию. В React-компонентах это идеально ложится на очистку эффекта.

\`off\` просто удаляет листенер из Set. Оператор \`?.\` (опциональная цепочка) защищает от случая, когда на такое событие вообще никто не подписан.

### once: сработать ровно один раз

\`\`\`js
  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }
\`\`\`

\`once\` подписывает не сам листенер, а обёртку вокруг него. При первом же вызове обёртка первым делом отписывает саму себя, а потом зовёт настоящий листенер. В итоге он срабатывает один раз и исчезает.

Тонкость: в Set кладётся именно \`wrapper\`, а не исходный \`listener\`. Поэтому если нужен ручной \`off\` до срабатывания, надо уметь найти обёртку по оригиналу (на практике хранят ссылку \`wrapper.original = listener\`).

### emit: рассылаем сигнал всем подписчикам

\`\`\`js
  emit(event, ...args) {
    const listeners = this.#events.get(event);
    if (!listeners) return false;
    [...listeners].forEach((fn) => fn(...args));
    return true;
  }
}
\`\`\`

\`emit\` берёт набор листенеров события и вызывает каждый, передавая аргументы. Ключевой приём — \`[...listeners]\`: мы копируем Set в массив перед перебором. Зачем? Потому что листенер во время вызова может отписаться (или \`once\` отпишет сам себя), а менять коллекцию прямо во время итерации по ней — источник багов (пропуски или повторы). Копия защищает от этого.

### Сложность

\`on\` и \`off\` — O(1) благодаря Set. \`emit\` — O(k), где k — число подписчиков на событие.

## ⚠️ Подводные камни

- Отписка во время \`emit\`. Если перебирать сам Set, а не его копию, можно пропустить листенер или вызвать дважды. Итерация по \`[...listeners]\` решает это.
- \`once\`-обёртка. В коллекции лежит обёртка, а не оригинал, поэтому ручной \`off(event, listener)\` оригиналом не сработает без доп. ссылки на обёртку.
- Ошибка в одном листенере. Без \`try/catch\` исключение внутри одного обработчика прервёт вызов остальных. Оборачивать или нет — зависит от требований.
- Утечки памяти. Забытая подписка держит листенер (и всё, что он замыкает) живым. Возвращаемая из \`on\` функция отписки — главное средство борьбы.

## 🎯 Запомни

- Структура — \`Map<событие, Set<листенеров>>\`: Set даёт O(1) и дедуп.
- \`on\` возвращает функцию отписки — используй её для чистки в компонентах.
- В \`emit\` перебирай копию \`[...listeners]\`, иначе отписка во время рассылки сломает итерацию.
- \`once\` = обёртка, которая снимает саму себя перед вызовом оригинала.`,
      en: `## 🧩 In plain words

An \`EventEmitter\` is a radio station for your code. Some parts of the code "tune into a frequency" (subscribe to an event via \`on\`), and others "go on air" (fire an event via \`emit\`). The moment someone shouts on air — everyone tuned to that frequency hears the signal and reacts. This is the heart of the **pub/sub** pattern (publish/subscribe): the publisher doesn't know who's listening, and vice versa.

This is how parts of an app talk to each other without being wired together directly.

### Storage: a Map from events to a Set of listeners

A _listener_ is a handler function that gets called when an event fires. We store everything as \`Map<event, Set<listeners>>\`: for each event name, a set of functions.

A _Map_ is a "key → value" dictionary. A _Set_ is a collection of unique values (duplicates are dropped automatically). A Set is handy: add and remove in O(1), plus the same listener won't be stored twice.

\`\`\`js
class EventEmitter {
  #events = new Map();
\`\`\`

\`#events\` with the hash is a _private field_: you can't reach it from outside the class — only the emitter's methods manage it.

### on: subscribe and return an unsubscribe function

\`\`\`js
  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    this.#events.get(event)?.delete(listener);
  }
\`\`\`

On the first subscription to an event, \`on\` creates an empty Set for it, then adds the listener. The important detail — it returns an unsubscribe function. That's convenient: call it and you're unsubscribed, no need to remember the event name and the function reference. In React components this maps perfectly onto effect cleanup.

\`off\` simply removes the listener from the Set. The \`?.\` operator (optional chaining) guards the case where nobody is subscribed to that event at all.

### once: fire exactly one time

\`\`\`js
  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }
\`\`\`

\`once\` subscribes not the listener itself, but a wrapper around it. On the very first call the wrapper first unsubscribes itself, then calls the real listener. So it fires once and vanishes.

Subtlety: the Set holds the \`wrapper\`, not the original \`listener\`. So if a manual \`off\` is needed before it fires, you must be able to find the wrapper by the original (in practice you store a reference \`wrapper.original = listener\`).

### emit: broadcast the signal to all subscribers

\`\`\`js
  emit(event, ...args) {
    const listeners = this.#events.get(event);
    if (!listeners) return false;
    [...listeners].forEach((fn) => fn(...args));
    return true;
  }
}
\`\`\`

\`emit\` takes the event's set of listeners and calls each one, passing the arguments. The key trick is \`[...listeners]\`: we copy the Set into an array before iterating. Why? Because a listener may unsubscribe during the call (or \`once\` unsubscribes itself), and mutating a collection while iterating over it is a source of bugs (skips or repeats). The copy protects against that.

### Complexity

\`on\` and \`off\` are O(1) thanks to the Set. \`emit\` is O(k), where k is the number of subscribers to the event.

## ⚠️ Common pitfalls

- Unsubscribing during \`emit\`. If you iterate the Set itself instead of a copy, you can skip a listener or call it twice. Iterating \`[...listeners]\` fixes it.
- The \`once\` wrapper. The collection holds the wrapper, not the original, so a manual \`off(event, listener)\` with the original won't work without an extra reference to the wrapper.
- An error in one listener. Without \`try/catch\`, an exception inside one handler aborts the rest. Whether to wrap depends on requirements.
- Memory leaks. A forgotten subscription keeps the listener (and everything it closes over) alive. The unsubscribe function returned from \`on\` is the main defense.

## 🎯 Key takeaways

- The structure is \`Map<event, Set<listeners>>\`: the Set gives O(1) and dedup.
- \`on\` returns an unsubscribe function — use it for cleanup in components.
- In \`emit\`, iterate a copy \`[...listeners]\`, or unsubscribing mid-broadcast breaks the iteration.
- \`once\` = a wrapper that removes itself before calling the original.`
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
      ru: `## 🧩 Простыми словами

\`call\`, \`apply\` и \`bind\` — это способы вызвать функцию, но самим выбрать, на что будет указывать \`this\` внутри неё. Представь, что функция — это универсальный пульт, а \`this\` — телевизор, которым он управляет. Обычно пульт привязан к «своему» телевизору, но эти методы позволяют направить один и тот же пульт на любой другой телевизор, который выберешь ты. Наша задача — написать такие пульты самостоятельно, чтобы понять, как они устроены внутри.

### Что вообще делает \`this\`

\`this\` — это специальная переменная внутри функции, которая указывает на объект, «от имени» которого функцию вызвали. Если написать \`obj.method()\`, то внутри \`method\` значение \`this\` будет равно \`obj\`. Ключевой трюк всех трёх полифилов основан именно на этом правиле: если сделать функцию временным методом какого-то объекта и вызвать её как \`obj.fn()\`, то \`this\` автоматически станет этим объектом.

### \`myCall\`: подкладываем функцию как временный метод

Идея: кладём функцию как временное свойство на объект \`thisArg\` (тот, которым хотим стать \`this\`), вызываем её как метод — и \`this\` сам собой становится нужным объектом. Потом удаляем свойство, чтобы не оставлять мусор. Имя свойства делаем через \`Symbol\` — это гарантированно уникальный ключ, который не затрёт уже существующее свойство объекта.

\`\`\`js
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg ?? globalThis;
  const key = Symbol('fn');
  const ctx = Object(thisArg);
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};
\`\`\`

Разберём построчно. \`thisArg ?? globalThis\` — если передали \`null\` или \`undefined\`, подставляем глобальный объект (так ведёт себя настоящий \`call\` в нестрогом режиме). \`Object(thisArg)\` оборачивает примитив (число, строку) в объект-обёртку, потому что свойство можно положить только на объект — это называется boxing. \`ctx[key] = this\` — здесь \`this\` это сама функция, у которой вызвали \`myCall\`. Вызываем \`ctx[key](...args)\`, забираем результат, удаляем ключ и возвращаем результат.

### \`myApply\`: то же самое, но аргументы массивом

\`apply\` отличается от \`call\` только одним: аргументы передаются не по отдельности, а одним массивом. Поэтому его можно выразить через \`myCall\`, просто «распаковав» массив оператором \`...\`.

\`\`\`js
Function.prototype.myApply = function (thisArg, args = []) {
  return this.myCall(thisArg, ...args);
};
\`\`\`

### \`myBind\`: не вызываем, а создаём новую привязанную функцию

\`bind\` не вызывает функцию сразу. Он возвращает новую функцию, у которой \`this\` уже намертво привязан, а часть аргументов может быть заранее подставлена — это называется частичное применение (partial application). То есть ты как бы заранее заполняешь несколько полей формы, а остальные заполнишь при вызове.

\`\`\`js
Function.prototype.myBind = function (thisArg, ...bound) {
  const fn = this;
  function boundFn(...args) {
    const isNew = this instanceof boundFn;
    return fn.apply(isNew ? this : thisArg, [...bound, ...args]);
  }
  boundFn.prototype = Object.create(fn.prototype || null);
  return boundFn;
};
\`\`\`

\`bound\` — это заранее подставленные аргументы. При вызове мы склеиваем их с новыми: \`[...bound, ...args]\`. Самая тонкая часть — строка \`const isNew = this instanceof boundFn\`. Она нужна, чтобы правильно обработать вызов через \`new\`.

### Почему \`bind\` + \`new\` особенный

Если привязанную функцию вызвать через \`new\` (\`new boundFn()\`), то по спецификации оператор \`new\` важнее привязки: \`this\` должен указывать не на \`thisArg\`, а на свежесозданный объект. Проверка \`this instanceof boundFn\` как раз определяет, вызвали ли нас через \`new\`. Если да — используем \`this\` (новый объект), если нет — используем привязанный \`thisArg\`. Строка с \`boundFn.prototype = Object.create(fn.prototype || null)\` нужна, чтобы объекты, созданные через \`new boundFn()\`, наследовали от прототипа исходной функции.

## ⚠️ Подводные камни

- Если \`thisArg\` равен \`null\`/\`undefined\`, в нестрогом режиме \`this\` укажет на \`globalThis\` — это ожидаемое поведение, но легко забыть.
- Примитивный \`thisArg\` (число, строка) оборачивается в объект (boxing), поэтому положить на него свойство можно.
- Забыть про случай \`new (boundFn)\` — самая частая ошибка: без проверки \`instanceof\` конструктор сломается.
- Использование обычного строкового ключа вместо \`Symbol\` может затереть настоящее свойство объекта.

## 🎯 Запомни

- Главный трюк \`call\`/\`apply\`: временно сделать функцию методом объекта — тогда \`this\` станет этим объектом сам собой.
- \`apply\` = \`call\`, но аргументы одним массивом.
- \`bind\` возвращает новую функцию с зафиксированным \`this\` и частично применёнными аргументами; вызывается позже.
- При вызове привязанной функции через \`new\` оператор \`new\` побеждает: \`this\` берётся от нового объекта, а не от привязанного.`,
      en: `## 🧩 In plain words

\`call\`, \`apply\` and \`bind\` are ways to run a function while choosing yourself what \`this\` will point to inside it. Think of a function as a universal remote and \`this\` as the TV it controls. Normally the remote is tied to its "own" TV, but these methods let you aim the same remote at any TV you pick. Our task is to write these remotes ourselves so we understand how they work under the hood.

### What \`this\` actually does

\`this\` is a special variable inside a function that points to the object the function was called "on behalf of". If you write \`obj.method()\`, then inside \`method\` the value of \`this\` will be \`obj\`. The key trick behind all three polyfills is exactly this rule: if you make a function a temporary method of some object and call it as \`obj.fn()\`, then \`this\` automatically becomes that object.

### \`myCall\`: slip the function in as a temporary method

The idea: put the function as a temporary property on \`thisArg\` (the object we want to become \`this\`), call it as a method — and \`this\` becomes the right object by itself. Then delete the property to leave no litter behind. We name the property with a \`Symbol\` — a guaranteed-unique key that won't clobber an existing property on the object.

\`\`\`js
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg ?? globalThis;
  const key = Symbol('fn');
  const ctx = Object(thisArg);
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};
\`\`\`

Line by line. \`thisArg ?? globalThis\` — if \`null\` or \`undefined\` was passed, we substitute the global object (that is how the real \`call\` behaves in non-strict mode). \`Object(thisArg)\` wraps a primitive (number, string) into a wrapper object, because a property can only be placed on an object — this is called boxing. \`ctx[key] = this\` — here \`this\` is the function itself, the one \`myCall\` was called on. We call \`ctx[key](...args)\`, grab the result, delete the key, and return the result.

### \`myApply\`: the same, but arguments as an array

\`apply\` differs from \`call\` in exactly one way: arguments are passed as a single array instead of one by one. So we can express it via \`myCall\`, just "unpacking" the array with the \`...\` operator.

\`\`\`js
Function.prototype.myApply = function (thisArg, args = []) {
  return this.myCall(thisArg, ...args);
};
\`\`\`

### \`myBind\`: don't call it — create a new bound function

\`bind\` doesn't call the function right away. It returns a new function whose \`this\` is permanently locked, and some arguments can be pre-filled — this is called partial application. It's like pre-filling a few fields of a form and filling in the rest when you actually submit.

\`\`\`js
Function.prototype.myBind = function (thisArg, ...bound) {
  const fn = this;
  function boundFn(...args) {
    const isNew = this instanceof boundFn;
    return fn.apply(isNew ? this : thisArg, [...bound, ...args]);
  }
  boundFn.prototype = Object.create(fn.prototype || null);
  return boundFn;
};
\`\`\`

\`bound\` holds the pre-applied arguments. On call we glue them together with the new ones: \`[...bound, ...args]\`. The subtlest part is the line \`const isNew = this instanceof boundFn\`. It handles the case of calling via \`new\`.

### Why \`bind\` + \`new\` is special

If a bound function is called via \`new\` (\`new boundFn()\`), then per the spec the \`new\` operator wins over the binding: \`this\` must point not to \`thisArg\` but to the freshly created object. The check \`this instanceof boundFn\` detects whether we were called via \`new\`. If yes — use \`this\` (the new object); if not — use the bound \`thisArg\`. The line \`boundFn.prototype = Object.create(fn.prototype || null)\` makes objects created via \`new boundFn()\` inherit from the original function's prototype.

## ⚠️ Common pitfalls

- If \`thisArg\` is \`null\`/\`undefined\`, in non-strict mode \`this\` points to \`globalThis\` — expected, but easy to forget.
- A primitive \`thisArg\` (number, string) is boxed into an object, which is why a property can be placed on it.
- Forgetting the \`new (boundFn)\` case is the most common mistake: without the \`instanceof\` check, using it as a constructor breaks.
- Using a plain string key instead of a \`Symbol\` may overwrite a real property on the object.

## 🎯 Key takeaways

- The core trick of \`call\`/\`apply\`: temporarily make the function a method of the object — then \`this\` becomes that object by itself.
- \`apply\` = \`call\`, but with arguments in a single array.
- \`bind\` returns a new function with a fixed \`this\` and partially applied arguments; it runs later.
- When a bound function is called via \`new\`, the \`new\` operator wins: \`this\` comes from the new object, not the bound one.`
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
      ru: `## 🧩 Простыми словами

Оператор \`new\` кажется магией, но на самом деле он делает всего несколько простых шагов. Представь, что конструктор — это форма для отливки, а \`new\` — рабочий, который берёт пустую заготовку, вставляет её в форму, заливает и достаёт готовую деталь. Наша задача — написать этого «рабочего» вручную в виде функции \`myNew\`, чтобы увидеть, что происходит за кулисами.

### Что делает \`new\` под капотом

Когда ты пишешь \`new Constructor(...args)\`, движок делает следующее:

1. Создаёт новый пустой объект.
2. Устанавливает его скрытый прототип (\`[[Prototype]]\`, то самое \`__proto__\`) равным \`Constructor.prototype\` — так объект наследует методы конструктора.
3. Вызывает конструктор, подставив новый объект в качестве \`this\`.
4. Если конструктор вернул **объект** — отдаёт его; если вернул примитив или ничего — отдаёт созданный на шаге 1 объект.

Прототип (\`[[Prototype]]\`) — это объект, из которого текущий объект «наследует» свойства и методы, если не нашёл их у себя.

### Собираем \`myNew\`

\`\`\`js
function myNew(Constructor, ...args) {
  const proto =
    typeof Constructor.prototype === 'object' && Constructor.prototype !== null
      ? Constructor.prototype
      : Object.prototype;
  const instance = Object.create(proto);
  const result = Constructor.apply(instance, args);
  return result !== null && (typeof result === 'object' || typeof result === 'function')
    ? result
    : instance;
}
\`\`\`

Разберём. \`Object.create(proto)\` создаёт пустой объект с нужным прототипом — это шаги 1 и 2 сразу. Проверка \`typeof Constructor.prototype === 'object'\` нужна на случай, когда у конструктора \`prototype\` не объект (такое бывает, например, у стрелочных функций его нет) — тогда по правилам берём \`Object.prototype\`. \`Constructor.apply(instance, args)\` — это шаг 3: вызываем конструктор с новым объектом как \`this\` и передаём аргументы. Последняя строка — шаг 4: если конструктор вернул объект или функцию, возвращаем именно его, иначе — наш \`instance\`.

### Почему проверка на объект важна

По спецификации \`new\` игнорирует любое примитивное возвращаемое значение конструктора. Если внутри конструктора написать \`return 42\`, это число просто выбросится, и ты получишь нормально созданный объект. Но если вернуть \`{}\` или массив — вернётся именно он, а созданный на шаге 1 объект отбросится. Поэтому в коде мы явно проверяем \`typeof result === 'object' || typeof result === 'function'\`.

## ⚠️ Подводные камни

- Возврат примитива (\`return 42\`, \`return 'hi'\`) из конструктора игнорируется — вернётся созданный объект.
- Возврат объекта или функции подменяет результат целиком — про это часто забывают.
- \`typeof null === 'object'\`, поэтому нужна явная проверка \`result !== null\`, иначе \`return null\` ошибочно вернёт \`null\`.
- Если \`Constructor.prototype\` не объект, прототипом становится \`Object.prototype\`.

## 🎯 Запомни

- \`new\` = создать объект → привязать прототип → вызвать конструктор с этим \`this\` → вернуть объект.
- Прототип нового объекта берётся из \`Constructor.prototype\`.
- Примитивное возвращаемое значение конструктора игнорируется; объект — подменяет результат.
- \`Object.create(proto)\` + \`Constructor.apply(instance, args)\` — вся суть в двух строках.`,
      en: `## 🧩 In plain words

The \`new\` operator feels like magic, but it really just does a few simple steps. Think of a constructor as a casting mold and \`new\` as a worker who takes a blank, puts it in the mold, pours it, and pulls out a finished part. Our task is to write that "worker" by hand as a function \`myNew\`, so we can see what happens behind the scenes.

### What \`new\` does under the hood

When you write \`new Constructor(...args)\`, the engine does this:

1. Creates a new empty object.
2. Sets its hidden prototype (\`[[Prototype]]\`, the same as \`__proto__\`) to \`Constructor.prototype\`, so the object inherits the constructor's methods.
3. Calls the constructor, passing the new object as \`this\`.
4. If the constructor returns an **object**, hands that back; if it returns a primitive or nothing, hands back the object created in step 1.

A prototype (\`[[Prototype]]\`) is an object the current object "inherits" properties and methods from when it doesn't have them itself.

### Building \`myNew\`

\`\`\`js
function myNew(Constructor, ...args) {
  const proto =
    typeof Constructor.prototype === 'object' && Constructor.prototype !== null
      ? Constructor.prototype
      : Object.prototype;
  const instance = Object.create(proto);
  const result = Constructor.apply(instance, args);
  return result !== null && (typeof result === 'object' || typeof result === 'function')
    ? result
    : instance;
}
\`\`\`

Let's break it down. \`Object.create(proto)\` creates an empty object with the right prototype — that's steps 1 and 2 at once. The check \`typeof Constructor.prototype === 'object'\` handles the case where the constructor's \`prototype\` isn't an object (for instance, arrow functions don't have one) — then, by the rules, we use \`Object.prototype\`. \`Constructor.apply(instance, args)\` is step 3: call the constructor with the new object as \`this\` and pass the arguments. The last line is step 4: if the constructor returned an object or a function, return that; otherwise return our \`instance\`.

### Why the object check matters

Per the spec, \`new\` ignores any primitive return value from a constructor. If you write \`return 42\` inside a constructor, that number is simply thrown away and you get the normally created object. But if you return \`{}\` or an array, that value is returned instead, and the object from step 1 is discarded. That's why the code explicitly checks \`typeof result === 'object' || typeof result === 'function'\`.

## ⚠️ Common pitfalls

- Returning a primitive (\`return 42\`, \`return 'hi'\`) from a constructor is ignored — the created object is returned.
- Returning an object or function replaces the result entirely — often forgotten.
- \`typeof null === 'object'\`, so you need an explicit \`result !== null\` check, otherwise \`return null\` would wrongly return \`null\`.
- If \`Constructor.prototype\` isn't an object, the prototype becomes \`Object.prototype\`.

## 🎯 Key takeaways

- \`new\` = create object → link prototype → call constructor with that \`this\` → return an object.
- The new object's prototype comes from \`Constructor.prototype\`.
- A primitive return value from the constructor is ignored; an object return replaces the result.
- \`Object.create(proto)\` + \`Constructor.apply(instance, args)\` capture the whole idea in two lines.`
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
      ru: `## 🧩 Простыми словами

«Развернуть» (flatten) массив — значит вытащить элементы из вложенных массивов наружу, сделав структуру более плоской. Представь матрёшку: внутри одной коробки лежат другие, а в них — ещё. Flatten достаёт содержимое коробок и раскладывает всё в один ряд. Параметр \`depth\` (глубина) говорит, на сколько уровней вглубь мы «открываем коробки»: например, \`depth = 2\` откроет два уровня, а то, что глубже, оставит как есть.

### Рекурсивная версия

Рекурсия — это когда функция вызывает саму себя для решения такой же задачи, но поменьше. Идём по массиву методом \`reduce\` (он «складывает» массив в один результат). Для каждого элемента: если это массив и глубина ещё больше нуля — разворачиваем его тем же \`flatten\`, но с уменьшенной глубиной \`depth - 1\`; иначе кладём элемент как есть.

\`\`\`js
function flatten(arr, depth = Infinity) {
  return arr.reduce(
    (acc, item) =>
      Array.isArray(item) && depth > 0
        ? acc.concat(flatten(item, depth - 1))
        : acc.concat(item),
    []
  );
}
\`\`\`

\`acc\` — это накапливаемый результат (начинается с пустого массива \`[]\`). \`Array.isArray(item)\` проверяет, массив ли элемент. \`acc.concat(...)\` приклеивает элементы к результату. Уменьшение \`depth - 1\` при каждом погружении — это и есть контроль глубины: когда \`depth\` дойдёт до нуля, вложенные массивы перестанут разворачиваться. По умолчанию \`depth = Infinity\` — разворачиваем до конца.

### Итеративная версия (через стек)

Итеративно — значит без рекурсии, обычным циклом. Это безопаснее для очень глубоко вложенных структур, потому что глубокая рекурсия может переполнить стек вызовов (движок ограничивает вложенность вызовов функций). Мы заводим свой стек — массив пар \`[элемент, оставшаяся_глубина]\` — и обрабатываем его в цикле.

\`\`\`js
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
}
\`\`\`

Стек (stack) работает по принципу «последним пришёл — первым вышел»: \`pop()\` достаёт верхний элемент. Если достали массив и глубина ещё есть — раскладываем его элементы обратно в стек с уменьшенной глубиной \`d - 1\`. Иначе — кладём в результат. Из-за порядка работы \`pop\`/\`push\` результат получается в обратном порядке, поэтому в конце делаем \`reverse()\`.

### Как проверить на примере

\`flatten([1,[2,[3,[4]]]], 2)\` даёт \`[1,2,3,[4]]\`: развернули два уровня, а самый глубокий \`[4]\` остался массивом, потому что до него глубина уже исчерпалась.

## ⚠️ Подводные камни

- \`depth = 0\` должен вернуть массив без изменений (только копию верхнего уровня) — легко случайно всё равно развернуть.
- Очень глубокая вложенность может переполнить стек в рекурсивной версии — тогда берите итеративную.
- Не забывайте про \`reverse()\` в итеративной версии, иначе порядок элементов будет обратным.
- Разреженные массивы (с «дырами») могут вести себя неожиданно при обходе.

## 🎯 Запомни

- Flatten вытаскивает элементы из вложенных массивов; \`depth\` ограничивает, насколько глубоко.
- Рекурсия: \`reduce\` + \`concat\`, уменьшая \`depth - 1\` при каждом погружении.
- Итеративная версия со стеком безопаснее для очень глубоких структур.
- Встроенный \`arr.flat(depth)\` делает то же самое; вопрос проверяет понимание рекурсии и стека.`,
      en: `## 🧩 In plain words

To "flatten" an array means to pull elements out of nested arrays so the structure becomes flatter. Picture a Russian nesting doll: one box holds other boxes, which hold more. Flatten takes the contents out of the boxes and lays everything in a single row. The \`depth\` parameter says how many levels deep we "open the boxes": for example \`depth = 2\` opens two levels and leaves anything deeper as-is.

### Recursive version

Recursion is when a function calls itself to solve the same problem, just smaller. We walk the array with \`reduce\` (which "folds" an array into a single result). For each element: if it's an array and depth is still above zero, flatten it with the same \`flatten\` but reduced depth \`depth - 1\`; otherwise push the element as-is.

\`\`\`js
function flatten(arr, depth = Infinity) {
  return arr.reduce(
    (acc, item) =>
      Array.isArray(item) && depth > 0
        ? acc.concat(flatten(item, depth - 1))
        : acc.concat(item),
    []
  );
}
\`\`\`

\`acc\` is the accumulated result (it starts as an empty array \`[]\`). \`Array.isArray(item)\` checks whether the element is an array. \`acc.concat(...)\` glues elements onto the result. Decreasing \`depth - 1\` on each dive is how depth is controlled: once \`depth\` reaches zero, nested arrays stop being flattened. By default \`depth = Infinity\` — flatten all the way down.

### Iterative version (stack-based)

Iterative means without recursion, using a plain loop. It's safer for very deeply nested structures, because deep recursion can overflow the call stack (the engine limits how deeply function calls can nest). We keep our own stack — an array of \`[item, remainingDepth]\` pairs — and process it in a loop.

\`\`\`js
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
}
\`\`\`

A stack works "last in, first out": \`pop()\` takes the top element. If we popped an array and depth remains, we push its elements back onto the stack with reduced depth \`d - 1\`. Otherwise we push it to the result. Because of how \`pop\`/\`push\` interact, the result comes out reversed, so we call \`reverse()\` at the end.

### Checking against the example

\`flatten([1,[2,[3,[4]]]], 2)\` gives \`[1,2,3,[4]]\`: we unwrapped two levels, and the deepest \`[4]\` stayed an array because depth was already used up before reaching it.

## ⚠️ Common pitfalls

- \`depth = 0\` should return the array unchanged (just a top-level copy) — it's easy to accidentally flatten anyway.
- Very deep nesting can overflow the stack in the recursive version — use the iterative one then.
- Don't forget \`reverse()\` in the iterative version, or the element order comes out backwards.
- Sparse arrays (with "holes") may behave unexpectedly during traversal.

## 🎯 Key takeaways

- Flatten pulls elements out of nested arrays; \`depth\` limits how deep it goes.
- Recursion: \`reduce\` + \`concat\`, decreasing \`depth - 1\` on each dive.
- The stack-based iterative version is safer for very deep structures.
- The built-in \`arr.flat(depth)\` does the same thing; the question tests understanding of recursion and stacks.`
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
      ru: `## 🧩 Простыми словами

\`chunk\` разрезает один длинный массив на несколько кусочков (chunks) заданного размера. Представь ленту конфет: ты режешь её на упаковки по 2 штуки, и если в конце осталась одна лишняя — она просто едет в неполной упаковке. Последний кусок может быть короче остальных, и это нормально.

### Как это работает

Мы шагаем по массиву не по одному элементу, а сразу по \`size\` штук за шаг, и на каждом шаге отрезаем кусок методом \`slice(i, i + size)\`. \`slice\` возвращает копию части массива от индекса \`i\` до \`i + size\` (не включая правую границу), не меняя исходный массив.

\`\`\`js
function chunk(arr, size) {
  if (size <= 0) return [];
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
\`\`\`

Обрати внимание на \`i += size\` — счётчик прыгает через каждые \`size\` элементов, а не увеличивается на единицу. Проверка \`if (size <= 0) return []\` защищает от бессмысленного или бесконечного цикла: с нулевым или отрицательным шагом цикл никогда бы не завершился. Когда \`slice\` дойдёт до конца массива, он сам вернёт столько элементов, сколько осталось — поэтому последний кусок автоматически получается короче, если элементов не хватило на полный.

### Элегантный вариант в одну строку

Тот же результат можно получить компактнее через \`Array.from\`. Сначала считаем, сколько всего кусков будет: \`Math.ceil(arr.length / size)\` (\`ceil\` округляет вверх, чтобы неполный последний кусок тоже посчитался). Затем для каждого индекса куска \`i\` берём соответствующий срез.

\`\`\`js
const chunk2 = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
\`\`\`

\`Array.from({ length: N }, fn)\` создаёт массив длины \`N\` и заполняет его результатами функции \`fn\`, куда вторым аргументом приходит индекс \`i\`. Для куска номер \`i\` его элементы лежат с позиции \`i * size\`.

### Где это пригождается

Chunk используют для пагинации (разбить список на страницы), для батчинга запросов (отправлять данные порциями, а не по одному) и для верстки сеткой по строкам (например, показать карточки по 3 в ряд).

## ⚠️ Подводные камни

- \`size <= 0\` нужно обработать явно, иначе получите пустой результат или бесконечный цикл — договоритесь с интервьюером, вернуть \`[]\` или бросить ошибку.
- Пустой массив на входе даёт пустой массив \`[]\` на выходе — проверьте, что код это не ломает.
- Если \`size\` больше длины массива — вернётся один кусок со всеми элементами, и это правильно.
- Помните: \`Math.ceil\`, а не \`Math.floor\`, иначе потеряете последний неполный кусок.

## 🎯 Запомни

- Идём по массиву с шагом \`size\` и режем \`slice(i, i + size)\`.
- Последний кусок может быть короче — \`slice\` сам вернёт остаток.
- Всегда обрабатывайте \`size <= 0\` и пустой вход.
- Применения: пагинация, батчинг запросов, рендер сеткой по строкам.`,
      en: `## 🧩 In plain words

\`chunk\` slices one long array into several smaller pieces (chunks) of a given size. Picture a strip of candy: you cut it into packs of 2, and if one extra is left at the end, it just rides in an incomplete pack. The last chunk may be shorter than the rest, and that's fine.

### How it works

We step through the array not one element at a time but \`size\` elements per step, and on each step cut off a piece with \`slice(i, i + size)\`. \`slice\` returns a copy of part of the array from index \`i\` up to (but not including) \`i + size\`, without modifying the original array.

\`\`\`js
function chunk(arr, size) {
  if (size <= 0) return [];
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
\`\`\`

Notice \`i += size\` — the counter jumps by \`size\` elements each time instead of incrementing by one. The \`if (size <= 0) return []\` check guards against a pointless or infinite loop: with a zero or negative step the loop would never end. When \`slice\` reaches the end of the array, it simply returns however many elements remain — so the last chunk automatically comes out shorter if there weren't enough for a full one.

### An elegant one-line variant

The same result can be written more compactly with \`Array.from\`. First we compute how many chunks there will be: \`Math.ceil(arr.length / size)\` (\`ceil\` rounds up so the incomplete last chunk is counted too). Then for each chunk index \`i\` we take the matching slice.

\`\`\`js
const chunk2 = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
\`\`\`

\`Array.from({ length: N }, fn)\` creates an array of length \`N\` and fills it with the results of \`fn\`, which receives the index \`i\` as its second argument. For chunk number \`i\`, its elements start at position \`i * size\`.

### Where it's useful

Chunk is used for pagination (splitting a list into pages), request batching (sending data in portions instead of one by one), and grid layout by rows (for example, showing cards 3 per row).

## ⚠️ Common pitfalls

- \`size <= 0\` must be handled explicitly, otherwise you get an empty result or an infinite loop — agree with the interviewer whether to return \`[]\` or throw.
- An empty input array yields an empty \`[]\` output — make sure your code doesn't break on it.
- If \`size\` is larger than the array length, one chunk with everything is returned, which is correct.
- Remember \`Math.ceil\`, not \`Math.floor\`, or you'll drop the last incomplete chunk.

## 🎯 Key takeaways

- Step through the array by \`size\` and cut \`slice(i, i + size)\`.
- The last chunk may be shorter — \`slice\` returns the remainder on its own.
- Always handle \`size <= 0\` and empty input.
- Uses: pagination, request batching, grid rendering by rows.`
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя коробка с носками разных цветов, и ты хочешь разложить их по кучкам: красные к красным, синие к синим. \`groupBy\` делает ровно это с элементами массива: смотрит на каждый элемент, вычисляет для него «цвет» (ключ) и кидает элемент в нужную кучку. На выходе — объект, где ключ это название кучки, а значение — массив элементов, попавших в неё.

### Как это работает

\`groupBy(arr, key)\` принимает массив и способ вычислить ключ. Ключ можно задать двумя способами: передать **функцию** (она вернёт ключ для каждого элемента) или просто **имя свойства** строкой (тогда ключ берётся из этого поля).

Внутри мы идём по массиву методом \`reduce\` — это способ «свернуть» массив в одно значение (у нас это накопитель-объект \`acc\` с кучками). Для каждого элемента:

1. Вычисляем ключ \`k\`.
2. Если кучки с таким ключом ещё нет, создаём пустой массив.
3. Добавляем (\`push\`) элемент в эту кучку.

\`\`\`js
function groupBy(arr, key) {
  const getKey = typeof key === 'function' ? key : (item) => item[key];
  return arr.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// groupBy([{ age: 20 }, { age: 30 }, { age: 20 }], 'age');
// { '20': [...], '30': [...] }
\`\`\`

Ключевой приём — \`acc[k] ??= []\`. Оператор \`??=\` (nullish-присваивание) означает «если \`acc[k]\` пусто (undefined), присвой туда \`[]\`». То есть кучка создаётся **лениво**, только когда встретился первый элемент с таким ключом. Выражение возвращает сам массив, поэтому мы сразу вызываем на нём \`.push(item)\`.

### Сложность

\`O(n)\` по времени (один проход по массиву) и \`O(n)\` по памяти (храним все элементы, просто разложенные по кучкам).

## ⚠️ Подводные камни

- Ключи объекта в JavaScript всегда приводятся к строке. Поэтому число \`1\` и строка \`'1'\` сольются в одну кучку \`'1'\`. Если это важно, используй \`Map\` — она хранит ключи любого типа как есть.
- Пустой массив на входе даёт пустой объект \`{}\`.
- Не забудь поддержать оба варианта аргумента: и функцию, и имя свойства.

## 🎯 Запомни

- \`groupBy\` = разложить элементы по кучкам-массивам на основе вычисленного ключа.
- Основа — \`reduce\` с накопителем-объектом и ленивым созданием кучки через \`acc[k] ??= []\`.
- Объект теряет тип ключа (всё становится строкой); для строгости бери \`Map\`.
- В платформе уже есть \`Object.groupBy\` и \`Map.groupBy\` (ES2024) — то же самое из коробки.`,
      en: `## 🧩 In plain words

Imagine a box of socks in different colors, and you want to sort them into piles: reds with reds, blues with blues. \`groupBy\` does exactly this with array elements: it looks at each item, computes its "color" (the key), and tosses the item into the right pile. The result is an object where the key is the pile's name and the value is the array of items that landed in it.

### How it works

\`groupBy(arr, key)\` takes an array and a way to compute the key. You can give the key two ways: pass a **function** (it returns the key for each item) or just a **property name** as a string (the key is read from that field).

Inside, we walk the array with \`reduce\` — a way to "fold" an array into one value (here it's an accumulator object \`acc\` holding the piles). For each item:

1. Compute the key \`k\`.
2. If a pile with that key doesn't exist yet, create an empty array.
3. Push the item into that pile.

\`\`\`js
function groupBy(arr, key) {
  const getKey = typeof key === 'function' ? key : (item) => item[key];
  return arr.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// groupBy([{ age: 20 }, { age: 30 }, { age: 20 }], 'age');
// { '20': [...], '30': [...] }
\`\`\`

The key trick is \`acc[k] ??= []\`. The \`??=\` (nullish assignment) operator means "if \`acc[k]\` is empty (undefined), assign \`[]\` to it." So the pile is created **lazily**, only when the first item with that key shows up. The expression returns the array itself, so we immediately call \`.push(item)\` on it.

### Complexity

\`O(n)\` time (one pass over the array) and \`O(n)\` memory (we keep all elements, just sorted into piles).

## ⚠️ Common pitfalls

- Object keys in JavaScript are always coerced to strings. So the number \`1\` and the string \`'1'\` collide into one pile \`'1'\`. If that matters, use a \`Map\` — it keeps keys of any type as-is.
- An empty input array yields an empty object \`{}\`.
- Remember to support both argument forms: a function and a property name.

## 🎯 Key takeaways

- \`groupBy\` = sort items into pile-arrays based on a computed key.
- The core is \`reduce\` with an accumulator object and a lazily-created pile via \`acc[k] ??= []\`.
- An object loses key type (everything becomes a string); use a \`Map\` for strictness.
- The platform already ships \`Object.groupBy\` and \`Map.groupBy\` (ES2024) — the same thing built in.`
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
      ru: `## 🧩 Простыми словами

Дедупликация — это выкидывание повторов, чтобы каждый элемент встретился один раз. Представь список гостей, где кто-то записался дважды: ты идёшь сверху вниз и оставляешь только первое появление каждого имени. Для простых значений (числа, строки) есть готовый инструмент — \`Set\`, коллекция, которая физически не может хранить дубликаты. Для объектов сложнее: их нужно сравнивать не целиком, а по какому-то ключу (например, по \`id\`).

### unique — для примитивов

\`Set\` — это набор уникальных значений. Если положить туда массив, все повторы отсеются сами, а порядок первого появления сохранится. Дальше разворачиваем \`Set\` обратно в массив через spread \`[...]\`.

\`\`\`js
const unique = (arr) => [...new Set(arr)];
\`\`\`

Коротко и \`O(n)\` — один проход.

### uniqueBy — для объектов

Два одинаковых по содержимому объекта в JavaScript считаются **разными**, если это разные ссылки в памяти. Поэтому \`Set\` из объектов не уберёт «одинаковые» объекты. Решение: заводим \`Set\` уже виденных **ключей**, идём по массиву и пропускаем элемент, если его ключ уже встречался.

\`\`\`js
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

// uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (x) => x.id);
\`\`\`

\`keyFn\` вычисляет ключ для сравнения (тут \`x.id\`). Первый объект с \`id: 1\` проходит и попадает в результат, второй с тем же \`id\` отсеивается. Порядок первого появления сохраняется, потому что мы идём слева направо. Тоже \`O(n)\`.

## ⚠️ Подводные камни

- \`NaN\` в \`Set\` дедуплицируется корректно — останется один \`NaN\` (хотя \`NaN !== NaN\` в обычном сравнении).
- \`+0\` и \`-0\` в \`Set\` считаются одним значением.
- \`Set\` из объектов сравнивает по ссылке, а не по содержимому — структурно равные объекты он НЕ схлопнет. Именно поэтому нужен \`uniqueBy\` с \`keyFn\`.

## 🎯 Запомни

- Простые значения: \`[...new Set(arr)]\` — коротко и \`O(n)\`.
- Объекты: \`Set\` виденных ключей + ручной проход, чтобы сохранить порядок первого появления.
- Не используй \`filter\` + \`indexOf\` — это \`O(n²)\`, а \`Set\` даёт \`O(n)\`.
- Чтобы дедуплицировать объекты по содержимому, сериализуй ключ или сравнивай глубоко (дороже).`,
      en: `## 🧩 In plain words

Deduplication means throwing out repeats so each item appears once. Picture a guest list where someone signed up twice: you go top to bottom and keep only the first appearance of each name. For simple values (numbers, strings) there's a ready tool — \`Set\`, a collection that physically cannot hold duplicates. For objects it's trickier: you compare them not as a whole but by some key (like \`id\`).

### unique — for primitives

A \`Set\` is a collection of unique values. Drop an array into it and all repeats are filtered out on their own, while first-appearance order is preserved. Then spread the \`Set\` back into an array with \`[...]\`.

\`\`\`js
const unique = (arr) => [...new Set(arr)];
\`\`\`

Short and \`O(n)\` — one pass.

### uniqueBy — for objects

Two objects with identical contents are considered **different** in JavaScript if they are different references in memory. So a \`Set\` of objects won't remove "identical" objects. The fix: keep a \`Set\` of already-seen **keys**, walk the array, and skip an item if its key was seen before.

\`\`\`js
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

// uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (x) => x.id);
\`\`\`

\`keyFn\` computes the comparison key (here \`x.id\`). The first object with \`id: 1\` passes and lands in the result; the second with the same \`id\` is dropped. First-appearance order is kept because we go left to right. Also \`O(n)\`.

## ⚠️ Common pitfalls

- \`NaN\` dedupes correctly in a \`Set\` — a single \`NaN\` remains (even though \`NaN !== NaN\` in normal comparison).
- \`+0\` and \`-0\` are treated as one value in a \`Set\`.
- A \`Set\` of objects compares by reference, not by contents — it will NOT collapse structurally equal objects. That's exactly why you need \`uniqueBy\` with a \`keyFn\`.

## 🎯 Key takeaways

- Simple values: \`[...new Set(arr)]\` — short and \`O(n)\`.
- Objects: a \`Set\` of seen keys plus a manual pass to preserve first-occurrence order.
- Don't use \`filter\` + \`indexOf\` — that's \`O(n²)\`; a \`Set\` gives \`O(n)\`.
- To dedupe objects by contents, serialize a key or compare deeply (costlier).`
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
      ru: `## 🧩 Простыми словами

\`map\`, \`filter\` и \`reduce\` — три самых частых метода массивов. Написать их полифилы (свои реализации с нуля) — классическая проверка на собеседовании: показывает, что ты понимаешь, как они устроены внутри, а не просто вызываешь. Полифил — это «запаска», собственная копия встроенного метода. Секрет всех трёх — обычный цикл по элементам и вызов колбэка (переданной функции) для каждого.

### Контракт колбэка

Все три метода вызывают твою функцию с тремя аргументами: \`(значение, индекс, весь_массив)\`. Внутри полифила \`this\` — это сам массив, на котором вызван метод (например, \`[1,2,3].myMap(...)\`).

### myMap — преобразовать каждый элемент

Идём по массиву, применяем колбэк к каждому элементу и складываем результат в новый массив на той же позиции.

\`\`\`js
Array.prototype.myMap = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = cb.call(thisArg, this[i], i, this);
  }
  return result;
};
\`\`\`

\`cb.call(thisArg, ...)\` вызывает колбэк, задавая ему \`this\` равным \`thisArg\` (необязательный второй аргумент). Проверка \`i in this\` пропускает «дыры» в разреженных массивах — об этом ниже.

### myFilter — оставить подходящие

То же самое, но в результат попадает только элемент, для которого колбэк вернул истину.

\`\`\`js
Array.prototype.myFilter = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i]);
  }
  return result;
};
\`\`\`

### myReduce — свернуть в одно значение

\`reduce\` копит результат в аккумуляторе. Тонкость — начальное значение \`initialValue\`:

- Если оно **передано** — аккумулятор начинается с него, а обход с индекса 0.
- Если **не передано** — аккумулятором становится первый элемент массива, а обход стартует с индекса 1.
- Если массива нет элементов И начального значения нет — бросаем \`TypeError\`, ровно как нативный метод.

\`\`\`js
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
};
\`\`\`

Проверяем именно \`arguments.length < 2\`, а не \`initial === undefined\`, потому что \`undefined\` может быть законным начальным значением.

### Сложность

\`O(n)\` по времени. По памяти: \`myMap\`/\`myFilter\` создают новый массив (\`O(n)\`), \`myReduce\` копит одно значение (\`O(1)\`).

## ⚠️ Подводные камни

- Разреженные массивы (с «дырами», например \`[1, , 3]\`): нативные \`map\`/\`filter\` пропускают пустые позиции. Проверка \`i in this\` воспроизводит это поведение.
- Пустой \`reduce\` без начального значения бросает \`TypeError\` — не забудь эту ветку.
- Не путай \`arguments.length < 2\` с проверкой на \`undefined\` — иначе сломаешь случай, когда начальное значение намеренно \`undefined\`.

## 🎯 Запомни

- Все три — это цикл по \`this\` + вызов колбэка с \`(value, i, this)\`.
- \`map\` строит новый массив, \`filter\` отбирает по условию, \`reduce\` копит аккумулятор.
- Вся хитрость \`reduce\` — обработка отсутствующего \`initialValue\` и \`TypeError\` на пустом массиве.
- Третий аргумент колбэка (сам массив) даёт доступ к исходным данным внутри преобразования.`,
      en: `## 🧩 In plain words

\`map\`, \`filter\` and \`reduce\` are the three most-used array methods. Writing their polyfills (your own from-scratch implementations) is a classic interview check: it shows you understand how they work inside, not just that you call them. A polyfill is a "spare-tire" — your own copy of a built-in method. The secret to all three is a plain loop over the elements and a call to the callback (the passed-in function) for each one.

### The callback contract

All three call your function with three arguments: \`(value, index, whole_array)\`. Inside the polyfill, \`this\` is the array the method was called on (e.g. \`[1,2,3].myMap(...)\`).

### myMap — transform each element

Walk the array, apply the callback to each element, and store the result in a new array at the same position.

\`\`\`js
Array.prototype.myMap = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = cb.call(thisArg, this[i], i, this);
  }
  return result;
};
\`\`\`

\`cb.call(thisArg, ...)\` invokes the callback with its \`this\` set to \`thisArg\` (the optional second argument). The \`i in this\` check skips "holes" in sparse arrays — more on that below.

### myFilter — keep the matching ones

Same idea, but only elements for which the callback returns truthy make it into the result.

\`\`\`js
Array.prototype.myFilter = function (cb, thisArg) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && cb.call(thisArg, this[i], i, this)) result.push(this[i]);
  }
  return result;
};
\`\`\`

### myReduce — fold into a single value

\`reduce\` accumulates a result in an accumulator. The subtlety is the \`initialValue\`:

- If it **is passed** — the accumulator starts with it, and iteration starts at index 0.
- If it **is not passed** — the accumulator becomes the array's first element, and iteration starts at index 1.
- If the array is empty AND there's no initial value — throw a \`TypeError\`, exactly like the native method.

\`\`\`js
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
};
\`\`\`

We check \`arguments.length < 2\`, not \`initial === undefined\`, because \`undefined\` can be a legitimate initial value.

### Complexity

\`O(n)\` time. Memory: \`myMap\`/\`myFilter\` build a new array (\`O(n)\`), \`myReduce\` accumulates one value (\`O(1)\`).

## ⚠️ Common pitfalls

- Sparse arrays (with "holes", e.g. \`[1, , 3]\`): native \`map\`/\`filter\` skip empty slots. The \`i in this\` check reproduces that behavior.
- An empty \`reduce\` with no initial value throws a \`TypeError\` — don't forget that branch.
- Don't confuse \`arguments.length < 2\` with an \`undefined\` check — otherwise you break the case where the initial value is deliberately \`undefined\`.

## 🎯 Key takeaways

- All three are a loop over \`this\` plus a callback call with \`(value, i, this)\`.
- \`map\` builds a new array, \`filter\` selects by a condition, \`reduce\` accumulates.
- The whole trick of \`reduce\` is handling a missing \`initialValue\` and the \`TypeError\` on an empty array.
- The callback's third argument (the array itself) gives access to the source data inside the transform.`
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
      ru: `## 🧩 Простыми словами

Две маленькие утилиты из мира функционального программирования. \`range\` — как разметка на линейке: «дай мне числа от 0 до 5» и получаешь \`[0, 1, 2, 3, 4]\`. \`zip\` — как застёжка-молния: берёт два (или больше) массива и сшивает их поэлементно в пары, соединяя первые элементы друг с другом, вторые друг с другом и так далее.

### range — генерируем числа

\`range(start, end, step)\` создаёт массив чисел от \`start\` (включительно) до \`end\` (не включая), с шагом \`step\`. Сначала считаем, сколько чисел получится, потом строим массив нужной длины.

\`\`\`js
function range(start, end, step = 1) {
  if (step === 0) throw new Error('step cannot be 0');
  const count = Math.max(Math.ceil((end - start) / step), 0);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

// range(0, 5); // [0,1,2,3,4]
\`\`\`

Разберём: \`(end - start) / step\` — это сколько шагов помещается в диапазон, \`Math.ceil\` округляет вверх (чтобы влез неполный последний шаг). \`Math.max(..., 0)\` защищает от отрицательного количества, если диапазон «пустой». \`Array.from({ length: count }, ...)\` создаёт массив заданной длины и заполняет его: для позиции \`i\` значение равно \`start + i * step\`. Отрицательный шаг тоже работает — тогда идём вниз.

### zip — сшиваем массивы

\`zip(...arrays)\` принимает любое число массивов. Длина результата — по **самому короткому** массиву (молния застёгивается только до конца короткой стороны). Для каждого индекса собираем кортеж — массив из i-х элементов всех входных массивов.

\`\`\`js
function zip(...arrays) {
  if (arrays.length === 0) return [];
  const len = Math.min(...arrays.map((a) => a.length));
  return Array.from({ length: len }, (_, i) => arrays.map((a) => a[i]));
}

// zip([1, 2], ['a', 'b']); // [[1,'a'],[2,'b']]
\`\`\`

\`Math.min(...arrays.map(a => a.length))\` находит длину самого короткого массива. Затем на каждой позиции \`i\` берём \`a[i]\` из каждого массива и складываем в кортеж.

### Сложность

\`range\` — \`O(n)\` по числу сгенерированных элементов. \`zip\` — \`O(min_len × количество массивов)\`.

## ⚠️ Подводные камни

- \`range\` с \`step = 0\` дал бы бесконечный цикл — обязательно отбрасывай или бросай ошибку.
- \`range(5, 0)\` с положительным шагом даёт пустой массив (благодаря \`Math.max(..., 0)\`) — это корректно.
- \`zip\` без аргументов возвращает \`[]\`. При разной длине массивов мы обрезаем по короткому; если по задаче нужно дополнять \`undefined\` — уточни у интервьюера.

## 🎯 Запомни

- \`range\`: считаем количество шагов через \`ceil((end-start)/step)\`, генерируем через \`Array.from\`.
- \`zip\`: длина по самому короткому массиву, на каждом индексе — кортеж из i-х элементов.
- \`zip(...zipped)\` транспонирует обратно — это и есть unzip.
- Для огромных диапазонов делай ленивый \`range\` через генератор \`function*\`, чтобы не держать всё в памяти.`,
      en: `## 🧩 In plain words

Two small utilities from the functional-programming world. \`range\` is like the ticks on a ruler: "give me numbers from 0 to 5" and you get \`[0, 1, 2, 3, 4]\`. \`zip\` is like a zipper: it takes two (or more) arrays and stitches them together element-wise into pairs, joining the first elements with each other, the second with each other, and so on.

### range — generate numbers

\`range(start, end, step)\` builds an array of numbers from \`start\` (inclusive) to \`end\` (exclusive), stepping by \`step\`. First we compute how many numbers there will be, then build an array of that length.

\`\`\`js
function range(start, end, step = 1) {
  if (step === 0) throw new Error('step cannot be 0');
  const count = Math.max(Math.ceil((end - start) / step), 0);
  return Array.from({ length: count }, (_, i) => start + i * step);
}

// range(0, 5); // [0,1,2,3,4]
\`\`\`

Breaking it down: \`(end - start) / step\` is how many steps fit in the range, \`Math.ceil\` rounds up (so a partial last step still counts). \`Math.max(..., 0)\` guards against a negative count when the range is "empty". \`Array.from({ length: count }, ...)\` creates an array of that length and fills it: at position \`i\` the value is \`start + i * step\`. A negative step works too — then we count down.

### zip — stitch arrays together

\`zip(...arrays)\` takes any number of arrays. The result length follows the **shortest** array (the zipper only closes to the end of the short side). For each index we collect a tuple — an array of the i-th elements of all input arrays.

\`\`\`js
function zip(...arrays) {
  if (arrays.length === 0) return [];
  const len = Math.min(...arrays.map((a) => a.length));
  return Array.from({ length: len }, (_, i) => arrays.map((a) => a[i]));
}

// zip([1, 2], ['a', 'b']); // [[1,'a'],[2,'b']]
\`\`\`

\`Math.min(...arrays.map(a => a.length))\` finds the shortest array's length. Then at each position \`i\` we take \`a[i]\` from every array and collect them into a tuple.

### Complexity

\`range\` is \`O(n)\` in the number of generated elements. \`zip\` is \`O(min_len × number of arrays)\`.

## ⚠️ Common pitfalls

- \`range\` with \`step = 0\` would loop forever — always reject or throw.
- \`range(5, 0)\` with a positive step yields an empty array (thanks to \`Math.max(..., 0)\`) — that's correct.
- \`zip\` with no arguments returns \`[]\`. With arrays of differing lengths we truncate to the shortest; if the task wants \`undefined\`-padding instead, clarify with the interviewer.

## 🎯 Key takeaways

- \`range\`: compute the step count via \`ceil((end-start)/step)\`, generate with \`Array.from\`.
- \`zip\`: length follows the shortest array, and each index holds a tuple of the i-th elements.
- \`zip(...zipped)\` transposes back — that's unzip.
- For huge ranges make \`range\` lazy with a \`function*\` generator so you don't hold everything in memory.`
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
      ru: `## 🧩 Простыми словами

Представь два списка гостей на двух вечеринках. **Пересечение** (intersection) — это люди, которые пришли на обе. **Разность** (difference) — это гости первой вечеринки, которых не было на второй. Чтобы быстро проверять «а этот человек был на второй вечеринке?», мы заранее складываем всех её гостей в удобный справочник — \`Set\`, — где поиск мгновенный.

### Что такое Set и почему он тут главный

\`Set\` — это встроенная коллекция уникальных значений. Её суперсила — метод \`has(x)\`, который проверяет наличие элемента за **O(1)** (постоянное время), не пробегая весь список. Если бы мы искали каждый элемент через \`array.includes(x)\`, то на каждый из \`n\` элементов делали бы проход по \`m\` элементам — получилось бы медленно, O(n×m).

### Как решаем

Кладём массив \`b\` в \`Set\`. Потом просто фильтруем массив \`a\`:

- для **intersection** оставляем те \`x\`, для которых \`setB.has(x)\` истинно (есть в \`b\`);
- для **difference** оставляем те, для которых \`!setB.has(x)\` (нет в \`b\`).

Фильтр идёт по \`a\` в исходном порядке, поэтому **порядок из \`a\` сохраняется** автоматически.

\`\`\`js
function intersection(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function difference(a, b) {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}

// intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
// difference([1, 2, 3], [2, 3, 4]);   // [1]
\`\`\`

### Сложность

**O(n + m)** по времени: один проход, чтобы построить \`Set\` из \`b\` (m элементов), и один проход по \`a\` (n элементов). Память — **O(m)** на сам \`Set\`.

## ⚠️ Подводные камни

- Дубликаты в \`a\` сохраняются как есть. Если нужен уникальный результат — оберни в дедупликацию (например, \`[...new Set(result)]\`).
- Объекты сравниваются **по ссылке**, а не по содержимому. Два одинаковых по виду объекта \`{id:1}\` для \`Set\` разные. Для структурного сравнения сначала сведи элементы к ключу (например, к \`id\` или JSON-строке).
- Пустые массивы обрабатываются корректно сами собой: пустой результат там, где он и должен быть.

## 🎯 Запомни

- \`Set\` превращает «есть ли элемент?» из O(n) в O(1) — это ключ к линейности.
- \`filter\` по \`a\` бесплатно сохраняет исходный порядок.
- Никаких вложенных \`includes\` — это скатывается в O(n×m).
- В современном JS (2024) есть нативные \`Set.prototype.intersection\`/\`difference\` — но они работают с самими множествами, а не с массивами.`,
      en: `## 🧩 In plain words

Imagine guest lists for two parties. The **intersection** is the people who came to both. The **difference** is guests of the first party who did not show up at the second. To quickly answer "was this person at the second party?", we first drop all its guests into a handy lookup — a \`Set\` — where checking membership is instant.

### What a Set is and why it stars here

A \`Set\` is a built-in collection of unique values. Its superpower is \`has(x)\`, which checks membership in **O(1)** (constant time) without scanning the whole list. If we instead searched each element with \`array.includes(x)\`, we'd walk \`m\` elements for every one of \`n\` elements — slow, O(n×m).

### How we solve it

Put array \`b\` into a \`Set\`. Then simply filter array \`a\`:

- for **intersection**, keep the \`x\` where \`setB.has(x)\` is true (present in \`b\`);
- for **difference**, keep those where \`!setB.has(x)\` (absent from \`b\`).

The filter runs over \`a\` in its original order, so **order from \`a\` is preserved** automatically.

\`\`\`js
function intersection(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function difference(a, b) {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}

// intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
// difference([1, 2, 3], [2, 3, 4]);   // [1]
\`\`\`

### Complexity

**O(n + m)** time: one pass to build the \`Set\` from \`b\` (m elements) and one pass over \`a\` (n elements). Memory is **O(m)** for the \`Set\` itself.

## ⚠️ Common pitfalls

- Duplicates in \`a\` are kept as-is. If you need a unique result, wrap it in a dedupe (e.g. \`[...new Set(result)]\`).
- Objects compare **by reference**, not by contents. Two look-alike objects \`{id:1}\` are different to a \`Set\`. For structural comparison, first reduce elements to a key (e.g. an \`id\` or a JSON string).
- Empty arrays are handled correctly for free: an empty result exactly where it should be.

## 🎯 Key takeaways

- A \`Set\` turns "does this element exist?" from O(n) into O(1) — that's the key to linearity.
- Filtering over \`a\` preserves the original order for free.
- No nested \`includes\` — that degrades to O(n×m).
- Modern JS (2024) has native \`Set.prototype.intersection\`/\`difference\`, but they operate on actual sets, not arrays.`
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
      ru: `## 🧩 Простыми словами

Задача Two Sum: дан список чисел и цель (\`target\`). Нужно найти два числа, которые в сумме дают цель, и вернуть их **индексы** (позиции). Наивный способ — перебрать все пары, но это медленно. Хитрость: пока идём по массиву один раз, мы запоминаем всё, что уже видели, в блокнотик — и для каждого числа спрашиваем «а нужного мне партнёра я уже встречал?».

### Идея одного прохода

Для числа \`x\` его «партнёр» — это \`target - x\` (дополнение, complement). Например, если цель 9, а \`x = 2\`, то нам нужна семёрка. Мы идём по массиву слева направо и на каждом шаге:

1. считаем дополнение \`target - nums[i]\`;
2. если оно **уже** лежит в нашем блокноте (\`Map\`) — значит пару нашли, возвращаем два индекса;
3. если нет — записываем текущее число и его индекс в блокнот и идём дальше.

\`Map\` — это словарь «ключ → значение»; здесь ключ это число, а значение — его индекс. Проверка \`has\` и запись \`set\` в нём работают за O(1).

\`\`\`js
function twoSum(nums, target) {
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

// twoSum([2, 7, 11, 15], 9); // [0, 1]
\`\`\`

### Почему это O(n)

Мы проходим массив ровно один раз, и на каждом шаге все операции с \`Map\` — за O(1). Итого **O(n)** по времени и **O(n)** памяти на блокнот. Наивный перебор всех пар был бы O(n²).

### Тонкость с порядком записи

Обрати внимание: мы сначала **проверяем** дополнение, и только потом кладём текущее число в \`Map\`. Так мы гарантируем, что не используем один и тот же элемент дважды — на момент проверки текущего элемента в блокноте ещё нет.

## ⚠️ Подводные камни

- Дубликаты чисел работают правильно именно потому, что проверка идёт **до** записи текущего элемента.
- Если решения нет — возвращаем \`[]\` (или \`null\`). По условию оно обычно гарантировано.
- Отрицательные числа и ноль работают без изменений — арифметика та же.

## 🎯 Запомни

- Ключевой приём: искать \`target - x\` в хеш-таблице за один проход.
- \`Map\` даёт O(1) на поиск и запись → общая сложность O(n).
- Проверяй дополнение **до** добавления текущего элемента.
- Если массив отсортирован — можно два указателя: O(n) времени и O(1) памяти.`,
      en: `## 🧩 In plain words

The Two Sum task: given a list of numbers and a target, find two numbers that add up to the target and return their **indices** (positions). The naive way is to try every pair, but that's slow. The trick: as we walk the array once, we jot down everything we've already seen in a notebook, and for each number we ask "have I already met the partner I need?".

### The single-pass idea

For a number \`x\`, its "partner" is \`target - x\` (the complement). For example, if the target is 9 and \`x = 2\`, we need a 7. We scan the array left to right, and at each step:

1. compute the complement \`target - nums[i]\`;
2. if it's **already** in our notebook (\`Map\`), we found the pair — return the two indices;
3. if not, record the current number and its index in the notebook and move on.

A \`Map\` is a "key → value" dictionary; here the key is the number and the value is its index. Its \`has\` and \`set\` operations run in O(1).

\`\`\`js
function twoSum(nums, target) {
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

// twoSum([2, 7, 11, 15], 9); // [0, 1]
\`\`\`

### Why it's O(n)

We pass the array exactly once, and every \`Map\` operation per step is O(1). That's **O(n)** time and **O(n)** memory for the notebook. The naive all-pairs scan would be O(n²).

### The subtlety of write order

Notice we **check** the complement first and only then put the current number into the \`Map\`. This guarantees we never reuse the same element twice — at the moment we check the current element, it isn't in the notebook yet.

## ⚠️ Common pitfalls

- Duplicate numbers work correctly precisely because the check happens **before** writing the current element.
- If there's no solution, return \`[]\` (or \`null\`). The prompt usually guarantees one exists.
- Negative numbers and zero work unchanged — the arithmetic is the same.

## 🎯 Key takeaways

- The core move: look up \`target - x\` in a hash map in a single pass.
- A \`Map\` gives O(1) lookup and insert → overall O(n).
- Check the complement **before** adding the current element.
- If the array is sorted, two pointers work: O(n) time, O(1) memory.`
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
      ru: `## 🧩 Простыми словами

Задача Valid Parentheses: дана строка из скобок \`()[]{}\`, и надо понять, правильно ли они закрыты. Правильно — это когда каждая открытая скобка закрывается **своей парной** и в **правильном порядке**, как матрёшки: последняя открытая закрывается первой. \`"([{}])"\` — верно, \`"(]"\` — нет. Инструмент для такой проверки — **стек**.

### Что такое стек

Стек — это стопка тарелок: кладёшь сверху (\`push\`) и снимаешь только верхнюю (\`pop\`). Принцип «последним вошёл — первым вышел» (LIFO). Именно так и устроена вложенность скобок: самая свежая открытая скобка должна закрыться первой.

### Как решаем

Идём по строке символ за символом:

- встретили **открывающую** скобку — кладём в стек её **ожидаемую закрывающую** пару (для \`(\` кладём \`)\`);
- встретили **закрывающую** — снимаем верх стека (\`pop\`) и сверяем: если он не совпал с текущим символом, значит порядок нарушен → сразу \`false\`.

В конце стек должен быть **пуст**. Если там что-то осталось — были открытые скобки без пары → \`false\`.

\`\`\`js
function isValid(s) {
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
// isValid('(]');     // false
\`\`\`

Хитрость кода: в стек кладётся не сама открывающая скобка, а её ожидаемая закрывающая — тогда сравнение с текущим закрывающим символом становится прямым \`===\`. Если \`pop\` на пустом стеке — вернётся \`undefined\`, что тоже не совпадёт с \`ch\`, и функция честно вернёт \`false\`.

### Сложность

**O(n)** по времени (один проход) и **O(n)** памяти в худшем случае — когда вся строка состоит из открывающих скобок и все они лежат в стеке.

## ⚠️ Подводные камни

- Закрывающая скобка при пустом стеке ⇒ \`false\` (в коде это \`pop()\` → \`undefined !== ch\`).
- Непустой стек в конце ⇒ \`false\`: остались незакрытые скобки.
- Посторонние символы: договорись с интервьюером — игнорировать их или считать строку невалидной. В коде выше они просто игнорируются.

## 🎯 Запомни

- Скобки = вложенность = **стек** (LIFO).
- Кладём в стек ожидаемую закрывающую пару — тогда сверка это простой \`===\`.
- Ответ \`true\` только если по пути ничего не разошлось **и** стек в конце пуст.
- Всё за один проход: O(n) времени.`,
      en: `## 🧩 In plain words

The Valid Parentheses task: given a string of brackets \`()[]{}\`, decide whether they're closed correctly. Correct means every opener is closed by **its matching pair** in the **right order**, like nesting dolls: the last one opened is the first one closed. \`"([{}])"\` is valid, \`"(]"\` is not. The tool for this check is a **stack**.

### What a stack is

A stack is a pile of plates: you add on top (\`push\`) and remove only the top plate (\`pop\`). "Last in, first out" (LIFO). That's exactly how bracket nesting works: the most recently opened bracket must close first.

### How we solve it

Walk the string character by character:

- on an **opening** bracket, push its **expected closing** pair onto the stack (for \`(\` push \`)\`);
- on a **closing** bracket, pop the top of the stack and compare: if it doesn't match the current character, the order is broken → return \`false\` immediately.

At the end the stack must be **empty**. If something remains, there were openers without a match → \`false\`.

\`\`\`js
function isValid(s) {
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
// isValid('(]');     // false
\`\`\`

The code trick: we push not the opener itself but its expected closer, so comparing against the current closing character is a direct \`===\`. If we \`pop\` an empty stack we get \`undefined\`, which also won't equal \`ch\`, and the function honestly returns \`false\`.

### Complexity

**O(n)** time (one pass) and **O(n)** memory in the worst case — when the whole string is openers and they all sit on the stack.

## ⚠️ Common pitfalls

- A closer with an empty stack ⇒ \`false\` (in the code this is \`pop()\` → \`undefined !== ch\`).
- A non-empty stack at the end ⇒ \`false\`: unclosed openers remain.
- Foreign characters: agree with the interviewer whether to ignore them or treat the string as invalid. The code above simply ignores them.

## 🎯 Key takeaways

- Brackets = nesting = **stack** (LIFO).
- Push the expected closer onto the stack so matching is a simple \`===\`.
- Return \`true\` only if nothing mismatched along the way **and** the stack is empty at the end.
- All in a single pass: O(n) time.`
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
      ru: `## 🧩 Простыми словами

Typeahead (автодополнение) — это подсказки, которые всплывают, пока ты печатаешь в поисковой строке. Проблема в том, что на **каждую** нажатую букву делать запрос к серверу — расточительно, а ответы могут прийти вперемешку: медленный ответ на «ко» может прилететь позже быстрого ответа на «кот» и затереть правильные подсказки старыми. Наша задача — сделать это аккуратно.

### Три проблемы и их решения

**1. Слишком много запросов → дебаунс.** Дебаунс (debounce) — это «подожди, пока человек перестанет печатать». Мы ставим таймер (~300 мс) и, если пришла новая буква раньше, сбрасываем старый таймер. Запрос уходит только когда пользователь сделал паузу.

**2. Гонка ответов (race condition) → отмена.** Даже с дебаунсом два запроса могут «разъехаться»: ответ на старый запрос придёт позже нового. Лечим двумя приёмами:

- \`AbortController\` — «пульт отмены» для fetch. Создаём его, передаём \`controller.signal\` в запрос, и при новом вводе вызываем \`controller.abort()\` — старый сетевой запрос прерывается.
- Номер запроса (\`seq\`) — каждому запросу выдаём порядковый номер и рисуем результат, только если этот номер всё ещё самый свежий (\`current === seq\`). Это страховка на случай, если отмена не сработала мгновенно.

**3. Отрисовка → только последний актуальный ответ.**

\`\`\`js
function createTypeahead(fetchResults, render, wait = 300) {
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
        if (current === seq) render(results); // игнорируем устаревший
      } catch (err) {
        if (err.name !== 'AbortError') render([], err);
      }
    }, wait);
  };
}
\`\`\`

### Разбор кода по шагам

На каждый ввод: сбрасываем прошлый таймер (\`clearTimeout\`) и отменяем прошлый запрос (\`abort\`). Если строка пустая — рисуем пустой список и выходим. Иначе ставим таймер: когда он сработает, создаём свежий \`AbortController\`, увеличиваем счётчик \`seq\`, делаем запрос и рисуем результат только если наш \`current\` всё ещё равен \`seq\` (то есть более нового запроса не появилось).

### Сложность

**O(1)** на каждое нажатие клавиши (лёгкая работа с таймером и счётчиком) плюс собственно сетевой запрос.

## ⚠️ Подводные камни

- Пустой ввод ⇒ отменить запрос и очистить список, а не слать запрос с пустой строкой.
- \`AbortError\` — это **не** настоящая ошибка, а ожидаемая отмена. Её нужно ловить и молча игнорировать, не показывая пользователю.
- Опционально можно кешировать одинаковые запросы, чтобы не бить по сети дважды за тем же ответом.

## 🎯 Запомни

- Дебаунс убирает лишние запросы, но **сам по себе не спасает от гонки**.
- От гонки спасают отмена (\`AbortController\`) и/или проверка «мой ли ответ самый свежий» (\`seq\`).
- Рисуем только последний актуальный ответ; \`AbortError\` глотаем молча.`,
      en: `## 🧩 In plain words

A typeahead (autocomplete) is the list of suggestions that pops up as you type in a search box. The catch is that firing a server request on **every** keystroke is wasteful, and responses can arrive out of order: a slow reply for "ca" might land after a fast reply for "cat" and overwrite the correct suggestions with stale ones. Our job is to do this cleanly.

### Three problems and their fixes

**1. Too many requests → debounce.** Debounce means "wait until the person stops typing." We set a timer (~300 ms) and reset it if another keystroke arrives sooner. The request goes out only when the user pauses.

**2. Response race (race condition) → cancellation.** Even with debounce, two requests can drift apart: the reply to an older request may arrive after a newer one. We fix this two ways:

- \`AbortController\` — a "cancel remote" for fetch. We create one, pass \`controller.signal\` into the request, and on new input call \`controller.abort()\` — the old network request is aborted.
- A request number (\`seq\`) — every request gets a sequence number, and we render its result only if that number is still the freshest (\`current === seq\`). This is a safety net in case cancellation isn't instantaneous.

**3. Rendering → only the latest valid response.**

\`\`\`js
function createTypeahead(fetchResults, render, wait = 300) {
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
}
\`\`\`

### Walking through the code

On each input: clear the previous timer (\`clearTimeout\`) and abort the previous request (\`abort\`). If the string is empty, render an empty list and return. Otherwise set a timer: when it fires, create a fresh \`AbortController\`, bump the \`seq\` counter, make the request, and render the result only if our \`current\` still equals \`seq\` (i.e. no newer request appeared).

### Complexity

**O(1)** per keystroke (light work with a timer and a counter) plus the network call itself.

## ⚠️ Common pitfalls

- Empty input ⇒ cancel the request and clear the list rather than sending a request for an empty string.
- \`AbortError\` is **not** a real error but an expected cancellation. Catch it and silently ignore it — don't surface it to the user.
- Optionally cache identical queries so you don't hit the network twice for the same answer.

## 🎯 Key takeaways

- Debounce removes excess requests but **on its own does not prevent races**.
- Races are handled by cancellation (\`AbortController\`) and/or an "is my response the freshest?" check (\`seq\`).
- Render only the latest valid response; swallow \`AbortError\` silently.`
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
      ru: `## 🧩 Простыми словами

LRU-кэш — это ящик ограниченного размера, куда мы складываем пары «ключ → значение». Когда ящик переполнен, мы выбрасываем ту вещь, которой не пользовались дольше всего (LRU = Least Recently Used, «наименее недавно использованный»). Представьте стопку бумаг на столе: как только вы берёте бумагу в руки, вы кладёте её сверху; когда места нет — выкидываете самую нижнюю, до которой давно не дотягивались.

### Почему именно Map

\`Map\` в JavaScript — это структура «ключ → значение», которая **запоминает порядок вставки ключей**. Это ключевое свойство: первый добавленный ключ будет первым при переборе, последний — последним. Значит, «самый старый» элемент всегда лежит в начале, а «самый свежий» — в конце.

Мы используем этот порядок как отметку о свежести:

- «Использовать» ключ = удалить его и вставить заново. После этого он оказывается в конце — становится самым свежим.
- Самый старый ключ = первый в переборе: \`map.keys().next().value\`. Именно его мы выбрасываем при переполнении.

Классическое «учебниковое» решение — двусвязный список плюс хеш-таблица. \`Map\` даёт ту же скорость O(1), но кода в разы меньше.

### Как работает get

\`\`\`js
get(key) {
  if (!this.map.has(key)) return undefined;
  const value = this.map.get(key);
  this.map.delete(key);
  this.map.set(key, value); // помечаем как самый свежий
  return value;
}
\`\`\`

Если ключа нет — сразу возвращаем \`undefined\`. Если есть — забираем значение, удаляем ключ и тут же вставляем обратно. Удаление плюс повторная вставка «поднимают» ключ в конец Map, то есть освежают его.

### Как работает put

\`\`\`js
put(key, value) {
  if (this.map.has(key)) this.map.delete(key);
  this.map.set(key, value);
  if (this.map.size > this.capacity) {
    const oldest = this.map.keys().next().value;
    this.map.delete(oldest);
  }
}
\`\`\`

Если ключ уже был — удаляем его, чтобы при повторной вставке он попал в конец (обновился и освежился). Затем вставляем. Если после этого размер превысил \`capacity\` — берём первый (самый старый) ключ и удаляем его.

### Почему это O(1)

\`capacity\` — это максимальное число элементов в кэше. Все операции Map — \`has\`, \`get\`, \`set\`, \`delete\` — работают за константное время, а не зависят от числа элементов. Получение первого ключа через \`keys().next()\` тоже мгновенно. Поэтому и \`get\`, и \`put\` — O(1) (амортизированно, то есть в среднем).

## ⚠️ Подводные камни

- \`get\` несуществующего ключа возвращает \`-1\` или \`undefined\` (по контракту задачи) и **не** должен менять порядок.
- \`put\` существующего ключа обязан и обновить значение, и освежить элемент — иначе старое значение вытеснится не вовремя.
- \`capacity = 0\` — крайний случай: кэш не должен хранить ничего.
- Если забыть \`delete\` перед \`set\` для существующего ключа, порядок не обновится и вытеснится не тот элемент.

## 🎯 Запомни

- LRU выбрасывает элемент, к которому дольше всего не обращались.
- \`Map\` хранит ключи в порядке вставки — это бесплатно даёт нам «очередь свежести».
- «Использовать» = \`delete\` + \`set\`, чтобы поднять ключ в конец; самый старый ключ — \`map.keys().next().value\`.
- Все операции O(1); Map лучше объекта из-за гарантированного порядка и быстрого \`delete\`.`,
      en: `## 🧩 In plain words

An LRU cache is a fixed-size box where we store key → value pairs. When the box is full, we throw out the item nobody has touched for the longest time (LRU = Least Recently Used). Picture a pile of papers on your desk: whenever you pick one up you drop it back on top; when you run out of room you toss the bottom one you haven't reached for in ages.

### Why Map specifically

A JavaScript \`Map\` is a key → value structure that **remembers insertion order**. That's the crucial property: the first key you added comes first when iterating, the last one comes last. So the "oldest" entry always sits at the front and the "freshest" at the back.

We use that ordering as a freshness marker:

- To "use" a key = delete it and reinsert it. It then lands at the back — the freshest.
- The oldest key = the first one in iteration: \`map.keys().next().value\`. That's what we evict on overflow.

The textbook answer is a doubly linked list plus a hash map. A \`Map\` gives the same O(1) speed with far less code.

### How get works

\`\`\`js
get(key) {
  if (!this.map.has(key)) return undefined;
  const value = this.map.get(key);
  this.map.delete(key);
  this.map.set(key, value); // mark as most recently used
  return value;
}
\`\`\`

If the key is missing, return \`undefined\` immediately. If it exists, grab the value, delete the key, and reinsert it. Delete-then-reinsert bumps the key to the back of the Map, refreshing it.

### How put works

\`\`\`js
put(key, value) {
  if (this.map.has(key)) this.map.delete(key);
  this.map.set(key, value);
  if (this.map.size > this.capacity) {
    const oldest = this.map.keys().next().value;
    this.map.delete(oldest);
  }
}
\`\`\`

If the key already existed, delete it so the reinsert puts it at the back (updated and refreshed). Then insert. If the size now exceeds \`capacity\`, take the first (oldest) key and delete it.

### Why this is O(1)

\`capacity\` is the max number of entries the cache holds. Every Map operation — \`has\`, \`get\`, \`set\`, \`delete\` — runs in constant time, independent of how many entries there are. Reading the first key via \`keys().next()\` is instant too. So both \`get\` and \`put\` are O(1) (amortized, i.e. on average).

## ⚠️ Common pitfalls

- \`get\` of a missing key returns \`-1\` or \`undefined\` (per the task's contract) and must **not** change order.
- \`put\` of an existing key must both update the value and refresh the entry — otherwise the stale value gets evicted at the wrong moment.
- \`capacity = 0\` is an edge case: the cache should store nothing.
- Forgetting to \`delete\` before \`set\` for an existing key leaves the order stale and evicts the wrong entry.

## 🎯 Key takeaways

- LRU evicts the entry that hasn't been accessed for the longest time.
- \`Map\` keeps keys in insertion order — that gives us a "freshness queue" for free.
- "Use" = \`delete\` + \`set\` to bump a key to the back; the oldest key is \`map.keys().next().value\`.
- All operations are O(1); Map beats a plain object thanks to guaranteed order and fast \`delete\`.`
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
      ru: `## 🧩 Простыми словами

Числа Фибоначчи — это ряд, где каждое следующее число равно сумме двух предыдущих: 0, 1, 1, 2, 3, 5, 8, 13… Задача — вычислить n-е число тремя способами и понять, почему один способ ужасно медленный, а другой мгновенный. Главный урок здесь — не про Фибоначчи, а про то, как **повторные вычисления одного и того же** убивают производительность и как это чинится.

### Способ 1: наивная рекурсия

Пишем определение «в лоб»: \`fib(n) = fib(n-1) + fib(n-2)\`. Рекурсия — это функция, которая вызывает саму себя.

\`\`\`js
function fibNaive(n) {
  if (n < 2) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}
\`\`\`

Проблема: чтобы посчитать \`fib(5)\`, мы считаем \`fib(4)\` и \`fib(3)\`. Но внутри \`fib(4)\` снова считается \`fib(3)\` — с нуля, заново. И так далее: дерево вызовов раздувается, одни и те же подзадачи считаются множество раз. Это даёт **экспоненциальную** сложность O(2ⁿ) — при n=40 уже миллиарды вызовов.

### Способ 2: рекурсия с мемоизацией

Мемоизация — это запоминание уже посчитанных результатов, чтобы не считать их дважды. Заводим кэш (\`Map\`) и перед вычислением проверяем: не считали ли мы это число раньше.

\`\`\`js
function fibMemo(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}
\`\`\`

Теперь каждое число считается ровно один раз. Время падает до O(n). Память — тоже O(n): и на кэш, и на стек вызовов (цепочку вложенных вызовов функции).

### Способ 3: итеративно, O(1) по памяти

Заметим: чтобы получить следующее число, нужны только два последних. Значит, не нужен ни кэш, ни рекурсия — храним всего две переменные и идём в цикле снизу вверх.

\`\`\`js
function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}
\`\`\`

Строка \`[a, b] = [b, a + b]\` одновременно сдвигает пару: новое \`a\` = старое \`b\`, новое \`b\` = их сумма. Время O(n), памяти всего O(1) (константа — две переменные независимо от n). Это оптимально по памяти.

### Сравнение сложности

- Наивно: O(2ⁿ) время — экспоненциально, непрактично.
- Мемо: O(n) время, O(n) память.
- Итеративно: O(n) время, O(1) память — лучший баланс.

## ⚠️ Подводные камни

- \`n = 0\` → 0, \`n = 1\` → 1 (базовые случаи).
- Большие \`n\` (примерно >78) переполняют обычный \`Number\` и дают неточный результат — используйте \`BigInt\`.
- Отрицательный \`n\` не определён этим кодом — уточните контракт у интервьюера.

## 🎯 Запомни

- Наивная рекурсия экспоненциальна, потому что пересчитывает одни и те же подзадачи.
- Мемоизация убирает дубли: O(2ⁿ) → O(n).
- Итеративная версия хранит только два последних числа — O(n) время, O(1) память.
- Побить O(n) можно: матричное возведение в степень или формула Бине дают O(log n).`,
      en: `## 🧩 In plain words

Fibonacci numbers are a sequence where each number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, 13… The task is to compute the n-th number three ways and understand why one way is horribly slow and another is instant. The real lesson isn't about Fibonacci — it's about how **repeating the same computation** destroys performance, and how to fix it.

### Approach 1: naive recursion

Write the definition literally: \`fib(n) = fib(n-1) + fib(n-2)\`. Recursion is a function that calls itself.

\`\`\`js
function fibNaive(n) {
  if (n < 2) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}
\`\`\`

The problem: to compute \`fib(5)\` we compute \`fib(4)\` and \`fib(3)\`. But inside \`fib(4)\` we compute \`fib(3)\` again — from scratch. And so on: the call tree balloons and the same subproblems get recomputed over and over. That's **exponential** O(2ⁿ) — at n=40 it's already billions of calls.

### Approach 2: memoized recursion

Memoization means remembering results you've already computed so you never compute them twice. Keep a cache (a \`Map\`) and, before computing, check whether we've seen this number before.

\`\`\`js
function fibMemo(n, memo = new Map()) {
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, value);
  return value;
}
\`\`\`

Now each number is computed exactly once. Time drops to O(n). Memory is also O(n): both the cache and the call stack (the chain of nested function calls).

### Approach 3: iterative, O(1) space

Notice: to get the next number you only need the last two. So you need no cache and no recursion — keep just two variables and loop from the bottom up.

\`\`\`js
function fib(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}
\`\`\`

The line \`[a, b] = [b, a + b]\` shifts the pair at once: new \`a\` = old \`b\`, new \`b\` = their sum. Time is O(n), memory just O(1) (a constant two variables regardless of n). This is optimal in space.

### Complexity comparison

- Naive: O(2ⁿ) time — exponential, impractical.
- Memoized: O(n) time, O(n) memory.
- Iterative: O(n) time, O(1) memory — the best balance.

## ⚠️ Common pitfalls

- \`n = 0\` → 0, \`n = 1\` → 1 (base cases).
- Large \`n\` (roughly >78) overflows a plain \`Number\` and gives inexact results — use \`BigInt\`.
- Negative \`n\` isn't defined by this code — clarify the contract with your interviewer.

## 🎯 Key takeaways

- Naive recursion is exponential because it recomputes the same subproblems.
- Memoization removes the duplicates: O(2ⁿ) → O(n).
- The iterative version keeps only the last two numbers — O(n) time, O(1) memory.
- You can beat O(n): matrix exponentiation or Binet's formula give O(log n).`
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
      ru: `## 🧩 Простыми словами

Анаграммы — это слова из одних и тех же букв, только переставленных: «eat», «tea» и «ate» — анаграммы. Задача: сгруппировать вместе все слова, которые являются анаграммами друг друга. Идея-ключ: у всех анаграмм одной группы есть общий «отпечаток пальца», и если мы научимся его вычислять, то просто разложим слова по кучкам с одинаковым отпечатком.

### Канонический ключ

Нам нужен **канонический ключ** — одинаковая строка-подпись для всех анаграмм. Самый простой ключ — буквы слова, отсортированные по алфавиту. У «eat», «tea», «ate» отсортированные буквы дают одно и то же: \`"aet"\`. У «bat» — \`"abt"\`, другой ключ.

Дальше используем \`Map\` (структуру «ключ → значение»), где ключ — эта подпись, а значение — список слов с такой подписью.

\`\`\`js
function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}
\`\`\`

Разбор по строкам: \`[...word]\` разбивает слово на массив букв, \`.sort()\` сортирует их, \`.join('')\` склеивает обратно в строку-ключ. Если такого ключа ещё нет — заводим пустой список. Затем добавляем слово в список его ключа. В конце возвращаем все списки (\`groups.values()\`).

### Сложность

Пусть n — число слов, k — длина слова. Для каждого слова мы сортируем буквы за O(k log k). Итого O(n · k log k). Сортировка — самая дорогая часть.

Можно ускорить до O(n · k), если вместо сортировки строить ключ из **подсчёта частот букв** — массив из 26 счётчиков (по одному на букву латинского алфавита), превращённый в строку. Подсчёт — это O(k), без логарифма.

## ⚠️ Подводные камни

- Регистр и пробелы: «Eat» и «eat» — анаграммы? Уточните, нужно ли нормализовать (привести к нижнему регистру, убрать пробелы).
- Юникод и несколько алфавитов: ключ на 26 счётчиков не подойдёт — используйте сортировку или \`Map\` частот по реальным символам.
- Пустые строки имеют пустой ключ и группируются вместе — это корректно, но стоит помнить.

## 🎯 Запомни

- Анаграммы у всех имеют один канонический ключ; группируем по нему.
- Простейший ключ — отсортированные буквы слова.
- Сортировка даёт O(n · k log k); частотный ключ (26 счётчиков) снижает до O(n · k).
- Для Unicode: \`String.prototype.normalize\` плюс частотный объект вместо массива на 26.`,
      en: `## 🧩 In plain words

Anagrams are words made of the exact same letters, just rearranged: "eat", "tea", and "ate" are anagrams. The task: group together all words that are anagrams of each other. The key idea: every anagram in a group shares a common "fingerprint", and if we can compute that fingerprint, we just sort words into piles that share it.

### The canonical key

We need a **canonical key** — the same signature string for all anagrams. The simplest key is the word's letters sorted alphabetically. For "eat", "tea", "ate" the sorted letters all give the same thing: \`"aet"\`. For "bat" it's \`"abt"\` — a different key.

Then we use a \`Map\` (a key → value structure) where the key is that signature and the value is the list of words with that signature.

\`\`\`js
function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}
\`\`\`

Line by line: \`[...word]\` splits the word into an array of letters, \`.sort()\` sorts them, \`.join('')\` glues them back into a key string. If that key doesn't exist yet, start an empty list. Then push the word into its key's list. Finally return all the lists (\`groups.values()\`).

### Complexity

Let n be the number of words and k the word length. For each word we sort its letters in O(k log k). That's O(n · k log k) overall — sorting is the expensive part.

You can speed it up to O(n · k) by building the key from a **letter-frequency count** instead of sorting — a 26-slot array (one slot per Latin letter) turned into a string. Counting is O(k), with no log factor.

## ⚠️ Common pitfalls

- Case and spaces: are "Eat" and "eat" anagrams? Clarify whether to normalize (lowercase, strip spaces).
- Unicode and multiple alphabets: a 26-slot key won't work — use sorting or a frequency \`Map\` over the actual characters.
- Empty strings have an empty key and group together — correct, but worth remembering.

## 🎯 Key takeaways

- All anagrams share one canonical key; group by it.
- The simplest key is the word's sorted letters.
- Sorting gives O(n · k log k); a frequency key (26 counts) drops it to O(n · k).
- For Unicode: \`String.prototype.normalize\` plus a frequency object instead of a 26-slot array.`
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
      ru: `## 🧩 Простыми словами

Задача: в массиве чисел (положительных и отрицательных) найти непрерывный кусок с максимальной суммой. Например, в \`[-2,1,-3,4,-1,2,1,-5,4]\` лучший кусок — \`[4,-1,2,1]\` с суммой 6. Алгоритм Кадане решает это за один проход с простой идеей: **если то, что мы накопили, стало тянуть нас в минус — выгоднее начать заново отсюда**.

### Алгоритм Кадане

Идём по массиву и в каждой точке задаём один вопрос: продолжить текущий подмассив, добавив к нему число, или начать новый подмассив прямо с этого числа? Ответ — что даёт больше:

\`current = max(x, current + x)\`

Здесь \`current\` — лучшая сумма подмассива, заканчивающегося прямо на текущем элементе. Параллельно храним \`best\` — лучшую сумму, которую видели вообще.

\`\`\`js
function maxSubArray(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}

// maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6
\`\`\`

Интуиция сброса: если накопленная сумма \`current\` ушла в минус, она будет только уменьшать всё, что мы прибавим дальше. Поэтому выгоднее «выбросить» этот хвост и начать новый подмассив с текущего элемента. Строка \`Math.max(nums[i], current + nums[i])\` именно это и делает: если \`current + nums[i]\` хуже, чем просто \`nums[i]\`, значит прошлое мешает — стартуем заново.

### Сложность

Один проход по массиву, на каждом шаге — пара сравнений. Время O(n), память O(1) (храним всего две переменные). Быстрее по времени для этой задачи не бывает — надо хотя бы раз посмотреть на каждый элемент.

## ⚠️ Подводные камни

- Все числа отрицательные: ответ — наибольший одиночный элемент (например, \`-1\`), а не 0. Поэтому инициализируйте \`best\` **первым элементом**, а не нулём — иначе получите неверный 0.
- Массив из одного элемента: ответ — он сам.
- Пустой массив: \`nums[0]\` будет \`undefined\` — уточните, гарантирован ли непустой ввод.
- Если нужно вернуть и сами границы подмассива — храните индекс начала (обновляйте при сбросе) и индекс конца (при обновлении \`best\`).

## 🎯 Запомни

- Кадане: на каждом шаге \`current = max(x, current + x)\`, попутно обновляем \`best\`.
- Отрицательный накопленный хвост сбрасываем — он только вредит будущему.
- O(n) время, O(1) память, один проход.
- Инициализируй \`best\` первым элементом, иначе случай «все отрицательные» сломается.`,
      en: `## 🧩 In plain words

The task: in an array of numbers (positive and negative), find the contiguous chunk with the largest sum. For example, in \`[-2,1,-3,4,-1,2,1,-5,4]\` the best chunk is \`[4,-1,2,1]\` with sum 6. Kadane's algorithm solves this in a single pass with one simple idea: **if what you've accumulated has started dragging you into the negative, it's better to start fresh right here**.

### Kadane's algorithm

Walk through the array and at each point ask one question: extend the current subarray by adding this number, or start a new subarray at this number? The answer is whichever gives more:

\`current = max(x, current + x)\`

Here \`current\` is the best sum of a subarray ending exactly at the current element. Alongside it we keep \`best\` — the largest sum we've seen anywhere.

\`\`\`js
function maxSubArray(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}

// maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6
\`\`\`

The reset intuition: once the running sum \`current\` goes negative, it can only shrink whatever we add next. So it pays to drop that tail and start a new subarray at the current element. The line \`Math.max(nums[i], current + nums[i])\` does exactly that: if \`current + nums[i]\` is worse than just \`nums[i]\`, the past is hurting us — start over.

### Complexity

A single pass over the array, with a couple of comparisons per step. Time O(n), memory O(1) (just two variables). You can't beat O(n) for this problem — you must look at every element at least once.

## ⚠️ Common pitfalls

- All negatives: the answer is the largest single element (e.g. \`-1\`), not 0. So initialize \`best\` with the **first element**, not zero — otherwise you'd wrongly return 0.
- A single-element array: the answer is that element.
- An empty array: \`nums[0]\` is \`undefined\` — clarify whether the input is guaranteed non-empty.
- If you also need the subarray bounds — track the start index (update on reset) and the end index (on a \`best\` update).

## 🎯 Key takeaways

- Kadane: at each step \`current = max(x, current + x)\`, updating \`best\` along the way.
- Reset a negative running tail — it only harms the future.
- O(n) time, O(1) memory, single pass.
- Initialize \`best\` with the first element, or the "all negatives" case breaks.`
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
      ru: `## 🧩 Простыми словами

Представь, что ищешь слово в бумажном словаре. Ты не листаешь по одной странице — ты открываешь середину, смотришь, в какой половине нужное слово, и выбрасываешь вторую половину. Потом повторяешь. Так за считанные шаги находишь нужное. Это и есть **бинарный поиск**: он работает только по _отсортированным_ данным и на каждом шаге выбрасывает половину массива.

### Обычный бинарный поиск

Держим два «указателя»-границы: \`lo\` (низ) и \`hi\` (верх). Смотрим на элемент ровно посередине. Три исхода:

- нашли \`target\` — возвращаем индекс;
- элемент в середине _меньше_ цели — значит цель правее, двигаем \`lo = mid + 1\`;
- элемент _больше_ цели — цель левее, двигаем \`hi = mid - 1\`.

Повторяем, пока границы не сойдутся. Если так и не нашли — возвращаем \`-1\`.

\`\`\`ts
function binarySearch(arr, target) {
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
\`\`\`

### Почему середина считается так странно

\`mid = lo + ((hi - lo) >> 1)\` — это тот же \`(lo + hi) / 2\`, только безопаснее. \`>> 1\` — это «битовый сдвиг вправо», то есть деление на 2 с отбрасыванием дробной части. Мы сначала берём _разницу_ \`hi - lo\`, а не сумму \`lo + hi\`, чтобы избежать **переполнения** — ситуации, когда сумма двух больших чисел не влезает в тип. В JavaScript это почти не грозит, но привычка полезна и обязательна в языках вроде Java/C++.

### Нижняя граница (lower bound)

Иногда нужен не сам элемент, а _первая позиция_, куда его можно вставить, сохранив порядок — то есть первый индекс, где \`элемент >= target\`. Это называется **lower bound** (нижняя граница). Логика меняется: если \`arr[mid] >= target\`, мы _не останавливаемся_, а запоминаем это место как кандидата (\`hi = mid\`) и продолжаем искать левее; иначе \`lo = mid + 1\`.

\`\`\`ts
function lowerBound(arr, target) {
  let lo = 0;
  let hi = arr.length; // граница исключающая (за последним элементом)
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
\`\`\`

### Почему форма цикла так важна

Обрати внимание: в обычном поиске \`while (lo <= hi)\` и \`hi = mid - 1\`, а в lower bound \`while (lo < hi)\` и \`hi = mid\` (без \`-1\`). Это не случайность — это следствие того, какой **инвариант** (неизменное правило) ты держишь.

- В классике \`hi\` — включающая граница (может указывать на ответ), поэтому \`<=\` и \`mid - 1\`.
- В lower bound \`hi\` — исключающая граница (за пределами кандидатов), поэтому \`<\` и \`mid\` без вычитания.

Если смешать эти формы, получишь либо **зацикливание** (границы перестают сходиться), либо **off-by-one** — промах на единицу. Поэтому: сначала выбери инвариант, а форма цикла вытекает из него.

### Сложность

O(log n) по времени (каждый шаг делит массив пополам), O(1) по памяти (лишних структур не заводим).

## ⚠️ Подводные камни

- Пустой массив должен корректно давать \`-1\` (в классике цикл просто не выполнится).
- Дубликаты: обычный поиск вернёт _любое_ совпадение; для «первого» или «последнего» нужны lower/upper bound.
- Off-by-one — самая частая ошибка. Не «угадывай» \`<=\` vs \`<\` — выводи их из инварианта.
- \`mid = (lo + hi) / 2\` теоретически опасно переполнением в языках с фиксированным int.

## 🎯 Запомни

- Бинарный поиск делит диапазон пополам за шаг → O(log n), но требует отсортированный массив.
- Считай середину как \`lo + ((hi - lo) >> 1)\`, чтобы избежать переполнения.
- Lower bound = первая позиция, где \`>= target\`; это же и «точка вставки».
- Форма цикла (\`<=\`/\`<\`, \`mid\`/\`mid-1\`) диктуется инвариантом — не подбирай наугад.`,
      en: `## 🧩 In plain words

Imagine looking up a word in a paper dictionary. You don't flip one page at a time — you open to the middle, see which half your word is in, and throw the other half away. Then you repeat. You find the word in just a few steps. That's **binary search**: it works only on _sorted_ data, and each step discards half of the array.

### Plain binary search

Keep two boundary pointers: \`lo\` (bottom) and \`hi\` (top). Look at the element exactly in the middle. Three outcomes:

- found \`target\` — return the index;
- the middle element is _smaller_ than the target — the target is to the right, so move \`lo = mid + 1\`;
- the middle element is _larger_ — the target is to the left, so move \`hi = mid - 1\`.

Repeat until the boundaries meet. If we never find it, return \`-1\`.

\`\`\`ts
function binarySearch(arr, target) {
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
\`\`\`

### Why the midpoint is computed so oddly

\`mid = lo + ((hi - lo) >> 1)\` is the same as \`(lo + hi) / 2\`, just safer. \`>> 1\` is a "right bit shift", i.e. divide by 2 and drop the fraction. We take the _difference_ \`hi - lo\` instead of the sum \`lo + hi\` to avoid **overflow** — when the sum of two large numbers doesn't fit in the number type. In JavaScript this is rarely an issue, but the habit is valuable and mandatory in languages like Java/C++.

### Lower bound

Sometimes you don't want the element itself but the _first position_ where it could be inserted while keeping the array sorted — the first index where \`element >= target\`. This is the **lower bound**. The logic shifts: if \`arr[mid] >= target\`, we _don't stop_ — we remember this spot as a candidate (\`hi = mid\`) and keep searching to the left; otherwise \`lo = mid + 1\`.

\`\`\`ts
function lowerBound(arr, target) {
  let lo = 0;
  let hi = arr.length; // exclusive (one past the last element)
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (arr[mid] >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
\`\`\`

### Why the loop shape matters

Notice: plain search uses \`while (lo <= hi)\` with \`hi = mid - 1\`, while lower bound uses \`while (lo < hi)\` with \`hi = mid\` (no \`-1\`). That's not arbitrary — it follows from which **invariant** (unchanging rule) you maintain.

- In the classic form \`hi\` is an _inclusive_ boundary (it may point at the answer), so \`<=\` and \`mid - 1\`.
- In lower bound \`hi\` is an _exclusive_ boundary (past the candidates), so \`<\` and \`mid\` without subtracting.

Mix these forms and you get either an **infinite loop** (the boundaries stop converging) or an **off-by-one** miss. So: pick the invariant first, and the loop shape falls out of it.

### Complexity

O(log n) time (each step halves the array), O(1) memory (no extra structures).

## ⚠️ Common pitfalls

- An empty array must return \`-1\` cleanly (in the classic form the loop simply never runs).
- Duplicates: plain search returns _any_ match; for "first" or "last" you need lower/upper bound.
- Off-by-one is the most common bug. Don't guess \`<=\` vs \`<\` — derive them from the invariant.
- \`mid = (lo + hi) / 2\` is theoretically risky due to overflow in fixed-int languages.

## 🎯 Key takeaways

- Binary search halves the range each step → O(log n), but needs a sorted array.
- Compute the midpoint as \`lo + ((hi - lo) >> 1)\` to avoid overflow.
- Lower bound = the first position where \`>= target\`; also the "insertion point".
- The loop shape (\`<=\`/\`<\`, \`mid\`/\`mid-1\`) is dictated by the invariant — don't guess it.`
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
      ru: `## 🧩 Простыми словами

Представь глубоко вложенные папки: \`Документы → Работа → Отчёт\`. «Сплющить» (flatten) объект — значит записать полный путь к каждому файлу одной строкой: \`Документы.Работа.Отчёт\`. Мы берём вложенный объект и превращаем его в плоский, где ключ — это весь путь через точку, а значение — то, что лежало в самой глубине. \`unflatten\` делает обратное: из плоских путей снова собирает вложенность.

### Как работает flattenObject

Идём по всем парам «ключ-значение». Для каждой смотрим на значение:

- если это **обычный объект** (не \`null\` и не массив) — спускаемся внутрь _рекурсивно_ (функция вызывает саму себя), дописывая к пути текущий ключ: \`prefix.key\`;
- если это **лист** (число, строка, \`null\`, массив) — записываем его в результат под накопленным путём.

Рекурсия — это когда функция решает задачу, вызывая себя на меньшей части. Здесь «меньшая часть» — вложенный объект.

\`\`\`ts
function flattenObject(obj, prefix = '', result = {}) {
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
\`\`\`

Для \`{ a: { b: 1, c: { d: 2 } } }\` получим \`{ "a.b": 1, "a.c.d": 2 }\`. Обрати внимание на \`typeof value === 'object' && !Array.isArray(value)\` — так мы спускаемся только в настоящие объекты, а \`null\` и массивы считаем листьями. (\`typeof null\` в JS даёт \`'object'\` — известная ловушка, поэтому есть отдельная проверка на \`null\`.)

### Как работает unflatten

Обратная операция: берём каждый плоский ключ, разбиваем его по точкам на части и по этим частям строим вложенность — как будто «раскладываем по полочкам» значение по пути.

\`\`\`ts
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
}
\`\`\`

\`node[k] ??= {}\` означает «если \`node[k]\` ещё нет (null/undefined) — создай пустой объект». Так мы шаг за шагом углубляемся, а на последнем ключе кладём само значение.

### Где это применяют

- **i18n-словари** (переводы): плоские ключи вроде \`home.title\` удобны для файлов переводов.
- **Параметры форм и query-строк**: вложенные данные разворачивают в плоские имена полей.
- **Конфиги и диффы**: сравнивать плоские объекты проще — сразу видно, какой путь изменился.

### Сложность

O(n), где n — число листьев: каждый лист посещаем один раз.

## ⚠️ Подводные камни

- Массивы: решить заранее — оставлять их как есть (лист) или индексировать (\`a.0.b\`). Уточни контракт у интервьюера.
- \`null\` — это лист, в него не спускаемся (иначе упадём, ведь у \`null\` нет свойств).
- Ключи, в которых уже есть точка, ломают обратимость: \`flatten\` и \`unflatten\` перестанут совпадать. Нужен другой разделитель или экранирование.

## 🎯 Запомни

- flatten = рекурсивно обойти объект, склеивая путь через точку; лист пишем в результат.
- unflatten = разбить ключ по точкам и восстановить вложенность (set по пути).
- Не спускайся в \`null\` и (обычно) в массивы — считай их листьями.
- Точки внутри ключей ломают round-trip — договорись о разделителе заранее.`,
      en: `## 🧩 In plain words

Think of deeply nested folders: \`Documents → Work → Report\`. "Flattening" an object means writing the full path to each file as a single string: \`Documents.Work.Report\`. We take a nested object and turn it into a flat one where the key is the whole dot-path and the value is whatever sat at the very bottom. \`unflatten\` does the reverse: it rebuilds the nesting from those flat paths.

### How flattenObject works

Walk every key-value pair. For each, look at the value:

- if it's a **plain object** (not \`null\`, not an array) — descend into it _recursively_ (the function calls itself), appending the current key to the path: \`prefix.key\`;
- if it's a **leaf** (number, string, \`null\`, array) — write it into the result under the accumulated path.

Recursion is when a function solves the problem by calling itself on a smaller part. Here the "smaller part" is the nested object.

\`\`\`ts
function flattenObject(obj, prefix = '', result = {}) {
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
\`\`\`

For \`{ a: { b: 1, c: { d: 2 } } }\` we get \`{ "a.b": 1, "a.c.d": 2 }\`. Note \`typeof value === 'object' && !Array.isArray(value)\` — this makes us descend only into real objects, treating \`null\` and arrays as leaves. (\`typeof null\` in JS returns \`'object'\` — a well-known trap, hence the separate \`null\` check.)

### How unflatten works

The inverse: take each flat key, split it by dots into parts, and rebuild the nesting from those parts — as if placing the value at its path, one drawer at a time.

\`\`\`ts
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
}
\`\`\`

\`node[k] ??= {}\` means "if \`node[k]\` doesn't exist yet (null/undefined), create an empty object". We dig deeper step by step and, on the last key, drop in the actual value.

### Where it's used

- **i18n dictionaries** (translations): flat keys like \`home.title\` are handy for translation files.
- **Form and query-string params**: nested data gets expanded into flat field names.
- **Configs and diffs**: comparing flat objects is easier — you instantly see which path changed.

### Complexity

O(n), where n is the number of leaves: each leaf is visited once.

## ⚠️ Common pitfalls

- Arrays: decide up front — keep them as-is (a leaf) or index them (\`a.0.b\`). Clarify the contract with the interviewer.
- \`null\` is a leaf; don't recurse into it (it has no properties, so you'd crash).
- Keys that already contain a dot break round-tripping: \`flatten\` and \`unflatten\` will disagree. Use a different separator or escaping.

## 🎯 Key takeaways

- flatten = recursively walk the object, joining the path with dots; write leaves into the result.
- unflatten = split the key by dots and rebuild the nesting (set by path).
- Don't recurse into \`null\` and (usually) arrays — treat them as leaves.
- Dots inside keys break the round-trip — agree on a separator beforehand.`
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
      ru: `## 🧩 Простыми словами

\`JSON.stringify\` — это функция, которая превращает объект в текст, чтобы отправить его по сети или сохранить. Наша задача — написать её упрощённую версию своими руками. По сути это переводчик: для каждого типа данных (строка, число, массив, объект…) он знает свой способ записать значение в виде текста. И, как у любого переводчика, есть хитрые случаи, где легко ошибиться.

### Основная идея — рекурсия по типам

Смотрим на тип значения и обрабатываем каждый по-своему. Если внутри массива или объекта лежат ещё объекты — функция вызывает сама себя для них (это **рекурсия**). Примитивы (число, строка, boolean, null) — базовые случаи, на которых рекурсия останавливается.

\`\`\`ts
function jsonStringify(value) {
  if (value === null) return 'null';

  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (type === 'boolean') return String(value);
  if (type === 'string') return JSON.stringify(value); // экранирование
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
}
\`\`\`

### Разбор по типам

- **null** → строка \`'null'\`.
- **Число** → само число как текст, но \`NaN\` и \`Infinity\` не имеют представления в JSON, поэтому → \`'null'\`. Проверяем это через \`Number.isFinite\`.
- **Boolean** → \`'true'\` / \`'false'\`.
- **Строка** → в кавычках и с _экранированием_ (спецсимволы вроде \`"\`, \`\\n\`, \`\\t\` нужно записать безопасно). Здесь мы честно переиспользуем нативный \`JSON.stringify\` только ради экранирования одной строки.
- **undefined и функция** → возвращаем \`undefined\` (не строку!). Это сигнал «меня нельзя сериализовать», и дальше вызывающий код решит, что с этим делать.

### Самое каверзное: undefined в массиве vs в объекте

Вот любимый вопрос интервьюеров. Одно и то же значение \`undefined\` (или функция) ведёт себя по-разному:

- **В массиве** оно превращается в \`null\`. В коде: \`jsonStringify(v) ?? 'null'\` — если элемент дал \`undefined\`, подставляем \`'null'\`, чтобы не сломать позиции элементов.
- **В объекте** пара «ключ-значение» просто _пропускается_. В коде: если \`serialized === undefined\`, возвращаем \`null\` из \`map\`, а затем \`.filter(Boolean)\` выкидывает эти дырки.

Логика в том, что в массиве позиция важна (нельзя «потерять» третий элемент), а в объекте ключ без значения просто не нужен.

### Сложность

O(n) по числу узлов дерева — каждое значение обрабатываем один раз.

## ⚠️ Подводные камни

- \`undefined\` на верхнем уровне: нативный \`JSON.stringify(undefined)\` возвращает само \`undefined\`, а не строку \`"undefined"\`.
- \`NaN\` и \`Infinity\` сериализуются как \`null\`.
- **Циклические ссылки** (объект ссылается сам на себя) заставляют нативный JSON бросить \`TypeError\` — бесконечная рекурсия иначе.
- Строки надо экранировать: кавычки, переносы строк \`\\n\`, табы \`\\t\` и прочее.

### Follow-up: а что с Date?

Нативный \`JSON.stringify\` перед сериализацией вызывает у значения метод \`toJSON()\`, если он есть. У \`Date\` он возвращает ISO-строку, поэтому даты превращаются в строки вроде \`"2026-07-04T..."\`. Наша упрощённая версия этого не делает — но об этом полезно упомянуть.

## 🎯 Запомни

- Рекурсия по типам: примитивы — базовые случаи, массивы/объекты — рекурсивные.
- \`undefined\`/функция: в массиве → \`null\`, в объекте → ключ пропускается. Это ключевой трюк.
- \`NaN\`/\`Infinity\` → \`null\`; циклы → \`TypeError\`; строки надо экранировать.
- Нативный вызывает \`toJSON()\` (например, у \`Date\`) — упрощённая версия обычно нет.`,
      en: `## 🧩 In plain words

\`JSON.stringify\` is the function that turns an object into text so you can send it over the network or save it. Our task is to hand-write a simplified version. It's essentially a translator: for each data type (string, number, array, object…) it knows its own way to write the value as text. And like any translator, it has tricky cases where it's easy to slip up.

### Core idea — recurse by type

Look at the value's type and handle each one its own way. If an array or object contains more objects, the function calls itself for them (that's **recursion**). Primitives (number, string, boolean, null) are the base cases where recursion stops.

\`\`\`ts
function jsonStringify(value) {
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
}
\`\`\`

### Type by type

- **null** → the string \`'null'\`.
- **Number** → the number as text, but \`NaN\` and \`Infinity\` have no JSON representation, so → \`'null'\`. We check this with \`Number.isFinite\`.
- **Boolean** → \`'true'\` / \`'false'\`.
- **String** → quoted and _escaped_ (special characters like \`"\`, \`\\n\`, \`\\t\` must be written safely). Here we honestly reuse the native \`JSON.stringify\` just to escape one string.
- **undefined and function** → return \`undefined\` (not a string!). It's a signal "I can't be serialized", and the caller decides what to do next.

### The trickiest bit: undefined in an array vs in an object

This is an interviewer favorite. The same \`undefined\` value (or a function) behaves differently:

- **In an array** it becomes \`null\`. In code: \`jsonStringify(v) ?? 'null'\` — if an element yields \`undefined\`, we substitute \`'null'\` so element positions don't shift.
- **In an object** the key-value pair is simply _skipped_. In code: if \`serialized === undefined\` we return \`null\` from \`map\`, then \`.filter(Boolean)\` drops those holes.

The reasoning: in an array position matters (you can't "lose" the third element), whereas in an object a key with no value is just unnecessary.

### Complexity

O(n) over the number of nodes in the tree — each value is processed once.

## ⚠️ Common pitfalls

- \`undefined\` at the top level: native \`JSON.stringify(undefined)\` returns the actual \`undefined\`, not the string \`"undefined"\`.
- \`NaN\` and \`Infinity\` serialize as \`null\`.
- **Circular references** (an object referencing itself) make native JSON throw a \`TypeError\` — otherwise it'd recurse forever.
- Strings must be escaped: quotes, newlines \`\\n\`, tabs \`\\t\`, and so on.

### Follow-up: what about Date?

Before serializing, native \`JSON.stringify\` calls the value's \`toJSON()\` method if it has one. For \`Date\` that returns an ISO string, so dates turn into strings like \`"2026-07-04T..."\`. Our simplified version doesn't do this — but it's worth mentioning.

## 🎯 Key takeaways

- Recurse by type: primitives are base cases, arrays/objects are recursive.
- \`undefined\`/function: in an array → \`null\`, in an object → the key is skipped. This is the key trick.
- \`NaN\`/\`Infinity\` → \`null\`; cycles → \`TypeError\`; strings must be escaped.
- Native calls \`toJSON()\` (e.g. on \`Date\`) — a simplified version usually doesn't.`
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
      ru: `## 🧩 Простыми словами

В интерфейсах CSS-классы у элемента часто зависят от условий: кнопка «активна» или нет, тема «тёмная» или «светлая». Собирать такую строку вручную через плюсы и тернарники — больно и грязно. Утилита \`classNames\` (её популярная версия — библиотека \`clsx\`) делает это красиво: ты передаёшь ей всё подряд — строки, объекты \`{ класс: условие }\`, массивы — а она возвращает одну аккуратную строку из тех классов, что «включены».

### Что она принимает

- **Строки и числа** — добавляются как есть, если они truthy (не пустые/не ноль).
- **Объекты** \`{ className: boolean }\` — ключ попадёт в результат, только если значение истинно. Например \`{ active: true, disabled: false }\` даст \`"active"\`.
- **Массивы** (в том числе вложенные) — обрабатываются _рекурсивно_, то есть функция разбирает их тем же способом на любой глубине.

Пример: \`classNames("a", { b: true, c: false }, ["d"])\` возвращает \`"a b d"\`.

### Как устроен код

\`\`\`ts
function classNames(...args) {
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

// classNames('a', { b: true, c: false }, ['d']); // 'a b d'
\`\`\`

Разберём по шагам. Мы перебираем все аргументы (\`...args\` собирает их в массив). Строка \`if (!arg) continue;\` — важная: она сразу отбрасывает все **falsy** значения (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`), чтобы они не попали в результат. Дальше по типу:

- строку или число просто кладём в список;
- массив разворачиваем через \`classNames(...arg)\` — это и есть **рекурсия**: функция вызывает себя, поэтому вложенность любой глубины работает сама собой;
- у объекта проходим пары и добавляем ключ, только если значение truthy.

В конце \`classes.join(' ')\` склеивает всё пробелом в одну строку.

### Сложность

O(n) по суммарному числу токенов (всех строк, ключей и элементов во всех аргументах).

## ⚠️ Подводные камни

- Falsy-аргументы (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`) молча игнорируются — это по задумке, чтобы можно было писать \`cond && 'class'\`.
- Вложенные массивы любой глубины должны поддерживаться — не забудь про рекурсивную ветку.
- Дубликаты классов обычно **не** убираются (как и в настоящем \`clsx\`). Если нужно — уточни требование.

### Follow-up: как дедуплицировать

Если требуется убрать повторы, можно обернуть результат в \`Set\`: \`[...new Set(classes)].join(' ')\`. Но \`clsx\` этого сознательно не делает — ради скорости и предсказуемого порядка. На собеседовании стоит проговорить этот компромисс.

## 🎯 Запомни

- \`classNames\` собирает CSS-классы из строк, чисел, объектов \`{класс: условие}\` и вложенных массивов.
- Класс из объекта попадает в вывод только при truthy-значении; falsy-аргументы игнорируются.
- Массивы обрабатываются рекурсивно → работает любая вложенность.
- Дедупликации по умолчанию нет — при желании через \`new Set\`.`,
      en: `## 🧩 In plain words

In UIs, an element's CSS classes often depend on conditions: a button is "active" or not, the theme is "dark" or "light". Building that string by hand with pluses and ternaries is painful and messy. The \`classNames\` utility (its popular incarnation is the \`clsx\` library) does it cleanly: you throw everything at it — strings, \`{ class: condition }\` objects, arrays — and it returns one tidy string of the classes that are "switched on".

### What it accepts

- **Strings and numbers** — added as-is when truthy (not empty/not zero).
- **Objects** \`{ className: boolean }\` — the key ends up in the result only if its value is truthy. For example \`{ active: true, disabled: false }\` yields \`"active"\`.
- **Arrays** (including nested) — handled _recursively_, meaning the function parses them the same way at any depth.

Example: \`classNames("a", { b: true, c: false }, ["d"])\` returns \`"a b d"\`.

### How the code works

\`\`\`ts
function classNames(...args) {
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

// classNames('a', { b: true, c: false }, ['d']); // 'a b d'
\`\`\`

Step by step. We iterate all arguments (\`...args\` gathers them into an array). The line \`if (!arg) continue;\` is important: it immediately drops every **falsy** value (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`) so they don't reach the result. Then, by type:

- a string or number is simply pushed onto the list;
- an array is expanded via \`classNames(...arg)\` — this is **recursion**: the function calls itself, so any depth of nesting just works;
- for an object we walk the pairs and add the key only when the value is truthy.

Finally \`classes.join(' ')\` glues everything with spaces into one string.

### Complexity

O(n) over the total number of tokens (all strings, keys, and elements across all arguments).

## ⚠️ Common pitfalls

- Falsy args (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`) are silently ignored — by design, so you can write \`cond && 'class'\`.
- Nested arrays of any depth must be supported — don't forget the recursive branch.
- Duplicate classes usually are **not** removed (just like real \`clsx\`). If you need it, clarify the requirement.

### Follow-up: how to dedupe

If duplicates must go, wrap the result in a \`Set\`: \`[...new Set(classes)].join(' ')\`. But \`clsx\` deliberately skips this — for speed and predictable ordering. In an interview it's worth naming that trade-off.

## 🎯 Key takeaways

- \`classNames\` assembles CSS classes from strings, numbers, \`{class: condition}\` objects, and nested arrays.
- A class from an object appears only when its value is truthy; falsy args are ignored.
- Arrays are handled recursively → any nesting works.
- No dedup by default — add it with \`new Set\` if you want it.`
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
      ru: `## 🧩 Простыми словами

Бесконечная прокрутка — это когда лента сама подгружает новые элементы, как только вы докрутили до конца (лента соцсети, поиск картинок). Чтобы понять «человек долистал до низа», ставят невидимый элемент-маячок (его называют **sentinel**, «часовой») в самом конце списка. Как только маячок появляется на экране — значит, пора грузить следующую порцию данных. А следить за появлением маячка нам помогает браузерный инструмент \`IntersectionObserver\`, который умеет замечать это сам, без ручных вычислений.

### Что такое IntersectionObserver

\`IntersectionObserver\` — встроенный в браузер наблюдатель, который асинхронно сообщает, пересёкся ли нужный элемент с вьюпортом (видимой областью экрана). «Асинхронно» здесь значит, что браузер сам решает, когда позвать наш коллбэк, и делает это в удобный момент, не мешая отрисовке.

Старый подход — вешать обработчик на событие \`scroll\` и на каждый чих вызывать \`getBoundingClientRect()\`, чтобы узнать координаты элемента. Проблема в том, что \`scroll\` срабатывает десятки раз в секунду, а \`getBoundingClientRect()\` заставляет браузер пересчитывать раскладку страницы (layout). Это тормозит главный поток (main thread) — тот самый, что рисует интерфейс. \`IntersectionObserver\` всего этого лишён: он работает вне цикла раскладки и сам группирует наблюдения.

### Как это работает по шагам

1. Создаём наблюдатель и говорим ему следить за sentinel-элементом.
2. Когда sentinel въезжает во вьюпорт, у записи наблюдения свойство \`isIntersecting\` становится \`true\`.
3. В этот момент вызываем \`loadMore()\` — функцию, которая грузит следующую страницу.
4. Когда данные закончились, вызываем \`observer.disconnect()\`, чтобы наблюдатель перестал работать.

### Защита от повторных загрузок

Тут прячется главная ловушка. Коллбэк может сработать несколько раз подряд, пока первый запрос ещё летит на сервер, — и мы случайно запустим несколько одинаковых загрузок. Чтобы этого не было, заводим флаг \`loading\`. Пока идёт загрузка, \`loading === true\`, и все новые срабатывания просто игнорируются. Когда запрос завершился (в блоке \`finally\`, чтобы сработало даже при ошибке), сбрасываем \`loading\` обратно в \`false\`.

\`\`\`js
function setupInfiniteScroll(sentinel, loadMore, { rootMargin = '200px' } = {}) {
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
}
\`\`\`

Здесь \`loading\` защищает от гонки (параллельных запросов), а \`done\` запоминает, что данные кончились, и отключает наблюдателя навсегда. Функция возвращает «уборщика» — вызов \`disconnect()\`, который нужно позвать при размонтировании компонента.

### Зачем rootMargin

\`rootMargin\` — это невидимая «прибавка» к границам вьюпорта. Со значением \`"200px"\` наблюдатель считает маячок появившимся уже за 200 пикселей до реального края экрана. Проще говоря, мы начинаем грузить следующую страницу чуть заранее, пока пользователь ещё листает, чтобы к моменту, когда он долистает, контент уже был на месте. Прокрутка ощущается плавной, без пауз.

### Сложность

Коллбэк отрабатывает за O(1) — простая проверка флагов и запуск загрузки. Браузер сам батчит (группирует) наблюдения, так что лишней нагрузки нет.

## ⚠️ Подводные камни

- Без флага \`loading\` несколько срабатываний подряд запустят дубликаты запросов — защита обязательна.
- Забыли \`disconnect()\` при размонтировании — получите утечку памяти: наблюдатель продолжит держать ссылку на элемент.
- \`rootMargin\` стоит задать заранее (например, \`"200px"\`), иначе загрузка стартует ровно на краю и пользователь увидит паузу.

## 🎯 Запомни

- Sentinel-элемент в конце списка + \`IntersectionObserver\` = «долистал до низа» без scroll-листенеров.
- Флаг \`loading\` в \`try/finally\` — обязательная защита от одновременных дублирующих загрузок.
- \`rootMargin\` грузит контент заранее для плавности; \`disconnect()\` при завершении и размонтировании — от утечек.
- Плюс перед scroll-листенером: не блокирует главный поток, не требует throttle, работает вне раскладки.`,
      en: `## 🧩 In plain words

Infinite scroll is when a feed loads more items automatically as soon as you reach the bottom (social feeds, image search). To detect "the user scrolled to the end," you place an invisible marker element — called a **sentinel** (a "watchman") — at the very end of the list. The moment the sentinel appears on screen, it's time to load the next batch of data. And to notice when the sentinel shows up, we use a browser tool called \`IntersectionObserver\`, which spots this on its own without any manual math.

### What IntersectionObserver is

\`IntersectionObserver\` is a browser built-in that asynchronously reports whether a target element has intersected the viewport (the visible area of the screen). "Asynchronously" means the browser decides when to call our callback and does it at a convenient moment, without getting in the way of rendering.

The old approach was to attach a handler to the \`scroll\` event and, on every tick, call \`getBoundingClientRect()\` to read the element's coordinates. The problem: \`scroll\` fires dozens of times per second, and \`getBoundingClientRect()\` forces the browser to recompute the page layout. That thrashes the main thread — the very thread that paints the UI. \`IntersectionObserver\` avoids all of this: it runs off the layout cycle and batches observations itself.

### How it works, step by step

1. Create the observer and tell it to watch the sentinel element.
2. When the sentinel enters the viewport, the observation entry's \`isIntersecting\` property becomes \`true\`.
3. At that moment we call \`loadMore()\` — the function that fetches the next page.
4. When data runs out, we call \`observer.disconnect()\` so the observer stops working.

### Guarding against duplicate loads

Here's the main trap. The callback can fire several times in a row while the first request is still in flight — and we'd accidentally kick off several identical loads. To prevent that, we keep a \`loading\` flag. While a load is in progress, \`loading === true\` and every new firing is simply ignored. When the request finishes (in a \`finally\` block, so it runs even on error), we reset \`loading\` back to \`false\`.

\`\`\`js
function setupInfiniteScroll(sentinel, loadMore, { rootMargin = '200px' } = {}) {
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
}
\`\`\`

Here \`loading\` guards against the race (concurrent requests), and \`done\` remembers that data ran out and shuts the observer down for good. The function returns a "cleaner" — the \`disconnect()\` call you must run when the component unmounts.

### Why rootMargin

\`rootMargin\` is an invisible "padding" added to the viewport's edges. With \`"200px"\`, the observer treats the sentinel as visible already 200 pixels before the real screen edge. In plain terms, we start loading the next page slightly ahead, while the user is still scrolling, so by the time they reach the bottom the content is already there. Scrolling feels smooth, with no pauses.

### Complexity

The callback runs in O(1) — a simple flag check and a load kickoff. The browser batches observations itself, so there's no extra load.

## ⚠️ Common pitfalls

- Without a \`loading\` flag, several firings in a row trigger duplicate requests — the guard is mandatory.
- Forget \`disconnect()\` on unmount and you leak memory: the observer keeps holding a reference to the element.
- Set \`rootMargin\` ahead of time (e.g. \`"200px"\`), or loading starts right at the edge and the user sees a pause.

## 🎯 Key takeaways

- A sentinel element at the end of the list + \`IntersectionObserver\` = "reached the bottom" without scroll listeners.
- A \`loading\` flag in \`try/finally\` is the mandatory guard against concurrent duplicate loads.
- \`rootMargin\` prefetches for smoothness; \`disconnect()\` on completion and unmount prevents leaks.
- Win over a scroll listener: doesn't block the main thread, needs no throttle, runs off layout.`
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
      ru: `## 🧩 Простыми словами

State store — это маленький «ящик», который хранит состояние приложения в одном месте и умеет сообщать всем заинтересованным, когда содержимое поменялось. Представьте доску объявлений: любой может прочитать, что на ней написано (\`getState\`), кто-то с правами меняет запись (\`setState\`), а те, кто подписался, сразу получают уведомление об изменении (\`subscribe\`). Именно так устроено ядро Redux и Zustand — и оно умещается в пару десятков строк.

### Три метода стора

- \`getState()\` — вернуть текущее состояние. Просто отдаём то, что лежит в переменной.
- \`setState(partial)\` — обновить состояние. Принимает либо кусок нового состояния (\`{ count: 5 }\`), либо функцию-апдейтер, которой на вход приходит текущее состояние, а на выходе — изменения (\`(s) => ({ count: s.count + 1 })\`).
- \`subscribe(listener)\` — подписаться на изменения. Возвращает функцию отписки, которую нужно позвать, когда слушатель больше не нужен.

### Как это устроено внутри

Всё держится на замыкании: переменная \`state\` и коллекция подписчиков \`Set\` живут внутри функции \`createStore\` и недоступны снаружи напрямую — только через три метода. \`Set\` (набор уникальных значений) удобен тем, что один и тот же listener не добавится дважды, а удаление занимает O(1).

\`\`\`js
function createStore(initialState) {
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
// store.setState((s) => ({ count: s.count + 1 }));
\`\`\`

Разберём \`setState\`. Сначала проверяем: если \`partial\` — функция, зовём её от текущего состояния, иначе используем как есть. Затем **иммутабельно** мержим: \`{ ...state, ...next }\` создаёт новый объект, копируя старые поля и перезаписывая изменённые. И в конце проходим по всем подписчикам и зовём каждого, передавая свежее состояние.

### Почему иммутабельность важна

«Иммутабельно» значит, что мы не меняем старый объект, а создаём новый. Это принципиально: вьюхи (например, React) часто сравнивают состояние **по ссылке** — «тот же это объект или другой?». Если бы мы правили старый объект на месте, ссылка не менялась бы, и вью решил бы, что ничего не произошло, — экран не обновился бы. Новый объект = новая ссылка = «что-то изменилось, перерисуй».

### Тонкость с уведомлением подписчиков

Обратите внимание на \`[...listeners]\` — мы копируем Set перед перебором. Зачем? Один из слушателей во время уведомления может сам отписаться (удалить себя из Set). Если перебирать оригинал прямо во время его изменения, можно пропустить или сломать итерацию. Копия защищает от этого.

### Сложность

\`getState\` и \`subscribe\` — O(1). \`setState\` — O(количества подписчиков), потому что нужно обойти всех и уведомить.

## ⚠️ Подводные камни

- Мутация состояния на месте вместо нового объекта — вьюхи со сравнением по ссылке перестанут обновляться.
- Перебор оригинального Set во время уведомления ломается, если listener отпишется по ходу; перебирайте копию.
- Функция-апдейтер должна получать актуальное состояние — это важно для нескольких \`setState\` подряд, чтобы каждый видел результат предыдущего.

## 🎯 Запомни

- Ядро стора = замыкание над \`state\` + \`Set\` подписчиков и три метода: \`getState\`, \`setState\`, \`subscribe\`.
- \`setState\` всегда создаёт **новый** объект состояния (иммутабельность) и уведомляет всех подписчиков.
- \`subscribe\` возвращает функцию отписки; уведомляйте по копии Set, чтобы отписка на лету не ломала перебор.
- Redux-вариант — то же ядро, но вместо \`setState\` идёт \`dispatch(action)\` + \`reducer\`.`,
      en: `## 🧩 In plain words

A state store is a small "box" that holds your app's state in one place and knows how to tell everyone interested when the contents change. Picture a bulletin board: anyone can read what's on it (\`getState\`), someone with rights changes an entry (\`setState\`), and whoever subscribed gets notified immediately (\`subscribe\`). That's exactly how the core of Redux and Zustand works — and it fits in a couple dozen lines.

### The store's three methods

- \`getState()\` — return the current state. We just hand back what's in the variable.
- \`setState(partial)\` — update the state. Takes either a chunk of new state (\`{ count: 5 }\`) or an updater function that receives the current state and returns the changes (\`(s) => ({ count: s.count + 1 })\`).
- \`subscribe(listener)\` — subscribe to changes. Returns an unsubscribe function you call when the listener is no longer needed.

### How it works inside

Everything rests on a closure: the \`state\` variable and a \`Set\` of subscribers live inside the \`createStore\` function, unreachable from outside except through the three methods. A \`Set\` (a collection of unique values) is handy because the same listener won't be added twice, and removal is O(1).

\`\`\`js
function createStore(initialState) {
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
// store.setState((s) => ({ count: s.count + 1 }));
\`\`\`

Let's break down \`setState\`. First we check: if \`partial\` is a function, we call it with the current state; otherwise we use it as is. Then we merge **immutably**: \`{ ...state, ...next }\` creates a new object, copying the old fields and overwriting the changed ones. Finally we loop over all subscribers and call each one, passing the fresh state.

### Why immutability matters

"Immutably" means we don't mutate the old object — we create a new one. This is crucial: views (React, for example) often compare state **by reference** — "is this the same object or a different one?". If we edited the old object in place, the reference wouldn't change, the view would conclude nothing happened, and the screen wouldn't update. A new object = a new reference = "something changed, re-render."

### The subtlety when notifying subscribers

Notice \`[...listeners]\` — we copy the Set before iterating. Why? One of the listeners might unsubscribe itself during notification (remove itself from the Set). Iterating the original while it's being modified can skip entries or break the loop. The copy protects against that.

### Complexity

\`getState\` and \`subscribe\` are O(1). \`setState\` is O(number of subscribers), since it has to walk them all and notify.

## ⚠️ Common pitfalls

- Mutating state in place instead of creating a new object — views that compare by reference stop updating.
- Iterating the original Set during notification breaks if a listener unsubscribes mid-loop; iterate a copy.
- The updater function must receive the current state — important for several \`setState\` calls in a row, so each sees the previous result.

## 🎯 Key takeaways

- The store core = a closure over \`state\` + a \`Set\` of subscribers and three methods: \`getState\`, \`setState\`, \`subscribe\`.
- \`setState\` always creates a **new** state object (immutability) and notifies all subscribers.
- \`subscribe\` returns an unsubscribe function; notify over a copy of the Set so unsubscribing on the fly doesn't break the loop.
- The Redux flavour is the same core, but instead of \`setState\` you have \`dispatch(action)\` + \`reducer\`.`
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
