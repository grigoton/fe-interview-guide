import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'jsts-037',
    category: 'js-state',
    level: 'Hard',
    tags: ['ieee-754', 'floating-point', 'precision'],
    question: {
      ru: 'Почему `0.1 + 0.2 !== 0.3` в JavaScript? Объясните IEEE-754 и как корректно сравнивать дробные числа.',
      en: 'Why is `0.1 + 0.2 !== 0.3` in JavaScript? Explain IEEE-754 and how to compare floats correctly.'
    },
    answer: {
      ru: `## Коротко

Все числа в JavaScript хранятся в **двоичном** виде. А некоторые простые десятичные дроби в двоичной системе записать точно **невозможно** — как \`1/3\` невозможно записать в десятичной: \`0.3333...\` бесконечно.

\`0.1\` и \`0.2\` — как раз такие. Компьютер сохраняет ближайшее возможное значение, чуть-чуть промахиваясь. Складываем два неточных числа — промахи складываются, и получается \`0.30000000000000004\`.

Это **не баг JavaScript**. Точно так же ведут себя Java, C#, Python и почти всё остальное — это стандарт IEEE-754.

## Как устроено число

Каждое число — это 64 бита: 1 бит на знак, 11 на экспоненту (порядок), 52 на мантиссу (значащие цифры). Отсюда два практических следствия:

- **\`Number.MAX_SAFE_INTEGER\` = 2^53 − 1** (примерно 9 квадриллионов). Дальше целые числа теряют точность: \`9007199254740993\` превращается в \`9007199254740992\`.
- **\`Number.EPSILON\`** (~2.22e-16) — минимальная различимая разница около единицы.

## Как правильно сравнивать

Не на равенство, а **с допуском**:

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;

eq(0.1 + 0.2, 0.3);   // true
\`\`\`

Для больших чисел \`Number.EPSILON\` слишком мал — там берут относительный допуск: \`Math.abs(a - b) < eps * Math.max(Math.abs(a), Math.abs(b))\`.

## Деньги — отдельная история

**Никогда не храните деньги в дробных числах.** Три рабочих варианта:

1. **Целые копейки/центы**: 19.99 — это \`1999\`. Самый простой и надёжный способ.
2. **BigInt** — если сумм много и они большие.
3. **Decimal-библиотека** (decimal.js, big.js) — если нужна точная десятичная арифметика с дробями.

## Что сказать на собеседовании

> В JavaScript все числа — это 64-битные числа двойной точности по стандарту IEEE-754: знак, 11 бит экспоненты и 52 бита мантиссы. Многие десятичные дроби, включая 0.1 и 0.2, в двоичной системе непредставимы точно и округляются, поэтому при сложении получается 0.30000000000000004. Сравнивать дробные числа нужно не строгим равенством, а с допуском, обычно относительно \`Number.EPSILON\`. Отдельно важен предел \`Number.MAX_SAFE_INTEGER\`, равный 2^53 − 1: за ним целые теряют точность, и там нужен BigInt. Деньги в дробных числах хранить нельзя — используют целые копейки, BigInt или decimal-библиотеку.

## Ловушки

- **\`toFixed\` возвращает строку** и сам подвержен той же проблеме на границах: \`(1.005).toFixed(2)\` даёт \`'1.00'\`, а не \`'1.01'\`.
- **\`Number.EPSILON\` — не универсальный допуск.** Он подходит для чисел около единицы; для миллионов нужен относительный допуск.
- **Существует \`-0\`**: \`Object.is(0, -0)\` — \`false\`, а \`1 / -0\` — \`-Infinity\`. Иногда всплывает в сортировках и графике.
- **Ошибка накапливается в циклах.** Суммирование миллиона дробей даст заметный дрейф; для точности используют компенсированное суммирование (алгоритм Кэхана).
- **Большие id с бэкенда ломаются молча.** 64-битный id из БД, пришедший в JSON числом, может измениться при парсинге. Правильно передавать его строкой.`,
      en: `## In short

Every number in JavaScript is stored in **binary**. And some simple decimal fractions **cannot** be written exactly in binary — just as \`1/3\` can't be written exactly in decimal: \`0.3333...\` forever.

\`0.1\` and \`0.2\` are exactly such numbers. The computer stores the nearest representable value, missing slightly. Add two slightly-off numbers and the errors add up, giving \`0.30000000000000004\`.

This is **not a JavaScript bug**. Java, C#, Python and almost everything else behave identically — it's the IEEE-754 standard.

## How a number is laid out

Every number is 64 bits: 1 sign bit, 11 exponent bits, 52 mantissa (significand) bits. Two practical consequences follow:

- **\`Number.MAX_SAFE_INTEGER\` = 2^53 − 1** (about 9 quadrillion). Beyond it integers lose precision: \`9007199254740993\` becomes \`9007199254740992\`.
- **\`Number.EPSILON\`** (~2.22e-16) — the smallest distinguishable difference around one.

## How to compare correctly

Not with equality, but with a **tolerance**:

\`\`\`js
const eq = (a, b, eps = Number.EPSILON) => Math.abs(a - b) < eps;

eq(0.1 + 0.2, 0.3);   // true
\`\`\`

For large numbers \`Number.EPSILON\` is far too small — there you use a relative tolerance: \`Math.abs(a - b) < eps * Math.max(Math.abs(a), Math.abs(b))\`.

## Money is a separate story

**Never store money in floating-point numbers.** Three working options:

1. **Integer cents/pennies**: 19.99 is \`1999\`. The simplest and most reliable approach.
2. **BigInt** — when there are many large amounts.
3. **A decimal library** (decimal.js, big.js) — when you need exact decimal arithmetic with fractions.

## What to say in the interview

> In JavaScript every number is a 64-bit double-precision IEEE-754 value: a sign bit, 11 exponent bits and 52 mantissa bits. Many decimal fractions, including 0.1 and 0.2, aren't exactly representable in binary and get rounded to the nearest representable value, so adding them accumulates the error and produces 0.30000000000000004. Floats should be compared with a tolerance rather than strict equality, usually based on \`Number.EPSILON\`. Separately, there's the \`Number.MAX_SAFE_INTEGER\` limit of 2^53 − 1: beyond it integers lose precision and you need BigInt. Money must never be stored in floats — you use integer cents, BigInt or a decimal library.

## Gotchas

- **\`toFixed\` returns a string** and suffers from the same problem at the boundaries: \`(1.005).toFixed(2)\` gives \`'1.00'\`, not \`'1.01'\`.
- **\`Number.EPSILON\` isn't a universal tolerance.** It suits numbers around one; for millions you need a relative tolerance.
- **\`-0\` exists**: \`Object.is(0, -0)\` is \`false\` and \`1 / -0\` is \`-Infinity\`. It occasionally surfaces in sorting and graphics.
- **Errors accumulate in loops.** Summing a million fractions drifts noticeably; for accuracy you use compensated summation (Kahan's algorithm).
- **Large ids from the backend break silently.** A 64-bit database id arriving as a JSON number can change when parsed. The correct fix is to send it as a string.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['bigint', 'numbers', 'precision'],
    question: {
      ru: 'Что такое BigInt и когда его использовать? Какие ограничения и подводные камни?',
      en: 'What is BigInt and when should you use it? What are its limits and gotchas?'
    },
    answer: {
      ru: `## Коротко

**BigInt — это отдельный тип для целых чисел любой величины.** Обычный \`number\` начинает врать после 2^53 − 1 (примерно 9 квадриллионов), а BigInt — нет, он растёт сколько нужно.

Пишется с суффиксом \`n\`: \`10n\`, или через \`BigInt(10)\`. И это **седьмой примитив**: \`typeof 10n === 'bigint'\`.

\`\`\`js
const n = Number.MAX_SAFE_INTEGER;   // 9007199254740991
n + 1 === n + 2;                     // true — обычные числа уже врут

const b = BigInt(n);
b + 1n === b + 2n;                   // false — BigInt точен
\`\`\`

## Когда он реально нужен

- **64-битные id из базы данных** — самый частый случай на практике.
- Временные метки в наносекундах.
- Криптография, хеши, большие вычисления.

Во всех остальных случаях обычного \`number\` достаточно.

## Главные ограничения

**1. Нельзя смешивать с обычными числами.**

\`\`\`js
1n + 1;              // TypeError!
1n + BigInt(1);      // 2n — ок
Number(1n) + 1;      // 2 — ок
\`\`\`

Это сделано специально: молчаливое смешивание привело бы к незаметной потере точности.

**2. Только целые.** \`5n / 2n\` даёт \`2n\` — остаток просто отбрасывается.

**3. Не работает с \`Math\`.** \`Math.sqrt(9n)\` — ошибка.

**4. Не сериализуется в JSON.** \`JSON.stringify({ id: 10n })\` бросает TypeError. Нужен свой replacer:

\`\`\`js
JSON.stringify({ id: 10n }, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v);   // '{"id":"10"}'
\`\`\`

**5. Медленнее обычных чисел** на маленьких значениях.

## Сравнения — единственное, где смешивать можно

\`\`\`js
10n == 10;    // true  — нестрогое сравнение работает
10n === 10;   // false — типы-то разные
10n < 20;     // true  — <, >, <=, >= тоже работают
\`\`\`

## Что сказать на собеседовании

> BigInt — примитивный тип для целых чисел произвольной точности, без ограничения \`Number.MAX_SAFE_INTEGER\`. Литерал пишется с суффиксом \`n\`, \`typeof\` возвращает \`'bigint'\`. Нужен там, где важна точность больших целых: 64-битные идентификаторы из базы, криптография. Основное ограничение — нельзя смешивать с обычными числами в арифметике, будет TypeError; это сделано намеренно, чтобы не терять точность молча. Дробей нет, деление усекает, и в JSON он не сериализуется без своего replacer. Операторы сравнения между BigInt и Number работают корректно, но строгое равенство даёт false из-за разных типов.

## Ловушки

- **\`BigInt\` не для денег с копейками.** Дробей у него нет; либо храните всё в копейках целыми, либо берите decimal-библиотеку.
- **\`10n === 10\` — всегда false.** Частая ошибка при сравнении id, пришедшего из разных источников.
- **JSON молча ломается** — а точнее, громко бросает исключение, часто уже в проде при сериализации логов.
- **Унарный плюс не работает**: \`+10n\` — TypeError, специально, чтобы не ломать asm.js.
- **В базе id 64-битный, а в JSON он число** — вот здесь и теряется точность ещё до того, как вы доберётесь до BigInt. Просить бэкенд отдавать строкой обычно проще.`,
      en: `## In short

**BigInt is a separate type for integers of any size.** A regular \`number\` starts lying past 2^53 − 1 (about 9 quadrillion); BigInt doesn't — it grows as needed.

It's written with an \`n\` suffix — \`10n\` — or via \`BigInt(10)\`. And it's a **seventh primitive**: \`typeof 10n === 'bigint'\`.

\`\`\`js
const n = Number.MAX_SAFE_INTEGER;   // 9007199254740991
n + 1 === n + 2;                     // true — regular numbers already lie

const b = BigInt(n);
b + 1n === b + 2n;                   // false — BigInt is exact
\`\`\`

## When you actually need it

- **64-bit ids from a database** — by far the most common real-world case.
- Nanosecond timestamps.
- Cryptography, hashes, large computations.

In every other case a regular \`number\` is enough.

## The main limitations

**1. You can't mix it with regular numbers.**

\`\`\`js
1n + 1;              // TypeError!
1n + BigInt(1);      // 2n — ok
Number(1n) + 1;      // 2 — ok
\`\`\`

This is deliberate: silent mixing would silently lose precision.

**2. Integers only.** \`5n / 2n\` gives \`2n\` — the remainder is simply discarded.

**3. \`Math\` doesn't work.** \`Math.sqrt(9n)\` is an error.

**4. It doesn't serialise to JSON.** \`JSON.stringify({ id: 10n })\` throws a TypeError. You need your own replacer:

\`\`\`js
JSON.stringify({ id: 10n }, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v);   // '{"id":"10"}'
\`\`\`

**5. It's slower than a regular number** for small values.

## Comparisons — the one place mixing is allowed

\`\`\`js
10n == 10;    // true  — loose comparison works
10n === 10;   // false — the types differ, after all
10n < 20;     // true  — <, >, <=, >= work too
\`\`\`

## What to say in the interview

> BigInt is a separate primitive type for arbitrary-precision integers, without the \`Number.MAX_SAFE_INTEGER\` ceiling. The literal takes an \`n\` suffix and \`typeof\` returns \`'bigint'\`. You need it where the precision of large integers matters: 64-bit database identifiers, nanosecond timestamps, cryptography. The main restriction is that it can't be mixed with regular numbers in arithmetic — that's a TypeError, deliberately, so precision isn't lost silently. There are no fractions, division truncates, \`Math\` doesn't work, and it won't serialise to JSON without a custom replacer. Comparison operators between BigInt and Number are allowed and behave correctly, but strict equality is always false because the types differ.

## Gotchas

- **BigInt isn't for money with decimals.** It has no fractions; either store everything in integer cents or use a decimal library.
- **\`10n === 10\` is always false.** A common bug when comparing ids that came from different sources.
- **JSON breaks silently** — or rather, loudly throws, often in production while serialising logs.
- **Unary plus doesn't work**: \`+10n\` is a TypeError, deliberately, so asm.js isn't broken.
- **A 64-bit id in the database arriving as a JSON number** already loses precision before you ever reach BigInt. Asking the backend to send it as a string is usually simpler.`
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
    category: 'js-state',
    level: 'Expert',
    tags: ['typed-arrays', 'arraybuffer', 'dataview'],
    question: {
      ru: 'Что такое ArrayBuffer, TypedArray и DataView? Зачем нужен DataView и что такое endianness?',
      en: 'What are ArrayBuffer, TypedArray, and DataView? Why DataView, and what is endianness?'
    },
    answer: {
      ru: `## Коротко

Три вещи, которые работают в связке:

- **\`ArrayBuffer\`** — просто **кусок памяти** заданного размера в байтах. Голые байты, читать напрямую нельзя.
- **\`TypedArray\`** (\`Uint8Array\`, \`Float32Array\`, ...) — **очки**, через которые этот кусок читается как массив чисел определённого типа.
- **\`DataView\`** — те же очки, но с ручной настройкой: можно читать разные типы с любого места и явно указывать порядок байт.

Аналогия: \`ArrayBuffer\` — рулон бумаги. \`TypedArray\` — линейка с разметкой «каждые 4 байта одно число». \`DataView\` — штангенциркуль: меряем что хотим и где хотим.

## Зачем несколько «видов» на один буфер

Один и тот же участок памяти можно читать по-разному — это и есть главная фишка:

\`\`\`js
const buffer = new ArrayBuffer(4);      // 4 байта памяти
const u8 = new Uint8Array(buffer);      // видим как 4 отдельных байта
const u32 = new Uint32Array(buffer);    // видим как одно 32-битное число

u8[0] = 0xFF;
u32[0];   // 255 — те же байты, другая интерпретация
\`\`\`

## Endianness — порядок байт

Число \`256\` занимает несколько байт. Вопрос: какой байт писать первым?

- **Little-endian** — младший байт первым. Так работают процессоры x86 и ARM, то есть почти всё вокруг.
- **Big-endian** — старший первым. Это «сетевой порядок», в нём записаны многие бинарные форматы и протоколы.

**Вот здесь и нужен DataView.** \`TypedArray\` использует порядок **той платформы, где выполняется код** — то есть заранее вы его не знаете. \`DataView\` позволяет указать порядок явно:

\`\`\`js
const dv = new DataView(buffer);

dv.getUint32(0, true);   // 255        — little-endian
dv.getUint32(0, false);  // 4278190080 — big-endian
\`\`\`

Поэтому правило простое: **свои данные внутри приложения — TypedArray, разбор чужого бинарного формата — DataView.**

## Где встречается на практике

WebGL и Canvas, Web Audio, бинарные кадры WebSocket, чтение файлов через \`FileReader\`, \`fetch().arrayBuffer()\`, WebCrypto. Плюс \`SharedArrayBuffer\` вместе с \`Atomics\` — разделяемая память между воркерами.

## Что сказать на собеседовании

> \`ArrayBuffer\` — это сырой блок памяти фиксированного размера, который сам по себе не читается: нужен вид. Типизированные массивы — \`Uint8Array\`, \`Float32Array\` и другие — это типизированные виды на буфер, хранящие числа без боксинга; несколько видов могут смотреть на один буфер и читать те же байты по-разному. \`DataView\` — более гибкий вид: он читает и пишет значения разных типов по произвольному смещению и явно задаёт порядок байт. Типизированные массивы используют endianness платформы, поэтому для бинарных форматов и сетевых протоколов, где принят big-endian, нужен именно \`DataView\`.

## Ловушки

- **Размер \`ArrayBuffer\` фиксирован** при создании. Чтобы «увеличить», создают новый буфер и копируют (или используют \`resizable\` ArrayBuffer в новых движках).
- **Смещение должно быть выровнено.** \`new Uint32Array(buffer, 1)\` бросит RangeError — начало должно быть кратно размеру элемента. У \`DataView\` такого ограничения нет.
- **\`Uint8ClampedArray\` не переполняется, а зажимает**: 300 станет 255, а -5 станет 0. Именно поэтому он используется в Canvas.
- **Буфер может быть «отсоединён»** (detached) после передачи в воркер через transferable — после этого все виды на него становятся пустыми.
- **TypedArray — не настоящий массив.** У него нет \`push\`, \`splice\` и других изменяющих длину методов, зато он заметно компактнее и быстрее для числовых данных.`,
      en: `## In short

Three things that work together:

- **\`ArrayBuffer\`** — just a **block of memory** of a given size in bytes. Raw bytes; you can't read it directly.
- **\`TypedArray\`** (\`Uint8Array\`, \`Float32Array\`, …) — the **glasses** through which that block is read as an array of numbers of a specific type.
- **\`DataView\`** — the same glasses, but adjustable: read any type at any offset and state the byte order explicitly.

The analogy: \`ArrayBuffer\` is a roll of paper. A \`TypedArray\` is a ruler marked "every 4 bytes is one number". A \`DataView\` is a caliper: measure what you want, where you want.

## Why several views over one buffer

The same region of memory can be read in different ways — that's the key feature:

\`\`\`js
const buffer = new ArrayBuffer(4);      // 4 bytes of memory
const u8 = new Uint8Array(buffer);      // seen as 4 separate bytes
const u32 = new Uint32Array(buffer);    // seen as one 32-bit number

u8[0] = 0xFF;
u32[0];   // 255 — same bytes, different interpretation
\`\`\`

## Endianness — byte order

The number \`256\` takes several bytes. The question is: which byte goes first?

- **Little-endian** — least significant byte first. That's how x86 and ARM work, i.e. almost everything around you.
- **Big-endian** — most significant first. This is "network order", used by many binary formats and protocols.

**This is exactly where DataView comes in.** A \`TypedArray\` uses the byte order of **whatever platform the code runs on** — which you can't know in advance. A \`DataView\` lets you state it explicitly:

\`\`\`js
const dv = new DataView(buffer);

dv.getUint32(0, true);   // 255        — little-endian
dv.getUint32(0, false);  // 4278190080 — big-endian
\`\`\`

So the rule is simple: **your own data inside your app — TypedArray; parsing someone else's binary format — DataView.**

## Where you meet this in practice

WebGL and Canvas, Web Audio, binary WebSocket frames, reading files via \`FileReader\`, \`fetch().arrayBuffer()\`, WebCrypto. Plus \`SharedArrayBuffer\` with \`Atomics\` for memory shared between workers.

## What to say in the interview

> \`ArrayBuffer\` is a raw block of memory of fixed size that can't be read on its own — it needs a view. Typed arrays such as \`Uint8Array\` and \`Float32Array\` are typed views onto a buffer that store numbers in binary form without boxing; several views can point at the same buffer and interpret the same bytes differently. \`DataView\` is a more flexible view: it can read and write values of different types at arbitrary offsets and, crucially, set the byte order explicitly. Typed arrays use the platform's endianness, which is unpredictable, while DataView gives explicit control — which is why it's the right tool for parsing binary formats and network protocols, where big-endian is the convention. All of this shows up in WebGL, Web Audio, binary WebSocket frames, file handling and WebCrypto.

## Gotchas

- **An \`ArrayBuffer\`'s size is fixed** at creation. To "grow" it you allocate a new buffer and copy (or use a resizable ArrayBuffer in newer engines).
- **Offsets must be aligned.** \`new Uint32Array(buffer, 1)\` throws a RangeError — the start must be a multiple of the element size. \`DataView\` has no such restriction.
- **\`Uint8ClampedArray\` clamps instead of overflowing**: 300 becomes 255 and -5 becomes 0. That's precisely why Canvas uses it.
- **A buffer can be detached** after being transferred to a worker as a transferable — after that every view over it becomes empty.
- **A TypedArray isn't a real array.** It has no \`push\`, \`splice\` or other length-changing methods, but it's markedly more compact and faster for numeric data.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['map-set', 'weakset', 'collections'],
    question: {
      ru: 'Когда использовать Map/Set вместо объекта и массива? Чем WeakSet отличается от Set?',
      en: 'When should you use Map/Set instead of object and array? How does WeakSet differ from Set?'
    },
    answer: {
      ru: `## Коротко

Простое правило:

- **Объект** — когда поля известны заранее и их немного: \`{ id, name, email }\`. Это структура.
- **Map** — когда ключи произвольные, приходят из данных и часто добавляются/удаляются. Это словарь.
- **Массив** — когда важен порядок и возможны повторы.
- **Set** — когда нужны только уникальные значения и быстрая проверка «есть ли такое».

## Чем Map лучше объекта

1. **Ключом может быть что угодно** — объект, функция, число, \`NaN\`. У объекта ключ всегда строка или символ (число \`1\` молча станет \`'1'\`).
2. **Порядок вставки гарантирован.** У объекта числовые ключи сортируются по возрастанию — сюрприз для многих.
3. **\`size\` сразу**, без \`Object.keys(obj).length\`.
4. **Нет наследованных свойств.** Ключ \`'toString'\` или \`'__proto__'\` в Map совершенно безопасен, а в объекте может сломать логику.
5. **Быстрее на частых добавлениях и удалениях.**

Объект остаётся лучше там, где нужен JSON, доступ через точку и фиксированная форма.

## Чем Set лучше массива

Проверка вхождения: у \`Set.has()\` это **O(1)**, у \`Array.includes()\` — **O(n)**. На больших списках разница драматическая.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])];   // [1, 2, 3] — дедупликация в одну строку
\`\`\`

## Как сравниваются ключи

\`Map\` и \`Set\` используют алгоритм **SameValueZero**. Практически это значит:

- \`NaN\` **равен** \`NaN\` (в отличие от \`===\`) — можно спокойно класть в Set;
- \`+0\` и \`-0\` считаются одним значением;
- **объекты сравниваются по ссылке** — два одинаковых по содержимому объекта это два разных ключа.

## Weak-версии

\`WeakMap\` и \`WeakSet\` — то же самое, но:

- принимают **только объекты**, не примитивы;
- держат их **слабо**: не осталось других ссылок — запись исчезает сама;
- **не итерируемы**, нет \`size\` и \`clear\`.

Типичный сценарий \`WeakSet\` — пометить объекты («уже обработан», «зарегистрирован»), не мешая сборщику мусора их убрать.

## Что сказать на собеседовании

> \`Map\` отличается от объекта тем, что ключом может быть любое значение, включая объекты и \`NaN\`, гарантируется порядок вставки, есть \`size\` за константу и нет проблем с унаследованными свойствами вроде \`toString\` и \`__proto__\`. Он выгоднее при динамических ключах и частых удалениях, а объект — для фиксированной структуры и JSON. \`Set\` хранит уникальные значения, и проверка вхождения у него за O(1) против O(n) у \`Array.includes\`. Сравнение ключей в обеих коллекциях идёт по SameValueZero: \`NaN\` равен сам себе, плюс и минус ноль считаются одинаковыми, объекты сравниваются по ссылке.

## Ловушки

- **Map не сериализуется в JSON.** \`JSON.stringify(new Map())\` даёт \`'{}'\`. Нужно преобразование через \`Object.fromEntries\` или массив пар.
- **Объекты в Set не дедуплицируются по содержимому.** \`new Set([{a:1},{a:1}])\` содержит два элемента.
- **Числовые ключи объекта пересортировываются.** \`{2:'b',1:'a'}\` при переборе даст сначала \`1\`. У Map порядок именно тот, в котором вставляли.
- **Map держит ключи-объекты сильно** — это полноценная утечка, если забыли удалить. Для метаданных берите \`WeakMap\`.
- **\`Set\` не сохраняет индексы**: если нужен и порядок, и быстрый поиск, иногда держат и массив, и Set рядом.`,
      en: `## In short

A simple rule:

- **An object** — when the fields are known ahead of time and there aren't many: \`{ id, name, email }\`. It's a structure.
- **A Map** — when the keys are arbitrary, come from data and are added and removed often. It's a dictionary.
- **An array** — when order matters and duplicates are possible.
- **A Set** — when you need unique values and a fast "is this in there?" check.

## Why a Map beats an object

1. **The key can be anything** — an object, a function, a number, \`NaN\`. An object's key is always a string or symbol (the number \`1\` silently becomes \`'1'\`).
2. **Insertion order is guaranteed.** In an object, numeric keys are sorted ascending — a surprise for many.
3. **\`size\` immediately**, no \`Object.keys(obj).length\`.
4. **No inherited properties.** The key \`'toString'\` or \`'__proto__'\` is perfectly safe in a Map, whereas in an object it can break your logic.
5. **Faster for frequent adds and deletes.**

An object is still better where you need JSON, dot access and a fixed shape.

## Why a Set beats an array

Membership testing: \`Set.has()\` is **O(1)** while \`Array.includes()\` is **O(n)**. On large lists the difference is dramatic.

\`\`\`js
const unique = [...new Set([1, 1, 2, 3])];   // [1, 2, 3] — dedupe in one line
\`\`\`

## How keys are compared

\`Map\` and \`Set\` use the **SameValueZero** algorithm. In practice that means:

- \`NaN\` **is equal to** \`NaN\` (unlike \`===\`) — you can safely put it in a Set;
- \`+0\` and \`-0\` count as the same value;
- **objects compare by reference** — two objects with identical contents are two different keys.

## The weak versions

\`WeakMap\` and \`WeakSet\` are the same thing, except:

- they accept **only objects**, not primitives;
- they hold them **weakly**: no other references left and the entry disappears by itself;
- they're **not iterable** and have no \`size\` or \`clear\`.

The typical \`WeakSet\` scenario is tagging objects ("already processed", "registered") without stopping the garbage collector from removing them.

## What to say in the interview

> A \`Map\` differs from an object in that any value can be a key, including objects and \`NaN\`; insertion order is guaranteed, \`size\` is available in constant time, and there are no problems with inherited properties like \`toString\` or \`__proto__\`. It's the better choice for frequent additions and deletions and for dynamic keys, while an object is more convenient for a fixed structure and JSON. A \`Set\` stores unique values and its membership check is O(1) versus O(n) for \`Array.includes\`. Key comparison in both collections uses SameValueZero: \`NaN\` equals itself, plus and minus zero are treated as the same, and objects compare by reference. The weak versions accept only objects, hold them with weak references and are therefore non-iterable and sizeless — they're used for metadata and tagging without leak risk.

## Gotchas

- **A Map doesn't serialise to JSON.** \`JSON.stringify(new Map())\` gives \`'{}'\`. You need \`Object.fromEntries\` or an array of pairs.
- **Objects in a Set aren't deduplicated by content.** \`new Set([{a:1},{a:1}])\` has two elements.
- **An object's numeric keys get reordered.** \`{2:'b',1:'a'}\` iterates \`1\` first. A Map keeps exactly the insertion order.
- **A Map holds object keys strongly** — a genuine leak if you forget to delete them. For metadata, use a \`WeakMap\`.
- **A \`Set\` doesn't preserve indices**: if you need both order and fast lookup, people sometimes keep an array and a Set side by side.`
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
    category: 'js-state',
    level: 'Hard',
    tags: ['property-descriptors', 'getters-setters', 'define-property'],
    question: {
      ru: 'Что такое дескрипторы свойств? Объясните writable/enumerable/configurable и getter/setter через Object.defineProperty.',
      en: 'What are property descriptors? Explain writable/enumerable/configurable and getter/setter via Object.defineProperty.'
    },
    answer: {
      ru: `## Коротко

У каждого свойства объекта, кроме значения, есть **три скрытых настройки** — вместе они и называются дескриптором.

- **\`writable\`** — можно ли менять значение.
- **\`enumerable\`** — видно ли свойство при переборе (\`Object.keys\`, \`for...in\`, spread, \`JSON.stringify\`).
- **\`configurable\`** — можно ли свойство удалить и можно ли поменять сами эти настройки.

Когда вы пишете \`obj.a = 1\`, все три флага автоматически \`true\`. Через \`Object.defineProperty\` — наоборот, **по умолчанию все \`false\`**. Это главный подвох метода.

## Два вида дескрипторов

- **Data descriptor** — обычное свойство: есть \`value\` и \`writable\`.
- **Accessor descriptor** — вместо значения есть функции \`get\` и \`set\`. Снаружи выглядит как обычное свойство, а на деле выполняется код.

\`\`\`js
const user = { name: 'Ann' };

Object.defineProperty(user, 'role', {
  value: 'admin',
  writable: false,      // менять нельзя
  enumerable: false,    // не видно при переборе
  configurable: false   // не удалить
});

Object.keys(user);        // ['name'] — role спрятан
JSON.stringify(user);     // '{"name":"Ann"}'
user.role = 'user';       // в strict mode — TypeError, иначе молча ничего
delete user.role;         // не сработает
\`\`\`

## Геттеры и сеттеры — «умные свойства»

Позволяют вычислять значение на лету, валидировать запись и делать ленивую инициализацию:

\`\`\`js
let temp = 0;

Object.defineProperty(obj, 'celsius', {
  get() { return temp; },
  set(v) {
    if (v < -273) throw new RangeError('слишком холодно');
    temp = v;
  },
  enumerable: true
});
\`\`\`

## Зачем это знать на практике

- **\`Object.freeze\` — это как раз массовое выставление** \`writable: false\` и \`configurable: false\`.
- **Служебные поля прячут через \`enumerable: false\`**, чтобы они не попадали в JSON и не мешали при переборе.
- **\`Object.getOwnPropertyDescriptor(s)\`** — единственный способ скопировать объект вместе с геттерами: обычный spread их **вызовет и превратит в обычные значения**.
- Геттеры и сеттеры в классах компилируются ровно в такие дескрипторы на прототипе.

## Что сказать на собеседовании

> Каждое свойство описывается дескриптором двух видов: data — с полями \`value\` и \`writable\`, и accessor — с функциями \`get\` и \`set\`. Общие атрибуты — \`writable\`, \`enumerable\` и \`configurable\`: они определяют, можно ли переприсваивать значение, попадает ли свойство в перебор и JSON и можно ли его удалить. Важная деталь: при обычном присваивании все флаги true, а \`Object.defineProperty\` по умолчанию ставит их в false. Читаются они через \`Object.getOwnPropertyDescriptor\` — единственный корректный способ скопировать объект вместе с аксессорами: обычный spread вызовет геттеры и заменит их значениями.

## Ловушки

- **\`Object.defineProperty\` по умолчанию всё запрещает.** Забыли указать \`writable: true\` — получили свойство только для чтения и долгую отладку.
- **Spread и \`Object.assign\` вызывают геттеры.** Копия получит статичное значение, а не работающий геттер.
- **Изменение непереписываемого свойства проваливается молча** в нестрогом режиме. В модулях и классах (всегда strict) будет TypeError.
- **\`configurable: false\` — билет в один конец.** Обратно поменять нельзя, единственное послабление — \`writable\` можно перевести из \`true\` в \`false\`.
- **Геттер в горячем коде дороже поля**: он не всегда инлайнится движком. В цикле на сотни тысяч итераций это заметно.`,
      en: `## In short

Besides its value, every object property has **three hidden settings** — together they're called the descriptor.

- **\`writable\`** — can the value be changed.
- **\`enumerable\`** — is the property visible when enumerating (\`Object.keys\`, \`for...in\`, spread, \`JSON.stringify\`).
- **\`configurable\`** — can the property be deleted, and can these very settings be changed.

When you write \`obj.a = 1\`, all three flags are automatically \`true\`. With \`Object.defineProperty\` it's the opposite — **all three default to \`false\`**. That's the method's main trap.

## Two kinds of descriptor

- **Data descriptor** — an ordinary property: it has \`value\` and \`writable\`.
- **Accessor descriptor** — instead of a value it has \`get\` and \`set\` functions. From the outside it looks like a normal property, but code runs.

\`\`\`js
const user = { name: 'Ann' };

Object.defineProperty(user, 'role', {
  value: 'admin',
  writable: false,      // can't be changed
  enumerable: false,    // invisible to enumeration
  configurable: false   // can't be deleted
});

Object.keys(user);        // ['name'] — role is hidden
JSON.stringify(user);     // '{"name":"Ann"}'
user.role = 'user';       // TypeError in strict mode, silently nothing otherwise
delete user.role;         // won't work
\`\`\`

## Getters and setters — "smart properties"

They let you compute a value on the fly, validate writes and do lazy initialisation:

\`\`\`js
let temp = 0;

Object.defineProperty(obj, 'celsius', {
  get() { return temp; },
  set(v) {
    if (v < -273) throw new RangeError('too cold');
    temp = v;
  },
  enumerable: true
});
\`\`\`

## Why this matters in practice

- **\`Object.freeze\` is exactly a bulk setting** of \`writable: false\` and \`configurable: false\`.
- **Internal fields are hidden with \`enumerable: false\`** so they don't end up in JSON or get in the way of enumeration.
- **\`Object.getOwnPropertyDescriptor(s)\`** is the only way to copy an object together with its getters: an ordinary spread **calls them and turns them into plain values**.
- Getters and setters in classes compile to exactly these descriptors on the prototype.

## What to say in the interview

> Every property is described by a descriptor. Descriptors come in two kinds: data, with \`value\` and \`writable\`, and accessor, with \`get\` and \`set\` functions. The shared attributes are \`writable\`, \`enumerable\` and \`configurable\`: they control whether the value can be reassigned, whether the property appears in enumeration and JSON, and whether it can be deleted or redefined. An important detail: a plain assignment sets all flags to true, while \`Object.defineProperty\` defaults them to false. Descriptors are what \`Object.freeze\`, hidden internal fields via \`enumerable: false\` and class getters and setters are built on. They're read with \`Object.getOwnPropertyDescriptor\`, which is also the only correct way to copy an object along with its accessors — an ordinary spread invokes the getters and replaces them with values.

## Gotchas

- **\`Object.defineProperty\` forbids everything by default.** Forget \`writable: true\` and you've created a read-only property and a long debugging session.
- **Spread and \`Object.assign\` invoke getters.** The copy gets a static value, not a working getter.
- **Writing to a non-writable property fails silently** in sloppy mode. In modules and classes (always strict) it's a TypeError.
- **\`configurable: false\` is a one-way ticket.** You can't change it back; the only concession is that \`writable\` may go from \`true\` to \`false\`.
- **A getter is more expensive than a field in hot code**: the engine doesn't always inline it. In a loop of hundreds of thousands of iterations that shows.`
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
    category: 'js-state',
    level: 'Expert',
    tags: ['new-operator', 'new-target', 'constructors'],
    question: {
      ru: 'Что именно делает оператор `new` под капотом? Что такое new.target и как реализовать `new` вручную?',
      en: 'What exactly does the `new` operator do under the hood? What is new.target and how do you implement `new` manually?'
    },
    answer: {
      ru: `## Коротко

\`new\` выглядит как магия, но делает всего **четыре простых шага**:

1. Создаёт **новый пустой объект**.
2. Ставит ему прототипом \`Fn.prototype\` — то есть связывает объект с методами конструктора.
3. Вызывает саму функцию \`Fn\`, подставив новый объект как \`this\`.
4. Смотрит, что вернула функция: **вернула объект — отдаём его**, вернула примитив или ничего — **отдаём созданный \`this\`**.

Всё. Это можно написать руками в пять строк:

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);   // шаги 1 и 2
  const result = Ctor.apply(obj, args);        // шаг 3
  return (result !== null && typeof result === 'object')
    ? result                                   // шаг 4
    : obj;
}
\`\`\`

Именно из шага 2 следует, почему методы из \`prototype\` доступны у экземпляра. А из шага 4 — почему фабрика может «подменить» результат конструктора.

## new.target — «а меня вызвали через new?»

Внутри функции \`new.target\` равен самой функции, если её вызвали через \`new\`, и \`undefined\`, если как обычную функцию.

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('User нужно вызывать через new');
  this.name = name;
}

User('Ann');       // Error
new User('Ann');   // ок
\`\`\`

Второе применение: в базовом классе \`new.target\` указывает на **исходный класс цепочки**, а не на текущий. То есть при \`new Admin()\` внутри конструктора \`User\` будет виден именно \`Admin\` — так можно узнать, кого на самом деле создают.

## Что сказать на собеседовании

> Оператор \`new\` выполняет четыре шага: создаёт новый пустой объект, устанавливает его \`[[Prototype]]\` в \`Fn.prototype\`, вызывает функцию с \`this\`, привязанным к этому объекту, и затем смотрит на возвращаемое значение — если вернулся объект, отдаётся он, иначе отдаётся созданный \`this\`. \`new.target\` внутри функции равен конструктору при вызове через \`new\` и \`undefined\` при обычном вызове — это позволяет запретить вызов без \`new\`. Стрелочные функции и методы объектов нельзя вызвать через \`new\` — у них нет внутреннего метода \`[[Construct]]\`, а класс, наоборот, обязан вызываться через \`new\`.

## Ловушки

- **Стрелочную функцию нельзя вызвать через \`new\`** — у неё нет \`[[Construct]]\`, как и у методов, объявленных сокращённым синтаксисом, и у генераторов.
- **Класс обязан вызываться через \`new\`.** \`User()\` без \`new\` — сразу TypeError, в отличие от функции-конструктора.
- **Возврат объекта из конструктора «перебивает» \`this\`.** Это приём для фабрик и синглтонов, но он ломает интуицию и \`instanceof\`.
- **Забыть \`new\` у функции-конструктора** в нестрогом режиме — тихая катастрофа: \`this\` станет глобальным объектом и поля улетят в \`window\`. В strict mode будет понятная ошибка про \`undefined\`.
- \`Reflect.construct(Target, args, newTarget)\` позволяет задать **другой** \`new.target\` — так корректно расширяют встроенные классы вроде \`Error\` и \`Array\`.`,
      en: `## In short

\`new\` looks like magic but performs just **four simple steps**:

1. Creates a **new empty object**.
2. Sets that object's prototype to \`Fn.prototype\` — linking it to the constructor's methods.
3. Calls the function \`Fn\` with the new object as \`this\`.
4. Looks at what the function returned: **an object — hand that back**; a primitive or nothing — **hand back the created \`this\`**.

That's it. You can write it by hand in five lines:

\`\`\`js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);   // steps 1 and 2
  const result = Ctor.apply(obj, args);        // step 3
  return (result !== null && typeof result === 'object')
    ? result                                   // step 4
    : obj;
}
\`\`\`

Step 2 is exactly why prototype methods are available on the instance. And step 4 is why a factory can "substitute" the constructor's result.

## new.target — "was I called with new?"

Inside a function \`new.target\` equals the function itself if it was called with \`new\`, and \`undefined\` if it was called as a plain function.

\`\`\`js
function User(name) {
  if (!new.target) throw new Error('User must be called with new');
  this.name = name;
}

User('Ann');       // Error
new User('Ann');   // ok
\`\`\`

A second use: in a base class, \`new.target\` points at the **original class of the chain**, not the current one. So during \`new Admin()\`, inside \`User\`'s constructor you see \`Admin\` — which tells you what's really being created.

## What to say in the interview

> The \`new\` operator performs four steps: it creates a new empty object, sets its \`[[Prototype]]\` to \`Fn.prototype\`, calls the function with \`this\` bound to that object, and then looks at the return value — if an object was returned it's handed back, otherwise the created \`this\` is. You can implement this by hand with \`Object.create\` and \`apply\`. \`new.target\` inside a function equals the constructor when called with \`new\` and \`undefined\` on a plain call, which lets you forbid calling without \`new\`; in an inheritance chain \`new.target\` points at the original class rather than the current one. Worth remembering separately: arrow functions and object methods can't be called with \`new\` because they have no internal \`[[Construct]]\` method, while a class must be called with \`new\`.

## Gotchas

- **An arrow function can't be called with \`new\`** — it has no \`[[Construct]]\`, and neither do shorthand methods or generators.
- **A class must be called with \`new\`.** \`User()\` without it is an immediate TypeError, unlike a constructor function.
- **Returning an object from a constructor overrides \`this\`.** It's a factory/singleton trick, but it breaks intuition and \`instanceof\`.
- **Forgetting \`new\` on a constructor function** in sloppy mode is a silent disaster: \`this\` becomes the global object and the fields land on \`window\`. In strict mode you get a clear error about \`undefined\`.
- \`Reflect.construct(Target, args, newTarget)\` lets you set a **different** \`new.target\` — that's how built-ins like \`Error\` and \`Array\` are correctly extended.`
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
    category: 'js-state',
    level: 'Hard',
    tags: ['async-iterators', 'for-await-of', 'generators'],
    question: {
      ru: 'Как работают асинхронные итераторы и `for await...of`? Что такое `async function*` и делегирование `yield*`?',
      en: 'How do async iterators and `for await...of` work? What is `async function*` and `yield*` delegation?'
    },
    answer: {
      ru: `## Коротко

Обычный итератор отвечает на \`next()\` **сразу**. Асинхронный отвечает **промисом** — «подожди, сейчас узнаю».

Протокол зеркальный обычному:

- **AsyncIterable** — у объекта есть метод \`[Symbol.asyncIterator]()\`.
- **AsyncIterator** — его \`next()\` возвращает \`Promise<{ value, done }>\`.

Перебирается всё это через **\`for await...of\`** — он сам дожидается каждого промиса.

## Зачем это нужно: потоковая обработка

Классическая задача — постранично выкачать API и обрабатывать данные **по мере поступления**, не копя всё в памяти:

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();       // отдаём страницу, как только готова
  }
}

for await (const page of fetchPages(urls)) {
  console.log(page);        // обрабатываем по одной
}
\`\`\`

\`async function*\` — это генератор, внутри которого можно писать и \`await\`, и \`yield\`. Ровно то, что нужно для пагинации, чтения потоков и построчной обработки файлов.

## yield* — делегирование

\`yield*\` — это «передай управление другому генератору и отдай все его значения наружу»:

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; }   // отдаст 1, 2, 3
\`\`\`

## Важно: это НЕ параллельность

\`for await...of\` обрабатывает значения **строго по одному**. Следующий \`next()\` не вызывается, пока тело цикла не отработало.

Это одновременно и ограничение, и фича: получается естественный **backpressure** — данные не приходят быстрее, чем вы успеваете их обрабатывать. Если же нужна параллельность, берите \`Promise.all\`, а потом перебирайте результат.

## Что сказать на собеседовании

> Асинхронная итерация повторяет обычный протокол, но на промисах: у объекта есть метод \`[Symbol.asyncIterator]()\`, а \`next()\` возвращает промис объекта \`{ value, done }\`. Перебор идёт через \`for await...of\`, дожидаясь каждого промиса по очереди. \`async function*\` создаёт асинхронный генератор, где доступны и \`await\`, и \`yield\` — это основной инструмент для потоковой обработки: пагинации API, чтения ReadableStream. \`for await...of\` — это последовательная обработка, а не параллелизм; зато он даёт backpressure: следующий \`next()\` не вызывается, пока тело цикла не завершилось.

## Ловушки

- **\`for await...of\` в цикле по URL — это водопад запросов.** Если параллельность нужна, это \`Promise.all\`, а не асинхронный генератор.
- **\`break\` вызывает \`return()\` итератора.** Это хорошо — там можно закрыть стрим, — но только если вы написали \`try/finally\` внутри генератора.
- **Обычный итератор промисов тоже работает** в \`for await...of\`: каждое значение будет автоматически заавейчено.
- **Асинхронный генератор нельзя перебрать обычным \`for...of\`** — нужен именно \`for await\`.
- **Ошибка внутри тела цикла прерывает итерацию.** Если нужно продолжать, оборачивайте тело в свой \`try/catch\`.`,
      en: `## In short

A normal iterator answers \`next()\` **immediately**. An async one answers with **a promise** — "hold on, I'll find out".

The protocol mirrors the synchronous one:

- **AsyncIterable** — the object has a \`[Symbol.asyncIterator]()\` method.
- **AsyncIterator** — its \`next()\` returns a \`Promise<{ value, done }>\`.

You iterate it all with **\`for await...of\`**, which awaits each promise for you.

## What it's for: streaming

The classic task is fetching an API page by page and processing data **as it arrives**, without buffering everything in memory:

\`\`\`js
async function* fetchPages(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    yield res.json();       // hand over each page as soon as it's ready
  }
}

for await (const page of fetchPages(urls)) {
  console.log(page);        // process one at a time
}
\`\`\`

\`async function*\` is a generator in which you can write both \`await\` and \`yield\`. Exactly what's needed for pagination, reading streams and processing files line by line.

## yield* — delegation

\`yield*\` means "hand control to another generator and forward all of its values":

\`\`\`js
async function* a() { yield 1; yield 2; }
async function* b() { yield* a(); yield 3; }   // yields 1, 2, 3
\`\`\`

## Important: this is NOT parallelism

\`for await...of\` processes values **strictly one at a time**. The next \`next()\` isn't called until the loop body has finished.

That's both a limitation and a feature: you get natural **backpressure** — data doesn't arrive faster than you can handle it. If you do need parallelism, use \`Promise.all\` and then iterate the result.

## What to say in the interview

> Async iteration repeats the ordinary protocol but over promises: the object has a \`[Symbol.asyncIterator]()\` method and \`next()\` returns a promise of \`{ value, done }\`. You iterate with \`for await...of\`, which awaits each promise in turn. \`async function*\` creates an async generator where both \`await\` and \`yield\` are available — the main tool for streaming: API pagination, reading a ReadableStream, parsing a file line by line. \`yield*\` delegates to another iterable, transparently forwarding its values. It's important to understand that \`for await...of\` is sequential processing, not parallelism; in exchange it gives natural backpressure, because the next \`next()\` isn't called until the loop body completes. Leaving the loop via \`break\` or an exception calls the iterator's \`return()\`, which gives you a place to clean up resources.

## Gotchas

- **\`for await...of\` over a list of URLs is a request waterfall.** If you need parallelism, that's \`Promise.all\`, not an async generator.
- **\`break\` calls the iterator's \`return()\`.** That's good — it's where you close a stream — but only if you wrote a \`try/finally\` inside the generator.
- **A plain iterator of promises works too** in \`for await...of\`: every value is awaited automatically.
- **An async generator can't be iterated with a plain \`for...of\`** — it needs \`for await\`.
- **An error in the loop body aborts the iteration.** If you need to continue, wrap the body in your own \`try/catch\`.`
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
    category: 'js-state',
    level: 'Hard',
    tags: ['promise-combinators', 'all-race-any-allsettled', 'async'],
    question: {
      ru: 'В чём разница между Promise.all, race, any и allSettled? Каковы их семантика и поведение при ошибках?',
      en: 'What is the difference between Promise.all, race, any, and allSettled? Their semantics and error behavior?'
    },
    answer: {
      ru: `## Коротко — четыре комбинатора одной фразой

- **\`Promise.all\`** — «нужны **все**. Если хоть один упал — всё пропало».
- **\`Promise.allSettled\`** — «нужен **отчёт по всем**, кто справился, а кто нет».
- **\`Promise.race\`** — «кто **первым** финишировал — тот и ответ. Даже если он упал».
- **\`Promise.any\`** — «кто первым **успешно** финишировал. Падения игнорируем, пока есть надежда».

## Разбор по одному

**\`Promise.all([...])\`** возвращает массив результатов **в порядке входа**, независимо от того, кто когда завершился. Работает по принципу **fail-fast**: первый же reject мгновенно роняет весь \`all\`.

Когда брать: загрузка данных для страницы, где без любого куска показывать нечего.

**\`Promise.allSettled([...])\`** **никогда не отклоняется**. Ждёт всех и возвращает массив объектов \`{ status: 'fulfilled', value }\` или \`{ status: 'rejected', reason }\`.

Когда брать: массовые операции, где частичный успех нормален — «отправить 100 писем и показать, какие не ушли».

**\`Promise.race([...])\`** завершается тем, что произошло первым — **успехом или ошибкой**. Главное применение — таймауты:

\`\`\`js
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

**\`Promise.any([...])\`** ждёт первый **успешный**. Отклонится только если упали **все** — и тогда придёт \`AggregateError\`, у которого в поле \`.errors\` лежат все причины.

Когда брать: несколько зеркал или CDN — берём тот, что ответил первым удачно.

## Детали, о которых спрашивают

- Все четыре принимают **любой iterable**, не только массив. Не-промисы автоматически оборачиваются в \`Promise.resolve\`.
- **На пустом входе поведение разное**: \`all\` и \`allSettled\` сразу резолвятся пустым массивом, \`any\` отклоняется с \`AggregateError\`, а \`race\` **зависает навсегда**.
- **Отмены нет.** Проигравшие в \`race\` и \`any\` продолжают выполняться — запрос никуда не денется без \`AbortController\`.

## Что сказать на собеседовании

> \`Promise.all\` резолвится массивом результатов в порядке входа и работает fail-fast: первая ошибка отклоняет весь комбинатор, хотя остальные операции продолжают выполняться. \`Promise.allSettled\` никогда не отклоняется, дожидается всех и возвращает массив со статусами fulfilled или rejected. \`Promise.race\` завершается первым осевшим промисом любым исходом, поэтому его используют для таймаутов. \`Promise.any\` ждёт первый успешный и отклоняется только если упали все — с AggregateError. И ни один из комбинаторов не отменяет проигравшие операции — для этого нужен AbortController.

## Ловушки

- **\`Promise.all\` не отменяет остальные запросы.** Один упал — вы получили ошибку, а остальные продолжают грузиться и жечь трафик.
- **В \`Promise.all\` промисы уже запущены** к моменту вызова. Ограничить параллельность им нельзя — для этого нужен пул или библиотека.
- **\`race\` с пустым массивом зависает навсегда** — редкий, но крайне неприятный баг.
- **\`allSettled\` требует ручного разбора**: не забыть отфильтровать rejected и что-то с ними сделать, иначе ошибки просто потеряются.
- **\`any\` — это не \`race\`.** Частая путаница: \`race\` реагирует и на ошибку, \`any\` — только на успех.
- Ошибка внутри \`.then()\` **после** \`all\` уже не относится к комбинатору — она обычная ошибка цепочки.`,
      en: `## In short — the four combinators in one line each

- **\`Promise.all\`** — "I need **all** of them. If even one fails, everything is off."
- **\`Promise.allSettled\`** — "I need a **report on everyone**: who succeeded and who didn't."
- **\`Promise.race\`** — "whoever finishes **first** is the answer. Even if they failed."
- **\`Promise.any\`** — "whoever finishes **successfully** first. Failures are ignored while there's still hope."

## One at a time

**\`Promise.all([...])\`** returns an array of results **in input order**, regardless of who finished when. It's **fail-fast**: the very first rejection immediately rejects the whole thing.

When to use it: loading data for a page where there's nothing to show without any one piece.

**\`Promise.allSettled([...])\`** **never rejects**. It waits for everyone and returns an array of \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\` objects.

When to use it: bulk operations where partial success is fine — "send 100 emails and show which ones failed".

**\`Promise.race([...])\`** settles with whatever happened first — **success or failure**. Its main use is timeouts:

\`\`\`js
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
]);
\`\`\`

**\`Promise.any([...])\`** waits for the first **success**. It rejects only if **all** of them fail — and then you get an \`AggregateError\` whose \`.errors\` field holds every reason.

When to use it: several mirrors or CDNs — take whichever answered successfully first.

## Details they ask about

- All four accept **any iterable**, not just an array. Non-promises are automatically wrapped in \`Promise.resolve\`.
- **Empty input behaves differently**: \`all\` and \`allSettled\` resolve immediately with an empty array, \`any\` rejects with an \`AggregateError\`, and \`race\` **hangs forever**.
- **There's no cancellation.** The losers in \`race\` and \`any\` keep running — a request doesn't go anywhere without an \`AbortController\`.

## What to say in the interview

> \`Promise.all\` resolves with an array of results in input order once every promise fulfils, and it's fail-fast: the first error rejects the whole combinator, although the other operations keep running. \`Promise.allSettled\` never rejects, waits for everyone and returns an array with fulfilled or rejected statuses — the choice for bulk operations where partial success is acceptable. \`Promise.race\` settles with the first settled promise whatever the outcome, which is why it's used for timeouts. \`Promise.any\` waits for the first success and rejects only if all fail, with an AggregateError whose errors field holds every reason. Important details: on empty input \`all\` and \`allSettled\` resolve with an empty array, \`any\` rejects and \`race\` stays pending forever; and none of the combinators cancels the losing operations — that requires an AbortController.

## Gotchas

- **\`Promise.all\` doesn't cancel the other requests.** One fails, you get an error, and the rest keep downloading and burning bandwidth.
- **In \`Promise.all\` the promises are already running** by the time you call it. You can't limit concurrency with it — you need a pool or a library.
- **\`race\` on an empty array hangs forever** — a rare but extremely unpleasant bug.
- **\`allSettled\` requires manual handling**: don't forget to filter the rejected ones and do something with them, or the errors are simply lost.
- **\`any\` is not \`race\`.** A common confusion: \`race\` reacts to failures too, \`any\` only to success.
- An error inside a \`.then()\` **after** \`all\` has nothing to do with the combinator — it's an ordinary chain error.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['error-handling', 'error-cause', 'custom-errors'],
    question: {
      ru: 'Как правильно обрабатывать ошибки в JS? Что такое Error.cause и кастомные классы ошибок?',
      en: 'How do you handle errors properly in JS? What is Error.cause and custom error classes?'
    },
    answer: {
      ru: `## Правило номер один: бросайте Error

Технически \`throw\` умеет бросить что угодно — строку, число, объект. **Но всегда бросайте экземпляр \`Error\`.**

Причина простая: только у \`Error\` есть **\`stack\`** — трассировка, по которой видно, откуда прилетело. Бросили строку — стек потерян, отлаживать нечем, и \`instanceof\` не работает.

## Error.cause — сохранить первопричину

Классическая беда: поймали низкоуровневую ошибку, бросили свою, понятную — и потеряли оригинал. С ES2022 у конструктора \`Error\` есть второй аргумент:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error('Не удалось загрузить пользователя ' + id, { cause: e });
}
\`\`\`

Теперь наверху видно человеческое сообщение, а в \`err.cause\` лежит настоящая причина — для логов и отладки. Цепочка не рвётся.

## Свои классы ошибок

Подкласс \`Error\` даёт две вещи: возможность различать ошибки через \`instanceof\` и место для метаданных.

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

try { /* ... */ }
catch (e) {
  if (e instanceof HttpError && e.status === 404) { /* особая обработка */ }
}
\`\`\`

## Как ловить правильно

- **Ловите узко.** \`catch\` без разбора типа, который просто пишет в консоль, — это способ спрятать баг.
- **Не глотайте молча.** Пустой \`catch {}\` — почти всегда ошибка. Либо обработайте, либо пробросьте дальше с \`cause\`.
- **Асинхронность**: \`try/catch\` прекрасно ловит \`await\`. А вот у промиса без \`await\` нужен \`.catch()\`, иначе получите \`unhandledrejection\`.
- **Не используйте исключения как управление потоком** в горячем коде — создание объекта со стеком дорого.

## Что сказать на собеседовании

> Бросать нужно всегда экземпляр \`Error\` или его подкласса, потому что только у него есть \`stack\`, \`name\` и \`message\`; строки и голые объекты теряют трассировку и ломают проверки через \`instanceof\`. С ES2022 у конструктора есть второй аргумент \`{ cause }\`, который позволяет обернуть низкоуровневую ошибку в более осмысленную, не потеряв первопричину в \`err.cause\`. Свои классы ошибок наследуют от \`Error\`, задают \`name\` и добавляют метаданные вроде HTTP-статуса. В асинхронном коде \`try/catch\` ловит ошибки из \`await\`, а для промисов без \`await\` нужен \`.catch\`, иначе сработает глобальный \`unhandledrejection\`.

## Ловушки

- **В \`catch (e)\` тип \`e\` — это \`any\` по умолчанию.** Флаг \`useUnknownInCatchVariables\` (часть \`strict\`) делает его \`unknown\`, и это правильно: прилететь может что угодно, поэтому проверка \`e instanceof Error\` обязательна.
- **При транспиляции в ES5 наследование от \`Error\` ломается** — \`instanceof\` перестаёт работать. Лечится строкой \`Object.setPrototypeOf(this, new.target.prototype)\` в конструкторе. В нативном ES2015+ не нужно.
- **\`error.cause\` надо явно логировать.** Многие логгеры печатают только верхний уровень, и причина теряется.
- **\`throw\` внутри \`finally\` перебивает исходную ошибку** — она исчезает бесследно.
- **Ошибка в колбэке \`setTimeout\` не ловится внешним \`try/catch\`** — колбэк выполняется уже с чистого стека.`,
      en: `## Rule number one: throw an Error

Technically \`throw\` can throw anything — a string, a number, an object. **But always throw an \`Error\` instance.**

The reason is simple: only an \`Error\` has a **\`stack\`** — the trace that shows where it came from. Throw a string and the stack is gone, there's nothing to debug with, and \`instanceof\` doesn't work.

## Error.cause — keeping the root cause

The classic problem: you catch a low-level error, throw your own readable one, and lose the original. Since ES2022 the \`Error\` constructor takes a second argument:

\`\`\`js
try {
  await fetchUser(id);
} catch (e) {
  throw new Error('Failed to load user ' + id, { cause: e });
}
\`\`\`

Now the top level shows a human message while \`err.cause\` holds the real reason for logs and debugging. The chain isn't broken.

## Your own error classes

Subclassing \`Error\` gives you two things: the ability to distinguish errors with \`instanceof\`, and a place for metadata.

\`\`\`js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

try { /* ... */ }
catch (e) {
  if (e instanceof HttpError && e.status === 404) { /* special handling */ }
}
\`\`\`

## How to catch properly

- **Catch narrowly.** A \`catch\` that doesn't discriminate and just logs to the console is a way of hiding a bug.
- **Don't swallow silently.** An empty \`catch {}\` is almost always a mistake. Either handle it, or rethrow with \`cause\`.
- **Async**: \`try/catch\` catches \`await\` perfectly well. A promise without an \`await\` needs a \`.catch()\`, or you get an \`unhandledrejection\`.
- **Don't use exceptions for control flow** in hot code — building an object with a stack is expensive.

## What to say in the interview

> You should always throw an \`Error\` instance or a subclass, because only it has \`stack\`, \`name\` and \`message\`; strings and bare objects lose the trace and break \`instanceof\` checks. Since ES2022 the constructor takes a second argument \`{ cause }\`, which lets you wrap a low-level error in a more meaningful one without losing the root cause — it stays available in \`err.cause\` for logs. Custom error classes extend \`Error\`, set \`name\` and add metadata such as an HTTP status, which enables typed handling through \`instanceof\`. In asynchronous code \`try/catch\` catches errors from \`await\`, while promises without \`await\` need a \`.catch\`, otherwise the global \`unhandledrejection\` fires. A separate case is \`AggregateError\` from \`Promise.any\`, where all the reasons live in the \`errors\` field.

## Gotchas

- **In \`catch (e)\` the type of \`e\` is \`any\` by default.** The \`useUnknownInCatchVariables\` flag (part of \`strict\`) makes it \`unknown\`, which is right: anything can be thrown, so an \`e instanceof Error\` check is mandatory.
- **Transpiling to ES5 breaks inheritance from \`Error\`** — \`instanceof\` stops working. The fix is \`Object.setPrototypeOf(this, new.target.prototype)\` in the constructor. Not needed in native ES2015+.
- **\`error.cause\` has to be logged explicitly.** Many loggers print only the top level and the cause is lost.
- **A \`throw\` inside \`finally\` overrides the original error** — it vanishes without a trace.
- **An error in a \`setTimeout\` callback isn't caught by an outer \`try/catch\`** — the callback runs from a clean stack.`
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
    category: 'js-state',
    level: 'Hard',
    tags: ['regex', 'named-groups', 'lookbehind'],
    question: {
      ru: 'Какие современные возможности регулярных выражений есть в JS? Объясните именованные группы, lookbehind и проблему состояния флага `g`.',
      en: 'What modern regex features does JS have? Explain named groups, lookbehind, and the `g` flag state problem.'
    },
    answer: {
      ru: `## Что появилось в регулярках за последние годы

- **Именованные группы** — \`(?<year>\\d{4})\`. Вместо \`match[1]\` пишем \`match.groups.year\`, а в замене — \`$<year>\`. Код становится читаемым.
- **Lookbehind** — \`(?<=...)\` и \`(?<!...)\`, то есть «перед этим местом должно (не) быть». Lookahead \`(?=...)\` был всегда, а вот «взгляд назад» появился только в ES2018.
- **Флаг \`s\` (dotAll)** — заставляет \`.\` совпадать в том числе с переводом строки.
- **Флаг \`u\`** — правильная работа с Unicode и суррогатными парами (эмодзи!). Флаг \`v\` — его расширение с операциями над множествами.
- **\`\\p{...}\`** — поиск по свойству символа: \`\\p{L}\` любая буква любого алфавита, \`\\p{Emoji}\`.
- **\`matchAll\`** — итератор по всем совпадениям сразу с группами.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y;   // '2024'
\`\`\`

## Главная ловушка: флаг \`g\` запоминает позицию

Это тот самый вопрос, на котором «плывут». Регулярка с флагом \`g\` (и с \`y\`) — **объект с состоянием**. Она хранит в свойстве \`lastIndex\`, докуда дошла в прошлый раз.

\`\`\`js
const r = /a/g;

r.test('aa');   // true  — нашли на позиции 0, lastIndex стал 1
r.test('aa');   // true  — искали с 1, нашли, lastIndex стал 2
r.test('aa');   // false — искать больше негде, lastIndex сбросился в 0
r.test('aa');   // true снова! — и так по кругу
\`\`\`

Отсюда правило: **не переиспользуйте один \`g\`-регекс для разных строк и проверок.** Либо создавайте новый, либо вручную ставьте \`r.lastIndex = 0\`. А лучше — используйте \`matchAll\` и \`replaceAll\`, которые эту проблему не создают.

Особенно опасно, когда регулярка объявлена как константа модуля и используется в \`test()\` внутри валидатора: часть значений будет проходить проверку через раз.

## Флаг \`y\` (sticky)

Требует совпадения **ровно в позиции \`lastIndex\`**, без поиска дальше по строке. Звучит странно, но это ровно то, что нужно для написания токенизаторов и парсеров: «откусываем» кусок за куском с текущей позиции.

## Что сказать на собеседовании

> Из современных возможностей — именованные группы, доступные через \`match.groups\` и в замене как \`$<name>\`, lookbehind-утверждения из ES2018, флаг \`s\` для точки, совпадающей с переводом строки, флаги \`u\` и \`v\` для Unicode, escape-последовательности \`\\p{...}\` по свойствам символов и метод \`matchAll\`. Главный подводный камень — состояние флага \`g\`: такая регулярка хранит \`lastIndex\` между вызовами \`test\` и \`exec\`, поэтому один и тот же объект, переиспользуемый для разных строк, даёт чередующиеся результаты. Лечится сбросом \`lastIndex\` или переходом на \`matchAll\`.

## Ловушки

- **Регулярка-константа с \`g\` в валидаторе** — классический плавающий баг: каждая вторая проверка проваливается.
- **Без флага \`u\` эмодзи ломаются**: они состоят из суррогатных пар, и \`.\` без \`u\` совпадёт с половиной символа.
- **Lookbehind не поддерживается в старом Safari** — если целевая аудитория включает старые версии, нужен запасной вариант.
- **Catastrophic backtracking**: вложенные квантификаторы вроде \`(a+)+b\` на длинной строке вешают поток намертво. Это реальная уязвимость ReDoS, а не теория.
- **Регулярки — не парсер.** Разбирать ими HTML, JSON или вложенные скобки нельзя: они не умеют считать вложенность.`,
      en: `## What regexes have gained in recent years

- **Named groups** — \`(?<year>\\d{4})\`. Instead of \`match[1]\` you write \`match.groups.year\`, and \`$<year>\` in replacements. The code becomes readable.
- **Lookbehind** — \`(?<=...)\` and \`(?<!...)\`, i.e. "this place must (not) be preceded by". Lookahead \`(?=...)\` has always existed; "looking back" only arrived in ES2018.
- **The \`s\` (dotAll) flag** — makes \`.\` match newlines as well.
- **The \`u\` flag** — correct handling of Unicode and surrogate pairs (emoji!). The \`v\` flag extends it with set operations.
- **\`\\p{...}\`** — matching by character property: \`\\p{L}\` is any letter in any alphabet, \`\\p{Emoji}\`.
- **\`matchAll\`** — an iterator over all matches, complete with groups.

\`\`\`js
const re = /(?<y>\\d{4})-(?<m>\\d{2})/;
const { groups } = '2024-06'.match(re);
groups.y;   // '2024'
\`\`\`

## The big trap: the \`g\` flag remembers its position

This is the question people flounder on. A regex with the \`g\` flag (and with \`y\`) is a **stateful object**. It stores in \`lastIndex\` how far it got last time.

\`\`\`js
const r = /a/g;

r.test('aa');   // true  — found at position 0, lastIndex became 1
r.test('aa');   // true  — searched from 1, found, lastIndex became 2
r.test('aa');   // false — nowhere left to search, lastIndex reset to 0
r.test('aa');   // true again! — and round it goes
\`\`\`

Hence the rule: **don't reuse one \`g\`-flagged regex across different strings and checks.** Either create a new one, or set \`r.lastIndex = 0\` manually. Better still, use \`matchAll\` and \`replaceAll\`, which don't have this problem.

It's especially dangerous when the regex is a module-level constant used in \`test()\` inside a validator: some values will pass the check every other time.

## The \`y\` (sticky) flag

It requires a match **exactly at \`lastIndex\`**, with no scanning further along the string. That sounds odd, but it's exactly what you want for writing tokenizers and parsers: biting off one chunk at a time from the current position.

## What to say in the interview

> Among the modern features worth naming are named groups, accessible through \`match.groups\` and as \`$<name>\` in replacements; lookbehind assertions, added in ES2018; the \`s\` flag making the dot match newlines; the \`u\` and \`v\` flags for correct Unicode handling; \`\\p{...}\` escapes by character property; and the \`matchAll\` method. The main pitfall is the state of the \`g\` flag: such a regex keeps \`lastIndex\` between \`test\` and \`exec\` calls, so reusing one object across different strings gives alternating results. The fix is to create a new regex, reset \`lastIndex\` manually, or switch to \`matchAll\` and \`replaceAll\`. The \`y\` flag requires a match strictly at \`lastIndex\` and is handy for tokenizers.

## Gotchas

- **A \`g\`-flagged constant regex in a validator** is the classic flaky bug: every second check fails.
- **Without the \`u\` flag emoji break**: they're made of surrogate pairs, and a bare \`.\` matches half a character.
- **Lookbehind isn't supported in older Safari** — if your audience includes old versions, you need a fallback.
- **Catastrophic backtracking**: nested quantifiers like \`(a+)+b\` on a long string lock the thread solid. That's a real ReDoS vulnerability, not theory.
- **A regex is not a parser.** You can't use one to parse HTML, JSON or nested brackets: they can't count nesting.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['tagged-templates', 'template-literals', 'dsl'],
    question: {
      ru: 'Что такое теговые шаблонные литералы (tagged templates)? Как они устроены и где применяются?',
      en: 'What are tagged template literals? How do they work and where are they used?'
    },
    answer: {
      ru: `## Коротко

Обычный шаблонный литерал сам склеивает строку. **Теговый — отдаёт куски вам, и вы решаете, что с ними делать.**

Пишется просто: перед обратными кавычками ставится имя функции — \`myTag\`текст \${значение}\`\`. Скобок нет, но функция вызывается.

## Что получает функция-тег

Два вида аргументов:

1. **Массив статических кусков** — всё, что было написано руками между подстановками.
2. **Все подставленные значения** — остальными аргументами.

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Привет, ', '!']
  // values:  ['Аня']
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');
}

tag\`Привет, \${'Аня'}!\`;   // 'Привет, Аня!'
\`\`\`

Ключевой момент: **функция чётко видит границу между тем, что написал разработчик, и тем, что пришло извне.** Отсюда и все применения.

И ещё: тег **не обязан возвращать строку** — может вернуть объект, DOM-узел, что угодно.

## Где применяется

**1. Защита от инъекций.** Раз тег знает, какие куски пользовательские, он может их экранировать:

\`\`\`js
const escape = (s) => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function html(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (i < values.length ? escape(values[i]) : ''), '');
}

html\`<p>\${userInput}</p>\`;   // скрипт из userInput будет экранирован
\`\`\`

Та же идея — в SQL-билдерах: статика идёт как есть, подстановки уходят параметрами запроса.

**2. DSL и библиотеки.** \`styled.div\`...\`\` в CSS-in-JS, \`gql\`...\`\` в GraphQL — всё это теговые шаблоны, которые парсят содержимое.

**3. i18n** — тег извлекает ключ и подставляет перевод.

**4. \`String.raw\`** — встроенный тег, который возвращает строку **без обработки escape-последовательностей**. Удобно для путей Windows и регулярок:

\`\`\`js
String.raw\`C:\\path\\to\`;   // 'C:\\path\\to' — бэкслеши сохранены
\`\`\`

## Что сказать на собеседовании

> Теговый шаблонный литерал — это вызов функции без скобок: имя стоит прямо перед шаблоном. Движок разбивает литерал на массив статических строк со свойством \`raw\` с необработанными escape-последовательностями и передаёт подставленные выражения остальными аргументами. Инвариант — статических кусков всегда на один больше, чем значений. Главное — функция видит границу между статическим кодом и подставленными данными, поэтому их используют для безопасной интерполяции — экранирования HTML и параметризации SQL — и для DSL вроде styled-components и gql.

## Ловушки

- **\`strings.length\` всегда на единицу больше \`values.length\`** — даже если подстановка стоит в самом начале или конце, там будет пустая строка.
- **Массив \`strings\` кешируется** для конкретного места в коде: при повторных вызовах приходит **тот же объект**. Это позволяет использовать его как ключ кеша — так делает большинство DSL-библиотек.
- **\`String.raw\` не «выключает» подстановки**: \`\${...}\` по-прежнему работает, не обрабатываются только escape-последовательности.
- **Пробел между тегом и кавычками недопустим** — иначе это будет просто ссылка на функцию и отдельный шаблон.
- Экранирование в теге — **не серебряная пуля**: контекст важен, экранирование для HTML-текста и для атрибута или URL отличается.`,
      en: `## In short

An ordinary template literal glues the string together itself. **A tagged one hands you the pieces and lets you decide what to do with them.**

The syntax is simple: put a function name before the backticks — \`myTag\`text \${value}\`\`. There are no parentheses, but the function is called.

## What the tag function receives

Two kinds of argument:

1. **An array of the static chunks** — everything written by hand between the interpolations.
2. **All the interpolated values** — as the remaining arguments.

\`\`\`js
function tag(strings, ...values) {
  // strings: ['Hello, ', '!']
  // values:  ['Ann']
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');
}

tag\`Hello, \${'Ann'}!\`;   // 'Hello, Ann!'
\`\`\`

The key point: **the function clearly sees the boundary between what the developer wrote and what came from outside.** Every use case follows from that.

And note: the tag **doesn't have to return a string** — it can return an object, a DOM node, anything.

## Where it's used

**1. Injection protection.** Since the tag knows which chunks are user-supplied, it can escape them:

\`\`\`js
const escape = (s) => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function html(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (i < values.length ? escape(values[i]) : ''), '');
}

html\`<p>\${userInput}</p>\`;   // any script in userInput gets escaped
\`\`\`

The same idea powers SQL builders: static text goes through as-is while interpolations become query parameters.

**2. DSLs and libraries.** \`styled.div\`...\`\` in CSS-in-JS and \`gql\`...\`\` in GraphQL are tagged templates that parse their contents.

**3. i18n** — the tag extracts a key and substitutes the translation.

**4. \`String.raw\`** — a built-in tag that returns the string **without processing escape sequences**. Handy for Windows paths and regexes:

\`\`\`js
String.raw\`C:\\path\\to\`;   // 'C:\\path\\to' — backslashes preserved
\`\`\`

## What to say in the interview

> A tagged template literal is a function call written without parentheses: the function name sits directly before the template. The engine splits the literal into an array of static strings — which also carries a \`raw\` property with unprocessed escape sequences — and passes the interpolated expressions as the remaining arguments. The invariant is that there's always one more static chunk than there are values. The key property is that the function sees the boundary between static code and interpolated data, which is why tagged templates are used for safe interpolation — HTML escaping and SQL parameterisation — as well as for DSLs like styled-components and gql, for i18n, and as the built-in \`String.raw\`. The tag doesn't have to return a string and has full control over assembling the result.

## Gotchas

- **\`strings.length\` is always one more than \`values.length\`** — even when an interpolation sits at the very start or end, there's an empty string there.
- **The \`strings\` array is cached** per source location: repeated calls receive **the same object**. That makes it usable as a cache key — which is what most DSL libraries do.
- **\`String.raw\` doesn't disable interpolation**: \`\${...}\` still works; only escape sequences are left unprocessed.
- **No space is allowed between the tag and the backtick** — otherwise it's just a function reference followed by a separate template.
- Escaping inside a tag is **not a silver bullet**: context matters, and escaping for HTML text differs from escaping for an attribute or a URL.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['optional-chaining', 'nullish-coalescing', 'short-circuit'],
    question: {
      ru: 'Какие тонкости у опциональной цепочки `?.` и оператора `??`? Чем `??` отличается от `||` и как они короткозамыкаются?',
      en: 'What are the subtleties of optional chaining `?.` and `??`? How does `??` differ from `||` and how do they short-circuit?'
    },
    answer: {
      ru: `## Коротко

- **\`?.\`** — «если слева \`null\` или \`undefined\`, не падай, верни \`undefined\`».
- **\`??\`** — «подставь значение по умолчанию, но **только** если слева \`null\` или \`undefined\`».

Ключевое слово в обоих случаях — **nullish**, то есть ровно два значения: \`null\` и \`undefined\`. Ни \`0\`, ни \`''\`, ни \`false\` сюда не входят. В этом вся разница с \`||\`.

## ?? против || — главный вопрос

\`||\` срабатывает на **любое falsy**, и это регулярно ломает настройки:

\`\`\`js
const config = { retries: 0, name: '' };

config.retries || 3;      // 3  — БАГ: ноль был осмысленным значением
config.retries ?? 3;      // 0  — правильно

config.name || 'guest';   // 'guest' — затёрли пустую строку
config.name ?? 'guest';   // ''      — правильно
\`\`\`

Правило: **если \`0\`, \`''\` или \`false\` — валидные значения, используйте \`??\`.** А \`||\` оставьте для случаев вида «любое пустое значение считаем отсутствующим».

## Короткое замыкание у ?.

Если левая часть nullish, **вся оставшаяся цепочка не выполняется вообще** — включая аргументы вызовов:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;

obj?.method(fn());   // fn() НЕ вызвана, calls остался 0
\`\`\`

Формы записи: \`a?.b\` (свойство), \`a?.[key]\` (динамический ключ), \`a?.()\` (вызов функции, которой может не быть).

## Логические присваивания

\`??=\`, \`||=\`, \`&&=\` — присваивают только при выполнении условия, и тоже с коротким замыканием:

\`\`\`js
opts.timeout ??= 5000;   // присвоит, только если было null/undefined
\`\`\`

## Что сказать на собеседовании

> Опциональная цепочка \`?.\` возвращает \`undefined\`, если левая часть \`null\` или \`undefined\`, и работает в трёх формах: свойство, вычисляемый ключ и вызов функции. Она короткозамкнутая: если слева nullish, остальная часть цепочки не вычисляется, включая аргументы вызовов. Оператор \`??\` возвращает правую часть только при nullish слева, в отличие от \`||\`, срабатывающего на любое falsy — поэтому именно \`??\` корректен для дефолтов, когда ноль, пустая строка или false — валидные данные. Смешивать \`??\` с \`||\` и \`&&\` без скобок нельзя — это синтаксическая ошибка.

## Ловушки

- **\`a || b ?? c\` — синтаксическая ошибка.** Обязательны скобки: \`(a || b) ?? c\`. Сделано намеренно, чтобы никто не гадал о приоритете.
- **\`a?.b.c\` защищает только от nullish \`a\`.** Если nullish окажется \`a.b\`, всё равно упадёт — нужно \`a?.b?.c\`.
- **\`?.\` не спасает от \`0\` и \`''\` слева** — они не nullish, а обращение к свойству числа или строки в JS законно через автобоксинг.
- **Не ставьте \`?.\` везде подряд.** Лишний \`?.\` там, где значение обязано существовать, прячет настоящий баг: вместо явной ошибки вы получите тихий \`undefined\` и падение через три экрана кода.
- **\`delete a?.b\`** ничего не делает, если \`a\` nullish, — не ошибка, просто no-op.`,
      en: `## In short

- **\`?.\`** — "if the left side is \`null\` or \`undefined\`, don't crash, just give me \`undefined\`".
- **\`??\`** — "substitute a default value, but **only** if the left side is \`null\` or \`undefined\`".

The key word in both is **nullish**, meaning exactly two values: \`null\` and \`undefined\`. Not \`0\`, not \`''\`, not \`false\`. That's the whole difference from \`||\`.

## ?? versus || — the main question

\`||\` fires on **any falsy** value, and that regularly breaks configuration:

\`\`\`js
const config = { retries: 0, name: '' };

config.retries || 3;      // 3  — BUG: zero was a meaningful value
config.retries ?? 3;      // 0  — correct

config.name || 'guest';   // 'guest' — the empty string got overwritten
config.name ?? 'guest';   // ''      — correct
\`\`\`

The rule: **if \`0\`, \`''\` or \`false\` are valid values, use \`??\`.** Leave \`||\` for cases where "any empty value counts as missing".

## Short-circuiting in ?.

If the left side is nullish, **the rest of the chain isn't evaluated at all** — including call arguments:

\`\`\`js
let calls = 0;
const fn = () => calls++;
const obj = null;

obj?.method(fn());   // fn() is NOT called, calls stays 0
\`\`\`

The forms are: \`a?.b\` (property), \`a?.[key]\` (computed key) and \`a?.()\` (calling a function that might not exist).

## Logical assignments

\`??=\`, \`||=\` and \`&&=\` assign only when the condition holds, with the same short-circuiting:

\`\`\`js
opts.timeout ??= 5000;   // assigns only if it was null/undefined
\`\`\`

## What to say in the interview

> Optional chaining \`?.\` returns \`undefined\` when the left side is \`null\` or \`undefined\`, and comes in three forms: property access, computed-key access and a function call. It short-circuits: if the left side is nullish, the remainder of the chain isn't evaluated at all, including call arguments. The \`??\` operator returns the right-hand side only on a nullish left side, unlike \`||\`, which fires on any falsy value — which is why \`??\` is the correct one for defaults when zero, an empty string or false are valid data. Mixing \`??\` with \`||\` and \`&&\` without parentheses is a syntax error, introduced deliberately so nobody has to guess the precedence. There are also the logical assignments \`??=\`, \`||=\` and \`&&=\` with the same short-circuiting.

## Gotchas

- **\`a || b ?? c\` is a syntax error.** Parentheses are required: \`(a || b) ?? c\`. Deliberate, so nobody guesses at precedence.
- **\`a?.b.c\` only protects against a nullish \`a\`.** If \`a.b\` turns out nullish it still throws — you need \`a?.b?.c\`.
- **\`?.\` doesn't save you from \`0\` or \`''\` on the left** — they aren't nullish, and accessing a property on a number or string is legal in JS via autoboxing.
- **Don't sprinkle \`?.\` everywhere.** A superfluous \`?.\` where the value must exist hides a real bug: instead of an explicit error you get a silent \`undefined\` and a crash three screens later.
- **\`delete a?.b\`** does nothing when \`a\` is nullish — not an error, just a no-op.`
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
    category: 'js-state',
    level: 'Medium',
    tags: ['intl', 'i18n', 'formatting'],
    question: {
      ru: 'Что такое Intl API и зачем оно нужно? Приведите примеры форматирования чисел, дат и сравнения строк.',
      en: 'What is the Intl API and why use it? Give examples of number/date formatting and string comparison.'
    },
    answer: {
      ru: `## Коротко

**\`Intl\` — это встроенное в браузер решение всех задач локализации форматов.** Не переводы текстов, а именно форматы: числа, валюты, даты, «2 дня назад», склонения, правильная сортировка.

Главный плюс — **данные уже в браузере** (база ICU). Ничего не нужно тащить в бандл, в отличие от moment.js и подобных.

## Числа и валюта

\`\`\`js
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
  .format(1234.5);            // '1.234,50 €'

new Intl.NumberFormat('en-US', { notation: 'compact' })
  .format(1500000);           // '1.5M'
\`\`\`

Обратите внимание: в немецком разделители **противоположны** английскому. Руками такое не написать.

## Даты

\`\`\`js
new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
  .format(new Date());        // '29 июня 2026 г., 14:30'
\`\`\`

## Что ещё есть

- **\`Intl.RelativeTimeFormat\`** — «2 дня назад», «через 3 часа», и на всех языках сразу.
- **\`Intl.PluralRules\`** — правильные формы множественного числа. Для русского это критично: 1 файл / 2 файл**а** / 5 файл**ов**. Самописный \`if\` тут почти всегда ошибается.
- **\`Intl.ListFormat\`** — «A, B и C» с правильным союзом.
- **\`Intl.Collator\`** — сортировка по правилам языка.

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare);
// ['a', 'ä', 'z'] — а обычный sort поставил бы 'ä' после 'z'
\`\`\`

## Главное правило производительности

**Создание форматтера — дорогая операция.** Создавайте один раз и переиспользуйте:

\`\`\`js
// плохо: новый форматтер на каждую строку таблицы
rows.map(r => new Intl.NumberFormat('en-US').format(r.total));

// хорошо
const nf = new Intl.NumberFormat('en-US');
rows.map(r => nf.format(r.total));
\`\`\`

## Что сказать на собеседовании

> \`Intl\` — встроенное API интернационализации, покрывающее форматирование чисел и валют, дат, множественного числа и локале-зависимое сравнение строк. Оно использует встроенную в браузер и Node базу ICU, поэтому не увеличивает бандл. Особенно важны \`Intl.PluralRules\` для языков со сложными правилами множественного числа вроде русского и \`Intl.Collator\` для корректной сортировки — обычный \`sort\` сравнивает по кодам символов и ставит диакритику после \`z\`. Ключевая практическая деталь — создание форматтера дорогое, поэтому инстансы нужно кешировать и переиспользовать.

## Ловушки

- **Форматтер в цикле или в рендере** — самая частая ошибка производительности с этим API.
- **\`toLocaleString()\` без опций даёт разный результат** на разных машинах, потому что берёт локаль системы. Для стабильности локаль указывают явно.
- **Часовой пояс по умолчанию — системный.** Для дат с сервера почти всегда нужно явно задавать \`timeZone\`, иначе у пользователей в разных поясах будут разные даты.
- **\`Intl\` не переводит слова.** «Загрузка...» он не переведёт — это задача i18n-библиотеки, \`Intl\` отвечает только за форматы.
- **Результаты форматирования не стабильны между версиями браузеров** — например, тип пробела перед знаком валюты менялся. Сравнивать отформатированные строки в тестах — плохая идея.`,
      en: `## In short

**\`Intl\` is the browser's built-in solution to every localisation-of-formats problem.** Not translating text — specifically formats: numbers, currency, dates, "2 days ago", plurals, correct sorting.

The big win is that **the data is already in the browser** (the ICU database). Nothing needs to go into your bundle, unlike moment.js and friends.

## Numbers and currency

\`\`\`js
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
  .format(1234.5);            // '1.234,50 €'

new Intl.NumberFormat('en-US', { notation: 'compact' })
  .format(1500000);           // '1.5M'
\`\`\`

Note that German uses the **opposite** separators to English. You wouldn't write that by hand.

## Dates

\`\`\`js
new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' })
  .format(new Date());        // '29 June 2026 at 14:30'
\`\`\`

## What else is there

- **\`Intl.RelativeTimeFormat\`** — "2 days ago", "in 3 hours", in every language at once.
- **\`Intl.PluralRules\`** — correct plural forms. Crucial for languages like Russian and Polish, where there are three or more forms. A hand-rolled \`if\` almost always gets it wrong.
- **\`Intl.ListFormat\`** — "A, B and C" with the right conjunction.
- **\`Intl.Collator\`** — sorting by the language's rules.

\`\`\`js
['z', 'ä', 'a'].sort(new Intl.Collator('de').compare);
// ['a', 'ä', 'z'] — a plain sort would put 'ä' after 'z'
\`\`\`

## The main performance rule

**Creating a formatter is expensive.** Create it once and reuse it:

\`\`\`js
// bad: a new formatter for every table row
rows.map(r => new Intl.NumberFormat('en-US').format(r.total));

// good
const nf = new Intl.NumberFormat('en-US');
rows.map(r => nf.format(r.total));
\`\`\`

## What to say in the interview

> \`Intl\` is the built-in internationalisation API covering number and currency formatting, dates and times, relative time, plural rules, lists and locale-aware string comparison. It uses the ICU database built into the browser and Node, so unlike third-party libraries it doesn't grow the bundle. Particularly important are \`Intl.PluralRules\` for languages with complex plural rules and \`Intl.Collator\` for correct sorting — a plain \`sort\` compares by character code and puts diacritics after \`z\`. The key practical detail is that creating a formatter is expensive, so instances should be cached and reused rather than created inside a render or a loop.

## Gotchas

- **A formatter created in a loop or a render** is the most common performance mistake with this API.
- **\`toLocaleString()\` without options gives different results** on different machines, because it takes the system locale. For stability, state the locale explicitly.
- **The default time zone is the system one.** For dates coming from a server you almost always need an explicit \`timeZone\`, or users in different zones see different dates.
- **\`Intl\` doesn't translate words.** It won't turn "Loading…" into another language — that's an i18n library's job; \`Intl\` only handles formats.
- **Formatting output isn't stable across browser versions** — the kind of space before a currency sign has changed, for instance. Comparing formatted strings in tests is a bad idea.`
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
    category: 'typescript',
    level: 'Hard',
    tags: ['assertion-functions', 'type-guards', 'narrowing'],
    question: {
      ru: 'В чём разница между type guard `x is T` и assertion-функцией `asserts x is T` в TypeScript? Когда что использовать?',
      en: 'What is the difference between a type guard `x is T` and an assertion function `asserts x is T` in TypeScript? When to use which?'
    },
    answer: {
      ru: `## Коротко

Оба инструмента сужают тип, но по-разному отвечают на вопрос **«а что если нет?»**.

- **Type guard \`x is T\`** — возвращает \`true\`/\`false\`. «Не подошло» — нормальная ситуация, идём в \`else\`.
- **Assertion \`asserts x is T\`** — ничего не возвращает, а **бросает исключение**. «Не подошло» — это баг, дальше идти нельзя.

## Type guard — для развилки

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

if (isString(val)) {
  val.toUpperCase();   // val: string
} else {
  // здесь тоже что-то делаем — это нормальный сценарий
}
\`\`\`

Сужение действует **только внутри ветки**. Идеально для \`if\`, \`filter\`, \`switch\`.

## Assertion — для инварианта

\`\`\`ts
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('ожидалась строка');
}

assertString(val);
val.toUpperCase();   // val: string — и так до конца функции
\`\`\`

Никакого \`if\` не нужно: после вызова компилятор считает тип гарантированным **для всего кода ниже**. Если условие не выполнилось — программа просто не дойдёт до следующей строки.

Есть и упрощённая форма без \`is T\` — \`asserts cond\`. Она сужает по самому условию:

\`\`\`ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(user !== null, 'пользователь обязателен');
user.name;   // null уже исключён
\`\`\`

## Как выбрать

Спросите себя: **«если проверка не прошла — это нормальный ход событий или поломка?»**

- Нормальный ход (данные бывают разные, надо обработать оба случая) → **type guard**.
- Поломка (так быть не должно, дальше код на это полагается) → **assertion**.

## Что сказать на собеседовании

> Type guard — это функция с типом возврата \`arg is T\`, возвращающая boolean; при \`true\` компилятор сужает тип аргумента внутри соответствующей ветки. Assertion-функция с типом возврата \`asserts x is T\` ничего не возвращает и бросает исключение при несоответствии; после её вызова тип сужен для всего последующего кода. Guard используют, когда обе ветки валидны, а assertion — когда несоответствие означает баг. TypeScript не проверяет тело ни предиката, ни ассерта — он доверяет объявленной сигнатуре, поэтому неверная реализация даёт ложное сужение и unsound-типизацию.

## Ловушки

- **Компилятор верит вам на слово.** \`function isCat(x: unknown): x is Cat { return true; }\` скомпилируется без единого замечания и обрушит приложение в рантайме.
- **Для assertion-функции обязательна явная аннотация типа.** Если написать \`const assert = (c: unknown) => { ... }\`, TypeScript не выведет \`asserts\` сам — сужения не будет.
- **Assertion не работает с методами объекта** в некоторых позициях — компилятор требует, чтобы это была отдельная функция или явно типизированное свойство.
- **Не злоупотребляйте assertion в бизнес-логике.** Исключение — это остановка сценария; для ожидаемых «плохих» данных лучше guard и явная обработка.
- В TS 5.5 простые предикаты **выводятся автоматически** — например, \`arr.filter(x => x != null)\` теперь корректно убирает \`null\` из типа без ручного guard.`,
      en: `## In short

Both tools narrow a type, but they answer the question **"what if it isn't?"** differently.

- **A type guard \`x is T\`** returns \`true\`/\`false\`. "Doesn't match" is a normal situation — we go to the \`else\`.
- **An assertion \`asserts x is T\`** returns nothing and **throws**. "Doesn't match" is a bug and we can't continue.

## Type guard — for a fork in the road

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

if (isString(val)) {
  val.toUpperCase();   // val: string
} else {
  // we do something here too — this is a normal scenario
}
\`\`\`

The narrowing applies **only inside the branch**. Perfect for \`if\`, \`filter\` and \`switch\`.

## Assertion — for an invariant

\`\`\`ts
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('expected a string');
}

assertString(val);
val.toUpperCase();   // val: string — and stays so to the end of the function
\`\`\`

No \`if\` needed: after the call the compiler treats the type as guaranteed **for all the code below**. If the condition failed, execution never reaches the next line.

There's also a simpler form without \`is T\` — \`asserts cond\` — which narrows by the condition itself:

\`\`\`ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(user !== null, 'user is required');
user.name;   // null is already ruled out
\`\`\`

## How to choose

Ask yourself: **"if the check fails, is that a normal course of events or a breakage?"**

- A normal course (data varies, both cases must be handled) → **type guard**.
- A breakage (this shouldn't happen and the code below depends on it) → **assertion**.

## What to say in the interview

> A type guard is a function with the return type \`arg is T\` returning a boolean; on \`true\` the compiler narrows the argument inside the corresponding branch. An assertion function has the return type \`asserts x is T\` or \`asserts cond\`, returns nothing and throws when the condition fails; after the call the type is considered narrowed for all subsequent code, with no nested \`if\`. Choosing between them is a matter of semantics: a guard is for when both branches are valid and must be handled differently, an assertion is for when a type mismatch means a bug and execution must not continue. One important shared property: TypeScript checks the body of neither the predicate nor the assertion — it fully trusts the declared signature, so a wrong implementation produces false narrowing and unsound typing.

## Gotchas

- **The compiler takes your word for it.** \`function isCat(x: unknown): x is Cat { return true; }\` compiles without a murmur and crashes the app at runtime.
- **An assertion function requires an explicit type annotation.** Write \`const assert = (c: unknown) => { ... }\` and TypeScript won't infer \`asserts\` — there'll be no narrowing.
- **Assertions don't work on object methods** in some positions — the compiler requires a standalone function or an explicitly typed property.
- **Don't overuse assertions in business logic.** An exception stops the scenario; for expected "bad" data a guard with explicit handling is better.
- In TS 5.5 simple predicates are **inferred automatically** — \`arr.filter(x => x != null)\` now correctly removes \`null\` from the type without a hand-written guard.`
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
    category: 'typescript',
    level: 'Expert',
    tags: ['distributive-conditional-types', 'never', 'union'],
    question: {
      ru: 'Что такое дистрибутивные условные типы в TypeScript? Как работает распределение по объединению и как его отключить?',
      en: 'What are distributive conditional types in TypeScript? How does distribution over a union work and how do you disable it?'
    },
    answer: {
      ru: `## Коротко

Когда в условный тип подставляют **union**, TypeScript ведёт себя неожиданно: он **не проверяет весь union целиком**, а прогоняет условие **по каждому члену отдельно** и склеивает результаты обратно в union.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;

type R = ToArray<string | number>;
// шаг 1: ToArray<string> | ToArray<number>
// шаг 2: string[] | number[]
// а НЕ (string | number)[] — вот это и удивляет
\`\`\`

Условие для срабатывания одно: слева от \`extends\` стоит **«голый» параметр типа** \`T\` — сам по себе, без обёрток.

## Зачем это вообще нужно

На дистрибутивности построена вся фильтрация union. Смотрите, как устроен \`Exclude\`:

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;

Exclude<'a' | 'b' | 'c', 'b'>
// 'a' -> 'a', 'b' -> never, 'c' -> 'c'
// = 'a' | never | 'c'
// = 'a' | 'c'   — never в union просто исчезает
\`\`\`

Два механизма вместе: распределение по членам + свойство \`never\` растворяться в union. Так же работают \`Extract\` и \`NonNullable\`.

## Особый случай: never на входе

\`never\` — это **пустой union**. Распределять не по чему, поэтому результат тоже \`never\`, а не ветка \`false\`:

\`\`\`ts
type Filtered = ToArray<never>;   // never, а не never[]
\`\`\`

Это регулярно ставит в тупик.

## Как выключить распределение

Обернуть **обе** стороны в кортеж — тогда \`T\` перестаёт быть голым, и union проверяется целиком:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;   // true — без скобок было бы never

type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>;   // 'no' — union проверен как единое целое
\`\`\`

## Что сказать на собеседовании

> Условный тип распределяется по union, если проверяемый тип — голый параметр типа. TypeScript применяет условие к каждому члену объединения отдельно и объединяет результаты, поэтому \`ToArray<string | number>\` даёт \`string[] | number[]\`, а не \`(string | number)[]\`. На этом механизме построены \`Exclude\`, \`Extract\` и \`NonNullable\` — отброшенные члены схлопываются в \`never\`. \`never\` — это пустой union, поэтому дистрибутивный условный тип на нём возвращает \`never\`, а не ветку else. Отключается распределение оборачиванием обеих сторон \`extends\` в кортеж — классический пример это \`IsNever\`.

## Ловушки

- **\`boolean\` — это \`true | false\`**, то есть тоже union. Поэтому \`T extends true ? A : B\` на \`boolean\` даст \`A | B\`, а не одну ветку.
- **\`any\` уходит в обе ветки сразу**: \`any extends string ? 'y' : 'n'\` — это \`'y' | 'n'\`.
- **\`Omit\` не дистрибутивен**, и поэтому разрушает дискриминируемые union. Нужен свой хелпер: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **Оборачивать надо обе стороны.** \`[T] extends never\` не сработает — нужно именно \`[T] extends [never]\`.
- \`T extends any ? ... : ...\` часто пишут **не ради условия, а именно ради распределения** — ветка else там просто недостижима.`,
      en: `## In short

When a **union** is substituted into a conditional type, TypeScript does something unexpected: it **doesn't check the union as a whole**, it runs the condition **over each member separately** and glues the results back into a union.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;

type R = ToArray<string | number>;
// step 1: ToArray<string> | ToArray<number>
// step 2: string[] | number[]
// NOT (string | number)[] — this is the surprising part
\`\`\`

There's one condition for it to happen: the left side of \`extends\` must be a **naked type parameter** \`T\` — on its own, with no wrapper.

## Why this matters at all

All union filtering is built on distributivity. Look at how \`Exclude\` works:

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;

Exclude<'a' | 'b' | 'c', 'b'>
// 'a' -> 'a', 'b' -> never, 'c' -> 'c'
// = 'a' | never | 'c'
// = 'a' | 'c'   — never simply vanishes from a union
\`\`\`

Two mechanisms together: distribution over members, plus \`never\`'s habit of dissolving in a union. \`Extract\` and \`NonNullable\` work the same way.

## The special case: never as input

\`never\` is the **empty union**. There's nothing to distribute over, so the result is \`never\` too, not the false branch:

\`\`\`ts
type Filtered = ToArray<never>;   // never, not never[]
\`\`\`

This trips people up regularly.

## How to switch distribution off

Wrap **both** sides in a tuple — then \`T\` is no longer naked and the union is checked as a whole:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
IsNever<never>;   // true — without the brackets it would be never

type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
NoDistribute<string | number>;   // 'no' — the union checked as one unit
\`\`\`

## What to say in the interview

> A conditional type distributes over a union when the checked type is a naked type parameter. TypeScript applies the condition to each union member separately and unions the results, so \`ToArray<string | number>\` gives \`string[] | number[]\` rather than \`(string | number)[]\`. That mechanism, together with \`never\` disappearing from unions, is what \`Exclude\`, \`Extract\` and \`NonNullable\` are built on — discarded members collapse into \`never\`. Separately you have to remember that \`never\` is the empty union, so a distributive conditional over it returns \`never\` rather than the else branch. Distribution is switched off by wrapping both sides of \`extends\` in a tuple, the classic example being \`IsNever\`, where the type has to be checked as a whole.

## Gotchas

- **\`boolean\` is \`true | false\`**, i.e. a union too. So \`T extends true ? A : B\` on \`boolean\` gives \`A | B\`, not a single branch.
- **\`any\` goes down both branches at once**: \`any extends string ? 'y' : 'n'\` is \`'y' | 'n'\`.
- **\`Omit\` isn't distributive**, which is why it destroys discriminated unions. You need your own helper: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **Both sides must be wrapped.** \`[T] extends never\` won't work — it has to be \`[T] extends [never]\`.
- \`T extends any ? ... : ...\` is often written **not for the condition but purely for the distribution** — the else branch there is simply unreachable.`
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
    category: 'typescript',
    level: 'Hard',
    tags: ['tsconfig', 'strict-flags', 'no-unchecked-indexed-access'],
    question: {
      ru: 'Какие строгие флаги tsconfig самые важные? Объясните strictNullChecks, noUncheckedIndexedAccess и exactOptionalPropertyTypes.',
      en: 'Which strict tsconfig flags matter most? Explain strictNullChecks, noUncheckedIndexedAccess, and exactOptionalPropertyTypes.'
    },
    answer: {
      ru: `## Коротко

Один флаг важнее всех остальных: **\`"strict": true\`**. Это не отдельная проверка, а «включить всё сразу» — под ним прячется целый набор:

\`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`.

Для любого нового проекта это база, а не опция.

## strictNullChecks — самый ценный

Без него \`null\` и \`undefined\` **входят в любой тип**, и компилятор молчит. С ним их нужно указывать явно и проверять перед использованием.

\`\`\`ts
let s: string = null;   // ошибка при strictNullChecks
\`\`\`

Именно этот флаг ловит целый класс ошибок «Cannot read properties of undefined» ещё до запуска. Если из всего списка выбирать один — то этот.

## noUncheckedIndexedAccess — честность про индексы

**Не входит в \`strict\`, включается отдельно.** Делает результат доступа по индексу честным — добавляет \`| undefined\`:

\`\`\`ts
const arr: number[] = [1, 2];

const x = arr[10];   // без флага: number (враньё)
                     // с флагом:  number | undefined (правда)
x.toFixed();         // с флагом — ошибка, нужно проверить
\`\`\`

То же для \`Record<string, T>\` и любых index signatures. Проверок в коде станет больше, но это как раз те проверки, отсутствие которых даёт баги.

## exactOptionalPropertyTypes — различает «нет» и «undefined»

Тонкая, но важная штука. Без флага \`{ a?: string }\` разрешает и отсутствие ключа, и явный \`undefined\`. С флагом — только отсутствие:

\`\`\`ts
interface T { a?: string }

const t: T = { a: undefined };   // ошибка при exactOptionalPropertyTypes
\`\`\`

Разница видна там, где код проверяет \`'a' in obj\` или использует \`Object.keys\` — «ключа нет» и «ключ есть со значением undefined» это разные вещи.

## Ещё несколько полезных

- **\`noImplicitOverride\`** — требует писать \`override\` при переопределении метода. Ловит опечатки в именах и переименования в базовом классе.
- **\`noFallthroughCasesInSwitch\`** — забытый \`break\`.
- **\`noImplicitReturns\`** — функция возвращает значение не во всех ветках.
- **\`useUnknownInCatchVariables\`** — в \`catch (e)\` тип \`unknown\` вместо \`any\` (входит в \`strict\`).

## Что сказать на собеседовании

> Базовая рекомендация — \`"strict": true\`, который включает сразу восемь флагов, включая \`strictNullChecks\`, \`strictFunctionTypes\`, \`noImplicitAny\` и \`useUnknownInCatchVariables\`. Самый ценный — \`strictNullChecks\`: без него \`null\` и \`undefined\` входят в любой тип, а с ним их нужно объявлять явно и сужать, что ловит целый класс рантайм-ошибок на этапе компиляции. \`noUncheckedIndexedAccess\` в \`strict\` не входит: он добавляет \`| undefined\` к результату доступа по индексу. Практический совет — включать строгий режим с самого старта проекта: ретрофит на большой существующей кодовой базе очень болезненный.

## Ловушки

- **Ретрофит на большом проекте — это надолго.** Включение \`strictNullChecks\` на зрелой кодовой базе даёт тысячи ошибок. Внедряют по частям, иногда пофайлово через отдельный tsconfig.
- **\`strict\` не включает \`noUncheckedIndexedAccess\`** — многие думают, что включает, и удивляются, что \`arr[i]\` всё ещё не \`undefined\`.
- **\`exactOptionalPropertyTypes\` часто конфликтует со сторонними типами** — библиотеки нередко написаны без него, и появляются странные ошибки на чужих интерфейсах.
- **\`strictPropertyInitialization\` и Angular**: поля, заполняемые через DI или \`@Input\`, требуют либо \`!\`, либо инициализации. Оператор \`!\` — это обещание компилятору, и за него отвечаете вы.
- **Флаги — это compile-time.** Никакой рантайм-валидации они не дают: данные с сервера всё равно нужно проверять руками или схемой (zod, io-ts).`,
      en: `## In short

One flag matters more than all the others: **\`"strict": true\`**. It isn't a single check but "turn everything on" — a whole set hides beneath it:

\`strictNullChecks\`, \`strictFunctionTypes\`, \`strictBindCallApply\`, \`strictPropertyInitialization\`, \`noImplicitThis\`, \`noImplicitAny\`, \`alwaysStrict\`, \`useUnknownInCatchVariables\`.

For any new project that's the baseline, not an option.

## strictNullChecks — the most valuable one

Without it, \`null\` and \`undefined\` **belong to every type** and the compiler says nothing. With it you must declare them explicitly and check before use.

\`\`\`ts
let s: string = null;   // error under strictNullChecks
\`\`\`

This is the flag that catches a whole class of "Cannot read properties of undefined" errors before you ever run the code. If you could only pick one from the list, pick this.

## noUncheckedIndexedAccess — honesty about indexes

**Not part of \`strict\`; enable it separately.** It makes indexed access honest by adding \`| undefined\`:

\`\`\`ts
const arr: number[] = [1, 2];

const x = arr[10];   // without the flag: number (a lie)
                     // with the flag:    number | undefined (the truth)
x.toFixed();         // with the flag — error, you must check
\`\`\`

The same applies to \`Record<string, T>\` and any index signature. There will be more checks in your code, but they're exactly the checks whose absence causes bugs.

## exactOptionalPropertyTypes — telling "absent" from "undefined"

Subtle but important. Without the flag, \`{ a?: string }\` accepts both a missing key and an explicit \`undefined\`. With it, only a missing key:

\`\`\`ts
interface T { a?: string }

const t: T = { a: undefined };   // error under exactOptionalPropertyTypes
\`\`\`

The difference shows wherever code checks \`'a' in obj\` or uses \`Object.keys\` — "the key is absent" and "the key exists with the value undefined" are different things.

## A few more worth having

- **\`noImplicitOverride\`** — requires writing \`override\` when overriding a method. Catches typos in names and renames in the base class.
- **\`noFallthroughCasesInSwitch\`** — a forgotten \`break\`.
- **\`noImplicitReturns\`** — a function that doesn't return a value on every path.
- **\`useUnknownInCatchVariables\`** — \`catch (e)\` typed \`unknown\` instead of \`any\` (part of \`strict\`).

## What to say in the interview

> The baseline recommendation is \`"strict": true\`, which enables eight flags at once, including \`strictNullChecks\`, \`strictFunctionTypes\`, \`noImplicitAny\` and \`useUnknownInCatchVariables\`. The most valuable of them is \`strictNullChecks\`: without it \`null\` and \`undefined\` belong to every type, while with it they must be declared explicitly and narrowed before use, which catches a whole class of runtime errors at compile time. \`noUncheckedIndexedAccess\` isn't part of \`strict\` and is enabled separately: it adds \`| undefined\` to the result of indexing arrays and types with an index signature, making that access honest. \`exactOptionalPropertyTypes\` distinguishes an absent property from one whose value is \`undefined\` — with it you can't assign \`{ a: undefined }\` to the type \`{ a?: string }\`. The practical advice is to turn strict mode on from day one: retrofitting it onto a large existing codebase is very painful.

## Gotchas

- **Retrofitting a large project takes a long time.** Enabling \`strictNullChecks\` on a mature codebase produces thousands of errors. It's rolled out in pieces, sometimes file by file via a separate tsconfig.
- **\`strict\` does not enable \`noUncheckedIndexedAccess\`** — many people assume it does and are surprised that \`arr[i]\` still isn't \`undefined\`.
- **\`exactOptionalPropertyTypes\` often clashes with third-party types** — libraries are frequently written without it, producing odd errors on other people's interfaces.
- **\`strictPropertyInitialization\` and Angular**: fields filled by DI or \`@Input\` need either a \`!\` or an initialiser. The \`!\` operator is a promise to the compiler, and you're responsible for it.
- **Flags are compile-time.** They give no runtime validation whatsoever: data from a server still has to be checked by hand or against a schema (zod, io-ts).`
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
  },
  {
    id: 'jsts-053',
    category: 'js-state',
    level: 'Hard',
    tags: ['event-loop', 'output-order', 'microtasks'],
    question: {
      ru: 'Задачи с собеседования: что выведет код? Разберите порядок вывода в шести типовых сниппетах на Event Loop.',
      en: 'Interview drills: what does this code print? Work through six classic Event Loop ordering snippets.'
    },
    answer: {
      ru: `## Коротко

Задачи «что выведется раньше» решаются **одним и тем же алгоритмом**, и на собеседовании ценят не сам ответ, а то, что вы его проговариваете шагами:

1. Сверху вниз выполнить **весь синхронный** код. Всё, что попало внутрь \`setTimeout\` и \`.then()\`, только *запланировалось*.
2. Опустошить очередь **микрозадач целиком** — включая те, что появились по ходу разгребания.
3. Если пришло время кадра — \`requestAnimationFrame\` → пересчёт стилей → layout → paint.
4. Взять **одну** макрозадачу и вернуться к шагу 2.

## Задача 1 — базовая

\`\`\`js
console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve()
  .then(() => console.log('promise1'))
  .then(() => console.log('promise2'));
console.log('script end');
\`\`\`

**Ответ:** \`script start\` → \`script end\` → \`promise1\` → \`promise2\` → \`setTimeout\`

Сначала весь синхронный код, потом вся очередь микрозадач — \`promise2\` тоже успевает, хотя появился уже во время разгребания. Таймер в самом конце.

## Задача 2 — классика с async/await

\`\`\`js
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}
async function async2() {
  console.log('async2');
}

console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
async1();
new Promise(resolve => {
  console.log('promise1');
  resolve();
}).then(() => console.log('promise2'));
console.log('script end');
\`\`\`

**Ответ:** \`script start\` → \`async1 start\` → \`async2\` → \`promise1\` → \`script end\` → \`async1 end\` → \`promise2\` → \`setTimeout\`

Здесь два подвоха, и оба про «асинхронное на самом деле синхронное»:

- **тело async-функции до первого \`await\` выполняется синхронно** — поэтому \`async1 start\` и \`async2\` печатаются сразу, до \`script end\`;
- **колбэк в конструкторе \`new Promise\` — тоже синхронный**, поэтому \`promise1\` идёт до \`script end\`.

А \`async1 end\` встал в очередь микрозадач раньше \`promise2\`, потому что \`await\` сработал раньше, чем был зарегистрирован \`.then()\`.

## Задача 3 — микрозадачи между макрозадачами

\`\`\`js
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p1'));
}, 0);
setTimeout(() => {
  console.log('t2');
  Promise.resolve().then(() => console.log('p2'));
}, 0);
\`\`\`

**Ответ:** \`t1\` → \`p1\` → \`t2\` → \`p2\`

Самая частая ошибка — сказать \`t1 → t2 → p1 → p2\`. Очередь микрозадач опустошается **после каждой** макрозадачи, а не один раз за круг.

## Задача 4 — две независимые цепочки

\`\`\`js
Promise.resolve().then(() => console.log('A1')).then(() => console.log('A2'));
Promise.resolve().then(() => console.log('B1')).then(() => console.log('B2'));
\`\`\`

**Ответ:** \`A1\` → \`B1\` → \`A2\` → \`B2\`

Цепочки **чередуются по тикам**: следующее звено регистрируется только когда предыдущее вернуло значение, и встаёт в конец очереди — за уже стоящим там звеном соседней цепочки.

## Задача 5 — вложенность

\`\`\`js
Promise.resolve().then(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
}).then(() => console.log(3));
\`\`\`

**Ответ:** \`1\` → \`2\` → \`3\`

Микрозадача с \`2\` встала в очередь **во время** работы первого колбэка, а \`3\` запланировалось только после того, как первый колбэк завершился, — то есть уже за \`2\`.

## Задача 6 — где здесь рендеринг

\`\`\`js
console.log('sync');
setTimeout(() => console.log('timeout'));
requestAnimationFrame(() => console.log('raf'));
Promise.resolve().then(() => console.log('micro'));
\`\`\`

**Ответ (на практике):** \`sync\` → \`micro\` → \`timeout\` → \`raf\`

Микрозадача всегда идёт раньше любой макрозадачи. А \`timeout\` обычно опережает \`raf\`, потому что задача таймера готова прямо сейчас, а следующий кадр наступит только через ~16 мс. Сильный ответ добавляет: **порядок таймера и rAF спецификацией не гарантирован** — если тик совпал с началом кадра, порядок перевернётся. Ровно за этим нюансом такую задачу и дают.

## Что сказать на собеседовании

> Любая задача на порядок решается одним алгоритмом: весь синхронный код, потом очередь микрозадач целиком, потом фаза рендеринга, потом одна макрозадача — и снова микрозадачи. Половина подвохов в том, что «асинхронный» код местами синхронный: колбэк в конструкторе \`new Promise\` и тело async-функции до первого \`await\` выполняются немедленно. Дальше важно, что микрозадачи разгребаются после **каждой** макрозадачи, поэтому два \`setTimeout\` со своими \`.then()\` дают \`t1, p1, t2, p2\`, а независимые цепочки промисов чередуются по тикам. И отдельно я бы отметил, что порядок \`setTimeout\` и \`requestAnimationFrame\` спецификацией не закреплён: на практике таймер обычно раньше, потому что кадра приходится ждать до 16 миллисекунд.

## Ловушки

- **Синхронное внутри асинхронного:** тело \`new Promise(executor)\` и код async-функции до первого \`await\` выполняются немедленно, а не в очереди.
- \`setTimeout(fn, 0)\` браузер поднимает до 1 мс, а при вложенности глубже пяти уровней — до 4 мс. Поэтому \`setTimeout(fn, 0)\` и \`setTimeout(fn, 1)\` — это обычно одно и то же.
- Порядок \`.then()\` определяется **моментом регистрации** колбэка, а не тем, как код выглядит визуально.
- \`await\` не блокирует поток: ждёт только остаток текущей функции, весь остальной код продолжает выполняться.
- Если в задаче есть \`console.log\` объекта, а его потом мутируют, консоль в некоторых браузерах покажет **актуальное** состояние, а не то, что было на момент вывода.`,
      en: `## In short

"What prints first" puzzles all yield to **the same algorithm**, and interviewers care less about the answer than about you walking through it step by step:

1. Run **all the synchronous** code top to bottom. Anything inside \`setTimeout\` or \`.then()\` has merely been *scheduled*.
2. Drain the **microtask queue completely** — including microtasks queued while draining.
3. If a frame is due: \`requestAnimationFrame\` → recalc style → layout → paint.
4. Take **one** macrotask and go back to step 2.

## Drill 1 — the baseline

\`\`\`js
console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve()
  .then(() => console.log('promise1'))
  .then(() => console.log('promise2'));
console.log('script end');
\`\`\`

**Answer:** \`script start\` → \`script end\` → \`promise1\` → \`promise2\` → \`setTimeout\`

All synchronous code first, then the whole microtask queue — \`promise2\` makes it too, even though it was only queued while draining. The timer comes last.

## Drill 2 — the async/await classic

\`\`\`js
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}
async function async2() {
  console.log('async2');
}

console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
async1();
new Promise(resolve => {
  console.log('promise1');
  resolve();
}).then(() => console.log('promise2'));
console.log('script end');
\`\`\`

**Answer:** \`script start\` → \`async1 start\` → \`async2\` → \`promise1\` → \`script end\` → \`async1 end\` → \`promise2\` → \`setTimeout\`

Two traps here, both about "async code that is actually synchronous":

- **the body of an async function up to the first \`await\` runs synchronously** — so \`async1 start\` and \`async2\` print immediately, before \`script end\`;
- **the \`new Promise\` executor callback is synchronous too**, which is why \`promise1\` comes before \`script end\`.

And \`async1 end\` was queued before \`promise2\` because the \`await\` fired before the \`.then()\` was ever registered.

## Drill 3 — microtasks between macrotasks

\`\`\`js
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p1'));
}, 0);
setTimeout(() => {
  console.log('t2');
  Promise.resolve().then(() => console.log('p2'));
}, 0);
\`\`\`

**Answer:** \`t1\` → \`p1\` → \`t2\` → \`p2\`

The most common mistake is answering \`t1 → t2 → p1 → p2\`. The microtask queue drains **after every** macrotask, not once per loop.

## Drill 4 — two independent chains

\`\`\`js
Promise.resolve().then(() => console.log('A1')).then(() => console.log('A2'));
Promise.resolve().then(() => console.log('B1')).then(() => console.log('B2'));
\`\`\`

**Answer:** \`A1\` → \`B1\` → \`A2\` → \`B2\`

The chains **interleave tick by tick**: the next link is only registered once the previous one returned, so it joins the back of the queue — behind the neighbouring chain's link that is already sitting there.

## Drill 5 — nesting

\`\`\`js
Promise.resolve().then(() => {
  console.log(1);
  Promise.resolve().then(() => console.log(2));
}).then(() => console.log(3));
\`\`\`

**Answer:** \`1\` → \`2\` → \`3\`

The microtask printing \`2\` was queued **while** the first callback was still running, whereas \`3\` was only scheduled after that callback finished — i.e. behind \`2\`.

## Drill 6 — where rendering fits

\`\`\`js
console.log('sync');
setTimeout(() => console.log('timeout'));
requestAnimationFrame(() => console.log('raf'));
Promise.resolve().then(() => console.log('micro'));
\`\`\`

**Answer (in practice):** \`sync\` → \`micro\` → \`timeout\` → \`raf\`

A microtask always beats any macrotask. And \`timeout\` usually beats \`raf\` because the timer task is ready right now while the next frame is up to ~16 ms away. The strong answer adds: **the spec does not guarantee the order of a timer versus rAF** — if the tick lands right at a frame boundary, the order flips. That nuance is exactly why this drill gets asked.

## What to say in the interview

> Every ordering puzzle reduces to one algorithm: all synchronous code, then the entire microtask queue, then the rendering phase, then one macrotask — and microtasks again. Half of the traps come from "async" code that is in fact synchronous: the \`new Promise\` executor and an async function's body up to the first \`await\` run immediately. Next, microtasks drain after **every** macrotask, so two \`setTimeout\`s with their own \`.then()\` print \`t1, p1, t2, p2\`, and independent promise chains interleave tick by tick. I'd also point out that the order of \`setTimeout\` and \`requestAnimationFrame\` isn't fixed by the spec — in practice the timer wins, because a frame can be up to 16 milliseconds away.

## Gotchas

- **Synchronous code inside async constructs:** the \`new Promise(executor)\` body and an async function's code up to the first \`await\` run immediately, not from a queue.
- The browser raises \`setTimeout(fn, 0)\` to 1 ms, and to 4 ms once nesting goes deeper than five levels. So \`setTimeout(fn, 0)\` and \`setTimeout(fn, 1)\` are normally the same thing.
- \`.then()\` ordering is decided by **when the callback was registered**, not by how the code looks on the page.
- \`await\` doesn't block the thread: only the rest of that function waits, all other code keeps running.
- If a puzzle logs an object that is mutated afterwards, some browsers' consoles show the **current** state rather than the state at log time.`
    },
    codeSnippet: `// Self-check — answer: 1, 3, 7, 4, 5, 2, 6
console.log(1);
setTimeout(() => console.log(2), 0);              // macrotask
new Promise(res => { console.log(3); res(); })    // executor is synchronous
  .then(() => console.log(4));                    // microtask #1
queueMicrotask(() => console.log(5));             // microtask #2
setTimeout(() => console.log(6), 0);              // macrotask
console.log(7);`
  },
  {
    id: 'jsts-054',
    category: 'js-state',
    level: 'Expert',
    tags: ['event-loop', 'microtasks', 'async-await', 'output-order'],
    question: {
      ru: 'Продвинутые задачи на порядок: сколько микрозадач стоят `await`, `return Promise.resolve()` и возврат промиса из `.then()`?',
      en: 'Advanced ordering drills: how many microtask ticks do `await`, `return Promise.resolve()` and returning a promise from `.then()` cost?'
    },
    answer: {
      ru: `## Коротко

Сложные задачи на порядок — это всегда **счёт тиков**: сколько микрозадач «стоит» конструкция. Цифры, которые стоит помнить:

- \`await значение\` (не промис) — **1 тик**: значение оборачивается в \`Promise.resolve\`.
- \`await нативный промис\` (уже разрешённый) — **1 тик**.
- \`await thenable\` (просто объект с методом \`then\`) — **2 тика**.
- \`return значение\` из async-функции — **0 дополнительных**, промис функции разрешается сразу.
- \`return промис\` из async-функции — **+2 тика**.
- \`return await промис\` — **+1 тик**, то есть на два тика быстрее предыдущего.
- \`return промис\` из \`.then()\` — **+2 тика**.

Правило за этими цифрами одно: **разрешить промис другим промисом стоит два дополнительных тика**. Один job нужен, чтобы вызвать \`then\` у внутреннего промиса, второй — чтобы протолкнуть значение наружу.

Чтобы измерять тики, удобно ставить рядом «линейку» — цепочку из четырёх \`.then()\`.

## Задача 1 — цена \`return Promise.resolve()\`

\`\`\`js
async function f() {
  return Promise.resolve('a');
}

f().then(v => console.log(v));

Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3));
\`\`\`

**Ответ:** \`1\` → \`2\` → \`a\` → \`3\`

Три варианта той же функции для сравнения:

- \`return 'a'\` → \`a\` → \`1\` → \`2\` → \`3\` (промис разрешён ещё до того, как навесили \`.then\`).
- \`return await Promise.resolve('a')\` → \`1\` → \`a\` → \`2\` → \`3\` (один тик на \`await\`).
- \`return Promise.resolve('a')\` → \`1\` → \`2\` → \`a\` → \`3\` (два тика на разворачивание).

Это тот редкий случай, когда \`return await\` **быстрее**, чем \`return\`, а не «лишний await», как принято думать.

## Задача 2 — возврат промиса из \`.then()\`

\`\`\`js
Promise.resolve()
  .then(() => {
    console.log('A');
    return Promise.resolve('X');
  })
  .then(v => console.log('B', v));

Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3))
  .then(() => console.log(4));
\`\`\`

**Ответ:** \`A\` → \`1\` → \`2\` → \`3\` → \`B X\` → \`4\`

По линейке видно ровно те же два лишних тика: \`B\` должен был прийти вторым звеном, а пришёл четвёртым.

## Задача 3 — слушатели клика: настоящий клик против \`.click()\`

\`\`\`js
btn.addEventListener('click', () => {
  console.log('listener 1');
  Promise.resolve().then(() => console.log('micro 1'));
});
btn.addEventListener('click', () => {
  console.log('listener 2');
  Promise.resolve().then(() => console.log('micro 2'));
});
\`\`\`

- **Настоящий клик мышью:** \`listener 1\` → \`micro 1\` → \`listener 2\` → \`micro 2\`
- **\`btn.click()\` из кода:** \`listener 1\` → \`listener 2\` → \`micro 1\` → \`micro 2\`

Причина в том, **когда стек становится пустым**. Микрозадачи разгребаются на выходе из JS в браузер: при настоящем клике браузер вызывает каждый слушатель отдельно, поэтому между ними стек пуст. А \`btn.click()\` — синхронный вызов из вашего скрипта: стек не опустеет, пока не закончится весь скрипт.

Это любимая задача сильных интервьюеров: она показывает, что вы понимаете **механизм**, а не выучили «промисы раньше таймеров».

## Задача 4 — \`MutationObserver\` в общей очереди

\`\`\`js
const el = document.createElement('div');
new MutationObserver(() => console.log('mutation')).observe(el, { attributes: true });

Promise.resolve().then(() => console.log('promise A'));
el.setAttribute('data-x', '1');
Promise.resolve().then(() => console.log('promise B'));
console.log('sync');
\`\`\`

**Ответ:** \`sync\` → \`promise A\` → \`mutation\` → \`promise B\`

\`MutationObserver\` — обычная микрозадача без всяких привилегий: она встала в очередь в момент мутации, то есть между двумя \`.then()\`. Никакого «DOM важнее промисов» нет.

## Задача 5 — Node.js вместо браузера

\`\`\`js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
\`\`\`

**Ответ (CommonJS):** \`sync\` → \`nextTick\` → \`promise\` → \`immediate\` → \`timeout\`

\`process.nextTick\` — **не микрозадача**, а отдельная очередь с приоритетом выше промисов. Порядок \`timeout\` и \`immediate\` из главного модуля Node документирует как **недетерминированный** (зависит от того, истёк ли таймер к первому проходу цикла); на современных версиях практически всегда первым идёт \`immediate\`, а вот внутри I/O-колбэка \`setImmediate\` раньше **гарантированно** — фаза *check* идёт сразу за *poll*.

Тонкость на бонусный балл: в **ES-модуле** (\`.mjs\`) первые две строчки меняются местами — \`sync\` → \`promise\` → \`nextTick\`. Тело ES-модуля выполняется уже внутри микрозадачи, поэтому очередь микрозадач додрейнивается до того, как движок дойдёт до чекпоинта \`nextTick\`.

## Что сказать на собеседовании

> Продвинутые задачи на порядок — это счёт микрозадачных тиков. Базовое правило: \`await\` нативного промиса стоит один тик, \`await\` thenable — два, а разрешение промиса другим промисом — два дополнительных тика: один job вызывает \`then\` у внутреннего промиса, второй проталкивает значение наружу. Поэтому \`return Promise.resolve(x)\` из async-функции отдаёт результат на два тика позже, чем \`return x\`, а \`return await p\` — единственный случай, когда \`await\` реально ускоряет. То же и с возвратом промиса из \`.then()\`. Ещё я бы упомянул, что до оптимизации в V8 7.2 \`await\` стоил три тика — на этом расходятся старые статьи и современные движки. А самый практичный пример — слушатели клика: на настоящем клике микрозадачи разгребаются между слушателями, потому что стек пустеет, а при \`btn.click()\` из кода сначала отработают оба слушателя.

## Ловушки

- **\`await\` больше не стоит три тика.** До оптимизации в V8 7.2 (Node 12) он создавал промис-обёртку. Старые статьи и старые «правильные ответы» всё ещё считают по три — стоит проговорить это явно.
- \`Promise.resolve(p)\`, где \`p\` — уже нативный промис, возвращает **тот же самый** промис, без дополнительных тиков. А \`new Promise(res => res(p))\` — это уже +2 тика.
- \`process.nextTick\` в браузере не существует; в Node его очередь опустошается **перед** микрозадачами и может уморить голодом промисы.
- \`.finally()\` — тоже звено цепочки, и внутри он реализован через \`then\`, который ещё и дожидается результата колбэка, поэтому тиков стоит больше одного.
- Бесконечный \`queueMicrotask\`, добавляющий сам себя, **навсегда** лишает страницу рендера, а такая же рекурсия на \`setTimeout\` рисовать не мешает.
- Между двумя колбэками \`requestAnimationFrame\` очередь микрозадач тоже опустошается — по тому же правилу пустого стека. А \`requestAnimationFrame\`, зарегистрированный внутри rAF-колбэка, попадёт уже в **следующий** кадр: список колбэков на текущий кадр снимается заранее.
- async-функция, в которой нет ни одного \`await\`, всё равно возвращает промис: её результат нельзя прочитать синхронно, даже если внутри всё синхронно.`,
      en: `## In short

Hard ordering puzzles are always about **counting ticks**: how many microtasks a construct costs. The numbers worth memorising:

- \`await value\` (not a promise) — **1 tick**: the value is wrapped in \`Promise.resolve\`.
- \`await native promise\` (already resolved) — **1 tick**.
- \`await thenable\` (a plain object with a \`then\` method) — **2 ticks**.
- \`return value\` from an async function — **0 extra**, the function's promise resolves right away.
- \`return promise\` from an async function — **+2 ticks**.
- \`return await promise\` — **+1 tick**, i.e. two ticks faster than the line above.
- \`return promise\` from \`.then()\` — **+2 ticks**.

One rule explains all of it: **resolving a promise with another promise costs two extra ticks**. One job calls \`then\` on the inner promise, the second pushes the value outwards.

To measure ticks, put a "ruler" next to the code — a chain of four \`.then()\` calls.

## Drill 1 — the price of \`return Promise.resolve()\`

\`\`\`js
async function f() {
  return Promise.resolve('a');
}

f().then(v => console.log(v));

Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3));
\`\`\`

**Answer:** \`1\` → \`2\` → \`a\` → \`3\`

Three variants of the same function for comparison:

- \`return 'a'\` → \`a\` → \`1\` → \`2\` → \`3\` (the promise was resolved before \`.then\` was even attached).
- \`return await Promise.resolve('a')\` → \`1\` → \`a\` → \`2\` → \`3\` (one tick for the \`await\`).
- \`return Promise.resolve('a')\` → \`1\` → \`2\` → \`a\` → \`3\` (two ticks to unwrap).

This is the rare case where \`return await\` is genuinely **faster** than \`return\`, rather than the "redundant await" it's usually assumed to be.

## Drill 2 — returning a promise from \`.then()\`

\`\`\`js
Promise.resolve()
  .then(() => {
    console.log('A');
    return Promise.resolve('X');
  })
  .then(v => console.log('B', v));

Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3))
  .then(() => console.log(4));
\`\`\`

**Answer:** \`A\` → \`1\` → \`2\` → \`3\` → \`B X\` → \`4\`

The ruler shows exactly the same two extra ticks: \`B\` should have landed on link two, and landed on link four instead.

## Drill 3 — click listeners: a real click versus \`.click()\`

\`\`\`js
btn.addEventListener('click', () => {
  console.log('listener 1');
  Promise.resolve().then(() => console.log('micro 1'));
});
btn.addEventListener('click', () => {
  console.log('listener 2');
  Promise.resolve().then(() => console.log('micro 2'));
});
\`\`\`

- **A real mouse click:** \`listener 1\` → \`micro 1\` → \`listener 2\` → \`micro 2\`
- **\`btn.click()\` from code:** \`listener 1\` → \`listener 2\` → \`micro 1\` → \`micro 2\`

The reason is **when the stack becomes empty**. Microtasks drain as control leaves JS back to the browser: on a real click the browser invokes each listener separately, so the stack is empty between them. \`btn.click()\`, though, is a synchronous call from your script — the stack won't empty until the whole script finishes.

Strong interviewers love this one: it shows you understand the **mechanism** rather than having memorised "promises before timers".

## Drill 4 — \`MutationObserver\` in the shared queue

\`\`\`js
const el = document.createElement('div');
new MutationObserver(() => console.log('mutation')).observe(el, { attributes: true });

Promise.resolve().then(() => console.log('promise A'));
el.setAttribute('data-x', '1');
Promise.resolve().then(() => console.log('promise B'));
console.log('sync');
\`\`\`

**Answer:** \`sync\` → \`promise A\` → \`mutation\` → \`promise B\`

\`MutationObserver\` is an ordinary microtask with no privileges: it joined the queue at mutation time, i.e. between the two \`.then()\` callbacks. There is no "DOM outranks promises" rule.

## Drill 5 — Node.js instead of the browser

\`\`\`js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
\`\`\`

**Answer (CommonJS):** \`sync\` → \`nextTick\` → \`promise\` → \`immediate\` → \`timeout\`

\`process.nextTick\` is **not a microtask** but a separate queue that outranks promises. Node documents the order of \`timeout\` versus \`immediate\` from the main module as **non-deterministic** (it depends on whether the timer expired by the first pass of the loop); on modern versions \`immediate\` comes first in practice, and inside an I/O callback \`setImmediate\` wins **by guarantee** — the *check* phase comes straight after *poll*.

A bonus-point subtlety: in an **ES module** (\`.mjs\`) the first two lines swap — \`sync\` → \`promise\` → \`nextTick\`. An ES module body already runs inside a microtask, so the microtask queue finishes draining before the engine reaches the \`nextTick\` checkpoint.

## What to say in the interview

> Advanced ordering puzzles are microtask-tick arithmetic. The base rule: \`await\` on a native promise costs one tick, \`await\` on a thenable two, and resolving a promise with another promise costs two extra ticks — one job to call \`then\` on the inner promise, another to push the value outwards. That's why \`return Promise.resolve(x)\` from an async function delivers two ticks later than \`return x\`, and \`return await p\` is the one case where an \`await\` actually speeds things up. Returning a promise from \`.then()\` behaves the same way. I'd also mention that before the V8 7.2 optimisation \`await\` cost three ticks — that's where older articles and modern engines disagree. And the most practical example is click listeners: on a real click microtasks drain between listeners because the stack empties, whereas \`btn.click()\` from code runs both listeners first.

## Gotchas

- **\`await\` no longer costs three ticks.** Before the V8 7.2 optimisation (Node 12) it created a wrapper promise. Old articles and old "correct answers" still count three — worth saying out loud.
- \`Promise.resolve(p)\` where \`p\` is already a native promise returns **that same promise**, with no extra ticks. \`new Promise(res => res(p))\`, however, costs +2.
- \`process.nextTick\` doesn't exist in the browser; in Node its queue drains **before** microtasks and can starve promises.
- \`.finally()\` is a chain link too, and internally it's built on \`then\` that also waits for the callback's result — so it costs more than a single tick.
- An endless \`queueMicrotask\` that re-queues itself starves rendering **forever**, whereas the same recursion via \`setTimeout\` leaves painting alone.
- The microtask queue also drains between two \`requestAnimationFrame\` callbacks — same empty-stack rule. And a \`requestAnimationFrame\` registered inside a rAF callback lands in the **next** frame: the callback list for the current frame is taken beforehand.
- An async function with no \`await\` in it still returns a promise: its result can't be read synchronously, however synchronous the body is.`
    },
    codeSnippet: `// Tick cheat sheet — compare each against the same 4-link ruler:
//   Promise.resolve().then(()=>log(1)).then(()=>log(2)).then(()=>log(3))
async function viaValue()   { return 'a'; }                       // a, 1, 2, 3   (+0)
async function viaAwait()   { return await Promise.resolve('a'); } // 1, a, 2, 3  (+1)
async function viaPromise() { return Promise.resolve('a'); }       // 1, 2, a, 3  (+2)

viaPromise().then(v => console.log(v));
Promise.resolve()
  .then(() => console.log(1))
  .then(() => console.log(2))
  .then(() => console.log(3));`
  }
];
