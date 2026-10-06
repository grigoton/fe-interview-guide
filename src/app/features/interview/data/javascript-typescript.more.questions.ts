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
      ru: `## В чём суть

Type guard \`x is T\` и assertion-функция \`asserts x is T\` оба сужают тип, но по-разному отвечают на вопрос **«а что, если нет?»**. Type guard возвращает \`true\`/\`false\`: «не подошло» — нормальная ситуация, идём в \`else\`. Assertion ничего не возвращает и **бросает исключение**: «не подошло» — это баг, дальше идти нельзя, зато весь код ниже вызова может считать тип гарантированным.

Аналогия: вход в бизнес-центр. Type guard — консьерж: «Вы к кому?» Сотрудников он отправляет к лифтам, гостей — в переговорную; обе дороги нормальные. Assertion — турникет: есть пропуск — проходите, и дальше в здании вы везде считаетесь сотрудником, никто не переспрашивает; нет пропуска — сирена, и дальше вы не идёте вообще.

**Какую проблему решает.** Компилятор умеет сам сужать тип по \`typeof\`, \`instanceof\`, \`in\` и сравнениям, но не умеет заглядывать в ваши функции. Как только проверка уезжает в функцию \`isUser(x)\` или \`validate(x)\`, без специального типа возврата компилятор после вызова «забывает» результат, и приходится писать \`as\` (приведение типа «поверь мне») — а это дыра. Type guard и assertion переносят знание из проверки в систему типов: проверку написали один раз, а компилятор использует её во всех местах вызова.

## Словарик терминов

- **Сужение типа (narrowing)** — когда после проверки компилятор считает тип более конкретным: после \`typeof x === 'string'\` внутри \`if\` у \`x\` тип \`string\`.
- **Анализ потока управления (control flow analysis, CFA)** — механизм компилятора, который следит за ветками \`if\`, \`return\`, \`throw\` и вычисляет тип переменной в каждой точке кода.
- **Предикат типа (type predicate)** — тип возврата вида \`x is T\`: «если функция вернула \`true\`, то \`x\` — это \`T\`».
- **Type guard (охранник типа)** — функция с предикатом в типе возврата, возвращающая \`boolean\`.
- **Assertion-функция (функция-утверждение)** — функция с типом возврата \`asserts x is T\` или \`asserts cond\`: либо бросает исключение, либо гарантирует условие для всего кода после вызова.
- **Инвариант** — условие, которое по логике программы всегда должно быть истинным; его нарушение — баг, а не сценарий.
- **\`never\`** — тип «значения не бывает»; так компилятор помечает недостижимые ветки.
- **\`NonNullable<T>\`** — встроенная утилита: \`T\` без \`null\` и \`undefined\`.
- **Выведенный предикат (inferred type predicate)** — с TypeScript 5.5 компилятор сам выводит \`x is T\` для простых функций вроде \`x => x != null\`.
- **\`this is T\`** — предикат для метода: «если метод вернул \`true\`, объект, на котором его вызвали, — это \`T\`».
- **Дискриминируемый union (discriminated union)** — объединение объектов с общим полем-меткой: \`{ kind: 'circle'; r: number } | { kind: 'square'; side: number }\`.
- **Unsound (несостоятельная) типизация** — когда тип говорит одно, а в рантайме лежит другое, и компилятор этого не видит.

## Как это работает под капотом

Что делает компилятор:

1. Встречая вызов \`isString(val)\` в условии \`if\`, он смотрит на **тип возврата** функции, а не на её тело. Видит предикат \`x is string\` и запоминает: «в ветке \`true\` у \`val\` тип пересекается со \`string\`».
2. В ветке \`false\` он **исключает** \`T\` из исходного типа: из \`string | number\` остаётся \`number\`. Это важно: в \`else\` компилятор считает, что значение точно **не** \`T\`.
3. После \`if\` (если обе ветки дошли до конца) сужение пропадает: снаружи \`val\` снова \`string | number\`.
4. Встречая вызов assertion-функции **отдельной инструкцией**, компилятор помечает эту точку в потоке управления: «дальше считаем, что \`x\` — это \`T\`». Логика такая: если бы условие нарушилось, функция бросила бы исключение, и выполнение сюда не дошло бы.
5. Чтобы применить это при анализе потока, компилятор должен определить тип вызываемой функции **заранее**, без полной проверки кода (иначе получился бы замкнутый круг). Поэтому для assertion-вызовов действуют жёсткие правила: функция должна быть доступна по простому имени или цепочке \`a.b.c\`, и каждое имя в цепочке — с явным типом (ошибки TS2775 и TS2776).
6. **Тело функции ни в одном из случаев не проверяется** на соответствие предикату. Компилятор полностью доверяет объявленной сигнатуре.
7. В JS всё стирается: guard — обычная функция, возвращающая \`boolean\`, assertion — функция, возвращающая \`undefined\` или бросающая исключение.

### Пример 1. Type guard для развилки

\`\`\`ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

declare const val: string | number;
if (isString(val)) {
  val.toUpperCase();   // val: string
} else {
  val.toFixed();       // val: number — здесь тоже нормальный сценарий
}
// здесь val снова: string | number
\`\`\`

Сужение действует **только внутри ветки**. Идеально для \`if\`, \`filter\`, \`switch\` и тернарного оператора: обе ветки валидны, их нужно обработать по-разному.

### Что происходит в ветке \`else\`

\`\`\`ts
function isNonEmpty(s: string): s is string {
  return s.length > 0;
}

function show(s: string) {
  if (isNonEmpty(s)) { /* ... */ }
  else {
    s;   // s: never — компилятор считает эту ветку недостижимой!
  }
}
\`\`\`

Ловушка: предикат читается как «если \`false\`, то \`s\` — **не** \`string\`». Но \`s\` и так \`string\`, значит, в \`else\` у неё тип \`never\`. Guard должен проверять принадлежность к **типу**, а не произвольное условие вроде «строка непустая». Для таких проверок нужна обычная функция, возвращающая \`boolean\`.

### Пример 2. Type guard в \`filter\`

\`\`\`ts
function isNonNull<T>(x: T): x is NonNullable<T> {
  return x != null;
}
const arr: (string | null)[] = ['a', null, 'b'];
const clean: string[] = arr.filter(isNonNull);   // ok

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };
function isCircle(s: Shape): s is Extract<Shape, { kind: 'circle' }> {
  return s.kind === 'circle';
}
declare const shapes: Shape[];
const circles = shapes.filter(isCircle);   // { kind: 'circle'; r: number }[]
\`\`\`

У \`Array.prototype.filter\` в стандартной библиотеке есть перегрузка, которая принимает предикат \`value is S\` и возвращает \`S[]\`. Обычная функция с \`boolean\` попадает в другую перегрузку, и массив остаётся \`(string | null)[]\`. \`!= null\` (нестрогое сравнение) отсекает и \`null\`, и \`undefined\` одной проверкой; \`Extract<Shape, ...>\` выбирает из union нужный член.

### Выведенные предикаты (TypeScript 5.5+)

\`\`\`ts
const r1 = arr.filter(x => x != null);              // string[]
const r2 = shapes.filter(s => s.kind === 'circle'); // { kind: 'circle'; r: number }[]
const isNum = (x: unknown) => typeof x === 'number';
// тип: (x: unknown) => x is number

const nums: (number | null)[] = [0, 1, null];
const r3 = nums.filter(x => !!x);                   // (number | null)[] — НЕ сужено
const r4 = nums.filter(Boolean);                    // (number | null)[] — НЕ сужено
const r5 = nums.filter(x => typeof x === 'number'); // number[]
const r6: string[] = arr.filter(x => x);
// TS2322: Type '(string | null)[]' is not assignable to type 'string[]'.
\`\`\`

С TypeScript 5.5 простые предикаты **выводятся автоматически**: \`arr.filter(x => x != null)\` корректно убирает \`null\` без ручного guard. Но вывод срабатывает, только если верно и обратное: «\`false\` означает **не** \`T\`». Для \`!!x\` это неверно — \`0\` тоже ложно, и при \`false\` \`x\` может оказаться числом, — поэтому компилятор честно ничего не выводит. То же с \`x => x\` для строк (пустая строка ложна) и с \`filter(Boolean)\`.

### Пример 3. Assertion-функция для инварианта

\`\`\`ts
function assertString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('ожидалась строка');
}

function useA(v: string | number) {
  assertString(v);
  v.toUpperCase();   // v: string — и так до конца функции
}
\`\`\`

Никакого \`if\` не нужно: после вызова компилятор считает тип гарантированным **для всего кода ниже**. Если условие не выполнилось, программа просто не дойдёт до следующей строки.

### Форма \`asserts cond\`

Есть и упрощённая форма без \`is T\` — \`asserts cond\`. Она сужает по самому условию, переданному аргументом:

\`\`\`ts
function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function useB(user: { name: string } | null) {
  assert(user !== null, 'пользователь обязателен');
  user.name;   // null уже исключён
}
\`\`\`

Компилятор берёт выражение \`user !== null\` из места вызова и применяет его как обычную проверку. Так же объявлена \`assert\` из \`node:assert\` в \`@types/node\`: \`function assert(value: unknown, message?: string | Error): asserts value\`.

### Пример 4. Обобщённая assertion: \`assertDefined\`

\`\`\`ts
function assertDefined<T>(x: T, name: string): asserts x is NonNullable<T> {
  if (x == null) throw new Error(\`\${name} is required\`);
}

function use(id?: string) {
  assertDefined(id, 'id');
  return id.toUpperCase();   // id: string для всей оставшейся функции
}
\`\`\`

Дженерик делает утилиту универсальной: из \`string | undefined\` получается \`string\`, из \`User | null\` — \`User\`. Вторым аргументом удобно передавать имя, чтобы сообщение об ошибке было понятным.

### Предикат \`this is T\` в методах

\`\`\`ts
class TreeNode {
  children: TreeNode[] = [];
  isFolder(): this is FolderNode { return this instanceof FolderNode; }
}
class FolderNode extends TreeNode { name = 'dir'; }

declare const node: TreeNode;
if (node.isFolder()) {
  node.name;   // node: FolderNode
}
\`\`\`

Предикат может относиться не к аргументу, а к объекту, на котором вызван метод. Это удобно для иерархий узлов (дерево файлов, узлы грида, AST). Существует и \`asserts this is T\`.

### Правила вызова assertion-функций

\`\`\`ts
const assertArrow = (c: unknown): asserts c => { if (!c) throw new Error(); };
function useC(x: string | null) {
  assertArrow(x);
  // TS2775: Assertions require every name in the call target to be declared with an explicit type annotation.
  x.length;   // TS18047: 'x' is possibly 'null'. — сужения не произошло
}

// так работает: тип указан у самой константы
const assertTyped: (c: unknown, msg?: string) => asserts c =
  (c, msg) => { if (!c) throw new Error(msg); };

class Validator {
  assertPositive(n: number | null): asserts n is number {
    if (n == null || n <= 0) throw new Error('n > 0');
  }
  check(n: number | null) { this.assertPositive(n); /* n: number */ }
}
declare function getValidator(): Validator;
const v = new Validator();
const v2: Validator = new Validator();

function useE(n: number | null) {
  v.assertPositive(n);          // TS2775 — у v нет явной аннотации типа
  v2.assertPositive(n);         // ok, дальше n: number
  getValidator().assertPositive(n);
  // TS2776: Assertions require the call target to be an identifier or qualified name.
}

function badReturn(x: unknown): asserts x is string { return true; }
// TS2322: Type 'boolean' is not assignable to type 'void'.
async function assertAsync(x: unknown): Promise<asserts x is string> {}
// TS1228: A type predicate is only allowed in return type position for functions and methods.
\`\`\`

Правила такие: вызываемое должно быть простым именем или цепочкой \`a.b.c\` (не результатом вызова и не \`obj['key']\`), и каждое имя в цепочке — объявлено с явным типом. Объявление \`function\` и метод через \`this\` подходят сразу; стрелочная функция в \`const\` — только с аннотацией типа у самой константы. Assertion-функция обязана возвращать \`void\` и не может быть асинхронной.

### Компилятор верит вам на слово

\`\`\`ts
interface Cat { meow(): void }
function isCat(x: unknown): x is Cat { return true; }   // компилируется без замечаний

const pet: unknown = { bark() {} };
if (isCat(pet)) pet.meow();   // TypeError: pet.meow is not a function
\`\`\`

TypeScript не проверяет тело ни предиката, ни ассерта — он полностью доверяет сигнатуре. Неверная реализация даёт ложное сужение и unsound-типизацию, причём хуже, чем \`as\`: приведение видно в месте использования, а лживый guard прячется в одной функции и «заражает» все её вызовы. Поэтому guard для данных извне проверяет все поля, на которые потом опирается код, или строится на схеме валидации.

### Как выбрать

- **Type guard** — когда обе ветки валидны и требуют разной обработки: данные бывают разные, union из API, фильтрация массива.
- **Assertion** — когда несоответствие означает баг или нарушенный контракт, а код ниже на это полагается: обязательный конфиг, «элемент точно уже отрендерен», предусловия функции.
- **Спросите себя**: «если проверка не прошла — это нормальный ход событий или поломка?» Нормальный ход → guard, поломка → assertion.
- **Для ожидаемо «плохих» данных** (ввод пользователя, ответ сервера) — guard и явная обработка ошибки, а не исключение.

### Где это применяется на практике

- **Angular и RxJS**: \`isSignal(value): value is Signal<unknown>\`, \`isWritableSignal\`, \`isObservable(obj): obj is Observable<unknown>\` — библиотечные type guard, чтобы принимать «значение, сигнал или поток» в одном API.
- **HTTP-слой**: guard \`isApiError(body)\` в обработке ответов и в \`catchError\`, где ошибка приходит как \`unknown\`; \`instanceof HttpErrorResponse\` — встроенный вариант той же идеи.
- **NgRx-редьюсеры и дискриминируемые union**: guard по полю \`type\` или \`kind\`, фильтрация потока действий.
- **Компоненты**: \`assertDefined(this.grid())\` для обязательного \`viewChild\`, проверка обязательных входных данных в \`ngOnInit\`.
- **Тесты**: \`assertDefined(fixture.componentInstance.user)\` вместо \`!\` — тест падает с понятным сообщением, а не с \`TypeError\` строкой ниже.
- **Конфигурация и окружение**: \`assert(config.apiUrl, 'apiUrl обязателен')\` при старте приложения.

## Важные нюансы и подводные камни

- **Компилятор верит вам на слово.** \`function isCat(x: unknown): x is Cat { return true; }\` скомпилируется без единого замечания и обрушит приложение в рантайме.
- **Для assertion-функции обязательна явная аннотация типа.** \`const assert = (c: unknown): asserts c => ...\` без аннотации у самой константы даёт TS2775 при вызове, и сужения не будет; надёжнее объявлять через \`function\`.
- **Assertion не работает с методами объекта в некоторых позициях**: через \`this.method()\` — работает, через экземпляр без явного типа (\`const v = new Validator()\`) — TS2775, через результат вызова или \`obj['key']\` — TS2776.
- **Assertion работает только как отдельная инструкция.** Внутри выражения (\`const ok = assert(x)\` или \`void assert(x)\`) она не сужает — её смысл в «если дошли до следующей строки, условие верно».
- **Ветка \`else\` у guard означает «точно не \`T\`».** Guard с условием, не связанным с типом (\`s is string\` при проверке длины), делает \`else\` веткой типа \`never\`.
- **Выведенные предикаты (TS 5.5) срабатывают не всегда.** \`x => !!x\` и \`filter(Boolean)\` не сужают, если среди значений есть ложные (\`0\`, \`''\`).
- **Не злоупотребляйте assertion в бизнес-логике.** Исключение — это остановка сценария; для ожидаемых «плохих» данных лучше guard и явная обработка.
- **Assertion-функция не может быть \`async\`** и обязана возвращать \`void\`.

**Плюсы:** проверка пишется один раз и переиспользуется компилятором; меньше \`as\` и \`!\`; assertion убирает вложенные \`if\` и документирует инварианты; guard естественно работает с \`filter\` и ветвлением.
**Минусы:** тело не проверяется — лживый guard хуже \`as\`; у assertion строгие правила вызова (TS2775, TS2776); исключения из assertion нужно где-то обрабатывать.

## Как это спрашивают на собеседовании

**Главный вывод:** guard возвращает \`boolean\` и сужает тип внутри ветки — для ситуаций, где обе ветки нормальны; assertion бросает исключение и сужает тип для всего кода после вызова — для инвариантов. Ни тот, ни другой не проверяется компилятором: он доверяет сигнатуре.

Типичные формулировки: «Чем \`x is T\` отличается от \`asserts x is T\`?», «Как отфильтровать \`null\` из массива с правильным типом?», «Что такое assertion function?», «Когда использовать каждый?».

Что могут спросить следом:

- *Проверяет ли TypeScript тело type guard?* — Нет, он верит сигнатуре; неверная реализация даёт ложное сужение.
- *Почему стрелочная assertion-функция даёт ошибку при вызове?* — Компилятору нужен явный тип у вызываемого имени (TS2775); нужна аннотация у константы или объявление через \`function\`.
- *Что изменилось в TypeScript 5.5?* — Компилятор сам выводит предикаты для простых функций, поэтому \`arr.filter(x => x != null)\` даёт \`string[]\`.
- *Что будет в ветке \`else\` у guard?* — Тип без \`T\`; если исходный тип и есть \`T\`, получится \`never\`.
- *Чем assertion лучше оператора \`!\`?* — \`!\` ничего не проверяет в рантайме, а assertion бросает понятное исключение в месте нарушения.

### Ответ на 1 минуту

> Type guard — это функция с типом возврата \`x is T\`, которая возвращает boolean: при \`true\` компилятор сужает аргумент внутри ветки, а в \`else\` исключает \`T\`. Assertion-функция с типом возврата \`asserts x is T\` или \`asserts cond\` ничего не возвращает и бросает исключение, если условие нарушено, а после её вызова тип сужен для всего последующего кода без всяких \`if\`. Guard я беру, когда обе ветки нормальны — union из API, \`filter\` для удаления \`null\`; assertion — когда несоответствие означает баг: обязательный конфиг, обязательный \`viewChild\`, предусловие функции. Важно, что TypeScript не проверяет тело ни того, ни другого — он верит сигнатуре, и лживый guard даёт unsound-типизацию. У assertion есть ограничение: вызываемое имя должно иметь явный тип, иначе ошибка TS2775. И с TypeScript 5.5 простые предикаты вроде \`x => x != null\` компилятор выводит сам.`,
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
      ru: `## В чём суть

Когда в условный тип подставляют **union**, TypeScript ведёт себя неожиданно: он не проверяет весь union целиком, а прогоняет условие **по каждому члену отдельно** и склеивает результаты обратно в union. Срабатывает это только если слева от \`extends\` стоит «голый» параметр типа \`T\` — сам по себе, без обёрток. Отключают распределение, оборачивая обе стороны в кортеж: \`[T] extends [U]\`.

Аналогия: сортировочная лента на почте. Пачку писем не взвешивают целиком — каждое письмо по одному проходит через сканер, получает свою наклейку, а на выходе все письма снова собираются в одну корзину. Письма, которые сканер отбраковал (\`never\`), в корзину просто не попадают. А если пачку запечатать в коробку (кортеж \`[T]\`), сканер увидит одну коробку и вынесет одно решение на всё сразу.

**Какую проблему решает.** На дистрибутивности построена вся работа с union на уровне типов: фильтрация (\`Exclude\`, \`Extract\`), преобразование каждого члена (\`ToArray\`, \`DistributiveOmit\`), извлечение частей через \`infer\`. Без неё каждую такую утилиту пришлось бы писать вручную для каждого варианта union. А понимание, когда распределение происходит и как его выключить, спасает от загадочных результатов: \`string[] | number[]\` вместо \`(string | number)[]\`, \`never\` вместо \`true\`, \`FormControl<string> | FormControl<number>\` вместо \`FormControl<string | number>\`.

## Словарик терминов

- **Union (объединение)** — тип «одно из»: \`string | number\`. Члены union — его составляющие (\`string\` и \`number\`).
- **Условный тип (conditional type)** — «тернарник на уровне типов»: \`T extends U ? X : Y\` — «если \`T\` совместим с \`U\`, то \`X\`, иначе \`Y\`».
- **Проверяемый тип (check type)** — то, что стоит **слева** от \`extends\` в условном типе.
- **Параметр типа (type parameter)** — переменная в угловых скобках: \`T\` в \`type ToArray<T> = ...\`.
- **«Голый» параметр типа (naked type parameter)** — когда слева от \`extends\` стоит просто \`T\`, а не \`T[]\`, \`[T]\`, \`Promise<T>\` или \`keyof T\`.
- **Дистрибутивный условный тип (distributive conditional type)** — условный тип, который распределяется по членам union.
- **\`never\`** — тип без значений; в union он исчезает (\`'a' | never\` — это \`'a'\`), а сам по себе ведёт себя как **пустой union**.
- **Кортеж-обёртка \`[T]\`** — кортеж из одного элемента; оборачивание делает \`T\` «не голым» и выключает распределение.
- **\`infer\`** — ключевое слово внутри условного типа, которое вытаскивает часть типа в новую переменную: \`T extends (infer U)[] ? U : never\`.
- **\`Exclude<T, U>\` / \`Extract<T, U>\`** — встроенные утилиты: убрать из union члены, совместимые с \`U\`, или оставить только их.
- **\`NonNullable<T>\`** — встроенная утилита: \`T\` без \`null\` и \`undefined\`.
- **\`Omit<T, K>\`** — встроенная утилита: тип \`T\` без ключей \`K\`.
- **Дискриминируемый union (discriminated union)** — union объектов с общим полем-меткой (\`kind: 'circle' | 'square'\`), по которому TypeScript различает варианты.

## Как это работает под капотом

Как компилятор вычисляет условный тип:

1. При **объявлении** \`type F<T> = T extends U ? X : Y\` компилятор смотрит, что стоит слева от \`extends\`. Если это голый параметр типа — тип помечается как дистрибутивный. Решение принимается один раз, по тексту объявления.
2. При **подстановке** \`F<A | B | C>\` дистрибутивный тип не проверяет \`A | B | C\` целиком, а вычисляется трижды: \`F<A>\`, \`F<B>\`, \`F<C>\`. Внутри веток \`X\` и \`Y\` под \`T\` в каждом прогоне понимается **текущий член**, а не весь union.
3. Результаты объединяются: \`F<A> | F<B> | F<C>\`. Члены, давшие \`never\`, растворяются — так union фильтруется.
4. Если подставить \`never\`, то есть пустой union, перебирать нечего — результат \`never\`, и ни одна ветка даже не вычисляется.
5. \`any\` — особый случай: если справа не \`any\` или \`unknown\`, компилятор не может решить, и результат — union **обеих** веток.
6. Если слева стоит не голый \`T\`, а, например, \`[T]\`, распределения нет: union проверяется как единое целое обычной проверкой совместимости.

Упрощённо логика выглядит так:

\`\`\`ts
// псевдокод вычисления T extends U ? X : Y
function evaluate(T, U, X, Y, distributive) {
  if (distributive && isUnion(T)) {
    // never — пустой union: members пуст, результат — never
    return union(T.members.map(m => evaluate(m, U, X(m), Y(m), false)));
  }
  if (isAny(T)) return union(X, Y);
  return isAssignable(T, U) ? X : Y;
}
\`\`\`

### Пример 1. \`ToArray\`: распределение по шагам

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;

type R = ToArray<string | number>;
// шаг 1: ToArray<string> | ToArray<number>
// шаг 2: string[] | number[]
// а НЕ (string | number)[] — вот это и удивляет
\`\`\`

Условие \`T extends any\` всегда истинно, ветка \`never\` недостижима. Такой тип пишут **не ради условия, а ради распределения**: «примени \`T[]\` к каждому члену». Разница существенная: \`string[] | number[]\` — это «либо массив строк, либо массив чисел», а \`(string | number)[]\` — смешанный массив.

### Пример 2. \`Exclude\` и \`Extract\`: фильтрация union

\`\`\`ts
// так они объявлены в lib.es5.d.ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type E1 = Exclude<'a' | 'b' | 'c', 'b'>;
// 'a' -> 'a', 'b' -> never, 'c' -> 'c'
// = 'a' | never | 'c'
// = 'a' | 'c'   — never в union просто исчезает

type E2 = Extract<'a' | 'b' | 1, string>;   // 'a' | 'b'

type WithoutNull<T> = T extends null | undefined ? never : T;
type C = WithoutNull<string | null | number>;   // string | number
\`\`\`

Работают два механизма вместе: распределение по членам и свойство \`never\` растворяться в union. Каждый член проходит проверку отдельно, отбракованные становятся \`never\` и пропадают.

### \`NonNullable\` сегодня — уже не условный тип

\`\`\`ts
// lib.es5.d.ts в TypeScript 5.9
type NonNullable<T> = T & {};

type N = NonNullable<string | null | undefined>;   // string
\`\`\`

Раньше \`NonNullable\` был объявлен как условный тип \`T extends null | undefined ? never : T\`, но с TypeScript 4.8 это пересечение с \`{}\`. \`{}\` означает «любое значение, кроме \`null\` и \`undefined\`», поэтому \`null & {}\` упрощается до \`never\`, а \`string & {}\` — до \`string\`. Результат тот же, но механизм уже не дистрибутивность, а упрощение пересечений.

### Пример 3. \`infer\` внутри распределения

\`\`\`ts
type ElementType<T> = T extends (infer U)[] ? U : never;

type El = ElementType<string[] | number[]>;   // string | number

type Boxed<T> = T extends any ? { value: T } : never;
type B = Boxed<string | number>;   // { value: string } | { value: number }
\`\`\`

\`ElementType\` сначала распределяется (\`string[]\` и \`number[]\` отдельно), в каждом прогоне \`infer U\` достаёт тип элемента, и результаты склеиваются. \`Boxed\` показывает, что в ветке под \`T\` понимается текущий член: получилось два разных объекта, а не \`{ value: string | number }\`.

### Особый случай: \`never\` на входе

\`\`\`ts
type TN = ToArray<never>;   // never, а не never[]

type IsNeverBad<T> = T extends never ? true : false;
type X = IsNeverBad<never>;   // never — ни true, ни false!
\`\`\`

\`never\` — это **пустой union**. Распределять не по чему, поэтому результат тоже \`never\`, а не ветка \`false\` и не ветка \`true\`. Это регулярно ставит в тупик: наивная проверка «это never?» на \`never\` возвращает \`never\`.

### Как выключить распределение

\`\`\`ts
type IsNever<T> = [T] extends [never] ? true : false;
type A1 = IsNever<never>;    // true — без скобок было бы never
type A2 = IsNever<string>;   // false

type NoDistribute<T> = [T] extends [string] ? 'yes' : 'no';
type A3 = NoDistribute<string | number>;   // 'no' — union проверен как единое целое
type A4 = NoDistribute<'a' | 'b'>;         // 'yes' — весь union совместим со string

type ToArrayNoDist<T> = [T] extends [any] ? T[] : never;
type A5 = ToArrayNoDist<string | number>;   // (string | number)[]

type IsNeverBad2<T> = [T] extends never ? true : false;
type A6 = IsNeverBad2<never>;   // false — кортеж никогда не совместим с never
\`\`\`

Обёртка в кортеж делает \`T\` «не голым», и union проверяется целиком. Оборачивать надо **обе** стороны: \`[T] extends [never]\` сравнивает «кортеж из \`T\`» с «кортежем из \`never\`», а \`[T] extends never\` всегда ложно — кортеж не совместим с \`never\`.

### \`boolean\` и \`any\` — скрытые сюрпризы

\`\`\`ts
type IsTrue<T> = T extends true ? 'A' : 'B';
type B1 = IsTrue<boolean>;   // 'A' | 'B'

type IsStr<T> = T extends string ? 'y' : 'n';
type B2 = IsStr<any>;        // 'y' | 'n'
type B3 = IsStr<unknown>;    // 'n'
type B4 = any extends string ? 'y' : 'n';   // 'y' | 'n' — и без параметра
\`\`\`

\`boolean\` — это \`true | false\`, то есть тоже union, поэтому \`T extends true ? A : B\` на \`boolean\` даёт \`A | B\`, а не одну ветку. \`any\` уходит в обе ветки сразу — это не распределение, а особое правило для \`any\`, и оно работает даже без параметра типа. \`unknown\` ведёт себя честно: он не совместим со \`string\`, ветка \`'n'\`.

### Распределение работает только через параметр типа

\`\`\`ts
type Direct = (string | number) extends string ? 'y' : 'n';   // 'n'
type ViaParam = IsStr<string | number>;                        // 'y' | 'n'
\`\`\`

Если union написан прямо в условном типе, распределения нет — проверяется весь union. Дистрибутивность — свойство **объявления с голым параметром**, а не union как такового.

### \`Omit\` и дискриминируемые union

\`\`\`ts
type Shape =
  | { id: string; kind: 'circle'; r: number }
  | { id: string; kind: 'square'; side: number };

type NoId = Omit<Shape, 'id'>;   // { kind: 'circle' | 'square' } — r и side пропали!
const s1: NoId = { kind: 'circle', r: 1 };
// TS2353: Object literal may only specify known properties, and 'r' does not exist in type 'NoId'.

type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never;
type NoId2 = DistributiveOmit<Shape, 'id'>;
const s2: NoId2 = { kind: 'circle', r: 1 };      // ok
const s3: NoId2 = { kind: 'circle', side: 1 };   // TS2353 — связь kind ↔ поля сохранилась
\`\`\`

\`Omit\` не дистрибутивен: он строится через \`keyof T\`, а \`keyof\` у union — это только **общие** ключи (\`id\` и \`kind\`). Поэтому \`Omit\` разрушает дискриминируемые union. Свой хелпер с \`T extends any\` применяет \`Omit\` к каждому варианту отдельно.

### Как это сделано в Angular: \`FormBuilder\`

Внутренний тип \`ɵElement\` в \`@angular/forms\`, который вычисляет тип контрола для \`fb.group({...})\`, написан с обёрткой: \`[T] extends [FormControl<infer U>] ? FormControl<U> : ...\`. Зачем — видно на сравнении:

\`\`\`ts
type ElementNoWrap<T> = T extends FormControl<infer U> ? FormControl<U> : FormControl<T>;
type ElementWrap<T>   = [T] extends [FormControl<infer U>] ? FormControl<U> : FormControl<T>;

type W1 = ElementNoWrap<string | number>;   // FormControl<string> | FormControl<number>
type W2 = ElementWrap<string | number>;     // FormControl<string | number>

const g = fb.nonNullable.group({ amount: [0 as number | string] });
g.controls.amount;   // FormControl<string | number>
\`\`\`

Без обёртки контрол со значением «число или строка» превратился бы в «либо контрол чисел, либо контрол строк». У такого union метод \`setValue\` принимает только то, что подходит **обоим** вариантам, то есть \`string & number\` — \`never\`, и вызов \`setValue('10')\` падает с TS2345: «Argument of type '"10"' is not assignable to parameter of type 'never'».

### Mapped types тоже распределяются

\`\`\`ts
type PU = Partial<{ a: 1 } | { b: 2 }>;   // { a?: 1 } | { b?: 2 }
\`\`\`

Гомоморфные mapped types (вида \`{ [K in keyof T]: ... }\`, где \`T\` — параметр) при подстановке union тоже применяются к каждому члену. Поэтому \`Partial\`, \`Readonly\`, \`Required\` сохраняют структуру дискриминируемых union, а \`Omit\` и \`Pick\` (которые строятся через \`keyof\` всего union) — нет.

### Где это применяется на практике

- **Фильтрация union**: \`Exclude<Status, 'idle'>\`, \`Extract<Action, { type: 'load' }>\` — выбрать из union действий NgRx или событий нужные.
- **Дискриминируемые union в формах и API**: \`DistributiveOmit<Payload, 'id'>\` для DTO создания, где \`id\` ещё нет, но варианты по \`kind\` должны сохраниться.
- **Библиотечные типы**: типизированные формы Angular (\`FormBuilder\`, обёртка \`[T]\`), вывод типов событий в обёртках над DOM и WebSocket.
- **Утилиты проверки типов**: \`IsNever\`, \`IsUnion\`, \`Equals\` в тестах типов и в сложных дженериках сторов.
- **Извлечение данных**: \`ElementType<T>\`, \`Awaited\`-подобные распаковки ответов API, где ответ может быть union нескольких форм.

## Важные нюансы и подводные камни

- **\`boolean\` — это \`true | false\`**, то есть тоже union. Поэтому \`T extends true ? A : B\` на \`boolean\` даст \`A | B\`, а не одну ветку.
- **\`any\` уходит в обе ветки сразу**: \`any extends string ? 'y' : 'n'\` — это \`'y' | 'n'\`, даже без параметра типа.
- **\`never\` на входе даёт \`never\`**, а не ветку \`false\`: пустой union распределять не по чему. Проверка на \`never\` — только \`[T] extends [never]\`.
- **Оборачивать надо обе стороны.** \`[T] extends never\` не сработает (всегда \`false\`) — нужно именно \`[T] extends [never]\`.
- **\`Omit\` не дистрибутивен** и поэтому разрушает дискриминируемые union. Нужен свой хелпер: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`.
- **\`NonNullable\` в современных версиях — не условный тип**, а \`T & {}\` (с TypeScript 4.8); результат тот же, механизм другой.
- **\`T extends any ? ... : ...\` часто пишут не ради условия, а именно ради распределения** — ветка else там просто недостижима.
- **Распределение — свойство объявления.** Union, написанный прямо в условии, не распределяется; оборачивание \`T[]\`, \`Promise<T>\`, \`keyof T\` слева тоже выключает распределение.
- **Большие union умножают работу компилятора.** Каждый член вычисляется отдельно, а вложенные дистрибутивные типы над несколькими union дают комбинаторный рост — это заметно по скорости IDE.

**Плюсы:** фильтрация и преобразование union одной строкой; основа встроенных утилит; точные типы для каждого варианта дискриминируемого union.
**Минусы:** неочевидное поведение на \`never\`, \`boolean\` и \`any\`; легко получить \`A[] | B[]\` там, где ожидался \`(A | B)[]\`; не все встроенные утилиты дистрибутивны (\`Omit\`, \`Pick\`).

## Как это спрашивают на собеседовании

**Главный вывод:** условный тип с голым параметром слева от \`extends\` применяется к каждому члену union отдельно, а результаты объединяются; \`never\`-результаты исчезают, на этом построены \`Exclude\` и \`Extract\`. Выключается распределение обёрткой обеих сторон в кортеж: \`[T] extends [U]\`.

Типичные формулировки: «Почему \`ToArray<string | number>\` даёт \`string[] | number[]\`?», «Как работает \`Exclude\`?», «Как проверить, что тип — \`never\`?», «Как отключить распределение?».

Что могут спросить следом:

- *Что вернёт дистрибутивный тип на \`never\`?* — \`never\`, потому что \`never\` — пустой union и ветки не вычисляются.
- *Почему \`Omit\` ломает дискриминируемый union?* — Он строится через \`keyof\` всего union, а это только общие ключи; нужен \`DistributiveOmit\`.
- *Что будет с \`boolean\`?* — Он распределится как \`true | false\` и даст union обеих веток.
- *Распределяется ли \`(string | number) extends string ? ... : ...\`?* — Нет, распределение работает только через голый параметр типа.
- *Как устроен \`NonNullable\`?* — Сейчас это \`T & {}\`, а не условный тип.

### Ответ на 1 минуту

> Условный тип распределяется по union, если слева от \`extends\` стоит голый параметр типа. Тогда TypeScript применяет условие к каждому члену отдельно и объединяет результаты, поэтому \`ToArray<string | number>\` даёт \`string[] | number[]\`, а не \`(string | number)[]\`. На этом вместе с исчезновением \`never\` в union построены \`Exclude\` и \`Extract\`: отброшенные члены становятся \`never\` и пропадают. Подводные камни: \`never\` — это пустой union, поэтому дистрибутивный тип на нём возвращает \`never\`, а не ветку else; \`boolean\` — это \`true | false\` и уходит в обе ветки; \`any\` тоже даёт обе ветки. Выключается распределение оборачиванием обеих сторон в кортеж: \`[T] extends [never]\` — классическая проверка \`IsNever\`, и так же сделан \`FormBuilder\` в Angular. На практике чаще всего пишу \`DistributiveOmit\`, потому что обычный \`Omit\` разрушает дискриминируемые union.`,
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
      ru: `## В чём суть

Один флаг важнее всех остальных: \`"strict": true\`. Это не отдельная проверка, а «включить всё сразу» — под ним прячется набор из девяти флагов (в TypeScript 5.9), и самый ценный из них — \`strictNullChecks\`. Ещё два важных флага в \`strict\` **не входят** и включаются отдельно: \`noUncheckedIndexedAccess\` (честность про доступ по индексу) и \`exactOptionalPropertyTypes\` (различие между «ключа нет» и «ключ равен \`undefined\`»).

Аналогия: досмотр в аэропорту. \`strict\` — обязательная рамка и лента для всех пассажиров: ловит большинство опасных вещей. \`noUncheckedIndexedAccess\` и \`exactOptionalPropertyTypes\` — дополнительный углублённый досмотр: дольше и хлопотнее, но находит то, что рамка пропускает. И главное: досмотр работает только **до посадки**. В полёте (в рантайме) никто ничего не проверяет — если опасный предмет пронесли в обход (через \`as\` или данные с сервера), флаги не помогут.

**Какую проблему решает.** По умолчанию TypeScript снисходителен — ради совместимости со старым JavaScript-кодом: \`null\` разрешён в любом типе, параметры без типа молча становятся \`any\`, ошибка в \`catch\` — тоже \`any\`. В таком режиме компилятор — подсказчик, а не контролёр, и пропускает целые классы ошибок вроде «Cannot read properties of undefined». Строгие флаги превращают эти ошибки из рантайм-падений у пользователя в красные подчёркивания в редакторе.

## Словарик терминов

- **\`tsconfig.json\`** — файл настроек компилятора TypeScript; флаги лежат в секции \`compilerOptions\`.
- **\`strict\`** — флаг-«зонтик»: включает набор строгих проверок разом; каждую из них можно потом выключить отдельно.
- **\`strictNullChecks\`** — \`null\` и \`undefined\` перестают входить в любой тип; их надо объявлять явно (\`string | null\`) и проверять перед использованием.
- **\`noUncheckedIndexedAccess\`** — добавляет \`| undefined\` к результату доступа по индексу массива и через index signature (\`Record<string, T>\`).
- **Index signature (индексная сигнатура)** — описание объекта с заранее неизвестными ключами: \`{ [key: string]: number }\`.
- **Опциональное свойство (\`?\`)** — \`name?: string\` означает «свойства может не быть».
- **\`exactOptionalPropertyTypes\`** — делает \`name?: string\` строгим: ключа может не быть, но если он есть — это строка, а не \`undefined\`.
- **\`noImplicitAny\`** — запрещает неявный \`any\`, например у параметра без типа.
- **\`strictFunctionTypes\`** — строгая проверка типов параметров при присваивании функций: обработчик «только для собак» нельзя подставить туда, где передают любых животных.
- **\`strictPropertyInitialization\`** — поле класса должно быть инициализировано в объявлении или в конструкторе.
- **Definite assignment assertion (\`!\`)** — пометка \`name!: string\`: «поверь, поле будет заполнено». Это обещание без проверки.
- **\`useUnknownInCatchVariables\`** — переменная в \`catch (e)\` получает тип \`unknown\` вместо \`any\`.
- **Ретрофит (retrofit)** — включение строгих флагов в уже существующем большом проекте.
- **Рантайм-валидация** — проверка данных во время выполнения, например схемой zod (библиотека, которая описывает форму данных и проверяет её в рантайме).

## Как это работает под капотом

Что происходит, когда вы включаете флаги:

1. Компилятор читает \`tsconfig.json\`. \`"strict": true\` выставляет значение по умолчанию сразу для девяти флагов; любой из них можно переопределить: \`"strict": true, "strictPropertyInitialization": false\` — работает.
2. Флаги меняют **только правила проверки типов**. Сгенерированный JavaScript тот же; исключение — \`alwaysStrict\`, который добавляет \`"use strict"\` в файлы-скрипты.
3. С \`strictNullChecks\` \`null\` и \`undefined\` становятся отдельными типами, а не «подтипами всего». Значение \`T | null\` нельзя использовать как \`T\`, пока вы его не сузили проверкой.
4. С \`noUncheckedIndexedAccess\` чтение через index signature или по индексу массива возвращает \`T | undefined\`. Известные свойства объекта и известные позиции кортежа не затрагиваются.
5. Без \`exactOptionalPropertyTypes\` компилятор молча читает \`name?: string\` как \`name?: string | undefined\`. С флагом — буквально: «ключ отсутствует или строка».
6. Всё это работает только при компиляции. Данные из \`fetch\`, \`localStorage\`, \`JSON.parse\` компилятор не видит.

### Что входит в \`strict\`

\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    // в TypeScript 5.9 это включает:
    // noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply,
    // strictPropertyInitialization, strictBuiltinIteratorReturn (с 5.6),
    // noImplicitThis, useUnknownInCatchVariables (с 4.4), alwaysStrict
    "noUncheckedIndexedAccess": true,     // НЕ входит в strict
    "exactOptionalPropertyTypes": true    // НЕ входит в strict
  }
}
\`\`\`

Набор растёт с версиями: новые строгие проверки добавляют под \`strict\`, поэтому обновление TypeScript иногда приносит новые ошибки в «старом» коде. Для любого нового проекта \`strict\` — база, а не опция.

### \`strictNullChecks\` — самый ценный

\`\`\`ts
let s: string = null;
// TS2322: Type 'null' is not assignable to type 'string'.

const el = document.getElementById('grid');   // HTMLElement | null
el.focus();
// TS18047: 'el' is possibly 'null'.
el?.focus();                                   // ok

function len(s: string | null) {
  return s?.length ?? 0;                       // обязаны учесть null
}
\`\`\`

Без флага \`null\` и \`undefined\` **входят в любой тип**, и компилятор молчит: \`getElementById\` якобы всегда возвращает элемент. С флагом их нужно указывать явно и проверять перед использованием. Именно этот флаг ловит целый класс ошибок «Cannot read properties of undefined» ещё до запуска. \`?.\` (optional chaining) возвращает \`undefined\`, если слева \`null\`/\`undefined\`, а \`??\` подставляет значение по умолчанию. Если из всего списка выбирать один флаг — то этот.

### \`noImplicitAny\`

\`\`\`ts
function format(x) { return x.toFixed(2); }
// TS7006: Parameter 'x' implicitly has an 'any' type.
\`\`\`

\`any\` выключает проверку типов для значения и «заражает» всё, что с ним соприкасается. Без флага параметр без аннотации молча становится \`any\`, и опечатки вроде \`x.toFixd()\` проходят.

### \`strictFunctionTypes\`

\`\`\`ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

let handleAnimal: (x: Animal) => void = () => {};
let handleDog: (x: Dog) => void = (d) => d.bark();
handleAnimal = handleDog;
// TS2322: Type '(x: Dog) => void' is not assignable to type '(x: Animal) => void'.
//   Property 'bark' is missing in type 'Animal' but required in type 'Dog'.

interface Box { handle(x: Animal): void }
const box: Box = { handle(d: Dog) { d.bark(); } };   // ошибки НЕТ — дыра для методов
\`\`\`

Если функцию «для собак» записать в переменную «для любых животных», её вызовут с кошкой, и \`bark()\` упадёт. Флаг это запрещает (параметры проверяются контравариантно — «в обратную сторону»). Но только для свойств-функций: параметры **методов**, объявленных синтаксисом \`handle(x): void\`, остаются бивариантными ради совместимости, и такой код по-прежнему проходит.

### \`strictPropertyInitialization\` и Angular

\`\`\`ts
@Component({ selector: 'app-user', template: '' })
export class UserCard {
  @Input() user: User;
  // TS2564: Property 'user' has no initializer and is not definitely assigned in the constructor.
  @Input() user2!: User;                       // ok, но это обещание без проверки
  @ViewChild('ref') ref: ElementRef;           // TS2564

  readonly user3 = input.required<User>();     // ok, современный способ
  readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid');   // ok
  private readonly http = inject(HttpClient);  // ok — DI тоже инициализирует поле
}
\`\`\`

Поля, которые заполняет Angular через декораторы \`@Input\` и \`@ViewChild\`, компилятор не видит, поэтому требует либо \`!\`, либо инициализацию. Оператор \`!\` — это обещание компилятору, и за него отвечаете вы: если родитель не передал \`user\`, будет \`undefined\`. Сигнальные \`input.required()\` и \`viewChild.required()\` решают это честно. Поля, получаемые через DI — \`inject()\` или параметр конструктора, — инициализированы сразу и \`!\` не требуют.

### \`useUnknownInCatchVariables\`

\`\`\`ts
try { JSON.parse('{'); }
catch (e) {
  e.message;
  // TS18046: 'e' is of type 'unknown'.
  if (e instanceof SyntaxError) console.log(e.message);   // ok после сужения
  else console.log(String(e));
}
\`\`\`

В JS бросить можно что угодно — строку, число, объект. Поэтому \`unknown\` честнее, чем \`any\`: прежде чем читать \`message\`, нужно проверить, что это действительно \`Error\`.

### Остальные флаги из \`strict\`

- **\`strictBindCallApply\`** — проверяет аргументы \`call\`, \`apply\`, \`bind\`: \`toNum.call(null, 'x')\` при \`toNum(n: number)\` — ошибка TS2345.
- **\`noImplicitThis\`** — запрещает \`this\` неизвестного типа в обычных функциях: TS2683 «'this' implicitly has type 'any'».
- **\`alwaysStrict\`** — разбирает код в строгом режиме JS и добавляет \`"use strict"\` в скрипты (ES-модули строгие и так).
- **\`strictBuiltinIteratorReturn\`** (TypeScript 5.6+) — у встроенных итераторов значение при \`done: true\` типизировано как \`undefined\`, а не \`any\`.

### \`noUncheckedIndexedAccess\` — честность про индексы

\`\`\`ts
// "noUncheckedIndexedAccess": true
const arr: number[] = [1, 2];
const x = arr[10];   // без флага: number (враньё); с флагом: number | undefined (правда)
x.toFixed();
// TS18048: 'x' is possibly 'undefined'.

const dict: Record<string, number> = { a: 1 };
const v = dict['b'];               // number | undefined
if (v !== undefined) v.toFixed();  // ok после сужения

for (const n of arr) n.toFixed();  // ok: for...of флаг не затрагивает
const t: [number, string] = [1, 'a'];
t[0].toFixed();                    // ok: известная позиция кортежа
\`\`\`

Флаг делает доступ по индексу честным. То же для \`Record<string, T>\` и любых index signatures. Проверок в коде станет больше, но это как раз те проверки, отсутствие которых даёт баги. В старых версиях TypeScript ошибка звучала как «Object is possibly 'undefined'» (TS2532), в современных — с именем переменной (TS18048).

### \`exactOptionalPropertyTypes\` — различает «нет» и «undefined»

\`\`\`ts
// "exactOptionalPropertyTypes": true
interface Opt { name?: string }

const a: Opt = {};                  // ok (ключа нет)
const b: Opt = { name: 'x' };       // ok
const c: Opt = { name: undefined };
// TS2375: Type '{ name: undefined; }' is not assignable to type 'Opt' with
//   'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
a.name = undefined;
// TS2412: Type 'undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'.

declare const maybe: string | undefined;
const d1: Opt = { name: maybe };                            // TS2375
const d2: Opt = maybe === undefined ? {} : { name: maybe }; // ok
const d3: Opt = { ...(maybe !== undefined && { name: maybe }) };   // ok

interface Opt2 { name?: string | undefined }   // явное разрешение undefined
const e: Opt2 = { name: undefined };           // ok
\`\`\`

Без флага \`{ a?: string }\` разрешает и отсутствие ключа, и явный \`undefined\`. С флагом — только отсутствие; если \`undefined\` нужен, его пишут в тип явно. При чтении \`opt.name\` тип по-прежнему \`string | undefined\`: отсутствующий ключ читается как \`undefined\`.

Зачем это нужно — видно в рантайме: «ключа нет» и «ключ есть со значением \`undefined\`» это разные вещи.

\`\`\`ts
const o = { a: undefined };
Object.keys(o);        // ['a']   — у {} было бы []
'a' in o;              // true    — у {} было бы false
JSON.stringify(o);     // '{}'    — а тут разницы не видно

interface Settings { pageSize: number; theme: string }
const defaults: Settings = { pageSize: 20, theme: 'light' };
function apply(over: Partial<Settings>): Settings {
  return { ...defaults, ...over };
}
apply({ pageSize: undefined }).pageSize;
// без флага: компилируется, тип number, а в рантайме undefined — дефолт затёрт
// с флагом:  TS2379: Argument of type '{ pageSize: undefined; }' is not assignable
//            to parameter of type 'Partial<Settings>' with 'exactOptionalPropertyTypes: true'.
\`\`\`

Последний пример — реальный класс багов: слияние настроек, фильтров грида, PATCH-запросов. Spread \`{ ...defaults, ...over }\` копирует и ключи со значением \`undefined\`, затирая дефолты, а тип продолжает утверждать, что там \`number\`.

### Ещё несколько полезных флагов вне \`strict\`

\`\`\`ts
class Base { save() {} }
class Child extends Base { save() {} }
// TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'Base'.
class Child2 extends Base { override saev() {} }
// TS4113: This member cannot have an 'override' modifier because it is not declared in the base class 'Base'.

function log(k: number) {
  switch (k) {
    case 1: console.log(1);   // TS7029: Fallthrough case in switch.
    case 2: console.log(2); break;
  }
}

function sign(k: number) { if (k > 0) return 'pos'; }
// TS7030: Not all code paths return a value.
\`\`\`

- **\`noImplicitOverride\`** — требует писать \`override\` при переопределении метода. Ловит опечатки в именах и переименования в базовом классе.
- **\`noFallthroughCasesInSwitch\`** — забытый \`break\` в непустом \`case\`.
- **\`noImplicitReturns\`** — функция возвращает значение не во всех ветках.
- **\`noPropertyAccessFromIndexSignature\`** — ключи словаря только через \`dict['key']\`, точка — только для настоящих полей (TS4111).
- Все четыре включает в \`tsconfig.json\` новый проект Angular CLI в strict-режиме, а в \`angularCompilerOptions\` добавляет \`strictTemplates\`, \`strictInjectionParameters\` и \`strictInputAccessModifiers\` — строгую проверку шаблонов, DI и модификаторов доступа у инпутов.

### Как включать строгость в существующем проекте

- **По одному флагу**, начиная с самых ценных: \`noImplicitAny\`, затем \`strictNullChecks\`; каждый отдельным этапом.
- **Отдельный tsconfig для «чистой» части кода**: строгий конфиг включает уже переведённые файлы и проверяется в CI, список постепенно растёт — так, например, команда VS Code переводила свой код на \`strictNullChecks\`.
- **Временное подавление**: \`// @ts-expect-error\` с задачей в трекере, чтобы новые ошибки не появлялись, а старые чинились по мере работы с файлом.
- **Новый код — сразу строгий**: новые модули и библиотеки в монорепозитории создаются со строгим конфигом.

### Где это применяется на практике

- **Enterprise Angular-приложения**: \`strict\` плюс \`strictTemplates\` ловят опечатки в шаблонах, \`null\` из \`async\`-пайпа и сигналов, неверные типы инпутов.
- **Большие гриды и дашборды**: \`noUncheckedIndexedAccess\` при доступе к строкам по индексу и ячейкам по ключу, \`exactOptionalPropertyTypes\` при слиянии настроек колонок и фильтров.
- **HTTP-слой и формы**: \`strictNullChecks\` заставляет обработать «нет данных», а \`exactOptionalPropertyTypes\` — различать «поле не меняем» и «поле очищаем» в PATCH-запросах.
- **Обработка ошибок**: \`useUnknownInCatchVariables\` в \`catchError\` и \`try/catch\` заставляет проверить тип ошибки перед чтением \`message\`.
- **Монорепозитории и библиотеки**: единый строгий базовый tsconfig, который наследуют все проекты.

## Важные нюансы и подводные камни

- **Ретрофит на большом проекте — это надолго.** Включение \`strictNullChecks\` на зрелой кодовой базе даёт тысячи ошибок. Внедряют по частям, иногда пофайлово через отдельный tsconfig.
- **\`strict\` не включает \`noUncheckedIndexedAccess\`** — многие думают, что включает, и удивляются, что \`arr[i]\` всё ещё не \`undefined\`. Так же отдельно включается \`exactOptionalPropertyTypes\`.
- **Набор флагов под \`strict\` растёт с версиями**: сейчас их девять (последний добавлен в TypeScript 5.6 — \`strictBuiltinIteratorReturn\`), и обновление компилятора может принести новые ошибки.
- **\`exactOptionalPropertyTypes\` часто конфликтует со сторонними типами** — библиотеки нередко написаны без него, и появляются странные ошибки на чужих интерфейсах.
- **\`strictPropertyInitialization\` и Angular**: поля с \`@Input\` и \`@ViewChild\` требуют либо \`!\`, либо инициализации, а DI через \`inject()\` или конструктор — нет. Оператор \`!\` — это обещание компилятору, и за него отвечаете вы; лучше \`input.required()\` и \`viewChild.required()\`.
- **\`strictFunctionTypes\` не защищает методы**: параметры методов, объявленных синтаксисом метода, остаются бивариантными.
- **Флаги — это compile-time.** Никакой рантайм-валидации они не дают: данные с сервера всё равно нужно проверять руками или схемой (zod, io-ts).
- **\`as\` и \`!\` обходят любой флаг.** Строгий конфиг с повсеместными \`as any\` даёт ложное чувство безопасности; их стоит ограничивать линтером.

**Плюсы:** ошибки \`null\`/\`undefined\`, неявного \`any\` и неверных типов ловятся до запуска; честные типы на границах (индексы, опциональные поля, ошибки в \`catch\`); лучше подсказки IDE и безопаснее рефакторинг.
**Минусы:** больше проверок и шумного кода (\`?.\`, \`!== undefined\`); болезненный ретрофит; конфликты с типами библиотек при \`exactOptionalPropertyTypes\`; защита только на этапе компиляции.

## Как это спрашивают на собеседовании

**Главный вывод:** базовая рекомендация — \`"strict": true\` (девять флагов в TS 5.9), из них самый ценный \`strictNullChecks\`. \`noUncheckedIndexedAccess\` и \`exactOptionalPropertyTypes\` в \`strict\` не входят: первый добавляет \`| undefined\` к доступу по индексу, второй различает отсутствие ключа и ключ со значением \`undefined\`.

Типичные формулировки: «Какие флаги tsconfig вы включаете?», «Что делает \`strictNullChecks\`?», «Входит ли \`noUncheckedIndexedAccess\` в \`strict\`?», «Чем \`name?: string\` отличается от \`name: string | undefined\`?».

Что могут спросить следом:

- *Как включить strict в большом легаси-проекте?* — По одному флагу и по частям кода: отдельный строгий tsconfig для переведённых файлов, \`@ts-expect-error\` как временная мера.
- *Почему в Angular-компонентах появляются \`!\`?* — Из-за \`strictPropertyInitialization\`: поля с \`@Input\`/\`@ViewChild\` заполняет фреймворк; современная альтернатива — \`input.required()\` и \`viewChild.required()\`.
- *Зачем \`useUnknownInCatchVariables\`?* — Бросить можно что угодно, поэтому ошибка в \`catch\` — \`unknown\`, и её тип нужно проверить.
- *Защищают ли флаги от неверных данных с сервера?* — Нет, это только compile-time; нужна рантайм-валидация.
- *Чем опасен \`{ ...defaults, ...overrides }\` с \`Partial\`?* — Ключ со значением \`undefined\` затирает дефолт; \`exactOptionalPropertyTypes\` это ловит.

### Ответ на 1 минуту

> Базовая рекомендация — \`"strict": true\`: это зонтик, который в TypeScript 5.9 включает девять флагов, среди них \`strictNullChecks\`, \`noImplicitAny\`, \`strictFunctionTypes\`, \`strictPropertyInitialization\` и \`useUnknownInCatchVariables\`. Самый ценный — \`strictNullChecks\`: без него \`null\` и \`undefined\` входят в любой тип, а с ним их нужно объявлять явно и сужать, что ловит целый класс ошибок «Cannot read properties of undefined». \`noUncheckedIndexedAccess\` в \`strict\` не входит: он добавляет \`| undefined\` к доступу по индексу массива и через \`Record<string, T>\`. \`exactOptionalPropertyTypes\` тоже отдельный: он различает «ключа нет» и «ключ равен \`undefined\`», что ловит, например, затирание дефолтов при spread. Практически я включаю строгий режим с первого дня, потому что ретрофит на большой кодовой базе очень болезненный, и помню, что всё это только compile-time — данные с сервера всё равно валидирую.`,
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
