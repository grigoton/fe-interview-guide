import { InterviewQuestion } from '../interfaces/question.interface';

export const RXJS_STATE_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'rxjs-001',
    category: 'rxjs',
    level: 'Hard',
    tags: ['observable', 'internals', 'lazy', 'unicast'],
    question: {
      ru: 'Что такое Observable «под капотом»? Объясните ленивость, unicast-природу и контракт Observer.',
      en: 'What is an Observable "under the hood"? Explain laziness, the unicast nature, and the Observer contract.'
    },
    answer: {
      ru: `## В чём суть

\`Observable\` — это **не поток данных, а рецепт потока**. Вы описываете функцию «что делать, когда на меня подпишутся», и она лежит без дела до первого \`subscribe()\`. Подписались — рецепт выполнился заново, **лично для вас**. А правила, по которым рецепт отдаёт результат, жёстко заданы контрактом Observer: сколько угодно значений, потом не больше одного финала.

Аналогия: это не кастрюля супа, а **карточка с рецептом**. Пока никто не готовит — на кухне тихо (ленивость). Пришёл второй гость — варят вторую кастрюлю с нуля, а не наливают из первой (unicast). И у любого повара порядок одинаковый: подаём блюда сколько угодно раз, а потом либо «ужин окончен», либо «кухня сгорела» — после этого ничего больше не подают (контракт).

**Какую проблему решает.** В приложении десятки источников асинхронных значений: HTTP-ответы, клики, таймеры, WebSocket, изменения формы. У каждого свой API — колбэки, промисы, слушатели событий — и свой способ отмены (или его отсутствие). Observable даёт им **одну модель**: подписался — получаешь значения, отписался — работа остановлена. Ленивость означает, что побочные эффекты (запрос, таймер) происходят только тогда, когда кто-то действительно хочет результат. Unicast делает поведение предсказуемым: подписчики не мешают друг другу. А контракт позволяет сотням операторов RxJS полагаться на одни и те же правила.

## Словарик терминов

- **Observable (наблюдаемый поток)** — объект, который хранит функцию подписки и запускает её на каждый \`subscribe()\`. Сам по себе ничего не делает.
- **Функция подписки (subscribe function)** — функция, которую вы передаёте в \`new Observable(fn)\`: она получает \`subscriber\` и описывает, откуда брать значения.
- **Observer (наблюдатель)** — объект с тремя колбэками \`next\`, \`error\`, \`complete\`, который вы передаёте в \`subscribe\`. Можно передать и просто функцию — это будет \`next\`.
- **Subscriber** — внутренняя «безопасная обёртка» RxJS вокруг вашего Observer: следит за контрактом, ловит исключения, хранит функции очистки.
- **Subscription (подписка)** — объект, который возвращает \`subscribe()\`. Его метод \`unsubscribe()\` останавливает выполнение.
- **Продюсер (producer)** — то, что реально создаёт значения: таймер, XHR-запрос, сокет, DOM-событие.
- **Teardown (функция очистки)** — функция, которую возвращает функция подписки; RxJS вызовет её при завершении или отписке, чтобы остановить продюсера.
- **Ленивость (laziness)** — работа не начинается, пока нет подписчика. Противоположность — **eager** («жадный»): работа стартует сразу при создании, как у \`Promise\`.
- **Unicast** — у каждого подписчика своё, независимое выполнение. **Multicast** — одно выполнение раздаётся многим.
- **Терминальное уведомление** — \`error\` или \`complete\`: после него поток закрыт навсегда.
- **Subject** — особый объект, который одновременно и Observable, и Observer; через него строят multicast.
- **\`async\` pipe** — Angular-пайп в шаблоне, который сам подписывается на Observable и отписывается при уничтожении компонента.

## Как это работает под капотом

Что происходит от создания до отписки:

1. \`new Observable(fn)\` просто **запоминает** функцию \`fn\` в поле объекта. Ничего не выполняется, побочных эффектов нет — поэтому Observable можно создать в поле класса и никогда не использовать без последствий.
2. Кто-то вызывает \`subscribe(observer)\`. RxJS оборачивает ваш observer в \`Subscriber\` — объект, который знает, закрыт ли поток, и хранит список функций очистки.
3. Только теперь запускается \`fn(subscriber)\`: уходит HTTP-запрос, стартует таймер, открывается сокет.
4. Внутри \`fn\` вы вызываете \`subscriber.next(v)\` — сколько угодно раз. \`Subscriber\` передаёт значение вашему \`next\`, пока поток не закрыт.
5. Поток заканчивается либо \`complete()\`, либо \`error(e)\` — **терминально, ровно один раз**. \`Subscriber\` помечает себя закрытым, поэтому всё, что придёт после, отбрасывается.
6. \`fn\` возвращает teardown-функцию; \`Subscriber\` регистрирует её и вызовет при завершении или при \`unsubscribe()\`. Если поток успел закончиться синхронно ещё до \`return\`, teardown вызывается сразу после регистрации.
7. Пришёл второй подписчик — шаги 2–6 повторяются **с самого начала и независимо**: новый \`Subscriber\`, новый запуск \`fn\`, новый продюсер. Это и есть **unicast**.

Вся идея помещается в 25 строк. Вот упрощённая реализация, которая ведёт себя так же, как настоящая на этом примере:

\`\`\`js
class MiniObservable {
  constructor(subscribeFn) {
    this.subscribeFn = subscribeFn;              // 1. только запоминаем
  }
  subscribe(observer) {
    let closed = false;
    let teardown;
    const cleanup = () => { if (teardown) { teardown(); teardown = undefined; } };
    const subscriber = {                         // 2. обёртка-охранник
      next: v => { if (!closed) observer.next?.(v); },
      error: e => { if (!closed) { closed = true; observer.error?.(e); cleanup(); } },
      complete: () => { if (!closed) { closed = true; observer.complete?.(); cleanup(); } },
    };
    try {
      teardown = this.subscribeFn(subscriber);   // 3. запуск рецепта
    } catch (e) {
      subscriber.error(e);                       // исключение продюсера -> error
    }
    if (closed) cleanup();                       // 6. закончился синхронно — убираем сразу
    return { unsubscribe: () => { if (!closed) { closed = true; cleanup(); } } };
  }
}

const mini$ = new MiniObservable(sub => {
  console.log('старт');
  sub.next(1);
  sub.complete();
  sub.next(2);                                   // closed === true — игнор
  return () => console.log('teardown');
});
mini$.subscribe({ next: v => console.log('A', v), complete: () => console.log('A complete') });
mini$.subscribe({ next: v => console.log('B', v) });
// старт
// A 1
// A complete
// teardown
// старт
// B 1
// teardown
\`\`\`

Настоящий RxJS сложнее (цепочки операторов, дерево подписок, обработка ошибок в колбэках), но три идеи те же: **хранить функцию, запускать на подписку, охранять контракт флагом \`closed\`**.

### Пример 1. Ленивость: Observable против Promise

\`\`\`ts
import { Observable } from 'rxjs';

const p = new Promise(res => { console.log('promise: работа началась'); res(1); });
const o = new Observable(s => { console.log('observable: работа началась'); s.next(1); s.complete(); });
console.log('никто не подписан');
// promise: работа началась
// никто не подписан
\`\`\`

Промис **жадный**: его функция выполнилась прямо в конструкторе. Observable **ленивый**: строчка «observable: работа началась» так и не напечаталась, потому что \`subscribe()\` никто не вызвал. В Angular из этого следует классический баг: \`this.http.post('/api/save', dto)\` без \`subscribe()\` **не отправляет запрос вообще** — вы создали рецепт, но не приготовили блюдо.

### Пример 2. Unicast: каждая подписка — отдельное выполнение

\`\`\`ts
let runs = 0;
const request$ = new Observable(s => {
  runs++;
  console.log('HTTP-запрос №' + runs);
  s.next({ id: 1 });
  s.complete();
});

request$.subscribe();
request$.subscribe();
// HTTP-запрос №1
// HTTP-запрос №2
\`\`\`

Два подписчика — два запуска функции, два «запроса». \`HttpClient.get()\` устроен так же: каждый \`subscribe\` — новый реальный запрос в сети. На этом же держится \`retry\`: повторная попытка — это просто повторная подписка, которая заново запускает рецепт.

### Контракт Observer: грамматика потока

Observer — обычный объект с тремя методами, и у их вызовов есть строгий порядок:

- \`next(value)\` — от 0 до бесконечности раз;
- \`error(err)\` — терминальный, максимум один раз;
- \`complete()\` — терминальный, максимум один раз; \`error\` и \`complete\` вместе не бывают.

Формально это записывают как \`next* (error | complete)?\` — «сколько угодно \`next\`, потом максимум одно завершение» (звёздочка — «0 или больше раз», вопросительный знак — «0 или 1 раз»). Поток может вообще никогда не завершиться — как \`interval\` или клики.

\`\`\`ts
const obs = new Observable<number>(subscriber => {
  console.log('старт');          // напечатается на КАЖДУЮ подписку
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2);            // молча проигнорировано — поток уже закрыт
  subscriber.error(new Error()); // тоже проигнорировано
  return () => console.log('teardown');
});

obs.subscribe(v => console.log('A', v));
obs.subscribe(v => console.log('B', v));
// старт
// A 1
// teardown
// старт
// B 1
// teardown
\`\`\`

Почему \`teardown\` напечатан после \`A 1\`, хотя \`complete()\` был вызван раньше \`return\`: в момент \`complete()\` функция очистки ещё не зарегистрирована. Её регистрируют, когда функция подписки вернула значение, и раз поток уже закрыт — вызывают сразу.

Зачем контракт нужен на практике: операторы RxJS опираются на него. \`finalize\` знает, что очистка будет ровно одна; \`last()\` знает, что после \`complete\` значений не будет; \`forkJoin\` ждёт \`complete\` от всех. Если бы поток мог «ожить» после завершения, ни один оператор не работал бы надёжно.

### \`Subscriber\` — охранник контракта

\`Subscriber\` — это то, что приходит в функцию подписки вместо вашего Observer. Его работа:

- **Дополняет частичный Observer.** Вы передали только функцию \`next\` — \`Subscriber\` подставит пустой \`complete\` и обработчик \`error\` по умолчанию.
- **Отбрасывает всё после финала.** Флаг закрытия проверяется на каждом \`next\`/\`error\`/\`complete\`.
- **Превращает исключение продюсера в \`error\`.** Если функция подписки бросила исключение, подписчик получит его в \`error\`, а не упадёт всё приложение:

\`\`\`ts
new Observable(s => { s.next(1); throw new Error('сломался продюсер'); })
  .subscribe({ next: v => console.log('next', v), error: e => console.log('error:', e.message) });
// next 1
// error: сломался продюсер
\`\`\`

- **Изолирует исключения в ваших колбэках.** Если упал **ваш** \`next\`, ошибка не идёт в ваш же \`error\` и не останавливает поток: RxJS сообщает о ней асинхронно как о необработанной (по умолчанию — выброс через \`setTimeout\`, перехватить можно через \`config.onUnhandledError\`):

\`\`\`ts
import { config } from 'rxjs';
config.onUnhandledError = e => console.log('onUnhandledError:', e.message);

new Observable(s => { s.next(1); s.next(2); s.complete(); }).subscribe({
  next: v => { console.log('next', v); if (v === 1) throw new Error('баг в подписчике'); },
  error: e => console.log('error cb', e.message),
  complete: () => console.log('complete'),
});
// next 1
// next 2
// complete
// onUnhandledError: баг в подписчике   ← позже, асинхронно; "error cb" не вызван
\`\`\`

- **Сообщает о необработанной ошибке.** Если вы не передали \`error\`, а поток упал, ошибка тоже уходит в \`onUnhandledError\` — в браузере это красная строка в консоли.

### \`Subscription\` и \`unsubscribe\` — отмена выполнения

\`subscribe()\` возвращает \`Subscription\`. Вызов \`unsubscribe()\` закрывает \`Subscriber\` и запускает teardown — так отмена доходит до продюсера:

\`\`\`ts
const ticker$ = new Observable<number>(s => {
  let i = 0;
  console.log('таймер запущен');
  const id = setInterval(() => s.next(i++), 100);
  return () => { clearInterval(id); console.log('таймер остановлен'); };
});

const sub = ticker$.subscribe(v => console.log('tick', v));
setTimeout(() => sub.unsubscribe(), 350);
// таймер запущен
// tick 0
// tick 1
// tick 2
// таймер остановлен
\`\`\`

Если забыть вернуть teardown, \`Subscriber\` после отписки перестанет пропускать значения, но \`setInterval\` будет тикать вечно — утечка и «фантомная» работа. В этом главное отличие от промиса: у Observable отмена встроена в модель.

### Observable не обязательно асинхронный

\`\`\`ts
import { of } from 'rxjs';

console.log('до');
of(1, 2, 3).subscribe(v => console.log(v));
console.log('после');
// до
// 1
// 2
// 3
// после
\`\`\`

Функция подписки выполняется прямо внутри вызова \`subscribe()\`. Если она вызывает \`next\` синхронно, значения придут до следующей строки кода. Асинхронность приносит продюсер (таймер, сеть) или планировщик (\`observeOn(asyncScheduler)\`), а не сам Observable. Промис, наоборот, всегда отдаёт результат асинхронно — в очереди микрозадач.

### \`share\` — как превратить unicast в multicast

Иногда нужно ровно одно выполнение на всех подписчиков. Для этого между продюсером и подписчиками ставят \`Subject\`: он подписывается на источник **один раз** и раздаёт значения всем. Оператор \`share()\` делает это автоматически: первый подписчик запускает источник, последний ушедший — останавливает.

\`\`\`ts
import { share } from 'rxjs';

const req$ = new Observable(s => {
  console.log('HTTP-запрос');
  const id = setTimeout(() => { s.next({ id: 1 }); s.complete(); }, 50);
  return () => clearTimeout(id);
});
const shared$ = req$.pipe(share());
shared$.subscribe(v => console.log('A получил', v));
shared$.subscribe(v => console.log('B получил', v));
// HTTP-запрос
// A получил { id: 1 }
// B получил { id: 1 }
\`\`\`

Но \`share\` ничего не помнит: подписчик, пришедший после завершения, запустит **новый** запрос. Для кэша используют \`shareReplay\` — тот же \`share\`, но внутри \`ReplaySubject\`, который хранит последние значения и отдаёт их опоздавшим:

\`\`\`ts
import { shareReplay } from 'rxjs';

const cached$ = req$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
cached$.subscribe(v => console.log('A', v));
cached$.subscribe(v => console.log('B', v));
setTimeout(() => cached$.subscribe(v => console.log('C (поздний)', v)), 100);
// HTTP-запрос
// A { id: 1 }
// B { id: 1 }
// C (поздний) { id: 1 }   ← нового запроса нет
\`\`\`

\`refCount: true\` значит «если все отписались, пока источник ещё работает, — отпишись и от источника»; для завершившегося HTTP-запроса кэш при этом сохраняется.

### \`async\` pipe и два запроса в шаблоне

\`async\` pipe — это подписчик, которого Angular создаёт за вас: подписывается при отрисовке и отписывается при уничтожении компонента. Каждый \`| async\` в шаблоне — **отдельная подписка**:

\`\`\`html
<p>Всего: {{ (users$ | async)?.length }}</p>
@for (u of users$ | async; track u.id) { <span>{{ u.name }}</span> }
<!-- два async на cold http.get = ДВА запроса в Network -->

@if (users$ | async; as users) {
  <p>Всего: {{ users.length }}</p>
  @for (u of users; track u.id) { <span>{{ u.name }}</span> }
}
<!-- одна подписка, один запрос -->
\`\`\`

Другой современный вариант — \`users = toSignal(this.http.get<User[]>('/api/users'))\` в компоненте: одна подписка, а в шаблоне читается сигнал \`users()\` сколько угодно раз.

### Где это применяется на практике

- **HTTP-слой**: понимание ленивости объясняет, почему \`post\` без \`subscribe\` не уходит, а два \`async\` дают два запроса в DevTools.
- **Обёртки над браузерными API** (\`ResizeObserver\`, \`IntersectionObserver\`, WebSocket, \`EventSource\`): пишется \`new Observable\` с teardown, который отключает наблюдателя или закрывает соединение.
- **Опрос сервера на дашбордах**: \`interval\` + запрос; отписка при уходе со страницы реально останавливает таймер благодаря teardown.
- **Повторы запросов** (\`retry\`): работают именно потому, что cold-поток можно перезапустить повторной подпиской.
- **Отладка «двойных» вызовов**: если сервис дёргает API дважды, первый вопрос — сколько подписок на один cold-поток.

## Важные нюансы и подводные камни

- **«Observable — это как Promise».** Нет. Promise жадный (стартует при создании), отдаёт одно значение, кэширует его и не отменяется. Observable ленивый, unicast, может выдать много значений и отменяется через \`unsubscribe\`.
- **Два \`| async\` на один \`http.get()\`** — это два реальных запроса. Лечится одной подпиской (\`@if ... as\`, \`toSignal\`) или \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **Запрос без подписки не уходит.** \`this.http.delete(url)\` без \`subscribe()\` ничего не удалит — частая ошибка в обработчиках кнопок.
- **Забыли вернуть teardown** — таймер или слушатель живут после отписки: утечка памяти и «фантомные» эмиссии.
- **\`next\` после \`complete\` не бросает ошибку.** Он тихо игнорируется — значение теряется, а причину ищут долго. В RxJS 7 такие случаи можно отследить хуком \`config.onStoppedNotification\`.
- **Исключение в вашем \`next\` не попадает в ваш \`error\`.** Оно уходит в \`onUnhandledError\` асинхронно, а поток продолжает работать. Ошибки продюсера, наоборот, приходят в \`error\`.
- **Нет обработчика \`error\` — ошибка «всплывает».** В браузере это необработанное исключение в консоли; в тестах — внезапное падение после завершения теста.
- **Observable сам по себе не асинхронен.** Код внутри \`new Observable\` может отработать полностью синхронно; асинхронность приносит продюсер или планировщик.
- **«А Subject тогда что?»** — Subject multicast и hot: он не создаёт новое выполнение на каждого подписчика, а раздаёт одни и те же значения всем, кто подписан сейчас.
- **Каждая подписка платит полную цену.** Тяжёлый \`map\` или \`scan\` в цепочке выполнится для каждого подписчика отдельно — это ещё одна причина делать multicast для дорогих вычислений.

**Плюсы:** единая модель для любых асинхронных источников; побочные эффекты под контролем благодаря ленивости; встроенная отмена через \`unsubscribe\` и teardown; предсказуемость за счёт контракта, на который опираются все операторы.
**Минусы:** ленивость и unicast неочевидны новичкам и порождают двойные запросы или «неотправленные» запросы; нужно помнить про отписку и teardown; ошибки в колбэках подписчика ведут себя не так, как ожидают.

## Как это спрашивают на собеседовании

**Главный вывод:** Observable — это ленивая функция подписки: ничего не происходит до \`subscribe()\`, каждая подписка запускает отдельное выполнение (unicast), а поток обязан соблюдать контракт \`next* (error | complete)?\`, за которым следит \`Subscriber\`.

Типичные формулировки: «Что такое Observable под капотом?», «Почему HTTP-запрос не отправился?», «Почему в Network два одинаковых запроса?», «Чем Observable отличается от Promise?».

Что могут спросить следом:

- *Что будет, если вызвать \`next\` после \`complete\`?* — Значение молча отбросится, \`Subscriber\` уже закрыт.
- *Как сделать одно выполнение на всех?* — Multicast: \`share()\`, \`shareReplay()\` или вручную через \`Subject\`.
- *Observable синхронный или асинхронный?* — Зависит от продюсера: \`of(1, 2, 3)\` синхронный, \`interval\` асинхронный.
- *Куда пойдёт исключение, брошенное в \`next\`-колбэке подписчика?* — Не в \`error\`, а в \`config.onUnhandledError\`, асинхронно.
- *Зачем возвращать функцию из \`new Observable\`?* — Это teardown: он останавливает продюсера при завершении и отписке.

### Ответ на 1 минуту

> Observable — это ленивая unicast-обёртка над функцией подписки. Конструктор только запоминает функцию, которая получает \`subscriber\` и возвращает teardown, и она не выполняется до вызова \`subscribe()\`. Каждая подписка запускает её заново и создаёт независимое выполнение, поэтому два подписчика на \`http.get\` — это два реальных запроса, а \`post\` без подписки не уйдёт вовсе. Поток обязан соблюдать контракт Observer: сколько угодно \`next\`, потом не больше одного \`error\` или \`complete\`, после чего значения отбрасываются и вызывается teardown. За этим следит \`Subscriber\` — обёртка над моим Observer, которая хранит функции очистки и превращает исключения продюсера в \`error\`. Чтобы разделить одно выполнение между подписчиками, нужен multicast — \`share\` или \`shareReplay\`. И Observable сам по себе не асинхронен: \`of(1, 2, 3)\` отдаёт значения синхронно.`,
      en: `## In short

An \`Observable\` is **not a stream of data — it is a recipe for one**. You describe a function saying "here is what to do when somebody subscribes to me", and it just sits there until the first \`subscribe()\`. Subscribe, and the recipe is executed from scratch, **just for you**.

Analogy: it is not a pot of soup, it is a **recipe card**. While nobody is cooking, the kitchen is quiet. A second guest arrives and a second pot gets cooked from the beginning — nobody pours from the first one.

## How it works, step by step

1. \`new Observable(fn)\` merely **remembers** \`fn\`. Nothing runs, no side effects happen.
2. Somebody calls \`subscribe(observer)\`. RxJS wraps your observer in a \`Subscriber\` — a "safe" wrapper.
3. Only now does \`fn(subscriber)\` run: the HTTP request goes out, the timer starts, the socket opens.
4. Inside \`fn\` you call \`subscriber.next(v)\` — as many times as you like.
5. You finish with either \`complete()\` or \`error(e)\` — **terminal, exactly once**.
6. \`fn\` returns a teardown function; it is invoked on termination or on \`unsubscribe()\`.
7. A second subscriber arrives — steps 2–6 repeat **from the start, independently**. That is **unicast**.

## The Observer contract: the grammar of a stream

An Observer is a plain object with three methods:

- \`next(value)\` — 0..N times;
- \`error(err)\` — terminal, at most once;
- \`complete()\` — terminal, at most once.

The formula: \`next* (error | complete)?\` — "any number of nexts, then at most one termination". After a terminal event no values get through, even if the producer keeps sending them, and teardown fires immediately. The \`Subscriber\` polices this: it enforces the contract, catches exceptions in callbacks, and holds the resource-releasing logic.

## Example

\`\`\`ts
const obs = new Observable<number>((subscriber) => {
  console.log('start'); // printed on EVERY subscription
  subscriber.next(1);
  subscriber.complete();
  subscriber.next(2);   // silently ignored — the stream is already closed
  return () => console.log('teardown');
});

obs.subscribe(v => console.log('A', v)); // start, A 1, teardown
obs.subscribe(v => console.log('B', v)); // start, B 1, teardown
\`\`\`

Why: \`next(2)\` is lost because the \`Subscriber\` is closed after \`complete()\`. And "start" prints twice because each subscription is a **separate execution**. Same reason an Angular HTTP request never fires until you subscribe (or until the \`async\` pipe subscribes for you).

## What to say in the interview

> An Observable is a lazy, unicast abstraction over a "subscribe function". The constructor takes \`(subscriber) => teardown\`, and that function does not run until \`subscribe()\` is called: the Observable itself is only a description of a stream, not running code. Every subscription re-runs the chain and produces an independent execution, which is why two subscribers on \`http.get()\` mean two real requests. The stream must honour the Observer contract with the grammar \`next* (error | complete)?\`: after \`error\` or \`complete\` no more values arrive and teardown runs. The \`Subscriber\` enforces that — it is a safe wrapper around the Observer that also catches exceptions in callbacks. To share a single execution across subscribers you need multicasting — \`share\`/\`shareReplay\`, i.e. a Subject sitting between producer and consumers.

## Gotchas

- **"An Observable is basically a Promise"** — no. A Promise is eager, caches one result, and cannot be cancelled; an Observable is lazy, unicast, multi-valued, and cancellable.
- **Two \`| async\` on one \`http.get()\`** means two real requests. Fix with \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **Forgetting to return teardown** — the timer or listener outlives the unsubscription: a leak plus "phantom" emissions.
- **\`next\` after \`complete\`** does not throw, it is silently dropped — the value disappears and the cause is hard to track down.
- **Follow-up question**: "then what is a Subject?" — a Subject is multicast and hot; it does not create a new execution per subscriber.
- **And another**: an Observable is **not inherently asynchronous** — the code in \`new Observable\` may run fully synchronously; asynchrony comes from the producer or a scheduler.`
    }
  },
  {
    id: 'rxjs-002',
    category: 'rxjs',
    level: 'Hard',
    tags: ['teardown', 'subscription', 'memory-leak'],
    question: {
      ru: 'Как работает teardown-логика и почему так важно её возвращать из функции подписки?',
      en: 'How does teardown logic work and why is it important to return it from the subscribe function?'
    },
    answer: {
      ru: `## В чём суть

Teardown — это **функция уборки**, которую вы возвращаете из функции подписки внутри \`new Observable(...)\`. RxJS вызовет её, когда подписка закончится **любым** способом: \`complete()\`, \`error()\` или \`unsubscribe()\`. Внутри вы гасите то, что зажгли: таймер, слушатель события, сокет, запрос.

Аналогия: вы сняли квартиру — при выезде надо **сдать ключи и перекрыть воду**. RxJS честно напомнит вам о выезде (вызовет teardown в нужный момент), но кран за вас не закроет: если вы не написали teardown, вода будет литься дальше — за ваш счёт.

**Какую проблему решает.** Отписка сама по себе только **перестаёт доставлять** значения подписчику. Продюсер — \`setInterval\`, обработчик \`addEventListener\`, открытый WebSocket — об этом не знает и продолжает работать. Без teardown каждый заход на страницу добавляет ещё один «живой» таймер или слушатель: память растёт, процессор занят, а иногда срабатывает старая логика («фантомные» запросы, двойные уведомления). Teardown — единственное место, где Observable может остановить того, кто реально производит значения.

## Словарик терминов

- **Функция подписки (subscribe function)** — функция, которую передают в \`new Observable(fn)\`; запускается на каждый \`subscribe()\` и создаёт продюсера.
- **Продюсер (producer)** — тот, кто реально создаёт значения: таймер, слушатель DOM-события, сокет, HTTP-запрос, \`ResizeObserver\`.
- **Teardown / финализатор (finalizer)** — функция очистки, которую возвращает функция подписки или добавляют через \`subscription.add()\`. В RxJS 7 их называют finalizers.
- **Subscription (подписка)** — объект с методом \`unsubscribe()\` и списком финализаторов. Возвращается из \`subscribe()\`.
- **Subscriber** — внутренняя обёртка RxJS над вашим Observer; она же является \`Subscription\` и хранит ваш teardown.
- **\`closed\`** — флаг подписки «уже закрыта». После него значения не доставляются, а финализаторы не запускаются повторно.
- **Идемпотентность** — свойство «повторный вызов ничего не меняет»: второй \`unsubscribe()\` безопасен.
- **Утечка памяти (memory leak)** — объект, который больше не нужен, но не может быть удалён сборщиком мусора, потому что на него кто-то ссылается (например, живой таймер).
- **Фантомные эмиссии** — работа, которую продюсер продолжает делать после отписки: таймер тикает, обработчик вызывается.
- **\`UnsubscriptionError\`** — ошибка RxJS, которая собирает все исключения, брошенные финализаторами во время одной отписки.
- **\`finalize\`** — оператор, который добавляет функцию очистки со стороны потребителя, в цепочке \`pipe\`.
- **\`AbortController\`** — браузерный API для отмены \`fetch\`: \`controller.abort()\` прерывает запрос.
- **\`DestroyRef\` / \`takeUntilDestroyed\`** — Angular-механизм «сделай что-то при уничтожении компонента» и оператор, который отписывается в этот момент.

## Как это работает под капотом

Путь teardown от создания до вызова:

1. Внутри \`new Observable(subscriber => ...)\` вы создаёте ресурс — \`setInterval\`, \`addEventListener\`, \`new WebSocket\`.
2. Из этой же функции вы **возвращаете** функцию-уборщик. Вернуть можно функцию, другую \`Subscription\`, любой объект с методом \`unsubscribe\` или ничего.
3. RxJS кладёт возвращённое в список финализаторов того \`Subscriber\`, который получила функция подписки. \`Subscriber\` — это и есть подписка.
4. \`pipe\` строит **цепочку подписок**: каждый оператор создаёт своего подписчика, и подписчик ниже по цепочке хранит подписчика выше как дочерний финализатор. Поэтому ваша итоговая \`Subscription\` связана с самым верхом — источником.
5. Наступает конец — \`unsubscribe()\`, \`complete()\` или \`error()\`. Подписка ставит флаг \`closed = true\`, поэтому новые значения уже не проходят.
6. Финализаторы вызываются по порядку, а дочерние подписки закрываются рекурсивно — так отмена **поднимается по цепочке до самого источника**. Порядок на практике: сначала teardown источника, затем \`finalize\` операторов в порядке записи в \`pipe\`, затем то, что вы добавили к своей подписке через \`add()\`.
7. Если какой-то финализатор бросил исключение, остальные **всё равно выполняются**, а в конце RxJS бросает одну \`UnsubscriptionError\` со списком всех ошибок — тому, кто запустил закрытие.
8. Повторный \`unsubscribe()\` ничего не делает, потому что подписка уже \`closed\`. А если добавить финализатор к **уже закрытой** подписке, он выполнится сразу.

Сам механизм небольшой. Упрощённая версия \`Subscription\`:

\`\`\`js
class MiniSubscription {
  closed = false;
  finalizers = [];
  add(fn) {
    if (this.closed) fn();               // уже закрыта — убираем сразу
    else this.finalizers.push(fn);
  }
  unsubscribe() {
    if (this.closed) return;             // идемпотентность: второй вызов пустой
    this.closed = true;
    const errors = [];
    for (const fn of this.finalizers) {
      try { fn(); } catch (e) { errors.push(e); }   // одна ошибка не мешает остальным
    }
    this.finalizers = [];
    if (errors.length) throw new AggregateError(errors); // в RxJS — UnsubscriptionError
  }
}

const s = new MiniSubscription();
s.add(() => console.log('очистка 1'));
s.add(() => { throw new Error('сбой'); });
s.add(() => console.log('очистка 3'));
try { s.unsubscribe(); } catch (e) { console.log('ошибок при очистке:', e.errors.length); }
s.unsubscribe();
s.add(() => console.log('добавлено после закрытия — выполнено сразу'));
// очистка 1
// очистка 3
// ошибок при очистке: 1
// добавлено после закрытия — выполнено сразу
\`\`\`

### Пример 1. Таймер, который действительно останавливается

\`\`\`ts
const timer$ = new Observable<number>(sub => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => { clearInterval(id); console.log('interval остановлен'); };
});

const s = timer$.subscribe(v => console.log('tick', v));
setTimeout(() => s.unsubscribe(), 3500);
// tick 0
// tick 1
// tick 2
// interval остановлен
\`\`\`

Без \`clearInterval\` таймер тикал бы вечно: подписка закрыта, значения никуда не доставляются, но колбэк \`setInterval\` вызывается раз в секунду и держит в памяти всё, на что ссылается замыкание.

### Пример 2. Отписка глушит доставку, а не продюсера

\`\`\`ts
const target = new EventTarget();

const leaky$ = new Observable<string>(s => {
  const h = () => { console.log('обработчик вызван'); s.next('ping'); };
  target.addEventListener('ping', h);
  // teardown забыли
});

const sub = leaky$.subscribe(v => console.log('получено', v));
target.dispatchEvent(new Event('ping'));
sub.unsubscribe();
target.dispatchEvent(new Event('ping'));
// обработчик вызван
// получено ping
// обработчик вызван      ← после отписки слушатель жив, просто «получено» уже нет
\`\`\`

Это и есть фантомная работа: \`Subscriber\` после отписки молча отбрасывает \`next\`, но слушатель висит на объекте. С \`return () => target.removeEventListener('ping', h)\` второго «обработчик вызван» не будет. Обратите внимание: в \`removeEventListener\` нужна **та же** функция \`h\`, а не новая стрелка — иначе слушатель не снимется.

### Пример 3. Teardown срабатывает и на \`complete\`, и на \`error\`

\`\`\`ts
const http$ = new Observable(sub => {
  const id = setTimeout(() => { sub.next({ ok: true }); sub.complete(); }, 10);
  return () => { clearTimeout(id); console.log('teardown: запрос убран'); };
});

http$.pipe(finalize(() => console.log('finalize'))).subscribe({
  next: v => console.log('next', v),
  complete: () => console.log('complete'),
});
// next { ok: true }
// complete
// teardown: запрос убран
// finalize
\`\`\`

Поэтому потоки, которые завершаются сами (HTTP-запрос, \`of\`, поток с \`take(1)\` — «взять первое значение и завершиться»), «чистятся» без вашего участия, а бесконечные (\`interval\`, \`fromEvent\`, WebSocket) — только при отписке. С \`error\` всё так же: сначала ваш колбэк \`error\`, затем teardown. Порядок важен: подписчик **сначала** получает финальное уведомление, и только потом закрывается подписка.

### Что можно вернуть из функции подписки

\`\`\`ts
// 1) функцию — самый частый вариант
new Observable(s => { const id = setInterval(tick, 1000); return () => clearInterval(id); });

// 2) другую подписку — она будет отписана вместе с этой
new Observable(s => interval(1000).subscribe(s));

// 3) объект с методом unsubscribe
new Observable(s => ({ unsubscribe: () => socket.close() }));

// 4) ничего — если чистить нечего (синхронный поток, который сам завершился)
new Observable(s => { s.next(1); s.complete(); });
\`\`\`

Вариант 2 удобен, когда вы строите Observable поверх другого: после отписки внешнего потока внутренняя подписка тоже закрывается (\`closed === true\`).

### \`Subscription.add\` и порядок очистки в цепочке

\`add()\` прикрепляет к подписке дополнительный финализатор — функцию или другую подписку. Так собирают «мешок» подписок, который закрывается одним вызовом:

\`\`\`ts
const bag = new Subscription();
bag.add(interval(100).subscribe());
bag.add(new Observable(() => () => console.log('уборка 2')).subscribe());
bag.unsubscribe();
console.log('bag closed', bag.closed);
// уборка 2
// bag closed true
\`\`\`

А вот в каком порядке всё закрывается, если между источником и вами стоят операторы:

\`\`\`ts
const src$ = new Observable(s => {
  const id = setInterval(() => s.next(1), 10);
  return () => { clearInterval(id); console.log('teardown источника'); };
});

const sub = src$.pipe(
  finalize(() => console.log('finalize A (выше map)')),
  map(x => x * 2),
  finalize(() => console.log('finalize B (ниже map)')),
).subscribe();
sub.add(() => console.log('add у потребителя'));
sub.unsubscribe();
// teardown источника
// finalize A (выше map)
// finalize B (ниже map)
// add у потребителя
\`\`\`

Отписка начинается с вашей подписки, но рекурсивно поднимается к источнику, и его teardown выполняется первым; затем по пути вниз — финализаторы операторов в порядке записи. Это важно, если в \`finalize\` вы рассчитываете, что ресурс источника уже освобождён.

### \`finalize\` — уборка со стороны потребителя

Teardown пишет **автор** потока внутри \`new Observable\`. Но если поток уже готов (например, \`http.get\`), а вам нужно что-то сделать в конце — выключить спиннер, уменьшить счётчик запросов, — teardown туда не вставить. Для этого есть оператор \`finalize(fn)\`: он регистрирует \`fn\` как ещё один финализатор подписки, и тот срабатывает при \`complete\`, \`error\` и \`unsubscribe\`:

\`\`\`ts
this.loading.set(true);
this.api.loadUsers().pipe(
  finalize(() => this.loading.set(false))   // при любом исходе
).subscribe(users => this.users.set(users));
\`\`\`

Разница в уровне: teardown — часть **продюсера** и останавливает источник; \`finalize\` — часть **потребителя** и освобождает его состояние. Срабатывают оба.

### Обёртка над браузерным API: \`ResizeObserver\`

В сниппете под ответом — правильный шаблон обёртки:

\`\`\`ts
function fromResize(el: Element): Observable<DOMRectReadOnly> {
  return new Observable(subscriber => {
    const ro = new ResizeObserver(entries => subscriber.next(entries[0].contentRect));
    ro.observe(el);
    return () => ro.disconnect();
  });
}
\`\`\`

Ключевое: \`ResizeObserver\` создаётся **внутри** функции подписки. Поток unicast, поэтому каждый подписчик получает **свой** наблюдатель, и teardown отключает только его. Комментарий в сниппете «отключиться, когда уходит последний подписчик» верен для одного подписчика; при нескольких происходит вот что (проверено на заглушке \`ResizeObserver\`, которая печатает свои действия):

\`\`\`ts
const resize$ = fromResize(el);
const a = resize$.subscribe(r => console.log('A', r.width));
const b = resize$.subscribe(r => console.log('B', r.width));
// ResizeObserver #1 создан
// ResizeObserver #2 создан
a.unsubscribe();
// ResizeObserver #1 отключён   ← B продолжает получать размеры через #2
b.unsubscribe();
// ResizeObserver #2 отключён
\`\`\`

Если нужен ровно один наблюдатель на всех, добавьте \`share()\` — тогда отключение действительно произойдёт, когда уйдёт последний подписчик.

### \`share\` — один продюсер на всех и общий teardown

\`share()\` ставит между источником и подписчиками \`Subject\`, подписывается на источник при первом подписчике и **отписывается от него, когда уходит последний** (это называют подсчётом ссылок, refCount). Значит, teardown источника вызывается один раз — в самом конце:

\`\`\`ts
const shared$ = fromResize(el).pipe(share());
const c = shared$.subscribe(r => console.log('C', r.width));
const d = shared$.subscribe(r => console.log('D', r.width));
// ResizeObserver #3 создан   ← один на двоих
c.unsubscribe();             // ничего не отключается: D ещё подписан
d.unsubscribe();
// ResizeObserver #3 отключён
\`\`\`

Используйте \`share\`, когда продюсер дорогой (сокет, наблюдатель за большим списком) и подписчиков несколько.

Анти-пример, о котором предупреждает старое правило «считайте ресурсы на подписку»: если создать один \`ResizeObserver\` **снаружи** функции подписки, а в teardown каждого подписчика вызывать \`disconnect()\`, то первая же отписка отключит наблюдатель для всех остальных — они просто перестанут получать значения.

### \`AbortController\` — teardown для \`fetch\`

Промис отменить нельзя, но запрос — можно. Teardown вызывает \`abort()\`:

\`\`\`ts
const fromFetchJson = (url: string) => new Observable(subscriber => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { subscriber.next(data); subscriber.complete(); })
    .catch(err => { if (err.name !== 'AbortError') subscriber.error(err); });
  return () => controller.abort();
});

const s = fromFetchJson('/api/slow').subscribe(v => console.log('ответ', v));
setTimeout(() => s.unsubscribe(), 100);
// запрос прерван (AbortError), "ответ" не печатается
\`\`\`

В RxJS это уже готово в \`fromFetch\` из \`rxjs/fetch\`, а Angular \`HttpClient\` при отписке сам отменяет запрос. Если \`switchMap\` переключился на новый поиск, старый запрос обрывается именно через такой teardown.

### Teardown в Angular: \`takeUntilDestroyed\` и \`DestroyRef\`

Teardown срабатывает, только если кто-то отпишется. В компонентах это делают автоматически:

\`\`\`ts
@Component({ /* ... */ })
export class WidthBadge {
  private el = inject(ElementRef);
  width = signal(0);

  constructor() {
    fromResize(this.el.nativeElement)
      .pipe(takeUntilDestroyed())          // отписка при уничтожении компонента
      .subscribe(r => this.width.set(r.width));
  }
}
\`\`\`

\`takeUntilDestroyed()\` без аргументов работает в контексте внедрения (конструктор, инициализатор поля); вне его передают \`DestroyRef\`: \`takeUntilDestroyed(this.destroyRef)\`. Для ресурсов без Observable есть \`inject(DestroyRef).onDestroy(() => ...)\` — тот же teardown, но для компонента. Пайп \`async\` и \`toSignal\` (превращает поток в сигнал) тоже отписываются сами при уничтожении компонента.

### Где это применяется на практике

- **Обёртки над браузерными API** в UI-библиотеках: \`ResizeObserver\` для адаптивных колонок грида, \`IntersectionObserver\` для ленивой подгрузки строк, \`MutationObserver\`.
- **WebSocket и \`EventSource\`** в дашбордах реального времени: teardown закрывает соединение, когда пользователь ушёл со страницы.
- **Опрос сервера (polling)**: \`interval\` + запрос — при уходе с экрана таймер останавливается благодаря teardown \`interval\`.
- **HTTP-слой**: отмена устаревших запросов в поиске и фильтрах больших таблиц через \`switchMap\`, который отписывается от старого запроса.
- **Глобальные слушатели** (\`keydown\` для горячих клавиш, \`resize\` окна) в сервисах с долгим временем жизни: без teardown каждый открытый диалог добавляет ещё один слушатель.

## Важные нюансы и подводные камни

- **Нет teardown у бесконечного источника** — классическая утечка. Особенно \`setInterval\`, \`addEventListener\`, WebSocket, наблюдатели браузера.
- **«Я же отписался, значит всё остановилось».** Нет: отписка глушит доставку значений, а продюсер останавливает только teardown.
- **Исключение внутри teardown.** В RxJS 7 остальные финализаторы всё равно выполнятся, но в конце RxJS бросит \`UnsubscriptionError\` тому, кто запустил закрытие: вашему коду с \`unsubscribe()\` или продюсеру, который вызвал \`complete()\`. Там оно превращается в необработанное исключение — поэтому уборка должна быть безопасной (\`try/catch\` вокруг рискованных вызовов).
- **Забыть, что \`complete()\` тоже вызывает teardown.** Поэтому HTTP-потоки чистятся сами, а \`interval\` — нет; и поэтому не нужно вручную отписываться от \`http.get\` после ответа.
- **Teardown и \`finalize\` — не одно и то же.** Teardown — часть продюсера внутри Observable, \`finalize\` — оператор потребителя в \`pipe\`. Срабатывают оба, teardown источника — раньше.
- **Общий ресурс на нескольких подписчиков.** Если продюсер создан вне функции подписки, teardown первого ушедшего подписчика сломает остальных. Создавайте ресурс на каждую подписку или используйте \`share()\`.
- **Teardown синхронный.** RxJS не ждёт промис из функции очистки; асинхронную уборку (например, \`await socket.close()\`) он не дождётся, а её ошибки никто не обработает.
- **Другая функция в \`removeEventListener\`.** Снимать нужно ровно ту же ссылку, что добавляли, иначе слушатель останется.
- **Синхронное завершение до \`return\`.** Если функция подписки вызвала \`complete()\` до того, как вернула teardown, тот выполнится сразу после возврата — ресурс, созданный «на всякий случай», будет тут же освобождён.
- **Готовые создатели уже умеют убирать.** \`fromEvent\`, \`interval\`, \`timer\`, \`fromFetch\`, \`webSocket\` содержат правильный teardown — писать \`new Observable\` вручную стоит только для API, которых в RxJS нет.

**Плюсы:** одно место для освобождения ресурсов при любом исходе; отмена автоматически доходит до источника через всю цепочку; повторная отписка безопасна; позволяет отменять реальную работу (запросы, таймеры), а не только игнорировать результат.
**Минусы:** про teardown легко забыть, и ошибка не видна сразу — только как медленная утечка; уборка синхронная; при ручных обёртках нужно продумать, сколько ресурсов на сколько подписчиков.

## Как это спрашивают на собеседовании

**Главный вывод:** teardown — функция, которую возвращает функция подписки; RxJS вызывает её при \`complete\`, \`error\` и \`unsubscribe\`, и это единственный способ остановить продюсера. Отписка без teardown лишь перестаёт доставлять значения — таймеры и слушатели продолжают жить.

Типичные формулировки: «Что вернуть из \`new Observable\`, чтобы не было утечки?», «Почему после отписки таймер продолжает работать?», «Как обернуть \`ResizeObserver\` в Observable?», «Чем teardown отличается от \`finalize\`?».

Что могут спросить следом:

- *В каком порядке выполняется очистка в цепочке операторов?* — Сначала teardown источника, затем \`finalize\` в порядке записи в \`pipe\`, затем финализаторы вашей подписки.
- *Что будет, если teardown бросит исключение?* — Остальные финализаторы выполнятся, потом вылетит \`UnsubscriptionError\` со всеми ошибками.
- *Нужно ли отписываться от \`http.get\`?* — После ответа нет, поток завершился и сам вызвал teardown; но если компонент может уничтожиться раньше ответа, отписка отменит запрос.
- *Что будет при двойном \`unsubscribe()\`?* — Ничего: подписка уже \`closed\`, уборка выполнилась один раз.
- *Как сделать один ресурс на всех подписчиков?* — \`share()\`: teardown источника вызовется, когда уйдёт последний.

### Ответ на 1 минуту

> Teardown — это функция, которую я возвращаю из функции подписки Observable. RxJS регистрирует её как финализатор подписки и вызывает при любом закрытии: \`complete\`, \`error\` или \`unsubscribe\`. Это единственное правильное место, чтобы освободить ресурс — очистить интервал, снять слушатель, отключить \`ResizeObserver\`, закрыть сокет, вызвать \`abort()\` у запроса. Важно понимать, что сама отписка только перестаёт доставлять значения, а продюсер без teardown продолжит работать — это утечка и фантомная работа. \`pipe\` связывает подписки в цепочку, поэтому отписка поднимается до источника: сначала его teardown, затем \`finalize\` операторов. Повторный \`unsubscribe\` безопасен, а если финализатор бросит исключение, остальные всё равно выполнятся, и вылетит \`UnsubscriptionError\`. В Angular отписку обеспечивают \`takeUntilDestroyed\`, \`async\` и \`toSignal\`.`,
      en: `## In short

Teardown is the **clean-up function** you return from the body of an Observable. RxJS calls it when the stream ends **any** way at all: \`complete()\`, \`error()\`, or \`unsubscribe()\`. Inside it you switch off whatever you switched on: a timer, an event listener, a socket, a request.

Analogy: you rent a flat — when you move out you **hand back the keys and turn off the tap**. RxJS reliably tells you that move-out day has come, but it will not close the tap for you: no teardown, and the water keeps running on your bill.

## How it works, step by step

1. Inside \`new Observable(sub => ...)\` you create a resource (\`setInterval\`, \`addEventListener\`, a WebSocket).
2. From that same function you **return** a clean-up function.
3. RxJS stores it in the \`Subscription\` object, which keeps a list of "finalizers".
4. \`pipe\` builds a **tree** of subscriptions: the outer subscription adds the inner one as a child.
5. The end comes — \`unsubscribe()\`, \`complete()\`, or \`error()\`. The subscription is marked \`closed\`.
6. All finalizers run **recursively down the tree**: yours first, then those of the inner operators. That is how cancellation reaches the actual producer.
7. Calling \`unsubscribe()\` again breaks nothing: teardown is **idempotent** and runs exactly once.

## Example

\`\`\`ts
const timer$ = new Observable<number>((sub) => {
  let i = 0;
  const id = setInterval(() => sub.next(i++), 1000);
  return () => clearInterval(id); // mandatory!
});

const s = timer$.subscribe(console.log);
setTimeout(() => s.unsubscribe(), 3500); // the interval really stops
\`\`\`

Why: without \`clearInterval\` the timer would tick forever. After unsubscription the \`Subscriber\` simply **ignores** incoming \`next\` calls, but the producer knows nothing about that and keeps working — only your teardown can stop it.

## What to say in the interview

> Teardown is the function returned from an Observable's subscribe function; RxJS invokes it on any termination of the subscription — \`complete\`, \`error\`, or \`unsubscribe\`. It is the only correct place to release resources: clear intervals and listeners, close sockets, cancel requests. Technically the teardown is registered on the \`Subscription\` as a finalizer, and \`pipe\` builds a hierarchy of subscriptions where the outer one adds inner ones as children, so \`unsubscribe\` propagates recursively down the whole operator chain to the source. The important nuance is that after unsubscribing the \`Subscriber\` stops delivering values, but the producer does not stop by itself — without teardown it keeps running and you get a memory leak plus phantom emissions. Teardown is idempotent: a repeated \`unsubscribe\` is safe and the clean-up happens once.

## Gotchas

- **No teardown on an infinite producer** — the classic leak. Especially \`setInterval\`, \`addEventListener\`, WebSockets.
- **"I unsubscribed, so everything stopped"** — no: unsubscribing mutes delivery, not the producer.
- **Throwing inside teardown** leaves the remaining finalizers unexecuted; clean-up must be defensive.
- **Forgetting that \`complete()\` also triggers teardown** — which is why HTTP streams clean themselves up and \`interval\` does not.
- **Follow-up question**: how does teardown differ from \`finalize\`? Teardown belongs to the **producer** (inside the Observable), \`finalize\` is an operator in the \`pipe\` for the **consumer**; both fire, but they live at different levels.
- **And another**: when wrapping browser APIs, one Observable instance can have many subscribers — count resources per subscription, or the first \`disconnect()\` kills everyone else.`
    },
    codeSnippet: `// Pattern: a custom Observable that wraps a browser API safely
function fromResize(el: Element): Observable<DOMRectReadOnly> {
  return new Observable((subscriber) => {
    const ro = new ResizeObserver((entries) => {
      subscriber.next(entries[0].contentRect);
    });
    ro.observe(el);
    // teardown: disconnect when the last subscriber leaves
    return () => ro.disconnect();
  });
}`
  },
  {
    id: 'rxjs-003',
    category: 'rxjs',
    level: 'Medium',
    tags: ['hot-cold', 'multicasting', 'share', 'sharereplay', 'connectable'],
    question: {
      ru: 'В чём разница между hot и cold Observable? Как сделать cold-поток горячим?',
      en: 'What is the difference between hot and cold Observables? How do you make a cold stream hot?'
    },
    answer: {
      ru: `## В чём суть

Всё сводится к одному вопросу: **где живёт продюсер** — тот, кто реально создаёт значения (таймер, HTTP-запрос, сокет, DOM-события). У **cold** Observable продюсер создаётся внутри, заново на каждую подписку: два подписчика — два таймера, два запроса, и каждый получает свою копию значений с самого начала. У **hot** продюсер живёт снаружи и один на всех: подписчик подключается к тому, что уже идёт, и видит только то, что случится после подписки.

Аналогия: cold — **фильм по ссылке**: каждый нажимает play и смотрит с первой минуты, у каждого своя копия. Hot — **прямой эфир**: включился в середине — начало пропустил, и эфир один на всех зрителей.

**Какую проблему решает.** Если не понимать разницу, получаются два типичных бага. Первый — **лишняя работа**: два \`async\` в шаблоне на один \`http.get()\` дают два одинаковых запроса, три виджета на дашборде — три WebSocket-соединения. Второй — **пропущенные данные**: подписались на hot-поток слишком поздно и не получили значение, которое уже пролетело. Сделать cold горячим — значит **поставить между источником и подписчиками \`Subject\`**: источник выполняется один раз, а Subject раздаёт значения всем. Это называется multicasting, и для него есть готовые операторы \`share\`, \`shareReplay\` и \`connectable\`.

## Словарик терминов

- **Продюсер (producer)** — источник значений: таймер, запрос, сокет, слушатель событий.
- **Cold Observable («холодный»)** — продюсер создаётся внутри функции подписки, заново для каждого подписчика.
- **Hot Observable («горячий»)** — продюсер существует независимо от подписчиков и общий для всех.
- **Warm («тёплый»)** — неофициальный термин: общий поток, который запускается только с приходом первого подписчика (так работает \`share\`).
- **Unicast / multicast** — одно выполнение на одного подписчика / одно выполнение на многих.
- **Subject** — объект, который одновременно Observer (у него есть \`next\`) и Observable (на него можно подписаться); «тройник», раздающий значения всем текущим подписчикам.
- **\`ReplaySubject\`** — Subject, который запоминает последние N значений и сразу отдаёт их новому подписчику.
- **Счётчик подписчиков (refCount)** — число активных подписчиков; по нему операторы решают, когда запустить и когда остановить источник.
- **\`share\`** — оператор: общий Subject, старт по первому подписчику, остановка и сброс по последнему.
- **\`shareReplay\`** — оператор: то же, но с \`ReplaySubject\` внутри — опоздавшие получают последние значения.
- **\`connectable\`** — функция: общий Subject, который запускают вручную методом \`connect()\`.
- **\`defer\`** — создатель потока, который вызывает фабрику на каждую подписку; превращает «уже запущенное» в cold.
- **\`async\` pipe** — Angular-пайп, который подписывается на Observable в шаблоне; каждый \`| async\` — отдельная подписка.

## Как это работает под капотом

Как cold становится hot:

1. Observable — это функция подписки, которая выполняется на каждый \`subscribe()\`. Всё, что в ней написано — \`setInterval\`, \`fetch\`, \`new WebSocket\`, — повторится для каждого подписчика. Это и есть cold.
2. Чтобы выполнение было одно, нужен посредник, который подпишется на источник **один раз**. Таким посредником служит \`Subject\`: у него есть \`next\`/\`error\`/\`complete\`, поэтому его можно передать в \`source.subscribe(subject)\`.
3. Подписчики подписываются не на источник, а на Subject. Subject хранит их список и на каждое значение источника просто проходит по списку и вызывает \`next\` у каждого.
4. Поскольку продюсер теперь один и работает независимо от того, когда пришёл конкретный подписчик, опоздавший видит только новые значения — поток стал hot.
5. Остаются два вопроса: **когда** подписать Subject на источник и **когда** отписать. Операторы отвечают на них по-разному: \`share\` и \`shareReplay\` считают подписчиков (первый пришёл — старт, последний ушёл — стоп), \`connectable\` ждёт ручного \`connect()\`.
6. Третий вопрос — **что получит опоздавший**. Обычный Subject — ничего из прошлого, \`ReplaySubject\` — последние N значений. Это различие между \`share\` и \`shareReplay\`.

### Cold на примере

\`\`\`ts
const cold$ = new Observable<number>(subscriber => {
  console.log('продюсер создан');            // выполнится на КАЖДЫЙ subscribe
  let i = 0;
  const id = setInterval(() => subscriber.next(i++), 1000);
  return () => clearInterval(id);            // teardown — свой у каждой подписки
});

cold$.subscribe(v => console.log('A', v));
setTimeout(() => cold$.subscribe(v => console.log('B', v)), 2500);
// продюсер создан
// A 0, A 1
// продюсер создан               ← второй таймер для B
// A 2, B 0, A 3, B 1 ...         ← B начал с нуля
\`\`\`

То же самое с \`HttpClient\`, и это самый частый баг в Angular:

\`\`\`html
<p>Всего: {{ (users$ | async)?.length }}</p>
@for (u of users$ | async; track u.id) { <span>{{ u.name }}</span> }
<!-- users$ = http.get(...): два async = две подписки = ДВА реальных HTTP-запроса -->
\`\`\`

Типичные cold-источники: \`of\`, \`from\` (для массивов), \`interval\`, \`timer\`, \`defer\`, \`HttpClient.get/post\`, \`fromFetch\`, \`ajax\`. Признак: **пока никто не подписался — ничего не происходит**, а каждая подписка запускает работу заново.

### Hot на примере

\`\`\`ts
const subject = new Subject<number>();

subject.next(1);                                // слушателей нет — значение потеряно
subject.subscribe(v => console.log('A', v));
subject.next(2);
subject.subscribe(v => console.log('B', v));
subject.next(3);
// A 2
// A 3
// B 3                                          ← B никогда не увидит 1 и 2
\`\`\`

\`\`\`ts
const clicks$ = fromEvent(document, 'click');
clicks$.subscribe(() => console.log('A клик'));
clicks$.subscribe(() => console.log('B клик'));
// один клик:
// A клик
// B клик
\`\`\`

Тонкость: \`fromEvent\` на каждую подписку вешает **свой** слушатель, но сами клики происходят независимо от подписчиков — продюсер (пользователь и DOM) снаружи. Поэтому по сути поток hot: подписались поздно — прошлые клики не получите.

Типичные hot-источники: \`Subject\` и его наследники, \`fromEvent\`, WebSocket, в Angular — \`form.valueChanges\`, \`router.events\`, \`EventEmitter\` за \`@Output()\`. Признак: **значения могут появляться без подписчиков**, и опоздавший их не получит.

Быстрый тест: «если я подпишусь дважды — работа выполнится дважды?» Да → cold. «Если я подпишусь поздно — я что-то пропущу?» Да → hot.

### Subject посередине — multicasting вручную

\`\`\`ts
const source$ = interval(1000);                 // cold
const subject = new Subject<number>();          // «тройник»

subject.subscribe(v => console.log('A', v));
subject.subscribe(v => console.log('B', v));
source$.subscribe(subject);                     // ОДНА подписка на источник, один таймер
// A 0, B 0, A 1, B 1 ...                       ← оба видят одни и те же значения
\`\`\`

Минус ручного способа: вы сами решаете, когда подписать Subject на источник и когда отписать, и легко получить утечку или потерю значений. Операторы ниже делают это за вас и различаются только тем, **когда стартуют, когда останавливаются и помнят ли историю**.

### \`share()\` — общий эфир со счётчиком слушателей

\`share()\` ставит внутри обычный \`Subject\` и считает подписчиков: **первый подписчик запускает источник, последний ушедший — останавливает**. Истории нет: опоздавший видит только новые значения.

\`\`\`ts
const hot$ = interval(1000).pipe(share());

hot$.subscribe(v => console.log('A', v));                         // источник стартовал
setTimeout(() => hot$.subscribe(v => console.log('B', v)), 2500);
// A 0, A 1, A 2, B 2, A 3, B 3 ...               ← B подключился «в середине» и сразу видит 2
\`\`\`

Когда все отписались, \`share()\` отписывается от источника и **сбрасывает** Subject: следующий подписчик запустит источник с нуля (\`C 0, C 1, ...\`). То же происходит после \`complete\` и \`error\` источника. Всё это настраивается в RxJS 7:

\`\`\`ts
share({
  connector: () => new ReplaySubject(1),  // какой Subject поставить внутрь
  resetOnError: true,                     // сбрасываться после ошибки (можно перезапустить)
  resetOnComplete: false,                 // не сбрасываться после complete
  resetOnRefCountZero: true,              // сбрасываться, когда ушли все
});
\`\`\`

Когда брать: несколько потребителей одного **живого** потока, история не нужна — сообщения из сокета, тяжёлая обработка событий мыши, общий поток изменений формы.

### \`shareReplay()\` — эфир плюс запись для опоздавших

\`shareReplay(n)\` — тот же \`share\`, но внутри \`ReplaySubject\`: он **помнит последние n значений** и мгновенно проигрывает их каждому новому подписчику. Поэтому это стандартный **кэш HTTP-ответа**:

\`\`\`ts
config$ = this.http.get<Config>('/api/config').pipe(shareReplay(1));

this.config$.subscribe(a);                         // запрос ушёл
this.config$.subscribe(b);                         // запроса нет: b ждёт тот же ответ
// ...ответ пришёл, поток завершился...
setTimeout(() => this.config$.subscribe(c), 5000); // запроса нет: c получает ответ из буфера
// итого запросов: 1
\`\`\`

С обычным \`share()\` подписчик \`c\` **отправил бы новый запрос** (итого 2): поток завершился, \`share\` сбросился, истории у него нет.

Важная разница в настройках: \`shareReplay(1)\` — это \`{ bufferSize: 1, refCount: false }\` плюс «не сбрасываться после \`complete\`». \`refCount: false\` значит, что от **незавершённого** источника он не отписывается никогда, даже если все ушли. Для одноразового HTTP это не страшно, а для бесконечного источника (\`interval\`, сокет) — утечка. Там пишите \`shareReplay({ bufferSize: 1, refCount: true })\`. Кэш завершившегося запроса при \`refCount: true\` тоже сохраняется: поздний подписчик получает ответ без нового запроса.

Когда брать: кэш запроса, «текущее состояние» для тех, кто подписался позже (пользователь, конфиг, справочники).

### \`connectable()\` — эфир с ручным рубильником

\`connectable(source$)\` тоже ставит Subject посередине, но **не подписывается на источник сам**. Подписчики подключаются к Subject и молча ждут, пока вы не вызовете \`connect()\`. Нужен, когда важно, чтобы **все подписались до первого значения** — например, у синхронного источника:

\`\`\`ts
const src$ = of(1, 2, 3);                      // выдаёт всё синхронно и завершается

const shared$ = src$.pipe(share());
shared$.subscribe(v => console.log('A', v));
shared$.subscribe(v => console.log('B', v));
// A 1, A 2, A 3, B 1, B 2, B 3                ← share не помог: A забрал всё, источник завершился,
//                                               share сбросился, и для B источник запущен заново

const conn$ = connectable(src$);
conn$.subscribe(v => console.log('A', v));     // тишина
conn$.subscribe(v => console.log('B', v));     // тишина
const sub = conn$.connect();
// A 1, B 1, A 2, B 2, A 3, B 3                ← один прогон на всех
sub.unsubscribe();                             // останавливаем тоже вручную
\`\`\`

Вид Subject задаётся опцией: \`connectable(src$, { connector: () => new ReplaySubject(1) })\`. Это современная замена \`multicast\`, \`publish\` и \`refCount\`, которые в RxJS 7 помечены deprecated и будут удалены в v8.

Когда брать: редко — когда старт и стоп должны контролироваться кодом, а не подписчиками.

### \`defer()\` — обратная задача: сделать поток холодным

Иногда проблема противоположная: источник «уже запущен», а нужно, чтобы каждая подписка начинала работу заново (например, для \`retry\`). Промис — именно такой случай: он стартует в момент создания и кэширует результат.

\`\`\`ts
const p = new Promise(res => { console.log('запрос'); setTimeout(() => res('данные'), 10); });
const fromP$ = from(p);
fromP$.subscribe(v => console.log('A', v));
setTimeout(() => fromP$.subscribe(v => console.log('B (поздний)', v)), 50);
// запрос                        ← один раз, ещё до подписки
// A данные
// B (поздний) данные            ← тот же результат, без нового запроса

const deferred$ = defer(() => fetch('/api/data'));  // фабрика вызывается на каждый subscribe
deferred$.subscribe();
deferred$.subscribe();
// два вызова fetch — поток стал cold, и retry() теперь действительно повторит запрос
\`\`\`

\`defer(factory)\` откладывает создание источника до подписки и вызывает фабрику заново для каждого подписчика. Для \`fetch\` есть готовый \`fromFetch\` из \`rxjs/fetch\`, который ещё и отменяет запрос при отписке.

### Как выбрать

- **Нужен один запрос на несколько подписчиков в момент загрузки** — одна подписка в шаблоне (\`@if (users$ | async; as users)\`), \`toSignal()\` (превращает поток в сигнал с одной подпиской внутри) или \`shareReplay\`.
- **Нужен кэш ответа для подписчиков, пришедших позже** — \`shareReplay({ bufferSize: 1, refCount: true })\` (или \`refCount: false\`, если источник гарантированно завершается).
- **Живой бесконечный поток, общий для нескольких потребителей, история не нужна** — \`share()\`.
- **Живой поток, но опоздавшему нужно последнее значение** — \`shareReplay({ bufferSize: 1, refCount: true })\` или \`share({ connector: () => new ReplaySubject(1) })\`.
- **Все подписчики должны быть на месте до первого значения, старт по команде** — \`connectable()\` + \`connect()\`.
- **Источник уже запущен (промис), а нужен перезапуск на каждую подписку** — \`defer()\` или \`fromFetch\`.
- **Сами производите события (команды, шина)** — \`Subject\` и его варианты.

### Где это применяется на практике

- **HTTP-слой и справочники**: конфиг приложения, права пользователя, списки стран и валют кэшируются через \`shareReplay\` в сервисе — их читают десятки компонентов, а запрос уходит один.
- **Дашборды реального времени**: один WebSocket-поток с котировками, \`share()\`, и много виджетов-подписчиков вместо соединения на каждый виджет.
- **Большие таблицы**: поток данных грида читают и сама таблица, и счётчик строк, и панель итогов — без multicast каждый вызвал бы загрузку.
- **Формы**: \`valueChanges\` — hot; подписка после инициализации не получит начальное значение, поэтому добавляют \`startWith(form.value)\` — оператор, который выдаёт заданное значение сразу при подписке.
- **Отладка двойных запросов**: первым делом считают подписки на cold-поток — два \`async\`, \`subscribe\` в сервисе и в компоненте, \`combineLatest\` с одним и тем же источником дважды.

## Важные нюансы и подводные камни

- **\`HttpClient.get()\` — cold.** Каждая подписка — новый запрос. «Он же уже выполнился» — типичная ошибка; лечится \`shareReplay(1)\` или одной подпиской в шаблоне.
- **\`share()\` не хранит историю.** Подписался позже — предыдущие значения не получишь. Нужна история — \`shareReplay\` или \`share({ connector: () => new ReplaySubject(1) })\`; для источника, который завершается (HTTP), у \`share\` нужно ещё \`resetOnComplete: false\`, иначе после \`complete\` он сбросится и кэша не будет.
- **Hot не значит «уже запущен».** \`share()\` стартует источник только с приходом первого подписчика. Такой поток иногда называют warm.
- **Отписались все или источник завершился → \`share()\` сбрасывается**, и следующий подписчик запустит источник заново. Для завершившегося HTTP это значит **новый запрос** — поэтому для кэша нужен именно \`shareReplay\`.
- **\`shareReplay(1)\` на бесконечном источнике без \`refCount: true\`** — утечка: источник крутится, даже когда все ушли.
- **Синхронный источник + \`share()\`.** Первый подписчик заберёт всё до того, как подпишется второй, а второй запустит источник ещё раз. Нужны все сразу — \`connectable\` и \`connect()\`.
- **\`connectable\` без \`connect()\` молчит** — подписчики висят и ничего не получают.
- **Hot не всегда значит «всё пропустил».** \`BehaviorSubject\` и \`ReplaySubject\` — hot, но опоздавшему выдают текущее или последние значения.
- **\`from(promise)\` ведёт себя как hot с памятью.** Промис уже запущен в момент создания, подписка ничего не перезапускает, а поздний подписчик получает тот же сохранённый результат. Для повторов и отмены — \`defer\` или \`fromFetch\`.
- **\`shareReplay\` внутри метода сервиса не кэширует.** \`getUser() { return this.http.get(...).pipe(shareReplay(1)); }\` создаёт новый кэш на каждый вызов. Кэшируемый поток должен быть полем сервиса.
- **\`output()\` в современном Angular — не Observable.** \`EventEmitter\` за \`@Output()\` — это Subject, а функция \`output()\` возвращает \`OutputEmitterRef\` со своим \`subscribe\`; при необходимости превращается в поток через \`outputToObservable\`.

**Плюсы:** multicasting убирает дублирующиеся запросы и соединения, даёт кэш «из коробки» и общий источник правды для многих потребителей; операторы сами управляют стартом и остановкой.
**Минусы:** легко получить утечку (\`shareReplay\` без \`refCount\`), устаревший кэш без инвалидации или неожиданный перезапуск источника после сброса \`share\`; поведение зависит от момента подписки, что усложняет отладку.

## Как это спрашивают на собеседовании

**Главный вывод:** cold создаёт продюсера на каждую подписку, hot делит одного продюсера между всеми. Cold делают hot через Subject посередине: \`share\` — без истории и со сбросом, \`shareReplay\` — с буфером для опоздавших, \`connectable\` — с ручным \`connect()\`.

Типичные формулировки: «Чем hot отличается от cold?», «Почему в Network два одинаковых запроса?», «Как закэшировать HTTP-ответ на RxJS?», «Чем \`share\` отличается от \`shareReplay\`?».

Что могут спросить следом:

- *\`HttpClient\` — hot или cold?* — Cold: каждый \`subscribe\` отправляет запрос.
- *Чем \`share\` отличается от \`shareReplay\`?* — Внутренним Subject (обычный против \`ReplaySubject\`), тем, что \`shareReplay\` не сбрасывается после \`complete\`, и тем, что по умолчанию он не отписывается от источника.
- *\`Subject\` — hot или cold?* — Hot: значения, отправленные до подписки, теряются.
- *Почему \`share()\` не помог с \`of(1, 2, 3)\`?* — Источник синхронный: первый подписчик получил всё и завершил поток, \`share\` сбросился, второй запустил источник заново. Нужен \`connectable\`.
- *Как сделать промис «холодным»?* — Обернуть в \`defer(() => promiseFactory())\`.

### Ответ на 1 минуту

> Разница в том, где живёт продюсер значений. У cold Observable он создаётся внутри функции подписки заново на каждый \`subscribe\`, поэтому каждый подписчик получает своё выполнение с начала: \`of\`, \`interval\`, \`HttpClient.get\` — два подписчика дают два запроса. У hot продюсер живёт снаружи и общий: подписчик подключается к идущему потоку и видит только новые значения — \`Subject\`, \`fromEvent\`, WebSocket, \`valueChanges\`. Cold делают hot мультикастингом: между источником и подписчиками ставят Subject, источник выполняется один раз, а Subject раздаёт значения всем. \`share\` стартует по первому подписчику, сбрасывается по последнему и не хранит историю; \`shareReplay\` через \`ReplaySubject\` отдаёт опоздавшим последние значения, это стандартный HTTP-кэш, но на бесконечном источнике нужен \`refCount: true\`; \`connectable\` запускают вручную через \`connect()\`. На практике это про то, чтобы два \`async\` не стали двумя запросами.`,
      en: `## In short

It all comes down to one question: **where does the producer live** — the thing that actually creates values (a timer, an HTTP request, a socket, DOM events).

- **Cold**: the producer is created **inside** the Observable, **anew for every subscription**. Two subscribers mean two timers, two requests. Each one gets **its own** copy of the values, **from the very beginning**.
- **Hot**: the producer lives **outside** and there is **one for everyone**. A subscriber joins whatever is already running and only sees what happens **after** subscribing.

Analogy: cold is a **film by link** — everyone presses play and watches from minute one, each with their own copy. Hot is a **live broadcast**: tune in halfway and you missed the beginning, and one broadcast serves every viewer.

Making a cold stream hot means **putting a \`Subject\` between the source and the subscribers**: the source is subscribed once and the Subject fans values out to everyone. That is called **multicasting**, and there are ready-made operators for it: \`share\`, \`shareReplay\`, \`connectable\`.

## Cold, explained simply

An Observable is a **function** that runs on every \`subscribe()\`. Whatever you wrote inside repeats for each subscriber:

\`\`\`ts
const cold$ = new Observable<number>(subscriber => {
  console.log('producer created');           // runs on EVERY subscribe
  let i = 0;
  const id = setInterval(() => subscriber.next(i++), 1000);
  return () => clearInterval(id);            // teardown — one per subscription
});

cold$.subscribe(v => console.log('A', v));   // "producer created", timer #1
setTimeout(() => {
  cold$.subscribe(v => console.log('B', v)); // "producer created", timer #2
}, 2500);
// A 0, A 1, A 2, B 0, A 3, B 1 ... — B started from zero on its own timer
\`\`\`

The same is true for \`HttpClient\`, and it is the most common bug in Angular:

\`\`\`ts
users$ = this.http.get<User[]>('/api/users');   // cold: a recipe for a request, not the request
\`\`\`

\`\`\`html
<p>Total: {{ (users$ | async)?.length }}</p>
<ul>
  @for (u of users$ | async; track u.id) { <li>{{ u.name }}</li> }
</ul>
<!-- two async pipes = two subscriptions = TWO real HTTP requests -->
\`\`\`

Typical cold sources: \`of\`, \`from\`, \`interval\`, \`timer\`, \`defer\`, \`HttpClient.get/post\`, \`fromFetch\`, \`ajax\`. The tell: **nothing happens until someone subscribes**, and every subscription starts the work over.

## Hot, explained simply

The producer already exists and runs on its own. The Observable merely **plugs you into it**.

\`\`\`ts
const subject = new Subject<number>();

subject.next(1);                                // nobody listening — the value is lost
subject.subscribe(v => console.log('A', v));
subject.next(2);                                // A 2
subject.subscribe(v => console.log('B', v));
subject.next(3);                                // A 3, B 3 — B will never see 1 and 2
\`\`\`

\`\`\`ts
const clicks$ = fromEvent(document, 'click');   // clicks happen whether you listen or not
clicks$.subscribe(() => console.log('A'));      // tuned into the click "broadcast"
clicks$.subscribe(() => console.log('B'));      // second listener of the same broadcast: one click — A and B
\`\`\`

Typical hot sources: \`Subject\` and its subclasses, \`fromEvent\`, WebSocket; in Angular — \`form.valueChanges\`, \`router.events\`, the \`EventEmitter\` behind \`@Output()\`. The tell: **values can appear with no subscribers**, and a latecomer never gets them.

A quick interview test: "if I subscribe twice, does the work run twice?" Yes → cold. "If I subscribe late, do I miss something?" Yes → hot.

## Making cold hot: a Subject in the middle

A \`Subject\` is both an Observer (it has \`next\`) and an Observable (you can subscribe to it). So you can **subscribe it to the source** and let it pass the values on:

\`\`\`ts
const source$ = interval(1000);                 // cold
const subject = new Subject<number>();          // the "splitter"

subject.subscribe(v => console.log('A', v));
subject.subscribe(v => console.log('B', v));
source$.subscribe(subject);                     // ONE subscription to the source, one timer
// A 0, B 0, A 1, B 1 ... — both see the same values
\`\`\`

That is multicasting by hand. The downside: you track when to subscribe to the source and when to unsubscribe yourself. The operators below do it for you — they differ only in **when they start, when they stop and whether they remember history**.

### share() — one broadcast with a listener counter

\`share()\` puts a plain \`Subject\` inside and counts subscribers (refCount): **the first subscriber starts the source, the last one to leave stops it**. No history: a latecomer only sees new values.

\`\`\`ts
const hot$ = interval(1000).pipe(share());

hot$.subscribe(v => console.log('A', v));                        // the source started
setTimeout(() => hot$.subscribe(v => console.log('B', v)), 2500);
// A 0, A 1, A 2, B 2, A 3, B 3 ... — B joined "mid-broadcast" and immediately sees 2
\`\`\`

Once **all** subscribers are gone, \`share()\` unsubscribes from the source and resets its Subject; the next subscriber starts the source **again from scratch**. In RxJS 7 this is configurable: \`share({ resetOnRefCountZero: false, resetOnComplete: false, resetOnError: false, connector: () => new ReplaySubject(1) })\`.

When to use: several consumers of one **live** stream and no history needed — socket messages, expensive processing of mouse events.

### shareReplay() — the broadcast plus a recording for latecomers

\`shareReplay(n)\` is the same \`share\`, but with a \`ReplaySubject\` inside: it **remembers the last n values** and replays them instantly to every new subscriber. That is why it is the standard **HTTP response cache**:

\`\`\`ts
config$ = this.http.get<Config>('/api/config').pipe(shareReplay(1));

this.config$.subscribe(a);                     // the request goes out
this.config$.subscribe(b);                     // no request: b waits for the same response
// ...the response arrived, the stream completed...
setTimeout(() => this.config$.subscribe(c), 5000); // no request: c gets the response from the buffer
\`\`\`

With a plain \`share()\` subscriber \`c\` **would fire a new request**: the stream had completed, \`share\` had reset, and it keeps no history.

An important difference: \`shareReplay(1)\` means \`{ bufferSize: 1, refCount: false }\`, i.e. **it never unsubscribes from the source**, even when everyone has left. For a one-shot HTTP call that is exactly what you want. For an endless source it is a leak — there write \`shareReplay({ bufferSize: 1, refCount: true })\`.

When to use: request caching, "current state" for whoever subscribes later (user, config, lookup tables).

### connectable() — the broadcast with a manual switch

\`connectable(source$)\` also puts a Subject in the middle but **does not subscribe to the source by itself**. Subscribers attach to the Subject and wait silently until you call \`connect()\`. You need it when **everyone must be subscribed before the first emission** — for example with a synchronous source:

\`\`\`ts
const src$ = of(1, 2, 3);                      // emits everything synchronously and completes

const shared$ = src$.pipe(share());
shared$.subscribe(v => console.log('A', v));   // A 1, A 2, A 3 — and the stream has already completed
shared$.subscribe(v => console.log('B', v));   // share reset → the source runs AGAIN: B 1, B 2, B 3

const conn$ = connectable(src$);
conn$.subscribe(v => console.log('A', v));     // silence
conn$.subscribe(v => console.log('B', v));     // silence
const sub = conn$.connect();                   // A 1, B 1, A 2, B 2, A 3, B 3 — one run for everyone
sub.unsubscribe();                             // stopping is manual too
\`\`\`

The kind of Subject is an option: \`connectable(src$, { connector: () => new ReplaySubject(1) })\`. This is the modern replacement for \`multicast\`/\`publish\`/\`refCount\`, which are deprecated in RxJS 7.

When to use: rarely — when start and stop must be controlled by code, not by subscribers.

## Side by side

- **Manual Subject** — you start and stop; the buffer depends on the Subject type.
- **\`share()\`** — starts on the first subscriber, stops and resets on the last one, no buffer.
- **\`shareReplay(n)\`** — starts on the first subscriber, buffers n values, **does not stop** by default (\`refCount: false\`).
- **\`connectable()\`** — starts on \`connect()\`, stops when you unsubscribe from it, buffer set by \`connector\`.

## What to say in the interview

> The difference is where the producer of values lives. In a cold Observable it is created inside the subscribe function, anew on every \`subscribe\`, so each subscriber gets its own execution from the start: \`of\`, \`interval\`, \`HttpClient.get\` — two subscribers mean two requests. In a hot Observable the producer lives outside and is shared: a subscriber joins a stream that is already running and only sees what comes after — \`Subject\`, \`fromEvent\`, WebSocket, \`valueChanges\`. You turn cold into hot with multicasting: a Subject goes between the source and the subscribers, the source is subscribed once and the Subject fans values out. \`share\` starts on the first subscriber, resets on the last and keeps no history; \`shareReplay\` replays the last values to latecomers through a ReplaySubject, which makes it the standard HTTP cache; \`connectable\` is started manually with \`connect()\` when everyone must subscribe before the first emission. In practice this is about two \`async\` pipes in a template not turning into two requests.

## Gotchas

- **\`HttpClient.get()\` is cold.** Every subscription is a new request. "But it already ran" is the classic mistake; the fix is \`shareReplay(1)\` or a single \`async\` with \`as\`.
- **\`share()\` keeps no history**: subscribe late and earlier values are gone. Need history? \`shareReplay\` or \`share({ connector: () => new ReplaySubject(1) })\`.
- **Hot does not mean "already started"**: \`share()\` only starts the source when the first subscriber arrives. Such a stream is sometimes called warm.
- **Everyone unsubscribes → \`share()\` resets**, and the next subscriber restarts the source. For a completed HTTP call that means **a new request** — which is why caching needs \`shareReplay\`.
- **\`shareReplay(1)\` on an endless source without \`refCount: true\`** is a leak: the source keeps running after everyone has left.
- **A synchronous source + \`share()\`**: the first subscriber drains everything before the second one subscribes. Need everyone at once? \`connectable\` and \`connect()\`.
- **\`connectable\` without \`connect()\` is silent** — subscribers hang and receive nothing.
- **Hot does not always mean "missed everything"**: \`BehaviorSubject\` and \`ReplaySubject\` are hot, yet they hand a latecomer the current or the last values.
- **\`from(promise)\` behaves like hot**: the promise is already running when it is created, and subscribing restarts nothing; for retries and cancellation use \`defer\` or \`fromFetch\`.
- **Follow-up question**: how \`share\` differs from \`shareReplay\`. Only by the inner Subject, and by the fact that \`shareReplay\` does not reset on completion and by default never unsubscribes from the source.`
    }
  },
  {
    id: 'rxjs-004',
    category: 'rxjs',
    level: 'Hard',
    tags: ['subjects', 'behaviorsubject', 'replaysubject'],
    question: {
      ru: 'Сравните Subject, BehaviorSubject, ReplaySubject и AsyncSubject. Когда какой использовать?',
      en: 'Compare Subject, BehaviorSubject, ReplaySubject, and AsyncSubject. When do you use each?'
    },
    answer: {
      ru: `## В чём суть

Subject — это **радиостанция**: одновременно Observable (его можно слушать — \`subscribe\`) и Observer (в него можно вещать — \`next\`, \`error\`, \`complete\`). Он всегда multicast и hot: один эфир на всех текущих слушателей. Четыре вида — \`Subject\`, \`BehaviorSubject\`, \`ReplaySubject\`, \`AsyncSubject\` — отличаются ровно одним: **что услышит опоздавший**, который подключился только что.

Аналогия по видам: \`Subject\` — живой эфир без записи; \`BehaviorSubject\` — эфир плюс табличка «сейчас играет»; \`ReplaySubject\` — эфир с записью последних N выпусков; \`AsyncSubject\` — объявление победителя в конце конкурса: всё время молчит и называет только итог.

**Какую проблему решает.** Обычный Observable unicast: каждый подписчик запускает своё выполнение, и снаружи в него ничего не «положить». А в приложении постоянно нужно **вручную отправлять** значения многим потребителям: «пользователь вошёл», «тема сменилась», «перезагрузи таблицу», «вот текущая корзина». Subject — мост между императивным кодом (обработчик клика вызывает \`next\`) и реактивным (компоненты подписаны на поток). Выбор вида Subject решает, получит ли компонент, созданный позже, текущее состояние — или увидит пустой экран до следующего события.

## Словарик терминов

- **Subject** — объект, который одновременно Observable и Observer; хранит список подписчиков и раздаёт каждое \`next\` всем.
- **Multicast** — одно значение доставляется всем подписчикам сразу, без отдельного выполнения на каждого.
- **Hot-поток** — значения появляются независимо от подписчиков; опоздавший видит только новое (если Subject не хранит историю).
- **Опоздавший подписчик (late subscriber)** — тот, кто подписался после того, как часть значений уже была отправлена.
- **Начальное значение (initial value)** — значение, с которым \`BehaviorSubject\` создаётся; обязательно.
- **\`.value\` / \`getValue()\`** — синхронный геттер текущего значения \`BehaviorSubject\`.
- **Буфер (buffer)** — сохранённые значения \`ReplaySubject\`, которые он отдаёт новым подписчикам; размер задаёт \`bufferSize\`.
- **Окно времени (\`windowTime\`)** — сколько миллисекунд значение живёт в буфере \`ReplaySubject\`.
- **Терминальное состояние** — после \`error\` или \`complete\` Subject закрыт навсегда: \`next\` игнорируется, новые подписчики сразу получают финал.
- **\`asObservable()\`** — метод, который возвращает «только для чтения» версию Subject — без \`next\`.
- **State-сервис** — Angular-сервис, который хранит состояние (пользователь, корзина) и раздаёт его компонентам.
- **Сигнал (\`signal\`)** — реактивная переменная Angular; современная альтернатива \`BehaviorSubject\` для синхронного UI-состояния.

## Как это работает под капотом

Как устроен любой Subject:

1. Внутри Subject — **массив подписчиков** и флаги состояния (закрыт ли, была ли ошибка).
2. \`subscribe(observer)\` не запускает никакого продюсера, а просто **добавляет** observer в массив. Поэтому подписка на Subject ничего не стоит и ничего не перезапускает.
3. \`next(v)\` проходит по копии массива и вызывает \`next(v)\` у каждого — это и есть multicast.
4. \`error(e)\` или \`complete()\` переводят Subject в терминальное состояние: всем текущим подписчикам уходит финал, массив очищается, дальнейшие \`next\` игнорируются.
5. Подписчик, пришедший **после** финала, сразу получает \`error\` или \`complete\` — Subject «мёртв» навсегда.
6. Наследники меняют только одно — **что происходит в момент подписки**: \`BehaviorSubject\` сначала отдаёт текущее значение, \`ReplaySubject\` — буфер, \`AsyncSubject\` — последнее значение, но только если уже был \`complete\`.

Упрощённо базовый Subject выглядит так:

\`\`\`js
class MiniSubject {
  observers = [];
  closed = false;
  subscribe(o) {
    if (this.closed) { o.complete?.(); return; }  // опоздал к финалу — сразу финал
    this.observers.push(o);
    return { unsubscribe: () => (this.observers = this.observers.filter(x => x !== o)) };
  }
  next(v) { if (!this.closed) [...this.observers].forEach(o => o.next?.(v)); }
  complete() { this.closed = true; this.observers.forEach(o => o.complete?.()); this.observers = []; }
}
\`\`\`

\`BehaviorSubject\` добавляет поле \`_value\` и в \`subscribe\` после добавления вызывает \`o.next(this._value)\`. \`ReplaySubject\` хранит массив последних значений и проигрывает его. Всё остальное одинаково.

### \`Subject\` — живой эфир без записи

Нет ни начального значения, ни буфера. Подписчик получает только то, что отправлено **после** его подписки.

\`\`\`ts
const s = new Subject<number>();
s.next(1);                              // слушателей нет — значение потеряно
s.subscribe(v => console.log('A', v));
s.next(2);
s.subscribe(v => console.log('B', v));
s.next(3);
// A 2
// A 3
// B 3
\`\`\`

Когда брать: **события и команды** — «Сохранить нажато», «перезагрузи список», «закрой все диалоги». Здесь история вредна: команду, отданную пять минут назад, не нужно выполнять ещё раз. Для сигналов без данных используют \`Subject<void>\` и \`refresh$.next()\`.

### \`BehaviorSubject\` — эфир плюс табличка с текущим значением

Требует **начальное значение**, хранит последнее и сразу отдаёт его каждому новому подписчику. Есть синхронный геттер \`.value\`.

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v));  // A 0  ← сразу текущее
b.next(1);                              // A 1
b.subscribe(v => console.log('B', v));  // B 1  ← последнее, а не 0
console.log(b.value);                   // 1
\`\`\`

Когда брать: **состояние**, у которого всегда есть «значение прямо сейчас» — текущий пользователь, тема, выбранный фильтр, корзина. Классический state-сервис:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items = new BehaviorSubject<string[]>([]);
  readonly items$ = this.items.asObservable();
  readonly count$ = this.items$.pipe(map(i => i.length), distinctUntilChanged());

  add(item: string) { this.items.next([...this.items.value, item]); }
}

cart.count$.subscribe(n => console.log('в корзине:', n));
cart.add('книга');
cart.add('ручка');
// в корзине: 0
// в корзине: 1
// в корзине: 2
\`\`\`

Здесь \`map\` превращает массив в его длину, а \`distinctUntilChanged\` пропускает число дальше, только если оно изменилось. Обратите внимание: состояние обновляется **новым массивом**, а не \`push\` в старый — иначе подписчики, сравнивающие по ссылке (\`distinctUntilChanged\`, \`OnPush\`), изменения не заметят.

### \`ReplaySubject\` — эфир с записью последних N выпусков

Буферизует последние \`bufferSize\` значений (опционально только те, что моложе \`windowTime\` мс) и отдаёт **весь буфер** новому подписчику, а потом живой эфир. Начального значения нет.

\`\`\`ts
const r = new ReplaySubject<number>(2);
r.next(1); r.next(2); r.next(3);
r.subscribe(v => console.log('A', v));  // A 2, A 3  ← последние два
r.next(4);                              // A 4
r.subscribe(v => console.log('B', v));  // B 3, B 4
\`\`\`

С окном времени: \`new ReplaySubject(10, 100)\` — значение \`1\`, отправленное 200 мс назад, поздний подписчик уже не получит, а \`2\`, отправленное 50 мс назад, получит.

Когда брать: дать **опоздавшим подписчикам догнать** события — лента последних уведомлений, журнал действий для отладки, кэш последнего ответа, когда начального значения нет и не должно быть. \`ReplaySubject(1)\` — «\`BehaviorSubject\` без начального значения»: пока ничего не пришло, подписчик честно ждёт, а не получает искусственный \`null\`.

### \`AsyncSubject\` — объявление победителя в конце

Молчит всё время и выдаёт **только последнее** значение — и **только после \`complete()\`**. Подписчики, пришедшие после завершения, тоже получают это последнее значение.

\`\`\`ts
const a = new AsyncSubject<number>();
a.subscribe(v => console.log('A', v));
a.next(1);
a.next(2);                              // пока тишина
a.complete();                           // A 2
a.subscribe(v => console.log('B', v));  // B 2  ← поздний тоже получает итог
\`\`\`

Когда брать: **единственный финальный результат операции**, который могут запросить и до, и после её окончания — по смыслу это промис: токен после логина, результат одноразовой инициализации. На практике встречается редко: чаще пишут \`shareReplay(1)\` над запросом или просто промис.

### \`asObservable()\` — закрыть «микрофон» от потребителей

Если сервис отдаёт наружу сам Subject, любой компонент может вызвать \`next()\` и подменить состояние. \`asObservable()\` возвращает обёртку, у которой есть только \`subscribe\` и \`pipe\`:

\`\`\`ts
const ro$ = subject.asObservable();
console.log(typeof (ro$ as any).next);  // undefined
\`\`\`

Правило: Subject — \`private\`, наружу — \`asObservable()\`, менять — только через методы сервиса (\`add\`, \`remove\`, \`setTheme\`). Так у состояния появляется одна точка записи, и отладка сводится к поиску вызовов этих методов.

### Поведение после \`complete\` и \`error\`

Этот момент любят спрашивать: что получит подписчик, пришедший **после** финала.

\`\`\`ts
const L = { next: v => console.log(v), error: e => console.log('error:', e.message), complete: () => console.log('complete') };

// после complete
const s = new Subject();          s.next(1);  s.complete();  s.subscribe(L);  // complete
const b = new BehaviorSubject(0); b.next(5);  b.complete();  b.subscribe(L);  // complete — без 5!
const r = new ReplaySubject(1);   r.next(7);  r.complete();  r.subscribe(L);  // 7, complete
// AsyncSubject после complete: последнее значение, complete

// после error
const e = new BehaviorSubject(1); e.error(new Error('500'));
e.subscribe(L);                   // error: 500
e.value;                          // бросает Error('500')
const re = new ReplaySubject(2); re.next(1); re.next(2); re.error(new Error('500'));
re.subscribe(L);                  // 1, 2, error: 500
\`\`\`

- **Subject** после финала сразу отдаёт новому подписчику тот же \`complete\` или ту же ошибку; \`next\` больше не проходит.
- **BehaviorSubject** после \`complete\` отдаёт только \`complete\` — текущее значение **не** приходит, хотя \`.value\` всё ещё возвращает 5. После \`error\` \`.value\` бросает эту ошибку.
- **ReplaySubject** проигрывает буфер и затем финал — даже после ошибки.
- **AsyncSubject** после \`complete\` отдаёт последнее значение, после \`error\` — только ошибку.

Практический вывод: Subject, который хранит состояние сервиса, **не завершают и не роняют ошибкой** — иначе он «умрёт» для всех будущих подписчиков. Ошибки запросов обрабатывают до того, как значение попадёт в Subject.

### \`BehaviorSubject\` и \`signal\`

В современном Angular синхронное UI-состояние всё чаще хранят в сигналах. Сигнал похож на \`BehaviorSubject\`: всегда есть текущее значение, читается синхронно. Но производные значения пересчитываются автоматически и без подписок:

\`\`\`ts
const items = signal<string[]>([]);
const count = computed(() => items().length);
console.log(count());                       // 0
items.update(list => [...list, 'книга']);
console.log(count());                       // 1
\`\`\`

Отличия: у сигнала нет \`complete\`/\`error\`, нет подписок, которые нужно закрывать, и он не умеет работать со временем (\`debounceTime\`, отмена запросов). Поэтому распространённое разделение: состояние для шаблона — сигналы, события и асинхронные цепочки — RxJS, мост между ними — \`toSignal\` (поток → сигнал) и \`toObservable\` (сигнал → поток).

### Как выбрать

- **Состояние с текущим значением** (пользователь, тема, корзина, фильтры) — \`BehaviorSubject\`, а в новом коде компонентов и сервисов часто \`signal\`.
- **Состояние без осмысленного начального значения** («пока не загружено») — \`ReplaySubject(1)\`.
- **События и команды** (клик, «перезагрузи», «закрой диалоги») — \`Subject\` / \`Subject<void>\`.
- **Догнать опоздавших: последние N событий или события за последние T мс** — \`ReplaySubject(N, T)\`.
- **Один финальный результат, доступный и после завершения** — \`AsyncSubject\`, хотя чаще хватает промиса или \`shareReplay(1)\`.
- **Кэш HTTP-запроса** — не Subject вручную, а \`shareReplay\` над самим запросом.

### Где это применяется на практике

- **State-сервисы без NgRx**: \`BehaviorSubject\` + \`asObservable()\` + методы-мутаторы — простой и проверенный паттерн для средних приложений.
- **Шина событий между несвязанными компонентами**: \`Subject\` в сервисе — «таблица обновлена», «пользователь вышел» — чтобы разные части экрана реагировали на одно событие.
- **Триггеры перезагрузки**: \`refresh$ = new Subject<void>()\` и \`refresh$.pipe(switchMap(() => this.api.load()))\` — кнопка «Обновить» над большим гридом.
- **Уведомления и тосты**: \`ReplaySubject\` с небольшим буфером, чтобы панель уведомлений, открытая позже, показала последние сообщения.
- **Отписка в старом коде**: \`private destroy$ = new Subject<void>()\` + \`takeUntil(this.destroy$)\` (слушать, пока не придёт сигнал) + \`destroy$.next()\` в \`ngOnDestroy\` — сейчас его заменяет \`takeUntilDestroyed\`.

## Важные нюансы и подводные камни

- **Публичный \`Subject\` в сервисе** — любой может вызвать \`next()\` и сломать состояние. Наружу отдавайте \`asObservable()\`.
- **\`BehaviorSubject\` для событий** — новый подписчик мгновенно получит «старое» событие и выполнит действие повторно: компонент, созданный позже, снова откроет уже открытый диалог.
- **\`new ReplaySubject()\` без аргументов хранит всё.** Размер буфера по умолчанию — бесконечность: поток событий за час работы целиком лежит в памяти. Всегда указывайте \`bufferSize\`.
- **Большой \`ReplaySubject\`** удерживает объекты в памяти на всё время жизни Subject — утечка, особенно если Subject живёт в root-сервисе.
- **\`AsyncSubject\` без \`complete()\`** не выдаст вообще ничего; это ловят чаще всего.
- **\`.value\` у \`BehaviorSubject\`** удобен, но провоцирует императивный стиль и гонки: прочитали значение, а пока считали новое — его уже изменили. Читайте через поток, где можно; запись \`next([...value, item])\` допустима внутри одного метода сервиса.
- **\`BehaviorSubject\` не фильтрует повторы.** \`theme.next('light')\` при текущем \`'light'\` снова оповестит всех подписчиков. Нужна фильтрация — \`distinctUntilChanged()\` на стороне чтения.
- **После \`error()\` Subject мёртв навсегда.** Новые подписчики сразу получают эту же ошибку, \`next\` больше не проходит, а у \`BehaviorSubject\` \`.value\` начинает бросать исключение.
- **\`BehaviorSubject\` после \`complete\` не отдаёт значение** новым подписчикам — только \`complete\`. Не завершайте Subject состояния.
- **Мутация объекта внутри Subject.** \`this.items.value.push(x)\` без \`next\` никого не оповестит, а \`next(this.items.value)\` с той же ссылкой не заметят \`OnPush\` и \`distinctUntilChanged\`.
- **\`subject.observers\` устарел.** В RxJS 7 для проверки «есть ли подписчики» используют \`subject.observed\`.

**Плюсы:** простой мост между императивным кодом и реактивными потоками; multicast без лишних выполнений; четыре вида покрывают события, состояние, историю и финальный результат.
**Минусы:** Subject открывает «дверь» для записи из любого места, если не спрятать его за \`asObservable()\`; легко выбрать не тот вид (событие с памятью, состояние без начального значения); буферы держат память; терминальное состояние необратимо.

## Как это спрашивают на собеседовании

**Главный вывод:** все Subject — multicast и hot, а отличаются тем, что получает опоздавший: \`Subject\` — ничего, \`BehaviorSubject\` — текущее значение, \`ReplaySubject\` — буфер, \`AsyncSubject\` — последнее значение после \`complete\`. Состояние — \`BehaviorSubject\` (или сигнал), события — \`Subject\`.

Типичные формулировки: «Сравните виды Subject», «Что выбрать для хранения текущего пользователя?», «Почему компонент не получает значение из сервиса?», «Зачем \`asObservable()\`?».

Что могут спросить следом:

- *Что будет с Subject после \`error()\`?* — Он мёртв навсегда: новые подписчики сразу получают ту же ошибку, \`next\` игнорируется.
- *Чем \`ReplaySubject(1)\` отличается от \`BehaviorSubject\`?* — Нет начального значения и \`.value\`; до первого \`next\` подписчик ничего не получает.
- *Что получит подписчик \`BehaviorSubject\` после \`complete\`?* — Только \`complete\`, без текущего значения.
- *Чем \`BehaviorSubject\` отличается от \`signal\`?* — У сигнала нет подписок, \`complete\` и \`error\`, производные считаются через \`computed\`; зато он не умеет работать со временем и отменой.
- *Какой размер буфера у \`new ReplaySubject()\`?* — Бесконечный, поэтому размер нужно указывать явно.

### Ответ на 1 минуту

> Subject — это одновременно Observable и Observer: внутри у него список подписчиков, и каждое \`next\` он раздаёт всем, поэтому он multicast и hot. Четыре вида отличаются тем, что получает опоздавший подписчик. Обычный \`Subject\` — ничего из прошлого, это шина событий и команд. \`BehaviorSubject\` требует начальное значение, хранит текущее, сразу отдаёт его новому подписчику и даёт синхронный \`.value\` — основа простого state-сервиса, хотя в новом Angular для UI-состояния я чаще беру сигналы. \`ReplaySubject\` проигрывает буфер последних \`bufferSize\` значений, опционально с окном времени, а \`AsyncSubject\` отдаёт только последнее значение и только после \`complete\`, как промис. Из нюансов: Subject наружу отдаю через \`asObservable()\`, у \`ReplaySubject\` всегда задаю размер буфера, потому что по умолчанию он бесконечный, а после \`error\` любой Subject мёртв навсегда.`,
      en: `## In short

A Subject is a **radio station**: it is an Observable (people listen to it) and an Observer (you can broadcast into it via \`next\`) at the same time. It is always multicast and hot: one broadcast for everybody.

The four flavours differ in exactly one thing — **what a latecomer hears** the moment they tune in.

## The four Subjects — what differs

1. **\`Subject\`** — "live, no recording". A latecomer only hears what is said from now on. Everything said before is gone.
2. **\`BehaviorSubject\`** — "live plus a board showing the current value". It requires an **initial value** and holds the latest one. A latecomer gets the current value immediately, then keeps listening. It exposes a synchronous \`.value\` getter.
3. **\`ReplaySubject\`** — "live plus a recording of the last N episodes". It buffers \`bufferSize\` values (optionally within a \`windowTime\` window) and hands the **whole buffer** to a new subscriber at once.
4. **\`AsyncSubject\`** — "the winner is announced at the end". It stays silent and emits **only the last** value — and **only when \`complete()\` is called**.

## When to use which

- **State** (current user, theme, cart) → \`BehaviorSubject\`. There is always a "value right now".
- **Events/commands** (Save clicked, "reload the list") → \`Subject\`. An initial value would be harmful here.
- **Letting late subscribers catch up / caching the last N events** → \`ReplaySubject\`.
- **A single final result of an operation** → \`AsyncSubject\` (semantically a promise).

## Example

\`\`\`ts
const b = new BehaviorSubject(0);
b.subscribe(v => console.log('A', v)); // A 0  ← current value right away
b.next(1);                             // A 1
b.subscribe(v => console.log('B', v)); // B 1  ← latest, not 0

const a = new AsyncSubject<number>();
a.subscribe(v => console.log('async', v));
a.next(1); a.next(2); a.complete();    // async 2 ← only on complete
\`\`\`

Why: \`BehaviorSubject\` hands the "current" value to whoever arrives, while \`AsyncSubject\` accumulates and only emits the finale. A plain \`Subject\` in place of \`b\` would print neither \`A 0\` nor \`B 1\`.

## What to say in the interview

> A Subject is both an Observable and an Observer; it is multicast and hot, so one execution is fanned out to all subscribers. A plain \`Subject\` has no initial value and no buffer, so a new subscriber only sees emissions after subscribing — that is an event bus. A \`BehaviorSubject\` requires an initial value, holds the current one, delivers it immediately to a new subscriber, and offers a synchronous \`.value\` — that is the basis of a simple state service. A \`ReplaySubject\` buffers the last \`bufferSize\` values, optionally within a time window, and replays that buffer to new subscribers. An \`AsyncSubject\` emits only the last value and only on \`complete\`, behaving like a promise. The choice is simple: state means BehaviorSubject, events mean Subject, a replay cache means ReplaySubject, and a final result means AsyncSubject. As nuances: a large ReplaySubject buffer retains object references and easily becomes a leak, and you should expose a Subject through \`asObservable()\` so consumers cannot write into it.

## Gotchas

- **A public \`Subject\` on a service** — anyone can call \`next()\`. Expose \`asObservable()\` instead.
- **\`BehaviorSubject\` for events** — a new subscriber instantly receives a stale event and repeats the action.
- **A big \`ReplaySubject\`** pins objects in memory for its whole lifetime — a leak.
- **\`AsyncSubject\` without \`complete()\`** emits nothing at all; this is the most commonly missed detail.
- **\`.value\` on a \`BehaviorSubject\`** is convenient but invites imperative code and races — read through the stream where you can.
- **Follow-up question**: what happens after \`error()\`? The Subject is dead forever — new subscribers immediately receive that same error, and \`next\` no longer passes.`
    }
  },
  {
    id: 'rxjs-005',
    category: 'rxjs',
    level: 'Expert',
    tags: ['sharereplay', 'multicasting', 'memory-leak'],
    question: {
      ru: 'Какие подводные камни у shareReplay? Объясните refCount, буфер и риск утечки.',
      en: 'What are the pitfalls of shareReplay? Explain refCount, the buffer, and the leak risk.'
    },
    answer: {
      ru: `## В чём суть

\`shareReplay\` — это **запись передачи для опоздавших**: он подписывается на источник один раз, раздаёт значения всем через внутренний \`ReplaySubject\` и проигрывает новым подписчикам последние \`bufferSize\` значений. Классика для кэширования HTTP-ответа. Подводных камней три: **кто выключает студию, когда все ушли** (\`refCount\`), **сколько записи хранится** (буфер) и **когда кэш сбрасывается** (ошибка, завершение, \`windowTime\`).

Аналогия: телестудия с видеомагнитофоном. Первый зритель включает трансляцию, каждый следующий получает запись последних минут и дальше смотрит эфир. Вопрос в том, выключит ли кто-нибудь камеры, когда зрители разошлись. Если нет — камеры работают вечно, а плёнка копится. Это и есть утечка.

**Какую проблему решает.** Без multicast каждый подписчик на \`http.get()\` отправляет свой запрос, а компонент, созданный позже, не получает уже загруженные данные. \`shareReplay\` решает обе проблемы одной строкой — и поэтому его ставят везде. Но с настройками по умолчанию он никогда не отписывается от незавершённого источника, хранит буфер всю жизнь объекта и не знает, когда данные устарели. На бесконечном потоке это утечка памяти и работающие в фоне таймеры или сокеты; на HTTP — устаревший кэш, который не обновить.

## Словарик терминов

- **\`shareReplay\`** — оператор: общий источник для всех подписчиков плюс буфер последних значений для опоздавших.
- **\`ReplaySubject\`** — Subject, который хранит последние N значений и сразу отдаёт их новому подписчику; сердце \`shareReplay\`.
- **\`bufferSize\`** — сколько последних значений хранить. По умолчанию — бесконечность.
- **\`windowTime\`** — сколько миллисекунд значение живёт в буфере после того, как пришло.
- **\`refCount\`** — флаг «считать подписчиков»: если \`true\`, то при уходе последнего подписчика от **работающего** источника отписываются и буфер сбрасывают.
- **Подписка на источник (connection)** — та единственная внутренняя подписка, через которую \`shareReplay\` получает значения.
- **Сброс (reset)** — \`shareReplay\` забывает свой \`ReplaySubject\` и подписку на источник; следующий подписчик запустит всё заново.
- **Утечка памяти (memory leak)** — объект или подписка продолжают жить, хотя больше никому не нужны.
- **Запрос «в полёте» (in-flight)** — запрос уже отправлен, но ответ ещё не пришёл.
- **\`share(config)\`** — более общий оператор, у которого все правила сброса настраиваются: \`connector\`, \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.
- **\`catchError\`** — оператор, который перехватывает ошибку потока и заменяет её другим потоком (например, значением по умолчанию).
- **Инвалидация кэша (cache invalidation)** — принудительное «забыть старые данные и загрузить заново».

## Как это работает под капотом

В RxJS 7 \`shareReplay\` — это тонкая настройка \`share\`. Упрощённо (настоящая функция принимает ещё объект-конфиг и планировщик, но суть та же):

\`\`\`ts
function shareReplay(bufferSize = Infinity, windowTime = Infinity, refCount = false) {
  return share({
    connector: () => new ReplaySubject(bufferSize, windowTime), // внутри — ReplaySubject
    resetOnError: true,          // после ошибки — сброс, следующий подписчик повторит запрос
    resetOnComplete: false,      // после complete — НЕ сбрасывать: это и есть кэш
    resetOnRefCountZero: refCount,
  });
}
\`\`\`

Что происходит по шагам:

1. Первый подписчик приходит → \`shareReplay\` создаёт \`ReplaySubject\` и подписывается на источник **один раз**.
2. Значения источника идут в \`ReplaySubject\`, который их **запоминает** (не больше \`bufferSize\`, не старше \`windowTime\`) и раздаёт всем текущим подписчикам.
3. Второй, третий подписчик **не запускают** источник заново: они подписываются на \`ReplaySubject\`, мгновенно получают буфер и дальше слушают эфир.
4. Подписчики уходят. Когда счётчик падает до нуля, а источник **ещё работает**, решает флаг \`refCount\`: \`true\` — отписаться от источника и сбросить буфер; \`false\` — ничего не делать, источник продолжает работать, буфер живёт.
5. Если источник **завершился** (\`complete\`), сброса нет никогда, независимо от \`refCount\`: буфер остаётся, и любой будущий подписчик получит записанные значения и \`complete\`. Именно поэтому HTTP-кэш работает.
6. Если источник **упал** (\`error\`), текущие подписчики получают ошибку, а \`shareReplay\` сбрасывается: следующий подписчик снова подпишется на источник, то есть повторит запрос. Ошибка не кэшируется.

### Пример 1. \`refCount: false\` на бесконечном источнике — утечка

\`\`\`ts
const ticks$ = interval(100).pipe(
  tap(i => console.log('  источник тикает', i)),
  shareReplay(1),                                 // = { bufferSize: 1, refCount: false }
);
const a = ticks$.subscribe(v => console.log('A', v));
setTimeout(() => a.unsubscribe(), 250);
//   источник тикает 0
// A 0
//   источник тикает 1
// A 1
// (A отписался)
//   источник тикает 2      ← подписчиков нет, а таймер работает
//   источник тикает 3
//   ... навсегда
\`\`\`

Отписываться от источника некому: \`refCount: false\` означает «не считай подписчиков». Для \`interval\`, WebSocket, \`fromEvent\`, \`store.select\` это вечный фоновый процесс, который держит в памяти всё, на что ссылается цепочка, — включая уничтоженный компонент, если цепочка его захватила.

### Пример 2. \`refCount: true\` — остановка и перезапуск с нуля

\`\`\`ts
const ticks$ = interval(100).pipe(
  tap(i => console.log('  источник тикает', i)),
  shareReplay({ bufferSize: 1, refCount: true }),
);
const c = ticks$.subscribe(v => console.log('C', v));
// через 250 мс: c.unsubscribe(), ещё через 250 мс — новый подписчик D
//   источник тикает 0
// C 0
//   источник тикает 1
// C 1
// (C отписался — тишина, источник остановлен)
// (D подписался)
//   источник тикает 0      ← источник запущен заново
// D 0                      ← старое значение 1 не пришло: буфер сброшен
\`\`\`

Цена \`refCount: true\` для работающего источника — потеря буфера: тот, кто придёт после паузы, начнёт с нуля. Для живых потоков это обычно именно то, что нужно.

### Пример 3. HTTP-кэш: запрос завершился — кэш живёт и при \`refCount: true\`

Распространённое заблуждение — что \`refCount: true\` превращает кэш HTTP-ответа в одноразовый. Это не так:

\`\`\`ts
const config$ = http.get('/api/config').pipe(shareReplay({ bufferSize: 1, refCount: true }));
config$.subscribe(v => console.log('A', v));
// ...ответ пришёл, A отписался автоматически (поток завершился)...
setTimeout(() => config$.subscribe(v => console.log('B (поздний)', v)), 150);
//   -> запрос №1 ушёл
//   <- ответ №1
// A { id: 1 }
// B (поздний) { id: 1 }   ← нового запроса нет
\`\`\`

Почему: сброс по нулю подписчиков происходит, только пока источник не завершился (шаг 4). После \`complete\` \`shareReplay\` не сбрасывается никогда (шаг 5). Поэтому для HTTP оба варианта \`refCount\` дают постоянный кэш — разница только в том, что происходит, если все ушли **до ответа**.

### Пример 4. Все ушли до ответа: отмена против «доведём до конца»

\`\`\`ts
// refCount: true
const s = req$.pipe(shareReplay({ bufferSize: 1, refCount: true })).subscribe();
// через 30 мс s.unsubscribe(), позже новый подписчик
//   -> запрос №1 ушёл
//   x  запрос №1 отменён       ← teardown, HTTP-запрос прерван
//   -> запрос №2 ушёл          ← новый подписчик загружает заново
//   <- ответ №2

// refCount: false
//   -> запрос №1 ушёл
// (подписчик ушёл)
//   <- ответ №1                ← запрос довели до конца и положили в кэш
// новый подписчик получает { id: 1 } без запроса
\`\`\`

Оба поведения разумны. \`refCount: true\` экономит сеть, когда пользователь быстро ушёл со страницы. \`refCount: false\` подходит для данных, которые точно понадобятся (конфиг приложения), — ответ не пропадёт.

### Буфер: \`bufferSize\` и память

\`ReplaySubject\` держит ссылки на последние \`bufferSize\` значений всё время, пока жив сам \`shareReplay\` — то есть, если поток лежит в поле root-сервиса, всё время работы приложения. Опасны два случая:

\`\`\`ts
const all$ = of(1, 2, 3, 4, 5).pipe(shareReplay());   // без аргументов: bufferSize = Infinity
all$.subscribe();
all$.subscribe(v => console.log(v));                  // 1, 2, 3, 4, 5 — хранится всё
\`\`\`

- **\`shareReplay()\` без аргументов** на потоке событий копит **все** значения за всё время. Через час работы это тысячи объектов.
- **Большой \`bufferSize\` с тяжёлыми объектами** — ответы с тысячами строк грида, DOM-узлы, файлы — удерживает их от сборщика мусора.

Правило: почти всегда \`bufferSize: 1\`, и только если опоздавшему действительно нужна история — ровно столько, сколько нужно.

### \`windowTime\` — это не TTL для кэша

Хочется написать \`windowTime: 60_000\` и получить «кэш на минуту». Но на завершившемся источнике это работает не так:

\`\`\`ts
const c$ = http.get('/api/config').pipe(
  shareReplay({ bufferSize: 1, windowTime: 200, refCount: true }),
);
c$.subscribe(v => console.log('A', v));
// через 350 мс:
c$.subscribe({ next: v => console.log('B', v), complete: () => console.log('B complete') });
//   -> запрос №1 ушёл
//   <- ответ №1
// A { id: 1 }
// B complete           ← ни значения, ни нового запроса
\`\`\`

Значение «протухло» и выпало из буфера, но источник завершён, а \`shareReplay\` после \`complete\` не сбрасывается — значит, нового запроса тоже не будет. Подписчик получает пустой завершённый поток. Для настоящего TTL нужна явная инвалидация (пример ниже) или \`share\` с отложенным сбросом.

### Ошибки не кэшируются; где ставить \`catchError\`

\`\`\`ts
// ошибка проходит через shareReplay
const c$ = http.get('/api/config').pipe(shareReplay(1));
// A получает error 500, потом поздний B подписывается:
//   -> запрос №1 ушёл
//   <- запрос №1: 500
// A error 500
//   -> запрос №2 ушёл     ← сброс после ошибки, B повторил запрос
//   <- ответ №2
// B { id: 2 }

// catchError ДО shareReplay
const safe$ = http.get('/api/config').pipe(
  catchError(() => of({ fallback: true })),
  shareReplay(1),
);
// A { fallback: true }
// B { fallback: true }    ← запасное значение закэшировано навсегда, повтора не будет
\`\`\`

Позиция \`catchError\` решает, что попадёт в кэш. **До** \`shareReplay\` — ошибка превращается в обычное значение с \`complete\`, и запасной вариант кэшируется навсегда (иногда это плохо: временный сбой сервера «запоминается» до перезагрузки страницы). **После** \`shareReplay\` — каждый подписчик обрабатывает ошибку сам, а следующий повторит запрос.

### \`share\` с настройками — полный контроль

\`share(config)\` позволяет собрать любое поведение. Эквивалент \`shareReplay({ bufferSize: 1, refCount: true })\`:

\`\`\`ts
share({
  connector: () => new ReplaySubject(1),
  resetOnError: true,
  resetOnComplete: false,     // без этой строки кэша НЕ будет: share по умолчанию сбрасывается после complete
  resetOnRefCountZero: true,
});
\`\`\`

Важно: просто \`share({ connector: () => new ReplaySubject(1) })\` — **не** аналог \`shareReplay\`. У \`share\` по умолчанию \`resetOnComplete: true\`, поэтому после завершения HTTP-запроса поздний подписчик отправит новый запрос.

Зато \`share\` умеет то, чего нет у \`shareReplay\`, — **отложенный сброс**. Вместо \`true\` можно передать функцию, возвращающую поток-таймер:

\`\`\`ts
const data$ = req$.pipe(share({
  connector: () => new ReplaySubject(1),
  resetOnError: true,
  resetOnComplete: false,
  resetOnRefCountZero: () => timer(200),   // «льготный период» 200 мс
}));
// подписчик ушёл до ответа, через 50 мс пришёл новый:
//   -> запрос №1 ушёл
//   <- ответ №1
// B вернулся в течение 200 мс { id: 1 }   ← запрос не отменён и не повторён
\`\`\`

Это спасает от лишних запросов при быстром переходе между вкладками или пересоздании компонента в \`@if\`.

### Инвалидация кэша

\`shareReplay\` не знает, когда данные устарели. Типичный способ — поток-триггер перед запросом:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private refresh$ = new Subject<void>();

  readonly config$ = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() => this.http.get<Config>('/api/config')),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  reload() { this.refresh$.next(); }
}
// A подписался         ->  запрос №1, A { version: 1 }
// B подписался позже   ->  B { version: 1 } без запроса
// reload()             ->  запрос №2, A { version: 2 }, B { version: 2 }
\`\`\`

Как это работает: \`startWith(undefined)\` выдаёт первый сигнал сразу при подписке, поэтому первая загрузка не ждёт \`reload()\`; \`switchMap\` на каждый сигнал запускает новый запрос и отменяет предыдущий, если тот ещё не закончился; \`shareReplay\` раздаёт последний ответ всем. Источник здесь бесконечный (\`refresh$\` не завершается), поэтому \`refCount: true\` обязателен: когда все компоненты уйдут, цепочка остановится, а при следующем заходе загрузит свежие данные.

### Где ставить \`shareReplay\`

- **В конце цепочки.** Всё, что выше, выполняется один раз; всё, что ниже, — для каждого подписчика. \`raw$.pipe(shareReplay(1), map(heavy))\` с тремя подписчиками выполнит \`heavy\` три раза, а \`raw$.pipe(map(heavy), shareReplay(1))\` — один.
- **В поле, а не в методе.** \`getConfig() { return this.http.get(...).pipe(shareReplay(1)); }\` создаёт новый кэш на каждый вызов: два вызова — два запроса. Кэшируемый поток должен быть полем сервиса (или кэшироваться в \`Map\` по ключу).

### Где это применяется на практике

- **Конфигурация и справочники** в enterprise-приложениях: валюты, страны, права пользователя — \`shareReplay\` в root-сервисе, один запрос на всё приложение.
- **Данные экрана, которые читают несколько компонентов**: грид, счётчик строк и панель фильтров берут один поток — без двойных запросов.
- **Текущий пользователь и сессия**: поток с \`refresh$\` для перезагрузки после смены профиля.
- **Живые потоки на дашбордах** (котировки, статусы задач по WebSocket) — только с \`refCount: true\`, чтобы соединение закрывалось при уходе со страницы.
- **Селекторы над store** в сервисах-фасадах: \`store.select(...)\` бесконечен, поэтому \`refCount: true\` или вообще без \`shareReplay\` — состояние store и так общее для всех подписчиков.

## Важные нюансы и подводные камни

- **\`shareReplay(1)\` вместо объекта.** Короткая форма означает \`refCount: false\` и не объясняет читателю выбор. Пишите \`shareReplay({ bufferSize: 1, refCount: true })\` — в объектной форме \`refCount\` обязательное поле.
- **\`refCount: false\` на бесконечном источнике** — гарантированная утечка: сокет или таймер не закроется никогда.
- **\`refCount: true\` не делает HTTP-кэш одноразовым.** Если запрос завершился, буфер сохраняется навсегда; сброс по нулю подписчиков бывает только у работающего источника (запрос в полёте, бесконечный поток).
- **\`bufferSize\` больше 1 «на всякий случай»** — удерживает тяжёлые объекты; \`shareReplay()\` без аргументов хранит вообще всё.
- **\`windowTime\` на завершённом источнике** даёт пустой поток вместо нового запроса — это не TTL.
- **Ошибка не кэшируется.** \`shareReplay\` сбрасывается после \`error\`, и следующий подписчик повторит запрос. А \`catchError\` **до** \`shareReplay\` закэширует запасное значение навсегда.
- **\`share({ connector: () => new ReplaySubject(1) })\` — не аналог.** Без \`resetOnComplete: false\` он после завершения источника сбрасывается, и кэша нет.
- **Нет инвалидации.** Данные, загруженные утром, будут отдаваться до перезагрузки страницы. Нужен триггер \`refresh$\` или ручной сброс.
- **\`shareReplay\` в методе** создаёт новый кэш на каждый вызов — кэширования нет.
- **Тяжёлые операторы после \`shareReplay\`** выполняются для каждого подписчика.

**Плюсы:** одна строка даёт multicast и кэш для опоздавших; убирает дублирующиеся HTTP-запросы; поздние компоненты сразу получают данные; после ошибки сам позволяет повторить запрос.
**Минусы:** опасное значение по умолчанию \`refCount: false\`; буфер по умолчанию бесконечный; нет встроенной инвалидации и TTL; правила сброса (ошибка — да, завершение — нет, ноль подписчиков — зависит от флага и от того, жив ли источник) неочевидны.

## Как это спрашивают на собеседовании

**Главный вывод:** \`shareReplay\` = \`share\` + \`ReplaySubject\` + «не сбрасываться после \`complete\`». На бесконечных источниках обязателен \`refCount: true\`, иначе утечка; буфер держите минимальным; для HTTP кэш живёт после завершения запроса при любом \`refCount\`, а ошибки не кэшируются.

Типичные формулировки: «Какие подводные камни у \`shareReplay\`?», «Что делает \`refCount\`?», «Как закэшировать HTTP-запрос и не получить утечку?», «Как сбросить кэш?».

Что могут спросить следом:

- *Чем \`shareReplay\` отличается от \`share({ connector: () => new ReplaySubject(1) })\`?* — У \`share\` по умолчанию сброс после \`complete\`, поэтому кэша нет; нужен \`resetOnComplete: false\`.
- *Что будет, если запрос упал?* — Подписчики получат ошибку, \`shareReplay\` сбросится, следующий подписчик повторит запрос.
- *Будет ли новый запрос с \`refCount: true\` после того, как все ушли?* — Если ответ уже пришёл — нет; если ушли до ответа — запрос отменится, и следующий подписчик отправит новый.
- *Как сделать кэш с TTL?* — Не через \`windowTime\`, а через триггер обновления (\`refresh$\` + \`switchMap\`) или \`share\` с \`resetOnRefCountZero: () => timer(...)\`.
- *Какой \`bufferSize\` по умолчанию?* — Бесконечный.

### Ответ на 1 минуту

> \`shareReplay\` мультикастит источник через \`ReplaySubject\`: подписывается на него один раз и проигрывает новым подписчикам последние значения, поэтому его используют как кэш HTTP-ответа. Главный подводный камень — \`refCount\`. По умолчанию он \`false\`, и если все подписчики ушли, а источник ещё работает, подписка на него не закрывается — для \`interval\`, сокета или \`store.select\` это гарантированная утечка. Поэтому я пишу явный конфиг \`shareReplay({ bufferSize: 1, refCount: true })\`. Важно, что для HTTP это не ломает кэш: после \`complete\` \`shareReplay\` не сбрасывается при любом \`refCount\`, а вот ошибка его сбрасывает, и следующий подписчик повторит запрос. Второй камень — буфер: без аргументов он бесконечный и держит объекты в памяти. Третий — нет инвалидации, а \`windowTime\` не работает как TTL, поэтому обновление делаю через \`refresh$\` и \`switchMap\`.`,
      en: `## In short

\`shareReplay\` is **a recorded show for latecomers**: it multicasts the source through an internal \`ReplaySubject\` and replays the last \`bufferSize\` values to every new subscriber. The go-to way to cache an HTTP response.

There is exactly one danger: **who turns the studio off when everyone has left**. If nobody does, the source keeps running forever and the recording sits in memory. That is the leak.

## How it works, step by step

1. The first subscriber arrives → \`shareReplay\` subscribes to the source **once**.
2. Values flow into the internal \`ReplaySubject\`, which **remembers** them (up to \`bufferSize\`) and fans them out.
3. A second and third subscriber do **not** restart the source; they instantly get the buffer and then follow the live feed.
4. Everyone unsubscribes. Here is the fork in the road, decided by the \`refCount\` flag.
5. \`refCount: true\` → the count hits zero → it unsubscribes from the source and drops the buffer. The next subscriber starts everything **from scratch**.
6. \`refCount: false\` (the historical behaviour) → the source stays subscribed **forever** and the buffer lives forever.

## Example

\`\`\`ts
// infinite source — refCount is mandatory
const ticks$ = interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);

// caching an HTTP response: the source completes, so an eternal cache is deliberate
const config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: false })
);
\`\`\`

Why: \`interval\` never completes, so without \`refCount: true\` the timer keeps ticking after the last subscriber leaves — forever. \`http.get\` completes on its own, so an "eternal" one-value buffer is exactly what a config cache wants.

## What to say in the interview

> \`shareReplay\` multicasts the source through a ReplaySubject and replays the buffer to new subscribers, which is why people love it as an HTTP cache. The main pitfall is \`refCount\`. Historically \`shareReplay(n)\` behaved as \`refCount: false\`: even after every subscriber left, the subscription to the source stayed open, and for an infinite source like \`interval\` or a WebSocket that is a guaranteed leak. So I always write an explicit config: for infinite sources \`shareReplay({ bufferSize: 1, refCount: true })\`, which unsubscribes from the source when the subscriber count drops to zero and resubscribes when a new one appears. The second point is the buffer: the internal ReplaySubject holds \`bufferSize\` values for its whole lifetime, so a large buffer of heavy objects is also a leak. And third: with \`refCount: true\` the buffer is lost once all subscribers leave, so it is not an eternal cache — an eternal cache is a deliberate \`refCount: false\` on a source that completes.

## Gotchas

- **\`shareReplay(1)\` instead of the config object** — the short form hides the refCount question from the reader; use the object.
- **\`refCount: false\` on an infinite source** — a guaranteed leak: the socket or timer never closes.
- **Expecting an "eternal cache" from \`refCount: true\`** — the buffer resets at zero subscribers and the request goes out again.
- **\`bufferSize\` greater than 1 "just in case"** — it retains heavy objects; take exactly what you need.
- **Placing \`shareReplay\` before or after \`catchError\`** changes what gets cached: the successful response, or the error too.
- **Follow-up question**: how does it differ from \`share({ connector: () => new ReplaySubject(1) })\`? Essentially the same thing, but with full control over resets (\`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`).`
    }
  },
  {
    id: 'rxjs-006',
    category: 'rxjs',
    level: 'Hard',
    tags: ['switchmap', 'mergemap', 'concatmap', 'exhaustmap'],
    question: {
      ru: 'Сравните switchMap, mergeMap, concatMap и exhaustMap. Когда какой и какова семантика отмены?',
      en: 'Compare switchMap, mergeMap, concatMap, and exhaustMap. When do you use each and what are the cancellation semantics?'
    },
    answer: {
      ru: `## В чём суть

Все четыре оператора делают одно и то же: берут каждое значение внешнего потока, превращают его во **внутренний** Observable (обычно HTTP-запрос) и «сплющивают» результаты в один поток. Отличаются они ровно одним: **что делать, если новое значение пришло, пока предыдущий внутренний поток ещё работает**. Отменить старый (\`switchMap\`), запустить параллельно (\`mergeMap\`), поставить в очередь (\`concatMap\`) или проигнорировать новый (\`exhaustMap\`).

Аналогии: \`switchMap\` — **переключение каналов ТВ**: включил новый — предыдущий обрывается. \`concatMap\` — **очередь в кассу**: следующего обслужат, только когда уйдёт предыдущий. \`mergeMap\` — **несколько касс сразу**: все обслуживаются параллельно, кто первым закончил, тот первым ушёл. \`exhaustMap\` — **турникет**: пока вы проходите, всех остальных он просто не замечает.

**Какую проблему решает.** Пользователь печатает в поиске быстрее, чем отвечает сервер; дважды кликает «Сохранить»; загружает 50 файлов разом. Без явной стратегии получаются гонки: ответ на старый запрос перезаписывает новый, двойной клик создаёт два заказа, 50 параллельных загрузок забивают сеть. Выбор оператора — это выбор **семантики конкурентности и отмены**: какие запросы важны, какие можно отменить, а какие терять нельзя ни в коем случае.

## Словарик терминов

- **Внешний поток (outer Observable)** — поток-триггер: ввод в поиске, клики, действия NgRx.
- **Внутренний поток (inner Observable)** — поток, который создаётся на каждое внешнее значение функцией-проекцией: \`q => api.search(q)\`.
- **Проекция (project function)** — функция \`(value, index) => Observable\`, которую вы передаёте в оператор.
- **Higher-order оператор** — оператор, который работает с «потоками потоков»: на каждое значение создаёт новый Observable.
- **Сплющивание (flattening)** — подписка на внутренние потоки и выдача их значений в один общий поток.
- **Конкурентность (concurrency)** — сколько внутренних потоков работают одновременно.
- **Отмена (cancellation)** — отписка от внутреннего потока; для HTTP в Angular это прерывание запроса.
- **Гонка (race condition)** — ситуация, когда результат зависит от того, какой асинхронный ответ пришёл первым.
- **Мутация** — запрос, меняющий данные на сервере: \`POST\`, \`PUT\`, \`DELETE\`.
- **Typeahead / автокомплит** — поиск с подсказками по мере ввода.
- **\`catchError\`** — оператор, перехватывающий ошибку и заменяющий её другим потоком.
- **NgRx Effect** — класс-обработчик побочных эффектов в NgRx: слушает поток действий \`actions$\` и вызывает API.

## Как это работает под капотом

Общая схема для всех четырёх:

1. Оператор подписывается на внешний поток.
2. Приходит внешнее значение → оператор вызывает вашу проекцию и получает внутренний Observable (он ещё ленивый, запрос не ушёл).
3. Дальше развилка — **есть ли уже активный внутренний поток**:
4. \`switchMap\` отписывается от старого (запрос отменяется) и подписывается на новый.
5. \`mergeMap\` подписывается на новый, не трогая старые; если задан лимит конкурентности и он исчерпан — кладёт значение в очередь.
6. \`concatMap\` кладёт значение в очередь и подпишется на него, только когда текущий внутренний поток завершится (\`complete\`). Это \`mergeMap\` с лимитом 1.
7. \`exhaustMap\` просто выбрасывает новое значение — проекция даже не вызывается.
8. Значения всех активных внутренних потоков пересылаются в результирующий поток.
9. Результат завершается, когда завершился внешний поток **и** все внутренние (и очередь пуста). Ошибка любого внутреннего потока — это ошибка всего результата.

Упрощённая реализация \`switchMap\` показывает, где живёт отмена:

\`\`\`ts
function switchMap(project) {
  return source => new Observable(subscriber => {
    let innerSub = null;
    const outerSub = source.subscribe({
      next: value => {
        innerSub?.unsubscribe();                     // ← вся «магия» отмены
        innerSub = project(value).subscribe({
          next: v => subscriber.next(v),
          error: e => subscriber.error(e),
        });
      },
      error: e => subscriber.error(e),
      complete: () => { /* завершиться, когда завершится и внутренний */ },
    });
    return () => { outerSub.unsubscribe(); innerSub?.unsubscribe(); };
  });
}
\`\`\`

Замените строку с \`unsubscribe\` на «если \`innerSub\` активен — return» — получится \`exhaustMap\`; на «положить в очередь» — \`concatMap\`; уберите её совсем — \`mergeMap\`.

### Одна диаграмма на всех

Внешние значения \`a\`, \`b\`, \`c\`; каждый внутренний поток выдаёт результат через 3 кадра и завершается на 4-м. Диаграммы проверены через \`TestScheduler\`, один символ — один кадр:

\`\`\`text
внешний:     -a-b-----c---|
switchMap:   ------B-----C|     a отменён в кадре 3, когда пришёл b
mergeMap:    ----A-B-----C|     все три, параллельно
concatMap:   ----A---B---C|     b ждал, пока a завершится, и стартовал в кадре 5
exhaustMap:  ----A-------C|     b выброшен: в кадре 3 a ещё работал
\`\`\`

### Пример 1. Три «запроса» разной длительности

Источник синхронно выдаёт \`1, 2, 3\`, запрос \`id\` длится \`400 - id * 100\` мс (первый самый медленный):

\`\`\`ts
const fakeRequest = (id: number, ms: number) => timer(ms).pipe(map(() => \`ответ \${id}\`));

from([1, 2, 3]).pipe(op(id => fakeRequest(id, 400 - id * 100))).subscribe(console.log);
// mergeMap   ответ 3 (100 мс), ответ 2 (200 мс), ответ 1 (300 мс)
// concatMap  ответ 1 (300 мс), ответ 2 (500 мс), ответ 3 (600 мс)
// switchMap  ответ 3 (100 мс)
// exhaustMap ответ 1 (300 мс)
\`\`\`

\`timer(ms)\` выдаёт одно значение через \`ms\` миллисекунд и завершается — так имитируется запрос, а \`from([1, 2, 3])\` выдаёт элементы массива синхронно, один за другим. Здесь видны все четыре характера: \`mergeMap\` быстрее всех, но порядок ответов — по скорости сервера, а не по порядку запросов; \`concatMap\` сохраняет порядок ценой суммарного времени; \`switchMap\` оставил только последний; \`exhaustMap\` — только первый.

### \`switchMap\` — важен только последний

**Что делает.** На новое внешнее значение отписывается от предыдущего внутреннего потока и подписывается на новый. В Angular отписка от \`HttpClient\` прерывает HTTP-запрос.

\`\`\`ts
search$ = this.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.api.search(q).pipe(
    finalize(() => console.log('finalize запроса', q)),
  )),
);
// ввод 'an', через 30 мс 'ang' (без debounce для наглядности):
// finalize запроса an        ← первый запрос отменён
// результат ang
// finalize запроса ang
\`\`\`

\`debounceTime(300)\` ждёт паузу в наборе 300 мс, \`distinctUntilChanged()\` не пропускает повтор того же текста, а \`finalize\` срабатывает при любом закрытии подписки — по нему и видно, что первый запрос отменён.

**Семантика отмены:** отменяет **старое**. Гонка «ответ на старый запрос пришёл позже и перезаписал новый» исчезает сама собой: старого ответа просто не будет.

**Когда брать:** поиск и автокомплит, смена фильтров и сортировки грида, загрузка данных по параметру маршрута (\`route.paramMap.pipe(switchMap(...))\`), любые **чтения**, где устаревший результат никому не нужен.

### \`mergeMap\` — все параллельно

**Что делает.** Подписывается на каждый новый внутренний поток, ничего не отменяя. Значения чередуются в порядке прихода. Второй аргумент ограничивает число одновременных потоков, остальные ждут в очереди.

\`\`\`ts
from([1, 2, 3, 4, 5]).pipe(mergeMap(id => upload(id), 2)).subscribe(id => console.log('готов', id));
// каждая загрузка длится 300 мс
// старт 1 (0 мс), старт 2 (0 мс)
// готов 1 (300 мс), старт 3 (300 мс), готов 2 (300 мс), старт 4 (300 мс)
// готов 3 (600 мс), старт 5 (600 мс), готов 4 (600 мс)
// готов 5 (900 мс)
\`\`\`

**Семантика отмены:** не отменяет ничего; отписка от результата отменяет все активные.

**Когда брать:** независимые операции, где важны все результаты и не важен порядок — загрузка N файлов, параллельная подгрузка деталей для строк таблицы, отправка аналитики. Почти всегда с лимитом: по HTTP/1.1 браузер всё равно держит ограниченное число соединений к одному хосту (в Chrome — 6, точное число зависит от браузера), а сервер скажет спасибо. Старое имя \`flatMap\` в RxJS 7 помечено deprecated и будет удалено в v8.

### \`concatMap\` — строго по очереди

**Что делает.** Ставит внешние значения в очередь и подписывается на следующий внутренний поток только после \`complete\` предыдущего. Гарантирует, что и запросы уходят, и ответы приходят в исходном порядке.

\`\`\`ts
saveClicks$.pipe(
  concatMap(dto => this.api.save(dto)),
).subscribe();
// три быстрых «Сохранить»: save(1) → ответ → save(2) → ответ → save(3) → ответ
\`\`\`

**Семантика отмены:** не отменяет и не теряет ничего — копит. Цена — задержка: каждый ждёт всех предыдущих.

**Когда брать:** мутации, где важен порядок и нельзя потерять ни одной команды — автосохранение черновика, последовательные \`PATCH\` одной сущности, запись в лог, операции, где следующая зависит от результата предыдущей. \`mergeMap(fn, 1)\` делает ровно то же самое — в RxJS \`concatMap\` так и реализован.

### \`exhaustMap\` — занят, не беспокоить

**Что делает.** Пока внутренний поток активен, все новые внешние значения **игнорируются** — не откладываются, а выбрасываются. Когда внутренний завершился, следующее внешнее значение снова принимается.

\`\`\`ts
submitClicks$.pipe(
  exhaustMap(() => this.api.submit(this.form.getRawValue())),
).subscribe();
// клик, клик, клик за 200 мс, запрос длится 1 с → ушёл ОДИН запрос
\`\`\`

Проверяется marble-тестом: клики в кадрах 1, 3, 7, запрос \`---s|\` → результат \`----s-----s|\`, второй клик не создал подписку.

**Семантика отмены:** отменяет **новое**, старое доводит до конца.

**Когда брать:** кнопки «Сохранить», «Оплатить», «Войти», «Обновить» — защита от двойного клика на уровне потока; опрос сервера (\`interval\` + \`exhaustMap\`), где новый опрос не должен стартовать, пока не завершился предыдущий.

### \`catchError\` внутри или снаружи

Ошибка внутреннего потока — это ошибка всего результата, а после ошибки поток мёртв. Поэтому место \`catchError\` решает, переживёт ли поиск первый же сбой сервера:

\`\`\`ts
// снаружи: первая ошибка убивает весь поток
clicks.pipe(switchMap(() => api()), catchError(() => of('ошибка обработана')))
// ошибка обработана
// поток завершён            ← следующие клики больше ничего не делают

// внутри: ошибка гасится на уровне одного запроса
clicks.pipe(switchMap(() => api().pipe(catchError(() => of('ошибка обработана')))))
// ошибка обработана
// ok 2
// ok 3                      ← поток живёт дальше
\`\`\`

Это правило одинаково для всех четырёх операторов и особенно важно в NgRx Effects: эффект, чей поток умер, перестаёт реагировать на действия до перезагрузки страницы.

### Как выбрать

- **Чтение, нужен только актуальный результат** (поиск, фильтры, параметры маршрута) — \`switchMap\`.
- **Запись, важен порядок, ничего нельзя потерять** (автосохранение, очередь команд) — \`concatMap\`.
- **Независимые операции, нужны все результаты, порядок не важен** (загрузка файлов, массовые запросы) — \`mergeMap\` с лимитом конкурентности.
- **Действие, которое нельзя запустить повторно, пока идёт текущее** (submit, login, оплата, опрос) — \`exhaustMap\`.
- **Сомневаетесь при мутации** — точно не \`switchMap\`: он молча отменит команду пользователя.

### Где это применяется на практике

- **Поиск по большому справочнику** в enterprise-форме: \`debounceTime\` + \`distinctUntilChanged\` + \`switchMap\` — один актуальный запрос.
- **Серверная пагинация, сортировка и фильтрация грида**: \`combineLatest\` параметров + \`switchMap\` к API, чтобы быстрые клики по страницам не приводили к «прыгающим» данным.
- **NgRx Effects**: загрузка — \`switchMap\`, создание и удаление — \`concatMap\` или \`mergeMap\`, логин — \`exhaustMap\`.
- **Массовые операции**: «экспортировать 200 отчётов» — \`mergeMap(fn, 4)\`, чтобы не положить сервер.
- **Автосохранение формы**: \`valueChanges\` + \`debounceTime\` + \`concatMap\` — сохранения не перегоняют друг друга.

## Важные нюансы и подводные камни

- **\`switchMap\` на мутациях** — самая частая ошибка в NgRx Effects: два быстрых «Сохранить» → первое отменено, данные потеряны.
- **Отмена на клиенте не откатывает сервер.** \`switchMap\` прерывает HTTP-запрос, но если сервер уже получил \`POST\`, операция выполнится — клиент просто не узнает результат. Ещё одна причина не использовать \`switchMap\` для записи.
- **\`mergeMap\` без лимита** на потоке из тысячи id → тысяча одновременных запросов, очередь в браузере и нагрузка на сервер.
- **\`mergeMap\` не сохраняет порядок.** Ответ на второй запрос может прийти раньше первого; если порядок важен — \`concatMap\`.
- **\`concatMap\` с бесконечным внутренним потоком** — очередь встанет навсегда: если внутренний поток — \`interval\` или \`valueChanges\`, второй элемент никогда не будет обработан.
- **\`concatMap\` копит очередь.** Если внешние значения приходят быстрее, чем обрабатываются, очередь растёт без ограничений — это память и всё большая задержка.
- **\`exhaustMap\` не буферизует.** Пропущенные значения не «догонят» позже, они выброшены насовсем; для команд, которые нельзя потерять, он не подходит.
- **\`catchError\` снаружи higher-order оператора** убьёт весь внешний поток. Ставьте его **внутри**, на внутреннем Observable.
- **Промис вместо Observable не отменяется.** Проекция может вернуть промис (\`q => fetch(...)\`), но \`switchMap\` при переключении лишь проигнорирует его результат — сам \`fetch\` продолжит работу. Для настоящей отмены — \`HttpClient\` или \`fromFetch\`.
- **\`resultSelector\` устарел.** Второй аргумент-функция у этих операторов deprecated в RxJS 7; вместо него используют \`map\` внутри проекции.

**Плюсы:** декларативно решают гонки, двойные клики и перегрузку сети; отмена HTTP-запросов «бесплатно»; одинаковый API у всех четырёх — меняется одно слово, а не архитектура.
**Минусы:** ошибка выбора не видна при ручном тестировании (проявляется только при быстрых действиях или медленной сети); \`switchMap\` и \`exhaustMap\` молча теряют значения; \`concatMap\` и \`mergeMap\` без лимита могут копить очередь или перегружать сеть.

## Как это спрашивают на собеседовании

**Главный вывод:** все четыре проецируют значение во внутренний поток и сплющивают результат, а различаются реакцией на новое значение при активном старом: \`switchMap\` отменяет старое, \`mergeMap\` запускает параллельно, \`concatMap\` ставит в очередь, \`exhaustMap\` игнорирует новое. Выбор оператора — это выбор семантики отмены.

Типичные формулировки: «Чем \`switchMap\` отличается от \`mergeMap\`?», «Какой оператор для поиска, а какой для сохранения?», «Как защитить кнопку от двойного клика на RxJS?», «Почему эффект NgRx теряет сохранения?».

Что могут спросить следом:

- *\`mergeMap(fn, 1)\` эквивалентен \`concatMap\`?* — Да, это ровно очередь по одному; \`concatMap\` так и реализован.
- *Отменяет ли \`switchMap\` запрос на сервере?* — Он прерывает HTTP-запрос в браузере, но если сервер уже начал обработку, она завершится.
- *Где ставить \`catchError\`?* — Внутри проекции, на внутреннем потоке, иначе первая ошибка убьёт весь поток.
- *Что будет с \`concatMap\`, если внутренний поток бесконечный?* — Очередь встанет навсегда.
- *Как протестировать отмену?* — Marble-тестом с \`expectSubscriptions\`: у отменённого внутреннего потока \`!\` стоит в момент нового внешнего значения.

### Ответ на 1 минуту

> Все четыре — higher-order операторы: на каждое внешнее значение создают внутренний Observable, обычно запрос, и сплющивают результаты в один поток. Различаются они тем, что делают, если новое значение пришло, пока старый запрос ещё идёт. \`switchMap\` отписывается от старого и в Angular этим прерывает HTTP-запрос — идеально для поиска, фильтров и параметров маршрута. \`mergeMap\` запускает всё параллельно и не гарантирует порядок, поэтому я ставлю ему лимит конкурентности. \`concatMap\` выстраивает очередь и не теряет ничего — выбор для мутаций, где важен порядок. \`exhaustMap\` игнорирует новые значения, пока занят, — защита кнопки «Сохранить» от двойного клика. Ключевой нюанс: \`switchMap\` на сохранении молча теряет команды пользователя, а \`catchError\` нужно ставить внутри проекции, иначе первая ошибка убьёт весь поток.`,
      en: `## In short

All four do the same job: take each value from the outer stream, turn it into an **inner** Observable (usually a request), and flatten the result into one stream. They differ in exactly one thing: **what to do when a new value arrives while the previous request is still in flight**.

Plain-language analogies:

- \`switchMap\` — **changing TV channels**: turn on a new one and the previous is cut off.
- \`concatMap\` — **a queue at the till**: the next person is served only after the previous one leaves.
- \`mergeMap\` — **several tills at once**: everyone is served in parallel, and the order they leave in is anybody's guess.
- \`exhaustMap\` — **a turnstile**: while you are going through, it simply ignores everyone else.

## The four operators — what differs

1. **\`switchMap\`** — a new outer value **cancels** (unsubscribes) the previous inner stream and subscribes to the new one. Semantics: "only the latest matters".
2. **\`mergeMap\`** (a.k.a. \`flatMap\`) — runs all inner streams **in parallel**, cancels nothing, emissions interleave. Concurrency can be capped with a second argument: \`mergeMap(fn, 3)\`.
3. **\`concatMap\`** — builds a **queue**: the next inner stream starts only after the previous one completes. Order is guaranteed.
4. **\`exhaustMap\`** — while an inner stream is active, every new outer value is **ignored** (not deferred — discarded).

One picture beats a thousand words. Outer values \`a\` and \`b\` arrive close together; each request takes 3 ticks:

\`\`\`text
outer:       --a--b------------
switchMap:   ------(a cut)--B--    only B
mergeMap:    -----A---B--------    both, order is luck
concatMap:   -----A-----B------    both, strictly A then B
exhaustMap:  -----A------------    only A, b discarded
\`\`\`

## When to use which

- **Search, filters, route-param changes** → \`switchMap\`. Nobody needs a stale response, and "the answer arrived for the wrong query" races disappear by themselves.
- **Saves, logs, any writes where order matters** → \`concatMap\`. Never \`switchMap\`: it silently drops the user's commands.
- **Independent parallel operations** (uploading N files) → \`mergeMap\`, almost always with a concurrency limit.
- **A Save button, login, "refresh"** → \`exhaustMap\`. A double click will not produce a second request.

## Example

\`\`\`ts
// typeahead: cancel the stale request
input$.pipe(
  debounceTime(200),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

// saving: a queue, nothing is lost
save$.pipe(concatMap(dto => api.save(dto)));

// button: ignore the double click
click$.pipe(exhaustMap(() => api.submit(form.value)));
\`\`\`

Why: in search you only want the answer to the latest input, so \`switchMap\` cancels the old HTTP call and protects against leaks at the same time. In saving you cannot afford to drop commands, hence the queue. On a button the extra clicks are noise and are simply thrown away.

## What to say in the interview

> All four are higher-order mapping operators: they project each outer value into an inner Observable and flatten the result; what differs is the concurrency strategy. On a new outer value \`switchMap\` unsubscribes from the previous inner stream — "only the latest matters", perfect for typeahead and route params because the stale HTTP request is cancelled as a bonus. \`mergeMap\` runs everything in parallel, cancels nothing and guarantees no ordering; on a fast source without the concurrency argument that is a flood of requests. \`concatMap\` builds a queue — the next starts only after the previous completes — so it is the right choice for mutations where order matters. \`exhaustMap\` ignores new values while one is in flight, which is how you protect a Save button from double clicks. The key senior nuance is that picking an operator is picking cancellation semantics, not a style preference: \`switchMap\` on a save silently loses user commands, and an unbounded \`mergeMap\` exhausts the connection pool.

## Gotchas

- **\`switchMap\` on mutations** — the most common NgRx Effects bug: two quick Saves → the first is cancelled, data is lost.
- **Unbounded \`mergeMap\`** over a stream of a thousand ids → a thousand simultaneous requests.
- **\`concatMap\` with an infinite inner stream** — the queue jams forever and the second item is never processed.
- **\`exhaustMap\` does not buffer**: skipped values never "catch up" later, they are gone for good.
- **\`catchError\` outside the higher-order operator** kills the whole outer stream. Put it **inside**, on the inner Observable.
- **Follow-up question**: is \`mergeMap(fn, 1)\` equivalent to \`concatMap\`? Yes — that is exactly a one-at-a-time queue.`
    }
  },
  {
    id: 'rxjs-007',
    category: 'rxjs',
    level: 'Hard',
    tags: ['combinelatest', 'forkjoin', 'zip', 'withlatestfrom'],
    question: {
      ru: 'Сравните combineLatest, forkJoin, withLatestFrom и zip. В чём ключевые отличия?',
      en: 'Compare combineLatest, forkJoin, withLatestFrom, and zip. What are the key differences?'
    },
    answer: {
      ru: `## В чём суть

Все четыре оператора собирают несколько потоков в один, но отвечают на два разных вопроса: **кто решает, когда выдавать результат** и **какие именно значения брать**. \`combineLatest\` выдаёт свежую комбинацию при любом изменении любого источника, \`forkJoin\` ждёт, пока все закончат, и выдаёт итог один раз, \`withLatestFrom\` выдаёт только по сигналу главного потока, а \`zip\` склеивает значения попарно по номеру.

Аналогия: четыре коллеги пишут числа на досках. \`combineLatest\` — «фотографируем все доски каждый раз, когда **кто угодно** что-то переписал». \`forkJoin\` — «ждём, пока **все закончат работу**, и записываем только итоговые цифры». \`withLatestFrom\` — «фотографируем, только когда пишет **начальник**; остальные доски просто попадают в кадр». \`zip\` — «сравниваем **строчку со строчкой**: первую с первой, вторую со второй; кто быстрее — ждёт остальных».

**Какую проблему решает.** Почти любой экран зависит от нескольких источников: фильтры, сортировка и страница грида; пользователь и его настройки; кнопка «Отправить» и текущее значение формы. Если комбинировать их вручную через вложенные \`subscribe\`, получаются гонки, лишние запросы и утечки. Каждый из четырёх операторов закрывает свой сценарий, а неправильный выбор приводит к классическим багам: экран, который никогда не загружается (\`forkJoin\` на бесконечном потоке), запрос на каждое нажатие клавиши в фильтре (\`combineLatest\` вместо \`withLatestFrom\`) или «мигание» несогласованных данных.

## Словарик терминов

- **Источник (source)** — один из входных потоков, которые объединяются.
- **Эмиссия (emission)** — выдача значения потоком (\`next\`).
- **Последнее значение (latest value)** — самое свежее значение, которое источник выдал к текущему моменту.
- **Первичный и вторичный поток (primary / secondary)** — в \`withLatestFrom\`: первичный — тот, к которому применён \`pipe\` (триггер), вторичные — те, из которых только «подсматривают» значения.
- **Бесконечный поток** — поток, который никогда не вызывает \`complete\`: \`Subject\`, \`valueChanges\`, \`interval\`, \`store.select\`.
- **\`Promise.all\`** — встроенная функция JavaScript: ждёт все промисы и отдаёт массив результатов; падает, если упал любой.
- **Glitch («глюк», промежуточное состояние)** — кратковременная несогласованная комбинация, когда одно изменение доходит до двух зависимых потоков не одновременно.
- **Алмазная зависимость (diamond)** — два производных потока от одного источника, которые затем снова соединяются.
- **\`startWith\`** — оператор, который выдаёт заданное значение сразу при подписке, до значений источника.
- **\`catchError\`** — оператор, который перехватывает ошибку и заменяет её другим потоком.
- **View-модель (view model)** — один объект со всем, что нужно шаблону, собранный из нескольких потоков.
- **\`computed\`** — производный сигнал Angular; пересчитывается из других сигналов без промежуточных состояний.

## Как это работает под капотом

Все четыре оператора устроены похоже:

1. Подписываются на **все** источники сразу (у \`withLatestFrom\` — на вторичные ещё до первичного).
2. Для каждого источника хранят состояние: \`combineLatest\`, \`forkJoin\` и \`withLatestFrom\` — **последнее значение** и флаг «уже что-то выдал»; \`zip\` — **очередь** ещё не использованных значений.
3. На каждую эмиссию решают, пора ли выдать результат:
4. \`combineLatest\` — если **у всех** источников уже есть хотя бы одно значение, выдаёт массив последних значений при эмиссии **любого** источника.
5. \`forkJoin\` — ничего не выдаёт по эмиссиям; ждёт \`complete\` от всех и тогда один раз выдаёт последние значения.
6. \`withLatestFrom\` — выдаёт только когда эмитит **первичный** поток, и только если каждый вторичный уже что-то выдал; иначе значение первичного выбрасывается.
7. \`zip\` — когда в **каждой** очереди есть хотя бы по одному значению, достаёт по одному из каждой и выдаёт кортеж.
8. Ошибка любого источника — ошибка результата у всех четырёх; остальные подписки при этом отменяются.

### Одна диаграмма на всех

Два источника: \`A\` выдаёт \`1, 2, 3\`, \`B\` — \`a, b\`. Каждый символ — один кадр времени; диаграммы проверены через \`TestScheduler\`:

\`\`\`text
A:                     -1---2-----3|
B:                     ---a----b-|
combineLatest([A, B]): ---p-q--r--s|      p=[1,a] q=[2,a] r=[2,b] s=[3,b]
forkJoin([A, B]):      ------------(s|)   s=[3,b] — один раз, после завершения обоих
A.withLatestFrom(B):   -----q-----s|      q=[2,a] s=[3,b] — 1 выброшено: у B ещё не было значения
zip([A, B]):           ---p----q-|        p=[1,a] q=[2,b] — 3 без пары, B завершился
\`\`\`

Читайте вертикально: в кадре 3 пришло \`a\`, и \`combineLatest\` сразу выдал \`[1,a]\`, а \`withLatestFrom\` промолчал — эмитит только \`A\`. В кадре 8 пришло \`b\`: \`combineLatest\` выдал \`[2,b]\`, \`zip\` нашёл пару для второго значения \`A\`.

### \`combineLatest\` — снимок всех досок при любом изменении

**Что делает.** Выдаёт массив (или объект) последних значений всех источников при эмиссии любого из них. Молчит, пока **каждый** источник не выдал хотя бы одно значение. Завершается, когда завершились все.

\`\`\`ts
const sort$ = new Subject<string>();
const page$ = new Subject<number>();

combineLatest([sort$.pipe(startWith('name')), page$.pipe(startWith(1))])
  .subscribe(v => console.log('grid', v));
page$.next(2);
// grid ["name",1]     ← благодаря startWith — сразу
// grid ["name",2]
\`\`\`

Без \`startWith\` здесь не было бы ни одной эмиссии, пока пользователь не тронет **и** сортировку, **и** страницу. Если источник завершился, \`combineLatest\` продолжает использовать его последнее значение. Есть объектная форма: \`combineLatest({ sort: sort$, page: page$ })\` выдаёт \`{ sort, page }\` — удобнее массива.

**Когда брать:** экран зависит от нескольких **состояний**, и при изменении любого нужно пересчитать результат — фильтры + сортировка + страница грида, сборка view-модели для шаблона.

### \`forkJoin\` — дождаться всех и взять итог

**Что делает.** Подписывается на все источники параллельно, ждёт \`complete\` **каждого** и выдаёт их **последние** значения **ровно один раз**, затем завершается. RxJS-аналог \`Promise.all\`.

\`\`\`ts
forkJoin({
  user: this.api.getUser(),
  settings: this.api.getSettings(),
}).subscribe(({ user, settings }) => this.init(user, settings));
// init {"user":{"name":"Анна"},"settings":{"theme":"dark"}}
// init complete
\`\`\`

Ошибка любого источника — ошибка всего результата, а остальные запросы отменяются. Если результат нужен частично, ошибку гасят **на каждом** источнике:

\`\`\`ts
forkJoin({
  user: this.api.getUser(),
  stats: this.api.getStats().pipe(catchError(() => of(null))),
}).subscribe(v => console.log(v));
// {"user":"Анна","stats":null}   ← экран откроется и без статистики
\`\`\`

**Когда брать:** стартовая загрузка — N **одноразовых** HTTP-запросов параллельно, и результат нужен, только когда готовы все; массовая операция, после которой надо показать итог.

### \`withLatestFrom\` — триггер плюс контекст

**Что делает.** Оператор (а не функция-создатель): выдаёт значение только когда эмитит **первичный** поток, подмешивая последние значения вторичных. Вторичные потоки эмиссию **не вызывают**. Если какой-то вторичный ещё ничего не выдал, эмиссия первичного молча выбрасывается.

\`\`\`ts
submit$.pipe(
  withLatestFrom(this.filters$),
  switchMap(([, filters]) => this.api.load(filters)),
).subscribe();

// по шагам:
// submit 'клик 1'          → ничего: filters$ ещё пуст
// filters { q: 'ang' }      → ничего: фильтры не триггер
// submit 'клик 2'          → ['клик 2', { q: 'ang' }]
// filters { q: 'angular' }, затем filters$ завершился
// submit 'клик 3'          → ['клик 3', { q: 'angular' }]  ← последнее значение живёт и после complete
\`\`\`

\`switchMap\` превращает каждый сабмит в запрос и отменяет предыдущий, если тот ещё идёт. Если бы здесь стоял \`combineLatest\`, запрос уходил бы ещё и при каждом изменении фильтров, а нам нужно стрелять только по кнопке.

**Когда брать:** «по событию возьми текущее состояние» — сабмит формы с текущими фильтрами, NgRx Effect, которому нужно значение из store (\`withLatestFrom(this.store.select(selectUser))\`), клик по строке грида с текущими настройками.

### \`zip\` — строчка к строчке

**Что делает.** Склеивает значения **по порядковому номеру**: первое с первым, второе со вторым. Идёт в темпе самого медленного источника, а значения быстрых копит в буфере. Завершается, когда какой-то источник завершился и для его буфера больше не будет пар.

\`\`\`ts
const fast$ = new Subject<number>();
const slow$ = new Subject<string>();
zip([fast$, slow$]).subscribe(v => console.log('zip', v));

fast$.next(1); fast$.next(2); fast$.next(3);
slow$.next('a');
// zip [1,"a"]
// (2 и 3 ждут пары в буфере)
\`\`\`

**Когда брать:** редко — когда значения двух потоков действительно соответствуют друг другу по номеру: запрос и ответ в протоколе, где порядок гарантирован; два массива одинаковой длины, превращённые в потоки; анимация, где каждому кадру соответствует значение.

### Glitch: почему \`combineLatest\` иногда выдаёт неверную пару

Если два источника \`combineLatest\` зависят от одного общего потока («алмаз»), одно изменение доходит до них по очереди, и между этими моментами \`combineLatest\` выдаёт смешанную пару — новое значение одного и старое другого:

\`\`\`ts
const price = new BehaviorSubject(100);
const withTax = price.pipe(map(p => p * 1.2));
const discount = price.pipe(map(p => p * 0.1));

combineLatest([withTax, discount])
  .subscribe(([t, d]) => console.log('итого', t - d, \`(\${t} - \${d})\`));
price.next(200);
// итого 110 (120 - 10)
// итого 230 (240 - 10)     ← glitch: новая цена с налогом, старая скидка
// итого 220 (240 - 20)
\`\`\`

Для UI это «мигание» неверной суммы, для эффекта — лишний запрос с несогласованными параметрами. Способы лечения: не делать алмаз (считать оба значения в одном \`map\` от \`price\`); схлопывать синхронные эмиссии через \`auditTime(0)\` (он ждёт до следующей задачи event loop и выдаёт только последнее значение) — тогда выйдет только \`итого 220\`; или вынести производное состояние в сигналы.

### \`computed\` — комбинирование без глитчей

Сигналы Angular решают ту же задачу без промежуточных состояний: \`computed\` пересчитывается лениво, когда его читают, и к этому моменту все зависимости уже обновлены.

\`\`\`ts
const price = signal(100);
const withTax = computed(() => price() * 1.2);
const discount = computed(() => price() * 0.1);
const total = computed(() => withTax() - discount());
console.log(total());   // 110
price.set(200);
console.log(total());   // 220 — промежуточного 230 нет
\`\`\`

Поэтому для синхронного состояния шаблона (комбинация фильтров, итоги) часто выгоднее \`computed\`, а \`combineLatest\` оставляют для асинхронных цепочек, где нужны \`switchMap\`, \`debounceTime\` и отмена запросов.

### Как выбрать

- **Результат зависит от нескольких состояний и должен обновляться при любом изменении** — \`combineLatest\` (с \`startWith\` для источников без начального значения) или \`computed\` для сигналов.
- **Несколько одноразовых запросов, результат нужен один раз, когда готовы все** — \`forkJoin\` (с \`catchError\` на каждом источнике, если допустим частичный результат).
- **Есть одно событие-триггер, остальное — контекст** — \`withLatestFrom\`.
- **Значения соответствуют друг другу строго по номеру** — \`zip\`.
- **Источник бесконечный** — никогда не \`forkJoin\`; \`combineLatest\` или \`withLatestFrom\`.

### Где это применяется на практике

- **Серверный грид**: \`combineLatest({ filters, sort, page })\` + \`debounceTime\` (дождаться паузы во вводе) + \`switchMap\` к API — один актуальный запрос при любом изменении параметров.
- **Инициализация экрана**: \`forkJoin\` справочников (статусы, валюты, пользователи) перед показом формы редактирования.
- **NgRx Effects**: \`withLatestFrom(store.select(...))\`, чтобы по действию взять текущий контекст (выбранную компанию, токен, фильтры).
- **View-модель страницы**: \`vm$ = combineLatest({ user, permissions, items })\` и один \`@if (vm$ | async; as vm)\` в шаблоне.
- **Отправка формы**: клик + \`withLatestFrom(form.valueChanges)\` (или просто \`form.getRawValue()\` внутри обработчика) — значение берётся в момент клика.

## Важные нюансы и подводные камни

- **\`forkJoin\` на бесконечном источнике** (\`Subject\`, \`valueChanges\`, \`interval\`, \`store.select\`) не выдаёт **никогда** — он ждёт \`complete\`. Первое, что спросят. Лечение — \`take(1)\` на источнике («взять первое значение и завершиться») или другой оператор.
- **Источник \`forkJoin\` завершился без значений** — \`forkJoin\` сразу завершается, ничего не выдав: \`forkJoin([of(1), EMPTY])\` даёт только \`complete\`. Подписчик, ждущий данных, их не получит.
- **Один упавший запрос в \`forkJoin\`** роняет весь результат и отменяет остальные запросы. Лечится \`catchError\` **на каждом** источнике.
- **\`combineLatest\` не выдаёт ничего**, если хотя бы один источник ещё не дал значения. Спасает \`startWith(...)\` или \`BehaviorSubject\` в качестве источника.
- **\`combineLatest\` на «алмазных» зависимостях** даёт glitch — промежуточную несогласованную пару.
- **\`combineLatest\` реагирует на всё.** Если один источник — часто меняющееся поле ввода, а внутри \`switchMap\` к API, запрос будет уходить на каждое нажатие; добавьте \`debounceTime\` или используйте \`withLatestFrom\`.
- **\`withLatestFrom\` до первого значения вторичного потока** молча проглатывает эмиссии триггера. Вторичный должен быть \`BehaviorSubject\`, \`ReplaySubject\` или иметь \`startWith\`.
- **\`withLatestFrom\` подписывается на вторичный поток сам.** Если вторичный — cold HTTP-запрос, он уйдёт в момент подписки, а не по триггеру.
- **\`zip\` при разной скорости источников** копит буфер быстрого — потенциальная утечка памяти.
- **Пустой массив** — \`combineLatest([])\` и \`forkJoin([])\` сразу завершаются без значений; это бывает, когда массив запросов строится динамически.
- **Устаревшие формы.** Перечисление источников через запятую (\`combineLatest(a$, b$)\`) в RxJS 7 deprecated — передавайте массив или объект. Операторные формы \`combineLatest\` и \`zip\` внутри \`pipe\` заменены на \`combineLatestWith\` и \`zipWith\`.

**Плюсы:** декларативно описывают зависимости между потоками; каждый оператор точно выражает своё намерение (состояние, итог, триггер, пары); объектные формы дают типизированные view-модели; ошибки и отписка обрабатываются централизованно.
**Минусы:** легко выбрать не тот оператор, и баг проявляется как «тишина» (\`forkJoin\`, \`combineLatest\`, \`withLatestFrom\`) без ошибки в консоли; \`combineLatest\` подвержен глитчам; \`zip\` и вторичные HTTP-потоки в \`withLatestFrom\` ведут себя неочевидно.

## Как это спрашивают на собеседовании

**Главный вывод:** \`combineLatest\` — последние значения при любом изменении (состояние), \`forkJoin\` — итоговые значения один раз после завершения всех (одноразовые запросы), \`withLatestFrom\` — по триггеру с контекстом, \`zip\` — попарно по номеру. \`forkJoin\` на бесконечном потоке молчит вечно.

Типичные формулировки: «Сравните \`combineLatest\`, \`forkJoin\`, \`withLatestFrom\` и \`zip\`», «Почему \`forkJoin\` ничего не выдаёт?», «Как загрузить несколько запросов параллельно и дождаться всех?», «Почему \`combineLatest\` молчит?».

Что могут спросить следом:

- *Чем \`forkJoin\` отличается от \`Promise.all\`?* — Берёт **последнее** значение каждого источника и отменяет остальные запросы при ошибке; если источник завершился пустым, \`forkJoin\` завершается без значения.
- *Как заставить \`combineLatest\` выдать значение сразу?* — \`startWith\` на источниках без начального значения.
- *Что такое glitch и как с ним бороться?* — Промежуточная несогласованная пара при алмазной зависимости; лечится перестройкой потока, \`auditTime(0)\` или сигналами \`computed\`.
- *Почему \`withLatestFrom\` теряет клики?* — Вторичный поток ещё ничего не выдал; нужен \`BehaviorSubject\` или \`startWith\`.
- *Когда нужен \`zip\`?* — Когда значения соответствуют строго по номеру; в остальных случаях он опасен растущим буфером.

### Ответ на 1 минуту

> Все четыре объединяют потоки, но различаются тем, кто решает, когда выдавать результат. \`combineLatest\` выдаёт массив последних значений при эмиссии любого источника, но молчит, пока каждый не выдал хотя бы одно, поэтому я добавляю \`startWith\` — это сборка view-модели и параметров грида. \`forkJoin\` — аналог \`Promise.all\`: ждёт \`complete\` всех и один раз отдаёт последние значения, подходит для параллельных HTTP-запросов при инициализации, а ошибку ловлю на каждом источнике, иначе падает всё. \`withLatestFrom\` эмитит только по первичному потоку и подмешивает последние значения остальных — классика для сабмита формы и эффектов NgRx. \`zip\` склеивает значения по номеру и копит буфер, поэтому нужен редко. Главные ловушки — \`forkJoin\` на бесконечном потоке не выдаст ничего, а \`combineLatest\` на алмазной зависимости даёт промежуточные несогласованные значения.`,
      en: `## In short

All four merge several streams into one, but they answer different questions: **who decides when to emit** and **what exactly gets taken**.

Analogy: picture four colleagues, each with a whiteboard they write numbers on.

- \`combineLatest\` — "photograph all the boards every time **anyone** changes theirs".
- \`forkJoin\` — "wait until **everyone has finished working**, then record only the final numbers".
- \`withLatestFrom\` — "photograph only when **the boss** writes; the other boards just happen to be in frame".
- \`zip\` — "match them **line by line**: first with first, second with second; whoever is faster waits for the rest".

## The four operators — what differs

1. **\`combineLatest\`** — emits an array of the **latest** values of all sources on **any** emission of any of them. Stays silent until every source has produced at least one value.
2. **\`forkJoin\`** — waits for \`complete\` of **all** sources and emits their **last** values **exactly once**. The RxJS equivalent of \`Promise.all\`. If any source errors, the whole thing errors.
3. **\`withLatestFrom\`** — emits only when the **primary** source (the one being piped) emits, attaching the latest values of the others. Secondary sources do **not** trigger emissions.
4. **\`zip\`** — pairs values **by index**: 1st with 1st, 2nd with 2nd. It moves at the pace of the slowest, buffering the faster ones.

## When to use which

- **A screen depending on several pieces of state** (filters + sort + page) → \`combineLatest\`.
- **Startup loading: N parallel HTTP calls, wait for all** → \`forkJoin\`.
- **"On click, take the current form value"** → \`withLatestFrom\`. One trigger, the rest is context.
- **Strict pairwise matching of two streams** → \`zip\` (rarely needed; the buffer can grow).

## Example

\`\`\`ts
// withLatestFrom: submit is the trigger, filters are context
submit$.pipe(
  withLatestFrom(filters$),
  switchMap(([, filters]) => api.load(filters))
);

// forkJoin: everything needed to initialise the screen
forkJoin({
  user: api.getUser(),
  settings: api.getSettings()
}).subscribe(({ user, settings }) => init(user, settings));
\`\`\`

Why: if the first example used \`combineLatest\`, a request would also fire on every filter change — but we only want to fire on submit. In the second, \`forkJoin\` hands us one tidy object once both requests have completed.

## What to say in the interview

> \`combineLatest\` emits an array of the latest values of all sources on any emission of any of them, but stays silent until every source has produced at least one value — which makes it good for assembling a view model out of several pieces of state. \`forkJoin\` is the \`Promise.all\` equivalent: it waits for \`complete\` on all sources and emits their last values once, so it fits parallel HTTP requests at initialisation, but an error in any source destroys the whole result. \`withLatestFrom\` emits only on the primary source, attaching the latest values of the secondary ones — a "context snapshot on a trigger", the classic form-submit pattern. \`zip\` matches values strictly by index and buffers the faster sources, so it is rarely used. The most common practical mistake is \`forkJoin\` over infinite streams like a Subject or \`valueChanges\`: it simply never emits, and what you actually want is \`combineLatest\` or \`withLatestFrom\`.

## Gotchas

- **\`forkJoin\` on an infinite source** (Subject, \`valueChanges\`, \`interval\`) — it **never** emits. The first thing they will ask.
- **One failing request in \`forkJoin\`** cancels the whole result. Fix with \`catchError\` on **each** inner stream.
- **\`combineLatest\` emits nothing at all** if even one source has not produced a value yet. \`startWith(...)\` saves you.
- **\`combineLatest\` over diamond dependencies** (two streams derived from one source) produces glitches — intermediate, inconsistent pairs.
- **\`withLatestFrom\` before the secondary stream's first value** silently swallows trigger emissions.
- **\`zip\` with sources of unequal speed** accumulates a buffer for the faster one — a potential memory leak.`
    }
  },
  {
    id: 'rxjs-008',
    category: 'rxjs',
    level: 'Medium',
    tags: ['merge', 'concat', 'combination'],
    question: {
      ru: 'Чем merge отличается от concat? Когда каждый уместен?',
      en: 'How does merge differ from concat? When is each appropriate?'
    },
    answer: {
      ru: `## В чём суть

\`merge\` и \`concat\` склеивают несколько готовых потоков в один. Разница в одном вопросе: **подписываемся на все источники сразу или по очереди**. \`merge\` запускает всех одновременно и пропускает значения по мере прихода, \`concat\` запускает следующий источник только после того, как предыдущий завершился.

Аналогия с трубами. \`merge\` — несколько труб **сливаются в одну**: вода из всех течёт одновременно и перемешивается. \`concat\` — трубы **соединены последовательно**: пока первая не опустела, вторая даже не открыта.

**Какую проблему решает.** В приложении постоянно нужно собрать несколько источников в один: кнопка «Сохранить», автосохранение и горячая клавиша \`Ctrl+S\` должны вызывать один и тот же обработчик; данные из кэша должны показаться раньше данных из сети; десять файлов нужно загрузить, но не больше трёх одновременно. Если склеить «не той» стратегией, получаются реальные баги: старый ответ перезаписывает новый, второй запрос не уходит никогда, сервер получает 1000 запросов разом. Выбор между \`merge\` и \`concat\` — это выбор между скоростью (параллельно) и порядком (последовательно).

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения: ответы сервера, клики, тики таймера. Ничего не делает, пока на него не подписались.
- **Подписка (\`subscribe\`)** — команда потоку «начинай работать». Для HTTP-потока именно в этот момент уходит запрос.
- **\`complete\` (завершение)** — сигнал «значений больше не будет». Ключевое событие для \`concat\` и \`forkJoin\`: они ждут именно его.
- **Холодный поток (cold Observable)** — поток, который начинает работу заново для каждого подписчика. HTTP-запрос в Angular холодный: нет подписки — нет запроса.
- **Горячий поток (hot Observable)** — поток, который работает независимо от подписчиков (\`Subject\`, события DOM). Кто подписался поздно, пропустил прошлые значения.
- **Функция создания (creation function)** — функция, которая из нескольких потоков делает новый: \`merge(a$, b$)\`, \`concat(a$, b$)\`, \`forkJoin([...])\`. В отличие от оператора, вызывается не внутри \`pipe\`.
- **Конкурентность (concurrency)** — сколько источников (или внутренних потоков) работают одновременно. У \`concat\` она равна 1, у \`merge\` по умолчанию бесконечна.
- **Чередование (interleaving)** — значения разных источников идут вперемешку, в порядке реального времени прихода.
- **Поток потоков (higher-order Observable)** — поток, каждое значение которого само является потоком. Например, клики, превращённые в HTTP-запросы через \`map\`.
- **Сплющивание (flattening)** — подписка на внутренние потоки и вывод их значений в один общий поток. Этим заняты \`mergeMap\`, \`concatMap\`, \`switchMap\`, \`exhaustMap\`.
- **\`forkJoin\`** — «\`Promise.all\` для потоков»: ждёт завершения всех и отдаёт последние значения одним массивом.
- **\`combineLatest\`** — при каждом изменении любого входа отдаёт свежую комбинацию последних значений всех входов.

## Как это работает под капотом

Механика \`merge(a$, b$, c$)\`:

1. При подписке \`merge\` сразу подписывается на **все** источники, поэтому все они начинают работу одновременно (все HTTP-запросы улетают в одну миллисекунду).
2. Каждое значение любого источника немедленно пробрасывается наружу, поэтому порядок определяет только время прихода — значения чередуются.
3. \`merge\` считает завершившиеся источники и вызывает \`complete\`, только когда завершились **все**. Поэтому один бесконечный вход делает весь \`merge\` бесконечным.
4. Ошибка любого источника сразу уходит наружу, а \`merge\` отписывается от остальных — общий поток мёртв.

Механика \`concat(a$, b$)\`:

1. При подписке \`concat\` подписывается **только на \`a$\`**. \`b$\` в этот момент не тронут: раз он холодный, его работа (например, запрос) ещё не началась.
2. Значения \`a$\` пробрасываются наружу как есть.
3. Когда \`a$\` вызвал \`complete\`, \`concat\` подписывается на \`b$\`, и только теперь стартует его работа.
4. Поэтому порядок источников сохраняется строго, но если \`a$\` бесконечен, до \`b$\` очередь **не дойдёт никогда**.
5. Ошибка в \`a$\` завершает весь \`concat\`: на \`b$\` никто так и не подпишется.

Упрощённо обе функции выглядят так (без обработки краевых случаев):

\`\`\`ts
// merge: подписаться на всех сразу, завершиться, когда завершатся все
function merge<T>(...sources: Observable<T>[]) {
  return new Observable<T>(subscriber => {
    let active = sources.length;
    const subs = sources.map(src => src.subscribe({
      next: v => subscriber.next(v),
      error: e => subscriber.error(e),
      complete: () => { if (--active === 0) subscriber.complete(); }
    }));
    return () => subs.forEach(s => s.unsubscribe());
  });
}

// concat: следующий источник — только после complete предыдущего
function concat<T>(...sources: Observable<T>[]) {
  return new Observable<T>(subscriber => {
    let index = 0;
    let current: Subscription | undefined;
    const subscribeNext = () => {
      if (index === sources.length) { subscriber.complete(); return; }
      current = sources[index++].subscribe({
        next: v => subscriber.next(v),
        error: e => subscriber.error(e),
        complete: subscribeNext          // вот и вся «очередь»
      });
    };
    subscribeNext();
    return () => current?.unsubscribe();
  });
}
\`\`\`

### Пример 1. Разница на таймерах

Возьмём два источника с разной скоростью: \`interval(ms)\` выдаёт 0, 1, 2… раз в \`ms\` миллисекунд, \`take(3)\` берёт три значения и завершает поток, \`map\` переименовывает значение.

\`\`\`ts
import { interval, map, take, merge, concat } from 'rxjs';

const a$ = interval(1000).pipe(map(i => 'A' + i), take(3)); // A0 A1 A2 — раз в секунду
const b$ = interval(400).pipe(map(i => 'B' + i), take(3));  // B0 B1 B2 — раз в 0.4 с

merge(a$, b$).subscribe(console.log);
// B0 B1 A0 B2 A1 A2 — оба таймера идут одновременно, порядок задаёт только время
// complete через ~3 с — когда завершился более долгий a$

concat(a$, b$).subscribe(console.log);
// A0 A1 A2 B0 B1 B2 — таймер b$ создан только после complete у a$
// complete через ~4.2 с — 3 с на a$ плюс 1.2 с на b$
\`\`\`

\`merge\` закончил за время самого долгого источника (3 с), \`concat\` — за сумму времён (4.2 с). Это и есть цена порядка.

### Пример 2. Ленивость \`concat\`: второй запрос даже не отправлен

Сделаем «фейковый запрос», который печатает момент своего старта:

\`\`\`ts
import { Observable, concat, merge } from 'rxjs';

const fakeRequest = (name: string, ms: number) => new Observable<string>(subscriber => {
  console.log(\`старт \${name}\`);
  const id = setTimeout(() => { subscriber.next(name); subscriber.complete(); }, ms);
  return () => clearTimeout(id);
});

concat(fakeRequest('кэш', 100), fakeRequest('сеть', 300)).subscribe(v => console.log('ответ', v));
// (в скобках — момент вывода от подписки)
// старт кэш     (0 мс)
// ответ кэш     (100 мс)
// старт сеть    (100 мс) ← стартовал только после complete «кэша»
// ответ сеть    (400 мс)

merge(fakeRequest('кэш', 100), fakeRequest('сеть', 300)).subscribe(v => console.log('ответ', v));
// старт кэш     (0 мс)
// старт сеть    (0 мс)   ← оба стартовали сразу
// ответ кэш     (100 мс)
// ответ сеть    (300 мс)
\`\`\`

\`concat\` не «прогревает» следующий источник заранее: для HTTP это значит, что параллелизма нет вообще. Если запросы независимы и нужна скорость, \`concat\` — неправильный выбор.

### Пример 3. Синхронные источники: \`merge\` выглядит как \`concat\`

\`\`\`ts
import { of, merge } from 'rxjs';

merge(of(1, 2), of(3, 4)).subscribe(console.log);
// 1 2 3 4
\`\`\`

\`of\` выдаёт значения синхронно, прямо во время подписки: \`of(1, 2)\` успевает отдать всё и завершиться раньше, чем \`merge\` дойдёт до второго источника. Это иллюзия порядка, а не гарантия — с асинхронными источниками значения будут чередоваться.

### Лимит конкурентности: \`merge(..., n)\`

Последний числовой аргумент \`merge\` ограничивает, сколько источников работают одновременно. Остальные ждут в очереди:

\`\`\`ts
merge(fakeRequest('r1', 300), fakeRequest('r2', 300), fakeRequest('r3', 300), 2).subscribe();
// старт r1 (0 мс)
// старт r2 (0 мс)
// старт r3 (300 мс) ← место освободилось, когда завершился r1
// complete через ~600 мс

merge(a$, b$, 1).subscribe(console.log);
// A0 A1 A2 B0 B1 B2 — лимит 1 превращает merge в concat
\`\`\`

Про этот аргумент часто забывают, хотя он спасает от сотни одновременных запросов.

### Ошибка в одном источнике

\`timer(ms)\` выдаёт одно значение через \`ms\` и завершается; \`throwError(() => err)\` создаёт поток, который сразу падает; \`catchError\` перехватывает ошибку и подставляет запасной поток.

\`\`\`ts
import { merge, timer, map, mergeMap, throwError, catchError, of } from 'rxjs';

const ok$   = timer(100).pipe(map(() => 'ok'));
const fail$ = timer(50).pipe(mergeMap(() => throwError(() => new Error('500'))));
const late$ = timer(200).pipe(map(() => 'late'));

merge(ok$, fail$, late$).subscribe({ next: console.log, error: e => console.log('error', e.message) });
// error 500 — ok и late так и не пришли: merge отписался от всех

merge(ok$, fail$.pipe(catchError(() => of('fallback'))), late$).subscribe(console.log);
// fallback, ok, late — ошибку погасили на конкретном входе, остальные живы
\`\`\`

Правило: если источники независимы, \`catchError\` ставится **на каждый вход**, а не на результат \`merge\`.

### \`defer\` и ловушка с Promise

\`concat\` и \`merge\` принимают не только Observable, но и Promise. Но Promise «горячий»: запрос стартует в момент создания промиса, а не при подписке. \`defer(() => ...)\` откладывает вызов фабрики до момента подписки:

\`\`\`ts
import { concat, defer } from 'rxjs';

concat(fetch('/api/a'), fetch('/api/b')).subscribe();
// оба запроса стартуют сразу — fetch вызван ещё при сборке аргументов

concat(defer(() => fetch('/api/a')), defer(() => fetch('/api/b'))).subscribe();
// /api/b стартует только после ответа /api/a — последовательность восстановлена
\`\`\`

### От merge к mergeMap, от concat к concatMap

\`merge\` и \`concat\` склеивают **уже готовые** потоки. Но часто поток **рождается из значения**: пришёл клик с \`id\` — нужно создать запрос за этим \`id\`. Обычный \`map\` даёт поток потоков:

\`\`\`ts
clicks$.pipe(map(id => this.http.get(\`/api/items/\${id}\`)));
// Observable<Observable<Item>> — снаружи летят не данные, а неподписанные запросы

clicks$.pipe(mergeMap(id => this.http.get(\`/api/items/\${id}\`)));
// Observable<Item> — оператор сам подписался на внутренний поток и отдал его значения
\`\`\`

Операторы с суффиксом \`Map\` делают два дела: \`map\` (значение → внутренний поток) плюс сплющивание. Стратегии сплющивания те же: \`mergeMap = map + mergeAll\`, \`concatMap = map + concatAll\`. Поэтому всё сказанное про \`merge\` и \`concat\` переносится на них один в один.

### mergeMap — внутренние потоки запускаются сразу

Пришло значение — внутренний поток создаётся и подписывается немедленно. \`delay(ms)\` сдвигает значение во времени и здесь имитирует ответ сервера разной скорости:

\`\`\`ts
import { of, mergeMap, delay } from 'rxjs';

const delays: Record<number, number> = { 1: 300, 2: 100, 3: 200 };

of(1, 2, 3).pipe(
  mergeMap(n => of(\`ответ \${n}\`).pipe(delay(delays[n])))
).subscribe(console.log);
// ответ 2, ответ 3, ответ 1 — все три «запроса» ушли сразу, первым вернулся самый быстрый
// всё завершилось через ~300 мс
\`\`\`

Боевой случай — независимые действия, которые нельзя ни терять, ни отменять (лайки, удаление строк). Второй аргумент ограничивает конкурентность, \`from(array)\` превращает массив в поток:

\`\`\`ts
// 100 файлов, но не больше 3 загрузок одновременно; mergeMap(fn, 1) — это concatMap
from(files).pipe(mergeMap(file => this.upload(file), 3)).subscribe();

// лайки: ошибку ловим ВНУТРИ, иначе один упавший запрос убьёт весь поток кликов
likeClicks$.pipe(mergeMap(id => this.api.like(id).pipe(catchError(() => EMPTY)))).subscribe();
\`\`\`

\`EMPTY\` — поток, который сразу завершается без значений: сбой одного лайка просто проглатывается.

### concatMap — внутренние потоки строго по очереди

Значение пришло, но внутренний поток для него создаётся **только после \`complete\` предыдущего**. До своей очереди значение ждёт в буфере:

\`\`\`ts
of(1, 2, 3).pipe(
  concatMap(n => of(\`ответ \${n}\`).pipe(delay(delays[n])))
).subscribe(console.log);
// ответ 1, ответ 2, ответ 3 — «запрос 2» ушёл только после «ответа 1»
// всё завершилось через ~600 мс: 300 + 100 + 200
\`\`\`

Главный боевой случай — запись на сервер, где порядок принципиален:

\`\`\`ts
// Автосохранение: каждый PUT уходит после ответа на предыдущий.
// С mergeMap старый PUT мог бы «обогнать» новый и перезаписать его на сервере.
form.valueChanges.pipe(
  debounceTime(500),                     // подождать паузу в 500 мс после последнего ввода
  concatMap(value => this.api.save(value))
).subscribe();
\`\`\`



### switchMap и exhaustMap — две другие стратегии

О них спросят следом, поэтому коротко. \`switchMap\` при новом значении **отменяет** незавершённый внутренний поток; \`exhaustMap\`, пока внутренний поток работает, **игнорирует** новые значения:

\`\`\`ts
of(1, 2, 3).pipe(switchMap(n => of(\`ответ \${n}\`).pipe(delay(100)))).subscribe(console.log);
// ответ 3 — запросы 1 и 2 отменены, выжил последний

of(1, 2, 3).pipe(exhaustMap(n => of(\`ответ \${n}\`).pipe(delay(100)))).subscribe(console.log);
// ответ 1 — пока шёл первый, 2 и 3 проигнорированы
\`\`\`

\`switchMap\` — для поиска и навигации (нужен только свежий ответ), \`exhaustMap\` — для защиты от двойного клика по «Оформить заказ».

### forkJoin — дождаться всех и получить результат один раз

\`forkJoin\` подписывается на все источники сразу (как \`merge\`), но наружу ничего не пропускает, пока **каждый** не завершится. Затем эмитит **один раз** массив (или объект) последних значений:

\`\`\`ts
forkJoin([a$, b$]).subscribe(console.log);
// ['A2', 'B2'] — один раз, через ~3 с; промежуточные A0, A1, B0, B1 наружу не попали

forkJoin({ user: this.http.get('/api/user'), settings: this.http.get('/api/settings') })
  .subscribe(({ user, settings }) => this.init(user, settings));
// оба запроса ушли параллельно; обработчик вызван один раз, когда пришли оба

forkJoin([]).subscribe({ next: console.log, complete: () => console.log('done') });
// done — пустой массив: complete сразу, без единого значения
\`\`\`

Источник без \`complete\` (\`interval\`, \`Subject\`, сокет) — и \`forkJoin\` молчит вечно. Ошибка в одном входе роняет весь результат, поэтому \`catchError(() => of(null))\` ставят на каждый вход.

### combineLatest — свежая комбинация при каждом изменении

Для бесконечных потоков вместо \`forkJoin\` берут \`combineLatest\`: он не ждёт \`complete\`, а пересчитывает результат при каждом изменении **любого** входа, как только у каждого есть хотя бы одно значение:

\`\`\`ts
combineLatest([a$, b$]).subscribe(console.log);
// ['A0','B1'] ['A0','B2'] ['A1','B2'] ['A2','B2']
// B0 потерялся: в момент B0 у a$ ещё не было значения
\`\`\`

Типичный случай — фильтры таблицы: \`combineLatest([search$, status$, page$])\` → новый запрос при изменении любого фильтра.

### Как выбрать

- **Несколько источников событий в один обработчик, порядок не важен** → \`merge\` (кнопка + автосохранение + горячая клавиша).
- **Строгая последовательность готовых шагов** → \`concat\` (кэш, потом сеть; анимация шага 1, потом шага 2).
- **Параллельно, но с ограничением** → \`merge(..., n)\` или \`mergeMap(fn, n)\`.
- **Значение порождает запрос, все запросы нужны, порядок не важен** → \`mergeMap\`.
- **Значение порождает запись, порядок важен** → \`concatMap\`.
- **Нужен только последний ответ** → \`switchMap\`; **игнорировать повторы, пока идёт текущий** → \`exhaustMap\`.
- **Несколько одноразовых запросов, ответы нужны вместе** → \`forkJoin\`.
- **Несколько живых состояний, нужна их актуальная комбинация** → \`combineLatest\`.

### Где это применяется на практике

- **Единая точка сохранения формы**: \`merge(saveClick$, autosave$, hotkey$)\` в один \`concatMap(save)\` — все триггеры в одном месте, а записи не обгоняют друг друга.
- **Stale-while-revalidate в справочниках**: \`concat(fromCache$, fromNetwork$)\` — пользователь сразу видит старые данные, потом свежие.
- **Массовые операции в больших таблицах**: удаление 200 выбранных строк через \`from(ids).pipe(mergeMap(del, 5))\` — быстро, но без DDoS собственного бэкенда.
- **Загрузка страницы-дашборда**: \`forkJoin\` пользователя, прав и справочников перед отрисовкой.
- **Фильтры и пагинация грида**: \`combineLatest\` фильтров + \`switchMap\` к API.
- **Очередь уведомлений** через \`concatMap\`: следующий тост показывается после закрытия предыдущего.

## Важные нюансы и подводные камни

- **Бесконечный первый источник в \`concat\`.** Второй не выполнится никогда — самая частая ошибка. Например, \`concat(store.select(...), http$)\`: селектор стора не завершается.
- **Ждать порядка от \`merge\`.** Его нет: порядок определяется временем прихода. Синхронные источники лишь создают иллюзию порядка.
- **\`concat\` не запускает следующий источник заранее.** Если это HTTP, запрос уйдёт только после завершения предыдущего — параллелизма нет, общее время равно сумме.
- **\`concat\` с горячим источником теряет значения.** В \`concat(init$, clicks$)\` клики, сделанные до завершения \`init$\`, пропадут: на \`clicks$\` ещё никто не подписан.
- **Promise в \`concat\` стартует сразу.** Промис выполняется при создании; оборачивайте в \`defer(() => ...)\`.
- **\`merge\` с ошибкой в одном источнике** роняет весь объединённый поток; нужен \`catchError\` на каждом входе.
- **\`merge\` завершается только после всех.** Один бесконечный вход (\`fromEvent\`, \`interval\`) — и \`complete\` не придёт, а \`finalize\` после \`merge\` не сработает, пока не отпишетесь.
- **\`merge\` умеет ограничивать конкурентность** последним аргументом-числом — про это забывают.
- **\`mergeMap\` для поиска-подсказки** — гонка ответов: ответ на «ab» может прийти после ответа на «abc» и перерисовать список устаревшими данными. Для чтения по вводу нужен \`switchMap\`.
- **\`mergeMap\` без лимита на большой массив.** \`from(ids).pipe(mergeMap(load))\` для 1000 id даёт 1000 параллельных запросов; ставьте второй аргумент.
- **\`concatMap\` с внутренним потоком без \`complete\`.** Очередь встанет навсегда, следующие значения останутся в буфере. Буфер растёт и тогда, когда значения приходят быстрее, чем обрабатываются.
- **\`forkJoin\` с источником без \`complete\`** (\`Subject\`, \`interval\`, сокет) не эмитит никогда; для живых потоков нужен \`combineLatest\`.
- **\`forkJoin\` и ошибка в одном входе** — падает весь результат, остальные ответы теряются; \`catchError\` ставится на каждый вход.
- **\`concat\` против \`forkJoin\`.** \`concat\` отдаёт **все** значения по очереди, \`forkJoin\` — только **последние** и разом.

**Плюсы:** декларативно описывают стратегию конкурентности одним словом; одинаковая логика для готовых потоков (\`merge\`/\`concat\`) и порождаемых (\`mergeMap\`/\`concatMap\`); \`merge\` даёт скорость, \`concat\` — гарантированный порядок.
**Минусы:** \`merge\` не гарантирует порядок и без лимита легко перегружает сервер; \`concat\` медленный и зависает на бесконечном источнике; ошибка в одном входе убивает весь результат, если не ловить её на каждом входе.

## Как это спрашивают на собеседовании

**Главный вывод:** \`merge\` подписывается на всё сразу и отдаёт значения по времени прихода; \`concat\` подписывается по очереди, следующий источник — только после \`complete\` предыдущего. \`mergeMap\` и \`concatMap\` — те же стратегии для потоков, порождённых из значений.

Типичные формулировки: «Чем \`merge\` отличается от \`concat\`?», «Как выполнить запросы последовательно?», «Почему второй запрос в \`concat\` не уходит?», «Как загрузить 100 файлов, но не больше трёх одновременно?».

Что могут спросить следом:

- *Чем \`concat\` отличается от \`forkJoin\`?* — \`concat\` отдаёт все значения последовательно, \`forkJoin\` запускает всё параллельно и отдаёт только последние значения одним массивом.
- *Когда \`merge\` завершается?* — Когда завершились все источники; ошибка любого завершает его сразу.
- *Как превратить \`merge\` в \`concat\`?* — Лимит конкурентности 1: \`merge(a$, b$, 1)\` или \`mergeMap(fn, 1)\`.
- *Что выбрать для автосохранения формы?* — \`concatMap\`: запросы не обгоняют друг друга, порядок записей сохраняется.
- *А для поиска?* — \`switchMap\`: старый запрос отменяется, гонки ответов нет.

### Ответ на 1 минуту

> \`merge\` подписывается на все источники сразу и пропускает значения по мере прихода, поэтому они чередуются, а общий поток завершается, когда завершились все входы. Так я свожу несколько источников событий в один обработчик — например, клик «Сохранить», автосохранение и горячую клавишу. \`concat\` подписывается строго по очереди: следующий источник стартует только после \`complete\` предыдущего, поэтому порядок гарантирован, но параллелизма нет — это для сценариев вроде «сначала кэш, потом сеть». Главная ловушка: если первый источник в \`concat\` бесконечен, до второго очередь не дойдёт никогда. Ещё у \`merge\` есть лимит конкурентности последним аргументом, а с лимитом 1 он ведёт себя как \`concat\`. И те же стратегии живут в \`mergeMap\` и \`concatMap\`: первый — для независимых параллельных запросов, второй — для записей на сервер, где важен порядок.`,
      en: `## In short

Both glue several existing streams into one. The difference is whether you **subscribe to them all at once or one at a time**.

The plumbing analogy: \`merge\` is several pipes **feeding one**, everything flowing simultaneously and interleaved. \`concat\` is pipes **connected end to end**: until the first one runs dry, the second does not even open.

The same two strategies live inside \`mergeMap\` and \`concatMap\`, where they are applied to streams created from values. The third neighbour is \`forkJoin\`: it subscribes to everything at once like \`merge\`, but hands out only the last values, once. The breakdown with examples is below.

## How it works, step by step

1. \`merge(a$, b$, c$)\` subscribes to **all** sources immediately.
2. Values fly into the combined stream **as they arrive** — the order is decided purely by timing (interleaved).
3. The combined stream completes when **all** sources have completed.
4. \`concat(a$, b$)\` subscribes **only to \`a$\`**. At that moment \`b$\` has not even started (it is cold, so no request has been made).
5. As soon as \`a$\` calls \`complete()\`, \`b$\` is subscribed.
6. Source order is strictly preserved. If \`a$\` is infinite, \`b$\` is **never** reached.

## Example

\`\`\`ts
// merge: events from different places into one handler
merge(saveClicks$, autoSave$, hotkeySave$).subscribe(triggerSave);

// concat: show the local cache first, then replace with server data
concat(cache$, network$).subscribe(render);
\`\`\`

Why: the button, the autosave, and the hotkey do not care who goes first — they must be listened to simultaneously, so \`merge\`. In the "cache then network" pair the order is the whole point: paint the stale data instantly, then refresh it, so \`concat\`.

## merge and concat on timers

To see the difference with your own eyes, take two sources with different speeds:

\`\`\`ts
const a$ = interval(1000).pipe(map(i => 'A' + i), take(3)); // A0 A1 A2 — once a second
const b$ = interval(400).pipe(map(i => 'B' + i), take(3));  // B0 B1 B2 — every 0.4 s

merge(a$, b$).subscribe(console.log);
// B0 B1 A0 B2 A1 A2 — both timers run at the same time, only timing decides the order
// completes after ~3 s — when the slower a$ is done

concat(a$, b$).subscribe(console.log);
// A0 A1 A2 B0 B1 B2 — the b$ timer was created only after a$ completed
// completes after ~4.2 s — 3 s for a$ plus 1.2 s for b$

merge(a$, b$, 1).subscribe(console.log);
// A0 A1 A2 B0 B1 B2 — a concurrency limit of 1 turns merge into concat
\`\`\`

## From merge to mergeMap, from concat to concatMap

\`merge\` and \`concat\` glue **ready-made** streams. In real code a stream is often **born from a value**: a click arrives with an \`id\`, and you need to create an HTTP request for that \`id\`. A plain \`map\` gives you a "stream of streams", which is awkward to subscribe to:

\`\`\`ts
clicks$.pipe(map(id => this.http.get(\`/api/items/\${id}\`)));
// Observable<Observable<Item>> — what comes out is not data but unsubscribed requests

clicks$.pipe(mergeMap(id => this.http.get(\`/api/items/\${id}\`)));
// Observable<Item> — the operator subscribed to the inner stream itself and passed its values out
\`\`\`

The \`*Map\` operators do two jobs: \`map\` (value → inner stream) plus "flattening" the inner streams into one. The only question is **how** to flatten, and there are exactly the same two options: \`mergeMap = map + mergeAll\`, \`concatMap = map + concatAll\`.

### mergeMap — start every inner stream right away

A value arrives, and its inner stream is created and subscribed **immediately**, without waiting for the previous ones. Results come out as they are ready; order is not guaranteed:

\`\`\`ts
const delays: Record<number, number> = { 1: 300, 2: 100, 3: 200 };

of(1, 2, 3).pipe(
  mergeMap(n => of(\`answer \${n}\`).pipe(delay(delays[n])))
).subscribe(console.log);
// answer 2, answer 3, answer 1 — all three "requests" went out at once, the fastest came back first
// everything completed after ~300 ms
\`\`\`

The typical production case is independent actions where nobody cares who answers first, but none may be lost:

\`\`\`ts
// Every "like" click is its own request. No reason to wait for the previous one, no reason to cancel it
likeClicks$.pipe(
  mergeMap(postId => this.api.like(postId).pipe(
    catchError(() => EMPTY)              // one failed like must not kill the whole feed
  ))
).subscribe(res => this.showToast(res));
\`\`\`

The second argument caps the number of simultaneous inner streams; the rest wait in a queue:

\`\`\`ts
// 100 files, but no more than 3 uploads at a time
from(files).pipe(
  mergeMap(file => this.upload(file), 3)
).subscribe();
// mergeMap(fn, 1) is exactly concatMap
\`\`\`

When to use: parallel independent operations — likes, deleting several rows, sending metrics, parallel uploads with a cap. Do not use it for type-ahead search: the response to an old request can arrive after the new one and repaint the list with stale data — that is \`switchMap\` territory.

### concatMap — inner streams strictly one at a time

A value arrives, but its inner stream is created **only after the previous one completes**. Until its turn comes, the value simply waits in a buffer. Order is preserved, nothing is lost:

\`\`\`ts
of(1, 2, 3).pipe(
  concatMap(n => of(\`answer \${n}\`).pipe(delay(delays[n])))
).subscribe(console.log);
// answer 1, answer 2, answer 3 — "request 2" went out only after "answer 1"
// everything completed after ~600 ms: 300 + 100 + 200
\`\`\`

Production case number one is **writing to the server**, where order is the whole point:

\`\`\`ts
// Form autosave: each PUT goes out after the response to the previous one.
// With mergeMap an old PUT could "overtake" a newer one and overwrite it on the server
formChanges$.pipe(
  debounceTime(500),
  concatMap(value => this.api.save(value))
).subscribe();
\`\`\`

Number two is anything that must be **shown one at a time**:

\`\`\`ts
// Notifications in a queue: the next appears once the previous has been dismissed.
// show() returns an Observable that completes when the toast closes
notifications$.pipe(
  concatMap(msg => this.toast.show(msg))
).subscribe();
\`\`\`

When to use: mutating operations (create/update/delete of one entity), step-by-step scenarios, display queues. The price is speed: a slow inner stream builds a backlog behind it, and an inner stream that **never completes** stalls the queue forever — exactly the same trap as an infinite first source in \`concat\`.

### For the full picture: switchMap and exhaustMap

Flattening has two more strategies, and they are the next question:

\`\`\`ts
// switchMap: a new value CANCELS the unfinished inner stream
searchInput$.pipe(
  switchMap(q => this.api.search(q))   // type "ab", then "abc" — the request for "ab" is cancelled
).subscribe(list => this.render(list));

// exhaustMap: while an inner stream is running, new values are IGNORED
submitClicks$.pipe(
  exhaustMap(() => this.api.submitOrder(form))   // a double click does not submit the order twice
).subscribe();
\`\`\`

## forkJoin — the third way to glue ready-made streams

\`forkJoin\` is "\`Promise.all\` for streams". It subscribes to all sources at once (like \`merge\`), but lets nothing out until **every** one of them completes. Then it emits **once** an array (or an object) of the last values and completes:

\`\`\`ts
forkJoin([a$, b$]).subscribe(console.log);
// ['A2', 'B2'] — once, after ~3 s, when the slower a$ has completed
// the intermediate A0, A1, B0, B1 never made it out

forkJoin({ user: this.http.get('/api/user'), settings: this.http.get('/api/settings') })
  .subscribe(({ user, settings }) => this.init(user, settings));
// both requests went out in parallel; the handler is called once, when both have arrived
\`\`\`

Three rules people get caught on:

\`\`\`ts
// 1. A source that never completes → forkJoin NEVER emits
forkJoin([this.http.get('/api/a'), interval(1000)]).subscribe(console.log);   // silence forever

// 2. An error in one input → the whole forkJoin errors, the other responses are lost
forkJoin([
  this.http.get('/api/a').pipe(catchError(() => of(null))),   // catch on every input
  this.http.get('/api/b').pipe(catchError(() => of(null)))
]).subscribe(([a, b]) => this.render(a, b));                   // [null, {...}] instead of a crash

// 3. An empty array → completes immediately, without a single value
forkJoin([]).subscribe({ next: console.log, complete: () => console.log('done') }); // done
\`\`\`

For infinite streams take \`combineLatest\` instead: it does not wait for completion and recomputes the result whenever **any** input changes:

\`\`\`ts
combineLatest([a$, b$]).subscribe(console.log);
// ['A0','B1'] ['A0','B2'] ['A1','B2'] ['A2','B2'] — once every input has at least one value, a pair on every change
\`\`\`

When to use: several **one-shot** requests whose results are needed together — page bootstrap (user + reference data), saving several entities before navigating away. Not for infinite streams — they never complete, so \`forkJoin\` stays silent.

## Side by side

- **\`merge\` / \`mergeMap\`** — everything in parallel, order by response time, every value comes out.
- **\`merge(…, n)\` / \`mergeMap(fn, n)\`** — parallel, but at most n at a time.
- **\`concat\` / \`concatMap\`** — strictly one at a time, order preserved, nothing lost, but slower.
- **\`forkJoin\`** — parallel, but only the last values come out, once, after every input completes.
- **\`combineLatest\`** — parallel, a fresh combination on every change, does not wait for completion.
- **\`switchMap\`** — new cancels old: reads, search, navigation.
- **\`exhaustMap\`** — old blocks new: protection against double submit.

## What to say in the interview

> \`merge\` subscribes to all sources at once and emits values as they arrive, so emissions interleave, and the combined stream completes when every input has completed — that is how you funnel several event sources into one handler. \`concat\` subscribes to sources strictly in order: the next starts only after the previous completes, so source order is preserved, which makes it the right choice for sequential steps like "cache first, then network". The key nuance is that if the first source in a \`concat\` is infinite, the second is never reached — a common bug. And a useful mnemonic: \`mergeMap\` is to \`merge\` what \`concatMap\` is to \`concat\` — the very same concurrency strategies, just applied to higher-order projection where inner streams are created from outer values.

## Gotchas

- **An infinite first source in \`concat\`** — the second one never runs. The most common mistake.
- **Expecting ordering from \`merge\`** — there is none; the order is purely the arrival order.
- **\`concat\` does not warm up the second source** — if it is HTTP, the request only goes out after the first completes, so there is no parallelism.
- **An error in one \`merge\` input** kills the whole combined stream; you need \`catchError\` on each input.
- **\`merge\` can cap concurrency** with a numeric second argument — people forget this exists.
- **\`mergeMap\` for type-ahead search** — a response race: an old response can arrive after the new one and repaint the list. For "reading" requests driven by input use \`switchMap\`.
- **\`mergeMap\` without a cap on a big array** — \`from(ids).pipe(mergeMap(load))\` for 1000 ids fires 1000 parallel requests; pass the second argument.
- **\`concatMap\` with an inner stream that never \`complete\`s** — the queue stalls forever, the following values stay in the buffer.
- **\`forkJoin\` with a source that never \`complete\`s** (Subject, interval, socket) — never emits; infinite streams need \`combineLatest\`.
- **\`forkJoin\` and an error in one input** — the whole result fails, the other responses are lost; put \`catchError\` on every input.
- **Follow-up question**: how does \`concat\` differ from \`forkJoin\`? \`concat\` delivers **all** values in sequence; \`forkJoin\` delivers only the **last** ones, all at once.`
    }
  },
  {
    id: 'rxjs-009',
    category: 'rxjs',
    level: 'Hard',
    tags: ['error-handling', 'catcherror', 'retry'],
    question: {
      ru: 'Как работает обработка ошибок в RxJS? Объясните catchError, retry и перезапуск потока.',
      en: 'How does error handling work in RxJS? Explain catchError, retry, and restarting a stream.'
    },
    answer: {
      ru: `## В чём суть

Ошибка в RxJS — это **терминальное событие**: после неё поток мёртв. Не будет ни следующих значений, ни \`complete\`, подписка закрывается и запускает очистку. Чтобы поток «пережил» ошибку, её перехватывают оператором \`catchError\` (подставить запасной поток) или \`retry\` (переподписаться и попробовать заново).

Аналогия: поток — это **конвейер**, а ошибка — аварийный рубильник. Дёрнули — лента встала навсегда, запустить её снова нельзя. \`catchError\` — это **запасной конвейер**, который вы подкатываете вместо сломанного: продукция дальше идёт уже с него. \`retry\` — «перезапустить весь цех с начала»: старую ленту выбрасывают и собирают новую такую же.

**Какую проблему решает.** В Angular-приложении многие потоки живут долго: поиск по вводу, эффекты NgRx, подписка на изменения фильтров грида. Одна ошибка сервера в таком потоке без обработки убивает его навсегда — поиск перестаёт искать, эффект перестаёт реагировать на действия, и никто этого не замечает до жалобы пользователя. Правильная обработка ошибок отвечает на три вопроса: как восстановиться (подставить данные или пустоту), как повторить (временный сбой сети) и где перехватывать, чтобы не убить весь поток.

## Словарик терминов

- **Уведомление \`error\`** — один из трёх сигналов потока (наряду с \`next\` и \`complete\`): «поток упал, вот причина».
- **Терминальное событие** — событие, после которого поток окончательно закрыт. Терминальных два: \`error\` и \`complete\`.
- **Teardown (функция очистки)** — код, который выполняется при закрытии подписки: остановить таймер, отменить HTTP-запрос.
- **\`catchError\`** — оператор, который перехватывает ошибку и **заменяет** упавший поток новым, который вы вернули.
- **Fallback (запасное значение)** — то, что показываем вместо данных при ошибке: пустой список, \`null\`, данные из кэша.
- **\`throwError(() => err)\`** — функция создания потока, который при подписке сразу падает с указанной ошибкой. Нужен, чтобы пробросить ошибку дальше.
- **\`EMPTY\`** — поток, который сразу завершается, не выдав ни одного значения.
- **\`retry\`** — оператор, который при ошибке не пропускает её дальше, а **переподписывается** на источник.
- **Переподписка (resubscribe)** — отписаться от упавшего источника и подписаться на него заново. Для холодного потока это повтор всей работы.
- **Холодный поток (cold Observable)** — поток, который выполняет работу заново для каждой подписки. \`HttpClient.get()\` холодный: каждая подписка — новый HTTP-запрос.
- **Higher-order оператор** — оператор, который из каждого значения создаёт внутренний поток и подписывается на него: \`switchMap\`, \`mergeMap\`, \`concatMap\`, \`exhaustMap\`.
- **Идемпотентная операция** — операция, повтор которой не меняет результат: \`GET\` или \`PUT\` одних и тех же данных. \`POST\` «создать заказ» не идемпотентен — повтор создаст второй заказ.
- **\`ErrorHandler\`** — глобальный обработчик Angular, куда попадают все необработанные ошибки приложения.

## Как это работает под капотом

Путь ошибки по шагам:

1. Ошибка возникает: источник вызывает \`subscriber.error(e)\`, или ваш код бросает исключение внутри оператора (\`map\`, \`filter\`, \`tap\`) — RxJS ловит \`throw\` и превращает его в уведомление \`error\`.
2. Ошибка идёт **вниз** по цепочке операторов, к подписчику. Каждый оператор на пути закрывает свою подписку, поэтому срабатывает teardown всех вышестоящих звеньев (например, отменяется HTTP-запрос).
3. Поток помечается закрытым, поэтому всё, что источник вызовет после ошибки (\`next\`, \`complete\`), просто игнорируется.
4. Если на пути стоит \`catchError(fn)\`, он не пропускает ошибку дальше, а вызывает \`fn(err)\` и **подписывается на поток, который она вернула**. Подписчик ниже продолжает получать значения, но уже из нового потока: старый источник мёртв и не оживёт.
5. Если на пути стоит \`retry\`, он тоже не пропускает ошибку, а подписывается на источник **заново**. Раз источник холодный, вся работа выполняется ещё раз — со всеми побочными эффектами.
6. Если попытки \`retry\` кончились, ошибка идёт дальше вниз, как обычно.
7. Если ошибку не перехватил никто и у подписчика нет колбэка \`error\`, RxJS считает её необработанной и бросает **асинхронно** (через \`setTimeout\`). В браузере это глобальная ошибка, и Angular передаёт её в \`ErrorHandler\` — через Zone.js или, в zoneless-приложении, через \`provideBrowserGlobalErrorListeners()\`.

Упрощённо оба оператора устроены так:

\`\`\`ts
function catchError<T>(selector: (err: unknown) => Observable<T>) {
  return (source: Observable<T>) => new Observable<T>(subscriber => {
    let replacement: Subscription | undefined;
    const main = source.subscribe({
      next: v => subscriber.next(v),
      complete: () => subscriber.complete(),
      error: err => { replacement = selector(err).subscribe(subscriber); } // подменили поток
    });
    return () => { main.unsubscribe(); replacement?.unsubscribe(); };
  });
}

function retry<T>(count: number) {
  return (source: Observable<T>) => new Observable<T>(subscriber => {
    let attempts = 0;
    let current: Subscription;
    const subscribeToSource = () => {
      current = source.subscribe({
        next: v => subscriber.next(v),
        complete: () => subscriber.complete(),
        error: err => attempts++ < count ? subscribeToSource() : subscriber.error(err)
      });
    };
    subscribeToSource();
    return () => current.unsubscribe();
  });
}
\`\`\`

### Пример 1. После ошибки поток мёртв

\`\`\`ts
import { Observable } from 'rxjs';

new Observable<number>(subscriber => {
  subscriber.next(1);
  subscriber.error(new Error('boom'));
  subscriber.next(2);       // проигнорировано
  subscriber.complete();    // проигнорировано
  return () => console.log('teardown');
}).subscribe({
  next: v => console.log('next', v),
  error: e => console.log('error', e.message),
  complete: () => console.log('complete')
});
// next 1
// error boom
// teardown
\`\`\`

\`complete\` не вызвался: у потока бывает только один финал. Исключение внутри оператора ведёт себя так же — \`map(n => { if (n === 2) throw new Error('плохое значение 2'); return n * 10; })\` на \`of(1, 2, 3)\` выдаст \`next 10\`, затем \`error плохое значение 2\`, а тройка уже не обработается.

### catchError: три способа ответить на ошибку

Функция внутри \`catchError\` обязана вернуть новый поток. От того, какой поток вы вернёте, зависит, что увидит подписчик:

\`\`\`ts
import { of, map, catchError, EMPTY, throwError } from 'rxjs';

const broken$ = of(1, 2, 3).pipe(
  map(n => { if (n === 2) throw new Error('bad 2'); return n; })
);

// 1) Восстановиться запасным значением
broken$.pipe(catchError(() => of(-1))).subscribe(console.log);
// 1, -1, затем complete

// 2) Тихо завершиться
broken$.pipe(catchError(() => EMPTY)).subscribe(console.log);
// 1, затем complete

// 3) Залогировать и пробросить дальше
broken$.pipe(
  catchError(err => {
    console.log('лог:', err.message);
    return throwError(() => err);
  })
).subscribe({ next: console.log, error: e => console.log('error', e.message) });
// 1, лог: bad 2, error bad 2
\`\`\`

Обратите внимание: даже при восстановлении тройка не пришла. \`catchError\` не «продолжает» сломанный поток — он заменяет его остаток запасным.

### \`throwError\`: почему с фабрикой

\`throwError(() => err)\` создаёт поток, который при подписке вызывает фабрику и падает с её результатом. Форма \`throwError(err)\` со значением в RxJS 7 помечена устаревшей и будет удалена в v8. Смысл фабрики: ошибка создаётся в момент подписки, поэтому \`throwError(() => new Error('Нет доступа'))\` даёт каждому подписчику свежий объект ошибки со стеком из момента сбоя, а не из момента сборки цепочки. Если же вы просто пробрасываете уже пойманную ошибку, \`() => err\` передаёт тот же объект с его исходным стеком.

### \`EMPTY\` против \`of(null)\`

\`\`\`ts
throwError(() => new Error('x')).pipe(catchError(() => of(null))).subscribe(console.log);
// null, затем complete

throwError(() => new Error('x')).pipe(catchError(() => EMPTY)).subscribe(console.log);
// только complete — ни одного значения
\`\`\`

\`of(null)\` выдаёт значение, и подписчик должен уметь его обработать (например, показать «нет данных»). \`EMPTY\` просто завершает поток: в \`next\` ничего не придёт, а \`forkJoin\` с таким входом не выдаст результат вовсе.

### Где ставить catchError — это критично

Правило: **\`catchError\` внутри higher-order оператора спасает внешний поток; снаружи — убивает его**. Проверим на потоке кликов, где запрос за id 2 падает:

\`\`\`ts
import { Subject, of, throwError, mergeMap, catchError } from 'rxjs';

const clicks$ = new Subject<number>();
const api = (id: number) => id === 2 ? throwError(() => new Error('500')) : of('item' + id);

// ПЛОХО: catchError на внешнем потоке
clicks$.pipe(
  mergeMap(id => api(id)),
  catchError(() => of('fallback'))
).subscribe(console.log);
// item1, fallback — и поток ЗАВЕРШЁН: клик 3 уже никто не обработает

// ХОРОШО: catchError на внутреннем запросе
clicks$.pipe(
  mergeMap(id => api(id).pipe(catchError(() => of('fallback ' + id))))
).subscribe(console.log);
// item1, fallback 2, item3 — упала только одна итерация

clicks$.next(1); clicks$.next(2); clicks$.next(3);
\`\`\`

Почему так: во внешнем варианте ошибка внутреннего запроса проходит через \`mergeMap\` наружу и убивает \`clicks$\`-цепочку, а \`catchError\` подменяет её «одноразовым» \`of('fallback')\`. Во внутреннем — ошибка гасится раньше, чем дойдёт до \`mergeMap\`, и внешний поток о ней даже не узнаёт.

### Реальный случай: эффект NgRx

Эффект — это долгоживущий поток действий (actions). Ошибка на уровне эффекта убивает его, и приложение перестаёт реагировать на это действие:

\`\`\`ts
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(UsersActions.load),
    switchMap(() => this.api.getUsers().pipe(
      map(users => UsersActions.loadSuccess({ users })),
      catchError(error => of(UsersActions.loadFailure({ error })))  // ✅ внутри
    ))
  )
);
\`\`\`

Современный NgRx по умолчанию переподписывает эффект после необработанной ошибки (ограниченное число раз), но это страховка, а не замена правильному \`catchError\` внутри.

### retry — повторить всю работу

Чтобы посчитать попытки, сделаем источник, который падает дважды, а на третий раз отвечает:

\`\`\`ts
import { Observable, retry } from 'rxjs';

let attempt = 0;
const flaky$ = new Observable<string>(subscriber => {
  attempt++;
  console.log('попытка', attempt);
  if (attempt < 3) subscriber.error(new Error('сбой ' + attempt));
  else { subscriber.next('ok'); subscriber.complete(); }
});

flaky$.pipe(retry(3)).subscribe({ next: console.log, error: e => console.log('error', e.message) });
// попытка 1
// попытка 2
// попытка 3
// ok
\`\`\`

Код внутри \`new Observable\` выполнился трижды — это и есть переподписка. С \`HttpClient\` каждая попытка — новый реальный HTTP-запрос. Если бы сбоев было больше трёх, подписчик получил бы последнюю ошибку: \`retry(2)\` на всегда падающем источнике даст три попытки и \`error\` с текстом третьей.

### retry с паузой: \`retry({ count, delay })\`

Повторять мгновенно бессмысленно — сервер не успеет подняться. \`retry\` принимает объект настроек: \`count\` — максимум повторов, \`delay\` (появился в RxJS 7.3) — число миллисекунд или функция \`(error, retryCount) => Observable\`, первая эмиссия которого запускает повтор; \`retryCount\` начинается с 1. \`timer(ms)\` выдаёт одно значение через \`ms\`:

\`\`\`ts
import { retry, timer, catchError, of, throwError } from 'rxjs';

this.api.load().pipe(
  retry({
    count: 3,
    delay: (err, retryCount) => timer(2 ** retryCount * 500) // 1000, 2000, 4000 мс
  }),
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // восстановились
    return throwError(() => err);                    // пробросили дальше
  })
);
\`\`\`

Сначала три попытки с растущей паузой, и только если всё равно не вышло — решаем, восстановиться или пробросить. Эта форма заменила устаревший \`retryWhen\`. Порядок операторов важен: \`catchError\` **перед** \`retry\` проглотит ошибку, и \`retry\` её никогда не увидит — повторов не будет.

### Перезапуск потока: второй аргумент \`catchError\` и \`repeat\`

Функция в \`catchError\` получает вторым аргументом \`caught\` — сам поток вместе с этим \`catchError\`. Вернуть его — значит переподписаться с начала:

\`\`\`ts
flaky$.pipe(catchError((err, caught) => caught)).subscribe(console.log);
// попытка 1, попытка 2, попытка 3, ok
\`\`\`

По сути это \`retry()\` без лимита, только менее очевидный — в живом коде предпочитайте \`retry({ count, delay })\`. Родственный оператор \`repeat\` переподписывается не на \`error\`, а на \`complete\` — им делают опрос сервера: \`repeat({ delay: 5000 })\`.

### Ошибка в своём колбэке \`next\` — не туда, куда вы думаете

\`\`\`ts
of(1).subscribe({
  next: () => { throw new Error('ошибка в обработчике'); },
  error: e => console.log('сюда не придёт')
});
// колбэк error НЕ вызван; ошибка брошена асинхронно как необработанная
\`\`\`

Колбэк \`error\` ловит ошибки **потока**, а не вашего кода в \`next\`. Такая ошибка уходит в глобальный обработчик (в Angular — в \`ErrorHandler\`). Поэтому логику, которая может упасть, держат в операторах (\`map\`, \`tap\`) до \`catchError\`, а не в \`subscribe\`.

### Где это применяется на практике

- **HTTP-слой**: функциональный интерсептор с \`retry({ count: 2, delay })\` для \`GET\` и сетевых сбоев плюс \`catchError\`, который превращает 401 в редирект на логин.
- **Эффекты NgRx и сервисы состояния**: \`catchError\` внутри \`switchMap\`, возвращающий action ошибки, — чтобы эффект жил дальше.
- **Поиск и фильтры грида**: ошибка одного запроса показывает «не удалось загрузить», но следующий ввод снова работает.
- **Дашборды из нескольких виджетов**: \`catchError(() => of(null))\` на каждом запросе в \`forkJoin\`, чтобы один упавший виджет не ломал всю страницу.
- **Глобальный \`ErrorHandler\`**: отправка необработанных ошибок в Sentry или аналог.

## Важные нюансы и подводные камни

- **\`catchError\` снаружи \`switchMap\`/\`mergeMap\`.** Поток умирает после первой ошибки — классика «мёртвых» эффектов NgRx и поиска, который перестал искать.
- **\`catchError\`, который ничего не возвращает.** TypeScript ругнётся, а в рантайме вместо восстановления придёт новая ошибка \`TypeError: You provided 'undefined' where a stream was expected\` — проверено на RxJS 7.8.
- **\`retry\` на неидемпотентной операции.** \`POST\` «создать заказ» с \`retry(3)\` — до четырёх заказов: запрос мог дойти до сервера, а упал только ответ.
- **\`retry\` без \`count\`.** \`retry()\` повторяет бесконечно; без паузы на постоянно падающем сервере это DDoS собственного бэкенда.
- **\`return of(null)\` вместо \`EMPTY\`.** \`of(null)\` эмитит значение, \`EMPTY\` просто завершает поток — подписчик и \`forkJoin\` ведут себя по-разному.
- **\`catchError\` перед \`retry\`.** Ошибка уже погашена, повторов не будет.
- **\`retry\` повторяет весь источник выше себя.** Все \`tap\` с побочными эффектами (логи, аналитика, изменение состояния) выполнятся заново на каждой попытке.
- **Необработанная ошибка не бросается синхронно.** \`try/catch\` вокруг \`subscribe()\` её не поймает: RxJS 7 выбрасывает её асинхронно, в отдельной задаче.
- **\`throwError(err)\` со значением устарел.** Пишите \`throwError(() => err)\`: форма со значением будет удалена в RxJS 8, а фабрика создаёт ошибку в момент подписки.
- **\`finalize\` срабатывает и при ошибке.** Сброс спиннера кладут туда, а не в \`complete\` и не в \`catchError\`.

**Плюсы:** ошибки — часть потока, поэтому их можно перехватить, заменить, повторить и залогировать декларативно, в одном месте цепочки; \`retry({ count, delay })\` даёт повтор с паузой в одну строку.
**Минусы:** ошибка терминальна, и неверно поставленный \`catchError\` молча убивает долгоживущий поток; \`retry\` повторяет все побочные эффекты; ошибки в колбэках \`subscribe\` уходят мимо \`catchError\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`error\` — терминальное событие. \`catchError\` заменяет упавший поток новым (восстановиться или пробросить), \`retry\` переподписывается на источник. \`catchError\` для долгоживущих потоков ставят **внутри** higher-order оператора.

Типичные формулировки: «Как обработать ошибку HTTP-запроса в RxJS?», «Почему эффект перестал срабатывать после первой ошибки?», «Чем \`catchError\` отличается от \`retry\`?», «Как повторить запрос с задержкой?».

Что могут спросить следом:

- *Что должна вернуть функция в \`catchError\`?* — Новый Observable: \`of(fallback)\`, \`EMPTY\` или \`throwError(() => err)\`.
- *Чем \`retry\` отличается от \`repeat\`?* — \`retry\` переподписывается на \`error\`, \`repeat\` — на \`complete\`.
- *Почему \`throwError(() => err)\`, а не \`throwError(err)\`?* — Форма со значением устарела; фабрика создаёт ошибку лениво, в момент подписки.
- *Что заменило \`retryWhen\`?* — \`retry({ count, delay })\`, где \`delay\` может быть функцией с экспоненциальной паузой.
- *Куда уходит необработанная ошибка в Angular?* — RxJS бросает её асинхронно, и она попадает в \`ErrorHandler\`.

### Ответ на 1 минуту

> В RxJS ошибка — терминальное событие: после неё не будет ни \`next\`, ни \`complete\`, подписка закрывается и срабатывает teardown, а необработанная ошибка в Angular уходит в \`ErrorHandler\`. Перехватывает её \`catchError\`, который обязан вернуть новый Observable: запасное значение через \`of\`, тихое завершение через \`EMPTY\` или проброс через \`throwError(() => err)\`. Принципиально, где он стоит: на внешнем потоке первая же ошибка завершит его навсегда, и эффект NgRx или поиск перестанут работать, поэтому я ставлю \`catchError\` внутри \`switchMap\` или \`mergeMap\` на сам запрос — тогда падает только одна итерация. \`retry\` ошибку не обрабатывает, а переподписывается на источник, и раз HTTP-поток холодный, запрос со всеми побочными эффектами уходит заново. Поэтому ретраю только идемпотентные запросы и использую \`retry({ count, delay })\` с растущей паузой вместо устаревшего \`retryWhen\`.`,
      en: `## In short

An error in RxJS is a **terminal event**: after it the stream is dead. No more \`next\`, no \`complete\`, teardown fires immediately. Leave it unhandled and it bubbles up — in Angular, into the global \`ErrorHandler\`.

Analogy: a stream is a **conveyor belt** and an error is the emergency stop. Pull it and the belt is down for good. \`catchError\` is the **spare belt** you swap in for the broken one. \`retry\` is "restart the entire workshop from scratch".

## How it works, step by step

1. Somewhere inside, \`subscriber.error(e)\` is called.
2. The error travels **down** the operator chain to the subscriber; the stream is marked closed and teardown runs.
3. If a \`catchError(fn)\` sits on the way, it **intercepts** the error and calls your \`fn\`.
4. \`fn\` must return a **new Observable**. Return \`of(...)\` or \`EMPTY\` and the stream "continues" from that one; return \`throwError(() => err)\` and you rethrow.
5. If a \`retry\` sits on the way, it does not catch anything — it **resubscribes** to the source. The source is cold, so the whole job runs again.
6. Once attempts run out, the error continues downstream as usual.

## Where to put catchError — this is the critical bit

The rule: **\`catchError\` inside a higher-order operator saves the outer stream; outside it, it kills it**.

\`\`\`ts
// BAD: the first error kills items$ forever
items$.pipe(
  mergeMap(id => api.get(id)),
  catchError(() => of(null))
);

// GOOD: only one inner request fails
items$.pipe(
  mergeMap(id => api.get(id).pipe(catchError(() => of(null))))
);
\`\`\`

## Example

\`\`\`ts
api.load().pipe(
  retry({
    count: 3,
    delay: (err, retryCount) => timer(2 ** retryCount * 500)
  }),
  catchError(err => {
    if (err.status === 404) return of(EMPTY_RESULT); // recovered
    return throwError(() => err);                    // rethrown
  })
);
\`\`\`

Why: first three attempts with a growing pause (\`retry({ count, delay })\` is the modern replacement for the deprecated \`retryWhen\`), and only if that still fails do we decide between recovering and rethrowing. Remember: \`retry\` repeats the **whole** source, so every side effect inside it runs again.

## What to say in the interview

> In RxJS \`error\` is a terminal event: no \`next\` or \`complete\` follows it, teardown runs, and an unhandled error bubbles up — in Angular into the \`ErrorHandler\`. \`catchError\` intercepts it and must return a new Observable: either a fallback value to recover, or \`throwError\` to rethrow. The decisive detail is where \`catchError\` sits in the pipe. Place it at the outer-stream level and the very first error completes that outer stream forever — an NgRx effect, for instance, stops reacting to actions entirely. So you put \`catchError\` **inside** the higher-order operator, wrapping the inner request, and then only one iteration fails. \`retry(n)\` works differently: it does not handle the error, it resubscribes to the source, and since the source is cold, all the work including side effects runs again. The modern API is \`retry({ count, delay })\`, where \`delay\` can be a number or a function returning an Observable, which gives you exponential backoff; it replaces the deprecated \`retryWhen\`.

## Gotchas

- **\`catchError\` outside \`switchMap\`/\`mergeMap\`** — the stream dies after the first error. The classic dead-NgRx-effect bug.
- **A \`catchError\` that returns nothing** — TypeScript complains, and in plain JS you get \`undefined\` instead of an Observable.
- **\`retry\` on a non-idempotent operation** (a POST that creates an order) — three attempts, three orders.
- **\`retry\` without \`count\`** retries forever — against a consistently failing server that is DDoS-ing your own backend.
- **\`return of(null)\` versus \`EMPTY\`** — they differ: \`of(null)\` emits a value, \`EMPTY\` just completes the stream.
- **Follow-up question**: why is \`throwError(() => err)\` better than \`throwError(err)\`? The factory creates the error lazily, at subscribe time, so the stack trace is correct.`
    }
  },
  {
    id: 'rxjs-010',
    category: 'rxjs',
    level: 'Hard',
    tags: ['retrywhen', 'backoff', 'error-handling'],
    question: {
      ru: 'Как реализовать экспоненциальный backoff и почему retryWhen считается устаревшим?',
      en: 'How do you implement exponential backoff, and why is retryWhen considered deprecated?'
    },
    answer: {
      ru: `## В чём суть

Экспоненциальный backoff — это стратегия повторов «стучаться всё реже»: первая повторная попытка через секунду, вторая через две, третья через четыре. К паузе добавляют **джиттер** — немного случайных миллисекунд, чтобы тысячи клиентов не постучались в одну и ту же секунду. В RxJS 7 это делается одним оператором \`retry({ count, delay })\`, а старый \`retryWhen\` помечен устаревшим, потому что на нём слишком легко было написать бесконечный цикл или потерять ошибку.

Аналогия: упавший сервер — это **толпа у закрытой двери магазина**. Если все дёргают ручку каждую секунду, у двери давка, и даже когда её откроют, толпа снесёт охранника. Разумно подождать, потом подождать подольше, потом ещё дольше — и чуть-чуть вразнобой, чтобы не ломиться всем в одну секунду.

**Какую проблему решает.** Сбои бывают временными: моргнула сеть, сервер перезапускается, балансировщик вернул 503. Пользователь не должен видеть ошибку из-за полусекундного сбоя — запрос стоит тихо повторить. Но повторы без пауз и без ограничений превращаются в атаку на собственный бэкенд: сервер, который пытается подняться, получает в разы больше запросов, чем обычно, и падает снова. Backoff с капом и джиттером решает обе задачи: восстанавливается после коротких сбоев и щадит сервер при длинных.

## Словарик терминов

- **Ретрай (retry)** — повтор операции после ошибки. В RxJS — переподписка на холодный поток, то есть новый HTTP-запрос.
- **Экспоненциальный backoff (exponential backoff)** — пауза перед повтором растёт в геометрической прогрессии: 1 с, 2 с, 4 с, 8 с. Формула: \`base * 2 ** (n - 1)\`, где \`n\` — номер повтора.
- **Кап (cap)** — верхний предел паузы. Без него 10-я попытка ждала бы \`2 ** 10\` = 1024 секунды, это 17 минут.
- **Джиттер (jitter)** — случайная добавка к паузе, которая разносит повторы разных клиентов во времени.
- **Thundering herd («эффект стада»)** — ситуация, когда множество клиентов синхронно повторяют запросы и добивают только что поднявшийся сервер.
- **Восстановимая ошибка (transient error)** — временный сбой, который может пройти сам: сеть, 5xx, 408 (таймаут), 429 (слишком много запросов).
- **HTTP-статус 0** — так Angular \`HttpClient\` сообщает о сетевой ошибке, когда ответа от сервера не было вовсе (нет сети, CORS, обрыв соединения).
- **Идемпотентная операция** — операция, повтор которой безопасен: \`GET\`, \`PUT\`, \`DELETE\`. \`POST\` «создать платёж» не идемпотентен.
- **Notifier (поток-сигнал)** — Observable, чья эмиссия означает «пора повторять». Его возвращает функция \`delay\` в \`retry\`.
- **\`timer(ms)\`** — функция создания потока, который выдаёт одно значение через \`ms\` миллисекунд и завершается.
- **\`fromEvent(target, name)\`** — поток событий DOM: \`fromEvent(window, 'online')\` выдаёт значение, когда браузер снова в сети.
- **\`retryWhen\`** — устаревший оператор повторов, который получал поток ошибок и должен был вернуть поток-сигнал.
- **\`Retry-After\`** — HTTP-заголовок, в котором сервер подсказывает, через сколько секунд стоит повторить запрос.

## Как это работает под капотом

Что происходит при сбое запроса, обёрнутого в \`retry({ count, delay })\`:

1. Источник выдаёт \`error\`, поэтому \`retry\` не пропускает ошибку дальше, а проверяет счётчик: если повторов было меньше \`count\`, он вызывает вашу функцию \`delay(error, retryCount)\`, где \`retryCount\` начинается с 1.
2. Внутри функции вы смотрите на **тип ошибки**. Сеть (статус 0), 5xx, 408, 429 — есть смысл повторять. 400, 401, 403, 404, 422 — повтор ничего не изменит, поэтому сразу возвращаете \`throwError(() => error)\`, и ошибка уходит дальше вниз без повторов.
3. Для восстановимой ошибки считаете паузу: \`base * 2 ** (retryCount - 1)\`.
4. Ограничиваете её капом через \`Math.min(..., maxMs)\`, чтобы не ждать полчаса.
5. Добавляете джиттер — случайные миллисекунды, чтобы разнести толпу клиентов.
6. Возвращаете \`timer(пауза)\`. \`retry\` подписывается на него и при **первой эмиссии** отписывается от таймера и переподписывается на источник — запрос уходит заново.
7. Если функция вернула поток, который завершился без эмиссии (например, \`EMPTY\`), \`retry\` завершает весь результат **без ошибки**. Если поток упал — эта ошибка уходит подписчику.
8. Когда счётчик дошёл до \`count\`, \`retry\` перестаёт вызывать \`delay\` и пропускает последнюю ошибку дальше.

Как растёт пауза при \`base = 1000\` и \`cap = 30 000\`:

- повтор 1 → 1 с, повтор 2 → 2 с, повтор 3 → 4 с, повтор 4 → 8 с;
- повтор 5 → 16 с, повтор 6 → 30 с (без капа было бы 32 с), дальше всё время 30 с.

### Пример 1. Минимальный backoff

Источник, который трижды падает с 503 и на четвёртый раз отвечает. Пауза для наглядности короткая — 100 мс:

\`\`\`ts
import { Observable, retry, timer } from 'rxjs';

let attempt = 0;
const request$ = new Observable<string>(subscriber => {
  attempt++;
  console.log('попытка', attempt);
  if (attempt < 4) subscriber.error({ status: 503 });
  else { subscriber.next('ok'); subscriber.complete(); }
});

request$.pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      const ms = 100 * 2 ** (retryCount - 1);
      console.log(\`повтор #\${retryCount} через \${ms} мс\`);
      return timer(ms);
    }
  })
).subscribe(v => console.log(v));
// попытка 1
// повтор #1 через 100 мс
// попытка 2
// повтор #2 через 200 мс
// попытка 3
// повтор #3 через 400 мс
// попытка 4
// ok            ← примерно через 700 мс от старта
\`\`\`

Каждая «попытка» — новый запуск кода внутри \`new Observable\`: \`retry\` действительно переподписывается.

### Пример 2. Не повторять то, что не исправится

\`\`\`ts
request404$.pipe(
  retry({
    count: 4,
    delay: (error) => error.status >= 500 ? timer(100) : throwError(() => error)
  })
).subscribe({ error: e => console.log('ошибка', e.status) });
// попытка 1
// ошибка 404   ← сразу, без единого повтора
\`\`\`

401 не станет 200 от повторения, а 404 не появится через секунду. Возвращая \`throwError\` из \`delay\`, вы говорите \`retry\`: «эту ошибку не повторяй, отдай её дальше как есть».

### Пример 3. Боевой оператор: кап, джиттер, статусы, офлайн

Логику удобно упаковать в свой переиспользуемый оператор (функцию, возвращающую \`MonoTypeOperatorFunction<T>\` — оператор, не меняющий тип значений):

\`\`\`ts
import { MonoTypeOperatorFunction, retry, timer, throwError, fromEvent } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

function isRetryable(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

export function retryWithBackoff<T>({ count = 4, baseMs = 1000, maxMs = 30_000 } = {}): MonoTypeOperatorFunction<T> {
  return retry({
    count,
    delay: (error, retryCount) => {
      if (!isRetryable(error)) return throwError(() => error);   // 4xx — сразу дальше
      if (!navigator.onLine) return fromEvent(window, 'online'); // ждём возврата сети
      const exp = Math.min(maxMs, baseMs * 2 ** (retryCount - 1)); // backoff + кап
      const jitter = Math.random() * 300;                          // джиттер
      return timer(exp + jitter);
    }
  });
}

this.http.get<User[]>('/api/users').pipe(retryWithBackoff()).subscribe(...);
\`\`\`

Обратите внимание на статус 0: старый вариант \`error.status >= 500\` его не ловил, хотя сетевые сбои — самые типичные временные ошибки. И на \`fromEvent(window, 'online')\`: \`retry\` ждёт **первую эмиссию любого** Observable, поэтому «повторить, когда вернётся интернет» — это тот же \`delay\`, просто с другим потоком-сигналом.

### Джиттер: аддитивный и «полный»

В примере выше джиттер аддитивный: к паузе добавляется до 300 мс случайности. Есть вариант «полного джиттера» (full jitter): пауза — случайное число от 0 до экспоненциального значения, \`Math.random() * exp\`. Он разносит клиентов сильнее и часто рекомендуется для крупных систем. Принцип один: чем больше клиентов, тем важнее, чтобы их повторы не совпадали во времени.

### Учесть подсказку сервера: \`Retry-After\`

При 429 и 503 сервер нередко присылает заголовок \`Retry-After\` — «повторите через N секунд». Честнее послушать его, чем гадать:

\`\`\`ts
delay: (error: HttpErrorResponse, retryCount) => {
  const hint = Number(error.headers?.get('Retry-After'));  // число секунд, если есть
  const ms = Number.isFinite(hint) && hint > 0 ? hint * 1000 : 1000 * 2 ** (retryCount - 1);
  return timer(Math.min(ms, 30_000));
}
\`\`\`

Заголовок может содержать и дату вместо числа; в этом примере такой случай просто откатывается на обычный backoff.

### \`resetOnSuccess\`: счётчик для долгоживущих потоков

Для WebSocket или SSE-потока (событий с сервера) \`count: 3\` означал бы «три обрыва за всю жизнь вкладки». Опция \`resetOnSuccess: true\` обнуляет счётчик, как только переподключённый поток выдал значение:

\`\`\`ts
socket$.pipe(retry({ count: 2 }))
// сообщение из соединения 1, 2, 3 → ошибка «обрыв»: три соединения, и всё

socket$.pipe(retry({ count: 2, resetOnSuccess: true }))
// сообщение из соединения 1, 2, 3, 4, 5… — каждый успешный коннект обнуляет счётчик
\`\`\`

### Как работал \`retryWhen\` и почему он устарел

\`retryWhen(notifier)\` получал **поток всех ошибок** и должен был вернуть поток-сигнал. Каждая эмиссия сигнала — повтор, \`complete\` сигнала — завершение результата, \`error\` сигнала — ошибка результата. Мощно, но вся ответственность на вас, и типичные ошибки было очень легко совершить:

\`\`\`ts
// 1) Бесконечный цикл: ничто не ограничивает число повторов
fail$.pipe(retryWhen(errors => errors.pipe(delay(1000))));

// 2) Потерянная ошибка: take(3) завершает сигнал — и результат ТИХО завершается
fail$.pipe(retryWhen(errors => errors.pipe(delay(50), take(3))))
  .subscribe({ error: e => console.log('error'), complete: () => console.log('complete') });
// 4 попытки, затем complete — подписчик уверен, что всё прошло успешно

// 3) Правильно, но громоздко: считать попытки и бросать ошибку вручную
fail$.pipe(retryWhen(errors => errors.pipe(
  mergeMap((err, i) => i < 2 ? timer(50) : throwError(() => err))
)));
\`\`\`

\`retry({ count, delay })\` закрывает эти дыры по умолчанию: лимит — это \`count\`, исчерпание лимита отдаёт **исходную ошибку**, номер попытки и сама ошибка приходят аргументами. Поэтому в RxJS 7 \`retryWhen\` помечен \`@deprecated\` с пометкой «будет удалён в v9 или v10, используйте опцию \`delay\` у \`retry\`». Миграция механическая: \`retryWhen(() => notify$)\` → \`retry({ delay: () => notify$ })\`. Так же устарел \`repeatWhen\` — в пользу \`repeat({ delay })\`.

### \`repeat\` — родственник для опроса сервера

\`retry\` переподписывается на **ошибку**, \`repeat\` — на **успешное завершение**. С \`delay\` им делают опрос (polling):

\`\`\`ts
import { defer, of, repeat } from 'rxjs';

let n = 0;
defer(() => of('опрос ' + (++n))).pipe(repeat({ count: 3, delay: 50 })).subscribe(console.log);
// опрос 1, опрос 2 (через 50 мс), опрос 3 (ещё через 50 мс), complete
\`\`\`

\`defer(() => ...)\` создаёт поток заново при каждой подписке, поэтому каждое повторение вызывает фабрику ещё раз — как и HTTP-запрос.

### Где это применяется на практике

- **Функциональный HTTP-интерсептор** с backoff только для идемпотентных методов: \`(req, next) => ['GET', 'PUT', 'DELETE'].includes(req.method) ? next(req).pipe(retryWithBackoff({ count: 3 })) : next(req)\`.
- **Загрузка тяжёлых гридов и отчётов**, где бэкенд под нагрузкой иногда отвечает 503 — пользователь видит чуть более долгий спиннер вместо ошибки.
- **Переподключение WebSocket** котировок или уведомлений с \`resetOnSuccess\` и капом в 30 секунд.
- **Офлайн-сценарии PWA**: повтор отправки формы при событии \`online\`.
- **Интеграции с внешними API с лимитами** (429) — уважение \`Retry-After\`.

## Важные нюансы и подводные камни

- **Ретраить 4xx.** Бессмысленно и вредно: 401 не станет 200 от повторения, а 422 означает ошибку в данных.
- **Забыть статус 0.** Проверка \`status >= 500\` пропускает сетевые сбои — самые частые временные ошибки.
- **Backoff без капа.** \`2 ** 10\` секунд — это 17 минут ожидания; пользователь давно ушёл.
- **Backoff без джиттера.** Все клиенты синхронно ударят по серверу в одну секунду (thundering herd).
- **Ретрай неидемпотентного \`POST\`.** Ответ мог потеряться уже после того, как сервер создал заказ или платёж, — получите дубли. Либо не повторяйте \`POST\`, либо договоритесь с бэкендом о ключе идемпотентности.
- **Забыть \`count\`.** Бесконечный цикл повторов — ровно тот баг, за который ругали \`retryWhen\`.
- **\`delay\` вернул поток без эмиссии.** \`EMPTY\` или фильтр, ничего не пропустивший, завершат результат **без ошибки** — пользователь не узнает о сбое.
- **\`retryWhen\` с \`take(n)\`** глотает ошибку: результат тихо завершается после последней попытки.
- **Позиция \`retry\` относительно \`switchMap\`.** Внутри (\`switchMap(q => api(q).pipe(retry(...)))\`) повторяется только запрос, и новый ввод отменит ожидание повтора. Снаружи повтор переподпишет весь внешний поток, что почти никогда не нужно.
- **Интерсептор плюс \`retry\` в сервисе.** Повторы перемножаются: по 3 повтора на двух уровнях — это до 4 × 4 = 16 запросов на одно действие.
- **Тесты с реальными паузами медленные.** Проверяйте backoff через \`TestScheduler\` с виртуальным временем или \`fakeAsync\`.
- **\`retry\` и \`repeat\` — не одно и то же.** \`retry\` переподписывается на \`error\`, \`repeat\` — на \`complete\`.

**Плюсы:** временные сбои незаметны пользователю; сервер не добивают в момент восстановления; с \`retry({ count, delay })\` вся политика — в одной функции с номером попытки и ошибкой на входе.
**Минусы:** увеличивается время до показа реальной ошибки; повторы опасны для неидемпотентных операций; легко перемножить повторы на нескольких уровнях.

## Как это спрашивают на собеседовании

**Главный вывод:** backoff — это \`retry({ count, delay })\`, где \`delay\` фильтрует восстановимые ошибки, считает паузу как \`base * 2 ** (n - 1)\`, ограничивает её капом, добавляет джиттер и возвращает \`timer\`. \`retryWhen\` устарел, потому что на нём легко получить бесконечный цикл или тихо потерять ошибку.

Типичные формулировки: «Как повторить HTTP-запрос с растущей задержкой?», «Что такое jitter и зачем он?», «Почему \`retryWhen\` deprecated и чем его заменить?», «Какие ошибки стоит ретраить?».

Что могут спросить следом:

- *Что будет, если \`delay\` вернёт \`EMPTY\`?* — Результат завершится без ошибки, повторов не будет.
- *Как повторить, когда вернётся сеть?* — Вернуть из \`delay\` поток \`fromEvent(window, 'online')\`.
- *Где делать ретраи в Angular?* — В функциональном интерсепторе для идемпотентных методов или точечно в сервисе, но не на обоих уровнях сразу.
- *Чем \`retry\` отличается от \`repeat\`?* — \`retry\` переподписывается на \`error\`, \`repeat\` — на \`complete\`.
- *Что такое \`resetOnSuccess\`?* — Сброс счётчика после успешной эмиссии; нужен для долгоживущих соединений.

### Ответ на 1 минуту

> Экспоненциальный backoff я делаю через \`retry({ count, delay })\`. В функции \`delay\` сначала смотрю на ошибку: повторяю только восстановимые — сетевые со статусом 0, 5xx, 408 и 429, а 4xx сразу пробрасываю через \`throwError\`. Паузу считаю как база, умноженная на два в степени номера попытки, ограничиваю капом, например 30 секунд, и добавляю случайный джиттер, чтобы клиенты не повторяли синхронно и не добили поднявшийся сервер. Возвращаю \`timer\`, и \`retry\` переподписывается на его первой эмиссии; так же можно вернуть \`fromEvent(window, 'online')\`, чтобы повторить при возврате сети. \`retryWhen\` устарел, потому что получал поток ошибок и требовал вручную считать попытки: легко было сделать бесконечный цикл или через \`take\` тихо потерять ошибку. И важно: ретраю только идемпотентные запросы и не дублирую повторы в интерсепторе и сервисе.`,
      en: `## In short

Exponential backoff means "knock less and less often": the first retry after half a second, the second after a second, the third after two. Plus **jitter** — a random extra, so that all clients do not knock at the same instant.

Analogy: a downed server is a **crowd at a locked door**. If everyone yanks the handle every second, the door never opens. The sensible approach is to wait, then wait longer, then longer still — and slightly out of sync, so you do not all pile in on the same second.

## How it works, step by step

1. The request fails → \`retry\` calls your \`delay(error, retryCount)\` function.
2. Look at the **error type**. 5xx or a network failure is worth retrying. 4xx (401, 404, validation) is pointless — return \`throwError\` immediately.
3. Compute the base delay: \`2 ** (retryCount - 1)\` times some base milliseconds.
4. **Cap it**, so you are not waiting half an hour.
5. Add **jitter** — a few random milliseconds to spread the crowd of clients out over time.
6. Return \`timer(...)\`. As soon as it emits, \`retry\` resubscribes to the source and the request goes out again.
7. Once \`count\` is exhausted, the error travels on downstream.

## Why retryWhen is deprecated

\`retryWhen(notifier => ...)\` took a **stream of errors** and had to return a signal stream saying "retry now". Powerful, but **unintuitive**: it was very easy to accidentally build an infinite retry loop, or to lose the original error by forgetting to rethrow when attempts ran out. RxJS 7.x deprecated it in favour of \`retry({ count, delay })\`, which solves the same problems more explicitly and more safely.

## Example

\`\`\`ts
import { retry, timer, throwError } from 'rxjs';

api.load().pipe(
  retry({
    count: 4,
    delay: (error, retryCount) => {
      if (error.status >= 500) {
        const base = Math.min(1000 * 2 ** (retryCount - 1), 30_000); // backoff + cap
        const jitter = Math.random() * 300;                          // jitter
        return timer(base + jitter);
      }
      return throwError(() => error); // do not retry 4xx
    }
  })
);
\`\`\`

Why: a server that is down needs mercy, not more hammering. And note — the "retry once the internet is back" scenario is covered by the very same function: just return \`fromEvent(window, 'online')\` instead of \`timer\`, because \`retry\` waits for the first emission of **any** Observable.

## What to say in the interview

> \`retryWhen\` took a stream of errors and returned a signal stream that decided when to resubscribe. It was unintuitive: it was easy to end up with an infinite retry loop or to lose the original error by forgetting to rethrow once attempts were exhausted, so RxJS 7.x deprecated it in favour of \`retry({ count, delay })\`. I build modern backoff like this: inside the \`delay\` function I inspect the error type and retry only recoverable failures — 5xx and network errors — while rethrowing 4xx immediately via \`throwError\`. I compute the delay exponentially as \`2\` to the power of the attempt number, cap the maximum, and add random jitter, which prevents the thundering-herd effect where all clients retry in lockstep and knock over a server that just came back. I return a \`timer\`, and \`retry\` resubscribes on its first emission; "retry after coming back online" is covered by the same \`delay\` by returning \`fromEvent(window, 'online')\`.

## Gotchas

- **Retrying 4xx** is pointless and harmful: a 401 will not turn into a 200 by repetition.
- **Backoff without a cap** — \`2 ** 10\` seconds is a 17-minute wait.
- **Backoff without jitter** — every client hits the server on the same second (thundering herd).
- **Retrying a non-idempotent POST** — you create duplicate orders or payments.
- **Forgetting \`count\`** — an infinite retry loop, exactly the bug \`retryWhen\` was blamed for.
- **Follow-up question**: how does \`retry\` differ from \`repeat\`? \`retry\` resubscribes on **error**, \`repeat\` on **complete**.`
    }
  },
  {
    id: 'rxjs-011',
    category: 'rxjs',
    level: 'Medium',
    tags: ['finalize', 'teardown', 'cleanup'],
    question: {
      ru: 'Что делает finalize и чем он отличается от complete-колбэка и tap?',
      en: 'What does finalize do and how does it differ from a complete callback and tap?'
    },
    answer: {
      ru: `## В чём суть

\`finalize(fn)\` — это блок \`finally\` для потока данных. Он вызывает \`fn\` ровно один раз, когда подписка заканчивается **любым** способом: поток успешно завершился, упал с ошибкой или от него отписались.

Аналогия: вы уходите из офиса последним. Ушли вовремя, сбежали посреди аврала или вас срочно вызвали домой — **свет выключить нужно в любом случае**. \`finalize\` и есть этот выключатель у двери: ему всё равно, почему вы уходите, он просто срабатывает на выходе.

**Какую проблему решает.** В интерфейсе постоянно есть состояние «идёт загрузка»: крутится спиннер, кнопка заблокирована. Включить его легко, а выключить нужно во всех сценариях — и при успехе, и при ошибке сервера, и когда пользователь ушёл со страницы, не дождавшись ответа. Если хоть один сценарий забыть, спиннер повиснет навсегда. \`finalize\` даёт одно место, которое закрывает все три сценария сразу.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения: ответ сервера, клики, тики таймера. Сам по себе ничего не делает, пока на него не подписались.
- **Подписка (\`subscribe\`, \`Subscription\`)** — момент, когда мы говорим потоку «начинай работать и присылай мне значения». Возвращает объект \`Subscription\`, через который подписку можно отменить.
- **Уведомления \`next\` / \`error\` / \`complete\`** — три вида сообщений от потока. \`next\` — очередное значение, \`error\` — поток упал, \`complete\` — поток успешно закончился. После \`error\` или \`complete\` поток больше ничего не присылает.
- **Отписка (\`unsubscribe\`)** — потребитель сам прекращает подписку: «мне больше не нужно». Поток при этом **не** присылает ни \`error\`, ни \`complete\` — он просто замолкает.
- **Оператор** — функция, которая принимает поток и возвращает новый поток с изменённым поведением: \`map\`, \`filter\`, \`finalize\`.
- **\`pipe\`** — метод, через который операторы выстраиваются в цепочку: \`source.pipe(a(), b(), c())\`. Значение проходит операторы сверху вниз.
- **Teardown / финализатор** — функция очистки, которую подписка запускает при своём закрытии. \`finalize\` как раз регистрирует такую функцию.
- **\`tap\`** — оператор «подсмотреть»: выполняет побочное действие (лог, запись в переменную), не меняя сами значения.
- **\`takeUntilDestroyed\`** — Angular-оператор, который автоматически отписывается, когда уничтожается компонент или сервис.
- **Сигнал (\`signal\`)** — реактивная переменная Angular: при её изменении шаблон перерисовывается.

## Как это работает под капотом

Внутри \`finalize\` устроен очень просто — почти дословно так:

\`\`\`ts
function finalize(callback) {
  return (source) => new Observable((subscriber) => {
    source.subscribe(subscriber);   // 1. подписываемся на источник
    subscriber.add(callback);       // 2. вешаем callback как функцию очистки
  });
}
\`\`\`

Что происходит по шагам:

1. Когда вы вызываете \`subscribe()\`, оператор \`finalize\` подписывается на поток выше по цепочке.
2. Ваш колбэк он не вызывает сразу, а **регистрирует как функцию очистки** на подписке — так же, как регистрируется любая другая очистка (остановка таймера, закрытие WebSocket).
3. У подписки есть одно правило: при закрытии она запускает **все** зарегистрированные функции очистки. Закрывается она в трёх случаях — после \`complete\`, после \`error\` и после \`unsubscribe()\`.
4. Поэтому \`finalize\` не нужно отдельно «ловить» каждый сценарий: какой бы ни был конец, подписка закроется и вызовет колбэк.
5. Порядок важен: сначала подписчик получает финальное уведомление (ваш \`complete\` или \`error\` в \`subscribe\` отрабатывает **первым**), и только потом подписка закрывается и вызывает \`finalize\`.
6. Если в цепочке несколько \`finalize\`, то в RxJS 7 они вызываются **в порядке записи в \`pipe\`** — сверху вниз, от источника к подписчику. (В RxJS 6 порядок был обратным — это частая путаница в старых статьях.)

### Пример 1. Три способа закончить поток — \`finalize\` срабатывает во всех

\`\`\`ts
import { of, throwError, interval, finalize } from 'rxjs';

// 1) Успешное завершение
of(1, 2).pipe(
  finalize(() => console.log('finalize: успех'))
).subscribe({
  next: v => console.log('next', v),
  complete: () => console.log('complete')
});
// next 1
// next 2
// complete
// finalize: успех

// 2) Ошибка
throwError(() => new Error('500')).pipe(
  finalize(() => console.log('finalize: ошибка'))
).subscribe({
  error: e => console.log('error', e.message)
});
// error 500
// finalize: ошибка

// 3) Отписка: бесконечный поток, который никогда не завершится сам
const sub = interval(1000).pipe(
  finalize(() => console.log('finalize: отписка'))
).subscribe();
sub.unsubscribe();
// finalize: отписка
\`\`\`

Обратите внимание на третий случай: \`interval\` бесконечен, ни \`complete\`, ни \`error\` никогда не придут. Но \`finalize\` всё равно сработал, потому что закрылась подписка.

### Пример 2. Почему колбэк \`complete\` не подходит для спиннера

\`\`\`ts
// ❌ Плохо: спиннер выключается только при успехе
this.loading = true;
this.api.loadUsers().subscribe({
  next: users => this.users = users,
  complete: () => this.loading = false
});
\`\`\`

Что пойдёт не так:

- Сервер ответил 500 → прилетит \`error\`, а \`complete\` **не вызовется никогда**. Спиннер висит.
- Пользователь ушёл на другую страницу, и компонент отписался → не придёт ни \`complete\`, ни \`error\`. Если флаг загрузки лежит в общем сервисе (например, глобальный прогресс-бар), он так и останется включённым.

\`\`\`ts
// ✅ Хорошо: одна точка на все случаи
this.loading.set(true);
this.api.loadUsers().pipe(
  takeUntilDestroyed(this.destroyRef),
  finalize(() => this.loading.set(false))
).subscribe({
  next: users => this.users.set(users),
  error: err => this.error.set(err.message)
});
\`\`\`

### Пример 3. А что умеет \`tap\`?

Обычный \`tap(fn)\` видит только значения. Но ему можно передать объект с колбэками на каждое событие. В RxJS 7.3+ у него есть даже \`unsubscribe\` и \`finalize\`:

\`\`\`ts
import { timer, tap } from 'rxjs';

const sub = timer(1000).pipe(
  tap({
    complete: () => console.log('tap complete'),
    unsubscribe: () => console.log('tap unsubscribe'), // только при ручной отписке
    finalize: () => console.log('tap finalize')        // при любом конце
  })
).subscribe();

sub.unsubscribe();
// tap unsubscribe
// tap finalize
// ("tap complete" не напечатан: поток не успел завершиться)
\`\`\`

Вывод: \`tap({ complete })\` страдает той же болезнью, что и \`complete\` в \`subscribe\` — не видит ни ошибку, ни отписку. \`tap({ finalize })\` работает так же, как оператор \`finalize\`; отдельный \`finalize\` просто короче и привычнее читается.

### Пример 4. Порядок срабатывания

\`\`\`ts
import { timer, finalize } from 'rxjs';

timer(10).pipe(
  finalize(() => console.log('A')),
  finalize(() => console.log('B'))
).subscribe({
  next: v => console.log('next', v),
  complete: () => console.log('complete')
});
// next 0
// complete   ← сначала подписчик узнаёт о завершении
// A          ← потом закрывается подписка, финализаторы идут сверху вниз
// B
\`\`\`

### Где это применяется на практике

- **Индикатор загрузки и блокировка кнопки** «Сохранить» на время запроса — самый частый случай.
- **HTTP-интерсептор с глобальным счётчиком запросов**: в начале запроса \`counter++\`, в \`finalize\` — \`counter--\`. Когда счётчик равен нулю, глобальный прогресс-бар скрывается.
- **Логирование и метрики**: записать, сколько жил поток и чем закончился.
- **Освобождение ресурсов**, привязанных к подписке: закрыть диалог, снять блокировку формы, вернуть фокус.

## Важные нюансы и подводные камни

- **Спиннер выключают в \`complete\`** — классический баг: при ошибке или уходе со страницы он не погаснет.
- **\`finalize\` не получает данных.** Ни последнего значения, ни ошибки в колбэк не передаётся — только сам факт «всё закончилось». Если нужно знать, чем именно закончилось, комбинируйте с \`tap({ error })\` или \`catchError\`.
- **Позиция относительно \`retry\` важна.** \`finalize\`, стоящий **до** \`retry\`, сработает на каждой неудачной попытке (каждая попытка — новая подписка). Стоящий **после** \`retry\` — один раз в самом конце:

\`\`\`ts
flaky$.pipe(
  finalize(() => console.log('inner')), // упало 2 раза, потом успех
  retry(3),
  finalize(() => console.log('outer'))
).subscribe(v => console.log('next', v));
// inner
// inner
// next ok
// inner
// outer
\`\`\`

- **\`finalize\` внутри \`switchMap\`** срабатывает на **каждый** отменённый внутренний запрос. Это полезно (можно логировать отмены), но если вы там гасите общий спиннер, он погаснет, пока следующий запрос ещё идёт.
- **\`finalize\` выше \`share\` / \`shareReplay\`** срабатывает, когда отписался **последний** подписчик, а не каждый — потому что источник общий.
- **Не пишите в \`finalize\` тяжёлую или асинхронную логику**: он вызывается синхронно во время закрытия подписки, и результат асинхронного действия там уже некому обработать.
- **\`finalize\` и teardown в \`new Observable\` — не одно и то же.** Teardown пишет автор потока (например, «остановить таймер»), \`finalize\` добавляет потребитель в своей цепочке. При закрытии подписки срабатывают оба.

**Плюсы:** одна точка очистки на все сценарии, работает с любыми источниками, легко читается.
**Минусы:** не знает причины завершения и последнего значения; легко ошибиться с позицией в \`pipe\` рядом с \`retry\`, \`switchMap\` и \`share\`.

## Как это спрашивают на собеседовании

**Главный вывод:** \`finalize\` — это \`finally\` для подписки. Он срабатывает при \`complete\`, \`error\` **и** \`unsubscribe\`, а колбэк \`complete\` — только при успехе. Поэтому сброс UI-состояния всегда кладут в \`finalize\`.

Типичные формулировки: «Как гарантированно скрыть спиннер после запроса?», «Почему спиннер иногда остаётся висеть?», «Чем \`finalize\` отличается от \`complete\`?».

Что могут спросить следом:

- *В каком порядке срабатывают несколько \`finalize\`?* — В RxJS 7 в порядке записи в \`pipe\`, после того как подписчик получил \`complete\` или \`error\`.
- *Что будет с \`finalize\` рядом с \`retry\`?* — До \`retry\` — на каждую попытку, после — один раз.
- *Есть ли альтернатива?* — \`tap({ finalize })\` делает то же самое.

### Ответ на 1 минуту

> \`finalize\` — это аналог \`finally\` для Observable: он регистрирует колбэк как функцию очистки на подписке, и тот срабатывает ровно один раз при любом её закрытии — после \`complete\`, после \`error\` или при \`unsubscribe\`. Колбэк \`complete\` в \`subscribe\` вызывается только при успехе: при ошибке сервера или уходе со страницы он не сработает, и спиннер зависнет. Поэтому сброс UI-состояния — спиннер, заблокированная кнопка, счётчик запросов в интерсепторе — я всегда кладу в \`finalize\`. Из нюансов: он не получает ни значения, ни ошибки, срабатывает уже после того, как подписчик получил финальное уведомление, а позиция в \`pipe\` важна — до \`retry\` он отработает на каждую попытку, внутри \`switchMap\` на каждый отменённый запрос, а выше \`share\` — только когда отпишется последний подписчик.`,
      en: `## In short

\`finalize(fn)\` is the **\`finally\` of streams**. It runs \`fn\` exactly once on **any** end of the subscription: a successful \`complete()\`, an \`error()\`, or an \`unsubscribe()\`.

Analogy: you are the last one leaving the office. Whether you left on time, fled after a crisis, or got fired mid-afternoon — **the lights have to go off either way**. \`finalize\` is that light switch.

## How it works, step by step

1. You turn the spinner on: \`loading = true\`.
2. You subscribe to a stream that has \`finalize(() => loading = false)\` in its pipe.
3. The stream ends — **however it ends**: the response arrives and it completes, the network fails and it errors, or the component is destroyed and it unsubscribes.
4. RxJS delivers the final notification to the subscriber.
5. **After** that, \`finalize\` fires — the spinner goes away.
6. With several \`finalize\` calls in one pipe, they run **bottom-up**: the ones closer to the subscriber go first.

## How it differs from the complete callback and tap

- The **\`complete\` callback in \`subscribe\`** runs **only** on success. Neither an error nor an unsubscribe triggers it — and the spinner hangs on screen forever.
- **\`tap({ complete })\`** is the same story: it does not cover \`unsubscribe\` and needs a separate \`error\` branch.
- **\`finalize\`** is a single point covering all three cases, which is why it is the right tool for UI state.

## Example

\`\`\`ts
this.loading = true;

this.api.load().pipe(
  takeUntilDestroyed(this.destroyRef),
  finalize(() => this.loading = false) // always runs
).subscribe({
  next: data => this.data = data,
  error: err => this.error = err
});
\`\`\`

Why: even if the user navigates away mid-request, \`takeUntilDestroyed\` triggers the unsubscription and \`finalize\` still hides the spinner and re-enables the button. A \`complete\` callback would not have done that.

## What to say in the interview

> \`finalize\` is the \`finally\` of Observables: it runs a callback once on any termination of the subscription, be it \`complete\`, \`error\`, or \`unsubscribe\`. That is exactly why it is ideal for cleaning up UI state — hiding a spinner, re-enabling a button, clearing a \`disabled\` flag. The \`complete\` callback in \`subscribe\` covers only the happy path: on an error or when the component is destroyed it never fires, and the spinner stays up. \`tap({ complete })\` likewise does not cover \`unsubscribe\` and needs a separate error branch. As nuances: \`finalize\` runs after the final notification has been delivered to the subscriber, and with several \`finalize\` calls in one pipe the order is bottom-up, so the inner ones run first. And importantly, combined with \`takeUntil\` or \`takeUntilDestroyed\` it still fires, which makes it handy for logging when a stream was closed.

## Gotchas

- **Hiding the spinner in \`complete\`** — it stays on screen on error. The classic bug.
- **\`finalize\` placed before \`catchError\`** fires before the recovery — order in the pipe matters.
- **\`finalize\` inside \`switchMap\`** runs for every **cancelled** inner subscription, not once at the end.
- **Expecting the stream's value inside \`finalize\`** — it is not there: \`finalize\` receives no data, only the fact of termination.
- **Heavy work inside \`finalize\`** blocks the unsubscription path — keep it light.
- **Follow-up question**: how does it differ from teardown in \`new Observable\`? Teardown belongs to the producer, \`finalize\` is an operator in the consumer's chain; both fire.`
    }
  },
  {
    id: 'rxjs-012',
    category: 'rxjs',
    level: 'Expert',
    tags: ['schedulers', 'subscribeon', 'observeon'],
    question: {
      ru: 'Что такое schedulers в RxJS? Сравните asap, async, queue, animationFrame и subscribeOn vs observeOn.',
      en: 'What are schedulers in RxJS? Compare asap, async, queue, animationFrame and subscribeOn vs observeOn.'
    },
    answer: {
      ru: `## В чём суть

Scheduler (планировщик) в RxJS отвечает на вопрос **«когда выполнить кусок работы»**: прямо сейчас, сразу после текущего синхронного кода (микротаска), в следующей задаче цикла событий (\`setTimeout\`) или перед отрисовкой кадра (\`requestAnimationFrame\`). Сам по себе RxJS синхронен, а планировщики подключаются там, где нужно «потом»: в \`delay\`, \`interval\`, \`debounceTime\`, а также явно — через \`observeOn\`, \`subscribeOn\` и \`scheduled\`.

Аналогия: планировщик — это **диспетчер в офисе**. Одну задачу он велит сделать немедленно, но по очереди, не бросая текущую (\`queue\`). Другую — «как только закончишь то, чем занят сейчас» (\`asap\`). Третью — «поставь на таймер» (\`async\`). Четвёртую — «сделай ровно перед тем, как экран обновится» (\`animationFrame\`). А в тестах диспетчер умеет «перематывать часы», чтобы пятиминутный таймер сработал мгновенно (\`TestScheduler\`).

**Какую проблему решает.** Без управления временем трудно сделать четыре вещи: не блокировать интерфейс тяжёлой синхронной работой, синхронизировать изменения DOM с кадрами браузера (плавная анимация без рывков), не переполнить стек при рекурсивном планировании и писать быстрые детерминированные тесты для кода с таймерами. Планировщики дают один общий интерфейс для всех этих «когда» и позволяют подменить время целиком.

## Словарик терминов

- **Scheduler (планировщик)** — объект с методом \`schedule(work, delay?, state?)\`, который решает, когда вызвать \`work\`. Возвращает \`Subscription\` для отмены.
- **Action (действие)** — одна запланированная единица работы. Внутри неё можно вызвать \`this.schedule(новоеСостояние)\` и запланировать себя снова.
- **Цикл событий (event loop)** — механизм браузера: выполнить текущий синхронный код, затем все микротаски, затем отрисовку (если пора) и следующую макротаску.
- **Синхронный код** — выполняется прямо сейчас, в текущем стеке вызовов, до любого \`setTimeout\` и \`Promise.then\`.
- **Микротаска (microtask)** — работа, запланированная через \`Promise.then\` или \`queueMicrotask\`. Выполняется сразу после текущего синхронного кода, раньше любых таймеров.
- **Макротаска (macrotask)** — работа из \`setTimeout\`, \`setInterval\`, событий DOM. Выполняется по одной за оборот цикла событий.
- **\`requestAnimationFrame\` (rAF)** — просьба к браузеру вызвать функцию перед следующей отрисовкой кадра (обычно 60 раз в секунду).
- **\`subscribeOn\`** — оператор, который откладывает **момент подписки** на источник в контекст выбранного планировщика.
- **\`observeOn\`** — оператор, который переносит **доставку уведомлений** (\`next\`, \`error\`, \`complete\`) операторам ниже себя в контекст планировщика.
- **\`scheduled(input, scheduler)\`** — функция создания потока из массива, промиса или Observable с выдачей через планировщик. Заменяет устаревший аргумент-планировщик у \`of\` и \`from\`.
- **Виртуальное время** — искусственные часы, которые тест двигает сам: «прошла секунда» занимает микросекунды реального времени.
- **\`TestScheduler\`** — планировщик для тестов с виртуальным временем и marble-диаграммами.
- **Marble-диаграмма** — запись потока строкой: \`a 100ms b|\` значит «значение \`a\`, через 100 мс значение \`b\`, затем завершение».
- **Change detection (обнаружение изменений)** — проверка Angular, что изменилось в данных, и обновление шаблона. Zone.js запускает её после асинхронных задач; в zoneless-режиме её запускают сигналы и \`markForCheck\`.

## Как это работает под капотом

1. По умолчанию планировщика нет: \`of\`, \`from\`, \`map\`, \`filter\` работают синхронно, прямо внутри вызова \`subscribe()\`. Поэтому \`of(1, 2, 3)\` отдаёт все значения раньше, чем выполнится строка после \`subscribe\`.
2. Операторам со временем (\`delay\`, \`interval\`, \`timer\`, \`debounceTime\`, \`throttleTime\`, \`auditTime\`, \`sampleTime\`) нужно «потом», поэтому они вызывают \`scheduler.schedule(work, delay)\`. Если планировщик не передан, берётся \`asyncScheduler\`.
3. \`schedule\` создаёт Action и просит планировщик его запустить, причём каждый делает это своим механизмом: \`queue\` — сразу, но через очередь; \`asap\` — через \`Promise.resolve().then(...)\`; \`async\` — через \`setInterval\`; \`animationFrame\` — через \`requestAnimationFrame\`.
4. Когда приходит время, Action вызывает \`work(state)\`. Если внутри вызвать \`this.schedule(next)\`, действие перепланирует себя — так устроен \`interval\`.
5. \`schedule\` возвращает \`Subscription\`: при отписке запланированная работа отменяется (например, вызывается \`clearInterval\`). Поэтому отписка от \`delay\` или \`interval\` реально останавливает таймер.
6. Если передать \`delay > 0\` планировщикам \`queue\`, \`asap\` или \`animationFrame\`, они ведут себя как \`async\` — то есть ставят таймер. Особое поведение у них только при нулевой задержке.

Упрощённо четыре планировщика сводятся к четырём механизмам браузера:

\`\`\`ts
const schedulers = {
  queue: (work) => work(),                          // сейчас (плюс очередь против рекурсии)
  asap: (work) => Promise.resolve().then(work),     // микротаска
  async: (work, ms = 0) => setTimeout(work, ms),    // макротаска (в RxJS — setInterval)
  animationFrame: (work) => requestAnimationFrame(work) // перед отрисовкой кадра
};
\`\`\`

### Пример 1. Кто выполнится раньше

\`\`\`ts
import { asyncScheduler, asapScheduler, queueScheduler } from 'rxjs';

console.log('start');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve().then(() => console.log('promise'));
asyncScheduler.schedule(() => console.log('async'));
asapScheduler.schedule(() => console.log('asap'));
queueScheduler.schedule(() => console.log('queue'));
console.log('end');
// start
// queue       ← синхронно, прямо сейчас
// end
// promise     ← микротаски, в порядке постановки
// asap
// setTimeout  ← макротаски, в порядке постановки
// async
\`\`\`

\`asap\` вышел после \`promise\` только потому, что промис запланирован раньше: оба — микротаски. А \`async\` — обычная макротаска, наравне с \`setTimeout\`.

### queueScheduler — синхронно, но через очередь

Без задержки \`queueScheduler\` выполняет работу сразу. Отличие от простого вызова функции видно при вложенном планировании: если внутри работы запланировать ещё одну, она не выполнится рекурсивно, а встанет в очередь и запустится после текущей:

\`\`\`ts
queueScheduler.schedule(() => {
  queueScheduler.schedule(() => console.log('inner'));
  console.log('outer done');
});
// outer done
// inner        ← не вложенный вызов, а следующий в очереди

// рекурсия без роста стека: state передаётся третьим аргументом
queueScheduler.schedule(function (n) {
  console.log('tick', n);
  if (n < 3) this.schedule(n + 1);
}, 0, 1);
// tick 1, tick 2, tick 3
\`\`\`

Такая техника называется trampolining (батут): вместо глубокой рекурсии — плоский цикл по очереди. Она защищает от переполнения стека, когда операторы рекурсивно планируют работу (например, \`repeat\` или \`expand\` на синхронных источниках).

### asapScheduler — микротаска

\`asapScheduler\` выполняет работу после всего текущего синхронного кода, но до любых таймеров. В RxJS 7 он построен на \`Promise.resolve().then(...)\`:

\`\`\`ts
import { of, scheduled, asapScheduler, asyncScheduler } from 'rxjs';

console.log('before');
of(1, 2, 3).subscribe(v => console.log('of', v));
scheduled([1, 2, 3], asyncScheduler).subscribe(v => console.log('async', v));
scheduled([1, 2, 3], asapScheduler).subscribe(v => console.log('asap', v));
console.log('after');
// before, of 1, of 2, of 3, after, asap 1, asap 2, asap 3, async 1, async 2, async 3
\`\`\`

Полезен, когда нужно «чуть позже, но в этом же обороте цикла событий» — например, отложить эмиссию, чтобы она не попала в середину текущего обработчика.

### asyncScheduler — макротаска и все операторы со временем

\`asyncScheduler\` планирует работу через \`setInterval\`, то есть как обычную макротаску. Это планировщик по умолчанию для \`delay\`, \`interval\`, \`timer\`, \`debounceTime\`, \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`timeout\`. Все они принимают планировщик последним аргументом — именно это позволяет подменять время в тестах:

\`\`\`ts
interval(1000);                     // = interval(1000, asyncScheduler)
debounceTime(300, testScheduler);   // в тесте — виртуальное время
\`\`\`

### animationFrameScheduler — перед отрисовкой кадра

\`animationFrameScheduler\` выполняет работу в \`requestAnimationFrame\`, перед тем как браузер нарисует кадр. Изменения DOM, сделанные там, попадают ровно в ближайший кадр — без лишних перерисовок и рывков. Рядом есть функция создания \`animationFrames()\`: она выдаёт \`{ timestamp, elapsed }\` на каждом кадре. В примере \`takeWhile(условие, true)\` пропускает значения, пока условие верно, а флаг \`true\` пропускает ещё и первое неверное — финальную позицию.

\`\`\`ts
// плавно двигаем элемент 1 секунду
animationFrames().pipe(
  map(({ elapsed }) => Math.min(elapsed / 1000, 1)),
  takeWhile(progress => progress < 1, true)        // true: пропустить и финальное 1
).subscribe(progress => box.style.transform = \`translateX(\${progress * 300}px)\`);
\`\`\`

Важная деталь: \`observeOn(animationFrameScheduler)\` **не прореживает** значения. Пять синхронных значений (\`range(1, 5)\` выдаёт 1…5 синхронно) будут доставлены все пять, просто в одном кадре. Чтобы получить «одно, последнее значение на кадр», используют \`auditTime(0, animationFrameScheduler)\`:

\`\`\`ts
range(1, 5).pipe(observeOn(animationFrameScheduler)).subscribe(console.log);
// 1 2 3 4 5 — все в одном кадре

range(1, 5).pipe(auditTime(0, animationFrameScheduler)).subscribe(console.log);
// 5 — только последнее, в следующем кадре
\`\`\`

\`auditTime(ms)\` при первом значении открывает окно и в конце окна отдаёт последнее значение; с нулевым окном на rAF-планировщике окно длится до следующего кадра.

### \`scheduled\` вместо аргумента-планировщика

Раньше планировщик передавали прямо в функции создания: \`of(1, 2, 3, queueScheduler)\`. В RxJS 7 этот аргумент помечен устаревшим (будет удалён в v8), вместо него — \`scheduled\`:

\`\`\`ts
of(1, 2, 3, queueScheduler);               // устарело
scheduled([1, 2, 3], queueScheduler);      // так правильно
\`\`\`

### subscribeOn — когда произойдёт подписка

\`subscribeOn(scheduler)\` откладывает **подписку** на всё, что выше него, в контекст планировщика. Сам источник при этом не меняется: он просто стартует позже. Проверим на источнике, который печатает момент подписки, и на \`startWith\` (выдать значение сразу при подписке):

\`\`\`ts
const source$ = new Observable(s => { console.log('source subscribed'); s.next('value'); s.complete(); });

console.log('A before');
source$.pipe(subscribeOn(asyncScheduler), startWith('start')).subscribe(v => console.log('A', v));
console.log('A after');
// A before, A start, A after, source subscribed, A value

console.log('B before');
source$.pipe(startWith('start'), subscribeOn(asyncScheduler)).subscribe(v => console.log('B', v));
console.log('B after');
// B before, B after, B start, source subscribed, B value
\`\`\`

Для источника позиция \`subscribeOn\` не важна — он стартует асинхронно в обоих случаях. Но операторы **ниже** \`subscribeOn\` подписываются синхронно: в варианте A \`startWith\` успел выдать значение до \`A after\`. Поэтому «место \`subscribeOn\` в \`pipe\` не имеет значения» — упрощение: оно не важно для источника, но важно для операторов, которые что-то делают в момент подписки.

### observeOn — где доставляются значения

\`observeOn(scheduler)\` перехватывает каждое уведомление и пересылает его дальше через планировщик. Влияет только на то, что **ниже**. Здесь \`tap\` просто печатает значение, не меняя его:

\`\`\`ts
console.log('C before');
of(1, 2).pipe(
  tap(v => console.log('tap above', v)),
  observeOn(asapScheduler),
  tap(v => console.log('tap below', v))
).subscribe(v => console.log('C', v));
console.log('C after');
// C before, tap above 1, tap above 2, C after, tap below 1, C 1, tap below 2, C 2
\`\`\`

Всё выше \`observeOn\` отработало синхронно, всё ниже — в микротасках. Поэтому позиция \`observeOn\` критична, и его ставят как можно ниже — ближе к месту, где значение реально используется (например, к обновлению DOM).

### TestScheduler — виртуальное время для тестов

\`TestScheduler\` из \`rxjs/testing\` подменяет время внутри \`run()\`: все операторы со временем начинают работать на виртуальных часах, и тест на \`debounceTime(300)\` выполняется мгновенно:

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';
import { debounceTime } from 'rxjs';

const scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

it('debounceTime ждёт 300 мс тишины', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const input$ = cold('a 100ms b 500ms c|');
    expectObservable(input$.pipe(debounceTime(300))).toBe('401ms b 201ms (c|)');
  });
});
// тест проходит: a съеден, b вышел через 300 мс тишины, c — сразу при complete
\`\`\`

В marble-записи каждый символ значения занимает 1 «кадр» времени, \`|\` — завершение, \`( )\` — события в один момент. Поэтому \`b\` (на 101-й мс) выходит на 401-й, а \`c\` выдаётся вместе с завершением на 603-й.

### Планировщики и Angular

В приложении на Zone.js \`setTimeout\`, \`setInterval\`, \`Promise\` и \`requestAnimationFrame\` пропатчены, поэтому после срабатывания любого планировщика Angular запускает change detection. Частый поток на \`animationFrameScheduler\` или \`interval(16)\` даёт 60 проверок в секунду — такие вещи выносят из зоны через \`NgZone.runOutsideAngular\`. В zoneless-режиме (в Angular 21 новые проекты создаются без Zone.js) таймеры сами по себе проверку не запускают: интерфейс обновится, только когда вы запишете результат в сигнал или шаблон получит значение через \`async\` pipe. Переход на zoneless меняет момент обновления UI в коде, который рассчитывал на «таймер сработал — экран обновился».

### Как выбрать

- **Ничего не нужно, хватает синхронности** → без планировщика, это поведение по умолчанию.
- **Рекурсивное синхронное планирование без переполнения стека** → \`queueScheduler\`.
- **«Сразу после текущего кода, но до таймеров»** → \`asapScheduler\`.
- **Таймеры, задержки, разбивка тяжёлой работы на макротаски, чтобы браузер успевал отрисовывать** → \`asyncScheduler\` (и он уже стоит по умолчанию в операторах со временем).
- **Анимации и изменения DOM, привязанные к кадрам** → \`animationFrameScheduler\`, \`animationFrames()\`, \`auditTime(0, animationFrameScheduler)\`.
- **Отложить старт тяжёлого источника** → \`subscribeOn\`; **перенести доставку результата** → \`observeOn\`.
- **Тесты с таймерами** → \`TestScheduler.run()\`.

### Где это применяется на практике

- **Unit-тесты сервисов и эффектов** с \`debounceTime\`, \`retry({ delay })\`, поллингом через \`interval\` — \`TestScheduler\` вместо реальных ожиданий.
- **Большие гриды и дашборды**: обновление позиции виртуального скролла или ширины колонок при ресайзе через \`auditTime(0, animationFrameScheduler)\` — максимум одно обновление DOM на кадр.
- **Анимации прогресса и drag-and-drop** через \`animationFrames()\`.
- **Обработка больших массивов порциями**: \`scheduled(chunks, asyncScheduler)\`, чтобы между порциями браузер успевал реагировать на ввод.
- **Потоковые котировки и телеметрия** с высокой частотой, вынесенные из зоны Angular.

## Важные нюансы и подводные камни

- **Думать, что RxJS асинхронен по умолчанию.** Нет: без планировщика \`of(1, 2, 3)\` отработает полностью синхронно, до строки после \`subscribe\`.
- **Ставить \`observeOn\` в начало \`pipe\` и ждать эффекта на подписку.** Он влияет только на доставку значений операторам ниже.
- **Считать позицию \`subscribeOn\` полностью неважной.** Для источника она действительно не важна, но операторы ниже \`subscribeOn\` (\`startWith\`, \`tap\` с подпиской) отработают синхронно.
- **Несколько \`subscribeOn\` в одной цепочке.** Распространённое утверждение «сработает только первый» неточно: каждый откладывает подписку, задержки складываются, а окончательный контекст старта источника задаёт ближайший к нему \`subscribeOn\`. Проверено: \`subscribeOn(asapScheduler), subscribeOn(asyncScheduler)\` подписывает источник в микротаске **после** макротаски.
- **\`animationFrameScheduler\` в фоновой вкладке.** Браузеры приостанавливают \`requestAnimationFrame\` в скрытых вкладках, поток «замирает» до возврата пользователя.
- **\`observeOn(animationFrameScheduler)\` не прореживает поток.** Все значения доставляются, просто в ближайшем кадре; для «одного на кадр» нужен \`auditTime(0, animationFrameScheduler)\`.
- **\`delay > 0\` отменяет особенности планировщика.** \`asapScheduler.schedule(work, 10)\` — это обычный таймер, а не микротаска.
- **Аргумент-планировщик у \`of\`, \`from\`, \`merge\` устарел.** Используйте \`scheduled(...)\` или \`observeOn\`.
- **Планировщики и Zone.js.** Каждое срабатывание пропатченного таймера или микротаски в зоне — повод для change detection; планирование в микротаску меняет момент проверки, и такие баги легко неправильно диагностировать. В zoneless-режиме обновление UI нужно явно привязать к сигналу или \`async\` pipe.
- **\`observeOn\` добавляет «переход» на каждое значение.** На потоке в тысячи значений в секунду это заметные накладные расходы.

**Плюсы:** единый интерфейс для всех видов «когда»; контроль над нагрузкой на UI-поток и синхронизация с кадрами; виртуальное время делает тесты быстрыми и детерминированными.
**Минусы:** неочевидная семантика \`subscribeOn\` и \`observeOn\`; легко внести лишнюю асинхронность и гонки; взаимодействие с Zone.js и change detection трудно отлаживать; в прикладном коде нужны редко, поэтому знания быстро забываются.

## Как это спрашивают на собеседовании

**Главный вывод:** планировщик решает, когда выполнить работу: \`queue\` — синхронно через очередь, \`asap\` — микротаска, \`async\` — макротаска (по умолчанию в операторах со временем), \`animationFrame\` — перед отрисовкой. \`subscribeOn\` откладывает старт источника, \`observeOn\` переносит доставку значений всем, кто ниже.

Типичные формулировки: «Что такое scheduler в RxJS?», «Чем \`asapScheduler\` отличается от \`asyncScheduler\`?», «Чем \`subscribeOn\` отличается от \`observeOn\`?», «Как тестировать код с \`debounceTime\`?».

Что могут спросить следом:

- *RxJS асинхронный?* — Нет, синхронный по умолчанию; асинхронность появляется вместе с планировщиком или асинхронным источником.
- *На каком планировщике работают \`delay\` и \`interval\`?* — На \`asyncScheduler\`, его можно заменить последним аргументом.
- *Как сделать обновление DOM не чаще одного раза за кадр?* — \`auditTime(0, animationFrameScheduler)\`.
- *Зачем нужен \`queueScheduler\`?* — Чтобы рекурсивное синхронное планирование шло через очередь и не переполняло стек.
- *Как тест на \`debounceTime(300)\` выполнить мгновенно?* — \`TestScheduler.run()\` с виртуальным временем и marble-диаграммами.

### Ответ на 1 минуту

> Scheduler в RxJS решает, когда выполнить работу. По умолчанию RxJS синхронен, а планировщики подключаются там, где нужно «потом». \`queueScheduler\` выполняет работу синхронно, но через очередь, поэтому рекурсивное планирование не переполняет стек. \`asapScheduler\` ставит работу в микротаску — после текущего кода, но до таймеров. \`asyncScheduler\` работает на \`setInterval\`, и на нём по умолчанию построены \`delay\`, \`interval\`, \`debounceTime\`. \`animationFrameScheduler\` выполняет работу перед отрисовкой кадра — для анимаций и изменений DOM. \`subscribeOn\` откладывает момент подписки на источник, а \`observeOn\` переносит доставку значений операторам ниже себя, поэтому его позиция в \`pipe\` критична. На практике я использую \`auditTime(0, animationFrameScheduler)\`, чтобы обновлять DOM не чаще раза за кадр, а в тестах — \`TestScheduler\` с виртуальным временем, чтобы проверять таймеры мгновенно.`,
      en: `## In short

A scheduler answers the question **"when and in what context should this work run"**. It is an abstraction over "execute a chunk of code": right now, in a microtask, via \`setTimeout\`, or just before the next frame is painted.

Analogy: a scheduler is the **dispatcher in an office**. One task they tell you to do immediately, another "once you have cleared your desk", a third "put it on a timer", and a fourth "right before the screen refresh goes out".

## The four schedulers — what differs

1. **\`queueScheduler\`** — synchronous, but **through a queue**. It runs immediately by default; if another task is scheduled while one is running, it joins the queue instead of recursing. Saves you from stack overflow.
2. **\`asapScheduler\`** — a **microtask** (\`Promise.then\`/\`queueMicrotask\`). Runs after all the current synchronous code, but **before** any timers.
3. **\`asyncScheduler\`** — a **macrotask** (\`setTimeout\`/\`setInterval\`). \`delay\`, \`interval\`, and \`timer\` are built on it.
4. **\`animationFrameScheduler\`** — \`requestAnimationFrame\`. For animations synchronised with the browser's repaint.

## subscribeOn vs observeOn

These are two different "wheres":

- **\`subscribeOn(scheduler)\`** — where **the subscription itself** happens, i.e. where the source starts. It affects the **beginning**, and its position in the pipe is irrelevant — it always applies to the whole source.
- **\`observeOn(scheduler)\`** — where **notifications** (\`next\`/\`error\`/\`complete\`) are delivered to everything **downstream** of it. It affects **everything after itself**, so its position in the pipe is critical.

## Example

\`\`\`ts
of(1, 2, 3, queueScheduler).subscribe(console.log); // synchronous and ordered

source$.pipe(
  subscribeOn(asyncScheduler),        // subscription deferred to a macrotask
  map(heavyTransform),
  observeOn(animationFrameScheduler)  // emissions delivered inside rAF
);
\`\`\`

Why: \`subscribeOn\` shifts the **start** of the source so it does not block the current tick, while \`observeOn\` moves the **delivery** of results into the animation frame, so the DOM update lands exactly at repaint time and does not jank.

## What to say in the interview

> A scheduler in RxJS is an abstraction over when and in what context work runs; it governs concurrency and the timing of notification delivery. \`queueScheduler\` executes synchronously but through a queue, which protects against stack overflow on recursive scheduling; \`asapScheduler\` schedules into a microtask, so after the current synchronous code but before any timers; \`asyncScheduler\` is a macrotask on \`setTimeout\`, and it powers \`delay\`, \`interval\`, and \`timer\`; \`animationFrameScheduler\` uses \`requestAnimationFrame\` for animations synced with repaint. Also distinguish \`subscribeOn\` from \`observeOn\`: the first sets the context in which the subscription itself happens and applies to the whole chain regardless of its position in the pipe; the second sets the delivery context for every operator below it, so its position matters a lot. In practice schedulers are how you chunk heavy synchronous work without blocking the UI, and in tests they give you \`TestScheduler\` with virtual time for marble testing.

## Gotchas

- **Assuming RxJS is async by default** — it is not. Without a scheduler, \`of(1,2,3)\` runs completely synchronously.
- **Putting \`observeOn\` at the top of the pipe** and expecting it to affect subscription — it only affects what is below.
- **Putting \`subscribeOn\` at the bottom** and expecting that to change something — it applies to the whole source regardless of position.
- **Several \`subscribeOn\` calls in one pipe** — only the **first** takes effect, the rest are ignored.
- **\`animationFrameScheduler\` in a background tab** — rAF does not tick there, so the stream freezes.
- **Follow-up question**: how does \`asapScheduler\` interact with Zone.js and zoneless? Scheduling into a microtask changes when change detection fires, which is easy to misdiagnose.`
    }
  },
  {
    id: 'rxjs-013',
    category: 'rxjs',
    level: 'Expert',
    tags: ['custom-operator', 'operatorfunction', 'pipe'],
    question: {
      ru: 'Как написать собственный оператор RxJS? Объясните OperatorFunction и использование pipe.',
      en: 'How do you write a custom RxJS operator? Explain OperatorFunction and the use of pipe.'
    },
    answer: {
      ru: `## В чём суть

Оператор RxJS — это **обычная функция**, которая принимает Observable и возвращает новый Observable. Никакой магии: тип \`OperatorFunction<T, R>\` расшифровывается как \`(source: Observable<T>) => Observable<R>\`, а метод \`.pipe()\` просто по очереди прогоняет источник через такие функции. Значит, свой оператор — это своя функция с той же сигнатурой: либо собранная из готовых операторов, либо написанная с нуля через \`new Observable\`.

Аналогия: оператор — это **насадка на шланг**. На входе шланг, на выходе шланг, внутри что-то происходит с водой: фильтр, распылитель, счётчик. Свою насадку можно **собрать из готовых деталей** (фильтр + распылитель в одном корпусе) или **выточить с нуля**, если нужной детали нет в магазине. Главное — соблюдать стандарт резьбы: вход и выход должны подходить к любому шлангу.

**Какую проблему решает.** В Angular-проекте одни и те же цепочки повторяются десятками: \`debounceTime(300)\` + \`distinctUntilChanged()\` + \`switchMap(...)\` в каждом поле поиска, одна и та же политика повторов в каждом сервисе, одна и та же обёртка «загрузка / данные / ошибка». Копипаста расходится: где-то забыли \`distinctUntilChanged\`, где-то поставили другую задержку. Собственный оператор даёт этой логике имя, тип и одно место для изменений, а читается цепочка как предложение: \`input$.pipe(searchInput(300))\`.

## Словарик терминов

- **Оператор (pipeable operator)** — функция вида «поток → поток», которую передают в \`.pipe()\`: \`map(...)\`, \`filter(...)\`, ваш \`searchInput(300)\`.
- **Фабрика оператора** — функция, которая принимает настройки и **возвращает** оператор. \`map(x => x * 2)\` — вызов фабрики \`map\`, а результат — сам оператор.
- **\`OperatorFunction<T, R>\`** — тип оператора: принимает \`Observable<T>\`, возвращает \`Observable<R>\`. Тип значений может меняться (\`T\` → \`R\`).
- **\`MonoTypeOperatorFunction<T>\`** — частный случай \`OperatorFunction<T, T>\`: тип значений не меняется (фильтры, задержки, логирование).
- **\`UnaryFunction<T, R>\`** — самый общий тип «функция одного аргумента»; \`OperatorFunction\` — его частный случай для потоков.
- **Метод \`.pipe()\`** — метод Observable, который **применяет** операторы к конкретному потоку: \`source$.pipe(a, b)\`.
- **Функция \`pipe()\`** — функция из \`rxjs\`, которая **склеивает** операторы в новый оператор, ещё не привязанный ни к какому потоку: \`pipe(a, b)\`.
- **\`new Observable(subscribe)\`** — конструктор потока «с нуля»: вы сами описываете, что делать при подписке и как отдавать значения через \`subscriber\`.
- **Subscriber (подписчик)** — объект с методами \`next\`, \`error\`, \`complete\`, через которые поток отдаёт уведомления дальше.
- **Teardown (функция очистки)** — функция, которую возвращают из \`new Observable\`; вызывается при отписке и освобождает ресурсы.
- **Ленивость (laziness)** — поток ничего не делает до подписки. Код внутри \`new Observable\` выполняется заново для каждой подписки.
- **Состояние на подписку (per-subscription state)** — переменные, которые создаются отдельно для каждого подписчика, а не одни на всех.
- **\`defer(factory)\`** — функция создания потока, которая вызывает \`factory\` в момент подписки, отдельно для каждого подписчика.
- **Type guard (\`v is T\`)** — функция-проверка, по результату которой TypeScript сужает тип значения.
- **Tree-shaking** — удаление сборщиком неиспользуемого кода из бандла.

## Как это работает под капотом

1. Вызов \`map(x => x * 2)\` ничего не делает с данными: он только **создаёт** оператор — функцию, которая ждёт поток.
2. \`source$.pipe(op1, op2, op3)\` вычисляет \`op3(op2(op1(source$)))\`, поэтому на выходе получается новый Observable, обёрнутый тремя слоями. Данные ещё не текут — всё лениво.
3. При \`subscribe()\` подписка идёт **снизу вверх**: внешний слой подписывается на свой источник, тот — на свой, и так до исходного потока.
4. Значения текут **сверху вниз**: исходный поток отдаёт значение первому оператору, тот после обработки — следующему, и так до подписчика.
5. При отписке очистка снова идёт вверх: каждый слой вызывает свой teardown и отписывается от источника. Поэтому оператор, который «забыл» про teardown, оставляет работающий источник.

Сам метод \`.pipe()\` устроен до смешного просто — это \`reduce\`:

\`\`\`ts
// упрощённо: метод Observable.prototype.pipe
pipe(...operators) {
  return operators.reduce((prev, op) => op(prev), this);
}

// и функция pipe из 'rxjs' — то же самое, но без источника
function pipe(...fns) {
  return (input) => fns.reduce((prev, fn) => fn(prev), input);
}
\`\`\`

### Пример 1. Оператор — это просто функция

\`\`\`ts
import { of, map } from 'rxjs';

const double = (source: Observable<number>) => source.pipe(map(x => x * 2));
const plusOne = (source: Observable<number>) => source.pipe(map(x => x + 1));

plusOne(double(of(1, 2))).subscribe(console.log); // 3, 5
of(1, 2).pipe(double, plusOne).subscribe(console.log); // 3, 5 — то же самое
\`\`\`

\`double\` и \`plusOne\` — готовые операторы без всяких фабрик. Обратите внимание: в \`.pipe()\` их передают без скобок, потому что они уже являются функциями «поток → поток». Фабрика нужна, только когда оператору требуются параметры.

### Способ 1. Композиция готовых операторов через \`pipe()\`

Самый частый и самый безопасный способ: склеить существующие операторы функцией \`pipe\` и вернуть результат из фабрики:

\`\`\`ts
import { pipe, debounceTime, distinctUntilChanged, MonoTypeOperatorFunction, filter, map, of } from 'rxjs';

// поле поиска: подождать паузу и не реагировать на тот же текст
export function searchInput<T>(ms: number): MonoTypeOperatorFunction<T> {
  return pipe(debounceTime(ms), distinctUntilChanged());
}
input$.pipe(searchInput(300));

// функция pipe возвращает оператор, который можно вызвать и напрямую
const evensTimesTen = pipe(filter((n: number) => n % 2 === 0), map(n => n * 10));
of(1, 2, 3, 4).pipe(evensTimesTen).subscribe(console.log); // 20, 40
evensTimesTen(of(5, 6)).subscribe(console.log);            // 60
\`\`\`

Здесь \`debounceTime(ms)\` пропускает значение после \`ms\` миллисекунд тишины, \`distinctUntilChanged()\` отбрасывает значение, равное предыдущему. Мы не написали ни строчки логики — только дали имя проверенной комбинации. Так закрывается подавляющее большинство задач.

### Типизация: \`OperatorFunction\` и \`MonoTypeOperatorFunction\`

Если тип значений меняется, возвращайте \`OperatorFunction<In, Out>\`. Классический пример — убрать \`null\` и \`undefined\` и сузить тип:

\`\`\`ts
import { OperatorFunction, filter } from 'rxjs';

export function filterNullish<T>(): OperatorFunction<T | null | undefined, T> {
  return filter((v): v is T => v != null);
}

of(1, null, 2, undefined).pipe(filterNullish()); // Observable<number>
\`\`\`

Конструкция \`(v): v is T => ...\` — type guard: она говорит TypeScript, что после фильтра значения имеют тип \`T\`. Начиная с TypeScript 5.5 компилятор умеет сам вывести такой предикат для простых проверок вроде \`v => v != null\` (проверено на TypeScript 5.9), но явная запись понятнее и работает в любой версии.

### Состояние на подписку: \`defer\`

Операторам часто нужно состояние: счётчик, флаг «уже было». Если положить его в замыкание фабрики, оно станет общим для всех подписчиков. \`defer\` создаёт поток заново при каждой подписке — и состояние вместе с ним:

\`\`\`ts
import { defer, map, of, OperatorFunction } from 'rxjs';

export function withIndex<T>(): OperatorFunction<T, [number, T]> {
  return (source) => defer(() => {
    let i = 0;                                  // своё для каждой подписки
    return source.pipe(map(v => [i++, v] as [number, T]));
  });
}

const indexed$ = of('a', 'b').pipe(withIndex());
indexed$.subscribe(console.log); // [0, 'a'], [1, 'b']
indexed$.subscribe(console.log); // [0, 'a'], [1, 'b'] — счётчик не продолжился
\`\`\`

Если бы \`let i = 0\` стоял до \`defer\`, второй подписчик получил бы индексы 2 и 3. Так же ломается флаг на уровне модуля: «одноразовый» побочный эффект сработает только у первого подписчика за всё время жизни приложения.

### Способ 2. Оператор с нуля через \`new Observable\`

Нужен, когда поведения нет среди готовых операторов. Вы сами подписываетесь на источник и вручную передаёте уведомления дальше. Пример — выполнить побочное действие только на первом значении:

\`\`\`ts
import { Observable, MonoTypeOperatorFunction } from 'rxjs';

export function tapOnce<T>(fn: (v: T) => void): MonoTypeOperatorFunction<T> {
  return (source) => new Observable<T>((subscriber) => {
    let done = false;                               // состояние на подписку
    const sub = source.subscribe({
      next: (v) => {
        if (!done) { done = true; fn(v); }
        subscriber.next(v);
      },
      error: (e) => subscriber.error(e),            // проксируем ошибку
      complete: () => subscriber.complete()         // и завершение
    });
    return () => sub.unsubscribe();                 // teardown обязателен
  });
}

const src$ = of(1, 2, 3).pipe(tapOnce(v => console.log('первое:', v)));
src$.subscribe(console.log); // первое: 1, затем 1, 2, 3
src$.subscribe(console.log); // первое: 1, затем 1, 2, 3 — у второй подписки свой флаг
\`\`\`

Три обязательных правила: **проксировать все три уведомления** (\`next\`, \`error\`, \`complete\`), **вернуть teardown**, который отписывает от источника, и **держать состояние внутри функции подписки** — тогда оно своё у каждого подписчика. Вместо \`() => sub.unsubscribe()\` можно вернуть саму подписку: \`return source.subscribe({...})\`.

### Ловушка: исключение в вашем колбэке

У ручного оператора есть неочевидная дыра. Если \`fn\` бросит исключение, оно возникнет внутри \`next\` обычного объекта-наблюдателя, а такие ошибки RxJS не передаёт в канал \`error\`, а сообщает как необработанные — асинхронно:

\`\`\`ts
of(1, 2).pipe(tapOnce(() => { throw new Error('fn failed'); }))
  .subscribe({ next: v => console.log('next', v), error: e => console.log('error', e.message) });
// next 2          ← значение 1 потеряно
// (complete)
// ...и позже «fn failed» как необработанная глобальная ошибка
\`\`\`

Встроенный \`tap\` ведёт себя правильно: его исключение уходит подписчику как \`error\`. В ручном операторе это нужно сделать самому:

\`\`\`ts
next: (v) => {
  if (!done) {
    done = true;
    try { fn(v); } catch (err) { subscriber.error(err); return; }
  }
  subscriber.next(v);
}
// теперь: error fn failed
\`\`\`

Это ещё один аргумент за способ 1: в композиции готовых операторов такие детали уже учтены.

### Без teardown источник продолжает работать

\`\`\`ts
function noTeardown<T>(): MonoTypeOperatorFunction<T> {
  return (source) => new Observable<T>(subscriber => {
    source.subscribe({ next: v => subscriber.next(v), error: e => subscriber.error(e), complete: () => subscriber.complete() });
    // ничего не вернули
  });
}

const sub = interval(10).pipe(noTeardown()).subscribe();
sub.unsubscribe();
// interval продолжает тикать: за следующие 50 мс — ещё 4 тика, которые никто не получит
\`\`\`

Подписчик закрыт, но связь с источником никто не разорвал. Для \`interval\` это утечка таймера, для WebSocket — висящее соединение.

### Практический оператор: состояние загрузки

Частая задача в интерфейсе — превратить запрос в объект «загрузка / данные / ошибка». \`startWith(x)\` выдаёт \`x\` сразу при подписке, \`catchError\` заменяет ошибку обычным значением:

\`\`\`ts
import { OperatorFunction, map, startWith, catchError, of } from 'rxjs';

type LoadState<T> = { loading: boolean; data?: T; error?: unknown };

export function toLoadState<T>(): OperatorFunction<T, LoadState<T>> {
  return (source) => source.pipe(
    map((data): LoadState<T> => ({ loading: false, data })),
    startWith<LoadState<T>>({ loading: true }),
    catchError(error => of<LoadState<T>>({ loading: false, error }))
  );
}

of(['Ann', 'Bob']).pipe(toLoadState()).subscribe(console.log);
// { loading: true }
// { loading: false, data: ['Ann', 'Bob'] }

throwError(() => new Error('500')).pipe(toLoadState()).subscribe(console.log);
// { loading: true }
// { loading: false, error: Error('500') }
\`\`\`

В шаблоне это одно \`@if (state().loading)\` вместо трёх отдельных флагов в каждом компоненте.

### Почему операторы — функции, а не методы

До RxJS 5.5 операторы были методами прототипа: \`import 'rxjs/add/operator/map'\` дописывал \`map\` в \`Observable.prototype\` для всего приложения. Это мешало tree-shaking (сборщик не знал, какие операторы реально используются), создавало неявные глобальные зависимости и не позволяло писать свои операторы «на равных». В 5.5 появились pipeable-операторы, в RxJS 6 патчинг прототипа убрали из ядра (остался только в пакете совместимости \`rxjs-compat\`), а с RxJS 7.2 операторы импортируются прямо из \`'rxjs'\`. Свой оператор теперь ничем не отличается от встроенного.

### Где это применяется на практике

- **Поиск и фильтры**: \`searchInput(300)\` вместо копипасты \`debounceTime\` + \`distinctUntilChanged\` в каждом поле.
- **HTTP-слой**: \`retryWithBackoff()\` с единой политикой повторов, \`toLoadState()\` для спиннеров и ошибок.
- **Работа со стором**: \`filterNullish()\` после селекторов, \`selectSlice(key)\` с \`distinctUntilChanged\`.
- **Логирование и отладка**: \`debugTap('users$')\`, который пишет в консоль только в dev-режиме.
- **Большие гриды**: оператор, который пакетирует изменения строк в одно обновление на кадр.

## Важные нюансы и подводные камни

- **Состояние снаружи фабрики** (\`let done\` на уровне модуля или в замыкании фабрики) — все подписки начнут делить его. Классическая ошибка; лечится \`defer\` или переносом в функцию подписки.
- **Забыть teardown** — источник продолжит работать после отписки потребителя.
- **Проксировать только \`next\`** — ошибки и завершение потеряются, поток «зависнет» у подписчика навсегда.
- **Исключение в колбэке ручного оператора** уходит мимо канала \`error\` как необработанная ошибка, а значение теряется. Оборачивайте вызов пользовательской функции в \`try/catch\` и отдавайте ошибку через \`subscriber.error\`.
- **Писать своё вместо \`scan\`/\`expand\`/\`windowTime\`** — сначала проверьте, что нужного оператора действительно нет; в RxJS их около сотни.
- **Путать функцию \`pipe()\` и метод \`.pipe()\`** — первая создаёт оператор, второй применяет операторы к потоку.
- **Больше 9 операторов в одном \`.pipe()\`** — типизация сдаётся: перегрузки описаны до девяти, дальше результат становится \`Observable<unknown>\`. Группируйте операторы в свои через \`pipe()\`.
- **\`Observable.lift\` и внутренние хелперы** вроде \`operate\` — не публичный API: \`lift\` помечен устаревшим и станет внутренним в v8. Пишите операторы через \`pipe()\` или \`new Observable\`.
- **Почему ушли от операторов-методов прототипа** — это сделали в RxJS 5.5–6, а не в 7: pipeable-функции поддерживают tree-shaking и не патчат глобальный прототип.

**Плюсы:** переиспользование и единое место для изменений; цепочки читаются как предложения из доменных слов; полная типизация; свои операторы работают наравне со встроенными и удаляются tree-shaking'ом, если не используются.
**Минусы:** ручная реализация через \`new Observable\` легко ломается (teardown, ошибки, общее состояние); лишний слой абстракции, если оператор используется один раз; неудачное имя прячет важное поведение вроде \`retry\` от читателя.

## Как это спрашивают на собеседовании

**Главный вывод:** оператор — это функция \`Observable<T> → Observable<R>\`, а \`.pipe()\` — это \`reduce\` по таким функциям. Свой оператор пишут композицией через \`pipe()\` (предпочтительно) или с нуля через \`new Observable\`, соблюдая три правила: проксировать все уведомления, вернуть teardown, держать состояние на подписку.

Типичные формулировки: «Как написать свой оператор RxJS?», «Что такое \`OperatorFunction\`?», «Чем функция \`pipe\` отличается от метода \`.pipe\`?», «Как сделать оператор с внутренним состоянием?».

Что могут спросить следом:

- *Чем \`MonoTypeOperatorFunction\` отличается от \`OperatorFunction\`?* — Первый не меняет тип значений: это \`OperatorFunction<T, T>\`.
- *Как дать каждому подписчику своё состояние?* — Объявить его внутри функции подписки \`new Observable\` или обернуть в \`defer\`.
- *Что будет без teardown?* — Источник продолжит работать после отписки: утечка таймеров, соединений, памяти.
- *Почему операторы стали функциями?* — С RxJS 5.5–6: tree-shaking и отсутствие патчинга глобального прототипа.
- *Как протестировать свой оператор?* — Marble-тестами в \`TestScheduler\`, как и встроенные.

### Ответ на 1 минуту

> Оператор в RxJS — это просто функция типа \`OperatorFunction<T, R>\`: принимает Observable и возвращает новый, а \`.pipe()\` по сути делает \`reduce\` по таким функциям. Поэтому свой оператор пишется двумя способами. Предпочтительный — композиция: функция \`pipe\` из \`rxjs\` склеивает готовые операторы в один, например \`searchInput\` из \`debounceTime\` и \`distinctUntilChanged\`, и это закрывает большинство задач. Второй — с нуля: возвращаю функцию, которая принимает источник и создаёт \`new Observable\`, подписывается на источник и вручную передаёт значения дальше. Тут важно проксировать \`next\`, \`error\` и \`complete\`, вернуть teardown, иначе источник продолжит работать после отписки, и держать состояние внутри функции подписки или в \`defer\`, чтобы оно не стало общим для всех подписчиков. Если тип значений не меняется, объявляю сигнатуру как \`MonoTypeOperatorFunction<T>\`.`,
      en: `## In short

An RxJS operator is **just a function** that takes an Observable and returns an Observable. No magic: the type \`OperatorFunction<T, R>\` reads as \`(source: Observable<T>) => Observable<R>\`, and \`.pipe()\` simply runs the source through a chain of such functions.

Analogy: an operator is a **nozzle for a hose**. A hose goes in, a hose comes out, and something happens to the water in between. Your own nozzle can either be **assembled from existing parts** (sprinkler + filter) or **machined from scratch**.

## Two ways — and when to use each

1. **Composing existing operators (preferred).** The \`pipe()\` function (the one imported from \`rxjs\`, not the method) glues several operators into one. This covers 90% of cases.
2. **"From scratch" via \`new Observable\`.** Needed when no built-in operator does what you want. Here you subscribe to the source yourself and proxy notifications by hand.

With way 2 you must:

- **proxy all three** notifications — \`next\`, \`error\`, \`complete\`;
- **return a teardown** that unsubscribes from the source, otherwise you leak;
- **preserve laziness**: everything inside \`new Observable\` must run only on subscribe.

\`MonoTypeOperatorFunction<T>\` is the special case of \`OperatorFunction<T, T>\` where the output type is unchanged.

## Example

\`\`\`ts
// Way 1: composition — simple and safe
function searchInput<T>(ms: number): MonoTypeOperatorFunction<T> {
  return pipe(debounceTime(ms), distinctUntilChanged());
}
input$.pipe(searchInput(300));

// Way 2: from scratch — a side effect on the first value only
function tapOnce<T>(fn: (v: T) => void): MonoTypeOperatorFunction<T> {
  return (source) => new Observable<T>((subscriber) => {
    let done = false;
    const sub = source.subscribe({
      next: (v) => {
        if (!done) { done = true; fn(v); }
        subscriber.next(v);
      },
      error: (e) => subscriber.error(e),
      complete: () => subscriber.complete()
    });
    return () => sub.unsubscribe(); // teardown is mandatory!
  });
}
\`\`\`

Why: in the first case we write no logic at all — we only reuse. In the second, \`done\` lives **inside the subscribe function**, not outside it, so each subscription gets its own state — that is what correct laziness looks like.

## What to say in the interview

> An operator in RxJS is simply a function of type \`OperatorFunction<T, R>\` — a function that takes an Observable and returns an Observable; \`.pipe()\` runs the source through a chain of them. So there are two ways to write your own. The first and preferred one is composition: the \`pipe\` function from \`rxjs\` glues several existing operators into one reusable operator, and that covers the overwhelming majority of cases. The second is implementing from scratch: return a function that takes the source and creates a \`new Observable\`, subscribes to the source, and manually proxies notifications. Three things matter there: proxy all three channels — \`next\`, \`error\`, and \`complete\`; return a teardown that unsubscribes from the source, or you leak; and keep all mutable state inside the subscribe function so laziness and per-subscription independence are preserved. If the value type does not change, it is cleaner to type the signature as \`MonoTypeOperatorFunction<T>\`.

## Gotchas

- **State outside the factory** (a module-level \`let done\`) — every subscription starts sharing it. The classic mistake.
- **Forgetting teardown** — the source keeps running after the consumer unsubscribes.
- **Proxying only \`next\`** — errors and completion are lost and the stream appears to hang.
- **Writing your own instead of \`scan\`/\`expand\`/\`windowTime\`** — first check the operator you want really does not exist.
- **Confusing the \`pipe()\` function with the \`.pipe()\` method** — the first builds an operator, the second applies operators to a stream.
- **Follow-up question**: why did RxJS 7 move away from patched prototype operators? Because pipeable functions are tree-shakeable and do not patch the Observable prototype.`
    }
  },
  {
    id: 'rxjs-014',
    category: 'rxjs',
    level: 'Hard',
    tags: ['memory-leak', 'takeuntil', 'unsubscription'],
    question: {
      ru: 'Какие есть стратегии отписки в Angular и как избежать утечек памяти?',
      en: 'What unsubscription strategies exist in Angular and how do you avoid memory leaks?'
    },
    answer: {
      ru: `## В чём суть

Утечка подписки — это когда компонент уже уничтожен, а подписка жива: её колбэки продолжают вызываться и **держат ссылку на компонент**. Сборщик мусора не может освободить такой компонент, а код продолжает обновлять мёртвый экран. Стратегий отписки несколько, и они выстраиваются по приоритету: \`async\` pipe и \`toSignal\` (отписываются сами), \`takeUntilDestroyed\`, классический \`takeUntil\` с \`Subject\` и ручной \`unsubscribe\`.

Аналогия: **подписка на журнал**. Вы съехали с квартиры, но подписку не отменили. Журналы продолжают приходить на старый адрес, почтовый ящик переполняется, а издательство продолжает тратить на вас бумагу. Отписка — это звонок в издательство при переезде; \`async\` pipe — договор аренды, в котором подписка отменяется автоматически при выезде.

**Какую проблему решает.** В одностраничном приложении компоненты постоянно создаются и уничтожаются: пользователь открывает карточку клиента, уходит в список, снова открывает. Если каждая карточка подписывается на \`interval\` или на \`BehaviorSubject\` в сервисе и не отписывается, то после десяти переходов работают десять «призрачных» подписок: память растёт, в консоли ошибки от обращения к уничтоженным объектам, на сервер летят лишние запросы поллинга. В больших enterprise-приложениях, которые держат открытыми весь рабочий день, это превращается в заметные тормоза к вечеру.

## Словарик терминов

- **Утечка памяти (memory leak)** — объект больше не нужен, но на него остаётся ссылка, поэтому память не освобождается.
- **Сборщик мусора (garbage collector, GC)** — часть движка JavaScript, которая удаляет объекты, недостижимые по ссылкам из «корней» (глобальные объекты, активные функции).
- **Подписка (\`Subscription\`)** — объект, возвращаемый \`subscribe()\`. Его метод \`unsubscribe()\` разрывает связь с источником и запускает очистку.
- **Конечный поток** — поток, который сам завершается: HTTP-запрос, \`of(1, 2)\`, \`timer(1000)\`. После завершения подписка закрывается автоматически.
- **Бесконечный поток** — поток без \`complete\`: \`interval\`, \`fromEvent\`, \`Subject\`, \`BehaviorSubject\`, \`valueChanges\` формы, события роутера. Без отписки живёт вечно.
- **\`async\` pipe** — пайп шаблона Angular, который подписывается на поток, отдаёт последнее значение в шаблон и отписывается при уничтожении компонента.
- **\`toSignal\`** — функция из \`@angular/core/rxjs-interop\`, превращающая Observable в сигнал; подписывается сразу и отписывается при уничтожении контекста, где создана.
- **\`DestroyRef\`** — объект Angular, представляющий жизненный цикл компонента, директивы или инжектора; через \`onDestroy(cb)\` на него вешают действия при уничтожении.
- **Контекст инъекции (injection context)** — места, где работает \`inject()\`: инициализаторы полей, конструктор, фабрики провайдеров, функции внутри \`runInInjectionContext\`. \`ngOnInit\` к ним не относится.
- **\`takeUntilDestroyed\`** — оператор Angular, завершающий поток при уничтожении текущего \`DestroyRef\`.
- **\`takeUntil(notifier$)\`** — оператор RxJS, завершающий поток при первом \`next\` потока-сигнала.
- **Higher-order оператор** — оператор, создающий внутренние подписки: \`switchMap\`, \`mergeMap\`, \`concatMap\`, \`exhaustMap\`.
- **\`shareReplay\`** — оператор, который делит одну подписку на источник между всеми подписчиками и повторяет последние значения новым.

## Как это работает под капотом

Как возникает утечка, по шагам:

1. Компонент подписывается на долгоживущий источник — например, на \`BehaviorSubject\` в сервисе с \`providedIn: 'root'\`.
2. Источник хранит подписчика в своём списке наблюдателей, подписчик хранит ваш колбэк, а колбэк через замыкание хранит \`this\` — компонент, а с ним его DOM, формы и данные.
3. Сервис живёт всё время работы приложения, поэтому вся цепочка «сервис → Subject → подписчик → колбэк → компонент» достижима из корня. Сборщик мусора её не тронет.
4. Пользователь уходит со страницы, Angular уничтожает компонент и убирает его из DOM, но колбэк продолжает вызываться на каждое новое значение.
5. Каждый повторный заход на страницу добавляет ещё одну подписку, поэтому память и число вызовов растут линейно с числом переходов.
6. \`unsubscribe()\` удаляет подписчика из списка источника и запускает teardown — цепочка разорвана, компонент становится недостижимым и собирается.

Все стратегии отписки отличаются только тем, **кто и когда вызывает шаг 6**: шаблон (\`async\` pipe), Angular через \`DestroyRef\` (\`toSignal\`, \`takeUntilDestroyed\`), ваш \`ngOnDestroy\` (\`takeUntil\`, ручной \`unsubscribe\`) или сам поток (\`take(1)\`, \`first()\`, HTTP).

### Пример 1. Утечку видно по счётчику наблюдателей

У любого \`Subject\` есть свойство \`observed\` — есть ли у него сейчас подписчики:

\`\`\`ts
import { BehaviorSubject } from 'rxjs';

const store = new BehaviorSubject(0);               // живёт в сервисе-синглтоне
const component = { update(v: number) { /* ... */ } };

const sub = store.subscribe(v => component.update(v));
console.log(store.observed);                        // true — store держит колбэк, а колбэк — component

sub.unsubscribe();
console.log(store.observed);                        // false — ссылка разорвана
\`\`\`

Пока \`observed\` равно \`true\`, объект \`component\` достижим через \`store\`, даже если на экране его давно нет.

### Стратегия 1. \`async\` pipe — подписка в шаблоне

Лучший вариант — вообще не писать \`subscribe\` в коде. Шаблон подпишется сам и сам отпишется при уничтожении компонента (и при подмене потока на другой):

\`\`\`ts
@Component({
  template: \`
    @if (user$ | async; as user) {
      <h2>{{ user.name }}</h2>
    }
  \`
})
export class UserCardComponent {
  readonly user$ = inject(UserService).currentUser$;
}
\`\`\`

Ноль ручного кода, забыть невозможно. Одна оговорка: каждый \`| async\` — отдельная подписка. Три \`| async\` на холодный HTTP-поток — три запроса; лечится одним \`@if (...; as user)\` или \`shareReplay\`.

### Стратегия 2. \`toSignal\` — поток как сигнал

В современном Angular данные из Observable чаще превращают в сигнал. \`toSignal\` подписывается сразу и отписывается, когда уничтожается контекст, где его вызвали:

\`\`\`ts
export class DashboardComponent {
  private readonly stats = inject(StatsService);
  readonly total = toSignal(this.stats.total$, { initialValue: 0 }); // Signal<number>
  // в шаблоне: {{ total() }}
}
\`\`\`

\`toSignal\` нужно вызывать в контексте инъекции (поле класса, конструктор) или передать ему \`injector\` в настройках. Опция \`manualCleanup: true\` отключает автоотписку — тогда подписка живёт до завершения потока. Стабилен с Angular 20.

### \`DestroyRef\` — на чём держится автоотписка

\`DestroyRef\` — это «жизненный цикл» текущего компонента или инжектора. Через него можно зарегистрировать любое действие при уничтожении, без \`ngOnDestroy\`:

\`\`\`ts
const destroyRef = inject(DestroyRef);
const unregister = destroyRef.onDestroy(() => console.log('компонент уничтожен'));
// unregister() — отменить регистрацию, destroyRef.destroyed — уже уничтожен?
\`\`\`

И \`toSignal\`, и \`takeUntilDestroyed\` внутри используют именно \`DestroyRef.onDestroy\`.

### Стратегия 3. \`takeUntilDestroyed\` — когда подписка нужна в коде

Если нужен побочный эффект (записать в форму, вызвать метод, отправить метрику), подписка в коде неизбежна. \`takeUntilDestroyed\` завершает поток при уничтожении компонента:

\`\`\`ts
export class FiltersComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly form = inject(FormBuilder).group({ query: [''] });

  // 1) в контексте инъекции (поле или конструктор) аргумент не нужен
  private readonly sync = this.form.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe(v => this.saveDraft(v));

  // 2) вне контекста инъекции (ngOnInit, обработчики событий) — передать DestroyRef явно
  ngOnInit() {
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcColumns());
  }
}
\`\`\`

Вызов \`takeUntilDestroyed()\` без аргумента в \`ngOnInit\` или другом методе падает с ошибкой \`NG0203: takeUntilDestroyed() can only be used within an injection context\` — Angular просто неоткуда взять \`DestroyRef\`. Тот же код ошибки получит и \`inject()\` в методе. Если \`DestroyRef\` к моменту подписки уже уничтожен, поток завершится сразу. В сервисе \`takeUntilDestroyed()\` привязывается к инжектору: для \`providedIn: 'root'\` это значит «до конца жизни приложения». Оператор появился в Angular 16 как developer preview и стабилен с Angular 19.

### Стратегия 4. \`takeUntil\` + \`Subject\` — классика

Работает в любой версии Angular и вообще без Angular: поток живёт, пока сигнал \`destroy$\` не выдал \`next\`:

\`\`\`ts
export class LegacyComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.stream$.pipe(takeUntil(this.destroy$)).subscribe(v => this.handle(v));
  }

  ngOnDestroy() {
    this.destroy$.next();      // именно next останавливает takeUntil
    this.destroy$.complete();  // гигиена: уведомить и отпустить прямых подписчиков destroy$
  }
}
\`\`\`

Что реально важно — проверено на RxJS 7.8. После \`destroy$.next()\` оператор \`takeUntil\` сам отписывается и от источника, и от \`destroy$\` (\`destroy$.observed\` становится \`false\`), поэтому утечки через \`destroy$\` нет и без \`complete()\`. А вот обратная ошибка опасна: **только \`complete()\` без \`next()\` ничего не останавливает** — \`takeUntil\` реагирует лишь на значение сигнала, и поток продолжает работать.

### Стратегия 5. Ручной \`unsubscribe\` и \`Subscription.add\`

Самый многословный вариант: собрать подписки в один контейнер и погасить в \`ngOnDestroy\`:

\`\`\`ts
private readonly subs = new Subscription();

ngOnInit() {
  this.subs.add(interval(1000).subscribe(() => this.tick()));
  this.subs.add(this.ws.messages$.subscribe(m => this.onMessage(m)));
}

ngOnDestroy() {
  this.subs.unsubscribe(); // закрывает все добавленные разом
}
\`\`\`

Работает надёжно, но требует дисциплины: забыли \`add\` — забыли отписку.

### Конечные операторы: \`take(1)\` и \`first()\`

Иногда поток нужен ровно на одно значение — тогда его делают конечным. \`take(1)\` берёт первое значение и завершает поток. \`first()\` делает то же, но если поток завершился без значений, бросает \`EmptyError: no elements in sequence\`:

\`\`\`ts
this.store.select(selectUser).pipe(take(1)).subscribe(user => this.prefill(user));
of().pipe(first()).subscribe({ error: e => console.log(e.name) }); // EmptyError
\`\`\`

Ловушка: если источник так и не выдаст значение (пользователь ещё не загружен, а компонент уже закрыт), подписка висит до первого значения. Для гарантии добавляют и \`takeUntilDestroyed\`.

### Почему \`takeUntil\` должен стоять последним

\`takeUntil\` завершает поток **выше себя**. Если после него стоит higher-order оператор, тот создаёт свои внутренние подписки, о которых \`takeUntil\` не знает:

\`\`\`ts
// ❌ takeUntil до switchMap
trigger$.pipe(
  takeUntil(destroy$),
  switchMap(() => interval(10))
).subscribe();
destroy$.next();
// внешний поток завершён, но внутренний interval продолжает тикать:
// switchMap завершается, только когда завершены и внешний, и текущий внутренний поток

// ✅ takeUntil последним — отписка рвёт всю цепочку, включая внутренние подписки
trigger$.pipe(switchMap(() => interval(10)), takeUntil(destroy$)).subscribe();
\`\`\`

Правило одинаково для \`takeUntilDestroyed\`. Плагины ESLint для RxJS умеют находить такие места автоматически.

### \`shareReplay\` тоже может держать подписку

\`shareReplay(1)\` по умолчанию **не отписывается от источника**, даже когда отписались все подписчики:

\`\`\`ts
const shared$ = interval(10).pipe(shareReplay(1));
const s = shared$.subscribe();
s.unsubscribe();
// interval продолжает работать: за следующие 40 мс — ещё 4 тика

const safe$ = interval(10).pipe(shareReplay({ bufferSize: 1, refCount: true }));
// после отписки последнего подписчика источник останавливается
\`\`\`

Для HTTP-кэша в сервисе это нормально (запрос всё равно конечный), а для бесконечных источников нужен \`refCount: true\`.

### Где это применяется на практике

- **Страницы-дашборды с поллингом**: \`timer(0, 30_000).pipe(switchMap(load), takeUntilDestroyed())\` (сразу и затем каждые 30 секунд) — опрос останавливается при уходе со страницы.
- **Большие гриды**: подписки на \`resize\`, скролл и события колонок с \`takeUntilDestroyed(this.destroyRef)\`.
- **Формы**: \`valueChanges\` для автосохранения черновика и зависимых полей.
- **WebSocket-котировки и уведомления**: \`toSignal\` в компоненте или \`async\` pipe в шаблоне, а сокет общий через \`shareReplay({ refCount: true })\`.
- **Диалоги и выпадающие панели**, которые создаются и уничтожаются десятки раз за сессию, — именно там утечки накапливаются быстрее всего.

## Важные нюансы и подводные камни

- **\`takeUntil\` не последним в \`pipe\`.** Внутренние подписки \`switchMap\` переживут отписку. Спрашивают почти всегда.
- **Только \`complete()\` без \`next()\`.** \`takeUntil\` не сработает, поток продолжит жить. Обратное (\`next()\` без \`complete()\`) не утечка: после \`next()\` \`takeUntil\` уже отпустил \`destroy$\`; \`complete()\` — гигиена для тех, кто подписан на \`destroy$\` напрямую. Распространённое «без \`complete()\` Subject останется висеть» — преувеличение.
- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`.** Упадёт с \`NG0203\`: там нет контекста инъекции; передайте \`DestroyRef\`, полученный через \`inject()\` в поле.
- **Вложенные \`subscribe\` внутри \`subscribe\`.** Внутренние никто не отпишет; используйте higher-order операторы, и одна отписка закроет всё.
- **«HTTP не нужно отписывать».** Запрос действительно завершится сам, но колбэк выполнится уже на уничтоженном компоненте (навигация, тост, запись в стор). Отписка ещё и отменяет незавершённый запрос.
- **Несколько \`| async\` на один холодный поток.** Это несколько подписок и несколько запросов; лечится одним \`@if (...; as x)\` или \`shareReplay\`.
- **\`shareReplay(1)\` без \`refCount\`.** Источник продолжает работать после ухода всех подписчиков.
- **Подписки в сервисах \`providedIn: 'root'\`.** Сервис живёт вечно, так что его подписки на бесконечные потоки — это осознанное решение, а не утечка, но только если сервис не подписывается заново при каждом вызове метода.
- **\`take(1)\` на потоке, который не выдаёт значений.** Подписка висит до первого значения; комбинируйте с \`takeUntilDestroyed\`.
- **Как искать утечки.** Снимок памяти в DevTools (Memory → Heap snapshot) до и после нескольких переходов; рост числа экземпляров компонента и detached-элементов DOM — признак утечки.

**Плюсы:** современные стратегии (\`async\` pipe, \`toSignal\`, \`takeUntilDestroyed\`) убирают ручной код и человеческий фактор; \`takeUntil\` и \`Subscription\` работают в любой версии; конечные операторы делают намерение явным.
**Минусы:** у каждой стратегии свои условия (контекст инъекции, позиция в \`pipe\`, \`refCount\`); ручные варианты легко забыть; утечки не видны сразу и проявляются только после долгой работы приложения.

## Как это спрашивают на собеседовании

**Главный вывод:** утечка — это живая подписка уничтоженного компонента, которая держит его в памяти. Порядок выбора: \`async\` pipe или \`toSignal\`, затем \`takeUntilDestroyed\`, затем \`takeUntil\` с \`Subject\`, затем ручной \`unsubscribe\`; оператор отписки ставится последним в \`pipe\`.

Типичные формулировки: «Как избежать утечек памяти с RxJS в Angular?», «Нужно ли отписываться от HTTP?», «Почему \`takeUntil\` должен быть последним?», «Чем \`takeUntilDestroyed\` лучше \`takeUntil\`?».

Что могут спросить следом:

- *Почему \`takeUntilDestroyed()\` падает в \`ngOnInit\`?* — Там нет контекста инъекции; нужно передать \`DestroyRef\` явно.
- *Нужно ли вызывать \`destroy$.complete()\`?* — Останавливает поток \`next()\`; \`complete()\` — гигиена, а вот один \`complete()\` без \`next()\` не сработает вовсе.
- *Какие потоки опасны?* — Бесконечные: \`interval\`, \`fromEvent\`, Subject-ы, \`valueChanges\`, события роутера.
- *Как \`async\` pipe решает проблему?* — Подписывается в шаблоне и отписывается при уничтожении компонента или смене потока.
- *Как найти утечку?* — Снимки памяти в DevTools до и после нескольких переходов по странице.

### Ответ на 1 минуту

> Утечка возникает, когда компонент уничтожен, а подписка жива: долгоживущий источник, например \`BehaviorSubject\` в сервисе, держит подписчика, а колбэк через замыкание держит компонент, и сборщик мусора не может его освободить. Опасны бесконечные потоки — \`interval\`, \`fromEvent\`, Subject-ы, \`valueChanges\`; HTTP завершается сам, но колбэк всё равно выполнится на мёртвом компоненте. По приоритету я выбираю \`async\` pipe или \`toSignal\`, где Angular отписывается сам, затем \`takeUntilDestroyed\` — без аргумента в поле или конструкторе, а в \`ngOnInit\` с явным \`DestroyRef\`, иначе ошибка NG0203. Классика — \`takeUntil\` с \`destroy$\`, где поток останавливает именно \`next()\`, и в крайнем случае \`Subscription.add\`. Главный нюанс: оператор отписки ставлю последним в \`pipe\`, иначе внутренние подписки \`switchMap\` переживут уничтожение компонента.`,
      en: `## In short

The component is destroyed but the subscription is alive — its callbacks keep running and **hold a reference to the component**. The garbage collector cannot reclaim it: that is a memory leak, plus bugs of the "updating an already-dead screen" variety.

Analogy: a **magazine subscription**. You moved out but never cancelled it — issues keep arriving at the old address and the mailbox fills with rubbish.

The key distinction: **infinite** streams (\`interval\`, \`fromEvent\`, \`Subject\`, \`BehaviorSubject\`) are dangerous; **completing** ones (HTTP) trigger teardown themselves and rarely leak.

## Four strategies, best to worst

1. **The \`async\` pipe** — preferred. The template subscribes and **unsubscribes itself** on destroy. Zero manual code, impossible to forget.
2. **\`takeUntilDestroyed\` (Angular 16+)** — for when you genuinely need a subscription in code. In an **injection context** (field initialiser, constructor) the argument can be omitted; in a method like \`ngOnInit\` you must pass \`DestroyRef\` explicitly.
3. **\`takeUntil\` + \`Subject\` (the classic)** — works everywhere, but needs a \`destroy$\` field, an \`ngOnDestroy\` hook, and \`next()\`/\`complete()\` calls. Easy to forget.
4. **\`Subscription.add\` / manual \`unsubscribe()\`** — collect all subscriptions into one object and kill them in \`ngOnDestroy\`. The most verbose option, a last resort.

## Example

\`\`\`ts
// 1. Best of all — no subscribe in code at all
readonly data$ = this.service.stream$; // template: {{ data$ | async }}

// 2. Need a side effect — takeUntilDestroyed
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(v => this.handle(v));
}

// 3. The classic, if you are on Angular < 16
private destroy$ = new Subject<void>();
ngOnInit() { this.s$.pipe(takeUntil(this.destroy$)).subscribe(); }
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
\`\`\`

Why: \`takeUntil\`/\`takeUntilDestroyed\` must be **last** in the pipe. If other operators follow them (a \`switchMap\`, say), the inner subscriptions those create can **outlive** the unsubscription and keep working.

## What to say in the interview

> A leak happens when the component is destroyed but the subscription is alive: its callbacks keep running and hold a reference to the component, so it is never garbage collected. Infinite streams are the dangerous ones — \`interval\`, \`fromEvent\`, Subjects; completing ones like HTTP trigger teardown themselves. Ranked: best is the \`async\` pipe, where the template subscribes and unsubscribes on destroy with no manual code; then \`takeUntilDestroyed\` from \`@angular/core/rxjs-interop\`, available since Angular 16, which picks up \`DestroyRef\` itself in an injection context and takes it explicitly in a method; then the classic \`takeUntil\` with a \`destroy$\` Subject and \`ngOnDestroy\`; and last, manual \`unsubscribe\` via \`Subscription.add\`. The crucial nuance is that \`takeUntil\` must be the last operator in the pipe, otherwise operators below it — especially higher-order ones — create subscriptions that outlive the unsubscription. And if the state is consumed through Signals, \`toSignal\` manages the lifecycle by itself.

## Gotchas

- **\`takeUntil\` not last in the pipe** — \`switchMap\`'s inner subscriptions outlive the unsubscription. Asked almost every time.
- **Forgetting \`destroy$.complete()\`** — the Subject itself lingers; \`next()\` without \`complete()\` is half the job.
- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** — it throws: there is no injection context there.
- **Nested \`subscribe\` inside \`subscribe\`** — nobody unsubscribes the inner ones. Use higher-order operators instead.
- **Assuming HTTP needs no unsubscription** — the request does complete on its own, but the callback runs on a destroyed component.
- **Several \`| async\` on one cold stream** — that is several subscriptions and several requests; fix with \`shareReplay\`.`
    }
  },
  {
    id: 'rxjs-015',
    category: 'rxjs',
    level: 'Medium',
    tags: ['debouncetime', 'throttletime', 'audittime', 'sampletime'],
    question: {
      ru: 'Сравните debounceTime, throttleTime, auditTime и sampleTime. Какой когда использовать?',
      en: 'Compare debounceTime, throttleTime, auditTime, and sampleTime. When do you use each?'
    },
    answer: {
      ru: `## В чём суть

Все четыре оператора решают одну задачу: поток «сыплет» значениями слишком часто, а обработать нужно реже. Различаются они двумя вещами: **какое значение выживает** (первое или последнее) и **что запускает отсчёт времени** (каждое новое значение, первое значение серии или собственные часы).

Формула в четыре фразы:

- **debounce** — «подожди тишины, потом отдай последнее».
- **throttle** — «отдай первое, потом не слушай».
- **audit** — «услышал — подожди и отдай последнее».
- **sample** — «по своим часам отдавай последнее».

Аналогия: вам без конца звонит болтливый коллега. Debounce — «перезвоню, когда ты замолчишь на 3 секунды». Throttle — «первый звонок принял, следующие 3 секунды трубку не беру». Audit — «после твоего звонка жду 3 секунды и перезваниваю узнать последние новости». Sample — «каждые 3 секунды сам звоню и спрашиваю, что нового, если было что-то новое».

**Какую проблему решает.** События интерфейса приходят очень часто: ввод — на каждую клавишу, \`scroll\` и \`mousemove\` — десятки раз в секунду, \`resize\` — на каждый пиксель. Если на каждое событие отправлять запрос или пересчитывать раскладку большой таблицы, получаются лишние запросы (деньги, нагрузка на сервер), гонки ответов и подтормаживающий интерфейс. Операторы прореживания оставляют ровно столько событий, сколько нужно задаче.

## Словарик терминов

- **Прореживание (rate limiting)** — уменьшение частоты значений в потоке: часть значений отбрасывается.
- **Окно (window)** — отрезок времени длиной \`ms\`, внутри которого оператор копит или игнорирует значения.
- **Leading (передний край)** — значение, выданное в **начале** окна, сразу по приходу.
- **Trailing (задний край)** — значение, выданное в **конце** окна: последнее, пришедшее за окно.
- **Тишина** — промежуток, когда поток не выдаёт значений. На неё опирается \`debounceTime\`.
- **Серия (burst)** — несколько значений подряд с маленькими интервалами: быстрый набор слова, прокрутка колёсиком.
- **Marble-диаграмма** — запись потока строкой, где время идёт слева направо: \`a 99ms b|\` — значение \`a\`, через 100 мс \`b\`, затем завершение.
- **\`asyncScheduler\`** — планировщик RxJS на основе \`setInterval\`; на нём по умолчанию работают все четыре оператора.
- **\`TestScheduler\`** — планировщик для тестов с виртуальным временем: таймеры срабатывают мгновенно и детерминированно.
- **\`distinctUntilChanged\`** — оператор, отбрасывающий значение, если оно равно предыдущему.
- **\`switchMap\`** — оператор, который на каждое значение запускает новый внутренний поток (например, запрос) и отменяет предыдущий.
- **Версии без \`Time\`** (\`debounce\`, \`throttle\`, \`audit\`, \`sample\`) — те же стратегии, но длительность окна задаёт другой поток, а не число миллисекунд.

## Как это работает под капотом

Механика каждого оператора по шагам:

1. **\`debounceTime(ms)\`**: каждое новое значение запоминается и **перезапускает** таймер на \`ms\`. Поэтому пока значения идут чаще, чем раз в \`ms\`, таймер не успевает сработать и ничего не выходит. Когда наступила тишина длиной \`ms\`, выходит последнее значение. При завершении источника отложенное значение выдаётся сразу.
2. **\`throttleTime(ms)\`**: если окна нет, значение выдаётся **сразу** (leading) и открывается окно на \`ms\`. Значения внутри окна отбрасываются. С опцией \`trailing: true\` последнее значение из окна запоминается и выдаётся в его конце, а это открывает новое окно.
3. **\`auditTime(ms)\`**: если окна нет, значение запоминается и открывается окно на \`ms\`; новые значения внутри окна **заменяют** запомненное. В конце окна выходит запомненное (самое свежее). Следующее окно откроет следующее значение.
4. **\`sampleTime(ms)\`**: в момент подписки запускаются **собственные часы** с периодом \`ms\`, независимые от значений. На каждом тике, если с прошлого тика пришло новое значение, выходит последнее. Если не пришло — тик пропускается.

Упрощённо \`debounceTime\` — это десяток строк:

\`\`\`ts
function debounceTime<T>(ms: number) {
  return (source: Observable<T>) => new Observable<T>(subscriber => {
    let timer: any, last: T, hasValue = false;
    const sub = source.subscribe({
      next: v => {
        last = v; hasValue = true;
        clearTimeout(timer);                              // новое значение отменяет старый таймер
        timer = setTimeout(() => { hasValue = false; subscriber.next(last); }, ms);
      },
      error: e => subscriber.error(e),
      complete: () => { clearTimeout(timer); if (hasValue) subscriber.next(last); subscriber.complete(); }
    });
    return () => { clearTimeout(timer); sub.unsubscribe(); };
  });
}
\`\`\`

### Общий входной поток для примеров

Все выводы ниже получены запуском в \`TestScheduler\` (виртуальное время). Источник: серия из четырёх значений с шагом 100 мс, пауза, ещё два значения, завершение. Окно у всех операторов — 250 мс:

\`\`\`text
источник:  a@0  b@100  c@200  d@300 ........ e@800  f@900 ........ complete@1500
\`\`\`

### debounceTime — дождаться паузы

\`\`\`ts
source$.pipe(debounceTime(250));
// d@550  f@1150  complete@1500
\`\`\`

Каждое из \`a\`, \`b\`, \`c\` было «перебито» следующим раньше, чем прошло 250 мс. После \`d\` наступила тишина — через 250 мс вышло \`d\`. Так же для \`e\` и \`f\`. Итог: по одному значению на серию, с задержкой после её окончания. Идеально для поиска: запрос уходит, когда человек перестал печатать.

### throttleTime — сразу первое, потом пауза

\`\`\`ts
source$.pipe(throttleTime(250));
// a@0  d@300  e@800  complete@1500
\`\`\`

\`a\` вышло мгновенно и открыло окно до 250. \`b\` и \`c\` попали в окно и отброшены. \`d\` пришло после окна — вышло сразу и открыло новое окно. Последнее значение серии (\`c\`) потеряно: по умолчанию \`throttleTime\` работает только по переднему краю.

Настройка краёв — третий аргумент (второй — планировщик):

\`\`\`ts
source$.pipe(throttleTime(250, asyncScheduler, { leading: true, trailing: true }));
// a@0  c@250  d@500  e@800  f@1050  complete@1500

source$.pipe(throttleTime(250, asyncScheduler, { leading: false, trailing: true }));
// c@250  d@500  f@1050  complete@1500
\`\`\`

С \`trailing: true\` в конце окна выходит последнее значение из окна, и это открывает новое окно — поэтому \`d\` вышло на 500, а не на 300.

### auditTime — услышал, подождал, отдал свежее

\`\`\`ts
source$.pipe(auditTime(250));
// c@250  d@550  f@1050  complete@1500
\`\`\`

\`a\` открыло окно 0–250; к его концу последним было \`c\` — оно и вышло. \`d\` открыло новое окно 300–550 и вышло в его конце. \`e\` открыло окно 800–1050, а к концу окна самым свежим было \`f\`. Похоже на throttle с хвостом, но без мгновенного первого значения: реакция всегда с задержкой, зато всегда самым свежим значением.

### sampleTime — снимок по собственным часам

\`\`\`ts
source$.pipe(sampleTime(250));
// c@250  d@500  f@1000  complete@1500
\`\`\`

Часы тикают на 250, 500, 750, 1000, 1250 независимо от источника. На тике 750 новых значений не было — тик пропущен. Главное отличие: окно открывают не события, а время, поэтому интервал между выходами стабилен.

### Что происходит при завершении потока

Важная и редко известная деталь. Источник \`a@0 b@100 complete@150\`, окно 250 мс:

\`\`\`text
debounceTime(250)            b@150  complete@150   ← отложенное выдаётся сразу при complete
throttleTime(250)            a@0    complete@150   ← b потеряно
throttleTime + trailing      a@0    b@250  complete@250   ← complete ждёт конца окна
auditTime(250)               b@250  complete@250   ← complete ждёт конца окна
sampleTime(250)              complete@150          ← b потеряно: тик не наступил
\`\`\`

Если последнее значение важно (например, финальная позиция ползунка), \`sampleTime\` и \`throttleTime\` без \`trailing\` его могут потерять.

### Непрерывный поток: кто вообще что-то выдаст

Источник выдаёт значение каждые 100 мс от \`a@0\` до \`j@900\` и после этого молчит:

\`\`\`text
debounceTime(250)   j@1150                  ← пока поток шёл, не вышло НИЧЕГО
throttleTime(250)   a@0  d@300  g@600  j@900
auditTime(250)      c@250  f@550  i@850  j@1150
\`\`\`

На \`mousemove\` или скролле тишина может не наступить никогда, и \`debounceTime\` будет молчать всё время, пока пользователь двигает мышь. Для гарантированной частоты обновлений нужны \`throttleTime\` или \`auditTime\`.

### Связка для поиска: \`distinctUntilChanged\` и \`switchMap\`

\`debounceTime\` редко живёт один. \`distinctUntilChanged()\` отбрасывает значение, равное предыдущему: ввели «ab», запрос ушёл, затем быстро стёрли и снова набрали «b» — после паузы опять «ab», и повторный запрос не нужен. \`switchMap\` отправляет запрос и отменяет предыдущий, если пришёл новый текст:

\`\`\`ts
this.searchControl.valueChanges.pipe(
  debounceTime(300),                       // ждём паузу в наборе
  distinctUntilChanged(),                  // тот же текст — не ищем снова
  switchMap(q => this.api.search(q))       // новый запрос отменяет старый
).subscribe(results => this.results.set(results));
\`\`\`

Порядок важен: \`debounceTime\` до \`switchMap\`, иначе запросы уйдут на каждую клавишу, а отменяться будут уже на сервере.

### Скролл и ресайз: мгновенная реакция с ограничением частоты

\`\`\`ts
fromEvent(window, 'scroll', { passive: true }).pipe(
  throttleTime(100, asyncScheduler, { leading: true, trailing: true }),
  takeUntilDestroyed()
).subscribe(() => this.updateStickyHeader());
\`\`\`

\`fromEvent\` превращает событие DOM в поток, \`takeUntilDestroyed()\` отписывает его при уничтожении компонента. \`leading\` даёт мгновенную реакцию на начало прокрутки, \`trailing\` гарантирует, что последнее положение будет учтено. Для обновлений DOM ровно в такт кадрам используют \`auditTime(0, animationFrameScheduler)\`: \`animationFrameScheduler\` выполняет работу перед отрисовкой кадра, поэтому окно длится до следующего кадра, и выходит одно, самое свежее значение на кадр.

### Версии без \`Time\`: окно задаёт другой поток

\`debounce\`, \`throttle\`, \`audit\` принимают функцию, которая для каждого значения возвращает поток-длительность; \`sample\` принимает поток-сигнал. Это нужно, когда длительность окна зависит от значения или от событий:

\`\`\`ts
// пауза зависит от значения: для 'd' — 50 мс, для остальных — 250 мс
source$.pipe(debounce(v => timer(v === 'd' ? 50 : 250)));
// d@350  f@1150  complete@1500

// снимок по клику: клики на 120, 620 и 1220 мс
source$.pipe(sample(clicks$));
// b@120  d@620  f@1220  complete@1500
\`\`\`

### Тестирование

Все четыре оператора по умолчанию работают на \`asyncScheduler\`, поэтому в тестах их проверяют через \`TestScheduler.run()\`, где время виртуальное:

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const input$ = cold('a 99ms b 99ms c 99ms d 499ms e 99ms f 599ms |');
  expectObservable(input$.pipe(throttleTime(250))).toBe('a 299ms d 499ms e 699ms |');
});
// тест проходит мгновенно, без реального ожидания 1.5 секунды
\`\`\`

### Как выбрать

- **Поиск по вводу, автосохранение формы, валидация на сервере** → \`debounceTime\`: ждём, пока человек закончит.
- **Скролл, ресайз, перетаскивание с мгновенной реакцией** → \`throttleTime\`, лучше с \`trailing: true\`.
- **«Самое свежее значение, но не чаще раза в N мс»** (прогресс загрузки, пересчёт ширины колонок, обновление DOM раз в кадр) → \`auditTime\`.
- **Периодический снимок состояния** (телеметрия, позиция курсора раз в секунду для совместного редактирования) → \`sampleTime\`.
- **Длительность зависит от значения или события** → \`debounce\`, \`throttle\`, \`audit\`, \`sample\`.

### Где это применяется на практике

- **Фильтры большого грида**: \`debounceTime(300)\` на текстовом фильтре перед серверным запросом.
- **Автосохранение черновика формы**: \`debounceTime(1000)\` + сохранение по очереди.
- **Виртуальный скролл и липкие заголовки таблиц**: \`auditTime(0, animationFrameScheduler)\` или \`throttleTime\` с \`trailing\`.
- **Защита кнопки «Обновить» от быстрых повторных кликов**: \`throttleTime(1000)\`.
- **Отправка аналитики и телеметрии**: \`sampleTime(5000)\` по положению или состоянию.

## Важные нюансы и подводные камни

- **\`debounceTime\` на непрерывном потоке** (\`mousemove\`) может не выдать **ничего**, пока поток идёт, — тишины просто не наступает.
- **\`debounceTime\` вместо \`throttleTime\` на скролле** — интерфейс «залипает»: реакция приходит только после остановки.
- **\`debounceTime\` без \`distinctUntilChanged\`** в поиске — повторный ввод того же текста пошлёт лишний запрос.
- **\`throttleTime\` по умолчанию только leading.** Последнее значение серии теряется; нужен хвост — \`{ leading: true, trailing: true }\`.
- **\`sampleTime\` не выдаёт, если значений не было.** Пустые тики просто пропускаются, а последнее значение перед \`complete\` может потеряться.
- **Поведение при \`complete\` разное.** \`debounceTime\` выдаёт отложенное сразу; \`auditTime\` и \`throttleTime\` с \`trailing\` ждут конца окна; \`sampleTime\` и \`throttleTime\` без \`trailing\` хвост теряют.
- **Окно \`auditTime\` и \`throttleTime\` открывает событие, окно \`sampleTime\` — часы.** Поэтому у \`sampleTime\` интервал между выходами стабилен, а у остальных зависит от потока.
- **Все четыре по умолчанию на \`asyncScheduler\`.** Каждое срабатывание — макротаска; в приложении на Zone.js это повод для change detection. В тестах подменяйте время через \`TestScheduler\`.
- **Старые marble-шпаргалки часто неточны.** Проверяйте поведение в \`TestScheduler\` на своих числах: позиции в строке — это кадры времени, и сдвиг на один символ меняет результат.

**Плюсы:** одна строка вместо ручных таймеров и флагов; меньше запросов и перерисовок; поведение описывается декларативно и тестируется на виртуальном времени.
**Минусы:** добавляют задержку реакции; легко выбрать «похожий» оператор с другим краем окна и потерять последнее значение; разное поведение при завершении потока неочевидно.

## Как это спрашивают на собеседовании

**Главный вывод:** \`debounceTime\` ждёт тишины и отдаёт последнее, \`throttleTime\` отдаёт первое и игнорирует остальное в окне, \`auditTime\` после первого значения ждёт окно и отдаёт самое свежее, \`sampleTime\` по собственным часам отдаёт последнее, если было новое.

Типичные формулировки: «Чем \`debounceTime\` отличается от \`throttleTime\`?», «Что поставить на поиск, а что на скролл?», «Почему \`debounceTime\` на \`mousemove\` ничего не выдаёт?», «Что такое leading и trailing?».

Что могут спросить следом:

- *Чем \`auditTime\` отличается от \`throttleTime\`?* — \`auditTime\` выдаёт значение в конце окна (trailing), \`throttleTime\` по умолчанию — в начале (leading).
- *Как не потерять последнее значение в \`throttleTime\`?* — \`{ leading: true, trailing: true }\`.
- *Чем \`sampleTime\` отличается от \`auditTime\`?* — Окно \`sampleTime\` идёт по своим часам с подписки, окно \`auditTime\` открывает пришедшее значение.
- *Чем \`debounce\` отличается от \`debounceTime\`?* — Длительность задаётся потоком, который можно вычислить из значения.
- *Как протестировать?* — \`TestScheduler.run()\` с marble-диаграммами и виртуальным временем.

### Ответ на 1 минуту

> Все четыре оператора прореживают слишком частый поток, но по-разному выбирают выжившее значение и по-разному запускают отсчёт времени. \`debounceTime\` перезапускает таймер на каждое значение и отдаёт последнее, только когда наступила тишина, — это классика для поиска вместе с \`distinctUntilChanged\` и \`switchMap\`. \`throttleTime\` отдаёт первое значение сразу и игнорирует остальные до конца окна, поэтому даёт мгновенную реакцию на скролл и ресайз; по умолчанию он теряет хвост серии, и я включаю \`trailing: true\`. \`auditTime\` после первого значения ждёт окно и отдаёт самое свежее, например для обновления DOM раз в кадр. \`sampleTime\` работает по собственным часам и раз в период отдаёт последнее, если было новое. Нюанс: на непрерывном потоке \`debounceTime\` может не выдать ничего, а все они работают на \`asyncScheduler\` и тестируются через \`TestScheduler\`.`,
      en: `## In short

All four solve one problem: the stream fires far too often and we need it to fire less. They differ in **which value survives** and **what starts the clock**.

The four-word formula:

- **debounce** — "wait for silence".
- **throttle** — "first one, then ignore".
- **audit** — "the latest at the end of the window".
- **sample** — "the latest on a clock tick".

Analogy: a chatty colleague keeps calling you. Debounce — "I will call back once you have been quiet for 3 seconds". Throttle — "I took the first call; for the next 3 seconds I am not picking up". Audit — "3 seconds after your first call I will ring back and ask for the latest". Sample — "every 3 seconds I call you myself and ask what is new".

## The four operators — what differs

1. **\`debounceTime(ms)\`** — emits a value only if **\`ms\` of silence** followed it. While the stream keeps going, emission is deferred. Marble: \`a-b-c----|\` → \`------c-|\`.
2. **\`throttleTime(ms)\`** — emits the **first** value immediately (leading), then ignores everything for \`ms\` milliseconds. Marble: \`a-b-c-d-e|\` → \`a---d---|\`.
3. **\`auditTime(ms)\`** — on a value it **waits \`ms\`** and emits whatever turned out to be **latest** by the end of the window. Like throttle, but trailing instead of leading.
4. **\`sampleTime(ms)\`** — runs on **its own timer**: every \`ms\` it emits the latest value, if there was one at all. Events do not start the window — the window runs by itself.

## When to use which

- **Search-as-you-type, form autosave** → \`debounceTime\`. Wait until the human stops typing.
- **Scroll, resize, mousemove** → \`throttleTime\`. You need an instant first reaction and a steady rate.
- **"The latest value at most once every N ms"** (progress updates) → \`auditTime\`.
- **Periodic state snapshots** (telemetry, coordinates once a second) → \`sampleTime\`.

## Example

\`\`\`ts
search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => api.search(q))
);

scroll$.pipe(throttleTime(100)).subscribe(updateHeader);
\`\`\`

Why: in search, extra requests cost money and create races, so we wait for the pause. In scrolling the opposite is true — the header must react immediately, and after that 10 updates a second is plenty.

## What to say in the interview

> All four are rate-limiting operators: they thin out a stream that emits too fast but pick the surviving value differently. \`debounceTime\` lets a value through only if \`ms\` of silence followed it, so while the stream keeps going emission is deferred — the classic search-as-you-type case. \`throttleTime\` emits the first value immediately and then ignores incoming ones for the window, giving an instant reaction, which scroll and resize need. \`auditTime\` is like throttle, but when a value appears it waits out the window and emits the latest one at expiry — trailing instead of leading. \`sampleTime\` is driven by its own timer rather than by events: every \`ms\` it emits the latest value if there was one — a periodic snapshot of the stream's state. One nuance: debounce on a busy stream may never fire while input continues, so when you need a guaranteed update rate you reach for throttle or audit; and all of them are built on \`asyncScheduler\`, which is what makes them testable with \`TestScheduler\` and virtual time.

## Gotchas

- **\`debounceTime\` on a continuous stream** (mousemove) may emit **never** — the silence never comes.
- **\`debounceTime\` instead of \`throttleTime\` on scroll** — the UI feels stuck, reacting only after you stop.
- **\`debounceTime\` without \`distinctUntilChanged\`** in search — retyping the same text fires a redundant request.
- **\`throttleTime\` is leading-only by default**: the last value of a burst is lost. Want the tail too? \`{ leading: true, trailing: true }\`.
- **\`sampleTime\` emits nothing when no value arrived** — empty ticks are simply skipped.
- **Follow-up question**: how do \`debounce\`/\`throttle\`/\`audit\`/\`sample\` (without \`Time\`) differ? They take an Observable duration instead of milliseconds, so the window is defined by another stream.`
    }
  },
  {
    id: 'rxjs-016',
    category: 'rxjs',
    level: 'Medium',
    tags: ['distinctuntilchanged', 'comparison'],
    question: {
      ru: 'Как работает distinctUntilChanged и какие подводные камни с объектами?',
      en: 'How does distinctUntilChanged work and what are the pitfalls with objects?'
    },
    answer: {
      ru: `## В чём суть

\`distinctUntilChanged\` пропускает значение, только если оно **отличается от предыдущего выданного**. Ключевое слово — **until changed**, «пока не изменилось»: оператор смотрит ровно на один шаг назад и не помнит всю историю. По умолчанию сравнение строгое, через \`===\`, поэтому объекты сравниваются **по ссылке** — и в этом главный подводный камень.

Аналогия: **охранник у турникета**, который помнит только последнего вошедшего. Тот же человек сразу следом — «вы же только что проходили», не пущу. Но если между ними прошёл кто-то другой, повторный проход разрешён. А ещё охранник узнаёт людей по лицу, а не по одежде: два близнеца в одинаковых куртках для него разные люди (разные объекты с одинаковыми полями), а один и тот же человек, переодевшийся в туалете, — тот же самый (мутированный объект).

**Какую проблему решает.** Потоки часто выдают одно и то же значение повторно: стор состояния отдаёт тот же срез после несвязанного изменения, форма выдаёт \`valueChanges\` на каждую клавишу, событие роутера приходит с тем же параметром. Каждый лишний повтор — это лишний HTTP-запрос, лишний пересчёт фильтров большой таблицы или лишняя перерисовка. \`distinctUntilChanged\` отсекает «ничего не изменилось» в одном месте, но только если правильно настроить, **что считать изменением**.

## Словарик терминов

- **Строгое равенство (\`===\`)** — сравнение без приведения типов. Для чисел и строк — по значению, для объектов и массивов — по ссылке. Особенности: \`NaN === NaN\` даёт \`false\`, \`0 === -0\` даёт \`true\`.
- **\`Object.is\`** — почти то же, что \`===\`, но \`Object.is(NaN, NaN)\` даёт \`true\`, а \`Object.is(0, -0)\` — \`false\`. Им по умолчанию сравнивают сигналы Angular.
- **Сравнение по ссылке (reference equality)** — два объекта равны, только если это один и тот же объект в памяти: \`{ a: 1 } === { a: 1 }\` даёт \`false\`.
- **Глубокое сравнение (deep equality)** — рекурсивное сравнение всех полей объекта. Точное, но дорогое на больших структурах.
- **Иммутабельное обновление** — изменение данных через создание нового объекта (\`{ ...state, name }\`), а не правку старого. Каждое такое обновление даёт новую ссылку.
- **Мутация** — изменение существующего объекта на месте: \`state.items.push(x)\`. Ссылка остаётся прежней.
- **Компаратор (comparator)** — функция \`(prev, curr) => boolean\`, отвечающая на вопрос «эти значения **одинаковые**?». \`true\` — значение будет отброшено.
- **Селектор ключа (keySelector)** — функция, которая вытаскивает из значения то, что нужно сравнивать: \`state => state.user.name\`.
- **\`distinctUntilKeyChanged(key)\`** — сокращённая форма для сравнения одного поля объекта.
- **\`distinct()\`** — оператор глобальной дедупликации: пропускает только значения, которых ещё не было **за всё время**.
- **Мемоизация (memoization)** — кэширование результата функции по её аргументам: те же входы — тот же результат и та же ссылка.
- **Селектор NgRx (\`createSelector\`)** — мемоизированная функция выборки среза состояния из стора.

## Как это работает под капотом

1. Первое значение проходит всегда: сравнивать его не с чем. Оператор запоминает его **ключ** — само значение или результат \`keySelector(value)\`, если он передан.
2. Приходит следующее значение, поэтому оператор вычисляет его ключ и вызывает компаратор \`comparator(предыдущийКлюч, текущийКлюч)\`. По умолчанию это \`(a, b) => a === b\`.
3. Компаратор вернул \`true\` («одинаковые»), поэтому значение **отбрасывается**, а запомненный ключ не меняется.
4. Компаратор вернул \`false\`, поэтому значение пропускается дальше, а его ключ становится новым «предыдущим».
5. Отсюда важное следствие: сравнение идёт с **последним выданным** значением, а не с последним пришедшим. Для обычного равенства разницы нет, но для «нечёткого» компаратора (например, «разница меньше 5») она проявляется.
6. Истории нет: оператор хранит ровно один ключ, поэтому \`1, 1, 2, 2, 3, 1\` даёт \`1, 2, 3, 1\` — последняя единица пройдёт, потому что перед ней выдана тройка.

Реализация почти дословно такая (RxJS 7):

\`\`\`ts
function distinctUntilChanged<T, K>(
  comparator: (prev: K, curr: K) => boolean = (a, b) => a === b,
  keySelector: (value: T) => K = (v) => v as unknown as K
) {
  return (source: Observable<T>) => new Observable<T>(subscriber => {
    let first = true;
    let previousKey: K;
    return source.subscribe({
      next: value => {
        const currentKey = keySelector(value);
        if (first || !comparator(previousKey, currentKey)) {
          first = false;
          previousKey = currentKey;   // запоминаем только выданное
          subscriber.next(value);
        }
      },
      error: e => subscriber.error(e),
      complete: () => subscriber.complete()
    });
  });
}
\`\`\`

### Пример 1. Примитивы: работает «из коробки»

\`\`\`ts
import { of, distinctUntilChanged } from 'rxjs';

of(1, 1, 2, 2, 3, 1).pipe(distinctUntilChanged()).subscribe(console.log);
// 1, 2, 3, 1 — убраны только соседние дубли

of('a', 'a', 'b', 'a').pipe(distinctUntilChanged()).subscribe(console.log);
// a, b, a
\`\`\`

Числа и строки сравниваются по значению, поэтому всё интуитивно. Классический случай — поиск: \`input$.pipe(debounceTime(300), distinctUntilChanged())\` не отправит повторный запрос, если после паузы в поле тот же текст.

### Пример 2. Объекты: сравнение по ссылке

\`\`\`ts
of({ a: 1 }, { a: 1 }, { a: 1 }).pipe(distinctUntilChanged()).subscribe(console.log);
// { a: 1 }, { a: 1 }, { a: 1 } — прошли все три: это три разных объекта

const o = { a: 1 };
of(o, o, o).pipe(distinctUntilChanged()).subscribe(console.log);
// { a: 1 } — один объект трижды, прошёл один раз
\`\`\`

Поскольку иммутабельные обновления **всегда** создают новый объект, \`distinctUntilChanged()\` без настройки на потоке состояния не отфильтрует вообще ничего.

### Ловушка с мутацией: изменение потерялось

Обратная проблема — мутировать объект и отправить ту же ссылку:

\`\`\`ts
const state = { items: [1] };
const store$ = new BehaviorSubject(state);

store$.pipe(distinctUntilChanged()).subscribe(s => console.log(s.items.length));
// 1

state.items.push(2);
store$.next(state);                                    // та же ссылка — ОТФИЛЬТРОВАНО
store$.next({ ...state, items: [...state.items, 3] }); // новая ссылка — 3
\`\`\`

Подписчик так и не увидел состояние с двумя элементами. Вывод: сравнение по ссылке работает только вместе с иммутабельными обновлениями.

### Свой компаратор

Первый аргумент — функция, которая говорит, **одинаковы ли** два значения:

\`\`\`ts
of({ id: 1, v: 'x' }, { id: 1, v: 'y' }, { id: 2, v: 'z' }).pipe(
  distinctUntilChanged((prev, curr) => prev.id === curr.id)
).subscribe(console.log);
// { id: 1, v: 'x' }, { id: 2, v: 'z' } — изменение v при том же id не считается изменением
\`\`\`

Частая ошибка — перепутать смысл возвращаемого значения и написать «пропустить, если разные»:

\`\`\`ts
of(1, 1, 2, 3).pipe(distinctUntilChanged((p, c) => p !== c)).subscribe(console.log);
// 1, 1 — логика перевёрнута: повтор прошёл, а изменения отброшены
\`\`\`

### \`distinctUntilKeyChanged\` — сравнить одно поле

Сокращение для частого случая «сравнить по полю». Вторым аргументом можно передать компаратор для значений этого поля:

\`\`\`ts
of({ id: 1, v: 'x' }, { id: 1, v: 'y' }, { id: 2, v: 'z' })
  .pipe(distinctUntilKeyChanged('id'))
  .subscribe(console.log);
// { id: 1, v: 'x' }, { id: 2, v: 'z' }

of({ name: 'Ann' }, { name: 'ANN' }, { name: 'Bob' })
  .pipe(distinctUntilKeyChanged('name', (a, b) => a.toLowerCase() === b.toLowerCase()))
  .subscribe(console.log);
// { name: 'Ann' }, { name: 'Bob' } — регистр не считается изменением
\`\`\`

### Селектор ключа — сравнить вложенный срез

Второй аргумент \`distinctUntilChanged\` вытаскивает из значения то, что реально важно. Сравниваться будут уже ключи, а наружу выйдут исходные значения целиком:

\`\`\`ts
state$.pipe(
  distinctUntilChanged(
    (a, b) => a === b,             // как сравнивать ключи
    (state) => state.user.name     // что считать ключом
  )
).subscribe(render);
// { user: Ann, settings: 1 } → выдано
// { user: Ann, settings: 2 } → отброшено: имя не изменилось
// { user: Bob, settings: 2 } → выдано
\`\`\`

Селектор превращает объект в строку, а строки сравниваются по значению. Смена \`state.settings\` больше не вызывает лишнюю перерисовку. В RxJS 7 при передаче селектора компаратор обязателен по типам, поэтому его пишут явно.

### Сравнение с последним выданным: «нечёткий» компаратор

\`\`\`ts
of(0, 3, 6, 9, 12).pipe(
  distinctUntilChanged((prev, curr) => Math.abs(prev - curr) < 5)  // «почти равны»
).subscribe(console.log);
// 0, 6, 12
\`\`\`

\`3\` близко к \`0\` — отброшено. \`6\` сравнивается **с \`0\`** (последним выданным), а не с \`3\`, — разница 6, выдано. \`9\` близко к \`6\` — отброшено. Так удобно гасить дребезг датчиков или мелкие колебания ширины контейнера: значение медленно «дрейфует», но выдаётся только при накопленном изменении.

### \`distinct\` — если нужна уникальность за всё время

\`\`\`ts
of(1, 2, 1, 3, 2).pipe(distinct()).subscribe(console.log);
// 1, 2, 3
\`\`\`

\`distinct\` хранит **все** встреченные значения во множестве (\`Set\`), поэтому на бесконечном потоке память растёт без предела. Ему можно передать селектор ключа и поток-сигнал для очистки множества: \`distinct(x => x.id, flushes$)\`.

### NaN и ноль со знаком

Поскольку по умолчанию используется \`===\`, а не \`Object.is\`:

\`\`\`ts
of(NaN, NaN, 1).pipe(distinctUntilChanged()).subscribe(console.log);
// NaN, NaN, 1 — NaN !== NaN, поэтому повтор НЕ отфильтрован

of(0, -0, 0).pipe(distinctUntilChanged()).subscribe(console.log);
// 0 — 0 === -0, поэтому -0 отфильтрован
\`\`\`

Сигналы Angular, наоборот, по умолчанию сравнивают через \`Object.is\`: для них повторный \`NaN\` — «не изменилось». Если поток может выдавать \`NaN\` (результат неудачного парсинга числа), передайте компаратор \`Object.is\`.

### Глубокое сравнение — осторожно

\`\`\`ts
distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b));
// JSON.stringify({ a: 1, b: 2 }) === JSON.stringify({ b: 2, a: 1 }) → false
\`\`\`

Такой компаратор зависит от порядка ключей, теряет \`undefined\`, функции и даты в исходном виде и сериализует весь объект на каждое значение. Глубокое сравнение вроде \`isEqual\` из lodash корректнее, но на больших объектах (строки грида на тысячи записей) тоже дорогое. Почти всегда дешевле сравнить один вычисленный ключ: \`id\`, \`updatedAt\`, версию.

### Angular и NgRx: где оператор уже стоит

\`store.select(...)\` в NgRx внутри уже применяет \`distinctUntilChanged()\` по ссылке, а селекторы \`createSelector\` мемоизированы: пока входные срезы те же, возвращается тот же объект. Поэтому в связке «иммутабельный стор + мемоизированные селекторы» дополнительный оператор не нужен. Сигналы и \`toSignal\` тоже не уведомляют подписчиков, если новое значение равно старому по \`Object.is\`; поведение меняется опцией \`equal\`. А вот в самописных сервисах состояния на \`BehaviorSubject\` и в \`valueChanges\` реактивных форм (новый объект на каждую клавишу) оператор нужно ставить вручную — с селектором ключа.

### Где это применяется на практике

- **Фильтры большого грида**: \`filters$.pipe(map(f => f.query), distinctUntilChanged())\` — запрос только при реальном изменении текста.
- **Параметры роутера**: \`paramMap.pipe(map(p => p.get('id')), distinctUntilChanged())\` — не перезагружать карточку, если изменился только query-параметр.
- **Сервисы состояния на \`BehaviorSubject\`**: \`select(key)\` с селектором ключа, чтобы компоненты не перерисовывались от чужих изменений.
- **Ресайз и датчики**: «нечёткий» компаратор против мелких колебаний.
- **Автосохранение формы**: не отправлять PUT, если значение после паузы совпадает с последним сохранённым.

## Важные нюансы и подводные камни

- **По умолчанию \`===\`, а не \`Object.is\`.** Проверено на RxJS 7.8: повторные \`NaN\` проходят, \`-0\` после \`0\` отбрасывается. Встречающееся утверждение «по умолчанию \`Object.is\`, поэтому \`NaN\` подряд фильтруется» неверно.
- **\`distinctUntilChanged\` на потоке новых объектов** ничего не фильтрует — самая частая ошибка.
- **Мутация и повторная отправка той же ссылки** — изменение молча теряется.
- **Ожидать глобальной дедупликации** — её нет, только соседние значения. Для «уникальных за всё время» есть \`distinct\`, и он копит множество в памяти.
- **Глубокое сравнение по умолчанию** — дорого; сравнивайте вычисленный ключ.
- **Оператор до \`map\`, а не после.** \`of({ q: 'a', page: 1 }, { q: 'a', page: 2 }).pipe(distinctUntilChanged(), map(f => f.q))\` выдаст \`a, a\`, а с оператором после \`map\` — один \`a\`: сравнивайте то, что реально важно потребителю.
- **Перевёрнутый компаратор.** Функция отвечает «одинаковы ли», \`true\` — отбросить.
- **Сравнение с последним выданным, а не с последним пришедшим** — важно для нечётких компараторов.
- **Где он уже стоит «бесплатно».** Внутри \`store.select\` в NgRx и в равенстве сигналов (\`toSignal\`, \`signal\`), но с разной семантикой: \`===\` у RxJS и \`Object.is\` у сигналов.

**Плюсы:** одна строка убирает лишние запросы, вычисления и перерисовки; хранит только одно значение, поэтому дёшев по памяти; гибко настраивается компаратором и селектором ключа.
**Минусы:** по умолчанию бесполезен для объектов при иммутабельных обновлениях и опасен при мутациях; легко перевернуть смысл компаратора; глубокое сравнение дорогое.

## Как это спрашивают на собеседовании

**Главный вывод:** \`distinctUntilChanged\` сравнивает только с последним выданным значением через \`===\`. Для объектов это сравнение по ссылке, поэтому нужен компаратор, \`distinctUntilKeyChanged\` или селектор ключа; для глобальной уникальности — \`distinct\`.

Типичные формулировки: «Как работает \`distinctUntilChanged\`?», «Почему \`distinctUntilChanged\` не фильтрует одинаковые объекты?», «Чем \`distinct\` отличается от \`distinctUntilChanged\`?», «Как не перерисовывать компонент при несвязанных изменениях стора?».

Что могут спросить следом:

- *Какое сравнение по умолчанию?* — Строгое \`===\`; поэтому \`NaN\` подряд проходит, а \`0\` и \`-0\` считаются равными.
- *Что вернёт компаратор для одинаковых значений?* — \`true\`, и значение будет отброшено.
- *Нужен ли оператор после \`store.select\`?* — Нет, \`select\` уже применяет его, а селекторы мемоизированы.
- *Почему мутация ломает фильтрацию?* — Ссылка та же, значит «не изменилось», и обновление теряется.
- *Чем опасен \`distinct\` на бесконечном потоке?* — Растущим множеством в памяти; нужен поток очистки.

### Ответ на 1 минуту

> \`distinctUntilChanged\` пропускает значение, только если оно отличается от последнего выданного: оператор хранит один ключ и сравнивает с ним через строгое \`===\`, поэтому \`1, 1, 2, 1\` даёт \`1, 2, 1\` — фильтруются только соседние дубли. Главный подводный камень — объекты: они сравниваются по ссылке, а иммутабельные обновления каждый раз создают новый объект, так что без настройки оператор не отфильтрует ничего, а при мутации, наоборот, проглотит изменение. Решаю это компаратором, \`distinctUntilKeyChanged\` или селектором ключа вторым аргументом, который вытаскивает нужный срез, например имя пользователя. Глубокое сравнение через \`JSON.stringify\` или \`isEqual\` дорогое, обычно дешевле сравнить \`id\` или версию. В NgRx \`store.select\` уже применяет этот оператор, а сигналы сравнивают через \`Object.is\`, так что в самописных сервисах состояния его ставлю вручную.`,
      en: `## In short

\`distinctUntilChanged\` lets a value through only if it **differs from the previously emitted one**. The key word is **until**: it looks exactly one step back, it does not remember the whole history.

Analogy: a **doorman who only remembers the last person who walked in**. The same person again right away — not allowed. But if somebody else went through in between, in you go once more.

## How it works, step by step

1. The operator stores **one** value — the last one it let through.
2. A new value arrives. Compare it with the stored one.
3. By default the comparison is \`Object.is\`, i.e. **strict** — by reference for objects.
4. Equal → the value is **dropped** and goes no further.
5. Different → let it through and **update** the stored value.
6. There is no global deduplication: \`1, 1, 2, 2, 3, 1\` yields \`1, 2, 3, 1\` — the final one passes because a 3 came before it.

## The main trap — objects

Objects are compared **by reference**. Two distinct objects with identical fields count as "different":

\`\`\`ts
// {a: 1} !== {a: 1} → both pass
state$.pipe(distinctUntilChanged());
\`\`\`

And since immutable updates **always** create a new object, the operator in this configuration filters nothing at all. Three ways to fix it:

- **A comparator**: \`distinctUntilChanged((prev, curr) => prev.id === curr.id)\`.
- **By key**: \`distinctUntilKeyChanged('id')\`.
- **By projection** — a second argument that extracts what actually matters.

## Example

\`\`\`ts
// emit only when the user's name changes
state$.pipe(
  distinctUntilChanged(
    (a, b) => a === b,
    (state) => state.user.name
  )
);

// in search — drop retyping the same text
input$.pipe(debounceTime(300), distinctUntilChanged());
\`\`\`

Why: the selector \`state => state.user.name\` reduces the object to a string, and strings compare by value. A change in \`state.settings\` no longer causes a pointless re-render.

## What to say in the interview

> \`distinctUntilChanged\` lets a value through only if it differs from the previously emitted one; by default the comparison uses \`Object.is\`, so it is strict. Importantly it filters only consecutive duplicates and stores a single previous value, not the entire history. The main pitfall is objects: they compare by reference, and immutable updates create a fresh object every time, so without configuration the operator filters nothing. There are three fixes: a custom comparator, \`distinctUntilKeyChanged\` to compare a specific field, or the second projection argument that extracts the relevant slice and compares that. The purpose is to remove redundant emissions and re-renders. In NgRx the selectors memoize on their own and \`store.select\` already applies \`distinctUntilChanged\` by reference internally, but in hand-rolled state streams you have to add the operator yourself. And be careful with deep comparison like \`isEqual\`: it works, but on large objects it is expensive — comparing one derived key is usually cheaper.

## Gotchas

- **\`distinctUntilChanged\` on a stream of fresh objects** filters nothing — the most common mistake.
- **Expecting global deduplication** — there is none, only adjacent values. For "unique ever" there is \`distinct\` (which accumulates a set in memory).
- **Deep comparison by default** is expensive; compare a derived key instead.
- **Placing the operator before \`map\` rather than after** — you compare something other than what the consumer cares about.
- **NaN**: \`Object.is(NaN, NaN)\` is \`true\`, so consecutive \`NaN\` values are filtered (unlike with \`===\`).
- **Follow-up question**: where does it already come for free? Inside \`store.select\` in NgRx, and inside \`toSignal\` when the signal updates by equality.`
    }
  },
  {
    id: 'rxjs-017',
    category: 'rxjs',
    level: 'Hard',
    tags: ['share', 'connectable', 'multicasting'],
    question: {
      ru: 'Как устроен share() под капотом? Чем отличается от connectable и устаревшего multicast?',
      en: 'How does share() work under the hood? How does it differ from connectable and the deprecated multicast?'
    },
    answer: {
      ru: `## В чём суть

\`share()\` превращает один «холодный» поток в общий: между источником и подписчиками он ставит \`Subject\`, считает подписчиков и подписывается на источник **один раз** — когда пришёл первый слушатель, а отписывается, когда ушёл последний. \`connectable()\` делает то же самое, но запускается не сам, а по вашей команде \`connect()\`. \`multicast\` — старый API для того же, в RxJS 7 он устарел и будет удалён в v8.

Аналогия: \`Subject\` здесь — **радиовышка**. Одна антенна ловит сигнал (один HTTP-запрос, один WebSocket), а вышка ретранслирует его на весь город. \`share()\` — вышка со счётчиком слушателей: включается, когда настроился первый приёмник, и выключается, когда последний ушёл. \`connectable()\` — вышка с ручным рубильником: приёмники могут настроиться заранее, но эфир начнётся только когда диспетчер дёрнет рычаг.

**Какую проблему решает.** Обычный Observable — unicast: каждый \`subscribe\` запускает свою копию работы. Два \`| async\` на один поток в шаблоне — два одинаковых HTTP-запроса, три компонента подписались на поток WebSocket — три соединения. Multicasting («раздача одного выполнения многим») решает это: работа выполняется один раз, а результат получают все.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения. Ничего не делает, пока на него не подписались.
- **Холодный поток (cold Observable)** — запускает работу заново для каждого подписчика: \`of\`, \`interval\`, \`HttpClient.get\`. Каждому — своя копия.
- **Горячий поток (hot Observable)** — работа идёт независимо от подписчиков, все слушают одно и то же «вещание», опоздавшие пропускают прошлое: \`Subject\`, события DOM.
- **Unicast / multicast** — «одно выполнение на одного подписчика» против «одно выполнение на всех».
- **\`Subject\`** — одновременно Observable и Observer: в него можно вызвать \`next(v)\`, и он раздаст \`v\` всем своим подписчикам. Истории не хранит.
- **\`ReplaySubject(n)\`** — \`Subject\` с памятью: новому подписчику сначала проигрывает последние \`n\` значений.
- **refCount (reference counting, подсчёт ссылок)** — счётчик активных подписчиков: 0 → 1 — подключиться к источнику, 1 → 0 — отключиться.
- **Connector** — фабрика, которая создаёт внутренний \`Subject\` для \`share\`/\`connectable\`. По умолчанию \`() => new Subject()\`.
- **Reset (сброс)** — \`share\` забывает свой \`Subject\` и подписку на источник и возвращается в «холодное» состояние: следующий подписчик запустит всё заново.
- **\`connect()\`** — метод \`connectable\`-потока, который вручную подписывает внутренний \`Subject\` на источник и возвращает \`Subscription\` — ручку, чтобы потом всё остановить.
- **\`multicast\` / \`publish\` / \`refCount()\` / \`ConnectableObservable\`** — API RxJS 5–6 для того же самого. В RxJS 7 помечены deprecated («устаревшие»), в v8 их удалят.
- **\`shareReplay\`** — \`share\` с \`ReplaySubject\` внутри: раздаёт и запоминает последние значения для опоздавших.
- **Оператор \`connect(selector)\`** — «локальный multicast» внутри одного \`pipe\`: даёт функции общий поток, чтобы разветвить его без повторной подписки на источник.

## Как это работает под капотом

Вот что происходит внутри \`share()\` по шагам (RxJS 7, \`node_modules/rxjs/.../share.js\`):

1. Вызов \`source$.pipe(share())\` создаёт новый Observable с замыканием, где хранятся четыре вещи: \`subject\`, \`connection\` (подписка на источник), счётчик \`refCount\` и флаги «источник уже завершился/упал». Состояние общее для всех подписчиков этого Observable — поэтому он и «общий».
2. Приходит первый подписчик: \`refCount\` 0 → 1, \`share\` создаёт \`subject\` через \`connector()\` и подписывает слушателя **на \`subject\`**, а не на источник.
3. Подключения ещё нет, поэтому \`share\` создаёт свою внутреннюю подписку \`connection\` и подписывает её на источник. Всё, что выдаёт источник, она перекладывает в \`subject.next(...)\`.
4. Второй и третий подписчики только увеличивают \`refCount\` и подписываются на тот же \`subject\`. Источник второй раз не запускается.
5. Значение от источника → \`subject.next(v)\` → \`Subject\` по очереди вызывает \`next\` у каждого слушателя.
6. Подписчик уходит → \`refCount\` уменьшается. Дошёл до нуля → срабатывает сброс по \`resetOnRefCountZero\` (по умолчанию \`true\`): \`share\` отписывается от источника и забывает \`subject\`.
7. Источник прислал \`complete\` или \`error\` → \`subject\` раздаёт его всем, после чего срабатывает сброс по \`resetOnComplete\` / \`resetOnError\` (по умолчанию тоже \`true\`).
8. Новый подписчик после сброса начинает цикл **с шага 2**: новый \`Subject\`, новая подписка на источник.

Упрощённая реализация — без опций, но с тем же поведением по умолчанию (проверена на тех же примерах, что и настоящий \`share\`):

\`\`\`ts
function simpleShare() {
  return (source) => {
    let subject = null;     // общий «ретранслятор»
    let connection = null;  // единственная подписка на источник
    let refCount = 0;       // сколько сейчас слушателей
    const reset = () => { subject = null; connection = null; };

    return new Observable((subscriber) => {
      refCount++;
      const s = (subject ??= new Subject());
      const listener = s.subscribe(subscriber);   // слушатель подключается к Subject

      if (!connection) {                          // источник запускаем один раз
        const conn = (connection = new Subscription());
        conn.add(source.subscribe({
          next: (v) => s.next(v),
          error: (e) => { reset(); s.error(e); },    // resetOnError: true
          complete: () => { reset(); s.complete(); } // resetOnComplete: true
        }));
      }

      return () => {                              // отписка слушателя
        listener.unsubscribe();
        refCount--;
        if (refCount === 0 && connection) {       // resetOnRefCountZero: true
          connection.unsubscribe();
          reset();
        }
      };
    });
  };
}
\`\`\`

### Пример 1. Без share: каждый подписчик — отдельный запрос

\`\`\`ts
import { Observable } from 'rxjs';

const user$ = new Observable((subscriber) => {
  console.log('HTTP GET /user');
  const t = setTimeout(() => {
    subscriber.next({ name: 'Ann' });
    subscriber.complete();
  }, 100);
  return () => clearTimeout(t);
});

user$.subscribe(u => console.log('header:', u.name));
user$.subscribe(u => console.log('sidebar:', u.name));
// HTTP GET /user
// HTTP GET /user
// header: Ann
// sidebar: Ann
\`\`\`

Функция внутри \`new Observable\` выполняется **на каждый** \`subscribe\`. Так работает и \`HttpClient\`: два подписчика — два запроса в Network.

### Пример 2. share(): один запрос на всех

\`\`\`ts
const sharedUser$ = user$.pipe(share());

sharedUser$.subscribe(u => console.log('header:', u.name));
sharedUser$.subscribe(u => console.log('sidebar:', u.name));
// HTTP GET /user
// header: Ann
// sidebar: Ann

// через 200 мс, когда запрос давно завершился:
sharedUser$.subscribe(u => console.log('late:', u.name));
// HTTP GET /user   ← источник завершился, share сбросился и запустил всё заново
// late: Ann
\`\`\`

Первые двое получили один и тот же ответ. А опоздавший запустил **новый** запрос: после \`complete\` сработал сброс, и \`share\` снова «холодный». Кэшем \`share()\` не является.

### Пример 3. refCount в действии: старт по первому, стоп по последнему

\`\`\`ts
import { interval, tap, share } from 'rxjs';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tick$ = interval(1000).pipe(
  tap({
    subscribe: () => console.log('[источник включён]'),
    unsubscribe: () => console.log('[источник выключен]'),
  }),
  share()
);

const a = tick$.subscribe(v => console.log('A', v));
await sleep(2500);
const b = tick$.subscribe(v => console.log('B', v));
await sleep(1000);
a.unsubscribe(); console.log('A ушёл');
await sleep(1000);
b.unsubscribe(); console.log('B ушёл');
const c = tick$.subscribe(v => console.log('C', v));
// [источник включён]
// A 0
// A 1
// A 2
// B 2        ← B подключился к идущему эфиру и пропустил 0 и 1
// A ушёл
// B 3
// [источник выключен]   ← refCount стал 0
// B ушёл
// [источник включён]    ← C запустил источник заново
// C 0
\`\`\`

Здесь видно всё сразу: один источник на двоих, опоздавший без истории, отписка при нуле и перезапуск с нуля для следующего.

### Пример 4. Ловушка: синхронный источник

\`\`\`ts
const nums$ = of(1, 2).pipe(
  tap({ subscribe: () => console.log('[источник запущен]') }),
  share()
);
nums$.subscribe(v => console.log('A', v));
nums$.subscribe(v => console.log('B', v));
// [источник запущен]
// A 1
// A 2
// [источник запущен]
// B 1
// B 2
\`\`\`

\`of\` выдаёт всё и завершается **внутри** первого \`subscribe\`. К моменту второго \`subscribe\` источник уже завершён, \`share\` сброшен — и всё выполняется ещё раз. Разделение работает только для подписчиков, которые подключились, пока источник ещё жив.

### Конфиг share: connector и три reset

С RxJS 7 \`share\` принимает объект настроек:

- \`connector\` — какой \`Subject\` ставить внутрь. \`() => new ReplaySubject(1)\` даёт опоздавшим последнее значение.
- \`resetOnError\` (по умолчанию \`true\`) — после ошибки источника вернуться в холодное состояние, чтобы следующий подписчик (или \`retry\`) запустил источник заново.
- \`resetOnComplete\` (по умолчанию \`true\`) — то же после успешного завершения.
- \`resetOnRefCountZero\` (по умолчанию \`true\`) — отписываться от источника, когда ушёл последний подписчик. С \`share({ resetOnRefCountZero: false })\` источник продолжает работать и без слушателей, а новые подписчики подключаются к тому же \`Subject\`.

Каждый reset принимает \`true\`, \`false\` или функцию, которая возвращает Observable: сброс случится, когда тот что-то выдаст.

\`\`\`ts
// Ошибка и сброс
let attempt = 0;
const flaky$ = defer(() => {
  attempt++;
  console.log('попытка', attempt);
  return attempt === 1 ? throwError(() => new Error('boom')) : of('ok');
});

const a$ = flaky$.pipe(share());                        // resetOnError: true
a$.subscribe({ next: v => console.log('A', v), error: e => console.log('A error', e.message) });
a$.subscribe({ next: v => console.log('B', v), error: e => console.log('B error', e.message) });
// попытка 1
// A error boom
// попытка 2   ← сброс: B запустил источник заново
// B ok

attempt = 0;
const b$ = flaky$.pipe(share({ resetOnError: false }));
b$.subscribe({ next: v => console.log('A', v), error: e => console.log('A error', e.message) });
b$.subscribe({ next: v => console.log('B', v), error: e => console.log('B error', e.message) });
// попытка 1
// A error boom
// B error boom ← без сброса Subject «мёртв» и сразу отдаёт ту же ошибку
\`\`\`

\`\`\`ts
// Отложенный сброс: не рвать соединение, если подписчик вернулся быстро
const prices$ = socketPrices$.pipe(
  share({ resetOnRefCountZero: () => timer(5000) })
);
\`\`\`

Последний вариант полезен при переходах между страницами: компонент уничтожился и через секунду появился снова — сокет не переоткрывается, потому что новый подписчик пришёл раньше, чем истекли 5 секунд.

### shareReplay — share с памятью

\`shareReplay\` в RxJS 7 буквально реализован через \`share\`:

\`\`\`ts
// так выглядит исходник shareReplay (упрощённо)
share({
  connector: () => new ReplaySubject(bufferSize, windowTime),
  resetOnError: true,
  resetOnComplete: false,
  resetOnRefCountZero: refCount, // по умолчанию false
});
\`\`\`

Отсюда его поведение: после успешного завершения он **не** сбрасывается, и \`ReplaySubject\` раздаёт сохранённый ответ всем опоздавшим — это и есть кэш. А по умолчанию (\`refCount: false\`) он не отписывается от источника, даже когда подписчиков не осталось — для бесконечных потоков это утечка, поэтому для них пишут \`shareReplay({ bufferSize: 1, refCount: true })\`.

### connectable — ручной рубильник

\`connectable(source)\` возвращает Observable с методом \`connect()\`. Подписчики подключаются к внутреннему \`Subject\` сразу, но к источнику он подключится только по команде:

\`\`\`ts
import { connectable, of, tap } from 'rxjs';

const shared$ = connectable(
  of(1, 2, 3).pipe(tap({ subscribe: () => console.log('[источник запущен]') }))
);

shared$.subscribe(v => console.log('A', v));
shared$.subscribe(v => console.log('B', v));
console.log('все подписаны, источник молчит');

const connection = shared$.connect();
// все подписаны, источник молчит
// [источник запущен]
// A 1
// B 1
// A 2
// B 2
// A 3
// B 3
\`\`\`

Сравните с примером 4: там синхронный \`of\` под \`share()\` выполнился дважды, а \`connectable\` гарантирует один запуск — потому что вы сначала подключили всех, а потом дёрнули рубильник. \`connection.unsubscribe()\` останавливает источник; опция \`resetOnDisconnect\` (по умолчанию \`true\`) после этого подставляет свежий \`Subject\`, чтобы поток можно было подключить снова. Счётчика подписчиков у \`connectable\` нет: он не включится сам и не выключится сам.

### multicast, publish, refCount — устаревший API

Так то же самое писали в RxJS 5–6:

\`\`\`ts
// RxJS 6 — сейчас deprecated
const legacy$ = source$.pipe(multicast(() => new Subject()), refCount());
const legacyCached$ = source$.pipe(publishReplay(1), refCount());

// Ручной режим: multicast без refCount возвращал ConnectableObservable
const manual$ = source$.pipe(multicast(new Subject()));
manual$.subscribe(a);
manual$.connect();
\`\`\`

Проблемы были такие: две отдельные сущности (\`multicast\` + \`refCount\`), которые легко собрать неправильно; передача экземпляра \`Subject\` вместо фабрики делала поток «одноразовым»; стоило добавить после \`multicast()\` ещё один оператор в \`pipe\`, и метод \`connect()\` терялся — следующий оператор возвращал обычный Observable. RxJS 7 заменил всё это тремя API: \`share\` (автоматический режим с настройками), \`connectable\` (ручной режим) и оператор \`connect\` (локальный multicast с селектором). Старые операторы ещё работают, но в типах RxJS 7 помечены \`@deprecated Will be removed in v8\`.

Шпаргалка миграции:

- \`multicast(() => new Subject()), refCount()\` → \`share()\`.
- \`publishReplay(1), refCount()\` → \`shareReplay({ bufferSize: 1, refCount: true })\`.
- \`publish()\` без \`refCount\`, затем \`.connect()\` → \`connectable(source$)\`.
- \`multicast(subjectFactory, selector)\` → \`connect(selector, { connector: subjectFactory })\`.

### Оператор connect — multicast внутри одного pipe

Иногда нужно разветвить поток на несколько веток и снова собрать, не подписываясь на источник несколько раз:

\`\`\`ts
import { of, tap, connect, merge, filter, map } from 'rxjs';

of(1, 2, 3).pipe(
  tap({ subscribe: () => console.log('[источник запущен]') }),
  connect(shared$ => merge(
    shared$.pipe(filter(v => v % 2 === 1), map(v => 'odd ' + v)),
    shared$.pipe(filter(v => v % 2 === 0), map(v => 'even ' + v))
  ))
).subscribe(console.log);
// [источник запущен]
// odd 1
// even 2
// odd 3
\`\`\`

\`connect\` сначала подписывает ваши ветки на внутренний \`Subject\`, а потом подключает источник — поэтому даже синхронный \`of\` никто не пропускает.

### Как выбрать

- Нужно просто «один запрос / один сокет на всех текущих подписчиков» — \`share()\`.
- Нужно, чтобы опоздавшие получили последнее значение (кэш, текущее состояние) — \`shareReplay({ bufferSize: 1, refCount: true })\` или \`share({ connector: () => new ReplaySubject(1) })\` с нужными reset.
- Нужно сначала подключить всех и только потом стартовать, либо явно управлять моментом старта и остановки — \`connectable()\` + \`connect()\`.
- Нужно разветвить один поток внутри \`pipe\` и собрать обратно — оператор \`connect\`.
- \`multicast\` / \`publish\` / \`refCount()\` — только читать в старом коде и мигрировать.

### Где это применяется на практике

- **Сервис-обёртка над WebSocket**: \`messages$ = webSocket(url).pipe(share({ resetOnRefCountZero: () => timer(3000) }))\` — одно соединение на все виджеты дашборда, без переоткрытия при быстрой навигации.
- **Справочники в enterprise-приложении** (страны, валюты, права пользователя): \`shareReplay({ bufferSize: 1, refCount: true })\` — один HTTP-запрос, остальные получают кэш.
- **Шаблон с несколькими \`| async\` на один поток** — \`share\` под капотом view-model, чтобы не было двойных запросов.
- **Большие таблицы с фильтрами**: один поток данных раздаётся и самой таблице, и счётчику строк, и панели итогов.
- **\`connectable\`** — когда все потребители должны гарантированно получить первые значения: например, поток событий импорта файла, где первая строка содержит заголовки.

## Важные нюансы и подводные камни

- **\`share()\` не хранит историю.** Опоздавший подписчик видит только будущие значения. Для «догнать» нужен \`shareReplay\` или \`share({ connector: () => new ReplaySubject(1) })\`.
- **\`share()\` перезапускает источник после сброса.** Завершился запрос или ушли все подписчики — следующий подписчик сделает второй HTTP-запрос там, где вы ждали кэш.
- **Синхронный источник под \`share()\` не разделяется**, если подписчики приходят по очереди: первый получает всё и завершает источник, второй запускает его заново (пример 4).
- **Позиция в \`pipe\` важна.** Всё, что **выше** \`share\`, выполняется один раз; всё, что **ниже**, — отдельно для каждого подписчика. \`src$.pipe(share(), map(heavy))\` с двумя подписчиками вызовет \`heavy\` дважды на каждое значение.
- **Ошибка и \`resetOnError\`.** По умолчанию \`share()\` после ошибки сбрасывается, и новый подписчик запускает источник заново — так работает \`retry\` поверх \`share\`. Только с \`resetOnError: false\` внутренний \`Subject\` остаётся «мёртвым», и каждый новый подписчик сразу получает ту же ошибку.
- **Каждый вызов \`share()\` — своё состояние.** Метод, который на каждый вызов возвращает \`this.http.get(...).pipe(share())\`, ничего не разделяет: у каждого вызова свой \`Subject\`. Общий поток должен лежать в поле или в сервисе.
- **\`connectable\` без \`connect()\` молчит**, даже \`complete\` не придёт — выглядит как «ничего не работает».
- **Потерянная \`Subscription\` от \`connect()\`** — остановить источник будет нечем: утечка. Храните её и отписывайтесь при уничтожении.
- **\`shareReplay\` без \`refCount: true\` на бесконечном источнике** держит подписку на источник вечно, даже когда все компоненты уничтожены.
- **Передать экземпляр вместо фабрики** (\`multicast(new Subject())\`, \`connector: () => mySubject\`) — после первого завершения Subject уже закрыт, и поток нельзя запустить повторно.

**Плюсы:** одно выполнение тяжёлой работы на всех подписчиков; гибкая настройка жизненного цикла через \`connector\` и reset; \`connectable\` даёт точный контроль момента старта.
**Минусы:** легко ошибиться с поздними подписчиками, синхронными источниками и позицией в \`pipe\`; поведение сбросов неочевидно без знания дефолтов; ручной \`connect()\` требует ручной отписки.

## Как это спрашивают на собеседовании

**Главный вывод:** multicasting — это \`Subject\` между источником и подписчиками. \`share()\` подключает его автоматически по счётчику подписчиков и по умолчанию сбрасывается после завершения, ошибки и ухода последнего; \`connectable()\` подключается вручную через \`connect()\`; \`multicast\` — устаревший предшественник обоих.

Типичные формулировки: «Как сделать так, чтобы два \`async\` не вызвали два запроса?», «Как устроен \`share\` внутри?», «Чем \`share\` отличается от \`shareReplay\`?», «Зачем нужен \`connectable\`?».

Что могут спросить следом:

- *Что получит подписчик, пришедший после завершения источника?* — С \`share()\` — новый запуск источника; с \`shareReplay\` — сохранённые значения и \`complete\`.
- *Что будет после ошибки?* — По умолчанию сброс и новый запуск при следующей подписке; с \`resetOnError: false\` — та же ошибка сразу.
- *Почему \`of(1, 2).pipe(share())\` выполняется дважды?* — Источник синхронный и успевает завершиться до второй подписки, \`share\` сбрасывается.
- *Как реализован \`shareReplay\`?* — Через \`share\` с \`ReplaySubject\` и \`resetOnComplete: false\`.
- *Чем заменить \`publishReplay(1), refCount()\`?* — \`shareReplay({ bufferSize: 1, refCount: true })\`.

### Ответ на 1 минуту

> Multicasting — это когда между источником и подписчиками ставится \`Subject\`: источник выполняется один раз, а \`Subject\` раздаёт значения всем. \`share()\` делает это автоматически с подсчётом подписчиков: первый подписчик создаёт внутренний \`Subject\` через \`connector\` и подписывает его на источник, следующие подключаются к тому же \`Subject\`, а когда счётчик падает до нуля, \`share\` отписывается от источника. По умолчанию он сбрасывается и после \`complete\`, и после ошибки, поэтому следующий подписчик запустит источник заново — это не кэш; для кэша есть \`shareReplay\`, который внутри и есть \`share\` с \`ReplaySubject\`. \`connectable()\` не стартует сам: подписчики подключаются заранее, а источник запускается по \`connect()\`, это нужно, когда никто не должен пропустить первые значения. \`multicast\` с \`refCount\` — старый API, deprecated в RxJS 7. Из ловушек: синхронный источник под \`share\` выполнится дважды, а всё, что ниже \`share\` в \`pipe\`, выполняется для каждого подписчика отдельно.`,
      en: `## In short

Multicasting means **putting a \`Subject\` between the source and the subscribers**. The source is subscribed once, and the \`Subject\` fans its values out to everyone. That is how one execution of a cold stream is shared by many.

Analogy: the \`Subject\` here is a **radio tower**. One antenna picks up the signal (one HTTP request, one socket) and the tower rebroadcasts it to the whole city.

\`share()\` is a ready-made tower with a listener counter. \`connectable()\` is a tower with a manual switch.

## How it works, step by step

1. The first subscriber arrives at \`share()\`. The subscriber count goes 0 → 1.
2. \`share()\` creates an internal \`Subject\` (via \`connector\`) and subscribes to the source **through it**.
3. The second and third subscribers connect **to the Subject**, not to the source. The count grows, the source runs once.
4. Values from the source go into the \`Subject\`, which calls \`next\` on every subscriber.
5. Someone unsubscribes — the count drops. It reaches **zero** → \`share()\` unsubscribes from the source. That is refCount.
6. A new subscriber after zero restarts the cycle **at step 2**: the source runs again.

In RxJS 7 \`share()\` takes a config: \`connector\` (a Subject factory), \`resetOnError\`, \`resetOnComplete\`, \`resetOnRefCountZero\`.

## share vs connectable vs multicast

- **\`share()\`** — automatic multicast with refCount: starts on the first subscriber, stops on the last. Covers 95% of cases.
- **\`connectable(source)\`** — an Observable that does **not subscribe** to the source until you manually call \`.connect()\`. Needed when it matters that **all** subscribers are wired up before the source starts, so nobody misses the first values.
- **\`multicast(subjectFactory)\` + \`refCount()\`** — the old low-level API. Verbose and prone to refCount mistakes, so it is **deprecated** and replaced by \`connectable\` and \`share\`.

## Example

\`\`\`ts
// automatic multicast, but no reset at zero subscribers
source$.pipe(share({ resetOnRefCountZero: false }));

// manual start control: everyone subscribes first, then we go
const shared = connectable(source$);
shared.subscribe(a);
shared.subscribe(b);
const conn = shared.connect(); // the source starts exactly here
// conn.unsubscribe(); — stop the multicast
\`\`\`

Why: with a plain \`share()\`, subscriber \`a\` would start the source immediately and \`b\` could miss the first emissions. \`connectable\` exists precisely to solve that race.

## What to say in the interview

> Multicasting is inserting a \`Subject\` between the source and the subscribers: the source is subscribed once and the Subject fans values out to all downstream subscribers, so one execution of a cold stream is shared among many. \`share()\` is an automated multicast with refCount: on the first subscriber it creates an internal Subject and subscribes to the source, and when the count drops to zero it unsubscribes from the source, restarting everything when a new subscriber appears. RxJS 7 gave \`share\` a config object: \`connector\` supplies the Subject factory, and \`resetOnError\`, \`resetOnComplete\` and \`resetOnRefCountZero\` control when its state resets. \`connectable()\` does not subscribe to the source until you explicitly call \`connect()\` — useful when all subscribers must be attached before the first emission. And \`multicast\` with \`refCount\` is the old low-level API, deprecated in favour of \`connectable\` and \`share\`.

## Gotchas

- **Expecting history from \`share()\`** — it keeps no buffer; to let subscribers catch up you need \`shareReplay\` or \`share({ connector: () => new ReplaySubject(1) })\`.
- **Forgetting that \`share()\` restarts the source** once the subscriber count hits zero — a second HTTP request where you expected a cache.
- **\`share()\` at the end of the pipe versus the start** — everything above it is shared; everything below it runs **separately** for each subscriber.
- **\`connectable\` without \`connect()\`** — the stream stays silent and it looks like nothing works.
- **Losing the \`Subscription\` returned by \`connect()\`** — you have nothing to stop the multicast with: a leak.
- **Follow-up question**: on a source error the internal Subject dies, and without \`resetOnError: true\` every new subscriber immediately receives that same error.`
    }
  },
  {
    id: 'rxjs-018',
    category: 'rxjs',
    level: 'Hard',
    tags: ['cold-to-hot', 'subject', 'pattern'],
    question: {
      ru: 'Покажите паттерн «action stream»: как через Subject управлять загрузкой данных реактивно.',
      en: 'Show the "action stream" pattern: how to drive data loading reactively with a Subject.'
    },
    answer: {
      ru: `## В чём суть

Вместо императивного «нажали кнопку — вызвали метод — положили результат в поле» мы заводим **поток действий** (обычно приватный \`Subject\`) и один раз декларативно описываем: «из этого потока команд получается вот такое состояние». Публичные методы только кладут команду в поток, а вся логика — отмена, загрузка, ошибки — живёт в одном \`pipe\`.

Аналогия: \`Subject\` — это **лента заказов на кухне**. Официант не бежит к повару объяснять, что делать: он просто вешает заказ на ленту. А кухня — заранее настроенный конвейер, который знает, как превратить заказ в блюдо, что делать, если клиент передумал (отмена), и что подать, если продукт закончился (ошибка).

**Какую проблему решает.** Императивная загрузка обрастает полями \`loading\`, \`error\`, \`data\` и ручными подписками. Типичные баги: ответ на старый запрос приходит позже нового и перетирает его (гонка), спиннер не гаснет после ошибки, двойной клик отправляет форму дважды, подписка живёт после ухода со страницы. В action stream всё это описано в одном месте и не может рассинхронизироваться. Это основа реактивной архитектуры и ровно та идея, что лежит в NgRx Effects.

## Словарик терминов

- **Действие, команда (action)** — сообщение «что пользователь захотел»: «искать \`ang\`», «обновить», «перейти на страницу 2». Не результат, а намерение.
- **Поток действий (action stream)** — Observable, по которому идут команды. Обычно это \`Subject\`, в который пишет публичный метод.
- **\`Subject\`** — Observable, в который можно вручную вызвать \`next(value)\`, и он раздаст значение всем подписчикам. Горячий: кто не подписан в момент \`next\`, тот значение пропустил.
- **\`BehaviorSubject\`** — \`Subject\` с текущим значением: новому подписчику сразу отдаёт последнее. Удобен для «стартовой» команды.
- **Императивный / декларативный код** — «сделай шаг 1, потом шаг 2» против «результат — это вот такое преобразование входа».
- **Higher-order оператор (оператор высшего порядка)** — превращает каждое значение во внутренний поток и решает, что делать с предыдущим: \`switchMap\`, \`exhaustMap\`, \`concatMap\`, \`mergeMap\`.
- **Внешний и внутренний поток** — внешний — поток команд, внутренний — поток, созданный на одну команду (обычно HTTP-запрос).
- **View-model (модель представления)** — один объект со всем, что нужно шаблону: \`{ loading, data, error }\`.
- **\`startWith\`, \`catchError\`, \`debounceTime\`, \`distinctUntilChanged\`, \`scan\`, \`combineLatest\`, \`shareReplay\`** — операторы, из которых собирается конвейер; каждый разобран ниже.
- **\`async\` pipe и \`toSignal\`** — способы отдать поток в шаблон: они сами подписываются и сами отписываются.

## Как это работает под капотом

Механизм по шагам:

1. Заводим \`private search$ = new Subject<string>()\` — приватный источник команд. Приватный, чтобы писать в него мог только сам сервис или компонент.
2. Публичный метод \`search(term)\` делает только \`this.search$.next(term)\`. Никакой логики, никаких полей.
3. \`debounceTime\` и \`distinctUntilChanged\` отсекают лишние команды ещё до запроса.
4. Higher-order оператор превращает каждую команду во внутренний поток (HTTP-запрос) и определяет судьбу предыдущего: \`switchMap\` его отменяет.
5. Внутри внутреннего потока \`map\` превращает ответ в состояние \`{ loading: false, data }\`, \`startWith\` **после** \`map\` добавляет перед ответом состояние «загружаю», а \`catchError\` превращает ошибку в состояние \`{ error }\`.
6. \`catchError\` стоит **внутри** \`switchMap\`, поэтому ошибка завершает только этот внутренний поток, а внешний поток команд продолжает жить.
7. Наружу отдаётся один Observable view-model. Пока на него никто не подписался, ничего не происходит (Observable ленивый); подписывается \`async\` pipe или \`toSignal\` и сам же отписывается.

Главная идея: состояние не хранится в изменяемых полях, а **выводится** из потока команд. Поэтому его нельзя «забыть обновить».

### Пример 1. Императивный вариант и его баги

\`\`\`ts
// ❌ Так обычно начинают
search(term: string) {
  this.loading = true;
  this.api.search(term).subscribe({
    next: data => { this.data = data; this.loading = false; },
    error: err => { this.error = err; } // забыли loading = false
  });
}
\`\`\`

Пользователь набрал \`an\`, потом \`ang\`. Запрос по \`an\` медленный и вернулся вторым — на экране результаты для \`an\`, хотя в поле \`ang\`. Плюс спиннер вечно крутится после ошибки, а каждая подписка висит до конца жизни запроса, даже если компонент уже уничтожен.

### Пример 2. Самый простой action stream

\`\`\`ts
import { Subject, switchMap } from 'rxjs';

const refresh$ = new Subject<void>();
const users$ = refresh$.pipe(switchMap(() => loadUsers()));

refresh$.next();                       // никто не подписан — команда потеряна
users$.subscribe(users => console.log('users', users));
refresh$.next();
// HTTP GET /users
// users [ 'Ann', 'Bob' ]
\`\`\`

Видно две вещи. Команда превращается в запрос только внутри \`pipe\`, а метод, который её отправил, ничего не знает о HTTP. И \`Subject\` горячий: первый \`next\` ушёл в пустоту. Поэтому стартовую загрузку делают через \`BehaviorSubject\` или \`startWith\` на потоке команд.

### Пример 3. Поиск с view-model

\`\`\`ts
private search$ = new Subject<string>();

readonly vm$ = this.search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query =>
    this.api.search(query).pipe(
      map(data => ({ loading: false, data, error: null })),
      startWith({ loading: true, data: [], error: null }),
      catchError(err => of({ loading: false, data: [], error: err.message }))
    )
  )
);

search(term: string) { this.search$.next(term); }

// пользователь быстро набрал a → an → ang, потом 'err', потом 'ng'
// vm {"loading":true,"data":[],"error":null}
// HTTP GET /search?q=ang          ← a и an отсеял debounceTime
// vm {"loading":false,"data":["ang-1","ang-2"],"error":null}
// vm {"loading":true,"data":[],"error":null}
// HTTP GET /search?q=err
// vm {"loading":false,"data":[],"error":"500"}
// vm {"loading":true,"data":[],"error":null}
// HTTP GET /search?q=ng           ← после ошибки поиск жив
// vm {"loading":false,"data":["ng-1","ng-2"],"error":null}
\`\`\`

Три вещи, которые обычно пишут руками — отмена устаревшего запроса, флаг загрузки и обработка ошибки, — здесь описаны декларативно. Компонент не хранит ни \`loading\`, ни \`error\`.

### debounceTime и distinctUntilChanged — фильтр команд

\`debounceTime(ms)\` пропускает значение, только если после него \`ms\` миллисекунд была тишина. \`distinctUntilChanged()\` выбрасывает значение, равное предыдущему пропущенному.

\`\`\`ts
typed$.pipe(debounceTime(300), distinctUntilChanged())
  .subscribe(q => console.log('search', q));

typed$.next('a'); typed$.next('an'); typed$.next('ang'); // быстро подряд
await sleep(400);
typed$.next('angu'); typed$.next('ang');                 // стёр букву
await sleep(400);
// search ang
// (второй раз ничего: после паузы снова 'ang', distinctUntilChanged его отсёк)
\`\`\`

Используйте для ввода текста и фильтров: меньше запросов и никакого повторного поиска по той же строке.

### startWith — состояние «загрузка» без флагов

\`startWith(x)\` выдаёт \`x\` сразу при подписке, а потом всё, что выдаёт источник.

\`\`\`ts
of('data').pipe(startWith('loading')).subscribe(console.log);
// loading
// data
\`\`\`

Внутри \`switchMap\` подписка на внутренний поток происходит на **каждую** команду — значит, и «загрузка» выдаётся на каждую. Порядок в \`pipe\` важен: если поставить \`startWith\` **до** \`map\`, объект загрузки пройдёт через \`map\` и превратится в мусор:

\`\`\`ts
of(['Ann']).pipe(
  startWith({ loading: true, data: [], error: null }),
  map(data => ({ loading: false, data, error: null }))
).subscribe(vm => console.log(JSON.stringify(vm)));
// {"loading":false,"data":{"loading":true,"data":[],"error":null},"error":null}
// {"loading":false,"data":["Ann"],"error":null}
\`\`\`

### catchError — где ставить

\`catchError(fn)\` ловит ошибку и подменяет упавший поток тем, что вернёт \`fn\`. Ключевое: исходный поток после ошибки **уже завершён**, \`catchError\` только подставляет замену.

\`\`\`ts
// ❌ catchError снаружи switchMap
const vm$ = search$.pipe(
  switchMap(q => api.search(q)),
  catchError(err => of(['fallback: ' + err.message]))
);
vm$.subscribe({ next: v => console.log('next', v), complete: () => console.log('complete') });
search$.next('err');
search$.next('ng');   // позже
// HTTP GET /search?q=err
// next [ 'fallback: 500' ]
// complete            ← поток команд мёртв, 'ng' уже никто не обработает
\`\`\`

Ошибка внутреннего запроса прошла через \`switchMap\` и убила весь внешний поток. Внутри \`switchMap\` \`catchError\` завершает только одну итерацию.

### switchMap, exhaustMap, concatMap — семантика отмены

Все три превращают команду во внутренний поток, разница — что делать, если пришла новая команда, а старый запрос ещё идёт:

\`\`\`ts
save$.pipe(op(form => api.save(form))).subscribe(r => console.log('result:', r));
save$.next({ name: 'v1' });
save$.next({ name: 'v2' }); // через 30 мс, первый запрос ещё идёт

// op = switchMap:  POST v1, POST v2, result: saved v2   ← v1 отменён
// op = exhaustMap: POST v1, result: saved v1            ← v2 проигнорирован
// op = concatMap:  POST v1, result: saved v1, POST v2, result: saved v2 ← очередь
\`\`\`

- \`switchMap\` — для поиска, фильтров, навигации: важен только последний запрос.
- \`exhaustMap\` — для кнопок «Сохранить», «Войти», «Оплатить»: пока идёт запрос, новые клики игнорируются.
- \`concatMap\` — когда важен порядок и ничего нельзя терять: очередь сохранений.
- \`mergeMap\` — всё параллельно, без отмены: независимые операции, например загрузка нескольких файлов.

### scan — несколько действий, одно состояние

Когда действий много, их сливают в один поток через \`merge\` и сворачивают в состояние через \`scan\` — это редьюсер, как в NgRx:

\`\`\`ts
const actions$ = merge(
  add$.pipe(map(item => ({ type: 'add', item }))),
  remove$.pipe(map(id => ({ type: 'remove', id }))),
  clear$.pipe(map(() => ({ type: 'clear' })))
);

const cart$ = actions$.pipe(
  scan((state, a) => {
    switch (a.type) {
      case 'add': return [...state, a.item];
      case 'remove': return state.filter(i => i.id !== a.id);
      case 'clear': return [];
    }
  }, []),
  startWith([])
);
// add 1, add 2, remove 1, clear:
// cart []
// cart [1]
// cart [1,2]
// cart [2]
// cart []
\`\`\`

\`scan(reducer, seed)\` хранит аккумулятор и на каждое действие выдаёт новое состояние — без единого изменяемого поля в классе.

### combineLatest — несколько источников команд

\`combineLatest([a$, b$, c$])\` выдаёт массив последних значений всех потоков, как только любой из них изменился (после того как каждый выдал хотя бы одно значение).

\`\`\`ts
const page$ = new BehaviorSubject(1);
const sort$ = new BehaviorSubject('name');
combineLatest([page$, sort$]).subscribe(v => console.log(v));
page$.next(2);
sort$.next('date');
// [ 1, 'name' ]
// [ 2, 'name' ]
// [ 2, 'date' ]
\`\`\`

Так несколько независимых команд («сменить страницу», «сменить сортировку») превращаются в один набор параметров запроса.

### Реальный Angular-сервис: таблица с фильтром, страницами и обновлением

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private http = inject(HttpClient);
  private readonly page$ = new BehaviorSubject(1);
  private readonly filter$ = new BehaviorSubject('');
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly vm$ = combineLatest([
    this.page$,
    this.filter$.pipe(debounceTime(300), distinctUntilChanged()),
    this.refresh$,
  ]).pipe(
    switchMap(([page, filter]) =>
      this.http.get<User[]>('/api/users', { params: { page, filter } }).pipe(
        map(users => ({ loading: false, users, error: null })),
        startWith({ loading: true, users: [], error: null }),
        catchError(() => of({ loading: false, users: [], error: 'Не удалось загрузить' }))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  setPage(page: number) { this.page$.next(page); }
  setFilter(text: string) { this.filter$.next(text); }
  refresh() { this.refresh$.next(); }
}

// в компоненте:
readonly vm = toSignal(inject(UsersStore).vm$, { initialValue: { loading: true, users: [], error: null } });
// фильтр 'ann', затем страница 2, затем «Обновить»:
// HTTP GET /api/users?page=1&filter=
// HTTP GET /api/users?page=1&filter=ann
// HTTP GET /api/users?page=2&filter=ann
// HTTP GET /api/users?page=2&filter=ann   ← refresh$ перезапустил тот же запрос
\`\`\`

\`BehaviorSubject\` решает проблему стартовой команды: первый запрос уходит сразу при подписке. \`refresh$\` — отдельный поток именно потому, что \`distinctUntilChanged\` не пропустил бы повтор того же фильтра. \`shareReplay({ bufferSize: 1, refCount: true })\` делает поток общим: несколько \`| async\` или \`toSignal\` в разных местах не породят дублирующих запросов, а пришедший позже получит последнее состояние. \`toSignal\` (из \`@angular/core/rxjs-interop\`) подписывается на поток и отдаёт его последнее значение как сигнал для шаблона; \`async\` pipe делает то же самое прямо в шаблоне: \`@if (vm$ | async; as vm)\`.

### Где это применяется на практике

- **Поиск и автокомплит** — \`debounceTime\` + \`switchMap\`, никаких гонок.
- **Таблицы и гриды** — страница, сортировка, фильтр и «Обновить» как отдельные потоки команд, сведённые через \`combineLatest\` в один запрос.
- **Формы** — «Сохранить» через \`exhaustMap\`, автосохранение черновика через \`debounceTime\` + \`concatMap\`.
- **Дашборды** — \`refresh$\` плюс \`timer\` для автообновления в одном \`merge\`.
- **Мини-стор без NgRx** — \`merge\` действий + \`scan\` для корзины, выбора строк, настроек.
- **NgRx Effects** — тот же паттерн в масштабе приложения: \`Subject\` становится потоком \`actions$\`, фильтр — \`ofType\`, а \`pipe\` с \`switchMap\` и \`catchError\` — эффектом.

## Важные нюансы и подводные камни

- **\`catchError\` снаружи \`switchMap\`** — после первой ошибки поток команд завершится, и поиск умрёт навсегда. Главный вопрос по этой теме.
- **\`startWith\` снаружи \`switchMap\`** сработает один раз при подписке, а не на каждую команду: спиннер покажется до первого поиска и больше никогда.
- **\`startWith\` до \`map\` во внутреннем потоке** — объект загрузки пройдёт через \`map\` и попадёт в \`data\`.
- **Публичный \`Subject\`** — любой компонент сможет писать в него и даже вызвать \`complete()\`. Наружу только методы и, при необходимости, \`asObservable()\`.
- **\`switchMap\` там, где нужен \`exhaustMap\`** — двойной клик по «Сохранить» отменит первый запрос на полпути: в Network видно отменённый запрос, а на сервере он мог и выполниться.
- **Команда до подписки теряется** — \`Subject\` горячий. Стартовую загрузку делайте через \`BehaviorSubject\` или \`startWith\` на потоке команд.
- **Несколько \`| async\` на один \`vm$\`** — несколько подписок, а значит, и несколько запросов на каждую команду. Добавьте \`shareReplay({ bufferSize: 1, refCount: true })\` или используйте один \`@if (vm$ | async; as vm)\`.
- **\`distinctUntilChanged\` блокирует «повторить тот же поиск»** — для повтора заведите отдельный \`refresh$\`.
- **Мигание пустого списка** — \`startWith\` с \`data: []\` очищает таблицу на время загрузки. Если нужно показывать старые данные под спиннером, копите состояние через \`scan\` и выставляйте только \`loading: true\`.
- **Ручной \`subscribe\` с записью в поля** возвращает все проблемы императивного кода. Поток должен заканчиваться в \`async\` pipe или \`toSignal\`.

**Плюсы:** нет гонок и забытых флагов; отмена, загрузка и ошибки описаны в одном месте; состояние легко тестировать marble-тестами; паттерн естественно растёт до NgRx.
**Минусы:** порог входа — нужно понимать higher-order операторы и горячие/холодные потоки; ошибки порядка операторов не ловятся компилятором; для простой одноразовой загрузки это может быть избыточно.

## Как это спрашивают на собеседовании

**Главный вывод:** публичный метод только кладёт команду в приватный \`Subject\`, а состояние выводится из этого потока одним \`pipe\`: higher-order оператор с правильной семантикой отмены, \`startWith\` для загрузки и \`catchError\` внутри него для ошибок.

Типичные формулировки: «Как реактивно загрузить данные по клику?», «Как избежать гонки запросов в поиске?», «Почему после ошибки поиск перестал работать?».

Что могут спросить следом:

- *Почему поиск перестал работать после одной ошибки?* — \`catchError\` стоит снаружи \`switchMap\`, ошибка завершила внешний поток.
- *Какой оператор для кнопки «Сохранить»?* — \`exhaustMap\`, если нужно игнорировать повторные клики, или \`concatMap\`, если нужна очередь.
- *Как сделать начальную загрузку?* — \`BehaviorSubject\` вместо \`Subject\` или \`startWith\` на потоке команд.
- *Чем это лучше императивного кода?* — Состояние выводится из потока и не может рассинхронизироваться, гонки устранены оператором.
- *Как это связано с NgRx?* — \`Subject\` — это \`actions$\`, а \`pipe\` с \`switchMap\` и \`catchError\` — эффект.

### Ответ на 1 минуту

> Паттерн action stream — это когда вместо императивного «по клику вызвать запрос и разложить результат по полям» я завожу приватный \`Subject\` как поток команд, а публичный метод только делает \`next\`. Состояние я один раз декларативно вывожу из этого потока: \`debounceTime\` и \`distinctUntilChanged\` отсеивают лишние команды, higher-order оператор превращает команду в запрос с нужной семантикой — \`switchMap\` для поиска, чтобы отменять устаревший запрос, \`exhaustMap\` для кнопки «Сохранить», чтобы двойной клик не дал второй запрос. Внутри внутреннего потока \`map\` строит состояние, \`startWith\` даёт «загрузку» на каждую команду, а \`catchError\` стоит именно внутри, иначе первая ошибка убьёт весь поток. Наружу отдаю одну view-model \`loading\`, \`data\`, \`error\` через \`async\` pipe или \`toSignal\`, с \`shareReplay\`, если подписчиков несколько. Это та же идея, что NgRx Effects, только локально.`,
      en: `## In short

Instead of the imperative "button clicked — call a method, stash the result in a field", we set up an **action stream** (a \`Subject\`) and describe once, declaratively: "this stream of commands produces this state".

Analogy: the \`Subject\` is the **order rail in a kitchen**. The waiter does not run to the chef and re-explain the job each time — they just clip the ticket to the rail. The kitchen is a pre-described pipeline that already knows how to turn a ticket into a dish.

This is the foundation of reactive architecture, and precisely the idea behind NgRx Effects.

## How it works, step by step

1. Declare \`private search$ = new Subject<string>()\` — a private source of commands.
2. The public method \`search(term)\` does nothing but \`this.search$.next(term)\`. All logic moves into the pipe.
3. \`debounceTime\` + \`distinctUntilChanged\` filter out redundant commands.
4. \`switchMap\` turns a command into an HTTP request and **cancels** the previous one.
5. \`startWith\` placed **before** \`map\` inside the inner stream provides the "loading" state declaratively, with no manual flags.
6. \`catchError\` sits **inside** \`switchMap\`, so an error kills only one iteration, not the whole command stream.
7. What you expose is a single Observable of \`{ loading, data, error }\` — a ready-made view model for the \`async\` pipe.

## Example

\`\`\`ts
private search$ = new Subject<string>();

readonly results$ = this.search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query =>
    this.api.search(query).pipe(
      map(data => ({ loading: false, data, error: null })),
      startWith({ loading: true, data: [], error: null }),
      catchError(err => of({ loading: false, data: [], error: err }))
    )
  )
);

search(term: string) { this.search$.next(term); }
\`\`\`

Why: the three things people usually hand-code — cancelling the stale request, the loading flag, and error handling — are described declaratively here and cannot drift out of sync. The component stores neither \`loading\` nor \`error\`.

## What to say in the interview

> The action stream pattern replaces the imperative "call a method on click" with a Subject that carries commands, plus a one-off declarative description of how state is derived from it: a higher-order operator turns a command into a request with the right cancellation semantics, and the result is consumed through the \`async\` pipe. Three details matter. The operator choice: \`switchMap\` for search, because it cancels the stale request and removes "the response came back for the wrong query" races, and \`exhaustMap\` for buttons so a double click does not produce a second request. \`startWith\` inside the inner stream supplies the loading state declaratively without manual flags. And \`catchError\` must be inside the higher-order operator, otherwise the first error completes the outer stream and searching stops working entirely. What I expose is a single view model with \`loading\`, \`data\` and \`error\`; the same pattern scales up to NgRx, where the Subject becomes the actions stream and the pipe becomes an effect.

## Gotchas

- **\`catchError\` outside \`switchMap\`** — after the first error, search is dead forever. The main question on this topic.
- **A public \`Subject\`** — any component can write into it. Expose only a method and \`asObservable()\`.
- **\`switchMap\` where \`exhaustMap\` belongs** — a double click on Save cancels the first request halfway.
- **Several \`| async\` on \`results$\`** — several subscriptions and several requests; add \`shareReplay({ bufferSize: 1, refCount: true })\`.
- **\`startWith\` outside \`switchMap\`** fires once on subscribe rather than per command — the spinner shows only the first time.
- **Follow-up question**: why is this better than imperative code? State is derived from the stream and cannot drift, and cancellation plus error handling live in one place.`
    }
  },
  {
    id: 'rxjs-019',
    category: 'rxjs',
    level: 'Expert',
    tags: ['marble-testing', 'testscheduler', 'testing'],
    question: {
      ru: 'Что такое marble-тестирование и как работает TestScheduler с виртуальным временем?',
      en: 'What is marble testing and how does TestScheduler with virtual time work?'
    },
    answer: {
      ru: `## В чём суть

Marble-тестирование — способ проверять потоки, которые зависят от времени (\`debounceTime\`, \`delay\`, \`interval\`, \`retry\`), не тратя ни миллисекунды реального времени. Поток описывается ASCII-строкой, где каждый символ — момент времени, а \`TestScheduler\` подменяет настоящие таймеры **виртуальным временем** и «проматывает» его мгновенно.

Аналогия: это **раскадровка мультфильма**. Вместо того чтобы смотреть три секунды анимации, вы кладёте рядом две ленты кадров — «что подали на вход» и «что ожидаем на выходе» — и сравниваете кадр за кадром. Виртуальное время — это возможность перелистать плёнку мгновенно, а не ждать, пока она прокрутится.

**Какую проблему решает.** Тест на \`debounceTime(300)\` с настоящими таймерами ждёт 300 мс, а сотня таких тестов — полминуты. Хуже того, на загруженном CI таймеры «плывут», и тесты падают через раз. И главное — обычным тестом трудно доказать тонкие вещи: что \`switchMap\` **отменил** старый запрос именно в момент новой команды, что \`retry\` подписался ровно три раза. Marble-тест проверяет и значения, и точные моменты времени, и моменты подписки/отписки.

## Словарик терминов

- **Marble-диаграмма (marble diagram)** — строка вида \`'a-b-c|'\`, описывающая поток во времени: символ = кадр. Название от «шариков» на схемах в документации RxJS.
- **Кадр (frame)** — единица виртуального времени. Внутри \`scheduler.run\` один кадр = 1 виртуальная миллисекунда.
- **Виртуальное время (virtual time)** — счётчик, который двигает сам планировщик. Ничего не ждёт: «прошло 5 минут» — это просто смена числа.
- **Планировщик (Scheduler)** — объект RxJS, который решает, **когда** выполнить отложенную работу. Обычно это \`asyncScheduler\` поверх \`setTimeout\`/\`setInterval\`.
- **\`TestScheduler\`** — планировщик для тестов на основе \`VirtualTimeScheduler\`: копит отложенные действия в очереди с виртуальными метками времени и выполняет их мгновенно по порядку.
- **Run mode (\`scheduler.run(...)\`)** — режим, в котором все операторы со временем автоматически используют \`TestScheduler\`, а кадр равен 1 мс.
- **\`cold(marbles, values?, error?)\`** — создаёт холодный тестовый поток: его диаграмма начинает отсчёт с момента подписки.
- **\`hot(marbles, values?, error?)\`** — горячий тестовый поток: события привязаны к абсолютному времени, \`^\` отмечает момент, когда подписывается тестируемый код.
- **\`expectObservable(obs, unsubMarbles?).toBe(marbles, values?, error?)\`** — подписывается на поток, записывает всё, что он выдал, с номерами кадров, и сравнивает с ожиданием.
- **\`expectSubscriptions(obs.subscriptions).toBe(...)\`** — проверяет, в каких кадрах на тестовый поток подписались (\`^\`) и отписались (\`!\`).
- **Синтаксис времени (time progression)** — \`300ms\`, \`2s\`, \`1m\` внутри диаграммы вместо сотен дефисов.
- **\`fakeAsync\` / \`tick\`** — Angular-альтернатива: подменяет таймеры через Zone.js, работает с промисами, но не описывает поток диаграммой.

## Как это работает под капотом

Что происходит в тесте по шагам:

1. \`new TestScheduler((actual, expected) => expect(actual).toEqual(expected))\` — вы передаёте функцию сравнения из своего тест-раннера (Vitest, Jasmine, Jest). Сам \`TestScheduler\` ничего не утверждает, он только готовит два массива.
2. \`scheduler.run(callback)\` включает run mode: подменяет внутренние «провайдеры» таймеров RxJS (\`setInterval\`/\`setTimeout\`, \`setImmediate\`, \`requestAnimationFrame\`, часы \`Date.now\`) на виртуальные, поэтому все планировщики — \`asyncScheduler\`, \`asapScheduler\`, \`animationFrameScheduler\` — ставят задачи в **виртуальную** очередь. \`debounceTime(300)\` внутри \`run\` не трогает настоящий \`setTimeout\`. Глобальный \`setTimeout\`, вызванный вашим кодом напрямую, при этом остаётся настоящим.
3. \`cold('a-b|')\` разбирает строку в список сообщений вида \`{ frame: 0, notification: next('a') }\`, \`{ frame: 2, ... }\`, \`{ frame: 3, complete }\` и планирует их.
4. \`expectObservable(result)\` подписывается на результат в кадре 0 и записывает всё, что пришло, вместе с текущим виртуальным кадром.
5. Когда ваш колбэк закончился, \`run\` вызывает \`flush()\`: выполняет очередь в порядке времени, мгновенно перепрыгивая между кадрами. 60 секунд виртуального времени занимают 0 реальных миллисекунд.
6. Записанный массив сравнивается с массивом, разобранным из ожидаемой диаграммы, через вашу функцию. При падении вы видите оба массива, например:

\`\`\`text
actual   [{"frame":7,"notification":{"kind":"N","value":"c"}},{"frame":8,"notification":{"kind":"C"}}]
expected [{"frame":8,"notification":{"kind":"N","value":"c"}},{"frame":8,"notification":{"kind":"C"}}]
\`\`\`

\`kind\` — это вид уведомления: \`N\` — next, \`E\` — error, \`C\` — complete.

### Алфавит marble-диаграмм

- \`-\` — один кадр, в котором ничего не произошло.
- \`a\`, \`b\`, \`c\` — значение. Сам символ тоже занимает один кадр. Реальные значения задаются объектом: \`cold('a-b|', { a: 1, b: 2 })\`; без него значением будет сама строка \`'a'\`.
- \`|\` — \`complete\`.
- \`#\` — \`error\`. Значение ошибки — третий аргумент, по умолчанию строка \`'error'\`.
- \`()\` — несколько событий в **одном** кадре: \`(b|)\` — значение и завершение одновременно.
- \`^\` — в \`hot\` — точка подписки тестируемого кода; в диаграмме подписок — момент подписки.
- \`!\` — в диаграмме подписок — момент отписки.
- пробел — в run mode игнорируется, им удобно выравнивать диаграммы друг под другом.
- \`100ms\`, \`2s\`, \`1m\` — промотать столько времени (с пробелами вокруг).

### Пример 1. Простейший тест: map

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';
import { map } from 'rxjs';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

it('умножает на 10', () => {
  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('a-b-c|', { a: 1, b: 2, c: 3 });
    const result = source.pipe(map(x => x * 10));
    expectObservable(result).toBe('a-b-c|', { a: 10, b: 20, c: 30 });
  });
});
// PASS: значения 10, 20, 30 в кадрах 0, 2, 4, complete в кадре 5
\`\`\`

Время здесь не важно, но диаграмма всё равно проверяет и его: если бы \`map\` что-то задерживал, кадры не совпали бы.

### Пример 2. debounceTime: считаем кадры

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('-------c|');
});
// PASS
\`\`\`

Разберём по кадрам: \`a\` в кадре 0, \`b\` в 2, \`c\` в 4, \`|\` в 8. После \`a\` и \`b\` тишина меньше трёх кадров — они не выживают. После \`c\` тишина длится, и через 3 кадра (кадр 7) \`c\` выходит. В кадре 8 источник завершается. Частая ошибка — ожидать \`'--------(c|)'\`: будто \`c\` придёт вместе с \`complete\`. Это так, только если источник завершится **раньше**, чем истечёт пауза, — тогда \`debounceTime\` выдаёт ожидающее значение досрочно.

### Пример 3. Группа () тоже занимает время

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('(ab)-c|');
  expectObservable(source).toBe('(ab) 1ms c|'); // PASS: c в кадре 5
  // expectObservable(source).toBe('(ab)c|');   // FAIL: там c в кадре 4
});
\`\`\`

\`a\` и \`b\` приходят в кадре 0, но сама запись \`(ab)\` занимает 4 символа, и время продвигается на 4 кадра. Это самая частая причина «непонятных» диффов.

### Пример 4. Синтаксис времени и ловушка «плюс один»

Для \`debounceTime(300)\` рисовать 300 дефисов никто не будет:

\`\`\`ts
scheduler.run(({ cold, expectObservable }) => {
  // пользователь ввёл a, через 100 мс b, через 700 мс от начала c, в 1500 — complete
  const input = cold('a 99ms b 599ms c 799ms |');
  expectObservable(input.pipe(debounceTime(300)))
    .toBe('400ms b 599ms c 499ms |');
});
// PASS: b в кадре 400, c в кадре 1000, complete в 1500
\`\`\`

Почему \`99ms\`, а не \`100ms\`? Символ \`a\` сам занимает кадр 0, после него часы уже на кадре 1, и \`99ms\` приводят к кадру 100. Если написать \`'a 100ms b|'\`, \`b\` окажется в кадре 101 — проверено.

### Пример 5. hot, ^ и expectSubscriptions

\`\`\`ts
scheduler.run(({ hot, expectObservable, expectSubscriptions }) => {
  const source = hot('a-b-^-c-d-|');
  expectObservable(source).toBe('--c-d-|');
  expectSubscriptions(source.subscriptions).toBe('^-----!');
});
// PASS: a и b произошли до подписки и потеряны
\`\`\`

\`hot\` моделирует горячий источник (клики, \`Subject\`): события, случившиеся до \`^\`, подписчик не получит. В диаграмме подписок \`^\` — подписались в кадре 0 (точка \`^\` у \`hot\` и есть ноль), \`!\` — отписались, когда поток завершился.

### Пример 6. Доказать, что switchMap отменил запрос

\`\`\`ts
scheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
  const inner1 = cold('---x|');
  const inner2 = cold('---y|');
  const outer = hot('a-b------|');
  const result = outer.pipe(switchMap(v => (v === 'a' ? inner1 : inner2)));

  expectObservable(result).toBe('-----y---|');
  expectSubscriptions(inner1.subscriptions).toBe('^-!');    // отписка в кадре 2
  expectSubscriptions(inner2.subscriptions).toBe('--^---!');
});
// PASS
\`\`\`

Значения сами по себе не доказывают отмену: \`x\` мог бы просто потеряться. А \`'^-!'\` говорит точно: на первый «запрос» подписались в кадре 0 и **отписались** в кадре 2 — ровно когда пришла команда \`b\`. Это и есть проверка отмены HTTP-запроса.

### Пример 7. Ошибки и retry

\`\`\`ts
scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
  const source = cold('a-b-#', { a: 1, b: 2 }, new Error('500'));
  expectObservable(source.pipe(catchError(() => of(0))))
    .toBe('a-b-(z|)', { a: 1, b: 2, z: 0 });

  const failing = cold('--#');
  expectObservable(failing.pipe(retry(2))).toBe('------#');
  expectSubscriptions(failing.subscriptions).toBe(['^-!', '--^-!', '----^-!']);
});
// PASS
\`\`\`

Для \`retry\` массив диаграмм подписок показывает каждую попытку: исходная подписка и два повтора, каждый — новая подписка на холодный источник, которая падает через 2 кадра.

### Пример 8. Реальный тест: поиск из Angular-сервиса

Логику удобно вынести в чистую функцию, а HTTP подменить \`cold\`-потоком:

\`\`\`ts
export function createSearch(term$: Observable<string>, api: (q: string) => Observable<string[]>) {
  return term$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => api(q).pipe(
      map(items => ({ loading: false, items, error: null })),
      startWith({ loading: true, items: [], error: null }),
      catchError(() => of({ loading: false, items: [], error: 'fail' }))
    ))
  );
}

it('отменяет медленный запрос, когда пришёл новый', () => {
  scheduler.run(({ hot, cold, expectObservable, expectSubscriptions }) => {
    const term$ = hot('a 399ms b', { a: 'ang', b: 'angular' });
    const slow = cold('500ms r|', { r: ['ng1'] });
    const fast = cold('100ms r|', { r: ['ng2'] });
    const api = (q: string) => (q === 'ang' ? slow : fast);
    const L = { loading: true, items: [], error: null };

    expectObservable(createSearch(term$, api)).toBe('300ms l 399ms l 99ms s', {
      l: L,
      s: { loading: false, items: ['ng2'], error: null },
    });
    expectSubscriptions(slow.subscriptions).toBe('300ms ^ 399ms !');
    expectSubscriptions(fast.subscriptions).toBe('700ms ^ 100ms !');
  });
});
// PASS: запрос 'ang' отменён в кадре 700, ответ 'ng1' не пришёл никогда
\`\`\`

Тест читается как спецификация: через 300 мс после ввода — загрузка, новая команда в 700 мс отменяет медленный запрос, через 100 мс приходит результат. Реальные 800 мс не тратятся.

### Что будет без run mode

\`\`\`ts
const ts = new TestScheduler(assert);
ts.expectObservable(ts.createColdObservable('a|').pipe(delay(5))).toBe('-----(a|)');
ts.flush();
// FAIL: actual = []  ← delay ушёл на настоящий setTimeout

const ts2 = new TestScheduler(assert);
ts2.expectObservable(ts2.createColdObservable('a|').pipe(delay(50, ts2))).toBe('-----(a|)');
ts2.flush();
// PASS: планировщик передан явно, и кадр вне run mode равен 10 единицам времени
\`\`\`

Это старый стиль RxJS 5: планировщик приходилось прокидывать в каждый оператор. \`run\` избавил от этого.

### Где это применяется на практике

- **Поиск и автокомплит** — проверка \`debounceTime\`, \`distinctUntilChanged\` и отмены через \`switchMap\`.
- **Эффекты NgRx** — тестируются ровно так: \`actions$ = hot('-a', { a: action })\`, сервис возвращает \`cold('-r|')\`, ожидание — \`'--s'\`.
- **Повторы и поллинг** — \`retry\`, \`retry({ delay })\`, \`interval\` с \`switchMap\` в дашбордах: сколько попыток, с какими паузами.
- **Сервисы с WebSocket** — переподключение с задержкой, буферизация сообщений \`bufferTime\`.
- **Кнопки с \`exhaustMap\`** — доказать, что повторный клик во время запроса не создал подписку.

## Важные нюансы и подводные камни

- **\`TestScheduler\` вне \`scheduler.run\`** — операторы берут настоящие таймеры, в тесте пусто. Либо \`run\`, либо явный планировщик в каждом операторе.
- **\`-\` — это 1 мс в run mode**, а не «немного времени»; вне run mode кадр равен 10 единицам. Для больших интервалов используйте \`300ms\`, \`2s\`.
- **Ловушка «плюс один»** — символ значения сам занимает кадр, поэтому \`'a 99ms b'\` ставит \`b\` в кадр 100.
- **Скобки \`()\` занимают столько кадров, сколько в них символов**, включая сами скобки. Забыть про них или про их длину — самая частая причина непонятных диффов.
- **Выравнивание диаграмм** — неровно записанные строки означают другие кадры, и тест «падает на ровном месте». В run mode пробелы игнорируются: выравнивайте ими входную и ожидаемую диаграммы.
- **Только значения без \`expectSubscriptions\`** — тайминги подписки и отписки остаются непроверенными, а именно в них живут баги отмены и утечек.
- **Промисы не виртуализируются.** \`from(Promise.resolve(1))\` внутри \`run\` ничего не выдаст до \`flush\` — микрозадачи не подчиняются \`TestScheduler\`. Код с \`async\`/\`await\` и \`fetch\` тестируйте другими средствами.
- **\`cold\` против \`hot\`** — \`cold\` отсчитывает время от подписки (подходит для HTTP-ответа), \`hot\` — от начала теста (подходит для событий и \`actions$\`). Перепутать — получить сдвиг всех кадров.
- **Альтернативы** — в Angular есть \`fakeAsync\`/\`tick\` (нужен Zone.js), в Vitest, который в Angular 21 используется по умолчанию через \`@angular/build:unit-test\`, — \`vi.useFakeTimers()\`. Marble точнее для таймингов потоков, фейковые таймеры привычнее для компонентов и промисов.

**Плюсы:** мгновенные и стабильные тесты; проверяются и значения, и точные моменты, и подписки/отписки; диаграмма читается как спецификация поведения.
**Минусы:** свой синтаксис со счётом кадров, который легко ошибиться посчитать; не работает с промисами; сложные сценарии с большими объектами превращаются в длинные словари значений.

## Как это спрашивают на собеседовании

**Главный вывод:** \`TestScheduler\` в run mode подменяет все таймеры RxJS виртуальным временем, где кадр равен 1 мс; поток описывается marble-строкой, а тест сравнивает записанные \`{ frame, notification }\` с ожидаемыми, включая моменты подписки и отписки.

Типичные формулировки: «Как протестировать \`debounceTime\` без ожидания?», «Что такое marble-тесты?», «Как доказать, что \`switchMap\` отменил запрос?».

Что могут спросить следом:

- *Чем \`cold\` отличается от \`hot\` в тестах?* — \`cold\` начинает отсчёт с подписки, \`hot\` живёт в абсолютном времени, \`^\` отмечает подписку.
- *Что значат скобки?* — События в одном кадре; при этом группа занимает столько кадров, сколько в ней символов.
- *Как проверить отмену?* — \`expectSubscriptions(inner.subscriptions).toBe('^-!')\` — видно кадр отписки.
- *Почему тест с промисом не работает?* — Промисы — микрозадачи, \`TestScheduler\` их не контролирует.
- *Чем это отличается от \`fakeAsync\`?* — \`fakeAsync\` подменяет таймеры через Zone.js и умеет промисы, marble точнее описывает поток и проверяет подписки.

### Ответ на 1 минуту

> Marble-тестирование — это способ проверять потоки, зависящие от времени, без реального ожидания. \`TestScheduler\` построен на виртуальном времени: внутри \`scheduler.run\` все операторы вроде \`debounceTime\`, \`delay\` и \`interval\` автоматически ставят задачи в его очередь, а в конце \`run\` очередь выполняется мгновенно, и кадр там равен одной миллисекунде. Поток описывается строкой: дефис — пустой кадр, буквы — значения, вертикальная черта — \`complete\`, решётка — \`error\`, скобки — события в одном кадре, а \`300ms\` проматывает время. \`cold\` и \`hot\` создают тестовые источники, \`expectObservable\` записывает результат с номерами кадров и сравнивает через функцию из тест-раннера, а \`expectSubscriptions\` показывает кадры подписки и отписки — так я доказываю, что \`switchMap\` отменил запрос. Главные ловушки: вне \`run\` таймеры настоящие, скобки и сами символы тоже занимают кадры, а промисы не виртуализируются.`,
      en: `## In short

Streams with \`debounceTime\`, \`delay\`, or \`interval\` depend on time. Testing them with real timers is slow and flaky. \`TestScheduler\` gives you **virtual time**: operators schedule work on it and the test fast-forwards instantly.

Analogy: it is like a **cartoon storyboard**. Instead of watching three seconds of animation in real time, you lay two strips of frames side by side — "what went in" and "what we expect out" — and simply compare them.

## The marble alphabet

An ASCII string describes a stream over time:

- \`-\` — one time "frame" (1 ms by default).
- \`a\`, \`b\`, \`c\` — value emissions (the real values come from a second argument).
- \`|\` — \`complete\`.
- \`#\` — \`error\`.
- \`()\` — grouping several events **into one frame**.
- \`^\` — the subscription point (for \`hot\`).

The key helpers inside \`scheduler.run\`:

- \`cold(marble, values)\` — a cold Observable;
- \`hot(marble, values)\` — a hot one, where \`^\` marks when the subscription happens;
- \`expectObservable(...).toBe(...)\` — the assertion;
- \`expectSubscriptions(...)\` — checks subscription and unsubscription timings.

## How it works, step by step

1. Create \`new TestScheduler((actual, expected) => expect(actual).toEqual(expected))\` — the comparison callback from your test runner.
2. Put all the work inside \`scheduler.run(({ cold, hot, expectObservable }) => { ... })\`.
3. Inside \`run\`, every async operator **automatically** uses that scheduler instead of real timers.
4. Describe the input as a diagram string and apply the pipe.
5. Describe the expected output as a second string.
6. \`scheduler.run\` fast-forwards virtual time instantly and compares — no real time is spent at all.

## Example

\`\`\`ts
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source = cold('a-b-c---|');
  const result = source.pipe(debounceTime(3));
  expectObservable(result).toBe('--------(c|)');
});
\`\`\`

Why: \`a\` and \`b\` do not survive — fewer than three frames of silence follow them. Only \`c\` makes it, and in \`(c|)\` the parentheses mean the value and the \`complete\` arrive **in the same frame**.

## What to say in the interview

> Marble testing is how you verify time-dependent streams without spending real time. \`TestScheduler\` provides virtual time: inside \`scheduler.run\` every async operator is scheduled on it and the test fast-forwards the clock instantly, so tests are fast and non-flaky. The stream is described as an ASCII string: a dash is one time frame, a millisecond by default; letters are value emissions; a pipe character is \`complete\`; a hash is \`error\`; parentheses group several events into a single frame; and a caret marks the subscription point for hot streams. The main helpers are \`cold\` and \`hot\` for building sources, \`expectObservable(...).toBe(...)\` for the assertion, and \`expectSubscriptions\` for checking subscription and unsubscription timings. That last one is valuable when you need to prove that \`switchMap\` really did cancel the previous subscription. The \`TestScheduler\` constructor takes a comparison function, into which I plug my test runner's assertion.

## Gotchas

- **Using \`TestScheduler\` outside \`scheduler.run\`** — operators fall back to real timers and "run mode" never kicks in.
- **Forgetting that \`-\` is 1 ms**, not "a bit of time": for \`debounceTime(300)\` the \`300ms\` time-progression syntax is far easier.
- **Not aligning diagrams by column** — the test fails for no apparent reason even though the logic is right.
- **Forgetting the \`()\` grouping** for events in one frame — the most common cause of baffling diffs.
- **Asserting values only** — subscription and unsubscription timings stay unverified without \`expectSubscriptions\`.
- **Follow-up question**: how do you test without marbles? Via \`fakeAsync\`/\`tick\` in Angular; marbles are more precise about timing, \`fakeAsync\` is more familiar for components.`
    }
  },
  {
    id: 'rxjs-020',
    category: 'ngrx',
    level: 'Hard',
    tags: ['ngrx', 'store', 'actions', 'reducers'],
    question: {
      ru: 'Объясните архитектуру NgRx: store, actions, reducers и однонаправленный поток данных.',
      en: 'Explain the NgRx architecture: store, actions, reducers, and unidirectional data flow.'
    },
    answer: {
      ru: `## В чём суть

NgRx — это реализация паттерна Redux для Angular поверх RxJS. На нём держатся две идеи: **единый источник истины** (общее состояние приложения лежит в одном месте — store) и **однонаправленный поток данных** (состояние меняется **только** через события-actions и **только** в чистых функциях-reducers, а читается только через селекторы).

Аналогия: состояние — это **бухгалтерская книга**. Никто не подтирает цифры карандашом. Хотите изменение — подаёте **заявку** (action), бухгалтер (reducer) по строгим правилам переписывает **новую страницу**, а все остальные читают книгу через **выписки** (селекторы). Поскольку каждая заявка подшита в журнал, можно восстановить историю: «на этой странице сумма изменилась из-за заявки № 17». Отсюда и знаменитый time-travel в DevTools.

**Какую проблему решает.** В большом приложении одни и те же данные (текущий пользователь, корзина, фильтры таблицы) читают и меняют десятки компонентов и сервисов. Если каждый мутирует их сам, появляются вопросы без ответа: «кто поменял статус заказа?», «почему таблица показывает старые данные?», «в каком порядке пришли ответы сервера?». NgRx делает каждое изменение **именованным событием**, а каждый переход состояния — **чистой функцией**. В результате поведение предсказуемо, баг можно воспроизвести по журналу событий, а логика тестируется без моков.

## Словарик терминов

- **Состояние (state)** — все данные, от которых зависит интерфейс: список пользователей, флаг загрузки, текст ошибки. В NgRx это один большой объект-дерево.
- **Единый источник истины (single source of truth)** — у каждого куска данных ровно одно «главное» место хранения; все остальные только читают его.
- **Однонаправленный поток данных (unidirectional data flow)** — данные ходят по кругу в одну сторону: компонент → action → reducer → state → селектор → компонент. Обратных «коротких путей» нет.
- **Store** — сервис NgRx, который хранит состояние. Он сам является \`Observable\` состояния и умеет принимать actions через \`dispatch\`.
- **Action (действие, событие)** — простой объект с полем \`type\` и, при желании, данными (payload): \`{ type: '[Users Page] Load' }\`. Описывает, **что произошло**, а не как менять состояние.
- **\`dispatch\`** — метод store «отправить событие»: \`store.dispatch(loadUsers())\`.
- **\`createAction\` / \`props\`** — фабрика actions и описание типа их данных.
- **\`createActionGroup\`** — создаёт сразу группу actions одного источника, генерируя имена методов из названий событий.
- **Reducer (редьюсер)** — чистая функция \`(state, action) => newState\`: по старому состоянию и событию возвращает новое.
- **Чистая функция (pure function)** — функция без побочных эффектов: результат зависит только от аргументов, она ничего не меняет снаружи и ничего не запрашивает.
- **\`createReducer\` / \`on\`** — удобный способ собрать reducer из обработчиков «на такой action — такой переход».
- **Иммутабельность (immutability)** — данные не меняют «на месте», а создают новую копию с изменениями (\`{ ...state, loading: true }\`).
- **Selector (селектор)** — функция чтения куска состояния; через \`createSelector\` — с мемоизацией (запоминанием последнего результата).
- **Effect (эффект)** — место для побочных эффектов: HTTP, навигация, \`localStorage\`. Слушает actions и отправляет новые.
- **\`provideStore\` / \`provideState\`** — регистрация store и его «срезов» (feature state) в standalone-приложении.
- **Meta-reducer** — «обёртка» вокруг reducer-а, которая видит каждый action до и после него: логирование, сброс состояния при логауте, проверки.
- **Runtime checks** — встроенные проверки NgRx в dev-режиме: замораживают state и actions, чтобы мутация сразу падала с ошибкой.
- **Redux DevTools / time-travel** — расширение браузера, которое показывает журнал actions и состояние после каждого; можно «перемотать» приложение к любому шагу.
- **Сериализуемость (serializability)** — данные можно без потерь превратить в JSON и обратно (нет классов, функций, \`Date\`, \`Map\`).

## Как это работает под капотом

Когда вы пишете \`provideStore()\` и \`provideState('users', usersReducer)\`, NgRx собирает маленькую машину из RxJS-потоков. Вот что происходит по шагам:

1. Создаётся **шина событий** \`ActionsSubject\` — по сути \`Subject\`, куда попадает каждый action.
2. Все зарегистрированные reducers объединяются в один корневой reducer: каждый отвечает за свой ключ состояния (\`users\`, \`cart\`, …).
3. Сразу после старта NgRx отправляет служебный action \`@ngrx/store/init\`. Ни один \`on(...)\` на него не реагирует, поэтому каждый reducer возвращает своё **начальное состояние** — так собирается стартовое дерево.
4. Компонент вызывает \`store.dispatch(action)\`. Action попадает в шину.
5. Состояние «прокручивается» через корневой reducer: каждый срез получает свой кусок state и action. Кому action не интересен, возвращает **ту же самую ссылку**; кому интересен — новый объект.
6. Новое дерево состояния кладётся в \`BehaviorSubject\` (поток, который помнит последнее значение), и store эмитит его подписчикам.
7. Селекторы пересчитываются, но благодаря мемоизации и \`distinctUntilChanged\` (оператор «пропускать только изменившиеся значения») до компонента доходит эмиссия, **только если нужный ему кусок реально изменился**.
8. **После** того как reducers обработали action, он передаётся эффектам. Эффект делает побочную работу (HTTP) и отправляет **новый** action — и цикл повторяется с шага 4.

Главное следствие: состояние нельзя изменить «в обход». Единственная дверь — \`dispatch\`, единственное место изменения — reducer. Поэтому по журналу actions всегда можно объяснить, откуда взялось текущее состояние.

### Пример 1. Мини-Redux на RxJS за 20 строк

Чтобы механизм перестал быть магией, соберём его сами. Это упрощённая модель, но идея у NgRx именно такая:

\`\`\`js
const { Subject, BehaviorSubject, scan, map, distinctUntilChanged } = require('rxjs');

function createStore(reducer, initialState) {
  const actions$ = new Subject();                     // шина событий
  const state$ = new BehaviorSubject(initialState);   // текущее состояние
  actions$
    .pipe(scan((state, action) => reducer(state, action), initialState))
    .subscribe(state$);                               // каждое событие → новое состояние
  return {
    dispatch: (action) => actions$.next(action),
    select: (fn) => state$.pipe(map(fn), distinctUntilChanged()),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case '[Counter] Inc':
      return { ...state, count: state.count + 1 };
    case '[Todo] Add':
      return { ...state, todos: [...state.todos, action.text] };
    default:
      return state;                                   // чужое событие — та же ссылка
  }
}

const store = createStore(reducer, { count: 0, todos: [] });
store.select(s => s.count).subscribe(c => console.log('count:', c));
store.dispatch({ type: '[Counter] Inc' });
store.dispatch({ type: '[Todo] Add', text: 'купить молоко' });
store.dispatch({ type: '[Counter] Inc' });
// count: 0
// count: 1
// count: 2
\`\`\`

\`scan\` — оператор-«аккумулятор»: он помнит прошлое значение и на каждое событие вычисляет новое, ровно как \`reduce\` у массива, только растянутый во времени. Обратите внимание: после \`[Todo] Add\` подписчик на \`count\` **ничего не получил** — счётчик не изменился, и \`distinctUntilChanged\` отфильтровал повтор.

### \`createAction\` и \`props\` — события

В настоящем NgRx actions не пишут руками, а создают фабрикой. Она даёт и типобезопасность, и единое место, где объявлено имя события:

\`\`\`ts
import { createAction, props } from '@ngrx/store';

export const loadUsers = createAction('[Users Page] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);

console.log(loadUsers());
// { type: '[Users Page] Load' }
console.log(loadUsersSuccess({ users: [{ id: 1, name: 'Ann' }] }));
// { users: [ { id: 1, name: 'Ann' } ], type: '[Users API] Load Success' }
console.log(loadUsersSuccess.type);
// [Users API] Load Success
\`\`\`

Конвенция имени \`'[Источник] Событие'\`: в скобках — **кто** сообщает (страница, API, WebSocket), дальше — **что** произошло. \`'[Users Page] Load'\` и \`'[Users API] Load Success'\` — события от разных источников, и в DevTools это сразу видно. Здесь же правило «хорошей гигиены»: action описывает **событие** («страница открылась», «сервер ответил»), а не команду-сеттер (\`setUsers\`, \`setLoading\`).

### \`createActionGroup\` — группа событий одного источника

Когда у источника много событий, удобнее объявить их пачкой:

\`\`\`ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const UsersPageActions = createActionGroup({
  source: 'Users Page',
  events: {
    'Opened': emptyProps(),
    'Search Changed': props<{ query: string }>(),
  },
});

console.log(UsersPageActions.opened());
// { type: '[Users Page] Opened' }
console.log(UsersPageActions.searchChanged({ query: 'an' }));
// { query: 'an', type: '[Users Page] Search Changed' }
\`\`\`

Имена методов генерируются из названий событий (\`'Search Changed'\` → \`searchChanged\`), а \`source\` автоматически подставляется в скобки. Опечатку в имени события увидит TypeScript, а не пользователь.

### \`createReducer\` и \`on\` — чистые переходы

Reducer — обычная функция, её можно вызвать напрямую, без Angular и без store:

\`\`\`ts
import { createReducer, on } from '@ngrx/store';

interface UsersState { users: User[]; loading: boolean; error: string | null }
const initialState: UsersState = { users: [], loading: false, error: null };

export const usersReducer = createReducer(
  initialState,
  on(loadUsers, (s): UsersState => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }): UsersState => ({ ...s, loading: false, users }))
);

const s1 = usersReducer(initialState, loadUsers());
// { users: [], loading: true, error: null }
const s2 = usersReducer(s1, loadUsersSuccess({ users: [{ id: 1, name: 'Ann' }] }));
// { users: [ { id: 1, name: 'Ann' } ], loading: false, error: null }
const s3 = usersReducer(s2, { type: '[Cart] Add Item' });
console.log(s3 === s2);
// true — чужой action, состояние то же самое (та же ссылка)
console.log(usersReducer(undefined, { type: '@ngrx/store/init' }));
// { users: [], loading: false, error: null } — так собирается начальное состояние
\`\`\`

Reducer не знает ни про HTTP, ни про компоненты — он только описывает переход «было → стало». Поэтому тест reducer-а — это две строки без моков, а DevTools может «проиграть» историю заново: те же actions на тот же старт всегда дают тот же результат.

### \`provideStore\` / \`provideState\`, \`dispatch\` и \`select\` — весь цикл вживую

\`\`\`ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore(),                          // корневой store
    provideState('users', usersReducer),     // срез state.users
    provideEffects(UsersEffects),            // эффекты
  ],
};

// где угодно в приложении
const store = inject(Store);
store.select(selectLoading).subscribe(l => console.log('loading =', l));
store.dispatch(loadUsers());
// loading = false   ← текущее значение при подписке
// loading = true    ← reducer обработал loadUsers
// loading = false   ← эффект прислал loadUsersSuccess, reducer его обработал
\`\`\`

Это вывод реального запуска NgRx (эффект в нём отвечает синхронно). Видно, что store — это поток: подписчик сразу получает текущее значение, а потом каждое изменение своего куска.

### Селекторы — как компонент читает state

Компонент не должен знать форму всего дерева. Он просит готовый срез:

\`\`\`ts
export const selectUsersState = createFeatureSelector<UsersState>('users');
export const selectUsers = createSelector(selectUsersState, s => s.users);
export const selectLoading = createSelector(selectUsersState, s => s.loading);
\`\`\`

\`createFeatureSelector\` достаёт срез по ключу, под которым зарегистрирован reducer, а \`createSelector\` строит из него производные значения и **запоминает** последний результат: если входы не изменились (по ссылке), вычисление не повторяется. Именно поэтому иммутабельность в reducer-ах — не прихоть, а условие работы всей системы чтения.

### Effects — побочные эффекты вне reducer-ов

\`\`\`ts
@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private api = inject(UsersApi);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),                       // слушаем только своё событие
      switchMap(() =>
        this.api.getUsers().pipe(
          map(users => loadUsersSuccess({ users })),
          catchError(err => of(loadUsersFailure({ error: err.message })))
        )
      )
    )
  );
}
\`\`\`

Эффект — это поток, который слушает все actions, через \`ofType\` выбирает нужные, делает асинхронную работу и превращает результат в **новый action**. Важная деталь, проверенная запуском: эффект получает action **после** reducer-ов, поэтому если он прочитает state, то увидит уже \`loading: true\`.

### Runtime checks — защита от мутаций

В dev-режиме \`provideStore\` по умолчанию включает \`strictStateImmutability\` и \`strictActionImmutability\`: state и actions **замораживаются** (\`Object.freeze\`), и мутация падает сразу:

\`\`\`ts
on(addUser, (s, { user }) => {
  s.users.push(user);   // ❌ мутация
  return s;
})
// TypeError: Cannot add property 0, object is not extensible
\`\`\`

Проверки сериализуемости (\`strictStateSerializability\`, \`strictActionSerializability\`) по умолчанию **выключены**, их включают явно: \`provideStore({}, { runtimeChecks: { strictStateSerializability: true } })\`. В production-сборке все runtime checks отключены, поэтому мутация там уже не падает, а молча ломает обновление интерфейса.

### Redux DevTools и time-travel

Пакет \`@ngrx/store-devtools\` подключается через \`provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() })\`. После этого расширение браузера Redux DevTools показывает каждый action, разницу состояния до и после и позволяет «перемотать» приложение к любому шагу (time-travel). Работает это только потому, что reducers чистые и state сериализуем: DevTools заново применяет записанные actions к начальному состоянию.

### Компонент в современном стиле

\`\`\`ts
@Component({
  selector: 'app-users',
  template: \`
    @if (loading()) { <app-spinner /> }
    @for (u of users(); track u.id) { <app-user-row [user]="u" /> }
  \`,
})
export class UsersComponent {
  private store = inject(Store);
  readonly users = this.store.selectSignal(selectUsers);     // Signal<User[]>
  readonly loading = this.store.selectSignal(selectLoading); // Signal<boolean>

  ngOnInit() { this.store.dispatch(loadUsers()); }
}
\`\`\`

\`selectSignal\` возвращает сигнал (реактивную переменную Angular), поэтому в шаблоне не нужен \`async\`-pipe. Компонент делает ровно две вещи: сообщает о событии и читает готовые данные.

### Где это применяется на практике

- **Крупные enterprise-приложения** с общими данными между десятками экранов: банковские и трейдинговые панели, CRM, админки с правами.
- **Большие таблицы и дашборды**: фильтры, сортировка, пагинация и выбранные строки живут в store, и несколько виджетов синхронно реагируют на одно событие.
- **Сложные сценарии с сервером**: загрузка, повтор, отмена, оптимистичные обновления — каждое как отдельное событие, которое видно в DevTools.
- **Требования аудита и воспроизводимости**: по журналу actions можно восстановить, что делал пользователь перед ошибкой, и отправить его в систему логирования через meta-reducer.
- **Большая команда**: единые правила «событие → reducer → селектор» делают код разных людей похожим и предсказуемым.

## Важные нюансы и подводные камни

- **Мутация состояния в reducer** (\`state.users.push(...)\`). В dev её ловят runtime checks и бросают \`TypeError\`. В production проверок нет: ссылка остаётся прежней, мемоизация селекторов и \`OnPush\` считают, что ничего не изменилось, и интерфейс молча перестаёт обновляться.
- **Исключение внутри reducer ломает store.** Запуск показал: после ошибки в reducer последующие \`dispatch\` больше не меняют state до перезагрузки страницы. Reducer обязан быть простым и не бросать исключений.
- **HTTP и другие побочные эффекты в reducer** недопустимы: reducer должен быть чистым и синхронным. Всё асинхронное — только в Effects.
- **Actions как сеттеры** (\`setUsers\`, \`setLoading\`) — антипаттерн. Action описывает **событие** («сервер вернул пользователей»), а решение, как поменять state, принимает reducer. Иначе журнал DevTools превращается в список «записал X, записал Y», из которого не понять, что делал пользователь.
- **Один action на несколько источников** — теряется трассируемость. Поэтому источник и пишут в квадратных скобках, а одно и то же событие с двух экранов лучше объявить двумя actions.
- **Класть в store всё подряд**, включая локальное UI-состояние («открыт ли выпадающий список»), — boilerplate без пользы и конфликты между экземплярами компонента.
- **State должен быть сериализуемым.** Классы, функции, \`Date\`, \`Map\`, \`Set\` в state мешают DevTools, time-travel, сохранению в \`localStorage\` и гидрации при SSR. Даты храните строкой ISO или числом.
- **Reducers работают раньше эффектов.** Эффект получает action уже после того, как state обновлён; на этом строится, например, чтение свежего состояния в эффекте.
- **Не стройте логику на синхронности \`dispatch\`.** В простом случае state обновляется сразу, но action, отправленный изнутри другого action (из эффекта или подписчика), ставится в очередь. Читайте результат через селектор, а не сразу после \`dispatch\`.

**Плюсы:** предсказуемость (одна дверь для изменений), журнал событий и time-travel в DevTools, чистые и легко тестируемые reducers, явное разделение «события / переходы / чтение / побочные эффекты», масштабируемость для больших команд.
**Минусы:** заметный boilerplate (actions, reducer, selectors, effects на каждую фичу), высокий порог входа (RxJS, мемоизация, иммутабельность), избыточность для простых экранов и CRUD-форм.

## Как это спрашивают на собеседовании

**Главный вывод:** NgRx — это Redux на RxJS: единый store, состояние меняется только через actions в чистых reducers, читается через мемоизированные селекторы, а всё асинхронное живёт в Effects. Цена предсказуемости и DevTools — boilerplate.

Типичные формулировки: «Объясните архитектуру NgRx», «Что такое однонаправленный поток данных?», «Зачем reducer должен быть чистой функцией?», «Чем action отличается от команды?».

Что могут спросить следом:

- *Почему state должен быть сериализуемым?* — Из-за DevTools, time-travel, персиста в \`localStorage\` и гидрации при SSR; классы, \`Date\` и \`Map\` всё это ломают.
- *Что будет, если мутировать state?* — В dev упадёт runtime check с \`TypeError\`; в production мемоизация не увидит изменения, и UI перестанет обновляться.
- *Кто раньше видит action — reducer или эффект?* — Reducer: эффекты получают action после обновления state.
- *Как уменьшить boilerplate?* — \`createActionGroup\`, \`createFeature\` (авто-селекторы), \`@ngrx/entity\`, а для простых фич — NgRx SignalStore.
- *Что такое meta-reducer?* — Обёртка над reducer-ом, видящая каждый action: логирование, сброс state при логауте, гидрация из \`localStorage\`.

### Ответ на 1 минуту

> NgRx — это реализация Redux для Angular поверх RxJS, и держится она на двух принципах: единый источник истины и однонаправленный поток данных. Store хранит одно иммутабельное дерево состояния и сам является Observable. Компонент не меняет данные напрямую, а отправляет action — объект с типом вроде «[Users Page] Load», где в скобках источник события. Store прогоняет action через reducers — чистые функции «старое состояние плюс событие дают новое», собранные через createReducer и on. Компоненты читают state через мемоизированные селекторы, а всё асинхронное, например HTTP, живёт в Effects, которые слушают actions и отправляют новые. В итоге поведение предсказуемо, reducers тестируются без моков, а Redux DevTools показывает журнал и умеет time-travel. Из нюансов: мутация state в dev ловится runtime checks, а в проде молча ломает обновления, и actions должны описывать события, а не быть сеттерами. Цена — boilerplate, поэтому для простых фич я беру сигналы или SignalStore.`,
      en: `## In short

NgRx is Redux for Angular, built on RxJS. Two core ideas: a **single source of truth** (one state object for the whole app) and **unidirectional data flow** — state changes **only** through actions and **only** inside pure functions.

Analogy: state is an **accounting ledger**. Nobody erases figures with a pencil. Want a change? You file a **request** (an action), the accountant (the reducer) writes a **new page** by strict rules, and everyone else reads the ledger through **statements** (selectors). Hence time travel: you have the full history of requests.

## What it is made of

1. **Store** — a single immutable state object wrapped in an Observable. Components **read** it through selectors and never mutate it directly.
2. **Actions** — describe "what happened": an object with a \`type\` and an optional payload, created via \`createAction\`. Note the naming convention: \`'[Users] Load'\` names the event source in brackets, while \`'[Users API] Load Success'\` is a different source entirely.
3. **Reducers** — **pure functions** of the form \`(state, action) => newState\`. They mutate nothing, fetch nothing, and return a new object. Assembled with \`createReducer\` and \`on\`.
4. **Selectors** — memoized functions that read a slice of state.
5. **Effects** — the only place for side effects (HTTP, navigation, timers). Reducers must never contain them.

The full cycle: \`Component → dispatch(action) → Reducer → new State → Selector → Component\`. Plus the parallel branch: \`action → Effect → HTTP → new action\`.

## Example

\`\`\`ts
export const loadUsers = createAction('[Users Page] Load');
export const loadUsersSuccess = createAction(
  '[Users API] Load Success',
  props<{ users: User[] }>()
);

export const reducer = createReducer(
  initialState,
  on(loadUsers, (s) => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
);
\`\`\`

Why: the reducer knows nothing about HTTP or components — it only describes a transition between states. So its test is two lines with no mocks, and Redux DevTools can replay the entire history.

## What to say in the interview

> NgRx is a Redux-pattern implementation for Angular built on RxJS, and its core principles are a single source of truth and unidirectional data flow. The Store holds one immutable state object wrapped in an Observable; components read from it through selectors and never mutate it directly. Actions describe what happened: an object with a type and an optional payload created via \`createAction\`, where by convention the name carries the event source in square brackets. Reducers are pure functions taking state plus an action and returning a new state, assembled with \`createReducer\` and \`on\` handlers, while side effects like HTTP live in Effects, not in reducers — that is fundamental. The upsides are predictability, which is what gives you time travel in Redux DevTools; testability, because reducers are pure; and scalability for large applications with widely shared state. The cost is noticeable boilerplate, so NgRx is overkill for simple cases — and modern \`createFeature\` and SignalStore exist precisely to reduce that cost.

## Gotchas

- **Mutating state in a reducer** (\`state.users.push(...)\`) — it breaks selector memoization and OnPush; things silently stop updating.
- **HTTP inside a reducer** — a reducer must be pure and synchronous. Side effects belong in Effects only.
- **Actions as setters** (\`setUsers\`, \`setLoading\`) — an anti-pattern. An action describes an **event**, not a write command.
- **One action reused across sources** — you lose traceability; that is exactly why the source is named in brackets.
- **Putting everything in the store**, including local UI state — you pay boilerplate for nothing.
- **Follow-up question**: why must state be serializable? Because of DevTools, time travel, and hydration; classes, \`Date\`, and \`Map\` in state make life hard.`
    }
  },
  {
    id: 'rxjs-021',
    category: 'ngrx',
    level: 'Hard',
    tags: ['ngrx', 'effects', 'side-effects'],
    question: {
      ru: 'Как работают NgRx Effects? Почему важна семантика switchMap/concatMap и обработка ошибок?',
      en: 'How do NgRx Effects work? Why do switchMap/concatMap semantics and error handling matter?'
    },
    answer: {
      ru: `## В чём суть

Effect в NgRx — это **слой побочных эффектов**: HTTP-запросы, навигация, таймеры, \`localStorage\`, WebSocket. Эффект слушает бесконечный поток всех actions, отбирает нужные, выполняет асинхронную работу и **отправляет новый action** с результатом. Благодаря этому reducers остаются чистыми и синхронными.

Аналогия: actions — это **радиоэфир диспетчерской службы**. Effect — выездная бригада, которая слушает эфир, ловит свой позывной (\`ofType\`), выезжает на вызов и по возвращении **докладывает в тот же эфир** новым сообщением: «успех» или «провал». Бригада не пишет в журнал сама — журнал (state) ведёт диспетчер (reducer) по докладам.

**Какую проблему решает.** Reducer обязан быть чистой функцией, но приложению нужен сервер. Без Effects HTTP-логика расползается по компонентам: каждый сам вызывает API, сам обрабатывает ошибки, сам решает, что делать с повторным кликом. Effects собирают эту логику в одно место, где явно видно, **на какое событие** запускается работа, **что делать с параллельными запросами** и **во что превращается ошибка**. Два последних пункта и есть то, на чём чаще всего ломаются в проде и ловят на собеседовании.

## Словарик терминов

- **Побочный эффект (side effect)** — любое действие, которое выходит за пределы вычисления: запрос на сервер, запись в хранилище, переход по роуту, лог.
- **\`Actions\`** — инжектируемый поток всех actions приложения. Эффект получает action **после** того, как его обработали reducers.
- **\`ofType\`** — оператор-фильтр: пропускает только actions указанных типов и сужает тип payload для TypeScript.
- **\`createEffect\`** — помечает поток как эффект, чтобы NgRx на него подписался и отправлял его результаты в store.
- **Функциональный эффект (functional effect)** — эффект-функция вне класса: \`createEffect(fn, { functional: true })\`.
- **\`provideEffects\`** — регистрирует классы или объекты с эффектами в standalone-приложении.
- **Внешний и внутренний поток (outer / inner Observable)** — внешний — это \`actions$\`, живёт всё время работы приложения; внутренний — HTTP-запрос, который создаётся на каждый action.
- **Higher-order оператор (оператор «уплощения»)** — превращает каждое значение внешнего потока во внутренний поток и решает, что делать, если новый action пришёл, пока старый запрос ещё идёт: \`switchMap\`, \`concatMap\`, \`mergeMap\`, \`exhaustMap\`.
- **\`catchError\`** — перехватывает ошибку в потоке и заменяет её другим потоком (например, \`of(failureAction)\`). Поток, в котором произошла ошибка, при этом завершается.
- **\`dispatch: false\`** — настройка эффекта «ничего не отправлять в store»: для навигации, логов, уведомлений.
- **\`concatLatestFrom\`** — оператор из \`@ngrx/operators\`: подмешивает к action текущее значение из store, подписываясь на селектор лениво, только когда action пришёл.
- **\`mapResponse\`** — оператор из \`@ngrx/operators\`: \`map\` и \`catchError\` в одном вызове с обязательной веткой \`error\`.
- **\`ErrorHandler\`** — глобальный обработчик ошибок Angular; сюда NgRx сообщает об ошибках эффектов.

## Как это работает под капотом

Что происходит от клика до данных на экране:

1. При старте \`provideEffects(UsersEffects)\` создаёт экземпляр класса, находит все свойства, созданные через \`createEffect\`, и **подписывается** на каждое. Эффекты живут столько же, сколько приложение (или lazy-фича, где они зарегистрированы).
2. Компонент отправляет \`loadUsers()\`. Сначала его обрабатывают **reducers** (например, ставят \`loading: true\`), и только потом action попадает в поток \`Actions\`.
3. Эффект пропускает поток через \`ofType(loadUsers)\` — чужие actions отсекаются.
4. Higher-order оператор превращает action во внутренний поток — HTTP-запрос — и по своим правилам решает судьбу предыдущего запроса, если тот ещё не закончился.
5. Ответ превращается в **новый action**: \`loadUsersSuccess({ users })\` или, через \`catchError\`, \`loadUsersFailure({ error })\`.
6. NgRx получает этот action из эффекта, проверяет, что это действительно action (объект со строковым \`type\`), и отправляет его в store. Если нет — сообщает в \`ErrorHandler\`: «dispatched an invalid action».
7. Reducer ловит \`loadUsersSuccess\` и кладёт данные в state. Круг замкнулся.

Упрощённо NgRx делает с каждым эффектом примерно следующее:

\`\`\`ts
// псевдокод того, что делает NgRx при регистрации эффекта
effect$
  .pipe(defaultEffectsErrorHandler)        // ошибка → ErrorHandler и переподписка (до 10 раз)
  .subscribe(action => {
    if (config.dispatch !== false) store.dispatch(action);
  });
\`\`\`

Отсюда две критичные точки: **какой оператор** стоит на шаге 4 (это семантика отмены и очереди) и **где стоит \`catchError\`** (это вопрос, переживёт ли эффект первую ошибку).

### Пример 1. Классический эффект загрузки

\`\`\`ts
@Injectable()
export class UsersEffects {
  private actions$ = inject(Actions);
  private api = inject(UsersApi);

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsers),
      switchMap(() =>
        this.api.getUsers().pipe(
          map(users => loadUsersSuccess({ users })),
          catchError(err => of(loadUsersFailure({ error: err.message })))
        )
      )
    )
  );
}

// app.config.ts: provideEffects(UsersEffects)
// Лог actions при трёх загрузках, вторая падает с 500:
// [Users Page] Load
// [Users API] Load Success {"users":[{"id":1,"name":"Ann"}]}
// [Users Page] Load
// [Users API] Load Failure {"error":"500 Internal Server Error"}
// [Users Page] Load
// [Users API] Load Success {"users":[{"id":1,"name":"Ann"}]}
\`\`\`

Это вывод реального запуска NgRx. Ошибка превратилась в **обычный action**, а эффект продолжил работать: третья загрузка снова успешна.

### Функциональные эффекты

Начиная с NgRx 15.2 эффект можно объявить без класса — зависимости приходят через параметры по умолчанию с \`inject()\`:

\`\`\`ts
// users.effects.ts
export const loadUsers = createEffect(
  (actions$ = inject(Actions), api = inject(UsersApi)) =>
    actions$.pipe(
      ofType(UsersPageActions.opened),
      switchMap(() =>
        api.getUsers().pipe(
          map(users => UsersApiActions.loadSuccess({ users })),
          catchError(err => of(UsersApiActions.loadFailure({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

// app.config.ts
import * as usersEffects from './users.effects';
provideEffects(usersEffects);
\`\`\`

Поведение то же самое, просто меньше кода. В тестах такой эффект удобно вызвать напрямую, передав свои \`actions$\` и мок API как аргументы.

### \`ofType\` — фильтр по позывному

\`\`\`ts
this.actions$.pipe(
  ofType(UsersPageActions.opened, UsersPageActions.refreshClicked),
  // здесь TypeScript знает, что action — один из двух этих типов
)
\`\`\`

\`ofType\` принимает один или несколько action creators. Он не только фильтрует, но и сужает тип: после него у action доступны поля payload без приведений типов.

### Выбор оператора — это выбор семантики

Чтобы увидеть разницу вживую, отправим три action «Сохранить» с интервалом 30 мс. «Сервер» отвечает по-разному: запрос 1 — за 120 мс, запрос 2 — за 40 мс, запрос 3 — за 80 мс. Меняется только одна строчка эффекта:

\`\`\`ts
save$ = createEffect(() =>
  this.actions$.pipe(
    ofType(save),
    OPERATOR(({ id }) => this.api.save(id).pipe(map(() => saved({ id }))))
  )
);
// store.dispatch(save({ id: 1 }));                        // t = 0
// setTimeout(() => store.dispatch(save({ id: 2 })), 30);  // t = 30
// setTimeout(() => store.dispatch(save({ id: 3 })), 60);  // t = 60
\`\`\`

Ниже результаты реального запуска для каждого оператора.

### \`switchMap\` — «важен только последний»

\`\`\`ts
// switchMap → saved: 3   (запросы 1 и 2 отменены)
\`\`\`

Новый action **отписывается** от предыдущего внутреннего потока. Для HTTP в Angular отписка означает отмену запроса в браузере. Идеален для «загрузить по фильтру», поиска, открытия карточки: старый ответ уже никому не нужен. **Опасен для записей**: команды пользователя теряются.

### \`concatMap\` — «очередь по порядку»

\`\`\`ts
// concatMap → saved: 1, 2, 3   (≈120 мс, 160 мс, 240 мс — строго один за другим)
\`\`\`

Следующий запрос стартует только после завершения предыдущего. Порядок сохраняется, ничего не теряется — правильный выбор для **мутаций**: сохранение, удаление, изменение статуса, где важна последовательность.

### \`mergeMap\` — «всё параллельно»

\`\`\`ts
// mergeMap → saved: 2, 1, 3   (порядок ответов, а не запросов)
\`\`\`

Все запросы идут одновременно, результаты приходят в порядке ответов сервера. Подходит для **независимых** операций: удалить 5 разных строк, загрузить детали нескольких разных сущностей. Не подходит, когда порядок важен.

### \`exhaustMap\` — «занят, не мешай»

\`\`\`ts
// exhaustMap → saved: 1   (2 и 3 проигнорированы: пришли, пока шёл запрос 1)
\`\`\`

Пока активен текущий запрос, новые actions **игнорируются**. Это защита от двойного клика: логин, «Оплатить», «Обновить». Пользователь нажал пять раз — уйдёт один запрос.

### Как выбрать

- Нужен только актуальный результат (поиск, фильтр, переход между карточками) → \`switchMap\`.
- Запись, где важен порядок и нельзя ничего потерять → \`concatMap\`.
- Независимые операции над разными сущностями, можно параллельно → \`mergeMap\`.
- Повторное нажатие во время выполнения нужно игнорировать (логин, оплата, refresh) → \`exhaustMap\`.
- Сомневаетесь для мутации → \`concatMap\`: он медленнее, но никогда не теряет и не переставляет команды.

### \`catchError\` — внутри, а не снаружи

\`catchError\` заменяет упавший поток другим, но **поток, где произошла ошибка, завершается**. Поэтому критично, какой поток упадёт — внутренний (HTTP) или внешний (\`actions$\`):

\`\`\`ts
// ❌ catchError снаружи — на уровне actions$
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() => this.api.getUsers().pipe(map(users => loadUsersSuccess({ users })))),
    catchError(err => of(loadUsersFailure({ error: err.message })))
  )
);
// 12 загрузок с ошибкой, затем одна успешная — лог actions:
// [Users Page] Load
// [Users API] Load Failure      ← первая ошибка обработана...
// [Users Page] Load             ← ...а дальше эффект мёртв:
// [Users Page] Load                на остальные 11 загрузок ответа нет,
// ...                              включая последнюю, успешную
\`\`\`

Ошибка прошла через \`switchMap\` наружу, \`catchError\` заменил **весь** поток эффекта на \`of(failure)\`, тот выдал один action и завершился. Эффект больше не слушает \`actions$\` до перезагрузки страницы. Внутри \`switchMap\` (как в Примере 1) завершается только одноразовый HTTP-поток, а внешний живёт дальше.

А если \`catchError\` нет **вообще**? Тогда срабатывает встроенная страховка NgRx — \`defaultEffectsErrorHandler\`: ошибка уходит в \`ErrorHandler\`, и NgRx заново подписывается на эффект. Реальный запуск:

\`\`\`ts
// ❌ catchError нет совсем; наш ErrorHandler просто логирует сообщение
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() => this.api.getUsers().pipe(map(users => loadUsersSuccess({ users }))))
  )
);
// 11 загрузок подряд падают с ошибками #1…#11, затем одна успешная:
// ErrorHandler: 500 #1
// ...
// ErrorHandler: 500 #10   ← 10 сообщений, после каждого NgRx переподписывается
//                         ← ошибка #11 — без сообщения, эффект умер
//                         ← успешная загрузка — без ответа
\`\`\`

Страховка не спасает интерфейс: \`loadUsersFailure\` **не отправляется**, спиннер висит, а после 10 переподписок эффект умирает молча. Отключается она флагом \`createEffect(fn, { useEffectsErrorHandler: false })\`. Вывод один: обрабатывайте ошибку сами и внутри.

### \`mapResponse\` — \`map\` и \`catchError\` в одном

\`\`\`ts
import { mapResponse } from '@ngrx/operators';

switchMap(() =>
  this.api.getUsers().pipe(
    mapResponse({
      next: (users) => loadUsersSuccess({ users }),
      error: (err: HttpErrorResponse) => loadUsersFailure({ error: err.message }),
    })
  )
)
\`\`\`

Внутри это ровно \`map(next)\` плюс \`catchError(e => of(error(e)))\`. Польза в том, что ветку \`error\` нельзя забыть — без неё код не скомпилируется.

### \`dispatch: false\` — эффекты без ответа

\`\`\`ts
redirectAfterSave$ = createEffect(
  () => this.actions$.pipe(
    ofType(profileSaved),
    tap(() => this.router.navigate(['/profile']))
  ),
  { dispatch: false }
);
\`\`\`

Навигация, тост, запись в \`localStorage\`, аналитика ничего не возвращают в store. Без \`{ dispatch: false }\` будет беда, причём не та, которую обычно называют: \`tap\` пропускает **исходный** action дальше, NgRx снова его отправляет, эффект снова его ловит — бесконечный цикл. Проверено запуском:

\`\`\`ts
// забыли { dispatch: false }:
// navigate 1
// navigate 2
// navigate 3
// ... и так до зависания вкладки
\`\`\`

Если же эффект через \`map\` вернёт не action (например, \`Promise\` из \`router.navigate\`), TypeScript не скомпилирует такой \`createEffect\`, а в рантайме NgRx сообщит в \`ErrorHandler\`: \`Effect "..." dispatched an invalid action\`.

### \`concatLatestFrom\` — прочитать state внутри эффекта

\`\`\`ts
import { concatLatestFrom } from '@ngrx/operators';

nextPage$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadNextPage),
    concatLatestFrom(() => this.store.select(selectPage)),
    exhaustMap(([, page]) =>
      this.api.getPage(page + 1).pipe(map(p => pageLoaded({ page: p })))
    )
  )
);
// два клика «Дальше» при page = 1:
// [Users API] Page Loaded {"page":2}
// [Users API] Page Loaded {"page":3}
\`\`\`

Внутри это \`concatMap(action => of(action).pipe(withLatestFrom(...)))\`: подписка на селектор создаётся **только когда пришёл action**. Обычный \`withLatestFrom\` подписывается сразу при создании эффекта и держит селектор активным всё время — это лишняя работа и проблема для lazy-фич, чей state ещё не зарегистрирован. С v17 оператор живёт в пакете \`@ngrx/operators\`, а с v18 из \`@ngrx/effects\` его уже не импортировать — миграция \`ng update\` переписывает импорт сама.

### Где это применяется на практике

- **Загрузка данных экрана**: открытие страницы → \`switchMap\` → success/failure; смена фильтров таблицы отменяет устаревший запрос.
- **Формы и мутации**: сохранение через \`concatMap\`, чтобы правки уходили на сервер по порядку; после успеха — отдельный эффект с \`dispatch: false\` для тоста и навигации.
- **Логин и платежи**: \`exhaustMap\` против двойного клика.
- **Пакетные операции**: удаление выбранных строк большой таблицы через \`mergeMap\` с ограничением параллельности (\`mergeMap(fn, 4)\`).
- **Синхронизация с внешним миром**: WebSocket-сообщения превращаются в actions, состояние фильтров сохраняется в \`localStorage\` или URL.
- **Оркестрация**: после \`orderCreated\` эффект отправляет \`cartCleared\` и \`notificationShown\` — одно событие запускает реакции в разных фичах.

## Важные нюансы и подводные камни

- **\`catchError\` снаружи** — эффект отдаёт один failure-action и навсегда перестаёт слушать \`actions$\`. Спрашивают почти всегда.
- **\`catchError\` нет вообще** — NgRx отправит ошибку в \`ErrorHandler\` и переподпишется, но failure-action не будет, а после 10 ошибок эффект умрёт молча. Это страховка, а не обработка ошибок.
- **\`switchMap\` на сохранении.** Два быстрых клика — первый запрос отменяется в браузере, но сервер мог уже получить и обработать его. Клиент теряет подтверждение, и состояние становится непредсказуемым. Для записей — \`concatMap\` или \`exhaustMap\`.
- **Забыть \`{ dispatch: false }\` на эффекте с \`tap\`** — исходный action отправляется снова, получается бесконечный цикл, вкладка зависает.
- **Слушать и отправлять один и тот же action** — тот же бесконечный цикл другим путём.
- **Бизнес-правила в эффекте вместо reducer.** Эффект оркестрирует (запросить, отправить событие), а вычисление нового state — работа reducer-а. Иначе логику не проверить простым тестом чистой функции.
- **\`withLatestFrom\` вместо \`concatLatestFrom\`** — селектор подписан с момента старта эффекта; для lazy-фич это может читать ещё не существующий state.
- **Эффект в lazy-фиче** начинает работать только после загрузки этой фичи: actions, отправленные раньше, он не увидит.
- **\`mergeMap\` без ограничения** при массовых операциях может отправить сотни запросов одновременно; второй аргумент \`mergeMap(fn, 4)\` ограничивает параллельность.

**Плюсы:** все побочные эффекты в одном предсказуемом месте, reducers остаются чистыми, семантика гонок явно видна по оператору, эффекты легко тестировать изолированно, одно событие может запускать реакции в разных фичах.
**Минусы:** нужен уверенный RxJS, легко ошибиться с оператором или позицией \`catchError\`, логика размазывается между action, reducer и эффектом, бесконечные циклы и «мёртвые» эффекты не видны без внимательного код-ревью.

## Как это спрашивают на собеседовании

**Главный вывод:** эффект — это поток \`actions$ → ofType → higher-order оператор → новый action\`. Оператор задаёт семантику гонок (\`switchMap\` отменяет, \`concatMap\` ставит в очередь, \`mergeMap\` параллелит, \`exhaustMap\` игнорирует), а \`catchError\` обязан стоять внутри оператора, иначе первая ошибка убьёт эффект.

Типичные формулировки: «Как работают NgRx Effects?», «Почему эффект перестал реагировать после ошибки?», «Какой оператор взять для сохранения формы?», «Зачем \`dispatch: false\`?».

Что могут спросить следом:

- *Как прочитать state в эффекте?* — Через \`concatLatestFrom(() => this.store.select(selector))\` из \`@ngrx/operators\`: подписка на селектор ленивая, только когда пришёл action.
- *Что будет без \`catchError\`?* — NgRx сообщит в \`ErrorHandler\` и переподпишется до 10 раз, но failure-action не отправит, и спиннер повиснет.
- *Как тестировать эффект?* — Подменить поток actions через \`provideMockActions\` из \`@ngrx/effects/testing\` (или передать свой поток в функциональный эффект), замокать API и проверить, какой action вышел; для таймингов — marble-тесты на \`TestScheduler\`, где поток во времени описывается строкой-диаграммой вроде \`-a--b|\`.
- *Чем \`exhaustMap\` отличается от \`switchMap\`?* — \`switchMap\` отменяет старый запрос ради нового, \`exhaustMap\` игнорирует новые, пока старый не закончился.
- *Когда эффекту нужен \`dispatch: false\`?* — Когда он ничего не возвращает в store: навигация, тосты, логи, \`localStorage\`.

### Ответ на 1 минуту

> Effect в NgRx — это слой побочных эффектов: он слушает поток всех actions, уже после reducers, фильтрует его через ofType, выполняет асинхронную работу вроде HTTP и превращает результат в новый action — success или failure. Так reducers остаются чистыми. Критичны два места. Первое — higher-order оператор, потому что это семантика гонок: switchMap отменяет предыдущий запрос и хорош для поиска и фильтров, но опасен для сохранения; concatMap ставит запросы в очередь и подходит для мутаций; mergeMap выполняет всё параллельно; exhaustMap игнорирует новые клики, пока идёт текущий, — это логин и оплата. Второе — catchError должен стоять внутри оператора, вокруг HTTP. Если поставить его снаружи, первая ошибка завершит весь поток эффекта, и он навсегда перестанет реагировать. Ещё нюансы: эффекту с tap для навигации нужен dispatch false, иначе тот же action уйдёт по кругу, а state в эффекте я читаю через concatLatestFrom.`,
      en: `## In short

An Effect is the **side-effect layer**: HTTP, navigation, timers, localStorage. It listens to the endless stream of actions, picks the ones it cares about, does the async work, and **dispatches a new action** with the result. Reducers stay pure throughout.

Analogy: actions are the **dispatch radio**. An Effect is the crew that monitors the channel, hears its call sign (\`ofType\`), drives out to the job, and on return **reports back on the same channel** with a new message: success or failure.

## How it works, step by step

1. A component dispatches \`loadUsers()\`.
2. The action enters the **shared \`actions$\` stream** — every effect and every reducer hears it.
3. If the reducer has an \`on(loadUsers)\`, it sets \`loading: true\`. Synchronously and purely.
4. The effect filters the stream with \`ofType(loadUsers)\`, letting only its own type through.
5. A higher-order operator turns the action into an HTTP request.
6. The response is mapped into a **new action**: \`loadUsersSuccess({ users })\` or \`loadUsersFailure({ error })\`.
7. That action goes back into \`actions$\`, the reducer picks it up and stores the data. The loop is closed.

## Operator choice and error handling — the two critical spots

**The operator** = cancellation semantics:

- **\`switchMap\`** — cancels the previous request. Good for "load by filter", **dangerous for "save"**: you lose the user's commands.
- **\`concatMap\`** — a queue, preserves order. The best choice for writes and mutations.
- **\`mergeMap\`** — parallel, no ordering guarantees.
- **\`exhaustMap\`** — ignores new ones while the current is active. For "refresh" and login.

**\`catchError\` is mandatory and must sit inside** the higher-order operator, wrapping the inner request. Put it outside, at the \`actions$\` level, and after the very first error the **whole effect stream completes** and stops reacting to actions **forever**, until a page reload.

## Example

\`\`\`ts
loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsers),
    switchMap(() =>
      this.api.getUsers().pipe(
        map(users => loadUsersSuccess({ users })),
        catchError(err => of(loadUsersFailure({ error: err.message })))
      )
    )
  )
);

// a non-dispatching effect — navigation, for instance
redirect$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUsersSuccess),
    tap(() => this.router.navigate(['/users']))
  ), { dispatch: false }
);
\`\`\`

Why: \`catchError\` inside \`switchMap\` turns the error into an **ordinary action**, so the outer \`actions$\` stream lives on. And \`{ dispatch: false }\` is required wherever the effect returns nothing to the store — otherwise NgRx tries to dispatch \`undefined\`.

## What to say in the interview

> An Effect is the side-effect layer: it listens to the actions stream, filters it with \`ofType\`, performs async work such as HTTP, and dispatches new actions with the result, which is what keeps reducers pure. Two things are critical. First, the choice of higher-order operator, because that is a choice of cancellation semantics: \`switchMap\` cancels the previous request and suits loading by filter, but is dangerous for saving since it silently drops commands; \`concatMap\` builds a queue and preserves order, making it the right pick for mutations; \`exhaustMap\` ignores new values while one is in flight, which suits login and refresh. Second, \`catchError\` must sit inside the higher-order operator: put it outside at the \`actions$\` level and the first error completes the whole effect stream, which then stops reacting to actions forever — a classic production bug. As nuances: navigation or logging effects need \`dispatch: false\`, and you must never dispatch the same action you listen to, or you get an infinite loop.

## Gotchas

- **\`catchError\` on the outside** — the effect dies after the first error and silently stops working. Asked nearly every time.
- **\`switchMap\` on a save** — two quick clicks, the first request is cancelled, the data never lands.
- **Forgetting \`{ dispatch: false }\`** on a \`tap\`-based effect — NgRx tries to dispatch a non-action and throws.
- **Listening to and dispatching the same action** — an infinite loop that kills the tab.
- **Business rules in the effect instead of the reducer** — an effect should orchestrate, not compute state.
- **Follow-up question**: how do you read a slice of state in an effect? With \`concatLatestFrom\` (the lazy \`withLatestFrom\`), so the selector is not evaluated on every action.`
    }
  },
  {
    id: 'rxjs-022',
    category: 'ngrx',
    level: 'Hard',
    tags: ['ngrx', 'selectors', 'memoization'],
    question: {
      ru: 'Как работают селекторы NgRx и их мемоизация? Зачем createSelector?',
      en: 'How do NgRx selectors and their memoization work? Why createSelector?'
    },
    answer: {
      ru: `## В чём суть

Селектор — это **чистая функция чтения** состояния. Компонент не роется в store целиком, а просит готовый срез: «дай мне видимых пользователей». \`createSelector\` добавляет к этому **мемоизацию**: если входные данные не изменились, тяжёлое вычисление (фильтрация, сортировка, группировка) не повторяется, а возвращается сохранённый результат — **та же самая ссылка**.

Аналогия: селектор — это **вопрос бухгалтеру**. Мемоизация — его блокнот: «этот же вопрос при тех же цифрах я уже считал, вот готовый ответ». Пересчитает он, только если цифры реально поменялись. Но блокнот у него на **одну** страницу: спросите про другой отдел — старая запись сотрётся.

**Какую проблему решает.** Store эмитит новое состояние на **каждый** action в приложении — добавили товар в корзину, а все подписчики списка пользователей получили новое дерево state. Без мемоизации каждый из них заново фильтровал бы и сортировал тысячи строк, создавал новый массив, и Angular перерисовывал бы таблицу, хотя в ней ничего не поменялось. Селекторы решают сразу три задачи: прячут форму state от компонентов, не повторяют лишних вычислений и отдают стабильные ссылки, на которых держится \`OnPush\` и сигналы.

## Словарик терминов

- **Селектор (selector)** — функция \`(state) => значение\`, которая достаёт или вычисляет кусок состояния.
- **Мемоизация (memoization)** — запоминание результата функции для конкретных аргументов: те же аргументы — тот же результат без пересчёта.
- **\`createSelector\`** — фабрика мемоизированного селектора из входных селекторов и projector-функции.
- **Входной селектор (input selector)** — селектор, чьи результаты передаются в projector как аргументы.
- **Projector (проектор)** — последняя функция в \`createSelector\`, которая из входов вычисляет результат.
- **Сравнение по ссылке (reference equality, \`===\`)** — проверка «это тот же самый объект в памяти?», без сравнения содержимого. Очень дешёвая.
- **\`createFeatureSelector\`** — селектор верхнего уровня, который достаёт срез state по ключу фичи (\`state.users\`).
- **\`store.select\`** — превращает селектор в \`Observable\`; внутри применяет \`distinctUntilChanged\`.
- **\`distinctUntilChanged\`** — RxJS-оператор: пропускает значение, только если оно отличается (по \`===\`) от предыдущего.
- **\`store.selectSignal\`** — превращает селектор в сигнал Angular.
- **Фабрика селекторов (selector factory)** — функция, которая по параметру (например, id) возвращает новый селектор со своим кэшем.
- **\`release()\`** — метод мемоизированного селектора: сбрасывает его кэш и кэши входных селекторов.
- **\`createSelectorFactory\` / \`resultMemoize\`** — низкоуровневые API для селектора со своей стратегией сравнения.
- **\`OnPush\`** — стратегия проверки изменений Angular: компонент перерисовывается, только когда входные данные сменили ссылку или сработало событие/сигнал.

## Как это работает под капотом

У мемоизированного селектора **два уровня** кэша. Вот исходник NgRx в сильно упрощённом виде:

\`\`\`ts
function createSelector(...inputs, projector) {
  const memoProjector = memoize(projector);              // уровень 2: кэш по входам
  const memoState = memoize((state) =>                   // уровень 1: кэш по state
    memoProjector(...inputs.map(sel => sel(state)))
  );
  return memoState;
}

function memoize(fn) {
  let lastArgs = null, lastResult = null;
  return (...args) => {
    if (lastArgs && args.every((a, i) => a === lastArgs[i])) return lastResult;
    lastResult = fn(...args);
    lastArgs = args;
    return lastResult;
  };
}
\`\`\`

Что происходит при каждом новом состоянии:

1. Store получает action, reducers возвращают новое дерево state, store эмитит его.
2. \`store.select(selector)\` вызывает селектор с этим state.
3. **Уровень 1:** если пришёл тот же объект state, что и в прошлый раз (\`===\`), селектор сразу возвращает старый результат — даже входные селекторы не вызываются.
4. Иначе вызываются все **входные селекторы**, каждый достаёт свой кусок.
5. **Уровень 2:** результаты входов сравниваются с прошлыми **по ссылке**. Все совпали — projector **не запускается**, возвращается сохранённая ссылка.
6. Хоть один вход изменился — projector считает заново, новые входы и результат **запоминаются** (и вытесняют старые: кэш на одну запись).
7. \`store.select\` пропускает результат через \`distinctUntilChanged\`: та же ссылка, что в прошлый раз, до подписчика **не доходит** вообще.

Почему это работает: reducers иммутабельны. Если action не трогал \`state.users.list\`, ссылка на массив осталась прежней, и сравнения \`===\` достаточно, чтобы понять «ничего не изменилось» — без обхода тысяч элементов.

### Пример 1. Фильтр пользователей: когда projector запускается

\`\`\`ts
let runs = 0;
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

const selectVisibleUsers = createSelector(selectUsers, selectFilter, (users, filter) => {
  runs++;
  return users.filter(u => u.name.toLowerCase().includes(filter));
});

const s1 = { users: { list: [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }], filter: 'a' }, cart: { items: 0 } };
const r1 = selectVisibleUsers(s1);
console.log(r1, runs);            // [ { id: 1, name: 'Ann' } ] 1

const s2 = { ...s1, cart: { items: 1 } };            // изменилась только корзина
console.log(selectVisibleUsers(s2) === r1, runs);    // true 1 — projector не запускался

const s3 = { ...s2, users: { ...s2.users, filter: 'b' } };
console.log(selectVisibleUsers(s3), runs);           // [ { id: 2, name: 'Bob' } ] 2
\`\`\`

\`s2\` — новый объект state, поэтому уровень 1 не сработал, входные селекторы вызвались. Но они вернули **те же** \`list\` и \`filter\`, и уровень 2 отдал старую ссылку без пересчёта.

### Пример 2. Уровень 1: тот же state — даже входы не вызываются

\`\`\`ts
let inputCalls = 0;
const selectItems = createSelector(
  (s: AppState) => { inputCalls++; return s.cart.items; },
  n => n * 10
);
selectItems(s1); selectItems(s1); selectItems(s1);
console.log(inputCalls);   // 1
\`\`\`

Когда несколько компонентов читают один селектор от одного и того же state, работа делается один раз.

### \`store.select\` и \`distinctUntilChanged\` — что доходит до компонента

\`\`\`ts
store.select(selectVisibleUsers).subscribe(list =>
  console.log('emit:', list.map(u => u.name).join(','), '| runs =', runs)
);
store.dispatch(itemAdded());                       // чужой срез
store.dispatch(itemAdded());
store.dispatch(filterChanged({ filter: 'b' }));
store.dispatch(filterChanged({ filter: 'b' }));    // тот же фильтр ещё раз
// emit: Ann,Bob | runs = 1
// emit: Bob | runs = 2
\`\`\`

Четыре action — две эмиссии и два запуска projector. Изменения корзины не дошли вовсе. Повторный \`filterChanged\` с тем же значением создал новый объект \`state.users\`, но \`selectFilter\` вернул ту же строку \`'b'\`, а \`selectUsers\` — тот же массив, так что projector не запускался и эмиссии не было.

### \`store.selectSignal\` — то же самое, но сигналом

\`\`\`ts
readonly visibleUsers = this.store.selectSignal(selectVisibleUsers);
// в шаблоне: @for (u of visibleUsers(); track u.id) { ... }
console.log(this.visibleUsers().map(u => u.name));   // [ 'Bob' ]
\`\`\`

Мемоизация работает так же: сигнал меняется, только когда селектор вернул новую ссылку, и Angular перерисует лишь те шаблоны, что читают этот сигнал.

### Композиция: селектор как вход другого селектора

\`\`\`ts
export const selectUsersState = createFeatureSelector<UsersState>('users');
export const selectUsers = createSelector(selectUsersState, s => s.list);
export const selectFilter = createSelector(selectUsersState, s => s.filter);
export const selectVisibleUsers = createSelector(selectUsers, selectFilter, filterByName);
export const selectVisibleCount = createSelector(selectVisibleUsers, list => list.length);
\`\`\`

Получается граф зависимостей, где каждый узел кэширует свой результат. Если \`selectVisibleUsers\` вернул старую ссылку, \`selectVisibleCount\` тоже не пересчитывается. Тяжёлые вычисления стоит выносить в отдельные узлы, чтобы ими пользовались несколько селекторов.

### Словарная форма и «view model»

\`\`\`ts
const selectVm = createSelector({
  users: selectVisibleUsers,
  items: (s: AppState) => s.cart.items,
});
const vm1 = selectVm(s1);
console.log(vm1);                       // { users: [ { id: 1, name: 'Ann' } ], items: 0 }
console.log(vm1 === selectVm({ ...s1 }));   // true — входы те же, объект тот же
\`\`\`

Вместо projector можно передать объект селекторов — получится мемоизированный объект для всего шаблона. Удобно, когда компоненту нужно 5–6 значений сразу.

### Параметризованные селекторы: фабрика

У селектора кэш на **одну** запись. Если вызывать его по очереди с разными данными, он промахивается каждый раз:

\`\`\`ts
let runs3 = 0;
const selectCount = createSelector((s: AppState) => s.users.list, l => { runs3++; return l.length; });
selectCount(stateA); selectCount(stateB); selectCount(stateA); selectCount(stateB);
console.log(runs3);   // 4 — ни одного попадания в кэш
\`\`\`

Поэтому селектор с параметром делают **фабрикой**: каждый вызов создаёт новый селектор со своим кэшем.

\`\`\`ts
export const selectUserById = (id: number) =>
  createSelector(selectUsers, users => users.find(u => u.id === id));

console.log(selectUserById(1)(s1));                      // { id: 1, name: 'Ann' }
console.log(selectUserById(1) === selectUserById(1));    // false — каждый раз новый селектор

// ✅ создаём один раз на экземпляр компонента
readonly user = this.store.selectSignal(selectUserById(this.id));
\`\`\`

Старый способ — «селекторы с props» (\`store.select(selector, { id })\`) — объявлен устаревшим: у всех вызовов был общий кэш на одну запись, и в списке он промахивался постоянно.

### \`projector\` и \`release()\` — тесты и сброс кэша

\`\`\`ts
// тест бизнес-логики без store: вызываем projector напрямую
console.log(selectVisibleUsers.projector([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }], 'bo'));
// [ { id: 2, name: 'Bob' } ]

selectVisibleUsers(s3);        // из кэша, projector не вызван
selectVisibleUsers.release();  // сбросили кэш (и кэши входных селекторов)
selectVisibleUsers(s3);        // projector вызван заново
\`\`\`

\`projector\` позволяет тестировать логику селектора на голых данных, без построения всего дерева state. \`release()\` освобождает запомненные аргументы и результат: полезно для селекторов, которые держат большие данные и больше не нужны. В тестах с \`provideMockStore\` есть ещё \`store.overrideSelector(selector, value)\` — подмена результата без state.

### \`createSelectorFactory\` и \`resultMemoize\` — своя стратегия сравнения

Если входы изменились, а результат по содержимому тот же, обычный селектор всё равно отдаст **новую** ссылку. Это можно исправить своим сравнением результата:

\`\`\`ts
import { createSelectorFactory, resultMemoize } from '@ngrx/store';

const isJsonEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const createDeepSelector = createSelectorFactory(fn => resultMemoize(fn, isJsonEqual));

const selectIdsPlain = createSelector(selectUsers, users => users.map(u => u.id));
const selectIdsDeep = createDeepSelector(selectUsers, (users: User[]) => users.map(u => u.id));

// stateB: у пользователей поменялись имена, но не id
console.log(selectIdsPlain(stateA) === selectIdsPlain(stateB));   // false
console.log(selectIdsDeep(stateA) === selectIdsDeep(stateB));     // true
\`\`\`

Глубокое сравнение само стоит времени, поэтому применяют его точечно: когда лишняя эмиссия дороже сравнения (например, перерисовка графика).

### Где это применяется на практике

- **Большие таблицы**: фильтр, сортировка и пагинация считаются в селекторах; изменения в других частях state не заставляют пересчитывать тысячи строк.
- **Дашборды**: агрегаты (суммы, средние, группировки) — отдельные узлы графа селекторов, которыми пользуются несколько виджетов.
- **View model для сложного экрана**: словарная форма \`createSelector({...})\` собирает всё нужное шаблону в один стабильный объект.
- **Карточка сущности по id**: фабрика \`selectUserById(id)\`, созданная один раз на компонент.
- **Права и фичи**: \`selectCanEditOrder\` из ролей пользователя и статуса заказа — одна точка правды для кнопок, роутов и guards.
- **Тесты**: бизнес-правила проверяются через \`projector\` на голых данных, а компоненты — через \`overrideSelector\`.

## Важные нюансы и подводные камни

- **Мутация в reducer ломает мемоизацию.** Ссылка та же, данные другие — селектор вернёт устаревший результат:

\`\`\`ts
const names = createSelector((s: AppState) => s.users.list, l => l.map(u => u.name));
console.log(names(state));                          // [ 'Ann' ]
state.users.list.push({ id: 2, name: 'Bob' });      // ❌ мутация на месте
console.log(names({ ...state }));                   // [ 'Ann' ] — устарело!
\`\`\`

- **Кэш на одну запись.** Один селектор, вызываемый с разными данными по очереди (например, в списке с разными id), промахивается каждый раз. Нужна фабрика — свой селектор на каждый параметр.
- **Фабрику не вызывают в шаблоне или геттере.** \`selectUserById(id)\` при каждой проверке изменений создаёт новый селектор с пустым кэшем — мемоизация исчезает. Создавайте селектор один раз в поле компонента.
- **Входной селектор, создающий новый массив, убивает всё.** \`s => s.users.list.filter(...)\` в роли входа каждый раз возвращает новую ссылку, и projector запускается на каждое изменение state (проверено: 3 вызова — 3 пересчёта). Фильтрацию делайте в projector, а входы оставляйте «достающими».
- **Тяжёлые вычисления вне projector** (до \`createSelector\` или в компоненте) мемоизация не защищает.
- **Новый массив из projector — это нормально**, пока входы те же: projector просто не запускается. А вот при изменившихся входах результат будет новой ссылкой, даже если содержимое совпало, — тогда помогает \`resultMemoize\`.
- **Селектор обязан быть чистым.** Побочные эффекты (лог, запись куда-то) будут выполняться непредсказуемо — то есть, то нет — из-за кэша, а time-travel в DevTools станет неверным.
- **Селекторы с props устарели.** Старый синтаксис \`store.select(selector, props)\` помечен \`@deprecated\`, вместо него — фабрики.
- **Мемоизированный селектор держит последний результат в памяти.** Обычно это не проблема. Фабричный селектор компонента можно освободить через \`release()\` в \`ngOnDestroy\`, но если на него больше никто не ссылается, его и так соберёт сборщик мусора. Опаснее фабричные селекторы, которые вы сами кладёте в \`Map\`-кэш: их нужно удалять оттуда, иначе память растёт.

**Плюсы:** дешёвые проверки по ссылке вместо пересчётов, стабильные ссылки для \`OnPush\` и сигналов, композиция в граф зависимостей, компоненты не знают форму state, бизнес-логика тестируется через \`projector\`.
**Минусы:** работает только при строгой иммутабельности, кэш на одну запись требует фабрик для параметров, легко незаметно убить мемоизацию «новым» входом, для глубокого сравнения нужен низкоуровневый API.

## Как это спрашивают на собеседовании

**Главный вывод:** \`createSelector\` кэширует последний результат и сравнивает входы по ссылке; если входы те же, projector не запускается и возвращается та же ссылка, а \`store.select\` с \`distinctUntilChanged\` не пускает её к подписчику. Всё это работает только при иммутабельных reducers.

Типичные формулировки: «Как работает мемоизация селекторов?», «Зачем \`createSelector\`, если можно \`store.select(s => s.users)\`?», «Как сделать селектор с параметром?», «Почему компонент не обновился?».

Что могут спросить следом:

- *Сколько результатов хранит кэш?* — Один: последние входы и последний результат. Для параметров — фабрика селекторов.
- *Что сравнивается — содержимое или ссылки?* — Ссылки (\`===\`), поэтому дёшево, но требует иммутабельности.
- *Как протестировать селектор?* — Вызвать \`selector.projector(...)\` с готовыми данными; в тестах компонентов — \`provideMockStore\` и \`overrideSelector\`.
- *Как сбросить кэш?* — \`selector.release()\`; он сбрасывает и кэши входных селекторов.
- *Чем \`selectSignal\` отличается от \`select\`?* — Возвращает сигнал вместо Observable; мемоизация та же, подписка не нужна.

### Ответ на 1 минуту

> Селектор в NgRx — это чистая функция, которая достаёт или вычисляет кусок состояния, а компонент подписывается на него через store.select или selectSignal. createSelector строит мемоизированный селектор из входных селекторов и projector-функции. Кэш у него двухуровневый: если пришёл тот же объект state, результат отдаётся сразу; иначе вызываются входные селекторы, и их результаты сравниваются с прошлыми по ссылке — если всё совпало, projector не запускается и возвращается та же ссылка. А store.select ещё применяет distinctUntilChanged, так что подписчик не получает повторов. Это важно, потому что store эмитит на каждый action в приложении, а фильтрация и сортировка больших списков дорогие. Нюансы: всё держится на иммутабельности, мутация даст устаревшие данные; кэш на одну запись, поэтому для параметров делаю фабрику и создаю селектор один раз на компонент; и входы не должны создавать новые массивы.`,
      en: `## In short

A selector is a **pure read function** over state. A component does not rummage through the whole store; it asks for the slice it needs: \`store.select(selectVisibleUsers)\`.

\`createSelector\` adds **memoization**: if the inputs have not changed, the expensive work (filtering, sorting) is not redone — the stored result is returned.

Analogy: a selector is a **question to your accountant**. Memoization is their notepad: "same question, same figures, I worked it out yesterday — here is the answer". They only recalculate if the figures actually changed.

## How it works, step by step

1. \`createSelector\` takes **input selectors** plus a **projector function** as the last argument.
2. New state arrives — \`store.select\` invokes the selector.
3. The selector calls every input selector and collects their values.
4. It compares them with the **previous inputs by reference** (\`===\`).
5. They match → the projector **does not run**, and the cached result is returned.
6. They differ → the projector recomputes, and both the result and the inputs are **stored**.
7. \`store.select\` additionally applies \`distinctUntilChanged\`, so a reference-equal result never even reaches the subscriber.

This matters because \`store.select\` emits on **every** state change in the app, including changes to entirely unrelated slices.

## Example

\`\`\`ts
const selectUsers = (s: AppState) => s.users.list;
const selectFilter = (s: AppState) => s.users.filter;

export const selectVisibleUsers = createSelector(
  selectUsers,
  selectFilter,
  (users, filter) => users.filter(u => u.name.includes(filter))
);
\`\`\`

Why: if \`state.cart\` changes, \`selectUsers\` and \`selectFilter\` return the **same references**, the projector never runs, and the subscriber gets no emission. Selectors also **compose**: \`selectVisibleUsers\` can be an input to the next selector, giving you a dependency graph with cache reuse.

## What to say in the interview

> A selector is a pure function that extracts a slice of state and derives values from it, and components subscribe to it through \`store.select\`. \`createSelector\` builds a memoized selector out of input selectors and a projector function. Memoization works like this: the selector caches the last result together with the last input values and on every call compares the inputs by reference; if they are unchanged the projector is skipped and the cached value is returned. That is essential, because \`store.select\` emits on every state change in the application and a projector doing filtering and sorting can be expensive. Selectors compose: one can be an input to another. As for pitfalls: reference memoization only works if immutability is respected. The cache holds exactly one result, so parameterized selectors need a factory that returns a fresh \`createSelector\` per argument set. And it is worth remembering that \`store.select\` applies \`distinctUntilChanged\` by reference itself, dropping duplicates.

## Gotchas

- **Mutating state in a reducer** breaks memoization: same reference, different data — the component never updates.
- **A single-result cache**: a parameterized selector called in an \`*ngFor\` with different ids **misses every time**. Use a factory.
- **Heavy work outside the projector** — computing before \`createSelector\` means memoization cannot help.
- **A projector creating a new object/array** each run with unchanged inputs is fine — the cache returns the old reference; but a **new input** each time destroys everything.
- **A selector with side effects** — it must be pure, or time travel in DevTools breaks.
- **Follow-up question**: how do you clear the cache? A memoized selector has \`release()\`, and factory-created selectors should be released when the component is destroyed.`
    }
  },
  {
    id: 'rxjs-023',
    category: 'ngrx',
    level: 'Medium',
    tags: ['ngrx', 'entity-adapter', 'normalization'],
    question: {
      ru: 'Что такое NgRx Entity Adapter и зачем нужна нормализация состояния?',
      en: 'What is the NgRx Entity Adapter and why normalize state?'
    },
    answer: {
      ru: `## В чём суть

Хранить коллекцию в state как **массив объектов** неудобно: чтобы найти или обновить элемент по id, нужно перебирать весь массив, а если те же данные лежат ещё где-то (клиент внутри каждого заказа), копии со временем расходятся. **Нормализация** — это хранить сущности как **словарь по id** плюс отдельный массив id для порядка. \`@ngrx/entity\` даёт \`createEntityAdapter\`, который поддерживает такую форму за вас и выдаёт готовые иммутабельные операции и селекторы.

Аналогия: массив — это **стопка бумаг**, где нужный документ ищешь перелистыванием. Нормализованное состояние — **картотека с пронумерованными ячейками**: знаешь номер — достаёшь мгновенно. А отдельная **опись** (массив \`ids\`) хранит порядок, в котором карточки показывать. Если клиент переехал, вы меняете одну карточку клиента, а не адрес в каждом его заказе.

**Какую проблему решает.** В реальных приложениях коллекции большие и живые: таблица на 5 000 строк, где по WebSocket каждую секунду меняется статус одной строки; заказы, у которых общий клиент; выбранный элемент, который надо найти по id. На массивах каждая такая операция — проход по всему списку и ручной иммутабельный spread, где легко ошибиться. Адаптер превращает это в однострочные вызовы \`updateOne\`, \`upsertMany\`, \`removeOne\` с правильными новыми ссылками, на которых работают мемоизация селекторов и \`OnPush\`.

## Словарик терминов

- **Нормализация (normalization)** — хранение каждой сущности ровно в одном месте, в словаре по id; связи между сущностями — через id, а не через вложенные копии.
- **Денормализованные данные** — вложенные копии: заказ содержит весь объект клиента, и один клиент повторяется в десятке заказов.
- **\`EntityState<T>\`** — форма нормализованной коллекции: \`{ ids: [...], entities: { [id]: T } }\`.
- **\`ids\`** — массив идентификаторов, задаёт порядок отображения.
- **\`entities\`** — словарь «id → объект» для мгновенного доступа.
- **\`Dictionary<T>\`** — тип словаря в \`@ngrx/entity\`; значение по ключу типизировано как \`T | undefined\`.
- **\`createEntityAdapter\`** — фабрика адаптера: набор функций для чтения и иммутабельного изменения \`EntityState\`.
- **\`selectId\`** — функция «как достать id из объекта», если поле называется не \`id\`.
- **\`sortComparer\`** — функция сравнения для постоянной сортировки \`ids\` (как в \`Array.sort\`).
- **\`Update<T>\`** — объект частичного обновления: \`{ id, changes: Partial<T> }\`.
- **Upsert (update + insert)** — «обнови, если есть, иначе добавь».
- **\`getSelectors\`** — готовые селекторы \`selectAll\`, \`selectEntities\`, \`selectIds\`, \`selectTotal\`.
- **O(1) и O(n)** — оценка скорости: O(1) — время не зависит от размера коллекции (доступ по ключу), O(n) — растёт вместе с числом элементов (перебор массива).
- **\`withEntities\`** — аналог адаптера для NgRx SignalStore из \`@ngrx/signals/entities\`.

## Как это работает под капотом

Адаптер — это не «магия стора», а набор **чистых функций** вида \`(аргумент, state) => newState\`. Что происходит, например, при \`adapter.updateOne({ id: 2, changes: { name: 'Aaron' } }, state)\`:

1. Адаптер берёт \`state.entities[2]\` — по ключу, за O(1), без перебора.
2. Если такой сущности нет, он возвращает **тот же самый** объект state: ничего не изменилось — ссылка прежняя, селекторы не пересчитаются.
3. Если есть, создаёт **новый объект сущности** \`{ ...old, ...changes }\`.
4. Создаёт **новый словарь** \`entities\`, где по ключу 2 лежит новый объект, а все остальные значения — **те же ссылки**, что были.
5. Если задан \`sortComparer\` и изменение влияет на порядок, пересобирает \`ids\` в новом порядке; если нет — оставляет массив \`ids\` прежним.
6. Возвращает новый state \`{ ...state, ids, entities }\`, сохраняя ваши дополнительные поля (\`loading\`, \`selectedId\`).

Упрощённо так выглядит суть двух операций:

\`\`\`ts
function updateOne({ id, changes }, state) {
  const old = state.entities[id];
  if (!old) return state;                                   // нечего менять — та же ссылка
  const entities = { ...state.entities, [id]: { ...old, ...changes } };
  return { ...state, entities };                            // + пересортировка ids при sortComparer
}

function addOne(entity, state) {
  const id = selectId(entity);
  if (id in state.entities) return state;                   // уже есть — молча игнорируем
  return {
    ...state,
    ids: [...state.ids, id],                                // или вставка по sortComparer
    entities: { ...state.entities, [id]: entity },
  };
}
\`\`\`

Из пункта 4 следует главное практическое свойство: изменилась одна строка таблицы — у остальных 4 999 строк ссылки прежние, и их компоненты с \`OnPush\` не перерисовываются.

### Пример 1. Почему массив неудобен

\`\`\`ts
const users = [{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }];

// обновить одного = пройти весь массив
const next = users.map(u => (u.id === 2 ? { ...u, name: 'Robert' } : u));
console.log(next);                  // [ { id: 1, name: 'Ann' }, { id: 2, name: 'Robert' } ]
console.log(next[0] === users[0]);  // true — хорошо, если не забыли вернуть u как есть

// найти по id = тоже перебор
const bob = users.find(u => u.id === 2);   // O(n)
\`\`\`

На двух элементах это незаметно. На таблице в 5 000 строк с обновлениями по WebSocket каждый апдейт — это проход по всему массиву и шанс случайно пересоздать все объекты (а значит, перерисовать все строки).

### Пример 2. Нормализация руками

\`\`\`ts
const normalized = users.reduce(
  (acc, u) => ({ ids: [...acc.ids, u.id], entities: { ...acc.entities, [u.id]: u } }),
  { ids: [], entities: {} }
);
console.log(JSON.stringify(normalized));
// {"ids":[1,2],"entities":{"1":{"id":1,"name":"Ann"},"2":{"id":2,"name":"Bob"}}}
console.log(normalized.entities[2].name);   // Bob — по ключу, без перебора
\`\`\`

Это и есть форма \`EntityState\`. Писать такие reduce-ы и иммутабельные обновления для каждой коллекции вручную — скучно и рискованно, поэтому существует адаптер.

### \`createEntityAdapter\` и \`getInitialState\`

\`\`\`ts
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

interface User { id: number; name: string; role?: string }
interface UsersState extends EntityState<User> { loading: boolean; selectedId: number | null }

export const adapter: EntityAdapter<User> = createEntityAdapter<User>({
  // selectId: (u) => u.uuid,                     // если id лежит не в поле id
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const initialState: UsersState = adapter.getInitialState({ loading: false, selectedId: null });
console.log(JSON.stringify(initialState));
// {"ids":[],"entities":{},"loading":false,"selectedId":null}
\`\`\`

\`getInitialState\` создаёт пустые \`ids\` и \`entities\` и домешивает ваши поля. \`selectId\` по умолчанию читает \`entity.id\`.

### \`addOne\`, \`addMany\`, \`setAll\` — добавление

\`\`\`ts
let s = adapter.addOne({ id: 2, name: 'Bob' }, initialState);
s = adapter.addOne({ id: 1, name: 'Ann' }, s);
console.log(JSON.stringify(s.ids));                 // [1,2] — отсортировано по имени

const same = adapter.addOne({ id: 1, name: 'Ann CHANGED' }, s);
console.log(same === s, same.entities[1]);          // true { id: 1, name: 'Ann' } — проигнорирован

const many = adapter.addMany([{ id: 1, name: 'DUP' }, { id: 3, name: 'Cid' }], s);
console.log(JSON.stringify(many.ids));              // [1,2,3] — дубликат id 1 пропущен

const all = adapter.setAll([{ id: 3, name: 'Cid' }], s);
console.log(JSON.stringify(all.ids));               // [3] — коллекция заменена целиком
\`\`\`

\`addOne\`/\`addMany\` **не перезаписывают** существующие id и не сообщают об этом. \`setAll\` выбрасывает всё старое — типичный выбор для \`loadSuccess\`.

### \`updateOne\`, \`setOne\`, \`upsertOne\` — изменение

\`\`\`ts
const base = adapter.updateOne({ id: 1, changes: { role: 'admin' } }, s);
// entities[1] = { id: 1, name: 'Ann', role: 'admin' }

adapter.upsertOne({ id: 1, name: 'Anna' }, base).entities[1];
// { id: 1, name: 'Anna', role: 'admin' }   ← upsert сливает поля (поверхностно)

adapter.setOne({ id: 1, name: 'Anna' }, base).entities[1];
// { id: 1, name: 'Anna' }                  ← set заменяет объект целиком, role пропал

const upd = adapter.updateOne({ id: 2, changes: { name: 'Aaron' } }, s);
console.log(JSON.stringify(upd.ids));       // [2,1] — Aaron теперь раньше Ann
console.log(adapter.updateOne({ id: 99, changes: { name: 'X' } }, s) === s);   // true
\`\`\`

\`updateOne\` принимает \`Update<T>\` — \`{ id, changes }\` — и не создаёт сущность, если её нет. \`setOne\` и \`upsertOne\` принимают **целую** сущность и добавят её, если id новый; разница в том, что \`setOne\` **заменяет** объект, а \`upsertOne\` **сливает** новые поля со старыми. Есть и пакетные версии: \`updateMany\`, \`setMany\`, \`upsertMany\`.

### \`removeOne\`, \`removeMany\`, \`removeAll\` — удаление

\`\`\`ts
adapter.removeOne(2, s).ids;                              // [1]
adapter.removeMany(u => u.name.startsWith('B'), s).ids;   // [1] — можно по предикату
JSON.stringify(adapter.removeAll({ ...s, loading: true }));
// {"ids":[],"entities":{},"loading":true,"selectedId":null} — свои поля сохраняются
\`\`\`

\`removeMany\` принимает массив id или функцию-предикат. \`removeAll\` очищает только коллекцию — \`loading\` и прочие поля остаются.

### \`mapOne\` и \`map\` — изменение через функцию

\`\`\`ts
const m = adapter.mapOne({ id: 2, map: u => ({ ...u, name: u.name.toUpperCase() }) }, s);
console.log(m.entities[2]);                    // { id: 2, name: 'BOB' }
console.log(m.entities[1] === s.entities[1]);  // true — нетронутая сущность с той же ссылкой
\`\`\`

Удобно, когда новое значение зависит от старого («переключить флаг», «увеличить счётчик»). \`map\` применяет функцию ко всем сущностям.

### \`getSelectors\` — готовые селекторы

\`\`\`ts
// 1) без аргумента — селекторы над самим EntityState
const { selectAll, selectTotal } = adapter.getSelectors();
selectAll(s);    // [ { id: 1, name: 'Ann' }, { id: 2, name: 'Bob' } ] — в порядке ids
selectTotal(s);  // 2

// 2) с селектором фичи — мемоизированные селекторы для store
const selectUsersState = createFeatureSelector<UsersState>('users');
export const { selectAll: selectAllUsers, selectEntities: selectUserEntities, selectTotal: selectUsersTotal } =
  adapter.getSelectors(selectUsersState);

store.dispatch(loadSuccess({ users: [{ id: 7, name: 'Zed' }, { id: 5, name: 'Eve' }] }));
store.selectSignal(selectAllUsers)().map(u => u.name);   // [ 'Eve', 'Zed' ]

export const selectSelectedUser = createSelector(
  selectUserEntities,
  createSelector(selectUsersState, s => s.selectedId),
  (entities, id) => (id == null ? undefined : entities[id])   // O(1)
);
\`\`\`

\`selectAll\` собирает массив в порядке \`ids\`, то есть уже с учётом \`sortComparer\`, — сортировать в компоненте не нужно. Для работы со store используйте вариант с селектором фичи: он мемоизирован относительно корневого state.

### Нормализация связей: заказы и клиенты

\`\`\`ts
// ответ сервера: клиент вложен в каждый заказ
const response = [
  { id: 101, total: 50, customer: { id: 7, name: 'ООО Ромашка' } },
  { id: 102, total: 80, customer: { id: 7, name: 'ООО Ромашка' } },
];

// раскладываем по двум коллекциям, связь — через customerId
state = {
  customers: customers.setAll(response.map(o => o.customer), customers.getInitialState()),
  orders: orders.setAll(
    response.map(({ customer, ...o }) => ({ ...o, customerId: customer.id })),
    orders.getInitialState()
  ),
};
// customers.ids = [7] — клиент хранится один раз

// «склеиваем» обратно для таблицы — в селекторе
const selectOrderRows = createSelector(selectAllOrders, selectCustomerEntities,
  (list, byId) => list.map(o => ({ id: o.id, total: o.total, customer: byId[o.customerId]?.name ?? '—' })));
// [ { id: 101, total: 50, customer: 'ООО Ромашка' }, { id: 102, total: 80, customer: 'ООО Ромашка' } ]

// переименовали клиента ОДИН раз — изменились обе строки
state = { ...state, customers: customers.updateOne({ id: 7, changes: { name: 'АО Ромашка' } }, state.customers) };
// [ { id: 101, ..., customer: 'АО Ромашка' }, { id: 102, ..., customer: 'АО Ромашка' } ]
\`\`\`

Вот ради чего нормализуют: одна правда о клиенте вместо десятка копий. Раскладывают ответ сервера обычно в reducer на \`loadSuccess\`, а склеивают — в мемоизированном селекторе.

### \`withEntities\` — то же самое в SignalStore

\`\`\`ts
import { withEntities, addEntity, updateEntity, removeEntity } from '@ngrx/signals/entities';

export const UsersStore = signalStore(
  withEntities<User>(),
  withComputed(({ entities }) => ({
    sorted: computed(() => [...entities()].sort((a, b) => a.name.localeCompare(b.name))),
  })),
  withMethods(store => ({
    add(user: User) { patchState(store, addEntity(user)); },
    rename(id: number, name: string) { patchState(store, updateEntity({ id, changes: { name } })); },
    remove(id: number) { patchState(store, removeEntity(id)); },
  }))
);

store.add({ id: 2, name: 'Bob' });
store.add({ id: 1, name: 'Ann' });
console.log(store.ids(), store.entityMap()[1]);   // [ 2, 1 ] { id: 1, name: 'Ann' }
console.log(store.sorted().map(u => u.name));     // [ 'Ann', 'Bob' ]
\`\`\`

Идея та же — \`ids\` плюс словарь (\`entityMap\`), — но вместо адаптера используются функции-обновлятели для \`patchState\`, а состояние читается сигналами \`ids()\`, \`entities()\`, \`entityMap()\`. Встроенного \`sortComparer\` здесь нет: порядок \`ids\` — порядок добавления, сортировку делают в \`computed\`.

### Где это применяется на практике

- **Большие таблицы и гриды** с точечными обновлениями: статус заказа пришёл по WebSocket — \`updateOne\`, и перерисовалась одна строка.
- **Справочники и кэш сущностей**: пользователи, товары, валюты — доступ по id за O(1) из любой фичи.
- **Связанные данные**: заказы и клиенты, задачи и исполнители, сообщения и авторы хранятся раздельно и соединяются в селекторах.
- **Выбранный элемент и мультивыбор**: в state хранится только \`selectedId\` или массив id, сам объект берётся из \`entities\`.
- **Пагинация и бесконечная прокрутка**: \`upsertMany\` добавляет новую страницу и обновляет уже загруженные строки без дубликатов.
- **Оптимистичные обновления**: \`updateOne\` сразу, откат через \`updateOne\` со старыми значениями при ошибке.

## Важные нюансы и подводные камни

- **Сортировать и фильтровать в компоненте**, когда есть \`sortComparer\` и селекторы, — лишняя работа на каждую проверку изменений и новый массив, ломающий \`OnPush\`.
- **\`updateOne\` ожидает \`{ id, changes }\`**, а не целую сущность; \`setOne\` и \`upsertOne\` — наоборот, целую сущность.
- **\`setOne\` заменяет, \`upsertOne\` сливает.** Проверено запуском: после \`upsertOne({ id: 1, name: 'Anna' })\` поле \`role\` сохранилось, после \`setOne\` — пропало. Если сервер прислал полный объект и старые поля нужно выбросить — \`setOne\`.
- **\`addOne\` молча игнорирует существующий id** — ни ошибки, ни обновления. Если данные могли устареть, используйте \`upsertOne\` или \`setOne\`.
- **\`setAll\` против \`addMany\`.** \`setAll\` заменяет коллекцию целиком (свежая загрузка), \`addMany\` дописывает только новые id.
- **\`entities[id]\` имеет тип \`T | undefined\`.** TypeScript заставит проверить наличие — и это правильно: сущность могла быть удалена.
- **Зачем \`ids\` отдельно от \`entities\`.** Порядок ключей объекта в JavaScript определён спецификацией, но **не управляется вами**: ключи-числа всегда идут по возрастанию — \`Object.keys({ 30: 'c', 10: 'a' })\` даёт \`['10', '30']\`. Отсортировать по имени или дате через ключи объекта нельзя, а массив \`ids\` задаёт любой порядок и меняется без трогания самих сущностей.
- **\`sortComparer\` пересортировывает при изменениях.** Для огромных коллекций с очень частыми апдейтами (котировки) это заметная работа; тогда порядок держат на сервере или сортируют в мемоизированном селекторе.
- **\`getSelectors()\` без аргумента** работает с самим \`EntityState\`; для \`store.select\` нужен вариант \`getSelectors(selectFeatureState)\`.
- **Нормализуйте на входе.** Вложенные ответы сервера раскладывают по коллекциям в reducer (или в эффекте) один раз, а не в каждом компоненте.

**Плюсы:** доступ и обновление по id за O(1), одна копия каждой сущности, корректные новые ссылки только у изменённых объектов (мемоизация и \`OnPush\` работают), меньше boilerplate в reducers, готовые селекторы и сортировка.
**Минусы:** данные для отображения приходится «склеивать» селекторами, нужно помнить семантику \`add\`/\`set\`/\`upsert\`/\`update\`, лишний слой для маленьких списков, которые никогда не обновляются точечно.

## Как это спрашивают на собеседовании

**Главный вывод:** нормализация — это словарь \`entities\` по id плюс массив \`ids\` для порядка; \`createEntityAdapter\` даёт для этой формы иммутабельные CRUD-операции и селекторы, обновляя ссылки только у изменённых сущностей.

Типичные формулировки: «Что такое Entity Adapter?», «Зачем нормализовать state?», «Чем \`upsertOne\` отличается от \`setOne\` и \`addOne\`?», «Как хранить связанные сущности?».

Что могут спросить следом:

- *Почему не хранить просто массив?* — Поиск и обновление по id — O(n), легко пересоздать все объекты, а дубликаты сущностей расходятся.
- *Зачем отдельный массив \`ids\`?* — Порядок ключей объекта не управляется (числовые ключи всегда по возрастанию), а \`ids\` задаёт любой порядок.
- *Как связать заказы и клиентов?* — Хранить \`customerId\` и соединять коллекции в мемоизированном селекторе.
- *Что вернёт \`updateOne\` для несуществующего id?* — Тот же объект state: ничего не изменится, селекторы не пересчитаются.
- *Есть ли аналог в SignalStore?* — \`withEntities\` из \`@ngrx/signals/entities\` с функциями \`addEntity\`, \`updateEntity\`, \`removeEntity\` для \`patchState\`.

### Ответ на 1 минуту

> Проблема в том, что коллекции в state по умолчанию хранят массивами: поиск и обновление по id требуют перебора, легко случайно пересоздать все объекты, а если та же сущность вложена в несколько мест, копии расходятся. Нормализация хранит каждую сущность один раз — в словаре entities по id, плюс массив ids для порядка. Это форма EntityState, а createEntityAdapter из @ngrx/entity даёт для неё готовые иммутабельные операции: addOne, setAll, updateOne с id и changes, upsertOne, removeMany, — и селекторы selectAll, selectEntities, selectTotal. Настраивается он через selectId и sortComparer, причём selectAll уже отдаёт отсортированный массив. Главный выигрыш: доступ по id за O(1) и новые ссылки только у изменённых сущностей, поэтому мемоизация и OnPush перерисовывают одну строку, а не всю таблицу. Нюансы: addOne молча игнорирует существующий id, setOne заменяет объект, а upsertOne сливает поля. Связи храню через id и соединяю в селекторах.`,
      en: `## In short

Storing a collection as an **array of objects** is awkward: finding or updating an item by id means scanning the whole array, and if the same data also lives somewhere else, the copies drift apart.

**Normalization** means storing entities as a **dictionary keyed by id**, plus a separate array of ids for ordering. The Entity Adapter from \`@ngrx/entity\` does that for you and hands you ready-made immutable operations.

Analogy: an array is a **stack of papers** where you find a document by leafing through. Normalized state is a **filing cabinet with numbered drawers**: know the number, get it instantly. And a separate list of numbers records the order to display them in.

## What it is made of

The state shape is always the same:

\`\`\`ts
interface EntityState<T> {
  ids: string[] | number[];        // order
  entities: { [id: string]: T };   // dictionary by id
}
\`\`\`

The adapter is created with \`createEntityAdapter<T>()\` and configured with two options: \`selectId\` (how to read the id when the field is not called \`id\`) and \`sortComparer\` (how to sort).

It gives you:

- **Immutable reducer operations**: \`addOne\`, \`addMany\`, \`setAll\`, \`setOne\`, \`updateOne\`, \`upsertOne\`, \`removeOne\`, \`removeAll\` and more.
- **Ready-made selectors** via \`adapter.getSelectors()\`: \`selectAll\`, \`selectEntities\`, \`selectIds\`, \`selectTotal\`.
- **Initial state** via \`adapter.getInitialState({ ... })\`, where you can mix in your own fields such as \`loading\`.

## Example

\`\`\`ts
const adapter = createEntityAdapter<User>({
  selectId: (u) => u.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

const reducer = createReducer(
  adapter.getInitialState({ loading: false }),
  on(addUser, (s, { user }) => adapter.addOne(user, s)),
  on(updateUser, (s, { update }) => adapter.updateOne(update, s)),
  on(loadUsersSuccess, (s, { users }) => adapter.setAll(users, s))
);

const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
\`\`\`

Why: the reducer is three lines and contains not a single array spread. Every operation returns **new references**, so selector memoization works correctly, and \`selectAll\` returns an array already honouring \`sortComparer\`.

## What to say in the interview

> The problem with denormalized state is that collections live in arrays: lookup and update by id require iteration, and duplicating the same data leads to drift. Normalization solves this by storing entities as a dictionary keyed by id plus a separate \`ids\` array for ordering — that is the \`EntityState\` shape. \`@ngrx/entity\` provides \`createEntityAdapter\` for such a collection: it is configured with \`selectId\` and \`sortComparer\` and exposes ready-made immutable reducer operations — \`addOne\`, \`addMany\`, \`setAll\`, \`updateOne\`, \`upsertOne\`, \`removeOne\` — plus initial state via \`getInitialState\`. You also get \`selectAll\`, \`selectEntities\`, \`selectIds\` and \`selectTotal\` out of the box. The payoff is threefold: O(1) access by id instead of scanning, correct immutability with fresh references so selector memoization genuinely works, and noticeably less boilerplate with uniform CRUD. And \`selectAll\` returns the array already sorted by \`sortComparer\`, so you need not duplicate sorting in the component.

## Gotchas

- **Sorting/filtering in the component** when \`sortComparer\` and selectors exist — wasted work on every render.
- **\`updateOne\` expects \`{ id, changes }\`**, not a whole entity; \`setOne\`/\`upsertOne\` are the opposite.
- **\`addOne\` versus \`upsertOne\`**: \`addOne\` **ignores** an already existing id, \`upsertOne\` updates it.
- **\`setAll\` versus \`addMany\`**: \`setAll\` **replaces** the whole collection, \`addMany\` appends.
- **\`entities[id]\` is typed as possibly \`undefined\`** — TypeScript makes you check, and rightly so.
- **Follow-up question**: why keep \`ids\` separate from \`entities\`? Because object key order is not something to rely on semantically, while an ids array gives explicit control over ordering and lets you reorder without touching the entities themselves.`
    }
  },
  {
    id: 'rxjs-024',
    category: 'ngrx',
    level: 'Medium',
    tags: ['ngrx', 'createfeature', 'boilerplate'],
    question: {
      ru: 'Что даёт createFeature в современном NgRx и как он уменьшает boilerplate?',
      en: 'What does createFeature provide in modern NgRx and how does it reduce boilerplate?'
    },
    answer: {
      ru: `## В чём суть

Классический NgRx заставляет писать одно и то же руками: объявить ключ фичи строкой, зарегистрировать reducer под этим ключом, написать \`createFeatureSelector\`, а потом по \`createSelector\` **на каждое поле** состояния. \`createFeature\` связывает имя фичи и её reducer в один объект и **сам генерирует** селектор всего среза плюс селектор на каждое свойство верхнего уровня. Производные селекторы добавляются туда же через \`extraSelectors\`.

Аналогия: раньше вы вручную подписывали ярлык на каждую полку в шкафу, и рано или поздно на какой-то полке оказывался ярлык с опечаткой. Теперь достаточно сказать «этот шкаф называется users» — **ярлыки печатаются сами**, по одному на полку, и всегда совпадают с содержимым.

**Какую проблему решает.** Boilerplate (повторяющийся шаблонный код) в NgRx — это не только лишние строки. Это места, где легко ошибиться: ключ \`'users'\` в регистрации и \`'user'\` в \`createFeatureSelector\` — и селектор молча возвращает \`undefined\`; поле переименовали в state, а селектор забыли. \`createFeature\` убирает ручную синхронизацию: имя пишется один раз, селекторы выводятся из начального состояния, а TypeScript знает их точные имена и типы.

## Словарик терминов

- **Фича (feature, feature state)** — срез глобального state, принадлежащий одной функциональной области: \`state.users\`, \`state.orders\`.
- **Ключ фичи (feature key)** — имя, под которым срез лежит в корневом state. В \`createFeature\` это поле \`name\`.
- **Boilerplate** — однотипный шаблонный код, который приходится повторять без новой логики.
- **\`createFeature\`** — функция, которая из \`name\` и \`reducer\` собирает объект фичи с готовыми селекторами.
- **\`createFeatureSelector\`** — ручной селектор верхнего уровня \`state => state[featureKey]\`.
- **\`createSelector\`** — мемоизированный селектор: пересчитывает результат, только если входы изменились по ссылке.
- **Авто-селекторы (base selectors)** — то, что \`createFeature\` генерирует сам: \`selectUsersState\` и \`selectXxx\` для каждого поля.
- **\`extraSelectors\`** — функция внутри \`createFeature\`, которая получает авто-селекторы и возвращает ваши производные.
- **\`provideState\`** — регистрирует фичу в standalone-приложении: \`provideState(usersFeature)\`.
- **\`createActionGroup\`** — создаёт группу actions одного источника; вместе с \`createFeature\` даёт минимальный набор кода.
- **Template literal types** — возможность TypeScript вычислять строковые типы: из имени \`'users'\` он выводит ключ \`selectUsersState\`, поэтому автодополнение знает сгенерированные имена.

## Как это работает под капотом

Реализация \`createFeature\` в NgRx — около двадцати строк. Упрощённо:

\`\`\`ts
function createFeature({ name, reducer, extraSelectors }) {
  const selectFeatureState = createFeatureSelector(name);           // state => state[name]
  const initialState = reducer(undefined, { type: '@ngrx/feature/init' });
  const fieldSelectors = isPlainObject(initialState)
    ? Object.keys(initialState).reduce((acc, key) => ({
        ...acc,
        [\`select\${capitalize(key)}\`]: createSelector(selectFeatureState, s => s?.[key]),
      }), {})
    : {};
  const base = { [\`select\${capitalize(name)}State\`]: selectFeatureState, ...fieldSelectors };
  return { name, reducer, ...base, ...(extraSelectors ? extraSelectors(base) : {}) };
}
\`\`\`

По шагам:

1. Из \`name\` создаётся селектор всего среза \`select<Name>State\` — то, что раньше писали через \`createFeatureSelector\`.
2. Чтобы узнать поля, \`createFeature\` **вызывает ваш reducer** с \`undefined\` и служебным action — и получает начальное состояние.
3. Если это обычный объект, для **каждого ключа верхнего уровня** создаётся мемоизированный \`select<Key>\`. Вложенные объекты не разбираются.
4. Если передан \`extraSelectors\`, он вызывается с готовыми авто-селекторами, и его результат добавляется к объекту.
5. Возвращается объект \`{ name, reducer, ...селекторы }\`. \`provideState(usersFeature)\` берёт из него \`name\` как ключ и \`reducer\` как обработчик — ключ невозможно рассинхронизировать с селекторами.
6. На уровне типов TypeScript повторяет ту же логику через template literal types, поэтому \`usersFeature.selectLoading\` типизирован как \`MemoizedSelector<…, boolean>\`, а опечатка \`selectLoadng\` — ошибка компиляции.

Из шага 2 следует важное ограничение: поля берутся из **реального начального состояния**. Необязательное поле (\`error?: string\`), которого нет в начальном объекте, не получило бы селектора, поэтому типы \`createFeature\` такие поля запрещают.

### Пример 1. Как было: ручной boilerplate

\`\`\`ts
export const usersFeatureKey = 'users';

export interface UsersState { users: User[]; filter: string; loading: boolean }
export const initialState: UsersState = { users: [], filter: '', loading: false };

export const usersReducer = createReducer(initialState, /* on(...) */);

export const selectUsersState = createFeatureSelector<UsersState>(usersFeatureKey);
export const selectUsers = createSelector(selectUsersState, s => s.users);
export const selectFilter = createSelector(selectUsersState, s => s.filter);
export const selectLoading = createSelector(selectUsersState, s => s.loading);
export const selectVisibleUsers = createSelector(selectUsers, selectFilter, filterByName);

// регистрация: ключ и reducer — двумя отдельными аргументами
provideState(usersFeatureKey, usersReducer);
\`\`\`

Три селектора полей — чистый шум: они ничего не вычисляют. При этом каждый — место для ошибки при переименовании.

### Пример 2. Как стало: \`createFeature\`

\`\`\`ts
interface UsersState { users: User[]; filter: string; loading: boolean; settings: { pageSize: number } }
const initialState: UsersState = { users: [], filter: '', loading: false, settings: { pageSize: 20 } };

export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(UsersPageActions.opened, (s): UsersState => ({ ...s, loading: true })),
    on(UsersPageActions.filterChanged, (s, { filter }): UsersState => ({ ...s, filter })),
    on(UsersApiActions.loadSuccess, (s, { users }): UsersState => ({ ...s, loading: false, users }))
  ),
});

console.log(Object.keys(usersFeature));
// [ 'name', 'reducer', 'selectUsersState', 'selectUsers',
//   'selectFilter', 'selectLoading', 'selectSettings' ]
\`\`\`

Пять селекторов появились сами: один на весь срез и по одному на каждое из четырёх полей. Для вложенного \`settings\` есть \`selectSettings\`, но **нет** \`selectPageSize\` — генерация идёт только по верхнему уровню.

### \`provideState(feature)\` — регистрация одной строкой

\`\`\`ts
// app.config.ts или providers маршрута lazy-фичи
providers: [provideStore(), provideState(usersFeature)];

const store = inject(Store);
store.dispatch(UsersPageActions.opened());
console.log(store.selectSignal(usersFeature.selectLoading)());   // true
console.log(Object.keys(store.selectSignal(s => s)()));          // [ 'users' ]
\`\`\`

Ключ в корневом state — ровно \`name\` фичи. Для приложений на NgModule то же самое делает \`StoreModule.forFeature(usersFeature)\`.

### \`extraSelectors\` — производные селекторы рядом с фичей

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: usersReducer,
  extraSelectors: ({ selectUsers, selectFilter }) => {
    const selectVisibleUsers = createSelector(selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.toLowerCase().includes(f)));
    return {
      selectVisibleUsers,
      selectVisibleCount: createSelector(selectVisibleUsers, list => list.length),
    };
  },
});

// после loadSuccess([Ann, Bob]) и filterChanged('b'):
store.selectSignal(usersFeature.selectVisibleUsers)();   // [ { id: 2, name: 'Bob' } ]
store.selectSignal(usersFeature.selectVisibleCount)();   // 1
\`\`\`

\`extraSelectors\` получает авто-селекторы аргументом, поэтому композиция и мемоизация работают как обычно. Если один дополнительный селектор строится из другого, объявите его константой внутри функции (как \`selectVisibleUsers\` выше): в возвращаемом объекте они не видят друг друга. Опция \`extraSelectors\` появилась в NgRx 15.2; сам \`createFeature\` — в 12.1.

### Вместе с \`createActionGroup\` — минимальный набор файлов

\`\`\`ts
// users.actions.ts
export const UsersPageActions = createActionGroup({
  source: 'Users Page',
  events: { 'Opened': emptyProps(), 'Filter Changed': props<{ filter: string }>() },
});
export const UsersApiActions = createActionGroup({
  source: 'Users API',
  events: { 'Load Success': props<{ users: User[] }>() },
});

// users.feature.ts — reducer + все селекторы
export const usersFeature = createFeature({ name: 'users', reducer, extraSelectors });

// компонент
readonly visible = this.store.selectSignal(usersFeature.selectVisibleUsers);
\`\`\`

Вместо отдельных файлов actions, reducer и selectors с десятком ручных экспортов — два компактных файла (плюс эффекты, если есть асинхронщина). Это и есть «современный» NgRx-стиль для standalone-приложений.

### Вместе с \`@ngrx/entity\`

\`\`\`ts
interface ProductsState extends EntityState<Product> { selectedId: string | null }
const adapter = createEntityAdapter<Product>();

export const productsFeature = createFeature({
  name: 'products',
  reducer: createReducer<ProductsState>(adapter.getInitialState({ selectedId: null })),
  extraSelectors: ({ selectProductsState, selectEntities, selectSelectedId }) => ({
    ...adapter.getSelectors(selectProductsState),
    selectSelectedProduct: createSelector(selectEntities, selectSelectedId,
      (entities, id) => (id ? entities[id] : undefined)),
  }),
});

console.log(Object.keys(productsFeature));
// [ 'name', 'reducer', 'selectProductsState', 'selectIds', 'selectEntities',
//   'selectSelectedId', 'selectAll', 'selectTotal', 'selectSelectedProduct' ]
\`\`\`

\`createFeature\` даёт селекторы полей (\`selectIds\`, \`selectEntities\`, \`selectSelectedId\`), а \`adapter.getSelectors(selectProductsState)\` достраивает \`selectAll\` и \`selectTotal\`. Одноимённые \`selectIds\`/\`selectEntities\` из адаптера просто перекрывают сгенерированные — они возвращают то же самое.

### Ограничения: что \`createFeature\` не сгенерирует

\`\`\`ts
// 1) Необязательные поля запрещены
interface SearchState { query: string; error?: string }
createFeature({ name: 'search', reducer: createReducer<SearchState>({ query: '' }) });
// ❌ ошибка компиляции: 'optional properties are not allowed in the feature state'
// ✅ вместо этого: error: string | null, и в начальном состоянии error: null

// 2) State-массив или примитив — селекторов полей нет
const recent = createFeature({ name: 'recentIds', reducer: createReducer<number[]>([]) });
console.log(Object.keys(recent));   // [ 'name', 'reducer', 'selectRecentIdsState' ]

// 3) Имя фичи должно быть валидным идентификатором в camelCase
const bad = createFeature({ name: 'user-profile', reducer: createReducer({ firstName: '' }) });
console.log(Object.keys(bad));      // [ 'name', 'reducer', 'selectUser-profileState', 'selectFirstName' ]
\`\`\`

Третий случай — ловушка: такой ключ нельзя деструктурировать в обычную переменную. Имена фич и полей пишите в camelCase (\`userProfile\` → \`selectUserProfileState\`).

### Где это применяется на практике

- **Новые фичи в standalone-приложении**: \`createActionGroup\` + \`createFeature\` + функциональные эффекты, регистрация через \`provideState\` в providers маршрута lazy-фичи.
- **Миграция старого кода**: файлы с десятками ручных \`createSelector\` по полям заменяются одним \`createFeature\`, а производные селекторы переезжают в \`extraSelectors\` без изменения их имён для компонентов.
- **Коллекции сущностей**: \`createFeature\` + \`@ngrx/entity\` — готовые \`selectAll\`, \`selectTotal\`, \`selectEntities\` и селектор выбранного элемента в одном объекте.
- **Фасады и компоненты** импортируют один объект фичи (\`usersFeature.selectLoading\`) вместо россыпи экспортов.
- **Код-ревью большой командой**: единый шаблон фичи — легко найти, где reducer и селекторы, и невозможно ошибиться в ключе.

## Важные нюансы и подводные камни

- **Селекторы только для верхнего уровня.** Для \`settings.pageSize\` автоматического \`selectPageSize\` нет — допишите его в \`extraSelectors\`.
- **Имя фичи и есть ключ в state.** Переименование \`name\` меняет форму корневого state: ломаются сохранённый в \`localStorage\` state, мета-редьюсеры, которые обращаются к ключу, и сравнение со старыми записями DevTools.
- **Необязательные поля запрещены типами.** Поля вида \`error?: string\` дают ошибку компиляции, потому что селекторы строятся по реальному начальному объекту. Используйте \`string | null\`.
- **State-примитив или массив** — генерировать селекторы по свойствам не из чего, будет только \`select<Name>State\`.
- **Писать \`createFeatureSelector\` рядом «по привычке»** — два разных селектора на один срез, дублирование и путаница, какой из них использовать.
- **\`extraSelectors\` — всё ещё чистые функции.** Никаких побочных эффектов, HTTP или логирования: они вызываются при чтении state и кэшируются.
- **Внутри \`extraSelectors\` дополнительные селекторы не видят друг друга** через возвращаемый объект — объявляйте зависимые константами в теле функции.
- **Имя должно быть camelCase-идентификатором.** Из \`'user-profile'\` получится ключ \`selectUser-profileState\`, который неудобно использовать.
- **Reducer вызывается при создании фичи** (с \`undefined\` и служебным action), поэтому он должен быть чистым и безопасным для такого вызова — это и так требование к любому reducer.

**Плюсы:** меньше кода и файлов, ключ фичи пишется один раз, селекторы полей всегда соответствуют state, точные типы и автодополнение, удобная регистрация \`provideState(feature)\`, естественная связка с \`@ngrx/entity\` и \`createActionGroup\`.
**Минусы:** только верхний уровень полей, запрет необязательных полей, «магические» имена селекторов труднее искать поиском по коду, остальная церемония NgRx (actions, effects) никуда не девается.

## Как это спрашивают на собеседовании

**Главный вывод:** \`createFeature\` объединяет \`name\` и \`reducer\` в один объект и генерирует \`select<Name>State\` плюс селектор на каждое поле верхнего уровня; производные добавляются через \`extraSelectors\`, а регистрация — \`provideState(feature)\`.

Типичные формулировки: «Что даёт \`createFeature\`?», «Как уменьшить boilerplate в NgRx?», «Чем \`createFeature\` лучше \`createFeatureSelector\`?».

Что могут спросить следом:

- *Генерируются ли селекторы для вложенных полей?* — Нет, только для свойств верхнего уровня.
- *Почему нельзя optional-поля?* — Селекторы строятся по ключам реального начального состояния; поля, которого там нет, не было бы, поэтому типы запрещают \`?\`.
- *Как совместить с Entity?* — \`extraSelectors: ({ selectXxxState }) => adapter.getSelectors(selectXxxState)\`.
- *Где регистрировать фичу?* — \`provideState(feature)\` в \`app.config.ts\` или в providers lazy-маршрута; в модульных приложениях — \`StoreModule.forFeature(feature)\`.
- *Что ещё сокращает boilerplate?* — \`createActionGroup\`, функциональные эффекты, а для простых фич — NgRx SignalStore.

### Ответ на 1 минуту

> Классический NgRx требует вручную объявить ключ фичи, зарегистрировать reducer, написать createFeatureSelector и отдельный createSelector на каждое поле — много однотипного кода и места для опечаток в ключе. createFeature объединяет имя фичи и reducer в один объект и сам генерирует селекторы: selectUsersState на весь срез и по селектору на каждое поле верхнего уровня, например selectLoading. Работает это так: он вызывает reducer, чтобы получить начальное состояние, и по его ключам строит мемоизированные селекторы, а TypeScript выводит их имена и типы. Регистрируется фича одной строкой — provideState(usersFeature), и ключ в state всегда совпадает с name. Производные селекторы добавляются через extraSelectors, куда авто-селекторы приходят аргументами, а с Entity удобно сделать adapter.getSelectors(selectUsersState). Из ограничений: селекторы только для верхнего уровня, optional-поля в state запрещены типами, а имя фичи — это ключ в state, и его переименование меняет форму состояния.`,
      en: `## In short

Classic NgRx makes you write the same things by hand: declare a feature key as a string, register the reducer, write a \`createFeatureSelector\`, and then one \`createSelector\` **per state field**.

\`createFeature\` ties the name and the reducer into one object and **generates for you** a selector for the whole feature slice plus a selector for every one of its properties.

Analogy: you used to hand-label every shelf in a cabinet. Now you just say "this cabinet is called users" — and the **labels print themselves**, one per shelf.

## What createFeature gives you

1. **Auto-generated \`selectXxxState\`** — the whole-slice selector, no manual \`createFeatureSelector\`.
2. **A selector per state property**: a \`users\` field gives you \`selectUsers\`, a \`loading\` field gives you \`selectLoading\`.
3. **One-line registration**: \`provideState(usersFeature)\` instead of separate arguments for key and reducer.
4. **Derived selectors via \`extraSelectors\`** — they receive the auto-generated selectors as inputs, so composition stays fully intact.

## Example

\`\`\`ts
export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(
    initialState,
    on(loadUsers, (s) => ({ ...s, loading: true })),
    on(loadUsersSuccess, (s, { users }) => ({ ...s, loading: false, users }))
  ),
  extraSelectors: ({ selectUsers, selectFilter }) => ({
    selectVisibleUsers: createSelector(
      selectUsers, selectFilter,
      (users, f) => users.filter(u => u.name.includes(f))
    )
  })
});

export const {
  name, reducer,
  selectUsersState,
  selectUsers,        // for the users field
  selectLoading,      // for the loading field
  selectVisibleUsers  // from extraSelectors
} = usersFeature;
\`\`\`

Why: plain field selectors are pure noise and there is no reason to hand-write them. The filtering logic, however, still has to be expressed somewhere, and \`extraSelectors\` is the right place for it — without severing the link to the feature.

## What to say in the interview

> Classic NgRx makes you manually declare a feature key, register the reducer, write \`createFeatureSelector\`, and a separate \`createSelector\` for every slice of state — a lot of repetitive code. \`createFeature\` bundles the feature name and its reducer into one object and auto-generates the whole-feature-state selector plus a selector for every state property: a \`loading\` field means you get \`selectLoading\` for free. It registers in a single line with \`provideState(usersFeature)\`, without separate arguments for key and reducer. Derived selectors go into \`extraSelectors\`, which receives the auto-generated selectors as arguments, so composition and memoization work exactly as usual. Essentially \`createFeature\` is NgRx for the standalone era: fewer files, fewer hand-written selectors, everything tied together in one object, and it fits naturally with \`provideStore\` and \`provideState\` in standalone apps.

## Gotchas

- **Expecting selectors for nested fields** — only **top-level** state properties get generated selectors.
- **Assuming the feature name is separate from the state key** — it *is* the key; renaming breaks persistence and DevTools history.
- **A primitive or array state instead of an object** — then there are no properties to generate selectors from.
- **Writing a \`createFeatureSelector\` alongside out of habit** — you end up with two different selectors for one slice and redundant recomputation.
- **Trying to use \`extraSelectors\` for side effects** — they are still pure functions.
- **Follow-up question**: how does it combine with \`@ngrx/entity\`? Perfectly: \`createFeature\` gives the field selectors, and \`adapter.getSelectors(selectUsersState)\` layers \`selectAll\`/\`selectTotal\` on top.`
    }
  },
  {
    id: 'rxjs-025',
    category: 'ngrx',
    level: 'Expert',
    tags: ['ngrx', 'signal-store', 'signals'],
    question: {
      ru: 'Что такое @ngrx/signals SignalStore и чем он отличается от классического Store?',
      en: 'What is the @ngrx/signals SignalStore and how does it differ from the classic Store?'
    },
    answer: {
      ru: `## В чём суть

\`@ngrx/signals\` — это стейт-менеджмент NgRx, построенный на **сигналах** Angular. Главная сущность — \`signalStore(...)\`: store собирается из готовых блоков-фич (\`withState\`, \`withComputed\`, \`withMethods\`, \`withHooks\`) как из конструктора, состояние читается синхронно как сигналы, а меняется через \`patchState\` — без обязательного Redux-цикла «action → reducer → selector».

Аналогия: классический Store — это **завод с проходной, накладными и журналом учёта**: любое изменение оформляется бумагой (action), зато есть полная история. SignalStore — **мастерская**: инструменты под рукой, деталь меняют прямо на верстаке (\`patchState\`), бумаг почти нет. А если нужен журнал, к мастерской можно пристроить «проходную» — плагин событий.

**Какую проблему решает.** Классический NgRx даёт порядок, но ценой церемонии: на каждую фичу — actions, reducer, selectors, effects, и всё это на Observable, которые в шаблоне нужно разворачивать через \`async\`-pipe. Для большинства фич (фильтры таблицы, форма с загрузкой, корзина) это избыточно, а «просто сервис с сигналами» быстро превращается в самописный store без правил. SignalStore даёт середину: структуру и типобезопасность NgRx, реактивность сигналов, переиспользуемые фичи и возможность жить как глобально, так и в рамках одного компонента.

## Словарик терминов

- **Сигнал (signal)** — реактивная переменная Angular: читается вызовом \`count()\`, а всё, что её прочитало (шаблон, \`computed\`), узнаёт об изменении.
- **\`computed\`** — производный сигнал: вычисляется из других сигналов, кэширует результат и пересчитывается только при изменении зависимостей.
- **\`signalStore\`** — функция, которая из набора фич создаёт **класс** store для DI Angular.
- **Фича store (store feature)** — блок, который добавляет в store состояние, производные значения, методы или хуки: \`withState\`, \`withComputed\`, \`withMethods\`, \`withHooks\`.
- **\`withState\`** — объявляет состояние; каждое поле становится сигналом.
- **Deep signal** — сигнал вложенного объекта, у которого вложенные поля тоже доступны как сигналы: \`store.profile.address.city()\`.
- **\`withComputed\`** — добавляет производные сигналы — аналог селекторов.
- **\`withMethods\`** — добавляет методы; внутри доступны \`inject()\` и \`patchState\`.
- **\`patchState\`** — единственный способ изменить состояние: принимает частичный объект или функцию-обновлятель.
- **\`getState\`** — возвращает снимок всего состояния обычным объектом.
- **\`withHooks\`** — хуки жизненного цикла store: \`onInit\` и \`onDestroy\`.
- **\`rxMethod\`** — метод на RxJS внутри store: принимает значение, сигнал или Observable и прогоняет его через операторы (\`switchMap\`, \`debounceTime\`).
- **\`tapResponse\`** — оператор из \`@ngrx/operators\`: обрабатывает \`next\` и \`error\` так, что внешний поток после ошибки продолжает жить.
- **\`signalStoreFeature\`** — создаёт собственную переиспользуемую фичу из других фич.
- **\`withEntities\`** — фича для нормализованных коллекций (\`ids\` плюс словарь по id).
- **\`protectedState\`** — режим по умолчанию (с v18): менять состояние через \`patchState\` можно только изнутри store.
- **Плагин событий (\`@ngrx/signals/events\`)** — необязательный Redux-подобный слой: события, \`withReducer\`, обработчики.

## Как это работает под капотом

1. \`signalStore(...)\` возвращает не объект, а **класс**, помеченный для DI. Экземпляр создаёт Angular: с \`{ providedIn: 'root' }\` — один на приложение, а через \`providers: [UsersStore]\` в компоненте — свой экземпляр на каждый компонент, который уничтожается вместе с ним.
2. При создании фичи применяются **по порядку**, как конвейер: каждая получает всё, что объявили предыдущие (состояние, computed, методы), и добавляет своё. Поэтому \`withComputed\` видит только состояние, объявленное **выше** него.
3. \`withState\` создаёт по \`WritableSignal\` (записываемому сигналу) на каждое поле верхнего уровня, а наружу отдаёт их как сигналы только для чтения. Для вложенных объектов создаются deep signals — ленивые \`computed\` на вложенные поля.
4. \`withComputed\` создаёт \`computed\`-сигналы. Angular сам отслеживает, какие сигналы они прочитали, и пересчитывает их только при изменении этих зависимостей — ручная мемоизация, как в \`createSelector\`, не нужна.
5. Фабрики \`withMethods\` и \`withHooks\` выполняются в **контексте инъекции**, поэтому в них работает \`inject(UserApi)\`.
6. \`patchState\` поверхностно сливает изменения со старым состоянием и **по ссылке** сравнивает каждое поле: если значение поменялось, вызывает \`set\` у его сигнала. Шаблоны и \`computed\`, читающие этот сигнал, узнают об изменении; остальные — нет.
7. \`withHooks.onInit\` вызывается сразу после создания store, \`onDestroy\` — когда уничтожается инжектор (например, компонент со своим store).

Суть \`patchState\` в исходнике NgRx — несколько строк:

\`\`\`ts
function patchState(store, ...updaters) {
  const current = getState(store);
  const next = updaters.reduce(
    (state, u) => ({ ...state, ...(typeof u === 'function' ? u(state) : u) }),
    current
  );
  for (const key of Object.keys(next)) {
    if (current[key] !== next[key]) signals[key].set(next[key]);   // сравнение по ссылке
  }
}
\`\`\`

Из последней строки следует главное правило: обновлять состояние нужно **новыми ссылками**. Мутация массива «на месте» не меняет ссылку, и сигнал не узнает об изменении.

### Пример 1. Минимальный store

\`\`\`ts
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';

export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [] as User[], query: '', loading: false }),
  withComputed(({ users }) => ({
    count: computed(() => users().length),
  })),
  withMethods((store, api = inject(UserApi)) => ({
    add(user: User) {
      patchState(store, s => ({ users: [...s.users, user] }));
    },
  })),
  withHooks({
    onInit(store) { console.log('onInit, count =', store.count()); },
  })
);

// в компоненте
readonly store = inject(UsersStore);
// onInit, count = 0
// шаблон: {{ store.count() }} пользователей, @if (store.loading()) { ... }
\`\`\`

Ни actions, ни reducers, ни файла effects: состояние, производные и логика фичи — в одном объявлении. В шаблоне всё читается синхронно, без \`async\`-pipe.

### \`withState\` и deep signals

\`\`\`ts
withState({ users: [] as User[], profile: { address: { city: 'Minsk' } } })

console.log(store.profile.address.city());   // Minsk
console.log(getState(store));
// { users: [], query: '', loading: false, profile: { address: { city: 'Minsk' } } }
\`\`\`

Каждое поле — сигнал, а вложенные объекты можно читать по частям: компонент, который читает только \`city()\`, не зависит от остальных полей профиля. \`getState\` отдаёт снимок целиком — удобно для логов и тестов.

### \`withComputed\` — производные значения

\`\`\`ts
withComputed(({ users, query }) => ({
  count: computed(() => users().length),
  visible: computed(() => users().filter(u => u.name.toLowerCase().includes(query()))),
}))
\`\`\`

Это аналог селекторов, но мемоизацию делает сам Angular: \`visible\` пересчитается, только когда изменятся \`users\` или \`query\`. Функции внутри обязаны быть чистыми — никаких HTTP или записи в state.

### \`withMethods\` и \`patchState\` — изменения

\`\`\`ts
withMethods(store => ({
  inc() { patchState(store, s => ({ count: s.count + 1 })); },       // функция-обновлятель
  reset() { patchState(store, { count: 0 }); },                      // частичный объект
  done(orders: string[]) { patchState(store, { orders }, setFulfilled()); },  // несколько сразу
}))

store.inc(); store.inc();
console.log(store.count());   // 2
\`\`\`

\`patchState\` принимает частичный объект, функцию от текущего состояния или несколько таких аргументов подряд. Снаружи store вызвать \`patchState\` нельзя: по умолчанию \`protectedState\` делает это ошибкой TypeScript, и все изменения идут через методы store.

### \`withHooks\` — загрузка при создании

\`\`\`ts
withHooks({
  onInit(store) { store.loadUsers(); },        // store создан — грузим данные
  onDestroy() { console.log('store destroyed'); },
})
\`\`\`

Для store в \`providers\` компонента это означает «загрузить при открытии экрана и всё забыть при уходе» — без \`ngOnInit\` и ручных отписок.

### Гонка с \`async/await\` и почему нужен \`rxMethod\`

Частая ошибка — асинхронный метод на промисах. Проверим: «сервер» отвечает на запрос \`'a'\` за 100 мс, на \`'ab'\` — за 30 мс. Пользователь вводит \`'a'\`, а через 10 мс — \`'ab'\`:

\`\`\`ts
// ❌ async/await
async searchAsync(query: string) {
  patchState(store, { query, loading: true });
  const users = await firstValueFrom(api.search(query));
  patchState(store, { users, loading: false });
}
// store.searchAsync('a'); через 10 мс store.searchAsync('ab');
// query: ab | users: result for "a"     ← устаревший ответ перезаписал свежий
\`\`\`

Ответ на \`'ab'\` пришёл первым, а медленный ответ на \`'a'\` — последним и перезаписал его. В state теперь запрос одного и результат другого. Промис нельзя отменить, поэтому \`async/await\` гонки не решает.

### \`rxMethod\` — RxJS там, где нужна отмена и время

\`\`\`ts
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';

// внутри withMethods((store, api = inject(UserApi)) => ({ ... }))
search: rxMethod<string>(
  pipe(
    debounceTime(300),
    distinctUntilChanged(),
    tap(query => patchState(store, { query, loading: true })),
    switchMap(query => api.search(query).pipe(
      tapResponse({
        next: users => patchState(store, { users, loading: false }),
        error: () => patchState(store, { loading: false }),
      })
    ))
  )
),
// тот же сценарий (без debounce): query: ab | users: result for "ab"   ← старый запрос отменён
\`\`\`

\`rxMethod\` создаёт метод, который принимает **значение, сигнал или Observable** и прогоняет его через ваш конвейер операторов. \`switchMap\` отменяет устаревший запрос — гонка исчезает. Если передать сигнал (\`store.search(this.queryControlSignal)\`), метод будет срабатывать на каждое его изменение. Важно: вызывать его с сигналом или Observable нужно в контексте инъекции (в конструкторе, в инициализаторе поля, в \`onInit\`) или передать \`{ injector }\` — иначе NgRx v21 выводит предупреждение, что в будущем это станет ошибкой. Подписка живёт, пока жив store или компонент.

### \`tapResponse\` — ошибка не убивает метод

\`tapResponse({ next, error })\` — это \`tap\` плюс \`catchError\`, который проглатывает ошибку **внутреннего** запроса. Без него первая ошибка HTTP завершила бы поток \`rxMethod\`, и метод перестал бы реагировать на новые вызовы — та же ловушка, что с \`catchError\` снаружи в NgRx Effects. Начиная с v20 колбэки передают объектом \`{ next, error }\`; вариант с позиционными аргументами помечен устаревшим.

### \`signalStoreFeature\` — переиспользуемые блоки

\`\`\`ts
type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { error: string };

export function withRequestStatus() {
  return signalStoreFeature(
    withState({ requestStatus: 'idle' as RequestStatus }),
    withComputed(({ requestStatus }) => ({
      isPending: computed(() => requestStatus() === 'pending'),
      error: computed(() => { const s = requestStatus(); return typeof s === 'object' ? s.error : null; }),
    }))
  );
}
export const setPending = () => ({ requestStatus: 'pending' as RequestStatus });
export const setFulfilled = () => ({ requestStatus: 'fulfilled' as RequestStatus });

const OrdersStore = signalStore(withState({ orders: [] as string[] }), withRequestStatus(), withMethods(/* ... */));
// a.start();  → a.isPending() === true
// a.done(['#1', '#2']); getState(a) → { orders: [ '#1', '#2' ], requestStatus: 'fulfilled' }
\`\`\`

Один раз написали «статус запроса» — подключаете в десятки store одной строкой. Так же строят фичи пагинации, сортировки, синхронизации с \`localStorage\`. Это главное архитектурное отличие от классического NgRx, где переиспользование логики между фичами неудобно.

### \`withEntities\` — нормализованные коллекции

\`\`\`ts
import { withEntities, addEntity, updateEntity, removeEntity } from '@ngrx/signals/entities';

const TodosStore = signalStore(
  withEntities<Todo>(),
  withMethods(store => ({
    add(todo: Todo) { patchState(store, addEntity(todo)); },
    toggle(id: number, done: boolean) { patchState(store, updateEntity({ id, changes: { done } })); },
    remove(id: number) { patchState(store, removeEntity(id)); },
  }))
);
// store.ids(), store.entities(), store.entityMap()[id]
\`\`\`

Аналог \`@ngrx/entity\`: под капотом \`ids\` плюс словарь по id, а функции \`addEntity\`/\`updateEntity\` возвращают обновления для \`patchState\`.

### Плагин событий — когда нужен журнал

\`\`\`ts
import { eventGroup, on, withReducer, withEventHandlers, Events, injectDispatch } from '@ngrx/signals/events';

export const usersPageEvents = eventGroup({ source: 'Users Page', events: { opened: type<void>() } });
export const usersApiEvents = eventGroup({
  source: 'Users API',
  events: { loadedSuccess: type<User[]>(), loadedFailure: type<string>() },
});

export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [] as User[], loading: false, error: null as string | null }),
  withReducer(
    on(usersPageEvents.opened, () => ({ loading: true })),
    on(usersApiEvents.loadedSuccess, ({ payload }) => ({ users: payload, loading: false })),
  ),
  withEventHandlers((_, events = inject(Events), api = inject(UsersApi)) => ({
    loadUsers$: events.on(usersPageEvents.opened).pipe(
      exhaustMap(() => api.getAll().pipe(mapResponse({
        next: users => usersApiEvents.loadedSuccess(users),
        error: (e: { message: string }) => usersApiEvents.loadedFailure(e.message),
      })))
    ),
  }))
);

// в компоненте
readonly dispatch = injectDispatch(usersPageEvents);
this.dispatch.opened();
// event: [Users Page] opened
// loading: true
// event: [Users API] loadedSuccess
\`\`\`

Это Redux-подход внутри SignalStore: компонент сообщает о событии, а не вызывает метод, переходы описаны в \`withReducer\`, асинхронщина — в обработчиках событий. Плагин появился в v19.2 как экспериментальный; в v20 обработчики назывались \`withEffects\`, в v21 их переименовали в \`withEventHandlers\`.

### Отличия от классического Store

- **Чтение:** SignalStore отдаёт сигналы, читаемые синхронно; классический Store — \`Observable\` через \`store.select\` (хотя у него тоже есть \`selectSignal\`).
- **Изменение:** в SignalStore — методы и \`patchState\`; в классическом — только \`dispatch(action)\` и reducer.
- **Производные данные:** \`computed\` с автоматическим отслеживанием зависимостей против \`createSelector\` с мемоизацией по ссылкам.
- **Асинхронщина:** методы и \`rxMethod\` внутри store против отдельного слоя Effects, слушающего глобальный поток actions.
- **Область жизни:** SignalStore может быть глобальным или локальным для компонента; классический Store — один глобальный на приложение, фичи только добавляют в него срезы.
- **Связь фич:** в классическом Store одно событие слышат все reducers и effects (глобальная шина); у SignalStore общей шины нет — store вызывают напрямую (или через плагин событий).
- **DevTools и журнал:** у классического Store — Redux DevTools с time-travel из коробки; у SignalStore встроенной интеграции нет (её дают сторонние пакеты, например \`withDevtools\` из \`@angular-architects/ngrx-toolkit\`).

### Как выбрать

- Фича-состояние экрана, форма с загрузкой, фильтры таблицы, состояние, которое должно умереть вместе с компонентом → SignalStore.
- Повторяющаяся логика между фичами (статус запроса, пагинация) → SignalStore с \`signalStoreFeature\`.
- Требование аудита, журнал действий, time-travel, одно событие с реакциями во многих фичах → классический Store (или SignalStore с плагином событий, если журнал нужен без глобального store).
- Большое существующее приложение на классическом NgRx → не переписывать всё; новые фичи можно делать на SignalStore, они живут рядом.

### Где это применяется на практике

- **Экраны с таблицей**: store в \`providers\` компонента держит фильтры, сортировку, страницу и данные; \`rxMethod\` с \`switchMap\` грузит данные при изменении фильтров.
- **Формы редактирования**: загрузка сущности в \`onInit\`, статус сохранения через переиспользуемую фичу, сброс при уходе со страницы.
- **Глобальные вещи средней сложности**: корзина, текущий пользователь, настройки — \`providedIn: 'root'\`.
- **Дашборды**: каждый виджет со своим маленьким store, общие данные — в одном root-store.
- **Дизайн-системы и библиотеки компонентов**: сложные компоненты (грид, мультиселект) держат внутреннее состояние в локальном SignalStore.

## Важные нюансы и подводные камни

- **Мутация вместо новой ссылки.** \`patchState(store, s => { s.users.push(u); return s; })\` — ссылка на массив прежняя, сигнал не обновится. Проверено: в массиве 2 элемента, а \`count()\` по-прежнему показывает 1.
- **\`async/await\` вместо \`rxMethod\`** — нет отмены, устаревший ответ перезаписывает свежий (проверено: \`query: ab\`, а данные для \`'a'\`).
- **Ошибка в \`rxMethod\` без \`tapResponse\` или внутреннего \`catchError\`** завершает поток — метод молча перестаёт работать.
- **\`rxMethod\` с сигналом или Observable вне контекста инъекции** — в v21 предупреждение и обещание ошибки в будущем; вызывайте в конструкторе или передавайте \`{ injector }\`.
- **\`protectedState\` — защита на уровне типов.** Снаружи \`patchState(store, ...)\` — ошибка компиляции, но в рантайме проверки нет. Для тестов есть \`unprotected(store)\` из \`@ngrx/signals/testing\`.
- **Порядок фич важен.** \`withComputed\` видит только то, что объявлено выше; методы, нужные хуку, должны быть объявлены до \`withHooks\`.
- **\`providedIn: 'root'\` против \`providers\` компонента.** Root-store живёт всё приложение и общий для всех; store в компоненте — свой у каждого экземпляра и уничтожается вместе с ним. Перепутать — значит получить либо «утекающее» состояние между экранами, либо потерю данных при навигации.
- **Потеря трассируемости.** Без событий в DevTools не видно, кто и почему изменил состояние: за простоту платят аудитом.
- **Гигантский store на всё приложение** — SignalStore задуман маленьким и композируемым: дробите по фичам и выносите общее в \`signalStoreFeature\`.
- **Побочные эффекты в \`withComputed\`** — \`computed\` обязан быть чистым; для эффектов есть методы, \`rxMethod\`, хуки или \`effect\`.
- **Неизвестное поле в \`patchState\`** — в dev-режиме NgRx выводит предупреждение и игнорирует его: все поля должны быть объявлены в \`withState\` заранее.

**Плюсы:** мало кода, синхронное чтение сигналами без \`async\`-pipe, точечные обновления, композиция через переиспользуемые фичи, глобальная или локальная область жизни, строгая типизация, \`rxMethod\` для сложной асинхронщины.
**Минусы:** нет журнала действий и time-travel из коробки, нет глобальной шины событий без плагина, дисциплину иммутабельности и обработки ошибок держит разработчик, API ещё активно меняется между мажорными версиями.

## Как это спрашивают на собеседовании

**Главный вывод:** SignalStore — это NgRx на сигналах: store собирается из фич \`withState\`/\`withComputed\`/\`withMethods\`/\`withHooks\`, читается синхронно, меняется через \`patchState\` новыми ссылками, асинхронщина — через \`rxMethod\` с отменой. По сравнению с классическим Store меньше церемонии, но нет журнала действий из коробки.

Типичные формулировки: «Что такое SignalStore?», «Чем он отличается от классического NgRx Store?», «Когда SignalStore, а когда Store?», «Как делать HTTP в SignalStore?».

Что могут спросить следом:

- *Заменит ли SignalStore классический NgRx?* — Нет, это другая точка на шкале: меньше церемонии, но меньше гарантий аудита; оба живут в одном приложении.
- *Как сделать store локальным для компонента?* — Не указывать \`providedIn: 'root'\` и добавить store в \`providers\` компонента.
- *Как избежать гонок при загрузке?* — \`rxMethod\` с \`switchMap\` и \`tapResponse\`, а не \`async/await\`.
- *Можно ли менять state снаружи?* — По умолчанию нет: \`protectedState\` делает это ошибкой TypeScript; изменения идут через методы.
- *Можно ли вернуть Redux-стиль?* — Да, плагин \`@ngrx/signals/events\`: \`eventGroup\`, \`withReducer\`, \`withEventHandlers\`, \`injectDispatch\`.

### Ответ на 1 минуту

> SignalStore из @ngrx/signals — это стейт-менеджмент NgRx на сигналах. Store собирается из фич как из конструктора: withState объявляет состояние, и каждое поле становится сигналом, withComputed даёт производные значения — аналог селекторов, но мемоизирует их сам Angular, withMethods добавляет методы с inject, а withHooks — onInit и onDestroy. Меняется состояние через patchState, который сливает изменения и обновляет только те сигналы, у которых сменилась ссылка, поэтому нужны иммутабельные обновления. Отличия от классического Store: состояние читается синхронно, нет обязательного цикла actions, reducers и effects, store может быть локальным для компонента, а логика переиспользуется через signalStoreFeature. Для асинхронщины беру rxMethod с switchMap и tapResponse, потому что async await не отменяет устаревшие запросы. Классический Store оставляю там, где нужны журнал действий, time-travel и глобальная шина событий.`,
      en: `## In short

\`@ngrx/signals\` is NgRx rewritten on **Signals**. Instead of Observable state and the mandatory Redux cycle (action → reducer → selector), it gives you a **functional, composable store** assembled from building blocks.

Analogy: the classic Store is a **factory with a security gate, waybills, and a logbook**: every change is paperworked, but you get a complete history. SignalStore is a **workshop**: tools within reach, state changed directly via \`patchState\`, almost no paperwork.

## What it is made of

\`signalStore(...)\` takes a set of **features**, each adding something:

1. **\`withState({...})\`** — declares the state. Every field automatically becomes a **signal**, including deep slices.
2. **\`withComputed(...)\`** — memoized derived values. The equivalent of selectors, but on signals and with no manual memoization.
3. **\`withMethods(...)\`** — methods that encapsulate logic, including async, right inside the store. Dependencies come in via \`inject\` in the arguments.
4. **\`withEntities(...)\`** — the Entity Adapter equivalent for signals.
5. **\`signalStoreFeature(...)\`** — your own reusable behaviour "mixins".

Separately there is **\`rxMethod\`** — the bridge to RxJS: a method that accepts a value or an Observable and lets you use \`switchMap\`, \`debounceTime\` and the rest inside for async effects with cancellation.

## Example

\`\`\`ts
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState({ users: [] as User[], loading: false }),
  withComputed(({ users }) => ({
    count: computed(() => users().length)
  })),
  withMethods((store, api = inject(UserApi)) => ({
    async load() {
      patchState(store, { loading: true });
      const users = await firstValueFrom(api.getAll());
      patchState(store, { users, loading: false });
    }
  }))
);
\`\`\`

Why: in the template this reads synchronously — \`store.users()\`, \`store.count()\`, \`store.loading()\` — with no \`async\` pipe. No actions, no reducers, no separate effects file: one entity instead of four.

## What to say in the interview

> \`@ngrx/signals\` is NgRx's newer, Signals-based approach: instead of Observable state and the Redux cycle it offers a functional, composable store assembled from features. \`withState\` declares the state and every field becomes a synchronously readable signal; \`withComputed\` provides memoized derivations — the selector equivalent, but on the signal graph; \`withMethods\` encapsulates logic, including async, right in the store. Three things differ from the classic Store: state is Signals rather than Observables and is read synchronously; there is no mandatory ceremony of actions, reducers and effects, since changes go through \`patchState\`; and the whole feature lives in one object rather than four files. It extends through \`withEntities\` as the Entity Adapter equivalent, \`rxMethod\` as a bridge to RxJS for async effects with cancellation, and custom features built on \`signalStoreFeature\`. I reach for it for feature state, and keep the classic Store where action auditing and time-travel debugging matter.

## Gotchas

- **Losing traceability**: without actions, DevTools cannot show who changed state and why — simplicity is paid for in auditability.
- **Mutating an object inside \`patchState\`** — you must update with new references, or \`computed\` will not recompute.
- **Doing async with plain \`async/await\` instead of \`rxMethod\`** — you lose cancellation of stale requests and get races.
- **One giant store for the whole app** — SignalStore is designed to be composed; split it into features.
- **Side effects inside \`withComputed\`** — computed must stay pure; use \`effect\`/\`rxMethod\` for effects.
- **Follow-up question**: does it replace classic NgRx? No — it is a different point on the scale: less ceremony, but fewer audit guarantees.`
    }
  },
  {
    id: 'rxjs-026',
    category: 'ngrx',
    level: 'Medium',
    tags: ['ngrx', 'facade', 'pattern'],
    question: {
      ru: 'Что такое facade-паттерн в NgRx и какие у него плюсы и минусы?',
      en: 'What is the facade pattern in NgRx and what are its pros and cons?'
    },
    answer: {
      ru: `## В чём суть

Facade (фасад) — это обычный Angular-сервис, который прячет весь NgRx (store, actions, селекторы) за коротким понятным API. Компонент вызывает \`facade.pageOpened()\` и читает \`facade.users()\` — и понятия не имеет, что под этим лежит Redux с его reducer'ами и эффектами.

Аналогия: фасад — это **стойка ресепшена** в отеле. Гость говорит «мне нужен номер», а не «оформите заявку формы 12, передайте её в отдел бронирования, потом заберите ключ на складе». Внутренняя кухня спрятана, наружу торчит понятное меню. Если отель сменит систему бронирования, гостю об этом знать не нужно — он по-прежнему говорит с той же стойкой.

**Какую проблему решает.** Без фасада каждый компонент, которому нужны пользователи, импортирует \`Store\`, файл с actions и файл с селекторами, сам собирает нужные выборки и сам решает, какой action отправить. Через год таких компонентов десятки: смена структуры состояния или переход на другую библиотеку означает правку всех. Тесты компонентов тоже тяжелеют — им нужен мок всего store. Фасад собирает это знание в одном месте: компоненты зависят от маленького API, а не от устройства хранилища.

## Словарик терминов

- **Store (хранилище)** — единый объект состояния приложения в NgRx; из него читают через селекторы, а менять можно только отправкой actions.
- **Action (действие)** — простой объект вида \`{ type: '[Users Page] Opened' }\`, сообщение «что-то произошло»; только он может запустить изменение состояния.
- **\`dispatch\` (отправка)** — метод \`store.dispatch(action)\`: «вот событие, обработайте». Возвращает \`void\`, результат не отдаёт.
- **Reducer (редьюсер)** — чистая функция \`(state, action) => newState\`, которая считает новое состояние.
- **Selector (селектор)** — функция, которая достаёт кусок состояния или вычисляет из него производное значение; созданные через \`createSelector\` запоминают результат (мемоизация).
- **Effect (эффект)** — класс или функция NgRx, которая слушает actions и делает побочную работу: HTTP-запросы, навигацию, тосты.
- **Facade (фасад)** — сервис-посредник: наружу выборки и команды, внутри \`select\` и \`dispatch\`.
- **\`select\` / \`selectSignal\`** — способы прочитать селектор из store: первый возвращает Observable (поток значений), второй — Angular-сигнал.
- **Сигнал (signal)** — реактивная переменная Angular: читается вызовом \`users()\`, при изменении шаблон перерисовывается.
- **View model (vm, модель представления)** — один объект, в котором собрано всё, что нужно шаблону: \`{ total, active, loading }\`.
- **\`createActionGroup\` / \`createFeature\`** — фабрики NgRx: первая создаёт группу actions с общим источником, вторая — reducer и готовые селекторы для каждого поля состояния.
- **\`provideMockStore\`** — тестовая подмена store из \`@ngrx/store/testing\`, позволяет задать состояние и значения селекторов.
- **Трассируемость (traceability)** — возможность по коду или по Redux DevTools понять, кто и почему отправил action.
- **God-сервис (god object)** — класс, который знает и делает всё подряд; его трудно читать, тестировать и менять.
- **SignalStore** — хранилище из пакета \`@ngrx/signals\`, собранное из функций \`withState\`, \`withComputed\`, \`withMethods\`; сам по себе уже выглядит как фасад.

## Как это работает под капотом

Фасад — это не механизм NgRx, а архитектурный паттерн: тонкий слой кода между компонентом и store. Что происходит при клике в компоненте:

1. Компонент вызывает метод фасада, например \`facade.pageOpened()\`. Он не знает ни про actions, ни про store.
2. Фасад превращает вызов в action и отправляет его: \`this.store.dispatch(UsersPageActions.opened())\`.
3. Action проходит через reducer'ы — появляется новое состояние, например \`loading: true\`. Параллельно эффект ловит тот же action и идёт в API, а по ответу отправляет \`[Users API] Load Success\`.
4. Новое состояние пересчитывает селекторы. Мемоизированный селектор не пересчитывается, если его входные данные не изменились.
5. Поля фасада, созданные через \`select\` или \`selectSignal\`, выдают новое значение, и шаблон компонента перерисовывается.

Главное правило: фасад **только делегирует**. У него нет своего состояния и нет бизнес-логики — они остаются в reducer'ах, эффектах и селекторах. Фасад отвечает лишь на вопрос «как компоненту удобно с этим общаться». По сути он состоит ровно из двух вещей: **выборок состояния** (публичные поля через \`select\`/\`selectSignal\`) и **команд** (методы, внутри которых \`dispatch\`).

### Пример 1. Компонент без фасада — сколько он знает лишнего

\`\`\`ts
import { Store } from '@ngrx/store';
import { UsersPageActions } from './state/users.actions';
import { selectUsers, selectLoading } from './state/users.selectors';

@Component({ /* ... */ })
export class UsersPage {
  private store = inject(Store);
  users = this.store.selectSignal(selectUsers);
  loading = this.store.selectSignal(selectLoading);

  ngOnInit() {
    this.store.dispatch(UsersPageActions.opened());
  }
}
\`\`\`

Компонент импортирует три файла состояния. Переименуют \`selectUsers\` или переедут на SignalStore — придётся править каждый такой компонент.

### Пример 2. Тот же компонент через фасад

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  // выборки
  readonly users = this.store.selectSignal(selectUsers);
  readonly loading = this.store.selectSignal(selectLoading);
  readonly users$ = this.store.select(selectUsers); // если нужен поток для RxJS

  // команды
  pageOpened() { this.store.dispatch(UsersPageActions.opened()); }
  addUser(user: User) { this.store.dispatch(UsersPageActions.userAdded({ user })); }
}

@Component({
  template: \`
    @if (facade.loading()) { <app-spinner /> }
    @for (u of facade.users(); track u.id) { <app-user-row [user]="u" /> }
  \`,
})
export class UsersPage {
  protected facade = inject(UsersFacade);
  ngOnInit() { this.facade.pageOpened(); }
}
\`\`\`

Теперь компонент зависит от одного класса с двумя полями и двумя методами. Он выражает **намерение** («страница открылась», «добавить пользователя»), а не механику. В старом стиле то же самое читают из \`users$\` через \`async\`-пайп: \`{{ facade.users$ | async }}\`.

### \`createActionGroup\` и \`createFeature\` — откуда фасад берёт actions и селекторы

Фасад не создаёт actions и селекторы сам — он пользуется готовыми. В современном NgRx их делают двумя фабриками:

\`\`\`ts
import { createActionGroup, createFeature, createReducer, on, emptyProps, props } from '@ngrx/store';

export const UsersPageActions = createActionGroup({
  source: 'Users Page',
  events: { 'Opened': emptyProps(), 'User Added': props<{ user: User }>() },
});
console.log(UsersPageActions.opened().type);                 // [Users Page] Opened
console.log(UsersPageActions.userAdded({ user }).type);      // [Users Page] User Added

export const usersFeature = createFeature({
  name: 'users',
  reducer: createReducer(initialState, /* on(...) */),
});
console.log(Object.keys(usersFeature));
// ['name', 'reducer', 'selectUsersState', 'selectList', 'selectLoading']
\`\`\`

\`createActionGroup\` превращает название события в метод в camelCase (\`'User Added'\` → \`userAdded\`) и сам собирает тип \`[Источник] Событие\`. \`createFeature\` генерирует селектор на каждое поле состояния — фасаду остаётся их подключить.

### \`select\` и \`selectSignal\` — два способа отдать данные наружу

- \`store.select(selector)\` возвращает Observable: он выдаёт значение сразу при подписке и потом при каждом изменении, повторы отсекает. Подходит, когда дальше нужна RxJS-обработка или шаблон со \`async\`.
- \`store.selectSignal(selector)\` возвращает сигнал: читается синхронно, \`users()\`, без подписок и отписок. В новом коде на Angular с сигналами это вариант по умолчанию.

Фасад может отдавать и то и другое — важно лишь договориться в команде о едином стиле.

### Пример 3. Фасад с view model на сигналах (проверено на NgRx 21)

\`\`\`ts
const selectActive = createSelector(usersFeature.selectList, list => list.filter(u => u.active));
const selectVm = createSelector(
  usersFeature.selectList, usersFeature.selectLoading, selectActive,
  (users, loading, active) => ({ total: users.length, active: active.length, loading })
);

class UsersFacade {
  private store = inject(Store);
  readonly vm = this.store.selectSignal(selectVm);
  readonly users = this.store.selectSignal(usersFeature.selectList);
  pageOpened() { this.store.dispatch(UsersPageActions.opened()); }
  addUser(user: User) { this.store.dispatch(UsersPageActions.userAdded({ user })); }
}

// начальное состояние: Ann (active), Bob (inactive)
console.log(facade.vm());   // { total: 2, active: 1, loading: false }
facade.pageOpened();
facade.addUser({ id: 3, name: 'Cid', active: true });
console.log(facade.vm());   // { total: 3, active: 2, loading: true }
console.log(facade.users().map(u => u.name)); // ['Ann', 'Bob', 'Cid']
\`\`\`

Это одна из самых полезных ролей фасада: **единая точка для view model**. Шаблон получает один готовый объект, а склейка трёх селекторов спрятана внутри. \`createSelector\` мемоизирует результат: пока \`list\` и \`loading\` те же, \`vm\` возвращает тот же объект, и лишних перерисовок нет.

### Пример 4. Тест компонента: мок фасада вместо мока store

\`\`\`ts
// без фасада: нужен мок store и подмена каждого селектора
TestBed.configureTestingModule({
  providers: [provideMockStore({ initialState })],
});
store.overrideSelector(selectUsers, [ann, bob]);
store.overrideSelector(selectLoading, false);

// с фасадом: обычный объект
const facadeMock = { users: signal([ann, bob]), loading: signal(false), pageOpened: jasmine.createSpy() };
TestBed.configureTestingModule({
  providers: [{ provide: UsersFacade, useValue: facadeMock }],
});
// ...
expect(facadeMock.pageOpened).toHaveBeenCalled();
\`\`\`

Тест компонента больше не знает про NgRx. Сам фасад при этом тестируют отдельно — с \`provideMockStore\` или с настоящим store, проверяя, что метод отправляет правильный action.

### \`provideMockStore\` — что именно заменяет фасад в тестах

\`provideMockStore({ initialState })\` из \`@ngrx/store/testing\` подставляет \`MockStore\`: reducer'ы и эффекты не работают, а через \`overrideSelector\` можно задать ответ любого селектора. Он нужен для тестов самого фасада; для тестов компонентов мок фасада проще и не ломается от рефакторинга селекторов.

### Пример 5. Фасад и гигиена actions: команды против событий

\`\`\`ts
// ❌ Фасад «команд»: один action на все случаи
loadUsers() { this.store.dispatch(loadUsers()); }
// вызывают со страницы, из диалога, после сохранения, по таймеру...
// в DevTools пять одинаковых '[Users] Load' — кто их отправил?

// ✅ Фасад «событий»: метод на каждое место, action называет источник
pageOpened()   { this.store.dispatch(UsersPageActions.opened()); }
userSaved()    { this.store.dispatch(UserDialogActions.saved()); }
refreshTimer() { this.store.dispatch(UsersTimerActions.ticked()); }
\`\`\`

Это главная претензия к фасадам. В Redux action принято писать как **событие** («страница открылась»), а не как **команду** («загрузи пользователей»): тогда по журналу видно, что происходило. Фасад с методом \`load()\` подталкивает к командам и прячет источник. Лекарство — называть методы фасада по событиям и не переиспользовать один метод из несвязанных мест.

### Пример 6. Смена реализации за фасадом

\`\`\`ts
// Публичный API остался тем же: users(), loading(), pageOpened()
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(UsersSignalStore); // раньше был NgRx Store
  readonly users = this.store.entities;
  readonly loading = this.store.loading;
  pageOpened() { this.store.load(); }
}
\`\`\`

Компоненты не заметили переезда с NgRx Store на SignalStore — это и есть «меньше связности». Обратите внимание: сам SignalStore уже даёт сигналы и методы, то есть **сам является фасадом**. Поэтому поверх SignalStore отдельный фасад обычно не пишут; он оправдан только как временный переходник при миграции.

### Где это применяется на практике

- **Крупные feature-модули** с NgRx: заказы, клиенты, отчёты — фасад на фичу (\`OrdersFacade\`), компоненты знают только его.
- **Монорепозитории (Nx) с библиотеками \`data-access\`**: фасад — публичное API библиотеки, а actions и селекторы остаются внутренними и не экспортируются.
- **Миграция NgRx Store → SignalStore** (или наоборот): фасад фиксирует контракт, реализацию меняют по одной фиче.
- **Дашборды с view model**: фасад склеивает пять-шесть селекторов в один \`vm\` для шаблона.
- **Команды с разным опытом**: новички работают с понятными методами фасада, не погружаясь в Redux.

## Важные нюансы и подводные камни

- **Фасад-прокси один в один — чистый оверхед.** Если каждый метод — это ровно один \`dispatch\`, а каждое поле — ровно один селектор, фасад добавляет файл и ничего не даёт. Особенно для маленьких фич.
- **Бизнес-логика в фасаде.** Расчёты, условия и ветвления должны жить в reducer'ах, эффектах и селекторах; фасад только делегирует. Иначе логику не видно в DevTools и её нельзя переиспользовать.
- **Один фасад на всё приложение.** Он превращается в god-сервис, тянет за собой весь store и становится точкой конфликтов при слиянии веток. Правило: один фасад на одну фичу.
- **Своё состояние в фасаде.** Поле \`selectedId\` прямо в фасаде — это второй источник истины рядом со store; они неминуемо разъедутся.
- **Потеря трассируемости.** По коду компонента не видно, какой action улетел; частично лечится говорящими методами по событиям (\`pageOpened\`, а не \`load\`).
- **\`dispatch\` ничего не возвращает.** Нельзя сделать \`await facade.save()\` и узнать результат: ответ сервера придёт отдельным action'ом. Результат читают через селекторы (\`saving\`, \`error\`) или слушают action в эффекте. Попытка вернуть Observable из метода фасада обычно ломает Redux-поток.
- **Фасад в \`root\`, а состояние фичи ленивое.** Если фичу регистрируют через \`provideState\` в ленивом маршруте, а фасад прочитал её раньше, селектор вернёт \`undefined\`, и NgRx в dev-режиме предупредит: \`The feature name "users" does not exist in the state\`. Фасад фичи логично предоставлять там же, где регистрируется её состояние.
- **Фасад поверх SignalStore обычно не нужен** — SignalStore сам по себе фасад с методами и \`computed\`-сигналами.

**Плюсы:** инкапсуляция (компонент не знает про actions и селекторы), простые тесты компонентов (мокается один объект), меньше связности (реализацию можно сменить, не трогая компоненты), читаемость (компонент выражает намерение), единая точка для view model.
**Минусы:** лишний слой и лишний файл, риск god-сервиса, скрытый поток actions и склонность к командам вместо событий, из-за чего часть команд считает фасад анти-паттерном для Redux.

## Как это спрашивают на собеседовании

**Главный вывод:** фасад — тонкий сервис, который выставляет наружу выборки (\`selectSignal\`/\`select\`) и команды (методы с \`dispatch\`), а компоненты работают только с ним. Он даёт инкапсуляцию, тестируемость и свободу менять реализацию, но стоит слоя кода и трассируемости, поэтому оправдан в крупных фичах.

Типичные формулировки: «Что такое facade в NgRx и зачем он нужен?», «Какие минусы у фасада?», «Нужен ли фасад, если есть SignalStore?».

Что могут спросить следом:

- *Где должна жить бизнес-логика при наличии фасада?* — В reducer'ах, эффектах и селекторах; фасад только делегирует.
- *Почему фасад называют анти-паттерном для Redux?* — Он прячет, какой action отправлен, и подталкивает к командам вроде \`load()\` вместо событий вроде \`[Users Page] Opened\`.
- *Как тестировать компонент с фасадом?* — Подставить через DI объект-мок с сигналами и spy-методами; \`provideMockStore\` нужен только для теста самого фасада.
- *Нужен ли фасад при SignalStore?* — Обычно нет: SignalStore уже даёт сигналы и методы, то есть сам является фасадом.
- *Как вернуть результат сохранения из фасада?* — Никак напрямую: \`dispatch\` возвращает \`void\`; результат читают через селекторы статуса или ловят success/failure action.

### Ответ на 1 минуту

> Facade — это сервис-обёртка над NgRx: наружу он выставляет выборки состояния через \`selectSignal\` или \`select\` и команды — методы, внутри которых делается \`dispatch\`, а компоненты работают только с ним и не импортируют ни \`Store\`, ни actions, ни селекторы. Своего состояния и бизнес-логики у фасада нет, он только делегирует. Плюсы: инкапсуляция, простые тесты — мокается один объект вместо \`provideMockStore\`, меньше связности — можно перейти с NgRx Store на SignalStore, не трогая компоненты, и удобная точка для view model из нескольких селекторов. Минусы: лишний слой, риск god-сервиса и потеря трассируемости — из компонента не видно, какой action ушёл, а методы вроде \`load()\` подталкивают к командам вместо событий. Поэтому я делаю один фасад на крупную фичу и называю методы по событиям, а для маленьких фич и поверх SignalStore фасад не пишу.`,
      en: `## In short

A facade is a **service wrapper** that hides all of NgRx (store, actions, selectors) behind a simple API. The component calls \`facade.load()\` and reads \`facade.users$\` — with no idea that Redux sits underneath.

Analogy: a facade is the **reception desk**. The guest says "I need a room", not "file form 12, forward it to the booking department, then collect the key from the storeroom". The back office is hidden; what faces outward is a legible menu.

## What it is made of

A facade is exactly two things:

1. **State selections** — public \`users$\`, \`loading$\` built from \`store.select(...)\`. Components consume them via the \`async\` pipe.
2. **Commands** — methods like \`load()\` and \`add(user)\` that call \`store.dispatch(...)\` internally.

That is all. No business logic: that stays in reducers, effects, and selectors.

## Pros and cons

**Pros:**

- **Encapsulation**: the component knows nothing about actions or selectors, and in tests the facade is mocked with a single object.
- **Lower coupling**: the implementation can be swapped (NgRx → SignalStore) without touching a single component.
- **Readability**: the component expresses **intent** (\`load\`, \`add\`), not mechanics.
- **A single place for view models**: convenient for combining several selectors into one stream.

**Cons:**

- **An extra layer**: one more file, especially pointless when the facade proxies one-to-one.
- **God-service risk**: the facade grows into a giant service holding everything.
- **It hides the explicitness of the action stream**: some teams consider this a Redux anti-pattern, because traceability suffers — you can no longer see from the component's code which action is dispatched.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private store = inject(Store);

  readonly users$ = this.store.select(selectUsers);
  readonly loading$ = this.store.select(selectLoading);

  load() { this.store.dispatch(loadUsers()); }
  add(user: User) { this.store.dispatch(addUser({ user })); }
}

// component: facade.load();
// template:  {{ facade.users$ | async }}
\`\`\`

Why: the component imports neither \`Store\` nor the actions and selectors files. Its test is a stub object with two fields and two methods — no \`provideMockStore\` required.

## What to say in the interview

> A facade is a service wrapper that hides NgRx details behind a simple API: it exposes state selections built from \`store.select\` and commands that dispatch internally, so components work with the facade rather than the store directly. The upsides are encapsulation — the component knows nothing about actions or selectors and is easier to test because you mock a single facade; lower coupling — you can swap the implementation, say move from NgRx to SignalStore, without touching components; and readability, since the component describes intent rather than mechanics. The downsides are real too: it is an extra layer and an extra file, especially when it proxies one-to-one; there is a risk of it becoming a god service; and it hides the explicitness of the action stream, which is why some teams consider it a Redux anti-pattern — you can no longer see from the component which action is dispatched, so traceability suffers. So I use it in large feature modules and consider it overkill for small features.

## Gotchas

- **A one-to-one proxy facade** is pure overhead: an extra file that buys nothing.
- **Business logic in the facade** — it belongs in reducers, effects, and selectors; the facade only delegates.
- **One facade for the whole app** — it becomes a god service and drags the entire store along.
- **Storing state in the facade itself** — you create a second source of truth alongside the store.
- **Loss of traceability** — the component's code no longer shows which action went out; partly mitigated by expressive method names.
- **Follow-up question**: do you need a facade with SignalStore? Usually not — a SignalStore is already a facade with methods and computed values.`
    }
  },
  {
    id: 'rxjs-027',
    category: 'ngrx',
    level: 'Hard',
    tags: ['ngxs', 'state-management'],
    question: {
      ru: 'Как устроен NGXS: state, actions, selectors? Чем отличается от NgRx?',
      en: 'How is NGXS structured: state, actions, selectors? How does it differ from NgRx?'
    },
    answer: {
      ru: `## В чём суть

NGXS — альтернативный state-менеджер для Angular. Идея та же, что у NgRx: один store на приложение, изменения только через actions, данные текут в одну сторону. Но подана она в «ангуляровском», объектно-ориентированном стиле — классы, декораторы, DI; под капотом тоже RxJS.

Главное отличие одной фразой: **в NgRx фича разложена по четырём файлам (actions, reducer, effects, selectors), в NGXS она собрана в один класс**.

Аналогия: NgRx — это **конвейер с разделением труда**: один цех выписывает заявки, другой считает, третий ходит в банк, и каждый шаг записан в журнал. NGXS — **универсальный мастер**: сам принял заявку, сам сходил в банк, сам поправил запись в книге. Быстрее и проще, но следов в журнале меньше.

**Какую проблему решает.** Классический Redux многословен: чтобы загрузить список, в NgRx нужно описать три action'а, reducer, эффект и селекторы в разных файлах. Для средних команд это ощутимый налог на каждую фичу. NGXS оставляет главное — единый источник истины, предсказуемые изменения, DevTools — но убирает церемонии: одна фича, один класс, обычный DI.

## Словарик терминов

- **Store (хранилище)** — единое дерево состояния приложения; в NGXS это сервис \`Store\` с методами \`dispatch\`, \`select\`, \`selectSnapshot\`, \`selectSignal\`.
- **Однонаправленный поток (unidirectional data flow)** — правило Redux: компонент отправляет action → обработчик меняет состояние → селекторы отдают новые данные в UI; обратных путей нет.
- **State-класс (\`@State\`)** — класс с декоратором \`@State({ name, defaults })\`: имя куска дерева, начальное значение и все обработчики этого куска.
- **Action (действие)** — в NGXS это класс со статическим полем \`type\` и данными в конструкторе: \`new AddUser(user)\`.
- **Обработчик (\`@Action\`)** — метод state-класса, помеченный \`@Action(LoadUsers)\`; NGXS вызывает его при каждом \`dispatch\` этого action'а.
- **\`StateContext\` (\`ctx\`)** — объект, который получает обработчик: \`getState()\`, \`setState()\`, \`patchState()\`, \`dispatch()\`.
- **\`patchState\` / \`setState\`** — замена части состояния (слияние полей) и замена всего куска целиком.
- **Selector (селектор, \`@Selector\`)** — статический метод, вычисляющий данные из состояния; результат запоминается (мемоизация).
- **Мемоизация (memoization)** — кэширование результата функции: если вход тот же (та же ссылка на объект), функция не пересчитывается.
- **State operators (операторы состояния)** — функции \`patch\`, \`append\`, \`updateItem\`, \`removeItem\` из \`@ngxs/store/operators\` для иммутабельных правок вложенных данных.
- **Поток \`Actions\`** — Observable всех action'ов со статусами; фильтруется операторами \`ofActionDispatched\`, \`ofActionSuccessful\`, \`ofActionErrored\`.
- **\`cancelUncompleted\`** — опция \`@Action\`, которая отменяет незавершённый предыдущий вызов обработчика, как \`switchMap\`.
- **\`developmentMode\`** — опция NGXS, которая в dev-сборке замораживает состояние через \`Object.freeze\`, чтобы ловить мутации.
- **Reducer и effect (в NgRx)** — чистая функция расчёта состояния и отдельный класс для побочных действий; в NGXS обе роли выполняет обработчик \`@Action\`.

## Как это работает под капотом

Что происходит от старта приложения до перерисовки:

1. При старте \`provideStore([UsersState])\` NGXS читает метаданные декораторов: имя куска (\`users\`), начальное значение и какие методы подписаны на какие типы action'ов.
2. Из всех state-классов собирается одно дерево: \`{ users: { list: [], loading: false }, auth: {...} }\`. Store один на приложение — как в NgRx.
3. \`store.dispatch(new LoadUsers())\` сразу, без подписки, ищет по \`LoadUsers.type\` **все** методы с \`@Action(LoadUsers)\` во всех state-классах и вызывает каждый, передавая ему \`ctx\` своего куска и сам action.
4. Обработчик меняет состояние через \`ctx.patchState\` или \`ctx.setState\`. NGXS подменяет кусок дерева новым объектом и оповещает подписчиков.
5. Если обработчик вернул Observable или Promise, NGXS **сам на него подписывается** и считает action завершённым, только когда тот завершится. Observable, который вернул \`dispatch()\`, завершается вместе со всеми обработчиками.
6. Параллельно в поток \`Actions\` уходят статусы: \`DISPATCHED\`, затем \`SUCCESSFUL\`, \`ERRORED\` или \`CANCELED\`.
7. Селекторы \`@Selector()\` пересчитываются, только если изменилась ссылка на их кусок состояния; иначе отдают кэш.

В терминах NgRx: метод с \`@Action\` — это reducer и effect в одном лице, статический \`@Selector\` — селектор, а класс action'а — \`createAction\`.

### Пример 1. Вся фича в одном классе (проверено на NGXS 21)

\`\`\`ts
export class LoadUsers { static readonly type = '[Users Page] Load'; }
export class AddUser {
  static readonly type = '[Users Page] Add';
  constructor(public user: User) {}
}

@State<UsersStateModel>({ name: 'users', defaults: { list: [], loading: false } })
@Injectable()
export class UsersState {
  private api = inject(UserApi);          // обычный Angular DI

  @Selector()
  static activeUsers(state: UsersStateModel) {
    return state.list.filter(u => u.active);
  }

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });     // «reducer»
    return this.api.getAll().pipe(         // «effect»
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }

  @Action(AddUser)
  add(ctx: StateContext<UsersStateModel>, { user }: AddUser) {
    ctx.setState(patch({ list: append([user]) }));
  }
}

// bootstrapApplication(App, { providers: [provideStore([UsersState])] });
const done$ = store.dispatch(new LoadUsers());
console.log(store.selectSnapshot(s => s.users.loading)); // true — запрос в пути
done$.subscribe({ complete: () =>
  console.log(store.selectSnapshot(s => s.users.loading)) // false
});
\`\`\`

В одном классе живут и «reducer» (\`patchState\`), и «effect» (\`this.api.getAll()\`), и «selector» (\`activeUsers\`). В NgRx это были бы четыре файла и несколько импортов между ними.

### \`StateContext\` — пульт управления своим куском

Обработчик получает \`ctx\` только для **своего** куска дерева:

- \`ctx.getState()\` — текущее значение куска (снимок, не поток).
- \`ctx.patchState({ loading: true })\` — слить поля с текущим состоянием, остальные останутся.
- \`ctx.setState(newState)\` — заменить кусок целиком; принимает и готовый объект, и оператор состояния.
- \`ctx.dispatch(new OtherAction())\` — отправить следующий action, например \`LoadUsersSuccess\` для аудита.

Это императивнее, чем чистый reducer: вы не «возвращаете новое состояние», а командуете «поменяй». Но под капотом NGXS всё равно создаёт новый объект — иммутабельность сохраняется, если вы сами не мутируете старый.

### \`@Action\` и асинхронность: зачем возвращать Observable

\`\`\`ts
@Action(LoadNoReturn)
loadNoReturn(ctx) {
  ctx.patchState({ loading: true });
  api('a').subscribe(list => ctx.patchState({ list, loading: false })); // забыли return
}

@Action(LoadReturn)
loadReturn(ctx) {
  ctx.patchState({ loading: true });
  return api('b').pipe(tap(list => ctx.patchState({ list, loading: false })));
}

await firstValueFrom(store.dispatch(new LoadNoReturn()), { defaultValue: null });
// dispatch completed, loading = true    ← NGXS не знал о запросе
// response for a                         ← ответ пришёл позже

await firstValueFrom(store.dispatch(new LoadReturn()), { defaultValue: null });
// response for b
// dispatch completed, loading = false   ← дождался
\`\`\`

Возврат Observable — это встроенная замена эффектов. NGXS подписывается сам, ждёт завершения и только тогда шлёт \`SUCCESSFUL\`. Если вернуть нечего, \`dispatch()\` завершится сразу, и код вроде «после загрузки перейти на страницу» сработает слишком рано.

### \`@Selector\` и мемоизация

\`\`\`ts
console.log(store.selectSnapshot(UsersState.activeUsers)); // activeUsers recomputed → ['Ann']
console.log(store.selectSnapshot(UsersState.activeUsers)); // ['Ann'] — без пересчёта
store.dispatch(new ToggleUser(2));
console.log(store.selectSnapshot(UsersState.activeUsers)); // activeUsers recomputed → ['Ann', 'Bob']
\`\`\`

Селектор пересчитывается, только когда изменилась ссылка на кусок \`users\`. Объявляется он **статическим** методом: NGXS вызывает его без экземпляра класса. Для композиции есть \`@Selector([A, B])\` и функции \`createSelector\`, \`createPropertySelectors\`, \`createPickSelector\`.

### Почему нельзя мутировать состояние

\`\`\`ts
@Action(Mutate)
mutate(ctx) {
  const s = ctx.getState();
  s.list.push('Bob');   // мутация старого объекта
  ctx.setState(s);      // та же ссылка
}
// select(count) emits 1
// после Mutate: list = ['Ann', 'Bob'], а count selector = 1 — устаревший кэш, подписчики молчат
\`\`\`

Мемоизация сравнивает ссылки, а ссылка не изменилась — значит, «ничего не произошло». С \`provideStore([UsersState], { developmentMode: true })\` NGXS в dev-сборке замораживает состояние, и та же мутация сразу падает: \`Cannot add property 0, object is not extensible\`. В проде заморозка вырезается.

### Операторы состояния: \`patch\`, \`append\`, \`updateItem\`

\`\`\`ts
import { patch, append, updateItem, removeItem } from '@ngxs/store/operators';

ctx.setState(patch({ list: append([user]) }));                      // добавить в конец
ctx.setState(patch({
  list: updateItem<User>(u => u.id === id, patch({ active: true })) // поправить один элемент
}));
ctx.setState(patch({ list: removeItem<User>(u => u.id === id) }));   // удалить
\`\`\`

Это декларативная замена ручных \`...spread\` на трёх уровнях вложенности: новый объект создаётся только по изменённому пути, остальное переиспользуется.

### \`cancelUncompleted\` — встроенный аналог \`switchMap\`

\`\`\`ts
@Action(Search, { cancelUncompleted: true })
search(ctx, { q }: Search) {
  return api(q).pipe(tap(list => ctx.patchState({ list })));
}

store.dispatch(new Search('an'));
store.dispatch(new Search('ann'));
// response for ann
// list = ['ann-result']   ← запрос 'an' отписан, его ответ не применён
\`\`\`

Без опции применились бы оба ответа в порядке прихода, и устаревший мог бы перетереть свежий.

### Один action — несколько state-классов

\`\`\`ts
@Action(Logout) reset(ctx) { ctx.setState({ list: [], loading: false }); } // в UsersState
@Action(Logout) logout(ctx) { ctx.setState({ token: null }); }            // в AuthState

store.dispatch(new Logout());
// AuthState handles Logout
// UsersState handles Logout
// {"auth":{"token":null},"users":{"list":[],"loading":false}}
\`\`\`

Как и в NgRx, где один action обрабатывают reducer'ы разных фич, здесь на один тип подписываются методы разных классов.

### Поток \`Actions\` и ошибки

\`\`\`ts
actions$.pipe(ofActionErrored(Load)).subscribe(r => console.log('ofActionErrored:', r.result.error?.message));

store.dispatch(new Load(true)).subscribe({ error: e => console.log('dispatch error:', e.message) });
store.dispatch(new Load(true));   // ошибку никто не обработал
store.dispatch(new Load(false));
// ofActionErrored: 500
// dispatch error: 500
// ofActionErrored: 500
// third dispatch completed, list = ['Ann'], handler calls = 3
// ErrorHandler: 500   ← необработанная ошибка ушла в Angular ErrorHandler
\`\`\`

Важное отличие от NgRx: каждый \`dispatch\` вызывает обработчик заново, поэтому ошибка не «убивает» фичу навсегда. Но обработать её нужно — через \`subscribe({ error })\`, \`ofActionErrored\` или \`catchError\` внутри обработчика, иначе она уйдёт в глобальный \`ErrorHandler\`.

### Современный API на сигналах: \`select()\` и \`dispatch()\`

\`\`\`ts
@Component({ template: \`@for (u of active(); track u.id) { {{ u.name }} }\` })
export class UsersPage {
  active = select(UsersState.activeUsers);  // Signal<User[]>
  addUser = dispatch(AddUser);              // (user) => Observable<void>
}
// addUser({ id: 3, name: 'Cid', active: true }) → active() = ['Ann', 'Bob', 'Cid']
\`\`\`

\`select()\` и \`dispatch()\` работают в контексте внедрения (конструктор, поле класса). Старый декоратор \`@Select\` помечен как deprecated — в новом коде используйте \`select()\` или \`store.selectSignal()\`.

### Та же фича в NgRx — для сравнения

\`\`\`ts
// users.actions.ts
export const UsersPageActions = createActionGroup({ source: 'Users Page', events: { 'Opened': emptyProps() } });
export const UsersApiActions = createActionGroup({ source: 'Users API', events: {
  'Load Success': props<{ list: User[] }>(), 'Load Failure': props<{ error: string }>() } });
// users.reducer.ts
on(UsersPageActions.opened, s => ({ ...s, loading: true })),
on(UsersApiActions.loadSuccess, (s, { list }) => ({ ...s, list, loading: false })),
// users.effects.ts
load$ = createEffect(() => this.actions$.pipe(ofType(UsersPageActions.opened),
  switchMap(() => this.api.getAll().pipe(map(list => UsersApiActions.loadSuccess({ list })),
    catchError(e => of(UsersApiActions.loadFailure({ error: e.message })))))));
// users.selectors.ts
export const selectActiveUsers = createSelector(selectList, list => list.filter(u => u.active));
\`\`\`

В NgRx результат запроса — это отдельный action \`Load Success\`, и в DevTools видна вся цепочка. В NGXS при загрузке виден только \`[Users Page] Load\` и изменение состояния; чтобы журнал был таким же подробным, нужно вручную делать \`ctx.dispatch(new LoadUsersSuccess())\`.

### Как выбрать

- **NgRx**, если команда большая, нужен строгий аудит изменений, каждое событие должно быть отдельной записью в журнале, а побочные эффекты — отдельным слоем.
- **NGXS**, если хочется Redux-модели с меньшим количеством кода, команда привыкла к классам и DI, а журнал «action + изменение состояния» достаточен.
- **\`@ngrx/signals\` (SignalStore)** — в новых проектах всё чаще занимает эту нишу: ещё меньше кода, сигналы, без глобального журнала.
- Выбирают по требованиям к аудиту и размеру команды, а не по вкусу; смешивать NgRx и NGXS в одном приложении не стоит.

### Где это применяется на практике

- **Средние корпоративные приложения**: формы заявок, справочники, настройки пользователя — один state-класс на фичу.
- **Глобальные настройки и тема**: маленький \`SettingsState\` с плагином \`@ngxs/storage-plugin\`, который сохраняет кусок в \`localStorage\`.
- **Синхронизация с роутером**: \`@ngxs/router-plugin\` кладёт состояние маршрута в store, навигация делается action'ом.
- **Отладка**: \`@ngxs/devtools-plugin\` (\`withNgxsReduxDevtoolsPlugin()\`) подключает те же Redux DevTools, что и у NgRx.

## Важные нюансы и подводные камни

- **«NGXS — это не Redux».** Неверно: тот же единый store, однонаправленный поток и action'ы, отличается только упаковка.
- **Мутация состояния напрямую** вместо \`patchState\`/\`setState\` с новым объектом ломает мемоизацию: селектор отдаёт устаревший кэш, подписчики молчат. Включайте \`developmentMode: true\` в dev, чтобы мутации падали сразу.
- **Забыли вернуть Observable из \`@Action\`.** NGXS не дождётся завершения, \`dispatch()\` завершится раньше ответа, и код «после загрузки» отработает слишком рано.
- **Подписались вручную и при этом вернули тот же Observable.** NGXS подпишется второй раз — холодный HTTP-запрос уйдёт дважды. Либо \`return\`, либо \`subscribe\`, но не оба.
- **\`@Selector()\` на нестатическом методе.** Селектор недоступен как \`UsersState.activeUsers\` и не работает; селекторы объявляются только \`static\`.
- **\`dispatch()\` выполняется сразу, без подписки.** Подписываются на его результат, только если нужно дождаться завершения или поймать ошибку.
- **Ошибка в обработчике не убивает фичу, но и не исчезает.** Без обработки она уходит в \`ErrorHandler\`; состояние \`loading\` при этом останется \`true\`, если его не сбросить в \`catchError\` или \`finalize\`.
- **Гонки без \`cancelUncompleted\`.** Два быстрых поиска могут вернуться в обратном порядке, и старый результат перетрёт новый.
- **Толстый state-класс.** Вся фича в одном файле быстро разрастается до сотен строк; это цена «меньше файлов». Делите её на несколько независимых state-классов (опция \`children\` для вложенных состояний в свежих версиях помечена deprecated).
- **Беднее журнал в DevTools.** Побочные результаты не превращаются в отдельные action'ы автоматически, поэтому трассируемость ниже, чем в NgRx.

**Плюсы:** заметно меньше boilerplate, вся фича в одном классе, привычные Angular-классы и DI, встроенное ожидание асинхронных обработчиков, \`cancelUncompleted\`, операторы состояния, плагины и сигнальный API.
**Минусы:** императивный стиль обновлений, слабее трассируемость побочных эффектов, риск толстых классов, сообщество и экосистема меньше, чем у NgRx, а новые проекты всё чаще выбирают SignalStore.

## Как это спрашивают на собеседовании

**Главный вывод:** NGXS — тот же Redux (единый store, actions, однонаправленный поток), но обработчики \`@Action\` живут прямо в state-классе и заменяют reducer и effect, а селекторы — статические методы с \`@Selector()\`. NgRx строже и прозрачнее для аудита, NGXS быстрее в разработке.

Типичные формулировки: «Как устроен NGXS?», «Чем NGXS отличается от NgRx?», «Что выбрать для нового проекта — NgRx или NGXS?».

Что могут спросить следом:

- *Где в NGXS эффекты?* — Их роль играет обработчик \`@Action\`, который возвращает Observable или Promise; NGXS сам подписывается и ждёт завершения.
- *Как отменить устаревший запрос?* — \`@Action(Search, { cancelUncompleted: true })\` — аналог \`switchMap\`.
- *Почему мутация ломает селекторы?* — Мемоизация сравнивает ссылки: тот же объект — тот же кэш, подписчики не узнают об изменении.
- *Как отреагировать на успешное завершение action'а вне state?* — Подписаться на поток \`Actions\` с \`ofActionSuccessful(LoadUsers)\`.
- *Что занимает эту нишу в новых проектах?* — \`@ngrx/signals\` SignalStore: меньше кода, сигналы, композиция фич.

### Ответ на 1 минуту

> NGXS — альтернативный state-менеджер для Angular: идея Redux та же — единый store, actions и однонаправленный поток, но подана в объектно-ориентированном стиле с классами, декораторами и DI. Состояние описывается классом с \`@State\`, где указаны имя и defaults; actions — классы со статическим \`type\`. Обработчик — метод того же класса с \`@Action\`, а не отдельный reducer и эффект: он меняет состояние через \`ctx.patchState\` или \`setState\` и может вернуть Observable, на который NGXS подпишется сам и дождётся завершения. Селекторы — статические методы с \`@Selector()\`, мемоизированные по ссылке, поэтому мутировать состояние нельзя — кэш устареет. Есть \`cancelUncompleted\` как аналог \`switchMap\` и сигнальные \`select()\` и \`dispatch()\`. Итог: NgRx строже и лучше для аудита в больших командах, NGXS даёт меньше кода, но беднее журнал побочных эффектов.`,
      en: `## In short

NGXS is an alternative state manager for Angular. Same store-and-actions idea, but served in an **"Angular-ish", object-oriented** style: decorators, classes, DI. Under the hood it too is built on RxJS.

The core difference in one sentence: **in NgRx a feature is spread across four files; in NGXS it is gathered into one class**.

Analogy: NgRx is a **production line with division of labour** — one department writes the requests, another does the maths, a third goes to the bank. NGXS is the **all-round craftsman**: took the request, went to the bank, updated the ledger. Faster, but fewer traces left behind.

## What it is made of

1. **State** — a class decorated with \`@State({ name, defaults })\` that **bundles the data and the handlers**. Dependencies arrive via ordinary Angular DI through the constructor.
2. **Actions** — classes with a payload. Dispatched as \`store.dispatch(new LoadUsers())\`.
3. **The handler** — a method marked \`@Action(LoadUsers)\` living **in that same state class**, not in a separate effects file. This is the key difference.
4. **State mutation** — via \`ctx.patchState({...})\` or \`ctx.setState(...)\`: more imperative than a pure reducer.
5. **Selectors** — static methods with \`@Selector()\`, memoized the same way as in NgRx.

Inside an \`@Action\` handler you can **return an Observable or a Promise** and NGXS will wait for it. That is the built-in effects replacement.

## Example

\`\`\`ts
@State<UsersStateModel>({
  name: 'users',
  defaults: { list: [], loading: false }
})
@Injectable()
export class UsersState {
  constructor(private api: UserApi) {}

  @Selector()
  static activeUsers(state: UsersStateModel) {
    return state.list.filter(u => u.active);
  }

  @Action(LoadUsers)
  load(ctx: StateContext<UsersStateModel>) {
    ctx.patchState({ loading: true });
    return this.api.getAll().pipe(
      tap(list => ctx.patchState({ list, loading: false }))
    );
  }
}
\`\`\`

Why: a single class here holds the "reducer" (\`patchState\`), the "effect" (\`this.api.getAll()\`), and the "selector" (\`activeUsers\`). In NgRx that would be four files and three imports between them.

## What to say in the interview

> NGXS is an alternative state manager for Angular aimed at less boilerplate and a more Angular-ish, object-oriented style: decorators, classes, DI; under the hood it is also built on RxJS. State is declared as a class with a \`@State\` decorator specifying the name and defaults, and that same class holds the handlers. Actions are classes with a payload, dispatched via \`store.dispatch(new LoadUsers())\`, and the handler lives inside the state class as a method decorated with \`@Action\` rather than in a separate effects file — the key difference from NgRx. State is changed imperatively through \`patchState\` or \`setState\` instead of pure reducers, and a handler can return an Observable or Promise which NGXS will await — that is the built-in effects replacement. Selectors are static methods with \`@Selector()\` and are memoized the same way. Comparing the two: NgRx follows Redux more strictly, which is better for large teams and auditing; NGXS is faster to develop with, but pays for it with weaker traceability.

## Gotchas

- **"NGXS is not Redux"** — it is: same unidirectional flow and single store, only the packaging differs.
- **Mutating state directly** instead of \`patchState\`/\`setState\` — it breaks selector memoization.
- **Forgetting to return the Observable from \`@Action\`** — NGXS will not await completion and \`dispatch().subscribe()\` fires too early.
- **A non-static \`@Selector()\`** — selectors are declared as static class methods.
- **A fat state class** — the whole feature in one file grows quickly; that is the price of "fewer files".
- **Follow-up question**: how do you choose between NgRx and NGXS? By auditing requirements and team size, not taste; and in new projects \`@ngrx/signals\` increasingly occupies this niche.`
    }
  },
  {
    id: 'rxjs-028',
    category: 'rxjs',
    level: 'Hard',
    tags: ['signals', 'rxjs', 'tosignal', 'interop'],
    question: {
      ru: 'Как взаимодействуют Signals и RxJS? Объясните toSignal и toObservable.',
      en: 'How do Signals and RxJS interoperate? Explain toSignal and toObservable.'
    },
    answer: {
      ru: `## В чём суть

В современном Angular живут две модели реактивности. RxJS описывает **события во времени**: значения приходят сами, их можно задерживать, отменять, комбинировать. Signals описывают **текущее значение**: оно есть всегда, читается синхронно, а Angular сам знает, кто от него зависит. Мосты между мирами лежат в \`@angular/core/rxjs-interop\`: \`toSignal\` превращает Observable в сигнал, \`toObservable\` — сигнал в Observable.

Аналогия: Observable — **лента новостей**, которая сама приходит к вам. Signal — **табло на вокзале**: на нём всегда написано текущее значение, и вы смотрите на него, когда захотите. \`toSignal\` — дежурный, который читает ленту и переписывает табло после каждой новости. \`toObservable\` — камера, которая время от времени снимает табло и рассылает снимок, если надпись поменялась; если надпись успела смениться трижды между двумя снимками, подписчики увидят только последнюю.

**Какую проблему решает.** HTTP, роутер, формы и WebSocket в Angular отдают Observable, а шаблоны, \`computed\` и zoneless-режим лучше всего работают с сигналами. Без мостов пришлось бы вручную подписываться, класть значение в сигнал и не забывать отписаться — или наоборот, не иметь возможности сделать \`debounceTime\` и \`switchMap\` над значением, которое хранится в сигнале.

## Словарик терминов

- **Signal (сигнал)** — функция-обёртка над значением: \`count()\` читает его. При чтении внутри шаблона, \`computed\` или \`effect\` Angular запоминает зависимость.
- **\`signal(v)\` (WritableSignal)** — сигнал, который можно менять через \`set\` и \`update\`.
- **\`computed(fn)\`** — производный сигнал только для чтения: пересчитывается лениво, когда изменились сигналы, которые он читал.
- **\`effect(fn)\`** — функция с побочным действием, которую Angular перезапускает после изменения прочитанных в ней сигналов. Запускается не сразу, а по расписанию Angular.
- **Push / pull** — «значения толкают подписчику» (RxJS) против «потребитель сам берёт текущее значение, когда нужно» (Signals).
- **Реактивный контекст (reactive context)** — код, выполняемый внутри \`computed\`, \`effect\` или шаблона, где отслеживаются чтения сигналов.
- **Injection context (контекст внедрения)** — момент, когда работает \`inject()\`: конструктор, инициализатор поля, фабрика провайдера, \`runInInjectionContext\`.
- **\`DestroyRef\`** — объект Angular с методом \`onDestroy(cb)\`: вызовет колбэк, когда компонент, директива или injector будут уничтожены.
- **\`ReplaySubject(1)\`** — \`Subject\`, который помнит последнее значение и сразу отдаёт его новому подписчику.
- **\`untracked(fn)\`** — выполнить \`fn\`, не регистрируя прочитанные в ней сигналы как зависимости.
- **Zoneless** — режим Angular без Zone.js: проверка изменений запускается по сигналам, \`markForCheck\` и событиям, а не по любому асинхронному колбэку.

## Как это работает под капотом

### toSignal по шагам

Взято из исходника Angular 21 (\`@angular/core/fesm2022/rxjs-interop.mjs\`):

1. В dev-режиме проверяется, что вызов не внутри \`computed\`/\`effect\`, иначе ошибка NG0602 — потому что каждое выполнение создавало бы новую подписку.
2. Берётся \`DestroyRef\`: из текущего injection context или из опции \`injector\`. Если контекста нет и не указан \`manualCleanup: true\` — ошибка NG0203.
3. Создаётся внутренний writable-сигнал с начальным состоянием \`initialValue\` (по умолчанию \`undefined\`).
4. **Сразу** выполняется \`subscribe\`: каждый \`next\` кладёт значение в сигнал, \`error\` сохраняет ошибку, \`complete\` просто перестаёт ждать уничтожения.
5. Если указан \`requireSync: true\`, а значение синхронно так и не пришло — ошибка NG0601.
6. Регистрируется \`destroyRef.onDestroy(() => sub.unsubscribe())\` — автоотписка при уничтожении владельца.
7. Наружу возвращается \`computed\` только для чтения: он отдаёт значение или **выбрасывает** сохранённую ошибку.

Упрощённо:

\`\`\`ts
function toSignal(source$, { initialValue } = {}) {
  const destroyRef = inject(DestroyRef);            // поэтому нужен injection context
  const state = signal({ kind: 'value', value: initialValue });
  const sub = source$.subscribe({                   // подписка СРАЗУ
    next: value => state.set({ kind: 'value', value }),
    error: error => state.set({ kind: 'error', error }),
  });
  destroyRef.onDestroy(() => sub.unsubscribe());    // автоотписка
  return computed(() => {
    const s = state();
    if (s.kind === 'error') throw s.error;          // ошибка — при чтении
    return s.value;
  });
}
\`\`\`

### toObservable по шагам

1. Нужен injection context или опция \`injector\`.
2. Создаётся \`ReplaySubject(1)\`.
3. Создаётся \`effect\`, который читает сигнал (и тем самым подписывается на его изменения) и внутри \`untracked\` вызывает \`subject.next(value)\`.
4. Эффект выполняется **не синхронно**, а когда его запустит планировщик Angular (в приложении — в ближайшем цикле обработки, в тестах — после \`TestBed.tick()\`). Даже начальное значение не приходит в момент \`subscribe\`.
5. Если до запуска эффекта сигнал поменяли несколько раз, эффект увидит только последнее значение. Если установили то же самое значение — сигнал не изменился, эффект не перезапустится, эмиссии не будет.
6. При уничтожении injector-а эффект удаляется, а \`subject\` завершается (\`complete\`).
7. Наружу отдаётся \`subject.asObservable()\`: опоздавший подписчик сразу получит последнее значение.

\`\`\`ts
function toObservable(source) {
  const injector = inject(Injector);
  const subject = new ReplaySubject(1);
  const watcher = effect(() => {
    const value = source();                         // эффект следит за сигналом
    untracked(() => subject.next(value));
  }, { injector, manualCleanup: true });
  injector.get(DestroyRef).onDestroy(() => { watcher.destroy(); subject.complete(); });
  return subject.asObservable();
}
\`\`\`

### Пример 1. toSignal для HTTP-запроса

\`\`\`ts
@Component({
  template: \`@for (u of users(); track u.id) { <li>{{ u.name }}</li> }\`
})
export class UsersComponent {
  private http = inject(HttpClient);

  readonly users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
  // сразу после создания: users() → []
  // когда ответ пришёл:    users() → [{ id: 1, name: 'Ann' }, ...]
}
\`\`\`

Поле класса — injection context, поэтому \`toSignal\` сам найдёт \`DestroyRef\` и отпишется при уничтожении компонента (если запрос ещё идёт — он будет отменён). Без \`initialValue\` тип был бы \`Signal<User[] | undefined>\`, и шаблону пришлось бы проверять \`undefined\`; в Angular 21 \`initialValue: []\` выводит тип \`Signal<User[]>\` без приведения \`as\`.

### Пример 2. requireSync для синхронных источников

\`\`\`ts
const user$ = new BehaviorSubject('Ann');
const user = toSignal(user$, { requireSync: true }); // тип Signal<string>, без undefined
console.log(user()); // Ann
user$.next('Bob');
console.log(user()); // Bob

toSignal(timer(10), { requireSync: true });
// NG0601: \`toSignal()\` called with \`requireSync\` but \`Observable\` did not emit synchronously.
\`\`\`

\`requireSync\` — обещание «значение будет сразу при подписке». \`BehaviorSubject\`, \`of\`, \`startWith\` его выполняют, HTTP-запрос — нет.

### Пример 3. Ошибка в потоке выбрасывается при чтении

\`\`\`ts
const src$ = new Subject<number>();
const value = toSignal(src$, { initialValue: 0 });

src$.next(1);
console.log(value());            // 1
src$.error(new Error('HTTP 500'));
value();                         // throws Error: HTTP 500
\`\`\`

Сигнал «запоминает» ошибку и бросает её при каждом чтении — в шаблоне это сломает рендер компонента. Поэтому \`catchError\` ставят в потоке **до** моста и превращают ошибку в обычное значение: \`toSignal(data$.pipe(catchError(() => of([]))), { initialValue: [] })\`.

### Пример 4. toObservable асинхронен и схлопывает изменения

\`\`\`ts
const count = signal(1);
const count$ = toObservable(count);          // в injection context
count$.subscribe(v => console.log('emitted', v));
console.log('after subscribe');
count.set(2);
count.set(3);
console.log('after sets');
// after subscribe
// after sets
// emitted 3        ← позже, когда Angular запустил эффект; 1 и 2 никто не увидел
\`\`\`

Если вам нужен каждый промежуточный шаг, сигнал — неподходящий источник: держите события в \`Subject\`.

### Пример 5. signal → RxJS → signal: поиск

\`\`\`ts
readonly query = signal('');

readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
// пользователь набрал a → an → ang быстрее 300 мс:
// HTTP ang            ← один запрос
// results() → ['ang!']
\`\`\`

\`debounceTime\` и \`switchMap\` на голых сигналах не выразить: у сигнала нет понятия времени и отмены. А результат удобнее держать сигналом: в шаблоне это \`results()\` без \`async\` pipe, и он работает в zoneless-режиме.

### Пример 6. Вне injection context

\`\`\`ts
export class ReportComponent {
  private injector = inject(Injector);

  ngOnInit() {
    // toSignal(this.report$);  → NG0203: toSignal() can only be used within an injection context
    this.report = toSignal(this.report$, { injector: this.injector });
  }
}

// в коде вне Angular-классов, где отписку вы контролируете сами:
const value = toSignal(of(5), { manualCleanup: true }); // живёт, пока поток не завершится
\`\`\`

### Опции toSignal целиком

- \`initialValue\` — значение до первой эмиссии; убирает \`undefined\` из типа.
- \`requireSync\` — значение обязано прийти синхронно, иначе NG0601.
- \`injector\` — откуда взять \`DestroyRef\`, если вызов вне injection context.
- \`manualCleanup\` — не привязываться к \`DestroyRef\`: подписка живёт до завершения потока.
- \`equal\` — своя функция равенства; одинаковые по ней значения не будят зависимых.
- \`debugName\` — имя сигнала в Angular DevTools.

### Соседи из rxjs-interop

- \`takeUntilDestroyed()\` — оператор, который завершает поток при уничтожении владельца; удобен, когда нужен именно \`subscribe\`, а не сигнал.
- \`outputFromObservable(obs$)\` / \`outputToObservable(output)\` — мосты для \`output()\` компонентов.
- \`rxResource({ params, stream })\` — загрузка данных, где запрос описан Observable-ом, а результат, статус и ошибка доступны как сигналы. В Angular 21 помечен \`@experimental\`.

Статус API: \`toSignal\` и \`toObservable\` появились в Angular 16 как developer preview и стали стабильными в Angular 20.

### Когда что использовать

- Состояние, которое читает шаблон, — сигнал, либо \`toSignal\` на конце RxJS-конвейера.
- Сложная асинхронная логика (debounce, \`switchMap\`, \`retry\`, отмена) — RxJS, а на выходе \`toSignal\` для потребления.
- Значение из сигнала нужно подать на вход RxJS-конвейера — \`toObservable\`.
- Асинхронности нет вовсе — никаких мостов, достаточно \`computed\`.

### Где это применяется на практике

- **Шаблон без \`async\` pipe** — \`toSignal(this.store.select(...))\`, \`toSignal(this.route.paramMap)\`, \`toSignal(form.valueChanges)\`.
- **Фильтры больших таблиц** — фильтр хранится сигналом, через \`toObservable\` идёт в \`debounceTime\` + \`switchMap\` к API, результат через \`toSignal\` — обратно в шаблон.
- **Входы компонента в RxJS-конвейер** — \`toObservable(this.userId)\` для \`input()\`-сигнала, а дальше \`switchMap\` к HTTP.
- **Миграция легаси-сервисов** — сервис продолжает отдавать \`BehaviorSubject\`, а новые компоненты читают его через \`toSignal(..., { requireSync: true })\`.
- **Zoneless-приложения** — сигналы сами сообщают Angular, какой компонент перерисовать.

## Важные нюансы и подводные камни

- **\`toSignal\` без \`initialValue\`** — тип \`Signal<T | undefined>\`, шаблону нужны проверки. С \`initialValue: null\` — \`Signal<T | null>\`.
- **\`requireSync: true\` на асинхронном источнике** — ошибка NG0601 в момент создания.
- **Ждать синхронной эмиссии от \`toObservable\`** — её не будет, даже для начального значения; изменения между запусками эффекта схлопываются в последнее.
- **\`toSignal\` вне injection context** — не тихая утечка, а ошибка NG0203. Передайте \`injector\` или явно \`manualCleanup: true\`.
- **\`toSignal\` внутри \`computed\`, \`effect\` или метода, вызываемого из шаблона** — ошибка NG0602 в dev-режиме: каждое выполнение создавало бы новую подписку.
- **\`toSignal\` подписывается сразу**, даже если сигнал никто не читает: для тяжёлого источника это неожиданная работа.
- **Каждый вызов \`toSignal\` — своя подписка.** Два \`toSignal\` на один холодный HTTP-поток — два запроса. Делайте один сигнал в сервисе или используйте \`shareReplay\`.
- **Ошибка потока бросается при чтении сигнала** — ставьте \`catchError\` до моста.
- **\`toSignal\` в сервисе \`providedIn: 'root'\`** живёт всё время работы приложения — для глобального состояния это нормально, для тяжёлых потоков стоит подумать.

**Плюсы:** автоматическая подписка и отписка; синхронное чтение в шаблоне без \`async\`; можно брать лучшее из обоих миров — время и отмену из RxJS, простое состояние из Signals; работает в zoneless.
**Минусы:** \`toObservable\` асинхронен и теряет промежуточные значения; ошибки превращаются в исключения при чтении; привязка к injection context; лишняя пара мостов там, где асинхронности нет.

## Как это спрашивают на собеседовании

**Главный вывод:** \`toSignal\` сразу подписывается на Observable и хранит последнее значение в сигнале с автоотпиской через \`DestroyRef\`; \`toObservable\` строится на \`effect\` и \`ReplaySubject(1)\`, поэтому эмитит асинхронно и только последнее значение. Асинхронную логику держим в RxJS, на границе с шаблоном переходим в сигнал.

Типичные формулировки: «Как подружить Signals и RxJS?», «Что делает \`toSignal\` под капотом?», «Почему \`toObservable\` не эмитит сразу?».

Что могут спросить следом:

- *Зачем \`initialValue\` или \`requireSync\`?* — Сигнал обязан иметь значение сразу; без них тип включает \`undefined\`.
- *Что будет с ошибкой потока?* — Она сохранится и будет выброшена при чтении сигнала.
- *Почему нельзя вызвать \`toSignal\` в \`ngOnInit\`?* — Нет injection context; нужен \`injector\` или \`manualCleanup\`.
- *Сколько эмиссий даст \`set(2); set(3)\` через \`toObservable\`?* — Одну, со значением 3.
- *Когда отписывается \`toSignal\`?* — При уничтожении \`DestroyRef\` владельца, либо когда поток завершился.

### Ответ на 1 минуту

> В Angular две модели реактивности: RxJS — это push-потоки событий во времени с операторами и отменой, а Signals — синхронное текущее значение с автоматическим отслеживанием зависимостей. Мосты лежат в \`@angular/core/rxjs-interop\`. \`toSignal\` сразу подписывается на Observable, кладёт каждое значение во внутренний сигнал и возвращает read-only \`computed\`; отписку он регистрирует в \`DestroyRef\`, поэтому вызывается в injection context, иначе нужен \`injector\`. До первой эмиссии нужен \`initialValue\` или \`requireSync\` для синхронных источников вроде \`BehaviorSubject\`, а ошибка потока выбрасывается при чтении сигнала, поэтому \`catchError\` ставлю до моста. \`toObservable\` работает через \`effect\` и \`ReplaySubject(1)\`: эмитит асинхронно, когда Angular запустит эффект, и пачка быстрых \`set\` схлопывается в одно значение. Правило: время, отмену и гонки решаю в RxJS, а на границе с шаблоном перевожу результат в сигнал.`,
      en: `## In short

Angular has two reactivity models, and they are about different things:

- **RxJS** — **push**: events over time, rich operators, cancellation. About "what is happening".
- **Signals** — **pull**: a value always exists right now, dependencies are tracked automatically. About "what is".

Analogy: an Observable is a **news feed** that arrives at you. A Signal is a **departures board** at a station: it always shows the current value and you read it whenever you like.

The bridges between the worlds live in \`@angular/core/rxjs-interop\`: \`toSignal\` and \`toObservable\`.

## How it works, step by step

**\`toSignal(obs$)\` — from stream to board:**

1. Subscribes to the Observable **immediately**.
2. Every \`next\` stores the value in a signal, read synchronously as \`user()\`.
3. When the owner is destroyed (in an injection context) it **unsubscribes automatically** — no leaks.
4. It requires \`initialValue\`, because the signal needs something before the first emission. Or \`requireSync: true\` if the source is **guaranteed** synchronous, like a \`BehaviorSubject\`.

**\`toObservable(sig)\` — from board to stream:**

1. Internally it creates an \`effect\` that watches the signal.
2. When the signal changes, the effect emits the new value into the Observable.
3. Important: emissions are **asynchronous** — they happen on the effect tick, not synchronously on every \`set()\`. Several quick \`set\` calls may collapse into one emission carrying the last value.

## When to use which

- **State read in the template** → a Signal. Or \`toSignal\` at the end of an RxJS pipeline.
- **Complex async logic** (debounce, switchMap, retry, cancellation) → RxJS, with \`toSignal\` on the way out for consumption.
- **Feeding a signal into an RxJS pipeline** → \`toObservable\`.

## Example

\`\`\`ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

readonly query = signal('');

// signal → RxJS (the hard async part) → signal
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Why: \`debounceTime\` and \`switchMap\` cannot be expressed on bare signals — there is no notion of time or cancellation there. The result, on the other hand, is nicer as a signal: in the template it is just \`results()\`, no \`async\` pipe, and it works in zoneless mode.

## What to say in the interview

> Angular now has two reactivity models. RxJS is a push model of event streams over time with a rich operator set and cancellation, ideal for async sources: HTTP, WebSockets, debouncing, request races. Signals are synchronous values with automatic dependency tracking — a pull model, ideal for UI state and templates. The bridges come from \`@angular/core/rxjs-interop\`. \`toSignal\` subscribes to an Observable and stores its latest value as a signal; in an injection context it unsubscribes automatically on destroy, so no leaks, and it requires either an \`initialValue\` or \`requireSync: true\` for guaranteed-synchronous sources like a \`BehaviorSubject\`. \`toObservable\` goes the other way: internally it uses an \`effect\` to track signal changes, and those emissions are asynchronous, on the effect tick rather than on each \`set\` — an important nuance, because a burst of rapid changes can collapse into a single emission. The rule I follow: async coordination in RxJS, converting to a signal at the template boundary with \`toSignal\`.

## Gotchas

- **\`toSignal\` without \`initialValue\`** — the type becomes \`T | undefined\` and the template needs guards.
- **\`requireSync: true\` on a non-synchronous source** — it throws at runtime because no value exists at subscribe time.
- **Expecting a synchronous emission from \`toObservable\`** — there is none; it arrives on the effect tick.
- **\`toSignal\` outside an injection context** — nobody unsubscribes; pass an explicit \`injector\` in the options.
- **\`toSignal\` subscribes immediately**, even if nobody reads the signal — surprising work for a heavy source.
- **Follow-up question**: what about errors? An Observable error surfaces when the signal is read, so put \`catchError\` in the stream, before the bridge.`
    }
  },
  {
    id: 'rxjs-029',
    category: 'rxjs',
    level: 'Hard',
    tags: ['takeuntildestroyed', 'unsubscription', 'angular'],
    question: {
      ru: 'Как работает takeUntilDestroyed и почему он лучше ручного takeUntil + Subject?',
      en: 'How does takeUntilDestroyed work and why is it better than manual takeUntil + Subject?'
    },
    answer: {
      ru: `## В чём суть

\`takeUntilDestroyed()\` из \`@angular/core/rxjs-interop\` — оператор, который **сам** завершает поток, когда уничтожается его владелец: компонент, директива, сервис или injector. Он делает ровно то, что раньше писали руками через \`destroy$\`-Subject, \`ngOnDestroy\` и \`takeUntil\`, но без единой строчки церемонии. Появился в Angular 16 (developer preview), стабильный с Angular 19.

Аналогия: раньше вы вешали на дверь **записку «уходя, погаси свет»** и надеялись, что не забудете. \`takeUntilDestroyed\` — это **датчик движения**: свет гаснет сам, потому что подключён к самому зданию (\`DestroyRef\`), а не к вашей памяти.

**Какую проблему решает.** Подписка на долгоживущий источник — store, \`interval\`, события роутера, WebSocket, \`valueChanges\` формы из общего сервиса — не заканчивается сама, когда компонент уничтожен. Колбэк продолжает работать, держит в памяти уничтоженный компонент (утечка памяти), а после нескольких переходов по страницам обработчиков становится несколько и они делают двойную работу. Ручной паттерн \`destroy$\` лечит это, но его надо повторять в каждом классе и в нём легко ошибиться.

## Словарик терминов

- **Подписка и отписка (\`subscribe\` / \`unsubscribe\`)** — начать получать значения потока и прекратить. Пока подписка жива, источник держит ссылку на ваш колбэк.
- **Утечка памяти (memory leak)** — объект, который больше не нужен, но не может быть удалён сборщиком мусора, потому что на него кто-то ссылается (например, живая подписка).
- **\`takeUntil(notifier$)\`** — оператор RxJS: пропускает значения, пока \`notifier$\` не выдаст первое значение, после чего завершает поток.
- **Паттерн \`destroy$\`** — старый способ: поле \`destroy$ = new Subject<void>()\`, в \`ngOnDestroy\` вызывается \`next()\` и \`complete()\`, а каждая подписка содержит \`takeUntil(this.destroy$)\`.
- **\`DestroyRef\`** — объект Angular, связанный с конкретным владельцем (компонентом, директивой, injector-ом). Метод \`onDestroy(cb)\` регистрирует колбэк на уничтожение и возвращает функцию отмены регистрации; свойство \`destroyed\` говорит, уничтожен ли владелец.
- **Injection context (контекст внедрения)** — момент, когда работает \`inject()\`: конструктор, инициализатор поля, фабрика провайдера, \`runInInjectionContext\`. \`ngOnInit\` и обработчики событий к нему **не** относятся.
- **NG0203** — ошибка Angular «функцию можно вызывать только в injection context».
- **Higher-order оператор** — \`switchMap\`, \`mergeMap\` и подобные: на каждое значение создают внутреннюю подписку.
- **\`finalize\`** — оператор, вызывающий колбэк при любом завершении подписки: \`complete\`, \`error\` или отписка.
- **\`async\` pipe / \`toSignal\`** — способы отдать поток в шаблон, которые сами подписываются и сами отписываются.

## Как это работает под капотом

Исходник в Angular 21 занимает десяток строк (упрощён только синтаксис):

\`\`\`ts
function takeUntilDestroyed(destroyRef?: DestroyRef) {
  if (!destroyRef) {
    assertInInjectionContext(takeUntilDestroyed); // dev-режим: иначе NG0203
    destroyRef = inject(DestroyRef);
  }

  const destroyed$ = new Observable<void>(subscriber => {
    if (destroyRef.destroyed) {                   // владелец уже уничтожен
      subscriber.next();
      return;
    }
    const unregister = destroyRef.onDestroy(() => subscriber.next());
    return unregister;                            // teardown: снять колбэк
  });

  return source => source.pipe(takeUntil(destroyed$));
}
\`\`\`

Что происходит по шагам:

1. Вызов без аргумента берёт \`DestroyRef\` через \`inject()\`. Поэтому он работает только в injection context: в конструкторе или инициализаторе поля.
2. Создаётся \`destroyed$\` — обычный Observable (не \`Subject\`), который при подписке регистрирует колбэк в \`destroyRef.onDestroy\`.
3. Дальше работает обычный \`takeUntil(destroyed$)\`: он подписывается на \`destroyed$\`, затем на источник и пропускает значения.
4. Angular уничтожает владельца → вызывает все \`onDestroy\`-колбэки → \`destroyed$\` выдаёт значение.
5. \`takeUntil\` отправляет вниз \`complete\` и отписывается от источника → срабатывают teardown источника, \`finalize\` и \`complete\`-колбэки.
6. Если поток завершился раньше (например, HTTP-запрос), \`takeUntil\` отписывается от \`destroyed$\`, и teardown снимает колбэк с \`DestroyRef\` — колбэки не копятся.
7. Если владелец уже уничтожен к моменту подписки, \`destroyed$\` выдаёт значение сразу, и поток завершается немедленно.

### takeUntil — основа механизма

\`\`\`ts
import { interval, Subject, takeUntil, finalize } from 'rxjs';

const stop$ = new Subject<void>();
interval(100).pipe(
  takeUntil(stop$),
  finalize(() => console.log('finalize'))
).subscribe({
  next: v => console.log('tick', v),
  complete: () => console.log('complete'),
});
setTimeout(() => stop$.next(), 350);
// tick 0
// tick 1
// tick 2
// complete
// finalize
\`\`\`

\`takeUntil\` реагирует только на **значение** нотификатора. Если нотификатор просто завершился без \`next\`, поток продолжит жить — проверено: \`takeUntil\` с уже завершённым \`Subject\` пропускает тики дальше.

### Пример 1. Старый способ: destroy$ + ngOnDestroy

\`\`\`ts
export class PricesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.prices.stream$
      .pipe(takeUntil(this.destroy$))
      .subscribe(p => this.render(p));
  }

  ngOnDestroy() {
    this.destroy$.next();     // без next() takeUntil не сработает
    this.destroy$.complete();
  }
}
\`\`\`

Пять строк церемонии на каждый компонент, и три места, где можно ошибиться: забыть \`takeUntil\` в одной из подписок, забыть \`ngOnDestroy\`, вызвать только \`complete()\` без \`next()\`.

### Пример 2. takeUntilDestroyed в конструкторе или поле

\`\`\`ts
@Component({ selector: 'app-prices', template: '' })
export class PricesComponent {
  constructor() {
    inject(PriceService).ticks$.pipe(
      takeUntilDestroyed(),
      finalize(() => console.log('finalize'))
    ).subscribe(v => console.log('got', v));
  }
}
// ticks$.next(1)        → got 1
// компонент уничтожен   → finalize
// ticks$.next(2)        → ничего, подписчиков у ticks$ больше нет
\`\`\`

Конструктор — injection context, поэтому аргумент не нужен: оператор сам возьмёт \`DestroyRef\` этого компонента.

### Пример 3. ngOnInit и другие методы

\`\`\`ts
export class ReportComponent implements OnInit {
  private destroyRef = inject(DestroyRef); // поле — injection context

  ngOnInit() {
    // this.stream$.pipe(takeUntilDestroyed()).subscribe();
    // NG0203: takeUntilDestroyed() can only be used within an injection context ...

    this.stream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.handle(v));
  }
}
\`\`\`

Инициализатор поля выполняется в injection context, а \`ngOnInit\` — уже нет. Поэтому \`DestroyRef\` получают заранее в поле и передают явно. Попытка сделать \`inject(DestroyRef)\` прямо в \`ngOnInit\` упадёт с той же NG0203.

### Пример 4. Порядок в pipe

\`\`\`ts
// ❌ takeUntil до switchMap
clicks$.pipe(
  takeUntil(destroy$),
  switchMap(() => interval(10))
).subscribe(v => console.log('tick', v));
// клик → tick 0 → destroy$.next() → tick 1, tick 2, ... внутренний interval жив

// ✅ последним в pipe
clicks$.pipe(
  switchMap(() => interval(10).pipe(finalize(() => console.log('inner stopped')))),
  takeUntil(destroy$)
).subscribe(v => console.log('tick', v));
// клик → tick 0 → destroy$.next() → inner stopped
\`\`\`

Почему так: \`takeUntil\` завершает только то, что **выше** него. В первом случае он завершил поток кликов, но \`switchMap\` по правилам ждёт, пока завершится и активный внутренний поток, а \`interval\` бесконечен. В правильном варианте \`takeUntil\` отписывается от всего, что выше, включая внутреннюю подписку. С \`takeUntilDestroyed\` всё точно так же.

### DestroyRef напрямую

\`\`\`ts
const destroyRef = inject(DestroyRef);
const unregister = destroyRef.onDestroy(() => console.log('owner destroyed'));
// unregister() — отменить регистрацию, если колбэк больше не нужен
// destroyRef.destroyed — true после уничтожения владельца
\`\`\`

Это тот же механизм без RxJS: так закрывают \`IntersectionObserver\`, \`ResizeObserver\`, сторонние виджеты и ручные \`addEventListener\`. Если подписаться через \`takeUntilDestroyed(ref)\` на уже уничтоженный \`ref\`, поток завершится сразу — оператор проверяет \`destroyRef.destroyed\`.

### Сервисы и время жизни

\`takeUntilDestroyed()\` работает везде, где есть \`DestroyRef\`, — и в сервисах тоже. Но владельцем там является injector, который создал сервис:

- сервис в \`providers\` компонента уничтожается вместе с компонентом — отписка наступит при уходе со страницы;
- сервис \`providedIn: 'root'\` живёт столько же, сколько приложение: отписка наступит только при уничтожении приложения (в тестах — при \`TestBed.resetTestingModule()\`), то есть практически никогда во время работы.

### Где это применяется на практике

- **Побочные эффекты в компоненте** — подписка на \`valueChanges\` формы, чтобы сбрасывать зависимые поля; на события роутера для аналитики; на поток WebSocket для уведомлений.
- **Директивы** — \`fromEvent(window, 'resize')\` или \`fromEvent(el, 'scroll')\` в директиве автоподгрузки грида.
- **Сервисы со scope компонента** — store страницы, который подписывается на фильтры и живёт столько же, сколько страница.
- **Миграция легаси-кода** — замена десятков \`destroy$\` и \`ngOnDestroy\` на одну строку, часто автоматическим рефакторингом.
- **Вместе с \`async\` pipe и \`toSignal\`** — они закрывают поток в шаблон, а \`takeUntilDestroyed\` — всё, что заканчивается ручным \`subscribe\`.

## Важные нюансы и подводные камни

- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`** — ошибка NG0203 «не в injection context». Самая частая ошибка при переходе.
- **\`inject(DestroyRef)\` внутри метода** — тоже NG0203: получайте \`DestroyRef\` в поле или конструкторе.
- **Не последним в \`pipe\`** — внутренние подписки \`switchMap\`/\`mergeMap\` переживут уничтожение компонента.
- **Поток завершается, а не падает** — сработают \`complete\`-колбэки и \`finalize\`. Если в \`complete\` у вас «сохранить черновик» или «показать сообщение», это случится и при уходе со страницы.
- **В сервисе \`providedIn: 'root'\`** отписка наступит только при уничтожении приложения — для подписок, которые должны жить с экраном, сервис нужно предоставлять на уровне компонента или маршрута.
- **Он не заменяет \`async\` pipe и \`toSignal\`** — если значение просто выводится в шаблон, они проще и сами отписываются.
- **Ручной \`destroy$\` с одним \`complete()\`** — классический баг старого паттерна: \`takeUntil\` ждёт значение, а не завершение.
- **Внутренности:** внутри не \`Subject\`, а обычный Observable поверх \`DestroyRef.onDestroy\`, поэтому колбэк регистрируется на каждую подписку и снимается, когда поток завершился сам.

**Плюсы:** ноль шаблонного кода; невозможно забыть \`ngOnDestroy\`; работает в компонентах, директивах, сервисах и функциях с injection context; безопасен для уже уничтоженного владельца.
**Минусы:** привязан к injection context (вне его нужен явный \`DestroyRef\`); легко поставить не последним в \`pipe\`; в root-сервисах фактически не отписывает.

## Как это спрашивают на собеседовании

**Главный вывод:** \`takeUntilDestroyed\` — это \`takeUntil\` по уведомлению от \`DestroyRef\`: без аргумента работает только в injection context, в методах нужен явный \`DestroyRef\`, и ставить его нужно последним в \`pipe\`.

Типичные формулировки: «Как вы отписываетесь в Angular?», «Чем \`takeUntilDestroyed\` лучше \`takeUntil\` + Subject?», «Почему \`takeUntilDestroyed()\` падает в \`ngOnInit\`?».

Что могут спросить следом:

- *Как он устроен?* — Создаёт Observable, который выдаёт значение в колбэке \`DestroyRef.onDestroy\`, и применяет \`takeUntil\`.
- *Работает ли он в сервисе?* — Да, но отписка наступит при уничтожении injector-а сервиса; для root — при уничтожении приложения.
- *Почему именно последним?* — \`takeUntil\` завершает только то, что выше; внутренние подписки higher-order операторов ниже него не отменятся.
- *Как сделать то же без RxJS?* — \`inject(DestroyRef).onDestroy(() => ...)\` — тот же механизм вручную.
- *Что лучше для шаблона?* — \`async\` pipe или \`toSignal\`, они отписываются сами.

### Ответ на 1 минуту

> \`takeUntilDestroyed\` — оператор из \`@angular/core/rxjs-interop\`, он появился в Angular 16 и стабилен с 19-й версии. Он завершает поток, когда уничтожается владелец — компонент, директива или injector сервиса. Под капотом он берёт \`DestroyRef\`, создаёт Observable, который выдаёт значение в колбэке \`onDestroy\`, и применяет обычный \`takeUntil\`; если поток завершился раньше, колбэк снимается. Без аргумента он вызывает \`inject\`, поэтому работает только в injection context — в конструкторе или инициализаторе поля; в \`ngOnInit\` будет ошибка NG0203, и там я передаю \`DestroyRef\`, полученный заранее в поле. Лучше ручного \`destroy$\` тем, что нет ни поля, ни \`ngOnDestroy\`, ни шанса забыть \`next\`. Нюансы: ставлю его последним в \`pipe\`, иначе внутренние подписки \`switchMap\` переживут компонент, а в root-сервисе он отпишет только при уничтожении приложения.`,
      en: `## In short

\`takeUntilDestroyed\` (from \`@angular/core/rxjs-interop\`, Angular 16+) is an operator that **unsubscribes for you** when a component, directive, or service is destroyed. It does exactly what you used to hand-roll with a \`destroy$\` Subject and \`ngOnDestroy\` — minus every line of ceremony.

Analogy: you used to stick a **"turn off the lights when you leave" note** on the door and hope you would remember. \`takeUntilDestroyed\` is a **motion sensor**: the lights go out by themselves, because it is wired to the building (\`DestroyRef\`) rather than to your memory.

## How it works, step by step

1. Angular keeps a \`DestroyRef\` for every "owner" — component, directive, or service.
2. \`DestroyRef.onDestroy(cb)\` lets you register a callback invoked when that owner is destroyed.
3. Inside \`takeUntilDestroyed\` a \`Subject\` is created that emits in exactly that callback.
4. Then ordinary \`takeUntil\` logic is applied against that Subject.
5. The owner is destroyed → the Subject emits → the stream completes → every teardown and \`finalize\` fires.

## Two calling modes

- **In an injection context** (field initialiser, constructor) — **no argument needed**; \`DestroyRef\` is taken from the context automatically.
- **Outside an injection context** (in \`ngOnInit\` and other methods) — you must obtain \`DestroyRef\` **in advance** via \`inject(DestroyRef)\` in a field and pass it explicitly.

## Example

\`\`\`ts
export class MyComponent {
  private destroyRef = inject(DestroyRef);

  // 1. In an injection context — no argument
  data$ = this.service.stream$.pipe(takeUntilDestroyed());

  // 2. In a method — pass DestroyRef explicitly
  ngOnInit() {
    this.service.stream$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.handle(v));
  }
}
\`\`\`

Why: a field initialiser runs in an injection context, \`ngOnInit\` does not. Calling \`takeUntilDestroyed()\` with no argument inside a method throws — and that is the single most common mistake when adopting it.

## What to say in the interview

> \`takeUntilDestroyed\` is an operator from \`@angular/core/rxjs-interop\`, available since Angular 16, that automatically unsubscribes a stream when a component, directive, or service is destroyed, using \`DestroyRef\`. Under the hood \`DestroyRef.onDestroy\` registers a callback fired when the owner is destroyed, the operator creates a Subject that emits in that callback, and applies ordinary \`takeUntil\` logic against it. It works in two modes: called in an injection context — a field initialiser or constructor — it picks up \`DestroyRef\` itself; in a method like \`ngOnInit\` there is no injection context, so you must obtain \`DestroyRef\` in advance and pass it explicitly. It beats the manual approach because there is no \`destroy$\` field and no \`ngOnDestroy\` to forget, and because it works outside components, in services and directives. The same caveat as \`takeUntil\` applies: put it last in the pipe, otherwise downstream operators — especially higher-order ones — can outlive the unsubscription.

## Gotchas

- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** — "not in an injection context" error. The most common one.
- **Not last in the pipe** — \`switchMap\`'s inner subscriptions outlive the component's destruction.
- **In a \`providedIn: 'root'\` service** — such a service lives for the app's lifetime, so destruction never comes; this only helps for component-scoped services.
- **Expecting it to replace the \`async\` pipe** — it does not; \`async\` is still preferable when the value simply renders in the template.
- **\`inject(DestroyRef)\` inside a method** — that throws too: injection must happen during field initialisation.
- **Follow-up question**: how do you do the same without RxJS? Call \`destroyRef.onDestroy(() => ...)\` directly — the same mechanism, done by hand.`
    }
  },
  {
    id: 'rxjs-030',
    category: 'rxjs',
    level: 'Expert',
    tags: ['async-pipe', 'change-detection', 'internals'],
    question: {
      ru: 'Как async pipe работает под капотом и как он взаимодействует с change detection?',
      en: 'How does the async pipe work under the hood and how does it interact with change detection?'
    },
    answer: {
      ru: `## В чём суть

\`AsyncPipe\` делает четыре вещи: **подписывается** на Observable или Promise, отдаёт в шаблон **последнее значение**, на каждое новое значение **помечает компонент для проверки** через \`markForCheck()\` и **сам отписывается** — при уничтожении компонента или когда в него передали другой поток. Именно \`markForCheck\` связывает его с change detection: благодаря ему шаблон обновляется и при \`OnPush\`, и без Zone.js.

Аналогия: async pipe — **личный секретарь шаблона**. Он оформил подписку на рассылку за вас, кладёт свежий выпуск на стол, стучит в дверь («есть новости, посмотрите!») и, когда вы съезжаете из кабинета, сам отменяет подписку. Стук в дверь — это \`markForCheck\`: секретарь не читает вам газету вслух, он только сообщает, что на столе есть новое.

**Какую проблему решает.** Ручная подписка в компоненте — это поле для значения, \`subscribe\` в \`ngOnInit\`, отписка в \`ngOnDestroy\` и, при \`OnPush\`, ручной вызов \`markForCheck()\`, иначе шаблон не увидит новое значение. Забыли отписку — утечка, забыли \`markForCheck\` — «данные пришли, а экран не обновился». Async pipe закрывает всё это одним словом в шаблоне.

## Словарик терминов

- **Pipe (пайп)** — функция преобразования в шаблоне: \`{{ value | pipeName }}\`. Angular вызывает её метод \`transform(value)\`.
- **Чистый / нечистый пайп (pure / impure)** — чистый вызывается только когда изменился вход по ссылке; нечистый (\`pure: false\`) — на **каждой** проверке шаблона. \`AsyncPipe\` — нечистый.
- **Change detection (CD, проверка изменений)** — проход Angular по дереву компонентов: пересчитать выражения шаблона и обновить DOM там, где значения изменились.
- **View (представление)** — внутренняя структура Angular для шаблона одного компонента; у неё есть флаги, например «грязная» (Dirty).
- **\`ChangeDetectionStrategy.OnPush\`** — компонент проверяется не на каждом проходе, а только если он помечен грязным: изменился \`@Input\` по ссылке, произошло событие в его шаблоне, был вызван \`markForCheck\` или изменился прочитанный в шаблоне сигнал.
- **\`ChangeDetectorRef\`** — объект для ручного управления проверкой компонента.
- **\`markForCheck()\`** — помечает view компонента и всех предков до корня грязными и сообщает планировщику, что нужна проверка. Сама проверка произойдёт позже.
- **\`detectChanges()\`** — синхронно, прямо сейчас, проверяет этот компонент и его детей.
- **Zone.js / zoneless** — Zone.js перехватывает все асинхронные операции и запускает CD после каждой; в zoneless-режиме CD запускается только по явным сигналам: \`markForCheck\`, изменение сигнала, событие в шаблоне.
- **\`ErrorHandler\`** — глобальный обработчик ошибок Angular, куда попадают необработанные ошибки.
- **\`untracked\`** — выполнить код, не регистрируя прочитанные сигналы как зависимости.

## Как это работает под капотом

По исходнику Angular 21 (\`@angular/common\`, класс \`AsyncPipe\`):

1. Пайп объявлен с \`pure: false\`, поэтому Angular вызывает \`transform(obj)\` **при каждой проверке** view, где он используется.
2. Первый вызов с объектом: пайп выбирает стратегию — для Promise вызывает \`then\`, для всего, у чего есть \`subscribe\`, вызывает \`subscribe\`. Подписка делается внутри \`untracked\`, чтобы не создать случайных зависимостей от сигналов.
3. Во время этого первого \`subscribe\` внутренний флаг запрещает \`markForCheck\`: синхронное значение (\`BehaviorSubject\`, \`of\`) просто сохраняется и сразу возвращается из \`transform\`.
4. Пока значений нет, \`transform\` возвращает \`null\` — поэтому тип результата \`T | null\`.
5. Пришло новое значение асинхронно → пайп проверяет, что оно от текущего потока, сохраняет его и вызывает \`ChangeDetectorRef.markForCheck()\`.
6. \`markForCheck\` помечает view компонента и всех предков грязными и уведомляет планировщик change detection. В zoneless-режиме именно это уведомление и запускает проверку.
7. На ближайшем проходе Angular заходит в помеченные \`OnPush\`-компоненты, вызывает \`transform\` — тот видит тот же поток и возвращает сохранённое значение — и обновляет DOM.
8. Если в \`transform\` пришёл **другой** объект (по ссылке), пайп отписывается от старого, сбрасывает значение в \`null\` и подписывается на новый.
9. Ошибка потока передаётся в \`ErrorHandler\` приложения. Подписка после ошибки мертва, последнее значение остаётся на экране.
10. \`ngOnDestroy\` пайпа (вместе с компонентом) → отписка. У Promise отписка просто «забывает» колбэки: отменить сам Promise нельзя.

Упрощённая реализация, которая повторяет поведение для Observable:

\`\`\`ts
@Pipe({ name: 'simpleAsync', pure: false })
export class SimpleAsyncPipe implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private errorHandler = inject(ErrorHandler);
  private latest: unknown = null;
  private obj: Observable<unknown> | null = null;
  private sub: Subscription | null = null;
  private subscribing = false;

  transform(obj: Observable<unknown> | null) {
    if (obj !== this.obj) {                       // новая ссылка — переподписка
      this.dispose();
      if (obj) {
        this.obj = obj;
        this.subscribing = true;
        this.sub = obj.subscribe({
          next: v => {
            this.latest = v;
            if (!this.subscribing) this.cdr.markForCheck(); // «есть новости»
          },
          error: e => this.errorHandler.handleError(e),
        });
        this.subscribing = false;
      }
    }
    return this.latest;
  }

  ngOnDestroy() { this.dispose(); }

  private dispose() {
    this.sub?.unsubscribe();
    this.sub = this.obj = null;
    this.latest = null;
  }
}
\`\`\`

### Пример 1. OnPush + async: что происходит на каждом шаге

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: '<span>{{ count$ | async }}</span>'
})
export class CounterComponent {
  readonly count$ = inject(CounterStore).count$; // Subject, поле, а не вызов метода
}
// первый рендер:                 ""   ← transform вернул null
// count$.next(1), после CD:      "1"
// count$.next(2), сразу же:      "1"  ← markForCheck только пометил, DOM ещё старый
// после прохода CD:              "2"
\`\`\`

Значение не попадает в DOM в момент \`next\`. Пайп лишь сохраняет его и «стучит в дверь»; DOM обновляет следующий проход change detection.

### markForCheck и detectChanges

Без async pipe в \`OnPush\`-компоненте обновление из \`subscribe\` не видно:

\`\`\`ts
@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '{{ value }}' })
export class ManualComponent {
  value = 'init';
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    src$.subscribe(v => {
      this.value = v;
      // без строки ниже на экране навсегда останется "init"
      this.cdr.markForCheck();
    });
  }
}
// src$.next('new') → сразу после next: "init", после прохода CD: "new"
// с this.cdr.detectChanges() вместо markForCheck: "new" сразу, синхронно
\`\`\`

\`markForCheck()\` — «проверьте меня при ближайшем проходе»: дёшево, безопасно, отмечает всю ветку до корня. \`detectChanges()\` — «проверьте меня прямо сейчас»: синхронный локальный проход по компоненту и детям, полезен в редких случаях вроде обновления до измерения DOM, но легко приводит к лишним проверкам. Async pipe использует первый.

### Пример 2. Синхронный источник виден сразу

\`\`\`ts
@Component({ imports: [AsyncPipe], template: '{{ name$ | async }}' })
export class NameComponent {
  readonly name$ = new BehaviorSubject('Ann');
}
// первый рендер: "Ann"
\`\`\`

\`BehaviorSubject\` выдаёт значение прямо внутри \`subscribe\`, а пайп в этот момент просто возвращает его из \`transform\`, без \`markForCheck\`. Поэтому нет ни мигания \`null\`, ни ошибки \`ExpressionChangedAfterItHasBeenChecked\`.

### Пример 3. Вызов метода в шаблоне: бесконечная переподписка

\`\`\`ts
@Component({ imports: [AsyncPipe], template: '[{{ load() | async }}]' })
export class BadComponent {
  private http = inject(HttpClient);
  load() { return this.http.get<string>('/api/users'); } // каждый вызов — новый Observable
}
// проверено на аналоге с таймером 5 мс вместо HTTP (dev-режим):
// после первого рендера: 2 запроса, на экране "[]"
// через 50 мс:          больше десятка запросов, на экране всё ещё "[]"
\`\`\`

Каждая проверка вызывает \`load()\` и получает **новую** ссылку. Пайп отписывается от старой (запрос отменяется, значение сбрасывается в \`null\`) и подписывается на новую. Ответ вызывает \`markForCheck\` → новая проверка → новый запрос — цикл замыкается, данных на экране нет. В dev-режиме вызовов вдвое больше: Angular делает дополнительный проверочный проход. Решение — поток в поле или сигнал.

### Пример 4. Несколько async на один поток

\`\`\`ts
@Component({
  imports: [AsyncPipe],
  template: \`
    {{ (user$ | async)?.name }} {{ (user$ | async)?.email }}
  \`
})
export class ProfileComponent {
  readonly user$ = inject(HttpClient).get<User>('/api/me');
}
// 2 HTTP-запроса: каждый | async — отдельная подписка на холодный поток
\`\`\`

Лечится одной подпиской на шаблон:

\`\`\`html
@if (user$ | async; as user) {
  {{ user.name }} {{ user.email }}   <!-- 1 подписка -->
}

@let count = count$ | async;
count={{ count }} again={{ count }}  <!-- 1 подписка, и 0 не прячется -->
\`\`\`

\`@if (...; as x)\` скрывает блок для «ложных» значений: \`0\`, \`''\`, \`false\` уйдут в \`@else\` — проверено. \`@let\` (Angular 18.1+) не имеет этой проблемы. Если поток нужен в нескольких компонентах — \`shareReplay({ bufferSize: 1, refCount: true })\` в сервисе.

### Пример 5. Ошибка в потоке

\`\`\`ts
// шаблон: 'v={{ v$ | async }}'
v$.next('ok');                  // на экране: v=ok
v$.error(new Error('HTTP 500')); // ErrorHandler: HTTP 500, на экране всё ещё v=ok
\`\`\`

Пайп не умеет показывать ошибки: он отдаёт её в \`ErrorHandler\`, подписка умирает, шаблон «замирает» на последнем значении. Поэтому ошибку превращают в значение до пайпа: \`catchError(() => of({ error: true }))\` или view-model \`{ loading, data, error }\`.

### Пример 6. Смена ссылки и Promise

\`\`\`ts
// шаблон: '{{ source() | async }}', source = signal(a$)
// a$ = BehaviorSubject('A1'), b$ = BehaviorSubject('B1')
// первый рендер: "A1", a$.observed = true
source.set(b$);
// после CD: "B1", a$.observed = false, b$.observed = true

// Promise: '{{ promise | async }}'
// сразу: "", после resolve: "resolved"
\`\`\`

При смене ссылки пайп аккуратно переподписывается — старая подписка закрыта. Promise поддерживается, но отменить его нельзя: при уничтожении компонента пайп просто перестанет реагировать на результат.

### async pipe и сигналы

\`toSignal(obs$)\` решает ту же задачу другим способом: подписка живёт в классе, а шаблон читает сигнал \`value()\`. Разница в механике обновления. Async pipe через \`markForCheck\` помечает грязными компонент **и всех предков**, и все они перепроверяются. Сигнал, прочитанный в шаблоне, помечает для обновления **только этот** view, а предков лишь отмечает как путь, по которому нужно пройти (так работает с Angular 17). Оба варианта работают в zoneless. Сигналы точнее и удобнее в \`computed\`, async pipe проще, когда поток нужен только шаблону.

### Где это применяется на практике

- **Данные из store или сервиса в шаблоне** — \`@if (vm$ | async; as vm)\` для view-model страницы.
- **OnPush-компоненты в больших таблицах и дашбордах** — обновляется только то, что пометил пайп, без ручных \`markForCheck\`.
- **Zoneless-приложения** — async pipe продолжает работать, потому что опирается на \`markForCheck\`, а не на Zone.js.
- **Потоки маршрута** — \`route.paramMap | async\` с автоматической отпиской при уходе со страницы.
- **Ленивые блоки** — пайп подписывается, только когда блок \`@if\` реально отрисован, и отписывается, когда блок исчез.

## Важные нюансы и подводные камни

- **Несколько \`| async\` на один холодный поток** — несколько подписок и, для HTTP, несколько запросов. Лечится \`@if (... ; as x)\`, \`@let\` или \`shareReplay\`.
- **Вызов метода в шаблоне** (\`getData() | async\`) — новый Observable на каждую проверку, бесконечная переподписка и повторные запросы.
- **Начальное значение — \`null\`**, а не \`undefined\`: тип \`T | null\`, в строгих шаблонах нужны \`?.\` или \`@if\`.
- **\`@if (x$ | async; as x)\` прячет \`0\`, \`''\` и \`false\`** — используйте \`@let\` или оборачивайте в объект.
- **Ждать значения в \`ngOnInit\`** — пайп живёт в шаблоне, в коде класса значения нет.
- **\`| async\` вместе с ручным \`subscribe\`** на том же потоке — две подписки и двойная работа.
- **Ошибка в потоке** уходит в \`ErrorHandler\`, подписка умирает, шаблон замирает. Ставьте \`catchError\` до пайпа.
- **Promise не отменяется** — при уходе со страницы запрос через \`fetch\` всё равно завершится.
- **\`markForCheck\` помечает всю ветку до корня** — частые эмиссии (десятки в секунду) в глубоко вложенном компоненте перепроверяют всех предков; для таких потоков используйте \`throttleTime\`/\`auditTime\` или сигналы.

**Плюсы:** автоматическая подписка и отписка; корректная работа с \`OnPush\` и zoneless без ручного \`markForCheck\`; аккуратная переподписка при смене потока; поддержка Promise.
**Минусы:** каждая запись \`| async\` — отдельная подписка; \`null\` в начале; не обрабатывает ошибки; помечает всех предков, а не только свой компонент; значение недоступно в коде класса.

## Как это спрашивают на собеседовании

**Главный вывод:** async pipe — нечистый пайп, который хранит подписку и последнее значение, на каждое асинхронное значение вызывает \`markForCheck()\` и отписывается при уничтожении или смене ссылки. Именно \`markForCheck\` заставляет \`OnPush\` и zoneless-режим увидеть новое значение.

Типичные формулировки: «Как async pipe работает с OnPush?», «Почему данные пришли, а экран не обновился?», «Зачем async pipe нечистый?».

Что могут спросить следом:

- *Почему он \`pure: false\`?* — Новое значение приходит без смены входа, поэтому \`transform\` должен вызываться на каждой проверке.
- *Чем \`markForCheck\` отличается от \`detectChanges\`?* — Первый только помечает ветку и планирует проверку, второй синхронно проверяет компонент прямо сейчас.
- *Что будет при \`getData() | async\`?* — Новая ссылка на каждой проверке, переподписка и повторные запросы по кругу.
- *Что будет с ошибкой?* — Она уйдёт в \`ErrorHandler\`, подписка умрёт, на экране останется последнее значение.
- *Чем он отличается от \`toSignal\`?* — Async pipe помечает грязными компонент и предков, сигнал помечает для обновления только свой view; в zoneless работают оба.

### Ответ на 1 минуту

> \`AsyncPipe\` — нечистый пайп: Angular вызывает его \`transform\` на каждой проверке шаблона. При первом вызове он подписывается на Observable или Promise и возвращает последнее значение, пока его нет — \`null\`. Когда приходит новое значение, пайп сохраняет его и вызывает \`ChangeDetectorRef.markForCheck()\`: это помечает компонент и всех предков грязными и сообщает планировщику, что нужна проверка. Поэтому шаблон обновляется и при \`OnPush\`, и в zoneless-режиме без ручного \`detectChanges\`. Если в пайп передали другой поток по ссылке, он отписывается от старого и подписывается на новый, а при уничтожении компонента отписывается сам. Подводные камни: несколько \`| async\` на холодный поток — несколько запросов, лечу через \`@if\` с \`as\`, \`@let\` или \`shareReplay\`; вызов метода в шаблоне даёт бесконечную переподписку; ошибка уходит в \`ErrorHandler\` и замораживает шаблон, поэтому \`catchError\` ставлю до пайпа.`,
      en: `## In short

\`AsyncPipe\` does three things: it **subscribes** to an Observable (or Promise), hands the **latest value** to the template, and **unsubscribes itself** when the host is destroyed. Plus it nudges change detection on every emission.

Analogy: the async pipe is the **template's personal secretary**. It took out the subscription on your behalf, puts each fresh issue on your desk, knocks on the door ("news, take a look!"), and cancels the subscription itself when you move out of the office.

## How it works, step by step

1. Angular calls the pipe's \`transform(obs$)\` on every check.
2. The pipe compares the passed Observable with the **previous** one. Same reference — nothing happens.
3. A different one — it **unsubscribes from the old** and subscribes to the new.
4. A \`next\` arrives → the value is stored in an internal field.
5. The pipe calls \`ChangeDetectorRef.markForCheck()\` — marking the component and all its ancestors dirty.
6. On the next CD cycle Angular re-reads \`transform\`, which returns the stored value.
7. The pipe's \`ngOnDestroy\` → \`unsubscribe\`. A leak is impossible.

## Why markForCheck is the crux

Under **OnPush** a component is not checked every tick — only when it is marked dirty. The async pipe marks it on **every new emission**, so the template updates without a manual \`detectChanges()\`. That is also why the async pipe works fine in **zoneless** mode: it relies on \`markForCheck\`, not on Zone.js.

## Example

\`\`\`ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span>{{ count$ | async }}</span>'
})
export class CounterComponent {
  readonly count$ = this.store.count$; // a field, not a method call!
}
\`\`\`

Why: the stream lives **in a field**. Had the template said \`{{ service.getCount() | async }}\`, every CD cycle would build a **new** Observable, the pipe would see a new reference, and it would resubscribe endlessly.

## What to say in the interview

> \`AsyncPipe\` subscribes to an Observable or Promise, returns the latest emitted value to the template, and automatically unsubscribes when the host is destroyed, which removes an entire class of leaks. Under the hood its \`transform\` compares the passed Observable with the previous one and resubscribes if the reference changed; on every \`next\` it stores the value and calls \`ChangeDetectorRef.markForCheck\`, marking the component and its ancestors dirty. That is the key to change detection: under OnPush a component is only checked when marked dirty, and it is the async pipe that marks it on every emission — so the template updates without a manual \`detectChanges\`, and it works correctly in zoneless mode since it relies on \`markForCheck\` rather than Zone.js. As for pitfalls: several \`| async\` bindings on one stream means several subscriptions and, for a cold source, several HTTP requests, fixed with \`shareReplay\` or an \`@if (data$ | async; as data)\` block. The Signals alternative is \`toSignal\`.

## Gotchas

- **Several \`| async\` on one cold stream** = several HTTP requests. Fix with \`shareReplay\` or \`@if (data$ | async; as data)\`.
- **A method call in the template** (\`obj.getData() | async\`) — a new Observable per CD cycle, endless resubscription.
- **Expecting the value in \`ngOnInit\`** — the async pipe lives in the template; the value does not exist in code.
- **\`| async\` alongside a manual \`subscribe\`** on the same stream — two subscriptions and double the work.
- **An error in the stream** falls through to the \`ErrorHandler\` and kills the pipe's subscription — the template freezes. Put \`catchError\` before the pipe.
- **Follow-up question**: how does it differ from \`toSignal\`? The async pipe marks the component dirty via \`markForCheck\`, while \`toSignal\` plugs into the signal graph; both work in zoneless mode.`
    }
  },
  {
    id: 'rxjs-031',
    category: 'rxjs',
    level: 'Medium',
    tags: ['signals', 'rxjs', 'when-to-use'],
    question: {
      ru: 'Когда выбирать Signals, а когда RxJS? Где граница ответственности?',
      en: 'When should you choose Signals versus RxJS? Where is the boundary of responsibility?'
    },
    answer: {
      ru: `## В чём суть

Правило в одну строку: **состояние — в Signals, события и асинхронность во времени — в RxJS**. Signals отвечают на вопрос «что есть прямо сейчас»: значение всегда доступно синхронно, а зависимости Angular отслеживает сам. RxJS отвечает на вопрос «что происходит во времени»: значения приходят последовательно, их можно задерживать, отменять, комбинировать. Граница проходит там, где поток событий превращается в текущее значение для шаблона, — через \`toSignal\` и \`toObservable\`.

Аналогия: Signal — **термометр на стене**: посмотрел и узнал температуру сейчас, история не важна. Observable — **лента показаний метеостанции**: события идут потоком, их можно фильтровать, усреднять за минуту, прерывать, если станция больше не нужна.

**Какую проблему решает.** С появлением сигналов у Angular-разработчика два инструмента, и без чёткой границы получается каша. Одни команды держат каждый булев флаг в \`BehaviorSubject\` и обвешивают шаблон \`async\`. Другие пытаются всё сделать на сигналах и пишут \`effect\` с \`fetch\` внутри — и получают гонки запросов, которые RxJS решает одним \`switchMap\`. Ясное разделение даёт меньше кода, меньше багов и готовность к zoneless-режиму.

## Словарик терминов

- **Signal (сигнал)** — обёртка над значением, которую читают вызовом: \`count()\`. При чтении в шаблоне, \`computed\` или \`effect\` Angular запоминает зависимость.
- **\`signal(v)\`** — записываемый сигнал: \`set(v)\`, \`update(fn)\`.
- **\`computed(fn)\`** — производный сигнал только для чтения; пересчитывается лениво и кэширует результат.
- **\`effect(fn)\`** — побочное действие, которое Angular перезапускает после изменения прочитанных сигналов; выполняется по расписанию, а не сразу.
- **\`linkedSignal\`** — записываемый сигнал, который сбрасывается к вычисленному значению, когда меняется его источник.
- **Push / pull** — значения «толкают» подписчику (RxJS) или потребитель «берёт» текущее значение, когда нужно. Сигналы — push-pull: уведомление «я устарел» рассылается сразу, а пересчёт происходит при чтении.
- **Глитч (glitch)** — кратковременное несогласованное промежуточное значение, когда производная величина посчитана от наполовину обновлённых данных. Классический случай — «ромб» зависимостей.
- **Отмена (cancellation)** — прекращение устаревшей операции, например HTTP-запроса, когда пришла новая команда.
- **\`toSignal\` / \`toObservable\`** — мосты из \`@angular/core/rxjs-interop\`: Observable → сигнал и сигнал → Observable.
- **\`resource\` / \`rxResource\` / \`httpResource\`** — сигнальные API для асинхронной загрузки данных; в Angular 21 помечены \`@experimental\`.
- **Zoneless** — режим Angular без Zone.js, где проверка изменений запускается сигналами и \`markForCheck\`.

## Как это работает под капотом

Чтобы понять, где граница, сравним механику:

1. **Сигнал хранит значение и версию.** \`set\` меняет значение, увеличивает версию и рассылает зависимым уведомление «вы устарели». Сами \`computed\` при этом **не пересчитываются**.
2. **\`computed\` пересчитывается при чтении** и только если версии его зависимостей изменились. Поэтому он ленивый, кэширует результат и никогда не видит полуобновлённое состояние — глитчей нет.
3. **У сигнала нет истории и времени.** Три \`set\` подряд до ближайшего запуска \`effect\` — эффект увидит только последнее значение. Для состояния это идеально, для событий («каждый клик важен») — нет.
4. **Observable — это функция, которая выдаёт последовательность.** Каждое значение синхронно проходит через всю цепочку операторов, и каждый оператор видит **каждое** значение по порядку. Поэтому можно выразить время (\`debounceTime\`), отмену (\`switchMap\` отписывается от старого запроса), очередь (\`concatMap\`), повтор (\`retry\`).
5. **Обратная сторона push** — \`combineLatest\` выдаёт новую комбинацию на каждое входящее значение, включая промежуточные несогласованные.
6. **Отсюда проверочный вопрос:** есть ли здесь время, последовательность событий или отмена? Да — RxJS. Нужно просто текущее значение и производные от него — Signals.

### Пример 1. Состояние на сигналах: computed ленивый и кэшируемый

\`\`\`ts
const a = signal(1);
let runs = 0;
const double = computed(() => { runs++; return a() * 2; });

console.log(runs);          // 0  — ещё никто не читал
double(); double(); double();
console.log(runs);          // 1  — посчитал один раз, дальше кэш
a.set(5); a.set(6); a.set(7);
console.log(runs);          // 1  — set не пересчитывает
console.log(double(), runs); // 14 2 — пересчёт при чтении, один раз
\`\`\`

Это идеальная модель для UI-состояния: выбранная вкладка, флаги, фильтры, производные вроде «отфильтрованный список» и «итого».

### Пример 2. Ромб зависимостей: глитч в RxJS, нет глитча в Signals

\`\`\`ts
// RxJS
const price$ = new BehaviorSubject(100);
const tax$ = price$.pipe(map(p => p * 0.2));
combineLatest([price$, tax$]).pipe(map(([p, t]) => p + t))
  .subscribe(t => console.log('total', t));
price$.next(200);
// total 120
// total 220   ← глитч: новая цена со старым налогом
// total 240

// Signals
const price = signal(100);
const tax = computed(() => price() * 0.2);
const total = computed(() => price() + tax());
console.log(total()); // 120
price.set(200);
console.log(total()); // 240 — промежуточного 220 не существует
\`\`\`

\`combineLatest\` получил новое значение \`price$\` раньше, чем пересчитался \`tax$\`, и честно выдал комбинацию. \`computed\` пересчитывается при чтении, когда все зависимости уже согласованы.

### Пример 3. Время и отмена — территория RxJS

Попытка сделать поиск на \`effect\`:

\`\`\`ts
// ❌ effect + fetch: гонка ответов
effect(() => {
  const q = query();
  if (!q) return;
  fetchResults(q).then(r => results.set(r)); // нет отмены
});
query.set('an');   // медленный ответ, 300 мс
query.set('ang');  // через 50 мс, быстрый ответ, 100 мс
// через 200 мс: results() = 'ang results'
// через 400 мс: results() = 'an results'  ← старый ответ перетёр новый
\`\`\`

На RxJS та же задача решается декларативно, без гонок:

\`\`\`ts
// ✅ время и отмена в RxJS, результат — сигналом
readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))  // старый запрос отменяется
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Это и есть самый ходовой паттерн: ввод хранится сигналом (это состояние), debounce и отмена — в RxJS (это время), результат снова сигнал (его читает шаблон).

### Пример 4. computed вместо effect для производных значений

\`\`\`ts
const first = signal('Ann');
const last = signal('Lee');

const fullName = computed(() => first() + ' ' + last()); // ✅
const fullNameCopy = signal('');
effect(() => fullNameCopy.set(first() + ' ' + last()));  // ❌

first.set('Bob');
console.log(fullName(), '|', fullNameCopy());
// Bob Lee | Ann Lee   ← копия устарела, пока эффект не запустился
\`\`\`

\`effect\` выполняется позже, по расписанию Angular, поэтому между изменением и его запуском состояние рассогласовано. \`effect\` нужен для выхода во внешний мир: логирование, \`localStorage\`, синхронизация с не-Angular библиотекой, отрисовка на canvas.

### linkedSignal — производное, но редактируемое состояние

\`\`\`ts
const options = signal(['a', 'b']);
const selected = linkedSignal(() => options()[0]); // по умолчанию первый вариант

selected.set('b');
console.log(selected());     // b — пользователь выбрал сам
options.set(['x', 'y']);
console.log(selected());     // x — список сменился, выбор сброшен
\`\`\`

Раньше такое делали через \`BehaviorSubject\` и подписку на список; теперь это одна строка без RxJS. Стабилен с Angular 20.

### resource и rxResource — асинхронная загрузка в мире сигналов

\`\`\`ts
const userId = signal(1);
const user = rxResource({
  params: () => ({ id: userId() }),
  stream: ({ params }) => this.http.get<User>(\`/api/users/\${params.id}\`),
});
// сразу:           status 'loading', value undefined, isLoading true
// после ответа:    status 'resolved', value { id: 1, name: 'User 1' }
userId.set(2);
// сразу:           status 'loading', value undefined
// после ответа:    status 'resolved', value { id: 2, name: 'User 2' }
\`\`\`

Ресурс сам следит за сигналом-параметром, отменяет устаревшую загрузку и отдаёт \`value\`, \`status\`, \`error\`, \`isLoading\` как сигналы. Это удобная граница «сигнал → запрос → сигнал» без ручных мостов. Но в Angular 21 \`resource\`, \`rxResource\` и \`httpResource\` — \`@experimental\`: API ещё может поменяться, поэтому в критичном коде многие пока используют \`toSignal\` + RxJS.

### Как выбрать

- **Локальное состояние UI** (флаги, выбранная вкладка, открыта ли панель, значения фильтров) — \`signal\`.
- **Производные значения** (отфильтрованный список, итоги, «можно ли нажать кнопку») — \`computed\`.
- **Редактируемое значение по умолчанию от другого состояния** — \`linkedSignal\`.
- **Привязка к шаблону, особенно в OnPush и zoneless** — сигналы или \`toSignal\` на конце RxJS-конвейера.
- **HTTP, WebSocket, DOM-события, таймеры** — RxJS.
- **Координация во времени** (\`debounceTime\`, \`throttleTime\`, \`switchMap\`, \`concatMap\`, \`retry\`, \`combineLatest\` потоков событий) — RxJS.
- **Отмена устаревших операций и гонки запросов** — RxJS (\`switchMap\`, \`exhaustMap\`) или \`rxResource\`.
- **Побочные действия при изменении состояния** — \`effect\`, но не для вычисления других сигналов.

### Где это применяется на практике

- **Большой грид с фильтрами** — фильтры и сортировка в сигналах, запрос с \`debounceTime\` + \`switchMap\` в RxJS, строки обратно через \`toSignal\`, итоги через \`computed\`.
- **Формы** — состояние формы и производные «форма валидна», «есть изменения» в сигналах; автосохранение черновика через \`valueChanges\` + \`debounceTime\` + \`concatMap\`.
- **Дашборд с WebSocket** — поток котировок в RxJS (\`bufferTime\`, \`share\`), последняя цена для карточек — сигналом.
- **Глобальное состояние** — NgRx SignalStore или сервис с сигналами для данных, RxJS — для эффектов загрузки.
- **Миграция на zoneless** — переход шаблонов с \`async\` и ручных \`markForCheck\` на сигналы.

## Важные нюансы и подводные камни

- **Складывать всё в сигналы** — debounce, отмена и гонки запросов на сигналах не выражаются; \`effect\` с \`fetch\` внутри даёт гонку, где старый ответ перетирает новый.
- **Держать булев флаг в \`BehaviorSubject\`** ради «единообразия» — лишняя подписка и \`async\` там, где хватило бы \`signal(false)\`.
- **\`effect()\` вместо \`computed()\`** для производного значения — эффект выполняется позже, состояние временно рассогласовано, а логика становится императивной.
- **Думать, что Signals заменяют RxJS** — нет, они закрывают состояние; асинхронность и события во времени остаются за RxJS.
- **События — не состояние.** Сигнал хранит только последнее значение: два быстрых \`set\` до запуска эффекта — эффект увидит одно. Клики, сообщения сокета, команды — это потоки.
- **Мутация объекта на месте не видна.** \`items().push(3)\` не меняет ссылку, и \`computed\` не пересчитается; нужен новый объект: \`items.update(a => [...a, 3])\`.
- **Цепочка \`toObservable\` → \`toSignal\` без нужды** — если асинхронности нет, мост только добавляет задержку: \`toObservable\` эмитит асинхронно, через эффект. Используйте \`computed\`.
- **Экспериментальные API** — \`resource\`, \`rxResource\`, \`httpResource\` в Angular 21 помечены \`@experimental\`.
- **Почему Signals не глитчат, а \`combineLatest\` глитчит** — \`computed\` пересчитывается лениво при чтении, когда все зависимости уже обновлены, а push-модель RxJS отдаёт промежуточные комбинации сразу.

**Плюсы:** у каждого инструмента своя сильная сторона — сигналы дают простое синхронное состояние без подписок и глитчей, RxJS — мощную работу со временем и отменой; мосты позволяют совмещать их без ручных подписок.
**Минусы:** два ментальных подхода в одной кодовой базе; граница не всегда очевидна новичкам; часть сигнальных API для асинхронности пока экспериментальна.

## Как это спрашивают на собеседовании

**Главный вывод:** Signals — для текущего состояния и производных от него, RxJS — для событий, асинхронности, времени и отмены. Типичная архитектура: RxJS добывает и преобразует данные, на границе с шаблоном \`toSignal\`, а ввод пользователя в RxJS-конвейер подаётся через \`toObservable\`.

Типичные формулировки: «Когда вы используете Signals, а когда RxJS?», «Заменят ли сигналы RxJS?», «Как сделать debounce на сигналах?».

Что могут спросить следом:

- *Почему сигналы не глитчат?* — \`computed\` ленивый: пересчитывается при чтении, когда все зависимости согласованы.
- *Можно ли сделать поиск без RxJS?* — Можно через \`resource\`/\`rxResource\`, но debounce и сложная координация всё равно удобнее в RxJS.
- *Когда нужен \`effect\`?* — Только для побочных действий во внешнем мире, не для вычисления других сигналов.
- *Что делать с существующими \`BehaviorSubject\`?* — Читать через \`toSignal(..., { requireSync: true })\` и постепенно переводить простое состояние на \`signal\`.

### Ответ на 1 минуту

> Это два инструмента разной природы. Signals — модель синхронного состояния: значение есть всегда, зависимости отслеживаются автоматически, \`computed\` пересчитывается лениво при чтении, поэтому производные значения не глитчат. RxJS — модель событий во времени: каждое значение проходит через цепочку операторов, и можно выразить задержку, очередь, повтор и, главное, отмену. Поэтому сигналы я беру для локального состояния UI, производных через \`computed\` и привязки к шаблону, особенно в OnPush и zoneless. RxJS — для HTTP, WebSocket, таймеров и координации через \`debounceTime\`, \`switchMap\`, \`retry\`. Самый частый паттерн — ввод в сигнале, через \`toObservable\` в RxJS-конвейер, результат обратно через \`toSignal\`. Антипаттерны — \`effect\` с \`fetch\` внутри, который даёт гонки, \`effect\` вместо \`computed\` и булевы флаги в \`BehaviorSubject\`.`,
      en: `## In short

The rule in one line: **state goes in Signals, events and async go in RxJS**.

Signals answer "**what is true right now**": the value is always available synchronously, dependencies are tracked automatically — a pull model. RxJS answers "**what is happening over time**": values are pushed to the subscriber, with operators and cancellation — a push model.

Analogy: a Signal is a **thermometer on the wall**: glance at it and you know the temperature. An Observable is the **weather station's reading tape**: events arrive as a stream that you can filter, average, or cut off.

## When to use which

**Reach for Signals when:**

- it is local UI state: flags, the selected tab, form values;
- you need derived values via \`computed\`;
- you are binding state to the template, especially under zoneless and OnPush;
- the computation is simple and synchronous with no async at all.

**Reach for RxJS when:**

- there are async events: HTTP, WebSockets, DOM events, timers;
- you need coordination over time: \`debounceTime\`, \`switchMap\`, \`combineLatest\`, \`retry\`;
- you need to cancel stale operations — search, request races;
- you have complex stream transformation pipelines.

The test question: **is there a notion of time or cancellation here?** If yes, it is RxJS. If you just need "the current value", it is a Signal.

## Example

\`\`\`ts
readonly query = signal('');

readonly results = toSignal(
  toObservable(this.query).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.search(q))
  ),
  { initialValue: [] as Item[] }
);
\`\`\`

Why: this is the workhorse pattern — **RxJS fetches and transforms the data, a Signal consumes it in the template**. The input is a signal because it is state; debouncing and cancellation are RxJS because they are about time; the result is a signal again because the template reads it.

## What to say in the interview

> These are two tools of different natures. Signals are a model of synchronous state with automatic dependency tracking: the value always exists right now and is read on demand — a pull model. RxJS is a model of asynchronous events over time: values are pushed to the subscriber, with a rich operator set and, crucially, cancellation. Hence the division of responsibility: I use Signals for local UI state, derived values via \`computed\`, and template binding, especially with zoneless and OnPush; and RxJS for async events such as HTTP, WebSockets and timers, for time coordination through \`debounceTime\`, \`switchMap\`, \`combineLatest\` and \`retry\`, and for cancelling stale operations. The most common pattern is RxJS to fetch and transform, then \`toSignal\` for consumption in the template; \`toObservable\` works the other way. And one anti-pattern: do not try to debounce or switchMap on bare signals, since there is neither time nor cancellation there.

## Gotchas

- **Cramming everything into signals** — debouncing, cancellation, and request races cannot be expressed there; you get bugs instead of code.
- **Keeping a boolean flag in a \`BehaviorSubject\`** for "consistency" — an extra subscription and an \`async\` pipe where \`signal(false)\` would do.
- **\`effect()\` instead of \`computed()\`** for a derived value — an effect returns nothing and invites imperative writes into other signals.
- **Thinking Signals replace RxJS** — they do not; they cover state only, async stays with RxJS.
- **Chaining \`toObservable\` → \`toSignal\` needlessly** — with no async involved, the bridge only adds a tick of latency.
- **Follow-up question**: why do Signals not glitch while \`combineLatest\` does? The signal graph recomputes topologically and once, whereas the RxJS push model emits intermediate, inconsistent combinations.`
    }
  },
  {
    id: 'rxjs-032',
    category: 'rxjs',
    level: 'Expert',
    tags: ['observable', 'subscriber', 'internals'],
    question: {
      ru: 'Что происходит при вызове subscribe()? Опишите весь путь от Observable до Subscriber.',
      en: 'What happens when subscribe() is called? Describe the whole path from Observable to Subscriber.'
    },
    answer: {
      ru: `## В чём суть

\`subscribe()\` — момент, когда «рецепт» превращается в работающее выполнение. До него Observable — просто функция, которая ничего не делает. При подписке цепочка операторов **разворачивается от вас к источнику**: каждый оператор подписывается на предыдущий, а значения потом текут обратно — от источника к вам — через цепочку объектов \`Subscriber\`. Возвращённая \`Subscription\` — ручка, которая останавливает всю цепочку целиком.

Аналогия: цепочка \`pipe\` — это **вложенные коробки**. При \`subscribe\` вы открываете внешнюю, она открывает следующую, и так до самой маленькой — источника. Только когда открыта последняя, из неё начинают вылетать значения и идти наружу, по пути преобразуясь в каждой коробке. А \`unsubscribe\` захлопывает их все разом, начиная с самой внутренней.

**Какую проблему решает понимание.** Знание этого пути объясняет почти все «странности» RxJS: почему без \`subscribe\` ничего не происходит, почему две подписки — это два HTTP-запроса, почему \`of(1, 2)\` выдаёт значения синхронно ещё до возврата из \`subscribe\`, почему ошибка в \`map\` приходит в \`error\`, а ошибка в вашем колбэке \`next\` — нет, и почему самописный оператор может «течь». Это база для чтения стектрейсов и написания своих операторов.

## Словарик терминов

- **Observable** — объект с функцией-производителем внутри. Ленивый: функция запускается только при \`subscribe\`, и на каждый \`subscribe\` — заново.
- **Производитель (producer, subscribe-функция)** — функция, переданная в \`new Observable(subscriber => { ... })\`. Она вызывает \`subscriber.next/error/complete\` и может вернуть функцию очистки.
- **Observer** — простой объект с колбэками \`{ next, error, complete }\`, который вы передаёте в \`subscribe\`. Просто интерфейс, без логики.
- **\`Subscriber\`** — класс RxJS, наследник \`Subscription\`, реализующий Observer. Охраняет контракт потока и владеет функциями очистки.
- **\`SafeSubscriber\`** — \`Subscriber\`, в который RxJS оборачивает **ваш** Observer; ловит исключения в ваших колбэках.
- **\`OperatorSubscriber\`** — внутренний \`Subscriber\` оператора (\`map\`, \`filter\`), который выполняет логику оператора и передаёт результат дальше.
- **\`Subscription\`** — объект с методом \`unsubscribe()\` и флагом \`closed\`; хранит список функций очистки и дочерние подписки.
- **Teardown / финализатор** — функция очистки: остановить таймер, закрыть сокет, отменить XHR.
- **Грамматика \`next* (error|complete)?\`** — контракт Observable: сколько угодно \`next\`, затем не более одного \`error\` **или** \`complete\`, после чего — тишина.
- **Unicast** — каждая подписка получает своё независимое выполнение производителя.
- **\`lift\` / \`operate\`** — внутренний механизм RxJS 7: оператор создаёт новый Observable, который помнит \`source\` (предыдущий Observable) и \`operator\` (что сделать при подписке).
- **\`pipe\`** — композиция функций: \`src.pipe(a, b)\` — это просто \`b(a(src))\`. Ничего не запускает.

## Как это работает под капотом

Путь по исходнику RxJS 7.8 (\`Observable.js\`, \`Subscriber.js\`, \`OperatorSubscriber.js\`):

1. **\`pipe\` только собирает рецепт.** \`source$.pipe(map(f), filter(g))\` вызывает \`filter(g)(map(f)(source$))\`. Каждый оператор возвращает новый Observable с полями \`source\` (предыдущий) и \`operator\`. Ни одна функция пользователя ещё не выполнена.
2. **Нормализация Observer.** \`subscribe(observerOrNext)\` смотрит на аргумент: если это уже \`Subscriber\` (так операторы передают свои), он используется как есть; иначе ваш объект или функция оборачивается в \`SafeSubscriber\`.
3. **Разворачивание к источнику.** У Observable есть \`operator\` → вызывается \`operator.call(subscriber, source)\`. Оператор создаёт свой \`OperatorSubscriber\`, чьим «получателем» (destination) является ваш \`subscriber\`, и вызывает \`source.subscribe(operatorSubscriber)\`. Это рекурсия: тот же шаг повторяется для предыдущего оператора, пока не дойдём до источника.
4. **Связь подписок.** Конструктор \`OperatorSubscriber\` делает \`destination.add(this)\` — внутренняя подписка становится дочерней по отношению к внешней. Так строится дерево, по которому потом пойдёт \`unsubscribe\`.
5. **Запуск производителя.** У источника нет \`operator\` → вызывается \`_trySubscribe\`: он выполняет вашу функцию из \`new Observable(...)\` в \`try/catch\`. Синхронное исключение внутри неё превращается в \`subscriber.error(err)\`.
6. **Регистрация очистки.** То, что вернул производитель (функция или \`Subscription\`), добавляется через \`subscriber.add(teardown)\`. Если к этому моменту подписка уже закрыта (источник успел синхронно завершиться), \`add\` выполняет teardown **сразу**.
7. **Поток значений.** Производитель вызывает \`subscriber.next(v)\` → \`OperatorSubscriber\` выполняет логику оператора в \`try/catch\` (ошибка → \`destination.error\`) → следующий подписчик → … → \`SafeSubscriber\` → ваш колбэк \`next\`.
8. **Охрана контракта.** После \`error\` или \`complete\` флаг \`isStopped\` выставлен — следующие \`next\` молча игнорируются; сразу после \`error\`/\`complete\` подписка сама вызывает \`unsubscribe()\`.
9. **Возврат.** \`subscribe()\` возвращает тот самый \`SafeSubscriber\` — он и есть ваша \`Subscription\`.
10. **Отписка.** \`unsubscribe()\` ставит \`closed = true\` и запускает финализаторы: дочерний \`OperatorSubscriber\` → его дочерний → … → teardown источника. Поэтому фактически первым выполняется очистка источника, затем — колбэки операторов в порядке \`pipe\`.

Мини-реализация, которая повторяет главное (контракт, teardown, синхронность, оператор):

\`\`\`js
class MiniSubscriber {
  closed = false;
  #teardowns = [];
  constructor(observer) { this.observer = observer; }
  next(v) { if (!this.closed) this.observer.next?.(v); }
  error(e) { if (!this.closed) { this.observer.error?.(e); this.unsubscribe(); } }
  complete() { if (!this.closed) { this.observer.complete?.(); this.unsubscribe(); } }
  add(fn) { if (this.closed) fn(); else this.#teardowns.push(fn); }
  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    this.#teardowns.forEach(fn => fn());
  }
}

class MiniObservable {
  constructor(producer) { this.producer = producer; }
  subscribe(observer) {
    if (typeof observer === 'function') observer = { next: observer };
    const subscriber = new MiniSubscriber(observer);
    try {
      const teardown = this.producer(subscriber);
      if (teardown) subscriber.add(teardown);
    } catch (e) {
      subscriber.error(e);
    }
    return subscriber;
  }
  pipe(...ops) { return ops.reduce((src, op) => op(src), this); }
}

const miniMap = (fn) => (source) => new MiniObservable(subscriber => {
  const upstream = source.subscribe({
    next: v => {
      let result;
      try { result = fn(v); } catch (e) { subscriber.error(e); return; }
      subscriber.next(result);
    },
    error: e => subscriber.error(e),
    complete: () => subscriber.complete(),
  });
  return () => upstream.unsubscribe();
});

const nums$ = new MiniObservable(subscriber => {
  console.log('producer started');
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
  subscriber.next(3);           // проигнорируется: подписка уже закрыта
  return () => console.log('teardown');
});

nums$.pipe(miniMap(x => x * 10)).subscribe({
  next: v => console.log('next', v),
  complete: () => console.log('complete'),
});
// producer started
// next 10
// next 20
// complete
// teardown
\`\`\`

### Пример 1. Ленивость и синхронность

\`\`\`ts
import { Observable } from 'rxjs';

const nums$ = new Observable<number>(subscriber => {
  console.log('producer started');
  subscriber.next(1);
  subscriber.next(2);
  subscriber.complete();
  subscriber.next(3);
  return () => console.log('teardown');
});

console.log('before subscribe');
nums$.subscribe({ next: v => console.log('next', v), complete: () => console.log('complete') });
console.log('after subscribe');
// before subscribe
// producer started
// next 1
// next 2
// complete
// teardown          ← источник завершился синхронно, teardown выполнен сразу при add
// after subscribe   ← subscribe вернул управление только после всего этого
\`\`\`

Видно сразу четыре факта: до \`subscribe\` ничего не выполнилось; синхронный производитель выдаёт всё **внутри** вызова \`subscribe\`; \`next(3)\` после \`complete\` проигнорирован; очистка срабатывает и при естественном завершении.

### Пример 2. Две подписки — два выполнения

\`\`\`ts
nums$.subscribe(v => console.log('A', v));
// producer started
// A 1
// A 2
// teardown
\`\`\`

Каждый \`subscribe\` заново вызывает функцию-производитель. Для \`HttpClient.get\` это значит: две подписки — два запроса. Поделиться одним выполнением можно только явно — через \`share\`/\`shareReplay\` или \`Subject\`.

### Пример 3. В каком порядке подписываются операторы

\`\`\`ts
const source$ = new Observable<number>(s => {
  console.log('source: subscribed');
  s.next(1); s.next(2); s.next(3); s.complete();
});
const traced = (name, op) => source => new Observable(sub => {
  console.log(name + ': subscribing upstream');
  return op(source).subscribe(sub);
});

source$.pipe(
  traced('map', map(v => v * 10)),
  traced('filter', filter(v => v > 10))
).subscribe(v => console.log('value', v));
// filter: subscribing upstream   ← подписка идёт от последнего оператора
// map: subscribing upstream
// source: subscribed              ← к источнику
// value 20                        ← а значения — обратно, от источника к вам
// value 30
\`\`\`

Подписка движется снизу вверх по записи \`pipe\`, значения — сверху вниз.

### Пример 4. Свой оператор — это новый Observable

\`\`\`ts
function myMap<T, R>(fn: (v: T) => R) {
  return (source: Observable<T>) => new Observable<R>(subscriber => {
    return source.subscribe({                       // return — обязательно!
      next: v => {
        let r: R;
        try { r = fn(v); } catch (e) { subscriber.error(e); return; }
        subscriber.next(r);
      },
      error: e => subscriber.error(e),
      complete: () => subscriber.complete(),
    });
  });
}

of(1, 2, 3).pipe(myMap(x => x * 2)).subscribe(console.log);
// 2
// 4
// 6
\`\`\`

Оператор не «обрабатывает поток», а **создаёт новый Observable**, который при подписке подписывается на предыдущий. \`return\` внутренней подписки — это и есть связь для отписки: если его забыть, \`unsubscribe()\` снаружи не дойдёт до источника. Проверено: с забытым \`return\` источник продолжает выдавать значения после отписки — утечка.

### Пример 5. Отписка и порядок очистки

\`\`\`ts
const ticker$ = new Observable<number>(s => {
  let i = 0;
  const id = setInterval(() => s.next(i++), 10);
  return () => { clearInterval(id); console.log('source teardown: clearInterval'); };
});

const sub = ticker$.pipe(
  tap({ unsubscribe: () => console.log('tap#1 unsubscribe') }),
  map(v => v * 2),
  tap({ unsubscribe: () => console.log('tap#2 unsubscribe') })
).subscribe(v => console.log('got', v));

setTimeout(() => sub.unsubscribe(), 35);
// got 0
// got 2
// got 4
// source teardown: clearInterval
// tap#1 unsubscribe
// tap#2 unsubscribe
\`\`\`

\`unsubscribe()\` вызывается на вашем \`SafeSubscriber\`, проходит по дереву дочерних подписок до источника, и очистка выполняется изнутри наружу: сначала источник, затем операторы в порядке записи. Ровно так же в RxJS 7 по порядку \`pipe\` срабатывают несколько \`finalize\`.

### Пример 6. Три вида ошибок ведут себя по-разному

\`\`\`ts
// 1) Ошибка в операторе → уведомление error
of(1, 2, 3).pipe(map(v => { if (v === 2) throw new Error('bad 2'); return v; }))
  .subscribe({ next: v => console.log('next', v), error: e => console.log('error:', e.message) });
// next 1
// error: bad 2

// 2) Ошибка в функции-производителе → тоже error
new Observable(() => { throw new Error('in producer'); })
  .subscribe({ error: e => console.log('error:', e.message) });
// error: in producer

// 3) Ошибка в ВАШЕМ колбэке next → НЕ error
of(1, 2, 3).subscribe({
  next: v => { console.log('next', v); if (v === 2) throw new Error('consumer bug'); },
  error: e => console.log('error:', e.message),
  complete: () => console.log('complete'),
});
// next 1
// next 2
// next 3
// complete
// ...и позже, асинхронно: Uncaught Error: consumer bug
\`\`\`

Ошибки внутри цепочки (операторы, производитель) RxJS превращает в уведомление \`error\`. А исключение в вашем колбэке \`SafeSubscriber\` ловит и **перебрасывает асинхронно** через \`setTimeout\` (или отдаёт в \`config.onUnhandledError\`, если он задан): поток при этом продолжается, а ваш \`error\`-колбэк не вызывается. Так же асинхронно перебрасывается ошибка потока, если \`error\`-колбэка нет вовсе.

### Пример 7. Синхронный производитель и закрытая подписка

\`\`\`ts
const s$ = new Observable<number>(s => {
  for (let i = 0; i < 5 && !s.closed; i++) {   // проверяем closed
    console.log('emit', i);
    s.next(i);
  }
});
s$.pipe(take(2)).subscribe(v => console.log('got', v));
// emit 0
// got 0
// emit 1
// got 1
\`\`\`

\`take(2)\` после второго значения отписывается от источника, но синхронный цикл не может быть «прерван» снаружи — он узнаёт об этом только через \`subscriber.closed\`. Без проверки цикл дойдёт до конца, а лишние \`next\` будут проигнорированы — работа впустую.

### Observer, Subscriber, Subscription — в чём разница

- **Observer** — то, что вы передаёте: \`{ next, error, complete }\` или одна функция. Никакой логики. Форма \`subscribe(next, error, complete)\` с тремя функциями в RxJS 7 помечена deprecated — передавайте объект.
- **Subscriber** — то, что получает производитель: обёртка над Observer, которая следит за контрактом, ловит исключения и хранит очистку.
- **Subscription** — то, что возвращается вам: \`unsubscribe()\` и \`closed\`. В RxJS 7 это тот же объект, что и \`SafeSubscriber\`: \`of(1).subscribe() instanceof Subscriber\` → \`true\`.

### Где это применяется на практике

- **Написание своих операторов** — например, \`retryWithBackoff\` или \`pollWhileVisible\` для дашборда: без понимания \`return\` внутренней подписки они текут.
- **Обёртки над не-RxJS API** — \`new Observable\` для \`ResizeObserver\`, \`IntersectionObserver\`, WebSocket-клиента с корректной очисткой в teardown.
- **Отладка «двойных запросов»** в Angular — два \`| async\` или два \`subscribe\` на холодный \`HttpClient\`-поток.
- **Чтение стектрейсов** — понимание, почему ошибка из колбэка всплывает асинхронно, без контекста вызова.
- **Производительность больших списков** — синхронные производители с проверкой \`closed\` при \`take\`, \`first\`, \`takeWhile\`.

## Важные нюансы и подводные камни

- **«Операторы выполняются при вызове \`pipe\`»** — нет, \`pipe\` только собирает цепочку функций; работа начинается на \`subscribe\`.
- **Подписка идёт снизу вверх** — от вашего \`subscribe\` к источнику; значения — в обратную сторону.
- **Исключение в вашем колбэке \`next\` не становится ошибкой потока.** \`SafeSubscriber\` перебрасывает его асинхронно, \`error\`-колбэк не вызывается, а поток продолжает работать. Ошибкой потока становятся только исключения внутри операторов и производителя.
- **\`subscribe\` полностью синхронен, если синхронен производитель** — значения приходят до того, как \`subscribe\` вернёт управление; переменная \`sub\` в этот момент ещё не присвоена.
- **Терять \`Subscription\`** — без неё нечем вызвать \`unsubscribe()\`, и бесконечный источник не остановить.
- **Самописный оператор без \`return\` внутренней подписки** — отписка не доходит до источника, таймеры и сокеты продолжают работать.
- **Синхронный цикл без проверки \`subscriber.closed\`** — после \`take\`/\`first\` работа продолжается вхолостую.
- **Teardown после синхронного завершения выполняется сразу** — в момент регистрации, а не при ручном \`unsubscribe\`.
- **Каждая подписка — отдельное выполнение (unicast)**; совместное выполнение — только через multicasting.

**Плюсы:** предсказуемая модель — ленивость, синхронность там, где источник синхронный, автоматическая очистка по всей цепочке; контракт \`next* (error|complete)?\` гарантирован библиотекой, даже если производитель его нарушает.
**Минусы:** много скрытой машинерии (\`SafeSubscriber\`, \`OperatorSubscriber\`, дерево подписок), которая неочевидна при отладке; разное поведение ошибок в цепочке и в колбэках; самописные операторы легко сделать текущими.

## Как это спрашивают на собеседовании

**Главный вывод:** \`subscribe\` оборачивает ваш Observer в \`SafeSubscriber\`, затем каждый оператор подписывается на предыдущий своим \`OperatorSubscriber\`, пока не запустится производитель источника; значения идут обратно по этой цепочке, а возвращённая \`Subscription\` при \`unsubscribe\` закрывает всё дерево до источника.

Типичные формулировки: «Что происходит при вызове \`subscribe\`?», «Чем \`Subscriber\` отличается от \`Observer\`?», «Как устроен оператор внутри?».

Что могут спросить следом:

- *Когда выполняется код оператора?* — При подписке, а не при \`pipe\`; и на каждую подписку заново.
- *Что будет, если бросить исключение в \`next\`-колбэке?* — Поток не получит \`error\`; RxJS перебросит исключение асинхронно, поток продолжит работу.
- *Почему \`next\` после \`complete\` не доходит?* — \`Subscriber\` выставляет \`isStopped\` и игнорирует всё после терминального события.
- *В каком порядке выполняется очистка?* — \`unsubscribe\` идёт от вас к источнику, очистка выполняется начиная с источника, затем операторы в порядке \`pipe\`.
- *Почему самописный оператор течёт?* — Не вернули внутреннюю подписку из функции \`new Observable\`, и отписка не дошла до источника.

### Ответ на 1 минуту

> При вызове \`subscribe\` RxJS сначала оборачивает мой Observer — объект или функцию \`next\` — в \`SafeSubscriber\`. Это наследник \`Subscription\`, который охраняет контракт: после \`error\` или \`complete\` игнорирует новые \`next\`, хранит функции очистки и ловит исключения в моих колбэках. Дальше, если Observable создан оператором, вызывается логика оператора: он создаёт свой \`OperatorSubscriber\` и подписывается им на предыдущий Observable, и так рекурсивно до источника — поэтому подписка разворачивается от потребителя к источнику, а значения текут обратно. У источника запускается функция-производитель, её teardown регистрируется в подписке. \`subscribe\` возвращает этот же \`Subscriber\` как \`Subscription\`, и \`unsubscribe\` закрывает всё дерево, начиная с очистки источника. Важные нюансы: каждая подписка — отдельное выполнение, синхронный источник отдаёт всё ещё до возврата из \`subscribe\`, а исключение в моём \`next\` не становится ошибкой потока.`,
      en: `## In short

\`subscribe()\` is the moment a "recipe" turns into a running stream. The operator chain **unfolds bottom-up**: subscription travels from your code towards the source, and values then flow back — from the source to you.

Analogy: a \`pipe\` chain is a set of **nested boxes**. On \`subscribe\` you open the outermost one, it opens the next, and so on down to the smallest — the source. Only once the last one is open do values start flying out and travelling back outwards, being transformed in each box on the way.

## How it works, step by step

1. **Observer normalization.** \`subscribe()\` accepts either an object \`{ next, error, complete }\` or just a next function. RxJS wraps it in a \`SafeSubscriber\` — an instance of \`Subscriber\`.
2. **The Subscriber as contract guard.** \`Subscriber\` extends \`Subscription\` and implements Observer. It enforces the grammar \`next* (error|complete)?\` — after a terminal event \`next\` is ignored; it catches exceptions in callbacks; and it holds a \`closed\` flag plus the list of teardown logic.
3. **Running the producer function.** The Observable calls its \`_subscribe(subscriber)\` — the very function passed to the constructor. For a \`pipe\` this is a chain: each operator wraps the \`subscriber\` in its own "operator-subscriber" that transforms or filters values and passes them along.
4. **Value flow.** The producer calls \`subscriber.next(v)\`. The value travels along the chain of operator-subscribers to the final Observer.
5. **Returning the Subscription.** \`subscribe()\` returns a \`Subscription\`; the teardown returned by the producer function is registered on it.
6. **Completion and teardown.** On \`complete()\`, \`error()\`, or \`unsubscribe()\`, the subscription is marked \`closed\` and every teardown function is invoked recursively down the chain — releasing resources at each level.

## Example

\`\`\`ts
// a simplified model of the map operator — the whole mechanism in view
function map(fn) {
  return (source) => new Observable(sub => {
    return source.subscribe({
      next: v => sub.next(fn(v)),   // transform
      error: e => sub.error(e),     // proxy
      complete: () => sub.complete()
    });
  });
}
\`\`\`

Why: an operator does not "process a stream" — it **creates a new Observable** that subscribes to the previous one when subscribed to. That is where the inside-out unfolding comes from, and why \`unsubscribe\` reaches the source recursively.

## What to say in the interview

> Calling \`subscribe\` first wraps the arguments — an Observer object or a next function — in a \`SafeSubscriber\`, an instance of \`Subscriber\`. That \`Subscriber\` extends \`Subscription\` and implements Observer, acting as the contract guard: it enforces the grammar \`next* (error|complete)?\` by ignoring \`next\` after a terminal event, catches exceptions in callbacks, and holds a \`closed\` flag along with the teardown list. Then the Observable calls its internal \`_subscribe\` — the function given to the constructor; if there is a \`pipe\` chain, each operator wraps the subscriber in its own, so subscription unfolds inside out, from consumer to source, and values flow back along the chain to the final Observer. On \`complete\`, \`error\`, or \`unsubscribe\` the subscription is marked closed and every teardown is invoked recursively down the chain. The key takeaway is that each subscription is an independent execution — unicast — and operators do not "process a stream", they build new Observables on top of previous ones.

## Gotchas

- **"Operators run when you call \`pipe\`"** — no, \`pipe\` only assembles a chain of functions; work begins at \`subscribe\`.
- **Assuming subscription flows top-down** — it is the opposite: bottom-up, from consumer to source.
- **An exception thrown in a \`next\` callback** is caught by \`SafeSubscriber\` and turned into a stream error rather than silently vanishing.
- **Losing the \`Subscription\`** — with nothing to call \`unsubscribe()\` on, an infinite producer cannot be stopped.
- **Expecting \`subscribe\` to be asynchronous** — it is entirely synchronous if the producer is.
- **Follow-up question**: how does a \`Subscriber\` differ from an \`Observer\`? An Observer is just an interface of three callbacks; a Subscriber is a class extending Subscription that enforces the contract and owns the teardown.`
    }
  },
  {
    id: 'rxjs-033',
    category: 'ngrx',
    level: 'Medium',
    tags: ['startwith', 'scan', 'state'],
    question: {
      ru: 'Как реализовать простой state-store на RxJS с помощью scan и BehaviorSubject?',
      en: 'How do you implement a simple RxJS state store using scan and BehaviorSubject?'
    },
    answer: {
      ru: `## В чём суть

Мини-Redux собирается на чистом RxJS без единой библиотеки. Нужны две вещи: **поток действий** (что произошло) и **функция, которая копит состояние** (как от этого меняются данные). Ключевой оператор — \`scan\`: это «reduce во времени», он выдаёт новое состояние после каждого действия.

Аналогия: \`scan\` — это **банковский счёт**. Каждая операция (действие) применяется к текущему остатку, и после каждой операции вам показывают новый баланс. \`BehaviorSubject\` — **та же выписка, но с табло на стене**: там всегда написан текущий остаток, и посмотреть его можно в любой момент, не дожидаясь следующей операции.

**Какую проблему решает.** Несколько компонентов делят одно состояние: счётчик в шапке и список на странице, фильтры и таблица. Если каждый хранит свою копию, они расходятся. Тащить ради этого NgRx — дорого. Store на \`scan\` или \`BehaviorSubject\` даёт один источник истины, предсказуемые обновления и реактивную подписку — в 20 строк кода.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения; работает, только когда на него подписаны.
- **Subject** — поток, в который можно вручную «толкать» значения через \`next()\`; он рассылает их всем, кто подписан **сейчас**. Опоздавшие пропущенное не получат.
- **BehaviorSubject** — Subject с памятью: хранит последнее значение, сразу отдаёт его новому подписчику и даёт синхронно прочитать его через \`.value\`.
- **Action (действие)** — объект-описание события: \`{ type: 'inc' }\` или \`{ type: 'set', value: 5 }\`.
- **Reducer (редьюсер)** — чистая функция \`(state, action) => newState\`: по старому состоянию и действию считает новое, ничего не меняя снаружи.
- **\`reduce\`** — оператор, который схлопывает все значения потока в одно и выдаёт его **один раз**, когда поток завершится.
- **\`scan\`** — то же накопление, но результат выдаётся **после каждого** значения; аккумулятор (накопленное значение) живёт внутри подписки.
- **\`startWith(x)\`** — оператор, который выдаёт \`x\` первым, сразу при подписке, до любых значений источника.
- **\`shareReplay({ bufferSize, refCount })\`** — делает поток общим для всех подписчиков и повторяет последние \`bufferSize\` значений опоздавшим; \`refCount\` решает, отписываться ли от источника, когда подписчиков не осталось.
- **\`asObservable()\`** — превращает Subject в «только чтение»: снаружи можно подписаться, но нельзя вызвать \`next\`.
- **\`distinctUntilChanged\`** — пропускает значение, только если оно отличается от предыдущего (по \`===\`).
- **Иммутабельность (immutability)** — правило «не меняй объект, создай новый»; на нём держатся сравнение по ссылке, OnPush и мемоизация.
- **OnPush** — стратегия обнаружения изменений Angular: компонент перерисовывается, только когда ссылка на входные данные изменилась.
- **Снимок (snapshot)** — текущее значение состояния, прочитанное синхронно, без подписки.

## Как это работает под капотом

Внутри \`scan\` устроен почти так:

\`\`\`ts
function scan(reducer, seed) {
  return (source) => new Observable((subscriber) => {
    let acc = seed;                         // аккумулятор — свой у КАЖДОЙ подписки
    return source.subscribe({
      next: (value) => {
        acc = reducer(acc, value);          // считаем новое состояние
        subscriber.next(acc);               // и сразу отдаём его
      },
      error: (e) => subscriber.error(e),
      complete: () => subscriber.complete(),
    });
  });
}
\`\`\`

Что из этого следует для store:

1. Действия толкают в \`actions$ = new Subject<Action>()\`. Subject горячий: значение уходит только тем, кто подписан в этот момент.
2. \`scan(reducer, initial)\` на каждое действие вызывает reducer и выдаёт новое состояние, поэтому подписчик видит каждую промежуточную версию.
3. Но сам \`scan\` ничего не выдаёт при подписке — он ждёт первого действия. Поэтому нужен \`startWith(initial)\`, иначе экран пуст до первого клика.
4. Аккумулятор \`acc\` создаётся заново на каждый \`subscribe\`. Значит, два компонента без общей подписки получат **два независимых состояния**. Это лечит \`shareReplay\`: одна внутренняя подписка на всех и повтор последнего значения опоздавшим.
5. Вариант на \`BehaviorSubject\` устроен иначе: состояние хранит сам Subject. \`next(newState)\` заменяет значение и рассылает его, \`.value\` читает текущее синхронно. Переходы описывают методы сервиса, а не чистая функция.

### Пример 1. \`scan\` против \`reduce\`

\`\`\`ts
import { of, scan, reduce } from 'rxjs';

of(1, 2, 3).pipe(scan((acc, x) => acc + x, 0)).subscribe(v => console.log('scan', v));
// scan 1
// scan 3
// scan 6
of(1, 2, 3).pipe(reduce((acc, x) => acc + x, 0)).subscribe(v => console.log('reduce', v));
// reduce 6
\`\`\`

\`reduce\` выдаёт результат только при \`complete\`. Поток действий пользователя не завершается никогда, поэтому store на \`reduce\` не выдал бы вообще ничего. \`scan\` показывает «баланс» после каждой операции — ровно то, что нужно UI.

### Пример 2. Store на \`scan\` целиком

\`\`\`ts
type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number };

const initialState: State = { count: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'inc': return { ...state, count: state.count + 1 };
    case 'dec': return { ...state, count: state.count - 1 };
    case 'set': return { ...state, count: action.value };
    default:    return state;
  }
}

@Injectable({ providedIn: 'root' })
export class CounterStore {
  private actions$ = new Subject<Action>();

  readonly state$ = this.actions$.pipe(
    scan(reducer, initialState),
    startWith(initialState),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly count$ = this.state$.pipe(map(s => s.count), distinctUntilChanged());

  dispatch(action: Action) { this.actions$.next(action); }
}
\`\`\`

Reducer вынесен в отдельную чистую функцию — его тестируют без RxJS и Angular: \`expect(reducer({ count: 1 }, { type: 'inc' })).toEqual({ count: 2 })\`. \`count$\` — это «селектор»: вырезает кусок и глушит повторы.

### \`startWith\` — почему без него пусто

\`\`\`ts
const state$ = actions$.pipe(scan((s) => ({ count: s.count + 1 }), { count: 0 }));
state$.subscribe(s => console.log('A got', s));
console.log('(подписались, пока тишина)');
actions$.next({ type: 'inc' });
// (подписались, пока тишина)
// A got { count: 1 }
\`\`\`

Начальное значение \`scan\` (seed) — это стартовый аккумулятор, а не первая эмиссия. \`startWith(initialState)\` выдаёт его сразу, и шаблон показывает \`0\`, а не пустоту. Держите начальное состояние в одной константе, чтобы seed и \`startWith\` не разошлись.

### Без \`shareReplay\`: у каждого подписчика своё состояние

\`\`\`ts
const state$ = actions$.pipe(scan(s => ({ count: s.count + 1 }), { count: 0 }), startWith({ count: 0 }));
state$.subscribe(s => console.log('A', s.count));
actions$.next(inc); actions$.next(inc);
state$.subscribe(s => console.log('B', s.count));
actions$.next(inc);
// A 0
// A 1
// A 2
// B 0   ← B начал с нуля: у него свой scan
// A 3
// B 1   ← два разных «счёта» в одном приложении
\`\`\`

Это самая частая ошибка в этом паттерне. Шапка показывает 3, список — 1, и баг выглядит как «иногда не синхронизируется».

### \`shareReplay\` и выбор \`refCount\`

\`\`\`ts
const state$ = actions$.pipe(scan(...), startWith({ count: 0 }),
  shareReplay({ bufferSize: 1, refCount: true }));
const a = state$.subscribe(s => console.log('A', s.count));
actions$.next(inc); actions$.next(inc);
const b = state$.subscribe(s => console.log('B', s.count));
actions$.next(inc);
// A 0, A 1, A 2
// B 2   ← опоздавший сразу получил последнее значение
// A 3, B 3

a.unsubscribe(); b.unsubscribe();   // все ушли (например, сменили страницу)
actions$.next(inc);                 // никто не слушает — действие потеряно
state$.subscribe(s => console.log('C', s.count));
// C 0   ← refCount: true отписался от источника, scan начнётся заново
\`\`\`

С \`refCount: false\` то же самое выглядит так:

\`\`\`ts
// A 0, A 1 → a.unsubscribe() → actions$.next(inc) → новый подписчик
// C 2   ← подписка на источник жива, состояние сохранилось и продолжало считаться
\`\`\`

\`bufferSize: 1\` — помнить одно последнее состояние. \`refCount\` — это выбор, а не «всегда true»:

- \`refCount: true\` — когда последний подписчик ушёл, внутренняя подписка закрывается, и **состояние сбрасывается**. Подходит для store, привязанного к экрану.
- \`refCount: false\` — подписка на \`actions$\` живёт вечно, **состояние переживает уход всех подписчиков**. Подходит для \`providedIn: 'root'\`-store, который должен помнить данные между страницами. Цена — источник никогда не отписывается; для внутреннего Subject это безопасно, а для потока с таймером или WebSocket — утечка.

### Иммутабельность и \`distinctUntilChanged\`

\`\`\`ts
const mut$ = actions$.pipe(scan(s => { s.count++; return s; }, { count: 0 }), distinctUntilChanged());
const imm$ = actions$.pipe(scan(s => ({ ...s, count: s.count + 1 }), { count: 0 }), distinctUntilChanged());
mut$.subscribe(s => console.log('mutating:', s.count));
imm$.subscribe(s => console.log('immutable:', s.count));
actions$.next('inc'); actions$.next('inc');
// mutating: 1
// immutable: 1
// immutable: 2   ← мутирующий вариант второе изменение «не заметил»
\`\`\`

\`distinctUntilChanged\`, \`OnPush\`, \`computed\` и мемоизация сравнивают **ссылки**. Если reducer меняет старый объект и возвращает его же, для всех них ничего не произошло.

### Вариант на \`BehaviorSubject\` и \`asObservable\`

\`\`\`ts
class CounterStore {
  #state = new BehaviorSubject({ count: 0, step: 1 });
  readonly state$ = this.#state.asObservable();
  readonly count$ = this.state$.pipe(map(s => s.count), distinctUntilChanged());

  get snapshot() { return this.#state.value; }
  patch(partial: Partial<State>) { this.#state.next({ ...this.#state.value, ...partial }); }
  inc() { this.patch({ count: this.snapshot.count + this.snapshot.step }); }
}

store.count$.subscribe(c => console.log('count$', c));
store.inc();
store.patch({ step: 10 });   // count не изменился — count$ молчит
store.inc();
// count$ 0
// count$ 1
// count$ 11
console.log(store.snapshot);          // { count: 11, step: 10 }
console.log(typeof store.state$.next); // undefined — писать снаружи нельзя
\`\`\`

\`BehaviorSubject\` сразу отдаёт текущее значение подписчику — \`startWith\` и \`shareReplay\` не нужны. \`.value\` даёт синхронный снимок, удобный в guard'ах и обработчиках кликов. \`asObservable()\` закрывает запись: состояние меняется только через методы сервиса. Приватное поле \`#state\` не даёт добраться до самого Subject.

### Ошибка в reducer убивает весь store

\`\`\`ts
const state$ = actions$.pipe(scan((s, a) => {
  if (a === 'boom') throw new Error('unknown action');
  return { count: s.count + 1 };
}, { count: 0 }));
state$.subscribe({ next: s => console.log('state', s.count), error: e => console.log('error:', e.message) });
actions$.next('inc'); actions$.next('boom'); actions$.next('inc');
// state 1
// error: unknown action
// (дальше тишина — поток завершён навсегда)
\`\`\`

\`error\` в RxJS терминален: после него \`scan\` больше не работает, и все подписчики остаются с последним значением. Reducer должен быть «пуленепробиваемым»: никаких исключений, неизвестное действие → \`default: return state\`.

### Гибрид: чистый reducer и синхронный снимок

\`\`\`ts
const actions$ = new Subject<Action>();
const state = new BehaviorSubject(initialState);
actions$.pipe(scan(reducer, initialState)).subscribe(state);

state.subscribe(s => console.log('state', s.count));
actions$.next({ type: 'inc' });
actions$.next({ type: 'set', value: 42 });
// state 0
// state 1
// state 42
console.log(state.value); // { count: 42 }
\`\`\`

Переходы описаны чистой тестируемой функцией, а \`BehaviorSubject\` хранит результат: есть и \`.value\`, и начальное значение, и общее состояние без \`shareReplay\`. Подписка создаётся сразу, поэтому состояние живёт столько же, сколько сервис.

### Как выбрать

- **\`scan\` + \`Subject\`** — когда важны чистые, тестируемые переходы и журнал действий (можно логировать \`actions$\`). Не забыть \`startWith\` и \`shareReplay\`.
- **\`BehaviorSubject\`** — когда нужен синхронный снимок и простые CRUD-обновления через \`patch\`. Минимум кода.
- **Гибрид** — когда нужны оба свойства; хороший вариант для сервиса уровня \`root\`.
- **Сигналы** — в современном Angular то же самое делает \`signal\` + \`computed\` в сервисе; RxJS-store оправдан, если вокруг уже много RxJS-логики (\`debounceTime\`, \`switchMap\`). Мост между мирами — \`toSignal(store.state$)\`.
- **NgRx / SignalStore** — когда таких store'ов становится много, нужны DevTools, эффекты и единые правила для команды.

### Где это применяется на практике

- **Состояние фильтров и сортировки таблицы**: компонент фильтров диспатчит действия, грид и счётчик результатов подписаны на один \`state$\`.
- **Корзина или выбранные строки** в средних приложениях без NgRx.
- **Мастер (wizard) из нескольких шагов**: шаги пишут в общий store, итоговая страница читает снимок через \`.value\`.
- **Сервис уведомлений**: \`BehaviorSubject<Notification[]>\` с методами \`push\` и \`dismiss\`.
- **Промежуточная ступень перед NgRx**: reducer и actions в том же виде потом переезжают в \`createReducer\` почти без изменений.

## Важные нюансы и подводные камни

- **Забыли \`shareReplay\`** — у каждого подписчика своё состояние. Самая частая ошибка паттерна.
- **\`refCount: true\` сбрасывает состояние.** Когда отписался последний подписчик, \`scan\` начнётся с нуля, а действия, отправленные в паузе, потеряются. Для глобального store берите \`refCount: false\`, гибрид или \`BehaviorSubject\`.
- **\`refCount: false\` держит подписку вечно.** Для внутреннего Subject это нормально, но если источник — таймер, WebSocket или поток из DOM, он не остановится никогда.
- **Забыли \`startWith\`** — до первого действия шаблон не получит ничего.
- **Мутация в \`scan\`** (\`state.count++\`) ломает \`distinctUntilChanged\`, OnPush, \`computed\` и любую мемоизацию.
- **Публичный \`BehaviorSubject\`** — любой сможет вызвать \`next\` и записать что угодно в обход методов. Отдавайте наружу \`asObservable()\`.
- **Исключение в reducer'е** завершает поток ошибкой, и store умирает до перезагрузки страницы.
- **\`.value\` не реактивен.** Прочитанный в шаблоне или в \`constructor\` снимок не обновится сам; для UI нужна подписка (\`async\`, \`toSignal\`).
- **\`scan\` против \`reduce\`** — частый вопрос: \`reduce\` выдаёт один раз при \`complete\`, поэтому на бесконечном потоке не выдаст ничего.

**Плюсы:** ноль зависимостей, мало кода, понятная модель Redux, чистые тестируемые переходы (\`scan\`) или синхронный снимок (\`BehaviorSubject\`), легко переехать на NgRx.
**Минусы:** всё держится на дисциплине (иммутабельность, \`shareReplay\`, \`asObservable\`), нет DevTools и эффектов, каждый store команда пишет по-своему, а при росте числа таких сервисов появляется самодельный NgRx.

## Как это спрашивают на собеседовании

**Главный вывод:** \`Subject\` действий + \`scan(reducer, initial)\` — это Redux-цикл без библиотеки; обязательно добавить \`startWith\` и \`shareReplay({ bufferSize: 1, refCount })\`. \`BehaviorSubject\` — альтернатива с синхронным снимком \`.value\`, наружу его отдают через \`asObservable()\`.

Типичные формулировки: «Как сделать простой store на RxJS?», «Чем \`scan\` отличается от \`reduce\`?», «Зачем \`shareReplay\` в store на \`scan\`?», «Когда \`BehaviorSubject\`, а когда \`scan\`?».

Что могут спросить следом:

- *Почему без \`shareReplay\` состояние расходится?* — Аккумулятор \`scan\` создаётся на каждую подписку, поэтому у каждого подписчика свой счёт.
- *Что будет с \`refCount: true\`, когда все отписались?* — Подписка на источник закроется, состояние сбросится к начальному, действия в паузе потеряются.
- *Зачем \`asObservable()\`?* — Чтобы потребители не могли вызвать \`next\` и писать в состояние в обход методов.
- *Что сломает мутация в reducer'е?* — \`distinctUntilChanged\`, OnPush и мемоизацию: ссылка не изменилась, значит «изменений нет».
- *Как подружить такой store с сигналами?* — \`toSignal(store.state$)\` в компоненте или переписать store на \`signal\` + \`computed\`.

### Ответ на 1 минуту

> Мини-Redux на RxJS — это \`Subject\` действий и чистая reduce-функция. Оператор \`scan\` — это reduce во времени: он хранит аккумулятор и выдаёт новое состояние на каждое действие, а обычный \`reduce\` выдал бы результат только при \`complete\`, то есть никогда. Обязательны две детали. \`startWith\` — потому что \`scan\` не выдаёт начальное значение до первого действия. И \`shareReplay\` с буфером в единицу — иначе каждая подписка запускает свой \`scan\` со своим состоянием. При этом \`refCount: true\` сбрасывает состояние, когда ушёл последний подписчик, поэтому для глобального store я беру \`refCount: false\` или гибрид. Альтернатива — \`BehaviorSubject\`: он хранит текущее значение, даёт синхронный снимок через \`.value\`, а наружу отдаётся через \`asObservable()\`. В обоих вариантах состояние только иммутабельное, иначе сломаются \`distinctUntilChanged\` и OnPush.`,
      en: `## In short

A mini-Redux needs no library at all. Just two things: a **stream of actions** and a **function that accumulates state**.

The key operator is \`scan\`. It is **"reduce over time"**: an ordinary \`reduce\` collapses an array into one value at the end, while \`scan\` emits the running accumulator on **every** incoming value.

Analogy: \`scan\` is a **bank account**. Every transaction (action) is applied to the running balance, and after each one you are shown the new balance. A \`BehaviorSubject\` is **the same statement plus a display board**: the current balance is always up there and can be read synchronously.

## The two variants — what differs

**The \`scan\` variant** is declarative: pure state transitions, closest to Redux, trivially testable. But there is **no synchronous snapshot** — state exists only inside the stream.

**The \`BehaviorSubject\` variant** is imperative: it has \`.value\` (a "right now" snapshot) and is simpler for CRUD updates. But transitions are expressed as code rather than a pure function.

Two mandatory details, without which both variants break:

- **\`shareReplay({ bufferSize: 1, refCount: true })\`** for the \`scan\` variant, so all subscribers share **one** state and receive the latest. Without it every \`subscribe\` restarts \`scan\` **from scratch**.
- **\`asObservable()\`** for the \`BehaviorSubject\`, so consumers cannot call \`next\` and write into state behind your methods' backs.

## Example

\`\`\`ts
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'set'; value: number };

private actions$ = new Subject<Action>();

readonly state$ = this.actions$.pipe(
  scan((state, action) => {
    switch (action.type) {
      case 'inc': return { count: state.count + 1 };
      case 'dec': return { count: state.count - 1 };
      case 'set': return { count: action.value };
    }
  }, { count: 0 }),
  startWith({ count: 0 }),
  shareReplay({ bufferSize: 1, refCount: true })
);

dispatch(action: Action) { this.actions$.next(action); }
\`\`\`

\`\`\`ts
// the BehaviorSubject variant — when you need a synchronous snapshot
private state = new BehaviorSubject<State>({ count: 0 });
readonly state$ = this.state.asObservable();

get snapshot() { return this.state.value; }
patch(partial: Partial<State>) {
  this.state.next({ ...this.state.value, ...partial });
}
\`\`\`

Why: \`startWith\` is needed because \`scan\` **does not emit its seed** on its own — it waits for the first action, and without \`startWith\` the subscriber sees nothing until the first click.

## What to say in the interview

> A mini-Redux in RxJS is built from a stream of actions plus a pure reduce function. The \`scan\` operator is reduce over time: it accumulates state and emits a new value on every action, so a Subject of actions plus \`scan\` gives you exactly the redux cycle without a library. Two things are mandatory. First \`startWith\`, because \`scan\` does not emit the seed until the first action arrives. Second \`shareReplay\` with a buffer of one and \`refCount: true\`, so all subscribers share one state and receive the latest; without it every subscription re-runs \`scan\` with its own independent state, and that is the classic mistake. The alternative is a \`BehaviorSubject\`: it holds the current value, offers a synchronous snapshot through \`.value\`, and you expose it via \`asObservable()\`. The choice: \`scan\` when pure, testable transitions matter; \`BehaviorSubject\` when you need synchronous access. Both are the middle rung between a plain component field and full NgRx.

## Gotchas

- **Forgetting \`shareReplay\`** — every subscriber gets **its own** state. The most common bug in this pattern.
- **\`refCount: false\`** instead of \`true\` on an infinite Subject — the source stays subscribed forever.
- **Forgetting \`startWith\`** — the template receives nothing until the first action.
- **Mutating state inside \`scan\`** (\`state.count++\`) — it breaks \`distinctUntilChanged\`, OnPush, and every memoization.
- **A public \`BehaviorSubject\`** — anyone can write into state, bypassing your methods.
- **Follow-up question**: how does \`scan\` differ from \`reduce\`? \`reduce\` emits **once, on \`complete\`**, so on an infinite stream it emits nothing at all.`
    }
  },
  {
    id: 'rxjs-034',
    category: 'rxjs',
    level: 'Expert',
    tags: ['glitch', 'combinelatest', 'gotcha'],
    question: {
      ru: 'Что такое «glitch» (промежуточные состояния) в combineLatest и как с ним бороться?',
      en: 'What is a "glitch" (intermediate state) in combineLatest and how do you deal with it?'
    },
    answer: {
      ru: `## В чём суть

Glitch — это **промежуточное несогласованное состояние**, которое \`combineLatest\` выдаёт на мгновение, когда его входы происходят **из одного и того же источника**. Источник обновился, одна ветка уже знает новое значение, другая ещё нет — и наружу улетает пара «новое + старое», которой в реальности никогда не существовало.

Аналогия: два табло на вокзале питаются от одних часов, но обновляются по очереди. На долю секунды первое уже показывает 12:01, а второе ещё 12:00. Пассажир, который смотрит на **оба сразу**, видит **невозможную** картину. Через мгновение второе табло догонит первое, но если пассажир успел по этой картине принять решение («поезд ушёл!»), вред уже сделан.

**Какую проблему решает.** Сам glitch — это баг, а вопрос на собеседовании про то, понимаете ли вы, откуда он берётся и как его не допустить. Без этого понимания в проекте появляются «призрачные» ошибки: лишний HTTP-запрос с параметрами из разных состояний (новый фильтр, но старая страница), валидатор, который на миг видит неверную комбинацию полей, событие аналитики с мусором. Воспроизводятся они плохо, потому что длятся одну синхронную итерацию и в шаблоне обычно не видны.

## Словарик терминов

- **Observable (поток)** — объект, который со временем выдаёт значения; ничего не делает, пока на него не подписались.
- **Эмиссия (emission)** — момент, когда поток отдаёт очередное значение подписчику (вызов \`next\`).
- **\`combineLatest\`** — оператор создания: подписывается на несколько потоков и на **каждую** эмиссию **любого** из них выдаёт массив последних значений всех входов (но только после того, как каждый вход выдал хоть что-то).
- **Diamond-зависимость (ромб, diamond dependency)** — схема «один источник → две ветки → снова вместе». На диаграмме она похожа на ромб: вершина, две стороны, низ.
- **Glitch (глитч)** — несогласованная комбинация на выходе ромба: одна ветка уже обновилась, другая ещё нет.
- **Синхронная пачка (synchronous burst)** — несколько эмиссий, которые происходят одна за другой в одном и том же вызове, без пауз и без ожидания таймеров.
- **Планировщик (scheduler)** — объект RxJS, который решает, **когда** выполнить отложенную работу. \`asyncScheduler\` использует \`setTimeout\` (макрозадача), \`asapScheduler\` — микрозадачу.
- **Макрозадача / микрозадача (macrotask / microtask)** — очереди событийного цикла JS. Микрозадачи (\`Promise.then\`) выполняются сразу после текущего синхронного кода, макрозадачи (\`setTimeout\`) — позже.
- **\`auditTime(ms)\`** — после первого значения ждёт \`ms\`, затем выдаёт **самое свежее** значение за это время.
- **\`debounceTime(ms)\`** — выдаёт значение, только если после него \`ms\` была тишина; каждое новое значение перезапускает ожидание.
- **\`distinctUntilChanged\`** — пропускает значение, только если оно отличается от предыдущего.
- **\`withLatestFrom\`** — оператор, который на каждое значение **основного** потока добавляет последнее значение второстепенного; второстепенный поток эмиссию не вызывает.
- **\`zip\`** — склеивает потоки **по номеру**: первое с первым, второе со вторым.
- **Сигнал и \`computed\`** — реактивная переменная Angular и производное от неё значение, которое пересчитывается лениво при чтении.
- **Селектор NgRx (\`createSelector\`)** — функция, которая достаёт кусок состояния из стора и запоминает результат (мемоизация).

## Как это работает под капотом

Упрощённо \`combineLatest\` устроен так:

\`\`\`ts
function combineLatest(sources) {
  return new Observable((subscriber) => {
    const values = new Array(sources.length);
    const hasValue = new Array(sources.length).fill(false);
    sources.forEach((source$, i) => {
      source$.subscribe((v) => {
        values[i] = v;
        hasValue[i] = true;
        // эмитим сразу, как только КАЖДЫЙ вход хоть раз выдал значение
        if (hasValue.every(Boolean)) subscriber.next([...values]);
      });
    });
  });
}
\`\`\`

Ключевая строка — \`subscriber.next\` внутри обработчика **каждого** входа. Оператор не знает, что входы связаны, и не ждёт «пока все обновятся». Теперь проследим ромб по шагам:

1. Источник \`source$\` выдаёт новое значение. У него два подписчика — ветка \`a$\` и ветка \`b$\`, и он вызывает их **по очереди**, в порядке подписки.
2. Первой значение получает \`a$\`, поэтому она пересчитывает своё значение и эмитит.
3. \`combineLatest\` реагирует **немедленно**: у него есть свежее \`a\` и **старое** \`b\` (сохранённое с прошлого раза), и все входы уже «заполнены» — значит, он отправляет пару наружу.
4. Наружу уходит **[новое a, старое b]** — это и есть glitch. Подписчик успевает на неё отреагировать: сделать запрос, записать в лог, провалидировать.
5. Только теперь источник доходит до второго подписчика: \`b$\` получает значение, пересчитывает и эмитит.
6. \`combineLatest\` выдаёт вторую, уже корректную пару **[новое a, новое b]**.

Важная деталь: на **самом первом** значении источника glitch не возникает, потому что \`combineLatest\` молчит, пока каждый вход не выдал хотя бы одно значение. Glitch появляется на **каждом следующем** обновлении.

### Пример 1. Минимальный ромб

\`\`\`ts
import { Subject, combineLatest, map } from 'rxjs';

const source$ = new Subject<number>();
const a$ = source$.pipe(map((x) => x));
const b$ = source$.pipe(map((x) => x * 2));

combineLatest([a$, b$]).subscribe((v) => console.log(JSON.stringify(v)));

source$.next(1);
source$.next(2);
source$.next(3);
// [1,2]   ← первое значение: a уже есть, ждали b, glitch нет
// [2,2]   ← GLITCH: новое a, старое b (b всегда должно быть a * 2)
// [2,4]
// [3,4]   ← GLITCH
// [3,6]
\`\`\`

Инвариант «\`b\` всегда равно \`a * 2\`» нарушается на каждом обновлении после первого. Источник выдал 3 значения, а подписчик получил 5 — два из них ложные.

### Пример 2. Почему \`distinctUntilChanged\` не спасает

\`distinctUntilChanged\` отсекает **повторы**, а промежуточная пара — не повтор, она действительно отличается от предыдущей и от следующей.

\`\`\`ts
import { BehaviorSubject, combineLatest, map, distinctUntilChanged } from 'rxjs';

const source$ = new BehaviorSubject(1);
const a$ = source$.pipe(map((x) => x));
const b$ = source$.pipe(map((x) => x * 2));

combineLatest([a$, b$]).pipe(
  distinctUntilChanged((p, c) => p[0] === c[0] && p[1] === c[1])
).subscribe(([a, b]) => console.log(a, b, b === a * 2 ? 'ok' : 'GLITCH'));

source$.next(2);
// 1 2 ok
// 2 2 GLITCH   ← [2,2] не равно [1,2], фильтр его пропустил
// 2 4 ok
\`\`\`

\`BehaviorSubject\` (Subject, который хранит текущее значение и сразу отдаёт его новому подписчику) делает пример ближе к реальности: так устроены сторы состояния.

### Пример 3. Реальный вред: лишний запрос из стора

Типичный сервис состояния: поиск и номер страницы лежат в одном объекте, а компонент собирает их через два отдельных «селектора». При новом поиске страница сбрасывается на 1 — одним обновлением.

\`\`\`ts
import { BehaviorSubject, combineLatest, map, distinctUntilChanged } from 'rxjs';

const state$ = new BehaviorSubject({ query: '', page: 3 });
const query$ = state$.pipe(map((s) => s.query), distinctUntilChanged());
const page$ = state$.pipe(map((s) => s.page), distinctUntilChanged());

combineLatest([query$, page$]).subscribe(([q, p]) =>
  console.log(\`GET /search?q=\${q}&page=\${p}\`)
);

state$.next({ query: 'angular', page: 1 });
// GET /search?q=&page=3
// GET /search?q=angular&page=3   ← GLITCH: новый запрос, но старая страница
// GET /search?q=angular&page=1
\`\`\`

Если дальше стоит \`switchMap\` с HTTP, ложный запрос будет отменён, но он уже **ушёл на сервер**. С \`mergeMap\` или \`concatMap\` его ответ ещё и попадёт в UI. Точно так же ведут себя два \`store.select(...)\` из NgRx, собранные через \`combineLatest\`: стор NgRx — это поток состояния в духе \`BehaviorSubject\`, а \`select\` — это \`map\` плюс \`distinctUntilChanged\`.

### Пример 4. Angular-формы: контрол и форма

Ромб бывает и неявным. При \`setValue\` контрол сначала эмитит свой \`valueChanges\`, и только потом обновляется и эмитит родительская \`FormGroup\`:

\`\`\`ts
const form = new FormGroup({
  country: new FormControl('BY'),
  city: new FormControl('Minsk'),
});
const country = form.controls.country;

combineLatest([
  country.valueChanges.pipe(startWith(country.value)),
  form.valueChanges.pipe(startWith(form.value)),
]).subscribe(([c, f]) => console.log(c, f.country, c === f.country ? 'ok' : 'GLITCH'));

country.setValue('PL');
// BY BY ok
// PL BY GLITCH   ← контрол уже PL, форма ещё BY
// PL PL ok
\`\`\`

Здесь «источник» — вызов \`setValue\`, а две ветки — контрол и его родитель. Кросс-полевой валидатор или запрос «города по стране», подписанный на такую комбинацию, увидит несуществующее состояние.

### Решение 1. Комбинировать до разветвления

Лучший способ — не строить ромб вообще. Всё, что выводится из одного источника, считайте в **одном** \`map\`, а не разводите и сводите обратно.

\`\`\`ts
import { BehaviorSubject, map, distinctUntilChanged } from 'rxjs';

const state$ = new BehaviorSubject({ query: '', page: 3 });

state$.pipe(
  map((s) => ({ q: s.query, p: s.page })),
  distinctUntilChanged((a, b) => a.q === b.q && a.p === b.p)
).subscribe(({ q, p }) => console.log(\`GET /search?q=\${q}&page=\${p}\`));

state$.next({ query: 'angular', page: 1 });
state$.next({ query: 'angular', page: 1 });
// GET /search?q=&page=3
// GET /search?q=angular&page=1   ← одно обновление — один запрос
\`\`\`

Glitch здесь физически невозможен: есть одна ветка, и она видит весь объект состояния целиком. Третий \`next\` с тем же содержимым отсёк \`distinctUntilChanged\`. В NgRx то же самое делается составным селектором: \`createSelector(selectQuery, selectPage, (q, p) => ({ q, p }))\` — проекция считается из **одного** снимка состояния.

### Решение 2. \`auditTime(0)\` — схлопнуть синхронную пачку

Если ромб уже есть (входы приходят из разных сервисов, переписать нельзя), можно дождаться конца синхронной пачки и выдать только последнюю, согласованную комбинацию.

\`\`\`ts
import { BehaviorSubject, combineLatest, map, auditTime } from 'rxjs';

const source$ = new BehaviorSubject(1);
const a$ = source$.pipe(map((x) => x));
const b$ = source$.pipe(map((x) => x * 2));

combineLatest([a$, b$]).pipe(auditTime(0)).subscribe((v) => console.log('audit', JSON.stringify(v)));
console.log('после subscribe');
source$.next(2);
console.log('после next(2)');
// после subscribe
// после next(2)
// audit [2,4]   ← только финальная пара, уже асинхронно
\`\`\`

\`auditTime(0)\` не «ждёт ноль миллисекунд впустую»: на первое значение он ставит таймер через \`setTimeout\`, а когда таймер срабатывает, вся синхронная серия уже закончилась — и наружу уходит самая свежая пара. Обратите внимание: исходная пара \`[1,2]\` тоже не вышла — она была перезаписана раньше, чем сработал таймер.

### \`auditTime\` против \`debounceTime\`

Оба оператора выбрасывают промежуточные значения, но по-разному решают, **когда** отдать результат:

\`\`\`ts
import { interval, take, auditTime, debounceTime } from 'rxjs';

const src$ = interval(5).pipe(take(40)); // значение каждые ~5 мс, всего ~200 мс

src$.pipe(debounceTime(20)).subscribe((v) => console.log('debounce', v));
src$.pipe(auditTime(50)).subscribe((v) => console.log('audit', v));
// audit 9    ← примерно раз в 50 мс, точные числа зависят от таймеров
// audit 18
// audit 27
// audit 37
// debounce 39   ← тишины не было ни разу, вышло только при complete
// audit 39
\`\`\`

\`debounceTime\` ждёт паузу, и на непрерывном потоке она не наступает — оператор молчит до завершения. \`auditTime\` гарантирует выдачу раз в окно. С нулевым окном разница почти стирается (оба выдадут конец синхронной пачки), но \`auditTime\` надёжнее по смыслу: он никогда не «голодает».

### \`asapScheduler\` — схлопнуть в микрозадаче

Второй аргумент \`auditTime\` и \`debounceTime\` — планировщик. С \`asapScheduler\` ожидание идёт в микрозадаче, то есть раньше любого \`setTimeout\`:

\`\`\`ts
// source$, a$, b$ — тот же ромб на BehaviorSubject(1), что и выше
combineLatest([a$, b$]).pipe(auditTime(0, asapScheduler)).subscribe((v) => console.log('asap', JSON.stringify(v)));
setTimeout(() => console.log('setTimeout 0'), 0);
Promise.resolve().then(() => console.log('promise'));
source$.next(2);
console.log('sync end');
// sync end
// asap [2,4]
// promise
// setTimeout 0
\`\`\`

Это полезно, когда задержка на целую макрозадачу заметна (например, браузер успевает отрисовать кадр со старыми данными), а согласованность всё равно нужна.

### Решение 3. Signals и \`computed\`

Граф сигналов Angular спроектирован как **glitch-free**. Изменение сигнала сначала только **помечает** зависимые \`computed\` как устаревшие, а сам пересчёт происходит лениво — при чтении, когда все источники уже обновлены. Это модель push-pull: «устарело» проталкивается вниз, значения вытягиваются при чтении, поэтому производное пересчитывается в правильном (топологическом) порядке и один раз.

\`\`\`ts
import { signal, computed } from '@angular/core';

const source = signal(1);
const a = computed(() => source());
const b = computed(() => source() * 2);
const pair = computed(() => {
  const v = [a(), b()];
  console.log('compute', v.join(','));
  return v;
});

console.log('read', pair().join(','));
source.set(2);
source.set(3);
console.log('read', pair().join(','));
// compute 1,2
// read 1,2
// compute 3,6   ← ни 2,2, ни 3,4; и даже set(2) не вызвал отдельного пересчёта
// read 3,6
\`\`\`

Тот же ромб на сигналах не может выдать несогласованную пару: \`pair\` никогда не видит \`a\` и \`b\` из разных «моментов». Бонус — лишних пересчётов нет: два \`set\` подряд без чтения дали один пересчёт.

### \`withLatestFrom\` и \`zip\` — у них glitch не возникает

\`\`\`ts
import { Subject, map, withLatestFrom, zip } from 'rxjs';

const source$ = new Subject<number>();
const b$ = source$.pipe(map((x) => x * 2));

source$.pipe(withLatestFrom(b$)).subscribe((v) => console.log('wlf', JSON.stringify(v)));
zip([source$.pipe(map((x) => x)), b$]).subscribe((v) => console.log('zip', JSON.stringify(v)));

source$.next(1);
source$.next(2);
// wlf [1,2]
// zip [1,2]
// wlf [2,4]
// zip [2,4]
\`\`\`

\`withLatestFrom\` выдаёт значение **только** на эмиссию основного потока, а второстепенный лишь обновляет «последнее известное» — двойной эмиссии нет. К тому же он подписывается на второстепенный поток **раньше** основного, поэтому в синхронном ромбе второстепенная ветка обновляется первой. \`zip\` сопоставляет значения по номеру: пятое \`a\` всегда склеивается с пятым \`b\`. Цена — внутренний буфер: если одна ветка эмитит чаще другой (например, в ней стоит \`filter\`), лишние значения копятся, а пары «съезжают».

### Где это применяется на практике

- **Фильтры и пагинация таблиц.** Большой data grid, где поиск, сортировка и страница лежат в одном состоянии: смена поиска сбрасывает страницу — без защиты от glitch уходит лишний запрос со старой страницей.
- **NgRx и сервисы состояния.** Несколько \`store.select\` через \`combineLatest\` — классический источник ромбов; лечится составным селектором \`createSelector\`.
- **Реактивные формы.** Кросс-полевые проверки и зависимые справочники (страна → города), которые слушают одновременно контрол и форму.
- **Дашборды.** Виджет собирает «период» и «единицы измерения» из общего состояния; глитч даёт мигание неверной цифры или лишний запрос метрики.
- **Миграция на сигналы.** Сложное производное состояние (итоги, флаги доступности кнопок) переносят из \`combineLatest\` в \`computed\` — в том числе ради отсутствия glitch.

## Важные нюансы и подводные камни

- **Считать glitch «редкой экзотикой».** При NgRx-селекторах, формах и сервисах состояния diamond-зависимости встречаются постоянно — просто их не замечают, пока не появится побочный эффект.
- **Лечить \`distinctUntilChanged\` в одиночку.** Промежуточная пара действительно отличается от соседних, так что фильтр её пропустит. Он полезен только **вместе** с \`auditTime(0)\`, чтобы убрать дубликаты после схлопывания.
- **Побочные эффекты прямо в \`subscribe\` или \`tap\` после \`combineLatest\`.** Glitch отправит лишний HTTP-запрос с несогласованными параметрами или запишет мусор в аналитику.
- **В шаблоне glitch обычно не виден.** \`async\` pipe и сигналы лишь помечают компонент для проверки, а отрисовка происходит после синхронной пачки — UI покажет финальное значение. Поэтому glitch и коварен: глазами его не поймать, зато его видят \`tap\`, \`switchMap\` и валидаторы.
- **\`debounceTime(0)\` на очень активном источнике.** Принцип \`debounceTime\` — ждать тишины; на ненулевом окне и непрерывном потоке он может не выдать вообще ничего. \`auditTime(0)\` безопаснее по смыслу.
- **\`auditTime(0)\` делает поток асинхронным.** Значение больше не приходит синхронно при подписке: код вида «подписался, синхронно прочитал, отписался» (\`take(1)\` в синхронной функции) получит пустоту, а юнит-тесты понадобится запускать с \`fakeAsync\` или ожиданием таймеров.
- **Не всякая «лишняя» эмиссия — glitch.** Если входы \`combineLatest\` действительно независимы (клик пользователя и ответ сервера), каждая эмиссия — легитимное новое состояние. Glitch — это только комбинация из разных моментов **одного** источника.
- **\`share\` не лечит glitch.** Общая подписка на источник не меняет того, что подписчики \`share\` получают значение по очереди.
- **Ждать glitch от \`withLatestFrom\`.** Его там нет: эмиссию запускает только основной поток. Но свежесть второстепенного значения зависит от порядка подписки — если второстепенная ветка обновляется асинхронно, вы получите старое значение без всякой второй эмиссии.
- **\`zip\` вместо \`combineLatest\`.** В ромбе не глитчит, потому что сопоставляет по индексу, но платит растущим буфером и ломается, как только одна ветка начинает пропускать значения.

**Плюсы:** понимание glitch даёт простое правило проектирования (выводить состояние из одного снимка), а инструменты защиты дешёвые — один \`map\`, составной селектор, \`auditTime(0)\` или \`computed\`.
**Минусы:** глитч не виден в UI и плохо воспроизводится; \`auditTime(0)\` добавляет асинхронность и усложняет тесты, а переписывать ромбы в существующем коде бывает дорого.

## Как это спрашивают на собеседовании

**Главный вывод:** glitch — это несогласованная пара из нового и старого значения, которую \`combineLatest\` выдаёт при diamond-зависимости, потому что эмитит на каждое обновление любого входа, а источник обновляет ветки по очереди. Лучшее лечение — не разветвлять (один \`map\` или составной селектор), компромисс — \`auditTime(0)\`, архитектурное решение — \`computed\` на сигналах.

Типичные формулировки: «Почему \`combineLatest\` иногда выдаёт неконсистентные данные?», «Что такое diamond problem в реактивном программировании?», «Почему после смены фильтра уходит два запроса?».

Что могут спросить следом:

- *Глитчит ли \`zip\`?* — Нет, он сопоставляет по индексу, но копит буфер, если ветки эмитят с разной частотой.
- *А \`withLatestFrom\`?* — Нет двойной эмиссии: результат выдаётся только на значения основного потока.
- *Почему сигналы glitch-free?* — Изменение только помечает зависимых как устаревших, а пересчёт ленивый, при чтении, когда все источники уже обновлены.
- *Чем \`auditTime(0)\` лучше \`debounceTime(0)\`?* — Для нуля разница минимальна, но \`auditTime\` гарантирует выдачу раз в окно, а \`debounceTime\` на непрерывном потоке может молчать.
- *Как избежать glitch в NgRx?* — Комбинировать в \`createSelector\`, а не собирать несколько \`select\` через \`combineLatest\`.

### Ответ на 1 минуту

> Glitch — это промежуточное несогласованное состояние на выходе \`combineLatest\`, когда несколько его входов выведены из одного источника, то есть при diamond-зависимости. Причина в механике: \`combineLatest\` эмитит на каждое значение любого входа, а источник раздаёт новое значение веткам по очереди. Первая ветка обновилась, вторая ещё нет — и наружу улетает пара из нового и старого значения, которой никогда не существовало. В UI это обычно не видно, но побочные эффекты видят: например, при смене поиска уходит лишний запрос со старой страницей. Лечу так: лучше всего не разветвлять и считать всё одним \`map\` или составным селектором \`createSelector\`; если ромб уже есть — \`auditTime(0)\` схлопывает синхронную пачку, но делает поток асинхронным. А \`distinctUntilChanged\` сам по себе не помогает. Архитектурно — сигналы: \`computed\` glitch-free, потому что пересчитывается лениво, когда все зависимости уже обновлены.`,
      en: `## In short

A glitch is an **intermediate, inconsistent state** that \`combineLatest\` emits for a split second when its inputs derive from **the same source** (a diamond dependency: one source → two branches → back together).

Analogy: two station boards run off the same clock but refresh one after the other. For an instant the first already reads 12:01 while the second still reads 12:00. A passenger looking at **both at once** sees an **impossible** picture — one that never actually existed.

## How it happens, step by step

1. \`source$\` emits a new value.
2. It travels **synchronously** into the first branch \`a$\`, which emits.
3. \`combineLatest\` reacts **immediately**, because it emits on **any** emission of **any** input.
4. But \`b$\` **has not updated yet** — it will receive the value on the next line.
5. Out comes the pair **[new a, old b]** — that is the glitch.
6. Then \`b$\` emits and \`combineLatest\` produces the second, now correct pair **[new a, new b]**.

\`\`\`text
source:            --1--------2--------
a$ (x):            --1--------2--------
b$ (x*2):          --2--------4--------
combineLatest:     --(1,undef)(1,2)--(2,2)(2,4)--
                                ^ ok    ^ glitch  ^ ok
\`\`\`

## Three solutions

1. **Combine BEFORE branching.** Compute derived values in a single \`map\` after the source instead of splitting and re-joining: \`source$.pipe(map(x => ({ a: x, b: x * 2 })))\`. This is the best fix — a glitch becomes physically impossible.
2. **Collapse the synchronous burst.** \`auditTime(0)\` or \`debounceTime(0)\` after \`combineLatest\` lets only the **last**, consistent emission of a synchronous series through. Add \`distinctUntilChanged\` to drop duplicates.
3. **Use Signals.** Angular's \`computed\` graph is **glitch-free**: a derived value is recomputed once, after all dependencies have settled (a pull model with topological traversal).

## Example

\`\`\`ts
// BAD: split and re-joined — glitch guaranteed
const a$ = source$.pipe(map(x => x));
const b$ = source$.pipe(map(x => x * 2));
combineLatest([a$, b$]).subscribe(console.log);

// GOOD: compute everything at once, no branching
source$.pipe(map(x => ({ a: x, b: x * 2 }))).subscribe(console.log);

// A compromise if the branching already exists
combineLatest([a$, b$]).pipe(auditTime(0)).subscribe(console.log);
\`\`\`

Why: \`auditTime(0)\` does not "wait zero milliseconds" pointlessly — it defers the emission to the next scheduler tick, so the whole synchronous series finishes first and only the final consistent pair escapes.

## What to say in the interview

> A glitch is an intermediate, inconsistent state coming out of \`combineLatest\` when several of its inputs derive from the same source — a diamond dependency. The cause is that \`combineLatest\` emits on every emission of any input, while the source pushes its value into the branches synchronously and one at a time: the first branch has already updated, the second has not, and in between a pair of new and stale values escapes — a combination that never actually existed. There are three fixes. The best is to combine before branching: do all derivations in a single \`map\` after the source. The second is to collapse the synchronous burst with \`auditTime(0)\` or \`debounceTime(0)\` after \`combineLatest\`, so only the last consistent combination gets out. The third is Signals: Angular's \`computed\` graph is glitch-free because it is a pull model with topological traversal, and a derived value is recomputed once after all dependencies settle. That is a strong architectural argument for Signals when derived state gets complex.

## Gotchas

- **Treating glitches as rare exotica** — with NgRx selectors and forms, diamond dependencies show up constantly.
- **Trying to fix it with \`distinctUntilChanged\` alone** — the intermediate pair genuinely *is* different, so it will not be filtered.
- **\`debounceTime(0)\` on a very busy source** — it can swallow legitimate emissions too; \`auditTime(0)\` is safer.
- **Side effects directly in \`subscribe\`** after \`combineLatest\` — a glitch fires an extra HTTP request with inconsistent parameters.
- **Expecting glitches from \`withLatestFrom\`** — there are none: only the primary stream triggers emissions.
- **Follow-up question**: does \`zip\` glitch? No, it pairs by index — but it pays for that with a growing buffer.`
    }
  },
  {
    id: 'rxjs-035',
    category: 'rxjs',
    level: 'Hard',
    tags: ['mergemap', 'backpressure', 'concurrency'],
    question: {
      ru: 'Что такое backpressure в контексте RxJS и как ограничить конкурентность mergeMap?',
      en: 'What is backpressure in the RxJS context and how do you limit mergeMap concurrency?'
    },
    answer: {
      ru: `## В чём суть

Backpressure («обратное давление») — это ситуация, когда **продюсер выдаёт данные быстрее, чем потребитель успевает их обработать**. В RxJS нет встроенного механизма, который сам притормозит источник, поэтому стратегию вы выбираете операторами: выбрасывать лишнее, копить в очередь или ограничивать число одновременных операций. Самый практичный инструмент последнего — второй аргумент \`mergeMap\`.

Аналогия: **раковина, в которую вода льётся быстрее, чем уходит в слив**. Вариантов ровно три: прикрутить кран (ограничить конкурентность), подставить таз и сливать по очереди (буферизовать) или часть воды просто выплеснуть (lossy-стратегии, «с потерями»). Если ничего не делать, вода польётся на пол — в программе это тысяча параллельных запросов, распухшая память и зависший интерфейс.

**Какую проблему решает.** Поток событий в браузере легко становится быстрее обработки: пользователь выбрал 500 файлов для загрузки, WebSocket присылает 200 котировок в секунду, скролл генерирует событие на каждый пиксель. Без явной стратегии \`mergeMap\` запустит все запросы сразу, браузер упрётся в лимит соединений, сервер получит пик нагрузки, а ответы придут в случайном порядке. Понимание backpressure — это умение сказать, **какие данные можно потерять, какие нужно сохранить и сколько работы можно делать одновременно**.

## Словарик терминов

- **Продюсер и потребитель (producer / consumer)** — тот, кто выдаёт значения (источник, сервер, WebSocket), и тот, кто их обрабатывает (ваш код, запрос, отрисовка).
- **Backpressure (обратное давление)** — перегрузка, когда продюсер быстрее потребителя, и способы с ней справиться.
- **Push-модель** — продюсер сам решает, когда отдать значение, потребитель лишь принимает. Так работает RxJS.
- **Pull-модель** — потребитель сам запрашивает следующее значение, когда готов. Так работают итераторы и \`for await\`.
- **Reactive Streams** — стандарт из мира Java (Project Reactor, RxJava \`Flowable\`), где потребитель явно сообщает «дай мне ещё N элементов» через \`request(n)\`.
- **Lossy-стратегия (с потерями)** — осознанно выбрасываем часть значений, потому что важна только свежая информация.
- **Буферизация** — значения складываются в очередь или пачку и обрабатываются позже, ничего не теряется.
- **Конкурентность (concurrency)** — сколько операций выполняется одновременно, например сколько HTTP-запросов «в полёте».
- **Внутренняя подписка (inner subscription)** — подписка, которую операторы \`mergeMap\`, \`concatMap\`, \`switchMap\`, \`exhaustMap\` создают на Observable, возвращённый вашей функцией для каждого значения.
- **\`throttleTime\` / \`auditTime\` / \`sampleTime\` / \`debounceTime\`** — операторы прореживания по времени; различаются тем, какое значение и когда пропускают.
- **\`bufferCount\` / \`bufferTime\`** — собирают значения в массивы-пачки по количеству или по времени.
- **Пул соединений (connection pool)** — ограниченный набор сетевых соединений браузера к одному серверу; для HTTP/1.1 браузеры обычно держат около 6 на хост.

## Как это работает под капотом

Сначала главное: RxJS — это push-модель. Источник вызывает \`next\` когда хочет, и у подписчика **нет канала**, чтобы сказать «помедленнее». Поэтому backpressure в RxJS — не протокол, а набор операторов, которые решают судьбу «лишних» значений.

Ограничение конкурентности в \`mergeMap\` устроено так (упрощённо, по мотивам реального кода RxJS 7):

\`\`\`ts
function mergeMap(project, concurrent = Infinity) {
  return (source) => new Observable((subscriber) => {
    const queue = [];  // значения, которым не хватило «слота»
    let active = 0;    // сколько внутренних подписок сейчас работает

    const run = (value) => {
      active++;
      project(value).subscribe({
        next: (v) => subscriber.next(v),
        complete: () => {
          active--;
          if (queue.length) run(queue.shift()); // освободился слот — берём следующего
        },
      });
    };

    source.subscribe((value) => {
      if (active < concurrent) run(value);
      else queue.push(value);
    });
  });
}
\`\`\`

Что происходит по шагам:

1. Источник выдаёт значение, и \`mergeMap\` проверяет счётчик \`active\`.
2. Если свободных слотов больше нуля, он сразу вызывает вашу функцию \`project\` и подписывается на результат, поэтому \`active\` растёт на единицу.
3. Если все слоты заняты, значение не теряется, а встаёт в **очередь** \`queue\`. Источник при этом **не тормозится** — он продолжает присылать значения, и очередь растёт.
4. Когда какая-то внутренняя подписка завершается, \`active\` уменьшается, и из очереди забирается следующее значение.
5. Поэтому \`mergeMap(fn, 3)\` гарантирует «не больше трёх одновременно», а \`mergeMap(fn, 1)\` превращается в строгую очередь по одному. В RxJS 7 \`concatMap\` буквально так и реализован: \`mergeMap(project, 1)\`.
6. Без второго аргумента \`concurrent = Infinity\`: на тысячу значений сразу создаётся тысяча внутренних подписок.

### Пример 1. Не больше двух загрузок одновременно

\`\`\`ts
import { from, timer, map, mergeMap, defer, finalize } from 'rxjs';

let active = 0;
function uploadFile(id: number) {
  return defer(() => {
    active++;
    console.log(\`start \${id} (в полёте: \${active})\`);
    return timer(100 * id); // имитация загрузки: файл 1 — 100 мс, файл 5 — 500 мс
  }).pipe(
    map(() => \`uploaded \${id}\`),
    finalize(() => active--)
  );
}

from([1, 2, 3, 4, 5]).pipe(
  mergeMap((id) => uploadFile(id), 2)
).subscribe(console.log);
// start 1 (в полёте: 1)
// start 2 (в полёте: 2)
// uploaded 1
// start 3 (в полёте: 2)   ← слот освободился — стартует следующий
// uploaded 2
// start 4 (в полёте: 2)
// uploaded 3
// start 5 (в полёте: 2)
// uploaded 4
// uploaded 5
\`\`\`

\`defer\` (создаёт Observable лениво, в момент подписки) нужен, чтобы увидеть, когда загрузка **реально** стартует. Счётчик никогда не превышает 2: третий файл ждёт в очереди, пока не закончится первый. Без второго аргумента все пять стартовали бы одновременно.

### Пример 2. Пять операторов на одном потоке

Один и тот же источник: значения 0…4 приходят каждые 100 мс, обработка каждого занимает 250 мс.

\`\`\`ts
import { interval, take, timer, map, switchMap, exhaustMap, concatMap, mergeMap } from 'rxjs';

const src$ = interval(100).pipe(take(5));                       // 0..4 на 100, 200, ... 500 мс
const work = (v: number) => timer(250).pipe(map(() => \`done \${v}\`));

src$.pipe(switchMap(work));     // done 4 (~750 мс)
src$.pipe(exhaustMap(work));    // done 0 (~350), done 3 (~650)
src$.pipe(concatMap(work));     // done 0 (~350), 1 (~600), 2 (~850), 3 (~1100), 4 (~1350)
src$.pipe(mergeMap(work));      // done 0..4 на ~350, 450, 550, 650, 750
src$.pipe(mergeMap(work, 2));   // done 0 (~350), 1 (~450), 2 (~600), 3 (~700), 4 (~850)
\`\`\`

Видно три философии: \`switchMap\` и \`exhaustMap\` **теряют** работу, \`concatMap\` **не теряет, но копит** (последний результат пришёл через 1350 мс), а \`mergeMap(work, 2)\` — компромисс: ничего не потеряно и закончили к 850 мс, при этом одновременно шло не больше двух операций.

### Стратегия 1. Отбрасывать лишнее: \`throttleTime\`

Подходит, когда промежуточные значения не важны. Для четырёх операторов времени возьмём общий источник: значения 0…9 каждые 100 мс.

\`\`\`ts
import { interval, take, throttleTime } from 'rxjs';

const src$ = interval(100).pipe(take(10)); // 0..9 на 100, 200, ... 1000 мс

src$.pipe(throttleTime(350)).subscribe(console.log);
// 0   (100 мс)  ← пропустил первое и закрылся на 350 мс
// 4   (500 мс)
// 8   (900 мс)
\`\`\`

\`throttleTime\` пропускает **первое** значение и игнорирует всё остальное до конца окна. Хорош для кнопок и событий, где важна мгновенная реакция на первое действие.

### \`auditTime\` — последнее значение в конце окна

\`\`\`ts
src$.pipe(auditTime(350)).subscribe(console.log);
// 3   (~450 мс)  ← первое значение открыло окно, в конце выдано самое свежее
// 7   (~850 мс)
// 9   (~1250 мс) ← даже после завершения источника окно дорабатывает
\`\`\`

\`auditTime\` отдаёт **самое свежее** значение в конце окна. Идеален для отрисовки: обновить график не чаще раза в N мс, но всегда последним состоянием.

### \`sampleTime\` — снимок по таймеру

\`\`\`ts
src$.pipe(sampleTime(320)).subscribe(console.log);
// 2   (320 мс)
// 5   (640 мс)
// 8   (960 мс)   ← при завершении источника дополнительного значения нет
\`\`\`

\`sampleTime\` работает по собственному независимому таймеру и на каждом тике берёт последнее значение (если за период было новое). Удобен для «опроса» состояния: показать текущую скорость загрузки раз в секунду.

### \`debounceTime\` — ждать паузы

\`\`\`ts
src$.pipe(debounceTime(150)).subscribe(console.log);
// 9   (1000 мс) ← пауза в 150 мс так и не наступила, значение вышло только при complete
\`\`\`

\`debounceTime\` выдаёт значение, только если после него была тишина заданной длины. Для поиска по вводу это идеально, а как средство от backpressure на **непрерывном** потоке — нет: тишина не наступает, и до завершения не выходит ничего.

### \`switchMap\` — отменять старое

Из примера 2: каждое новое значение **отменяет** (отписывается от) предыдущую внутреннюю операцию. Для HTTP это означает отмену запроса. Это lossy-стратегия для случаев, когда нужен только ответ на последний запрос: автодополнение, смена фильтра, переход между карточками.

### \`exhaustMap\` — игнорировать новое, пока занят

Тоже из примера 2: пока внутренняя операция идёт, новые значения **выбрасываются**. Классика — защита кнопки «Сохранить» или «Оплатить» от двойного клика: второй клик во время запроса просто игнорируется.

### Стратегия 2. Копить: \`bufferCount\` и \`bufferTime\`

Когда терять нельзя, но обрабатывать по одному дорого, значения собирают в пачки.

\`\`\`ts
import { interval, take, bufferCount, bufferTime } from 'rxjs';

const src$ = interval(100).pipe(take(10));

src$.pipe(bufferCount(3)).subscribe((b) => console.log(JSON.stringify(b)));
// [0,1,2]
// [3,4,5]
// [6,7,8]
// [9]       ← недозаполненная пачка выходит при завершении

src$.pipe(bufferTime(270, null, 3)).subscribe((b) => console.log(JSON.stringify(b)));
// [0,1]     ← сработал таймер (270 мс)
// [2,3,4]   ← сработал лимит размера раньше таймера
// [5,6]
// [7,8,9]
// []        ← при завершении выходит и пустая пачка
\`\`\`

\`bufferTime(ms, null, maxSize)\` закрывает пачку по тому, что случится раньше: истечёт время или наберётся \`maxSize\`. Без третьего аргумента размер пачки ничем не ограничен. Пустые массивы нужно отфильтровывать.

### \`concatMap\` — очередь, которая может расти

\`concatMap\` ничего не теряет и сохраняет порядок, но если источник **стабильно** быстрее обработки, очередь растёт без предела:

\`\`\`ts
import { interval, timer, tap, concatMap, take } from 'rxjs';

let produced = 0;
let processed = 0;
interval(70).pipe(
  tap(() => produced++),
  concatMap(() => timer(200).pipe(tap(() => processed++))),
  take(3)
).subscribe(() => console.log(\`обработано \${processed}, ещё не обработано \${produced - processed}\`));
// обработано 1, ещё не обработано 2
// обработано 2, ещё не обработано 4
// обработано 3, ещё не обработано 6
\`\`\`

Каждые 200 мс обрабатывается одно значение, а приходит почти три — хвост растёт линейно. Через час на таком потоке это сотни тысяч объектов в памяти.

### Стратегия 3. \`mergeMap(project, concurrent)\` — прикрутить кран

Второй аргумент задаёт максимум **одновременных** внутренних подписок, остальные ждут в очереди. Это золотая середина для сетевых операций: параллелизм есть, но управляемый.

\`\`\`ts
// не более 3 параллельных загрузок
from(fileIds).pipe(
  mergeMap((id) => uploadFile(id), 3)
).subscribe();
\`\`\`

Без лимита \`mergeMap\` на тысяче id откроет **тысячу** одновременных запросов: при HTTP/1.1 браузер выполняет около 6 на хост, остальные ждут в его внутренней очереди; при HTTP/2 сервер получит тысячу запросов разом. Полезная эквивалентность для памяти: \`mergeMap(fn, 1)\` — это в точности \`concatMap\`.

### Лимит не тормозит источник

Важно понимать, **что именно** ограничивает \`concurrent\`: число активных операций, но не скорость источника.

\`\`\`ts
import { from, timer, map, mergeMap } from 'rxjs';

function* ids() {
  for (let i = 1; i <= 4; i++) {
    console.log('produce', i);
    yield i;
  }
}

from(ids()).pipe(
  mergeMap((id) => timer(100).pipe(map(() => \`done \${id}\`)), 1)
).subscribe(console.log);
// produce 1
// produce 2
// produce 3
// produce 4   ← генератор выкачан целиком сразу
// done 1
// done 2
// done 3
// done 4
\`\`\`

Генератор мог бы отдавать значения лениво, но \`from\` прокручивает его синхронно до конца, а \`mergeMap\` складывает всё в очередь. С четырьмя id это неважно, а с миллионом строк CSV — вопрос памяти.

### Настоящий pull: асинхронные итераторы

Для сравнения — как выглядит настоящее обратное давление в JS. В \`for await\` потребитель сам просит следующее значение, только когда готов:

\`\`\`js
async function* pages() {
  for (let p = 1; p <= 3; p++) {
    console.log('fetch page', p);
    yield p;
  }
}

for await (const p of pages()) {
  await new Promise((r) => setTimeout(r, 100)); // медленная обработка
  console.log('processed', p);
}
// fetch page 1
// processed 1
// fetch page 2   ← следующая страница запрашивается только после обработки
// processed 2
// fetch page 3
// processed 3
\`\`\`

Продюсер физически не может убежать вперёд. Именно этого протокола «дай ещё» нет в RxJS, и именно его предоставляет Reactive Streams через \`request(n)\`. Если источник можно опрашивать (страницы API, курсор, файл), иногда честнее построить ленивую цепочку, чем буферизовать push-поток.

### Где это применяется на практике

- **Массовая загрузка файлов**: \`mergeMap(upload, 3)\` — быстро, но без 500 параллельных запросов, плюс прогресс по каждому файлу.
- **Массовые операции в data grid**: удалить или обновить 300 выбранных строк, когда API принимает только по одной, — \`mergeMap(..., 4)\` вместо шквала запросов.
- **Котировки и телеметрия по WebSocket**: сотни сообщений в секунду, а таблице нужно обновляться раз в 100–200 мс — \`auditTime\` или \`sampleTime\` перед отрисовкой.
- **Аналитика и логирование**: \`bufferTime(5000, null, 50)\` + \`filter\` пустых + \`concatMap(send)\` — меньше запросов, ничего не теряется.
- **Поиск и фильтры**: \`debounceTime\` на вводе + \`switchMap\` на запросе — устаревшие ответы отменяются.
- **Кнопки с побочными эффектами**: \`exhaustMap\` на «Сохранить» и «Оплатить» против двойной отправки.

## Важные нюансы и подводные камни

- **\`mergeMap\` без лимита на быстром источнике.** Тысячи параллельных запросов, исчерпание пула соединений, пик нагрузки на сервере и ответы в случайном порядке.
- **\`concatMap\` как «безопасный вариант».** Он не теряет значения, но при постоянной перегрузке очередь растёт бесконечно — это скрытая утечка памяти, а пользователь видит результаты с всё большей задержкой.
- **Лимит конкурентности не защищает память.** \`mergeMap(fn, 3)\` бережёт сеть и сервер, но значения, ожидающие слота, всё равно копятся во внутренней очереди без ограничения.
- **\`bufferTime\` без ограничения размера.** На всплеске в одну пачку попадёт всё подряд; передавайте \`maxBufferSize\` третьим аргументом и фильтруйте пустые массивы.
- **Думать, что RxJS «сам разрулит».** По умолчанию никакого backpressure нет: стратегию выбираете вы, и выбор — это бизнес-решение «что можно потерять».
- **\`debounceTime\` как решение backpressure на непрерывном потоке.** Тишина не наступает — не выходит ничего до завершения источника. Для прореживания нужен \`auditTime\` или \`throttleTime\`.
- **Потери должны быть осознанными.** \`switchMap\` на сохранении данных или \`exhaustMap\` на логировании событий тихо выбросят то, что выбрасывать нельзя.
- **Отличие от Reactive Streams.** Там потребитель запрашивает N элементов (\`request(n)\`), а продюсер не имеет права прислать больше. В RxJS такого протокола нет — только операторы поверх push-модели.

**Плюсы:** стратегия явная и видна прямо в коде; операторы комбинируются (пачки + очередь, прореживание + отмена); \`mergeMap(fn, n)\` даёт управляемый параллелизм одной цифрой.
**Минусы:** нет настоящего pull-протокола, источник нельзя притормозить; любые очереди (\`concatMap\`, лимит \`mergeMap\`, буферы) растут без предела, если о них не думать; lossy-операторы легко поставить туда, где терять нельзя.

## Как это спрашивают на собеседовании

**Главный вывод:** backpressure — это когда продюсер быстрее потребителя; в RxJS нет встроенного протокола, поэтому вы явно выбираете: терять (\`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`switchMap\`, \`exhaustMap\`), копить (\`bufferTime\`, \`concatMap\`) или ограничивать параллелизм вторым аргументом \`mergeMap\`. \`mergeMap(fn, 1)\` — это \`concatMap\`.

Типичные формулировки: «Как загрузить 500 файлов, не убив сервер?», «Что будет, если в \`mergeMap\` прилетит тысяча значений?», «Есть ли в RxJS backpressure?».

Что могут спросить следом:

- *Чем \`mergeMap(fn, 1)\` отличается от \`concatMap\`?* — Ничем: в RxJS 7 \`concatMap\` реализован как \`mergeMap(project, 1)\`.
- *Чем \`throttleTime\` отличается от \`auditTime\`?* — \`throttleTime\` пропускает первое значение окна, \`auditTime\` — последнее, в конце окна.
- *Почему \`concatMap\` опасен на быстром источнике?* — Его очередь растёт без ограничения, пока источник быстрее обработки.
- *Чем RxJS отличается от Reactive Streams?* — Там потребитель запрашивает N элементов через \`request(n)\`, в RxJS только push и операторы.
- *Ограничивает ли \`mergeMap(fn, 3)\` память?* — Нет, только число одновременных операций; ожидающие значения копятся в очереди.

### Ответ на 1 минуту

> Backpressure — это когда продюсер выдаёт значения быстрее, чем потребитель их обрабатывает. В RxJS, в отличие от Reactive Streams, где потребитель запрашивает N элементов, такого протокола нет: это push-модель, поэтому стратегию я выбираю операторами. Первая — осознанные потери: \`throttleTime\`, \`auditTime\`, \`sampleTime\`, а также \`switchMap\`, который отменяет устаревшую операцию, и \`exhaustMap\`, который игнорирует новое, пока занят. Вторая — буферизация: \`bufferTime\` с лимитом размера или \`concatMap\`, но если источник стабильно быстрее, очередь растёт. Третья, самая практичная для сети, — второй аргумент \`mergeMap\`: например, грузить 500 файлов максимум по три параллельно. Без лимита \`mergeMap\` запустит все запросы сразу и упрётся в пул соединений. Нюансы: \`mergeMap(fn, 1)\` — это \`concatMap\`, и лимит не тормозит источник, ожидающие значения всё равно копятся в памяти.`,
      en: `## In short

Backpressure is when the **producer emits faster than the consumer can process**.

Analogy: **a sink filling faster than it drains**. There are exactly three options: turn the tap down (limit concurrency), put a basin under it and work through the queue (buffer), or simply tip some water away (lossy strategies).

An important fact: classic RxJS has **no** built-in reactive-streams backpressure like Project Reactor, where the consumer requests N items. Instead it gives you operators with which **you** choose the strategy.

## Three strategies — when to use which

**1. Lossy — drop the excess.** Right when intermediate values do not matter:

- \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\` — let only some values through;
- \`switchMap\` — cancels the previous operation;
- \`exhaustMap\` — ignores new ones while busy (double-click protection on a button).

**2. Buffering — accumulate and work through.** Right when nothing may be lost:

- \`bufferTime\`, \`bufferCount\` — collect values into batches;
- \`concatMap\` — builds a queue, but remember: if the source is consistently faster than processing, the **buffer grows** — a memory risk.

**3. Limiting concurrency — the sweet spot.** \`mergeMap(project, concurrency)\`: the second argument caps the number of **simultaneous** inner subscriptions; the rest wait in a queue.

## Example

\`\`\`ts
// at most 3 parallel uploads at once
from(fileIds).pipe(
  mergeMap(id => uploadFile(id), 3)
).subscribe();
\`\`\`

Why: without the second argument, \`mergeMap\` over a thousand ids opens **a thousand** simultaneous requests — the browser hits its connection limit and the server may fall over. A handy fact to remember: \`mergeMap(fn, 1)\` is exactly \`concatMap\`, a one-at-a-time queue.

## What to say in the interview

> Backpressure is when the producer emits values faster than the consumer can process them. Classic RxJS has no built-in reactive-streams backpressure like Project Reactor, where the consumer requests a specific number of items; instead you choose the strategy explicitly with operators, and there are three. First, lossy, deliberately dropping values: \`throttleTime\`, \`auditTime\`, \`sampleTime\`, \`debounceTime\`, plus \`switchMap\`, which cancels the stale operation, and \`exhaustMap\`, which ignores new ones while busy. Second, buffering: \`bufferTime\` and \`bufferCount\` collect values into batches and \`concatMap\` queues them up — but if the source is consistently faster than processing, the queue grows into a memory risk. Third and most practical, limiting concurrency through \`mergeMap\`'s second argument: an unbounded \`mergeMap\` on a fast source easily spawns thousands of concurrent HTTP requests, exhausting the connection pool. And a useful equivalence: \`mergeMap\` with a concurrency of one is the same as \`concatMap\`.

## Gotchas

- **Unbounded \`mergeMap\`** on a fast source — thousands of parallel requests and an exhausted connection pool.
- **Treating \`concatMap\` as "the safe option"** — it loses nothing, but under sustained overload the queue grows without bound.
- **\`bufferTime\` with no size cap** — a burst dumps everything into the buffer and memory goes with it.
- **Assuming RxJS "handles it"** — it does not; you choose the strategy, and the default is no backpressure at all.
- **\`debounceTime\` as a backpressure fix** on a continuous stream — the silence never comes and nothing is emitted at all.
- **Follow-up question**: how does RxJS differ from reactive streams? There the consumer requests N items via a pull-based request protocol; RxJS has no such protocol, only operators layered on a push model.`
    }
  },
  {
    id: 'rxjs-036',
    category: 'ngrx',
    level: 'Hard',
    tags: ['architecture', 'state-management', 'patterns'],
    question: {
      ru: 'Как выбрать подход к state management в Angular-приложении? Сравните уровни сложности.',
      en: 'How do you choose a state management approach in an Angular app? Compare complexity levels.'
    },
    answer: {
      ru: `## В чём суть

Главная мысль: **не всё состояние одинаково**. Флаг «открыт ли дропдаун», список заказов с сервера и текущий пользователь живут по разным законам, и для каждого нужен свой инструмент. Архитектурный навык — подобрать инструмент под масштаб, а не тащить NgRx во все проекты подряд и не размазывать всё по случайным сервисам.

Аналогия: вы не берёте фуру, чтобы отвезти один пакет из магазина, и не грузите шкаф на велосипед. **Транспорт выбирают под груз.** Со стейт-менеджментом так же: сигнал в компоненте — велосипед, сервис — легковушка, SignalStore — микроавтобус, NgRx — фура с накладными и GPS-трекером.

**Какую проблему решает.** Ошибиться можно в обе стороны. Переусложнить: три файла NgRx ради одного булева флага, новичок неделю разбирается, где что меняется. Недоусложнить: десяток сервисов с публичными \`Subject\`, где каждый пишет куда хочет, данные расходятся, а отладка превращается в расследование. Осознанный выбор даёт минимум кода сегодня и понятный путь роста завтра.

## Словарик терминов

- **Состояние (state)** — любые данные, от которых зависит, что показывает интерфейс: от флага «меню открыто» до списка заказов.
- **Локальное UI-состояние** — нужно одному компоненту и умирает вместе с ним: активная вкладка, раскрыт ли блок.
- **Серверное состояние (server state)** — копия данных с бэкенда; у неё есть «настоящий» владелец — сервер, поэтому её главная проблема — свежесть (кэш, повторные запросы, инвалидация).
- **Глобальное клиентское состояние** — создаётся на клиенте и нужно многим частям приложения: текущий пользователь, тема, корзина.
- **Производное состояние (derived state)** — то, что вычисляется из другого состояния: сумма корзины, число выбранных строк. Его не хранят, а вычисляют.
- **Источник истины (single source of truth)** — единственное место, где лежит значение; все остальные его только читают.
- **Boilerplate (шаблонный код)** — обязательный «обвязочный» код, который пишется ради инструмента, а не ради задачи.
- **Signal / \`computed\` / \`linkedSignal\`** — сигналы Angular: хранимое значение, вычисляемое из других и вычисляемое, но с возможностью переопределить вручную.
- **Service with a Subject** — сервис, который хранит состояние в \`BehaviorSubject\` или сигнале и отдаёт его наружу только для чтения.
- **SignalStore** — store из \`@ngrx/signals\`, собранный из функций \`withState\`, \`withComputed\`, \`withMethods\`, \`withEntities\`.
- **NgRx Store / NGXS** — полноценный Redux: actions, reducers, effects, селекторы, единое дерево состояния.
- **Redux DevTools и time-travel** — расширение браузера, показывающее журнал всех actions и состояние после каждого; time-travel — «перемотка» приложения к любому прошлому шагу.
- **Кэш, инвалидация, дедупликация** — хранение ответов сервера, пометка их устаревшими и склейка одинаковых одновременных запросов в один.
- **\`resource\` / \`httpResource\`** — экспериментальные API Angular для загрузки данных в сигналы со статусами загрузки.

## Как это работает под капотом

Выбор — это не угадывание, а последовательность вопросов к каждому куску данных:

1. **Кому оно нужно?** Одному компоненту → локальное. Нескольким компонентам одной фичи → сервис или store фичи. Многим фичам → глобальный store.
2. **Откуда оно берётся?** С сервера → это серверное состояние, ему нужен кэш, а не «ещё одно поле в store». Из адресной строки (фильтры, страница) → держите его в URL, роутер и есть его хранилище. Из формы → Reactive Forms уже хранят его сами.
3. **Можно ли его вычислить?** Если да, не храните — делайте \`computed\` или селектор. Хранимое производное значение обязательно рано или поздно рассинхронизируется.
4. **Насколько сложны изменения?** Простые присваивания → сигнал или сервис. Много асинхронности, гонок, отмен → нужны RxJS-эффекты (\`switchMap\`, \`exhaustMap\`) и место для них.
5. **Нужен ли журнал изменений?** Аудит, сложная отладка, много команд → аргумент за actions и DevTools.
6. **Начните с самой низкой подходящей ступени** и поднимайтесь, только когда боль реальна: одно и то же состояние дублируется в трёх сервисах, никто не понимает, кто его меняет, гонки запросов повторяются.

Дальше — та же лестница в коде, снизу вверх.

### Ступень 1. Локальное состояние: поле или сигнал в компоненте

\`\`\`ts
@Component({
  template: \`
    <button (click)="isOpen.update(v => !v)">Фильтры</button>
    @if (isOpen()) { <app-filters /> }
  \`,
})
export class Toolbar {
  isOpen = signal(false);
}
// isOpen.update(v => !v) → isOpen() === true
\`\`\`

Ноль boilerplate, состояние умирает вместе с компонентом. Начинайте всегда отсюда: большая часть UI-состояния никогда не должна покидать свой компонент.

### \`signal\`, \`computed\`, \`linkedSignal\` — базовые кирпичи

\`\`\`ts
const items = signal([{ price: 100, qty: 2 }]);
const total = computed(() => items().reduce((s, i) => s + i.price * i.qty, 0));
console.log(total());                      // 200
items.update(a => [...a, { price: 50, qty: 1 }]);
console.log(total());                      // 250

const options = signal(['Standard', 'Express']);
const selected = linkedSignal(() => options()[0]);
selected.set('Express');
console.log(selected());                   // Express — выбрал пользователь
options.set(['Pickup', 'Courier']);
console.log(selected());                   // Pickup — список сменился, выбор сбросился
\`\`\`

\`signal\` хранит значение, \`computed\` вычисляет производное и кэширует его до изменения зависимостей, \`linkedSignal\` (стабилен с Angular 20) — производное, которое пользователь может переопределить, но которое сбрасывается при смене источника. Этих трёх хватает для удивительно большого числа задач.

### Ступень 2. Сервис с сигналами или \`BehaviorSubject\`

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  #items = signal<Item[]>([]);
  readonly items = this.#items.asReadonly();
  readonly total = computed(() => this.#items().reduce((s, i) => s + i.price * i.qty, 0));
  add(item: Item) { this.#items.update(arr => [...arr, item]); }
}

cart.add({ id: 1, price: 100, qty: 2 });
cart.add({ id: 2, price: 50, qty: 1 });
console.log(cart.total());          // 250
console.log(typeof cart.items.set); // undefined — снаружи только чтение
\`\`\`

Классический «service with a Subject», только на сигналах. Есть инкапсуляция (приватное поле, \`asReadonly()\`), производное значение и иммутабельное обновление — главные достоинства NgRx без actions и reducer'ов. Этого достаточно для среднего разделяемого состояния внутри фичи. В RxJS-стиле то же самое делают через \`BehaviorSubject\` и \`asObservable()\`.

### Ступень 3. SignalStore из \`@ngrx/signals\`

\`\`\`ts
export const CartStore = signalStore(
  withState({ items: [] as Item[], coupon: null as string | null }),
  withComputed(({ items, coupon }) => ({
    subtotal: computed(() => items().reduce((s, i) => s + i.price * i.qty, 0)),
    total: computed(() => {
      const sub = items().reduce((s, i) => s + i.price * i.qty, 0);
      return coupon() === 'SALE10' ? sub * 0.9 : sub;
    }),
  })),
  withMethods((store) => ({
    add(item: Item) { patchState(store, s => ({ items: [...s.items, item] })); },
    applyCoupon(coupon: string) { patchState(store, { coupon }); },
  }))
);
// add(200), add(50), applyCoupon('SALE10') → subtotal() = 250, total() = 225
\`\`\`

Когда сервисов с самодельными паттернами становится много, SignalStore даёт **единые правила**: состояние только через \`patchState\`, производное через \`withComputed\`, коллекции через \`withEntities\`, RxJS-логика через \`rxMethod\`, переиспользуемые куски — кастомными фичами. По умолчанию состояние защищено: менять его снаружи store нельзя. Store можно повесить на \`root\` или в \`providers\` компонента — тогда он живёт и умирает вместе с экраном.

### Ступень 4. NgRx Store (или NGXS) — полный Redux

\`\`\`ts
// событие → reducer → новое состояние → селекторы → UI; побочка — в effects
export const CartActions = createActionGroup({
  source: 'Cart Page',
  events: { 'Item Added': props<{ item: Item }>(), 'Checkout Clicked': emptyProps() },
});
export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(initialState,
    on(CartActions.itemAdded, (s, { item }) => ({ ...s, items: [...s.items, item] }))),
});
checkout$ = createEffect(() => this.actions$.pipe(
  ofType(CartActions.checkoutClicked),
  exhaustMap(() => this.api.checkout().pipe(
    map(order => CheckoutApiActions.success({ order })),
    catchError(e => of(CheckoutApiActions.failure({ error: e.message })))))));
\`\`\`

Каждое изменение — именованное событие в журнале, побочные эффекты изолированы, Redux DevTools показывают историю и умеют time-travel. Это окупается в больших приложениях с многими командами, сложной асинхронностью и требованием аудита. Цена — больше кода на каждую фичу и порог входа для новичков. NGXS даёт ту же модель с меньшим количеством файлов.

### Отдельная полка: серверное состояние

\`\`\`ts
// кэш справочника: один запрос на всё приложение
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  readonly currencies$ = this.http.get<string[]>('/api/currencies').pipe(
    shareReplay({ bufferSize: 1, refCount: false })
  );
}
// два одновременных подписчика + один поздний → requests === 1
\`\`\`

Данные с сервера — это кэш чужих данных, а не «ваше» состояние. Им нужны дедупликация, повторные попытки, инвалидация, фоновое обновление. Простейший кэш — \`shareReplay\`, как выше. Сигнальная альтернатива — \`httpResource\` и \`resource\` (в Angular 21 помечены \`@experimental\`): загрузка по сигналу-параметру со статусами \`isLoading\`, \`error\`, \`value\`. Для сложных сценариев есть \`@tanstack/angular-query-experimental\` — порт TanStack Query; название пакета само говорит о статусе. Складывать всё это вручную в NgRx — значит переписывать то, что эти инструменты уже решили.

### Отдельная полка: URL и формы

\`\`\`ts
// фильтры и пагинация — в адресе: ссылкой можно поделиться, «назад» работает
this.router.navigate([], { queryParams: { status: 'open', page: 2 }, queryParamsHandling: 'merge' });
// чтение: с withComponentInputBinding() параметр приходит прямо в input компонента
status = input<string>();
\`\`\`

Состояние, которое должно пережить перезагрузку и копирование ссылки, живёт в URL — роутер и есть его store. Состояние формы (значения, \`dirty\`, ошибки валидации) уже хранит \`FormGroup\`; дублировать его в store нужно только для черновиков, которые должны пережить уход со страницы.

### Как выбрать

- **Локальное UI-состояние** → сигнал в компоненте. Всегда первый вариант.
- **Производное** → \`computed\` или селектор, никогда не храните отдельно.
- **Данные с сервера** → кэш: сервис с \`shareReplay\`, \`httpResource\`, TanStack Query; в глобальный store только то, что действительно редактируется на клиенте.
- **Фильтры, вкладки, пагинация, которые должны жить в ссылке** → URL.
- **Общее состояние фичи** → сервис с сигналами; если сервисов много или нужны коллекции и \`rxMethod\` → SignalStore.
- **Глобальное состояние большого приложения** с многими командами, сложной асинхронностью и аудитом → NgRx Store (или NGXS).
- **Критерии**: масштаб команды, сложность асинхронности, нужен ли журнал и time-travel, цена boilerplate. Не платите за структуру, пока боль не стала реальной.

### Где это применяется на практике

- **Корпоративный портал с гридами**: сортировка и фильтры — в URL, выбранные строки — сигнал в компоненте грида, справочники — кэш с \`shareReplay\`, права пользователя — глобальный store.
- **Интернет-магазин**: корзина — SignalStore в \`root\`, каталог — серверный кэш, раскрытые фильтры — локальные сигналы.
- **Финтех-приложение с аудитом**: NgRx Store, потому что каждое действие пользователя должно быть именованным событием в журнале, а гонки котировок решаются эффектами.
- **Пошаговый мастер оформления**: SignalStore в \`providers\` компонента-мастера — состояние живёт ровно столько, сколько открыт мастер.
- **Миграция старого проекта**: фасад фиксирует API для компонентов, а реализацию по одной фиче переносят с NgRx на SignalStore или наоборот.

## Важные нюансы и подводные камни

- **NgRx «потому что энтерпрайз».** Boilerplate платится сразу, а польза появляется только на масштабе. Для маленькой фичи это три файла ради одного флага.
- **Серверный кэш в глобальном store.** Вы вручную пишете инвалидацию, повторы и дедупликацию, которые уже решены кэширующими инструментами, и получаете устаревшие данные после чужих правок.
- **Локальное UI-состояние в глобальном store.** «Открыт ли дропдаун» в NgRx — классический признак переусложнения.
- **Смешение источников истины.** Часть данных в store, часть в сервисе, часть в поле компонента — рассинхрон гарантирован. У каждого значения должен быть один владелец.
- **Хранимое производное состояние.** Поле \`total\` рядом с \`items\` разойдётся с ними при первом же забытом обновлении; используйте \`computed\` или селектор.
- **«Signals заменили state-менеджеры».** Сигналы закрывают хранение и производные значения, но не оркестрацию асинхронности, не журнал изменений и не единые правила для большой команды.
- **Публичные \`Subject\` и \`WritableSignal\` в сервисах.** Если писать может кто угодно, это уже не сервис состояния, а глобальная переменная. Отдавайте наружу \`asReadonly()\` или \`asObservable()\`.
- **Подниматься по лестнице дешевле, чем спускаться.** Начать с сервиса и вырасти до SignalStore — пара часов; вынуть NgRx из проекта — недели.
- **Как мигрировать вверх.** Фасад или SignalStore с тем же публичным API позволяют сменить реализацию, не переписывая компоненты.

**Плюсы:** осознанный выбор даёт минимум кода для простых задач, ясные правила для сложных, предсказуемый путь роста и меньше рассинхронизаций, потому что у каждого вида данных свой подходящий дом.
**Минусы:** несколько подходов в одном проекте требуют договорённостей в команде (что куда класть), а граница между ступенями размыта — без код-ревью проект легко скатывается в смесь всех инструментов сразу.

## Как это спрашивают на собеседовании

**Главный вывод:** сначала классифицируйте состояние — локальное UI, серверное, URL, форма, глобальное клиентское, — а затем берите самую низкую подходящую ступень: сигнал → сервис → SignalStore → NgRx Store. Поднимайтесь, только когда боль реальна.

Типичные формулировки: «Как выбрать подход к state management?», «Когда нужен NgRx, а когда хватит сервиса?», «Заменили ли сигналы NgRx?», «Где хранить данные с сервера?».

Что могут спросить следом:

- *Когда NgRx точно оправдан?* — Большое приложение, много команд, сложная асинхронность с гонками, требование аудита и time-travel отладки.
- *Почему не класть серверные данные в store?* — Это кэш с чужим владельцем: ему нужны инвалидация, повторы и дедупликация, которые кэширующие инструменты дают из коробки.
- *Чем SignalStore лучше сервиса с сигналами?* — Единые правила для команды, защищённое состояние, готовые \`withEntities\` и \`rxMethod\`, переиспользуемые фичи.
- *Где хранить фильтры таблицы?* — В URL, если ими делятся ссылкой и они должны пережить перезагрузку; иначе — в сервисе или store фичи.
- *Как мигрировать с одной ступени на другую?* — Зафиксировать API фасадом или SignalStore и переносить реализацию по одной фиче.

### Ответ на 1 минуту

> Я начинаю с того, что состояние бывает разного вида, и смешивать их — главная ошибка. Локальное UI-состояние живёт в сигнале компонента. Серверное — это кэш чужих данных, ему нужен кэширующий слой: сервис с \`shareReplay\`, \`httpResource\` или TanStack Query, а не ручной код в глобальном store. Фильтры и пагинация, которыми делятся ссылкой, живут в URL, данные формы — в \`FormGroup\`, а производные значения я не храню, а вычисляю через \`computed\`. Для оставшегося клиентского состояния лестница такая: сигнал в компоненте, сервис с сигналами или \`BehaviorSubject\`, SignalStore, когда нужны единые правила и коллекции, и NgRx Store или NGXS для больших приложений с многими командами, сложной асинхронностью и требованием аудита. Критерии — масштаб, асинхронность, нужен ли журнал и цена boilerplate. Правило простое: начинать снизу и подниматься, только когда боль реальна.`,
      en: `## In short

The core idea: **not all state is the same**, and the architectural skill is matching the tool to the scale rather than dragging NgRx into every project.

Analogy: you do not hire an articulated lorry to bring one bag home from the shop. Nor do you move furniture on a bicycle. **You pick the vehicle to fit the load** — state management works exactly the same way.

First, separate the **kinds** of state:

- **Local UI** (is the dropdown open, which tab is active) — a component field or a signal.
- **Server / cache** (API data) — often better served by a cache like \`@tanstack/query\` or a service with \`shareReplay\`.
- **Global client** (current user, theme, cart) — a store.

## The complexity ladder — four rungs

1. **Local fields / Signals.** The simplest. Isolated component state, zero boilerplate. Always start here.
2. **A service with a \`BehaviorSubject\` or signals.** The classic "service with a Subject": it encapsulates state and exposes an Observable or signal. Enough for moderate shared state inside a feature module.
3. **\`@ngrx/signals\` SignalStore.** A structured store with \`withComputed\`, \`withMethods\`, \`withEntities\` — when a plain service is no longer enough but Redux ceremony is overkill.
4. **NgRx Store / NGXS.** Full Redux: actions, reducers, effects, DevTools, time travel. For large applications with complex, widely shared state, several teams, and a requirement to audit changes.

## Choice criteria

- **Scale and team**: more people and features → stricter structure.
- **Async complexity**: lots of races and cancellations → you need RxJS effects.
- **Need for auditing and time-travel DevTools** → an argument for NgRx.
- **The cost of boilerplate**: do not pay it until the pain is real.

## Example

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<Item[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this.items.update(arr => [...arr, item]); }
}
\`\`\`

Why: this is rung two of the ladder, and for a mid-sized shop's cart it is plenty. There is encapsulation, a derived value, and an immutable update — everything NgRx would give you, minus actions, reducers, and three extra files.

## What to say in the interview

> I start from the fact that state comes in different kinds, and mixing them is the main mistake. Local UI state belongs in a component field or a signal. Server state is a cache of API responses, better handled by a caching layer in the spirit of \`@tanstack/query\`, or a service with \`shareReplay\`, than pushed into a global store. Only genuinely global client state — the current user, the theme, the cart — really belongs in a store. From there I climb a ladder: local fields and Signals with zero boilerplate; a service with a \`BehaviorSubject\` for shared state within a feature module; \`@ngrx/signals\` SignalStore when a service is not enough but Redux is overkill; and full NgRx or NGXS with actions, reducers, effects, and DevTools for large applications with auditing requirements. My criteria are scale and team size, async complexity, the need for auditing and time travel, and the cost of boilerplate. The rule is simple: start simple and climb only when the pain is real, because climbing back down later costs far more.

## Gotchas

- **NgRx "because enterprise"** — the boilerplate is paid immediately, the benefit only shows up at scale.
- **Putting a server cache in the store** — you hand-roll invalidation, retries, and deduplication that caching libraries already solved.
- **Local UI state in the global store** — three files for one boolean flag.
- **Mixing sources of truth**: some in the store, some in a service, some in a component field — drift is guaranteed.
- **"Signals replaced state managers"** — they cover storage and derivation, but not async orchestration or auditability.
- **Follow-up question**: how do you migrate up the ladder? A facade or a SignalStore is precisely what lets you swap the implementation without rewriting components.`
    }
  }
];
