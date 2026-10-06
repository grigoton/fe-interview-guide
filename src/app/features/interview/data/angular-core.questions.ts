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
      ru: `## В чём суть

Zone.js — библиотека, которая подменяет асинхронные функции браузера (таймеры, обработчики событий, промисы, XHR) своими обёртками. Благодаря этому она знает, когда закончился **любой** асинхронный колбэк, и сообщает об этом Angular. А Angular по этому сигналу запускает change detection — проход по дереву компонентов, который сверяет данные с экраном.

Аналогия: Zone.js — **вахтёр на всех дверях здания**. Он не знает, что именно внесли в комнаты, он лишь отмечает «дверь открывалась, человек вышел». После каждого такого события комендант (Angular) обходит **все** комнаты подряд и проверяет, не поменялось ли что-то. Отсюда и главная черта zone-подхода: проверка всегда идёт по всему дереву.

**Какую проблему решает.** В JavaScript нет встроенного способа узнать, что данные изменились: \`this.count++\` в обработчике клика происходит молча. Фреймворк должен как-то понять, когда перерисовать DOM. В AngularJS для этого был ручной \`$scope.$apply()\` — забыл вызвать, и экран не обновился. Zone.js автоматизирует этот момент: любой код, выполненный в асинхронном колбэке, сам приводит к проверке экрана, и разработчик может мутировать обычные поля класса. Важный контекст: начиная с Angular 21 приложения по умолчанию работают **без** Zone.js (zoneless), но огромное количество существующих проектов живёт на зоне, и этот вопрос задают постоянно.

## Словарик терминов

- **Change detection (CD, обнаружение изменений)** — проход Angular по дереву компонентов: пересчитать выражения шаблонов и обновить DOM там, где значения поменялись.
- **Monkey-patching (обезьяний патч)** — подмена чужой функции во время выполнения: сохраняем оригинальный \`setTimeout\`, а на его место ставим свою обёртку, которая вызывает оригинал плюс делает что-то своё.
- **Зона (Zone)** — контекст выполнения, который «прилипает» к асинхронным операциям: колбэк таймера выполнится в той же зоне, в которой таймер был создан.
- **Задача (Task)** — объект, которым Zone.js описывает каждую асинхронную операцию: \`macroTask\` (таймеры, XHR), \`microTask\` (\`Promise.then\`, \`queueMicrotask\`), \`eventTask\` (обработчики событий).
- **Микрозадача и макрозадача** — две очереди event loop. Микрозадачи (\`then\`) выполняются сразу после текущего кода, все до одной; макрозадачи (таймер, событие) — по одной за «ход» цикла.
- **\`ZoneAwarePromise\`** — промис из Zone.js, которым подменяется глобальный \`Promise\`, чтобы каждый \`then\` выполнялся в своей зоне.
- **Хуки зоны (\`onInvokeTask\`, \`onHasTask\`)** — функции, которые зона вызывает вокруг каждой задачи и при изменении счётчиков задач. На них построен \`NgZone\`.
- **\`NgZone\`** — сервис Angular, обёртка над дочерней зоной с именем \`angular\`. Даёт события \`onUnstable\`, \`onMicrotaskEmpty\`, \`onStable\`, \`onError\` и методы \`run\` / \`runOutsideAngular\`.
- **\`ApplicationRef.tick()\`** — метод, запускающий change detection для всего приложения от корневых компонентов вниз.
- **\`OnPush\`** — стратегия компонента «проверяй меня, только если есть повод»; сужает обход, который запускает зона.
- **Zoneless** — режим без Zone.js: проверку запускают сигналы, события шаблона и \`markForCheck()\`, а не любой асинхронный колбэк.

## Как это работает под капотом

Цепочка от клика до обновлённого DOM выглядит так:

1. Полифил \`zone.js\` загружается **раньше** Angular (секция \`polyfills\` в \`angular.json\`), поэтому успевает подменить глобальные функции до того, как кто-то сохранит ссылки на оригиналы.
2. Zone.js патчит таймеры (\`setTimeout\`, \`setInterval\`, \`setImmediate\`), \`requestAnimationFrame\`, \`addEventListener\` / \`removeEventListener\` на \`EventTarget\` и свойства вида \`onclick\`, \`XMLHttpRequest\`, заменяет \`Promise\` на \`ZoneAwarePromise\`, патчит \`queueMicrotask\`, \`fetch\` (через \`then\` возвращённого промиса), \`MutationObserver\`, \`IntersectionObserver\`, \`FileReader\`, \`alert\` / \`confirm\` / \`prompt\`, \`customElements\`, геолокацию. Редкие API (canvas, WebSocket-библиотеки, RxJS-шедулеры) патчатся отдельными файлами вроде \`zone.js/plugins/...\`.
3. Каждая обёртка в момент регистрации колбэка запоминает текущую зону и создаёт объект задачи. Когда колбэк срабатывает, обёртка выполняет его **в той же зоне** и вызывает её хуки «до» и «после».
4. Angular при старте создаёт \`NgZone\` — дочернюю зону \`angular\` со своими хуками — и выполняет bootstrap внутри неё. Поэтому всё, что код приложения регистрирует дальше, наследует эту зону.
5. Когда в зоне начинается работа, \`NgZone\` эмитит \`onUnstable\`. Когда задача закончилась и очередь микрозадач опустела, эмитит \`onMicrotaskEmpty\` (за один «ход» это может случиться несколько раз). После последнего \`onMicrotaskEmpty\`, если микрозадач больше нет, — один раз \`onStable\`.
6. Angular подписан на \`onMicrotaskEmpty\` (внутренний сервис \`NgZoneChangeDetectionScheduler\`) и в ответ вызывает \`ApplicationRef.tick()\` внутри \`zone.run\`.
7. \`tick()\` идёт по дереву сверху вниз: компоненты со стратегией \`Default\` проверяются всегда, \`OnPush\` — только помеченные. В dev-режиме следом идёт контрольный проход, который ловит \`ExpressionChangedAfterItHasBeenCheckedError\`.
8. Зона сообщает только факт «асинхронная работа закончилась», а не **что** изменилось, поэтому без \`OnPush\` и сигналов проверяется всё дерево.

Упрощённо логика \`NgZone\` (реальный код в \`@angular/core\` почти такой же) выглядит так:

\`\`\`ts
const angularZone = Zone.current.fork({
  name: 'angular',
  onInvokeTask(delegate, current, target, task, applyThis, applyArgs) {
    try {
      onEnter();                 // _nesting++, при первом входе — onUnstable
      return delegate.invokeTask(target, task, applyThis, applyArgs);
    } finally {
      onLeave();                 // _nesting--, затем checkStable()
    }
  },
  onHasTask(delegate, current, target, state) {
    delegate.hasTask(target, state);
    if (state.change === 'microTask') {
      hasPendingMicrotasks = state.microTask;
      checkStable();
    }
  },
});

function checkStable() {
  if (nesting === 0 && !hasPendingMicrotasks && !isStable) {
    onMicrotaskEmpty.emit();     // ← здесь Angular делает appRef.tick()
    if (!hasPendingMicrotasks) {
      onStable.emit();
      isStable = true;
    }
  }
}
\`\`\`

### Пример 1. Голый Zone.js: как зона «видит» асинхронщину

Этот код запускается в Node.js с \`zone.js/node\`; в браузере всё то же самое с обычным \`zone.js\`.

\`\`\`js
console.log(Promise.name); // ZoneAwarePromise — глобальный Promise уже подменён

const myZone = Zone.current.fork({
  name: 'my-angular',
  onInvokeTask(delegate, current, target, task, applyThis, applyArgs) {
    console.log('  до задачи:', task.source);
    try {
      return delegate.invokeTask(target, task, applyThis, applyArgs);
    } finally {
      console.log('  после задачи:', task.source);
    }
  },
  onHasTask(delegate, current, target, state) {
    delegate.hasTask(target, state);
    if (state.change === 'microTask' && !state.microTask) {
      console.log('  микрозадачи кончились — тут Angular вызвал бы tick()');
    }
  },
});

myZone.run(() => {
  setTimeout(() => {
    console.log('таймер, зона:', Zone.current.name);
    Promise.resolve().then(() => console.log('then, зона:', Zone.current.name));
  });
});
setTimeout(() => console.log('чужой таймер, зона:', Zone.current.name), 5);

//   до задачи: setTimeout
// таймер, зона: my-angular
//   после задачи: setTimeout
//   до задачи: Promise.then
// then, зона: my-angular
//   после задачи: Promise.then
//   микрозадачи кончились — тут Angular вызвал бы tick()
// чужой таймер, зона: <root>
\`\`\`

Зона «прилипла» и к таймеру, и к \`then\` внутри него — колбэки выполнились в \`my-angular\`, хотя сам \`run\` давно завершился. А таймер, созданный вне \`run\`, живёт в корневой зоне \`<root>\`, и хуки \`my-angular\` о нём не знают. Ровно так Angular отличает «свой» код от чужого.

### Пример 2. Обычное поле обновляет экран само

\`\`\`ts
@Component({ selector: 'app-root', template: \`count={{ count }}\` })
export class App {
  count = 0;

  constructor() {
    setTimeout(() => {
      console.log(Zone.current.name, NgZone.isInAngularZone()); // angular true
      this.count++; // никаких сигналов и markForCheck — экран покажет count=1
    }, 1000);
  }
}
// bootstrapApplication(App, { providers: [provideZoneChangeDetection()] })
\`\`\`

Таймер создан во время bootstrap внутри зоны \`angular\`, поэтому его колбэк тоже выполняется в ней. После колбэка очередь микрозадач пустеет, \`NgZone\` эмитит \`onMicrotaskEmpty\`, Angular вызывает \`tick()\` — и новое значение попадает в DOM.

### \`NgZone.runOutsideAngular\` и \`NgZone.run\`

\`runOutsideAngular(fn)\` выполняет \`fn\` в родительской (корневой) зоне. Всё, что \`fn\` зарегистрирует, — таймеры, слушатели, \`requestAnimationFrame\` — больше не вызывает \`tick()\`. \`run(fn)\` делает обратное: возвращает выполнение в зону \`angular\`, и после него CD запустится.

\`\`\`ts
private zone = inject(NgZone);

trackMouse() {
  this.zone.runOutsideAngular(() => {
    // 60+ событий в секунду, но ни одного tick()
    document.addEventListener('mousemove', (e) => {
      this.x = e.clientX;                  // поле меняется, экран — нет
      if (e.clientX > 500) {
        this.zone.run(() => (this.hot = true)); // редкое важное событие → один tick()
      }
    });
  });
}
\`\`\`

Без \`runOutsideAngular\` каждое движение мыши запускало бы проверку всего дерева. Это главный инструмент борьбы с так называемым **zone pollution** — «загрязнением зоны» лишними асинхронными задачами.

### \`onUnstable\`, \`onMicrotaskEmpty\`, \`onStable\`

\`\`\`ts
zone.onUnstable.subscribe(() => console.log('onUnstable'));
zone.onMicrotaskEmpty.subscribe(() => console.log('onMicrotaskEmpty'));
zone.onStable.subscribe(() => console.log('onStable'));

zone.run(() => setTimeout(() => {}, 0));
// onUnstable        ← вошли в зону
// onMicrotaskEmpty  ← run закончился, микрозадач нет → Angular делает tick()
// onStable          ← ход закончен, хотя таймер ещё не сработал
// onUnstable        ← сработал таймер
// onMicrotaskEmpty
// onStable
\`\`\`

Обратите внимание: \`onStable\` сработал, хотя таймер ещё висел в очереди. Это событие означает «микрозадачи кончились, ход VM закончен», а не «у приложения вообще нет работы». Признак полной стабильности, учитывающий и таймеры, — \`ApplicationRef.whenStable()\` / \`isStable\`. \`onError\` получает ошибки, выброшенные в зоне, и Angular перенаправляет их в \`ErrorHandler\`.

### Пример 3. Гибридный режим Angular 18+: \`markForCheck\` и сигналы вне зоны

\`\`\`ts
zone.runOutsideAngular(() => setTimeout(() => {
  this.count++;                 // только поле → экран НЕ обновится
}));

zone.runOutsideAngular(() => setTimeout(() => {
  this.count++;
  this.cdr.markForCheck();      // Angular 18+: планировщик сам запланирует CD → обновится
}));

zone.runOutsideAngular(() => setTimeout(() => {
  this.sig.set(5);              // запись в сигнал из шаблона → тоже обновится
}));
\`\`\`

С Angular 18 рядом с зоной работает тот же планировщик, что и в zoneless. Если \`markForCheck()\` или запись в сигнал случились **вне** зоны, он сам планирует проход CD. Внутри зоны он ничего не делает — там всё равно сработает \`onMicrotaskEmpty\`. Мутация обычного поля вне зоны по-прежнему никого не уведомляет.

### \`provideZoneChangeDetection\` и подключение зоны в Angular 21

\`\`\`ts
// main.ts — Angular 21 без этого провайдера стартует в zoneless-режиме
bootstrapApplication(App, {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })],
});
// и "polyfills": ["zone.js"] в angular.json — иначе ошибка NG0908
// "In this configuration Angular requires Zone.js"
\`\`\`

В Angular 21 и \`bootstrapApplication\`, и TestBed по умолчанию поднимают zoneless-планировщик. Опция \`eventCoalescing: true\` склеивает несколько CD от одного всплывающего события (клик по кнопке внутри контейнера \`div\`, когда обработчики висят на обоих) в один проход; \`runCoalescing: true\` склеивает несколько вызовов \`zone.run()\` подряд.

### Пример 4. Где зона теряет контекст: нативный \`async/await\`

\`\`\`js
const z = Zone.current.fork({ name: 'angular-like' });
z.run(async () => {
  console.log('до await:', Zone.current.name);
  await new Promise((r) => setTimeout(r, 1));
  console.log('после await:', Zone.current.name);
});
z.run(() => {
  new Promise((r) => setTimeout(r, 1)).then(() => console.log('в then:', Zone.current.name));
});
// до await: angular-like
// после await: <root>
// в then: angular-like
\`\`\`

Нативный \`await\` использует встроенный промис движка, который Zone.js подменить не может, — после \`await\` код выполняется уже вне зоны, а обычный \`then\` на подменённом \`Promise\` зону сохранил. Поэтому Angular CLI, увидев \`zone.js\` в \`polyfills\`, понижает \`async/await\` до генераторов, а в zoneless-режиме этой проблемы нет.

### Где это применяется на практике

- **Большие enterprise-приложения на зоне**: огромные формы, гриды на тысячи ячеек (Kendo UI, AG Grid) — здесь знание \`runOutsideAngular\` и \`OnPush\` отделяет быстрый интерфейс от тормозящего.
- **Интеграция сторонних библиотек**: карты, графики, редакторы со своими таймерами и \`requestAnimationFrame\` инициализируют внутри \`runOutsideAngular\`, а результат возвращают через \`zone.run\` или сигнал.
- **Высокочастотные события**: \`mousemove\`, \`scroll\`, \`resize\`, drag-and-drop, WebSocket с котировками десятки раз в секунду.
- **Polling и фоновые таймеры**: опрос сервера каждые N секунд без лишних проходов CD.
- **Тесты**: \`fakeAsync\` / \`tick\` / \`flush\` построены на Zone.js и управляют «виртуальным временем» зоны.
- **Миграция на zoneless**: понимание того, что именно делала зона, нужно, чтобы найти места, где экран обновлялся «сам собой» и теперь перестанет.

## Важные нюансы и подводные камни

- **Zone.js не знает, что изменилось.** Он даёт только сигнал «асинхронная работа закончилась», без деталей, поэтому без \`OnPush\` проверяется всё дерево.
- **Код вне зоны не обновляет UI.** После \`runOutsideAngular\` мутация обычного поля останется невидимой: вернитесь через \`zone.run()\`. С Angular 18 также работают \`markForCheck()\` и запись в сигнал — гибридный планировщик сам запланирует CD.
- **Сторонние библиотеки со своими таймерами** (сокеты, карты, чарты) могут вызывать \`tick()\` десятки раз в секунду — классическая причина тормозов. Лечится инициализацией библиотеки в \`runOutsideAngular\`.
- **Библиотека, сохранившая нативный \`setTimeout\` до загрузки Zone.js**, выпадает из зоны — её колбэки CD не запустят. Отсюда правило: \`zone.js\` грузится первым.
- **Нативный \`async/await\` теряет зону** — после \`await\` код выполняется в корневой зоне; CLI обходит это транспиляцией.
- **\`onStable\` — не «работы больше нет вообще».** \`onMicrotaskEmpty\` может сработать несколько раз за ход (сам \`tick()\` порождает микрозадачи); \`onStable\` — один раз после последнего из них, и незавершённые таймеры ему не мешают.
- **Каждое событие = проход CD.** Даже \`(click)\` на кнопке, который ничего не меняет, запускает \`tick()\`; при всплытии события через несколько обработчиков — несколько проходов, пока не включён \`eventCoalescing\`.
- **Размер и стоимость.** \`zone.js\` 0.16 — около 36 КБ минифицированного кода (≈13 КБ в gzip), плюс обёртка вокруг каждого асинхронного вызова и «шумные» стектрейсы.
- **В zoneless мутация обычного поля больше не обновляет вид** — нужны сигналы, события шаблона или явный \`markForCheck()\`. А в Angular 21 zoneless включён по умолчанию: без \`provideZoneChangeDetection()\` код, рассчитывающий на зону, перестанет обновлять экран.

**Плюсы:** «магия из коробки» — можно мутировать обычные поля, и экран обновится; не нужно думать, откуда пришло изменение; огромная экосистема и тесты (\`fakeAsync\`) построены на зоне.
**Минусы:** проверка всего дерева по любому поводу, лишние проходы от сторонних библиотек, потеря контекста на нативном \`async/await\`, вес бандла и сложная отладка; поэтому Angular уходит в zoneless.

## Как это спрашивают на собеседовании

**Главный вывод:** Zone.js патчит асинхронные API, \`NgZone\` по событию \`onMicrotaskEmpty\` вызывает \`ApplicationRef.tick()\`, и Angular проверяет всё дерево, потому что зона знает только факт «что-то произошло». Высокочастотную работу выносят в \`runOutsideAngular\`, а в Angular 21 по умолчанию вообще работают без зоны.

Типичные формулировки: «Как Angular узнаёт, что пора обновить экран?», «Что такое NgZone и зачем runOutsideAngular?», «Что патчит Zone.js?», «Почему приложение тормозит из-за сторонней библиотеки?».

Что могут спросить следом:

- *Почему с зоной всё равно нужен \`OnPush\`?* — Зона говорит «когда» проверять, но не «что»; \`OnPush\` позволяет пропускать целые поддеревья.
- *Чем \`onStable\` отличается от \`onMicrotaskEmpty\`?* — Второй может сработать несколько раз за ход и запускает \`tick()\`; первый — один раз в конце хода, когда микрозадач не осталось.
- *Что изменилось в последних версиях?* — Angular 18 добавил гибридный планировщик и экспериментальный zoneless, в 20.2 \`provideZonelessChangeDetection()\` стал стабильным, в 21 zoneless — режим по умолчанию.
- *Почему \`async/await\` ломает зону?* — Нативный \`await\` использует внутренний промис движка, который нельзя подменить, поэтому CLI транспилирует его в генераторы.

### Ответ на 1 минуту

> Zone.js через monkey-patching подменяет асинхронные API браузера — таймеры, \`addEventListener\`, \`Promise\`, XHR, \`fetch\`, \`requestAnimationFrame\` — и запоминает, в какой зоне был зарегистрирован каждый колбэк. Angular создаёт свою зону \`NgZone\` и запускает в ней приложение; когда задача отработала и очередь микрозадач опустела, \`NgZone\` эмитит \`onMicrotaskEmpty\`, а Angular в ответ вызывает \`ApplicationRef.tick()\` и обходит дерево компонентов. Ключевой нюанс: зона знает только, что асинхронная работа закончилась, а не что изменилось, поэтому без \`OnPush\` проверяется всё дерево. На практике высокочастотные вещи — \`mousemove\`, анимации, сторонние графики — я выношу в \`runOutsideAngular\` и возвращаюсь через \`zone.run\` или сигнал. И важно помнить, что в Angular 21 по умолчанию zoneless, а зону подключают явно через \`provideZoneChangeDetection()\`.`,
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
      ru: `## В чём суть

\`ChangeDetectionStrategy.OnPush\` — это режим, в котором компонент говорит Angular: «не проверяй меня на каждом проходе, приходи, только когда для этого есть повод». Повод — новая ссылка во входном свойстве, событие из шаблона, \`markForCheck()\`, async pipe или изменившийся сигнал. Всё остальное время Angular пропускает компонент **вместе со всем его поддеревом**.

Аналогия: начальник обходит офис. При стратегии \`Default\` он подходит к каждому столу и спрашивает «что нового?». При \`OnPush\` сотрудники сами вешают на стол красный флажок, когда у них что-то поменялось, и начальник заходит **только к ним** — остальные ряды столов (и все, кто сидит за ними) он проходит мимо, не заглядывая.

**Какую проблему решает.** При стратегии \`Default\` каждый проход change detection перевычисляет **все** выражения во **всех** шаблонах. В приложении с гридом на тысячи ячеек, десятком виджетов на дашборде и большими формами это миллисекунды на каждый клик, таймер и ответ сервера — интерфейс начинает подтормаживать. \`OnPush\` превращает проверку «всего мира» в проверку только тех веток, где действительно что-то произошло.

## Словарик терминов

- **Change detection (CD)** — проход Angular по дереву компонентов: перевычислить выражения шаблонов и обновить DOM там, где значения изменились.
- **Tick** — один такой проход по всему приложению, его запускает \`ApplicationRef.tick()\`.
- **\`Default\` (CheckAlways)** — стратегия по умолчанию: компонент проверяется на каждом проходе, если до него вообще дошли.
- **\`OnPush\`** — стратегия «проверяй только по поводу»: компонент проверяется, лишь когда его вид помечен «грязным».
- **Вид (view, внутри — \`LView\`)** — внутренняя структура Angular для одного шаблона: DOM-узлы, значения привязок и флаги состояния.
- **Грязный вид (флаг \`Dirty\`)** — пометка «этот вид надо перепроверить на ближайшем проходе». После проверки снимается.
- **\`markForCheck()\`** — метод \`ChangeDetectorRef\`, который ставит флаг \`Dirty\` на вид и **всех его предков** до корня.
- **Сравнение по ссылке (\`Object.is\`)** — проверка «это тот же самый объект?», а не «одинаковое ли содержимое». Для объектов и массивов изменение полей внутри не меняет ссылку.
- **Иммутабельность** — стиль, при котором данные не правят «на месте», а создают новую копию: \`{ ...user, name }\`, \`[...items, x]\`.
- **Async pipe (\`| async\`)** — пайп, который подписывается на Observable/Promise в шаблоне и сам вызывает \`markForCheck()\` при каждом новом значении.
- **Сигнал (\`signal\`, \`input()\`)** — реактивное значение Angular. Если шаблон прочитал сигнал, при его изменении Angular сам перепроверит этот вид.

## Как это работает под капотом

Что происходит на каждом проходе:

1. Angular идёт по дереву сверху вниз, начиная с корневого компонента. Для каждого дочернего компонента он решает: проверять или пропустить.
2. Компонент \`Default\` проверяется всегда, если до него дошли. Компонент \`OnPush\` проверяется, только если его вид грязный или изменились прочитанные им сигналы.
3. Если \`OnPush\`-компонент пропущен, Angular **не спускается** в его детей — пропускается всё поддерево. Исключение: если где-то внизу изменился сигнал, Angular пройдёт по этой ветке «транзитом», но перерисует только тот вид, где сигнал прочитан.
4. Флаг \`Dirty\` появляется в пяти случаях. Первый — новое значение входного свойства: проверяя родителя, Angular сравнивает новое значение привязки со старым через \`Object.is\` и, если оно другое, записывает его во вход и помечает ребёнка.
5. Второй — сработал обработчик события в шаблоне компонента или в шаблоне любого его потомка (\`(click)\`, \`(input)\`, host listener): обёртка обработчика помечает вид и всех предков.
6. Третий и четвёртый — \`AsyncPipe\` получил новое значение (внутри он вызывает \`markForCheck()\`) или кто-то вызвал \`markForCheck()\` вручную. Пятый — изменился сигнал, прочитанный в шаблоне.
7. \`markForCheck()\` идёт **вверх** до корня, потому что проверка идёт **вниз**: если чистый \`OnPush\`-родитель будет пропущен, до флажка ребёнка обход просто не дойдёт.
8. После проверки флаг снимается, и компонент снова «спит» до следующего повода.

Упрощённо решение «проверять или нет» выглядит так:

\`\`\`ts
function checkComponent(view) {
  if (view.detached) return;
  const mustRefresh =
    view.strategy === 'Default' ||   // CheckAlways
    view.dirty ||                    // markForCheck, событие, новый @Input, async pipe
    view.signalsChanged;             // сигнал, прочитанный в шаблоне

  if (mustRefresh) {
    refreshTemplate(view);           // перевычислить ВСЕ выражения шаблона
    view.dirty = false;
    view.children.forEach(checkComponent);
  } else if (view.hasDirtyDescendants) {
    view.children.forEach(checkComponent); // спуститься транзитом, сам вид не трогать
  }
}
\`\`\`

### Пример 1. Мутация против новой ссылки

\`\`\`ts
@Component({
  selector: 'user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`card: {{ user.name }}\`,
})
export class UserCard {
  @Input() user!: { name: string };
}

@Component({
  selector: 'app-root',
  imports: [UserCard],
  template: \`
    <h1>{{ title }}</h1>
    <user-card [user]="user" />
    <button (click)="mutate()">mutate</button>
    <button (click)="replace()">replace</button>
  \`,
})
export class App {
  title = 'A';
  user = { name: 'Ann' };

  mutate() {
    this.user.name = 'Bob'; // ссылка та же
    this.title = 'B';
    // экран: заголовок B, карточка по-прежнему "card: Ann"
  }

  replace() {
    this.user = { ...this.user, name: 'Bob' }; // новая ссылка
    // экран: "card: Bob"
  }
}
\`\`\`

\`App\` — компонент \`Default\`, он перепроверяется и показывает новый заголовок. А карточке Angular передаёт тот же объект: \`Object.is(old, new)\` даёт \`true\`, вход «не изменился», флаг не ставится — и поддерево карточки пропускается. Мутация на месте для \`OnPush\` невидима; отсюда правило иммутабельности.

### Пример 2. Signal input — современный вариант того же самого

\`\`\`ts
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ user().name }}\`,
})
export class UserCardComponent {
  user = input.required<User>(); // вход-сигнал
}
\`\`\`

Работает тот же принцип: новая ссылка от родителя записывается во вход, а шаблон, прочитавший \`user()\`, узнаёт об изменении сигнала и перерисовывается. Мутация полей того же объекта по-прежнему ничего не обновит — сигнал тоже сравнивает значения через \`Object.is\`.

### Пример 3. Что именно будит \`OnPush\`-компонент

Карточка ниже — \`OnPush\`, у неё сигнал \`likes\`, обычное поле \`plain\` и кнопка. В шаблоны \`App\` и карточки вставлен счётчик перерисовок. Результаты получены на Angular 21 в zoneless-режиме:

\`\`\`ts
// 1) клик по кнопке внутри карточки          → перерисованы: app, card
// 2) card.likes.set(10) из setTimeout         → перерисована: card
// 3) card.plain = 1 из setTimeout             → ничего (экран не изменился)
// 4) card.cdr.markForCheck()                  → перерисованы: app, card
// 5) appRef.tick() без каких-либо пометок     → ничего
\`\`\`

Событие и \`markForCheck()\` помечают вид **и всех предков**, поэтому перерисовался и \`App\`. Сигнал же помечает только свой вид, а предкам ставит флаг «внизу есть работа» — их шаблоны не перевычисляются. Обычное поле никого не уведомляет. С Zone.js картина похожа, только \`App\` со стратегией \`Default\` перепроверяется на каждом tick, который запускает зона.

### \`ChangeDetectorRef.markForCheck()\`

Нужен, когда данные пришли «мимо» входов и шаблона: из подписки на сервис, WebSocket, колбэка сторонней библиотеки.

\`\`\`ts
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: \`{{ price }}\` })
export class Ticker {
  price = 0;
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    inject(QuotesService).price$.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.price = p;
      this.cdr.markForCheck(); // без этого экран покажет старую цену
    });
  }
}
\`\`\`

\`markForCheck()\` ничего не рисует сам — он ставит флажки, а перерисовка случится на ближайшем проходе (с Angular 18 планировщик запускает его даже без Zone.js).

### \`AsyncPipe\` — \`markForCheck\` за вас

\`\`\`html
<span>{{ price$ | async }}</span>
\`\`\`

Внутри пайп подписывается на поток и при каждом значении сохраняет его и вызывает \`markForCheck()\`. Плюс он сам отписывается при уничтожении компонента. Поэтому связка \`OnPush\` + \`async\` много лет была стандартом для компонентов, получающих данные из NgRx или NGXS.

### Сигналы в шаблоне

\`\`\`ts
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: \`{{ count() }}\` })
export class Counter {
  count = signal(0);
  constructor() {
    setInterval(() => this.count.update((c) => c + 1), 1000); // markForCheck не нужен
  }
}
\`\`\`

Во время перерисовки шаблон регистрирует, какие сигналы он прочитал. При \`set\` / \`update\` Angular помечает именно этот вид и планирует проход. Это самый точный триггер: обновляется один компонент, а не цепочка до корня.

### Пример 4. \`OnPush\` распространяется на всё поддерево

\`\`\`ts
@Component({ selector: 'd-child', template: \`d: {{ val }}\` }) // Default!
class DChild { val = 0; }

@Component({
  selector: 'op-parent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DChild],
  template: \`<d-child />\`,
})
class OpParent {}

// setTimeout(() => dChild.val = 1) внутри зоны → tick прошёл, но экран: "d: 0"
\`\`\`

Стратегия \`Default\` у ребёнка не спасает: раз чистый \`OnPush\`-родитель пропущен, обход до ребёнка не доходит. Это и есть главный выигрыш производительности — и главный источник «почему не обновилось».

### Где это применяется на практике

- **Гриды и таблицы на тысячи строк**: каждая строка — \`OnPush\`-компонент с иммутабельной моделью, изменилась одна строка — перерисовалась одна строка.
- **Дашборды**: десяток виджетов с графиками; обновление котировок в одном виджете не трогает остальные.
- **State-менеджеры (NgRx, NGXS, SignalStore)**: состояние иммутабельно по определению, селекторы отдают новые ссылки только при реальных изменениях — идеальная пара для \`OnPush\`.
- **Дизайн-система и библиотека UI-компонентов**: кнопки, поля, карточки делают \`OnPush\` по умолчанию, чтобы не тормозить чужие приложения.
- **Большие формы**: секции формы как \`OnPush\`-компоненты, ввод в одном поле не перевычисляет всю форму.
- **Zoneless-приложения**: в связке с сигналами \`OnPush\` фактически становится нормой, а не оптимизацией.

## Важные нюансы и подводные камни

- **Мутация массива или объекта не обновит вид.** \`arr.push(x)\` — нет; \`this.arr = [...this.arr, x]\` — да. То же для \`user.name = ...\`.
- **Сравнение входов — по ссылке через \`Object.is\`.** Это практически \`===\` (отличия только в \`NaN\` и \`-0\`), никакого глубокого сравнения содержимого.
- **Событие из \`document\` или сторонней библиотеки не помечает компонент.** Подписка через \`addEventListener\` вручную, колбэк чарта, сообщение WebSocket — нужен \`markForCheck()\` или сигнал.
- **\`detectChanges()\` вместо \`markForCheck()\`** проверит только вниз от компонента и не «разбудит» предков; если родитель тоже \`OnPush\` и чист, изменения выше по дереву не появятся.
- **Тот же объект во входе** — типичный баг: данные поменяли, а UI старый. Особенно коварно с объектами из кэша, которые правят на месте.
- **\`OnPush\` не делает проверку частичной.** Если вид помечен, перевычисляется весь его шаблон, все выражения и вызовы функций в нём.
- **\`Default\`-ребёнок внутри чистого \`OnPush\`-родителя тоже не проверяется** — стратегия действует на всё поддерево и не переопределяется вниз.
- **Контрольный проход dev-режима пропускает чистые \`OnPush\`-виды.** Поэтому \`ExpressionChangedAfterItHasBeenCheckedError\` в них часто не выбрасывается, и баг тихо живёт; \`provideCheckNoChangesConfig({ exhaustive: true })\` проверяет все виды.
- **Сигнал перерисовывает только свой вид**, а \`markForCheck()\` и события — всю цепочку предков. Для точечных обновлений в больших деревьях сигналы выгоднее.

**Плюсы:** пропуск целых поддеревьев, предсказуемые обновления, естественная пара с иммутабельным состоянием, сигналами и zoneless.
**Минусы:** требует дисциплины иммутабельности; данные «мимо» входов и шаблона нужно явно отмечать; легко получить «почему не обновилось», особенно с \`Default\`-детьми и мутациями из кэша.

## Как это спрашивают на собеседовании

**Главный вывод:** \`OnPush\`-компонент проверяется только когда помечен: новая ссылка во входе (\`Object.is\`), событие из его шаблона или потомков, async pipe, \`markForCheck()\` или изменившийся сигнал. Всё остальное время пропускается целиком вместе с поддеревом, поэтому данные должны быть иммутабельными.

Типичные формулировки: «Как работает OnPush?», «Почему компонент не обновился после изменения объекта?», «Когда проверяется OnPush-компонент?», «Как оптимизировать change detection в большом приложении?».

Что могут спросить следом:

- *Чем \`markForCheck\` отличается от \`detectChanges\`?* — Первый ставит флажки вверх по дереву и ждёт прохода; второй синхронно проверяет компонент и его детей прямо сейчас.
- *Как async pipe узнаёт, что надо обновить вид?* — Он сам подписан на поток и при каждом значении вызывает \`markForCheck()\`.
- *Почему \`markForCheck\` идёт вверх?* — Проверка идёт сверху вниз; если предок чист и пропущен, до помеченного ребёнка обход не дойдёт.
- *Нужен ли \`OnPush\` с сигналами и zoneless?* — Да: сигнал помечает только свой вид, и \`OnPush\` позволяет не трогать остальные; в zoneless это рекомендуемый режим.

### Ответ на 1 минуту

> \`OnPush\` меняет условие проверки: компонент перепроверяется не на каждом проходе, а только когда его вид помечен грязным, иначе Angular пропускает его вместе со всем поддеревом. Пометить вид может новая ссылка во входном свойстве — сравнение идёт через \`Object.is\`, — событие из его шаблона или шаблона потомков, async pipe, явный \`markForCheck()\` или изменение сигнала, прочитанного в шаблоне. \`markForCheck\` помечает и всех предков до корня, потому что обход идёт сверху вниз, а сигнал перерисовывает только свой вид. Практическое следствие — данные должны быть иммутабельными: \`push\` в массив или правка поля объекта без новой ссылки экран не обновит. Ещё нюанс: даже \`Default\`-ребёнок внутри чистого \`OnPush\`-родителя не проверяется. В больших гридах и дашбордах я делаю \`OnPush\` стандартом, а в связке с сигналами и zoneless это вообще рекомендуемый режим.`,
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
      ru: `## В чём суть

\`ChangeDetectorRef\` — пульт ручного управления change detection для одного компонента. На нём четыре главные кнопки: две отвечают за **время** проверки (\`markForCheck\` — «проверь меня позже», \`detectChanges\` — «проверь меня сейчас»), две — за **участие** компонента в проверках вообще (\`detach\` — «выключи меня из обхода», \`reattach\` — «включи обратно»).

Аналогия с офисом: \`markForCheck()\` — поставить на стол флажок «зайдите ко мне, когда будете обходить», начальник придёт позже, по пути заглянув к вашему руководителю. \`detectChanges()\` — позвать начальника прямо сейчас: он проверит вас и ваш отдел, но к вашему руководителю не пойдёт. \`detach()\` — вычеркнуть себя из списка обхода совсем. \`reattach()\` — вернуться в список.

**Какую проблему решает.** Автоматики Angular хватает, пока данные приходят через входы и события шаблона. Но в \`OnPush\`-компоненте данные из WebSocket или колбэка сторонней библиотеки экран не обновят — нужен \`markForCheck()\`. В тяжёлом виджете, который получает 50 обновлений в секунду, автоматическая проверка на каждом проходе — лишняя работа, и его выключают через \`detach()\`, а рисуют вручную через \`detectChanges()\`. Понимание разницы спасает и от «почему не обновилось», и от лишних проходов.

## Словарик терминов

- **Change detection (CD)** — проход Angular по дереву компонентов: перевычислить выражения шаблонов и обновить DOM.
- **\`ChangeDetectorRef\`** — объект-пульт CD для конкретного вида; получают через \`inject(ChangeDetectorRef)\`.
- **Вид (view, внутри — \`LView\`)** — внутреннее представление шаблона компонента с набором флагов: «подключён», «грязный», «проверять всегда».
- **Флаг \`Dirty\` (грязный вид)** — пометка «перепроверить на ближайшем проходе».
- **Флаг \`Attached\` (подключён)** — участвует ли вид в обходе. \`detach\` его снимает, \`reattach\` ставит.
- **\`OnPush\` / \`Default\`** — стратегии: \`OnPush\` проверяется только если помечен, \`Default\` — всегда, когда до него дошли.
- **\`ApplicationRef.tick()\`** — проход CD по всему приложению от корневых видов; его запускает Zone.js или zoneless-планировщик.
- **Планировщик (scheduler)** — внутренний сервис Angular, который по уведомлениям (\`markForCheck\`, сигнал, событие) сам планирует ближайший \`tick()\`.
- **\`checkNoChanges()\`** — контрольный проход dev-режима: перевычисляет выражения и бросает ошибку, если они изменились после проверки.
- **\`ExpressionChangedAfterItHasBeenCheckedError\` (NG0100)** — ошибка dev-режима, когда значение в шаблоне поменялось уже после того, как вид был проверен.

## Как это работает под капотом

Все четыре метода — это манипуляции флагами вида и запуск обхода:

1. У каждого вида есть флаги: \`Attached\` («участвую в обходе»), \`Dirty\` («меня надо перепроверить»), \`CheckAlways\` (стоит у \`Default\`-компонентов).
2. \`markForCheck()\` идёт от вида **вверх** до корня и ставит \`Dirty\` каждому предку, затем уведомляет планировщик. Ничего не рисует — только флажки.
3. Вверх — потому что \`tick()\` идёт **вниз**: чистый \`OnPush\`-предок будет пропущен вместе с поддеревом, и до помеченного ребёнка обход не дойдёт.
4. \`detectChanges()\` помечает свой вид «обновить обязательно» и **синхронно** запускает обход с него: шаблон перевычисляется всегда — даже у \`OnPush\`, даже у отсоединённого вида. Дети проверяются по обычным правилам: \`Default\` — да, чистый \`OnPush\` — нет. Предки не трогаются.
5. \`detach()\` снимает флаг \`Attached\`. При обходе Angular видит это и пропускает вид со всем поддеревом — не помогают ни \`markForCheck\`, ни сигналы, ни новые входы.
6. \`reattach()\` возвращает флаг и, если вид за это время успели пометить, уведомляет планировщик — накопленные изменения появятся на ближайшем проходе.

В исходниках Angular 21 эти методы почти дословно такие:

\`\`\`ts
class ViewRef implements ChangeDetectorRef {
  markForCheck()  { markViewDirty(this._lView, NotificationSource.MarkForCheck); } // флаги вверх + уведомить планировщик
  detectChanges() { this._lView[FLAGS] |= LViewFlags.RefreshView; detectChangesInternal(this._lView); }
  detach()        { this._lView[FLAGS] &= ~LViewFlags.Attached; }
  reattach()      { updateAncestorTraversalFlagsOnAttach(this._lView); this._lView[FLAGS] |= LViewFlags.Attached; }
  checkNoChanges(){ if (ngDevMode) checkNoChangesInternal(this._lView); }
}
\`\`\`

### Тестовый стенд

Дерево из четырёх компонентов; в каждый шаблон вставлен счётчик перерисовок. Все результаты ниже получены на Angular 21 в zoneless-режиме.

\`\`\`ts
@Component({ selector: 'leaf-d', template: \`...\` })                       // Default
class LeafD {}

@Component({ selector: 'leaf-op', changeDetection: ChangeDetectionStrategy.OnPush, template: \`{{ data.v }}\` })
class LeafOP { @Input() data!: { v: number }; }

@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeafD, LeafOP],
  template: \`{{ title }} s={{ s() }} <leaf-d /> <leaf-op [data]="data" />\`,
})
class Panel {
  title = 'p0';
  s = signal(0);
  data = { v: 0 };
  cdr = inject(ChangeDetectorRef);
}

@Component({ selector: 'app-root', imports: [Panel], template: \`{{ title }} <app-panel />\` }) // Default
class App { title = 'a0'; }
\`\`\`

### \`markForCheck()\` — «проверь меня на ближайшем проходе»

\`\`\`ts
panel.title = 'p2';
panel.cdr.markForCheck();
// сразу после вызова: DOM не изменился, перерисовок нет
// после прохода: перерисованы app, panel, leafD
\`\`\`

Флажки встали на \`Panel\` и на \`App\`, затем планировщик запустил проход. \`App\` перерисовался, потому что был помечен по пути наверх; \`LeafD\` — потому что он \`Default\` внутри перерисованного родителя. Использовать: данные пришли в \`OnPush\`-компонент «мимо» входов и шаблона — подписка на сервис, WebSocket, колбэк библиотеки. С Angular 18 вызов сам планирует CD и без Zone.js.

### \`detectChanges()\` — «проверь меня прямо сейчас»

\`\`\`ts
app.title = 'a1';
panel.title = 'p1';
panel.data.v = 1;               // мутация объекта, ссылка та же
panel.cdr.detectChanges();
// синхронно перерисованы: panel, leafD
// app по-прежнему показывает a0, leaf-op по-прежнему 0
\`\`\`

Метод проверил \`Panel\` и спустился к детям: \`LeafD\` (\`Default\`) перерисован, \`LeafOP\` (\`OnPush\`, вход не менялся) пропущен. \`App\` не тронут — \`detectChanges\` не ходит вверх. Использовать: когда нужен DOM прямо сейчас (измерить размеры после изменения данных), в отсоединённых видах и в тестах (\`fixture.detectChanges()\`).

### \`detach()\` и \`reattach()\` — выключить и включить компонент

\`\`\`ts
panel.cdr.detach();
panel.title = 'p3'; app.title = 'a3';
panel.cdr.markForCheck();      // → app обновился (a3), panel — нет: он вне обхода
panel.s.set(4);                // → ничего: сигнал отсоединённый вид тоже не будит
panel.cdr.detectChanges();     // → panel, leafD: ручной вызов работает и для отсоединённого
panel.s.set(6); panel.title = 'p6';
panel.cdr.reattach();          // → на ближайшем проходе: panel, leafD (p6, s=6)
\`\`\`

\`detach\` выключает только проверку шаблона: подписки, таймеры и обработчики событий продолжают работать, данные в классе меняются, просто экран их не показывает. \`reattach\` возвращает компонент в обход и, если его успели пометить, сразу планирует проход.

### Пример: тяжёлый виджет, который рисуется раз в секунду

\`\`\`ts
@Component({
  selector: 'live-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`{{ count }} точек, последняя: {{ last }}\`,
})
export class LiveChart {
  count = 0;
  last = 0;
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.cdr.detach(); // автоматические проверки выключены
    inject(TicksService).ticks$          // 50 значений в секунду
      .pipe(takeUntilDestroyed())
      .subscribe((v) => { this.count++; this.last = v; });

    inject(NgZone).runOutsideAngular(() => {
      const id = setInterval(() => this.cdr.detectChanges(), 1000); // рисуем ровно раз в секунду
      inject(DestroyRef).onDestroy(() => clearInterval(id));
    });
  }
}
\`\`\`

50 обновлений данных в секунду — и всего одна перерисовка. \`runOutsideAngular\` нужен в приложении с Zone.js, чтобы сам интервал не запускал \`tick()\` всего приложения каждую секунду; в zoneless он ничего не делает и не мешает.

### \`checkNoChanges()\` и \`ApplicationRef.tick()\`

\`checkNoChanges()\` работает только в dev-режиме: перевычисляет выражения вида и бросает NG0100, если что-то изменилось. Angular сам вызывает его после каждого \`tick()\`; вручную он нужен разве что в тестах.

\`ApplicationRef.tick()\` — это проход по **всем** корневым видам приложения: он запускает отложенные корневые эффекты, проверяет помеченные ветки, вызывает \`afterNextRender\`-хуки и в dev-режиме делает контрольный проход. \`detectChanges()\` — синхронная проверка одной ветки (эффекты компонентов этой ветки выполняются по ходу), а корневые эффекты, after-render хуки и контрольный проход остаются заботой \`tick()\`. Вызвать \`tick()\` изнутри идущего \`tick()\` нельзя — будет ошибка NG0101 «ApplicationRef.tick is called recursively».

\`\`\`ts
for (let i = 0; i < 1000; i++) { this.n++; this.cdr.markForCheck(); }
// → 1 перерисовка: флажки ставятся, планировщик склеивает уведомления в один проход
for (let i = 0; i < 1000; i++) { this.n++; this.cdr.detectChanges(); }
// → 1000 синхронных перерисовок
\`\`\`

### Как выбрать

- **Данные пришли асинхронно в \`OnPush\`-компонент** (сервис, сокет, сторонняя библиотека) — \`markForCheck()\`, а лучше положить их в сигнал.
- **Нужен актуальный DOM прямо сейчас**, синхронно — \`detectChanges()\`.
- **Компонент обновляется очень часто или очень тяжело**, и вы хотите сами решать, когда рисовать, — \`detach()\` + \`detectChanges()\` по своему расписанию.
- **Временно заморозить вид** (скрытая вкладка, свёрнутая панель) — \`detach()\`, при показе — \`reattach()\`.
- **Состояние на сигналах** — обычно не нужно ничего из этого: сигнал, прочитанный в шаблоне, сам помечает свой вид.

### Где это применяется на практике

- **Интеграция с WebSocket, SignalR, сторонними гридами и картами** в \`OnPush\`-компонентах — \`markForCheck()\` в колбэке.
- **Биржевые и мониторинговые дашборды**: виджеты с десятками обновлений в секунду отсоединены и перерисовываются по таймеру.
- **Вкладки и виртуальные списки**: невидимые вкладки отсоединяют, чтобы они не участвовали в каждом проходе.
- **Измерение DOM после изменения данных** (позиционирование тултипа, автоскролл к новой строке) — \`detectChanges()\` перед чтением размеров.
- **Юнит-тесты**: \`fixture.detectChanges()\` — тот же \`detectChanges\` на корневом виде теста.
- **Постепенная миграция на сигналы**: старые \`markForCheck()\` в подписках заменяют на \`toSignal\` или \`signal.set\`.

## Важные нюансы и подводные камни

- **\`detectChanges\` не будит предков.** Если родитель \`OnPush\` и чист, изменения в его шаблоне не отразятся — вызов идёт только вниз.
- **\`detectChanges\` не проверяет чистых \`OnPush\`-детей.** «Проверяет компонент и всех потомков» — неточно: потомки проверяются по обычным правилам стратегии.
- **\`detectChanges\` в хуках жизненного цикла чаще маскирует NG0100, чем вызывает.** Если компонент поменял своё поле в \`ngAfterViewInit\` и сразу вызвал \`detectChanges()\`, ошибка исчезает (баг спрятан). Если же поменяли поле родителя, вызов у ребёнка не поможет — ошибка останется.
- **Забыли \`reattach\`** — компонент навсегда «мёртвый»: данные меняются, экран стоит.
- **\`detach\` не останавливает подписки и таймеры** — он выключает только проверку шаблона. Утечки чистят как обычно: \`takeUntilDestroyed\`, \`DestroyRef\`.
- **Отсоединённый вид не реагирует на сигналы**, новые входы и \`markForCheck\` — только на ручной \`detectChanges()\` или \`reattach()\`.
- **\`markForCheck\` работает и без зоны.** Старое правило «без Zone.js или внутри \`runOutsideAngular\` он бесполезен» устарело: с Angular 18 вызов уведомляет планировщик, и тот сам запускает проход. Не поможет только мутация обычного поля без всякого вызова.
- **\`markForCheck\` в цикле на тысячу элементов** не вызывает тысячу проходов: флажки ставятся, а проход один — планировщик склеивает уведомления.
- **\`detectChanges\` в цикле — наоборот, тысяча синхронных проходов.** Частый источник подлагиваний.

**Плюсы:** точный ручной контроль над тем, когда и что перерисовывать; возможность полностью вывести тяжёлый вид из автоматики.
**Минусы:** легко забыть вызов или \`reattach\`, получить «мёртвый» экран или лишние синхронные проходы; ручное управление хуже читается, чем сигналы, которые делают то же самое автоматически.

## Как это спрашивают на собеседовании

**Главный вывод:** \`markForCheck\` — «проверь меня позже», ставит флажки вверх до корня и ничего не рисует; \`detectChanges\` — «проверь сейчас», синхронно идёт вниз от компонента; \`detach\` выводит вид из обхода целиком, \`reattach\` возвращает. В мире сигналов эти вызовы нужны всё реже.

Типичные формулировки: «Чем markForCheck отличается от detectChanges?», «Когда использовать detach?», «Как обновить OnPush-компонент из колбэка сторонней библиотеки?».

Что могут спросить следом:

- *Чем \`ApplicationRef.tick()\` отличается от \`detectChanges()\`?* — \`tick\` проверяет всё приложение от корней, запускает эффекты и after-render хуки; \`detectChanges\` — одну ветку, синхронно.
- *Почему \`markForCheck\` идёт именно вверх?* — Обход идёт сверху вниз и пропускает чистые \`OnPush\`-ветки, поэтому путь к помеченному виду должен быть «открыт».
- *Что будет с сигналом в отсоединённом компоненте?* — Ничего, пока не вызовут \`detectChanges()\` или \`reattach()\`.
- *Нужен ли \`markForCheck\` в zoneless?* — Да, если состояние в обычных полях; это одно из уведомлений, по которому планировщик запускает проход.

### Ответ на 1 минуту

> \`markForCheck\` не запускает change detection, а помечает текущий вид и всех его предков грязными и уведомляет планировщик — на ближайшем проходе Angular до них дойдёт; это основной инструмент для \`OnPush\`, когда данные пришли из сервиса, сокета или сторонней библиотеки. \`detectChanges\` наоборот синхронно перепроверяет сам компонент и спускается к детям по обычным правилам, не трогая предков. \`detach\` снимает с вида флаг участия в обходе, и его не будят ни \`tick\`, ни сигналы, ни новые входы; \`reattach\` возвращает его обратно. Связку \`detach\` плюс \`detectChanges\` по таймеру я использую для тяжёлых виджетов, которые получают десятки обновлений в секунду. Нюансы: \`detectChanges\` не обновит чистого \`OnPush\`-родителя, а в хуках он скорее прячет \`ExpressionChanged\`, чем лечит. И с Angular 18 \`markForCheck\` работает и без Zone.js.`,
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
      ru: `## В чём суть

В dev-режиме Angular после каждого прохода change detection делает **второй, контрольный** проход: заново вычисляет выражения шаблонов и сверяет их с тем, что только что записал в DOM. Если какое-то значение успело измениться, он бросает \`ExpressionChangedAfterItHasBeenCheckedError\` (код NG0100). Это значит: кто-то поменял данные **после** того, как вид, который их показывает, уже был проверен.

Аналогия: вы сдали контрольную, преподаватель её проверил и поставил оценку, а вы дописали ответ в уже проверенную работу. Преподаватель сверяет второй раз, видит расхождение и говорит: «так нельзя, работа уже проверена». Это не придирка, а защита однонаправленного потока данных.

**Какую проблему решает.** Angular обновляет экран сверху вниз за один проход: родитель вычисляет свои привязки, передаёт данные детям, проверяет их. Если ребёнок в своём хуке меняет то, что родитель уже нарисовал, экран оказывается несогласованным: в DOM одно, в данных другое — до следующего прохода, а в zoneless-приложении иногда и навсегда. Без этой проверки такие баги проявлялись бы как «мигающий» или устаревший интерфейс где-нибудь в проде. Ошибка ловит их ещё в разработке и указывает место.

## Словарик терминов

- **Change detection (CD)** — проход Angular по дереву компонентов: вычислить выражения шаблонов и обновить DOM.
- **Однонаправленный поток данных (unidirectional data flow)** — правило: за один проход данные текут только сверху вниз, от родителя к детям; ребёнок не должен менять уже отрисованное состояние родителя.
- **Привязка (binding)** — выражение в шаблоне: \`{{ label }}\`, \`[value]="x"\`. Angular хранит её последнее значение и сравнивает с новым.
- **Контрольный проход (\`checkNoChanges\`)** — повторное вычисление привязок без записи в DOM и без вызова хуков; есть только в dev-режиме.
- **Dev-режим / production-режим** — сборка для разработки (с проверками и подробными ошибками) и оптимизированная сборка (\`ng build\` по умолчанию), где проверок нет.
- **Хуки жизненного цикла** — методы \`ngOnInit\`, \`ngAfterViewInit\` и другие, которые Angular вызывает в определённые моменты прохода.
- **\`@ViewChild\`** — ссылка на дочерний компонент или элемент из шаблона; заполняется только после проверки дочерних видов.
- **Микрозадача** — колбэк \`Promise.then\` / \`queueMicrotask\`, который выполняется сразу после текущего синхронного кода.
- **Сигнал (\`signal\`)** — реактивное значение Angular; запись в него помечает виды, которые его читают, и Angular перепроверяет их в том же проходе.
- **\`afterNextRender\`** — хук, который выполняется один раз после того, как Angular отрисовал DOM; место для чтения размеров и работы со сторонними библиотеками.

## Как это работает под капотом

1. При проверке компонента Angular выполняет его шаблон сверху вниз и для каждой привязки сохраняет последнее значение во внутреннем массиве вида.
2. Порядок внутри проверки компонента важен: шаблон выполняется сверху вниз, и, дойдя до дочернего элемента, Angular передаёт ему входы и вызывает его \`ngOnInit\` / \`ngDoCheck\`. Когда весь шаблон пройден, проверяются сами дети, затем обновляются \`@ViewChild\`-запросы и вызываются \`ngAfterViewInit\` / \`ngAfterViewChecked\`.
3. Поэтому всё, что меняется в \`ngAfterViewInit\`, в результате \`@ViewChild\` или в хуках детей (для привязок, стоящих в шаблоне выше ребёнка), меняется **после** того, как привязки родителя уже вычислены и записаны.
4. После прохода в dev-режиме Angular вызывает \`checkNoChanges\` для каждого корневого вида: шаблоны выполняются ещё раз в специальном режиме — без хуков и без записи в DOM.
5. Каждая привязка сравнивается с сохранённым значением. Сначала через \`Object.is\`; если не совпало — через «мягкое» сравнение \`devModeEqual\`: массивы и другие итерируемые сравниваются поэлементно, а **любые два объекта считаются равными**.
6. Если значения всё равно разошлись — бросается NG0100 с предыдущим и текущим значением и именем компонента, в шаблоне которого стоит привязка.
7. По умолчанию контрольный проход перепроверяет \`Default\`-виды и только что обновлённые; чистые \`OnPush\`-виды пропускает.
8. Сигналы обрабатываются иначе: если во время прохода записали сигнал, Angular помечает зависящий вид и **повторяет** проход в том же тике (до 100 раз, затем NG0103 «Infinite change detection»), поэтому до контрольного прохода всё успевает согласоваться.

Сравнение из исходников Angular 21 (почти дословно):

\`\`\`ts
function bindingUpdated(lView, bindingIndex, value) {
  const oldValue = lView[bindingIndex];
  if (Object.is(oldValue, value)) return false;
  if (ngDevMode && isInCheckNoChangesMode()) {
    if (!devModeEqual(oldValue, value)) throwErrorIfNoChangesMode(/* ... */); // NG0100
    return false;
  }
  lView[bindingIndex] = value;   // обычный проход: запомнить и обновить DOM
  return true;
}

function devModeEqual(a, b) {
  if (isListLike(a) && isListLike(b)) return areIterablesEqual(a, b, devModeEqual);
  if (isObject(a) && isObject(b)) return true;   // два любых объекта — «равны»
  return Object.is(a, b);
}
\`\`\`

### Пример 1. Ребёнок меняет родителя в \`ngAfterViewInit\`

\`\`\`ts
@Component({ selector: 'child-a', template: \`child\` })
class ChildA implements AfterViewInit {
  private parent = inject(ParentA);
  ngAfterViewInit() {
    this.parent.label = 'changed';
  }
}

@Component({ selector: 'app-root', imports: [ChildA], template: \`[{{ label }}] <child-a />\` })
class ParentA {
  label = 'initial';
}
// NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was
// checked. Previous value: 'initial'. Current value: 'changed'. Expression location: ParentA component.
\`\`\`

Родитель вычислил \`{{ label }}\` = \`initial\`, затем проверил ребёнка, а тот в \`ngAfterViewInit\` переписал значение. Обратите внимание: ошибка указывает на \`ParentA\` — компонент, где стоит привязка, а не на виновника. Искать надо того, кто **пишет**.

### Пример 2. Классические источники из реальных проектов

\`\`\`ts
// @ViewChild прямо в шаблоне
@Component({ template: \`[{{ inner?.name }}] <inner-cmp />\` })
class ViewChildCase { @ViewChild(Inner) inner?: Inner; }
// NG0100 ... Previous value: 'null'. Current value: 'inner-name'.

// Общий сервис-флаг загрузки, который ребёнок включает в ngOnInit
@Component({ template: \`[loading={{ loader.loading }}] <loading-child />\` })
class Page { loader = inject(Loader); }
// LoadingChild.ngOnInit() { this.loader.loading = true; }
// NG0100 ... Previous value: 'false'. Current value: 'true'.
\`\`\`

\`@ViewChild\` заполняется только после проверки детей, а привязка уже была вычислена со значением \`undefined\`. Глобальный спиннер, заголовок страницы или хлебные крошки, которые меняют дочерние компоненты, — самый частый источник этой ошибки в enterprise-приложениях.

### Пример 3. Что в шаблоне ошибку вызывает, а что — нет

\`\`\`ts
@Component({ template: \`{{ obj().a }} {{ obj() }} {{ arr() }} {{ now() }}\` })
class NewRefs {
  obj() { return { a: 1 }; }    // новый объект на каждый вызов
  arr() { return [1, 2]; }      // новый массив
  now() { return new Date(0); } // новый Date
}
// ошибки НЕТ: объекты «равны» по devModeEqual, массивы сравниваются поэлементно

@Component({ template: \`{{ rnd() }}\` })
class Random { rnd() { return Math.random(); } }
// NG0100 ... Previous value: '<одно случайное число>'. Current value: '<другое>'.
\`\`\`

Распространённое утверждение «геттер, возвращающий новый объект, всегда даёт эту ошибку» неверно — dev-проверка специально мягкая к новым ссылкам. Ошибку дают значения, которые реально различаются между двумя вычислениями: \`Math.random()\`, \`Date.now()\`, счётчики, увеличиваемые в геттере. Но новые объекты в шаблоне всё равно вредны: на каждом проходе привязка считается изменённой, и \`OnPush\`-ребёнок, получающий такой объект во вход, перерисовывается каждый раз.

### Как правильно исправлять

\`\`\`ts
// 1. Сигнал: Angular сам повторит проход, ошибки нет, экран сразу "changed"
label = signal('initial');
ngAfterViewInit() { this.label.set('changed'); }

// 2. Вычислить раньше: в конструкторе, ngOnInit или через computed
label = computed(() => this.items().length ? 'есть данные' : 'пусто');

// 3. Поднять состояние: флаг загрузки, заголовок и т.п. вычисляет родитель или store,
//    а ребёнок получает готовое значение через вход и ничего не пишет «наверх» в своих хуках

// 4. Измерения DOM — в afterNextRender, результат — в сигнал
afterNextRender(() => this.width.set(el.offsetWidth)); // новый проход, без ошибки
\`\`\`

Проверено на Angular 21: запись сигнала в \`ngAfterViewInit\` — и своего, и родительского — проходит без ошибки, и экран показывает новое значение в том же тике.

### Отложить через микрозадачу — и почему это костыль

\`\`\`ts
ngAfterViewInit() {
  Promise.resolve().then(() => (this.label = this.computeLabel()));
}
// с Zone.js: ошибки нет, экран обновится на следующем проходе (микрозадача в зоне запустит tick)
// в zoneless: ошибки нет, но экран так и останется "initial" — обычное поле никого не уведомило
\`\`\`

Микрозадача выполняется после текущего прохода, и изменение попадает в следующий. Но это работает только благодаря Zone.js. В Angular 21 приложения по умолчанию zoneless, и такой «фикс» превращает ошибку в тихий баг. Если откладываете — пишите в сигнал.

### \`detectChanges()\` как «лечение»

\`\`\`ts
ngAfterViewInit() {
  this.label = 'changed';
  this.cdr.detectChanges(); // в своём компоненте: ошибка пропала — симптом спрятан
}
// но если меняется поле РОДИТЕЛЯ, detectChanges у ребёнка не поможет — NG0100 останется
\`\`\`

\`detectChanges\` перепроверяет только свой вид и детей, поэтому контрольный проход потом видит согласованное значение. Это лишний синхронный проход и маскировка причины, а не исправление потока данных.

### \`provideCheckNoChangesConfig\` — найти скрытые случаи

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })],
});
\`\`\`

Если родитель из примера 1 сделать \`OnPush\`, ошибки не будет — контрольный проход пропустит чистый вид, а на экране останется \`initial\`. С \`exhaustive: true\` проверяются все виды, и NG0100 появляется. \`interval\` периодически запускает проверку — полезно в zoneless, чтобы найти поля, изменённые без уведомления Angular. API в статусе developer preview с Angular 20, включают его только в разработке.

### Где это применяется на практике

- **Глобальные индикаторы**: спиннер загрузки, заголовок страницы, хлебные крошки, которые выставляют дочерние или роутинговые компоненты.
- **Компоненты, зависящие от \`@ViewChild\` / \`@ContentChildren\`**: табы, считающие вкладки; формы, показывающие \`valid\` вложенных контролов.
- **Динамические компоненты и измерения DOM**: автоподстройка высоты грида, позиционирование попапов — правильное место \`afterNextRender\` + сигнал.
- **Миграция на zoneless**: старые «фиксы» через \`setTimeout\` и \`Promise.resolve\` нужно переписать на сигналы, иначе экран перестанет обновляться.
- **Код-ревью**: NG0100 в консоли — повод искать нарушение потока данных, а не повод добавить \`detectChanges\`.

## Важные нюансы и подводные камни

- **В production ошибки не будет — баг будет.** Проверка выключена, исключение не бросается. С Zone.js экран обычно «догоняет» на следующем проходе, а в zoneless может так и остаться устаревшим.
- **\`detectChanges()\` как «фикс»** прячет симптом и добавляет лишний проход; для изменений в родителе вообще не помогает.
- **\`new Date()\` или \`[...arr]\` в шаблоне не вызывают ошибку**, вопреки популярному мнению, — но заставляют привязку обновляться на каждом проходе. Ошибку вызывают \`Math.random()\`, \`Date.now()\` и прочие меняющиеся примитивы.
- **Двусторонняя правка между родителем и ребёнком** — самый частый реальный случай: ребёнок в хуке пишет в родителя или в общий сервис.
- **Порядок в шаблоне имеет значение.** Если привязку \`{{ loader.loading }}\` перенести **ниже** \`<loading-child />\`, ошибка из примера 2 исчезнет: к моменту её вычисления \`ngOnInit\` ребёнка уже отработал. Но полагаться на такую перестановку — хрупко.
- **Ошибка указывает на компонент с привязкой, а не на виновника.** \`Expression location: ParentA component\` — смотреть надо на того, кто записывает значение.
- **\`OnPush\` прячет ошибку.** Контрольный проход пропускает чистые \`OnPush\`-виды; включите \`exhaustive: true\`, чтобы увидеть всё.
- **Сигналы снимают ошибку, только если меняется сигнал.** Хук или эффект, который пишет в обычное поле родителя, по-прежнему её вызывает. А запись в сигнал прямо из выражения шаблона запрещена отдельной ошибкой NG0600.
- **\`setTimeout\` / \`Promise.resolve\` в zoneless не обновят экран**, если пишут в обычное поле: нет ошибки — нет и обновления.

**Плюсы:** проверка ловит нарушения однонаправленного потока данных ещё в разработке и точно показывает значения «было / стало»; ничего не стоит в production.
**Минусы:** указывает на место отображения, а не на причину; не видит чистые \`OnPush\`-виды без \`exhaustive\`; соблазняет «лечить» симптом через \`detectChanges\` или \`setTimeout\`.

## Как это спрашивают на собеседовании

**Главный вывод:** NG0100 — проверка dev-режима: после прохода CD Angular перевычисляет привязки, и если значение изменилось после проверки вида (хук \`ngAfterViewInit\`, ребёнок пишет в родителя, \`@ViewChild\` в шаблоне), бросает ошибку. Лечат причину — сигналы, вычисление раньше, подъём состояния; \`detectChanges\` и \`setTimeout\` лишь маскируют.

Типичные формулировки: «Почему возникает ExpressionChangedAfterItHasBeenCheckedError?», «Как правильно исправить эту ошибку?», «Почему в проде её нет?».

Что могут спросить следом:

- *Почему ошибки нет в production?* — Контрольный проход есть только в dev-режиме; несогласованность экрана при этом остаётся.
- *Почему сигнал не вызывает ошибку?* — Запись сигнала помечает вид, и Angular повторяет проход в том же тике, пока всё не согласуется.
- *Почему \`Promise.resolve()\` помогает?* — Изменение уходит в следующий проход; но это работает только с Zone.js, в zoneless экран не обновится.
- *Почему ошибка указывает не туда?* — Она называет компонент, в шаблоне которого изменилась привязка, а не того, кто записал значение.

### Ответ на 1 минуту

> Это ошибка dev-режима: после основного прохода change detection Angular делает контрольный и сверяет, что значения привязок не изменились. Если состояние поменялось уже после проверки вида — ребёнок в \`ngAfterViewInit\` пишет в родителя, общий сервис-спиннер меняется в \`ngOnInit\` дочернего компонента, в шаблоне читается \`@ViewChild\`, — Angular бросает NG0100 и показывает старое и новое значение. Сравнение мягкое: новые объекты и массивы с тем же содержимым ошибку не дают, а вот \`Math.random()\` даст. Лечу причину: вычисляю значение раньше, поднимаю состояние в родителя или храню его в сигнале — тогда Angular сам повторит проход в том же тике. \`detectChanges()\` и \`setTimeout\` только маскируют, а в zoneless отложенная запись в обычное поле вообще не обновит экран. В production проверки нет, но рассинхронизированный UI остаётся.`,
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
      ru: `## В чём суть

Сигналы Angular образуют **направленный граф зависимостей**: \`signal()\` — источник данных, \`computed()\` — производное значение, \`effect()\` и шаблоны компонентов — конечные потребители. Рёбра графа никто не описывает вручную: пока функция \`computed\` выполняется, Angular записывает, какие сигналы она прочитала. При записи в источник по графу вниз бежит только пометка «устарело», а пересчёт происходит лениво — в момент чтения.

Аналогия: доска объявлений в подъезде. Кто-то поменял график вывоза мусора — на всех объявлениях, которые на него ссылались, появляется стикер «моя бумажка протухла». Но переписывать свои объявления жильцы будут только тогда, когда кто-то реально придёт их читать, и перед этим сначала сверятся с обновлённым графиком.

**Какую проблему решает.** Производное состояние (отфильтрованный список, итог корзины, «можно ли нажать кнопку») нужно держать согласованным с исходным. Пересчитывать руками — забудете. Пересчитывать «на каждое событие» (как в наивных реактивных системах или в RxJS через \`combineLatest\`) — получите лишнюю работу и, что хуже, **glitch**: на мгновение потребитель видит смесь новых и старых значений. Граф сигналов гарантирует, что любое прочитанное значение согласовано, а каждая производная пересчитывается не больше одного раза на реальное изменение.

## Словарик терминов

- **Сигнал (\`signal\`, \`WritableSignal\`)** — обёртка над значением: читается вызовом \`count()\`, меняется через \`set\` / \`update\` и сообщает зависимым узлам о переменах.
- **\`computed\`** — производный сигнал: функция от других сигналов с кэшем. Только для чтения.
- **\`effect\`** — потребитель «на выходе» из графа: выполняет побочное действие, когда изменились прочитанные им сигналы.
- **Producer / consumer (источник / потребитель)** — роли узла в графе. \`signal\` — только producer, \`effect\` и шаблон — только consumer, \`computed\` — и то и другое.
- **Реактивный контекст (активный потребитель)** — глобальная переменная «кто сейчас вычисляется»; любое чтение сигнала регистрирует ребро к этому потребителю.
- **Версия (\`version\`)** — счётчик узла, растёт при каждом **реальном** изменении значения. Потребитель помнит, какую версию источника видел в прошлый раз.
- **Эпоха (\`epoch\`)** — глобальный счётчик записей во все сигналы; позволяет мгновенно понять «с прошлой проверки вообще ничего не писали».
- **Dirty / stale (устаревший)** — флаг «мои источники, возможно, изменились, перед выдачей значения надо сверить».
- **Push / pull** — две фазы: запись **проталкивает** вниз только флаги, чтение **вытягивает** свежие значения сверху вниз.
- **Glitch (глитч)** — промежуточное некорректное состояние, когда потребитель видит часть зависимостей уже обновлёнными, а часть — ещё старыми.
- **Мемоизация** — запоминание результата: \`computed\` не пересчитывается, пока его источники не изменились.
- **Функция равенства (\`equal\`)** — как узел решает, «изменилось ли значение»; по умолчанию \`Object.is\`.
- **Живой потребитель (live consumer)** — узел, на который источник реально подписан (эффект, шаблон и всё, что им нужно); «неживой» \`computed\` сверяется с источниками только при чтении.
- **\`untracked\`** — функция, внутри которой чтение сигнала не создаёт ребро графа.

## Как это работает под капотом

1. В движке есть глобальная переменная «активный потребитель». Когда запускается \`computed\`, \`effect\` или шаблон, он ставит туда себя и восстанавливает прежнее значение после выполнения.
2. Вызов \`a()\` проверяет активного потребителя: если он есть, создаётся ребро «a → потребитель» и запоминается версия \`a\`, которую потребитель увидел. Так граф строится сам.
3. Набор рёбер пересобирается на **каждом** запуске: если ветка \`if\` не выполнилась, сигналы из неё в этот раз не зависимости.
4. \`a.set(v)\` сначала сравнивает новое значение со старым через \`equal\`. Равны — ничего не происходит. Разные — значение заменяется, версия \`a\` и глобальная эпоха растут.
5. Затем **push**: по рёбрам вниз рекурсивно ставится флаг \`dirty\`. Ни одна функция при этом не вызывается — это дёшево. Эффекты попадают в очередь планировщика, а шаблоны помечают свой вид для перерисовки.
6. Чтение \`c()\` — это **pull**. Если \`c\` не грязный и эпоха не менялась, сразу отдаётся кэш. Иначе \`c\` по порядку опрашивает свои источники: если источник сам \`computed\`, его сначала приводят в актуальное состояние, затем сравнивают сохранённую версию с текущей.
7. Ни одна версия не изменилась — \`c\` помечается чистым **без пересчёта**. Хоть одна изменилась — функция \`c\` выполняется заново.
8. Новый результат сравнивается со старым через \`equal\`. Если равен, версия \`c\` **не растёт**, и потребители \`c\` тоже не будут пересчитываться — изменение «гасится» на этом узле.
9. Поскольку перед пересчётом узла все его источники уже обновлены, он никогда не видит смесь старого и нового — это и есть glitch-free. А так как узел становится чистым после пересчёта, он считается ровно один раз.

Ниже — работающая мини-реализация той же идеи (без отписок и эффектов, но с push-флагами, версиями и ленивым pull):

\`\`\`js
let activeConsumer = null;

function signal(value) {
  const node = { value, version: 0, consumers: new Set() };
  const read = () => { track(node); return node.value; };
  read.set = (v) => {
    if (Object.is(v, node.value)) return;      // равное значение — ничего не делаем
    node.value = v;
    node.version++;
    markDirty(node);                           // PUSH: только флажки, без вычислений
  };
  return read;
}

function computed(fn) {
  const node = { value: undefined, version: 0, dirty: true, producers: new Map(), consumers: new Set() };
  node.refresh = () => {
    if (!node.dirty) return;
    // PULL: сначала обновляем источники и смотрим, изменились ли их версии
    const changed = node.producers.size === 0 ||
      [...node.producers].some(([p, seen]) => { p.refresh?.(); return p.version !== seen; });
    node.dirty = false;
    if (!changed) return;                      // источники те же — отдаём кэш
    const prev = activeConsumer;
    activeConsumer = node;
    node.producers.clear();                    // граф строится заново при каждом запуске
    const v = fn();
    activeConsumer = prev;
    if (!Object.is(v, node.value)) { node.value = v; node.version++; }
  };
  const read = () => { node.refresh(); track(node); return node.value; };
  return read;
}

function track(producer) {
  if (!activeConsumer) return;
  activeConsumer.producers.set(producer, producer.version);
  producer.consumers.add(activeConsumer);
}

function markDirty(node) {
  for (const c of node.consumers) {
    if (!c.dirty) { c.dirty = true; markDirty(c); }
  }
}
\`\`\`

### Пример 1. Ромбовидная зависимость: glitch-free на настоящем Angular

\`\`\`ts
import { signal, computed } from '@angular/core';

const a = signal(1);
const b = computed(() => { console.log('  compute b'); return a() * 2; });
const c = computed(() => { console.log('  compute c'); return a() + b(); });

console.log('c =', c());
a.set(5);
console.log('после a.set(5) ничего не посчитано');
console.log('c =', c());
console.log('c =', c());
//   compute c
//   compute b
// c = 3
// после a.set(5) ничего не посчитано
//   compute c
//   compute b
// c = 15
// c = 15        ← из кэша, без пересчёта
\`\`\`

\`set\` не вызвал ни одной функции — только расставил флаги. При чтении \`c\` увидел, что версия \`a\` изменилась, и стал пересчитываться; внутри он прочитал \`b\`, а \`b\` перед выдачей значения сам пересчитался от нового \`a\`. Комбинации «новое \`a\` = 5 + старое \`b\` = 2» не существовало ни на мгновение. Мини-реализация выше печатает ровно то же самое.

### Пример 2. Как выглядит глитч без графа: RxJS и наивный push

\`\`\`js
const a$ = new BehaviorSubject(1);
const b$ = a$.pipe(map((a) => a * 2));
combineLatest([a$, b$]).pipe(map(([a, b]) => a + b)).subscribe((c) => console.log('c =', c));
a$.next(5);
// c = 3
// c = 7    ← ГЛИТЧ: новое a (5) + старое b (2)
// c = 15
\`\`\`

\`combineLatest\` получает уведомление от \`a$\` раньше, чем \`b$\` успел пересчитаться, и честно выдаёт промежуточную сумму. Наивная push-реализация (каждый узел пересчитывается сразу при уведомлении) в той же ромбовидной схеме пересчитала у меня \`c\` **дважды** на одно изменение \`a\`. Граф с версиями и ленивым pull решает обе проблемы.

### Пример 3. Ленивость и отсечение по равенству

\`\`\`ts
const heavy = computed(() => { console.log('heavy runs'); return 42; });
// ничего не напечатано: пока heavy() никто не прочитал, функция не выполнялась

const n = signal(2);
const isEven = computed(() => { console.log('  compute isEven'); return n() % 2 === 0; });
const label = computed(() => { console.log('  compute label'); return isEven() ? 'чётное' : 'нечётное'; });
console.log(label());
n.set(4);
console.log(label());
//   compute label
//   compute isEven
// чётное
//   compute isEven      ← n изменился, isEven пересчитан: снова true
// чётное                ← label НЕ пересчитан: версия isEven не выросла
\`\`\`

\`isEven\` получил то же значение \`true\`, его версия не изменилась, и \`label\` отдал кэш. В реальном приложении так «гасятся» лишние перерисовки: например, \`hasSelection\` не дёргает шаблон, пока выбранных строк больше нуля.

### Пример 4. Динамические зависимости

\`\`\`ts
const showName = signal(false), name = signal('Ann'), id = signal(1);
const title = computed(() => { console.log('  compute title'); return showName() ? name() : 'id ' + id(); });
console.log(title());   //   compute title  →  id 1
name.set('Bob');
console.log(title());   // id 1  — без пересчёта: name сейчас не зависимость
showName.set(true);
console.log(title());   //   compute title  →  Bob
\`\`\`

В первом запуске \`name()\` не вызывался, ребра к нему не было, поэтому его изменение \`title\` проигнорировал. Граф всегда отражает **последний** реальный запуск.

### \`signal\`: \`set\`, \`update\`, \`equal\`

\`\`\`ts
const x = signal(1);
x.set(1);                               // то же значение — версия не растёт, никто не уведомлён
x.update((v) => v + 1);                 // новое значение из старого

const user = signal({ name: 'Ann', tags: ['a'] });
const tagCount = computed(() => user().tags.length);
user().tags.push('b'); user.set(user()); // 1 — та же ссылка, Object.is говорит «не изменилось»
user.update((u) => ({ ...u, tags: [...u.tags, 'c'] })); // 3 — новая ссылка

const pos = signal({ x: 0, y: 0 }, { equal: (p, q) => p.x === q.x && p.y === q.y });
pos.set({ x: 0, y: 0 });                 // новый объект, но «равный» — потребители не пересчитаются
\`\`\`

Функция \`equal\` — главный рычаг оптимизации для объектов: по умолчанию сравнение по ссылке, а своя функция позволяет сравнивать по смыслу. \`asReadonly()\` отдаёт наружу версию сигнала без \`set\`.

### \`computed\`: правила и ошибки

\`\`\`ts
const s = signal(0);
const bad = computed(() => { s.set(1); return 1; });
bad(); // NG0600: Writing to signals is not allowed in a \`computed\`

const p = computed(() => q() + 1);
const q = computed(() => p() + 1);
p();   // Error: Detected cycle in computations.

const parsed = computed(() => { if (id() < 0) throw new Error('bad id'); return id() * 2; });
// ошибка тоже кэшируется: повторное чтение снова бросит её без пересчёта, пока id не изменится
\`\`\`

\`computed\` должен быть чистой функцией: никаких записей в сигналы, HTTP-запросов и логов с побочными эффектами — его функция может выполниться ноль, один или много раз.

### \`effect\` и \`untracked\` в графе

\`\`\`ts
effect(() => console.log('count =', count()));
count.set(2); count.set(3);
// после ближайшего прохода: count = 3   (значение 2 эффект не увидел вообще)

effect(() => console.log(\`a=\${a()} b=\${untracked(b)}\`));
// b.set(20) → эффект НЕ перезапустится; a.set(2) → перезапустится и прочитает b = 20
\`\`\`

Эффект — живой потребитель: при записи он лишь попадает в очередь, а выполняется асинхронно и один раз за пачку изменений. Glitch-free распространяется и на него: эффект видит только согласованный финальный снимок, промежуточные значения он может пропустить. \`untracked\` читает значение без создания ребра.

### Где это применяется на практике

- **Гриды и таблицы**: \`rows\` → \`filtered\` → \`sorted\` → \`page\` — цепочка \`computed\`, где смена страницы не пересчитывает фильтрацию.
- **Формы**: \`isValid\`, \`canSubmit\`, итоговые суммы и производные поля как \`computed\` от значений полей.
- **Права и фичефлаги**: \`canEdit = computed(() => user().roles.includes('admin') && !doc().locked)\`.
- **Дашборды**: агрегаты и KPI, которые пересчитываются только когда реально изменились исходные данные.
- **Stores**: NgRx SignalStore, \`selectSignal\`, свои сервисы-хранилища на \`signal\` + \`computed\`.
- **Шаблоны**: каждый шаблон — тоже потребитель графа; поэтому сигнал, прочитанный в шаблоне, сам помечает свой вид для перерисовки.

## Важные нюансы и подводные камни

- **Запись в сигнал ничего не вычисляет** — она только расставляет флаги. Если \`computed\` никто не читает, его функция не выполнится никогда.
- **\`computed\` должен быть чистым.** Запись сигнала внутри даёт NG0600, а побочные эффекты выполнятся непредсказуемое число раз или не выполнятся вовсе.
- **Условное чтение меняет граф.** \`computed(() => flag() ? x() : y())\` в каждый момент зависит только от реально прочитанных сигналов — набор рёбер динамический.
- **\`set\` с тем же значением** не распространяет изменение: по умолчанию \`Object.is\`; для объектов можно задать свой \`equal\`.
- **Мутация объекта внутри сигнала** не меняет ни ссылку, ни версию — нужна новая ссылка через \`set\` / \`update\`.
- **\`effect\` не синхронен** — сразу после \`set\` он ещё не отработал и может «проглотить» промежуточные значения. В тестах вместо устаревшего \`TestBed.flushEffects()\` используют \`TestBed.tick()\`.
- **Циклы запрещены**: \`computed\`, читающие друг друга, дают «Detected cycle in computations».
- **Ошибка в \`computed\` кэшируется** и бросается при каждом чтении, пока не изменится источник.
- **«Неживой» \`computed\` не держит подписок.** Если на него не ссылается ни эффект, ни шаблон, источник не хранит на него ссылку — такой узел спокойно собирается сборщиком мусора, а актуальность проверяется по версиям при чтении.

**Плюсы:** автоматический граф зависимостей, согласованные значения без глитчей, ленивость и мемоизация, отсечение лишних пересчётов по равенству, точечные обновления шаблонов.
**Минусы:** нужно помнить про ссылки и иммутабельность; динамические зависимости иногда удивляют; асинхронные эффекты сложнее отлаживать и тестировать; граф синхронный — для асинхронных потоков по-прежнему нужен RxJS или \`resource\`.

## Как это спрашивают на собеседовании

**Главный вывод:** сигналы — граф с гибридной push/pull-моделью: запись только помечает зависимые узлы грязными, а \`computed\` пересчитывается лениво при чтении, сверяя версии источников. Отсюда glitch-free: никто не видит смесь старого и нового, и каждый узел пересчитывается максимум один раз на реальное изменение.

Типичные формулировки: «Как устроены сигналы внутри?», «Что такое glitch-free?», «Чем сигналы отличаются от RxJS для производного состояния?», «Когда пересчитывается computed?».

Что могут спросить следом:

- *Что будет, если \`computed\` никто не читает?* — Его функция не выполнится ни разу: модель ленивая.
- *Почему \`computed\` не пересчитался после \`set\`?* — Значение равно старому по \`equal\` или сигнал сейчас не в зависимостях из-за условной ветки.
- *Чем это лучше \`combineLatest\`?* — \`combineLatest\` толкает каждое событие сразу и может выдать промежуточную комбинацию; граф сигналов вытягивает согласованный снимок.
- *Когда выполняется \`effect\`?* — Асинхронно, один раз за пачку изменений: компонентные — во время проверки компонента, корневые — в начале прохода синхронизации.

### Ответ на 1 минуту

> Сигналы образуют направленный граф: \`signal\` — источник, \`computed\` — производный узел, а \`effect\` и шаблоны — конечные потребители. Рёбра строятся автоматически: пока функция выполняется, Angular записывает, какие сигналы она прочитала, и пересобирает этот набор на каждом запуске. Модель гибридная: запись сравнивает значение через \`Object.is\`, увеличивает версию и проталкивает вниз только флаг «грязный», ничего не вычисляя, а \`computed\` пересчитывается лениво при чтении, сначала обновив и сверив версии своих источников. Если версии не изменились — отдаётся кэш, а если новый результат равен старому — изменение гасится дальше. Отсюда glitch-free: потребитель никогда не видит смесь старых и новых значений, как бывает с \`combineLatest\`, и пересчитывается ровно один раз. Эффекты при этом асинхронные и видят только финальный согласованный снимок.`,
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
      ru: `## В чём суть

\`computed\` **вычисляет значение**, \`effect\` **что-то делает**. Первый отвечает на вопрос «сколько получится?» и остаётся внутри реактивного мира: он чистый, ленивый и кэшируется. Второй отвечает на вопрос «что сделать, когда это изменилось?» и выводит изменения наружу: в \`localStorage\`, в DOM сторонней библиотеки, в аналитику.

Аналогия: \`computed\` — формула в ячейке Excel: она ничего не меняет в мире, просто показывает результат и пересчитывается сама. \`effect\` — макрос «когда итог изменился, отправь письмо бухгалтеру». Формул может быть сколько угодно, а письма лучше слать редко и осознанно.

**Какую проблему решает.** Сигналам нужно два разных инструмента: один — чтобы выводить новые значения из существующих (итог корзины, отфильтрованный список, доступность кнопки), другой — чтобы синхронизировать состояние с тем, что Angular не контролирует. Если перепутать — например, «вычислять» значения через \`effect\` + \`set\`, — получаются лишние прогоны, значения, которые на мгновение отстают от источника, и бесконечные циклы. Правильный выбор делает код предсказуемым и быстрым.

## Словарик терминов

- **Сигнал (\`signal\`)** — реактивное значение: читается вызовом \`count()\`, меняется через \`set\` / \`update\`.
- **\`computed\`** — производный сигнал только для чтения: функция от других сигналов с кэшем.
- **\`effect\`** — реакция на изменения сигналов, которая выполняет побочное действие.
- **Побочный эффект (side effect)** — любое действие, видимое снаружи функции: запись в хранилище, сеть, DOM, лог, запись в другой сигнал.
- **Чистая функция** — функция без побочных эффектов, результат зависит только от входов.
- **Ленивость и мемоизация** — \`computed\` считается только при чтении и запоминает результат, пока источники не изменились.
- **Injection context (контекст внедрения)** — момент, когда работает \`inject()\`: конструктор, инициализатор поля, фабрика провайдера, \`runInInjectionContext\`.
- **\`onCleanup\`** — функция, которую \`effect\` передаёт в колбэк, чтобы зарегистрировать уборку перед следующим запуском и при уничтожении.
- **Компонентный и корневой эффект** — созданный в компоненте/директиве (живёт и выполняется вместе с ним) и созданный в root-сервисе (не привязан к дереву компонентов).
- **\`linkedSignal\`** — записываемый сигнал, который сбрасывается или пересчитывается при изменении источника.
- **\`untracked\`** — чтение сигнала без создания зависимости.
- **\`afterRenderEffect\`** — эффект, который выполняется после отрисовки DOM; для работы с размерами и сторонними виджетами.

## Как это работает под капотом

1. \`computed(fn)\` создаёт узел графа, который ничего не делает до первого чтения. При чтении он выполняет \`fn\`, запоминает прочитанные сигналы и их версии и кэширует результат.
2. Запись в источник лишь помечает \`computed\` грязным. Пересчёт случится при следующем чтении и только если версия источника действительно изменилась; если новый результат равен старому, зависимые узлы не трогаются.
3. \`effect(fn)\` создаёт **живого** потребителя и регистрирует его в планировщике. Первый запуск — асинхронный, не в момент создания.
4. Запись в прочитанный эффектом сигнал помечает эффект грязным и ставит его в очередь. Несколько записей подряд дают **один** запуск с последними значениями.
5. Когда очередь разбирается, зависит от вида эффекта. Корневой эффект (из root-сервиса) выполняется в начале ближайшего прохода синхронизации \`ApplicationRef\`, до проверки компонентов. Компонентный — во время проверки своего компонента, перед перерисовкой его шаблона.
6. Перед каждым повторным запуском и при уничтожении вызываются функции, зарегистрированные через \`onCleanup\`.
7. Компонентный эффект уничтожается вместе с компонентом через его \`DestroyRef\`. Поэтому \`effect()\` требует injection context — без него не к чему привязать жизненный цикл, и Angular бросает NG0203.

Порядок на старте приложения (Angular 21, проверено):

\`\`\`text
constructor
rootEffect count=0          ← корневой эффект из root-сервиса
ngOnInit
componentEffect count=0     ← эффект компонента: после ngOnInit, до шаблона
template render
ngAfterViewInit
\`\`\`

### \`computed\` — производное значение

\`\`\`ts
const first = signal('Anton');
const last = signal('Hryharuk');
const fullName = computed(() => \`\${first()} \${last()}\`);

const items = signal([{ price: 100, qty: 2 }, { price: 50, qty: 1 }]);
const total = computed(() => items().reduce((s, i) => s + i.price * i.qty, 0)); // 250
const canCheckout = computed(() => total() > 0 && !isLoading());
\`\`\`

\`fullName\` пересчитается только когда его прочитают и только если изменилось имя или фамилия. Внутри \`computed\` нельзя писать в сигналы (NG0600) и нельзя делать ничего «наружу» — его функция может не выполниться ни разу или выполниться много раз.

### \`effect\` — побочный эффект с уборкой

\`\`\`ts
@Component({ /* ... */ })
export class Editor {
  state = signal({ text: '' });

  constructor() {
    effect((onCleanup) => {
      const snapshot = this.state();                      // зависимость
      const id = setTimeout(() => localStorage.setItem('draft', JSON.stringify(snapshot)), 500);
      onCleanup(() => clearTimeout(id));                  // перед следующим запуском и при уничтожении
    });
  }
}
\`\`\`

Порядок вызовов проверен на Angular 21:

\`\`\`ts
const q = signal('a');
const ref = effect((onCleanup) => {
  const v = q();
  console.log('run ' + v);
  onCleanup(() => console.log('cleanup ' + v));
});
// после первого прохода: run a
q.set('b');
// после прохода: cleanup a, run b
ref.destroy();
// cleanup b
\`\`\`

Без \`onCleanup\` каждый перезапуск оставлял бы висеть старый таймер или подписку — классическая утечка.

### Анти-паттерн: «вычислять» через \`effect\`

\`\`\`ts
const price = signal(100);
const qty = signal(2);

const totalComputed = computed(() => price() * qty());

const totalViaEffect = signal(0);
effect(() => totalViaEffect.set(price() * qty()));   // так делать не надо

qty.set(3);
console.log(totalComputed(), totalViaEffect()); // 300 200  ← эффект ещё не отработал
// после ближайшего прохода:                     300 300
\`\`\`

\`computed\` всегда согласован в момент чтения, а значение, которое пишет эффект, **отстаёт** до следующего прохода. Плюс лишнее состояние, лишний запуск и риск цикла. Правило: если «хочется записать сигнал в ответ на другой сигнал» — почти всегда нужен \`computed\` или \`linkedSignal\`.

### Бесконечный цикл в \`effect\`

\`\`\`ts
const n = signal(0);
effect(() => n.set(n() + 1)); // читает и пишет один и тот же сигнал
\`\`\`

Эффект пишет в сигнал, который сам читает, и тут же снова становится грязным. В эксперименте на Angular 21 такой эффект с искусственным ограничителем отработал 100 000 раз подряд без какой-либо ошибки — без ограничителя вкладка просто зависнет. Если запись по смыслу нужна, читайте этот сигнал через \`untracked\`.

### \`untracked\` — прочитать, не подписываясь

\`\`\`ts
effect(() => {
  const user = currentUser();                      // зависимость
  const settings = untracked(() => appSettings()); // просто прочитать
  analytics.track('user_changed', { user, theme: settings.theme });
});
// appSettings.set(...) → эффект НЕ перезапустится; currentUser.set(...) → перезапустится
\`\`\`

\`untracked\` нужен, когда эффект должен реагировать на один сигнал, а остальные только читать. Он же защищает от случайных зависимостей внутри вызываемых сервисов.

### \`linkedSignal\` — записываемое, но зависимое состояние

\`\`\`ts
const options = signal(['S', 'M', 'L']);
const selected = linkedSignal(() => options()[0]);

selected();                 // 'S'
selected.set('L');          // пользователь выбрал
selected();                 // 'L'
options.set(['XL', 'XXL']);
selected();                 // 'XL' — список сменился, выбор сброшен к первому

const keep = linkedSignal<string[], string>({
  source: options,
  computation: (opts, prev) => (prev && opts.includes(prev.value) ? prev.value : opts[0]),
});
// выбор сохраняется, если он есть в новом списке, иначе сбрасывается
\`\`\`

Это ответ на частый вопрос «как сбросить выбранное значение при смене списка без \`effect\`». Стабилен с Angular 20.

### Injection context и \`afterRenderEffect\`

\`\`\`ts
ngOnInit() {
  effect(() => console.log(this.id()));
  // NG0203: effect() can only be used within an injection context such as a constructor,
  // a factory function, a field initializer, or a function used with \`runInInjectionContext\`.
}

private injector = inject(Injector);
ngOnInit() {
  effect(() => console.log(this.id()), { injector: this.injector }); // так можно
}

// для работы с DOM после отрисовки — afterRenderEffect
afterRenderEffect(() => chart.resize(this.width()));
\`\`\`

Лучшее место для эффекта — конструктор или инициализатор поля. \`afterRenderEffect\` выполняется после того, как Angular обновил DOM, поэтому подходит для измерений и вызова API сторонних виджетов.

### Как выбрать

- **Нужно новое значение из существующих сигналов** — \`computed\`: чистый, ленивый, мемоизированный, всегда согласованный.
- **Нужно значение, которое и выводится из источника, и может меняться пользователем** — \`linkedSignal\`.
- **Нужно что-то сделать во внешнем мире** — \`effect\`: \`localStorage\`, логирование, аналитика, синхронизация с URL, вызов API сторонней библиотеки.
- **Нужно работать с DOM после отрисовки** — \`afterRenderEffect\` или \`afterNextRender\`.
- **Нужна асинхронщина (debounce, HTTP, отмена)** — не \`effect\` + \`set\`, а RxJS-интероп (\`toObservable\` → операторы → \`toSignal\`) или \`resource\` (пока experimental).
- **Правило одной фразы:** \`effect\` — дверь **наружу** из реактивного мира; всё, что остаётся внутри графа, делается через \`computed\`.

### Где это применяется на практике

- **Гриды**: \`filtered\`, \`sorted\`, \`pageRows\`, \`selectedCount\` — цепочка \`computed\`; сохранение настроек колонок в \`localStorage\` — \`effect\`.
- **Формы**: \`isValid\`, \`canSubmit\`, производные поля — \`computed\`; автосохранение черновика с debounce — \`effect\` с \`onCleanup\`.
- **Синхронизация с URL**: фильтры дашборда пишутся в query params через \`effect\` и \`Router.navigate\`.
- **Интеграция со сторонними виджетами**: графики, карты, редакторы обновляются из \`effect\` / \`afterRenderEffect\`, когда меняются входные сигналы.
- **Аналитика и логирование**: трекинг смены пользователя, тарифа, роли.
- **Выбор по умолчанию в списках**: \`linkedSignal\` вместо \`effect\`, сбрасывающего выбранное значение.

## Важные нюансы и подводные камни

- **\`effect\` как замена \`computed\`** — самая частая ошибка: лишнее состояние, отставание значения до следующего прохода, лишние прогоны.
- **Запись в сигналы внутри \`effect\` с Angular 19 разрешена.** Старое правило «по умолчанию запрещено, нужен \`allowSignalWrites\`» устарело: флаг помечен \`@deprecated\` с пояснением «signal writes are allowed by default». Но разрешено — не значит рекомендовано.
- **Защиты от самоподпитывающегося эффекта нет.** Эффект, который читает и пишет один сигнал, перезапускает сам себя до бесконечности; разрывайте цикл через \`untracked\` или пересматривайте дизайн.
- **Забыли \`onCleanup\`** — утечки: подписки и таймеры множатся на каждый перезапуск.
- **Создали \`effect\` в \`ngOnInit\` без \`injector\`** — NG0203; создавайте в конструкторе или передавайте \`{ injector }\`.
- **Ждёте, что \`effect\` отработает сразу после \`set\`** — он асинхронный и запускается один раз за пачку изменений; промежуточные значения может не увидеть. В тестах — \`TestBed.tick()\` (старый \`TestBed.flushEffects()\` устарел).
- **Условное чтение в \`effect\`**: зависимость регистрируется только если ветка выполнилась. Если первый запуск ушёл в другую ветку, эффект может «молчать» при изменении нужного сигнала.
- **Корневые и компонентные эффекты выполняются в разное время**: корневой — в начале прохода синхронизации, компонентный — во время проверки своего компонента, перед его шаблоном. Компонентный умирает вместе с компонентом, корневой живёт, пока жив сервис (или до \`destroy()\`).
- **Внутри \`computed\` запись запрещена всегда** — NG0600 «Writing to signals is not allowed in a \`computed\`».

**Плюсы:** \`computed\` даёт согласованное, ленивое и кэшированное производное состояние без ручных подписок; \`effect\` — единая точка выхода во внешний мир с автоматической уборкой и привязкой к жизненному циклу.
**Минусы:** \`effect\` асинхронный, его легко превратить в «скрытый поток данных» и бесконечный цикл; сложнее тестировать; для асинхронных сценариев (debounce, отмена запросов) сигналов недостаточно — нужен RxJS или \`resource\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`computed\` — для значений: чистый, ленивый, мемоизированный и всегда согласованный. \`effect\` — для побочных действий наружу: асинхронный, с \`onCleanup\`, создаётся в injection context. Если в \`effect\` хочется записать сигнал — почти всегда нужен \`computed\` или \`linkedSignal\`.

Типичные формулировки: «Когда использовать computed, а когда effect?», «Какие подводные камни у effect?», «Можно ли писать в сигнал внутри effect?».

Что могут спросить следом:

- *Чем \`effect\` отличается от подписки на Observable?* — Зависимости определяются автоматически по чтениям, запуск асинхронный и батчится, уборка привязана к \`DestroyRef\`; но операторов времени (debounce, switchMap) у него нет.
- *Зачем появился \`linkedSignal\`?* — Для состояния, которое выводится из источника, но может меняться вручную; раньше это делали через \`effect\` + \`set\`.
- *Когда выполняется эффект?* — Компонентный — во время проверки компонента перед шаблоном, корневой — в начале прохода синхронизации; не синхронно с \`set\`.
- *Что будет, если эффект пишет в сигнал, который читает?* — Бесконечный перезапуск; Angular от этого не защищает.

### Ответ на 1 минуту

> \`computed\` — это производное значение: чистое, ленивое и мемоизированное, оно пересчитывается только при чтении и только если реально изменился источник, поэтому всегда согласовано. \`effect\` — побочный эффект, мост наружу: \`localStorage\`, аналитика, синхронизация с URL, сторонние виджеты. Ключевое правило: если в \`effect\` хочется записать сигнал из другого сигнала, нужен \`computed\` или \`linkedSignal\` — значение, записанное эффектом, отстаёт до следующего прохода, а эффект, читающий и пишущий один сигнал, зацикливается без всякой защиты. С Angular 19 запись в сигналы внутри эффекта разрешена по умолчанию, \`allowSignalWrites\` устарел, но это не повод так проектировать. Из нюансов: эффект создают в injection context или передают \`injector\`, через \`onCleanup\` снимают таймеры и подписки, и он выполняется асинхронно, один раз за пачку изменений.`,
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
      ru: `## В чём суть

\`signal\` хранит значение, \`computed\` вычисляет значение из других сигналов. Но в реальном интерфейсе часто нужно третье: значение, которое **вычисляется из источника, но пользователь может его поменять руками** — это \`linkedSignal\`. И четвёртое: значение, которое **приходит асинхронно с сервера** и зависит от сигналов-параметров — это \`resource()\`.

Аналогия для \`linkedSignal\`: выпадающий список городов. Система подставляет город по умолчанию, но пользователь волен выбрать другой; сменили страну — подстановка происходит заново. \`computed\` тут не годится (в него нельзя записать), обычный \`signal\` тоже (он ничего не знает о смене страны).

Аналогия для \`resource()\`: официант, которому вы меняете заказ на полпути. Он не принесёт вам оба блюда — старый заказ отменяется, и на стол попадает только актуальный. А на табло у кухни всегда видно, что сейчас происходит: «готовится», «подано», «на кухне проблема».

**Какую проблему решает.** Без \`linkedSignal\` «сбрасываемое при смене источника» состояние пишут через \`effect\`, который копирует значение из одного сигнала в другой: это лишний шаг, задержка и момент, когда данные не согласованы. Без \`resource()\` каждую загрузку оформляют вручную: флаг \`loading\`, переменная ошибки, подписка, отмена предыдущего запроса, защита от того, что медленный ответ на старый запрос перетрёт быстрый ответ на новый. Забыли хоть что-то — получаете зависший спиннер или данные чужого пользователя на экране. Оба API превращают эти шаблонные куски в одно объявление.

## Словарик терминов

- **Сигнал (\`signal\`, \`WritableSignal\`)** — реактивная переменная: читается вызовом \`count()\`, меняется через \`set(v)\` или \`update(fn)\`, а всё, что её читало, узнаёт об изменении.
- **Вычисляемый сигнал (\`computed\`)** — сигнал только для чтения, значение которого считается функцией от других сигналов и пересчитывается лениво, при чтении.
- **\`linkedSignal\`** — записываемый сигнал, значение которого вычисляется из источника и **пересчитывается заново**, когда источник меняется; между сменами источника его можно менять руками.
- **Источник (\`source\`)** — сигнал или функция, за изменением которой следит \`linkedSignal\`; смена значения источника — команда «пересчитай».
- **\`computation\` и \`previous\`** — функция, которая считает новое значение; вторым аргументом получает \`previous = { source, value }\` — прошлое значение источника и прошлое значение самого сигнала (включая ручную правку).
- **\`effect\`** — функция, которая перезапускается при изменении прочитанных в ней сигналов; нужна для побочных действий (лог, запись в \`localStorage\`), а не для вычисления состояния.
- **\`resource()\`** — реактивная обёртка над асинхронной загрузкой: берёт параметры из сигналов, вызывает загрузчик и отдаёт результат как набор сигналов.
- **\`params\` (раньше \`request\`)** — функция внутри \`resource()\`, которая читает сигналы-параметры; когда её результат меняется, загрузка перезапускается. Если она вернула \`undefined\`, загрузки нет.
- **\`loader\` / \`stream\`** — асинхронная функция загрузки: \`loader\` возвращает \`Promise\`, \`stream\` — сигнал с потоком значений (а в \`rxResource\` — \`Observable\`).
- **\`AbortController\` / \`AbortSignal\`** — стандартный браузерный механизм отмены: контроллер вызывает \`abort()\`, а сигнал отмены, переданный в \`fetch\`, обрывает запрос.
- **Гонка (race condition)** — ситуация, когда результат зависит от того, какой из параллельных ответов придёт первым: медленный ответ на старый запрос перетирает свежие данные.
- **Статус ресурса (\`ResourceStatus\`)** — строка \`'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local'\`: что ресурс делает прямо сейчас.
- **\`rxResource\` и \`httpResource\`** — варианты \`resource()\`: первый принимает загрузчик на RxJS, второй делает GET-запрос через \`HttpClient\` по URL из сигнала.
- **Injection-контекст** — момент, когда Angular создаёт класс (конструктор, инициализаторы полей) и функции вроде \`inject()\` знают, к какому инжектору обращаться.
- **\`@experimental\` / стабильный API** — пометки в типах Angular: экспериментальный API может поменять сигнатуру в любом релизе, стабильный — только по правилам deprecation.

## Как это работает под капотом

Сначала \`linkedSignal\`. Его поведение удобно представить такой упрощённой моделью (настоящая реализация живёт в \`@angular/core/primitives/signals\`, но логика та же):

\`\`\`ts
// Упрощённая модель linkedSignal
function linkedSignalModel<S, D>(source: () => S, computation: (s: S, prev?: { source: S; value: D }) => D) {
  let lastSource: S | undefined;
  let hasValue = false;
  let value!: D;

  const read = () => {
    const s = source();                       // 1. читаем источник
    if (!hasValue || !Object.is(s, lastSource)) {
      value = computation(s, hasValue ? { source: lastSource!, value } : undefined); // 2. пересчёт
      lastSource = s;
      hasValue = true;
    }
    return value;
  };
  read.set = (v: D) => { read(); value = v; }; // 3. ручная правка живёт до смены источника
  return read;
}
\`\`\`

Что происходит по шагам:

1. \`linkedSignal\` подписывается на источник так же, как \`computed\` подписывается на сигналы внутри себя.
2. Пока источник не меняется, это обычный записываемый сигнал: \`set\` и \`update\` работают, значение хранится.
3. Как только источник изменился, следующее чтение запускает \`computation\` заново, поэтому ручная правка по умолчанию **сбрасывается**.
4. Если в \`computation\` передать второй аргумент \`previous\`, можно решить самому: сохранить прошлый выбор (если он ещё валиден) или взять значение по умолчанию.
5. Пересчёт ленивый: пока значение никто не читает, \`computation\` не вызывается — сколько бы раз ни менялся источник.

Теперь \`resource()\`. Интересная деталь: в Angular 21 он сам построен на \`linkedSignal\` и \`effect\` — состояние ресурса хранится в \`linkedSignal\`, который сбрасывается в \`loading\` при каждой смене параметров. Упрощённо:

\`\`\`ts
// Упрощённая модель resource()
function resourceModel<T, P>(params: () => P | undefined, loader: (p: { params: P; abortSignal: AbortSignal }) => Promise<T>) {
  const state = signal<{ status: string; value?: T; error?: unknown }>({ status: 'idle' });
  let controller: AbortController | undefined;

  effect(async () => {
    const p = params();                        // 1. читаем сигналы-параметры
    controller?.abort();                       // 2. отменяем прошлую загрузку
    if (p === undefined) { state.set({ status: 'idle' }); return; }
    const my = (controller = new AbortController());
    state.set({ status: 'loading' });
    try {
      const value = await untracked(() => loader({ params: p, abortSignal: my.signal }));
      if (my !== controller) return;           // 3. устаревший ответ выбрасываем
      state.set({ status: 'resolved', value });
    } catch (error) {
      if (my !== controller) return;
      state.set({ status: 'error', error });
    }
  });
  return state;
}
\`\`\`

1. Функция \`params\` выполняется реактивно, поэтому всё, что она прочитала, становится зависимостью ресурса.
2. Параметры изменились — Angular сначала вызывает \`abort()\` у контроллера прошлой загрузки, затем создаёт новый контроллер и вызывает \`loader\`.
3. \`loader\` вызывается внутри \`untracked\`, поэтому сигналы, прочитанные в нём, **не** становятся зависимостями — перезапуск управляется только \`params\`.
4. Когда \`Promise\` разрешился, Angular проверяет, что этот ответ всё ещё актуален. Если параметры успели смениться, результат молча выбрасывается — так устраняется гонка.
5. Результат раскладывается по сигналам: \`value()\`, \`status()\`, \`error()\`, \`isLoading()\`, \`hasValue()\`.
6. Пока идёт загрузка, ресурс регистрирует «незавершённую задачу» (\`PendingTasks\`), поэтому приложение не считается стабильным — это важно для SSR: сервер дождётся данных, прежде чем отдавать HTML.

### Пример 1. \`linkedSignal\` в короткой форме — сброс при смене источника

\`\`\`ts
import { signal, linkedSignal } from '@angular/core';

const options = signal(['a', 'b', 'c']);
const selected = linkedSignal(() => options()[0]);

console.log(selected()); // a
selected.set('b');       // пользователь выбрал вручную
console.log(selected()); // b
options.set(['x', 'y']); // пришёл новый список
console.log(selected()); // x — ручной выбор сброшен
\`\`\`

Короткая форма — это \`linkedSignal(функция)\`: источником считаются все сигналы, прочитанные внутри функции. Смена источника стирает ручную правку, и это задуманное поведение.

### Пример 2. Полная форма с \`source\` и \`previous\` — сохраняем выбор, пока он валиден

\`\`\`ts
const options = signal(['a', 'b', 'c']);
const selected = linkedSignal<string[], string>({
  source: options,
  computation: (opts, prev) =>
    prev && opts.includes(prev.value) ? prev.value : opts[0],
});

console.log(selected());          // a  (prev = undefined, первый запуск)
selected.set('b');
options.set(['b', 'c', 'd']);     // prev = { source: ['a','b','c'], value: 'b' }
console.log(selected());          // b  — выбор ещё есть в списке, сохранили
options.set(['x', 'y']);
console.log(selected());          // x  — 'b' пропал, взяли первый
\`\`\`

\`prev.value\` — это именно текущее значение сигнала, включая ручную правку \`'b'\`, а не то, что когда-то вернула \`computation\`. Поэтому классическая задача «сохранить выбранную строку таблицы, если она осталась после фильтрации» решается одной функцией.

### Пример 3. Почему не \`signal\` + \`effect\`

\`\`\`ts
// ❌ Синхронизация через effect
const viaEffect = signal(options()[0]);
effect(() => viaEffect.set(options()[0]));

// ✅ linkedSignal
const viaLinked = linkedSignal(() => options()[0]);

options.set(['x', 'y']);
console.log(viaEffect(), viaLinked()); // a x  — effect ещё не успел отработать
// ...после того как Angular выполнил эффекты:
console.log(viaEffect(), viaLinked()); // x x
\`\`\`

Эффекты выполняются не сразу, а по расписанию Angular (во время цикла обновления). Между \`options.set()\` и запуском эффекта есть окно, в котором \`viaEffect\` указывает на город, которого уже нет в списке, — и шаблон может успеть его показать. \`linkedSignal\` пересчитывается синхронно при чтении, такого окна у него нет.

### Пример 4. \`resource()\`: жизненный цикл статусов

\`\`\`ts
import { signal, resource } from '@angular/core';

const userId = signal<number | undefined>(1);

const user = resource({
  params: () => {
    const id = userId();
    return id === undefined ? undefined : { id };
  },
  loader: async ({ params, abortSignal }) => {
    const res = await fetch(\`/api/users/\${params.id}\`, { signal: abortSignal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return (await res.json()) as { id: number; name: string };
  },
});

// сразу после создания:
user.status();    // 'loading'
user.isLoading(); // true
user.value();     // undefined
// ответ пришёл:
user.status();    // 'resolved'
user.value();     // { id: 1, name: 'User 1' }

user.reload();    // true → status 'reloading', value() пока старый пользователь
userId.set(2);    // status 'loading', value() = undefined
userId.set(undefined); // status 'idle', loader не вызывается вообще
\`\`\`

Разница между \`loading\` и \`reloading\` практическая: при \`reload()\` параметры те же, поэтому старое значение остаётся на экране, пока грузится свежее. При смене параметров старое значение относится к другому пользователю — его прячут. Вернуть \`undefined\` из \`params\` — штатный способ сказать «пока не загружай» (например, id ещё не выбран).

### Пример 5. Гонка запросов: медленный ответ не перетирает быстрый

\`\`\`ts
const user = resource({
  params: () => ({ id: userId() }),
  loader: async ({ params, abortSignal }) => {
    console.log('start', params.id);
    abortSignal.addEventListener('abort', () => console.log('abort', params.id));
    await sleep(params.id === 1 ? 300 : 50); // id 1 отвечает медленно
    console.log('finish', params.id);
    return { id: params.id };               // abortSignal намеренно игнорируем
  },
});

userId.set(1);
// через 10 мс:
userId.set(2);
// start 1
// abort 1     ← параметры сменились, прошлой загрузке послан сигнал отмены
// start 2
// finish 2
// finish 1    ← медленный ответ всё равно пришёл: loader не слушал abortSignal
// user.value() → { id: 2 }  — Angular выбросил устаревший результат
\`\`\`

Здесь две разные защиты. Первая — **Angular сам игнорирует устаревшие ответы**, поэтому на экране всегда данные для текущих параметров, даже если \`loader\` про отмену ничего не знает. Вторая — \`abortSignal\`: если пробросить его в \`fetch\`, браузер реально оборвёт запрос, и вы не тратите трафик и ресурсы сервера на ответ, который никто не покажет.

### Пример 6. Ошибка, \`hasValue()\` и шаблон

\`\`\`ts
userId.set(3); // сервер ответил 404
// после ответа:
user.status();          // 'error'
user.error()?.message;  // 'HTTP 404'
user.hasValue();        // false
user.value();           // бросает: Resource is currently in an error state (see Error.cause for details): HTTP 404
\`\`\`

\`\`\`html
@if (user.hasValue()) {
  <h2>{{ user.value().name }}</h2>
} @else if (user.error()) {
  <p class="error">Не удалось загрузить: {{ user.error()?.message }}</p>
} @else if (user.isLoading()) {
  <app-spinner />
}
\`\`\`

В актуальных версиях чтение \`value()\` в состоянии \`error\` бросает исключение (проверено на 21.1). Поэтому в шаблоне сначала проверяют \`hasValue()\` — она безопасна и вдобавок сужает тип: внутри \`@if\` TypeScript знает, что \`value()\` не \`undefined\`.

### \`rxResource\` — тот же ресурс, но загрузчик на RxJS

\`\`\`ts
import { rxResource } from '@angular/core/rxjs-interop';
import { timer, map, finalize } from 'rxjs';

const query = signal('ang');
const results = rxResource({
  params: () => ({ q: query() }),
  defaultValue: [] as string[],
  stream: ({ params }) => timer(100).pipe(
    map(() => [params.q + '-1', params.q + '-2']),
    finalize(() => console.log('finalize', params.q)),
  ),
});

// t=0:   status 'loading', value []   ← defaultValue вместо undefined
// t=20:  query.set('angular')
// finalize ang                         ← старый Observable отписан
// t=40:  status 'loading', value []
// finalize angular                     ← новый поток завершился
// t=190: status 'resolved', value ['angular-1', 'angular-2']
\`\`\`

\`rxResource\` берёт функцию \`stream\`, которая возвращает \`Observable\`. При смене параметров Angular **отписывается** от старого потока — это отмена в терминах RxJS, и \`HttpClient\` при отписке обрывает HTTP-запрос. Опция \`defaultValue\` убирает \`undefined\` из типа: пока данных нет, \`value()\` вернёт пустой массив. В ранних версиях (19.x) функция называлась \`loader\`, в актуальных — \`stream\`.

### \`httpResource\` — сокращение для \`HttpClient\`

\`\`\`ts
import { httpResource } from '@angular/common/http';

const userId = signal(1);
const user = httpResource<User>(() => \`/api/users/\${userId()}\`);
// user.value(), user.status(), user.error(), user.isLoading() — как у resource()
\`\`\`

Функция возвращает URL (или объект запроса с методом, заголовками и параметрами), а запрос делает \`HttpClient\`. Значит, работают интерсепторы (авторизация, логирование) и \`HttpTestingController\` в тестах — то, чего лишён голый \`fetch\`. Вернули \`undefined\` вместо URL — запроса нет.

### Про \`request\` в старых примерах

Код под этим ответом написан в синтаксисе Angular 19.0: \`request: () => ...\` и \`({ request, abortSignal })\` в загрузчике. Позже (в Angular 20) опцию переименовали в \`params\`, а в загрузчик приходит \`{ params, abortSignal, previous }\`. В Angular 21 старое имя ещё принимается в рантайме как скрытый псевдоним, но типы его не знают — TypeScript ответит ошибкой «\`'request' does not exist in type ...\`». В новом коде пишите \`params\`.

### Где это применяется на практике

- **Каскадные фильтры и формы**: страна → город, категория → подкатегория, тариф → опции. Зависимое поле — \`linkedSignal\`, который сбрасывается при смене родительского.
- **Выбранная строка в большой таблице**: после сортировки, фильтрации или подгрузки страницы выбор сохраняется, если строка осталась, иначе сбрасывается — \`linkedSignal\` с \`previous\`.
- **Черновик на основе серверных данных**: форма редактирования инициализируется из \`resource\`, пользователь правит поля, а при переключении на другую запись черновик пересоздаётся.
- **Карточка сущности по id из роута**: \`resource\` или \`httpResource\` с параметром из \`input()\`, привязанного к параметру маршрута; переключение между записями без гонок.
- **Поиск с автодополнением**: \`rxResource\` с \`debounceTime\` внутри \`stream\`, отмена устаревших запросов из коробки.
- **Дашборды**: несколько независимых виджетов, каждый со своим ресурсом и своим статусом загрузки или ошибки, вместо одного общего флага \`loading\`.

## Важные нюансы и подводные камни

- **\`linkedSignal\` не заменяет \`computed\`.** Если писать в состояние не нужно, берите \`computed\` — он проще, и случайно его не испортишь.
- **Ручная правка теряется при смене источника.** Это задуманное поведение, а не баг; логику «сохранить, если можно» пишете вы сами в \`computation\` через \`previous\`.
- **Источник сравнивается по ссылке.** Если сервер каждый раз присылает новый массив с тем же содержимым, \`linkedSignal\` всё равно сбросится. Спасает \`computation\` с проверкой через \`previous\` или источник-\`computed\` с собственной функцией \`equal\`.
- **Тип выводится слишком узко.** \`linkedSignal(() => cond ? 'Minsk' : 'Warsaw')\` получает тип \`'Minsk' | 'Warsaw'\`, и \`set('Brest')\` не скомпилируется. Указывайте тип явно: \`linkedSignal<string>(...)\`.
- **\`resource\` не кэширует.** Вернулись к прошлому id — запрос уйдёт заново. Это не замена полноценному data-слою вроде TanStack Query с кэшем, дедупликацией и инвалидацией.
- **\`abortSignal\` экономит сеть, а не спасает от гонки.** Устаревшие ответы Angular отбрасывает сам; но если не передать \`abortSignal\` в \`fetch\`, ненужный запрос всё равно дойдёт до сервера и вернётся.
- **\`params\` должен читать сигналы синхронно.** Сигнал, прочитанный после \`await\` или внутри \`loader\`, не станет зависимостью — перезагрузки не будет.
- **\`value()\` в состоянии ошибки бросает исключение.** Без проверки \`hasValue()\` шаблон упадёт при первом ответе 500.
- **\`resource\` только для чтения данных.** Документация прямо предупреждает: при смене параметров или уничтожении ресурс отменяет текущую загрузку, и POST или DELETE может оборваться посередине. Мутации делают обычным вызовом сервиса.
- **\`set()\` и \`update()\` переводят ресурс в статус \`local\`** и отменяют идущую загрузку — удобно для оптимистичного обновления, но следующий \`reload()\` или смена параметров перезапишут локальное значение.
- **\`reload()\` в состояниях \`idle\` и \`loading\` ничего не делает** и возвращает \`false\`.
- **Нужен injection-контекст.** \`resource()\` создают в поле класса или конструкторе; в другом месте передайте опцию \`injector\`. Ресурс живёт до уничтожения своего инжектора (\`DestroyRef\`), а вручную его останавливает \`destroy()\`.
- **Разный статус стабильности.** Оба API появились в Angular 19 как экспериментальные. В Angular 21.1 \`linkedSignal\` уже стабилен (с версии 20), а \`resource\`, \`rxResource\` и \`httpResource\` по-прежнему помечены \`@experimental\`: их сигнатуры уже менялись (\`request\` → \`params\`, \`loader\` → \`stream\` в \`rxResource\`).

**Плюсы:** декларативное описание «откуда берутся данные» вместо ручных подписок; статусы, ошибки и отмена устаревших запросов из коробки; естественная интеграция с шаблоном и \`computed\`; ожидание данных при SSR.
**Минусы:** \`resource\` экспериментальный и уже менял API; нет кэша, дедупликации и повторов при ошибке; \`linkedSignal\` легко применить там, где хватило бы \`computed\`, а сброс по ссылке источника иногда удивляет.

## Как это спрашивают на собеседовании

**Главный вывод:** \`linkedSignal\` — производное от источника, но записываемое состояние, которое пересчитывается при смене источника. \`resource()\` — асинхронная загрузка, управляемая сигналами-параметрами: статусы, ошибка и защита от гонок в одном объявлении.

Типичные формулировки: «Зачем нужен \`linkedSignal\`, если есть \`computed\`?», «Как загрузить данные на сигналах без подписок?», «Как \`resource()\` решает проблему гонки запросов?».

Что могут спросить следом:

- *Чем \`linkedSignal\` отличается от \`computed\` + \`effect\`?* — \`computed\` нельзя записать, а \`effect\` синхронизирует с задержкой и создаёт окно несогласованных данных; \`linkedSignal\` пересчитывается синхронно при чтении.
- *Какие статусы у ресурса?* — \`idle\`, \`loading\`, \`reloading\`, \`resolved\`, \`error\`, \`local\`; \`isLoading()\` истинен при \`loading\` и \`reloading\`.
- *Что будет, если загрузчик не использует \`abortSignal\`?* — Устаревший ответ Angular всё равно отбросит, но запрос дойдёт до сервера: лишний трафик и нагрузка.
- *Можно ли через \`resource\` отправлять POST?* — Не стоит: при смене параметров загрузка отменяется, мутация может оборваться. Для записи — обычный вызов сервиса.
- *Чем \`rxResource\` отличается от \`resource\`?* — Загрузчик возвращает \`Observable\` (опция \`stream\`), отмена — это отписка; удобно, когда уже есть сервисы на \`HttpClient\`.

### Ответ на 1 минуту

> \`linkedSignal\` нужен, когда состояние производно от источника, но должно оставаться записываемым: \`computed\` писать не даёт, а обычный сигнал не реагирует на источник. Ему дают \`source\` и \`computation\`, куда приходят новое значение источника и \`previous\` — прошлый источник и текущее значение вместе с ручной правкой, так что я сам решаю, сбросить выбор или сохранить. \`resource()\` — асинхронная загрузка на сигналах: \`params\` читает сигналы-параметры, \`loader\` грузит данные, при смене параметров прошлой загрузке шлётся \`abort\`, а её запоздавший ответ отбрасывается, поэтому гонок нет. Результат — сигналы \`value\`, \`status\`, \`error\`, \`isLoading\`. Нюансы: в ошибке \`value()\` бросает, поэтому проверяю \`hasValue()\`; кэша нет; для мутаций он не подходит. \`linkedSignal\` стабилен с 20-й версии, \`resource\` всё ещё экспериментальный.`,
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
      ru: `## В чём суть

Инжектор в Angular не один: их **два дерева**, и они не параллельные миры, а стыкуются друг с другом. \`ElementInjector\` живёт вместе с DOM-элементами, компонентами и директивами, \`EnvironmentInjector\` — вместе с приложением и участками роутера. Когда компонент просит зависимость, Angular сначала поднимается по первому дереву, а не найдя — переходит во второе.

Аналогия: вам нужен степлер. Сначала спрашиваете у себя на столе, потом у тимлида, потом у его руководителя — это подъём по \`ElementInjector\`. Дошли до верха отдела и не нашли — идёте в общий хозблок здания (\`EnvironmentInjector\` уровня \`root\`), а потом в хозблок всего бизнес-центра (\`platform\`). Нигде нет — вам говорят «такого нет»: ошибка \`NG0201\`.

**Какую проблему решает.** Сервисы бывают двух сортов. Одни должны быть **одни на всё приложение**: авторизация, HTTP-клиент, кэш справочников. Другие — **свои у каждого экземпляра** компонента: состояние конкретной формы, конкретного виджета дашборда, конкретной вкладки. Иерархия инжекторов позволяет выбрать «область жизни» сервиса тем, **где** вы его зарегистрировали, не меняя код самого сервиса. А понимание этих двух деревьев — главный инструмент, когда вы отлаживаете «почему у меня другой экземпляр сервиса» или «почему состояние не общее».

## Словарик терминов

- **DI (Dependency Injection, внедрение зависимостей)** — подход, при котором класс не создаёт свои зависимости сам, а получает готовые извне — от инжектора.
- **Инжектор (Injector)** — объект-«склад»: по ключу отдаёт экземпляр, создаёт его при первом запросе и запоминает.
- **Токен (token)** — ключ, по которому ищется зависимость: класс сервиса или \`InjectionToken\`.
- **Провайдер (provider)** — рецепт «как получить значение для токена»: \`useClass\`, \`useValue\`, \`useFactory\`, \`useExisting\` или просто класс.
- **\`EnvironmentInjector\` (раньше \`ModuleInjector\`)** — инжектор уровня приложения или участка роутера; цепочка корней \`root\` → \`platform\` → \`NullInjector\`.
- **\`ElementInjector\` (во внутреннем коде — \`NodeInjector\`)** — инжектор, привязанный к элементу шаблона, на котором стоит компонент или директива; хранит их \`providers\` и сами экземпляры компонентов и директив.
- **\`root\`** — корневой \`EnvironmentInjector\` приложения: сюда попадают \`providedIn: 'root'\` и \`providers\` из \`bootstrapApplication\`.
- **\`platform\`** — инжектор уровня страницы, общий для всех Angular-приложений, запущенных на ней; выше него только \`NullInjector\`.
- **\`NullInjector\`** — конец цепочки: на любой запрос бросает ошибку \`NG0201\` «No provider found».
- **\`providers\` и \`viewProviders\`** — списки провайдеров в \`@Component\`: первые видны и шаблону компонента, и спроецированному контенту, вторые — только собственному шаблону.
- **Проекция контента (content projection, \`<ng-content>\`)** — вставка разметки, которую родитель положил между тегами компонента, внутрь шаблона этого компонента.
- **Синглтон (singleton)** — единственный экземпляр в пределах инжектора, который его создал.
- **Tree-shaking** — удаление сборщиком неиспользуемого кода; \`providedIn: 'root'\` позволяет выбросить сервис, который никто не инжектит.
- **Lazy loading (ленивая загрузка)** — загрузка участка приложения (роутов, компонентов) только при переходе на него.

## Как это работает под капотом

Как Angular ищет зависимость, проще всего показать упрощённым алгоритмом:

\`\`\`ts
// Упрощённая модель разрешения inject(token) из компонента
function resolve(token: unknown, node: ElementInjectorNode) {
  // 1. Дерево элементов: от текущего элемента к корневому компоненту
  for (let el: ElementInjectorNode | null = node; el; el = el.parent) {
    if (el.has(token)) return el.get(token);      // первое совпадение снизу вверх побеждает
  }
  // 2. Дерево окружения: инжектор, с которым создан компонент (роут или root)
  for (let env: EnvInjector | null = node.environmentInjector; env; env = env.parent) {
    if (env.has(token)) return env.get(token);    // route → root → platform
  }
  // 3. Дошли до NullInjector
  throw new Error(\`NG0201: No provider found for \${String(token)}\`);
}
\`\`\`

По шагам:

1. При старте \`bootstrapApplication\` создаёт (или переиспользует) инжектор \`platform\`, а под ним — корневой \`EnvironmentInjector\` с провайдерами из конфигурации приложения.
2. Роутер для каждого маршрута с \`providers\` или \`loadChildren\` создаёт дочерний \`EnvironmentInjector\`, родителем которого будет инжектор родительского маршрута или \`root\`.
3. При рендеринге каждый элемент, на котором стоит компонент или директива, получает свой узел \`ElementInjector\`. В него попадают \`providers\` и \`viewProviders\` этих компонентов и директив, а также **сами экземпляры** компонентов и директив — их тоже можно инжектить.
4. Вызов \`inject(Token)\` идёт **вверх по \`ElementInjector\`**: от текущего элемента к корневому компоненту. Форма дерева повторяет вложенность шаблонов, а не структуру папок.
5. Не нашли — поиск переходит в \`EnvironmentInjector\` компонента (для компонента из ленивого роута это инжектор роута) и поднимается к \`root\`, затем к \`platform\`.
6. Дошли до \`NullInjector\` — ошибка \`NG0201\`, если зависимость не помечена как необязательная (\`{ optional: true }\` вернёт \`null\`).
7. Каждый инжектор кэширует созданный экземпляр, поэтому сервис — синглтон **в пределах своего инжектора**, а не «вообще».

Схема стыковки двух деревьев:

\`\`\`text
ElementInjector:     <app-leaf> → <app-panel> → <app-root>
                                                    ↓ не нашли — переходим
EnvironmentInjector: инжектор роута → root → platform → NullInjector (NG0201)
\`\`\`

Важная деталь про \`providedIn: 'root'\`: такой сервис никуда заранее не регистрируется. Корневой инжектор, получив запрос, смотрит в метаданные класса, видит «я принадлежу \`root\`» и создаёт экземпляр. Если сервис никто не запросил, ссылки на него нет, и сборщик выбрасывает его из бандла — отсюда tree-shaking.

### Пример 1. Один сервис — несколько экземпляров

\`\`\`ts
let seq = 0;
@Injectable({ providedIn: 'root' })
class CounterService { id = ++seq; }

const LEVEL = new InjectionToken<string>('LEVEL', { providedIn: 'root', factory: () => 'root' });

@Component({ selector: 'app-leaf', template: '' })
class Leaf {
  c = inject(CounterService);
  level = inject(LEVEL);
  constructor() { console.log('leaf: counter', this.c.id, 'level', this.level); }
}

@Component({
  selector: 'app-panel',
  imports: [Leaf],
  template: '<app-leaf/><app-leaf/>',
  providers: [CounterService, { provide: LEVEL, useValue: 'panel' }],
})
class Panel {
  c = inject(CounterService);
  constructor() { console.log('panel: counter', this.c.id); }
}

@Component({ selector: 'app-own', template: '', providers: [CounterService] })
class Own {
  c = inject(CounterService);
  constructor() { console.log('own (providers): counter', this.c.id); }
}

@Component({
  selector: 'app-root',
  imports: [Leaf, Panel, Own],
  template: '<app-leaf/><app-panel/><app-panel/><app-own/><app-own/>',
})
class App {}

// leaf: counter 1 level root
// panel: counter 2
// panel: counter 3
// own (providers): counter 4
// own (providers): counter 5
// leaf: counter 2 level panel
// leaf: counter 2 level panel
// leaf: counter 3 level panel
// leaf: counter 3 level panel
\`\`\`

\`app-leaf\` прямо в корне не нашёл \`CounterService\` ни на одном элементе и получил корневой синглтон №1. Каждая \`app-panel\` со своими \`providers\` создала **свой** экземпляр (№2 и №3), и её дочерние \`app-leaf\` получили экземпляр своей панели. \`app-own\` — то же самое: экземпляр на каждый инстанс компонента. Порядок строк объясняется тем, что Angular сначала создаёт все компоненты шаблона \`app-root\`, а затем — содержимое шаблонов панелей.

### Пример 2. Цепочка \`EnvironmentInjector\`: root → platform → null

\`\`\`ts
const app = await createApplication({ providers: [] });

let inj: any = app.injector; // EnvironmentInjector уровня root
const chain: string[] = [];
while (inj) {
  chain.push(inj.constructor.name + (inj.scopes ? \`[\${[...inj.scopes]}]\` : ''));
  inj = inj.parent; // внутреннее поле, только для отладки
}
console.log(chain.join(' -> '));
// R3Injector[environment,root] -> R3Injector[platform] -> NullInjector
\`\`\`

\`R3Injector\` — внутреннее имя класса, который реализует \`EnvironmentInjector\`. У корневого инжектора две метки области: \`environment\` и \`root\`; над ним — инжектор \`platform\`, а в самом конце — \`NullInjector\`, который ничего не хранит и только бросает ошибку.

### Пример 3. Что показывает ошибка \`NG0201\`

\`\`\`ts
@Injectable() class Missing {}                                   // нигде не зарегистрирован
@Injectable({ providedIn: 'root' }) class Repo { m = inject(Missing); }
@Injectable({ providedIn: 'root' }) class Facade { r = inject(Repo); }

app.injector.get(Facade);
// NG0201: No provider found for \`Missing\`. Source: Environment Injector.
// Path: Facade -> Repo -> Missing.
\`\`\`

Сообщение называет недостающий токен, тип инжектора, где закончился поиск, и **путь** — цепочку зависимостей, которая к нему привела. Если ошибка случилась при поиске из компонента, в тексте будет \`found in NodeInjector\`. В старых версиях Angular то же самое выглядело как \`NullInjectorError: No provider for Missing!\` — эту формулировку до сих пор называют на собеседованиях.

### Пример 4. \`providers\` у маршрута — свой \`EnvironmentInjector\`

\`\`\`ts
@Injectable({ providedIn: 'root' })
class CartService { id = ++seq; }

provideRouter([
  { path: 'a', component: Page },                             // без providers
  { path: 'b', component: Page, providers: [CartService] },   // свой инжектор
  { path: 'c', component: Page, providers: [CartService] },   // ещё один
]);

// Page: inject(CartService), переходы /a → /b → /a → /b → /c
// root cart #1
// Page: cart #1   (/a)
// Page: cart #2   (/b)
// Page: cart #1   (/a)
// Page: cart #2   (/b — тот же инжектор маршрута, экземпляр сохранился)
// Page: cart #3   (/c)
\`\`\`

Любой маршрут с \`providers\` (не только ленивый) получает собственный \`EnvironmentInjector\`, и сервис там — отдельный синглтон, перекрывающий корневой. Инжектор маршрута создаётся один раз и переживает уход со страницы: при возвращении на \`/b\` пришёл тот же экземпляр №2. А компонент, отрисованный в \`<router-outlet>\`, видит ещё и провайдеры компонентов **вокруг** аутлета: в том же эксперименте токен из \`providers\` корневого компонента был доступен странице.

### Пример 5. \`providers\` против \`viewProviders\` и проекция контента

\`\`\`ts
@Component({
  selector: 'app-card',
  template: '<div probe="card-view"></div><ng-content/>',
  providers: [{ provide: T, useValue: 'card-providers' }],
})
class CardProviders {}

@Component({
  selector: 'app-vcard',
  template: '<div probe="vcard-view"></div><ng-content/>',
  viewProviders: [{ provide: T, useValue: 'vcard-viewProviders' }],
})
class CardViewProviders {}

// в шаблоне app-root (у него providers: [{ provide: T, useValue: 'root-cmp' }]):
// <app-card><span probe="projected-into-card"></span></app-card>
// <app-vcard><span probe="projected-into-vcard"></span></app-vcard>

// директива probe делает inject(T):
// [card-view]            card-providers
// [projected-into-card]  card-providers        ← providers видны спроецированному контенту
// [vcard-view]           vcard-viewProviders
// [projected-into-vcard] root-cmp              ← viewProviders НЕ видны, поиск ушёл выше
\`\`\`

Спроецированный контент объявлен в шаблоне **внешнего** компонента и лишь вставлен внутрь карточки. \`viewProviders\` намеренно спрятаны от такого «гостевого» контента: так библиотечный компонент может держать внутренние сервисы приватными и не подсовывать их чужой разметке.

### Как модификаторы меняют обход

Стандартный маршрут «снизу вверх до первого совпадения» можно подправить опциями \`inject()\` (или декораторами в конструкторе):

\`\`\`ts
inject(T, { optional: true });  // не нашли — null вместо NG0201
inject(T, { self: true });      // только текущий элемент, вверх не идти
inject(T, { skipSelf: true });  // начать с родителя, свой элемент пропустить
inject(T, { host: true });      // не выходить за пределы шаблона текущего компонента

// директива на элементе, где другая директива предоставила T = 'same-element':
// default = same-element, self = same-element, skipSelf = root-cmp
\`\`\`

\`self\` и \`host\` не заходят в \`EnvironmentInjector\` вообще; \`skipSelf\` полезен, когда компонент переопределяет сервис, но хочет достучаться до родительского экземпляра.

### Как отладить «не тот экземпляр»

- **Angular DevTools** показывает дерево инжекторов и для выбранного компонента — путь поиска конкретного токена.
- **\`ng.getInjector(элемент)\`** в консоли браузера в dev-режиме возвращает инжектор элемента; \`.get(Token)\` покажет, что реально получит компонент.
- **Сравнение по ссылке**: временно залогируйте экземпляр в двух местах и проверьте \`===\` — два разных объекта сразу укажут на лишний провайдер.

### Где это применяется на практике

- **Глобальные сервисы**: авторизация, \`HttpClient\`, кэш справочников, настройки темы — \`providedIn: 'root'\`, один экземпляр на приложение.
- **Состояние формы или мастера**: сервис-хранилище в \`providers\` компонента формы, чтобы два открытых диалога редактирования не делили один черновик.
- **Виджеты дашборда и вкладки**: каждый виджет со своим сервисом фильтров и загрузки данных; дочерние компоненты виджета получают именно его экземпляр.
- **Feature-области в роутере**: \`providers\` у маршрута раздела «Отчёты» дают отдельный store и сервисы, которые не грузятся, пока пользователь туда не зашёл.
- **Библиотеки компонентов**: внутренние сервисы таблицы или выпадающего списка в \`viewProviders\`, чтобы контент пользователя их не перехватывал.
- **Переопределение для участка дерева**: другой \`API_URL\`, логгер или локаль для одного раздела без правки глобальной конфигурации.

## Важные нюансы и подводные камни

- **\`providers\` в компоненте — экземпляр на каждый компонент.** Поставили туда сервис и удивляетесь, что состояние не общее между двумя экземплярами.
- **Маршрут со своими \`providers\` создаёт новый environment.** И ленивый, и обычный: внутри будет свой экземпляр, а не корневой синглтон. Если сервис ещё и \`providedIn: 'root'\`, у вас тихо окажется два экземпляра.
- **\`providedIn: 'root'\` не значит «побеждает везде».** Локальный провайдер выше по \`ElementInjector\` перекроет его для всего поддерева.
- **\`viewProviders\` не видны спроецированному контенту**, а \`providers\` видны. Перепутаете — директива в \`<ng-content>\` получит чужой экземпляр.
- **Регистрация сервиса в двух environment** — два экземпляра и «мистические» баги состояния: данные записали в один, читаете из другого.
- **Инжектор маршрута живёт долго.** Он не уничтожается при уходе со страницы, поэтому состояние сервиса из \`providers\` маршрута переживёт навигацию — в отличие от сервиса в \`providers\` компонента, который умрёт вместе с компонентом.
- **Компонент в \`<router-outlet>\` видит провайдеры элементов вокруг аутлета.** Это удобно для layout-сервисов, но может неожиданно перекрыть корневой сервис.
- **\`platform\` и \`root\` — разные уровни.** \`root\` — одно приложение, \`platform\` — вся страница; если на ней несколько Angular-приложений (микрофронтенды), общий сервис кладут в \`providedIn: 'platform'\`.
- **\`providedIn: 'any'\` устарел.** Он давал отдельный экземпляр в каждом ленивом модуле; в типах Angular 21 помечен \`@deprecated\`.

**Плюсы:** область жизни сервиса задаётся местом регистрации, без изменения кода; локальное переопределение зависимостей для поддерева; ленивые разделы не тянут свои сервисы в главный бандл.
**Минусы:** два дерева и правила их стыковки легко перепутать; «не тот экземпляр» не даёт ошибки, а проявляется странным поведением; инжекторы маршрутов живут дольше, чем ожидают.

## Как это спрашивают на собеседовании

**Главный вывод:** поиск идёт сначала вверх по \`ElementInjector\` (дерево шаблонов), затем по \`EnvironmentInjector\` (роут → \`root\` → \`platform\`), и побеждает первое совпадение снизу вверх. Где зарегистрировали провайдер — такова и область жизни экземпляра.

Типичные формулировки: «Как устроена иерархия инжекторов?», «Чем \`providers\` в компоненте отличается от \`providedIn: 'root'\`?», «Почему у меня два экземпляра сервиса?».

Что могут спросить следом:

- *Что такое \`NullInjectorError\` / \`NG0201\`?* — Конец цепочки: токен не нашёлся ни в одном инжекторе; в сообщении есть путь зависимостей.
- *Чем \`platform\` отличается от \`root\`?* — \`root\` — одно приложение, \`platform\` — общий для всех приложений на странице.
- *Как \`@Self\` / \`@SkipSelf\` меняют обход?* — \`self\` ищет только на текущем элементе, \`skipSelf\` начинает с родителя.
- *Чем \`viewProviders\` отличаются от \`providers\`?* — Не видны контенту, спроецированному через \`<ng-content>\`.
- *Создаёт ли инжектор обычный, не ленивый маршрут?* — Да, если у него есть \`providers\`.

### Ответ на 1 минуту

> В Angular два дерева инжекторов. \`EnvironmentInjector\`, раньше \`ModuleInjector\`, привязан к приложению и маршрутам: его цепочка — инжектор роута, \`root\`, \`platform\` и \`NullInjector\`, и сервисы там синглтоны в пределах своего инжектора. \`ElementInjector\` привязан к элементам с компонентами и директивами и повторяет вложенность шаблонов: каждый компонент со своими \`providers\` создаёт узел. При \`inject\` поиск идёт вверх по \`ElementInjector\` до корневого компонента, затем переходит в \`EnvironmentInjector\` и поднимается до \`root\` и \`platform\`; не нашли — \`NG0201\`. Побеждает первое совпадение снизу вверх, поэтому \`providers\` в компоненте дают экземпляр на каждый компонент — так я делаю состояние формы. Нюансы: маршрут с \`providers\` создаёт свой environment, а \`viewProviders\` не видны спроецированному контенту.`,
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
      ru: `## В чём суть

По умолчанию Angular ищет зависимость снизу вверх: сначала на текущем элементе, потом у родительских элементов, потом в инжекторах приложения — пока не найдёт. Модификаторы резолвинга меняют **маршрут поиска**: где начать, где остановиться и что делать, если ничего не нашлось. Их четыре: \`@Optional\`, \`@Self\`, \`@SkipSelf\` и \`@Host\`, а в современном коде — одноимённые опции функции \`inject()\`.

Аналогия — снова про степлер. Обычный поиск: смотрю у себя на столе, потом у тимлида, потом выше по этажам. \`@Self\` — «смотрю только на своём столе, чужого не беру». \`@SkipSelf\` — «у себя не смотрю принципиально, сразу иду к руководителю». \`@Host\` — «поднимаюсь, но не выхожу за дверь своего кабинета». \`@Optional\` — «если ни у кого нет, ладно, обойдусь».

**Какую проблему решает.** Стандартный поиск «до первого совпадения» иногда опасен. Директива формы может случайно подцепиться к чужой форме в родительском компоненте. Компонент дерева, который просит «свой» тип, найдёт сам себя и упадёт с циклической зависимостью. Сервис, подключённый дважды, тихо создаст второй экземпляр. Модификаторы позволяют сказать точно: «нужен именно этот уровень», «нужен именно родитель» или «зависимость необязательна».

## Словарик терминов

- **Модификатор резолвинга (resolution modifier)** — пометка на зависимости, которая меняет правила поиска: откуда начинать, где останавливаться, что делать при неудаче.
- **\`ElementInjector\`** — инжектор, привязанный к элементу шаблона; хранит \`providers\` компонентов и директив этого элемента и сами их экземпляры.
- **\`EnvironmentInjector\`** — инжектор уровня приложения или маршрута: цепочка \`route\` → \`root\` → \`platform\` → \`NullInjector\`.
- **\`@Optional\` / \`optional: true\`** — «если не нашли, верни \`null\`», вместо ошибки \`NG0201\`.
- **\`@Self\` / \`self: true\`** — искать только на текущем элементе (или только в текущем инжекторе), вверх не подниматься.
- **\`@SkipSelf\` / \`skipSelf: true\`** — пропустить текущий элемент и начать поиск с родителя.
- **\`@Host\` / \`host: true\`** — подниматься, но не дальше границы шаблона, в котором объявлен элемент; на самой границе видны только \`viewProviders\` компонента-хоста и он сам.
- **Компонент-хост (host component)** — компонент, в чьём шаблоне написан элемент с директивой; его тег — граница для \`@Host\`.
- **\`viewProviders\`** — провайдеры компонента, видимые только его собственному шаблону, но не спроецированному контенту.
- **Декоратор параметра (parameter decorator)** — аннотация вроде \`@Optional()\` перед параметром конструктора; старый способ задать модификатор.
- **\`InjectOptions\`** — объект опций второго аргумента \`inject(token, { optional, self, skipSelf, host })\`.
- **\`NgControl\` / \`ControlContainer\`** — абстракции Angular Forms: первая — «директива поля» (\`ngModel\`, \`formControl\`), вторая — «контейнер полей» (\`ngForm\`, \`formGroup\`).
- **\`NG0201\` / \`NG0200\`** — коды ошибок: «провайдер не найден» и «циклическая зависимость».

## Как это работает под капотом

Модификаторы — это флаги, которые Angular передаёт в алгоритм поиска. Упрощённо он выглядит так:

\`\`\`ts
// Упрощённая модель поиска с модификаторами
function lookup(token, el, { optional = false, self = false, skipSelf = false, host = false }) {
  let node = skipSelf ? el.parent : el;                  // skipSelf: стартуем с родителя
  while (node) {
    const atBoundary = host && node === el.hostOfDeclaringTemplate;
    const found = atBoundary
      ? node.findInViewProvidersOrHostComponent(token)   // на границе — только viewProviders и сам хост
      : node.find(token);
    if (found !== NOT_FOUND) return found;
    if (self || atBoundary) break;                       // self — один узел, host — до границы
    node = node.parent;
  }
  if (!self && !host) {
    const fromEnv = el.environmentInjector.find(token);  // route → root → platform
    if (fromEnv !== NOT_FOUND) return fromEnv;
  }
  if (optional) return null;                             // optional: null вместо ошибки
  throw new Error('NG0201: No provider found');
}
\`\`\`

Что происходит по шагам:

1. Без модификаторов поиск идёт от текущего элемента вверх по \`ElementInjector\`, затем в \`EnvironmentInjector\` и до \`NullInjector\`.
2. \`skipSelf\` только сдвигает **точку старта** на родителя, дальше обычный подъём.
3. \`self\` и \`host\` задают **точку остановки**: \`self\` — сразу после первого узла, \`host\` — на теге компонента, в чьём шаблоне объявлен элемент. Оба не заходят в \`EnvironmentInjector\`, поэтому \`providedIn: 'root'\` с ними не найдётся.
4. \`optional\` срабатывает в самом конце: если поиск ничего не дал, вместо исключения возвращается \`null\`.
5. Модификаторы комбинируются: \`skipSelf + optional\` — «есть ли такой у родителя?», \`self + optional\` — «есть ли такой прямо на мне?».
6. Если вызывать \`inject()\` в \`EnvironmentInjector\` (в сервисе), «элементом» становится сам инжектор: \`self\` — только он, \`skipSelf\` — начать с родительского инжектора, а \`host\` там ни на что не влияет.

### \`optional\` — \`null\` вместо ошибки

\`\`\`ts
const ANALYTICS = new InjectionToken<Analytics>('ANALYTICS');

const analytics = inject(ANALYTICS, { optional: true }); // тип: Analytics | null
analytics?.track('page_view');                           // провайдера нет → null, ничего не падает

// без optional:
inject(ANALYTICS); // NG0201: No provider found for \`InjectionToken ANALYTICS\`.
\`\`\`

TypeScript-перегрузка \`inject()\` сама добавляет \`| null\` к типу, когда передан \`optional: true\`, — забыть проверку не получится. Применяют для необязательных интеграций: аналитики, фич-флагов, конфигурации, которую приложение может не задать.

### \`self\` — только текущий элемент

\`\`\`ts
@Component({ selector: 'app-rating', template: '{{ value() }}★' })
class Rating implements ControlValueAccessor {
  private ngControl = inject(NgControl, { self: true, optional: true });
  value = signal(0);
  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
    console.log('ngControl on same element =', this.ngControl?.constructor.name ?? null);
  }
  writeValue(v: number) { this.value.set(v ?? 0); }
  registerOnChange() {}
  registerOnTouched() {}
}

// <app-rating [formControl]="rating"/>  <app-rating/>
// ngControl on same element = FormControlDirective
// ngControl on same element = null
\`\`\`

Директива \`formControl\` стоит **на том же элементе**, что и наш компонент, поэтому \`self\` её находит. У второго \`<app-rating>\` директивы формы нет — без \`self\` поиск ушёл бы вверх и мог бы найти чужой \`NgControl\` у родительского поля. Без \`optional\` второй случай упал бы с ошибкой: \`NG0201: No provider for NgControl found in NodeInjector\`. Так же устроен сам \`ngModel\`: валидаторы (\`NG_VALIDATORS\`) он берёт с \`@Self()\` — только от директив \`required\`, \`minlength\` и других на том же \`<input>\`.

### \`skipSelf\` — найти родителя, а не себя

\`\`\`ts
@Component({
  selector: 'app-tree-node',
  template: \`{{ name() }}
    @for (c of children(); track c.name) {
      <app-tree-node [name]="c.name" [children]="c.children ?? []"/>
    }\`,
})
class TreeNode {
  name = input('');
  children = input<{ name: string; children?: any[] }[]>([]);
  parent = inject(TreeNode, { skipSelf: true, optional: true });
  depth: number = this.parent ? this.parent.depth + 1 : 0;
  ngOnInit() {
    console.log(\`\${'  '.repeat(this.depth)}\${this.name()} (depth \${this.depth}, parent: \${this.parent?.name() ?? 'none'})\`);
  }
}

// src (depth 0, parent: none)
//   app (depth 1, parent: src)
//     core (depth 2, parent: app)
//   assets (depth 1, parent: src)
\`\`\`

Компонент сам лежит в своём \`ElementInjector\`, поэтому \`inject(TreeNode)\` без \`skipSelf\` вернул бы… самого себя, ещё не созданного: Angular ответит \`NG0200: Circular dependency detected for TreeNode\`. \`skipSelf\` пропускает собственный элемент и находит ближайшего предка того же типа, а \`optional\` нужен корневому узлу, у которого родителя нет.

### \`skipSelf\` + \`optional\` — защита от двойного подключения

\`\`\`ts
// Классика NgModule-эпохи
@NgModule({})
class CoreModule {
  constructor(@Optional() @SkipSelf() parent?: CoreModule) {
    console.log('CoreModule ctor, parent =', parent ? 'found' : 'null');
    if (parent) throw new Error('CoreModule is already loaded. Import it only in the root.');
  }
}
// root:      CoreModule ctor, parent = null
// lazy env:  CoreModule ctor, parent = found → Error: CoreModule is already loaded...

// Тот же приём в standalone-мире
const ANALYTICS_GUARD = new InjectionToken<boolean>('ANALYTICS_GUARD');
export function provideAnalytics() {
  return makeEnvironmentProviders([
    { provide: ANALYTICS_GUARD, useValue: true },
    provideEnvironmentInitializer(() => {
      if (inject(ANALYTICS_GUARD, { skipSelf: true, optional: true })) {
        throw new Error('provideAnalytics() called twice');
      }
    }),
  ]);
}
// provideAnalytics() в root и ещё раз в providers маршрута → Error: provideAnalytics() called twice
\`\`\`

\`skipSelf\` смотрит в родительский инжектор: если там уже есть такой же модуль (или маркер-токен), значит, его подключили повторно в дочернем инжекторе — например, в ленивом маршруте. Без проверки получились бы два экземпляра «глобальных» сервисов и состояние, которое внезапно перестало быть общим. \`optional\` нужен, чтобы первое, законное подключение в корне не падало.

### \`host\` — не выходить за пределы своего шаблона

Директива \`probe\` делает \`inject(T, { host: true, optional: true })\`; результаты из реального запуска:

\`\`\`ts
// app-root: providers: [{ provide: T, useValue: 'root-cmp' }]
// app-card: providers: [...'card-providers'],     шаблон: <div probe="card-view"> + <ng-content/>
// app-vcard: viewProviders: [...'vcard-viewProviders'], шаблон: <div probe="vcard-view"> + <ng-content/>

// [root-view]            host = null                 ← providers хоста за границей не видны
// [card-view]            host = null                 ← то же: providers у app-card
// [vcard-view]           host = vcard-viewProviders  ← viewProviders хоста видны
// [projected-into-card]  host = card-providers       ← app-card — обычный предок внутри шаблона app-root
// [projected-into-vcard] host = null                 ← viewProviders чужого шаблона не видны
\`\`\`

Граница для \`host\` — тег компонента, **в чьём шаблоне написан элемент**. Для спроецированного контента это внешний компонент, который этот контент написал, а не тот, в который его вставили. На самой границе Angular смотрит только \`viewProviders\` компонента-хоста и сам экземпляр хоста (например, \`inject(Wrapper, { host: true })\` из директивы в шаблоне \`Wrapper\` его находит), а обычные \`providers\` хоста — нет. Это частая ошибка: «положил сервис в \`providers\`, а \`@Host\` его не видит».

### Зачем \`@Host\` в реальной жизни: формы

\`\`\`ts
// Внутри Angular Forms:  NgModel → @Optional() @Host() parent: ControlContainer
@Component({
  selector: 'app-address',
  imports: [FormsModule],
  template: '<input name="city" [(ngModel)]="city">',
})
class Address { city = 'Minsk'; }

@Component({
  selector: 'app-address-fixed',
  imports: [FormsModule],
  template: '<input name="street" [(ngModel)]="street">',
  viewProviders: [{ provide: ControlContainer, useFactory: () => inject(ControlContainer, { skipSelf: true }) }],
})
class AddressFixed { street = 'Lenina'; }

// <form #f="ngForm">
//   <input name="name" [(ngModel)]="name">
//   <app-address/> <app-address-fixed/>
// </form>
console.log(JSON.stringify(f.value)); // {"name":"Anton","street":"Lenina"}
\`\`\`

\`ngModel\` ищет форму с \`@Host\`, поэтому поле \`city\` внутри \`app-address\` **не** зарегистрировалось в родительской форме: граница шаблона \`app-address\` его остановила. Это защита от случайной регистрации в чужой форме. Когда же связь нужна, компонент кладёт в \`viewProviders\` «перекидку» на родительский \`ControlContainer\` — на границе \`@Host\` как раз видит \`viewProviders\`, и поле \`street\` попало в форму.

### Декораторы и опции \`inject()\` — один механизм

\`\`\`ts
// Декораторы в конструкторе (классический стиль)
constructor(
  @Optional() @SkipSelf() parent: TreeNode | null,
  @Self() ngControl: NgControl,
  @Host() @Optional() form: ControlContainer | null,
) {}

// То же через inject() (современный стиль)
parent    = inject(TreeNode, { skipSelf: true, optional: true });
ngControl = inject(NgControl, { self: true });
form      = inject(ControlContainer, { host: true, optional: true });
\`\`\`

Под капотом обе записи превращаются в одни и те же битовые флаги поиска. Опции \`inject()\` лучше типизируются (\`optional\` автоматически даёт \`| null\`), работают в полях, фабриках и функциональных гардах, где декораторов параметров нет вообще.

### Где это применяется на практике

- **Кастомные контролы форм** (\`ControlValueAccessor\`): \`inject(NgControl, { self: true, optional: true })\`, чтобы получить директиву формы именно со своего элемента.
- **Вложенные формы**: компоненты-секции адреса, паспорта, реквизитов, которые регистрируют свои поля в родительской форме через \`viewProviders\` с \`ControlContainer\`.
- **Рекурсивные структуры**: деревья файлов, меню, вложенные комментарии — \`skipSelf\` для доступа к родительскому узлу.
- **Составные компоненты** вроде вкладок или аккордеона: дочерняя вкладка находит свой контейнер через \`inject(Tabs)\`, а \`host\` или \`optional\` защищают от использования вне контейнера.
- **Библиотеки и \`provideX()\`-функции**: защита от повторного подключения через \`skipSelf + optional\`.
- **Необязательные интеграции**: аналитика, логирование, фич-флаги через \`optional\`.

## Важные нюансы и подводные камни

- **\`self\` без \`optional\`** падает с \`NG0201\`, если провайдера нет на текущем элементе, — почти всегда их берут в паре.
- **\`skipSelf\` тоже может ничего не найти.** Если выше никто не предоставил токен (корень дерева, корневой инжектор), будет ошибка — отсюда пара \`skipSelf + optional\`.
- **\`host\` путают с \`self\`.** \`self\` — ровно один узел; \`host\` — подъём, но не дальше тега компонента, в чьём шаблоне объявлен элемент.
- **\`host\` не видит \`providers\` хоста**, только его \`viewProviders\` и сам экземпляр хоста. Положили сервис не в тот список — получите \`null\` или ошибку.
- **\`host\` и \`ng-content\`.** Для спроецированного контента граница — внешний компонент, написавший разметку; без \`host\` поиск уйдёт ещё выше, вплоть до \`root\`, и может подхватить чужой экземпляр.
- **\`self\` и \`host\` не доходят до \`EnvironmentInjector\`.** \`inject(HttpClient, { self: true })\` из компонента вернёт ошибку, хотя \`HttpClient\` есть в \`root\`.
- **Компонент, инжектящий собственный класс без \`skipSelf\`,** получает \`NG0200: Circular dependency\`.
- **Смешивать декораторы и опции \`inject\` в одном классе можно**, но лучше выбрать один стиль: декораторы параметров не работают в полях, фабриках и функциях.

**Плюсы:** точный контроль над тем, какой экземпляр вы получаете; защита от случайного захвата «чужих» сервисов; явная необязательность зависимостей вместо \`try/catch\`.
**Минусы:** правила \`host\` неочевидны (граница шаблона, только \`viewProviders\`); ошибки проявляются как \`null\` или «не тот экземпляр»; чрезмерное использование делает DI-граф трудным для понимания.

## Как это спрашивают на собеседовании

**Главный вывод:** \`optional\` решает, что делать при неудаче (\`null\` вместо ошибки), \`skipSelf\` — где начать (с родителя), \`self\` и \`host\` — где остановиться (на текущем элементе или на границе своего шаблона). Все комбинируются и в современном коде пишутся опциями \`inject()\`.

Типичные формулировки: «Что делают \`@Self\`, \`@SkipSelf\`, \`@Optional\`, \`@Host\`?», «Зачем \`@Optional() @SkipSelf()\` в конструкторе модуля?», «Чем \`@Host\` отличается от \`@Self\`?».

Что могут спросить следом:

- *Как это ложится на два дерева инжекторов?* — \`skipSelf\` и \`optional\` работают в обоих; \`self\` и \`host\` с элемента не заходят в \`EnvironmentInjector\`.
- *Где \`@Host\` используется в самом Angular?* — В формах: \`NgModel\` ищет \`ControlContainer\` с \`@Host\`, чтобы не зарегистрироваться в форме родительского компонента.
- *Почему компонент не может просто \`inject\` свой же класс?* — Найдёт сам себя на своём элементе и упадёт с \`NG0200\`; нужен \`skipSelf\`.
- *Что вернёт \`inject(X, { optional: true })\` по типу?* — \`X | null\`.

### Ответ на 1 минуту

> Модификаторы резолвинга управляют маршрутом поиска зависимости. \`optional\` превращает отсутствие провайдера из ошибки \`NG0201\` в \`null\`. \`self\` ищет только на текущем элементе — так кастомный контрол формы берёт \`NgControl\` со своего тега. \`skipSelf\` пропускает свой элемент и начинает с родителя: так рекурсивный компонент дерева находит родительский узел, а \`skipSelf\` с \`optional\` ловит повторное подключение модуля или \`provideX()\`. \`host\` поднимается, но не дальше тега компонента, в чьём шаблоне объявлен элемент, причём на границе видит только \`viewProviders\` хоста — на этом построены формы: \`ngModel\` не цепляется к чужой форме. \`self\` и \`host\` не заходят в \`EnvironmentInjector\`. Всё это комбинируется, и сейчас я пишу их опциями \`inject()\`, а не декораторами.`,
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
      ru: `## В чём суть

\`inject()\` — это функция, которая достаёт зависимость из текущего **injection-контекста**, не объявляя её параметром конструктора. Вы пишете \`private http = inject(HttpClient)\` прямо в поле класса — и всё. В современном Angular это рекомендованный стиль, а многие новые API (\`toSignal\`, \`takeUntilDestroyed\`, \`resource\`, функциональные гарды) без него просто не существовали бы.

Аналогия: конструктор — это заказ по списку, который вы обязаны отдать курьеру целиком и заранее, а каждый наследник обязан этот список ещё и переписать в свой \`super(...)\`. \`inject()\` — торговый автомат в коридоре: подошёл, когда нужно, нажал кнопку, получил. Но автомат работает только внутри здания и только в рабочие часы — вне «контекста» кнопка выдаёт ошибку.

**Какую проблему решает.** Инъекция через конструктор привязана к классу: её нельзя вынести в обычную функцию, а при наследовании приходится протаскивать зависимости родителя через \`super(...)\` в каждом потомке. Любая новая зависимость базового класса ломает всех наследников. Вдобавок длинные конструкторы с \`private\`-параметрами плохо дружат с инициализаторами полей в современном TypeScript. \`inject()\` убирает эти проблемы и позволяет собирать переиспользуемые «кирпичики» логики из функций.

## Словарик терминов

- **DI (Dependency Injection)** — механизм, при котором класс получает зависимости от инжектора, а не создаёт их сам.
- **Инъекция через конструктор (constructor injection)** — классический способ: зависимости перечисляются параметрами конструктора, Angular передаёт их при создании.
- **\`inject(token, options?)\`** — функция из \`@angular/core\`, которая возвращает зависимость из текущего инжектора; опции — \`optional\`, \`self\`, \`skipSelf\`, \`host\`.
- **Injection-контекст (injection context)** — промежуток времени, когда Angular знает «текущий инжектор»: создание класса через DI, выполнение фабрики провайдера, функции внутри \`runInInjectionContext\`.
- **Инициализатор поля (field initializer)** — выражение справа от \`=\` в объявлении поля класса; выполняется при создании объекта, до тела конструктора.
- **\`runInInjectionContext(injector, fn)\`** — выполняет функцию так, будто она вызвана при создании класса этим инжектором; внутри работает \`inject()\`.
- **\`assertInInjectionContext(fn)\`** — проверка в начале своих хелперов: бросает понятную ошибку \`NG0203\`, если вызов сделан вне контекста.
- **\`NG0203\`** — код ошибки «\`inject()\` вызван вне injection-контекста».
- **\`inject*\`-хелпер** — ваша функция вида \`injectRouteParam('id')\`, которая внутри вызывает \`inject()\` и возвращает готовый результат; вызывается в поле класса.
- **Функциональный гард, резолвер, интерсептор** — обычные функции вместо классов в роутере и \`HttpClient\`; Angular вызывает их в injection-контексте.
- **\`HostAttributeToken\`** — токен для чтения статического атрибута элемента-хоста через \`inject()\`; замена декоратора \`@Attribute\`.
- **\`TestBed\`** — тестовое окружение Angular; создаёт классы через DI, поэтому \`inject()\` в них работает.

## Как это работает под капотом

Секрет \`inject()\` — в глобальной переменной «текущий инжектор». Упрощённо:

\`\`\`ts
// Упрощённая модель inject() и injection-контекста
let currentInjector: Injector | undefined;   // глобальная "ячейка" контекста

export function inject<T>(token: ProviderToken<T>, options?: InjectOptions): T {
  if (!currentInjector) {
    throw new Error('NG0203: inject() must be called from an injection context');
  }
  return currentInjector.get(token, undefined, options);
}

export function runInInjectionContext<T>(injector: Injector, fn: () => T): T {
  const prev = currentInjector;
  currentInjector = injector;     // 1. открыли контекст
  try {
    return fn();                  // 2. всё, что fn вызовет синхронно, видит инжектор
  } finally {
    currentInjector = prev;       // 3. закрыли контекст
  }
}

// Так Angular создаёт ваш класс:
const service = runInInjectionContext(injector, () => new UserService());
\`\`\`

По шагам:

1. Когда Angular создаёт сервис, компонент или директиву, он записывает нужный инжектор в «ячейку контекста» и только потом вызывает \`new\`.
2. Поэтому всё, что выполняется **синхронно** во время создания объекта — инициализаторы полей и тело конструктора, — видит инжектор, и \`inject()\` работает.
3. Как только \`new\` завершился, ячейка очищается (или восстанавливается прежнее значение).
4. Колбэк \`setTimeout\`, \`.then()\`, обработчик клика, метод \`ngOnInit\` выполняются **позже**, когда ячейка уже пуста, — отсюда \`NG0203\`.
5. Тот же приём Angular использует для фабрик провайдеров (\`useFactory\`, \`factory\` в \`InjectionToken\`), функциональных гардов, резолверов, интерсепторов и инициализаторов приложения — все они вызываются внутри контекста.
6. Если зависимость нужна позже, вы заранее сохраняете \`Injector\` в поле и сами открываете контекст через \`runInInjectionContext\`.

Отсюда понятно, почему \`inject()\` можно вынести в обычную функцию: функции всё равно, откуда её вызвали, лишь бы в момент вызова ячейка контекста была заполнена.

### Пример 1. Где работает, а где нет

\`\`\`ts
@Injectable({ providedIn: 'root' })
class UserService {
  private foo = inject(Foo);              // ✅ инициализатор поля
  private injector = inject(Injector);    // ✅ сохраняем инжектор на потом

  constructor() {
    console.log('ctor:', this.foo.name);  // ✅ тело конструктора
    setTimeout(() => inject(Foo));        // ❌ NG0203 — колбэк выполнится позже
    Promise.resolve().then(() => inject(Foo)); // ❌ NG0203 — даже микрозадача уже вне контекста
  }

  later() {
    // inject(Foo);                       // ❌ NG0203 — обычный метод
    const f = runInInjectionContext(this.injector, () => inject(Foo)); // ✅
    console.log('later():', f.name);
  }
}

// ctor: Foo
// NG0203: The \`Foo\` token injection failed. \`inject()\` function must be called from an
// injection context such as a constructor, a factory function, a field initializer,
// or a function used with \`runInInjectionContext\`.
// later(): Foo
\`\`\`

Контекст существует только синхронно, пока объект создаётся. Даже \`Promise.resolve().then(...)\` — уже «после», хотя выполняется почти сразу. Сообщение об ошибке само перечисляет допустимые места.

### Пример 2. Меньше шаблонного кода и наследование без \`super(...)\`

\`\`\`ts
// Было: конструкторы и проброс зависимостей
abstract class BasePageOld {
  constructor(protected logger: Logger, protected api: Api) {}
}
class UserPageOld extends BasePageOld {
  constructor(logger: Logger, api: Api, private route: ActivatedRoute) {
    super(logger, api);                   // каждый наследник повторяет список родителя
  }
}

// Стало: inject() в полях
abstract class BasePage {
  protected logger = inject(Logger);
  protected api = inject(Api);
}

@Component({ selector: 'app-user', template: 'user {{ id() }}' })
class UserPage extends BasePage {        // конструктор не нужен вовсе
  id = injectRouteParam('id');
  ngOnInit() { this.logger.log(this.api.get('/users/' + this.id())); }
}
// переход на /users/42:
// [log] GET /users/42
\`\`\`

Добавили базовому классу новую зависимость — ни один наследник не меняется. Обратите внимание: базовому классу с одними лишь \`inject()\` в полях не нужен даже декоратор, Angular создаёт наследника через DI, и инициализаторы полей родителя выполняются в том же контексте.

### Пример 3. Переиспользуемый \`inject*\`-хелпер

\`\`\`ts
export function injectRouteParam(name: string) {
  assertInInjectionContext(injectRouteParam);        // понятная ошибка при неправильном вызове
  const route = inject(ActivatedRoute);
  return toSignal(route.paramMap.pipe(map(p => p.get(name))), { initialValue: null });
}

// в любом компоненте маршрута:
id = injectRouteParam('id');  // Signal<string | null>

// вызов вне контекста:
injectRouteParam('id');
// NG0203: injectRouteParam() can only be used within an injection context such as a constructor,
// a factory function, a field initializer, or a function used with \`runInInjectionContext\`.
\`\`\`

С конструктором такое невозможно в принципе: функция не может «попросить» Angular добавить параметр в чужой конструктор. Хелпер прячет внутри и \`inject\`, и подписку, и её автоматическую отписку (\`toSignal\` сам отпишется при уничтожении компонента). \`assertInInjectionContext\` делает ошибку самодокументируемой — в сообщении стоит имя вашей функции.

### Пример 4. Опции вместо декораторов параметров

\`\`\`ts
// Было
constructor(
  @Optional() private analytics: Analytics | null,
  @Self() @Optional() private ngControl: NgControl | null,
  @Attribute('type') private type: string,
) {}

// Стало
private analytics = inject(Analytics, { optional: true });             // тип: Analytics | null
private ngControl = inject(NgControl, { self: true, optional: true });
type = inject(new HostAttributeToken('type'), { optional: true }) ?? 'button';

// <app-btn type="submit">Save</app-btn>  <app-btn>Cancel</app-btn>
// btn type = submit
// btn type = button
\`\`\`

Перегрузки \`inject()\` сами добавляют \`| null\` к типу при \`optional: true\`, поэтому TypeScript не даст забыть проверку. \`HostAttributeToken\` читает статический атрибут хост-элемента один раз при создании — дешевле, чем \`input()\`, когда значение никогда не меняется.

### Пример 5. Ловушка порядка полей и почему \`inject()\` её снимает

\`\`\`ts
class Svc { value = 21; }

export class A {
  doubled = this.svc.value * 2;        // TS2729: Property 'svc' is used before its initialization
  constructor(private svc: Svc) {}
}
// Если всё же собрать: TypeError: Cannot read properties of undefined (reading 'value')

export class B {
  private svc = inject(Svc);           // ✅ сначала зависимость…
  doubled = this.svc.value * 2;        // …потом поле, которое её использует
}
\`\`\`

При современной настройке TypeScript (\`target: ES2022\`, где \`useDefineForClassFields\` по умолчанию \`true\`) поля класса инициализируются **до** того, как параметры-свойства конструктора присвоены. Поле, читающее зависимость из конструктора, видит \`undefined\`. С \`inject()\` всё — и зависимости, и производные поля — живёт в одном списке полей и выполняется сверху вниз, но порядок по-прежнему важен: объявите \`doubled\` выше \`svc\` — получите ту же ошибку.

### Пример 6. Другие функции, которым нужен контекст

\`\`\`ts
// В поле или конструкторе — работают:
destroyRef = inject(DestroyRef);
data = toSignal(this.http.get<User[]>('/api/users'));
constructor() {
  interval(1000).pipe(takeUntilDestroyed()).subscribe();
  effect(() => console.log(this.data()));
}

// В обычном методе — та же ошибка NG0203:
// effect() can only be used within an injection context ...
// toSignal() can only be used within an injection context ...
// takeUntilDestroyed() can only be used within an injection context ...

// Решение: передать инжектор или DestroyRef явно
loadLater() {
  effect(() => console.log(this.data()), { injector: this.injector });
  interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
}
\`\`\`

Все эти API внутри вызывают \`inject()\` (чтобы найти \`DestroyRef\`, планировщик и т. д.), поэтому подчиняются тем же правилам. Почти у каждого есть «запасной вход» — опция \`injector\` или аргумент \`destroyRef\` для вызова вне контекста. И ещё одно: колбэк самого \`effect\` выполняется **не** в контексте — \`inject()\` внутри него тоже даст \`NG0203\`; зависимости берите в поля заранее.

### Пример 7. Функциональные гарды и фабрики — контекст уже открыт

\`\`\`ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const authInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { Authorization: \`Bearer \${inject(AuthService).token()}\` } }));

providers: [
  { provide: 'cfg', useFactory: () => inject(Foo).name + '-cfg' },  // → 'Foo-cfg'
  provideAppInitializer(() => inject(ConfigService).load()),
]
\`\`\`

Роутер, \`HttpClient\` и инжектор сами вызывают эти функции внутри \`runInInjectionContext\`. Именно благодаря \`inject()\` классовые гарды и интерсепторы смогли превратиться в короткие функции: раньше единственным способом получить зависимость был конструктор класса.

### Где это применяется на практике

- **Все новые компоненты и сервисы**: поля \`inject()\` вместо конструкторов — стандарт в современном Angular; для старого кода есть автоматическая миграция \`ng generate @angular/core:inject\`.
- **Базовые классы** для страниц, таблиц, форм в enterprise-приложениях: общие зависимости в полях базы, наследники без \`super(...)\`.
- **Библиотеки хелперов**: \`injectRouteParam\`, \`injectQueryParams\`, \`injectWindowSize\`, \`injectDestroy\` — маленькие функции, собирающие подписки и сигналы.
- **Функциональные гарды, резолверы и интерсепторы** в роутере и HTTP-слое.
- **Фабрики токенов** и \`provideX()\`-функции для конфигурации фич.
- **Отложенные действия**: динамическое создание компонентов, \`effect\` или \`toSignal\` после пользовательского события — с сохранённым \`Injector\` и \`runInInjectionContext\` или опцией \`injector\`.

## Важные нюансы и подводные камни

- **\`inject()\` в \`ngOnInit\`, обработчике события или колбэке** — \`NG0203\`. Работают только поля, конструктор, фабрики и явный \`runInInjectionContext\`.
- **\`inject()\` внутри колбэка \`effect\`** без сохранённого инжектора — та же ошибка: эффект создаётся в контексте, но выполняется вне его.
- **Порядок инициализации полей важен**: поле, использующее зависимость, должно стоять ниже поля с \`inject()\`. С конструкторными параметрами при современном TypeScript поле их вообще не увидит (\`TS2729\`).
- **Тестирование**: класс с \`inject()\` в полях нельзя создать простым \`new Service()\` — создавайте через \`TestBed.inject(Service)\` или \`TestBed.runInInjectionContext(() => new Service())\`.
- **Не путайте с \`inject()\` из \`@angular/core/testing\`.** Это старая функция для тестов с другой сигнатурой \`inject([Token], (dep) => ...)\`; IDE легко подставит не тот импорт.
- **Асинхронность ломает контекст.** Внутри \`async\`-функции \`inject()\` работает только до первого \`await\`.
- **Хелперы скрывают зависимости.** \`injectSomething()\` удобен, но по сигнатуре класса уже не видно, что ему нужно; держите хелперы маленькими и с говорящими именами.
- **Конструктор не запрещён.** Оба стиля работают и даже смешиваются в одном классе, но новый код и официальные примеры используют \`inject()\`.

**Плюсы:** нет шаблонных конструкторов; наследование без проброса зависимостей; переиспользуемые функции-хелперы; типизированные опции; естественная работа с функциональными гардами, интерсепторами и сигнальными API.
**Минусы:** жёсткое ограничение injection-контекстом и ошибка \`NG0203\` в неожиданных местах; зависимости менее заметны, чем в конструкторе; для тестов нужен \`TestBed\` или явный контекст.

## Как это спрашивают на собеседовании

**Главный вывод:** \`inject()\` берёт зависимость из «текущего инжектора», который Angular выставляет на время создания класса и выполнения фабрик. Поэтому он работает в полях, конструкторе, фабриках, гардах и \`runInInjectionContext\`, а в колбэках и хуках даёт \`NG0203\`. Выигрыш — меньше кода, наследование без \`super\` и переиспользуемые функции.

Типичные формулировки: «Чем \`inject()\` лучше конструктора?», «Где можно вызывать \`inject()\`?», «Что такое injection-контекст и ошибка \`NG0203\`?».

Что могут спросить следом:

- *Как вызвать \`inject()\` позже, например по клику?* — Заранее сохранить \`Injector\` в поле и вызвать \`runInInjectionContext(injector, fn)\`, либо передать \`injector\` в опции API.
- *Почему функциональные гарды смогли заменить классовые?* — Роутер вызывает функцию в injection-контексте, и \`inject()\` даёт ей доступ к сервисам без класса и конструктора.
- *Как протестировать сервис с \`inject()\` в полях?* — Через \`TestBed.inject\` или \`TestBed.runInInjectionContext\`.
- *Работает ли \`inject()\` после \`await\`?* — Нет, контекст синхронный.

### Ответ на 1 минуту

> \`inject()\` получает зависимость из текущего injection-контекста без параметра в конструкторе. Устроено просто: пока Angular создаёт класс или вызывает фабрику, он держит в глобальной ячейке текущий инжектор, и \`inject\` из него читает. Отсюда и плюсы: нет шаблонных конструкторов, наследники не пробрасывают зависимости через \`super\`, а инъекцию можно вынести в функции вроде \`injectRouteParam\` — на этом построены \`toSignal\`, \`takeUntilDestroyed\` и функциональные гарды. Опции вроде \`optional\` передаются объектом и сразу дают тип с \`null\`. Ограничение: вызывать можно только синхронно в полях, конструкторе, фабриках, гардах, интерсепторах или внутри \`runInInjectionContext\`. В \`ngOnInit\`, \`setTimeout\`, после \`await\` или в колбэке \`effect\` будет \`NG0203\` — тогда я заранее сохраняю \`Injector\` и открываю контекст вручную.`,
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
      ru: `## В чём суть

Хуки жизненного цикла — это заранее оговорённые моменты, когда Angular даёт вам слово: «объект создан», «входы пришли», «чужой контент вставлен», «мой шаблон отрисован», «всё, сношу». Вы объявляете в классе метод с нужным именем (\`ngOnInit\`, \`ngAfterViewInit\`…), и Angular вызывает его в строго определённый момент. Порядок жёсткий, его стоит знать наизусть — от него зависит, что уже доступно в каждом методе.

Аналогия — сборка шкафа по инструкции. Сначала распаковали коробку (\`constructor\` — деталей ещё не разложили). Потом разложили комплектующие (\`ngOnChanges\` — пришли входные данные). Дальше первичная сборка (\`ngOnInit\`). Вставили полки, которые заказчик привёз отдельно, — это спроецированный контент (\`ngAfterContentInit\`). И только в конце прикрутили фасад и увидели готовый шкаф — ваш собственный вид (\`ngAfterViewInit\`). Когда шкаф выносят — \`ngOnDestroy\`: снять полки и забрать фурнитуру.

**Какую проблему решает.** Компонент живёт не мгновенно: сначала создаётся объект, потом родитель передаёт входы, потом строится шаблон, потом дети. Если обратиться к данным «не в тот момент», получите \`undefined\`: входа ещё нет в конструкторе, элемента из \`@ViewChild\` ещё нет в \`ngOnInit\`. Хуки дают гарантированные точки, где нужные данные уже есть, и место для очистки ресурсов, чтобы не было утечек памяти.

## Словарик терминов

- **Хук жизненного цикла (lifecycle hook)** — метод с зарезервированным именем, который Angular вызывает в определённый момент жизни компонента или директивы.
- **Change detection (CD, обнаружение изменений)** — проход Angular по дереву компонентов: пересчитать выражения шаблонов и обновить DOM там, где значения изменились.
- **Вход (\`@Input\`, \`input()\`)** — свойство, которое компонент получает от родителя через привязку \`[user]="..."\` или статический атрибут.
- **\`SimpleChanges\`** — объект, который получает \`ngOnChanges\`: для каждого изменившегося входа — \`previousValue\`, \`currentValue\` и \`firstChange\`.
- **Контент (content)** — разметка, которую родитель положил между тегами компонента и которая вставляется через \`<ng-content>\`.
- **Вид (view)** — собственный шаблон компонента со всеми его дочерними компонентами.
- **\`@ViewChild\` / \`viewChild()\`** — запрос (query) элемента или компонента из собственного шаблона; первый — декоратор, второй — сигнал.
- **\`@ContentChild\` / \`contentChild()\`** — такой же запрос, но по спроецированному контенту.
- **\`static: true\`** — опция запроса: вычислить результат один раз до первого прохода CD, чтобы он был доступен уже в \`ngOnInit\`.
- **\`ExpressionChangedAfterItHasBeenCheckedError\` (\`NG0100\`)** — ошибка dev-режима: значение в шаблоне изменилось уже после того, как Angular его проверил.
- **\`DestroyRef\`** — сервис, через который можно зарегистрировать колбэк уничтожения (\`onDestroy\`) без метода \`ngOnDestroy\`.
- **\`afterNextRender\` / \`afterEveryRender\`** — функции, регистрирующие колбэк после отрисовки DOM, только в браузере; современная замена части сценариев \`ngAfterViewInit\`.

## Как это работает под капотом

Для одного компонента порядок такой:

1. **\`constructor\`** — Angular создаёт объект и внедряет зависимости. Входов ещё нет, шаблона нет.
2. **\`ngOnChanges(changes)\`** — входы установлены; вызывается **перед** \`ngOnInit\` и потом при каждом изменении привязанного входа. Если ни один вход не привязан, не вызывается вовсе.
3. **\`ngOnInit\`** — один раз, после первого \`ngOnChanges\`. Входы уже есть: здесь стартуют загрузки и подписки, зависящие от входов.
4. **\`ngDoCheck\`** — на каждом проходе CD для этого компонента; место для собственной ручной проверки изменений.
5. **\`ngAfterContentInit\`** — один раз, когда спроецированный контент проинициализирован; доступны \`@ContentChild\`.
6. **\`ngAfterContentChecked\`** — на каждом проходе CD после проверки контента.
7. **\`ngAfterViewInit\`** — один раз, когда собственный вид и **все дочерние виды** проинициализированы; доступны \`@ViewChild\`.
8. **\`ngAfterViewChecked\`** — на каждом проходе CD после проверки вида.
9. **\`ngOnDestroy\`** — при уничтожении: отписки, таймеры, отключение сторонних библиотек.

Почему порядок именно такой — видно из того, как Angular обходит дерево. Упрощённо проход CD по виду родителя выглядит так:

\`\`\`ts
// Упрощённая модель обновления вида (refreshView) одного шаблона
function refreshView(view) {
  executeTemplateUpdate(view);   // пересчитали привязки → входы детей; по ходу у каждого
                                 // компонента шаблона: ngOnChanges → ngOnInit (1 раз) → ngDoCheck
  callContentHooks(view);        // ngAfterContentInit (1 раз) → ngAfterContentChecked
                                 // (вложенные элементы раньше внешних)
  for (const child of view.childComponents) {
    refreshView(child.view);     // рекурсия: целиком обновляем вид каждого дочернего компонента
  }
  callViewHooks(view);           // ngAfterViewInit (1 раз) → ngAfterViewChecked
                                 // (вложенные элементы раньше внешних)
}
// Хуки самого корневого компонента вызывает его «родитель» — служебный вид приложения.
\`\`\`

Отсюда два важных следствия. «Входные» хуки (\`ngOnChanges\`, \`ngOnInit\`, \`ngDoCheck\`) идут **сверху вниз**: родитель раньше ребёнка. А \`ngAfterViewInit\` идёт **снизу вверх**: родитель узнаёт, что его вид готов, только когда готовы все дети.

### Пример 1. Полный порядок для родителя, ребёнка и спроецированного контента

\`\`\`ts
@Directive() // базовому классу с хуками нужен декоратор, иначе AOT-ошибка NG2007
abstract class Hooks {
  name = '?';
  ngOnChanges() { console.log(\`\${this.name}.ngOnChanges\`); }
  ngOnInit() { console.log(\`\${this.name}.ngOnInit\`); }
  // ...так же ngDoCheck, ngAfterContentInit/Checked, ngAfterViewInit/Checked
}

@Component({ selector: 'app-item', template: '{{ label }}' })
class Item extends Hooks {
  @Input() set label(v: string) { this.name = v; }   // 'ViewItem' или 'ProjectedItem'
  get label() { return this.name; }
  constructor() { super(); console.log('Item.constructor'); }
}

@Component({
  selector: 'app-child',
  imports: [Item],
  template: '<app-item label="ViewItem"/><ng-content/>',
})
class Child extends Hooks {
  override name = 'Child';
  @Input() user = '';
  constructor() { super(); console.log('Child.constructor'); }
}

@Component({
  selector: 'app-root',
  imports: [Child, Item],
  template: '<app-child [user]="user"><app-item label="ProjectedItem"/></app-child>',
})
class App extends Hooks {
  override name = 'App';
  user = 'Anna';
  constructor() { super(); console.log('App.constructor'); }
}

// App.constructor
// Child.constructor
// Item.constructor
// Item.constructor
// App.ngOnInit
// App.ngDoCheck
// App.ngAfterContentInit
// App.ngAfterContentChecked
// Child.ngOnChanges
// Child.ngOnInit
// Child.ngDoCheck
// ProjectedItem.ngOnChanges
// ProjectedItem.ngOnInit
// ProjectedItem.ngDoCheck
// ProjectedItem.ngAfterContentInit
// ProjectedItem.ngAfterContentChecked
// Child.ngAfterContentInit
// Child.ngAfterContentChecked
// ViewItem.ngOnChanges
// ViewItem.ngOnInit
// ViewItem.ngDoCheck
// ViewItem.ngAfterContentInit
// ViewItem.ngAfterContentChecked
// ViewItem.ngAfterViewInit
// ViewItem.ngAfterViewChecked
// ProjectedItem.ngAfterViewInit
// ProjectedItem.ngAfterViewChecked
// Child.ngAfterViewInit
// Child.ngAfterViewChecked
// App.ngAfterViewInit
// App.ngAfterViewChecked
\`\`\`

Что здесь видно. Все конструкторы отработали первыми — объекты создаются при построении DOM, а входы ещё не переданы (у \`Item\` в конструкторе нет \`label\`). У \`App\` нет привязанных входов — поэтому нет и \`ngOnChanges\`. \`ProjectedItem\` (контент) прошёл свои первые хуки **до** \`Child.ngAfterContentInit\`: ребёнок узнаёт, что контент готов, когда тот уже проинициализирован. \`ViewItem\` из шаблона \`Child\` полностью готов раньше, чем \`Child.ngAfterViewInit\`, а \`App.ngAfterViewInit\` — самый последний.

### Пример 2. Повторный проход CD: только \`...Check\` хуки

\`\`\`ts
// то же дерево; ничего не изменилось, но Angular снова проверил его
// App.ngDoCheck
// App.ngAfterContentChecked
// Child.ngDoCheck
// ProjectedItem.ngDoCheck
// ProjectedItem.ngAfterContentChecked
// Child.ngAfterContentChecked
// ViewItem.ngDoCheck
// ViewItem.ngAfterContentChecked
// ViewItem.ngAfterViewChecked
// ProjectedItem.ngAfterViewChecked
// Child.ngAfterViewChecked
// App.ngAfterViewChecked
\`\`\`

Хуки с \`Init\` срабатывают один раз за жизнь компонента, а \`ngDoCheck\`, \`ngAfterContentChecked\` и \`ngAfterViewChecked\` — на **каждом** проходе CD. В большом приложении с Zone.js это десятки раз в секунду (каждый клик, таймер, ответ сервера), поэтому тяжёлой логике там не место. \`ngOnChanges\` на повторном проходе не вызвался: входы не менялись.

### Пример 3. \`ngOnChanges\` и ссылки на объекты

\`\`\`ts
@Input() user = { name: '' };
ngOnChanges(ch: SimpleChanges) {
  const c = ch['user'];
  console.log(JSON.stringify(c.previousValue), '->', JSON.stringify(c.currentValue), c.firstChange);
}

// первый проход:                        undefined -> {"name":"Anna"} true
// родитель: this.user.name = 'Boris'    (мутация)  → ngOnChanges НЕ вызван
// родитель: this.user = { name: 'Boris' } (новая ссылка):
//                                       {"name":"Boris"} -> {"name":"Boris"} false
\`\`\`

Angular сравнивает входы по ссылке (\`===\`). Мутация поля внутри объекта — та же ссылка, поэтому \`ngOnChanges\` молчит. Обратите внимание на \`previousValue\`: он тоже показывает \`Boris\`, потому что старый объект был изменён на месте, — ещё один аргумент за иммутабельные обновления. Сигнальные входы \`input()\` тоже вызывают \`ngOnChanges\`, но для производных значений удобнее \`computed(() => ...)\` от входа.

### Пример 4. Когда доступны запросы к шаблону

\`\`\`ts
@Component({
  template: \`
    <div #box>box</div>
    <span #stat>static</span>
    @if (show()) { <p #inIf>in if</p> }
  \`,
})
class App {
  @ViewChild('box') box!: ElementRef;
  @ViewChild('stat', { static: true }) stat!: ElementRef;
  @ViewChild('inIf', { static: true }) inIfStatic?: ElementRef;
  @ViewChild('inIf') inIf?: ElementRef;

  ngOnInit() {
    // box = undefined | stat (static: true) = SPAN | inIf (static: true) = undefined
  }
  ngAfterViewInit() {
    // box = DIV | inIf = P | inIf (static: true) = undefined — и останется undefined навсегда
  }
}

// В Child: @ContentChild(Item) projected
// ngOnInit:            projected = undefined
// ngAfterContentInit:  projected = ProjectedItem
\`\`\`

Обычный запрос (\`static: false\` по умолчанию) заполняется после построения вида, поэтому читать его можно с \`ngAfterViewInit\`. \`static: true\` вычисляется сразу при создании и доступен в \`ngOnInit\`, но только для элементов вне \`@if\`/\`@for\`: на момент создания встроенных видов ещё нет, и статический запрос их уже никогда не увидит. Контентные запросы готовы раньше — в \`ngAfterContentInit\`. Сигнальные запросы \`viewChild()\` можно читать в любой момент: до готовности они возвращают \`undefined\`, а \`computed\` или \`effect\` на их основе обновятся сами.

### Пример 5. Изменение состояния в \`ngAfterViewInit\`

\`\`\`ts
@Component({ selector: 'app-plain', template: '{{ title }}' })
class Plain {
  title = 'initial';
  ngAfterViewInit() { this.title = 'changed in ngAfterViewInit'; }
}
// NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked.
// Previous value: 'initial'. Current value: 'changed in ngAfterViewInit'.

@Component({ selector: 'app-sig', template: '{{ title() }}' })
class Sig {
  title = signal('initial');
  ngAfterViewInit() { this.title.set('changed in ngAfterViewInit'); }
}
// ошибки нет, на экране: changed in ngAfterViewInit
\`\`\`

К моменту \`ngAfterViewInit\` шаблон уже проверен. В dev-режиме Angular делает контрольный повторный проход и, обнаружив другое значение обычного поля, бросает \`NG0100\`: в production ошибки не будет, но экран останется рассинхронизированным. С сигналом Angular знает, что значение изменилось, и просто перерисовывает вид ещё раз. Но и это лишний рендер — правильнее вычислить значение раньше или использовать \`computed\`.

### Пример 6. Уничтожение: \`ngOnDestroy\` и \`DestroyRef\`

\`\`\`ts
@Component({ selector: 'app-item', template: '{{ label }}' })
class Item {
  @Input() label = '';
  constructor() {
    inject(DestroyRef).onDestroy(() => console.log('DestroyRef.onDestroy', this.label));
  }
  ngOnDestroy() { console.log('Item.ngOnDestroy', this.label); }
}

// @if (alive()) { <app-child><app-item label="projected"/></app-child> }
// alive.set(false):
// Item.ngOnDestroy child-view
// DestroyRef.onDestroy child-view
// Item.ngOnDestroy projected
// Child.ngOnDestroy
// DestroyRef.onDestroy projected
\`\`\`

Удаление блока \`@if\` уничтожает все компоненты внутри; в этом запуске хуки детей отработали раньше \`Child.ngOnDestroy\`. \`DestroyRef.onDestroy\` — современная альтернатива методу: регистрировать очистку можно прямо там, где создаётся ресурс, и из функций-хелперов (на нём построен \`takeUntilDestroyed\`).

### Пример 7. Современные заменители хуков

\`\`\`ts
@Component({ /* ... */ })
class UserCard {
  user = input.required<User>();                         // вместо @Input + ngOnChanges
  fullName = computed(() => \`\${this.user().first} \${this.user().last}\`);
  chartEl = viewChild.required<ElementRef>('chart');     // сигнальный запрос

  constructor() {
    effect(() => console.log('user changed', this.user().id)); // реакция на вход
    afterNextRender(() => new Chart(this.chartEl().nativeElement)); // вместо ngAfterViewInit для DOM
    inject(DestroyRef).onDestroy(() => console.log('cleanup'));     // вместо ngOnDestroy
  }
}
\`\`\`

\`computed\` пересчитывается сам при смене входа — не нужен \`ngOnChanges\` с ручным сравнением. \`afterNextRender\` выполняется после того, как отработали все \`ngAfterViewInit\` и DOM реально отрисован, и только в браузере — его используют для измерений и сторонних DOM-библиотек. Классические хуки при этом никуда не делись и полностью поддерживаются.

### Где это применяется на практике

- **\`ngOnInit\`**: запуск загрузки данных по входному \`id\`, подписки на сервисы — в момент, когда входы уже установлены.
- **\`ngOnChanges\`**: пересборка колонок таблицы при смене входной конфигурации, сброс страницы пагинации при смене фильтра.
- **\`ngAfterViewInit\` / \`afterNextRender\`**: инициализация графиков, карт, rich-text редакторов, фокус на поле ввода, измерение высоты строк для виртуального скролла.
- **\`ngAfterContentInit\`**: составные компоненты — вкладки, аккордеоны, колонки грида, объявленные пользователем через проекцию (\`@ContentChildren(Column)\`).
- **\`ngOnDestroy\` / \`DestroyRef\`**: отписка от потоков, остановка \`setInterval\`, закрытие WebSocket, уничтожение экземпляров сторонних библиотек.
- **\`ngDoCheck\`**: редкие случаи ручного обнаружения мутаций (например, через \`KeyValueDiffers\`) в старом коде, где данные мутируются на месте.

## Важные нюансы и подводные камни

- **\`@ViewChild\` в \`ngOnInit\` — \`undefined\`**, если не указан \`static: true\`.
- **\`static: true\` не работает для элементов внутри \`@if\`/\`@for\`**: их нет при создании, и запрос не обновится позже.
- **\`ngOnChanges\` не вызывается при мутации объекта** — только при смене ссылки на вход. И не вызывается вовсе, если ни один вход не привязан в шаблоне родителя.
- **Входы недоступны в конструкторе.** Логика, зависящая от входов, — в \`ngOnInit\`, \`computed\` или \`effect\`.
- **\`ngDoCheck\` и \`...Checked\` вызываются очень часто** — тяжёлая логика там убивает производительность.
- **Изменение обычных полей в \`ngAfterViewInit\` и \`...Checked\`** даёт \`NG0100\` в dev-режиме; с сигналами ошибки нет, но будет лишний рендер.
- **Порядок «родитель — ребёнок» разный для разных хуков**: \`ngOnInit\` сверху вниз, \`ngAfterViewInit\` снизу вверх.
- **Контент инициализируется раньше вида**: \`ngAfterContentInit\` всегда перед \`ngAfterViewInit\` того же компонента.
- **\`ngOnDestroy\` не про закрытие вкладки.** Для сервисов \`providedIn: 'root'\` он вызовется только при уничтожении всего приложения, а при закрытии или жёсткой перезагрузке страницы не вызывается ничего — критичное сохранение на него вешать нельзя (для этого есть \`beforeunload\` и периодическое сохранение).
- **При SSR хуки выполняются на сервере**, где нет реального DOM и размеров: измерения и работа с \`window\` — в \`afterNextRender\`, который на сервере не запускается.
- **\`afterRender\` из старых статей** в Angular 20 переименован в \`afterEveryRender\`; в типах Angular 21 старого имени уже нет.

**Плюсы:** предсказуемые точки, где гарантированно доступны входы, контент и вид; единое место для очистки ресурсов; поддержка как классического, так и сигнального стиля.
**Минусы:** много похожих хуков с тонкими различиями; легко обратиться к данным слишком рано или вызвать \`NG0100\`; частые \`...Check\`-хуки провоцируют проблемы производительности.

## Как это спрашивают на собеседовании

**Главный вывод:** \`constructor\` → \`ngOnChanges\` → \`ngOnInit\` → \`ngDoCheck\` → \`ngAfterContentInit\` → \`ngAfterContentChecked\` → \`ngAfterViewInit\` → \`ngAfterViewChecked\` → \`ngOnDestroy\`. Контент готов раньше вида, \`ngOnInit\` идёт сверху вниз, \`ngAfterViewInit\` — снизу вверх, поэтому \`@ViewChild\` доступен только в \`ngAfterViewInit\`.

Типичные формулировки: «Назовите хуки жизненного цикла по порядку», «Почему \`@ViewChild\` в \`ngOnInit\` равен \`undefined\`?», «Чем \`ngAfterContentInit\` отличается от \`ngAfterViewInit\`?».

Что могут спросить следом:

- *Почему content-хуки раньше view-хуков?* — Контент принадлежит шаблону родителя и проверяется до того, как Angular обновит собственный вид компонента.
- *В каком порядке хуки у родителя и ребёнка?* — \`ngOnInit\` родителя раньше детей, \`ngAfterViewInit\` родителя — после всех детей.
- *Чем \`constructor\` отличается от \`ngOnInit\`?* — В конструкторе только DI, входов нет; в \`ngOnInit\` входы уже установлены.
- *Что заменяет хуки в сигнальном Angular?* — \`input()\` + \`computed\`/\`effect\`, \`viewChild()\`, \`afterNextRender\`, \`DestroyRef.onDestroy\`.

### Ответ на 1 минуту

> Порядок такой: \`constructor\`, где работает только DI и входов ещё нет; \`ngOnChanges\` перед \`ngOnInit\` и на каждое изменение привязанного входа с объектом \`SimpleChanges\`; \`ngOnInit\` один раз, когда входы установлены; \`ngDoCheck\` на каждом проходе change detection; затем контентные \`ngAfterContentInit\` и \`ngAfterContentChecked\`, потом \`ngAfterViewInit\` и \`ngAfterViewChecked\`; в конце \`ngOnDestroy\`. Контент — это спроецированные через \`ng-content\` дети, он готов раньше собственного вида. Входные хуки идут сверху вниз, а \`ngAfterViewInit\` — снизу вверх: у родителя он срабатывает после всех детей. Поэтому \`@ViewChild\` доступен только в \`ngAfterViewInit\`, а менять там обычные поля нельзя — будет \`NG0100\`. В новом коде я чаще использую \`computed\`, \`viewChild()\` и \`afterNextRender\`.`,
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
      ru: `## В чём суть

\`ngAfterViewInit\` говорит «шаблон этого компонента и его детей построен», но **не** говорит «всё приложение отрисовано, браузер готов к измерениям». Вдобавок при SSR он выполняется **на сервере**, где нет ни размеров, ни \`getBoundingClientRect\`, ни \`window\`. \`afterNextRender\` и \`afterEveryRender\` закрывают ровно эту дыру: они срабатывают после того, как Angular закончил рендер всего приложения, **только в браузере**, и умеют раскладывать работу с DOM по фазам чтения и записи.

Аналогия: \`ngAfterViewInit\` — это «я свою стену покрасил». \`afterNextRender\` — «весь ремонт в квартире закончен, можно вносить мебель и мерить, влезет ли диван». \`afterEveryRender\` — «после каждой уборки проверяю, что ничего не сдвинулось». Мерить рулеткой посреди ремонта бессмысленно, а мерить на чертеже (на сервере) — невозможно.

**Какую проблему решает.** Работа с реальным DOM — измерения, фокус, скролл, инициализация графиков и карт — исторически жила в \`ngAfterViewInit\`. Это давало три класса багов: падение при SSR (\`window is not defined\`), измерение ещё не устоявшегося layout и «layout thrashing», когда десятки компонентов вперемешку читают и пишут DOM, заставляя браузер пересчитывать раскладку снова и снова. Новые функции делают DOM-код безопасным для SSR и позволяют Angular упорядочить чтения и записи всех компонентов.

## Словарик терминов

- **Рендер (render) в Angular** — проход обнаружения изменений по приложению, после которого DOM приведён в соответствие с состоянием.
- **\`ngAfterViewInit\`** — классический хук: вызывается один раз, когда вид компонента и всех его детей проинициализирован; выполняется и на сервере.
- **\`afterNextRender(cb)\`** — регистрирует колбэк, который выполнится **один раз** после следующего рендера приложения, только в браузере.
- **\`afterEveryRender(cb)\`** — то же, но **после каждого** рендера приложения; в Angular 20 переименован из \`afterRender\`.
- **\`afterRenderEffect\`** — гибрид \`effect\` и \`afterEveryRender\`: выполняется после рендера, но только если изменились прочитанные в нём сигналы.
- **Фазы (phases)** — четыре этапа после рендера: \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`; колбэки всех компонентов группируются по фазам.
- **Layout (раскладка)** — расчёт браузером размеров и позиций всех элементов.
- **Reflow (принудительный пересчёт layout)** — синхронный перерасчёт раскладки, когда код читает размер (\`offsetHeight\`) после изменения стилей.
- **Layout thrashing** — чередование «запись — чтение — запись — чтение» в DOM, из-за которого reflow происходит много раз за кадр.
- **SSR (Server-Side Rendering)** — отрисовка HTML на сервере; DOM там эмулирован, реальных размеров нет.
- **Гидратация (hydration)** — «оживление» серверного HTML в браузере без пересоздания DOM.
- **Injection-контекст** — момент создания класса (конструктор, поля), когда Angular знает текущий инжектор; без него функции требуют опцию \`injector\`.
- **\`AfterRenderRef\`** — объект, который возвращают эти функции; его \`destroy()\` отменяет колбэк.

## Как это работает под капотом

Упрощённо, после каждого прохода обнаружения изменений приложение делает следующее:

\`\`\`ts
// Упрощённая модель ApplicationRef.tick() и after-render хуков
function tick() {
  refreshViews();                      // 1. CD: ngOnInit, ngAfterViewInit… по всему дереву
  if (isServer) return;                // 2. на сервере after-render колбэки не запускаются
  for (const phase of ['earlyRead', 'write', 'mixedReadWrite', 'read']) {
    for (const hook of registeredHooks) {          // 3. колбэки ВСЕХ компонентов по фазам
      hook.run(phase);                              //    в порядке регистрации
    }
  }
  removeOneShotHooks();                // 4. afterNextRender — удаляем после первого запуска
  // если колбэки поменяли сигналы шаблона — Angular запланирует ещё один рендер
}
\`\`\`

По шагам:

1. Вы вызываете \`afterNextRender\` или \`afterEveryRender\` в конструкторе или инициализаторе поля — им нужен injection-контекст, чтобы найти планировщик и \`DestroyRef\` компонента.
2. Angular выполняет обычный проход CD: обновляет шаблоны и вызывает классические хуки, включая все \`ngAfterViewInit\` во всём дереве.
3. Только после этого, когда DOM приложения обновлён, начинаются after-render фазы. На сервере этот шаг пропускается целиком.
4. Внутри каждой фазы выполняются колбэки **всех** компонентов. Поэтому записи разных компонентов идут пачкой, а чтения — следующей пачкой, и браузер пересчитывает layout один раз между ними, а не после каждой пары операций.
5. Если в одном объявлении указаны несколько фаз, значение, которое вернула предыдущая фаза, передаётся аргументом в следующую.
6. \`afterNextRender\` снимается после первого запуска; \`afterEveryRender\` остаётся до уничтожения компонента (его \`DestroyRef\`) или до ручного \`destroy()\`.

### \`ngAfterViewInit\` — «мой вид построен»

\`\`\`ts
@Component({ selector: 'app-chart', template: '<canvas #c></canvas>' })
class ChartCmp implements AfterViewInit {
  @ViewChild('c') canvas!: ElementRef<HTMLCanvasElement>;
  ngAfterViewInit() {
    // элемент уже есть — но:
    // 1) при SSR этот код выполнится на сервере, где нет настоящего canvas и window;
    // 2) остальные компоненты страницы, возможно, ещё не обновлены
    const width = this.canvas.nativeElement.getBoundingClientRect().width; // на сервере 0 или ошибка
  }
}
\`\`\`

\`ngAfterViewInit\` — часть обнаружения изменений: он гарантирует только, что этот компонент и его дети построены. Это правильное место для работы с \`@ViewChild\` как с объектами Angular (например, вызвать метод дочернего компонента), но не лучшее — для измерений и сторонних DOM-библиотек.

### \`afterNextRender\` — один раз после ближайшего рендера

\`\`\`ts
@Component({ selector: 'app-a', template: '<div #box>A {{ n() }}</div>' })
class A implements AfterViewInit {
  constructor() {
    console.log('A constructor');
    afterNextRender(() => console.log('A afterNextRender'));
  }
  ngAfterViewInit() { console.log('A ngAfterViewInit'); }
}
// В шаблоне App: <app-a/><app-b/> — у B такие же логи, у App свой ngAfterViewInit

// A constructor
// B constructor
// A ngAfterViewInit
// B ngAfterViewInit
// App ngAfterViewInit
// A afterNextRender   ← только после того, как ВСЁ дерево прошло ngAfterViewInit
// B afterNextRender
\`\`\`

Разница видна по порядку: все \`ngAfterViewInit\`, включая родительский, отработали раньше первого \`afterNextRender\`. Это идеальное место для разовой инициализации: создать экземпляр графика, карты или редактора, поставить фокус, прокрутить к элементу, один раз что-то измерить.

### \`afterEveryRender\` — после каждого рендера приложения

\`\`\`ts
@Component({ selector: 'app-a', template: '<div #box>A {{ n() }}</div>' })
class A {
  n = signal(0);
  box = viewChild.required<ElementRef<HTMLElement>>('box');
  constructor() {
    afterEveryRender({ read: () => console.log('A every: text =', this.box().nativeElement.textContent) });
  }
}

// старт:                       A every: text = A 0
// a.n.set(1):                  A every: text = A 1
// изменился сигнал ДРУГОГО компонента C:
//                              A every: text = A 1   ← сработал, хотя A не менялся
\`\`\`

Колбэк привязан не к перерисовке своего компонента, а к рендеру **всего приложения**: любое изменение где угодно запустит его снова. Поэтому внутри — только дешёвая работа, и почти всегда с явной фазой. В Angular 20 эту функцию переименовали из \`afterRender\` в \`afterEveryRender\`; в Angular 21 старого имени в типах уже нет — старые статьи и ответы надо читать с поправкой.

### Фазы \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`

\`\`\`ts
// Компонент A
afterNextRender({
  earlyRead: () => { console.log('A earlyRead'); return 10; },   // измерили ДО записи
  write: (h) => { console.log('A write got', h); return h * 2; }, // записали
  read: (w) => { console.log('A read got', w); },                 // измерили результат
});
// Компонент B
afterNextRender({
  write: () => console.log('B write'),
  read: () => console.log('B read'),
});

// A earlyRead
// A write got 10
// B write          ← записи всех компонентов идут одной пачкой
// A read got 20
// B read           ← чтения — следующей пачкой, после всех записей
\`\`\`

- **\`earlyRead\`** — прочитать DOM до записей, когда запись зависит от измерения (например, кастомный layout). Используйте, только если чтение нельзя отложить в \`read\`.
- **\`write\`** — только запись в DOM: стили, классы, позиции. Читать здесь нельзя.
- **\`mixedReadWrite\`** — чтение и запись вперемешку; последний вариант, если работу невозможно разделить. Колбэк без указания фазы попадает именно сюда.
- **\`read\`** — только чтение, после всех записей: измерения итогового состояния.

Обратите внимание: \`read\` идёт **после** \`write\`, а не перед ним. Значение передаётся по цепочке фаз через \`return\`, поэтому не нужно складывать промежуточные данные в поля класса. Angular не проверяет, что вы соблюдаете правила фаз, — это договорённость, и выигрыш появляется, только если её соблюдают все компоненты.

### Почему фазы спасают от layout thrashing

\`\`\`ts
// ❌ Чередование: каждая итерация — принудительный пересчёт layout
for (const row of rows) {
  const h = row.offsetHeight;          // чтение: браузер обязан посчитать layout прямо сейчас
  row.style.minHeight = h + 8 + 'px';  // запись: layout снова «грязный»
}

// ✅ Сначала все чтения, потом все записи — один пересчёт
const heights = rows.map(r => r.offsetHeight);
rows.forEach((r, i) => (r.style.minHeight = heights[i] + 8 + 'px'));
\`\`\`

Браузер копит изменения стилей и пересчитывает раскладку лениво, перед отрисовкой кадра. Но чтение размера после записи заставляет его сделать это немедленно. В первом цикле на N строк приходится до N принудительных пересчётов, во втором — один. Фазы делают то же самое, но **между компонентами**: десять независимых виджетов, каждый со своим \`write\` и \`read\`, не перемешивают операции друг друга.

### \`afterRenderEffect\` — после рендера, но только когда изменились сигналы

\`\`\`ts
@Component({ selector: 'app-c', template: 'C {{ v() }}' })
class C {
  v = signal('x');
  constructor() {
    afterRenderEffect({ read: () => console.log('C afterRenderEffect read, v =', this.v()) });
  }
}
// старт:                         C afterRenderEffect read, v = x
// изменился сигнал другого компонента: (тишина)
// c.v.set('y'):                  C afterRenderEffect read, v = y
\`\`\`

Это \`effect\`, который запускается в нужной after-render фазе. В отличие от \`afterEveryRender\`, он отслеживает прочитанные сигналы и выполняется, только если они изменились, — хороший выбор для синхронизации DOM с конкретным состоянием (позиция подсказки, размеры canvas).

### Регистрация вне контекста и ручная отмена

\`\`\`ts
someMethod() {
  afterNextRender(() => {});
  // NG0203: afterNextRender() can only be used within an injection context ...

  const ref = afterNextRender(() => console.log('with explicit injector'), { injector: this.injector });
  // ref.destroy() — отменить, если колбэк больше не нужен
}
\`\`\`

Без injection-контекста передайте опцию \`injector\`. Колбэки автоматически снимаются при уничтожении компонента; \`manualCleanup: true\` отключает эту привязку, и тогда остановка — только через \`AfterRenderRef.destroy()\`.

### Как выбрать

- **Нужен \`@ViewChild\` как объект Angular** (вызвать метод дочернего компонента, подписаться на его \`output\`) — \`ngAfterViewInit\` или сигнальный \`viewChild()\` с \`computed\`/\`effect\`.
- **Разовая работа с реальным DOM** — инициализация сторонней библиотеки, фокус, скролл, одно измерение — \`afterNextRender\`.
- **Постоянная синхронизация с DOM** после любых изменений — \`afterEveryRender\` с явной фазой, и только дешёвая логика.
- **Синхронизация DOM с конкретными сигналами** — \`afterRenderEffect\`: не тратит время, пока эти сигналы не менялись.
- **Код должен работать при SSR** — всё, что трогает \`window\`, \`document\` и размеры, только в after-render функциях.
- **Измерение, от которого зависит запись** — фаза \`earlyRead\` перед \`write\`; во всех остальных случаях — \`write\`, затем \`read\`.

### Где это применяется на практике

- **Графики и карты** (Chart.js, ECharts, Leaflet): создание экземпляра в \`afterNextRender\`, уничтожение в \`DestroyRef.onDestroy\`.
- **Большие таблицы и виртуальный скролл**: измерение высоты строк и ширины колонок в \`read\`, выставление размеров в \`write\`.
- **Автофокус и прокрутка**: фокус на первом невалидном поле формы после отправки, прокрутка к новой строке чата.
- **Плавающие элементы**: тултипы, выпадающие меню, поповеры — \`afterRenderEffect\`, пересчитывающий позицию при смене якоря или содержимого.
- **SSR-приложения**: код, который раньше падал на сервере с \`window is not defined\`, переносится в \`afterNextRender\`.
- **Интеграция со сторонними виджетами**, которые сами меняют DOM (rich-text редакторы, drag-and-drop), — синхронизация после каждого рендера.

## Важные нюансы и подводные камни

- **Вызов вне injection-контекста** — \`NG0203\`; регистрируйте в конструкторе или передавайте \`injector\`.
- **Тяжёлая логика в \`afterEveryRender\`** выполняется после рендера всего приложения, даже если ваш компонент не менялся, и легко становится узким местом.
- **Чтение и запись в одной фазе** возвращают layout thrashing, ради борьбы с которым фазы и вводились; колбэк без фазы попадает в самую дорогую — \`mixedReadWrite\`.
- **\`read\` выполняется после \`write\`.** Распространённая ошибка — считать, что «Angular сначала выполняет все чтения»: для чтения до записи есть отдельная фаза \`earlyRead\`.
- **На сервере колбэки не выполняются вообще** — не кладите туда логику, от которой зависит серверная разметка или данные.
- **Гидратация не гарантирована** к моменту колбэка: документация прямо предупреждает, что компонент может быть ещё не гидратирован, поэтому с DOM нужно обращаться осторожно.
- **Это не замена \`ngOnDestroy\`.** Очистку сторонней библиотеки всё равно пишут отдельно — в \`ngOnDestroy\` или \`DestroyRef.onDestroy\`.
- **Изменение сигналов внутри колбэков** запускает ещё один рендер. Безусловная запись в \`afterEveryRender\` зацикливает его: в эксперименте Angular остановился после 10 повторов с ошибкой \`NG0103: Infinite change detection while refreshing application views\`.
- **Старые имена.** В статьях и коде до Angular 20 встречается \`afterRender\` (сейчас \`afterEveryRender\`) и enum \`AfterRenderPhase\` (сейчас объект с фазами).

**Плюсы:** безопасность при SSR; запуск после рендера всего приложения, а не одного вида; фазы, которые устраняют layout thrashing между компонентами; передача данных между фазами; автоматическая очистка.
**Минусы:** \`afterEveryRender\` легко превращается в горячую точку производительности; правила фаз не проверяются; ещё один набор API рядом с классическими хуками, и названия менялись между версиями.

## Как это спрашивают на собеседовании

**Главный вывод:** \`ngAfterViewInit\` — часть обнаружения изменений и выполняется в том числе на сервере; \`afterNextRender\` и \`afterEveryRender\` выполняются после рендера всего приложения, только в браузере, и группируют DOM-операции всех компонентов по фазам \`earlyRead\` → \`write\` → \`mixedReadWrite\` → \`read\`.

Типичные формулировки: «Где инициализировать стороннюю DOM-библиотеку?», «Почему \`ngAfterViewInit\` опасен при SSR?», «Что такое layout thrashing и как Angular с ним помогает?».

Что могут спросить следом:

- *Чем \`afterNextRender\` отличается от \`afterEveryRender\`?* — Первый срабатывает один раз, второй — после каждого рендера приложения.
- *Что такое layout thrashing?* — Чередование записи и чтения DOM, из-за которого браузер много раз подряд пересчитывает раскладку.
- *Когда нужна фаза \`earlyRead\`?* — Когда запись зависит от измерения, сделанного до неё; иначе — \`write\`, потом \`read\`.
- *Чем \`afterRenderEffect\` лучше \`afterEveryRender\`?* — Запускается только при изменении прочитанных сигналов.
- *Куда делся \`afterRender\`?* — В Angular 20 переименован в \`afterEveryRender\`.

### Ответ на 1 минуту

> \`ngAfterViewInit\` гарантирует только, что построен вид этого компонента и его детей; он часть change detection и при SSR выполняется на сервере, где нет размеров и \`window\`. \`afterNextRender\` и \`afterEveryRender\` выполняются после рендера всего приложения и только в браузере: проверял — все \`ngAfterViewInit\` дерева срабатывают раньше первого \`afterNextRender\`. \`afterNextRender\` одноразовый — им я инициализирую графики, ставлю фокус, делаю разовое измерение. \`afterEveryRender\`, бывший \`afterRender\`, срабатывает после каждого рендера приложения, даже если мой компонент не менялся, поэтому внутри только дешёвая логика. Оба регистрируются в injection-контексте и принимают фазы \`earlyRead\`, \`write\`, \`mixedReadWrite\`, \`read\`: Angular выполняет записи всех компонентов пачкой, потом чтения, и это убирает layout thrashing.`,
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
      ru: `## В чём суть

Ivy — это компилятор и движок рендеринга Angular, который стал стандартным в версии 9 и полностью заменил старый View Engine (тот удалён в Angular 13). Главная идея: шаблон превращается не в данные, которые потом кто-то интерпретирует, и не в виртуальное дерево для сравнения, а в **обычную JavaScript-функцию из инструкций** вида \`ɵɵelementStart\`, \`ɵɵtext\`, \`ɵɵproperty\`, записанную прямо в класс компонента. При первом запуске эта функция создаёт DOM, при последующих — точечно обновляет только изменившиеся значения.

Аналогия: Virtual DOM — это когда вы каждый раз рисуете полный новый план квартиры, кладёте рядом со старым и ищете отличия, а потом переставляете то, что не совпало. Incremental DOM — когда у вас на руках готовый список конкретных команд: «повесь эту полку», «перепиши табличку на двери номер 3, если фамилия жильца сменилась». Второй план квартиры в памяти не нужен вовсе — достаточно помнить, что было написано на каждой табличке.

**Какую проблему решает.** View Engine генерировал громоздкий код, плохо поддавался tree-shaking и требовал глобального анализа приложения: чтобы скомпилировать компонент, компилятору нужно было знать про NgModule и всё вокруг. Отсюда большие бандлы, медленные пересборки и сложная публикация библиотек. Ivy сделал три вещи: компактный код из импортируемых функций (бандлер выбрасывает лишнее), **локальность** (каждый компонент компилируется сам по себе, быстрые пересборки) и AOT-компиляцию по умолчанию (ошибки шаблонов ловятся при сборке, а компилятор не едет в браузер).

## Словарик терминов

- **Ivy** — текущий компилятор и рантайм Angular: превращает шаблоны в функции-инструкции и исполняет их.
- **View Engine** — предыдущий движок Angular (до версии 9 по умолчанию, удалён в 13-й).
- **AOT (Ahead-of-Time)** — компиляция шаблонов при сборке проекта; в браузер приходит готовый JavaScript.
- **JIT (Just-in-Time)** — компиляция шаблонов прямо в браузере во время работы; требует везти компилятор в бандле.
- **Virtual DOM (VDOM)** — подход React и Vue: при каждом рендере строится новое дерево JS-объектов, сравнивается со старым (diff), и найденные отличия переносятся в DOM.
- **Incremental DOM** — подход, при котором шаблон компилируется в последовательность инструкций, напрямую создающих и обновляющих узлы DOM, без промежуточного дерева.
- **Инструкция (instruction)** — маленькая функция рантайма Angular с префиксом \`ɵɵ\` (\`ɵɵtext\`, \`ɵɵproperty\`, \`ɵɵlistener\`…), которую вызывает скомпилированный шаблон.
- **Префикс \`ɵ\` («тета»)** — пометка приватного API Angular: знать полезно, использовать в коде приложения нельзя.
- **\`rf\` (RenderFlags)** — битовый флаг режима: \`rf & 1\` — создание (create), \`rf & 2\` — обновление (update).
- **\`LView\` / \`TView\`** — внутренние структуры Ivy: \`LView\` — массив данных конкретного экземпляра вида (ссылки на DOM-узлы, прошлые значения привязок), \`TView\` — общая для всех экземпляров статическая информация о шаблоне.
- **Привязка (binding)** — выражение в шаблоне, значение которого может меняться: \`{{ name }}\`, \`[disabled]="..."\`.
- **Tree-shaking** — удаление сборщиком кода, на который нет ссылок.
- **Локальность (locality)** — принцип Ivy: компонент компилируется только по своему декоратору и публичным \`.d.ts\`-описаниям зависимостей, без анализа всего приложения.
- **Partial-компиляция и линкер (linker)** — формат публикации библиотек: компилятор кладёт в npm-пакет стабильное описание компонента, а линкер при сборке приложения превращает его в финальные инструкции.

## Как это работает под капотом

Путь от шаблона до DOM по шагам:

1. **Сборка.** Компилятор Angular (\`ngtsc\`, расширение TypeScript-компилятора) читает декоратор \`@Component\` и разбирает шаблон.
2. Для каждого шаблона он генерирует **функцию шаблона** с двумя блоками: \`if (rf & 1)\` — создание узлов, \`if (rf & 2)\` — обновление привязок. Функция кладётся в статическое поле \`ɵcmp\` класса.
3. **Первый рендер.** Рантайм вызывает функцию с флагом create: инструкции создают элементы и текстовые узлы и запоминают ссылки на них в \`LView\` по индексам (\`0\`, \`1\`, \`2\`…).
4. **Каждая проверка изменений.** Функция вызывается с флагом update: инструкции вычисляют выражения привязок и **сравнивают с прошлым значением**, сохранённым в \`LView\`. Если значение то же — DOM не трогается вовсе; если другое — обновляется ровно одно свойство или один текстовый узел.
5. Сравниваются не деревья, а отдельные значения привязок. Поэтому стоимость обновления зависит от числа привязок, а не от размера разметки: статический текст и элементы без привязок на update-проходе не участвуют.
6. Инструкции — обычные функции, которые сгенерированный код импортирует из \`@angular/core\`. Не использовали пайпы, \`@defer\` или i18n — соответствующих инструкций нет в импортах, и сборщик их выбрасывает.

Сравнение двух подходов в упрощённом виде:

\`\`\`ts
// Virtual DOM (упрощённо): каждый рендер — новое дерево и сравнение деревьев
function renderVdom(state) {
  const next = h('p', null, \`Hello, \${state.name}!\`);  // новое дерево объектов
  patch(prevTree, next);                                 // обойти и сравнить узлы
  prevTree = next;
}

// Ivy (упрощённо): функция шаблона и сравнение отдельных значений
function Greet_Template(rf, ctx) {
  if (rf & 1) { /* создать <p> и текстовый узел №1 один раз */ }
  if (rf & 2) {
    const v = \`Hello, \${ctx.name}!\`;
    if (v !== lView[1].prev) { lView[1].node.textContent = v; lView[1].prev = v; } // только если изменилось
  }
}
\`\`\`

### Пример 1. Во что Angular 21 компилирует простой шаблон

\`\`\`ts
@Component({ selector: 'app-greet', template: '<p>Hello, {{ name }}!</p>' })
export class Greet { name = 'Anna'; }
\`\`\`

\`\`\`js
// Реальный вывод ngc (Angular 21.1), сокращён
export class Greet {
  name = 'Anna';
  static ɵfac = function Greet_Factory(t) { return new (t || Greet)(); };
  static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({
    type: Greet, selectors: [["app-greet"]], decls: 2, vars: 1,
    template: function Greet_Template(rf, ctx) {
      if (rf & 1) {
        i0.ɵɵdomElementStart(0, "p");   // узел №0 — <p>
        i0.ɵɵtext(1);                    // узел №1 — текст
        i0.ɵɵdomElementEnd();
      }
      if (rf & 2) {
        i0.ɵɵadvance();                  // перейти к узлу №1
        i0.ɵɵtextInterpolate1("Hello, ", ctx.name, "!");
      }
    },
    encapsulation: 2,
  });
}
\`\`\`

Код под этим ответом показывает ту же идею в упрощённом виде, без префиксов \`ɵɵ\` и без \`advance\`. В реальном выводе видно ещё несколько деталей: \`decls: 2\` — сколько узлов создаёт шаблон, \`vars: 1\` — сколько слотов нужно под значения привязок, \`ɵɵadvance()\` — сдвиг «курсора» к следующему узлу с привязкой. Префикс \`dom\` у \`ɵɵdomElementStart\` означает облегчённую инструкцию: компонент не импортирует ни одной директивы или дочернего компонента, поэтому рантайму не нужно искать директивы на элементах.

### Пример 2. Свойства, события и \`@if\`

\`\`\`ts
@Component({
  selector: 'app-counter',
  template: \`
    <button [disabled]="count() >= 3" (click)="inc()">+1</button>
    @if (count() > 0) { <span>{{ count() }}</span> }
  \`,
})
export class Counter { count = signal(0); inc() { this.count.update(c => c + 1); } }
\`\`\`

\`\`\`js
// Реальный вывод ngc, сокращён
function Counter_Conditional_2_Template(rf, ctx) {           // отдельная функция для блока @if
  if (rf & 1) { i0.ɵɵdomElementStart(0, "span"); i0.ɵɵtext(1); i0.ɵɵdomElementEnd(); }
  if (rf & 2) { const ctx_r0 = i0.ɵɵnextContext(); i0.ɵɵadvance(); i0.ɵɵtextInterpolate(ctx_r0.count()); }
}
// template: function Counter_Template(rf, ctx) {
if (rf & 1) {
  i0.ɵɵdomElementStart(0, "button", 0);
  i0.ɵɵdomListener("click", function () { return ctx.inc(); });  // подписка на событие — один раз
  i0.ɵɵtext(1, "+1");                                            // статический текст — только при создании
  i0.ɵɵdomElementEnd();
  i0.ɵɵconditionalCreate(2, Counter_Conditional_2_Template, 2, 1, "span");
}
if (rf & 2) {
  i0.ɵɵdomProperty("disabled", ctx.count() >= 3);              // привязка свойства
  i0.ɵɵadvance(2);
  i0.ɵɵconditional(ctx.count() > 0 ? 2 : -1);                  // показать блок 2 или ничего (-1)
}
\`\`\`

Каждая конструкция шаблона — своя инструкция. Статический текст \`+1\` и подписка на \`click\` живут только в create-блоке и при обновлениях не стоят ничего. Блок \`@if\` скомпилирован в отдельную функцию шаблона: \`ɵɵconditional\` решает, создать или удалить встроенный вид.

### Пример 3. Обновляются только изменившиеся узлы

\`\`\`ts
@Component({
  selector: 'app-root',
  template: '<h1>{{ getTitle() }}</h1><p>{{ name() }}</p><p>{{ name() }}!</p>',
})
class App {
  title = signal('Users');
  name = signal('Anna');
  getTitle() { console.log('getTitle() evaluated'); return this.title(); }
}

// после первого рендера подключаем наблюдатель за DOM
const host = document.querySelector('app-root')!;
const h1Before = host.querySelector('h1');
const records: string[] = [];
new MutationObserver(list => list.forEach(m =>
  records.push(\`\${m.type}: "\${m.oldValue}" -> "\${m.target.textContent}"\`),
)).observe(host, { subtree: true, characterData: true, characterDataOldValue: true, childList: true });

app.name.set('Boris');
// getTitle() evaluated     ← привязка заголовка пересчитана при обновлении вида
// getTitle() evaluated     ← и ещё раз — контрольный проход dev-режима
// (после рендера)
console.log(records.join('\\n'));
console.log('same <h1> node:', h1Before === host.querySelector('h1'));
// characterData: "Anna" -> "Boris"
// characterData: "Anna!" -> "Boris!"
// same <h1> node: true     ← но в DOM заголовка не было ни одной записи

records.length = 0;
app.name.set('Boris');      // то же значение
console.log('same value -> mutations:', records.length);
// same value -> mutations: 0   (и getTitle() не вызывался вовсе)
\`\`\`

Смена \`name\` пометила вид компонента для обновления, и update-блок функции шаблона выполнился целиком: выражение заголовка тоже вычислилось. Но \`ɵɵtextInterpolate\` сравнил результат с прошлым значением в \`LView\`, увидел то же \`'Users'\` и DOM не тронул; два текстовых узла с \`name\` получили новое содержимое, а \`<h1>\` остался тем же объектом. Повторная установка того же значения не вызвала даже рендера: сигнал не сообщает об изменении, если новое значение равно старому, — это уже оптимизация на уровне сигналов, работающая поверх Ivy.

### Incremental DOM против Virtual DOM

- **Память.** VDOM на каждом рендере создаёт новое дерево JS-объектов, и старое уходит в сборщик мусора. Ivy хранит только прошлые значения привязок в \`LView\`, а на update-проходе для неизменившихся значений ничего не выделяет.
- **Что сравнивается.** VDOM сравнивает деревья узел за узлом; Ivy — только места привязок, известные заранее из компиляции. Статическая разметка в сравнении не участвует.
- **Гибкость.** VDOM удобен, когда разметку строят произвольным кодом (JSX с циклами и условиями где угодно). Ivy опирается на шаблон, известный при сборке: из-за этого компилятор может заранее вычислить всё статическое.
- **Ограничение.** Ivy по-прежнему должен «спросить» каждую привязку проверяемых компонентов; поэтому для производительности важны \`OnPush\`, сигналы и отказ от тяжёлых вычислений в шаблоне.

### Tree-shaking: почему неиспользуемое не попадает в бандл

\`\`\`js
static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ ... });
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(Greet, [...]); })();
\`\`\`

Три механизма работают вместе. Во-первых, сгенерированный код импортирует только те инструкции, которые реально нужны шаблонам приложения, — остальной рантайм сборщик удаляет. Во-вторых, определение компонента помечено \`/*@__PURE__*/\`: это подсказка сборщику, что вызов без побочных эффектов и его можно выбросить, если на компонент никто не ссылается. В-третьих, отладочные метаданные завёрнуты в проверку \`ngDevMode\`: production-сборка подставляет \`false\`, и этот код исчезает. Сервисы с \`providedIn: 'root'\` дополняют картину: на них нет ссылок из модулей, пока их кто-то не инжектит.

### Локальность: компилятор смотрит только на свой компонент

\`\`\`ts
// Публичное описание компонента в .d.ts (реальный вывод ngc)
export declare class Badge {
  label: InputSignal<string>;
  static ɵcmp: i0.ɵɵComponentDeclaration<Badge, "app-badge", never,
    { "label": { "alias": "label"; "required": true; "isSignal": true; }; }, {}, never, never, true, never>;
}
\`\`\`

Чтобы скомпилировать шаблон \`Card\`, где используется \`<app-badge [label]="title"/>\`, компилятору не нужен исходный код \`Badge\` — достаточно этой декларации: селектор, входы, обязательность, сигнальность. Отсюда следствия. Поменяли шаблон одного компонента — перекомпилируется только он, пока не изменился его публичный контракт (селектор, входы, выходы). Компоненты из \`.d.ts\` библиотек используются так же, как свои. А сгенерированный код \`Card\` ссылается на \`Badge\` напрямую: \`dependencies: [Badge]\` и инструкции \`ɵɵelementStart\`/\`ɵɵproperty\` вместо облегчённых \`dom\`-версий.

### Partial-компиляция библиотек и линкер

\`\`\`js
// Та же Card, собранная в режиме compilationMode: 'partial' (так публикуют библиотеки)
static ɵcmp = i0.ɵɵngDeclareComponent({
  minVersion: "14.0.0", version: "21.1.4", type: Card, isStandalone: true,
  selector: "app-card", template: '<div class="card"><app-badge [label]="title" /></div>',
  dependencies: [{ kind: "component", type: Badge, selector: "app-badge", inputs: ["label"] }],
});
\`\`\`

Библиотека публикуется не с готовыми инструкциями, а со стабильным описанием: шаблон остаётся строкой, а \`minVersion\` говорит, с какой версией Angular описание совместимо. При сборке приложения **линкер** превращает его в инструкции той версии Angular, которая установлена в приложении. Так библиотека, собранная на одной версии, работает с более новыми, а внутренние инструкции могут меняться между релизами. Если запустить такой пакет без линкера и без JIT-компилятора, Angular честно ругается: «The injectable 'PlatformLocation' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available. The injectable is part of a library that has been partially compiled» — именно это сообщение пришло при запуске примеров к этой статье в голом Node.js.

### AOT вместо JIT

\`\`\`bash
# ошибка шаблона ловится при сборке, а не у пользователя в браузере
ng build
# error NG8002: Can't bind to 'lable' since it isn't a known property of 'app-badge'.
\`\`\`

Вместе с Ivy AOT-компиляция стала стандартной и для \`ng serve\`, и для \`ng build\`. В браузер не едет компилятор шаблонов (сам пакет \`@angular/compiler\` — около мегабайта неминифицированного JavaScript), приложение стартует быстрее, а с \`strictTemplates\` шаблоны проверяются TypeScript-типизацией так же строго, как код. JIT остался для особых случаев — например, для тестов в некоторых конфигурациях.

### Где это применяется на практике

- **Размер бандла**: понимание tree-shaking объясняет, почему стоит избегать «барельных» модулей с побочными эффектами и тяжёлых библиотек, импортируемых целиком.
- **Производительность больших экранов** (таблицы на тысячи строк, дашборды): стоимость проверки пропорциональна числу привязок — сокращайте их, используйте \`OnPush\`, сигналы и \`@for\` с \`track\`.
- **Монорепозитории и быстрые пересборки**: локальность позволяет инкрементально пересобирать только изменённые компоненты.
- **Публикация внутренних UI-библиотек**: сборка в partial-режиме через \`ng-packagr\`, совместимость с разными версиями Angular в приложениях.
- **Отладка**: стек вызовов с \`ɵɵtextInterpolate\` или \`ɵɵproperty\` подсказывает, какая привязка шаблона упала.
- **Миграции**: обновление со старых версий, где ещё встречаются View Engine-библиотеки (\`ngcc\`), требует их замены на Ivy-совместимые.

## Важные нюансы и подводные камни

- **Ivy — не Virtual DOM.** Путать incremental DOM с диффингом React — типичная ошибка на собеседовании; Ivy сравнивает значения привязок, а не деревья.
- **Инструкции с префиксом \`ɵɵ\` — приватный API.** Их имена меняются между версиями (в свежих версиях появились \`ɵɵdomElementStart\`, \`ɵɵdomProperty\`, \`ɵɵconditional\`); знать полезно, использовать нельзя.
- **«Нет дерева» не значит «нет памяти».** Ivy хранит \`LView\` для каждого экземпляра вида: ссылки на узлы и прошлые значения привязок. Это меньше, чем VDOM, но не ноль.
- **Tree-shaking работает не магически**: побочные эффекты на уровне модуля, динамические обращения и импорт библиотек целиком легко его ломают.
- **AOT ловит ошибки шаблонов на сборке** — поэтому сборка может падать там, где раньше JIT молчал до рантайма.
- **Локальность не отменяет зависимостей.** Если меняется публичный контракт компонента (селектор, входы), пересобираются и проверяются все, кто его использует; несовместимая версия библиотеки (ниже её \`minVersion\`) всё равно сломает сборку.
- **Partial-библиотекам нужен линкер.** Angular CLI запускает его автоматически; в нестандартных сборках (свой Webpack, Jest, Node-скрипты) без линкера или \`@angular/compiler\` пакеты Angular не заработают.
- **\`ngcc\` больше нет.** Он перекомпилировал старые View Engine-библиотеки под Ivy и был удалён в Angular 16; такие библиотеки надо обновлять.

**Плюсы:** меньше бандлы благодаря tree-shaking; быстрые инкрементальные пересборки; точечные обновления DOM без построения дерева; AOT и строгая проверка шаблонов по умолчанию; стабильный формат публикации библиотек.
**Минусы:** шаблоны должны быть известны при сборке (меньше гибкости, чем у JSX); внутренние инструкции нестабильны и непрозрачны; проверка всех привязок всё ещё требует дисциплины с \`OnPush\` и сигналами.

## Как это спрашивают на собеседовании

**Главный вывод:** Ivy компилирует шаблон в функцию из инструкций с двумя режимами — создание и обновление; обновление сравнивает значения привязок с прошлыми и правит только изменившиеся узлы, без виртуального дерева. Инструкции — импортируемые функции, поэтому неиспользуемое выбрасывается, а локальность позволяет компилировать каждый компонент отдельно.

Типичные формулировки: «Что такое Ivy?», «Чем incremental DOM отличается от Virtual DOM?», «Почему Ivy уменьшил размер бандлов?».

Что могут спросить следом:

- *Чем incremental DOM лучше по памяти?* — Не создаёт новое дерево на каждом рендере; хранит только прошлые значения привязок.
- *Почему локальность ускорила пересборку?* — Компонент компилируется по своему декоратору и \`.d.ts\` зависимостей; изменение шаблона пересобирает только его.
- *Что такое partial-компиляция?* — Формат публикации библиотек: стабильное описание компонента, которое линкер превращает в инструкции при сборке приложения.
- *Что такое \`rf & 1\` и \`rf & 2\`?* — Флаги режима функции шаблона: создание и обновление.

### Ответ на 1 минуту

> Ivy — компилятор и рантайм Angular, стандартный с девятой версии; View Engine удалён в тринадцатой. Компилятор превращает шаблон в функцию из инструкций incremental DOM прямо в классе компонента: с флагом create она один раз создаёт узлы, с флагом update на каждом проходе change detection сравнивает значения привязок с прошлыми, сохранёнными в \`LView\`, и правит только изменившиеся узлы. Виртуального дерева, как в React, нет, поэтому памяти и мусора меньше. Инструкции — обычные импортируемые функции, и сборщик выбрасывает всё неиспользуемое. Второй принцип — локальность: компонент компилируется по своему декоратору и \`.d.ts\` зависимостей, что даёт быстрые пересборки и partial-публикацию библиотек через линкер. Плюс Ivy сделал AOT стандартом: ошибки шаблонов ловятся при сборке.`,
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
      ru: `## В чём суть

Standalone-компонент сам перечисляет свои зависимости — в свойстве \`imports\` декоратора \`@Component\`. Его не нужно регистрировать ни в каком \`NgModule\`. С Angular 19 это поведение по умолчанию: флаг \`standalone: true\` писать больше не нужно.

Аналогия: \`NgModule\` — это общая кладовка на этаж. Чтобы понять, чем пользуется конкретная комната, надо идти читать опись кладовки и гадать, что из этого кому нужно. Standalone — это рюкзак: всё, чем пользуется компонент, лежит прямо у него, видно с первого взгляда, и ничего лишнего нести не приходится.

**Какую проблему решает.** В классическом Angular компонент не существовал сам по себе: его надо было объявить ровно в одном модуле, а нужные шаблону директивы и пайпы приходили через цепочку импортов этого модуля. Открываете компонент — и не видите, откуда в шаблоне взялся \`<app-card>\` или пайп \`currency\`. Добавляете ленивую страницу — пишете модуль-обёртку из трёх строк. Пишете тест — повторяете в \`TestBed\` половину модуля. Standalone убирает этот промежуточный слой: зависимости видны там же, где используются.

## Словарик терминов

- **NgModule** — класс с декоратором \`@NgModule\`, который группирует компоненты, директивы, пайпы и провайдеры. До standalone был обязательной единицей сборки приложения.
- **\`declarations\` / \`exports\`** — списки модуля: что в нём объявлено (каждый компонент — ровно в одном модуле) и что он отдаёт наружу тем, кто его импортирует.
- **Область видимости шаблона (compilation scope)** — «словарь» компонента: какие селекторы, директивы и пайпы компилятор узнаёт в его шаблоне. У модульного компонента её задаёт модуль, у standalone — собственный \`imports\`.
- **Standalone-компонент** — компонент (а также директива или пайп), который не объявлен ни в одном модуле и сам указывает свои зависимости в \`imports\`.
- **\`imports\` компонента** — массив standalone-компонентов, директив, пайпов и целых \`NgModule\`, которые нужны шаблону.
- **\`bootstrapApplication\`** — функция запуска приложения от корневого компонента, без корневого \`AppModule\`.
- **\`ApplicationConfig\`** — объект \`{ providers: [...] }\` с настройками приложения; обычно лежит в \`app.config.ts\`.
- **Провайдер (provider)** — правило для DI: «когда просят токен X, выдай вот это».
- **DI (Dependency Injection, внедрение зависимостей)** — механизм, при котором класс не создаёт сервисы сам, а получает их от Angular.
- **Provide-функции (\`provideRouter\`, \`provideHttpClient\`…)** — функции с префиксом \`provide\`, возвращающие готовый набор провайдеров для фичи. Пришли на смену \`RouterModule.forRoot()\` и подобным.
- **\`EnvironmentProviders\`** — специальный тип, который возвращают \`provide*\`-функции. Его можно положить только на уровень приложения или маршрута, но не в \`providers\` компонента.
- **\`forRoot()\` / \`ModuleWithProviders\`** — старый приём: статический метод модуля, который возвращает модуль вместе с его провайдерами.
- **\`EnvironmentInjector\`** — «прикладной» инжектор: корневой у приложения и дополнительные у маршрутов с \`providers\`. Заменил инжекторы ленивых модулей.
- **\`importProvidersFrom\`** — мост: достаёт провайдеры из старого \`NgModule\`, чтобы подключить их в standalone-приложении.
- **Tree-shaking** — удаление сборщиком кода, на который никто не ссылается.
- **Ленивая загрузка (lazy loading)** — код страницы лежит в отдельном файле-чанке и скачивается только при переходе на неё; \`loadComponent\` грузит так один компонент.
- **Schematic** — генератор-скрипт Angular CLI, который автоматически переписывает код (\`ng generate @angular/core:standalone\`).
- **\`TestBed\`** — тестовый инжектор и «песочница» Angular для юнит-тестов компонентов.

## Как это работает под капотом

Главное, что меняется, — откуда компилятор берёт «словарь» шаблона и откуда DI берёт провайдеры.

1. Чтобы скомпилировать шаблон, компилятору нужно знать, что значит каждый тег и пайп: \`<app-card>\` — это \`CardComponent\`, \`| date\` — это \`DatePipe\`, а \`<section>\` — обычный HTML.
2. В модульном мире этот словарь равен \`declarations\` своего модуля плюс \`exports\` всех импортированных модулей. Поэтому, чтобы понять шаблон, нужно сначала найти модуль, который объявил компонент, а потом транзитивно пройти его импорты.
3. У standalone-компонента словарь — это его собственный \`imports\`. Компилятору никуда не нужно ходить: всё перечислено рядом с шаблоном, а в скомпилированный компонент попадает список \`dependencies\` только с реально использованными в шаблоне вещами.
4. Провайдеры тоже переезжают. Раньше провайдеры модулей сливались в инжектор модуля. Теперь \`bootstrapApplication\` создаёт корневой \`EnvironmentInjector\` из массива \`providers\`, а маршрут с полем \`providers\` получает собственный дочерний \`EnvironmentInjector\` — это прямая замена инжектору ленивого модуля.
5. Ленивая загрузка становится тоньше: \`loadComponent\` вызывает динамический \`import()\`, сборщик выносит компонент со всеми его зависимостями в отдельный чанк, и модуль-обёртка больше не нужна.

### Пример 1. Компонент сам объявляет, чем пользуется

\`\`\`ts
import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-card',
  imports: [RouterLink, CurrencyPipe],   // всё, что нужно шаблону, — здесь
  template: \`
    <a [routerLink]="['/products', id()]">{{ title() }}</a>
    <span>{{ price() | currency: 'EUR' }}</span>
  \`,
})
export class CardComponent {
  id = input.required<number>();
  title = input.required<string>();
  price = input(0);
}
\`\`\`

Если забыть что-то в \`imports\`, сборка падает с понятной ошибкой. Например, страница использует \`<app-card />\`, а \`CardComponent\` в её \`imports\` нет:

\`\`\`text
NG8001: 'app-card' is not a known element:
1. If 'app-card' is an Angular component, then verify that it is included
   in the '@Component.imports' of this component.
\`\`\`

Для пайпа ошибка аналогичная — «не найден пайп с таким именем». Компилятор проверяет словарь каждого шаблона отдельно, поэтому ошибка указывает прямо на компонент, где не хватает импорта.

### Пример 2. Было и стало

\`\`\`ts
// БЫЛО: компонент + модуль, который его объявляет и импортирует зависимости
@NgModule({
  declarations: [CardComponent, CardListComponent],
  imports: [CommonModule, RouterModule],
  exports: [CardListComponent],
})
export class CardsModule {}

// СТАЛО: модуля нет, каждый компонент сам себе модуль
@Component({
  selector: 'app-card-list',
  imports: [CardComponent],
  template: \`@for (c of cards(); track c.id) { <app-card [id]="c.id" [title]="c.title" /> }\`,
})
export class CardListComponent {
  cards = input<{ id: number; title: string }[]>([]);
}
\`\`\`

Обратите внимание: в стандалон-версии не нужен даже \`CommonModule\` — \`@for\` встроен в язык шаблонов. Компонент с первого взгляда говорит, от чего он зависит.

### \`bootstrapApplication\` и \`ApplicationConfig\`

\`bootstrapApplication\` запускает приложение от корневого компонента и принимает массив провайдеров. Это прямая замена \`platformBrowserDynamic().bootstrapModule(AppModule)\`.

\`\`\`ts
// app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};

// main.ts
bootstrapApplication(AppComponent, appConfig);
\`\`\`

Результат: корневой инжектор приложения собран из этого массива, \`AppModule\` не существует. Начиная с Angular 21 \`ApplicationConfig\` импортируется из \`@angular/core\` (раньше — из \`@angular/platform-browser\`, миграция при \`ng update\` переносит импорт сама).

### Функции \`provide*\` вместо \`forRoot()\`

\`forRoot()\` возвращал «модуль с провайдерами», и модуль приходилось импортировать, даже если вам нужна была одна настройка. Функция \`provide*\` возвращает только провайдеры, а дополнительные возможности подключаются функциями \`with*\`:

\`\`\`ts
// было
imports: [RouterModule.forRoot(routes, { bindToComponentInputs: true }), HttpClientModule]

// стало
providers: [
  provideRouter(routes, withComponentInputBinding()),
  provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
]
\`\`\`

Почему это лучше: каждая \`with*\`-фича — отдельная функция. Если вы не вызвали \`withPreloading()\`, код предзагрузки не попадает в бандл (его вычищает tree-shaking). Фичи комбинируются как обычные функции. Свою такую функцию можно написать через \`makeEnvironmentProviders\`:

\`\`\`ts
import { makeEnvironmentProviders, provideAppInitializer, inject } from '@angular/core';

export function provideAnalytics(apiKey: string) {
  return makeEnvironmentProviders([
    { provide: ANALYTICS_KEY, useValue: apiKey },
    provideAppInitializer(() => inject(AnalyticsService).init()),
  ]);
}

// app.config.ts
providers: [provideAnalytics('abc-123')]
\`\`\`

Тип \`EnvironmentProviders\` защищает от ошибки «положил глобальную настройку в компонент»: \`@Component({ providers: [provideHttpClient()] })\` не компилируется — \`Type 'EnvironmentProviders' is not assignable to type 'Provider'\`.

### \`importProvidersFrom\` — мост к старым модулям

Не все библиотеки успели перейти на \`provide*\`. Если библиотека отдаёт только \`SomeModule.forRoot()\`, её провайдеры достают так:

\`\`\`ts
bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(LegacyChartsModule.forRoot({ theme: 'dark' })),
  ],
});
\`\`\`

Это работает на уровне приложения или маршрута. Компоненты и директивы из такого модуля в шаблон подключают иначе — модулем в \`imports\` компонента.

### \`loadComponent\` и \`providers\` у маршрута

\`\`\`ts
export const routes: Routes = [
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'admin',
    providers: [AdminApi, provideState(adminFeature)], // свой EnvironmentInjector
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
];
\`\`\`

Первый маршрут: при переходе на \`/reports\` скачивается отдельный чанк только с \`ReportsComponent\` и его зависимостями. Второй маршрут: \`AdminApi\` создаётся в отдельном инжекторе маршрута и живёт только для админской ветки — раньше для этого делали ленивый \`AdminModule\` с \`providers\`.

### Тестирование: компонент прямо в \`imports\`

\`\`\`ts
await TestBed.configureTestingModule({
  imports: [CardComponent],            // не declarations!
  providers: [provideRouter([])],
}).compileComponents();

const fixture = TestBed.createComponent(CardComponent);
fixture.componentRef.setInput('id', 7);
fixture.componentRef.setInput('title', 'Laptop');
fixture.detectChanges();
// в DOM: ссылка «Laptop», ведущая на /products/7
\`\`\`

Всё, что нужно шаблону, компонент уже принёс с собой, поэтому тест не повторяет содержимое модуля. Подменять приходится только сервисы и провайдеры.

### Совместимость и миграция

Standalone и \`NgModule\` **сосуществуют** в обе стороны: standalone-компонент можно импортировать в \`NgModule\` (через \`imports\` и при желании \`exports\`), а \`NgModule\` — в \`imports\` standalone-компонента. Поэтому крупный проект мигрируют постепенно, папка за папкой.

\`\`\`bash
ng generate @angular/core:standalone
# режимы по очереди:
#  1) convert-to-standalone  — компоненты, директивы, пайпы становятся standalone
#  2) prune-ng-modules       — удаляются опустевшие модули
#  3) standalone-bootstrap   — AppModule заменяется на bootstrapApplication
\`\`\`

Важная деталь с Angular 19: раз standalone теперь по умолчанию, компонент, который **объявлен** в модуле, обязан явно иметь \`standalone: false\` (\`ng update\` проставляет его сам). Если же объявить в \`declarations\` standalone-компонент, компилятор остановит сборку: \`NG6008: Component CardComponent is standalone, and cannot be declared in an NgModule. Did you mean to import it instead?\`

\`NgModule\` не удалён и не помечен устаревшим, но для нового кода считается legacy: документация, генераторы CLI и новые API строятся вокруг standalone.

### Где это применяется на практике

- **Новые приложения и библиотеки** пишутся целиком на standalone: \`app.config.ts\` с \`provide*\`, маршруты с \`loadComponent\`, ни одного модуля.
- **Дизайн-системы и UI-кит**: каждая кнопка, поле и таблица — отдельный standalone-компонент, потребитель импортирует ровно то, что использует.
- **Корпоративный монолит на модулях** мигрируют поэтапно: сначала schematic переводит листовые компоненты, потом исчезают «фичевые» модули, в конце \`AppModule\` превращается в \`bootstrapApplication\`.
- **Микрофронтенды**: standalone-компонент легко отдать наружу как единицу загрузки — у него нет скрытых зависимостей от чужого модуля.
- **Админка и закрытые разделы**: \`providers\` на маршруте дают изолированный инжектор с сервисами и стором только для этой ветки.

## Важные нюансы и подводные камни

- **Забыли добавить в \`imports\`** то, что используется в шаблоне, — ошибка компиляции про неизвестный элемент (\`NG8001\`) или пайп. Это плюс: раньше похожая ошибка искалась по цепочке модулей.
- **Тянут весь \`CommonModule\`** там, где достаточно нового control flow и пары пайпов. В AOT-сборке в зависимости компонента попадают только реально использованные пайпы (компилятор выдаёт \`dependencies: [CommonModule, DatePipe]\` при одном \`date\`), так что это больше про явность, чем про размер. Миграция \`ng generate @angular/core:common-to-standalone\` заменяет \`CommonModule\` точечными импортами.
- **\`providers\` в компоненте — экземпляр на каждый экземпляр компонента**, а не синглтон. Для общего состояния нужен \`providedIn: 'root'\` или провайдер приложения/маршрута.
- **Дублирование \`imports\`** по десяткам компонентов — признак, что пора выносить общий кусок в отдельный компонент или директиву. Допустим и общий массив: \`imports\` принимает вложенные массивы, например \`const FORM_IMPORTS = [ReactiveFormsModule, InputComponent, ErrorPipe]\`.
- **Смешанный проект требует внимания**: один и тот же компонент, доступный и через модуль, и через прямой импорт, легко даёт путаницу «откуда он пришёл и с какими провайдерами». Объявить standalone-компонент в \`declarations\` нельзя вовсе — это \`NG6008\`.
- **\`standalone: false\` с Angular 19 обязателен** для компонентов, которые остаются в \`declarations\`. Без него компонент считается standalone, и модуль перестаёт собираться.
- **\`EnvironmentProviders\` не кладут в компонент.** \`provideHttpClient()\` или \`provideRouter()\` в \`providers\` компонента — ошибка типов. Это защита от случайного второго экземпляра \`HttpClient\` с другими интерсепторами.
- **Некоторые provide-функции устаревают.** Например, \`provideAnimationsAsync()\` помечен \`@deprecated\` с Angular 20.2 (вместо него — \`animate.enter\` / \`animate.leave\`). Перед копированием старых примеров стоит смотреть на пометки в типах.
- **Провайдеры маршрута живут, пока жив маршрут-конфиг**, а не компонент: инжектор маршрута создаётся при первом заходе и по умолчанию не уничтожается при уходе со страницы.

**Плюсы:** зависимости видны в самом компоненте; нет модулей-обёрток; проще ленивая загрузка и тесты; \`provide*\`-функции компонуются и вычищаются tree-shaking; полная совместимость с модулями позволяет мигрировать постепенно.
**Минусы:** длинные повторяющиеся \`imports\` в каждом компоненте; в переходный период в проекте живут два стиля сразу; часть библиотек всё ещё отдаёт только модули и требует \`importProvidersFrom\`.

## Как это спрашивают на собеседовании

**Главный вывод:** standalone-компонент сам объявляет свои зависимости в \`imports\` и не нуждается в \`NgModule\`; с Angular 19 это поведение по умолчанию. Приложение запускается через \`bootstrapApplication\` с \`provide*\`-функциями, а ленивые страницы — через \`loadComponent\`.

Типичные формулировки: «Что такое standalone-компоненты?», «Зачем отказались от NgModule?», «Как запустить приложение без AppModule?», «Как мигрировать большой проект на standalone?».

Что могут спросить следом:

- *Чем \`provide*\`-функции лучше \`forRoot()\`?* — Они возвращают только провайдеры, фичи подключаются отдельными \`with*\`, неиспользуемое вычищает tree-shaking, а тип \`EnvironmentProviders\` не даёт положить их в компонент.
- *Как теперь устроен lazy loading роутов?* — \`loadComponent\` грузит один компонент, \`loadChildren\` — массив маршрутов; изолированные сервисы задаются полем \`providers\` у маршрута.
- *Можно ли смешивать standalone и NgModule?* — Да, в обе стороны; но standalone-компонент нельзя положить в \`declarations\` (\`NG6008\`), а модульным компонентам с v19 нужен \`standalone: false\`.
- *Как подключить библиотеку, у которой есть только модуль?* — Компоненты — модулем в \`imports\` компонента, провайдеры — через \`importProvidersFrom(LibModule.forRoot())\`.

### Ответ на 1 минуту

> Standalone-компонент сам перечисляет свои зависимости в \`imports\` декоратора и не регистрируется ни в каком \`NgModule\`; с Angular 19 это поведение по умолчанию. Под капотом меняется область видимости шаблона: раньше компилятор брал её из модуля, который объявил компонент, и его импортов, теперь — прямо из \`imports\`, поэтому зависимости видны рядом с шаблоном. Приложение стартует через \`bootstrapApplication\` с массивом провайдеров, а вместо \`forRoot\` используются функции \`provideRouter\`, \`provideHttpClient\` и фичи \`with*\`, которые компонуются и вычищаются tree-shaking. Ленивая страница — это \`loadComponent\` без модуля-обёртки, изолированные сервисы задаются через \`providers\` маршрута. Standalone и модули совместимы в обе стороны, так что большой проект я мигрирую постепенно schematic-ом; важно помнить, что модульным компонентам с v19 нужен \`standalone: false\`, а провайдеры в компоненте — это экземпляр на компонент, не синглтон.`,
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
      ru: `## В чём суть

С Angular 17 условия и циклы стали **частью языка шаблонов**, а не директивами, которые надо импортировать. Блоки \`@if\`, \`@for\` и \`@switch\` понимает сам компилятор и превращает их в прямые инструкции рендеринга — без классов-директив, без \`ng-template\` и без \`CommonModule\`.

Аналогия: раньше, чтобы поставить в комнате перегородку, вы вызывали подрядчика (директиву \`NgIf\`), заключали с ним договор (импорт \`CommonModule\`), и он приносил свои инструменты. Теперь перегородка предусмотрена в самом проекте здания: никого не нужно звать, ничего не нужно привозить, и ставится она быстрее.

**Какую проблему решает.** У структурных директив было три хронические боли. Первая — \`else\` и цепочки условий требовали отдельного \`<ng-template #ref>\`, и шаблон превращался в лабиринт ссылок. Вторая — у \`*ngFor\` параметр \`trackBy\` был необязательным, его постоянно забывали, и при каждом обновлении данных Angular пересоздавал весь список: терялся фокус, сбрасывались поля ввода, тормозили большие таблицы. Третья — директивы надо было импортировать и держать в бандле. Новый control flow решает все три: \`@else if\` пишется прямо, \`track\` обязателен, а импортировать ничего не нужно.

## Словарик терминов

- **Структурная директива (structural directive)** — директива, которая добавляет или убирает куски DOM: \`NgIf\`, \`NgForOf\`, \`NgSwitch\`. Пишется со звёздочкой: \`*ngIf\`.
- **Синтаксис со звёздочкой (microsyntax)** — сокращение: \`*ngIf="cond"\` компилятор разворачивает в \`<ng-template [ngIf]="cond">\`.
- **\`ng-template\` / \`TemplateRef\`** — «чертёж» куска разметки, который сам ничего не рисует, пока его не попросят создать.
- **Встроенное представление (embedded view)** — живой экземпляр, созданный по \`ng-template\`: реальные DOM-узлы плюс привязки.
- **\`ViewContainerRef\`** — «гнездо» в DOM, куда директива вставляет и откуда удаляет встроенные представления.
- **Control flow (встроенный поток управления)** — блоки \`@if\`, \`@else if\`, \`@else\`, \`@for\`, \`@empty\`, \`@switch\`, \`@case\`, \`@default\`, встроенные в язык шаблонов.
- **\`track\`** — выражение в \`@for\`, которое задаёт **идентичность** элемента: по нему Angular понимает, что «это тот же самый элемент, что и раньше».
- **Идентичность (identity)** — признак «тот же объект»: либо ссылка на объект в памяти, либо стабильный ключ вроде \`id\`.
- **Согласование (reconciliation)** — алгоритм, который сравнивает старый и новый список и решает, какие DOM-узлы оставить, переместить, создать или удалить.
- **\`trackBy\`** — старый аналог \`track\` у \`*ngFor\`: функция, возвращающая ключ элемента. Была необязательной.
- **Контекстные переменные \`@for\`** — \`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\`: номер элемента, признаки первого/последнего/чётного и длина списка.
- **Сужение типов (type narrowing)** — когда компилятор TypeScript внутри проверки понимает, что значение уже не \`null\`.
- **\`@let\`** — объявление локальной переменной прямо в шаблоне (Angular 18.1+).
- **Schematic** — автоматический генератор-мигратор Angular CLI.

## Как это работает под капотом

Чтобы увидеть выигрыш, сравним, как работают старый и новый подходы.

1. Старый \`*ngIf="cond"\` компилятор разворачивает в \`<ng-template [ngIf]="cond">\`. На этом месте создаётся экземпляр класса \`NgIf\`, которому Angular внедряет \`TemplateRef\` и \`ViewContainerRef\`.
2. При каждом изменении входа \`ngIf\` директива сама решает, создать встроенное представление или удалить. То есть это обычный компонентный код, который живёт в рантайме и должен быть в бандле.
3. \`NgForOf\` ещё тяжелее: на **каждом** проходе change detection он в \`ngDoCheck\` прогоняет коллекцию через \`IterableDiffer\`, а без \`trackBy\` сравнивает элементы по ссылке на объект.
4. Новый \`@if\` компилятор переводит в прямую инструкцию: «покажи шаблон номер N или ничего». Директив-посредников нет — значит, нет их экземпляров, хуков и импорта.
5. \`@for\` компилируется в инструкцию повторителя (repeater), которой передаётся функция ключа из \`track\`. Её алгоритм согласования сначала сравнивает список с начала и с конца (самые частые изменения — добавить в конец или удалить с краю), потом распознаёт перестановки и только оставшиеся элементы ищет по ключу.
6. Поэтому \`track\` обязателен: без ключа алгоритму не на что опираться, и компилятор просто не соберёт шаблон без него.

### Пример 1. Условия: было и стало

\`\`\`html
<!-- было: else и цепочки — через ng-template и ссылки -->
<p *ngIf="user() as u; else guest">{{ u.name }}</p>
<ng-template #guest><p>Guest</p></ng-template>

<!-- стало -->
@if (user(); as u) {
  <p>{{ u.name }}</p>
} @else if (isLoading()) {
  <app-spinner />
} @else {
  <p>Guest</p>
}
\`\`\`

Новый вариант читается сверху вниз, как обычный \`if/else\` в TypeScript. Псевдоним \`as u\` — это и удобство, и сужение типа: внутри блока \`u\` уже точно не \`null\`. А вот повторный вызов сигнала не сужается: \`@if (user()) { {{ user().name }} }\` под \`strictTemplates\` даёт ошибку \`Object is possibly 'null'\`, потому что каждый вызов \`user()\` для TypeScript — новое значение. Поэтому с сигналами используйте \`as\`.

### Пример 2. Цикл, пустое состояние и контекстные переменные

\`\`\`html
<ul>
  @for (item of items(); track item.id; let i = $index, last = $last) {
    <li [class.last]="last">{{ i + 1 }}. {{ item.name }}</li>
  } @empty {
    <li>Список пуст</li>
  }
</ul>
<!-- items = [{id: 1, name: 'Anna'}, {id: 2, name: 'Boris'}]
     → 1. Anna
     → 2. Boris   (у этого li класс "last")
     items = [] → Список пуст -->
\`\`\`

\`@empty\` заменяет отдельный \`*ngIf="items.length === 0"\`. Переменные доступны без объявления (\`$index\`, \`$count\`…), а \`let i = $index\` просто даёт им короткие имена.

### Как устроен \`track\` — эксперимент

Возьмём список, в каждой строке которого есть поле ввода, и пусть пользователь напечатал заметку в строке Анны. Потом в **начало** списка добавляется новый элемент, а затем данные перезагружаются с сервера (те же \`id\`, но новые объекты).

\`\`\`ts
@Component({
  selector: 'app-people',
  template: \`@for (p of people(); track p.id) { <li>{{ p.name }} <input /></li> }\`,
})
export class PeopleComponent {
  people = signal([{ id: 1, name: 'Anna' }, { id: 2, name: 'Boris' }]);

  addFirst() { this.people.update(list => [{ id: 3, name: 'Vera' }, ...list]); }
  reload()   { this.people.set(this.people().map(p => ({ ...p }))); } // как ответ сервера
}
\`\`\`

Результат при разных \`track\` (проверено на Angular 21):

\`\`\`text
track p.id   → после addFirst: Vera="" | Anna="заметка" | Boris=""   ✓ заметка осталась у Анны
               после reload:  переиспользовано 3 из 3 <li>             ✓
track $index → после addFirst: Vera="заметка" | Anna="" | Boris=""   ✗ заметка «уехала» к Вере
track p      → после reload:  переиспользовано 0 из 3 <li>            ✗ весь список пересоздан
               + в консоли: NG0956: The configured tracking expression (track by identity)
                 caused re-creation of the entire collection of size 3.
\`\`\`

Почему так. С \`track $index\` ключ — это позиция: строка номер 0 остаётся строкой номер 0, Angular просто переписывает в ней текст, а состояние DOM (введённый текст, фокус, внутреннее состояние дочернего компонента) остаётся на месте и оказывается у чужого элемента. С \`track p\` ключ — ссылка на объект: после перезагрузки все объекты новые, и Angular считает, что старых элементов больше нет. Только стабильный \`id\` описывает настоящую идентичность.

### \`@switch\`

\`\`\`html
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error')   { <app-error /> }
  @default          { <app-content /> }
}
\`\`\`

Сравнение строгое (\`===\`), «проваливания» в следующий \`@case\`, как в JavaScript без \`break\`, нет — срабатывает ровно одна ветка. Компилятор превращает весь блок в цепочку сравнений \`status === 'loading' ? 1 : status === 'error' ? 2 : 3\` и показывает шаблон с нужным номером. Раньше то же самое требовало трёх директив: \`[ngSwitch]\`, \`*ngSwitchCase\`, \`*ngSwitchDefault\`.

### \`@let\` — локальная переменная в шаблоне

\`\`\`html
@let total = cart().items.length;
@let user = user$ | async;

<p>Товаров: {{ total }}</p>
@if (user) { <p>{{ user.name }}</p> }
\`\`\`

\`@let\` (Angular 18.1+) не относится к ветвлениям, но закрывает ещё один старый костыль — \`*ngIf="data$ | async as data"\`, который использовали только ради переменной. Значение пересчитывается при каждой проверке шаблона.

### Что на самом деле генерирует компилятор

Если скомпилировать \`@for (item of items(); track item.id)\` и \`@switch\`, в выходном JS видно (упрощённо):

\`\`\`js
const _forTrack0 = ($index, $item) => $item.id;          // функция ключа из track
// создание:
ɵɵrepeaterCreate(0, Page_For_1_Template, 2, 3, 'li', null, _forTrack0, ...);
// обновление:
ɵɵrepeater(ctx.items());
ɵɵconditional(tmp === 'loading' ? 5 : tmp === 'ready' ? 6 : -1);
\`\`\`

Ни \`NgIf\`, ни \`NgForOf\` в коде нет — только инструкции ядра. Поэтому в \`imports\` компонента не нужен \`CommonModule\`, а в бандл не попадает код директив.

### Миграция и статус старых директив

\`\`\`bash
ng generate @angular/core:control-flow
\`\`\`

Schematic переписывает \`*ngIf\`, \`*ngFor\`, \`*ngSwitch\` в блоки автоматически; при обновлении до Angular 21 эта же миграция входит в \`ng update\`. Старые директивы ещё работают, но с Angular 20 \`NgIf\`, \`NgForOf\` и \`NgSwitch\` помечены \`@deprecated\` с намерением удалить их в v22. Новый синтаксис — единственный рекомендуемый.

### Где это применяется на практике

- **Большие таблицы и гриды** (тысячи строк, сортировка, пагинация): \`track row.id\` сохраняет DOM строк при сортировке и перезагрузке, и не сбрасывает выделение или раскрытые строки.
- **Списки с редактированием на месте** — инлайн-поля, чекбоксы, раскрытые карточки: неправильный \`track\` даёт классический баг «отметка прыгает на соседнюю строку».
- **Экраны с состояниями загрузки**: \`@if / @else if / @else\` или \`@switch\` по \`status()\` для «загрузка / ошибка / пусто / данные».
- **Пустые состояния** в поиске и фильтрах — \`@empty\` вместо отдельной проверки длины.
- **Миграция легаси-проекта**: schematic переводит шаблоны пачкой, после чего из компонентов удаляется \`CommonModule\`.

## Важные нюансы и подводные камни

- **\`track $index\` для объектов** ломает переиспользование при вставке в начало или середину: узлы переиспользуются по позиции, а не по элементу, и состояние строк «съезжает» на соседей. \`$index\` годится только для статичных списков примитивов.
- **Нестабильный \`track\`** (например, ключ по случайному значению или \`track item\` при иммутабельных обновлениях) пересоздаёт DOM целиком и убивает производительность. В dev-режиме Angular предупреждает об этом кодом \`NG0956\`.
- **Дубликаты ключей** (два элемента с одинаковым \`id\`) — dev-предупреждение \`NG0955\`; поведение согласования становится непредсказуемым.
- **\`@if (user(); as u)\`** — переменная \`u\` видна только внутри этого блока, не в \`@else\`: обращение к ней там — ошибка компиляции.
- **Сигнал без \`as\` не сужается.** \`@if (user()) { {{ user().name }} }\` под \`strictTemplates\` — ошибка «possibly null». Обычное поле класса сужается, вызов функции — нет.
- **Новый синтаксис требует Angular 17+** — это фича компилятора, а не полифилл. Библиотека, собранная под старые версии, его не поймёт.
- **\`@for\` не поддерживает старые \`ngForOf\`-переменные напрямую** — вместо \`index\`, \`first\`, \`last\`, \`even\`, \`odd\`, \`count\` используются \`$index\`, \`$first\`, \`$last\`, \`$even\`, \`$odd\`, \`$count\` (можно переименовать через \`let i = $index\`).
- **В \`track\` нельзя писать тяжёлую логику**: функция ключа вызывается для каждого элемента при каждом обновлении списка. Лучше обращение к полю (\`item.id\`) или простой вызов метода.
- **Символ \`@\` в тексте шаблона** теперь служебный: чтобы вывести его буквально (например, в e-mail), пишут HTML-сущность \`&#64;\`.
- **Цифра «до 90% быстрее»** — из бенчмарков, опубликованных командой Angular при выходе v17, для отдельных сценариев. На реальном приложении выигрыш зависит от размера списков и характера обновлений.

**Плюсы:** не нужно ничего импортировать; читаемые \`@else if\` и \`@empty\`; обязательный \`track\` убирает целый класс багов; меньше рантайм-кода и быстрее согласование списков; удобное сужение типов через \`as\`.
**Минусы:** нужен Angular 17+; при миграции старых шаблонов надо проверить каждый \`track\`; \`@\` в тексте шаблона теперь приходится экранировать; сигналы в условиях требуют \`as\` для сужения типов.

## Как это спрашивают на собеседовании

**Главный вывод:** \`@if\`, \`@for\`, \`@switch\` встроены в компилятор: директивы и \`CommonModule\` не нужны, код меньше и быстрее. Главное отличие \`@for\` — обязательный \`track\`, который задаёт идентичность элементов; для объектов это стабильный \`id\`, а не \`$index\` и не сам объект.

Типичные формулировки: «Чем \`@for\` лучше \`*ngFor\`?», «Зачем нужен \`track\` и что в него писать?», «Что изменилось в шаблонах в Angular 17?».

Что могут спросить следом:

- *Что именно делает \`track\` внутри?* — Даёт ключ, по которому алгоритм согласования понимает, какой старый DOM-узел соответствует новому элементу: оставить, переместить, создать или удалить.
- *Почему \`trackBy\` так часто забывали?* — Он был необязательным, а без него всё «работало» — просто пересоздавало DOM; баги проявлялись только на больших списках и при редактировании.
- *Чем плох \`track $index\`?* — При вставке в начало состояние строк остаётся на позициях и переезжает к чужим элементам.
- *Что будет со старыми директивами?* — Они deprecated с v20 и запланированы к удалению; миграция — \`ng generate @angular/core:control-flow\`.

### Ответ на 1 минуту

> С Angular 17 условия и циклы — это часть языка шаблонов: \`@if\`, \`@for\` и \`@switch\` компилятор переводит прямо в инструкции рендеринга, без директив \`NgIf\` и \`NgForOf\`, поэтому не нужен \`CommonModule\` и в бандл не попадает их код. Читаемость лучше: есть нормальный \`@else if\` вместо \`ng-template\` со ссылками и блок \`@empty\` для пустого списка. Главное отличие \`@for\` — обязательный \`track\`, который задаёт идентичность элемента: по этому ключу алгоритм согласования решает, какие DOM-узлы оставить, переместить или пересоздать. Для объектов я всегда беру стабильный \`id\`: с \`$index\` при вставке в начало состояние строк, например введённый текст, уезжает к соседям, а трекинг по самому объекту при перезагрузке данных пересоздаёт весь список, и Angular предупреждает об этом кодом NG0956. Старые директивы deprecated с v20, и есть schematic для автоматической миграции.`,
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
      ru: `## В чём суть

\`@defer\` (Angular 17+) — это ленивая загрузка **куска шаблона**. Всё, что внутри блока, вместе с его зависимостями (компоненты, директивы, пайпы) компилятор выносит в отдельный JS-чанк, и этот чанк скачивается только когда сработает триггер: элемент доехал до экрана, браузер освободился, пользователь кликнул. По сути это декларативный code-splitting прямо в разметке.

Аналогия: тяжёлые чемоданы не тащат в самолёт заранее — их поднимают в багажный отсек только когда пассажир реально пришёл на рейс. А чтобы пассажиру не ждать у трапа, багаж можно начать грузить заранее, пока грузчики простаивают, — это \`prefetch\`. Пока чемодана нет, на его месте стоит табличка «багаж в пути» — это \`@placeholder\`.

**Какую проблему решает.** Типичная страница дашборда тянет за собой графики, редактор, карту, таблицу с экспортом в Excel. Пользователь видит только верхнюю часть экрана, а скачивает и разбирает весь этот код сразу — первый экран рисуется медленно. Раньше разделить код можно было только по маршрутам (\`loadComponent\`) или вручную через \`ViewContainerRef\` и динамический \`import()\` с кучей шаблонного кода. \`@defer\` даёт то же самое одной конструкцией в шаблоне — с заглушкой, индикатором загрузки и обработкой ошибки.

## Словарик терминов

- **Чанк (chunk)** — отдельный JS-файл, на который сборщик режет приложение; браузер скачивает его по требованию.
- **Code-splitting (разделение кода)** — разбиение бандла на чанки, чтобы на старте грузить только нужное.
- **Динамический \`import()\`** — функция, которая загружает модуль во время работы и возвращает \`Promise\`; по ней сборщик понимает, где резать чанк.
- **Eager / lazy (жадная / ленивая загрузка)** — eager-код едет в основном бандле сразу, lazy — отдельно и позже.
- **Триггер (trigger)** — условие, при котором \`@defer\` начинает загрузку и показ: \`on idle\`, \`on viewport\`, \`when cond\` и другие.
- **\`prefetch\`** — отдельный триггер, который только **скачивает** чанк заранее, но не показывает содержимое.
- **\`@placeholder\`** — то, что показывается до срабатывания триггера.
- **\`@loading\`** — то, что показывается, пока чанк качается.
- **\`@error\`** — то, что показывается, если чанк не загрузился.
- **\`after\` / \`minimum\`** — параметры времени: «показать \`@loading\` не раньше чем через N мс» и «если показали, держать минимум N мс».
- **\`requestIdleCallback\`** — браузерный API «вызови меня, когда главный поток свободен».
- **\`IntersectionObserver\`** — браузерный API, который сообщает, когда элемент появился в видимой области экрана (viewport).
- **SSR (Server-Side Rendering)** — отрисовка HTML на сервере; **гидратация (hydration)** — «оживление» этого HTML в браузере без перерисовки.
- **Инкрементальная гидратация (\`hydrate on …\`)** — режим, в котором серверный HTML блока показывается сразу, а его JS скачивается и оживляется позже по триггеру.

## Как это работает под капотом

Работа \`@defer\` делится на этап сборки и этап выполнения.

1. **Сборка.** Компилятор смотрит, какие компоненты, директивы и пайпы используются внутри \`@defer\`. Если зависимость standalone, лежит в другом файле и **больше нигде в этом компоненте не используется**, статический \`import\` этого файла удаляется, а вместо него генерируется функция с динамическим \`import()\`. Сборщик видит \`import()\` и выносит файл в отдельный чанк.
2. **Первый рендер.** Вместо блока рисуется \`@placeholder\` (или ничего, если его нет). Зависимости плейсхолдера, \`@loading\` и \`@error\` грузятся eager — им нужно быть готовыми сразу.
3. **Подписка на триггер.** Angular вешает наблюдателя: общий для всех блоков \`requestIdleCallback\`, общий \`IntersectionObserver\` для блоков с одинаковыми настройками, слушатели событий на элементе-плейсхолдере, таймер или реактивное выражение для \`when\`.
4. **Срабатывание.** Вызывается функция загрузки, все \`import()\` выполняются параллельно. Пока они идут, показывается \`@loading\` (с учётом \`after\` и \`minimum\`).
5. **Финал.** Всё загрузилось — Angular регистрирует полученные компоненты и рисует основное содержимое. Что-то упало — рисует \`@error\`.
6. **Путь в одну сторону.** Показав основное содержимое, блок к плейсхолдеру больше не возвращается, даже если условие \`when\` снова стало ложным. Скачанный чанк кэшируется: следующий экземпляр того же компонента грузить его уже не будет.

### Пример 1. Что делает компилятор

\`\`\`ts
// page.ts
import { HeavyChart } from './heavy-chart';  // используется только внутри @defer
import { Badge } from './shared';            // используется и снаружи

@Component({
  selector: 'app-page',
  imports: [HeavyChart, Badge],
  template: \`
    <app-badge />
    @defer (on viewport) {
      <heavy-chart />
      <app-badge />
    } @placeholder { <div>Scroll to load</div> }
  \`,
})
export class PageComponent {}
\`\`\`

Фрагмент скомпилированного кода (реальный вывод \`ngc\`):

\`\`\`js
import { Badge } from './shared';   // статического импорта HeavyChart больше нет
const PageComponent_Defer_3_DepsFn = () => [
  import('./heavy-chart').then(m => m.HeavyChart),   // ушёл в отдельный чанк
  Badge,                                              // остался eager
];
\`\`\`

\`HeavyChart\` уехал в чанк, потому что нужен только внутри блока. \`Badge\` используется и снаружи, поэтому остался в основном коде — отложить его невозможно. Если бы \`HeavyChart\` был объявлен в том же файле, что и страница, он тоже остался бы eager.

### Пример 2. Полный блок со всеми частями

\`\`\`html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="data" />
} @placeholder {
  <div>Scroll to load</div>
} @loading (after 100ms; minimum 1s) {
  <spinner />
} @error { <p>Failed</p> }
\`\`\`

Что увидит пользователь в разных сценариях:

\`\`\`text
открыл страницу              → "Scroll to load"
браузер освободился          → чанк тихо скачивается (prefetch on idle), на экране без изменений
доскроллил до блока          → чанк уже в кэше → сразу график, спиннер не появляется
(без prefetch, медленная сеть, чанк едет 3 с)
  0–100 мс                   → всё ещё "Scroll to load"   (after 100ms)
  100 мс – 3 с               → <spinner />
  3 с                        → график
(чанк приехал за 150 мс)     → спиннер показан в 100 мс и держится до 1100 мс (minimum 1s), потом график
(сеть оборвалась)            → "Failed" (тоже не раньше, чем спиннер отбудет свой minimum)
\`\`\`

\`after 100ms\` не показывает спиннер вообще, если чанк приехал быстро — не мигаем зря. \`minimum 1s\` гарантирует, что уж если спиннер показали, он не исчезнет через 50 мс, дёрнув глаз пользователя. У \`@placeholder\` есть только \`minimum\`: \`@placeholder (minimum 500ms)\` не даст заглушке мелькнуть, если триггер сработал сразу после рендера.

### Триггер \`on idle\` — по умолчанию

\`\`\`html
@defer { <app-recommendations /> }        <!-- то же, что @defer (on idle) -->
\`\`\`

Если триггер не указан, компилятор подставляет \`on idle\`. Загрузка начинается, когда браузер свободен: Angular собирает все такие блоки в одну очередь и вызывает их одним \`requestIdleCallback\` (если API нет — через \`setTimeout\`). Подходит для «второстепенного, но видимого» контента.

### Триггер \`on viewport\`

\`\`\`html
@defer (on viewport) {
  <app-comments />
} @placeholder {
  <div class="comments-skeleton">Комментарии</div>
}
\`\`\`

Загрузка начинается, когда плейсхолдер попадает в видимую область. Под капотом — \`IntersectionObserver\`, причём один на все блоки с одинаковыми настройками, а не по наблюдателю на каждый. В свежих версиях (в установленной 21.1 это уже есть) можно передать настройки наблюдателя: \`on viewport({ trigger: anchor, rootMargin: '200px' })\` — начать загрузку за 200 px до появления блока.

### Триггеры \`on interaction\` и \`on hover\`

\`\`\`html
@defer (on interaction) {
  <app-rich-editor />
} @placeholder {
  <button>Редактировать</button>
}
<!-- клик по кнопке или keydown на ней → загрузка → редактор вместо кнопки -->
\`\`\`

\`on interaction\` слушает на элементе события \`click\` и \`keydown\` (не \`focus\`). \`on hover\` слушает \`mouseenter\`, \`mouseover\` и \`focusin\` — поэтому срабатывает и при наведении мыши, и когда пользователь клавиатурой перевёл фокус на элемент. Оба триггера (как и \`on viewport\`) без указания элемента следят за плейсхолдером, и плейсхолдер обязан иметь **ровно один корневой элемент** — иначе ошибка компиляции.

### Триггеры \`on timer\` и \`on immediate\`

\`\`\`html
@defer (on timer(2s)) { <app-promo-banner /> }    <!-- через 2 секунды после рендера -->
@defer (on immediate) { <app-footer-widgets /> }  <!-- сразу, не дожидаясь простоя -->
\`\`\`

\`on immediate\` полезен, когда содержимое нужно как можно скорее, но его не хочется держать в основном бандле. Время пишется в \`ms\` или \`s\`.

### Триггер \`when\` и ссылка на элемент

\`\`\`html
<button #more (click)="expanded.set(true)">Подробнее</button>

@defer (when expanded()) { <app-details /> }        <!-- по условию -->
@defer (on viewport(more)) { <app-related /> }      <!-- следим за чужим элементом -->
\`\`\`

\`when\` принимает любое выражение, в том числе сигнал, и срабатывает, когда оно становится истинным. Срабатывает **один раз**: если \`expanded()\` потом снова станет \`false\`, блок не вернётся к плейсхолдеру. Ссылка \`#more\` позволяет следить не за плейсхолдером, а за любым элементом шаблона — тогда плейсхолдер необязателен. Несколько триггеров через \`;\` работают по принципу «или»: \`@defer (on viewport; on timer(5s))\` — что наступит раньше.

### \`prefetch\` — скачать раньше, показать позже

\`\`\`html
@defer (on interaction; prefetch on idle) {
  <app-report-builder />
} @placeholder { <button>Построить отчёт</button> }
\`\`\`

Пока пользователь читает страницу, браузер в простое скачивает чанк конструктора отчётов. По клику он появляется мгновенно — сеть уже не участвует. \`prefetch\` принимает те же триггеры (\`prefetch on hover\`, \`prefetch when cond\`…), но только загружает код.

### \`@defer\` и SSR

На сервере триггеры не срабатывают: в HTML попадает \`@placeholder\` (или ничего), а основная часть загружается уже в браузере по триггерам. С Angular 19 есть инкрементальная гидратация: при \`provideClientHydration(withIncrementalHydration())\` блок с \`hydrate on viewport\` сервер рендерит **полностью**, пользователь сразу видит контент, а JS блока скачивается и «оживляет» его позже. \`hydrate never\` оставляет блок статичным HTML навсегда.

### Тестирование defer-блоков

\`\`\`ts
TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
const fixture = TestBed.createComponent(PageComponent);
const [block] = await fixture.getDeferBlocks();

await block.render(DeferBlockState.Placeholder);  // проверяем заглушку
await block.render(DeferBlockState.Complete);     // проверяем основной контент
\`\`\`

По умолчанию в тестах режим \`Playthrough\` — блоки ведут себя как в браузере. \`Manual\` позволяет пройти по всем состояниям вручную, не дожидаясь триггеров.

### \`@defer\` или \`loadComponent\` в маршруте

- \`loadComponent\` делит код **по страницам**: чанк качается при переходе на URL, отвечает роутер.
- \`@defer\` делит код **внутри страницы**: чанк качается по триггеру в шаблоне, роутер не участвует, ручной \`import()\` не нужен.
- На практике их сочетают: страница лениво грузится маршрутом, а её тяжёлые нижние блоки — через \`@defer\`.

### Где это применяется на практике

- **Дашборды**: графики и виджеты ниже первого экрана — \`on viewport\` с \`prefetch on idle\`.
- **Тяжёлые редакторы** (rich text, код, диаграммы) — \`on interaction\` по кнопке «Редактировать».
- **Карты, видео, чаты поддержки** — \`on hover\` или \`on interaction\` по превью.
- **Длинные лендинги и каталоги** — блоки отзывов, рекомендаций, похожих товаров по \`on viewport\`.
- **Функции за фича-флагом или правами** — \`when isAdmin()\`: обычный пользователь код админского блока не скачивает вовсе.
- **SSR-сайты** — \`hydrate on viewport\`, чтобы контент был в HTML для SEO, а JS не мешал первой загрузке.

## Важные нюансы и подводные камни

- **Зависимости, использованные и вне \`@defer\`, в отдельный чанк не уедут** — выигрыша не будет. То же самое, если на класс есть ссылка в коде компонента (например, \`viewChild(HeavyChart)\`) или он объявлен в том же файле.
- **Отложить можно только standalone-зависимости.** Компоненты из \`NgModule\` остаются eager.
- **Слишком мелкие блоки** дают много крошечных чанков и лишние сетевые запросы. Откладывают то, что весит заметно: десятки килобайт и больше.
- **\`@placeholder\` грузится eager** — тяжёлый плейсхолдер обнуляет весь смысл. То же касается \`@loading\` и \`@error\`.
- **\`on viewport\` без \`@placeholder\`** не к чему привязать наблюдение: нужен плейсхолдер ровно с одним корневым элементом или явная ссылка на элемент \`on viewport(ref)\`.
- **Без \`@error\` пользователь при обрыве сети остаётся без объяснения**: на экране так и висит плейсхолдер или, что хуже, вечный спиннер из \`@loading\`, а в консоль уходит ошибка \`NG0750\` о том, что \`@error\` не настроен.
- **Повторной попытки нет.** Состояние «загрузка не удалась» запоминается для шаблона компонента: другие экземпляры того же компонента сразу покажут \`@error\` без нового запроса — помогает только перезагрузка страницы. Частый сценарий — деплой посреди сессии, когда старых чанков на сервере уже нет.
- **\`on immediate\` не показывает плейсхолдер.** Блок сразу переходит к загрузке, и если у \`@loading\` есть \`after\`, первые миллисекунды на месте блока пусто (проверено: в окне \`after 100ms\` не видно ни плейсхолдера, ни спиннера).
- **\`when\` срабатывает один раз.** Это не \`@if\`: спрятать содержимое обратно ложным условием нельзя — для этого оборачивают \`@defer\` в \`@if\`.
- **Скачок макета (layout shift).** Если плейсхолдер ниже или выше реального контента, страница «прыгнет» после загрузки. Плейсхолдеру задают размеры, похожие на итоговые.
- **На сервере триггеры не работают** — без инкрементальной гидратации поисковик увидит только плейсхолдер. Важный для SEO контент в обычный \`@defer\` не прячут.

**Плюсы:** code-splitting одной конструкцией в шаблоне; гибкие триггеры и \`prefetch\`; встроенные состояния загрузки и ошибки с защитой от мигания; работает с SSR и инкрементальной гидратацией; удобно тестируется.
**Минусы:** помогает только для standalone-зависимостей, которые не используются снаружи; лишние мелкие чанки при злоупотреблении; риск скачка макета; без инкрементальной гидратации контент не попадает в серверный HTML.

## Как это спрашивают на собеседовании

**Главный вывод:** \`@defer\` — встроенный в шаблон code-splitting: компилятор заменяет статический импорт зависимостей блока на динамический \`import()\`, а чанк скачивается по триггеру. Вокруг — \`@placeholder\`, \`@loading\` с \`after\`/\`minimum\` и \`@error\`, плюс \`prefetch\`, чтобы скачать раньше, чем показать.

Типичные формулировки: «Как работает \`@defer\`?», «Какие триггеры поддерживает \`@defer\`?», «Как лениво загрузить тяжёлый виджет без роутера?».

Что могут спросить следом:

- *Чем \`@defer\` отличается от \`loadComponent\`?* — \`loadComponent\` делит код по маршрутам и управляется роутером, \`@defer\` — внутри шаблона по триггерам.
- *Как \`@defer\` ведёт себя при SSR?* — Сервер рендерит плейсхолдер; с \`withIncrementalHydration()\` и \`hydrate on …\` — полный контент, который оживает позже.
- *Почему компонент не вынесся в отдельный чанк?* — Он используется вне блока, объявлен в том же файле, упомянут в коде класса или не является standalone.
- *Что делают \`after\` и \`minimum\`?* — \`after\` откладывает показ спиннера, \`minimum\` не даёт заглушке или спиннеру мелькнуть на долю секунды.

### Ответ на 1 минуту

> \`@defer\` — это декларативный code-splitting прямо в шаблоне. Компилятор находит зависимости блока, которые больше нигде не используются, убирает их статический импорт и генерирует динамический \`import()\`, поэтому сборщик выносит их в отдельный чанк. До срабатывания триггера показывается \`@placeholder\`, во время загрузки — \`@loading\`, где \`after\` не даёт спиннеру мигнуть на быстрой сети, а \`minimum\` не даёт ему исчезнуть через миг, при сбое — \`@error\`. Триггеры: \`on idle\` по умолчанию, \`on viewport\` через \`IntersectionObserver\`, \`on interaction\` на клик или keydown, \`on hover\`, \`on timer\`, \`on immediate\` и \`when\` по условию, который срабатывает один раз. Через \`prefetch\` чанк можно скачать заранее, а показать по клику. Из нюансов: плейсхолдер грузится eager, зависимость, используемая вне блока, не отложится, а на сервере рендерится только плейсхолдер, если не включена инкрементальная гидратация.`,
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
      ru: `## В чём суть

В современном Angular guard и resolver — это **обычные функции**, а не классы с интерфейсами. Роутер вызывает их внутри **injection-контекста**, поэтому прямо в теле функции работает \`inject()\` и можно взять любой сервис. Функциональные guard-ы появились в Angular 14.2 и с тех пор стали основным способом.

Аналогия: guard — это охранник на входе. Он либо пропускает (\`true\`), либо не пропускает (\`false\`), либо говорит «вам не сюда, вам вон в ту дверь» — и это \`UrlTree\`, то есть перенаправление. Resolver — это гардеробщик наоборот: он успевает принести всё нужное **до** того, как вы вошли в зал, чтобы вам не пришлось стоять посреди комнаты и ждать.

**Какую проблему решает.** Раньше даже трёхстрочная проверка «залогинен ли пользователь» требовала класса с \`@Injectable\`, реализации интерфейса \`CanActivate\`, регистрации провайдера и импорта в нужный модуль. Параметризовать такой guard (например, «пускать только роль admin») было неудобно, комбинировать — тоже. Функция же — это просто функция: её можно вернуть из фабрики, обернуть, скомпоновать и протестировать одной строкой. А сам механизм guard-ов и resolver-ов решает задачу «не показывать экран, на который нельзя, и не показывать его пустым».

## Словарик терминов

- **Guard (охранник маршрута)** — функция, которую роутер вызывает во время навигации, чтобы решить: продолжать, отменить или перенаправить.
- **Resolver (резолвер)** — функция, которая загружает данные **до** активации маршрута; роутер ждёт её результата.
- **Навигация (navigation)** — процесс перехода на URL: сопоставление маршрутов, guard-ы, resolver-ы, загрузка компонента, отрисовка.
- **Injection-контекст** — момент выполнения, когда Angular знает, из какого инжектора брать зависимости; только в нём работает \`inject()\`.
- **\`inject()\`** — функция получения зависимости из DI без конструктора.
- **\`ActivatedRouteSnapshot\`** — «снимок» маршрута, на который идёт переход: параметры, query-параметры, \`data\`.
- **\`RouterStateSnapshot\`** — снимок всего будущего состояния роутера, в том числе целевой \`url\`.
- **\`UrlTree\`** — разобранный URL в виде объекта; вернуть его из guard-а значит «перенаправь туда».
- **\`RedirectCommand\`** — то же перенаправление, но с опциями навигации (например, \`skipLocationChange\`); появился в Angular 18.
- **\`MaybeAsync<T>\`** — тип «значение, \`Promise\` или \`Observable\`»; guard может вернуть любой из трёх вариантов.
- **\`GuardResult\`** — тип результата guard-а: \`boolean | UrlTree | RedirectCommand\`.
- **\`CanActivateFn\`, \`CanActivateChildFn\`, \`CanDeactivateFn<T>\`, \`CanMatchFn\`** — типы функций для четырёх видов guard-ов.
- **\`ResolveFn<T>\`** — тип функции-резолвера, возвращающей данные типа \`T\`.
- **Ленивый чанк (lazy chunk)** — отдельный JS-файл с кодом маршрута, который скачивается по требованию.
- **\`mapToCanActivate\`** — адаптер, превращающий старый класс-guard в функцию.

## Как это работает под капотом

Guard-ы и resolver-ы — это ступени конвейера навигации. Порядок такой (проверено на Angular 21):

1. **Сопоставление (recognize).** Роутер ищет маршруты под URL. На этом шаге выполняются \`canMatch\` у каждого кандидата и скачиваются чанки \`loadChildren\`, чтобы узнать дочерние маршруты.
2. **\`canDeactivate\`** — для всех маршрутов, с которых уходим. Если хоть один не разрешил, дальше не идём.
3. **\`canActivateChild\` и \`canActivate\`** — сверху вниз по дереву: для родителя, затем для ребёнка. Первый отказ останавливает проверку.
4. Каждый guard роутер вызывает через \`runInInjectionContext(инжектор маршрута, …)\` — поэтому \`inject()\` работает, но **только синхронно**, в теле функции.
5. Результат оборачивается в \`Observable\`, и роутер берёт **первое** значение. \`false\` отменяет навигацию, \`UrlTree\` или \`RedirectCommand\` отменяет её и запускает новую — на адрес перенаправления.
6. **Resolver-ы** запускаются только когда все guard-ы разрешили: маршруты по очереди сверху вниз, резолверы одного маршрута — параллельно. Результаты кладутся в \`route.data\`.
7. Только после этого скачивается чанк \`loadComponent\`, создаётся компонент, и в адресной строке меняется URL.

Упрощённо запуск одного guard-а выглядит так:

\`\`\`ts
function runGuard(guard: CanActivateFn, route: ActivatedRouteSnapshot, state: RouterStateSnapshot, injector: EnvironmentInjector) {
  const result = runInInjectionContext(injector, () => guard(route, state)); // здесь работает inject()
  return toObservable(result).pipe(first());                                  // берём первое значение
}
\`\`\`

### Пример 1. Guard авторизации

\`\`\`ts
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(AuthService).isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// в конфиге маршрутов
{ path: 'admin', canActivate: [authGuard], component: AdminComponent }
\`\`\`

\`\`\`text
залогинен     → NavigationEnd /admin
не залогинен  → NavigationCancel /admin (Redirecting to "/login?returnUrl=%2Fadmin")
              → NavigationEnd /login?returnUrl=%2Fadmin
\`\`\`

Возвращать \`UrlTree\` правильнее, чем вызывать \`router.navigate()\` внутри guard-а. С \`UrlTree\` роутер сам отменяет текущую навигацию с причиной «перенаправление» и запускает новую — решение остаётся частью конвейера, учитывается приоритет между guard-ами, а guard остаётся чистой функцией, которую легко тестировать. Императивный \`navigate\` запускает вторую навигацию поверх ещё не завершённой первой и порождает гонки.

### \`CanActivateFn\` — можно ли войти

Самый частый guard: авторизация, права, фича-флаги. Удобно делать **фабрики** — функции, которые возвращают guard с параметром:

\`\`\`ts
export const roleGuard = (role: 'admin' | 'manager'): CanActivateFn => () =>
  inject(AuthService).hasRole(role) || inject(Router).createUrlTree(['/forbidden']);

{ path: 'billing', canActivate: [authGuard, roleGuard('manager')], component: BillingComponent }
\`\`\`

С классами для этого приходилось городить \`data: { role }\` и читать его внутри guard-а; функция просто замыкает параметр.

### \`CanActivateChildFn\` — можно ли войти в дочерние маршруты

\`\`\`ts
{
  path: 'settings',
  component: SettingsShell,
  canActivateChild: [profileCompleteGuard],   // проверяется для каждого ребёнка
  children: [
    { path: 'profile', component: ProfilePage },
    { path: 'security', component: SecurityPage },
  ],
}
\`\`\`

Вешается один раз на родителя и срабатывает при переходе на любой дочерний маршрут, в том числе при переходах между детьми. Удобно, когда правило общее для целой ветки.

### \`CanDeactivateFn<T>\` — можно ли уйти

Классика — предупреждение о несохранённых изменениях. Guard получает экземпляр компонента, с которого уходят:

\`\`\`ts
export interface HasUnsavedChanges { hasUnsavedChanges(): boolean; }

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component.hasUnsavedChanges() ? confirm('Есть несохранённые изменения. Уйти?') : true;

{ path: 'orders/:id/edit', component: OrderEditComponent, canDeactivate: [unsavedChangesGuard] }
\`\`\`

Вместо \`confirm\` в реальном проекте возвращают \`Observable<boolean>\` от собственного диалога — роутер дождётся ответа пользователя.

### \`CanMatchFn\` — может ли маршрут вообще совпасть

\`\`\`ts
{ path: 'dashboard', canMatch: [() => inject(AuthService).isAdmin()], loadComponent: () => import('./admin-dash') },
{ path: 'dashboard', loadComponent: () => import('./user-dash') },
\`\`\`

\`canMatch\` выполняется на шаге сопоставления. Если он вернул \`false\`, маршрут считается несовпавшим, и роутер пробует следующий с тем же путём — так один URL показывает разные экраны разным ролям. Кроме того, он срабатывает **до** скачивания чанка \`loadChildren\`. Получает он не снимок, а конфиг маршрута и оставшиеся сегменты URL: \`(route: Route, segments: UrlSegment[])\`.

### \`ResolveFn<T>\` — данные до активации

\`\`\`ts
export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).getUser(route.paramMap.get('id')!);

{ path: 'users/:id', component: UserPage, resolve: { user: userResolver } }

// в компоненте — три способа прочитать
user = inject(ActivatedRoute).snapshot.data['user'];
user$ = inject(ActivatedRoute).data.pipe(map(d => d['user']));
user = input.required<User>();   // с provideRouter(routes, withComponentInputBinding())
\`\`\`

Роутер не активирует маршрут, пока резолвер не выдал значение. Компонент создаётся уже с данными — не нужно рисовать пустое состояние. Если данных нет, резолвер может вернуть \`new RedirectCommand(router.parseUrl('/404'))\` — это перенаправление.

### Порядок выполнения — эксперимент

Уходим со страницы с \`canDeactivate\` на \`/parent/child\`, где у родителя есть \`canActivate\`, \`canActivateChild\` и резолвер, а у ребёнка — свой \`canActivate\` и резолвер:

\`\`\`text
canDeactivate edit
canActivate parent
canActivateChild parent
canActivate child
resolve parent
resolve child
NavigationEnd /parent/child
\`\`\`

Сначала решается «можно ли уйти», потом «можно ли войти» сверху вниз, и только потом загружаются данные. Резолверы не тратят запросы, если доступ всё равно будет запрещён.

### Несколько guard-ов в одном массиве

\`\`\`ts
canActivate: [
  () => timer(50).pipe(map(() => true)),            // g1: отвечает через 50 мс
  () => inject(Router).createUrlTree(['/login']),   // g2: отвечает сразу
]
// результат: оба вызваны сразу; роутер ждёт g1 → true → применяет редирект g2 → /login
// если бы g1 вернул false — навигация отменилась бы, редирект g2 был бы проигнорирован
\`\`\`

Guard-ы одного массива запускаются одновременно, но решение принимается **по порядку в массиве**: роутер ждёт ответа более ранних, даже если поздний уже ответил. Поэтому дешёвые и важные проверки ставят первыми.

### \`UrlTree\` и \`RedirectCommand\`

\`\`\`ts
// UrlTree — просто «куда»
return router.createUrlTree(['/login']);

// RedirectCommand (Angular 18+) — «куда и как»
return new RedirectCommand(router.parseUrl('/login'), { skipLocationChange: true });
\`\`\`

\`RedirectCommand\` нужен, когда перенаправление должно пройти с опциями навигации: не менять адресную строку, заменить запись в истории (\`replaceUrl\`), передать \`state\`. Его же может вернуть резолвер.

### Совместимость со старыми классами

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class LegacyAuthGuard implements CanActivate {
  canActivate() { return this.auth.isLoggedIn(); }
}

{ path: 'old', canActivate: mapToCanActivate([LegacyAuthGuard]), component: OldPage }
\`\`\`

Передавать класс в \`canActivate\` напрямую (как DI-токен) — устаревший способ: в типах роутера он помечен \`@deprecated\`. Сами интерфейсы \`CanActivate\` и другие остались, а \`mapToCanActivate\`, \`mapToCanMatch\`, \`mapToResolve\` и подобные превращают класс в функцию.

### Тестирование guard-а

\`\`\`ts
TestBed.configureTestingModule({
  providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => false } }],
});
const result = TestBed.runInInjectionContext(() => authGuard(route, state));
expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
\`\`\`

\`TestBed.runInInjectionContext\` даёт guard-у тот же injection-контекст, что и роутер, — поэтому \`inject()\` внутри работает и тест не требует ни компонента, ни навигации.

### Где это применяется на практике

- **Авторизация и роли** в корпоративных приложениях: \`authGuard\` на всю защищённую ветку, \`roleGuard('admin')\` на отдельные разделы.
- **Формы редактирования** (заказы, профили, большие анкеты): \`canDeactivate\` против потери несохранённых данных.
- **Разные экраны на одном URL**: \`canMatch\` выбирает дашборд для админа или для обычного пользователя.
- **Карточка сущности по \`id\`**: резолвер грузит заказ или клиента до открытия страницы и перенаправляет на 404, если записи нет.
- **Онбординг и обязательные шаги**: \`canActivateChild\` не пускает в раздел, пока пользователь не заполнил профиль или не принял условия.
- **Фича-флаги**: guard читает флаг из конфигурационного сервиса и закрывает недоделанные разделы.

## Важные нюансы и подводные камни

- **\`router.navigate\` внутри guard-а вместо \`UrlTree\`** — гонки навигаций и «мигающие» переходы. Возвращайте \`UrlTree\` или \`RedirectCommand\`.
- **Guard, который никогда не выдаёт значение, подвешивает навигацию.** Уточнение к распространённому мифу: бесконечный \`Observable\` сам по себе не страшен — роутер берёт первое значение (\`first()\`) и отписывается, проверено на \`interval\`. Опасен поток, который **не эмитит вовсе**: \`filter\`, который никогда не пропускает, \`Subject\` без начального значения, селектор стора до загрузки. Такая навигация висит, пока её не перебьёт следующая.
- **Тяжёлый resolver задерживает переход** — пользователь видит старый экран и думает, что кнопка не сработала. Нужен глобальный индикатор по событиям роутера (\`NavigationStart\` / \`NavigationEnd\`) или загрузка данных в самом компоненте со скелетоном.
- **Resolver, завершившийся без значения** (например, \`EMPTY\`), отменяет навигацию: \`NavigationCancel\` с причиной «At least one route resolver didn't emit any value». Ошибка в резолвере даёт \`NavigationError\` — её ловят \`catchError\` внутри или \`withNavigationErrorHandler\`.
- **\`CanActivate\` и ленивый код — зависит от вида загрузки.** Чанк \`loadChildren\` скачивается на шаге сопоставления, то есть **до** \`canActivate\`, и отказ его уже не предотвратит — для этого нужен \`canMatch\`. А вот чанк \`loadComponent\` грузится **после** guard-ов и резолверов, поэтому \`canActivate: false\` его не скачает (проверено).
- **\`inject()\` в guard-е работает только синхронно в теле функции** — внутри \`setTimeout\`, \`.then()\` или \`subscribe\` контекста уже нет, и падает ошибка \`NG0203\`. Берите все зависимости в первых строках.
- **Резолверы по умолчанию не перезапускаются при смене query-параметров.** Режим \`runGuardsAndResolvers\` по умолчанию — \`paramsChange\`; для фильтров в query нужен \`'paramsOrQueryParamsChange'\` или \`'always'\`.
- **\`canDeactivate\` не срабатывает при закрытии вкладки или перезагрузке** — это вне роутера, для этого нужен обработчик \`beforeunload\`.
- **Guard — не защита данных.** Код в браузере можно обойти; настоящая проверка прав всегда на бэкенде, guard отвечает только за UX.

**Плюсы:** минимум шаблонного кода; \`inject()\` прямо в функции; фабрики с параметрами и композиция; простые тесты через \`TestBed.runInInjectionContext\`; tree-shaking неиспользуемых guard-ов.
**Минусы:** \`inject()\` только синхронно; легко подвесить навигацию потоком без значений; resolver-ы замедляют переход и скрывают загрузку от пользователя; порядок и приоритет guard-ов нужно понимать, иначе редирект «не срабатывает».

## Как это спрашивают на собеседовании

**Главный вывод:** guard-ы и resolver-ы — это функции, которые роутер вызывает в injection-контексте, поэтому внутри работает \`inject()\`. Guard возвращает \`boolean\`, \`UrlTree\` или \`RedirectCommand\` (можно асинхронно), и для редиректа правильно вернуть \`UrlTree\`, а не звать \`navigate\`. Resolver выполняется после всех guard-ов и кладёт данные в \`route.data\`.

Типичные формулировки: «Как написать guard в современном Angular?», «Чем функциональные guard-ы лучше классовых?», «Какие бывают guard-ы?», «Что такое resolver и когда его не использовать?».

Что могут спросить следом:

- *Чем \`CanMatch\` отличается от \`CanActivate\`?* — \`canMatch\` решает, совпадает ли маршрут вообще, работает на шаге сопоставления (до загрузки \`loadChildren\`) и позволяет перейти к следующему маршруту с тем же путём; \`canActivate\` разрешает вход в уже найденный маршрут.
- *Почему resolver часто заменяют загрузкой в компоненте?* — Резолвер блокирует переход без визуальной обратной связи; загрузка в компоненте сразу показывает страницу со скелетоном.
- *В каком порядке выполняются guard-ы?* — \`canDeactivate\`, затем \`canActivateChild\` и \`canActivate\` сверху вниз, затем резолверы; внутри массива решение по порядку.
- *Как протестировать функциональный guard?* — Вызвать его внутри \`TestBed.runInInjectionContext\` с подменёнными сервисами.

### Ответ на 1 минуту

> Начиная с Angular 14.2 guard-ы и resolver-ы — это обычные функции, а роутер вызывает их в injection-контексте маршрута, поэтому внутри работает \`inject()\`. Это убирает классы с \`@Injectable\`, позволяет делать фабрики вроде \`roleGuard('admin')\` и тестировать guard через \`TestBed.runInInjectionContext\`. Типов четыре: \`CanActivateFn\`, \`CanActivateChildFn\`, \`CanDeactivateFn\` для несохранённых изменений и \`CanMatchFn\`, который работает ещё на шаге сопоставления и позволяет перейти к следующему маршруту с тем же путём. Guard возвращает \`boolean\`, \`UrlTree\` или \`RedirectCommand\`, можно в \`Promise\` или \`Observable\`, роутер берёт первое значение; для редиректа я возвращаю \`UrlTree\`, а не вызываю \`navigate\`, чтобы не было гонок. \`ResolveFn\` выполняется после всех guard-ов и кладёт данные в \`route.data\`. Нюансы: \`inject()\` работает только синхронно, поток без значений подвешивает навигацию, а чанк \`loadChildren\` скачивается ещё до \`canActivate\`.`,
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
      ru: `## В чём суть

Ленивая загрузка — это когда код маршрута лежит в отдельном файле-чанке и скачивается только при переходе на него. \`loadComponent\` лениво грузит **один компонент**, \`loadChildren\` — **целый набор маршрутов**. А \`canMatch\` решает, подходит ли маршрут вообще: если нет, роутер его пропускает, не скачивая его \`loadChildren\`, и пробует следующий маршрут с тем же путём.

Аналогия: библиотека. Вы не тащите домой все книги сразу — берёте ту, что нужна сейчас (\`loadComponent\`), или целую полку по теме (\`loadChildren\`). \`canMatch\` — это библиотекарь на входе: он смотрит на ваш читательский билет **до** того, как пойдёт за книгой в хранилище. Нет доступа к этому залу — он отправляет вас в соседний, а в хранилище за ненужной книгой никто не ходил.

**Какую проблему решает.** Без ленивой загрузки весь код приложения — админка, отчёты, настройки, редкие мастера — попадает в один большой бандл, и пользователь скачивает его целиком ещё до первого экрана. На слабом мобильном интернете это секунды ожидания. Ленивые маршруты дают «платить только за то, что открыл». А \`canMatch\` закрывает две задачи сверху: не грузить ветку, в которую пользователя всё равно не пустят, и показывать разные экраны разным ролям по одному URL.

## Словарик терминов

- **Чанк (chunk)** — отдельный JS-файл, который сборщик выделяет из бандла и браузер скачивает по требованию.
- **Динамический \`import()\`** — загрузка модуля во время работы приложения; возвращает \`Promise\` с содержимым модуля. Именно по нему сборщик режет код на чанки.
- **\`loadComponent\`** — поле маршрута: функция, которая лениво загружает один standalone-компонент.
- **\`loadChildren\`** — поле маршрута: функция, которая лениво загружает массив дочерних маршрутов (\`Routes\`) или, по-старому, \`NgModule\`.
- **Default export (экспорт по умолчанию)** — \`export default class …\`; роутер умеет брать его сам, без \`.then(m => m.X)\`.
- **Сопоставление маршрутов (route matching / recognize)** — первый шаг навигации: роутер подбирает конфиг маршрутов под URL.
- **\`CanMatchFn\`** — guard, который решает, может ли маршрут совпасть с URL; работает на шаге сопоставления.
- **\`CanActivateFn\`** — guard, который решает, можно ли войти в уже найденный маршрут; работает позже.
- **\`canLoad\`** — старый guard «можно ли загрузить детей»; устарел, заменён на \`canMatch\`.
- **Предзагрузка (preloading)** — фоновая загрузка ленивых чанков после старта приложения, чтобы переход был мгновенным.
- **\`PreloadingStrategy\`** — класс, который решает, какие маршруты предзагружать; встроены \`NoPreloading\` и \`PreloadAllModules\`.
- **\`withPreloading()\`** — функция-фича \`provideRouter\`, подключающая стратегию предзагрузки.
- **\`EnvironmentInjector\`** — инжектор, который роутер создаёт для маршрута с полем \`providers\`.

## Как это работает под капотом

Важно понимать, **на каком шаге навигации** какой код скачивается (проверено на Angular 21):

1. Сборщик видит \`import('./admin/admin.routes')\` и выносит этот файл со всеми его зависимостями в отдельный чанк. В основном бандле остаётся только функция-загрузчик.
2. Пользователь переходит на URL. Роутер начинает **сопоставление**: идёт по массиву маршрутов сверху вниз и для каждого кандидата с подходящим путём запускает \`canMatch\`.
3. \`canMatch\` вернул \`false\` — маршрут считается несовпавшим, роутер идёт к следующему в списке. Вернул \`UrlTree\` — навигация перенаправляется.
4. Если у совпавшего маршрута есть \`loadChildren\`, чанк скачивается **прямо на шаге сопоставления**: роутеру нужны дочерние маршруты, чтобы сопоставить остаток URL.
5. Потом выполняются \`canDeactivate\`, \`canActivate\` и резолверы.
6. Только после них скачивается чанк \`loadComponent\` и создаётся компонент.
7. Загрузчики вызываются в injection-контексте, а загруженное кэшируется: повторный переход ничего не качает.

Отсюда главный вывод: для \`loadChildren\` отказ в \`canActivate\` приходит **после** скачивания чанка, а \`canMatch\` — **до**. Для \`loadComponent\` и \`canActivate\` отказывает раньше загрузки.

### Пример 1. \`loadComponent\` — один компонент

\`\`\`ts
export const routes: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
  },
  // если в файле export default class ReportsComponent — можно короче
  { path: 'reports', loadComponent: () => import('./reports/reports.component') },
];
\`\`\`

\`\`\`text
старт приложения       → main.js (без ProfileComponent и ReportsComponent)
переход на /profile    → скачан profile-component.js → компонент отрисован
повторный переход      → ничего не качается, компонент уже в кэше
\`\`\`

\`loadComponent\` работает только со standalone-компонентами: если загрузчик вернёт \`NgModule\`, роутер выбросит ошибку и подскажет использовать \`loadChildren\`. Компонент не может быть указан одновременно через \`component\` и \`loadComponent\`.

### Пример 2. \`loadChildren\` — целая ветка

\`\`\`ts
// app.routes.ts
{
  path: 'admin',
  providers: [AdminApi],                    // свой инжектор на всю ветку
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
},

// admin/admin.routes.ts
export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminHomeComponent },
  { path: 'users', loadComponent: () => import('./users/users.component') },
  { path: 'audit', loadComponent: () => import('./audit/audit.component') },
];
\`\`\`

Чанк \`admin.routes\` содержит только конфиг и то, что он импортирует статически (\`AdminHomeComponent\`). Вложенные \`loadComponent\` дают ещё более мелкие чанки — \`/admin/audit\` откроет админку, не скачивая код аудита. Устаревший вариант \`loadChildren: () => import('./admin.module').then(m => m.AdminModule)\` всё ещё работает ради совместимости.

### \`canMatch\` — один URL, разные экраны

\`\`\`ts
{
  path: 'dashboard',
  canMatch: [() => inject(Auth).isAdmin()], // runs BEFORE the chunk loads
  loadComponent: () => import('./admin-dash').then(m => m.AdminDash),
},
{
  path: 'dashboard',
  loadComponent: () => import('./user-dash').then(m => m.UserDash),
},
\`\`\`

Что происходит при переходе на \`/dashboard\` (проверено):

\`\`\`text
обычный пользователь → canMatch admin → false → маршрут пропущен
                     → скачан user-dash → NavigationEnd /dashboard
администратор        → canMatch admin → true  → скачан admin-dash
\`\`\`

Код админского дашборда обычному пользователю не скачивается. Но обратите внимание: \`canActivate\` здесь не справился бы вовсе — он не умеет «пропустить маршрут», он только отменяет навигацию. Именно возможность провалиться в следующий маршрут с тем же путём — главная причина использовать \`canMatch\` с \`loadComponent\`.

### \`canActivate\` против \`canMatch\` — эксперимент

\`\`\`ts
{ path: 'a', canActivate: [() => false], loadComponent: () => import('./a') },
{ path: 'b', canActivate: [() => false], loadChildren: () => import('./b.routes') },
\`\`\`

\`\`\`text
переход на /a → canActivate a -> false → NavigationCancel     (чанк a НЕ скачан)
переход на /b → скачан чанк b → canActivate b -> false → NavigationCancel
\`\`\`

Для \`loadChildren\` чанк приезжает раньше, чем \`canActivate\` успевает отказать: трафик потрачен, часть кода закрытого раздела уже лежит в браузере. \`canMatch\` на маршруте \`b\` остановил бы загрузку. Для \`loadComponent\` порядок обратный: компонент грузится после guard-ов.

### Предзагрузка: \`withPreloading\`

\`\`\`ts
provideRouter(routes, withPreloading(PreloadAllModules));
\`\`\`

После каждой завершённой навигации предзагрузчик обходит конфиг и в фоне скачивает все ещё не загруженные \`loadComponent\` и \`loadChildren\`. Переходы становятся мгновенными, но есть важная деталь — проверено:

\`\`\`text
маршруты: dashboard (canMatch admin = false) + dashboard (user) + reports (canActivate = false, loadChildren)
после старта с PreloadAllModules:
  load chunk admin-dash      ← canMatch даже не вызывался
  load chunk user-dash
  load chunk reports (children)
\`\`\`

Предзагрузчик **не вызывает** \`canMatch\` и \`canActivate\`: он пропускает только маршруты с устаревшим \`canLoad\`. Значит, с \`PreloadAllModules\` «защита от скачивания» через \`canMatch\` перестаёт работать.

### Своя стратегия предзагрузки

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class FlagPreloading implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] ? load() : of(null);
  }
}

provideRouter(routes, withPreloading(FlagPreloading));
{ path: 'reports', data: { preload: true }, loadComponent: () => import('./reports') }
// после старта: скачан только reports
\`\`\`

Стратегия получает каждый ленивый маршрут и функцию \`load\`: вызвали — чанк качается, вернули \`of(null)\` — нет. Так предзагружают только популярные разделы, учитывают роль пользователя или медленную сеть (например, через \`navigator.connection\`, где он поддерживается).

### Ошибка загрузки чанка

\`\`\`ts
provideRouter(routes, withNavigationErrorHandler((e: NavigationError) => {
  if (String(e.error?.message).includes('dynamically imported module')) {
    location.reload();   // после деплоя старых чанков на сервере уже нет
  }
}));
\`\`\`

Если \`import()\` упал (сеть, или вы задеплоили новую версию, и файлы с прежними хэшами удалены), навигация заканчивается \`NavigationError\`, а промис \`navigate()\` отклоняется. Без обработки пользователь кликает по ссылке, и ничего не происходит. Текст ошибки зависит от браузера и сборщика, поэтому условие лучше подбирать под свой стек.

### Где это применяется на практике

- **Корпоративные приложения с разделами**: админка, отчёты, настройки, биллинг — каждый раздел через \`loadChildren\` с собственными \`providers\`.
- **Разные роли на одном URL**: \`/dashboard\` для менеджера и для оператора — два маршрута с \`canMatch\`.
- **Редкие тяжёлые экраны** (конструктор отчётов, импорт Excel, редактор шаблонов) — \`loadComponent\`, чтобы не утяжелять старт.
- **Фича-флаги и A/B-тесты**: \`canMatch\` выбирает новую или старую версию страницы.
- **Мобильные пользователи**: своя стратегия предзагрузки только для разделов, куда реально ходят, вместо \`PreloadAllModules\`.
- **Мониторинг**: события \`RouteConfigLoadStart\` / \`RouteConfigLoadEnd\` роутера показывают, сколько грузится ленивая ветка.

## Важные нюансы и подводные камни

- **\`canActivate\` вместо \`canMatch\` для \`loadChildren\`** — чанк всё равно скачивается, экономии трафика нет. Для \`loadComponent\` это не так: компонент грузится после guard-ов (уточнение к распространённому утверждению «\`canActivate\` никогда не мешает загрузке»).
- **\`PreloadAllModules\` игнорирует \`canMatch\`.** Предзагрузчик скачивает и «защищённые» чанки, поэтому скрытие кода от неавторизованных и полная предзагрузка несовместимы. Нужна своя стратегия, которая проверяет права.
- **Общая зависимость, используемая и в eager-коде**, попадёт в основной бандл — ленивый чанк не поможет. Если же её используют несколько ленивых чанков, сборщик вынесет её в общий чанк.
- **\`PreloadAllModules\` на большом приложении** сводит выигрыш к нулю по трафику: качается всё сразу, просто чуть позже. Первый экран при этом не страдает.
- **Ошибка загрузки чанка** (деплой во время сессии, обрыв сети) даёт непонятную ошибку навигации — нужна обработка через \`withNavigationErrorHandler\` или событие \`NavigationError\`.
- **Слишком много мелких lazy-маршрутов** — много запросов и хуже кэширование. Хорошая граница чанка — раздел, в который пользователь заходит целиком.
- **Код за \`canMatch\` всё равно публичен.** Скачать чанк можно напрямую по имени файла; \`canMatch\` экономит трафик и улучшает UX, но не защищает данные — права проверяет сервер.
- **\`canLoad\` устарел** и заменён на \`canMatch\`; единственное его отличие, которое ещё встречается, — предзагрузчик пропускает маршруты с \`canLoad\`.
- **Инжектор маршрута с \`providers\`** создаётся при первом заходе и по умолчанию живёт до конца работы приложения — сервисы ветки не уничтожаются при уходе со страницы. Автоматическую очистку в 21.1 добавили только как экспериментальную опцию \`withExperimentalAutoCleanupInjectors()\`.

**Плюсы:** быстрый старт — платим только за открытые разделы; \`loadComponent\` без модулей-обёрток; \`canMatch\` позволяет не грузить недоступные ветки и делать разные экраны на одном URL; гибкая предзагрузка.
**Минусы:** задержка при первом переходе на раздел без предзагрузки; ошибки загрузки чанков после деплоя; легко ошибиться с тем, на каком шаге что скачивается; предзагрузка обходит \`canMatch\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`loadComponent\` лениво грузит один standalone-компонент, \`loadChildren\` — массив маршрутов; оба построены на динамическом \`import()\`. \`canMatch\` решает, совпадает ли маршрут вообще: он работает на шаге сопоставления, поэтому не даёт скачать \`loadChildren\` и позволяет роутеру перейти к следующему маршруту с тем же путём.

Типичные формулировки: «Как сделать ленивую загрузку в standalone-приложении?», «Чем \`loadComponent\` отличается от \`loadChildren\`?», «Зачем нужен \`CanMatch\`, если есть \`CanActivate\`?».

Что могут спросить следом:

- *Чем \`CanMatch\` отличается от \`CanActivate\`?* — \`canMatch\` отвечает «подходит ли маршрут», работает до загрузки \`loadChildren\` и позволяет провалиться в следующий маршрут; \`canActivate\` только отменяет навигацию в уже найденный маршрут.
- *Как выбрать стратегию предзагрузки?* — Маленькое приложение — \`PreloadAllModules\`; большое — своя стратегия по флагу в \`data\`, роли или качеству сети.
- *Что будет, если после деплоя старый чанк исчез?* — \`NavigationError\`; обрабатывают через \`withNavigationErrorHandler\`, обычно перезагрузкой страницы.
- *Чем это отличается от \`@defer\`?* — Ленивые маршруты делят код по страницам, \`@defer\` — внутри шаблона по триггерам.

### Ответ на 1 минуту

> Ленивая загрузка в современном Angular делается через \`loadComponent\` для одного standalone-компонента и \`loadChildren\` для массива маршрутов; оба построены на динамическом \`import()\`, и сборщик выносит их в отдельные чанки. Важно, на каком шаге что качается: чанк \`loadChildren\` нужен роутеру ещё при сопоставлении URL, поэтому он скачивается до \`canActivate\`, а \`loadComponent\` грузится уже после guard-ов. \`CanMatchFn\` отвечает не «пускать ли пользователя», а «подходит ли маршрут вообще» и работает на шаге сопоставления: при отказе ветка не скачивается, а роутер пробует следующий маршрут с тем же путём, так я делаю разные дашборды для ролей на одном URL. Поверх этого — предзагрузка через \`withPreloading\`; нюанс в том, что \`PreloadAllModules\` не вызывает \`canMatch\` и качает всё, поэтому в больших проектах я пишу свою стратегию и обрабатываю ошибки загрузки чанков после деплоя.`,
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
      ru: `## В чём суть

Разница в том, **где живёт источник истины** и **кто кого создаёт**. В template-driven формах модель вырастает из шаблона: директивы \`ngModel\` сами создают \`FormControl\`-ы и регистрируют их в форме. В reactive формах модель создаётся в классе компонента, а шаблон только привязывается к уже готовым объектам. Внизу у обоих подходов одно и то же ядро — дерево \`FormGroup\` / \`FormControl\` и мост к DOM через \`ControlValueAccessor\`.

Аналогия: template-driven — это дом, который строят «по месту»: плотник пришёл, посмотрел на стену и сколотил полку. Reactive — это дом по чертежу: сначала полный проект в коде, потом стройка по нему. Чертёж можно проверить, обсудить и протестировать, ещё не забив ни одного гвоздя.

**Какую проблему решает понимание этой разницы.** На собеседовании вопрос не про синтаксис, а про последствия. От того, кто создаёт модель, зависит, когда она доступна (сразу или через микрозадачу), можно ли тестировать форму без DOM, насколько легко строить динамические поля, как работают типы. Тот, кто не понимает механику, получает \`undefined\` в \`ngOnInit\`, «теряет» disabled-поля при отправке и не может объяснить, почему \`form.controls\` пуст в \`ngAfterViewInit\`.

## Словарик терминов

- **Модель формы (form model)** — дерево объектов, которое хранит значения, ошибки и статусы полей: \`FormGroup\`, \`FormControl\`, \`FormArray\`.
- **\`FormControl\`** — одно поле: значение, валидаторы, статус (\`VALID\`, \`INVALID\`, \`PENDING\`, \`DISABLED\`), флаги \`touched\` и \`dirty\`.
- **\`FormGroup\` / \`FormArray\`** — контейнеры: группа полей по именам и список полей по индексам.
- **Источник истины (source of truth)** — место, где «главная» версия данных; остальные места её отражают.
- **Template-driven формы** — подход, где форма описывается в шаблоне директивами \`ngModel\`, \`ngModelGroup\`, \`NgForm\` из \`FormsModule\`.
- **Reactive формы** — подход, где модель создаётся в классе, а шаблон привязывается к ней директивами \`[formGroup]\`, \`formControlName\`, \`[formControl]\` из \`ReactiveFormsModule\`.
- **\`NgForm\`** — директива, которая автоматически цепляется к каждому \`<form>\` при импорте \`FormsModule\` и создаёт корневую \`FormGroup\`.
- **\`ControlValueAccessor\` (CVA)** — интерфейс-переводчик между \`FormControl\` и DOM-элементом: пишет значение в элемент и сообщает о вводе пользователя.
- **\`DefaultValueAccessor\`** — встроенный CVA для \`<input>\` и \`<textarea>\`: слушает события \`input\` и \`blur\`.
- **Микрозадача (microtask)** — колбэк, который выполнится сразу после текущего синхронного кода, но позже него (\`Promise.resolve().then(...)\`).
- **\`valueChanges\` / \`statusChanges\`** — \`Observable\`-потоки изменений значения и статуса контрола.
- **\`FormBuilder\`** — сервис-помощник, который короче создаёт группы и контролы.
- **Типизированные формы (typed forms)** — с Angular 14 контролы — дженерики, и компилятор знает тип значения каждого поля.
- **Signal Forms** — экспериментальный (Angular 21) третий подход: форма строится вокруг сигнала с моделью данных.

## Как это работает под капотом

И \`ngModel\`, и \`formControlName\` в итоге делают одно и то же: связывают объект \`FormControl\` с DOM-элементом. Различается, **кто создаёт объект и когда**.

1. Template-driven: директива \`NgModel\` при создании заводит собственный \`FormControl\` (это просто поле класса директивы).
2. Затем она просит родительский \`NgForm\` зарегистрировать этот контрол в его \`FormGroup\`. \`NgForm\` делает регистрацию **в микрозадаче**, а не сразу — поэтому во время первого прохода change detection форма ещё пустая.
3. Значение из \`[(ngModel)]\` тоже записывается в контрол в микрозадаче: сначала элемент получает \`null\`, потом настоящее значение.
4. Reactive: объекты \`FormGroup\` и \`FormControl\` создаёте вы сами, в классе, до того как Angular вообще увидел шаблон.
5. Директивы \`[formGroup]\` и \`formControlName\` в своём \`ngOnChanges\` находят готовый контрол по имени и **синхронно** подключают его к элементу.
6. В обоих случаях подключение — это одна и та же функция \`setUpControl\`: записать значение в элемент через \`writeValue\`, передать колбэки \`registerOnChange\` и \`registerOnTouched\`, подписать валидаторы.

### Общее ядро: модель и \`ControlValueAccessor\`

Что делает \`setUpControl\` для обычного \`<input>\` (упрощённо по исходникам Angular):

\`\`\`ts
function setUpControl(control: FormControl, dir: NgControl) {
  dir.valueAccessor.writeValue(control.value);          // модель → DOM
  dir.valueAccessor.setDisabledState?.(control.disabled);
  dir.valueAccessor.registerOnChange((v) => {           // DOM → модель (на событие input)
    control.markAsDirty();
    control.setValue(v, { emitModelToViewChange: false });
  });
  dir.valueAccessor.registerOnTouched(() => control.markAsTouched()); // на blur
  control.registerOnChange((v) => dir.valueAccessor.writeValue(v));  // setValue() → DOM
}
\`\`\`

\`DefaultValueAccessor\` для \`<input>\` слушает \`input\` и \`blur\` и пишет в свойство \`value\` элемента. Поэтому и \`ngModel\`, и \`formControlName\` одинаково работают с любым кастомным компонентом, который реализует CVA. Разница подходов — выше этого слоя.

### Template-driven: модель вырастает из шаблона

\`\`\`ts
@Component({
  selector: 'app-signup',
  imports: [FormsModule],
  template: \`
    <form #f="ngForm" (ngSubmit)="save(f.value)">
      <input name="email" [(ngModel)]="user.email" required email />
      <div ngModelGroup="address">
        <input name="city" [(ngModel)]="user.city" />
      </div>
      <button [disabled]="f.invalid">Save</button>
    </form>
  \`,
})
export class SignupComponent {
  user = { email: 'a@b.c', city: '' };
  form = viewChild<NgForm>('f');
}
\`\`\`

Когда что доступно (проверено на Angular 21 с аналогичной формой):

\`\`\`text
ngOnInit              → ссылки на NgForm ещё нет: запрос к шаблону выполнится позже
ngAfterViewInit       → NgForm есть, но controls = []  value = {}
следующая микрозадача → controls = ['email', ...]  value = {"email":"a@b.c", ...}  status = VALID
\`\`\`

Модель здесь — следствие шаблона. \`NgForm\` создал корневую группу, каждый \`ngModel\` с атрибутом \`name\` добавил свой контрол, \`ngModelGroup\` — вложенную группу \`address\`. Валидация описана атрибутами \`required\`, \`email\`, \`minlength\`, \`pattern\` — это тоже директивы, которые добавляют валидаторы к контролу.

### Reactive: шаблон привязывается к готовой модели

\`\`\`ts
@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form" (ngSubmit)="save()">
      <input formControlName="name" />
      <input formControlName="email" />
      <button [disabled]="form.invalid">Save</button>
    </form>
  \`,
})
export class SignupComponent {
  // Reactive: model lives in code, available synchronously
  form = inject(FormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });
}
\`\`\`

Модель существует до шаблона, поэтому с ней можно работать вообще без DOM — например, в юнит-тесте или прямо в Node:

\`\`\`ts
form.valueChanges.subscribe(v => console.log('value', JSON.stringify(v)));
console.log(form.status);                 // INVALID
form.controls.name.setValue('Anna');      // value {"name":"Anna","email":""}
form.controls.email.setValue('anna@');    // value {"name":"Anna","email":"anna@"}
console.log(form.controls.email.errors);  // { email: true }
form.patchValue({ email: 'anna@corp.com' });
console.log(form.valid);                  // true
\`\`\`

Всё работает синхронно: вызвали \`setValue\` — значение, ошибки и статус уже пересчитаны, подписчики \`valueChanges\` уже получили событие.

### Эксперимент: кто и когда пишет значение в элемент

Возьмём один и тот же кастомный контрол с логированием методов CVA и подключим его двумя способами — \`[formControl]="ctrl"\` (значение 3) и \`[(ngModel)]="score"\` (значение 4):

\`\`\`text
--- reactive
writeValue(3)
setDisabledState(false)
registerOnChange
registerOnTouched
--- ngModel
writeValue(null)
setDisabledState(false)
registerOnChange
registerOnTouched
(синхронный код закончился)
writeValue(4)
\`\`\`

Reactive отдаёт элементу настоящее значение сразу. \`ngModel\` сначала подключает пустой контрол (\`null\`), а реальное значение доезжает в микрозадаче. Отсюда частый баг кастомных контролов: \`writeValue(null)\` на старте нужно обрабатывать без ошибок.

### Динамические формы: \`FormArray\`

\`\`\`ts
const phones = new FormArray([new FormControl('+111', { nonNullable: true })]);
phones.push(new FormControl('+222', { nonNullable: true }));
console.log(phones.value);   // ['+111', '+222']
phones.removeAt(0);
console.log(phones.value);   // ['+222']
\`\`\`

В reactive добавить или удалить поле — это вызов метода у модели, шаблон просто проходит по \`controls\` через \`@for\`. В template-driven то же самое делают через массив в данных и \`ngModel\` с уникальным \`name\` для каждого элемента — работает, но модель формы перестраивается асинхронно, и управлять ею сложнее.

### Signal Forms — третий путь (Angular 21, experimental)

\`\`\`ts
import { form, required, email } from '@angular/forms/signals';

model = signal({ name: '', email: '' });
f = form(this.model, (p) => { required(p.name); email(p.email); });

f().valid();                     // false
f.name().value.set('Anna');      // пишет прямо в this.model
// в шаблоне: <input [formField]="f.name" />
\`\`\`

Здесь источник истины — обычный сигнал с данными, а форма — набор реактивных «состояний полей» поверх него. API помечен \`@experimental 21.0.0\`, поэтому для продакшен-кода сегодня выбирают между reactive и template-driven, но знать направление развития полезно.

### Как выбрать

- **Reactive** — для серьёзных приложений: сложная валидация, кросс-полевые проверки, динамические поля, типизация, тесты без DOM, реакция на изменения через \`valueChanges\`.
- **Template-driven** — для простых форм на пару полей, где важна скорость написания: логин, подписка на рассылку, фильтр из двух инпутов.
- **Не смешивайте подходы в одной форме**: \`ngModel\` на поле с \`formControlName\` — устаревшая с Angular 6 комбинация.
- **Signal Forms** — пробовать в новых экспериментальных модулях, следить за стабилизацией API.

### Где это применяется на практике

- **Корпоративные анкеты и мастера** (оформление кредита, онбординг клиента): reactive-модель на десятки полей, шаги как вложенные \`FormGroup\`, валидация через сервис.
- **Динамические формы по конфигу с сервера** — поля и правила приходят в JSON, модель строится в коде через \`FormGroup\` и \`FormArray\`.
- **Табличное редактирование**: \`FormArray\` строк, каждая строка — \`FormGroup\`.
- **Фильтры и поиск**: \`valueChanges\` + \`debounceTime\` + \`switchMap\` к API.
- **Простые формы входа или обратной связи** — template-driven, чтобы не заводить модель ради двух полей.

## Важные нюансы и подводные камни

- **Обращение к контролу template-driven формы в \`ngOnInit\`** даёт \`undefined\`: ссылки на шаблон ещё нет, а в \`ngAfterViewInit\` \`form.controls\` ещё пуст — регистрация идёт в микрозадаче. Уточнение к старой формулировке «контролы создаются асинхронно»: сам \`FormControl\` директива \`NgModel\` создаёт сразу, асинхронны регистрация в форме и запись значения.
- **Забытый \`name\` у \`ngModel\` внутри \`<form>\`** — контрол не может зарегистрироваться в форме, и Angular бросает ошибку \`NG01352\`: нужен атрибут \`name\` или \`[ngModelOptions]="{ standalone: true }"\`.
- **\`[(ngModel)]\` вместе с \`formControlName\`** — устаревшая (deprecated с Angular 6) комбинация. Она всё ещё работает, но выдаёт предупреждение в консоль и путает источник истины — так делать нельзя.
- **Подписка на \`valueChanges\` без отписки** — утечка; нужен \`takeUntilDestroyed\` или async pipe.
- **\`form.value\` не включает disabled-контролы** — за полным значением идти в \`getRawValue()\`. Исключение: если отключены **все** контролы группы, \`value\` возвращает их все.
- **\`setValue\` требует все поля, \`patchValue\` — любые.** \`setValue({ name: 'x' })\` у группы с полем \`email\` бросает \`NG01002: Must supply a value for form control with name: 'email'\` — это защита от опечаток и забытых полей.
- **\`emitEvent: false\`** в \`setValue\` не будит \`valueChanges\` — полезно, чтобы не зациклить взаимно зависимые поля.
- **Двусторонняя привязка в template-driven копирует данные** в объект компонента на каждый ввод — для больших форм это незаметно, но «откатить» изменения сложнее, чем в reactive, где исходные данные не трогаются до \`submit\`.

**Плюсы:** reactive — синхронная предсказуемая модель, типизация, тестируемость без DOM, удобные динамические формы и потоки; template-driven — минимум кода для простых форм и привычный \`[(ngModel)]\`.
**Минусы:** reactive — больше кода и «церемонии» для простых случаев; template-driven — асинхронная модель, сложная валидация и динамика, слабее тестируемость; смешивание подходов ведёт к путанице.

## Как это спрашивают на собеседовании

**Главный вывод:** оба подхода строят одно и то же дерево \`FormGroup\`/\`FormControl\` и подключают его к DOM через \`ControlValueAccessor\`. В template-driven модель создают директивы из шаблона и регистрируют асинхронно, в reactive — вы создаёте её в классе, и она доступна синхронно.

Типичные формулировки: «Чем reactive-формы отличаются от template-driven под капотом?», «Почему в \`ngOnInit\` нельзя достучаться до контрола template-driven формы?», «Какие формы вы выбираете и почему?».

Что могут спросить следом:

- *Что такое \`ControlValueAccessor\`?* — Интерфейс-мост между контролом и элементом: \`writeValue\`, \`registerOnChange\`, \`registerOnTouched\`, \`setDisabledState\`.
- *Чем \`value\` отличается от \`getRawValue()\`?* — \`value\` пропускает disabled-поля, \`getRawValue()\` возвращает все.
- *Можно ли тестировать reactive-форму без компонента?* — Да, модель — обычные объекты, её создают и проверяют в чистом юнит-тесте.
- *Что нового в формах Angular 21?* — Экспериментальные Signal Forms: форма поверх сигнала с моделью, директива \`[formField]\`.

### Ответ на 1 минуту

> Принципиальная разница — в источнике истины и направлении создания модели. Оба подхода в итоге строят одно и то же дерево \`FormGroup\` и \`FormControl\` и подключают его к элементам через \`ControlValueAccessor\`. В template-driven модель вырастает из шаблона: каждая директива \`ngModel\` заводит свой контрол и регистрирует его в \`NgForm\`, но регистрация и запись значения идут в микрозадаче, поэтому в \`ngOnInit\` формы ещё нет, а в \`ngAfterViewInit\` её \`controls\` пусты. В reactive я создаю модель в классе через \`FormBuilder\`, она доступна синхронно, а шаблон лишь привязывается к ней через \`formControlName\`. Поэтому для серьёзных форм я выбираю reactive: тесты без DOM, \`valueChanges\`, типизация, динамические поля через \`FormArray\`. Template-driven оставляю для простых форм. Из ловушек: \`ngModel\` внутри формы без \`name\` даёт ошибку, а \`value\` не включает disabled-поля — для отправки нужен \`getRawValue\`.`,
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
      ru: `## В чём суть

\`ControlValueAccessor\` (CVA) — это **переводчик** между Angular Forms API (то есть \`FormControl\`) и вашим элементом ввода. Форма говорит «значение теперь такое» — компонент это показывает; пользователь что-то нажал — компонент сообщает форме. Все встроенные связки для \`<input>\`, чекбоксов, радио и \`<select>\` (\`DefaultValueAccessor\`, \`CheckboxControlValueAccessor\` и другие) реализуют ровно этот интерфейс, и ваш компонент может встать с ними в один ряд.

Аналогия: переводчик на переговорах. Форма говорит на своём языке («значение», «отключено», «тронуто»), ваш компонент со звёздочками рейтинга — на своём («клик по третьей звезде»). CVA сидит между ними и переводит в обе стороны, и ни одна сторона даже не подозревает, что собеседник говорит на другом языке.

**Какую проблему решает.** В реальных проектах половина полей — не голые \`<input>\`: выбор даты, рейтинг, мультиселект с поиском, поле телефона с маской, переключатель-тумблер. Без CVA каждый такой компонент придётся связывать с формой вручную через \`@Input\`/\`@Output\` и подписки, а валидация, \`touched\`, \`disable()\` и \`reset()\` не будут работать «из коробки». С CVA компонент подключается одной строкой \`formControlName="rating"\` и ведёт себя как нативный инпут — это основа любой дизайн-системы.

## Словарик терминов

- **\`ControlValueAccessor\` (CVA)** — интерфейс из четырёх методов: \`writeValue\`, \`registerOnChange\`, \`registerOnTouched\` и необязательный \`setDisabledState\`.
- **\`FormControl\`** — объект модели формы: хранит значение, ошибки, статус и флаги \`touched\` / \`dirty\`.
- **Директива формы (\`NgControl\`)** — то, что вы пишете на элементе: \`formControlName\`, \`[formControl]\`, \`ngModel\`. Она находит CVA и связывает его с \`FormControl\`.
- **\`NG_VALUE_ACCESSOR\`** — DI-токен, под которым элемент «объявляет»: «вот мой переводчик для форм».
- **Multi-провайдер (\`multi: true\`)** — провайдер, который не заменяет, а **добавляет** значение в массив под тем же токеном.
- **\`useExisting\`** — «под этим токеном отдай уже существующий экземпляр», здесь — сам компонент.
- **\`forwardRef\`** — обёртка-функция для ссылки на класс, который ещё не объявлен в момент вычисления выражения.
- **\`touched\` / \`dirty\`** — «пользователь побывал в поле и ушёл из него» и «пользователь изменил значение».
- **\`OnPush\`** — стратегия проверки изменений, при которой компонент перерисовывается только по сигналам, событиям внутри него, новым входам или \`markForCheck()\`.
- **\`markForCheck()\`** — метод \`ChangeDetectorRef\`, помечающий компонент «нужно перепроверить».
- **\`NG_VALIDATORS\` / \`Validator\`** — токен и интерфейс (\`validate(control)\`) для собственной валидации компонента.
- **\`model()\`** — сигнальный вход-выход Angular; на нём построены кастомные контролы экспериментальных Signal Forms.

## Как это работает под капотом

Связь устанавливает директива формы, стоящая на вашем элементе (проверено по исходникам и экспериментом на Angular 21):

1. Директива (\`FormControlName\`, \`FormControlDirective\` или \`NgModel\`) просит у DI токен \`NG_VALUE_ACCESSOR\` **только с этого элемента** и получает массив — все переводчики, которые объявили себя на нём.
2. Из массива выбирается один: ваш кастомный важнее встроенных, встроенный (чекбокс, select…) важнее \`DefaultValueAccessor\`. Два кастомных на одном элементе — ошибка.
3. Функция \`setUpControl\` подключает переводчик: вызывает \`writeValue(текущее значение)\`, затем \`setDisabledState(disabled)\`, затем передаёт колбэки в \`registerOnChange\` и \`registerOnTouched\`.
4. Пользователь меняет значение — компонент вызывает сохранённый колбэк \`onChange(v)\`. Форма помечает контрол \`dirty\`, записывает значение, прогоняет валидаторы и шлёт \`valueChanges\`.
5. Пользователь уходит из компонента — компонент вызывает \`onTouched()\`, контрол становится \`touched\` (а при \`updateOn: 'blur'\` значение только тут и записывается).
6. Код вызывает \`control.setValue(v)\` — форма вызывает \`writeValue(v)\`. Это вызов метода снаружи, а не новый \`@Input\`, поэтому \`OnPush\`-компонент сам себя не перерисует, если значение не в сигнале.
7. Код вызывает \`control.disable()\` — форма вызывает \`setDisabledState(true)\`.
8. Элемент уничтожается — форма подменяет колбэки пустышками, чтобы мёртвый компонент ничего не прислал.

### Пример 1. Звёздный рейтинг — полный CVA

\`\`\`ts
@Component({
  selector: 'app-rating',
  template: \`
    @for (star of stars; track star) {
      <button type="button" [disabled]="disabled()" (click)="select(star)" (blur)="onTouched()">
        {{ star <= value() ? '★' : '☆' }}
      </button>
    }
  \`,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RatingComponent),
    multi: true,
  }],
})
export class RatingComponent implements ControlValueAccessor {
  readonly stars = [1, 2, 3, 4, 5];
  value = signal(0);
  disabled = signal(false);
  private onChange: (v: number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(v: number | null) { this.value.set(v ?? 0); }        // модель → компонент
  registerOnChange(fn: (v: number) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled.set(d); }

  select(star: number) {                                          // компонент → модель
    this.value.set(star);
    this.onChange(star);   // уведомляем форму
    this.onTouched();
  }
}

// использование — как с обычным инпутом
score = new FormControl(3, { nonNullable: true });
// <app-rating [formControl]="score" />
\`\`\`

Поведение (проверено в Angular 21):

\`\`\`text
старт              → ★★★☆☆  value 3  touched false  dirty false
клик по 4-й звезде → ★★★★☆  value 4  touched true   dirty true
score.setValue(2)  → ★★☆☆☆  value 2
score.disable()    → все кнопки disabled, статус DISABLED
\`\`\`

После этого компонент работает с \`formControlName\`, \`ngModel\` и валидаторами **как нативный input** — форма не знает и не должна знать, что внутри звёздочки, а не текстовое поле.

### Регистрация: \`NG_VALUE_ACCESSOR\`, \`multi: true\`, \`useExisting\`

Каждая часть провайдера отвечает за своё:

- \`provide: NG_VALUE_ACCESSOR\` — «я переводчик для форм на этом элементе».
- \`useExisting: …RatingComponent\` — «переводчик — это сам экземпляр компонента», а не новый объект.
- \`multi: true\` — добавить себя в **массив**: на одном элементе могут оказаться и \`DefaultValueAccessor\`, и ваш компонент, и форма выбирает из списка.

Без \`multi: true\` форма получает не массив, а один объект, и в dev-режиме падает с понятной ошибкой:

\`\`\`text
NG01200: Value accessor was not provided as an array for form control with unspecified
name attribute. Check that the \`NG_VALUE_ACCESSOR\` token is configured as a \`multi: true\` provider.
\`\`\`

А если провайдера нет вовсе — \`NG01203: No value accessor for form control unspecified name attribute\`.

### \`forwardRef\` — когда он действительно нужен

Классическая формулировка «без \`forwardRef\` будет ошибка, потому что класс ещё не определён» для ссылки на **сам себя** в современном Angular не подтверждается. Проверка показала: и AOT-компилятор (он кладёт провайдеры в статическое поле внутри класса), и JIT через декораторы TypeScript (декоратор применяется уже после объявления класса) работают с \`useExisting: RatingComponent\` без обёртки — компонент рендерится и связывается с формой.

\`forwardRef\` обязателен, когда вы ссылаетесь на класс, объявленный **ниже** в файле:

\`\`\`ts
@Component({ selector: 'app-a', template: '', providers: [{ provide: TOKEN, useExisting: Later }] })
export class A {}
@Component({ selector: 'app-later', template: '' })
export class Later {}
// error TS2449: Class 'Later' used before its declaration.
\`\`\`

Для CVA \`forwardRef(() => RatingComponent)\` остаётся общепринятой и безвредной записью — её ожидают увидеть на ревью и в документации, поэтому её стоит оставлять.

### Порядок вызовов — эксперимент

Логируем методы CVA и подключаем один и тот же компонент двумя способами:

\`\`\`text
[formControl]="ctrl" (значение 3)     [(ngModel)]="score" (значение 4)
writeValue(3)                         writeValue(null)
setDisabledState(false)               setDisabledState(false)
registerOnChange                      registerOnChange
registerOnTouched                     registerOnTouched
                                      … микрозадача …
                                      writeValue(4)
\`\`\`

Два вывода. Первый: с \`ngModel\` первый \`writeValue\` всегда приходит с \`null\`, поэтому компонент обязан это переварить (\`v ?? 0\`). Второй: \`setDisabledState\` вызывается сразу и для включённого контрола — так ведут себя формы с Angular 15. Старое поведение «только если disabled» включается через \`ReactiveFormsModule.withConfig({ callSetDisabledState: 'whenDisabledForLegacyCode' })\`.

### \`writeValue\` и \`OnPush\`

\`writeValue\` вызывает форма, а не шаблон родителя, поэтому \`OnPush\`-компонент не знает, что ему пора перерисоваться. Эксперимент: родитель по клику делает \`ctrl.setValue(5)\`, а два одинаковых \`OnPush\`-рейтинга отличаются только тем, где хранят значение:

\`\`\`text
значение в обычном поле класса → на экране осталось 1   (компонент не перепроверен)
значение в signal()            → на экране 5           (сигнал сам пометил компонент)
\`\`\`

Решения: хранить значение в сигнале (современный путь) или вызвать \`inject(ChangeDetectorRef).markForCheck()\` в конце \`writeValue\`.

### \`registerOnChange\` и \`registerOnTouched\`

Колбэки нужно **сохранить** и вызывать в правильные моменты:

- \`onChange(v)\` — только когда значение меняет **пользователь**: клик, ввод, выбор. Не вызывайте его из \`writeValue\`: проверка показала, что тогда даже программный \`setValue('y')\` делает контрол \`dirty = true\`, и форма считает, что пользователь что-то правил.
- \`onTouched()\` — когда пользователь **ушёл** из компонента: \`blur\` у внутреннего элемента или \`focusout\` у всего компонента. От этого зависит показ ошибок: типичное правило «показывать ошибку, если \`touched && invalid\`».

### \`setDisabledState\`

\`\`\`ts
setDisabledState(isDisabled: boolean) { this.disabled.set(isDisabled); }
// control.disable() → setDisabledState(true) → кнопки получают [disabled]
\`\`\`

Метод необязательный, но без него \`control.disable()\` никак не отразится на вашем компоненте — пользователь сможет менять значение «отключённого» поля. Disabled задают через модель (\`disable()\` или \`{ value, disabled: true }\` при создании), а не атрибутом \`[disabled]\` на элементе с \`formControlName\` — на последнее Angular выдаёт предупреждение.

### Собственная валидация: \`NG_VALIDATORS\`

\`\`\`ts
@Component({
  // …
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RatingComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => RatingComponent), multi: true },
  ],
})
export class RatingComponent implements ControlValueAccessor, Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return control.value === 1 ? { tooLow: { min: 2, actual: control.value } } : null;
  }
  // …
}
// клик по 1-й звезде → errors {"tooLow":{"min":2,"actual":1}}, статус INVALID
\`\`\`

Валидатор компонента добавляется к валидаторам, которые задал владелец формы. Так компонент приносит «встроенные» правила: datepicker — «дата в допустимом диапазоне», поле телефона — «номер полный». Если правило зависит от входов компонента, реализуют \`registerOnValidatorChange\` и вызывают полученный колбэк при их изменении.

### Альтернатива: \`NgControl\` через \`inject\`

Иногда компоненту нужен доступ к своему контролу — показать ошибки, узнать \`required\`. Если при этом оставить провайдер \`NG_VALUE_ACCESSOR\` и сделать \`inject(NgControl)\`, получится замкнутый круг (проверено):

\`\`\`text
NG0200: Circular dependency detected for \`FieldB\`.
Path: FieldB -> … -> FormControlDirective -> InjectionToken NgValueAccessor -> FieldB
\`\`\`

Рабочий приём — убрать провайдер и подставить себя вручную:

\`\`\`ts
export class PhoneFieldComponent implements ControlValueAccessor {
  readonly ngControl = inject(NgControl, { self: true, optional: true });
  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;   // вместо NG_VALUE_ACCESSOR
  }
  get errors() { return this.ngControl?.control?.errors; }
  // writeValue / registerOnChange / registerOnTouched / setDisabledState
}
\`\`\`

Директива формы найдёт переводчик в \`valueAccessor\` и подключит его как обычно, а компонент получает прямой доступ к контролу, его ошибкам и статусу.

### Signal Forms: \`FormValueControl\` (Angular 21, experimental)

\`\`\`ts
@Component({ selector: 'app-rating', template: \`…\` })
export class RatingComponent implements FormValueControl<number> {
  value = model(0);            // единственное обязательное поле контракта
  disabled = input(false);     // необязательные поля синхронизируются сами
}
// <app-rating [formField]="f.score" />
\`\`\`

В экспериментальных Signal Forms вместо четырёх методов и провайдера — сигнальный \`model()\`. API помечен \`@experimental 21.0.0\`, поэтому в продакшене пока остаётся классический CVA.

### Где это применяется на практике

- **Дизайн-системы и UI-киты**: каждый input, select, datepicker, toggle, chips — CVA, чтобы продуктовые команды подключали их через \`formControlName\`.
- **Обёртки над сторонними виджетами** (Kendo, Material, rich-text редакторы, карты): CVA переводит их API в язык форм.
- **Составные поля**: «адрес» или «период дат» как один контрол со значением-объектом; внутри — своя мини-форма.
- **Маски и форматирование**: поле телефона или суммы показывает \`+7 (999) 123-45-67\`, а в модель пишет \`79991234567\`.
- **Большие грид-формы**: ячейки-редакторы таблицы как CVA, чтобы строка оставалась обычной \`FormGroup\`.

## Важные нюансы и подводные камни

- **Забыли \`multi: true\`** — в dev-режиме ошибка \`NG01200\` с прямой подсказкой; без провайдера вовсе — \`NG01203\`. Это уточнение к старой формулировке «Angular не найдёт аксессор или затрёт чужой».
- **Забыли \`forwardRef\`** — для ссылки на сам класс в его же декораторе современная сборка работает и без него (проверено в AOT и JIT); ошибка \`TS2449\` возникает, когда класс объявлен ниже. Писать \`forwardRef\` всё равно принято.
- **Не вызвали \`onChange\`** — пользователь кликает, а форма считает значение прежним.
- **Не вызвали \`onTouched\`** — контрол навсегда \`untouched\`, и ошибки валидации не показываются по привычной логике.
- **Изменение состояния в \`writeValue\` при \`OnPush\`** может потребовать \`markForCheck()\` — или храните значение в сигнале.
- **Вызов \`onChange\` внутри \`writeValue\`** делает форму \`dirty\` при любом программном \`setValue\` и может зациклить синхронизацию.
- **Первый \`writeValue(null)\`** с \`ngModel\` и после \`reset()\` — компонент обязан его переварить без исключений.
- **Два кастомных CVA на одном элементе** — ошибка «More than one custom value accessor matches».
- **\`NG_VALUE_ACCESSOR\` вместе с \`inject(NgControl)\`** — циклическая зависимость \`NG0200\`; используйте приём с \`ngControl.valueAccessor = this\`.
- **\`setDisabledState\` вызывается всегда**, в том числе с \`false\` при старте. Код вида «при вызове показать замок» сработает и для включённого поля.

**Плюсы:** кастомный компонент работает со всеми формами Angular как нативный инпут; валидация, \`touched\`, \`disable\`, \`reset\` работают «из коробки»; один компонент — и для reactive, и для template-driven; основа переиспользуемой дизайн-системы.
**Минусы:** много шаблонного кода и легко забыть один из вызовов; тонкости с \`OnPush\`, \`null\` в \`writeValue\` и циклической зависимостью; ошибки в CVA проявляются неочевидно («форма не видит значение»).

## Как это спрашивают на собеседовании

**Главный вывод:** CVA — мост между \`FormControl\` и компонентом: \`writeValue\` — модель в компонент, колбэки из \`registerOnChange\` / \`registerOnTouched\` — компонент в модель, \`setDisabledState\` — реакция на \`disable()\`. Компонент регистрирует себя multi-провайдером \`NG_VALUE_ACCESSOR\`, и директива формы на элементе находит его через DI.

Типичные формулировки: «Как написать кастомный form control?», «Как работает \`ControlValueAccessor\`?», «Зачем \`NG_VALUE_ACCESSOR\`, \`multi\` и \`forwardRef\`?».

Что могут спросить следом:

- *Чем \`NG_VALUE_ACCESSOR\` отличается от \`NG_VALIDATORS\`?* — Первый подключает перевод значения, второй добавляет валидатор контролу; оба multi-провайдеры с \`useExisting\`.
- *Зачем вообще нужен \`forwardRef\`?* — Чтобы сослаться на класс, который ещё не объявлен; для ссылки на себя в CVA это скорее устоявшаяся конвенция.
- *Как компоненту получить доступ к своему контролу?* — \`inject(NgControl, { self: true })\` и \`ngControl.valueAccessor = this\` без провайдера, иначе циклическая зависимость.
- *Почему значение не обновляется на экране после \`setValue\`?* — \`OnPush\`: \`writeValue\` не помечает компонент; нужен сигнал или \`markForCheck()\`.

### Ответ на 1 минуту

> \`ControlValueAccessor\` — это мост между \`FormControl\` и конкретным элементом ввода, его реализуют и все встроенные связки для input, checkbox и select. Директива формы на элементе, например \`formControlName\`, получает через DI массив переводчиков под токеном \`NG_VALUE_ACCESSOR\`, выбирает кастомный и вызывает \`writeValue\` с текущим значением, \`setDisabledState\` и передаёт колбэки в \`registerOnChange\` и \`registerOnTouched\`. Компонент вызывает \`onChange\`, когда значение меняет пользователь, и \`onTouched\` на blur. Регистрирую его multi-провайдером с \`useExisting\` и по конвенции с \`forwardRef\`. Нюансы: с \`ngModel\` первый \`writeValue\` приходит с \`null\`, при \`OnPush\` значение лучше держать в сигнале, иначе экран не обновится, а \`onChange\` внутри \`writeValue\` делает форму dirty. Для своей валидации добавляю \`NG_VALIDATORS\`, а доступ к контролу беру через \`inject(NgControl)\` без провайдера, чтобы не было циклической зависимости.`,
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
      ru: `## В чём суть

С Angular 14 \`FormControl\`, \`FormGroup\` и \`FormArray\` стали **дженериками** — классами с параметром типа. Раньше \`form.value\` был \`any\`, и опечатка в имени поля обнаруживалась только в рантайме. Теперь компилятор знает точный тип каждого контрола. Валидаторы при этом — обычные функции: синхронная получает контрол и возвращает объект ошибок или \`null\`, асинхронная возвращает то же самое в \`Observable\` или \`Promise\`.

Аналогия: раньше форма была коробкой с надписью «вещи». Что достанешь — то достанешь, проверять приходилось руками. Теперь это ячейки с подписями: «строка», «число или пусто» — и попытка положить не то не пройдёт дальше сборки. Валидаторы — это контролёры у ячеек: одни проверяют сразу на месте (синхронные), другие звонят на склад и ждут ответа (асинхронные).

**Какую проблему решает.** В больших формах (анкеты, заявки, настройки на десятки полей) поле переименовали на бэкенде — и в десяти местах кода осталось старое имя, которое молча даёт \`undefined\`. Типизированные формы превращают это в ошибку компиляции. А кастомные и async-валидаторы закрывают правила, которых нет во встроенных \`Validators\`: «логин не из списка запрещённых», «пароли совпадают», «e-mail ещё не занят» — последнее можно проверить только запросом к серверу.

## Словарик терминов

- **Дженерик (generic)** — класс или функция с параметром типа: \`FormControl<string>\` — контрол, чьё значение строка.
- **Вывод типов (type inference)** — компилятор сам определяет тип по начальному значению: \`new FormControl('')\` даёт \`FormControl<string | null>\`.
- **\`nonNullable\`** — опция контрола: убрать \`null\` из типа и сбрасывать \`reset()\` к начальному значению, а не к \`null\`.
- **\`NonNullableFormBuilder\` (\`fb.nonNullable\`)** — версия \`FormBuilder\`, где все создаваемые контролы \`nonNullable\`.
- **\`value\` / \`getRawValue()\`** — значение формы без disabled-полей и полное значение со всеми полями.
- **\`Partial<T>\`** — тип TypeScript «все поля \`T\` необязательные»; так типизирован \`form.value\`.
- **\`ValidatorFn\`** — тип синхронного валидатора: \`(control: AbstractControl) => ValidationErrors | null\`.
- **\`AsyncValidatorFn\`** — тип асинхронного валидатора: возвращает \`Observable\` или \`Promise\` от \`ValidationErrors | null\`.
- **\`ValidationErrors\`** — объект ошибок вида \`{ required: true }\` или \`{ forbidden: { value: 'admin' } }\`.
- **Статусы контрола** — \`VALID\`, \`INVALID\`, \`PENDING\` (идёт асинхронная проверка), \`DISABLED\`.
- **\`updateOn\`** — когда обновлять значение и запускать валидацию: \`'change'\` (по умолчанию, на каждый ввод), \`'blur'\` (при уходе из поля), \`'submit'\` (при отправке).
- **Кросс-полевой валидатор** — валидатор на \`FormGroup\`, который сравнивает несколько полей (например, пароль и подтверждение).
- **\`FormRecord\`** — группа с заранее неизвестными ключами одного типа (словарь).
- **\`UntypedFormGroup\` / \`UntypedFormControl\`** — нетипизированные версии классов; их подставила миграция при обновлении старых проектов до v14.

## Как это работает под капотом

Сначала про типы, потом про жизненный цикл валидации.

1. \`FormControl<TValue>\` хранит значение типа \`TValue\`. Если тип не указан, он выводится из начального значения, но **с добавлением \`null\`**: по умолчанию \`reset()\` сбрасывает контрол в \`null\`, и тип обязан это учитывать.
2. \`FormGroup\` выводит тип значения из своих контролов. \`getRawValue()\` возвращает все поля, а \`value\` — \`Partial<…>\`, потому что disabled-контролы в \`value\` не попадают, и любое поле теоретически может отсутствовать.
3. При каждом изменении значения контрол вызывает \`updateValueAndValidity\`: запускает **все** синхронные валидаторы и сливает их ошибки в один объект.
4. Если синхронные ошибки есть — статус \`INVALID\`, и асинхронные валидаторы **не запускаются** вовсе: незачем звонить на сервер про заведомо неправильный e-mail.
5. Если синхронных ошибок нет и есть асинхронные — статус становится \`PENDING\`, Angular подписывается на результат. Все асинхронные валидаторы контрола собираются через \`forkJoin\`, поэтому каждый \`Observable\` обязан **завершиться**.
6. Пришло новое значение, пока проверка шла, — старая подписка отменяется, начинается новая (поведение как у \`switchMap\`).
7. Результат пришёл — ошибки записываются, статус пересчитывается, родительская группа тоже меняет статус, и \`statusChanges\` шлёт событие.

### Пример 1. Что знает компилятор

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl<number | null>(null),
});

form.value;          // Partial<{ name: string; age: number | null; }>
form.getRawValue();  // { name: string; age: number | null; }

form.controls.nmae;                     // ✗ TS2339: Property 'nmae' does not exist
form.controls.age.setValue('30');       // ✗ TS2345: 'string' is not assignable to 'number'
form.value.name.toUpperCase();          // ✗ TS18048: 'form.value.name' is possibly 'undefined'
form.getRawValue().name.toUpperCase();  // ✓
\`\`\`

Все три ошибки ловятся при сборке (проверено \`tsc --strict\`). Третья показывает, почему для отправки на сервер удобнее \`getRawValue()\`: там поля не опциональны.

### \`nonNullable\` — убрать \`null\` из типа

\`\`\`ts
const a = new FormControl('Anna');                         // FormControl<string | null>
const b = new FormControl('Anna', { nonNullable: true });  // FormControl<string>

a.setValue('Bob'); b.setValue('Bob');
a.reset(); b.reset();
console.log(a.value, b.value);   // null Anna
\`\`\`

Без флага \`reset()\` сбрасывает в \`null\`, поэтому в типе \`string | null\`, и по всей форме приходится писать \`?? ''\`. С флагом контрол помнит начальное значение и возвращается к нему. Для целой формы удобнее \`inject(NonNullableFormBuilder)\` или \`fb.nonNullable.group({...})\`:

\`\`\`ts
const fb = inject(FormBuilder);
fb.group({ name: ['', Validators.required] }).value;              // Partial<{ name: string | null }>
fb.nonNullable.group({ name: ['', Validators.required] }).value;  // Partial<{ name: string }>
\`\`\`

### \`value\` против \`getRawValue()\`

\`\`\`ts
const form = new FormGroup({
  name: new FormControl('Ann', { nonNullable: true }),
  age: new FormControl(30),
});
form.controls.age.disable();
console.log(form.value);          // { name: 'Ann' }
console.log(form.getRawValue());  // { name: 'Ann', age: 30 }
\`\`\`

\`value\` **исключает disabled**-контролы, поэтому в типе они опциональны. Поле «ИНН» заблокировали для редактирования, отправили \`form.value\` — и сервер не получил ИНН. Любопытное исключение: если отключены **все** контролы группы, \`value\` возвращает их все (проверено).

### Типизированные \`FormArray\` и \`FormRecord\`

\`\`\`ts
const phones = new FormArray<FormControl<string>>([]);
phones.push(new FormControl('+111', { nonNullable: true }));
phones.value;                                    // string[]

const flags = new FormRecord<FormControl<boolean>>({});
flags.addControl('darkMode', new FormControl(true, { nonNullable: true }));
flags.value;                                     // Partial<{ [key: string]: boolean }>
\`\`\`

\`FormArray\` типизируется типом элемента; \`FormRecord\` — для словаря с динамическими ключами (например, набор чекбоксов-флагов, пришедших с сервера). При миграции старого проекта на v14 \`ng update\` заменил классы на \`UntypedFormGroup\` и подобные — они ведут себя по-старому (\`any\`), и их постепенно переводят на типизированные.

### Синхронный валидатор — \`ValidatorFn\`

\`\`\`ts
export function forbiddenName(name: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === name ? { forbidden: { value: control.value } } : null;
}

const login = new FormControl('admin', { validators: [Validators.required, forbiddenName('admin')] });
console.log(login.errors);   // { forbidden: { value: 'admin' } }
login.setValue('');
console.log(login.errors);   // { required: true }
login.hasError('required');  // true
\`\`\`

Валидатор — чистая функция: на вход контрол, на выход \`null\` («всё хорошо») или объект ошибок. Внешняя функция \`forbiddenName(name)\` — фабрика, чтобы передать параметр. Ошибки всех валидаторов сливаются в один объект, а ключ ошибки (\`forbidden\`) потом используется в шаблоне: \`@if (login.hasError('forbidden')) { … }\`.

### Кросс-полевой валидатор на группе

\`\`\`ts
const passwordsMatch: ValidatorFn = (group) =>
  group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };

const form = new FormGroup(
  { password: new FormControl('a1'), confirm: new FormControl('a2') },
  { validators: passwordsMatch },
);
console.log(form.errors);                  // { mismatch: true }
console.log(form.controls.confirm.errors); // null — ошибка висит на группе, а не на поле
form.controls.confirm.setValue('a1');
console.log(form.status);                  // VALID
\`\`\`

Правило, которое зависит от нескольких полей, вешают на общего родителя: он перепроверяется при изменении любого ребёнка. Важно помнить, что ошибка живёт на группе — показывать её нужно через \`form.hasError('mismatch')\`.

### Асинхронный валидатор — \`AsyncValidatorFn\`

\`\`\`ts
export function uniqueEmail(api: Api): AsyncValidatorFn {
  return (control) =>
    timer(300).pipe(                                     // пауза: отменится, если пользователь печатает дальше
      switchMap(() => api.checkEmail(control.value)),
      map(taken => (taken ? { emailTaken: true } : null)),
      catchError(() => of(null)),                        // упал запрос — не блокируем форму
    );
}

new FormControl('', {
  validators: [Validators.required, forbiddenName('admin')],
  asyncValidators: [uniqueEmail(api)],
  nonNullable: true,
  updateOn: 'blur',
});
\`\`\`

Как это ведёт себя (проверено с фейковым API, которое отвечает через 20 мс и считает «занятым» \`anna@corp.com\`):

\`\`\`text
быстро ввели 3 корректных адреса подряд →  статус PENDING, form.valid = false, form.invalid = false
через 400 мс → API вызван 1 раз (только для последнего значения) → INVALID {"emailTaken":true}
без timer(300) → API вызван 3 раза: предыдущие проверки отменяются, но запросы уже ушли
ввели boris@corp.com → VALID
\`\`\`

Почему так: при каждом новом значении Angular отписывается от предыдущей асинхронной проверки, поэтому \`timer(300)\` внутри валидатора работает как debounce — до запроса дело доходит только для последнего значения. \`catchError(() => of(null))\` не даёт упавшему запросу навсегда заблокировать форму в статусе \`PENDING\`.

### \`updateOn: 'blur'\` и \`'submit'\`

\`updateOn: 'blur'\` (или \`'submit'\`) переносит запись значения и запуск валидации с каждого нажатия клавиши на потерю фокуса (или отправку формы). Пока пользователь печатает, контрол хранит «отложенное» значение, а модель и валидаторы его не видят. Для async-валидации это самый простой способ не бить в API на каждый символ; \`timer\` внутри валидатора — способ тоньше, когда проверка нужна и во время ввода.

### Статус \`PENDING\` и кнопка отправки

\`\`\`ts
console.log(email.status, form.valid, form.invalid);  // PENDING false false
\`\`\`

Пока идёт асинхронная проверка, \`valid\` и \`invalid\` **оба** \`false\`. Поэтому \`[disabled]="form.invalid"\` пропустит отправку во время проверки, а \`[disabled]="!form.valid"\` — нет. Перед отправкой правильно проверять \`form.valid\` или дождаться окончания проверки через \`statusChanges.pipe(filter(s => s !== 'PENDING'), first())\`.

### Валидаторы в Signal Forms (Angular 21, experimental)

В экспериментальных Signal Forms правила описываются функциями схемы: \`required(p.email)\`, \`email(p.email)\`, \`validate(p.name, …)\`, а для асинхронных проверок есть \`validateAsync\`, \`validateHttp\` и \`debounce\`. API помечен \`@experimental 21.0.0\`; идея та же — чистые функции, возвращающие ошибки.

### Где это применяется на практике

- **Регистрация и профиль**: уникальность логина или e-mail — async-валидатор с паузой и \`catchError\`.
- **Смена пароля**: кросс-полевой валидатор «пароли совпадают» на группе.
- **Банковские и страховые анкеты**: типизированная модель на десятки полей, \`getRawValue()\` при отправке, потому что часть полей заблокирована после проверки.
- **Формы по конфигу с сервера**: \`FormRecord\` для набора флагов, \`FormArray\` для повторяющихся блоков, валидаторы-фабрики с параметрами из конфига.
- **Общая библиотека валидаторов** в монорепозитории: \`forbiddenName\`, \`inn\`, \`phone\`, \`dateRange\` как переиспользуемые \`ValidatorFn\`.

## Важные нюансы и подводные камни

- **Забыли \`nonNullable\`** — и в типе значения внезапно \`string | null\` по всей форме, а \`reset()\` превращает поля в \`null\`.
- **\`form.value\` вместо \`getRawValue()\`** при наличии disabled-полей — тихо теряются данные при отправке.
- **Async-валидатор без \`catchError\`** — упавший запрос оставляет контрол в \`PENDING\` навсегда, а ошибка уходит в консоль как необработанная (проверено).
- **Async-валидатор, который не завершается** (например, \`valueChanges\` или \`Subject\` без \`first()\`), тоже оставляет \`PENDING\` навсегда: Angular собирает результаты через \`forkJoin\` и ждёт завершения.
- **Async-валидация на каждый ввод** без \`updateOn\` или паузы (\`timer\`, \`debounceTime\`) — шторм запросов.
- **Async-валидатор не запускается, пока не прошли синхронные.** Это экономит запросы, но означает, что ошибка «занято» появится только после исправления формата.
- **\`PENDING\` блокирует \`form.valid\`** — и при этом \`form.invalid\` тоже \`false\`. Кнопку отправки отключают по \`!form.valid\`, а не по \`form.invalid\`.
- **Валидатор с побочными эффектами** вызывается чаще, чем вы думаете, — при каждом изменении значения, \`updateValueAndValidity\` и изменении соседей в группе. Он должен быть чистым.
- **Кросс-полевая ошибка живёт на группе**, а не на поле — её не видно в \`control.errors\`, и подсветку поля нужно делать отдельно.
- **Типы не проверяют данные с сервера.** \`patchValue(response)\` с неправильной формой ответа компилятор не поймает, если \`response\` типизирован как \`any\`.

**Плюсы:** опечатки и неверные типы ловятся при сборке; автодополнение по полям формы; валидаторы — простые чистые функции, легко переиспользовать и тестировать без DOM; async-валидаторы с встроенной отменой устаревших проверок.
**Минусы:** \`null\` в типах по умолчанию требует дисциплины с \`nonNullable\`; \`Partial\` в \`value\` раздражает; async-валидаторы легко сделать «вечными» (без \`catchError\` или завершения); логика ошибок групп и статуса \`PENDING\` неочевидна новичкам.

## Как это спрашивают на собеседовании

**Главный вывод:** с Angular 14 формы типизированы: тип значения выводится из структуры формы, \`nonNullable\` убирает \`null\` и меняет поведение \`reset()\`, а \`value\` исключает disabled-поля, поэтому для отправки нужен \`getRawValue()\`. Кастомный валидатор — чистая \`ValidatorFn\`, асинхронный — \`AsyncValidatorFn\`, который запускается после успешных синхронных и держит статус \`PENDING\`.

Типичные формулировки: «Что такое typed forms?», «Как написать свой валидатор?», «Как проверить уникальность e-mail на сервере?», «Чем \`value\` отличается от \`getRawValue()\`?».

Что могут спросить следом:

- *Почему статус \`PENDING\` блокирует \`form.valid\`?* — \`valid\` истинно только при статусе \`VALID\`; во время проверки и \`valid\`, и \`invalid\` равны \`false\`.
- *Как типизировать \`FormArray\`?* — Типом элемента: \`FormArray<FormControl<string>>\` или \`FormArray<FormGroup<{…}>>\`; для динамических ключей — \`FormRecord\`.
- *Как не бить в API на каждый символ?* — \`updateOn: 'blur'\` или пауза \`timer(300)\` внутри валидатора: Angular отменяет предыдущую проверку при новом значении.
- *Где валидировать сравнение двух полей?* — Валидатором на общей \`FormGroup\`; ошибка будет в \`group.errors\`.

### Ответ на 1 минуту

> Типизированные формы появились в Angular 14: \`FormControl\` и \`FormGroup\` стали дженериками, поэтому \`form.value\` уже не \`any\`, а тип, выведенный из структуры формы, и опечатку в имени поля ловит компилятор. Первый нюанс — \`nonNullable\`: по умолчанию \`reset\` сбрасывает контрол в \`null\`, поэтому \`null\` попадает в тип, а флаг убирает его и сбрасывает к начальному значению. Второй — \`value\` исключает disabled-поля, поэтому типизирован как \`Partial\`, а для отправки я беру \`getRawValue\`. Кастомный валидатор — чистая \`ValidatorFn\`, которая возвращает объект ошибок или \`null\`, для сравнения полей я вешаю его на группу. \`AsyncValidatorFn\` запускается только после успешных синхронных, пока он работает, статус \`PENDING\`, и \`valid\`, и \`invalid\` при этом ложны. Его я всегда делаю с \`catchError\`, иначе упавший запрос оставит \`PENDING\` навсегда, и с \`updateOn: 'blur'\` или паузой \`timer\`, иначе форма будет бить в API на каждый символ.`,
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
