import { InterviewQuestion } from '../interfaces/question.interface';

/**
 * "JavaScript Core" — the Senior / advanced block.
 *
 * "Implement it yourself" tasks plus the mechanics behind them: generators,
 * garbage collection, iteration protocols, patterns, symbols and coercion.
 * Russian only; `en` falls back to `ru` at render time.
 */
export const JS_CORE_SENIOR_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'js-044',
    category: 'js-state',
    level: 'Expert',
    tags: ['polyfill', 'promise', 'implementation'],
    question: {
      ru: 'Реализуй сам: полифилл `Function.prototype.bind` с поддержкой `new`, `Promise.all` через `new Promise`, свои `map` и `reduce`, и `Promise` с нуля'
    },
    answer: {
      ru: `## Коротко

Задачи «напиши сам» проверяют не память, а понимание механики: как работает \`this\`, как устроен \`new\`, как промис хранит состояние и как обходятся массивы. Ниже — четыре типовых задания с разбором каждой строки.

Общий совет: **проговаривайте вслух, что делает каждый шаг**. Интервьюеру важнее рассуждение, чем идеально вылизанный код.

## Как это работает по шагам

Все четыре задачи опираются на один и тот же набор знаний:

1. Функция — это объект, у неё есть \`call\`, \`apply\` и свойство \`prototype\`.
2. \`new\` создаёт объект, связывает его с \`prototype\` конструктора, вызывает функцию с этим \`this\` и возвращает объект, если конструктор не вернул свой.
3. Промис — это объект с состоянием и двумя списками колбэков, которые вызываются через очередь микрозадач.
4. Методы массива — обычные функции на \`Array.prototype\`, где \`this\` это сам массив.

### Напиши полифилл \`Function.prototype.bind\` (с поддержкой \`new\`)

Начнём с простой версии, а потом добавим поддержку \`new\`.

\`\`\`js
Function.prototype.myBind = function (context, ...boundArgs) {
  const targetFn = this;                       // функция, у которой вызвали bind

  if (typeof targetFn !== 'function') {
    throw new TypeError('Bind must be called on a function');
  }

  function bound(...callArgs) {
    // Если вызвали через new, this — новый объект, и его нельзя подменять
    const isNew = this instanceof bound;
    return targetFn.apply(
      isNew ? this : context,
      [...boundArgs, ...callArgs]              // зафиксированные + новые аргументы
    );
  }

  // Чтобы instanceof работал для объектов, созданных через new bound()
  bound.prototype = Object.create(targetFn.prototype || null);

  return bound;
};
\`\`\`

Разберём по шагам.

**\`const targetFn = this\`.** \`bind\` — это метод на прототипе функций, поэтому \`this\` внутри него — та самая функция, у которой его вызвали: в \`fn.myBind(obj)\` это \`fn\`.

**\`...boundArgs\`** — аргументы, зафиксированные на этапе привязки. Они всегда идут первыми.

**\`this instanceof bound\`** — проверка, вызвали ли обёртку через \`new\`. Когда \`new bound()\` создаёт объект, его прототипом становится \`bound.prototype\`, поэтому \`instanceof\` истинен. При обычном вызове \`this\` будет \`undefined\` или глобальный объект, и проверка не пройдёт.

**\`bound.prototype = Object.create(targetFn.prototype)\`** — связываем прототипы, иначе объекты, созданные через \`new bound()\`, не унаследуют методы исходной функции и провалят \`instanceof\`.

Проверим:

\`\`\`js
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.greet = function () { return 'Привет, ' + this.name; };

// Обычное использование
const obj = { name: 'объект' };
function show() { return this.name; }
console.log(show.myBind(obj)());                 // 'объект'

// Частичное применение
const BoundPerson = Person.myBind(null, 'Anton');
const p = new BoundPerson(30);
console.log(p.name, p.age);                      // 'Anton' 30
console.log(p instanceof Person);                // true — new победил bind
console.log(p.greet());                          // 'Привет, Anton'
\`\`\`

Более строгий вариант вместо \`instanceof\` использует \`new.target\`:

\`\`\`js
function bound(...callArgs) {
  return targetFn.apply(new.target ? this : context, [...boundArgs, ...callArgs]);
}
\`\`\`

Он надёжнее: \`instanceof\` можно обмануть подменой прототипа, а \`new.target\` — нет.

### Реализуй \`Promise.all\` через \`new Promise\`, сохранив порядок результатов

\`\`\`js
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const list = Array.from(items);              // может прийти любой iterable
    const results = new Array(list.length);      // массив нужной длины сразу
    let completed = 0;

    if (list.length === 0) {
      resolve([]);                               // пустой список — сразу успех
      return;
    }

    list.forEach((item, index) => {
      // Оборачиваем: в списке могут быть и обычные значения, не только промисы
      Promise.resolve(item).then(
        (value) => {
          results[index] = value;                // кладём по индексу — порядок сохранён
          completed++;
          if (completed === list.length) resolve(results);
        },
        reject                                   // первая ошибка отклоняет всё
      );
    });
  });
}
\`\`\`

Четыре важных момента, о которых стоит сказать самому:

**Порядок результатов.** Ключ — строка \`results[index] = value\`. Мы не пушим в массив по мере готовности, а кладём **по исходному индексу**. Поэтому медленный первый промис окажется первым в результате, хотя завершился последним.

**Счётчик \`completed\`, а не проверка длины.** Проверять \`results.length === list.length\` нельзя: присваивание по индексу в разреженном массиве не даёт надёжного признака заполненности, а значение может быть \`undefined\`.

**\`Promise.resolve(item)\`.** В список могут попасть не только промисы, но и обычные значения. Обёртка приводит всё к единому виду.

**Пустой список.** Без явной проверки \`forEach\` не выполнится ни разу, и промис останется висеть навсегда.

Проверим:

\`\`\`js
const delay = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

promiseAll([delay(300, 'медленный'), delay(50, 'быстрый'), 'не промис'])
  .then(console.log);
// ['медленный', 'быстрый', 'не промис'] — порядок как в исходном массиве

promiseAll([Promise.resolve(1), Promise.reject(new Error('упал')), delay(100, 3)])
  .catch(e => console.log('ошибка:', e.message));
// ошибка: упал — причём не дожидаясь третьего
\`\`\`

Рядом часто просят \`allSettled\` — он проще, потому что никогда не падает:

\`\`\`js
function promiseAllSettled(items) {
  return promiseAll(
    Array.from(items).map(item =>
      Promise.resolve(item).then(
        value => ({ status: 'fulfilled', value }),
        reason => ({ status: 'rejected', reason })
      )
    )
  );
}
\`\`\`

Приём красивый: любую ошибку превращаем в успешный результат-описание, и тогда обычный \`all\` уже не может упасть.

### Напиши свой \`map\` / \`reduce\` на прототипе массива

\`\`\`js
Array.prototype.myMap = function (callback, thisArg) {
  if (this == null) throw new TypeError('called on null or undefined');
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');

  const array = Object(this);
  const length = array.length >>> 0;              // приводим к целому беззнаковому
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    if (i in array) {                             // пропускаем «дырки» разреженного массива
      result[i] = callback.call(thisArg, array[i], i, array);
    }
  }
  return result;
};
\`\`\`

Три детали, которые отличают «просто цикл» от настоящей реализации:

**\`i in array\`** — проверка существования элемента. В разреженном массиве \`[1, , 3]\` средний элемент не существует, и настоящий \`map\` его пропускает, сохраняя дырку:

\`\`\`js
console.log([1, , 3].myMap(x => x * 2));   // [2, <1 empty item>, 6]
\`\`\`

**\`callback.call(thisArg, ...)\`** — второй аргумент \`map\` задаёт \`this\` внутри колбэка. Мелочь, но её обычно забывают.

**\`length >>> 0\`** — приведение к целому беззнаковому числу. Защищает от странных значений \`length\` у объектов, похожих на массив.

Теперь \`reduce\`:

\`\`\`js
Array.prototype.myReduce = function (callback, initialValue) {
  if (this == null) throw new TypeError('called on null or undefined');
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');

  const array = Object(this);
  const length = array.length >>> 0;
  let index = 0;
  let accumulator;

  if (arguments.length >= 2) {
    accumulator = initialValue;                   // начальное значение передали
  } else {
    // Не передали — ищем первый существующий элемент
    while (index < length && !(index in array)) index++;
    if (index >= length) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    accumulator = array[index++];
  }

  for (; index < length; index++) {
    if (index in array) {
      accumulator = callback(accumulator, array[index], index, array);
    }
  }
  return accumulator;
};
\`\`\`

Ключевая тонкость — **\`arguments.length >= 2\`**, а не \`initialValue !== undefined\`. Если вызвать \`arr.reduce(fn, undefined)\`, начальное значение **передано**, и оно равно \`undefined\`. Проверка через \`!== undefined\` в этом случае ошиблась бы и взяла первый элемент массива.

Проверим:

\`\`\`js
console.log([1, 2, 3].myMap(x => x * 2));              // [2, 4, 6]
console.log([1, 2, 3].myReduce((a, b) => a + b));      // 6
console.log([1, 2, 3].myReduce((a, b) => a + b, 10));  // 16
console.log([].myReduce((a, b) => a + b, 0));          // 0
try { [].myReduce((a, b) => a + b); } catch (e) { console.log(e.message); }
// 'Reduce of empty array with no initial value'
\`\`\`

Кстати, \`map\` через \`reduce\` — частый дополнительный вопрос:

\`\`\`js
const mapViaReduce = (arr, fn) =>
  arr.reduce((acc, item, i) => { acc.push(fn(item, i, arr)); return acc; }, []);
\`\`\`

### Реализуй \`Promise\` с нуля — минимум \`then\` и состояния

\`\`\`js
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  #state = MyPromise.PENDING;
  #value = undefined;
  #callbacks = [];                 // колбэки, ждущие завершения

  constructor(executor) {
    const resolve = (value) => this.#settle(MyPromise.FULFILLED, value);
    const reject = (reason) => this.#settle(MyPromise.REJECTED, reason);

    try {
      executor(resolve, reject);   // выполняется синхронно, прямо сейчас
    } catch (error) {
      reject(error);               // исключение в executor = отклонение
    }
  }

  #settle(state, value) {
    if (this.#state !== MyPromise.PENDING) return;   // перейти можно только один раз

    // Если resolve получил промис — ждём его и повторяем результат
    if (state === MyPromise.FULFILLED && value instanceof MyPromise) {
      value.then(
        v => this.#settle(MyPromise.FULFILLED, v),
        e => this.#settle(MyPromise.REJECTED, e)
      );
      return;
    }

    this.#state = state;
    this.#value = value;
    this.#callbacks.forEach(cb => queueMicrotask(cb));   // всегда асинхронно
    this.#callbacks = [];
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = () => {
        try {
          if (this.#state === MyPromise.FULFILLED) {
            // Обработчика нет — просто пропускаем значение дальше
            resolve(typeof onFulfilled === 'function' ? onFulfilled(this.#value) : this.#value);
          } else {
            // Обработчика нет — ошибка едет дальше по цепочке
            if (typeof onRejected === 'function') resolve(onRejected(this.#value));
            else reject(this.#value);
          }
        } catch (error) {
          reject(error);           // исключение в обработчике отклоняет новый промис
        }
      };

      if (this.#state === MyPromise.PENDING) this.#callbacks.push(handle);
      else queueMicrotask(handle);
    });
  }

  catch(onRejected) { return this.then(undefined, onRejected); }

  finally(onFinally) {
    return this.then(
      value => { onFinally(); return value; },       // значение пропускаем как есть
      reason => { onFinally(); throw reason; }       // ошибку тоже
    );
  }

  static resolve(value) {
    return value instanceof MyPromise ? value : new MyPromise(r => r(value));
  }
  static reject(reason) { return new MyPromise((_, r) => r(reason)); }
}
\`\`\`

Шесть решений, которые здесь важны:

**Состояние меняется один раз.** Первая строка \`#settle\` отсекает повторные вызовы \`resolve\` и \`reject\` — именно это делает промис надёжным.

**\`executor\` выполняется синхронно**, прямо в конструкторе, и обёрнут в \`try/catch\`: брошенное в нём исключение должно отклонять промис, а не вылетать наружу.

**Колбэки всегда через \`queueMicrotask\`.** Даже если промис уже завершён, обработчик не должен выполниться синхронно — иначе порядок выполнения станет непредсказуемым.

**\`then\` возвращает новый промис** — это и даёт цепочки.

**Проброс без обработчика.** Если в \`then\` не передали нужную функцию, значение или ошибка едут дальше — на этом работает \`.catch\` в конце длинной цепочки.

**Распаковка промиса в \`resolve\`.** Если обработчик вернул промис, цепочка его дожидается. Здесь это сделано упрощённо — полная спецификация требует поддержки любых «thenable»-объектов.

Проверим:

\`\`\`js
new MyPromise((resolve) => setTimeout(() => resolve(1), 100))
  .then(v => { console.log('получили', v); return v * 2; })
  .then(v => new MyPromise(r => r(v + 1)))       // вернули промис — цепочка ждёт
  .then(v => { console.log('итого', v); throw new Error('стоп'); })
  .catch(e => { console.log('поймали', e.message); return 'восстановились'; })
  .then(v => console.log(v))
  .finally(() => console.log('готово'));

// получили 1
// итого 3
// поймали стоп
// восстановились
// готово
\`\`\`

## Что сказать на собеседовании

> В \`bind\` главное — что внутри \`this\` это функция, у которой его вызвали, и что возвращаемая обёртка должна отличать обычный вызов от вызова через \`new\`: проверяю \`new.target\` и в этом случае не подменяю контекст, и связываю \`bound.prototype\` с прототипом оригинала ради \`instanceof\`. В \`Promise.all\` порядок сохраняется потому, что результат кладётся по исходному индексу, а не пушится по мере готовности; а пустой список обрабатываю отдельно, иначе промис зависнет. В своём \`map\` и \`reduce\` важны детали, которые обычно забывают: пропуск дырок через \`i in array\` и проверка \`arguments.length >= 2\`, потому что \`undefined\` мог быть передан как начальное значение. В самом \`Promise\` ключевое — состояние меняется ровно один раз, \`executor\` выполняется синхронно в \`try/catch\`, а колбэки всегда идут через очередь микрозадач.

## Ловушки

- **\`bind\` без связывания прототипа** ломает \`instanceof\` для объектов из \`new bound()\`.
- **\`Promise.all\` без обработки пустого массива зависает навсегда.**
- **Пуш результата вместо записи по индексу** ломает порядок в \`Promise.all\`.
- **Проверка \`initialValue !== undefined\` в \`reduce\`** неверна: \`undefined\` мог быть передан явно.
- **Синхронный вызов колбэка в своём промисе** нарушает гарантию асинхронности и меняет порядок выполнения.
- **Отсутствие \`try/catch\` вокруг \`executor\`** — брошенная ошибка вылетит наружу вместо отклонения промиса.
- **Проброс значения при отсутствующем обработчике** в \`then\` легко забыть — и тогда \`.catch\` в конце цепочки перестанет ловить ошибки.
- **\`Array.prototype\` расширять в продакшене нельзя** — это ломает \`for...in\` и конфликтует с будущими методами языка.`
    },
    codeSnippet: `Function.prototype.myBind = function (context, ...bound) {
  const fn = this;
  function wrapper(...args) {
    return fn.apply(new.target ? this : context, [...bound, ...args]);
  }
  wrapper.prototype = Object.create(fn.prototype || null);
  return wrapper;
};

function Person(name, age) { this.name = name; this.age = age; }
const P = Person.myBind(null, 'Anton');
const p = new P(30);
console.log(p.name, p.age, p instanceof Person);   // Anton 30 true

function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const list = Array.from(items);
    const out = new Array(list.length);
    let done = 0;
    if (!list.length) return resolve([]);          // иначе зависнет навсегда
    list.forEach((item, i) => {
      Promise.resolve(item).then(v => {
        out[i] = v;                                // по индексу → порядок сохранён
        if (++done === list.length) resolve(out);
      }, reject);
    });
  });
}

const d = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
promiseAll([d(300, 'A'), d(50, 'B'), 'C']).then(console.log);  // ['A','B','C']

Array.prototype.myReduce = function (cb, init) {
  const arr = Object(this), len = arr.length >>> 0;
  let i = 0, acc;
  if (arguments.length >= 2) acc = init;           // не '!== undefined'!
  else {
    while (i < len && !(i in arr)) i++;
    if (i >= len) throw new TypeError('Reduce of empty array with no initial value');
    acc = arr[i++];
  }
  for (; i < len; i++) if (i in arr) acc = cb(acc, arr[i], i, arr);
  return acc;
};
console.log([1, 2, 3].myReduce((a, b) => a + b, 10));   // 16`
  },
  {
    id: 'js-045',
    category: 'js-state',
    level: 'Expert',
    tags: ['generators', 'iterators', 'lazy'],
    question: {
      ru: 'Генераторы: чем отличаются от обычной функции и что возвращают, как передать значение через `next(value)`, бесконечная ленивая последовательность и `async/await` на генераторах'
    },
    answer: {
      ru: `## Коротко

**Генератор — это функция, которую можно поставить на паузу и продолжить с того же места.**

Обычная функция, начав выполняться, идёт до конца или до \`return\`. Генератор останавливается на каждом \`yield\`, отдаёт значение наружу и **замирает**, сохранив все свои локальные переменные. Продолжится он только когда его об этом попросят.

Аналогия: обычная функция — это книга, которую вы читаете залпом от корки до корки. Генератор — книга с закладкой: прочитали страницу, вложили закладку, ушли. Вернулись — продолжили ровно с того места.

Пишется со звёздочкой: \`function* name() { ... }\`.

## Как это работает по шагам

1. Вызов генератора **не выполняет тело**, а возвращает объект-итератор.
2. Первый \`next()\` запускает тело до первого \`yield\`.
3. \`yield\` отдаёт значение и ставит функцию на паузу — контекст сохраняется целиком.
4. Следующий \`next()\` продолжает с той же строки; **аргумент \`next(value)\` становится результатом того самого \`yield\`**.
5. Когда тело закончилось или встретился \`return\`, итератор отдаёт \`{ value, done: true }\` и больше не возобновляется.

### Чем генератор отличается от обычной функции, что возвращает?

\`\`\`js
function* gen() {
  console.log('начало');
  yield 1;
  console.log('середина');
  yield 2;
  console.log('конец');
  return 3;
}

const it = gen();          // ничего не напечаталось — тело ещё не запускалось!
console.log(it);           // Object [Generator] {}

console.log(it.next());    // 'начало'   → { value: 1, done: false }
console.log(it.next());    // 'середина' → { value: 2, done: false }
console.log(it.next());    // 'конец'    → { value: 3, done: true }
console.log(it.next());    //            → { value: undefined, done: true }
\`\`\`

Три ключевых отличия:

**1. Вызов не выполняет тело.** Он возвращает объект-итератор. Это удивляет: \`gen()\` выглядит как обычный вызов, но ничего не происходит.

**2. Возвращается объект с методами \`next\`, \`return\` и \`throw\`.** Каждый \`next()\` отдаёт объект вида \`{ value, done }\`.

**3. Состояние сохраняется между вызовами.** Локальные переменные живут, пока живёт итератор.

Важная деталь про \`return\` внутри генератора: его значение приходит **вместе с \`done: true\`**, а такие значения **игнорируются** в \`for...of\` и спреде:

\`\`\`js
console.log([...gen()]);   // [1, 2] — тройки нет!
for (const v of gen()) console.log(v);   // 1, 2
\`\`\`

Генератор перебираем, потому что его объект-итератор сам себе итерируемый:

\`\`\`js
const it = gen();
console.log(it[Symbol.iterator]() === it);   // true
\`\`\`

У итератора есть ещё два метода, о которых спрашивают:

\`\`\`js
const it2 = gen();
it2.next();
console.log(it2.return('досрочно'));   // { value: 'досрочно', done: true }
console.log(it2.next());                // { value: undefined, done: true }
\`\`\`

\`return()\` завершает генератор досрочно — именно это происходит при \`break\` в \`for...of\`. А \`throw()\` бросает исключение **внутрь** генератора, в точку последнего \`yield\`, — и там его можно поймать обычным \`try/catch\`.

Полезная деталь: \`try/finally\` внутри генератора **отрабатывает при досрочном завершении** — это делает генераторы безопасными для работы с ресурсами:

\`\`\`js
function* withCleanup() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('очистка');   // выполнится даже при break
  }
}
for (const v of withCleanup()) { if (v === 1) break; }
// 'очистка'
\`\`\`

### Как передать значение внутрь через \`next(value)\`?

Это двусторонняя связь, и она сбивает с толку при первом знакомстве.

\`\`\`js
function* dialogue() {
  const name = yield 'Как тебя зовут?';
  const age = yield 'Привет, ' + name + '! Сколько тебе лет?';
  return name + ', ' + age + ' лет';
}

const it = dialogue();

console.log(it.next().value);          // 'Как тебя зовут?'
console.log(it.next('Anton').value);   // 'Привет, Anton! Сколько тебе лет?'
console.log(it.next(30).value);        // 'Anton, 30 лет'
\`\`\`

Правило, которое нужно понять: **\`yield\` — это не только «отдать», но и «получить»**. Выражение \`const name = yield '...'\` работает так:

1. \`yield\` отдаёт строку наружу и ставит генератор на паузу.
2. Функция замирает **прямо на этой строке**, присваивание ещё не выполнено.
3. Когда вызывают \`next('Anton')\`, аргумент становится **результатом выражения \`yield\`**.
4. Присваивание завершается: \`name\` получает \`'Anton'\`.

Отсюда важное следствие: **аргумент первого \`next()\` всегда теряется**. К моменту первого вызова генератор ещё не дошёл ни до одного \`yield\`, и значению некуда попасть.

\`\`\`js
const it2 = dialogue();
it2.next('это значение пропадёт');   // запускает тело до первого yield
\`\`\`

Наглядный пример двусторонней связи — накопитель:

\`\`\`js
function* accumulator() {
  let total = 0;
  while (true) {
    const add = yield total;     // отдаём сумму, получаем следующее слагаемое
    if (add === undefined) break;
    total += add;
  }
  return total;
}

const acc = accumulator();
console.log(acc.next().value);     // 0  — запуск
console.log(acc.next(10).value);   // 10
console.log(acc.next(5).value);    // 15
console.log(acc.next(20).value);   // 35
\`\`\`

Именно эта возможность передавать значения обратно и делает генераторы основой для \`async/await\`.

### Как через генератор сделать бесконечную ленивую последовательность?

**Ленивость** означает: значения вычисляются **по одному, только когда их запросили**. Поэтому бесконечная последовательность не занимает бесконечную память.

\`\`\`js
function* naturals() {
  let n = 1;
  while (true) {                 // бесконечный цикл — и это нормально
    yield n++;
  }
}

const it = naturals();
console.log(it.next().value);    // 1
console.log(it.next().value);    // 2
console.log(it.next().value);    // 3
// ...можно продолжать сколько угодно
\`\`\`

Ключевой момент: \`while (true)\` не вешает программу, потому что после каждого \`yield\` функция **останавливается** и ждёт следующего запроса.

Практическая польза появляется, когда такие последовательности **комбинируют** — как ленивые аналоги \`map\`, \`filter\` и \`slice\`:

\`\`\`js
function* take(iterable, count) {
  let i = 0;
  for (const item of iterable) {
    if (i++ >= count) return;
    yield item;
  }
}

function* map(iterable, fn) {
  for (const item of iterable) yield fn(item);
}

function* filter(iterable, predicate) {
  for (const item of iterable) if (predicate(item)) yield item;
}

// Первые 5 квадратов чётных чисел — из бесконечной последовательности
const result = [...take(map(filter(naturals(), n => n % 2 === 0), n => n * n), 5)];
console.log(result);   // [4, 16, 36, 64, 100]
\`\`\`

Здесь не создаётся ни одного промежуточного массива: значения «протягиваются» по цепочке по одному, и вычисляется ровно столько, сколько запросили. С обычными \`filter\` и \`map\` такое невозможно — они требуют конечного массива и строят полную копию на каждом шаге.

Ещё два полезных примера:

\`\`\`js
// Фибоначчи
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
console.log([...take(fibonacci(), 10)]);   // [0,1,1,2,3,5,8,13,21,34]

// Генератор уникальных идентификаторов
function* idGenerator(prefix = 'id') {
  let n = 0;
  while (true) yield prefix + '-' + (++n);
}
const ids = idGenerator('user');
console.log(ids.next().value, ids.next().value);   // 'user-1' 'user-2'
\`\`\`

Отдельно про \`yield*\` — делегирование другому генератору:

\`\`\`js
function* inner() { yield 1; yield 2; }
function* outer() {
  yield 0;
  yield* inner();      // передаём управление другому генератору
  yield 3;
}
console.log([...outer()]);   // [0, 1, 2, 3]
\`\`\`

Это удобно для рекурсивных обходов — например, дерева:

\`\`\`js
function* walk(node) {
  yield node.value;
  for (const child of node.children ?? []) yield* walk(child);
}
\`\`\`

### Как на генераторах изобразить \`async/await\`?

Это самый глубокий подвопрос темы, и отвечать на него нужно с идеи, а не с кода.

**Идея:** \`await\` — это, по сути, \`yield\` промиса. Генератор отдаёт промис наружу, внешний «двигатель» его дожидается и возвращает результат обратно внутрь через \`next(value)\`. Генератор продолжается со следующей строки, как будто ничего не было.

\`\`\`js
function runGenerator(generatorFn) {
  return function (...args) {
    const iterator = generatorFn(...args);

    return new Promise((resolve, reject) => {
      function step(method, argument) {
        let result;
        try {
          result = iterator[method](argument);   // next(value) или throw(error)
        } catch (error) {
          return reject(error);                  // исключение внутри генератора
        }

        if (result.done) return resolve(result.value);   // генератор закончился

        // Ждём то, что нам отдали, и возвращаем результат внутрь
        Promise.resolve(result.value).then(
          value => step('next', value),          // успех → продолжаем
          error => step('throw', error)          // ошибка → бросаем внутрь генератора
        );
      }

      step('next');                              // первый запуск
    });
  };
}
\`\`\`

Теперь можно писать асинхронный код на генераторах:

\`\`\`js
const loadUser = runGenerator(function* (id) {
  const user = yield fetch('/api/users/' + id).then(r => r.json());
  const posts = yield fetch('/api/posts?user=' + user.id).then(r => r.json());
  return { user, posts };
});

loadUser(1).then(console.log);
\`\`\`

Сравните с современной записью — отличие только в ключевых словах:

\`\`\`js
async function loadUser(id) {
  const user = await fetch('/api/users/' + id).then(r => r.json());
  const posts = await fetch('/api/posts?user=' + user.id).then(r => r.json());
  return { user, posts };
}
\`\`\`

Три момента, которые делают эту реализацию правильной:

**\`iterator.throw(error)\`** — вот почему в генераторе работает \`try/catch\` вокруг \`yield\`. Мы бросаем ошибку внутрь, в точку паузы, и там её можно поймать обычным способом.

**\`Promise.resolve(result.value)\`** — генератор может отдать и не промис; обёртка приводит всё к единому виду. Ровно так же \`await 5\` работает с обычным числом.

**Рекурсивный \`step\`** — каждый шаг планирует следующий, и рекурсия идёт через микрозадачи, поэтому стек не растёт.

Исторически именно так и появился \`async/await\`. До его стандартизации библиотека \`co\` делала ровно то, что показано выше, а Babel и TypeScript до сих пор компилируют \`async\`-функции в генератор плюс подобный «двигатель» при сборке под старые браузеры.

## Что сказать на собеседовании

> Генератор — функция со звёздочкой, которую можно приостановить и продолжить. Её вызов не выполняет тело, а возвращает объект-итератор; каждый \`next()\` доводит выполнение до следующего \`yield\` и отдаёт объект \`{ value, done }\`, сохраняя все локальные переменные между вызовами. Связь двусторонняя: аргумент \`next(value)\` становится результатом того самого выражения \`yield\`, на котором генератор замер, — поэтому аргумент первого \`next\` всегда теряется, генератор ещё не дошёл до паузы. Ленивость позволяет писать бесконечные последовательности: \`while (true)\` с \`yield\` не вешает программу, потому что значения вычисляются по одному по запросу,. \`async/await\` — это, по сути, генератор плюс внешний двигатель: \`yield\` отдаёт промис, двигатель его дожидается и возвращает результат обратно через \`next\`, а ошибку — через \`throw\`.

## Ловушки

- **Вызов генератора ничего не выполняет** — тело запускается только на первом \`next()\`.
- **Аргумент первого \`next()\` теряется** — генератор ещё не дошёл ни до одного \`yield\`.
- **Значение \`return\` не попадает в \`for...of\` и спред** — они останавливаются на \`done: true\`.
- **Генератор одноразовый.** Пройти его дважды нельзя, нужно создавать новый.
- **Бесконечный генератор нельзя разложить спредом** — \`[...naturals()]\` повесит вкладку.
- **Стрелочная функция не может быть генератором** — только \`function*\` и методы объекта/класса.
- **\`yield\` внутри колбэка не работает**: \`arr.forEach(x => yield x)\` — синтаксическая ошибка, \`yield\` действует только в теле самого генератора.
- **\`break\` в \`for...of\` вызывает \`return()\` генератора** — блок \`finally\` при этом выполнится, и на это можно рассчитывать для очистки.`
    },
    codeSnippet: `function* naturals() { let n = 1; while (true) yield n++; }

function* take(it, count) {
  let i = 0;
  for (const v of it) { if (i++ >= count) return; yield v; }
}
function* map(it, fn) { for (const v of it) yield fn(v); }
function* filter(it, p) { for (const v of it) if (p(v)) yield v; }

// Из бесконечной последовательности — без единого промежуточного массива
console.log([...take(map(filter(naturals(), n => n % 2 === 0), n => n * n), 5)]);
// [4, 16, 36, 64, 100]

// Двусторонняя связь: next(value) становится результатом yield
function* dialogue() {
  const name = yield 'Как зовут?';
  return 'Привет, ' + name;
}
const d = dialogue();
console.log(d.next().value);          // 'Как зовут?'
console.log(d.next('Anton').value);   // 'Привет, Anton'

// async/await на генераторах
function runGenerator(genFn) {
  return (...args) => new Promise((resolve, reject) => {
    const it = genFn(...args);
    function step(method, arg) {
      let r;
      try { r = it[method](arg); } catch (e) { return reject(e); }
      if (r.done) return resolve(r.value);
      Promise.resolve(r.value).then(v => step('next', v), e => step('throw', e));
    }
    step('next');
  });
}

const load = runGenerator(function* (id) {
  const user = yield Promise.resolve({ id, name: 'A' });
  return user.name;
});
load(1).then(console.log);   // 'A'`
  },
  {
    id: 'js-046',
    category: 'js-state',
    level: 'Expert',
    tags: ['garbage-collection', 'memory-leaks', 'weakmap'],
    question: {
      ru: 'Память и сборка мусора: как работает mark-and-sweep и что такое достижимость, типичные утечки на фронтенде, чем `WeakMap` отличается от `Map` и как замыкание удерживает большой объект'
    },
    answer: {
      ru: `## Коротко

**В JavaScript память освобождается автоматически. Правило одно: объект жив, пока до него можно добраться.**

«Добраться» — значит пройти по ссылкам от так называемых корней: глобального объекта, текущего стека вызовов, активных замыканий. Если такого пути нет, объект считается мусором и будет удалён.

Аналогия: комната со шкафами, связанными верёвками. Сборщик мусора берёт верёвки, тянущиеся от двери, обходит всё, до чего дотянулся, и помечает мелом. Всё непомеченное выносят — неважно, связаны ли эти шкафы между собой.

## Как это работает по шагам

1. Сборщик берёт набор **корней**: глобальный объект, переменные в стеке вызовов, замыкания живых функций.
2. **Фаза пометки (mark):** от корней обходятся все достижимые объекты и помечаются как живые.
3. **Фаза очистки (sweep):** вся непомеченная память освобождается.
4. Современные движки делают это **по поколениям**: новые объекты живут в маленькой области и собираются часто, пережившие несколько сборок переезжают в «старую» область, которая собирается редко.
5. Работа сборщика **приостанавливает выполнение** кода, поэтому его стараются делать инкрементальным — маленькими порциями между задачами.

### Как работает mark-and-sweep, что такое достижимость?

**Достижимость** — единственный критерий, по которому решается судьба объекта.

\`\`\`js
let user = { name: 'Anton' };   // объект достижим через переменную user
user = null;                     // ссылок больше нет → объект станет мусором
\`\`\`

Ключевое: считается **не количество ссылок**, а **наличие пути от корня**. Это принципиально, потому что решает проблему циклических ссылок:

\`\`\`js
function createPair() {
  const a = {};
  const b = {};
  a.partner = b;
  b.partner = a;      // ссылаются друг на друга
  return 'готово';    // наружу не отдали ни a, ни b
}
createPair();
// Оба объекта будут удалены: ссылки друг на друга есть,
// но пути от корня нет
\`\`\`

Старый алгоритм **подсчёта ссылок** здесь бы не справился: у каждого объекта по одной ссылке, значит «удалять нельзя». Именно поэтому в старых браузерах пара DOM-узел ↔ JavaScript-объект давала вечную утечку. Mark-and-sweep эту проблему решает по определению.

Что считается **корнями**:

- глобальный объект (\`window\`, \`globalThis\`) и всё, что на нём висит;
- локальные переменные и параметры функций, находящихся сейчас в стеке вызовов;
- переменные, захваченные живыми замыканиями;
- сам DOM-документ и элементы, вставленные в него.

Про **сборку по поколениям** стоит сказать отдельно, потому что это объясняет реальное поведение:

- большинство объектов живут очень недолго — их создали в функции и сразу забыли;
- поэтому новая память выделяется в небольшой области, которая собирается часто и быстро;
- объект, переживший пару сборок, переезжает в «старую» область, где сборка идёт редко и дорого.

Практический вывод: **временные объекты почти бесплатны**, а вот долгоживущие структуры стоит проектировать аккуратно.

Важно понимать и то, что **сборщиком нельзя управлять**. Нет способа вызвать сборку принудительно из кода, нет гарантий, когда она произойдёт. \`delete\` не освобождает память — он лишь удаляет свойство объекта:

\`\`\`js
const obj = { big: new Array(1e6) };
delete obj.big;       // удалили ссылку — массив станет недостижим
                      // но когда его соберут, решает движок
\`\`\`

### Назови типичные утечки во фронтенде и как их находить

Утечка — это когда объект **больше не нужен, но всё ещё достижим**. Пять самых частых случаев.

**1. Не снятые обработчики событий.**

\`\`\`js
function setupWidget() {
  const bigData = new Array(1e6).fill('x');
  window.addEventListener('resize', () => {
    console.log(bigData.length);   // замыкание держит bigData навсегда
  });
}
\`\`\`

Обработчик на \`window\` живёт всю жизнь страницы. Компонент давно удалён, а его данные — нет.

**2. Таймеры и интервалы.**

\`\`\`js
class Widget {
  constructor(element) {
    this.element = element;
    setInterval(() => this.update(), 1000);   // никогда не остановится
  }
}
\`\`\`

Интервал держит \`this\`, \`this\` держит DOM-элемент. Даже если элемент удалён из документа, из памяти он не уйдёт.

**3. Ссылки на удалённые DOM-узлы.**

\`\`\`js
const cache = {};
cache.row = document.getElementById('big-table-row');
document.getElementById('big-table').remove();
// Таблица удалена из документа, но строка в кеше держит весь узел
// вместе с его потомками
\`\`\`

**4. Растущие кеши без ограничения.**

\`\`\`js
const cache = new Map();
function getUser(id) {
  if (!cache.has(id)) cache.set(id, fetchUser(id));
  return cache.get(id);   // кеш только растёт
}
\`\`\`

**5. Забытые подписки** — на события, на потоки данных, на хранилище состояния. В Angular это неотписанные \`subscribe\`, в React — подписки без функции очистки.

Как **находить** утечки — практический порядок действий:

1. **Вкладка Memory в DevTools, снимок кучи (heap snapshot).** Сделать снимок, выполнить действие (открыть и закрыть компонент), сделать второй снимок и сравнить через режим «Objects allocated between snapshots».
2. **Приём трёх снимков.** Снимок → действие → снимок → повторить действие → снимок. Если между вторым и третьим объекты накапливаются, утечка есть.
3. **Performance monitor** — вкладка Performance с галочкой Memory. Пилообразный график нормален, а вот постоянно растущая нижняя граница — признак утечки.
4. **Счётчик DOM-узлов** там же. Если он растёт после закрытия компонентов — значит узлы удерживаются из JavaScript.
5. **Retainers в снимке кучи.** Выбрав объект, можно посмотреть цепочку ссылок, которая держит его от корня. Это и есть точный ответ на вопрос «кто виноват».

Профилактика простая и работает почти всегда: **на каждую подписку — отписка, на каждый таймер — очистка, на каждый кеш — ограничение**.

\`\`\`js
class Widget {
  #controller = new AbortController();
  #timerId = null;

  constructor(element) {
    this.element = element;
    window.addEventListener('resize', this.onResize, { signal: this.#controller.signal });
    this.#timerId = setInterval(() => this.update(), 1000);
  }

  destroy() {
    this.#controller.abort();       // снимает все обработчики разом
    clearInterval(this.#timerId);
    this.element = null;            // отпускаем DOM
  }
}
\`\`\`

### Чем \`WeakMap\` отличается от \`Map\` и когда он спасает?

Главное отличие: **\`WeakMap\` держит ключи «слабо» — его ссылки не мешают сборщику удалить объект.**

\`\`\`js
let element = document.createElement('div');

const strong = new Map();
strong.set(element, { clicks: 0 });

const weak = new WeakMap();
weak.set(element, { clicks: 0 });

element = null;
// В strong запись остаётся навсегда — Map держит элемент живым.
// В weak запись исчезнет вместе с элементом при ближайшей сборке.
\`\`\`

Остальные отличия — прямое следствие этого:

- **ключами могут быть только объекты** (и с недавних пор символы), но не строки и числа;
- **нет \`size\`** — неизвестно, сколько записей осталось после сборки;
- **нельзя перебрать** — нет \`keys\`, \`values\`, \`entries\`, \`forEach\`;
- **нет \`clear\`**.

Причина ограничений одна: перебор дал бы возможность наблюдать за работой сборщика мусора, а это сделало бы поведение программы непредсказуемым.

Три задачи, где \`WeakMap\` действительно спасает.

**1. Метаданные, привязанные к чужим объектам.**

\`\`\`js
const metadata = new WeakMap();

function trackElement(element) {
  metadata.set(element, { clicks: 0, created: Date.now() });
}
function registerClick(element) {
  const data = metadata.get(element);
  if (data) data.clicks++;
}
// Элемент удалили из DOM → метаданные исчезли сами
\`\`\`

С обычным \`Map\` пришлось бы вручную вызывать \`delete\` при каждом удалении элемента — и одна забытая строка давала бы утечку.

**2. Приватные данные экземпляров** — классический приём до появления полей \`#\`:

\`\`\`js
const privateData = new WeakMap();

class BankAccount {
  constructor(balance) {
    privateData.set(this, { balance });
  }
  getBalance() {
    return privateData.get(this).balance;
  }
}
// Снаружи до balance не добраться, а при удалении объекта данные освободятся
\`\`\`

**3. Кеш, который не удерживает объекты:**

\`\`\`js
const resultCache = new WeakMap();

function expensiveCompute(obj) {
  if (resultCache.has(obj)) return resultCache.get(obj);
  const result = heavyWork(obj);
  resultCache.set(obj, result);
  return result;
}
\`\`\`

Такой кеш **невозможно переполнить**: он живёт ровно столько, сколько живут сами объекты.

Рядом стоит упомянуть **\`WeakRef\` и \`FinalizationRegistry\`** — более тонкие инструменты:

\`\`\`js
const ref = new WeakRef(bigObject);
const value = ref.deref();     // вернёт объект или undefined, если его собрали
\`\`\`

Пользоваться ими стоит с осторожностью: момент сборки непредсказуем, и логика, зависящая от него, становится невоспроизводимой. В обычном прикладном коде они почти никогда не нужны.

### Может ли замыкание удерживать большой объект — покажи как

Да, и это одна из самых частых причин утечек, потому что выглядит совершенно безобидно.

\`\`\`js
function createHandler() {
  const hugeData = new Array(1e6).fill('данные');   // несколько мегабайт
  const smallValue = hugeData.length;

  return function () {
    console.log(smallValue);    // используем только число…
  };
}

const handler = createHandler();
// …но hugeData остаётся в памяти, потому что замыкание держит всё окружение
\`\`\`

Замыкание сохраняет ссылку на **лексическое окружение целиком**, а не на отдельные использованные переменные. Движки умеют оптимизировать и захватывать только нужное, но это оптимизация, а не гарантия спецификации — особенно она не работает, если в коде есть \`eval\` или отладчик.

Ещё коварнее случай, когда **несколько функций делят одно окружение**:

\`\`\`js
function setup() {
  const hugeData = new Array(1e6).fill('x');

  const useHuge = () => hugeData.length;      // эту не возвращаем
  const useSmall = () => 'ничего тяжёлого';   // а эту возвращаем наружу

  return useSmall;
}

const fn = setup();
// hugeData может остаться живым: обе функции созданы в одном окружении,
// и движок не обязан разделять их захваты
\`\`\`

Как правильно:

\`\`\`js
function createHandler() {
  let hugeData = new Array(1e6).fill('данные');
  const smallValue = hugeData.length;   // забрали только нужное
  hugeData = null;                       // явно отпустили большой объект

  return function () {
    console.log(smallValue);
  };
}
\`\`\`

Три правила, которые закрывают проблему:

1. **Извлекайте из большого объекта только нужные поля** в отдельные переменные.
2. **Обнуляйте ссылку** на большой объект перед созданием долгоживущей функции.
3. **Не создавайте долгоживущие замыкания в области видимости, где лежат тяжёлые данные** — вынесите их в отдельную функцию.

Увидеть это в DevTools можно так: в снимке кучи найти объект, посмотреть его retainers и увидеть в цепочке запись вида \`context in someFunction\` — это и есть захваченное окружение замыкания.

## Что сказать на собеседовании

> Память освобождается автоматически по алгоритму mark-and-sweep: сборщик берёт корни — глобальный объект, стек вызовов, живые замыкания — обходит по ссылкам всё достижимое и помечает, а непомеченное освобождает. Критерий именно достижимость, а не число ссылок, поэтому циклические ссылки собираются нормально, в отличие от старого подсчёта ссылок. Типичные утечки на фронтенде — неснятые обработчики, незачищенные таймеры, ссылки на удалённые DOM-узлы и растущие кеши; ищут их тремя снимками кучи в DevTools и смотрят retainers. \`WeakMap\` держит ключи слабо и поэтому не мешает сборке — за это платит отсутствием перебора и \`size\`. И да, замыкание удерживает всё лексическое окружение целиком, а не только использованные переменные.

## Ловушки

- **\`delete\` не освобождает память** — он удаляет свойство; память освободится, когда объект станет недостижим.
- **Вызвать сборку мусора из кода нельзя** и момент её работы непредсказуем.
- **Замыкание держит окружение целиком** — оптимизация захвата только используемых переменных не гарантирована.
- **Обработчик на \`window\` или \`document\` живёт всю жизнь страницы** и удерживает всё, что захватил.
- **Удаление узла из DOM не освобождает его**, если на него осталась ссылка из JavaScript.
- **\`WeakMap\` нельзя перебрать и у него нет \`size\`** — это принципиальное ограничение, а не недоработка.
- **\`WeakRef\` и \`FinalizationRegistry\` непредсказуемы по времени** — строить на них логику приложения нельзя.
- **Рост памяти сам по себе не утечка.** Смотреть надо на нижнюю границу графика после сборок: если она растёт — проблема есть.`
    },
    codeSnippet: `// Достижимость, а не счётчик ссылок: цикл собирается нормально
function makeCycle() {
  const a = {}, b = {};
  a.b = b; b.a = a;      // ссылаются друг на друга
  return 'ничего наружу';
}
makeCycle();             // оба объекта будут собраны

// Замыкание держит окружение целиком
function leaky() {
  const huge = new Array(1e6).fill('x');
  const size = huge.length;
  return () => size;      // используем только число, но huge может остаться живым
}

function fixed() {
  let huge = new Array(1e6).fill('x');
  const size = huge.length;
  huge = null;            // явно отпускаем
  return () => size;
}

// WeakMap не удерживает ключ
let el = document.createElement('div');
const strong = new Map([[el, 'данные']]);
const weak = new WeakMap([[el, 'данные']]);
el = null;
// strong держит элемент навсегда; из weak запись уйдёт при сборке

// Обязательная уборка
class Widget {
  #ac = new AbortController();
  #timer = setInterval(() => this.tick(), 1000);
  constructor(el) {
    this.el = el;
    window.addEventListener('resize', this.onResize, { signal: this.#ac.signal });
  }
  destroy() { this.#ac.abort(); clearInterval(this.#timer); this.el = null; }
}`
  },
  {
    id: 'js-047',
    category: 'js-state',
    level: 'Expert',
    tags: ['iterators', 'symbol-iterator', 'protocols'],
    question: {
      ru: 'Итераторы: что должен вернуть `Symbol.iterator`, как сделать объект перебираемым для `for...of` и spread, как реализовать диапазон без создания массива'
    },
    answer: {
      ru: `## Коротко

**Протокол перебора — это договорённость: «если у объекта есть метод \`Symbol.iterator\`, значит его можно перебирать».** Всё, что работает с \`for...of\`, спредом и деструктуризацией, опирается только на эту договорённость.

Протоколов на самом деле два:

- **Iterable (перебираемый)** — у объекта есть метод \`[Symbol.iterator]()\`, который возвращает итератор.
- **Iterator (итератор)** — у объекта есть метод \`next()\`, возвращающий \`{ value, done }\`.

Аналогия: iterable — это книга, у которой есть закладка. Iterator — сама закладка, которая умеет отвечать «вот следующая страница» или «книга закончилась».

## Как это работает по шагам

1. \`for...of\` вызывает у значения метод \`[Symbol.iterator]()\` и получает итератор.
2. Вызывает \`next()\` и смотрит на результат: если \`done: false\`, берёт \`value\` и выполняет тело цикла.
3. Повторяет, пока \`next()\` не вернёт \`done: true\`.
4. При досрочном выходе (\`break\`, \`return\`, исключение) вызывается необязательный метод \`return()\` — место для очистки ресурсов.
5. Спред, \`Array.from\`, деструктуризация массива, \`Promise.all\`, конструкторы \`Map\` и \`Set\` работают по тому же протоколу.

### Опиши протокол: что должен вернуть \`Symbol.iterator\`?

**\`[Symbol.iterator]()\` должен вернуть объект-итератор — то есть объект с методом \`next()\`.**

\`next()\`, в свою очередь, возвращает объект с двумя полями:

- **\`value\`** — очередное значение;
- **\`done\`** — \`false\`, если значения ещё есть, и \`true\`, когда перебор закончен.

Минимальная ручная реализация, без всякого сахара:

\`\`\`js
const iterable = {
  [Symbol.iterator]() {
    let current = 1;

    return {
      next() {
        if (current <= 3) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
};

for (const value of iterable) console.log(value);   // 1, 2, 3
console.log([...iterable]);                          // [1, 2, 3]
\`\`\`

Разберём, почему всё устроено именно так.

**Почему \`Symbol.iterator\`, а не строка \`'iterator'\`?** Чтобы гарантированно не столкнуться с существующим свойством. Символ уникален, и объект с полем \`iterator\` случайно не станет перебираемым.

**Почему метод возвращает новый итератор при каждом вызове?** Чтобы объект можно было перебрать несколько раз, в том числе вложенными циклами. Переменная \`current\` живёт в замыкании конкретного итератора.

Проверить, перебираемо ли значение, можно напрямую:

\`\`\`js
const isIterable = v => v != null && typeof v[Symbol.iterator] === 'function';

console.log(isIterable([]));        // true
console.log(isIterable('строка'));  // true
console.log(isIterable(new Set())); // true
console.log(isIterable({}));        // false
\`\`\`

Есть ещё **необязательный метод \`return()\`** — его вызывают при досрочном выходе:

\`\`\`js
const withCleanup = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => (i < 5 ? { value: i++, done: false } : { done: true }),
      return(value) {
        console.log('досрочный выход — освобождаем ресурсы');
        return { value, done: true };
      }
    };
  }
};

for (const v of withCleanup) {
  if (v === 2) break;   // сработает return()
}
// 'досрочный выход — освобождаем ресурсы'
\`\`\`

Это важно для итераторов, за которыми стоит файл, сетевое соединение или курсор базы данных.

И третий, редко упоминаемый метод — **\`throw()\`**, он используется генераторами для проброса ошибки внутрь.

Разделение на два протокола даёт полезное свойство: **итератор может быть одновременно и iterable**, если вернёт сам себя:

\`\`\`js
const selfIterable = {
  [Symbol.iterator]() { return this; },
  next() { /* ... */ }
};
\`\`\`

Именно так устроены генераторы — поэтому объект генератора можно и перебирать в \`for...of\`, и вызывать у него \`next()\` вручную.

### Сделай объект итерируемым, чтобы он работал в \`for...of\` и spread

Есть два способа: вручную и через генератор.

**Способ 1 — вручную**, как выше. Полезно уметь, но многословно.

**Способ 2 — через генератор.** Гораздо короче, потому что генератор сам реализует оба протокола:

\`\`\`js
const user = {
  name: 'Anton',
  age: 30,
  city: 'Минск',

  *[Symbol.iterator]() {
    for (const key of Object.keys(this)) {
      yield [key, this[key]];         // отдаём пары «ключ-значение»
    }
  }
};

for (const [key, value] of user) console.log(key, '=', value);
// name = Anton
// age = 30
// city = Минск

console.log([...user]);                  // [['name','Anton'], ['age',30], ['city','Минск']]
console.log(Object.fromEntries(user));   // { name: 'Anton', age: 30, city: 'Минск' }
\`\`\`

Обратите внимание на звёздочку перед \`[Symbol.iterator]\` — это метод-генератор. Внутри доступен \`this\`, потому что это обычный метод, а не стрелка.

Более практический пример — **коллекция как объект**:

\`\`\`js
class Playlist {
  #tracks = [];

  add(track) { this.#tracks.push(track); return this; }

  *[Symbol.iterator]() {
    yield* this.#tracks;              // делегируем массиву
  }

  // Дополнительные способы обхода — как отдельные методы
  *reversed() {
    for (let i = this.#tracks.length - 1; i >= 0; i--) yield this.#tracks[i];
  }
}

const playlist = new Playlist().add('песня 1').add('песня 2').add('песня 3');

for (const track of playlist) console.log(track);     // по порядку
console.log([...playlist.reversed()]);                 // в обратном порядке
console.log([...playlist]);                            // ['песня 1', ...]

const [first, ...rest] = playlist;                     // деструктуризация работает
console.log(first, rest);                              // 'песня 1' ['песня 2','песня 3']
\`\`\`

Приём с **дополнительными методами-генераторами** (\`reversed\`, \`entries\`, \`values\`) — стандартный способ дать несколько стратегий обхода: основной в \`Symbol.iterator\`, остальные отдельными методами. Так устроены и встроенные \`Map\` и \`Set\`.

Что именно вы получаете, реализовав протокол:

\`\`\`js
for (const x of obj) {}         // for...of
const arr = [...obj];            // спред
const arr2 = Array.from(obj);    // Array.from
const [a, b] = obj;              // деструктуризация
new Set(obj);                    // конструкторы коллекций
new Map(obj);                    // если отдаём пары
Promise.all(obj);                // и даже это
fn(...obj);                      // спред в аргументах
\`\`\`

Всё это — одна реализация, семь возможностей.

### Как реализовать диапазон без создания массива?

Задача: получить числа от 1 до миллиона, **не создавая массив из миллиона элементов**.

Наивное решение расходует память впустую:

\`\`\`js
const numbers = Array.from({ length: 1_000_000 }, (_, i) => i + 1);
// Массив занимает несколько мегабайт, даже если нам нужны первые 10 чисел
\`\`\`

Ленивая реализация через генератор:

\`\`\`js
function* range(start, end, step = 1) {
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    yield i;
  }
}

for (const n of range(1, 1_000_000)) {
  if (n > 5) break;
  console.log(n);          // 1, 2, 3, 4, 5 — дальше ничего не вычислялось
}

console.log([...range(0, 10, 3)]);      // [0, 3, 6, 9]
console.log([...range(10, 0, -2)]);     // [10, 8, 6, 4, 2]
\`\`\`

Здесь в памяти в каждый момент существует **ровно одно число**. Цикл прервался на пятом — остальные 999 995 значений никогда не вычислялись.

Тот же диапазон как объект, вручную — полезно уметь показать без генераторов:

\`\`\`js
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const { end, step } = this;

    return {
      next: () => (step > 0 ? current < end : current > end)
        ? { value: (current += step) - step, done: false }
        : { value: undefined, done: true },

      [Symbol.iterator]() { return this; }   // итератор сам перебираем
    };
  }

  get length() {
    return Math.max(0, Math.ceil((this.end - this.start) / this.step));
  }

  includes(n) {                              // проверка без перебора
    return n >= Math.min(this.start, this.end) &&
           n < Math.max(this.start, this.end) &&
           (n - this.start) % this.step === 0;
  }
}

const r = new Range(0, 1_000_000);
console.log(r.length);          // 1000000 — посчитано формулой, без обхода
console.log(r.includes(500));   // true — тоже без обхода
console.log([...new Range(0, 5)]);   // [0, 1, 2, 3, 4]
\`\`\`

Обратите внимание на методы \`length\` и \`includes\`: у ленивой структуры они вычисляются **формулой**, а не перебором. Это вторая большая выгода ленивости.

Та же идея применима к постраничной загрузке данных:

\`\`\`js
async function* fetchAllPages(url) {
  let page = 1;
  while (true) {
    const response = await fetch(url + '?page=' + page);
    const data = await response.json();
    if (data.items.length === 0) return;

    yield* data.items;          // отдаём элементы по одному
    page++;
  }
}

for await (const item of fetchAllPages('/api/items')) {
  console.log(item);
  if (someCondition) break;     // прекратим — и лишние страницы не загрузятся
}
\`\`\`

Это **асинхронный итератор**: у него \`Symbol.asyncIterator\` вместо \`Symbol.iterator\`, а перебирается он через \`for await...of\`. Данные загружаются по мере надобности, и досрочный выход экономит настоящие сетевые запросы.

## Что сказать на собеседовании

> Протоколов два. Iterable — это объект с методом \`Symbol.iterator\`, который возвращает итератор. Iterator — объект с методом \`next()\`, возвращающим \`{ value, done }\`. \`for...of\` сначала вызывает \`Symbol.iterator\`, получает итератор и дальше дёргает \`next()\`, пока не придёт \`done: true\`; при досрочном выходе он вызывает необязательный \`return()\`, и это удобное место для очистки ресурсов. Реализовав протокол один раз, объект сразу получает \`for...of\`, спред, \`Array.from\`, деструктуризацию и конструкторы \`Map\` и \`Set\`. Проще всего сделать это методом-генератором — генератор реализует оба протокола сам. Ленивый диапазон на генераторе хранит в памяти ровно одно число вместо миллиона, а \`length\` и \`includes\` у него считаются формулой без обхода.

## Ловушки

- **\`Symbol.iterator\` должен возвращать новый итератор при каждом вызове** — иначе объект получится одноразовым и сломается во вложенных циклах.
- **Итератор одноразовый по природе.** Генератор нельзя пройти дважды, нужно создавать заново.
- **Бесконечный итератор нельзя разложить спредом** — вкладка зависнет.
- **\`for...in\` и \`for...of\` — разные механизмы.** Первый перебирает ключи и не использует протокол вообще.
- **Стрелочная функция не годится для \`[Symbol.iterator]\`**, если внутри нужен \`this\` объекта.
- **Забытый \`done: true\`** даёт бесконечный цикл.
- **\`return()\` не вызывается при обычном завершении перебора** — только при досрочном выходе.
- **Асинхронный итератор использует \`Symbol.asyncIterator\`** и работает только с \`for await...of\`; обычный \`for...of\` его не увидит.`
    },
    codeSnippet: `// Протокол вручную
const three = {
  [Symbol.iterator]() {
    let n = 1;
    return { next: () => (n <= 3 ? { value: n++, done: false } : { done: true }) };
  }
};
console.log([...three]);              // [1, 2, 3]

// То же самое генератором — короче и сразу оба протокола
const user = {
  name: 'Anton', age: 30,
  *[Symbol.iterator]() { for (const k of Object.keys(this)) yield [k, this[k]]; }
};
console.log(Object.fromEntries(user));   // { name: 'Anton', age: 30 }
const [firstPair] = user;
console.log(firstPair);                   // ['name', 'Anton']

// Ленивый диапазон: в памяти всегда одно число
function* range(start, end, step = 1) {
  for (let i = start; step > 0 ? i < end : i > end; i += step) yield i;
}
for (const n of range(1, 1_000_000)) { if (n > 3) break; console.log(n); }  // 1 2 3
console.log([...range(10, 0, -3)]);   // [10, 7, 4, 1]

// Очистка при досрочном выходе
const withCleanup = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => (i < 5 ? { value: i++, done: false } : { done: true }),
      return: (v) => { console.log('очистка'); return { value: v, done: true }; }
    };
  }
};
for (const v of withCleanup) if (v === 1) break;   // 'очистка'`
  },
  {
    id: 'js-048',
    category: 'js-state',
    level: 'Expert',
    tags: ['patterns', 'event-emitter', 'observer'],
    question: {
      ru: 'Паттерны: реализуй `EventEmitter` с `on`/`off`/`once`/`emit`, синглтон на модулях и чем он плох, разница observer и pub/sub'
    },
    answer: {
      ru: `## Коротко

Три паттерна, которые чаще всего просят на фронтенде:

- **EventEmitter** — объект, на события которого можно подписаться. Основа всей событийной модели.
- **Синглтон** — гарантия, что объект в приложении ровно один.
- **Observer / Pub-Sub** — два похожих способа оповещать заинтересованных об изменениях.

Аналогия для наблюдателей: **observer** — это когда вы подписались лично на конкретного человека и он звонит вам напрямую. **Pub-sub** — когда вы подписались на рассылку через почтовую службу: отправитель не знает вас, вы не знаете его, всё идёт через посредника.

## Как это работает по шагам

1. EventEmitter хранит словарь «имя события → список обработчиков».
2. \`on\` добавляет обработчик в список, \`off\` — удаляет его по ссылке.
3. \`emit\` перебирает копию списка и вызывает каждый обработчик с переданными аргументами.
4. \`once\` добавляет обёртку, которая снимает саму себя сразу после первого вызова.
5. Каждый обработчик стоит оборачивать в \`try/catch\`, чтобы один упавший не остановил остальные.

### Реализуй \`EventEmitter\` с \`on\` / \`off\` / \`once\` / \`emit\`

\`\`\`js
class EventEmitter {
  #listeners = new Map();          // событие → Set обработчиков

  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);

    return () => this.off(event, handler);   // возвращаем функцию отписки
  }

  off(event, handler) {
    const set = this.#listeners.get(event);
    if (!set) return this;

    if (handler === undefined) {
      this.#listeners.delete(event);          // снять все обработчики события
    } else {
      set.delete(handler);
      if (set.size === 0) this.#listeners.delete(event);   // не копим пустые Set
    }
    return this;
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);               // снимаем ДО вызова
      handler.apply(this, args);
    };
    wrapper.original = handler;               // чтобы off(event, handler) сработал
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const set = this.#listeners.get(event);
    if (!set || set.size === 0) return false;

    // Копия: обработчик может подписаться или отписаться прямо во время emit
    for (const handler of [...set]) {
      try {
        handler.apply(this, args);
      } catch (error) {
        console.error('обработчик события "' + event + '" упал:', error);
      }
    }
    return true;
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.size ?? 0;
  }

  removeAllListeners() {
    this.#listeners.clear();
    return this;
  }
}
\`\`\`

Разберём шесть решений, которые здесь важны — именно их и спрашивают.

**\`Map\` и \`Set\` вместо объекта и массива.** \`Set\` автоматически защищает от двойной подписки одной и той же функции, а удаление из него — константное по времени, в отличие от \`indexOf\` + \`splice\` в массиве.

**\`on\` возвращает функцию отписки.** Это гораздо удобнее, чем помнить и событие, и точную ссылку на обработчик.

**В \`once\` отписка идёт ДО вызова.** Если бы сначала вызывался обработчик, а он изнутри делал новый \`emit\` того же события, обёртка сработала бы повторно.

**Копия набора в \`emit\`.** Обработчик может внутри себя вызвать \`off\` или \`on\`. Если перебирать живой набор, это приведёт к пропущенным или задвоенным вызовам.

**\`try/catch\` вокруг каждого обработчика.** Один упавший обработчик не должен мешать остальным.

**Очистка пустых наборов.** Без этого словарь будет расти именами событий, на которые уже никто не подписан.

Использование:

\`\`\`js
const emitter = new EventEmitter();

const unsubscribe = emitter.on('data', value => console.log('получили', value));
emitter.once('ready', () => console.log('готово — только один раз'));

emitter.emit('ready');    // 'готово — только один раз'
emitter.emit('ready');    // ничего

emitter.emit('data', 42); // 'получили 42'
unsubscribe();
emitter.emit('data', 99); // ничего
\`\`\`

Частое дополнение — **поддержка приоритетов, пространств имён или обработчика на все события**:

\`\`\`js
emit(event, ...args) {
  // ...вызвали обработчики события
  const wildcard = this.#listeners.get('*');
  if (wildcard) for (const h of [...wildcard]) h(event, ...args);
}
\`\`\`

Такой обработчик удобен для логирования и отладки.

### Как сделать синглтон на модулях и чем он плох?

**На модулях синглтон делается почти бесплатно**, потому что модуль выполняется ровно один раз, а дальше все импорты получают один и тот же экспорт:

\`\`\`js
// logger.js
class Logger {
  #entries = [];
  log(message) { this.#entries.push({ message, time: Date.now() }); }
  getAll() { return [...this.#entries]; }
}

export default new Logger();     // экземпляр создаётся один раз

// a.js
import logger from './logger.js';
logger.log('из A');

// b.js
import logger from './logger.js';
console.log(logger.getAll());    // ['из A'] — тот же самый объект
\`\`\`

Более гибкий вариант — **ленивая инициализация**, когда объект создаётся только при первом обращении:

\`\`\`js
let instance = null;

export function getLogger() {
  if (!instance) instance = new Logger();
  return instance;
}
\`\`\`

Классический вариант через конструктор — тоже стоит уметь показать:

\`\`\`js
class Config {
  static #instance = null;

  constructor() {
    if (Config.#instance) return Config.#instance;   // возврат объекта из конструктора
    Config.#instance = this;
  }
}
console.log(new Config() === new Config());   // true
\`\`\`

Здесь работает правило оператора \`new\`: если конструктор вернул объект, возвращается именно он.

**Чем синглтон плох** — четыре содержательные претензии:

**1. Скрытая глобальная зависимость.** Модуль импортирует синглтон напрямую, и по сигнатуре функции этого не видно. Читая код, невозможно понять, от чего он зависит:

\`\`\`js
import logger from './logger.js';

export function processOrder(order) {
  logger.log('обработка');       // зависимость не видна снаружи
  return order.total;
}
\`\`\`

**2. Тяжело тестировать.** Состояние сохраняется между тестами, и они начинают влиять друг на друга:

\`\`\`js
test('первый', () => { logger.log('a'); expect(logger.getAll().length).toBe(1); });
test('второй', () => { expect(logger.getAll().length).toBe(0); });   // упадёт: там уже запись
\`\`\`

Нужны либо методы сброса, либо подмена модуля средствами тестового фреймворка — и то и другое усложняет тесты.

**3. Проблема на сервере.** При серверном рендеринге один процесс обслуживает много пользователей, и синглтон становится **общим для всех запросов**. Данные одного пользователя могут утечь другому — это уже не неудобство, а уязвимость.

**4. Порядок инициализации и циклические зависимости.** Синглтон создаётся при первом импорте модуля, а порядок импортов не всегда очевиден. При циклических зависимостях можно получить наполовину инициализированный объект.

Альтернатива — **внедрение зависимости**: передавать объект явно, параметром или через контейнер.

\`\`\`js
export function processOrder(order, logger) {
  logger.log('обработка');
  return order.total;
}
// В тесте достаточно передать заглушку — никакой магии
\`\`\`

Именно поэтому в Angular сервисы не пишут синглтонами вручную: контейнер внедрения зависимостей даёт один экземпляр на нужную область видимости, но при этом зависимость видна в конструкторе и легко подменяется в тестах.

Когда синглтон **уместен**: логгер, конфигурация, пул соединений, кеш — то, что действительно должно быть одно и у чего нет пользовательского состояния.

### Где в реальном коде ты применял observer и чем он отличается от pub/sub?

**Observer** — субъект **сам знает** своих наблюдателей и вызывает их напрямую:

\`\`\`js
class Store {
  #observers = new Set();
  #state = {};

  subscribe(observer) {
    this.#observers.add(observer);
    return () => this.#observers.delete(observer);
  }

  setState(partial) {
    this.#state = { ...this.#state, ...partial };
    this.#observers.forEach(observer => observer(this.#state));   // зовём напрямую
  }
}

const store = new Store();
const unsub = store.subscribe(state => render(state));
store.setState({ user: 'Anton' });
\`\`\`

Здесь есть **прямая связь**: у \`store\` в поле лежат ссылки на наблюдателей.

**Pub-Sub** — издатель и подписчик **не знают друг о друге**, между ними посредник:

\`\`\`js
const bus = new EventEmitter();      // посредник

// Издатель: знает только имя события
function checkout(order) {
  processPayment(order);
  bus.emit('order:completed', order);
}

// Подписчики: знают только имя события
bus.on('order:completed', order => sendEmail(order));
bus.on('order:completed', order => updateAnalytics(order));
bus.on('order:completed', order => clearCart());
\`\`\`

Функция \`checkout\` ничего не знает ни про почту, ни про аналитику. Можно добавить четвёртого подписчика, не трогая её код вообще.

Четыре отличия по пунктам:

- **Связанность.** Observer: субъект хранит ссылки на наблюдателей. Pub-sub: обе стороны знают только посредника и имя события.
- **Адресация.** Observer: «оповести моих наблюдателей». Pub-sub: «отправь событие с таким именем».
- **Типизация.** Observer типизируется хорошо — интерфейс наблюдателя известен. Pub-sub типизируется плохо: события это строки, и опечатка в имени молча ничего не сломает.
- **Отладка.** В observer видно, кто на кого подписан. В pub-sub найти всех подписчиков события бывает трудно — это главный практический минус.

Где это встречается в реальной работе:

**Observer** — везде, где есть реактивное состояние: подписка на \`Observable\` в RxJS, \`store.subscribe\` в Redux, эффекты и сигналы в Angular, \`MutationObserver\`, \`IntersectionObserver\`, \`ResizeObserver\` в браузере.

**Pub-Sub** — событийная шина между слабо связанными частями приложения: оповещение «пользователь вышел», взаимодействие микрофронтендов, \`postMessage\` между вкладками и iframe, серверные очереди сообщений.

Практический совет для ответа: **pub-sub легко превращается в кашу**. Когда событий становится много, поток управления перестаёт быть виден, и отладка превращается в поиск по строковым именам. Поэтому его берут для действительно независимых частей системы, а внутри одного модуля предпочитают прямые вызовы или observer.

## Что сказать на собеседовании

> EventEmitter я реализую на \`Map\` из имени события в \`Set\` обработчиков: \`Set\` защищает от двойной подписки и даёт быстрое удаление. В \`once\` обёртка снимает себя до вызова оригинала, иначе повторный \`emit\` изнутри обработчика вызовет её ещё раз. В \`emit\` обязательно перебираю копию набора, потому что обработчик может подписаться или отписаться прямо во время рассылки, и каждый вызов оборачиваю в \`try/catch\`, чтобы один упавший не остановил остальных. Синглтон на модулях получается сам собой, потому что модуль выполняется один раз, но он плох скрытой зависимостью, состоянием, протекающим между тестами, и тем, что на сервере один экземпляр обслуживает всех пользователей. Observer отличается от pub-sub тем, что субъект знает своих наблюдателей напрямую, а в pub-sub стороны знают только посредника и строковое имя события.

## Ловушки

- **Перебор живого набора в \`emit\`** ломается, если обработчик подписывается или отписывается во время рассылки.
- **\`off\` не сработает, если передать другую функцию** — стрелка в аргументе или \`bind\` создают новую ссылку каждый раз.
- **В \`once\` нужно снимать обёртку до вызова**, иначе рекурсивный \`emit\` вызовет её повторно.
- **Ошибка в одном обработчике останавливает остальных**, если нет \`try/catch\`.
- **EventEmitter — источник утечек**: подписки живут, пока жив эмиттер, и держат всё захваченное замыканиями.
- **Синглтон на сервере общий для всех запросов** — в SSR это утечка данных между пользователями.
- **Состояние синглтона протекает между тестами** — нужен метод сброса или подмена модуля.
- **Строковые имена событий не проверяются** — опечатка в pub-sub приводит к тихому отсутствию реакции.`
    },
    codeSnippet: `class EventEmitter {
  #listeners = new Map();

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);          // готовая функция отписки
  }

  off(event, handler) {
    const set = this.#listeners.get(event);
    if (!set) return this;
    handler === undefined ? this.#listeners.delete(event) : set.delete(handler);
    if (set.size === 0) this.#listeners.delete(event);
    return this;
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);                     // снимаем ДО вызова
      handler.apply(this, args);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    const set = this.#listeners.get(event);
    if (!set?.size) return false;
    for (const h of [...set]) {                     // копия: набор может измениться
      try { h.apply(this, args); }
      catch (e) { console.error('обработчик упал:', e); }
    }
    return true;
  }
}

const bus = new EventEmitter();
const off = bus.on('data', v => console.log('A:', v));
bus.once('data', v => console.log('B (один раз):', v));

bus.emit('data', 1);   // A: 1 / B (один раз): 1
bus.emit('data', 2);   // A: 2
off();
bus.emit('data', 3);   // тишина`
  },
  {
    id: 'js-049',
    category: 'js-state',
    level: 'Expert',
    tags: ['symbol', 'well-known-symbols', 'metaprogramming'],
    question: {
      ru: '`Symbol`: зачем нужны символы при наличии строковых ключей, попадают ли они в `for...in`, `Object.keys` и `JSON.stringify`, что такое well-known symbols'
    },
    answer: {
      ru: `## Коротко

**Символ — это примитив, единственная задача которого быть гарантированно уникальным ключом.**

\`\`\`js
const a = Symbol('описание');
const b = Symbol('описание');
console.log(a === b);   // false — даже с одинаковым описанием это разные символы
\`\`\`

Описание в скобках нужно только для отладки — на уникальность оно не влияет.

Аналогия: строковый ключ — это имя на двери кабинета: два человека легко повесят одинаковые таблички и займут один кабинет. Символ — это личный ключ от замка: сколько бы одинаковых ключей внешне ни выглядело, каждый открывает только свою дверь.

## Как это работает по шагам

1. \`Symbol()\` создаёт новое уникальное значение. Оператора \`new\` для символов нет.
2. Символ можно использовать как ключ свойства — наравне со строкой.
3. Символьные ключи **не попадают** в обычные способы перебора: \`for...in\`, \`Object.keys\`, \`JSON.stringify\`.
4. Получить их можно только специально: через \`Object.getOwnPropertySymbols\` или \`Reflect.ownKeys\`.
5. Часть символов **встроена в язык** — по ним движок ищет, как объект должен вести себя в определённых операциях.

### Зачем нужны символы, если есть строковые ключи?

Три реальные задачи.

**1. Гарантия отсутствия конфликта имён.**

Представьте, что вы пишете библиотеку и хотите пометить объекты пользователя своим служебным полем:

\`\`\`js
// Со строкой — рискованно
function markAsProcessed(obj) {
  obj.processed = true;      // а вдруг у объекта уже есть поле processed?
}

// С символом — конфликт невозможен
const PROCESSED = Symbol('processed');
function markAsProcessed(obj) {
  obj[PROCESSED] = true;     // никто другой не создаст такой же ключ
}
\`\`\`

Даже если две библиотеки назовут свой символ одинаково, это будут **разные символы**, и они не пересекутся.

**2. Служебные данные, скрытые от обычного перебора.**

\`\`\`js
const META = Symbol('meta');

const user = {
  name: 'Anton',
  age: 30,
  [META]: { version: 2, dirty: false }
};

console.log(Object.keys(user));       // ['name', 'age'] — метаданных не видно
console.log(JSON.stringify(user));    // '{"name":"Anton","age":30}' — не уйдут на сервер
console.log(user[META]);              // { version: 2, dirty: false } — но доступны
\`\`\`

Это не безопасность — символ можно найти через \`Object.getOwnPropertySymbols\`. Это **чистота**: служебное поле не мешает работе с объектом как с данными.

**3. Настройка поведения объекта в операциях языка** — через встроенные символы (об этом ниже).

Отдельно стоит знать про **глобальный реестр символов**:

\`\`\`js
const s1 = Symbol.for('app.config');
const s2 = Symbol.for('app.config');
console.log(s1 === s2);              // true — тот же символ из реестра!

console.log(Symbol.keyFor(s1));      // 'app.config' — узнать имя в реестре
console.log(Symbol.keyFor(Symbol('x')));   // undefined — обычный символ не в реестре
\`\`\`

\`Symbol.for\` ищет символ по строке в глобальном реестре и создаёт его, если не нашёл. Реестр общий для всего окружения — включая разные iframe и Worker, — поэтому так делают символы, которые должны совпасть между независимыми частями приложения.

Практическая разница: **\`Symbol('x')\` — всегда новый, \`Symbol.for('x')\` — всегда один и тот же**.

И несколько технических особенностей, которые спрашивают:

\`\`\`js
console.log(typeof Symbol());          // 'symbol' — отдельный тип
console.log(Symbol('описание').description);   // 'описание'
console.log(Symbol('x').toString());   // 'Symbol(x)'

const s = Symbol('x');
console.log('строка: ' + s);           // TypeError: Cannot convert a Symbol to a string
console.log('строка: ' + String(s));   // 'строка: Symbol(x)' — так можно
console.log(\`шаблон: \${s}\`);           // TypeError — тоже нельзя
\`\`\`

Символ намеренно **не приводится к строке неявно** — это защита от случайного использования его как обычного ключа.

### Попадают ли символы в \`for...in\`, \`Object.keys\`, \`JSON.stringify\`?

**Нет, ни в один из них.**

\`\`\`js
const SECRET = Symbol('secret');
const obj = {
  visible: 'видно',
  [SECRET]: 'скрыто'
};

console.log(Object.keys(obj));             // ['visible']
console.log(Object.values(obj));           // ['видно']
console.log(Object.entries(obj));          // [['visible', 'видно']]
console.log(JSON.stringify(obj));          // '{"visible":"видно"}'
for (const k in obj) console.log(k);       // 'visible'
console.log({ ...obj });                   // { visible: 'видно', Symbol(secret): 'скрыто' }
\`\`\`

Обратите внимание на последнюю строку — **спред символы копирует**. Это единственное исключение среди перечисленных операций, и оно логично: спред копирует все собственные перечисляемые свойства, а символьные ключи тоже бывают перечисляемыми.

То же верно для \`Object.assign\`:

\`\`\`js
const copy = Object.assign({}, obj);
console.log(copy[SECRET]);   // 'скрыто' — скопировался
\`\`\`

Получить символьные ключи можно двумя способами:

\`\`\`js
console.log(Object.getOwnPropertySymbols(obj));   // [Symbol(secret)]
console.log(Reflect.ownKeys(obj));                 // ['visible', Symbol(secret)]
\`\`\`

\`Reflect.ownKeys\` — самый полный способ: он возвращает **все** собственные ключи, включая символьные и неперечисляемые. Сначала идут целочисленные, потом строковые в порядке добавления, потом символьные.

Полная сводка, что где видно:

- **\`Object.keys\`, \`values\`, \`entries\`** — только строковые перечисляемые;
- **\`for...in\`** — только строковые перечисляемые, зато с прототипами;
- **\`JSON.stringify\`** — только строковые перечисляемые;
- **\`Object.getOwnPropertyNames\`** — все строковые, включая неперечисляемые;
- **\`Object.getOwnPropertySymbols\`** — только символьные;
- **\`Reflect.ownKeys\`** — вообще все;
- **спред и \`Object.assign\`** — строковые и символьные перечисляемые.

Важно ещё раз подчеркнуть: **символ не даёт приватности**. Настоящая приватность — это поля класса с решёткой:

\`\`\`js
class WithSymbol {
  static #KEY = Symbol('key');
  constructor() { this[WithSymbol.#KEY] = 'найдут'; }
}
console.log(Object.getOwnPropertySymbols(new WithSymbol()));   // символ виден

class WithPrivate {
  #value = 'не найдут';
}
console.log(Reflect.ownKeys(new WithPrivate()));   // [] — вообще ничего
\`\`\`

### Что такое well-known symbols, назови пару и зачем они

**Встроенные символы (well-known symbols) — это заранее определённые символы, по которым движок спрашивает объект, как себя вести в той или иной операции.**

Фактически это точки расширения языка: реализуя такой символ, вы меняете поведение встроенных конструкций.

**\`Symbol.iterator\`** — самый важный. Делает объект перебираемым:

\`\`\`js
const range = {
  from: 1,
  to: 3,
  *[Symbol.iterator]() {
    for (let i = this.from; i <= this.to; i++) yield i;
  }
};

console.log([...range]);              // [1, 2, 3]
for (const n of range) console.log(n); // 1, 2, 3
\`\`\`

Без него ни \`for...of\`, ни спред, ни деструктуризация массива не работают.

**\`Symbol.asyncIterator\`** — то же самое для \`for await...of\`:

\`\`\`js
const stream = {
  async *[Symbol.asyncIterator]() {
    yield await Promise.resolve(1);
    yield await Promise.resolve(2);
  }
};
for await (const v of stream) console.log(v);   // 1, 2
\`\`\`

**\`Symbol.toPrimitive\`** — управляет приведением объекта к примитиву:

\`\`\`js
const money = {
  amount: 100,
  currency: 'EUR',
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.amount;
    if (hint === 'string') return this.amount + ' ' + this.currency;
    return this.amount + ' ' + this.currency;   // hint === 'default'
  }
};

console.log(+money);          // 100        — hint 'number'
console.log(\`\${money}\`);      // '100 EUR'  — hint 'string'
console.log(money + '');      // '100 EUR'  — hint 'default'
\`\`\`

**\`Symbol.toStringTag\`** — задаёт, как объект выглядит в \`Object.prototype.toString\`:

\`\`\`js
class Money {
  get [Symbol.toStringTag]() { return 'Money'; }
}
console.log(Object.prototype.toString.call(new Money()));   // '[object Money]'
// без него было бы '[object Object]'
\`\`\`

**\`Symbol.hasInstance\`** — переопределяет поведение \`instanceof\`:

\`\`\`js
class Even {
  static [Symbol.hasInstance](value) {
    return Number.isInteger(value) && value % 2 === 0;
  }
}
console.log(4 instanceof Even);    // true
console.log(3 instanceof Even);    // false
\`\`\`

Это удобно для проверок «похоже ли значение на тип», но злоупотреблять не стоит: \`instanceof\` начинает делать не то, что ожидает читающий.

Ещё несколько, о которых полезно знать:

- **\`Symbol.species\`** — какой конструктор использовать для производных объектов: например, чтобы \`map\` у подкласса массива возвращал обычный массив, а не подкласс.
- **\`Symbol.unscopables\`** — какие свойства не видны в устаревшем блоке \`with\`.
- **\`Symbol.isConcatSpreadable\`** — должен ли объект «разворачиваться» при \`concat\`.
- **\`Symbol.match\`, \`Symbol.replace\`, \`Symbol.split\`, \`Symbol.search\`** — позволяют своему объекту работать в строковых методах вместо регулярного выражения.

Что отвечать про **зачем они нужны**: раньше поведение встроенных операций было зашито в движок и менять его было нельзя. Встроенные символы сделали язык **расширяемым без изменения синтаксиса** — вы описываете поведение своего типа теми же средствами, которыми пользуются встроенные типы. Именно поэтому \`Map\`, \`Set\` и \`NodeList\` работают в \`for...of\` без всякой магии: у них просто реализован \`Symbol.iterator\`.

## Что сказать на собеседовании

> Символ — примитивный тип, чья единственная задача быть уникальным ключом: два символа с одинаковым описанием не равны, описание нужно только для отладки. Это решает проблему конфликта имён, когда библиотека хочет пометить чужой объект своим служебным полем, и позволяет держать метаданные, не засоряя данные. Символьные ключи не попадают ни в \`Object.keys\`, ни в \`for...in\`, ни в \`JSON.stringify\`, зато копируются спредом и \`Object.assign\`, а достать их можно через \`Object.getOwnPropertySymbols\` или \`Reflect.ownKeys\` — то есть это чистота, а не приватность. Встроенные символы — точки расширения языка: \`Symbol.iterator\` делает объект перебираемым, \`Symbol.toPrimitive\` управляет приведением к примитиву, \`Symbol.toStringTag\` — тем, что покажет \`Object.prototype.toString\`, а \`Symbol.hasInstance\` переопределяет \`instanceof\`.

## Ловушки

- **Символ не приводится к строке неявно** — конкатенация и шаблонная строка бросают \`TypeError\`, нужен \`String(symbol)\`.
- **\`Symbol\` нельзя вызвать через \`new\`** — это примитив, а не объект.
- **Символы не дают приватности** — их видно через \`Object.getOwnPropertySymbols\`.
- **Спред и \`Object.assign\` копируют символьные ключи**, в отличие от \`Object.keys\` и \`JSON.stringify\`.
- **\`Symbol('x') !== Symbol('x')\`, но \`Symbol.for('x') === Symbol.for('x')\`** — разные механизмы.
- **Символы теряются при сериализации** — если данные уходят на сервер, служебные поля в символах придётся переносить отдельно.
- **Переопределение \`Symbol.hasInstance\` делает \`instanceof\` неочевидным** — читающий код ожидает обычную проверку прототипа.
- **\`structuredClone\` не копирует символьные ключи** и бросает ошибку на самих символах как значениях.`
    },
    codeSnippet: `const META = Symbol('meta');
const obj = { name: 'Anton', [META]: { version: 2 } };

console.log(Object.keys(obj));                     // ['name']
console.log(JSON.stringify(obj));                  // {"name":"Anton"}
for (const k in obj) console.log('for-in:', k);    // for-in: name
console.log(Object.getOwnPropertySymbols(obj));    // [Symbol(meta)]
console.log(Reflect.ownKeys(obj));                 // ['name', Symbol(meta)]
console.log({ ...obj }[META]);                     // { version: 2 } — спред копирует

// Уникальность против глобального реестра
console.log(Symbol('id') === Symbol('id'));            // false
console.log(Symbol.for('id') === Symbol.for('id'));    // true

// Встроенные символы — точки расширения языка
const range = {
  from: 1, to: 3,
  *[Symbol.iterator]() { for (let i = this.from; i <= this.to; i++) yield i; },
  [Symbol.toPrimitive](hint) { return hint === 'number' ? this.to : 'диапазон'; },
  get [Symbol.toStringTag]() { return 'Range'; }
};

console.log([...range]);                                  // [1, 2, 3]
console.log(+range, String(range));                        // 3 'диапазон'
console.log(Object.prototype.toString.call(range));        // '[object Range]'

class Even { static [Symbol.hasInstance](v) { return v % 2 === 0; } }
console.log(4 instanceof Even, 3 instanceof Even);         // true false`
  },
  {
    id: 'js-050',
    category: 'js-state',
    level: 'Expert',
    tags: ['coercion', 'to-primitive', 'valueof'],
    question: {
      ru: 'Приведение к примитиву: порядок вызова `valueOf` и `toString`, переопределение через `Symbol.toPrimitive` и как сделать `a == 1 && a == 2 && a == 3` истинным'
    },
    answer: {
      ru: `## Коротко

**Когда объект попадает туда, где нужен примитив, движок спрашивает у него значение — по строго определённой процедуре.**

У процедуры есть **подсказка (hint)** — что именно от объекта хотят:

- **\`'number'\`** — нужно число: арифметика, сравнение через \`<\` и \`>\`, унарный плюс, \`Math\`-методы.
- **\`'string'\`** — нужна строка: шаблонная строка, ключ объекта, \`String(obj)\`, \`alert\`.
- **\`'default'\`** — непонятно что: оператор \`+\` и нестрогое сравнение \`==\`.

Аналогия: вы приходите в справочную с объектом. В зависимости от того, что вы попросили — «сколько это стоит» или «как это называется», — вам зачитают разное поле из одной и той же карточки.

## Как это работает по шагам

1. Движок определяет подсказку по контексту.
2. Если у объекта есть метод \`[Symbol.toPrimitive]\`, вызывается **только он**, с подсказкой аргументом. Всё, процедура закончена.
3. Если его нет, вызываются \`valueOf\` и \`toString\` — **в порядке, зависящем от подсказки**.
4. Первый результат, оказавшийся примитивом, и становится ответом. Если метод вернул объект, пробуется следующий.
5. Оба вернули объект — \`TypeError: Cannot convert object to primitive value\`.

### В каком порядке вызываются \`valueOf\` и \`toString\`?

**При подсказке \`'number'\` и \`'default'\`: сначала \`valueOf\`, потом \`toString\`.**
**При подсказке \`'string'\`: сначала \`toString\`, потом \`valueOf\`.**

Проверим это явно:

\`\`\`js
const obj = {
  valueOf() { console.log('вызван valueOf'); return 42; },
  toString() { console.log('вызван toString'); return 'сорок два'; }
};

console.log(+obj);          // 'вызван valueOf'   → 42
console.log(obj * 2);       // 'вызван valueOf'   → 84
console.log(\`\${obj}\`);      // 'вызван toString'  → 'сорок два'
console.log(String(obj));   // 'вызван toString'  → 'сорок два'
console.log(obj + '');      // 'вызван valueOf'   → '42'  ← default идёт в number!
console.log(obj == 42);     // 'вызван valueOf'   → true
\`\`\`

Самая частая ошибка — считать, что \`+\` со строкой даёт подсказку \`'string'\`. Нет: **оператор \`+\` всегда использует \`'default'\`**, а \`'default'\` ведёт себя как \`'number'\`. Поэтому \`obj + ''\` дало \`'42'\`, а не \`'сорок два'\`.

Что происходит, если один из методов не подходит:

\`\`\`js
const weird = {
  valueOf() { return {}; },              // вернул объект — не подходит
  toString() { return 'запасной вариант'; }
};
console.log(+weird);   // NaN — взяли строку 'запасной вариант' и не смогли сделать числом
console.log(\`\${weird}\`);   // 'запасной вариант'
\`\`\`

А если оба вернут объект:

\`\`\`js
const broken = { valueOf() { return {}; }, toString() { return {}; } };
console.log(+broken);   // TypeError: Cannot convert object to primitive value
\`\`\`

Теперь **поведение встроенных типов** — именно оно объясняет знаменитые «странности».

**Обычный объект:** \`valueOf\` возвращает сам объект (то есть не подходит), поэтому всегда срабатывает \`toString\`:

\`\`\`js
console.log({} + '');      // '[object Object]'
console.log(+{});          // NaN
\`\`\`

**Массив:** \`valueOf\` тоже возвращает сам массив, а \`toString\` склеивает элементы через запятую:

\`\`\`js
console.log([] + '');        // ''      — пустая строка
console.log([1, 2] + '');    // '1,2'
console.log(+[]);            // 0       — '' превратилась в 0
console.log(+[5]);           // 5       — '5' превратилась в 5
console.log(+[1, 2]);        // NaN     — '1,2' числом не станет
console.log([] + []);        // ''      — обе стали пустыми строками
console.log([] + {});        // '[object Object]'
\`\`\`

**Дата** — единственный встроенный тип, у которого подсказка \`'default'\` ведёт себя как \`'string'\`:

\`\`\`js
const d = new Date();
console.log(d + 1);          // строка с датой и единицей на конце
console.log(d - 0);          // число — миллисекунды
console.log(+d);             // число
\`\`\`

Сделано это ради обратной совместимости: исторически складывать даты со строками было привычнее, чем с числами.

### Как переопределить поведение через \`Symbol.toPrimitive\`?

\`Symbol.toPrimitive\` — единый метод, который **полностью заменяет** пару \`valueOf\`/\`toString\`:

\`\`\`js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number': return this.amount;
      case 'string': return this.amount.toFixed(2) + ' ' + this.currency;
      default:       return this.amount.toFixed(2) + ' ' + this.currency;
    }
  }
}

const price = new Money(19.5, 'EUR');

console.log(+price);            // 19.5      — hint 'number'
console.log(\`Цена: \${price}\`);  // 'Цена: 19.50 EUR' — hint 'string'
console.log(price + '');        // '19.50 EUR'       — hint 'default'
console.log(price * 2);         // 39        — hint 'number'
console.log(price > 10);        // true      — сравнение тоже number
\`\`\`

Три причины предпочитать его старой паре методов:

**1. Явность.** Видно, какое поведение соответствует какому контексту. С \`valueOf\`/\`toString\` нужно помнить таблицу приоритетов.

**2. Контроль над \`'default'\`.** С \`valueOf\`/\`toString\` подсказка \`'default'\` всегда ведёт себя как \`'number'\`, и изменить это нельзя. Через \`Symbol.toPrimitive\` можно задать \`'default'\` отдельно — как раз это и делает \`Date\`.

**3. Один метод вместо двух** — меньше мест для ошибки.

Метод обязан вернуть **примитив**. Если вернуть объект — сразу \`TypeError\`:

\`\`\`js
const bad = { [Symbol.toPrimitive]() { return {}; } };
console.log(+bad);   // TypeError: Cannot convert object to primitive value
\`\`\`

Практические применения:

\`\`\`js
// Тип «длительность», который удобно и печатать, и считать
class Duration {
  constructor(ms) { this.ms = ms; }
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.ms;
    const s = Math.round(this.ms / 1000);
    return Math.floor(s / 60) + ' мин ' + (s % 60) + ' сек';
  }
}

const d = new Duration(125000);
console.log(\`Прошло: \${d}\`);       // 'Прошло: 2 мин 5 сек'
console.log(d + new Duration(1000) * 0);   // работает как число
console.log(d > 60000);             // true
\`\`\`

### Сделай так, чтобы \`a == 1 && a == 2 && a == 3\` было true — два способа

Это классическая задача-головоломка. Она кажется невозможной, но становится очевидной, как только понятен механизм: **при \`==\` объект каждый раз приводится к примитиву заново**, а значит может каждый раз возвращать новое значение.

**Способ 1 — \`Symbol.toPrimitive\` со счётчиком:**

\`\`\`js
const a = {
  value: 0,
  [Symbol.toPrimitive]() {
    return ++this.value;      // 1, потом 2, потом 3
  }
};

console.log(a == 1 && a == 2 && a == 3);   // true
\`\`\`

Как это работает: \`==\` вычисляется слева направо. На первом сравнении объект приводится к примитиву — возвращается \`1\`, сравнение с \`1\` истинно. На втором — возвращается \`2\`, и так далее.

**Способ 2 — \`valueOf\` со счётчиком** (то же самое, но старым механизмом):

\`\`\`js
let counter = 0;
const a = {
  valueOf() { return ++counter; }
};

console.log(a == 1 && a == 2 && a == 3);   // true
\`\`\`

Работает, потому что при подсказке \`'default'\` первым вызывается \`valueOf\`.

**Способ 3 — \`toString\`:**

\`\`\`js
let i = 0;
const a = {
  toString() { return ++i; }
};
console.log(a == 1 && a == 2 && a == 3);   // true
\`\`\`

Здесь \`valueOf\` унаследован от \`Object.prototype\` и возвращает сам объект — то есть не подходит. Поэтому вызывается \`toString\`.

**Способ 4 — геттер на глобальной переменной**, уже без объектов:

\`\`\`js
let value = 0;
Object.defineProperty(globalThis, 'a', {
  get() { return ++value; }
});

console.log(a == 1 && a == 2 && a == 3);   // true
console.log(a === 1 && a === 2 && a === 3); // тоже true! ← важное отличие
\`\`\`

Этот вариант интереснее остальных, потому что работает и со **строгим** равенством: приведения типов вообще нет, просто каждое чтение переменной возвращает новое число.

**Способ 5 — с массивом**, обыгрывает \`shift\`:

\`\`\`js
const a = [1, 2, 3];
a.join = a.shift;   // подменяем метод, который использует toString массива

console.log(a == 1 && a == 2 && a == 3);   // true
\`\`\`

Здесь \`toString\` массива внутри вызывает \`join\`, а мы подсунули вместо него \`shift\`, который каждый раз откусывает и возвращает первый элемент.

Что отвечать, если спросят **зачем это знать**. Сама задача практического смысла не имеет — так писать нельзя никогда. Но она отлично проверяет три вещи: понимаете ли вы, что \`==\` приводит типы; знаете ли вы порядок \`valueOf\`/\`toString\`; помните ли, что приведение — это **вызов функции**, а не чтение зафиксированного значения. Именно последнее и делает ответ возможным.

## Что сказать на собеседовании

> Когда объект попадает туда, где нужен примитив, движок вызывает у него процедуру приведения с подсказкой: \`'number'\` для арифметики и сравнений, \`'string'\` для шаблонных строк и ключей объекта, \`'default'\` для оператора \`+\` и нестрогого равенства. Если у объекта есть \`Symbol.toPrimitive\`, вызывается только он и получает подсказку аргументом. Иначе идут \`valueOf\` и \`toString\`: при подсказке \`'number'\` и \`'default'\` сначала \`valueOf\`, при \`'string'\` — сначала \`toString\`; берётся первый примитивный результат, а если оба вернули объект, будет \`TypeError\`. Важная тонкость: \`'default'\` ведёт себя как \`'number'\`, поэтому \`obj + ''\` идёт через \`valueOf\`. Отсюда и решение задачи с \`a == 1 && a == 2 && a == 3\`: приведение — это вызов функции, поэтому счётчик в \`valueOf\` или \`Symbol.toPrimitive\` каждый раз возвращает новое число.

## Ловушки

- **\`'default'\` — это не \`'string'\`.** Оператор \`+\` идёт через \`valueOf\`, а не \`toString\`.
- **\`Date\` — исключение**: у неё \`'default'\` ведёт себя как \`'string'\`.
- **\`Symbol.toPrimitive\` полностью отменяет \`valueOf\` и \`toString\`** — они даже не будут вызваны.
- **Метод обязан вернуть примитив**, иначе \`TypeError\`.
- **У обычного объекта \`valueOf\` возвращает сам объект** — поэтому всегда срабатывает \`toString\` и получается \`'[object Object]'\`.
- **Ключи объекта всегда строки** — \`obj[{a: 1}]\` превратится в \`obj['[object Object]']\`, и два разных объекта перезапишут друг друга.
- **\`==\` вызывает приведение каждый раз заново** — на этом и построена задача с тремя сравнениями.
- **Шаблонная строка использует подсказку \`'string'\`**, а конкатенация через \`+\` — \`'default'\`; это даёт разный результат у одного и того же объекта.`
    },
    codeSnippet: `const obj = {
  valueOf() { return 42; },
  toString() { return 'сорок два'; }
};

console.log(+obj);           // 42          — hint 'number' → valueOf
console.log(\`\${obj}\`);       // 'сорок два' — hint 'string' → toString
console.log(obj + '');       // '42'        — hint 'default' ведёт себя как number!
console.log(obj > 40);       // true        — сравнение через число

// Встроенные типы
console.log([] + []);        // ''
console.log([] + {});        // '[object Object]'
console.log(+[5], +[1, 2]);  // 5 NaN
console.log(new Date() - 0); // число — у Date default ведёт себя как string

// Symbol.toPrimitive отменяет обе функции и даёт контроль над 'default'
class Money {
  constructor(a, c) { this.a = a; this.c = c; }
  [Symbol.toPrimitive](hint) {
    return hint === 'number' ? this.a : this.a.toFixed(2) + ' ' + this.c;
  }
}
const p = new Money(19.5, 'EUR');
console.log(+p, \`\${p}\`, p + '');   // 19.5 '19.50 EUR' '19.50 EUR'

// a == 1 && a == 2 && a == 3 — приведение вызывается каждый раз заново
const a = { v: 0, [Symbol.toPrimitive]() { return ++this.v; } };
console.log(a == 1 && a == 2 && a == 3);   // true

let counter = 0;
const b = { valueOf() { return ++counter; } };
console.log(b == 1 && b == 2 && b == 3);   // true`
  }
];
