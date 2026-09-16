import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS_MORE: InterviewQuestion[] = [
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
  }
];
