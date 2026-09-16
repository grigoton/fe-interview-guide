import { InterviewQuestion } from '../interfaces/question.interface';

export const JS_TS_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'jsts-016',
    category: 'typescript',
    level: 'Hard',
    tags: ['generics', 'constraints', 'type-inference'],
    question: {
      ru: 'Как работают дженерики и ограничения (`extends`) в TypeScript? Объясните вывод типов и значения по умолчанию.',
      en: 'How do generics and constraints (`extends`) work in TypeScript? Explain type inference and defaults.'
    },
    answer: {
      ru: `## Коротко

**Дженерик — это переменная, только для типа.** Вы пишете функцию, не зная заранее, с каким типом её вызовут, но обещаете сохранить связь: «что положили — то и достанете».

Сравните:

- \`function first(arr: any[]): any\` — работает со всем, но на выходе \`any\`, типы потеряны.
- \`function first<T>(arr: T[]): T\` — работает со всем, но если положили \`string[]\`, то и вернётся \`string\`.

Аналогия: \`T\` — это пустое поле в бланке. Заполняется в момент вызова, а весь остальной бланк подстраивается автоматически.

## Ограничение — \`extends\`

По умолчанию про \`T\` не известно ничего, поэтому внутри функции с ним ничего нельзя делать. \`extends\` — способ сказать «\`T\` — это что угодно, **но обязательно с такими свойствами**»:

\`\`\`ts
function len<T extends { length: number }>(x: T): number {
  return x.length;   // теперь length точно есть
}
len('abc');   // ок
len([1, 2]);  // ок
len(42);      // ошибка: у number нет length
\`\`\`

Самый частый рабочий паттерн — \`K extends keyof T\`, безопасный доступ по ключу:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // тип string
pluck(user, 'age');  // ошибка: 'age' нет в keyof T
\`\`\`

## Вывод типов (inference)

Обычно \`T\` **писать не нужно** — TypeScript догадывается сам по аргументам вызова. \`first([1,2,3])\` → \`T\` это \`number\`.

Две детали, о которых спрашивают:

- При выводе TS **расширяет литералы**: из \`'a'\` получится \`string\`, а не \`'a'\`. Чтобы сохранить узкий тип, нужен \`as const\` или \`const\`-параметр типа (TS 5.0).
- Если кандидатов на \`T\` несколько, TS ищет **общий тип** для всех — при несовместимости будет ошибка.

## Значения по умолчанию

\`<T = string>\` — дефолт, который подставится, если тип не указали и вывести его неоткуда. Удобно для гибких API: \`interface Response<T = unknown>\`.

## Что сказать на собеседовании

> Дженерики — это параметризация по типу: функция, класс или тип работают с произвольным \`T\`, сохраняя связь между входом и выходом. В отличие от \`any\` типобезопасность не теряется. Ограничение \`T extends U\` требует, чтобы \`T\` был подтипом \`U\`, и внутри можно безопасно обращаться к гарантированным членам; классический пример — \`K extends keyof T\` с возвращаемым типом \`T[K]\` для типобезопасного доступа по ключу. Обычно \`T\` явно не указывают — TypeScript выводит его из аргументов, при этом расширяя литеральные типы, если не использован \`as const\` или \`const\`-параметр.

## Ловушки

- **Параметр типа, использованный ровно один раз, — это замаскированный \`any\`.** Если \`T\` встречается только в позиции аргумента и нигде больше, он не связывает вход с выходом, и его надо просто убрать.
- \`T extends U\` — это **не наследование классов**, а «присваиваемость». Структурная типизация: подходит любой объект нужной формы.
- Не путайте **параметр типа и аргумент типа**: \`<T>\` в объявлении — это дырка, \`foo<string>()\` — заполнение дырки.
- В стрелочной функции в \`.tsx\`-файле \`<T>\` парсится как JSX. Пишут \`<T,>\` или \`<T extends unknown>\`.
- Слишком много параметров типа делает сигнатуру нечитаемой. Если их больше двух-трёх, обычно проще принять один объект-параметр.`,
      en: `## In short

**A generic is a variable, but for a type.** You write a function without knowing which type it will be called with, yet you promise to preserve the connection: "what you put in is what you get out".

Compare:

- \`function first(arr: any[]): any\` — works with anything, but the result is \`any\` and the types are gone.
- \`function first<T>(arr: T[]): T\` — works with anything, but pass a \`string[]\` and you get a \`string\` back.

The analogy: \`T\` is a blank field on a form. It's filled in at call time, and the rest of the form adjusts automatically.

## Constraints — \`extends\`

By default nothing is known about \`T\`, so you can't do anything with it inside the function. \`extends\` is how you say "\`T\` can be anything, **as long as it has these members**":

\`\`\`ts
function len<T extends { length: number }>(x: T): number {
  return x.length;   // length is guaranteed now
}
len('abc');   // ok
len([1, 2]);  // ok
len(42);      // error: number has no length
\`\`\`

The most common real-world pattern is \`K extends keyof T\` for safe key access:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };
pluck(user, 'name'); // type string
pluck(user, 'age');  // error: 'age' is not in keyof T
\`\`\`

## Inference

Usually you **don't write \`T\`** — TypeScript figures it out from the call arguments. \`first([1,2,3])\` → \`T\` is \`number\`.

Two details they ask about:

- During inference TypeScript **widens literals**: \`'a'\` becomes \`string\`, not \`'a'\`. To keep the narrow type you need \`as const\` or a \`const\` type parameter (TS 5.0).
- With several candidates for \`T\`, TypeScript looks for a **common type**; if they're incompatible it's an error.

## Defaults

\`<T = string>\` is the fallback used when the type isn't given and can't be inferred. Handy for flexible APIs: \`interface Response<T = unknown>\`.

## What to say in the interview

> Generics are parameterisation by type: a function, class or type works with an arbitrary \`T\` while preserving the relation between input and output, so unlike \`any\` you don't lose type safety. The constraint \`T extends U\` requires \`T\` to be a subtype of \`U\`, letting you safely access guaranteed members inside; the classic example is \`K extends keyof T\` returning \`T[K]\` for type-safe key access. You usually don't specify \`T\` explicitly — TypeScript infers it from the arguments, widening literal types unless \`as const\` or a \`const\` type parameter is used. A default like \`<T = string>\` kicks in when the type isn't provided and can't be inferred.

## Gotchas

- **A type parameter used exactly once is \`any\` in disguise.** If \`T\` appears only in an argument position and nowhere else, it doesn't tie input to output and should just be removed.
- \`T extends U\` is **not class inheritance**, it's assignability. Structural typing: any object of the right shape qualifies.
- Don't confuse **type parameter and type argument**: \`<T>\` in a declaration is the hole, \`foo<string>()\` fills it.
- In a \`.tsx\` file, \`<T>\` on an arrow function parses as JSX. Write \`<T,>\` or \`<T extends unknown>\`.
- Too many type parameters makes a signature unreadable. Beyond two or three, taking a single options object is usually simpler.`
    },
    codeSnippet: `// Constrained generic with a default, preserving the input/output relation
function merge<T extends object, U extends object = {}>(a: T, b: U): T & U {
  return { ...a, ...b };
}
const r = merge({ id: 1 }, { name: 'Ann' });
// r: { id: number } & { name: string }
r.id;   // number
r.name; // string`
  },
  {
    id: 'jsts-017',
    category: 'typescript',
    level: 'Expert',
    tags: ['conditional-types', 'infer', 'distributive'],
    question: {
      ru: 'Как работают условные типы и `infer`? Что такое дистрибутивность над union-типами?',
      en: 'How do conditional types and `infer` work? What is distributivity over union types?'
    },
    answer: {
      ru: `## Коротко

**Условный тип — это обычный тернарник, только для типов.**

\`T extends U ? X : Y\` читается как: «если тип \`T\` подходит под \`U\` — возьми \`X\`, иначе \`Y\`». Слово \`extends\` здесь значит не «наследуется», а «присваиваемо, подходит по форме».

**\`infer\` — это «запомни вот эту часть типа в переменную».** Что-то вроде захватывающей группы в регулярном выражении, только по типам.

## infer на примере

\`\`\`ts
// «Если T — это массив чего-то, дай мне это что-то»
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string — не массив, вернулся сам

// «Если F — функция, дай мне её возвращаемый тип»
type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

Читается так: «\`T\` похож на массив? Тогда назови его элемент \`E\` и верни \`E\`».

## Дистрибутивность — самое неочевидное

Если слева от \`extends\` стоит **голый параметр типа** \`T\`, и в него подставили **union**, TypeScript применяет условие **к каждому члену union по отдельности**, а результаты складывает обратно в union.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// Получится string[] | number[]
// А НЕ (string | number)[]  — вот это и удивляет на собеседовании
\`\`\`

Пошагово: \`ToArray<string | number>\` → \`ToArray<string> | ToArray<number>\` → \`string[] | number[]\`.

## Как выключить дистрибутивность

Обернуть обе стороны в кортеж — тогда \`T\` уже не «голый»:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true

// без скобок: never — это пустой union, распределять не по чему,
// поэтому результат тоже never, а не false
\`\`\`

Это стандартный приём для \`IsNever\`, строгих сравнений типов и всего, где union надо рассматривать целиком.

## Что сказать на собеседовании

> Условный тип \`T extends U ? X : Y\` — это тернарный оператор на уровне типов, проверяющий присваиваемость \`T\` к \`U\`. \`infer\` объявляет переменную типа прямо внутри условия и захватывает часть структуры — это паттерн-матчинг по типам, на нём построены \`ReturnType\`, \`Parameters\`, \`Awaited\`. Дистрибутивность означает, что если проверяемый тип — голый параметр и в него подставлен union, условие применяется к каждому члену отдельно, а результаты объединяются: \`ToArray<string | number>\` даёт \`string[] | number[]\`, а не \`(string | number)[]\`. Отключается оборачиванием в кортеж — \`[T] extends [U]\`, классический пример — \`IsNever\`.

## Ловушки

- **\`never\` внутри условного типа исчезает.** \`never\` — это пустой union, поэтому дистрибутивный условный тип на нём возвращает \`never\`, а не ветку \`false\`.
- \`any\` **уходит в обе ветки сразу**: \`any extends string ? 'y' : 'n'\` даёт \`'y' | 'n'\`.
- **Несколько \`infer\` с одним именем** ведут себя по-разному: в ковариантной позиции результаты объединяются в union, в контравариантной (например, в параметрах функции) — в intersection. На этом построен трюк UnionToIntersection.
- **Глубина рекурсии ограничена** — при слишком сложных типах компилятор скажет «Type instantiation is excessively deep».
- Сложные условные типы **заметно замедляют компиляцию** и IDE. Если тип стал нечитаемым, обычно правильнее упростить модель данных.`,
      en: `## In short

**A conditional type is an ordinary ternary, but for types.**

\`T extends U ? X : Y\` reads as: "if type \`T\` fits \`U\`, take \`X\`, otherwise \`Y\`". Here \`extends\` doesn't mean "inherits" — it means "is assignable to, matches the shape".

**\`infer\` means "remember this part of the type in a variable".** Think of a capture group in a regular expression, but for types.

## infer by example

\`\`\`ts
// "If T is an array of something, give me that something"
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>; // number
type B = ElementType<string>;   // string — not an array, returned as-is

// "If F is a function, give me its return type"
type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>; // Promise<number>
\`\`\`

Read it as: "does \`T\` look like an array? Then call its element \`E\` and return \`E\`".

## Distributivity — the least obvious part

If the left side of \`extends\` is a **naked type parameter** \`T\` and a **union** is substituted into it, TypeScript applies the condition **to each member separately** and unions the results back together.

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// You get string[] | number[]
// NOT (string | number)[] — this is what surprises people in interviews
\`\`\`

Step by step: \`ToArray<string | number>\` → \`ToArray<string> | ToArray<number>\` → \`string[] | number[]\`.

## How to switch distributivity off

Wrap both sides in a tuple — then \`T\` is no longer naked:

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type N = IsNever<never>; // true

// without brackets: never is the empty union, there's nothing to distribute over,
// so the result is never rather than false
\`\`\`

This is the standard trick for \`IsNever\`, strict type comparisons and anything where the union must be examined as a whole.

## What to say in the interview

> A conditional type \`T extends U ? X : Y\` is a ternary operator at the type level that checks assignability of \`T\` to \`U\`. \`infer\` declares a type variable inside the condition and captures part of the structure — it's pattern matching over types, and it's what \`ReturnType\`, \`Parameters\` and \`Awaited\` are built on. Distributivity means that if the checked type is a naked parameter with a union substituted, the condition is applied to each member separately and the results are unioned: \`ToArray<string | number>\` gives \`string[] | number[]\`, not \`(string | number)[]\`. You disable it by wrapping in a tuple — \`[T] extends [U]\` — with \`IsNever\` as the classic example. Conditional types underpin most of the utility types in lib.es5.d.ts.

## Gotchas

- **\`never\` disappears inside a conditional type.** \`never\` is the empty union, so a distributive conditional over it returns \`never\` rather than the false branch.
- \`any\` **goes down both branches at once**: \`any extends string ? 'y' : 'n'\` gives \`'y' | 'n'\`.
- **Several \`infer\`s with the same name** behave differently: in a covariant position the results are unioned, in a contravariant one (e.g. function parameters) they're intersected. That's the basis of the UnionToIntersection trick.
- **Recursion depth is limited** — for overly complex types the compiler says "Type instantiation is excessively deep".
- Complex conditional types **noticeably slow down compilation** and the IDE. If a type has become unreadable, simplifying the data model is usually the right fix.`
    },
    codeSnippet: `// infer captures parts of a structure; distributivity splits unions
type Unpromise<T> = T extends Promise<infer U> ? U : T;
type A = Unpromise<Promise<string>>;        // string

type Flatten<T> = T extends Array<infer E> ? E : T;
type B = Flatten<number[]>;                 // number

type Boxed<T> = T extends any ? { v: T } : never;  // distributive
type C = Boxed<string | number>;            // { v: string } | { v: number }`
  },
  {
    id: 'jsts-018',
    category: 'typescript',
    level: 'Hard',
    tags: ['mapped-types', 'key-remapping', 'modifiers'],
    question: {
      ru: 'Как работают mapped types? Объясните модификаторы (`readonly`, `?`, `+`, `-`) и `as`-ремаппинг ключей.',
      en: 'How do mapped types work? Explain modifiers (`readonly`, `?`, `+`, `-`) and key remapping with `as`.'
    },
    answer: {
      ru: `## Коротко

**Mapped type — это \`for...of\` по ключам типа.** Берём существующий тип, проходим по всем его ключам и строим новый тип по правилу.

Синтаксис: \`{ [K in keyof T]: ЧтоТоОт T[K] }\`. Читается: «для каждого ключа \`K\` из \`T\` — сделай такое-то поле».

\`\`\`ts
// все поля превратить в string
type Stringify<T> = { [K in keyof T]: string };

// все поля обернуть в промис
type Async<T> = { [K in keyof T]: Promise<T[K]> };
\`\`\`

## Модификаторы: \`readonly\` и \`?\`

Прямо в маппинге можно **добавить** или **убрать** модификатор. Плюс добавляет, минус убирает:

\`\`\`ts
type Partial2<T>  = { [K in keyof T]+?: T[K] };        // добавить ?
type Required2<T> = { [K in keyof T]-?: T[K] };        // убрать ?
type Mutable<T>   = { -readonly [K in keyof T]: T[K] }; // убрать readonly
\`\`\`

Именно так в стандартной библиотеке написаны \`Partial\`, \`Required\` и \`Readonly\` — это буквально три строчки.

## Переименование ключей через \`as\`

С TS 4.1 можно менять **сами ключи**, а не только значения. Плюс — если вернуть \`never\`, ключ **выкинется** из результата. Так делают фильтрацию:

\`\`\`ts
// сгенерировать геттеры
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// выкинуть ключ 'kind'
type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## Что сказать на собеседовании

> Mapped type перебирает ключи существующего типа и строит новый: \`{ [K in keyof T]: ... }\`. Значение обычно выражается через \`T[K]\`, поэтому связь с исходным типом не теряется. Модификаторы \`readonly\` и \`?\` можно добавлять и снимать префиксами \`+\` и \`-\` — ровно так реализованы \`Partial\`, \`Required\` и \`Readonly\`. С TS 4.1 появилось переименование ключей через \`as\`: новые имена строятся шаблонными литеральными типами. Важная деталь — гомоморфный маппинг, то есть маппинг напрямую по \`keyof T\`: он наследует исходные модификаторы и сохраняет «массивность» для массивов и кортежей.

## Ловушки

- **Гомоморфность легко потерять.** \`{ [K in keyof T]: ... }\` наследует \`readonly\` и \`?\` из \`T\`. Но стоит написать \`{ [K in Exclude<keyof T, 'a'>]: ... }\` — и модификаторы пропадут.
- **Массивы и кортежи**: гомоморфный маппинг сохраняет их природу — \`Partial<string[]>\` остаётся массивом. Неоднородный превратит их в обычный объект с ключами \`'0'\`, \`'1'\`, \`'length'\`.
- \`as\` **не убирает свойство из исходного типа**, а строит новый ключ. Чтобы убрать — верните \`never\` именно в позиции ключа, а не в позиции значения.
- \`Capitalize<string & K>\` — пересечение с \`string\` нужно потому, что ключ может быть \`number\` или \`symbol\`, а шаблонные типы работают со строками.
- **Сложные маппинги замедляют компиляцию.** Тип, который нельзя прочитать за минуту, обычно сигнал упростить модель данных.`,
      en: `## In short

**A mapped type is a \`for...of\` over a type's keys.** Take an existing type, walk over all its keys and build a new type by a rule.

The syntax: \`{ [K in keyof T]: somethingFrom T[K] }\`. It reads as "for every key \`K\` in \`T\`, produce this field".

\`\`\`ts
// turn every field into a string
type Stringify<T> = { [K in keyof T]: string };

// wrap every field in a promise
type Async<T> = { [K in keyof T]: Promise<T[K]> };
\`\`\`

## Modifiers: \`readonly\` and \`?\`

Right inside the mapping you can **add** or **remove** a modifier. Plus adds, minus removes:

\`\`\`ts
type Partial2<T>  = { [K in keyof T]+?: T[K] };        // add ?
type Required2<T> = { [K in keyof T]-?: T[K] };        // remove ?
type Mutable<T>   = { -readonly [K in keyof T]: T[K] }; // remove readonly
\`\`\`

This is literally how \`Partial\`, \`Required\` and \`Readonly\` are written in the standard library — three one-liners.

## Renaming keys with \`as\`

Since TS 4.1 you can change **the keys themselves**, not just the values. And if you return \`never\`, the key is **dropped** from the result — that's how filtering is done:

\`\`\`ts
// generate getters
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// drop the 'kind' key
type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
\`\`\`

## What to say in the interview

> A mapped type iterates the keys of an existing type and builds a new one: \`{ [K in keyof T]: ... }\`. The value is usually expressed through \`T[K]\`, so the link to the source type isn't lost. The \`readonly\` and \`?\` modifiers can be added or removed with the \`+\` and \`-\` prefixes — that's exactly how \`Partial\`, \`Required\` and \`Readonly\` are implemented. TS 4.1 added key remapping via \`as\`: you can build new names with template literal types, for example generating getters, and returning \`never\` in key position filters a property out. An important detail is homomorphic mapping — mapping directly over \`keyof T\` — which inherits the original modifiers and preserves array-ness for arrays and tuples.

## Gotchas

- **Homomorphism is easy to lose.** \`{ [K in keyof T]: ... }\` inherits \`readonly\` and \`?\` from \`T\`. Write \`{ [K in Exclude<keyof T, 'a'>]: ... }\` and the modifiers disappear.
- **Arrays and tuples**: a homomorphic mapping preserves their nature — \`Partial<string[]>\` stays an array. A non-homomorphic one turns them into a plain object with keys \`'0'\`, \`'1'\`, \`'length'\`.
- \`as\` **doesn't remove a property from the source type**, it builds a new key. To remove one, return \`never\` in the key position, not the value position.
- \`Capitalize<string & K>\` — the intersection with \`string\` is needed because a key can be a \`number\` or \`symbol\`, while template literal types work on strings.
- **Complex mappings slow compilation.** A type you can't read in a minute is usually a sign to simplify the data model.`
    }
  },
  {
    id: 'jsts-019',
    category: 'typescript',
    level: 'Hard',
    tags: ['template-literal-types', 'string-types', 'inference'],
    question: {
      ru: 'Что такое template literal types? Как с их помощью разбирать и строить строковые типы?',
      en: 'What are template literal types? How do you use them to parse and build string types?'
    },
    answer: {
      ru: `## Коротко

**Template literal types — это шаблонные строки, но для типов.** Пишутся так же, через обратные кавычки и \`\${}\`, только внутри стоят не значения, а типы.

Зачем: описать не «просто строка», а строку **определённой формы** — \`'12px'\`, \`'onClick'\`, \`'/users/:id'\`.

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`;  // 'onClick' | 'onHover'
\`\`\`

## Главное свойство: union перемножается

Если внутрь шаблона подставить union, TypeScript переберёт **все комбинации**:

\`\`\`ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Theme = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'
\`\`\`

## Четыре встроенных помощника

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` — меняют регистр прямо на уровне типов. Именно \`Capitalize\` превращает \`'click'\` в \`'Click'\` в примере выше.

## Не только строить, но и разбирать

В связке с \`infer\` шаблон работает как регулярное выражение по типам — можно **вытащить** кусок строки:

\`\`\`ts
// разбить строку по разделителю
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']
\`\`\`

Так делают типобезопасные роуты: из строки \`'/users/:id'\` тип сам достаёт имя параметра \`'id'\`.

## Где применяют

- **Роуты**: параметры пути выводятся из строки автоматически.
- **Имена событий и обработчиков**: \`on\` + имя события.
- **CSS-значения**: \`\${number}px\`, темы, названия классов.
- **Ключи в mapped types**: генерация \`getName\`, \`setName\` из \`name\`.

## Что сказать на собеседовании

> Template literal types позволяют конструировать и сопоставлять строковые литеральные типы: синтаксис как у шаблонных строк, но внутри подставляются типы. Ключевое свойство — дистрибутивность: если в шаблон подставить union, результатом будет union всех комбинаций. Есть четыре встроенных intrinsic-типа для регистра: \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`. В связке с условными типами и \`infer\` шаблоны умеют разбирать строки — так делают типобезопасные роуты с выводом имён параметров из строки пути. Ограничение — комбинаторный взрыв на больших union и лимит глубины рекурсии.

## Ловушки

- **Комбинаторный взрыв.** Два union по 50 элементов дают 2500 вариантов, три — уже 125 000, и компилятор упрётся в лимит. Шаблоны хороши для небольших конечных множеств.
- **\`\${string}\` — это не «любая строка внутри»**, а «любая подстрока», и такой тип быстро становится бесполезно широким.
- \`\${number}\` разрешает и \`'1e5'\`, и \`'-0'\`, и \`'Infinity'\` — это не «целое положительное число».
- **Рекурсивный парсинг ограничен по глубине.** Разобрать длинную строку по символу не выйдет.
- Это **только типы**. В рантайме никакой проверки нет — если строка пришла с сервера, её всё равно надо валидировать.`,
      en: `## In short

**Template literal types are template strings, but for types.** Same syntax — backticks and \`\${}\` — except what goes inside are types, not values.

What for: to describe not "just a string" but a string of a **specific shape** — \`'12px'\`, \`'onClick'\`, \`'/users/:id'\`.

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`;  // 'onClick' | 'onHover'
\`\`\`

## The key property: unions cross-multiply

Substitute a union into a template and TypeScript enumerates **every combination**:

\`\`\`ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Theme = \`\${Shade}-\${Color}\`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'
\`\`\`

## Four built-in helpers

\`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\` change case at the type level. It's \`Capitalize\` that turns \`'click'\` into \`'Click'\` in the example above.

## Not only building — parsing too

Together with \`infer\`, a template works like a regular expression over types — you can **extract** part of a string:

\`\`\`ts
// split a string by a delimiter
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>; // ['a', 'b', 'c']
\`\`\`

This is how type-safe routes work: from the string \`'/users/:id'\` the type extracts the parameter name \`'id'\` by itself.

## Where they're used

- **Routes**: path parameters inferred from the string automatically.
- **Event and handler names**: \`on\` plus the event name.
- **CSS values**: \`\${number}px\`, themes, class names.
- **Keys in mapped types**: generating \`getName\`, \`setName\` from \`name\`.

## What to say in the interview

> Template literal types let you construct and match string literal types: the syntax matches template strings, but types are substituted inside. The key property is distributivity — substituting a union produces a union of every combination. There are four built-in intrinsics for case: \`Uppercase\`, \`Lowercase\`, \`Capitalize\` and \`Uncapitalize\`. Combined with conditional types and \`infer\`, templates can not only build strings but also parse them — that's how type-safe routes derive parameter names straight from the path string. The limitations are combinatorial blow-up on large unions and a recursion depth limit; and it's all type-level only, at runtime the strings are ordinary.

## Gotchas

- **Combinatorial blow-up.** Two 50-member unions give 2500 combinations, three give 125,000 and the compiler gives up. Templates are for small finite sets.
- **\`\${string}\` isn't "any string inside"** — it's "any substring", and such a type quickly becomes uselessly wide.
- \`\${number}\` also allows \`'1e5'\`, \`'-0'\` and \`'Infinity'\` — it is not "a positive integer".
- **Recursive parsing is depth-limited.** You won't parse a long string character by character.
- These are **types only**. There's no runtime check — a string from the server still has to be validated.`
    },
    codeSnippet: `type CSSUnit = 'px' | 'rem' | '%';
type Size = \`\${number}\${CSSUnit}\`;
const a: Size = '12px';   // ok
const b: Size = '1.5rem'; // ok
// const c: Size = '12';  // error — missing unit

type EventName<T extends string> = \`on\${Capitalize<T>}\`;
type Names = EventName<'click' | 'focus'>; // 'onClick' | 'onFocus'`
  },
  {
    id: 'jsts-020',
    category: 'typescript',
    level: 'Medium',
    tags: ['utility-types', 'pick-omit', 'partial-record'],
    question: {
      ru: 'Объясните, как реализованы встроенные utility-типы Partial, Pick, Omit, Record, Exclude, ReturnType.',
      en: 'Explain how the built-in utility types Partial, Pick, Omit, Record, Exclude, ReturnType are implemented.'
    },
    answer: {
      ru: `## Коротко

Хорошая новость: **все эти «магические» типы — по одной строчке кода**, и их можно написать самому. Они собраны всего из двух кирпичей: mapped types (перебор ключей) и conditional types (тернарник с \`infer\`).

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };          // всё стало необязательным
type Required<T> = { [K in keyof T]-?: T[K] };         // сняли ?
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // добавили readonly

type Pick<T, K extends keyof T> = { [P in K]: T[P] };  // оставить только K
type Record<K extends keyof any, T> = { [P in K]: T }; // построить объект K -> T

type Exclude<T, U> = T extends U ? never : T;          // выкинуть из union
type Extract<T, U> = T extends U ? T : never;          // оставить в union

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

## Разбор по группам

**Первая группа — модификаторы.** \`Partial\`, \`Required\`, \`Readonly\` просто идут по всем ключам и добавляют или снимают \`?\`/\`readonly\`. Ничего больше.

**Вторая группа — про ключи.** \`Pick\` перебирает не все ключи, а только переданные. \`Record\` строит объект с нуля: ключи \`K\`, у всех значение \`T\`.

**Третья группа — фильтры union.** \`Exclude\` и \`Extract\` — дистрибутивные условные типы: TypeScript применяет условие к каждому члену union и склеивает результат. \`never\` в результате «исчезает», это и есть удаление.

**\`Omit\` — комбинация двух**: возьми ключи \`T\`, выкинь из них \`K\` (\`Exclude\`), и по оставшимся сделай \`Pick\`.

**Четвёртая группа — \`infer\`.** \`ReturnType\` и \`Parameters\` матчат тип функции и захватывают нужную часть.

## Ещё полезные из коробки

- \`NonNullable<T>\` — убирает \`null\` и \`undefined\`.
- \`Awaited<T>\` — рекурсивно разворачивает \`Promise\`, в том числе вложенные.
- \`InstanceType<C>\` — тип экземпляра по типу класса, \`ConstructorParameters<C>\` — аргументы конструктора.

## Что сказать на собеседовании

> Все встроенные utility-типы собраны из двух механизмов. \`Partial\`, \`Required\` и \`Readonly\` — это гомоморфные mapped types с модификаторами \`?\`, \`-?\` и \`readonly\`. \`Pick\` — маппинг по подмножеству ключей, \`Record<K, T>\` конструирует объект с ключами \`K\` и значениями \`T\`. \`Exclude\` и \`Extract\` — дистрибутивные условные типы, фильтрующие union через \`never\`. \`Omit\` собран из них: \`Pick<T, Exclude<keyof T, K>>\`, и именно поэтому он не гомоморфен и разрушает дискриминируемые union. \`ReturnType\` и \`Parameters\` — условные типы с \`infer\`, захватывающим возвращаемое значение или кортеж параметров.

## Ловушки

- **\`Omit\` ломает дискриминируемые union.** \`Omit<A | B, 'x'>\` схлопнет их в один объект, и \`switch\` по полю \`kind\` перестанет сужать тип. Нужен свой дистрибутивный вариант: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **\`Omit\` не проверяет ключи**: \`Omit<User, 'nmae'>\` с опечаткой скомпилируется молча, потому что второй параметр — \`keyof any\`, а не \`keyof T\`. У \`Pick\` такой проблемы нет.
- **\`Partial\` поверхностный.** Вложенные объекты остаются обязательными — для глубины нужен свой рекурсивный \`DeepPartial\`.
- **\`Required\` снимает \`?\`, но не убирает \`undefined\` из типа значения** — если поле объявлено как \`x?: string | undefined\`, останется \`string | undefined\`.
- \`ReturnType\` **работает с типом функции, а не с самой функцией**: нужно писать \`ReturnType<typeof fn>\`.`,
      en: `## In short

Good news: **all these "magic" types are one-liners**, and you could write them yourself. They're built from just two bricks: mapped types (walking keys) and conditional types (a ternary with \`infer\`).

\`\`\`ts
type Partial<T>  = { [K in keyof T]?: T[K] };          // everything optional
type Required<T> = { [K in keyof T]-?: T[K] };         // strip ?
type Readonly<T> = { readonly [K in keyof T]: T[K] };  // add readonly

type Pick<T, K extends keyof T> = { [P in K]: T[P] };  // keep only K
type Record<K extends keyof any, T> = { [P in K]: T }; // build K -> T

type Exclude<T, U> = T extends U ? never : T;          // drop from a union
type Extract<T, U> = T extends U ? T : never;          // keep in a union

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type ReturnType<F> = F extends (...a: any[]) => infer R ? R : never;
type Parameters<F> = F extends (...a: infer P) => any ? P : never;
\`\`\`

## Group by group

**Group one — modifiers.** \`Partial\`, \`Required\` and \`Readonly\` simply walk every key and add or remove \`?\`/\`readonly\`. Nothing more.

**Group two — about keys.** \`Pick\` iterates only the keys you passed, not all of them. \`Record\` builds an object from scratch: keys \`K\`, every value \`T\`.

**Group three — union filters.** \`Exclude\` and \`Extract\` are distributive conditional types: TypeScript applies the condition to each union member and glues the results back. \`never\` "vanishes" from the result — and that's the deletion.

**\`Omit\` is a combination of the two**: take \`T\`'s keys, drop \`K\` from them (\`Exclude\`) and \`Pick\` the rest.

**Group four — \`infer\`.** \`ReturnType\` and \`Parameters\` match a function type and capture the part they need.

## Other useful built-ins

- \`NonNullable<T>\` — removes \`null\` and \`undefined\`.
- \`Awaited<T>\` — recursively unwraps a \`Promise\`, including nested ones.
- \`InstanceType<C>\` — the instance type of a class type; \`ConstructorParameters<C>\` — its constructor arguments.

## What to say in the interview

> All the built-in utility types are assembled from two mechanisms. \`Partial\`, \`Required\` and \`Readonly\` are homomorphic mapped types with the \`?\`, \`-?\` and \`readonly\` modifiers. \`Pick\` maps over a subset of keys, \`Record<K, T>\` constructs an object with keys \`K\` and values \`T\`. \`Exclude\` and \`Extract\` are distributive conditional types that filter a union through \`never\`. \`Omit\` is built from them as \`Pick<T, Exclude<keyof T, K>>\`, which is exactly why it isn't homomorphic and breaks discriminated unions — those need a distributive helper of your own. \`ReturnType\` and \`Parameters\` are conditional types with \`infer\` capturing the return value or the tuple of parameters. Understanding these implementations lets you write your own utilities like \`DeepPartial\` or \`PickByValue\`.

## Gotchas

- **\`Omit\` breaks discriminated unions.** \`Omit<A | B, 'x'>\` collapses them into one object and a \`switch\` on \`kind\` stops narrowing. You need your own distributive version: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **\`Omit\` doesn't check keys**: \`Omit<User, 'nmae'>\` with a typo compiles silently, because the second parameter is \`keyof any\`, not \`keyof T\`. \`Pick\` doesn't have that problem.
- **\`Partial\` is shallow.** Nested objects stay required — for depth you need your own recursive \`DeepPartial\`.
- **\`Required\` removes \`?\` but doesn't remove \`undefined\` from the value type** — if a field is declared \`x?: string | undefined\`, you're left with \`string | undefined\`.
- \`ReturnType\` **works on a function type, not on a function**: you have to write \`ReturnType<typeof fn>\`.`
    },
    codeSnippet: `interface User { id: number; name: string; password: string; }

type PublicUser = Omit<User, 'password'>;          // { id; name }
type Draft = Partial<Pick<User, 'name'>>;          // { name?: string }
type ById = Record<number, User>;                  // dictionary
type Save = (u: User) => Promise<number>;
type SavedId = Awaited<ReturnType<Save>>;          // number`
  },
  {
    id: 'jsts-021',
    category: 'typescript',
    level: 'Expert',
    tags: ['variance', 'covariance', 'contravariance'],
    question: {
      ru: 'Что такое вариантность (ковариантность/контравариантность) в TypeScript? Где она проявляется?',
      en: 'What is variance (covariance/contravariance) in TypeScript? Where does it show up?'
    },
    answer: {
      ru: `## Коротко

Пусть \`Dog\` — подтип \`Animal\` (собака это животное). Вопрос вариантности: **а \`Box<Dog>\` — подтип \`Box<Animal>\`?** Ответ зависит от того, что делает обёртка со значением.

Правило на пальцах: **отдаёт наружу — ковариантно, принимает внутрь — контравариантно.**

- **Ковариантность** — направление сохраняется: \`Dog\` → \`Animal\`, значит и \`Box<Dog>\` → \`Box<Animal>\`. Так работают **возвращаемые значения** и поля на чтение.
- **Контравариантность** — направление **переворачивается**: \`Box<Animal>\` → \`Box<Dog>\`. Так работают **параметры функций**.
- **Инвариантность** — никак. Контейнер, который и читают, и пишут.
- **Бивариантность** — и туда, и туда. Удобно, но небезопасно.

## Почему параметры переворачиваются — на пальцах

Нужна функция, которая умеет обработать **собаку**. Подойдёт ли функция, которая умеет обработать **любое животное**?

Да — она справится и с собакой. То есть «обработчик животного» годится там, где просят «обработчик собаки». Направление перевернулось.

А наоборот? Функция, умеющая только собак, не справится с котом. Значит, не подходит.

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;

fd = fa; // ок — обработчик Animal справится и с Dog
fa = fd; // ошибка при strictFunctionTypes — обработчик Dog не осилит кота
\`\`\`

## Где это выстреливает в реальном коде

- Присваивание колбэков и обработчиков — самая частая «странная» ошибка про несовместимые функции.
- \`readonly T[]\` **ковариантен** — его можно только читать. Обычный изменяемый \`T[]\` в TS сделан бивариантным ради удобства, хотя строго это небезопасно.
- **Методы, объявленные через сокращённый синтаксис \`m(a): void\`, остаются бивариантными** — это намеренная дыра в системе типов ради совместимости со старым кодом и DOM API. А поле-функция \`m: (a: A) => void\` уже проверяется строго.

## Что сказать на собеседовании

> Вариантность описывает, как отношение подтипов переносится на обобщённые типы. Возвращаемые значения и поля на чтение ковариантны: направление сохраняется. Параметры функций контравариантны: направление инвертируется, потому что функция с более широким параметром безопасно подставляется туда, где ждут более узкий. Строгая проверка параметров включается флагом \`strictFunctionTypes\`, но методы, объявленные сокращённым синтаксисом, намеренно остаются бивариантными ради совместимости. С TS 4.7 вариантность параметра типа можно указать явно аннотациями \`in\`, \`out\` и \`in out\`.

## Ловушки

- **\`strictFunctionTypes\` не действует на методы.** \`interface A { on(e: Event): void }\` проверяется бивариантно, а \`interface A { on: (e: Event) => void }\` — строго. Разница только в синтаксисе объявления.
- **Изменяемый массив небезопасен по вариантности**: \`Dog[]\` присваивается в \`Animal[]\`, после чего в него можно положить кота. TypeScript это разрешает сознательно.
- **Возврат \`void\` особенный**: функцию, возвращающую что угодно, можно подставить туда, где ждут \`() => void\`. Поэтому \`arr.forEach(x => arr2.push(x))\` компилируется без ошибок.
- Аннотации \`in\`/\`out\` — **не про рантайм**, а подсказка компилятору. Ошибочная аннотация даст ошибку, а не тихую поломку.`,
      en: `## In short

Say \`Dog\` is a subtype of \`Animal\` (a dog is an animal). The variance question is: **is \`Box<Dog>\` a subtype of \`Box<Animal>\`?** The answer depends on what the wrapper does with the value.

The rule of thumb: **hands it out — covariant; takes it in — contravariant.**

- **Covariance** — direction is preserved: \`Dog\` → \`Animal\`, therefore \`Box<Dog>\` → \`Box<Animal>\`. This is how **return values** and read-only fields behave.
- **Contravariance** — direction is **flipped**: \`Box<Animal>\` → \`Box<Dog>\`. This is how **function parameters** behave.
- **Invariance** — neither way. A container that's both read and written.
- **Bivariance** — both ways. Convenient but unsafe.

## Why parameters flip — in plain terms

You need a function that can handle a **dog**. Would a function that can handle **any animal** do?

Yes — it copes with a dog too. So an "animal handler" is acceptable where a "dog handler" is asked for. The direction flipped.

And the other way round? A function that only handles dogs can't handle a cat. So it doesn't fit.

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;

fd = fa; // ok — an Animal handler copes with a Dog too
fa = fd; // error under strictFunctionTypes — a Dog handler can't take a cat
\`\`\`

## Where this bites in real code

- Assigning callbacks and handlers — the most common "weird" error about incompatible functions.
- \`readonly T[]\` is **covariant** — it can only be read. A regular mutable \`T[]\` is bivariant in TypeScript for convenience, even though that's strictly unsafe.
- **Methods declared with the shorthand syntax \`m(a): void\` stay bivariant** — a deliberate hole in the type system for compatibility with legacy code and DOM APIs. A function-typed property \`m: (a: A) => void\` is checked strictly.

## What to say in the interview

> Variance describes how the subtype relation carries over to generic types. Output positions — return values and readable fields — are covariant: the direction is preserved. Function parameters are contravariant: the direction is inverted, because a function accepting a wider type can safely be substituted where a function with a narrower parameter is expected. In TypeScript strict parameter checking is enabled by \`strictFunctionTypes\`, but methods declared with shorthand syntax deliberately stay bivariant for compatibility. \`readonly\` arrays are covariant while mutable arrays are pragmatically bivariant. Since TS 4.7 the variance of a type parameter can be stated explicitly with the \`in\`, \`out\` and \`in out\` annotations, which speeds up checking and makes the intent explicit.

## Gotchas

- **\`strictFunctionTypes\` doesn't apply to methods.** \`interface A { on(e: Event): void }\` is checked bivariantly, while \`interface A { on: (e: Event) => void }\` is checked strictly. The only difference is the declaration syntax.
- **Mutable arrays are unsound by variance**: \`Dog[]\` is assignable to \`Animal[]\`, after which you can push a cat into it. TypeScript allows this knowingly.
- **A \`void\` return is special**: a function returning anything can be substituted where \`() => void\` is expected. That's why \`arr.forEach(x => arr2.push(x))\` compiles fine.
- The \`in\`/\`out\` annotations are **not about runtime** — they're a hint to the compiler. A wrong annotation is an error, not a silent breakage.`
    }
  },
  {
    id: 'jsts-022',
    category: 'typescript',
    level: 'Hard',
    tags: ['unknown', 'any', 'never'],
    question: {
      ru: 'В чём разница между `unknown`, `any` и `never`? Когда использовать каждый?',
      en: 'What is the difference between `unknown`, `any`, and `never`? When to use each?'
    },
    answer: {
      ru: `## Коротко, одной фразой каждый

- **\`any\`** — «отстань, компилятор». Проверки выключены полностью.
- **\`unknown\`** — «я не знаю, что это. Заставь меня проверить перед использованием».
- **\`never\`** — «сюда попасть невозможно». Тип, у которого нет ни одного значения.

Аналогия: \`any\` — коробка без этикетки, которую разрешено открывать и есть содержимое вслепую. \`unknown\` — та же коробка, но её сначала обязаны вскрыть и проверить. \`never\` — коробки вообще нет.

## any — почему это опасно

\`any\` не просто «любой тип» — он **заражает** соседний код. Достали поле из \`any\` — получили \`any\`. Передали дальше — и вся цепочка потеряла типы, а ошибка вылезет уже в рантайме.

Оправданные случаи ровно два: постепенная миграция старого кода и работа с нетипизированной библиотекой. И то, лучше локально, а не в сигнатуре публичной функции.

## unknown — правильная замена any

В \`unknown\` можно **положить** что угодно, но **достать и использовать** — только после проверки. Компилятор буквально заставит написать \`typeof\`, \`instanceof\` или type guard.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');

// data.n;  // ошибка: сначала докажи, что это объект с полем n
if (typeof data === 'object' && data !== null && 'n' in data) {
  // здесь data уже сужен, работать можно
}
\`\`\`

Правильные места для \`unknown\`: результат \`JSON.parse\`, данные из сети, \`catch (e: unknown)\`, аргументы generic-утилит.

## never — «такого не бывает»

\`never\` появляется сам:

- у функции, которая **никогда не возвращает** — бросает исключение или крутит бесконечный цикл;
- в **недостижимой ветке** кода;
- как результат **невозможного пересечения**: \`string & number\`.

Главное практическое применение — **проверка полноты \`switch\`**. Если в union добавят новый вариант, а обработку забудут, код перестанет компилироваться:

\`\`\`ts
type Cmd = { t: 'a' } | { t: 'b' };

function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: {
      const _exhaustive: never = c;  // ошибка, если добавили новый вариант
      return _exhaustive;
    }
  }
}
\`\`\`

## Что сказать на собеседовании

> \`any\` полностью отключает проверку типов и заражает соседний код, поэтому это escape hatch для миграции, а не рабочий инструмент. \`unknown\` — типобезопасный верхний тип: принять можно любое значение, но использовать без сужения нельзя — компилятор потребует type guard. Это правильный тип для данных из внешнего мира — JSON, сети, \`catch\`. \`never\` — нижний тип, не имеющий значений: он возникает у функций, которые не возвращают управление, и в недостижимых ветках. \`never\` присваивается любому типу, но в него — ничего, и на этом строится проверка полноты \`switch\` в ветке \`default\`.

## Ловушки

- \`unknown\` **поглощает union**: \`unknown | string\` — это просто \`unknown\`. А \`never\` наоборот исчезает: \`never | string\` — это \`string\`.
- **В \`catch\` по умолчанию \`any\`.** Флаг \`useUnknownInCatchVariables\` (входит в \`strict\`) делает его \`unknown\`, и это правильно — брошено может быть что угодно, не только \`Error\`.
- **\`any\` тихо проходит проверки**: \`const x: any = ...; x.foo.bar.baz\` компилируется и падает в рантайме. Именно поэтому в линтерах есть правило \`no-explicit-any\`.
- **Массив \`never[]\`** — частый признак ошибки вывода: обычно это пустой массив без аннотации, в который потом ничего нельзя положить.
- Функция с типом возврата \`void\` и функция с \`never\` — **разные вещи**: \`void\` возвращает управление, \`never\` — нет.`,
      en: `## In short, one line each

- **\`any\`** — "leave me alone, compiler". Checking is switched off entirely.
- **\`unknown\`** — "I don't know what this is. Force me to check before I use it."
- **\`never\`** — "getting here is impossible". A type with no values at all.

The analogy: \`any\` is an unlabelled box you're allowed to open and eat from blindly. \`unknown\` is the same box, but you're required to open and inspect it first. \`never\` is a box that doesn't exist.

## any — why it's dangerous

\`any\` isn't just "any type" — it **infects** the surrounding code. Read a field off an \`any\` and you get \`any\`. Pass it along and the whole chain loses its types, with the error surfacing at runtime.

There are exactly two justified cases: gradually migrating legacy code, and working with an untyped library. Even then, keep it local rather than in the signature of a public function.

## unknown — the correct replacement for any

You can **put** anything into an \`unknown\`, but you can only **take it out and use it** after a check. The compiler literally forces you to write \`typeof\`, \`instanceof\` or a type guard.

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');

// data.n;  // error: prove it's an object with an n field first
if (typeof data === 'object' && data !== null && 'n' in data) {
  // data is narrowed here and can be used
}
\`\`\`

The right places for \`unknown\`: the result of \`JSON.parse\`, network data, \`catch (e: unknown)\`, arguments of generic utilities.

## never — "this can't happen"

\`never\` appears on its own:

- for a function that **never returns** — it throws or loops forever;
- in an **unreachable branch**;
- as the result of an **impossible intersection**: \`string & number\`.

Its main practical use is **exhaustiveness checking on a \`switch\`**. If someone adds a new union member and forgets to handle it, the code stops compiling:

\`\`\`ts
type Cmd = { t: 'a' } | { t: 'b' };

function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: {
      const _exhaustive: never = c;  // errors if a new variant is added
      return _exhaustive;
    }
  }
}
\`\`\`

## What to say in the interview

> \`any\` switches type checking off completely and infects the surrounding code, so it's an escape hatch for migrations and untyped libraries rather than a working tool. \`unknown\` is the type-safe top type: any value can be assigned to it, but it can't be used without narrowing — the compiler demands a type guard. That makes it the right type for data from the outside world: JSON, the network, \`catch\`. \`never\` is the bottom type with no values: it arises for functions that never return, in unreachable branches and from impossible intersections. \`never\` is assignable to any type but nothing is assignable to it, and that's what exhaustiveness checking of a \`switch\` is built on via a \`never\`-typed variable in the default branch.

## Gotchas

- \`unknown\` **absorbs a union**: \`unknown | string\` is just \`unknown\`. \`never\` does the opposite and disappears: \`never | string\` is \`string\`.
- **\`catch\` gives \`any\` by default.** The \`useUnknownInCatchVariables\` flag (part of \`strict\`) makes it \`unknown\`, which is correct — anything can be thrown, not just an \`Error\`.
- **\`any\` sails through checks**: \`const x: any = ...; x.foo.bar.baz\` compiles and blows up at runtime. That's exactly why linters have \`no-explicit-any\`.
- **A \`never[]\` array** is a common sign of a bad inference: usually an empty array without an annotation, into which nothing can then be pushed.
- A function returning \`void\` and one returning \`never\` are **different things**: \`void\` returns control, \`never\` doesn't.`
    },
    codeSnippet: `function safe(input: unknown) {
  // unknown forces a check before use
  if (typeof input === 'string') return input.trim();
  if (Array.isArray(input)) return input.length;
  return 0;
}

// never as an exhaustiveness guard
type Cmd = { t: 'a' } | { t: 'b' };
function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: { const _: never = c; return _; } // errors if a case is added
  }
}`
  },
  {
    id: 'jsts-023',
    category: 'typescript',
    level: 'Hard',
    tags: ['type-narrowing', 'type-guards', 'control-flow'],
    question: {
      ru: 'Как работает сужение типов (narrowing) и пользовательские type guards? Что такое анализ потока управления?',
      en: 'How does type narrowing and custom type guards work? What is control-flow analysis?'
    },
    answer: {
      ru: `## Коротко

**Сужение (narrowing) — это когда компилятор следит за вашими проверками и уточняет тип внутри ветки.**

Было \`x: string | number\`. Написали \`if (typeof x === 'string')\` — и **внутри этого if** компилятор уже считает, что \`x\` это \`string\`, а в \`else\` — \`number\`. Никаких приведений писать не надо.

Механизм, который это делает, называется **анализ потока управления (control-flow analysis)**: TypeScript мысленно проходит по всем веткам кода и ведёт для каждой свой «текущий тип» переменной.

## Из чего компилятор понимает сужение

- \`typeof x === 'string'\` — для примитивов.
- \`x instanceof Date\` — для классов.
- \`'prop' in obj\` — по наличию свойства.
- Проверки на \`null\`/\`undefined\` и на truthy: \`if (!x) return;\`.
- Сравнение с литералом: \`if (s.kind === 'circle')\` — для дискриминируемых union.
- \`Array.isArray(x)\`.
- Просто присваивание: после \`x = 'abc'\` тип уточняется по значению.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;         // отсекли null и undefined одной проверкой
  if (typeof x === 'string') {
    x.toUpperCase();             // здесь x: string
  } else {
    x.toFixed(2);                // здесь x: number
  }
}
\`\`\`

## Свой type guard — когда встроенных не хватает

Если проверка сложная, её выносят в функцию с особым типом возврата — \`arg is T\`. Это называется **предикат типа**. Вернула \`true\` — компилятор сузит аргумент в вызывающем коде.

\`\`\`ts
interface Cat { meow(): void }

function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}

if (isCat(pet)) pet.meow();   // здесь pet: Cat
\`\`\`

Важно: **за правильность отвечаете вы**. Компилятор верит предикату на слово и не проверяет тело функции.

## Assertion-функции — сужение без \`if\`

\`asserts x is T\` бросает исключение, если условие не выполнено, и **сужает тип после вызова**:

\`\`\`ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

assertIsString(input);
input.toUpperCase();   // дальше по коду input уже string
\`\`\`

## Что сказать на собеседовании

> TypeScript выполняет анализ потока управления: он отслеживает тип переменной по ветвям и сужает его после проверок — \`typeof\`, \`instanceof\`, оператор \`in\`, проверки на null, сравнение с литералом дискриминанта. Когда встроенных проверок не хватает, пишут пользовательский type guard — функцию с возвращаемым типом \`arg is T\`; компилятор доверяет предикату и сужает аргумент на месте вызова, поэтому корректность на разработчике. Важная практическая деталь — сужение теряется после \`await\` и внутри колбэков, потому что переменная могла измениться; лечится копированием в \`const\`.

## Ловушки

- **Сужение теряется в колбэках и после \`await\`.** Компилятор не может доказать, что \`this.user\` не изменился. Лечение: \`const user = this.user; if (!user) return;\` — дальше работать с локальной константой.
- **Только \`let\`/\`var\` теряют сужение при присваивании.** Для \`const\` тип фиксируется навсегда.
- **Опциональное поле и \`in\`**: \`'prop' in obj\` сужает, но если свойство объявлено необязательным, значением всё ещё может быть \`undefined\`.
- **Предикат можно написать неверно**, и компилятор промолчит: \`function isCat(a: unknown): a is Cat { return true; }\` — законно и опасно.
- В TS 5.5 простые предикаты **выводятся автоматически**: \`arr.filter(x => x !== null)\` теперь правильно убирает \`null\` из типа, раньше приходилось писать guard руками.`,
      en: `## In short

**Narrowing is when the compiler watches your checks and refines the type inside a branch.**

You had \`x: string | number\`. You wrote \`if (typeof x === 'string')\` — and **inside that if** the compiler already treats \`x\` as a \`string\`, and as a \`number\` in the \`else\`. No casts required.

The machinery behind it is **control-flow analysis**: TypeScript mentally walks every branch of the code and keeps a "current type" for the variable in each one.

## What the compiler recognises as narrowing

- \`typeof x === 'string'\` — for primitives.
- \`x instanceof Date\` — for classes.
- \`'prop' in obj\` — by property presence.
- \`null\`/\`undefined\` and truthiness checks: \`if (!x) return;\`.
- Comparison with a literal: \`if (s.kind === 'circle')\` — for discriminated unions.
- \`Array.isArray(x)\`.
- Plain assignment: after \`x = 'abc'\` the type is refined by the value.

\`\`\`ts
function f(x: string | number | null) {
  if (x == null) return;         // both null and undefined ruled out in one check
  if (typeof x === 'string') {
    x.toUpperCase();             // x is string here
  } else {
    x.toFixed(2);                // x is number here
  }
}
\`\`\`

## A custom type guard — when the built-ins aren't enough

If the check is complex, you move it into a function with a special return type — \`arg is T\`. That's a **type predicate**. Return \`true\` and the compiler narrows the argument at the call site.

\`\`\`ts
interface Cat { meow(): void }

function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null && 'meow' in a;
}

if (isCat(pet)) pet.meow();   // pet is Cat here
\`\`\`

Important: **you are responsible for correctness.** The compiler takes the predicate at its word and never checks the body.

## Assertion functions — narrowing without an \`if\`

\`asserts x is T\` throws if the condition doesn't hold and **narrows the type from then on**:

\`\`\`ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

assertIsString(input);
input.toUpperCase();   // input is a string for the rest of the code
\`\`\`

## What to say in the interview

> TypeScript performs control-flow analysis: it tracks a variable's type per branch and narrows it after checks — \`typeof\`, \`instanceof\`, the \`in\` operator, null and truthiness checks, comparison with a discriminant literal, and assignment. When the built-in checks aren't enough you write a custom type guard — a function with the return type \`arg is T\`; the compiler trusts the predicate and narrows the argument at the call site, so correctness is on the developer. There are also assertion functions with the signature \`asserts x is T\`: they throw on a mismatch and narrow the type for all subsequent code without a nested \`if\`. An important practical detail is that narrowing is lost after \`await\` and inside callbacks, because the variable could have changed; the fix is to copy it into a \`const\`.

## Gotchas

- **Narrowing is lost in callbacks and after \`await\`.** The compiler can't prove \`this.user\` hasn't changed. The fix: \`const user = this.user; if (!user) return;\` and work with the local constant.
- **Only \`let\`/\`var\` lose narrowing on assignment.** For a \`const\` the type is fixed for good.
- **Optional properties and \`in\`**: \`'prop' in obj\` narrows, but if the property is optional the value can still be \`undefined\`.
- **A predicate can simply be wrong** and the compiler stays quiet: \`function isCat(a: unknown): a is Cat { return true; }\` is legal and dangerous.
- In TS 5.5 simple predicates are **inferred automatically**: \`arr.filter(x => x !== null)\` now correctly removes \`null\` from the type, which previously needed a hand-written guard.`
    }
  },
  {
    id: 'jsts-024',
    category: 'typescript',
    level: 'Medium',
    tags: ['discriminated-unions', 'tagged-unions', 'exhaustiveness'],
    question: {
      ru: 'Что такое discriminated unions и как обеспечить проверку полноты (exhaustiveness) обработки?',
      en: 'What are discriminated unions and how do you ensure exhaustiveness of handling?'
    },
    answer: {
      ru: `## Коротко

**Discriminated union — это union объектов, у которых есть одно общее поле-метка** (\`kind\`, \`type\`, \`status\`) с литеральным значением. Проверили метку — компилятор сам понял, с каким именно вариантом вы работаете.

Аналогия: посылки на складе. У каждой наклейка «хрупкое», «продукты», «документы». Прочитали наклейку — знаете, что внутри и что с этим делать.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // здесь есть radius
    case 'square': return s.side ** 2;             // здесь есть side
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

Обратите внимание: **никаких \`as\` и проверок на \`undefined\`**. Компилятор сам знает, какие поля доступны в каждой ветке.

## Проверка полноты (exhaustiveness)

Проблема: через полгода в union добавят \`{ kind: 'triangle' }\`, а обработку забудут. Хочется, чтобы **код перестал компилироваться**, а не тихо возвращал \`undefined\`.

Приём: в \`default\` присвоить значение в переменную типа \`never\`.

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default: {
      const _exhaustive: never = s;  // ошибка компиляции, если забыли вариант
      return _exhaustive;
    }
  }
}
\`\`\`

Почему работает: если все варианты разобраны, до \`default\` доходит только \`never\` — и присваивание законно. Забыли вариант — в \`default\` приходит реальный объект, а его в \`never\` присвоить нельзя.

## Почему это сильный приём

- **Невалидные состояния становятся невыразимыми.** Нельзя случайно создать «загрузка завершена, но данных нет, и ошибка тоже есть».
- **Рефакторинг безопасен**: добавили вариант — компилятор подсветил все места, где его надо обработать.
- **Проще, чем иерархия классов**: данные плоские, сериализуются в JSON, работают через границу сети.

Классическое применение — состояние UI: \`{ status: 'loading' } | { status: 'success', data } | { status: 'error', error }\`. И, конечно, экшены в Redux/NgRx.

## Что сказать на собеседовании

> Discriminated union — это объединение объектных типов с общим литеральным полем-дискриминантом. По значению этого поля TypeScript автоматически сужает тип до конкретного члена union, поэтому внутри ветки доступны именно его поля и никаких приведений не нужно. Чтобы гарантировать обработку всех вариантов, в ветку \`default\` добавляют присваивание в переменную типа \`never\`: если все случаи разобраны, туда приходит \`never\` и код компилируется, а если в union добавили новый вариант — получаем ошибку компиляции. Это делает рефакторинг безопасным: невалидные состояния становятся невыразимы.

## Ловушки

- **Дискриминант должен быть литеральным типом.** Если написать \`kind: string\`, сужение не заработает. В объектах-литералах помогает \`as const\`.
- **\`Omit\` разрушает дискриминируемость** — union схлопнется в один объект. Нужен дистрибутивный вариант через \`T extends any ? Omit<T, K> : never\`.
- **Возвращать значение из \`default\` обязательно** — иначе при включённом \`noImplicitReturns\` будет другая ошибка, маскирующая настоящую.
- **Опциональные поля вместо union — антипаттерн**: \`{ loading?: boolean; data?: T; error?: E }\` допускает бессмысленные комбинации, и компилятор их не поймает.
- Тот же приём с \`never\` работает не только в \`switch\`, но и в цепочке \`if/else if\`.`,
      en: `## In short

**A discriminated union is a union of objects that share one tag field** (\`kind\`, \`type\`, \`status\`) with a literal value. Check the tag and the compiler knows exactly which variant you're holding.

The analogy: parcels in a warehouse. Each has a label — "fragile", "food", "documents". Read the label and you know what's inside and what to do with it.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // radius exists here
    case 'square': return s.side ** 2;             // side exists here
    case 'rect':   return s.w * s.h;
  }
}
\`\`\`

Note: **no \`as\` casts and no undefined checks**. The compiler knows which fields are available in each branch.

## Exhaustiveness checking

The problem: six months later someone adds \`{ kind: 'triangle' }\` and forgets the handler. You want the code to **stop compiling** rather than quietly return \`undefined\`.

The trick: in the \`default\` branch, assign the value to a variable typed \`never\`.

\`\`\`ts
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
    case 'rect':   return s.w * s.h;
    default: {
      const _exhaustive: never = s;  // compile error if a variant is missed
      return _exhaustive;
    }
  }
}
\`\`\`

Why it works: if every variant is handled, only \`never\` can reach \`default\`, and the assignment is legal. Miss one and a real object arrives, which can't be assigned to \`never\`.

## Why the pattern is powerful

- **Invalid states become unrepresentable.** You can't accidentally build "loading finished, but there's no data and also an error".
- **Refactoring is safe**: add a variant and the compiler flags every place that must handle it.
- **Simpler than a class hierarchy**: the data is flat, serialises to JSON and travels across the network.

The classic use is UI state: \`{ status: 'loading' } | { status: 'success', data } | { status: 'error', error }\`. And, of course, Redux/NgRx actions.

## What to say in the interview

> A discriminated union is a union of object types sharing a common literal discriminant field. By the value of that field TypeScript automatically narrows to the specific member, so inside a branch exactly its fields are available and no casts are needed. To guarantee every variant is handled, the \`default\` branch assigns the value to a \`never\`-typed variable: if all cases are covered, only \`never\` reaches it and the code compiles, but adding a new variant produces a compile error. That makes refactoring safe and lets you model states so that invalid combinations are simply inexpressible — the canonical example being data loading: loading, success with data, error with a reason.

## Gotchas

- **The discriminant must be a literal type.** Write \`kind: string\` and narrowing stops working. For object literals, \`as const\` helps.
- **\`Omit\` destroys discriminability** — the union collapses into a single object. You need the distributive variant, \`T extends any ? Omit<T, K> : never\`.
- **You must return from \`default\`** — otherwise \`noImplicitReturns\` produces a different error that masks the real one.
- **Optional fields instead of a union are an anti-pattern**: \`{ loading?: boolean; data?: T; error?: E }\` permits nonsensical combinations that the compiler can't catch.
- The same \`never\` trick works in an \`if/else if\` chain, not just in a \`switch\`.`
    },
    codeSnippet: `type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', '); // s.data is available here
    case 'error':   return s.message;          // s.message is available here
  }
}`
  },
  {
    id: 'jsts-025',
    category: 'typescript',
    level: 'Hard',
    tags: ['satisfies', 'type-inference', 'const-assertion'],
    question: {
      ru: 'Что делает оператор `satisfies` и чем он отличается от аннотации типа и `as`?',
      en: 'What does the `satisfies` operator do and how does it differ from a type annotation and `as`?'
    },
    answer: {
      ru: `## Коротко

Три способа связать значение с типом — и все три делают разное:

- **\`const x: T = {...}\`** — проверит **и заменит** выведенный тип на \`T\`. Точность теряется.
- **\`{...} as T\`** — ничего толком не проверит, просто **навяжет** тип. Опасно.
- **\`{...} satisfies T\`** — **проверит и оставит** ваш точный выведенный тип. То, что нужно почти всегда.

Формула: **\`satisfies\` = «проверь, но не порти мой тип».**

## Пример, где разница видна сразу

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// 1. Аннотация — потеряли конкретику
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
a.primary;        // тип Color, а не 'red'
a.whatever;       // ошибки нет — ключ-то string!

// 2. satisfies — и проверка, и точность
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;

b.primary;        // тип 'red' — литерал сохранён
b.whatever;       // ошибка: такого ключа нет
\`\`\`

Разница в двух местах: значение осталось литералом \`'red'\`, и набор ключей известен точно.

## Когда что использовать

- **\`satisfies\`** — конфиги, словари, палитры тем, карты роутов, маппинги экшенов. Везде, где нужны и валидация формы, и точные ключи/значения.
- **\`as const satisfies T\`** — самая сильная связка: \`as const\` делает всё максимально узким и \`readonly\`, а \`satisfies\` проверяет форму.
- **Аннотация \`: T\`** — когда точность не нужна и хочется, чтобы тип переменной был именно \`T\` (например, публичное API).
- **\`as T\`** — только в крайних случаях, когда вы действительно знаете больше компилятора и это невозможно доказать.

## Что сказать на собеседовании

> \`satisfies\` появился в TypeScript 4.9 и решает конфликт между проверкой и точностью вывода. Аннотация типа проверяет значение, но расширяет его тип до объявленного, из-за чего теряются литеральные типы и точный набор ключей. \`as\` — утверждение, а не проверка. \`satisfies\` проверяет, что выражение присваиваемо к типу, но оставляет самый узкий выведенный тип. Практически это идеально для конфигов: форма валидируется, но сохраняются литеральные значения и конкретные ключи, а опечатка в ключе становится ошибкой компиляции. Часто используется в связке \`as const satisfies T\`.

## Ловушки

- **Порядок важен**: \`as const satisfies T\`, а не наоборот. Сначала фиксируем литералы, потом проверяем форму.
- \`satisfies\` **не меняет тип переменной**, поэтому если вам нужно именно \`T\` в сигнатуре — используйте аннотацию.
- **\`as\` умеет проверять только «родственные» типы.** Между совсем несвязанными он потребует \`as unknown as T\` — и это отличный сигнал, что вы делаете что-то не то.
- \`as const\` даёт \`readonly\`-свойства. Если объект потом мутируют, будет ошибка — и обычно это правильно.
- В старых версиях TypeScript (до 4.9) \`satisfies\` нет — на проекте с древней версией придётся обходиться дженерик-функцией-хелпером.`,
      en: `## In short

Three ways to tie a value to a type — and all three do something different:

- **\`const x: T = {...}\`** — checks **and replaces** the inferred type with \`T\`. Precision is lost.
- **\`{...} as T\`** — checks almost nothing, just **forces** the type. Dangerous.
- **\`{...} satisfies T\`** — **checks and keeps** your precise inferred type. What you want almost every time.

The formula: **\`satisfies\` = "check it, but don't ruin my type".**

## An example where the difference is immediately visible

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

// 1. Annotation — precision lost
const a: Record<string, Color> = { primary: 'red', accent: 'green' };
a.primary;        // type Color, not 'red'
a.whatever;       // no error — the key is just a string!

// 2. satisfies — checked and precise
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;

b.primary;        // type 'red' — the literal is preserved
b.whatever;       // error: no such key
\`\`\`

The difference shows in two places: the value stays the literal \`'red'\`, and the exact set of keys is known.

## When to use what

- **\`satisfies\`** — configs, dictionaries, theme palettes, route maps, action maps. Anywhere you need both shape validation and exact keys and values.
- **\`as const satisfies T\`** — the strongest combination: \`as const\` makes everything as narrow and \`readonly\` as possible, \`satisfies\` validates the shape.
- **The annotation \`: T\`** — when precision doesn't matter and you want the variable's type to actually be \`T\` (a public API, for instance).
- **\`as T\`** — only as a last resort, when you genuinely know more than the compiler and can't prove it.

## What to say in the interview

> \`satisfies\` arrived in TypeScript 4.9 and resolves the conflict between checking and inference precision. A type annotation checks the value but widens its type to the declared one, so literal types and the exact set of keys are lost. \`as\` does the opposite and checks almost nothing — it's an assertion, not a check. \`satisfies\` verifies that the expression is assignable to the type while keeping the narrowest inferred type. In practice that's ideal for configs and dictionaries: the shape is validated, but literal values and concrete keys are preserved, and an extra or misspelled key becomes a compile error. It's often used in the combination \`as const satisfies T\`.

## Gotchas

- **Order matters**: \`as const satisfies T\`, not the other way round. Freeze the literals first, then validate the shape.
- \`satisfies\` **doesn't change the variable's type**, so if you need the variable to actually be \`T\`, use an annotation.
- **\`as\` can only cast between "related" types.** For entirely unrelated ones it demands \`as unknown as T\` — an excellent signal that you're doing something wrong.
- \`as const\` produces \`readonly\` properties. If the object is mutated later you get an error — and usually that's correct.
- In older TypeScript (before 4.9) there's no \`satisfies\`; on an ancient project you have to fake it with a generic helper function.`
    }
  },
  {
    id: 'jsts-026',
    category: 'typescript',
    level: 'Hard',
    tags: ['declaration-merging', 'module-augmentation', 'interfaces'],
    question: {
      ru: 'Что такое declaration merging и module augmentation в TypeScript? Где это применяется?',
      en: 'What is declaration merging and module augmentation in TypeScript? Where is it used?'
    },
    answer: {
      ru: `## Коротко

**Declaration merging — это когда два объявления с одинаковым именем склеиваются в одно.**

Объявили \`interface User\` дважды — TypeScript не ругается, а просто складывает поля вместе. Это не баг, а специально сделанная возможность.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }

const u: User = { id: 1, name: 'Ann' };  // нужны оба поля
\`\`\`

**Module augmentation — это то же самое, но применённое к чужому модулю.** Способ добавить свойство в типы сторонней библиотеки, не трогая её исходники.

## Что сливается, а что нет

Сливается:

- **interface + interface** — поля объединяются.
- **namespace + namespace** — члены объединяются.
- **namespace + функция / класс / enum** — так добавляют статические свойства и вложенные типы.
- **enum + enum**.

**Не сливается**: \`type\`-алиасы. Второй \`type User = ...\` — сразу ошибка «Duplicate identifier». Это, кстати, главный практический ответ на вопрос «чем \`interface\` отличается от \`type\`».

## Как расширить чужие типы

\`\`\`ts
// Глобальный объект
declare global {
  interface Window { __APP_VERSION__: string; }
}

// Модуль сторонней библиотеки
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}

export {};   // важно: файл должен быть модулем
\`\`\`

Типичные места, где это встречается:

- добавить поле в \`Request\` у Express или в \`ComponentCustomProperties\` у Vue;
- расширить \`Window\`, \`globalThis\`, \`ProcessEnv\` под переменные окружения;
- описать типы для пакета, у которого их нет вообще (ambient-объявление).

## Что сказать на собеседовании

> Declaration merging — способность TypeScript объединять несколько объявлений с одним именем в одну сущность. Сливаются интерфейсы, namespace между собой и с функциями, классами и enum; type-алиасы не сливаются, и это ключевое практическое различие между \`interface\` и \`type\`. Module augmentation — применение того же механизма к внешнему модулю через \`declare module\`: так добавляют поля в типы сторонних библиотек, например \`userId\` в \`Request\` Express. Важное требование — файл с аугментацией должен быть модулем, то есть содержать импорт или экспорт, иначе \`declare module\` объявит новый ambient-модуль.

## Ловушки

- **Забыли \`export {}\`** — и вместо расширения существующего модуля вы объявили новый пустой модуль с тем же именем. Ошибка, на которой теряют часы.
- **Конфликтующие поля дают ошибку компиляции**: нельзя объявить \`id: number\` в одном интерфейсе и \`id: string\` в другом. Это защита, а не ограничение.
- **Порядок объявления влияет на перегрузки**: при слиянии интерфейсов более поздние объявления идут раньше в списке перегрузок.
- **Расширение глобальных типов — это на весь проект.** Добавили \`Window.foo\` — компилятор перестанет ловить опечатки в других местах.
- \`namespace\` в современном коде почти не используют — модули заменили его. Знать про слияние стоит для чтения старого кода и \`.d.ts\`-файлов.`,
      en: `## In short

**Declaration merging is when two declarations with the same name are glued into one.**

Declare \`interface User\` twice and TypeScript doesn't complain — it simply combines the fields. That's not a bug, it's a deliberate feature.

\`\`\`ts
interface User { id: number; }
interface User { name: string; }

const u: User = { id: 1, name: 'Ann' };  // both fields required
\`\`\`

**Module augmentation is the same thing applied to somebody else's module.** It's how you add a property to a third-party library's types without touching its source.

## What merges and what doesn't

Merges:

- **interface + interface** — fields are combined.
- **namespace + namespace** — members are combined.
- **namespace + function / class / enum** — this is how static properties and nested types are added.
- **enum + enum**.

**Doesn't merge**: \`type\` aliases. A second \`type User = ...\` is an immediate "Duplicate identifier" error. This, incidentally, is the main practical answer to "what's the difference between \`interface\` and \`type\`".

## How to extend someone else's types

\`\`\`ts
// The global object
declare global {
  interface Window { __APP_VERSION__: string; }
}

// A third-party library module
import 'express';
declare module 'express' {
  interface Request { userId?: string; }
}

export {};   // important: the file must be a module
\`\`\`

Typical places you meet this:

- adding a field to Express's \`Request\` or Vue's \`ComponentCustomProperties\`;
- extending \`Window\`, \`globalThis\` or \`ProcessEnv\` for environment variables;
- declaring types for a package that ships none (an ambient declaration).

## What to say in the interview

> Declaration merging is TypeScript's ability to combine several declarations of the same name into one entity. Interfaces merge, namespaces merge with each other and with functions, classes and enums; type aliases don't merge, and that's the key practical difference between \`interface\` and \`type\`. Module augmentation applies the same mechanism to an external module via \`declare module\`: that's how fields are added to third-party types, for example \`userId\` on Express's \`Request\`, or how the global \`Window\` is extended. An important requirement is that the augmenting file must be a module — it needs an import or export — otherwise \`declare module\` is treated as declaring a new ambient module. It should be used sparingly: extending global types makes code harder to reason about.

## Gotchas

- **Forgetting \`export {}\`** means that instead of augmenting an existing module you declared a brand-new empty one with the same name. An error that costs hours.
- **Conflicting fields are a compile error**: you can't declare \`id: number\` in one interface and \`id: string\` in another. That's protection, not a limitation.
- **Declaration order affects overloads**: when interfaces merge, later declarations come earlier in the overload list.
- **Extending global types affects the whole project.** Add \`Window.foo\` and the compiler stops catching typos elsewhere.
- \`namespace\` is barely used in modern code — modules replaced it. Merging is worth knowing for reading legacy code and \`.d.ts\` files.`
    },
    codeSnippet: `// namespace + function merging: add static-like members and nested types
function api(path: string) { return fetch(path); }
namespace api {
  export const base = '/v1';
  export interface Options { retries: number; }
}
api('/users');
api.base;             // '/v1'
const o: api.Options = { retries: 3 };`
  },
  {
    id: 'jsts-027',
    category: 'typescript',
    level: 'Expert',
    tags: ['decorators', 'tc39-decorators', 'metadata'],
    question: {
      ru: 'Чем отличаются «старые» декораторы TS (experimentalDecorators) от стандарта TC39 Stage 3?',
      en: 'How do the "legacy" TS decorators (experimentalDecorators) differ from the TC39 Stage 3 standard?'
    },
    answer: {
      ru: `## Коротко

Декоратор — это функция-обёртка, которую вешают на класс, метод или поле, чтобы что-то к ним добавить.

Проблема в том, что **сейчас существуют две несовместимые версии декораторов**:

- **Legacy** — старый черновик, включается флагом \`experimentalDecorators\`. На нём живут Angular, NestJS, TypeORM.
- **TC39 Stage 3** — новый стандарт, работает в TS 5.0+ **без флага**, скоро войдёт в сам JavaScript.

Различаются они прежде всего **сигнатурой**: что именно приходит в декоратор аргументами.

## Legacy: три позиционных аргумента

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

Две вещи, которые есть только здесь и очень важны:

1. **Декораторы параметров** — \`constructor(@Inject(TOKEN) dep)\`. В новом стандарте их пока нет.
2. **Эмиссия метаданных типов**: с \`emitDecoratorMetadata\` и \`reflect-metadata\` компилятор записывает в рантайм типы параметров конструктора (\`design:paramtypes\`). **На этом построен DI в Angular и Nest** — иначе фреймворк не знал бы, какой сервис подставить.

## TC39: значение + контекст

\`\`\`ts
function log(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Здесь всего два аргумента: **декорируемое значение** и **контекст**. В контексте лежат \`kind\` (метод, поле, геттер...), \`name\`, флаги \`static\`/\`private\` и метод \`addInitializer\` для кода, выполняемого при создании экземпляра.

Чего пока нет: декораторов параметров и встроенных метаданных о типах (для этого идёт отдельный proposal \`Symbol.metadata\`).

## Что сказать на собеседовании

> Сейчас сосуществуют два несовместимых дизайна декораторов. Legacy включается флагом \`experimentalDecorators\` и основан на раннем черновике: декоратор метода получает \`target\`, \`propertyKey\` и дескриптор, поддерживаются декораторы параметров, а вместе с \`emitDecoratorMetadata\` и \`reflect-metadata\` в рантайм эмитятся типы. Именно на этом построен DI в Angular и NestJS. Стандартные декораторы TC39 Stage 3 доступны с TypeScript 5.0 без флага: декоратор получает значение и объект контекста с \`kind\`, \`name\` и \`addInitializer\`. Смешивать две системы в одном проекте нельзя — флаг переключает семантику целиком.

## Ловушки

- **Смешать нельзя.** Флаг \`experimentalDecorators\` переключает семантику для всего проекта. Миграция — это переписывание всех сигнатур декораторов.
- **Angular исторически завязан на legacy** из-за \`emitDecoratorMetadata\`; в новых версиях фреймворк уходит от декораторов в сторону функций вроде \`inject()\`, \`input()\`, \`signal()\`.
- **\`reflect-metadata\` — это не часть языка**, а полифилл-библиотека. Забыли импортировать в точке входа — DI ломается с невнятной ошибкой.
- **Декораторы полей в двух системах ведут себя по-разному** относительно момента инициализации — код почти никогда не переносится копипастой.
- Декоратор **выполняется один раз при объявлении класса**, а не при каждом вызове метода. Частая ошибка — положить туда логику «на каждый вызов».`,
      en: `## In short

A decorator is a wrapper function you attach to a class, method or field to add something to it.

The problem is that **two incompatible versions of decorators currently exist**:

- **Legacy** — the old draft, enabled by the \`experimentalDecorators\` flag. Angular, NestJS and TypeORM live on it.
- **TC39 Stage 3** — the new standard, available in TS 5.0+ **without any flag**, and soon part of JavaScript itself.

They differ primarily in **the signature**: what exactly arrives as arguments.

## Legacy: three positional arguments

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) {
    console.log(key, a);
    return orig.apply(this, a);
  };
}
\`\`\`

Two things exist only here, and they matter a lot:

1. **Parameter decorators** — \`constructor(@Inject(TOKEN) dep)\`. The new standard doesn't have them yet.
2. **Type metadata emission**: with \`emitDecoratorMetadata\` and \`reflect-metadata\`, the compiler writes constructor parameter types into the runtime (\`design:paramtypes\`). **That's what DI in Angular and Nest is built on** — otherwise the framework wouldn't know which service to inject.

## TC39: value plus context

\`\`\`ts
function log(orig: any, ctx: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log(ctx.name, args);
    return orig.call(this, ...args);
  };
}
\`\`\`

Only two arguments here: **the decorated value** and **the context**. The context holds \`kind\` (method, field, getter…), \`name\`, the \`static\`/\`private\` flags and an \`addInitializer\` method for code that runs on instance creation.

What's missing so far: parameter decorators and built-in type metadata (a separate \`Symbol.metadata\` proposal covers that).

## What to say in the interview

> Two incompatible decorator designs coexist today. The legacy one is enabled by \`experimentalDecorators\` and is based on the early draft: a method decorator receives \`target\`, \`propertyKey\` and a descriptor, parameter decorators are supported, and together with \`emitDecoratorMetadata\` and \`reflect-metadata\` the types are emitted into the runtime as \`design:type\` and \`design:paramtypes\`. That's exactly what DI in Angular and NestJS relies on. The standard TC39 Stage 3 decorators are available from TypeScript 5.0 without a flag: a decorator receives the decorated value and a context object with \`kind\`, \`name\`, \`addInitializer\` and access flags. They don't yet have parameter decorators or type-metadata emission. The two systems can't be mixed in one project — the flag switches the semantics wholesale.

## Gotchas

- **They can't be mixed.** \`experimentalDecorators\` switches semantics for the entire project. Migrating means rewriting every decorator signature.
- **Angular has historically depended on legacy** because of \`emitDecoratorMetadata\`; newer versions move away from decorators towards functions like \`inject()\`, \`input()\` and \`signal()\`.
- **\`reflect-metadata\` isn't part of the language**, it's a polyfill library. Forget to import it at the entry point and DI breaks with a cryptic error.
- **Field decorators behave differently** in the two systems with respect to initialisation timing — the code almost never ports by copy-paste.
- A decorator **runs once when the class is declared**, not on every method call. A common mistake is putting per-call logic in there.`
    }
  },
  {
    id: 'jsts-028',
    category: 'typescript',
    level: 'Hard',
    tags: ['const-type-parameters', 'inference', 'literals'],
    question: {
      ru: 'Что такое `const`-параметры типа (TS 5.0)? Какую проблему вывода они решают?',
      en: 'What are `const` type parameters (TS 5.0)? Which inference problem do they solve?'
    },
    answer: {
      ru: `## Коротко

Проблема: TypeScript при выводе дженерика **расширяет** литералы. Передали \`['a', 'b']\` — получили \`string[]\`, а не \`['a', 'b']\`. Конкретика потеряна.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']);   // T = string[], а хотелось ['a', 'b']
\`\`\`

Раньше это чинилось только на **стороне вызова**: \`id(['a', 'b'] as const)\`. Неудобно — про \`as const\` должен помнить каждый пользователь вашей функции.

**\`const\`-параметр типа (TS 5.0) переносит эту заботу в объявление функции.** Пишете \`<const T>\` — и компилятор выводит \`T\` так, будто аргумент помечен \`as const\`.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }

const a = asTuple(['a', 'b']);   // readonly ['a', 'b']
const o = asTuple({ k: 1 });     // { readonly k: 1 }
\`\`\`

## Что конкретно меняется

- Строковые и числовые литералы **остаются литералами**: \`'a'\` не превращается в \`string\`.
- Массив становится **readonly-кортежем**, а не просто массивом.
- У объектов свойства получают \`readonly\` и литеральные типы значений.

## Где это нужно на практике

Везде, где библиотека хочет **вывести типы из того, что ей передали**:

- билдеры роутов: из \`['users', ':id']\` вывести тип параметра;
- схемы валидации и формы: точный список полей;
- \`createStore\`-подобные API, где ключи конфига становятся типами;
- любые типобезопасные DSL.

Смысл — **убрать \`as const\` из кода потребителя**, оставив ему обычный литерал.

## Что сказать на собеседовании

> По умолчанию при выводе дженерика TypeScript расширяет литеральные типы: \`'a'\` становится \`string\`, а массив литералов — обычным массивом. Раньше это лечили \`as const\` на стороне вызова, что перекладывало бойлерплейт на пользователя API. \`const\`-параметры типа из TypeScript 5.0 позволяют объявить \`<const T>\` в сигнатуре, и тогда компилятор выводит тип так, как будто аргумент помечен \`as const\`: литералы не расширяются, массивы становятся readonly-кортежами, объекты — readonly-объектами. Работает это только на выводе — при явно указанном типе эффекта нет, и на рантайм не влияет.

## Ловушки

- **Влияет только на вывод.** Если вызвать \`asTuple<string[]>(['a'])\` с явным типом, \`const\` ничего не даст.
- **Не делает объект иммутабельным в рантайме.** \`readonly\` — это только про типы, \`Object.freeze\` не вызывается.
- **Не «достаёт» уже расширенное значение.** Если сначала записать \`const arr = ['a', 'b']\` (тип уже \`string[]\`), а потом передать \`arr\`, то \`const T\` не поможет — расширение случилось раньше.
- **\`readonly\`-результат может не подойти** там, где ожидается изменяемый массив: понадобится \`[...result]\`.
- Не путайте \`<const T>\` (параметр типа) и \`as const\` (assertion в значении) — они решают одну задачу с разных сторон.`,
      en: `## In short

The problem: when inferring a generic, TypeScript **widens** literals. Pass \`['a', 'b']\` and you get \`string[]\`, not \`['a', 'b']\`. The precision is gone.

\`\`\`ts
function id<T>(x: T): T { return x; }
const r = id(['a', 'b']);   // T = string[], but we wanted ['a', 'b']
\`\`\`

Previously this could only be fixed **at the call site**: \`id(['a', 'b'] as const)\`. That's awkward — every consumer of your function has to remember \`as const\`.

**A \`const\` type parameter (TS 5.0) moves that burden into the declaration.** Write \`<const T>\` and the compiler infers \`T\` as if the argument were marked \`as const\`.

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }

const a = asTuple(['a', 'b']);   // readonly ['a', 'b']
const o = asTuple({ k: 1 });     // { readonly k: 1 }
\`\`\`

## What exactly changes

- String and number literals **stay literals**: \`'a'\` doesn't become \`string\`.
- An array becomes a **readonly tuple**, not just an array.
- Object properties get \`readonly\` and literal value types.

## Where you need it in practice

Anywhere a library wants to **derive types from what it was given**:

- route builders: infer the parameter type from \`['users', ':id']\`;
- validation schemas and forms: the exact list of fields;
- \`createStore\`-style APIs where config keys become types;
- any type-safe DSL.

The point is to **remove \`as const\` from the consumer's code** and let them pass a plain literal.

## What to say in the interview

> By default, when inferring a generic TypeScript widens literal types: \`'a'\` becomes \`string\` and an array of literals becomes a plain array. Avoiding that used to require \`as const\` at the call site, pushing boilerplate onto the API's users. \`const\` type parameters, added in TypeScript 5.0, let you declare \`<const T>\` in the signature so the compiler infers the type as if the argument were marked \`as const\`: literals aren't widened, arrays become readonly tuples and objects get readonly properties with literal value types. It only affects inference — with an explicit type argument it has no effect — and it has no runtime impact, the value remains an ordinary mutable object.

## Gotchas

- **It only affects inference.** Calling \`asTuple<string[]>(['a'])\` with an explicit type argument makes \`const\` irrelevant.
- **It doesn't make the object immutable at runtime.** \`readonly\` is types-only; no \`Object.freeze\` happens.
- **It can't "reach into" an already-widened value.** If you first write \`const arr = ['a', 'b']\` (already \`string[]\`) and then pass \`arr\`, \`const T\` won't help — the widening happened earlier.
- **A \`readonly\` result may not fit** where a mutable array is expected: you'll need \`[...result]\`.
- Don't confuse \`<const T>\` (a type parameter) with \`as const\` (an assertion on a value) — they solve the same problem from opposite ends.`
    }
  },
  {
    id: 'jsts-029',
    category: 'typescript',
    level: 'Hard',
    tags: ['structural-typing', 'nominal-typing', 'branding'],
    question: {
      ru: 'Что такое структурная типизация в TypeScript? Как сэмулировать номинальную типизацию (branding)?',
      en: 'What is structural typing in TypeScript? How do you emulate nominal typing (branding)?'
    },
    answer: {
      ru: `## Коротко

**TypeScript смотрит не на название типа, а на его форму.** Если у объекта есть все нужные поля — он подходит, даже если объявлен совсем другим классом или интерфейсом.

Это называется структурной («утиной») типизацией: «если крякает как утка — значит утка».

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }

const p: Point = new Vec(1, 2);  // ок — форма совпадает
\`\`\`

Противоположность — **номинальная** типизация (Java, C#), где важно именно имя типа. В TypeScript её нет.

## В чём риск

Разные по смыслу вещи с одинаковой формой становятся **взаимозаменяемыми**:

\`\`\`ts
type UserId = string;
type OrderId = string;

function loadUser(id: UserId) {}
loadUser(orderId);   // компилируется! Оба ведь просто string
\`\`\`

Так уезжают в прод баги «передали не тот идентификатор».

## Branding — как подделать номинальную типизацию

Идея: добавить в тип **фантомное поле-метку**, которого в рантайме не существует. Тогда две строки перестанут быть взаимозаменяемыми для компилятора.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// единственная контролируемая точка создания
const makeUserId = (s: string) => s as UserId;

function load(id: UserId) { /* ... */ }

load(makeUserId('u1'));   // ок
load('u1');               // ошибка — просто строка не подойдёт
\`\`\`

В рантайме это обычная строка — никакого оверхеда. Вся защита живёт только на этапе компиляции.

## Бонус: excess property checks

Отдельная особенность, которая часто удивляет. Форму проверяют структурно, **но литерал объекта** дополнительно проверяется на «лишние» свойства:

\`\`\`ts
interface Opts { a: number }

const x: Opts = { a: 1, b: 2 };      // ошибка: лишнее свойство b
const tmp = { a: 1, b: 2 };
const y: Opts = tmp;                 // а так — ок!
\`\`\`

Это специальная защита от опечаток именно в литералах, поверх обычной структурной совместимости.

## Что сказать на собеседовании

> TypeScript использует структурную типизацию: совместимость определяется формой типа, а не его именем. Поэтому объект другого класса подходит там, где ждут интерфейс той же формы. Это удобно, но не различает семантически разные типы одной формы — \`UserId\` и \`OrderId\`, если оба просто \`string\`. Номинальную типизацию эмулируют брендированием: к типу добавляют фантомное поле-маркер с ключом \`unique symbol\`, а значения создают только через контролируемый конструктор с \`as\`. В рантайме это остаётся обычной строкой, вся проверка происходит на этапе компиляции.

## Ловушки

- **Классы тоже структурны.** \`private\`-поля — единственное, что делает класс «номинальным»: класс с приватным полем несовместим с любым другим.
- **Лишние свойства проверяются только у литералов.** Именно поэтому «в объекте ругается, а в переменной нет» — и это не баг.
- **Бренд требует дисциплины**: если разрешить \`value as UserId\` где попало, защита теряет смысл. Конструктор должен быть один и с валидацией.
- **Опциональные поля ослабляют проверку**: тип с одними опциональными полями совместим почти со всем.
- Пустой интерфейс \`{}\` совместим **почти с любым значением**, кроме \`null\` и \`undefined\`. Использовать его как «объект» — ошибка, для этого есть \`Record<string, unknown>\`.`,
      en: `## In short

**TypeScript looks at a type's shape, not its name.** If an object has all the required fields, it fits — even if it was declared as a completely different class or interface.

This is called structural ("duck") typing: "if it quacks like a duck, it's a duck".

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }

const p: Point = new Vec(1, 2);  // ok — the shape matches
\`\`\`

The opposite is **nominal** typing (Java, C#), where the type's name is what counts. TypeScript doesn't have it.

## Where the risk is

Semantically different things with the same shape become **interchangeable**:

\`\`\`ts
type UserId = string;
type OrderId = string;

function loadUser(id: UserId) {}
loadUser(orderId);   // compiles! both are just strings
\`\`\`

That's how "passed the wrong identifier" bugs reach production.

## Branding — faking nominal typing

The idea: add a **phantom marker field** to the type that doesn't exist at runtime. Then two strings stop being interchangeable as far as the compiler is concerned.

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// the single controlled point of creation
const makeUserId = (s: string) => s as UserId;

function load(id: UserId) { /* ... */ }

load(makeUserId('u1'));   // ok
load('u1');               // error — a plain string won't do
\`\`\`

At runtime it's an ordinary string — zero overhead. All the protection lives at compile time.

## Bonus: excess property checks

A separate quirk that often surprises people. The shape is checked structurally, **but an object literal** additionally gets checked for "excess" properties:

\`\`\`ts
interface Opts { a: number }

const x: Opts = { a: 1, b: 2 };      // error: excess property b
const tmp = { a: 1, b: 2 };
const y: Opts = tmp;                 // this is fine!
\`\`\`

It's a special guard against typos in literals, layered on top of normal structural compatibility.

## What to say in the interview

> TypeScript uses structural typing: compatibility is determined by the type's shape — its set of members and their types — not by its name. So an object of a different class fits where an interface is expected, as long as the structure matches. That's convenient for interop but it loses the distinction between semantically different types with the same shape, such as \`UserId\` and \`OrderId\` when both are just \`string\`. Nominal typing is emulated by branding: you add a phantom marker field, usually with a \`unique symbol\` key, and only create values through a controlled constructor with \`as\`. At runtime it stays a plain string; all checking happens at compile time. A separate detail of the structural system is excess property checks: assigning an object literal, TypeScript also complains about extra properties, though going through an intermediate variable bypasses that check.

## Gotchas

- **Classes are structural too.** A \`private\` field is the only thing that makes a class "nominal": a class with a private field is incompatible with any other.
- **Excess properties are only checked on literals.** That's why "the object literal errors but the variable doesn't" — and it isn't a bug.
- **Branding requires discipline**: if \`value as UserId\` is allowed everywhere, the protection is meaningless. There should be one constructor, with validation.
- **Optional fields weaken checking**: a type made only of optional fields is compatible with almost anything.
- An empty interface \`{}\` is compatible with **almost any value** except \`null\` and \`undefined\`. Using it to mean "an object" is a mistake — that's what \`Record<string, unknown>\` is for.`
    }
  },
  {
    id: 'jsts-033',
    category: 'typescript',
    level: 'Hard',
    tags: ['overloads', 'function-types', 'this-typing'],
    question: {
      ru: 'Как работают перегрузки функций в TypeScript и типизация `this`? В чём отличие от union-сигнатуры?',
      en: 'How do function overloads and `this` typing work in TypeScript? How do they differ from a union signature?'
    },
    answer: {
      ru: `## Коротко

**Перегрузка — это когда у одной функции несколько «лиц».** Вы объявляете несколько сигнатур, а реализация одна, и она сама разбирается, что пришло.

Смысл: **связать конкретный вход с конкретным выходом**. Передали строку — вернётся строка. Передали массив — вернётся массив.

\`\`\`ts
function reverse(x: string): string;      // сигнатура 1
function reverse<T>(x: T[]): T[];         // сигнатура 2
function reverse(x: string | unknown[]) { // реализация — снаружи не видна
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}

reverse('abc');      // тип string
reverse([1, 2, 3]);  // тип number[]
\`\`\`

## Почему не просто union

Если написать \`function reverse(x: string | T[]): string | T[]\`, то **на любой вызов** тип результата будет \`string | T[]\` — и потребителю придётся каждый раз проверять, что ему вернули. Перегрузки убирают эту неопределённость.

## Два правила, которые надо помнить

1. **Порядок сверху вниз.** TypeScript берёт **первую подходящую** сигнатуру, поэтому более конкретные ставят выше более общих.
2. **Сигнатура реализации снаружи невидима.** Она не участвует в выборе — её нельзя вызвать напрямую, даже если формально она шире.

## Типизация \`this\`

В TypeScript тип \`this\` объявляется как **первый фантомный параметр** — он существует только в типах и в вызов не передаётся:

\`\`\`ts
interface Btn { label: string; }

function render(this: Btn): string { return this.label; }

render.call({ label: 'ok' });  // ок
render();                      // ошибка — нет подходящего this
\`\`\`

Отдельно: \`this: void\` означает «эта функция не должна использовать \`this\`» — полезно для колбэков. Есть и утилиты \`ThisParameterType\` и \`OmitThisParameter\`.

## Что сказать на собеседовании

> Перегрузки — это несколько сигнатур объявления над одной реализацией: снаружи видны только сигнатуры, вызвать реализацию напрямую нельзя. Нужны они, чтобы связать вход с выходом: union-параметр дал бы union и в результате, а перегрузка выражает зависимость — строка возвращает строку, массив возвращает массив. TypeScript выбирает первую подходящую сигнатуру сверху вниз, поэтому более специфичные ставят выше. Тип \`this\` объявляется первым фантомным параметром, существующим только на уровне типов. Современная альтернатива — дженерик с условным возвращаемым типом.

## Ловушки

- **Перегрузки — это только типы.** В рантайме функция одна, и разбор аргументов вы пишете руками. Компилятор не проверит, что реализация действительно покрывает все сигнатуры.
- **Тело функции не сужается по перегрузке.** Внутри вы работаете с самым широким типом, и \`typeof\`-проверки обязательны.
- **Неправильный порядок ломает вывод**: если общая сигнатура стоит первой, конкретная никогда не выберется.
- **Слишком много перегрузок — плохая читаемость.** Больше трёх-четырёх — сигнал, что нужен дженерик с условным типом или разные функции с разными именами.
- \`this: void\` в колбэке — **хороший тон в API**: он не даёт потребителю случайно понадеяться на контекст.`,
      en: `## In short

**An overload is one function with several "faces".** You declare several signatures over a single implementation, and the implementation works out what it received.

The point is to **tie a specific input to a specific output**. Pass a string, get a string back. Pass an array, get an array.

\`\`\`ts
function reverse(x: string): string;      // signature 1
function reverse<T>(x: T[]): T[];         // signature 2
function reverse(x: string | unknown[]) { // implementation — invisible outside
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}

reverse('abc');      // type string
reverse([1, 2, 3]);  // type number[]
\`\`\`

## Why not just a union

If you write \`function reverse(x: string | T[]): string | T[]\`, then **every call** returns \`string | T[]\` and the consumer has to check what came back every single time. Overloads remove that uncertainty.

## Two rules to remember

1. **Top to bottom.** TypeScript picks the **first matching** signature, so more specific ones go above more general ones.
2. **The implementation signature is invisible from outside.** It takes no part in resolution and can't be called directly, even if it's formally wider.

## Typing \`this\`

In TypeScript the type of \`this\` is declared as a **first phantom parameter** — it exists only in the types and isn't passed at the call site:

\`\`\`ts
interface Btn { label: string; }

function render(this: Btn): string { return this.label; }

render.call({ label: 'ok' });  // ok
render();                      // error — no suitable this
\`\`\`

Separately: \`this: void\` means "this function must not use \`this\`" — useful for callbacks. There are also the \`ThisParameterType\` and \`OmitThisParameter\` utilities.

## What to say in the interview

> Overloads are several declaration signatures over one implementation. Only the signatures are visible from outside; the implementation signature doesn't take part in resolution and can't be called directly. They exist to tie input to output: a union parameter would give a union in the return type as well, whereas an overload expresses the dependency — a string returns a string, an array returns an array. TypeScript picks the first matching signature top to bottom, so more specific ones go higher. The type of \`this\` is declared as a first phantom parameter that exists only at the type level; \`this: void\` forbids using \`this\` inside. The modern alternative to overloads is a generic with a conditional return type — it scales better, though with genuinely different argument counts and meanings overloads read more clearly.

## Gotchas

- **Overloads are types only.** At runtime there's one function and you write the argument dispatch by hand. The compiler doesn't verify that the implementation really covers every signature.
- **The body isn't narrowed by the overload.** Inside you work with the widest type and \`typeof\` checks are mandatory.
- **A wrong order breaks inference**: if the general signature comes first, the specific one is never chosen.
- **Too many overloads hurt readability.** More than three or four is a sign you need a generic with a conditional type, or separate functions with separate names.
- \`this: void\` on a callback is **good API manners**: it stops consumers accidentally relying on context.`
    }
  },
  {
    id: 'jsts-034',
    category: 'typescript',
    level: 'Medium',
    tags: ['enums', 'const-enum', 'union-types'],
    question: {
      ru: 'Чем отличаются обычные `enum`, `const enum` и union литеральных типов? Что предпочесть?',
      en: 'How do regular `enum`, `const enum`, and unions of literal types differ? What should you prefer?'
    },
    answer: {
      ru: `## Коротко

Три способа описать «одно из нескольких значений», и главный вопрос — **что остаётся в собранном JS**.

- **\`enum\`** — превращается в **настоящий объект** в бандле. Занимает место, зато существует в рантайме.
- **\`const enum\`** — компилятор **подставляет значения прямо в код**, объекта в бандле нет. Быстро и мало, но с оговорками по инструментам.
- **Union литеральных типов** (\`'a' | 'b'\`) — **вообще ничего** не остаётся в рантайме. Только типы.

## Обычный enum

\`\`\`ts
enum Dir { Up, Down }   // Up = 0, Down = 1

Dir.Up;    // 0
Dir[0];    // 'Up' — обратный маппинг, только у числовых enum
\`\`\`

В JS это скомпилируется в объект с двусторонним маппингом. Плюс — можно перебрать все значения в рантайме. Минус — код в бандле и странности вроде того, что \`Dir[0]\` вообще работает.

## const enum

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red;     // скомпилируется в: const c = 0;
\`\`\`

Никакого объекта, чистая подстановка. Но:

- ломается при \`isolatedModules\` (а это дефолт в современных сборках);
- **нельзя отдавать из библиотеки** — у потребителя не будет значений;
- Babel и esbuild по умолчанию его не инлайнят.

## Union литеральных типов — рекомендуемый вариант

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

Ноль байт в бандле, отличное сужение типов, значения читаемы в логах и напрямую сериализуются в JSON. Идеально дружит с дискриминируемыми union.

## А если нужны значения в рантайме?

Есть компромисс лучше enum — объект с \`as const\` плюс вывод типа из него:

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;

type Role = typeof Roles[keyof typeof Roles];  // 'admin' | 'user'

Object.values(Roles);   // ['admin', 'user'] — можно перебирать
\`\`\`

Получаем и рантайм-значения для итерации, и точные литеральные типы, и обычный JS без магии компилятора.

## Что сказать на собеседовании

> Обычный \`enum\` эмитит в JS настоящий объект, а у числовых enum ещё и обратный маппинг, поэтому он занимает место в бандле, но доступен в рантайме для итерации. \`const enum\` инлайнится компилятором в литералы и в бандл не попадает, но он несовместим с \`isolatedModules\` и не поддерживается Babel и esbuild из коробки. Union строковых литералов — рекомендуемый дефолт: нулевой рантайм-след, отличное сужение и совместимость с JSON. Когда значения нужны в рантайме для перебора, вместо enum берут объект с \`as const\` и выводят тип через \`typeof Obj[keyof typeof Obj]\`.

## Ловушки

- **Числовые enum небезопасны**: до TypeScript 5.0 в переменную типа числового enum можно было присвоить любое число. Строковые enum такой дыры не имеют.
- **Обратный маппинг только у числовых.** \`Dir[0]\` работает, а у строкового enum — нет.
- **enum — это одновременно тип и значение.** Отсюда путаница: \`Dir\` можно использовать и в аннотации, и как объект.
- **\`const enum\` в библиотеке — почти всегда ошибка.** Потребитель получит ошибку сборки или пустоту.
- В Angular-проектах enum ещё встречается в шаблонах — но там его всё равно приходится пробрасывать через поле компонента, что лишний раз показывает: объект с \`as const\` удобнее.`,
      en: `## In short

Three ways to describe "one of several values", and the key question is **what ends up in the compiled JS**.

- **\`enum\`** — becomes a **real object** in the bundle. It takes space, but it exists at runtime.
- **\`const enum\`** — the compiler **inlines the values into the code**, no object in the bundle. Fast and small, with toolchain caveats.
- **A union of literal types** (\`'a' | 'b'\`) — **nothing at all** remains at runtime. Types only.

## Regular enum

\`\`\`ts
enum Dir { Up, Down }   // Up = 0, Down = 1

Dir.Up;    // 0
Dir[0];    // 'Up' — reverse mapping, numeric enums only
\`\`\`

It compiles to an object with a two-way mapping. The upside is that you can enumerate the values at runtime. The downsides are the code in the bundle and oddities like \`Dir[0]\` working at all.

## const enum

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red;     // compiles to: const c = 0;
\`\`\`

No object, pure substitution. But:

- it breaks under \`isolatedModules\` (the default in modern builds);
- **you can't ship it from a library** — consumers won't get the values;
- Babel and esbuild don't inline it out of the box.

## A union of literal types — the recommended option

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';
\`\`\`

Zero bytes in the bundle, excellent narrowing, values readable in logs and serialisable straight to JSON. Works perfectly with discriminated unions.

## But what if you need the values at runtime?

There's a better compromise than an enum — an object with \`as const\` plus a type derived from it:

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const;

type Role = typeof Roles[keyof typeof Roles];  // 'admin' | 'user'

Object.values(Roles);   // ['admin', 'user'] — enumerable
\`\`\`

You get runtime values for iteration, precise literal types, and plain JavaScript with no compiler magic.

## What to say in the interview

> A regular \`enum\` emits a real object into the JS output, and numeric enums also get a reverse mapping, so it takes bundle space but is available at runtime for iteration. \`const enum\` is inlined into literals by the compiler and doesn't reach the bundle, but it's incompatible with \`isolatedModules\`, unsuitable for published libraries and unsupported by Babel and esbuild out of the box. A union of string literals is the recommended default: zero runtime footprint, excellent narrowing and JSON compatibility. When the values are needed at runtime for enumeration, instead of an enum you usually take an object with \`as const\` and derive the type via \`typeof Obj[keyof typeof Obj]\` — that gives both values and precise literal types without any special compiler semantics.

## Gotchas

- **Numeric enums are unsafe**: before TypeScript 5.0 you could assign any number to a numeric-enum-typed variable. String enums don't have that hole.
- **Reverse mapping exists only for numeric enums.** \`Dir[0]\` works; for a string enum it doesn't.
- **An enum is both a type and a value.** Hence the confusion: \`Dir\` can be used in an annotation and as an object.
- **A \`const enum\` in a library is almost always a mistake.** Consumers get a build error or nothing at all.
- Enums still appear in Angular templates, but you have to expose them through a component field anyway — which is one more sign that an \`as const\` object is more convenient.`
    }
  },
  {
    id: 'jsts-035',
    category: 'typescript',
    level: 'Expert',
    tags: ['recursive-types', 'tail-recursion', 'type-level'],
    question: {
      ru: 'Как работают рекурсивные типы и tail-recursive условные типы в TypeScript? Каковы пределы?',
      en: 'How do recursive types and tail-recursive conditional types work in TypeScript? What are the limits?'
    },
    answer: {
      ru: `## Коротко

**Рекурсивный тип — это тип, который ссылается сам на себя.** Ровно как рекурсивная функция, только на уровне типов.

Самый понятный пример — описать JSON. Внутри JSON может лежать JSON:

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };
\`\`\`

Или сделать объект глубоко неизменяемым — на каждом уровне вызываем себя же:

\`\`\`ts
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Рекурсивные условные типы — вычисления в типах

С TS 4.1 условный тип может вызывать сам себя, и это превращает систему типов в маленький язык программирования. Так делают подсчёт длины, разворот кортежа, разбор строк, даже арифметику:

\`\`\`ts
type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;

type Five = BuildTuple<5>['length'];  // 5
\`\`\`

Читается как обычный цикл: «пока длина не равна N — добавляй элемент и вызывай себя снова».

## Хвостовая рекурсия — почему она важна

У компилятора есть внутренний лимит вложенности. Обычная рекурсия упирается в него быстро — примерно на 50 шагах, и вы видите **«Type instantiation is excessively deep and possibly infinite»**.

Но с TS 4.5 есть оптимизация: если рекурсивный вызов — это **весь результат ветки целиком** (то есть после него ничего не делается), компилятор разворачивает рекурсию в цикл. Лимит подскакивает примерно до **10 000** шагов.

Приём для этого — **аккумулятор**: несём промежуточный результат дополнительным параметром типа, вместо того чтобы собирать его после возврата.

\`\`\`ts
// хвостовая: вызов стоит в позиции результата, накопитель растёт
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

## Что сказать на собеседовании

> Рекурсивные типы ссылаются сами на себя — так описывают JSON и пишут \`DeepReadonly\`. С TypeScript 4.1 условные типы тоже могут быть рекурсивными, что позволяет считать на уровне типов. Лимит глубины инстанцирования при обычной рекурсии достигается примерно на пятидесяти шагах — «Type instantiation is excessively deep». С TypeScript 4.5 появилась оптимизация хвостовой рекурсии: если рекурсивный вызов — весь результат ветки, компилятор разворачивает его в цикл, и предел поднимается примерно до десяти тысяч шагов. Применять стоит умеренно: глубокая рекурсия замедляет компиляцию и подсказки в IDE.

## Ловушки

- **«Type instantiation is excessively deep»** — это почти всегда сигнал, что рекурсия не хвостовая. Перепишите с аккумулятором.
- **Хвостовой считается только рекурсия в позиции результата.** \`[...Rec<T>]\` или \`Rec<T> | null\` — уже не хвостовая, оптимизация не сработает.
- **Компиляция и IDE тормозят** от сложных рекурсивных типов сильнее, чем кажется. На большом проекте это заметно по времени отклика подсказок.
- **\`DeepReadonly\` и \`DeepPartial\` из интернета часто зацикливаются** на типах вроде \`Date\`, \`Map\` и функций — нужны явные ветки для них.
- Помните, зачем всё это. Читаемость важнее «типового кунг-фу»: если тип нельзя объяснить коллеге за минуту, скорее всего нужна другая модель данных.`,
      en: `## In short

**A recursive type is a type that refers to itself.** Exactly like a recursive function, but at the type level.

The clearest example is describing JSON. A JSON value can contain JSON:

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };
\`\`\`

Or making an object deeply immutable — at every level we call ourselves again:

\`\`\`ts
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
\`\`\`

## Recursive conditional types — computation in types

Since TS 4.1 a conditional type can call itself, which turns the type system into a small programming language. That's how people count lengths, reverse tuples, parse strings and even do arithmetic:

\`\`\`ts
type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;

type Five = BuildTuple<5>['length'];  // 5
\`\`\`

It reads like an ordinary loop: "while the length isn't N, add an element and call yourself again".

## Tail recursion — why it matters

The compiler has an internal nesting limit. Ordinary recursion hits it quickly — at around 50 steps — and you see **"Type instantiation is excessively deep and possibly infinite"**.

But since TS 4.5 there's an optimisation: if the recursive call is **the entire result of the branch** (nothing happens after it), the compiler unrolls the recursion into a loop. The limit jumps to roughly **10,000** steps.

The technique is an **accumulator**: carry the intermediate result in an extra type parameter instead of assembling it after the return.

\`\`\`ts
// tail-recursive: the call is in result position, the accumulator grows
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;
\`\`\`

## What to say in the interview

> Recursive types refer to themselves — that's how nested structures like JSON are described and how utilities such as \`DeepReadonly\` and \`DeepPartial\` are written. Since TypeScript 4.1 conditional types can be recursive too, which allows type-level computation: tuple lengths, string parsing, arithmetic. The catch is the instantiation depth limit — ordinary recursion reaches it at around fifty steps and produces "Type instantiation is excessively deep". TypeScript 4.5 added tail-recursion elimination: if the recursive call is the whole result of the branch, the compiler unrolls it into a loop and the practical limit rises to roughly ten thousand steps. You write it with an accumulator in an extra type parameter. In practice all of this should be used sparingly: deep type recursion noticeably slows compilation and IDE hints.

## Gotchas

- **"Type instantiation is excessively deep"** is almost always a sign the recursion isn't tail-recursive. Rewrite it with an accumulator.
- **Only a call in result position counts as tail recursion.** \`[...Rec<T>]\` or \`Rec<T> | null\` isn't tail-recursive and the optimisation won't kick in.
- **Compilation and the IDE slow down** from complex recursive types more than you'd expect. On a large project you feel it in hint latency.
- **\`DeepReadonly\` and \`DeepPartial\` copied from the internet often loop** on types like \`Date\`, \`Map\` and functions — they need explicit branches for those.
- Remember why you're doing this. Readability beats "type kung-fu": if a type can't be explained to a colleague in a minute, you probably need a different data model.`
    }
  },
  {
    id: 'jsts-036',
    category: 'typescript',
    level: 'Hard',
    tags: ['index-signatures', 'keyof', 'record-access'],
    question: {
      ru: 'Как работают index signatures и `keyof`? Почему доступ по индексу бывает небезопасным и что такое noUncheckedIndexedAccess?',
      en: 'How do index signatures and `keyof` work? Why is indexed access sometimes unsafe and what is noUncheckedIndexedAccess?'
    },
    answer: {
      ru: `## Коротко

**Index signature — это способ сказать «ключи заранее неизвестны».** Пишем \`{ [key: string]: number }\` — то есть «любая строка в качестве ключа, значение всегда число».

**\`keyof T\`** — противоположность: «дай мне union всех ключей этого типа». А **\`T[K]\`** — «дай тип значения по такому ключу».

\`\`\`ts
type Obj = { id: number; name: string };

type Keys = keyof Obj;   // 'id' | 'name'
type V = Obj['name'];    // string
\`\`\`

Вместе они дают типобезопасный доступ по ключу — тот самый паттерн \`<T, K extends keyof T>(obj: T, key: K): T[K]\`.

## Главная опасность: TypeScript слишком оптимистичен

По умолчанию компилятор считает, что **любой ключ в словаре существует**. Это неправда, и отсюда растут \`undefined\`-баги:

\`\`\`ts
const map: Record<string, number> = {};

const x = map['missing'];  // TypeScript говорит: number
x.toFixed();               // а в рантайме — TypeError, x это undefined
\`\`\`

То же самое с массивами: \`arr[999]\` имеет тип элемента, хотя реально там \`undefined\`.

## Лечение: noUncheckedIndexedAccess

Флаг в \`tsconfig.json\`, который делает доступ по индексу честным — результат становится \`V | undefined\`:

\`\`\`ts
// с флагом
const x2 = map['missing'];  // number | undefined
x2?.toFixed();              // компилятор требует проверку
\`\`\`

Важно: флаг **не трогает доступ по известным ключам**. У обычного \`{ id: number }\` обращение \`obj.id\` остаётся просто \`number\` — там сомнений нет.

## Что сказать на собеседовании

> Index signature описывает объект с заранее неизвестным набором ключей — \`{ [key: string]: V }\`; ключи могут быть \`string\`, \`number\` или \`symbol\`, и все явные свойства обязаны быть совместимы с типом значения. \`keyof T\` даёт union ключей типа, а \`T[K]\` — тип значения по ключу; вместе они дают типобезопасный доступ вида \`K extends keyof T\` с возвратом \`T[K]\`. По умолчанию TypeScript считает индексный доступ успешным и возвращает заявленный тип, игнорируя отсутствие ключа, — отсюда ошибки с undefined, в том числе на элементах массива. Флаг \`noUncheckedIndexedAccess\` делает результат \`V | undefined\` и заставляет проверять наличие.

## Ловушки

- **\`Record<string, T>\` — та же ловушка, что и index signature.** Это она и есть, просто в обёртке.
- **Массивы тоже небезопасны**: \`arr[0]\` при пустом массиве даст \`undefined\`, а тип скажет обратное. Флаг покрывает и этот случай.
- **Включение флага на существующем проекте даёт лавину ошибок** — обычно это правильные ошибки, но внедрять надо постепенно.
- **\`keyof\` у типа с index signature даёт \`string | number\`**, а не список конкретных ключей — иногда это неожиданно ломает mapped types.
- **Проверка через \`in\` сужает тип** и убирает \`undefined\` в ветке — удобная альтернатива \`?.\` там, где значение точно используется.
- Числовые ключи в JS всё равно строки: \`obj[1]\` и \`obj['1']\` — одно и то же свойство, хотя TypeScript различает \`[key: number]\` и \`[key: string]\`.`,
      en: `## In short

**An index signature is how you say "the keys aren't known in advance".** You write \`{ [key: string]: number }\`, meaning "any string as a key, the value is always a number".

**\`keyof T\`** is the opposite: "give me the union of all this type's keys". And **\`T[K]\`** is "give me the value type at that key".

\`\`\`ts
type Obj = { id: number; name: string };

type Keys = keyof Obj;   // 'id' | 'name'
type V = Obj['name'];    // string
\`\`\`

Together they give type-safe key access — the familiar \`<T, K extends keyof T>(obj: T, key: K): T[K]\` pattern.

## The main danger: TypeScript is too optimistic

By default the compiler assumes **every key in a dictionary exists**. That isn't true, and \`undefined\` bugs grow from it:

\`\`\`ts
const map: Record<string, number> = {};

const x = map['missing'];  // TypeScript says: number
x.toFixed();               // at runtime: TypeError, x is undefined
\`\`\`

The same goes for arrays: \`arr[999]\` has the element type even though it's really \`undefined\`.

## The cure: noUncheckedIndexedAccess

A \`tsconfig.json\` flag that makes indexed access honest — the result becomes \`V | undefined\`:

\`\`\`ts
// with the flag
const x2 = map['missing'];  // number | undefined
x2?.toFixed();              // the compiler demands a check
\`\`\`

Important: the flag **doesn't touch access by known keys**. On a plain \`{ id: number }\`, \`obj.id\` is still just \`number\` — there's no doubt there.

## What to say in the interview

> An index signature describes an object with an unknown set of keys — \`{ [key: string]: V }\`; keys can be \`string\`, \`number\` or \`symbol\`, and every explicit property must be compatible with the signature's value type. \`keyof T\` gives the union of a type's keys and \`T[K]\` the value type at a key; together they enable type-safe access via \`K extends keyof T\` returning \`T[K]\`. The problem is that by default TypeScript assumes indexed access always succeeds and returns the declared type, ignoring a missing key — an optimistic and incorrect assumption that produces undefined bugs, including when indexing into an array. The \`noUncheckedIndexedAccess\` flag makes the result \`V | undefined\` and forces a presence check; it doesn't affect access by known literal keys. For dictionaries a \`Map\` is often a better fit, since its \`get\` honestly returns \`V | undefined\` without any flags.

## Gotchas

- **\`Record<string, T>\` has exactly the same trap** — it *is* an index signature, just wrapped.
- **Arrays are unsafe too**: \`arr[0]\` on an empty array is \`undefined\` while the type claims otherwise. The flag covers this case as well.
- **Turning the flag on in an existing project produces an avalanche of errors** — usually correct ones, but roll it out gradually.
- **\`keyof\` on a type with an index signature gives \`string | number\`**, not a list of concrete keys — which sometimes breaks mapped types unexpectedly.
- **An \`in\` check narrows the type** and removes \`undefined\` in that branch — a handy alternative to \`?.\` when the value is definitely used.
- Numeric keys are still strings in JS: \`obj[1]\` and \`obj['1']\` are the same property, even though TypeScript distinguishes \`[key: number]\` from \`[key: string]\`.`
    }
  }
];
