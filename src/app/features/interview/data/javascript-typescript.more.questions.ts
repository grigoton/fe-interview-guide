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
      ru: `## 🧩 Простыми словами

Представь, что ты пытаешься записать одну треть (1/3) в обычной десятичной дроби: получается 0.3333... — бесконечный «хвост», который приходится где-то обрубить. Компьютер думает не в десятках, а в двойках, и для него точно так же «неудобны» числа вроде 0.1 и 0.2 — он не может записать их точно, только очень близко. Поэтому \`0.1 + 0.2\` даёт не ровно \`0.3\`, а \`0.30000000000000004\` — крошечную погрешность округления. Это не баг JavaScript, а свойство того, как все обычные языки хранят дробные числа.

### Почему так: двоичная плавающая точка

В JS каждое \`number\` — это **64-битное число стандарта IEEE-754** двойной точности (тот самый формат, что и в большинстве языков). Эти 64 бита делятся так: 1 бит на знак (плюс/минус), 11 бит на экспоненту (масштаб, «где стоит точка») и 52 бита на мантиссу (сами значащие цифры).

Многие десятичные дроби, например \`0.1\` и \`0.2\`, **невозможно представить точно** в двоичной системе — ровно как \`1/3\` нельзя точно записать в десятичной. Компьютер округляет их до ближайшего значения, которое он умеет хранить. Когда ты складываешь два таких «почти правильных» числа, маленькие погрешности складываются, и результат чуть-чуть промахивается мимо ровного \`0.3\`.

### Точность и диапазон: что стоит знать

- **\`Number.EPSILON\`** (примерно \`2.22e-16\`) — это размер «щели» между \`1\` и следующим числом, которое JS способен представить. По сути, наименьшая заметная разница около единицы. Её удобно использовать как допуск при сравнении.
- **\`Number.MAX_SAFE_INTEGER\`** = 2^53 − 1 (\`9007199254740991\`) — граница, до которой все целые числа хранятся точно. За ней целые начинают «слипаться»: например, \`9007199254740993 === 9007199254740992\` оказывается \`true\`, потому что для нечётного числа уже не хватает битов.
- Существуют **\`+0\` и \`−0\`** — положительный и отрицательный ноль. Обычное \`===\` считает их равными, но \`Object.is(0, -0)\` вернёт \`false\`, а \`1 / -0\` даст \`-Infinity\`. Это редкий, но реальный нюанс.

### Как правильно сравнивать дробные числа

Не сравнивай дроби на строгое равенство. Вместо этого проверяй, что разница между ними **меньше крошечного допуска** (эпсилон):

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;
eq(0.1 + 0.2, 0.3); // true
\`\`\`

Здесь \`Math.abs(a - b)\` — это расстояние между числами по модулю; если оно меньше \`eps\`, считаем числа «практически равными».

### Деньги — особый случай

Для денег **никогда не храни доллары как дробный float**: погрешности в финансах недопустимы. Варианты:

- храни суммы в **целых центах** (обычные целые числа);
- используй **\`BigInt\`** для больших целых;
- бери **decimal-библиотеку** (например, decimal.js), которая считает в десятичной системе точно.

Округлить до фиксированного числа знаков можно через \`(x).toFixed(2)\`, но помни: он возвращает **строку** и сам опирается на IEEE-754, поэтому на пограничных значениях иногда округляет неожиданно.

## ⚠️ Подводные камни

- Сравнивать дроби через \`===\` — почти всегда ошибка; используй допуск.
- \`toFixed\` возвращает строку, а не число, и не идеально точен на границах.
- Целые больше \`2^53 − 1\` теряют точность — для них нужен \`BigInt\`.
- \`+0\` и \`−0\` равны при \`===\`, но различимы через \`Object.is\` и деление.

## 🎯 Запомни

- \`number\` в JS — это IEEE-754 double; многие десятичные дроби хранятся приблизительно, отсюда \`0.1 + 0.2 !== 0.3\`.
- Сравнивай дроби через \`Math.abs(a - b) < Number.EPSILON\`, а не через \`===\`.
- Деньги считай в целых центах, \`BigInt\` или decimal-библиотеке — не во float.
- За пределами \`Number.MAX_SAFE_INTEGER\` целые теряют точность.`,
      en: `## 🧩 In plain words

Imagine trying to write one third (1/3) as an ordinary decimal: you get 0.3333... — an endless tail you have to cut off somewhere. A computer doesn't think in tens, it thinks in twos, and for it numbers like 0.1 and 0.2 are just as "awkward" — it can't store them exactly, only very close. So \`0.1 + 0.2\` isn't exactly \`0.3\`, it's \`0.30000000000000004\` — a tiny rounding error. This isn't a JavaScript bug; it's how nearly every language stores fractional numbers.

### Why this happens: binary floating point

In JS every \`number\` is a **64-bit IEEE-754 double** (the same format used by most languages). Those 64 bits are split into: 1 sign bit (plus/minus), 11 exponent bits (the scale — "where the point sits"), and 52 mantissa bits (the significant digits themselves).

Many decimal fractions like \`0.1\` and \`0.2\` are **impossible to represent exactly** in binary — just as \`1/3\` can't be written exactly in decimal. The computer rounds them to the nearest value it can store. When you add two of these "almost right" numbers, the small errors pile up and the result lands slightly off a clean \`0.3\`.

### Precision and range: what's worth knowing

- **\`Number.EPSILON\`** (about \`2.22e-16\`) is the size of the "gap" between \`1\` and the next number JS can represent — essentially the smallest noticeable difference around 1. It's handy as a tolerance when comparing.
- **\`Number.MAX_SAFE_INTEGER\`** = 2^53 − 1 (\`9007199254740991\`) is the limit up to which every integer is stored exactly. Beyond it integers start "clumping": \`9007199254740993 === 9007199254740992\` is \`true\`, because there aren't enough bits left for the odd one.
- There is a **\`+0\` and a \`−0\`** — positive and negative zero. Plain \`===\` treats them as equal, but \`Object.is(0, -0)\` returns \`false\`, and \`1 / -0\` gives \`-Infinity\`. A rare but real gotcha.

### How to compare floats correctly

Don't compare floats for strict equality. Instead, check that the difference between them is **smaller than a tiny tolerance** (epsilon):

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;
eq(0.1 + 0.2, 0.3); // true
\`\`\`

Here \`Math.abs(a - b)\` is the distance between the numbers; if it's below \`eps\`, we treat them as "close enough to equal."

### Money is a special case

For money, **never store dollars as a float**: financial errors are unacceptable. Options:

- store amounts as **integer cents** (plain integers);
- use **\`BigInt\`** for large integers;
- use a **decimal library** (e.g. decimal.js) that computes exactly in base 10.

You can round to a fixed number of digits with \`(x).toFixed(2)\`, but remember: it returns a **string** and is itself built on IEEE-754, so at boundary values it sometimes rounds unexpectedly.

## ⚠️ Common pitfalls

- Comparing floats with \`===\` is almost always wrong; use a tolerance.
- \`toFixed\` returns a string, not a number, and isn't perfectly exact at boundaries.
- Integers above \`2^53 − 1\` lose precision — use \`BigInt\` for those.
- \`+0\` and \`−0\` are equal under \`===\` but distinguishable via \`Object.is\` and division.

## 🎯 Key takeaways

- A JS \`number\` is an IEEE-754 double; many decimals are stored approximately, hence \`0.1 + 0.2 !== 0.3\`.
- Compare floats with \`Math.abs(a - b) < Number.EPSILON\`, not \`===\`.
- Handle money as integer cents, \`BigInt\`, or a decimal library — never as a float.
- Beyond \`Number.MAX_SAFE_INTEGER\`, integers lose precision.`
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
      ru: `## 🧩 Простыми словами

Обычные числа в JavaScript похожи на калькулятор с ограниченным экраном: после определённого большого значения цифры перестают помещаться точно, и число начинает «врать». \`BigInt\` — это как калькулятор с бесконечным экраном: он умеет хранить **целые** числа любого размера абсолютно точно. Цена за это — он работает только с целыми (без дробей) и его нельзя бездумно смешивать с обычными числами.

### Что такое BigInt

\`BigInt\` — это отдельный **примитивный тип** для целых чисел **произвольной точности**, у которого нет потолка \`Number.MAX_SAFE_INTEGER\` (2^53 − 1), за которым обычные числа теряют точность. Записать \`BigInt\` можно двумя способами: добавить суффикс \`n\` к числу (\`10n\`) или вызвать функцию \`BigInt(10)\`. Проверка типа: \`typeof 10n === 'bigint'\`.

### Когда он нужен

- Большие целые числа: **id из базы данных** (часто 64-битные), временные метки в наносекундах, криптография, хеши.
- Любая точная целочисленная арифметика **за пределами безопасного диапазона** обычных чисел.

### Ограничения и подводные камни

- **Нельзя смешивать с \`Number\`** в арифметике: \`1n + 1\` бросает \`TypeError\`. Нужно явно приводить типы — либо \`1n + BigInt(1)\`, либо \`Number(1n) + 1\`.
- **Только целые**: дробной части нет, деление обрубается. \`5n / 2n\` даёт \`2n\`, а не \`2.5\`.
- **Не работает с \`Math\`**: например, \`Math.sqrt(9n)\` бросит ошибку.
- **\`JSON.stringify(10n)\` бросает \`TypeError\`** — BigInt нельзя сериализовать напрямую; нужен свой преобразователь (заменить на строку) или метод \`toJSON\`.
- **Медленнее \`Number\`** для маленьких значений, поэтому не стоит применять его везде подряд.

\`\`\`js
const big = 9007199254740991n;
big + 2n;          // 9007199254740993n — точно!
typeof big;        // 'bigint'

// сравнения с Number работают (==), но не строгое ===
10n == 10;         // true
10n === 10;        // false
\`\`\`

В этом примере видно главное преимущество: \`big + 2n\` даёт абсолютно точный результат, тогда как обычный \`Number\` на таком значении уже начал бы округлять.

### Как работают сравнения

Сравнения по величине (\`<\`, \`>\`, \`==\`) между \`BigInt\` и \`Number\` **разрешены** и дают корректный результат: \`10n == 10\` — это \`true\`. А вот строгое \`===\` всегда вернёт \`false\`, потому что типы разные (\`bigint\` против \`number\`). Держи это в голове, когда пишешь условия.

## ⚠️ Подводные камни

- \`1n + 1\` — это \`TypeError\`, а не \`2n\`: смешивать типы в арифметике нельзя.
- Деление \`BigInt\` обрубает дробную часть: \`7n / 2n === 3n\`.
- \`JSON.stringify\` на объекте с \`BigInt\` падает — нужен свой сериализатор.
- \`10n === 10\` всегда \`false\`; для равенства значений используй \`==\`.
- Не бери \`BigInt\` для дробной математики или для мелких чисел, где важна скорость.

## 🎯 Запомни

- \`BigInt\` — примитив для точных целых чисел любого размера; литерал с суффиксом \`n\`.
- Нельзя смешивать с \`Number\` в арифметике без явного приведения.
- Только целые: без дробей, без \`Math\`, без прямой сериализации в JSON.
- Используй для больших id, таймстампов, криптографии — не для повседневных мелких чисел.`,
      en: `## 🧩 In plain words

Ordinary JavaScript numbers are like a calculator with a limited screen: past a certain large value the digits no longer fit exactly and the number starts "lying." \`BigInt\` is like a calculator with an infinite screen — it can store **whole** numbers of any size with perfect accuracy. The price: it only handles integers (no fractions) and you can't casually mix it with ordinary numbers.

### What BigInt is

\`BigInt\` is a separate **primitive type** for **arbitrary-precision** integers, with no \`Number.MAX_SAFE_INTEGER\` (2^53 − 1) ceiling — the point beyond which ordinary numbers lose precision. You write a \`BigInt\` two ways: add the \`n\` suffix to a number (\`10n\`), or call \`BigInt(10)\`. Type check: \`typeof 10n === 'bigint'\`.

### When to use it

- Large integers: **64-bit database ids**, nanosecond timestamps, cryptography, hashes.
- Any exact integer arithmetic **beyond the safe range** of ordinary numbers.

### Limits and gotchas

- **Can't mix with \`Number\`** in arithmetic: \`1n + 1\` throws a \`TypeError\`. You must coerce explicitly — either \`1n + BigInt(1)\` or \`Number(1n) + 1\`.
- **Integers only**: no fractional part, division truncates. \`5n / 2n\` is \`2n\`, not \`2.5\`.
- **Doesn't work with \`Math\`**: e.g. \`Math.sqrt(9n)\` throws.
- **\`JSON.stringify(10n)\` throws a \`TypeError\`** — BigInt can't be serialized directly; you need a custom replacer (convert to string) or a \`toJSON\` method.
- **Slower than \`Number\`** for small values, so don't reach for it everywhere.

\`\`\`js
const big = 9007199254740991n;
big + 2n;          // 9007199254740993n — exact!
typeof big;        // 'bigint'

// comparisons with Number work (==), but not strict ===
10n == 10;         // true
10n === 10;        // false
\`\`\`

This example shows the main win: \`big + 2n\` is perfectly exact, whereas a plain \`Number\` at that magnitude would already be rounding.

### How comparisons work

Ordering comparisons (\`<\`, \`>\`, \`==\`) between \`BigInt\` and \`Number\` are **allowed** and give correct results: \`10n == 10\` is \`true\`. But strict \`===\` is always \`false\`, because the types differ (\`bigint\` vs \`number\`). Keep that in mind when writing conditions.

## ⚠️ Common pitfalls

- \`1n + 1\` is a \`TypeError\`, not \`2n\`: you can't mix types in arithmetic.
- BigInt division truncates: \`7n / 2n === 3n\`.
- \`JSON.stringify\` on an object containing a \`BigInt\` throws — supply a custom serializer.
- \`10n === 10\` is always \`false\`; use \`==\` to compare values.
- Don't use \`BigInt\` for fractional math or for small numbers where speed matters.

## 🎯 Key takeaways

- \`BigInt\` is a primitive for exact integers of any size; literal uses the \`n\` suffix.
- You can't mix it with \`Number\` in arithmetic without explicit coercion.
- Integers only: no fractions, no \`Math\`, no direct JSON serialization.
- Use it for large ids, timestamps, crypto — not for everyday small numbers.`
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
      ru: `## 🧩 Простыми словами

Обычно в JS ты работаешь с числами и строками, не задумываясь, как они лежат в памяти. Но иногда нужно работать с **сырыми байтами** напрямую — например, читать картинку, звук или сетевой пакет. Представь \`ArrayBuffer\` как чистый лист памяти, а \`TypedArray\` и \`DataView\` — как два разных «очка», через которые ты на этот лист смотришь и понимаешь, что за байты там лежат. Без очков лист нечитаем; очки задают, как трактовать байты.

### ArrayBuffer — сырая память

\`ArrayBuffer\` — это **непрерывный блок памяти** фиксированного размера, измеряемый в байтах. Сам по себе он не читается и не пишется: это просто «коробка с байтами». Чтобы что-то с ней сделать, нужен **вид** (view) поверх неё.

### TypedArray — типизированный вид

Типизированные массивы (\`Int8Array\`, \`Uint8Array\`, \`Float32Array\`, \`Float64Array\`, \`BigInt64Array\` и другие) — это **виды с фиксированным типом элемента** поверх буфера. Они хранят числа в бинарном виде прямо в памяти буфера, без обёрток-объектов (без «боксинга»), поэтому они компактны и быстры для числовых данных.

Несколько видов могут смотреть на **один и тот же** буфер одновременно (это называется наложением, aliasing) — записал байты через один вид, прочитал как числа через другой. Отдельно стоит \`Uint8ClampedArray\`: он **зажимает** значения в диапазон 0..255 (всё, что меньше 0, становится 0, всё, что больше 255 — 255), что удобно для пикселей canvas.

### DataView — гибкий вид с контролем порядка байт

\`DataView\` — это **универсальный вид**, который позволяет читать и писать значения **разных типов** по любому смещению в буфере, с явным управлением **endianness** (порядком байт). Endianness — это то, в каком порядке байты многобайтового числа лежат в памяти:

- **Little-endian** — младший байт идёт первым (так работают процессоры x86; это же порядок по умолчанию у TypedArray на большинстве платформ).
- **Big-endian** — старший байт первым (его называют «сетевым порядком», он часто встречается в бинарных протоколах и форматах файлов).

Ключевая проблема: TypedArray использует порядок байт **той платформы**, на которой выполняется код, а он непредсказуем. \`DataView\` же позволяет задать порядок **явно**, поэтому именно он незаменим при разборе бинарных форматов (PNG, WAV, сетевые пакеты), где порядок байт строго определён спецификацией.

\`\`\`js
const buf = new ArrayBuffer(8);
const dv = new DataView(buf);
dv.setInt32(0, 256, false); // записать 256 как big-endian (третий аргумент = littleEndian)
dv.getUint8(0); // 0
dv.getUint8(3); // порядок байт задан явно, а не «как повезёт»
\`\`\`

Третий аргумент \`false\` означает «не little-endian», то есть big-endian. Именно эта явность делает чтение предсказуемым на любой машине.

\`\`\`js
const buffer = new ArrayBuffer(4);          // 4 байта сырой памяти
const u8 = new Uint8Array(buffer);          // вид по одному байту
const u32 = new Uint32Array(buffer);        // та же память как одно 32-битное число

u8[0] = 0xFF; u8[1] = 0x00; u8[2] = 0x00; u8[3] = 0x00;
u32[0];                                     // 255 на little-endian

// DataView контролирует порядок байт явно
const dv = new DataView(buffer);
dv.getUint32(0, true);  // 255        (little-endian)
dv.getUint32(0, false); // 4278190080 (big-endian)
\`\`\`

Обрати внимание: одни и те же четыре байта читаются как \`255\` или как \`4278190080\` — всё зависит только от выбранного порядка байт.

### Где это применяется

WebGL, Web Audio, бинарные фреймы WebSocket, работа с файлами, шифрование, \`fetch().arrayBuffer()\`. Связка \`SharedArrayBuffer\` + \`Atomics\` даёт разделяемую память между воркерами (Worker'ами). В целом TypedArray быстрее обычных массивов на числовых данных и компактнее по памяти.

## ⚠️ Подводные камни

- Порядок байт у TypedArray зависит от платформы — для бинарных протоколов всегда используй \`DataView\` с явным флагом.
- Несколько видов на одном буфере делят память: запись через один меняет данные для всех.
- \`Uint8ClampedArray\` зажимает значения в 0..255, обычный \`Uint8Array\` — заворачивает (переполняет) по модулю 256.

## 🎯 Запомни

- \`ArrayBuffer\` — сырая память; читать её можно только через вид.
- \`TypedArray\` — быстрый типизированный вид; \`DataView\` — гибкий вид с явным контролем порядка байт.
- Endianness (little/big-endian) — это порядок байт; для бинарных форматов задавай его явно через \`DataView\`.
- Используется в WebGL, Web Audio, WebSocket, файлах и криптографии.`,
      en: `## 🧩 In plain words

Normally in JS you work with numbers and strings without thinking about how they sit in memory. But sometimes you need to work with **raw bytes** directly — reading an image, audio, or a network packet. Think of an \`ArrayBuffer\` as a blank sheet of memory, and \`TypedArray\` and \`DataView\` as two different "glasses" you look at that sheet through to understand what the bytes mean. Without glasses the sheet is unreadable; the glasses decide how to interpret the bytes.

### ArrayBuffer — raw memory

\`ArrayBuffer\` is a **contiguous block of memory** of fixed size, measured in bytes. On its own it can't be read or written: it's just a "box of bytes." To do anything with it, you need a **view** on top.

### TypedArray — a typed view

Typed arrays (\`Int8Array\`, \`Uint8Array\`, \`Float32Array\`, \`Float64Array\`, \`BigInt64Array\`, and others) are **views with a fixed element type** onto a buffer. They store numbers in binary form directly in the buffer's memory, with no wrapper objects (no "boxing"), which makes them compact and fast for numeric data.

Several views can point at the **same** buffer at once (this is called aliasing) — write bytes through one view, read them as numbers through another. \`Uint8ClampedArray\` is a special one: it **clamps** values to the 0..255 range (anything below 0 becomes 0, anything above 255 becomes 255), which is handy for canvas pixels.

### DataView — a flexible view with byte-order control

\`DataView\` is a **general-purpose view** that lets you read and write values of **mixed types** at any offset in the buffer, with explicit control over **endianness** (byte order). Endianness is the order in which the bytes of a multi-byte number are laid out in memory:

- **Little-endian** — least significant byte first (how x86 CPUs work; also the default for TypedArrays on most platforms).
- **Big-endian** — most significant byte first (called "network order", common in binary protocols and file formats).

The key problem: a TypedArray uses the endianness of **whatever platform** the code runs on, which is unpredictable. \`DataView\` lets you set the order **explicitly**, which is why it's indispensable for parsing binary formats (PNG, WAV, network packets), where the byte order is strictly defined by the spec.

\`\`\`js
const buf = new ArrayBuffer(8);
const dv = new DataView(buf);
dv.setInt32(0, 256, false); // write 256 as big-endian (third arg = littleEndian)
dv.getUint8(0); // 0
dv.getUint8(3); // byte order is explicit, not "whatever the platform does"
\`\`\`

The third argument \`false\` means "not little-endian", i.e. big-endian. That explicitness is what makes reads predictable on any machine.

\`\`\`js
const buffer = new ArrayBuffer(4);          // 4 bytes of raw memory
const u8 = new Uint8Array(buffer);          // byte-by-byte view
const u32 = new Uint32Array(buffer);        // same memory as one 32-bit number

u8[0] = 0xFF; u8[1] = 0x00; u8[2] = 0x00; u8[3] = 0x00;
u32[0];                                     // 255 on little-endian

// DataView controls byte order explicitly
const dv = new DataView(buffer);
dv.getUint32(0, true);  // 255        (little-endian)
dv.getUint32(0, false); // 4278190080 (big-endian)
\`\`\`

Notice: the exact same four bytes read as \`255\` or as \`4278190080\` — it depends entirely on the chosen byte order.

### Where it's used

WebGL, Web Audio, WebSocket binary frames, file handling, encryption, \`fetch().arrayBuffer()\`. \`SharedArrayBuffer\` + \`Atomics\` provide shared memory across Workers. Overall, TypedArrays are faster than plain arrays for numeric data and more compact in memory.

## ⚠️ Common pitfalls

- A TypedArray's byte order depends on the platform — for binary protocols always use \`DataView\` with an explicit flag.
- Multiple views on one buffer share memory: writing through one changes the data for all.
- \`Uint8ClampedArray\` clamps values to 0..255, while plain \`Uint8Array\` wraps (overflows) modulo 256.

## 🎯 Key takeaways

- \`ArrayBuffer\` is raw memory; you can only read it through a view.
- \`TypedArray\` is a fast typed view; \`DataView\` is a flexible view with explicit byte-order control.
- Endianness (little/big-endian) is byte order; for binary formats set it explicitly via \`DataView\`.
- Used in WebGL, Web Audio, WebSocket, files, and cryptography.`
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
      ru: `## 🧩 Простыми словами

Объект и массив — привычные способы хранить данные, но у них есть слабые места. \`Map\` и \`Set\` — это специальные коллекции, заточенные под конкретные задачи: \`Map\` — как словарь, где ключом может быть что угодно (даже другой объект), а \`Set\` — как мешок, в котором каждое значение встречается только один раз. А \`WeakSet\`/\`WeakMap\` — их «нецепкие» версии, которые не мешают сборщику мусора выбрасывать ненужные объекты.

### Map против объекта

\`Map\` — это коллекция пар «ключ-значение», где **ключом может быть что угодно**: объект, функция, даже \`NaN\`, а не только строка или Symbol, как у обычного объекта.

- **Порядок вставки** гарантирован при переборе — элементы идут в том порядке, в котором ты их добавлял.
- Размер \`size\` доступен мгновенно (за O(1)), плюс удобные методы \`set\`/\`get\`/\`has\`/\`delete\`.
- Нет «загрязнения прототипа»: ключи вроде \`'__proto__'\` или \`'toString'\` безопасны и не ломают поведение (у обычного объекта такие имена конфликтуют со встроенными свойствами).
- Лучше подходит, когда ключи **часто добавляются и удаляются** или они динамические.

Обычный объект лучше для статичной структуры с известными заранее полями, для JSON-сериализации и для доступа через \`obj.prop\`.

### Set против массива

\`Set\` — это коллекция **уникальных** значений: дубликаты в неё просто не попадают. Проверка «есть ли элемент» через \`has\` работает за O(1) — мгновенно, независимо от размера, тогда как \`Array.includes\` перебирает весь массив за O(n). Идеально для удаления дубликатов и проверки принадлежности.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])]; // [1, 2, 3]
\`\`\`

Здесь мы кладём массив в \`Set\` (дубликаты отсеиваются) и разворачиваем обратно в массив.

### Как сравниваются ключи

\`Map\` и \`Set\` сравнивают ключи по правилу **SameValueZero**. Практическая разница с обычным \`===\`: \`NaN\` считается равным \`NaN\` (поэтому \`NaN\` можно использовать как ключ и находить его), но \`+0\` и \`-0\` считаются одним и тем же значением. Объекты при этом сравниваются **по ссылке** — два разных объекта с одинаковым содержимым это разные ключи.

### WeakMap и WeakSet

Это «слабые» версии коллекций с важными отличиями:

- Хранят **только объекты** (не примитивы) в качестве ключей или элементов.
- Держат их **слабо**: если на объект больше не осталось ни одной обычной («сильной») ссылки в программе, сборщик мусора вправе его удалить, и запись из коллекции исчезнет автоматически.
- **Нельзя перебрать**, нет \`size\`, нет \`clear\` — потому что содержимое может измениться в любой момент из-за сборки мусора, и стабильно показать его невозможно.

\`\`\`js
// WeakSet: помечаем объекты, не мешая сборке мусора
const seen = new WeakSet();
function process(obj) {
  if (seen.has(obj)) return;   // уже обрабатывали — пропускаем
  seen.add(obj);
  // ... когда obj больше нигде не используется, он может быть удалён GC
}
\`\`\`

Типичное применение \`WeakSet\` — помечать объекты («уже обработан», «зарегистрирован»), не удерживая их в памяти. Как только объект перестаёт быть нужен остальному коду, он спокойно удаляется, и утечки памяти не возникает.

## ⚠️ Подводные камни

- \`Map\`/\`Set\` сравнивают объекты по ссылке: два «одинаковых» литерала \`{a:1}\` — это разные ключи.
- \`Map\` не сериализуется через \`JSON.stringify\` напрямую (получишь \`{}\`) — нужно преобразовать в массив или объект.
- \`WeakSet\`/\`WeakMap\` нельзя перебрать и у них нет \`size\` — не пытайся считать их содержимое.
- В \`WeakSet\`/\`WeakMap\` нельзя класть примитивы — только объекты.

## 🎯 Запомни

- \`Map\` — когда ключи не строки, их много или они меняются; объект — для статичной формы и JSON.
- \`Set\` — для уникальности и быстрой проверки принадлежности (O(1) против O(n) у массива).
- \`Map\`/\`Set\` используют SameValueZero: \`NaN\` равен \`NaN\`, объекты сравниваются по ссылке.
- \`WeakSet\`/\`WeakMap\` держат объекты слабо, не мешая сборке мусора; их нельзя перебрать.`,
      en: `## 🧩 In plain words

Objects and arrays are the familiar ways to store data, but each has weak spots. \`Map\` and \`Set\` are specialized collections built for specific jobs: a \`Map\` is like a dictionary whose key can be anything (even another object), and a \`Set\` is like a bag where each value appears only once. \`WeakSet\`/\`WeakMap\` are their "non-clingy" versions that don't stop the garbage collector from throwing away objects you no longer need.

### Map vs object

\`Map\` is a key-value collection where **the key can be anything**: an object, a function, even \`NaN\` — not just a string or Symbol like a plain object.

- **Insertion order** is guaranteed on iteration — items come out in the order you added them.
- \`size\` is available instantly (O(1)), plus tidy \`set\`/\`get\`/\`has\`/\`delete\` methods.
- No "prototype pollution": keys like \`'__proto__'\` or \`'toString'\` are safe and don't break behavior (on a plain object those names collide with built-in properties).
- Better when keys are **added and removed frequently** or are dynamic.

A plain object is better for a static, known-shape structure, for JSON serialization, and for \`obj.prop\` access.

### Set vs array

\`Set\` is a collection of **unique** values: duplicates simply don't get in. Checking "is this present" via \`has\` runs in O(1) — instant, regardless of size — whereas \`Array.includes\` scans the whole array in O(n). Ideal for deduplication and membership tests.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])]; // [1, 2, 3]
\`\`\`

Here we drop an array into a \`Set\` (duplicates fall out) and spread it back into an array.

### How keys are compared

\`Map\` and \`Set\` compare keys using the **SameValueZero** rule. The practical difference from plain \`===\`: \`NaN\` is considered equal to \`NaN\` (so you can use \`NaN\` as a key and actually find it), but \`+0\` and \`-0\` count as the same value. Objects are compared **by reference** — two different objects with identical contents are different keys.

### WeakMap and WeakSet

These are the "weak" versions of the collections, with important differences:

- Hold **only objects** (not primitives) as keys or members.
- Hold them **weakly**: once no ordinary ("strong") reference to the object remains anywhere in the program, the garbage collector may remove it, and the collection's entry disappears automatically.
- **Not iterable**, no \`size\`, no \`clear\` — because the contents can change at any moment due to garbage collection, so there's no stable way to enumerate them.

\`\`\`js
// WeakSet: tag objects without preventing garbage collection
const seen = new WeakSet();
function process(obj) {
  if (seen.has(obj)) return;   // already handled — skip
  seen.add(obj);
  // ... once obj is referenced nowhere else, it can be collected by GC
}
\`\`\`

A typical \`WeakSet\` use is tagging objects ("already processed", "registered") without keeping them in memory. As soon as an object is no longer needed by the rest of the code, it's quietly collected and no memory leak occurs.

## ⚠️ Common pitfalls

- \`Map\`/\`Set\` compare objects by reference: two "identical" literals \`{a:1}\` are different keys.
- A \`Map\` doesn't serialize via \`JSON.stringify\` directly (you'd get \`{}\`) — convert it to an array or object first.
- \`WeakSet\`/\`WeakMap\` can't be iterated and have no \`size\` — don't try to count their contents.
- You can't put primitives in a \`WeakSet\`/\`WeakMap\` — objects only.

## 🎯 Key takeaways

- Use \`Map\` when keys aren't strings, are numerous, or change; use an object for a static shape and JSON.
- Use \`Set\` for uniqueness and fast membership checks (O(1) vs O(n) for arrays).
- \`Map\`/\`Set\` use SameValueZero: \`NaN\` equals \`NaN\`, objects compare by reference.
- \`WeakSet\`/\`WeakMap\` hold objects weakly without blocking GC, and can't be iterated.`
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
      ru: `## 🧩 Простыми словами

Представь, что у каждого свойства объекта есть маленькая «настроечная панель» с переключателями: можно ли менять значение, видно ли свойство при переборе, можно ли его удалить. Эта панель и называется **дескриптором**. Обычно когда ты пишешь \`obj.x = 1\`, JS сам ставит все переключатели в «да». Но через \`Object.defineProperty\` ты можешь настроить каждый переключатель вручную и даже сделать свойство «умным» — чтобы при чтении и записи вызывалась функция.

### Что такое дескриптор

**Дескриптор** — это объект-описание, который рассказывает движку, как устроено свойство. Бывает двух видов:

- **Data descriptor** (описание данных) — хранит \`value\` (значение) и флаг \`writable\`.
- **Accessor descriptor** (описание аксессора) — вместо значения хранит функции \`get\` и \`set\`.

Смешивать \`value\` и \`get\`/\`set\` в одном дескрипторе нельзя.

### Три флага-переключателя

- **\`writable\`** — можно ли переприсваивать значение (\`obj.x = ...\`). Если \`false\` — присваивание молча игнорируется в обычном режиме и бросает \`TypeError\` в strict mode.
- **\`enumerable\`** — «виден» ли ключ при переборе: попадает ли в \`for...in\`, \`Object.keys\`, spread (\`{...obj}\`) и \`JSON.stringify\`. Если \`false\` — свойство есть, но при переборе его как будто нет.
- **\`configurable\`** — можно ли удалить свойство (\`delete\`) или потом ещё раз поменять его дескриптор. Если \`false\` — свойство «застыло».

Важная ловушка: \`Object.defineProperty\` по умолчанию ставит все три флага в **\`false\`**. Это противоположно обычному присваиванию, где всё \`true\`.

\`\`\`js
const obj = {};
Object.defineProperty(obj, 'id', {
  value: 42, writable: false, enumerable: false, configurable: false
});
obj.id = 100;          // молча игнор в non-strict, TypeError в strict
Object.keys(obj);      // [] — non-enumerable, ключ скрыт
\`\`\`

### Getter / setter (аксессоры)

**Аксессоры** — это функции, замаскированные под обычное свойство. Снаружи ты пишешь \`obj.celsius\` и \`obj.celsius = 20\`, как с обычным полем, но под капотом срабатывают функции \`get\` и \`set\`. Это удобно, чтобы вычислять значение на лету, проверять корректность записи (валидация) или откладывать инициализацию до первого обращения (ленивость).

\`\`\`js
let _temp = 0;
Object.defineProperty(obj, 'celsius', {
  get() { return _temp; },
  set(v) { if (v < -273) throw RangeError('too cold'); _temp = v; },
  enumerable: true
});
\`\`\`

Здесь при чтении \`obj.celsius\` возвращается \`_temp\`, а при записи проверяется, что температура не ниже абсолютного нуля.

### Зачем это знать на практике

- **\`Object.freeze\`** внутри просто делает все свойства \`writable: false, configurable: false\` — вот почему замороженный объект нельзя менять.
- Скрытые служебные поля помечают \`enumerable: false\`, чтобы они не попадали в \`JSON.stringify\` и не «утекали» при сериализации.
- **\`Object.getOwnPropertyDescriptor\`** (и \`...Descriptors\`) читает дескрипторы. Это нужно для честного глубокого клонирования: обычный spread скопировал бы результат геттера, а не сам геттер.
- Классовые \`get\`/\`set\` и поля класса под капотом компилируются в те же дескрипторы на прототипе или экземпляре.

## ⚠️ Подводные камни

- \`Object.defineProperty\` без явных флагов делает свойство «невидимым и неизменяемым» — легко забыть и потом удивляться, что ключа нет в \`Object.keys\`.
- Присваивание в non-writable свойство **не бросает ошибку** в обычном режиме — оно молча ничего не делает, что маскирует баги.
- \`delete\` на свойстве с \`configurable: false\` возвращает \`false\` и не удаляет — тоже без ошибки вне strict mode.

## 🎯 Запомни

- Дескриптор — это настройки свойства: \`value\`/\`writable\` (данные) **или** \`get\`/\`set\` (аксессор), плюс \`enumerable\` и \`configurable\`.
- \`Object.defineProperty\` по умолчанию ставит все флаги в \`false\`; обычное присваивание — в \`true\`.
- \`enumerable: false\` прячет свойство от перебора и \`JSON\`; \`writable\`/\`configurable\` управляют изменением и удалением.
- Геттеры/сеттеры — функции под видом свойства для вычислений, валидации и ленивой инициализации.`,
      en: `## 🧩 In plain words

Imagine every property of an object has a tiny "settings panel" with switches: can the value be changed, is the property visible when you loop over the object, can it be deleted. That panel is called a **descriptor**. Normally when you write \`obj.x = 1\`, JS flips all the switches to "yes" for you. But with \`Object.defineProperty\` you can set each switch by hand — and even make the property "smart" so that a function runs when it's read or written.

### What a descriptor is

A **descriptor** is a small description object that tells the engine how a property behaves. There are two kinds:

- **Data descriptor** — holds a \`value\` and the \`writable\` flag.
- **Accessor descriptor** — instead of a value, holds \`get\` and \`set\` functions.

You can't mix \`value\` and \`get\`/\`set\` in the same descriptor.

### The three switch flags

- **\`writable\`** — whether the value can be reassigned (\`obj.x = ...\`). If \`false\`, assignment is silently ignored in sloppy mode and throws \`TypeError\` in strict mode.
- **\`enumerable\`** — whether the key "shows up" when iterating: in \`for...in\`, \`Object.keys\`, spread (\`{...obj}\`), and \`JSON.stringify\`. If \`false\`, the property exists but is invisible to iteration.
- **\`configurable\`** — whether the property can be deleted (\`delete\`) or have its descriptor changed again later. If \`false\`, the property is frozen in place.

Key gotcha: \`Object.defineProperty\` defaults all three flags to **\`false\`**. That's the opposite of a normal assignment, where everything is \`true\`.

\`\`\`js
const obj = {};
Object.defineProperty(obj, 'id', {
  value: 42, writable: false, enumerable: false, configurable: false
});
obj.id = 100;          // silently ignored in non-strict, TypeError in strict
Object.keys(obj);      // [] — non-enumerable, key is hidden
\`\`\`

### Getter / setter (accessors)

**Accessors** are functions disguised as a normal property. From the outside you write \`obj.celsius\` and \`obj.celsius = 20\` just like a plain field, but under the hood \`get\` and \`set\` functions run. This is handy to compute a value on the fly, validate writes, or delay initialization until the first access (laziness).

\`\`\`js
let _temp = 0;
Object.defineProperty(obj, 'celsius', {
  get() { return _temp; },
  set(v) { if (v < -273) throw RangeError('too cold'); _temp = v; },
  enumerable: true
});
\`\`\`

Here reading \`obj.celsius\` returns \`_temp\`, and writing checks that the temperature isn't below absolute zero.

### Why it matters in practice

- **\`Object.freeze\`** internally just makes every property \`writable: false, configurable: false\` — that's why a frozen object can't be changed.
- Hidden internal fields are marked \`enumerable: false\` so they don't leak into \`JSON.stringify\` when serializing.
- **\`Object.getOwnPropertyDescriptor\`** (and \`...Descriptors\`) reads descriptors. This is needed for honest deep cloning: a plain spread would copy the getter's *result*, not the getter itself.
- Class \`get\`/\`set\` and class fields compile down to these same descriptors on the prototype or instance.

## ⚠️ Common pitfalls

- \`Object.defineProperty\` without explicit flags makes the property "invisible and immutable" — easy to forget and then be surprised the key isn't in \`Object.keys\`.
- Assigning to a non-writable property **doesn't throw** in sloppy mode — it silently does nothing, which masks bugs.
- \`delete\` on a \`configurable: false\` property returns \`false\` and doesn't delete — also silent outside strict mode.

## 🎯 Key takeaways

- A descriptor is a property's settings: \`value\`/\`writable\` (data) **or** \`get\`/\`set\` (accessor), plus \`enumerable\` and \`configurable\`.
- \`Object.defineProperty\` defaults all flags to \`false\`; normal assignment sets them to \`true\`.
- \`enumerable: false\` hides a property from iteration and \`JSON\`; \`writable\`/\`configurable\` control changing and deleting.
- Getters/setters are functions masquerading as a property, for computed values, validation, and lazy init.`
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
      ru: `## 🧩 Простыми словами

Оператор \`new\` — это как заводская линия по сборке объектов. Ты даёшь ему функцию-конструктор (чертёж), а он делает пустую заготовку, подключает её к «библиотеке методов» (прототипу), запускает по ней конструктор и отдаёт готовый объект. Понимание этих шагов снимает магию: \`new\` можно повторить руками в несколько строк.

### Что делает new по шагам

Когда ты пишешь \`new Fn(args)\`, движок выполняет ровно четыре действия:

1. Создаёт **новый пустой объект**.
2. Устанавливает его скрытую ссылку **[[Prototype]]** на \`Fn.prototype\` (если \`Fn.prototype\` — объект; иначе на \`Object.prototype\`). Именно поэтому созданный объект «видит» методы из прототипа.
3. Вызывает \`Fn\`, привязав \`this\` к этому новому объекту, и передаёт аргументы.
4. Смотрит, что вернул конструктор. Если **вернулся объект** — отдаётся он. Если примитив или \`undefined\` (обычный случай) — отдаётся созданный на шаге 1 \`this\`.

### Реализуем new руками

Зная эти шаги, можно написать свою версию:

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // шаги 1-2
  const result = Ctor.apply(obj, args);      // шаг 3
  return (result !== null && typeof result === 'object') ? result : obj; // шаг 4
}
\`\`\`

\`Object.create(Ctor.prototype)\` делает пустой объект с нужным прототипом, \`apply\` запускает конструктор с нашим \`this\`, а тернарник реализует правило «вернули объект — отдай его».

### Что такое new.target

Внутри функции есть особое выражение **\`new.target\`**. Оно равно **самому конструктору**, если функцию вызвали через \`new\`, и \`undefined\`, если её вызвали как обычную функцию. Это даёт способ узнать «как меня позвали».

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('Use new');
  this.name = name;
}
\`\`\`

Здесь конструктор запрещает вызывать себя без \`new\`. Ещё \`new.target\` помогает понять, вызвали ли базовый класс напрямую или через \`super\` из подкласса: он указывает на **исходный** класс всей цепочки наследования.

### Тонкости

- Стрелочные функции и методы объектов **нельзя** вызвать через \`new\` — у них нет внутренней операции \`[[Construct]]\`.
- Класс (\`class\`) наоборот **обязан** вызываться через \`new\`, иначе \`TypeError\`.
- Возврат объекта из конструктора — приём для фабрик и синглтонов, но он ломает интуицию \`instanceof\` (вернётся не «свежий» экземпляр).
- \`Reflect.construct(Target, args, newTarget)\` позволяет задать другой \`new.target\` — это нужно, например, чтобы корректно расширять встроенные классы вроде \`Array\` или \`Error\`.

## ⚠️ Подводные камни

- Забыл \`new\` у обычной функции-конструктора — \`this\` окажется \`undefined\` (strict) или глобальным объектом (sloppy), и поля утекут наружу. Защита — проверка \`new.target\`.
- Случайный \`return {}\` из конструктора незаметно подменит создаваемый экземпляр.
- Возврат примитива (\`return 42\`) из конструктора игнорируется — вернётся \`this\`, что легко перепутать с возвратом объекта.

## 🎯 Запомни

- \`new\` = создать объект → привязать его прототип к \`Fn.prototype\` → вызвать \`Fn\` с этим \`this\` → вернуть объект (либо явно возвращённый объект, либо \`this\`).
- Ручная реализация: \`Object.create(prototype)\` + \`apply\` + правило про возврат объекта.
- \`new.target\` — это сам конструктор при вызове через \`new\`, иначе \`undefined\`; удобно, чтобы обязать использовать \`new\`.
- Стрелки/методы конструировать нельзя, классы — только через \`new\`.`,
      en: `## 🧩 In plain words

The \`new\` operator is like an assembly line for building objects. You hand it a constructor function (the blueprint), and it makes a blank part, wires it up to a "library of methods" (the prototype), runs the constructor over it, and hands back the finished object. Understanding these steps removes the magic: you can reproduce \`new\` by hand in a few lines.

### What new does, step by step

When you write \`new Fn(args)\`, the engine performs exactly four actions:

1. Creates a **new empty object**.
2. Sets its hidden **[[Prototype]]** link to \`Fn.prototype\` (if \`Fn.prototype\` is an object; otherwise to \`Object.prototype\`). This is why the new object can "see" methods from the prototype.
3. Calls \`Fn\` with \`this\` bound to that new object, passing the args.
4. Looks at what the constructor returned. If it **returned an object**, that's handed back. If a primitive or \`undefined\` (the usual case), the \`this\` from step 1 is handed back.

### Implementing new by hand

Knowing the steps, you can write your own version:

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // steps 1-2
  const result = Ctor.apply(obj, args);      // step 3
  return (result !== null && typeof result === 'object') ? result : obj; // step 4
}
\`\`\`

\`Object.create(Ctor.prototype)\` makes an empty object with the right prototype, \`apply\` runs the constructor with our \`this\`, and the ternary implements the "returned an object → give it back" rule.

### What new.target is

Inside a function there's a special expression, **\`new.target\`**. It equals the **constructor itself** if the function was called via \`new\`, and \`undefined\` if it was called as a plain function. This gives you a way to know "how was I called".

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('Use new');
  this.name = name;
}
\`\`\`

Here the constructor forbids calling itself without \`new\`. \`new.target\` also helps tell whether a base class was called directly or via \`super\` from a subclass: it points at the **original** class of the whole inheritance chain.

### Subtleties

- Arrow functions and object methods **cannot** be called via \`new\` — they have no internal \`[[Construct]]\` operation.
- A \`class\`, conversely, **must** be called via \`new\`, or it throws \`TypeError\`.
- Returning an object from a constructor is a factory/singleton trick, but it breaks \`instanceof\` intuition (you don't get the fresh instance).
- \`Reflect.construct(Target, args, newTarget)\` lets you set a different \`new.target\` — useful, for example, to correctly extend built-in classes like \`Array\` or \`Error\`.

## ⚠️ Common pitfalls

- Forget \`new\` on a plain constructor function and \`this\` becomes \`undefined\` (strict) or the global object (sloppy), leaking fields outward. The guard is a \`new.target\` check.
- An accidental \`return {}\` from a constructor silently replaces the instance being built.
- Returning a primitive (\`return 42\`) from a constructor is ignored — \`this\` comes back, easy to confuse with returning an object.

## 🎯 Key takeaways

- \`new\` = create an object → link its prototype to \`Fn.prototype\` → call \`Fn\` with that \`this\` → return an object (either an explicitly returned object, or \`this\`).
- Manual version: \`Object.create(prototype)\` + \`apply\` + the return-an-object rule.
- \`new.target\` is the constructor itself when called via \`new\`, otherwise \`undefined\`; handy to require \`new\`.
- Arrows/methods can't be constructed; classes only via \`new\`.`
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
      ru: `## 🧩 Простыми словами

Обычный итератор — это конвейер, который по команде «дай следующее» сразу выдаёт значение. Асинхронный итератор — тот же конвейер, но каждое «дай следующее» возвращает **обещание** (промис): значение приедет чуть позже, например когда загрузится очередная страница из сети. Цикл \`for await...of\` — это удобная лента, которая сама ждёт каждый промис и достаёт из него значение, прежде чем идти дальше. Идеально, когда данные приходят порциями во времени.

### Протокол асинхронной итерации

Он полностью повторяет обычный, но работает через промисы:

- **AsyncIterable** — объект, у которого есть метод \`[Symbol.asyncIterator]()\`. Это «умеет ли объект отдавать значения асинхронно».
- **AsyncIterator** — то, что возвращает этот метод; у него есть \`next()\`, возвращающий \`Promise<{ value, done }>\`. \`value\` — текущее значение, \`done\` — флаг «поток закончился».

\`for await...of\` вызывает \`next()\`, **дожидается** промиса, берёт \`value\`, отдаёт в тело цикла, и только потом идёт за следующим — то есть **последовательно**, по одному.

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();           // отдаём каждую страницу по мере готовности
  }
}
for await (const page of fetchPages(urls)) {
  console.log(page);            // последовательно, без накопления всего в память
}
\`\`\`

### async function* (асинхронный генератор)

\`async function*\` создаёт **async-генератор** — функцию, внутри которой можно одновременно использовать и \`await\` (дождаться промиса), и \`yield\` (отдать значение наружу). Это лучший инструмент для потоковой обработки: постраничная выборка из API, чтение потоков данных (\`ReadableStream\` тоже асинхронно итерируем), построчное чтение больших файлов — когда не хочется грузить всё в память сразу.

### yield* (делегирование)

\`yield*\` означает «передай эстафету другому итерируемому»: он прозрачно прокидывает наружу все его значения, а затем возвращает его финальный \`return\`. Удобно, чтобы собирать один поток из нескольких.

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; } // выдаст 1, 2, 3
\`\`\`

### Нюансы

- \`for await...of\` обрабатывает значения **по одному** — это **не параллелизм**. Если нужно грузить параллельно, соберите промисы и используйте \`Promise.all\`, а потом итерируйте результат.
- Цикл работает и с обычным (синхронным) итерируемым, в котором лежат промисы: каждое значение будет автоматически \`await\`-нуто.
- \`break\`, \`return\` или исключение внутри цикла вызывают метод \`return()\` итератора — это ваш шанс освободить ресурсы (закрыть стрим, соединение).
- Естественная поддержка backpressure («обратного давления»): следующий \`next()\` не вызовется, пока тело цикла не доработает текущую итерацию, — источник не завалит вас данными быстрее, чем вы их обрабатываете.

## ⚠️ Подводные камни

- Легко перепутать: \`for await...of\` **не** ускоряет — он ждёт каждый элемент. Для скорости нужен \`Promise.all\`.
- Забытая очистка ресурсов: полагайтесь на то, что выход из цикла вызовет \`return()\`, и реализуйте очистку в \`finally\` внутри генератора.
- \`yield\` в async-генераторе разворачивает промис: \`yield somePromise\` отдаст наружу уже значение, а не сам промис.

## 🎯 Запомни

- Async-итератор: \`next()\` возвращает \`Promise<{ value, done }>\`; объект асинхронно итерируем, если есть \`[Symbol.asyncIterator]\`.
- \`for await...of\` ждёт и разворачивает значения **последовательно**, по одному — это не параллелизм.
- \`async function*\` = \`await\` + \`yield\` в одной функции; идеален для стримов и пагинации.
- \`yield*\` делегирует другому (async-)итерируемому; выход из цикла триггерит \`return()\` для очистки.`,
      en: `## 🧩 In plain words

A regular iterator is a conveyor belt that hands you a value the instant you say "give me the next one." An async iterator is the same belt, but every "give me the next one" returns a **promise**: the value shows up a little later — for example, once the next page loads over the network. The \`for await...of\` loop is a convenient belt that waits for each promise and unwraps its value before moving on. Perfect for data that arrives in chunks over time.

### The async iteration protocol

It mirrors the sync one exactly, but works through promises:

- **AsyncIterable** — an object with a \`[Symbol.asyncIterator]()\` method. That's "can this object hand out values asynchronously".
- **AsyncIterator** — what that method returns; it has a \`next()\` that returns \`Promise<{ value, done }>\`. \`value\` is the current value, \`done\` is the "stream is finished" flag.

\`for await...of\` calls \`next()\`, **awaits** the promise, takes \`value\`, feeds it to the loop body, and only then goes for the next one — that is, **sequentially**, one at a time.

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();           // yield each page as it becomes ready
  }
}
for await (const page of fetchPages(urls)) {
  console.log(page);            // sequential, no buffering of everything
}
\`\`\`

### async function* (async generator)

\`async function*\` creates an **async generator** — a function inside which you can use both \`await\` (wait for a promise) and \`yield\` (hand a value out) at the same time. It's the best tool for streaming work: paginated API fetches, reading data streams (\`ReadableStream\` is also async-iterable), line-by-line reading of huge files — whenever you don't want to load everything into memory at once.

### yield* (delegation)

\`yield*\` means "pass the baton to another iterable": it transparently forwards all of that iterable's values, then returns its final \`return\` value. Handy for assembling one stream out of several.

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; } // yields 1, 2, 3
\`\`\`

### Nuances

- \`for await...of\` processes values **one at a time** — this is **not parallelism**. If you need parallel loading, collect the promises and use \`Promise.all\`, then iterate the result.
- The loop also works with a plain (sync) iterable that contains promises: each value is automatically \`await\`-ed.
- \`break\`, \`return\`, or a throw inside the loop calls the iterator's \`return()\` method — your chance to free resources (close a stream or connection).
- Natural backpressure support: the next \`next()\` isn't called until the loop body finishes the current iteration, so the source can't flood you with data faster than you handle it.

## ⚠️ Common pitfalls

- Easy to confuse: \`for await...of\` does **not** speed things up — it waits for each item. For speed you need \`Promise.all\`.
- Forgotten cleanup: rely on the fact that exiting the loop calls \`return()\`, and put cleanup in a \`finally\` inside the generator.
- \`yield\` in an async generator unwraps a promise: \`yield somePromise\` hands out the resolved value, not the promise itself.

## 🎯 Key takeaways

- Async iterator: \`next()\` returns \`Promise<{ value, done }>\`; an object is async-iterable if it has \`[Symbol.asyncIterator]\`.
- \`for await...of\` awaits and unwraps values **sequentially**, one at a time — not parallelism.
- \`async function*\` = \`await\` + \`yield\` in one function; ideal for streams and pagination.
- \`yield*\` delegates to another (async) iterable; exiting the loop triggers \`return()\` for cleanup.`
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
      ru: `## 🧩 Простыми словами

Представь, что ты отправил несколько курьеров с заданиями и хочешь как-то дождаться их. Четыре комбинатора промисов — это четыре стратегии ожидания. \`all\` — «жду всех, но если хоть один провалился, сразу сообщаю о провале». \`allSettled\` — «жду всех и составляю отчёт: кто справился, кто нет». \`race\` — «мне важен первый вернувшийся, неважно, с успехом или с ошибкой». \`any\` — «мне нужен первый, кто справился успешно».

### Четыре комбинатора

- **\`Promise.all([...])\`** — резолвится массивом результатов, когда выполнились **все**. Работает по принципу **fail-fast** («падаем быстро»): при первом же reject он немедленно реджектится этой ошибкой. Остальные промисы физически продолжают выполняться, но их результаты уже игнорируются.
- **\`Promise.allSettled([...])\`** — **никогда не реджектится**. Ждёт **все** и возвращает массив объектов вида \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\`. Для сценария «выполнить всё и собрать полный отчёт, кто как отработал».
- **\`Promise.race([...])\`** — завершается **первым завершившимся** промисом, с любым исходом: если первый успел зарезолвиться — резолвится, если первым прилетела ошибка — реджектится. Классика для таймаутов.
- **\`Promise.any([...])\`** — резолвится **первым успешным**. Реджектится только если провалились **все** — причём ошибкой \`AggregateError\`, у которой в \`.errors\` лежит массив всех причин. Для «дай первый рабочий источник из нескольких».

\`\`\`js
// таймаут через race
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

Здесь \`race\` соревнует твой промис \`p\` с «будильником»: кто первый — тот и определит исход.

### Ключевые детали

- Все четыре принимают **iterable** (любой перебираемый), не обязательно массив. Не-промисы внутри автоматически оборачиваются через \`Promise.resolve\`.
- \`all\` сохраняет **порядок входных элементов** в результирующем массиве — независимо от того, кто завершился раньше.
- Пустой iterable ведёт себя по-разному: \`all\` и \`allSettled\` → сразу резолвятся пустым \`[]\`; \`any\` → реджектится \`AggregateError\`; \`race\` → остаётся **вечно pending** (никто не завершится).
- Отмены нет: «проигравшие» в \`race\` и \`any\` **продолжают работать** в фоне. Сетевой запрос сам не отменится — для этого нужен \`AbortController\`.

### Как выбрать

- \`all\` — нужны **все** результаты, и любой сбой критичен.
- \`allSettled\` — нужен **полный отчёт**, падения ожидаемы и обрабатываются.
- \`race\` — нужен **таймаут** или самый быстрый ответ.
- \`any\` — нужен **первый успех** из нескольких дублирующих источников.

## ⚠️ Подводные камни

- \`Promise.all\` при провале одного отдаёт только **первую** ошибку — остальные ошибки теряются. Нужен полный разбор — берите \`allSettled\`.
- «Проигравшие» промисы не отменяются: даже после \`race\`/\`any\` фоновая работа и её побочные эффекты продолжаются.
- \`Promise.race\` на пустом массиве зависает навсегда — легко создать утечку, если массив внезапно оказался пустым.
- \`Promise.any\` реджектится не обычной ошибкой, а \`AggregateError\` — обрабатывайте \`.errors\`, а не \`.message\`.

## 🎯 Запомни

- \`all\` — все или первая ошибка (fail-fast); \`allSettled\` — все и никогда не реджектится (отчёт с \`status\`).
- \`race\` — первый завершившийся любым исходом; \`any\` — первый успешный (иначе \`AggregateError\`).
- Порядок в результате \`all\` соответствует входу, а не времени завершения.
- Комбинаторы не отменяют «проигравших» — для настоящей отмены нужен \`AbortController\`.`,
      en: `## 🧩 In plain words

Imagine you sent out several couriers on errands and want to wait for them somehow. The four promise combinators are four waiting strategies. \`all\` — "wait for everyone, but if even one fails, report failure right away." \`allSettled\` — "wait for everyone and produce a report: who succeeded, who didn't." \`race\` — "I care about the first one back, success or failure." \`any\` — "I need the first one that succeeds."

### The four combinators

- **\`Promise.all([...])\`** — resolves with an array of results when **all** fulfill. It's **fail-fast**: on the very first reject it rejects immediately with that reason. The others physically keep running, but their results are now ignored.
- **\`Promise.allSettled([...])\`** — **never rejects**. It waits for **all** and returns an array of objects like \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\`. For the "do everything and gather a full report of who did what" scenario.
- **\`Promise.race([...])\`** — settles with the **first settled** promise, whatever the outcome: if the first one resolved, it resolves; if an error arrived first, it rejects. The classic tool for timeouts.
- **\`Promise.any([...])\`** — resolves with the **first fulfilled** one. It rejects only if **all** fail — and with an \`AggregateError\`, whose \`.errors\` holds the array of all reasons. For "give me the first working source out of several."

\`\`\`js
// timeout via race
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

Here \`race\` pits your promise \`p\` against an "alarm clock": whichever comes first decides the outcome.

### Key details

- All four accept an **iterable** (anything iterable), not just an array. Non-promises inside are automatically wrapped via \`Promise.resolve\`.
- \`all\` preserves the **input order** in the result array — regardless of who finished first.
- An empty iterable behaves differently: \`all\` and \`allSettled\` → resolve immediately with \`[]\`; \`any\` → rejects with \`AggregateError\`; \`race\` → stays **pending forever** (nothing ever settles).
- No cancellation: the "losers" in \`race\` and \`any\` **keep running** in the background. A network request won't cancel itself — you need an \`AbortController\` for that.

### How to choose

- \`all\` — you need **all** results, and any failure is critical.
- \`allSettled\` — you need a **full report**, failures are expected and handled.
- \`race\` — you need a **timeout** or the fastest response.
- \`any\` — you need the **first success** out of several redundant sources.

## ⚠️ Common pitfalls

- On a failure, \`Promise.all\` gives you only the **first** error — the rest are lost. Need a full breakdown? Use \`allSettled\`.
- Losing promises aren't cancelled: even after \`race\`/\`any\` settles, the background work and its side effects continue.
- \`Promise.race\` on an empty array hangs forever — an easy leak if the array unexpectedly turns out empty.
- \`Promise.any\` rejects with an \`AggregateError\`, not a plain error — handle \`.errors\`, not \`.message\`.

## 🎯 Key takeaways

- \`all\` — everything or the first error (fail-fast); \`allSettled\` — everything and never rejects (a report with \`status\`).
- \`race\` — first to settle with any outcome; \`any\` — first to succeed (otherwise \`AggregateError\`).
- The order in \`all\`'s result matches the input, not the completion timing.
- Combinators don't cancel the "losers" — real cancellation needs an \`AbortController\`.`
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
      ru: `## 🧩 Простыми словами

Ошибка в программе — это как сигнал тревоги: «что-то пошло не так». JavaScript даёт для этого специальный объект \`Error\`, у которого есть текст проблемы и «след» (откуда именно всё сломалось). Если бросать тревогу правильно и добавлять к ней причину, потом гораздо легче понять, что случилось. Давай разберёмся, как это делать грамотно.

### Бросайте \`Error\`, а не что попало

В JS технически можно «бросить» (\`throw\`) любое значение — хоть строку, хоть число. Но так делать не стоит. Всегда бросайте **экземпляр \`Error\`** (или его подкласс). Почему?

У объекта \`Error\` есть три полезных вещи:
- \`message\` — человеко-читаемый текст: что сломалось.
- \`name\` — тип ошибки (например, \`'TypeError'\`).
- \`stack\` — **трассировка стека**, то есть список функций, через которые прошёл код до момента сбоя. Это ваша карта, чтобы найти виновника.

Если бросить строку (\`throw 'oops'\`), вы теряете \`stack\` и ломаете проверки вида \`if (e instanceof Error)\` — они перестают работать, потому что строка это не \`Error\`.

### \`Error.cause\` — сохраняем первопричину (ES2022)

Часто одна ошибка возникает из-за другой. Например, упал сетевой запрос, и из-за этого не загрузился пользователь. Хочется сказать «не смог загрузить пользователя», но при этом **не потерять** оригинальную низкоуровневую ошибку.

Для этого у конструктора \`Error\` есть второй аргумент — объект \`{ cause }\`. Он хранит **исходную ошибку** внутри новой:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error(\`Failed to load user \${id}\`, { cause: e });
}
\`\`\`

Теперь \`err.cause\` содержит настоящую первопричину — её удобно писать в логи. Это решает старую проблему «проглоченного оригинала», когда понятная обёртка полностью скрывала техническую деталь сбоя.

### Кастомные (свои) классы ошибок

Иногда хочется различать ошибки по типу: «это ошибка валидации», «это ошибка HTTP». Для этого создают **подклассы** \`Error\`. Подкласс — это свой тип ошибки со своими дополнительными полями.

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
\`\`\`

Теперь в блоке \`catch\` можно проверить \`if (e instanceof HttpError)\` и достать \`e.status\`. Это называется **типизированная обработка**: вы реагируете на разные ошибки по-разному.

> Нюанс для старого кода: если проект транспилируется в ES5 (например, старым Babel), цепочка прототипов обрезается, и \`instanceof\` может сломаться. Тогда в конструкторе нужна строка \`Object.setPrototypeOf(this, new.target.prototype)\`. В нативном ES2015+ это не требуется.

## ⚠️ Подводные камни

- **Ловите узко.** Не заворачивайте всё в один \`catch\`, который молча глотает любые ошибки — так вы прячете баги. Различайте типы ошибок.
- **Асинхронность.** \`try/catch\` ловит ошибки только там, где стоит \`await\`. У «висящих» промисов без \`await\` используйте \`.catch(...)\` или глобальный обработчик \`unhandledrejection\`.
- **Не используйте исключения как обычный поток управления** в горячих (часто исполняемых) путях — бросать и ловить ошибки дорого по производительности.
- **\`AggregateError\`** (из \`Promise.any\`) собирает сразу несколько причин в поле \`.errors\` — полезно, когда упало несколько промисов.

## 🎯 Запомни

- Всегда бросайте \`Error\` или его подкласс — ради \`message\`, \`name\` и \`stack\`.
- \`Error.cause\` (второй аргумент конструктора) сохраняет первопричину, не теряя цепочку.
- Кастомные подклассы \`Error\` дают типизированную обработку через \`instanceof\` и свои поля.
- Ловите ошибки узко и не глотайте их молча.`,
      en: `## 🧩 In plain words

An error in a program is like an alarm: "something went wrong." JavaScript gives you a special \`Error\` object for this, carrying both the message and a "trail" (exactly where things broke). If you raise the alarm properly and attach the underlying cause, it becomes far easier to figure out what happened later. Let's walk through how to do it well.

### Throw \`Error\`, not arbitrary values

Technically JS lets you \`throw\` any value — a string, a number, whatever. But you shouldn't. Always throw an **\`Error\` instance** (or a subclass). Why?

An \`Error\` object gives you three useful things:
- \`message\` — a human-readable text: what broke.
- \`name\` — the error type (e.g. \`'TypeError'\`).
- \`stack\` — the **stack trace**, i.e. the list of functions the code passed through before failing. This is your map to find the culprit.

If you throw a string (\`throw 'oops'\`), you lose the \`stack\` and break checks like \`if (e instanceof Error)\` — they stop working, because a string is not an \`Error\`.

### \`Error.cause\` — keep the root cause (ES2022)

Often one error happens because of another. For example, a network request fails, and as a result a user couldn't be loaded. You want to say "failed to load user" while **not losing** the original low-level error.

For this, the \`Error\` constructor takes a second argument — an object \`{ cause }\`. It stores the **original error** inside the new one:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error(\`Failed to load user \${id}\`, { cause: e });
}
\`\`\`

Now \`err.cause\` holds the real root cause — handy for logs. This solves the old "swallowed original" problem, where a friendly wrapper completely hid the technical detail of the failure.

### Custom error classes

Sometimes you want to tell errors apart by type: "this is a validation error," "this is an HTTP error." For that, people create **subclasses** of \`Error\`. A subclass is your own error type with its own extra fields.

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
\`\`\`

Now in a \`catch\` block you can check \`if (e instanceof HttpError)\` and read \`e.status\`. This is **typed handling**: you react to different errors differently.

> Legacy note: if your project is transpiled to ES5 (e.g. old Babel), the prototype chain gets truncated and \`instanceof\` may break. Then the constructor needs \`Object.setPrototypeOf(this, new.target.prototype)\`. In native ES2015+ this is not required.

## ⚠️ Common pitfalls

- **Catch narrowly.** Don't wrap everything in one \`catch\` that silently swallows any error — that hides bugs. Distinguish error types.
- **Async.** \`try/catch\` only catches errors where you \`await\`. For floating promises without \`await\`, use \`.catch(...)\` or the global \`unhandledrejection\` handler.
- **Don't use exceptions as ordinary control flow** in hot (frequently executed) paths — throwing and catching is expensive.
- **\`AggregateError\`** (from \`Promise.any\`) collects several causes at once in its \`.errors\` field — useful when multiple promises failed.

## 🎯 Key takeaways

- Always throw an \`Error\` or a subclass — for \`message\`, \`name\`, and \`stack\`.
- \`Error.cause\` (the constructor's second argument) preserves the root cause without losing the chain.
- Custom \`Error\` subclasses enable typed handling via \`instanceof\` and their own fields.
- Catch errors narrowly and never swallow them silently.`
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
      ru: `## 🧩 Простыми словами

Регулярное выражение (regex) — это шаблон для поиска и разбора текста, что-то вроде «умного Ctrl+F». Современный JS добавил в него много удобств: можно давать частям шаблона имена, искать «то, перед чем стоит X», работать с эмодзи и юникодом. Но есть одна коварная ловушка с флагом \`g\`, из-за которой один и тот же регекс может внезапно давать разные ответы. Разберёмся по порядку.

### Современные возможности

- **Именованные группы** \`(?<year>\\d{4})\` — вместо того чтобы помнить «группа номер 1, группа номер 2», вы даёте группе имя и достаёте результат через \`match.groups.year\`. В строке замены — \`$<year>\`.
- **Lookbehind** \`(?<=...)\` / \`(?<!...)\` — «утверждение назад» (появилось в ES2018). Оно проверяет, что **перед** нужным местом стоит (или не стоит) что-то, но само это «что-то» в результат не попадает. Похожий **lookahead** \`(?=...)\`/\`(?!...)\` (проверка вперёд) существовал всегда.
- **Флаг \`s\`** (dotAll) — точка \`.\` начинает совпадать в том числе с переводом строки (обычно она его пропускает).
- **Флаг \`u\`** — корректная работа с Unicode и суррогатными парами (символы вроде эмодзи, которые «весят» больше одного кодового блока). **Флаг \`v\`** — расширение \`u\`: продвинутые классы символов и операции над множествами.
- **\`\\p{...}\`** — Unicode property escapes: \`\\p{L}\` — любая буква любого языка, \`\\p{Emoji}\` — эмодзи.
- **\`matchAll\`** — возвращает итератор по **всем** совпадениям сразу, вместе с их группами.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y; // '2024'
\`\`\`

Здесь мы разобрали дату на именованные части \`y\` и \`m\` и достали год по имени.

### Проблема состояния флага \`g\` / \`y\`

Вот главная ловушка. Регекс с флагом \`g\` (global) или \`y\` (sticky) **запоминает своё состояние** между вызовами. Он хранит в свойстве \`lastIndex\` позицию, с которой продолжит искать в следующий раз. Из-за этого один и тот же объект-регекс в цикле выдаёт «прыгающие» результаты:

\`\`\`js
const r = /a/g;
r.test('aa'); // true  (lastIndex -> 1)
r.test('aa'); // true  (lastIndex -> 2)
r.test('aa'); // false (дошли до конца, lastIndex -> 0, сброс)
\`\`\`

Обратите внимание: строка каждый раз одна и та же \`'aa'\`, а ответы разные. Причина — \`lastIndex\` двигается вперёд после каждого удачного \`test()\`, пока не упрётся в конец, и только тогда сбрасывается в 0.

Вывод: **не переиспользуйте** один и тот же \`g\`-регекс для разных строк или проверок. Либо создавайте новый регекс, либо вручную сбрасывайте \`lastIndex = 0\` перед использованием. А ещё лучше — используйте \`matchAll\` / \`replaceAll\`, которые устроены безопаснее и не оставляют «висящего» состояния.

### Sticky-флаг \`y\`

Флаг \`y\` (sticky, «липкий») требует, чтобы совпадение начиналось **ровно с позиции \`lastIndex\`** — он не «сканирует» строку дальше в поисках совпадения. Это звучит строго, но именно это нужно при написании **токенизаторов** и парсеров: вы последовательно «откусываете» кусочки от текущей позиции, шаг за шагом, не позволяя регексу проскочить вперёд.

## ⚠️ Подводные камни

- \`g\`-регекс, вынесенный в константу и переиспользуемый в \`if (re.test(x))\`, будет периодически «врать» из-за \`lastIndex\`. Для разовых проверок не добавляйте флаг \`g\`.
- \`String.prototype.matchAll\` требует, чтобы регекс имел флаг \`g\`, иначе бросит ошибку.
- Lookbehind поддерживается не во всех очень старых движках — проверяйте окружение, если целитесь в легаси.

## 🎯 Запомни

- Именованные группы \`(?<name>...)\` делают разбор читаемым: \`match.groups.name\`.
- Lookbehind \`(?<=...)\`/\`(?<!...)\` проверяет контекст слева, не включая его в результат.
- \`g\`/\`y\`-регекс хранит \`lastIndex\` между вызовами — не переиспользуйте его вслепую; \`matchAll\`/\`replaceAll\` безопаснее.
- Флаг \`y\` (sticky) совпадает только с текущей позицией — идеален для токенизаторов.`,
      en: `## 🧩 In plain words

A regular expression (regex) is a pattern for finding and parsing text — think of it as a "smart Ctrl+F." Modern JS added many conveniences: you can name parts of a pattern, search for "the thing that comes before X," and work with emoji and Unicode. But there's one sneaky trap with the \`g\` flag that can make the same regex suddenly give different answers. Let's go through it step by step.

### Modern features

- **Named groups** \`(?<year>\\d{4})\` — instead of remembering "group number 1, group number 2," you give a group a name and read the result via \`match.groups.year\`. In a replacement string — \`$<year>\`.
- **Lookbehind** \`(?<=...)\` / \`(?<!...)\` — a "backward assertion" (added in ES2018). It checks that something **precedes** (or doesn't precede) the target spot, but that "something" is not included in the match. The similar **lookahead** \`(?=...)\`/\`(?!...)\` (a forward check) always existed.
- **\`s\` flag** (dotAll) — the dot \`.\` now also matches newlines (normally it skips them).
- **\`u\` flag** — correct handling of Unicode and surrogate pairs (characters like emoji that "weigh" more than one code unit). **\`v\` flag** — an extension of \`u\`: advanced character classes and set operations.
- **\`\\p{...}\`** — Unicode property escapes: \`\\p{L}\` — any letter in any language, \`\\p{Emoji}\` — emoji.
- **\`matchAll\`** — returns an iterator over **all** matches at once, together with their groups.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y; // '2024'
\`\`\`

Here we split the date into named parts \`y\` and \`m\` and read the year by name.

### The \`g\` / \`y\` flag state problem

Here's the main trap. A regex with the \`g\` (global) or \`y\` (sticky) flag **remembers its state** between calls. It stores in its \`lastIndex\` property the position where it will continue searching next time. Because of this, reusing one regex object in a loop produces "jumping" results:

\`\`\`js
const r = /a/g;
r.test('aa'); // true  (lastIndex -> 1)
r.test('aa'); // true  (lastIndex -> 2)
r.test('aa'); // false (reached the end, lastIndex -> 0, reset)
\`\`\`

Notice: the string is the same \`'aa'\` every time, yet the answers differ. The reason is that \`lastIndex\` moves forward after each successful \`test()\` until it hits the end, and only then resets to 0.

Takeaway: **don't reuse** the same \`g\`-flagged regex across different strings or checks. Either create a fresh regex, or manually reset \`lastIndex = 0\` before use. Better still — use \`matchAll\` / \`replaceAll\`, which are designed to be safer and leave no lingering state.

### The sticky flag \`y\`

The \`y\` (sticky) flag requires a match to start **exactly at \`lastIndex\`** — it does not "scan" further into the string looking for a match. That sounds strict, but it's exactly what you want when writing **tokenizers** and parsers: you consume chunks from the current position one step at a time, never letting the regex jump ahead.

## ⚠️ Common pitfalls

- A \`g\`-regex stored in a constant and reused inside \`if (re.test(x))\` will periodically "lie" because of \`lastIndex\`. For one-off checks, don't add the \`g\` flag.
- \`String.prototype.matchAll\` requires the regex to have the \`g\` flag, otherwise it throws.
- Lookbehind isn't supported in some very old engines — check your environment if you target legacy.

## 🎯 Key takeaways

- Named groups \`(?<name>...)\` make parsing readable: \`match.groups.name\`.
- Lookbehind \`(?<=...)\`/\`(?<!...)\` checks the left context without including it in the match.
- A \`g\`/\`y\`-regex keeps \`lastIndex\` between calls — don't blindly reuse it; \`matchAll\`/\`replaceAll\` are safer.
- The \`y\` (sticky) flag matches only at the current position — ideal for tokenizers.`
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
      ru: `## 🧩 Простыми словами

Обычный шаблонный литерал — это строка в обратных кавычках с подстановками: \`\` \`Привет, \${name}!\` \`\`. Теговый шаблон — это когда вы ставите **функцию прямо перед** такой строкой: \`\` tag\`Привет, \${name}!\` \`\`. Тогда функция получает по отдельности «застывшие» куски текста и подставляемые значения — и сама решает, как их склеить. Представьте, что вы отдаёте повару отдельно тесто и отдельно начинку, а он сам решает, как собрать пирог.

### Как это устроено

Когда движок видит \`\` tag\`...\` \`\`, он разбивает литерал на две части и передаёт их в функцию \`tag\`:

1. Массив **статических строк** (\`strings\`) — куски текста между подстановками. У него есть ещё свойство \`strings.raw\`, где escape-последовательности (вроде \`\\n\`) не обработаны, а оставлены как есть.
2. **Подставленные выражения** — идут остальными аргументами (\`...values\`).

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Hello, ', '!'], values: ['Ann']
  return strings.reduce((acc, s, i) =>
    acc + s + (values[i] ?? ''), '');
}
tag\`Hello, \${'Ann'}!\`; // 'Hello, Ann!'
\`\`\`

Здесь тег просто склеивает всё обратно в строку. Но главное — **тег полностью контролирует результат**. Он даже не обязан возвращать строку: может вернуть объект, число, что угодно.

### Где это применяют

- **Безопасность и санитизация.** Тег точно знает, что было статическим текстом (написал разработчик), а что — подставленным значением (возможно, ввод пользователя). Поэтому он может экранировать опасные символы именно в подстановках — защита от инъекций (HTML, SQL).
- **Интернационализация (i18n).** \`\` t\`Hello \${name}\` \`\` — тег извлекает ключ фразы и подставляет перевод на нужный язык.
- **DSL и CSS-in-JS.** Библиотеки вроде \`\` styled.div\`...\` \`\`, GraphQL \`\` gql\`...\` \`\`, SQL-билдеры используют теги, чтобы разобрать встроенный «мини-язык» прямо внутри строки.
- **\`String.raw\`** — встроенный тег, который возвращает «сырую» строку, не интерпретируя \`\\n\`, \`\\t\` и т.п. Удобно для путей Windows и регулярок.

### Полезные нюансы

- Строк всегда на одну больше, чем значений: \`strings.length === values.length + 1\` (значения стоят «между» кусками текста).
- Массив \`strings\` для одного литерала **кешируется** — при повторных вызовах это тот же самый объект. Его можно использовать как ключ кеша.
- \`\` String.raw\`Line\\n\` \`\` вернёт \`'Line\\\\n'\` — то есть буквальный backslash и букву \`n\`, а не перенос строки.

\`\`\`js
String.raw\`C:\\path\\to\`; // 'C:\\path\\to' (обратные слэши сохранены буквально)
\`\`\`

## ⚠️ Подводные камни

- Не путайте теговый шаблон с обычной строкой: \`tag\` перед бэктиками — это вызов функции, а не конкатенация.
- Если самому писать санитизирующий тег, экранируйте именно \`values\`, а не \`strings\` — статические части написаны вами и безопасны.
- \`strings.raw\` и \`strings\` — разные вещи: одно с необработанными escape, другое с обработанными.

## 🎯 Запомни

- Теговый шаблон — функция перед бэктиками; она получает \`(strings, ...values)\`.
- \`strings\` — статические куски (+ \`strings.raw\`), \`values\` — подстановки; строк всегда на 1 больше.
- Главная суперсила: тег видит границу «статика vs подставленное значение» — отсюда безопасная интерполяция и DSL.
- \`String.raw\` — готовый тег для «сырых» строк без обработки \`\\n\` и подобного.`,
      en: `## 🧩 In plain words

A regular template literal is a backtick string with interpolations: \`\` \`Hello, \${name}!\` \`\`. A tagged template is when you put a **function right before** such a string: \`\` tag\`Hello, \${name}!\` \`\`. Then the function receives, separately, the "frozen" chunks of text and the interpolated values — and decides itself how to combine them. Imagine handing a cook the dough and the filling separately, and letting the cook decide how to assemble the pie.

### How it works

When the engine sees \`\` tag\`...\` \`\`, it splits the literal into two parts and passes them to the \`tag\` function:

1. An array of **static strings** (\`strings\`) — the text chunks between interpolations. It also has a \`strings.raw\` property, where escape sequences (like \`\\n\`) are left unprocessed, exactly as written.
2. The **interpolated expressions** — passed as the remaining arguments (\`...values\`).

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Hello, ', '!'], values: ['Ann']
  return strings.reduce((acc, s, i) =>
    acc + s + (values[i] ?? ''), '');
}
tag\`Hello, \${'Ann'}!\`; // 'Hello, Ann!'
\`\`\`

Here the tag simply glues everything back into a string. But the key point is that **the tag fully controls the result**. It isn't even required to return a string — it can return an object, a number, anything.

### Where it's used

- **Security and sanitization.** The tag knows exactly what was static text (written by the developer) versus an interpolated value (possibly user input). So it can escape dangerous characters precisely in the interpolations — protection against injection (HTML, SQL).
- **Internationalization (i18n).** \`\` t\`Hello \${name}\` \`\` — the tag extracts the phrase key and substitutes the translation for the target language.
- **DSLs and CSS-in-JS.** Libraries like \`\` styled.div\`...\` \`\`, GraphQL \`\` gql\`...\` \`\`, and SQL builders use tags to parse an embedded "mini-language" right inside the string.
- **\`String.raw\`** — a built-in tag that returns the "raw" string without interpreting \`\\n\`, \`\\t\`, etc. Handy for Windows paths and regexes.

### Useful nuances

- There's always one more string than values: \`strings.length === values.length + 1\` (the values sit "between" the text chunks).
- The \`strings\` array for one literal is **cached** — on repeated calls it's the exact same object. You can use it as a cache key.
- \`\` String.raw\`Line\\n\` \`\` returns \`'Line\\\\n'\` — i.e. a literal backslash and the letter \`n\`, not a newline.

\`\`\`js
String.raw\`C:\\path\\to\`; // 'C:\\path\\to' (backslashes kept literally)
\`\`\`

## ⚠️ Common pitfalls

- Don't confuse a tagged template with an ordinary string: \`tag\` before backticks is a function call, not concatenation.
- When writing your own sanitizing tag, escape the \`values\`, not the \`strings\` — the static parts are written by you and are safe.
- \`strings.raw\` and \`strings\` are different: one has unprocessed escapes, the other has processed ones.

## 🎯 Key takeaways

- A tagged template is a function before backticks; it receives \`(strings, ...values)\`.
- \`strings\` are the static chunks (+ \`strings.raw\`), \`values\` are the interpolations; there's always one more string.
- The core superpower: the tag sees the "static vs. interpolated value" boundary — hence safe interpolation and DSLs.
- \`String.raw\` is a ready-made tag for "raw" strings without processing \`\\n\` and the like.`
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
      ru: `## 🧩 Простыми словами

Опциональная цепочка \`?.\` — это «безопасный доступ»: она пытается достать вложенное свойство, но если по пути встретила «пустоту» (\`null\` или \`undefined\`), спокойно возвращает \`undefined\` вместо того чтобы упасть с ошибкой. Оператор \`??\` — это «дай запасное значение, только если слева настоящая пустота». Оба удобны, но у них есть тонкости, на которых легко споткнуться. Разберёмся.

### Опциональная цепочка \`?.\`

\`a?.b\` означает: если \`a\` — это \`null\` или \`undefined\`, верни \`undefined\`; иначе верни \`a.b\`. Есть три формы:
- \`a?.b\` — доступ к свойству,
- \`a?.[key]\` — доступ по вычисляемому ключу,
- \`a?.()\` — вызов функции.

**Короткое замыкание.** Если левая часть оказалась «нулевой» (nullish, то есть \`null\` или \`undefined\`), то **вся оставшаяся цепочка пропускается** — и побочные эффекты справа даже не выполнятся:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;
obj?.method(fn()); // fn НЕ вызвана, calls === 0
\`\`\`

Здесь \`obj\` — \`null\`, поэтому JS не только не вызывает \`method\`, но и не вычисляет аргумент \`fn()\`. Это и есть короткое замыкание: как только слева пусто, дальше ничего не происходит.

### Нулевое слияние \`??\`

\`a ?? b\` возвращает \`b\`, только если \`a\` — это \`null\` или \`undefined\`. В этом ключевое отличие от старого \`||\`, который срабатывает на **любое falsy-значение** (\`0\`, \`''\`, \`false\`, \`NaN\`):

\`\`\`js
0 || 5;    // 5  — теряем валидный ноль
0 ?? 5;    // 0  — сохраняем ноль
'' ?? 'x'; // '' — сохраняем пустую строку
\`\`\`

Поэтому \`??\` — правильный выбор для значений по умолчанию, когда \`0\`, \`''\` или \`false\` являются **допустимыми** значениями, а не «отсутствием значения». Классический баг: \`config.retries || 3\` превратит валидный \`0\` (ноль повторов) в \`3\`.

### Тонкости и особенности

- **Нельзя смешивать \`??\` с \`||\`/\`&&\`** без скобок. Запись \`a || b ?? c\` — это SyntaxError, движок специально это запрещает, чтобы не было путаницы с приоритетом. Пишите явно: \`(a || b) ?? c\`.
- **Логические присваивания** \`??=\`, \`||=\`, \`&&=\` — короткозамыкающиеся. Например, \`a ??= b\` присвоит \`b\` в \`a\`, только если \`a\` было \`null\`/\`undefined\`.
- **\`?.\` защищает только одно звено.** В \`a?.b.c\`, если \`a\` нулевое — вся цепочка вернёт \`undefined\`. Но если само \`a.b\` оказалось нулевым, то \`a.b.c\` всё равно бросит ошибку. Нужно защищать каждое звено: \`a?.b?.c\`.
- **\`delete a?.b\`** ничего не делает (no-op), если \`a\` нулевое.
- \`?.\` не спасает от \`a.b\`, где \`a\` — это \`0\` или \`''\`: это не nullish, а обращение к свойству числа или строки вполне легально (JS временно «оборачивает» их в объект — автобоксинг).

## ⚠️ Подводные камни

- Замена \`||\` на \`??\` меняет поведение для \`0\`, \`''\`, \`false\` — не делайте её механически, подумайте, валидны ли эти значения.
- \`a?.b.c.d\` даёт ложное чувство безопасности: защищено только \`a\`. Ставьте \`?.\` там, где реально может быть пусто.
- Не переусердствуйте с \`?.\`: если значение обязано существовать, лишний \`?.\` скрывает баг вместо того, чтобы его показать.

## 🎯 Запомни

- \`?.\` возвращает \`undefined\` при nullish-слева и коротко замыкает остаток цепочки (включая аргументы).
- \`??\` даёт дефолт только при \`null\`/\`undefined\`; \`||\` — при любом falsy. Для \`0\`/\`''\`/\`false\` берите \`??\`.
- \`??\` и \`||\`/\`&&\` нельзя смешивать без скобок — будет SyntaxError.
- \`?.\` защищает лишь одно звено — для глубоких цепочек ставьте \`?.\` на каждом.`,
      en: `## 🧩 In plain words

Optional chaining \`?.\` is "safe access": it tries to reach a nested property, but if it hits "emptiness" along the way (\`null\` or \`undefined\`), it calmly returns \`undefined\` instead of crashing with an error. The \`??\` operator means "give me a fallback value, but only if the left side is genuinely empty." Both are handy, but they have subtleties that are easy to trip on. Let's sort them out.

### Optional chaining \`?.\`

\`a?.b\` means: if \`a\` is \`null\` or \`undefined\`, return \`undefined\`; otherwise return \`a.b\`. There are three forms:
- \`a?.b\` — property access,
- \`a?.[key]\` — access by a computed key,
- \`a?.()\` — function call.

**Short-circuit.** If the left side is nullish (that is, \`null\` or \`undefined\`), then **the rest of the chain is skipped** — and even side effects on the right won't run:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;
obj?.method(fn()); // fn NOT called, calls === 0
\`\`\`

Here \`obj\` is \`null\`, so JS not only doesn't call \`method\`, it doesn't even evaluate the argument \`fn()\`. That's short-circuiting: as soon as the left side is empty, nothing further happens.

### Nullish coalescing \`??\`

\`a ?? b\` returns \`b\` only if \`a\` is \`null\` or \`undefined\`. That's the key difference from the older \`||\`, which fires on **any falsy value** (\`0\`, \`''\`, \`false\`, \`NaN\`):

\`\`\`js
0 || 5;    // 5  — loses a valid zero
0 ?? 5;    // 0  — keeps zero
'' ?? 'x'; // '' — keeps empty string
\`\`\`

So \`??\` is the right choice for default values when \`0\`, \`''\`, or \`false\` are **valid** values, not "the absence of a value." A classic bug: \`config.retries || 3\` turns a valid \`0\` (zero retries) into \`3\`.

### Subtleties and quirks

- **You can't mix \`??\` with \`||\`/\`&&\`** without parentheses. Writing \`a || b ?? c\` is a SyntaxError — the engine forbids it on purpose to avoid confusion about precedence. Be explicit: \`(a || b) ?? c\`.
- **Logical assignments** \`??=\`, \`||=\`, \`&&=\` are short-circuiting. For example, \`a ??= b\` assigns \`b\` to \`a\` only if \`a\` was \`null\`/\`undefined\`.
- **\`?.\` guards only one link.** In \`a?.b.c\`, if \`a\` is nullish the whole chain returns \`undefined\`. But if \`a.b\` itself turns out to be nullish, then \`a.b.c\` still throws. You must guard each link: \`a?.b?.c\`.
- **\`delete a?.b\`** does nothing (a no-op) if \`a\` is nullish.
- \`?.\` doesn't help against \`a.b\` where \`a\` is \`0\` or \`''\`: that's not nullish, and property access on a number or string is perfectly legal (JS temporarily "wraps" them in an object — autoboxing).

## ⚠️ Common pitfalls

- Swapping \`||\` for \`??\` changes behavior for \`0\`, \`''\`, \`false\` — don't do it mechanically; think about whether those values are valid.
- \`a?.b.c.d\` gives a false sense of safety: only \`a\` is guarded. Put \`?.\` where emptiness is actually possible.
- Don't overuse \`?.\`: if a value is supposed to exist, a stray \`?.\` hides a bug instead of surfacing it.

## 🎯 Key takeaways

- \`?.\` returns \`undefined\` when the left side is nullish and short-circuits the rest of the chain (including arguments).
- \`??\` gives a default only on \`null\`/\`undefined\`; \`||\` on any falsy. For \`0\`/\`''\`/\`false\` use \`??\`.
- \`??\` and \`||\`/\`&&\` can't be mixed without parentheses — it's a SyntaxError.
- \`?.\` guards only one link — for deep chains put \`?.\` on each one.`
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
      ru: `## 🧩 Простыми словами

Представь, что твоё приложение читают люди в разных странах. В США пишут \`$1,234.50\`, в Германии — \`1.234,50 €\`, а «2 дня назад» по-русски звучит иначе, чем по-английски. \`Intl\` — это встроенный в браузер и Node «переводчик форматов»: он знает правила сотен языков и стран и сам расставит запятые, точки, символы валют, названия месяцев и падежи. Тебе не нужно тащить огромные библиотеки или писать правила вручную.

### Что такое Intl и зачем оно

\`Intl\` (от _internationalization_, интернационализация) — это встроенное API для форматирования данных под конкретную **локаль** (комбинацию языка и региона, например \`de-DE\` — немецкий/Германия). Оно умеет форматировать числа, валюту, даты, относительное время (\`«вчера»\`), множественные формы и сравнивать строки с учётом языка.

Главный плюс: данные о правилах уже лежат внутри браузера/Node (база **ICU** — стандартная библиотека правил Unicode), поэтому не нужно грузить свои таблицы или сторонние пакеты. Это заменяет ручные хаки для большинства задач.

### Числа и валюта

\`Intl.NumberFormat\` форматирует числа: разделители разрядов, валюту, компактную запись.

\`\`\`js
new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR'
}).format(1234.5); // '1.234,50 €'

new Intl.NumberFormat('en-US', {
  notation: 'compact'
}).format(1_500_000); // '1.5M'
\`\`\`

Первый пример показывает валюту по немецким правилам (точка — разделитель тысяч, запятая — дробная часть). Второй — компактную запись: миллион превращается в короткое \`1.5M\`.

### Даты

\`Intl.DateTimeFormat\` форматирует дату и время под локаль. Параметры \`dateStyle\` и \`timeStyle\` задают уровень подробности (\`'long'\`, \`'short'\` и т. д.).

\`\`\`js
new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'long', timeStyle: 'short'
}).format(new Date()); // '29 июня 2026 г., 14:30'
\`\`\`

### Прочие форматтеры

- **\`Intl.RelativeTimeFormat\`** — относительное время: «2 дня назад», «через 3 часа».
- **\`Intl.PluralRules\`** — правильные формы множественного числа. Особенно важно для русского: _1 файл / 2 файла / 5 файлов_.
- **\`Intl.ListFormat\`** — перечисления: «A, B и C».
- **\`Intl.Collator\`** — сравнение и сортировка строк по правилам языка (например, в немецком \`ä\` стоит рядом с \`a\`; можно учитывать регистр и диакритику).

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare); // ['a','ä','z']
\`\`\`

Здесь \`Collator\` даёт функцию \`compare\`, которую \`sort\` использует для правильного немецкого порядка. Обычный \`.sort()\` поставил бы \`ä\` после \`z\`, потому что сравнивал бы по кодам символов.

### Производительность

Создание любого форматтера — **дорогая** операция (браузер поднимает правила локали). Поэтому создавай инстанс один раз и **переиспользуй** его, а не пересоздавай в цикле или на каждом рендере.

## ⚠️ Подводные камни

- Не создавай \`new Intl.*Format(...)\` внутри цикла или render-функции — это заметно тормозит. Кешируй инстанс.
- \`toFixed\` и \`toLocaleString\` без опций дают несогласованные результаты между окружениями — \`Intl\` с явными опциями надёжнее.
- Всегда указывай локаль явно, иначе результат зависит от настроек машины пользователя.

## 🎯 Запомни

- \`Intl\` — встроенный переводчик форматов чисел, дат, времени и сортировки под язык/регион, без сторонних библиотек.
- Ключевые классы: \`NumberFormat\`, \`DateTimeFormat\`, \`RelativeTimeFormat\`, \`PluralRules\`, \`ListFormat\`, \`Collator\`.
- Создавай форматтер один раз и переиспользуй — конструктор дорогой.`,
      en: `## 🧩 In plain words

Imagine your app is read by people in different countries. The US writes \`$1,234.50\`, Germany writes \`1.234,50 €\`, and "2 days ago" reads differently in each language. \`Intl\` is a "format translator" built into the browser and Node: it already knows the rules of hundreds of languages and regions and places the commas, dots, currency symbols, month names, and plural forms for you. No giant libraries, no hand-written rules.

### What Intl is and why use it

\`Intl\` (short for _internationalization_) is a built-in API for formatting data for a specific **locale** (a language + region combo, e.g. \`de-DE\` for German/Germany). It formats numbers, currency, dates, relative time (\`"yesterday"\`), plural forms, and compares strings in a language-aware way.

The big win: the rules already live inside the browser/Node (the **ICU** database — the standard Unicode rules library), so you don't ship your own tables or a third-party package. It replaces manual hacks for most tasks.

### Numbers and currency

\`Intl.NumberFormat\` formats numbers: thousands separators, currency, compact notation.

\`\`\`js
new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR'
}).format(1234.5); // '1.234,50 €'

new Intl.NumberFormat('en-US', {
  notation: 'compact'
}).format(1_500_000); // '1.5M'
\`\`\`

The first example shows currency in German rules (dot as thousands separator, comma for the fraction). The second is compact notation: a million becomes the short \`1.5M\`.

### Dates

\`Intl.DateTimeFormat\` formats date and time for a locale. The \`dateStyle\` and \`timeStyle\` options set the level of detail (\`'long'\`, \`'short'\`, etc.).

\`\`\`js
new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long', timeStyle: 'short'
}).format(new Date()); // '29 June 2026 at 14:30'
\`\`\`

### Other formatters

- **\`Intl.RelativeTimeFormat\`** — relative time: "2 days ago", "in 3 hours".
- **\`Intl.PluralRules\`** — correct plural forms. Crucial for languages like Russian: _1 file / 2 files / 5 files_.
- **\`Intl.ListFormat\`** — lists: "A, B, and C".
- **\`Intl.Collator\`** — locale-correct string comparison and sorting (e.g. \`ä\` sits next to \`a\` in German; you can honor case and diacritics).

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare); // ['a','ä','z']
\`\`\`

Here \`Collator\` gives a \`compare\` function that \`sort\` uses for the correct German order. A plain \`.sort()\` would put \`ä\` after \`z\`, because it compares by character codes.

### Performance

Creating any formatter is an **expensive** operation (the engine loads the locale rules). So build the instance once and **reuse** it — don't recreate it inside a loop or on every render.

## ⚠️ Common pitfalls

- Don't create \`new Intl.*Format(...)\` inside a loop or a render function — it's noticeably slow. Cache the instance.
- \`toFixed\` and \`toLocaleString\` without options give inconsistent results across environments — \`Intl\` with explicit options is more reliable.
- Always pass the locale explicitly, otherwise the result depends on the user's machine settings.

## 🎯 Key takeaways

- \`Intl\` is a built-in translator of number, date, time, and sort formats per language/region — no third-party libraries.
- Key classes: \`NumberFormat\`, \`DateTimeFormat\`, \`RelativeTimeFormat\`, \`PluralRules\`, \`ListFormat\`, \`Collator\`.
- Create a formatter once and reuse it — the constructor is expensive.`
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
      ru: `## 🧩 Простыми словами

TypeScript часто не знает точно, какой тип у переменной прямо сейчас — например, пришло \`unknown\` или \`string | null\`. Есть два способа его «убедить». **Type guard** (охранник типа) — как вопрос «это точно строка?»: возвращает да/нет, и в ветке «да» TS считает значение строкой. **Assertion-функция** (утверждение) — как вышибала на входе: «если это не строка — выкидываю с ошибкой», и раз функция не бросила, дальше по коду значение гарантированно строка.

### Type guard (\`x is T\`)

Это функция-предикат: она **возвращает boolean**, а её тип возврата записан как \`x is T\`. Если она вернула \`true\`, TS **сужает** (narrow) тип аргумента до \`T\` внутри той ветки, где результат истинный.

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
if (isString(val)) {
  val.toUpperCase(); // val: string
}
\`\`\`

Используется для **ветвления**: в \`if\` или \`.filter()\` мы разделяем случаи, никого не выкидывая. Если тип не тот — просто идём в ветку \`else\`.

### Assertion function (\`asserts x is T\`)

Это функция, которая **ничего не возвращает**, но **бросает исключение**, если условие ложно. Её тип возврата — \`asserts x is T\` (или \`asserts cond\`). После её вызова TS считает тип **гарантированно суженным** на весь оставшийся код ниже — ведь если бы тип был неверным, функция бы бросила и до этих строк дело бы не дошло.

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

### Когда что использовать

- **Type guard** — когда типы нужно **обработать по-разному**, и есть альтернативная ветка (значение может быть и тем, и другим — это нормально).
- **Assertion** — когда «иначе это баг»: код ниже **полагается** на инвариант, и продолжать с неверным типом бессмысленно. Типично для валидации входных данных и проверки инвариантов.

## ⚠️ Подводные камни

- TS **не проверяет** тело предиката или ассерта — он просто вам верит. Ошибка в реализации делает сужение **unsound** (несостоятельным): TS будет уверен в неверном типе.
- \`asserts cond\` без \`is T\` сужает по условию: \`assert(x !== null)\` уберёт \`null\` из типа \`x\`.
- Assertion-функцию, присвоенную переменной, нужно **явно аннотировать** — TS не выводит \`asserts\` сам по себе.

## 🎯 Запомни

- \`x is T\` возвращает boolean и сужает тип **в ветке** — для ветвления.
- \`asserts x is T\` ничего не возвращает, **бросает** при нарушении и сужает тип **на весь код ниже** — для инвариантов.
- Оба механизма построены на доверии: неправильная реализация ломает типобезопасность молча.`,
      en: `## 🧩 In plain words

TypeScript often doesn't know exactly what type a variable has right now — say it received \`unknown\` or \`string | null\`. There are two ways to "convince" it. A **type guard** is like the question "is this really a string?": it returns yes/no, and in the "yes" branch TS treats the value as a string. An **assertion function** is like a bouncer at the door: "if this isn't a string, I throw," so once the function didn't throw, the value is guaranteed to be a string for the rest of the code.

### Type guard (\`x is T\`)

This is a predicate function: it **returns a boolean**, and its return type is written as \`x is T\`. If it returns \`true\`, TS **narrows** the argument to \`T\` inside the branch where the result is truthy.

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}
if (isString(val)) {
  val.toUpperCase(); // val: string
}
\`\`\`

Used for **branching**: in an \`if\` or \`.filter()\` we split the cases without throwing anyone out. If the type isn't right, we just fall into the \`else\` branch.

### Assertion function (\`asserts x is T\`)

This is a function that **returns nothing** but **throws** if the condition is false. Its return type is \`asserts x is T\` (or \`asserts cond\`). After it's called, TS treats the type as **guaranteed narrowed** for all the code below — because if the type had been wrong, the function would have thrown and we'd never reach those lines.

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

### When to use which

- **Type guard** — when you need to **handle types differently** and there's an alternative branch (the value being either type is fine).
- **Assertion** — when "otherwise it's a bug": the code below **relies** on the invariant, and continuing with the wrong type makes no sense. Typical for input validation and enforcing invariants.

## ⚠️ Common pitfalls

- TS **does not check** the predicate or assert body — it simply trusts you. A wrong implementation makes the narrowing **unsound**: TS will be confident about a wrong type.
- \`asserts cond\` without \`is T\` narrows by condition: \`assert(x !== null)\` removes \`null\` from \`x\`'s type.
- An assertion function assigned to a variable needs an **explicit type annotation** — TS won't infer \`asserts\` on its own.

## 🎯 Key takeaways

- \`x is T\` returns a boolean and narrows the type **inside a branch** — for branching.
- \`asserts x is T\` returns nothing, **throws** on violation, and narrows the type **for all code below** — for invariants.
- Both rely on trust: a wrong implementation breaks type safety silently.`
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
      ru: `## 🧩 Простыми словами

Объединение (union) — это тип «одно из нескольких», например \`string | number\`. Условный тип — это «если тип подходит под X, то одно, иначе другое» (\`T extends U ? A : B\`). Дистрибутивность значит: когда внутри условного типа стоит «голый» параметр-объединение, TS не берёт весь союз целиком, а **прогоняет условие по каждому варианту по очереди** и потом снова склеивает результаты в союз. Как раздать одинаковое задание каждому члену команды по отдельности, а не команде как единому целому.

### Что такое дистрибутивность

Условный тип \`T extends U ? X : Y\` **распределяется по объединению**, когда \`T\` — это **«голый» (naked) типовой параметр** (стоит прямо, без обёрток вроде массива или кортежа). Тогда TS применяет условие к **каждому члену** объединения отдельно, а затем объединяет результаты обратно.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]   (НЕ (string | number)[])
\`\`\`

Обрати внимание на итог: получилось \`string[] | number[]\`, а не \`(string | number)[]\`. Именно потому, что условие применилось к \`string\` и \`number\` по отдельности.

### never и пустое объединение

\`never\` — это тип «значений не бывает», по сути **пустое объединение** (union без единого члена). Распределение по пустому объединению даёт пустой результат — \`never\`:

\`\`\`ts
type Filtered = ToArray<never>; // never
\`\`\`

На этом построена фильтрация типов. Например, встроенный \`Exclude\`:

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;
\`\`\`

Он проходит по каждому члену \`T\`, отбрасывает подходящие под \`U\` (заменяя их на \`never\`), а \`never\` при склейке союза просто исчезает.

### Как отключить распределение

Чтобы условие проверяло **весь союз целиком**, нужно сделать \`T\` «не голым». Приём: обернуть **обе** стороны \`extends\` в кортеж \`[...]\` (кортеж — массив фиксированной длины):

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;  // true — без обёртки получили бы never
\`\`\`

\`\`\`ts
type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>; // 'no' — союз проверяется целиком
\`\`\`

Без обёртки \`T extends never ? ...\` распределилось бы по пустому союзу и дало бы \`never\` вместо \`true\`. Обёртка \`[T]\` заставляет TS сравнивать союз как единое целое.

## ⚠️ Подводные камни

- \`boolean\` внутри устроен как \`true | false\`, поэтому \`T extends true ? ...\` тоже распределяется по \`boolean\` — легко получить неожиданный \`boolean\` вместо одного варианта.
- Проверка «является ли тип ровно \`never\`» без обёртки \`[T]\` не работает — распределение по \`never\` съест результат.
- Дистрибутивность включается только для **голого** параметра. \`{ x: T } extends ...\` уже не распределяется.

## 🎯 Запомни

- Условный тип с **голым** параметром-объединением применяется к каждому члену по отдельности, потом результаты объединяются.
- Распределение по \`never\` даёт \`never\` — на этом стоят \`Exclude\`, \`Extract\`, \`NonNullable\`.
- Чтобы проверить союз целиком (или поймать ровно \`never\`), оборачивай обе стороны в \`[T] extends [U]\`.`,
      en: `## 🧩 In plain words

A union is a "one of several" type, e.g. \`string | number\`. A conditional type is "if the type fits X then this, else that" (\`T extends U ? A : B\`). Distributivity means: when a bare union type parameter sits inside a conditional type, TS doesn't take the whole union at once — it **runs the condition over each member one by one** and then glues the results back into a union. Like handing the same task to each team member individually rather than to the team as one unit.

### What distributivity is

A conditional type \`T extends U ? X : Y\` **distributes over a union** when \`T\` is a **naked type parameter** (it stands directly, with no wrapper like an array or tuple around it). TS then applies the condition to **each member** of the union separately and unions the results back together.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]   (NOT (string | number)[])
\`\`\`

Note the outcome: it's \`string[] | number[]\`, not \`(string | number)[]\`. Exactly because the condition was applied to \`string\` and \`number\` separately.

### never and the empty union

\`never\` is the "no value ever" type — essentially the **empty union** (a union with no members at all). Distributing over the empty union gives an empty result — \`never\`:

\`\`\`ts
type Filtered = ToArray<never>; // never
\`\`\`

This underlies type filtering. Take the built-in \`Exclude\`:

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;
\`\`\`

It walks each member of \`T\`, drops the ones matching \`U\` (replacing them with \`never\`), and \`never\` simply vanishes when the union is reassembled.

### How to disable distribution

To make the condition check the **whole union as a unit**, you make \`T\` non-naked. The trick: wrap **both** sides of \`extends\` in a tuple \`[...]\` (a tuple is a fixed-length array):

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;  // true — without the wrapper you'd get never
\`\`\`

\`\`\`ts
type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>; // 'no' — the whole union is checked
\`\`\`

Without the wrapper, \`T extends never ? ...\` would distribute over the empty union and yield \`never\` instead of \`true\`. Wrapping in \`[T]\` forces TS to compare the union as one whole.

## ⚠️ Common pitfalls

- \`boolean\` is internally \`true | false\`, so \`T extends true ? ...\` also distributes over \`boolean\` — it's easy to end up with an unexpected \`boolean\` instead of a single branch.
- Checking "is this type exactly \`never\`" fails without the \`[T]\` wrapper — distribution over \`never\` eats the result.
- Distribution only kicks in for a **naked** parameter. \`{ x: T } extends ...\` no longer distributes.

## 🎯 Key takeaways

- A conditional type with a **naked** union parameter applies to each member separately, then the results are unioned.
- Distribution over \`never\` yields \`never\` — this is what \`Exclude\`, \`Extract\`, \`NonNullable\` are built on.
- To check a union as a whole (or to catch exactly \`never\`), wrap both sides: \`[T] extends [U]\`.`
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
      ru: `## 🧩 Простыми словами

\`tsconfig.json\` — это пульт настроек TypeScript, и «строгие» флаги решают, насколько дотошно он ловит ошибки. Думай о них как об уровнях сложности в игре: чем строже, тем больше багов TS поймает ещё до запуска — ценой того, что придётся писать аккуратнее. Флаг \`strict: true\` включает сразу целый набор таких проверок, и есть ещё пара мощных флагов сверху.

### strict — общий рубильник

\`"strict": true\` разом включает набор флагов: \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`. Это базовая планка для любого нового проекта — включай сразу.

### strictNullChecks — самый важный

По умолчанию (без флага) \`null\` и \`undefined\` можно засунуть в любой тип, и TS молчит. С \`strictNullChecks\` они **исключены** из всех типов: если значение может быть пустым, это надо написать явно (\`string | null\`) и **сузить** (проверить) перед использованием. Ловит огромный класс ошибок «cannot read property of undefined» ещё на компиляции.

\`\`\`ts
let s: string = null; // Error при strictNullChecks
\`\`\`

### noUncheckedIndexedAccess

Когда берёшь элемент массива по индексу или значение по ключу из объекта с index-signature (произвольные ключи), элемента может физически не быть. С этим флагом TS добавляет \`| undefined\` к результату, заставляя тебя проверить:

\`\`\`ts
const arr: number[] = [1, 2];
const x = arr[10];   // тип number | undefined (в рантайме реально undefined)
x.toFixed();         // Error — сначала проверь
\`\`\`

Делает работу с массивами и словарями честнее, но добавляет проверок. В \`strict\` **не входит** — включают отдельно.

### exactOptionalPropertyTypes

Различает две ситуации: «свойства нет вообще» и «свойство есть, но равно \`undefined\`». Без флага они смешаны. С ним \`{ a?: string }\` означает «либо ключа нет, либо там строка» — но **не** \`{ a: undefined }\`:

\`\`\`ts
interface T { a?: string }
const t: T = { a: undefined }; // Error при exactOptionalPropertyTypes
\`\`\`

### Прочие полезные флаги

- **\`noImplicitOverride\`** — требует ключевое слово \`override\` при переопределении метода родителя.
- **\`noFallthroughCasesInSwitch\`**, **\`noImplicitReturns\`** — ловят логические дыры (проваливание \`case\`, забытый \`return\`).
- **\`useUnknownInCatchVariables\`** — в \`catch (e)\` переменная \`e\` имеет тип \`unknown\`, а не \`any\`, что безопаснее (заставляет проверить ошибку перед использованием).

## ⚠️ Подводные камни

- \`noUncheckedIndexedAccess\` не входит в \`strict\` — про него часто забывают, хотя он ловит реальные баги с массивами и словарями.
- Ретрофит строгих флагов на большой существующий проект болезнен: всплывает лавина ошибок. Включай с самого старта.
- \`noUncheckedIndexedAccess\` добавляет \`| undefined\` даже когда ты «уверен», что элемент есть — иногда придётся сужать или использовать \`!\`.

## 🎯 Запомни

- \`strict: true\` — обязательная база; включает \`strictNullChecks\` и ещё семь проверок.
- \`strictNullChecks\` убирает \`null\`/\`undefined\` из типов по умолчанию — главный ловец «undefined is not a function».
- \`noUncheckedIndexedAccess\` и \`exactOptionalPropertyTypes\` включай отдельно и с самого начала проекта.`,
      en: `## 🧩 In plain words

\`tsconfig.json\` is TypeScript's settings panel, and the "strict" flags decide how thoroughly it catches mistakes. Think of them as difficulty levels in a game: the stricter you go, the more bugs TS catches before you even run the code — at the cost of writing more carefully. The \`strict: true\` flag turns on a whole set of these checks at once, and there are a couple more powerful flags on top.

### strict — the master switch

\`"strict": true\` turns on a set of flags at once: \`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`. It's the baseline for any new project — turn it on from the start.

### strictNullChecks — the most important

By default (without the flag) you can stuff \`null\` and \`undefined\` into any type and TS stays quiet. With \`strictNullChecks\` they're **excluded** from all types: if a value can be empty, you must say so explicitly (\`string | null\`) and **narrow** (check) it before use. This catches a huge class of "cannot read property of undefined" errors at compile time.

\`\`\`ts
let s: string = null; // Error under strictNullChecks
\`\`\`

### noUncheckedIndexedAccess

When you take an array element by index, or a value by key from an object with an index signature (arbitrary keys), the element might physically not be there. With this flag TS adds \`| undefined\` to the result, forcing you to check:

\`\`\`ts
const arr: number[] = [1, 2];
const x = arr[10];   // type number | undefined (runtime really is undefined)
x.toFixed();         // Error — check first
\`\`\`

Makes array and dictionary work more honest at the cost of extra checks. It's **not** part of \`strict\` — enable it separately.

### exactOptionalPropertyTypes

Distinguishes two situations: "the property is absent entirely" and "the property exists but equals \`undefined\`". Without the flag these are blurred. With it, \`{ a?: string }\` means "either no key, or a string" — but **not** \`{ a: undefined }\`:

\`\`\`ts
interface T { a?: string }
const t: T = { a: undefined }; // Error under exactOptionalPropertyTypes
\`\`\`

### Other useful flags

- **\`noImplicitOverride\`** — requires the \`override\` keyword when overriding a parent method.
- **\`noFallthroughCasesInSwitch\`**, **\`noImplicitReturns\`** — catch logic holes (falling through a \`case\`, a forgotten \`return\`).
- **\`useUnknownInCatchVariables\`** — in \`catch (e)\` the variable \`e\` is typed \`unknown\`, not \`any\`, which is safer (it forces you to inspect the error before using it).

## ⚠️ Common pitfalls

- \`noUncheckedIndexedAccess\` is not in \`strict\` — it's easy to forget, even though it catches real array/dictionary bugs.
- Retrofitting strict flags onto a large existing project is painful: an avalanche of errors surfaces. Turn them on from day one.
- \`noUncheckedIndexedAccess\` adds \`| undefined\` even when you're "sure" the element exists — sometimes you'll need to narrow or use \`!\`.

## 🎯 Key takeaways

- \`strict: true\` is the mandatory baseline; it turns on \`strictNullChecks\` plus seven more checks.
- \`strictNullChecks\` removes \`null\`/\`undefined\` from types by default — the main catcher of "undefined is not a function".
- Enable \`noUncheckedIndexedAccess\` and \`exactOptionalPropertyTypes\` separately, and from the very start of the project.`
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
