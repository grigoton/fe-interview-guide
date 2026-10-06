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
      ru: `## В чём суть

Дженерик — это переменная, только не для значения, а для типа. Вы пишете функцию, класс или интерфейс, не зная заранее, с каким типом их будут использовать, но обещаете сохранить связь между входом и выходом: «что положили — то и достанете». Ограничение \`extends\` сужает, какие типы можно подставить, а вывод типов избавляет от необходимости писать их руками.

Аналогия: \`T\` — пустое поле в бланке. Пока бланк не заполнен, на его месте пустая строчка. В момент вызова поле заполняется (\`T = string\`), и весь остальной бланк подстраивается автоматически: если в графе «что даём» написано \`string[]\`, то в графе «что получаем» тоже окажется \`string\`. Ограничение — это приписка мелким шрифтом под полем: «впишите что угодно, но обязательно с полем \`id\`».

**Какую проблему решает.** Без дженериков у вас два плохих варианта. Либо писать одну и ту же функцию много раз — \`firstString\`, \`firstNumber\`, \`firstUser\`, — либо объявить параметр как \`any\` и потерять типы на выходе: компилятор перестанет подсказывать поля и ловить опечатки. Дженерик даёт третий путь: один код для всех типов, и при этом полная типобезопасность. На нём держатся \`Array<T>\`, \`Promise<T>\`, \`Observable<T>\`, \`signal<T>\`, \`HttpClient.get<T>\` — почти любой переиспользуемый API.

## Словарик терминов

- **Дженерик (generic)** — функция, класс, интерфейс или тип, у которого есть параметр-тип; пишется в угловых скобках: \`function first<T>(arr: T[]): T\`.
- **Параметр типа (type parameter)** — «дырка» в объявлении: \`<T>\`, \`<K, V>\`. Имя любое, по традиции одна заглавная буква.
- **Аргумент типа (type argument)** — конкретный тип, которым дырку заполняют: \`first<string>(...)\`, \`new Map<number, User>()\`.
- **Ограничение (constraint, \`T extends U\`)** — требование «\`T\` обязан быть присваиваемым к \`U\`». Внутри функции после этого можно пользоваться тем, что гарантирует \`U\`.
- **Присваиваемость (assignability)** — правило «значение типа A можно положить туда, где ждут B». Именно её проверяет \`extends\` в дженериках.
- **Структурная типизация (structural typing)** — TypeScript сравнивает типы по форме (какие поля есть), а не по имени класса. Любой объект с полем \`id: number\` подходит под \`{ id: number }\`.
- **\`keyof T\`** — union всех ключей типа: для \`{ id: number; name: string }\` это \`'id' | 'name'\`.
- **Индексный доступ \`T[K]\` (indexed access type)** — «тип поля \`K\` в типе \`T\`»: \`User['name']\` — это \`string\`.
- **Объединение (union, \`A | B\`)** — «либо A, либо B».
- **Пересечение (intersection, \`A & B\`)** — «и A, и B одновременно»: объект со всеми полями обоих.
- **Вывод типов (type inference)** — компилятор сам вычисляет \`T\` по аргументам вызова, писать \`<string>\` не нужно.
- **Кандидат (inference candidate)** — тип, который компилятор «примерил» на \`T\` по одному из аргументов; если аргументов несколько, кандидатов тоже несколько.
- **Литеральный тип и расширение (literal type, widening)** — \`'a'\` может иметь тип ровно \`'a'\` (литерал) или расшириться до \`string\`.
- **\`as const\`** — пометка у значения: «не расширяй литералы, сделай всё \`readonly\`».
- **\`const\`-параметр типа (TS 5.0)** — \`<const T>\`: то же, что \`as const\`, но со стороны объявления функции.
- **Значение по умолчанию (default type parameter)** — \`<T = string>\`: тип, который подставится, если \`T\` не указали и вывести его неоткуда.
- **\`NoInfer<T>\` (TS 5.4)** — обёртка «не выводи \`T\` из этого места», только проверяй.
- **\`unknown\`** — безопасный «любой тип»: принять можно что угодно, использовать — только после проверки.
- **Стирание типов (type erasure)** — при компиляции в JavaScript все типы, включая \`<T>\`, удаляются; в рантайме дженериков не существует.

## Как это работает под капотом

Что делает компилятор, когда видит вызов \`first(['a', 'b'])\` для \`function first<T>(arr: T[]): T\`:

1. Сначала он видит, что у функции есть параметр типа \`T\`, а аргумент типа явно не передан. Значит, \`T\` нужно вывести.
2. Затем он сопоставляет тип каждого аргумента с типом параметра: \`string[]\` против \`T[]\`. Совпадает «скелет» (массив), поэтому на место \`T\` получается кандидат \`string\`.
3. Если кандидатов несколько (\`T\` встречается в нескольких параметрах), компилятор ищет среди них общий супертип. Если ни один не покрывает остальные, он берёт первый и проверяет по нему остальные аргументы — отсюда ошибки вида «\`string\` is not assignable to \`number\`».
4. Если кандидатов нет совсем (\`T\` есть только в возвращаемом типе), берётся значение по умолчанию; если его нет — ограничение; если нет и его — \`unknown\`.
5. Затем компилятор проверяет, что выбранный \`T\` удовлетворяет ограничению \`extends\`. Не удовлетворяет — ошибка прямо на аргументе.
6. После этого \`T\` подставляется во всю сигнатуру, и возвращаемый тип становится конкретным: \`first(['a', 'b'])\` имеет тип \`string\`.
7. Всё это происходит только при компиляции. В JavaScript угловые скобки просто вырезаются — так что дженерик не может ничего проверить в рантайме.

Вот что остаётся от дженерика после компиляции (проверено \`tsc\`):

\`\`\`ts
// исходник
export function first<T>(arr: T[]): T {
  return arr[0];
}
// результат в .js
export function first(arr) {
    return arr[0];
}
\`\`\`

### Пример 1. \`any\` против дженерика

\`\`\`ts
function firstAny(arr: any[]): any { return arr[0]; }
function first<T>(arr: T[]): T { return arr[0]; }

const a1 = firstAny(['a']);     // any — дальше компилятор слеп
const a2 = first(['a', 'b']);   // string
const a3 = first([1, 2, 3]);    // number

a1.toFixd();   // компилируется, упадёт в рантайме
a2.toFixd();   // ошибка компиляции: у string нет toFixd
\`\`\`

Обе функции принимают что угодно, но только дженерик помнит, что именно приняли. \`any\` разрывает связь входа и выхода, \`T\` её сохраняет.

### Пример 2. Ограничение \`extends\`: что можно делать с \`T\`

По умолчанию про \`T\` неизвестно ничего, поэтому обращаться к его полям нельзя:

\`\`\`ts
function lenNo<T>(x: T): number {
  return x.length;
  // error TS2339: Property 'length' does not exist on type 'T'.
}

function len<T extends { length: number }>(x: T): number {
  return x.length;   // теперь length гарантирован
}
len('abc');   // ок: у строки есть length
len([1, 2]);  // ок: у массива есть length
len(42);
// error TS2345: Argument of type 'number' is not assignable
// to parameter of type '{ length: number; }'.
\`\`\`

\`extends\` здесь не «наследование классов», а «присваиваемость»: строка и массив не наследуются от \`{ length: number }\`, они просто подходят по форме. Это и есть структурная типизация.

### Пример 3. \`keyof\`, \`T[K]\` и безопасный доступ по ключу

Самый частый рабочий паттерн — один параметр типа ограничивает другой:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Ann' };

const n = pluck(user, 'name');  // string
const i = pluck(user, 'id');    // number
pluck(user, 'age');
// error TS2345: Argument of type '"age"' is not assignable
// to parameter of type '"name" | "id"'.
\`\`\`

Как это читается по шагам: \`T\` выводится из \`user\`; \`keyof T\` превращается в \`'id' | 'name'\`; \`K\` выводится из второго аргумента как литерал \`'name'\`; возвращаемый \`T[K]\` — это \`typeof user['name']\`, то есть \`string\`. Опечатка в ключе ловится при компиляции, а IDE подсказывает допустимые ключи.

### Пример 4. Несколько кандидатов на один \`T\`

\`\`\`ts
function pair<T>(a: T, b: T): T[] { return [a, b]; }

pair(1, 2);                          // number[]
pair(1, 'x');
// error TS2345: Argument of type 'string' is not assignable
// to parameter of type 'number'.
pair<number | string>(1, 'x');       // (string | number)[] — явно разрешили оба

class Animal { name = ''; }
class Dog extends Animal { bark() {} }
pair(new Dog(), new Animal());       // Animal[] — общий супертип нашёлся
\`\`\`

Компилятор не «склеивает» кандидатов в union сам: если ни один кандидат не покрывает остальные, побеждает первый, а второй аргумент проверяется по нему. Когда общий супертип есть (\`Animal\` покрывает \`Dog\`), берётся он.

### Пример 5. Литералы: когда \`'a'\` остаётся \`'a'\`, а когда становится \`string\`

\`\`\`ts
function id<T>(x: T): T { return x; }
const i1 = id('a');           // "a"
let i2 = id('a');             // string — let расширяет сам

function wrap<T>(x: T): { value: T } { return { value: x }; }
wrap('a');                    // { value: string }  — расширился
wrap(['a', 'b']);             // { value: string[] }

function wrapS<T extends string>(x: T): { value: T } { return { value: x }; }
wrapS('a');                   // { value: "a" } — ограничение-примитив держит литерал

function wrapC<const T>(x: T): { value: T } { return { value: x }; }
wrapC('a');                   // { value: "a" }
wrapC(['a', 'b']);            // { value: readonly ["a", "b"] }
wrap(['a', 'b'] as const);    // { value: readonly ["a", "b"] }
\`\`\`

Правило упрощённо такое: выведенный литерал расширяется до \`string\`, если у \`T\` нет ограничения-примитива и \`T\` не стоит «голым» в возвращаемом типе. Поэтому \`id('a')\` сохраняет \`"a"\`, а \`wrap('a')\` — нет. Чтобы сохранить точные значения, есть два инструмента: \`as const\` у аргумента (решает вызывающий) и \`<const T>\` в объявлении (решает автор функции, TS 5.0+).

### Значения по умолчанию: \`<T = ...>\`

\`\`\`ts
function make<T>(): T[] { return []; }
make();                       // unknown[] — вывести не из чего

function makeD<T = string>(): T[] { return []; }
makeD();                      // string[] — сработал дефолт
makeD<number>();              // number[] — явный аргумент важнее

function box<T = string>(x: T): T { return x; }
const b = box(42);            // 42 — вывод важнее дефолта

interface ApiResponse<T = unknown> { data: T; status: number }
declare const r: ApiResponse;  // data: unknown

interface Bad<T extends string = number> { v: T }
// error TS2344: Type 'number' does not satisfy the constraint 'string'.
\`\`\`

Порядок приоритетов: явный аргумент типа → вывод из аргументов → дефолт → ограничение → \`unknown\`. Дефолт обязан сам удовлетворять ограничению. Ещё одна важная деталь — частичного вывода нет:

\`\`\`ts
function two<A, B>(a: A, b: B): [A, B] { return [a, b]; }
two<string>('x', 1);
// error TS2558: Expected 2 type arguments, but got 1.

function twoD<A, B = unknown>(a: A, b: B): [A, B] { return [a, b]; }
twoD<string>('x', 1);         // [string, unknown] — B не вывелся, взят дефолт
\`\`\`

Стоит указать хотя бы один аргумент типа явно — вывод выключается для всех, остальные берутся из дефолтов.

### \`NoInfer<T>\`: «не выводи отсюда»

Иногда аргумент должен только проверяться по \`T\`, но не влиять на него:

\`\`\`ts
function pick2<T extends string>(options: T[], initial: T): T { return initial; }
pick2(['a', 'b'], 'c');       // ок?! T = "a" | "b" | "c" — опечатка расширила T

function pick<T extends string>(options: T[], initial: NoInfer<T>): T { return initial; }
pick(['a', 'b'], 'c');
// error TS2345: Argument of type '"c"' is not assignable
// to parameter of type '"a" | "b"'.
\`\`\`

\`NoInfer\` (TS 5.4+) убирает второй аргумент из списка кандидатов: \`T\` выводится только из \`options\`, а \`initial\` проверяется по готовому результату.

### Дженерик-классы и разбор \`merge\` из примера

Классы и интерфейсы параметризуются так же, а ограничение защищает от неподходящих типов прямо в месте использования:

\`\`\`ts
interface Entity { id: number }
interface User { id: number; name: string }
class Store<T extends Entity> {
  private items = new Map<number, T>();
  upsert(item: T): void { this.items.set(item.id, item); } // item.id гарантирован
  get(id: number): T | undefined { return this.items.get(id); }
}
const store = new Store<User>();   // User | undefined на выходе get
new Store<{ name: string }>();
// error TS2344: Type '{ name: string; }' does not satisfy the constraint 'Entity'.
\`\`\`

В примере под ответом \`merge<T extends object, U extends object = {}>(a: T, b: U): T & U\` сочетает всё сразу. \`T\` и \`U\` выводятся из аргументов, поэтому \`merge({ id: 1 }, { name: 'Ann' })\` даёт \`{ id: number; } & { name: string; }\` — пересечение, где есть оба поля. Ограничение \`object\` отсекает примитивы: \`merge(1, {})\` — ошибка «Argument of type 'number' is not assignable to parameter of type 'object'». Дефолт \`= {}\` здесь срабатывает, только если \`U\` нельзя вывести, — при обычном вызове с двумя аргументами вывод всегда побеждает.

### Где это применяется на практике

- **Сигналы Angular.** \`signal(0)\` выводит \`WritableSignal<number>\`, а \`signal(null)\` — \`WritableSignal<null>\`, куда потом нельзя записать пользователя. Поэтому пишут \`signal<User | null>(null)\` — явный аргумент типа.
- **HTTP-слой.** \`http.get<User[]>('/api/users')\` даёт \`Observable<User[]>\`. Важно понимать: \`T\` здесь встречается только в возвращаемом типе, это обещание, а не проверка — ответ сервера никто не валидирует.
- **DI.** \`inject<T>(token: ProviderToken<T>): T\` выводит тип сервиса из токена, поэтому \`inject(UserService)\` сразу типизирован.
- **Обобщённые сервисы и сторы.** \`EntityStore<T extends { id: number }>\`, \`CrudService<T>\` — один код для заказов, пользователей и счетов.
- **Компоненты таблиц и списков.** Грид \`DataGrid<TRow>\` с колонками \`ColumnDef<TRow, K extends keyof TRow>\`: ключ колонки проверяется по модели строки, и переименование поля сразу подсвечивает все колонки.
- **Ответы API.** Обёртка \`ApiResponse<T = unknown>\` или \`Page<T>\` с \`items: T[]\`, \`total: number\` для пагинации.
- **Типизированные формы.** \`FormControl<string | null>\`, \`FormGroup<{ email: FormControl<string> }>\` — тоже дженерики.

## Важные нюансы и подводные камни

- **Параметр типа, использованный ровно один раз, ничего не связывает.** Если \`T\` встречается только в аргументе (\`log<T>(x: T): void\`), он эквивалентен \`unknown\` или своему ограничению — уберите его. Если только в возвращаемом типе (\`parse<T>(s: string): T\`), это замаскированное приведение типа: компилятор поверит любому \`T\`, как \`as\`.
- **\`T extends U\` — не наследование классов, а присваиваемость.** Подходит любой объект нужной формы, даже литерал \`{ id: 1, title: 'x' }\` без всякого \`implements\`.
- **Не путайте параметр типа и аргумент типа.** \`<T>\` в объявлении — дырка, \`foo<string>()\` — заполнение дырки.
- **В \`.tsx\` стрелка \`<T>(x: T) => x\` парсится как JSX-тег.** Компилятор пишет «JSX element 'T' has no corresponding closing tag». Пишут \`<T,>(x: T) => x\` или \`<T extends unknown>(x: T) => x\`.
- **Литералы расширяются не всегда.** \`id('a')\` даёт \`"a"\`, а \`wrap('a')\` — \`{ value: string }\`. Нужны точные значения — \`as const\` или \`<const T>\`.
- **При нескольких кандидатах union сам не собирается.** \`pair(1, 'x')\` — ошибка, а не \`(string | number)[]\`. Нужен union — укажите его явно.
- **Частичного вывода нет.** Указали один из двух аргументов типа — второй не выводится: либо ошибка «Expected 2 type arguments», либо молча берётся дефолт.
- **Дефолт не перебивает вывод.** \`<T = string>\` срабатывает только когда вывести не из чего; \`box(42)\` всё равно даст \`42\`.
- **В рантайме дженериков нет.** \`new T()\` не скомпилируется: «'T' only refers to a type, but is being used as a value here». Нужен конструктор — передайте его аргументом: \`create<T>(ctor: new () => T)\`.
- **Слишком много параметров типа делает сигнатуру нечитаемой.** Если их больше двух-трёх, обычно проще принять один объект-параметр или разбить функцию.

**Плюсы:** один код для многих типов без потери типобезопасности, автодополнение и проверка ключей, вывод избавляет от ручных аннотаций, ограничения документируют требования к данным прямо в сигнатуре.
**Минусы:** сложные сигнатуры трудно читать, правила вывода и расширения литералов неочевидны, в рантайме ничего не проверяется — \`get<T>()\` и \`parse<T>()\` легко превращаются в скрытый \`as\`.

## Как это спрашивают на собеседовании

**Главный вывод:** дженерик — это параметр-тип, который сохраняет связь входа и выхода; \`extends\` ограничивает его по присваиваемости и даёт доступ к гарантированным полям; \`T\` обычно выводится из аргументов, а дефолт срабатывает, только когда выводить не из чего.

Типичные формулировки: «Чем дженерик лучше \`any\`?», «Зачем \`K extends keyof T\`?», «Как TypeScript выводит параметр типа?», «Что будет, если не указать \`T\` и его нельзя вывести?».

Что могут спросить следом:

- *Как сохранить литеральный тип при выводе?* — \`as const\` у аргумента или \`<const T>\` в объявлении (TS 5.0); ещё помогает ограничение \`T extends string\`.
- *Что подставится, если \`T\` не вывести?* — Дефолт, затем ограничение, затем \`unknown\`.
- *Можно ли указать один аргумент типа из двух, а второй вывести?* — Нет, частичного вывода нет: остальные берутся из дефолтов или будет ошибка.
- *Как запретить выводить \`T\` из конкретного аргумента?* — \`NoInfer<T>\` (TS 5.4).
- *Проверяет ли \`http.get<User>()\` ответ сервера?* — Нет, \`T\` стирается при компиляции; это обещание типа, валидировать данные нужно отдельно.

### Ответ на 1 минуту

> Дженерик — это параметризация по типу: функция, класс или интерфейс работают с произвольным \`T\` и при этом сохраняют связь входа и выхода, поэтому, в отличие от \`any\`, типобезопасность не теряется. Ограничение \`T extends U\` проверяет присваиваемость, а не наследование, и позволяет внутри пользоваться гарантированными полями; классика — \`K extends keyof T\` с возвращаемым \`T[K]\` для доступа по ключу без опечаток. Обычно \`T\` не пишут: компилятор собирает кандидатов из аргументов, выбирает общий тип и подставляет его в сигнатуру, при этом литералы иногда расширяются до \`string\`, и тогда помогает \`as const\` или \`<const T>\`. Дефолт \`<T = ...>\` срабатывает, только когда выводить не из чего, а частичного вывода нет. В Angular это \`signal<User | null>(null)\`, \`inject\`, типизированные формы и \`http.get<T>\`, где важно помнить: типы стираются, и ответ сервера никто не проверяет.`,
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
      ru: `## В чём суть

Условный тип — это обычный тернарный оператор, только для типов: \`T extends U ? X : Y\` читается как «если тип \`T\` подходит под \`U\` — результат \`X\`, иначе \`Y\`». \`infer\` внутри условия означает «запомни вот эту часть типа в переменную» — так из \`Promise<string>\` достают \`string\`, а из функции — её возвращаемый тип. Дистрибутивность — правило, по которому условный тип, получив union, применяется к каждому его члену отдельно.

Аналогия: условный тип — это сортировочный автомат на почте. На вход приходит посылка (тип), автомат смотрит на её форму и отправляет в одну из двух лент. \`infer\` — это рука автомата, которая по пути вынимает из коробки содержимое: «если внутри промис — достань то, что в промисе». А дистрибутивность — это когда на вход приходит не одна посылка, а целая тележка (union): автомат не оценивает тележку целиком, а пропускает через себя каждую посылку по очереди и складывает результаты в новую тележку.

**Какую проблему решает.** Без условных типов нельзя описать тип, который зависит от другого типа: «вернуть тип элемента массива», «развернуть промис», «убрать из union \`null\`», «тип ответа зависит от переданного флага». Пришлось бы писать отдельный тип под каждый случай или сдаваться и ставить \`any\`. Условные типы и \`infer\` — это фундамент почти всех встроенных утилит: \`Exclude\`, \`Extract\`, \`ReturnType\`, \`Parameters\`, \`Awaited\`, \`InstanceType\` — внутри у всех тернарник.

## Словарик терминов

- **Условный тип (conditional type)** — запись \`T extends U ? X : Y\`, выбор одного из двух типов в зависимости от проверки.
- **\`extends\` в условии** — означает не «наследуется», а «присваиваем, подходит по форме»: \`'a' extends string\` — да, \`number extends string\` — нет.
- **Присваиваемость (assignability)** — правило «значение типа A можно положить туда, где ждут B». Именно её проверяет условие.
- **\`infer\`** — объявление переменной типа прямо внутри условия: \`T extends Promise<infer U> ? U : T\`. Похоже на захватывающую группу в регулярном выражении.
- **Сопоставление с шаблоном (pattern matching)** — то, что делает \`infer\`: компилятор накладывает «трафарет» \`Promise<???>\` на тип и заполняет дырку.
- **Union (объединение, \`A | B\`)** — тип «либо A, либо B». Набор членов, порядок не важен.
- **Голый параметр типа (naked type parameter)** — параметр, стоящий слева от \`extends\` сам по себе: \`T extends ...\`. Не голый — \`T[]\`, \`[T]\`, \`Promise<T>\`.
- **Дистрибутивность (distributivity)** — если слева голый параметр и в него пришёл union, условие применяется к каждому члену отдельно, результаты объединяются.
- **\`never\`** — тип без единого значения; с точки зрения union это «пустой union». Из union он исчезает: \`string | never\` — это \`string\`.
- **\`any\`** — отключение проверок; в условном типе он идёт сразу в обе ветки.
- **Кортеж (tuple, \`[T]\`)** — массив фиксированной длины с типом на каждой позиции; здесь используется как «обёртка», чтобы выключить дистрибутивность.
- **Ковариантная и контравариантная позиция** — «на выход» (возвращаемое значение, поле) и «на вход» (параметр функции). От позиции зависит, как объединяются несколько \`infer\` с одним именем.
- **Пересечение (intersection, \`A & B\`)** — тип «и A, и B одновременно».
- **Отложенный условный тип (deferred conditional type)** — условие, которое нельзя вычислить, пока параметр неизвестен (внутри дженерик-функции); компилятор держит его «как есть».
- **Хвостовая рекурсия (tail recursion)** — рекурсивный вызов стоит последним в ветке; для условных типов TS 4.5+ разрешает такую рекурсию примерно до 1000 шагов.
- **Утилитные типы (utility types)** — встроенные \`Exclude\`, \`Extract\`, \`ReturnType\`, \`Parameters\`, \`Awaited\` и другие из \`lib.es5.d.ts\`.

## Как это работает под капотом

Что делает компилятор, когда встречает \`T extends U ? X : Y\` с конкретным \`T\`:

1. Сначала он проверяет, известен ли \`T\`. Если это ещё не подставленный параметр внутри дженерик-функции, вычислить нельзя — тип откладывается и живёт в виде формулы.
2. Затем смотрит, голый ли слева параметр. Если да и в него пришёл union, компилятор разбивает union на члены и дальше работает с каждым отдельно.
3. Для каждого члена он проверяет присваиваемость к \`U\`, попутно накладывая \`U\` как трафарет: всё, что стоит на месте \`infer X\`, записывается в переменную \`X\`.
4. Если проверка прошла — берётся ветка \`X\` (с уже заполненными \`infer\`-переменными), иначе — ветка \`Y\`.
5. Результаты по всем членам склеиваются обратно в union. Члены, давшие \`never\`, при склейке исчезают — так работает «фильтрация» union.
6. Два особых случая: \`never\` — это пустой union, обходить нечего, поэтому дистрибутивный условный тип на нём даёт \`never\`; \`any\` неизвестно куда отнести, поэтому результат — union обеих веток.

Если записать это как обычную функцию (псевдокод, не TypeScript API):

\`\`\`ts
function conditional(t, pattern, thenBranch, elseBranch, isNakedParam) {
  if (isNakedParam && isUnion(t)) {
    // дистрибутивность: по каждому члену, потом склеить
    return union(t.members.map(m => conditional(m, pattern, thenBranch, elseBranch, true)));
  }
  const captured = match(t, pattern);   // проверка присваиваемости + заполнение infer
  return captured ? thenBranch(captured) : elseBranch();
}
// union([]) === never, union([x, never]) === x
\`\`\`

### Пример 1. Простейший условный тип

\`\`\`ts
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<'hello'>;  // 'yes' — литерал присваиваем к string
type B = IsString<42>;       // 'no'
\`\`\`

Никакой магии: компилятор проверил, можно ли значение типа \`'hello'\` положить в переменную типа \`string\`, и выбрал ветку. Само по себе это редко полезно — сила появляется вместе с \`infer\` и union.

### Пример 2. \`infer\`: вытащить часть типа

\`\`\`ts
// «Если T — массив чего-то, дай мне это что-то»
type ElementType<T> = T extends (infer E)[] ? E : T;
type A = ElementType<number[]>;  // number
type B = ElementType<string>;    // string — не массив, вернулся как есть

// «Если F — функция, дай мне её возвращаемый тип»
type MyReturn<F> = F extends (...args: any[]) => infer R ? R : never;
type R = MyReturn<() => Promise<number>>;  // Promise<number>

// «Если T — промис, дай то, что внутри» (пример под ответом)
type Unpromise<T> = T extends Promise<infer U> ? U : T;
type S = Unpromise<Promise<string>>;            // string
type N = Unpromise<Promise<Promise<number>>>;   // Promise<number> — снимает один слой
\`\`\`

Читается так: «\`T\` похож на массив? Тогда назови его элемент \`E\` и верни \`E\`». \`infer\` разрешён только в части после \`extends\` условного типа — попытка написать \`type Bad<T> = infer U\` даёт ошибку «'infer' declarations are only permitted in the 'extends' clause of a conditional type».

### Пример 3. \`infer\` для RxJS и Angular

\`\`\`ts
import { Observable, of } from 'rxjs';

type ObsValue<T> = T extends Observable<infer V> ? V : never;

const users$ = of([{ id: 1 }]);
type Users = ObsValue<typeof users$>;   // { id: number; }[]
\`\`\`

Так в реальном коде достают тип значения из стрима, тип ответа из метода сервиса (\`Awaited<ReturnType<typeof api.load>>\`) или тип элемента из массива, не дублируя интерфейсы.

### Пример 4. \`infer\` с ограничением (TS 4.7+)

\`\`\`ts
type FirstNum<T> = T extends [infer H extends number, ...unknown[]] ? H : never;

type A = FirstNum<[1, 'x']>;   // 1
type B = FirstNum<['x', 1]>;   // never — первый элемент не число
\`\`\`

\`infer H extends number\` — это «захвати и сразу проверь». Раньше для этого нужен был второй вложенный условный тип.

### Дистрибутивность по шагам

\`\`\`ts
type ToArray<T> = T extends any ? T[] : never;
type X = ToArray<string | number>;
// string[] | number[]
// а НЕ (string | number)[] — это и удивляет на собеседовании
\`\`\`

Что произошло: \`T\` голый, в него пришёл union, поэтому \`ToArray<string | number>\` → \`ToArray<string> | ToArray<number>\` → \`string[] | number[]\`. То же в примере под ответом: \`Boxed<string | number>\` даёт \`{ v: string } | { v: number }\`.

На этом построены фильтры union — член, давший \`never\`, просто исчезает:

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;   // так в lib.es5.d.ts
type E = Exclude<'a' | 'b' | 'c', 'a'>;         // 'b' | 'c'

type Ev = { type: 'click'; x: number } | { type: 'key'; key: string };
type ClickEv = Extract<Ev, { type: 'click' }>;  // { type: 'click'; x: number }
\`\`\`

Неочевидный случай: \`boolean\` — это union \`true | false\`, поэтому \`Boxed<boolean>\` даёт \`{ v: false } | { v: true }\`, а не \`{ v: boolean }\`.

### Когда дистрибутивности нет

\`\`\`ts
type IsStr<T> = T extends string ? 'y' : 'n';
type D1 = IsStr<string | number>;                    // 'y' | 'n' — распределилось

type Inline = (string | number) extends string ? 'y' : 'n';   // 'n' — union целиком
type Wrapped<T> = T[] extends any[] ? { v: T } : never;
type D2 = Wrapped<string | number>;                  // { v: string | number }
\`\`\`

Дистрибутивность включается только при двух условиях одновременно: слева стоит **голый параметр типа** (а не union, написанный прямо в тексте, и не \`T[]\`) и в него при подстановке пришёл union.

### Как выключить дистрибутивность и почему \`IsNever\` пишут в скобках

Обернуть обе стороны в кортеж — тогда \`T\` уже не голый, и union проверяется целиком:

\`\`\`ts
type ToArrayAll<T> = [T] extends [any] ? T[] : never;
type X2 = ToArrayAll<string | number>;   // (string | number)[]

type IsNeverBad<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;

type N1 = IsNeverBad<never>;  // never — пустой union, распределять нечего
type N2 = IsNever<never>;     // true
type N3 = IsNever<string>;    // false
\`\`\`

Это стандартный приём для \`IsNever\`, строгих сравнений типов и вообще для всех случаев, где union надо рассматривать как одно целое.

### \`any\` и \`unknown\` в условии

\`\`\`ts
type AnyCheck = any extends string ? 'y' : 'n';        // 'y' | 'n'
type AnyGen = IsStr<any>;                               // 'y' | 'n'
type UnkCheck = unknown extends string ? 'y' : 'n';    // 'n'
\`\`\`

\`any\` — «может быть чем угодно», поэтому компилятор честно отдаёт обе ветки. \`unknown\` ведёт себя как обычный тип: он не присваиваем к \`string\`, ветка \`false\`.

### Несколько \`infer\` с одним именем

\`\`\`ts
// одно имя U в двух «выходных» позициях → union
type Co<T> = T extends { a: infer U; b: infer U } ? U : never;
type C1 = Co<{ a: string; b: number }>;   // string | number

// одно имя U в двух параметрах функций → intersection
type Contra<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type C2 = Contra<{ a: (x: { id: number }) => void; b: (x: { name: string }) => void }>;
// { id: number; } & { name: string; }
\`\`\`

Логика: если одно и то же \`U\` должно подойти под оба параметра, значит, это значение, которое примут обе функции, — то есть пересечение. На том же механизме построен известный трюк \`UnionToIntersection\`: union превращают в union функций и выводят параметр одним \`infer\`:

\`\`\`ts
type U2I<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type UI = U2I<{ a: 1 } | { b: 2 }>;   // { a: 1; } & { b: 2; }
\`\`\`

### Встроенные утилиты — это условные типы

Определения из \`lib.es5.d.ts\` (TypeScript 5.9):

\`\`\`ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R ? R : any;
\`\`\`

\`Awaited<T>\` устроен так же, но рекурсивно разворачивает любой объект с методом \`then\`: \`Awaited<Promise<Promise<number>>>\` — это \`number\`, тогда как наш \`Unpromise\` снимает только один слой. Пример использования:

\`\`\`ts
function save(id: number, name: string): Promise<boolean> { return Promise.resolve(true); }
type P = Parameters<typeof save>;               // [id: number, name: string]
type Saved = Awaited<ReturnType<typeof save>>;  // boolean
\`\`\`

### Отложенные условные типы внутри дженериков

\`\`\`ts
function kind<T extends string | number>(x: T): T extends string ? 'S' : 'N' {
  return typeof x === 'string' ? 'S' : 'N';
  // error TS2322: Type '"S"' is not assignable to type 'T extends string ? "S" : "N"'.
}
const k1 = kind('a');                      // 'S' — снаружи всё вычисляется
const k2 = kind(1 as string | number);     // 'S' | 'N'
\`\`\`

Внутри функции \`T\` ещё неизвестен, поэтому условный тип отложен, и сужение через \`typeof x\` его не «раскрывает». Снаружи, при вызове, всё работает. На практике внутри пишут \`as\` или используют перегрузки функции.

### Рекурсия и её пределы

\`\`\`ts
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;

type L999 = BuildTuple<999>['length'];   // 999
type L1000 = BuildTuple<1000>['length'];
// error TS2589: Type instantiation is excessively deep and possibly infinite.
\`\`\`

Условные типы могут ссылаться на себя — так пишут \`DeepPartial\`, парсеры строк, разворачивание вложенных массивов. Хвостовую рекурсию (рекурсивный вызов — последнее, что делает ветка) TS 4.5+ разворачивает примерно до 1000 шагов. Нехвостовая, вроде \`[H, ...Copy<R>]\`, где результат ещё нужно «достроить», упирается в лимит гораздо раньше: на TS 5.9 копирование кортежа из 60 элементов проходит, из 200 — уже TS2589.

### Где это применяется на практике

- **Типы из существующего кода без дублирования.** \`Awaited<ReturnType<typeof service.load>>\` для типа ответа, \`Parameters<typeof fn>[0]\` для типа первого аргумента, \`ObsValue<typeof store.users$>\` для значения стрима.
- **Фильтрация union.** \`Extract<Action, { type: 'save' }>\` в редьюсерах и эффектах NgRx, \`Exclude<Status, 'deleted'>\` для списка допустимых статусов в фильтре грида.
- **Типизированные события и экшены.** Выбор типа payload по имени события: \`PayloadOf<E> = E extends { type: infer T; payload: infer P } ? ...\`.
- **Перегрузки на уровне типов.** Возвращаемый тип зависит от опции: \`observe: 'response'\` в \`HttpClient\` даёт \`HttpResponse<T>\`, иначе \`T\` (в Angular это сделано перегрузками, но в своих API часто — условным типом).
- **Библиотечный код.** Типизированные роуты, формы, \`DeepPartial\`/\`DeepReadonly\` для конфигов и моков в тестах.

## Важные нюансы и подводные камни

- **\`never\` внутри дистрибутивного условного типа исчезает.** \`never\` — пустой union, поэтому \`T extends never ? true : false\` на \`never\` даёт \`never\`, а не \`true\` и не \`false\`. Проверку на \`never\` пишут как \`[T] extends [never]\`.
- **\`any\` уходит в обе ветки сразу.** \`any extends string ? 'y' : 'n'\` даёт \`'y' | 'n'\` — легко получить «странный» union там, где ждали одну ветку.
- **\`boolean\` — это \`true | false\`.** Дистрибутивный тип разобьёт его на два члена, и результат может оказаться неожиданным.
- **Дистрибутивность работает только с голым параметром.** \`T[] extends ...\`, \`[T] extends ...\` и union, написанный прямо в условии, проверяются целиком.
- **Несколько \`infer\` с одним именем ведут себя по-разному.** В ковариантной позиции кандидаты объединяются в union, в контравариантной (параметры функций) — в intersection. На этом построен \`UnionToIntersection\`.
- **\`ReturnType\` перегруженной функции берёт последнюю перегрузку.** Для \`over(x: string): string\` и \`over(x: number): number\` получится \`number\`.
- **Внутри дженерик-функции условный тип отложен.** Вернуть значение такого типа без \`as\` обычно нельзя, даже если \`typeof\`-проверка всё доказывает.
- **Глубина рекурсии ограничена.** При слишком глубоких типах компилятор пишет «Type instantiation is excessively deep and possibly infinite» (TS2589); для хвостовой рекурсии предел около 1000 шагов.
- **Сложные условные типы заметно замедляют компиляцию и IDE.** Если тип стал нечитаемым, обычно правильнее упростить модель данных, чем наращивать магию.

**Плюсы:** позволяют выразить зависимость одного типа от другого, извлекать типы из существующего кода вместо дублирования, фильтровать и преобразовывать union; на них построены все стандартные утилиты.
**Минусы:** неочевидные правила (\`never\`, \`any\`, \`boolean\`, голый параметр), отложенные типы внутри дженериков требуют \`as\`, тяжело читать и отлаживать, большие рекурсивные типы тормозят компилятор.

## Как это спрашивают на собеседовании

**Главный вывод:** условный тип — тернарник по присваиваемости, \`infer\` — захват части типа при сопоставлении с шаблоном, а дистрибутивность означает, что голый параметр с union обрабатывается по членам; выключается она обёрткой \`[T] extends [U]\`.

Типичные формулировки: «Как написать свой \`ReturnType\`?», «Что вернёт \`ToArray<string | number>\`?», «Почему \`IsNever<never>\` возвращает \`never\`?», «Как устроен \`Exclude\`?».

Что могут спросить следом:

- *Где можно писать \`infer\`?* — Только в части после \`extends\` условного типа; с TS 4.7 можно сразу добавить ограничение: \`infer H extends number\`.
- *Что даст \`any\` в условном типе?* — Union обеих веток.
- *Как получить пересечение из union?* — Трюк \`UnionToIntersection\`: вывести параметр функции через \`infer\` в контравариантной позиции.
- *Чем \`Awaited\` отличается от простого \`T extends Promise<infer U> ? U : T\`?* — \`Awaited\` рекурсивно разворачивает вложенные промисы и любые thenable-объекты.
- *Почему внутри дженерик-функции нельзя вернуть значение условного типа?* — Тип отложен, пока \`T\` неизвестен, и сужение его не раскрывает; нужны \`as\` или перегрузки.

### Ответ на 1 минуту

> Условный тип \`T extends U ? X : Y\` — это тернарный оператор на уровне типов: компилятор проверяет, присваиваем ли \`T\` к \`U\`, и выбирает ветку. \`infer\` объявляет переменную прямо внутри условия и захватывает часть структуры — это сопоставление с шаблоном, на нём построены \`ReturnType\`, \`Parameters\` и \`Awaited\`. Дистрибутивность означает, что если слева голый параметр, а в него пришёл union, условие применяется к каждому члену отдельно, и результаты объединяются: \`ToArray<string | number>\` даёт \`string[] | number[]\`, а члены, давшие \`never\`, исчезают — так устроены \`Exclude\` и \`Extract\`. Выключается она обёрткой в кортеж, \`[T] extends [U]\`, классический пример — \`IsNever\`, потому что \`never\` это пустой union. Ещё ловушки: \`any\` уходит в обе ветки, \`boolean\` распадается на \`true | false\`, а внутри дженерик-функции условный тип отложен и требует \`as\`.`,
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
      ru: `## В чём суть

Mapped type — это цикл \`for...of\` по ключам типа: берём существующий тип, проходим по всем его ключам и по правилу строим новый тип. Синтаксис \`{ [K in keyof T]: ... }\` читается как «для каждого ключа \`K\` из \`T\` сделай такое-то поле». Модификаторы \`+\`/\`-\` добавляют или снимают у полей \`readonly\` и \`?\`, а \`as\` позволяет переименовать ключ или выбросить его.

Аналогия: у вас есть бумажная анкета, и нужно сделать её копию по правилам. Вы идёте по анкете графа за графой и для каждой рисуете новую. Можно в каждой графе поменять, что в неё вписывают («вместо числа — промис с числом»), можно поставить штамп «необязательно» или «только для чтения», а можно переименовать графу («name» → «getName») или вообще её не переносить. Mapped type — это и есть такой копировальщик, а правило копирования вы пишете один раз.

**Какую проблему решает.** Без mapped types каждый производный тип приходится писать вручную: \`UserDraft\` со всеми полями необязательными, \`UserFormControls\` с контролом на каждое поле, \`ReadonlyUser\`, \`UserFilters\`… Стоит добавить в \`User\` новое поле — и нужно не забыть обновить пять соседних интерфейсов. Mapped type выводит производный тип из исходного, поэтому он обновляется автоматически, а компилятор подсветит все места, где новое поле не обработано. На них построены \`Partial\`, \`Required\`, \`Readonly\`, \`Pick\`, \`Record\`.

## Словарик терминов

- **Mapped type (отображённый тип)** — тип вида \`{ [K in Ключи]: ТипЗначения }\`, который строится перебором набора ключей.
- **\`keyof T\`** — union всех ключей типа \`T\`: для \`{ id: number; name: string }\` это \`'id' | 'name'\`.
- **\`in\`** — внутри квадратных скобок означает «перебери каждый член union»: \`[K in 'a' | 'b']\` даст два поля.
- **Индексный доступ \`T[K]\` (indexed access type)** — тип поля \`K\` в типе \`T\`: \`User['name']\` — это \`string\`.
- **Модификатор \`readonly\`** — поле можно читать, но нельзя переприсвоить.
- **Модификатор \`?\`** — поле необязательное: его может не быть, тип значения неявно получает \`| undefined\`.
- **Префиксы \`+\` и \`-\`** — \`+\` добавляет модификатор (пишется редко, это поведение по умолчанию), \`-\` снимает: \`-readonly\`, \`-?\`.
- **Гомоморфный mapped type (homomorphic)** — маппинг «по форме исходного типа»: по \`keyof T\` или по \`K extends keyof T\`. Он сохраняет модификаторы оригинала и особое поведение для массивов и union.
- **Ремаппинг ключей (key remapping, \`as\`)** — с TS 4.1 после \`as\` можно вычислить новое имя ключа: \`[K in keyof T as NewName]\`.
- **\`never\`** — тип без значений; если ключ после \`as\` превратился в \`never\`, поле выбрасывается.
- **Template literal type (шаблонный литеральный тип)** — строковый тип, собранный по шаблону, как шаблонная строка в JS, только из типов: из \`'get'\` и \`Capitalize<'name'>\` получается \`'getName'\`.
- **\`Capitalize<S>\`** — встроенный тип, делающий первую букву строкового литерала заглавной: \`Capitalize<'name'>\` — \`'Name'\`.
- **\`Exclude<T, U>\`** — убирает из union \`T\` всё, что подходит под \`U\`: \`Exclude<'a' | 'b', 'a'>\` — \`'b'\`.
- **Кортеж (tuple)** — массив фиксированной длины с типом на каждой позиции: \`[string, number]\`.
- **Union (\`A | B\`)** — тип «либо A, либо B».

## Как это работает под капотом

Как компилятор вычисляет \`{ [K in keyof T as NewKey<K>]: Value<K> }\` для конкретного \`T\`:

1. Сначала он вычисляет набор ключей справа от \`in\`. Для \`keyof User\` это union литералов, например \`'id' | 'name' | 'email'\`.
2. Затем для каждого члена union по очереди подставляет его вместо \`K\` в выражение значения: \`Promise<T[K]>\` превращается в \`Promise<User['id']>\`, то есть \`Promise<number>\`.
3. Если есть \`as\`, вычисляется новое имя ключа. Получилось \`never\` — поле пропускается. Получился union — из одного ключа выйдет несколько полей.
4. Если маппинг гомоморфный, у нового поля сначала копируются модификаторы исходного (\`readonly\`, \`?\`), а затем применяются префиксы: \`-?\` снимает необязательность, \`+readonly\` добавляет «только чтение».
5. У гомоморфного маппинга есть ещё три особых правила: если \`T\` — массив или кортеж, результат тоже массив или кортеж; если \`T\` — union, маппинг применяется к каждому члену отдельно; если \`T\` — примитив, он возвращается как есть.

Если записать это как обычную функцию (псевдокод, не API компилятора):

\`\`\`ts
function mapType(T, keys, valueOf, renameKey, modifiers, homomorphic) {
  const result = {};
  for (const K of keys) {                              // keys = keyof T
    const newKey = renameKey ? renameKey(K) : K;
    if (newKey === never) continue;                    // as ... never → поле выброшено
    const prop = { type: valueOf(K) };                 // например Promise<T[K]>
    if (homomorphic) copyModifiers(prop, T, K);        // readonly и ? из оригинала
    applyModifiers(prop, modifiers);                   // +?, -?, +readonly, -readonly
    result[newKey] = prop;
  }
  return result;
}
\`\`\`

### Пример 1. Перебор ключей и преобразование значений

\`\`\`ts
interface User { readonly id: number; name?: string; email: string }

type Stringify<T> = { [K in keyof T]: string };
type S = Stringify<User>;
// { readonly id: string; name?: string | undefined; email: string; }

type Async<T> = { [K in keyof T]: Promise<T[K]> };
type A = Async<{ a: number; b: string }>;
// { a: Promise<number>; b: Promise<string>; }
\`\`\`

Ключи взяты из исходного типа, а значение посчитано по правилу. Обратите внимание: \`readonly\` и \`?\` у \`id\` и \`name\` сохранились сами — это гомоморфный маппинг, он копирует модификаторы.

### Пример 2. Маппинг по произвольному набору ключей

\`\`\`ts
type Flags = { [K in 'dark' | 'compact']: boolean };
// { dark: boolean; compact: boolean; }

type Record<K extends keyof any, T> = { [P in K]: T };   // так в lib.es5.d.ts
type Perms = Record<'read' | 'write', boolean>;          // { read: boolean; write: boolean; }
\`\`\`

Справа от \`in\` может стоять любой union строк, чисел или символов, а не только \`keyof T\`. Такой маппинг не гомоморфный: исходного типа нет, копировать модификаторы неоткуда.

### Модификаторы \`?\` и \`readonly\`, префиксы \`+\` и \`-\`

\`\`\`ts
type Partial2<T>  = { [K in keyof T]+?: T[K] };          // добавить ?
type Required2<T> = { [K in keyof T]-?: T[K] };          // снять ?
type Mutable<T>   = { -readonly [K in keyof T]: T[K] };  // снять readonly
type Frozen<T>    = { +readonly [K in keyof T]: T[K] };  // добавить readonly

type P = Partial2<User>;
// { readonly id?: number | undefined; name?: string | undefined; email?: string | undefined; }
type R = Required2<User>;
// { readonly id: number; name: string; email: string; }
type M = Mutable<User>;
// { id: number; name?: string | undefined; email: string; }
\`\`\`

Именно так в стандартной библиотеке написаны \`Partial\` (\`[P in keyof T]?: T[P]\`), \`Required\` (\`-?\`) и \`Readonly\` (\`readonly\`) — буквально по одной строчке. \`+\` можно не писать: \`?\` и \`readonly\` без знака уже означают «добавить». Модификаторы работают независимо: \`Partial2\` сделал поля необязательными, но \`readonly\` у \`id\` остался от оригинала.

### Гомоморфность: когда модификаторы наследуются, а когда теряются

\`\`\`ts
type Src = { a: 1; readonly b?: string; c: number };

type DropA<T> = { [K in Exclude<keyof T, 'a'>]: T[K] };
type D = DropA<Src>;          // { b: string | undefined; c: number; }   ← модификаторы пропали

type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MP = MyPick<Src, 'b' | 'c'>;   // { readonly b?: string | undefined; c: number; }
type O = Omit<Src, 'a'>;            // { readonly b?: string | undefined; c: number; }
\`\`\`

Компилятор считает маппинг гомоморфным, если справа от \`in\` стоит \`keyof T\` или параметр типа с ограничением \`extends keyof T\`. Выражение \`Exclude<keyof T, 'a'>\` — уже не то и не другое, поэтому \`readonly\` и \`?\` у \`b\` потерялись. \`Pick\` и \`Omit\` устроены через параметр \`K extends keyof T\`, поэтому модификаторы сохраняют. Если нужно «выкинуть ключ и сохранить модификаторы», используйте \`as\`, а не \`Exclude\` в \`in\`.

### Массивы, кортежи и union на входе

\`\`\`ts
type PA = Partial<string[]>;           // (string | undefined)[]
type PT = Partial<[string, number]>;   // [(string | undefined)?, (number | undefined)?]
type AT = Async<[string, number]>;     // [Promise<string>, Promise<number>]

type WithAs<T> = { [K in keyof T as K]: T[K] };
type WA = WithAs<[string, number]>;
// обычный объект: { [x: number]: string | number; 0: string; 1: number; length: 2;
//   pop: ...; push: ...; map: ...; ... } — со всеми методами массива

type PU = Partial<{ kind: 'a'; x: number } | { kind: 'b'; y: string }>;
// Partial<{ kind: 'a'; x: number }> | Partial<{ kind: 'b'; y: string }>
\`\`\`

Гомоморфный маппинг понимает, что массив — это массив, и преобразует только элементы. Стоит добавить \`as\` — и эта «магия» выключается: \`keyof\` кортежа включает индексы, \`length\` и все методы, и каждый из них становится обычным полем объекта. А union на входе гомоморфный маппинг обрабатывает по членам, поэтому дискриминируемый union не схлопывается.

### Переименование ключей через \`as\` (TS 4.1+)

\`\`\`ts
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K];
};
type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number; }

type Setters<T> = {
  [K in keyof T as \`set\${Capitalize<string & K>}\`]: (v: T[K]) => void;
};
type St = Setters<{ name: string }>;   // { setName: (v: string) => void; }
\`\`\`

\`as\` вычисляет новое имя, а значение по-прежнему считается по исходному \`K\`, поэтому \`T[K]\` работает. Новые имена удобно собирать шаблонными литеральными типами — строками-шаблонами на уровне типов.

### Фильтрация ключей: \`never\` в позиции ключа

\`\`\`ts
type RemoveKind<T> = { [K in keyof T as Exclude<K, 'kind'>]: T[K] };
type RK = RemoveKind<{ kind: 'a'; x?: number; readonly y: string }>;
// { x?: number | undefined; readonly y: string; }   ← модификаторы на месте

type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
interface Row { id: number; name: string; price: number; active: boolean }
type NumericCols = PickByValue<Row, number>;   // { id: number; price: number; }

type NeverVal<T> = { [K in keyof T]: K extends 'kind' ? never : T[K] };
type NV = NeverVal<{ kind: 'a'; x: number }>;  // { kind: never; x: number; } ← поле осталось!
\`\`\`

Ключ выбрасывается, только если \`never\` получился **в позиции ключа**, после \`as\`. \`never\` в позиции значения оставляет поле на месте — просто с типом, в который ничего нельзя записать.

### Зачем \`string & K\` в \`Capitalize<string & K>\`

\`\`\`ts
type BadGetters<T> = { [K in keyof T as \`get\${Capitalize<K>}\`]: () => T[K] };
// error TS2344: Type 'K' does not satisfy the constraint 'string'.

const sym = Symbol('s');
type G2 = Getters<{ [sym]: number; 1: string; name: boolean }>;
// { getName: () => boolean; }   ← числовой и символьный ключи отфильтровались
\`\`\`

\`keyof T\` в общем случае — это \`string | number | symbol\`, а \`Capitalize\` и шаблоны работают со строками. Пересечение \`string & K\` даёт сам ключ, если он строка, и \`never\`, если число или символ, — такие ключи заодно и выбрасываются.

### Где это применяется на практике

- **Типизированные формы Angular.** \`type ControlsOf<T> = { [K in keyof T]: FormControl<T[K]> }\` и \`new FormGroup<ControlsOf<Profile>>({...})\`: забыли контрол для нового поля модели — ошибка «Property 'age' is missing», а \`getRawValue()\` возвращает \`{ name: string; age: number }\`.
- **PATCH-запросы и черновики.** \`Partial<User>\` для тела частичного обновления, \`Required<Config>\` после слияния с дефолтами.
- **Неизменяемое состояние.** \`Readonly<State>\` или свой \`DeepReadonly\` для стора NgRx и входных данных компонентов, чтобы случайная мутация не прошла компиляцию.
- **Сигналы по полям состояния.** \`{ [K in keyof State]: Signal<State[K]> }\` — так устроены «сигнал на каждое поле» в signal-сторах.
- **Конфигурация гридов.** \`{ [K in keyof Row]?: ColumnConfig<Row[K]> }\` — колонку нельзя настроить для несуществующего поля, а тип форматтера совпадает с типом данных.
- **Генерация API.** Геттеры, сеттеры, обработчики \`on\${Capitalize<Event>}\`, словари \`Record<Status, string>\` для подписей и цветов статусов.

## Важные нюансы и подводные камни

- **Гомоморфность легко потерять.** \`{ [K in keyof T]: ... }\` наследует \`readonly\` и \`?\` из \`T\`, а \`{ [K in Exclude<keyof T, 'a'>]: ... }\` — уже нет: на \`Src\` получится \`{ b: string | undefined; c: number }\`. Для фильтрации ключей с сохранением модификаторов используйте \`as\` или \`Omit\`.
- **Массивы и кортежи.** Гомоморфный маппинг сохраняет их природу — \`Partial<string[]>\` остаётся массивом. Маппинг с \`as\` превращает их в обычный объект со всеми ключами массива: индексами \`'0'\`, \`'1'\`, \`length\` и всеми методами вроде \`push\` и \`map\`.
- **\`as\` не убирает свойство из исходного типа, а строит новый ключ.** Чтобы поле исчезло, \`never\` нужно вернуть в позиции ключа; \`never\` в позиции значения оставит поле с типом \`never\`.
- **\`Capitalize<string & K>\`** — пересечение со \`string\` нужно, потому что ключ может быть \`number\` или \`symbol\`, а шаблонные типы работают только со строками. Побочный эффект: числовые и символьные ключи молча выпадают.
- **Снятие \`?\` и \`undefined\`.** \`DropA\` из примера выше снял \`?\`, но \`undefined\` в типе значения остался — неявный \`| undefined\` от необязательности становится явным. А вот \`-?\` (как в \`Required\`) при выключенном \`exactOptionalPropertyTypes\` убирает и \`undefined\`.
- **Маппинг поверхностный.** \`Partial<T>\` и \`Readonly<T>\` действуют только на первый уровень; для вложенных объектов нужен рекурсивный тип вроде \`DeepPartial\`.
- **Сложные маппинги замедляют компиляцию.** Тип, который нельзя прочитать за минуту, обычно сигнал упростить модель данных.

**Плюсы:** производные типы выводятся из исходного и обновляются автоматически, нет дублирования интерфейсов, компилятор находит все места, где новое поле не обработано; модификаторы и \`as\` покрывают большинство задач без ручного кода.
**Минусы:** правила гомоморфности неочевидны, легко потерять модификаторы или «массивность», сообщения об ошибках на сложных маппингах трудно читать, глубокие рекурсивные маппинги тормозят IDE.

## Как это спрашивают на собеседовании

**Главный вывод:** mapped type — цикл по ключам \`{ [K in keyof T]: ... }\`, где значение обычно выражено через \`T[K]\`; \`+\`/\`-\` добавляют и снимают \`readonly\` и \`?\`, \`as\` переименовывает ключи, а \`never\` после \`as\` выбрасывает поле; гомоморфный маппинг по \`keyof T\` сохраняет модификаторы и массивы.

Типичные формулировки: «Напишите свой \`Partial\` / \`Readonly\`», «Как сделать все поля изменяемыми?», «Как сгенерировать геттеры для всех полей?», «Как оставить только поля типа \`number\`?».

Что могут спросить следом:

- *Как реализован \`Required\`?* — \`{ [P in keyof T]-?: T[P] }\`: префикс \`-\` снимает модификатор \`?\`.
- *Чем \`as\` лучше \`Exclude\` в \`in\` для удаления ключей?* — \`as\` сохраняет гомоморфность, то есть исходные \`readonly\` и \`?\`.
- *Что будет, если вернуть \`never\` в значении вместо ключа?* — Поле останется с типом \`never\`.
- *Что вернёт \`Partial<string[]>\`?* — \`(string | undefined)[]\` — гомоморфный маппинг сохраняет массив.
- *Зачем \`string & K\`?* — Ключи бывают \`number\` и \`symbol\`, а шаблонные типы и \`Capitalize\` принимают только строки.

### Ответ на 1 минуту

> Mapped type перебирает набор ключей и строит из них новый тип: \`{ [K in keyof T]: ... }\`, причём значение обычно выражается через \`T[K]\`, поэтому связь с исходным типом не теряется. Модификаторы \`readonly\` и \`?\` можно добавлять и снимать префиксами \`+\` и \`-\` — ровно так реализованы \`Partial\`, \`Required\` и \`Readonly\`. С TS 4.1 есть ремаппинг ключей через \`as\`: новые имена собирают шаблонными типами, например геттеры \`getName\`, а \`never\` в позиции ключа выбрасывает поле — так фильтруют по имени или по типу значения. Важная деталь — гомоморфность: маппинг по \`keyof T\` или по \`K extends keyof T\` наследует исходные модификаторы, сохраняет массивы и кортежи и распределяется по union, а \`Exclude\` прямо в \`in\` это ломает. В Angular я так типизирую формы, \`ControlsOf<T>\` с \`FormControl\` на каждое поле, PATCH-модели и неизменяемое состояние стора.`,
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
      ru: `## В чём суть

Template literal types — это шаблонные строки, только для типов. Пишутся так же, через обратные кавычки и \`\${}\`, но внутри подставляются не значения, а типы, и результат — тоже тип: строковый литерал или union литералов. С их помощью можно описать не «просто строку», а строку **определённой формы** — \`'12px'\`, \`'onClick'\`, \`'/users/:id'\`, — а вместе с \`infer\` ещё и разобрать строку на части.

Аналогия: обычный тип \`string\` — это графа «напишите что угодно». Template literal type — это бланк с трафаретом: «…px», «on…», «data-…». Вписать можно только то, что ложится в трафарет. А если в трафарет подставить список вариантов (union), получится стопка бланков на все комбинации сразу.

**Какую проблему решает.** В реальном коде много строк, у которых есть правила: имена событий и обработчиков, CSS-значения с единицами, ключи переводов \`common.save\`, URL-шаблоны с параметрами, имена экшенов. Если типизировать их как \`string\`, опечатка \`'onClik'\` или \`'12'\` без единицы пройдёт компиляцию и всплывёт только в рантайме. Если же перечислять все варианты вручную, union из сотни строк придётся поддерживать руками. Template literal types позволяют вывести такие строки из других типов и проверять их форму при компиляции.

## Словарик терминов

- **Строковый литеральный тип (string literal type)** — тип, у которого ровно одно значение: \`'click'\`. Union таких типов — конечный список допустимых строк.
- **Template literal type (шаблонный литеральный тип)** — тип, записанный как шаблонная строка в обратных кавычках с \`\${Тип}\` внутри, например шаблон \`on\${Capitalize<Event>}\`; появился в TS 4.1.
- **Union (\`A | B\`)** — тип «либо A, либо B». Подставленный в шаблон, он даёт все комбинации.
- **Декартово произведение (cross product)** — все пары «каждый с каждым»: 2 оттенка × 2 цвета = 4 строки.
- **Intrinsic-типы** — встроенные в компилятор \`Uppercase\`, \`Lowercase\`, \`Capitalize\`, \`Uncapitalize\`; в \`lib.es5.d.ts\` они объявлены как \`intrinsic\`, то есть реализованы внутри компилятора.
- **Шаблон-заполнитель (\`\${string}\`, \`\${number}\`)** — «любая строка» или «строка, которая читается как конечное число» в этом месте шаблона.
- **Условный тип (conditional type)** — тернарник для типов: \`S extends Шаблон ? Да : Нет\`.
- **\`infer\`** — объявление переменной внутри условного типа: «захвати эту часть строки». В шаблоне работает как группа в регулярном выражении.
- **Mapped type с \`as\`** — перебор ключей типа с переименованием каждого ключа; новое имя часто строят шаблоном, например \`get\${Capitalize<K>}\`.
- **Рекурсивный тип** — тип, который ссылается сам на себя; так строку разбирают по кусочкам.
- **Хвостовая рекурсия (tail recursion)** — рекурсивный вызов стоит последним в ветке; такие типы TS разворачивает примерно до 1000 шагов.
- **Type guard (\`s is T\`)** — функция-проверка, после которой компилятор сужает тип значения; нужна, чтобы превратить пришедший \`string\` в шаблонный тип.

## Как это работает под капотом

Компилятор работает с шаблонным типом в двух режимах — «собрать» и «сопоставить».

1. **Сборка.** Сначала он вычисляет каждый тип внутри \`\${}\`. Если там литерал — подставляет его текст, поэтому шаблон \`on\${'Click'}\` даёт \`'onClick'\`.
2. Если внутри union, компилятор перебирает все комбинации всех union в шаблоне, поэтому результат — union, где членов столько, сколько произведение размеров (2 × 2 = 4).
3. Если внутри «широкий» тип (\`string\`, \`number\`), собрать конкретную строку нельзя, поэтому остаётся шаблон-трафарет вроде \`\${number}px\`, который проверяется уже при присваивании.
4. **Сопоставление.** Когда строку присваивают шаблонному типу или проверяют в \`S extends Шаблон\`, компилятор накладывает шаблон слева направо: фиксированные куски текста должны совпасть буквально, а заполнители забирают то, что между ними.
5. Каждая \`infer\`-переменная, кроме последней, забирает **минимум** — до первого места, где совпадает следующий фиксированный кусок; последняя забирает весь остаток. Поэтому шаблон \`\${infer H}.\${infer T}\` на \`'a.b.c'\` даёт \`H = 'a'\`, \`T = 'b.c'\`.
6. Захваченные куски — сами литеральные типы, и с ними можно продолжать: передать в рекурсию, в \`Capitalize\`, в ключ mapped type.
7. Всё это существует только при компиляции: в JavaScript остаются обычные строки без каких-либо проверок.

Шаги 4–6 на коротком примере:

\`\`\`ts
type Pick2<S> = S extends \`\${infer H}.\${infer T}\` ? [H, T] : never;
type A = Pick2<'a.b.c'>;    // ["a", "b.c"] — H забрал минимум, T — остаток

type Chars<S> = S extends \`\${infer H}\${infer T}\` ? [H, T] : never;
type B = Chars<'abc'>;      // ["a", "bc"] — без разделителя H берёт один символ
\`\`\`

### Пример 1. Сборка строки из типов

\`\`\`ts
type Event = 'click' | 'hover';
type Handler = \`on\${Capitalize<Event>}\`;   // 'onClick' | 'onHover'

type EventName<T extends string> = \`on\${Capitalize<T>}\`;
type Names = EventName<'click' | 'focus'>; // 'onClick' | 'onFocus'
\`\`\`

\`Capitalize\` превратил \`'click'\` в \`'Click'\`, шаблон приклеил \`on\`. Поскольку \`Event\` — union, шаблон применился к каждому члену.

### Пример 2. Union перемножается

\`\`\`ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Theme = \`\${Shade}-\${Color}\`;
// "light-red" | "light-blue" | "dark-red" | "dark-blue"
\`\`\`

Два union по два члена дают четыре строки. Это удобно для тем, модификаторов БЭМ-классов, размеров кнопок, но та же механика приводит к комбинаторному взрыву (см. нюансы).

### Четыре встроенных помощника

\`\`\`ts
type U  = Uppercase<'hello'>;        // "HELLO"
type L  = Lowercase<'HeLLo'>;        // "hello"
type C  = Capitalize<'hello world'>; // "Hello world" — только первая буква
type UC = Uncapitalize<'Hello'>;     // "hello"
type CS = Capitalize<string>;        // Capitalize<string> — на широком string остаётся «обещанием»
\`\`\`

В \`lib.es5.d.ts\` у них нет тела — только слово \`intrinsic\`: преобразование делает сам компилятор. Для латиницы похожий тип можно написать вручную (таблица из 26 букв плюс \`infer\` для первого символа), но встроенные работают для всего Юникода и быстрее.

### Шаблоны-заполнители: \`\${number}\`, \`\${string}\` и пример из ответа

\`\`\`ts
type CSSUnit = 'px' | 'rem' | '%';
type Size = \`\${number}\${CSSUnit}\`;

const a: Size = '12px';    // ок
const b: Size = '1.5rem';  // ок
const c: Size = '12';
// error TS2322: Type '"12"' is not assignable to type
// '\`\${number}px\` | \`\${number}rem\` | \`\${number}%\`'.
const d: Size = '.5rem';   // ок — '.5' читается как число
const e: Size = '12 px';   // ок?! '12 ' с пробелом тоже читается как число
const f: Size = 'NaNpx';   // ошибка
\`\`\`

Обратите внимание: компилятор сразу раскрыл \`Size\` в union из трёх шаблонов — union единиц перемножился с \`\${number}\`. Правило для \`\${number}\`: подходит непустая строка, которую JavaScript превращает в **конечное** число (\`+s\`). Поэтому проходят \`'1e5'\`, \`'-0'\`, \`'+1'\`, \`'01'\`, \`'0x1F'\` и даже \`' 1'\` с пробелом, а \`'Infinity'\`, \`'NaN'\`, \`''\` и \`'1_000'\` — нет.

\`\`\`ts
type DataAttr = \`data-\${string}\`;
const x1: DataAttr = 'data-id';     // ок
const x2: DataAttr = 'data-';       // ок — \${string} может быть пустой строкой
const x3: DataAttr = 'aria-label';  // ошибка
\`\`\`

### Разбор строки: \`infer\` внутри шаблона

\`\`\`ts
type Split<S extends string, D extends string> =
  S extends \`\${infer H}\${D}\${infer T}\`
    ? [H, ...Split<T, D>]
    : [S];
type P = Split<'a.b.c', '.'>;   // ["a", "b", "c"]

type ToNum<S> = S extends \`\${infer N extends number}\` ? N : never;
type N = ToNum<'42'>;           // 42 — строка превратилась в числовой литерал (TS 4.8+)

type CamelCase<S extends string> =
  S extends \`\${infer H}-\${infer T}\` ? \`\${H}\${CamelCase<Capitalize<T>>}\` : S;
type CC = CamelCase<'background-color-dark'>;   // "backgroundColorDark"
\`\`\`

Шаг за шагом для \`Split<'a.b.c', '.'>\`: шаблон \`\${H}.\${T}\` наложился, \`H = 'a'\`, \`T = 'b.c'\`; рекурсия на \`'b.c'\` даёт \`['b', 'c']\`; на \`'c'\` разделителя нет — ветка \`[S]\`. Итог \`['a', 'b', 'c']\`.

### Типобезопасные роуты: параметры прямо из строки

\`\`\`ts
type RouteParams<P extends string> =
  P extends \`\${string}:\${infer Param}/\${infer Rest}\`
    ? Param | RouteParams<\`/\${Rest}\`>
    : P extends \`\${string}:\${infer Param}\` ? Param : never;

type RP = RouteParams<'/users/:id/orders/:orderId'>;   // "id" | "orderId"
type Params<P extends string> = { [K in RouteParams<P>]: string };

function buildUrl<P extends string>(path: P, params: Params<P>): string {
  return path.replace(/:(\\w+)/g, (_, k: string) => (params as Record<string, string>)[k]);
}
buildUrl('/users/:id/orders/:orderId', { id: '1', orderId: '7' });   // ок
buildUrl('/users/:id/orders/:orderId', { id: '1' });
// error TS2345: ... Property 'orderId' is missing in type '{ id: string; }'
// but required in type 'Params<"/users/:id/orders/:orderId">'.
\`\`\`

Тип вытащил имена параметров из литерала пути, mapped type превратил их в обязательные поля объекта. Поменяли путь — компилятор сразу показал все вызовы, где параметров не хватает. Внутри функции приходится сделать \`as\`: пока \`P\` неизвестен, ключи \`Params<P>\` тоже неизвестны, и \`params[k]\` со строкой \`k\` даёт ошибку TS7053: \`Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Params<P>'\`.

### Пути к вложенным ключам: ключи переводов

\`\`\`ts
type Paths<T> = {
  [K in keyof T & string]: T[K] extends object ? \`\${K}.\${Paths<T[K]>}\` : K
}[keyof T & string];

const dict = { common: { save: 'Save', cancel: 'Cancel' }, user: { title: 'User' } };
type TKey = Paths<typeof dict>;   // "common.save" | "common.cancel" | "user.title"
\`\`\`

Mapped type прошёл по ключам, для вложенных объектов рекурсивно склеил \`родитель.ребёнок\`, а \`[keyof T & string]\` в конце собрал все значения в один union. Так типизируют \`translate('common.save')\`: опечатка в ключе — ошибка компиляции.

### Где это применяется на практике

- **Ключи i18n.** \`Paths<typeof ru>\` для функции перевода или пайпа: ключи проверяются по реальному словарю, IDE подсказывает варианты.
- **URL и роуты.** Построитель ссылок \`buildUrl('/orders/:id', { id })\` с проверкой параметров; Angular Router сам строковые пути так не типизирует, поэтому это делают в своих хелперах.
- **Имена событий и экшенов.** \`on\${Capitalize<Event>}\` для обработчиков; NgRx \`createActionGroup\` превращает строку события \`'Load Users'\` в метод \`loadUsers\`, и тип этого имени тоже вычисляется шаблонными типами.
- **CSS и дизайн-система.** \`\${number}px\`, CSS-переменные \`--\${string}\`, классы-модификаторы \`btn-\${Size}-\${Variant}\` для инпутов компонентов.
- **Геттеры, сеттеры и ключи в mapped types.** Генерация \`getName\`, \`setName\` из \`name\`, ключей сигналов и полей стора.
- **Ключи кэша и хранилища.** \`user:\${number}\`, \`grid-state:\${string}\` — общий формат для \`localStorage\` и кэшей запросов.

## Важные нюансы и подводные камни

- **Комбинаторный взрыв.** Два union по 50 членов дают 2500 вариантов — это ещё нормально. Три — уже 125 000, и компилятор отказывается: «Expression produces a union type that is too complex to represent» (TS2590, предел — 100 000 членов). Шаблоны хороши для небольших конечных множеств.
- **\`\${string}\` быстро делает тип бесполезно широким.** Сам по себе \`\${string}\` — это просто \`string\`. В шаблоне вроде \`data-\${string}\` он принимает любой хвост, включая пустой (\`'data-'\` проходит), так что проверяется только префикс.
- **\`\${number}\` — не «целое положительное число».** Он пропускает \`'1e5'\`, \`'-0'\`, \`'0x1F'\`, \`'+1'\` и даже строки с пробелами по краям (\`'12 px'\` подходит под \`\${number}px\`), но не \`'Infinity'\`, \`'NaN'\` и пустую строку.
- **\`infer\` в шаблоне нежадный.** Все \`infer\`, кроме последнего, забирают минимум до первого совпадения следующего куска. Для \`'a.b.c'\` и шаблона с точкой первая часть — \`'a'\`, а не \`'a.b'\`.
- **Рекурсивный парсинг ограничен по глубине.** Нехвостовой \`Split\` с \`[H, ...Split<T, D>]\` на TS 5.9 справился со 100 сегментами, но упал на 500 с «Type instantiation is excessively deep and possibly infinite». Версия с аккумулятором (хвостовая рекурсия) доходит примерно до 1000 шагов — дальше тоже ошибка.
- **Обычный \`string\` нельзя присвоить шаблонному типу, и \`startsWith\` его не сужает.** \`if (s.startsWith('--'))\` не превратит \`s\` в \`--\${string}\` — нужна своя функция-проверка \`isCssVar(s): s is CssVar\`.
- **Это только типы.** В рантайме никакой проверки нет: строка с сервера или из URL всё равно требует валидации.

**Плюсы:** строки получают форму и автодополнение, производные имена (\`onClick\`, \`getName\`, ключи переводов) выводятся из исходных типов и не расходятся с ними, опечатки ловятся при компиляции.
**Минусы:** комбинаторный взрыв на больших union, лимит глубины рекурсии, медленная компиляция на сложных парсерах, нечитаемые сообщения об ошибках и никакой проверки в рантайме.

## Как это спрашивают на собеседовании

**Главный вывод:** template literal types собирают и разбирают строковые типы: union внутри шаблона даёт все комбинации, intrinsic-типы меняют регистр, а \`infer\` в условном типе вытаскивает куски строки — так строят типобезопасные роуты, ключи переводов и имена обработчиков.

Типичные формулировки: «Как из union событий получить union обработчиков \`onX\`?», «Как вытащить параметры из строки \`'/users/:id'\`?», «Что такое \`Capitalize\` и как он реализован?», «Что вернёт \`\${Shade}-\${Color}\`?».

Что могут спросить следом:

- *Сколько вариантов даст шаблон из трёх union по 50?* — 125 000, это больше предела в 100 000, и компилятор выдаст TS2590.
- *Какие строки пропускает \`\${number}\`?* — Любую непустую строку, которая превращается в конечное число: \`'1e5'\`, \`'-0'\`, \`'0x1F'\`, но не \`'Infinity'\` и не \`'NaN'\`.
- *Как преобразовать строку в числовой литерал на уровне типов?* — Условным типом с шаблоном \`\${infer N extends number}\`: для \`'42'\` получится \`42\` (TS 4.8+).
- *Почему \`Capitalize<K>\` в mapped type ругается?* — Ключ может быть \`number\` или \`symbol\`; пишут \`Capitalize<string & K>\`.
- *Проверяется ли что-то в рантайме?* — Нет, нужны свои type guard'ы и валидация.

### Ответ на 1 минуту

> Template literal types — это шаблонные строки на уровне типов: синтаксис тот же, обратные кавычки и \`\${}\`, только подставляются типы, а результат — строковый литерал или union литералов. Ключевое свойство — если подставить union, получается union всех комбинаций, поэтому \`on\${Capitalize<Event>}\` даёт \`'onClick' | 'onHover'\`. Для регистра есть четыре встроенных intrinsic-типа: \`Uppercase\`, \`Lowercase\`, \`Capitalize\` и \`Uncapitalize\`. С условными типами и \`infer\` шаблоны умеют разбирать строки: так я вытаскиваю имена параметров из \`'/users/:id'\` для построителя ссылок или собираю ключи переводов вида \`common.save\` из словаря. Ограничения: три union по 50 уже дают 125 000 вариантов, и компилятор сдаётся, у рекурсии есть предел глубины, \`\${number}\` пропускает \`'1e5'\` и \`'0x1F'\`, а в рантайме ничего не проверяется — данные извне всё равно нужно валидировать.`,
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
      ru: `## В чём суть

Хорошая новость: все эти «магические» типы — по одной строчке кода, и их можно написать самому. Они собраны всего из двух кирпичей: mapped types (перебор ключей объекта) и conditional types (тернарник для типов, часто с \`infer\`). Поняв эти два кирпича, вы не заучиваете утилиты, а читаете их как обычный код.

Аналогия: utility-типы — как набор кухонных инструментов из двух материалов. Из «перебора ключей» сделаны ножницы, которые вырезают нужные графы из анкеты (\`Pick\`, \`Omit\`), и штампы «необязательно» / «только чтение» (\`Partial\`, \`Readonly\`). Из «тернарника» — сито, которое просеивает список вариантов (\`Exclude\`, \`Extract\`), и пинцет, который вынимает из функции нужную часть (\`ReturnType\`, \`Parameters\`).

**Какую проблему решает.** В приложении десятки производных типов: модель для формы создания (без \`id\`), тело PATCH-запроса (всё необязательно), публичный профиль (без \`password\`), словарь «статус → подпись», тип ответа сервиса. Писать их руками — значит дублировать поля и получать рассинхрон, когда исходный интерфейс меняется. Utility-типы выводят производные типы из исходного, и компилятор сам обновляет их при каждом изменении. А понимание реализации нужно, чтобы видеть их ограничения: почему \`Omit\` ломает дискриминируемые union, почему \`Partial\` поверхностный и как написать свой \`DeepPartial\`.

## Словарик терминов

- **Utility type (утилитный тип)** — встроенный тип-«функция» из \`lib.es5.d.ts\`, который принимает типы и возвращает новый тип: \`Partial<User>\`.
- **Mapped type (отображённый тип)** — тип вида \`{ [K in Ключи]: Значение }\`, строится перебором набора ключей.
- **\`keyof T\`** — union всех ключей типа: для \`User\` это \`'id' | 'name' | 'password'\`.
- **\`keyof any\`** — \`string | number | symbol\`, то есть «любой допустимый ключ объекта».
- **Индексный доступ \`T[K]\` (indexed access type)** — тип поля \`K\` в типе \`T\`: \`User['id']\` — \`number\`.
- **Модификаторы \`?\` и \`readonly\`** — «поле необязательное» и «поле только для чтения»; префикс \`-\` их снимает.
- **Гомоморфный mapped type** — маппинг по \`keyof T\` (или по \`K extends keyof T\`): сохраняет модификаторы исходного типа; маппинг прямо по \`keyof T\` ещё и обрабатывает union по членам.
- **Условный тип (conditional type)** — \`T extends U ? X : Y\`: «если \`T\` подходит под \`U\`, то \`X\`, иначе \`Y\`».
- **Дистрибутивность** — если слева в условном типе стоит параметр типа и в него пришёл union, условие применяется к каждому члену отдельно.
- **\`never\`** — тип без значений; в union он исчезает (\`'a' | never\` — это \`'a'\`), поэтому служит «ластиком».
- **\`infer\`** — переменная внутри условного типа: «захвати эту часть типа».
- **Дискриминируемый union (discriminated union)** — union объектов с общим полем-меткой (\`kind: 'circle' | 'square'\`), по которому \`switch\` сужает тип.
- **\`typeof\` в позиции типа** — превращает значение (функцию, объект) в его тип: \`typeof load\`.
- **\`Awaited<T>\`** — разворачивает промис, в том числе вложенный: \`Awaited<Promise<number>>\` — \`number\`.

## Как это работает под капотом

Вот настоящие определения из \`lib.es5.d.ts\` в TypeScript 5.9 (форматирование сжато):

\`\`\`ts
type Partial<T>  = { [P in keyof T]?: T[P] };           // всем полям ?
type Required<T> = { [P in keyof T]-?: T[P] };          // снять ?
type Readonly<T> = { readonly [P in keyof T]: T[P] };   // всем полям readonly

type Pick<T, K extends keyof T> = { [P in K]: T[P] };   // только ключи K
type Record<K extends keyof any, T> = { [P in K]: T };  // объект с нуля: K → T

type Exclude<T, U> = T extends U ? never : T;           // выкинуть из union
type Extract<T, U> = T extends U ? T : never;           // оставить в union
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type NonNullable<T> = T & {};
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
\`\`\`

Как это читать по шагам:

1. Сначала определите кирпич. Фигурные скобки с \`[P in ...]\` — это перебор ключей; \`extends ... ? ... : ...\` — условие.
2. Для перебора ключей посмотрите, откуда берутся ключи (\`keyof T\` — все, \`K\` — переданные) и что делается с каждым (модификатор, новое значение).
3. Для условия посмотрите, какая ветка возвращает \`never\`: этот член union будет стёрт, потому что \`never\` в union исчезает.
4. Если в условии есть \`infer\`, найдите, какую часть типа он захватывает: параметры функции (\`P\`) или результат (\`R\`).
5. Составные утилиты (\`Omit\`) раскрывайте изнутри наружу, как вложенные вызовы функций.

### \`Partial\`, \`Required\`, \`Readonly\`: модификаторы

\`\`\`ts
interface User { id: number; name: string; password: string }

type Patch = Partial<User>;
// { id?: number | undefined; name?: string | undefined; password?: string | undefined; }

type Frozen = Readonly<User>;
const u: Frozen = { id: 1, name: 'Ann', password: 'x' };
u.name = 'Bob';
// error TS2540: Cannot assign to 'name' because it is a read-only property.
\`\`\`

Все три просто идут по всем ключам и ставят или снимают \`?\` / \`readonly\`, оставляя тип значения \`T[P]\` как есть. Ничего больше. Используются для PATCH-запросов (\`Partial\`), конфигов после слияния с дефолтами (\`Required\`) и неизменяемого состояния (\`Readonly\`).

### \`Pick\`: подмножество ключей

\`\`\`ts
type Draft = Partial<Pick<User, 'name'>>;   // { name?: string | undefined; }

type Bad = Pick<User, 'nmae'>;
// error TS2344: Type '"nmae"' does not satisfy the constraint 'keyof User'.
\`\`\`

\`Pick\` перебирает не все ключи, а только переданные, и для каждого берёт исходный тип \`T[P]\`. Ограничение \`K extends keyof T\` проверяет ключи на опечатки и заодно сохраняет модификаторы оригинала.

### \`Record\`: объект с нуля

\`\`\`ts
type ById = Record<number, User>;           // { [x: number]: User; }

type Status = 'new' | 'active' | 'blocked' | 'deleted';
const labels: Record<Status, string> = { new: 'Новый', active: 'Активен', blocked: 'Заблокирован' };
// error TS2741: Property 'deleted' is missing in type '{ new: string; active: string;
// blocked: string; }' but required in type 'Record<Status, string>'.
\`\`\`

\`Record\` не смотрит на исходный объект: ключи \`K\`, у всех значение \`T\`. С union-ключами он требует **все** ключи — добавили статус \`'archived'\`, и компилятор покажет каждый словарь, где забыли подпись. С \`string\` или \`number\` в ключах получается словарь с индексной сигнатурой.

### \`Exclude\` и \`Extract\`: фильтры union

\`\`\`ts
type Visible = Exclude<Status, 'deleted'>;                     // 'new' | 'active' | 'blocked'
type Known = Extract<Status, 'active' | 'blocked' | 'unknown'>; // 'active' | 'blocked'
\`\`\`

Пошагово для \`Exclude<'a' | 'b' | 'c', 'a'>\`: условный тип дистрибутивен, поэтому он считается для каждого члена отдельно — \`'a' extends 'a'\` → \`never\`, \`'b' extends 'a'\` → нет → \`'b'\`, \`'c'\` → \`'c'\`. Склеиваем: \`never | 'b' | 'c'\`, и \`never\` исчезает. Итог \`'b' | 'c'\`. Удаление из union — это и есть превращение члена в \`never\`.

### \`Omit\`: комбинация двух кирпичей

\`\`\`ts
type PublicUser = Omit<User, 'password'>;   // { id: number; name: string; }
\`\`\`

Раскрываем изнутри наружу:

1. \`keyof User\` → \`'id' | 'name' | 'password'\`.
2. \`Exclude<'id' | 'name' | 'password', 'password'>\` → \`'id' | 'name'\`.
3. \`Pick<User, 'id' | 'name'>\` → \`{ id: number; name: string }\`.

Модификаторы при этом сохраняются: \`Omit<{ readonly a: 1; b?: string; c: 2 }, 'c'>\` даёт \`{ readonly a: 1; b?: string | undefined; }\`. А вот проверки ключей нет — второй параметр ограничен \`keyof any\`, а не \`keyof T\`:

\`\`\`ts
type T1 = Omit<User, 'nmae'>;   // { password: string; id: number; name: string; } — молча!
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
type T2 = StrictOmit<User, 'nmae'>;
// error TS2344: Type '"nmae"' does not satisfy the constraint 'keyof User'.
\`\`\`

### Почему \`Omit\` ломает дискриминируемые union

\`\`\`ts
type Shape =
  | { kind: 'circle'; r: number; id: string }
  | { kind: 'square'; side: number; id: string };

type NoId = Omit<Shape, 'id'>;   // { kind: "circle" | "square"; }  ← r и side пропали!

function area(s: NoId) {
  switch (s.kind) {
    case 'circle': return s.r;
    // error TS2339: Property 'r' does not exist on type 'NoId'.
  }
}

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type NoId2 = DistributiveOmit<Shape, 'id'>;
// Omit<круг, 'id'> | Omit<квадрат, 'id'> — switch снова сужает тип
\`\`\`

Причина в шаге 1: \`keyof\` от union — это только **общие** ключи (\`'kind' | 'id'\`), а \`Pick\` перебирает набор ключей, а не каждый член union. В итоге получается один объект с общими полями. Обёртка \`T extends any ? ... : never\` делает операцию дистрибутивной — \`Omit\` применяется к каждому члену отдельно.

### \`ReturnType\` и \`Parameters\`: \`infer\`

\`\`\`ts
function save(id: number, name: string): Promise<boolean> { return Promise.resolve(true); }

type P = Parameters<typeof save>;               // [id: number, name: string]
type R = ReturnType<typeof save>;               // Promise<boolean>
type Saved = Awaited<ReturnType<typeof save>>;  // boolean

type Bad = ReturnType<save>;
// error TS2749: 'save' refers to a value, but is being used as a type here. Did you mean 'typeof save'?
\`\`\`

\`ReturnType\` накладывает на тип шаблон «функция с любыми аргументами, возвращающая \`infer R\`» и отдаёт захваченный \`R\`. \`Parameters\` делает то же для списка аргументов и возвращает кортеж с именами параметров. Ограничение \`T extends (...args: any) => any\` не даёт передать не-функцию (даже \`ReturnType<Function>\` — ошибка TS2344), поэтому ветка \`: any\` на практике почти не срабатывает. Упрощённая версия из статей с \`: never\` в конце ведёт себя так же для любых нормальных функций.

### Ещё полезные из коробки

\`\`\`ts
type NN = NonNullable<string | null | undefined>;   // string

class ApiClient { constructor(public baseUrl: string, public retries: number) {} }
type Args = ConstructorParameters<typeof ApiClient>; // [baseUrl: string, retries: number]
type Inst = InstanceType<typeof ApiClient>;          // ApiClient
\`\`\`

- \`NonNullable<T>\` убирает \`null\` и \`undefined\`. С TS 4.8 он записан как \`T & {}\`: \`{}\` — это «любое значение, кроме \`null\` и \`undefined\`», поэтому пересечение их и отсекает.
- \`Awaited<T>\` рекурсивно разворачивает промис, в том числе вложенные: \`Awaited<Promise<Promise<number>>>\` — \`number\`.
- \`InstanceType<C>\` — тип экземпляра по типу класса, \`ConstructorParameters<C>\` — аргументы конструктора; оба через \`infer\` по сигнатуре \`new (...)\`.

### Свои утилиты по тем же правилам

\`\`\`ts
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
type PickByValue<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

interface Settings { theme: string; grid: { pageSize: number; dense: boolean } }
const p: Partial<Settings> = { grid: { pageSize: 50 } };
// error TS2741: Property 'dense' is missing in type '{ pageSize: number; }' ...
const dp: DeepPartial<Settings> = { grid: { pageSize: 50 } };   // ок

interface Row { id: number; name: string; price: number; active: boolean }
type NumericCols = PickByValue<Row, number>;   // { id: number; price: number; }
\`\`\`

\`DeepPartial\` — тот же \`Partial\`, но для вложенных объектов вызывает себя рекурсивно. \`PickByValue\` использует \`as\` (переименование ключа в mapped type, TS 4.1+): ключ, превратившийся в \`never\`, выбрасывается.

### Где это применяется на практике

- **HTTP-слой.** \`Partial<User>\` для PATCH, \`Omit<User, 'id' | 'createdAt'>\` для тела POST, \`Awaited<ReturnType<typeof api.load>>\` для типа ответа без дублирования интерфейса.
- **Формы.** Модель формы создания как \`Omit<Entity, 'id'>\`, черновик как \`Partial<...>\`, начальные значения как \`Required<...>\` после слияния с дефолтами.
- **Справочники и UI-словари.** \`Record<Status, string>\` для подписей и \`Record<Status, BadgeColor>\` для цветов статусов в гриде — новый статус без подписи не скомпилируется.
- **Состояние.** \`Readonly<State>\` для стора, \`Pick<State, 'filters' | 'sort'>\` для сохранения части состояния грида в \`localStorage\`.
- **Фильтры и экшены.** \`Exclude<Status, 'deleted'>\` для списка в выпадающем фильтре, \`Extract<Action, { type: 'save' }>\` для выбора одного экшена из union.
- **Обёртки над чужими функциями.** \`Parameters<typeof fn>\` и \`ReturnType<typeof fn>\` для декораторов, кэширующих и логирующих обёрток, моков в тестах.

## Важные нюансы и подводные камни

- **\`Omit\` ломает дискриминируемые union.** \`Omit<A | B, 'x'>\` схлопывает их в один объект с общими полями, и \`switch\` по полю \`kind\` перестаёт сужать тип. Нужен свой дистрибутивный вариант: \`type DistributiveOmit<T, K> = T extends any ? Omit<T, K> : never\`. Причина не в потере модификаторов (их \`Omit\` сохраняет), а в том, что \`keyof\` от union даёт только общие ключи, а \`Pick\` не обходит union по членам.
- **\`Omit\` не проверяет ключи.** \`Omit<User, 'nmae'>\` с опечаткой компилируется молча и возвращает весь \`User\`, потому что второй параметр — \`keyof any\`, а не \`keyof T\`. У \`Pick\` такой проблемы нет; для \`Omit\` пишут свой \`StrictOmit<T, K extends keyof T>\`.
- **\`Partial\` и \`Readonly\` поверхностные.** Вложенные объекты остаются обязательными и изменяемыми: \`ro.grid.pageSize = 20\` пройдёт. Для глубины нужны свои \`DeepPartial\` и \`DeepReadonly\`.
- **\`Required\` и \`undefined\` зависят от флага.** При обычном \`strict\` \`Required<{ x?: string | undefined }>\` даёт \`{ x: string }\` — \`-?\` убирает и \`undefined\`. Только с \`exactOptionalPropertyTypes\` остаётся \`{ x: string | undefined }\`.
- **\`ReturnType\` работает с типом функции, а не с самой функцией.** Нужно писать \`ReturnType<typeof fn>\`. Для перегруженной функции берётся последняя перегрузка.
- **\`Record<string, T>\` обещает значение по любому ключу.** \`cache['нет-такого']\` имеет тип \`T\`, а не \`T | undefined\`, пока не включён \`noUncheckedIndexedAccess\`.

**Плюсы:** производные типы выводятся из исходных и не расходятся с ними, нет дублирования интерфейсов, всё построено на двух понятных механизмах и легко расширяется своими утилитами.
**Минусы:** поверхностность \`Partial\`/\`Readonly\`, тихий \`Omit\` с опечатками и его поведение на union, длинные вложенные утилиты трудно читать в подсказках IDE.

## Как это спрашивают на собеседовании

**Главный вывод:** \`Partial\`, \`Required\`, \`Readonly\`, \`Pick\` и \`Record\` — mapped types; \`Exclude\`, \`Extract\`, \`ReturnType\`, \`Parameters\` — условные типы (последние два с \`infer\`); \`Omit\` — это \`Pick<T, Exclude<keyof T, K>>\`, поэтому он не проверяет ключи и не распределяется по union.

Типичные формулировки: «Напишите \`Pick\` / \`Omit\` / \`ReturnType\` сами», «Чем \`Omit\` отличается от \`Pick\`?», «Почему после \`Omit\` перестал работать \`switch\` по \`kind\`?», «Как сделать глубокий \`Partial\`?».

Что могут спросить следом:

- *Как реализован \`Exclude\` и почему он работает?* — \`T extends U ? never : T\`; дистрибутивность прогоняет каждый член union, а \`never\` из union исчезает.
- *Как починить \`Omit\` для union?* — \`T extends any ? Omit<T, K> : never\`.
- *Как реализован \`NonNullable\` сейчас?* — \`T & {}\` (с TS 4.8): пересечение с \`{}\` отсекает \`null\` и \`undefined\`.
- *Что вернёт \`ReturnType\` для \`async\`-функции?* — \`Promise<...>\`; чтобы получить значение, оборачивают в \`Awaited\`.
- *Почему \`Record<Status, string>\` полезен?* — Он требует все ключи union: новый статус без подписи не скомпилируется.

### Ответ на 1 минуту

> Все встроенные utility-типы собраны из двух механизмов. \`Partial\`, \`Required\` и \`Readonly\` — это mapped types по \`keyof T\` с модификаторами \`?\`, \`-?\` и \`readonly\`. \`Pick\` перебирает только переданные ключи, а \`Record<K, T>\` строит объект с нуля: ключи \`K\`, значения \`T\`. \`Exclude\` и \`Extract\` — дистрибутивные условные типы, которые фильтруют union через \`never\`. \`Omit\` собран из них как \`Pick<T, Exclude<keyof T, K>>\`: поэтому он молча принимает опечатку в ключе и схлопывает дискриминируемый union, ведь \`keyof\` от union даёт только общие ключи, — для union нужен свой дистрибутивный \`Omit\`. \`ReturnType\` и \`Parameters\` — условные типы с \`infer\`, захватывающим результат или кортеж параметров, и работают с \`typeof fn\`. На практике это PATCH-модели, формы без \`id\`, словари статусов через \`Record\` и тип ответа через \`Awaited<ReturnType<...>>\`.`,
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
      ru: `## В чём суть

Пусть \`Dog\` — подтип \`Animal\` (собака — это животное, и её можно передать туда, где ждут животное). Вариантность отвечает на вопрос: **а \`Box<Dog>\` — подтип \`Box<Animal>\`?** Ответ зависит от того, что обёртка делает со значением: если только отдаёт наружу — направление сохраняется, если только принимает внутрь — переворачивается, если и то и другое — совместимости нет.

Аналогия. Приют, который **выдаёт** собак, годится там, где нужен «кто-то, кто выдаёт животных»: вы просили животное — получили собаку, всё честно. Это ковариантность. Ветеринар — наоборот, он **принимает** пациентов. Если вам нужен «врач для собак», подойдёт врач для любых животных: собаку он тоже вылечит. А вот врач, который лечит только собак, не годится туда, где нужен «врач для животных», — к нему придёт кот. Направление перевернулось — это контравариантность. Вольер, куда и сажают, и откуда забирают, нельзя подменить ни в одну сторону — это инвариантность.

**Какую проблему решает.** Каждый раз, когда вы передаёте колбэк, присваиваете \`Observable<Dog>\` в \`Observable<Animal>\` или подсовываете обработчик событий, компилятор решает: безопасна ли эта подмена. Если правила слишком мягкие, в список собак можно положить кота и получить \`TypeError\` в рантайме. Если слишком строгие, нельзя передать сортировку по имени животных в массив собак, хотя это безопасно. Вариантность — это набор правил, по которым TypeScript ищет баланс, и знание этих правил объясняет самые «странные» ошибки про несовместимые функции.

## Словарик терминов

- **Подтип и супертип (subtype / supertype)** — \`Dog\` — подтип \`Animal\`, потому что у собаки есть всё, что есть у животного (и ещё \`bark\`). \`Animal\` — супертип.
- **Присваиваемость (assignability)** — «значение типа A можно положить туда, где ждут B». Подтип присваивается супертипу, не наоборот.
- **Вариантность (variance)** — правило, как отношение «подтип–супертип» между \`Dog\` и \`Animal\` переносится на обёртки \`F<Dog>\` и \`F<Animal>\`.
- **Ковариантность (covariance, \`out\`)** — направление сохраняется: \`F<Dog>\` присваивается \`F<Animal>\`. Так ведут себя «выходные» позиции: возвращаемые значения, поля.
- **Контравариантность (contravariance, \`in\`)** — направление переворачивается: \`F<Animal>\` присваивается \`F<Dog>\`. Так ведут себя «входные» позиции: параметры функций.
- **Инвариантность (invariance, \`in out\`)** — никакой совместимости, нужен точно тот же тип. Возникает, когда тип и отдаётся, и принимается.
- **Бивариантность (bivariance)** — совместимость в обе стороны. Удобно, но небезопасно.
- **Надёжность системы типов (soundness)** — гарантия «если скомпилировалось, то ошибки типа в рантайме не будет». TypeScript сознательно не полностью надёжен ради удобства.
- **\`strictFunctionTypes\`** — флаг компилятора (входит в \`strict\`), включающий строгую контравариантную проверку параметров у функциональных типов.
- **Метод-сокращение и свойство-функция** — \`handle(a: Dog): void\` (method shorthand) против \`handle: (a: Dog) => void\` (property). Выглядят почти одинаково, но проверяются по-разному.
- **Аннотации вариантности \`in\` / \`out\` (TS 4.7)** — явное указание вариантности параметра типа: \`interface Producer<out T>\`.
- **Колбэк (callback)** — функция, которую передают в другую функцию, чтобы та вызвала её позже; самое частое место, где проявляется контравариантность.

## Как это работает под капотом

Что делает компилятор, когда проверяет \`Box<Dog>\` → \`Box<Animal>\`:

1. Сначала он замечает, что слева и справа — один и тот же дженерик \`Box\`. Поэтому вместо сравнения всех полей он идёт коротким путём: сравнивает только аргументы типа.
2. Для этого ему нужна вариантность параметра \`T\`. Он вычисляет её один раз на объявление: подставляет служебные типы-маркеры (в ошибках они видны как \`sub-T\` и \`super-T\`) и смотрит, в какую сторону \`Box\` остаётся совместимым.
3. Затем сравнивает \`Dog\` и \`Animal\` по найденному правилу: ковариантно — \`Dog\` → \`Animal\`, контравариантно — наоборот, инвариантно — в обе стороны, бивариантно — хватит любой.
4. Если короткого пути нет (разные объявления, анонимные типы), он сравнивает структуру по членам: поля — ковариантно (даже изменяемые!), возвращаемые значения — ковариантно, параметры свойств-функций — контравариантно (при \`strictFunctionTypes\`), параметры методов — бивариантно.
5. Если у параметра типа есть аннотация \`in\` / \`out\`, шаг 2 не выполняется — берётся аннотация, а компилятор лишь проверяет, что она не противоречит структуре.

В виде псевдокода (не настоящий API компилятора):

\`\`\`ts
function isAssignable(src, tgt) {
  if (sameGenericDeclaration(src, tgt)) {
    const v = varianceOf(src.declaration);   // из in/out или измерена один раз
    if (v === 'out')    return isAssignable(src.arg, tgt.arg);
    if (v === 'in')     return isAssignable(tgt.arg, src.arg);
    if (v === 'in out') return isAssignable(src.arg, tgt.arg) && isAssignable(tgt.arg, src.arg);
    return isAssignable(src.arg, tgt.arg) || isAssignable(tgt.arg, src.arg); // бивариантно
  }
  return compareMembers(src, tgt); // поля и возвраты ковариантно, параметры — см. шаг 4
}
\`\`\`

Во всех примерах ниже:

\`\`\`ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }
interface Cat extends Animal { meow(): void }
\`\`\`

### Пример 1. Ковариантность: то, что отдаётся наружу

\`\`\`ts
type Getter<T> = () => T;
declare let ga: Getter<Animal>;
declare let gd: Getter<Dog>;

ga = gd;   // ок: просили животное — получили собаку
gd = ga;
// error TS2322: Type 'Getter<Animal>' is not assignable to type 'Getter<Dog>'.
//   Property 'bark' is missing in type 'Animal' but required in type 'Dog'.
\`\`\`

Тот, кто вызывает \`ga()\`, ждёт \`Animal\` — собака его устроит. А тот, кто вызывает \`gd()\` и сразу пишет \`.bark()\`, на произвольном животном упадёт. Так же ковариантны \`Observable<T>\`, \`Promise<T>\`, \`Signal<T>\` — все они только отдают значения.

### Пример 2. Контравариантность: параметры функций

\`\`\`ts
type Fn<A> = (a: A) => void;
declare let fa: Fn<Animal>;
declare let fd: Fn<Dog>;

fd = fa;   // ок: обработчик любого животного справится и с собакой
fa = fd;
// error TS2322: Type 'Fn<Dog>' is not assignable to type 'Fn<Animal>'.
\`\`\`

Почему направление переворачивается: \`fa\` будут вызывать с любым животным, в том числе с котом. Если подсунуть туда \`fd\`, который внутри зовёт \`a.bark()\`, кот это не переживёт. С флагом \`strictFunctionTypes: false\` вторая строка тоже компилируется — параметры проверяются бивариантно.

### Пример 3. Контравариантность в реальных API

\`\`\`ts
const byName = (a: Animal, b: Animal) => a.name.localeCompare(b.name);
declare const dogs: Dog[];
dogs.sort(byName);   // ок: сравнивать умеет любых животных — сравнит и собак

type EventHandler = (e: Event) => void;
const onAny = (e: Event) => console.log(e.type);
const onMouse = (e: MouseEvent) => console.log(e.clientX);
const h1: EventHandler = onAny;     // ок
const h2: EventHandler = onMouse;
// error TS2322: Type '(e: MouseEvent) => void' is not assignable to type 'EventHandler'.
//   Types of parameters 'e' and 'e' are incompatible.
\`\`\`

Обработчик «любого события» можно повесить куда угодно, а обработчик, которому нужен \`clientX\`, нельзя отдать туда, где может прийти клавиатурное событие. Это самая частая «странная» ошибка про несовместимые колбэки.

### Инвариантность: и отдаёт, и принимает

\`\`\`ts
interface Box<T> { get(): T; set: (v: T) => void }
declare let ba: Box<Animal>;
declare let bd: Box<Dog>;

ba = bd;   // error: Types of property 'set' are incompatible.
bd = ba;   // error: The types returned by 'get()' are incompatible between these types.
\`\`\`

\`get\` требует ковариантности, \`set\` (свойство-функция) — контравариантности, вместе они дают инвариантность. Реальный пример — RxJS \`Subject<T>\`: \`Subject<Dog>\` нельзя присвоить ни в \`Subject<Animal>\`, ни обратно — компилятор упирается в поле \`observers\` и метод \`asObservable()\`.

### Бивариантность: методы против свойств-функций

\`\`\`ts
declare const dogOnly: (d: Dog) => void;

interface MethodHandler { handle(a: Animal): void }     // метод-сокращение
interface PropHandler { handle: (a: Animal) => void }   // свойство-функция

const m: MethodHandler = { handle: dogOnly };   // ок?! методы проверяются бивариантно
const p: PropHandler = { handle: dogOnly };
// error TS2322: Type '(d: Dog) => void' is not assignable to type '(a: Animal) => void'.
\`\`\`

\`strictFunctionTypes\` намеренно не трогает методы. Причина — совместимость: огромная часть кода, включая встроенные типы \`Array\` и DOM, объявлена методами, и строгая проверка сделала бы, например, \`Dog[]\` несовместимым с \`Animal[]\` из-за \`push(...items: T[])\`. Разница только в синтаксисе объявления, но последствия заметные.

### Массивы ковариантны — и это дыра

\`\`\`ts
const dogs: Dog[] = [{ name: 'Rex', bark() {} }];
const animals: Animal[] = dogs;          // ок — массивы ковариантны
animals.push({ name: 'Tom', meow() {} } as Cat);  // ок — это же массив животных
dogs[1].bark();                          // компилируется
// в рантайме: TypeError: dogs[1].bark is not a function

const back: Dog[] = animals as Animal[];
// error TS2322: Type 'Animal[]' is not assignable to type 'Dog[]'.
\`\`\`

Изменяемый массив по-хорошему должен быть инвариантным: из него читают (нужна ковариантность) и в него пишут (нужна контравариантность). TypeScript сознательно делает его **ковариантным**: \`Dog[]\` → \`Animal[]\` можно, обратно нельзя. Запись в массив идёт через методы вроде \`push\`, а методы проверяются бивариантно, поэтому дыру никто не ловит. \`readonly Dog[]\` тоже ковариантен, но там дыры нет: писать в него нельзя.

### Поля объектов и \`WritableSignal\` в Angular

\`\`\`ts
interface MutHolder<T> { value: T }
declare let mhd: MutHolder<Dog>;
const mha: MutHolder<Animal> = mhd;   // ок — поля ковариантны, даже изменяемые
mha.value = { name: 'Tom', meow() {} } as Cat;   // кот в «собачьем» контейнере

const dogSig = signal<Dog>({ name: 'Rex', bark() {} });
const animalSig: WritableSignal<Animal> = dogSig;   // ок — set объявлен методом
animalSig.set({ name: 'Tom', meow() {} } as Cat);
dogSig().bark();   // компилируется, падает в рантайме
\`\`\`

Модификатор \`readonly\` на присваиваемость не влияет: изменяемое поле проверяется так же ковариантно. А у \`WritableSignal<T>\` методы \`set\` и \`update\` объявлены сокращённым синтаксисом, поэтому сигнал «собаки» можно отдать как сигнал «животного». Вывод для практики: отдавайте наружу \`Signal<T>\` через \`asReadonly()\`, а не \`WritableSignal<T>\`.

### Особый случай: возврат \`void\`

\`\`\`ts
const arr = [1, 2];
const arr2: number[] = [];
arr.forEach(x => arr2.push(x));   // ок, хотя push возвращает number

type VoidFn = () => void;
const vf: VoidFn = () => 42;      // ок
const r = vf();                   // тип void — значение 42 «спрятано»

function declVoid(): void { return 42; }
// error TS2322: Type 'number' is not assignable to type 'void'.
\`\`\`

Функцию, возвращающую что угодно, можно подставить туда, где ждут \`() => void\`: вызывающий обещает результат не использовать. Но если \`void\` написан прямо в объявлении функции, вернуть значение уже нельзя.

### Аннотации \`in\` и \`out\` (TS 4.7+)

\`\`\`ts
interface Producer<out T> { get(): T }
interface Consumer<in T> { accept: (v: T) => void }
interface Inv<in out T> { get(): T }        // принудительно инвариантен

interface WrongOut<out T> { accept: (v: T) => void }
// error TS2636: Type 'WrongOut<sub-T>' is not assignable to type 'WrongOut<super-T>'
// as implied by variance annotation.

interface WrongOutMethod<out T> { accept(v: T): void }   // ошибки нет: метод бивариантен

function gen<in T>(x: T) {}
// error TS1274: 'in' modifier can only appear on a type parameter of a class, interface or type alias
\`\`\`

Аннотация заменяет автоматическое измерение вариантности. Это делает намерение явным, даёт понятные ошибки и в редких случаях с огромными рекурсивными типами ускоряет проверку. Компилятор проверяет, что аннотация не противоречит структуре (\`WrongOut\`), но через методы-сокращения ошибка проскакивает. А \`in out\` делает тип инвариантным, даже если по структуре он ковариантен: \`Inv<Dog>\` уже не присвоить \`Inv<Animal>\`.

### Где это применяется на практике

- **Колбэки и обработчики.** Передача \`(e: MouseEvent) => void\` туда, где ждут \`(e: Event) => void\`, обработчики для \`addEventListener\` и \`fromEvent\`, функции сравнения для сортировки грида, \`trackBy\`-функции.
- **Публичные API сервисов.** Наружу отдают \`Observable<T>\` и \`Signal<T>\` (ковариантны и безопасны), а не \`Subject<T>\` и \`WritableSignal<T>\`; иначе потребитель может записать в стрим или сигнал значение более широкого типа.
- **Иерархии моделей.** \`Observable<AdminUser>\` спокойно передаётся в компонент, ожидающий \`Observable<User>\`, а \`(u: AdminUser) => void\` в качестве колбэка для любых пользователей — уже ошибка, и это правильно.
- **Свои дженерик-интерфейсы.** В библиотечном коде (стор, шина событий, репозиторий) свойства-функции вместо методов дают строгую проверку, а \`in\`/\`out\` документируют, кто производит, а кто потребляет \`T\`.
- **Миграции на \`strict\`.** Включение \`strictFunctionTypes\` в старом проекте обычно вскрывает десятки неправильных колбэков — понимание контравариантности помогает чинить их, а не глушить \`any\`.

## Важные нюансы и подводные камни

- **\`strictFunctionTypes\` не действует на методы.** \`interface A { on(e: Event): void }\` проверяется бивариантно, а \`interface A { on: (e: Event) => void }\` — строго. Разница только в синтаксисе объявления; хотите строгость — объявляйте свойством-функцией.
- **Изменяемый массив ковариантен, и это небезопасно.** \`Dog[]\` присваивается в \`Animal[]\`, после чего туда можно положить кота, а \`dogs[1].bark()\` упадёт в рантайме. TypeScript это разрешает сознательно. Обратное присваивание (\`Animal[]\` в \`Dog[]\`) запрещено — массив не бивариантен.
- **\`readonly\` у полей не влияет на вариантность.** Изменяемые поля тоже проверяются ковариантно, поэтому \`MutHolder<Dog>\` присваивается \`MutHolder<Animal>\` — ещё одна сознательная дыра.
- **\`WritableSignal<T>\` и похожие типы с методами-сеттерами фактически бивариантны по записи.** Отдавайте наружу \`asReadonly()\` и \`Observable\`, а не записываемые обёртки.
- **Возврат \`void\` особенный.** Функцию, возвращающую что угодно, можно подставить туда, где ждут \`() => void\`. Поэтому \`arr.forEach(x => arr2.push(x))\` компилируется без ошибок.
- **Аннотации \`in\`/\`out\` — не про рантайм.** Это подсказка компилятору, в JavaScript от них ничего не остаётся. Ошибочная аннотация на свойстве-функции даст ошибку TS2636, а не тихую поломку, но на методе-сокращении противоречие не поймается. Писать их можно только у параметров классов, интерфейсов и псевдонимов типов.
- **\`sub-T\` и \`super-T\` в тексте ошибки** — это маркеры, которыми компилятор измеряет вариантность. Увидели их — проблема в аннотации или в структуре дженерика, а не в конкретном вызове.

**Плюсы:** строгая контравариантность параметров ловит реальные баги с колбэками, ковариантность массивов и полей делает повседневный код удобным, аннотации \`in\`/\`out\` документируют намерение и ускоряют проверку сложных типов.
**Минусы:** система намеренно ненадёжна — массивы, изменяемые поля и методы оставляют дыры, через которые проходит «кот в списке собак»; правила зависят от синтаксиса объявления и флага \`strictFunctionTypes\`, что сбивает с толку.

## Как это спрашивают на собеседовании

**Главный вывод:** то, что отдаётся наружу, ковариантно, то, что принимается внутрь, — контравариантно, и то и другое сразу — инвариантно. В TypeScript параметры функций строго контравариантны только при \`strictFunctionTypes\` и только у свойств-функций; методы бивариантны, а массивы и поля ковариантны, хотя это небезопасно.

Типичные формулировки: «Почему функцию \`(e: MouseEvent) => void\` нельзя передать как \`(e: Event) => void\`?», «Что такое ко- и контравариантность?», «Можно ли присвоить \`Dog[]\` в \`Animal[]\` и безопасно ли это?», «Чем метод отличается от свойства-функции в интерфейсе?».

Что могут спросить следом:

- *Почему параметры контравариантны?* — Функцию с более широким параметром можно вызвать с любым аргументом, который пришёл бы в узкую; наоборот — нет.
- *Какие позиции ковариантны?* — Возвращаемые значения, поля, элементы массивов; \`Observable<T>\`, \`Promise<T>\`, \`Signal<T>\`.
- *Зачем методы оставили бивариантными?* — Ради совместимости: иначе \`Dog[]\` не присваивался бы \`Animal[]\` из-за \`push\` и сломались бы DOM-типы и старый код.
- *Что дают \`in\`/\`out\`?* — Явную вариантность вместо вычисленной, понятные ошибки при противоречии структуре и иногда ускорение проверки.
- *Как сделать тип инвариантным?* — Использовать \`T\` и на входе, и на выходе (например, свойство-функцию с \`T\` в параметре и геттер), или явно написать \`in out T\`.

### Ответ на 1 минуту

> Вариантность описывает, как отношение подтипов переносится на обобщённые типы: если \`Dog\` подтип \`Animal\`, будет ли \`F<Dog>\` подтипом \`F<Animal>\`. То, что отдаётся наружу, — возвращаемые значения, поля, \`Observable\` — ковариантно, направление сохраняется. Параметры функций контравариантны: обработчик любого \`Event\` можно передать туда, где ждут обработчик \`MouseEvent\`, а обратно нельзя, потому что придёт событие без \`clientX\`. Если тип и принимает, и отдаёт \`T\`, он инвариантен, как RxJS \`Subject\`. В TypeScript строгая проверка параметров включается флагом \`strictFunctionTypes\`, но методы, объявленные сокращённым синтаксисом, намеренно остаются бивариантными, а массивы и поля ковариантны даже изменяемые — поэтому кота можно положить в \`Dog[]\`, приведённый к \`Animal[]\`. С TS 4.7 вариантность можно указать явно через \`in\`, \`out\` и \`in out\`.`,
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
      ru: `## В чём суть

Три «особых» типа TypeScript, если сказать одной фразой о каждом: \`any\` — «отстань, компилятор», проверки выключены полностью; \`unknown\` — «я не знаю, что это, заставь меня проверить перед использованием»; \`never\` — «сюда попасть невозможно», тип, у которого нет ни одного значения. \`unknown\` и \`never\` — честные полюса системы типов, а \`any\` — аварийный выход из неё.

Аналогия: \`any\` — коробка без этикетки, которую разрешено открывать и есть содержимое вслепую. \`unknown\` — та же коробка, но правила требуют сначала вскрыть её и проверить, что внутри. \`never\` — коробки вообще нет: держать в руках нечего, и если код утверждает, что она у вас есть, значит, до этого места выполнение дойти не могло.

**Какую проблему решает.** Данные из внешнего мира — JSON, ответы сервера, \`localStorage\`, \`postMessage\`, ошибки в \`catch\` — приходят без гарантий формы. Если объявить их как \`any\`, компилятор молча пропустит \`data.user.name\`, и приложение упадёт в рантайме на неожиданном ответе. \`unknown\` даёт ту же гибкость «принять что угодно», но заставляет написать проверку. \`never\` решает обратную задачу: позволяет компилятору доказать, что все варианты обработаны, — добавили новый статус в union и забыли \`case\`, сборка падает, а не пользователь.

## Словарик терминов

- **Тип как множество значений** — удобная модель: \`string\` — множество всех строк, \`'a' | 'b'\` — множество из двух строк. Присвоить A в B можно, если множество A входит в B.
- **Верхний тип (top type)** — тип, в который входит любое значение. В TypeScript это \`unknown\`.
- **Нижний тип (bottom type)** — пустое множество, тип без значений. В TypeScript это \`never\`; он входит в любой тип.
- **\`any\`** — не множество, а выключатель: значение типа \`any\` можно присвоить куда угодно и делать с ним что угодно без проверок.
- **Сужение типа (narrowing)** — компилятор уменьшает тип внутри ветки после проверки: после \`typeof x === 'string'\` переменная \`x\` уже \`string\`.
- **Type guard (защитник типа)** — проверка, которая сужает тип: \`typeof\`, \`instanceof\`, \`in\`, \`Array.isArray\` или своя функция с возвращаемым типом \`x is User\`.
- **Утверждение типа (type assertion, \`as\`)** — «поверь мне, это \`User\`»: компилятор не проверяет, правда ли это.
- **Дискриминируемый union (discriminated union)** — union объектов с общим полем-меткой (\`t: 'a' | 'b'\`), по которому \`switch\` сужает тип.
- **Проверка полноты (exhaustiveness check)** — приём, при котором компилятор ругается, если в \`switch\` обработаны не все варианты union.
- **\`useUnknownInCatchVariables\`** — флаг TS 4.4+, входящий в \`strict\`: переменная в \`catch (e)\` получает тип \`unknown\`, а не \`any\`.
- **\`noImplicitAny\`** — флаг из \`strict\`: запрещает неявный \`any\`, когда тип нельзя вывести.
- **\`no-explicit-any\`** — правило линтера (\`@typescript-eslint/no-explicit-any\`), запрещающее писать \`any\` руками.
- **\`void\`** — «функция возвращает управление, но результат не важен». Не путать с \`never\` — «управление не вернётся».

## Как это работает под капотом

Как компилятор обращается с каждым из трёх типов:

1. Сначала полезно представить типы как множества. Присваивание \`A → B\` разрешено, если все значения \`A\` входят в \`B\`.
2. \`unknown\` — множество всех значений. Поэтому в него можно присвоить что угодно, а его самого — только в \`unknown\` и \`any\`. Любая операция (\`.n\`, вызов, \`+\`) запрещена, пока вы не сузите множество проверкой.
3. \`never\` — пустое множество. Пустое множество входит в любое, поэтому \`never\` присваивается всему. А в \`never\` нельзя присвоить ничего, кроме \`never\`, — даже \`any\`.
4. \`any\` вне правил: компилятор пропускает проверки в обе стороны и делает \`any\` результатом любой операции над ним — свойство, вызов, индекс. Так \`any\` растекается по коду.
5. При сужении компилятор вычёркивает из union проверенные варианты. Если не осталось ни одного — в ветке тип \`never\`. На этом построена проверка полноты.
6. В объединениях и пересечениях работают правила множеств: \`unknown | X\` — это \`unknown\`, \`never | X\` — это \`X\`, \`unknown & X\` — это \`X\`, \`never & X\` — это \`never\`, а \`any | X\` — это \`any\`.

Те же правила, проверенные компилятором:

\`\`\`ts
type T1 = unknown | string;   // unknown — всё поглощает
type T2 = never | string;     // string  — пустое множество исчезает
type T3 = unknown & string;   // string
type T4 = string & number;    // never   — невозможное пересечение
type T5 = { kind: 'a' } & { kind: 'b' };   // never
type K1 = keyof unknown;      // never   — у «чего угодно» нет гарантированных ключей
type K2 = keyof any;          // string | number | symbol
\`\`\`

### Пример 1. \`any\`: проверок нет, и он заражает соседей

\`\`\`ts
const raw: any = JSON.parse('{}');
const deep = raw.foo.bar.baz;   // any — компилятор молчит
const num: number = raw;        // ок — any присваивается куда угодно
raw();                          // ок — и вызывается
new raw();                      // ок — и конструируется
// в рантайме: TypeError: Cannot read properties of undefined (reading 'bar')
\`\`\`

\`any\` не просто «любой тип» — он **заражает** соседний код. Достали поле из \`any\` — получили \`any\`. Передали дальше — и вся цепочка потеряла типы, а ошибка вылезет уже в рантайме. Оправданные случаи в основном два: постепенная миграция старого JS-кода и работа с нетипизированной библиотекой. И то лучше локально, а не в сигнатуре публичной функции.

### Пример 2. \`unknown\`: принять можно всё, использовать — после проверки

\`\`\`ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse('{"n":1}');

data.n;
// error TS18046: 'data' is of type 'unknown'.

if (typeof data === 'object' && data !== null && 'n' in data) {
  data;     // object & Record<"n", unknown>
  data.n;   // unknown — поле есть, но его тип ещё не проверен
}
\`\`\`

Компилятор буквально заставляет пройти цепочку: «это объект» → «не \`null\`» (потому что \`typeof null === 'object'\`) → «у него есть поле \`n\`». После каждой проверки тип сужается. Правильные места для \`unknown\`: результат \`JSON.parse\`, данные из сети и хранилищ, \`catch (e)\`, аргументы обобщённых утилит.

### Способы сузить \`unknown\`

\`\`\`ts
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;   // e: Error
  return String(e);
}

interface User { id: number; name: string }
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null
    && 'id' in x && typeof x.id === 'number'
    && 'name' in x && typeof x.name === 'string';
}
const v: unknown = JSON.parse('{"id":1,"name":"Ann"}');
if (isUser(v)) {
  v.name;   // v: User
}
\`\`\`

\`typeof\` подходит для примитивов, \`instanceof\` — для классов (\`Error\`, \`Date\`, \`HttpErrorResponse\`), \`in\` — для проверки наличия поля, а своя функция \`x is User\` собирает проверку один раз и переиспользует её. В больших проектах вместо ручных guard'ов часто берут библиотеку схем (zod, valibot), которая из схемы делает и проверку, и тип.

### Разбор функции \`safe\` из примера

\`\`\`ts
function safe(input: unknown) {
  if (typeof input === 'string') return input.trim();   // input: string
  if (Array.isArray(input)) return input.length;        // input: any[] ← осторожно
  return 0;
}
\`\`\`

\`unknown\` заставил проверить тип перед \`.trim()\` и \`.length\`. Но есть подвох: \`Array.isArray\` объявлен как \`arg is any[]\`, поэтому внутри второй ветки \`input\` — уже \`any[]\`, и элементы массива снова без проверок. Если элементы важны, проверяйте и их.

### \`never\`: откуда он берётся

\`\`\`ts
function fail(msg: string): never { throw new Error(msg); }   // никогда не возвращает
function loop(): never { while (true) {} }                   // бесконечный цикл

function failDecl(msg: string) { throw new Error(msg); }      // выведено: void (!)
const failArrow = (msg: string) => { throw new Error(msg); }; // выведено: never

function f(x: string | number) {
  if (typeof x === 'string') { /* ... */ }
  else if (typeof x === 'number') { /* ... */ }
  else { x; }   // never — вариантов не осталось
}

const state = { items: [] };   // items: never[]
state.items.push(1);
// error TS2345: Argument of type '1' is not assignable to parameter of type 'never'.
\`\`\`

\`never\` появляется сам: у функции, которая не возвращает управление; в недостижимой ветке после исчерпывающих проверок; как результат невозможного пересечения. Обратите внимание на тонкость: объявление \`function\` без аннотации, которое всегда бросает, выводится как \`void\`, а стрелка — как \`never\`. Для функций-«падалок» тип \`never\` лучше писать явно.

### Проверка полноты \`switch\`

Главное практическое применение \`never\`. Пусть в union добавили третий вариант, а обработку забыли:

\`\`\`ts
type Cmd = { t: 'a' } | { t: 'b' } | { t: 'c' };   // добавили 'c'

function run(c: Cmd) {
  switch (c.t) {
    case 'a': return 1;
    case 'b': return 2;
    default: { const _: never = c; return _; }
    // error TS2322: Type '{ t: "c"; }' is not assignable to type 'never'.
  }
}
\`\`\`

Пока обработаны все варианты, в \`default\` тип \`c\` сужен до \`never\`, и присваивание проходит. Появился необработанный \`'c'\` — в \`default\` остаётся \`{ t: 'c' }\`, и компилятор сразу показывает, какой вариант забыт. Часто то же оформляют функцией, которая заодно бросит ошибку в рантайме, если данные пришли «мимо типов»:

\`\`\`ts
function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + JSON.stringify(x));
}
// default: return assertNever(c);
// error TS2345: Argument of type '{ t: "c"; }' is not assignable to parameter of type 'never'.
\`\`\`

Ещё один вариант — явный возвращаемый тип без \`default\`: функция \`run3(c: Cmd): number\` без ветки для \`'c'\` даст ошибку «Function lacks ending return statement and return type does not include 'undefined'».

### Кто кому присваивается

\`\`\`ts
declare const a: any; declare const u: unknown; declare const nv: never;

const t1: never = a;    // error TS2322: Type 'any' is not assignable to type 'never'.
const t2: string = u;   // error TS2322: Type 'unknown' is not assignable to type 'string'.
const t3: string = nv;  // ок — never присваивается всему
const t4: any = u;      // ок
const t6: string = a;   // ок — any присваивается всему, кроме never
\`\`\`

### \`catch\`, RxJS и Angular

\`\`\`ts
try { /* ... */ } catch (e) {
  e;   // unknown при strict (useUnknownInCatchVariables), иначе any
}

this.http.get<User>('/api/me').pipe(
  catchError((err: unknown) => {   // в RxJS 7 err объявлен как any — аннотируйте сами
    if (err instanceof HttpErrorResponse) this.toast(err.status);
    return of(null);
  }),
);
\`\`\`

Бросить в JavaScript можно что угодно — строку, число, объект, — поэтому \`unknown\` в \`catch\` честнее, чем \`any\`. При этом в RxJS 7 параметр \`catchError\` имеет тип \`any\`, а в Angular \`HttpErrorResponse.error\` тоже \`any\` — эти места стоит явно сужать.

### Двойное приведение \`as unknown as T\`

\`\`\`ts
const s2 = 'abc' as number;
// error TS2352: Conversion of type 'string' to type 'number' may be a mistake ...
// If this was intentional, convert the expression to 'unknown' first.
const s = 'abc' as unknown as number;   // компилируется — и это ложь
\`\`\`

\`unknown\` — это «переходник», через который можно привести что угодно к чему угодно. Иногда это нужно (моки в тестах, стыковка с чужими типами), но каждое такое место — потенциальная ошибка, которую компилятор больше не поймает.

### Как выбрать

- **Данные пришли извне, и форма не гарантирована** — \`unknown\`, затем type guard или схема валидации.
- **Утилите всё равно, что внутри** (логгер, \`deepEqual\`, сериализатор) — \`unknown\`; если тип должен «пройти насквозь» на выход — дженерик \`T\`, а не \`any\`.
- **Функция никогда не возвращает управление** (только бросает или крутится вечно) — явная аннотация \`: never\`.
- **Нужно доказать, что все варианты union обработаны** — \`never\` в \`default\` или \`assertNever\`.
- **Нужно выкинуть варианты в типовой утилите** — \`never\` как «ластик» в условном или mapped type.
- **Переносите JS-код или подключаете библиотеку без типов** — \`any\`, но временно и локально, с планом замены; в остальных случаях \`any\` означает, что тип просто не додумали.

### Где это применяется на практике

- **HTTP-слой и внешние данные.** Ответ сервера, \`localStorage\`, \`postMessage\`, параметры URL — сначала \`unknown\`, затем guard или схема, и только потом доменный тип.
- **Обработка ошибок.** Глобальный \`ErrorHandler\`, интерсепторы, \`catchError\` — параметр как \`unknown\`, дальше \`instanceof HttpErrorResponse\` / \`instanceof Error\`.
- **Редьюсеры и обработчики статусов.** \`switch\` по \`action.type\` или статусу заказа с \`assertNever\` в \`default\`: новый статус не скомпилируется, пока его не обработают во всех местах.
- **Утилиты и библиотеки.** Аргументы типа «что угодно» (\`deepEqual(a: unknown, b: unknown)\`, логгеры) — \`unknown\` вместо \`any\`.
- **Миграция легаси.** \`any\` как временная заглушка при переносе JS в TS, с правилом \`no-explicit-any\` в линтере и постепенной заменой на \`unknown\` и реальные типы.
- **Типовые утилиты.** \`never\` как «ластик» в условных типах (\`Exclude\`) и фильтрах ключей.

## Важные нюансы и подводные камни

- **\`unknown\` поглощает union, \`never\` в нём исчезает.** \`unknown | string\` — это просто \`unknown\`, а \`never | string\` — это \`string\`.
- **В \`catch\` по умолчанию \`any\`.** Флаг \`useUnknownInCatchVariables\` (входит в \`strict\`) делает его \`unknown\`, и это правильно — брошено может быть что угодно, не только \`Error\`.
- **\`any\` тихо проходит проверки.** \`const x: any = ...; x.foo.bar.baz\` компилируется и падает в рантайме. Именно поэтому в линтерах есть правило \`no-explicit-any\`.
- **\`any\` приходит и неявно.** \`JSON.parse\`, \`catchError\` в RxJS 7, \`HttpErrorResponse.error\`, \`Array.isArray\` (сужает до \`any[]\`) — \`any\` появляется без единого \`any\` в вашем коде. Оборачивайте такие места в функции, возвращающие \`unknown\`.
- **Массив \`never[]\` — частый признак ошибки вывода.** Обычно это пустой массив без аннотации внутри объекта (\`{ items: [] }\`), в который потом ничего нельзя положить. Отдельная переменная \`const arr = []\` при \`strict\` ведёт себя иначе — тип «дорастает» по мере \`push\`.
- **\`void\` и \`never\` — разные вещи.** \`void\` возвращает управление, \`never\` — нет. А объявление \`function\`, которое всегда бросает, без аннотации выводится как \`void\`, поэтому \`: never\` для таких функций пишут явно.
- **В \`never\` нельзя присвоить даже \`any\`.** Если проверяемое значение вдруг оказалось \`any\` (например, пришло из нетипизированного кода), \`const _: never = c\` не пропустит его молча, а даст ошибку «Type 'any' is not assignable to type 'never'» — это сигнал, что типы потерялись раньше.

**Плюсы:** \`unknown\` даёт гибкость «принять что угодно» без потери безопасности, \`never\` позволяет компилятору доказывать полноту обработки и описывать невозможные состояния, \`any\` спасает при миграции и интеграции с нетипизированным кодом.
**Минусы:** \`any\` заразен и отключает все гарантии, \`unknown\` требует писать проверки (или подключать схемы), \`never\` легко получить случайно (пустые массивы, невозможные пересечения) и потом долго искать причину.

## Как это спрашивают на собеседовании

**Главный вывод:** \`unknown\` — безопасный верхний тип: принять можно всё, использовать — только после сужения; \`never\` — нижний тип без значений, присваивается всему и лежит в основе проверки полноты; \`any\` — выключатель проверок, который заражает код и нужен только как временный аварийный выход.

Типичные формулировки: «Чем \`unknown\` отличается от \`any\`?», «Где появляется \`never\`?», «Как сделать, чтобы \`switch\` по union не скомпилировался, если добавили новый вариант?», «Какой тип у \`e\` в \`catch\`?».

Что могут спросить следом:

- *Что будет с \`unknown | string\` и \`never | string\`?* — Первое схлопнется в \`unknown\`, второе — в \`string\`.
- *Можно ли присвоить \`any\` в \`never\`?* — Нет, \`never\` не принимает ничего, кроме \`never\`.
- *Чем отличаются \`void\` и \`never\` у функции?* — \`void\` возвращает управление без полезного результата, \`never\` не возвращает его вообще (исключение, бесконечный цикл).
- *Как превратить \`unknown\` в \`User\`?* — Через type guard (\`x is User\`) или схему валидации; \`as User\` компилируется, но ничего не проверяет.
- *Почему \`const state = { items: [] }\` даёт \`never[]\`?* — Пустой литерал массива без контекста получает тип элементов \`never\`; нужна аннотация \`items: [] as Item[]\` или тип у всего объекта.

### Ответ на 1 минуту

> \`any\` полностью отключает проверку типов и заражает соседний код: любое поле или вызов на нём тоже \`any\`, поэтому это аварийный выход для миграции и нетипизированных библиотек, а не рабочий инструмент. \`unknown\` — безопасный верхний тип: принять можно любое значение, но использовать без сужения нельзя, компилятор потребует \`typeof\`, \`instanceof\`, \`in\` или свой type guard. Это правильный тип для данных из внешнего мира — JSON, ответов сервера, переменной в \`catch\`, которая при \`strict\` и так \`unknown\`. \`never\` — нижний тип без значений: он появляется у функций, которые не возвращают управление, в недостижимых ветках и при невозможных пересечениях. \`never\` присваивается любому типу, а в него нельзя ничего, даже \`any\`, — на этом я строю проверку полноты \`switch\` с \`assertNever\` в \`default\`, чтобы новый статус не скомпилировался без обработки.`,
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
      ru: `## В чём суть

Сужение типа (narrowing) — это когда компилятор следит за вашими обычными проверками и уточняет тип переменной внутри ветки. Было \`x: string | number\`, вы написали \`if (typeof x === 'string')\` — и внутри этого \`if\` компилятор уже считает \`x\` строкой, а в \`else\` — числом. Механизм, который это делает, называется анализом потока управления (control-flow analysis): TypeScript мысленно проходит по всем веткам кода и для каждой точки ведёт свой «текущий тип» переменной.

Аналогия: офисное здание с турникетами. На входе в здание может оказаться кто угодно — сотрудник, курьер, гость. Но в коридоре за турникетом «только по пропуску» гарантированно стоят люди с пропуском. Архитектор, глядя на план здания, может для каждой комнаты сказать, кто туда вообще способен попасть. Компилятор — тот самый архитектор: он читает «план» функции и знает, какие проверки уже пройдены в каждой точке. А пользовательский type guard — это охранник, которому система верит на слово: если он пропустит не того, никто этого не заметит.

**Какую проблему решает.** Реальные данные почти всегда «то или это»: ответ API \`User | null\`, необязательный \`input()\`, ошибка в \`catch\` типа \`unknown\`, результат \`JSON.parse\`. Без сужения пришлось бы либо везде писать приведения \`as\` (и врать компилятору), либо компилятор запрещал бы вызвать \`.toUpperCase()\` у \`string | number\`. Сужение позволяет писать обычный JavaScript с обычными проверками и бесплатно получать точные типы — без единого приведения и с защитой от \`null\`.

## Словарик терминов

- **Объединение (union type, \`A | B\`)** — тип «или то, или это»: значение \`string | number\` может оказаться строкой или числом.
- **Сужение (narrowing)** — уточнение типа после проверки: из \`string | number\` внутри ветки остаётся \`string\`.
- **Анализ потока управления (control-flow analysis, CFA)** — работа компилятора, при которой он проходит по веткам кода (\`if\`, \`switch\`, \`return\`, \`throw\`) и вычисляет тип переменной в каждой точке.
- **Ссылка (reference)** — то, что компилятор умеет сужать: переменная \`x\`, параметр, свойство \`this.user\`, \`obj.a.b\`. Результат вызова функции — \`user()\` — ссылкой не считается.
- **Type guard (тип-предохранитель)** — любая проверка, после которой компилятор сужает тип: \`typeof\`, \`instanceof\`, \`in\`, сравнение и т. д.
- **Предикат типа (type predicate, \`x is T\`)** — особый тип возврата функции: «если я вернула \`true\`, то аргумент — это \`T\`». Так пишут свои type guards.
- **Assertion-функция (\`asserts x is T\`, \`asserts cond\`)** — функция, которая бросает исключение при неудаче, а после успешного вызова сужает тип во всём последующем коде.
- **Truthy / falsy** — значения, которые в \`if\` считаются истиной или ложью. Falsy: \`false\`, \`0\`, \`''\`, \`null\`, \`undefined\`, \`NaN\` (и \`0n\`); всё остальное truthy.
- **\`unknown\`** — «что угодно, но сначала проверь»: с таким значением ничего нельзя сделать без сужения.
- **\`never\`** — «пустой» тип, у которого нет ни одного значения. Получается, когда проверки исключили все варианты.
- **Discriminated union (размеченное объединение)** — union объектов с общим полем-меткой (\`kind\`, \`type\`, \`status\`) с литеральными значениями; проверка метки сужает весь объект.
- **Замыкание, колбэк (closure, callback)** — функция, созданная внутри другой и вызываемая позже: \`setTimeout(() => ...)\`, \`arr.map(...)\`, \`subscribe(...)\`.

## Как это работает под капотом

Сужение — это не магия в рантайме, а чистый статический анализ. Код не выполняется, компилятор только читает его структуру:

1. Сначала компилятор строит граф потока управления: точки кода соединены стрелками-переходами. \`if\` раздваивает стрелку на ветки «да» и «нет», \`return\` и \`throw\` обрывают ветку, после \`if/else\` ветки снова сходятся.
2. Каждая проверка вешает на свои стрелки «факт»: на ветке «да» у \`typeof x === 'string'\` записано «\`x\` — строка», на ветке «нет» — «\`x\` — не строка».
3. Когда компилятор встречает обращение к \`x\`, он идёт по графу назад, от этой точки до объявления, и применяет к объявленному типу все встреченные факты: на ветке «да» оставляет подходящие члены union, на ветке «нет» — вычитает их. Поэтому тип зависит от места в коде, а не только от объявления.
4. Там, где ветки сходятся, типы объединяются: если в одной ветке \`x: string\`, а в другой \`x: number\`, после \`if/else\` снова \`string | number\`.
5. Ветка, оборванная \`return\` или \`throw\`, в схождении не участвует — поэтому \`if (x == null) return;\` сужает весь оставшийся код функции (приём «ранний выход»).
6. Присваивание — тоже факт: после \`x = 'abc'\` тип \`x\` становится \`string\`, пока его не переприсвоят.
7. Если факты исключили все варианты, остаётся \`never\` — на этом построена проверка полноты \`switch\`.
8. Граница функции — особый случай: колбэк вызовут неизвестно когда, поэтому сужения изменяемых ссылок (\`this.user\`, \`let\`, который потом переприсваивают) внутрь колбэка не переносятся.

Упрощённый псевдокод того, что делает компилятор в точке обращения к переменной:

\`\`\`ts
// псевдокод: как вычисляется тип x в конкретной точке
function typeAt(point, declaredType) {
  let t = declaredType;                         // string | number | null
  for (const fact of factsOnPathTo(point)) {    // все проверки, «пройденные» до этой точки
    t = fact.passed ? keepMatching(t, fact)     // ветка «да»: оставить подходящие
                    : removeMatching(t, fact);  // ветка «нет»: вычесть их
  }
  return t;                                     // ничего не осталось — never
}
\`\`\`

### Пример 1. \`typeof\` и ранний выход

Оператор \`typeof\` возвращает строку с названием рантайм-типа: \`'string'\`, \`'number'\`, \`'boolean'\`, \`'bigint'\`, \`'symbol'\`, \`'undefined'\`, \`'object'\`, \`'function'\`. Компилятор знает этот список и сужает по нему примитивы.

\`\`\`ts
function format(x: string | number | null) {
  if (x == null) return;          // == null отсекает и null, и undefined
  // здесь x: string | number
  if (typeof x === 'string') {
    return x.toUpperCase();       // x: string
  } else {
    return x.toFixed(2);          // x: number
  }
}
\`\`\`

Ловушка: \`typeof null === 'object'\`. Поэтому проверка \`typeof x === 'object'\` для \`x: object | null\` оставляет \`object | null\`, и \`null\` нужно отсекать отдельно.

### Пример 2. Проверка на truthy — коварный ноль

Проверка \`if (value)\` или \`if (!value)\` сужает по truthy/falsy. Удобно для \`null\` и \`undefined\`, но опасно для чисел и строк, у которых тоже есть falsy-значения.

\`\`\`ts
function setPage(n: number | undefined) {
  if (!n) {
    // n: number | undefined — компилятор помнит, что 0 тоже falsy
    return;
  }
  // n: number
}
setPage(0); // страница 0 молча проигнорирована — логический баг
\`\`\`

Компилятор здесь честен: в ветке \`!n\` он оставил \`number\`, потому что \`0\` — falsy. Для чисел и строк сравнивайте явно: \`if (n === undefined)\` или \`if (n == null)\`.

### Пример 3. \`instanceof\` и \`Array.isArray\`

\`x instanceof Date\` проверяет, есть ли \`Date.prototype\` в цепочке прототипов объекта, и сужает до класса. \`Array.isArray(x)\` объявлен в стандартной библиотеке как type guard \`arg is any[]\`, поэтому тоже сужает.

\`\`\`ts
function toText(x: Date | string[] | string) {
  if (x instanceof Date) return x.toISOString(); // x: Date
  if (Array.isArray(x)) return x.join(', ');     // x: string[]
  return x;                                      // x: string
}
\`\`\`

В Angular это классика для \`catch\` и \`catchError\`: ошибка приходит как \`unknown\`, и \`if (e instanceof HttpErrorResponse)\` открывает доступ к \`e.status\`.

### Пример 4. Оператор \`in\`

\`'prop' in obj\` проверяет, есть ли у объекта свойство (своё или из прототипа). На ветке «да» остаются члены union, у которых это свойство есть — обязательное или необязательное; на ветке «нет» — те, где его нет или оно необязательное.

\`\`\`ts
type Fish  = { swim(): void };
type Bird  = { fly(): void };
type Human = { swim?(): void; fly?(): void };

function move(p: Fish | Bird | Human) {
  if ('swim' in p) {
    // p: Fish | Human — у Human swim необязательный
  } else {
    // p: Bird | Human
  }
}
\`\`\`

С TypeScript 4.9 \`in\` работает и для свойств, которых в типе нет вообще: после \`typeof a === 'object' && a !== null && 'meow' in a\` значение \`a\` имеет тип \`object & Record<'meow', unknown>\`. Это главный строительный блок своих type guards для \`unknown\`.

### Пример 5. Сравнение с литералом и discriminated union

Проверки \`===\`, \`!==\`, \`==\`, \`!=\` и \`switch\` сужают по значению. Самый мощный случай — union объектов с общим полем-меткой:

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

function area(s: Shape) {
  if (s.kind === 'circle') {
    return Math.PI * s.radius ** 2;  // s: { kind: 'circle'; radius: number }
  }
  return s.side ** 2;                // s: { kind: 'square'; side: number }
}

function same(x: string | number, y: string | boolean) {
  if (x === y) {
    // x: string, y: string — общий тип у них может быть только string
  }
}
\`\`\`

С TypeScript 5.3 сужает и \`switch (true)\` с условиями в \`case\`: \`case typeof x === 'string':\` — внутри ветки \`x: string\`.

### Пример 6. Присваивание, сохранённые условия и \`never\`

\`\`\`ts
let v: string | number = Math.random() > 0.5 ? 'a' : 1;
v = 'abc';   // дальше v: string
v = 42;      // дальше v: number

function check(x: string | number) {
  const isStr = typeof x === 'string';  // условие сохранили в константу (TS 4.4+)
  if (isStr) {
    x.toUpperCase();                    // x: string — компилятор «помнит» связь
  }
  if (typeof x === 'number') return;
  if (typeof x === 'string') return;
  // x: never — вариантов не осталось
}
\`\`\`

Сохранённое условие работает, только если оно записано в \`const\` (с \`let isStr\` связь теряется), а проверяемую переменную нигде не переприсваивают.

### Пользовательский type guard (\`x is T\`)

Когда проверка сложная, её выносят в функцию с типом возврата \`arg is T\` — предикатом типа. Вернула \`true\` — компилятор сузит аргумент в вызывающем коде; вернула \`false\` — вычтет \`T\` в ветке \`else\`.

\`\`\`ts
interface Cat { meow(): void }
interface Dog { bark(): void }

function isCat(a: unknown): a is Cat {
  return typeof a === 'object' && a !== null
    && 'meow' in a && typeof a.meow === 'function';
}

declare const pet: Cat | Dog;
if (isCat(pet)) {
  pet.meow();   // pet: Cat
} else {
  pet.bark();   // pet: Dog
}
\`\`\`

Главное: за правильность отвечаете вы. Компилятор не проверяет, что тело функции соответствует предикату. \`function isCat(a: unknown): a is Cat { return true; }\` компилируется без единого предупреждения — и врёт. Проверяется только одно: \`T\` должен быть совместим с типом параметра, иначе ошибка \`A type predicate's type must be assignable to its parameter's type\`.

Где пригодится: проверка ответа бэкенда, разбор сообщений из WebSocket или \`postMessage\`, фильтрация массивов \`items.filter(isActive)\`.

### Assertion-функции (\`asserts\`)

Assertion-функция не возвращает \`boolean\`, а бросает исключение, если условие не выполнено. После успешного вызова тип сужен во всём последующем коде — без вложенного \`if\`.

\`\`\`ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('not a string');
}

function assert(cond: unknown, msg = 'Assertion failed'): asserts cond {
  if (!cond) throw new Error(msg);
}

declare const input: unknown;
assertIsString(input);
input.toUpperCase();          // input: string до конца функции

declare const id: string | null;
assert(id !== null, 'id обязателен');
id.length;                    // id: string
\`\`\`

Подвох: функцию-assertion нужно вызывать через имя с явной аннотацией типа. Стрелка без аннотации даст ошибку:

\`\`\`ts
const assertNum = (v: unknown): asserts v is number => {
  if (typeof v !== 'number') throw new Error();
};
declare const z: unknown;
assertNum(z);
// error TS2775: Assertions require every name in the call target
// to be declared with an explicit type annotation.
\`\`\`

Лечится объявлением через \`function\` или аннотацией у константы: \`const assertNum: (v: unknown) => asserts v is number = ...\`.

### Автоматический вывод предикатов (TypeScript 5.5)

Раньше \`arr.filter(x => x != null)\` возвращал массив с тем же \`null\` внутри типа — приходилось писать guard руками. С TS 5.5 компилятор сам выводит предикат для простых стрелок:

\`\`\`ts
const arr = [1, null, 2, undefined];
const r1 = arr.filter(x => x != null);   // number[]

const isNum = (x: unknown) => typeof x === 'number';
// тип isNum: (x: unknown) => x is number

const nums = [0, 1, undefined];
const r2 = nums.filter(x => !!x);        // (number | undefined)[] — предикат НЕ выведен
\`\`\`

Почему во втором случае не сработало: предикат выводится, только если \`false\` однозначно означает «не тот тип». А \`!!x\` вернёт \`false\` и для числа \`0\`, так что «вернула \`false\`» не значит «это \`undefined\`». Компилятор отказывается выводить неверный предикат — и правильно.

### Сужение в колбэках и после \`await\` — реальный Angular-случай

Здесь компилятор ведёт себя по-разному, и это любимая тема на собеседованиях:

\`\`\`ts
class ProfileComponent {
  user: User | null = null;

  async save() {
    if (!this.user) return;
    await this.api.save();
    this.user.name;            // ошибки НЕТ — сужение пережило await
  }

  later() {
    if (!this.user) return;
    setTimeout(() => {
      this.user.name;          // error TS2531: Object is possibly 'null'.
    });
  }
}
\`\`\`

- **После \`await\` и после обычных вызовов функций** компилятор сужение сохраняет. Это сознательный компромисс ради удобства, но он нечестный: пока шёл \`await\`, другой код мог обнулить \`this.user\`. Проверено в Node: если во время ожидания присвоить \`null\`, получим \`TypeError: Cannot read properties of null (reading 'name')\`, хотя компилятор молчал.
- **Внутри колбэка** сужение изменяемой ссылки теряется: функцию вызовут позже, и компилятор не может доказать, что \`this.user\` к тому моменту не изменился.
- **\`const\` и параметры** сужение в колбэки переносят — их нельзя переприсвоить (параметр можно, но если этого нигде нет, компилятор это видит).
- **\`let\`** с TS 5.4 тоже переносит сужение в колбэк, если после создания колбэка переменную больше не переприсваивают. Есть присваивание ниже — сужение теряется.

Лечение для обоих случаев одно — скопировать значение в локальную константу и работать с ней:

\`\`\`ts
later() {
  const user = this.user;
  if (!user) return;
  setTimeout(() => console.log(user.name)); // user: User
}
\`\`\`

То же с сигналами: \`if (this.user()) this.user().name\` даёт \`Object is possibly 'null'\`, потому что вызов функции — не ссылка, и каждый вызов может вернуть новое значение. Правильно: \`const user = this.user(); if (user) { ... }\`, а в шаблоне — \`@if (user(); as u) { ... }\`.

### Где это применяется на практике

- **HTTP-слой и обработка ошибок**: \`catchError(e => e instanceof HttpErrorResponse && e.status === 401 ? ... : ...)\`, разбор \`unknown\` в \`catch\`.
- **Состояние загрузки в компонентах и NgRx**: \`{ status: 'loading' } | { status: 'success'; data } | { status: 'error'; message }\` — проверка \`status\` открывает доступ к нужным полям без \`?.\` и \`!\`.
- **Валидация внешних данных**: ответы API, \`localStorage\`, \`postMessage\`, WebSocket-сообщения приходят как \`unknown\`, и type guards превращают их в типизированные объекты на границе системы.
- **Фильтрация коллекций в гридах и списках**: \`rows.filter(isEditable)\` возвращает массив уже нужного типа.
- **Инварианты в сервисах**: \`assert(this.config, 'Config is not loaded')\` в начале метода вместо россыпи \`!\`.
- **Шаблоны Angular**: \`@if (order(); as o)\` и \`@switch (state().status)\` используют ту же идею — сначала проверка, потом безопасный доступ.

## Важные нюансы и подводные камни

- **Сужение после \`await\` сохраняется, а не теряется.** Частое заблуждение. Компилятор оставляет сужение и после \`await\`, и после любых вызовов — это удобно, но не гарантирует безопасность в рантайме. Если значение могут поменять параллельно, копируйте его в \`const\` перед \`await\`.
- **В колбэках сужение теряется только для изменяемых ссылок.** Свойства (\`this.user\`) и \`let\`, переприсваиваемые после создания колбэка, — теряют; \`const\`, параметры без переприсваиваний и \`let\` без последующих присваиваний (TS 5.4+) — сохраняют.
- **\`const\` не теряет сужение при присваивании, потому что его нельзя переприсвоить.** Для \`let\`/\`var\` каждое присваивание задаёт новый текущий тип.
- **Вызов функции — не ссылка.** \`this.user()\` или геттер-метод после проверки снова имеет полный тип. Сохраняйте результат в переменную.
- **Проверка на truthy съедает \`0\` и \`''\`.** Для чисел и строк используйте \`== null\` или \`=== undefined\`.
- **\`typeof null === 'object'\`.** Проверка на объект без \`!== null\` оставляет \`null\` в типе.
- **\`in\` и необязательные свойства.** \`'prop' in obj\` сужает, но если свойство объявлено необязательным, тип остаётся и в ветке «нет», а значение в ветке «да» всё ещё может быть \`undefined\`.
- **Предикат можно написать неверно, и компилятор промолчит.** Type guard — это обещание, а не проверка. Покрывайте такие функции юнит-тестами и держите их рядом с типом, который они проверяют.
- **Assertion-функции требуют явной аннотации.** Стрелка без аннотации в \`const\` даёт TS2775.
- **Вывод предикатов (TS 5.5) — только для простых случаев**: функция без явного типа возврата, один \`return\` с булевым выражением и условие «если и только если». \`x => !!x\` для чисел не подходит из-за \`0\`.
- **Сужение не меняет объявленный тип.** Нельзя «расширить» переменную проверкой: если объявлено \`x: string\`, проверка \`typeof x === 'number'\` даст в ветке \`never\`.

**Плюсы:** точные типы без приведений \`as\`, защита от \`null\` и \`undefined\`, код остаётся обычным JavaScript, а type guards и assertion-функции переиспользуются по всему проекту.
**Минусы:** пользовательские предикаты не проверяются компилятором, поведение в колбэках и после \`await\` неочевидно (и после \`await\` нечестно), вызовы функций и сигналов не сужаются без промежуточной переменной.

## Как это спрашивают на собеседовании

**Главный вывод:** компилятор проходит по веткам кода и уточняет тип ссылки после каждой проверки (\`typeof\`, \`instanceof\`, \`in\`, сравнение, truthy, присваивание). Свои проверки оформляют функциями \`x is T\` и \`asserts x is T\`, но их корректность — на разработчике.

Типичные формулировки: «Как TypeScript понимает, что внутри \`if\` переменная уже строка?», «Что такое type guard и как написать свой?», «Что такое control-flow analysis?», «Почему внутри \`setTimeout\` снова ошибка про \`null\`?».

Что могут спросить следом:

- *Чем \`x is T\` отличается от \`asserts x is T\`?* — Первый возвращает \`boolean\` и сужает внутри \`if\`; второй бросает исключение и сужает весь код после вызова.
- *Проверяет ли компилятор тело type guard?* — Нет, он верит предикату на слово; проверяется только совместимость \`T\` с типом параметра.
- *Теряется ли сужение после \`await\`?* — Нет, компилятор его сохраняет, хотя в рантайме значение могло измениться; теряется оно в колбэках для изменяемых ссылок.
- *Почему \`if (this.user()) this.user().name\` не компилируется?* — Вызов функции не сужается: каждый вызов может вернуть новое значение; сохраните результат в \`const\`.
- *Что изменилось в TS 5.5?* — Компилятор сам выводит предикаты для простых стрелок, поэтому \`arr.filter(x => x != null)\` убирает \`null\` из типа.

### Ответ на 1 минуту

> Сужение — это когда TypeScript уточняет тип переменной после проверки. Работает это через анализ потока управления: компилятор строит граф веток кода, на каждую ветку вешает факт из проверки — \`typeof\`, \`instanceof\`, \`in\`, сравнение с литералом, проверку на \`null\` или присваивание — и в точке использования применяет все пройденные факты к объявленному типу. Отсюда ранний \`return\`, discriminated unions и \`never\` в конце исчерпывающего \`switch\`. Если встроенных проверок не хватает, я пишу свой type guard с типом возврата \`x is T\` или assertion-функцию \`asserts x is T\`, но компилятор верит им на слово, поэтому их покрывают тестами. Из нюансов: внутри колбэков сужение \`this.user\` теряется, а после \`await\` сохраняется, хотя значение могло измениться, и вызов сигнала не сужается — поэтому я копирую значение в локальную константу. А с TS 5.5 \`filter(x => x != null)\` наконец убирает \`null\` из типа сам.`,
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
      ru: `## В чём суть

Discriminated union (размеченное объединение) — это union объектов, у которых есть одно общее поле-метка (\`kind\`, \`type\`, \`status\`) с литеральным значением. Проверили метку — и компилятор сам понял, с каким именно вариантом вы работаете и какие поля у него есть. А проверка полноты (exhaustiveness) — это приём, при котором забытый вариант превращается в ошибку компиляции, а не в тихий \`undefined\` в проде.

Аналогия: посылки на складе. На каждой наклейка — «хрупкое», «продукты», «документы». Прочитали наклейку — знаете, что внутри и как с этим обращаться. Проверка полноты — это кладовщик, который в конце смены пересчитывает: «для каждой наклейки есть своя полка?». Появилась новая наклейка «опасный груз», а полки для неё нет — смену закрыть нельзя.

**Какую проблему решает.** Без размеченных объединений состояние описывают набором необязательных полей: \`{ loading?: boolean; data?: User[]; error?: string }\`. Такой тип разрешает бессмыслицу — «загружается, данные есть и ошибка тоже есть», — и в каждом месте приходится гадать, какие поля заполнены, и ставить \`?.\` и \`!\`. Discriminated union делает невалидные состояния невыразимыми, а проверка полноты гарантирует: когда через полгода в union добавят новый вариант, компилятор покажет все места, где его забыли обработать.

## Словарик терминов

- **Объединение (union type, \`A | B\`)** — тип «одно из»: значение принадлежит ровно одному из перечисленных вариантов.
- **Литеральный тип (literal type)** — тип из одного конкретного значения: \`'success'\`, \`42\`, \`true\`. В отличие от \`string\`, он допускает только это значение.
- **Дискриминант (discriminant, tag)** — общее для всех вариантов поле с литеральным типом, по которому их различают: \`status: 'idle' | 'loading' | ...\`.
- **Discriminated union (tagged union, размеченное объединение)** — union объектов с общим дискриминантом.
- **Сужение (narrowing)** — уточнение типа после проверки: внутри \`case 'success'\` переменная имеет тип только успешного варианта.
- **Проверка полноты (exhaustiveness checking)** — гарантия на этапе компиляции, что обработаны все варианты union.
- **\`never\`** — пустой тип без единого значения. В него можно присвоить только другой \`never\`. Остаётся, когда проверки исключили все варианты.
- **\`assertNever\`** — вспомогательная функция с параметром типа \`never\`, которая бросает исключение; классический способ проверить полноту.
- **\`satisfies\`** — оператор TS 4.9+: проверяет, что выражение подходит под тип, не меняя выведенный тип.
- **\`as const\`** — пометка для литерала: «не расширяй типы», \`'clear'\` остаётся \`'clear'\`, а не \`string\`.
- **\`Extract\` / \`Omit\`** — встроенные утилиты типов: \`Extract<U, X>\` оставляет членов union, совместимых с \`X\`; \`Omit<T, K>\` убирает ключи \`K\` из типа.
- **\`noImplicitReturns\`** — флаг компилятора: ошибка, если не все пути функции возвращают значение. В Angular CLI-проектах включён по умолчанию.

## Как это работает под капотом

Никакой рантайм-магии нет: в JavaScript это обычные объекты с полем \`status\`. Вся работа — в анализе потока управления компилятора:

1. Компилятор видит проверку \`s.status === 'success'\` (или \`case 'success':\`) и замечает, что \`s\` — union, а \`status\` в каждом члене имеет литеральный тип. Значит, это дискриминант.
2. На ветке «да» он оставляет только тех членов union, у которых \`status\` может равняться \`'success'\`. Поэтому внутри ветки доступен \`s.data\`, хотя у других вариантов его нет.
3. На ветке «нет» он, наоборот, вычитает этих членов. После \`case 'idle': return ...\` в оставшемся коде \`'idle'\` уже невозможен.
4. Вариант за вариантом union «тает». Когда обработаны все, остаётся \`never\` — пустой тип.
5. Поэтому в \`default\` при полной обработке приходит \`never\`, и присваивание \`const x: never = s\` законно.
6. Если вариант забыт, в \`default\` приходит реальный объект этого варианта. Присвоить его в \`never\` нельзя — ошибка компиляции, причём в тексте ошибки прямо написан забытый вариант.

По сути сужение по дискриминанту делает то же, что утилита \`Extract\`:

\`\`\`ts
type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

type Success = Extract<Remote<number>, { status: 'success' }>;
// { status: 'success'; data: number }

type Status = Remote<number>['status'];
// 'idle' | 'loading' | 'success' | 'error'
\`\`\`

### Пример 1. Базовый discriminated union

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rect'; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2; // s: { kind: 'circle'; radius: number }
    case 'square': return s.side ** 2;             // s: { kind: 'square'; side: number }
    case 'rect':   return s.w * s.h;
  }
}

area({ kind: 'square', side: 3 }); // 9
\`\`\`

Никаких \`as\` и проверок на \`undefined\`: компилятор знает, какие поля есть в каждой ветке. А обращение к \`s.radius\` в ветке \`'square'\` — ошибка компиляции.

### Пример 2. Состояние загрузки и неявная проверка через тип возврата

Это пример из кода под ответом: функция \`render\` разбирает все четыре статуса и объявляет тип возврата \`string\`.

\`\`\`ts
function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', '); // s.data доступен
    case 'error':   return s.message;          // s.message доступен
  }
}
\`\`\`

Здесь уже есть скрытая проверка полноты. Компилятор понимает, что \`switch\` разобрал все варианты, и конец функции недостижим. Добавим в union \`{ status: 'stale'; data: T }\` и забудем новый \`case\`:

\`\`\`text
error TS2366: Function lacks ending return statement and return type
does not include 'undefined'.
\`\`\`

Работает, но с двумя оговорками. Ошибка указывает на тип возврата, а не на забытый вариант. И если тип возврата не указать явно, ошибки не будет вовсе: компилятор молча выведет \`string | undefined\`. Для \`void\`-функций (например, обработчиков) этот приём не работает совсем — отсюда явные приёмы ниже.

### Приём 1. Присваивание в \`never\` в ветке \`default\`

\`\`\`ts
function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', ');
    case 'error':   return s.message;
    default: {
      const _exhaustive: never = s;  // все варианты разобраны — здесь never
      return _exhaustive;
    }
  }
}
// После добавления { status: 'stale' } без case:
// error TS2322: Type '{ status: "stale"; data: string[]; }' is not assignable to type 'never'.
\`\`\`

Ошибка теперь стоит на строке \`default\` и называет забытый вариант. \`return _exhaustive\` нужен не для красоты: без \`return\` (или \`throw\`) компилятор считает, что из \`default\` можно «выпасть» в конец функции, и даже при полностью разобранном union выдаст лишнюю ошибку — TS2366 при явном типе возврата или TS7030 \`Not all code paths return a value\` при \`noImplicitReturns\`.

### Приём 2. Функция \`assertNever\`

\`\`\`ts
function assertNever(x: never): never {
  throw new Error('Unexpected variant: ' + JSON.stringify(x));
}

function render(s: Remote<string[]>): string {
  switch (s.status) {
    case 'idle':    return 'Press load';
    case 'loading': return 'Spinner...';
    case 'success': return s.data.join(', ');
    case 'error':   return s.message;
    default:        return assertNever(s);
  }
}
// Забыли вариант:
// error TS2345: Argument of type '{ status: "stale"; data: string[]; }'
// is not assignable to parameter of type 'never'.
\`\`\`

Плюс по сравнению с приёмом 1 — защита ещё и в рантайме. Типы обещают четыре статуса, но бэкенд может прислать пятый, о котором фронтенд ещё не знает. Тогда вместо тихого \`undefined\` вы получите понятное исключение \`Unexpected variant: {"status":"stale",...}\` в логах. Функцию пишут один раз в \`shared/utils\` и переиспользуют.

### Приём 3. \`satisfies never\` (TypeScript 4.9+)

Короткая форма без лишней переменной:

\`\`\`ts
default:
  throw new Error('Unknown status: ' + (s satisfies never));
// Забыли вариант:
// error TS1360: Type '{ status: "stale"; data: string[]; }' does not satisfy the expected type 'never'.
\`\`\`

Здесь \`throw\` выполняет ту же роль, что \`return\` в приёме 1: без него конец функции считается достижимым.

### Приём 4. Цепочка \`if/else if\`

Приём с \`never\` не привязан к \`switch\` — он работает в любой цепочке проверок:

\`\`\`ts
function area(s: Shape): number {
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
  else if (s.kind === 'square') return s.side ** 2;
  else if (s.kind === 'rect') return s.w * s.h;
  else return assertNever(s);   // s: never
}
\`\`\`

### Почему дискриминант обязан быть литералом и при чём тут \`as const\`

Сужение работает, только если поле-метка в каждом варианте имеет литеральный тип. С \`kind: string\` компилятор не знает, какие значения к какому варианту относятся:

\`\`\`ts
type Bad =
  | { kind: string; radius: number }
  | { kind: string; side: number };

function f(s: Bad) {
  if (s.kind === 'circle') s.radius;
  // error TS2339: Property 'radius' does not exist on type 'Bad'.
}
\`\`\`

Вторая ловушка — расширение литералов в переменных. Объект, сохранённый в переменную без аннотации, получает тип \`{ type: string }\`:

\`\`\`ts
type Action =
  | { type: 'add'; id: number }
  | { type: 'remove'; id: number }
  | { type: 'clear' };

declare function dispatch(a: Action): void;

const a1 = { type: 'clear' };
dispatch(a1);
// error TS2345: Argument of type '{ type: string; }' is not assignable to parameter of type 'Action'.

const a2 = { type: 'clear' } as const;  // { readonly type: 'clear' }
dispatch(a2);                           // ок
dispatch({ type: 'clear' });            // ок: литерал прямо в вызове проверяется по Action
\`\`\`

\`as const\` говорит компилятору «не расширяй»: строка остаётся литералом, а свойства становятся \`readonly\`. Альтернатива — аннотация \`const a1: Action = { type: 'clear' }\`.

### \`Omit\` и дистрибутивность

Встроенный \`Omit\` работает с union неправильно: он берёт только общие ключи всех вариантов и склеивает union в один объект.

\`\`\`ts
type Shape =
  | { kind: 'circle'; radius: number; id: string }
  | { kind: 'square'; side: number; id: string };

type NoId = Omit<Shape, 'id'>;
// { kind: 'circle' | 'square' } — radius и side пропали, union разрушен

type DistributiveOmit<T, K extends PropertyKey> =
  T extends unknown ? Omit<T, K> : never;

type NoId2 = DistributiveOmit<Shape, 'id'>;
// { kind: 'circle'; radius: number } | { kind: 'square'; side: number }
\`\`\`

Конструкция \`T extends unknown ? ... : never\` — условный тип, который применяется к каждому члену union по отдельности (дистрибутивность), поэтому разметка сохраняется. Это частая задача: «форма создания сущности — та же модель, но без \`id\`».

### Деструктуризация

С TypeScript 4.6 сужение работает и после деструктуризации — если поля разобраны в \`const\` или в параметры функции:

\`\`\`ts
type Ev = { type: 'num'; payload: number } | { type: 'str'; payload: string };

function handle({ type, payload }: Ev) {
  if (type === 'num') payload.toFixed(2);  // payload: number
}
\`\`\`

С \`let { type, payload } = e\` связь теряется: \`payload\` остаётся \`string | number\`.

### Реальный Angular-случай: состояние в сигнале и \`@switch\`

\`\`\`ts
type Remote<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-users',
  template: \`
    @let s = state();
    @switch (s.status) {
      @case ('loading') { <app-spinner /> }
      @case ('success') {
        @for (u of s.data; track u.id) { <p>{{ u.name }}</p> }
      }
      @case ('error') { <p class="error">{{ s.message }}</p> }
    }
  \`,
})
export class UsersComponent {
  private api = inject(UsersApi);
  state = signal<Remote<User[]>>({ status: 'idle' });

  load() {
    this.state.set({ status: 'loading' });
    this.api.getAll().subscribe({
      next: data => this.state.set({ status: 'success', data }),
      error: (e: HttpErrorResponse) => this.state.set({ status: 'error', message: e.message }),
    });
  }
}
\`\`\`

При \`strictTemplates\` Angular превращает \`@switch\` в настоящий TypeScript-\`switch\` внутри служебного кода проверки типов, поэтому внутри \`@case ('success')\` поле \`s.data\` доступно. Значение сигнала сначала сохраняют через \`@let\` (Angular 18.1+): вызов \`state()\` — это функция, а результат вызова компилятор не сужает. Учтите, что полноту \`@switch\` шаблонный компилятор Angular (проверено на 21.1) не проверяет: забытый \`@case\` просто ничего не отрисует. Поэтому логику, где важна полнота, держите в TypeScript — например, в \`computed\` с \`assertNever\`.

### Где это применяется на практике

- **Состояние загрузки данных**: \`idle / loading / success / error\` в компонентах, сигнальных сторах и сервисах вместо трёх независимых флагов.
- **Экшены Redux/NgRx**: поле \`type\` — дискриминант, редьюсер разбирает экшены по нему; в NgRx создатели экшенов генерируют литеральный \`type\` автоматически.
- **Результат операции**: \`{ ok: true; value: T } | { ok: false; error: string }\` — булев дискриминант тоже подходит.
- **Сообщения WebSocket и \`postMessage\`**: \`{ type: 'price'; ... } | { type: 'trade'; ... }\` — один обработчик со \`switch\`.
- **Конфигурация колонок грида**: \`{ type: 'text' } | { type: 'number'; precision: number } | { type: 'date'; format: string }\` — у каждого типа колонки свои обязательные настройки.
- **Динамические формы и визарды**: шаги или поля, у которых набор свойств зависит от вида.

## Важные нюансы и подводные камни

- **Дискриминант должен быть литеральным типом** (строка, число, \`true\`/\`false\`, \`null\`, \`undefined\`). С \`kind: string\` сужение не работает.
- **Объект в переменной теряет литералы.** \`const a = { type: 'clear' }\` даёт \`{ type: string }\`. Помогают \`as const\`, аннотация или передача литерала прямо в вызов.
- **\`Omit\` разрушает разметку** — union схлопывается в один объект с общими ключами. Нужен дистрибутивный вариант \`T extends unknown ? Omit<T, K> : never\`.
- **Из \`default\` нужно вернуть значение или бросить исключение**, иначе даже при полностью разобранном union компилятор выдаст лишнюю ошибку (TS2366 при явном типе возврата, TS7030 при \`noImplicitReturns\`).
- **Неявная проверка через тип возврата хрупкая.** Без явного \`: string\` функция молча вернёт \`string | undefined\`, а у \`void\`-функций такой проверки нет вовсе.
- **Типы не защищают от данных из сети.** Бэкенд может прислать неизвестный статус; \`assertNever\` с \`throw\` превращает это в понятную ошибку вместо тихого \`undefined\`.
- **Опциональные поля вместо union — антипаттерн.** \`{ loading?: boolean; data?: T; error?: E }\` допускает бессмысленные комбинации, и компилятор их не поймает.
- **Деструктуризация в \`let\` ломает связь** между дискриминантом и остальными полями; используйте \`const\` или параметры.
- **\`@switch\` в шаблоне Angular полноту не проверяет**, а сигнал перед \`@switch\` стоит сохранить через \`@let\`.

**Плюсы:** невалидные состояния невыразимы, точные поля в каждой ветке без \`?.\` и \`!\`, безопасный рефакторинг (добавили вариант — компилятор покажет все места), проще иерархии классов: данные остаются плоскими объектами, спокойно сериализуются в JSON и передаются по сети.
**Минусы:** больше объявлений типов, нужна дисциплина с \`default\` и \`assertNever\`, легко сломать разметку утилитами вроде \`Omit\` или расширением литералов, полноту в шаблонах Angular не проверить.

## Как это спрашивают на собеседовании

**Главный вывод:** discriminated union — union объектов с общим литеральным полем-меткой; проверка метки сужает тип до конкретного варианта. Полноту обеспечивают присваиванием в \`never\` (или \`assertNever\`) в \`default\`: забыли вариант — ошибка компиляции с его названием.

Типичные формулировки: «Что такое discriminated union?», «Как сделать так, чтобы при добавлении нового варианта код перестал компилироваться?», «Как типизировать состояние загрузки данных?», «Зачем нужен тип \`never\`?».

Что могут спросить следом:

- *Почему в \`default\` приходит \`never\`?* — Каждый \`case\` вычитает свой вариант из union; когда вычтены все, не остаётся ни одного значения.
- *Чем \`assertNever\` лучше простого присваивания в \`never\`?* — Он ещё и бросает исключение в рантайме, если бэкенд прислал неизвестный вариант.
- *Почему \`const a = { type: 'add' }\` не подходит под union экшенов?* — Литерал расширяется до \`string\`; нужен \`as const\` или аннотация.
- *Что не так с \`Omit\` для union?* — Он работает по общим ключам и склеивает варианты; нужен дистрибутивный условный тип.
- *Можно ли без \`switch\`?* — Да, тот же приём работает в цепочке \`if/else if\`.

### Ответ на 1 минуту

> Discriminated union — это объединение объектных типов с общим полем-меткой литерального типа, например \`status: 'loading' | 'success' | 'error'\`. Когда я проверяю метку в \`switch\` или \`if\`, анализ потока управления оставляет только подходящий вариант, поэтому внутри ветки сразу доступны его поля — \`data\` или \`message\` — без \`as\`, \`?.\` и \`!\`. Каждая обработанная ветка вычитает вариант из union, и когда разобраны все, остаётся \`never\`. На этом построена проверка полноты: в \`default\` я пишу \`assertNever(s)\` или присваиваю значение в переменную типа \`never\`. Добавили новый вариант и забыли его обработать — ошибка компиляции прямо с его названием, а \`assertNever\` ещё и бросит исключение, если бэкенд пришлёт неизвестный статус. Из ловушек: дискриминант должен быть литералом, объект в переменной без \`as const\` расширяется до \`string\`, а встроенный \`Omit\` склеивает union, поэтому нужен дистрибутивный вариант.`,
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
      ru: `## В чём суть

В TypeScript есть три способа связать значение с типом, и все три делают разное. Аннотация \`const x: T = {...}\` проверяет значение и **заменяет** его точный тип на \`T\`. Утверждение \`{...} as T\` почти ничего не проверяет и просто **навязывает** тип. А \`{...} satisfies T\` (TypeScript 4.9+) **проверяет и оставляет** точный выведенный тип. Формула: \`satisfies\` — это «проверь, но не порти мой тип».

Аналогия — техосмотр машины. Аннотация — это когда вашу конкретную машину перерегистрировали как «легковой автомобиль»: она прошла проверку, но в документах теперь только общая категория, марка и комплектация забыты. \`as\` — это купленная диагностическая карта без осмотра: бумага есть, а проверки не было. \`satisfies\` — честный техосмотр: машину проверили по всем требованиям, поставили штамп «соответствует», и она осталась именно вашей моделью со всеми особенностями.

**Какую проблему решает.** Для конфигов, словарей и справочников хочется двух вещей сразу: проверки формы (опечатка в ключе, недопустимое значение, пропущенное поле — ошибка компиляции) и точных типов (литеральные значения, точный список ключей для \`keyof typeof\` и автодополнения). До TypeScript 4.9 приходилось выбирать: аннотация давала проверку, но стирала детали, а без аннотации детали сохранялись, но проверки не было. \`satisfies\` даёт и то, и другое.

## Словарик терминов

- **Аннотация типа (type annotation, \`: T\`)** — явное указание типа переменной. Значение проверяется, а тип переменной становится ровно \`T\`.
- **Утверждение типа (type assertion, \`as T\`)** — «поверь мне, это \`T\`». Компилятор проверяет только грубую совместимость и меняет тип выражения на \`T\`.
- **\`satisfies T\`** — оператор проверки: выражение обязано подходить под \`T\`, но его тип остаётся выведенным.
- **Вывод типов (type inference)** — компилятор сам вычисляет тип по значению: \`const n = 5\` даёт тип \`5\`.
- **Литеральный тип (literal type)** — тип из одного значения: \`'red'\`, \`42\`, \`false\`.
- **Расширение (widening)** — когда компилятор превращает литерал в общий тип: \`{ c: 'red' }\` получает тип \`{ c: string }\`, потому что свойство можно изменить.
- **Контекстный тип (contextual type)** — тип, который «ожидается» в месте выражения. Он подсказывает выводу, нужно ли сохранять литералы и кортежи.
- **Проверка лишних свойств (excess property checking)** — ошибка, если в объектном литерале есть ключ, которого нет в целевом типе. Ловит опечатки.
- **Сравнимость (comparability)** — условие для \`as\`: один из типов должен подходить под другой хотя бы в одну сторону.
- **\`as const\` (const assertion)** — «зафиксируй всё»: литералы не расширяются, массивы становятся readonly-кортежами, свойства — \`readonly\`.
- **\`keyof typeof x\`** — тип-объединение ключей объекта \`x\`: для \`{ save, remove }\` это \`'save' | 'remove'\`.
- **\`Record<K, V>\`** — утилита «объект с ключами \`K\` и значениями \`V\`».
- **Шаблонный литеральный тип (template literal type)** — тип-шаблон строки, записывается в обратных кавычках с подстановкой \`\${string}\` внутри; в примере ниже он означает «любая строка, начинающаяся с \`pi pi-\`».

## Как это работает под капотом

Все три конструкции проверяются только на этапе компиляции и полностью стираются в JavaScript: \`satisfies\` и \`as\` не оставляют в рантайме ни байта. Разница — в том, какой тип компилятор запоминает:

1. Сначала компилятор выводит тип выражения. Если в этом месте есть ожидаемый (контекстный) тип, он его учитывает: если \`T\` ожидает литералы (\`'red' | 'green'\`), литерал \`'red'\` не расширяется до \`string\`; если ожидает кортеж — массив выводится кортежем.
2. Для аннотации \`: T\` он проверяет, что выведенный тип присваиваем \`T\` (плюс проверка лишних свойств у литерала), а затем **выбрасывает** выведенный тип: переменная навсегда имеет тип \`T\`.
3. Для \`as T\` он проверяет только сравнимость: подходит ли выражение под \`T\` **или** \`T\` под выражение. Лишние свойства не проверяются, а отсутствующие разрешены (ведь \`T\` «шире» неполного объекта). Тип выражения становится \`T\`.
4. Для \`satisfies T\` он делает ту же проверку, что и аннотация — присваиваемость и лишние свойства, — но **оставляет** выведенный тип. \`T\` служит только эталоном для проверки и подсказкой для вывода.
5. Поэтому после \`satisfies\` у каждого свойства свой точный тип, известен точный набор ключей, а ошибки формы ловятся так же строго, как с аннотацией.

Псевдокод того, что делает компилятор:

\`\`\`ts
// const x: T = expr
const inferred = infer(expr, /* контекст */ T);
check(isAssignable(inferred, T) && noExcessProps(expr, T));
typeOf(x) = T;               // точный тип забыт

// expr as T
check(isComparable(infer(expr), T)); // в любую сторону, без проверки лишних свойств
typeOf(expr) = T;

// expr satisfies T
const inferred = infer(expr, /* контекст */ T);
check(isAssignable(inferred, T) && noExcessProps(expr, T));
typeOf(expr) = inferred;     // точный тип сохранён
\`\`\`

### Пример 1. Аннотация \`: T\` — проверяет, но стирает детали

\`\`\`ts
type Color = 'red' | 'green' | 'blue';

const a: Record<string, Color> = { primary: 'red', accent: 'green' };
a.primary;    // тип Color, а не 'red'
a.whatever;   // ошибки нет, тип Color — ключ-то любой string!
\`\`\`

Компилятор проверил значения, но тип переменной стал \`Record<string, Color>\`. Он больше не помнит, какие ключи на самом деле есть, поэтому опечатка \`a.primry\` пройдёт молча.

### Пример 2. \`satisfies\` — проверяет и сохраняет

\`\`\`ts
const b = {
  primary: 'red',
  accent: 'green',
} satisfies Record<string, Color>;

b.primary;    // тип 'red' — литерал сохранён
b.whatever;   // error TS2339: Property 'whatever' does not exist
              // on type '{ primary: "red"; accent: "green"; }'.

const typo = { primary: 'rad' } satisfies Record<string, Color>;
// error TS2322: Type '"rad"' is not assignable to type 'Color'.
\`\`\`

Тип \`b\` — \`{ primary: "red"; accent: "green" }\`. Значения проверены по \`Color\`, а набор ключей и литералы остались. Без \`satisfies\` вообще (\`const plain = { primary: 'red' }\`) тип был бы \`{ primary: string }\` — расширение до \`string\`.

### Пример 3. Что ловит каждый способ

\`\`\`ts
interface Theme { primary: Color; accent: Color }

// Пропущенное поле
const t1: Theme = { primary: 'red' };              // ошибка TS2741: Property 'accent' is missing
const t2 = { primary: 'red' } satisfies Theme;     // ошибка TS1360: does not satisfy the expected type 'Theme'
const t3 = { primary: 'red' } as Theme;            // ОК — as пропускает!

// Лишнее поле (опечатка)
const t4: Theme = { primary: 'red', accent: 'green', extra: 1 };          // ошибка TS2353
const t5 = { primary: 'red', accent: 'green', extra: 1 } satisfies Theme; // ошибка TS2353
const t6 = { primary: 'red', accent: 'green', extra: 1 } as Theme;        // ОК — as пропускает!

// Совсем не то
const t7 = { primry: 'red' } as Theme;
// error TS2352: Conversion of type '{ primry: string; }' to type 'Theme' may be a mistake
// because neither type sufficiently overlaps with the other.
\`\`\`

Аннотация и \`satisfies\` проверяют одинаково строго. \`as\` ловит только явную несовместимость, когда ни один тип не подходит под другой; пропущенные и лишние поля он пропускает.

### Оператор \`as\` — утверждение, а не проверка

\`as\` нужен, когда вы действительно знаете больше компилятора и не можете это доказать:

\`\`\`ts
const input = event.target as HTMLInputElement;   // компилятор знает только EventTarget
const el = document.getElementById('grid') as HTMLDivElement;
const user = {} as User;                          // заглушка в тесте
\`\`\`

Для совсем несвязанных типов \`as\` потребует двойное приведение через \`unknown\`:

\`\`\`ts
const n1 = 'abc' as number;
// error TS2352: Conversion of type 'string' to type 'number' may be a mistake ...
// If this was intentional, convert the expression to 'unknown' first.
const n2 = 'abc' as unknown as number;            // компилируется — и врёт
\`\`\`

\`as unknown as T\` в бизнес-коде — сигнал, что что-то не так с типами. Каждый \`as\` — это место, где проверка выключена, и баг из него уходит в рантайм.

### Оператор \`as const\`

\`as const\` запрещает расширение: строки и числа остаются литералами, массивы становятся readonly-кортежами, свойства объектов — \`readonly\`.

\`\`\`ts
const mode = { theme: 'dark' };            // { theme: string }
const mode2 = { theme: 'dark' } as const;  // { readonly theme: 'dark' }
mode2.theme = 'light';
// error TS2540: Cannot assign to 'theme' because it is a read-only property.
\`\`\`

Сам по себе \`as const\` ничего не проверяет — он только сохраняет точность. Поэтому его и комбинируют с \`satisfies\`.

### Связка \`as const satisfies T\`

Самая сильная комбинация: \`as const\` фиксирует литералы, \`satisfies\` проверяет форму. Пример — описание колонок грида, из которого выводится тип полей:

\`\`\`ts
interface ColumnDef { field: string; header: string; width?: number }

const columns = [
  { field: 'name',  header: 'Имя', width: 200 },
  { field: 'email', header: 'Email' },
] as const satisfies readonly ColumnDef[];

type Field = (typeof columns)[number]['field'];   // 'name' | 'email'
\`\`\`

Опечатка в \`header\` или лишний ключ — ошибка компиляции, а \`Field\` можно использовать в типе строки грида или сортировки. \`readonly ColumnDef[]\` принимает и обычные, и readonly-массивы — самый безопасный эталон для связки с \`as const\`.

Порядок важен: \`as const\` пишется первым.

\`\`\`ts
const x = { mode: 'dark' } satisfies { mode: 'dark' | 'light' } as const;
// error TS1355: A 'const' assertions can only be applied to references to enum members,
// or string, number, boolean, array, or object literals.
\`\`\`

Причина: \`as const\` применим только к литералу, а \`expr satisfies T\` — уже не литерал.

### Контекстный тип: \`satisfies\` подсказывает выводу

Классический пример из релиза TypeScript 4.9 — палитра, где цвет задан либо строкой, либо кортежем RGB:

\`\`\`ts
type RGB = [red: number, green: number, blue: number];

const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | RGB>;

palette.green.toUpperCase();   // ок: green — string
palette.red.at(0);             // ок: red — [number, number, number]

const pal2: Record<string, string | RGB> = { red: [255, 0, 0], green: '#00ff00' };
pal2.green.toUpperCase();
// error TS2339: Property 'toUpperCase' does not exist on type 'string | RGB'.
\`\`\`

С аннотацией каждое свойство стало \`string | RGB\`, и перед использованием пришлось бы сужать. С \`satisfies\` компилятор помнит, что именно лежит в каждом ключе, а кортеж \`[255, 0, 0]\` вывелся кортежем, а не \`number[]\`, — потому что эталон ожидал кортеж.

### \`keyof typeof\` — точные ключи из проверенного объекта

\`\`\`ts
const icons = {
  save: 'pi pi-save',
  remove: 'pi pi-trash',
} satisfies Record<string, \`pi pi-\${string}\`>;

type IconName = keyof typeof icons;   // 'save' | 'remove'

const bad = { edit: 'fa-edit' } satisfies Record<string, \`pi pi-\${string}\`>;
// error TS2322: Type '"fa-edit"' is not assignable to type '\`pi pi-\${string}\`'.
\`\`\`

С аннотацией \`Record<string, ...>\` тип \`keyof typeof icons\` был бы просто \`string\`, и компонент \`<app-icon name="sav">\` с опечаткой не поймал бы ошибку.

### Подвох: \`satisfies\` не меняет тип переменной

Тип переменной после \`satisfies\` — выведенный, и иногда он слишком узкий для изменяемых данных:

\`\`\`ts
let cfg = { mode: 'dark' } satisfies { mode: 'dark' | 'light' };
cfg.mode = 'light';
// error TS2322: Type '"light"' is not assignable to type '"dark"'.

let cfg2: { mode: 'dark' | 'light' } = { mode: 'dark' };
cfg2.mode = 'light';   // ок
\`\`\`

Эталон ожидал литералы, поэтому \`'dark'\` сохранился как литерал — и стал единственным допустимым значением. Если объект будут менять или он описывает публичный контракт, нужна аннотация.

### До TypeScript 4.9: функция-хелпер

На старых проектах тот же эффект дают через дженерик-функцию: параметр \`U extends T\` проверяет форму, а возвращается сам \`U\`.

\`\`\`ts
const satisfiesOf = <T,>() => <U extends T>(value: U) => value;

const theme = satisfiesOf<Record<string, Color>>()({ primary: 'red' });
// тип: { primary: 'red' }
satisfiesOf<Record<string, Color>>()({ primary: 'rad' });
// error TS2322: Type '"rad"' is not assignable to type 'Color'.
\`\`\`

### Где это применяется на практике

- **Справочники статусов**: \`{ draft: 'Черновик', active: 'Активен', archived: 'В архиве' } satisfies Record<Status, string>\` — пропущенный статус и опечатка в ключе ловятся (на опечатку \`archve\` компилятор даже подскажет \`Did you mean to write 'archived'?\`).
- **Конфигурация колонок гридов и фильтров**: \`as const satisfies readonly ColumnDef[]\` — проверенная конфигурация плюс union полей для типизации строк и сортировки.
- **Карты иконок, цветов и токенов темы** — точные ключи для автодополнения в шаблонах и компонентах.
- **Словари переводов и сообщений об ошибках**: \`{ 404: '...', 500: '...' } satisfies Record<number, string>\` с точным набором кодов.
- **Маппинги экшенов, обработчиков событий и роутов**, где ключи потом становятся типами (\`keyof typeof handlers\`).
- **Где лучше аннотация**: файлы \`environment.ts\`. С \`satisfies Environment\` поле \`production: false\` получит тип \`false\`, а при прод-сборке файл подменяется вариантом с \`true\`. Здесь нужен общий контракт — \`export const environment: Environment = {...}\`.

## Важные нюансы и подводные камни

- **\`as\` — не проверка.** Он пропускает пропущенные и лишние поля и ловит только явную несовместимость. Для валидации формы используйте \`satisfies\` или аннотацию.
- **Порядок: \`as const satisfies T\`, а не наоборот.** Обратный порядок даёт TS1355, потому что \`as const\` применяется только к литералам.
- **\`satisfies\` не меняет тип переменной.** Если переменная должна иметь тип \`T\` (публичное API, изменяемое состояние, \`environment\`), нужна аннотация.
- **Выведенный тип может оказаться слишком узким.** Литерал, сохранённый благодаря эталону, становится единственным допустимым значением при последующих присваиваниях.
- **\`as const\` даёт \`readonly\`.** Попытка изменить объект или вызвать \`push\` — ошибка компиляции, и обычно это правильно; для изменяемой копии понадобится \`[...arr]\` или \`{ ...obj }\`.
- **Всё это только на этапе компиляции.** Ни \`satisfies\`, ни \`as const\` не замораживают объект в рантайме — для этого есть \`Object.freeze\`.
- **\`as unknown as T\`** — красный флаг на код-ревью: проверка типов отключена полностью.
- **Версия.** \`satisfies\` появился в TypeScript 4.9; на более старых проектах используйте функцию-хелпер с \`U extends T\`.

**Плюсы:** строгая проверка формы (пропуски, лишние ключи, недопустимые значения) без потери литералов, точных ключей и кортежей; работает с \`keyof typeof\` и автодополнением; не оставляет следа в рантайме.
**Минусы:** тип переменной не становится \`T\`, поэтому для контрактов и изменяемых данных нужна аннотация; выведенный тип бывает слишком узким; легко перепутать порядок с \`as const\`.

## Как это спрашивают на собеседовании

**Главный вывод:** аннотация проверяет и заменяет тип на \`T\`, \`as\` навязывает тип почти без проверки, \`satisfies\` проверяет так же строго, как аннотация, но оставляет точный выведенный тип. Идеально для конфигов и справочников, часто в связке \`as const satisfies T\`.

Типичные формулировки: «Что делает \`satisfies\`?», «Чем \`satisfies\` отличается от \`as\` и от аннотации?», «Как проверить объект-конфиг и не потерять литеральные типы?», «Когда \`as\` оправдан?».

Что могут спросить следом:

- *Какой тип у переменной после \`satisfies\`?* — Выведенный из значения, а не \`T\`; \`T\` используется только для проверки и как подсказка для вывода.
- *Ловит ли \`as\` лишние и пропущенные поля?* — Нет, только явную несовместимость, когда ни один тип не подходит под другой.
- *Почему \`as const satisfies T\`, а не наоборот?* — \`as const\` применим только к литералам, а выражение с \`satisfies\` литералом уже не является.
- *Когда всё-таки нужна аннотация?* — Когда переменная должна иметь именно тип \`T\`: публичный контракт, изменяемое состояние, \`environment\`.
- *Как было до 4.9?* — Через дженерик-функцию \`<U extends T>(value: U) => value\`.

### Ответ на 1 минуту

> \`satisfies\` появился в TypeScript 4.9 и решает конфликт между проверкой и точностью типов. Аннотация \`: T\` проверяет значение, но после этого тип переменной становится ровно \`T\`, и пропадают литералы и точный набор ключей. \`as T\` — это утверждение, а не проверка: он ловит только явную несовместимость и пропускает пропущенные и лишние поля. \`satisfies\` проверяет так же строго, как аннотация, включая лишние свойства, но оставляет выведенный тип, а \`T\` ещё и подсказывает выводу, где сохранить литералы и кортежи. Я использую его для справочников статусов, карт иконок и конфигурации колонок грида, часто как \`as const satisfies T\`: форма проверена, а из значения можно вывести union ключей через \`keyof typeof\`. Нюансы: \`as const\` пишется первым, а если переменная — публичный контракт или будет меняться, как \`environment\`, нужна обычная аннотация.`,
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
      ru: `## В чём суть

Declaration merging (слияние объявлений) — это когда два объявления с одинаковым именем TypeScript склеивает в одно. Объявили \`interface User\` дважды — компилятор не ругается, а складывает поля вместе. Module augmentation (дополнение модуля) — тот же механизм, применённый к чужому модулю: так добавляют поля в типы сторонней библиотеки или глобального окружения, не трогая их исходники.

Аналогия: личное дело сотрудника в отделе кадров. Разные отделы кладут в одну папку свои листы — анкету, приказ о зарплате, допуск к серверной, — и в итоге это одна папка. Если два отдела напишут разную дату рождения, будет скандал (ошибка компиляции). Module augmentation — это вкладыш в папку, которая хранится в чужом архиве: вы не переписываете оригинал, а подкладываете лист со ссылкой «к делу №…». Забыли указать номер дела — архив заведёт новую папку с тем же именем, и оригинал станет не найти.

**Какую проблему решает.** Типы браузера (\`lib.dom.d.ts\`) и сторонних библиотек закрыты для правки, а в рантайме к ним постоянно что-то добавляется: Google Tag Manager кладёт \`window.dataLayer\`, сборка вшивает версию приложения, вы регистрируете свой веб-компонент или кастомный матчер для тестов, middleware дописывает \`req.user\`. Без слияния пришлось бы везде писать \`(window as any).dataLayer\` и терять проверку типов. Слияние позволяет один раз описать дополнение — и дальше весь проект видит его как родную часть типа.

## Словарик терминов

- **Объявление (declaration)** — конструкция, которая вводит имя: \`interface\`, \`type\`, \`class\`, \`function\`, \`enum\`, \`namespace\`, \`const\`.
- **Слияние объявлений (declaration merging)** — объединение нескольких объявлений с одним именем в одну сущность.
- **Пространство имён (namespace)** — старый, ещё до ES-модулей, способ группировать код под одним именем: \`namespace api { export const base = '/v1'; }\`. Компилируется в обычный объект.
- **Модуль и скрипт** — файл с хотя бы одним \`import\` или \`export\` считается модулем, и его объявления локальны. Файл без них — скрипт, и всё, что объявлено на его верхнем уровне, становится глобальным.
- **Ambient-объявление (\`declare\`)** — описание того, что существует в рантайме, но написано не на TypeScript: «поверь, такая переменная или модуль есть». Кода не порождает.
- **Файл \`.d.ts\` (declaration file)** — файл только с типами, без реализации.
- **Module augmentation (\`declare module 'имя'\`)** — дополнение типов существующего модуля из файла-модуля.
- **Глобальная аугментация (\`declare global\`)** — дополнение глобальной области (\`Window\`, \`HTMLElementTagNameMap\`, \`NodeJS.ProcessEnv\`) из файла-модуля.
- **\`export {}\`** — пустой экспорт, который превращает файл-скрипт в модуль.
- **Перегрузка (overload)** — несколько сигнатур одной функции с разными параметрами.
- **\`HTMLElementTagNameMap\`** — встроенный интерфейс-словарь «имя тега → класс элемента», по которому \`document.querySelector('div')\` знает, что вернёт \`HTMLDivElement\`.

## Как это работает под капотом

1. Каждое объявление кладёт имя в одно или несколько «пространств»: значений (переменные, функции), типов (\`interface\`, \`type\`) и пространств имён. \`class\` и \`enum\` создают и значение, и тип; \`interface\` — только тип; \`namespace\` — пространство имён, а если внутри есть значения, ещё и объект в рантайме.
2. Встретив два объявления с одним именем в одной области видимости, компилятор сверяется с таблицей «кто с кем сливается». Если пару слить можно, он создаёт один общий символ со всеми объявлениями; если нельзя — ошибка \`Duplicate identifier\`.
3. При слиянии интерфейсов члены всех объявлений складываются. Обычное свойство может повторяться только с тем же типом. Методы с одинаковым именем превращаются в перегрузки, и сигнатуры из **более позднего** объявления идут в списке раньше (исключение — сигнатуры с параметром строкового литерального типа, они всплывают наверх).
4. При слиянии \`namespace\` с функцией, классом или enum экспортированные члены namespace становятся свойствами этой функции, класса или enum — и на уровне типов, и в рантайме.
5. \`declare module 'lib' { ... }\` компилятор трактует по-разному в зависимости от файла. В модуле это дополнение: он находит настоящий модуль \`lib\` и сливает объявления с ним. В скрипте это ambient-описание модуля «с нуля», и оно имеет приоритет над пакетом из \`node_modules\` — настоящие типы оказываются скрыты.
6. \`declare global { ... }\` разрешён только в модуле. В скрипте он не нужен: верхний уровень скрипта и так глобален.
7. Всё, кроме namespace со значениями, существует только на этапе компиляции. Объявили \`window.__APP_VERSION__\` — кто-то в рантайме обязан это свойство реально записать, иначе типы будут врать.

Вот как компилируется пример из кода под ответом — функция плюс namespace:

\`\`\`ts
function api(path: string) { return fetch(path); }
namespace api {
  export const base = '/v1';
  export interface Options { retries: number; }
}
\`\`\`

\`\`\`js
// Результат tsc (target es2022):
function api(path) { return fetch(path); }
(function (api) {
    api.base = '/v1';
})(api || (api = {}));
// интерфейс Options исчез полностью — это только тип
\`\`\`

Namespace превратился в функцию, которая дописывает свойство \`base\` в объект-функцию \`api\`. Поэтому работают и вызов \`api('/users')\`, и \`api.base\`, и тип \`api.Options\`.

### Пример 1. Слияние интерфейсов

\`\`\`ts
interface User { id: number; }
interface User { name: string; }

const u1: User = { id: 1, name: 'Ann' };  // ок
const u2: User = { id: 1 };
// error TS2741: Property 'name' is missing in type '{ id: number; }' but required in type 'User'.
\`\`\`

Итоговый \`User\` содержит оба поля. Конфликт типов одного свойства — ошибка:

\`\`\`ts
interface Conf { id: number }
interface Conf { id: string }
// error TS2717: Subsequent property declarations must have the same type.
// Property 'id' must be of type 'number', but here has type 'string'.
\`\`\`

### Пример 2. Порядок перегрузок при слиянии

\`\`\`ts
interface Store { get(x: number): 'early' }
interface Store { get(x: number | string): 'late' }

declare const store: Store;
store.get(1);   // тип 'late' — сигнатура из более позднего объявления проверяется первой

interface Factory { make(tag: 'div'): 'literal' }
interface Factory { make(tag: string): 'generic' }

declare const f: Factory;
f.make('div');   // тип 'literal' — сигнатура со строковым литералом всплыла наверх
\`\`\`

Так устроено специально: более поздние дополнения (например, ваши) должны иметь шанс «перехватить» вызов раньше общих сигнатур библиотеки.

### Пример 3. Что сливается, а что нет

\`\`\`ts
// type-алиасы НЕ сливаются
type Alias = { a: number };
type Alias = { b: number };
// error TS2300: Duplicate identifier 'Alias'.

// class + interface — сливаются: интерфейс добавляет поля к экземпляру
class Point { constructor(public x: number) {} }
interface Point { label?: string }
new Point(1).label;   // string | undefined

// enum + enum и enum + namespace — сливаются
enum Color { Red, Green }
enum Color { Blue = 2 }   // у второго объявления первый член обязан иметь значение
namespace Color {
  export function parse(s: string): Color { return Color.Red; }
}
Color.parse('red');   // «статический метод» у enum
\`\`\`

Полная картина: сливаются \`interface + interface\`, \`namespace + namespace\`, \`namespace\` с функцией, классом или enum, \`enum + enum\`, \`class + interface\`. Не сливаются \`type\`-алиасы, а также две функции-реализации или два класса. Невозможность слияния \`type\` — одно из ключевых практических отличий \`interface\` от \`type\`.

Порядок тоже важен: namespace, который сливается с функцией или классом, должен идти после них.

\`\`\`ts
namespace before { export const x = 1; }
function before() {}
// error TS2434: A namespace declaration cannot be located prior to a class or function with which it is merged.
\`\`\`

### Пример 4. Глобальная аугментация: \`Window\` и \`HTMLElementTagNameMap\`

\`\`\`ts
// src/types/global.d.ts — или любой файл-модуль
export {};

declare global {
  interface Window {
    __APP_VERSION__: string;
    dataLayer: unknown[];          // Google Tag Manager
  }
  interface HTMLElementTagNameMap {
    'price-ticker': PriceTicker;   // свой веб-компонент
  }
}

class PriceTicker extends HTMLElement { symbol = 'EUR'; }
customElements.define('price-ticker', PriceTicker);
\`\`\`

\`\`\`ts
window.dataLayer.push({ event: 'page_view' });   // типизировано, без as any
const el = document.querySelector('price-ticker'); // PriceTicker | null
document.createElement('price-ticker').symbol;      // поле класса PriceTicker
\`\`\`

Это слияние с интерфейсами из \`lib.dom.d.ts\`. Без \`export {}\` (или любого другого импорта/экспорта) файл — скрипт, и \`declare global\` в нём запрещён:

\`\`\`text
error TS2669: Augmentations for the global scope can only be directly nested
in external modules or ambient module declarations.
\`\`\`

В скрипте можно просто написать \`interface Window { ... }\` на верхнем уровне — он и так глобален. Но смешивать в одном файле импорты и глобальные типы тогда нельзя, поэтому обычно выбирают модуль плюс \`declare global\`.

### Пример 5. Module augmentation сторонней библиотеки

Классика из Node.js — добавить поле, которое дописывает middleware авторизации:

\`\`\`ts
// types/express.d.ts
import 'express';                 // файл — модуль, значит это дополнение, а не замена

declare module 'express' {
  interface Request {
    userId?: string;
  }
}
\`\`\`

Теперь в любом обработчике \`req.userId\` типизирован. \`export {}\` здесь не нужен: импорт уже сделал файл модулем.

Пример из Angular-проекта: в Angular 21 юнит-тесты через \`@angular/build:unit-test\` работают на Vitest, и свой матчер типизируется точно так же:

\`\`\`ts
// src/testing/matchers.d.ts
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidEmail(): T;
  }
}
\`\`\`

\`\`\`ts
const user = { email: 'ann@example.com' };
expect(user.email).toBeValidEmail();   // ок
expect(user.email).toBeValidEmal();
// error TS2551: Property 'toBeValidEmal' does not exist on type 'Assertion<string>'.
// Did you mean 'toBeValidEmail'?
\`\`\`

Сама реализация матчера регистрируется отдельно в рантайме через \`expect.extend(...)\` — аугментация описывает только типы.

### Что будет, если файл — скрипт

Самая дорогая ошибка в этой теме. Допустим, пакет \`fake-http\` экспортирует \`interface Request { url: string; method: string }\` и функцию \`createServer()\`. Пишем тот же \`declare module\`, но без единого \`import\`/\`export\`:

\`\`\`ts
// types/http.d.ts — НЕТ import и export
declare module 'fake-http' {
  interface Request { userId?: string }
}
\`\`\`

\`\`\`ts
import { Request, createServer } from 'fake-http';
// error TS2305: Module '"fake-http"' has no exported member 'createServer'.
declare const req: Request;
req.url;
// error TS2339: Property 'url' does not exist on type 'Request'.
\`\`\`

В скрипте \`declare module\` означает «вот полное описание модуля с нуля», и оно перекрывает настоящие типы пакета. От библиотеки остаётся только то, что вы написали во «вкладыше»: \`createServer\` и \`url\`, объявленные в самом пакете, пропали. Добавьте в первый файл \`import 'fake-http';\` — и обе ошибки исчезнут, а \`req.userId\` появится рядом с \`req.url\`.

### Ambient-модули: типы для пакетов без типов

Та же скриптовая форма полезна, когда типов у пакета нет вовсе или нужно описать импорт не-JS-файлов:

\`\`\`ts
// src/types/ambient.d.ts — скрипт, без import/export
declare module 'legacy-charts';     // сокращённая форма: всё, что импортировано, — any

declare module '*.svg' {            // шаблонное имя: любой импорт .svg
  const content: string;
  export default content;
}
\`\`\`

\`\`\`ts
import charts from 'legacy-charts';  // any
import logo from './logo.svg';       // string
\`\`\`

### \`namespace\` сегодня

В современном коде вместо \`namespace\` используют ES-модули, но знать слияние с ним нужно для чтения \`.d.ts\`-файлов библиотек (\`NodeJS.ProcessEnv\`, \`jasmine.Matchers\`, \`Express.Request\`) и старого кода. Свежий нюанс: TypeScript 5.8 добавил флаг \`erasableSyntaxOnly\` для запуска TS-кода с простым стиранием типов (например, в Node.js). С ним namespace со значениями запрещён, а namespace только с типами — разрешён:

\`\`\`ts
export namespace api { export const base = '/v1'; }
// error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
export namespace Types { export interface A { x: number } }   // ок — только типы
\`\`\`

### Где это применяется на практике

- **Глобальные переменные от внешних скриптов**: \`window.dataLayer\` (GTM), \`window.__APP_VERSION__\`, конфиг, который бэкенд вставляет в \`index.html\`. Вариант \`declare global { var __APP_VERSION__: string }\` типизирует сразу и \`globalThis.__APP_VERSION__\`, и \`window.__APP_VERSION__\` (именно \`var\`: объявленный так \`let\` свойством \`globalThis\` не становится).
- **Веб-компоненты и Angular Elements**: запись в \`HTMLElementTagNameMap\`, чтобы \`querySelector('my-widget')\` возвращал правильный класс.
- **Тесты**: типы для кастомных матчеров Vitest или Jasmine (\`declare global { namespace jasmine { interface Matchers<T> { ... } } }\`).
- **Переменные окружения**: \`NodeJS.ProcessEnv\` в SSR и скриптах сборки, \`ImportMetaEnv\` в Vite-окружениях.
- **Расширение библиотек**: поле \`userId\` в \`Request\` у Express, \`ComponentCustomProperties\` у Vue, плагины к библиотекам графиков и гридов, которые добавляют опции в чужие интерфейсы.
- **Типы для нетипизированных пакетов и ассетов**: \`declare module 'legacy-lib'\`, \`declare module '*.svg'\`.
- **Исторический пример из мира Angular**: в RxJS 5 импорт \`rxjs/add/operator/map\` патчил \`Observable.prototype\` и через module augmentation добавлял метод \`map\` в интерфейс \`Observable\` — отсюда старые цепочки \`.map().filter()\` без \`pipe\`.

## Важные нюансы и подводные камни

- **Файл с аугментацией обязан быть модулем.** Без \`import\`/\`export\` \`declare module 'lib'\` не дополняет, а заменяет типы библиотеки, а \`declare global\` даёт TS2669. Если в файле уже есть импорт, \`export {}\` не нужен.
- **Конфликтующие поля дают ошибку компиляции** (TS2717): нельзя объявить \`id: number\` в одном интерфейсе и \`id: string\` в другом. Это защита, а не ограничение.
- **Порядок перегрузок**: сигнатуры более позднего объявления идут раньше, сигнатуры со строковым литералом в параметре всплывают наверх.
- **\`type\` не сливается** — второй \`type User\` даёт \`Duplicate identifier\`. Поэтому типы, которые должны расширять другие (публичные контракты библиотек, глобальные словари), объявляют через \`interface\`.
- **Типы — не реализация.** Аугментация ничего не добавляет в рантайм. Если описали \`window.__APP_VERSION__\` или новый метод у \`Observable\`, кто-то должен действительно их создать.
- **Расширение глобальных типов действует на весь проект.** Добавили \`Window.foo\` — компилятор разрешит \`window.foo\` везде, даже там, где в рантайме его ещё нет. Делайте поля необязательными, если их наличие не гарантировано.
- **Файл с аугментацией должен попасть в компиляцию.** Если \`.d.ts\` не входит в \`include\`/\`files\` в \`tsconfig\` и нигде не импортирован, дополнение просто не применится.
- **Namespace с функцией или классом объявляется после них** (TS2434), а у второго \`enum\` с тем же именем первый член должен иметь явное значение (TS2432).
- **\`namespace\` в новом коде почти не нужен**, а под \`erasableSyntaxOnly\` namespace со значениями запрещён.

**Плюсы:** можно типобезопасно расширить чужие и глобальные типы без правки исходников и без \`as any\`; библиотеки могут проектировать расширяемые API через интерфейсы; один раз описанное дополнение видно во всём проекте.
**Минусы:** «невидимые» изменения типов далеко от места использования, глобальное действие на весь проект, коварная разница между модулем и скриптом, типы могут разойтись с реальным рантаймом.

## Как это спрашивают на собеседовании

**Главный вывод:** одноимённые \`interface\`, \`namespace\`, \`enum\` и пары вроде \`class + interface\` или \`function + namespace\` сливаются в одну сущность, а \`type\` — нет. Module augmentation — то же слияние с чужим модулем через \`declare module\` или \`declare global\`, и файл с ним обязан быть модулем.

Типичные формулировки: «Что такое declaration merging?», «Чем \`interface\` отличается от \`type\`?», «Как добавить поле в \`Window\` или в типы сторонней библиотеки?», «Зачем в \`.d.ts\`-файле пишут \`export {}\`?».

Что могут спросить следом:

- *Что сливается, а что нет?* — Сливаются интерфейсы, namespace (между собой и с функциями, классами, enum), enum, \`class + interface\`; \`type\`-алиасы дают \`Duplicate identifier\`.
- *Что будет без \`export {}\`?* — Файл станет скриптом: \`declare global\` выдаст TS2669, а \`declare module 'lib'\` заменит типы библиотеки вместо дополнения.
- *В каком порядке идут перегрузки при слиянии интерфейсов?* — Сигнатуры более позднего объявления раньше, а сигнатуры со строковым литералом всплывают наверх.
- *Появится ли что-то в рантайме?* — Нет, кроме namespace со значениями; аугментация описывает только типы.
- *Почему библиотеки описывают расширяемые вещи через \`interface\`?* — Чтобы пользователи могли дополнить их слиянием, как \`HTMLElementTagNameMap\` или \`Window\`.

### Ответ на 1 минуту

> Declaration merging — это когда TypeScript склеивает несколько объявлений с одним именем в одну сущность. Сливаются интерфейсы, namespace между собой и с функциями, классами и enum, а также класс с интерфейсом; поля складываются, конфликт типов одного поля — ошибка, а методы превращаются в перегрузки, где более позднее объявление идёт первым. \`type\`-алиасы не сливаются — это одно из главных отличий \`interface\` от \`type\`. Module augmentation — тот же механизм для чужого кода: через \`declare module 'lib'\` или \`declare global\` я добавляю поля в \`Window\`, в \`HTMLElementTagNameMap\` для веб-компонентов, в матчеры Vitest или в \`Request\` Express. Ключевой нюанс: файл должен быть модулем, иначе \`declare global\` не скомпилируется, а \`declare module\` вместо дополнения перекроет типы библиотеки целиком. И помнить, что это только типы: в рантайме свойство должен кто-то реально создать.`,
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
      ru: `## В чём суть

Декоратор — это функция, которую через \`@\` вешают на класс, метод, поле или аксессор, чтобы обернуть, заменить или пометить его. Он выполняется **один раз — при объявлении класса**, а не при каждом вызове метода. Проблема в том, что сейчас существуют две несовместимые версии декораторов: legacy (флаг \`experimentalDecorators\`, на нём живут Angular-проекты, NestJS, TypeORM) и стандарт TC39 Stage 3, который TypeScript поддерживает с версии 5.0 без всяких флагов. Различаются они прежде всего сигнатурой: что именно декоратор получает аргументами и что может вернуть.

Аналогия — две версии розетки. Идея одна: подключить прибор к электричеству. Но у старой розетки три контакта (\`target\`, \`key\`, \`descriptor\`), у новой — два (\`value\`, \`context\`). Вилка от одной в другую не влезет, а проводку в здании выбирают один раз на весь дом — это флаг в \`tsconfig\`. Повесить в одной комнате старые розетки, а в соседней новые нельзя.

**Какую проблему решает.** Многие задачи «размазаны» по коду: логирование, кеширование, debounce, проверка прав, регистрация в DI-контейнере, описание колонок ORM, метаданные фреймворка вроде \`@Component\`. Декоратор позволяет описать такую задачу один раз и подключать её одной строкой над нужным местом. А знать про две версии нужно потому, что TypeScript реализовал декораторы ещё в 2015 году по раннему черновику, а стандарт потом изменился до неузнаваемости. Код из статьи или библиотеки может просто не скомпилироваться в вашем проекте, если он написан под другую версию.

## Словарик терминов

- **Декоратор (decorator)** — функция, применяемая к классу или его члену через синтаксис \`@имя\`; может заменить метод, добавить логику или записать метаданные.
- **Фабрика декоратора (decorator factory)** — функция, которая принимает настройки и возвращает декоратор: \`@Debounce(300)\`, \`@Component({...})\`.
- **Legacy-декораторы (\`experimentalDecorators\`)** — старая реализация TypeScript по черновику 2015 года, включается флагом в \`tsconfig\`.
- **TC39, Stage 3** — TC39 — комитет, который развивает JavaScript; Stage 3 — стадия «дизайн готов, ждём реализаций в движках». Стандартные декораторы на этой стадии с 2022 года.
- **Дескриптор свойства (\`PropertyDescriptor\`)** — объект с настройками свойства: \`value\`, \`get\`, \`set\`, \`writable\`, \`enumerable\`, \`configurable\`. Legacy-декоратор метода меняет именно его.
- **Контекст декоратора (\`ClassMethodDecoratorContext\` и др.)** — второй аргумент стандартного декоратора: \`kind\`, \`name\`, \`static\`, \`private\`, \`access\`, \`addInitializer\`, \`metadata\`.
- **\`addInitializer\`** — метод контекста: регистрирует функцию, которая выполнится для каждого создаваемого экземпляра (или один раз для статических членов и класса).
- **\`emitDecoratorMetadata\` и \`reflect-metadata\`** — флаг, при котором TypeScript записывает в рантайм типы (\`design:type\`, \`design:paramtypes\`), и библиотека-полифилл \`Reflect.metadata\`, которая их хранит. Работает только с legacy-декораторами.
- **Decorator Metadata (\`Symbol.metadata\`)** — отдельное предложение TC39 для стандартных декораторов: общий объект \`context.metadata\`, куда декораторы складывают свои данные. Типы туда никто не пишет.
- **Auto-accessor (\`accessor\`)** — новое ключевое слово: \`accessor count = 0\` создаёт приватное хранилище плюс пару \`get\`/\`set\`, которую удобно декорировать.
- **DI (Dependency Injection, внедрение зависимостей)** — фреймворк сам создаёт объекты и передаёт им зависимости, ему нужно знать, что именно передать.
- **AOT-компилятор Angular (\`ngc\`, ngtsc)** — компилятор, который ещё на этапе сборки превращает декораторы \`@Component\`, \`@Injectable\` в статический код.

## Как это работает под капотом

Браузеры пока не обязаны понимать синтаксис \`@\`, поэтому TypeScript в обоих режимах компилирует декораторы во вспомогательные функции:

1. Сначала, при выполнении объявления класса, вычисляются выражения декораторов сверху вниз: \`@First() @Second()\` вызовет фабрики \`First\`, потом \`Second\`.
2. Затем декораторы применяются в обратном порядке — снизу вверх, ближайший к объявлению первым: сначала результат \`Second\`, потом \`First\`. Так в обоих режимах.
3. **Legacy-режим** генерирует вызов \`__decorate([...], Calc.prototype, 'add', ...)\`. Хелпер достаёт дескриптор метода из прототипа, передаёт декоратору тройку \`(target, key, descriptor)\` и, если тот вернул новый дескриптор, записывает его обратно через \`Object.defineProperty\`.
4. **Стандартный режим** генерирует \`__esDecorate(...)\`. Хелпер передаёт декоратору само значение (функцию метода, \`undefined\` для поля, сам класс) и объект-контекст. То, что декоратор вернул, **заменяет** исходное: новая функция вместо метода, функция-инициализатор для поля, новый класс вместо класса.
5. Функции из \`addInitializer\` и инициализаторы полей в стандартном режиме вызываются в конструкторе — для каждого нового экземпляра. Сам же декоратор, повторим, вызывается один раз.
6. Только legacy-режим умеет декораторы параметров конструктора и, с \`emitDecoratorMetadata\`, записывает типы параметров в рантайм. Стандарт этого не делает.

Упрощённо оба хелпера выглядят так:

\`\`\`ts
// legacy: работаем с дескриптором на прототипе
function __decorate(decorators, target, key) {
  let desc = Object.getOwnPropertyDescriptor(target, key);
  for (let i = decorators.length - 1; i >= 0; i--) {
    desc = decorators[i](target, key, desc) || desc;
  }
  Object.defineProperty(target, key, desc);
}

// стандарт (для метода): работаем с самим значением и контекстом
function applyMethodDecorators(proto, name, decorators) {
  let method = proto[name];
  const initializers = [];
  const context = { kind: 'method', name, static: false, private: false,
                    addInitializer: fn => initializers.push(fn) };
  for (let i = decorators.length - 1; i >= 0; i--) {
    method = decorators[i](method, context) ?? method;
  }
  proto[name] = method;
  return initializers;   // конструктор вызовет их для каждого экземпляра
}
\`\`\`

### Legacy-декораторы (\`experimentalDecorators\`)

Декоратор получает позиционные аргументы, и их набор зависит от того, к чему он применён: класс — \`(constructor)\`, метод и аксессор — \`(target, key, descriptor)\`, поле — \`(target, key)\`, параметр — \`(target, key, index)\`. Здесь \`target\` — прототип класса для обычных членов и сам конструктор для статических.

\`\`\`ts
function Log(target: any, key: string, desc: PropertyDescriptor) {
  console.log('decorating', key);
  const orig = desc.value;
  desc.value = function (this: any, ...a: any[]) {
    console.log('call', key, a);
    return orig.apply(this, a);
  };
}

class Calc {
  @Log
  add(a: number, b: number) { return a + b; }
}
console.log('--- class defined');
const c = new Calc();
console.log(c.add(1, 2));
// decorating add      ← один раз, при объявлении класса
// --- class defined
// call add [ 1, 2 ]
// 3
\`\`\`

Декоратор поля получает только прототип и имя — ни начального значения, ни дескриптора, — поэтому повлиять на значение конкретного экземпляра он не может.

Две возможности есть **только** здесь:

1. **Декораторы параметров** — \`constructor(@Inject(TOKEN) private url: string)\`.
2. **Эмиссия метаданных типов.** С флагом \`emitDecoratorMetadata\` компилятор записывает в рантайм типы параметров конструктора:

\`\`\`ts
@Injectable()
export class UsersApi {
  constructor(private users: UserService, private http: HttpClient) {}
}
\`\`\`

\`\`\`js
// фрагмент вывода tsc --experimentalDecorators --emitDecoratorMetadata
UsersApi = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService, HttpClient])
], UsersApi);
\`\`\`

Хелпер \`__metadata\` вызывает \`Reflect.metadata\`, только если она существует, — то есть если загружен полифилл \`reflect-metadata\`. На этом построен DI в NestJS, InversifyJS и сопоставление колонок в TypeORM: фреймворк читает \`design:paramtypes\` и понимает, какие сервисы передать в конструктор.

### Стандартные декораторы TC39 (TypeScript 5.0+)

Всего два аргумента: декорируемое значение и контекст. Виды (\`kind\`): \`class\`, \`method\`, \`getter\`, \`setter\`, \`field\`, \`accessor\`.

\`\`\`ts
function log<This, Args extends any[], R>(
  orig: (this: This, ...args: Args) => R,
  ctx: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>
) {
  console.log('decorating', ctx.kind, String(ctx.name));
  ctx.addInitializer(function () { console.log('initializer for instance'); });
  return function (this: This, ...args: Args): R {
    console.log('call', String(ctx.name), args);
    return orig.call(this, ...args);
  };
}

function double(_value: undefined, ctx: ClassFieldDecoratorContext) {
  return (initial: number) => initial * 2;   // инициализатор: выполнится для каждого экземпляра
}

class Calc {
  @double rate = 2;
  @log add(a: number, b: number) { return a + b; }
}
console.log('--- class defined');
const c = new Calc();
console.log('rate', c.rate);
console.log(c.add(1, 2));
// decorating method add
// --- class defined
// initializer for instance
// rate 4
// call add [ 1, 2 ]
// 3
\`\`\`

Метод декоратор не правит через дескриптор, а **возвращает** новую функцию. Поле получает \`undefined\`, но может вернуть инициализатор, который увидит начальное значение \`2\` и подменит его на \`4\` — у каждого экземпляра.

Auto-accessor удобен для реактивных полей: декоратор получает \`get\`/\`set\` хранилища и может их обернуть.

\`\`\`ts
function logged<This, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  ctx: ClassAccessorDecoratorContext<This, V>
): ClassAccessorDecoratorResult<This, V> {
  return {
    get() { return target.get.call(this); },
    set(v) { console.log(\`set \${String(ctx.name)} =\`, v); target.set.call(this, v); },
  };
}

class Counter { @logged accessor count = 0; }
const k = new Counter();
k.count = 5;               // set count = 5
console.log(k.count);      // 5
\`\`\`

Чего в стандарте нет:

\`\`\`ts
class Cmp {
  constructor(@Inject('TOKEN') private users: UserService) {}
  // без experimentalDecorators: error TS1206: Decorators are not valid here.
}
\`\`\`

А \`emitDecoratorMetadata\` без legacy-режима вообще не включить: \`error TS5052: Option 'emitDecoratorMetadata' cannot be specified without specifying option 'experimentalDecorators'\`.

Вместо метаданных типов есть Decorator Metadata (TypeScript 5.2+): общий объект \`context.metadata\`, который потом доступен как \`Класс[Symbol.metadata]\`. В Node 20 \`Symbol.metadata\` ещё нет, и без полифилла \`context.metadata\` будет \`undefined\`. А чтобы TypeScript знал о \`Symbol.metadata\`, в \`lib\` нужен \`esnext\` (или \`esnext.decorators\`):

\`\`\`ts
(Symbol as any).metadata ??= Symbol('Symbol.metadata');   // полифилл

function column(header: string) {
  return (_v: undefined, ctx: ClassFieldDecoratorContext) => {
    ((ctx.metadata as any).columns ??= []).push(\`\${String(ctx.name)}:\${header}\`);
  };
}
class Row {
  @column('Имя') name = '';
  @column('Email') email = '';
}
console.log((Row as any)[Symbol.metadata].columns);
// [ 'name:Имя', 'email:Email' ]
\`\`\`

Типы параметров туда никто не записывает — только то, что положили сами декораторы.

### Как Angular на самом деле использует декораторы

Частое заблуждение — «DI в Angular построен на \`emitDecoratorMetadata\`». В ранних версиях JIT-режим действительно читал типы через \`reflect-metadata\`, но сегодняшний AOT-компилятор Angular делает это сам, статически, из исходников. Вот что \`ngc\` из Angular 21.1 выдаёт для компонента:

\`\`\`ts
@Component({ selector: 'app-user', template: \`<p>{{ users.name }}</p>\` })
export class UserComponent {
  constructor(public users: UserService, @Inject(API_URL) private apiUrl: string) {}
}
\`\`\`

\`\`\`js
// фрагмент вывода ngc: никакого __decorate и design:paramtypes
export class UserComponent {
    static ɵfac = function UserComponent_Factory(__ngFactoryType__) {
        return new (__ngFactoryType__ || UserComponent)(
            i0.ɵɵdirectiveInject(UserService), i0.ɵɵdirectiveInject(API_URL));
    };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: UserComponent, ... });
}
\`\`\`

Декораторы Angular полностью «съедаются» компилятором и превращаются в статические поля \`ɵfac\` и \`ɵcmp\`; в рантайме они не выполняются. В \`tsconfig\` этого проекта на Angular 21 стоит \`experimentalDecorators: true\`, а \`emitDecoratorMetadata\` нет вовсе. Флаг нужен прежде всего ради декораторов параметров (\`@Inject\`, \`@Optional\`, \`@Self\`, \`@SkipSelf\`, \`@Host\`): в эксперименте с выключенным флагом \`ngc\` спокойно скомпилировал компонент на \`inject()\` и \`input()\`, а конструктор с \`@Inject(...)\` упал с TS1206. Отсюда и курс Angular на функции \`inject()\`, \`input()\`, \`output()\`, \`viewChild()\` — им декораторы не нужны.

### Свой декоратор в Angular-проекте

Ваши собственные декораторы Angular-компилятор не трогает — они компилируются TypeScript по флагу из \`tsconfig\`. В типичном Angular-проекте это legacy-режим, и декоратор в стандартной сигнатуре не скомпилируется (\`error TS1241: Unable to resolve signature of method decorator when called as an expression\`). Пример рабочего legacy-декоратора и классической ошибки в нём:

\`\`\`ts
function Debounce(ms: number) {
  return (target: object, key: string, desc: PropertyDescriptor) => {
    const orig = desc.value;
    let timer: ReturnType<typeof setTimeout> | undefined;   // ❌ один на ВСЕ экземпляры
    desc.value = function (this: unknown, ...args: unknown[]) {
      clearTimeout(timer);
      timer = setTimeout(() => orig.apply(this, args), ms);
    };
  };
}

class Search {
  constructor(private name: string) {}
  @Debounce(50)
  onSearch(term: string) { console.log(this.name, 'search:', term); }
}
new Search('A').onSearch('angular');
new Search('B').onSearch('rxjs');
// B search: rxjs        ← поиск в компоненте A молча потерян
\`\`\`

Декоратор выполнился один раз на класс, поэтому \`timer\` общий для всех экземпляров: два поля поиска на одной странице отменяют друг друга. Исправление — хранить состояние по экземпляру:

\`\`\`ts
function Debounce(ms: number) {
  return (target: object, key: string, desc: PropertyDescriptor) => {
    const orig = desc.value;
    // ✅ свой таймер у каждого экземпляра; WeakMap не мешает сборщику мусора
    const timers = new WeakMap<object, ReturnType<typeof setTimeout>>();
    desc.value = function (this: object, ...args: unknown[]) {
      clearTimeout(timers.get(this));
      timers.set(this, setTimeout(() => orig.apply(this, args), ms));
    };
  };
}
// A search: angular
// B search: rxjs
\`\`\`

### Как выбрать

- **Angular-приложение**: оставьте \`experimentalDecorators: true\`, как генерирует CLI; свои декораторы пишите в legacy-сигнатуре, а лучше заменяйте их функциями и операторами RxJS (\`debounceTime\` вместо \`@Debounce\`).
- **NestJS, TypeORM, InversifyJS, class-validator**: только legacy плюс \`emitDecoratorMetadata\` и \`reflect-metadata\` — без метаданных типов их DI и маппинг не работают.
- **Новая библиотека или проект без таких фреймворков**: стандартные декораторы — это будущий JavaScript, у них типобезопасный контекст, \`addInitializer\`, \`accessor\` и метаданные через \`Symbol.metadata\`.
- **Пакет, который должен работать в обоих мирах**: экспортируйте обычные функции-хелперы, а декораторы делайте тонкой обёрткой над ними — или две версии с определением режима по аргументам.
- **Миграция с legacy на стандарт**: сначала уберите декораторы параметров (\`inject()\` вместо \`@Inject\`) и зависимость от \`design:paramtypes\`, потом переписывайте сигнатуры.

### Где это применяется на практике

- **Метаданные фреймворков**: \`@Component\`, \`@Injectable\`, \`@Pipe\` в Angular (обрабатываются компилятором), \`@Controller\`, \`@Module\` в NestJS.
- **ORM и валидация**: \`@Entity\`, \`@Column\` в TypeORM, \`@IsEmail\` в class-validator — описание схемы прямо на полях класса.
- **Сквозная функциональность**: логирование вызовов, замеры времени, кеширование (\`@Memoize\`), проверка прав, повтор при ошибке.
- **Реактивные поля**: \`accessor\` плюс декоратор, который уведомляет об изменениях (Lit использует такой подход для своих свойств).
- **Тесты и инструменты**: пометка методов для автоматической регистрации, генерация документации по метаданным.

## Важные нюансы и подводные камни

- **Смешать две системы в одном проекте нельзя.** Флаг \`experimentalDecorators\` переключает семантику для всей компиляции (\`tsconfig\`). Миграция — это переписывание сигнатур всех декораторов.
- **Декоратор выполняется один раз при объявлении класса.** Состояние в его замыкании общее для всех экземпляров — типичный баг с \`@Debounce\` и \`@Throttle\`. Состояние экземпляра храните в \`WeakMap\` по \`this\` или в \`addInitializer\`.
- **Angular DI не опирается на \`emitDecoratorMetadata\`.** AOT-компилятор сам генерирует фабрики \`ɵfac\` с \`ɵɵdirectiveInject(...)\`; в Angular-проектах этого флага нет, и \`reflect-metadata\` не нужен.
- **\`reflect-metadata\` — не часть языка, а полифилл.** В NestJS, TypeORM, InversifyJS он должен загрузиться раньше объявления классов: иначе \`__metadata\` молча ничего не запишет, и DI упадёт позже с невнятной ошибкой.
- **Декораторы полей ведут себя по-разному.** Legacy получает только прототип и имя и не видит значения; стандартный получает \`undefined\` и может вернуть инициализатор, который отработает для каждого экземпляра. Код почти никогда не переносится копипастой.
- **В стандарте нет декораторов параметров** (TS1206) и метаданных типов (TS5052 при попытке включить \`emitDecoratorMetadata\`).
- **\`Symbol.metadata\` пока нужен полифилл** в средах, где его нет (например, Node 20), иначе \`context.metadata\` равен \`undefined\`.
- **Порядок**: выражения-фабрики вычисляются сверху вниз, а применяются декораторы снизу вверх — ближайший к объявлению первым.
- **Нативная поддержка в движках** зависит от браузера и его версии, поэтому на практике декораторы транспилируют TypeScript, Babel или esbuild.

**Плюсы:** декларативное описание сквозной функциональности одной строкой; стандартная версия типобезопасна, не требует флагов и станет частью JavaScript; legacy даёт декораторы параметров и метаданные типов, на которых построены зрелые фреймворки.
**Минусы:** две несовместимые системы и болезненная миграция; «магия», скрытая от читателя кода; общее состояние в замыкании декоратора; legacy зависит от полифилла \`reflect-metadata\`, а стандарт пока не умеет параметры и метаданные типов.

## Как это спрашивают на собеседовании

**Главный вывод:** legacy-декораторы (\`experimentalDecorators\`) получают \`(target, key, descriptor)\`, умеют декораторы параметров и с \`emitDecoratorMetadata\` пишут типы в рантайм — на этом стоят NestJS и TypeORM. Стандартные (TS 5.0+, без флага) получают \`(value, context)\` и возвращают замену, но без параметров и метаданных типов. Angular свои декораторы компилирует в статический код и \`emitDecoratorMetadata\` не использует.

Типичные формулировки: «Чем отличаются \`experimentalDecorators\` от новых декораторов?», «Как работает декоратор и когда он выполняется?», «На чём построен DI в Angular?», «Зачем нужен \`reflect-metadata\`?».

Что могут спросить следом:

- *Когда выполняется декоратор метода?* — Один раз при объявлении класса; на каждый вызов срабатывает только обёртка, которую он вернул.
- *Можно ли в Angular-проекте писать декораторы в стандартной сигнатуре?* — Нет, проект в legacy-режиме, будет TS1241; пишите legacy-сигнатуру или используйте функции.
- *Почему Angular уходит от \`@Input\` и конструкторной инъекции?* — Сигнальные \`input()\` и \`inject()\` не требуют декораторов параметров и лучше типизируются; это и шаг к независимости от legacy-флага.
- *Что такое \`addInitializer\`?* — Регистрация кода, который выполнится при создании каждого экземпляра; так стандартный декоратор, например, привязывает метод к \`this\`.
- *Что заменяет \`emitDecoratorMetadata\` в стандарте?* — Ничего напрямую; есть \`context.metadata\` и \`Symbol.metadata\`, но типы туда не попадают.

### Ответ на 1 минуту

> Декоратор — это функция, которая через \`@\` применяется к классу или его члену и выполняется один раз при объявлении класса. Сейчас есть две несовместимые системы. Legacy включается флагом \`experimentalDecorators\`: метод-декоратор получает \`target\`, имя и дескриптор, есть декораторы параметров, а с \`emitDecoratorMetadata\` компилятор пишет типы параметров конструктора в \`design:paramtypes\` — на этом вместе с \`reflect-metadata\` держится DI в NestJS и TypeORM. Стандарт TC39 работает с TypeScript 5.0 без флага: декоратор получает значение и контекст с \`kind\`, \`name\` и \`addInitializer\` и возвращает замену; параметров и метаданных типов там нет. Смешать их нельзя — флаг переключает весь проект. Важный нюанс про Angular: его AOT-компилятор превращает \`@Component\` и конструкторную инъекцию в статические фабрики, поэтому \`emitDecoratorMetadata\` ему не нужен, а флаг остаётся ради \`@Inject\` в параметрах — отсюда и курс на \`inject()\` и \`input()\`.`,
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
      ru: `## В чём суть

Когда TypeScript выводит параметр типа дженерик-функции, он **расширяет** литералы внутри массивов и объектов: передали \`['a', 'b']\` — получили \`T = string[]\`, а не \`['a', 'b']\`. Раньше это лечили только на стороне вызова — \`f(['a', 'b'] as const)\`. \`const\`-параметр типа (TypeScript 5.0) переносит эту заботу в объявление функции: пишете \`<const T>\`, и компилятор выводит \`T\` так, будто аргумент помечен \`as const\`.

Аналогия — заказ в кофейне. Вы говорите «капучино на овсяном без сахара», а бариста пишет на стакане просто «кофе» — это расширение: конкретика потеряна. Старое решение — \`as const\`: каждый клиент должен сам дописывать «записать дословно!». \`const\`-параметр — это правило в бланке заказа самой кофейни: «записывать дословно всегда». Клиентам не нужно ни о чём помнить.

**Какую проблему решает.** Многие API выводят типы из того, что им передали: список колонок грида превращается в union полей, список query-параметров — в объект с точными ключами, конфиг роутов — в типы параметров. Если литералы расширились до \`string\`, вся эта типизация тихо деградирует: опечатка в имени поля перестаёт быть ошибкой. Требовать от каждого пользователя \`as const\` ненадёжно — кто-то забудет, и компилятор ничего не скажет. \`<const T>\` даёт точные типы по умолчанию, с обычным литералом в вызове.

## Словарик терминов

- **Дженерик, параметр типа (generic, type parameter)** — «переменная для типа» в объявлении: в \`function id<T>(x: T): T\` это \`T\`.
- **Вывод аргументов типа (type argument inference)** — компилятор сам подбирает \`T\` по переданным аргументам, если вы не написали \`id<string>(...)\` явно.
- **Литеральный тип (literal type)** — тип из одного значения: \`'a'\`, \`1\`, \`true\`.
- **Расширение (widening)** — замена литерального типа общим: \`'a'\` → \`string\`, \`1\` → \`number\`, массив литералов → \`string[]\`.
- **Кортеж (tuple)** — массив фиксированной длины с типом на каждой позиции: \`['a', 'b']\` или \`[string, number]\`.
- **\`readonly\`** — модификатор «только для чтения» на уровне типов: нельзя присвоить свойство или вызвать \`push\`. В рантайме ничего не замораживается.
- **\`as const\` (const assertion)** — пометка выражения: «не расширяй ничего», литералы остаются литералами, массивы — readonly-кортежами, свойства — \`readonly\`.
- **\`const\`-параметр типа (\`<const T>\`)** — модификатор параметра типа (TS 5.0+): выводить \`T\` так, будто аргумент помечен \`as const\`.
- **Ограничение (constraint, \`T extends X\`)** — требование к параметру типа: \`T\` обязан подходить под \`X\`.
- **Контекстный тип (contextual type)** — тип, который ожидается в месте выражения, например из аннотации переменной; он тоже влияет на вывод.
- **Индексный доступ \`T[number]\`** — тип элемента массива или union элементов кортежа: для \`readonly ['a', 'b']\` это \`'a' | 'b'\`.
- **Mapped type (\`{ [P in K]: V }\`)** — тип-объект, построенный перебором ключей из union \`K\`.

## Как это работает под капотом

1. Вы вызываете \`f(arg)\` без явных аргументов типа. Компилятор смотрит на тип аргумента и собирает из него «кандидата» для \`T\`.
2. У литерала \`['a', 'b']\` поначалу есть точный тип, но перед тем как зафиксировать \`T\`, компилятор его **расширяет**: элементы становятся \`string\`, массив остаётся массивом, а не кортежем. Логика простая: массив и объект можно изменить, и было бы странно запретить \`push('c')\` в массив, который пользователь считает обычным списком.
3. Есть исключения и без \`const\`: примитив на верхнем уровне (\`id('a')\` даёт \`'a'\`) и ограничение, содержащее примитивы (\`T extends string\` сохраняет литералы).
4. С модификатором \`const\` компилятор обрабатывает каждый массив, объект и примитив, **написанный прямо в вызове**, как \`as const\`: литералы не расширяются, массивы становятся readonly-кортежами, свойства — \`readonly\`, и так рекурсивно на всю глубину.
5. Ограничение влияет на результат. С \`T extends readonly string[]\` получается \`readonly ['a', 'b']\`. С изменяемым \`T extends string[]\` в TypeScript 5.0 вывод откатывался к \`string[]\`; в текущем 5.9 получается изменяемый кортеж \`['a', 'b']\`.
6. Если аргумент типа указан явно (\`f<string[]>(...)\`), вывода нет вообще — и \`const\` ни на что не влияет.
7. Значение, сохранённое в переменную заранее, уже имеет свой (расширенный) тип — \`const\` до него «не дотягивается».
8. Всё это только типы: JavaScript на выходе идентичен, ничего не замораживается.

Псевдокод вывода:

\`\`\`ts
// псевдокод: как выбирается T для вызова f(arg)
let candidate = literalTypeOf(arg);              // ['a', 'b'] → массив из 'a' | 'b'
if (T.isConst && isWrittenInCall(arg)) {
  candidate = asConst(candidate);                // readonly ['a', 'b']
} else if (!constraintKeepsLiterals(T)) {
  candidate = widen(candidate);                  // string[]
}
T = candidate;
\`\`\`

### Пример 1. Проблема: расширение при выводе

\`\`\`ts
function id<T>(x: T): T { return x; }

const r1 = id(['a', 'b']);         // string[]
const r2 = id({ k: 'a', n: 1 });   // { k: string; n: number }
const r3 = id('a');                // 'a' — примитив на верхнем уровне не расширяется
let r4 = id('a');                  // string — расширение случилось уже при объявлении let
\`\`\`

Чаще всего «съедаются» именно литералы внутри массивов и объектов, а это как раз то, из чего строят конфиги.

### Пример 2. Старое решение — \`as const\` на стороне вызова

\`\`\`ts
const r5 = id(['a', 'b'] as const);   // readonly ['a', 'b']
\`\`\`

Работает, но про \`as const\` должен помнить каждый, кто вызывает функцию. Забыл — получил \`string[]\` без всякого предупреждения.

### Пример 3. \`<const T>\` — то же самое, но в объявлении

\`\`\`ts
function asTuple<const T>(x: T): T { return x; }

const a1 = asTuple(['a', 'b']);
// readonly ['a', 'b']
const a2 = asTuple({ k: 1 });
// { readonly k: 1 }
const a3 = asTuple({ user: { roles: ['admin', 'editor'] } });
// { readonly user: { readonly roles: readonly ['admin', 'editor'] } }
\`\`\`

Пользователь пишет обычный литерал, а получает точный тип на всю глубину вложенности — ровно как с \`as const\`.

Классический пример из релиза TypeScript 5.0:

\`\`\`ts
type HasNames = { names: readonly string[] };

function getNamesExactly<const T extends HasNames>(arg: T): T['names'] {
  return arg.names;
}
const names = getNamesExactly({ names: ['Alice', 'Bob', 'Eve'] });
// readonly ['Alice', 'Bob', 'Eve']
// без const было бы string[]
\`\`\`

### Ограничение и \`readonly\`

\`const\` удобнее всего сочетать с readonly-ограничением:

\`\`\`ts
function good<const T extends readonly string[]>(x: T): T { return x; }
good(['a', 'b']);   // readonly ['a', 'b']

function mutable<const T extends string[]>(x: T): T { return x; }
mutable(['a', 'b']); // TS 5.9: ['a', 'b'] — изменяемый кортеж
                     // TS 5.0: откатывался к string[]
\`\`\`

\`readonly string[]\` принимает и обычные, и readonly-массивы, поэтому такое ограничение не мешает ни одному вызову и даёт одинаковый результат на всех версиях.

То же с объектами — без \`const\` значения расширяются даже при ограничении:

\`\`\`ts
function routes<T extends Record<string, string>>(r: T) { return r; }
routes({ home: '/', users: '/users' });
// { home: string; users: string }

function routesC<const T extends Record<string, string>>(r: T) { return r; }
routesC({ home: '/', users: '/users' });
// { readonly home: '/'; readonly users: '/users' }
\`\`\`

### Rest-параметры и кортежи

\`\`\`ts
function tuple<T extends unknown[]>(...args: T): T { return args; }
tuple('a', 1);    // [string, number] — кортеж, но литералы расширены

function tupleC<const T extends readonly unknown[]>(...args: T): T { return args; }
tupleC('a', 1);   // readonly ['a', 1]
\`\`\`

### Чего \`const\` не умеет

\`\`\`ts
// 1. Явный аргумент типа отключает вывод
asTuple<string[]>(['a']);          // string[]

// 2. Значение, сохранённое заранее, уже расширено
const arr = ['a', 'b'];            // string[]
asTuple(arr);                      // string[]
const theme = { mode: 'dark' };
asTuple({ theme });                // { readonly theme: { mode: string } }

// 3. Контекстный тип побеждает
const m: string[] = asTuple(['a']);  // ок, T выведен как string[] из аннотации

// 4. Readonly-результат не подходит изменяемому типу
const t = asTuple(['a', 'b']);
const m2: string[] = t;
// error TS4104: The type 'readonly ["a", "b"]' is 'readonly' and cannot be assigned to the mutable type 'string[]'.
t.push('c');
// error TS2339: Property 'push' does not exist on type 'readonly ["a", "b"]'.
\`\`\`

При этом литерал в тернарном выражении внутри вызова \`const\` обрабатывает: \`asTuple(flag ? ['a'] : ['b'])\` даёт \`readonly ['a'] | readonly ['b']\`.

И главное — в рантайме ничего не меняется:

\`\`\`js
// скомпилированный JS: никакого Object.freeze
const t = asTuple(['a', 'b']);
t.push('c');
console.log(t, Object.isFrozen(t));   // [ 'a', 'b', 'c' ] false
\`\`\`

### Как было до TypeScript 5.0

Библиотеки обходились трюками с ограничениями:

\`\`\`ts
function oldLiterals<T extends string>(x: T[]): T[] { return x; }
oldLiterals(['a', 'b']);   // ('a' | 'b')[] — литералы сохранены, но это массив, не кортеж

function oldTuple<T extends readonly unknown[] | []>(x: T): T { return x; }
oldTuple(['a', 1]);        // [string, number] — кортеж, но литералы расширены
\`\`\`

Трюки работали частично и были непонятны читателю. \`<const T>\` заменяет их одной понятной пометкой.

### Реальный Angular-случай: типизированные query-параметры

Хелпер, который читает нужные query-параметры из \`ActivatedRoute\` и возвращает объект с точными ключами:

\`\`\`ts
import { ActivatedRoute } from '@angular/router';

function readQueryParams<const K extends readonly string[]>(route: ActivatedRoute, keys: K) {
  const map = route.snapshot.queryParamMap;
  return Object.fromEntries(keys.map(k => [k, map.get(k)])) as
    { [P in K[number]]: string | null };
}

const params = readQueryParams(this.route, ['page', 'sort']);
// { page: string | null; sort: string | null }
params.pgae;
// error TS2339: Property 'pgae' does not exist on type '{ page: string | null; sort: string | null; }'.
\`\`\`

Без \`const\` тот же хелпер вывел бы \`K = string[]\`, результат стал бы \`{ [x: string]: string | null }\`, и опечатка \`pgae\` прошла бы молча.

Второй пример — описание колонок грида, из которого выводится union полей:

\`\`\`ts
interface ColumnDef { field: string; header: string; width?: number }

function defineColumns<const T extends readonly ColumnDef[]>(cols: T): T { return cols; }

const columns = defineColumns([
  { field: 'name',  header: 'Имя' },
  { field: 'email', header: 'Email' },
]);
type Field = (typeof columns)[number]['field'];   // 'name' | 'email'

defineColumns([{ field: 'name' }]);
// error TS2741: Property 'header' is missing in type '{ field: string; }' but required in type 'ColumnDef'.
defineColumns([{ field: 'name', header: 'Имя', widht: 100 }]);
// ошибки НЕТ: лишний ключ-опечатка не ловится
\`\`\`

Последняя строка — важная тонкость: дженерик проверяет только, что \`T\` подходит под ограничение, а лишние поля подходу не мешают. Проверку лишних свойств даёт аннотация или \`satisfies\`, а не вывод дженерика.

### Где это применяется на практике

- **Библиотечные и shared-хелперы**: \`defineColumns\`, \`defineRoutes\`, \`defineConfig\`, \`createEvents\` — везде, где из переданного литерала выводятся типы.
- **Работа с роутером**: типизированные query- и path-параметры, построители URL из сегментов \`['users', ':id']\`.
- **Формы и валидация**: список полей формы или схема валидации, из которых выводится тип значения формы.
- **Права доступа и фича-флаги**: \`definePermissions(['users.read', 'users.write'])\` даёт union разрешений для гардов и директив.
- **Сторы и экшены**: API в стиле \`createStore\` или групп экшенов, где ключи конфигурации становятся типами.
- **Любые типобезопасные DSL**, где пользователю API нельзя доверить помнить про \`as const\`.

## Важные нюансы и подводные камни

- **Влияет только на вывод.** При явном аргументе типа (\`asTuple<string[]>(...)\`) \`const\` ничего не даёт.
- **Работает только с литералами, написанными прямо в вызове.** Если сначала записать \`const arr = ['a', 'b']\` (тип уже \`string[]\`), а потом передать \`arr\`, расширение уже случилось раньше.
- **Контекстный тип может победить.** \`const m: string[] = asTuple(['a'])\` выведет \`T = string[]\` из аннотации.
- **Не делает объект иммутабельным в рантайме.** \`readonly\` существует только в типах, \`Object.freeze\` не вызывается.
- **\`readonly\`-результат может не подойти** туда, где ожидается изменяемый массив (TS4104): понадобится копия \`[...result]\`.
- **Ограничение лучше делать readonly.** \`T extends readonly string[]\` даёт одинаковый результат на всех версиях; с изменяемым \`string[]\` поведение менялось между версиями TypeScript.
- **Лишние свойства не проверяются.** Дженерик пропустит опечатку в необязательном ключе; где это важно, добавьте \`satisfies\` или явный тип.
- **Не путайте \`<const T>\` и \`as const\`.** Первый — модификатор параметра типа в объявлении функции, второй — пометка конкретного выражения. Задачу решают одну, но с разных сторон: автор API против пользователя API.
- **Версия.** Нужен TypeScript 5.0+; на старых версиях — трюки с \`T extends string\` и \`| []\`.

**Плюсы:** точные литеральные типы и кортежи без \`as const\` у каждого вызова; API становится удобнее и безопаснее по умолчанию; не влияет на рантайм.
**Минусы:** результат становится \`readonly\` и может не стыковаться с изменяемыми типами; не работает для заранее сохранённых значений и при явных аргументах типа; лишние ключи не ловит; поведение с изменяемыми ограничениями менялось между версиями.

## Как это спрашивают на собеседовании

**Главный вывод:** при выводе дженериков TypeScript расширяет литералы в массивах и объектах до \`string\`/\`number\`. \`<const T>\` (TS 5.0) заставляет выводить \`T\` так, будто аргумент помечен \`as const\`, — точно, readonly и на всю глубину, без бойлерплейта у вызывающего кода.

Типичные формулировки: «Что такое \`const\`-параметры типа?», «Почему \`f(['a', 'b'])\` даёт \`string[]\`?», «Чем \`<const T>\` отличается от \`as const\`?», «Как сохранить литеральные типы в дженерик-функции?».

Что могут спросить следом:

- *Работает ли \`const\` при явном \`f<string[]>(...)\`?* — Нет, вывода нет, модификатор игнорируется.
- *Поможет ли он, если передать заранее объявленную переменную?* — Нет, её тип уже расширен при объявлении.
- *Становится ли объект неизменяемым?* — Только на уровне типов; в рантайме это обычный изменяемый объект.
- *Какое ограничение лучше ставить?* — \`readonly string[]\` (или \`readonly unknown[]\`): оно принимает оба вида массивов и даёт readonly-кортеж.
- *Как жили до 5.0?* — \`as const\` у вызова или трюки вроде \`T extends string\` и \`T extends readonly unknown[] | []\`.

### Ответ на 1 минуту

> По умолчанию при выводе дженерика TypeScript расширяет литералы внутри массивов и объектов: \`f(['a', 'b'])\` даёт \`T = string[]\`, а \`{ home: '/' }\` — \`{ home: string }\`. Раньше это лечили \`as const\` на стороне вызова, то есть перекладывали заботу на каждого пользователя API. \`const\`-параметры типа из TypeScript 5.0 позволяют написать \`<const T>\` в объявлении, и тогда компилятор выводит \`T\` так, будто аргумент помечен \`as const\`: литералы остаются литералами, массивы становятся readonly-кортежами, свойства — \`readonly\`, на всю глубину. Я использую это в shared-хелперах: описание колонок грида, из которого выводится union полей, или чтение query-параметров с точными ключами. Нюансы: работает только для литералов прямо в вызове и не при явном аргументе типа, ограничение лучше делать \`readonly string[]\`, результат readonly только в типах, а лишние ключи дженерик не ловит.`,
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
      ru: `## В чём суть

TypeScript смотрит не на название типа, а на его **форму**: если у значения есть все нужные члены нужных типов, оно подходит, даже если объявлено совсем другим классом или интерфейсом. Это структурная типизация. Обратная сторона — разные по смыслу вещи одинаковой формы становятся взаимозаменяемыми: \`UserId\` и \`OrderId\`, если оба просто \`string\`. Branding (брендирование) — приём, который эмулирует номинальную типизацию: к типу добавляется невидимая в рантайме метка, и компилятор перестаёт путать такие значения.

Аналогия: утиная типизация — «если крякает как утка и плавает как утка, значит утка». Охраннику на входе в бассейн важно, что у вас есть плавки и шапочка, а не как вас зовут. Номинальная типизация — проход по именному пропуску: важно, _кто_ вы, а не как одеты. Брендинг — это браслет, который выдают на ресепшене: снаружи вы тот же человек, но без браслета в зону для персонала не пустят, а браслет выдаёт только ресепшен.

**Какую проблему решает.** Структурность удобна: моки в тестах, объекты из JSON, классы разных библиотек — всё подходит, если совпадает форма, без иерархий и \`implements\`. Но в бизнес-коде много значений одной формы с разным смыслом: идентификаторы пользователя, заказа и счёта, суммы в рублях и копейках, «сырой» ввод и проверенный email. Вызов \`loadUser(orderId)\` компилируется, и баг «передали не тот идентификатор» уходит в прод. Брендинг делает такие ошибки ошибками компиляции — без единого байта накладных расходов в рантайме.

## Словарик терминов

- **Структурная типизация (structural typing)** — совместимость определяется набором членов и их типами, а не именем типа.
- **Номинальная типизация (nominal typing)** — совместимость определяется именем или объявлением типа (Java, C#): два класса с одинаковыми полями несовместимы.
- **Утиная типизация (duck typing)** — неформальное название структурного подхода: «крякает как утка — значит утка».
- **Совместимость, присваиваемость (assignability)** — правило «значение типа A можно положить туда, где ждут B». В TypeScript: у A есть все обязательные члены B с совместимыми типами.
- **Псевдоним типа (type alias)** — \`type UserId = string\` — просто второе имя для \`string\`, никакого нового типа не создаёт.
- **Брендинг (branding, branded type)** — добавление к типу фантомной метки-поля, чтобы значения одной формы стали несовместимы.
- **Фантомное поле (phantom property)** — поле, которое существует только в типе; в рантайме его нет.
- **\`unique symbol\`** — тип символа, уникальный для конкретного объявления; ключ бренда, который нельзя подделать и не видно в автодополнении.
- **Пересечение (intersection, \`A & B\`)** — тип, у которого есть всё из \`A\` и всё из \`B\`: \`string & { [brand]: 'UserId' }\`.
- **Проверка лишних свойств (excess property checking)** — дополнительная проверка объектного литерала на «лишние» ключи поверх обычной структурной совместимости.
- **Слабый тип (weak type)** — тип, у которого все свойства необязательные: \`{ a?: number; b?: string }\`.
- **Смарт-конструктор (smart constructor)** — единственная функция, которая создаёт брендированное значение и при этом проверяет его.

## Как это работает под капотом

1. Когда вы присваиваете значение типа \`S\` туда, где ожидается \`T\`, компилятор не сравнивает имена. Он проходит по каждому члену \`T\` и проверяет: есть ли такой член у \`S\` и совместим ли его тип. Лишние члены у \`S\` не мешают.
2. Проверка рекурсивна: свойства-объекты сравниваются так же, по форме. Для функций сравниваются параметры и возвращаемый тип, причём функция с **меньшим** числом параметров подходит туда, где ждут больше, — поэтому \`arr.forEach(x => ...)\` работает без второго и третьего аргументов.
3. Псевдоним \`type UserId = string\` нового типа не создаёт, поэтому \`UserId\`, \`OrderId\` и \`string\` — один и тот же тип.
4. Есть исключения, где компилятор смотрит на происхождение, а не на форму: \`private\`, \`protected\` и \`#private\`-члены классов, члены \`enum\` и \`unique symbol\`. Два класса с одинаковым \`private\`-полем несовместимы, потому что поля объявлены в разных местах.
5. Брендинг использует это: тип \`string & { readonly [brand]: 'UserId' }\` требует свойство с ключом \`brand\`. У обычной строки его нет, поэтому \`'u1'\` не подходит. У \`OrderId\` оно есть, но со значением \`'OrderId'\`, а \`'OrderId'\` несовместим с \`'UserId'\`.
6. Создать такое значение «честно» нельзя — свойства в рантайме нет. Поэтому значение «помечают» через \`as\` в одном контролируемом месте: смарт-конструкторе с проверкой.
7. В скомпилированном JavaScript от бренда не остаётся ничего: \`declare const brand\` не порождает кода, \`as\` стирается, значение — обычная строка.

Упрощённо проверка совместимости выглядит так:

\`\`\`ts
// псевдокод: можно ли положить значение типа S туда, где ждут T
function isAssignable(S, T) {
  if (T.hasNominalMembers) return sameDeclaration(S, T); // private, protected, #private, enum
  for (const member of T.members) {
    if (!S.has(member.name)) return member.optional;      // нет обязательного члена — нельзя
    if (!isAssignable(S.typeOf(member.name), member.type)) return false;
  }
  return true;                                            // лишние члены S не важны
}
\`\`\`

### Пример 1. Форма важнее имени

\`\`\`ts
interface Point { x: number; y: number; }
class Vec { constructor(public x: number, public y: number) {} }

const p: Point = new Vec(1, 2);   // ок — форма совпадает, implements не нужен

const f: (a: number, b: number) => void = (a) => {};  // ок — лишние параметры можно игнорировать
\`\`\`

\`Vec\` нигде не говорит, что он \`Point\`, но у него есть \`x: number\` и \`y: number\` — этого достаточно.

### Пример 2. В чём риск: одинаковая форма — разный смысл

\`\`\`ts
type UserId = string;
type OrderId = string;

function loadUser(id: UserId) { /* ... */ }

declare const orderId: OrderId;
loadUser(orderId);   // компилируется! Оба — просто string
\`\`\`

Псевдонимы читаются как документация, но для компилятора это одно и то же. Именно так в прод уезжают баги «передали id заказа вместо id пользователя».

### Пример 3. Брендинг через \`unique symbol\`

\`\`\`ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// единственная контролируемая точка создания
const makeUserId = (s: string) => s as UserId;

function load(id: UserId) { /* ... */ }

load(makeUserId('u1'));   // ок
load('u1');
// error TS2345: Argument of type 'string' is not assignable to parameter of type 'UserId'.
declare const orderId: OrderId;
load(orderId);
// error TS2345: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'.
//   Types of property '[brand]' are incompatible.
//     Type '"OrderId"' is not assignable to type '"UserId"'.
\`\`\`

\`declare const brand: unique symbol\` объявляет символ только для типов — в JavaScript ничего не попадает. Ключ-символ не виден в автодополнении и не совпадёт ни с одним реальным полем.

При этом \`UserId\` по-прежнему строка: его можно передать в функцию, которая ждёт \`string\`, и вызвать любые методы строк. Но результат методов — уже обычный \`string\`, бренд не сохраняется: \`makeUserId('u1').toUpperCase()\` имеет тип \`string\`.

Почему не \`string & { __brand: 'UserId' }\`? Так тоже работает и встречается часто, но поле \`__brand\` видно в автодополнении, и \`sku.__brand\` компилируется с типом \`'Sku'\`, хотя в рантайме там \`undefined\`. Вариант с \`unique symbol\` такую ошибку исключает.

### Пример 4. Смарт-конструктор с проверкой и type guard

Бренд особенно полезен, когда он означает «значение проверено»:

\`\`\`ts
type Email = Brand<string, 'Email'>;
const EMAIL_RE = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;

function parseEmail(s: string): Email {        // бросает, если формат неверный
  if (!EMAIL_RE.test(s)) throw new Error(\`Invalid email: \${s}\`);
  return s as Email;
}

function isEmail(s: string): s is Email {      // мягкая проверка для if
  return EMAIL_RE.test(s);
}

declare function sendInvite(to: Email): void;
declare const raw: string;                     // например, значение из формы

sendInvite(raw);
// error TS2345: Argument of type 'string' is not assignable to parameter of type 'Email'.
if (isEmail(raw)) sendInvite(raw);             // ок: raw сужен до Email
sendInvite(parseEmail('ann@example.com'));     // ок
\`\`\`

Теперь сама сигнатура \`sendInvite(to: Email)\` гарантирует, что внутрь не попадёт непроверенная строка: «проверить» значение можно только через \`parseEmail\` или \`isEmail\`.

### Пример 5. Брендированные числа и арифметика

\`\`\`ts
type Cents = Brand<number, 'Cents'>;

declare const a: Cents;
declare const b: Cents;
const sum = a + b;                 // number — бренд потерян

const cents = (n: number) => Math.round(n) as Cents;
function addCents(x: Cents, y: Cents): Cents { return (x + y) as Cents; }
\`\`\`

Арифметика возвращает обычный \`number\`, поэтому для денежных типов делают маленькие функции-операции, которые возвращают бренд обратно. Плата за безопасность — немного кода.

### Пример 6. Где TypeScript и так «номинальный»

\`\`\`ts
class A { private secret = 1; }
class B { private secret = 1; }
const x: A = new B();
// error TS2322: Type 'B' is not assignable to type 'A'.
//   Types have separate declarations of a private property 'secret'.

class C { protected secret = 1; }
class D { protected secret = 1; }
const y: C = new D();
// error TS2322: Property 'secret' is protected but type 'D' is not a class derived from 'C'.

class E { #secret = 1; }
class F { #secret = 1; }
const z: E = new F();
// error TS2322: Property '#secret' in type 'F' refers to a different member that cannot be accessed from within type 'E'.

enum Dir  { Up = 'UP' }
enum Dir2 { Up = 'UP' }
const d1: Dir = 'UP';      // error TS2322: Type '"UP"' is not assignable to type 'Dir'.
const d2: Dir = Dir2.Up;   // error TS2322: Type 'Dir2' is not assignable to type 'Dir'.
\`\`\`

Класс без приватных членов — полностью структурный: \`class G { secret = 1 }\` примет любой объект \`{ secret: number }\`, даже литерал.

### Проверка лишних свойств

Отдельная особенность, которая часто удивляет. Форма проверяется структурно, но **объектный литерал** дополнительно проверяется на лишние ключи:

\`\`\`ts
interface Opts { a: number }

const x: Opts = { a: 1, b: 2 };
// error TS2353: Object literal may only specify known properties, and 'b' does not exist in type 'Opts'.

const tmp = { a: 1, b: 2 };
const y: Opts = tmp;   // а так — ок!
\`\`\`

Это защита от опечаток именно в литералах: литерал «свежий», его больше никто не использует, поэтому лишний ключ почти наверняка ошибка. Значение из переменной могло прийти откуда угодно, и для него действуют обычные структурные правила.

### Слабые типы и пустой \`{}\`

\`\`\`ts
interface W { a?: number; b?: string }   // все поля необязательные — «слабый» тип

const w1: W = {};             // ок
const wmix = { a: 1, c: 1 };
const w2: W = wmix;           // ок — есть хотя бы одно общее свойство
const wobj = { c: 1 };
const w3: W = wobj;
// error TS2559: Type '{ c: number; }' has no properties in common with type 'W'.
const w4: W = 5;
// error TS2559: Type '5' has no properties in common with type 'W'.

const e1: {} = 5;        // ок
const e2: {} = 'str';    // ок
const e3: {} = null;     // error TS2322: Type 'null' is not assignable to type '{}'.
\`\`\`

Для слабых типов компилятор с TS 2.4 требует хотя бы одно общее свойство. А пустой \`{}\` означает «что угодно, кроме \`null\` и \`undefined\`» — и примитивы тоже.

Наглядный пример из Angular: \`SafeHtml\` и \`SafeUrl\` объявлены как пустые интерфейсы-маркеры (\`interface SafeValue {}\`). Структурно это тот же \`{}\`, поэтому \`const html: SafeHtml = 'just a string'\` компилируется без ошибок. Тип подсказывает намерение, но гарантии «прошло через \`DomSanitizer\`» не даёт — настоящий брендинг дал бы.

### Реальный Angular-случай: идентификаторы в HTTP-слое

\`\`\`ts
interface Order { id: OrderId; customerId: UserId; total: Cents }

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private http = inject(HttpClient);
  getOrder(id: OrderId) {
    return this.http.get<Order>(\`/api/orders/\${id}\`);
  }
}

this.ordersApi.getOrder(order.id);          // ок
this.ordersApi.getOrder(order.customerId);
// error TS2345: Argument of type 'UserId' is not assignable to parameter of type 'OrderId'.
\`\`\`

Важно понимать границу доверия: \`http.get<Order>\` ничего не проверяет в рантайме, JSON от сервера просто объявляется типом \`Order\`. Бренды защищают код **внутри** приложения; на границе (HTTP, \`localStorage\`, query-параметры) значения нужно либо проверить смарт-конструктором, либо осознанно «пометить» в одном месте — в маппере ответа API.

### Где это применяется на практике

- **Идентификаторы сущностей** в сервисах, сторах и роутинге: \`UserId\`, \`OrderId\`, \`AccountId\` — самая частая и самая окупаемая польза.
- **Деньги и единицы измерения**: \`Cents\` и \`Rubles\`, \`Pixels\` и \`Rem\`, \`Milliseconds\` и \`Seconds\` — нельзя сложить разное.
- **Проверенные значения**: \`Email\`, \`NonEmptyString\`, \`PositiveInt\`, \`IsoDate\` после валидации формы или ответа API.
- **Безопасность**: \`SanitizedHtml\`, \`TrustedUrl\` — гарантия, что строка прошла очистку, в отличие от структурно пустых маркеров.
- **Ключи кешей и токены**: \`CacheKey\`, \`JwtToken\`, чтобы не перепутать с обычными строками.
- **Библиотеки валидации** вроде Zod умеют выдавать брендированные типы прямо из схемы (\`.brand()\`), объединяя проверку и бренд.

## Важные нюансы и подводные камни

- **\`private\` — не единственный «номинальный» механизм.** Совместимость по происхождению дают также \`protected\`, \`#private\`-поля, члены \`enum\` и \`unique symbol\`. Класс без таких членов полностью структурен.
- **Лишние свойства проверяются только у свежих литералов.** «В литерале ругается, в переменной нет» — это не баг, а осознанное правило.
- **Слабые типы не «совместимы со всем».** Тип только из необязательных полей требует хотя бы одно общее свойство (TS2559), иначе было бы слишком легко передать совсем не то.
- **Пустой \`{}\` принимает любые значения, кроме \`null\` и \`undefined\`**, включая числа и строки. Для «любого объекта» есть \`object\`; \`Record<string, unknown>\` подходит для словарей, но интерфейс без индексной сигнатуры в него не присвоится (\`Index signature for type 'string' is missing\`), а псевдоним \`type\` — присвоится.
- **Бренд требует дисциплины.** Если разрешить \`value as UserId\` где попало, защита теряет смысл. Создание — только в смарт-конструкторе или маппере API, \`as\` на бренд в остальном коде — повод для замечания на ревью.
- **Бренд теряется при операциях.** \`toUpperCase()\` и арифметика возвращают обычные \`string\` и \`number\`, \`JSON.parse\` — вообще \`any\`; значения, восстановленные из JSON или \`localStorage\`, нужно брендировать заново.
- **Бренд — только на этапе компиляции.** В рантайме проверок нет; если нужна гарантия на границе, нужна валидация.
- **\`unique symbol\` лучше строкового \`__brand\`.** Строковое поле видно в автодополнении и обманчиво доступно как свойство.

**Плюсы:** структурность даёт гибкость (моки, JSON, интеграция библиотек без \`implements\`); брендинг добавляет номинальную строгость там, где она нужна, без накладных расходов в рантайме и без изменения представления данных.
**Минусы:** структурность не различает одинаковые по форме сущности; брендинг требует \`as\` в конструкторах, дисциплины команды и обёрток для арифметики и операций; бренды не защищают от неверных данных на границе приложения.

## Как это спрашивают на собеседовании

**Главный вывод:** TypeScript совместим по форме, а не по имени, поэтому \`type UserId = string\` не защищает от путаницы. Номинальность эмулируют брендом — фантомным полем с ключом \`unique symbol\` — и создают такие значения только через смарт-конструктор; в рантайме это обычная строка.

Типичные формулировки: «Что такое структурная типизация?», «Почему объект другого класса подходит под интерфейс?», «Как сделать, чтобы \`UserId\` и \`OrderId\` не путались?», «Почему в литерале ошибка про лишнее свойство, а через переменную — нет?».

Что могут спросить следом:

- *Есть ли в TypeScript что-то номинальное?* — Да: классы с \`private\`, \`protected\` или \`#private\`-членами, \`enum\` и \`unique symbol\` сравниваются по объявлению.
- *Почему лишние свойства ловятся только в литерале?* — Свежий литерал никто больше не использует, лишний ключ — почти наверняка опечатка; для переменных действуют обычные структурные правила.
- *Чем \`unique symbol\` лучше \`__brand: 'X'\`?* — Не виден в автодополнении, не обращается в несуществующее свойство и не может совпасть с реальным полем.
- *Что будет с брендом после \`toUpperCase()\` или сложения?* — Потеряется: результат — обычный \`string\` или \`number\`, нужны функции-обёртки.
- *Как бренд стыкуется с HTTP?* — Типы ответа не проверяются в рантайме; брендируют в маппере API или после валидации.

### Ответ на 1 минуту

> TypeScript использует структурную типизацию: совместимость определяется формой — набором членов и их типов, — а не именем. Поэтому \`Vec\` с полями \`x\` и \`y\` подходит под интерфейс \`Point\` без \`implements\`, а псевдонимы \`UserId\` и \`OrderId\`, если оба просто \`string\`, взаимозаменяемы, и компилятор не заметит, что я передал id заказа вместо id пользователя. Номинальность я эмулирую брендом: пересекаю \`string\` с фантомным полем на ключе \`unique symbol\` и создаю значения только через смарт-конструктор с проверкой — в рантайме это обычная строка без накладных расходов. Из нюансов: «номинальны» классы с \`private\`, \`protected\` или \`#private\`-полями и \`enum\`; объектный литерал дополнительно проверяется на лишние свойства, а через переменную нет; бренд теряется после операций вроде \`toUpperCase\`; и на границе, например в ответе HTTP, бренд не проверяет данные — их нужно валидировать.`,
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
      ru: `## В чём суть

Перегрузка (overload) — это когда у одной функции несколько «лиц»: вы объявляете несколько сигнатур, а реализация одна, и она сама разбирается, что пришло. Смысл в том, чтобы **связать конкретный вход с конкретным выходом**: передали строку — вернётся строка, передали массив — вернётся массив. Типизация \`this\` решает соседнюю задачу: объявляет, **на каком объекте** функцию разрешено вызывать.

Аналогия: окно выдачи на почте. За стеклом один сотрудник (реализация), а на стекле висит табличка: «принесли извещение — получите посылку; принесли паспорт и квитанцию — получите заказное письмо». Клиент читает табличку (сигнатуры), а не внутреннюю инструкцию сотрудника. А \`this\`-параметр — это пометка «обслуживаем только владельцев абонентского ящика»: без ящика к окну подходить бессмысленно, и TypeScript не пустит вас ещё на этапе компиляции.

**Какую проблему решает.** Без перегрузок функцию, которая принимает «строку или массив», описывают union-типом, и тогда **любой** вызов возвращает тоже union \`string | T[]\`. Вызывающий код вынужден каждый раз проверять, что ему вернули, хотя по аргументу это и так очевидно. Перегрузки выражают зависимость «вход → выход» прямо в типе. Типизация \`this\` закрывает другой класс багов: функцию, которая читает \`this.label\`, отрывают от объекта (передают как колбэк), \`this\` становится \`undefined\`, и приложение падает в рантайме. С объявленным \`this\` компилятор ловит это заранее.

## Словарик терминов

- **Сигнатура функции (signature)** — «паспорт» функции без тела: какие параметры она принимает и что возвращает, например \`(x: string): string\`.
- **Перегрузка (overload signature)** — одна из нескольких сигнатур без тела, объявленных подряд над одной реализацией.
- **Сигнатура реализации (implementation signature)** — заголовок той единственной версии функции, у которой есть тело. Снаружи она не видна.
- **Разрешение перегрузок (overload resolution)** — процесс, в котором компилятор перебирает перегрузки сверху вниз и берёт первую, под которую подходят аргументы.
- **Union-тип (объединение)** — тип «одно из»: \`string | number[]\` значит «строка или массив чисел».
- **Сужение типа (narrowing)** — когда после проверки вроде \`typeof x === 'string'\` компилятор внутри ветки считает \`x\` уже не union, а конкретным типом.
- **Дженерик (generic)** — функция или тип с параметром типа \`<T>\`, который подставляется при вызове: \`<T>(x: T[]): T[]\`.
- **Условный тип (conditional type)** — «тернарник на уровне типов»: \`T extends string ? A : B\`.
- **\`this\`-параметр** — фиктивный первый параметр \`function f(this: Btn)\`, который существует только в типах и описывает, каким должен быть контекст вызова.
- **\`call\` / \`apply\` / \`bind\`** — методы любой функции в JS, которые позволяют явно задать \`this\`: \`f.call(obj, a)\`, \`f.apply(obj, [a])\`, \`f.bind(obj)\` (возвращает новую функцию с привязанным \`this\`).
- **\`noImplicitThis\`** — флаг компилятора (входит в \`strict\`), который запрещает использовать \`this\`, тип которого не удалось определить.
- **\`ThisParameterType\` / \`OmitThisParameter\`** — встроенные утилиты: первая достаёт тип \`this\`-параметра из типа функции, вторая возвращает тип функции без него.
- **Полиморфный \`this\` (polymorphic this type)** — тип \`this\` в возвращаемом значении метода класса: «вернётся экземпляр того класса, на котором вызвали», включая наследников.

## Как это работает под капотом

Перегрузки существуют только в системе типов. Компилятор обрабатывает их так:

1. Сначала он собирает все сигнатуры без тела, идущие подряд перед реализацией, — это и есть **публичный контракт** функции.
2. Затем проверяет, что каждая перегрузка **совместима** с сигнатурой реализации: её параметры должны подходить под параметры реализации, а возвращаемые типы — быть связаны хотя бы в одну сторону. Если нет — ошибка TS2394 «This overload signature is not compatible with its implementation signature».
3. Сигнатуру реализации компилятор **убирает из публичного контракта**, поэтому вызвать функцию «по реализации» снаружи нельзя, даже если формально она шире.
4. На каждом вызове он пробует перегрузки **сверху вниз** и останавливается на первой подходящей — поэтому порядок решает, какой тип вернётся.
5. Если не подошла ни одна, вы получаете TS2769 «No overload matches this call» со списком, почему отвалилась каждая перегрузка.
6. При компиляции в JS все сигнатуры и \`this\`-параметр **стираются**: остаётся одна обычная функция, и разбор аргументов в рантайме — полностью ваша забота.

Вот что реально получается после \`tsc\`:

\`\`\`ts
// исходник
function render(this: Btn, prefix: string): string { return prefix + this.label; }
function reverse(x: string): string;
function reverse<T>(x: T[]): T[];
function reverse(x: string | unknown[]) { /* ... */ }

// результат в JS (проверено tsc 5.9)
// function render(prefix) { return prefix + this.label; }
// function reverse(x) { /* ... */ }
\`\`\`

Обе перегрузки и параметр \`this\` исчезли. Значит, никакой «магии выбора» в рантайме нет: если реализация не проверит тип аргумента, никто его не проверит.

### Пример 1. Базовая перегрузка

\`\`\`ts
function reverse(x: string): string;      // перегрузка 1
function reverse<T>(x: T[]): T[];         // перегрузка 2
function reverse(x: string | unknown[]) { // реализация — снаружи не видна
  return typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse();
}

const a = reverse('abc');      // тип string,   значение 'cba'
const b = reverse([1, 2, 3]);  // тип number[], значение [3, 2, 1]
reverse(true);
// TS2769: No overload matches this call.
//   Overload 1 of 2, '(x: string): string' ...
//   Overload 2 of 2, '(x: unknown[]): unknown[]' ...
\`\`\`

Для \`'abc'\` подошла первая перегрузка, для массива — вторая, причём дженерик вывел \`T = number\`. \`reverse(true)\` не прошёл ни одну, хотя реализация формально принимает \`string | unknown[]\` — она просто не участвует в выборе.

### Пример 2. Чем плох union-вариант

\`\`\`ts
function reverseU<T>(x: string | T[]): string | T[] {
  return typeof x === 'string' ? [...x].reverse().join('') : [...x].reverse();
}

const u = reverseU('abc');   // тип string | unknown[]
u.toUpperCase();
// TS2339: Property 'toUpperCase' does not exist on type 'string | unknown[]'.
\`\`\`

Мы передали строку, но компилятор не знает, что ответ тоже строка: union на входе дал union на выходе. Потребитель вынужден писать \`typeof u === 'string'\` после каждого вызова. Перегрузка убирает эту неопределённость.

### Пример 3. Union-аргумент не проходит ни одну перегрузку

Обратная сторона: перегрузки проверяются **по одной**, компилятор не «склеивает» их.

\`\`\`ts
function fmt(x: string): string;
function fmt(x: number): string;
function fmt(x: string | number): string { return String(x); }

declare const value: string | number;
fmt(value);
// TS2769: No overload matches this call.
//   Argument of type 'string | number' is not assignable to parameter of type 'string'.
\`\`\`

Каждая перегрузка в отдельности не принимает \`string | number\`. Лечится либо третьей перегрузкой \`fmt(x: string | number): string\`, либо — что честнее — отказом от перегрузок: если все варианты возвращают одно и то же, достаточно одной сигнатуры с union-параметром.

### Пример 4. Порядок перегрузок

\`\`\`ts
function parse(x: unknown): unknown;   // общая стоит первой — ошибка дизайна
function parse(x: string): number;
function parse(x: unknown) { return Number(x); }

const p = parse('1');   // тип unknown — вторая перегрузка не выбрана никогда
\`\`\`

\`'1'\` подходит под \`unknown\`, поэтому компилятор остановился на первой перегрузке. Правило: **конкретные сигнатуры выше, общие ниже**. Именно так устроен \`document.createElement\` в \`lib.dom.d.ts\`: сначала \`createElement<K extends keyof HTMLElementTagNameMap>(tagName: K)\`, а в самом низу — общий \`createElement(tagName: string): HTMLElement\`. Поэтому \`createElement('input')\` даёт \`HTMLInputElement\`, а \`createElement('my-widget')\` — просто \`HTMLElement\`.

### Пример 5. Компилятор верит перегрузкам на слово

\`\`\`ts
function toNum(x: string): number;
function toNum(x: number): string;
function toNum(x: string | number): string | number {
  return x; // возвращаем как есть — обе перегрузки врут
}

const n = toNum('5');   // тип number
console.log(typeof n);  // 'string'
\`\`\`

Ошибки нет: проверка TS2394 смотрит только на совместимость сигнатур (\`number\` входит в \`string | number\`), но не проверяет, что тело для строки действительно вернёт число. Тело функции работает с самым широким типом и по перегрузкам **не сужается** — \`typeof\`-проверки внутри обязательны.

### Перегрузки в типах, методах классов и стрелочных функциях

Ключевое слово \`function\` — не единственный способ. Перегрузки можно описать как несколько **сигнатур вызова** в типе, а также у методов класса:

\`\`\`ts
type Reverse = {
  (x: string): string;
  <T>(x: T[]): T[];
};
// стрелке нужен широкий тип, иначе она не подойдёт под обе сигнатуры
const rev: Reverse = (x: any): any =>
  typeof x === 'string' ? [...x].reverse().join('') : [...x].reverse();
rev([1, 2]);  // тип number[]

class Store {
  get(key: 'count'): number;
  get(key: 'name'): string;
  get(key: string): unknown { return (this as any)[key]; }
}
new Store().get('count');  // тип number
\`\`\`

У стрелочной функции нельзя написать несколько объявлений подряд, поэтому её типизируют через тип с сигнатурами. Без \`: any\` на возвращаемом значении присваивание падает: стрелка возвращает \`string | any[]\`, а это не подходит под первую сигнатуру \`(x: string): string\`.

### Альтернатива: дженерик с условным возвращаемым типом

\`\`\`ts
type Reversed<T> = T extends string ? string : T;

function reverse3<T extends string | unknown[]>(x: T): Reversed<T> {
  return (typeof x === 'string'
    ? [...x].reverse().join('')
    : [...x].reverse()) as Reversed<T>;  // без as: TS2322
}

reverse3('abc');                 // string
reverse3([1, 2]);                // number[]
declare const u: string | number[];
reverse3(u);                     // string | number[] — union тоже работает
\`\`\`

Плюс: одна сигнатура масштабируется, а union на входе даёт честный union на выходе (условный тип распределяется по членам union). Минус: внутри реализации TypeScript 5.9 не умеет сопоставить ветку \`typeof\` с веткой условного типа, поэтому без \`as\` будет TS2322 «Type 'string' is not assignable to type 'Reversed<T>'». Перегрузки читаются проще, когда варианты различаются числом и смыслом аргументов; условный тип — когда это одна операция над разными типами.

### \`ReturnType\` и \`Parameters\` видят только последнюю перегрузку

\`\`\`ts
type RT = ReturnType<typeof reverse>;   // unknown[]
type PT = Parameters<typeof reverse>;   // [x: unknown[]]
\`\`\`

Утилиты, которые достают типы из функции через \`infer\`, при перегрузках берут **последнюю** сигнатуру (обычно самую общую). Если вы строите обёртку над перегруженной функцией через \`Parameters\`, часть вариантов молча потеряется.

### Параметр \`this\`

В обычной функции JS значение \`this\` определяется тем, **как** её вызвали: \`obj.f()\` — это \`obj\`, \`f()\` в строгом режиме — \`undefined\`. TypeScript позволяет объявить ожидаемый \`this\` первым параметром:

\`\`\`ts
interface Btn { label: string; }

function render(this: Btn): string { return this.label; }

render.call({ label: 'ok' });       // ok
const btn = { label: 'Save', render };
btn.render();                       // ok, this — это btn
render();
// TS2684: The 'this' context of type 'void' is not assignable to method's 'this' of type 'Btn'.
const loose = btn.render;
loose();                            // та же TS2684 — метод оторвали от объекта
\`\`\`

\`this\` здесь не настоящий параметр: в вызов он не передаётся и из JS стирается (это видно в выводе \`tsc\` выше). Это просто контракт «вызывать только с таким контекстом».

### \`noImplicitThis\`

\`\`\`ts
function getLabel() { return this.label; }
// TS2683: 'this' implicitly has type 'any' because it does not have a type annotation.
\`\`\`

Без явного \`this\`-параметра тип контекста в обычной функции неизвестен. Флаг \`noImplicitThis\` (часть \`strict\`) превращает это в ошибку, а без него \`this\` молча стал бы \`any\` и любые опечатки прошли бы незамеченными.

### \`this: void\` в колбэках

\`this: void\` означает «эта функция не должна использовать \`this\`». Это хорошая практика в API, которые принимают колбэки: библиотека не обещает никакого контекста.

\`\`\`ts
interface UIElement {
  addClickListener(onclick: (this: void, e: MouseEvent) => void): void;
}

class Handler {
  info = '';
  onClickBad(this: Handler, e: MouseEvent) { this.info = e.type; }
  onClickGood = (e: MouseEvent) => { this.info = e.type; };
}
const h = new Handler();
ui.addClickListener(h.onClickBad);
// TS2345: ... The 'this' types of each signature are incompatible.
//   Type 'void' is not assignable to type 'Handler'.
ui.addClickListener(h.onClickGood);  // ok: стрелка захватила this экземпляра

class Unsafe {
  info = '';
  onClick(e: MouseEvent) { this.info = e.type; }
}
ui.addClickListener(new Unsafe().onClick);  // ошибки НЕТ, а в рантайме this === undefined
\`\`\`

Последняя строка — ловушка: у обычного метода класса без явного \`this\`-параметра компилятор не проверяет контекст при передаче в колбэк. Защищает только явный \`this: Handler\` в методе или стрелочная функция-свойство.

### \`ThisParameterType\` и \`OmitThisParameter\`

\`\`\`ts
type TP = ThisParameterType<typeof render>;  // Btn
type OT = OmitThisParameter<typeof render>;  // () => string

const bound = render.bind({ label: 'x' });   // тип () => string
bound();                                     // ok, 'x'
\`\`\`

Первая утилита отвечает на вопрос «какой контекст нужен этой функции», вторая — «как будет выглядеть функция после привязки контекста». Именно через \`OmitThisParameter\` типизирован \`bind\` в стандартной библиотеке (при включённом \`strictBindCallApply\`).

### Полиморфный \`this\` в классах

Внутри класса \`this\` можно использовать и как **тип возвращаемого значения**. Это основа fluent-API (цепочек вызовов):

\`\`\`ts
class QueryBuilder {
  protected parts: string[] = [];
  where(c: string): this { this.parts.push(c); return this; }
}
class UserQuery extends QueryBuilder {
  active(): this { return this.where('active = 1'); }
}

const q = new UserQuery().where('age > 18').active();  // тип UserQuery
\`\`\`

Если бы \`where\` возвращал \`QueryBuilder\`, после него метод \`active\` был бы недоступен. Тип \`this\` «подстраивается» под класс, на котором вызвали метод.

### Где это применяется на практике

- **Angular \`inject()\`** объявлен перегрузками: \`inject(token)\` возвращает \`T\`, а \`inject(token, { optional: true })\` — \`T | null\`. Вы получаете точный тип в зависимости от опций, без ручных проверок.
- **Angular \`HttpClient.get\`** имеет 15 перегрузок по комбинациям \`observe\` и \`responseType\`: \`http.get<User[]>(url)\` даёт \`Observable<User[]>\`, \`{ responseType: 'text' }\` — \`Observable<string>\`, \`{ observe: 'response' }\` — \`Observable<HttpResponse<T>>\`.
- **RxJS \`pipe\`** описан 11 перегрузками (от 0 до 9 операторов плюс общий вариант), чтобы вывести тип на выходе цепочки операторов.
- **Свои утилиты в enterprise-проектах**: форматтеры дат и денег (\`format(date: Date): string; format(date: null): null\`), парсеры конфигов, фабрики колонок для больших гридов.
- **Fluent-билдеры** запросов, фильтров грида и форм используют полиморфный \`this\`, чтобы наследники не теряли свои методы в цепочке.
- **Интеграция со старыми библиотеками** (графики, jQuery-плагины, обработчики DOM-событий), которые вызывают колбэки с подменённым \`this\`: явный \`this\`-параметр документирует и проверяет этот контракт.

## Важные нюансы и подводные камни

- **Перегрузки — это только типы.** В рантайме функция одна, разбор аргументов вы пишете руками. Компилятор проверяет лишь совместимость сигнатур (TS2394), но не то, что тело действительно возвращает обещанное для каждой перегрузки.
- **Тело не сужается по перегрузке.** Внутри вы работаете с самым широким типом реализации, и \`typeof\`/\`Array.isArray\`-проверки обязательны.
- **Порядок сверху вниз.** Если общая сигнатура стоит первой, конкретная никогда не выберется.
- **Сигнатура реализации невидима.** Её нельзя вызвать напрямую, даже если она шире всех перегрузок, — поэтому иногда нужна отдельная «общая» перегрузка последней.
- **Union-аргумент не проходит.** Значение типа \`string | number\` не подойдёт под перегрузки \`(x: string)\` и \`(x: number)\` по отдельности — получите TS2769.
- **\`ReturnType\`, \`Parameters\` и другие \`infer\`-утилиты берут последнюю перегрузку.** Обёртки над перегруженными функциями теряют варианты.
- **Слишком много перегрузок — плохая читаемость.** Больше трёх-четырёх — сигнал, что нужен дженерик с условным типом или разные функции с разными именами.
- **\`this\`-параметр стирается при компиляции** и обязан быть первым (иначе TS2680). Он не влияет на \`length\` функции и на передаваемые аргументы.
- **У стрелочной функции \`this\`-параметра быть не может** (TS2730): её \`this\` лексический, то есть берётся из окружающего кода в момент создания, и подменить его через \`call\` нельзя.
- **Метод класса без явного \`this\` не защищён.** Его можно передать колбэком туда, где ожидается \`this: void\`, и компилятор промолчит; спасают стрелочные функции-свойства или \`bind\`.
- **\`this: void\` в колбэках — хороший тон в API**: он не даёт потребителю случайно понадеяться на контекст.

**Плюсы:** точная связь «вход → выход» без проверок у вызывающего кода; читаемый контракт в подсказках IDE; \`this\`-параметр ловит потерю контекста на этапе компиляции.
**Минусы:** никакой проверки тела против перегрузок; union-аргументы не проходят; порядок легко нарушить; при большом числе вариантов дженерик с условным типом масштабируется лучше.

## Как это спрашивают на собеседовании

**Главный вывод:** перегрузки — это несколько публичных сигнатур над одной скрытой реализацией; они связывают тип входа с типом выхода, тогда как union-сигнатура возвращает union на любой вызов. \`this\` типизируется фиктивным первым параметром, который существует только в типах.

Типичные формулировки: «Зачем нужны перегрузки, если есть union?», «Как TypeScript выбирает перегрузку?», «Как типизировать \`this\` в обычной функции?», «Что такое \`this: void\`?».

Что могут спросить следом:

- *Почему нельзя вызвать функцию по сигнатуре реализации?* — Она исключена из публичного контракта; снаружи видны только перегрузки.
- *Проверяет ли компилятор, что реализация соответствует перегрузкам?* — Только совместимость сигнатур (TS2394), но не логику тела: можно вернуть строку там, где перегрузка обещает число.
- *Что вернёт \`ReturnType\` у перегруженной функции?* — Тип из последней перегрузки.
- *Чем заменить перегрузки?* — Дженериком с условным возвращаемым типом: он принимает union, но в реализации требует \`as\`.
- *Что будет, если передать метод класса как колбэк?* — Потеряется \`this\`; явный \`this\`-параметр или \`this: void\` у колбэка ловят это при компиляции, а стрелочное свойство решает проблему в рантайме.

### Ответ на 1 минуту

> Перегрузки в TypeScript — это несколько сигнатур без тела над одной реализацией. Снаружи видны только они, сигнатура реализации в выборе не участвует. Компилятор перебирает перегрузки сверху вниз и берёт первую подходящую, поэтому конкретные пишу выше общих. Главное отличие от union-сигнатуры: union на входе даёт union на выходе на любой вызов, а перегрузка говорит «строка вернёт строку, массив — массив». При этом это только типы: в JS остаётся одна функция, тело по перегрузкам не сужается, и компилятор не проверяет, что реализация держит обещания. Union-аргумент не пройдёт ни одну перегрузку, а \`ReturnType\` видит только последнюю. Тип \`this\` объявляю фиктивным первым параметром — он стирается при компиляции, но не даст вызвать функцию без нужного контекста; \`this: void\` в колбэках запрещает на него опираться. Если вариантов много, беру дженерик с условным типом.`,
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
      ru: `## В чём суть

\`enum\`, \`const enum\` и union литеральных типов — три способа сказать «значение может быть только одним из этого списка». Для проверки типов они почти равноценны, а главное различие в том, **что остаётся в собранном JS**: у \`enum\` — настоящий объект, у \`const enum\` — подставленные числа, у union — ничего. В современном TypeScript по умолчанию выбирают union строковых литералов, а если значения нужны в рантайме — объект с \`as const\`.

Аналогия: меню в кафе. Обычный \`enum\` — это напечатанное меню на столе: оно физически существует, его можно пролистать (перебрать значения в рантайме), но оно занимает место. \`const enum\` — официант, который выучил меню и сразу пишет в заказ номер блюда: меню на столе нет, но если официант из другой смены (другой инструмент сборки) его не учил, заказ не примут. Union литералов — правило на входе «заказывать можно только это»: проверяется при заказе, а на столе не лежит ничего.

**Какую проблему решает.** Без закрытого списка значений в коде живут «магические строки» и числа: \`status === 'loadng'\` с опечаткой молча возвращает \`false\`, а \`role = 3\` ничего не говорит читателю. Любой из трёх способов даёт компилятору список допустимых значений: он подсказывает варианты в IDE, ловит опечатки и проверяет, что \`switch\` обработал все случаи. Разница — в цене: размер бандла, совместимость с инструментами сборки и удобство работы с данными из JSON.

## Словарик терминов

- **Литеральный тип (literal type)** — тип, у которого ровно одно значение: \`'idle'\`, \`42\`, \`true\`.
- **Union литеральных типов** — объединение таких типов: \`'idle' | 'loading' | 'done'\` — «одна из трёх строк».
- **\`enum\` (перечисление)** — конструкция TypeScript, которая одновременно объявляет тип и создаёт объект в рантайме.
- **Числовой / строковый enum** — enum, члены которого равны числам (\`Up = 0\`) или строкам (\`Idle = 'idle'\`).
- **Обратный маппинг (reverse mapping)** — у числового enum можно получить имя по значению: \`Dir[0] === 'Up'\`.
- **\`const enum\`** — enum, который компилятор не превращает в объект, а **инлайнит**: подставляет значение прямо в место использования.
- **IIFE (Immediately Invoked Function Expression)** — функция, которая объявляется и сразу вызывается: \`(function (Dir) { ... })(Dir || (Dir = {}))\`. Так компилируется обычный enum.
- **Tree-shaking** — удаление бандлером неиспользуемого кода.
- **\`as const\`** — пометка для литерала: «сделай все поля \`readonly\` и сохрани точные литеральные типы, а не расширяй до \`string\`».
- **\`typeof\` / \`keyof\` в типах** — \`typeof obj\` берёт тип значения, \`keyof T\` — union имён его ключей; \`T[keyof T]\` — union типов значений.
- **\`satisfies\`** — оператор «проверь, что значение подходит под тип, но не меняй его выведенный тип».
- **\`isolatedModules\`** — флаг tsconfig: «каждый файл должен компилироваться отдельно, без знания о других файлах». Нужен для Babel, esbuild, swc и Vite.
- **\`erasableSyntaxOnly\`** — флаг TypeScript 5.8+: запрещает синтаксис, который нельзя просто «стереть», включая \`enum\`.
- **Проверка исчерпанности (exhaustiveness check)** — приём с типом \`never\`, при котором компилятор ругается, если в \`switch\` забыт вариант.

## Как это работает под капотом

Что делает компилятор с каждым вариантом:

1. Встречая \`enum Dir { Up, Down }\`, он создаёт **два объекта сразу**: тип \`Dir\` для аннотаций и переменную \`Dir\` для рантайма. Поэтому \`Dir\` можно писать и после двоеточия, и в выражении.
2. Для рантайма генерируется IIFE, которая заполняет объект. У числовых членов добавляются **две записи**: имя → число и число → имя (обратный маппинг). У строковых — только имя → строка.
3. Встречая \`const enum\`, компилятор (при полной компиляции проекта) **не генерирует объект**, а заменяет каждое \`Color.Red\` на \`0 /* Color.Red */\`. Для этого ему нужно видеть объявление enum в момент компиляции использующего файла.
4. Если включён \`isolatedModules\`, файл компилируется без знания о других файлах. Тогда подставить значение \`const enum\` из импорта невозможно, и \`tsc\` превращает его в обычный enum с объектом и импортом.
5. Union литералов существует **только в типах**: после компиляции остаются обычные строки \`'idle'\`, никаких объектов.

Вот реальный вывод \`tsc\` (TypeScript 5.9, target ES2022):

\`\`\`ts
enum Dir { Up, Down }
enum Status { Idle = 'idle', Loading = 'loading' }
const enum Color { Red, Green }
const c = Color.Red;

// → JS:
// var Dir;
// (function (Dir) {
//     Dir[Dir["Up"] = 0] = "Up";
//     Dir[Dir["Down"] = 1] = "Down";
// })(Dir || (Dir = {}));
// var Status;
// (function (Status) {
//     Status["Idle"] = "idle";
//     Status["Loading"] = "loading";
// })(Status || (Status = {}));
// const c = 0 /* Color.Red */;
\`\`\`

Строка \`Dir[Dir["Up"] = 0] = "Up"\` и есть обратный маппинг: присваивание \`Dir["Up"] = 0\` возвращает \`0\`, и тут же записывается \`Dir[0] = "Up"\`. У \`Color\` объекта нет вовсе.

### Обычный числовой enum

\`\`\`ts
enum Dir { Up, Down }   // Up = 0, Down = 1

Dir.Up;               // 0
Dir[0];               // 'Up' — обратный маппинг
Dir[5];               // тип string, а в рантайме undefined
Object.values(Dir);   // ['Up', 'Down', 0, 1] — ловушка при переборе
Object.keys(Dir);     // ['0', '1', 'Up', 'Down']
type DK = keyof typeof Dir;   // 'Up' | 'Down'
\`\`\`

Плюс — значения существуют в рантайме, их можно перебрать. Минус — из-за обратного маппинга \`Object.values\` возвращает и имена, и числа, так что для выпадающего списка приходится фильтровать по \`typeof\`. А \`Dir[5]\` компилятор считает строкой, хотя там \`undefined\`.

### Строковый enum

\`\`\`ts
enum OrderStatus { New = 'new', Paid = 'paid' }

const s1: OrderStatus = 'new';
// TS2322: Type '"new"' is not assignable to type 'OrderStatus'.
const s2: OrderStatus = OrderStatus.New;   // ok

interface OrderDto { status: string }
const s3: OrderStatus = dto.status;
// TS2322: Type 'string' is not assignable to type 'OrderStatus'.
const s4 = dto.status as OrderStatus;      // приходится приводить
\`\`\`

Строковые enum ведут себя **почти номинально**: даже точная строка \`'new'\` не принимается, нужно писать \`OrderStatus.New\`. Обратного маппинга нет (\`OrderStatus['new']\` — ошибка TS2551). Для данных из JSON это неудобно: сервер присылает обычные строки, и каждое поле приходится приводить через \`as\`, то есть без реальной проверки.

### Насколько безопасен числовой enum

\`\`\`ts
enum Dir { Up, Down }
const d1: Dir = 5;
// TS2322: Type '5' is not assignable to type 'Dir'.   (TS 5.0+)
const n: number = 5;
const d2: Dir = n;   // ошибки НЕТ — любое number по-прежнему проходит

enum Perm { Read = 1 << 0, Write = 1 << 1, Delete = 1 << 2 }
const mine = Perm.Read | Perm.Write;   // 3
(mine & Perm.Write) !== 0;             // true
(mine & Perm.Delete) !== 0;            // false
\`\`\`

До TypeScript 5.0 в переменную типа числового enum можно было присвоить любое число, даже литерал \`5\`. С 5.0 литерал вне списка — ошибка, но значение типа \`number\` всё ещё проходит без проверки. Именно поэтому это осталось: числовой enum поддерживает битовые флаги (\`Read | Write\` даёт \`3\`, которого нет в списке членов). Строковые enum такой дыры не имеют.

### \`const enum\`

\`\`\`ts
const enum Color { Red, Green }
const c = Color.Red;   // в JS: const c = 0 /* Color.Red */;
\`\`\`

Никакого объекта, чистая подстановка: ноль байт на объявление и никакого обращения к свойству в рантайме. Но у этого три цены. Перебрать значения нельзя: объекта нет. \`Color[0]\` не работает: обратного маппинга тоже нет. А главное — подстановка требует, чтобы компилятор видел объявление enum, и тут начинаются проблемы с инструментами.

### \`isolatedModules\`: почему \`const enum\` теряет смысл

Современные сборщики (esbuild, swc, Babel, Vite) компилируют **каждый файл отдельно**. Флаг \`isolatedModules\` заставляет \`tsc\` проверять, что код это выдержит. В tsconfig, который генерирует Angular CLI 21, он включён. Проверено на \`tsc\` 5.9:

\`\`\`ts
// colors.ts
export const enum Color { Red, Green }
// use.ts
import { Color } from './colors';
const c = Color.Green;

// без isolatedModules → use.js:  const c = 1 /* Color.Green */;  (импорт исчез)
// с isolatedModules    → colors.js: export var Color; (function (Color) {...})
//                        use.js:    import { Color } from './colors'; const c = Color.Green;

// declare const enum из .d.ts (как в типах библиотек):
const a = Amb.X;
// TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.
\`\`\`

Своя \`const enum\` под \`isolatedModules\` не ломает сборку, а **молча превращается в обычный enum** — экономия пропадает. Ошибку даёт только обращение к ambient \`const enum\` из \`.d.ts\`. Отсюда правило: **\`const enum\` нельзя отдавать из библиотеки** — у потребителя с пофайловой сборкой не будет ни подстановки, ни объекта, к которому можно обратиться. Babel и esbuild не инлайнят \`const enum\` из других файлов: они физически не видят чужое объявление.

### \`erasableSyntaxOnly\`: TypeScript без сборки

Свежие версии Node.js умеют запускать \`.ts\`-файлы, просто вырезая аннотации типов (type stripping). Enum так «вырезать» нельзя: это генерация кода, а не аннотация. Флаг \`erasableSyntaxOnly\` (TypeScript 5.8+) запрещает такой синтаксис:

\`\`\`ts
export const enum Color { Red, Green }
export enum Plain { A, B }
// TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled. (обе строки)
\`\`\`

Это ещё один сигнал, куда движется экосистема: union и \`as const\`-объекты — обычный JavaScript плюс стираемые типы, а enum — особая семантика компилятора.

### Union литеральных типов — рекомендуемый вариант

\`\`\`ts
type Status = 'idle' | 'loading' | 'done';
const s: Status = 'idle';          // строка как есть, из JSON тоже

declare const cur: Status;
if (cur === 'loadng') {}
// TS2367: This comparison appears to be unintentional because the types 'Status' and '"loadng"' have no overlap.

function label(s: Status): string {
  switch (s) {
    case 'idle': return 'Ожидание';
    case 'loading': return 'Загрузка';
    default: {
      const unreachable: never = s;
      // TS2322: Type '"done"' is not assignable to type 'never'.
      return unreachable;
    }
  }
}
\`\`\`

Ноль байт в бандле, значения читаемы в логах и напрямую совпадают с JSON от сервера. Опечатки в сравнениях ловятся (в Angular-шаблонах при \`strictTemplates\` — тоже, и без проброса enum в компонент). Приём с \`never\` работает так: в ветке \`default\` после всех \`case\` у \`s\` остаются только необработанные варианты; если их нет, это \`never\`, и присваивание проходит, а если забыт \`'done'\` — компилятор показывает, какой именно. Union идеально сочетается с дискриминируемыми union (объединениями объектов с общим полем-меткой вроде \`kind\`).

### Объект \`as const\` — когда значения нужны в рантайме

\`\`\`ts
const Roles = { Admin: 'admin', User: 'user' } as const
  satisfies Record<string, string>;

type Role = (typeof Roles)[keyof typeof Roles];   // 'admin' | 'user'

Object.values(Roles);   // ['admin', 'user'] — без мусора обратного маппинга
function can(r: Role) { return r === Roles.Admin; }
can('admin');           // ok — обычная строка подходит
can(Roles.User);        // ok — и «enum-стиль» тоже
\`\`\`

\`as const\` сохраняет точные литералы, \`typeof Roles\` даёт тип объекта, \`keyof typeof Roles\` — \`'Admin' | 'User'\`, а индексный доступ по ним — union значений. Получаем рантайм-значения для перебора, точные типы и обычный JS без магии компилятора. \`satisfies\` дополнительно проверяет форму объекта, не расширяя типы до \`string\`.

### Массив \`as const\` — список для выпадашки и валидации

\`\`\`ts
const STATUSES = ['idle', 'loading', 'done'] as const;
type Status = (typeof STATUSES)[number];   // 'idle' | 'loading' | 'done'

declare const raw: string;
STATUSES.includes(raw);
// TS2345: Argument of type 'string' is not assignable to parameter of type '"idle" | "loading" | "done"'.

function isStatus(x: string): x is Status {
  return (STATUSES as readonly string[]).includes(x);
}
\`\`\`

\`T[number]\` — индексный доступ «по любому числовому индексу», то есть union всех элементов. Массив удобен, когда нужен упорядоченный список (опции селекта) и рантайм-проверка пришедших данных. Неудобство — \`includes\` на readonly-кортеже ждёт уже суженный тип, поэтому для проверки сырой строки массив расширяют до \`readonly string[]\` внутри type guard.

### Как выбрать

- **Union строковых литералов** — по умолчанию: статусы, режимы, варианты пропсов и \`input()\` компонентов, поля DTO.
- **Объект \`as const\` или массив \`as const\`** — когда нужны значения в рантайме: перебор для селекта, валидация входных данных, человекочитаемые подписи.
- **Обычный строковый \`enum\`** — допустим, если так принято в кодовой базе или нужен номинальный тип, который нельзя «подделать» строкой; цена — \`as\` на границе с JSON.
- **Числовой \`enum\`** — для битовых флагов и протоколов, где значения действительно числа.
- **\`const enum\`** — только внутри одного приложения без пофайловой сборки; в библиотеках и при \`isolatedModules\` — нет.

### Где это применяется на практике

- **Статусы загрузки и состояния UI**: \`'idle' | 'loading' | 'success' | 'error'\` в сигналах и NgRx-сторе, с исчерпывающим \`switch\` в редьюсере.
- **Колонки и фильтры больших гридов**: \`const COLUMN_TYPES = ['text', 'number', 'date'] as const\` даёт и тип для конфигурации колонки, и список для меню.
- **DTO из HTTP-слоя**: union совпадает со строками от бэкенда без приведения; при сгенерированных из OpenAPI моделях встречаются enum, и тогда на границе нужен \`as\` или маппер.
- **Права доступа**: числовые битовые флаги (\`Read | Write\`) или объект \`as const\` с ролями для guard-ов маршрутов.
- **Шаблоны Angular**: с union можно писать \`@if (status() === 'loading')\` прямо в шаблоне; enum же придётся пробрасывать полем компонента (\`protected readonly Dir = Dir;\`), потому что шаблон видит только члены класса.
- **Публичные библиотеки и design-system**: только union или \`as const\`, никаких \`const enum\`.

## Важные нюансы и подводные камни

- **Числовые enum небезопасны**: до TypeScript 5.0 в них можно было присвоить любое число; с 5.0 литерал вне списка запрещён, но значение типа \`number\` проходит без проверки.
- **Обратный маппинг только у числовых.** \`Dir[0]\` работает, а у строкового enum — нет; при этом \`Object.values\` числового enum возвращает и имена, и числа.
- **enum — это одновременно тип и значение.** \`Dir\` можно использовать и в аннотации, и как объект — отсюда путаница при импорте (\`import type { Dir }\` не даст использовать его как значение).
- **Строковый enum не принимает строку.** \`const s: OrderStatus = 'new'\` — ошибка, а данные с сервера приходится приводить через \`as\` без реальной проверки.
- **\`const enum\` в библиотеке — почти всегда ошибка.** При пофайловой сборке потребитель получит TS2748 на ambient \`const enum\` или просто не получит подстановку.
- **Под \`isolatedModules\` своя \`const enum\` молча становится обычной.** Ошибки нет, но и выгоды тоже.
- **Обычный enum компилируется в IIFE**, которая изменяет объект; бандлер не всегда может доказать, что этот код без побочных эффектов, поэтому неиспользуемый enum иногда остаётся в бандле.
- **Шаблоны Angular не видят enum без проброса** через поле компонента, а union-литералы пишутся в шаблоне как обычные строки и при \`strictTemplates\` проверяются.
- **\`includes\` на \`as const\`-массиве** не принимает \`string\` — нужен type guard с расширением до \`readonly string[]\`.

**Плюсы:** union — ноль рантайма, совместимость с JSON, отличное сужение; \`as const\` — значения плюс точные типы обычным JS; enum — привычный синтаксис и рантайм-объект из коробки; \`const enum\` — нулевая стоимость в рамках одного проекта.
**Минусы:** enum — код в бандле, особая семантика компилятора, неудобство с JSON и несовместимость с \`erasableSyntaxOnly\`; \`const enum\` — конфликт с \`isolatedModules\` и библиотеками; union — нет рантайм-списка без отдельного объекта или массива.

## Как это спрашивают на собеседовании

**Главный вывод:** обычный \`enum\` создаёт объект в рантайме, \`const enum\` инлайнится и плохо дружит с пофайловой сборкой, union литералов существует только в типах. По умолчанию — union, а если нужны рантайм-значения — объект или массив с \`as const\` и выведенный из него тип.

Типичные формулировки: «Чем \`enum\` отличается от union строк?», «Почему \`const enum\` считается опасным?», «Что вы используете вместо enum?», «Что такое обратный маппинг?».

Что могут спросить следом:

- *Как получить тип из объекта с ролями?* — \`typeof Roles[keyof typeof Roles]\` при объявлении объекта с \`as const\`.
- *Почему \`const enum\` не работает с esbuild или Babel?* — Они компилируют файлы по отдельности и не видят объявление из другого файла, поэтому подставить значение не могут.
- *Можно ли присвоить любое число в числовой enum?* — Литерал вне списка с TS 5.0 — ошибка, а переменная типа \`number\` проходит.
- *Как проверить, что \`switch\` обработал все варианты?* — Присвоить значение в \`default\` переменной типа \`never\`.
- *Чем строковый enum неудобен с API?* — Он не принимает строковые литералы, и данные из JSON приходится приводить через \`as\`.

### Ответ на 1 минуту

> Обычный \`enum\` генерирует в JS настоящий объект через IIFE, а у числовых ещё и обратный маппинг, поэтому \`Object.values\` возвращает и имена, и числа. Это код в бандле, зато значения есть в рантайме. \`const enum\` компилятор подставляет как литералы, объекта нет, но подстановка требует видеть объявление: при \`isolatedModules\` и пофайловых сборщиках вроде esbuild он молча становится обычным enum, а ambient \`const enum\` из библиотеки вообще даёт ошибку. Union строковых литералов — мой дефолт: ноль рантайма, совпадает с JSON от сервера, хорошо сужается и позволяет проверить исчерпанность \`switch\` через \`never\`. Если значения нужны для перебора, беру объект или массив с \`as const\` и вывожу тип через \`typeof\` и \`keyof\`. Из нюансов: строковый enum не принимает обычную строку, а в числовой с TS 5.0 нельзя присвоить чужой литерал, но \`number\` всё ещё проходит.`,
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
      ru: `## В чём суть

Рекурсивный тип — это тип, который ссылается сам на себя, ровно как рекурсивная функция, только на уровне типов. Им описывают данные произвольной глубины (JSON, дерево меню) и пишут утилиты вроде \`DeepReadonly\`. А рекурсивные условные типы превращают систему типов в маленький язык программирования с циклами, но у компилятора есть жёсткие пределы глубины, и хвостовая рекурсия — способ их отодвинуть.

Аналогия: кассир считает покупки. Первый способ — откладывать каждую покупку в стопку «досчитаю потом» и только в конце складывать всё обратно: стопка растёт, и на пятидесятой покупке стол заканчивается. Второй способ — держать **текущую сумму в голове** и сразу прибавлять каждую покупку: стопки нет вообще, можно пробить сотни товаров. Первый способ — обычная рекурсия, второй — хвостовая рекурсия с **аккумулятором** (накопителем результата).

**Какую проблему решает.** Без рекурсивных типов вложенные структуры описываются только на фиксированную глубину: \`{ children: { children: { ... } } }\` — и на четвёртом уровне типизация заканчивается. Без рекурсивных условных типов нельзя вычислить тип по строке или кортежу: проверить путь \`'user.profile.title'\` в словаре переводов, разобрать параметры маршрута, вывести тип поля по пути в форме. А понимание пределов нужно, чтобы не получить на ровном месте «Type instantiation is excessively deep and possibly infinite» и тормозящую IDE.

## Словарик терминов

- **Рекурсивный тип (recursive type)** — тип, в определении которого встречается он сам: \`type Tree = { children: Tree[] }\`.
- **Псевдоним типа (type alias)** — имя, данное типу через \`type X = ...\`.
- **Условный тип (conditional type)** — «тернарник на уровне типов»: \`T extends U ? A : B\`.
- **\`infer\`** — ключевое слово внутри условного типа, которое «вытаскивает» часть типа в новую переменную: \`T extends [infer H, ...infer R]\` — первый элемент кортежа и остаток.
- **Кортеж (tuple) и spread в кортеже** — массив фиксированной длины с известным типом каждой позиции; \`[...R, unknown]\` — «кортеж \`R\` плюс ещё один элемент».
- **Шаблонный литеральный тип (template literal type)** — строковый тип, собранный по шаблону: \`\` \`\${A}.\${B}\` \`\`; вместе с \`infer\` умеет разбирать строки.
- **Mapped type (отображённый тип)** — тип, который проходит по ключам другого: \`{ [K in keyof T]: ... }\`.
- **Инстанциация (instantiation)** — подстановка конкретных типов в обобщённый: \`BuildTuple<5>\` — инстанциация \`BuildTuple\`.
- **Глубина инстанциации** — сколько инстанциаций вложено друг в друга в данный момент; у компилятора есть предел.
- **Хвостовая рекурсия (tail recursion)** — рекурсивный вызов стоит в позиции результата целиком, после него ничего не делается.
- **Аккумулятор (accumulator)** — дополнительный параметр типа, в котором постепенно копится результат.
- **Отложенное вычисление (deferred resolution)** — компилятор не раскрывает тип до конца сразу, а вычисляет части по мере обращения.
- **TS2589 / TS2456 / TS2799** — коды ошибок: «Type instantiation is excessively deep and possibly infinite», «Type alias circularly references itself», «Type produces a tuple type that is too large to represent».

## Как это работает под капотом

Как компилятор обходится с рекурсией:

1. Имя псевдонима регистрируется **до** разбора его тела, поэтому тело может ссылаться на себя. Но только в «отложенных» позициях — внутри свойства объекта, элемента массива или кортежа. Прямая ссылка \`type Bad = Bad | string\` даёт TS2456: чтобы узнать \`Bad\`, нужно уже знать \`Bad\`.
2. Объектные и mapped-типы раскрываются **лениво**: свойство вычисляется, когда к нему обращаются. Поэтому \`DeepReadonly<LinkedNode>\` для бесконечной цепочки \`next.next.next\` не зацикливается — каждый уровень считается по требованию.
3. Условный тип вычисляется сразу. Каждый рекурсивный вызов — новая инстанциация, **вложенная** в предыдущую. Счётчик глубины растёт, и на значении 100 компилятор сдаётся с TS2589. На практике один уровень рекурсии съедает несколько единиц глубины, поэтому обычная рекурсия ломается примерно на **50 уровнях** (в наших замерах на TypeScript 5.9 — на 49-м).
4. С TypeScript 4.5 есть **оптимизация хвостовой рекурсии**: если выбранная ветка условного типа — это **непосредственно** другой условный тип, компилятор не вкладывает его, а подменяет текущий и продолжает в цикле. Глубина не растёт, а предел — **1000 итераций**, после чего та же TS2589.
5. Есть и другие пределы: не более 5 000 000 инстанциаций при проверке одного выражения и не более 10 000 элементов в кортеже (TS2799).
6. Результаты инстанциаций **кэшируются**: если \`LenA<'abc'>\` уже посчитан, повторно он не вычисляется. Поэтому фактическая граница иногда зависит от того, что было посчитано раньше в этом же файле.

Упрощённо цикл из \`checker.ts\` (функция \`getConditionalType\`) выглядит так:

\`\`\`ts
// псевдокод, близкий к исходнику TypeScript 5.9
let tailCount = 0;
while (true) {
  if (tailCount === 1000) {
    error('Type instantiation is excessively deep and possibly infinite');
    return errorType;
  }
  const branch = conditionHolds ? trueBranch : falseBranch;
  if (branch — это сразу другой условный тип) {
    подставить аргументы; tailCount++;
    continue;            // хвостовой вызов: крутимся в цикле, стек не растёт
  }
  return instantiate(branch); // всё остальное — обычная вложенная инстанциация
}
\`\`\`

### Пример 1. Рекурсивный тип данных: JSON

\`\`\`ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [k: string]: Json };

const ok: Json = { a: [1, 'x', { b: null }] };   // ok, любая глубина
const bad: Json = { a: () => 1 };
// TS2322: Type '{ a: () => number; }' is not assignable to type 'Json'.
//   Type '() => number' is not assignable to type 'Json | undefined'.

type Bad = Bad | string;
// TS2456: Type alias 'Bad' circularly references itself.
\`\`\`

Внутри JSON может лежать JSON, и тип говорит ровно это. Ссылки на \`Json\` стоят внутри массива и объекта — это отложенные позиции, поэтому всё работает (так можно с TypeScript 3.7). \`Bad\` ссылается на себя напрямую, и компилятор не может начать вычисление.

### Пример 2. Дерево и ленивое раскрытие

\`\`\`ts
interface MenuItem {
  label: string;
  route?: string;
  children?: MenuItem[];   // дерево любой глубины
}

interface LinkedNode { value: number; next: LinkedNode | null }
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

declare const ln: DeepReadonly<LinkedNode>;
ln.next!.next!.next!.next!.value = 1;
// TS2540: Cannot assign to 'value' because it is a read-only property.
\`\`\`

Цепочка \`LinkedNode\` бесконечна, но компилятор не пытается раскрыть её целиком: тип \`next\` на каждом уровне вычисляется только тогда, когда мы к нему обращаемся. Так работают все рекурсивные объектные типы.

### Пример 3. Почему наивный \`DeepReadonly\` ломает \`Date\`, \`Map\` и функции

\`\`\`ts
interface Cfg {
  created: Date;
  onSave: (x: number) => void;
  tags: Map<string, number>;
}
declare const c: DeepReadonly<Cfg>;   // наивная версия из примера 2
c.created.getTime();
c.onSave(1);
c.tags.get('a');
// все три: TS2349: This expression is not callable. Type '{}' has no call signatures.
\`\`\`

\`T extends object\` истинно и для функций, и для \`Date\`, и для \`Map\`. Mapped type проходит по их ключам и превращает каждый метод в \`DeepReadonly<метод>\`, то есть в объект без сигнатуры вызова — \`{}\`. Тип не зацикливается, он **ломается**: методами больше нельзя пользоваться. Исправленная версия разбирает такие случаи явно:

\`\`\`ts
type DeepReadonly2<T> =
  T extends (...args: any[]) => any ? T :
  T extends Date | RegExp ? T :
  T extends Map<infer K, infer V> ? ReadonlyMap<K, DeepReadonly2<V>> :
  T extends Set<infer U> ? ReadonlySet<DeepReadonly2<U>> :
  T extends object ? { readonly [K in keyof T]: DeepReadonly2<T[K]> } :
  T;

declare const c2: DeepReadonly2<Cfg & { list: { id: number }[] }>;
c2.created.getTime();   // ok
c2.onSave(1);           // ok
c2.tags.set('a', 1);    // TS2339: Property 'set' does not exist on type 'ReadonlyMap<string, number>'.
c2.list[0].id = 2;      // TS2540: Cannot assign to 'id' because it is a read-only property.
\`\`\`

Массивы отдельная ветка не требуют: mapped type над массивом сохраняет «массивность» и даёт \`readonly { readonly id: number }[]\`.

### Пример 4. Рекурсивный условный тип как цикл

С TypeScript 4.1 условный тип может вызывать сам себя:

\`\`\`ts
type BuildTuple<N extends number, R extends unknown[] = []> =
  R['length'] extends N ? R : BuildTuple<N, [...R, unknown]>;

type Five = BuildTuple<5>['length'];   // 5
\`\`\`

Читается как цикл \`while\`: «пока длина кортежа \`R\` не равна \`N\` — добавь элемент и вызови себя снова». \`R['length']\` у кортежа — это литерал (\`0\`, \`1\`, \`2\`...), поэтому сравнение \`extends N\` работает. Здесь \`R\` — аккумулятор, а вызов \`BuildTuple<...>\` стоит в ветке целиком, так что рекурсия хвостовая.

### \`infer\` и шаблонные литералы: разбор строк

\`\`\`ts
type Join<T extends string[], D extends string, Acc extends string = ''> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Join<R, D, Acc extends '' ? H : \`\${Acc}\${D}\${H}\`>
    : Acc;

type J = Join<['a', 'b', 'c'], '-'>;   // 'a-b-c'
\`\`\`

\`infer H extends string\` (TypeScript 4.7+) вытаскивает первый элемент и сразу проверяет, что это строка; \`...infer R\` — остаток. Шаблон \`\` \`\${Acc}\${D}\${H}\` \`\` склеивает строку. Вызов \`Join<...>\` — весь результат ветки, накопитель \`Acc\` растёт: хвостовая рекурсия.

### Пример 5. Обычная против хвостовой: замер пределов

Посчитаем длину строки двумя способами (проверено на \`tsc\` 5.9):

\`\`\`ts
// вспомогательный тип: строка из N повторов S (сам — хвостовая рекурсия)
type Repeat<S extends string, N extends number, Acc extends string = '', C extends unknown[] = []> =
  C['length'] extends N ? Acc : Repeat<S, N, \`\${Acc}\${S}\`, [...C, unknown]>;

// обычная: результат собирается ПОСЛЕ рекурсивного вызова
type LenA<S extends string> =
  S extends \`\${infer _}\${infer R}\` ? [unknown, ...LenA<R>] : [];

// хвостовая: результат несём в аккумуляторе
type LenB<S extends string, Acc extends unknown[] = []> =
  S extends \`\${infer _}\${infer R}\` ? LenB<R, [...Acc, unknown]> : Acc['length'];

// «почти хвостовая»: после вызова ещё union
type LenC<S extends string, Acc extends unknown[] = []> =
  S extends \`\${infer _}\${infer R}\` ? LenC<R, [...Acc, unknown]> | null : Acc['length'];

type A49 = LenA<Repeat<'a', 49>>['length'];
// TS2589: Type instantiation is excessively deep and possibly infinite.
type A48 = LenA<Repeat<'a', 48>>['length'];   // 48
type B998 = LenB<Repeat<'a', 998>>;           // 998
type C100 = LenC<Repeat<'a', 100>>;           // TS2589 — \`| null\` убил оптимизацию
type T999 = BuildTuple<999>['length'];        // 999
type T1000 = BuildTuple<1000>['length'];      // TS2589 — потолок хвостовой рекурсии
type A60 = LenA<Repeat<'a', 60>>['length'];   // 60 (!) — помог кэш от A48
\`\`\`

В \`LenA\` после вызова \`LenA<R>\` ещё нужно развернуть результат в новый кортеж — компилятор обязан держать текущий уровень открытым, глубина растёт. В \`LenB\` возвращать нечего, кроме самого вызова, и он крутится в цикле. \`LenC\` формально использует аккумулятор, но \`| null\` после вызова — это уже работа «после возврата». Последняя строка показывает эффект кэша: хвосты строки длиной до 48 уже посчитаны для \`A48\`, поэтому \`A60\` проходит, хотя «с нуля» упал бы уже \`A49\`.

### Где проходят границы

- **~50 уровней** обычной (вложенной) рекурсии: внутренний предел глубины инстанциации равен 100, уровень обычно стоит около двух единиц.
- **1000 итераций** хвостовой рекурсии (с TypeScript 4.5): \`BuildTuple<999>\` проходит, \`BuildTuple<1000>\` — нет.
- **10 000 элементов** — максимальный размер кортежа: удвоение кортежа из 5120 элементов даёт TS2799. Отсюда, видимо, и миф про «10 000 шагов» хвостовой рекурсии.
- **5 000 000 инстанциаций** на одно выражение или инструкцию — защита от комбинаторного взрыва, например при распределении больших union по нескольким параметрам.
- Посмотреть нагрузку можно флагом \`tsc --extendedDiagnostics\`: он печатает строку \`Instantiations:\` с общим числом инстанциаций.

### Пример 6. Типизированные пути к ключам

\`\`\`ts
type Paths<T> = T extends object
  ? { [K in keyof T & string]:
        T[K] extends object ? K | \`\${K}.\${Paths<T[K]>}\` : K
    }[keyof T & string]
  : never;

const i18n = {
  user: { profile: { title: '', save: '' }, logout: '' },
  errors: { required: '' },
};
type Key = Paths<typeof i18n>;
// 'user' | 'errors' | 'user.profile' | 'user.logout'
// | 'user.profile.title' | 'user.profile.save' | 'errors.required'
\`\`\`

Mapped type строит для каждого ключа либо сам ключ, либо ключ плюс все вложенные пути через точку, а индексный доступ \`[keyof T & string]\` собирает значения в один union. Функция \`t(key: Key)\` после этого не даст опечататься в ключе перевода. Глубина здесь равна глубине объекта, так что пределы не мешают; а вот на огромных словарях union путей разрастается, и IDE начинает тормозить.

### Как это сделано в Angular: типизированные формы

\`FormGroup.get('address.city')\` в Angular возвращает типизированный контрол. В \`@angular/forms\` это сделано рекурсивными типами: \`ɵTokenize\` режет строку по точкам (обычная рекурсия \`[T, ...ɵTokenize<U, D>]\`), а \`ɵNavigate\` спускается по объекту (хвостовая рекурсия):

\`\`\`ts
const form = new FormGroup({
  name: new FormControl(''),
  address: new FormGroup({ city: new FormControl('Minsk') }),
});

form.get('address.city')?.value;   // string | null | undefined
form.get('address.zip');           // AbstractControl<never, never, any> | null — без ошибки!
\`\`\`

Опечатка в пути не даёт ошибку компиляции: тип просто вырождается в \`never\`. Это типичная плата за «вычисления в типах» — когда тип не может посчитать ответ, он часто тихо возвращает \`never\` или \`any\`.

### Где это применяется на практике

- **Данные произвольной глубины**: JSON-конфиги, дерево меню и навигации, древовидные гриды (tree data), цепочки комментариев, файловые деревья.
- **\`DeepReadonly\` / \`DeepPartial\`**: неизменяемое состояние в NgRx и сигналах, частичные патчи для \`form.patchValue\` и PATCH-запросов.
- **Типизированные ключи**: пути переводов в i18n, ключи настроек, пути полей в формах (как \`form.get('address.city')\`).
- **Разбор строк в типах**: параметры маршрута из \`'/users/:id/orders/:orderId'\`, имена событий, CSS-переменные.
- **Библиотечные типы**: типизированные формы Angular, валидаторы схем (zod и аналоги выводят тип по схеме рекурсивно), типобезопасные клиенты API.

## Важные нюансы и подводные камни

- **TS2589 — почти всегда признак нехвостовой рекурсии.** Перепишите с аккумулятором: несите результат в дополнительном параметре и возвращайте его в базовой ветке.
- **Хвостовой считается только вызов в позиции результата.** \`[...Rec<T>]\`, \`Rec<T> | null\`, \`{ x: Rec<T> }\` — уже не хвостовые, оптимизация не сработает.
- **Предел хвостовой рекурсии — 1000, а не «бесконечность» и не 10 000.** 10 000 — это лимит длины кортежа.
- **Граница зависит от кэша и формы типа.** Тип, который проходит в одном файле (где меньшие инстанциации уже посчитаны), может упасть в другом — не стройте логику «на грани».
- **Наивные \`DeepReadonly\` и \`DeepPartial\` ломают функции, \`Date\` и \`Map\`**: методы превращаются в \`{}\` без сигнатуры вызова. Нужны явные ветки для них.
- **Прямая самоссылка запрещена.** \`type Bad = Bad | string\` — TS2456; ссылка допустима только внутри объекта, массива, кортежа.
- **Неудачное вычисление часто даёт \`never\` или \`any\` без ошибки** — как \`form.get('address.zip')\`. Тесты на типы тут полезнее, чем кажется: \`expectTypeOf\` из Vitest проверяет, что выражение имеет ожидаемый тип, а комментарий \`// @ts-expect-error\` над строкой требует, чтобы в ней была ошибка компиляции.
- **Компиляция и IDE тормозят** от сложных рекурсивных типов сильнее, чем кажется. На большом проекте это заметно по времени отклика подсказок; \`--extendedDiagnostics\` показывает число инстанциаций.
- **Читаемость важнее «типового кунг-фу»**: если тип нельзя объяснить коллеге за минуту, скорее всего нужна другая модель данных.

**Плюсы:** точное описание вложенных структур любой глубины; типобезопасные пути, ключи и разбор строк; ошибки ловятся при компиляции, а не в рантайме.
**Минусы:** жёсткие пределы (около 50 уровней обычной рекурсии и 1000 хвостовой); замедление компиляции и IDE; трудночитаемые сообщения об ошибках; неудачные вычисления тихо вырождаются в \`never\` или \`any\`.

## Как это спрашивают на собеседовании

**Главный вывод:** рекурсивные типы ссылаются сами на себя и описывают структуры любой глубины; рекурсивные условные типы позволяют вычислять типы в цикле. Обычная рекурсия упирается примерно в 50 уровней, хвостовая (вызов — весь результат ветки, результат в аккумуляторе) с TS 4.5 — в 1000 итераций.

Типичные формулировки: «Как описать тип JSON?», «Напишите \`DeepReadonly\`», «Что значит ошибка "Type instantiation is excessively deep"?», «Что такое tail-recursive conditional types?».

Что могут спросить следом:

- *Почему \`type A = A | string\` не компилируется, а \`type Json = Json[] | ...\` — да?* — Ссылка внутри массива или объекта отложена, а прямая требует знать тип до его вычисления.
- *Как сделать рекурсию хвостовой?* — Вынести результат в параметр-аккумулятор и сделать рекурсивный вызов всем результатом ветки, без \`|\`, spread или обёрток.
- *Какие пределы у компилятора?* — Глубина инстанциации 100 (примерно 50 уровней), 1000 итераций хвостовой рекурсии, 10 000 элементов кортежа, 5 миллионов инстанциаций.
- *Что не так с \`DeepReadonly\` из интернета?* — Он ломает функции, \`Date\` и \`Map\`, превращая методы в \`{}\`.
- *Где это встречается в Angular?* — В типизированных формах: \`form.get('a.b')\` разбирает путь рекурсивными типами.

### Ответ на 1 минуту

> Рекурсивный тип ссылается сам на себя — так описывают JSON, дерево меню или пишут \`DeepReadonly\`. Ссылка должна стоять внутри объекта или массива: объектные типы раскрываются лениво, а прямая самоссылка даёт ошибку. С TypeScript 4.1 условные типы тоже могут быть рекурсивными, и с \`infer\` и шаблонными литералами в типах можно считать: собирать кортежи, разбирать пути вроде \`'user.profile.title'\`, как это делают типизированные формы Angular. Предел — глубина инстанциации: обычная рекурсия падает примерно на пятидесяти уровнях с «Type instantiation is excessively deep». С TypeScript 4.5 есть оптимизация хвостовой рекурсии: если вызов — весь результат ветки, а промежуточный результат несётся в аккумуляторе, компилятор крутит цикл до тысячи итераций. Важно: наивный \`DeepReadonly\` ломает функции, \`Date\` и \`Map\`, а тяжёлые типы заметно тормозят IDE, поэтому применяю это умеренно.`,
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
      ru: `## В чём суть

Index signature (индексная сигнатура) — способ сказать «ключи заранее неизвестны»: \`{ [key: string]: number }\` значит «любая строка в качестве ключа, значение всегда число». \`keyof T\` делает обратное — даёт union всех известных ключей типа, а \`T[K]\` — тип значения по ключу. Проблема в том, что по умолчанию TypeScript **оптимист**: он считает, что по любому ключу словаря значение есть, а флаг \`noUncheckedIndexedAccess\` заставляет его быть честным.

Аналогия: гардероб. Index signature — табличка «на крючках висят куртки». TypeScript по умолчанию верит табличке буквально: какой номерок ни назови, «там куртка». В жизни крючок может быть пустым — и вы протягиваете руку в пустоту (\`undefined\`). \`keyof\` — это список номерков, которые точно выдавали. А \`noUncheckedIndexedAccess\` — честный гардеробщик: «по этому номерку может ничего не висеть, сначала проверьте».

**Какую проблему решает.** В реальных приложениях полно словарей с заранее неизвестными ключами: кэш пользователей по id, переводы, настройки, строки грида по ключу. Их нужно как-то типизировать — для этого index signature. \`keyof\` и \`T[K]\` позволяют писать обобщённые функции вроде «достань поле по имени» так, чтобы опечатка в имени ловилась компилятором. А понимание небезопасного доступа закрывает целый класс ошибок «Cannot read properties of undefined», которые компилятор по умолчанию пропускает.

## Словарик терминов

- **Index signature (индексная сигнатура)** — запись \`[key: string]: V\` внутри типа: «по любому ключу такого типа лежит значение типа \`V\`».
- **Словарь (dictionary, map-like объект)** — объект, ключи которого — данные (id, коды), а не заранее известные имена полей.
- **\`Record<K, V>\`** — встроенная утилита: объект с ключами \`K\` и значениями \`V\`. \`Record<string, V>\` — то же, что index signature; \`Record<'a' | 'b', V>\` — объект ровно с двумя полями.
- **\`keyof T\`** — оператор, который даёт union ключей типа: \`keyof { id: number; name: string }\` — \`'id' | 'name'\`.
- **Indexed access type \`T[K]\`** — тип значения по ключу: \`User['name']\` — \`string\`.
- **Ограничение дженерика \`K extends keyof T\`** — «параметр \`K\` может быть только одним из ключей \`T\`».
- **Литеральный и динамический ключ** — \`obj['id']\` (ключ известен при компиляции) против \`obj[key]\`, где \`key: string\` вычисляется в рантайме.
- **Сужение (narrowing)** — уточнение типа после проверки: после \`if (v !== undefined)\` внутри ветки \`v\` уже без \`undefined\`.
- **\`noUncheckedIndexedAccess\`** — флаг tsconfig: добавляет \`| undefined\` к результату доступа через index signature и по индексу массива. В \`strict\` не входит.
- **\`noPropertyAccessFromIndexSignature\`** — флаг tsconfig: запрещает обращаться к ключам из index signature через точку, только через \`['key']\`.
- **Шаблонная индексная сигнатура** — \`[key: \`data-\${string}\`]: string\`: ключи по шаблону (TypeScript 4.4+).
- **\`Map\`** — встроенная коллекция «ключ → значение»; её метод \`get\` честно возвращает \`V | undefined\`.
- **TS18048 / TS2532** — ошибки «'x' is possibly 'undefined'» и «Object is possibly 'undefined'»: компилятор требует проверку перед использованием.

## Как это работает под капотом

Что делает компилятор при объявлении и при доступе:

1. При объявлении \`{ [k: string]: number; name: string }\` он запоминает правило «любой строковый ключ → \`number\`» и проверяет, что **все явные свойства с ним совместимы**. \`name: string\` не совместим с \`number\` — ошибка TS2411.
2. При обращении \`obj.key\` или \`obj['key']\` он сначала ищет **объявленное свойство** с таким именем. Нашёл — возвращает его тип, никаких сомнений.
3. Если свойства нет, но есть подходящая index signature, он возвращает её тип значения \`V\` — **не проверяя**, существует ли ключ на самом деле. Это и есть оптимистичное допущение.
4. С флагом \`noUncheckedIndexedAccess\` на шаге 3 к результату добавляется \`| undefined\`. Шаг 2 флаг не трогает, поэтому известные свойства и известные позиции кортежа остаются без \`undefined\`.
5. Массив для компилятора — это объект с числовой index signature, поэтому \`arr[999]\` идёт по тому же пути, что и \`map['missing']\`.
6. \`keyof\` для явных свойств даёт union литералов, а для строковой index signature — \`string | number\`: в JS числовой ключ всё равно превращается в строку, так что \`obj[1]\` допустим там, где разрешены строковые ключи.

### Пример 1. \`keyof\` и \`T[K]\` — типобезопасный доступ по имени

\`\`\`ts
type Obj = { id: number; name: string };

type Keys = keyof Obj;            // 'id' | 'name'
type V = Obj['name'];             // string
type All = Obj[keyof Obj];        // number | string

function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const u = { id: 1, name: 'Ann' };
getProp(u, 'id');       // тип number
getProp(u, 'name');     // тип string
getProp(u, 'email');
// TS2345: Argument of type '"email"' is not assignable to parameter of type '"name" | "id"'.
\`\`\`

\`K extends keyof T\` не даёт передать несуществующий ключ, а \`T[K]\` связывает конкретный ключ с конкретным типом результата: для \`'id'\` вернётся \`number\`, а не размытое \`number | string\`. Это основа множества утилит: сортировка грида по колонке, \`pluck\`, типизированные селекторы.

### Пример 2. Index signature и правило совместимости

\`\`\`ts
interface Bad { [k: string]: number; name: string }
// TS2411: Property 'name' of type 'string' is not assignable to 'string' index type 'number'.

interface Ok { [k: string]: number | string; name: string; age: number }   // ok
\`\`\`

Правило логичное: \`obj['name']\` подпадает под «любой строковый ключ», значит, его тип обязан входить в тип значения сигнатуры. Если явные поля разнотипные, тип значения сигнатуры приходится расширять до union — и тогда \`obj['anything']\` тоже становится union.

### Какие ключи допустимы

\`\`\`ts
interface ById    { [id: number]: string }
interface BySym   { [s: symbol]: string }
interface DataAttrs { [k: \`data-\${string}\`]: string }
const d: DataAttrs = { 'data-id': '1', 'aria-label': 'x' };
// TS2353: Object literal may only specify known properties, and ''aria-label'' does not exist in type 'DataAttrs'.

interface Fixed { [k: 'a' | 'b']: number }
// TS1337: An index signature parameter type cannot be a literal type or generic type.
//   Consider using a mapped object type instead.
\`\`\`

Ключом сигнатуры может быть \`string\`, \`number\`, \`symbol\` или шаблон строки. Конкретные литералы — нельзя: для фиксированного набора ключей есть mapped type, то есть \`Record<'a' | 'b', number>\`.

### \`Record<K, V>\`: словарь или фиксированный объект

\`\`\`ts
const dict: Record<string, number> = {};        // это index signature
const fixed: Record<'a' | 'b', number> = { a: 1, b: 2 };   // это два обычных поля

dict['x'];    // number (с флагом — number | undefined)
fixed.a;      // number — и с флагом тоже number
\`\`\`

\`Record<string, T>\` — та же ловушка, что и index signature: это она и есть, просто в обёртке. А \`Record\` с union литералов — объект с известными полями: компилятор проверит, что все ключи заданы, и флаг к ним \`undefined\` не добавит.

### \`keyof\` у типа с index signature

\`\`\`ts
type KS = keyof { [k: string]: boolean };   // string | number
type KN = keyof { [k: number]: boolean };   // number

interface WithIdx { id: number; [k: string]: unknown }
type Om = Omit<WithIdx, 'x'>;
declare const om: Om;
om['id'];   // unknown — поле id потерялось
\`\`\`

\`keyof\` у типа с index signature даёт \`string | number\`, а не список конкретных ключей. Это неожиданно ломает mapped types: \`Omit\` строится через \`Exclude<keyof T, K>\` и mapped type по оставшимся ключам, а \`Exclude<string | number, 'x'>\` — снова \`string | number\`. В результате остаётся только сигнатура, и явное \`id: number\` растворяется в ней.

### Пример 3. Почему доступ по индексу небезопасен

\`\`\`ts
const map: Record<string, number> = {};

const x = map['missing'];  // TypeScript говорит: number
x.toFixed();               // компилируется, а в рантайме:
// TypeError: Cannot read properties of undefined (reading 'toFixed')

const arr: number[] = [1, 2];
const a = arr[999];        // number, хотя там undefined
const [first] = [] as number[];   // number, хотя массив пуст
\`\`\`

Компилятор не знает, какие ключи появятся в словаре во время работы программы, и выбирает удобство: «раз сигнатура говорит \`number\` — значит, \`number\`». То же с массивами: длина массива в типе не отслеживается, поэтому любой индекс «валиден».

### \`noUncheckedIndexedAccess\` — честный доступ

\`\`\`ts
// tsconfig: "noUncheckedIndexedAccess": true
const x2 = map['missing'];   // number | undefined
x2.toFixed();                // TS18048: 'x2' is possibly 'undefined'.
x2?.toFixed();               // ok

arr[999];                    // number | undefined
const [head] = arr;          // number | undefined

const tup: [number, string] = [1, 'a'];
tup[0];                      // number — известная позиция кортежа не затронута
const o: { id: number } = { id: 1 };
o.id;                        // number — известное свойство не затронуто
for (const v of arr) {}      // v: number — for...of не затронут
for (let i = 0; i < arr.length; i++) arr[i];   // number | undefined — индексный цикл затронут
\`\`\`

Флаг **не трогает доступ по известным ключам**: у обычного \`{ id: number }\` обращение \`o.id\` остаётся \`number\` — там сомнений нет. Он влияет только на путь через index signature. Отсюда практический совет: с флагом удобнее перебирать массивы через \`for...of\`, \`map\`, \`forEach\`, а не через индекс.

### Как правильно проверять

\`\`\`ts
function price(key: string) {
  const v = map[key];
  if (v !== undefined) v.toFixed();     // надёжно: проверили локальную переменную

  if (map[key] !== undefined) map[key].toFixed();   // ok с TS 5.5: key и map не переприсваиваются

  const w = map[key] ?? 0;              // number — значение по умолчанию
}

function trimmed(key: string) {
  key = key.trim();                     // ключ переприсвоен
  if (map[key] !== undefined) map[key].toFixed();
  // TS2532: Object is possibly 'undefined'.
}

if ('a' in map) map['a'].toFixed();     // ok: литеральный ключ сужается через in
function viaIn(key: string) {
  if (key in map) map[key].toFixed();   // TS2532 — с динамическим ключом in не сужает
}
\`\`\`

Самый надёжный приём — положить значение в локальную переменную и проверить её. С TypeScript 5.5 компилятор сужает и \`map[key]\`, если ни объект, ни ключ не переприсваиваются. Проверка \`in\` убирает \`undefined\` только для литерального ключа: с ключом-переменной она не помогает. \`??\` (nullish coalescing) подставляет значение по умолчанию, если слева \`null\` или \`undefined\`.

### \`Map\` как альтернатива словарю

\`\`\`ts
const cache = new Map<string, number>();
const hit = cache.get('a');   // number | undefined — без всяких флагов
\`\`\`

Для данных «ключ → значение» \`Map\` честен изначально: \`get\` возвращает \`V | undefined\`. Плюс у него нет проблемы с ключами вроде \`'__proto__'\` и \`'constructor'\`, сохраняется порядок вставки, а размер сразу доступен через \`size\`. Минус — \`Map\` не сериализуется в JSON напрямую.

### \`noPropertyAccessFromIndexSignature\`

\`\`\`ts
// tsconfig: "noPropertyAccessFromIndexSignature": true
const dict: Record<string, number> = { a: 1 };
dict.foo;
// TS4111: Property 'foo' comes from an index signature, so it must be accessed with ['foo'].
dict['foo'];   // ok
\`\`\`

Флаг делает различие видимым в коде: точка — «это настоящее поле», квадратные скобки — «это ключ словаря, его может не быть». Новый проект Angular CLI в strict-режиме включает его в \`tsconfig.json\`.

### \`Object.keys\` возвращает \`string[]\`, а не \`keyof T\`

\`\`\`ts
const user = { id: 1, name: 'Ann' };
Object.keys(user);            // string[]
for (const k of Object.keys(user)) user[k];
// TS7053: Element implicitly has an 'any' type because expression of type 'string'
//   can't be used to index type '{ id: number; name: string; }'.
\`\`\`

Типизация структурная: в переменную типа \`{ id: number }\` можно положить объект с лишними полями, поэтому TypeScript не может обещать, что ключей ровно \`keyof T\`. Если вы уверены в объекте, приводят явно: \`Object.keys(user) as (keyof typeof user)[]\`, но это ваше обещание, а не проверка.

### Числовые ключи — всё равно строки

\`\`\`ts
const o2: Record<number, string> = {};
o2[1] = 'one';
console.log(o2['1'], Object.keys(o2));   // 'one' [ '1' ]

interface Mixed { [k: string]: string; [i: number]: number }
// TS2413: 'number' index type 'number' is not assignable to 'string' index type 'string'.
\`\`\`

В JS \`obj[1]\` и \`obj['1']\` — одно и то же свойство, хотя TypeScript различает \`[key: number]\` и \`[key: string]\`. Поэтому числовая сигнатура обязана быть совместима со строковой.

### Где это применяется на практике

- **Кэши и нормализованное состояние**: сущности по id в сторах (NgRx, signal store) — \`Record<string, User>\`; без флага \`entities[id].name\` упадёт на удалённой записи, поэтому значение по ключу часто сразу описывают как \`User | undefined\`.
- **Большие гриды**: доступ к строке по ключу, к ячейке по имени колонки (\`row[column.field]\`), где \`field\` должен быть \`keyof Row\` — иначе опечатка в конфигурации колонки всплывёт только в рантайме.
- **i18n и настройки**: словари переводов и feature-флагов с ключами из JSON.
- **Формы**: \`FormRecord<FormControl<boolean>>\` в Angular — форма с динамическим набором контролов (например, чекбоксы по id), её \`controls\` — по сути index signature.
- **HTTP-слой**: заголовки, query-параметры, ответы вида \`{ [date: string]: number }\` для графиков и дашбордов.
- **Утилиты**: \`getProp\`, \`sortBy(key)\`, \`groupBy\`, \`pluck\` — всё на \`K extends keyof T\` и \`T[K]\`.

## Важные нюансы и подводные камни

- **\`Record<string, T>\` — та же ловушка, что и index signature.** Это она и есть, просто в обёртке; а \`Record<'a' | 'b', T>\` — уже фиксированный объект без этой проблемы.
- **Массивы тоже небезопасны**: \`arr[0]\` при пустом массиве даст \`undefined\`, а тип скажет обратное. Флаг покрывает и этот случай, включая деструктуризацию \`const [first] = arr\`.
- **\`noUncheckedIndexedAccess\` не входит в \`strict\`** — его включают отдельно.
- **Включение флага на существующем проекте даёт лавину ошибок** — обычно это правильные ошибки, но внедрять надо постепенно: начиная с новых модулей или отдельного tsconfig для части кода.
- **\`keyof\` у типа с index signature даёт \`string | number\`**, а не список конкретных ключей — это неожиданно ломает mapped types: \`Omit\` у такого типа теряет явные поля.
- **Проверка через \`in\` сужает тип только с литеральным ключом**: \`'a' in map\` убирает \`undefined\` у \`map['a']\`, а \`key in map\` с ключом-переменной — нет. Надёжнее положить значение в переменную и сравнить с \`undefined\`.
- **Сужение \`map[key]\` слетает при переприсваивании.** Если ключ или объект меняются (\`key = key.trim()\`), проверка \`map[key] !== undefined\` не работает.
- **Числовые ключи в JS всё равно строки**: \`obj[1]\` и \`obj['1']\` — одно и то же свойство, хотя TypeScript различает \`[key: number]\` и \`[key: string]\`.
- **\`Object.keys\` возвращает \`string[]\`** — из-за структурной типизации; приведение к \`keyof T\` — ваше обещание, а не проверка.
- **Флаги работают только при компиляции.** Данные с сервера могут прийти без ожидаемого ключа, и это ловит только рантайм-валидация.

**Плюсы:** index signature позволяет типизировать словари с заранее неизвестными ключами; \`keyof\` и \`T[K]\` дают типобезопасный доступ по имени; \`noUncheckedIndexedAccess\` закрывает класс ошибок \`undefined\`.
**Минусы:** по умолчанию доступ оптимистичен и врёт; флаг добавляет много проверок, особенно в индексных циклах; \`keyof\` у словарей размывается до \`string | number\` и ломает утилиты.

## Как это спрашивают на собеседовании

**Главный вывод:** index signature описывает объект с неизвестными ключами, \`keyof T\` даёт union ключей, \`T[K]\` — тип значения. По умолчанию доступ через сигнатуру и по индексу массива возвращает \`V\` без \`undefined\`, и это ложь; \`noUncheckedIndexedAccess\` делает результат \`V | undefined\`, не трогая известные ключи.

Типичные формулировки: «Что такое index signature?», «Как типизировать функцию \`get(obj, key)\`?», «Почему \`arr[10]\` имеет тип \`number\`?», «Что делает \`noUncheckedIndexedAccess\`?».

Что могут спросить следом:

- *Что вернёт \`keyof { [k: string]: X }\`?* — \`string | number\`, потому что числовые ключи в JS приводятся к строкам.
- *Входит ли \`noUncheckedIndexedAccess\` в \`strict\`?* — Нет, включается отдельно.
- *Чем \`Map\` лучше словаря-объекта?* — \`get\` честно возвращает \`V | undefined\`, нет конфликтов с ключами прототипа, есть \`size\` и порядок вставки.
- *Почему \`Object.keys\` не возвращает \`(keyof T)[]\`?* — Из-за структурной типизации у объекта могут быть лишние ключи.
- *Как убрать \`undefined\` после доступа?* — Проверить значение в локальной переменной, использовать \`??\`, \`in\` с литеральным ключом или \`for...of\` вместо индексного цикла.

### Ответ на 1 минуту

> Index signature описывает объект с заранее неизвестными ключами — \`{ [key: string]: V }\`; ключом может быть \`string\`, \`number\`, \`symbol\` или шаблон строки, и все явные свойства обязаны быть совместимы с типом значения. \`keyof T\` даёт union ключей, \`T[K]\` — тип значения по ключу, и вместе с \`K extends keyof T\` это даёт типобезопасный доступ, где опечатка в имени поля ловится компилятором. Проблема в том, что по умолчанию TypeScript считает любой ключ словаря существующим: \`map['missing']\` и \`arr[999]\` имеют тип \`V\`, а в рантайме там \`undefined\`. Флаг \`noUncheckedIndexedAccess\`, который не входит в \`strict\`, добавляет \`| undefined\` и заставляет проверять, при этом известные свойства и позиции кортежа он не трогает. Из нюансов: \`keyof\` у словаря — \`string | number\`, а для настоящих словарей я часто беру \`Map\`, у которого \`get\` честный сразу.`,
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
