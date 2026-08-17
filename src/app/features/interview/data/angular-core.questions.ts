import { InterviewQuestion } from '../interfaces/question.interface';

export const ANGULAR_CORE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'ng-001',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['change-detection', 'zone-js', 'internals'],
    question: {
      ru: 'Как Zone.js обеспечивает работу change detection в Angular и что именно он патчит?',
      en: 'How does Zone.js power change detection in Angular, and what exactly does it monkey-patch?',
    },
    answer: {
      ru: `## Коротко

Zone.js — это **вахтёр на всех дверях браузера**. Он подменяет собой асинхронные API (\`setTimeout\`, \`addEventListener\`, \`Promise.then\`, \`fetch\`) и после каждого отработавшего колбэка говорит Angular: «кто-то заходил — сходи проверь, не поменялись ли данные».

Аналогия: вахтёр не знает, что именно принесли в комнаты, он лишь отмечает «дверь открывалась». Поэтому комендант (Angular) обходит **все** комнаты подряд — отсюда и полная проверка дерева компонентов.

## Как это работает по шагам

1. При старте Zone.js делает **monkey-patching**: подменяет глобальные асинхронные функции своими обёртками. Патчатся \`setTimeout\`, \`setInterval\`, \`addEventListener\`, \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\` и другие.
2. Обёртка запоминает, в какой **зоне** (контексте выполнения) была запущена операция, и в этой же зоне потом вызывает колбэк.
3. Angular заводит свою зону — \`NgZone\`, наследника \`Zone\`, и запускает в ней всё приложение.
4. Колбэк отработал, очередь микрозадач опустела — \`NgZone\` эмитит хук \`onMicrotaskEmpty\` (рядом живут \`onStable\` и \`onUnstable\`).
5. Angular подписан на этот хук и вызывает \`ApplicationRef.tick()\` — обход дерева компонентов сверху вниз с change detection.

## Пример

\`\`\`ts
// Так Angular связывает NgZone с change detection
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});

// А так выходим из зоны — tick не запустится
ngZone.runOutsideAngular(() => {
  requestAnimationFrame(() => this.animate());
});
\`\`\`

Почему так: Zone.js **не знает, что именно изменилось** — только что «асинхронщина закончилась». Поэтому CD проверяет всё дерево, а частые тяжёлые события (анимации, mousemove, скролл) выносят из зоны через \`runOutsideAngular\`, чтобы не дёргать tick по 60 раз в секунду.

## Чем это заменяют сегодня

В Angular 17+ доступен **zoneless**-режим: \`provideZonelessChangeDetection()\`. Zone.js не нужен вовсе — change detection триггерят сигналы и \`markForCheck\`. Выигрыш: бандл меньше примерно на 30 КБ, нет overhead на каждом async-вызове, CD точечный вместо «проверим весь мир».

## Что сказать на собеседовании

> Zone.js через monkey-patching подменяет асинхронные API браузера — таймеры, события, промисы, XHR, fetch — чтобы знать, в какой зоне выполняется колбэк. Angular создаёт свою зону \`NgZone\`; когда очередь микрозадач пустеет, \`NgZone\` эмитит \`onMicrotaskEmpty\`, а Angular по этому хуку вызывает \`ApplicationRef.tick()\` и обходит дерево компонентов. Ключевой нюанс: Zone.js сообщает только факт «что-то асинхронное завершилось», а не что изменилось, поэтому проверка идёт по всему дереву. Есть и zoneless-режим через \`provideZonelessChangeDetection()\`, где триггером служат сигналы, а Zone.js вместе со своими ~30 КБ уходит из бандла.

## Ловушки

- **Zone.js не знает, что изменилось.** Он даёт только сигнал «async завершилась», гранулярности нет — поэтому CD полный.
- **Код вне зоны не обновляет UI.** После \`runOutsideAngular\` надо вернуться через \`ngZone.run()\` или вызвать \`markForCheck()\`, иначе экран «замёрзнет».
- **Сторонние библиотеки со своими таймерами** (сокеты, карты, чарты) могут вызывать tick десятки раз в секунду — классическая причина тормозов.
- **Библиотека, захватившая нативный \`setTimeout\` до загрузки Zone.js**, из зоны выпадает — её колбэки CD не запустят.
- **\`onStable\` — не то же самое, что \`onMicrotaskEmpty\`.** Первый означает «работы больше нет вообще», второй — «микрозадачи кончились».
- **В zoneless мутация обычного поля больше не обновляет вид** — нужны сигналы или явный \`markForCheck\`.`,
      en: `## In short

Zone.js is a **doorman standing at every door in the browser**. It replaces the async APIs (\`setTimeout\`, \`addEventListener\`, \`Promise.then\`, \`fetch\`) with its own wrappers, and after every callback finishes it tells Angular: "someone came in — go check whether anything changed".

The analogy: the doorman has no idea what was carried into which room, he only notes "a door opened". So the building manager (Angular) has to walk **every** room — hence the full sweep of the component tree.

## How it works, step by step

1. At startup Zone.js **monkey-patches** the global async functions, swapping them for its own wrappers: \`setTimeout\`, \`setInterval\`, \`addEventListener\`, \`Promise.then\`, \`XMLHttpRequest\`, \`fetch\` and more.
2. The wrapper remembers which **zone** (execution context) the operation was started in and later invokes the callback in that same zone.
3. Angular creates its own zone — \`NgZone\`, a subclass of \`Zone\` — and runs the whole app inside it.
4. A callback finishes, the microtask queue drains, and \`NgZone\` emits the \`onMicrotaskEmpty\` hook (its neighbours are \`onStable\` and \`onUnstable\`).
5. Angular is subscribed to that hook and calls \`ApplicationRef.tick()\` — a top-down walk of the component tree running change detection.

## Example

\`\`\`ts
// This is how Angular wires NgZone to change detection
ngZone.onMicrotaskEmpty.subscribe(() => {
  this.applicationRef.tick();
});

// And this leaves the zone — no tick will run
ngZone.runOutsideAngular(() => {
  requestAnimationFrame(() => this.animate());
});
\`\`\`

Why it works this way: Zone.js **does not know what changed** — only that "the async work is done". So CD checks the whole tree, and high-frequency work (animations, mousemove, scroll) is moved out with \`runOutsideAngular\` so it does not fire a tick 60 times per second.

## What replaces it today

Angular 17+ ships a **zoneless** mode: \`provideZonelessChangeDetection()\`. Zone.js is not needed at all — change detection is triggered by signals and \`markForCheck\`. The payoff: roughly 30 KB less bundle, no overhead on every async call, and targeted CD instead of "check the entire world".

## What to say in the interview

> Zone.js monkey-patches the browser's async APIs — timers, event listeners, promises, XHR, fetch — wrapping them so it knows which zone a callback executes in. Angular creates its own zone, \`NgZone\`, and runs the application inside it; when the microtask queue drains, \`NgZone\` emits \`onMicrotaskEmpty\`, and Angular reacts to that hook by calling \`ApplicationRef.tick()\`, which walks the component tree. The key nuance is that Zone.js only reports "some async work completed", never what actually changed, so the check covers the entire tree — which is exactly why \`OnPush\` and \`runOutsideAngular\` exist as ways to narrow it. Modern Angular also offers zoneless change detection via \`provideZonelessChangeDetection()\`, where signals are the trigger and Zone.js and its ~30 KB drop out of the bundle.

## Gotchas

- **Zone.js does not know what changed.** It only signals "async finished" — no granularity, hence the full CD pass.
- **Code outside the zone does not update the UI.** After \`runOutsideAngular\` you must come back via \`ngZone.run()\` or call \`markForCheck()\`, otherwise the screen freezes.
- **Third-party libraries with their own timers** (sockets, maps, charts) can fire a tick dozens of times per second — a classic performance killer.
- **A library that captured the native \`setTimeout\` before Zone.js loaded** escapes the zone entirely — its callbacks will not trigger CD.
- **\`onStable\` is not the same as \`onMicrotaskEmpty\`.** The first means "there is no work left at all", the second only "microtasks have drained".
- **In zoneless mode mutating a plain field no longer updates the view** — you need signals or an explicit \`markForCheck\`.`,
    },
    codeSnippet: `// How Angular wires NgZone to change detection
ngZone.onMicrotaskEmpty.subscribe(() => {
  appRef.tick(); // top-down CD pass after async work settles
});`,
  },
  {
    id: 'ng-002',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['change-detection', 'onpush'],
    question: {
      ru: 'Как работает стратегия ChangeDetectionStrategy.OnPush и когда компонент с ней проверяется?',
      en: 'How does ChangeDetectionStrategy.OnPush work and when is an OnPush component checked?',
    },
    answer: {
      ru: `## Коротко

При стратегии \`Default\` Angular на каждом tick обходит **все** компоненты и перепроверяет их шаблоны. \`OnPush\` говорит: «меня не трогай, пока я сам не подниму руку».

Аналогия: начальник обходит офис. При \`Default\` он подходит к каждому столу и спрашивает «что нового?». При \`OnPush\` сотрудники сами вешают на стол красный флажок, когда у них что-то поменялось, и начальник заходит **только к ним** — остальные ряды столов он проходит мимо, не заглядывая.

## Когда OnPush-компонент всё-таки проверяется

1. **Пришла новая ссылка в \`@Input()\`.** Сравнение идёт по \`===\`, то есть по ссылке, а не по содержимому.
2. **Сработал event-binding в его шаблоне** — \`(click)\`, \`(input)\` и т.п.
3. **Эмитнул async pipe** внутри шаблона — он сам зовёт \`markForCheck\`.
4. **Кто-то явно вызвал \`ChangeDetectorRef.markForCheck()\`.**
5. **Изменился сигнал, прочитанный в шаблоне** (Angular 16+) — это самый удобный современный триггер.

## Механика «грязного» флага

У каждого компонента есть внутренний флаг. \`markForCheck()\` идёт **вверх** по дереву — от компонента к корню — и помечает всех предков как требующих проверки. Так надо, потому что CD спускается сверху вниз: если родитель считается чистым, до ребёнка проверка просто не дойдёт. Флажок на столе бесполезен, если начальник вообще не зашёл в этот кабинет.

## Пример

\`\`\`ts
// НЕ сработает при OnPush: ссылка на объект та же
this.user.name = 'New';

// Сработает: ссылка новая, === даёт false
this.user = { ...this.user, name: 'New' };
\`\`\`

Почему так: Angular не заглядывает внутрь объекта, он лишь сравнивает старую и новую ссылку. Мутация «на месте» для него невидима — отсюда правило иммутабельности.

## Что сказать на собеседовании

> \`OnPush\` меняет условие проверки: вид перепроверяется не на каждом tick, а только когда помечен грязным. Пометить его может новая ссылка во входном свойстве — сравнение по \`===\`, событие из его шаблона, async pipe, \`markForCheck()\` или изменение сигнала. Технически \`markForCheck\` помечает и всю цепочку предков до корня, потому что change detection идёт сверху вниз. Практический вывод: \`OnPush\` требует иммутабельных данных — мутация полей объекта без смены ссылки обновления не вызовет. В связке с сигналами и zoneless \`OnPush\` стал стандартом: CD пропускает целые поддеревья.

## Ловушки

- **Мутация массива/объекта не обновит вид.** \`arr.push(x)\` — нет; \`this.arr = [...this.arr, x]\` — да.
- **Событие из \`document\`/сторонней библиотеки не помечает компонент** — нужен \`markForCheck()\` или сигнал.
- **\`detectChanges()\` вместо \`markForCheck()\`** проверит только вниз от компонента и не «разбудит» предков.
- **Ленивый \`@Input\` с одинаковой ссылкой** — типичный баг: данные поменяли, а UI старый.
- **OnPush не отменяет проверку целиком**: если компонент помечен грязным, его шаблон проверяется полностью, включая все выражения.
- **Спросят следом**: чем \`markForCheck\` отличается от \`detectChanges\` и как async pipe узнаёт, что надо пометить вид.`,
      en: `## In short

With the \`Default\` strategy Angular walks **every** component on every tick and re-evaluates its template. \`OnPush\` says: "don't bother me until I raise my hand".

The analogy: a manager walking the office. Under \`Default\` he stops at every desk and asks "anything new?". Under \`OnPush\` people put a red flag on their desk when something changed, and he only visits **those** desks — the rest of the rows he walks straight past.

## When an OnPush component does get checked

1. **A new reference arrives in an \`@Input()\`.** The comparison is \`===\` — by reference, not by content.
2. **An event binding fires in its own template** — \`(click)\`, \`(input)\` and friends.
3. **An async pipe inside the template emits** — it calls \`markForCheck\` for you.
4. **Someone calls \`ChangeDetectorRef.markForCheck()\` explicitly.**
5. **A signal read in the template changes** (Angular 16+) — the most convenient modern trigger.

## The dirty-flag mechanics

Every component carries an internal flag. \`markForCheck()\` walks **up** the tree — from the component to the root — marking every ancestor as needing a check. That is required because CD descends top-down: if a parent is considered clean, the check never reaches the child. A flag on the desk is useless if the manager never enters that room.

## Example

\`\`\`ts
// Won't fire under OnPush: same object reference
this.user.name = 'New';

// Will fire: new reference, === returns false
this.user = { ...this.user, name: 'New' };
\`\`\`

Why: Angular never looks inside the object, it only compares the old and new reference. An in-place mutation is invisible to it — hence the immutability rule.

## What to say in the interview

> \`OnPush\` changes the condition under which a component is checked: instead of being re-evaluated on every tick, the view is only re-checked when it has been marked dirty. It gets marked by a new reference in an input — the comparison is \`===\` — by an event fired from its own template, by an async pipe emitting, by an explicit \`markForCheck()\`, or by a signal read in the template changing. Technically \`markForCheck\` marks not just the component but the whole ancestor chain up to the root, because change detection runs top-down and would otherwise never descend into that subtree. The practical consequence is that \`OnPush\` requires immutable data — mutating fields of an object without changing the reference will not refresh anything. Combined with signals and zoneless change detection, \`OnPush\` effectively becomes the default, because it lets CD skip entire subtrees.

## Gotchas

- **Mutating an array or object won't refresh the view.** \`arr.push(x)\` — no; \`this.arr = [...this.arr, x]\` — yes.
- **Events from \`document\` or a third-party library don't mark the component** — you need \`markForCheck()\` or a signal.
- **Using \`detectChanges()\` instead of \`markForCheck()\`** only checks downward from the component and never wakes the ancestors.
- **An input receiving the same reference again** is the classic bug: the data changed but the UI is stale.
- **OnPush does not make the check partial**: once the component is dirty its whole template is evaluated, every expression included.
- **Expect the follow-up**: how \`markForCheck\` differs from \`detectChanges\`, and how the async pipe knows to mark the view.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['change-detection', 'change-detector-ref'],
    question: {
      ru: 'В чём разница между markForCheck(), detectChanges(), detach() и reattach() у ChangeDetectorRef?',
      en: 'What is the difference between markForCheck(), detectChanges(), detach() and reattach() on ChangeDetectorRef?',
    },
    answer: {
      ru: `## Коротко

Это четыре разные кнопки на пульте change detection. Две из них про **время** проверки, две — про **участие** компонента в проверке вообще.

Аналогия с офисом: \`markForCheck()\` — поставить флажок «зайдите ко мне, когда будете обходить» (начальник придёт позже). \`detectChanges()\` — самому позвать начальника прямо сейчас, и он проверит вас и весь ваш отдел. \`detach()\` — вычеркнуть себя из списка обхода совсем. \`reattach()\` — вернуться в список.

## Что делает каждый метод

1. **\`markForCheck()\`** — CD не запускает. Помечает компонент и **всех его предков** до корня как «грязные», чтобы на ближайшем tick до них дошли. Идёт **вверх** по дереву. Нужен при \`OnPush\`, когда данные пришли асинхронно вне Angular-зоны или мимо цепочки входных свойств.
2. **\`detectChanges()\`** — запускает CD **синхронно и немедленно** для этого компонента и его **потомков**. Идёт **вниз**, предков не трогает.
3. **\`detach()\`** — полностью **отсоединяет** компонент от дерева CD. Angular перестаёт его проверять даже при tick. Для тяжёлых вьюх с собственным контролем обновления: дашборды на тысячи строк, гриды, графики.
4. **\`reattach()\`** — возвращает отсоединённый компонент обратно в дерево CD.

## Пример

\`\`\`ts
private cdr = inject(ChangeDetectorRef);

constructor() {
  this.cdr.detach(); // выключаем автоматические проверки
}

ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();
    this.cdr.detectChanges(); // обновляем ровно тогда, когда решили сами
  }, 1000);
}
\`\`\`

Почему так: компонент считает тяжёлое состояние сам и хочет рисоваться раз в секунду, а не на каждый чужой tick. \`detach\` + \`detectChanges\` дают полный ручной контроль.

## Ключевое различие в одну строку

- \`markForCheck\` — «проверь меня **позже**, на следующем tick» → идёт **вверх**.
- \`detectChanges\` — «проверь меня **сейчас**» → идёт **вниз**.

## Что сказать на собеседовании

> \`markForCheck\` не запускает change detection, а помечает текущий вид и всех его предков грязными, чтобы ближайший tick до них дошёл — это основной инструмент при \`OnPush\`. \`detectChanges\` наоборот синхронно проверяет сам компонент и его потомков, не касаясь предков. \`detach\` вырезает вид из дерева CD, так что даже \`ApplicationRef.tick()\` его не проверит, а \`reattach\` возвращает обратно. Нюанс: \`detectChanges\` опасно вызывать посреди уже идущего цикла CD — в dev-режиме легко получить \`ExpressionChangedAfterItHasBeenCheckedError\`. В мире сигналов эти вызовы нужны реже: сигнал, прочитанный в шаблоне, помечает вид грязным сам.

## Ловушки

- **\`detectChanges\` не будит предков** — если родитель \`OnPush\` и чист, ваши изменения выше по дереву не отразятся.
- **\`detectChanges\` внутри идущего CD** — прямой путь к \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **Забыли \`reattach\`** — компонент навсегда «мёртвый», данные меняются, экран стоит.
- **\`detach\` не останавливает подписки и таймеры** — он выключает только проверку шаблона.
- **\`markForCheck\` не помогает, если tick никто не запустит** (zoneless или \`runOutsideAngular\`) — там нужен \`ngZone.run()\` или сигнал.
- **Спросят следом**: чем \`ApplicationRef.tick()\` отличается от \`detectChanges()\` и почему \`markForCheck\` идёт именно вверх.`,
      en: `## In short

These are four different buttons on the change detection remote. Two are about **when** the check happens, two about **whether** the component takes part in it at all.

Office analogy: \`markForCheck()\` puts a flag on your desk saying "drop by when you do your round" — the manager comes later. \`detectChanges()\` calls the manager over right now, and he checks you and your whole team. \`detach()\` removes you from the round entirely. \`reattach()\` puts you back on the list.

## What each method does

1. **\`markForCheck()\`** — does not run CD. It marks the component **and all its ancestors** up to the root as dirty so the next tick reaches them. It walks **up** the tree. Needed with \`OnPush\` when data arrives asynchronously outside the Angular zone or bypasses the input chain.
2. **\`detectChanges()\`** — runs CD **synchronously and immediately** for this component and its **descendants**. It walks **down**, never touching ancestors.
3. **\`detach()\`** — completely **detaches** the component from the CD tree. Angular stops checking it, even on a tick. Used for heavy views with their own update control: dashboards with thousands of rows, grids, charts.
4. **\`reattach()\`** — puts a detached component back into the CD tree.

## Example

\`\`\`ts
private cdr = inject(ChangeDetectorRef);

constructor() {
  this.cdr.detach(); // turn off automatic checks
}

ngOnInit() {
  setInterval(() => {
    this.computeHeavyState();
    this.cdr.detectChanges(); // refresh exactly when we decide to
  }, 1000);
}
\`\`\`

Why: the component computes heavy state itself and wants to repaint once a second, not on every unrelated tick. \`detach\` + \`detectChanges\` give full manual control.

## The key distinction in one line

- \`markForCheck\` — "check me **later**, on the next tick" → walks **up**.
- \`detectChanges\` — "check me **now**" → walks **down**.

## What to say in the interview

> \`markForCheck\` does not run change detection; it marks the current view and its whole ancestor chain as dirty so the next tick will reach them — it is the main tool under \`OnPush\`. \`detectChanges\`, by contrast, runs the check synchronously and immediately for the component and its descendants, leaving ancestors untouched. \`detach\` removes the view from the change detection tree altogether, so even \`ApplicationRef.tick()\` skips it — that is used for heavy views that refresh themselves manually — and \`reattach\` puts them back. A nuance: calling \`detectChanges\` in the middle of an ongoing CD cycle is risky and easily produces \`ExpressionChangedAfterItHasBeenCheckedError\` in dev mode. In the signals world these manual calls are needed far less often, because a signal read in the template marks the view dirty by itself.

## Gotchas

- **\`detectChanges\` never wakes ancestors** — if the parent is \`OnPush\` and clean, your change won't show up higher in the tree.
- **\`detectChanges\` during an ongoing CD** is the direct route to \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **Forgetting \`reattach\`** leaves the component permanently dead: data changes, screen doesn't.
- **\`detach\` does not stop subscriptions or timers** — it only disables template checking.
- **\`markForCheck\` is useless if nothing triggers a tick** (zoneless, or inside \`runOutsideAngular\`) — there you need \`ngZone.run()\` or a signal.
- **Expect the follow-up**: how \`ApplicationRef.tick()\` differs from \`detectChanges()\`, and why \`markForCheck\` walks upward specifically.`,
    },
    codeSnippet: `// markForCheck: schedule, walks UP. detectChanges: run now, walks DOWN.
this.cdr.markForCheck();   // check me on the next tick
this.cdr.detectChanges();  // check me and my children synchronously
this.cdr.detach();         // remove from CD tree entirely
this.cdr.reattach();       // put it back`,
  },
  {
    id: 'ng-004',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['change-detection', 'expressionchanged', 'debugging'],
    question: {
      ru: 'Почему возникает ошибка ExpressionChangedAfterItHasBeenCheckedError и как её правильно устранять?',
      en: 'Why does the ExpressionChangedAfterItHasBeenCheckedError occur and how do you fix it properly?',
    },
    answer: {
      ru: `## Коротко

В dev-режиме Angular проверяет шаблон **дважды**: первый проход применяет значения, второй сверяет, что за это время ничего не изменилось. Если во втором проходе значение другое — летит \`ExpressionChangedAfterItHasBeenCheckedError\`.

Аналогия: вы сдали контрольную, преподаватель её проверил, а вы дописали ответ в уже проверенную работу. Преподаватель сверяет второй раз, видит расхождение и говорит: «так нельзя, работа уже проверена». Это не придирка, а защита однонаправленного потока данных.

## Как это происходит по шагам

1. Angular запускает проход CD и записывает в DOM то, что вернули выражения шаблона.
2. Сразу после этого в **dev-сборке** он делает контрольный проход и заново вычисляет те же выражения.
3. Сравнивает старое значение с новым.
4. Значения совпали — всё хорошо, кадр стабилен.
5. Значения разошлись — значит, кто-то поменял состояние уже **после** проверки вида, и Angular бросает ошибку.

## Откуда это обычно берётся

- Изменение свойства в \`ngAfterViewInit\` — вид на этот момент уже проверен.
- Родитель задаёт состояние ребёнку, а ребёнок тут же меняет его обратно.
- Геттер в шаблоне, возвращающий **новый объект каждый раз**: \`new Date()\`, \`[...arr]\`, \`{ a: 1 }\` — по \`===\` они всегда разные.

## Пример

\`\`\`ts
// Плохо: меняем значение сразу после проверки вида
ngAfterViewInit() {
  this.label = this.computeLabel(); // ExpressionChanged...
}

// Хорошо: сдвигаем изменение в следующую микрозадачу
ngAfterViewInit() {
  Promise.resolve().then(() => (this.label = this.computeLabel()));
}
\`\`\`

Почему так: микрозадача выполняется уже **после** завершения текущего цикла CD, поэтому изменение попадает в следующий проход, а не ломает текущий. Ещё варианты: перенести логику в \`ngOnInit\`, перейти на сигналы (они откладывают чтение и снимают большинство таких ошибок) или убрать из шаблона геттеры, возвращающие новые ссылки.

## Что сказать на собеседовании

> Это ошибка dev-режима: после основного прохода change detection Angular делает контрольный и сверяет, что значения, прочитанные в шаблоне, не изменились. Если состояние поменялось уже после проверки вида — например в \`ngAfterViewInit\` или в геттере, каждый раз возвращающем новую ссылку, — Angular бросает \`ExpressionChangedAfterItHasBeenCheckedError\`. Лечить надо причину: перенести изменение в более ранний хук или перейти на сигналы; глушить \`detectChanges()\` — маскировка. В production-сборке этой проверки нет, ошибка не бросается, но сам баг — рассинхронизированный UI — остаётся.

## Ловушки

- **В production ошибки не будет — баг будет.** Отсутствие исключения не значит, что всё исправлено.
- **\`detectChanges()\` как «фикс»** просто прячет симптом и добавляет лишний проход CD.
- **\`new Date()\` или \`[...arr]\` прямо в шаблоне** — гарантированный источник: каждая проверка даёт новую ссылку.
- **Двусторонняя правка между родителем и ребёнком** — самый частый реальный случай.
- **Ошибка часто указывает не на тот компонент**, где настоящая причина: смотреть надо на того, кто пишет значение.
- **Сигналы снимают большую часть таких ошибок**, но не все — эффект, который синхронно правит состояние, тоже способен их вызвать.`,
      en: `## In short

In dev mode Angular checks the template **twice**: the first pass applies the values, the second verifies nothing changed in between. If the second pass sees a different value, you get \`ExpressionChangedAfterItHasBeenCheckedError\`.

The analogy: you hand in an exam, the teacher grades it, and then you scribble an extra answer onto the already-graded paper. The teacher re-checks, spots the mismatch and says "not allowed — this was already marked". It is not pedantry; it protects the unidirectional data flow.

## How it happens, step by step

1. Angular runs a CD pass and writes into the DOM whatever the template expressions returned.
2. Immediately after, in a **dev build**, it runs a verification pass and re-evaluates the same expressions.
3. It compares the old value with the new one.
4. They match — good, the frame is stable.
5. They differ — meaning something mutated state **after** the view was checked, so Angular throws.

## Where it usually comes from

- Changing a property in \`ngAfterViewInit\` — the view is already checked by then.
- A parent sets state on a child and the child immediately changes it back.
- A template getter that returns a **new object every time**: \`new Date()\`, \`[...arr]\`, \`{ a: 1 }\` — under \`===\` those are always different.

## Example

\`\`\`ts
// Bad: mutating right after the view was checked
ngAfterViewInit() {
  this.label = this.computeLabel(); // ExpressionChanged...
}

// Good: push the change into the next microtask
ngAfterViewInit() {
  Promise.resolve().then(() => (this.label = this.computeLabel()));
}
\`\`\`

Why: a microtask runs **after** the current CD cycle finishes, so the change lands in the next pass instead of breaking the current one. Other options: move the logic to \`ngOnInit\`, switch to signals (they defer reads and remove most of these errors), or drop template getters that return fresh references.

## What to say in the interview

> It is a dev-mode assertion: after the main change detection pass Angular runs a verification pass and checks that the values read in the template have not changed. If state was mutated after the view was checked — in \`ngAfterViewInit\`, or a parent and child bouncing the same value back and forth, or a template calling a getter that returns a new reference each time — Angular throws \`ExpressionChangedAfterItHasBeenCheckedError\`. It guards the unidirectional data flow: within one cycle a value must settle. The right fix targets the cause: move the change to an earlier hook, defer it into a microtask, remove new-reference expressions from the template, or move to signals; slapping a \`detectChanges()\` on it only masks the symptom. The important nuance is that production builds skip this check entirely — no exception is thrown, but the underlying bug, a flickering or out-of-sync UI, is still there.

## Gotchas

- **Production won't throw — but the bug is still there.** No exception does not mean it is fixed.
- **\`detectChanges()\` as a "fix"** merely hides the symptom and adds an extra CD pass.
- **\`new Date()\` or \`[...arr]\` straight in the template** guarantees it: every check yields a new reference.
- **Two-way edits between parent and child** are the most common real-world case.
- **The error often points at the wrong component** — look at whoever writes the value, not where it is displayed.
- **Signals remove most of these errors, not all** — an effect that synchronously rewrites state can still cause one.`,
    },
    codeSnippet: `// Defer the change out of the just-checked pass
ngAfterViewInit() {
  Promise.resolve().then(() => (this.label = this.computeLabel()));
}`,
  },
  {
    id: 'ng-005',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['signals', 'computed', 'internals'],
    question: {
      ru: 'Как устроен граф зависимостей сигналов и что значит "glitch-free" распространение?',
      en: 'How is the signal dependency graph built and what does "glitch-free" propagation mean?',
    },
    answer: {
      ru: `## Коротко

Сигналы — это **направленный граф зависимостей**. \`signal()\` — источник (producer), \`computed()\` и \`effect()\` — потребители (consumers), которые сами запоминают, какие сигналы они прочитали во время выполнения. Меняется источник — все зависящие узлы помечаются «устаревшими» (stale), но **не пересчитываются сразу**.

Аналогия: доска объявлений в подъезде. Кто-то поменял график вывоза мусора — все, кто на него ссылался, получают пометку «моя бумажка протухла». Но переписывать свои объявления они будут только тогда, когда кто-то реально придёт их читать.

## Как это работает по шагам

1. Вы вызываете \`computed(() => a() + b())\`. Во время выполнения функции Angular записывает, какие сигналы были прочитаны, — так строятся рёбра графа.
2. Вы делаете \`a.set(5)\`. Это **push**: по графу вниз бежит пометка «stale» по всем зависимым узлам.
3. Никаких вычислений при этом не происходит — только расстановка флажков. Это дёшево.
4. Кто-то читает \`c()\`. Это **pull**: узел просыпается и спрашивает у своих источников — «вы правда изменились?».
5. У каждого узла есть счётчик **версии**. Если версии источников те же, что были при прошлом вычислении, \`computed\` **отдаёт закэшированное** значение и не пересчитывается вовсе.
6. Если хоть один источник реально изменился — функция выполняется заново, результат кэшируется, версия обновляется.

## Что такое glitch-free

**Glitch** — это промежуточное **некорректное** состояние, когда потребитель видит частично обновлённый набор зависимостей. Классический случай: \`c = a + b\`, где \`b\` сам выведен из \`a\`. Наивная реализация пересчитала бы \`c\` дважды: сначала с новым \`a\` и старым \`b\` (это и есть «глитч» — числа не из одного мира), потом ещё раз с обновлённым \`b\`.

Angular гарантирует glitch-free: ленивый pull плюс версионирование означают, что \`computed\` всегда читает **согласованный снимок** и пересчитывается **ровно один раз** на каждое реальное изменение.

## Пример

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // всегда согласован

a.set(5);
c(); // 15 — не 11 и не два пересчёта подряд
\`\`\`

Почему так: \`c\` не считается в момент \`a.set(5)\`. Пересчёт откладывается до чтения, и к этому моменту \`b\` уже тоже успевает подтянуть новое значение — промежуточное \`5 + 2\` наружу не выходит никогда.

## Что сказать на собеседовании

> Сигналы образуют направленный граф: \`signal\` — producer, \`computed\` и \`effect\` — consumers, регистрирующие прочитанные зависимости во время выполнения. Модель гибридная, push/pull: запись в сигнал только помечает зависимые узлы как stale, а перевычисление \`computed\` происходит лениво, в момент чтения. У каждого узла есть версия, поэтому \`computed\` мемоизирован: если версии источников не изменились, вернётся закэшированное значение. Отсюда glitch-free-гарантия: потребитель не видит промежуточного несогласованного состояния и пересчитывается ровно один раз на реальное изменение.

## Ловушки

- **Запись в сигнал ничего не вычисляет** — она только расставляет флаги. Если \`computed\` никто не читает, его функция не выполнится никогда.
- **\`computed\` должен быть чистым.** Побочные эффекты внутри выполнятся непредсказуемое число раз или не выполнятся вовсе.
- **Условное чтение меняет граф.** \`computed(() => flag() ? x() : y())\` в каждый момент зависит только от реально прочитанных сигналов — набор рёбер динамический.
- **\`set\` с тем же значением** по умолчанию не распространяет изменение: у сигналов есть проверка равенства (по умолчанию \`Object.is\`).
- **Мутация объекта внутри сигнала** не меняет его версию — нужна новая ссылка через \`set\`/\`update\`.
- **\`effect\` не синхронен** — сразу после \`set\` он ещё не отработал; в тестах это лечится \`TestBed.flushEffects()\` или \`await\`.`,
      en: `## In short

Signals form a **directed dependency graph**. \`signal()\` is the producer; \`computed()\` and \`effect()\` are consumers that record for themselves which signals they read while running. When a producer changes, every dependent node is marked "stale" — but **nothing recomputes right away**.

The analogy: a notice board in a building lobby. Somebody updates the rubbish collection schedule, and every notice that referenced it gets a "mine is out of date" sticker. But those notices only get rewritten when someone actually comes to read them.

## How it works, step by step

1. You call \`computed(() => a() + b())\`. While the function runs Angular records which signals were read — that is how the graph edges are built.
2. You call \`a.set(5)\`. That is the **push** half: a "stale" mark propagates down the graph to every dependent node.
3. No computation happens here — only flags get set. That is cheap.
4. Somebody reads \`c()\`. That is the **pull** half: the node wakes up and asks its sources "did you really change?".
5. Every node carries a **version** counter. If the source versions are the same as at the last computation, the \`computed\` **returns its cached value** and does not re-run at all.
6. If at least one source genuinely changed, the function re-executes, the result is cached and the version bumps.

## What glitch-free means

A **glitch** is an intermediate **incorrect** state in which a consumer sees a partially updated set of dependencies. The classic case: \`c = a + b\` where \`b\` itself derives from \`a\`. A naive implementation would recompute \`c\` twice: first with the new \`a\` and the stale \`b\` — that is the glitch, two numbers from different worlds — and then again once \`b\` catches up.

Angular guarantees glitch-free behaviour: lazy pull plus versioning means a \`computed\` always reads a **consistent snapshot** and recomputes **exactly once** per real change.

## Example

\`\`\`ts
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // always consistent

a.set(5);
c(); // 15 — never 11, and never two recomputations in a row
\`\`\`

Why: \`c\` is not computed at the moment of \`a.set(5)\`. The recomputation is deferred until the read, and by then \`b\` has picked up its new value too — the intermediate \`5 + 2\` never escapes.

## What to say in the interview

> Signals form a directed graph: \`signal\` is the producer, \`computed\` and \`effect\` are consumers that automatically register the dependencies they read at execution time. The model is hybrid push/pull: writing a signal only marks dependent nodes stale and propagates down the graph, while the actual recomputation of a \`computed\` happens lazily, at read time. Each node carries a version counter, so \`computed\` is memoized: if source versions have not changed it returns the cached value without invoking the function. That is where the glitch-free guarantee comes from — a consumer never observes an intermediate inconsistent state where some dependencies updated and others did not, and it recomputes exactly once per real change. \`effect\` meanwhile runs asynchronously at the end of the change detection cycle, batching several changes into a single run — part of the same design.

## Gotchas

- **Writing a signal computes nothing** — it only sets flags. If nobody reads a \`computed\`, its function never runs.
- **A \`computed\` must be pure.** Side effects inside it will run an unpredictable number of times, or never.
- **Conditional reads reshape the graph.** \`computed(() => flag() ? x() : y())\` depends only on the signals actually read at that moment — the edge set is dynamic.
- **\`set\` with the same value** does not propagate by default: signals have an equality check (\`Object.is\` by default).
- **Mutating an object held in a signal** does not bump its version — you need a new reference via \`set\`/\`update\`.
- **\`effect\` is not synchronous** — right after a \`set\` it has not run yet; in tests use \`TestBed.flushEffects()\` or await.`,
    },
    codeSnippet: `const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => a() + b()); // recomputes exactly once, never glitches
a.set(5);
c(); // 15, consistent snapshot`,
  },
  {
    id: 'ng-006',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['signals', 'effect', 'computed'],
    question: {
      ru: 'Когда использовать computed, а когда effect? Какие подводные камни у effect?',
      en: 'When should you use computed versus effect, and what are the pitfalls of effect?',
    },
    answer: {
      ru: `## Коротко

\`computed\` **вычисляет значение**, \`effect\` **что-то делает**. Первый отвечает на вопрос «сколько получится», второй — «что сделать, когда изменилось».

Аналогия: \`computed\` — это формула в ячейке Excel: она ничего не меняет в мире, просто показывает результат, и пересчитывается сама. \`effect\` — это макрос «когда сумма изменилась, отправь письмо бухгалтеру». Формул может быть сколько угодно, а письма лучше слать пореже и осознанно.

## Как выбрать

1. **Нужно новое значение из существующих сигналов?** Берём \`computed\`. Оно чистое, мемоизированное, ленивое, без побочных эффектов.
2. **Нужно что-то сделать во внешнем мире?** Берём \`effect\`: логирование, запись в \`localStorage\`, ручная работа с DOM, вызов сторонней библиотеки, аналитика.
3. **Хотите записать сигнал в ответ на другой сигнал?** Почти всегда это должен быть \`computed\` или \`linkedSignal\`, а не \`effect\`.
4. **Правило одной фразы**: \`effect\` — это дверь **наружу** из реактивного мира. Всё, что остаётся внутри реактивного графа, делается через \`computed\`.

## Подводные камни effect

- **Писать в сигналы по умолчанию нельзя**: запись внутри effect кидает ошибку — это защита от бесконечного цикла. Раньше разрешалось флагом \`allowSignalWrites\` (в новых версиях устарел); правильнее переосмыслить дизайн через \`computed\`/\`linkedSignal\`.
- **Контекст инъекции**: effect создаётся в injection-контексте — в конструкторе, в инициализаторе поля или с явно переданным \`injector\`. Иначе ошибка.
- **Очистка**: effect получает \`onCleanup\`, чтобы снять подписку или таймер **перед следующим запуском** и при уничтожении.
- **Тайминг**: effect выполняется асинхронно, после change detection, а не синхронно в момент записи в сигнал.

## Пример

\`\`\`ts
// Производное значение — computed
const fullName = computed(() => first() + ' ' + last());

// Побочный эффект — effect, с обязательной уборкой
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

Почему так: \`fullName\` никого не трогает и пересчитается только когда его прочитают. А интервал — это внешний ресурс, и без \`onCleanup\` при каждом перезапуске эффекта появлялся бы новый таймер, а старый продолжал бы тикать.

## Что сказать на собеседовании

> \`computed\` — это производное значение: чистое, ленивое и мемоизированное, пересчитывается только при чтении и только если реально изменился источник. \`effect\` — это побочный эффект, мост наружу: логирование, синхронизация с хранилищем, ручной DOM. Ключевое правило: если внутри \`effect\` хочется записать сигнал, нужен \`computed\` или \`linkedSignal\` — запись сигналов в эффекте по умолчанию запрещена из-за риска бесконечного цикла. Из нюансов: эффект создают в injection-контексте либо передают \`injector\` явно, он получает \`onCleanup\` для снятия подписок и выполняется асинхронно после change detection.

## Ловушки

- **\`effect\` как замена \`computed\`** — самая частая ошибка: получаете лишнее состояние, гонки и лишние прогоны.
- **Забыли \`onCleanup\`** — утечки: подписки и таймеры множатся на каждый перезапуск.
- **Создали effect в \`ngOnInit\` без \`injector\`** — ошибка про injection context.
- **Ждёте, что effect отработает сразу после \`set\`** — он асинхронный, в тестах нужен flush.
- **Читаете сигнал в effect условно** — зависимость зарегистрируется только если ветка реально выполнилась, и эффект перестанет срабатывать.
- **Спросят следом**: чем \`effect\` отличается от подписки на Observable и зачем понадобился \`linkedSignal\`.`,
      en: `## In short

\`computed\` **calculates a value**, \`effect\` **does something**. The first answers "what is the result", the second answers "what should happen when it changes".

The analogy: \`computed\` is a formula in a spreadsheet cell — it changes nothing in the world, it just shows a result and recalculates itself. \`effect\` is the macro "when the total changes, email the accountant". You can have as many formulas as you like; emails you want few and deliberate.

## How to choose

1. **Need a new value derived from existing signals?** Use \`computed\`. It is pure, memoized, lazy, side-effect-free.
2. **Need to touch the outside world?** Use \`effect\`: logging, writing to \`localStorage\`, manual DOM work, calling a third-party library, analytics.
3. **Want to write a signal in response to another signal?** That should almost always be a \`computed\` or a \`linkedSignal\`, not an \`effect\`.
4. **One-sentence rule**: \`effect\` is the door **out** of the reactive world. Anything that stays inside the reactive graph belongs in a \`computed\`.

## Pitfalls of effect

- **Writing to signals is disallowed by default**: a write inside an effect throws — a guard against infinite loops. It used to be permitted via the \`allowSignalWrites\` flag (deprecated in newer versions); the better move is to rethink the design with \`computed\`/\`linkedSignal\`.
- **Injection context**: an effect must be created in an injection context — a constructor, a field initializer, or with an explicitly passed \`injector\`. Otherwise it errors.
- **Cleanup**: an effect receives \`onCleanup\` to cancel subscriptions or timers **before the next run** and on destroy.
- **Timing**: an effect runs asynchronously, after change detection — not synchronously at the moment of the signal write.

## Example

\`\`\`ts
// Derived value — computed
const fullName = computed(() => first() + ' ' + last());

// Side effect — effect, with mandatory cleanup
effect((onCleanup) => {
  const id = setInterval(() => log(count()), 1000);
  onCleanup(() => clearInterval(id));
});
\`\`\`

Why: \`fullName\` touches nothing and only recomputes when it is read. The interval, on the other hand, is an external resource — without \`onCleanup\` every re-run would spawn a new timer while the old one kept ticking.

## What to say in the interview

> \`computed\` is a derived value: pure, lazy and memoized, it recomputes only on read and only if one of its sources genuinely changed. \`effect\` is a side effect, the bridge out of the reactive world: logging, syncing to storage, manual DOM work, integrating third-party libraries. The key rule is that if you want to write a signal inside an \`effect\`, you almost certainly need a \`computed\` or a \`linkedSignal\` — signal writes inside effects are disallowed by default precisely because of the infinite-loop risk. Practical nuances: an effect must be created in an injection context or be given an \`injector\` explicitly, it receives \`onCleanup\` to tear down timers and subscriptions before the next run and on destroy, and it runs asynchronously after change detection rather than synchronously on the write.

## Gotchas

- **Using \`effect\` where \`computed\` belongs** is the most common mistake: you get duplicated state, races and extra runs.
- **Forgetting \`onCleanup\`** leaks: subscriptions and timers pile up on every re-run.
- **Creating an effect in \`ngOnInit\` without an \`injector\`** throws the injection-context error.
- **Expecting the effect to run right after a \`set\`** — it is asynchronous; tests need a flush.
- **Reading a signal conditionally inside an effect** registers the dependency only if that branch actually ran, so the effect can silently stop firing.
- **Expect the follow-up**: how \`effect\` differs from subscribing to an Observable, and why \`linkedSignal\` was introduced.`,
    },
    codeSnippet: `effect((onCleanup) => {
  const id = setInterval(() => save(state()), 1000);
  onCleanup(() => clearInterval(id)); // runs before next execution / on destroy
});`,
  },
  {
    id: 'ng-007',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['signals', 'zoneless', 'change-detection'],
    question: {
      ru: 'Как работает zoneless change detection и как сигналы триггерят обновление без Zone.js?',
      en: 'How does zoneless change detection work and how do signals trigger updates without Zone.js?',
    },
    answer: {
      ru: `## Коротко

Zoneless — это режим (\`provideZonelessChangeDetection()\`), в котором Angular обходится **без Zone.js**. Вместо «случилось что-то асинхронное — проверим всё дерево» фреймворк точно знает, **какие именно** вьюхи нуждаются в обновлении.

Аналогия: раньше был вахтёр, который на любой хлопок двери гнал коменданта обходить весь дом. Теперь в каждой комнате стоит кнопка вызова: нажали в трёх комнатах — комендант сходит ровно в эти три, и не тридцать раз, а один — все нажатия за короткий промежуток он обслужит за один обход.

## Как это работает по шагам

1. Шаблон компонента при рендере читает сигналы. Каждое такое чтение связывает сигнал с \`LView\` компонента через **reactive consumer**.
2. Кто-то делает \`set\`/\`update\` у сигнала.
3. Consumer срабатывает и вызывает \`markViewDirty\` — вид и цепочка его предков помечаются грязными.
4. Angular не бежит рендерить сразу: он **планирует** проход через \`ChangeDetectionScheduler\` (микрозадача плюс механизм уровня \`requestAnimationFrame\`).
5. Несколько изменений, случившихся в одном тике, **схлопываются (coalescing)** в один проход CD.
6. Проход выполняется и обновляет только помеченные вьюхи.

Помечают вид грязным: изменение **сигнала**, прочитанного в шаблоне; срабатывание event-listener в шаблоне; \`markForCheck()\`; эмит \`AsyncPipe\`; установка нового значения signal-input.

## Пример

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

Почему так: после этого в бандле нет Zone.js, а единственным «звонком» для change detection становится реактивность — сигналы и явные пометки вида.

## Что меняется для разработчика

- Код, мутирующий состояние **вне сигналов** (обычные поля класса), больше **не** вызывает CD автоматически — нужны сигналы или явный \`markForCheck()\`.
- \`setTimeout\` и \`Promise.then\` сами по себе CD не запускают.
- Бандл меньше (нет ~30 КБ Zone.js), overhead на асинхронных вызовах исчезает, CD становится точечным и предсказуемым.
- \`OnPush\` де-факто становится нормой, а не оптимизацией.

## Что сказать на собеседовании

> В zoneless-режиме Angular не использует Zone.js: change detection триггерит сама реактивность. Сигнал, прочитанный в шаблоне, связывается с \`LView\` через reactive consumer; при записи в сигнал consumer вызывает \`markViewDirty\`, а \`ChangeDetectionScheduler\` планирует проход и схлопывает несколько изменений одного тика в один. Практическое следствие: мутация обычного поля класса больше не обновляет вид, а \`setTimeout\` и промисы сами по себе CD не запускают — состояние держат в сигналах. Включается через \`provideZonelessChangeDetection()\`; выигрыш — минус ~30 КБ бандла и точечный CD. Появился как developer preview в Angular 18.

## Ловушки

- **Обычное поле вместо сигнала** — экран не обновится, и это будет выглядеть как «Angular сломался».
- **Сторонние библиотеки, менявшие состояние через свои колбэки**, перестают обновлять UI — их надо заворачивать в сигналы или \`markForCheck\`.
- **Тесты на \`fakeAsync\`/\`tick\`** заточены под зону; в zoneless тестах нужен другой подход к ожиданию стабилизации.
- **\`NgZone.onStable\` и \`runOutsideAngular\`** в zoneless теряют прежний смысл — код на них ломается.
- **Coalescing не значит «медленнее»**: несколько \`set\` подряд — один проход, но и один кадр; синхронного обновления DOM сразу после \`set\` ждать не стоит.
- **Спросят следом**: как zoneless соотносится с \`OnPush\` и что произойдёт с приложением, где состояние хранится в обычных полях.`,
      en: `## In short

Zoneless is the mode (\`provideZonelessChangeDetection()\`) in which Angular runs **without Zone.js**. Instead of "something async happened, let's check the whole tree", the framework knows exactly **which** views need updating.

The analogy: there used to be a doorman who sent the manager on a full building round every time any door slammed. Now each room has a call button: three rooms press it, the manager visits exactly those three — and not thirty times but once, because all the presses in a short window are served by a single round.

## How it works, step by step

1. While rendering, a component's template reads signals. Each such read links the signal to the component's \`LView\` through a **reactive consumer**.
2. Somebody calls \`set\`/\`update\` on a signal.
3. The consumer fires and calls \`markViewDirty\` — the view and its ancestor chain are marked dirty.
4. Angular does not render immediately: it **schedules** a pass via the \`ChangeDetectionScheduler\` (a microtask plus a \`requestAnimationFrame\`-level mechanism).
5. Several changes that happen within the same tick are **coalesced** into a single CD pass.
6. The pass runs and refreshes only the marked views.

What marks a view dirty: a change to a **signal** read in the template, a template event listener firing, \`markForCheck()\`, an \`AsyncPipe\` emission, and a new value set on a signal input.

## Example

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
\`\`\`

Why: after this there is no Zone.js in the bundle, and the only "doorbell" for change detection is reactivity itself — signals and explicit view marking.

## What changes for the developer

- Code mutating state **outside signals** (plain class fields) no longer triggers CD automatically — you need signals or an explicit \`markForCheck()\`.
- \`setTimeout\` and \`Promise.then\` on their own do not start CD.
- The bundle shrinks (no ~30 KB Zone.js), per-async-call overhead disappears, and CD becomes targeted and predictable.
- \`OnPush\` effectively becomes the norm rather than an optimization.

## What to say in the interview

> In zoneless mode Angular does not use Zone.js: change detection is triggered by reactivity rather than by patched async APIs. Every signal read in a template is linked to the component's \`LView\` through a reactive consumer; on a signal write that consumer calls \`markViewDirty\`, marking the view and its ancestor chain, and the \`ChangeDetectionScheduler\` schedules a pass and coalesces multiple changes from the same tick into one. Besides signals, a view is also marked by template events, \`markForCheck\`, \`AsyncPipe\` and a new signal-input value. The practical consequence is that mutating a plain class field no longer refreshes the view and that \`setTimeout\` or promises alone will not start CD, so state has to live in signals. You enable it with \`provideZonelessChangeDetection()\`; the payoff is roughly 30 KB less bundle, no overhead on every async call, and targeted CD instead of a full tree walk. Zoneless arrived as a developer preview in Angular 18 and stabilizes in the following versions — together with signals and \`OnPush\` it is Angular's new performance model.

## Gotchas

- **A plain field instead of a signal** means the screen never updates, and it looks like "Angular is broken".
- **Third-party libraries that changed state from their own callbacks** stop refreshing the UI — wrap them in signals or \`markForCheck\`.
- **\`fakeAsync\`/\`tick\` tests** are built around the zone; zoneless tests need a different way to wait for stability.
- **\`NgZone.onStable\` and \`runOutsideAngular\`** lose their old meaning in zoneless, so code relying on them breaks.
- **Coalescing does not mean "slower"**: several \`set\` calls produce one pass and one frame — do not expect the DOM to be updated synchronously right after a \`set\`.
- **Expect the follow-up**: how zoneless relates to \`OnPush\`, and what happens to an app that keeps its state in plain fields.`,
    },
    codeSnippet: `bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
// No Zone.js: signals + markForCheck drive targeted, coalesced CD.`,
  },
  {
    id: 'ng-008',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['signals', 'input', 'model', 'output'],
    question: {
      ru: 'Чем signal-based input()/model()/output() отличаются от классических декораторов @Input/@Output?',
      en: 'How do signal-based input()/model()/output() differ from the classic @Input/@Output decorators?',
    },
    answer: {
      ru: `## Коротко

Это те же входы и выходы компонента, только вместо декораторов — **функции, возвращающие реактивные объекты**. Значение входа теперь читается как \`this.size()\` и его можно напрямую подставить в \`computed\`.

Аналогия: раньше вход был как ящик для почты — письмо кинули, а вы узнаёте об этом только если поставили себе напоминание (\`ngOnChanges\`). Теперь вход — это табло на стене: посмотрел и увидел актуальное значение, а всё, что от него зависит, обновляется само.

## Из чего состоит набор

1. **\`input()\`** — сигнал **только для чтения**, представляющий входное свойство. Значение берётся вызовом \`this.value()\`, реактивно. \`ngOnChanges\` больше не нужен: производные значения делаются через \`computed\`. \`input.required<T>()\` требует обязательности **на этапе компиляции**. Поддерживает трансформации: \`input(false, { transform: booleanAttribute })\`.
2. **\`model()\`** — **двусторонний** сигнал, объединяющий вход и выход. Создаёт свойство \`prop\` и неявный \`propChange\`, поэтому в родителе работает синтаксис \`[(prop)]\`. Это writable-сигнал: внутри компонента можно \`this.value.set(...)\`, и изменение уедет наверх.
3. **\`output()\`** — замена \`@Output() EventEmitter\`. Возвращает объект с методом \`emit\`. Это **не сигнал** и не наследник \`EventEmitter\`/\`Subject\` — намеренно более лёгкая абстракция. Для интеропа с RxJS есть \`outputFromObservable\` и \`outputToObservable\`.

## Пример

\`\`\`ts
// вход только на чтение + производное значение
size = input<number>(10);
double = computed(() => this.size() * 2);

// двусторонняя привязка: в родителе пишем [(checked)]
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

Почему так: \`double\` пересчитается сам при любом новом значении входа — ни \`ngOnChanges\`, ни \`SimpleChanges\`, ни ручного пересчёта не требуется.

## Что это даёт на практике

- Полная типобезопасность и реактивность из коробки.
- В \`OnPush\` и zoneless изменение signal-input **автоматически** помечает вид грязным — \`markForCheck\` не нужен.
- Меньше шаблонного кода: исчезают \`ngOnChanges\` и \`SimpleChanges\`.
- \`input.required\` ловит забытый вход компилятором, а не в рантайме.

## Что сказать на собеседовании

> \`input()\` — это входное свойство в виде сигнала только для чтения: значение читается вызовом и участвует в \`computed\`, поэтому \`ngOnChanges\` больше не нужен, а \`input.required\` проверяет обязательность на этапе компиляции. \`model()\` — двусторонний writable-сигнал: он создаёт и вход, и неявный выход \`propChange\`, что даёт в родителе синтаксис \`[(prop)]\`. \`output()\` заменяет \`@Output() EventEmitter\` и возвращает объект с \`emit\` — это уже не \`Subject\`, а намеренно более лёгкая абстракция. Главный практический выигрыш в том, что при \`OnPush\` и в zoneless новое значение signal-input само помечает вид грязным.

## Ловушки

- **\`this.value\` вместо \`this.value()\`** — получите функцию, а не значение; в шаблоне это тихо отрендерит непонятное.
- **\`input()\` нельзя записать изнутри** — для этого и существует \`model()\`.
- **\`output()\` не \`EventEmitter\`** — привычные \`subscribe\`/\`pipe\` на нём не работают, нужен \`outputToObservable\`.
- **Читать \`input()\` в конструкторе** до первой установки значения — получите \`undefined\` или ошибку для \`required\`.
- **\`model()\` соблазняет размазать состояние** между родителем и ребёнком — для сложных случаев лучше явные input + output.
- **Смешивать \`@Input\` и \`input()\` в одном компоненте** технически можно, но читаемость страдает; мигрировать лучше компонентом целиком.`,
      en: `## In short

Same component inputs and outputs, but declared with **functions that return reactive objects** instead of decorators. An input value is now read as \`this.size()\` and can be dropped straight into a \`computed\`.

The analogy: an input used to be a mailbox — a letter lands in it, and you only find out if you set yourself a reminder (\`ngOnChanges\`). Now the input is a display board on the wall: you look and see the current value, and everything derived from it refreshes itself.

## What the set consists of

1. **\`input()\`** — a **read-only** signal representing an input property. You read the value by calling \`this.value()\`, reactively. \`ngOnChanges\` is no longer needed: derived values are built with \`computed\`. \`input.required<T>()\` enforces requiredness **at compile time**. Transforms are supported: \`input(false, { transform: booleanAttribute })\`.
2. **\`model()\`** — a **two-way** signal that merges an input and an output. It creates a \`prop\` plus an implicit \`propChange\`, which is what makes \`[(prop)]\` work in the parent. It is writable: inside the component you can call \`this.value.set(...)\` and the change propagates upward.
3. **\`output()\`** — the replacement for \`@Output() EventEmitter\`. It returns an object with an \`emit\` method. It is **not a signal** and does not extend \`EventEmitter\`/\`Subject\` — deliberately a lighter abstraction. For RxJS interop there are \`outputFromObservable\` and \`outputToObservable\`.

## Example

\`\`\`ts
// read-only input + a derived value
size = input<number>(10);
double = computed(() => this.size() * 2);

// two-way binding: the parent writes [(checked)]
checked = model(false);
toggle() { this.checked.update(v => !v); }
\`\`\`

Why: \`double\` recomputes itself whenever a new input value arrives — no \`ngOnChanges\`, no \`SimpleChanges\`, no manual recalculation.

## What this buys you in practice

- Full type safety and reactivity out of the box.
- Under \`OnPush\` and in zoneless a signal-input change **automatically** marks the view dirty — no \`markForCheck\` needed.
- Less boilerplate: \`ngOnChanges\` and \`SimpleChanges\` disappear.
- \`input.required\` catches a forgotten input in the compiler rather than at runtime.

## What to say in the interview

> \`input()\` is an input property expressed as a read-only signal: you read it by calling it, it plugs directly into \`computed\`, so \`ngOnChanges\` and \`SimpleChanges\` are no longer needed for derived values, and \`input.required\` checks requiredness at compile time; transforms such as \`booleanAttribute\` are supported too. \`model()\` is a two-way writable signal: it creates both an input and an implicit \`propChange\` output, which is what gives the parent the \`[(prop)]\` syntax, while inside the component \`set\`/\`update\` are allowed. \`output()\` replaces \`@Output() EventEmitter\` and returns an object with an \`emit\` method; the nuance worth stating is that it is neither an \`EventEmitter\` nor a \`Subject\` but a deliberately lighter abstraction, with \`outputFromObservable\` and \`outputToObservable\` provided for RxJS interop. The main practical win is that under \`OnPush\` and in zoneless a new signal-input value marks the view dirty by itself. Signal inputs are standalone-style only and require Angular 17.1+, while the old \`@Input\` stays for compatibility.

## Gotchas

- **\`this.value\` instead of \`this.value()\`** hands you the function, not the value; in a template it silently renders nonsense.
- **An \`input()\` cannot be written from inside** — that is exactly what \`model()\` is for.
- **\`output()\` is not an \`EventEmitter\`** — the familiar \`subscribe\`/\`pipe\` do not work on it; use \`outputToObservable\`.
- **Reading an \`input()\` in the constructor**, before the first value is set, gives \`undefined\` or throws for a required one.
- **\`model()\` tempts you to smear state** across parent and child — for anything complex prefer explicit input plus output.
- **Mixing \`@Input\` and \`input()\` in one component** technically works but hurts readability; migrate a component as a whole.`,
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
    category: 'angular-signals',
    level: 'Expert',
    tags: ['signals', 'linked-signal', 'resource'],
    question: {
      ru: 'Зачем нужны linkedSignal и resource()? Какие проблемы они решают?',
      en: 'Why do linkedSignal and resource() exist, and what problems do they solve?',
    },
    answer: {
      ru: `## Коротко

Оба API закрывают дыры, которые \`signal\` и \`computed\` вдвоём не закрывают. \`linkedSignal\` — это состояние, **производное от источника, но которое можно менять руками**. \`resource()\` — реактивная обёртка над **асинхронной загрузкой** данных.

Аналогия для \`linkedSignal\`: выпадающий список городов. Система подставляет город по умолчанию, но пользователь волен выбрать другой; сменили страну — подстановка происходит заново. \`computed\` тут не годится (в него не записать), обычный \`signal\` тоже (он не знает про смену страны).

Аналогия для \`resource()\`: официант, которому вы меняете заказ на полпути. Он не принесёт вам оба блюда — старый заказ отменяется, и приходит только актуальный.

## Как это работает по шагам

1. **\`linkedSignal\`** получает \`source\` (сигнал-источник) и \`computation\` — функцию, которой передаётся новое значение источника и **предыдущее** значение самого linkedSignal.
2. Пока источник не меняется, linkedSignal ведёт себя как обычный writable-сигнал: \`set\`/\`update\` работают.
3. Как только источник изменился — значение **пересчитывается заново** по \`computation\`, локальная правка сбрасывается (или сохраняется, если так решила \`computation\`).
4. **\`resource()\`** принимает \`request\` — функцию, читающую сигналы-параметры, и \`loader\` — асинхронную функцию загрузки.
5. При изменении \`request\` загрузка **перезапускается автоматически**, а предыдущая отменяется через \`AbortSignal\`.
6. Результат доступен как набор сигналов: \`value()\`, \`status()\`, \`error()\`, \`isLoading()\`.

## Пример

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // писать можно

const userId = signal(1);
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) =>
    fetch('/api/users/' + request.id, { signal: abortSignal }).then(r => r.json()),
});
// userResource.value(), .status(), .error(), .isLoading()
\`\`\`

Почему так: в \`selected\` пользовательский выбор сохраняется, пока он валиден для нового списка, иначе берётся первый элемент. А \`userResource\` при каждом новом \`userId\` сам отменяет старый HTTP-запрос — это и есть встроенная защита от race condition, когда медленный ответ на старый id приходит после быстрого ответа на новый.

## Что даёт resource

- Состояния \`idle | loading | resolved | error\` из коробки — не нужно вручную держать флаг загрузки.
- Автоматическая отмена устаревших запросов.
- Реактивная зависимость от сигналов-параметров: поменялся id — поменялись данные.
- \`rxResource\` — то же самое, но для интеграции с RxJS.

## Что сказать на собеседовании

> \`linkedSignal\` нужен, когда состояние производно от источника, но должно оставаться локально записываемым: \`computed\` писать не даёт, а обычный сигнал не реагирует на источник. Он принимает \`source\` и \`computation\`, куда передаются новое значение источника и предыдущее значение сигнала. \`resource()\` — реактивная обёртка над асинхронной загрузкой: \`request\` читает сигналы-параметры, \`loader\` выполняет запрос, при изменении параметров загрузка перезапускается, а предыдущая отменяется через \`AbortSignal\`, что решает проблему гонок. Обе API экспериментальные, появились в Angular 19.

## Ловушки

- **\`linkedSignal\` не заменяет \`computed\`.** Если писать в состояние не нужно, берите \`computed\` — он проще и надёжнее.
- **Локальная правка теряется при смене источника** — это его задуманное поведение, а не баг; логику сохранения пишете вы в \`computation\`.
- **\`resource\` не кэширует ответы** между разными значениями параметров — это не замена полноценному data-layer вроде TanStack Query.
- **\`loader\` обязан пробрасывать \`abortSignal\`** в \`fetch\`, иначе отмены не будет и гонки останутся.
- **Обе API экспериментальные** — сигнатуры менялись между версиями; на собеседовании честнее назвать их experimental.
- **\`request\` должен читать сигналы синхронно** — иначе зависимость не зарегистрируется и перезагрузка не сработает.`,
      en: `## In short

Both APIs plug holes that \`signal\` and \`computed\` together leave open. \`linkedSignal\` is state that is **derived from a source yet still writable by hand**. \`resource()\` is a reactive wrapper around **async data loading**.

Analogy for \`linkedSignal\`: a city dropdown. The system preselects a default, but the user is free to pick another; change the country and the default is applied again. \`computed\` won't do (you cannot write to it) and neither will a plain \`signal\` (it knows nothing about the country changing).

Analogy for \`resource()\`: a waiter you change your order with halfway through. He will not bring both dishes — the old order is cancelled and only the current one arrives.

## How it works, step by step

1. **\`linkedSignal\`** takes a \`source\` signal and a \`computation\` function that receives the new source value and the **previous** value of the linkedSignal itself.
2. As long as the source is unchanged, the linkedSignal behaves like a normal writable signal: \`set\`/\`update\` work.
3. The moment the source changes, the value is **recomputed** via \`computation\`, and the local edit is discarded — or preserved, if that is what \`computation\` decides.
4. **\`resource()\`** takes a \`request\` — a function reading parameter signals — and a \`loader\`, the async loading function.
5. When \`request\` changes the load **restarts automatically** and the previous one is cancelled via \`AbortSignal\`.
6. The result is exposed as signals: \`value()\`, \`status()\`, \`error()\`, \`isLoading()\`.

## Example

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal({
  source: options,
  computation: (opts, prev) =>
    opts.includes(prev?.value as string) ? prev!.value : opts[0],
});
selected.set('b'); // writable

const userId = signal(1);
const userResource = resource({
  request: () => ({ id: userId() }),
  loader: async ({ request, abortSignal }) =>
    fetch('/api/users/' + request.id, { signal: abortSignal }).then(r => r.json()),
});
// userResource.value(), .status(), .error(), .isLoading()
\`\`\`

Why: \`selected\` keeps the user's choice for as long as it is still valid for the new list, and falls back to the first item otherwise. And \`userResource\` cancels the previous HTTP request on every new \`userId\` — that is built-in protection against the race where a slow response for the old id lands after a fast response for the new one.

## What resource gives you

- \`idle | loading | resolved | error\` states out of the box — no hand-rolled loading flag.
- Automatic cancellation of stale requests.
- A reactive dependency on parameter signals: the id changes, the data follows.
- \`rxResource\` — the same thing for RxJS integration.

## What to say in the interview

> \`linkedSignal\` covers the case where state is derived from a source but must stay locally writable: \`computed\` cannot be written to and a plain signal does not react to the source. It takes a \`source\` and a \`computation\` that receives both the new source value and the signal's own previous value, so you can decide whether to reset the local choice or keep it. The classic example is a selected list item that is only valid while it still exists in the new list. \`resource()\` is a reactive wrapper around async loading: \`request\` reads parameter signals, \`loader\` performs the call, and when the parameters change the load restarts while the previous one is aborted through \`AbortSignal\` — which is what solves the race-condition problem. It exposes \`value\`, \`status\`, \`error\` and \`isLoading\` as signals, and \`rxResource\` covers RxJS. Both APIs are experimental, introduced in Angular 19, but they set the direction: reactive data handling without manual subscription management.

## Gotchas

- **\`linkedSignal\` is not a replacement for \`computed\`.** If you never write to the state, use \`computed\` — simpler and safer.
- **The local edit is lost when the source changes** — that is the intended behaviour, not a bug; preserving it is logic you write inside \`computation\`.
- **\`resource\` does not cache responses** across parameter values — it is not a substitute for a full data layer such as TanStack Query.
- **The \`loader\` must forward \`abortSignal\`** into \`fetch\`, otherwise nothing is cancelled and the races come back.
- **Both APIs are experimental** — signatures shifted between versions; calling them experimental in an interview is the honest answer.
- **\`request\` must read its signals synchronously** — otherwise the dependency is never registered and no reload happens.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['dependency-injection', 'hierarchical-injectors', 'internals'],
    question: {
      ru: 'Как устроена иерархия инжекторов в Angular: ElementInjector против EnvironmentInjector?',
      en: 'How is the injector hierarchy structured in Angular: ElementInjector vs EnvironmentInjector?',
    },
    answer: {
      ru: `## Коротко

Инжекторов в Angular не один, а **два дерева**, и они не параллельные миры, а стыкуются друг с другом. \`ElementInjector\` живёт вместе с DOM и компонентами, \`EnvironmentInjector\` — вместе с приложением и lazy-участками роутера.

Аналогия: нужен степлер. Сначала спрашиваете у своего тимлида, потом у его руководителя — это подъём по \`ElementInjector\`. Дошли до самого верха отдела, там не нашли — идёте в общий хозблок компании: это уже \`EnvironmentInjector\` с его \`root\` и \`platform\`. Нигде нет — вам говорят «такого нет», то есть \`NullInjectorError\`.

## Два дерева

1. **\`EnvironmentInjector\`** (раньше назывался \`ModuleInjector\`) — дерево, связанное с приложением и lazy-загруженными участками роутера. Цепочка корней: \`root\` → \`platform\` → \`null\`. Сюда попадают провайдеры из \`providedIn\`, из \`providers\` в \`bootstrapApplication\` и из \`providers\` lazy-роутов. В пределах своего environment эти провайдеры — **синглтоны**.
2. **\`ElementInjector\`** — дерево, связанное с **DOM-элементами**, компонентами и директивами. Каждый компонент со своим \`providers: [...]\` создаёт узел. Иерархия повторяет структуру шаблона, а не структуру папок.

## Как ищется зависимость

1. Вы вызываете \`inject(Token)\`.
2. Angular идёт **вверх по \`ElementInjector\`** — от текущего элемента к корневому компоненту.
3. Не нашёл — переходит в дерево **\`EnvironmentInjector\`** и поднимается до \`root\`, затем \`platform\`.
4. Нигде нет — \`NullInjectorError\`. С \`@Optional\` (или \`{ optional: true }\`) вместо ошибки вернётся \`null\`.

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (точка стыка)
EnvironmentInjector (route) → root → platform → null
\`\`\`

## Пример

\`\`\`ts
@Component({
  selector: 'app-form',
  providers: [FormStateService], // новый инстанс на каждый компонент
})
export class FormComponent {
  private state = inject(FormStateService); // найдётся здесь же, в ElementInjector
  private config = inject(APP_CONFIG);      // дойдёт до root EnvironmentInjector
}
\`\`\`

Почему так: \`providers\` в \`@Component\` создаёт **новый экземпляр на каждый инстанс компонента** — именно так делают scoped-сервисы вроде состояния формы. А \`providedIn: 'root'\` даёт один синглтон на приложение, к тому же tree-shakable.

## Что сказать на собеседовании

> В Angular две иерархии инжекторов. \`EnvironmentInjector\` привязан к приложению и lazy-участкам роутера; его цепочка — \`root\`, \`platform\`, \`null\`. \`ElementInjector\` привязан к элементам, компонентам и директивам, и его структура повторяет шаблон: каждый компонент с собственными \`providers\` создаёт узел. При \`inject\` резолюция идёт вверх по \`ElementInjector\`, затем переходит в \`EnvironmentInjector\` и поднимается до \`root\` и \`platform\`. Побеждает первое совпадение снизу вверх, поэтому \`providers\` в компоненте локально переопределяет сервис и даёт отдельный экземпляр на каждый инстанс компонента.

## Ловушки

- **\`providers\` в компоненте — экземпляр на компонент.** Поставили сервис туда и удивляетесь, что состояние не общее.
- **Lazy-роут со своим \`providers\` создаёт новый environment** — там будет свой инстанс, а не корневой синглтон.
- **\`providedIn: 'root'\` не значит «доступен везде первым»** — локальный провайдер выше по \`ElementInjector\` перекроет его.
- **\`viewProviders\` против \`providers\`**: первый не виден контенту, спроецированному через \`ng-content\`.
- **Импорт сервиса дважды в разных environment** — два инстанса и «мистические» баги состояния.
- **Спросят следом**: что такое \`NullInjectorError\`, чем \`platform\` отличается от \`root\` и как модификаторы \`@Self\`/\`@SkipSelf\` меняют этот обход.`,
      en: `## In short

Angular does not have one injector but **two trees**, and they are not parallel universes — they join up. \`ElementInjector\` lives with the DOM and components; \`EnvironmentInjector\` lives with the application and lazy router segments.

The analogy: you need a stapler. First you ask your team lead, then their manager — that is the walk up the \`ElementInjector\`. You reach the top of the department with nothing, so you go to the company supply room: that is the \`EnvironmentInjector\` with its \`root\` and \`platform\`. Nobody has one anywhere — you are told "no such thing", which is \`NullInjectorError\`.

## The two trees

1. **\`EnvironmentInjector\`** (formerly \`ModuleInjector\`) — the tree tied to the application and to lazy-loaded router segments. Its root chain is \`root\` → \`platform\` → \`null\`. It holds providers from \`providedIn\`, from \`providers\` in \`bootstrapApplication\`, and from a lazy route's \`providers\`. Within their environment those providers are **singletons**.
2. **\`ElementInjector\`** — the tree tied to **DOM elements**, components and directives. Every component with its own \`providers: [...]\` creates a node. The hierarchy mirrors the template structure, not the folder structure.

## How a dependency is resolved

1. You call \`inject(Token)\`.
2. Angular walks **up the \`ElementInjector\`** — from the current element to the root component.
3. Not found — it crosses into the **\`EnvironmentInjector\`** tree and climbs to \`root\`, then \`platform\`.
4. Nowhere to be found — \`NullInjectorError\`. With \`@Optional\` (or \`{ optional: true }\`) you get \`null\` instead of a throw.

\`\`\`
ElementInjector (component) → ... → root component
                                       ↓ (merge point)
EnvironmentInjector (route) → root → platform → null
\`\`\`

## Example

\`\`\`ts
@Component({
  selector: 'app-form',
  providers: [FormStateService], // a fresh instance per component
})
export class FormComponent {
  private state = inject(FormStateService); // found right here, in the ElementInjector
  private config = inject(APP_CONFIG);      // resolved up in the root EnvironmentInjector
}
\`\`\`

Why: \`providers\` in \`@Component\` creates a **new instance per component instance** — exactly how scoped services such as form state are built. \`providedIn: 'root'\`, by contrast, gives one app-wide singleton and is tree-shakable on top.

## What to say in the interview

> Angular has two injector hierarchies. \`EnvironmentInjector\`, formerly \`ModuleInjector\`, is tied to the application and to lazy-loaded router segments; its chain is \`root\`, \`platform\`, \`null\`, and providers there behave as singletons within their environment. \`ElementInjector\` is tied to DOM elements, components and directives, and its shape mirrors the template: every component with its own \`providers\` creates a node. On \`inject\`, resolution first walks up the \`ElementInjector\` to the root component, then crosses into the \`EnvironmentInjector\` and climbs to \`root\` and \`platform\`; if nothing matches you get a \`NullInjectorError\`, or \`null\` when the lookup is optional. The practical consequence is that the first match bottom-up wins, so component-level \`providers\` locally override a service and give one instance per component instance — the standard trick for scoped state. Understanding these two trees is the main tool when debugging "why did I get the wrong service instance".

## Gotchas

- **\`providers\` on a component means one instance per component.** Put a service there and then wonder why the state is not shared.
- **A lazy route with its own \`providers\` creates a new environment** — you get an instance there, not the root singleton.
- **\`providedIn: 'root'\` does not mean "wins everywhere"** — a local provider higher up the \`ElementInjector\` shadows it.
- **\`viewProviders\` vs \`providers\`**: the former is invisible to content projected through \`ng-content\`.
- **Importing a service into two different environments** yields two instances and mysterious state bugs.
- **Expect the follow-up**: what \`NullInjectorError\` is, how \`platform\` differs from \`root\`, and how \`@Self\`/\`@SkipSelf\` change this traversal.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['dependency-injection', 'resolution-modifiers'],
    question: {
      ru: 'Что делают модификаторы резолвинга @Self, @SkipSelf, @Optional и @Host?',
      en: 'What do the resolution modifiers @Self, @SkipSelf, @Optional and @Host do?',
    },
    answer: {
      ru: `## Коротко

По умолчанию Angular ищет зависимость снизу вверх, пока не найдёт. Модификаторы меняют **маршрут поиска**: где начать, где остановиться и что делать, если не нашлось.

Аналогия — снова про степлер. Обычный поиск: спрашиваю у себя, потом у тимлида, потом выше. \`@Self\` — «спрашиваю только у себя, чужого не беру». \`@SkipSelf\` — «у себя не смотрю принципиально, сразу иду к руководителю». \`@Host\` — «поднимаюсь, но не выхожу за пределы своего кабинета». \`@Optional\` — «если ни у кого нет, ладно, обойдусь без него».

## Четыре модификатора

1. **\`@Optional\`** — если зависимость не нашлась, вернуть \`null\` вместо \`NullInjectorError\`. Для необязательных сервисов и конфигурационных токенов.
2. **\`@Self\`** — искать токен **только** в собственном \`ElementInjector\` текущего компонента или директивы, вверх не подниматься. Не нашли — ошибка (или \`null\` в паре с \`@Optional\`). Применяют, когда сервис обязан быть предоставлен локально.
3. **\`@SkipSelf\`** — **пропустить** собственный инжектор и начать с родительского. Классика: guard от повторной загрузки модуля и доступ к родительскому экземпляру сервиса, когда текущий компонент этот сервис переопределяет.
4. **\`@Host\`** — ограничить поиск **границей host-компонента**: поиск идёт вверх по \`ElementInjector\`, но **останавливается** на компоненте-хосте текущей директивы и не выходит в родительский компонент. Критично для директив, спроецированных через \`ng-content\`.

## Пример

\`\`\`ts
// Функциональный синтаксис — предпочтительный в современном Angular
const logger   = inject(LoggerService, { optional: true });
const parent   = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });

// Классика с декораторами: защита от повторной загрузки модуля
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

Почему так: модификаторы **комбинируются**. \`@Optional() @SkipSelf()\` означает «поищи выше меня, и если там уже кто-то есть — скажи об этом, а если нет, не падай». Если \`CoreModule\` нашёлся у родителя, значит его подключили второй раз — и мы явно об этом кричим.

## Что сказать на собеседовании

> Модификаторы резолвинга управляют тем, где Angular ищет зависимость. \`@Optional\` превращает отсутствие провайдера из \`NullInjectorError\` в \`null\`. \`@Self\` ограничивает поиск собственным \`ElementInjector\`. \`@SkipSelf\` наоборот пропускает свой инжектор и начинает с родителя — это нужно, когда компонент переопределяет сервис, но хочет родительский экземпляр. \`@Host\` поднимается по \`ElementInjector\`, но останавливается на границе host-компонента, что важно для директив, попавших внутрь через проекцию. Все они комбинируются и в современном стиле выражаются опциями функции \`inject\`: \`optional\`, \`self\`, \`skipSelf\`, \`host\`.

## Ловушки

- **\`@Self\` без \`@Optional\`** падает \`NullInjectorError\`, если провайдера нет локально — почти всегда их берут в паре.
- **\`@SkipSelf\` на корневом уровне** искать уже негде — тоже нужен \`@Optional\`.
- **\`@Host\` путают с \`@Self\`.** \`@Self\` — ровно один узел; \`@Host\` — подъём, но не дальше host-компонента.
- **\`@Host\` + \`ng-content\`** — самая тонкая часть: спроецированный контент принадлежит **внешнему** компоненту, и без \`@Host\` резолюция уйдёт туда.
- **Смешивать декораторы и опции \`inject\`** в одном классе можно, но лучше выбрать один стиль.
- **Спросят следом**: как это ложится на два дерева инжекторов и зачем в реальном коде нужен \`@Optional() @SkipSelf()\`.`,
      en: `## In short

By default Angular searches for a dependency bottom-up until it finds one. The modifiers change the **search route**: where to start, where to stop, and what to do when nothing is found.

Back to the stapler analogy. Normal lookup: ask myself, then my team lead, then higher. \`@Self\` — "only my own desk, I won't borrow". \`@SkipSelf\` — "skip my desk on principle, go straight to the manager". \`@Host\` — "walk up, but never leave my own room". \`@Optional\` — "if nobody has one, fine, I'll manage without".

## The four modifiers

1. **\`@Optional\`** — if the dependency is missing, return \`null\` instead of throwing \`NullInjectorError\`. For optional services and config tokens.
2. **\`@Self\`** — look the token up **only** in the current component's or directive's own \`ElementInjector\`, never going higher. Not found — error (or \`null\` when paired with \`@Optional\`). Used when a service must be provided locally.
3. **\`@SkipSelf\`** — **skip** your own injector and start from the parent. Classics: a guard against loading a module twice, and reaching the parent instance of a service that the current component overrides.
4. **\`@Host\`** — limit the search to the **host component boundary**: it walks up the \`ElementInjector\` but **stops** at the component that hosts the current directive, never entering the parent component. Crucial for directives projected through \`ng-content\`.

## Example

\`\`\`ts
// Functional syntax — the preferred style in modern Angular
const logger   = inject(LoggerService, { optional: true });
const parent   = inject(TreeNode, { skipSelf: true, optional: true });
const selfOnly = inject(FormControl, { self: true });
const hostBound = inject(NgControl, { host: true, optional: true });

// The decorator classic: guarding against a double module load
constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule already loaded');
}
\`\`\`

Why: the modifiers **combine**. \`@Optional() @SkipSelf()\` means "look above me, and if somebody is already there tell me — but if not, don't blow up". If \`CoreModule\` is found in a parent, it was imported a second time, and we say so loudly.

## What to say in the interview

> Resolution modifiers control where and how deep Angular searches for a dependency. \`@Optional\` turns a missing provider from a \`NullInjectorError\` into \`null\`. \`@Self\` restricts the lookup to the component's own \`ElementInjector\` — a way to require that the service be provided locally. \`@SkipSelf\` does the opposite, skipping your own injector and starting at the parent, which is what you need when a component overrides a service but still wants the parent instance, and in the classic guard against a repeated \`CoreModule\` import. \`@Host\` walks up the \`ElementInjector\` but stops at the host component boundary, which matters for directives that arrived through content projection: without it the directive would accidentally resolve a service from the outer component. All of them combine, and in the modern style they are expressed as options on the \`inject\` function: \`optional\`, \`self\`, \`skipSelf\`, \`host\`.

## Gotchas

- **\`@Self\` without \`@Optional\`** throws \`NullInjectorError\` when nothing is provided locally — they are almost always used as a pair.
- **\`@SkipSelf\` at the root level** has nowhere left to look — it needs \`@Optional\` too.
- **\`@Host\` gets confused with \`@Self\`.** \`@Self\` is exactly one node; \`@Host\` walks up but no further than the host component.
- **\`@Host\` plus \`ng-content\`** is the subtle part: projected content belongs to the **outer** component, so without \`@Host\` resolution escapes there.
- **Mixing decorators and \`inject\` options** in one class works, but pick one style.
- **Expect the follow-up**: how this maps onto the two injector trees, and where \`@Optional() @SkipSelf()\` shows up in real code.`,
    },
    codeSnippet: `constructor(@Optional() @SkipSelf() parent?: CoreModule) {
  if (parent) throw new Error('CoreModule is already loaded');
}

// Functional equivalent
const ctrl = inject(NgControl, { self: true, optional: true });`,
  },
  {
    id: 'ng-012',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['dependency-injection', 'injection-token', 'multi-providers'],
    question: {
      ru: 'Зачем нужен InjectionToken и как работают multi-провайдеры?',
      en: 'Why do you need InjectionToken and how do multi-providers work?',
    },
    answer: {
      ru: `## Коротко

DI — это словарь: по **ключу** отдаётся значение. Для классов ключом служит сам класс. Но строка, объект конфига, функция или интерфейс классом не являются — им нужен свой уникальный ключ, и это \`InjectionToken\`.

Аналогия: ключи от кабинетов на доске. Класс — это ключ с гравировкой, его ни с чем не спутаешь. А строка \`'apiUrl'\` — это ключ без бирки: точно такой же может завести кто угодно в соседней команде, и вы получите чужой кабинет. \`InjectionToken\` — бирка с гарантированно уникальным номером.

## Как это работает

1. Создаём токен: \`new InjectionToken<T>('описание')\`. Строка внутри нужна **только для сообщений об ошибках**, уникальность даёт сам объект.
2. Можно сразу дать ему значение по умолчанию: \`providedIn: 'root'\` плюс \`factory\`. Тогда токен tree-shakable и работает без регистрации в \`providers\`.
3. Получаем через \`inject(TOKEN)\` — как обычный сервис.
4. **Интерфейсы токенами быть не могут**: TypeScript-интерфейсы стираются при компиляции, в рантайме от них ничего не остаётся. Поэтому для «интерфейсной» зависимости \`InjectionToken\` обязателен.
5. Флаг **\`multi: true\`** разрешает **нескольким** провайдерам зарегистрироваться под **одним** токеном. При инъекции вернётся **массив** всех значений.

## Пример

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);

// multi: один токен — много реализаций
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

Почему так: без \`multi\` второй провайдер просто затёр бы первый. С \`multi\` оба попадают в массив, и Angular выстраивает из них цепочку интерсепторов.

## Где multi встречается в самом Angular

- \`HTTP_INTERCEPTORS\` — цепочка интерсепторов.
- \`APP_INITIALIZER\` — несколько инициализаторов при старте приложения.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — кастомные валидаторы форм.
- Плагинная архитектура: несколько независимых фич добавляют свои обработчики.

## Что сказать на собеседовании

> DI резолвит зависимости по токену-ключу; для классов ключом является сам класс, а для не-классовых значений — строк, конфигов, функций — нужен \`InjectionToken\`, уникальный объект-ключ. Интерфейс токеном быть не может: TypeScript-интерфейсы стираются при компиляции. Флаг \`multi: true\` позволяет нескольким провайдерам зарегистрироваться под одним токеном, и при инъекции возвращается массив всех значений; на этом построены \`HTTP_INTERCEPTORS\` и \`NG_VALIDATORS\`. По сути \`multi\` — это механизм расширяемости: каркас объявляет точку расширения, а фичи добавляют реализации.

## Ловушки

- **Забыли \`multi: true\` у одного из провайдеров** — молча затрёте всю цепочку или получите ошибку смешивания.
- **Строка вместо \`InjectionToken\`** — коллизии ключей и \`any\` вместо типа.
- **Строковое описание в конструкторе токена не делает его уникальным** — уникален сам объект; два токена с одинаковым текстом остаются разными.
- **\`factory\` выполняется лениво**, при первом \`inject\` — а не при старте приложения.
- **Порядок в multi-массиве важен**: интерсепторы выполняются в порядке регистрации.
- **Спросят следом**: чем \`useValue\` отличается от \`useFactory\`, и почему \`InjectionToken\` предпочтительнее абстрактного класса-токена.`,
      en: `## In short

DI is a dictionary: a **key** hands you a value. For classes the key is the class itself. But a string, a config object, a function or an interface is not a class — they need their own unique key, and that is the \`InjectionToken\`.

The analogy: office keys on a board. A class is a key with an engraving — impossible to mistake. The string \`'apiUrl'\` is a key with no tag: anyone in the next team can cut an identical one and you end up in the wrong office. An \`InjectionToken\` is a tag with a guaranteed-unique number.

## How it works

1. Create the token: \`new InjectionToken<T>('description')\`. The string inside is **only for error messages**; uniqueness comes from the object itself.
2. You can give it a default right away: \`providedIn: 'root'\` plus a \`factory\`. Then the token is tree-shakable and works without being registered in any \`providers\`.
3. Retrieve it with \`inject(TOKEN)\` — just like a service.
4. **Interfaces cannot be tokens**: TypeScript interfaces are erased at compile time and nothing of them survives at runtime. So for an "interface-shaped" dependency an \`InjectionToken\` is mandatory.
5. The **\`multi: true\`** flag lets **several** providers register under **one** token. Injection then returns an **array** of all the values.

## Example

\`\`\`ts
export const API_URL = new InjectionToken<string>('api.url', {
  providedIn: 'root',
  factory: () => 'https://api.example.com',
});

const url = inject(API_URL);

// multi: one token, many implementations
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
{ provide: HTTP_INTERCEPTORS, useClass: LogInterceptor, multi: true },
\`\`\`

Why: without \`multi\` the second provider would simply overwrite the first. With \`multi\` both land in an array and Angular builds an interceptor chain out of them.

## Where multi appears inside Angular itself

- \`HTTP_INTERCEPTORS\` — the interceptor chain.
- \`APP_INITIALIZER\` — several startup initializers.
- \`NG_VALIDATORS\` / \`NG_ASYNC_VALIDATORS\` — custom form validators.
- Plugin architectures: independent features each register their own handler.

## What to say in the interview

> Angular DI resolves dependencies by a token key; for classes the class itself is the key, but non-class values — strings, config objects, functions — need an \`InjectionToken\`, a unique key object carrying a type parameter. An interface cannot be a token because TypeScript interfaces are erased at compile time and do not exist at runtime. A token can be declared with \`providedIn: 'root'\` and a \`factory\`, which makes it tree-shakable and removes the need to register it explicitly. The \`multi: true\` flag lets several providers register under one token, and injection then returns an array of all values — that is how \`HTTP_INTERCEPTORS\`, \`APP_INITIALIZER\` and \`NG_VALIDATORS\` are built. An important nuance: under one token all providers must be either all multi or all non-multi, and mixing throws. Fundamentally \`multi\` is an extensibility mechanism: the framework declares an extension point and features plug implementations into it without knowing about each other.

## Gotchas

- **Forgetting \`multi: true\` on one provider** silently wipes the chain or throws the mixing error.
- **Using a string instead of an \`InjectionToken\`** gives you key collisions and \`any\` instead of a type.
- **The description string does not make a token unique** — the object does; two tokens with identical text are still different tokens.
- **A \`factory\` runs lazily**, on the first \`inject\` — not at application startup.
- **Order in the multi array matters**: interceptors run in registration order.
- **Expect the follow-up**: how \`useValue\` differs from \`useFactory\`, and why an \`InjectionToken\` beats an abstract class used as a token.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['dependency-injection', 'inject', 'modern-angular'],
    question: {
      ru: 'Чем функция inject() лучше инъекции через конструктор и где её можно вызывать?',
      en: 'How is the inject() function better than constructor injection and where can it be called?',
    },
    answer: {
      ru: `## Коротко

\`inject()\` — это функция, которая достаёт зависимость из текущего **injection-контекста**, не объявляя её в конструкторе. Пишем \`private http = inject(HttpClient)\` прямо в поле класса.

Аналогия: конструктор — это заказ по списку, который вы обязаны передать курьеру целиком и заранее, а наследники обязаны этот список ещё и переписывать в своём \`super(...)\`. \`inject()\` — это торговый автомат в коридоре: подошёл, когда нужно, нажал кнопку, получил. Но автомат работает только внутри здания — вне «контекста» кнопка ничего не выдаст.

## Чем он лучше конструктора

1. **Меньше шаблонного кода**: не нужны длинные конструкторы с \`private\`-модификаторами у каждого параметра.
2. **Наследование**: подклассам не приходится пробрасывать зависимости родителя через \`super(...)\` — самый болезненный момент старого стиля.
3. **Переиспользуемые функции**: логику инъекции можно вынести в helper вроде \`injectRouterParams()\` — с конструктором это невозможно в принципе.
4. **Чище типизируются опции**: \`inject(Token, { optional: true })\` вместо декораторов на параметре.
5. **Дженерики и абстрактные базовые классы** обслуживаются заметно аккуратнее.

## Где его можно вызывать

\`inject()\` работает **только в injection-контексте**:
- инициализаторы полей класса;
- конструктор;
- фабрики провайдеров — \`useFactory\` и \`factory\` в \`InjectionToken\`;
- функции, запущенные через \`runInInjectionContext(injector, fn)\`;
- гварды, резолверы, интерсепторы — они уже выполняются в контексте.

Вне контекста — например, в обычном колбэке или в \`setTimeout\` — получите ошибку \`NG0203\`.

## Пример

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);      // ОК: инициализатор поля
  private injector = inject(Injector);    // сохранили инжектор на потом

  constructor() {
    setTimeout(() => inject(Foo));        // ОШИБКА NG0203: вне контекста
  }

  later() {
    runInInjectionContext(this.injector, () => inject(Foo)); // так можно
  }
}
\`\`\`

Почему так: контекст существует только в момент создания класса. Если зависимость нужна позже, вы заранее сохраняете \`Injector\` и явно восстанавливаете контекст через \`runInInjectionContext\`.

## Что сказать на собеседовании

> \`inject()\` получает зависимость из текущего injection-контекста без параметра в конструкторе — в современном Angular это рекомендованный стиль. Преимущества: нет шаблонного кода в конструкторах, а инъекцию можно выносить в переиспользуемые функции — так устроены современные \`inject*\`-хелперы. Ограничение: вызывать его можно только в injection-контексте — инициализаторы полей, конструктор, фабрики провайдеров и гварды, либо внутри \`runInInjectionContext\`. Вызов из обычного колбэка или \`setTimeout\` даст \`NG0203\`; обходится это тем, что заранее инжектим \`Injector\` и восстанавливаем контекст вручную.

## Ловушки

- **\`inject()\` в \`ngOnInit\` или в колбэке** — \`NG0203\`. Только поля, конструктор и явный \`runInInjectionContext\`.
- **\`inject()\` внутри \`effect\` без сохранённого инжектора** — та же ошибка.
- **Порядок инициализации полей**: поле, инжектящее сервис, который читает другое поле этого же класса, легко получит \`undefined\`.
- **Тестирование**: \`inject()\` в поле требует создания класса через \`TestBed\`, а не просто \`new Service()\`.
- **Не путать с \`inject()\` из \`@angular/core/testing\`** — это другая функция с тем же именем.
- **Спросят следом**: что такое injection-контекст, как устроен \`runInInjectionContext\` и почему функциональные гварды смогли заменить классовые.`,
      en: `## In short

\`inject()\` is a function that pulls a dependency out of the current **injection context** without declaring it in the constructor. You write \`private http = inject(HttpClient)\` directly as a class field.

The analogy: the constructor is an order form you must hand over complete and up front — and every subclass has to copy that form into its own \`super(...)\`. \`inject()\` is a vending machine in the corridor: walk up when you need something, press the button, take it. But the machine only works inside the building — outside the "context" the button gives you nothing.

## Why it beats constructor injection

1. **Less boilerplate**: no long constructors with a \`private\` modifier on every parameter.
2. **Inheritance**: subclasses no longer forward the parent's dependencies through \`super(...)\` — the most painful part of the old style.
3. **Reusable functions**: injection logic can be extracted into a helper like \`injectRouterParams()\` — fundamentally impossible with a constructor.
4. **Cleaner typed options**: \`inject(Token, { optional: true })\` instead of parameter decorators.
5. **Generics and abstract base classes** are handled far more neatly.

## Where you can call it

\`inject()\` works **only in an injection context**:
- class field initializers;
- the constructor;
- provider factories — \`useFactory\` and the \`factory\` of an \`InjectionToken\`;
- functions run through \`runInInjectionContext(injector, fn)\`;
- guards, resolvers, interceptors — they already execute in context.

Outside the context — in a plain callback or a \`setTimeout\`, say — you get error \`NG0203\`.

## Example

\`\`\`ts
export class UserService {
  private http = inject(HttpClient);      // OK: field initializer
  private injector = inject(Injector);    // keep the injector for later

  constructor() {
    setTimeout(() => inject(Foo));        // ERROR NG0203: outside the context
  }

  later() {
    runInInjectionContext(this.injector, () => inject(Foo)); // this works
  }
}
\`\`\`

Why: the context exists only while the class is being created. If you need a dependency later, you keep the \`Injector\` up front and explicitly restore the context with \`runInInjectionContext\`.

## What to say in the interview

> \`inject()\` retrieves a dependency from the current injection context without declaring a constructor parameter, and it is the recommended style in modern Angular. The practical wins: no constructor boilerplate, subclasses no longer forward dependencies through \`super\`, options such as \`optional\` or \`skipSelf\` are passed as a plain object, and — most importantly — injection can be factored into reusable functions, which is how all the modern \`inject*\` helpers are built. The constraint is that it may only be called in an injection context: field initializers, the constructor, provider factories, functional guards, resolvers and interceptors, or explicitly inside \`runInInjectionContext\`. Calling it from an ordinary callback or a \`setTimeout\` throws \`NG0203\`; the workaround is to inject the \`Injector\` up front and restore the context manually later.

## Gotchas

- **\`inject()\` in \`ngOnInit\` or in a callback** throws \`NG0203\`. Only fields, the constructor, and an explicit \`runInInjectionContext\`.
- **\`inject()\` inside an \`effect\` without a saved injector** hits the same error.
- **Field initialization order**: a field injecting a service that reads another field of the same class easily sees \`undefined\`.
- **Testing**: a class using \`inject()\` in fields must be created via \`TestBed\`, not a bare \`new Service()\`.
- **Do not confuse it with \`inject()\` from \`@angular/core/testing\`** — a different function with the same name.
- **Expect the follow-up**: what an injection context actually is, how \`runInInjectionContext\` works, and why functional guards could replace class-based ones.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['lifecycle-hooks', 'order', 'internals'],
    question: {
      ru: 'В каком порядке вызываются хуки жизненного цикла и когда срабатывает каждый?',
      en: 'In what order are lifecycle hooks called and when does each one fire?',
    },
    answer: {
      ru: `## Коротко

Хуки — это заранее оговорённые моменты, когда Angular даёт вам слово: «объект создан», «входы пришли», «контент вставлен», «вид отрисован», «всё, сношу». Порядок жёсткий и его стоит знать наизусть.

Аналогия — сборка мебели по инструкции. Сначала распаковали коробку (\`constructor\` — деталей ещё нет). Потом разложили комплектующие (\`ngOnChanges\` — пришли входы). Дальше первая сборка (\`ngOnInit\`). Вставили полки, которые приехали отдельно от заказчика — это спроецированный контент. И только в конце прикрутили фасад и увидели готовый шкаф — это ваш собственный вид.

## Порядок вызова

1. **\`constructor\`** — работает DI. Входов ещё нет, вида нет.
2. **\`ngOnChanges\`** — только если есть \`@Input\`. Вызывается **перед** \`ngOnInit\` и потом на каждое изменение входа, отдаёт объект \`SimpleChanges\`.
3. **\`ngOnInit\`** — один раз, после первого \`ngOnChanges\`. Входы уже установлены — здесь стартуют запросы и подписки.
4. **\`ngDoCheck\`** — на каждом проходе CD. Место для собственной, ручной проверки изменений.
5. **\`ngAfterContentInit\`** — один раз, после того как спроецированный через \`ng-content\` контент вставлен.
6. **\`ngAfterContentChecked\`** — на каждом CD после проверки контента.
7. **\`ngAfterViewInit\`** — один раз, после инициализации **собственного вида и всех дочерних**. Здесь уже доступны \`@ViewChild\`.
8. **\`ngAfterViewChecked\`** — на каждом CD после проверки вида.
9. **\`ngOnDestroy\`** — при уничтожении: отписки, таймеры, освобождение ресурсов.

## Пример

\`\`\`ts
@ViewChild('box') box!: ElementRef;

ngOnInit() {
  // this.box здесь ещё undefined (static: false)
}

ngAfterViewInit() {
  console.log(this.box.nativeElement); // вот тут уже есть
}
\`\`\`

Почему так: запрос с \`static: false\` резолвится только после того, как вид построен. Со \`static: true\` элемент доступен уже в \`ngOnInit\`, но только если он не внутри \`@if\`/\`@for\` — иначе на момент \`ngOnInit\` его просто не существует.

## Ключевые нюансы

- **Content и View — не одно и то же.** Content — это спроецированные дети из \`<ng-content>\`, они пришли снаружи. View — ваш собственный шаблон. Content инициализируется **раньше** view.
- **Дети раньше родителя.** \`ngAfterViewInit\` родителя срабатывает **после** \`ngAfterViewInit\` детей — для view-хуков порядок восходящий.
- **Менять состояние в \`...Checked\` и \`...ViewInit\` рискованно** — это прямой путь к \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **В современном Angular** появились \`afterRender\` и \`afterNextRender\` для работы с DOM после рендера — они закрывают часть сценариев \`ngAfterViewInit\`, а \`computed\`/\`effect\` вытесняют \`ngOnChanges\` для производных значений.

## Что сказать на собеседовании

> Порядок такой: \`constructor\`, где работает только DI; \`ngOnChanges\` перед \`ngOnInit\` и на каждое изменение входа с объектом \`SimpleChanges\`; \`ngOnInit\` один раз, когда входы уже установлены; \`ngDoCheck\` на каждом цикле change detection; затем контентные \`ngAfterContentInit\` и \`ngAfterContentChecked\`, потом вьюшные \`ngAfterViewInit\` и \`ngAfterViewChecked\`; в конце \`ngOnDestroy\`. Принципиально, что контент — это спроецированные через \`ng-content\` дети, и он инициализируется раньше собственного вида, а вьюшные хуки идут снизу вверх: у родителя \`ngAfterViewInit\` срабатывает после детей. Отсюда: \`@ViewChild\` со \`static: false\` доступен только в \`ngAfterViewInit\`.

## Ловушки

- **\`@ViewChild\` в \`ngOnInit\`** — \`undefined\`, если \`static: false\`.
- **\`static: true\` не работает для элементов внутри \`@if\`/\`@for\`** — их на момент \`ngOnInit\` нет.
- **\`ngOnChanges\` не вызывается при мутации объекта** — только при смене ссылки на вход.
- **\`ngDoCheck\` вызывается очень часто** — тяжёлая логика там убивает производительность.
- **\`ngOnDestroy\` не вызывается** для сервисов вне DI-скоупа и при жёсткой перезагрузке страницы — на него нельзя вешать критичное сохранение.
- **Спросят следом**: почему content-хуки раньше view-хуков и в каком порядке хуки идут у родителя и ребёнка.`,
      en: `## In short

Hooks are agreed-upon moments when Angular gives you the floor: "the object exists", "the inputs arrived", "the content is in place", "the view is rendered", "I'm tearing this down". The order is strict and worth knowing by heart.

The analogy: assembling flat-pack furniture. First you open the box (\`constructor\` — no parts laid out yet). Then you sort the pieces (\`ngOnChanges\` — the inputs arrived). Then the first assembly (\`ngOnInit\`). You slot in the shelves the customer shipped separately — that is projected content. And only at the end do you screw on the front panel and see the finished wardrobe — your own view.

## The order of calls

1. **\`constructor\`** — DI runs. No inputs yet, no view.
2. **\`ngOnChanges\`** — only if the component has \`@Input\`s. It fires **before** \`ngOnInit\` and then on every input change, handing you a \`SimpleChanges\` object.
3. **\`ngOnInit\`** — once, after the first \`ngOnChanges\`. Inputs are set — this is where requests and subscriptions start.
4. **\`ngDoCheck\`** — on every CD pass. The place for your own manual change detection.
5. **\`ngAfterContentInit\`** — once, after content projected through \`ng-content\` has been inserted.
6. **\`ngAfterContentChecked\`** — on every CD after the content has been checked.
7. **\`ngAfterViewInit\`** — once, after **its own view and all child views** are initialized. \`@ViewChild\` is available here.
8. **\`ngAfterViewChecked\`** — on every CD after the view has been checked.
9. **\`ngOnDestroy\`** — on teardown: unsubscribe, clear timers, release resources.

## Example

\`\`\`ts
@ViewChild('box') box!: ElementRef;

ngOnInit() {
  // this.box is still undefined here (static: false)
}

ngAfterViewInit() {
  console.log(this.box.nativeElement); // available now
}
\`\`\`

Why: a query with \`static: false\` resolves only after the view has been built. With \`static: true\` the element is already there in \`ngOnInit\` — but only if it is not inside an \`@if\`/\`@for\`, since then it simply does not exist yet.

## Key nuances

- **Content and view are not the same thing.** Content is the projected children from \`<ng-content>\`, handed in from outside. The view is your own template. Content initializes **before** the view.
- **Children before the parent.** A parent's \`ngAfterViewInit\` fires **after** its children's — view hooks run bottom-up.
- **Changing state in the \`...Checked\` and \`...ViewInit\` hooks is risky** — it is the direct route to \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **Modern Angular** added \`afterRender\` and \`afterNextRender\` for DOM work after render, covering part of what \`ngAfterViewInit\` was used for, while \`computed\`/\`effect\` displace \`ngOnChanges\` for derived values.

## What to say in the interview

> The order is: \`constructor\`, where only DI happens; \`ngOnChanges\` before \`ngOnInit\` and on every input change with a \`SimpleChanges\` object; \`ngOnInit\` once, when the inputs are already set; \`ngDoCheck\` on every change detection cycle; then the content hooks \`ngAfterContentInit\` and \`ngAfterContentChecked\`, and after them the view hooks \`ngAfterViewInit\` and \`ngAfterViewChecked\`; finally \`ngOnDestroy\`. The essential point is that content means children projected through \`ng-content\` and it initializes before the component's own view, while view hooks run bottom-up: a parent's \`ngAfterViewInit\` fires after its children's. The practical consequence is that a \`@ViewChild\` with \`static: false\` is only available in \`ngAfterViewInit\`.

## Gotchas

- **\`@ViewChild\` in \`ngOnInit\`** is \`undefined\` when \`static: false\`.
- **\`static: true\` does not work for elements inside \`@if\`/\`@for\`** — they do not exist at \`ngOnInit\` time.
- **\`ngOnChanges\` does not fire when you mutate an object** — only when the input reference changes.
- **\`ngDoCheck\` runs extremely often** — heavy logic there destroys performance.
- **\`ngOnDestroy\` is not called** for services outside a DI scope, nor on a hard page reload — never hang critical persistence on it.
- **Expect the follow-up**: why content hooks precede view hooks, and in what order hooks fire between parent and child.`,
    },
    codeSnippet: `// View-child query is ready only in ngAfterViewInit (static: false)
@ViewChild('box') box!: ElementRef;
ngAfterViewInit() { console.log(this.box.nativeElement); }
// Content is ready earlier — in ngAfterContentInit.`,
  },
  {
    id: 'ng-015',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['lifecycle-hooks', 'after-render', 'ssr'],
    question: {
      ru: 'Чем afterRender и afterNextRender отличаются от ngAfterViewInit и когда их применять?',
      en: 'How do afterRender and afterNextRender differ from ngAfterViewInit and when should you use them?',
    },
    answer: {
      ru: `## Коротко

\`ngAfterViewInit\` говорит «мой шаблон готов», но **не** говорит «весь DOM приложения отрисован и layout устоялся». Плюс при SSR он выполняется **на сервере**, где никаких размеров и \`getBoundingClientRect\` в принципе не существует. \`afterRender\` и \`afterNextRender\` закрывают ровно эту дыру: они срабатывают после реального рендера и **только в браузере**.

Аналогия: \`ngAfterViewInit\` — это «я свою стену покрасил». А \`afterNextRender\` — «весь ремонт в квартире закончен, можно вносить мебель и мерить, влезет ли диван». Мерить рулеткой посреди ремонта бессмысленно.

## Как это работает по шагам

1. \`afterNextRender(fn)\` регистрирует колбэк, который выполнится **один раз** после **следующего** рендера — и никогда на сервере.
2. \`afterRender(fn)\` регистрирует колбэк, который выполняется после **каждого** рендера: CD завершён, DOM обновлён.
3. Оба регистрируются в **injection-контексте** — в конструкторе или инициализаторе поля, а не как методы класса.
4. Оба принимают **фазы**, чтобы упорядочить работу с DOM и не устраивать layout thrashing. Порядок фаз: \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.
5. Angular группирует все колбэки по фазам: сначала выполняются все чтения, потом все записи — браузеру не приходится пересчитывать layout между каждой парой операций.

## Пример

\`\`\`ts
constructor() {
  // одноразовая инициализация DOM-библиотеки
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });

  // постоянная синхронизация с DOM, разложенная по фазам
  afterRender({
    read:  () => { this.height = el.offsetHeight; },
    write: () => { el.style.transform = '...'; },
  });
}
\`\`\`

Почему так: чтение \`offsetHeight\` заставляет браузер посчитать layout. Если чередовать чтение и запись вручную, каждый цикл вызывает reflow. Разделение на фазы \`read\` и \`write\` собирает однотипные операции вместе и убирает лишние пересчёты.

## Когда что использовать

- **Измерения DOM** (\`getBoundingClientRect\`, \`offsetHeight\`) — \`afterNextRender\` для разового, \`afterRender\` с фазой \`read\` для постоянного.
- **Инициализация сторонних библиотек**, которым нужен готовый DOM: чарты, карты, редакторы — \`afterNextRender\`.
- **Фокус и скролл** после рендера — \`afterNextRender\`.
- **Постоянная синхронизация с DOM** — \`afterRender\`, но осторожно: он выполняется на каждый рендер и легко становится узким местом.

## Что сказать на собеседовании

> \`ngAfterViewInit\` гарантирует только инициализацию собственного вида, но не то, что весь DOM отрисован, и при SSR выполняется на сервере, где DOM-измерения невозможны. \`afterNextRender\` и \`afterRender\` решают обе проблемы: они выполняются после реального рендера и только в браузере. \`afterNextRender\` одноразовый — им инициализируют сторонние DOM-библиотеки; \`afterRender\` выполняется после каждого рендера, и с ним легко испортить производительность. Оба регистрируются в injection-контексте и принимают фазы \`earlyRead\`, \`write\`, \`mixedReadWrite\` и \`read\`, которые группируют чтения и записи и избавляют от layout thrashing.

## Ловушки

- **Вызов не в injection-контексте** — ошибка; регистрируйте в конструкторе или передавайте \`injector\`.
- **Тяжёлая логика в \`afterRender\`** выполняется на каждый рендер и убивает производительность.
- **Смешивание чтения и записи в одной фазе** возвращает layout thrashing, ради которого фазы и вводились.
- **На сервере колбэки не выполняются вообще** — не кладите туда логику, от которой зависит серверная разметка.
- **Это не замена \`ngOnDestroy\`** — очистку сторонней библиотеки всё равно писать отдельно.
- **Спросят следом**: почему \`ngAfterViewInit\` опасен при SSR и что такое layout thrashing.`,
      en: `## In short

\`ngAfterViewInit\` says "my template is ready", but it does **not** say "the whole app DOM is painted and layout has settled". On top of that, under SSR it runs **on the server**, where sizes and \`getBoundingClientRect\` simply do not exist. \`afterRender\` and \`afterNextRender\` close exactly that gap: they fire after a real render and **only in the browser**.

The analogy: \`ngAfterViewInit\` is "I finished painting my wall". \`afterNextRender\` is "the whole flat is renovated, you can move the furniture in and measure whether the sofa fits". Measuring with a tape mid-renovation is pointless.

## How it works, step by step

1. \`afterNextRender(fn)\` registers a callback that runs **once** after the **next** render — and never on the server.
2. \`afterRender(fn)\` registers a callback that runs after **every** render: CD is done, the DOM is updated.
3. Both are registered in an **injection context** — a constructor or a field initializer, not as class methods.
4. Both accept **phases** so DOM work is ordered and does not cause layout thrashing. The phase order is \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.
5. Angular groups all callbacks by phase: all reads first, then all writes — so the browser does not have to recalculate layout between every single pair of operations.

## Example

\`\`\`ts
constructor() {
  // one-shot initialization of a DOM library
  afterNextRender(() => {
    this.chart = new Chart(this.canvas.nativeElement);
  });

  // continuous DOM sync, split into phases
  afterRender({
    read:  () => { this.height = el.offsetHeight; },
    write: () => { el.style.transform = '...'; },
  });
}
\`\`\`

Why: reading \`offsetHeight\` forces the browser to compute layout. Interleaving reads and writes by hand triggers a reflow on every cycle. Splitting them into \`read\` and \`write\` phases batches like with like and removes the redundant recalculations.

## When to use which

- **DOM measurements** (\`getBoundingClientRect\`, \`offsetHeight\`) — \`afterNextRender\` for one-off, \`afterRender\` with the \`read\` phase for continuous.
- **Initializing third-party libraries** that need a real DOM: charts, maps, editors — \`afterNextRender\`.
- **Focus and scroll** after render — \`afterNextRender\`.
- **Continuous DOM sync** — \`afterRender\`, but carefully: it runs on every render and easily becomes the bottleneck.

## What to say in the interview

> \`ngAfterViewInit\` only guarantees that the component's own view is initialized, not that the whole application DOM is painted and layout is stable, and under SSR it runs on the server where DOM measurement is impossible. \`afterNextRender\` and \`afterRender\` solve both: they execute after a real render and only in the browser, so they are SSR-safe. \`afterNextRender\` is one-shot — you use it to initialize third-party DOM libraries, set focus, take a one-off measurement; \`afterRender\` runs after every render and is for continuous DOM synchronization, though it makes it easy to wreck performance. Both are registered in an injection context, usually the constructor, and both accept the \`earlyRead\`, \`write\`, \`mixedReadWrite\` and \`read\` phases, which batch reads and writes and thereby avoid layout thrashing. This is part of Angular's newer rendering approach, particularly important for zoneless and for SSR with hydration.

## Gotchas

- **Calling them outside an injection context** throws; register them in the constructor or pass an \`injector\`.
- **Heavy logic in \`afterRender\`** runs on every render and destroys performance.
- **Mixing reads and writes in one phase** brings back the very layout thrashing the phases exist to prevent.
- **The callbacks never run on the server** — do not put logic there that the server-rendered markup depends on.
- **They are not a replacement for \`ngOnDestroy\`** — tearing down a third-party library is still on you.
- **Expect the follow-up**: why \`ngAfterViewInit\` is dangerous under SSR, and what layout thrashing actually is.`,
    },
  },
  {
    id: 'ng-016',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['ivy', 'incremental-dom', 'aot'],
    question: {
      ru: 'Что такое Ivy и как incremental DOM с локальностью улучшают tree-shaking и компиляцию?',
      en: 'What is Ivy and how do incremental DOM and locality improve tree-shaking and compilation?',
    },
    answer: {
      ru: `## Коротко

Ivy — это движок компиляции и рендеринга Angular, дефолтный с версии 9. Главная идея: шаблон превращается не в данные, которые кто-то потом интерпретирует, а в **обычный JavaScript-код с инструкциями** — \`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\` и так далее, записанными прямо в код компонента.

Аналогия: Virtual DOM — это когда вы каждый раз рисуете полный новый план квартиры, сравниваете со старым и переставляете то, что отличается. Incremental DOM — это когда у вас на руках список конкретных команд: «повесь эту полку», «перепиши эту табличку». Второй план в памяти не нужен вовсе.

## Как это работает по шагам

1. Компилятор берёт шаблон компонента и генерирует функцию с двумя наборами инструкций: **create** и **update**.
2. При первом рендере выполняются create-инструкции — они создают реальные DOM-узлы.
3. При каждом проходе change detection выполняются update-инструкции: они сравнивают значения и точечно правят DOM.
4. Промежуточного VDOM-дерева в памяти **нет** вообще — отсюда меньший расход памяти.
5. Каждая инструкция — это отдельная импортируемая функция, а значит бандлер видит, что реально используется, и выбрасывает остальное.

## Локальность (locality)

Компилятор Ivy компилирует каждый компонент **независимо**, опираясь только на его собственные декораторы, без глобального анализа всего приложения. Следствия:

- Быстрая **инкрементальная** пересборка: поменяли один компонент — пересобрался он один.
- Библиотеки можно публиковать в **частично скомпилированном** виде.
- Лучше совместимость со сборщиками и инструментами.

## Пример

\`\`\`ts
// Примерно во что компилятор превращает шаблон
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}
\`\`\`

Почему так: \`rf\` — это флаг «что сейчас делаем». На первом проходе выполняется только create-часть, на всех последующих — только update. Один и тот же код обслуживает и создание, и обновление.

## Что сказать на собеседовании

> Ivy — движок компиляции и рендеринга Angular, ставший дефолтным в девятой версии. Компилятор превращает шаблон в набор инструкций incremental DOM, которые эмитятся прямо в код компонента: create-инструкции для первого рендера и update-инструкции на каждом проходе change detection. Промежуточное дерево, как в Virtual DOM, не строится, а поскольку инструкции — обычные импортируемые функции, бандлер тришейкает всё неиспользуемое. Второй принцип — локальность: каждый компонент компилируется независимо, что даёт быструю инкрементальную пересборку.

## Ловушки

- **Ivy — не Virtual DOM.** Путать incremental DOM с диффингом React — типичная ошибка на собеседовании.
- **Instructions с префиксом \`ɵɵ\` — приватный API.** Знать полезно, использовать нельзя.
- **Tree-shaking работает не магически**: динамические импорты и побочные эффекты в модулях легко его ломают.
- **AOT ловит ошибки шаблонов на сборке** — поэтому dev-сборка может падать там, где раньше JIT молчал до рантайма.
- **Локальность не отменяет типовых зависимостей**: несовместимая версия библиотеки всё равно сломает сборку.
- **Спросят следом**: чем incremental DOM отличается от VDOM по памяти и почему именно локальность ускорила пересборку.`,
      en: `## In short

Ivy is Angular's compilation and rendering engine, the default since v9. The core idea: a template is turned not into data that something later interprets, but into **plain JavaScript code made of instructions** — \`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\` and so on, emitted straight into the component's code.

The analogy: Virtual DOM is drawing a complete new floor plan every time, comparing it with the old one and moving whatever differs. Incremental DOM is holding a list of concrete commands: "hang this shelf", "rewrite this label". No second plan in memory is needed at all.

## How it works, step by step

1. The compiler takes the component template and generates a function with two sets of instructions: **create** and **update**.
2. On the first render the create-instructions run and build the real DOM nodes.
3. On every change detection pass the update-instructions run: they compare values and patch the DOM surgically.
4. There is **no intermediate VDOM tree** in memory at all — hence the lower memory footprint.
5. Every instruction is a separate importable function, so the bundler sees what is actually used and drops the rest.

## Locality

The Ivy compiler compiles each component **independently**, relying only on its own decorators, with no global analysis of the app. Consequences:

- Fast **incremental** rebuilds: change one component and only that component recompiles.
- Libraries can ship **partially compiled**.
- Better compatibility with bundlers and tooling.

## Example

\`\`\`ts
// Roughly what the compiler turns a template into
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}
\`\`\`

Why: \`rf\` is the "what are we doing right now" flag. On the first pass only the create half runs; on every subsequent pass only the update half. One function serves both creation and updating.

## What to say in the interview

> Ivy is Angular's compilation and rendering engine, which became the default in v9. The compiler turns a template into a set of incremental-DOM instructions emitted directly into the component's code: create instructions for the first render, and update instructions that run on every change detection pass and patch the DOM surgically. Unlike Virtual DOM no intermediate tree is built in memory, so memory usage is lower, and because the instructions are ordinary imported functions the bundler tree-shakes whatever is unused — functionality you never touch simply never enters the bundle. The second key principle is locality: each component compiles independently, from its own decorators alone, with no global analysis, which gives fast incremental rebuilds and lets libraries ship partially compiled. And third, Ivy made AOT compilation the default, dev included, so templates are compiled ahead of time, errors surface at build time, no runtime compiler ships in the bundle, and templates get type checking.

## Gotchas

- **Ivy is not Virtual DOM.** Confusing incremental DOM with React-style diffing is a classic interview slip.
- **The \`ɵɵ\`-prefixed instructions are private API.** Worth knowing about, never worth calling.
- **Tree-shaking is not magic**: dynamic imports and module-level side effects break it easily.
- **AOT catches template errors at build time** — so a dev build can now fail where JIT used to stay quiet until runtime.
- **Locality does not remove type dependencies**: an incompatible library version still breaks the build.
- **Expect the follow-up**: how incremental DOM compares with VDOM on memory, and why locality specifically made rebuilds faster.`,
    },
    codeSnippet: `// Ivy emits incremental-DOM instructions per component
function TmplFn(rf, ctx) {
  if (rf & 1) { elementStart(0, 'p'); text(1); elementEnd(); } // create
  if (rf & 2) { textInterpolate(ctx.name); }                   // update
}`,
  },
  {
    id: 'ng-017',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['standalone', 'modules', 'modern-angular'],
    question: {
      ru: 'Что такое standalone-компоненты и какие преимущества они дают по сравнению с NgModule?',
      en: 'What are standalone components and what advantages do they offer over NgModule?',
    },
    answer: {
      ru: `## Коротко

Standalone-компонент объявляет свои зависимости **сам** — через свойство \`imports\` в декораторе, без регистрации в \`NgModule\`. С Angular 19 \`standalone: true\` стало значением по умолчанию, писать флаг не нужно.

Аналогия: \`NgModule\` — это общая кладовка на этаж. Чтобы понять, чем пользуется конкретная комната, надо идти читать список кладовки и гадать, что из этого кому нужно. Standalone — это рюкзак: всё, чем пользуется компонент, лежит прямо у него, видно с первого взгляда, и ничего лишнего нести не приходится.

## Что меняется

1. **Нет \`declarations\` и \`exports\`.** Компонент перечисляет в \`imports\` то, что реально использует в шаблоне.
2. **Bootstrap без модулей**: \`bootstrapApplication(AppComponent, { providers: [...] })\` вместо корневого \`AppModule\`.
3. **Вместо \`forRoot()\`** появились функции \`provide*\`: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\` и другие. Они tree-shakable и компонуемы.
4. **Lazy loading упростился**: \`loadComponent\` грузит один компонент, без модуля-обёртки.
5. **Тесты проще**: компонент импортируется в \`TestBed\` напрямую.

## Пример

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [RouterLink],
  template: '...',
})
export class CardComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

Почему так: зависимости объявлены там же, где используются. Компилятору не нужно искать по всему приложению, кто и что задекларировал, а вам не нужно отвечать на вопрос «в каком модуле объявлен этот компонент».

## Совместимость и миграция

Standalone и \`NgModule\` **сосуществуют**: standalone-компонент импортируется в \`NgModule\` через \`imports\`, а \`NgModule\` — в standalone-компонент. Поэтому мигрировать можно постепенно, кусками. Есть автоматический schematic: \`ng generate @angular/core:standalone\`. \`NgModule\` не исчез, но для нового кода считается legacy.

## Что сказать на собеседовании

> Standalone-компонент сам объявляет свои зависимости через \`imports\` в декораторе и не нуждается в регистрации в \`NgModule\`; с Angular 19 это поведение по умолчанию. Практически это убирает \`declarations\` и модули-обёртки и упрощает ленивую загрузку — \`loadComponent\` грузит один компонент без модуля. Приложение поднимается через \`bootstrapApplication\` с массивом провайдеров, а вместо \`forRoot\` используются функции \`provide*\` вроде \`provideRouter\` и \`provideHttpClient\`. Standalone и \`NgModule\` совместимы в обе стороны, поэтому проекты мигрируют постепенно, в том числе автоматическим schematic; для нового кода \`NgModule\` — legacy.

## Ловушки

- **Забыли добавить в \`imports\`** то, что используется в шаблоне — ошибка компиляции про неизвестный элемент или пайп.
- **Тянут весь \`CommonModule\`** там, где достаточно нового control flow и пары пайпов.
- **\`providers\` в компоненте — экземпляр на компонент**, а не синглтон; для общего состояния нужен корневой провайдер.
- **Дублирование \`imports\`** по десяткам компонентов — признак, что пора выносить общий кусок в отдельный компонент или директиву.
- **Смешанный проект** требует внимания: один и тот же компонент, попавший и в \`NgModule\`, и в standalone-импорт, легко даёт путаницу.
- **Спросят следом**: чем \`provide*\`-функции лучше \`forRoot()\` и как теперь устроен lazy loading роутов.`,
      en: `## In short

A standalone component declares its dependencies **itself** — through the \`imports\` property of the decorator, with no \`NgModule\` registration. Since Angular 19 \`standalone: true\` is the default and the flag no longer needs writing.

The analogy: an \`NgModule\` is a shared storage room on the floor. To find out what one particular room actually uses, you have to go read the storage inventory and guess who needs what. Standalone is a backpack: everything the component uses sits right on it, visible at a glance, and nothing extra gets carried around.

## What changes

1. **No \`declarations\`, no \`exports\`.** The component lists in \`imports\` exactly what its template uses.
2. **Bootstrap without modules**: \`bootstrapApplication(AppComponent, { providers: [...] })\` instead of a root \`AppModule\`.
3. **Instead of \`forRoot()\`** there are \`provide*\` functions: \`provideRouter\`, \`provideHttpClient\`, \`provideStore\` and friends. They are tree-shakable and composable.
4. **Lazy loading got simpler**: \`loadComponent\` loads a single component with no wrapper module.
5. **Tests get easier**: the component is imported into \`TestBed\` directly.

## Example

\`\`\`ts
@Component({
  selector: 'app-card',
  imports: [RouterLink],
  template: '...',
})
export class CardComponent {}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
});
\`\`\`

Why: dependencies are declared where they are used. The compiler no longer has to scan the whole app for who declared what, and you no longer have to answer "which module is this component declared in".

## Compatibility and migration

Standalone and \`NgModule\` **coexist**: a standalone component can be imported into an \`NgModule\` via \`imports\`, and an \`NgModule\` into a standalone component. So migration can happen gradually, piece by piece. There is an automatic schematic: \`ng generate @angular/core:standalone\`. \`NgModule\` has not disappeared, but for new code it is considered legacy.

## What to say in the interview

> A standalone component declares its own dependencies through \`imports\` in the decorator and needs no \`NgModule\` registration; as of Angular 19 that is the default. In practice this removes \`declarations\`, \`exports\` and wrapper modules, makes dependencies explicit right in the component — better for readability and for tree-shaking — and simplifies lazy loading, since \`loadComponent\` loads a single component without a module. The application boots through \`bootstrapApplication\` with a providers array, and instead of module-level \`forRoot\` you use \`provide*\` functions such as \`provideRouter\` and \`provideHttpClient\`, which are tree-shakable and compose well. An important practical point is that standalone and \`NgModule\` are fully interoperable in both directions, so large projects migrate incrementally, including via the automatic schematic. For new code \`NgModule\` is considered legacy.

## Gotchas

- **Forgetting to add something to \`imports\`** that the template uses gives a compile error about an unknown element or pipe.
- **Pulling in the whole \`CommonModule\`** where the new control flow plus a couple of pipes would do.
- **\`providers\` on a component is per-instance**, not a singleton; shared state needs a root provider.
- **The same \`imports\` list duplicated across dozens of components** is a sign the shared part should become its own component or directive.
- **A mixed project needs care**: the same component reachable both through an \`NgModule\` and a standalone import breeds confusion.
- **Expect the follow-up**: why \`provide*\` functions beat \`forRoot()\`, and how route-level lazy loading works now.`,
    },
  },
  {
    id: 'ng-018',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['control-flow', 'if', 'for', 'track'],
    question: {
      ru: 'Чем новый control flow (@if/@for/@switch) лучше структурных директив *ngIf/*ngFor?',
      en: 'How is the new control flow (@if/@for/@switch) better than the structural directives *ngIf/*ngFor?',
    },
    answer: {
      ru: `## Коротко

С Angular 17 условия и циклы стали **частью языка шаблонов**, а не директивами, которые надо импортировать. \`@if\`, \`@for\`, \`@switch\` понимает сам компилятор.

Аналогия: раньше, чтобы поставить в комнате перегородку, вы вызывали подрядчика (директиву \`NgIf\`), заключали с ним договор (импорт \`CommonModule\`) и он приносил свои инструменты. Теперь перегородка предусмотрена в самом проекте здания: ничего не нужно ни звать, ни привозить, и делается она быстрее.

## Что даёт новый синтаксис

1. **Производительность.** Control flow встроен в компилятор, директивы грузить не нужно, а \`@for\` использует более быстрый алгоритм согласования DOM. Бенчмарки показывают улучшение до 90% в отдельных сценариях.
2. **\`track\` обязателен.** В \`@for\` его нельзя не написать — это убирает классическую ошибку с забытым \`trackBy\` и баги с пересозданием DOM.
3. **Блок \`@empty\`.** Пустой список обрабатывается встроенно, без отдельного \`*ngIf\`.
4. **Меньше бандл.** Не нужно импортировать \`CommonModule\`, \`NgIf\`, \`NgForOf\`.
5. **Читаемость.** \`@else if\` вместо вложенных \`ng-template\` с \`ngIfElse\`.

## Пример

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

Почему так: \`track item.id\` задаёт **идентичность** элементов. При изменении массива Angular по этому ключу понимает, какие узлы переиспользовать, какие переместить, а какие удалить, вместо того чтобы пересоздавать весь список. Для объектов берут стабильный \`id\`, для примитивов подходит \`track $index\`.

## Миграция

Старые \`*ngIf\` и \`*ngFor\` продолжают работать — ломать ничего не нужно. Автоматически переписать код помогает schematic \`ng generate @angular/core:control-flow\`. Новый синтаксис — рекомендованный для нового кода.

## Что сказать на собеседовании

> Начиная с Angular 17 control flow встроен в шаблонный язык: \`@if\`, \`@for\` и \`@switch\` понимает компилятор, поэтому не нужно импортировать \`CommonModule\`, и бандл получается меньше. \`@for\` быстрее за счёт нового алгоритма согласования DOM и требует обязательного \`track\`, задающего идентичность элементов: по нему Angular решает, какие узлы переиспользовать, а какие удалить; для объектов это стабильный идентификатор, для примитивов допустим \`$index\`. Обязательность \`track\` лечит классическую ошибку забытого \`trackBy\`. Появился и блок \`@empty\` для пустых списков.

## Ловушки

- **\`track $index\` для объектов** ломает переиспользование при вставке в середину — берите стабильный \`id\`.
- **Нестабильный \`track\`** (например, ключ по случайному значению) пересоздаёт DOM целиком и убивает производительность.
- **\`@if (user(); as u)\`** — переменная \`u\` видна только внутри блока, не в \`@else\`.
- **Новый синтаксис не работает в компонентах без нужной версии Angular** — это не полифилл, а фича компилятора.
- **\`@for\` не поддерживает старые \`ngForOf\`-переменные напрямую** — вместо них \`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\`.
- **Спросят следом**: что именно делает \`track\` внутри и почему \`trackBy\` так часто забывали.`,
      en: `## In short

Since Angular 17 conditionals and loops are **part of the template language** rather than directives you have to import. \`@if\`, \`@for\` and \`@switch\` are understood by the compiler itself.

The analogy: to put up a partition wall you used to call a contractor (the \`NgIf\` directive), sign a contract (import \`CommonModule\`) and wait for them to bring their tools. Now the partition is part of the building's design: nobody to call, nothing to deliver, and it goes up faster.

## What the new syntax buys you

1. **Performance.** Control flow is built into the compiler, no directives to load, and \`@for\` uses a faster DOM reconciliation algorithm. Benchmarks show up to a 90% improvement in some scenarios.
2. **\`track\` is mandatory.** You cannot omit it in \`@for\` — which eliminates the classic forgotten-\`trackBy\` mistake and the DOM-recreation bugs that came with it.
3. **The \`@empty\` block.** Empty lists are handled natively, without a separate \`*ngIf\`.
4. **Smaller bundle.** No need to import \`CommonModule\`, \`NgIf\`, \`NgForOf\`.
5. **Readability.** A real \`@else if\` instead of nested \`ng-template\` with \`ngIfElse\`.

## Example

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

Why: \`track item.id\` defines element **identity**. When the array changes Angular uses that key to work out which nodes to reuse, which to move and which to remove, instead of rebuilding the whole list. Use a stable \`id\` for objects; \`track $index\` is fine for primitives.

## Migration

The old \`*ngIf\` and \`*ngFor\` keep working — nothing has to be broken. The schematic \`ng generate @angular/core:control-flow\` rewrites the old directives automatically. The new syntax is the recommendation for new code.

## What to say in the interview

> From Angular 17 control flow is built into the template language: \`@if\`, \`@for\` and \`@switch\` are handled by the compiler, so \`CommonModule\` and its directives no longer need importing and the bundle gets smaller. \`@for\` is faster thanks to a new DOM reconciliation algorithm and requires a mandatory \`track\`, which defines element identity — Angular uses it to decide which nodes to reuse, move or remove rather than recreating the list; for objects that means a stable identifier, for primitives \`$index\` is acceptable. Making \`track\` mandatory is precisely what fixes the classic forgotten-\`trackBy\` bug. On top of that come conveniences: an \`@empty\` block for empty lists and a proper \`@else if\` instead of nested \`ng-template\`. The old structural directives still work, and there is an automatic schematic for migrating.

## Gotchas

- **\`track $index\` on objects** breaks reuse when items are inserted in the middle — use a stable \`id\`.
- **An unstable \`track\`** (a key derived from a random value, say) recreates the whole DOM and destroys performance.
- **\`@if (user(); as u)\`** — the alias \`u\` is only visible inside that block, not in \`@else\`.
- **The syntax needs a recent enough Angular** — it is a compiler feature, not a polyfill.
- **\`@for\` does not take the old \`ngForOf\` variables directly** — use \`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\`.
- **Expect the follow-up**: what \`track\` actually does internally, and why \`trackBy\` was forgotten so often.`,
    },
  },
  {
    id: 'ng-019',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['control-flow', 'defer', 'lazy-loading', 'performance'],
    question: {
      ru: 'Как работает @defer и какие триггеры и плейсхолдеры он поддерживает?',
      en: 'How does @defer work and what triggers and placeholders does it support?',
    },
    answer: {
      ru: `## Коротко

\`@defer\` (Angular 17+) — это ленивая загрузка **куска шаблона**. Всё, что внутри блока, вместе с его зависимостями (компоненты, директивы, пайпы) уезжает в отдельный JS-чанк и грузится только когда сработает триггер. По сути это декларативный code-splitting на уровне разметки.

Аналогия: тяжёлые чемоданы не тащат в самолёт заранее — их поднимают в багажный отсек только когда пассажир реально пришёл на рейс. А чтобы не ждать, багаж можно начать грузить заранее, пока грузчики простаивают, — это \`prefetch\`.

## Как это работает по шагам

1. Компилятор видит блок \`@defer\` и **выносит его зависимости в отдельный чанк**, создавая для них динамический \`import()\`.
2. Сразу рендерится блок \`@placeholder\` — он загружается вместе с основным бандлом (eager).
3. Срабатывает триггер, и Angular начинает грузить чанк.
4. Пока чанк грузится, показывается \`@loading\`. Параметр \`after\` откладывает его показ, \`minimum\` не даёт ему мелькнуть на долю секунды.
5. Чанк загрузился — содержимое \`@defer\` рендерится вместо плейсхолдера. Если загрузка упала, показывается \`@error\`.

## Триггеры

- \`on idle\` — по умолчанию, через \`requestIdleCallback\`.
- \`on viewport\` — когда элемент попал в область видимости (\`IntersectionObserver\`).
- \`on interaction\` — клик или фокус по плейсхолдеру.
- \`on hover\` — наведение мыши.
- \`on timer(2s)\` — через заданное время.
- \`on immediate\` — сразу после рендера.
- \`when condition\` — по выражению или сигналу.

На конкретный элемент можно сослаться: \`on viewport(triggerRef)\`. И загрузку можно отделить от показа: \`@defer (on interaction; prefetch on idle)\` — грузим, пока браузер простаивает, показываем по клику.

## Пример

\`\`\`html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

Почему так: \`after 100ms\` не показывает спиннер вообще, если чанк приехал быстро — не мигаем зря. А \`minimum 1s\` гарантирует, что уж если спиннер показали, он не исчезнет через 50 мс, дёрнув глаз пользователя.

## Что сказать на собеседовании

> \`@defer\` — это встроенный в шаблон декларативный code-splitting: компилятор выносит зависимости блока в отдельный чанк и создаёт для них динамический \`import()\`, поэтому ни роутер, ни ручной \`loadComponent\` не нужны. Рядом живут \`@placeholder\`, \`@loading\` с параметрами \`after\` и \`minimum\` против мигания спиннера и \`@error\`. Триггеров несколько: \`on idle\` по умолчанию, \`on viewport\` через \`IntersectionObserver\`, \`on interaction\`, \`on hover\` и \`when\` по произвольному условию. Есть \`prefetch\`: загрузку чанка можно начать раньше показа — грузить в простое, показывать по клику.

## Ловушки

- **Зависимости, использованные и вне \`@defer\`, в отдельный чанк не уедут** — выигрыша не будет.
- **Слишком мелкие блоки** дают много крошечных чанков и лишние сетевые запросы.
- **\`@placeholder\` грузится eager** — тяжёлый плейсхолдер обнуляет весь смысл.
- **\`on viewport\` без \`@placeholder\`** не к чему привязать наблюдение — плейсхолдер нужен.
- **Без \`@error\` пользователь увидит пустоту** при обрыве сети.
- **Спросят следом**: чем \`@defer\` отличается от \`loadComponent\` в роуте и как он ведёт себя при SSR.`,
      en: `## In short

\`@defer\` (Angular 17+) is lazy loading for a **slice of the template**. Everything inside the block, together with its dependencies (components, directives, pipes), moves into a separate JS chunk that is fetched only when a trigger fires. It is declarative code-splitting at the markup level.

The analogy: heavy suitcases are not hauled onto the plane in advance — they go into the hold when the passenger actually shows up for the flight. And to avoid the wait, the loading can start early while the handlers are idle — that is \`prefetch\`.

## How it works, step by step

1. The compiler sees the \`@defer\` block and **splits its dependencies into a separate chunk**, generating a dynamic \`import()\` for them.
2. The \`@placeholder\` block renders immediately — it ships with the main bundle (eagerly).
3. The trigger fires and Angular starts fetching the chunk.
4. While it loads, \`@loading\` is shown. The \`after\` parameter delays showing it; \`minimum\` stops it flashing for a fraction of a second.
5. The chunk arrives and the \`@defer\` content replaces the placeholder. If the fetch fails, \`@error\` is rendered.

## Triggers

- \`on idle\` — the default, via \`requestIdleCallback\`.
- \`on viewport\` — when the element enters the viewport (\`IntersectionObserver\`).
- \`on interaction\` — a click or focus on the placeholder.
- \`on hover\` — mouse hover.
- \`on timer(2s)\` — after a delay.
- \`on immediate\` — right after render.
- \`when condition\` — driven by an expression or signal.

You can point a trigger at a specific element: \`on viewport(triggerRef)\`. And loading can be decoupled from display: \`@defer (on interaction; prefetch on idle)\` — fetch while the browser is idle, show on click.

## Example

\`\`\`html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

Why: \`after 100ms\` skips the spinner entirely when the chunk arrives quickly — no pointless flicker. And \`minimum 1s\` guarantees that once a spinner is shown it will not vanish 50 ms later and make the user's eye twitch.

## What to say in the interview

> \`@defer\` is declarative code-splitting built into the template: the compiler moves the block's dependencies into a separate chunk and creates a dynamic \`import()\` for them, so neither the router nor a manual \`loadComponent\` is involved. Alongside it sit \`@placeholder\`, which renders eagerly and is displayed until the trigger fires, \`@loading\` with its \`after\` and \`minimum\` parameters for controlling spinner flicker, and \`@error\` for a failed fetch. There are several triggers: \`on idle\` by default, \`on viewport\` via \`IntersectionObserver\`, \`on interaction\`, \`on hover\`, \`on timer\`, \`on immediate\` and \`when\` for an arbitrary condition, and a trigger can be bound to a specific element. Worth mentioning separately is \`prefetch\`: chunk loading can start before display — fetch while idle, show on click. And \`@defer\` works correctly with SSR and hydration: the server renders the placeholder, and on the client the triggers drive what is shown.

## Gotchas

- **Dependencies also used outside the \`@defer\` block never leave the main chunk** — no win at all.
- **Blocks that are too granular** produce many tiny chunks and extra network round trips.
- **\`@placeholder\` ships eagerly** — a heavy placeholder defeats the whole purpose.
- **\`on viewport\` without a \`@placeholder\`** has nothing to observe — the placeholder is required.
- **Without \`@error\` the user sees nothing** when the network drops.
- **Expect the follow-up**: how \`@defer\` differs from route-level \`loadComponent\`, and how it behaves under SSR.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'guards', 'functional'],
    question: {
      ru: 'Как реализуются функциональные guards и resolvers в современном Angular?',
      en: 'How are functional guards and resolvers implemented in modern Angular?',
    },
    answer: {
      ru: `## Коротко

С Angular 14 guard и resolver — это **обычные функции**, а не классы с интерфейсами. Роутер вызывает их в **injection-контексте**, поэтому внутри спокойно работает \`inject()\`.

Аналогия: guard — это охранник на входе. Он либо пропускает (\`true\`), либо не пропускает (\`false\`), либо говорит «вам не сюда, вам вон в ту дверь» — и это \`UrlTree\`, то есть редирект. Resolver — это гардеробщик: он успевает принести ваши вещи **до** того, как вы вошли в зал, чтобы вам не пришлось стоять посреди комнаты и ждать.

## Как это устроено

1. Guard — функция нужного типа, например \`CanActivateFn\`, принимающая \`route\` и \`state\`.
2. Внутри через \`inject()\` берём любые сервисы — контекст инъекции роутер обеспечивает сам.
3. Возвращаем \`boolean\`, \`UrlTree\` для редиректа, либо \`Observable\`/\`Promise\` этих типов — роутер дождётся.
4. Подключаем прямо в конфиге маршрута: \`canActivate: [authGuard]\`.
5. Resolver устроен так же (\`ResolveFn<T>\`), но возвращает **данные**, и роутер не активирует маршрут, пока они не приедут.

## Типы guard

- **\`CanActivateFn\`** — можно ли зайти на маршрут.
- **\`CanActivateChildFn\`** — можно ли зайти на дочерние маршруты.
- **\`CanDeactivateFn<T>\`** — можно ли уйти с маршрута; классика — предупреждение о несохранённых изменениях.
- **\`CanMatchFn\`** — может ли маршрут вообще совпасть. Важно для ленивых и альтернативных маршрутов: он отрабатывает **до** загрузки чанка.

## Пример

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).getUser(route.params['id']);

// в конфиге
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

Почему так: возвращать \`UrlTree\` предпочтительнее, чем звать \`router.navigate\` внутри guard. \`UrlTree\` — это часть **того же** решения о навигации, роутер обработает его атомарно; императивный \`navigate\` запускает вторую навигацию поверх первой и порождает гонки. Данные резолвера потом читаются из \`route.data['user']\` или через \`ActivatedRoute\`.

## Что сказать на собеседовании

> С Angular 14 guard'ы и resolver'ы — функции, а не классы, и роутер выполняет их в injection-контексте, поэтому внутри работает \`inject()\`. Это убирает шаблонный код, даёт tree-shaking и упрощает тесты. Типов четыре: \`CanActivateFn\`, \`CanActivateChildFn\`, \`CanDeactivateFn\` и \`CanMatchFn\`, который решает, может ли маршрут совпасть, и потому срабатывает до загрузки ленивого чанка. Guard возвращает \`boolean\` или \`UrlTree\`, и для редиректа правильнее вернуть \`UrlTree\`, а не вызывать \`router.navigate\` — решение остаётся частью одной навигации. \`ResolveFn\` предзагружает данные до активации, они читаются из \`route.data\`.

## Ловушки

- **\`router.navigate\` внутри guard вместо \`UrlTree\`** — гонки навигаций и «мигающие» переходы.
- **Guard, возвращающий бесконечный \`Observable\`** без \`take(1)\`, подвесит навигацию навсегда.
- **Тяжёлый resolver задерживает переход** — пользователь видит старый экран и думает, что кнопка не сработала.
- **\`CanActivate\` не мешает загрузке lazy-чанка** — для этого нужен именно \`CanMatch\`.
- **\`inject()\` в guard работает только синхронно в теле функции** — внутри \`setTimeout\` контекста уже нет.
- **Спросят следом**: чем \`CanMatch\` отличается от \`CanActivate\` и почему resolver часто заменяют загрузкой в компоненте.`,
      en: `## In short

Since Angular 14 a guard and a resolver are **plain functions**, not classes implementing interfaces. The router calls them inside an **injection context**, so \`inject()\` works freely within.

The analogy: a guard is the doorman. He either lets you in (\`true\`), turns you away (\`false\`), or says "not here — through that door over there", which is a \`UrlTree\`, i.e. a redirect. A resolver is the cloakroom attendant: he fetches your things **before** you walk into the hall, so you are not left standing in the middle of the room waiting.

## How it is wired

1. A guard is a function of the right type — \`CanActivateFn\`, say — receiving \`route\` and \`state\`.
2. Inside, \`inject()\` gives you any service; the router provides the injection context itself.
3. You return a \`boolean\`, a \`UrlTree\` for a redirect, or an \`Observable\`/\`Promise\` of those — the router waits.
4. You wire it straight into the route config: \`canActivate: [authGuard]\`.
5. A resolver works the same way (\`ResolveFn<T>\`) but returns **data**, and the router will not activate the route until it arrives.

## Guard types

- **\`CanActivateFn\`** — may you enter this route.
- **\`CanActivateChildFn\`** — may you enter its children.
- **\`CanDeactivateFn<T>\`** — may you leave the route; the classic case is warning about unsaved changes.
- **\`CanMatchFn\`** — may this route match at all. Important for lazy and alternative routes: it runs **before** the chunk is fetched.

## Example

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).getUser(route.params['id']);

// in the config
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

Why: returning a \`UrlTree\` is preferable to calling \`router.navigate\` inside the guard. A \`UrlTree\` is part of the **same** navigation decision and the router handles it atomically, whereas an imperative \`navigate\` starts a second navigation on top of the first and creates races. Resolver data is then read from \`route.data['user']\` or through \`ActivatedRoute\`.

## What to say in the interview

> Since Angular 14 guards and resolvers are functions rather than classes implementing an interface, and the router executes them in an injection context so \`inject()\` works inside. That removes the \`@Injectable\`/\`providedIn\` boilerplate, gives tree-shaking, simplifies testing and lets guards be composed like ordinary functions. There are four types: \`CanActivateFn\` for entering a route, \`CanActivateChildFn\` for its children, \`CanDeactivateFn\` for leaving — typically unsaved-changes prompts — and \`CanMatchFn\`, which decides whether a route can match at all and therefore runs before a lazy chunk is fetched. A guard returns a \`boolean\`, a \`UrlTree\`, or an async wrapper around them, and for a redirect returning a \`UrlTree\` is the correct move rather than calling \`router.navigate\` imperatively, because the decision stays part of a single navigation. \`ResolveFn\` pre-fetches data before the route activates and it is read from \`route.data\`. Class-based guards are deprecated; \`mapToCanActivate\` exists for compatibility.

## Gotchas

- **\`router.navigate\` inside a guard instead of a \`UrlTree\`** causes navigation races and flickering transitions.
- **A guard returning an infinite \`Observable\`** without \`take(1)\` hangs navigation forever.
- **A slow resolver stalls the transition** — the user stares at the old screen and assumes the click did nothing.
- **\`CanActivate\` does not prevent the lazy chunk from loading** — that is precisely what \`CanMatch\` is for.
- **\`inject()\` in a guard only works synchronously in the function body** — inside a \`setTimeout\` the context is gone.
- **Expect the follow-up**: how \`CanMatch\` differs from \`CanActivate\`, and why resolvers are often replaced by loading inside the component.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['router', 'lazy-loading', 'load-component'],
    question: {
      ru: 'Как работает ленивая загрузка с loadComponent и loadChildren и что такое CanMatch для неё?',
      en: 'How does lazy loading work with loadComponent and loadChildren, and what is CanMatch for it?',
    },
    answer: {
      ru: `## Коротко

Ленивая загрузка — это когда код маршрута лежит в отдельном чанке и скачивается только при переходе на него. \`loadComponent\` грузит **один компонент**, \`loadChildren\` — **набор маршрутов**. А \`CanMatch\` решает, стоит ли вообще качать этот чанк.

Аналогия: библиотека. Вы не тащите домой все книги сразу — берёте ту, что нужна сейчас. \`CanMatch\` — это библиотекарь на входе: он смотрит на ваш читательский билет **до** того, как пойдёт за книгой в хранилище. Нет доступа — за книгой никто не пошёл, время и силы не потрачены.

## Как это работает

1. **\`loadComponent\`** — динамический \`import()\`, возвращающий один standalone-компонент. Чанк с компонентом и его зависимостями скачивается только при переходе на маршрут.
2. **\`loadChildren\`** — то же самое, но для набора маршрутов. Можно грузить массив \`Routes\` (standalone-стиль) или \`NgModule\` (legacy — механизм остался ради совместимости).
3. **\`CanMatchFn\`** определяет, **подходит ли маршрут вообще**. В отличие от \`CanActivate\`, он выполняется **до** загрузки чанка.
4. Если \`CanMatch\` вернул \`false\`, роутер **не грузит** чанк и пробует следующий маршрут с тем же путём. Это позволяет держать несколько разных маршрутов на одном пути.
5. **Preloading**: стратегии \`PreloadAllModules\` или собственные подключаются через \`withPreloading()\` и подтягивают ленивые чанки в фоне уже после старта приложения.

## Пример

\`\`\`ts
{
  path: 'profile',
  loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
},
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
},

// Один путь — разные экраны по роли
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

Почему так: обычному пользователю админский чанк не будет скачан вообще — \`CanMatch\` отсеет маршрут раньше, чем начнётся загрузка. С \`CanActivate\` чанк успел бы приехать и только потом получить отказ: трафик потрачен, а часть кода админки уже лежит в браузере.

## Что сказать на собеседовании

> Ленивая загрузка делается двумя способами: \`loadComponent\` для одного standalone-компонента и \`loadChildren\` для набора маршрутов — оба построены на динамическом \`import()\`, сборщик выделяет их в отдельные чанки, которые скачиваются при переходе. Ключевая деталь — \`CanMatchFn\`: он отвечает не «пускать ли пользователя», а «подходит ли маршрут вообще», и выполняется до загрузки чанка. Поэтому при отказе чанк не скачивается, а роутер пробует следующий маршрут с тем же путём. \`CanActivate\` для этого не годится: он срабатывает уже после загрузки.

## Ловушки

- **\`CanActivate\` вместо \`CanMatch\`** — чанк всё равно скачивается, экономии трафика нет.
- **Общая зависимость, используемая и в eager-коде**, попадёт в основной бандл — ленивый чанк не поможет.
- **\`PreloadAllModules\` на большом приложении** сводит выигрыш к нулю: качается всё сразу, просто чуть позже.
- **Ошибка загрузки чанка** (деплой во время сессии) даёт непонятную ошибку навигации — нужна обработка.
- **Слишком много мелких lazy-маршрутов** — много запросов и хуже кэширование.
- **Спросят следом**: чем \`CanMatch\` отличается от \`CanActivate\` и как выбрать стратегию предзагрузки.`,
      en: `## In short

Lazy loading means a route's code lives in its own chunk and is downloaded only when you navigate there. \`loadComponent\` loads **one component**, \`loadChildren\` loads **a set of routes**. And \`CanMatch\` decides whether the chunk is worth downloading at all.

The analogy: a library. You do not carry every book home — you take the one you need now. \`CanMatch\` is the librarian at the desk: he checks your card **before** walking to the stacks. No access, no trip — no time and no effort spent.

## How it works

1. **\`loadComponent\`** — a dynamic \`import()\` returning a single standalone component. The chunk with the component and its dependencies is fetched only on navigation to that route.
2. **\`loadChildren\`** — the same, but for a set of routes. It can load a \`Routes\` array (standalone style) or an \`NgModule\` (legacy — kept for compatibility).
3. **\`CanMatchFn\`** decides whether a route **matches at all**. Unlike \`CanActivate\`, it runs **before** the chunk is fetched.
4. If \`CanMatch\` returns \`false\`, the router **does not load** the chunk and tries the next route with the same path. That is what lets several different routes live on one path.
5. **Preloading**: \`PreloadAllModules\` or your own strategy is wired via \`withPreloading()\` and pulls lazy chunks in the background after the app has started.

## Example

\`\`\`ts
{
  path: 'profile',
  loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
},
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
},

// One path, different screens by role
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

Why: a regular user never downloads the admin chunk at all — \`CanMatch\` rejects the route before the fetch begins. With \`CanActivate\` the chunk would arrive first and only then be refused: bandwidth spent, and part of the admin code already sitting in the browser.

## What to say in the interview

> Modern Angular does lazy loading two ways: \`loadComponent\` for a single standalone component and \`loadChildren\` for a set of routes — both built on a dynamic \`import()\`, which the bundler turns into separate chunks fetched only on navigation. \`loadChildren\` can load either a \`Routes\` array or a legacy \`NgModule\`. The key detail is \`CanMatchFn\`: it answers not "may this user in" but "does this route match at all", and it runs before the chunk is fetched. So on rejection the chunk is never downloaded and the router falls through to the next route with the same path — the standard technique when one URL must render different screens per role. \`CanActivate\` cannot do that job because it fires after the chunk has loaded. On top of this sit preloading strategies wired through \`withPreloading()\`, and for finer-grained splitting inside a single screen there is \`@defer\`.

## Gotchas

- **Using \`CanActivate\` instead of \`CanMatch\`** still downloads the chunk — no bandwidth saved.
- **A shared dependency also used by eager code** lands in the main bundle, so the lazy chunk buys nothing.
- **\`PreloadAllModules\` on a large app** cancels the benefit: everything is fetched anyway, just slightly later.
- **A chunk that fails to load** (a deploy mid-session) surfaces as a cryptic navigation error — handle it.
- **Too many tiny lazy routes** mean many requests and worse caching.
- **Expect the follow-up**: how \`CanMatch\` differs from \`CanActivate\`, and how to pick a preloading strategy.`,
    },
    codeSnippet: `{
  path: 'dashboard',
  canMatch: [() => inject(Auth).isAdmin()], // runs BEFORE the chunk loads
  loadComponent: () => import('./admin-dash').then(m => m.AdminDash),
}`,
  },
  {
    id: 'ng-022',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['forms', 'reactive', 'template-driven'],
    question: {
      ru: 'В чём принципиальная разница между reactive и template-driven формами под капотом?',
      en: 'What is the fundamental difference between reactive and template-driven forms under the hood?',
    },
    answer: {
      ru: `## Коротко

Разница в том, **где живёт источник истины** и **кто кого создаёт**. В template-driven модель формы вырастает из шаблона: директивы \`ngModel\` сами создают \`FormControl\`-ы. В reactive модель создаётся в классе, а шаблон только к ней привязывается.

Аналогия: template-driven — это дом, который строят «по месту»: плотник пришёл, посмотрел на стену и сколотил полку. Reactive — это дом по чертежу: сначала полный проект в коде, потом стройка по нему. Чертёж можно проверить, обсудить и протестировать, ещё не забив ни одного гвоздя.

## Как устроен каждый подход

1. **Template-driven.** Форма описывается в шаблоне директивами \`ngModel\`, \`ngForm\`, \`ngModelGroup\`. Angular **асинхронно** создаёт \`FormControl\`-ы за вас — контролы появляются после прохода change detection, поэтому синхронно достучаться до них в \`ngOnInit\` нельзя. Валидация задаётся директивами прямо в разметке. Подходит для простых форм.
2. **Reactive.** Форма создаётся в классе через \`FormControl\`, \`FormGroup\`, \`FormArray\` или \`FormBuilder\`. Шаблон привязывается к уже готовой модели через \`formControlName\`. Модель доступна **синхронно** и предсказуемо.
3. **Общее у обоих.** И там, и там связь DOM с моделью идёт через \`ControlValueAccessor\`. Различается **направление создания**: template-driven строит модель из шаблона, регистрируя директивы вверх по дереву; reactive привязывает шаблон к готовой модели.

## Пример

\`\`\`html
<!-- template-driven: контрол создаст сама директива -->
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

\`\`\`ts
// reactive: модель существует до всякого шаблона
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

Почему так: во втором случае форму можно протестировать без DOM вообще, подписаться на \`valueChanges\` и \`statusChanges\` как на обычные \`Observable\`, а с типизированными формами (Angular 14+) компилятор ещё и проверит типы значений.

## Что выбрать

Для серьёзных приложений — **reactive**: явный контроль, типизация, тестируемость, реактивные потоки, удобные динамические формы. **Template-driven** — для быстрых и простых форм, где важна скорость написания. Смешивать оба подхода в одной форме не рекомендуется.

## Что сказать на собеседовании

> Принципиальная разница — в источнике истины и направлении создания модели. В template-driven форма описывается в шаблоне через \`ngModel\`, а \`FormControl\`-ы Angular создаёт за вас асинхронно, уже после прохода change detection — поэтому синхронно обратиться к ним в \`ngOnInit\` нельзя. В reactive-формах модель создаётся в классе через \`FormControl\`, \`FormGroup\` и \`FormBuilder\`, доступна синхронно, а шаблон лишь привязывается к ней через \`formControlName\`. Практически reactive выигрывает в тестируемости без DOM, потоках \`valueChanges\` и типобезопасности типизированных форм начиная с Angular 14.

## Ловушки

- **Обращение к контролу template-driven формы в \`ngOnInit\`** — \`undefined\`, контролы ещё не созданы.
- **Забытый \`name\` у \`ngModel\`** — контрол не зарегистрируется в форме.
- **\`[(ngModel)]\` вместе с \`formControlName\`** — устаревшая и запрещённая комбинация.
- **Подписка на \`valueChanges\` без отписки** — утечка; нужен \`takeUntilDestroyed\` или async pipe.
- **\`form.value\` не включает disabled-контролы** — за полным значением идти в \`getRawValue()\`.
- **Спросят следом**: что такое \`ControlValueAccessor\` и чем \`value\` отличается от \`getRawValue()\`.`,
      en: `## In short

The difference is **where the source of truth lives** and **who creates whom**. In template-driven forms the model grows out of the template: the \`ngModel\` directives create the \`FormControl\`s themselves. In reactive forms the model is created in the class and the template merely binds to it.

The analogy: template-driven is a house built on the spot — the carpenter turns up, looks at the wall and knocks together a shelf. Reactive is a house built from a blueprint: the full design in code first, then construction. A blueprint can be reviewed, discussed and tested before a single nail is driven.

## How each approach works

1. **Template-driven.** The form is described in the template with the \`ngModel\`, \`ngForm\` and \`ngModelGroup\` directives. Angular creates the \`FormControl\`s for you **asynchronously** — they appear after a change detection pass, so you cannot reach them synchronously in \`ngOnInit\`. Validation is declared with directives right in the markup. Good for simple forms.
2. **Reactive.** The form is created in the class via \`FormControl\`, \`FormGroup\`, \`FormArray\` or \`FormBuilder\`. The template binds to the ready model through \`formControlName\`. The model is available **synchronously** and predictably.
3. **What they share.** Both connect the DOM to the model through \`ControlValueAccessor\`. What differs is the **direction of creation**: template-driven builds the model from the template, registering directives up the tree; reactive binds the template to an existing model.

## Example

\`\`\`html
<!-- template-driven: the directive creates the control -->
<input [(ngModel)]="user.name" name="name" required />
\`\`\`

\`\`\`ts
// reactive: the model exists before any template
form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});
\`\`\`

Why: in the second case the form can be tested with no DOM at all, you can subscribe to \`valueChanges\` and \`statusChanges\` as ordinary \`Observable\`s, and with typed forms (Angular 14+) the compiler checks the value types too.

## What to choose

For serious applications — **reactive**: explicit control, typing, testability, reactive streams, comfortable dynamic forms. **Template-driven** — for quick, simple forms where writing speed matters. Mixing both approaches within one form is discouraged.

## What to say in the interview

> The fundamental difference is the source of truth and the direction in which the model is created. In template-driven forms the form is described in the template by the \`ngModel\` and \`ngForm\` directives, and Angular creates the \`FormControl\`s for you asynchronously, after a change detection pass — which is why you cannot access them synchronously in \`ngOnInit\`. In reactive forms the model is created in the class via \`FormControl\`, \`FormGroup\` or \`FormBuilder\`, is available synchronously, and the template merely binds to it through \`formControlName\`. In practice reactive wins on testability without the DOM, the \`valueChanges\` streams and the type safety of typed forms since Angular 14.

## Gotchas

- **Reaching for a template-driven control in \`ngOnInit\`** gives \`undefined\` — the controls do not exist yet.
- **A missing \`name\` on \`ngModel\`** means the control never registers with the form.
- **\`[(ngModel)]\` together with \`formControlName\`** is a deprecated and disallowed combination.
- **Subscribing to \`valueChanges\` without unsubscribing** leaks; use \`takeUntilDestroyed\` or the async pipe.
- **\`form.value\` omits disabled controls** — use \`getRawValue()\` for the complete value.
- **Expect the follow-up**: what \`ControlValueAccessor\` is, and how \`value\` differs from \`getRawValue()\`.`,
    },
    codeSnippet: `// Reactive: model lives in code, available synchronously
form = inject(FormBuilder).group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
});`,
  },
  {
    id: 'ng-023',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['forms', 'control-value-accessor', 'custom-controls'],
    question: {
      ru: 'Как работает ControlValueAccessor и как написать кастомный form control?',
      en: 'How does ControlValueAccessor work and how do you build a custom form control?',
    },
    answer: {
      ru: `## Коротко

\`ControlValueAccessor\` (CVA) — это **переводчик** между Angular Forms API (то есть \`FormControl\`) и вашим элементом ввода. Форма говорит «значение теперь такое», компонент это показывает; пользователь что-то нажал — компонент сообщает форме. Все встроенные директивы (\`DefaultValueAccessor\`, \`CheckboxControlValueAccessor\` и другие) реализуют ровно этот интерфейс.

Аналогия: переводчик на переговорах. Форма говорит по-своему, ваш компонент со звёздочками рейтинга — по-своему. CVA сидит между ними и переводит в обе стороны, и обе стороны при этом даже не подозревают, что говорят на разных языках.

## Четыре метода интерфейса

1. **\`writeValue(value)\`** — направление «модель → компонент». Форма программно устанавливает значение, компонент должен его отобразить.
2. **\`registerOnChange(fn)\`** — форма отдаёт вам колбэк. Вы его сохраняете и вызываете, **когда значение изменил пользователь**: это направление «компонент → модель».
3. **\`registerOnTouched(fn)\`** — такой же колбэк, но для пометки контрола как «touched», обычно на blur.
4. **\`setDisabledState(isDisabled)\`** — реакция на \`control.disable()\` и \`enable()\`.

Плюс регистрация: компонент отдаёт себя через **multi**-провайдер \`NG_VALUE_ACCESSOR\`, обёрнутый в \`forwardRef\`, потому что в момент выполнения декоратора класс ещё не определён.

## Пример

\`\`\`ts
@Component({
  selector: 'app-rating',
  template: '<!-- звёзды -->',
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

Почему так: после этого компонент работает с \`formControlName\`, \`ngModel\` и валидаторами **как нативный input** — форма не знает и не должна знать, что внутри звёздочки, а не текстовое поле. Если нужна ещё и собственная валидация, дополнительно реализуют интерфейс \`Validator\` и регистрируют его через \`NG_VALIDATORS\`.

## Что сказать на собеседовании

> \`ControlValueAccessor\` — это мост между Angular Forms API и конкретным элементом ввода: он переводит значение модели в представление и ввод обратно в модель. В нём четыре метода: \`writeValue\` ставит значение в компонент; \`registerOnChange\` и \`registerOnTouched\` принимают колбэки — компонент вызывает их при вводе и на blur; \`setDisabledState\` реагирует на \`disable\`. Чтобы форма нашла аксессор, компонент регистрирует себя multi-провайдером \`NG_VALUE_ACCESSOR\` с \`forwardRef\`, поскольку на момент вычисления декоратора класс ещё не определён. После этого компонент работает с \`formControlName\` наравне с нативным инпутом.

## Ловушки

- **Забыли \`multi: true\`** — Angular не найдёт аксессор или затрёт чужой.
- **Забыли \`forwardRef\`** — ошибка «class is not defined» на этапе выполнения декоратора.
- **Не вызвали \`onChange\`** — пользователь кликает, а форма считает значение прежним.
- **Не вызвали \`onTouched\`** — контрол навсегда \`untouched\`, и ошибки валидации не показываются по привычной логике.
- **Изменение состояния в \`writeValue\` при \`OnPush\`** может потребовать \`markForCheck()\`.
- **Спросят следом**: чем \`NG_VALUE_ACCESSOR\` отличается от \`NG_VALIDATORS\` и зачем вообще нужен \`forwardRef\`.`,
      en: `## In short

\`ControlValueAccessor\` (CVA) is the **interpreter** between the Angular Forms API — the \`FormControl\` — and your input element. The form says "the value is now this" and the component displays it; the user clicks something and the component reports back to the form. Every built-in directive (\`DefaultValueAccessor\`, \`CheckboxControlValueAccessor\` and the rest) implements exactly this interface.

The analogy: an interpreter at a negotiation. The form speaks its own language, your star-rating component speaks another. The CVA sits between them translating both ways, and neither side ever realises they do not share a language.

## The four interface methods

1. **\`writeValue(value)\`** — the "model → component" direction. The form sets a value programmatically and the component must display it.
2. **\`registerOnChange(fn)\`** — the form hands you a callback. You store it and call it **when the user changes the value**: the "component → model" direction.
3. **\`registerOnTouched(fn)\`** — the same kind of callback, but for marking the control as touched, usually on blur.
4. **\`setDisabledState(isDisabled)\`** — reacting to \`control.disable()\` and \`enable()\`.

Plus the registration itself: the component provides itself through the **multi** provider \`NG_VALUE_ACCESSOR\`, wrapped in \`forwardRef\` because the class is not yet defined when the decorator is evaluated.

## Example

\`\`\`ts
@Component({
  selector: 'app-rating',
  template: '<!-- stars -->',
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

Why: from that point on the component works with \`formControlName\`, \`ngModel\` and validators **exactly like a native input** — the form neither knows nor needs to know that there are stars inside rather than a text field. If you also need your own validation, implement the \`Validator\` interface and register it through \`NG_VALIDATORS\`.

## What to say in the interview

> \`ControlValueAccessor\` is the bridge between the Angular Forms API and a concrete input element: it translates the model value into the component's presentation and user input back into the model. It has four methods: \`writeValue\`, where the form sets a value into the component; \`registerOnChange\` and \`registerOnTouched\`, where the form passes callbacks the component invokes when the value changes and on blur; and \`setDisabledState\` for reacting to \`disable\`. For the form to find the accessor, the component registers itself as a multi provider under \`NG_VALUE_ACCESSOR\` with a \`forwardRef\`, since the class is not yet defined when the decorator is evaluated. After that the custom component is used with \`formControlName\` on equal footing with a native input — the foundation of any design system.

## Gotchas

- **Forgetting \`multi: true\`** means Angular either does not find the accessor or overwrites someone else's.
- **Forgetting \`forwardRef\`** throws a "class is not defined" error while the decorator is being evaluated.
- **Never calling \`onChange\`** leaves the form convinced the value never changed, no matter what the user clicks.
- **Never calling \`onTouched\`** leaves the control permanently \`untouched\`, so validation errors do not appear when expected.
- **Changing state inside \`writeValue\` under \`OnPush\`** may require a \`markForCheck()\`.
- **Expect the follow-up**: how \`NG_VALUE_ACCESSOR\` differs from \`NG_VALIDATORS\`, and why \`forwardRef\` is needed at all.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['forms', 'typed-forms', 'validators'],
    question: {
      ru: 'Что такое типизированные реактивные формы и как писать кастомные и async-валидаторы?',
      en: 'What are typed reactive forms and how do you write custom and async validators?',
    },
    answer: {
      ru: `## Коротко

С Angular 14 \`FormControl\` и \`FormGroup\` стали **дженериками**. Раньше \`form.value\` был \`any\` — опечатка в имени поля обнаруживалась только в рантайме. Теперь компилятор знает точные типы каждого контрола.

Аналогия: раньше форма была коробкой с надписью «вещи». Что достанешь — то достанешь, проверять приходилось руками. Теперь это ячейки с подписями: «строка», «число или пусто» — и попытка положить не то не пройдёт дальше сборки.

## Что важно знать про типы

1. **\`nonNullable\`.** По умолчанию \`reset()\` возвращает контрол к \`null\`, поэтому в тип значения входит \`null\`. Флаг \`{ nonNullable: true }\` (или \`fb.nonNullable.group\`) убирает \`null\` из типа и заставляет \`reset()\` возвращаться к **начальному значению**, а не к \`null\`.
2. **\`value\` против \`getRawValue()\`.** \`value\` **исключает disabled**-контролы, поэтому в типе они становятся опциональными. \`getRawValue()\` возвращает все поля, включая отключённые.
3. **Синхронный валидатор** — это функция \`ValidatorFn\`: получает контрол, возвращает объект ошибок или \`null\`, если всё в порядке.
4. **Асинхронный валидатор** (\`AsyncValidatorFn\`) возвращает \`Observable\` или \`Promise\` от \`ValidationErrors | null\`. Он запускается **после** синхронных, и пока ответа нет, статус контрола равен \`PENDING\`.

## Пример

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;         // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }

// синхронный валидатор
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}

// асинхронный валидатор
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}

new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // реже дёргаем сервер
});
\`\`\`

Почему так: \`updateOn: 'blur'\` (или \`'submit'\`) переносит запуск валидации с каждого нажатия клавиши на потерю фокуса — иначе async-валидатор будет бить в API на каждый символ. А \`catchError(() => of(null))\` не даёт упавшему запросу навсегда заблокировать форму в статусе \`PENDING\`.

## Что сказать на собеседовании

> Типизированные формы появились в Angular 14: \`FormControl\` и \`FormGroup\` стали дженериками, поэтому \`form.value\` не \`any\`, а точный тип из структуры формы. Первый нюанс — \`nonNullable\`: по умолчанию \`reset\` возвращает контрол к \`null\`, из-за чего \`null\` попадает в тип, а флаг убирает его и сбрасывает контрол к начальному значению. Второй — \`value\` исключает отключённые контролы и делает их опциональными в типе, а \`getRawValue\` возвращает все поля. Кастомный валидатор — это \`ValidatorFn\`, возвращающая объект ошибок или \`null\`; \`AsyncValidatorFn\` запускается после синхронных, и пока он в работе статус — \`PENDING\`.

## Ловушки

- **Забыли \`nonNullable\`** — и в типе значения внезапно \`string | null\` по всей форме.
- **\`form.value\` вместо \`getRawValue()\`** при наличии disabled-полей — тихо теряются данные при отправке.
- **Async-валидатор без \`catchError\`** — упавший запрос оставляет контрол в \`PENDING\` навсегда.
- **Async-валидация на каждый ввод** без \`updateOn\` или \`debounceTime\` — шторм запросов.
- **Валидатор с побочными эффектами** вызывается чаще, чем вы думаете, — он должен быть чистым.
- **Спросят следом**: почему статус \`PENDING\` блокирует \`form.valid\` и как типизировать \`FormArray\`.`,
      en: `## In short

Since Angular 14 \`FormControl\` and \`FormGroup\` are **generic**. \`form.value\` used to be \`any\` — a typo in a field name only surfaced at runtime. Now the compiler knows the exact type of every control.

The analogy: the form used to be a box labelled "stuff". Whatever you pulled out, you pulled out, and checking was manual. Now it is a set of labelled slots — "string", "number or empty" — and putting the wrong thing in never gets past the build.

## What matters about the types

1. **\`nonNullable\`.** By default \`reset()\` returns a control to \`null\`, so \`null\` is part of the value type. The \`{ nonNullable: true }\` flag (or \`fb.nonNullable.group\`) removes \`null\` from the type and makes \`reset()\` fall back to the **initial value** instead.
2. **\`value\` vs \`getRawValue()\`.** \`value\` **excludes disabled** controls, which is why they become optional in the type. \`getRawValue()\` returns every field, disabled ones included.
3. **A synchronous validator** is a \`ValidatorFn\`: it receives the control and returns an errors object, or \`null\` when everything is fine.
4. **An async validator** (\`AsyncValidatorFn\`) returns an \`Observable\` or \`Promise\` of \`ValidationErrors | null\`. It runs **after** the synchronous ones, and while it is pending the control's status is \`PENDING\`.

## Example

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});
form.value;         // { name?: string; age?: number | null }
form.getRawValue(); // { name: string; age: number | null }

// synchronous validator
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}

// async validator
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    api.checkEmail(control.value).pipe(
      map(taken => taken ? { emailTaken: true } : null),
      catchError(() => of(null)),
    );
}

new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  updateOn: 'blur', // hit the server less often
});
\`\`\`

Why: \`updateOn: 'blur'\` (or \`'submit'\`) moves validation from every keystroke to losing focus — otherwise the async validator hammers the API on every character. And \`catchError(() => of(null))\` stops a failed request from locking the form in \`PENDING\` forever.

## What to say in the interview

> Typed forms arrived in Angular 14: \`FormControl\` and \`FormGroup\` became generic, so \`form.value\` is no longer \`any\` but a precise type inferred from the form's shape. Two nuances matter here. First, \`nonNullable\`: by default \`reset\` returns a control to \`null\`, which pulls \`null\` into the type; the flag removes it and resets the control to its initial value instead. Second, the difference between \`value\` and \`getRawValue\`: \`value\` excludes disabled controls, which makes them optional in the type, while \`getRawValue\` returns everything. A custom validator is a \`ValidatorFn\` returning an errors object or \`null\`. An async one is an \`AsyncValidatorFn\`, it runs after the synchronous validators, and while it is in flight the control's status is \`PENDING\`. In practice async validation is always paired with \`updateOn: 'blur'\`, otherwise the form will hit the API on every character typed.

## Gotchas

- **Forgetting \`nonNullable\`** and suddenly the whole form's value type is \`string | null\`.
- **Using \`form.value\` instead of \`getRawValue()\`** with disabled fields silently drops data on submit.
- **An async validator without \`catchError\`** leaves the control \`PENDING\` forever when the request fails.
- **Async validation on every keystroke**, with no \`updateOn\` or \`debounceTime\`, is a request storm.
- **A validator with side effects** runs more often than you think — it must be pure.
- **Expect the follow-up**: why a \`PENDING\` status blocks \`form.valid\`, and how to type a \`FormArray\`.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['content-projection', 'ng-content'],
    question: {
      ru: 'Как работает content projection через ng-content и что такое multi-slot проекция?',
      en: 'How does content projection via ng-content work and what is multi-slot projection?',
    },
    answer: {
      ru: `## Коротко

\`<ng-content>\` — это **слот**, дырка в шаблоне компонента, куда Angular вставит то, что вы написали между его тегами. Так делают переиспользуемые обёртки: карточки, модалки, панели.

Аналогия: фоторамка. Рамка задаёт оформление, а фотографию в неё вставляете вы. Рамке всё равно, что на фото — но важно, что фотография при этом **остаётся вашей**: она не становится частью рамки. Это ключ к пониманию контекста проекции.

## Как это работает по шагам

1. В шаблоне компонента-обёртки ставите \`<ng-content></ng-content>\` — это слот по умолчанию.
2. Пользователь пишет \`<app-card><p>Любой контент</p></app-card>\`, и содержимое попадает в слот.
3. Слотов может быть несколько: \`<ng-content select="...">\` распределяет контент по CSS-селекторам. \`select\` принимает любой селектор — атрибут, тег, класс.
4. Всё, что не совпало ни с одним \`select\`, уходит в **дефолтный** \`ng-content\` без селектора.
5. Если тег не подходит под нужный \`select\`, его можно «представить» другим через атрибут \`ngProjectAs="selector"\`.

## Пример

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

Почему так: обёртка задаёт только каркас и оформление, а наполнение остаётся за вызывающей стороной — на этом стоит вся композиция UI-библиотек.

## Ключевые нюансы

- **Контент рендерится в контексте родителя**, а не обёртки. DI и change detection спроецированного контента принадлежат **месту объявления** — это самый неочевидный момент и любимый вопрос на собеседовании.
- **Спроецированный контент создаётся всегда**, даже если сам \`ng-content\` спрятан за \`@if\`. Чтобы отложить создание, оборачивать надо на стороне родителя или использовать \`ng-template\`.
- **\`@ContentChild\` / \`@ContentChildren\`** (или сигнальные \`contentChild\`/\`contentChildren\`) позволяют обёртке получить ссылки на спроецированные элементы.

## Что сказать на собеседовании

> \`ng-content\` — это слот, в который Angular проецирует контент, переданный между тегами компонента. Multi-slot проекция — это несколько \`ng-content\` с атрибутом \`select\`, принимающим любой CSS-селектор; всё, что не совпало, попадает в слот без селектора. Принципиальный нюанс: спроецированный контент рендерится в контексте родителя, а не обёртки — и DI, и change detection у него принадлежат месту объявления, поэтому директива внутри проекции резолвит сервисы от родителя, и ради этого существует модификатор \`@Host\`. Доступ к спроецированным элементам обёртка получает через \`ContentChild\` и \`ContentChildren\`.

## Ловушки

- **«Скрыл \`ng-content\` через \`@if\` — контент не создастся»**: неверно, он создаётся всё равно.
- **DI из проекции идёт к родителю**, а не к обёртке — отсюда сюрпризы с сервисами и \`@Host\`.
- **\`ng-content\` нельзя использовать дважды** для одного и того же контента — он вставляется в одно место.
- **\`select\` не работает по вложенным элементам** — только по прямым детям проецируемого контента.
- **\`@ContentChild\` доступен только с \`ngAfterContentInit\`**, не раньше.
- **Спросят следом**: чем \`ContentChild\` отличается от \`ViewChild\` и зачем нужен \`ngProjectAs\`.`,
      en: `## In short

\`<ng-content>\` is a **slot** — a hole in the wrapper's template where Angular drops whatever you wrote between its tags. That is how reusable wrappers are built: cards, modals, panels.

The analogy: a picture frame. The frame provides the styling, you supply the photo. The frame does not care what the photo shows — but crucially the photo **stays yours**: it never becomes part of the frame. That is the key to understanding projection context.

## How it works, step by step

1. In the wrapper's template you place \`<ng-content></ng-content>\` — the default slot.
2. A consumer writes \`<app-card><p>Any content</p></app-card>\` and the content lands in the slot.
3. There can be several slots: \`<ng-content select="...">\` distributes content by CSS selector. \`select\` accepts any selector — attribute, tag or class.
4. Anything that matches no \`select\` goes to the **default** \`ng-content\` without a selector.
5. If a tag does not match the selector you need, you can make it present itself as another one via the \`ngProjectAs="selector"\` attribute.

## Example

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

Why: the wrapper owns only the skeleton and the styling while the filling stays with the caller — the whole compositional design of UI libraries rests on this.

## Key nuances

- **Content renders in the parent's context**, not the wrapper's. DI and change detection for projected content belong to the **place of declaration** — the least obvious point and a favourite interview question.
- **Projected content is always created**, even when the \`ng-content\` itself is hidden behind an \`@if\`. To defer creation, wrap it on the parent side or use an \`ng-template\`.
- **\`@ContentChild\` / \`@ContentChildren\`** (or the signal-based \`contentChild\`/\`contentChildren\`) let the wrapper grab references to the projected elements.

## What to say in the interview

> \`ng-content\` is a slot into which Angular projects the content passed between a component's tags; reusable wrappers are built on it. Multi-slot projection means several \`ng-content\` elements with a \`select\` attribute taking any CSS selector — tag, attribute or class; whatever matches nothing lands in the selector-less slot, and a non-matching tag can be redirected with \`ngProjectAs\`. The nuance people usually miss: projected content renders in the parent's context, not the wrapper's, so both dependency injection and change detection belong to the place of declaration — a directive inside projected content resolves services from the parent rather than the wrapper, which is exactly why the \`@Host\` modifier exists. The second nuance is that projected content is always created, even when the \`ng-content\` is hidden by a condition, so deferring creation requires an \`ng-template\` or a condition on the parent side. The wrapper reaches projected elements through \`ContentChild\` and \`ContentChildren\`.

## Gotchas

- **"Hiding \`ng-content\` behind \`@if\` prevents creation"** — false; the content is created regardless.
- **DI inside projection resolves against the parent**, not the wrapper — hence surprises with services and \`@Host\`.
- **The same \`ng-content\` cannot render the same content twice** — it is inserted in one place only.
- **\`select\` does not match nested elements** — only the direct children of the projected content.
- **\`@ContentChild\` is only available from \`ngAfterContentInit\`**, not earlier.
- **Expect the follow-up**: how \`ContentChild\` differs from \`ViewChild\`, and what \`ngProjectAs\` is for.`,
    },
  },
  {
    id: 'ng-026',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['view-child', 'content-child', 'query-timing'],
    question: {
      ru: 'Чем отличаются ViewChild и ContentChild, и как работает тайминг запросов (static vs dynamic)?',
      en: 'How do ViewChild and ContentChild differ, and how does query timing (static vs dynamic) work?',
    },
    answer: {
      ru: `## Коротко

Разница в **чей это элемент**. \`ViewChild\` ищет в **собственном шаблоне** компонента. \`ContentChild\` ищет в том, что **передал родитель** через \`ng-content\`.

Аналогия: \`ViewChild\` — это мебель, которую вы сами купили и поставили в комнату. \`ContentChild\` — вещи, которые гость принёс с собой и оставил у вас. И то и другое стоит в вашей комнате, но происхождение разное — и появляются они в разное время: гость приходит **раньше**, чем вы успеваете доставить свою мебель.

## Тайминг и его правила

1. **\`ContentChild\` доступен в \`ngAfterContentInit\`** — контент спроецирован раньше, чем построен собственный вид.
2. **\`ViewChild\` доступен в \`ngAfterViewInit\`** — вид инициализирован.
3. **\`static: true\`** — запрос разрешается **до** первого прохода CD, значит элемент доступен уже в \`ngOnInit\`. Работает **только** если элемент не обёрнут структурной директивой (\`@if\`, \`@for\`), то есть всегда присутствует в DOM.
4. **\`static: false\`** (по умолчанию) — запрос разрешается **после** CD, элемент доступен в \`ngAfterViewInit\`. Именно этот вариант нужен для условно отображаемых элементов.
5. **\`@ViewChildren\` / \`@ContentChildren\`** возвращают \`QueryList\` для нескольких совпадений; у него есть \`.changes\` — \`Observable\`, реагирующий на динамическое добавление и удаление элементов в \`@for\`.

## Пример

\`\`\`ts
// Декораторный стиль
@ViewChild('localRef') ref!: ElementRef;        // из своего шаблона
@ContentChild(TabComponent) tab!: TabComponent; // из проекции

// Сигнальные queries (Angular 17.2+) — рекомендованный способ
ref = viewChild<ElementRef>('localRef');        // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // без undefined
projected = contentChild(TabComponent);
\`\`\`

Почему так: сигнальные queries возвращают **сигналы**, поэтому их можно читать в \`computed\` и \`effect\`, не нужно вручную выбирать \`static\` и не нужно подписываться на \`QueryList.changes\` — всё пересчитывается реактивно.

## Что сказать на собеседовании

> \`ViewChild\` запрашивает элемент из собственного шаблона компонента, \`ContentChild\` — из контента, спроецированного родителем через \`ng-content\`. Отсюда и разный тайминг: контент проецируется раньше собственного вида, поэтому \`ContentChild\` доступен в \`ngAfterContentInit\`, а \`ViewChild\` — только в \`ngAfterViewInit\`. Флаг \`static: true\` разрешает запрос до первого прохода CD, и тогда элемент доступен в \`ngOnInit\`, но лишь для элементов, гарантированно присутствующих в DOM. С версии 17.2 есть сигнальные queries — \`viewChild\` и \`contentChild\`, включая \`viewChild.required\`: они возвращают сигналы и снимают вопрос выбора тайминга.

## Ловушки

- **\`@ViewChild\` в \`ngOnInit\` при \`static: false\`** — \`undefined\`.
- **\`static: true\` для элемента внутри \`@if\`** — не сработает, элемента ещё нет.
- **Изменение состояния сразу после чтения \`ViewChild\` в \`ngAfterViewInit\`** — \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **\`QueryList\` без подписки на \`.changes\`** — при динамическом списке вы читаете устаревший снимок.
- **\`ViewChild\` не найдёт элемент внутри \`ng-content\`** — для этого нужен именно \`ContentChild\`.
- **Спросят следом**: почему content-хуки идут раньше view-хуков и чем сигнальные queries лучше декораторов.`,
      en: `## In short

The difference is **whose element it is**. \`ViewChild\` searches the component's **own template**. \`ContentChild\` searches what the **parent handed in** through \`ng-content\`.

The analogy: \`ViewChild\` is the furniture you bought and put in the room yourself. \`ContentChild\` is the stuff a guest brought and left with you. Both sit in your room, but their origin differs — and they arrive at different times: the guest turns up **before** your own furniture gets delivered.

## Timing and its rules

1. **\`ContentChild\` is available in \`ngAfterContentInit\`** — content is projected before the component's own view is built.
2. **\`ViewChild\` is available in \`ngAfterViewInit\`** — the view is initialized.
3. **\`static: true\`** resolves the query **before** the first CD pass, so the element is already there in \`ngOnInit\`. It works **only** for elements not wrapped in a structural directive (\`@if\`, \`@for\`), i.e. always present in the DOM.
4. **\`static: false\`** (the default) resolves the query **after** CD, so the element is available in \`ngAfterViewInit\`. This is the variant you need for conditionally rendered elements.
5. **\`@ViewChildren\` / \`@ContentChildren\`** return a \`QueryList\` for multiple matches; it exposes \`.changes\`, an \`Observable\` reacting to items being added or removed dynamically in an \`@for\`.

## Example

\`\`\`ts
// Decorator style
@ViewChild('localRef') ref!: ElementRef;        // from own template
@ContentChild(TabComponent) tab!: TabComponent; // from projection

// Signal queries (Angular 17.2+) — the recommended way
ref = viewChild<ElementRef>('localRef');        // Signal<ElementRef | undefined>
items = viewChildren(ItemComponent);            // Signal<readonly Item[]>
required = viewChild.required<ElementRef>('r'); // no undefined
projected = contentChild(TabComponent);
\`\`\`

Why: signal queries return **signals**, so they can be read inside \`computed\` and \`effect\`, there is no \`static\` flag to reason about, and no \`QueryList.changes\` subscription to maintain — everything recomputes reactively.

## What to say in the interview

> \`ViewChild\` queries an element from the component's own template, \`ContentChild\` from content projected in by the parent through \`ng-content\`. Hence the different timing: content is projected before the component's own view, so \`ContentChild\` is available in \`ngAfterContentInit\` while \`ViewChild\` only in \`ngAfterViewInit\`. The \`static: true\` flag resolves the query before the first change detection pass, making the element available already in \`ngOnInit\`, but that only works for elements guaranteed to be in the DOM — not wrapped in \`@if\` or \`@for\`; the default is \`static: false\`. The plural forms \`ViewChildren\` and \`ContentChildren\` return a \`QueryList\` with a \`changes\` stream you must subscribe to for dynamic lists. Modern Angular, from 17.2, offers signal queries — \`viewChild\`, \`viewChildren\`, \`contentChild\`, including \`viewChild.required\`: they return signals, are readable in \`computed\` and \`effect\`, remove the timing question entirely and replace \`QueryList\` subscriptions. For new projects that is the recommended approach.

## Gotchas

- **\`@ViewChild\` in \`ngOnInit\` with \`static: false\`** is \`undefined\`.
- **\`static: true\` on an element inside \`@if\`** never resolves — the element does not exist yet.
- **Mutating state right after reading a \`ViewChild\` in \`ngAfterViewInit\`** triggers \`ExpressionChangedAfterItHasBeenCheckedError\`.
- **A \`QueryList\` without a \`.changes\` subscription** hands you a stale snapshot for dynamic lists.
- **\`ViewChild\` cannot find an element inside \`ng-content\`** — that is exactly what \`ContentChild\` is for.
- **Expect the follow-up**: why content hooks precede view hooks, and why signal queries beat the decorators.`,
    },
    codeSnippet: `// Signal-based queries (Angular 17.2+)
box = viewChild.required<ElementRef>('box');
items = viewChildren(ItemComponent);
projected = contentChild(TabComponent);`,
  },
  {
    id: 'ng-027',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['dynamic-components', 'view-container-ref', 'template-ref'],
    question: {
      ru: 'Как создавать динамические компоненты через ViewContainerRef и что такое TemplateRef?',
      en: 'How do you create dynamic components via ViewContainerRef, and what is TemplateRef?',
    },
    answer: {
      ru: `## Коротко

Две сущности, которые легко путают. \`TemplateRef\` — это **рецепт** DOM: описание, которое само по себе не рендерится. \`ViewContainerRef\` — это **место**, куда по этому рецепту можно что-то вставить.

Аналогия: \`TemplateRef\` — рецепт пирога в книге. Пирога ещё нет, есть только инструкция. \`ViewContainerRef\` — стол, на который вы этот пирог поставите (и можете поставить несколько, и можете убрать). Компонент тоже можно поставить на этот стол — не по рецепту, а «готовым блюдом» через \`createComponent\`.

## Как это работает по шагам

1. \`<ng-template #tpl>\` объявляет шаблон. Он **не рендерится** сам — Angular только запоминает его как \`TemplateRef\`.
2. Ссылку получаем запросом: \`@ViewChild('tpl') tpl!: TemplateRef<any>\` (или сигнальным \`viewChild\`).
3. \`ViewContainerRef\` — точка привязки в DOM. Берётся через DI или через якорный элемент с \`{ read: ViewContainerRef }\`.
4. Из шаблона создаём embedded view: \`vcr.createEmbeddedView(tpl, { name: 'Anna' })\` — второй аргумент задаёт контекст для \`let-\`-переменных.
5. Компонент создаём через \`vcr.createComponent(WidgetComponent)\`. С Ivy \`ComponentFactoryResolver\` больше **не нужен** — он устарел.
6. \`createComponent\` возвращает \`ComponentRef\`, у которого есть \`instance\`, \`setInput\`, \`destroy\`, \`location\`.

## Пример

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

Почему так: \`setInput\` — правильный способ задать вход, потому что он корректно помечает вид грязным и запускает \`ngOnChanges\`; присваивание напрямую в \`ref.instance\` этого не сделает.

## Ключевые нюансы

- **\`entryComponents\` больше не существует** — с Ivy регистрация динамических компонентов не нужна.
- **Не забывайте \`destroy()\` или \`clear()\`** — иначе утечка: компонент остаётся в дереве CD со своими подписками.
- В \`createComponent\` можно передать \`injector\` и \`projectableNodes\` — последнее нужно для content projection внутрь динамического компонента.
- **Декларативная альтернатива императиву** — \`NgComponentOutlet\` в шаблоне и \`*ngTemplateOutlet\` для шаблонов. Часто это проще и безопаснее.
- Применение: модалки, тултипы, динамические формы, плагинные системы, рендер экрана по конфигу с бэкенда.

## Что сказать на собеседовании

> \`TemplateRef\` — это ссылка на \`ng-template\`: описание DOM, которое само не рендерится и инстанцируется позже с контекстом. \`ViewContainerRef\` — контейнер, куда вставляются созданные view: из шаблона через \`createEmbeddedView\`, из компонента через \`createComponent\`. Начиная с Ivy \`ComponentFactoryResolver\` не нужен. \`createComponent\` возвращает \`ComponentRef\` с \`instance\`, \`setInput\` и \`destroy\`; входы задают через \`setInput\`, потому что он помечает вид грязным и запускает \`ngOnChanges\`. Нужно самому вызывать \`destroy\` или \`clear\`, иначе компонент остаётся в дереве change detection вместе с подписками — это классическая утечка.

## Ловушки

- **Забыли \`destroy()\`** — утечка памяти и «мёртвые» подписки.
- **Присваивание в \`ref.instance.someInput\` вместо \`setInput\`** — не сработает \`ngOnChanges\` и не пометится вид.
- **\`ViewContainerRef\` вставляет view как соседа якоря**, а не внутрь него — частая причина «почему появилось не там».
- **\`ng-template\` без \`createEmbeddedView\`** не отрендерится вообще — это ожидаемое поведение, а не баг.
- **\`ComponentFactoryResolver\` в новом коде** — устаревший API, на собеседовании это заметят.
- **Спросят следом**: чем \`NgComponentOutlet\` отличается от \`createComponent\` и как передать проецируемый контент.`,
      en: `## In short

Two things people constantly mix up. \`TemplateRef\` is a **recipe** for DOM: a description that does not render on its own. \`ViewContainerRef\` is the **place** where something can be created from that recipe.

The analogy: \`TemplateRef\` is a cake recipe in a book. There is no cake yet, only instructions. \`ViewContainerRef\` is the table you put the cake on (and you can put several out, and clear them away). A component can go on that table too — not from a recipe but as a finished dish, via \`createComponent\`.

## How it works, step by step

1. \`<ng-template #tpl>\` declares a template. It **does not render** by itself — Angular merely keeps it as a \`TemplateRef\`.
2. You grab the reference with a query: \`@ViewChild('tpl') tpl!: TemplateRef<any>\` (or the signal-based \`viewChild\`).
3. \`ViewContainerRef\` is an anchor point in the DOM. You obtain it via DI or from an anchor element with \`{ read: ViewContainerRef }\`.
4. From a template you create an embedded view: \`vcr.createEmbeddedView(tpl, { name: 'Anna' })\` — the second argument is the context for the \`let-\` variables.
5. A component is created with \`vcr.createComponent(WidgetComponent)\`. With Ivy the \`ComponentFactoryResolver\` is **no longer needed** — it is deprecated.
6. \`createComponent\` returns a \`ComponentRef\` exposing \`instance\`, \`setInput\`, \`destroy\` and \`location\`.

## Example

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

Why: \`setInput\` is the correct way to set an input because it properly marks the view dirty and triggers \`ngOnChanges\`; assigning straight onto \`ref.instance\` does neither.

## Key nuances

- **\`entryComponents\` no longer exists** — with Ivy dynamic components need no registration.
- **Do not forget \`destroy()\` or \`clear()\`** — otherwise you leak: the component stays in the CD tree along with its subscriptions.
- \`createComponent\` also accepts an \`injector\` and \`projectableNodes\`, the latter for projecting content into the dynamic component.
- **The declarative alternative** is \`NgComponentOutlet\` in the template and \`*ngTemplateOutlet\` for templates. Often simpler and safer.
- Use cases: modals, tooltips, dynamic forms, plugin systems, rendering a screen from a backend config.

## What to say in the interview

> \`TemplateRef\` is a reference to an \`ng-template\` — a DOM description that does not render on its own and can be instantiated later with a context. \`ViewContainerRef\` is the container where created views are inserted: from a template via \`createEmbeddedView\`, from a component via \`createComponent\`. Since Ivy the \`ComponentFactoryResolver\` is unnecessary and deprecated. \`createComponent\` returns a \`ComponentRef\` with \`instance\`, \`setInput\` and \`destroy\`; inputs should be set through \`setInput\` specifically, because it marks the view dirty and triggers \`ngOnChanges\`. You must call \`destroy\` or \`clear\` yourself, otherwise the created component stays in the change detection tree along with its subscriptions — the classic leak. Where declarative is enough, prefer \`NgComponentOutlet\` and \`ngTemplateOutlet\`.

## Gotchas

- **Forgetting \`destroy()\`** leaks memory and leaves dead subscriptions behind.
- **Assigning to \`ref.instance.someInput\` instead of \`setInput\`** skips \`ngOnChanges\` and never marks the view.
- **\`ViewContainerRef\` inserts the view as a sibling of the anchor**, not inside it — the usual cause of "why did it appear over there".
- **An \`ng-template\` without a \`createEmbeddedView\`** never renders at all — expected behaviour, not a bug.
- **\`ComponentFactoryResolver\` in new code** is a deprecated API and interviewers will notice.
- **Expect the follow-up**: how \`NgComponentOutlet\` differs from \`createComponent\`, and how to pass projected content.`,
    },
    codeSnippet: `const ref = this.vcr.createComponent(WidgetComponent);
ref.setInput('title', 'Dynamic');
ref.instance.action.subscribe(v => this.onAction(v));
// ... later
ref.destroy(); // avoid leaks`,
  },
  {
    id: 'ng-028',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['host-binding', 'host-listener', 'directives'],
    question: {
      ru: 'Как работают HostBinding и HostListener и в чём преимущество свойства host в декораторе?',
      en: 'How do HostBinding and HostListener work, and what is the benefit of the host decorator property?',
    },
    answer: {
      ru: `## Коротко

**Host-элемент** — это тег, на котором висит ваш компонент или директива. \`@HostBinding\` пишет **на него** класс, стиль, атрибут или свойство. \`@HostListener\` слушает **на нём** события.

Аналогия: директива — это наклейка на дверь. \`@HostBinding\` меняет саму дверь: перекрашивает её, вешает табличку. \`@HostListener\` — это звонок на этой двери: кто-то нажал — вы отреагировали. Всё это без единой строчки в шаблоне снаружи.

## Три способа сказать одно и то же

1. **\`@HostBinding('class.active')\`** — привязывает поле класса к классу host-элемента: \`true\` — класс есть, \`false\` — класса нет. Так же работают \`attr.aria-disabled\` для атрибута и \`style.opacity\` для стиля.
2. **\`@HostListener('click', ['$event'])\`** — подписка на событие host-элемента. Можно слушать и глобальные цели: \`@HostListener('window:resize')\`.
3. **Объект \`host\` в декораторе** — современная альтернатива обоим: \`'[class.primary]': 'isPrimary'\`, \`'(click)': 'onClick($event)'\`, а статику вроде \`'[attr.role]': '"button"'\` можно задать прямо здесь.

## Пример

\`\`\`ts
// Декораторный стиль
@HostBinding('class.active') isActive = false;
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

// Стиль через host-объект — предпочтительный
@Component({
  selector: 'app-btn',
  host: {
    '[class.primary]': 'isPrimary',
    '[attr.role]': '"button"',
    '(click)': 'onClick($event)',
  },
})
\`\`\`

Почему так: в объекте \`host\` все привязки лежат **в одном месте**, в метаданных, а не разбросаны по полям класса. Это считается более производительным и предпочтительным стилем в новых гайдлайнах Angular, лучше работает с наследованием и линтерами, а статические значения задаются без всякой логики.

## Нюансы

- \`class.x\` добавляет и убирает класс по булеву значению; \`style.prop\` — то же для стиля; \`attr.x\` пишет именно **атрибут**, а не DOM-свойство.
- Для частых событий (\`mousemove\`, \`scroll\`) \`@HostListener\` может бить по производительности, потому что каждое срабатывание тянет за собой change detection — здесь помогают \`runOutsideAngular\` или сигналы.
- В zoneless-режиме host-listener'ы автоматически помечают вид грязным.

## Что сказать на собеседовании

> \`HostBinding\` привязывает поле класса к свойству, атрибуту, классу или стилю host-элемента, а \`HostListener\` подписывается на его события, включая глобальные цели вроде \`window:resize\`. Современная альтернатива обоим — объект \`host\` в метаданных \`@Component\`, где привязки записываются как \`'[class.primary]': 'isPrimary'\` и \`'(click)': 'onClick(\$event)'\`. Этот стиль предпочтителен по новым гайдлайнам: все host-привязки собраны в одном месте. Из нюансов — \`HostListener\` на высокочастотных событиях вроде \`mousemove\` и \`scroll\` бьёт по производительности: каждое событие тянет change detection, поэтому там применяют \`runOutsideAngular\`.

## Ловушки

- **\`@HostListener('mousemove')\`** — гарантированные тормоза: CD на каждое движение мыши.
- **Путать \`attr.disabled\` и \`disabled\`**: первый пишет HTML-атрибут, второй — DOM-свойство; для нативных контролов это разные вещи.
- **Стрелочные функции в \`host\`-объекте не работают** — там строковое выражение, вычисляемое в контексте компонента.
- **Дублирование host-привязки в родителе и в \`hostDirectives\`** даёт конфликт за один и тот же атрибут.
- **Смешивать декораторы и объект \`host\`** в одном классе технически можно, но читается плохо.
- **Спросят следом**: чем host-объект лучше декораторов и как не убить производительность на частых событиях.`,
      en: `## In short

The **host element** is the tag your component or directive sits on. \`@HostBinding\` writes a class, style, attribute or property **onto it**. \`@HostListener\` listens for events **on it**.

The analogy: a directive is a sticker on a door. \`@HostBinding\` changes the door itself — repaints it, hangs a sign. \`@HostListener\` is the doorbell on that door: someone presses it, you react. All of it without a single line in the outer template.

## Three ways to say the same thing

1. **\`@HostBinding('class.active')\`** binds a class field to a class on the host element: \`true\` adds it, \`false\` removes it. The same works for \`attr.aria-disabled\` for an attribute and \`style.opacity\` for a style.
2. **\`@HostListener('click', ['$event'])\`** subscribes to a host element event. Global targets work too: \`@HostListener('window:resize')\`.
3. **The \`host\` object in the decorator** is the modern alternative to both: \`'[class.primary]': 'isPrimary'\`, \`'(click)': 'onClick($event)'\`, and static values like \`'[attr.role]': '"button"'\` can be declared right there.

## Example

\`\`\`ts
// Decorator style
@HostBinding('class.active') isActive = false;
@HostListener('click', ['$event'])
onClick(e: MouseEvent) { this.isActive = !this.isActive; }

// The host-object style — preferred
@Component({
  selector: 'app-btn',
  host: {
    '[class.primary]': 'isPrimary',
    '[attr.role]': '"button"',
    '(click)': 'onClick($event)',
  },
})
\`\`\`

Why: in the \`host\` object every binding lives **in one place**, in the metadata, instead of being scattered across class fields. It is considered more performant and is the preferred style in newer Angular guidelines, it behaves better with inheritance and linters, and static values need no logic at all.

## Nuances

- \`class.x\` toggles a class by boolean; \`style.prop\` does the same for a style; \`attr.x\` writes an actual **attribute**, not a DOM property.
- For high-frequency events (\`mousemove\`, \`scroll\`) \`@HostListener\` can hurt performance, because every firing drags change detection along — \`runOutsideAngular\` or signals help there.
- In zoneless mode host listeners mark the view dirty automatically.

## What to say in the interview

> \`HostBinding\` binds a class field to a property, attribute, class or style of the host element — the element the directive or component sits on — while \`HostListener\` subscribes to its events, including global targets such as \`window:resize\`. The modern alternative to both decorators is the \`host\` object in the \`@Component\` or \`@Directive\` metadata, where bindings are written as \`'[class.primary]': 'isPrimary'\` and \`'(click)': 'onClick(\$event)'\`. That style is preferred by the newer guidelines: all host bindings sit in one place instead of being smeared across class fields. As a nuance, \`HostListener\` on high-frequency events like \`mousemove\` or \`scroll\` costs performance because each event pulls change detection with it — there you reach for \`runOutsideAngular\` or signals. In zoneless, host listeners mark the view dirty by themselves.

## Gotchas

- **\`@HostListener('mousemove')\`** guarantees jank: change detection on every mouse move.
- **Confusing \`attr.disabled\` with \`disabled\`**: the first writes an HTML attribute, the second a DOM property — for native controls they are not the same.
- **Arrow functions do not work in the \`host\` object** — the value is a string expression evaluated in the component's context.
- **Duplicating a host binding in the component and in \`hostDirectives\`** creates a conflict over the same attribute.
- **Mixing decorators and the \`host\` object** in one class technically works but reads badly.
- **Expect the follow-up**: why the host object beats the decorators, and how not to destroy performance on frequent events.`,
    },
  },
  {
    id: 'ng-029',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['directive-composition', 'host-directives'],
    question: {
      ru: 'Что такое directive composition API (hostDirectives) и какие у него ограничения?',
      en: 'What is the directive composition API (hostDirectives) and what are its limitations?',
    },
    answer: {
      ru: `## Коротко

Directive Composition API (Angular 15+) позволяет компоненту или директиве **применить к своему host-элементу другие директивы** — через свойство \`hostDirectives\`. Это композиция поведения вместо наследования.

Аналогия: раньше, чтобы дать компоненту чужое поведение, приходилось либо наследоваться от базового класса (жёстко, один родитель), либо оборачивать компонент в шаблоне лишним тегом. Теперь это как надеть на человека сразу несколько бейджей: «умею фокус», «умею тултип», «умею drag». Человек тот же, поведений — сколько нужно.

## Что это даёт

1. **Переиспользование поведения** — доступность, тултипы, drag — без наследования и без обёрток в шаблоне.
2. **Выборочный экспорт наружу**: inputs и outputs host-директивы можно пробросить наружу, при желании переименовав.
3. **Участие в DI**: сервисы host-директив доступны самому компоненту.
4. Дизайн-системы вроде Angular CDK и Material активно используют это, чтобы навешивать примитивы поведения.

## Пример

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

Почему так: снаружи компонент выглядит как обычный \`app-menu-item\`, но уже умеет всё, что умеют \`CdkMenuItem\` и \`TooltipDirective\`. При этом наружу торчит только то, что вы явно перечислили: \`tooltipText\` под именем \`text\` и выход \`shown\`.

## Ограничения

- Host-директивы обязаны быть **standalone**.
- Применяются **статически**: список в декораторе — часть компиляции, менять его в рантайме нельзя.
- **Извне добавить нельзя** — только сам компонент решает, что на себя навесить.
- **Порядок важен**: host-директивы инстанцируются **до** самого компонента, что влияет на DI и на порядок выполнения хуков.
- По умолчанию inputs и outputs **не экспонируются** — их нужно перечислить явно.
- Возможны конфликты, если несколько директив биндят один и тот же host-атрибут.

## Что сказать на собеседовании

> Directive Composition API появился в Angular 15 и позволяет компоненту или директиве через свойство \`hostDirectives\` применить другие директивы к собственному host-элементу. Это композиция вместо наследования: поведение вроде доступности или drag переиспользуется без базовых классов и лишних обёрток в шаблоне. Inputs и outputs host-директивы наружу не выходят, их нужно перечислить явно, при этом можно переименовать. Host-директивы участвуют в DI, поэтому их сервисы доступны компоненту. Ограничения: host-директивы должны быть standalone и применяются статически на этапе компиляции.

## Ловушки

- **Ждать, что inputs проброшены автоматически** — нет, только явный список.
- **Не standalone-директива** в \`hostDirectives\` не скомпилируется.
- **Попытка менять список в рантайме** — невозможно, это статическая часть метаданных.
- **Два host-директивы на один атрибут** — молчаливый конфликт, побеждает последняя.
- **Порядок хуков** сбивает с толку: host-директивы инициализируются раньше компонента.
- **Спросят следом**: чем это лучше наследования от базового класса и как это используется в Angular CDK.`,
      en: `## In short

The Directive Composition API (Angular 15+) lets a component or directive **apply other directives to its own host element**, through the \`hostDirectives\` property. It is behaviour composition instead of inheritance.

The analogy: giving a component someone else's behaviour used to mean either extending a base class (rigid, one parent only) or wrapping the component in an extra tag in the template. Now it is like pinning several badges on a person: "can focus", "can tooltip", "can drag". Same person, as many behaviours as you need.

## What it gives you

1. **Reuse of behaviour** — accessibility, tooltips, drag — with no inheritance and no template wrappers.
2. **Selective exposure**: a host directive's inputs and outputs can be surfaced outward, renamed if you like.
3. **Participation in DI**: the host directives' services are available to the component itself.
4. Design systems such as Angular CDK and Material lean on it heavily to attach behaviour primitives.

## Example

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

Why: from the outside it is still an ordinary \`app-menu-item\`, but it already does everything \`CdkMenuItem\` and \`TooltipDirective\` do. And only what you listed is exposed: \`tooltipText\` under the name \`text\`, plus the \`shown\` output.

## Limitations

- Host directives must be **standalone**.
- They are applied **statically**: the decorator list is part of compilation and cannot change at runtime.
- **They cannot be added from outside** — only the component itself decides what to attach.
- **Order matters**: host directives are instantiated **before** the component itself, which affects DI and hook execution order.
- By default inputs and outputs are **not exposed** — you must list them explicitly.
- Conflicts are possible when several directives bind the same host attribute.

## What to say in the interview

> The Directive Composition API arrived in Angular 15 and lets a component or directive apply other directives to its own host element through the \`hostDirectives\` property. It is composition instead of inheritance: behaviour such as accessibility, tooltips or drag is reused with no base classes and no extra template wrappers. A host directive's inputs and outputs are not surfaced by default — you list them explicitly, and you can rename them while doing so. Host directives take part in DI, so their services are available to the component, and this is how the behaviour primitives in CDK and Material are built. The limitations are real: host directives must be standalone, they are applied statically at compile time, and they cannot be added from outside — only the component decides. Worth remembering separately that host directives are instantiated before the component itself, which affects DI and hook ordering, and that several directives can conflict over the same host attribute.

## Gotchas

- **Expecting inputs to be forwarded automatically** — they are not; only the explicit list is.
- **A non-standalone directive** in \`hostDirectives\` will not compile.
- **Trying to change the list at runtime** is impossible — it is static metadata.
- **Two host directives binding the same attribute** conflict silently; the last one wins.
- **Hook ordering surprises people**: host directives initialize before the component.
- **Expect the follow-up**: why this beats extending a base class, and how Angular CDK uses it.`,
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
    category: 'angular-signals',
    level: 'Expert',
    tags: ['ssr', 'hydration', 'performance'],
    question: {
      ru: 'Как работает non-destructive hydration в Angular SSR и зачем нужен provideClientHydration?',
      en: 'How does non-destructive hydration work in Angular SSR and why do you need provideClientHydration?',
    },
    answer: {
      ru: `## Коротко

Раньше SSR в Angular работал **разрушительно**: сервер присылал готовый HTML, а клиент при старте **сносил весь DOM** и рисовал заново. Отсюда мигание, потеря состояния DOM и плохие метрики. Non-destructive hydration (Angular 16, \`provideClientHydration()\`) означает, что клиент **переиспользует** серверный DOM: обходит его, сопоставляет с деревом компонентов и просто «подключает» обработчики и привязки.

Аналогия: вам привезли собранный шкаф. Старый подход — разобрать его до досок и собрать заново по своей инструкции. Новый — обойти шкаф, убедиться, что полки на месте, и просто привинтить ручки. Шкаф не шатается, пользователь ничего не заметил.

## Как это работает по шагам

1. Сервер рендерит HTML и добавляет в него специальные **аннотации** — комментарии-маркеры, описывающие границы view.
2. Клиент стартует и не трогает существующий DOM.
3. По аннотациям Angular сопоставляет серверные узлы с компонентами своего дерева.
4. К найденным узлам «прикручиваются» обработчики событий и привязки — DOM при этом не пересоздаётся.
5. Если серверная и клиентская разметка **не совпали**, Angular сообщает об этом ошибкой \`NG0500\`.

## Пример

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

Почему так: нет мигания, потому что DOM остаётся на месте; лучше Core Web Vitals — ниже CLS и быстрее TTI; и меньше работы при старте, потому что дерево не пересоздаётся.

## Дополнительные возможности и ограничения

- **\`withEventReplay()\`** — события, случившиеся **до** гидратации, воспроизводятся после неё. Пользователь кликнул, пока грузился JS, — клик не потерян.
- **\`withIncrementalHydration()\`** (Angular 19) — гидратация по требованию, интегрированная с \`@defer\`: блок гидратируется только когда сработал его триггер.
- **Прямая манипуляция DOM** через \`ElementRef\` или сторонние библиотеки ломает гидратацию: рассинхрон серверного и клиентского DOM даёт \`NG0500\`.
- **Контент должен быть детерминированным** между сервером и клиентом — никакого \`Math.random()\` и \`new Date()\` в разметке.
- **Атрибут \`ngSkipHydration\`** выключает гидратацию для проблемного поддерева — типично для обёрток сторонних виджетов.

## Что сказать на собеседовании

> Раньше Angular делал разрушающую гидратацию: клиент при старте удалял серверный DOM и перерисовывал его, из-за чего был flicker и страдали метрики. Начиная с Angular 16 через \`provideClientHydration()\` работает non-destructive hydration: сервер добавляет аннотации-маркеры с границами view, а клиент по ним сопоставляет серверный DOM с деревом компонентов и подключает обработчики и привязки, не пересоздавая узлы. Главное ограничение — разметка должна совпадать между сервером и клиентом: прямая манипуляция DOM приводит к ошибке \`NG0500\`; для проблемных поддеревьев есть атрибут \`ngSkipHydration\`.

## Ловушки

- **\`NG0500\`** — почти всегда означает расхождение серверного и клиентского DOM.
- **Прямые правки DOM в \`ngOnInit\`** ломают гидратацию — переносите их в \`afterNextRender\`.
- **\`new Date()\` или случайные значения в шаблоне** дают разную разметку на сервере и клиенте.
- **\`ngSkipHydration\` — не решение, а заплатка**: поддерево будет отрисовано заново, со всеми старыми минусами.
- **Сторонние виджеты, рисующие свой DOM**, почти всегда требуют \`ngSkipHydration\` или \`afterNextRender\`.
- **Спросят следом**: чем incremental hydration отличается от обычной и как \`withEventReplay\` спасает ранние клики.`,
      en: `## In short

Angular SSR used to be **destructive**: the server sent finished HTML and, on startup, the client **tore the whole DOM down** and rebuilt it. Hence flicker, lost DOM state and poor metrics. Non-destructive hydration (Angular 16, \`provideClientHydration()\`) means the client **reuses** the server DOM: it walks it, matches it against the component tree and simply "attaches" handlers and bindings.

The analogy: a wardrobe is delivered fully assembled. The old approach was to dismantle it into planks and rebuild it from your own instructions. The new one is to walk around it, confirm the shelves are where they should be, and just screw the handles on. The wardrobe never wobbles and the user never notices.

## How it works, step by step

1. The server renders HTML and inserts special **annotations** — marker comments describing view boundaries.
2. The client boots and leaves the existing DOM alone.
3. Using those annotations, Angular matches the server nodes to the components in its tree.
4. Event handlers and bindings are attached to the matched nodes — no DOM is recreated.
5. If the server and client markup **do not match**, Angular reports it with error \`NG0500\`.

## Example

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
\`\`\`

Why: no flicker, because the DOM stays put; better Core Web Vitals — lower CLS and faster TTI; and less startup work, because the tree is not rebuilt.

## Extra capabilities and limitations

- **\`withEventReplay()\`** — events that happened **before** hydration are replayed afterwards. The user clicked while JS was still loading, and the click is not lost.
- **\`withIncrementalHydration()\`** (Angular 19) — on-demand hydration integrated with \`@defer\`: a block hydrates only once its trigger fires.
- **Direct DOM manipulation** via \`ElementRef\` or third-party libraries breaks hydration: a server/client DOM mismatch produces \`NG0500\`.
- **Content must be deterministic** between server and client — no \`Math.random()\` or \`new Date()\` in the markup.
- **The \`ngSkipHydration\` attribute** disables hydration for a problematic subtree — typically wrappers around third-party widgets.

## What to say in the interview

> Angular used to do destructive hydration: the server sent HTML but the client removed the entire DOM on startup and re-rendered it, which caused flicker, lost DOM state and hurt the metrics. From Angular 16, \`provideClientHydration()\` enables non-destructive hydration: the server embeds marker annotations describing view boundaries, and the client uses them to match the server DOM against the component tree and simply attach event handlers and bindings without recreating nodes. The practical payoff is no flicker, lower CLS, faster TTI and less startup work. On top of that there is \`withEventReplay\`, which replays events that occurred before hydration, and \`withIncrementalHydration\` in Angular 19, which hydrates blocks on demand together with \`@defer\`. The main constraint is that markup must match between server and client: direct DOM manipulation through \`ElementRef\` or third-party libraries, and any non-deterministic content, lead to error \`NG0500\`; for problematic subtrees there is the \`ngSkipHydration\` attribute.

## Gotchas

- **\`NG0500\`** almost always means the server and client DOM diverged.
- **Direct DOM edits in \`ngOnInit\`** break hydration — move them into \`afterNextRender\`.
- **\`new Date()\` or random values in the template** produce different markup on server and client.
- **\`ngSkipHydration\` is a patch, not a fix**: that subtree is re-rendered from scratch, with all the old downsides.
- **Third-party widgets that draw their own DOM** almost always need \`ngSkipHydration\` or \`afterNextRender\`.
- **Expect the follow-up**: how incremental hydration differs from the regular kind, and how \`withEventReplay\` rescues early clicks.`,
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
    category: 'angular-signals',
    level: 'Hard',
    tags: ['ngzone', 'run-outside-angular', 'performance'],
    question: {
      ru: 'Зачем нужен NgZone.runOutsideAngular и когда его применять для оптимизации?',
      en: 'Why does NgZone.runOutsideAngular exist and when should you use it for optimization?',
    },
    answer: {
      ru: `## Коротко

Любое асинхронное событие внутри Angular-зоны запускает \`ApplicationRef.tick()\` — полный проход change detection. Для \`mousemove\`, \`scroll\`, \`requestAnimationFrame\` и частых таймеров это десятки и сотни лишних проходов в секунду. \`NgZone.runOutsideAngular(fn)\` выполняет колбэк **вне** зоны, и асинхронщина внутри него CD не запускает.

Аналогия: вахтёр отмечает каждое открывание двери и каждый раз гонит коменданта обходить весь дом. \`runOutsideAngular\` — это служебный вход, о котором вахтёр не знает. Грузчики ходят туда-сюда сколько угодно, коменданта никто не дёргает. А когда работа закончена, вы сами заходите через главный вход и говорите: «всё, теперь можно проверять» — это \`zone.run\`.

## Как это работает по шагам

1. Оборачиваем регистрацию частых обработчиков в \`zone.runOutsideAngular\`.
2. Внутри этого колбэка все \`addEventListener\`, таймеры и \`requestAnimationFrame\` привязываются к внешней зоне.
3. События срабатывают, ваш код выполняется, вычисления идут — но \`tick()\` не вызывается ни разу.
4. Когда результат действительно нужно показать, возвращаемся в зону через \`zone.run(...)\` — вот теперь CD отработает.
5. Альтернатива возврату — обновить сигнал или вызвать \`markForCheck()\`.

## Пример

\`\`\`ts
private zone = inject(NgZone);

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // цикл requestAnimationFrame
  });
}

private finish(next: Position) {
  this.zone.run(() => {
    this.position = next; // а вот теперь CD сработает
  });
}
\`\`\`

Почему так: 60 кадров анимации в секунду не должны приводить к 60 полным обходам дерева компонентов. Мы платим CD только за финальное, действительно видимое изменение.

## Где это применяют

- **Анимации** через \`requestAnimationFrame\`.
- **Drag & drop**, перетаскивание, resize.
- **Интеграция со сторонними библиотеками** — charts, maps, three.js — которые рисуют сами.
- **Частые события WebSocket или таймеров**, где не каждое сообщение требует перерисовки.

## Что сказать на собеседовании

> В zone-based приложении любое асинхронное событие внутри Angular-зоны приводит к вызову \`ApplicationRef.tick()\`, то есть к полному проходу change detection. На \`mousemove\` и \`scroll\` это десятки лишних проходов в секунду и заметные лаги. \`NgZone.runOutsideAngular\` выполняет колбэк вне зоны, поэтому обработчики и таймеры, зарегистрированные внутри, CD не запускают. Вычисления идут как обычно, но UI сам не обновляется, поэтому когда результат нужно показать, возвращаются в зону через \`zone.run\` либо вызывают \`markForCheck\`. В zoneless-режиме \`NgZone\` фактически no-op и эта оптимизация не нужна.

## Ловушки

- **Забыли вернуться в зону** — вычисления идут, а экран не обновляется; выглядит как «зависший» UI.
- **Не сняли обработчики в \`ngOnDestroy\`** — утечка, обработчики живут после уничтожения компонента.
- **Обернули слишком много** — вся ветка приложения перестаёт обновляться автоматически.
- **\`zone.run\` на каждое событие** сводит оптимизацию к нулю: вы вернули те же 60 tick в секунду.
- **В zoneless этот код бессмыслен**, а иногда и вреден — там \`NgZone\` не делает того, чего от него ждут.
- **Спросят следом**: как это связано с Zone.js и что изменится в zoneless-режиме.`,
      en: `## In short

Any async event inside the Angular zone triggers \`ApplicationRef.tick()\` — a full change detection pass. For \`mousemove\`, \`scroll\`, \`requestAnimationFrame\` and frequent timers that means dozens or hundreds of redundant passes per second. \`NgZone.runOutsideAngular(fn)\` runs the callback **outside** the zone, so async work inside it never triggers CD.

The analogy: the doorman logs every door opening and sends the building manager on a full round each time. \`runOutsideAngular\` is the service entrance the doorman does not watch. The movers can come and go as much as they like without disturbing anyone. And when the job is done you walk in through the front door yourself and say "right, you can inspect now" — that is \`zone.run\`.

## How it works, step by step

1. Wrap the registration of high-frequency handlers in \`zone.runOutsideAngular\`.
2. Inside that callback every \`addEventListener\`, timer and \`requestAnimationFrame\` binds to the outer zone.
3. Events fire, your code runs, computations happen — and \`tick()\` is never called.
4. When the result genuinely needs displaying, re-enter the zone with \`zone.run(...)\` — now CD runs.
5. The alternative to re-entering is updating a signal or calling \`markForCheck()\`.

## Example

\`\`\`ts
private zone = inject(NgZone);

ngOnInit() {
  this.zone.runOutsideAngular(() => {
    document.addEventListener('mousemove', this.onMove);
    this.animate(); // requestAnimationFrame loop
  });
}

private finish(next: Position) {
  this.zone.run(() => {
    this.position = next; // now CD will fire
  });
}
\`\`\`

Why: 60 animation frames per second should not mean 60 full walks of the component tree. You pay for change detection only on the final, genuinely visible change.

## Where it is used

- **Animations** via \`requestAnimationFrame\`.
- **Drag and drop**, dragging, resize.
- **Integrating third-party libraries** — charts, maps, three.js — that render themselves.
- **High-frequency WebSocket or timer events**, where not every message needs a repaint.

## What to say in the interview

> In a zone-based application every async event inside the Angular zone results in a call to \`ApplicationRef.tick()\`, that is, a full change detection pass. On high-frequency events — \`mousemove\`, \`scroll\`, \`requestAnimationFrame\`, frequent timers — that is dozens or hundreds of redundant passes per second and visible jank. \`NgZone.runOutsideAngular\` runs a callback outside the zone, so handlers and timers registered inside it do not trigger change detection. The computation still happens, but the UI does not refresh on its own, so when the result must be shown you re-enter the zone with \`zone.run\`, or explicitly call \`markForCheck\`, or update a signal. Classic use cases are animations, drag and drop, integrating third-party libraries that draw themselves, and event streams where you do not need to repaint on every message. The important modern nuance: in zoneless mode \`NgZone\` is effectively a no-op and this optimization is unnecessary, because change detection is driven by signals and frequent events do not trigger it by themselves.

## Gotchas

- **Forgetting to re-enter the zone** means the computation runs but the screen never updates — it looks like a frozen UI.
- **Not removing listeners in \`ngOnDestroy\`** leaks: the handlers outlive the component.
- **Wrapping too much** leaves an entire branch of the app without automatic updates.
- **Calling \`zone.run\` on every event** cancels the optimization: you are back to 60 ticks per second.
- **In zoneless this code is pointless**, sometimes harmful — \`NgZone\` no longer does what you expect there.
- **Expect the follow-up**: how this relates to Zone.js, and what changes under zoneless.`,
    },
    codeSnippet: `this.zone.runOutsideAngular(() => {
  el.addEventListener('mousemove', this.onMove); // no CD per move
});
// Re-enter only when UI must update:
this.zone.run(() => (this.pos = next));`,
  },
  {
    id: 'ng-032',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['pipes', 'pure-impure', 'performance'],
    question: {
      ru: 'В чём разница между pure и impure пайпами и как это влияет на производительность?',
      en: 'What is the difference between pure and impure pipes and how does it affect performance?',
    },
    answer: {
      ru: `## Коротко

**Pure-пайп** (по умолчанию) пересчитывается только когда изменилась **ссылка** на входное значение — или само примитивное значение. **Impure-пайп** (\`pure: false\`) вызывается на **каждом** проходе change detection, независимо ни от чего.

Аналогия: pure-пайп — это калькулятор с памятью. Ввели те же числа — он мгновенно отдаёт сохранённый ответ. Impure-пайп — калькулятор без памяти, который честно считает заново при каждом взгляде на экран. Сотни раз в секунду.

## Как это работает

1. Angular при каждом CD сравнивает входные аргументы пайпа. Для pure-пайпа сравнение — простое \`===\`, то есть очень дёшево.
2. Ссылка не изменилась — \`transform\` **не вызывается**, отдаётся закэшированный результат.
3. Ссылка изменилась — \`transform\` выполняется, результат кэшируется.
4. Для impure-пайпа этой проверки нет вообще: \`transform\` вызывается всегда, на каждом CD и на каждое событие.

## Пример

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true по умолчанию
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // вызовется только при смене value или factor
  }
}

@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

\`\`\`ts
this.items.push(x);              // pure-пайп не среагирует: ссылка та же
this.items = [...this.items, x]; // новая ссылка — среагирует
\`\`\`

Почему так: pure-пайп смотрит **только на ссылку**. Мутация массива для него невидима — ровно та же логика, что и у \`OnPush\`.

## Когда impure оправдан

- **\`AsyncPipe\` — impure**, и это правильно: ему нужно реагировать на эмиссии \`Observable\` и \`Promise\`, которые не меняют входную ссылку.
- Пайпы, зависящие от **внешнего изменяемого состояния**, которое в аргументах никак не отражается.

Во всех остальных случаях impure — это скрытый bottleneck: тяжёлая логика внутри выполнится сотни раз в секунду.

## Что сказать на собеседовании

> По умолчанию пайпы pure: Angular кэширует результат и вызывает \`transform\` только при смене ссылки на аргумент или примитивного значения, а проверка на каждом цикле change detection — дешёвое сравнение по \`===\`. Флаг \`pure: false\` делает пайп impure: \`transform\` вызывается на каждом проходе CD независимо от изменений — сотни вызовов в секунду и просадка, если внутри тяжёлая логика. Обратная сторона pure-пайпов: мутация массива через \`push\` их не пересчитает, нужна новая ссылка — та же семантика, что у \`OnPush\`. Impure оправдан, когда изменение не выражается сменой аргумента, — канонический пример \`AsyncPipe\`.

## Ловушки

- **Фильтрация и сортировка impure-пайпом** — классическая причина тормозов в списках.
- **\`push\` в массив и ожидание, что pure-пайп обновится** — не обновится.
- **Возврат нового объекта из pure-пайпа** каждый раз при том же входе бессмысленен, но безвреден; из impure — гарантированный шторм пересозданий.
- **Тяжёлые вычисления внутри \`transform\`** без мемоизации — платите на каждом вызове.
- **Пайп с побочными эффектами** — антипаттерн: число вызовов не гарантировано.
- **Спросят следом**: почему \`AsyncPipe\` impure и чем \`computed\` лучше пайпа для производных данных.`,
      en: `## In short

A **pure pipe** (the default) recomputes only when the **reference** of its input changes — or the primitive value itself. An **impure pipe** (\`pure: false\`) is invoked on **every** change detection pass, regardless of anything.

The analogy: a pure pipe is a calculator with memory. Feed it the same numbers and it instantly returns the stored answer. An impure pipe is a calculator with no memory that dutifully recalculates every time you glance at the screen. Hundreds of times per second.

## How it works

1. On every CD Angular compares the pipe's arguments. For a pure pipe that comparison is a plain \`===\`, which is very cheap.
2. Reference unchanged — \`transform\` is **not called**, the cached result is returned.
3. Reference changed — \`transform\` runs and the result is cached.
4. For an impure pipe there is no such check at all: \`transform\` is called always, on every CD and every event.

## Example

\`\`\`ts
@Pipe({ name: 'multiply' }) // pure: true by default
export class MultiplyPipe implements PipeTransform {
  transform(value: number, factor: number): number {
    return value * factor; // called only when value or factor change
  }
}

@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform { /* ... */ }
\`\`\`

\`\`\`ts
this.items.push(x);              // pure pipe won't react: same reference
this.items = [...this.items, x]; // new reference — it reacts
\`\`\`

Why: a pure pipe looks **only at the reference**. An in-place mutation is invisible to it — the exact same logic as \`OnPush\`.

## When impure is justified

- **\`AsyncPipe\` is impure**, and rightly so: it has to react to \`Observable\` and \`Promise\` emissions, which never change the input reference.
- Pipes that depend on **external mutable state** not reflected in the arguments at all.

In every other case impure is a hidden bottleneck: heavy logic inside it will run hundreds of times per second.

## What to say in the interview

> Pipes are pure by default: Angular caches the result and calls \`transform\` only when the input reference or primitive value changes, and the per-cycle check is a cheap \`===\` comparison. The \`pure: false\` flag makes a pipe impure, and then \`transform\` runs on every change detection pass regardless of changes — on an active UI that means hundreds of calls per second and a serious hit if the logic inside is heavy. The flip side of pure pipes is that they only react to reference changes: mutating an array with \`push\` will not recompute them, you need a new reference — the same semantics as \`OnPush\`. Impure is justified where the change fundamentally cannot be expressed as a changed argument; the canonical example is \`AsyncPipe\`, which must react to stream emissions. The practical recommendation is to avoid filtering and sorting through template pipes altogether — move it into a \`computed\` signal or derived component state, where the computation is controlled and memoized.

## Gotchas

- **Filtering and sorting in an impure pipe** is the classic cause of sluggish lists.
- **Pushing into an array and expecting a pure pipe to update** — it will not.
- **Returning a new object from a pure pipe** on identical input is pointless but harmless; from an impure one it is a guaranteed storm of re-creations.
- **Heavy computation inside \`transform\`** without memoization is paid on every call.
- **A pipe with side effects** is an anti-pattern: the number of invocations is not guaranteed.
- **Expect the follow-up**: why \`AsyncPipe\` is impure, and why \`computed\` beats a pipe for derived data.`,
    },
  },
  {
    id: 'ng-033',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'navigation-lifecycle', 'params'],
    question: {
      ru: 'Как устроен жизненный цикл навигации роутера и как реактивно работать с параметрами маршрута?',
      en: 'How is the router navigation lifecycle structured and how do you work with route params reactively?',
    },
    answer: {
      ru: `## Коротко

Навигация — это не мгновенное действие, а **последовательность фаз**, о каждой из которых роутер сообщает событием в \`Router.events\`. И ключевая вещь про параметры: при переходе на **тот же** компонент с другими параметрами Angular его **не пересоздаёт**, поэтому \`ngOnInit\` второй раз не вызовется.

Аналогия: посадка на рейс. Объявили посадку, подвезли самолёт (загрузка lazy-чанка), проверили билеты и паспорта (guards), выдали еду на борт (resolvers), взлетели (NavigationEnd). На любом этапе рейс могут отменить — это \`NavigationCancel\` или \`NavigationError\`. И если вы летите тем же бортом в другой город, самолёт не строят заново — просто меняют маршрутный лист.

## Фазы навигации

1. **\`NavigationStart\`** — навигация началась.
2. **\`RouteConfigLoadStart\` / \`RouteConfigLoadEnd\`** — загрузка lazy-чанка, если он нужен.
3. **\`GuardsCheckStart\` / \`GuardsCheckEnd\`** — выполняются \`CanMatch\`, \`CanActivate\`, \`CanDeactivate\`.
4. **\`ResolveStart\` / \`ResolveEnd\`** — работают резолверы.
5. **\`NavigationEnd\`** — успешное завершение.
6. **\`NavigationCancel\`** (guard вернул \`false\` или \`UrlTree\`) либо **\`NavigationError\`**.

## Пример

\`\`\`ts
private route = inject(ActivatedRoute);

// Реактивно: эмитит и при переходе на тот же компонент
id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // данные резолвера

// Разово: значение на момент активации
const idOnce = this.route.snapshot.paramMap.get('id');
\`\`\`

Почему так: \`snapshot\` — это фотография параметров **на момент активации**. Если пользователь перешёл с \`/user/1\` на \`/user/2\`, компонент переиспользуется, \`ngOnInit\` не вызывается, и снимок останется старым. \`paramMap\` как \`Observable\` эмитит всегда — именно поэтому для маршрутов вида \`/user/:id\` нужны потоки, а не снимок.

## Современный способ работать с параметрами

С Angular 16 есть \`withComponentInputBinding()\`: параметры маршрута биндятся прямо во входы компонента.

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// в компоненте — приедет автоматически из route param :id
id = input.required<string>();
\`\`\`

Альтернатива — \`toSignal(route.paramMap)\`, чтобы получить реактивный сигнал вместо подписки.

## Что сказать на собеседовании

> Навигация роутера проходит через серию событий в \`Router.events\`: \`NavigationStart\`, затем \`RouteConfigLoadStart\` и \`End\`, дальше \`GuardsCheckStart\` и \`End\`, потом \`ResolveStart\` и \`End\`, и в конце \`NavigationEnd\` при успехе либо \`NavigationCancel\`, если guard вернул \`false\` или \`UrlTree\`, либо \`NavigationError\`. Для параметров важно различать \`snapshot\` и потоки: \`snapshot.paramMap\` даёт значение на момент активации и не обновляется при навигации на тот же компонент, а \`paramMap\` как \`Observable\` эмитит всегда. Это важно: Angular переиспользует компонент при смене параметров, и \`ngOnInit\` повторно не вызывается.

## Ловушки

- **Загрузка данных в \`ngOnInit\` по \`snapshot\`** — при переходе \`/user/1\` → \`/user/2\` данные не обновятся.
- **Подписка на \`router.events\` без \`filter\`** — вы получите весь поток служебных событий.
- **Забыли отписаться** от \`paramMap\` или \`router.events\` — утечка; используйте \`takeUntilDestroyed\` или async pipe.
- **\`NavigationCancel\` молчалив** — если не логировать, отказ guard'а выглядит как «кнопка не работает».
- **\`queryParamMap\` и \`paramMap\` — разные потоки**: query-параметры в \`paramMap\` не попадают.
- **Спросят следом**: почему компонент не пересоздаётся при смене параметра и как это поведение изменить.`,
      en: `## In short

Navigation is not an instant action but a **sequence of phases**, each announced by an event on \`Router.events\`. And the key fact about params: navigating to the **same** component with different params does **not** recreate it, so \`ngOnInit\` never runs a second time.

The analogy: boarding a flight. Boarding is announced, the aircraft pulls up (lazy chunk load), tickets and passports are checked (guards), catering is loaded (resolvers), and you take off (NavigationEnd). At any stage the flight can be cancelled — that is \`NavigationCancel\` or \`NavigationError\`. And if you fly the same aircraft to a different city, nobody builds a new plane — they just change the flight plan.

## The navigation phases

1. **\`NavigationStart\`** — navigation began.
2. **\`RouteConfigLoadStart\` / \`RouteConfigLoadEnd\`** — fetching a lazy chunk, if one is needed.
3. **\`GuardsCheckStart\` / \`GuardsCheckEnd\`** — \`CanMatch\`, \`CanActivate\` and \`CanDeactivate\` run.
4. **\`ResolveStart\` / \`ResolveEnd\`** — the resolvers run.
5. **\`NavigationEnd\`** — successful completion.
6. **\`NavigationCancel\`** (a guard returned \`false\` or a \`UrlTree\`) or **\`NavigationError\`**.

## Example

\`\`\`ts
private route = inject(ActivatedRoute);

// Reactive: emits even when navigating to the same component
id$ = this.route.paramMap.pipe(map(p => p.get('id')));
query$ = this.route.queryParamMap;
data$ = this.route.data; // resolver data

// One-off: the value at activation time
const idOnce = this.route.snapshot.paramMap.get('id');
\`\`\`

Why: \`snapshot\` is a photograph of the params **at activation time**. If the user goes from \`/user/1\` to \`/user/2\`, the component is reused, \`ngOnInit\` does not run, and the snapshot stays stale. \`paramMap\` as an \`Observable\` always emits — which is exactly why routes like \`/user/:id\` need streams, not snapshots.

## The modern way to read params

Angular 16 added \`withComponentInputBinding()\`: route params bind straight into component inputs.

\`\`\`ts
provideRouter(routes, withComponentInputBinding());

// in the component — arrives automatically from the :id route param
id = input.required<string>();
\`\`\`

The alternative is \`toSignal(route.paramMap)\` for a reactive signal instead of a subscription.

## What to say in the interview

> Router navigation goes through a series of events exposed on \`Router.events\`: \`NavigationStart\`, then \`RouteConfigLoadStart\` and \`End\` when a lazy chunk must be fetched, then \`GuardsCheckStart\` and \`End\`, then \`ResolveStart\` and \`End\` for the resolvers, and finally \`NavigationEnd\` on success, or \`NavigationCancel\` when a guard returns \`false\` or a \`UrlTree\`, or \`NavigationError\`. For params it is essential to distinguish the snapshot from the streams: \`snapshot.paramMap\` gives the value at activation time and never updates when navigation targets the same component with different params, whereas \`paramMap\` as an \`Observable\` always emits. That matters because by default Angular reuses the component on a param change and \`ngOnInit\` does not run again. In modern Angular the more convenient option is \`withComponentInputBinding()\`, which binds params directly into component inputs.

## Gotchas

- **Loading data in \`ngOnInit\` from the snapshot** breaks on \`/user/1\` → \`/user/2\`: the data never refreshes.
- **Subscribing to \`router.events\` without a \`filter\`** floods you with every internal event.
- **Forgetting to unsubscribe** from \`paramMap\` or \`router.events\` leaks; use \`takeUntilDestroyed\` or the async pipe.
- **\`NavigationCancel\` is silent** — without logging, a guard rejection just looks like "the button does nothing".
- **\`queryParamMap\` and \`paramMap\` are separate streams**: query params never appear in \`paramMap\`.
- **Expect the follow-up**: why the component is not recreated on a param change, and how to change that behaviour.`,
    },
    codeSnippet: `provideRouter(routes, withComponentInputBinding());

// Component receives :id route param as a signal input automatically
id = input.required<string>();`,
  },
  {
    id: 'ng-034',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['signals', 'rxjs-interop', 'to-signal'],
    question: {
      ru: 'Как интегрировать сигналы и RxJS через toSignal и toObservable и какие нюансы у toSignal?',
      en: 'How do you integrate signals and RxJS via toSignal and toObservable, and what are the nuances of toSignal?',
    },
    answer: {
      ru: `## Коротко

Два хелпера-переходника между мирами. \`toSignal(observable$)\` превращает поток в сигнал, сам подписываясь и сам отписываясь при уничтожении. \`toObservable(signal)\` наоборот — превращает сигнал в поток.

Аналогия: сигнал — это табло с текущим значением, на него посмотрел и всё узнал. Observable — это лента новостей, где важна вся последовательность событий и их тайминг. \`toSignal\` вешает табло на конец ленты. \`toObservable\` пускает ленту от табло, чтобы можно было применить к ней операторы вроде \`debounceTime\` и \`switchMap\`.

## Как это работает

1. **\`toSignal\`** подписывается на поток **сразу** при создании — подписка «горячая», не ленивая.
2. Отписка происходит автоматически при уничтожении: хелпер цепляется к \`DestroyRef\`. Ручные \`subscribe\`/\`unsubscribe\` и \`async\`-пайп больше не нужны.
3. До первой эмиссии сигнал равен \`undefined\`, поэтому тип становится \`T | undefined\`. Убрать это можно опцией \`initialValue\` либо \`requireSync: true\` — последнее для потоков, эмитящих синхронно, вроде \`BehaviorSubject\` и \`of\`.
4. Вызывать \`toSignal\` нужно в **injection-контексте** или передавать \`{ injector }\` — именно из-за привязки к \`DestroyRef\`.
5. Ошибки Observable пробрасываются в момент **чтения** сигнала, а не в момент их возникновения.
6. **\`toObservable\`** под капотом использует \`effect\`, чтобы отслеживать изменения сигнала и эмитить их.

## Пример

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));

count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });

query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

Почему так: сигналы отлично держат синхронное состояние, но у них нет операторов для сложной асинхронной композиции. Поиск с задержкой и отменой предыдущего запроса естественно пишется на RxJS — а результат снова можно завернуть в сигнал через \`toSignal\`.

## Важный нюанс toObservable

Эмиссии происходят **асинхронно**, через \`effect\` в конце цикла change detection, а не синхронно в момент \`set\`. Поэтому несколько быстрых изменений подряд могут **схлопнуться в одну эмиссию** — это прямое следствие glitch-free батчинга сигналов.

## Что сказать на собеседовании

> \`toSignal\` превращает \`Observable\` в сигнал: он подписывается сразу при создании и автоматически отписывается при уничтожении, цепляясь к \`DestroyRef\`, поэтому ручные подписки и \`async\`-пайп не нужны. Ключевой нюанс — начальное значение: до первой эмиссии сигнал равен \`undefined\` и тип получается \`T | undefined\`, что снимается опцией \`initialValue\` или флагом \`requireSync\` для синхронных источников. \`toObservable\` работает в обратную сторону через \`effect\`: его эмиссии асинхронны, в конце цикла change detection, и несколько быстрых изменений могут схлопнуться в одну из-за glitch-free батчинга.

## Ловушки

- **Забыли \`initialValue\`** — получаете \`T | undefined\` и лишние проверки по всему коду.
- **\`requireSync: true\` на несинхронном потоке** — ошибка в рантайме.
- **\`toSignal\` вне injection-контекста** — ошибка; передавайте \`injector\`.
- **Ждёте синхронную эмиссию от \`toObservable\` сразу после \`set\`** — её не будет.
- **Быстрые последовательные \`set\`** дают одну эмиссию, а не несколько — для потоков, где важен каждый шаг, это критично.
- **Спросят следом**: почему \`toSignal\` подписывается сразу и чем \`toObservable\` отличается от \`Subject\`.`,
      en: `## In short

Two adapters between the two worlds. \`toSignal(observable$)\` turns a stream into a signal, subscribing and unsubscribing on its own when the context is destroyed. \`toObservable(signal)\` goes the other way, turning a signal into a stream.

The analogy: a signal is a display board showing the current value — glance at it and you know everything. An Observable is a news feed, where the whole sequence of events and their timing matter. \`toSignal\` hangs a display board at the end of the feed. \`toObservable\` starts a feed from the board so you can apply operators like \`debounceTime\` and \`switchMap\` to it.

## How it works

1. **\`toSignal\`** subscribes to the stream **immediately** on creation — the subscription is hot, not lazy.
2. Unsubscription happens automatically on destruction: the helper ties itself to \`DestroyRef\`. Manual \`subscribe\`/\`unsubscribe\` and the \`async\` pipe become unnecessary.
3. Before the first emission the signal is \`undefined\`, so the type becomes \`T | undefined\`. Remove that with the \`initialValue\` option, or with \`requireSync: true\` for synchronously emitting sources such as \`BehaviorSubject\` and \`of\`.
4. \`toSignal\` must be called in an **injection context**, or given an \`{ injector }\` — precisely because of the \`DestroyRef\` binding.
5. Observable errors are thrown when the signal is **read**, not when they occur.
6. **\`toObservable\`** uses an \`effect\` under the hood to track signal changes and emit them.

## Example

\`\`\`ts
private route = inject(ActivatedRoute);
id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));

count = toSignal(this.source$, { initialValue: 0 });
state = toSignal(this.behaviorSubject$, { requireSync: true });

query = signal('');
results$ = toObservable(this.query).pipe(
  debounceTime(300),
  switchMap(q => this.api.search(q)),
);
\`\`\`

Why: signals hold synchronous state beautifully but have no operators for complex async composition. Debounced search that cancels the previous request is naturally written in RxJS — and the result can be wrapped back into a signal with \`toSignal\`.

## The important toObservable nuance

Emissions are **asynchronous**, produced by an \`effect\` at the end of the change detection cycle rather than synchronously on \`set\`. So several rapid changes can **collapse into a single emission** — a direct consequence of the glitch-free batching of signals.

## What to say in the interview

> \`toSignal\` converts an \`Observable\` into a signal: it subscribes immediately on creation and unsubscribes automatically on destruction by tying itself to \`DestroyRef\`, which makes manual subscriptions and the \`async\` pipe unnecessary. The key nuance is the initial value: before the first emission the signal is \`undefined\` and the type is \`T | undefined\`, which you fix with \`initialValue\` or with the \`requireSync\` flag for synchronously emitting sources like \`BehaviorSubject\`. It must be called in an injection context or given an explicit \`injector\`, and stream errors are thrown when the signal is read. \`toObservable\` goes the other way and uses an \`effect\` internally to track signal changes; its emissions are asynchronous, produced at the end of the change detection cycle, and several rapid changes can collapse into one emission because of glitch-free batching. Together they give the best of both worlds: signals for synchronous state and RxJS for complex async composition — debounce, switchMap, retry.

## Gotchas

- **Forgetting \`initialValue\`** leaves you with \`T | undefined\` and null checks scattered everywhere.
- **\`requireSync: true\` on a non-synchronous stream** throws at runtime.
- **\`toSignal\` outside an injection context** errors; pass an \`injector\`.
- **Expecting a synchronous emission from \`toObservable\` right after a \`set\`** — there is none.
- **Rapid consecutive \`set\` calls** produce one emission, not several — critical for streams where every step matters.
- **Expect the follow-up**: why \`toSignal\` subscribes eagerly, and how \`toObservable\` differs from a \`Subject\`.`,
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
    category: 'angular-signals',
    level: 'Medium',
    tags: ['dependency-injection', 'provided-in', 'tree-shaking'],
    question: {
      ru: 'Какие значения providedIn существуют и как providedIn влияет на tree-shaking?',
      en: 'What providedIn values exist and how does providedIn affect tree-shaking?',
    },
    answer: {
      ru: `## Коротко

\`providedIn\` отвечает на вопрос «в каком инжекторе живёт этот сервис». И главное: он объявляет эту связь **внутри самого сервиса**, а не в чужом массиве \`providers\` — благодаря чему сервис становится tree-shakable.

Аналогия: старый способ — это список жильцов на стене подъезда. Даже если человек давно съехал, он в списке, и почтальон таскает ему газеты. \`providedIn\` — это табличка на самой двери квартиры: нет двери — нет и записи, никто ничего лишнего не носит.

## Какие бывают значения

1. **\`'root'\`** — синглтон на всё приложение, в корневом \`EnvironmentInjector\`. Самый частый вариант.
2. **\`'platform'\`** — синглтон, общий для **всех Angular-приложений на странице**. Редкий случай, актуален для микрофронтендов.
3. **\`'any'\`** — **отдельный экземпляр в каждом lazy-загруженном инжекторе** плюс один в root для eager-частей. Нужен, когда состояние должно быть изолировано по ленивому участку.
4. **Конкретный класс или \`EnvironmentInjector\`** — более редкая привязка к конкретному scope.

## Пример

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

Почему так: связь «сервис → инжектор» объявлена в самом сервисе. Если его **нигде не инжектят**, бандлер видит, что ссылок нет, и **выбрасывает** его из бандла. При старом стиле — \`providers: [MyService]\` в \`NgModule\` — сервис попадал в бандл **всегда**, даже неиспользуемый, потому что массив \`providers\` это статическая ссылка на класс.

## Что выбирать на практике

- **Большинству сервисов** — \`providedIn: 'root'\`: синглтон и tree-shakable одновременно.
- **Состоянию, привязанному к компоненту** — \`providers\` в \`@Component\`, а не \`providedIn\`: так получится экземпляр на каждый инстанс компонента.
- **\`providedIn: 'any'\`** — когда каждому ленивому участку нужна собственная копия сервиса.

## Что сказать на собеседовании

> \`providedIn\` объявляет, в каком инжекторе регистрируется сервис, причём объявление живёт в самом сервисе. \`'root'\` — синглтон на всё приложение в корневом \`EnvironmentInjector\`; \`'platform'\` — синглтон, разделяемый всеми Angular-приложениями на странице, что актуально для микрофронтендов. Главное преимущество перед \`providers\` — tree-shakability: связь описана в самом сервисе, поэтому бандлер удаляет неиспользуемый класс из бандла. Нюанс: \`providedIn: 'root'\` создаёт сервис лениво, при первой инъекции, поэтому побочный эффект в конструкторе может не выполниться, пока сервис не запросят.

## Ловушки

- **Побочный эффект в конструкторе сервиса** может не выполниться никогда — сервис создаётся лениво.
- **\`providedIn: 'root'\` для состояния формы** — получите общий синглтон вместо изолированного состояния.
- **\`providedIn: 'any'\` путают с \`'root'\`** — во втором случае lazy-участки делят один экземпляр.
- **\`providers\` в \`NgModule\`** отключает tree-shaking сервиса.
- **\`'platform'\` в обычном приложении** почти всегда ошибка — это про несколько приложений на одной странице.
- **Спросят следом**: чем \`root\` отличается от \`platform\`, почему сервис не создаётся при старте и как получить экземпляр на компонент.`,
      en: `## In short

\`providedIn\` answers "which injector does this service live in". And crucially it declares that link **inside the service itself** rather than in someone else's \`providers\` array — which is what makes the service tree-shakable.

The analogy: the old way is a resident list posted in the building lobby. Even if someone moved out long ago they are still on the list and the postman keeps delivering their newspapers. \`providedIn\` is a nameplate on the flat's own door: no door, no entry, nothing pointlessly delivered.

## The available values

1. **\`'root'\`** — an app-wide singleton in the root \`EnvironmentInjector\`. The most common choice.
2. **\`'platform'\`** — a singleton shared across **all Angular applications on the page**. Rare, relevant for microfrontends.
3. **\`'any'\`** — a **separate instance in each lazy-loaded injector**, plus one in root for the eager parts. Use it when state must be isolated per lazy segment.
4. **A specific class or \`EnvironmentInjector\`** — a rarer binding to a particular scope.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {}
\`\`\`

Why: the "service → injector" link is declared in the service itself. If it is **injected nowhere**, the bundler sees no references and **drops** it from the bundle. With the old style — \`providers: [MyService]\` in an \`NgModule\` — the service **always** entered the bundle, used or not, because the \`providers\` array is a static reference to the class.

## What to choose in practice

- **For most services** — \`providedIn: 'root'\`: singleton and tree-shakable at once.
- **For state tied to a component** — \`providers\` in \`@Component\`, not \`providedIn\`: that gives one instance per component instance.
- **\`providedIn: 'any'\`** — when every lazy segment needs its own copy of the service.

## What to say in the interview

> \`providedIn\` declares which injector a service is registered in, and that declaration lives in the service itself. There are several values: \`'root'\` for an app-wide singleton in the root \`EnvironmentInjector\`, the most common one; \`'platform'\` for a singleton shared by every Angular application on the page, relevant to microfrontends; and binding to a specific injector or class. The main advantage over registering in a \`providers\` array is tree-shakability: because the link is described in the service, the bundler can see there are no references to it and remove the class. An important nuance: \`providedIn: 'root'\` creates the service lazily — the instance appears on first injection, not at app startup — which is both an optimization and the reason a side effect in a service constructor may never run until something asks for the service.

## Gotchas

- **A side effect in a service constructor** may never execute — the service is created lazily.
- **\`providedIn: 'root'\` for form state** gives you a shared singleton instead of isolated state.
- **Confusing \`providedIn: 'any'\` with \`'root'\`** — with the latter, lazy segments share one instance.
- **\`providers\` in an \`NgModule\`** disables tree-shaking for that service.
- **\`'platform'\` in a normal app** is almost always a mistake — it is for multiple apps on one page.
- **Expect the follow-up**: how \`root\` differs from \`platform\`, why the service is not created at startup, and how to get one instance per component.`,
    },
  },
  {
    id: 'ng-036',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['signals', 'signal-components', 'change-detection'],
    question: {
      ru: 'Как сигнал, прочитанный в шаблоне, связывается с change detection компонента под капотом?',
      en: 'How does a signal read in a template get wired to the component change detection under the hood?',
    },
    answer: {
      ru: `## Коротко

Шаблон компонента — это тоже **потребитель сигналов**, такой же, как \`computed\` или \`effect\`. Когда в шаблоне пишется \`{{ count() }}\`, это чтение происходит внутри реактивного контекста вида, и сигнал запоминает: «от меня зависит вот этот компонент».

Аналогия: подписка на рассылку. Компонент, прочитав сигнал, автоматически оставляет свой адрес. Изменился сигнал — письмо уходит **только подписчикам**, а не всем жильцам дома, как это делал Zone.js.

## Как это работает по шагам

1. Каждый компонент в Ivy имеет внутреннюю структуру \`LView\`, и у неё есть свой **reactive consumer** — узел графа сигналов.
2. Перед рендером шаблона Angular делает этот узел «активным потребителем».
3. Шаблон читает \`count()\`. В этот момент сигнал-producer **регистрирует** активного потребителя в своём списке зависимостей, а потребитель запоминает producer. Связь двусторонняя — механика ровно та же, что у \`computed\` и \`effect\`.
4. Кто-то вызывает \`count.set(...)\`. Все зависимые потребители помечаются **stale**.
5. Reactive-узел \`LView\` вызывает эквивалент \`markViewDirty\`: вид помечается грязным, и пометка идёт **вверх по дереву**, как при \`markForCheck\`.
6. \`ChangeDetectionScheduler\` ставит задачу на перерисовку — не мгновенно, а с батчингом.

## Пример

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ count() }} / {{ double() }}',
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → грязным становится ИМЕННО этот view, computed пересчитается лениво
}
\`\`\`

Почему так: помечается **только тот компонент**, который реально читал изменившийся сигнал, а не всё дерево. Именно это отличает подход от Zone.js, где сигналом к проверке служил сам факт «что-то асинхронное завершилось».

## Версионирование

У каждого узла графа есть счётчик \`version\`. Перед перерендером Angular сверяет версии и проверяет, **действительно ли** изменилась хоть одна зависимость вида. Если нет — рендер пропускается. Отсюда и glitch-free поведение, и минимум лишней работы.

## Что сказать на собеседовании

> У каждого компонента в Ivy есть \`LView\`, и с ним связан reactive consumer — узел того же графа сигналов, что \`computed\` и \`effect\`. Перед вычислением шаблона Angular делает узел активным потребителем, поэтому чтение сигнала в шаблоне регистрирует двустороннюю связь. При записи в сигнал зависимые потребители помечаются stale, \`LView\` вызывает эквивалент \`markViewDirty\`, помечая вид и цепочку предков, а \`ChangeDetectionScheduler\` планирует перерисовку с батчингом. Принципиальное отличие от Zone.js — гранулярность: помечается только компонент, который читал изменившийся сигнал, а не всё дерево.

## Ловушки

- **Сигнал, прочитанный не в шаблоне, а в обычном методе**, зависимость для вида не зарегистрирует.
- **Условное чтение в шаблоне** меняет набор зависимостей: пока ветка не выполнилась, сигнал в неё не входит.
- **Мутация объекта внутри сигнала** не меняет его версию — вид не станет грязным.
- **\`markViewDirty\` идёт вверх**, но проверяется поддерево — путать направления на собеседовании не стоит.
- **Батчинг означает, что DOM обновится не мгновенно** после \`set\`.
- **Спросят следом**: чем этот механизм отличается от \`markForCheck\` при \`OnPush\` и зачем нужны версии узлов.`,
      en: `## In short

A component's template is a **signal consumer** too, exactly like a \`computed\` or an \`effect\`. When the template says \`{{ count() }}\`, that read happens inside the view's reactive context, and the signal records: "this component depends on me".

The analogy: a mailing list subscription. By reading the signal, the component automatically leaves its address. When the signal changes, the letter goes **only to subscribers** — not to every resident in the building, which is what Zone.js effectively did.

## How it works, step by step

1. Every component in Ivy has an internal \`LView\` structure, and that structure owns a **reactive consumer** — a node in the signal graph.
2. Before evaluating the template Angular makes that node the "active consumer".
3. The template reads \`count()\`. At that moment the producer signal **registers** the active consumer in its dependency list and the consumer records the producer. The link is bidirectional — the very same mechanism as \`computed\` and \`effect\`.
4. Somebody calls \`count.set(...)\`. All dependent consumers are marked **stale**.
5. The \`LView\` reactive node invokes the equivalent of \`markViewDirty\`: the view is marked dirty and the mark travels **up the tree**, exactly like \`markForCheck\`.
6. The \`ChangeDetectionScheduler\` schedules a re-render — not instantly, but batched.

## Example

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ count() }} / {{ double() }}',
})
export class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
  // count.set(n) → THIS view becomes dirty, the computed recomputes lazily
}
\`\`\`

Why: only the component that actually read the changed signal is marked, not the whole tree. That is exactly what separates this from Zone.js, where the trigger was merely the fact that "some async work finished".

## Versioning

Every graph node carries a \`version\` counter. Before re-rendering, Angular compares versions to confirm that a view dependency genuinely changed. If none did, the render is skipped. That is where the glitch-free behaviour and the minimal wasted work come from.

## What to say in the interview

> Every component in Ivy has an \`LView\`, and attached to it is a reactive consumer — a node in the same signal graph that \`computed\` and \`effect\` use. Before evaluating the template Angular makes that node the active consumer, so any signal read in the template registers a bidirectional link. On a signal write all dependent consumers are marked stale, the \`LView\` reactive node calls the equivalent of \`markViewDirty\`, which marks the view and its ancestor chain, and the \`ChangeDetectionScheduler\` schedules a batched re-render. The fundamental difference from Zone.js is granularity: only the component that actually read the changed signal is marked, not the entire tree. The result is that in a component whose template only works with signals, change detection updates exactly what depends on the changed data, which is the end goal of signal-based components combined with zoneless.

## Gotchas

- **A signal read in a plain method rather than the template** registers no dependency for the view.
- **Conditional reads in the template** change the dependency set: until a branch executes, its signals are not tracked.
- **Mutating an object held in a signal** does not bump its version — the view never goes dirty.
- **\`markViewDirty\` travels up**, but the check descends — do not mix the directions up in an interview.
- **Batching means the DOM is not updated instantly** after a \`set\`.
- **Expect the follow-up**: how this differs from \`markForCheck\` under \`OnPush\`, and why the node versions exist.`,
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
