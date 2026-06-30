import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'jsts-037',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['ieee-754', 'floating-point', 'precision'],
    question: {
      ru: 'Почему `0.1 + 0.2 !== 0.3` в JavaScript? Объясните IEEE-754 и как корректно сравнивать дробные числа.',
      en: 'Why is `0.1 + 0.2 !== 0.3` in JavaScript? Explain IEEE-754 and how to compare floats correctly.'
    },
    answer: {
      ru: `## Двоичная плавающая точка

В JS все \`number\` — это **64-битные IEEE-754** числа двойной точности: 1 бит знака, 11 бит экспоненты, 52 бита мантиссы. Многие десятичные дроби (\`0.1\`, \`0.2\`) **не представимы точно** в двоичной системе — как \`1/3\` не представима в десятичной. Они округляются до ближайшего представимого значения.

\`0.1 + 0.2\` даёт \`0.30000000000000004\`, потому что ошибки округления накапливаются.

## Точность и диапазон

- **\`Number.EPSILON\`** (~2.22e-16) — разница между \`1\` и следующим представимым числом.
- **\`Number.MAX_SAFE_INTEGER\`** = 2^53 − 1: за этим пределом целые теряют точность (\`9007199254740993 === 9007199254740992\`).
- Существует **\`+0\`** и **\`−0\`**: \`Object.is(0, -0)\` → \`false\`, а \`1 / -0\` → \`-Infinity\`.

## Как сравнивать

Сравнивайте с **допуском** (эпсилон), а не на строгое равенство:

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;
eq(0.1 + 0.2, 0.3); // true
\`\`\`

Для денег **не храните доллары как float**: используйте целые центы (\`integer\`), \`BigInt\`, или decimal-библиотеку (decimal.js). Округление до фиксированного знака — \`(x).toFixed(2)\` (но он возвращает строку и сам подвержен IEEE-754 на границах).

Понимание этого критично в финансах, графике и любых накопительных вычислениях, где ошибки усиливаются.`,
      en: `## Binary floating point

In JS every \`number\` is a **64-bit IEEE-754** double: 1 sign bit, 11 exponent bits, 52 mantissa bits. Many decimal fractions (\`0.1\`, \`0.2\`) are **not exactly representable** in binary — just as \`1/3\` isn't in decimal. They are rounded to the nearest representable value.

\`0.1 + 0.2\` yields \`0.30000000000000004\` because rounding errors accumulate.

## Precision and range

- **\`Number.EPSILON\`** (~2.22e-16) — the gap between \`1\` and the next representable number.
- **\`Number.MAX_SAFE_INTEGER\`** = 2^53 − 1: beyond it integers lose precision (\`9007199254740993 === 9007199254740992\`).
- There is a **\`+0\`** and **\`−0\`**: \`Object.is(0, -0)\` → \`false\`, and \`1 / -0\` → \`-Infinity\`.

## How to compare

Compare with a **tolerance** (epsilon), not strict equality:

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;
eq(0.1 + 0.2, 0.3); // true
\`\`\`

For money **don't store dollars as floats**: use integer cents, \`BigInt\`, or a decimal library (decimal.js). Round to fixed precision with \`(x).toFixed(2)\` (but it returns a string and is itself subject to IEEE-754 at boundaries).

This matters in finance, graphics, and any accumulative computation where errors amplify.`
    },
    codeSnippet: `0.1 + 0.2;                       // 0.30000000000000004
0.1 + 0.2 === 0.3;               // false

Math.abs((0.1 + 0.2) - 0.3) < Number.EPSILON; // true

Number.MAX_SAFE_INTEGER;         // 9007199254740991
9007199254740991 + 1 === 9007199254740991 + 2; // true (!) precision lost

Object.is(0, -0);                // false
1 / -0;                          // -Infinity`
  },
  {
    id: 'jsts-038',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['bigint', 'numbers', 'precision'],
    question: {
      ru: 'Что такое BigInt и когда его использовать? Какие ограничения и подводные камни?',
      en: 'What is BigInt and when should you use it? What are its limits and gotchas?'
    },
    answer: {
      ru: `## BigInt

\`BigInt\` — отдельный **примитивный тип** для целых чисел **произвольной точности**, без потолка \`Number.MAX_SAFE_INTEGER\` (2^53 − 1). Литерал — суффикс \`n\` (\`10n\`) или \`BigInt(10)\`. \`typeof 10n === 'bigint'\`.

## Когда нужен

- Большие целые: id из БД (64-битные), временные метки в наносекундах, криптография, хеши.
- Точная целочисленная арифметика за пределами безопасного диапазона.

## Ограничения

- **Нельзя смешивать** с \`Number\` в арифметике: \`1n + 1\` → \`TypeError\`. Нужно явное приведение (\`1n + BigInt(1)\` или \`Number(1n) + 1\`).
- **Только целые**: нет дробной части; \`5n / 2n === 2n\` (усечение).
- Не работает с \`Math\` (\`Math.sqrt(9n)\` → ошибка).
- \`JSON.stringify(10n)\` → \`TypeError\` (нужен \`toJSON\` или замена на строку).
- Производительность ниже, чем у \`Number\` для малых значений.

\`\`\`js
const big = 9007199254740991n;
big + 2n;          // 9007199254740993n — точно!
typeof big;        // 'bigint'

// сравнения с Number работают (==), но не строгое ===
10n == 10;         // true
10n === 10;        // false
\`\`\`

## Сравнения

Сравнение (\`<\`, \`>\`, \`==\`) между \`BigInt\` и \`Number\` **разрешено** и корректно. Строгое \`===\` всегда \`false\` из-за разных типов. Не используйте \`BigInt\` для дробных вычислений или там, где скорость критична, а значения малы.`,
      en: `## BigInt

\`BigInt\` is a separate **primitive type** for **arbitrary-precision** integers, with no \`Number.MAX_SAFE_INTEGER\` (2^53 − 1) ceiling. Literal: \`n\` suffix (\`10n\`) or \`BigInt(10)\`. \`typeof 10n === 'bigint'\`.

## When to use

- Large integers: 64-bit DB ids, nanosecond timestamps, cryptography, hashes.
- Exact integer arithmetic beyond the safe range.

## Limits

- **Cannot mix** with \`Number\` in arithmetic: \`1n + 1\` → \`TypeError\`. Explicit coercion is required (\`1n + BigInt(1)\` or \`Number(1n) + 1\`).
- **Integers only**: no fractional part; \`5n / 2n === 2n\` (truncates).
- Doesn't work with \`Math\` (\`Math.sqrt(9n)\` → error).
- \`JSON.stringify(10n)\` → \`TypeError\` (needs a \`toJSON\` or string replacement).
- Slower than \`Number\` for small values.

\`\`\`js
const big = 9007199254740991n;
big + 2n;          // 9007199254740993n — exact!
typeof big;        // 'bigint'

// comparisons with Number work (==), but not strict ===
10n == 10;         // true
10n === 10;        // false
\`\`\`

## Comparisons

Comparison (\`<\`, \`>\`, \`==\`) between \`BigInt\` and \`Number\` is **allowed** and correct. Strict \`===\` is always \`false\` due to differing types. Don't use \`BigInt\` for fractional math or where speed is critical and values are small.`
    },
    codeSnippet: `// Safe-integer overflow that BigInt fixes
const n = Number.MAX_SAFE_INTEGER;   // 9007199254740991
n + 1 === n + 2;                     // true — Number loses precision

const b = BigInt(n);                 // 9007199254740991n
b + 1n === b + 2n;                   // false — BigInt stays exact

// JSON needs a custom serializer
JSON.stringify({ id: 10n }, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v); // '{"id":"10"}'`
  },
  {
    id: 'jsts-039',
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['typed-arrays', 'arraybuffer', 'dataview'],
    question: {
      ru: 'Что такое ArrayBuffer, TypedArray и DataView? Зачем нужен DataView и что такое endianness?',
      en: 'What are ArrayBuffer, TypedArray, and DataView? Why DataView, and what is endianness?'
    },
    answer: {
      ru: `## ArrayBuffer

\`ArrayBuffer\` — **сырой блок памяти** фиксированного размера (в байтах). Сам по себе не читается — нужен «вид» (view).

## TypedArray

Типизированные массивы (\`Int8Array\`, \`Uint8Array\`, \`Float32Array\`, \`Float64Array\`, \`BigInt64Array\`...) — **типизированные виды** на буфер. Они хранят числа в бинарном виде непосредственно в памяти буфера, без боксинга. Несколько видов могут смотреть на **один** буфер (наложение). \`Uint8ClampedArray\` зажимает значения в 0..255 (для canvas).

## DataView

\`DataView\` — **гибкий вид** для чтения/записи значений **разных типов** по произвольному смещению, с явным контролем **endianness** (порядка байт):

- **Little-endian** — младший байт первым (x86, по умолчанию TypedArray на большинстве платформ).
- **Big-endian** — старший байт первым («сетевой порядок», частый в бинарных протоколах/файлах).

TypedArray использует endianness **платформы** (непредсказуемо), а \`DataView\` позволяет задать его явно — поэтому он незаменим для парсинга бинарных форматов (PNG, WAV, сетевые пакеты).

\`\`\`js
const buf = new ArrayBuffer(8);
const dv = new DataView(buf);
dv.setInt32(0, 256, false); // big-endian
dv.getUint8(0); // 0
dv.getUint8(3); // 0... зависит, но порядок задан явно
\`\`\`

## Применение

WebGL, Web Audio, WebSocket binary frames, файлы, шифрование, \`fetch().arrayBuffer()\`. \`SharedArrayBuffer\` + \`Atomics\` дают разделяемую память между Worker'ами. TypedArray быстрее обычных массивов для числовых данных и компактнее по памяти.`,
      en: `## ArrayBuffer

\`ArrayBuffer\` is a **raw block of memory** of fixed size (in bytes). It can't be read directly — you need a view.

## TypedArray

Typed arrays (\`Int8Array\`, \`Uint8Array\`, \`Float32Array\`, \`Float64Array\`, \`BigInt64Array\`...) are **typed views** onto a buffer. They store numbers in binary form directly in the buffer's memory, without boxing. Several views can point at the **same** buffer (aliasing). \`Uint8ClampedArray\` clamps values to 0..255 (for canvas).

## DataView

\`DataView\` is a **flexible view** to read/write values of **mixed types** at arbitrary offsets, with explicit control over **endianness** (byte order):

- **Little-endian** — least significant byte first (x86; the default for TypedArrays on most platforms).
- **Big-endian** — most significant byte first ("network order", common in binary protocols/files).

TypedArrays use the **platform's** endianness (unpredictable), while \`DataView\` lets you set it explicitly — making it essential for parsing binary formats (PNG, WAV, network packets).

\`\`\`js
const buf = new ArrayBuffer(8);
const dv = new DataView(buf);
dv.setInt32(0, 256, false); // big-endian
dv.getUint8(0); // 0
dv.getUint8(3); // explicit, defined byte order
\`\`\`

## Uses

WebGL, Web Audio, WebSocket binary frames, files, encryption, \`fetch().arrayBuffer()\`. \`SharedArrayBuffer\` + \`Atomics\` give shared memory across Workers. TypedArrays are faster than plain arrays for numeric data and more compact in memory.`
    },
    codeSnippet: `const buffer = new ArrayBuffer(4);          // 4 bytes of raw memory
const u8 = new Uint8Array(buffer);          // byte view
const u32 = new Uint32Array(buffer);        // same memory, 1x 32-bit view

u8[0] = 0xFF; u8[1] = 0x00; u8[2] = 0x00; u8[3] = 0x00;
u32[0];                                     // 255 on little-endian

// DataView controls byte order explicitly
const dv = new DataView(buffer);
dv.getUint32(0, true);  // 255   (little-endian)
dv.getUint32(0, false); // 4278190080 (big-endian)`
  },
  {
    id: 'jsts-040',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['map-set', 'weakset', 'collections'],
    question: {
      ru: 'Когда использовать Map/Set вместо объекта и массива? Чем WeakSet отличается от Set?',
      en: 'When should you use Map/Set instead of object and array? How does WeakSet differ from Set?'
    },
    answer: {
      ru: `## Map vs объект

\`Map\` — коллекция пар ключ-значение, где **ключом может быть что угодно** (объект, функция, \`NaN\`), а не только строка/Symbol.

- **Порядок вставки** гарантирован при итерации.
- \`size\` за O(1); удобные методы \`set/get/has/delete\`.
- Нет «загрязнения прототипа»: ключ \`'__proto__'\`, \`'toString'\` безопасен.
- Лучше для **частых добавлений/удалений** и динамических ключей.

Объект лучше для статичной структуры с известными полями, JSON-сериализации и доступа через \`obj.prop\`.

## Set vs массив

\`Set\` — коллекция **уникальных** значений. Проверка \`has\` — O(1) против O(n) у \`Array.includes\`. Идеален для дедупликации и членства.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])]; // [1, 2, 3]
\`\`\`

## Сравнение ключей

\`Map\`/\`Set\` используют **SameValueZero**: \`NaN\` равен \`NaN\` (в отличие от \`===\`), но \`+0\` и \`-0\` считаются равными. Объекты сравниваются по ссылке.

## WeakMap / WeakSet

- Хранят **только объекты** (не примитивы) как ключи/элементы.
- Удерживают их **слабо**: если на объект больше нет сильных ссылок, запись удаляется GC.
- **Не итерируемы**, нет \`size\`, нет \`clear\` (содержимое недетерминировано относительно GC).

Применение \`WeakSet\`: пометка объектов («уже обработан», «зарегистрирован») без удержания их в памяти и без утечек.`,
      en: `## Map vs object

\`Map\` is a key-value collection where **the key can be anything** (an object, function, \`NaN\`), not just a string/Symbol.

- **Insertion order** is guaranteed on iteration.
- \`size\` is O(1); convenient \`set/get/has/delete\`.
- No "prototype pollution": keys like \`'__proto__'\`, \`'toString'\` are safe.
- Better for **frequent adds/deletes** and dynamic keys.

An object is better for a static, known-shape structure, JSON serialization, and \`obj.prop\` access.

## Set vs array

\`Set\` is a collection of **unique** values. \`has\` is O(1) vs O(n) for \`Array.includes\`. Ideal for deduplication and membership.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])]; // [1, 2, 3]
\`\`\`

## Key comparison

\`Map\`/\`Set\` use **SameValueZero**: \`NaN\` equals \`NaN\` (unlike \`===\`), but \`+0\` and \`-0\` are treated as equal. Objects compare by reference.

## WeakMap / WeakSet

- Hold **only objects** (not primitives) as keys/members.
- Hold them **weakly**: if no strong reference to the object remains, the entry is removed by GC.
- **Not iterable**, no \`size\`, no \`clear\` (contents are non-deterministic relative to GC).

\`WeakSet\` use case: tagging objects ("already processed", "registered") without keeping them in memory and without leaks.`
    },
    codeSnippet: `// Map preserves order & allows object keys
const meta = new Map();
const key = { id: 1 };
meta.set(key, 'data');
meta.get(key);        // 'data'
meta.has(NaN);        // works; NaN is a valid, equal-to-itself key

// WeakSet: track objects without preventing GC
const seen = new WeakSet();
function process(obj) {
  if (seen.has(obj)) return;   // skip duplicates
  seen.add(obj);
  // ... when obj is no longer referenced elsewhere, it's collectable
}`
  },
  {
    id: 'jsts-041',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['property-descriptors', 'getters-setters', 'define-property'],
    question: {
      ru: 'Что такое дескрипторы свойств? Объясните writable/enumerable/configurable и getter/setter через Object.defineProperty.',
      en: 'What are property descriptors? Explain writable/enumerable/configurable and getter/setter via Object.defineProperty.'
    },
    answer: {
      ru: `## Дескрипторы свойств

Каждое свойство объекта описывается **дескриптором**. Бывают два вида:

- **Data descriptor**: \`value\`, \`writable\`.
- **Accessor descriptor**: \`get\`, \`set\`.

Оба имеют атрибуты:

- **\`writable\`** — можно ли переприсваивать значение.
- **\`enumerable\`** — попадает ли в \`for...in\`, \`Object.keys\`, spread, \`JSON.stringify\`.
- **\`configurable\`** — можно ли удалить свойство или изменить его дескриптор.

\`Object.defineProperty\` по умолчанию ставит все флаги в **\`false\`** (в отличие от обычного присваивания, где всё \`true\`).

## Getter / setter

Аксессоры — это **функции**, маскирующиеся под свойство. Позволяют вычислять значение, валидировать запись, делать ленивую инициализацию.

\`\`\`js
const obj = {};
Object.defineProperty(obj, 'id', {
  value: 42, writable: false, enumerable: false, configurable: false
});
obj.id = 100;          // молча игнор в non-strict, TypeError в strict
Object.keys(obj);      // [] — non-enumerable

let _temp = 0;
Object.defineProperty(obj, 'celsius', {
  get() { return _temp; },
  set(v) { if (v < -273) throw RangeError('too cold'); _temp = v; },
  enumerable: true
});
\`\`\`

## Зачем знать

- \`Object.freeze\` работает, делая свойства \`writable:false, configurable:false\`.
- Скрытые служебные поля делают \`enumerable:false\` (чтобы не сериализовались).
- \`Object.getOwnPropertyDescriptor(s)\` читает дескрипторы; нужно для корректного глубокого клонирования с аксессорами.
- Класс-аксессоры (\`get\`/\`set\`) и поля компилируются в дескрипторы на прототипе/инстансе.`,
      en: `## Property descriptors

Every object property is described by a **descriptor**. Two kinds:

- **Data descriptor**: \`value\`, \`writable\`.
- **Accessor descriptor**: \`get\`, \`set\`.

Both have attributes:

- **\`writable\`** — whether the value can be reassigned.
- **\`enumerable\`** — whether it appears in \`for...in\`, \`Object.keys\`, spread, \`JSON.stringify\`.
- **\`configurable\`** — whether the property can be deleted or its descriptor changed.

\`Object.defineProperty\` defaults all flags to **\`false\`** (unlike a normal assignment, where everything is \`true\`).

## Getter / setter

Accessors are **functions** disguised as a property. They let you compute a value, validate writes, or do lazy initialization.

\`\`\`js
const obj = {};
Object.defineProperty(obj, 'id', {
  value: 42, writable: false, enumerable: false, configurable: false
});
obj.id = 100;          // silently ignored in non-strict, TypeError in strict
Object.keys(obj);      // [] — non-enumerable

let _temp = 0;
Object.defineProperty(obj, 'celsius', {
  get() { return _temp; },
  set(v) { if (v < -273) throw RangeError('too cold'); _temp = v; },
  enumerable: true
});
\`\`\`

## Why it matters

- \`Object.freeze\` works by making properties \`writable:false, configurable:false\`.
- Hidden internal fields are made \`enumerable:false\` (so they aren't serialized).
- \`Object.getOwnPropertyDescriptor(s)\` reads descriptors; needed for correct deep cloning with accessors.
- Class accessors (\`get\`/\`set\`) and fields compile to descriptors on the prototype/instance.`
    },
    codeSnippet: `const user = { name: 'Ann' };

Object.defineProperty(user, 'role', {
  value: 'admin',
  enumerable: false,   // hidden from Object.keys / JSON
  writable: false,
  configurable: false
});

Object.keys(user);                 // ['name'] — role hidden
JSON.stringify(user);              // '{"name":"Ann"}'
Object.getOwnPropertyDescriptor(user, 'role');
// { value: 'admin', writable: false, enumerable: false, configurable: false }
delete user.role;                  // false (configurable:false) — stays`
  },
  {
    id: 'jsts-042',
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['new-operator', 'new-target', 'constructors'],
    question: {
      ru: 'Что именно делает оператор `new` под капотом? Что такое new.target и как реализовать `new` вручную?',
      en: 'What exactly does the `new` operator do under the hood? What is new.target and how do you implement `new` manually?'
    },
    answer: {
      ru: `## Шаги new

При \`new Fn(args)\` движок выполняет:

1. Создаёт **новый пустой объект**.
2. Устанавливает его **[[Prototype]]** в \`Fn.prototype\` (если \`Fn.prototype\` — объект, иначе \`Object.prototype\`).
3. Вызывает \`Fn\` с \`this\`, привязанным к новому объекту, передавая аргументы.
4. Если конструктор **вернул объект** — возвращается он; если примитив или \`undefined\` — возвращается созданный \`this\`.

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // шаги 1-2
  const result = Ctor.apply(obj, args);      // шаг 3
  return (result !== null && typeof result === 'object') ? result : obj; // шаг 4
}
\`\`\`

## new.target

\`new.target\` внутри функции равен **самому конструктору**, если вызвана через \`new\`, и \`undefined\` — если как обычная функция. Позволяет:

- Запретить вызов без \`new\` (или, наоборот, обязать).
- Определить, вызван ли базовый класс напрямую или через \`super\` из подкласса (\`new.target\` указывает на **исходный** класс цепочки).

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('Use new');
  this.name = name;
}
\`\`\`

## Тонкости

- Стрелочные функции и методы **нельзя** вызвать через \`new\` (нет \`[[Construct]]\`).
- \`class\` **обязан** вызываться через \`new\` (\`TypeError\` иначе).
- Возврат объекта из конструктора — приём для фабрик/синглтонов, но ломает \`instanceof\`-интуицию.
- \`Reflect.construct(Target, args, newTarget)\` позволяет задать другой \`new.target\` — полезно для расширения встроенных классов.`,
      en: `## Steps of new

For \`new Fn(args)\` the engine performs:

1. Creates a **new empty object**.
2. Sets its **[[Prototype]]** to \`Fn.prototype\` (if \`Fn.prototype\` is an object, else \`Object.prototype\`).
3. Calls \`Fn\` with \`this\` bound to the new object, passing the args.
4. If the constructor **returns an object** — that's returned; if a primitive or \`undefined\` — the created \`this\` is returned.

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // steps 1-2
  const result = Ctor.apply(obj, args);      // step 3
  return (result !== null && typeof result === 'object') ? result : obj; // step 4
}
\`\`\`

## new.target

Inside a function \`new.target\` equals the **constructor itself** if called via \`new\`, and \`undefined\` if called as a plain function. It lets you:

- Forbid calling without \`new\` (or require it).
- Tell whether a base class was called directly or via \`super\` from a subclass (\`new.target\` points at the **original** class of the chain).

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('Use new');
  this.name = name;
}
\`\`\`

## Subtleties

- Arrow functions and methods **cannot** be called via \`new\` (no \`[[Construct]]\`).
- A \`class\` **must** be called via \`new\` (\`TypeError\` otherwise).
- Returning an object from a constructor is a factory/singleton trick but breaks \`instanceof\` intuition.
- \`Reflect.construct(Target, args, newTarget)\` lets you set a different \`new.target\` — useful for extending built-in classes.`
    },
    codeSnippet: `function Animal(name) { this.name = name; }

// Manual reimplementation of 'new'
function build(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);
  const ret = Ctor.apply(obj, args);
  return (ret && typeof ret === 'object') ? ret : obj;
}
const a = build(Animal, 'Rex');
a instanceof Animal;  // true
a.name;               // 'Rex'

// new.target guards against missing 'new'
function Strict() { if (!new.target) throw new Error('use new'); }
// Strict(); // Error: use new`
  },
  {
    id: 'jsts-043',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['async-iterators', 'for-await-of', 'generators'],
    question: {
      ru: 'Как работают асинхронные итераторы и `for await...of`? Что такое `async function*` и делегирование `yield*`?',
      en: 'How do async iterators and `for await...of` work? What is `async function*` and `yield*` delegation?'
    },
    answer: {
      ru: `## Асинхронная итерация

Протокол асинхронной итерации параллелен синхронному, но на промисах:

- **AsyncIterable** — объект с \`[Symbol.asyncIterator]()\`.
- **AsyncIterator** — \`next()\` возвращает \`Promise<{ value, done }>\`.

\`for await...of\` **дожидается** каждого промиса по очереди, разворачивая значения **последовательно**.

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();           // отдаём по мере готовности
  }
}
for await (const page of fetchPages(urls)) {
  console.log(page);            // последовательно, без накопления всего в память
}
\`\`\`

## async function*

\`async function*\` создаёт **async-генератор**: внутри можно использовать и \`await\`, и \`yield\`. Идеален для потоковой обработки: пагинация API, чтение стримов (\`ReadableStream\` асинхронно итерируем), построчное чтение файлов.

## yield* (делегирование)

\`yield*\` делегирует другому (async)итерируемому, прозрачно прокидывая его значения и финальный \`return\`:

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; } // 1, 2, 3
\`\`\`

## Нюансы

- \`for await...of\` обрабатывает значения **по одному** — это не параллелизм. Для параллельной выборки используйте \`Promise.all\`, затем итерируйте.
- Работает и с обычным (синхронным) итерируемым промисов: каждое значение будет \`await\`-нуто.
- \`break\`/\`return\`/исключение в цикле вызывает \`return()\` итератора — шанс на очистку ресурсов (закрыть стрим).
- Поддерживает backpressure естественным образом: следующий \`next()\` не вызывается, пока тело не завершит итерацию.`,
      en: `## Async iteration

The async iteration protocol mirrors the sync one but over promises:

- **AsyncIterable** — an object with \`[Symbol.asyncIterator]()\`.
- **AsyncIterator** — \`next()\` returns \`Promise<{ value, done }>\`.

\`for await...of\` **awaits** each promise in turn, unwrapping values **sequentially**.

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();           // yield as each resolves
  }
}
for await (const page of fetchPages(urls)) {
  console.log(page);            // sequential, no buffering of everything
}
\`\`\`

## async function*

\`async function*\` creates an **async generator**: inside you can use both \`await\` and \`yield\`. Ideal for streaming: API pagination, reading streams (\`ReadableStream\` is async-iterable), line-by-line file reading.

## yield* (delegation)

\`yield*\` delegates to another (async) iterable, transparently forwarding its values and final \`return\`:

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; } // 1, 2, 3
\`\`\`

## Nuances

- \`for await...of\` processes values **one at a time** — this is not parallelism. For parallel fetching use \`Promise.all\`, then iterate.
- It also works with a sync iterable of promises: each value is \`await\`-ed.
- \`break\`/\`return\`/throw in the loop calls the iterator's \`return()\` — a chance to clean up resources (close a stream).
- It supports backpressure naturally: the next \`next()\` isn't called until the body finishes the iteration.`
    },
    codeSnippet: `// Async generator with delegation and cleanup
async function* take(asyncIter, n) {
  let i = 0;
  for await (const v of asyncIter) {
    if (i++ >= n) return;        // triggers underlying return() -> cleanup
    yield v;
  }
}

async function* numbers() {
  let i = 0;
  while (true) { await Promise.resolve(); yield i++; }
}

(async () => {
  for await (const v of take(numbers(), 3)) console.log(v); // 0, 1, 2
})();`
  },
  {
    id: 'jsts-044',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['promise-combinators', 'all-race-any-allsettled', 'async'],
    question: {
      ru: 'В чём разница между Promise.all, race, any и allSettled? Каковы их семантика и поведение при ошибках?',
      en: 'What is the difference between Promise.all, race, any, and allSettled? Their semantics and error behavior?'
    },
    answer: {
      ru: `## Четыре комбинатора

- **\`Promise.all([...])\`** — резолвится массивом результатов, когда **все** выполнены. **Fail-fast**: при первом reject немедленно реджектится этой ошибкой (остальные продолжают выполняться, но их результаты игнорируются).
- **\`Promise.allSettled([...])\`** — **никогда не реджектится**; ждёт **все** и возвращает массив \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\`. Для случаев «выполнить всё и собрать отчёт».
- **\`Promise.race([...])\`** — резолвится/реджектится **первым завершившимся** (любым исходом — fulfilled или rejected). Для таймаутов.
- **\`Promise.any([...])\`** — резолвится **первым успешным**. Реджектится только если **все** упали — с \`AggregateError\` (\`.errors\` — массив причин). Для «дай первый рабочий источник».

\`\`\`js
// timeout via race
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

## Ключевые детали

- Все принимают **iterable**, не обязательно массив; не-промисы оборачиваются через \`Promise.resolve\`.
- \`all\` сохраняет **порядок** входа в результате независимо от времени завершения.
- Пустой iterable: \`all\`/\`allSettled\` → resolved \`[]\`; \`any\` → reject (\`AggregateError\`); \`race\` → «вечно pending».
- Отмены нет: «проигравшие» в \`race\`/\`any\` **продолжают работать** (сеть не отменяется без \`AbortController\`).

## Выбор

\`all\` — нужны все, любой сбой критичен. \`allSettled\` — нужен полный отчёт. \`race\` — таймаут/первый ответ. \`any\` — первый успех из нескольких источников.`,
      en: `## The four combinators

- **\`Promise.all([...])\`** — resolves with an array of results when **all** fulfill. **Fail-fast**: on the first reject it rejects immediately with that reason (others keep running but their results are ignored).
- **\`Promise.allSettled([...])\`** — **never rejects**; waits for **all** and returns an array of \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\`. For "do everything and gather a report".
- **\`Promise.race([...])\`** — settles with the **first settled** promise (any outcome — fulfilled or rejected). For timeouts.
- **\`Promise.any([...])\`** — resolves with the **first fulfilled** one. Rejects only if **all** reject — with an \`AggregateError\` (\`.errors\` is the array of reasons). For "give me the first working source".

\`\`\`js
// timeout via race
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

## Key details

- All accept an **iterable**, not just an array; non-promises are wrapped via \`Promise.resolve\`.
- \`all\` preserves **input order** in the result regardless of completion timing.
- Empty iterable: \`all\`/\`allSettled\` → resolved \`[]\`; \`any\` → reject (\`AggregateError\`); \`race\` → stays pending forever.
- No cancellation: the "losers" in \`race\`/\`any\` **keep running** (the network isn't aborted without \`AbortController\`).

## Choosing

\`all\` — you need all, any failure is critical. \`allSettled\` — you need a full report. \`race\` — timeout/first response. \`any\` — first success out of several sources.`
    },
    codeSnippet: `const p = (v, ms, fail) => new Promise((res, rej) =>
  setTimeout(() => (fail ? rej(v) : res(v)), ms));

await Promise.all([p(1, 10), p(2, 20)]);        // [1, 2]
// await Promise.all([p('x', 5, true), p(2, 20)]); // rejects 'x' (fail-fast)

await Promise.allSettled([p(1, 10), p('e', 5, true)]);
// [{status:'fulfilled',value:1}, {status:'rejected',reason:'e'}]

await Promise.race([p(1, 30), p(2, 10)]);       // 2 (first settled)
await Promise.any([p('e', 5, true), p(2, 10)]); // 2 (first fulfilled)`
  },
  {
    id: 'jsts-045',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['error-handling', 'error-cause', 'custom-errors'],
    question: {
      ru: 'Как правильно обрабатывать ошибки в JS? Что такое Error.cause и кастомные классы ошибок?',
      en: 'How do you handle errors properly in JS? What is Error.cause and custom error classes?'
    },
    answer: {
      ru: `## Бросать Error, а не что попало

Бросать можно любое значение, но всегда бросайте **экземпляр \`Error\`** (или подкласс): у него есть \`message\`, \`name\` и **\`stack\`** (трассировка). Строки и объекты теряют стек и ломают \`instanceof\`-проверки.

## Error.cause (ES2022)

Второй аргумент конструктора — \`{ cause }\` — сохраняет **исходную ошибку**, оборачивая её в более осмысленную, без потери цепочки:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error(\`Failed to load user \${id}\`, { cause: e });
}
\`\`\`

Это решает старую проблему «проглоченного» оригинала: \`err.cause\` хранит низкоуровневую причину для логов.

## Кастомные классы

Подклассы \`Error\` дают типизированную обработку через \`instanceof\` и поля-метаданные:

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
\`\`\`

В транспилированном ES5 нужно \`Object.setPrototypeOf(this, new.target.prototype)\` из-за обрезания цепочки — в нативном ES2015+ не требуется.

## Практика

- Ловите **узко**: не глотайте все ошибки молча; различайте типы.
- Асинхронность: \`try/catch\` ловит \`await\`; для «висящих» промисов — \`.catch\` или глобальный \`unhandledrejection\`.
- Не используйте исключения для управления потоком в горячих путях — это дорого.
- \`AggregateError\` (\`Promise.any\`) собирает несколько причин в \`.errors\`.`,
      en: `## Throw Error, not arbitrary values

You can throw any value, but always throw an **\`Error\` instance** (or subclass): it has \`message\`, \`name\`, and a **\`stack\`** (trace). Strings and objects lose the stack and break \`instanceof\` checks.

## Error.cause (ES2022)

The constructor's second argument — \`{ cause }\` — preserves the **original error**, wrapping it in a more meaningful one without losing the chain:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error(\`Failed to load user \${id}\`, { cause: e });
}
\`\`\`

This solves the old "swallowed original" problem: \`err.cause\` keeps the low-level reason for logs.

## Custom classes

\`Error\` subclasses enable typed handling via \`instanceof\` and metadata fields:

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
\`\`\`

In transpiled ES5 you need \`Object.setPrototypeOf(this, new.target.prototype)\` due to chain truncation — not needed in native ES2015+.

## Practice

- Catch **narrowly**: don't silently swallow everything; distinguish types.
- Async: \`try/catch\` catches \`await\`; for floating promises use \`.catch\` or the global \`unhandledrejection\`.
- Don't use exceptions for control flow in hot paths — it's expensive.
- \`AggregateError\` (\`Promise.any\`) collects multiple reasons in \`.errors\`.`
    },
    codeSnippet: `class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

try {
  try { JSON.parse('{bad'); }
  catch (low) {
    throw new ValidationError('Invalid config', 'settings');
    // could also: new ValidationError('...', 'settings'), { cause: low }
  }
} catch (e) {
  if (e instanceof ValidationError) console.log(e.field); // 'settings'
}`
  },
  {
    id: 'jsts-046',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['regex', 'named-groups', 'lookbehind'],
    question: {
      ru: 'Какие современные возможности регулярных выражений есть в JS? Объясните именованные группы, lookbehind и проблему состояния флага `g`.',
      en: 'What modern regex features does JS have? Explain named groups, lookbehind, and the `g` flag state problem.'
    },
    answer: {
      ru: `## Современные возможности

- **Именованные группы** \`(?<year>\\d{4})\` — доступ через \`match.groups.year\`; в замене — \`$<year>\`.
- **Lookbehind** \`(?<=...)\` / \`(?<!...)\` — утверждение «перед» (ES2018). Lookahead \`(?=...)\`/\`(?!...)\` был всегда.
- **Флаг \`s\`** (dotAll) — \`.\` совпадает с переводом строки.
- **Флаг \`u\`** — корректная работа с Unicode/суррогатными парами; **\`v\`** — расширенные классы и операции над множествами.
- **\`\\p{...}\`** — Unicode property escapes (\`\\p{L}\` — буква, \`\\p{Emoji}\`).
- **\`matchAll\`** — итератор по всем совпадениям с группами.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y; // '2024'
\`\`\`

## Проблема состояния флага g/y

Регекс с флагом \`g\` или \`y\` (sticky) **сохраняет состояние** в свойстве \`lastIndex\` между вызовами \`test()\`/\`exec()\`. Один и тот же объект в цикле даёт «прыгающие» результаты:

\`\`\`js
const r = /a/g;
r.test('aa'); // true  (lastIndex -> 1)
r.test('aa'); // true  (lastIndex -> 2)
r.test('aa'); // false (lastIndex -> 0, сброс)
\`\`\`

Поэтому **не переиспользуйте** один \`g\`-регекс для разных строк/проверок: создавайте новый или сбрасывайте \`lastIndex = 0\`. \`matchAll\`/\`replaceAll\` решают это безопаснее.

## Sticky (y)

Флаг \`y\` требует совпадения **ровно с \`lastIndex\`** (без поиска дальше) — полезно для написания токенизаторов/парсеров: последовательное «откусывание» от позиции.`,
      en: `## Modern features

- **Named groups** \`(?<year>\\d{4})\` — accessed via \`match.groups.year\`; in replacement — \`$<year>\`.
- **Lookbehind** \`(?<=...)\` / \`(?<!...)\` — a "before" assertion (ES2018). Lookahead \`(?=...)\`/\`(?!...)\` always existed.
- **\`s\` flag** (dotAll) — \`.\` matches newlines.
- **\`u\` flag** — correct Unicode/surrogate-pair handling; **\`v\`** — extended classes and set operations.
- **\`\\p{...}\`** — Unicode property escapes (\`\\p{L}\` — letter, \`\\p{Emoji}\`).
- **\`matchAll\`** — an iterator over all matches with groups.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y; // '2024'
\`\`\`

## The g/y flag state problem

A regex with the \`g\` or \`y\` (sticky) flag **keeps state** in its \`lastIndex\` property between \`test()\`/\`exec()\` calls. Reusing one object in a loop gives "jumping" results:

\`\`\`js
const r = /a/g;
r.test('aa'); // true  (lastIndex -> 1)
r.test('aa'); // true  (lastIndex -> 2)
r.test('aa'); // false (lastIndex -> 0, reset)
\`\`\`

So **don't reuse** a single \`g\`-flagged regex across different strings/checks: create a new one or reset \`lastIndex = 0\`. \`matchAll\`/\`replaceAll\` handle this more safely.

## Sticky (y)

The \`y\` flag requires a match **exactly at \`lastIndex\`** (no scanning ahead) — useful for writing tokenizers/parsers: consuming from a position step by step.`
    },
    codeSnippet: `// Named groups + lookbehind: extract price after a currency sign
const re = /(?<=\\$)(?<amount>\\d+(?:\\.\\d{2})?)/;
'Total: $42.50'.match(re).groups.amount;   // '42.50'

// g-flag lastIndex pitfall
const g = /\\d/g;
console.log(g.test('a1'));  // true,  lastIndex now 2
console.log(g.test('a1'));  // false, started from lastIndex 2
g.lastIndex = 0;            // manual reset fixes it

// matchAll avoids the state issue entirely
[...'a1b2'.matchAll(/\\d/g)].map(m => m[0]); // ['1','2']`
  },
  {
    id: 'jsts-047',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['tagged-templates', 'template-literals', 'dsl'],
    question: {
      ru: 'Что такое теговые шаблонные литералы (tagged templates)? Как они устроены и где применяются?',
      en: 'What are tagged template literals? How do they work and where are they used?'
    },
    answer: {
      ru: `## Механика

Тег — это **функция перед шаблонным литералом**. Движок разбивает литерал на:

1. Массив **статических строк** (\`strings\`), у которого есть свойство \`strings.raw\` (без обработки escape-последовательностей).
2. **Подставленные выражения** как остальные аргументы.

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Hello, ', '!'], values: ['Ann']
  return strings.reduce((acc, s, i) =>
    acc + s + (values[i] ?? ''), '');
}
tag\`Hello, \${'Ann'}!\`; // 'Hello, Ann!'
\`\`\`

Тег полностью контролирует, как собрать результат — он не обязан возвращать строку.

## Применение

- **Безопасность/санитизация**: экранирование HTML или SQL внутри подстановок (защита от инъекций), т.к. тег видит, что было статикой, а что — пользовательским вводом.
- **i18n**: \`t\`Hello \${name}\`\` — извлечение ключей и подстановка перевода.
- **DSL и CSS-in-JS**: \`styled.div\`...\`\`, GraphQL \`gql\`...\`\`, SQL-билдеры — парсинг встроенного синтаксиса.
- **\`String.raw\`** — встроенный тег, возвращающий «сырую» строку без интерпретации \`\\n\` и т.п. (удобно для путей, регексов).

## Нюансы

- \`strings.length === values.length + 1\` всегда.
- \`strings\` для одного литерала **кешируется** (тот же объект при повторных вызовах) — можно использовать как ключ кеша.
- \`String.raw\`Line\\n\`\` → \`'Line\\\\n'\` (буквальный backslash-n, не перенос строки).

Теговые шаблоны — основа для типобезопасных DSL и защищённой интерполяции.`,
      en: `## Mechanics

A tag is a **function placed before a template literal**. The engine splits the literal into:

1. An array of **static strings** (\`strings\`), which has a \`strings.raw\` property (escape sequences unprocessed).
2. The **interpolated expressions** as the remaining arguments.

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Hello, ', '!'], values: ['Ann']
  return strings.reduce((acc, s, i) =>
    acc + s + (values[i] ?? ''), '');
}
tag\`Hello, \${'Ann'}!\`; // 'Hello, Ann!'
\`\`\`

The tag fully controls how to assemble the result — it need not return a string.

## Uses

- **Security/sanitization**: escaping HTML or SQL inside interpolations (injection protection), since the tag sees what was static vs. user input.
- **i18n**: \`t\`Hello \${name}\`\` — extracting keys and substituting translations.
- **DSLs and CSS-in-JS**: \`styled.div\`...\`\`, GraphQL \`gql\`...\`\`, SQL builders — parsing embedded syntax.
- **\`String.raw\`** — a built-in tag returning the "raw" string without interpreting \`\\n\` etc. (handy for paths, regexes).

## Nuances

- \`strings.length === values.length + 1\` always.
- The \`strings\` array for one literal is **cached** (same object across calls) — usable as a cache key.
- \`String.raw\`Line\\n\`\` → \`'Line\\\\n'\` (a literal backslash-n, not a newline).

Tagged templates underpin type-safe DSLs and safe interpolation.`
    },
    codeSnippet: `// HTML-escaping tag prevents injection from interpolated values
const escape = (s) => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function html(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (i < values.length ? escape(values[i]) : ''), '');
}

const user = '<script>alert(1)</script>';
html\`<p>\${user}</p>\`;
// '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'

String.raw\`C:\\path\\to\`; // 'C:\\path\\to' (backslashes kept literally)`
  },
  {
    id: 'jsts-048',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['optional-chaining', 'nullish-coalescing', 'short-circuit'],
    question: {
      ru: 'Какие тонкости у опциональной цепочки `?.` и оператора `??`? Чем `??` отличается от `||` и как они короткозамыкаются?',
      en: 'What are the subtleties of optional chaining `?.` and `??`? How does `??` differ from `||` and how do they short-circuit?'
    },
    answer: {
      ru: `## Optional chaining ?.

\`a?.b\` возвращает \`undefined\`, если \`a\` — \`null\` или \`undefined\`, иначе \`a.b\`. Формы: \`a?.b\`, \`a?.[key]\`, \`a?.()\` (вызов).

**Короткое замыкание**: если левая часть «нулевая», **вся остальная цепочка пропускается** — побочные эффекты справа не выполняются:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;
obj?.method(fn()); // fn НЕ вызвана, calls === 0
\`\`\`

## Nullish coalescing ??

\`a ?? b\` возвращает \`b\`, только если \`a\` — \`null\`/\`undefined\`. В отличие от \`||\`, который срабатывает на **любое falsy** (\`0\`, \`''\`, \`false\`, \`NaN\`):

\`\`\`js
0 || 5;   // 5  — теряем валидный 0
0 ?? 5;   // 0  — сохраняем 0
'' ?? 'x'; // '' — сохраняем пустую строку
\`\`\`

\`??\` — правильный выбор для дефолтов, когда \`0\`/\`''\`/\`false\` — валидные значения.

## Тонкости

- **Нельзя смешивать** \`??\` с \`||\`/\`&&\` без скобок: \`a || b ?? c\` → SyntaxError. Нужно \`(a || b) ?? c\`.
- \`??=\`, \`||=\`, \`&&=\` — логические присваивания с коротким замыканием: \`a ??= b\` присваивает, только если \`a\` нулевое.
- \`a?.b.c\` — если \`a\` нулевое, вся цепочка \`undefined\`; но если \`a.b\` нулевое, \`a.b.c\` всё равно бросит (нужно \`a?.b?.c\`).
- \`delete a?.b\` — no-op, если \`a\` нулевое.
- \`?.\` не помогает против \`a.b\`, где \`a\` — \`0\` или \`''\` (это не nullish, и обращение к свойству числа/строки легально через автобоксинг).`,
      en: `## Optional chaining ?.

\`a?.b\` returns \`undefined\` if \`a\` is \`null\` or \`undefined\`, else \`a.b\`. Forms: \`a?.b\`, \`a?.[key]\`, \`a?.()\` (call).

**Short-circuit**: if the left side is nullish, **the rest of the chain is skipped** — side effects on the right don't run:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;
obj?.method(fn()); // fn NOT called, calls === 0
\`\`\`

## Nullish coalescing ??

\`a ?? b\` returns \`b\` only if \`a\` is \`null\`/\`undefined\`. Unlike \`||\`, which fires on **any falsy** (\`0\`, \`''\`, \`false\`, \`NaN\`):

\`\`\`js
0 || 5;   // 5  — loses a valid 0
0 ?? 5;   // 0  — keeps 0
'' ?? 'x'; // '' — keeps empty string
\`\`\`

\`??\` is the right choice for defaults when \`0\`/\`''\`/\`false\` are valid values.

## Subtleties

- You **can't mix** \`??\` with \`||\`/\`&&\` without parentheses: \`a || b ?? c\` → SyntaxError. Use \`(a || b) ?? c\`.
- \`??=\`, \`||=\`, \`&&=\` — short-circuiting logical assignments: \`a ??= b\` assigns only if \`a\` is nullish.
- \`a?.b.c\` — if \`a\` is nullish the whole chain is \`undefined\`; but if \`a.b\` is nullish, \`a.b.c\` still throws (you need \`a?.b?.c\`).
- \`delete a?.b\` is a no-op if \`a\` is nullish.
- \`?.\` doesn't help against \`a.b\` where \`a\` is \`0\` or \`''\` (not nullish, and property access on a number/string is legal via autoboxing).`
    },
    codeSnippet: `const config = { retries: 0, name: '' };

config.retries || 3;   // 3  — WRONG, 0 is valid
config.retries ?? 3;   // 0  — correct
config.name ?? 'guest';// '' — keeps empty string

const user = { profile: null };
user.profile?.avatar?.url;   // undefined, no throw
user.profile?.load?.();      // skipped, load() never called

// logical assignment
const opts = {};
opts.timeout ??= 5000;       // sets only if nullish -> 5000`
  },
  {
    id: 'jsts-049',
    category: 'javascript-typescript',
    level: 'Medium',
    tags: ['intl', 'i18n', 'formatting'],
    question: {
      ru: 'Что такое Intl API и зачем оно нужно? Приведите примеры форматирования чисел, дат и сравнения строк.',
      en: 'What is the Intl API and why use it? Give examples of number/date formatting and string comparison.'
    },
    answer: {
      ru: `## Intl API

\`Intl\` — встроенное API **интернационализации**: форматирование чисел, валют, дат, относительного времени, склонений и локале-зависимого сравнения. Заменяет ручные хаки и сторонние библиотеки для большинства задач — без бандла данных, используя встроенную базу ICU браузера/Node.

## Числа и валюта

\`\`\`js
new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR'
}).format(1234.5); // '1.234,50 €'

new Intl.NumberFormat('en-US', {
  notation: 'compact'
}).format(1_500_000); // '1.5M'
\`\`\`

## Даты

\`\`\`js
new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long', timeStyle: 'short'
}).format(new Date()); // '29 июня 2026 г., 14:30'
\`\`\`

## Прочие форматтеры

- **\`Intl.RelativeTimeFormat\`** — «2 дня назад», «через 3 часа».
- **\`Intl.PluralRules\`** — корректные формы множественного числа (важно для русского: 1 файл / 2 файла / 5 файлов).
- **\`Intl.ListFormat\`** — «A, B и C».
- **\`Intl.Collator\`** — локале-корректная сортировка/сравнение (например, \`ä\` рядом с \`a\` в немецком, регистро-/диакритико-чувствительность).

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare); // ['a','ä','z']
\`\`\`

## Производительность

Создание форматтера **дорого** — **кешируйте** инстансы и переиспользуйте, а не создавайте в цикле/рендере. Это правильный способ форматирования вместо \`toFixed\`/\`toLocaleString\` без опций, дающих несогласованные результаты.`,
      en: `## Intl API

\`Intl\` is the built-in **internationalization** API: formatting numbers, currency, dates, relative time, plurals, and locale-aware comparison. It replaces manual hacks and third-party libs for most tasks — no data bundle, using the browser/Node built-in ICU database.

## Numbers and currency

\`\`\`js
new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR'
}).format(1234.5); // '1.234,50 €'

new Intl.NumberFormat('en-US', {
  notation: 'compact'
}).format(1_500_000); // '1.5M'
\`\`\`

## Dates

\`\`\`js
new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long', timeStyle: 'short'
}).format(new Date()); // '29 June 2026 at 14:30'
\`\`\`

## Other formatters

- **\`Intl.RelativeTimeFormat\`** — "2 days ago", "in 3 hours".
- **\`Intl.PluralRules\`** — correct plural forms (crucial for languages like Russian: 1 file / 2 files / 5 files).
- **\`Intl.ListFormat\`** — "A, B, and C".
- **\`Intl.Collator\`** — locale-correct sorting/comparison (e.g. \`ä\` next to \`a\` in German, case-/diacritic-sensitivity).

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare); // ['a','ä','z']
\`\`\`

## Performance

Creating a formatter is **expensive** — **cache** instances and reuse them, don't create one in a loop/render. This is the correct way to format instead of \`toFixed\`/\`toLocaleString\` without options, which give inconsistent results.`
    },
    codeSnippet: `// Cache the formatter, reuse it
const price = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD'
});
price.format(9.5);    // '$9.50'

const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
rel.format(-1, 'day');  // 'yesterday'
rel.format(3, 'hour');  // 'in 3 hours'

// Locale-aware sort (naive .sort() would put 'ä' after 'z')
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare); // ['a', 'ä', 'z']`
  },
  {
    id: 'jsts-050',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['assertion-functions', 'type-guards', 'narrowing'],
    question: {
      ru: 'В чём разница между type guard `x is T` и assertion-функцией `asserts x is T` в TypeScript? Когда что использовать?',
      en: 'What is the difference between a type guard `x is T` and an assertion function `asserts x is T` in TypeScript? When to use which?'
    },
    answer: {
      ru: `## Type guard (\`x is T\`)

Функция-предикат, **возвращающая boolean**, чей тип возврата \`arg is T\`. Если она вернула \`true\`, TS **сужает** тип аргумента до \`T\` в той ветке:

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
if (isString(val)) {
  val.toUpperCase(); // val: string
}
\`\`\`

Используется для **ветвления**: в \`if\`/\`filter\` сужаем тип, не бросая ошибку.

## Assertion function (\`asserts x is T\`)

Функция, которая **ничего не возвращает** (тип возврата \`asserts x is T\` или \`asserts cond\`), но **бросает**, если условие ложно. После её вызова TS считает тип **гарантированно суженным** на весь оставшийся код:

\`\`\`ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('not a string');
}

assertString(val);
val.toUpperCase(); // val: string — на всё, что ниже
\`\`\`

## Когда что

- **Type guard** — когда нужно **по-разному обработать** разные типы (есть альтернативная ветка).
- **Assertion** — когда «иначе это баг»: дальше код **полагается** на инвариант, и продолжать с неверным типом нельзя (валидация входа, инварианты).

## Тонкости

- TS **не проверяет** тело предиката/ассерта — он вам верит. Неправильная реализация = unsound (ложное сужение).
- \`asserts cond\` (без \`is T\`) сужает по условию: \`assert(x !== null)\` уберёт \`null\` из типа \`x\`.
- Для assertion-функции, присвоенной переменной, нужна **явная аннотация типа** — TS не выводит \`asserts\` сам.`,
      en: `## Type guard (\`x is T\`)

A predicate function **returning boolean** whose return type is \`arg is T\`. If it returns \`true\`, TS **narrows** the argument to \`T\` in that branch:

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
if (isString(val)) {
  val.toUpperCase(); // val: string
}
\`\`\`

Used for **branching**: in \`if\`/\`filter\` we narrow without throwing.

## Assertion function (\`asserts x is T\`)

A function that **returns nothing** (return type \`asserts x is T\` or \`asserts cond\`) but **throws** if the condition is false. After it's called, TS treats the type as **guaranteed narrowed** for all subsequent code:

\`\`\`ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('not a string');
}

assertString(val);
val.toUpperCase(); // val: string — for everything below
\`\`\`

## When to use which

- **Type guard** — when you need to **handle types differently** (there is an alternative branch).
- **Assertion** — when "otherwise it's a bug": code below **relies** on the invariant and cannot continue with the wrong type (input validation, invariants).

## Subtleties

- TS **does not check** the predicate/assert body — it trusts you. A wrong implementation is unsound (false narrowing).
- \`asserts cond\` (without \`is T\`) narrows by condition: \`assert(x !== null)\` removes \`null\` from \`x\`'s type.
- An assertion function assigned to a variable needs an **explicit type annotation** — TS won't infer \`asserts\`.`
    },
    codeSnippet: `// Type guard: branch on the result
function isNonNull<T>(x: T): x is NonNullable<T> {
  return x != null;
}
const arr: (string | null)[] = ['a', null, 'b'];
const clean: string[] = arr.filter(isNonNull); // narrowed via guard

// Assertion: throw on violation, narrow everything after
function assertDefined<T>(x: T, name: string): asserts x is NonNullable<T> {
  if (x == null) throw new Error(\`\${name} is required\`);
}
function use(id?: string) {
  assertDefined(id, 'id');
  return id.toUpperCase(); // id: string for the rest of the function
}`
  },
  {
    id: 'jsts-051',
    category: 'javascript-typescript',
    level: 'Expert',
    tags: ['distributive-conditional-types', 'never', 'union'],
    question: {
      ru: 'Что такое дистрибутивные условные типы в TypeScript? Как работает распределение по объединению и как его отключить?',
      en: 'What are distributive conditional types in TypeScript? How does distribution over a union work and how do you disable it?'
    },
    answer: {
      ru: `## Дистрибутивность

Условный тип \`T extends U ? X : Y\` **распределяется по объединению**, когда \`T\` — это **«голый» (naked) типовой параметр**. TS применяет условие к **каждому члену** объединения по отдельности, затем объединяет результаты:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]   (НЕ (string | number)[])
\`\`\`

## never и пустое объединение

Распределение по \`never\` (пустое объединение) даёт \`never\`:

\`\`\`ts
type Filtered = ToArray<never>; // never
\`\`\`

Это основа фильтрации: \`Exclude<T, U> = T extends U ? never : T\` — отбрасывает члены через распределение, схлопывая отброшенные в \`never\`.

## Как отключить распределение

Оберните **обе** стороны \`extends\` в кортеж (или другой не-голый контекст) — тогда \`T\` перестаёт быть «голым»:

\`\`\`ts
type IsUnion<T> = [T] extends [any] ? ... ; // распределения нет
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;  // true — без обёртки получили бы never
\`\`\`

\`\`\`ts
type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>; // 'no' — союз проверяется целиком
\`\`\`

## Практика

- Большинство утилит (\`Exclude\`, \`Extract\`, \`NonNullable\`) **намеренно** дистрибутивны.
- Когда нужно проверить **весь союз как единое целое** (например, «является ли тип ровно \`never\`»), оборачивайте в \`[T]\`.
- Помните: \`boolean\` — это \`true | false\`, поэтому \`T extends true ? ...\` тоже распределяется по \`boolean\`.`,
      en: `## Distributivity

A conditional type \`T extends U ? X : Y\` **distributes over a union** when \`T\` is a **naked type parameter**. TS applies the condition to **each member** of the union separately, then unions the results:

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]   (NOT (string | number)[])
\`\`\`

## never and the empty union

Distribution over \`never\` (the empty union) yields \`never\`:

\`\`\`ts
type Filtered = ToArray<never>; // never
\`\`\`

This underlies filtering: \`Exclude<T, U> = T extends U ? never : T\` — drops members via distribution, collapsing dropped ones into \`never\`.

## How to disable distribution

Wrap **both** sides of \`extends\` in a tuple (or another non-naked context) — then \`T\` stops being naked:

\`\`\`ts
type IsUnion<T> = [T] extends [any] ? ... ; // no distribution
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;  // true — without the wrapper you'd get never
\`\`\`

\`\`\`ts
type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>; // 'no' — the whole union is checked
\`\`\`

## Practice

- Most utilities (\`Exclude\`, \`Extract\`, \`NonNullable\`) are **intentionally** distributive.
- When you need to check the **whole union as a unit** (e.g. "is this type exactly \`never\`"), wrap it in \`[T]\`.
- Remember: \`boolean\` is \`true | false\`, so \`T extends true ? ...\` also distributes over \`boolean\`.`
    },
    codeSnippet: `// Distributive: each member processed separately
type Boxed<T> = T extends any ? { value: T } : never;
type B = Boxed<string | number>;
// { value: string } | { value: number }

// Exclude relies on distribution + never collapse
type WithoutNull<T> = T extends null | undefined ? never : T;
type C = WithoutNull<string | null | number>; // string | number

// Disable distribution by tupling both sides
type IsExactlyNever<T> = [T] extends [never] ? true : false;
type D1 = IsExactlyNever<never>;         // true
type D2 = IsExactlyNever<string>;        // false`
  },
  {
    id: 'jsts-052',
    category: 'javascript-typescript',
    level: 'Hard',
    tags: ['tsconfig', 'strict-flags', 'no-unchecked-indexed-access'],
    question: {
      ru: 'Какие строгие флаги tsconfig самые важные? Объясните strictNullChecks, noUncheckedIndexedAccess и exactOptionalPropertyTypes.',
      en: 'Which strict tsconfig flags matter most? Explain strictNullChecks, noUncheckedIndexedAccess, and exactOptionalPropertyTypes.'
    },
    answer: {
      ru: `## strict

\`"strict": true\` включает целый набор флагов сразу: \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`. Это базовая планка для любого нового проекта.

## strictNullChecks

Самый важный. \`null\` и \`undefined\` **исключаются** из всех типов по умолчанию — их нужно указывать явно (\`string | null\`) и сужать перед использованием. Ловит огромный класс «cannot read property of undefined» на этапе компиляции.

\`\`\`ts
let s: string = null; // Error при strictNullChecks
\`\`\`

## noUncheckedIndexedAccess

Доступ по индексу/ключу к массиву или объекту с index-signature добавляет \`| undefined\` к результату — потому что элемента может не быть:

\`\`\`ts
const arr: number[] = [1, 2];
const x = arr[10];   // тип number | undefined (хотя рантайм даст undefined)
x.toFixed();         // Error — нужно проверить
\`\`\`

Делает работу с массивами/словарями честнее, но добавляет проверок. Не входит в \`strict\` — включают отдельно.

## exactOptionalPropertyTypes

Различает «свойство отсутствует» и «свойство равно \`undefined\`». При нём \`{ a?: string }\` **не** позволяет \`{ a: undefined }\` — только отсутствие ключа или \`string\`:

\`\`\`ts
interface T { a?: string }
const t: T = { a: undefined }; // Error при exactOptionalPropertyTypes
\`\`\`

## Прочие полезные

- \`noImplicitOverride\` — требует \`override\` при переопределении.
- \`noFallthroughCasesInSwitch\`, \`noImplicitReturns\` — ловят логические дыры.
- \`useUnknownInCatchVariables\` — \`catch (e)\` даёт \`unknown\`, а не \`any\` (безопаснее).

Рекомендация: включать \`strict\` + \`noUncheckedIndexedAccess\` с самого старта; ретрофит на большом проекте болезнен.`,
      en: `## strict

\`"strict": true\` turns on a whole set at once: \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`. It's the baseline for any new project.

## strictNullChecks

The most important. \`null\` and \`undefined\` are **excluded** from all types by default — you must list them explicitly (\`string | null\`) and narrow before use. Catches a huge class of "cannot read property of undefined" at compile time.

\`\`\`ts
let s: string = null; // Error under strictNullChecks
\`\`\`

## noUncheckedIndexedAccess

Indexing into an array or an object with an index signature adds \`| undefined\` to the result — because the element may be missing:

\`\`\`ts
const arr: number[] = [1, 2];
const x = arr[10];   // type number | undefined (runtime gives undefined)
x.toFixed();         // Error — must check first
\`\`\`

Makes array/dictionary work more honest at the cost of extra checks. Not part of \`strict\` — enable it separately.

## exactOptionalPropertyTypes

Distinguishes "property absent" from "property is \`undefined\`". With it, \`{ a?: string }\` does **not** allow \`{ a: undefined }\` — only an absent key or a \`string\`:

\`\`\`ts
interface T { a?: string }
const t: T = { a: undefined }; // Error under exactOptionalPropertyTypes
\`\`\`

## Other useful ones

- \`noImplicitOverride\` — requires \`override\` when overriding.
- \`noFallthroughCasesInSwitch\`, \`noImplicitReturns\` — catch logic holes.
- \`useUnknownInCatchVariables\` — \`catch (e)\` is \`unknown\`, not \`any\` (safer).

Recommendation: enable \`strict\` + \`noUncheckedIndexedAccess\` from day one; retrofitting a large project is painful.`
    },
    codeSnippet: `// noUncheckedIndexedAccess in action
const dict: Record<string, number> = { a: 1 };
const v = dict['b'];   // type: number | undefined
// v.toFixed();        // Error: Object is possibly 'undefined'
if (v !== undefined) v.toFixed(); // ok after narrowing

// exactOptionalPropertyTypes
interface Opt { name?: string }
const a: Opt = {};                 // ok (absent)
const b: Opt = { name: 'x' };      // ok
// const c: Opt = { name: undefined }; // Error: undefined not assignable

// strictNullChecks forces explicit handling
function len(s: string | null) {
  return s?.length ?? 0;            // must account for null
}`
  }
];
