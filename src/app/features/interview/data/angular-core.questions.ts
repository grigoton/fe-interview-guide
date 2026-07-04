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
      ru: `## 🧩 Простыми словами

Представь, что Angular — это уборщик, который наводит порядок на экране (обновляет то, что показывает пользователю). Проблема: он не знает, когда именно что-то поменялось. Zone.js — это как система сигнализации, которую развесили на все двери и окна дома: как только сработал таймер, кликнули мышкой или пришёл ответ с сервера — звенит звоночек, и Angular понимает: "Пора проверить, не изменилось ли что-нибудь на экране". Эта проверка называется **change detection** (обнаружение изменений).

### Что делает Zone.js

Zone.js — это библиотека, которая перехватывает все асинхронные (то есть выполняющиеся "не сразу", с задержкой) API браузера: \`setTimeout\`, \`setInterval\`, \`addEventListener\` (обработчики событий вроде клика), \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\` и другие.

Делает она это через приём под названием **monkey-patching** (обезьяний патч) — это когда ты берёшь чужую готовую функцию и подменяешь её своей обёрткой, которая делает то же самое плюс что-то ещё. Zone.js подменяет, например, настоящий \`setTimeout\` своей версией. Его обёртка запоминает, в какой **зоне** (то есть в каком контексте выполнения — можно думать о зоне как о "комнате", где идёт работа) была запущена операция.

### Связь с Angular

Angular создаёт собственную зону — \`NgZone\`. Она наследует обычную \`Zone\` и умеет сообщать наружу о событиях через специальные хуки (точки подписки): \`onMicrotaskEmpty\`, \`onStable\`, \`onUnstable\`.

Микрозадача (microtask) — это очень маленькая отложенная работа, например то, что запускается после \`Promise.then\`. Когда любой асинхронный колбэк (функция обратного вызова) отработал внутри \`NgZone\` и очередь микрозадач опустела, Angular делает вывод: "Что-то могло измениться" — и запускает \`ApplicationRef.tick()\`. Этот метод обходит всё дерево компонентов сверху вниз и выполняет change detection.

\`\`\`ts
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});
\`\`\`

Здесь мы подписываемся на событие "очередь микрозадач пуста" и в ответ вызываем \`tick()\` — полный проход обновления.

### Важные нюансы

- Zone.js **не знает**, что именно изменилось — он знает только сам факт: "асинхронная операция завершилась". Поэтому change detection на всякий случай проверяет всё дерево компонентов целиком.
- Операции, запущенные **вне** зоны через \`runOutsideAngular\`, не звонят в звоночек и не вызывают \`tick()\`. Это используют для оптимизации — например для анимаций или очень частых событий (движение мыши), которые не должны каждый раз перерисовывать всё приложение.
- За удобство приходится платить: Zone.js добавляет небольшую нагрузку на каждый асинхронный вызов и увеличивает размер бандла (собранного JS-файла) примерно на 30 КБ.

### Современный Angular

Начиная с Angular 17+, появился **zoneless** режим (без зоны) — \`provideZonelessChangeDetection()\`. В нём Zone.js вообще не нужен: change detection запускается через **сигналы** (специальные реактивные значения, которые сами сообщают об изменении) и \`markForCheck\`. Это направление, куда движется фреймворк: меньше размер бандла, более точечное обновление и лучшая производительность.

## ⚠️ Подводные камни

- Zone.js проверяет всё дерево при любой асинхронности — на больших приложениях это может тормозить, если не использовать \`OnPush\` или \`runOutsideAngular\`.
- Некоторые сторонние библиотеки создают свои асинхронные вызовы в обход зоны — тогда Angular "не заметит" изменений, и экран не обновится.

## 🎯 Запомни

- Zone.js через monkey-patching перехватывает все async-API браузера и сообщает Angular: "асинхронная работа закончилась".
- В ответ Angular вызывает \`ApplicationRef.tick()\` и проверяет всё дерево компонентов — Zone.js не знает, что именно изменилось.
- \`runOutsideAngular\` позволяет запускать код без запуска change detection — инструмент оптимизации.
- Будущее — zoneless режим (Angular 17+) на сигналах: без Zone.js, легче и быстрее.`,
      en: `## 🧩 In plain words

Think of Angular as a cleaner who keeps the screen tidy (updates what the user sees). The problem: it doesn't know exactly when something changed. Zone.js is like an alarm system wired to every door and window in the house: the moment a timer fires, a mouse is clicked, or a server response arrives, a little bell rings and Angular realizes "Time to check whether anything on the screen changed." That check is called **change detection**.

### What Zone.js does

Zone.js is a library that intercepts all of the browser's asynchronous ("not right now", delayed) APIs: \`setTimeout\`, \`setInterval\`, \`addEventListener\` (event handlers like a click), \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\`, and more.

It does this through a technique called **monkey-patching** — taking someone else's existing function and replacing it with your own wrapper that does the same thing plus something extra. Zone.js swaps out the real \`setTimeout\`, for example, for its own version. That wrapper remembers which **zone** (an execution context — think of a zone as a "room" where work is happening) the operation was started in.

### Link to Angular

Angular creates its own zone — \`NgZone\`. It extends the plain \`Zone\` and can report events to the outside through special hooks (subscription points): \`onMicrotaskEmpty\`, \`onStable\`, \`onUnstable\`.

A microtask is a very small deferred piece of work, like what runs after \`Promise.then\`. When any async callback finishes inside \`NgZone\` and the microtask queue drains, Angular concludes "Something might have changed" and runs \`ApplicationRef.tick()\`. That method walks the whole component tree top-down and performs change detection.

\`\`\`ts
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});
\`\`\`

Here we subscribe to the "microtask queue is empty" event and respond by calling \`tick()\` — a full update pass.

### Key nuances

- Zone.js **does not know** what changed — it only knows the bare fact: "an async operation finished." So change detection, to be safe, checks the entire component tree.
- Operations started **outside** the zone via \`runOutsideAngular\` don't ring the bell and don't trigger \`tick()\`. This is used for optimization — for example animations or very high-frequency events (mouse movement) that shouldn't repaint the whole app every time.
- Convenience has a cost: Zone.js adds a little overhead to every async call and grows the bundle (the compiled JS file) by roughly 30 KB.

### Modern Angular

Starting with Angular 17+, a **zoneless** mode exists — \`provideZonelessChangeDetection()\`. In it Zone.js is not needed at all: change detection is triggered through **signals** (special reactive values that announce their own changes) and \`markForCheck\`. This is where the framework is heading: smaller bundle, more targeted updates, and better performance.

## ⚠️ Common pitfalls

- Zone.js checks the whole tree on any async work — on large apps this can be slow unless you use \`OnPush\` or \`runOutsideAngular\`.
- Some third-party libraries create their async calls bypassing the zone — then Angular "won't notice" the changes, and the screen won't update.

## 🎯 Key takeaways

- Zone.js monkey-patches all of the browser's async APIs and tells Angular "the async work is done."
- In response Angular calls \`ApplicationRef.tick()\` and checks the whole component tree — Zone.js doesn't know what specifically changed.
- \`runOutsideAngular\` lets you run code without triggering change detection — an optimization tool.
- The future is zoneless mode (Angular 17+) built on signals: no Zone.js, lighter and faster.`,
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
      ru: `## 🧩 Простыми словами

Представь класс, где учитель по умолчанию каждую минуту проверяет тетрадь у каждого ученика — даже у тех, кто ничего не писал. Это медленно. Стратегия **OnPush** говорит: "Проверяй ученика только если он поднял руку". То есть Angular проверяет компонент не постоянно, а лишь когда есть явный сигнал, что данные могли поменяться. Это делает большие приложения намного быстрее.

### Суть OnPush

По умолчанию (стратегия \`Default\`) Angular проверяет каждый компонент при каждом **tick** (полном проходе обнаружения изменений — change detection). С \`OnPush\` компонент помечается как "грязный" (dirty — то есть требующий проверки) и проверяется **только** при одном из этих событий:

- Изменилась **ссылка** на любой \`@Input()\` (входное свойство компонента). Сравнение идёт по \`===\`, то есть сравниваются не значения внутри, а сам объект — тот же он или новый.
- В шаблоне компонента сработал event-binding — привязка к событию, например \`(click)\`.
- Внутри сработал **async pipe** (\`| async\`) — он сам вызывает \`markForCheck\`, когда приходит новое значение из потока.
- Явно вызван \`ChangeDetectorRef.markForCheck()\`.
- Изменился **сигнал**, прочитанный в шаблоне (Angular 16+).

### Механика "грязного" флага

У каждого компонента есть внутренний флажок "проверить меня". Метод \`markForCheck()\` не проверяет прямо сейчас — он поднимается **вверх** по дереву от текущего компонента к корню приложения, помечая всех предков (родителей, дедов и так далее) как требующих проверки.

Зачем вверх? Потому что change detection всегда идёт сверху вниз. Если родитель помечен как "чистый" (не требующий проверки), Angular до ребёнка просто не дойдёт. Поэтому нужно "открыть дорожку" от корня до нужного компонента.

### Частая ошибка

Изменение (мутация) объекта без смены ссылки **не** триггерит OnPush, потому что ссылка осталась той же:

\`\`\`ts
// НЕ сработает при OnPush — ссылка на объект та же
this.user.name = 'New';

// Сработает — создаём новый объект, ссылка новая
this.user = { ...this.user, name: 'New' };
\`\`\`

Во втором случае \`{ ...this.user }\` создаёт копию объекта с новой ссылкой, и сравнение по \`===\` замечает разницу.

### Производительность

Связка **OnPush + иммутабельность (неизменяемость данных) + сигналы** — основной способ масштабировать большие приложения: change detection пропускает целые поддеревья компонентов, которые точно не менялись. В zoneless-режиме (без Zone.js) OnPush фактически становится стандартом по умолчанию.

## ⚠️ Подводные камни

- Мутация массива/объекта на месте (\`arr.push(...)\`, \`obj.prop = ...\`) не обновит OnPush-компонент — нужна новая ссылка.
- Забытый \`markForCheck()\` после ручного обновления данных вне Angular-зоны приводит к "застрявшему" UI, который не обновляется.
- OnPush требует дисциплины во всей цепочке \`@Input()\` — один компонент с мутациями ломает выигрыш.

## 🎯 Запомни

- OnPush проверяет компонент только при: новой ссылке на \`@Input\`, событии в шаблоне, async pipe, \`markForCheck()\` или изменении сигнала.
- Сравнение input идёт по \`===\` (по ссылке), поэтому меняй данные иммутабельно — создавай новый объект, а не мутируй старый.
- \`markForCheck()\` помечает "грязными" всех предков вверх до корня, чтобы CD смог дойти до компонента.
- OnPush + иммутабельность + сигналы = быстрый CD в больших приложениях.`,
      en: `## 🧩 In plain words

Imagine a classroom where, by default, the teacher checks every student's notebook every minute — even the ones who wrote nothing. That's slow. The **OnPush** strategy says: "Only check a student when they raise their hand." In other words, Angular checks a component not constantly, but only when there's an explicit signal that its data might have changed. This makes large apps much faster.

### The essence of OnPush

By default (the \`Default\` strategy) Angular checks every component on every **tick** (a full change-detection pass). With \`OnPush\` the component is marked "dirty" (meaning it needs a check) and is checked **only** when one of these happens:

- The **reference** of any \`@Input()\` (a component's input property) changes. The comparison uses \`===\`, meaning it compares not the values inside but the object itself — is it the same one or a new one.
- An event binding fires in the component's template — a binding to an event, like \`(click)\`.
- An **async pipe** (\`| async\`) inside it emits — it calls \`markForCheck\` itself when a new value arrives from the stream.
- \`ChangeDetectorRef.markForCheck()\` is called explicitly.
- A **signal** read in the template changes (Angular 16+).

### The dirty-flag mechanics

Each component holds an internal "check me" flag. The \`markForCheck()\` method doesn't check right now — it walks **up** the tree from the current component to the app's root, marking every ancestor (parents, grandparents, and so on) as needing a check.

Why up? Because change detection always runs top-down. If a parent is marked "clean" (no check needed), Angular simply never reaches the child. So you need to "open the path" from the root down to the target component.

### A common mistake

Mutating (changing in place) an object without swapping the reference does **not** trigger OnPush, because the reference stayed the same:

\`\`\`ts
// Won't fire with OnPush — same object reference
this.user.name = 'New';

// Will fire — we create a new object, new reference
this.user = { ...this.user, name: 'New' };
\`\`\`

In the second case \`{ ...this.user }\` creates a copy of the object with a new reference, and the \`===\` comparison notices the difference.

### Performance

The combo **OnPush + immutability (never mutating data in place) + signals** is the primary way to scale large apps: change detection skips entire subtrees of components that definitely didn't change. In zoneless mode (no Zone.js) OnPush effectively becomes the default standard.

## ⚠️ Common pitfalls

- Mutating an array/object in place (\`arr.push(...)\`, \`obj.prop = ...\`) won't update an OnPush component — you need a new reference.
- A forgotten \`markForCheck()\` after manually updating data outside the Angular zone leaves a "stuck" UI that never refreshes.
- OnPush requires discipline throughout the whole \`@Input()\` chain — one component that mutates breaks the gain.

## 🎯 Key takeaways

- OnPush checks a component only on: a new \`@Input\` reference, a template event, an async pipe, \`markForCheck()\`, or a signal change.
- Input comparison is by \`===\` (by reference), so change data immutably — create a new object instead of mutating the old one.
- \`markForCheck()\` marks all ancestors up to the root as dirty so CD can reach the component.
- OnPush + immutability + signals = fast CD in large apps.`,
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
      ru: `## 🧩 Простыми словами

\`ChangeDetectorRef\` — это пульт управления обновлением одного конкретного компонента. У него четыре кнопки. Две про то, **когда** проверять компонент: "проверь меня попозже" (\`markForCheck\`) и "проверь меня прямо сейчас" (\`detectChanges\`). И две про то, **участвует** ли компонент в проверках вообще: "отключи меня" (\`detach\`) и "подключи обратно" (\`reattach\`). Разберём каждую.

### markForCheck()

Не запускает обнаружение изменений (change detection, CD) сразу. Он **помечает** компонент и **всех его предков** (родителей вверх до корня) как "грязные" — то есть требующие проверки при ближайшем tick (следующем полном проходе CD). Используется вместе с OnPush, когда данные изменились асинхронно вне Angular-зоны или не через обычную цепочку \`@Input()\`.

Аналогия: ты оставляешь стикер "проверь меня" — и его прочитают, когда придёт время уборки.

### detectChanges()

Запускает CD **синхронно и немедленно** — прямо сейчас, не дожидаясь tick — для данного компонента и его **потомков** (детей вниз по дереву). Предков не трогает. Полезно после ручного изменения данных внутри \`runOutsideAngular\` (кода, запущенного вне зоны Angular) или в тестах.

Опасно вызывать во время уже идущего прохода CD — можно получить ошибку \`ExpressionChangedAfterItHasBeenChecked\` (значение изменилось после того, как его уже проверили).

### detach()

Полностью **отсоединяет** компонент от дерева change detection. После этого Angular перестаёт его проверять вообще — даже при tick. Применяется для "тяжёлых" компонентов, которые сами контролируют, когда им обновляться (например, дашборд с тысячами строк, который перерисовывается раз в секунду, а не на каждый чих).

### reattach()

Возвращает ранее отсоединённый компонент обратно в дерево CD — снова включает его в обычные проверки.

### Типичный паттерн

\`\`\`ts
constructor(private cdr: ChangeDetectorRef) {
  this.cdr.detach(); // выключаем автоматические проверки
}

ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();  // делаем тяжёлый расчёт
    this.cdr.detectChanges();  // и обновляем экран только тогда, когда сами захотели
  }, 1000);
}
\`\`\`

Здесь компонент отключён от общих проверок и обновляет себя вручную ровно раз в секунду — это экономит массу работы.

### Ключевое различие

- \`markForCheck\` — "проверь меня **позже**, при следующем tick", идёт **вверх** по дереву.
- \`detectChanges\` — "проверь меня **сейчас**", идёт **вниз** по дереву.

В мире сигналов (Angular 16+) эти ручные вызовы нужны реже: сигналы сами помечают view как "грязную" при изменении.

## ⚠️ Подводные камни

- \`detectChanges()\` во время текущего цикла CD — источник \`ExpressionChangedAfterItHasBeenCheckedError\`.
- Забыл \`reattach()\` после \`detach()\` — компонент навсегда "замёрзнет" и не будет обновляться.
- Путаница направлений: \`markForCheck\` вверх и отложенно, \`detectChanges\` вниз и немедленно — их легко перепутать.

## 🎯 Запомни

- \`markForCheck()\` — пометить "грязным" вверх по дереву, проверка будет при следующем tick (для OnPush).
- \`detectChanges()\` — запустить CD немедленно вниз по дереву (компонент + потомки).
- \`detach()\` / \`reattach()\` — убрать компонент из проверок совсем и вернуть обратно (для тяжёлых, самоуправляемых компонентов).
- С сигналами ручные вызовы нужны редко — сигналы сами помечают view.`,
      en: `## 🧩 In plain words

\`ChangeDetectorRef\` is a remote control for updating one specific component. It has four buttons. Two are about **when** to check the component: "check me later" (\`markForCheck\`) and "check me right now" (\`detectChanges\`). And two are about **whether** the component participates in checks at all: "unplug me" (\`detach\`) and "plug me back in" (\`reattach\`). Let's go through each.

### markForCheck()

Does not run change detection (CD) immediately. It **marks** the component **and all its ancestors** (parents up to the root) as "dirty" — meaning they need checking on the next tick (the next full CD pass). Used together with OnPush when data changed asynchronously outside the Angular zone or not through the normal \`@Input()\` chain.

Analogy: you leave a "check me" sticky note — and it gets read when cleaning time comes.

### detectChanges()

Runs CD **synchronously and immediately** — right now, without waiting for a tick — for this component and its **descendants** (children downward). It doesn't touch ancestors. Useful after a manual data change inside \`runOutsideAngular\` (code run outside the Angular zone) or in tests.

Dangerous to call during an already-running CD pass — you can get the \`ExpressionChangedAfterItHasBeenChecked\` error (a value changed after it was already checked).

### detach()

Fully **detaches** the component from the change-detection tree. After that Angular stops checking it entirely — even on a tick. Used for "heavy" components that control their own update timing (e.g. a dashboard with thousands of rows that repaints once per second rather than on every little thing).

### reattach()

Returns a previously detached component back into the CD tree — puts it back into the normal checks.

### A typical pattern

\`\`\`ts
constructor(private cdr: ChangeDetectorRef) {
  this.cdr.detach(); // turn off automatic checks
}

ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();  // do the heavy computation
    this.cdr.detectChanges();  // and update the screen only when we choose to
  }, 1000);
}
\`\`\`

Here the component is unplugged from the general checks and updates itself manually exactly once per second — saving a huge amount of work.

### The key distinction

- \`markForCheck\` — "check me **later**, on the next tick," walks **up** the tree.
- \`detectChanges\` — "check me **now**," walks **down** the tree.

In the signals world (Angular 16+) these manual calls are needed less often: signals mark the view "dirty" themselves when they change.

## ⚠️ Common pitfalls

- \`detectChanges()\` during the current CD cycle is a source of \`ExpressionChangedAfterItHasBeenCheckedError\`.
- Forgetting \`reattach()\` after \`detach()\` leaves the component "frozen" forever, never updating.
- Confusing the directions: \`markForCheck\` is up and deferred, \`detectChanges\` is down and immediate — easy to mix up.

## 🎯 Key takeaways

- \`markForCheck()\` — mark dirty up the tree; the check happens on the next tick (for OnPush).
- \`detectChanges()\` — run CD immediately down the tree (component + descendants).
- \`detach()\` / \`reattach()\` — remove the component from checks entirely and put it back (for heavy, self-managed components).
- With signals, manual calls are rarely needed — signals mark the view themselves.`,
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
      ru: `## 🧩 Простыми словами

Представь, что Angular сфотографировал экран, показал его пользователю, а потом сразу сделал второй снимок для проверки — и два снимка отличаются. Angular пугается: "Как так? Я только что всё показал, а данные уже другие!" — и кидает ошибку \`ExpressionChangedAfterItHasBeenCheckedError\`. Это не придирка, а защита: если данные меняются "прямо после показа" в том же цикле, интерфейс начинает мигать и вести себя непредсказуемо.

### Причина

В **dev-режиме** (режиме разработки) Angular специально выполняет обнаружение изменений (change detection, CD) **дважды подряд**. Первый проход применяет изменения и обновляет экран. Второй проход — контрольный: он проверяет, что значения, привязанные в шаблоне, **не изменились** между двумя проходами.

Если значение, прочитанное в шаблоне, успело поменяться во время или сразу после первого прохода, второй проход это замечает и Angular выбрасывает \`ExpressionChangedAfterItHasBeenCheckedError\`. Это защита однонаправленного потока данных (данные текут сверху вниз, а не скачут туда-сюда в одном цикле).

### Частые источники

- Изменение свойства внутри хука \`ngAfterViewInit\` — на этом этапе view (представление) уже проверена, а ты меняешь данные, которые в ней показаны.
- Родитель меняет состояние ребёнка, а ребёнок в ответ меняет его обратно — получается "перетягивание каната" в одном цикле.
- Геттер (getter — вычисляемое свойство) в шаблоне, возвращающий каждый раз новый объект. Например \`new Date()\` или \`[...arr]\` — каждый вызов создаёт новую ссылку, и Angular считает, что "значение изменилось".

### Неправильное решение

Просто позвать \`detectChanges()\` наугад или подавить ошибку — это лечение симптома, а не причины. Мигание интерфейса никуда не денется.

### Правильные решения

1. Перенести изменение в более ранний хук (\`ngOnInit\`, до того как view проверена) или отложить его в \`ngAfterViewInit\` через микрозадачу (маленькую отложенную задачу, выполняемую после текущего цикла):

\`\`\`ts
ngAfterViewInit() {
  // Promise.resolve().then(...) откладывает изменение
  // на следующий микротакт — уже вне проверенного прохода
  Promise.resolve().then(() => this.value = computed);
  // альтернатива: this.cdr.detectChanges();
}
\`\`\`

2. Использовать **сигналы** — они откладывают чтение значения и устраняют большинство таких ошибок автоматически.
3. Не использовать в шаблоне "нечистые" геттеры, возвращающие каждый раз новую ссылку (заменить на закешированное значение или чистый pipe).

### Нюанс

В **production**-сборке (боевой версии) этой двойной проверки нет — Angular не выбрасывает ошибку. Но сам баг (мигающий или "прыгающий" UI) остаётся! Поэтому игнорировать ошибку в dev-режиме нельзя — она предупреждает о реальной проблеме, которую пользователи увидят в бою.

## ⚠️ Подводные камни

- Подавить ошибку через \`detectChanges()\` — не починка, а маскировка; баг доживёт до продакшена.
- \`new Date()\`, \`Math.random()\`, \`[...arr]\`, \`{...obj}\` прямо в шаблоне почти гарантированно вызовут ошибку.
- Ошибки нет в production, но некорректное поведение остаётся — не думай, что "раз не падает, значит всё ок".

## 🎯 Запомни

- Ошибка возникает потому, что в dev Angular проверяет CD дважды и значение в шаблоне изменилось между проходами.
- Настоящая причина — нарушение однонаправленного потока: данные меняются "после рендера" в том же цикле.
- Чини правильно: перенеси изменение раньше, отложи через микрозадачу или используй сигналы — не глуши ошибку.
- В production проверки нет, но баг остаётся — игнорировать нельзя.`,
      en: `## 🧩 In plain words

Imagine Angular photographs the screen, shows it to the user, then immediately takes a second photo to double-check — and the two photos differ. Angular panics: "How? I just displayed everything, and the data is already different!" — and throws \`ExpressionChangedAfterItHasBeenCheckedError\`. It's not nitpicking, it's a safeguard: if data changes "right after being shown" in the same cycle, the UI starts flickering and behaving unpredictably.

### The cause

In **dev mode** (development mode) Angular deliberately runs change detection (CD) **twice in a row**. The first pass applies changes and updates the screen. The second pass is a control check: it verifies that the values bound in the template **did not change** between the two passes.

If a value read in the template managed to change during or right after the first pass, the second pass notices it and Angular throws \`ExpressionChangedAfterItHasBeenCheckedError\`. It's a guard for the unidirectional data flow (data flows top-down, not bouncing back and forth within one cycle).

### Common sources

- Changing a property inside the \`ngAfterViewInit\` hook — by that stage the view is already checked, and you're altering data it displays.
- A parent changes a child's state, and the child changes it back in response — a "tug of war" within one cycle.
- A getter (a computed property) in the template that returns a new object every time. For example \`new Date()\` or \`[...arr]\` — each call creates a new reference, and Angular thinks "the value changed."

### The wrong fix

Just calling \`detectChanges()\` blindly or suppressing the error treats the symptom, not the cause. The UI flicker won't go away.

### Proper fixes

1. Move the change to an earlier hook (\`ngOnInit\`, before the view is checked), or defer it in \`ngAfterViewInit\` via a microtask (a tiny deferred task that runs after the current cycle):

\`\`\`ts
ngAfterViewInit() {
  // Promise.resolve().then(...) defers the change
  // to the next microtask — outside the just-checked pass
  Promise.resolve().then(() => this.value = computed);
  // alternative: this.cdr.detectChanges();
}
\`\`\`

2. Use **signals** — they defer value reads and eliminate most of these errors automatically.
3. Don't use "impure" getters in the template that return a new reference each time (replace with a cached value or a pure pipe).

### Nuance

In the **production** build the double check is absent — Angular doesn't throw the error. But the bug itself (a flickering or "jumping" UI) remains! So you must not ignore the error in dev mode — it warns about a real problem that users will see in production.

## ⚠️ Common pitfalls

- Silencing the error with \`detectChanges()\` isn't a fix, it's a cover-up; the bug survives into production.
- \`new Date()\`, \`Math.random()\`, \`[...arr]\`, \`{...obj}\` directly in the template will almost certainly cause the error.
- The error is gone in production, but the misbehavior stays — don't assume "no crash means all good."

## 🎯 Key takeaways

- The error happens because in dev Angular runs CD twice and a template value changed between the passes.
- The real cause is broken unidirectional flow: data changes "after render" within the same cycle.
- Fix it properly: move the change earlier, defer via a microtask, or use signals — don't mute the error.
- Production has no check, but the bug remains — it can't be ignored.`,
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
      ru: `## 🧩 Простыми словами

Представь таблицу Excel. В ячейку A ты вписываешь число, а ячейка B считает \`= A * 2\`. Меняешь A — B пересчитывается сама. Сигналы в Angular работают ровно так же: это ячейки, которые знают, кто от кого зависит, и обновляются автоматически. "Glitch-free" — это гарантия, что ты никогда не увидишь ячейку в наполовину пересчитанном, кривом состоянии.

### Граф зависимостей: кто на кого смотрит

Сигналы образуют **направленный граф зависимостей** — просто карту стрелок "кто от кого зависит".

- \`signal()\` — это **producer** (источник), обычная ячейка, куда ты кладёшь значение.
- \`computed()\` и \`effect()\` — это **consumers** (потребители): они читают другие сигналы и зависят от них.

Хитрость в том, что consumer сам запоминает, какие сигналы он прочитал во время выполнения. Ты не описываешь зависимости вручную — Angular подсматривает, к каким ячейкам ты обратился, и строит стрелки автоматически. Когда producer меняется, все consumers, зависящие от него, помечаются как **"stale"** (устаревшие, "пора пересчитать").

### Push/pull: как расходятся изменения

Angular использует гибридную модель из двух фаз.

- **Push** ("толкаем вниз"): как только ты записал новое значение в сигнал, все зависимые узлы мгновенно помечаются грязными. Это быстрая пометка "ты устарел", а не пересчёт.
- **Pull** ("тянем, когда надо"): настоящий пересчёт \`computed\` происходит **лениво** — только в тот момент, когда кто-то реально читает его значение.

\`computed\` ещё и **кэширует** результат (это называется мемоизация — запоминание последнего ответа). Если ни один из его источников на самом деле не изменился, он вернёт сохранённое значение, не пересчитывая заново.

### Что такое glitch и почему его нет

**Glitch** (глитч, "сбой") — это промежуточное **некорректное** состояние, когда consumer видит зависимости обновлёнными лишь наполовину.

Классический пример: \`c = a + b\`, где и \`a\`, и \`b\` сами выведены из одного общего источника. В наивной реализации при изменении источника \`c\` мог бы пересчитаться дважды или увидеть новое \`a\`, но ещё старое \`b\` — то есть кратко показать бессмыслицу.

Angular гарантирует **glitch-free** распространение. За счёт ленивого pull и **версионирования** (у каждого узла есть счётчик \`version\`, который растёт при каждом реальном изменении) \`computed\` всегда читает согласованный снимок и пересчитывается **ровно один раз** на каждое настоящее изменение.

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // всегда согласован
\`\`\`

Здесь \`c\` зависит и напрямую от \`a\`, и косвенно через \`b\`. При изменении \`a\` ты никогда не поймаешь момент, когда \`a\` уже новое, а \`b\` ещё старое — \`c\` увидит только целостную картину.

### Эффекты и батчинг

\`effect()\` — это consumer для побочных действий (логи, работа с DOM). Он выполняется **асинхронно**, в конце цикла обнаружения изменений (change detection, CD). Несколько изменений подряд **батчатся** (собираются) в один прогон эффекта — это тоже часть glitch-free дизайна: эффект не дёргается на каждый промежуточный шаг, а срабатывает один раз на уже устоявшемся состоянии.

## 🎯 Запомни

- Граф строится **автоматически**: consumer запоминает, какие сигналы прочитал.
- **Push** помечает узлы грязными, **pull** лениво пересчитывает только при чтении; \`computed\` кэширует результат.
- **Glitch-free** = никаких промежуточных кривых состояний; \`computed\` пересчитывается ровно один раз на реальное изменение благодаря версионированию.
- \`effect\` работает асинхронно и батчит изменения в один прогон.`,
      en: `## 🧩 In plain words

Picture an Excel spreadsheet. You type a number into cell A, and cell B computes \`= A * 2\`. Change A, and B recalculates itself. Signals in Angular work exactly like that: they are cells that know who depends on whom and update automatically. "Glitch-free" is the guarantee that you will never catch a cell in a half-recalculated, broken state.

### The dependency graph: who watches whom

Signals form a **directed dependency graph** — just a map of arrows showing "who depends on whom".

- \`signal()\` is a **producer** (a source): an ordinary cell where you put a value.
- \`computed()\` and \`effect()\` are **consumers**: they read other signals and depend on them.

The clever part: a consumer remembers by itself which signals it read while running. You don't declare dependencies by hand — Angular watches which cells you touched and draws the arrows automatically. When a producer changes, every consumer depending on it is marked **"stale"** (out of date, "needs recompute").

### Push/pull: how changes spread

Angular uses a hybrid model with two phases.

- **Push** ("push down"): the moment you write a new value into a signal, all dependent nodes are instantly marked dirty. This is a fast "you're stale" flag, not a recompute.
- **Pull** ("pull when needed"): the actual recomputation of a \`computed\` happens **lazily** — only when someone actually reads its value.

\`computed\` also **caches** its result (this is called memoization — remembering the last answer). If none of its sources really changed, it returns the stored value without recomputing.

### What a glitch is and why there isn't one

A **glitch** is an intermediate **incorrect** state where a consumer sees its dependencies only half-updated.

The classic example: \`c = a + b\`, where both \`a\` and \`b\` are themselves derived from one shared source. In a naive implementation, when the source changes, \`c\` might recompute twice, or see the new \`a\` but the still-old \`b\` — briefly showing nonsense.

Angular guarantees **glitch-free** propagation. Thanks to lazy pull and **versioning** (each node has a \`version\` counter that increments on every real change), a \`computed\` always reads a consistent snapshot and recomputes **exactly once** per real change.

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // always consistent
\`\`\`

Here \`c\` depends on \`a\` both directly and indirectly through \`b\`. When \`a\` changes, you'll never catch a moment where \`a\` is new but \`b\` is still old — \`c\` only ever sees a coherent picture.

### Effects and batching

\`effect()\` is a consumer for side actions (logging, DOM work). It runs **asynchronously**, at the end of the change detection (CD) cycle. Several changes in a row are **batched** into a single effect run — also part of the glitch-free design: the effect doesn't fire on every intermediate step, it runs once against the settled state.

## 🎯 Key takeaways

- The graph is built **automatically**: a consumer remembers which signals it read.
- **Push** marks nodes dirty, **pull** lazily recomputes only when read; \`computed\` caches its result.
- **Glitch-free** = no intermediate broken states; a \`computed\` recomputes exactly once per real change thanks to versioning.
- \`effect\` runs asynchronously and batches changes into a single run.`,
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
      ru: `## 🧩 Простыми словами

Есть два инструмента, и путать их — частая ошибка. \`computed\` — это калькулятор: он берёт другие значения и **вычисляет новое**, ничего не трогая вокруг. \`effect\` — это исполнитель: он **что-то делает во внешнем мире** (пишет в лог, в localStorage, в DOM), когда данные меняются. Простое правило: получаешь значение — \`computed\`; совершаешь действие — \`effect\`.

### computed — для производных значений

\`computed\` создаёт **новое значение**, выведенное из других сигналов. Оно чистое (pure — не имеет побочных эффектов, только считает и возвращает), мемоизированное (запоминает последний результат) и ленивое (считается только при чтении). Если тебе нужно "получить X из Y" — это всегда \`computed\`.

\`\`\`ts
const fullName = computed(() => \`\${first()} \${last()}\`);
\`\`\`

Здесь \`fullName\` сам пересобирается, как только меняются \`first\` или \`last\` — тебе не надо ничего вызывать вручную.

### effect — для побочных эффектов

\`effect\` выполняет **сайд-эффект** (побочное действие) при изменении читаемых им сигналов: логирование, синхронизация с \`localStorage\`, ручная работа с DOM, интеграция со сторонними библиотеками. То есть всё, что "выходит" за пределы чистого вычисления.

### Подводные камни effect

- **Нельзя писать в сигналы по умолчанию.** Запись в сигнал внутри \`effect\` кидает ошибку — иначе легко получить бесконечный цикл (эффект меняет сигнал, тот заново запускает эффект, и так вечно). Раньше это можно было разрешить через \`allowSignalWrites\`, но флаг устарел в новых версиях; правильнее — переосмыслить дизайн через \`computed\`/\`linkedSignal\`.
- **Контекст инъекции.** \`effect\` должен создаваться в injection-контексте (в конструкторе, как поле класса, или с явно переданным \`injector\`), иначе будет ошибка. Injection-контекст — это место, где Angular умеет раздавать зависимости.
- **Очистка.** \`effect\` получает функцию \`onCleanup\` — в неё кладут отмену подписок и таймеров, чтобы почистить хвосты перед следующим запуском или при уничтожении компонента.
- **Тайминг.** \`effect\` выполняется **асинхронно** после цикла обнаружения изменений (CD), а не мгновенно в момент записи сигнала.

\`\`\`ts
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

Здесь эффект каждую секунду логирует \`count\`, а \`onCleanup\` гасит таймер, чтобы не плодить интервалы.

### Главное правило

Если тянет записать сигнал внутри \`effect\` — почти всегда это должен быть \`computed\` или \`linkedSignal\` (специальный сигнал, значение которого выводится из других, но его можно и перезаписать вручную). \`effect\` нужен только для "выхода" из реактивного мира во внешний, а не для пересчёта данных.

## ⚠️ Подводные камни

- Запись в сигнал внутри \`effect\` запрещена по умолчанию — это защита от бесконечных циклов.
- Забыл \`onCleanup\` — получишь утечки: висящие таймеры, дублирующиеся подписки.
- Не жди синхронности: эффект сработает после CD, а не прямо на строке \`set()\`.
- Создание \`effect\` вне injection-контекста упадёт с ошибкой.

## 🎯 Запомни

- **computed** = чистое производное значение ("получить X из Y"), ленивое и мемоизированное.
- **effect** = побочное действие во внешнем мире (лог, DOM, localStorage).
- Тянет писать сигнал внутри \`effect\`? Это признак, что нужен \`computed\`/\`linkedSignal\`.
- Всегда чисти ресурсы через \`onCleanup\`.`,
      en: `## 🧩 In plain words

There are two tools, and mixing them up is a common mistake. \`computed\` is a calculator: it takes other values and **computes a new one**, touching nothing around it. \`effect\` is a doer: it **does something in the outside world** (writes a log, localStorage, the DOM) when data changes. Simple rule: getting a value — \`computed\`; performing an action — \`effect\`.

### computed — for derived values

\`computed\` creates a **new value** derived from other signals. It is pure (no side effects — it only computes and returns), memoized (remembers its last result), and lazy (computed only when read). If you need to "get X from Y" — that is always \`computed\`.

\`\`\`ts
const fullName = computed(() => \`\${first()} \${last()}\`);
\`\`\`

Here \`fullName\` rebuilds itself the moment \`first\` or \`last\` changes — you never call anything by hand.

### effect — for side effects

\`effect\` runs a **side effect** when the signals it reads change: logging, syncing to \`localStorage\`, manual DOM work, integrating third-party libraries. In short, anything that "steps outside" a pure computation.

### Pitfalls of effect

- **Writing to signals is disallowed by default.** Writing a signal inside an \`effect\` throws — otherwise you can easily get an infinite loop (the effect changes a signal, which re-runs the effect, forever). This used to be allowed via \`allowSignalWrites\`, but that flag is deprecated in newer versions; better to rethink the design with \`computed\`/\`linkedSignal\`.
- **Injection context.** An \`effect\` must be created in an injection context (in a constructor, as a class field, or with an explicitly passed \`injector\`), otherwise it errors. An injection context is a place where Angular can hand out dependencies.
- **Cleanup.** An \`effect\` receives an \`onCleanup\` function — put subscription and timer teardown in it to clean up before the next run or when the component is destroyed.
- **Timing.** An \`effect\` runs **asynchronously** after the change detection (CD) cycle, not instantly at the moment of the signal write.

\`\`\`ts
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

Here the effect logs \`count\` every second, and \`onCleanup\` clears the timer so intervals don't pile up.

### The golden rule

If you feel the urge to write a signal inside an \`effect\`, it should almost always be a \`computed\` or \`linkedSignal\` (a special signal whose value is derived from others but can also be overwritten manually). \`effect\` is only for "exiting" the reactive world into the outside — not for recomputing data.

## ⚠️ Common pitfalls

- Writing a signal inside an \`effect\` is disallowed by default — protection against infinite loops.
- Forget \`onCleanup\` and you'll leak: dangling timers, duplicate subscriptions.
- Don't expect synchrony: the effect fires after CD, not right on the \`set()\` line.
- Creating an \`effect\` outside an injection context throws.

## 🎯 Key takeaways

- **computed** = a pure derived value ("get X from Y"), lazy and memoized.
- **effect** = a side action in the outside world (log, DOM, localStorage).
- Tempted to write a signal inside an \`effect\`? That's a sign you need a \`computed\`/\`linkedSignal\`.
- Always clean up resources with \`onCleanup\`.`,
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
      ru: `## 🧩 Простыми словами

Раньше Angular работал как сверхосторожный охранник: при любом чихе (клик, таймер, запрос к серверу) он обходил **весь** дом и проверял каждую комнату — вдруг что-то поменялось. За этот обход отвечала библиотека Zone.js. Zoneless-режим убирает охранника: теперь каждая "комната" сама поднимает руку и говорит "у меня изменились данные, проверь только меня". Сигналы — это и есть механизм поднятия руки.

### Идея zoneless

В zoneless-режиме (включается провайдером \`provideZonelessChangeDetection()\`) Angular **не использует** Zone.js. Zone.js — это библиотека, которая перехватывала все асинхронные операции (\`setTimeout\`, промисы, события) и после каждой запускала полную проверку изменений. Вместо стратегии "проверять всё при любой async-операции" фреймворк теперь точно знает, **какие именно** компоненты нуждаются в обновлении.

### Как триггерится обнаружение изменений

Change detection (CD) — это процесс, в котором Angular сверяет данные с тем, что показано на экране, и обновляет DOM. В zoneless view (представление компонента) помечается "грязным" (dirty, "требует перепроверки") из таких источников:

- Изменение **сигнала**, прочитанного в шаблоне.
- Срабатывание обработчика события в шаблоне (например, \`(click)\`).
- Вызов \`markForCheck()\` или работа \`async\` pipe (\`AsyncPipe\`).
- Установка нового значения у signal-input.

Под капотом каждый сигнал, прочитанный в шаблоне, связывается с \`LView\` компонента (внутренняя структура данных, описывающая экземпляр view) через **reactive consumer** — объект-потребитель, который следит за этим сигналом. При записи сигнала consumer вызывает \`markViewDirty\`, и Angular планирует CD через \`scheduler\` (планировщик на микрозадачах или механизме, похожем на \`requestAnimationFrame\`).

### Coalescing (склейка изменений)

Несколько изменений в одном "тике" (одном обороте цикла событий) **батчатся** — собираются в один-единственный проход CD. За это отвечает \`ChangeDetectionScheduler\`, который дебаунсит (придерживает и объединяет) запросы на обновление, чтобы не перерисовывать экран по десять раз подряд.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

### Что меняется для разработчика

- Код, который меняет состояние **вне сигналов** (обычные поля класса), больше **не** запускает CD автоматически — нужны сигналы или явный \`markForCheck\`.
- \`setTimeout\` и \`Promise\` сами по себе CD больше не запускают (раньше это делал Zone.js за тебя).
- Бандл меньше (нет ~30 КБ Zone.js), меньше накладных расходов, а сам CD предсказуемый и точечный — обновляется только то, что реально изменилось.

### Статус

Начиная с Angular 18 zoneless вышел в developer preview, в версиях 19-20 стабилизируется. Это стратегическое направление фреймворка: **сигналы + OnPush + zoneless** — новая модель производительности Angular.

## ⚠️ Подводные камни

- Мутация обычного поля (не сигнала) в zoneless не перерисует шаблон — легко получить "залипший" UI.
- Старый код, полагавшийся на автоматический CD после \`setTimeout\`/промиса, может перестать обновляться.
- Сторонние библиотеки, менявшие DOM в обход Angular, могут потребовать явного \`markForCheck\`.

## 🎯 Запомни

- Zoneless = **нет Zone.js**; вместо тотальной проверки Angular точечно обновляет только помеченные view.
- Сигналы, события шаблона, \`async\` pipe и \`markForCheck\` — вот что помечает view грязным.
- Изменения **склеиваются** (coalescing) в один проход CD через планировщик.
- Меняешь состояние вне сигналов? В zoneless нужен сигнал или явный \`markForCheck\`.`,
      en: `## 🧩 In plain words

Angular used to work like an over-cautious guard: at the slightest sneeze (a click, a timer, a server request) it walked through the **whole** house and checked every room in case something changed. The Zone.js library ran that patrol. Zoneless mode fires the guard: now each "room" raises its own hand and says "my data changed, check just me". Signals are that hand-raising mechanism.

### The zoneless idea

In zoneless mode (turned on by the \`provideZonelessChangeDetection()\` provider) Angular does **not** use Zone.js. Zone.js is a library that intercepted every async operation (\`setTimeout\`, promises, events) and ran a full change check after each one. Instead of the "check everything on any async op" strategy, the framework now knows precisely **which** components need updating.

### How change detection is triggered

Change detection (CD) is the process where Angular compares data against what's on screen and updates the DOM. In zoneless, a view (a component's rendered representation) is marked "dirty" (needs rechecking) from these sources:

- A change to a **signal** read in the template.
- A template event handler firing (e.g. \`(click)\`).
- A call to \`markForCheck()\` or the \`async\` pipe (\`AsyncPipe\`) doing its work.
- A new value set on a signal input.

Under the hood, every signal read in a template is linked to the component's \`LView\` (the internal data structure describing a view instance) via a **reactive consumer** — a consumer object that watches that signal. On a signal write the consumer calls \`markViewDirty\`, and Angular schedules CD through a \`scheduler\` (a microtask-based or \`requestAnimationFrame\`-like mechanism).

### Coalescing

Several changes within one "tick" (one turn of the event loop) are **batched** into a single CD pass. This is the job of the \`ChangeDetectionScheduler\`, which debounces (holds and merges) update requests so the screen isn't repainted ten times in a row.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

### What changes for the developer

- Code that mutates state **outside signals** (plain class fields) no longer triggers CD automatically — you need signals or an explicit \`markForCheck\`.
- \`setTimeout\` and \`Promise\` on their own no longer start CD (Zone.js used to do that for you).
- Smaller bundle (no ~30 KB Zone.js), less overhead, and CD itself is predictable and targeted — only what actually changed gets updated.

### Status

As of Angular 18 zoneless is in developer preview, stabilizing in versions 19-20. It is a strategic direction for the framework: **signals + OnPush + zoneless** is Angular's new performance model.

## ⚠️ Common pitfalls

- Mutating a plain field (not a signal) in zoneless won't repaint the template — an easy way to get a "stuck" UI.
- Old code relying on automatic CD after a \`setTimeout\`/promise may stop updating.
- Third-party libraries that changed the DOM behind Angular's back may now need an explicit \`markForCheck\`.

## 🎯 Key takeaways

- Zoneless = **no Zone.js**; instead of a total sweep, Angular targets only the marked views.
- Signals, template events, the \`async\` pipe, and \`markForCheck\` are what mark a view dirty.
- Changes are **coalesced** into a single CD pass by the scheduler.
- Mutating state outside signals? In zoneless you need a signal or an explicit \`markForCheck\`.`,
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
      ru: `## 🧩 Простыми словами

Компонент общается с родителем через "входы" (что ему передают сверху) и "выходы" (о чём он сообщает наверх). Раньше это делали декораторы \`@Input()\` и \`@Output()\`. Новый способ — функции \`input()\`, \`model()\` и \`output()\`, где вход это уже **сигнал** (живая, реактивная ячейка). Разница как между обычной переменной и ячейкой Excel: новый вход сам протягивает изменения дальше, без ручной возни с \`ngOnChanges\`.

### input() — реактивный вход

\`input()\` — это сигнал только для чтения, представляющий входное свойство. В отличие от классического \`@Input()\`:

- Значение читается как функция — \`this.value()\` — и оно реактивно, то есть его можно напрямую подставлять в \`computed\`.
- Не нужен хук \`ngOnChanges\`: производные значения строятся через \`computed\`, а не пересчитываются вручную при каждом изменении.
- \`input.required<T>()\` делает вход обязательным и проверяет это **на этапе компиляции** — забыл передать, и код не соберётся.
- Поддерживает трансформацию значения на входе: \`input(false, { transform: booleanAttribute })\` — например, превратит строковый атрибут в булево.

\`\`\`ts
size = input<number>(10);
double = computed(() => this.size() * 2);
\`\`\`

Здесь \`double\` сам пересчитается, как только родитель передаст новый \`size\`.

### model() — двусторонняя связь

\`model()\` — это **two-way** (двусторонний) сигнал, объединяющий вход и выход в одном. Он создаёт свойство \`prop\` и неявный \`propChange\`, что позволяет родителю писать банан-в-коробке: \`[(prop)]\`. Это **writable**-сигнал (в него можно писать): внутри компонента вызываешь \`this.value.set(...)\`, и изменение автоматически пробрасывается наверх, в родителя.

\`\`\`ts
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

\`update\` берёт текущее значение и возвращает новое — здесь просто инвертирует галочку, и родитель тут же узнаёт об этом.

### output() — выход-событие

\`output()\` — замена \`@Output() EventEmitter\`. Возвращает объект с методом \`emit\`, которым ты шлёшь событие наверх. Важный нюанс: \`output()\` **не** является сигналом и **не** наследует \`EventEmitter\`/\`Subject\` — это намеренно более лёгкая абстракция. Для стыковки с RxJS есть помощники \`outputFromObservable\` (сделать output из потока) и \`outputToObservable\` (превратить output в поток).

### Преимущества

- Полная типобезопасность и реактивность из коробки.
- В режимах zoneless/OnPush изменение signal-input **автоматически** помечает view грязным — не нужно вручную звать \`markForCheck\`.
- Меньше шаблонного кода: нет объекта \`SimpleChanges\` и хука \`ngOnChanges\`.

### Нюанс совместимости

Сигнальные \`input\`/\`model\`/\`output\` доступны только в standalone-стиле и требуют Angular 17.1+. Классический \`@Input\`/\`@Output\` остаётся в языке для совместимости со старым кодом.

## ⚠️ Подводные камни

- \`input()\` — только для чтения; чтобы менять значение внутри компонента и отдавать наверх, нужен \`model()\`.
- \`output()\` не \`EventEmitter\` — не жди методов RxJS, для потоков используй \`outputFromObservable\`/\`outputToObservable\`.
- Забыл \`.required\` там, где значение обязательно — потеряешь compile-time проверку.
- Работает только в standalone и с Angular 17.1+.

## 🎯 Запомни

- **input()** = вход-сигнал только для чтения; производные значения — через \`computed\`, без \`ngOnChanges\`.
- **model()** = двусторонний writable-сигнал для \`[(prop)]\`.
- **output()** = лёгкая замена \`@Output\`, объект с \`emit\`, не сигнал и не \`EventEmitter\`.
- В zoneless/OnPush signal-input сам помечает view грязным — \`markForCheck\` не нужен.`,
      en: `## 🧩 In plain words

A component talks to its parent through "inputs" (what it's handed from above) and "outputs" (what it reports upward). This used to be done with the \`@Input()\` and \`@Output()\` decorators. The new way is the functions \`input()\`, \`model()\`, and \`output()\`, where an input is now a **signal** (a live, reactive cell). The difference is like an ordinary variable versus an Excel cell: the new input threads changes onward by itself, with no manual \`ngOnChanges\` fiddling.

### input() — a reactive input

\`input()\` is a read-only signal representing an input property. Unlike the classic \`@Input()\`:

- The value is read as a function — \`this.value()\` — and it's reactive, so you can drop it straight into a \`computed\`.
- No \`ngOnChanges\` hook needed: derived values are built with \`computed\` instead of being recomputed by hand on every change.
- \`input.required<T>()\` makes the input mandatory and checks it **at compile time** — forget to pass it and the code won't build.
- Supports transforming the incoming value: \`input(false, { transform: booleanAttribute })\` — e.g. turning a string attribute into a boolean.

\`\`\`ts
size = input<number>(10);
double = computed(() => this.size() * 2);
\`\`\`

Here \`double\` recomputes itself the moment the parent passes a new \`size\`.

### model() — two-way binding

\`model()\` is a **two-way** signal that combines input and output in one. It creates a \`prop\` property and an implicit \`propChange\`, letting the parent write the banana-in-a-box: \`[(prop)]\`. It's a **writable** signal (you can write into it): inside the component you call \`this.value.set(...)\`, and the change automatically propagates upward to the parent.

\`\`\`ts
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

\`update\` takes the current value and returns a new one — here it just flips the checkbox, and the parent learns about it immediately.

### output() — an event output

\`output()\` replaces \`@Output() EventEmitter\`. It returns an object with an \`emit\` method you use to send an event upward. Important nuance: \`output()\` is **not** a signal and does **not** extend \`EventEmitter\`/\`Subject\` — it's deliberately a lighter abstraction. For RxJS interop there are helpers \`outputFromObservable\` (build an output from a stream) and \`outputToObservable\` (turn an output into a stream).

### Advantages

- Full type safety and reactivity out of the box.
- In zoneless/OnPush modes a signal-input change **automatically** marks the view dirty — no need to call \`markForCheck\` by hand.
- Less boilerplate: no \`SimpleChanges\` object and no \`ngOnChanges\` hook.

### Compatibility nuance

Signal-based \`input\`/\`model\`/\`output\` are standalone-style only and require Angular 17.1+. The classic \`@Input\`/\`@Output\` stays in the language for compatibility with older code.

## ⚠️ Common pitfalls

- \`input()\` is read-only; to change the value inside the component and push it up, you need \`model()\`.
- \`output()\` is not an \`EventEmitter\` — don't expect RxJS methods; for streams use \`outputFromObservable\`/\`outputToObservable\`.
- Forget \`.required\` where a value is mandatory and you lose the compile-time check.
- Works only in standalone and with Angular 17.1+.

## 🎯 Key takeaways

- **input()** = a read-only signal input; derive values with \`computed\`, no \`ngOnChanges\`.
- **model()** = a two-way writable signal for \`[(prop)]\`.
- **output()** = a lightweight replacement for \`@Output\`, an object with \`emit\`, not a signal and not an \`EventEmitter\`.
- In zoneless/OnPush a signal-input marks the view dirty itself — no \`markForCheck\` needed.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у сигналов Angular есть два неудобных места. Первое: тебе нужно значение, которое само пересчитывается, когда меняется что-то другое, но при этом его можно и руками поменять. Второе: тебе нужно подгрузить данные с сервера и по-хорошему показать спиннер, ошибку или результат. \`linkedSignal\` закрывает первую боль, \`resource()\` — вторую. Оба — это готовые инструменты, чтобы не писать этот скучный код вручную.

Небольшой словарь: **сигнал (signal)** — это коробочка со значением, которая умеет сообщать всем, кто её читает, что значение поменялось. \`computed\` — сигнал, который вычисляется из других и его нельзя записать вручную.

### Зачем нужен linkedSignal

Иногда нужно состояние, которое **производно** от другого сигнала (то есть зависит от него), но при этом **локально записываемо** (его можно менять руками). Классический пример: выбранный элемент в выпадающем списке. Он должен сбрасываться, когда список поменялся, но пользователь может и сам выбрать другой пункт.

Обычными инструментами это не сделать: \`computed\` записать нельзя, а простой \`signal\` не реагирует на изменение источника. \`linkedSignal\` объединяет оба поведения:

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // можно писать
\`\`\`

Здесь \`source\` — это сигнал-источник, за которым мы следим (список опций). \`computation\` — функция пересчёта: она получает новое значение источника (\`opts\`) и предыдущее состояние (\`prev\`). Логика простая: если старый выбор всё ещё есть в новом списке — оставляем его, иначе берём первый элемент. При изменении \`source\` значение пересчитывается автоматически, но между изменениями \`selected\` ведёт себя как обычный writable-сигнал, которому можно делать \`.set()\`.

### Зачем нужен resource()

\`resource()\` — это реактивная обёртка над **асинхронной** загрузкой данных (запросом на сервер). Ты описываешь два куска: \`request\` — сигнал с параметрами запроса, и \`loader\` — async-функцию, которая эти данные загружает. Когда \`request\` меняется, \`resource\` сам перезапускает загрузку и **отменяет** предыдущий запрос через \`AbortSignal\` (стандартный механизм отмены fetch).

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

Смени \`userId\` — и \`resource\` сам сходит за новым пользователем, а старый недогруженный запрос отменит. Читать результат можно через набор сигналов: \`.value()\` — данные, \`.status()\` — текущее состояние, \`.error()\` — ошибка, \`.isLoading()\` — идёт ли загрузка.

### Что конкретно даёт resource

- Состояния \`idle | loading | resolved | error\` из коробки — не нужно вручную заводить флаги "загружается" и "ошибка".
- Автоматическая отмена устаревших запросов — это спасает от **race conditions** (когда ответ на старый запрос приходит позже нового и перетирает свежие данные).
- Реактивная зависимость от сигналов-параметров: поменялся параметр — перезагрузились данные.
- \`rxResource\` — вариант для тех, кто хочет интеграцию с RxJS (библиотека реактивных потоков).

### Статус

Обе API экспериментальные (Angular 19+), то есть их синтаксис ещё может измениться. Но это чёткое направление Angular — "реактивные данные" без ручного управления подписками.

## ⚠️ Подводные камни

- API экспериментальные — в проде используй осознанно, синтаксис может поменяться между версиями.
- \`resource()\` — не замена полноценному кешированию/стейт-менеджеру: это про загрузку по параметру, а не про глобальный кеш.
- Не забывай прокидывать \`abortSignal\` в \`fetch\`, иначе автоотмена запросов работать не будет.

## 🎯 Запомни

- \`linkedSignal\` — производный **и** записываемый сигнал: пересчитывается от источника, но его можно и \`.set()\`.
- \`resource()\` — реактивная загрузка данных с готовыми состояниями и автоотменой устаревших запросов.
- Оба убирают ручную рутину: сброс зависимого состояния и ручное управление флагами загрузки/подписками.`,
      en: `## 🧩 In plain words

Signals in Angular have two awkward spots. First: sometimes you want a value that recomputes itself when something else changes, but that you can also set by hand. Second: sometimes you need to load data from a server and cleanly show a spinner, an error, or the result. \`linkedSignal\` fixes the first pain, \`resource()\` fixes the second. Both are ready-made tools so you don't have to write that boring plumbing yourself.

Quick glossary: a **signal** is a little box holding a value that can notify everyone reading it when the value changes. A \`computed\` is a signal derived from other signals — you cannot set it by hand.

### Why linkedSignal exists

Sometimes you need state that is **derived** from another signal (it depends on it) yet is **locally writable** (you can set it by hand too). The classic example: a selected item in a dropdown. It should reset when the list changes, but the user can also pick a different item themselves.

The usual tools can't do this: \`computed\` is not writable, and a plain \`signal\` doesn't react to the source changing. \`linkedSignal\` combines both behaviors:

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // writable
\`\`\`

Here \`source\` is the signal we watch (the list of options). \`computation\` is the recompute function: it gets the new source value (\`opts\`) and the previous state (\`prev\`). The logic is simple: if the old choice still exists in the new list, keep it, otherwise take the first item. When \`source\` changes the value is recomputed automatically, but between changes \`selected\` behaves like a normal writable signal you can \`.set()\`.

### Why resource() exists

\`resource()\` is a reactive wrapper over **async** data loading (a server request). You describe two pieces: \`request\` — a signal of the request parameters, and \`loader\` — an async function that fetches the data. When \`request\` changes, \`resource\` restarts loading by itself and **cancels** the previous request via \`AbortSignal\` (the standard mechanism for cancelling fetch).

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

Change \`userId\` and \`resource\` goes and fetches the new user by itself, cancelling the old half-finished request. You read the result through a set of signals: \`.value()\` — the data, \`.status()\` — the current state, \`.error()\` — the error, \`.isLoading()\` — whether loading is in progress.

### What resource gives you

- \`idle | loading | resolved | error\` states out of the box — no need to hand-roll "loading" and "error" flags.
- Automatic cancellation of stale requests — this saves you from **race conditions** (when the response to an old request arrives after a newer one and overwrites fresh data).
- Reactive dependency on parameter signals: change a parameter, the data reloads.
- \`rxResource\` — a variant for those who want RxJS integration (the reactive-streams library).

### Status

Both APIs are experimental (Angular 19+), meaning the syntax may still change. But they represent a clear Angular direction — "reactive data" without manual subscription management.

## ⚠️ Common pitfalls

- The APIs are experimental — use in production consciously, the syntax can shift between versions.
- \`resource()\` is not a full caching/state-management replacement: it's about loading by a parameter, not a global cache.
- Don't forget to pass \`abortSignal\` into \`fetch\`, otherwise the auto-cancellation won't work.

## 🎯 Key takeaways

- \`linkedSignal\` — a derived **and** writable signal: recomputes from a source, but you can also \`.set()\` it.
- \`resource()\` — reactive data loading with ready-made states and automatic cancellation of stale requests.
- Both remove manual chores: resetting dependent state, and hand-managing loading flags/subscriptions.`,
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
      ru: `## 🧩 Простыми словами

**DI (Dependency Injection, внедрение зависимостей)** — это когда ты не создаёшь сервисы сам через \`new\`, а просишь Angular "дай мне вот такой сервис", и он находит и подсовывает готовый экземпляр. **Инжектор** — это тот, кто хранит и выдаёт эти сервисы. Представь дерево вложенных ящиков: просишь инструмент — сначала ищут в твоём ящике, не нашли — идут в ящик родителя, и так до самого верха. В Angular таких деревьев целых два, и понимание, как они соединяются, спасает от вопроса "почему мне пришёл не тот сервис".

### Две параллельные иерархии

У Angular **две** иерархии инжекторов, которые работают вместе.

#### 1. EnvironmentInjector (раньше назывался ModuleInjector)

Дерево, привязанное к приложению в целом и к lazy-загруженным участкам роутера (**lazy** — подгружаемым по требованию, а не сразу). Его цепочка корней: \`root\` (сюда попадает всё с \`providedIn: 'root'\`), затем \`platform\`, затем \`null\`. Провайдеры сюда приходят из: \`providedIn\`, \`providers\` в \`bootstrapApplication\` (точка старта приложения), \`providers\` у lazy-роутов. Эти провайдеры — **синглтоны** (единственный экземпляр) в рамках своего environment.

#### 2. ElementInjector

Дерево, привязанное к **DOM-элементам** и к компонентам/директивам. Каждый компонент, у которого прописан свой \`providers: [...]\`, создаёт узел в этом дереве. Иерархия точно повторяет структуру шаблона: как компоненты вложены в разметке, так вложены и инжекторы.

### Как Angular ищет сервис (алгоритм резолвинга)

Когда ты пишешь \`inject(Token)\`, Angular ищет так:

1. Сначала вверх по дереву **ElementInjector** — от текущего элемента к корневому компоненту.
2. Если не нашёл — переходит в дерево **EnvironmentInjector** и идёт вверх до \`root\` и \`platform\`.
3. Если нигде нет — бросает \`NullInjectorError\` (или возвращает \`null\`, если зависимость помечена \`@Optional\`).

Схематично точка соединения двух деревьев выглядит так:

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (merge point)
EnvironmentInjector (route) → root → platform → null
\`\`\`

То есть сначала полностью проходит "элементное" дерево, а потом "environment"-дерево. Оба соединяются в одну общую цепочку поиска.

### Практические следствия

- \`providers\` внутри \`@Component\` создаёт **новый экземпляр сервиса на каждый инстанс компонента**. Это удобно для scoped-сервисов, живущих только внутри компонента — например, состояние конкретной формы.
- \`providedIn: 'root'\` — синглтон на всё приложение, и он **tree-shakable** (если сервис нигде не используется, сборщик выкинет его из бандла).
- Резолюция всегда возвращает **первое совпадение снизу вверх**. Именно это позволяет локально переопределять сервис: объявил свой ближе к компоненту — получишь его, а не глобальный.

Понимание этих двух деревьев — ключ к отладке ситуаций "почему мне прилетает не тот экземпляр сервиса".

## ⚠️ Подводные камни

- \`providers\` в \`@Component\` — это не "настроить один сервис", а "создать отдельный экземпляр на каждый компонент". Легко случайно потерять общее состояние.
- \`providedIn: 'root'\` и \`providers\` в компоненте дают **разные** экземпляры — если оба, ближний (компонентный) победит.
- ElementInjector-дерево ищется **раньше** EnvironmentInjector — локальное переопределение всегда перебивает глобальное.

## 🎯 Запомни

- Две иерархии: **EnvironmentInjector** (приложение/модули/lazy-роуты) и **ElementInjector** (компоненты/директивы/DOM).
- Поиск идёт снизу вверх: сначала весь ElementInjector, затем EnvironmentInjector до \`root\` → \`platform\` → \`null\`.
- \`providers\` в компоненте = новый экземпляр на компонент; \`providedIn: 'root'\` = tree-shakable синглтон.`,
      en: `## 🧩 In plain words

**DI (Dependency Injection)** means you don't create services yourself with \`new\` — you ask Angular "give me this service" and it finds and hands you a ready instance. An **injector** is the thing that stores and hands out those services. Picture a tree of nested boxes: you ask for a tool — they look in your box first, not there, they check your parent's box, and so on up to the top. In Angular there are actually two such trees, and understanding how they connect saves you from the "why did I get the wrong service" headache.

### Two parallel hierarchies

Angular has **two** injector hierarchies that work together.

#### 1. EnvironmentInjector (formerly ModuleInjector)

A tree tied to the application as a whole and to lazy-loaded router segments (**lazy** = loaded on demand, not upfront). Its root chain is \`root\` (everything with \`providedIn: 'root'\` lands here), then \`platform\`, then \`null\`. Providers come here from: \`providedIn\`, \`providers\` in \`bootstrapApplication\` (the app's entry point), and \`providers\` of lazy routes. These providers are **singletons** (a single instance) within their environment.

#### 2. ElementInjector

A tree tied to **DOM elements** and to components/directives. Each component that declares its own \`providers: [...]\` creates a node in this tree. The hierarchy mirrors the template structure exactly: however components nest in the markup, that's how the injectors nest.

### How Angular finds a service (the resolution algorithm)

When you write \`inject(Token)\`, Angular searches like this:

1. First up the **ElementInjector** tree — from the current element to the root component.
2. If not found — it moves into the **EnvironmentInjector** tree and walks up to \`root\` and \`platform\`.
3. If nowhere — it throws \`NullInjectorError\` (or returns \`null\` if the dependency is marked \`@Optional\`).

Schematically, the point where the two trees join looks like this:

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (merge point)
EnvironmentInjector (route) → root → platform → null
\`\`\`

So it fully walks the "element" tree first, then the "environment" tree. The two connect into one combined search chain.

### Practical consequences

- \`providers\` inside \`@Component\` create a **new service instance per component instance**. Handy for scoped services that live only inside a component — for example, one form's state.
- \`providedIn: 'root'\` is an app-wide singleton and it is **tree-shakable** (if the service is never used, the bundler drops it from the bundle).
- Resolution always returns the **first match bottom-up**. That's exactly what lets you override a service locally: declare your own closer to the component and you get it instead of the global one.

Understanding these two trees is the key to debugging "why am I getting the wrong service instance" situations.

## ⚠️ Common pitfalls

- \`providers\` in \`@Component\` doesn't mean "configure one service" — it means "create a separate instance per component." Easy to accidentally lose shared state.
- \`providedIn: 'root'\` and a component's \`providers\` give **different** instances — if both exist, the closer (component) one wins.
- The ElementInjector tree is searched **before** the EnvironmentInjector — a local override always beats the global one.

## 🎯 Key takeaways

- Two hierarchies: **EnvironmentInjector** (app/modules/lazy routes) and **ElementInjector** (components/directives/DOM).
- Search goes bottom-up: all of ElementInjector first, then EnvironmentInjector up to \`root\` → \`platform\` → \`null\`.
- \`providers\` in a component = a new instance per component; \`providedIn: 'root'\` = a tree-shakable singleton.`,
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
      ru: `## 🧩 Простыми словами

Когда компонент просит зависимость через DI, Angular по умолчанию ищет её "снизу вверх" по дереву инжекторов — от самого компонента и до корня приложения. Модификаторы резолвинга — это четыре наклейки, которыми ты говоришь Angular: "ищи только у себя", "начни с родителя", "если нет — не падай, верни null", "не выходи за границу хоста". По сути это пульт управления тем, **где** и **как далеко** Angular будет искать сервис.

Напоминание: **ElementInjector** — инжектор, привязанный к компоненту/директиве; поиск по умолчанию идёт вверх по этому дереву.

### @Optional — "нет так нет"

Если зависимость не найдена, вернуть \`null\` вместо выброса \`NullInjectorError\` (ошибки "сервис не найден"). Полезно для необязательных сервисов и токенов конфигурации, которых может и не быть.

### @Self — "только у меня"

Искать токен **только** в собственном ElementInjector текущего компонента/директивы, не поднимаясь выше. Если локально не предоставлено — ошибка (или \`null\`, если добавить \`@Optional\`). Применяют, когда сервис обязан быть объявлен прямо здесь, а не унаследован откуда-то сверху.

### @SkipSelf — "начни с родителя"

**Пропустить** собственный инжектор и начать поиск сразу с родительского. Классический сценарий — guard (защита) от повторной загрузки модуля, или доступ к родительскому экземпляру сервиса в ситуации, когда текущий компонент сам этот сервис переопределяет.

### @Host — "не дальше хоста"

Ограничить поиск **границей host-компонента**. Поиск идёт вверх по ElementInjector, но **останавливается** на компоненте, который является хостом текущей директивы или спроецированного контента — не выходя в родительский компонент. Важно для директив, вставленных через \`ng-content\` (проекция контента, когда чужая разметка попадает внутрь твоего компонента).

### Функциональный синтаксис (inject)

Раньше модификаторы вешали декораторами в конструкторе. Современный способ — функция \`inject()\` с флагами-опциями:

\`\`\`ts
const logger = inject(LoggerService, { optional: true });
const parent = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });
\`\`\`

Флаги (\`optional\`, \`self\`, \`skipSelf\`, \`host\`) делают ровно то же, что одноимённые декораторы, просто короче и без параметров конструктора.

### Комбинации

Модификаторы можно **сочетать**. Самая типичная пара — \`@Optional() @SkipSelf()\` в конструкторе сервиса, чтобы предотвратить повторную загрузку модуля:

\`\`\`ts
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

Логика такая: \`@SkipSelf()\` заставляет искать \`CoreModule\` не у себя, а выше; \`@Optional()\` разрешает не упасть, если его там нет. Если родитель нашёлся — значит модуль уже подключён где-то выше, и мы кидаем понятную ошибку. Вместе эти модификаторы дают точный контроль над тем, **где** и **как глубоко** Angular ищет зависимость.

## ⚠️ Подводные камни

- \`@Self\` без \`@Optional\` кинет ошибку, если сервис не объявлен локально — часто это неожиданно.
- \`@Host\` останавливается на хосте, а не на "родительском компоненте вообще" — легко перепутать при работе с \`ng-content\`.
- \`@SkipSelf\` пропускает **только** собственный инжектор, а не всё локальное дерево — он не "прыгает в самый верх".

## 🎯 Запомни

- \`@Optional\` — не найдено → \`null\` вместо ошибки; \`@Self\` — искать только у себя; \`@SkipSelf\` — начать с родителя; \`@Host\` — не выходить за границу хоста.
- Функциональный аналог — \`inject(Token, { optional, self, skipSelf, host })\`.
- Классика \`@Optional() @SkipSelf()\` — guard от повторной загрузки модуля.`,
      en: `## 🧩 In plain words

When a component asks for a dependency via DI, Angular by default searches "bottom-up" through the injector tree — from the component itself up to the app root. The resolution modifiers are four stickers you use to tell Angular: "look only in me," "start at the parent," "if it's missing don't crash, return null," "don't cross the host boundary." Essentially they're a remote control for **where** and **how far** Angular searches for a service.

Reminder: an **ElementInjector** is the injector tied to a component/directive; the default search walks up that tree.

### @Optional — "if it's not there, fine"

If the dependency isn't found, return \`null\` instead of throwing \`NullInjectorError\` (the "service not found" error). Useful for optional services and config tokens that may not exist.

### @Self — "only in me"

Look up the token **only** in the current component/directive's own ElementInjector, without going higher. If it's not provided locally — error (or \`null\` if you add \`@Optional\`). Used when a service must be declared right here rather than inherited from somewhere above.

### @SkipSelf — "start at the parent"

**Skip** the own injector and start searching from the parent immediately. The classic scenario is a guard against reloading a module, or accessing the parent instance of a service when the current component itself overrides that service.

### @Host — "no further than the host"

Limit the search to the **host component boundary**. The search walks up the ElementInjector but **stops** at the component that is the host of the current directive or projected content — without entering the parent component. Important for directives inserted through \`ng-content\` (content projection, where someone else's markup ends up inside your component).

### Functional syntax (inject)

Modifiers used to be applied as decorators in the constructor. The modern way is the \`inject()\` function with option flags:

\`\`\`ts
const logger = inject(LoggerService, { optional: true });
const parent = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });
\`\`\`

The flags (\`optional\`, \`self\`, \`skipSelf\`, \`host\`) do exactly what the same-named decorators do, just shorter and without constructor parameters.

### Combinations

Modifiers can be **combined**. The most typical pair is \`@Optional() @SkipSelf()\` in a service's constructor to prevent reloading a module:

\`\`\`ts
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

The logic: \`@SkipSelf()\` forces the search for \`CoreModule\` to start above rather than in itself; \`@Optional()\` allows it not to crash if it's absent there. If a parent is found, the module is already loaded somewhere higher up, so we throw a clear error. Together these modifiers give precise control over **where** and **how deep** Angular searches for a dependency.

## ⚠️ Common pitfalls

- \`@Self\` without \`@Optional\` throws if the service isn't declared locally — often a surprise.
- \`@Host\` stops at the host, not at "the parent component in general" — easy to mix up when working with \`ng-content\`.
- \`@SkipSelf\` skips **only** the own injector, not the whole local tree — it does not "jump to the very top."

## 🎯 Key takeaways

- \`@Optional\` — not found → \`null\` instead of an error; \`@Self\` — search only in yourself; \`@SkipSelf\` — start at the parent; \`@Host\` — don't cross the host boundary.
- The functional equivalent is \`inject(Token, { optional, self, skipSelf, host })\`.
- The classic \`@Optional() @SkipSelf()\` is a guard against reloading a module.`,
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
      ru: `## 🧩 Простыми словами

Система DI в Angular — это как склад, где каждый сервис лежит под своим **ключом**. Для классов ключом служит сам класс. Но что, если тебе нужно положить на склад не класс, а строку (например, адрес API) или объект-конфиг? Строку \`'api.url'\` легко случайно спутать с другой такой же строкой. \`InjectionToken\` — это уникальный именной ключ, который ни с чем не перепутаешь. А **multi-провайдеры** — способ повесить на один ключ сразу несколько значений и получить их списком.

### Зачем нужен InjectionToken

DI Angular использует токены как ключи для поиска зависимостей. Для классов ключ — сам класс. Но для **не-классовых** значений (строки, конфиги, функции, интерфейсы) нужен \`InjectionToken\` — уникальный объект-ключ, который нельзя спутать с другими.

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);
\`\`\`

Здесь \`'api.url'\` — просто человекочитаемое описание для отладки, а сам ключ — это уникальный объект \`API_URL\`. \`factory\` — функция, задающая значение по умолчанию, а \`providedIn: 'root'\` делает токен доступным во всём приложении.

Важный момент: **интерфейсы нельзя использовать как токены**. TypeScript-интерфейсы существуют только на этапе компиляции и полностью стираются в готовом JS — в рантайме их просто нет, поэтому ключом они быть не могут. Для них \`InjectionToken\` обязателен.

### Как работают multi-провайдеры

Флаг \`multi: true\` позволяет **нескольким** провайдерам зарегистрироваться под **одним и тем же** токеном. При инъекции Angular вернёт не одно значение, а **массив** всех зарегистрированных.

\`\`\`ts
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

Оба провайдера пишут под ключ \`HTTP_INTERCEPTORS\`, и при инъекции ты получишь массив \`[AuthInterceptor, LogInterceptor]\`, а не только последний.

### Где это используется

- \`HTTP_INTERCEPTORS\` — цепочка интерсепторов (перехватчиков HTTP-запросов).
- \`APP_INITIALIZER\` — несколько функций-инициализаторов, выполняемых при старте приложения.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — набор кастомных валидаторов форм.
- Плагины: несколько независимых модулей добавляют свои обработчики под общий токен.

### Нюанс

Все провайдеры под одним токеном должны быть **либо все \`multi\`, либо все не-\`multi\`** — смешивание выбрасывает ошибку. По сути \`multi\` — это механизм расширяемости: каркас (фреймворк или библиотека) определяет токен, а отдельные фичи добавляют свои реализации, ничего не зная друг о друге. Так интерсепторы, валидаторы и инициализаторы можно "докидывать" из разных мест приложения.

## ⚠️ Подводные камни

- Нельзя смешивать \`multi: true\` и обычные провайдеры под одним токеном — Angular кинет ошибку.
- Интерфейс как токен не сработает — он стирается при компиляции; всегда используй \`InjectionToken\`.
- Забыл \`multi: true\` хотя бы у одного провайдера в наборе — получишь ошибку или потеряешь значения.

## 🎯 Запомни

- \`InjectionToken\` — уникальный ключ DI для не-классовых значений (строки, конфиги, функции, интерфейсы).
- \`multi: true\` — несколько провайдеров под одним токеном; при инъекции возвращается **массив**.
- Все провайдеры токена — либо все \`multi\`, либо все нет; это механизм расширяемости (интерсепторы, инициализаторы, валидаторы).`,
      en: `## 🧩 In plain words

Angular's DI system is like a warehouse where every service sits under its own **key**. For classes the class itself is the key. But what if you need to store not a class but a string (say, an API address) or a config object? The string \`'api.url'\` is easy to accidentally confuse with another identical string. An \`InjectionToken\` is a unique, named key you can't mix up with anything else. And **multi-providers** are a way to hang several values on one key and get them back as a list.

### Why you need InjectionToken

Angular DI uses tokens as keys to look up dependencies. For classes the key is the class itself. But for **non-class** values (strings, configs, functions, interfaces) you need an \`InjectionToken\` — a unique key object that cannot be confused with others.

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);
\`\`\`

Here \`'api.url'\` is just a human-readable description for debugging, while the actual key is the unique object \`API_URL\`. \`factory\` is a function that supplies the default value, and \`providedIn: 'root'\` makes the token available across the whole app.

An important point: **interfaces cannot be used as tokens**. TypeScript interfaces exist only at compile time and are fully erased from the output JS — at runtime they simply don't exist, so they can't be a key. For them an \`InjectionToken\` is mandatory.

### How multi-providers work

The \`multi: true\` flag lets **several** providers register under **one and the same** token. On injection Angular returns not a single value but an **array** of all the registered ones.

\`\`\`ts
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

Both providers write under the \`HTTP_INTERCEPTORS\` key, and on injection you get the array \`[AuthInterceptor, LogInterceptor]\`, not just the last one.

### Where it is used

- \`HTTP_INTERCEPTORS\` — the interceptor chain (HTTP request interceptors).
- \`APP_INITIALIZER\` — several initializer functions run at app startup.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — a set of custom form validators.
- Plugins: several independent modules add their own handlers under a shared token.

### Nuance

All providers under one token must be **either all \`multi\` or all non-\`multi\`** — mixing throws an error. In essence \`multi\` is an extensibility mechanism: the framework (or a library) defines the token, and individual features add their own implementations without knowing about each other. That's how interceptors, validators, and initializers can be "dropped in" from different parts of the app.

## ⚠️ Common pitfalls

- You can't mix \`multi: true\` and regular providers under one token — Angular throws.
- An interface as a token won't work — it's erased at compile time; always use an \`InjectionToken\`.
- Forget \`multi: true\` on even one provider in the set and you'll get an error or lose values.

## 🎯 Key takeaways

- \`InjectionToken\` — a unique DI key for non-class values (strings, configs, functions, interfaces).
- \`multi: true\` — several providers under one token; injection returns an **array**.
- All providers for a token are either all \`multi\` or all not; it's an extensibility mechanism (interceptors, initializers, validators).`,
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
      ru: `## 🧩 Простыми словами

Представь, что твоему классу нужны «инструменты» (сервисы) для работы. Раньше ты заказывал их через конструктор — как список ингредиентов, которые тебе приносят на входе. Функция \`inject()\` — это как достать нужный инструмент прямо из ящика в тот момент, когда он тебе понадобился, не выписывая длинный список на входе. Angular заранее знает, где лежат все инструменты (это называется **DI**, dependency injection — механизм, который сам создаёт и подаёт зависимости), и \`inject()\` просто берёт нужный.

### Что такое inject()

\`inject()\` — это функция, которая достаёт зависимость из текущего **injection-контекста** (момента и места, где Angular «знает», какой инжектор активен), не объявляя её в конструкторе.

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);
  private url = inject(API_URL);
}
\`\`\`

Здесь \`http\` и \`url\` получают свои значения прямо при создании полей — коротко и без конструктора.

### Чем это лучше конструктора

- **Меньше шаблонного кода (boilerplate):** не нужны длинные конструкторы с \`private\` перед каждым параметром.
- **Наследование:** подклассам не нужно пробрасывать зависимости родителя через \`super(...)\`. Родитель сам возьмёт то, что ему надо.
- **Переиспользуемые функции:** логику получения зависимостей можно вынести в отдельную helper-функцию (например, \`injectRouterParams()\`) и звать её из разных мест — с конструктором так нельзя.
- **Лучшая типизация опций:** например, \`inject(Token, { optional: true })\` — «возьми, а если нет — верни \`null\`, не падай».
- Чище работает с дженериками и абстрактными базовыми классами.

### Где можно вызывать

\`inject()\` работает **только в injection-контексте**. Это:
- Инициализаторы полей класса (как в примере выше).
- Конструктор.
- Фабрики провайдеров (\`useFactory\`, \`factory\` в \`InjectionToken\`).
- Функции, запущенные через \`runInInjectionContext(injector, fn)\`.
- Гварды, резолверы, интерсепторы — они выполняются в контексте.

А вот в обычном колбэке или внутри \`setTimeout\` контекста уже нет — Angular бросит ошибку \`NG0203\`.

\`\`\`ts
constructor() {
  setTimeout(() => inject(Foo)); // ОШИБКА: вне контекста
}
\`\`\`

### Как обойти, если контекст потерян

Сохрани сам \`Injector\` (это объект, который умеет выдавать зависимости) и позже оберни вызов в \`runInInjectionContext\` — она временно «включает» контекст:

\`\`\`ts
private injector = inject(Injector);
later() {
  runInInjectionContext(this.injector, () => inject(Foo));
}
\`\`\`

## ⚠️ Подводные камни

- Вызов \`inject()\` вне контекста (в \`setTimeout\`, промисе, event-колбэке) даёт ошибку \`NG0203\`.
- Не путай: сохранить \`Injector\` через \`inject(Injector)\` нужно **заранее**, в контексте, чтобы потом использовать его в \`runInInjectionContext\`.

## 🎯 Запомни

- \`inject()\` достаёт зависимость без объявления в конструкторе — меньше кода, удобнее наследование и helper-функции.
- Работает только в injection-контексте: поля класса, конструктор, фабрики, гварды/резолверы/интерсепторы.
- Вне контекста — ошибка \`NG0203\`; обход через \`runInInjectionContext(injector, fn)\`.
- Это рекомендованный стиль в современном Angular.`,
      en: `## 🧩 In plain words

Imagine your class needs some "tools" (services) to do its job. The old way was to request them through the constructor — like a list of ingredients handed to you at the door. The \`inject()\` function is like reaching into a drawer to grab the tool right when you need it, without writing a long intake list. Angular already knows where every tool lives (this is **DI**, dependency injection — the mechanism that creates and hands over dependencies for you), and \`inject()\` simply fetches the one you ask for.

### What inject() is

\`inject()\` is a function that pulls a dependency out of the current **injection context** (the moment and place where Angular knows which injector is active) without declaring it in the constructor.

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);
  private url = inject(API_URL);
}
\`\`\`

Here \`http\` and \`url\` get their values right as the fields are created — short, and no constructor needed.

### Why it beats the constructor

- **Less boilerplate:** no long constructors with \`private\` before every parameter.
- **Inheritance:** subclasses don't need to forward the parent's dependencies through \`super(...)\`. The parent grabs what it needs itself.
- **Reusable functions:** dependency-fetching logic can be extracted into a helper function (e.g. \`injectRouterParams()\`) and called from many places — impossible with a constructor.
- **Better typed options:** for example \`inject(Token, { optional: true })\` — "get it, and if it's missing return \`null\` instead of crashing".
- Works more cleanly with generics and abstract base classes.

### Where it can be called

\`inject()\` works **only in an injection context**. That means:
- Class field initializers (like in the example above).
- The constructor.
- Provider factories (\`useFactory\`, \`factory\` in \`InjectionToken\`).
- Functions run through \`runInInjectionContext(injector, fn)\`.
- Guards, resolvers, interceptors — they run inside a context.

But in a plain callback or inside \`setTimeout\` the context is gone — Angular throws error \`NG0203\`.

\`\`\`ts
constructor() {
  setTimeout(() => inject(Foo)); // ERROR: outside context
}
\`\`\`

### How to work around a lost context

Save the \`Injector\` itself (an object that knows how to hand out dependencies) and later wrap the call in \`runInInjectionContext\`, which temporarily "switches on" the context:

\`\`\`ts
private injector = inject(Injector);
later() {
  runInInjectionContext(this.injector, () => inject(Foo));
}
\`\`\`

## ⚠️ Common pitfalls

- Calling \`inject()\` outside a context (in \`setTimeout\`, a promise, an event callback) gives error \`NG0203\`.
- Note: you must save the \`Injector\` via \`inject(Injector)\` **in advance**, inside a context, so you can later use it with \`runInInjectionContext\`.

## 🎯 Key takeaways

- \`inject()\` fetches a dependency without declaring it in the constructor — less code, easier inheritance, and helper functions.
- It works only in an injection context: class fields, constructor, factories, guards/resolvers/interceptors.
- Outside a context — error \`NG0203\`; work around it with \`runInInjectionContext(injector, fn)\`.
- It's the recommended style in modern Angular.`,
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
      ru: `## 🧩 Простыми словами

У каждого компонента Angular есть «жизнь»: он рождается, живёт (реагирует на изменения) и умирает. **Хуки жизненного цикла** — это специальные методы, которые Angular вызывает за тебя в строго определённые моменты этой жизни. Думай о них как о будильниках: «сейчас компонент создан», «сейчас пришли новые данные», «сейчас всё отрисовано». Если знать порядок этих будильников, легко понять, где безопасно делать ту или иную работу.

### Порядок при инициализации

1. **constructor** — тут работает DI (получение зависимостей), но инпутов и view (шаблона) ещё нет.
2. **ngOnChanges** — вызывается, если у компонента есть \`@Input\` (входные свойства). Срабатывает перед \`ngOnInit\` и на каждом изменении инпута. Получает объект \`SimpleChanges\` со старым и новым значением.
3. **ngOnInit** — вызывается **один раз**, после первого \`ngOnChanges\`. Здесь инпуты уже установлены — хорошее место для стартовой инициализации.
4. **ngDoCheck** — на каждом цикле обнаружения изменений (CD, change detection — процесс, когда Angular проверяет, что поменялось). Для своей, ручной проверки изменений.
5. **ngAfterContentInit** — один раз, после проекции контента (контент, вставленный снаружи через \`<ng-content>\`).
6. **ngAfterContentChecked** — на каждом CD после проверки этого спроецированного контента.
7. **ngAfterViewInit** — один раз, после инициализации **собственного view и дочерних компонентов**. Здесь уже доступны элементы, найденные через \`@ViewChild\`.
8. **ngAfterViewChecked** — на каждом CD после проверки view.

### При уничтожении

9. **ngOnDestroy** — вызывается, когда компонент убирают. Место для отписок от подписок и очистки ресурсов (таймеров, слушателей), чтобы не текла память.

### Ключевые нюансы

- **Content против View:** content — это спроецированные снаружи дети (\`<ng-content>\`); view — собственный шаблон компонента. Content инициализируется **раньше** view.
- **Дети раньше родителя:** \`ngAfterViewInit\` родителя срабатывает **после** такого же хука у детей. Логично: чтобы родитель был «готов», сначала должны быть готовы его дети (порядок снизу вверх для view-хуков).
- \`@ViewChild\` (ссылка на элемент шаблона) доступен в \`ngAfterViewInit\`, но **не** в \`ngOnInit\` — если у запроса \`static: false\`. Со \`static: true\` элемент доступен уже в \`ngOnInit\`.
- Если менять состояние в хуках \`...Checked\`/\`...ViewInit\`, можно поймать ошибку \`ExpressionChangedAfterItHasBeenChecked\` — Angular замечает, что значение изменилось уже после проверки.

### Современный Angular

В мире zoneless (без библиотеки Zone.js) и сигналов появились \`afterRender\` и \`afterNextRender\` — для работы с DOM после отрисовки, они заменяют часть задач \`ngAfterViewInit\`. А \`computed\`/\`effect\` (реактивные вычисления на сигналах) вытесняют \`ngOnChanges\` для производных значений.

## ⚠️ Подводные камни

- Не читай \`@ViewChild\` в \`ngOnInit\` при \`static: false\` — там ещё \`undefined\`.
- Тяжёлую логику в \`ngDoCheck\` и \`...Checked\` держи лёгкой: они срабатывают на **каждом** цикле CD, очень часто.
- Забыть \`ngOnDestroy\` для отписок — классическая утечка памяти.

## 🎯 Запомни

- Порядок: constructor → ngOnChanges → ngOnInit → ngDoCheck → ngAfterContentInit/Checked → ngAfterViewInit/Checked → (при удалении) ngOnDestroy.
- Content-хуки идут раньше view-хуков; у детей view-хуки срабатывают раньше, чем у родителя.
- \`@ViewChild\` готов в \`ngAfterViewInit\` (при \`static: false\`).
- В современном Angular часть задач берут на себя \`afterRender\`, \`afterNextRender\`, \`computed\`/\`effect\`.`,
      en: `## 🧩 In plain words

Every Angular component has a "life": it's born, it lives (reacting to changes), and it dies. **Lifecycle hooks** are special methods that Angular calls for you at strictly defined moments of that life. Think of them as alarm clocks: "the component is now created", "new data just arrived", "everything is now rendered". Once you know the order of these alarms, it's easy to see where it's safe to do a given piece of work.

### Order during initialization

1. **constructor** — DI runs here (getting dependencies), but there are no inputs or view (template) yet.
2. **ngOnChanges** — called if the component has any \`@Input\` (input properties). Fires before \`ngOnInit\` and on every input change. Receives a \`SimpleChanges\` object with the old and new value.
3. **ngOnInit** — called **once**, after the first \`ngOnChanges\`. Inputs are set by now — a good place for startup initialization.
4. **ngDoCheck** — on every change-detection cycle (CD, change detection — the process where Angular checks what changed). For your own manual change checks.
5. **ngAfterContentInit** — once, after content projection (content passed in from outside via \`<ng-content>\`).
6. **ngAfterContentChecked** — on every CD after that projected content is checked.
7. **ngAfterViewInit** — once, after **the own view and child components** are initialized. Elements found via \`@ViewChild\` are available here.
8. **ngAfterViewChecked** — on every CD after the view is checked.

### On destruction

9. **ngOnDestroy** — called when the component is torn down. The place to unsubscribe and clean up resources (timers, listeners) so memory doesn't leak.

### Key nuances

- **Content vs View:** content is children projected from outside (\`<ng-content>\`); view is the component's own template. Content initializes **before** view.
- **Children before parent:** the parent's \`ngAfterViewInit\` fires **after** the same hook on its children. It makes sense: for the parent to be "ready", its children must be ready first (bottom-up for view hooks).
- \`@ViewChild\` (a reference to a template element) is available in \`ngAfterViewInit\`, but **not** in \`ngOnInit\` — if the query has \`static: false\`. With \`static: true\` the element is already available in \`ngOnInit\`.
- Changing state in \`...Checked\`/\`...ViewInit\` hooks can trigger the \`ExpressionChangedAfterItHasBeenChecked\` error — Angular notices the value changed after it had already been checked.

### Modern Angular

In the zoneless world (no Zone.js library) with signals, \`afterRender\` and \`afterNextRender\` appeared — for DOM work after render, replacing some \`ngAfterViewInit\` tasks. And \`computed\`/\`effect\` (reactive computations on signals) displace \`ngOnChanges\` for derived values.

## ⚠️ Common pitfalls

- Don't read \`@ViewChild\` in \`ngOnInit\` when \`static: false\` — it's still \`undefined\` there.
- Keep logic in \`ngDoCheck\` and \`...Checked\` light: they fire on **every** CD cycle, very often.
- Forgetting \`ngOnDestroy\` for unsubscribing is a classic memory leak.

## 🎯 Key takeaways

- Order: constructor → ngOnChanges → ngOnInit → ngDoCheck → ngAfterContentInit/Checked → ngAfterViewInit/Checked → (on removal) ngOnDestroy.
- Content hooks run before view hooks; children's view hooks fire before the parent's.
- \`@ViewChild\` is ready in \`ngAfterViewInit\` (with \`static: false\`).
- In modern Angular, \`afterRender\`, \`afterNextRender\`, and \`computed\`/\`effect\` take over some of these tasks.`,
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
      ru: `## 🧩 Простыми словами

Иногда компоненту нужно потрогать «настоящий» DOM — измерить размер элемента, поставить фокус, запустить стороннюю библиотеку графиков. Но делать это надо ровно тогда, когда браузер уже всё нарисовал, а не раньше. \`afterRender\` и \`afterNextRender\` — это способ сказать Angular: «выполни этот код после того, как страница отрисуется, и только в браузере». Это надёжнее старого \`ngAfterViewInit\`, особенно когда приложение рендерится ещё и на сервере.

### Проблема ngAfterViewInit

\`ngAfterViewInit\` срабатывает после инициализации view компонента, но **не гарантирует**, что весь DOM приложения уже отрисован и раскладка (layout) стабильна. Хуже того, при SSR (server-side rendering — когда HTML генерируется на сервере) этот хук выполняется **и на сервере**, где никакого настоящего DOM нет, и измерения вроде «какой ширины элемент» невозможны.

### afterNextRender

Это колбэк, который выполняется **один раз** после **следующей** отрисовки и **только в браузере** — на сервере он не запустится никогда. Идеален для:
- Измерений DOM (\`getBoundingClientRect\` — узнать позицию и размер элемента).
- Инициализации сторонних библиотек, работающих с DOM (графики, карты).
- Установки фокуса или скролла после рендера.

\`\`\`ts
constructor() {
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });
}
\`\`\`

Здесь график создаётся ровно тогда, когда \`<canvas>\` уже есть в реальном DOM.

### afterRender

Колбэк, выполняемый после **каждой** отрисовки (когда CD, обнаружение изменений, завершён и DOM обновлён). Нужен для постоянной синхронизации с DOM. Использовать осторожно: он вызывается часто и может бить по производительности.

### Фазы

Оба принимают \`phase\` — фазу, чтобы упорядочить работу с DOM и избежать **layout thrashing** (дёрганья раскладки, когда чтение и запись стилей чередуются и заставляют браузер пересчитывать layout снова и снова). Порядок фаз:
- \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.

Идея простая: сначала всё, что читает layout, потом всё, что пишет — тогда браузер пересчитывает раскладку один раз, а не десять.

\`\`\`ts
afterRender({
  read: () => { this.height = el.offsetHeight; },
  write: () => { el.style.transform = '...'; },
});
\`\`\`

### Ключевые отличия от ngAfterViewInit

- **Только браузер:** безопасны для SSR — на сервере просто не выполняются.
- Создаются в **injection-контексте** (обычно в конструкторе), а не как методы класса.
- \`afterNextRender\` — одноразовый; \`afterRender\` — на каждый рендер.
- Учитывают фазы для оптимизации reflow (пересчёта раскладки).

Это часть нового подхода Angular к рендерингу, особенно важного для zoneless (без Zone.js) и SSR/hydration (оживления серверного HTML на клиенте).

## ⚠️ Подводные камни

- Не вызывай \`afterRender\`/\`afterNextRender\` из обычных методов — только в injection-контексте, иначе будет ошибка.
- \`afterRender\` без нужды — дорогое удовольствие: он на каждом рендере, легко словить тормоза.
- Не полагайся на измерения DOM в \`ngAfterViewInit\` при SSR — используй \`afterNextRender\`.

## 🎯 Запомни

- \`afterNextRender\` — один раз после следующего рендера, только в браузере: для измерений DOM, сторонних библиотек, фокуса.
- \`afterRender\` — после каждого рендера; мощно, но осторожно с производительностью.
- Оба безопасны для SSR (на сервере не выполняются) и создаются в injection-контексте.
- Фазы (\`read\`/\`write\`/…) помогают избежать layout thrashing.`,
      en: `## 🧩 In plain words

Sometimes a component needs to touch the "real" DOM — measure an element's size, set focus, start a third-party chart library. But you must do it exactly when the browser has actually painted everything, not earlier. \`afterRender\` and \`afterNextRender\` are a way to tell Angular: "run this code after the page renders, and only in the browser." That's more reliable than the old \`ngAfterViewInit\`, especially when your app also renders on the server.

### The problem with ngAfterViewInit

\`ngAfterViewInit\` fires after the component's view is initialized, but does **not guarantee** that the whole app DOM is painted and layout is stable. Worse, during SSR (server-side rendering — when the HTML is generated on the server) this hook runs **on the server too**, where there is no real DOM, and measurements like "how wide is this element" are impossible.

### afterNextRender

This is a callback that runs **once** after the **next** render, and **only in the browser** — it never runs on the server. Ideal for:
- DOM measurements (\`getBoundingClientRect\` — get an element's position and size).
- Initializing third-party DOM libraries (charts, maps).
- Setting focus or scroll after render.

\`\`\`ts
constructor() {
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });
}
\`\`\`

Here the chart is created exactly when the \`<canvas>\` is already in the real DOM.

### afterRender

A callback that runs after **every** render (when CD, change detection, is done and the DOM is updated). It's for continuous DOM sync. Use it carefully: it fires often and can hurt performance.

### Phases

Both accept a \`phase\` to order DOM work and avoid **layout thrashing** (jittery layout, where reading and writing styles alternate and force the browser to recompute layout over and over). The phase order:
- \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.

The idea is simple: do everything that reads layout first, then everything that writes — so the browser recomputes layout once, not ten times.

\`\`\`ts
afterRender({
  read: () => { this.height = el.offsetHeight; },
  write: () => { el.style.transform = '...'; },
});
\`\`\`

### Key differences from ngAfterViewInit

- **Browser only:** safe for SSR — they simply don't run on the server.
- Created in an **injection context** (usually in the constructor), not as class methods.
- \`afterNextRender\` is one-shot; \`afterRender\` runs on every render.
- They account for phases to optimize reflow (layout recomputation).

This is part of Angular's new rendering approach, especially important for zoneless (no Zone.js) and SSR/hydration (bringing server HTML to life on the client).

## ⚠️ Common pitfalls

- Don't call \`afterRender\`/\`afterNextRender\` from ordinary methods — only in an injection context, or you'll get an error.
- \`afterRender\` when you don't need it is expensive: it runs on every render, easy to introduce jank.
- Don't rely on DOM measurements in \`ngAfterViewInit\` under SSR — use \`afterNextRender\`.

## 🎯 Key takeaways

- \`afterNextRender\` — once after the next render, browser only: for DOM measurements, third-party libraries, focus.
- \`afterRender\` — after every render; powerful, but mind performance.
- Both are safe for SSR (don't run on the server) and are created in an injection context.
- Phases (\`read\`/\`write\`/…) help avoid layout thrashing.`,
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
      ru: `## 🧩 Простыми словами

**Ivy** — это «мотор» Angular, который превращает твои HTML-шаблоны в реальный код и рисует их на экране. Раньше движки фреймворков строили в памяти целую копию страницы (виртуальный DOM) и сравнивали её с настоящей. Ivy пошёл другим путём: он заранее превращает каждый шаблон в набор пошаговых **инструкций** — «создай абзац», «вставь сюда текст», «если значение поменялось — обнови». Это делает приложения меньше по размеру и быстрее в сборке.

### Ivy — движок рендеринга

Ivy — это движок компиляции и рендеринга Angular (по умолчанию с версии 9). Компилятор превращает шаблоны в **инструкции** (\`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\` и другие) и записывает их прямо в код компонента. То есть шаблон — это уже не «данные, которые кто-то интерпретирует», а обычный сгенерированный код.

### Incremental DOM

Virtual DOM (как в React) строит в памяти дерево-копию UI и **диффит** его — сравнивает старую и новую версию, чтобы найти разницу. Ivy использует другой подход — **incremental DOM**: каждый компонент компилируется в два набора инструкций, \`create\` и \`update\`.
- При первом рендере выполняются \`create\`-инструкции — они создают DOM.
- При каждом обнаружении изменений (CD, change detection) выполняются \`update\`-инструкции — они сравнивают значения и точечно правят DOM там, где надо.

Главный плюс: **нет промежуточного дерева VDOM** в памяти → меньше расход памяти, а сами инструкции поддаются tree-shaking (см. ниже).

### Локальность (Locality)

Компилятор Ivy собирает каждый компонент **независимо**, опираясь только на его собственные декораторы, — ему не нужен глобальный анализ всего приложения. Из этого следует:
- Быстрая **инкрементальная** пересборка: поменял один компонент — пересобирается только он.
- Библиотеки можно публиковать в **частично скомпилированном** виде.
- Лучше совместимость с инструментами сборки.

### Tree-shaking (удаление лишнего кода)

**Tree-shaking** — это когда сборщик выбрасывает из финального бандла код, который нигде не используется. Поскольку возможности Angular вызываются как **импортируемые инструкции**, а не через один монолитный рантайм, сборщик легко удаляет ненужное. Не используешь \`ngIf\` — его инструкции просто не попадут в бандл. Для небольших приложений это даёт заметно меньший размер.

### AOT

Ivy сделал **AOT-компиляцию** (Ahead-of-Time — «заранее», ещё на этапе сборки) дефолтной даже для разработки. Шаблоны компилируются заранее:
- ошибки в шаблонах ловятся ещё при сборке, а не в рантайме;
- в бандл не попадает компилятор → быстрее старт и меньше размер;
- появляется типобезопасность шаблонов (TypeScript проверяет типы прямо в HTML-шаблоне).

\`\`\`ts
// Ivy генерирует incremental-DOM инструкции для каждого компонента
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}
\`\`\`

Здесь \`rf & 1\` — флаг «фаза создания», \`rf & 2\` — «фаза обновления»: один и тот же код умеет и построить DOM, и потом его обновлять.

## ⚠️ Подводные камни

- Инструкции вида \`ɵɵ...\` — внутренние, их не пишут руками; их генерирует компилятор.
- Меньший бандл от tree-shaking особенно заметен на маленьких приложениях; на больших выигрыш относительный.

## 🎯 Запомни

- Ivy — движок компиляции и рендеринга Angular (с v9 по умолчанию), превращающий шаблоны в инструкции.
- Incremental DOM = инструкции \`create\`/\`update\` без промежуточного VDOM → меньше памяти и tree-shakable код.
- Локальность = независимая компиляция компонентов → быстрая пересборка и частично скомпилированные библиотеки.
- AOT по умолчанию → ошибки на этапе сборки, меньший бандл, типобезопасность шаблонов.`,
      en: `## 🧩 In plain words

**Ivy** is Angular's "engine" that turns your HTML templates into real code and paints them on screen. Older framework engines built a whole in-memory copy of the page (a virtual DOM) and compared it against the real one. Ivy took a different route: it compiles each template ahead of time into a list of step-by-step **instructions** — "create a paragraph", "put text here", "if this value changed, update it". This makes apps smaller and faster to build.

### Ivy — the rendering engine

Ivy is Angular's compilation and rendering engine (the default since version 9). The compiler turns templates into **instructions** (\`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\`, and others) emitted directly into the component's code. So a template is no longer "data someone interprets" — it's plain generated code.

### Incremental DOM

Virtual DOM (as in React) builds an in-memory tree copy of the UI and **diffs** it — compares the old and new versions to find what changed. Ivy uses a different approach — **incremental DOM**: each component compiles into two sets of instructions, \`create\` and \`update\`.
- On first render, the \`create\` instructions run — they build the DOM.
- On each change detection (CD) cycle, the \`update\` instructions run — they compare values and patch the DOM surgically only where needed.

The key benefit: **no intermediate VDOM tree** in memory → lower memory use, and the instructions themselves are tree-shakable (see below).

### Locality

The Ivy compiler compiles each component **independently**, relying only on its own decorators — it needs no global analysis of the whole app. This means:
- Fast **incremental** recompilation: change one component, and only it rebuilds.
- Libraries can ship **partially compiled**.
- Better compatibility with build tooling.

### Tree-shaking (removing unused code)

**Tree-shaking** is when the bundler drops code that's used nowhere from the final bundle. Because Angular's features are invoked as **imported instructions** rather than through one monolithic runtime, the bundler easily removes the unused ones. Don't use \`ngIf\`? Its instructions simply never enter the bundle. For small apps this yields a noticeably smaller size.

### AOT

Ivy made **AOT compilation** (Ahead-of-Time — "in advance", at build time) the default even for development. Templates are compiled ahead of time:
- template errors are caught at build time, not at runtime;
- no compiler ships in the bundle → faster startup and smaller size;
- you get template type safety (TypeScript checks types right inside the HTML template).

\`\`\`ts
// Ivy emits incremental-DOM instructions per component
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}
\`\`\`

Here \`rf & 1\` is the "create phase" flag and \`rf & 2\` is the "update phase": the same function can both build the DOM and later update it.

## ⚠️ Common pitfalls

- The \`ɵɵ...\` instructions are internal — you never write them by hand; the compiler generates them.
- The tree-shaking size win is most visible on small apps; on large ones the gain is relative.

## 🎯 Key takeaways

- Ivy is Angular's compilation and rendering engine (default since v9), turning templates into instructions.
- Incremental DOM = \`create\`/\`update\` instructions with no intermediate VDOM → lower memory and tree-shakable code.
- Locality = independent per-component compilation → fast rebuilds and partially compiled libraries.
- AOT by default → build-time errors, smaller bundles, template type safety.`,
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
      ru: `## 🧩 Простыми словами

Раньше, чтобы Angular знал про твой компонент, его нужно было "прописать" в специальной коробке — \`NgModule\`. Это как если бы каждый новый сотрудник, прежде чем начать работать, должен был вписать себя в толстый журнал регистрации. Standalone-компонент отменяет этот журнал: он сам говорит, что ему нужно для работы, прямо у себя внутри. Меньше бумажной волокиты — быстрее старт.

### Что такое NgModule и зачем он был

\`NgModule\` — это специальный класс-контейнер, в котором ты перечислял все компоненты (\`declarations\`), их зависимости (\`imports\`) и то, что отдаёшь наружу (\`exports\`). Проблема: компонент сам по себе "не знал", что ему нужно — эта информация жила в отдельном файле-модуле. Приходилось держать в голове связку "компонент ↔ модуль".

### Что такое standalone-компонент

Standalone-компонент (дословно "самостоятельный") объявляет свои зависимости **сам**, через свойство \`imports\` прямо в декораторе \`@Component\`. Никакой регистрации в \`NgModule\` не нужно. Начиная с Angular 19, флаг \`standalone: true\` стал значением по умолчанию — то есть отдельно писать его больше не надо.

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`...\`,
})
export class CardComponent {}
\`\`\`

Здесь компонент прямо у себя говорит: "мне нужны \`CommonModule\` и \`RouterLink\`". Всё видно в одном месте.

### Какие преимущества это даёт

- **Меньше шаблонного кода (boilerplate)**: нет \`declarations\`, \`exports\`, нет отдельных модулей-обёрток.
- **Явные зависимости**: видно прямо в компоненте, что он использует — легче понять код и лучше работает tree-shaking (автоудаление неиспользуемого кода из сборки).
- **Проще ленивая загрузка**: функция \`loadComponent\` грузит один компонент без модуля-обёртки.
- **Проще тестирование**: импортируешь компонент напрямую в \`TestBed\` (тестовый стенд Angular).
- **Лучше опыт разработчика (DX)**: меньше вопросов "а где же этот компонент объявлен".

### Запуск приложения без модулей

Раньше приложение стартовало через корневой \`AppModule\`. Теперь есть функция \`bootstrapApplication\`, которая запускает приложение прямо с корневого компонента:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

### Provider-функции вместо forRoot()

Раньше библиотеки подключались через \`SomeModule.forRoot()\`. Теперь вместо них — функции \`provide*\`: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\` и так далее. Они tree-shakable (лишнее выкидывается из сборки) и компонуемы (легко собираются вместе в список providers).

### Совместимость и миграция

Standalone и NgModule **спокойно сосуществуют**: standalone-компонент можно импортировать в \`NgModule\` (через \`imports\`), а NgModule — в standalone-компонент. Это позволяет мигрировать проект постепенно, не переписывая всё сразу. Для автоматического перехода есть schematic (генератор кода) \`ng generate @angular/core:standalone\`.

## ⚠️ Подводные камни

- Не путай: у standalone-компонента \`imports\` живёт в самом \`@Component\`, а не в отдельном модуле.
- В старых проектах (до Angular 19) флаг \`standalone: true\` нужно указывать явно — по умолчанию его не было.
- NgModule не исчез и не "сломан", но для нового кода считается legacy — новые проекты стоит писать на standalone.

## 🎯 Запомни

- Standalone-компонент сам объявляет свои зависимости через \`imports\` — модуль-обёртка не нужен.
- С Angular 19 \`standalone: true\` — значение по умолчанию.
- Запуск — через \`bootstrapApplication\`, библиотеки — через функции \`provide*\`.
- Standalone — стратегическое направление Angular; NgModule — legacy для нового кода.`,
      en: `## 🧩 In plain words

To make Angular aware of a component, you used to "register" it in a special box called an \`NgModule\`. It was like every new employee having to sign a thick registration ledger before they could start working. A standalone component removes that ledger: it declares what it needs to work right inside itself. Less paperwork, faster start.

### What NgModule was and why

An \`NgModule\` is a special container class where you listed all components (\`declarations\`), their dependencies (\`imports\`), and what you exposed to others (\`exports\`). The problem: a component by itself "didn't know" what it needed — that information lived in a separate module file. You had to keep the "component ↔ module" pairing in your head.

### What a standalone component is

A standalone component declares its dependencies **itself**, via the \`imports\` property right in the \`@Component\` decorator. No \`NgModule\` registration needed. As of Angular 19, the \`standalone: true\` flag became the default — so you no longer write it out separately.

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [CommonModule, RouterLink],
  template: \`...\`,
})
export class CardComponent {}
\`\`\`

Here the component says right on itself: "I need \`CommonModule\` and \`RouterLink\`." Everything is in one place.

### What advantages this gives

- **Less boilerplate**: no \`declarations\`, \`exports\`, or wrapper modules.
- **Explicit dependencies**: visible right in the component — easier to read and better for tree-shaking (auto-removal of unused code from the build).
- **Simpler lazy loading**: the \`loadComponent\` function loads a single component without a wrapper module.
- **Easier testing**: import the component directly into \`TestBed\` (Angular's testing harness).
- **Better developer experience (DX)**: less "where is this component even declared".

### Bootstrapping the app without modules

The app used to start via a root \`AppModule\`. Now there's a \`bootstrapApplication\` function that starts the app straight from the root component:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

### Provider functions instead of forRoot()

Libraries used to be wired in via \`SomeModule.forRoot()\`. Now instead we have \`provide*\` functions: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\`, and so on. They are tree-shakable (unused parts get dropped from the build) and composable (easy to combine in a providers list).

### Compatibility and migration

Standalone and NgModule **coexist happily**: a standalone component can be imported into an \`NgModule\` (via \`imports\`), and an NgModule into a standalone component. This lets you migrate a project gradually instead of rewriting everything at once. For an automatic switch there's the schematic (code generator) \`ng generate @angular/core:standalone\`.

## ⚠️ Common pitfalls

- Don't mix things up: a standalone component's \`imports\` lives in the \`@Component\` itself, not in a separate module.
- In older projects (before Angular 19) you must write \`standalone: true\` explicitly — it wasn't the default.
- NgModule hasn't vanished and isn't "broken", but for new code it's considered legacy — new projects should be written standalone.

## 🎯 Key takeaways

- A standalone component declares its own dependencies via \`imports\` — no wrapper module needed.
- As of Angular 19, \`standalone: true\` is the default.
- Bootstrap via \`bootstrapApplication\`, wire libraries via \`provide*\` functions.
- Standalone is Angular's strategic direction; NgModule is legacy for new code.`,
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
      ru: `## 🧩 Простыми словами

В шаблонах Angular нужно уметь говорить "покажи это, если...", "повтори это для каждого элемента списка" и "выбери один из вариантов". Раньше для этого использовались структурные директивы со звёздочкой: \`*ngIf\`, \`*ngFor\`, \`*ngSwitch\`. С Angular 17 появился новый, встроенный прямо в язык шаблонов синтаксис с собачкой: \`@if\`, \`@for\`, \`@switch\`. Он читается почти как обычный код на JavaScript и работает быстрее.

### Как выглядит новый синтаксис

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

Обрати внимание на фигурные скобки и блоки \`@else\`, \`@empty\`, \`@case\` — структура читается сразу, как обычный \`if/for/switch\` в коде.

### Чем это лучше старых директив

- **Производительность**: новый control flow встроен прямо в компилятор Angular, ему не нужно подгружать директивы. А \`@for\` использует более быстрый алгоритм согласования DOM (сравнения старого и нового списка). Бенчмарки показывают до 90% улучшения в некоторых сценариях.
- **\`track\` обязателен**: в \`@for\` ты обязан указать \`track\`. Это устраняет частую ошибку — забытый \`trackBy\` в старом \`*ngFor\`, из-за которого Angular без нужды пересоздавал DOM-элементы.
- **Блок \`@empty\`**: встроенная обработка пустого списка, без отдельного \`*ngIf\` рядом.
- **Меньше размер сборки (bundle)**: не нужно импортировать \`CommonModule\` / \`NgIf\` / \`NgForOf\`.
- **Читаемость**: \`@else if\` вместо неудобных вложенных \`<ng-template>\`.

### Что такое track и зачем он нужен

\`track\` говорит Angular, как отличать элементы списка друг от друга — по какому признаку понять, что это "тот же самый" элемент. Когда массив меняется, Angular по \`track\`-ключу решает, какие DOM-узлы переиспользовать, какие переместить, а какие удалить — вместо того чтобы пересоздавать весь список с нуля. Это и быстрее, и сохраняет состояние элементов (например, фокус в поле ввода).

- \`track item.id\` — для объектов (у каждого свой уникальный id).
- \`track $index\` — для примитивов (строк, чисел), где стабильного id нет.

### Миграция

Старые \`*ngIf\` / \`*ngFor\` продолжают работать — ничего не сломается. Но новый синтаксис рекомендованный. Для автоматического перевода есть schematic (генератор кода) \`ng generate @angular/core:control-flow\`, который сам перепишет старые директивы на новые.

## ⚠️ Подводные камни

- Забыть подходящий \`track\` (например, взять \`$index\` там, где нужен \`id\`) — Angular может неправильно переиспользовать элементы при перестановке списка.
- Новый синтаксис работает только в самом шаблоне; это не замена директивам как способу инкапсулировать логику вообще.
- \`@if (user(); as u)\` — переменная \`u\` доступна только внутри блока \`@if\`, не снаружи.

## 🎯 Запомни

- \`@if\` / \`@for\` / \`@switch\` встроены в компилятор — быстрее и не требуют импорта \`CommonModule\`.
- В \`@for\` \`track\` обязателен — он решает, какие DOM-узлы переиспользовать.
- Есть удобные блоки \`@else\`, \`@empty\`, \`@case\` / \`@default\`.
- Старые директивы работают, но новый синтаксис — рекомендованный; миграция автоматическая.`,
      en: `## 🧩 In plain words

In Angular templates you need to say things like "show this if...", "repeat this for each list item", and "pick one of several options". This used to be done with structural directives marked by a star: \`*ngIf\`, \`*ngFor\`, \`*ngSwitch\`. Angular 17 introduced a new syntax built right into the template language, marked with an at-sign: \`@if\`, \`@for\`, \`@switch\`. It reads almost like plain JavaScript and runs faster.

### What the new syntax looks like

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

Notice the curly braces and the \`@else\`, \`@empty\`, \`@case\` blocks — the structure reads instantly, just like a regular \`if/for/switch\` in code.

### Why it's better than the old directives

- **Performance**: the new control flow is built straight into the Angular compiler, so it needs no directive loading. And \`@for\` uses a faster DOM reconciliation algorithm (comparing the old and new list). Benchmarks show up to 90% improvement in some scenarios.
- **\`track\` is mandatory**: \`@for\` requires \`track\`. This eliminates a common mistake — the forgotten \`trackBy\` in the old \`*ngFor\`, which made Angular needlessly recreate DOM elements.
- **\`@empty\` block**: built-in empty-list handling, without a separate \`*ngIf\` alongside.
- **Smaller bundle**: no need to import \`CommonModule\` / \`NgIf\` / \`NgForOf\`.
- **Readability**: \`@else if\` instead of awkward nested \`<ng-template>\`.

### What track is and why you need it

\`track\` tells Angular how to tell list items apart — by what property to decide "this is the same item". When the array changes, Angular uses the \`track\` key to decide which DOM nodes to reuse, which to move, and which to remove — instead of recreating the whole list from scratch. That's both faster and preserves element state (for example, focus in an input field).

- \`track item.id\` — for objects (each has its own unique id).
- \`track $index\` — for primitives (strings, numbers) that have no stable id.

### Migration

The old \`*ngIf\` / \`*ngFor\` still work — nothing breaks. But the new syntax is recommended. For an automatic switch there's the schematic (code generator) \`ng generate @angular/core:control-flow\`, which rewrites old directives into the new form for you.

## ⚠️ Common pitfalls

- Forgetting a proper \`track\` (e.g. using \`$index\` where an \`id\` is needed) can make Angular reuse elements incorrectly when the list is reordered.
- The new syntax works only inside the template itself; it's not a replacement for directives as a way to encapsulate logic in general.
- In \`@if (user(); as u)\`, the variable \`u\` is available only inside the \`@if\` block, not outside it.

## 🎯 Key takeaways

- \`@if\` / \`@for\` / \`@switch\` are built into the compiler — faster and need no \`CommonModule\` import.
- In \`@for\`, \`track\` is mandatory — it decides which DOM nodes get reused.
- Handy \`@else\`, \`@empty\`, \`@case\` / \`@default\` blocks are built in.
- Old directives still work, but the new syntax is recommended; migration is automatic.`,
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
      ru: `## 🧩 Простыми словами

Представь тяжёлую картинку-график в самом низу страницы. Зачем грузить её сразу, если пользователь до неё, может, и не долистает? \`@defer\` — это способ сказать Angular прямо в шаблоне: "загрузи этот кусок позже, только когда он реально понадобится". Пока он не нужен — показываем лёгкую заглушку. Это экономит трафик и ускоряет первую загрузку страницы.

### Что такое @defer

\`@defer\` (Angular 17+) позволяет **лениво** (то есть с отложенной загрузкой) подгружать часть шаблона и все её зависимости — компоненты, директивы, пайпы — отдельным файлом-чанком (кусочком JS-кода). Этот чанк грузится с сервера только тогда, когда сработает триггер (условие запуска). По сути это декларативный code-splitting (разбиение кода на части) **на уровне шаблона** — без ручной настройки.

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

### Блоки @defer

У \`@defer\` есть несколько блоков для разных состояний:

- **\`@placeholder\`** — что показывать до срабатывания триггера. Рендерится сразу (eager, "жадно"), пока основной контент ещё не загружен.
- **\`@loading\`** — что показывать, пока чанк грузится. Параметр \`after\` откладывает показ спиннера (чтобы не мигал при быстрой загрузке), а \`minimum\` держит его минимальное время (чтобы не мелькнул на долю секунды).
- **\`@error\`** — что показать, если загрузка чанка провалилась.

### Триггеры — когда начинать загрузку

Триггер — это условие, по которому Angular решает начать загрузку и показ блока:

- \`on idle\` (по умолчанию) — когда браузер простаивает (\`requestIdleCallback\`).
- \`on viewport\` — когда элемент попал в область видимости экрана (через \`IntersectionObserver\`).
- \`on interaction\` — по клику или фокусу на заглушке.
- \`on hover\` — при наведении мышью.
- \`on timer(2s)\` — через заданное время.
- \`on immediate\` — сразу после первого рендера.
- \`when condition\` — по логическому выражению-сигналу (когда оно станет \`true\`).

Можно привязать триггер к конкретному элементу: \`on viewport(triggerRef)\`.

### Prefetch — предзагрузка заранее

Загрузку чанка можно начать **раньше**, чем он показывается. Например, \`@defer (on interaction; prefetch on idle)\` — качаем код заранее, пока браузер простаивает, а показываем блок только по клику. Так к моменту клика код уже готов, и пользователь не ждёт.

### Что происходит под капотом

Компилятор Angular создаёт для зависимостей блока динамический \`import()\` и выделяет их в отдельный JS-бандл. Это механизм, **встроенный** прямо в Angular — не нужен роутер и не нужен ручной \`loadComponent\`.

### Как это работает с SSR

\`@defer\` корректно дружит с SSR (server-side rendering, рендеринг на сервере) и hydration (оживление серверной разметки на клиенте): на сервере рендерится содержимое \`@placeholder\`, а дальше гидратация и загрузка управляются триггерами уже на стороне клиента.

## ⚠️ Подводные камни

- Всё, что внутри \`@defer\`, попадает в отдельный чанк — если те же зависимости нужны eager-контенту, выигрыша от разбиения не будет.
- Без \`@placeholder\` до срабатывания триггера \`on viewport\` элементу нечего показать — заглушка нужна, чтобы триггеру было за что "зацепиться" в разметке.
- \`minimum\` и \`after\` в \`@loading\` легко перепутать: \`after\` — задержка перед показом, \`minimum\` — минимальная длительность показа.

## 🎯 Запомни

- \`@defer\` лениво грузит кусок шаблона и его зависимости отдельным чанком по триггеру.
- Блоки: \`@placeholder\` (до), \`@loading\` (во время), \`@error\` (при ошибке).
- Триггеры: \`idle\`, \`viewport\`, \`interaction\`, \`hover\`, \`timer\`, \`immediate\`, \`when\`; плюс \`prefetch\` для предзагрузки.
- Это встроенный в Angular code-splitting на уровне шаблона, работает с SSR/hydration.`,
      en: `## 🧩 In plain words

Picture a heavy chart image at the very bottom of a page. Why load it right away if the user might never scroll down to it? \`@defer\` is a way to tell Angular right in the template: "load this piece later, only when it's actually needed." Until then, show a lightweight placeholder. This saves bandwidth and speeds up the initial page load.

### What @defer is

\`@defer\` (Angular 17+) **lazily** (i.e. with deferred loading) pulls in a part of the template and all its dependencies — components, directives, pipes — as a separate chunk file (a piece of JS code). That chunk loads from the server only when a trigger (a start condition) fires. Essentially it's declarative code-splitting (breaking code into parts) **at the template level** — with no manual setup.

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

### The @defer blocks

\`@defer\` has several blocks for different states:

- **\`@placeholder\`** — what to show before the trigger fires. Rendered eagerly (right away), while the main content hasn't loaded yet.
- **\`@loading\`** — what to show while the chunk loads. The \`after\` option delays showing the spinner (so it doesn't flash on a fast load), and \`minimum\` keeps it visible for a minimum time (so it doesn't blink for a split second).
- **\`@error\`** — what to show if the chunk fails to load.

### Triggers — when to start loading

A trigger is the condition by which Angular decides to start loading and showing the block:

- \`on idle\` (default) — when the browser is idle (\`requestIdleCallback\`).
- \`on viewport\` — when the element enters the visible area of the screen (via \`IntersectionObserver\`).
- \`on interaction\` — on click or focus on the placeholder.
- \`on hover\` — on mouse hover.
- \`on timer(2s)\` — after a set delay.
- \`on immediate\` — right after the first render.
- \`when condition\` — by a boolean signal expression (when it becomes \`true\`).

You can bind a trigger to a specific element: \`on viewport(triggerRef)\`.

### Prefetch — loading ahead of time

Chunk loading can start **before** the block is shown. For example, \`@defer (on interaction; prefetch on idle)\` — download the code ahead of time while the browser is idle, but only show the block on click. That way the code is already ready by the time of the click, and the user doesn't wait.

### What happens under the hood

The Angular compiler creates a dynamic \`import()\` for the block's dependencies and splits them into a separate JS bundle. This mechanism is **built into** Angular — no router and no manual \`loadComponent\` needed.

### How it works with SSR

\`@defer\` plays nicely with SSR (server-side rendering) and hydration (bringing server-rendered markup to life on the client): the server renders the \`@placeholder\` content, and from there hydration and loading are driven by triggers on the client side.

## ⚠️ Common pitfalls

- Everything inside \`@defer\` goes into a separate chunk — if the same dependencies are also needed by eager content, the split gains you nothing.
- Without a \`@placeholder\`, an \`on viewport\` trigger has nothing to show before it fires — the placeholder gives the trigger something to "latch onto" in the markup.
- \`minimum\` and \`after\` in \`@loading\` are easy to mix up: \`after\` is the delay before showing, \`minimum\` is the minimum time it stays shown.

## 🎯 Key takeaways

- \`@defer\` lazily loads a template chunk and its dependencies via a trigger.
- Blocks: \`@placeholder\` (before), \`@loading\` (during), \`@error\` (on failure).
- Triggers: \`idle\`, \`viewport\`, \`interaction\`, \`hover\`, \`timer\`, \`immediate\`, \`when\`; plus \`prefetch\` for preloading.
- It's Angular's built-in code-splitting at the template level, working with SSR/hydration.`,
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
      ru: `## 🧩 Простыми словами

Guard (страж) — это охранник у двери маршрута: он решает, пустить ли пользователя на страницу. Resolver (резолвер) — это официант, который заранее приносит нужные данные к столу, прежде чем страница откроется. Раньше и то и другое приходилось писать как громоздкие классы. В современном Angular это просто **функции** — коротко и по делу.

### Что такое функциональные guards

Начиная с Angular 14, guards и resolvers — это обычные **функции**, а не классы, реализующие специальные интерфейсы. Такая функция выполняется в **injection-контексте** (контексте внедрения зависимостей Angular), поэтому прямо внутри неё можно вызвать \`inject()\`, чтобы получить нужные сервисы.

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};
\`\`\`

Здесь guard берёт сервис авторизации через \`inject()\`, и если пользователь не залогинен — возвращает \`UrlTree\` с редиректом на \`/login\`.

Подключается guard прямо в конфиге маршрутов:

\`\`\`ts
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

### Чем функции лучше классов

- **Меньше шаблонного кода (boilerplate)**: не нужны \`@Injectable\`, \`providedIn\`, реализация интерфейса.
- **Композиция**: guards можно комбинировать и переиспользовать как обычные функции.
- **Tree-shakable** (лишнее выкидывается из сборки) и проще тестировать.
- Старые guards на классах считаются устаревшими (deprecated); для совместимости есть хелпер \`mapToCanActivate\`.

### Типы guards

У каждого guard своя роль, и под неё — свой тип функции:

- \`CanActivateFn\` — можно ли открыть маршрут.
- \`CanActivateChildFn\` — можно ли открыть дочерние маршруты.
- \`CanDeactivateFn<T>\` — можно ли уйти с маршрута (например, спросить "у вас несохранённые изменения, точно уходим?").
- \`CanMatchFn\` — может ли маршрут вообще совпасть с этим URL. Важно для ленивой загрузки и для нескольких альтернативных маршрутов на один путь.

### Resolvers — данные до открытия страницы

\`ResolveFn<T>\` предзагружает данные **до** того, как маршрут активируется — чтобы страница открылась сразу с готовыми данными, без мигания пустого экрана:

\`\`\`ts
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.params['id']);
};
\`\`\`

Загруженные данные потом доступны в компоненте через \`route.data['user']\` или \`ActivatedRoute\`. Resolver может вернуть готовое значение, \`Observable\` или \`Promise\` — роутер дождётся завершения, прежде чем показать страницу.

### Что можно возвращать из guard

Guard может вернуть:

- \`boolean\` — \`true\` (пустить) или \`false\` (не пустить).
- \`UrlTree\` — объект-редирект на другой маршрут.
- \`Observable\` или \`Promise\` этих типов — для асинхронной проверки.

Возвращать \`UrlTree\` предпочтительнее, чем императивно вызывать \`router.navigate\` внутри guard: так роутер сам корректно обработает переход.

## ⚠️ Подводные камни

- Вызывать \`inject()\` можно только внутри injection-контекста — то есть в теле самой guard-функции, а не в произвольном месте.
- Забыть \`CanMatchFn\` там, где важно различать альтернативные маршруты — можно случайно активировать не тот.
- Не делай редирект через \`router.navigate\` внутри guard, если можно вернуть \`UrlTree\` — второе чище и надёжнее.

## 🎯 Запомни

- В современном Angular guards и resolvers — это функции, а не классы; внутри работает \`inject()\`.
- Типы guards: \`CanActivateFn\`, \`CanActivateChildFn\`, \`CanDeactivateFn\`, \`CanMatchFn\`.
- \`ResolveFn\` подгружает данные до активации маршрута; результат — в \`route.data\`.
- Из guard возвращай \`boolean\` или \`UrlTree\` (для редиректа) — \`UrlTree\` предпочтительнее \`router.navigate\`.`,
      en: `## 🧩 In plain words

A guard is a bouncer at a route's door: it decides whether to let the user onto a page. A resolver is a waiter who brings the needed data to the table before the page opens. Both used to require bulky classes. In modern Angular they're just **functions** — short and to the point.

### What functional guards are

Since Angular 14, guards and resolvers are ordinary **functions**, not classes implementing special interfaces. Such a function runs in an **injection context** (Angular's dependency-injection context), so you can call \`inject()\` right inside it to grab the services you need.

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};
\`\`\`

Here the guard grabs the auth service via \`inject()\`, and if the user isn't logged in it returns a \`UrlTree\` that redirects to \`/login\`.

The guard is wired directly into the route config:

\`\`\`ts
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

### Why functions beat classes

- **Less boilerplate**: no \`@Injectable\`, \`providedIn\`, or interface implementation.
- **Composition**: guards can be combined and reused like ordinary functions.
- **Tree-shakable** (unused parts get dropped from the build) and easier to test.
- Old class-based guards are deprecated; for compatibility there's the \`mapToCanActivate\` helper.

### Guard types

Each guard has its own role, and a matching function type:

- \`CanActivateFn\` — whether a route can be opened.
- \`CanActivateChildFn\` — whether child routes can be opened.
- \`CanDeactivateFn<T>\` — whether you can leave a route (e.g. asking "you have unsaved changes, really leave?").
- \`CanMatchFn\` — whether a route can match this URL at all. Important for lazy loading and for several alternative routes on one path.

### Resolvers — data before the page opens

\`ResolveFn<T>\` pre-fetches data **before** the route activates — so the page opens with data ready, without a flash of an empty screen:

\`\`\`ts
export const userResolver: ResolveFn<User> = (route) => {
  return inject(UserService).getUser(route.params['id']);
};
\`\`\`

The loaded data is then available in the component via \`route.data['user']\` or \`ActivatedRoute\`. A resolver can return a ready value, an \`Observable\`, or a \`Promise\` — the router waits for it to complete before showing the page.

### What a guard can return

A guard can return:

- \`boolean\` — \`true\` (let in) or \`false\` (block).
- \`UrlTree\` — a redirect object to another route.
- an \`Observable\` or \`Promise\` of these — for an asynchronous check.

Returning a \`UrlTree\` is preferred over imperatively calling \`router.navigate\` inside the guard: this way the router handles the transition correctly on its own.

## ⚠️ Common pitfalls

- \`inject()\` can only be called inside an injection context — that is, in the body of the guard function itself, not just anywhere.
- Forgetting \`CanMatchFn\` where you need to distinguish alternative routes can accidentally activate the wrong one.
- Don't redirect via \`router.navigate\` inside a guard if you can return a \`UrlTree\` — the latter is cleaner and more reliable.

## 🎯 Key takeaways

- In modern Angular, guards and resolvers are functions, not classes; \`inject()\` works inside them.
- Guard types: \`CanActivateFn\`, \`CanActivateChildFn\`, \`CanDeactivateFn\`, \`CanMatchFn\`.
- \`ResolveFn\` pre-loads data before the route activates; the result lands in \`route.data\`.
- From a guard return \`boolean\` or a \`UrlTree\` (for redirect) — \`UrlTree\` is preferred over \`router.navigate\`.`,
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
      ru: `## 🧩 Простыми словами

Представь приложение как большой чемодан. Если сложить в него всё сразу, он будет неподъёмным, и пользователь долго ждёт, пока он «откроется». Ленивая загрузка (lazy loading) — это когда ты берёшь с собой только самое нужное, а остальное подвозят по требованию, когда человек реально дошёл до нужной страницы. \`loadComponent\` и \`loadChildren\` — два способа так «подвозить» части приложения, а \`CanMatch\` — вышибала на входе, который решает, стоит ли вообще везти этот груз.

### loadComponent — грузим один компонент

В эпоху standalone-компонентов (компонент, которому не нужен \`NgModule\`-обёртка) можно лениво загрузить **один компонент**. Чанк — это отдельный файл-кусок сборки, который скачивается отдельно от основного.

\`\`\`ts
{
  path: 'profile',
  loadComponent: () =>
    import('./profile/profile.component')
      .then(m => m.ProfileComponent),
}
\`\`\`

Здесь \`import(...)\` — это динамический импорт: браузер скачает файл с компонентом и его зависимостями **только когда** пользователь перейдёт на маршрут \`profile\`. Пока никто туда не зашёл — код не грузится.

### loadChildren — грузим целый набор маршрутов

\`loadChildren\` подгружает лениво не один компонент, а **набор маршрутов** (или старый \`NgModule\`, если проект ещё на модулях).

\`\`\`ts
{
  path: 'admin',
  loadChildren: () =>
    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
\`\`\`

Можно вернуть как массив \`Routes\` (современный standalone-подход), так и \`NgModule\` (legacy). Удобно, когда целый раздел приложения (например, вся админка) должен грузиться отдельным куском.

### CanMatch — вышибала до загрузки

\`CanMatchFn\` — это функция, которая решает, **подходит ли маршрут вообще**. Ключевое отличие от \`CanActivate\` (страж, который пускает или не пускает уже после того, как маршрут выбран): \`CanMatch\` срабатывает **до** скачивания ленивого чанка. Если он вернёт \`false\`, роутер **не грузит** этот кусок и пробует следующий маршрут с таким же путём.

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

По одному и тому же пути \`dashboard\` показывается разный дашборд в зависимости от роли. Админ увидит первый вариант, обычный пользователь — второй. Причём ненужный чанк вообще не скачивается: если ты не админ, код админ-дашборда не попадёт в браузер.

### Preloading — подвозим заранее в фоне

Иногда хочется золотую середину: не грузить всё сразу, но и не заставлять пользователя ждать при переходе. Стратегии предзагрузки решают это — они тихо докачивают ленивые чанки в фоне уже после старта приложения.

\`\`\`ts
provideRouter(routes, withPreloading(PreloadAllModules))
\`\`\`

\`PreloadAllModules\` докачивает все ленивые части в фоне; можно написать и свою стратегию (например, грузить только те разделы, куда пользователь заходит часто).

## ⚠️ Подводные камни

- \`CanActivate\` не спасает от скачивания кода — чанк уже загружен к моменту его проверки. Чтобы вообще не качать запретный код, нужен именно \`CanMatch\`.
- Порядок маршрутов важен: при одинаковом \`path\` роутер берёт **первый подходящий**, поэтому более строгие \`canMatch\`-маршруты ставь выше.
- Не забывай \`.then(m => m.ИмяЭкспорта)\` — динамический импорт возвращает модуль целиком, а не сам компонент.

## 🎯 Запомни

- \`loadComponent\` — ленивая загрузка одного standalone-компонента; \`loadChildren\` — целого набора маршрутов или модуля.
- \`CanMatch\` решает судьбу маршрута **до** загрузки чанка, поэтому экономит трафик и умеет показывать разное по одному пути.
- Предзагрузка (\`withPreloading\`) докачивает ленивые куски в фоне, сглаживая переходы.`,
      en: `## 🧩 In plain words

Think of your app as a big suitcase. Pack everything into it at once and it becomes too heavy — the user waits forever for it to "open." Lazy loading means you carry only the essentials, and the rest gets delivered on demand, once the person actually reaches the page that needs it. \`loadComponent\` and \`loadChildren\` are two ways to deliver parts of the app on demand, and \`CanMatch\` is the bouncer at the door who decides whether that cargo should even be delivered.

### loadComponent — load a single component

In the standalone era (a component that needs no \`NgModule\` wrapper) you can lazily load a **single component**. A chunk is a separate build file that downloads apart from the main bundle.

\`\`\`ts
{
  path: 'profile',
  loadComponent: () =>
    import('./profile/profile.component')
      .then(m => m.ProfileComponent),
}
\`\`\`

Here \`import(...)\` is a dynamic import: the browser downloads the file with the component and its dependencies **only when** the user navigates to the \`profile\` route. Until someone goes there, the code is never loaded.

### loadChildren — load a whole set of routes

\`loadChildren\` lazily loads not a single component but a **set of routes** (or a legacy \`NgModule\`, if the project still uses modules).

\`\`\`ts
{
  path: 'admin',
  loadChildren: () =>
    import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
\`\`\`

It can return either a \`Routes\` array (the modern standalone approach) or an \`NgModule\` (legacy). Handy when an entire section of the app (say, the whole admin area) should load as its own chunk.

### CanMatch — the bouncer before the download

\`CanMatchFn\` is a function that decides whether a route **matches at all**. The key difference from \`CanActivate\` (a guard that allows or blocks *after* the route is already chosen): \`CanMatch\` runs **before** the lazy chunk downloads. If it returns \`false\`, the router **does not load** that chunk and tries the next route with the same path.

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

The same \`dashboard\` path shows a different dashboard depending on role. An admin sees the first variant, a regular user the second. And the unneeded chunk is never downloaded at all: if you are not an admin, the admin dashboard's code never reaches your browser.

### Preloading — deliver ahead of time in the background

Sometimes you want a middle ground: don't load everything upfront, but don't make the user wait on navigation either. Preloading strategies solve this — they quietly finish downloading lazy chunks in the background after the app has started.

\`\`\`ts
provideRouter(routes, withPreloading(PreloadAllModules))
\`\`\`

\`PreloadAllModules\` fetches all lazy parts in the background; you can also write your own strategy (for example, preload only the sections users visit often).

## ⚠️ Common pitfalls

- \`CanActivate\` does not prevent the code from downloading — the chunk is already loaded by the time it checks. To avoid downloading forbidden code at all, you need \`CanMatch\`.
- Route order matters: with an identical \`path\`, the router takes the **first match**, so put stricter \`canMatch\` routes higher.
- Don't forget \`.then(m => m.ExportName)\` — a dynamic import returns the whole module, not the component itself.

## 🎯 Key takeaways

- \`loadComponent\` lazily loads one standalone component; \`loadChildren\` loads a whole set of routes or a module.
- \`CanMatch\` decides a route's fate **before** the chunk loads, so it saves bandwidth and can show different things for the same path.
- Preloading (\`withPreloading\`) fetches lazy chunks in the background, smoothing out navigation.`,
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
      ru: `## 🧩 Простыми словами

В Angular есть два способа делать формы. Template-driven — это когда ты рисуешь форму прямо в HTML, а Angular сам, за кулисами, собирает для тебя объект формы. Reactive — наоборот: ты сначала описываешь форму в коде на TypeScript, а HTML просто «подключается» к уже готовой модели. Представь чертёж дома: template-driven строит дом и по нему восстанавливает чертёж, а reactive сначала рисует чертёж, а потом по нему строит. Разница в том, **кто главный** — шаблон или код.

### Template-driven — форма живёт в шаблоне

Форма строится **в HTML-шаблоне** через директивы (специальные атрибуты Angular): \`ngModel\`, \`ngForm\`, \`ngModelGroup\`. Angular **асинхронно** (не сразу, а чуть позже) создаёт под капотом объекты \`FormControl\` за тебя. Источник истины — шаблон.

\`\`\`html
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

- **Асинхронность**: контролы создаются после цикла обнаружения изменений (CD, change detection — момент, когда Angular обновляет представление). Поэтому в \`ngOnInit\` к ним ещё нельзя обратиться синхронно — их там просто нет.
- Подходит для **простых** форм: логин, короткая обратная связь.
- Логика валидации живёт в шаблоне, в виде директив (\`required\`, \`minlength\` и т.д.).

### Reactive — форма живёт в коде

Форма создаётся **в классе компонента** через \`FormControl\` (один контрол), \`FormGroup\` (группа контролов), \`FormArray\` (динамический список) или \`FormBuilder\` (помощник, который короче их создаёт). Шаблон лишь привязывается к готовой модели через \`formControlName\`. Источник истины — TypeScript-код.

\`\`\`ts
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

- **Синхронность**: модель существует сразу при создании компонента — к ней можно обратиться в любой момент, поведение предсказуемо.
- **Тестируемость**: можно проверять модель в тестах без участия DOM (без реального HTML).
- **Реактивность**: \`valueChanges\` и \`statusChanges\` — это \`Observable\` (потоки событий), на которые можно подписаться и реагировать на каждое изменение.
- **Типизированные формы** (Angular 14+) дают типобезопасность — компилятор знает, какие поля есть и какого они типа.
- Подходит для **сложных, динамических** форм.

### Что происходит под капотом

Оба подхода используют один и тот же механизм — \`ControlValueAccessor\` — это «переводчик» между DOM и моделью формы. Разница в **направлении создания**:

- Template-driven строит модель **из шаблона** — директивы регистрируют себя вверх по дереву компонентов, постепенно собирая форму.
- Reactive привязывает шаблон **к уже готовой модели**, которую ты описал в коде.

## ⚠️ Подводные камни

- В template-driven нельзя обратиться к \`FormControl\` синхронно в \`ngOnInit\` — контролы ещё не созданы.
- Смешивать оба подхода в **одной** форме не рекомендуется: поведение становится непредсказуемым.
- \`[(ngModel)]\` (двусторонняя привязка) удобен, но в больших формах прячет логику в шаблоне и усложняет тестирование.

## 🎯 Запомни

- Template-driven: форма в шаблоне, контролы создаются асинхронно, хорош для простого.
- Reactive: форма в коде, доступна синхронно, типизирована, тестируема, реактивна — выбор для серьёзных приложений.
- Под капотом оба опираются на \`ControlValueAccessor\`; отличие — направление: шаблон→модель против модель→шаблон.`,
      en: `## 🧩 In plain words

Angular gives you two ways to build forms. Template-driven means you draw the form right in the HTML, and Angular quietly assembles the form object for you behind the scenes. Reactive is the opposite: you first describe the form in TypeScript code, and the HTML simply "plugs into" that ready-made model. Picture a house blueprint: template-driven builds the house and reconstructs the blueprint from it, while reactive draws the blueprint first and then builds from it. The difference is **who is in charge** — the template or the code.

### Template-driven — the form lives in the template

The form is built **in the HTML template** via directives (special Angular attributes): \`ngModel\`, \`ngForm\`, \`ngModelGroup\`. Angular **asynchronously** (not immediately, a bit later) creates the underlying \`FormControl\` objects for you. The source of truth is the template.

\`\`\`html
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

- **Asynchronous**: controls are created after a change detection cycle (CD — the moment Angular refreshes the view). So in \`ngOnInit\` you cannot access them synchronously yet — they simply aren't there.
- Suited for **simple** forms: login, a short feedback box.
- Validation logic lives in the template as directives (\`required\`, \`minlength\`, etc.).

### Reactive — the form lives in code

The form is created **in the component class** via \`FormControl\` (a single control), \`FormGroup\` (a group of controls), \`FormArray\` (a dynamic list), or \`FormBuilder\` (a helper that creates them more concisely). The template merely binds to the ready model through \`formControlName\`. The source of truth is TypeScript code.

\`\`\`ts
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

- **Synchronous**: the model exists the instant the component is created — you can access it at any time, and behavior is predictable.
- **Testability**: you can check the model in tests without the DOM (without real HTML).
- **Reactivity**: \`valueChanges\` and \`statusChanges\` are \`Observable\`s (event streams) you can subscribe to and react to every change.
- **Typed forms** (Angular 14+) give type safety — the compiler knows which fields exist and their types.
- Suited for **complex, dynamic** forms.

### What happens under the hood

Both approaches use the same mechanism — \`ControlValueAccessor\` — the "translator" between the DOM and the form model. The difference is the **direction of creation**:

- Template-driven builds the model **from the template** — directives register themselves up the component tree, gradually assembling the form.
- Reactive binds the template **to an already-built model** that you described in code.

## ⚠️ Common pitfalls

- In template-driven you cannot access a \`FormControl\` synchronously in \`ngOnInit\` — the controls aren't created yet.
- Mixing both approaches in **one** form is discouraged: behavior becomes unpredictable.
- \`[(ngModel)]\` (two-way binding) is convenient but in large forms it hides logic in the template and makes testing harder.

## 🎯 Key takeaways

- Template-driven: form in the template, controls created asynchronously, good for simple cases.
- Reactive: form in code, available synchronously, typed, testable, reactive — the choice for serious apps.
- Under the hood both rely on \`ControlValueAccessor\`; the difference is direction: template→model versus model→template.`,
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
      ru: `## 🧩 Простыми словами

Angular-формы умеют общаться с обычными \`<input>\` из коробки. Но что если тебе нужен свой элемент — например, звёздочный рейтинг или красивый переключатель? Angular про них ничего не знает и не понимает, как читать их значение. \`ControlValueAccessor\` (CVA) — это переводчик-посредник: он объясняет форме, как брать значение из твоего компонента и как класть его обратно. Реализовав этот интерфейс, ты делаешь свой виджет «родным» для формы — он начинает работать с \`formControlName\` и валидаторами так же, как обычный input.

### Роль ControlValueAccessor

\`ControlValueAccessor\` — это **мост** между Angular Forms API (объектом \`FormControl\`) и настоящим элементом ввода (нативным или твоим кастомным). Он переводит значение модели в DOM (что показать на экране) и пользовательский ввод обратно в модель (что записать в форму). Все встроенные директивы (\`DefaultValueAccessor\` для текстовых полей, \`CheckboxControlValueAccessor\` для чекбоксов и т.д.) реализуют именно этот интерфейс — так input и умеет дружить с формой.

### Четыре метода интерфейса

Чтобы стать таким мостом, компонент реализует четыре метода:

- **writeValue(value)** — форма → компонент. Angular зовёт его, когда значение задаётся программно (например, при загрузке данных). Твоя задача — показать это значение.
- **registerOnChange(fn)** — форма даёт тебе колбэк. Ты сохраняешь его и вызываешь **каждый раз, когда пользователь меняет значение** (компонент → форма).
- **registerOnTouched(fn)** — колбэк, который надо вызвать, когда поле «потрогали» и ушли (событие blur). Так форма узнаёт про статус \`touched\`.
- **setDisabledState(isDisabled)** — реакция на \`disable()\`/\`enable()\` контрола: сделать виджет неактивным.

### Реализация — компонент-рейтинг

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
    this.onChange(v);   // уведомляем форму о новом значении
    this.onTouched();   // помечаем поле как "тронутое"
  }
}
\`\`\`

Смысл кода: когда пользователь кликает по звезде, вызывается \`setRating\`. Он сохраняет значение у себя (\`this.value\`), затем через сохранённый колбэк \`onChange(v)\` сообщает форме новое значение, и \`onTouched()\` отмечает, что с полем взаимодействовали. Форма теперь в курсе всего.

### Ключевые нюансы

- \`NG_VALUE_ACCESSOR\` регистрируется как **multi**-провайдер (\`multi: true\`) — потому что аксессоров может быть несколько, и Angular собирает их в список, а не заменяет один другим.
- \`forwardRef\` нужен, потому что в момент выполнения декоратора \`@Component\` сам класс \`RatingComponent\` ещё не определён — \`forwardRef\` откладывает обращение к нему на потом.
- После этого компонент работает с \`formControlName\`, \`ngModel\` и валидаторами **как нативный input** — никакой особой обвязки не требуется.
- Если нужна ещё и валидация внутри самого компонента, дополнительно реализуют интерфейс \`Validator\` и регистрируют его через \`NG_VALIDATORS\` (по тому же принципу multi-провайдера).

Это фундамент любой дизайн-системы: кастомные селекты, date-picker'ы, тумблеры — все они через CVA единообразно встраиваются в формы.

## ⚠️ Подводные камни

- Забыл \`multi: true\` — Angular перезапишет список аксессоров и всё сломается.
- Не вызвал \`onChange\` в обработчике — форма не узнает о новом значении, \`formControl.value\` останется старым.
- Не вызвал \`onTouched\` на blur — статусы \`touched\`/\`untouched\` и связанные стили ошибок работать не будут.
- Пропустил \`forwardRef\` — получишь ошибку «используется до объявления».

## 🎯 Запомни

- CVA — мост между \`FormControl\` и твоим элементом ввода; реализуй его, чтобы виджет стал «родным» для формы.
- Четыре метода: \`writeValue\` (форма→ты), \`registerOnChange\` и \`registerOnTouched\` (сохрани колбэки и зови их), \`setDisabledState\`.
- Регистрируй через \`NG_VALUE_ACCESSOR\` с \`multi: true\` и \`forwardRef\` — это основа кастомных контролов в дизайн-системах.`,
      en: `## 🧩 In plain words

Angular forms know how to talk to plain \`<input>\` elements out of the box. But what if you need your own element — say, a star rating or a fancy toggle? Angular knows nothing about them and can't figure out how to read their value. \`ControlValueAccessor\` (CVA) is the translator in the middle: it teaches the form how to take a value out of your component and how to put one back in. By implementing this interface you make your widget "native" to the form — it starts working with \`formControlName\` and validators just like a regular input.

### The role of ControlValueAccessor

\`ControlValueAccessor\` is the **bridge** between the Angular Forms API (the \`FormControl\` object) and a real input element (native or your custom one). It translates the model value into the DOM (what to show on screen) and user input back into the model (what to store in the form). All built-in directives (\`DefaultValueAccessor\` for text fields, \`CheckboxControlValueAccessor\` for checkboxes, etc.) implement exactly this interface — that's how an input knows how to befriend a form.

### The four interface methods

To become that bridge, a component implements four methods:

- **writeValue(value)** — form → component. Angular calls it when a value is set programmatically (e.g. when data loads). Your job is to display that value.
- **registerOnChange(fn)** — the form hands you a callback. You store it and call it **every time the user changes the value** (component → form).
- **registerOnTouched(fn)** — a callback to call when the field has been "touched" and left (the blur event). This is how the form learns the \`touched\` status.
- **setDisabledState(isDisabled)** — reaction to a control's \`disable()\`/\`enable()\`: make the widget inactive.

### Implementation — a rating component

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
    this.onChange(v);   // notify the form of the new value
    this.onTouched();   // mark the field as "touched"
  }
}
\`\`\`

What the code means: when the user clicks a star, \`setRating\` fires. It stores the value locally (\`this.value\`), then via the saved callback \`onChange(v)\` tells the form the new value, and \`onTouched()\` marks that the field was interacted with. The form now knows everything.

### Key nuances

- \`NG_VALUE_ACCESSOR\` is registered as a **multi** provider (\`multi: true\`) — because there can be several accessors, and Angular collects them into a list rather than replacing one with another.
- \`forwardRef\` is needed because at the moment the \`@Component\` decorator runs, the \`RatingComponent\` class itself isn't defined yet — \`forwardRef\` defers the reference to it until later.
- After this the component works with \`formControlName\`, \`ngModel\`, and validators **like a native input** — no special wiring required.
- If you also need validation inside the component itself, additionally implement the \`Validator\` interface and register it via \`NG_VALIDATORS\` (same multi-provider pattern).

This is the foundation of any design system: custom selects, date-pickers, toggles — they all plug into forms uniformly through CVA.

## ⚠️ Common pitfalls

- Forgot \`multi: true\` — Angular overwrites the accessor list and everything breaks.
- Didn't call \`onChange\` in the handler — the form never learns the new value, and \`formControl.value\` stays stale.
- Didn't call \`onTouched\` on blur — the \`touched\`/\`untouched\` statuses and related error styles won't work.
- Skipped \`forwardRef\` — you get a "used before declaration" error.

## 🎯 Key takeaways

- CVA is the bridge between \`FormControl\` and your input element; implement it to make a widget "native" to the form.
- Four methods: \`writeValue\` (form→you), \`registerOnChange\` and \`registerOnTouched\` (store the callbacks and call them), \`setDisabledState\`.
- Register via \`NG_VALUE_ACCESSOR\` with \`multi: true\` and \`forwardRef\` — the basis of custom controls in design systems.`,
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
      ru: `## 🧩 Простыми словами

Раньше в Angular значение формы было типа \`any\` — компилятор понятия не имел, какие в ней поля и какого они типа, и ошибки вылезали только в рантайме. Типизированные формы это чинят: теперь TypeScript точно знает структуру формы и подсказывает тебе, если ты обратишься к несуществующему полю. А валидаторы — это просто функции-проверяющие: синхронные отвечают «валидно/невалидно» мгновенно, а асинхронные умеют сходить на сервер (например, проверить, не занят ли email) и ответить чуть позже.

### Типизированные формы

С Angular 14 классы \`FormControl\` и \`FormGroup\` стали **дженериками** — то есть параметризуются типом. Раньше \`form.value\` был \`any\`; теперь компилятор знает точные типы полей.

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;        // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }
\`\`\`

Обрати внимание: в \`value\` поля помечены как необязательные (\`?\`) — почему, разберём ниже.

### nonNullable — избавляемся от null

По умолчанию \`reset()\` (сброс формы) возвращает контрол к \`null\`, поэтому тип значения вынужден включать \`null\`. Опция \`{ nonNullable: true }\` (или создание группы через \`fb.nonNullable.group\`) убирает \`null\` из типа и заставляет \`reset()\` возвращать не к \`null\`, а к **начальному значению**, которое ты задал. Меньше \`null\` в типах — меньше лишних проверок в коде.

### value против getRawValue

- \`value\` **исключает disabled-контролы** (отключённые поля). Поэтому в типе они становятся необязательными (\`?\`) — их может не быть в объекте.
- \`getRawValue()\` возвращает **все** контролы, включая отключённые, с полными (не-optional) типами.

Правило простое: нужна вся форма целиком, включая disabled-поля, — бери \`getRawValue()\`.

### Кастомный синхронный валидатор

Валидатор — это функция, которая получает контрол и возвращает либо объект с ошибками, либо \`null\` (значит всё хорошо).

\`\`\`ts
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}
\`\`\`

Здесь \`forbiddenName('admin')\` вернёт готовый валидатор. Если значение равно запрещённому имени — возвращается объект ошибки \`{ forbidden: ... }\`, иначе \`null\`. Ключ ошибки (\`forbidden\`) потом используется в шаблоне, чтобы показать сообщение.

### Async-валидатор — проверка на сервере

Асинхронный валидатор возвращает не результат сразу, а \`Observable\` или \`Promise\`, который позже отдаст \`ValidationErrors | null\`. Он запускается **после** синхронных валидаторов (нет смысла дёргать сервер, если поле и так пустое), и всё это время статус контрола равен \`PENDING\` (ожидание).

\`\`\`ts
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}
\`\`\`

Логика: спрашиваем у сервера, занят ли email. Если занят — ошибка \`{ emailTaken: true }\`, иначе \`null\`. \`catchError\` важен: если запрос упал, мы не блокируем форму навечно, а считаем поле валидным.

### Подключение валидаторов

\`\`\`ts
new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // когда запускать валидацию
});
\`\`\`

Синхронные валидаторы идут в \`validators\`, асинхронные — в \`asyncValidators\`. Опция \`updateOn: 'blur'\` (или \`'submit'\`) говорит запускать валидацию не на каждое нажатие клавиши, а только при потере фокуса (или отправке формы) — это заметно снижает частоту дорогих серверных запросов.

## ⚠️ Подводные камни

- Забыл \`nonNullable\` — тип значения будет включать \`null\`, и придётся всюду его проверять.
- Нет \`catchError\` в async-валидаторе — упавший запрос оставит контрол в вечном \`PENDING\`.
- Async-валидация на каждый keystroke без \`updateOn: 'blur'\` — засыпешь сервер запросами (добавь ещё \`debounceTime\` внутри потока).
- Ключ ошибки в объекте (\`{ forbidden: ... }\`) должен совпадать с тем, что проверяешь в шаблоне через \`errors?.['forbidden']\`.

## 🎯 Запомни

- Типизированные формы (Angular 14+) дают TypeScript точные типы полей вместо \`any\`; \`nonNullable\` убирает \`null\` и меняет поведение \`reset()\`.
- \`value\` пропускает disabled-поля, \`getRawValue()\` возвращает всё.
- Синхронный валидатор возвращает \`ValidationErrors | null\`; async — \`Observable/Promise\` от того же, работает пока статус \`PENDING\`, ставь \`catchError\` и \`updateOn: 'blur'\`.`,
      en: `## 🧩 In plain words

Previously in Angular a form's value was typed \`any\` — the compiler had no idea which fields it had or their types, and mistakes only surfaced at runtime. Typed forms fix this: now TypeScript knows the exact shape of the form and warns you if you reach for a field that doesn't exist. Validators are just checker functions: synchronous ones answer "valid/invalid" instantly, while asynchronous ones can go to the server (e.g. check whether an email is already taken) and answer a bit later.

### Typed forms

Since Angular 14 the \`FormControl\` and \`FormGroup\` classes are **generic** — parameterized by type. Previously \`form.value\` was \`any\`; now the compiler knows the exact field types.

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;        // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }
\`\`\`

Notice: in \`value\` the fields are marked optional (\`?\`) — we'll see why below.

### nonNullable — getting rid of null

By default \`reset()\` (resetting the form) returns a control to \`null\`, so the value type is forced to include \`null\`. The \`{ nonNullable: true }\` option (or building the group via \`fb.nonNullable.group\`) removes \`null\` from the type and makes \`reset()\` return not to \`null\` but to the **initial value** you set. Less \`null\` in your types means fewer redundant checks in your code.

### value versus getRawValue

- \`value\` **excludes disabled controls** (disabled fields). That's why in the type they become optional (\`?\`) — they may be absent from the object.
- \`getRawValue()\` returns **all** controls, including disabled ones, with full (non-optional) types.

Simple rule: if you need the whole form including disabled fields, use \`getRawValue()\`.

### Custom sync validator

A validator is a function that receives a control and returns either an errors object or \`null\` (meaning all good).

\`\`\`ts
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}
\`\`\`

Here \`forbiddenName('admin')\` returns a ready validator. If the value equals the forbidden name, it returns the error object \`{ forbidden: ... }\`, otherwise \`null\`. The error key (\`forbidden\`) is later used in the template to show a message.

### Async validator — a server check

An async validator doesn't return a result immediately but an \`Observable\` or \`Promise\` that later yields \`ValidationErrors | null\`. It runs **after** the sync validators (no point pinging the server if the field is empty anyway), and the whole time the control status is \`PENDING\` (waiting).

\`\`\`ts
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}
\`\`\`

The logic: ask the server whether the email is taken. If taken — error \`{ emailTaken: true }\`, otherwise \`null\`. \`catchError\` matters: if the request fails, we don't block the form forever — we treat the field as valid.

### Wiring the validators

\`\`\`ts
new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // when to run validation
});
\`\`\`

Sync validators go into \`validators\`, async ones into \`asyncValidators\`. The \`updateOn: 'blur'\` option (or \`'submit'\`) tells Angular to run validation not on every keystroke but only when the field loses focus (or the form is submitted) — this noticeably cuts down expensive server requests.

## ⚠️ Common pitfalls

- Forgot \`nonNullable\` — the value type includes \`null\`, and you'll have to check for it everywhere.
- No \`catchError\` in the async validator — a failed request leaves the control stuck in \`PENDING\` forever.
- Async validation on every keystroke without \`updateOn: 'blur'\` — you flood the server (also add \`debounceTime\` inside the stream).
- The error key in the object (\`{ forbidden: ... }\`) must match what you check in the template via \`errors?.['forbidden']\`.

## 🎯 Key takeaways

- Typed forms (Angular 14+) give TypeScript exact field types instead of \`any\`; \`nonNullable\` removes \`null\` and changes \`reset()\` behavior.
- \`value\` skips disabled fields; \`getRawValue()\` returns everything.
- A sync validator returns \`ValidationErrors | null\`; async returns an \`Observable/Promise\` of the same, works while status is \`PENDING\` — add \`catchError\` and \`updateOn: 'blur'\`.`,
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
      ru: `## 🧩 Простыми словами

Представь компонент как рамку для фотографии: сама рамка всегда одинаковая, а внутрь ты вставляешь любое фото. \`<ng-content>\` — это как раз то пустое место в рамке, куда попадёт "фото", то есть контент, который ты напишешь между тегами компонента. Это называется **content projection** (проекция контента): родитель передаёт куски разметки, а компонент показывает их у себя внутри.

### Базовая проекция

\`<ng-content>\` — это "слот", пустое место в шаблоне компонента, куда Angular вставит всё, что ты написал между открывающим и закрывающим тегами этого компонента. Так делают переиспользуемые компоненты-обёртки: сама обёртка задаёт оформление, а начинку передают снаружи.

\`\`\`html
<!-- card.component.html -->
<div class="card"><ng-content></ng-content></div>

<!-- использование -->
<app-card><p>Любой контент</p></app-card>
\`\`\`

Здесь \`<p>Любой контент</p>\` "проецируется" внутрь \`<div class="card">\` на место \`<ng-content>\`. В итоге в DOM получится карточка с параграфом внутри.

### Multi-slot проекция (несколько слотов)

Часто нужно раскидать переданный контент по разным местам: заголовок — наверх, кнопки — вниз. Для этого делают несколько \`<ng-content>\` с атрибутом \`select\`, где \`select\` — это CSS-селектор, определяющий, какой кусок контента попадёт в этот слот.

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

Как это распределяется: \`<h2 card-title>\` совпадает с селектором по атрибуту \`[card-title]\` и уходит в \`<header>\`; \`<app-card-actions>\` совпадает по имени тега и уходит в \`<footer>\`; а \`<p>\`, который ни с чем не совпал, попадает в **дефолтный** \`<ng-content>\` (тот, что без \`select\`). \`select\` принимает любой CSS-селектор: по атрибуту, по тегу, по классу.

### Контекст, в котором живёт спроецированный контент

Важная деталь: спроецированный контент **рендерится в контексте родителя**, а не обёртки. Это значит, что внедрение зависимостей (**DI** — Dependency Injection, механизм получения сервисов) и обнаружение изменений (**CD** — Change Detection, механизм, который решает, когда перерисовать) для этого контента привязаны к тому месту, где он объявлен, а не туда, куда его вставили.

### Доступ к спроецированному контенту из кода

Компонент-обёртка может получить ссылки на спроецированные элементы через декораторы \`@ContentChild\` (один элемент) и \`@ContentChildren\` (несколько). Это полезно, когда обёртке нужно управлять тем, что ей передали.

### ngProjectAs

Иногда имя тега твоего элемента не совпадает с тем, что ждёт \`select\`, но спроецировать его в нужный слот всё равно надо. Тогда добавляют атрибут \`ngProjectAs="selector"\` — он говорит Angular: "считай, что этот элемент подходит вот под этот селектор".

## ⚠️ Подводные камни

- Спроецированный контент **создаётся всегда**, даже если сам \`<ng-content>\` спрятан внутри \`@if\`. Чтобы контент действительно не создавался, оборачивай в \`@if\` сами данные или используй \`ng-template\`.
- Не путай контекст: DI и Change Detection спроецированного контента принадлежат родителю, а не обёртке.

## 🎯 Запомни

- \`<ng-content>\` — слот, куда падает контент, переданный между тегами компонента.
- Несколько \`<ng-content select="...">\` раскидывают контент по слотам через CSS-селекторы; контент без совпадения идёт в дефолтный слот без \`select\`.
- Спроецированный контент живёт в контексте родителя и создаётся всегда, даже если слот спрятан \`@if\`.
- Content projection — основа композиционного дизайна UI-библиотек.`,
      en: `## 🧩 In plain words

Think of a component as a picture frame: the frame is always the same, but you slot any photo inside it. \`<ng-content>\` is exactly that empty space in the frame where the "photo" — the content you write between the component's tags — will go. This is called **content projection**: the parent hands over chunks of markup, and the component displays them inside itself.

### Basic projection

\`<ng-content>\` is a "slot", an empty spot in the component's template where Angular inserts whatever you wrote between the component's opening and closing tags. This is how reusable wrapper components work: the wrapper defines the styling, and the filling is passed in from outside.

\`\`\`html
<!-- card.component.html -->
<div class="card"><ng-content></ng-content></div>

<!-- usage -->
<app-card><p>Any content</p></app-card>
\`\`\`

Here \`<p>Any content</p>\` is "projected" inside \`<div class="card">\` at the \`<ng-content>\` spot. The resulting DOM is a card with the paragraph inside it.

### Multi-slot projection

Often you need to spread the passed-in content across different places: title on top, buttons at the bottom. For this you use several \`<ng-content>\` tags with a \`select\` attribute, where \`select\` is a CSS selector deciding which chunk of content lands in that slot.

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

How it gets distributed: \`<h2 card-title>\` matches the attribute selector \`[card-title]\` and goes into \`<header>\`; \`<app-card-actions>\` matches by tag name and goes into \`<footer>\`; and \`<p>\`, which matches nothing, lands in the **default** \`<ng-content>\` (the one without \`select\`). \`select\` takes any CSS selector: by attribute, by tag, by class.

### The context projected content lives in

An important detail: projected content **renders in the parent's context**, not the wrapper's. That means dependency injection (**DI** — the mechanism for obtaining services) and change detection (**CD** — the mechanism that decides when to re-render) for that content are tied to the place where it is declared, not where it is inserted.

### Accessing projected content from code

The wrapper component can get references to projected elements via the \`@ContentChild\` (one element) and \`@ContentChildren\` (multiple) decorators. This is useful when the wrapper needs to control what was passed to it.

### ngProjectAs

Sometimes your element's tag name doesn't match what \`select\` expects, but you still need to project it into a specific slot. In that case add the \`ngProjectAs="selector"\` attribute — it tells Angular: "treat this element as if it matches this selector."

## ⚠️ Common pitfalls

- Projected content is **always created**, even if the \`<ng-content>\` itself is hidden inside \`@if\`. To genuinely avoid creating the content, wrap the data in \`@if\` or use an \`ng-template\`.
- Don't confuse the context: DI and change detection of projected content belong to the parent, not the wrapper.

## 🎯 Key takeaways

- \`<ng-content>\` is a slot that receives the content passed between the component's tags.
- Several \`<ng-content select="...">\` distribute content into slots via CSS selectors; content with no match goes to the default slot without \`select\`.
- Projected content lives in the parent's context and is always created, even if the slot is hidden by \`@if\`.
- Content projection is the foundation of compositional UI-library design.`,
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
      ru: `## 🧩 Простыми словами

Представь, что компонент — это ты, а вокруг два вида "детей": те, кого ты сам родил (написал в своём шаблоне), и те, кого тебе передали на воспитание извне (спроецировали через \`<ng-content>\`). \`@ViewChild\` находит своих родных детей, а \`@ContentChild\` — приёмных. И у каждого есть свой момент, когда ребёнок "готов" и до него можно дотянуться из кода.

### ViewChild против ContentChild

- **\`@ViewChild\`** запрашивает элемент из **собственного шаблона** компонента (его view — то, что компонент нарисовал сам).
- **\`@ContentChild\`** запрашивает элемент из **спроецированного** контента (того, что пришло через \`<ng-content>\` от родителя).

\`\`\`ts
@ViewChild('localRef') ref!: ElementRef;        // из своего шаблона
@ContentChild(TabComponent) tab!: TabComponent; // из проекции
\`\`\`

Если совпадений может быть несколько, используют \`@ViewChildren\` / \`@ContentChildren\` — они возвращают \`QueryList\` (специальную коллекцию-список результатов).

### Тайминг: когда результат готов

Angular не сразу знает про эти элементы — сначала он должен построить шаблон и спроецировать контент. Поэтому у каждого запроса свой момент готовности в жизненном цикле:

- **\`ViewChild\` доступен в \`ngAfterViewInit\`** — хуке, который вызывается после того, как собственная view компонента полностью построена.
- **\`ContentChild\` доступен в \`ngAfterContentInit\`** — хуке, который вызывается после того, как спроецированный контент вставлен.

Раньше этого хука результат ещё не заполнен.

### static: true против static: false

Опция \`static\` управляет тем, **когда** именно резолвится запрос. **CD** здесь — это change detection, первый прогон обнаружения изменений.

\`\`\`ts
@ViewChild('ref', { static: true }) ref!: ElementRef;
\`\`\`

- \`static: true\` — запрос разрешается **до** первого CD, и результат доступен уже в \`ngOnInit\`. Но работает это **только** если элемент **не** обёрнут структурной директивой (\`@if\`, \`@for\`) — то есть он гарантированно всегда есть в DOM.
- \`static: false\` (значение по умолчанию) — запрос разрешается **после** CD, результат доступен в \`ngAfterViewInit\`. Именно этот вариант нужен для элементов, которые могут появляться и исчезать по условию.

Проще говоря: если элемент есть всегда и он нужен раньше — \`static: true\`; если он условный — \`static: false\`.

### Сигнальные queries (Angular 17.2+)

Современный реактивный способ — не декораторы, а функции-сигналы. **Сигнал** здесь — это реактивная обёртка над значением: читаешь как функцию, и всё, что от неё зависит, пересчитывается автоматически.

\`\`\`ts
ref = viewChild<ElementRef>('localRef');       // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // без undefined
\`\`\`

Плюсы: результат — это сигнал, его можно читать реактивно внутри \`computed\` (вычисляемое значение) и \`effect\` (побочный эффект), не нужно вручную выбирать тайминг, и не нужны подписки на \`QueryList\`. В новых проектах это рекомендованный способ. Вариант \`.required\` гарантирует, что значение будет — тип без \`undefined\`.

### QueryList и его .changes

Для декораторного стиля \`QueryList\` имеет свойство \`.changes\` — это \`Observable\` (поток событий), который срабатывает, когда набор элементов меняется динамически, например при добавлении/удалении строк через \`@for\`. Так можно реагировать на изменения списка.

## ⚠️ Подводные камни

- Обращение к \`ViewChild\` в \`ngOnInit\` при \`static: false\` даст \`undefined\` — результат ещё не готов, жди \`ngAfterViewInit\`.
- \`static: true\` нельзя использовать для элементов внутри \`@if\`/\`@for\` — их может не быть в DOM в нужный момент.
- Не путай, что откуда: свой шаблон — это \`ViewChild\`, а спроецированный извне контент — это \`ContentChild\`.

## 🎯 Запомни

- \`ViewChild\` — из своего шаблона (готов в \`ngAfterViewInit\`); \`ContentChild\` — из проекции (готов в \`ngAfterContentInit\`).
- \`static: true\` даёт доступ раньше (в \`ngOnInit\`), но только для элементов, всегда присутствующих в DOM.
- В новых проектах предпочитай сигнальные \`viewChild\`/\`contentChild\` — они реактивны и не требуют ручного тайминга.
- Для нескольких совпадений — \`QueryList\` с потоком \`.changes\`.`,
      en: `## 🧩 In plain words

Imagine the component is you, and around you are two kinds of "children": the ones you gave birth to yourself (wrote in your own template), and the ones handed to you from outside for fostering (projected through \`<ng-content>\`). \`@ViewChild\` finds your own biological children, and \`@ContentChild\` finds the foster ones. And each has its own moment when the child is "ready" and you can reach it from code.

### ViewChild versus ContentChild

- **\`@ViewChild\`** queries an element from the component's **own template** (its view — what the component rendered itself).
- **\`@ContentChild\`** queries an element from **projected** content (what came in through \`<ng-content>\` from the parent).

\`\`\`ts
@ViewChild('localRef') ref!: ElementRef;        // from own template
@ContentChild(TabComponent) tab!: TabComponent; // from projection
\`\`\`

If there can be multiple matches, use \`@ViewChildren\` / \`@ContentChildren\` — they return a \`QueryList\` (a special collection of results).

### Timing: when the result is ready

Angular doesn't know about these elements right away — first it must build the template and project the content. So each query has its own moment of readiness in the lifecycle:

- **\`ViewChild\` is available in \`ngAfterViewInit\`** — the hook called after the component's own view is fully built.
- **\`ContentChild\` is available in \`ngAfterContentInit\`** — the hook called after projected content has been inserted.

Before these hooks, the result isn't filled in yet.

### static: true versus static: false

The \`static\` option controls **when** the query resolves. **CD** here means change detection, the first run of change detection.

\`\`\`ts
@ViewChild('ref', { static: true }) ref!: ElementRef;
\`\`\`

- \`static: true\` — the query resolves **before** the first CD, and the result is available already in \`ngOnInit\`. But this works **only** if the element is **not** wrapped in a structural directive (\`@if\`, \`@for\`) — i.e. it is guaranteed to always be in the DOM.
- \`static: false\` (the default) — the query resolves **after** CD, the result is available in \`ngAfterViewInit\`. This is exactly what you need for elements that can appear and disappear conditionally.

Simply put: if the element is always present and you need it earlier — \`static: true\`; if it's conditional — \`static: false\`.

### Signal queries (Angular 17.2+)

The modern reactive approach uses signal functions instead of decorators. A **signal** here is a reactive wrapper around a value: you read it as a function, and everything depending on it recomputes automatically.

\`\`\`ts
ref = viewChild<ElementRef>('localRef');       // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // no undefined
\`\`\`

Benefits: the result is a signal, readable reactively inside \`computed\` (a derived value) and \`effect\` (a side effect), no need to manually pick timing, and no \`QueryList\` subscriptions. In new projects this is the recommended way. The \`.required\` variant guarantees a value — the type has no \`undefined\`.

### QueryList and its .changes

For the decorator style, \`QueryList\` has a \`.changes\` property — an \`Observable\` (a stream of events) that fires when the set of elements changes dynamically, for example when rows are added/removed via \`@for\`. This lets you react to list changes.

## ⚠️ Common pitfalls

- Accessing a \`ViewChild\` in \`ngOnInit\` with \`static: false\` gives \`undefined\` — the result isn't ready yet, wait for \`ngAfterViewInit\`.
- \`static: true\` cannot be used for elements inside \`@if\`/\`@for\` — they may not be in the DOM at the needed moment.
- Don't mix up what's from where: your own template is \`ViewChild\`, externally projected content is \`ContentChild\`.

## 🎯 Key takeaways

- \`ViewChild\` — from your own template (ready in \`ngAfterViewInit\`); \`ContentChild\` — from projection (ready in \`ngAfterContentInit\`).
- \`static: true\` gives earlier access (in \`ngOnInit\`), but only for elements always present in the DOM.
- In new projects prefer signal-based \`viewChild\`/\`contentChild\` — they are reactive and need no manual timing.
- For multiple matches — \`QueryList\` with the \`.changes\` stream.`,
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
      ru: `## 🧩 Простыми словами

Иногда ты не знаешь заранее, что показать на экране — компонент выбирается на лету, во время работы приложения (например, модалка, тултип или виджет по настройкам с сервера). Это и есть **динамические компоненты**: их создают из кода, а не пишут прямо в шаблоне. Для этого нужны два инструмента: \`TemplateRef\` — "рецепт" куска разметки, и \`ViewContainerRef\` — "розетка" в DOM, куда этот кусок можно воткнуть.

### TemplateRef — рецепт разметки

\`TemplateRef\` — это ссылка на **шаблон** (\`<ng-template>\`), который сам по себе **не отображается**. Думай о нём как о рецепте: заготовка DOM лежит и ждёт, пока ты решишь её "приготовить" (инстанцировать) позже, возможно даже несколько раз.

\`\`\`html
<ng-template #tpl let-name="name">Hi {{ name }}</ng-template>
\`\`\`

\`\`\`ts
@ViewChild('tpl') tpl!: TemplateRef<any>;
\`\`\`

Здесь \`let-name="name"\` объявляет переменную шаблона, значение которой мы передадим при создании.

### ViewContainerRef — точка вставки

\`ViewContainerRef\` — это **точка привязки** в DOM, куда можно динамически вставлять view (готовые куски интерфейса), созданные из шаблонов или из компонентов. Получить его можно через **DI** (внедрение зависимостей) или через якорный элемент в шаблоне.

### Создание embedded view из шаблона

Из \`TemplateRef\` создают **embedded view** (встроенное представление) — это "приготовленный" по рецепту кусок DOM, вставленный в контейнер:

\`\`\`ts
this.vcr.createEmbeddedView(this.tpl, { name: 'Anna' });
\`\`\`

Второй аргумент — это контекст: сюда мы передаём \`name: 'Anna'\`, и шаблон отрисует "Hi Anna".

### Создание динамического компонента

С движком **Ivy** (современный движок рендеринга Angular) создавать компоненты стало проще — старый \`ComponentFactoryResolver\` больше **не нужен** (он устарел):

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

Что тут происходит: \`clear()\` очищает контейнер от предыдущего содержимого; \`createComponent(WidgetComponent)\` создаёт и вставляет компонент; \`setInput\` задаёт его входные свойства; через \`instance\` мы добираемся до экземпляра и подписываемся на его output-события; \`detectChanges()\` запускает обновление.

\`createComponent\` возвращает \`ComponentRef\` — объект-ручку на созданный компонент, через который доступны \`instance\` (сам экземпляр), \`setInput\`, \`destroy\` (уничтожить) и \`location\` (его место в DOM).

## ⚠️ Подводные камни

- Динамические компоненты **больше не нужно** регистрировать в \`entryComponents\` — эта необходимость исчезла с приходом Ivy.
- Обязательно вызывай \`destroy()\` или \`clear()\`, когда компонент больше не нужен, — иначе будут утечки памяти.
- В \`createComponent\` можно передать \`injector\` (свой инжектор зависимостей) и \`projectableNodes\` (узлы для content projection внутрь динамического компонента).
- Если хочется декларативно, без ручного императивного кода, есть альтернативы: \`NgComponentOutlet\` (вставка компонента прямо в шаблоне) и \`*ngTemplateOutlet\` (вставка шаблона).

## 🎯 Запомни

- \`TemplateRef\` — рецепт разметки (\`<ng-template>\`), сам по себе не рендерится.
- \`ViewContainerRef\` — точка в DOM, куда вставляют view из шаблонов или компонентов.
- Динамический компонент создаётся через \`vcr.createComponent(...)\`; вход задают \`setInput\`, а результат — \`ComponentRef\`.
- Всегда чисти за собой (\`destroy\`/\`clear\`), иначе утечки. Применение: модалки, тултипы, динамические формы, рендер по конфигу с бэкенда.`,
      en: `## 🧩 In plain words

Sometimes you don't know in advance what to show on screen — the component is chosen on the fly, while the app is running (a modal, a tooltip, a widget configured from the server). These are **dynamic components**: created from code rather than written directly in the template. For this you need two tools: \`TemplateRef\` — a "recipe" for a chunk of markup, and \`ViewContainerRef\` — a "socket" in the DOM where that chunk can be plugged in.

### TemplateRef — a markup recipe

\`TemplateRef\` is a reference to a **template** (\`<ng-template>\`) that **does not render** on its own. Think of it as a recipe: a piece of DOM sits ready, waiting for you to "cook" (instantiate) it later, possibly several times.

\`\`\`html
<ng-template #tpl let-name="name">Hi {{ name }}</ng-template>
\`\`\`

\`\`\`ts
@ViewChild('tpl') tpl!: TemplateRef<any>;
\`\`\`

Here \`let-name="name"\` declares a template variable whose value we'll pass in at creation time.

### ViewContainerRef — the insertion point

\`ViewContainerRef\` is an **anchor point** in the DOM where you can dynamically insert views (ready-made pieces of UI) created from templates or components. You obtain it via **DI** (dependency injection) or through an anchor element in the template.

### Creating an embedded view from a template

From a \`TemplateRef\` you create an **embedded view** — a chunk of DOM "cooked" from the recipe and inserted into the container:

\`\`\`ts
this.vcr.createEmbeddedView(this.tpl, { name: 'Anna' });
\`\`\`

The second argument is the context: we pass \`name: 'Anna'\`, and the template renders "Hi Anna".

### Creating a dynamic component

With the **Ivy** engine (Angular's modern rendering engine), creating components became simpler — the old \`ComponentFactoryResolver\` is **no longer needed** (it's deprecated):

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

What happens here: \`clear()\` empties the container of previous content; \`createComponent(WidgetComponent)\` creates and inserts the component; \`setInput\` sets its input properties; through \`instance\` we reach the instance and subscribe to its output events; \`detectChanges()\` triggers an update.

\`createComponent\` returns a \`ComponentRef\` — a handle to the created component, exposing \`instance\` (the instance itself), \`setInput\`, \`destroy\`, and \`location\` (its place in the DOM).

## ⚠️ Common pitfalls

- Dynamic components **no longer need** \`entryComponents\` registration — that requirement disappeared with Ivy.
- Always call \`destroy()\` or \`clear()\` when the component is no longer needed — otherwise you get memory leaks.
- In \`createComponent\` you can pass an \`injector\` (a custom dependency injector) and \`projectableNodes\` (nodes for content projection into the dynamic component).
- If you prefer a declarative approach without manual imperative code, there are alternatives: \`NgComponentOutlet\` (inserting a component right in the template) and \`*ngTemplateOutlet\` (inserting a template).

## 🎯 Key takeaways

- \`TemplateRef\` — a markup recipe (\`<ng-template>\`) that doesn't render by itself.
- \`ViewContainerRef\` — a DOM point where views from templates or components are inserted.
- A dynamic component is created via \`vcr.createComponent(...)\`; inputs are set with \`setInput\`, and the result is a \`ComponentRef\`.
- Always clean up (\`destroy\`/\`clear\`) or you leak. Use cases: modals, tooltips, dynamic forms, rendering from a backend config.`,
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
      ru: `## 🧩 Простыми словами

Директива в Angular "сидит" на каком-то HTML-элементе — этот элемент называют **host** (хозяин). Иногда директиве нужно менять сам этот элемент: добавить ему класс, стиль, атрибут или отреагировать на клик по нему. \`@HostBinding\` — это способ управлять внешним видом хоста, а \`@HostListener\` — способ слушать его события. По-русски: одно "рисует" на хозяине, другое "слушает" хозяина.

### HostBinding — привязка к хосту

\`@HostBinding\` связывает свойство твоего класса со свойством, атрибутом, классом или стилем **host-элемента** (того элемента, на котором висит директива или компонент). Меняешь поле в классе — меняется хост.

\`\`\`ts
@HostBinding('class.active') isActive = false;
@HostBinding('attr.aria-disabled') disabled = false;
@HostBinding('style.opacity') opacity = 1;
\`\`\`

Здесь \`class.active\` добавляет/убирает CSS-класс \`active\` в зависимости от \`isActive\`; \`attr.aria-disabled\` управляет атрибутом доступности; \`style.opacity\` — стилем прозрачности.

### HostListener — слушатель событий хоста

\`@HostListener\` подписывает метод на события host-элемента (а также на глобальные \`window\`/\`document\`).

\`\`\`ts
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

@HostListener('window:resize')
onResize() { /* ... */ }
\`\`\`

Массив \`['$event']\` говорит, что в метод нужно передать объект события. \`window:resize\` слушает изменение размера окна, а не самого элемента.

### Свойство host в декораторе

Есть альтернатива этим двум декораторам — объект \`host\` прямо в \`@Component\`/\`@Directive\`. В нём тем же синтаксисом, что и в шаблонах (\`[...]\` для привязок, \`(...)\` для событий), описывают всё поведение хоста:

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

### Преимущества host-объекта

- **Всё в одном месте** — привязки к хосту видны прямо в метаданных декоратора, а не разбросаны отдельными полями по всему классу.
- Считается **более производительным** и предпочтительным стилем в новых гайдлайнах Angular.
- Статические значения задаются без всякой логики — например, \`'[attr.role]': '"button"'\` просто ставит роль.
- Лучше уживается с наследованием и линтерами.

## ⚠️ Подводные камни

- \`@HostBinding('class.x')\` добавляет/убирает класс по булеву значению; \`style.prop\` управляет стилем — не перепутай префиксы \`class.\`, \`attr.\`, \`style.\`.
- Для частых событий (\`mousemove\`, \`scroll\`) \`@HostListener\` может бить по производительности, потому что каждое событие запускает **CD** (change detection — обнаружение изменений). Варианты решения — \`runOutsideAngular\` (выполнять вне зоны Angular) или сигналы.
- В **zoneless**-режиме (без Zone.js) host-обработчики событий автоматически помечают view "грязной" (dirty), то есть требующей перерисовки.

## 🎯 Запомни

- \`host\` = элемент, на котором сидит директива/компонент.
- \`@HostBinding\` рисует на хосте (класс/атрибут/стиль/свойство), \`@HostListener\` слушает его события.
- Объект \`host\` в декораторе делает то же самое, но собирает всё в одном месте — это предпочтительный современный стиль.
- Осторожно с частыми событиями: они запускают change detection и могут тормозить.`,
      en: `## 🧩 In plain words

A directive in Angular "sits" on some HTML element — that element is called the **host**. Sometimes the directive needs to change that very element: add a class, a style, an attribute, or react to a click on it. \`@HostBinding\` is a way to control the host's appearance, and \`@HostListener\` is a way to listen to its events. In short: one "paints" on the host, the other "listens" to the host.

### HostBinding — binding to the host

\`@HostBinding\` links a property of your class to a property, attribute, class, or style of the **host element** (the element the directive or component sits on). Change the field in the class, and the host changes.

\`\`\`ts
@HostBinding('class.active') isActive = false;
@HostBinding('attr.aria-disabled') disabled = false;
@HostBinding('style.opacity') opacity = 1;
\`\`\`

Here \`class.active\` adds/removes the CSS class \`active\` depending on \`isActive\`; \`attr.aria-disabled\` controls the accessibility attribute; \`style.opacity\` controls the opacity style.

### HostListener — listening to host events

\`@HostListener\` subscribes a method to events on the host element (and also to global \`window\`/\`document\`).

\`\`\`ts
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

@HostListener('window:resize')
onResize() { /* ... */ }
\`\`\`

The array \`['$event']\` says the event object should be passed into the method. \`window:resize\` listens for window resizing, not the element itself.

### The host decorator property

There's an alternative to these two decorators — a \`host\` object right inside \`@Component\`/\`@Directive\`. Using the same syntax as templates (\`[...]\` for bindings, \`(...)\` for events), it describes all the host behavior:

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

### Benefits of the host object

- **Everything in one place** — host bindings are visible right in the decorator metadata, not scattered as separate fields across the class.
- Considered **more performant** and the preferred style in newer Angular guidelines.
- Static values are set without any logic — for example, \`'[attr.role]': '"button"'\` simply sets the role.
- Works better with inheritance and linters.

## ⚠️ Common pitfalls

- \`@HostBinding('class.x')\` toggles a class by boolean; \`style.prop\` controls a style — don't mix up the \`class.\`, \`attr.\`, \`style.\` prefixes.
- For frequent events (\`mousemove\`, \`scroll\`) \`@HostListener\` can hurt performance, because each event triggers **CD** (change detection). Solutions include \`runOutsideAngular\` (run outside the Angular zone) or signals.
- In **zoneless** mode (without Zone.js), host event handlers automatically mark the view "dirty", i.e. in need of re-rendering.

## 🎯 Key takeaways

- \`host\` = the element the directive/component sits on.
- \`@HostBinding\` paints on the host (class/attribute/style/property), \`@HostListener\` listens to its events.
- The \`host\` object in the decorator does the same but gathers everything in one place — the preferred modern style.
- Be careful with frequent events: they trigger change detection and can slow things down.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть готовые "суперсилы" для элементов: одна умеет показывать подсказку при наведении, другая — управлять фокусом для доступности. Directive Composition API (Angular 15+) позволяет компоненту сказать: "прицепи ко мне вот эти суперсилы". Ты не наследуешься от базового класса и не оборачиваешь всё в лишние теги — ты просто перечисляешь директивы, которые нужно "подмешать" к своему host-элементу.

### Что такое host-элемент и что делает hostDirectives

_Host-элемент_ — это корневой DOM-тег самого компонента (то, что стоит в его \`selector\`, например \`<app-menu-item>\`). Свойство \`hostDirectives\` в декораторе говорит Angular: применить перечисленные директивы прямо к этому host-элементу, как будто ты вручную навесил их атрибутами в разметке. Это **композиция** поведения (собираем из кусочков) вместо **наследования** (тянем всё от родителя).

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

Здесь \`MenuItemComponent\` автоматически получает поведение \`CdkMenuItem\` (навигация по меню) и \`TooltipDirective\` (подсказка). Запись \`'tooltipText: text'\` означает "инпут директивы называется \`tooltipText\`, но наружу мы выставляем его под именем \`text\`" — переименование, чтобы имя было удобнее для пользователей компонента.

### Что это даёт

- **Переиспользование** поведения (доступность, тултипы, drag) без наследования и без обёрток в шаблоне.
- Можно **выборочно выставить наружу** inputs/outputs host-директивы, при желании переименовав их.
- Host-директивы участвуют в **DI** (dependency injection, механизм внедрения зависимостей) — их сервисы доступны компоненту.
- Дизайн-системы (Angular CDK, Material) активно применяют это, чтобы навешивать готовые "примитивы поведения".

### Ограничения

- Host-директивы должны быть **standalone** (самостоятельные, без объявления в \`NgModule\`).
- Список применяется **статически** — его нельзя менять в рантайме, он фиксируется на этапе компиляции.
- Host-директиву **нельзя навязать снаружи** — только сам компонент решает, что к нему подмешать.
- **Порядок важен**: host-директивы создаются **раньше** самого компонента, а значит влияют на порядок в DI и на очередность выполнения хуков жизненного цикла.
- По умолчанию inputs/outputs **не** выставляются наружу — их нужно явно перечислить.
- Возможны конфликты, если несколько директив пытаются биндить один и тот же host-атрибут.

### Когда применять

Когда нужно единообразно "подмешать" готовое поведение сразу нескольким компонентам: управление фокусом, ripple-эффекты, ARIA-роли. Это более чистая альтернатива копипасте кода или общим базовым классам.

## ⚠️ Подводные камни

- Забыл сделать директиву standalone — она не подойдёт для \`hostDirectives\`.
- Ожидаешь, что input host-директивы будет доступен снаружи "сам собой" — нет, перечисляй его явно.
- Две host-директивы дерутся за один и тот же атрибут host-элемента — получишь конфликт.

## 🎯 Запомни

- \`hostDirectives\` = композиция поведения на host-элементе вместо наследования.
- Host-директивы обязательно standalone, применяются статически и участвуют в DI.
- Наружу видны только те inputs/outputs, что ты явно перечислил (можно с переименованием).
- Идеально для переиспользуемого поведения: a11y, тултипы, фокус, ripple.`,
      en: `## 🧩 In plain words

Imagine you have ready-made "superpowers" for elements: one shows a tooltip on hover, another manages focus for accessibility. The Directive Composition API (Angular 15+) lets a component say: "attach these superpowers to me." You don't inherit from a base class and you don't wrap everything in extra tags — you just list the directives you want "mixed into" your host element.

### What the host element is and what hostDirectives does

The _host element_ is the component's own root DOM tag (the one in its \`selector\`, e.g. \`<app-menu-item>\`). The \`hostDirectives\` property in the decorator tells Angular to apply the listed directives directly to that host element, as if you had put them there by hand as attributes. This is **composition** of behavior (assembled from pieces) instead of **inheritance** (pulling everything from a parent).

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

Here \`MenuItemComponent\` automatically gains the behavior of \`CdkMenuItem\` (menu navigation) and \`TooltipDirective\` (a tooltip). The entry \`'tooltipText: text'\` means "the directive's input is called \`tooltipText\`, but we expose it outward under the name \`text\`" — a rename to make the name friendlier for the component's users.

### What it provides

- **Reuse** of behavior (accessibility, tooltips, drag) without inheritance and without template wrapping.
- You can **selectively expose** the host directive's inputs/outputs, optionally renaming them.
- Host directives participate in **DI** (dependency injection) — their services are available to the component.
- Design systems (Angular CDK, Material) use this heavily to apply ready-made "behavior primitives."

### Limitations

- Host directives must be **standalone** (self-contained, not declared in an \`NgModule\`).
- The list is applied **statically** — it cannot change at runtime, it is fixed at compile time.
- A host directive **cannot be forced from outside** — only the component itself decides what to mix in.
- **Order matters**: host directives are instantiated **before** the component itself, which affects DI ordering and the order of lifecycle hook execution.
- By default inputs/outputs are **not** exposed — you must list them explicitly.
- Conflicts are possible if multiple directives try to bind the same host attribute.

### When to use

When you need to uniformly "mix in" ready behavior across several components: focus management, ripple effects, ARIA roles. It is a cleaner alternative to copy-paste or shared base classes.

## ⚠️ Common pitfalls

- You forgot to make the directive standalone — it won't work in \`hostDirectives\`.
- You expect a host directive's input to be available outside "automatically" — no, list it explicitly.
- Two host directives fight over the same host-element attribute — you get a conflict.

## 🎯 Key takeaways

- \`hostDirectives\` = behavior composition on the host element instead of inheritance.
- Host directives must be standalone, are applied statically, and participate in DI.
- Only the inputs/outputs you explicitly list are visible outward (renaming allowed).
- Perfect for reusable behavior: a11y, tooltips, focus, ripple.`,
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
      ru: `## 🧩 Простыми словами

SSR (server-side rendering) — это когда сервер заранее рисует HTML-страницу, чтобы пользователь увидел контент мгновенно, ещё до загрузки JavaScript. _Гидратация_ (hydration) — это момент, когда прилетевший JS "оживляет" этот статичный HTML: навешивает обработчики кликов, привязки, реактивность. Раньше Angular делал это грубо — стирал готовую картинку и рисовал заново. Non-destructive hydration делает это аккуратно: оставляет готовый DOM на месте и просто "подключается" к нему.

### Проблема старого SSR

Раньше Angular делал **destructive hydration** (разрушающую): сервер присылал готовый HTML, но как только на клиенте стартовал Angular, он **удалял весь DOM** и перерисовывал его с нуля. Результат — мигание (flicker), потеря состояния DOM (например, позиции скролла или введённого текста) и плохой UX.

### Non-destructive hydration

Начиная с Angular 16, функция \`provideClientHydration()\` включает **неразрушающую** гидратацию: клиент **переиспользует** уже готовый серверный DOM, ничего не стирая. Angular обходит существующий DOM, сопоставляет его со своим деревом компонентов и просто "подключает" обработчики событий и привязки — картинка на экране не дёргается.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

\`provideClientHydration()\` — это _провайдер_ (объект, регистрирующий возможность в системе внедрения зависимостей). Достаточно добавить его один раз при старте приложения.

### Что это даёт

- **Нет мигания** — DOM остаётся на месте.
- **Лучше Core Web Vitals** (набор метрик Google о качестве загрузки): меньше CLS (сдвиги макета), быстрее TTI (время до интерактивности).
- **Меньше работы** при старте — DOM не пересоздаётся.

### Как это работает под капотом

Сервер вставляет в HTML специальные **аннотации** — маркеры-комментарии, которые описывают границы view (участков разметки, отрендеренных компонентами). Клиент читает эти маркеры и по ним сопоставляет серверный DOM со своими компонентами, обходясь без полной перерисовки.

### Дополнительные возможности

- \`withEventReplay()\` — события, случившиеся **до** гидратации, **воспроизводятся** после неё. Пользователь кликнул, пока JS ещё грузился — клик не потеряется, а сработает, как только приложение оживёт.
- \`withIncrementalHydration()\` (Angular 19) — гидратация "по требованию", интегрированная с \`@defer\`: блоки оживают только при заданном триггере (скролл, наведение и т.п.), а не сразу все.

### Ограничения и подводные камни

- **Прямая манипуляция DOM** (через \`ElementRef\` или сторонние библиотеки, которые сами меняют разметку) ломает гидратацию: серверный и клиентский DOM расходятся, и Angular бросает ошибку \`NG0500\`.
- Контент должен быть **детерминированным** — на сервере и на клиенте должна получаться одинаковая разметка (никаких \`Math.random()\` или \`Date.now()\` прямо в шаблоне).
- Атрибут \`ngSkipHydration\` отключает гидратацию для проблемного поддерева (например, обёртки вокруг стороннего виджета), чтобы оно не мешало остальному.

## ⚠️ Подводные камни

- Меняешь DOM руками через \`ElementRef\` в гидратируемом поддереве — жди \`NG0500\`.
- Недетерминированный вывод (случайные числа, текущее время в шаблоне) вызывает рассинхрон server/client.
- Забыл повесить \`ngSkipHydration\` на обёртку стороннего виджета, который сам рисует DOM.

## 🎯 Запомни

- Non-destructive hydration переиспользует серверный DOM вместо перерисовки — нет мигания, лучше метрики.
- Включается одной строкой: \`provideClientHydration()\` при бутстрапе.
- \`withEventReplay()\` не теряет клики, сделанные до загрузки JS; \`withIncrementalHydration()\` — гидратация по требованию с \`@defer\`.
- Прямые манипуляции DOM и недетерминированный контент ломают гидратацию (\`NG0500\`); спасение — \`ngSkipHydration\`.`,
      en: `## 🧩 In plain words

SSR (server-side rendering) is when the server pre-renders the HTML page so the user sees content instantly, before JavaScript even loads. _Hydration_ is the moment the arriving JS "brings this static HTML to life": it attaches click handlers, bindings, and reactivity. Angular used to do this crudely — it wiped the ready picture and redrew it. Non-destructive hydration does it gently: it leaves the ready DOM in place and simply "plugs into" it.

### The old SSR problem

Angular used to do **destructive hydration**: the server sent ready HTML, but as soon as Angular started on the client, it **destroyed the whole DOM** and re-rendered it from scratch. The result — flicker, lost DOM state (scroll position, typed text), and poor UX.

### Non-destructive hydration

Starting with Angular 16, the \`provideClientHydration()\` function enables **non-destructive** hydration: the client **reuses** the existing server DOM without wiping anything. Angular walks the existing DOM, matches it to its component tree, and simply "attaches" event handlers and bindings — the picture on screen never flickers.

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

\`provideClientHydration()\` is a _provider_ (an object that registers a capability in the dependency injection system). You add it just once at app startup.

### What it provides

- **No flicker** — the DOM stays in place.
- **Better Core Web Vitals** (Google's set of load-quality metrics): lower CLS (layout shifts), faster TTI (time to interactive).
- **Less startup work** — the DOM is not recreated.

### How it works under the hood

The server inserts special **annotations** into the HTML — marker comments that describe view boundaries (regions of markup rendered by components). The client reads these markers and uses them to match the server DOM to its components, avoiding a full re-render.

### Additional capabilities

- \`withEventReplay()\` — events that happened **before** hydration are **replayed** after it. A user clicked while JS was still loading — the click is not lost; it fires as soon as the app comes alive.
- \`withIncrementalHydration()\` (Angular 19) — on-demand hydration integrated with \`@defer\`: blocks come alive only on a given trigger (scroll, hover, etc.) rather than all at once.

### Limitations and pitfalls

- **Direct DOM manipulation** (via \`ElementRef\` or third-party libraries that mutate the markup themselves) breaks hydration: the server and client DOM diverge, and Angular throws the \`NG0500\` error.
- Content must be **deterministic** — the server and the client must produce identical markup (no \`Math.random()\` or \`Date.now()\` directly in the template).
- The \`ngSkipHydration\` attribute disables hydration for a problematic subtree (e.g. a wrapper around a third-party widget), so it doesn't interfere with the rest.

## ⚠️ Common pitfalls

- You mutate the DOM by hand via \`ElementRef\` in a hydrated subtree — expect \`NG0500\`.
- Non-deterministic output (random numbers, current time in the template) causes a server/client mismatch.
- You forgot to put \`ngSkipHydration\` on a wrapper around a third-party widget that draws its own DOM.

## 🎯 Key takeaways

- Non-destructive hydration reuses the server DOM instead of redrawing it — no flicker, better metrics.
- Enabled in one line: \`provideClientHydration()\` at bootstrap.
- \`withEventReplay()\` keeps clicks made before JS loads; \`withIncrementalHydration()\` gives on-demand hydration with \`@defer\`.
- Direct DOM manipulation and non-deterministic content break hydration (\`NG0500\`); the escape hatch is \`ngSkipHydration\`.`,
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
      ru: `## 🧩 Простыми словами

Angular по умолчанию следит за всеми асинхронными событиями (клики, таймеры, движение мыши) и после каждого проверяет: "не изменились ли данные, не надо ли перерисовать экран?". Эта проверка называется _change detection_ (обнаружение изменений, CD). Для редких кликов это нормально, но для событий, которые случаются сотни раз в секунду (движение мыши, анимация), такие проверки становятся лишним грузом. \`NgZone.runOutsideAngular\` — это способ сказать Angular: "вот этот код выполняй, но не запускай после него проверку каждый раз".

### Проблема

Каждое асинхронное событие внутри Angular-зоны (\`mousemove\`, \`scroll\`, \`requestAnimationFrame\`, частые таймеры) триггерит \`ApplicationRef.tick()\` — полный проход change detection по всему дереву компонентов. _Зона_ (NgZone) — это обёртка Angular вокруг браузерных async-API, которая как раз ловит эти события. Для высокочастотных событий получаются десятки и сотни лишних CD в секунду, и интерфейс начинает лагать (jank).

### runOutsideAngular

\`NgZone.runOutsideAngular(fn)\` выполняет переданный колбэк **вне** Angular-зоны. Асинхронные операции, запущенные внутри него, **не** будут запускать change detection.

\`\`\`ts
constructor(private zone: NgZone) {}

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // цикл requestAnimationFrame
  });
}
\`\`\`

Тут обработчик \`mousemove\` и анимационный цикл крутятся "молча", не дёргая Angular на каждое движение мыши.

### Возврат в зону

Когда всё-таки нужно обновить UI (изменить состояние, показать результат), возвращаемся обратно в зону через \`NgZone.run\`, чтобы Angular заметил изменения:

\`\`\`ts
this.zone.run(() => {
  this.position = computed; // теперь CD сработает и экран обновится
});
\`\`\`

### Типичные применения

- **Анимации** через \`requestAnimationFrame\`.
- **Drag & drop**, перетаскивание, resize (изменение размеров).
- Интеграция со сторонними библиотеками (графики, карты, three.js), которые рисуют сами и не нуждаются в CD Angular.
- Частые события WebSocket или таймеров, где не каждое требует перерисовки.

### Нюансы

- Вычисления внутри \`runOutsideAngular\` идут как обычно, но UI **не обновляется** автоматически — для финального обновления нужен явный \`zone.run\` или \`markForCheck\`.
- Не забывай **снимать** обработчики в \`ngOnDestroy\`, иначе получишь утечки памяти.
- В **zoneless**-режиме (Angular без Zone.js) \`NgZone\` — пустышка (no-op), и эта оптимизация не нужна: там change detection управляется сигналами, и частые события сами по себе CD не вызывают.

## ⚠️ Подводные камни

- Ждёшь, что UI обновится после \`runOutsideAngular\` сам — нет, вернись в зону через \`zone.run\` или вызови \`markForCheck\`.
- Забыл \`removeEventListener\` в \`ngOnDestroy\` — утечка памяти и висячие обработчики.
- Применяешь трюк в zoneless-приложении — бессмысленно, \`NgZone\` там ничего не делает.

## 🎯 Запомни

- \`runOutsideAngular\` выполняет код без запуска change detection — спасение для высокочастотных событий.
- Обратно в зону через \`zone.run\`, только когда реально нужно обновить UI.
- Классические кейсы: анимации, drag & drop, сторонние библиотеки рендеринга.
- В zoneless-режиме приём не нужен: CD там на сигналах.`,
      en: `## 🧩 In plain words

By default Angular watches every async event (clicks, timers, mouse moves) and after each one checks: "did the data change, do I need to redraw the screen?" That check is called _change detection_ (CD). For rare clicks it's fine, but for events that fire hundreds of times per second (mouse movement, animation) those checks become dead weight. \`NgZone.runOutsideAngular\` is a way to tell Angular: "run this code, but don't run a check after it every time."

### The problem

Every async event inside the Angular zone (\`mousemove\`, \`scroll\`, \`requestAnimationFrame\`, frequent timers) triggers \`ApplicationRef.tick()\` — a full change detection pass over the whole component tree. The _zone_ (NgZone) is Angular's wrapper around the browser's async APIs, and it's exactly what catches these events. For high-frequency events this means dozens or hundreds of extra CDs per second, and the UI starts to jank.

### runOutsideAngular

\`NgZone.runOutsideAngular(fn)\` runs the given callback **outside** the Angular zone. Async operations started inside it will **not** trigger change detection.

\`\`\`ts
constructor(private zone: NgZone) {}

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // requestAnimationFrame loop
  });
}
\`\`\`

Here the \`mousemove\` handler and the animation loop run "silently," without nudging Angular on every mouse move.

### Returning to the zone

When you actually need to update the UI (change state, show a result), re-enter the zone via \`NgZone.run\` so Angular notices the changes:

\`\`\`ts
this.zone.run(() => {
  this.position = computed; // CD now fires and the screen updates
});
\`\`\`

### Typical uses

- **Animations** via \`requestAnimationFrame\`.
- **Drag & drop**, dragging, resize.
- Integrating third-party libraries (charts, maps, three.js) that draw themselves and don't need Angular's CD.
- Frequent WebSocket or timer events where not every one needs a re-render.

### Nuances

- Computations inside \`runOutsideAngular\` still run normally, but the UI does **not** update automatically — for the final update you need an explicit \`zone.run\` or \`markForCheck\`.
- Don't forget to **remove** listeners in \`ngOnDestroy\`, or you'll get memory leaks.
- In **zoneless** mode (Angular without Zone.js) \`NgZone\` is a no-op, and this optimization is unnecessary: there, change detection is driven by signals, and frequent events don't trigger CD on their own.

## ⚠️ Common pitfalls

- You expect the UI to update after \`runOutsideAngular\` by itself — no, re-enter with \`zone.run\` or call \`markForCheck\`.
- You forgot \`removeEventListener\` in \`ngOnDestroy\` — memory leak and dangling handlers.
- You use the trick in a zoneless app — pointless, \`NgZone\` does nothing there.

## 🎯 Key takeaways

- \`runOutsideAngular\` runs code without triggering change detection — a lifesaver for high-frequency events.
- Re-enter the zone via \`zone.run\` only when you truly need to update the UI.
- Classic cases: animations, drag & drop, third-party rendering libraries.
- In zoneless mode the trick isn't needed: CD there is signal-driven.`,
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
      ru: `## 🧩 Простыми словами

_Пайп_ (pipe) в Angular — это маленький преобразователь значения прямо в шаблоне: \`{{ price | currency }}\` берёт число и превращает в "$10.00". Вопрос лишь в том, **как часто** Angular пересчитывает это преобразование. _Pure_-пайп ленивый: пересчитывает только когда вход реально сменился. _Impure_-пайп трудяга: пересчитывает при каждой проверке изменений. Разница в частоте пересчёта — это и есть разница в производительности.

### Pure-пайпы (по умолчанию)

Pure-пайп пересчитывается **только** когда меняется **ссылка** на входное значение (или само примитивное значение вроде числа/строки). Angular кэширует результат и не вызывает \`transform\` заново, если ссылка та же. Это очень дёшево: при каждом change detection (проверке изменений) выполняется простое сравнение через \`===\`.

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true по умолчанию
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // вызывается только при смене value/factor
  }
}
\`\`\`

### Impure-пайпы

Флаг \`pure: false\` заставляет Angular вызывать \`transform\` **на каждом** цикле change detection, независимо от того, менялась ссылка или нет.

\`\`\`ts
@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

### Опасность impure-пайпов

Impure-пайп может выполняться **сотни раз в секунду** — при каждом CD, при каждом событии. Если внутри тяжёлая логика, это серьёзное узкое место (bottleneck) для производительности. Классическая ловушка — фильтрация или сортировка массивов через impure-пайп прямо в шаблоне.

### Когда impure оправдан

- \`AsyncPipe\` — impure, потому что должен реагировать на новые значения из Observable или Promise.
- Пайпы, зависящие от внешнего изменяемого состояния, которое не отражается сменой ссылки.

### Готчи pure-пайпов

Поскольку pure-пайп смотрит на **ссылку**, мутация массива или объекта без создания новой ссылки **не** заставит пайп пересчитаться:

\`\`\`ts
this.items.push(x);              // pure-пайп не среагирует
this.items = [...this.items, x]; // новая ссылка — среагирует
\`\`\`

Первая строка меняет тот же массив (ссылка та же), поэтому pure-пайп считает, что ничего не изменилось. Вторая создаёт новый массив (новая ссылка) — и пайп пересчитается.

### Рекомендация

Избегай фильтрации и сортировки в шаблоне через пайпы. Лучше использовать \`computed\`-сигнал или производное состояние в компоненте, где вычисление контролируемо и мемоизировано (запоминает результат и не пересчитывает зря).

## ⚠️ Подводные камни

- Тяжёлая логика в impure-пайпе = падение производительности: он крутится на каждом CD.
- Мутируешь массив через \`push\`/\`splice\` и ждёшь реакции pure-пайпа — не дождёшься, нужна новая ссылка.
- Фильтрация списка через пайп в шаблоне — популярная, но плохая идея; выноси в \`computed\`.

## 🎯 Запомни

- Pure (по умолчанию) пересчитывается только при смене ссылки/примитива — дёшево и кэшируемо.
- Impure (\`pure: false\`) пересчитывается на каждом change detection — осторожно с тяжёлой логикой.
- Pure-пайп не видит мутаций без новой ссылки (\`push\` не сработает, spread — да).
- Для фильтрации/сортировки предпочитай \`computed\`-сигнал, а не пайп в шаблоне.`,
      en: `## 🧩 In plain words

A _pipe_ in Angular is a small value transformer right in the template: \`{{ price | currency }}\` takes a number and turns it into "$10.00". The only question is **how often** Angular recomputes that transform. A _pure_ pipe is lazy: it recomputes only when the input actually changed. An _impure_ pipe is a workhorse: it recomputes on every change detection check. That difference in recompute frequency is exactly the performance difference.

### Pure pipes (default)

A pure pipe recomputes **only** when the **reference** of its input changes (or the primitive value itself, like a number/string). Angular caches the result and does not call \`transform\` again if the reference is the same. This is very cheap: each change detection (CD) just does a \`===\` comparison.

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true by default
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // called only when value/factor change
  }
}
\`\`\`

### Impure pipes

The \`pure: false\` flag forces Angular to call \`transform\` on **every** change detection cycle, regardless of whether the reference changed.

\`\`\`ts
@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

### The danger of impure pipes

An impure pipe can run **hundreds of times per second** — every CD, every event. If it holds heavy logic, it's a serious performance bottleneck. The classic trap is filtering or sorting arrays through an impure pipe right in the template.

### When impure is justified

- \`AsyncPipe\` is impure because it must react to new values from an Observable or Promise.
- Pipes that depend on external mutable state not reflected by a reference change.

### Gotchas of pure pipes

Since a pure pipe looks at the **reference**, mutating an array or object without creating a new reference will **not** make the pipe recompute:

\`\`\`ts
this.items.push(x);              // pure pipe won't react
this.items = [...this.items, x]; // new reference — it reacts
\`\`\`

The first line mutates the same array (same reference), so the pure pipe thinks nothing changed. The second creates a new array (new reference) — and the pipe recomputes.

### Recommendation

Avoid filtering and sorting in the template via pipes. Prefer a \`computed\` signal or derived state in the component, where the computation is controlled and memoized (remembers the result and doesn't recompute needlessly).

## ⚠️ Common pitfalls

- Heavy logic in an impure pipe = performance drop: it runs on every CD.
- You mutate an array with \`push\`/\`splice\` and expect a pure pipe to react — it won't, you need a new reference.
- Filtering a list via a pipe in the template is popular but a bad idea; move it into a \`computed\`.

## 🎯 Key takeaways

- Pure (default) recomputes only on a reference/primitive change — cheap and cacheable.
- Impure (\`pure: false\`) recomputes on every change detection — beware heavy logic.
- A pure pipe doesn't see mutations without a new reference (\`push\` won't work, spread will).
- For filtering/sorting, prefer a \`computed\` signal over a template pipe.`,
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
      ru: `## 🧩 Простыми словами

Представь навигацию в приложении как поездку на поезде: она проходит станции по порядку — «отправились», «проверили билеты», «загрузили багаж», «приехали». Роутер Angular по дороге объявляет каждую такую «станцию» событием, и ты можешь на них реагировать. А параметры маршрута (например, \`id\` пользователя в адресе \`/user/42\`) удобно читать как «живой поток», который сам присылает новое значение, когда адрес меняется.

### Жизненный цикл навигации

Каждый раз, когда пользователь переходит по ссылке, роутер прогоняет навигацию через серию событий. Подписаться на них можно через \`Router.events\` — это \`Observable\` (поток значений, на который можно подписаться). Порядок такой:

1. **NavigationStart** — навигация началась.
2. **RouteConfigLoadStart / RouteConfigLoadEnd** — загрузка lazy-чанка (отдельного куска кода, который скачивается только когда понадобился), если он есть.
3. **GuardsCheckStart / GuardsCheckEnd** — работают гарды: \`CanMatch\`, \`CanActivate\`, \`CanDeactivate\` (проверки «можно ли сюда зайти / уйти»).
4. **ResolveStart / ResolveEnd** — работают резолверы (заранее подгружают данные до показа страницы).
5. **NavigationEnd** — успешно доехали.
6. **NavigationCancel** (гард вернул \`false\` или \`UrlTree\` — перенаправление) или **NavigationError** (что-то упало).

Чаще всего нужно поймать именно момент успешного завершения:

\`\`\`ts
this.router.events.pipe(
  filter(e => e is NavigationEnd)
).subscribe(...);
\`\`\`

Оператор \`filter\` пропускает только события нужного типа, отсеивая остальные.

### Реактивный доступ к параметрам

\`ActivatedRoute\` — это объект, описывающий текущий активный маршрут. Он даёт **потоки** (\`Observable\`), которые присылают новое значение при изменении, **не пересоздавая компонент**:

\`\`\`ts
private route = inject(ActivatedRoute);

id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // данные из резолвера
\`\`\`

Здесь \`paramMap\` — параметры пути (\`:id\`), \`queryParamMap\` — query-параметры (\`?sort=asc\`), \`data\` — данные, подготовленные резолвером.

### Snapshot против Observable

- \`route.snapshot.paramMap.get('id')\` — это значение **на момент** активации, как фотоснимок. Оно **не обновится**, если навигация идёт на **тот же самый** компонент с другими параметрами.
- \`route.paramMap\` (поток) — обновляется **всегда**. Это важно для маршрутов вида \`/user/:id\`: при смене \`id\` Angular переиспользует уже созданный компонент, и только поток даст свежее значение.

### Сигнальный доступ (Angular 16+)

_Сигнал_ — это контейнер значения, который умеет оповещать об изменениях (реактивная замена привычных переменных). С опцией \`withComponentInputBinding()\` параметры маршрута можно привязывать прямо к входам компонента (\`@Input\` / \`input()\`):

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// в компоненте
id = input.required<string>(); // авто из route-параметра :id
\`\`\`

Angular сам подставит параметр \`:id\` в этот вход. Также можно превратить поток в сигнал: \`toSignal(route.paramMap)\`.

## ⚠️ Подводные камни

- При навигации на **тот же** компонент Angular по умолчанию его **не пересоздаёт** — поэтому нельзя полагаться на \`ngOnInit\` для перезагрузки данных. Нужно подписываться на потоки параметров (\`paramMap\`) или использовать сигнальные входы.
- \`snapshot\` удобен, но обманчив на переиспользуемых маршрутах: он «застывает» на первом значении.

## 🎯 Запомни

- Навигация — это конвейер событий: Start → Guards → Resolve → End (или Cancel/Error). Слушай их через \`router.events\`.
- Для параметров бери **поток** \`paramMap\`, а не \`snapshot\`, если маршрут может переиспользовать компонент.
- В новых версиях есть \`withComponentInputBinding()\` + \`input()\` и \`toSignal()\` — параметры прямо как сигналы, без ручных подписок.`,
      en: `## 🧩 In plain words

Think of navigation in your app like a train journey: it passes stations in order — "departed", "tickets checked", "luggage loaded", "arrived". Angular's router announces each such "station" as an event, and you can react to them. Route params (like a user's \`id\` in the URL \`/user/42\`) are easiest to read as a "live stream" that pushes you a new value whenever the URL changes.

### The navigation lifecycle

Every time the user follows a link, the router runs navigation through a series of events. You subscribe via \`Router.events\` — an \`Observable\` (a stream of values you can subscribe to). The order is:

1. **NavigationStart** — navigation began.
2. **RouteConfigLoadStart / RouteConfigLoadEnd** — loading a lazy chunk (a separate piece of code downloaded only when needed), if any.
3. **GuardsCheckStart / GuardsCheckEnd** — guards run: \`CanMatch\`, \`CanActivate\`, \`CanDeactivate\` (the "may I enter / leave?" checks).
4. **ResolveStart / ResolveEnd** — resolvers run (they pre-fetch data before the page shows).
5. **NavigationEnd** — arrived successfully.
6. **NavigationCancel** (a guard returned \`false\` or a \`UrlTree\` redirect) or **NavigationError** (something failed).

Usually you want to catch the successful-completion moment:

\`\`\`ts
this.router.events.pipe(
  filter(e => e is NavigationEnd)
).subscribe(...);
\`\`\`

The \`filter\` operator lets through only events of the type you want, dropping the rest.

### Reactive access to params

\`ActivatedRoute\` is the object describing the currently active route. It exposes **streams** (\`Observable\`s) that emit a new value on change **without recreating the component**:

\`\`\`ts
private route = inject(ActivatedRoute);

id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // resolver data
\`\`\`

Here \`paramMap\` is path params (\`:id\`), \`queryParamMap\` is query params (\`?sort=asc\`), and \`data\` is data prepared by a resolver.

### Snapshot vs Observable

- \`route.snapshot.paramMap.get('id')\` — the value **at the moment** of activation, like a photograph. It **does not update** if navigation goes to the **same** component with different params.
- \`route.paramMap\` (a stream) — **always** updates. This matters for routes like \`/user/:id\`: when the \`id\` changes Angular reuses the already-created component, and only the stream gives you the fresh value.

### Signal access (Angular 16+)

A _signal_ is a value container that can notify about changes (a reactive replacement for ordinary variables). With \`withComponentInputBinding()\` you can bind route params straight to component inputs (\`@Input\` / \`input()\`):

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// in the component
id = input.required<string>(); // auto from the :id route param
\`\`\`

Angular feeds the \`:id\` param into this input for you. You can also turn a stream into a signal: \`toSignal(route.paramMap)\`.

## ⚠️ Common pitfalls

- On navigation to the **same** component Angular by default does **not** recreate it — so you cannot rely on \`ngOnInit\` to reload data. You must subscribe to the param streams (\`paramMap\`) or use signal inputs.
- \`snapshot\` is convenient but deceptive on reused routes: it "freezes" on the first value.

## 🎯 Key takeaways

- Navigation is a pipeline of events: Start → Guards → Resolve → End (or Cancel/Error). Listen via \`router.events\`.
- For params use the **stream** \`paramMap\`, not \`snapshot\`, if a route can reuse the component.
- Newer versions offer \`withComponentInputBinding()\` + \`input()\` and \`toSignal()\` — params as signals, no manual subscriptions.`,
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
      ru: `## 🧩 Простыми словами

В Angular есть два способа описывать «данные, которые меняются со временем»: **сигналы** (простые реактивные значения, которые читаешь как функцию — \`count()\`) и **RxJS-потоки** (\`Observable\`, мощная труба для асинхронных событий вроде запросов к серверу). \`toSignal\` и \`toObservable\` — это два переходника между этими мирами: один превращает поток в сигнал, другой — сигнал в поток. Так ты берёшь лучшее от обоих.

### toSignal — из потока в сигнал

\`toSignal(observable$)\` превращает \`Observable\` в \`Signal\`. Он **сам подписывается** на поток и **сам отписывается**, когда компонент уничтожается (привязка идёт к \`DestroyRef\` — служебному объекту, который знает момент уничтожения). Это избавляет от ручных \`subscribe\`/\`unsubscribe\` и от \`async\`-пайпа в шаблоне.

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
\`\`\`

### Нюансы toSignal

- **Начальное значение.** До первой эмиссии из потока сигнал равен \`undefined\`, поэтому его тип становится \`T | undefined\`. Убрать это можно двумя способами:
- \`initialValue\` — задаёшь стартовое значение вручную.
- \`requireSync: true\` — для потоков, которые эмитят **синхронно**, прямо в момент подписки (\`BehaviorSubject\`, \`of(...)\`). Тогда \`undefined\` из типа уходит.

\`\`\`ts
count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });
\`\`\`

- **Injection-контекст.** Вызывать нужно в контексте инъекции (в поле класса, конструкторе) или передавать \`{ injector }\` вручную — потому что хелпер цепляется к \`DestroyRef\`.
- **Горячая подписка.** Подписка происходит **сразу** при создании, а не лениво при первом чтении.
- **Ошибки.** Если поток выбросит ошибку, она пробросится при **чтении** сигнала (\`id()\`), а не в момент возникновения.

### toObservable — из сигнала в поток

\`toObservable(signal)\` делает обратное: превращает \`Signal\` в \`Observable\`. Под капотом он использует \`effect\` (побочный эффект, который автоматически запускается при изменении прочитанных сигналов), чтобы ловить изменения и эмитить их в поток.

\`\`\`ts
query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

Здесь сигнал \`query\` хранит текст поиска, а RxSJ-операторы добавляют «умную» асинхронную логику: \`debounceTime(300)\` ждёт паузу 300 мс между нажатиями, \`switchMap\` отменяет предыдущий запрос при новом вводе. Это и есть лучшее из двух миров: сигналы для простого синхронного состояния, RxJS для сложной асинхронной композиции (debounce, switchMap, retry).

### Нюанс toObservable

Эмиссии происходят **асинхронно** — через \`effect\`, в конце цикла change detection, а не мгновенно при вызове \`set\`. Поэтому несколько быстрых изменений сигнала подряд могут «схлопнуться» в одну эмиссию (это называется glitch-free батчинг — защита от промежуточных «мусорных» значений).

## ⚠️ Подводные камни

- \`toSignal\` без \`initialValue\`/\`requireSync\` даёт тип \`T | undefined\` — не забывай про это в шаблоне и в типах.
- \`toSignal\` подписывается сразу и должен вызываться в injection-контексте, иначе будет ошибка.
- \`toObservable\` эмитит не синхронно — не жди, что значение прилетит в поток прямо в строке после \`set\`.

## 🎯 Запомни

- \`toSignal(obs$)\` — поток → сигнал, с авто-отпиской. \`toObservable(sig)\` — сигнал → поток, через \`effect\`.
- У \`toSignal\` есть \`initialValue\` и \`requireSync\` — они решают проблему стартового \`undefined\`.
- Комбинируй: сигналы для состояния, RxJS для асинхронной оркестровки (debounce/switchMap), сшивая их этими двумя хелперами.`,
      en: `## 🧩 In plain words

Angular has two ways to describe "data that changes over time": **signals** (simple reactive values you read like a function — \`count()\`) and **RxJS streams** (\`Observable\`, a powerful pipe for async events like server requests). \`toSignal\` and \`toObservable\` are two adapters between these worlds: one turns a stream into a signal, the other turns a signal into a stream. That way you get the best of both.

### toSignal — from stream to signal

\`toSignal(observable$)\` converts an \`Observable\` into a \`Signal\`. It **subscribes automatically** and **unsubscribes automatically** when the component is destroyed (tied to \`DestroyRef\` — a helper object that knows the moment of destruction). This removes manual \`subscribe\`/\`unsubscribe\` and the \`async\` pipe in the template.

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));
\`\`\`

### Nuances of toSignal

- **Initial value.** Before the stream's first emission the signal is \`undefined\`, so its type becomes \`T | undefined\`. You can remove that in two ways:
- \`initialValue\` — set a starting value yourself.
- \`requireSync: true\` — for streams that emit **synchronously**, right at subscription time (\`BehaviorSubject\`, \`of(...)\`). Then \`undefined\` leaves the type.

\`\`\`ts
count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });
\`\`\`

- **Injection context.** It must be called in an injection context (a class field, the constructor) or given \`{ injector }\` explicitly — because the helper ties to \`DestroyRef\`.
- **Hot subscription.** It subscribes **immediately** on creation, not lazily on first read.
- **Errors.** If the stream throws, the error is re-thrown when you **read** the signal (\`id()\`), not at the moment it occurs.

### toObservable — from signal to stream

\`toObservable(signal)\` does the reverse: it converts a \`Signal\` into an \`Observable\`. Under the hood it uses an \`effect\` (a side effect that re-runs automatically when the signals it reads change) to catch changes and emit them into the stream.

\`\`\`ts
query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

Here the \`query\` signal holds the search text, and the RxJS operators add "smart" async logic: \`debounceTime(300)\` waits for a 300 ms pause between keystrokes, and \`switchMap\` cancels the previous request when new input arrives. This is the best of both worlds: signals for simple synchronous state, RxJS for complex async composition (debounce, switchMap, retry).

### Nuance of toObservable

Emissions happen **asynchronously** — via an \`effect\`, at the end of the change detection cycle, not instantly when you call \`set\`. So several quick signal changes in a row may "collapse" into a single emission (this is glitch-free batching — protection against intermediate "garbage" values).

## ⚠️ Common pitfalls

- \`toSignal\` without \`initialValue\`/\`requireSync\` gives the type \`T | undefined\` — remember that in your template and types.
- \`toSignal\` subscribes immediately and must be called in an injection context, or it errors.
- \`toObservable\` does not emit synchronously — don't expect the value to hit the stream on the very line after \`set\`.

## 🎯 Key takeaways

- \`toSignal(obs$)\` — stream → signal, with auto-unsubscribe. \`toObservable(sig)\` — signal → stream, via an \`effect\`.
- \`toSignal\` has \`initialValue\` and \`requireSync\` — they solve the starting-\`undefined\` problem.
- Combine them: signals for state, RxJS for async orchestration (debounce/switchMap), stitched together with these two helpers.`,
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
      ru: `## 🧩 Простыми словами

Когда ты пишешь сервис (класс с логикой, например для запросов к API), Angular должен знать, **где** его создавать и **на кого один экземпляр** будет общим. Свойство \`providedIn\` в декораторе \`@Injectable\` как раз отвечает на вопрос «в каком ящике живёт этот сервис». А приятный бонус: такой способ регистрации позволяет сборщику выкинуть сервис из итогового файла, если им никто не пользуется.

### Значения providedIn

- **\`'root'\`** — один экземпляр (синглтон) на всё приложение, в корневом \`EnvironmentInjector\` (главном «ящике» зависимостей). Самый частый и рекомендуемый вариант.
- **\`'platform'\`** — синглтон, общий для **всех Angular-приложений** на одной странице. Редкий случай, нужен для микрофронтендов (несколько приложений рядом).
- **\`'any'\`** — **отдельный экземпляр** в каждом lazy-загруженном инжекторе (плюс один в root для eager-частей, которые грузятся сразу). Полезно, когда нужно изолировать состояние для каждого lazy-модуля.
- **Конкретный класс / EnvironmentInjector** — реже, для привязки к своему scope.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

### Как это влияет на tree-shaking

_Tree-shaking_ — это когда сборщик (бандлер) выкидывает из финального файла код, который нигде не используется, чтобы приложение весило меньше. Главное преимущество \`providedIn\` над старой регистрацией в массиве \`providers: []\` модуля — именно **tree-shakability**.

При \`providedIn: 'root'\` связь «сервис → инжектор» записана **внутри самого сервиса**. Если сервис **нигде не инжектится**, бандлер видит, что на него нет ни одной ссылки, и **удаляет** его из бандла.

При старом стиле (\`providers: [MyService]\` в \`NgModule\`) сервис **всегда** попадал в бандл, даже неиспользуемый: массив \`providers\` — это статическая ссылка на класс, а значит «код используется», и выкинуть его нельзя.

### Практические рекомендации

- Для большинства сервисов — \`providedIn: 'root'\`: и синглтон, и tree-shakable.
- Для состояния, живущего в рамках одного компонента, — массив \`providers\` внутри \`@Component\`, а не \`providedIn\`. Тогда у каждого экземпляра компонента будет своя копия.
- \`providedIn: 'any'\` — когда каждый lazy-участок должен иметь собственную копию сервиса.

## ⚠️ Подводные камни

- \`providedIn: 'root'\` создаёт сервис **лениво**: экземпляр появляется при первой инъекции, а не при старте приложения. Это оптимизация, но и причина, почему side-эффект в конструкторе сервиса может не выполниться, пока сервис никто не запросит.
- Не путай \`providedIn: 'root'\` (один на приложение) и \`providers\` в \`@Component\` (свой на каждый компонент) — это разные scope с разным временем жизни.

## 🎯 Запомни

- \`providedIn\`: \`'root'\` (один на приложение), \`'platform'\` (один на все приложения страницы), \`'any'\` (свой на каждый lazy-инжектор).
- \`providedIn: 'root'\` делает сервис tree-shakable — неиспользуемый сервис выпадет из бандла; старый \`providers: []\` так не умеет.
- Сервис из \`'root'\` создаётся лениво, при первой инъекции.`,
      en: `## 🧩 In plain words

When you write a service (a class with logic, e.g. for API calls), Angular needs to know **where** to create it and **who shares one instance** of it. The \`providedIn\` property in the \`@Injectable\` decorator answers exactly the question "which box does this service live in?". And a nice bonus: this way of registering lets the bundler drop the service from the final file if nobody uses it.

### providedIn values

- **\`'root'\`** — one instance (a singleton) for the whole app, in the root \`EnvironmentInjector\` (the main dependency "box"). The most common and recommended choice.
- **\`'platform'\`** — a singleton shared across **all Angular apps** on one page. A rare case, needed for microfrontends (several apps side by side).
- **\`'any'\`** — a **separate instance** in each lazy-loaded injector (plus one in root for eager parts that load immediately). Useful when you need to isolate state per lazy module.
- **A specific class / EnvironmentInjector** — rarer, for binding to your own scope.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

### How it affects tree-shaking

_Tree-shaking_ is when the bundler drops unused code from the final file so the app ships smaller. The main advantage of \`providedIn\` over the old registration in a module's \`providers: []\` array is exactly this **tree-shakability**.

With \`providedIn: 'root'\` the "service → injector" link is written **inside the service itself**. If the service is **injected nowhere**, the bundler sees not a single reference to it and **removes** it from the bundle.

With the old style (\`providers: [MyService]\` in an \`NgModule\`) the service **always** entered the bundle, even unused: the \`providers\` array is a static reference to the class, which counts as "used", so it can't be dropped.

### Practical recommendations

- For most services — \`providedIn: 'root'\`: both a singleton and tree-shakable.
- For state that lives within a single component — a \`providers\` array inside \`@Component\`, not \`providedIn\`. Then each component instance gets its own copy.
- \`providedIn: 'any'\` — when each lazy segment should have its own copy of the service.

## ⚠️ Common pitfalls

- \`providedIn: 'root'\` creates the service **lazily**: the instance appears on first injection, not at app startup. This is an optimization, but also the reason a side effect in the service constructor may not run until something requests the service.
- Don't confuse \`providedIn: 'root'\` (one per app) with \`providers\` in \`@Component\` (one per component) — different scopes with different lifetimes.

## 🎯 Key takeaways

- \`providedIn\`: \`'root'\` (one per app), \`'platform'\` (one across all apps on the page), \`'any'\` (one per lazy injector).
- \`providedIn: 'root'\` makes a service tree-shakable — an unused service falls out of the bundle; the old \`providers: []\` can't do that.
- A \`'root'\` service is created lazily, on first injection.`,
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
      ru: `## 🧩 Простыми словами

Представь, что каждый компонент — это лампочка, а сигнал — это выключатель. Раньше (в мире Zone.js) при любом «щелчке» Angular обходил **всё** здание и проверял каждую лампочку: не пора ли перерисовать. С сигналами лампочка и выключатель соединены **напрямую проводом**: щёлкнул нужный выключатель — обновилась ровно та лампочка, что к нему подключена, и никто больше. Ниже — как этот «провод» протягивается под капотом.

### Реактивный consumer у каждой view

Каждый компонент в Ivy (движке рендеринга Angular) имеет внутреннюю структуру \`LView\` — это служебное представление конкретного экземпляра шаблона. Когда шаблон **читает сигнал** (например, \`{{ count() }}\`), чтение происходит внутри **реактивного контекста** этой view. Angular на время этого чтения назначает «текущим активным consumer» реактивный узел данного \`LView\`. _Consumer_ — это тот, кто зависит от значения; _producer_ — тот, кто его поставляет (сам сигнал).

### Регистрация зависимости

В момент чтения сигнал-producer **записывает** текущего активного consumer в свой список зависимостей, а consumer запоминает этот producer. Получается двусторонняя связь в графе зависимостей — ровно та же механика, что и у \`computed\` (вычисляемого сигнала) и \`effect\` (побочного эффекта). Так граф узнаёт «кто от кого зависит».

### Что происходит при записи

Когда сигнал меняется (\`count.set(...)\`), запускается цепочка:

1. Все зависимые consumers помечаются как **stale** (устаревшие, требующие пересчёта).
2. Реактивный узел \`LView\` вызывает эквивалент \`markViewDirty\` — view помечается «грязной» и пометка идёт **вверх по дереву** компонентов (аналогично привычному \`markForCheck\`).
3. Планировщик change detection (\`ChangeDetectionScheduler\`) ставит задачу на перерисовку.

### Точечность

Ключевое отличие от Zone.js: помечается **только тот компонент**, который реально читал изменившийся сигнал, а не всё дерево целиком. Именно это делает change detection эффективным в zoneless-режиме (без Zone.js).

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count() }} {{ double() }}\`,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → эта view становится dirty, computed пересчитается лениво
}
\`\`\`

Здесь \`double\` — вычисляемый сигнал: он сам пересчитается при следующем чтении, потому что зависит от \`count\`.

### Версионирование

Каждый узел графа хранит \`version\` — счётчик изменений. Перед перерендером Angular сверяет версии и проверяет, **действительно ли** изменилась хоть одна зависимость этой view. Если ничего не поменялось — рендер **пропускается**. Это даёт glitch-free поведение (никаких промежуточных «мусорных» состояний) и минимум лишней работы.

### Следствие

В компоненте, который использует в шаблоне только сигналы, change detection становится почти идеальным: проверяется и обновляется ровно то, что зависит от изменившихся данных, — ничего лишнего. Это и есть конечная цель архитектуры signal-based компонентов вместе с zoneless-подходом.

## ⚠️ Подводные камни

- Точечность работает, только когда шаблон читает **сигналы**. Если данные приходят из обычных полей и мутируются напрямую, «прямого провода» нет — придётся полагаться на \`markForCheck\`/\`OnPush\` вручную.
- Эмиссии/пометки не мгновенны: перерисовку планирует \`ChangeDetectionScheduler\`, а не сам вызов \`set\`.

## 🎯 Запомни

- Чтение сигнала в шаблоне регистрирует view как consumer этого сигнала — образуется прямая связь producer ↔ consumer.
- При \`set\` грязной помечается **только** зависимая view (и путь вверх), а не всё дерево — основа эффективного zoneless CD.
- Версии узлов позволяют пропускать рендер, если по факту ничего не изменилось (glitch-free, минимум работы).`,
      en: `## 🧩 In plain words

Imagine each component is a light bulb and a signal is a switch. Previously (in the Zone.js world) on any "click" Angular walked the **whole** building and checked every bulb to see if it needed repainting. With signals the bulb and the switch are connected by a **direct wire**: flip the right switch and exactly the bulb wired to it updates, and nothing else. Below is how that "wire" is laid under the hood.

### A reactive consumer per view

Each component in Ivy (Angular's rendering engine) has an internal \`LView\` structure — the runtime representation of a specific template instance. When a template **reads a signal** (e.g. \`{{ count() }}\`), the read happens inside that view's **reactive context**. For the duration of that read Angular sets the "current active consumer" to that \`LView\`'s reactive node. A _consumer_ is whoever depends on a value; a _producer_ is whoever supplies it (the signal itself).

### Dependency registration

At read time the signal-producer **records** the current active consumer in its dependency list, and the consumer remembers that producer. This forms a bidirectional link in the dependency graph — exactly the same mechanism as \`computed\` (a derived signal) and \`effect\` (a side effect). That's how the graph learns "who depends on whom".

### What happens on write

When the signal changes (\`count.set(...)\`), a chain fires:

1. All dependent consumers are marked **stale** (out of date, needing recompute).
2. The \`LView\` reactive node invokes the equivalent of \`markViewDirty\` — the view is marked dirty and the mark travels **up the tree** of components (like the familiar \`markForCheck\`).
3. The change detection scheduler (\`ChangeDetectionScheduler\`) schedules a re-render.

### Granularity

The key difference from Zone.js: **only the component** that actually read the changed signal is marked, not the entire tree. This is exactly what makes change detection efficient in zoneless mode (without Zone.js).

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count() }} {{ double() }}\`,
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → this view becomes dirty, computed recomputes lazily
}
\`\`\`

Here \`double\` is a computed signal: it recomputes itself on the next read because it depends on \`count\`.

### Versioning

Each graph node stores a \`version\` — a change counter. Before re-rendering, Angular compares versions and checks whether **any** dependency of this view actually changed. If nothing changed — the render is **skipped**. This gives glitch-free behavior (no intermediate "garbage" states) and minimal extra work.

### Consequence

In a component that reads only signals in its template, change detection becomes nearly ideal: exactly what depends on the changed data is checked and updated — nothing more. This is the end goal of the signal-based component architecture together with the zoneless approach.

## ⚠️ Common pitfalls

- The granularity only works when the template reads **signals**. If data comes from ordinary fields mutated directly, there's no "direct wire" — you fall back to \`markForCheck\`/\`OnPush\` by hand.
- Emissions/marks aren't instant: the re-render is queued by the \`ChangeDetectionScheduler\`, not by the \`set\` call itself.

## 🎯 Key takeaways

- Reading a signal in a template registers the view as a consumer of that signal — a direct producer ↔ consumer link forms.
- On \`set\` **only** the dependent view (and the path upward) is marked dirty, not the whole tree — the basis of efficient zoneless CD.
- Node versions let Angular skip a render when nothing actually changed (glitch-free, minimal work).`,
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
