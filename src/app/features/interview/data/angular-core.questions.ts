import { InterviewQuestion } from '../interfaces/question.interface';

export const ANGULAR_CORE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'ng-001',
    category: 'angular-core',
    level: 'Hard',
    tags: ['change-detection', 'zone-js', 'internals'],
    question: {
      ru: 'Как Zone.js обеспечивает работу change detection в Angular и что именно он патчит?',
      en: 'How does Zone.js power change detection in Angular, and what exactly does it monkey-patch?',
    },
    answer: {
      ru: `## Что делает Zone.js

Zone.js — это библиотека, которая через **monkey-patching** перехватывает все асинхронные API браузера: \`setTimeout\`, \`setInterval\`, \`addEventListener\`, \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\` и т.д. Она заменяет их обёртками, которые знают, в какой "зоне" (контексте выполнения) запущена операция.

## Связь с Angular

Angular создаёт собственную зону — \`NgZone\`. Она наследует \`Zone\` и эмитит события через хуки \`onMicrotaskEmpty\`, \`onStable\`, \`onUnstable\`. Когда любой асинхронный колбэк выполняется внутри \`NgZone\`, по завершении микрозадач Angular понимает: "что-то могло измениться" — и запускает \`ApplicationRef.tick()\`, который обходит дерево компонентов и выполняет change detection.

\`\`\`ts
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});
\`\`\`

## Важные нюансы

- Zone.js **не знает**, что именно изменилось — только что асинхронная операция завершилась. Поэтому CD проверяет всё дерево.
- Операции вне зоны (\`runOutsideAngular\`) не триггерят tick — это используется для оптимизации (анимации, частые события).
- Zone.js добавляет overhead на каждый async-вызов и увеличивает бандл (~30 КБ).

## Современность

В Angular 17+ доступен **zoneless** режим (\`provideZonelessChangeDetection()\`), где Zone.js не нужен вовсе — change detection триггерится через сигналы и \`markForCheck\`. Это будущее фреймворка: меньше бандл, точечный CD, лучше производительность.`,
      en: `## What Zone.js does

Zone.js is a library that, via **monkey-patching**, intercepts all browser async APIs: \`setTimeout\`, \`setInterval\`, \`addEventListener\`, \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\`, etc. It replaces them with wrappers that know which "zone" (execution context) the operation runs in.

## Link to Angular

Angular creates its own zone — \`NgZone\`. It extends \`Zone\` and emits events through the \`onMicrotaskEmpty\`, \`onStable\`, \`onUnstable\` hooks. When any async callback runs inside \`NgZone\`, once the microtask queue drains Angular concludes "something might have changed" and runs \`ApplicationRef.tick()\`, which walks the component tree and performs change detection.

\`\`\`ts
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});
\`\`\`

## Key nuances

- Zone.js **does not know** what changed — only that an async op finished. That is why CD checks the whole tree.
- Operations run outside the zone (\`runOutsideAngular\`) do not trigger a tick — used for optimization (animations, high-frequency events).
- Zone.js adds overhead to every async call and grows the bundle (~30 KB).

## Modern Angular

In Angular 17+ a **zoneless** mode exists (\`provideZonelessChangeDetection()\`) where Zone.js is unnecessary — change detection is triggered through signals and \`markForCheck\`. This is the framework's future: smaller bundle, targeted CD, better performance.`,
    },
    codeSnippet: `// How Angular wires NgZone to change detection
ngZone.onMicrotaskEmpty.subscribe(() => {
  appRef.tick(); // top-down CD pass after async work settles
});`,
  },
  {
    id: 'ng-002',
    category: 'angular-core',
    level: 'Medium',
    tags: ['change-detection', 'onpush'],
    question: {
      ru: 'Как работает стратегия ChangeDetectionStrategy.OnPush и когда компонент с ней проверяется?',
      en: 'How does ChangeDetectionStrategy.OnPush work and when is an OnPush component checked?',
    },
    answer: {
      ru: `## Суть OnPush

По умолчанию (\`Default\`) Angular проверяет компонент при каждом tick. С \`OnPush\` компонент помечается как "грязный" и проверяется **только** при наступлении одного из событий:

- Изменилась ссылка на любой \`@Input()\` (сравнение по \`===\`).
- В шаблоне компонента сработал event-binding (\`(click)\` и т.п.).
- Внутри сработал async pipe (он сам вызывает \`markForCheck\`).
- Явно вызван \`ChangeDetectorRef.markForCheck()\`.
- Сигнал, прочитанный в шаблоне, изменился (Angular 16+).

## Механика "грязного" флага

Каждый компонент имеет внутренний флаг. \`markForCheck()\` поднимается **вверх** по дереву от текущего компонента к корню, помечая всех предков как требующих проверки. Это нужно, потому что CD идёт сверху вниз — родитель должен "пропустить" проверку к ребёнку.

## Частая ошибка

Мутация объекта без смены ссылки **не** триггерит OnPush:

\`\`\`ts
// НЕ сработает при OnPush
this.user.name = 'New';
// Сработает — новая ссылка
this.user = { ...this.user, name: 'New' };
\`\`\`

## Производительность

OnPush + иммутабельность + сигналы — основной способ масштабировать большие приложения: CD пропускает целые поддеревья. В zoneless-режиме OnPush де-факто становится стандартом.`,
      en: `## The essence of OnPush

By default (\`Default\`) Angular checks a component on every tick. With \`OnPush\` the component is marked "dirty" and checked **only** when one of these happens:

- A reference of any \`@Input()\` changes (compared with \`===\`).
- An event binding fires in the component's template (\`(click)\`, etc.).
- An async pipe inside it emits (it calls \`markForCheck\` itself).
- \`ChangeDetectorRef.markForCheck()\` is called explicitly.
- A signal read in the template changes (Angular 16+).

## The dirty-flag mechanics

Each component holds an internal flag. \`markForCheck()\` walks **up** the tree from the current component to the root, marking all ancestors as needing a check. This is required because CD runs top-down — the parent must let the check "reach" the child.

## A common mistake

Mutating an object without changing the reference does **not** trigger OnPush:

\`\`\`ts
// Won't fire with OnPush
this.user.name = 'New';
// Will fire — new reference
this.user = { ...this.user, name: 'New' };
\`\`\`

## Performance

OnPush + immutability + signals is the primary way to scale large apps: CD skips entire subtrees. In zoneless mode OnPush effectively becomes the standard.`,
    },
    codeSnippet: `@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ user().name }}\`,
})
export class UserCardComponent {
  // Signal input — automatically marks the view dirty on change
  user = input.required<User>();
}`,
  },
  {
    id: 'ng-003',
    category: 'angular-core',
    level: 'Hard',
    tags: ['change-detection', 'change-detector-ref'],
    question: {
      ru: 'В чём разница между markForCheck(), detectChanges(), detach() и reattach() у ChangeDetectorRef?',
      en: 'What is the difference between markForCheck(), detectChanges(), detach() and reattach() on ChangeDetectorRef?',
    },
    answer: {
      ru: `## markForCheck()

Не запускает CD немедленно. Помечает компонент и **всех его предков** как "грязные", чтобы при ближайшем tick они были проверены. Используется с OnPush, когда данные изменились асинхронно вне Angular-зоны или вне input-цепочки.

## detectChanges()

Запускает CD **синхронно и немедленно** для данного компонента и его **потомков** (вниз). Не трогает предков. Полезно после ручного изменения в \`runOutsideAngular\` или в тестах. Опасно вызывать во время уже идущего CD — можно получить \`ExpressionChangedAfterItHasBeenChecked\`.

## detach()

Полностью **отсоединяет** компонент от дерева CD. Angular перестаёт его проверять, даже при tick. Используется для тяжёлых компонентов с собственным контролем обновления (например, дашборды с тысячами строк).

## reattach()

Возвращает отсоединённый компонент обратно в дерево CD.

## Типичный паттерн

\`\`\`ts
constructor(private cdr: ChangeDetectorRef) {
  this.cdr.detach();
}
ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();
    this.cdr.detectChanges(); // обновляем только когда нужно
  }, 1000);
}
\`\`\`

## Ключевое различие

- \`markForCheck\` — "проверь меня **позже**, при следующем tick" (вверх по дереву).
- \`detectChanges\` — "проверь меня **сейчас**" (вниз по дереву).

В мире сигналов эти ручные вызовы нужны реже: сигналы сами помечают view dirty.`,
      en: `## markForCheck()

Does not run CD immediately. Marks the component **and all its ancestors** as dirty so that on the next tick they get checked. Used with OnPush when data changes asynchronously outside the Angular zone or outside the input chain.

## detectChanges()

Runs CD **synchronously and immediately** for this component and its **descendants** (downward). Does not touch ancestors. Useful after a manual change inside \`runOutsideAngular\` or in tests. Dangerous to call during an ongoing CD — can produce \`ExpressionChangedAfterItHasBeenChecked\`.

## detach()

Fully **detaches** the component from the CD tree. Angular stops checking it even on tick. Used for heavy components with their own update control (e.g. dashboards with thousands of rows).

## reattach()

Returns a detached component back into the CD tree.

## A typical pattern

\`\`\`ts
constructor(private cdr: ChangeDetectorRef) {
  this.cdr.detach();
}
ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();
    this.cdr.detectChanges(); // update only when needed
  }, 1000);
}
\`\`\`

## The key distinction

- \`markForCheck\` — "check me **later**, on next tick" (walks up the tree).
- \`detectChanges\` — "check me **now**" (walks down the tree).

In the signals world these manual calls are needed less often: signals mark the view dirty themselves.`,
    },
    codeSnippet: `// markForCheck: schedule, walks UP. detectChanges: run now, walks DOWN.
this.cdr.markForCheck();   // check me on the next tick
this.cdr.detectChanges();  // check me and my children synchronously
this.cdr.detach();         // remove from CD tree entirely
this.cdr.reattach();       // put it back`,
  },
  {
    id: 'ng-004',
    category: 'angular-core',
    level: 'Hard',
    tags: ['change-detection', 'expressionchanged', 'debugging'],
    question: {
      ru: 'Почему возникает ошибка ExpressionChangedAfterItHasBeenCheckedError и как её правильно устранять?',
      en: 'Why does the ExpressionChangedAfterItHasBeenCheckedError occur and how do you fix it properly?',
    },
    answer: {
      ru: `## Причина

В **dev-режиме** Angular выполняет CD дважды подряд: первый проход применяет изменения, второй — проверяет, что значения в шаблоне **не изменились** между двумя проходами. Если значение, прочитанное в шаблоне, изменилось во время или после первого прохода CD, Angular кидает \`ExpressionChangedAfterItHasBeenCheckedError\`.

Это защита от нестабильного UI, где данные меняются "после рендера" в том же цикле, нарушая однонаправленный поток.

## Частые источники

- Изменение свойства внутри \`ngAfterViewInit\` — view уже проверена.
- Родитель меняет состояние ребёнка, а ребёнок меняет его обратно.
- Геттер в шаблоне, возвращающий разный объект каждый раз (например, \`new Date()\` или \`[...arr]\`).

## Неправильное решение

Вызвать \`detectChanges()\` или подавить ошибку — это маскировка симптома.

## Правильные решения

1. Перенести изменение в более ранний хук (\`ngOnInit\`) или в \`ngAfterViewInit\` через микрозадачу:

\`\`\`ts
ngAfterViewInit() {
  Promise.resolve().then(() => this.value = computed);
  // или this.cdr.detectChanges();
}
\`\`\`

2. Использовать сигналы — они откладывают чтение и устраняют большинство таких ошибок.
3. Избегать чистых геттеров, возвращающих новые ссылки в шаблоне.

## Нюанс

В **production** этой проверки нет — ошибка не выбрасывается, но баг (мигающий UI) остаётся. Поэтому игнорировать её нельзя.`,
      en: `## The cause

In **dev mode** Angular runs CD twice in a row: the first pass applies changes, the second verifies that template-bound values **did not change** between the two passes. If a value read in the template changed during or after the first CD pass, Angular throws \`ExpressionChangedAfterItHasBeenCheckedError\`.

It is a guard against unstable UI where data changes "after render" in the same cycle, breaking the unidirectional flow.

## Common sources

- Changing a property inside \`ngAfterViewInit\` — the view is already checked.
- A parent changes a child's state and the child changes it back.
- A getter in the template returning a different object each time (e.g. \`new Date()\` or \`[...arr]\`).

## The wrong fix

Calling \`detectChanges()\` or suppressing the error masks the symptom.

## Proper fixes

1. Move the change to an earlier hook (\`ngOnInit\`) or defer it in \`ngAfterViewInit\` via a microtask:

\`\`\`ts
ngAfterViewInit() {
  Promise.resolve().then(() => this.value = computed);
  // or this.cdr.detectChanges();
}
\`\`\`

2. Use signals — they defer reads and eliminate most of these errors.
3. Avoid impure getters returning new references in the template.

## Nuance

In **production** this check is absent — the error is not thrown, but the bug (flickering UI) remains. So it must not be ignored.`,
    },
    codeSnippet: `// Defer the change out of the just-checked pass
ngAfterViewInit() {
  Promise.resolve().then(() => (this.label = this.computeLabel()));
}`,
  },
  {
    id: 'ng-005',
    category: 'angular-core',
    level: 'Hard',
    tags: ['signals', 'computed', 'internals'],
    question: {
      ru: 'Как устроен граф зависимостей сигналов и что значит "glitch-free" распространение?',
      en: 'How is the signal dependency graph built and what does "glitch-free" propagation mean?',
    },
    answer: {
      ru: `## Граф сигналов

Сигналы образуют **направленный граф зависимостей**. \`signal()\` — это producer (источник). \`computed()\` и \`effect()\` — consumers, которые автоматически отслеживают, какие сигналы они читают во время выполнения. Когда producer меняется, все зависящие от него consumers помечаются как "stale" (устаревшие).

## Push/pull модель

Angular использует гибридную модель:
- **Push**: при записи в сигнал зависимые узлы помечаются грязными (распространение "вниз" по графу).
- **Pull**: фактическое перевычисление \`computed\` происходит **лениво**, только когда его значение читают.

\`computed\` кэширует результат и пересчитывается, только если реально изменился один из его источников (мемоизация).

## Glitch-free

"Glitch" — это промежуточное **некорректное** состояние, когда consumer видит частично обновлённый набор зависимостей. Пример: \`c = a + b\`, и \`a\`, \`b\` оба производные от одного источника. При наивной реализации \`c\` мог бы пересчитаться дважды или с рассогласованными \`a\` и \`b\`.

Angular гарантирует **glitch-free**: благодаря ленивому pull и версионированию (\`version\` счётчик у каждого узла) \`computed\` всегда читает согласованный снимок и пересчитывается **ровно один раз** на каждое реальное изменение.

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // всегда согласован
\`\`\`

## Эффекты

\`effect()\` выполняется асинхронно (в конце CD), батчингом нескольких изменений в один прогон — это тоже часть glitch-free дизайна.`,
      en: `## The signal graph

Signals form a **directed dependency graph**. \`signal()\` is a producer (source). \`computed()\` and \`effect()\` are consumers that automatically track which signals they read during execution. When a producer changes, all dependent consumers are marked "stale".

## Push/pull model

Angular uses a hybrid model:
- **Push**: writing to a signal marks dependent nodes dirty (propagation "down" the graph).
- **Pull**: the actual recomputation of a \`computed\` happens **lazily**, only when its value is read.

\`computed\` caches its result and recomputes only if one of its sources actually changed (memoization).

## Glitch-free

A "glitch" is an intermediate **incorrect** state where a consumer sees a partially updated set of dependencies. Example: \`c = a + b\` where \`a\` and \`b\` both derive from one source. A naive implementation could recompute \`c\` twice or with inconsistent \`a\` and \`b\`.

Angular guarantees **glitch-free**: thanks to lazy pull and versioning (a \`version\` counter per node), a \`computed\` always reads a consistent snapshot and recomputes **exactly once** per real change.

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // always consistent
\`\`\`

## Effects

\`effect()\` runs asynchronously (at the end of CD), batching several changes into one run — also part of the glitch-free design.`,
    },
    codeSnippet: `const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // recomputes exactly once, never glitches
a.set(5);
c(); // 15, consistent snapshot`,
  },
  {
    id: 'ng-006',
    category: 'angular-core',
    level: 'Medium',
    tags: ['signals', 'effect', 'computed'],
    question: {
      ru: 'Когда использовать computed, а когда effect? Какие подводные камни у effect?',
      en: 'When should you use computed versus effect, and what are the pitfalls of effect?',
    },
    answer: {
      ru: `## computed — для производных значений

\`computed\` создаёт **новое значение**, выведенное из других сигналов. Оно чистое, мемоизированное, ленивое, без побочных эффектов. Если вам нужно "получить X из Y" — это \`computed\`.

\`\`\`ts
const fullName = computed(() => \`\${first()} \${last()}\`);
\`\`\`

## effect — для побочных эффектов

\`effect\` выполняет **сайд-эффект** при изменении читаемых сигналов: логирование, синхронизация с localStorage, ручная работа с DOM, интеграция со сторонними библиотеками.

## Подводные камни effect

- **Нельзя писать в сигналы по умолчанию**: внутри effect запись в сигнал кидает ошибку (риск бесконечного цикла). Можно разрешить через \`allowSignalWrites\` (устарело в новых версиях) или лучше — переосмыслить дизайн через \`computed\`/\`linkedSignal\`.
- **Контекст инъекции**: effect должен создаваться в injection-контексте (конструктор, поле, или с \`injector\`), иначе ошибка.
- **Очистка**: effect получает \`onCleanup\` для отмены подписок/таймеров перед следующим запуском.
- **Тайминг**: effect выполняется асинхронно после CD, а не синхронно при записи.

\`\`\`ts
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

## Главное правило

Если тянет записать сигнал внутри \`effect\` — почти всегда это должен быть \`computed\` или \`linkedSignal\`. \`effect\` — только для "выхода" из реактивного мира во внешний.`,
      en: `## computed — for derived values

\`computed\` creates a **new value** derived from other signals. It is pure, memoized, lazy, side-effect-free. If you need "get X from Y" — that is \`computed\`.

\`\`\`ts
const fullName = computed(() => \`\${first()} \${last()}\`);
\`\`\`

## effect — for side effects

\`effect\` runs a **side effect** when the signals it reads change: logging, syncing to localStorage, manual DOM work, integrating third-party libraries.

## Pitfalls of effect

- **Writing to signals is disallowed by default**: writing a signal inside an effect throws (risk of an infinite loop). It can be allowed via \`allowSignalWrites\` (deprecated in newer versions) or, better, rethink the design with \`computed\`/\`linkedSignal\`.
- **Injection context**: an effect must be created in an injection context (constructor, field, or with an \`injector\`), otherwise it errors.
- **Cleanup**: an effect receives \`onCleanup\` to cancel subscriptions/timers before the next run.
- **Timing**: an effect runs asynchronously after CD, not synchronously on write.

\`\`\`ts
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

## The golden rule

If you feel the urge to write a signal inside \`effect\`, it should almost always be a \`computed\` or \`linkedSignal\`. \`effect\` is only for "exiting" the reactive world into the outside.`,
    },
    codeSnippet: `effect((onCleanup) => {
  const id = setInterval(() => save(state()), 1000);
  onCleanup(() => clearInterval(id)); // runs before next execution / on destroy
});`,
  },
  {
    id: 'ng-007',
    category: 'angular-core',
    level: 'Expert',
    tags: ['signals', 'zoneless', 'change-detection'],
    question: {
      ru: 'Как работает zoneless change detection и как сигналы триггерят обновление без Zone.js?',
      en: 'How does zoneless change detection work and how do signals trigger updates without Zone.js?',
    },
    answer: {
      ru: `## Идея zoneless

В zoneless-режиме (\`provideZonelessChangeDetection()\`) Angular **не использует** Zone.js. Вместо "проверять всё при любой async-операции" фреймворк точно знает, **какие** компоненты нуждаются в обновлении.

## Как триггерится CD

Источники, которые помечают view "грязным":
- Изменение **сигнала**, прочитанного в шаблоне.
- Срабатывание event-listener в шаблоне.
- \`markForCheck()\` / async pipe / \`AsyncPipe\`.
- Установка нового значения signal-input.

Под капотом каждый сигнал, прочитанный в шаблоне, связывается с \`LView\` компонента через **reactive consumer**. При записи сигнала consumer вызывает \`markViewDirty\`, и Angular планирует CD через \`scheduler\` (микрозадача / \`requestAnimationFrame\`-подобный механизм).

## Coalescing

Несколько изменений в одном тике **батчатся** в один проход CD — это \`ChangeDetectionScheduler\`, который дебаунсит запросы на обновление.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

## Что меняется для разработчика

- Код, мутирующий состояние **вне сигналов** (обычные поля), больше не вызывает CD автоматически — нужны сигналы или явный \`markForCheck\`.
- \`setTimeout\`/\`Promise\` сами по себе CD не запускают.
- Меньше бандл (нет ~30 КБ Zone.js), меньше overhead, предсказуемый, точечный CD.

## Статус

С Angular 18 zoneless вышел в developer preview, в 19-20 стабилизируется. Это стратегическое направление: сигналы + OnPush + zoneless = новая модель производительности Angular.`,
      en: `## The zoneless idea

In zoneless mode (\`provideZonelessChangeDetection()\`) Angular does **not** use Zone.js. Instead of "check everything on any async op", the framework knows precisely **which** components need updating.

## How CD is triggered

Sources that mark a view dirty:
- A change to a **signal** read in the template.
- A template event-listener firing.
- \`markForCheck()\` / async pipe / \`AsyncPipe\`.
- A new value set on a signal input.

Under the hood every signal read in a template is linked to the component's \`LView\` via a **reactive consumer**. On a signal write the consumer calls \`markViewDirty\`, and Angular schedules CD through a \`scheduler\` (microtask / \`requestAnimationFrame\`-like mechanism).

## Coalescing

Multiple changes in one tick are **batched** into a single CD pass — the \`ChangeDetectionScheduler\` debounces update requests.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

## What changes for the developer

- Code mutating state **outside signals** (plain fields) no longer triggers CD automatically — you need signals or an explicit \`markForCheck\`.
- \`setTimeout\`/\`Promise\` alone do not start CD.
- Smaller bundle (no ~30 KB Zone.js), less overhead, predictable, targeted CD.

## Status

As of Angular 18 zoneless is in developer preview, stabilizing in 19-20. It is a strategic direction: signals + OnPush + zoneless = Angular's new performance model.`,
    },
    codeSnippet: `bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
// No Zone.js: signals + markForCheck drive targeted, coalesced CD.`,
  },
  {
    id: 'ng-008',
    category: 'angular-core',
    level: 'Hard',
    tags: ['signals', 'input', 'model', 'output'],
    question: {
      ru: 'Чем signal-based input()/model()/output() отличаются от классических декораторов @Input/@Output?',
      en: 'How do signal-based input()/model()/output() differ from the classic @Input/@Output decorators?',
    },
    answer: {
      ru: `## input()

\`input()\` — это сигнал, доступный только для чтения, представляющий входное свойство. В отличие от \`@Input()\`:
- Значение читается как \`this.value()\`, реактивно — можно подставлять в \`computed\`.
- Нет необходимости в \`ngOnChanges\`: производные значения делаются через \`computed\`.
- \`input.required<T>()\` гарантирует обязательность на этапе компиляции.
- Поддерживает трансформацию: \`input(false, { transform: booleanAttribute })\`.

\`\`\`ts
size = input<number>(10);
double = computed(() => this.size() * 2);
\`\`\`

## model()

\`model()\` — это **two-way** сигнал, объединяющий input и output. Создаёт \`prop\` и неявный \`propChange\`, что позволяет писать \`[(prop)]\` в родителе. Это writable-сигнал: внутри компонента можно \`this.value.set(...)\`, и изменение пробросится наверх.

\`\`\`ts
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

## output()

\`output()\` — замена \`@Output() EventEmitter\`. Возвращает объект с методом \`emit\`. Не является сигналом и не наследует \`EventEmitter\`/\`Subject\` — это намеренно более лёгкая абстракция. Есть \`outputFromObservable\` / \`outputToObservable\` для интеропа с RxJS.

## Преимущества

- Полная типобезопасность и реактивность из коробки.
- В zoneless/OnPush изменение signal-input **автоматически** помечает view грязным — не нужен \`markForCheck\`.
- Меньше шаблонного кода, нет \`SimpleChanges\`.

## Нюанс

Сигнальные input доступны только в standalone-стиле и требуют Angular 17.1+. Старый \`@Input\` остаётся для совместимости.`,
      en: `## input()

\`input()\` is a read-only signal representing an input property. Unlike \`@Input()\`:
- The value is read as \`this.value()\`, reactively — usable inside \`computed\`.
- No need for \`ngOnChanges\`: derived values are made with \`computed\`.
- \`input.required<T>()\` enforces requiredness at compile time.
- Supports transforms: \`input(false, { transform: booleanAttribute })\`.

\`\`\`ts
size = input<number>(10);
double = computed(() => this.size() * 2);
\`\`\`

## model()

\`model()\` is a **two-way** signal combining input and output. It creates a \`prop\` and an implicit \`propChange\`, enabling \`[(prop)]\` in the parent. It is a writable signal: inside the component you can \`this.value.set(...)\` and the change propagates upward.

\`\`\`ts
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

## output()

\`output()\` replaces \`@Output() EventEmitter\`. It returns an object with an \`emit\` method. It is not a signal and does not extend \`EventEmitter\`/\`Subject\` — deliberately a lighter abstraction. \`outputFromObservable\` / \`outputToObservable\` exist for RxJS interop.

## Advantages

- Full type safety and reactivity out of the box.
- In zoneless/OnPush a signal-input change **automatically** marks the view dirty — no \`markForCheck\` needed.
- Less boilerplate, no \`SimpleChanges\`.

## Nuance

Signal inputs are standalone-style only and require Angular 17.1+. The old \`@Input\` remains for compatibility.`,
    },
    codeSnippet: `@Component({ selector: 'app-toggle', template: '...' })
export class ToggleComponent {
  value = input.required<number>();      // read-only signal input
  checked = model(false);                // two-way: [(checked)]
  changed = output<number>();            // replaces @Output EventEmitter
  doubled = computed(() => this.value() * 2);
}`,
  },
  {
    id: 'ng-009',
    category: 'angular-core',
    level: 'Expert',
    tags: ['signals', 'linked-signal', 'resource'],
    question: {
      ru: 'Зачем нужны linkedSignal и resource()? Какие проблемы они решают?',
      en: 'Why do linkedSignal and resource() exist, and what problems do they solve?',
    },
    answer: {
      ru: `## Проблема, которую решает linkedSignal

Иногда нужно состояние, которое **производно** от другого сигнала, но при этом **локально записываемо**. Классический пример: выбранный элемент в списке, который сбрасывается при смене списка, но может меняться пользователем. \`computed\` нельзя записать, обычный \`signal\` не реагирует на источник. \`linkedSignal\` решает это:

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // можно писать
\`\`\`

При изменении \`source\` значение пересчитывается, но между изменениями ведёт себя как writable-сигнал.

## resource()

\`resource()\` — реактивная обёртка над **асинхронной** загрузкой данных. Принимает \`request\` (сигнал параметров) и \`loader\` (async-функцию). При изменении \`request\` автоматически перезапускает загрузку, отменяя предыдущую через \`AbortSignal\`.

\`\`\`ts
const userId = signal(1);
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) =>
    fetch(\`/api/users/\${request.id}\`, { signal: abortSignal })
      .then(r => r.json()),
});
// userResource.value(), .status(), .error(), .isLoading()
\`\`\`

## Что даёт resource

- Состояния \`idle | loading | resolved | error\` из коробки.
- Автоматическая отмена устаревших запросов (race conditions).
- Реактивная зависимость от сигналов-параметров.
- \`rxResource\` для интеграции с RxJS.

## Статус

Обе API экспериментальные (Angular 19+), но это направление "реактивных данных" без ручного управления подписками.`,
      en: `## The problem linkedSignal solves

Sometimes you need state that is **derived** from another signal yet **locally writable**. The classic example: a selected item in a list that resets when the list changes but can be changed by the user. \`computed\` is not writable, a plain \`signal\` does not react to the source. \`linkedSignal\` solves this:

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // writable
\`\`\`

When \`source\` changes the value is recomputed, but between changes it behaves like a writable signal.

## resource()

\`resource()\` is a reactive wrapper over **async** data loading. It takes a \`request\` (a signal of parameters) and a \`loader\` (an async function). When \`request\` changes it automatically restarts loading, cancelling the previous one via \`AbortSignal\`.

\`\`\`ts
const userId = signal(1);
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) =>
    fetch(\`/api/users/\${request.id}\`, { signal: abortSignal })
      .then(r => r.json()),
});
// userResource.value(), .status(), .error(), .isLoading()
\`\`\`

## What resource gives you

- \`idle | loading | resolved | error\` states out of the box.
- Automatic cancellation of stale requests (race conditions).
- Reactive dependency on parameter signals.
- \`rxResource\` for RxJS integration.

## Status

Both APIs are experimental (Angular 19+), but they represent the "reactive data" direction without manual subscription management.`,
    },
    codeSnippet: `const userId = signal(1);
const user = resource({
  request: () => ({ id: userId() }),
  loader: ({ request, abortSignal }) =>
    fetch(\`/api/users/\${request.id}\`, { signal: abortSignal }).then(r => r.json()),
});
// user.value() | user.isLoading() | user.error() | user.status()`,
  },
  {
    id: 'ng-010',
    category: 'angular-core',
    level: 'Hard',
    tags: ['dependency-injection', 'hierarchical-injectors', 'internals'],
    question: {
      ru: 'Как устроена иерархия инжекторов в Angular: ElementInjector против EnvironmentInjector?',
      en: 'How is the injector hierarchy structured in Angular: ElementInjector vs EnvironmentInjector?',
    },
    answer: {
      ru: `## Две параллельные иерархии

Angular имеет **две** иерархии инжекторов:

### 1. EnvironmentInjector (бывший ModuleInjector)
Дерево, связанное с приложением и lazy-загруженными участками роутера. Корень — \`root\` (\`providedIn: 'root'\`), \`platform\`, \`null\`. Провайдеры здесь: \`providedIn\`, \`providers\` в \`bootstrapApplication\`, \`providers\` lazy-роутов. Эти провайдеры **синглтоны** в рамках своего environment.

### 2. ElementInjector
Дерево, связанное с **DOM-элементами** и компонентами/директивами. Каждый компонент со своими \`providers: [...]\` создаёт узел. Иерархия повторяет структуру шаблона.

## Алгоритм резолвинга

При \`inject(Token)\` Angular ищет так:
1. Сначала вверх по **ElementInjector** дереву (от текущего элемента к корневому компоненту).
2. Если не нашёл — переходит в **EnvironmentInjector** дерево и идёт вверх до \`root\` и \`platform\`.
3. Если нигде нет — \`NullInjectorError\` (или \`null\` при \`@Optional\`).

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (merge point)
EnvironmentInjector (route) → root → platform → null
\`\`\`

## Практические следствия

- \`providers\` в \`@Component\` создаёт **новый экземпляр на каждый инстанс компонента** — это для scoped-сервисов (например, состояние формы).
- \`providedIn: 'root'\` — синглтон, tree-shakable.
- Резолюция всегда **первое совпадение снизу вверх**, что позволяет переопределять сервисы локально.

Понимание двух деревьев — ключ к отладке "почему получаю не тот инстанс сервиса".`,
      en: `## Two parallel hierarchies

Angular has **two** injector hierarchies:

### 1. EnvironmentInjector (formerly ModuleInjector)
A tree tied to the application and lazy-loaded router segments. The root chain is \`root\` (\`providedIn: 'root'\`), \`platform\`, \`null\`. Providers here: \`providedIn\`, \`providers\` in \`bootstrapApplication\`, \`providers\` of lazy routes. These providers are **singletons** within their environment.

### 2. ElementInjector
A tree tied to **DOM elements** and components/directives. Each component with its own \`providers: [...]\` creates a node. The hierarchy mirrors the template structure.

## Resolution algorithm

On \`inject(Token)\` Angular searches like this:
1. First up the **ElementInjector** tree (from the current element to the root component).
2. If not found — it moves into the **EnvironmentInjector** tree and walks up to \`root\` and \`platform\`.
3. If nowhere — \`NullInjectorError\` (or \`null\` with \`@Optional\`).

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (merge point)
EnvironmentInjector (route) → root → platform → null
\`\`\`

## Practical consequences

- \`providers\` in \`@Component\` create a **new instance per component instance** — for scoped services (e.g. form state).
- \`providedIn: 'root'\` is a singleton, tree-shakable.
- Resolution is always the **first match bottom-up**, which lets you override services locally.

Understanding the two trees is key to debugging "why am I getting the wrong service instance".`,
    },
    codeSnippet: `@Component({
  selector: 'app-form',
  providers: [FormStateService], // new instance per component (ElementInjector)
})
export class FormComponent {
  private state = inject(FormStateService);
  private config = inject(APP_CONFIG); // resolved up to root EnvironmentInjector
}`,
  },
  {
    id: 'ng-011',
    category: 'angular-core',
    level: 'Hard',
    tags: ['dependency-injection', 'resolution-modifiers'],
    question: {
      ru: 'Что делают модификаторы резолвинга @Self, @SkipSelf, @Optional и @Host?',
      en: 'What do the resolution modifiers @Self, @SkipSelf, @Optional and @Host do?',
    },
    answer: {
      ru: `## @Optional

Если зависимость не найдена — вернуть \`null\` вместо выброса \`NullInjectorError\`. Полезно для опциональных сервисов и токенов конфигурации.

## @Self

Искать токен **только** в собственном ElementInjector текущего компонента/директивы, не поднимаясь выше. Если не найдено — ошибка (или \`null\` c \`@Optional\`). Применяется, когда сервис обязан быть предоставлен локально.

## @SkipSelf

**Пропустить** собственный инжектор и начать поиск с родительского. Классический паттерн — singleton-guard модуля или доступ к родительскому экземпляру сервиса, когда текущий компонент сам его переопределяет.

## @Host

Ограничить поиск **границей host-компонента**. Поиск идёт вверх по ElementInjector, но **останавливается** на компоненте, который является хостом текущей директивы/контента (не выходя в родительский компонент). Важно для директив, спроецированных через \`ng-content\`.

## Функциональный синтаксис (inject)

\`\`\`ts
const logger = inject(LoggerService, { optional: true });
const parent = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });
\`\`\`

## Комбинации

Модификаторы комбинируются: типичный \`@Optional() @SkipSelf()\` в конструкторе родительского сервиса предотвращает повторную загрузку модуля:

\`\`\`ts
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

Эти модификаторы дают точный контроль над тем, **где** и **как глубоко** Angular ищет зависимость.`,
      en: `## @Optional

If the dependency is not found — return \`null\` instead of throwing \`NullInjectorError\`. Useful for optional services and config tokens.

## @Self

Look up the token **only** in the current component/directive's own ElementInjector, without going higher. If not found — error (or \`null\` with \`@Optional\`). Used when a service must be provided locally.

## @SkipSelf

**Skip** the own injector and start searching from the parent. A classic pattern is a module singleton-guard, or accessing the parent instance of a service when the current component overrides it.

## @Host

Limit the search to the **host component boundary**. The search walks up the ElementInjector but **stops** at the component that is the host of the current directive/content (not entering the parent component). Important for directives projected through \`ng-content\`.

## Functional syntax (inject)

\`\`\`ts
const logger = inject(LoggerService, { optional: true });
const parent = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });
\`\`\`

## Combinations

Modifiers combine: the typical \`@Optional() @SkipSelf()\` in a parent service's constructor prevents reloading a module:

\`\`\`ts
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

These modifiers give precise control over **where** and **how deep** Angular searches for a dependency.`,
    },
    codeSnippet: `constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule is already loaded');
}

// Functional equivalent
const ctrl = inject(NgControl, { self: true, optional: true });`,
  },
  {
    id: 'ng-012',
    category: 'angular-core',
    level: 'Medium',
    tags: ['dependency-injection', 'injection-token', 'multi-providers'],
    question: {
      ru: 'Зачем нужен InjectionToken и как работают multi-провайдеры?',
      en: 'Why do you need InjectionToken and how do multi-providers work?',
    },
    answer: {
      ru: `## InjectionToken

DI Angular использует токены как ключи. Для классов ключ — сам класс. Но для **не-классовых** значений (строки, конфиги, функции, интерфейсы) нужен \`InjectionToken\` — уникальный объект-ключ, который нельзя спутать.

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);
\`\`\`

Интерфейсы нельзя использовать как токены — TypeScript-интерфейсы стираются при компиляции, поэтому \`InjectionToken\` обязателен для них.

## Multi-провайдеры

Флаг \`multi: true\` позволяет **нескольким** провайдерам регистрироваться под **одним** токеном. При инъекции возвращается **массив** всех значений.

\`\`\`ts
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

## Где используется

- \`HTTP_INTERCEPTORS\` — цепочка интерсепторов.
- \`APP_INITIALIZER\` — несколько инициализаторов при старте.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — кастомные валидаторы форм.
- Плагины: несколько модулей добавляют свои обработчики.

## Нюанс

Все провайдеры под одним токеном должны быть **либо все multi, либо все не-multi** — смешивание выбрасывает ошибку. \`multi\` — это механизм расширяемости: каркас определяет токен, а фичи добавляют реализации, не зная друг о друге.`,
      en: `## InjectionToken

Angular DI uses tokens as keys. For classes the key is the class itself. But for **non-class** values (strings, configs, functions, interfaces) you need an \`InjectionToken\` — a unique key object that cannot be confused.

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);
\`\`\`

Interfaces cannot be tokens — TypeScript interfaces are erased at compile time, so an \`InjectionToken\` is mandatory for them.

## Multi-providers

The \`multi: true\` flag lets **several** providers register under **one** token. On injection an **array** of all values is returned.

\`\`\`ts
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

## Where it is used

- \`HTTP_INTERCEPTORS\` — the interceptor chain.
- \`APP_INITIALIZER\` — several startup initializers.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — custom form validators.
- Plugins: multiple modules add their own handlers.

## Nuance

All providers under one token must be **either all multi or all non-multi** — mixing throws. \`multi\` is an extensibility mechanism: the framework defines the token and features add implementations without knowing about each other.`,
    },
    codeSnippet: `export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

// Multi-provider chain
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }`,
  },
  {
    id: 'ng-013',
    category: 'angular-core',
    level: 'Medium',
    tags: ['dependency-injection', 'inject', 'modern-angular'],
    question: {
      ru: 'Чем функция inject() лучше инъекции через конструктор и где её можно вызывать?',
      en: 'How is the inject() function better than constructor injection and where can it be called?',
    },
    answer: {
      ru: `## Что такое inject()

\`inject()\` — функция, получающая зависимость из текущего **injection-контекста** без объявления её в конструкторе.

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);
  private url = inject(API_URL);
}
\`\`\`

## Преимущества

- **Меньше boilerplate**: не нужны длинные конструкторы и \`private\` модификаторы.
- **Наследование**: подклассам не нужно пробрасывать зависимости родителя через \`super(...)\`.
- **Переиспользуемые функции**: можно вынести логику инъекции в helper-функции (\`injectRouterParams()\`), что невозможно с конструктором.
- **Лучшая типизация** опций: \`inject(Token, { optional: true })\`.
- Работает с дженериками и абстрактными базовыми классами чище.

## Где можно вызывать

\`inject()\` работает **только в injection-контексте**:
- Инициализаторы полей класса.
- Конструктор.
- Фабрики провайдеров (\`useFactory\`, \`factory\` в \`InjectionToken\`).
- Функции, вызванные из \`runInInjectionContext(injector, fn)\`.
- Гварды, резолверы, интерсепторы (они выполняются в контексте).

Вне контекста (например, в обычном колбэке или \`setTimeout\`) — ошибка \`NG0203\`.

\`\`\`ts
constructor() {
  setTimeout(() => inject(Foo)); // ОШИБКА: вне контекста
}
\`\`\`

## Обход

Сохранить \`Injector\` и использовать \`runInInjectionContext\`:

\`\`\`ts
private injector = inject(Injector);
later() {
  runInInjectionContext(this.injector, () => inject(Foo));
}
\`\`\`

\`inject()\` — рекомендованный стиль в современном Angular.`,
      en: `## What inject() is

\`inject()\` is a function that retrieves a dependency from the current **injection context** without declaring it in the constructor.

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);
  private url = inject(API_URL);
}
\`\`\`

## Advantages

- **Less boilerplate**: no long constructors or \`private\` modifiers.
- **Inheritance**: subclasses do not need to forward parent dependencies through \`super(...)\`.
- **Reusable functions**: injection logic can be extracted into helper functions (\`injectRouterParams()\`), impossible with the constructor.
- **Better typed** options: \`inject(Token, { optional: true })\`.
- Works more cleanly with generics and abstract base classes.

## Where it can be called

\`inject()\` works **only in an injection context**:
- Class field initializers.
- The constructor.
- Provider factories (\`useFactory\`, \`factory\` in \`InjectionToken\`).
- Functions run through \`runInInjectionContext(injector, fn)\`.
- Guards, resolvers, interceptors (they run in context).

Outside the context (e.g. in a plain callback or \`setTimeout\`) — error \`NG0203\`.

\`\`\`ts
constructor() {
  setTimeout(() => inject(Foo)); // ERROR: outside context
}
\`\`\`

## Workaround

Save the \`Injector\` and use \`runInInjectionContext\`:

\`\`\`ts
private injector = inject(Injector);
later() {
  runInInjectionContext(this.injector, () => inject(Foo));
}
\`\`\`

\`inject()\` is the recommended style in modern Angular.`,
    },
    codeSnippet: `export class UserService {
  private http = inject(HttpClient);
  private injector = inject(Injector);

  later() {
    runInInjectionContext(this.injector, () => inject(SomeService));
  }
}`,
  },
  {
    id: 'ng-014',
    category: 'angular-core',
    level: 'Hard',
    tags: ['lifecycle-hooks', 'order', 'internals'],
    question: {
      ru: 'В каком порядке вызываются хуки жизненного цикла и когда срабатывает каждый?',
      en: 'In what order are lifecycle hooks called and when does each one fire?',
    },
    answer: {
      ru: `## Порядок при инициализации

1. **constructor** — DI, ещё нет инпутов и view.
2. **ngOnChanges** — при наличии \`@Input\`, перед \`ngOnInit\` и на каждом изменении инпута (даёт \`SimpleChanges\`).
3. **ngOnInit** — один раз, после первого \`ngOnChanges\`. Инпуты уже установлены.
4. **ngDoCheck** — на каждом CD, кастомная проверка изменений.
5. **ngAfterContentInit** — один раз, после проекции контента (\`ng-content\`).
6. **ngAfterContentChecked** — на каждом CD после проверки контента.
7. **ngAfterViewInit** — один раз, после инициализации **собственного view и дочерних**. Здесь доступны \`@ViewChild\`.
8. **ngAfterViewChecked** — на каждом CD после проверки view.

## При уничтожении

9. **ngOnDestroy** — отписки, очистка ресурсов.

## Ключевые нюансы

- **Content vs View**: content — это спроецированные дети (\`<ng-content>\`); view — собственный шаблон. Content инициализируется **раньше** view.
- **Дочерние раньше**: \`ngAfterViewInit\` родителя срабатывает **после** \`ngAfterViewInit\` детей (восходящий порядок для view-хуков).
- \`@ViewChild\` доступен в \`ngAfterViewInit\`, **не** в \`ngOnInit\` (если \`static: false\`). Со \`static: true\` — уже в \`ngOnInit\`.
- Изменение состояния в \`...Checked\`/\`...ViewInit\` рискует \`ExpressionChangedAfterItHasBeenChecked\`.

## Современность

В zoneless/signal мире появились \`afterRender\` и \`afterNextRender\` — для работы с DOM после рендера, заменяющие часть use-case'ов \`ngAfterViewInit\`. А \`computed\`/\`effect\` вытесняют \`ngOnChanges\` для производных значений.`,
      en: `## Order during initialization

1. **constructor** — DI, no inputs or view yet.
2. **ngOnChanges** — when \`@Input\`s exist, before \`ngOnInit\` and on every input change (gives \`SimpleChanges\`).
3. **ngOnInit** — once, after the first \`ngOnChanges\`. Inputs are set.
4. **ngDoCheck** — on every CD, custom change detection.
5. **ngAfterContentInit** — once, after content projection (\`ng-content\`).
6. **ngAfterContentChecked** — on every CD after content is checked.
7. **ngAfterViewInit** — once, after **own view and children** are initialized. \`@ViewChild\` is available here.
8. **ngAfterViewChecked** — on every CD after the view is checked.

## On destruction

9. **ngOnDestroy** — unsubscribe, clean up resources.

## Key nuances

- **Content vs View**: content is projected children (\`<ng-content>\`); view is the own template. Content initializes **before** view.
- **Children first**: a parent's \`ngAfterViewInit\` fires **after** the children's \`ngAfterViewInit\` (bottom-up for view hooks).
- \`@ViewChild\` is available in \`ngAfterViewInit\`, **not** in \`ngOnInit\` (if \`static: false\`). With \`static: true\` — already in \`ngOnInit\`.
- Changing state in \`...Checked\`/\`...ViewInit\` risks \`ExpressionChangedAfterItHasBeenChecked\`.

## Modern Angular

In the zoneless/signal world, \`afterRender\` and \`afterNextRender\` appeared — for DOM work after render, replacing some \`ngAfterViewInit\` use cases. And \`computed\`/\`effect\` displace \`ngOnChanges\` for derived values.`,
    },
    codeSnippet: `// View-child query is ready only in ngAfterViewInit (static: false)
@ViewChild('box') box!: ElementRef;
ngAfterViewInit() { console.log(this.box.nativeElement); }
// Content is ready earlier — in ngAfterContentInit.`,
  },
  {
    id: 'ng-015',
    category: 'angular-core',
    level: 'Hard',
    tags: ['lifecycle-hooks', 'after-render', 'ssr'],
    question: {
      ru: 'Чем afterRender и afterNextRender отличаются от ngAfterViewInit и когда их применять?',
      en: 'How do afterRender and afterNextRender differ from ngAfterViewInit and when should you use them?',
    },
    answer: {
      ru: `## Проблема ngAfterViewInit

\`ngAfterViewInit\` срабатывает после инициализации view компонента, но **не гарантирует**, что весь DOM приложения отрисован и layout стабилен. Также он выполняется **на сервере** при SSR, где DOM-измерения невозможны.

## afterNextRender

Колбэк, выполняемый **один раз** после **следующего** рендера, и **только в браузере** (никогда на сервере). Идеально для:
- Измерений DOM (\`getBoundingClientRect\`).
- Инициализации сторонних библиотек, работающих с DOM (charts, maps).
- Фокуса, скролла после рендера.

\`\`\`ts
constructor() {
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });
}
\`\`\`

## afterRender

Колбэк, выполняемый после **каждого** рендера (когда CD завершён и DOM обновлён). Для постоянной синхронизации с DOM. Использовать осторожно — частые вызовы бьют по производительности.

## Фазы

Оба принимают \`phase\` для упорядочивания работы с DOM, чтобы избежать layout thrashing:
- \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.

\`\`\`ts
afterRender({
  read: () => { this.height = el.offsetHeight; },
  write: () => { el.style.transform = '...'; },
});
\`\`\`

## Ключевые отличия

- **Только браузер**: безопасны для SSR (на сервере не выполняются).
- Создаются в **injection-контексте** (конструктор), не как методы класса.
- \`afterNextRender\` = одноразовый, \`afterRender\` = на каждый рендер.
- Учитывают фазы для оптимизации reflow.

Это часть нового подхода Angular к рендерингу, особенно важная для zoneless и SSR/hydration.`,
      en: `## The problem with ngAfterViewInit

\`ngAfterViewInit\` fires after the component's view is initialized, but does **not guarantee** that the whole app DOM is painted and layout is stable. It also runs **on the server** during SSR, where DOM measurements are impossible.

## afterNextRender

A callback executed **once** after the **next** render, and **only in the browser** (never on the server). Ideal for:
- DOM measurements (\`getBoundingClientRect\`).
- Initializing third-party DOM libraries (charts, maps).
- Focus, scroll after render.

\`\`\`ts
constructor() {
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });
}
\`\`\`

## afterRender

A callback executed after **every** render (when CD is done and DOM is updated). For continuous DOM sync. Use carefully — frequent calls hurt performance.

## Phases

Both accept a \`phase\` to order DOM work and avoid layout thrashing:
- \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.

\`\`\`ts
afterRender({
  read: () => { this.height = el.offsetHeight; },
  write: () => { el.style.transform = '...'; },
});
\`\`\`

## Key differences

- **Browser only**: safe for SSR (do not run on the server).
- Created in an **injection context** (constructor), not as class methods.
- \`afterNextRender\` = one-shot, \`afterRender\` = every render.
- Account for phases to optimize reflow.

This is part of Angular's new rendering approach, especially important for zoneless and SSR/hydration.`,
    },
  },
  {
    id: 'ng-016',
    category: 'angular-core',
    level: 'Expert',
    tags: ['ivy', 'incremental-dom', 'aot'],
    question: {
      ru: 'Что такое Ivy и как incremental DOM с локальностью улучшают tree-shaking и компиляцию?',
      en: 'What is Ivy and how do incremental DOM and locality improve tree-shaking and compilation?',
    },
    answer: {
      ru: `## Ivy — движок рендеринга

Ivy — это движок компиляции и рендеринга Angular (с v9 по умолчанию). Компилятор превращает шаблоны в **инструкции** (\`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\` и т.д.), записанные прямо в код компонента.

## Incremental DOM

В отличие от Virtual DOM (React), который строит дерево в памяти и диффит его, Ivy использует **incremental DOM**: каждый компонент компилируется в набор инструкций \`create\` и \`update\`.
- При первом рендере выполняются create-инструкции, создающие DOM.
- При CD выполняются update-инструкции, которые сравнивают значения и точечно меняют DOM.

Преимущество: **нет промежуточного VDOM-дерева** в памяти → меньше расход памяти, инструкции tree-shakable.

## Локальность (Locality)

Компилятор Ivy компилирует каждый компонент **независимо**, опираясь только на его собственные декораторы, не нуждаясь в глобальном анализе. Следствия:
- Быстрая **инкрементальная** перекомпиляция (меняешь один компонент — пересобирается он один).
- Библиотеки можно публиковать в **частично скомпилированном** виде.
- Лучше совместимость с инструментами сборки.

## Tree-shakability

Поскольку функциональность Angular вызывается как **импортируемые инструкции**, а не через монолитный рантайм, бандлер удаляет неиспользуемый код. Если вы не используете \`ngIf\`, его инструкции не попадут в бандл. Это даёт значительно меньший размер для маленьких приложений.

## AOT

Ivy сделал **AOT-компиляцию** (Ahead-of-Time) дефолтной и для dev: шаблоны компилируются заранее, ошибки ловятся на этапе сборки, нет рантайм-компилятора в бандле → быстрее старт, меньше размер, типобезопасность шаблонов.`,
      en: `## Ivy — the rendering engine

Ivy is Angular's compilation and rendering engine (default since v9). The compiler turns templates into **instructions** (\`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\`, etc.) emitted directly into the component's code.

## Incremental DOM

Unlike Virtual DOM (React), which builds a tree in memory and diffs it, Ivy uses **incremental DOM**: each component compiles into a set of \`create\` and \`update\` instructions.
- On first render, create-instructions build the DOM.
- During CD, update-instructions compare values and patch the DOM surgically.

Benefit: **no intermediate VDOM tree** in memory → lower memory use, and the instructions are tree-shakable.

## Locality

The Ivy compiler compiles each component **independently**, relying only on its own decorators, without needing global analysis. Consequences:
- Fast **incremental** recompilation (change one component, only it rebuilds).
- Libraries can ship **partially compiled**.
- Better compatibility with build tooling.

## Tree-shakability

Because Angular functionality is invoked as **imported instructions** rather than via a monolithic runtime, the bundler can drop unused code. If you do not use \`ngIf\`, its instructions never enter the bundle. This yields significantly smaller bundles for small apps.

## AOT

Ivy made **AOT compilation** (Ahead-of-Time) the default even for dev: templates are compiled ahead of time, errors are caught at build time, no runtime compiler ships in the bundle → faster startup, smaller size, template type safety.`,
    },
    codeSnippet: `// Ivy emits incremental-DOM instructions per component
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}`,
  },
  {
    id: 'ng-017',
    category: 'angular-core',
    level: 'Medium',
    tags: ['standalone', 'modules', 'modern-angular'],
    question: {
      ru: 'Что такое standalone-компоненты и какие преимущества они дают по сравнению с NgModule?',
      en: 'What are standalone components and what advantages do they offer over NgModule?',
    },
    answer: {
      ru: `## Standalone-компоненты

Standalone-компонент объявляет свои зависимости **сам**, через свойство \`imports\`, без необходимости регистрации в \`NgModule\`. С Angular 19 флаг \`standalone: true\` стал значением по умолчанию.

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`...\`,
})
export class CardComponent {}
\`\`\`

## Преимущества

- **Меньше boilerplate**: нет \`declarations\`, \`exports\`, отдельных модулей-обёрток.
- **Явные зависимости**: видно прямо в компоненте, что он использует — лучше для понимания и для tree-shaking.
- **Проще lazy loading**: \`loadComponent\` грузит один компонент без модуля.
- **Проще тестирование**: импортируешь компонент напрямую в \`TestBed\`.
- **Лучше DX**: меньше "где же объявлен этот компонент".

## Bootstrap без модулей

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

## Provider-функции

Вместо \`forRoot()\` модулей появились функции \`provide*\`: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\` и т.д. Они tree-shakable и компонуемы.

## Совместимость

Standalone и NgModule **сосуществуют**: standalone-компонент можно импортировать в \`NgModule\` (\`imports\`), а NgModule — в standalone-компонент. Это позволяет мигрировать постепенно. Существует автоматический schematic \`ng generate @angular/core:standalone\`.

Standalone — стратегическое направление, NgModule считается legacy для нового кода.`,
      en: `## Standalone components

A standalone component declares its dependencies **itself**, via the \`imports\` property, without registering in an \`NgModule\`. As of Angular 19 the \`standalone: true\` flag became the default.

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`...\`,
})
export class CardComponent {}
\`\`\`

## Advantages

- **Less boilerplate**: no \`declarations\`, \`exports\`, or wrapper modules.
- **Explicit dependencies**: visible right in the component — better for understanding and tree-shaking.
- **Simpler lazy loading**: \`loadComponent\` loads a single component without a module.
- **Easier testing**: import the component directly into \`TestBed\`.
- **Better DX**: less "where is this component declared".

## Bootstrap without modules

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

## Provider functions

Instead of module \`forRoot()\` we have \`provide*\` functions: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\`, etc. They are tree-shakable and composable.

## Compatibility

Standalone and NgModule **coexist**: a standalone component can be imported into an \`NgModule\` (\`imports\`), and an NgModule into a standalone component. This allows gradual migration. There is an automatic schematic \`ng generate @angular/core:standalone\`.

Standalone is the strategic direction; NgModule is considered legacy for new code.`,
    },
  },
  {
    id: 'ng-018',
    category: 'angular-core',
    level: 'Medium',
    tags: ['control-flow', 'if', 'for', 'track'],
    question: {
      ru: 'Чем новый control flow (@if/@for/@switch) лучше структурных директив *ngIf/*ngFor?',
      en: 'How is the new control flow (@if/@for/@switch) better than the structural directives *ngIf/*ngFor?',
    },
    answer: {
      ru: `## Новый синтаксис

С Angular 17 появился встроенный control flow прямо в шаблонах:

\`\`\`html
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else {
  <p>Guest</p>
}

@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items</li>
}

@switch (status()) {
  @case ('loading') { <spinner /> }
  @default { <content /> }
}
\`\`\`

## Преимущества

- **Производительность**: control flow встроен в компилятор, не требует загрузки директив, и \`@for\` использует более быстрый алгоритм согласования DOM. Бенчмарки показывают до 90% улучшения в некоторых сценариях.
- **track обязателен**: в \`@for\` нужно указать \`track\` — это устраняет частую ошибку забытого \`trackBy\` и баги с пересозданием DOM.
- **@empty блок**: встроенная обработка пустого списка без отдельного \`*ngIf\`.
- **Меньше бандл**: не нужно импортировать \`CommonModule\`/\`NgIf\`/\`NgForOf\`.
- **Лучше читаемость**: \`@else if\` вместо вложенных ng-template.

## track под капотом

\`track\` определяет идентичность элементов. При изменении массива Angular по \`track\`-ключу понимает, какие узлы переиспользовать, переместить или удалить, вместо пересоздания всего списка. \`track item.id\` для объектов, \`track $index\` для примитивов.

## Миграция

Schematic \`ng generate @angular/core:control-flow\` автоматически переписывает старые директивы. Старые \`*ngIf\`/\`*ngFor\` продолжают работать, но новый синтаксис — рекомендованный.`,
      en: `## New syntax

Angular 17 introduced built-in control flow directly in templates:

\`\`\`html
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else {
  <p>Guest</p>
}

@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <li>No items</li>
}

@switch (status()) {
  @case ('loading') { <spinner /> }
  @default { <content /> }
}
\`\`\`

## Advantages

- **Performance**: control flow is built into the compiler, needs no directive loading, and \`@for\` uses a faster DOM reconciliation algorithm. Benchmarks show up to 90% improvement in some scenarios.
- **track is mandatory**: \`@for\` requires \`track\` — eliminating the common forgotten-\`trackBy\` mistake and DOM re-creation bugs.
- **@empty block**: built-in empty-list handling without a separate \`*ngIf\`.
- **Smaller bundle**: no need to import \`CommonModule\`/\`NgIf\`/\`NgForOf\`.
- **Better readability**: \`@else if\` instead of nested ng-templates.

## track under the hood

\`track\` defines element identity. When the array changes, Angular uses the \`track\` key to decide which nodes to reuse, move, or remove instead of recreating the whole list. \`track item.id\` for objects, \`track $index\` for primitives.

## Migration

The schematic \`ng generate @angular/core:control-flow\` rewrites old directives automatically. The old \`*ngIf\`/\`*ngFor\` still work, but the new syntax is recommended.`,
    },
  },
  {
    id: 'ng-019',
    category: 'angular-core',
    level: 'Hard',
    tags: ['control-flow', 'defer', 'lazy-loading', 'performance'],
    question: {
      ru: 'Как работает @defer и какие триггеры и плейсхолдеры он поддерживает?',
      en: 'How does @defer work and what triggers and placeholders does it support?',
    },
    answer: {
      ru: `## Что такое @defer

\`@defer\` (Angular 17+) позволяет **лениво** загружать часть шаблона и её зависимости (компоненты, директивы, пайпы) отдельным чанком, который грузится только при выполнении триггера. Это декларативный code-splitting **на уровне шаблона**.

\`\`\`html
@defer (on viewport) {
  <heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

## Блоки

- **@placeholder** — что показывать до триггера (рендерится сразу, eager).
- **@loading** — пока грузится чанк (\`after\` откладывает показ, \`minimum\` предотвращает мигание).
- **@error** — при ошибке загрузки.

## Триггеры

- \`on idle\` (по умолчанию) — \`requestIdleCallback\`.
- \`on viewport\` — когда элемент попал в область видимости (\`IntersectionObserver\`).
- \`on interaction\` — клик/фокус по плейсхолдеру.
- \`on hover\` — наведение.
- \`on timer(2s)\` — через время.
- \`on immediate\` — сразу после рендера.
- \`when condition\` — по выражению-сигналу.

Можно ссылаться на элемент: \`on viewport(triggerRef)\`.

## Prefetch

Загрузку чанка можно начать раньше показа: \`@defer (on interaction; prefetch on idle)\` — грузим в простое, показываем по клику.

## Под капотом

Компилятор создаёт динамический \`import()\` для зависимостей блока, выделяя их в отдельный JS-бандл. Это **встроенный** в Angular механизм, не требующий роутера или ручного \`loadComponent\`.

## SSR

\`@defer\` корректно работает с SSR/hydration: на сервере рендерится \`@placeholder\`, гидратация управляется триггерами на клиенте.`,
      en: `## What @defer is

\`@defer\` (Angular 17+) **lazily** loads a part of the template and its dependencies (components, directives, pipes) as a separate chunk, loaded only when a trigger fires. It is declarative code-splitting **at the template level**.

\`\`\`html
@defer (on viewport) {
  <heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

## Blocks

- **@placeholder** — what to show before the trigger (rendered eagerly).
- **@loading** — while the chunk loads (\`after\` delays showing, \`minimum\` prevents flicker).
- **@error** — on load failure.

## Triggers

- \`on idle\` (default) — \`requestIdleCallback\`.
- \`on viewport\` — when the element enters the viewport (\`IntersectionObserver\`).
- \`on interaction\` — click/focus on the placeholder.
- \`on hover\` — hover.
- \`on timer(2s)\` — after a delay.
- \`on immediate\` — right after render.
- \`when condition\` — by a signal expression.

You can reference an element: \`on viewport(triggerRef)\`.

## Prefetch

Chunk loading can start before showing: \`@defer (on interaction; prefetch on idle)\` — load while idle, show on click.

## Under the hood

The compiler creates a dynamic \`import()\` for the block's dependencies, splitting them into a separate JS bundle. It is **built into** Angular, requiring no router or manual \`loadComponent\`.

## SSR

\`@defer\` works correctly with SSR/hydration: the server renders \`@placeholder\`, and hydration is driven by triggers on the client.`,
    },
    codeSnippet: `@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data" />
} @placeholder {
  <div>Scroll to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error { <p>Failed</p> }`,
  },
  {
    id: 'ng-020',
    category: 'angular-core',
    level: 'Hard',
    tags: ['router', 'guards', 'functional'],
    question: {
      ru: 'Как реализуются функциональные guards и resolvers в современном Angular?',
      en: 'How are functional guards and resolvers implemented in modern Angular?',
    },
    answer: {
      ru: `## Функциональные guards

С Angular 14 guards и resolvers — это **функции**, а не классы, реализующие интерфейсы. Они выполняются в **injection-контексте**, поэтому внутри можно использовать \`inject()\`.

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};
\`\`\`

Подключение прямо в конфиге роутов:

\`\`\`ts
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

## Преимущества над классами

- **Меньше boilerplate**: нет \`@Injectable\`, \`providedIn\`, реализации интерфейса.
- **Композиция**: guards можно комбинировать как обычные функции.
- **Tree-shakable** и проще тестировать.
- Старые class-based guards считаются deprecated; есть \`mapToCanActivate\` для совместимости.

## Типы guards

- \`CanActivateFn\` — доступ к маршруту.
- \`CanActivateChildFn\` — доступ к дочерним.
- \`CanDeactivateFn<T>\` — уход с маршрута (несохранённые изменения).
- \`CanMatchFn\` — может ли маршрут вообще совпасть (важно для lazy + альтернативных маршрутов).

## Resolvers

\`ResolveFn<T>\` предзагружает данные до активации маршрута:

\`\`\`ts
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.params['id']);
};
\`\`\`

Данные доступны через \`route.data['user']\` или \`ActivatedRoute\`. Resolver может вернуть значение, \`Observable\`, \`Promise\` — роутер дождётся завершения.

## Возвращаемые значения

Guard может вернуть \`boolean\`, \`UrlTree\` (редирект), \`Observable\`/\`Promise\` этих типов. \`UrlTree\` предпочтительнее императивного \`router.navigate\` внутри guard.`,
      en: `## Functional guards

Since Angular 14 guards and resolvers are **functions**, not classes implementing interfaces. They run in an **injection context**, so \`inject()\` works inside.

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};
\`\`\`

Wired directly in the route config:

\`\`\`ts
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

## Advantages over classes

- **Less boilerplate**: no \`@Injectable\`, \`providedIn\`, or interface implementation.
- **Composition**: guards combine like ordinary functions.
- **Tree-shakable** and easier to test.
- Old class-based guards are deprecated; \`mapToCanActivate\` exists for compatibility.

## Guard types

- \`CanActivateFn\` — access to a route.
- \`CanActivateChildFn\` — access to children.
- \`CanDeactivateFn<T>\` — leaving a route (unsaved changes).
- \`CanMatchFn\` — whether a route can match at all (important for lazy + alternative routes).

## Resolvers

\`ResolveFn<T>\` pre-fetches data before the route activates:

\`\`\`ts
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.params['id']);
};
\`\`\`

Data is available via \`route.data['user']\` or \`ActivatedRoute\`. A resolver can return a value, \`Observable\`, or \`Promise\` — the router waits for completion.

## Return values

A guard can return \`boolean\`, a \`UrlTree\` (redirect), or an \`Observable\`/\`Promise\` of these. A \`UrlTree\` is preferred over an imperative \`router.navigate\` inside the guard.`,
    },
    codeSnippet: `export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(AuthService).isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};`,
  },
  {
    id: 'ng-021',
    category: 'angular-core',
    level: 'Medium',
    tags: ['router', 'lazy-loading', 'load-component'],
    question: {
      ru: 'Как работает ленивая загрузка с loadComponent и loadChildren и что такое CanMatch для неё?',
      en: 'How does lazy loading work with loadComponent and loadChildren, and what is CanMatch for it?',
    },
    answer: {
      ru: `## loadComponent

Standalone-эра позволяет лениво грузить **один компонент** без модуля:

\`\`\`ts
{
  path: 'profile',
  loadComponent: () =>
    import('./profile/profile.component')
      .then(m => m.ProfileComponent),
}
\`\`\`

Чанк с компонентом и его зависимостями грузится только при переходе на маршрут.

## loadChildren

Грузит **набор маршрутов** (или legacy-модуль) лениво:

\`\`\`ts
{
  path: 'admin',
  loadChildren: () =>
    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
\`\`\`

Можно грузить как массив \`Routes\` (standalone), так и \`NgModule\` (legacy).

## CanMatch

\`CanMatchFn\` определяет, **подходит ли маршрут вообще**. В отличие от \`CanActivate\`, он выполняется **до** загрузки lazy-чанка. Если возвращает \`false\`, роутер **не грузит** чанк и пробует следующий маршрут с тем же путём.

\`\`\`ts
{
  path: 'dashboard',
  canMatch: [() => inject(Auth).isAdmin()],
  loadComponent: () => import('./admin-dash'),
},
{
  path: 'dashboard',
  loadComponent: () => import('./user-dash'),
}
\`\`\`

Здесь по одному пути показывается разный дашборд в зависимости от роли — и ненужный чанк не скачивается.

## Преимущества

- Уменьшает начальный бандл — пользователь грузит только нужное.
- \`CanMatch\` экономит трафик (не качаем то, что не разрешено).
- Можно комбинировать с \`@defer\` для ещё более тонкого разбиения.

## Preloading

Стратегии предзагрузки: \`PreloadAllModules\` или кастомные — грузят lazy-чанки в фоне после старта приложения через \`withPreloading()\`.`,
      en: `## loadComponent

The standalone era allows lazily loading a **single component** without a module:

\`\`\`ts
{
  path: 'profile',
  loadComponent: () =>
    import('./profile/profile.component')
      .then(m => m.ProfileComponent),
}
\`\`\`

The chunk with the component and its dependencies loads only on navigation to the route.

## loadChildren

Loads a **set of routes** (or a legacy module) lazily:

\`\`\`ts
{
  path: 'admin',
  loadChildren: () =>
    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
\`\`\`

It can load either a \`Routes\` array (standalone) or an \`NgModule\` (legacy).

## CanMatch

\`CanMatchFn\` decides whether a route **matches at all**. Unlike \`CanActivate\`, it runs **before** the lazy chunk loads. If it returns \`false\`, the router **does not load** the chunk and tries the next route with the same path.

\`\`\`ts
{
  path: 'dashboard',
  canMatch: [() => inject(Auth).isAdmin()],
  loadComponent: () => import('./admin-dash'),
},
{
  path: 'dashboard',
  loadComponent: () => import('./user-dash'),
}
\`\`\`

Here the same path shows a different dashboard by role — and the unneeded chunk is never downloaded.

## Advantages

- Reduces the initial bundle — users load only what they need.
- \`CanMatch\` saves bandwidth (no downloading what is not allowed).
- Can be combined with \`@defer\` for even finer splitting.

## Preloading

Preloading strategies: \`PreloadAllModules\` or custom ones — load lazy chunks in the background after app start via \`withPreloading()\`.`,
    },
    codeSnippet: `{
  path: 'dashboard',
  canMatch: [() => inject(Auth).isAdmin()], // runs BEFORE the chunk loads
  loadComponent: () => import('./admin-dash').then(m => m.AdminDash),
}`,
  },
  {
    id: 'ng-022',
    category: 'angular-core',
    level: 'Hard',
    tags: ['forms', 'reactive', 'template-driven'],
    question: {
      ru: 'В чём принципиальная разница между reactive и template-driven формами под капотом?',
      en: 'What is the fundamental difference between reactive and template-driven forms under the hood?',
    },
    answer: {
      ru: `## Template-driven

Форма строится **в шаблоне** через директивы \`ngModel\`, \`ngForm\`, \`ngModelGroup\`. Angular **асинхронно** создаёт под капотом \`FormControl\`-ы за вас. Источник истины — шаблон.

\`\`\`html
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

- **Асинхронность**: контролы создаются после CD, поэтому к ним нельзя обратиться синхронно в \`ngOnInit\`.
- Подходит для **простых** форм.
- Логика валидации — в шаблоне (директивы).

## Reactive

Форма создаётся **в классе** через \`FormControl\`, \`FormGroup\`, \`FormArray\` или \`FormBuilder\`. Шаблон лишь привязывается к уже существующей модели через \`formControlName\`. Источник истины — TypeScript-код.

\`\`\`ts
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

- **Синхронность**: модель доступна сразу, предсказуема.
- **Тестируемость**: проверяешь модель без DOM.
- **Реактивность**: \`valueChanges\`, \`statusChanges\` — \`Observable\`-потоки.
- **Типизированные формы** (Angular 14+) дают типобезопасность.
- Подходит для **сложных, динамических** форм.

## Под капотом

Оба используют \`ControlValueAccessor\` для связи DOM ↔ модель. Разница в **направлении создания**: template-driven строит модель из шаблона (директивы регистрируются вверх по дереву), reactive — привязывает шаблон к готовой модели.

## Что выбрать

Для серьёзных приложений — **reactive**: явный контроль, типизация, тестируемость, реактивные потоки. Template-driven — для быстрых простых форм. Смешивать в одной форме не рекомендуется.`,
      en: `## Template-driven

The form is built **in the template** via the \`ngModel\`, \`ngForm\`, \`ngModelGroup\` directives. Angular **asynchronously** creates the underlying \`FormControl\`s for you. The source of truth is the template.

\`\`\`html
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

- **Asynchronous**: controls are created after CD, so you cannot access them synchronously in \`ngOnInit\`.
- Suited for **simple** forms.
- Validation logic lives in the template (directives).

## Reactive

The form is created **in the class** via \`FormControl\`, \`FormGroup\`, \`FormArray\`, or \`FormBuilder\`. The template merely binds to the existing model through \`formControlName\`. The source of truth is TypeScript code.

\`\`\`ts
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

- **Synchronous**: the model is available immediately, predictable.
- **Testability**: you test the model without the DOM.
- **Reactivity**: \`valueChanges\`, \`statusChanges\` are \`Observable\` streams.
- **Typed forms** (Angular 14+) provide type safety.
- Suited for **complex, dynamic** forms.

## Under the hood

Both use \`ControlValueAccessor\` to connect DOM ↔ model. The difference is the **direction of creation**: template-driven builds the model from the template (directives register up the tree), reactive binds the template to a ready model.

## What to choose

For serious apps — **reactive**: explicit control, typing, testability, reactive streams. Template-driven — for quick simple forms. Mixing them in one form is discouraged.`,
    },
    codeSnippet: `// Reactive: model lives in code, available synchronously
form = inject(FormBuilder).group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});`,
  },
  {
    id: 'ng-023',
    category: 'angular-core',
    level: 'Expert',
    tags: ['forms', 'control-value-accessor', 'custom-controls'],
    question: {
      ru: 'Как работает ControlValueAccessor и как написать кастомный form control?',
      en: 'How does ControlValueAccessor work and how do you build a custom form control?',
    },
    answer: {
      ru: `## Роль ControlValueAccessor

\`ControlValueAccessor\` (CVA) — это **мост** между Angular Forms API (\`FormControl\`) и нативным/кастомным элементом ввода. Он переводит значение модели в DOM и пользовательский ввод обратно в модель. Все встроенные директивы (\`DefaultValueAccessor\`, \`CheckboxControlValueAccessor\` и т.д.) реализуют этот интерфейс.

## Четыре метода

- **writeValue(value)** — модель → компонент (программная установка значения).
- **registerOnChange(fn)** — сохранить колбэк, вызываемый при изменении пользователем (компонент → модель).
- **registerOnTouched(fn)** — колбэк для пометки "touched" (blur).
- **setDisabledState(isDisabled)** — реакция на \`disable()\`.

## Реализация

\`\`\`ts
@Component({
  selector: 'app-rating',
  template: \`<!-- звёзды -->\`,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RatingComponent),
    multi: true,
  }],
})
export class RatingComponent implements ControlValueAccessor {
  value = 0;
  private onChange: (v: number) => void = () => {};
  private onTouched = () => {};

  writeValue(v: number) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  setRating(v: number) {
    this.value = v;
    this.onChange(v);   // уведомляем форму
    this.onTouched();
  }
}
\`\`\`

## Ключевые нюансы

- \`NG_VALUE_ACCESSOR\` — **multi**-провайдер, плюс \`forwardRef\` (класс ещё не определён в момент декоратора).
- Компонент теперь работает с \`formControlName\`, \`ngModel\`, валидаторами как нативный input.
- Для валидации можно дополнительно реализовать \`Validator\` через \`NG_VALIDATORS\`.

Это основа любых дизайн-систем: кастомные селекты, date-picker'ы, toggle интегрируются в формы единообразно.`,
      en: `## The role of ControlValueAccessor

\`ControlValueAccessor\` (CVA) is the **bridge** between the Angular Forms API (\`FormControl\`) and a native/custom input element. It translates the model value into the DOM and user input back into the model. All built-in directives (\`DefaultValueAccessor\`, \`CheckboxControlValueAccessor\`, etc.) implement this interface.

## Four methods

- **writeValue(value)** — model → component (programmatic value set).
- **registerOnChange(fn)** — store a callback called on user change (component → model).
- **registerOnTouched(fn)** — callback to mark "touched" (blur).
- **setDisabledState(isDisabled)** — react to \`disable()\`.

## Implementation

\`\`\`ts
@Component({
  selector: 'app-rating',
  template: \`<!-- stars -->\`,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RatingComponent),
    multi: true,
  }],
})
export class RatingComponent implements ControlValueAccessor {
  value = 0;
  private onChange: (v: number) => void = () => {};
  private onTouched = () => {};

  writeValue(v: number) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  setRating(v: number) {
    this.value = v;
    this.onChange(v);   // notify the form
    this.onTouched();
  }
}
\`\`\`

## Key nuances

- \`NG_VALUE_ACCESSOR\` is a **multi** provider, plus \`forwardRef\` (the class is not yet defined at decorator time).
- The component now works with \`formControlName\`, \`ngModel\`, and validators like a native input.
- For validation you can additionally implement \`Validator\` via \`NG_VALIDATORS\`.

This is the foundation of any design system: custom selects, date-pickers, toggles integrate into forms uniformly.`,
    },
    codeSnippet: `providers: [{
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => RatingComponent),
  multi: true,
}]
// writeValue / registerOnChange / registerOnTouched / setDisabledState`,
  },
  {
    id: 'ng-024',
    category: 'angular-core',
    level: 'Hard',
    tags: ['forms', 'typed-forms', 'validators'],
    question: {
      ru: 'Что такое типизированные реактивные формы и как писать кастомные и async-валидаторы?',
      en: 'What are typed reactive forms and how do you write custom and async validators?',
    },
    answer: {
      ru: `## Типизированные формы

С Angular 14 \`FormControl\`, \`FormGroup\` стали **дженериками**. Раньше \`form.value\` был \`any\`, теперь компилятор знает точные типы.

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;        // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }
\`\`\`

## nonNullable

По умолчанию \`reset()\` возвращает контрол к \`null\`, поэтому тип значения включает \`null\`. \`{ nonNullable: true }\` (или \`fb.nonNullable.group\`) убирает \`null\` и сбрасывает к начальному значению.

## value vs getRawValue

\`value\` исключает **disabled**-контролы (они optional), \`getRawValue()\` включает все.

## Кастомный синхронный валидатор

\`\`\`ts
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}
\`\`\`

Возвращает объект ошибок или \`null\` (валидно).

## Async-валидатор

Возвращает \`Observable\`/\`Promise\` от \`ValidationErrors | null\`. Запускается после синхронных, статус контрола = \`PENDING\` пока ждём.

\`\`\`ts
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}
\`\`\`

## Подключение

\`\`\`ts
new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // дебаунс валидации
});
\`\`\`

\`updateOn: 'blur'\` или \`'submit'\` снижает частоту запуска async-валидации.`,
      en: `## Typed forms

Since Angular 14 \`FormControl\` and \`FormGroup\` are **generic**. Previously \`form.value\` was \`any\`; now the compiler knows exact types.

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;        // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }
\`\`\`

## nonNullable

By default \`reset()\` returns a control to \`null\`, so the value type includes \`null\`. \`{ nonNullable: true }\` (or \`fb.nonNullable.group\`) removes \`null\` and resets to the initial value.

## value vs getRawValue

\`value\` excludes **disabled** controls (they become optional), \`getRawValue()\` includes all.

## Custom sync validator

\`\`\`ts
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}
\`\`\`

It returns an errors object or \`null\` (valid).

## Async validator

Returns an \`Observable\`/\`Promise\` of \`ValidationErrors | null\`. It runs after sync validators; the control status is \`PENDING\` while waiting.

\`\`\`ts
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}
\`\`\`

## Wiring

\`\`\`ts
new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // debounce validation
});
\`\`\`

\`updateOn: 'blur'\` or \`'submit'\` reduces how often async validation runs.`,
    },
    codeSnippet: `new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  nonNullable: true,
  updateOn: 'blur',
});`,
  },
  {
    id: 'ng-025',
    category: 'angular-core',
    level: 'Medium',
    tags: ['content-projection', 'ng-content'],
    question: {
      ru: 'Как работает content projection через ng-content и что такое multi-slot проекция?',
      en: 'How does content projection via ng-content work and what is multi-slot projection?',
    },
    answer: {
      ru: `## Базовая проекция

\`<ng-content>\` — это "слот", куда Angular вставляет контент, переданный между тегами компонента. Это позволяет создавать переиспользуемые компоненты-обёртки.

\`\`\`html
<!-- card.component.html -->
<div class="card"><ng-content></ng-content></div>

<!-- использование -->
<app-card><p>Любой контент</p></app-card>
\`\`\`

## Multi-slot проекция

Несколько \`<ng-content select="...">\` распределяют контент по слотам через CSS-селекторы:

\`\`\`html
<!-- card.component.html -->
<header><ng-content select="[card-title]"></ng-content></header>
<main><ng-content></ng-content></main>
<footer><ng-content select="app-card-actions"></ng-content></footer>
\`\`\`

\`\`\`html
<app-card>
  <h2 card-title>Заголовок</h2>
  <p>Основной контент попадёт в слот без select</p>
  <app-card-actions><button>OK</button></app-card-actions>
</app-card>
\`\`\`

\`select\` принимает любой CSS-селектор: атрибут, тег, класс. Контент без совпадения попадает в **дефолтный** \`ng-content\` (без select).

## Ключевые нюансы

- **Контент рендерится в контексте родителя**, а не компонента-обёртки — DI и CD спроецированного контента принадлежат месту объявления.
- Спроецированный контент **создаётся всегда**, даже если \`ng-content\` спрятан \`@if\` — для отложенного создания нужен \`@if\` вокруг данных или \`ng-template\`.
- \`@ContentChild\`/\`@ContentChildren\` позволяют компоненту-обёртке получить ссылки на спроецированные элементы.

## ngProjectAs

Если нужно спроецировать контент в слот, но имя тега не совпадает с \`select\`, используется атрибут \`ngProjectAs="selector"\`.

Content projection — основа композиционного дизайна UI-библиотек.`,
      en: `## Basic projection

\`<ng-content>\` is a "slot" where Angular inserts the content passed between the component's tags. It enables reusable wrapper components.

\`\`\`html
<!-- card.component.html -->
<div class="card"><ng-content></ng-content></div>

<!-- usage -->
<app-card><p>Any content</p></app-card>
\`\`\`

## Multi-slot projection

Several \`<ng-content select="...">\` distribute content into slots via CSS selectors:

\`\`\`html
<!-- card.component.html -->
<header><ng-content select="[card-title]"></ng-content></header>
<main><ng-content></ng-content></main>
<footer><ng-content select="app-card-actions"></ng-content></footer>
\`\`\`

\`\`\`html
<app-card>
  <h2 card-title>Title</h2>
  <p>Main content lands in the slot without select</p>
  <app-card-actions><button>OK</button></app-card-actions>
</app-card>
\`\`\`

\`select\` takes any CSS selector: attribute, tag, class. Content with no match goes to the **default** \`ng-content\` (no select).

## Key nuances

- **Content renders in the parent's context**, not the wrapper's — DI and CD of projected content belong to the place of declaration.
- Projected content is **always created**, even if the \`ng-content\` is hidden by \`@if\` — for deferred creation wrap the data in \`@if\` or use an \`ng-template\`.
- \`@ContentChild\`/\`@ContentChildren\` let the wrapper component get references to projected elements.

## ngProjectAs

If you need to project content into a slot but the tag name does not match the \`select\`, use the \`ngProjectAs="selector"\` attribute.

Content projection is the foundation of compositional UI-library design.`,
    },
  },
  {
    id: 'ng-026',
    category: 'angular-core',
    level: 'Hard',
    tags: ['view-child', 'content-child', 'query-timing'],
    question: {
      ru: 'Чем отличаются ViewChild и ContentChild, и как работает тайминг запросов (static vs dynamic)?',
      en: 'How do ViewChild and ContentChild differ, and how does query timing (static vs dynamic) work?',
    },
    answer: {
      ru: `## ViewChild vs ContentChild

- **@ViewChild** запрашивает элемент из **собственного шаблона** компонента (его view).
- **@ContentChild** запрашивает элемент из **спроецированного** контента (\`ng-content\`), то есть из того, что передал родитель.

\`\`\`ts
@ViewChild('localRef') ref!: ElementRef;        // из своего шаблона
@ContentChild(TabComponent) tab!: TabComponent; // из проекции
\`\`\`

\`@ViewChildren\` / \`@ContentChildren\` возвращают \`QueryList\` для нескольких совпадений.

## Тайминг

- **ViewChild доступен в \`ngAfterViewInit\`** (view инициализирована).
- **ContentChild доступен в \`ngAfterContentInit\`** (контент спроецирован).

## static: true vs false

\`\`\`ts
@ViewChild('ref', { static: true }) ref!: ElementRef;
\`\`\`

- \`static: true\` — запрос разрешается **до** первого CD, доступен уже в \`ngOnInit\`. Работает **только** если элемент **не** обёрнут структурной директивой (\`@if\`, \`@for\`) — он всегда в DOM.
- \`static: false\` (по умолчанию) — запрос разрешается **после** CD, доступен в \`ngAfterViewInit\`. Нужен для условно отображаемых элементов.

## Сигнальные queries (Angular 17.2+)

Современный реактивный подход — функции-сигналы:

\`\`\`ts
ref = viewChild<ElementRef>('localRef');       // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // без undefined
\`\`\`

Они возвращают сигналы, доступны реактивно (в \`computed\`/\`effect\`), не требуют ручного выбора тайминга и заменяют \`QueryList\`-подписки. Это рекомендованный способ в новых проектах.

## QueryList

Для декораторного стиля \`QueryList\` имеет \`.changes\` (\`Observable\`) — реагирует на динамическое добавление/удаление элементов \`@for\`.`,
      en: `## ViewChild vs ContentChild

- **@ViewChild** queries an element from the component's **own template** (its view).
- **@ContentChild** queries an element from **projected** content (\`ng-content\`), i.e. what the parent passed in.

\`\`\`ts
@ViewChild('localRef') ref!: ElementRef;        // from own template
@ContentChild(TabComponent) tab!: TabComponent; // from projection
\`\`\`

\`@ViewChildren\` / \`@ContentChildren\` return a \`QueryList\` for multiple matches.

## Timing

- **ViewChild is available in \`ngAfterViewInit\`** (the view is initialized).
- **ContentChild is available in \`ngAfterContentInit\`** (content is projected).

## static: true vs false

\`\`\`ts
@ViewChild('ref', { static: true }) ref!: ElementRef;
\`\`\`

- \`static: true\` — the query resolves **before** the first CD, available already in \`ngOnInit\`. Works **only** if the element is **not** wrapped in a structural directive (\`@if\`, \`@for\`) — it is always in the DOM.
- \`static: false\` (default) — the query resolves **after** CD, available in \`ngAfterViewInit\`. Needed for conditionally rendered elements.

## Signal queries (Angular 17.2+)

The modern reactive approach uses signal functions:

\`\`\`ts
ref = viewChild<ElementRef>('localRef');       // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // no undefined
\`\`\`

They return signals, are reactively available (in \`computed\`/\`effect\`), need no manual timing choice, and replace \`QueryList\` subscriptions. This is the recommended way in new projects.

## QueryList

For the decorator style, \`QueryList\` has \`.changes\` (an \`Observable\`) — reacting to dynamic addition/removal of \`@for\` elements.`,
    },
    codeSnippet: `// Signal-based queries (Angular 17.2+)
box = viewChild.required<ElementRef>('box');
items = viewChildren(ItemComponent);
projected = contentChild(TabComponent);`,
  },
  {
    id: 'ng-027',
    category: 'angular-core',
    level: 'Hard',
    tags: ['dynamic-components', 'view-container-ref', 'template-ref'],
    question: {
      ru: 'Как создавать динамические компоненты через ViewContainerRef и что такое TemplateRef?',
      en: 'How do you create dynamic components via ViewContainerRef, and what is TemplateRef?',
    },
    answer: {
      ru: `## TemplateRef

\`TemplateRef\` — это ссылка на **шаблон** (\`<ng-template>\`), который **не рендерится** сам по себе. Он содержит "рецепт" DOM, который можно инстанцировать позже.

\`\`\`html
<ng-template #tpl let-name="name">Hi {{ name }}</ng-template>
\`\`\`

\`\`\`ts
@ViewChild('tpl') tpl!: TemplateRef<any>;
\`\`\`

## ViewContainerRef

\`ViewContainerRef\` — это **точка привязки** в DOM, куда можно динамически вставлять view (из шаблонов или компонентов). Получается через DI или через якорь.

## Создание embedded view из шаблона

\`\`\`ts
this.vcr.createEmbeddedView(this.tpl, { name: 'Anna' });
\`\`\`

## Создание динамического компонента

С Ivy больше **не нужен** \`ComponentFactoryResolver\` (deprecated):

\`\`\`ts
@ViewChild('anchor', { read: ViewContainerRef })
vcr!: ViewContainerRef;

loadComponent() {
  this.vcr.clear();
  const ref = this.vcr.createComponent(WidgetComponent);
  ref.setInput('title', 'Dynamic');   // установка инпута
  ref.instance.action.subscribe(...); // подписка на output
  ref.changeDetectorRef.detectChanges();
}
\`\`\`

\`createComponent\` возвращает \`ComponentRef\`, через который доступны \`instance\`, \`setInput\`, \`destroy\`, \`location\`.

## Ключевые нюансы

- Динамические компоненты **не** нужно регистрировать в \`entryComponents\` (это исчезло с Ivy).
- Не забывать \`destroy()\` или \`clear()\` — иначе утечки.
- Можно передать \`injector\`, \`projectableNodes\` (для content projection в динамический компонент).
- Альтернатива императиву — \`NgComponentOutlet\` (декларативно в шаблоне) и \`*ngTemplateOutlet\`.

## Применение

Модалки, тултипы, динамические формы, плагинные системы, рендер компонентов по конфигу из бэкенда.`,
      en: `## TemplateRef

\`TemplateRef\` is a reference to a **template** (\`<ng-template>\`) that **does not render** on its own. It holds a DOM "recipe" you can instantiate later.

\`\`\`html
<ng-template #tpl let-name="name">Hi {{ name }}</ng-template>
\`\`\`

\`\`\`ts
@ViewChild('tpl') tpl!: TemplateRef<any>;
\`\`\`

## ViewContainerRef

\`ViewContainerRef\` is an **anchor point** in the DOM where you can dynamically insert views (from templates or components). It is obtained via DI or through an anchor.

## Creating an embedded view from a template

\`\`\`ts
this.vcr.createEmbeddedView(this.tpl, { name: 'Anna' });
\`\`\`

## Creating a dynamic component

With Ivy you **no longer need** \`ComponentFactoryResolver\` (deprecated):

\`\`\`ts
@ViewChild('anchor', { read: ViewContainerRef })
vcr!: ViewContainerRef;

loadComponent() {
  this.vcr.clear();
  const ref = this.vcr.createComponent(WidgetComponent);
  ref.setInput('title', 'Dynamic');   // set an input
  ref.instance.action.subscribe(...); // subscribe to an output
  ref.changeDetectorRef.detectChanges();
}
\`\`\`

\`createComponent\` returns a \`ComponentRef\` exposing \`instance\`, \`setInput\`, \`destroy\`, \`location\`.

## Key nuances

- Dynamic components do **not** need \`entryComponents\` registration (gone with Ivy).
- Do not forget \`destroy()\` or \`clear()\` — otherwise leaks.
- You can pass an \`injector\`, \`projectableNodes\` (for content projection into the dynamic component).
- A declarative alternative is \`NgComponentOutlet\` (in the template) and \`*ngTemplateOutlet\`.

## Use cases

Modals, tooltips, dynamic forms, plugin systems, rendering components from a backend config.`,
    },
    codeSnippet: `const ref = this.vcr.createComponent(WidgetComponent);
ref.setInput('title', 'Dynamic');
ref.instance.action.subscribe(v => this.onAction(v));
// ... later
ref.destroy(); // avoid leaks`,
  },
  {
    id: 'ng-028',
    category: 'angular-core',
    level: 'Medium',
    tags: ['host-binding', 'host-listener', 'directives'],
    question: {
      ru: 'Как работают HostBinding и HostListener и в чём преимущество свойства host в декораторе?',
      en: 'How do HostBinding and HostListener work, and what is the benefit of the host decorator property?',
    },
    answer: {
      ru: `## HostBinding

\`@HostBinding\` привязывает свойство класса к свойству/атрибуту/классу/стилю **host-элемента** (элемента, на котором висит директива/компонент).

\`\`\`ts
@HostBinding('class.active') isActive = false;
@HostBinding('attr.aria-disabled') disabled = false;
@HostBinding('style.opacity') opacity = 1;
\`\`\`

## HostListener

\`@HostListener\` подписывается на события host-элемента (или \`window\`/\`document\`).

\`\`\`ts
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

@HostListener('window:resize')
onResize() { /* ... */ }
\`\`\`

## Свойство host в декораторе

Альтернатива декораторам — объект \`host\` в \`@Component\`/\`@Directive\`:

\`\`\`ts
@Component({
  selector: 'app-btn',
  host: {
    '[class.primary]': 'isPrimary',
    '[attr.role]': '"button"',
    '(click)': 'onClick($event)',
  },
})
\`\`\`

## Преимущества host-объекта

- **Всё в одном месте** — host-привязки видны в метаданных, а не разбросаны по полям класса.
- Считается **более производительным** и предпочтительным стилем в новых гайдлайнах Angular.
- Статические значения (\`'role': 'button'\`) задаются без логики.
- Лучше работает с наследованием и линтерами.

## Нюансы

- \`@HostBinding('class.x')\` добавляет/убирает класс по boolean; \`style.prop\` — стиль.
- Для частых событий (\`mousemove\`, \`scroll\`) \`@HostListener\` может бить по производительности из-за CD — рассмотрите \`runOutsideAngular\` или сигналы.
- В zoneless event-listener'ы host автоматически помечают view dirty.

Это основной механизм инкапсуляции поведения и стилей в директивах.`,
      en: `## HostBinding

\`@HostBinding\` binds a class property to a property/attribute/class/style of the **host element** (the element the directive/component sits on).

\`\`\`ts
@HostBinding('class.active') isActive = false;
@HostBinding('attr.aria-disabled') disabled = false;
@HostBinding('style.opacity') opacity = 1;
\`\`\`

## HostListener

\`@HostListener\` subscribes to events on the host element (or \`window\`/\`document\`).

\`\`\`ts
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

@HostListener('window:resize')
onResize() { /* ... */ }
\`\`\`

## The host decorator property

An alternative to the decorators is the \`host\` object in \`@Component\`/\`@Directive\`:

\`\`\`ts
@Component({
  selector: 'app-btn',
  host: {
    '[class.primary]': 'isPrimary',
    '[attr.role]': '"button"',
    '(click)': 'onClick($event)',
  },
})
\`\`\`

## Benefits of the host object

- **Everything in one place** — host bindings are visible in metadata, not scattered across class fields.
- Considered **more performant** and the preferred style in newer Angular guidelines.
- Static values (\`'role': 'button'\`) are set without logic.
- Works better with inheritance and linters.

## Nuances

- \`@HostBinding('class.x')\` toggles a class by boolean; \`style.prop\` toggles a style.
- For frequent events (\`mousemove\`, \`scroll\`) \`@HostListener\` can hurt performance due to CD — consider \`runOutsideAngular\` or signals.
- In zoneless, host event-listeners automatically mark the view dirty.

This is the primary mechanism for encapsulating behavior and styles in directives.`,
    },
  },
  {
    id: 'ng-029',
    category: 'angular-core',
    level: 'Expert',
    tags: ['directive-composition', 'host-directives'],
    question: {
      ru: 'Что такое directive composition API (hostDirectives) и какие у него ограничения?',
      en: 'What is the directive composition API (hostDirectives) and what are its limitations?',
    },
    answer: {
      ru: `## Идея

Directive Composition API (Angular 15+) позволяет компоненту или директиве **применять к своему host-элементу другие директивы** через свойство \`hostDirectives\`. Это композиция поведения вместо наследования.

\`\`\`ts
@Component({
  selector: 'app-menu-item',
  hostDirectives: [
    CdkMenuItem,
    {
      directive: TooltipDirective,
      inputs: ['tooltipText: text'],   // переименование инпута
      outputs: ['shown'],
    },
  ],
})
export class MenuItemComponent {}
\`\`\`

## Что даёт

- **Переиспользование** поведения (a11y, тултипы, drag) без наследования и без обёртки в шаблоне.
- Можно **выборочно экспонировать** inputs/outputs host-директивы наружу, при желании переименовав их.
- Хост-директивы участвуют в **DI** — их сервисы доступны компоненту.
- Дизайн-системы (Angular CDK, Material) активно используют это для применения примитивов поведения.

## Ограничения

- Host-директивы должны быть **standalone**.
- Они применяются **статически** — список в декораторе нельзя менять в рантайме (он часть компиляции).
- Нельзя добавить host-директиву **извне** — только сам компонент решает, что применить.
- **Порядок** важен: host-директивы инстанцируются **до** самого компонента, что влияет на DI и порядок выполнения хуков.
- По умолчанию inputs/outputs **не** экспонируются — нужно явно перечислить.
- Возможны конфликты, если несколько директив биндят один и тот же host-атрибут.

## Когда применять

Когда нужно "подмешать" готовое поведение нескольким компонентам единообразно: фокус-менеджмент, ripple-эффекты, ARIA-роли. Это более чистая альтернатива копированию кода или базовым классам.`,
      en: `## The idea

The Directive Composition API (Angular 15+) lets a component or directive **apply other directives to its own host element** via the \`hostDirectives\` property. It is behavior composition instead of inheritance.

\`\`\`ts
@Component({
  selector: 'app-menu-item',
  hostDirectives: [
    CdkMenuItem,
    {
      directive: TooltipDirective,
      inputs: ['tooltipText: text'],   // rename an input
      outputs: ['shown'],
    },
  ],
})
export class MenuItemComponent {}
\`\`\`

## What it provides

- **Reuse** of behavior (a11y, tooltips, drag) without inheritance and without template wrapping.
- You can **selectively expose** the host directive's inputs/outputs, optionally renaming them.
- Host directives participate in **DI** — their services are available to the component.
- Design systems (Angular CDK, Material) use it heavily to apply behavior primitives.

## Limitations

- Host directives must be **standalone**.
- They are applied **statically** — the decorator list cannot change at runtime (it is part of compilation).
- A host directive cannot be added **from outside** — only the component itself decides what to apply.
- **Order** matters: host directives are instantiated **before** the component itself, affecting DI and hook execution order.
- By default inputs/outputs are **not** exposed — you must list them explicitly.
- Conflicts are possible if multiple directives bind the same host attribute.

## When to use

When you need to "mix in" ready behavior into several components uniformly: focus management, ripple effects, ARIA roles. It is a cleaner alternative to copy-paste or base classes.`,
    },
    codeSnippet: `@Component({
  selector: 'app-menu-item',
  hostDirectives: [
    CdkMenuItem,
    { directive: TooltipDirective, inputs: ['tooltipText: text'] },
  ],
})
export class MenuItemComponent {}`,
  },
  {
    id: 'ng-030',
    category: 'angular-core',
    level: 'Expert',
    tags: ['ssr', 'hydration', 'performance'],
    question: {
      ru: 'Как работает non-destructive hydration в Angular SSR и зачем нужен provideClientHydration?',
      en: 'How does non-destructive hydration work in Angular SSR and why do you need provideClientHydration?',
    },
    answer: {
      ru: `## Проблема старого SSR

Раньше Angular SSR делал **destructive hydration**: сервер присылал HTML, но при загрузке клиента Angular **удалял весь DOM** и перерисовывал его заново. Это вызывало мигание (flicker), потерю состояния DOM и плохой UX.

## Non-destructive hydration

С Angular 16 (\`provideClientHydration()\`) появилась **неразрушающая** гидратация: клиент **переиспользует** существующий серверный DOM, не удаляя его. Angular обходит DOM, сопоставляет его с деревом компонентов и просто "подключает" обработчики событий и привязки.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

## Что даёт

- **Нет мигания** — DOM остаётся на месте.
- **Лучше Core Web Vitals**: меньше CLS, быстрее TTI.
- **Меньше работы** при старте — не пересоздаётся DOM.

## Как работает под капотом

Сервер добавляет специальные **аннотации** (комментарии-маркеры) в HTML, описывающие границы view. Клиент использует их, чтобы сопоставить серверный DOM с компонентами без полной перерисовки.

## Возможности

- \`withEventReplay()\` — события, произошедшие до гидратации, **воспроизводятся** после неё (пользователь кликнул, пока JS грузился — клик не потерян).
- \`withIncrementalHydration()\` (Angular 19) — гидратация по требованию, интегрированная с \`@defer\`: блоки гидратируются только при триггере.

## Ограничения и подводные камни

- **Прямая манипуляция DOM** (через \`ElementRef\`, сторонние библиотеки) ломает гидратацию — несоответствие server/client DOM вызывает \`NG0500\`.
- Контент должен быть **детерминированным** между сервером и клиентом.
- \`ngSkipHydration\` атрибут отключает гидратацию для проблемного поддерева (например, обёртки сторонних виджетов).

Гидратация — ключ к производительному SSR в современном Angular.`,
      en: `## The old SSR problem

Previously Angular SSR did **destructive hydration**: the server sent HTML, but on client load Angular **destroyed the whole DOM** and re-rendered it. This caused flicker, lost DOM state, and poor UX.

## Non-destructive hydration

Angular 16 introduced (\`provideClientHydration()\`) **non-destructive** hydration: the client **reuses** the existing server DOM without removing it. Angular walks the DOM, matches it to the component tree, and simply "attaches" event handlers and bindings.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

## What it provides

- **No flicker** — the DOM stays in place.
- **Better Core Web Vitals**: lower CLS, faster TTI.
- **Less startup work** — DOM is not recreated.

## How it works under the hood

The server adds special **annotations** (marker comments) into the HTML describing view boundaries. The client uses them to match the server DOM to components without a full re-render.

## Capabilities

- \`withEventReplay()\` — events that occurred before hydration are **replayed** after it (a user clicked while JS was loading — the click is not lost).
- \`withIncrementalHydration()\` (Angular 19) — on-demand hydration integrated with \`@defer\`: blocks hydrate only on a trigger.

## Limitations and pitfalls

- **Direct DOM manipulation** (via \`ElementRef\`, third-party libraries) breaks hydration — a server/client DOM mismatch causes \`NG0500\`.
- Content must be **deterministic** between server and client.
- The \`ngSkipHydration\` attribute disables hydration for a problematic subtree (e.g. third-party widget wrappers).

Hydration is the key to performant SSR in modern Angular.`,
    },
    codeSnippet: `bootstrapApplication(AppComponent, {
  providers: [
    provideClientHydration(withEventReplay()),
  ],
});
// Add ngSkipHydration on subtrees you manipulate manually.`,
  },
  {
    id: 'ng-031',
    category: 'angular-core',
    level: 'Hard',
    tags: ['ngzone', 'run-outside-angular', 'performance'],
    question: {
      ru: 'Зачем нужен NgZone.runOutsideAngular и когда его применять для оптимизации?',
      en: 'Why does NgZone.runOutsideAngular exist and when should you use it for optimization?',
    },
    answer: {
      ru: `## Проблема

Каждое асинхронное событие внутри Angular-зоны (mousemove, scroll, requestAnimationFrame, частые таймеры) триггерит \`ApplicationRef.tick()\` — полный проход change detection. Для высокочастотных событий это десятки/сотни лишних CD в секунду → лаги.

## runOutsideAngular

\`NgZone.runOutsideAngular(fn)\` выполняет колбэк **вне** Angular-зоны, поэтому асинхронные операции внутри него **не** запускают CD.

\`\`\`ts
constructor(private zone: NgZone) {}

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // requestAnimationFrame loop
  });
}
\`\`\`

## Возврат в зону

Когда нужно обновить UI (изменить состояние, отрендерить результат), возвращаемся в зону через \`NgZone.run\`:

\`\`\`ts
this.zone.run(() => {
  this.position = computed; // теперь CD сработает
});
\`\`\`

## Типичные применения

- **Анимации** через \`requestAnimationFrame\`.
- **Drag & drop**, перетаскивание, resize.
- Интеграция со сторонними библиотеками (charts, maps, three.js), которые сами рисуют.
- Частые WebSocket/таймер-события, где не каждое требует ререндера.

## Нюансы

- Вычисления внутри \`runOutsideAngular\` идут, но UI **не обновляется** автоматически — нужно явно \`zone.run\` или \`markForCheck\` для финального обновления.
- Не забывать **снимать** обработчики в \`ngOnDestroy\`.
- В **zoneless**-режиме \`NgZone\` — no-op, и эта оптимизация не нужна: CD управляется сигналами, частые события сами по себе не вызывают CD.

Это классический инструмент тонкой оптимизации производительности в zone-based приложениях.`,
      en: `## The problem

Every async event inside the Angular zone (mousemove, scroll, requestAnimationFrame, frequent timers) triggers \`ApplicationRef.tick()\` — a full change detection pass. For high-frequency events this means dozens/hundreds of extra CDs per second → jank.

## runOutsideAngular

\`NgZone.runOutsideAngular(fn)\` runs the callback **outside** the Angular zone, so async operations inside it do **not** trigger CD.

\`\`\`ts
constructor(private zone: NgZone) {}

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // requestAnimationFrame loop
  });
}
\`\`\`

## Returning to the zone

When you need to update the UI (change state, render a result), re-enter the zone via \`NgZone.run\`:

\`\`\`ts
this.zone.run(() => {
  this.position = computed; // CD will now fire
});
\`\`\`

## Typical uses

- **Animations** via \`requestAnimationFrame\`.
- **Drag & drop**, dragging, resize.
- Integrating third-party libraries (charts, maps, three.js) that draw themselves.
- Frequent WebSocket/timer events where not every one needs a re-render.

## Nuances

- Computations inside \`runOutsideAngular\` still run, but the UI does **not** update automatically — you need an explicit \`zone.run\` or \`markForCheck\` for the final update.
- Do not forget to **remove** listeners in \`ngOnDestroy\`.
- In **zoneless** mode \`NgZone\` is a no-op and this optimization is unnecessary: CD is driven by signals, and frequent events do not trigger CD on their own.

This is a classic fine-grained performance tool in zone-based apps.`,
    },
    codeSnippet: `this.zone.runOutsideAngular(() => {
  el.addEventListener('mousemove', this.onMove); // no CD per move
});
// Re-enter only when UI must update:
this.zone.run(() => (this.pos = next));`,
  },
  {
    id: 'ng-032',
    category: 'angular-core',
    level: 'Medium',
    tags: ['pipes', 'pure-impure', 'performance'],
    question: {
      ru: 'В чём разница между pure и impure пайпами и как это влияет на производительность?',
      en: 'What is the difference between pure and impure pipes and how does it affect performance?',
    },
    answer: {
      ru: `## Pure-пайпы (по умолчанию)

Pure-пайп пересчитывается **только** когда меняется **ссылка** на входное значение (или примитивное значение). Angular кэширует результат и не вызывает \`transform\` повторно при той же ссылке. Это очень эффективно: при каждом CD проверка — простое сравнение по \`===\`.

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true по умолчанию
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // вызывается только при смене value/factor
  }
}
\`\`\`

## Impure-пайпы

\`pure: false\` заставляет Angular вызывать \`transform\` **на каждом** change detection cycle, независимо от смены ссылки.

\`\`\`ts
@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

## Опасность impure

Impure-пайп может выполняться **сотни раз в секунду** (при каждом CD, при каждом событии). Если в нём тяжёлая логика — это серьёзный bottleneck. Классическая ловушка — фильтрация/сортировка массивов через impure-пайп.

## Когда impure оправдан

- \`AsyncPipe\` — impure (нужно реагировать на эмиссии Observable/Promise).
- Пайпы, зависящие от внешнего изменяемого состояния, которое не отражается в ссылке.

## Готчи pure-пайпов

Поскольку pure-пайп смотрит на **ссылку**, мутация массива/объекта без новой ссылки **не** пересчитает пайп:

\`\`\`ts
this.items.push(x);          // pure-пайп не среагирует
this.items = [...this.items, x]; // новая ссылка — среагирует
\`\`\`

## Рекомендация

Избегайте фильтрации/сортировки в шаблоне через пайпы. Лучше — \`computed\`-сигнал или производное состояние в компоненте, где вычисление контролируемо и мемоизировано.`,
      en: `## Pure pipes (default)

A pure pipe recomputes **only** when the **reference** of its input changes (or a primitive value). Angular caches the result and does not call \`transform\` again for the same reference. This is very efficient: each CD just does a \`===\` comparison.

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true by default
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // called only when value/factor change
  }
}
\`\`\`

## Impure pipes

\`pure: false\` forces Angular to call \`transform\` on **every** change detection cycle, regardless of reference change.

\`\`\`ts
@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

## The danger of impure

An impure pipe can run **hundreds of times per second** (every CD, every event). If it contains heavy logic, it is a serious bottleneck. The classic trap is filtering/sorting arrays through an impure pipe.

## When impure is justified

- \`AsyncPipe\` is impure (it must react to Observable/Promise emissions).
- Pipes depending on external mutable state not reflected by a reference change.

## Gotchas of pure pipes

Since a pure pipe looks at the **reference**, mutating an array/object without a new reference will **not** recompute the pipe:

\`\`\`ts
this.items.push(x);          // pure pipe won't react
this.items = [...this.items, x]; // new reference — it reacts
\`\`\`

## Recommendation

Avoid filtering/sorting in the template via pipes. Prefer a \`computed\` signal or derived state in the component, where the computation is controlled and memoized.`,
    },
  },
  {
    id: 'ng-033',
    category: 'angular-core',
    level: 'Hard',
    tags: ['router', 'navigation-lifecycle', 'params'],
    question: {
      ru: 'Как устроен жизненный цикл навигации роутера и как реактивно работать с параметрами маршрута?',
      en: 'How is the router navigation lifecycle structured and how do you work with route params reactively?',
    },
    answer: {
      ru: `## Жизненный цикл навигации

Навигация роутера проходит через серию событий (\`Router.events\`):

1. **NavigationStart** — навигация началась.
2. **RouteConfigLoadStart/End** — загрузка lazy-чанка (если есть).
3. **GuardsCheckStart/End** — выполнение \`CanMatch\`, \`CanActivate\`, \`CanDeactivate\`.
4. **ResolveStart/End** — выполнение резолверов.
5. **NavigationEnd** — успешное завершение.
6. **NavigationCancel** (guard вернул false/UrlTree) или **NavigationError**.

\`\`\`ts
this.router.events.pipe(
  filter(e => e is NavigationEnd)
).subscribe(...);
\`\`\`

## Реактивный доступ к параметрам

\`ActivatedRoute\` предоставляет **Observable**-потоки, которые эмитят при изменении без пересоздания компонента:

\`\`\`ts
private route = inject(ActivatedRoute);

id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // resolver data
\`\`\`

## Snapshot vs Observable

- \`route.snapshot.paramMap.get('id')\` — значение **на момент** активации. Не обновляется, если навигация идёт на **тот же** компонент с другими параметрами.
- \`route.paramMap\` (Observable) — обновляется всегда. Важно для маршрутов вида \`/user/:id\`, где смена id переиспользует компонент.

## Сигнальный доступ (Angular 16+)

С \`withComponentInputBinding()\` параметры маршрута можно биндить прямо в \`@Input\`/\`input()\`:

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// в компоненте
id = input.required<string>(); // авто из route param :id
\`\`\`

Также появился \`toSignal(route.paramMap)\` для реактивного сигнала.

## Гоча

При навигации на тот же компонент Angular **не** пересоздаёт его (по умолчанию) — поэтому полагаться на \`ngOnInit\` для перезагрузки данных нельзя; нужно подписываться на потоки параметров.`,
      en: `## The navigation lifecycle

Router navigation goes through a series of events (\`Router.events\`):

1. **NavigationStart** — navigation began.
2. **RouteConfigLoadStart/End** — loading a lazy chunk (if any).
3. **GuardsCheckStart/End** — running \`CanMatch\`, \`CanActivate\`, \`CanDeactivate\`.
4. **ResolveStart/End** — running resolvers.
5. **NavigationEnd** — successful completion.
6. **NavigationCancel** (a guard returned false/UrlTree) or **NavigationError**.

\`\`\`ts
this.router.events.pipe(
  filter(e => e is NavigationEnd)
).subscribe(...);
\`\`\`

## Reactive access to params

\`ActivatedRoute\` provides **Observable** streams that emit on change without recreating the component:

\`\`\`ts
private route = inject(ActivatedRoute);

id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // resolver data
\`\`\`

## Snapshot vs Observable

- \`route.snapshot.paramMap.get('id')\` — the value **at the moment** of activation. It does not update if navigation goes to the **same** component with different params.
- \`route.paramMap\` (Observable) — always updates. Important for routes like \`/user/:id\` where changing the id reuses the component.

## Signal access (Angular 16+)

With \`withComponentInputBinding()\` route params can bind directly to \`@Input\`/\`input()\`:

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// in the component
id = input.required<string>(); // auto from route param :id
\`\`\`

Also \`toSignal(route.paramMap)\` gives a reactive signal.

## Gotcha

On navigation to the same component Angular does **not** recreate it (by default) — so you cannot rely on \`ngOnInit\` to reload data; you must subscribe to the param streams.`,
    },
    codeSnippet: `provideRouter(routes, withComponentInputBinding());

// Component receives :id route param as a signal input automatically
id = input.required<string>();`,
  },
  {
    id: 'ng-034',
    category: 'angular-core',
    level: 'Hard',
    tags: ['signals', 'rxjs-interop', 'to-signal'],
    question: {
      ru: 'Как интегрировать сигналы и RxJS через toSignal и toObservable и какие нюансы у toSignal?',
      en: 'How do you integrate signals and RxJS via toSignal and toObservable, and what are the nuances of toSignal?',
    },
    answer: {
      ru: `## toSignal

\`toSignal(observable$)\` превращает \`Observable\` в \`Signal\`, **автоматически** подписываясь и **отписываясь** при уничтожении (привязка к \`DestroyRef\`). Это устраняет ручные \`subscribe\`/\`unsubscribe\` и \`async\`-пайп.

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
\`\`\`

## Нюансы toSignal

- **Начальное значение**: до первой эмиссии сигнал = \`undefined\`. Тип становится \`T | undefined\`. Опции:
  - \`initialValue\` — задать стартовое значение.
  - \`requireSync: true\` — для Observable, эмитящих синхронно (\`BehaviorSubject\`, \`of\`), убирает \`undefined\` из типа.

\`\`\`ts
count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });
\`\`\`

- **Injection-контекст**: должен вызываться в контексте (или с \`{ injector }\`), т.к. цепляется к \`DestroyRef\`.
- **Hot подписка**: подписка происходит **сразу** при создании, не лениво.
- Ошибки Observable пробрасываются при **чтении** сигнала.

## toObservable

\`toObservable(signal)\` превращает \`Signal\` в \`Observable\`. Под капотом использует \`effect\`, чтобы отслеживать изменения сигнала и эмитить их.

\`\`\`ts
query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

Это даёт лучшее из двух миров: сигналы для синхронного состояния, RxJS для сложной асинхронной композиции (debounce, switchMap, retry).

## Нюанс toObservable

Эмиссии происходят **асинхронно** (через effect, в конце CD), а не синхронно при \`set\`. Несколько быстрых изменений могут "схлопнуться" в одну эмиссию из-за glitch-free батчинга.

Эти два хелпера — мост между декларативной реактивностью сигналов и потоковой моделью RxJS.`,
      en: `## toSignal

\`toSignal(observable$)\` converts an \`Observable\` into a \`Signal\`, **automatically** subscribing and **unsubscribing** on destruction (tied to \`DestroyRef\`). This removes manual \`subscribe\`/\`unsubscribe\` and the \`async\` pipe.

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
\`\`\`

## Nuances of toSignal

- **Initial value**: before the first emission the signal is \`undefined\`. The type becomes \`T | undefined\`. Options:
  - \`initialValue\` — set a starting value.
  - \`requireSync: true\` — for Observables that emit synchronously (\`BehaviorSubject\`, \`of\`), removes \`undefined\` from the type.

\`\`\`ts
count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });
\`\`\`

- **Injection context**: must be called in context (or with \`{ injector }\`) because it ties to \`DestroyRef\`.
- **Hot subscription**: it subscribes **immediately** on creation, not lazily.
- Observable errors are thrown on **reading** the signal.

## toObservable

\`toObservable(signal)\` converts a \`Signal\` into an \`Observable\`. Under the hood it uses an \`effect\` to track signal changes and emit them.

\`\`\`ts
query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

This gives the best of both worlds: signals for synchronous state, RxJS for complex async composition (debounce, switchMap, retry).

## Nuance of toObservable

Emissions happen **asynchronously** (via an effect, at the end of CD), not synchronously on \`set\`. Several quick changes may "collapse" into one emission due to glitch-free batching.

These two helpers bridge the declarative reactivity of signals and the streaming model of RxJS.`,
    },
    codeSnippet: `query = signal('');
results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    switchMap(q => this.api.search(q)),
  ),
  { initialValue: [] },
);`,
  },
  {
    id: 'ng-035',
    category: 'angular-core',
    level: 'Medium',
    tags: ['dependency-injection', 'provided-in', 'tree-shaking'],
    question: {
      ru: 'Какие значения providedIn существуют и как providedIn влияет на tree-shaking?',
      en: 'What providedIn values exist and how does providedIn affect tree-shaking?',
    },
    answer: {
      ru: `## Значения providedIn

- **'root'** — синглтон на всё приложение, в корневом \`EnvironmentInjector\`. Самый частый вариант.
- **'platform'** — синглтон, общий для **всех приложений Angular** на странице (редко, для микрофронтендов).
- **'any'** — **отдельный экземпляр** в каждом lazy-загруженном инжекторе (и один в root для eager-частей). Полезно для изоляции состояния по lazy-модулю.
- **Конкретный класс/EnvironmentInjector** — реже, привязка к scope.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

## Tree-shaking

Главное преимущество \`providedIn\` над регистрацией в \`providers: []\` модуля — **tree-shakability**.

При \`providedIn: 'root'\` связь "сервис → инжектор" объявлена **в самом сервисе**. Если сервис **нигде не инжектится**, бандлер видит, что на него нет ссылок, и **удаляет** его из бандла.

При старом стиле (\`providers: [MyService]\` в \`NgModule\`) сервис **всегда** попадал в бандл, даже если не использовался, потому что массив \`providers\` — это статическая ссылка.

## Практические рекомендации

- Для большинства сервисов — \`providedIn: 'root'\`: синглтон + tree-shakable.
- Для scoped-состояния (на компонент) — \`providers\` в \`@Component\`, не \`providedIn\`.
- \`providedIn: 'any'\` — когда каждый lazy-участок должен иметь свою копию сервиса.

## Нюанс

\`providedIn: 'root'\` создаёт сервис **лениво** — экземпляр появляется при первой инъекции, а не при старте приложения. Это и оптимизация, и причина, почему "сервис с side-эффектом в конструкторе" может не выполниться, пока его никто не запросит.`,
      en: `## providedIn values

- **'root'** — an app-wide singleton in the root \`EnvironmentInjector\`. The most common choice.
- **'platform'** — a singleton shared across **all Angular apps** on the page (rare, for microfrontends).
- **'any'** — a **separate instance** in each lazy-loaded injector (and one in root for eager parts). Useful for isolating state per lazy module.
- **A specific class/EnvironmentInjector** — rarer, scope binding.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

## Tree-shaking

The main advantage of \`providedIn\` over registration in a module's \`providers: []\` is **tree-shakability**.

With \`providedIn: 'root'\` the "service → injector" link is declared **in the service itself**. If the service is **injected nowhere**, the bundler sees no references and **removes** it from the bundle.

With the old style (\`providers: [MyService]\` in an \`NgModule\`), the service **always** entered the bundle even if unused, because the \`providers\` array is a static reference.

## Practical recommendations

- For most services — \`providedIn: 'root'\`: singleton + tree-shakable.
- For scoped state (per component) — \`providers\` in \`@Component\`, not \`providedIn\`.
- \`providedIn: 'any'\` — when each lazy segment should have its own copy of the service.

## Nuance

\`providedIn: 'root'\` creates the service **lazily** — the instance appears on first injection, not at app startup. This is both an optimization and the reason a "service with a constructor side effect" may not run until something requests it.`,
    },
  },
  {
    id: 'ng-036',
    category: 'angular-core',
    level: 'Expert',
    tags: ['signals', 'signal-components', 'change-detection'],
    question: {
      ru: 'Как сигнал, прочитанный в шаблоне, связывается с change detection компонента под капотом?',
      en: 'How does a signal read in a template get wired to the component change detection under the hood?',
    },
    answer: {
      ru: `## Reactive consumer у view

Каждый компонент в Ivy имеет внутреннюю структуру \`LView\`. Когда шаблон **читает сигнал** (\`{{ count() }}\`), это чтение происходит внутри **reactive-контекста** view. Angular устанавливает текущий "активный consumer" равным reactive-узлу этого \`LView\`.

## Регистрация зависимости

В момент чтения сигнал (producer) **регистрирует** текущий активный consumer в своём списке зависимостей, а consumer запоминает producer. Это двусторонняя связь графа — та же механика, что у \`computed\`/\`effect\`.

## Что происходит при записи

Когда сигнал изменяется (\`count.set(...)\`):
1. Все зависимые consumers помечаются **stale**.
2. Reactive-узел \`LView\` вызывает эквивалент \`markViewDirty\` — view помечается грязным и **вверх по дереву** (как \`markForCheck\`).
3. Планировщик CD (\`ChangeDetectionScheduler\`) ставит задачу на перерисовку.

## Точечность

Ключевое отличие от Zone.js: помечается **только тот компонент**, который реально читал изменившийся сигнал, а не всё дерево. Это основа эффективного CD в zoneless.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count() }} {{ double() }}\`,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → этот view dirty, computed пересчитается лениво
}
\`\`\`

## Версионирование

Каждый узел графа имеет \`version\`. Перед перерендером Angular проверяет, **действительно ли** изменилась хоть одна зависимость view (сравнивая версии). Если нет — рендер пропускается. Это даёт glitch-free и минимум лишней работы.

## Следствие

В компоненте, использующем только сигналы в шаблоне, CD становится практически идеальным: проверяется и обновляется ровно то, что зависит от изменившихся данных. Это конечная цель архитектуры signal-based components + zoneless.`,
      en: `## A reactive consumer per view

Each component in Ivy has an internal \`LView\` structure. When a template **reads a signal** (\`{{ count() }}\`), that read happens inside the view's **reactive context**. Angular sets the current "active consumer" to that \`LView\`'s reactive node.

## Dependency registration

At read time the signal (producer) **registers** the current active consumer in its dependency list, and the consumer records the producer. This is the same bidirectional graph mechanism as \`computed\`/\`effect\`.

## What happens on write

When the signal changes (\`count.set(...)\`):
1. All dependent consumers are marked **stale**.
2. The \`LView\` reactive node invokes the equivalent of \`markViewDirty\` — the view is marked dirty and **up the tree** (like \`markForCheck\`).
3. The CD scheduler (\`ChangeDetectionScheduler\`) schedules a re-render.

## Granularity

The key difference from Zone.js: **only the component** that actually read the changed signal is marked, not the whole tree. This is the basis of efficient CD in zoneless.

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count() }} {{ double() }}\`,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → this view dirty, computed recomputes lazily
}
\`\`\`

## Versioning

Each graph node has a \`version\`. Before re-rendering, Angular checks whether **any** view dependency actually changed (by comparing versions). If not — the render is skipped. This delivers glitch-free behavior and minimal extra work.

## Consequence

In a component using only signals in its template, CD becomes nearly ideal: exactly what depends on the changed data is checked and updated. This is the end goal of the signal-based components + zoneless architecture.`,
    },
    codeSnippet: `@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count() }} / {{ double() }}\`,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2); // only THIS view marked dirty on set
}`,
  },
];
