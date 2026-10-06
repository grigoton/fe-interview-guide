import { InterviewQuestion } from '../interfaces/question.interface';

export const ARCHITECTURE_TESTING_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'arch-041',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['clean-architecture', 'hexagonal', 'ddd'],
    question: {
      ru: 'Как применить чистую/гексагональную архитектуру и DDD-слоение во фронтенде, и где это оправдано?',
      en: 'How do you apply clean/hexagonal architecture and DDD layering on the frontend, and where is it justified?',
    },
    answer: {
      ru: `## В чём суть

Чистая и гексагональная архитектура («порты и адаптеры») — это способ **держать бизнес-правила отдельно от всего, что можно заменить**: UI, HTTP, \`localStorage\`, конкретного фреймворка. Домен ничего не знает ни про Angular, ни про сеть: он объявляет интерфейсы (**порты**), а всё внешнее подключается к ним как **адаптеры**. DDD добавляет к этому дисциплину моделирования: говорить на языке бизнеса и класть правила туда, где живут данные.

Аналогия: чайник и розетка. Чайнику всё равно, откуда ток — ТЭЦ, генератор или солнечная панель. Он знает только **форму вилки**. Форма вилки — это порт, электростанция с проводкой — адаптер. Поменяли источник энергии — чайник переделывать не надо.

**Какую проблему решает.** В типичном Angular-приложении правило «заказ не может быть пустым» живёт в компоненте рядом с \`HttpClient\`, формой и шаблоном. Чтобы его протестировать, нужен TestBed и мок HTTP; чтобы переехать с REST на GraphQL — правка в двадцати компонентах; а форма ответа бэкенда (DTO) расползается по шаблонам. Слои с правильным направлением зависимостей изолируют правила: их можно тестировать за миллисекунды и не трогать при смене инфраструктуры.

## Словарик терминов

- **Домен (domain)** — предметная область и её правила: заказы, тарифы, лимиты. В коде — слой с бизнес-логикой без фреймворков.
- **Сущность (entity)** — объект с идентичностью, который живёт во времени: \`Order\` с \`id\`. Два заказа с одинаковыми полями — всё равно разные заказы.
- **Value object (объект-значение)** — объект без идентичности, который определяется своим значением и неизменяем: \`Money\`, \`DateRange\`.
- **Агрегат (aggregate)** — группа объектов с одним «корнем», через который идут все изменения, чтобы правила не нарушились: заказ со строками.
- **Use case (сценарий, application service)** — один пользовательский сценарий-оркестратор: «оформить заказ».
- **Порт (port)** — интерфейс, который объявляет внутренний слой: «мне нужно уметь сохранять заказы».
- **Адаптер (adapter)** — реализация порта снаружи: \`HttpOrderRepository\`, \`LocalStorageCartRepository\`.
- **Репозиторий (repository)** — порт для хранения и загрузки сущностей, скрывающий, где они лежат.
- **Dependency inversion (инверсия зависимостей, DIP)** — внешние слои зависят от абстракций, объявленных внутренними, а не наоборот.
- **DTO (Data Transfer Object)** — форма данных «как в API»: плоские поля, строки вместо дат, копейки.
- **Mapper / anti-corruption layer** — код, который переводит DTO в доменные объекты и обратно и не пускает чужую модель внутрь.
- **Bounded context (ограниченный контекст)** — граница, внутри которой слова имеют одно значение: «клиент» в биллинге и в поддержке — разные модели.
- **Ubiquitous language (единый язык)** — одни и те же термины у бизнеса, в коде и в тестах.
- **Анемичная модель (anemic domain model)** — сущности как «мешки данных» без поведения, вся логика в сервисах.
- **\`InjectionToken\`** — ключ для DI Angular, когда зависимостью выступает интерфейс, которого нет во время выполнения.

## Как это работает под капотом

Главное в этой архитектуре — **направление зависимостей**, а не названия папок.

1. Домен описывает правила и объявляет порт \`OrderRepository\`, поэтому ему не нужно ничего импортировать снаружи.
2. Use case принимает порт в конструктор и работает только с ним, поэтому не знает, HTTP там или память.
3. Инфраструктура реализует порт (\`HttpOrderRepository implements OrderRepository\`), поэтому импорт идёт снаружи внутрь — инфраструктура зависит от домена.
4. DI при старте связывает порт с конкретным адаптером, поэтому замена адаптера — это одна строка в \`providers\`.
5. Во время выполнения вызов идёт наружу (компонент → use case → адаптер → сеть), а зависимости в коде указывают внутрь — в этом и есть «инверсия».

\`\`\`text
presentation  (компоненты, сторы, сигналы)
      │ вызывает
application   (use cases)  ──зависит от──▶  порт OrderRepository
      │ использует                               ▲
domain        (Order, Money, правила)            │ реализует
                                                 │
infrastructure (HttpOrderRepository, мапперы) ───┘
\`\`\`

Чистая архитектура (Роберт Мартин) рисует то же самое концентрическими кругами, гексагональная (Алистер Кокберн) — шестиугольником с портами по краям. Суть одна: правило зависимостей направлено к домену. DDD (Эрик Эванс) — это не слои, а подход к моделированию: язык, контексты, агрегаты.

### Пример 1. Value object \`Money\`: почему не \`number\`

Что делает: инкапсулирует правило «деньги считаем в копейках», чтобы ошибки округления не расползлись по коду.

\`\`\`ts
console.log(0.1 + 0.2);          // 0.30000000000000004 — так считает number
console.log((10 + 20) / 100);    // 0.3 — так считает Money в копейках

export class Money {
  private constructor(readonly cents: number) {}
  static zero() { return new Money(0); }
  static of(amount: number) { return new Money(Math.round(amount * 100)); }
  add(other: Money) { return new Money(this.cents + other.cents); } // новый объект, старый не меняется
  isZero() { return this.cents === 0; }
  toString() { return (this.cents / 100).toFixed(2); }
}
\`\`\`

Объект неизменяем: \`add\` возвращает новый \`Money\`. Правило «как складывать деньги» записано один раз, а не размазано по компонентам.

### Пример 2. Сущность \`Order\` с поведением

\`\`\`ts
// domain/order.ts — ни одного импорта из Angular или RxJS
export interface Item { sku: string; price: Money; }
export class EmptyOrderError extends Error { constructor() { super('Нельзя оформить пустой заказ'); } }

export class Order {
  constructor(public readonly id: string, private items: Item[]) {}
  total(): Money { return this.items.reduce((s, i) => s.add(i.price), Money.zero()); }
  lines(): readonly Item[] { return [...this.items]; }   // копия: снаружи список не изменить
}
\`\`\`

Сущность сама знает, как считать свою сумму. Это защита от анемичной модели: поведение живёт рядом с данными, а не в «OrderUtilsService».

### Пример 3. Use case и порт

\`\`\`ts
// application/place-order.usecase.ts
export interface OrderRepository { save(o: Order): Promise<void>; }   // ПОРТ

export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}      // зависимость от абстракции
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}
\`\`\`

Use case не знает про \`HttpClient\`, URL и формат JSON. Он оркестрирует: проверить правило домена, вызвать порт.

### Пример 4. Тест бизнес-правила без TestBed

Вместо репозитория подсовываем обычный объект. Этот тест запускался в Vitest 4, оба теста прошли:

\`\`\`ts
describe('PlaceOrderUseCase', () => {
  const saved: Order[] = [];
  const fakeRepo: OrderRepository = { save: async (o) => { saved.push(o); } };
  beforeEach(() => (saved.length = 0));

  it('не даёт оформить пустой заказ', async () => {
    await expect(new PlaceOrderUseCase(fakeRepo).exec(new Order('1', []))).rejects.toThrow(EmptyOrderError);
    expect(saved).toHaveLength(0);
  });

  it('сохраняет непустой заказ', async () => {
    const order = new Order('2', [{ sku: 'A', price: Money.of(0.1) }, { sku: 'B', price: Money.of(0.2) }]);
    await new PlaceOrderUseCase(fakeRepo).exec(order);
    expect(saved).toEqual([order]);
    expect(order.total().toString()).toBe('0.30');
  });
});
// ✓ PlaceOrderUseCase > не даёт оформить пустой заказ
// ✓ PlaceOrderUseCase > сохраняет непустой заказ
\`\`\`

Ни TestBed, ни HTTP, ни компиляции шаблонов: тесты идут миллисекунды, и их можно писать сотнями на граничные случаи правил.

### Пример 5. Адаптер и маппер

\`\`\`ts
// infrastructure/http-order.repository.ts — АДАПТЕР
interface OrderDto { order_id: string; lines: { sku: string; price_cents: number }[]; }

const toDto = (o: Order): OrderDto => ({
  order_id: o.id,
  lines: o.lines().map(i => ({ sku: i.sku, price_cents: i.price.cents })),
});

@Injectable()
export class HttpOrderRepository implements OrderRepository {
  private http = inject(HttpClient);
  save(o: Order) { return firstValueFrom(this.http.post<void>('/api/orders', toDto(o))); }
}
\`\`\`

\`firstValueFrom\` превращает Observable от \`HttpClient\` в \`Promise\`, который ожидает порт. В коде под ответом тот же адаптер получает \`HttpClient\` через конструктор — это равнозначно \`inject()\`. Маппер \`toDto\` — это и есть anti-corruption layer: если бэкенд переименует \`price_cents\`, правка будет в одном файле, а домен и шаблоны не узнают.

### Пример 6. Связываем через Angular DI: \`InjectionToken\`

Интерфейсы TypeScript исчезают после компиляции, поэтому сам интерфейс не может быть ключом DI. Проверено компилятором TypeScript 5.9:

\`\`\`ts
inject(OrderRepository);
// error TS2693: 'OrderRepository' only refers to a type, but is being used as a value here.
\`\`\`

Решение — \`InjectionToken\` или абстрактный класс (он существует во время выполнения):

\`\`\`ts
// application/tokens.ts
export const ORDER_REPOSITORY = new InjectionToken<OrderRepository>('OrderRepository');

// app.config.ts — единственное место, где порт встречается с адаптером
providers: [
  { provide: ORDER_REPOSITORY, useClass: HttpOrderRepository },
  { provide: PlaceOrderUseCase, useFactory: () => new PlaceOrderUseCase(inject(ORDER_REPOSITORY)) },
]

// в тестах или демо-режиме — другая строка, остальной код не меняется
{ provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository }
\`\`\`

\`useFactory\` позволяет оставить use case обычным классом без декоратора \`@Injectable\`, то есть без зависимости от Angular.

### Пример 7. Presentation: компонент вызывает use case

\`\`\`ts
@Component({ /* ... */ })
export class CheckoutComponent {
  private placeOrder = inject(PlaceOrderUseCase);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  async submit(order: Order) {
    this.saving.set(true);
    try {
      await this.placeOrder.exec(order);
    } catch (e) {
      this.error.set(e instanceof EmptyOrderError ? e.message : 'Ошибка сервера');
    } finally {
      this.saving.set(false);
    }
  }
}
\`\`\`

Компонент отвечает за состояние экрана (сигналы, спиннер, текст ошибки), но не за правила. Сигналы и RxJS живут здесь и в application, а домен остаётся синхронным и чистым.

### Как удержать границы

Договорённости «домен не импортирует Angular» без автоматики разваливаются за полгода. В Nx-монорепо это правило линтера \`@nx/enforce-module-boundaries\` с тегами:

\`\`\`json
{
  "depConstraints": [
    { "sourceTag": "layer:domain", "onlyDependOnLibsWithTags": ["layer:domain"] },
    { "sourceTag": "layer:application", "onlyDependOnLibsWithTags": ["layer:domain"] },
    { "sourceTag": "layer:infrastructure", "onlyDependOnLibsWithTags": ["layer:application", "layer:domain"] },
    { "sourceTag": "layer:presentation", "onlyDependOnLibsWithTags": ["layer:application", "layer:domain"] }
  ]
}
\`\`\`

Без Nx то же делают плагины ESLint вроде \`eslint-plugin-boundaries\` или правило \`import/no-restricted-paths\`.

### Когда оправдано, а когда вредно

- **Оправдано**: биллинг, страхование, трейдинг, кредитные калькуляторы — там, где правил больше, чем экранов, продукт живёт годами и источников данных несколько.
- **Вредно**: CRUD из пяти форм, витрина, MVP. Слои превращаются в тонны маппинга DTO↔domain ради нуля бизнес-правил.
- **Компромисс, который стоит назвать**: начните с одного слоя доменных сервисов без мапперов и вводите порты **точечно** — только там, где инфраструктура реально меняется или где логику больно тестировать через TestBed.

### Где это применяется на практике

- **FinTech-порталы**: расчёт комиссий, лимитов и статусов заявки в чистом доменном слое, покрытом сотнями быстрых тестов.
- **Офлайн-режим и PWA**: один порт \`OrderRepository\`, два адаптера — HTTP онлайн и IndexedDB офлайн, переключение в DI.
- **Миграция бэкенда**: переезд с REST на GraphQL или с монолита на микросервисы — новый адаптер, домен не трогается.
- **Большие формы с правилами**: валидация «сумма кредита не больше 40% дохода» живёт в value object и переиспользуется в форме, гриде и отчёте.
- **Несколько фронтендов одного продукта**: доменная библиотека в монорепо шарится между веб-приложением и админкой.

## Важные нюансы и подводные камни

- **Анемичный домен** — сущности как «мешки данных», логика в сервисах. Слои формально есть, пользы ноль: процедурный код в дорогой обёртке.
- **Маппинг ради маппинга**: DTO↔domain в обе стороны на каждый экран съедает больше времени, чем экономит.
- **Чем порт отличается от адаптера?** Порт — интерфейс, объявленный **внутри**; адаптер — реализация **снаружи**.
- **Где живут RxJS и сигналы?** В presentation и application; домен остаётся синхронным и чистым.
- **Неправильные границы хуже плоской структуры.** Команда без опыта DDD проводит слои не там, и рефакторить такие слои дороже, чем их отсутствие.
- **Не путайте с папками по типу файла** (\`services/\`, \`models/\`): гексагон — про **направление зависимостей**, а не про имена папок.
- **Интерфейс — не DI-токен.** \`inject(OrderRepository)\` не скомпилируется; нужен \`InjectionToken\` или абстрактный класс.
- **\`Promise\` в порте теряет отмену.** Порт на \`Promise\` нейтрален к фреймворку, но \`switchMap\` уже не отменит запрос; если отмена важна (поиск при вводе), порт может возвращать Observable — это осознанный компромисс.
- **Классы домена и стейт-менеджеры.** NgRx и NGXS ожидают сериализуемые простые объекты; экземпляры классов с методами в сторе ломают проверки сериализуемости и DevTools. Храните в сторе DTO или простые данные, а доменные объекты создавайте на границе.

**Плюсы:** бизнес-правила тестируются без TestBed за миллисекунды, инфраструктура заменяется новым адаптером, DTO не протекают в шаблоны, код говорит на языке бизнеса.
**Минусы:** больше файлов, слоёв и маппинга, выше порог входа; на простом CRUD это оверинжиниринг, а неправильно проведённые границы стоят дороже их отсутствия.

## Как это спрашивают на собеседовании

**Главный вывод:** суть — в направлении зависимостей: домен объявляет порты, инфраструктура их реализует, DI связывает. Это окупается на доменно-сложных продуктах и вредит на простом CRUD.

Типичные формулировки: «Как вы организуете бизнес-логику во фронтенде?», «Что такое гексагональная архитектура и нужна ли она в Angular?», «Как сделать логику тестируемой без TestBed?».

Что могут спросить следом:

- *Чем порт отличается от адаптера?* — Порт — интерфейс внутри, адаптер — реализация снаружи.
- *Как внедрить интерфейс в Angular?* — Через \`InjectionToken\` или абстрактный класс: интерфейса нет во время выполнения.
- *Чем сущность отличается от value object?* — У сущности есть идентичность, value object определяется значением и неизменяем.
- *Что такое анемичная модель?* — Сущности без поведения, вся логика в сервисах; слои есть, пользы нет.

### Ответ на 1 минуту

> Гексагональная архитектура изолирует домен от деталей доставки. В центре — сущности и value objects вроде \`Money\` на чистом TypeScript, вокруг — use cases, которые зависят от портов-интерфейсов, а не от \`HttpClient\`; адаптеры вроде \`HttpOrderRepository\` реализуют эти порты и подключаются через DI. Все зависимости в коде направлены внутрь — это dependency inversion. В Angular интерфейс не может быть токеном, поэтому я связываю порт с адаптером через \`InjectionToken\`. Выигрыш: правила тестируются без TestBed за миллисекунды, переход с REST на GraphQL — новый адаптер, а DTO не протекают в шаблоны. Цена — слои и маппинг, поэтому на CRUD из пяти форм это оверинжиниринг; применяю на доменно-сложных продуктах вроде биллинга. Главный риск — анемичная модель, когда сущности пустые, а логика в сервисах.`,
      en: `## In short

Hexagonal architecture ("ports and adapters") is a way to **keep business rules apart from everything that is replaceable**: UI, HTTP, localStorage. The domain knows nothing about Angular or the network — it declares interfaces (**ports**), and everything external plugs into them as **adapters**.

Analogy: a kettle and a wall socket. The kettle doesn't care where the electricity comes from — power plant, generator, solar panel. All it knows is the **shape of the plug**. The plug shape is the port; the power source is the adapter. Swap the source and the kettle needs no rework.

## What it's made of

1. **Domain** — entities, value objects, rules like "an order can't be empty". Pure TypeScript: no Angular, no RxJS, no \`HttpClient\`.
2. **Application (use cases)** — orchestrating scenarios. \`PlaceOrderUseCase\` depends on a **port** — the \`OrderRepository\` interface — not on \`HttpClient\`.
3. **Infrastructure (adapters)** — port implementations: \`HttpOrderRepository\`, \`LocalStorageCartRepository\`.
4. **Presentation** — components and stores that call use cases and render the result.

**Which way dependencies point:** always **inward, toward the domain**. The domain declares the repository interface, infrastructure implements it, DI wires them at startup. That's **dependency inversion**: outer layers depend on abstractions defined by inner ones, never the other way round.

## Example

\`\`\`ts
// domain + application: not a single Angular import
export interface OrderRepository { save(o: Order): Promise<void>; }

export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}   // depends on a PORT
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}

// testing the business rule: no TestBed, no HTTP, milliseconds
it('refuses to place an empty order', async () => {
  const saved: Order[] = [];
  const fake: OrderRepository = { save: async (o) => { saved.push(o); } };
  await expect(new PlaceOrderUseCase(fake).exec(emptyOrder)).rejects.toThrow(EmptyOrderError);
  expect(saved).toHaveLength(0);
});
\`\`\`

Why this works: the test knows nothing about HTTP or Angular — a plain object stands in for the repository. Moving from REST to GraphQL is a new adapter; the domain and this test stay untouched. And HTTP DTOs never leak into templates — what comes out is domain objects.

## When it's worth it and when it hurts

- **Worth it**: billing, insurance, trading — where there are more rules than screens, the product lives for years, and data comes from several sources.
- **Hurts**: a five-form CRUD app, a content site, an MVP. The layers become endless DTO↔domain mapping in service of zero business rules.
- **The compromise worth naming**: start with one layer of domain services and no mappers, then introduce ports **selectively** — only where infrastructure genuinely changes or where the logic is painful to test through TestBed.

## What to say in the interview

> Hexagonal architecture isolates the domain from delivery details. At the centre sit entities and business rules in pure TypeScript; around them use cases that depend on port interfaces rather than \`HttpClient\`; concrete adapters like \`HttpOrderRepository\` implement those interfaces and get wired in via DI. All dependencies point inward — that's dependency inversion: the domain dictates the contract and infrastructure conforms. The payoff: business logic tests without TestBed in milliseconds, swapping REST for GraphQL is just a new adapter, and HTTP DTOs never reach templates. The cost is extra layers and mapping, so on a five-form CRUD app it's over-engineering. I use it on domain-rich products — billing, insurance, trading. The main risk is an anemic model: empty entities with all logic in services, which is procedural code in an expensive wrapper.

## Gotchas

- **Anemic domain** — entities as data bags, logic in services. The layers exist on paper and buy you nothing.
- **Mapping for mapping's sake**: two-way DTO↔domain conversion on every screen costs more time than it saves.
- Follow-up they'll ask: "what's the difference between a port and an adapter?" — a port is an interface declared **inside**; an adapter is the implementation **outside**.
- They'll also ask: "where do RxJS and signals live?" — in presentation and application; the domain stays synchronous and pure.
- A team with no DDD experience draws boundaries in the wrong places, and wrong layers are worse than a flat structure — they cost more to refactor.
- Don't confuse it with folders-by-file-type (\`services/\`, \`models/\`): the hexagon is about **dependency direction**, not folder names.`,
    },
    codeSnippet: `// domain/order.ts — pure, no framework
export class Order {
  constructor(public readonly id: string, private items: Item[]) {}
  total(): Money { return this.items.reduce((s, i) => s.add(i.price), Money.zero()); }
}

// application/place-order.usecase.ts — depends on a PORT
export interface OrderRepository { save(o: Order): Promise<void>; }
export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}      // inversion
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}

// infrastructure/http-order.repository.ts — ADAPTER
@Injectable()
export class HttpOrderRepository implements OrderRepository {
  constructor(private http: HttpClient) {}
  save(o: Order) { return firstValueFrom(this.http.post('/api/orders', toDto(o))); }
}`,
  },
  {
    id: 'arch-042',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['bff', 'api-gateway', 'system-design'],
    question: {
      ru: 'Что такое Backend-for-Frontend (BFF) и какие проблемы он решает по сравнению с прямыми вызовами микросервисов?',
      en: 'What is the Backend-for-Frontend (BFF) pattern and what problems does it solve versus calling microservices directly?',
    },
    answer: {
      ru: `## В чём суть

BFF (Backend-for-Frontend) — это **маленький бэкенд, который принадлежит фронтенду** и стоит между клиентом и микросервисами. Он ходит по сервисам вместо браузера, склеивает ответы в один и отдаёт ровно то, что рисует экран. Обычно на каждый тип клиента — свой BFF: отдельно для веба, отдельно для мобильного приложения.

Аналогия: официант. Вы не бегаете сами на кухню, в бар и к кондитеру — говорите одному человеку, он собирает всё и приносит одним подносом. А для детского столика есть свой официант со своим меню — это и есть «свой BFF на каждый тип клиента»: web, iOS, Android.

**Какую проблему решает.** Когда браузер ходит в микросервисы напрямую, экран заказа делает три-пять запросов, причём часть из них последовательно (сначала заказ, потом по его данным — доставку). На мобильной сети каждый такой round-trip стоит сотни миллисекунд. Сервисы отдают «свои» модели — лишние поля, внутренние флаги, копейки вместо рублей, — и клиент склеивает и переводит всё сам. Access-токен лежит в JavaScript, где его может украсть XSS. Каждый сервис на своём домене требует настройки CORS. BFF собирает все эти заботы в одном месте, которым владеет фронтенд-команда.

## Словарик терминов

- **Микросервис** — отдельное серверное приложение, которое отвечает за свою часть бизнеса: заказы, пользователи, доставка.
- **BFF (Backend-for-Frontend)** — серверный слой под конкретный клиент: знает его экраны и отдаёт данные в готовой для них форме.
- **API Gateway** — общая «входная дверь» для всех клиентов: маршрутизация, проверка авторизации, rate limit. Про экраны ничего не знает.
- **Round-trip (RTT)** — путь запроса до сервера и ответа обратно. На мобильной сети — десятки и сотни миллисекунд на каждый.
- **Over-fetching / under-fetching** — получить больше полей, чем нужно экрану / получить меньше и идти за остальным ещё раз.
- **N+1 запросов** — один запрос за списком плюс по запросу на каждый элемент списка.
- **Агрегация** — сбор ответов нескольких сервисов в один ответ.
- **Shape transformation** — переделка формы данных под экран: выбросить лишнее, переименовать, склеить, отформатировать.
- **httpOnly cookie** — cookie, которую браузер отправляет сам, но JavaScript прочитать не может; XSS её не украдёт.
- **Access token / refresh token** — короткоживущий «пропуск» к API и долгоживущий ключ для получения нового пропуска.
- **Token handler pattern** — BFF хранит токены у себя, а браузеру выдаёт только сессионную httpOnly-cookie.
- **CSRF (подделка межсайтового запроса)** — атака, при которой чужой сайт заставляет браузер отправить запрос с вашими cookie.
- **CORS и preflight** — правила браузера для запросов на другой домен; для «непростых» запросов браузер сначала шлёт проверочный \`OPTIONS\`.
- **Circuit breaker (предохранитель)** — механизм, который после серии ошибок временно перестаёт звать упавший сервис и сразу отдаёт запасной ответ.
- **GraphQL** — язык запросов, где клиент сам описывает, какие поля ему нужны; альтернатива или дополнение к BFF.
- **SLO (Service Level Objective)** — целевой уровень качества сервиса, например «99,9% ответов быстрее 300 мс».

## Как это работает под капотом

Путь одного запроса через BFF:

1. Клиент делает **один** запрос под конкретный экран: \`GET /bff/order-page/42\`, поэтому браузеру не нужно знать, из каких сервисов собирается страница.
2. BFF проверяет сессию. У web-BFF она лежит в httpOnly-cookie; BFF меняет её на внутренний access-токен, поэтому браузер токен вообще не видит (token handler pattern).
3. BFF **агрегирует**: параллельно вызывает orders, users и shipping, поэтому три round-trip'а происходят внутри дата-центра за единицы миллисекунд, а не по мобильной сети.
4. На каждый вызов стоит свой таймаут, поэтому один медленный сервис не держит весь экран.
5. BFF делает shape transformation: выбрасывает лишние поля, склеивает имя и фамилию, переводит копейки в рубли, поэтому внутренняя модель не утекает в клиент.
6. По пути BFF централизует retry, circuit breaker и кэш, поэтому клиенту это писать не нужно.

### Пример 1. Без BFF: браузер сам ходит по сервисам

\`\`\`ts
// Angular-клиент без BFF
loadOrderPage(id: string) {
  return forkJoin({
    order: this.http.get<OrderDto>(\`https://orders.api.example.com/orders/\${id}\`),
    user: this.http.get<UserDto>('https://users.api.example.com/me'),
    delivery: this.http.get<EtaDto>(\`https://shipping.api.example.com/eta/\${id}\`),
  }).pipe(
    map(({ order, user, delivery }) => ({
      title: order.title,
      total: order.totalCents / 100,
      customerName: \`\${user.firstName} \${user.lastName}\`,
      etaHuman: delivery.eta,
    })),
  );
}
\`\`\`

\`forkJoin\` запускает запросы параллельно и ждёт все. Работает, но цена такая: три соединения по медленной сети, три домена с настройкой CORS (а с заголовком \`Authorization\` браузер перед каждым ещё шлёт preflight \`OPTIONS\`), токен в JavaScript и полные DTO (с паспортными данными и внутренними флагами) в браузере. Если один сервис упал, \`forkJoin\` роняет всю страницу.

### Пример 2. BFF-эндпоинт: агрегация и форма под экран

\`\`\`ts
// BFF на Node (Express): один экран — один запрос
app.get('/bff/order-page/:id', async (req, res) => {
  const id = req.params.id;
  const token = await sessions.toAccessToken(req.cookies.session); // cookie httpOnly

  const [order, user, delivery] = await Promise.all([   // параллельно
    orders.get('/orders/' + id, token),
    users.get('/me', token),
    shipping.get('/eta/' + id, token),
  ]);

  res.json({                                            // ровно то, что рисует экран
    title: order.title,
    total: order.totalCents / 100,
    customerName: user.firstName + ' ' + user.lastName,
    etaHuman: delivery.eta,
  });
});
\`\`\`

Браузер сделал один запрос вместо трёх, получил готовые к рендеру поля и ни разу не увидел access-токен — он остался между BFF и сервисами.

### Пример 3. Почему параллельно и зачем таймауты

Модель трёх сервисов с задержками 120, 80 и 90 мс. Код запускался в Node; времена приблизительные, остальной вывод настоящий:

\`\`\`js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const orders   = async (id) => { await sleep(120); return { id, title: 'Ноутбук', totalCents: 129990, internalFlags: ['x'] }; };
const users    = async ()   => { await sleep(80);  return { firstName: 'Анна', lastName: 'Ли', passportNo: 'secret' }; };
const shipping = async (id, ms = 90) => { await sleep(ms); return { eta: '2026-10-08' }; };

const withTimeout = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]);

async function orderPage(id, shippingMs) {
  const [order, user, delivery] = await Promise.allSettled([
    withTimeout(orders(id), 300),
    withTimeout(users(), 300),
    withTimeout(shipping(id, shippingMs), 300),
  ]);
  if (order.status === 'rejected') throw new Error('без заказа экран не имеет смысла');
  return {
    title: order.value.title,
    total: order.value.totalCents / 100,
    customerName: user.status === 'fulfilled' ? \`\${user.value.firstName} \${user.value.lastName}\` : null,
    etaHuman: delivery.status === 'fulfilled' ? delivery.value.eta : null, // деградация
  };
}

// последовательно (await по очереди) было бы ≈ 290 мс — сумма задержек
console.log(JSON.stringify(await orderPage('42', 90)));    // ≈ 120 мс — по самому медленному
// {"title":"Ноутбук","total":1299.9,"customerName":"Анна Ли","etaHuman":"2026-10-08"}
console.log(JSON.stringify(await orderPage('42', 5000)));  // shipping завис: ответ через ≈ 300 мс
// {"title":"Ноутбук","total":1299.9,"customerName":"Анна Ли","etaHuman":null}
\`\`\`

\`Promise.all\` падает целиком при первой ошибке, а \`Promise.allSettled\` ждёт все и сообщает статус каждого — поэтому экран получает заказ и имя даже без даты доставки. \`Promise.race\` с таймером даёт таймаут: без него зависший shipping держал бы страницу 5 секунд. Обратите внимание, что \`passportNo\` и \`internalFlags\` в ответ не попали.

### Пример 4. Token handler: токены не попадают в браузер

\`\`\`text
браузер ──cookie: session=abc (HttpOnly; Secure; SameSite=Strict)──▶ BFF
BFF ──Authorization: Bearer <access-token>──▶ orders / users / shipping
\`\`\`

\`\`\`ts
// после логина BFF ставит только сессионную cookie
res.cookie('session', sessionId, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
\`\`\`

\`HttpOnly\` закрывает cookie от JavaScript, \`Secure\` — от передачи без HTTPS, \`SameSite=Strict\` — от отправки с чужих сайтов. Но раз авторизация держится на cookie, нужна защита от CSRF. Angular \`HttpClient\` умеет её из коробки: читает cookie \`XSRF-TOKEN\` и отправляет заголовок \`X-XSRF-TOKEN\` во всех запросах, кроме \`GET\` и \`HEAD\`, на свой же origin (в Angular 21 проверяется именно совпадение origin); имена настраиваются через \`withXsrfConfiguration\`.

\`\`\`ts
provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }));
\`\`\`

### Пример 5. Клиент с BFF

\`\`\`ts
@Component({ /* ... */ })
export class OrderPage {
  readonly id = input.required<string>();
  private http = inject(HttpClient);
  // один относительный запрос на свой домен: ни CORS, ни токенов, ни маппинга
  readonly page$ = toObservable(this.id).pipe(
    switchMap(id => this.http.get<OrderPageVm>(\`/bff/order-page/\${id}\`)),
  );
}
\`\`\`

Компонент стал тоньше: ни склейки, ни перевода копеек, ни обработки частичных отказов — всё это сделано на сервере, где сеть быстрая и надёжная.

### BFF и API Gateway

API Gateway — один на всех клиентов: маршрутизирует запросы к сервисам, проверяет токены, ограничивает частоту. Он не знает про экраны. BFF — свой у каждого клиента и мыслит экранами. Часто они стоят вместе: клиент → BFF → gateway → сервисы.

### BFF и GraphQL

GraphQL решает over- и under-fetching иначе: клиент сам описывает нужные поля, и один эндпоинт обслуживает всех. Он хорошо сочетается с BFF (BFF и есть GraphQL-сервер для фронтенда), а федерация GraphQL помогает нескольким BFF не дублировать схему. Цена — свой рантайм, кэширование сложнее, чем у обычных GET, и нужна защита от слишком тяжёлых запросов.

### Как выбрать

- **Один веб-клиент, стабильные контракты, мало агрегации** — хватит хорошо спроектированного API Gateway; BFF добавит только операционные расходы.
- **Несколько платформ с разными потребностями в данных** — BFF на платформу (или общий GraphQL-слой), которым владеют команды этих клиентов.
- **Строгие требования к безопасности токенов** — BFF с token handler pattern, чтобы токены вообще не попадали в браузер.
- **Много экранов собираются из 3–5 сервисов, и клиент на медленной сети** — BFF окупается сокращением round-trip'ов.
- **Нет команды, готовой владеть ещё одним сервисом** — BFF не вводите: без хозяина он станет узким местом с очередью задач.

### Где это применяется на практике

- **Enterprise-портал поверх десятков микросервисов**: страница заявки собирается из CRM, биллинга и документооборота одним запросом.
- **Мобильное приложение и веб одного продукта**: мобильный BFF отдаёт урезанные данные и картинки меньшего размера, веб-BFF — полные таблицы.
- **Банковские и FinTech-кабинеты**: token handler pattern, чтобы access-токены не жили в браузере.
- **Angular SSR**: сервер на Express, который уже рендерит страницы, нередко берёт на себя и роль BFF для своих эндпоинтов.
- **Дашборды**: BFF заранее агрегирует метрики из нескольких сервисов и кэширует их на короткое время.

## Важные нюансы и подводные камни

- **«BFF — это API Gateway?»** Нет. Gateway один на всех и занимается маршрутизацией, авторизацией, rate limit. BFF свой на каждый клиент и знает про **экраны**.
- **BFF не отменяет авторизацию в сервисах.** Он не граница доверия, а удобство: проверки прав должны остаться и внутри сервисов.
- **Без таймаута на каждый upstream** один медленный сервис держит весь экран. Нужны таймауты плюс деградация до частичного ответа.
- **Single point of failure.** Если BFF лёг, лёг весь фронтенд — это продакшн-сервис со своими SLO, алертами и несколькими экземплярами.
- **Бизнес-логика в BFF.** Туда можно только логику представления (склейка, форматирование); доменные правила остаются в сервисах, иначе BFF превращается в толстый оркестратор.
- **Три BFF на три платформы без общей библиотеки** — три места, где надо править один и тот же баг; дрейф логики между web и mobile.
- **Кэш персональных данных.** Ключ кэша в BFF обязан включать пользователя, иначе один клиент увидит заказ другого.
- **Ещё один сетевой прыжок.** BFF добавляет немного задержки внутри дата-центра; выигрыш появляется, только если он экономит round-trip'ы клиента.
- **Владелец.** Владеть BFF должна фронтенд-команда, иначе любое изменение экрана превращается в задачу в чужой бэклог.

**Плюсы:** меньше round-trip'ов (особенно заметно на мобильной сети), тоньше клиент, внутренняя модель не утекает наружу, токены не попадают в браузер, CORS и retry решаются в одном месте.
**Минусы:** ещё один деплой-юнит с мониторингом и дежурствами, риск толстого BFF с бизнес-логикой, дрейф логики между BFF разных платформ, новая точка отказа.

## Как это спрашивают на собеседовании

**Главный вывод:** BFF — серверный слой под конкретный клиент, которым владеет фронтенд: агрегирует сервисы в один ответ под экран, прячет токены и внутренние модели. Окупается при нескольких платформах и сложной агрегации; для одного клиента со стабильным API хватит gateway.

Типичные формулировки: «Что такое BFF и зачем он нужен?», «Чем BFF отличается от API Gateway?», «Как безопасно хранить токены в SPA?».

Что могут спросить следом:

- *Можно ли класть в BFF бизнес-логику?* — Только логику представления; доменные правила остаются в сервисах.
- *Что делать, если один из сервисов не ответил?* — Таймаут на каждый вызов и частичный ответ с \`null\` и признаком деградации.
- *Чем BFF отличается от GraphQL?* — GraphQL даёт клиенту самому выбирать поля через один эндпоинт; BFF может быть реализован и как GraphQL-сервер.
- *Зачем CSRF-защита, если есть BFF?* — Сессия в cookie отправляется браузером автоматически, поэтому нужен SameSite и анти-CSRF-токен.

### Ответ на 1 минуту

> BFF — отдельный бэкенд под конкретный тип клиента, которым владеет фронтенд-команда. Он решает проблемы прямых вызовов микросервисов: несколько round-trip'ов по медленной сети, over- и under-fetching, утечку внутренней модели в клиент, CORS и дублирование агрегации в браузере. BFF параллельно вызывает сервисы, ставит таймаут на каждый, отдаёт частичный ответ, если кто-то не ответил, и формирует данные ровно под экран. Плюс безопасность: web-BFF держит сессию в httpOnly-cookie и сам меняет её на access-токен, так что токен в браузер не попадает — это token handler pattern, но тогда нужна защита от CSRF. Цена — ещё один сервис с владельцем и SLO, риск затащить туда бизнес-логику и дрейф между BFF разных платформ. Если клиент один, а контракты стабильны, я выберу API Gateway.`,
      en: `## In short

A BFF is **a small backend owned by the frontend**, sitting between the client and the microservices. It walks the services on the browser's behalf, glues the responses into one, and returns exactly what the screen renders.

Analogy: a waiter. You don't run to the kitchen, the bar and the pastry counter yourself — you tell one person and everything arrives on one tray. And the kids' table gets its own waiter with its own menu: that's "one BFF per client type" — web, iOS, Android.

## How it works, step by step

1. The client makes **one** request shaped for a specific screen: \`GET /bff/order-page/42\`.
2. The BFF checks the session. For a web BFF it lives in an **httpOnly cookie**; the BFF exchanges it for an internal access token that the browser never sees (**token handler pattern**).
3. The BFF **aggregates**: it calls orders, users and shipping in parallel. Those three round-trips happen inside the data centre, not over a mobile network.
4. The BFF does **shape transformation**: drops surplus fields, renames things, joins first and last name, converts cents to currency. The internal domain model never leaks to the client.
5. Along the way the BFF centralizes retry, circuit-breaking and caching, so the client doesn't have to implement any of it.

## Example

\`\`\`ts
// BFF: one screen, one request
app.get('/bff/order-page/:id', async (req, res) => {
  const id = req.params.id;
  const token = await sessions.toAccessToken(req.cookies.session); // httpOnly

  const [order, user, delivery] = await Promise.all([   // aggregation, in parallel
    orders.get('/orders/' + id, token),
    users.get('/me', token),
    shipping.get('/eta/' + id, token),
  ]);

  res.json({                                            // exactly what the screen draws
    title: order.title,
    total: order.totalCents / 100,
    customerName: user.firstName + ' ' + user.lastName,
    etaHuman: delivery.eta,
  });
});
\`\`\`

Why this works: the browser made one request instead of three, got render-ready fields, and never saw the access token — it stayed between the BFF and the services. Without a BFF the client would write all of this itself: aggregation, mapping, partial-failure handling.

## Trade-offs worth stating honestly

- ✅ Fewer round-trips (dramatic on 3G), a thinner client, better security via the token-handler pattern.
- ❌ **Another deploy unit** with its own monitoring and owning team. The frontend team must own it, or it degenerates into just another backend with a ticket queue.
- ❌ Risk of a fat BFF: business logic quietly migrates in, when it belongs in domain services.
- ❌ One BFF per client → **logic drift** between web and mobile. GraphQL or BFF federation partly mitigates this.
- **When not to**: a single web client with stable contracts. Then a well-designed API gateway is enough and a BFF is pure operational cost.

## What to say in the interview

> A BFF is a dedicated backend for one client type, owned by the frontend team. It fixes the problems of calling microservices directly: over- and under-fetching, N+1 round-trips on slow networks, leaking the internal domain model to the client, CORS, and duplicated aggregation in the browser. It aggregates several calls into one screen-shaped response, does shape transformation, and centralizes retry, circuit-breaking and caching. There's a security win too: a web BFF keeps the session in an httpOnly cookie and swaps it for internal tokens, so the browser never holds an access token — the token-handler pattern. The cost is another deploy unit with an owner, the risk of it becoming a fat orchestrator full of business logic, and logic drift between per-platform BFFs. With one client and stable contracts I'd take an API gateway instead; a BFF pays off across several platforms with different data needs.

## Gotchas

- **"Isn't a BFF just an API gateway?"** No. A gateway is one for everybody and handles routing, auth and rate limiting. A BFF is per client and knows about **screens**.
- A BFF **doesn't replace authorization** inside the services: it's a convenience, not a trust boundary. Keep the checks downstream too.
- Without a per-upstream timeout, one slow service holds the whole screen hostage. Add timeouts plus degradation to a partial response.
- A BFF easily becomes a single point of failure — treat it as a production service with its own SLOs and alerts.
- They'll ask "can business logic live there?" — only presentation logic (joining, formatting); domain rules stay in the services.
- Three BFFs for three platforms with no shared library means three places to fix the same bug.`,
    },
  },
  {
    id: 'arch-043',
    category: 'network-browser',
    level: 'Hard',
    tags: ['graphql', 'apollo', 'normalized-cache'],
    question: {
      ru: 'GraphQL против REST на клиенте: какие проблемы решает нормализованный кэш Apollo и где он подводит?',
      en: 'GraphQL vs REST on the client: what does Apollo\'s normalized cache solve and where does it bite?',
    },
    answer: {
      ru: `## Коротко

REST — это **комплексные обеды**: сервер решил, что лежит на подносе. Хочешь меньше — ешь лишнее (over-fetching), хочешь больше — иди за вторым подносом (under-fetching, N+1 запросов). GraphQL — это **заказ по меню**: клиент сам описывает форму нужных данных и получает всё одним запросом, а схема служит строгим контрактом.

Нормализованный кэш Apollo продолжает аналогию: он не хранит готовые подносы: он разбирает их и складывает **каждый продукт на склад по артикулу**. Артикул = \`__typename\` + \`id\`. Обновили карточку товара на складе — все подносы, где он есть, автоматически показывают новое.

## Как это работает по шагам

1. Пришёл ответ на запрос.
2. Apollo рекурсивно обходит его и находит объекты.
3. Каждому объекту считает ключ: \`__typename\` + \`id\` → \`User:42\`.
4. Кладёт объект **плоско** в общее хранилище, а на месте объекта в структуре запроса оставляет ссылку (\`__ref\`).
5. Любой компонент читает данные «по ссылкам». Когда мутация вернула \`User{id, name}\`, обновилась одна запись \`User:42\` — и **все экраны с этим пользователем перерисовались сами**. Плюс дедупликация: один объект — одна запись, а не копия в каждом запросе.

## Пример

\`\`\`ts
// ответ сервера
// { user: { __typename: 'User', id: '42', name: 'Ada' } }

// в кэше он лежит ПЛОСКО:
// ROOT_QUERY: { 'user({"id":"42"})': { __ref: 'User:42' } }
// 'User:42':  { __typename: 'User', id: '42', name: 'Ada' }

// А вот СПИСКИ сами не обновляются — классический баг:
addTodo({
  variables: { text },
  update(cache, { data }) {                       // без этого новый todo не появится
    cache.modify({ fields: { todos: (refs = []) => [...refs, data.addTodo] } });
  },
});
\`\`\`

Почему так: Apollo знает, что объект \`Todo:7\` изменился, но **не может догадаться**, в какие списки его надо вставить — это бизнес-решение (а вдруг фильтр не подходит?). Поэтому вставку в список пишем руками через \`update\` или платим лишним запросом через \`refetchQueries\`.

## Когда брать GraphQL, а когда нет

- **Брать**: много разных экранов поверх одних сущностей, несколько клиентов с разными потребностями, зоопарк сервисов, который надо склеить одной схемой.
- **Не брать**: простой CRUD с предсказуемыми ресурсами, маленькая команда, или когда HTTP-кэш и CDN поверх REST дают больше пользы, чем гибкость запросов. Не тащите Apollo «потому что модно» — \`fetch\` + TanStack Query или RTK Query часто проще и дешевле в поддержке.
- Отдельная цена GraphQL — на сервере: легко словить дорогие и N+1-резолверы, если нет DataLoader и лимитов на глубину запроса.

## Что сказать на собеседовании

> В REST набор полей фиксирует сервер, отсюда over- и under-fetching, версионирование и много эндпоинтов. В GraphQL форму данных описывает клиент: один запрос на экран и схема как строгий контракт; платим сложностью кэша и риском дорогих N+1-резолверов на сервере. Нормализованный кэш Apollo разбирает ответ на объекты по \`__typename\` плюс \`id\` и хранит их плоско, как мини-базу, а не по запросам — поэтому мутация, вернувшая \`User\`, автоматически обновляет все экраны с этим пользователем, и объект не дублируется. Подводит он на трёх вещах: списки не пополняются сами, нужен \`update\`-колбэк или \`refetchQueries\`; объекты без \`id\` в выборке кэшируются по пути запроса и дают дубли — лечится \`keyFields\`; пагинация требует ручных \`merge\` и \`read\` в \`typePolicies\`. На простом CRUD я останусь на REST с TanStack Query.

## Ловушки

- **Забыли выбрать \`id\` в запросе** — объект нормализовать не по чему, он кэшируется по пути запроса. Отсюда «данные не обновились» и дубли; лечится \`keyFields\` или дисциплиной «всегда запрашивай id».
- **Списки после мутации**: самый частый баг на собеседовании. Ответ — \`update\`/\`cache.modify\`, а \`refetchQueries\` это запасной вариант ценой лишнего round-trip.
- **Пагинация без \`merge\`** — новая страница затирает предыдущую. Нужны \`keyArgs\` + \`merge\` в \`typePolicies\`.
- **Инвалидация кэша** остаётся трудной задачей: спросят про \`fetchPolicy\` (\`cache-first\` vs \`cache-and-network\`) — знайте разницу.
- GraphQL **не бесплатен на сервере**: без DataLoader один запрос легко превращается в сотни SQL-запросов.
- GraphQL по POST **ломает HTTP-кэширование и CDN**, которые в REST достаются даром. Это реальный аргумент против.`,
      en: `## In short

REST is a **set menu**: the server decided what's on the tray. Want less — you eat the extras (over-fetching); want more — go fetch a second tray (under-fetching, N+1 requests). GraphQL is **ordering à la carte**: the client declares the shape of the data it needs and gets it in one request, with the schema acting as a strict contract.

Apollo's normalized cache extends the analogy: it doesn't store finished trays. It takes them apart and shelves **every item in a warehouse under its SKU**. The SKU is \`__typename\` + \`id\`. Update one warehouse record and every tray containing it shows the new value.

## How it works, step by step

1. A query response arrives.
2. Apollo walks it recursively and finds the objects.
3. For each object it computes a key: \`__typename\` + \`id\` → \`User:42\`.
4. It stores the object **flat** in one shared store, leaving a reference (\`__ref\`) where the object sat in the query structure.
5. Every component reads data "through references". When a mutation returns \`User{id, name}\`, a single record \`User:42\` changes — and **every screen showing that user re-renders on its own**. Plus deduplication: one object, one record, not a copy per query.

## Example

\`\`\`ts
// server response
// { user: { __typename: 'User', id: '42', name: 'Ada' } }

// in the cache it lies FLAT:
// ROOT_QUERY: { 'user({"id":"42"})': { __ref: 'User:42' } }
// 'User:42':  { __typename: 'User', id: '42', name: 'Ada' }

// LISTS, however, do not update themselves — the classic bug:
addTodo({
  variables: { text },
  update(cache, { data }) {                       // without this the new todo never shows
    cache.modify({ fields: { todos: (refs = []) => [...refs, data.addTodo] } });
  },
});
\`\`\`

Why this works: Apollo knows that \`Todo:7\` changed, but it **cannot guess** which lists the new item belongs in — that's a business decision (what if it doesn't match the filter?). So list insertion is written by hand in \`update\`, or paid for with an extra round-trip via \`refetchQueries\`.

## When to pick GraphQL and when not to

- **Pick it**: many different screens over the same entities, several clients with different data needs, a zoo of services you want to unify behind one schema.
- **Skip it**: simple CRUD with predictable resources, a small team, or when HTTP caching and a CDN over REST buy more than query flexibility. Don't adopt Apollo because it's fashionable — \`fetch\` plus TanStack Query or RTK Query is often simpler and cheaper to maintain.
- GraphQL has a separate server-side cost: expensive and N+1 resolvers are easy to hit without DataLoader and query-depth limits.

## What to say in the interview

> In REST the server fixes the field set, which gives you over- and under-fetching, versioning and lots of endpoints. In GraphQL the client declares the data shape: one request per screen and a schema as a strict contract; you pay with cache complexity and the risk of expensive N+1 resolvers on the server. Apollo's normalized cache splits a response into objects keyed by \`__typename\` plus \`id\` and stores them flat, like a mini database, rather than per query — so a mutation returning a \`User\` automatically updates every screen showing that user, with no duplication. It bites in three places: lists don't grow by themselves, you need an \`update\` callback or \`refetchQueries\`; objects without \`id\` in the selection cache by query path and produce duplicates, fixed with \`keyFields\`; and pagination needs manual \`merge\` and \`read\` in \`typePolicies\`. For simple CRUD I'd stay on REST with TanStack Query.

## Gotchas

- **Forgetting to select \`id\`** — there's nothing to normalize by, so the object caches by query path. Hence "the data didn't refresh" and duplicates; fix with \`keyFields\` or the rule "always request id".
- **Lists after a mutation**: the single most common interview bug. The answer is \`update\`/\`cache.modify\`; \`refetchQueries\` is the fallback at the price of an extra round-trip.
- **Pagination without \`merge\`** — each new page overwrites the previous one. You need \`keyArgs\` plus \`merge\` in \`typePolicies\`.
- **Cache invalidation** stays hard: expect a follow-up on \`fetchPolicy\` (\`cache-first\` vs \`cache-and-network\`) — know the difference.
- GraphQL **isn't free on the server**: without DataLoader one query easily becomes hundreds of SQL queries.
- GraphQL over POST **breaks HTTP caching and CDN reuse**, which REST gives you for free. That's a genuine argument against it.`,
    },
    codeSnippet: `const cache = new InMemoryCache({
  typePolicies: {
    User: { keyFields: ['id'] },               // identity for normalization
    Query: {
      fields: {
        feed: {                                 // cursor pagination merge
          keyArgs: ['filter'],
          merge(existing = { items: [] }, incoming) {
            return { ...incoming, items: [...existing.items, ...incoming.items] };
          },
        },
      },
    },
  },
});

// after a mutation, lists need an explicit update — they are NOT auto-inserted
addTodo({
  variables: { text },
  update(cache, { data }) {
    cache.modify({ fields: { todos: (refs = []) => [...refs, data.addTodo] } });
  },
});`,
  },
  {
    id: 'arch-044',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['error-handling', 'error-boundaries', 'resilience'],
    question: {
      ru: 'Как спроектировать глобальную обработку ошибок и устойчивость SPA: ErrorHandler, границы ошибок, деградация?',
      en: 'How do you design global error handling and SPA resilience: ErrorHandler, error boundaries, graceful degradation?',
    },
    answer: {
      ru: `## В чём суть

Обработка ошибок в SPA — это **три этажа защиты**. Глобальный перехватчик (\`ErrorHandler\`) — чтобы ни одна ошибка не потерялась молча. HTTP-интерсептор — чтобы централизованно разбирать 401, 5xx и обрывы сети. И изоляция сбоев по виджетам — чтобы падение одного блока не уносило всю страницу. Поверх этого — правило «fail soft»: интерфейс деградирует, а не показывает белый экран.

Аналогия: электрощиток в квартире. Замкнуло в ванной — выбивает **автомат на ванную**, а не весь дом; свет на кухне продолжает гореть (это граница ошибок). Общий счётчик записывает событие (это глобальный \`ErrorHandler\` и Sentry). А если линия постоянно коротит, разумно её вообще отключить и не щёлкать автоматом каждые пять секунд (это circuit breaker).

**Какую проблему решает.** Без системы ошибки теряются в консоли пользователя, спиннеры висят вечно, а повторный POST после таймаута создаёт два одинаковых заказа. Один сломанный график может «заморозить» соседние виджеты, а флапающий бэкенд добивают тысячи вкладок, которые повторяют запросы одновременно. Хорошо спроектированная обработка ошибок даёт три вещи: разработчики узнают о каждом сбое, пользователь видит понятную деградацию, а система не усугубляет аварию.

## Словарик терминов

- **\`ErrorHandler\`** — сервис Angular, в который фреймворк отправляет все непойманные ошибки. По умолчанию просто пишет их в консоль.
- **\`provideBrowserGlobalErrorListeners()\`** — провайдер Angular 20+, который подписывается на события окна \`error\` и \`unhandledrejection\` и пересылает их в \`ErrorHandler\`.
- **\`unhandledrejection\`** — событие браузера, когда промис отклонился, а \`.catch\` никто не повесил.
- **\`HttpInterceptorFn\`** — функция-перехватчик, через которую проходит каждый запрос \`HttpClient\` и каждый ответ.
- **\`HttpErrorResponse\`** — объект ошибки HTTP в Angular; \`status === 0\` означает, что ответа не было вовсе (сеть, CORS, таймаут).
- **Идемпотентность** — свойство запроса давать тот же результат при повторе: \`GET\` и \`PUT\` идемпотентны, \`POST\` обычно нет.
- **Idempotency-Key** — уникальный ключ в заголовке, по которому сервер узнаёт повтор и не создаёт второй заказ.
- **Exponential backoff** — каждая следующая попытка ждёт вдвое дольше: 300, 600, 1200 мс.
- **Jitter** — случайная добавка к задержке, чтобы тысячи клиентов не повторяли запрос в одну и ту же миллисекунду.
- **Error boundary (граница ошибок)** — зона, внутри которой сбой изолируется и заменяется заглушкой. В React есть встроенный механизм, в Angular — нет.
- **Graceful degradation / fail soft** — при сбое части системы показывать урезанную, но рабочую версию: старые данные, заглушку, кнопку «повторить».
- **Circuit breaker (предохранитель)** — после N ошибок подряд временно перестаёт звать сервис и сразу отдаёт запасной ответ, потом осторожно пробует снова.
- **\`@defer\` / \`@error\`** — блок отложенной загрузки в шаблоне Angular и его ветка на случай, если чанк не скачался.
- **\`withNavigationErrorHandler\`** — функция роутера Angular для централизованной обработки ошибок навигации (резолверы, ленивые роуты).
- **Sentry** — сервис сбора ошибок: группирует их, привязывает к версии и шлёт алерты.

## Как это работает под капотом

Куда попадает ошибка в Angular 21 в зависимости от того, где она произошла:

1. Ошибка в обработчике события (\`(click)\`) — Angular ловит её сам и передаёт в \`ErrorHandler\`, поэтому приложение продолжает работать.
2. Ошибка в шаблоне, \`computed\` или \`effect\` во время change detection — проход проверки прерывается, и ошибка уходит в \`ErrorHandler\`, поэтому компоненты, до которых проход не дошёл, в этот раз не обновятся.
3. Ошибка в RxJS-подписке без колбэка \`error\` — RxJS перебрасывает её асинхронно через \`setTimeout\`, поэтому \`try/catch\` вокруг \`subscribe\` её не поймает, и она всплывает как событие окна \`error\`.
4. Отклонённый промис без \`.catch\` — браузер генерирует \`unhandledrejection\`.
5. Пункты 3 и 4 доходят до \`ErrorHandler\`, только если подключён \`provideBrowserGlobalErrorListeners()\` (новые проекты Angular CLI добавляют его по умолчанию), иначе в приложении без zone.js они остаются только в консоли.
6. HTTP-ошибка проходит цепочку интерсепторов и попадает в \`error\` подписчика; если колбэка \`error\` нет, RxJS выбросит её асинхронно, как в пункте 3.
7. \`ErrorHandler\` Angular берёт из корневого environment-инжектора, поэтому он один на приложение: подменить его в \`providers\` отдельного компонента ради «локальной» обработки не получится.

### Пример 1. Глобальный \`ErrorHandler\`

Что делает: единая точка, куда стекаются все непойманные ошибки, — логирование и один общий toast.

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private sentry = inject(SentryService);
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    try {
      const e = error instanceof HttpErrorResponse ? null : error; // HTTP разбирает интерсептор
      if (e) {
        this.sentry.capture(e);
        this.toast.errorOnce('Что-то пошло не так');                 // дедупликация, без спама
      }
    } finally {
      console.error(error);                                          // никогда не глотаем молча
    }
  }
}

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),                 // window error + unhandledrejection
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
\`\`\`

\`try/finally\` нужен, чтобы сбой в самом обработчике (Sentry не загрузился, toast-сервис упал) не потерял исходную ошибку.

### Пример 2. Куда «улетает» ошибка без обработчика

\`\`\`js
const { throwError } = require('rxjs');
process.on('uncaughtException', e => console.log('глобально пойман:', e.message));
process.on('unhandledRejection', e => console.log('unhandledRejection:', e.message));

try {
  throwError(() => new Error('boom')).subscribe(v => console.log(v)); // нет колбэка error
  console.log('subscribe вернулся без исключения');
} catch (e) { console.log('try/catch поймал', e.message); }
console.log('синхронный код закончился');
Promise.reject(new Error('забытый промис'));
// subscribe вернулся без исключения
// синхронный код закончился
// unhandledRejection: забытый промис
// глобально пойман: boom
\`\`\`

Код запускался в Node с RxJS 7.8, вывод настоящий. \`try/catch\` ничего не поймал: RxJS отложил выброс ошибки. В браузере на месте \`process.on\` — события окна \`error\` и \`unhandledrejection\`, и именно их слушает \`provideBrowserGlobalErrorListeners()\`.

### Пример 3. HTTP-интерсептор: повторяем только то, что безопасно повторять

Что делает: централизованно повторяет запросы при временных сбоях и разбирает статусы.

\`\`\`ts
const isRetryable = (e: HttpErrorResponse) => e.status === 0 || e.status >= 500; // сеть или сервер

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService), log = inject(LogService);
  return next(req).pipe(
    retry({
      count: req.method === 'GET' ? 2 : 0,          // ретраим ТОЛЬКО идемпотентное
      delay: (e: HttpErrorResponse, attempt) =>     // attempt начинается с 1
        isRetryable(e)
          ? timer(300 * 2 ** (attempt - 1) + Math.random() * 100) // backoff + jitter
          : throwError(() => e),                     // 400/401/404 повторять бессмысленно
    }),
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401) auth.logout();           // или refresh токена
      log.capture(e);                                // никогда не глотаем молча
      return throwError(() => e);                    // отдаём дальше — экран решит, как деградировать
    }),
  );
};
\`\`\`

Этот интерсептор (с уменьшенными задержками) прогонялся в Vitest через \`HttpTestingController\` — тестовую подмену бэкенда Angular. Сводка того, что показал тест:

\`\`\`text
GET /api/kpi: 503 → 503 → 200   — три попытки, данные получены
POST /api/orders: 503           — ни одного повтора
GET /api/missing: 404           — ни одного повтора
\`\`\`

\`count: 0\` для POST — не перестраховка, а защита от **двойных заказов**: сервер мог успеть создать заказ, а потерялся только ответ. Повторять неидемпотентный запрос можно только с \`Idempotency-Key\`.

### Пример 4. Backoff и jitter

Что делает: разносит повторы во времени. Проверено на RxJS 7.8 — \`retry\` передаёт номер попытки начиная с 1:

\`\`\`ts
// задержка = 300 * 2^(attempt - 1) + случайные 0–100 мс
// попытка 1 → ~300–400 мс, попытка 2 → ~600–700 мс, попытка 3 → ~1200–1300 мс
\`\`\`

Экспонента даёт серверу время подняться. Jitter нужен, чтобы тысяча открытых вкладок после сбоя не пришла к восстанавливающемуся серверу в одну и ту же миллисекунду и не положила его снова.

### Пример 5. Почему сломанный виджет может «заморозить» соседей

Эксперимент на Angular 21 (zoneless, TestBed в Vitest): в шаблоне хоста стоят \`<risky-widget/>\` и после него \`<sibling-widget/>\`. Первый начинает бросать ошибку в шаблоне, одновременно меняется счётчик, который показывает сосед. У \`<risky-widget>\` в \`providers\` объявлен собственный \`ErrorHandler\`. Сводка вывода теста:

\`\`\`text
sibling до ошибки: 0
sibling после изменения счётчика на 1: 0     ← сосед не обновился
sibling после изменения счётчика на 2: 0     ← и дальше не обновляется
после устранения ошибки: 3 ok
вызван: корневой ErrorHandler; локальный ErrorHandler из providers — нет
\`\`\`

Два вывода. Первый: исключение в шаблоне прерывает проход change detection, и компоненты после сломанного могут перестать обновляться — это не «упал один виджет», а «замерла часть экрана». Второй: \`ErrorHandler\`, объявленный в \`providers\` компонента, фреймворк не использует — ошибка уходит в корневой.

### Граница ошибок в Angular своими руками

В React для этого есть встроенный механизм — компонент-граница с методом \`componentDidCatch\`, который ловит ошибки рендера всего поддерева и показывает заглушку. Встроенных error boundaries в Angular нет, поэтому изоляцию строят на уровне **данных** и состояний: каждый виджет сам превращает ошибку своих данных в состояние «ошибка» и рисует заглушку.

\`\`\`ts
type State<T> = { kind: 'loading' } | { kind: 'ok'; data: T } | { kind: 'error' };

@Component({
  selector: 'weather-widget',
  template: \`
    @switch (state().kind) {
      @case ('loading') { <div class="skeleton"></div> }
      @case ('error') { <p>Погода недоступна</p> <button (click)="reload()">Повторить</button> }
      @case ('ok') { <weather-view [data]="$any(state()).data" /> }
    }
  \`,
})
export class WeatherWidget {
  private api = inject(WeatherApi);
  private reload$ = new BehaviorSubject<void>(undefined);
  readonly state = toSignal(
    this.reload$.pipe(
      switchMap(() => this.api.load().pipe(
        map(data => ({ kind: 'ok', data }) as State<Weather>),
        startWith({ kind: 'loading' } as State<Weather>),
        catchError(() => of({ kind: 'error' } as State<Weather>)), // ошибка остаётся внутри виджета
      )),
    ),
    { initialValue: { kind: 'loading' } as State<Weather> },
  );
  reload() { this.reload$.next(); }
}
\`\`\`

\`catchError\` стоит внутри \`switchMap\`, поэтому после ошибки внешний поток жив и кнопка «Повторить» работает. Ошибки **рендера** (баг в шаблоне) так не изолируются — их ловит только глобальный \`ErrorHandler\`, а лечатся они исправлением кода; поэтому шаблоны держат простыми, а вычисления — в протестированном коде.

### \`@defer\` и блок \`@error\`: что он ловит на самом деле

\`\`\`html
@defer (on viewport) {
  <risky-widget />
} @loading {
  <div class="skeleton"></div>
} @error {
  <p>Не удалось загрузить виджет</p>
}
\`\`\`

Блок \`@error\` показывается, когда **не удалось скачать** чанк с зависимостями отложенного блока: сеть пропала или после деплоя старый файл удалили с сервера. Ошибку, которую бросил уже загруженный \`<risky-widget>\` в своём шаблоне или конструкторе, \`@error\` не перехватывает — это видно и в исходниках Angular 21: состояние Error выставляется только при неудачной загрузке зависимостей. Поэтому \`@defer\` — граница для сбоев загрузки, а не для багов компонента.

### Ошибки навигации: \`withNavigationErrorHandler\`

Что делает: централизованно обрабатывает ошибки навигации — упавший резолвер, гард или ленивый роут, чей чанк не скачался.

\`\`\`ts
provideRouter(routes, withNavigationErrorHandler((e: NavigationError) => {
  inject(LogService).capture(e.error);
  return new RedirectCommand(inject(Router).parseUrl('/error'));   // вместо пустого экрана
}));
\`\`\`

Функция выполняется в контексте внедрения, поэтому внутри работает \`inject\`. Если вернуть \`RedirectCommand\`, роутер выполнит перенаправление вместо события \`NavigationError\`.

### Circuit breaker

Что делает: считает ошибки подряд; после порога «размыкается» и какое-то время сразу отдаёт запасной ответ, не нагружая упавший сервис; после паузы пропускает один пробный запрос. Код запускался в Node, вывод настоящий:

\`\`\`js
class CircuitBreaker {
  state = 'CLOSED'; failures = 0; openedAt = 0;
  constructor(threshold = 3, cooldownMs = 10_000, now = () => Date.now()) {
    this.threshold = threshold; this.cooldownMs = cooldownMs; this.now = now;
  }
  async call(request, fallback) {
    if (this.state === 'OPEN') {
      if (this.now() - this.openedAt < this.cooldownMs) return fallback(); // в сеть не идём
      this.state = 'HALF_OPEN';                                             // пробный запрос
    }
    try {
      const result = await request();
      this.state = 'CLOSED'; this.failures = 0;
      return result;
    } catch {
      this.failures++;
      if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
        this.state = 'OPEN'; this.openedAt = this.now();
      }
      return fallback();
    }
  }
}

let clock = 0, serverUp = false, hits = 0;
const breaker = new CircuitBreaker(3, 10_000, () => clock);
const request = async () => { hits++; if (!serverUp) throw new Error('503'); return 'свежие данные'; };
const fallback = () => 'кэш';

for (let i = 1; i <= 5; i++) console.log(\`t=\${clock / 1000}s вызов \${i}:\`, await breaker.call(request, fallback), breaker.state);
console.log('запросов дошло до сервера:', hits);
clock = 11_000; serverUp = true;
console.log(\`t=\${clock / 1000}s:\`, await breaker.call(request, fallback), breaker.state);
// t=0s вызов 1: кэш CLOSED
// t=0s вызов 2: кэш CLOSED
// t=0s вызов 3: кэш OPEN
// t=0s вызов 4: кэш OPEN
// t=0s вызов 5: кэш OPEN
// запросов дошло до сервера: 3
// t=11s: свежие данные CLOSED
\`\`\`

Пять вызовов, но до сервера дошли только три: после третьей ошибки предохранитель разомкнулся. Через 10 секунд пробный запрос прошёл, и цепь снова замкнулась.

### Ожидаемые и неожиданные ошибки

- **Ожидаемые** — валидация, 404 «заказ не найден», 403 «нет прав» (экран или сообщение «недостаточно доступа» вместо повторов), 409 «конфликт версий»: это нормальный доменный поток, экран показывает понятное сообщение, алерт не нужен.
- **Неожиданные** — \`TypeError\` в коде, 500, упавший чанк: в \`ErrorHandler\`, в Sentry, алерт разработчику.
- Пользователю никогда не показывают stack trace и внутренние сообщения сервера.
- Конкретная рекомендация: маленькому приложению хватает глобального \`ErrorHandler\` и интерсептора. Изоляцию по виджетам и circuit breaker вводят, когда на экране много независимых блоков и падение одного не должно стоить всей страницы.

### Где это применяется на практике

- **Дашборды с десятками виджетов**: каждый виджет со своим состоянием ошибки и кнопкой «повторить», упавший график не трогает соседей.
- **HTTP-слой enterprise-приложения**: один интерсептор с retry для GET, разбором 401 (refresh или logout) и логированием.
- **Формы оплаты и заказы**: никаких автоповторов POST без \`Idempotency-Key\`, понятное сообщение при 409.
- **Частые деплои**: обработка ошибки загрузки чанка — предложить перезагрузить страницу, потому что старых файлов на сервере уже нет.
- **Интеграции с нестабильными внешними сервисами**: circuit breaker отдаёт кэш вместо лавины повторов.

## Важные нюансы и подводные камни

- **Глобальный \`catchError\`, который всё проглатывает** — тихие баги, которых никто никогда не увидит. Логируйте всегда, даже когда показываете фолбэк.
- **Toast на каждую ошибку фонового поллинга** — спам, после которого пользователь перестаёт читать сообщения. Дедуплицируйте и не шумите про фон.
- **\`ErrorHandler\`, который сам бросает исключение**, теряет исходную ошибку, а если он меняет состояние, которое читает сломанный шаблон, или шлёт логи через тот же падающий HTTP-слой, легко получить цикл ошибок. Обработчик должен быть максимально простым и обёрнутым в \`try\`.
- **«А в Angular есть error boundaries?»** Правильный ответ — **встроенных нет**. \`@defer\` с \`@error\` ловит только сбой загрузки чанка, а \`ErrorHandler\` в \`providers\` компонента фреймворк не использует; изоляцию строят на состояниях данных.
- **Retry на POST без ключа идемпотентности** — классический продовый инцидент с дублями.
- **Retry на 4xx** бессмысленен: 400, 401, 404 не исправятся от повтора, а только задержат ответ.
- **Забытые \`unhandledrejection\` и ошибки подписок.** Они проходят мимо \`try/catch\`; без \`provideBrowserGlobalErrorListeners()\` в приложении без zone.js они не доходят до \`ErrorHandler\`.
- **Ошибка в шаблоне замораживает соседей.** Прерванный проход change detection оставляет часть экрана необновлённой — поэтому вычисления выносят из шаблонов в протестированный код.
- **Ошибка загрузки чанка после деплоя.** Пользователь с открытой вкладкой переходит на ленивый роут, а старого файла уже нет; без обработки это пустой экран.

**Плюсы:** ни одна ошибка не теряется, пользователь видит понятную деградацию вместо белого экрана, система не добивает упавший бэкенд, а дубли платежей исключены.
**Минусы:** в Angular нет встроенных границ ошибок — изоляцию приходится строить руками на уровне данных; больше кода и состояний в каждом виджете; неаккуратный глобальный обработчик сам становится источником проблем.

## Как это спрашивают на собеседовании

**Главный вывод:** три слоя — глобальный \`ErrorHandler\` с глобальными слушателями, HTTP-интерсептор с retry только для идемпотентных запросов и изоляция ошибок в каждом виджете. Встроенных error boundaries в Angular нет: \`@defer @error\` ловит только сбой загрузки.

Типичные формулировки: «Как вы организуете обработку ошибок в Angular-приложении?», «Как сделать, чтобы падение одного виджета не роняло страницу?», «Когда можно повторять запрос?».

Что могут спросить следом:

- *Почему нельзя повторять POST?* — Сервер мог создать запись, а потерялся только ответ; повтор даст дубль. Только с \`Idempotency-Key\`.
- *Зачем jitter?* — Чтобы тысячи клиентов не повторяли запрос одновременно и не положили восстанавливающийся сервер.
- *Что ловит \`@defer @error\`?* — Только неудачную загрузку чанка, не ошибки внутри компонента.
- *Куда попадает ошибка из подписки без \`error\`?* — RxJS бросает её асинхронно, она всплывает как событие окна \`error\` и доходит до \`ErrorHandler\` через \`provideBrowserGlobalErrorListeners()\`.

### Ответ на 1 минуту

> Я строю обработку ошибок тремя слоями. Глобальный \`ErrorHandler\` вместе с \`provideBrowserGlobalErrorListeners\` — единая точка логирования в Sentry и одного дедуплицированного toast; он ловит всё непойманное, включая ошибки подписок и промисов, но не локализует сбой. HTTP-интерсептор разбирает 401 через refresh или logout, логирует и повторяет с экспоненциальным backoff и jitter только идемпотентные запросы при сетевых и серверных ошибках — повтор POST без idempotency-key даёт двойные заказы. Третий слой — изоляция: встроенных error boundaries в Angular нет, \`@defer\` с \`@error\` ловит только сбой загрузки чанка, поэтому каждый виджет сам переводит ошибку данных в состояние с заглушкой и кнопкой «повторить». Ожидаемые ошибки идут доменным потоком, неожиданные — в алерт, а на флапающий бэкенд ставлю circuit breaker.`,
      en: `## In short

Error handling in a SPA is **three floors of defense**: a global catcher so no error dies silently, an HTTP interceptor to deal with 401/5xx and network faults in one place, and error boundaries so one broken widget doesn't take the whole page down.

Analogy: the breaker box in a flat. A short in the bathroom trips **the bathroom breaker**, not the whole building — the kitchen lights stay on (that's an error boundary). The meter records the event (that's the global \`ErrorHandler\` plus Sentry). And if a line keeps shorting, you cut it off rather than flipping the breaker every five seconds (that's a circuit breaker).

## How it works, step by step

1. **The global \`ErrorHandler\`** (Angular) catches every uncaught sync and RxJS error. One place to log to Sentry and show a single toast. But it **does not localize** the failure — a crashed component doesn't fence itself off.
2. **The HTTP interceptor** owns the network layer: 401 (refresh or logout), 403, 5xx, dropped connections, and retry-with-backoff for idempotent requests. That keeps HTTP failures separate from code bugs.
3. **Error boundaries.** In React that's \`componentDidCatch\` and \`<ErrorBoundary>\` isolating a subtree. Angular has none built in: the pattern is assembled from \`@defer (error)\`, a wrapper with a local \`ErrorHandler\` in component providers, or catching render errors at the router level.
4. **The screen decides how to degrade**: a placeholder, a "retry" button, stale cached data — anything but a white screen.

## Example

\`\`\`ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService), log = inject(LogService);
  return next(req).pipe(
    retry({
      count: req.method === 'GET' ? 2 : 0,                  // retry ONLY idempotent calls
      delay: (_, i) => timer(300 * 2 ** i + Math.random() * 100), // backoff + jitter
    }),
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401) auth.logout();
      log.capture(e);                    // never swallow silently
      return throwError(() => e);        // rethrow — the screen decides how to degrade
    }),
  );
};

// Angular @defer as a lightweight error boundary for a subtree:
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }
\`\`\`

Why this works: \`count: 0\` for POST isn't paranoia, it's protection against **double orders**; a non-idempotent request may only be retried with an idempotency key. The jitter (a random addition to the delay) stops a thousand tabs from hitting a recovering server at exactly the same moment.

## Resilience principles

- **Fail soft, not whole-page**: an error in the weather widget must not crash the dashboard — degrade to a placeholder.
- Distinguish **expected** errors (validation, a 404 — a normal domain flow) from **unexpected** ones (a bug → ErrorHandler plus a developer alert). Never show a user a stack trace.
- **Circuit breaker** on a flapping backend: after N consecutive failures, serve cache or a fallback for a while and stop hammering the service — otherwise clients finish off what was already struggling.
- **A concrete recommendation**: a small app is fine with a global \`ErrorHandler\` plus an interceptor. Introduce real boundaries and a circuit breaker once a screen holds many independent widgets and one failure must not cost you the page.

## What to say in the interview

> I build error handling in three layers. The global \`ErrorHandler\` is the single point for logging to Sentry and showing a toast; it catches everything uncaught but doesn't localize the failure. The HTTP interceptor centrally handles 401 with refresh or logout, 403, 5xx and dropped connections, and retries with exponential backoff and jitter — **only for idempotent requests**, because retrying a POST without an idempotency key produces double orders. The third layer is error boundaries: React has \`componentDidCatch\`, Angular has nothing built in, so I assemble them from \`@defer\` with an \`@error\` block or a local \`ErrorHandler\` in component providers. The principle is fail soft: a broken widget degrades to a placeholder instead of taking down the dashboard. Expected errors like validation and 404 go through the domain flow, unexpected ones raise an alert. Against a flapping backend I add a circuit breaker: after N failures I serve cache instead of requests.

## Gotchas

- **A global \`catchError\` that swallows everything** — silent bugs nobody ever sees. Always log, even when you show a fallback.
- **A toast per background-poll error** — spam, after which users stop reading messages at all. Deduplicate and stay quiet about background work.
- **An ErrorHandler that throws** → an infinite loop and a hung browser.
- They'll ask "does Angular have error boundaries?" The right answer is **not built in** — there's \`@defer (error)\` and hand-rolled wrappers.
- Retrying a POST without an idempotency key is a classic production incident with duplicate records.
- Forgetting \`unhandledrejection\` and errors thrown inside \`effect\`/subscriptions: they slip past \`try/catch\` and get lost easily.`,
    },
    codeSnippet: `@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private sentry = inject(SentryService);
  private toast = inject(ToastService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? null : error; // HTTP handled in interceptor
    if (e) { this.sentry.capture(e); this.toast.errorOnce('Something went wrong'); }
    console.error(error);            // never silently swallow
  }
}

// Angular @defer acts as a lightweight error boundary for a subtree:
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }`,
  },
  {
    id: 'arch-045',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['observability', 'sentry', 'source-maps', 'tracing'],
    question: {
      ru: 'Как выстроить observability фронтенда: Sentry, RUM, source maps, distributed tracing и Core Web Vitals?',
      en: 'How do you build frontend observability: Sentry, RUM, source maps, distributed tracing, and Core Web Vitals?',
    },
    answer: {
      ru: `## В чём суть

Observability фронтенда — это умение ответить на вопрос «что сейчас происходит у реальных пользователей» без того, чтобы просить их прислать скриншот. Она собирается из трёх сигналов: **ошибки** (что сломалось и в каком релизе), **RUM** (насколько быстро всё работает на живых устройствах) и **трейсы** (полный путь запроса от кнопки до базы данных). Source maps делают ошибки читаемыми, а Core Web Vitals — общий язык для разговора о скорости.

Аналогия: посылка с трек-номером. Каждый курьер отмечает свой этап под **одним и тем же номером**, поэтому видно, где именно она застряла. Такой номер в вебе — заголовок \`traceparent\`: браузер его выдаёт, бэкенд продолжает. А source maps — это ключ к шифру: без них отчёт об ошибке приходит на языке минификатора (\`a.b is not a function\`) и не читается.

**Какую проблему решает.** Бэкенд видит свои логи и метрики, но всё, что случилось в браузере, для него невидимо: упавший скрипт, медленный рендер на дешёвом Android, запрос, который пользователь не дождался. Без наблюдаемости о проблемах узнают из жалоб через неделю, а диагноз ставят гаданием. С ней — через пять минут после деплоя, с точной строкой кода, релизом и долей затронутых пользователей.

## Словарик терминов

- **Observability (наблюдаемость)** — способность понять внутреннее состояние системы по тем данным, которые она отдаёт наружу: ошибкам, метрикам, трейсам.
- **Error tracking (Sentry, Bugsnag)** — сервис, который собирает исключения из браузеров, группирует одинаковые и шлёт алерты.
- **Fingerprint (отпечаток)** — признак, по которому тысячи одинаковых ошибок склеиваются в одну проблему (issue).
- **Release / dist** — идентификатор версии (обычно git SHA) и вариант сборки; ими помечается каждая ошибка и каждая метрика.
- **Source map (карта исходников)** — файл соответствия «позиция в минифицированном бандле → строка в исходном TypeScript».
- **Символикация (symbolication)** — перевод минифицированного stack trace в читаемый с помощью source maps.
- **Debug ID** — уникальный идентификатор, который вшивается и в бандл, и в его карту, чтобы сервис нашёл нужную карту без сверки версий.
- **RUM (Real User Monitoring)** — замеры скорости и ошибок с браузеров настоящих пользователей.
- **Core Web Vitals** — три ключевые метрики Google: LCP, INP, CLS.
- **LCP (Largest Contentful Paint)** — когда отрисован самый большой элемент первого экрана. Хорошо — до 2,5 с, плохо — больше 4 с.
- **INP (Interaction to Next Paint)** — задержка от действия пользователя до следующей отрисовки. Хорошо — до 200 мс, плохо — больше 500 мс. С марта 2024 года заменил FID.
- **CLS (Cumulative Layout Shift)** — насколько «прыгает» вёрстка при загрузке. Хорошо — до 0,1, плохо — больше 0,25.
- **Перцентиль p75** — значение, которое не превышают 75% замеров; именно по p75 оценивают Core Web Vitals.
- **Лабораторные и полевые данные (lab / field)** — замер в контролируемых условиях (Lighthouse) и замер у реальных пользователей (RUM, CrUX).
- **Distributed tracing (распределённая трассировка)** — сквозная запись пути запроса через браузер и все сервисы.
- **Trace / span** — трейс — весь путь одного действия; спан — один его отрезок (запрос, рендер, SQL-запрос) со временем начала и конца.
- **\`traceparent\` (W3C Trace Context)** — стандартный HTTP-заголовок, в котором передаются id трейса и id родительского спана.
- **OpenTelemetry (OTel)** — открытый стандарт и набор библиотек для трейсов и метрик, не привязанный к вендору.
- **Сэмплирование (sampling)** — запись только части трейсов: head-based решает в начале запроса, tail-based — после его завершения.
- **PII (персональные данные)** — email, телефон, имя, номера документов; их нельзя отправлять в сторонние сервисы без необходимости.
- **Breadcrumbs («хлебные крошки»)** — события, которые SDK записывает перед ошибкой: клики, переходы, запросы, сообщения консоли.

## Как это работает под капотом

Путь ошибки от браузера пользователя до читаемого issue:

1. CI собирает бандл с картами исходников и помечает сборку релизом (git SHA), поэтому у каждой версии есть свой набор карт.
2. На шаге CI карты загружаются в Sentry и удаляются из \`dist\`, поэтому в прод уезжает только минифицированный код.
3. В браузере SDK перехватывает ошибку (событие \`error\`, \`unhandledrejection\`, \`ErrorHandler\` Angular), поэтому ни одно исключение не теряется.
4. SDK собирает событие: минифицированный stack trace, release, URL, браузер, breadcrumbs, затем вызывает \`beforeSend\`, поэтому персональные данные можно вычистить ещё в браузере.
5. Сервер Sentry находит карты по release и имени файла (или по Debug ID) и символицирует стек, поэтому вы видите \`order-form.component.ts:42\`, а не \`main.3f9a1c.js:1:48213\`.
6. Одинаковые ошибки склеиваются по fingerprint, считается число пользователей и релизов, срабатывает алерт.

Параллельно работают RUM (метрики скорости с каждого визита уходят на сервер и агрегируются по перцентилям) и трейсинг (браузер открывает спан на запрос и передаёт его id в заголовке \`traceparent\`).

### Пример 1. Инициализация Sentry

Что делает: подключает сбор ошибок, трейсинг запросов и фильтры. Это конфигурация из кода под ответом с пояснениями:

\`\`\`ts
Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                    // ДОЛЖЕН совпадать с релизом загруженных карт
  tracesSampleRate: 0.15,                 // 15% трейсов — иначе счёт улетит в космос
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//],  // traceparent шлём только на свой бэкенд
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                     // вычищаем PII ДО отправки из браузера
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});
\`\`\`

\`release\` связывает три мира — ошибки, метрики и загруженные карты. \`tracesSampleRate\` касается только трейсов: ошибки по умолчанию отправляются все (за них отвечает отдельная опция \`sampleRate\`). В Angular к этому добавляют \`{ provide: ErrorHandler, useValue: Sentry.createErrorHandler() }\` из \`@sentry/angular\`, чтобы ошибки фреймворка шли в Sentry. Имена API даны для SDK версии 8 и новее — сверяйтесь с документацией своей версии.

### Пример 2. Source maps: собрать, загрузить, не опубликовать

Что делает: Angular генерирует карты, но не добавляет в бандл комментарий-ссылку на source map, поэтому браузер (и любопытный пользователь) их не ищет.

\`\`\`json
"configurations": {
  "production": {
    "sourceMap": { "scripts": true, "styles": false, "hidden": true }
  }
}
\`\`\`

\`\`\`bash
npx ng build
npx sentry-cli sourcemaps inject ./dist                        # вшивает Debug ID в бандлы и карты
npx sentry-cli sourcemaps upload --release "$GIT_SHA" ./dist   # загружает карты в Sentry
find dist -name "*.map" -delete                                # в прод карты не едут
\`\`\`

Опция \`hidden\` убирает только ссылку — сами файлы \`.map\` остаются в \`dist\`, поэтому их удаляют явно. Если опубликовать карты, вы раздаёте исходники. Классическая схема находит карту по \`release\` и имени файла: разошлись версии — символикация ломается, и вы снова читаете \`a.b\`. Debug ID снимает эту зависимость, но \`release\` всё равно нужен, чтобы видеть, в каком деплое появилась ошибка.

### Пример 3. Почему p75, а не среднее

LCP с двенадцати визитов: восемь быстрых десктопов и четыре дешёвых Android. Код запускался в Node, вывод настоящий:

\`\`\`js
const lcp = [900, 1000, 1100, 1100, 1200, 1200, 1300, 1400, 3900, 4200, 4600, 5100];
const mean = lcp.reduce((a, b) => a + b, 0) / lcp.length;
// перцентиль методом nearest-rank: значение, которое не превышают p% замеров
const percentile = (arr, p) => [...arr].sort((a, b) => a - b)[Math.ceil((p / 100) * arr.length) - 1];
console.log('среднее', Math.round(mean));
console.log('p50', percentile(lcp, 50));
console.log('p75', percentile(lcp, 75));
console.log('p95', percentile(lcp, 95));
// среднее 2250
// p50 1200
// p75 3900
// p95 5100
\`\`\`

Среднее 2,25 с выглядит «хорошо» (меньше 2,5 с), медиана 1,2 с — «отлично», а p75 = 3,9 с говорит правду: каждый четвёртый пользователь ждёт почти 4 секунды. Поэтому Core Web Vitals оценивают по p75 и обязательно режут по устройству, стране и релизу.

### Пример 4. RUM своими руками: библиотека \`web-vitals\`

Что делает: измеряет LCP, INP и CLS в браузере так же, как это делает Chrome, и отдаёт значения в колбэк.

\`\`\`ts
import { onLCP, onINP, onCLS, type Metric } from 'web-vitals';

function send(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,          // 'LCP' | 'INP' | 'CLS'
    value: metric.value,
    rating: metric.rating,      // 'good' | 'needs-improvement' | 'poor'
    release: env.gitSha,
    page: location.pathname,
  });
  navigator.sendBeacon('/rum', body);   // доставит даже при закрытии вкладки
}

onLCP(send);
onINP(send);
onCLS(send);
\`\`\`

\`sendBeacon\` ставит запрос в очередь браузера и не блокирует закрытие страницы — поэтому INP и CLS, которые окончательно известны только при уходе со страницы, не теряются. Готовые RUM-сервисы (Sentry, Datadog и другие) делают то же самое и сразу строят перцентили по релизам.

### Пример 5. \`traceparent\`: один номер на весь путь

Что делает: связывает спан браузера со спанами бэкенда. Формат — четыре поля через дефис. Код запускался в Node, вывод настоящий:

\`\`\`js
import { randomBytes } from 'node:crypto';
const traceId = randomBytes(16).toString('hex');   // 32 hex-символа — общий на весь путь
const spanId = () => randomBytes(8).toString('hex'); // 16 hex-символов — свой у каждого шага
const browserSpan = spanId();
const header = \`00-\${traceId}-\${browserSpan}-01\`;
console.log(header.length, header.split('-').map(p => p.length));
// 55 [ 2, 32, 16, 2 ]
// пример: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
//         версия-trace-id-id родительского спана-флаги (01 = трейс записывается)
\`\`\`

Браузер отправляет запрос с этим заголовком, бэкенд создаёт дочерний спан с тем же trace-id, и в интерфейсе трейсинга видно: клик → \`fetch\` 1,8 с → API 1,7 с → сервис отчётов 1,6 с → SQL 1,5 с. «Медленный LCP» превращается в «медленный конкретный запрос».

Почему \`tracePropagationTargets\` так важен: \`traceparent\` — нестандартный для CORS заголовок. Если отправить его на чужой домен, браузер сделает preflight, и сервер, который не разрешил этот заголовок в \`Access-Control-Allow-Headers\`, отклонит запрос — вы сломаете интеграцию. Плюс трейс-id утечёт третьим лицам.

### Пример 6. Сэмплирование: сколько трейсов хранить

\`\`\`ts
Sentry.init({
  // вместо одного числа — решение для каждого трейса
  tracesSampler: ({ name }) => {
    if (name.includes('/checkout')) return 1.0;   // оплата — все трейсы
    if (name.includes('/health')) return 0;       // мусор — ничего
    return 0.1;                                   // остальное — 10%
  },
});
\`\`\`

\`tracesSampleRate: 0.15\` — это head-based сэмплирование: решение принимается в начале трейса и передаётся дальше флагом в \`traceparent\`, чтобы бэкенд записывал те же трейсы. Tail-based сэмплирование («сохранить все трейсы с ошибками и самые медленные») делают уже после завершения трейса, на стороне коллектора, например OpenTelemetry Collector.

### PII и шум

- **\`beforeSend\`** — последний шанс вычистить персональные данные: query-строки URL (там бывают email и токены), тексты из breadcrumbs, поля пользователя.
- **\`sendDefaultPii\`** по умолчанию выключен, и SDK не отправляет IP и cookie, но URL и breadcrumbs (клики, переходы, адреса запросов, сообщения консоли) уходят — их и чистят.
- **\`ignoreErrors\`** отбрасывает известный безвредный шум: \`ResizeObserver loop limit exceeded\` (в новых браузерах — «ResizeObserver loop completed with undelivered notifications»).
- **\`Script error.\`** — так браузер маскирует ошибку из скрипта с чужого домена, загруженного без атрибута \`crossorigin\` и CORS-заголовков: ни сообщения, ни стека. Для своих CDN это лечится \`crossorigin="anonymous"\`, для чужих скриптов — фильтром.
- **\`denyUrls\`** отсекает ошибки из расширений браузера и сторонних виджетов: \`[/extensions\\//i, /^chrome-extension:\\/\\//]\`.

### Лаборатория и поле

- **Lighthouse** запускает страницу в контролируемых условиях: детерминирован, хорош для CI и поиска регрессий в PR, но это одна машина и одна сеть.
- **CrUX (Chrome UX Report)** — публичные полевые данные Chrome за последние 28 дней; на них опирается Google при оценке Core Web Vitals.
- **RUM** — ваши собственные полевые данные: по релизам, страницам, сегментам, в реальном времени.
- INP в лаборатории не измерить — нужен живой пользователь; Lighthouse показывает косвенную метрику TBT (Total Blocking Time).

### На что алертить

- На **регрессию p75 INP/LCP между релизами** и на всплеск error rate — а не на каждую единичную ошибку. Единичные ошибки есть всегда, они не должны будить человека ночью.
- Алерт должен указывать на **релиз**: «после деплоя abc123 p75 LCP вырос с 2,1 до 3,4 с» — это сразу и диагноз, и решение (откат).
- Полезный минимум дашборда: error rate по релизу, p75 трёх Core Web Vitals по релизу, доля неуспешных ключевых запросов.

### Где это применяется на практике

- **Enterprise-портал с частыми релизами**: каждая ошибка привязана к git SHA, canary-раскатка останавливается при росте error rate.
- **Большие гриды и формы**: INP по p75 показывает, что сортировка 50 000 строк на слабых ноутбуках «думает» 600 мс, хотя у разработчиков всё быстро.
- **Медленные отчёты**: трейс от клика до SQL показывает, что виноват не рендер, а конкретный сервис агрегации.
- **Регулируемые отрасли**: \`beforeSend\` и \`denyUrls\` — часть требований безопасности и GDPR, а не опция.
- **Публичные страницы**: CrUX и RUM по LCP и CLS прямо влияют на SEO и конверсию.

## Важные нюансы и подводные камни

- **PII-утечки.** URL с query-строкой, breadcrumbs с текстами кликов и сообщениями консоли уходят в Sentry по умолчанию. Без scrubbing в \`beforeSend\` это прямой конфликт с GDPR.
- **100% трейсов на проде** = огромный счёт. \`tracesSampleRate\` около 0,1–0,2 плюс tail-based сэмплирование трейсов с ошибками на стороне коллектора.
- **Шум.** Ошибки расширений и ботов (\`ResizeObserver loop\`, \`Script error.\`) забивают дашборд; лечится \`ignoreErrors\` и \`denyUrls\`.
- **Quota и rate limiting.** При шторме ошибок провайдер начинает их резать, и реальная проблема тонет именно в тот момент, когда она важнее всего. Настройте лимиты на проект и защиту от всплесков.
- **Лаборатория против поля.** Lighthouse детерминирован и ловит регрессии в CI; RUM показывает, как всё работает у людей на дешёвом Android.
- **\`release\` не совпал с картами** — стеки снова минифицированные. Используйте один и тот же git SHA и в сборке, и в загрузке карт (или Debug ID).
- **Опубликованные карты.** \`hidden\` убирает ссылку, но не файлы; забыли удалить \`.map\` — исходники доступны любому.
- **Среднее вместо перцентиля** прячет боль: p50 может быть отличным, а p75 — катастрофой.
- **\`traceparent\` на чужие домены** ломает CORS-запросы к сервисам, которые не разрешили этот заголовок; ограничивайте \`tracePropagationTargets\` своим API.

**Плюсы:** проблемы видны через минуты после деплоя с точной строкой кода и релизом, скорость меряется у реальных пользователей, медленный экран трассируется до конкретного сервиса, решения об откате принимаются по данным.
**Минусы:** стоимость (события, трейсы, хранение), риск утечки персональных данных, шум от расширений и ботов, требует дисциплины в CI (релизы, загрузка карт) и настройки алертов, чтобы они не превратились в спам.

## Как это спрашивают на собеседовании

**Главный вывод:** три сигнала — ошибки с привязкой к релизу и читаемыми через source maps стеками, RUM с Core Web Vitals по p75 и распределённые трейсы через \`traceparent\`. Карты грузят в Sentry из CI и не публикуют, PII чистят в \`beforeSend\`, трейсы сэмплируют, алертят на регрессию по релизу.

Типичные формулировки: «Как вы узнаёте об ошибках на проде?», «Как сделать stack trace из минифицированного кода читаемым?», «Как измерять производительность у реальных пользователей?».

Что могут спросить следом:

- *Почему p75, а не среднее?* — Среднее прячет хвост медленных устройств; p75 показывает опыт каждого четвёртого пользователя.
- *Чем Lighthouse отличается от RUM?* — Лаборатория против поля: Lighthouse детерминирован для CI, RUM показывает реальность и единственный умеет INP.
- *Как не выложить исходники через source maps?* — \`hidden\` в сборке, загрузка в Sentry из CI и удаление \`.map\` перед деплоем.
- *Как связать медленный экран с бэкендом?* — Трейс с заголовком \`traceparent\` по W3C Trace Context, бэкенд продолжает тот же trace-id.

### Ответ на 1 минуту

> На фронтенде я собираю три сигнала. Ошибки в Sentry — непойманные исключения и \`unhandledrejection\`, сгруппированные по fingerprint и привязанные к релизу, то есть git SHA. RUM — реальные Core Web Vitals: LCP, INP и CLS, по p75, а не среднему, с разрезом по устройству, гео и релизу; Lighthouse остаётся лабораторным инструментом для CI. Распределённые трейсы: браузер открывает спан на \`fetch\` и передаёт \`traceparent\` по W3C Trace Context, бэкенд продолжает трейс, и медленный экран сводится к конкретному сервису. Source maps собираю как hidden, загружаю в Sentry на шаге CI и удаляю перед деплоем, а релиз сборки и карт совпадает. Из практики: чищу PII в \`beforeSend\`, держу \`tracesSampleRate\` около 0,1–0,2, режу шум через \`ignoreErrors\`, а алерты ставлю на регрессию p75 и error rate по релизу.`,
      en: `## In short

Frontend observability is the ability to answer "what is happening for real users right now" without asking anyone to send a screenshot. It's built from three things: **errors**, **RUM** (how fast it actually is for live humans), and **traces** (the full path of a request from the button to the database).

Analogy: a parcel with a tracking number. Every courier logs their leg under **the same number**, so you can see exactly where it got stuck. On the web that number is the \`traceparent\` header: the browser issues it, the backend continues it. Source maps are the decryption key: without them a crash report arrives in minifier-speak (\`a.b is not a function\`) and is unreadable.

## What it's made of

1. **Errors** (Sentry/Bugsnag): uncaught exceptions, \`unhandledrejection\`, framework errors. Grouped by fingerprint and tied to a **release**, so you can see which deploy broke things.
2. **RUM (Real User Monitoring)**: real **Core Web Vitals** — LCP, INP, CLS — from live devices. Read **percentiles, p75 above all**, not the average, and segment by device, geo and release. Lighthouse is the lab; RUM is reality.
3. **Tracing**: the browser opens a span on \`fetch\` and propagates a \`traceparent\` header (W3C Trace Context / OpenTelemetry); the backend continues the same trace. That turns "slow LCP" into "this specific downstream service is slow".
4. **Source maps** — the critical detail. A minified stack trace is useless. Maps are **uploaded to Sentry in a CI step** and **never published to prod** (that's just handing out your source). They're keyed by \`release\` + \`dist\`: mismatch the versions and symbolication breaks, and you're back to reading \`a.b\`.

## Example

\`\`\`ts
Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                    // MUST match the uploaded source maps
  tracesSampleRate: 0.15,                 // 15% of traces — otherwise the bill explodes
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//],  // send traceparent only to our own backend
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                     // scrub PII BEFORE it leaves the browser
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});

// CI step, never shipped to prod:
// sentry-cli sourcemaps upload --release <GIT_SHA> ./dist
\`\`\`

Why this works: \`release\` ties three worlds together — errors, metrics and the uploaded maps. \`tracePropagationTargets\` stops your \`traceparent\` from leaking to third-party domains. \`ignoreErrors\` throws away browser-extension junk, without which the dashboard is simply unreadable.

## What to alert on

- On a **per-release p75 INP/LCP regression** and on error-rate spikes — not on every individual error. Individual errors always exist and shouldn't wake anyone at 3am.
- An alert should point at a **release**: "since deploy abc123, p75 LCP went from 2.1s to 3.4s" is both the diagnosis and the fix (roll back).
- A useful minimum: error rate per release, p75 of the three Core Web Vitals per release, and the failure share of key requests.

## What to say in the interview

> On the frontend I collect three signals. Errors in Sentry — uncaught exceptions and \`unhandledrejection\`, grouped by fingerprint and tied to a release. RUM — real Core Web Vitals, LCP, INP and CLS, read as percentiles, p75 rather than the mean, segmented by device, geo and release; Lighthouse stays a lab tool. And distributed tracing: the browser starts a span on \`fetch\` and propagates \`traceparent\` per W3C Trace Context, the backend continues the same trace, so a slow LCP traces down to a specific downstream service. The critical detail is source maps: uploaded to Sentry in a CI step, never published to prod or you're giving away your source, and keyed by \`release\` or symbolication breaks. From practice: scrub PII in \`beforeSend\`, keep \`tracesSampleRate\` around 0.1 to 0.2 for cost, and alert on per-release p75 regressions.

## Gotchas

- **PII leaks**: Sentry sends URLs and sometimes request bodies by default. Without scrubbing in \`beforeSend\` that's a direct GDPR problem.
- **100% of traces in prod** = a huge bill. Use \`tracesSampleRate\` 0.1–0.2 plus tail-sampling of errors.
- **Noise**: extension and bot errors (\`ResizeObserver loop\`, \`Script error.\`) drown the dashboard. Fix with \`ignoreErrors\` and \`denyUrls\`.
- **Quota / rate limiting**: during an error storm the provider starts dropping events, so the real problem disappears exactly when it matters most.
- Expect the **lab vs field** question: Lighthouse is deterministic and catches regressions in CI; RUM shows what a cheap Android actually experiences.
- A \`release\` that doesn't match the uploaded maps means minified stacks again. Use the same git SHA for both the build and the map upload.
- Averages instead of percentiles hide the pain: p50 can look great while p75 is a disaster.`,
    },
    codeSnippet: `Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                 // must match uploaded source maps
  tracesSampleRate: 0.15,              // distributed tracing sample
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//], // attach traceparent to our API
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                  // scrub PII before it leaves the browser
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});
// CI step (not shipped to prod): sentry-cli sourcemaps upload --release $GIT_SHA ./dist`,
  },
  {
    id: 'arch-046',
    category: 'network-browser',
    level: 'Expert',
    tags: ['oauth2', 'oidc', 'pkce', 'token-storage'],
    question: {
      ru: 'Глубоко об аутентификации SPA: OAuth2/OIDC, PKCE, хранение токенов, silent refresh, CSRF.',
      en: 'Deep dive on SPA auth: OAuth2/OIDC, PKCE, token storage, silent refresh, and CSRF.',
    },
    answer: {
      ru: `## Коротко

Современный стандарт для SPA — **Authorization Code Flow + PKCE**. Смысл: браузер — публичный клиент, у него **нет секрета**, который можно спрятать, поэтому клиент придумывает одноразовый секрет прямо перед входом и доказывает им, что код принадлежит именно ему.

Аналогия: багажная квитанция, разорванная пополам. Половинку с номером (\`code\`) вы несёте открыто, а вторую (\`code_verifier\`) не показываете никому — в камеру хранения ушёл только её **отпечаток** (\`code_challenge\`, SHA-256). Вор, укравший номерок, чемодан не заберёт: у него нет второй половины. Старый implicit flow — это когда чемодан отдают прямо в URL, поэтому он и устарел.

## Как это работает по шагам

1. Клиент генерит случайный \`code_verifier\` и считает его SHA-256 → \`code_challenge\`.
2. Редирект на провайдера: в URL уходит **только challenge** (\`code_challenge_method=S256\`).
3. Пользователь логинится, провайдер возвращает \`code\` в query-параметре.
4. Клиент меняет код на токены и **предъявляет оригинальный verifier**. Перехваченный код без verifier бесполезен — в этом вся суть PKCE.
5. Приходят токены. \`access_token\` — ключ к API. \`id_token\` — это уже **OIDC поверх OAuth2**: JWT с claims о пользователе, то есть ответ на вопрос «кто это». \`access_token\` для идентификации использовать нельзя: он про доступ к ресурсам, а не про личность.
6. Access-token короткоживущий (5–15 минут) и обновляется через refresh. Правильный вариант — **rotation refresh-токена через httpOnly-cookie на бэкенде**, а не в JS. Старый silent renew в скрытом iframe ломается из-за блокировки third-party cookies.

## Пример

\`\`\`ts
// 1. клиент придумывает секрет и считает его отпечаток
const verifier  = base64url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = base64url(await sha256(verifier));   // S256
sessionStorage.setItem('pkce', verifier);              // живёт до возврата с провайдера

// 2. уходим на провайдера — в URL уходит ТОЛЬКО отпечаток
// GET /authorize?response_type=code&code_challenge=<challenge>&code_challenge_method=S256

// 3. вернулись с ?code=... — меняем код на токены, предъявляя ОРИГИНАЛ
await fetch('/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,                           // доказательство владения
  }),
});
\`\`\`

Почему так: злоумышленник, перехвативший редирект с \`code\`, не сможет обменять его на токены — verifier он не видел ни разу, а по challenge его не восстановить (это односторонний хэш).

## Где хранить токены — главный спор

- **localStorage**: читает любой JS → **уязвим к XSS**. Один скомпрометированный npm-пакет или инъекция — и токен утёк. Удобно, но небезопасно.
- **httpOnly + Secure + SameSite cookie**: JS не читает, XSS токен не украдёт — но появляется вектор **CSRF**, потому что браузер шлёт cookie сам.
- **Рекомендация**: для серьёзного web-продукта — **BFF / token-handler pattern**. Токены живут на сервере, браузер держит только сессионную httpOnly-cookie, а CSRF закрывается \`SameSite\` и проверкой \`Origin\`.
- Если BFF нет — компромисс: **access-token в памяти** (обычная переменная, умирает вместе с вкладкой), refresh — в httpOnly-cookie. Это хуже BFF, но заметно лучше localStorage.
- CSRF существует **только при cookie-based auth**. Защита: \`SameSite=Lax/Strict\`, double-submit token, проверка \`Origin\`. С токеном в заголовке \`Authorization\` CSRF неактуален — но возвращается XSS-риск. Выбор всегда между этими двумя рисками, «безопасного localStorage» не бывает.

## Что сказать на собеседовании

> Для SPA правильный поток — Authorization Code Flow с PKCE; implicit устарел, потому что отдаёт токен прямо в URL-фрагменте. PKCE защищает публичного клиента, у которого нет секрета: клиент генерит \`code_verifier\`, отправляет на авторизацию только его SHA-256 как \`code_challenge\`, а при обмене кода предъявляет оригинал — перехваченный код без verifier бесполезен. OAuth2 отвечает за авторизацию, а личность даёт OIDC через \`id_token\`; \`access_token\` для идентификации использовать нельзя. По хранению: localStorage читается любым JS и падает от XSS, httpOnly-cookie от XSS защищает, но открывает CSRF, который закрывается \`SameSite\` и проверкой \`Origin\`. Я выбираю BFF, то есть token-handler pattern: токены на сервере, в браузере только сессионная httpOnly-cookie. Без BFF — access в памяти, refresh в httpOnly-cookie с ротацией.

## Ловушки

- **«Храните JWT в localStorage»** — самый частый неверный ответ. Правильный: это компромисс XSS vs CSRF, безопасного варианта в JS-доступной памяти нет.
- Использовать \`access_token\` как удостоверение личности — концептуальная ошибка. Для «кто это» существует \`id_token\`.
- **PKCE не защищает от XSS**: он защищает только сам обмен кода. Если на странице выполняется чужой скрипт, никакая схема потока не спасёт.
- Спросят про **silent renew в iframe** — скажите, что он ломается из-за блокировки third-party cookies, и современный ответ это refresh с ротацией через httpOnly-cookie.
- Забыть **проверить \`state\`** при возврате с провайдера = уязвимость к подмене авторизационного ответа. \`state\` защищает редирект, PKCE — код.
- Долгоживущий access-token «чтобы не делать refresh» — украденный токен работает часами. 5–15 минут не просто так.
- Refresh без ротации: один утёкший refresh-токен даёт вечный доступ, и это невозможно заметить.`,
      en: `## In short

The modern standard for SPAs is **Authorization Code Flow + PKCE**. The point: a browser is a public client with **no secret it can hide**, so the client invents a one-time secret right before login and uses it to prove the code belongs to it.

Analogy: a baggage ticket torn in half. You carry the numbered half (\`code\`) in the open, and never show the other half (\`code_verifier\`) — the cloakroom only ever received its **fingerprint** (\`code_challenge\`, a SHA-256). A thief who steals the number can't collect the suitcase: they don't have the matching half. The old implicit flow handed the suitcase over in the URL itself, which is exactly why it's deprecated.

## How it works, step by step

1. The client generates a random \`code_verifier\` and computes its SHA-256 → \`code_challenge\`.
2. Redirect to the provider: the URL carries **only the challenge** (\`code_challenge_method=S256\`).
3. The user logs in and the provider returns a \`code\` in a query parameter.
4. The client exchanges the code for tokens and **presents the original verifier**. An intercepted code without the verifier is worthless — that's the whole point of PKCE.
5. Tokens arrive. The \`access_token\` is the key to the API. The \`id_token\` is **OIDC on top of OAuth2**: a JWT with user claims, the answer to "who is this". Never use the \`access_token\` for identity — it's about resource access, not about identity.
6. The access token is short-lived (5–15 minutes) and renewed via refresh. The correct approach is **refresh-token rotation through a backend httpOnly cookie**, not in JS. The old hidden-iframe silent renew breaks under third-party cookie blocking.

## Example

\`\`\`ts
// 1. the client invents a secret and computes its fingerprint
const verifier  = base64url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = base64url(await sha256(verifier));   // S256
sessionStorage.setItem('pkce', verifier);              // lives until we come back

// 2. off to the provider — the URL carries ONLY the fingerprint
// GET /authorize?response_type=code&code_challenge=<challenge>&code_challenge_method=S256

// 3. back with ?code=... — swap the code for tokens by presenting the ORIGINAL
await fetch('/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,                           // proof of possession
  }),
});
\`\`\`

Why this works: an attacker who intercepts the redirect carrying \`code\` can't exchange it for tokens — they never saw the verifier, and it can't be reconstructed from the challenge because that's a one-way hash.

## Where to store tokens — the core debate

- **localStorage**: readable by any JS → **vulnerable to XSS**. One compromised npm package or one injection and the token is gone. Convenient but unsafe.
- **httpOnly + Secure + SameSite cookie**: JS can't read it, so XSS can't steal the token — but you open a **CSRF** vector, because the browser attaches the cookie automatically.
- **Recommendation**: for a serious web product, the **BFF / token-handler pattern**. Tokens live on the server, the browser holds only a session httpOnly cookie, and CSRF is closed off with \`SameSite\` and \`Origin\` checks.
- No BFF available? The compromise: **access token in memory** (a plain variable that dies with the tab), refresh in an httpOnly cookie. Worse than a BFF, markedly better than localStorage.
- CSRF only exists with **cookie-based auth**. Defenses: \`SameSite=Lax/Strict\`, a double-submit token, \`Origin\` checks. With a token in the \`Authorization\` header CSRF is moot — but the XSS risk comes back. The choice is always between those two risks; there is no "safe localStorage".

## What to say in the interview

> For SPAs the right flow is Authorization Code Flow with PKCE; implicit is deprecated because it hands the token over in the URL fragment. PKCE protects a public client that has no secret: the client generates a \`code_verifier\`, sends only its SHA-256 as \`code_challenge\` during authorization, and presents the original at code exchange — an intercepted code is useless without the verifier. OAuth2 covers authorization; identity comes from OIDC via the \`id_token\`, and the \`access_token\` must never be used for identity. On storage: localStorage is readable by any JS and falls to XSS, an httpOnly cookie defeats XSS but opens CSRF, which you close with \`SameSite\` and \`Origin\` checks. I pick a BFF — the token-handler pattern: tokens on the server, only a session httpOnly cookie in the browser. Without a BFF, access token in memory and refresh in an httpOnly cookie with rotation.

## Gotchas

- **"Store the JWT in localStorage"** is the most common wrong answer. The right one: it's an XSS-versus-CSRF trade-off, and nothing in JS-reachable memory is safe.
- Using the \`access_token\` as proof of identity is a conceptual mistake. "Who is this" is what the \`id_token\` is for.
- **PKCE does not protect against XSS**: it only protects the code exchange. If foreign script runs on your page, no flow design saves you.
- Expect a question about **iframe silent renew** — say it breaks under third-party cookie blocking, and the modern answer is refresh with rotation through an httpOnly cookie.
- Forgetting to **validate \`state\`** on return from the provider leaves you open to a forged authorization response. \`state\` protects the redirect, PKCE protects the code.
- A long-lived access token "to avoid refreshes" means a stolen token works for hours. The 5–15 minute window exists for a reason.
- Refresh without rotation: one leaked refresh token grants permanent access, and nobody ever notices.`,
    },
    codeSnippet: `// PKCE: derive the challenge from a random verifier
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(digest));
// authorize: redirect with code_challenge=<challenge>&code_challenge_method=S256
// token exchange: POST code + code_verifier=<verifier>  — proves possession

// Token-handler/BFF: client never touches the access token
// GET /bff/me  ->  cookie: session=<httpOnly>  ->  BFF attaches Bearer to upstream`,
  },
  {
    id: 'arch-047',
    category: 'network-browser',
    level: 'Expert',
    tags: ['csp', 'sri', 'supply-chain-security'],
    question: {
      ru: 'Как Content Security Policy, SRI и борьба с supply-chain атаками защищают фронтенд?',
      en: 'How do Content Security Policy, SRI, and supply-chain defenses protect the frontend?',
    },
    answer: {
      ru: `## Коротко

Это три разных рубежа обороны. **CSP** — HTTP-заголовок, который говорит браузеру, откуда вообще разрешено грузить и исполнять скрипты. **SRI** — проверка, что файл с CDN не подменили. **Supply-chain защита** — про то, что вредонос сегодня чаще приходит не из вашего кода, а из зависимости.

Аналогия: клуб. CSP — это фейс-контроль на входе: даже если злоумышленник просочился в толпу (инъекция произошла), к микрофону его не пустят. Nonce — браслет, который выдают на один вечер: завтра он не работает. SRI — пломба на бочке: если по дороге бочку вскрыли, содержимое на разлив не идёт. Supply-chain — про поставщика этой бочки: варите вы не всё сами.

## Как это работает по шагам

1. Сервер шлёт заголовок \`Content-Security-Policy\` с директивами: откуда можно скрипты, стили, коннекты.
2. \`script-src 'self'\` блокирует и inline-скрипты, и чужие домены. Inline при этом разрешают **не** через \`'unsafe-inline'\`, а через **nonce** (\`'nonce-abc'\`, новый на каждый ответ сервера) или через hash скрипта.
3. \`'strict-dynamic'\` + nonce — современный «правильный» CSP: доверие наследуется от скрипта, которому вы уже доверились, и не нужно вести whitelist хостов, который всё равно устареет.
4. \`'unsafe-eval'\` не включаем: он ломает всю защиту. Angular с AOT в нём не нуждается (нужен был JIT-шаблонам).
5. Внедряют CSP **не сразу боевым**: сначала \`Content-Security-Policy-Report-Only\` + \`report-to\`, пару недель смотрят отчёты, чинят свои же нарушения, и только потом включают enforce.
6. Параллельно на внешние скрипты вешают **SRI**: \`<script integrity="sha384-..." crossorigin>\`. Браузер считает хэш скачанного файла и, если CDN скомпрометирован и подменил файл, **просто не выполнит** его.

## Пример

\`\`\`bash
# 1) Сначала слушаем, ничего не ломая:
# Content-Security-Policy-Report-Only:
#   default-src 'self';
#   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
#   object-src 'none'; base-uri 'self';
#   report-to csp-endpoint
# 2) Разбираем отчёты, чиним нарушения, затем убираем -Report-Only.

# Supply-chain гигиена в CI:
npm ci --ignore-scripts        # только lockfile; postinstall-скрипты не исполняются
npm audit --audit-level=high   # шум low-severity не блокирует пайплайн
\`\`\`

Почему так: \`--ignore-scripts\` закрывает самый прямой путь атаки — вредоносный \`postinstall\`, который выполняется просто от \`npm install\`. А \`npm ci\` вместо \`install\` гарантирует, что на прод уедут ровно те версии из lockfile, которые вы проверили.

## Supply-chain на практике

- Угроза 2020-х — вредонос в **зависимости**, а не в вашем коде: \`event-stream\`, \`ua-parser-js\`, typosquatting, угон аккаунта мейнтейнера.
- **Lockfile + \`npm ci\`** — никаких плавающих версий на проде.
- **Аудит в CI**: \`npm audit\`, Snyk или Socket; \`--ignore-scripts\`, чтобы postinstall не исполнялся.
- **SBOM** (CycloneDX) и provenance/sigstore — чтобы знать, из чего собран артефакт, и доказать, кем он собран.
- **Минимизируйте дерево зависимостей**: каждый transitive-пакет это поверхность атаки. Пакет ради трёх строк кода — плохая сделка.

## Что сказать на собеседовании

> CSP — это защита в глубину от XSS: HTTP-заголовок, который ограничивает, откуда можно грузить и исполнять скрипты, так что даже при инъекции чужой код не выполнится. \`script-src 'self'\` блокирует inline и сторонние источники, а нужный inline разрешают через nonce, генерируемый на каждый ответ, или через hash — не через \`'unsafe-inline'\`, иначе это театр безопасности. Современный вариант — \`'strict-dynamic'\` с nonce, он не зависит от whitelist хостов; \`'unsafe-eval'\` не нужен, Angular AOT без него работает. Внедряю через \`Content-Security-Policy-Report-Only\` с report-uri, чтобы не сломать прод. SRI — атрибут \`integrity\` на CDN-скриптах: браузер сверяет хэш и не выполняет подменённый файл. И supply-chain: lockfile с \`npm ci\`, \`--ignore-scripts\`, аудит в CI, SBOM — потому что вредонос сегодня приходит через зависимость.

## Ловушки

- **\`'unsafe-inline'\` в \`script-src\`** обнуляет весь CSP. Это самая частая ошибка: политика есть, защиты нет.
- **CSP не заменяет санитизацию.** Это второй рубеж; первый — не вставлять чужой HTML в DOM. Спросят обязательно.
- **SRI на часто обновляемом CDN-файле** ломает загрузку при легитимном обновлении: хэш перестал совпадать — скрипт не выполнился. Пиньте конкретную версию файла.
- \`npm audit\` тонет в low-severity transitive-шуме → усталость и игнор всех предупреждений. Приоритизируйте **достижимые** уязвимости, а не общее число.
- Спросят про **nonce**: он должен быть криптослучайным и **новым на каждый ответ**; статический nonce в собранном \`index.html\` бесполезен.
- Отчёты CSP никто не читает — тогда режим Report-Only живёт вечно и защиты нет. Нужен владелец отчётов и срок перехода на enforce.`,
      en: `## In short

These are three separate lines of defense. **CSP** is an HTTP header telling the browser where scripts may be loaded and executed from at all. **SRI** verifies that a file from a CDN wasn't swapped. **Supply-chain defense** addresses the fact that malware today usually arrives through a dependency, not through your own code.

Analogy: a nightclub. CSP is the door policy: even if an attacker slipped into the crowd (the injection happened), they're not getting near the microphone. A nonce is the wristband issued for one night only — tomorrow's doesn't work. SRI is the seal on the barrel: if it was opened in transit, nothing gets poured. Supply-chain security is about who supplied the barrel, because you don't brew everything yourself.

## How it works, step by step

1. The server sends a \`Content-Security-Policy\` header with directives: where scripts, styles and connections may come from.
2. \`script-src 'self'\` blocks both inline scripts and foreign domains. Inline is then allowed **not** via \`'unsafe-inline'\` but via a **nonce** (\`'nonce-abc'\`, fresh on every response) or a script hash.
3. \`'strict-dynamic'\` + nonce is the modern, correct CSP: trust is inherited from a script you already trusted, so you don't maintain a host whitelist that goes stale anyway.
4. Don't enable \`'unsafe-eval'\` — it undoes the protection. Angular with AOT doesn't need it (that was a JIT-template requirement).
5. You don't roll CSP out in enforce mode straight away: start with \`Content-Security-Policy-Report-Only\` plus \`report-to\`, watch reports for a couple of weeks, fix your own violations, then enforce.
6. In parallel, put **SRI** on external scripts: \`<script integrity="sha384-..." crossorigin>\`. The browser hashes the downloaded file and, if a compromised CDN swapped it, **simply won't execute** it.

## Example

\`\`\`bash
# 1) Listen first, break nothing:
# Content-Security-Policy-Report-Only:
#   default-src 'self';
#   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
#   object-src 'none'; base-uri 'self';
#   report-to csp-endpoint
# 2) Triage the reports, fix violations, then drop the -Report-Only suffix.

# Supply-chain hygiene in CI:
npm ci --ignore-scripts        # lockfile only; postinstall scripts never run
npm audit --audit-level=high   # low-severity noise doesn't block the pipeline
\`\`\`

Why this works: \`--ignore-scripts\` closes the most direct attack path — a malicious \`postinstall\` that runs from a plain \`npm install\`. And \`npm ci\` instead of \`install\` guarantees that prod ships exactly the lockfile versions you reviewed.

## Supply chain in practice

- The 2020s threat is malware in a **dependency**, not in your code: \`event-stream\`, \`ua-parser-js\`, typosquatting, a hijacked maintainer account.
- **Lockfile + \`npm ci\`** — no floating versions in production.
- **Audit in CI**: \`npm audit\`, Snyk or Socket; \`--ignore-scripts\` so postinstall never executes.
- **SBOM** (CycloneDX) and provenance/sigstore — to know what an artifact is made of and prove who built it.
- **Shrink the dependency tree**: every transitive package is attack surface. A package for three lines of code is a bad deal.

## What to say in the interview

> CSP is defense-in-depth against XSS: an HTTP header restricting where scripts may load and execute from, so even after an injection the foreign code doesn't run. \`script-src 'self'\` blocks inline and third-party sources, and the inline you actually need is allowed via a nonce generated per response, or via a hash — not via \`'unsafe-inline'\`, which turns the whole thing into security theater. The modern form is \`'strict-dynamic'\` with a nonce, independent of host whitelists; \`'unsafe-eval'\` isn't needed since Angular AOT works without it. I roll it out through \`Content-Security-Policy-Report-Only\` with a report-uri so prod doesn't break. SRI is the \`integrity\` attribute on CDN scripts: the browser checks the hash and refuses to run a swapped file. And supply chain: lockfile with \`npm ci\`, \`--ignore-scripts\`, audit in CI, an SBOM — because today the malware arrives through a dependency.

## Gotchas

- **\`'unsafe-inline'\` in \`script-src\`** nullifies the entire CSP. It's the most common mistake: the policy exists, the protection doesn't.
- **CSP does not replace sanitization.** It's the second line; the first is not injecting foreign HTML into the DOM. This follow-up always comes.
- **SRI on a frequently-updated CDN file** breaks loading on a legitimate update: the hash stops matching and the script doesn't run. Pin a specific file version.
- \`npm audit\` drowns in low-severity transitive noise → fatigue and blanket ignoring. Prioritize **reachable** vulnerabilities, not the raw count.
- Expect a **nonce** question: it must be cryptographically random and **fresh per response**; a static nonce baked into a built \`index.html\` is worthless.
- Nobody reads the CSP reports — then Report-Only mode lives forever and protects nothing. Assign an owner and a deadline for switching to enforce.`,
    },
    codeSnippet: `// Strong, nonce-based CSP (set per-response on the server):
// Content-Security-Policy:
//   default-src 'self';
//   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
//   object-src 'none'; base-uri 'self';
//   report-to csp-endpoint
<script nonce="r4Nd0m" src="/main.js"></script>

<!-- SRI pins the exact bytes of a CDN asset -->
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>`,
  },
  {
    id: 'arch-048',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['performance-budgets', 'lighthouse-ci', 'pipeline'],
    question: {
      ru: 'Как внедрить performance budgets и Lighthouse CI в пайплайн, чтобы предотвращать регрессии производительности?',
      en: 'How do you enforce performance budgets and Lighthouse CI in the pipeline to prevent perf regressions?',
    },
    answer: {
      ru: `## В чём суть

Производительность почти никогда не падает разом — она **сползает по чуть-чуть**: +10 КБ тут, +1 зависимость там, и через полгода приложение грузится вдвое дольше, а виноватого коммита нет. Performance budget — это **жёсткий потолок** (вес бандла, LCP, TBT), нарушение которого **роняет CI**. Регрессия становится видна в конкретном pull request, а не в проде через месяц.

Аналогия: весы на стойке регистрации в аэропорту. Никто не набирает лишние 8 кг одним свитером — набирают по футболке. Поэтому весы стоят **до посадки**, а не в самолёте: перевес обнаруживают там, где его ещё дёшево исправить — выложить футболку проще, чем разгружать багажный отсек.

**Какую проблему решает.** Без бюджета никто не отвечает за скорость: каждый PR «всего лишь немного» тяжелее, ревьюер этого не видит, а пользователи на слабых телефонах видят. Бюджет превращает размытое «приложение стало медленным» в конкретное «PR №1234 увеличил initial-бандл на 115 КБ» — с автором, причиной и красной галочкой, пока код ещё не смёржен.

## Словарик терминов

- **Performance budget (бюджет производительности)** — заранее оговорённый предел: «initial-бандл не больше 1 МБ», «LCP не больше 2,5 с». Превысили — сборка падает или предупреждает.
- **Бандл, initial и lazy-чанк (bundle, chunk)** — JS/CSS-файлы сборки. Initial грузятся сразу, lazy-чанки — при переходе на ленивый маршрут.
- **\`budgets\` в \`angular.json\`** — встроенная в Angular CLI проверка размеров файлов после сборки. Работает без браузера, за доли секунды.
- **Lighthouse** — инструмент Google: открывает страницу в Chrome, замеряет метрики загрузки и ставит оценку 0–100.
- **Lighthouse CI (LHCI, пакет \`@lhci/cli\`)** — обвязка над Lighthouse для пайплайна: несколько прогонов, проверка порогов, загрузка отчётов, статус в PR. Настраивается файлом \`lighthouserc.js\`.
- **Assertion (проверка, ассерт)** — правило в \`lighthouserc.js\` вида «метрика X не больше N». Уровень \`error\` роняет пайплайн, \`warn\` только пишет предупреждение.
- **\`numberOfRuns\` и \`aggregationMethod\`** — сколько раз прогнать Lighthouse и как свести результаты в одно число: лучший прогон, медиана или худший.
- **Core Web Vitals (CWV)** — три ключевые метрики Google для реальных пользователей: LCP, INP и CLS.
- **LCP (Largest Contentful Paint)** — когда отрисовался самый крупный элемент первого экрана (картинка, заголовок, таблица). «Хорошо» — до 2,5 с.
- **CLS (Cumulative Layout Shift)** — насколько «прыгает» вёрстка во время загрузки. Безразмерное число, «хорошо» — до 0,1.
- **INP (Interaction to Next Paint)** — задержка между действием пользователя (клик, ввод) и следующей отрисовкой. «Хорошо» — до 200 мс. С марта 2024 года заменил FID в Core Web Vitals.
- **TBT (Total Blocking Time)** — сумма «лишнего» времени длинных задач главного потока (всё, что сверх 50 мс у каждой) во время загрузки. Лабораторный заменитель INP: в Lighthouse никто не кликает.
- **Throttling (троттлинг)** — искусственное замедление сети и процессора, чтобы мощный CI-сервер вёл себя как средний телефон.
- **Lab vs field (лаборатория и поле)** — lab-данные получают в контролируемых условиях (Lighthouse в CI), field-данные — от живых пользователей (RUM, отчёт Chrome CrUX).
- **RUM (Real User Monitoring)** — сбор метрик прямо из браузеров пользователей, например библиотекой \`web-vitals\`.
- **p75 (75-й перцентиль)** — значение, не хуже которого 75% визитов. Core Web Vitals оценивают именно по p75.
- **Ratchet («храповик»)** — приём, при котором порог только ужесточается: улучшили метрику — подвинули бюджет вслед, ухудшать нельзя.
- **Flaky (флакующий)** — результат, который «гуляет» от запуска к запуску без изменений в коде.

## Как это работает под капотом

Как бюджет срабатывает в типичном пайплайне на pull request:

1. На PR CI запускает production-сборку \`ng build\`: бюджеты из \`angular.json\` действуют в той конфигурации, где описаны (обычно \`production\`).
2. После сборки Angular CLI суммирует **сырые** (без gzip) размеры файлов по типам бюджетов и сравнивает с порогами. Превышен \`maximumError\` — сборка падает, и до Lighthouse дело не доходит. Это первый, дешёвый и детерминированный рубеж.
3. Если сборка прошла, LHCI поднимает статический сервер над папкой сборки (\`staticDistDir\`) или берёт URL превью-окружения и прогоняет Lighthouse в headless Chrome \`numberOfRuns\` раз (по умолчанию 3).
4. Каждый прогон идёт с троттлингом: по умолчанию эмулируется телефон с медленным 4G и в 4 раза замедленным процессором.
5. Для каждой проверки из \`assertions\` LHCI сводит значения метрики из всех прогонов в одно число по \`aggregationMethod\`. **По умолчанию берётся самый удачный прогон** (\`optimistic\`), а не медиана.
6. Это число сравнивается с порогом. Нарушен \`error\` — \`lhci assert\` завершается с кодом 1, пайплайн краснеет; нарушение \`warn\` только попадает в лог.
7. Отчёты уходят в хранилище (\`upload\`), ссылка и статус могут появиться прямо в PR.

Шаги 5–6 внутри LHCI устроены почти дословно так (упрощённый фрагмент из \`@lhci/utils\`):

\`\`\`js
function aggregate(values, aggregationMethod = 'optimistic', assertionType = 'maxNumericValue') {
  if (aggregationMethod === 'median') {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)]; // для нечётного числа прогонов
  }
  const useMin =
    (aggregationMethod === 'optimistic' && assertionType.startsWith('max')) ||
    (aggregationMethod === 'pessimistic' && assertionType.startsWith('min'));
  return useMin ? Math.min(...values) : Math.max(...values);
}

aggregate([2300, 2700, 3100]);            // 2300 — лучший из трёх
aggregate([2300, 2700, 3100], 'median');  // 2700
\`\`\`

Отсюда главный практический вывод: три прогона сами по себе медиану не дают. Чтобы сравнивать с бюджетом медиану, это нужно указать явно.

### Уровень 1. Bundle budgets в \`angular.json\`

\`\`\`json
"configurations": {
  "production": {
    "budgets": [
      { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
      { "type": "anyComponentStyle", "maximumError": "6kb" },
      { "type": "bundle", "name": "admin", "maximumError": "300kb" }
    ]
  }
}
\`\`\`

Что означают типы бюджетов (полный список из схемы \`@angular/build\` 21):

- \`initial\` — сумма всех файлов, которые грузятся сразу. Главный бюджет: именно он определяет, как быстро приложение «оживает».
- \`anyComponentStyle\` — стили **каждого** компонента по отдельности. Ловит случай, когда в SCSS компонента импортировали всю тему целиком.
- \`bundle\` — конкретный именованный чанк, например ленивый модуль \`admin\`.
- \`anyScript\` и \`any\` — каждый JS-файл (или любой файл) по отдельности; \`allScript\` и \`all\` — сумма всех файлов.

Если initial-бандл весит 615 КБ, а стили грида — 7,4 КБ, сборка выведет такие сообщения (текст из калькулятора бюджетов Angular CLI 21, проверено на его коде):

\`\`\`text
WARNING bundle initial exceeded maximum budget. Budget 500.00 kB was not met by 115.00 kB with a total of 615.00 kB.
ERROR src/app/grid/grid.component.scss exceeded maximum budget. Budget 6.00 kB was not met by 1.40 kB with a total of 7.40 kB.
\`\`\`

Первое — только предупреждение (615 КБ меньше \`maximumError\` в 1 МБ), второе роняет сборку. \`kb\` здесь — 1000 байт, а размер считается **без сжатия**: по сети пользователь скачает меньше. Это нормально — бюджет следит за динамикой, а не за абсолютной точностью.

### Ratchet через \`baseline\` и проценты

Вместо абсолютных чисел можно задать опорное значение и допустимый прирост в процентах — это удобная реализация «храповика»:

\`\`\`json
{ "type": "initial", "baseline": "600kb", "maximumWarning": "2%", "maximumError": "5%" }
\`\`\`

\`\`\`text
605 kB → ok
618 kB → warning: Budget 612.00 kB was not met by 6.00 kB
640 kB → warning + error: Budget 630.00 kB was not met by 10.00 kB
\`\`\`

Порог считается как \`baseline + baseline × процент\`: 600 + 2% = 612 КБ для предупреждения, 600 + 5% = 630 КБ для ошибки. Когда команда оптимизировала бандл до 560 КБ, \`baseline\` двигают вниз — и выигрыш закреплён.

### Уровень 2. Lighthouse CI и файл \`lighthouserc.js\`

\`\`\`js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist/my-app/browser', // LHCI сам поднимет сервер над сборкой
      isSinglePageApplication: true,           // все неизвестные пути отдают index.html
      url: ['http://localhost/', 'http://localhost/orders'], // порт LHCI подставит сам
      numberOfRuns: 5,                         // нечётное число — у медианы есть «середина»
    },
    assert: {
      aggregationMethod: 'median',             // без этого берётся лучший прогон
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // мс
        'total-blocking-time':      ['error', { maxNumericValue: 300 }],  // мс
        'cumulative-layout-shift':  ['warn',  { maxNumericValue: 0.1 }],  // без единиц
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
\`\`\`

Разбор по секциям:

- \`collect\` — **что и сколько раз** мерить. Вместо \`staticDistDir\` можно дать \`startServerCommand\` (своя команда запуска сервера) или URL превью-деплоя.
- \`assert\` — **с чем сравнивать**. Можно взять готовый \`preset: 'lighthouse:recommended'\` и переопределить отдельные проверки.
- \`upload\` — **куда девать отчёты**: \`temporary-public-storage\` (временная публичная ссылка), \`lhci\` (свой LHCI-сервер с историей) или \`filesystem\` (артефакты сборки).

Весь цикл запускается одной командой \`lhci autorun\`: она выполняет \`collect\`, \`assert\` и \`upload\` по очереди.

### Как LHCI сводит несколько прогонов: \`aggregationMethod\`

Проверим на настоящем движке проверок из \`@lhci/utils\` 0.15: три прогона дали LCP 2300 / 2700 / 3100 мс, TBT 250 / 320 / 410 мс и CLS 0,05 / 0,12 / 0,15, а бюджеты взяты из конфига выше.

\`\`\`text
aggregationMethod = (default)
  all passed
aggregationMethod = median
  error largest-contentful-paint: actual 2700 > 2500
  error total-blocking-time: actual 320 > 300
  warn cumulative-layout-shift: actual 0.12 > 0.1
aggregationMethod = pessimistic
  error largest-contentful-paint: actual 3100 > 2500
  error total-blocking-time: actual 410 > 300
  warn cumulative-layout-shift: actual 0.15 > 0.1
\`\`\`

По умолчанию (\`optimistic\`) хватило одного удачного прогона из трёх, и регрессия прошла незамеченной. \`median\` показывает типичную картину, \`pessimistic\` — худшую. Есть ещё \`median-run\`: берётся один «самый типичный» прогон целиком (LHCI выбирает его по близости FCP и времени до интерактивности к медиане), и все метрики проверяются по нему.

Практическое правило: \`median\` — для блокирующих проверок (устойчив к выбросам в обе стороны), \`optimistic\` — на очень шумной инфраструктуре, где ловят только грубые регрессии, \`pessimistic\` — для критичных страниц на выделенном стабильном раннере.

### Почему ассерты ставят на метрики, а не на общий score

Общая оценка Lighthouse — взвешенная сумма оценок метрик. В Lighthouse 12 (его использует LHCI 0.15) веса такие: TBT — 30%, LCP — 25%, CLS — 25%, FCP — 10%, Speed Index — 10%; INP в лабораторной оценке не участвует.

\`\`\`js
// ❌ Один порог на всё: LCP просел, но CLS улучшился — score тот же, CI зелёный
'categories:performance': ['error', { minScore: 0.9 }],

// ✅ Каждая важная метрика под своим порогом
'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
'total-blocking-time':      ['error', { maxNumericValue: 300 }],
\`\`\`

С одним общим порогом ухудшение одной метрики «компенсируется» улучшением другой, и регрессия проходит. Поэтому score оставляют как ориентир для дашборда, а блокируют сборку конкретными метриками. \`warn\` на самой нестабильной метрике (часто это CLS из-за шрифтов и рекламы) — способ не превратить CI в источник ложных падений.

### Троттлинг: почему в CI цифры хуже, чем на вашем ноутбуке

Настройки по умолчанию в Lighthouse 12: мобильная эмуляция и **симулированный** троттлинг (\`throttlingMethod: 'simulate'\`) — страница грузится на полной скорости, а итоговые метрики пересчитываются моделью под медленные условия:

\`\`\`text
mobile (по умолчанию): RTT 150 мс, ~1,6 Мбит/с, CPU замедлен в 4 раза
desktop-пресет:        RTT 40 мс,  10 Мбит/с,   CPU без замедления
\`\`\`

Именно мобильный профиль показывает, как почувствует приложение пользователь со средним Android. Если отключить троттлинг или мерить только desktop-пресетом на мощном CI-сервере, цифры будут красивыми и бесполезными: тяжёлый JavaScript, который убивает слабый телефон, на 16-ядерном раннере почти не заметен.

### Lab и field: Lighthouse против живых пользователей

- **Лаборатория (LHCI в CI)** — одинаковые условия при каждом замере. Её задача — ловить **регрессию между коммитами**, а не предсказывать, что увидят пользователи.
- **Поле (RUM и CrUX)** — p75 у реальных людей: медленный Android, плохая сеть, холодный кэш, расширения браузера. Её задача — показывать **реальность** и подсказывать, что вообще стоит оптимизировать.

Нужны оба источника. RUM подключается библиотекой \`web-vitals\`:

\`\`\`ts
import { onLCP, onINP, onCLS } from 'web-vitals';

function send(metric: { name: string; value: number; rating: string }) {
  // sendBeacon не теряет данные, даже если вкладку закрывают
  navigator.sendBeacon('/api/rum', JSON.stringify(metric));
}

onLCP(send);  // например { name: 'LCP', value: 2140, rating: 'good' }
onINP(send);  // INP измеряется только в поле — нужны реальные клики
onCLS(send);
\`\`\`

Дальше аналитика считает p75 по страницам и устройствам. Плохой INP в поле при хорошем TBT в лаборатории означает, что тормозят взаимодействия после загрузки (сортировка большой таблицы, тяжёлый обработчик ввода), а не сама загрузка.

### Пайплайн целиком: пример для GitHub Actions

\`\`\`yaml
name: perf
on: pull_request
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx ng build                    # бюджеты angular.json: упадёт здесь, если вес превышен
      - run: npx @lhci/cli@0.15.x autorun    # collect → assert → upload
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }} # статус-чек прямо в PR
\`\`\`

Дешёвая проверка размера идёт первой и отсекает очевидные проблемы за секунды; дорогой Lighthouse запускается только для сборок, прошедших первый рубеж.

### Где это применяется на практике

- **Enterprise-приложение с тяжёлыми гридами** (KendoUI, AG Grid): бюджет \`bundle\` на ленивый чанк с гридом ловит момент, когда кто-то подключил весь пакет вместо нужных модулей.
- **Обновления зависимостей через Renovate или Dependabot**: новая мажорная версия библиотеки неожиданно прибавила 80 КБ — бюджет остановит автоматический merge.
- **Дашборды с графиками**: ассерт на TBT ловит синхронный пересчёт тысяч точек при загрузке, LCP — медленную отрисовку главного виджета.
- **Публичные страницы (лендинг, вход, каталог)**: здесь LCP и CLS прямо влияют на конверсию и SEO, поэтому LHCI с \`error\` на этих метриках окупается быстрее всего.
- **Простой лендинг или маленький внутренний инструмент**: часто достаточно одних bundle budgets — они бесплатные и никогда не флакуют. LHCI окупается на продуктовых SPA с командой и историей регрессий.

## Важные нюансы и подводные камни

- **«LHCI сам берёт медиану» — нет.** По умолчанию проверки сравнивают с бюджетом лучший прогон (\`optimistic\`). Для медианы нужен явный \`aggregationMethod: 'median'\`, иначе один удачный прогон из трёх маскирует регрессию.
- **Флакующие падения.** На шумном общем CI-раннере оценка Lighthouse может гулять на 5–10 баллов между запусками без изменений в коде. Лечится медианой из нечётного числа прогонов, выделенным раннером и \`warn\` на нестабильных метриках. Иначе команда быстро научится «перезапускать до зелёного».
- **Бюджет «на отвал».** Слишком щедрый ничего не ловит, слишком жёсткий отключают в первый же спринт. Рабочий путь — откалибровать от текущих значений с небольшим запасом и ужесточать по принципу ratchet.
- **Бюджет только на initial.** Вес просто переезжает в ленивые модули, а пользователь всё равно ждёт при переходе. Добавляйте \`bundle\` на ключевые lazy-чанки или \`anyScript\` на каждый файл.
- **Размер в бюджете — без сжатия, \`kb\` = 1000 байт.** Не сравнивайте его напрямую с колонкой «transfer size» из DevTools: там уже gzip или brotli.
- **Бюджеты действуют только в своей конфигурации.** Если CI собирает \`--configuration development\`, проверка размеров не выполнится вовсе.
- **Страницы за логином.** Lighthouse открывает «чистый» браузер; для закрытых разделов нужен скрипт авторизации (\`puppeteerScript\`).
- **\`temporary-public-storage\` — это публичная ссылка.** Отчёт по внутреннему корпоративному приложению лучше складывать в собственный LHCI-сервер или в артефакты сборки (\`filesystem\`).

**Плюсы:** регрессия видна в конкретном PR с автором и причиной; bundle budgets бесплатны и детерминированы; LHCI даёт метрики, близкие к пользовательскому опыту, и историю для трендов; всё автоматизировано и не зависит от памяти ревьюера.
**Минусы:** Lighthouse шумный и требует настройки (прогоны, агрегация, раннер); пороги нужно калибровать и поддерживать; лабораторные цифры не равны реальным; прогоны удлиняют пайплайн на минуты; для закрытых страниц нужна дополнительная обвязка.

## Как это спрашивают на собеседовании

**Главный вывод:** производительность защищают в два слоя — дешёвые детерминированные bundle budgets в \`angular.json\` и Lighthouse CI с проверками конкретных метрик по медиане нескольких прогонов. Пороги калибруют от текущих значений и только ужесточают, а реальность сверяют с RUM.

Типичные формулировки: «Как не допустить, чтобы приложение постепенно становилось медленнее?», «Как вы встраиваете Lighthouse в CI?», «Что такое performance budget в Angular?», «Почему Lighthouse в CI даёт другие цифры, чем у пользователей?».

Что могут спросить следом:

- *Почему не хватает одного общего score?* — Это взвешенная сумма; просадку LCP может замаскировать улучшение CLS. Блокируют по отдельным метрикам.
- *Как бороться с флакающим Lighthouse?* — Нечётное число прогонов и \`aggregationMethod: 'median'\`, выделенный раннер, \`warn\` на нестабильных метриках, без «перезапуска до зелёного».
- *Чем TBT связан с INP?* — INP требует реальных взаимодействий, в лаборатории их нет; TBT показывает, насколько занят главный поток, и служит лабораторным заменителем.
- *Как выбрать начальные пороги?* — Замерить текущее состояние, добавить небольшой запас, а потом ужесточать после каждой оптимизации (ratchet, \`baseline\` с процентами в \`angular.json\`).

### Ответ на 1 минуту

> Производительность деградирует постепенно, поэтому я ставлю бюджет — потолок, нарушение которого роняет CI и делает регрессию видимой прямо в PR. Первый слой — bundle budgets в \`angular.json\`: \`maximumError\` на initial-бандл, на стили каждого компонента и на ключевые ленивые чанки. Это быстро и детерминированно, ловит случайно затащенную библиотеку. Второй слой — Lighthouse CI на каждый PR: несколько прогонов с мобильным троттлингом и проверки конкретных метрик — LCP, TBT, CLS, — а не общего score, иначе просадку одной метрики замаскирует другая. Важная деталь: по умолчанию LHCI сравнивает с бюджетом лучший прогон, поэтому я явно включаю \`aggregationMethod: 'median'\`, а на нестабильных метриках ставлю \`warn\`. Пороги калибрую от текущих значений и только ужесточаю. Лаборатория ловит регрессии между коммитами, а реальную картину, включая INP, я смотрю по RUM в проде.`,
      en: `## In short

Performance never collapses in one go — it **slides bit by bit**: +10 KB here, +1 dependency there, and six months later the app loads twice as slowly with no single commit to blame. A performance budget is a **hard ceiling** (bundle weight, LCP, TBT) whose breach **fails CI**, so the regression shows up in the PR rather than in prod a month later.

Analogy: the scales at airport check-in. Nobody gains eight excess kilos in one sweater — it's one t-shirt at a time. That's why the scales sit **before boarding**, not on the plane: excess weight is caught where it's still cheap to fix.

## How it works, step by step

1. **Bundle budgets** — the first and cheapest level: fast, deterministic, no flakiness. In Angular that's the \`budgets\` section in \`angular.json\`: \`maximumError\` on the initial bundle and on component styles. It catches the classic "accidentally pulled in moment.js with all locales".
2. **Lighthouse CI** — the second level, now about metrics. LHCI runs per PR, boots a preview build and measures real numbers.
3. LHCI runs the audit **several times and takes the median**, because Lighthouse is noisy.
4. The result is compared against the budget in \`lighthouserc.js\` via \`assertions\`, where each metric is marked \`error\` (fails the build) or \`warn\` (just warns).
5. The budget is **calibrated from the current value plus a small margin** and tightened gradually — the ratchet approach. A ceiling picked out of thin air either catches nothing or gets disabled in the first sprint.

## Example

\`\`\`ts
// angular.json — a hard size budget that fails the build
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumError": "6kb" }
]

// lighthouserc.js — metric budgets in CI
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },                  // median: Lighthouse is noisy
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':      ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift':  ['warn',  { maxNumericValue: 0.1 }],
      },
    },
  },
};
\`\`\`

Why this works: the assertions sit on **specific metrics**, not on the overall performance score. With a score, a sagging LCP can be "compensated" by something else improving and the regression goes unnoticed. And \`warn\` on an unstable metric keeps CI from becoming a source of false failures.

## Lab and field

- **The lab (LHCI in CI)** is a deterministic measurement under fixed CPU and network throttling. Its job is catching **regressions between commits**, not predicting real-world numbers.
- **The field (RUM in prod)** is p75 from live users. Its job is showing **reality**: slow Android, 3G, a cold cache.
- You want both: the lab blocks a bad PR, RUM tells you what is actually worth optimizing.
- **A concrete recommendation**: a landing page only needs bundle budgets — free and never flaky. LHCI pays off on product SPAs with a team and a history of regressions.

## What to say in the interview

> Performance decays gradually, so you need a budget — a hard ceiling that fails CI and makes the regression visible in the PR rather than in prod a month later. I set up two levels. First, bundle budgets: in Angular that's the \`budgets\` section in \`angular.json\` with \`maximumError\` on the initial bundle and styles; fast, deterministic, catches an accidentally imported library. Second, Lighthouse CI per PR with assertions on specific metrics — \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\` — not on the overall score, since a score lets one metric's drop hide behind another's gain. Lighthouse is noisy, so \`numberOfRuns\` with a median and \`warn\` instead of \`error\` on unstable metrics. The lab in CI catches regressions; trends I read from prod RUM. Budgets get calibrated from current values and ratcheted down.

## Gotchas

- **Flaky failures**: on a noisy shared CI runner Lighthouse swings ±5–10 points. Fix with a median of N runs, a dedicated runner, and \`warn\` on unstable metrics. Otherwise the team quickly learns to "re-run until green".
- **A toothless budget**: too generous catches nothing, too strict gets disabled. Ratcheting from current values is the only approach that survives.
- **Score-only, with no per-metric assertions** — an LCP regression hides behind an improvement elsewhere.
- Expect the **lab vs field** question: Lighthouse is the lab, Core Web Vitals from CrUX/RUM are the field, and the numbers legitimately differ.
- Budgeting only the initial bundle and not lazy chunks: the weight just migrates into lazy modules while the metrics still suffer.
- Running LHCI on localhost with no throttling — lovely numbers, zero value.`,
    },
    codeSnippet: `// angular.json — hard bundle budget, fails the build
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumError": "6kb" }
]

// lighthouserc.js — metric budgets in CI
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },                 // median; Lighthouse is noisy
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':      ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift':  ['warn',  { maxNumericValue: 0.1 }],
      },
    },
  },
};`,
  },
  {
    id: 'arch-049',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['storybook', 'component-driven', 'design-tokens'],
    question: {
      ru: 'Что даёт Storybook и component-driven development, и как сюда вписываются design tokens?',
      en: 'What do Storybook and component-driven development give you, and how do design tokens fit in?',
    },
    answer: {
      ru: `## В чём суть

Component-Driven Development (CDD) — это сборка интерфейса **снизу вверх**: сначала изолированные «глупые» компоненты, потом из них собирают виджеты и экраны. Storybook — каталог-мастерская, где каждый компонент живёт **отдельно от приложения, роутинга и бэкенда**, а каждое его состояние (загрузка, ошибка, пустой список, RTL, тёмная тема) записано как отдельная story. Design tokens — общий словарь дизайн-значений (цвета, отступы, шрифты), из которого берут стили и компоненты, и макеты дизайнера.

Аналогия: шоурум мебели. Диван стоит на подиуме, а не в чужой квартире: его можно обойти, посмотреть во всех обивках, проверить, раскладывается ли, — не переезжая в квартиру целиком. Design tokens в этой аналогии — каталог цветов RAL: маляр не смешивает краску на глаз, он берёт «RAL 5010», и стены во всех проектах компании одинаковые.

**Какую проблему решает.** В живом приложении редкие состояния компонента воспроизводить мучительно: чтобы увидеть «таблицу без данных» или «кнопку в загрузке», нужно ломать бэкенд или ловить сетевую задержку. Поэтому их никто не смотрит, и они ломаются незаметно. Без каталога дизайнеры и разработчики спорят по скриншотам из Confluence, которые устарели в день публикации, а без токенов один и тот же «фирменный синий» существует в проекте в пяти оттенках.

## Словарик терминов

- **CDD (Component-Driven Development)** — подход, при котором UI строят из независимых компонентов снизу вверх: атомы → составные компоненты → экраны.
- **Презентационный («глупый») компонент (presentational component)** — компонент, который получает данные только через входы и сообщает о событиях только через выходы, без обращений к сервисам и роутеру.
- **Storybook** — отдельное dev-приложение, которое рендерит компоненты в изоляции и показывает их каталогом с панелью управления.
- **Story (история)** — одно зафиксированное состояние компонента: «кнопка в загрузке», «таблица без строк».
- **CSF (Component Story Format)** — формат файла \`*.stories.ts\`: \`default\`-экспорт описывает компонент, каждый именованный экспорт — отдельная story.
- **Args** — значения входов компонента для конкретной story. Их можно менять на лету в панели Controls.
- **\`Meta\` и \`StoryObj\`** — TypeScript-типы из \`@storybook/angular\` для описания компонента и его stories.
- **Декоратор (decorator)** — обёртка вокруг story: добавить провайдеры, тему, отступы. В Angular это \`applicationConfig\` и \`moduleMetadata\`.
- **\`play\`-функция (interaction test)** — сценарий, который выполняется после отрисовки story: кликнуть, ввести текст, проверить результат.
- **\`fn()\`** — шпион (spy) из \`storybook/test\`: функция-заглушка, которая запоминает свои вызовы.
- **Visual regression (визуальная регрессия)** — сравнение скриншота story с эталоном (baseline), чтобы заметить «поехавшую» вёрстку. Сервисы — Chromatic, Percy.
- **a11y-аддон (accessibility)** — проверка доступности каждой story движком axe-core: контраст, подписи кнопок, роли.
- **Design token (дизайн-токен)** — именованное дизайн-значение в платформо-независимом виде: \`color.brand = #0057b8\`.
- **Primitive / semantic токены** — примитивные хранят палитру (\`color.blue.600\`), семантические — смысл (\`color.brand\`, \`color.surface\`) и ссылаются на примитивные.
- **CSS custom properties (CSS-переменные)** — переменные вида \`--color-brand\`, которые читаются через \`var(--color-brand)\` и меняются во время работы приложения.
- **Style Dictionary** — инструмент, который из JSON с токенами генерирует CSS-переменные, SCSS, JS и другие форматы.

## Как это работает под капотом

Что происходит, когда вы запускаете Storybook:

1. Storybook собирает **отдельное приложение** со своим сборщиком (для \`@storybook/angular\` — через Angular-конфигурацию проекта) и находит файлы stories по маске из \`.storybook/main.ts\`, например \`src/**/*.stories.ts\`.
2. Каждый файл разбирается по формату CSF: \`default\`-экспорт говорит «это компонент \`ButtonComponent\` в разделе \`UI/Button\`», каждый именованный экспорт превращается в пункт меню.
3. Когда вы выбираете story, Storybook создаёт хост-шаблон вида \`<app-button [label]="label" (clicked)="clicked($event)">\` и подставляет \`args\` во входы. Выходы привязываются, только если в \`args\` есть ключ с именем выхода.
4. Декораторы оборачивают story: добавляют провайдеры, тему, контейнер нужной ширины. Компоненту кажется, что он в обычном приложении.
5. После отрисовки выполняется \`play\`-функция (если есть), а аддоны делают своё: a11y прогоняет axe-core по DOM, панель Controls позволяет менять \`args\` на лету.
6. В CI те же stories запускаются как тесты: каждая story — это тест «отрисовалась без ошибок», а \`play\` и a11y добавляют проверки. Сервис визуальной регрессии снимает скриншот каждой story и сравнивает с эталоном.

Мысленная модель: story — это вызов «отрисуй компонент с такими входами и обёртками»:

\`\`\`ts
// Упрощённо: story = компонент + входы + декораторы
function renderStory(component, args, decorators) {
  const story = () => mount(component, { inputs: args });
  return decorators.reduce((wrapped, decorate) => () => decorate(wrapped), story)();
}
\`\`\`

Отсюда главное свойство: всё, что нужно компоненту, приходит снаружи. Если компонент сам лезет в сервис или роутер, «просто с входами» его не отрисовать, и это сразу видно.

### Пример 1. Первая story: каждое состояние — отдельный экспорт

\`\`\`ts
// button.component.ts — презентационный компонент на сигналах
@Component({
  selector: 'app-button',
  template: \`
    <button [class]="variant()" [disabled]="disabled() || loading()" (click)="clicked.emit()">
      @if (loading()) { <span class="spinner" aria-hidden="true"></span> }
      {{ label() }}
    </button>\`,
})
export class ButtonComponent {
  label = input.required<string>();
  variant = input<'primary' | 'secondary'>('primary');
  loading = input(false);
  disabled = input(false);
  clicked = output<void>();
}
\`\`\`

\`\`\`ts
// button.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'UI/Button',
  component: ButtonComponent,
  args: { label: 'Сохранить', clicked: fn() }, // общие args для всех stories
};
export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const LongLabel: Story = { args: { label: 'Сохранить и отправить на согласование' } };
\`\`\`

В меню Storybook появятся четыре пункта в разделе \`UI/Button\`. Состояние \`Loading\` в приложении пришлось бы ловить сетевой задержкой, а здесь это один аргумент — именно поэтому редкие состояния перестают быть непроверенными. \`LongLabel\` — типичный пограничный случай, который ломает вёрстку и который в приложении замечают только на проде.

### Пример 2. Компоненту нужны сервисы: \`applicationConfig\` и \`moduleMetadata\`

\`\`\`ts
// user-card.stories.ts
import { applicationConfig, moduleMetadata, type Meta } from '@storybook/angular';

const meta: Meta<UserCardComponent> = {
  title: 'Users/UserCard',
  component: UserCardComponent,
  decorators: [
    applicationConfig({                      // провайдеры уровня приложения
      providers: [{ provide: UserApi, useValue: { load: () => of(mockUser) } }],
    }),
    moduleMetadata({ imports: [AvatarComponent] }), // зависимости шаблона
  ],
};
export default meta;
\`\`\`

Подменить сервис можно, но это повод задуматься. Компонент, который сам ходит в API, без моков в Storybook **не заводится** — это индикатор плохих границ, а не проблема Storybook. Обычно правильнее разделить: «умный» контейнер загружает данные, а презентационная карточка получает \`user\` через вход.

### Пример 3. Interaction test прямо на story: \`play\`

\`\`\`ts
import { expect, fn } from 'storybook/test';

export const SubmitsOnClick: Story = {
  args: { label: 'Сохранить', clicked: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Сохранить' }));
    await expect(args.clicked).toHaveBeenCalledTimes(1);
  },
};

export const NoClickWhileLoading: Story = {
  args: { loading: true, clicked: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.clicked).not.toHaveBeenCalled(); // кнопка disabled во время загрузки
  },
};
\`\`\`

\`canvas\` — набор запросов в стиле Testing Library, ограниченный областью story; \`userEvent\` имитирует настоящие действия пользователя. Шпион \`fn()\` передаётся через \`args\`, поэтому Storybook привязывает его к выходу \`clicked\`. В Storybook 8 те же функции импортировались из \`@storybook/test\`, а элемент находили через \`within(canvasElement)\`; с версии 9 всё лежит в \`storybook/test\`, а \`canvas\` и \`userEvent\` приходят прямо в контекст \`play\`.

В CI эти сценарии запускаются как обычные тесты: исторически — через \`@storybook/test-runner\` (Playwright открывает каждую story), в свежих версиях — через Vitest-аддон, для Angular вместе с фреймворком \`@storybook/angular-vite\`. Какой вариант доступен, зависит от версии Storybook и способа сборки, это стоит проверить в своём проекте.

### Пример 4. Доступность: a11y-аддон и axe-core

\`\`\`ts
export const IconOnly: Story = {
  args: { label: '' },
  parameters: { a11y: { test: 'error' } }, // нарушение доступности = упавший тест
};
\`\`\`

Аддон прогоняет axe-core по отрисованной story. Для кнопки-иконки без текста axe-core 4.14 выдаёт:

\`\`\`text
button-name | Buttons must have discernible text | <button class="icon-btn"><svg ...></svg></button>
\`\`\`

Добавили \`aria-label="Удалить строку"\` — проверка проходит. Значения \`test\`: \`'off'\` (не проверять), \`'todo'\` (показывать как предупреждение) и \`'error'\` (ронять тест). Удобно включить \`'todo'\` на всём каталоге и постепенно переводить компоненты в \`'error'\`.

### Пример 5. Visual regression поверх stories

Каждая story — готовый детерминированный кадр для скриншот-теста. У неё есть стабильный id из \`title\` и имени экспорта: \`UI/Button\` + \`Loading\` даёт \`ui-button--loading\`, и story открывается отдельно по адресу \`iframe.html?id=ui-button--loading\`.

\`\`\`ts
// Playwright: снимок одной story вместо целой страницы
test('button loading', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=ui-button--loading');
  await expect(page.locator('#storybook-root')).toHaveScreenshot('button-loading.png');
});
\`\`\`

Chromatic (сервис от команды Storybook) или Percy делают это для всего каталога: снимают каждую story, показывают визуальный дифф и просят человека подтвердить изменение. Тест «кнопка кликается» останется зелёным, даже если кнопка уехала за край, а скриншот это поймает.

### Design tokens: от JSON до CSS-переменных

Токены хранят как данные — обычно JSON. Современный формат сообщества W3C Design Tokens Community Group использует поля \`$value\` и \`$type\`, а ссылки на другие токены пишутся в фигурных скобках:

\`\`\`json
{
  "color": {
    "blue": { "600": { "$value": "#0057b8", "$type": "color" } },
    "gray": {
      "50": { "$value": "#f8f9fa", "$type": "color" },
      "900": { "$value": "#1a1d21", "$type": "color" }
    },
    "brand":   { "$value": "{color.blue.600}", "$type": "color" },
    "surface": { "$value": "{color.gray.50}", "$type": "color" },
    "text":    { "$value": "{color.gray.900}", "$type": "color" }
  },
  "space":  { "md": { "$value": "16px", "$type": "dimension" } },
  "radius": { "control": { "$value": "6px", "$type": "dimension" } }
}
\`\`\`

Style Dictionary (проверено на версии 4.4, формат \`css/variables\` с опцией \`outputReferences: true\`) генерирует из этого:

\`\`\`css
:root {
  --color-blue-600: #0057b8;
  --color-gray-50: #f8f9fa;
  --color-gray-900: #1a1d21;
  --space-md: 16px;
  --radius-control: 6px;
  --color-brand: var(--color-blue-600);
  --color-surface: var(--color-gray-50);
  --color-text: var(--color-gray-900);
}
\`\`\`

Из того же источника в той же сборке получаются \`_tokens.scss\` (\`$color-brand: #0057b8;\`) и \`tokens.js\` (\`export const ColorBrand = "#0057b8";\`) — для SCSS-миксинов, графиков на canvas или мобильного приложения. Компонент использует только **семантические** токены:

\`\`\`scss
// button.component.scss
button.primary {
  background: var(--color-brand);
  padding: 0 var(--space-md);
  border-radius: var(--radius-control);
}
\`\`\`

### Тёмная тема — это переопределение семантических токенов

Тёмная тема не требует правок в компонентах: переопределяются только семантические токены. Файл \`themes/dark.json\` со значениями \`color.surface → {color.gray.900}\` и \`color.text → {color.gray.50}\`, собранный Style Dictionary с опцией \`selector: '[data-theme="dark"]'\`, даёт:

\`\`\`css
[data-theme="dark"] {
  --color-surface: var(--color-gray-900);
  --color-text: var(--color-gray-50);
}
\`\`\`

Достаточно поставить \`data-theme="dark"\` на \`<html>\`, и все компоненты перекрасятся. В Storybook для этого есть аддон \`@storybook/addon-themes\` с декоратором \`withThemeByDataAttribute({ themes: { light: 'light', dark: 'dark' }, defaultTheme: 'light', attributeName: 'data-theme' })\` — переключатель темы появляется в тулбаре, и каждую story можно проверить в обеих темах.

### Линт: без него токены не выживают

\`\`\`json
// .stylelintrc.json
{ "rules": { "color-no-hex": true } }
\`\`\`

\`\`\`text
a.scss
  2:10  ✖  Disallowed hex color "#0057b8"  color-no-hex
\`\`\`

Правило \`color-no-hex\` встроено в Stylelint (проверено на 17.16) и запрещает цвет в обход токенов. Без линта через пару месяцев в коде снова появляются «magic colors».

### Где это применяется на практике

- **Корпоративная дизайн-система или UI-kit** для нескольких команд: Storybook — витрина и документация, токены — одинаковый вид во всех продуктах.
- **Обёртки над сторонними библиотеками** (KendoUI, Angular Material): stories фиксируют каждый режим вашей обёртки грида или датапикера и показывают регрессии после обновления библиотеки.
- **Таблицы и дашборды**: «загрузка», «пусто», «ошибка», «10 000 строк», «очень длинное значение в ячейке» — отдельные stories.
- **Формы**: поле «пустое», «невалидное после blur», «disabled», «с подсказкой» — без ручного прокликивания.
- **Параллельная работа**: вёрстка идёт по stories с мок-данными, пока API не готов; дизайнер смотрит опубликованный Storybook вместо скриншотов.
- **Ребрендинг и white-label**: новый клиент — новые значения семантических токенов, компоненты не трогаются.

## Важные нюансы и подводные камни

- **Дрейф stories.** Если Storybook не запускается в CI, stories ломаются и незаметно устаревают. Сборка каталога и прогон stories как тестов обязаны быть частью пайплайна, иначе это мёртвая документация.
- **Бизнес-моки расходятся с реальным API.** Компонент красиво выглядит на выдуманных данных и падает на настоящих. Помогают типы, сгенерированные из OpenAPI, и общие с тестами мок-данные.
- **«Storybook заменяет unit-тесты?» — нет.** Он закрывает визуальные состояния и интеракции, а бизнес-логику, расчёты и сервисы по-прежнему тестируют отдельно.
- **Компонент, который сам ходит в сервис, в Storybook не заводится** — это хороший индикатор плохих границ, а не проблема Storybook.
- **Выход не срабатывает в \`play\`.** Шпион привязывается к выходу компонента, только если ключ в \`args\` совпадает с именем выхода (\`clicked\`, а не \`onClicked\`).
- **Отдельная сборка — отдельная конфигурация.** Глобальные стили, шрифты, токены и полифилы нужно подключить и в Storybook, иначе компоненты там выглядят не так, как в приложении.
- **Переименовали story — потеряли историю скриншотов.** Id story строится из \`title\` и имени экспорта, а baseline визуальной регрессии привязан к этому id.
- **Токены называют по смыслу, а не по значению.** Компонент должен использовать \`--color-danger\`, а не \`--red-500\`: иначе при смене палитры придётся править каждый компонент.
- **Токены без линта** превращаются в «magic colors» в обход системы, и вся идея единого источника истины рушится.
- **Для крошечного приложения Storybook — лишняя инфраструктура** со своей сборкой, обновлениями и деплоем. Он окупается на дизайн-системах и многокомандных продуктах.

**Плюсы:** все состояния компонента видны и проверяемы без бэкенда; живая документация вместо устаревших скриншотов; основа для interaction-, a11y- и скриншот-тестов; параллельная работа фронтенда, бэкенда и дизайна; токены дают единый вид, дешёвые темы и ребрендинг правкой в одном месте.
**Минусы:** отдельная сборка и конфигурация, которую нужно поддерживать и обновлять; stories устаревают без CI; моки могут разойтись с реальностью; токены требуют дисциплины, именования и линта; для маленького проекта затраты не окупаются.

## Как это спрашивают на собеседовании

**Главный вывод:** CDD строит UI снизу вверх из изолированных компонентов, Storybook делает каждое их состояние видимым, документированным и тестируемым без приложения и бэкенда, а design tokens — единый источник дизайн-значений, из которого генерируются CSS-переменные для всех компонентов и тем.

Типичные формулировки: «Зачем нужен Storybook, если есть само приложение?», «Что такое component-driven development?», «Что такое design tokens и как сделать тёмную тему без правок в компонентах?», «Как вы документируете UI-библиотеку?».

Что могут спросить следом:

- *Заменяет ли Storybook unit-тесты?* — Нет. Он проверяет визуальные состояния и интеракции; логику тестируют отдельно.
- *Как тестировать stories в CI?* — Прогонять каждую story как тест (test-runner или Vitest-аддон), добавить \`play\`-сценарии, a11y с \`test: 'error'\` и визуальную регрессию через Chromatic, Percy или Playwright.
- *Чем primitive-токены отличаются от semantic?* — Примитивные описывают палитру, семантические — роль цвета; компоненты используют только семантические, а темы переопределяют именно их.
- *Что делать с компонентом, который не отрисовывается в Storybook?* — Скорее всего, он сам ходит в сервисы; вынести загрузку данных в контейнер, а UI сделать презентационным.

### Ответ на 1 минуту

> Component-driven development — это сборка UI снизу вверх: сначала изолированные презентационные компоненты, которые получают всё через входы и выходы, потом из них экраны. Storybook даёт каталог, где компонент рендерится отдельно от приложения, роутинга и бэкенда, а каждое состояние — загрузка, ошибка, пустой список, длинный текст, тёмная тема — описано отдельной story через \`args\`. Это позволяет верстать без готового API, держать живую документацию вместо скриншотов и строить на stories проверки: \`play\`-функции для интеракций, a11y-аддон на axe-core и визуальную регрессию через Chromatic или Playwright. Design tokens — единый источник дизайн-значений в JSON, из которого Style Dictionary генерирует CSS-переменные; компоненты используют только семантические токены, поэтому тёмная тема и ребрендинг — это переопределение токенов. Главные риски — дрейф stories без CI и хардкод цветов без линта.`,
      en: `## In short

Component-driven development builds the UI **bottom-up**: isolated "dumb" components first, then composed into screens. Storybook is the catalog where a component lives **separately from the app, the router and the backend**, with every state (loading, error, empty, RTL, dark theme) written down as its own story.

Analogy: a furniture showroom. The sofa sits on a plinth, not in somebody's flat: you can walk around it, see every upholstery option, check that it folds out — without moving into the flat first. Design tokens in the same analogy are the RAL colour chart: the painter doesn't mix paint by eye, they take "RAL 5010", and every wall across the company matches.

## How it works, step by step

1. The component is written **in isolation**, receiving all data through inputs, with no calls to services or the router.
2. Every state becomes its **own story**: not "button", but "primary button", "button loading", "button disabled". States that are awkward to reproduce inside the app become visible.
3. Storybook renders those stories with no backend — so markup and design proceed **in parallel** with API work; data is just mocked props.
4. The catalog itself becomes **living visual documentation** — unlike Confluence screenshots, which are stale the day they're posted.
5. On top of stories you get checks almost for free: **visual regression** (Chromatic/Percy) and **accessibility** (the a11y addon built on axe).
6. **Interaction tests** via \`play\` functions run right on a story: click, type, assert — without standing up a full e2e suite.

## Example

\`\`\`ts
// button.stories.ts — each state is its own story
export default { title: 'UI/Button', component: ButtonComponent };

export const Primary  = { args: { label: 'Save', variant: 'primary' } };
export const Loading  = { args: { label: 'Save', loading: true } };
export const Disabled = { args: { label: 'Save', disabled: true } };

// an interaction test right on the story — no full e2e
export const Submits = {
  args: { label: 'Save' },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole('button', { name: 'Save' });
    await userEvent.click(btn);
    await expect(onSubmit).toHaveBeenCalled();
  },
};

// tokens.json -> Style Dictionary -> CSS custom properties
// { "color": { "brand": { "value": "#0057b8" } } }
// :root { --color-brand: #0057b8; }  and the component uses var(--color-brand)
\`\`\`

Why this works: inside the app you'd have to induce a network delay to see the \`Loading\` state; in Storybook it's one argument. That's precisely why rarely-seen states stop being the untested ones.

## Design tokens

- A token is the **single source of truth** for a design value: colour, spacing, typography, radius. Stored as platform-agnostic data (JSON).
- From that data you **generate** CSS custom properties, SCSS variables, sometimes native platform outputs — typically via Style Dictionary.
- The point is breaking the "value hardcoded inside the component" link. Rebranding and theming become a change **in one place**, and dark mode is just a token override.
- Without discipline the system rots: you need lint that forbids hardcoded hex values in component styles.

## What to say in the interview

> Component-driven development builds UI bottom-up: isolated components first, composition second. Storybook gives you a catalog where a component renders isolated from the app, routing and backend, with every state — loading, error, empty, RTL, dark theme — as a separate story. That buys parallel work without a ready API, living visual documentation instead of stale Confluence, and a base for visual regression via Chromatic or Percy and accessibility checks via the a11y addon on axe. Interactions can be tested on the story itself with \`play\` functions, no full e2e needed. Design tokens are the single source of truth for colours, spacing and typography as JSON, from which Style Dictionary generates CSS variables — so rebranding and dark mode are a one-place change. The main risk is drift: if Storybook isn't run in CI, the stories become dead documentation.

## Gotchas

- **Story drift**: nobody runs them in CI, they break and quietly go stale. Storybook must be part of the pipeline or it's dead documentation.
- Business mocks in stories **diverge from the real API** — the component looks great on invented data and falls over on real data.
- Tokens without lint → "magic colors" bypassing the system, and the single-source-of-truth idea collapses.
- They'll ask "does Storybook replace unit tests?" No. It covers visual states and interactions; logic is still tested separately.
- A component that calls a service itself **won't mount in Storybook** — that's a useful signal of bad boundaries, not a Storybook problem.
- For a tiny app Storybook is surplus infrastructure with its own build and deploy. It pays off on design systems and multi-team products.`,
    },
  },
  {
    id: 'arch-050',
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['contract-testing', 'pact', 'visual-regression'],
    question: {
      ru: 'Что такое contract testing (Pact) и visual regression testing, и какие провалы интеграции они ловят?',
      en: 'What are contract testing (Pact) and visual regression testing, and which integration failures do they catch?',
    },
    answer: {
      ru: `## В чём суть

Обе техники ловят то, что **обычные тесты не видят**. Contract testing проверяет, что фронтенд и бэкенд договорились об одном и том же API, не поднимая всю систему целиком. Visual regression проверяет, что интерфейс не «поехал» визуально, хотя вся логика работает и функциональные тесты зелёные.

Аналогия для контрактов: мост строят с двух берегов. Ждать, пока половинки сойдутся посередине, — это e2e: долго, дорого, и о расхождении вы узнаёте в самом конце. Вместо этого обе команды сверяют **чертёж стыковочного узла**. Contract testing и есть такой чертёж: у фронтенда записано, чего он ждёт, а бэкенд у себя в CI доказывает, что он это отдаёт. Аналогия для visual regression — игра «найди десять отличий», только играет машина и сверяет каждый пиксель.

**Какую проблему решает.** Классика интеграционных провалов: юнит-тесты фронтенда зелёные, потому что мок отвечает «по-старому», а бэкенд уже переименовал \`name\` в \`fullName\`. Тесты бэкенда тоже зелёные — он ведь отдаёт то, что задумал. Ломается только прод. Полноценный e2e-стенд ловит это поздно, медленно и с флаком. Вторая слепая зона — вёрстка: тест «кнопка кликается» пройдёт, даже если кнопка уехала за край экрана или стала белой на белом. Contract testing закрывает первую дыру, visual regression — вторую.

## Словарик терминов

- **Consumer (потребитель)** — тот, кто вызывает API. Для нас — фронтенд или его API-клиент.
- **Provider (поставщик)** — тот, кто API реализует: бэкенд-сервис.
- **Контракт (contract)** — машинно-проверяемое описание «на такой запрос — такой ответ» между consumer и provider.
- **Consumer-driven contract testing** — подход, при котором контракт пишет потребитель, исходя из того, что он реально использует, а поставщик проверяет, что выполняет его.
- **Pact** — самый распространённый инструмент consumer-driven контрактов; для JavaScript — пакет \`@pact-foundation/pact\`.
- **Interaction (взаимодействие)** — одна пара «запрос → ожидаемый ответ» в контракте.
- **Pact-файл** — JSON, который Pact генерирует из тестов потребителя: список interactions с правилами сравнения.
- **Provider state (состояние поставщика)** — предусловие вида «пользователь 42 существует», которое бэкенд должен подготовить перед проверкой interaction.
- **Matchers (матчеры)** — правила «сравнивай тип, а не значение»: \`like\`, \`integer\`, \`string\`, \`eachLike\`.
- **Mock server** — временный HTTP-сервер Pact, который во время теста потребителя отвечает по контракту и записывает, какие запросы пришли.
- **Verification (верификация)** — прогон контракта против настоящего бэкенда: Pact проигрывает запросы и сверяет ответы.
- **Pact Broker** — общее хранилище контрактов и результатов верификаций с привязкой к версиям приложений (есть облачный вариант PactFlow).
- **\`can-i-deploy\`** — команда, которая спрашивает у брокера: «совместима ли эта версия со всем, что уже развёрнуто в целевом окружении?»
- **Provider-driven контракт (OpenAPI)** — контракт пишет поставщик в виде схемы API, потребители валидируются по ней.
- **Visual regression testing** — сравнение скриншота компонента или страницы с эталоном.
- **Baseline (эталон)** — утверждённый скриншот, с которым сравнивают новый.
- **Threshold (порог)** — насколько сильно может отличаться цвет пикселя или сколько пикселей может отличаться, чтобы это ещё не считалось изменением.
- **Маскирование (masking)** — закрашивание динамических областей (время, аватары, графики) перед сравнением.

## Как это работает под капотом

Полный цикл consumer-driven контракта с Pact:

1. **Тест потребителя.** Фронтенд описывает interaction: «при состоянии \`user 42 exists\` на \`GET /users/42\` я жду 200 и тело с полями \`id\` (целое) и \`name\` (строка)». Pact поднимает mock server, и ваш **настоящий** API-клиент делает к нему запрос.
2. **Проверка на месте.** Mock server сверяет пришедший запрос с описанием. Если клиент ошибся в пути, методе или заголовках — тест потребителя падает сразу. Если всё совпало — отвечает примером из контракта.
3. **Pact-файл.** После теста Pact записывает JSON с interactions и правилами матчинга. Эти же ожидания служили моками для фронтового теста, поэтому моки и контракт физически одно и то же и разойтись не могут.
4. **Публикация.** CI фронтенда публикует файл в Pact Broker с версией (обычно git SHA) и веткой.
5. **Верификация на стороне бэкенда.** CI бэкенда скачивает контракты потребителей, для каждой interaction вызывает обработчик provider state (готовит данные), проигрывает запрос против реального сервиса и сравнивает ответ по правилам матчеров. Результат публикуется обратно в брокер.
6. **Матрица совместимости.** Брокер хранит таблицу «какая версия потребителя проверена с какой версией поставщика и с каким результатом».
7. **Гейт перед деплоем.** \`can-i-deploy\` смотрит в матрицу: есть ли зелёная верификация между выкатываемой версией и тем, что уже стоит в целевом окружении. Нет — деплой блокируется. Без этого шага контракты есть, а защиты нет.
8. **Фиксация деплоя.** После выкатки \`record-deployment\` сообщает брокеру, какая версия теперь в окружении, чтобы следующие проверки сравнивали с правильной версией.

Итог: бэкенд не может **тихо** сломать поле, которое нужно фронтенду, — у него упадёт верификация до деплоя. И всё это без общего e2e-стенда.

### Тест потребителя на Pact

Сниппет под ответом написан в классическом объектном API (\`addInteraction({ state, uponReceiving, ... })\` и \`Matchers.like\`) — так выглядел Pact JS v2, и этот API доступен как \`PactV2\`. В современных версиях \`Pact\` — это \`PactV4\` с цепочкой вызовов (проверено на \`@pact-foundation/pact\` 16.5). Смысл тот же:

\`\`\`js
const { Pact, Matchers } = require('@pact-foundation/pact');
const { integer, string, eachLike } = Matchers;

// Настоящий API-клиент фронтенда — именно его мы и проверяем
async function getUser(baseUrl, id) {
  const res = await fetch(\`\${baseUrl}/users/\${id}\`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

const provider = new Pact({ consumer: 'web-app', provider: 'user-service', dir: './pacts' });

await provider
  .addInteraction()
  .given('user 42 exists')                       // provider state
  .uponReceiving('a request for user 42')
  .withRequest('GET', '/users/42', (b) => b.headers({ Accept: 'application/json' }))
  .willRespondWith(200, (b) =>
    b.jsonBody({ id: integer(42), name: string('Ada'), roles: eachLike('admin') }))
  .executeTest(async (mockServer) => {
    console.log(await getUser(mockServer.url, 42));
  });
// { id: 42, name: 'Ada', roles: [ 'admin' ] }
// + файл ./pacts/web-app-user-service.json
\`\`\`

Если клиент вызовет \`/user/42\` вместо \`/users/42\`, тест потребителя упадёт ещё до всякого бэкенда с сообщением mock server вида \`The following request was not expected: Method: GET, Path: /user/42\`.

### Что лежит в pact-файле

\`\`\`json
{
  "providerStates": [{ "name": "user 42 exists" }],
  "request": { "method": "GET", "path": "/users/42", "headers": { "Accept": ["application/json"] } },
  "response": {
    "status": 200,
    "body": { "content": { "id": 42, "name": "Ada", "roles": ["admin"] } },
    "matchingRules": {
      "body": {
        "$.id":    { "matchers": [{ "match": "integer" }] },
        "$.name":  { "matchers": [{ "match": "type" }] },
        "$.roles": { "matchers": [{ "match": "type", "min": 1 }] }
      }
    }
  }
}
\`\`\`

Это сокращённый фрагмент реального файла (спецификация Pact 4.0). Значения \`42\`, \`'Ada'\` — лишь пример; проверяются **правила**: \`id\` — целое число, \`name\` — строка любого содержания, \`roles\` — массив хотя бы из одного элемента такого же типа.

### Верификация на стороне бэкенда

\`\`\`js
const { Verifier } = require('@pact-foundation/pact');

await new Verifier({
  providerBaseUrl: 'http://localhost:8080',          // запущенный бэкенд
  pactUrls: ['./pacts/web-app-user-service.json'],   // или pactBrokerUrl + consumerVersionSelectors
  stateHandlers: {
    'user 42 exists': async () => db.users.insert({ id: 42, name: 'Grace', roles: ['viewer', 'editor'] }),
  },
}).verifyProvider();
\`\`\`

Что показал прогон этого кода против маленького тестового сервера:

\`\`\`text
бэкенд отдаёт { id: 42, name: 'Grace', roles: ['viewer','editor'] }  → PASSED (значения другие, типы те же)
бэкенд добавил поле email                                          → PASSED (лишние поля не мешают)
бэкенд переименовал name → fullName                                → FAILED: $ -> Actual map is missing the following keys: name
бэкенд стал отдавать id строкой "42"                               → FAILED: $.id -> Expected '42' (String) to be an integer
\`\`\`

Ровно та защита, которая нужна: добавлять поля можно свободно, а удалить, переименовать или поменять тип поля, которым пользуется фронтенд, — нельзя, верификация краснеет в CI бэкенда до деплоя.

### Матчеры: почему форма, а не значение

\`\`\`js
// ❌ Хрупко: контракт привязан к конкретным тестовым данным
willRespondWith(200, (b) => b.jsonBody({ id: 42, name: 'Ada' }));
// В базе бэкенда пользователь 42 называется "Grace" → верификация красная,
// хотя API совместим. Команда быстро перестаёт такой контракт чинить.

// ✅ Надёжно: проверяем то, от чего реально зависит фронтенд
willRespondWith(200, (b) => b.jsonBody({ id: integer(42), name: string('Ada') }));
\`\`\`

\`like\` (в новых версиях есть и более точные \`integer\`, \`string\`, \`boolean\`, \`eachLike\`, \`regex\`) фиксирует **тип и форму**. Точное значение стоит фиксировать только там, где оно и есть контракт: код статуса, перечисление вида \`status: 'ACTIVE'\`.

### Pact Broker и гейт \`can-i-deploy\`

\`\`\`bash
# CI фронтенда: опубликовать контракт с версией = git SHA
pact-broker publish ./pacts --consumer-app-version "$GIT_SHA" --branch "$GIT_BRANCH" --broker-base-url "$PACT_BROKER_URL"

# Перед деплоем: совместима ли эта версия со всем, что уже в production?
pact-broker can-i-deploy --pacticipant web-app --version "$GIT_SHA" --to-environment production

# После деплоя: зафиксировать, что теперь стоит в production
pact-broker record-deployment --pacticipant web-app --version "$GIT_SHA" --environment production
\`\`\`

\`can-i-deploy\` завершается ненулевым кодом, если в матрице нет зелёной верификации, — и пайплайн останавливается. На стороне бэкенда в \`Verifier\` обычно указывают \`pactBrokerUrl\`, \`consumerVersionSelectors\` (например, \`{ mainBranch: true }\` и \`{ deployedOrReleased: true }\` — проверять контракты главной ветки и уже развёрнутых версий), \`publishVerificationResult: true\` и \`enablePending: true\`. Последний флаг включает «pending pacts»: новое ожидание потребителя, которое бэкенд ещё ни разу не выполнял, не роняет сборку бэкенда, а только помечается.

### Consumer-driven против provider-driven

- **Consumer-driven (Pact)** подходит, когда потребители известны и их немного: свой фронтенд, мобильное приложение, соседние микросервисы. Бэкенд точно знает, какие поля кому нужны, и может смело менять остальные.
- **Provider-driven (OpenAPI + валидация схемы)** нужен для **публичного API** с тысячами неизвестных потребителей: никто не пришлёт вам свой pact. Поставщик публикует схему, а совместимость изменений проверяют по ней (например, диффом схем на «ломающие» изменения).
- Существует и гибрид — сравнение контрактов потребителей с OpenAPI-схемой поставщика (в PactFlow он называется bi-directional contract testing). Это компромисс: дешевле внедрить, но схема может не совпадать с реальным поведением сервиса.

### Visual regression: как сравниваются картинки

Механика у всех инструментов одинаковая:

1. Компонент или страницу рендерят в **фиксированных** условиях: один браузер, одна ОС, размер окна, шрифты, данные.
2. Делают скриншот и сравнивают с baseline попиксельно: для каждого пикселя считается «воспринимаемая» разница цвета.
3. Пиксели, у которых разница выше \`threshold\`, считаются отличающимися. Если их больше допустимого (\`maxDiffPixels\` или \`maxDiffPixelRatio\`), тест падает и сохраняет картинку-дифф с подсвеченными местами.
4. Человек смотрит дифф: это баг — чинят код; это задуманное изменение — обновляют baseline отдельным осознанным действием.

На библиотеке \`pixelmatch\` (её алгоритм лежит в основе сравнения во многих инструментах) это выглядит так:

\`\`\`js
import pixelmatch from 'pixelmatch';

// Две «картинки» 3×1 пиксель, RGBA — по 4 байта на пиксель
const baseline = new Uint8Array([0, 87, 184, 255,  255, 255, 255, 255,  255, 255, 255, 255]);
const actual   = new Uint8Array([0, 90, 186, 255,  255, 255, 255, 255,  220,   0,   0, 255]);
//                                ↑ почти тот же синий (другое сглаживание)  ↑ красный пиксель на белом фоне

const diff = new Uint8Array(baseline.length);
console.log(pixelmatch(baseline, actual, diff, 3, 1, { threshold: 0.1 })); // 1
console.log(pixelmatch(baseline, actual, diff, 3, 1, { threshold: 0 }));   // 2
\`\`\`

С порогом 0,1 (значение по умолчанию у \`pixelmatch\`) микроскопическая разница оттенка игнорируется, а красный пиксель — нет. С порогом 0 падает даже сглаживание. Отсюда вечный баланс: порог слишком строгий — флак, слишком мягкий — пропущенные реальные изменения.

### Playwright \`toHaveScreenshot\`

\`\`\`ts
import { test, expect } from '@playwright/test';

test('orders grid', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-01-15T10:00:00Z')); // «заморозить» время
  await page.goto('/orders?seed=42');                               // детерминированные данные
  await expect(page).toHaveScreenshot('orders-grid.png', {
    mask: [page.locator('.user-avatar'), page.locator('.live-chart')], // динамику закрашиваем
    maxDiffPixelRatio: 0.01,                                           // до 1% пикселей
  });
});
\`\`\`

Что важно знать (по типам Playwright 1.63): анимации в скриншотах по умолчанию отключаются (\`animations: 'disabled'\`), каретка скрывается, \`threshold\` по умолчанию 0,2 в цветовом пространстве YIQ. Отсутствующий эталон по умолчанию создаётся при первом запуске (\`updateSnapshots: 'missing'\`), поэтому в CI разумно поставить \`'none'\`, чтобы забытый эталон был ошибкой; осознанное обновление — флагом \`--update-snapshots\`. В имя эталона по умолчанию входят проект и платформа (например, \`orders-grid-chromium-linux.png\`), потому что рендеринг шрифтов в macOS, Windows и Linux разный. Поэтому эталоны генерируют в том же Docker-образе, что и CI, а не на ноутбуке разработчика.

### Где это применяется на практике

- **Angular-фронтенд поверх нескольких Java или .NET микросервисов** разных команд: Pact ловит переименованные поля и сменившиеся типы до деплоя, без общего стенда.
- **BFF (backend for frontend) и мобильное приложение** как второй потребитель: брокер показывает, какие поля нужны каждому клиенту, и бэкенд может безопасно удалить никем не используемое.
- **Независимые деплои** микрофронтендов и сервисов: \`can-i-deploy\` заменяет ручную координацию «а бэкенд уже выкатил новую версию?».
- **Дизайн-система и UI-kit**: визуальная регрессия на каждый компонент во всех состояниях и темах после каждого обновления зависимостей.
- **5–10 ключевых экранов продукта**: дашборд, большая таблица заказов, форма оформления — скриншот-тесты ловят сломанный CSS, наезжающие элементы, регрессию тёмной темы и не подгрузившийся шрифт.
- **Локализация**: скриншоты с длинными немецкими строками или RTL-языками показывают обрезанный текст, который функциональные тесты не замечают.

## Важные нюансы и подводные камни

- **Pact — это не e2e.** Он проверяет совместимость форматов запросов и ответов, а не бизнес-сценарий целиком. На собеседовании этот вопрос задают почти всегда.
- **Брокер без \`can-i-deploy\`** — контракты ради контрактов: несовместимый деплой никто не остановит.
- **Слишком строгие матчеры** (точные значения вместо \`like\`) делают контракт хрупким, и команда начинает его игнорировать.
- **Публичный API** с неизвестными потребителями не подходит для consumer-driven подхода — нужен provider-driven контракт: OpenAPI и валидация схемы.
- **Provider states нужно реализовать.** Если на бэкенде нет обработчика для \`user 42 exists\`, верификация падает или проверяет пустую базу. Это часть работы команды бэкенда, о которой нужно договориться заранее.
- **Тестируйте настоящий API-клиент.** Если в тесте потребителя вызывать \`fetch\` вручную, а в приложении — \`HttpClient\` с интерсепторами, контракт проверяет не тот код.
- **Контракт — не место для бизнес-логики.** Проверяйте форму данных, а не правила вроде «скидка не больше 30%»: это задача тестов самого бэкенда.
- **Версия = git SHA, а не semver.** Брокеру нужна уникальная версия каждой сборки, иначе матрица совместимости путается.
- **Флакующие скриншоты** без маскирования динамики и фиксации шрифтов быстро приучают команду жать «approve all» — и visual regression перестаёт что-либо ловить.
- **Огромное обновление baseline в одном PR** — тот же «штамп не глядя». Держите набор скриншотов маленьким и осмысленным: дизайн-система плюс 5–10 ключевых экранов.
- **Эталоны с ноутбука разработчика.** Другая ОС — другие шрифты — дифф на каждом пикселе текста. Эталоны генерируют в том же контейнере, что и CI.

**Плюсы:** контракты ловят интеграционные расхождения до деплоя без общего стенда, работают быстро, дают моки и проверку контракта из одного источника и позволяют командам деплоиться независимо; визуальная регрессия ловит класс багов, невидимый для функциональных тестов.
**Минусы:** Pact требует брокера, договорённостей с командой бэкенда и дисциплины \`can-i-deploy\`; не подходит для публичного API; не проверяет бизнес-сценарии. Скриншот-тесты флакуют без строгой фиксации окружения, требуют ручного ревью диффов и хранения эталонов.

## Как это спрашивают на собеседовании

**Главный вывод:** contract testing решает проблему разошедшихся моков — фронтенд описывает ожидания, бэкенд проверяет их в своём CI, а \`can-i-deploy\` не даёт выкатить несовместимую версию. Visual regression сравнивает скриншоты с эталоном и ловит сломанную вёрстку, которую функциональные тесты не видят.

Типичные формулировки: «Как убедиться, что фронт и бэк совместимы, без e2e?», «Что такое consumer-driven contracts и Pact?», «Как вы ловите регрессии в вёрстке?», «Почему у вас зелёные тесты, а прод сломался из-за API?».

Что могут спросить следом:

- *Чем Pact отличается от e2e?* — Pact проверяет только совместимость форматов каждой пары сервисов по отдельности, быстро и без общего стенда; e2e проверяет сценарий через всю систему, но медленно и с флаком.
- *Зачем нужен \`can-i-deploy\`?* — Без него контракт верифицируется, но ничто не мешает выкатить версию, несовместимую с тем, что уже в проде.
- *Почему \`like\`, а не точные значения?* — Точные значения ломают контракт при любой смене тестовых данных; фронтенду важны наличие и тип полей.
- *Что делать с публичным API?* — Provider-driven подход: OpenAPI-схема, валидация и дифф схем на ломающие изменения.
- *Как бороться с флаком скриншотов?* — Docker с одинаковыми шрифтами, замороженное время, детерминированные данные, маскирование динамики, отключённые анимации и разумный порог.

### Ответ на 1 минуту

> Contract testing решает проблему разошедшихся моков: юнит-тесты фронтенда зелёные, потому что мок отвечает по-старому, а реальный API уже изменился. Pact работает consumer-driven: фронтенд в тесте описывает ожидаемый запрос и ответ с матчерами на тип, а не на значение, мой настоящий API-клиент ходит в mock server Pact, и получается pact-файл. Он публикуется в Pact Broker, а бэкенд в своём CI проигрывает эти запросы против реального сервиса с provider states. Поэтому бэкенд не может тихо переименовать или сменить тип нужного мне поля — верификация упадёт до деплоя, без общего e2e-стенда. Обязательный шаг — гейт \`can-i-deploy\`, иначе релиз никто не блокирует. Для публичного API беру OpenAPI и валидацию схемы. Visual regression дополняет это: скриншоты сравниваются с эталоном и ловят сломанный CSS, а флак лечу Docker-окружением, маскированием и замороженным временем.`,
      en: `## In short

Both techniques catch what **ordinary tests can't see**. Contract testing verifies that frontend and backend agree on the same API without standing up the whole system. Visual regression verifies that the UI hasn't visually fallen apart even though every bit of logic still works.

Analogy for contracts: a bridge built from both banks. Waiting for the halves to meet in the middle is end-to-end testing — slow, expensive, and you discover the mismatch at the very end. Instead, both teams check the **drawing of the joint**. Contract testing is that drawing: the frontend writes down what it expects, and the backend proves in its own CI that it delivers exactly that.

Analogy for visual regression: spot-the-difference, except a machine plays it and checks every pixel.

## How it works, step by step (Pact, consumer-driven)

1. The **consumer** (frontend) describes expected requests and responses in its tests: "on \`GET /users/42\` I expect a 200 with \`id\` and \`name\`".
2. That generates a **pact file** — a machine-readable contract. The same expectations double as mocks for the frontend tests.
3. The contract is published to a **Pact Broker** — the shared store of contracts and verification results.
4. The **provider** (backend) **verifies** the contract against its real implementation in its own CI: it replays the described requests and checks the responses.
5. The result: the backend cannot **silently** break a field the frontend needs — its verification goes red. The regression is caught **on the provider side before deploy**, not in prod.
6. A \`can-i-deploy\` gate before release asks the broker: "is the version I'm shipping compatible with everyone who depends on it?" Skip this step and you have contracts but no protection.

## Example

\`\`\`ts
// Consumer (frontend): declare the expected interaction
provider.addInteraction({
  state: 'user 42 exists',                       // provider-side precondition
  uponReceiving: 'a request for user 42',
  withRequest: { method: 'GET', path: '/users/42' },
  willRespondWith: {
    status: 200,
    body: { id: Matchers.like(42), name: Matchers.like('Ada') }, // SHAPE, not value
  },
});
// -> publishes a pact; the provider must verify it in its CI, and
//    'pact-broker can-i-deploy' blocks the release if verification is missing or failing.
\`\`\`

Why this works: \`Matchers.like\` pins the **type and shape**, not a literal value. Otherwise the contract would break on any change of test data, and the team would quickly stop maintaining it.

## Visual regression testing

- A screenshot of a component or page is compared to a baseline pixel by pixel (Chromatic, Percy, Playwright \`toHaveScreenshot\`).
- It catches exactly what functional tests miss: broken CSS, overlapping elements, a dark-theme regression, a font that failed to load. "The button is clickable" stays green even when the button has slid off screen.
- The cost is flakiness: anti-aliasing, fonts, animations and the current date produce false diffs. Fix with masked dynamic regions, pinned viewport and fonts, a pixel threshold, and deterministic data (frozen time, a fixed seed).
- **Recommendation**: adopt visual regression selectively — the design system plus five to ten key screens. Screenshotting the whole app produces a flood of baseline updates that get approved without looking.

## What to say in the interview

> Contract testing solves the drifting-mock problem: unit tests stay green because the mock still answers the old way while the real API has moved on. Pact is consumer-driven: the frontend describes expected requests and responses in its tests, that generates a pact file, the file is published to a Pact Broker, and the backend verifies the contract against its real implementation in its own CI. So the provider can't silently break a field the frontend needs — verification fails before deploy, all without a full end-to-end environment. The mandatory step is the \`can-i-deploy\` gate; without it you have contracts but nothing blocks the release. For a public API with thousands of unknown consumers, consumer-driven doesn't apply — there you use OpenAPI and schema validation. Visual regression complements this: comparing screenshots to a baseline catches broken CSS and overlapping elements that functional tests never see, at the cost of flakiness from fonts and animations.

## Gotchas

- **Pact is not e2e.** It checks contract compatibility, not a whole business scenario. This follow-up always comes.
- **A broker without \`can-i-deploy\`** means contracts for their own sake: nothing stops an incompatible deploy.
- Over-strict **matchers** (exact values instead of \`like\`) make the contract brittle, and the team starts ignoring it.
- For a **public API** with unknown consumers, consumer-driven doesn't apply — you need a provider-driven contract: OpenAPI plus schema validation.
- **Flaky screenshots** without masked dynamics and pinned fonts quickly train the team to hit "approve all" — at which point visual regression catches nothing.
- A huge batch of baseline updates in one PR is the same rubber stamp. Keep the screenshot set small and meaningful.`,
    },
    codeSnippet: `// Consumer (frontend) Pact test — declares the expected interaction
provider.addInteraction({
  state: 'user 42 exists',
  uponReceiving: 'a request for user 42',
  withRequest: { method: 'GET', path: '/users/42' },
  willRespondWith: {
    status: 200,
    body: { id: Matchers.like(42), name: Matchers.like('Ada') }, // shape, not exact value
  },
});
// -> publishes a pact; the provider CI must verify it, and
//    'pact-broker can-i-deploy' gates the release if verification is missing/failing.`,
  },
  {
    id: 'arch-051',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['release-strategy', 'canary', 'semantic-versioning'],
    question: {
      ru: 'Сравните trunk-based, canary, blue-green и feature-branch релизы; как сюда вписываются semver и changesets в монорепо?',
      en: 'Compare trunk-based, canary, blue-green, and feature-branch releases; how do semver and changesets fit in a monorepo?',
    },
    answer: {
      ru: `## В чём суть

В этом вопросе смешаны две **разные оси**, и половина ответа — их развести. Первая ось — **как код попадает в основную ветку**: долгоживущие feature branches и Gitflow против trunk-based. Вторая — **как готовая сборка попадает к пользователям**: blue-green против canary. Это независимые решения: можно работать trunk-based и деплоить blue-green. А semver и changesets — третья тема: как **нумеровать и описывать** выпущенные пакеты, если их много в одном репозитории.

Аналогия для деплоя: canary — буквально канарейка в шахте. Не гоните всю смену вниз, отправьте одну птицу: если с ней что-то не так, вы потеряли птицу, а не смену. Blue-green — две одинаковые сцены в театре: пока играют на одной, вторую готовят, а потом просто переводят свет; не понравилось — переводят обратно.

**Какую проблему решает.** Без продуманной стратегии релиз превращается в лотерею: неделями копятся изменения в отдельных ветках, потом их мучительно сливают («integration hell»), выкатывают всё разом на всех пользователей, а откат занимает час и требует нового деплоя. В монорепозитории добавляется своя боль: какие из 30 пакетов изменились, кому поднять версию и что писать в changelog. Правильные практики делают изменения маленькими, выкатку — постепенной, откат — мгновенным, а версии — предсказуемыми.

## Словарик терминов

- **Ветка (branch) и merge** — параллельная линия разработки в git и её слияние обратно. Trunk (обычно \`main\`) — основная ветка, из которой собирают релизы.
- **Gitflow** — модель ветвления с долгоживущими ветками \`develop\` и \`main\` плюс ветками \`feature/*\`, \`release/*\`, \`hotfix/*\`.
- **Trunk-based development** — все вливают маленькие изменения в \`main\` минимум раз в день-два; короткие ветки на часы допустимы.
- **Feature flag (feature toggle, флаг)** — переключатель в коде или конфиге, который включает фичу без нового деплоя.
- **CI/CD** — непрерывная интеграция (каждое изменение автоматически собирается и тестируется) и непрерывная доставка (готовая сборка автоматически едет в окружения).
- **Деплой vs релиз (deploy vs release)** — деплой доставляет код на серверы, релиз включает фичу пользователям. С флагами это два разных момента.
- **Blue-green deployment** — две одинаковые среды; трафик целиком переключают со старой («blue») на новую («green»).
- **Canary release** — новая версия сначала получает малую долю трафика (1–5%), доля растёт, пока метрики в норме.
- **Blast radius («радиус поражения»)** — сколько пользователей пострадает, если новая версия сломана.
- **Rollback (откат)** — возврат к предыдущей рабочей версии.
- **SLO и SLI** — SLI это измеряемый показатель (доля ошибок, задержка p95), SLO — целевое значение для него («ошибок меньше 0,5%»).
- **Observability (наблюдаемость)** — метрики, логи и трейсы, по которым видно, здорова ли система.
- **Semver (Semantic Versioning)** — схема версий \`MAJOR.MINOR.PATCH\`, где каждая часть несёт смысл для потребителей.
- **Диапазон версий (\`^1.4.0\`, \`~1.4.0\`)** — запись в \`package.json\`, какие версии зависимости подходят.
- **Pre-release** — предварительная версия вида \`2.0.0-beta.1\`.
- **Монорепозиторий (monorepo)** — один git-репозиторий с несколькими пакетами и приложениями.
- **Changeset** — маленький markdown-файл в \`.changeset/\`, где автор PR объявляет, какие пакеты и с каким бампом он изменил; из них потом собирается \`CHANGELOG.md\`.

## Как это работает под капотом

Путь изменения от коммита до пользователя и где действует каждая стратегия:

1. **Интеграция.** Изменение вливается в основную ветку — редко и большими кусками (долгоживущие ветки) или постоянно и маленькими (trunk-based). Чем реже интеграция, тем больше конфликтов копится.
2. **Сборка артефакта.** CI собирает **неизменяемый** артефакт с уникальной версией (Docker-образ или статические файлы с хэшами в именах); по окружениям едет один и тот же артефакт без пересборки.
3. **Деплой.** Артефакт попадает на прод: весь трафик разом с мгновенным возвратом (blue-green) или постепенно под наблюдением метрик (canary).
4. **Релиз.** Фича за флагом после деплоя ещё не видна; флаг включают отдельно — команде, 1% пользователей, всем. Деплой и релиз становятся двумя независимыми, обратимыми действиями.
5. **Наблюдение и откат.** Метрики сравниваются с SLO: проблема в фиче — выключают флаг за секунды, проблема в сборке — возвращают трафик (blue-green) или откатывают canary.
6. **Версионирование пакетов.** Если репозиторий выпускает библиотеки, каждый PR объявляет changeset, а при релизе инструмент вычисляет версии по semver и пишет changelog только затронутых пакетов.

### Feature branches и Gitflow

**Что это.** Каждая фича живёт в своей ветке днями или неделями; в Gitflow есть ещё \`develop\` для накопления фич и \`release/*\` для стабилизации.

\`\`\`text
main     ●───────────────────────────────●  v2.0
develop  ●──●──●────────────●──────●──●──
feature/checkout  └──●──●──●──●──●──┘        3 недели без интеграции
feature/grid        └──●──●──●──●──●──●──┘   конфликты с checkout всплывут только при слиянии
\`\`\`

**Почему болит.** Две ветки три недели меняют одни и те же файлы, и никто не знает о конфликте до слияния. В конце наступает integration hell: огромный merge, неожиданные поломки, заморозка кода перед релизом.

**Когда уместно.** Редкие релизы и версионируемое ПО, которое клиенты ставят себе (коробочный продукт, SDK, мобильное приложение с проверкой в сторе), где одновременно поддерживаются несколько версий. Короткие ветки под pull request на несколько часов — это не Gitflow, они нормально живут и в trunk-based.

### Trunk-based development и feature flags

**Что это.** Все вливают в \`main\` маленькие порции минимум раз в день-два, а незаконченная фича уезжает на прод **выключенной** за флагом. Изоляцию даёт флаг, а не ветка.

\`\`\`ts
// feature-flags.service.ts — флаги приходят с сервера при старте приложения
@Injectable({ providedIn: 'root' })
export class FeatureFlags {
  private readonly flags = signal<Record<string, boolean>>({});
  load(flags: Record<string, boolean>) { this.flags.set(flags); }
  isOn(name: string) { return this.flags()[name] ?? false; }  // неизвестный флаг = выключен
}
\`\`\`

\`\`\`html
@if (flags.isOn('new-checkout')) {
  <app-new-checkout />       <!-- включаем на 1%, потом 10%, потом всех -->
} @else {
  <app-old-checkout />       <!-- старый путь жив — это и есть мгновенный откат -->
}
\`\`\`

**Почему работает.** Конфликты обнаруживаются в тот же день, пока они маленькие, а код всегда в состоянии «можно выкатывать» — фундамент непрерывной доставки. Цена — быстрый CI (каждый коммит в \`main\` проверяется за минуты) и дисциплина: недоделанная фича не должна ломать соседей даже выключенной.

**Как флаг включают «для 10%».** Пользователя детерминированно раскладывают по «корзинам» 0–99 хэшем от имени флага и id пользователя:

\`\`\`js
function fnv1a(str) {                       // простой детерминированный хэш строки
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const bucket = (flag, userId) => fnv1a(\`\${flag}:\${userId}\`) % 100;
const isOn = (flag, userId, percent) => bucket(flag, userId) < percent;

console.log(bucket('new-checkout', 'user-42'));                 // 26
console.log(bucket('new-checkout', 'user-42'));                 // 26 — всегда та же корзина
console.log(isOn('new-checkout', 'user-42', 10), isOn('new-checkout', 'user-42', 50)); // false true
\`\`\`

Корзина зависит только от пользователя и флага, поэтому человек не «мигает» между старым и новым интерфейсом при каждой перезагрузке. На 100 000 пользователей с порогом 10% флаг включился у 10 013, а при расширении до 25% все, кто уже был внутри, внутри и остались. Готовые сервисы (LaunchDarkly, Unleash, ConfigCat, стандарт OpenFeature) делают то же самое плюс таргетинг, аудит и аварийный выключатель.

### Blue-green deployment

**Что это.** Две одинаковые среды. «Blue» обслуживает пользователей, на «green» выкатывают новую версию и прогоняют smoke-тесты. Потом балансировщик или CDN переключают **весь** трафик на green. Blue остаётся тёплой — откат это переключение обратно.

\`\`\`bash
# Статический Angular-фронтенд: две папки-версии и атомарная символическая ссылка
/srv/app/releases/2025-01-14-a1b2c3d   # blue  (сейчас в проде)
/srv/app/releases/2025-01-15-e4f5a6b   # green (новая версия, уже проверена)

ln -sfn /srv/app/releases/2025-01-15-e4f5a6b /srv/app/current   # переключение: nginx отдаёт root /srv/app/current
ln -sfn /srv/app/releases/2025-01-14-a1b2c3d /srv/app/current   # откат: ещё одна команда
\`\`\`

**Плюсы и цена.** Просто, предсказуемо, откат мгновенный. Платите двойной инфраструктурой (для бэкенда это реальные деньги; для статики — почти ничего) и тем, что новая версия сразу получает 100% пользователей.

**Главная ловушка — база данных.** Переключить код назад можно за секунду, а данные уже мигрировали. Поэтому схема БД обязана быть совместимой в обе стороны: старая версия кода должна работать с новой схемой. Это делают по шаблону expand/contract («расширить, потом сузить»):

1. Expand: добавить новую колонку \`full_name\`, не удаляя \`name\`; новая версия пишет в обе.
2. Перенести данные из старой колонки в новую фоновым заданием.
3. Переключить чтение на \`full_name\` и убедиться, что откат больше не нужен.
4. Contract: в **следующем** релизе удалить \`name\`.

### Canary release

**Что это.** Новая версия получает 1–5% трафика. Автоматика сравнивает её метрики (доля ошибок, задержка, Core Web Vitals) с текущей версией и постепенно поднимает долю или откатывает.

\`\`\`yaml
# Argo Rollouts: пошаговая раскатка canary в Kubernetes
strategy:
  canary:
    steps:
      - setWeight: 5
      - pause: { duration: 15m }   # в это время анализ метрик решает: дальше или откат
      - setWeight: 25
      - pause: { duration: 15m }
      - setWeight: 50
      - pause: { duration: 15m }
      # дальше 100%
\`\`\`

**Плюсы и цена.** Ограничивает радиус поражения и ловит проблемы на живом трафике, которые не воспроизводятся на стенде. Требует хорошей наблюдаемости и **автоматического отката по SLO**: если ждать, пока человек посмотрит на дашборд, деградация растянется на часы.

**Особенность фронтенда.** Браузер кэширует \`index.html\`, а чанки с хэшами в именах подгружаются лениво. Пользователь с открытой вкладкой старой версии переходит на ленивый маршрут, а старого чанка на сервере уже нет — в Chrome это ошибка \`Failed to fetch dynamically imported module\`. Поэтому для фронтенда нужны: «липкая» привязка пользователя к версии (cookie), \`Cache-Control: no-cache\` для \`index.html\` и долгий кэш для файлов с хэшами, хранение старых чанков ещё несколько дней после деплоя. Если в Angular-приложении включён Service Worker, \`SwUpdate.versionUpdates\` сообщит событие \`VERSION_READY\`, когда новая версия скачана, а \`SwUpdate.unrecoverable\` — когда старые файлы уже недоступны и нужна перезагрузка.

### Semver: что означает каждая цифра

\`MAJOR.MINOR.PATCH\` — это контракт с теми, кто использует ваш пакет: MAJOR — ломающее изменение, MINOR — новая функциональность без поломок, PATCH — исправление. Проверено на пакете \`semver\`, который использует npm:

\`\`\`js
const semver = require('semver');
semver.inc('1.4.0', 'patch');              // '1.4.1'
semver.inc('1.4.0', 'minor');              // '1.5.0'
semver.inc('1.4.0', 'major');              // '2.0.0'
semver.satisfies('1.5.0', '^1.4.0');       // true  — ^ разрешает minor и patch
semver.satisfies('2.0.0', '^1.4.0');       // false — major уже не подходит
semver.satisfies('1.5.0', '~1.4.0');       // false — ~ разрешает только patch
semver.satisfies('0.3.0', '^0.2.3');       // false — для 0.x ^ ведёт себя как ~
semver.satisfies('2.0.0-beta.2', '>=1.4.0'); // false — pre-release не попадают в обычные диапазоны
semver.inc('2.0.0-beta.0', 'prerelease', 'beta'); // '2.0.0-beta.1'
\`\`\`

Отсюда практическое правило: пока пакет на \`0.x\`, каждое minor-повышение потребители воспринимают как потенциально ломающее.

### Changesets в монорепозитории

**Проблема.** В репозитории 30 пакетов. Какие изменились, на сколько поднять версии, что написать в changelog, какие пакеты зависят от изменённых? Угадывать по коммитам ненадёжно.

**Как работает.** Каждый PR прикладывает changeset — файл, где автор сам объявляет бамп:

\`\`\`text
.changeset/brave-owls-sing.md
---
"@acme/ui": major
---

Remove deprecated \`size="xs"\` from Button
\`\`\`

\`\`\`text
.changeset/tidy-pugs-jam.md
---
"@acme/api-client": patch
---

Fix retry header
\`\`\`

Команда \`npx changeset\` создаёт такой файл интерактивно. В CI \`changeset status --since=main\` завершается с ошибкой (код 1), если пакеты изменены, а changeset нет; для изменений без релиза есть \`changeset add --empty\`. При релизе \`changeset version\` собирает все файлы, поднимает версии, обновляет зависимых и пишет changelog. Результат реального прогона (\`@changesets/cli\` 2.31) на репозитории, где приложение \`@acme/admin-app\` зависит от \`"@acme/ui": "^1.4.0"\` и \`"@acme/api-client": "^2.0.3"\`:

\`\`\`text
@acme/ui          1.4.0 → 2.0.0   CHANGELOG: ### Major Changes — Remove deprecated \`size="xs"\` from Button
@acme/api-client  2.0.3 → 2.0.4   CHANGELOG: ### Patch Changes — Fix retry header
@acme/admin-app   0.9.1 → 0.9.2   зависимости: "@acme/ui": "^2.0.0", "@acme/api-client": "^2.0.4"
                                  CHANGELOG: Updated dependencies — @acme/ui@2.0.0, @acme/api-client@2.0.4
\`\`\`

\`admin-app\` получил patch-бамп, потому что \`2.0.0\` больше не попадает в его диапазон \`^1.4.0\`. В другом прогоне, где \`@acme/ui\` поднимался лишь до \`1.5.0\`, приложение не тронули вовсе: новая версия укладывалась в \`^1.4.0\`. Файлы changesets после \`version\` удаляются, затем \`changeset publish\` публикует пакеты в npm-реестр и ставит git-теги. Обычно всё это автоматизирует \`changesets/action\` в GitHub Actions: он держит открытым PR «Version Packages» и публикует пакеты после его слияния.

Ключевые настройки \`.changeset/config.json\`: \`fixed\` (группы пакетов с общей версией), \`linked\` (синхронизация версий только среди выпускаемых), \`updateInternalDependencies\` (при каком бампе обновлять диапазоны у зависимых), \`ignore\` (пакеты вне версионирования). Побочный плюс: changelog пишет автор в момент изменения, а не кто-то постфактум по commit-сообщениям.

### Одна версия на всех или независимые версии

- **Фиксированная (lockstep)** — один номер на все пакеты. Так живёт сам Angular: \`@angular/core\`, \`common\`, \`router\`, \`forms\` выходят одной версией (здесь 21.1.4). Проще для совместимости, но пакет получает новую версию без изменений в нём.
- **Независимая** — у каждого пакета свой номер. Честнее для потребителей, но нужно следить за матрицей совместимости.
- Оба режима есть в changesets (\`fixed\`), Nx Release и Lerna. Альтернатива changesets — выводить бамп из сообщений коммитов по Conventional Commits (\`feat:\` → minor, \`fix:\` → patch, \`BREAKING CHANGE\` → major) через semantic-release или Nx Release.

### Как выбрать

- **Продуктовая веб-команда с частыми релизами:** trunk-based, короткие PR, feature flags для незаконченных фич.
- **Коробочный продукт или SDK с несколькими поддерживаемыми версиями:** release-ветки (элементы Gitflow) оправданы.
- **Нужен простой и мгновенный откат всей сборки, инфраструктура позволяет дублирование:** blue-green.
- **Большая аудитория, высокая цена ошибки, есть метрики и автоматика:** canary с автоматическим откатом по SLO.
- **Рискованная фича в стабильной сборке:** флаг с процентной раскаткой — по сути canary на уровне фичи, без отдельной инфраструктуры.
- **Монорепо, публикующее библиотеки:** semver плюс changesets (или Conventional Commits); lockstep — для тесно связанных пакетов, независимые версии — для слабо связанных.
- Частая рабочая комбинация: **trunk-based + canary + feature flags** — маленькие изменения, узкая выкатка, откат без передеплоя.

### Где это применяется на практике

- **Enterprise Angular-портал**: trunk-based, каждый коммит на стенд, новая форма заявки за флагом — сначала для своих, потом для одного клиента, потом для всех.
- **Статический фронтенд за CDN**: blue-green переключением указателя на папку новой сборки; файлы старой версии лежат ещё неделю.
- **Высоконагруженный бэкенд в Kubernetes**: canary через Argo Rollouts или service mesh с автоматическим анализом доли ошибок.
- **Монорепо дизайн-системы**: \`@acme/ui\`, \`@acme/icons\`, \`@acme/tokens\` с changesets, PR «Version Packages» и публикацией во внутренний npm-реестр.
- **Любые миграции БД**: expand/contract в два релиза, чтобы откат кода оставался возможным.

## Важные нюансы и подводные камни

- **Trunk-based без флагов и быстрого CI** — это не trunk-based, а сломанный \`main\`, который блокирует всю команду.
- **Забытые feature flags** — технический долг и комбинаторный взрыв: два флага дают 4 пути кода, десять — 1024. Заводите срок жизни флага и его удаление в Definition of Done.
- **Canary без автоматического отката по SLO** почти бесполезен: деградация тянется, пока человек не посмотрит на дашборд.
- **Blue-green и миграции БД.** Схема обязана быть совместимой вперёд и назад, иначе откат технически невозможен — данные уже мигрировали. Классический вопрос на Senior.
- **Деплой vs релиз.** Спросят обязательно; отвечайте через флаги: деплой доставляет код, релиз включает фичу пользователям.
- **Canary на фронтенде особенно коварен.** Закэшированный \`index.html\` и старые чанки смешиваются с новыми; нужны версионированные файлы, правильные заголовки кэша, липкая привязка к версии и хранение старых чанков.
- **Один changeset на несколько пакетов — один текст во всех changelog.** Если в одном файле смешать «добавили DatePicker» и «починили retry», эта строка попадёт в оба changelog. Делайте отдельный changeset на каждое логическое изменение.
- **\`changeset status\` в CI требует git-историю.** Без ветки \`main\` и общей истории он падает с ошибкой вида «Failed to find where HEAD diverged from "main"»; в GitHub Actions нужен \`fetch-depth: 0\`.
- **Флаг — это ещё и тестирование.** Обе ветки кода должны быть покрыты тестами, пока флаг жив, иначе выключение флага в аварии откроет непроверенный путь.

**Плюсы:** trunk-based даёт быструю интеграцию и постоянно готовый к выкатке код; флаги разделяют деплой и релиз и дают откат за секунды; blue-green — простой и мгновенный откат сборки; canary ограничивает радиус поражения; semver и changesets делают версии и changelog предсказуемыми и автоматическими.
**Минусы:** trunk-based требует зрелого CI и дисциплины; флаги копят долг и умножают число путей кода; blue-green удваивает инфраструктуру и упирается в миграции БД; canary требует наблюдаемости и автоматики, а на фронтенде — аккуратной работы с кэшем; changesets добавляют шаг в каждый PR.

## Как это спрашивают на собеседовании

**Главный вывод:** ветвление (Gitflow против trunk-based) и выкатка (blue-green против canary) — независимые оси; рабочая связка для продуктовой команды — trunk-based, флаги и canary с автоматическим откатом. В монорепо версии ведут по semver, а бампы и changelog автоматизируют changesets.

Типичные формулировки: «Какую стратегию ветвления вы используете и почему?», «Чем canary отличается от blue-green?», «Как откатить релиз за минуту?», «Как вы версионируете пакеты в монорепозитории?».

Что могут спросить следом:

- *Чем деплой отличается от релиза?* — Деплой доставляет код на серверы, релиз включает фичу пользователям; флаги позволяют делать это в разные моменты.
- *Почему откат blue-green может не сработать?* — Если миграция БД несовместима со старым кодом; спасает expand/contract в два релиза.
- *Что особенного в canary для SPA?* — Кэш \`index.html\` и ленивые чанки разных версий; нужны липкая привязка, правильные заголовки кэша и хранение старых файлов.
- *Зачем changesets, если есть Conventional Commits?* — Changesets явно объявляет бамп по пакетам и даёт человеческий changelog от автора; коммиты проще, но зависят от дисциплины сообщений.
- *Как не утонуть во флагах?* — Срок жизни, владелец, удаление в Definition of Done и регулярная уборка.

### Ответ на 1 минуту

> Я разделяю две оси. Ветвление: Gitflow с долгоживущими ветками откладывает интеграцию и даёт болезненные конфликты, поэтому для продукта выбираю trunk-based — маленькие изменения в \`main\` каждый день, а незаконченные фичи за feature flags; это требует быстрого CI, зато код всегда готов к выкатке. Выкатка: blue-green — две одинаковые среды и мгновенный откат переключением трафика, но двойная инфраструктура; canary — сначала 1–5% трафика с наблюдением за метриками и автоматическим откатом по SLO. Флаги отделяют деплой от релиза: выключить фичу можно за секунды. В монорепо версии веду по semver, а бампы — через changesets: каждый PR объявляет тип изменения, и релиз сам поднимает версии, зависимых и changelog только затронутых пакетов. Главные грабли — забытые флаги, миграции БД без expand/contract и кэш старых чанков на фронтенде.`,
      en: `## In short

Two **different axes** get mixed up here, and separating them is half the answer. The first is **how code reaches the main branch** (feature branches / Gitflow versus trunk-based). The second is **how a built artifact reaches users** (blue-green versus canary). They're orthogonal: you can be trunk-based and still deploy blue-green.

Analogy for deployment: canary is literally the canary in the coal mine. Don't send the whole shift down — send one bird; if something's wrong you lost a bird, not the shift. Blue-green is two identical theatre stages: while one is playing, the other is being set up, then you simply move the lights across — and move them back if it goes wrong.

## What it's made of

1. **Feature branches / Gitflow** — long-lived branches. Integration is deferred, conflicts pile up, and "integration hell" arrives at the end. Reasonable for infrequent releases and versioned software that customers install.
2. **Trunk-based** — everyone commits to \`main\` in small slices, and unfinished features hide behind **feature flags**. Fast integration and the foundation of CD. It demands strong CI and discipline: isolation comes from a flag, not a branch.
3. **Blue-green** — two identical environments. All traffic switches to "green", and rollback is instant by switching back. Simple and predictable, paid for with double infrastructure.
4. **Canary** — the new version gets **1–5% of traffic**; you watch errors and metrics and ramp up gradually. It limits the blast radius and catches problems on live traffic, but needs good observability and **automatic rollback on SLO breach**.
5. The common working combination: **trunk-based + canary + feature flags** — small changes, narrow rollout, and instant rollback with no redeploy (just switch the flag off).

## Example

\`\`\`ts
// trunk-based: the unfinished feature ships to main TURNED OFF
if (flags.isOn('new-checkout')) {
  renderNewCheckout();          // on for 1% of users, then 10%, then everyone
} else {
  renderOldCheckout();          // the old path stays alive — that's the instant rollback
}
\`\`\`

\`\`\`ts
// .changeset/tidy-pugs-jam.md — every PR declares its own bump
// ---
// "@acme/ui": minor          // added a DatePicker
// "@acme/api-client": patch  // fixed the retry header
// ---
// Add DatePicker; fix retry header
\`\`\`

Why this works: a flag separates **deploy** from **release**. The code is already in production but switched off, so "ship it" and "show it to users" become two independent, reversible actions.

## Semver and changesets in a monorepo

- **Semantic versioning**: MAJOR for a breaking change, MINOR for new functionality, PATCH for a fix. It's a contract with whoever consumes your packages.
- A monorepo raises the question: version everything with **one shared number** or **independently** per package. Shared is simpler to reason about; independent is more honest to consumers.
- **Changesets** answer "what do I bump" deterministically: each PR attaches a changeset file with the bump type and a description, and at release those aggregate into versions and a changelog for **only the affected packages**.
- A side benefit that matters: the changelog is written at change time by the person making the change, rather than reconstructed from commit messages afterwards.

## What to say in the interview

> I separate two axes. Branching: Gitflow with long-lived branches defers integration and produces painful merge conflicts, so for product development I pick trunk-based — small commits to \`main\` with unfinished features behind feature flags; it requires fast CI and discipline but gives continuous integration. Deployment: blue-green means two identical environments with instant rollback by switching traffic — simple, but you pay for double infrastructure; canary rolls out to 1–5% of traffic while watching metrics, which limits the blast radius but needs automatic rollback on SLO breach. I usually combine trunk-based with canary. In a monorepo I keep semver and drive bumps with changesets: each PR declares its change type and the release aggregates that into versions and a changelog for only the affected packages. The big traps are forgotten flags and incompatible DB migrations that make rollback impossible.

## Gotchas

- **Trunk-based without flags and fast CI** isn't trunk-based, it's a broken \`main\` that blocks the whole team.
- **Forgotten feature flags** are tech debt and a combinatorial explosion: two flags means four code paths, ten flags means a thousand. Put a flag's expiry and removal in the Definition of Done.
- **Canary without automatic SLO-based rollback** is pointless: the degradation drags on until a human looks at a dashboard.
- **Blue-green and DB migrations**: the schema must be **forward/backward-compatible**, or rollback is technically impossible because the data already migrated. A classic senior-level follow-up.
- Expect the **deploy vs release** question — answer with flags: deploy delivers the code, release turns the feature on for users.
- Canary is uniquely tricky on the frontend: a cached \`index.html\` can mix old chunks with new ones. You need versioned assets and careful cache headers.`,
    },
  },
  {
    id: 'arch-052',
    category: 'architecture-testing',
    level: 'Medium',
    tags: ['msw', 'http-mocking', 'test-isolation'],
    question: {
      ru: 'Зачем мокать HTTP на сетевом уровне через MSW и как это улучшает изоляцию и устойчивость тестов?',
      en: 'Why mock HTTP at the network layer with MSW, and how does it improve test isolation and robustness?',
    },
    answer: {
      ru: `## В чём суть

Обычный мок подменяет **ваш код**: вы шпионите за \`HttpClient\` или \`fetch\` и, по сути, договариваетесь сами с собой. MSW (Mock Service Worker) подменяет **сеть**: приложение делает настоящий запрос, просто на том конце провода отвечает не сервер, а объявленный вами обработчик (handler). Тест проверяет поведение приложения, а не то, какой метод какого сервиса оно вызвало.

Аналогия: чтобы проверить, как человек разговаривает по телефону, можно вырвать телефон из стены и играть в разговор понарошку — это моки-шпионы. А можно оставить телефон настоящим и посадить на том конце линии актёра — это MSW. Во втором случае вы заодно проверите, что человек **правильно набрал номер**: URL, метод, заголовки, сериализацию тела.

**Какую проблему решает.** Тесты с шпионами на \`HttpClient\` хрупкие и слепые одновременно. Хрупкие — потому что привязаны к реализации: переписали слой данных с одного клиента на другой, добавили интерсептор, поменяли REST на GraphQL — тесты красные, хотя поведение не изменилось. Слепые — потому что ошибку в URL или в формате тела шпион не заметит: он отвечает на любой вызов. А тесты против реального стенда флакуют из-за сети, таймаутов и чужих данных. MSW убирает обе проблемы: сеть «настоящая» для приложения, но полностью под контролем теста.

## Словарик терминов

- **Мок, стаб, шпион (mock, stub, spy)** — подделки зависимостей в тестах: стаб возвращает заготовленный ответ, шпион запоминает, как его вызывали, мок совмещает и то, и другое.
- **MSW (Mock Service Worker)** — библиотека, которая перехватывает HTTP-запросы на сетевом уровне и отвечает на них по вашим правилам; один и тот же код работает в браузере и в Node.
- **Handler (обработчик)** — правило «на такой метод и путь отвечай так»: \`http.get('/api/users/:id', resolver)\`.
- **Resolver** — функция внутри handler, которая получает запрос (\`request\`, \`params\`) и возвращает ответ.
- **\`HttpResponse\`** — класс MSW для ответа: \`HttpResponse.json(...)\`, \`new HttpResponse(null, { status: 500 })\`, \`HttpResponse.error()\` для сетевой ошибки.
- **\`setupServer\` (из \`msw/node\`)** — режим для тестов в Node: подменяет глобальные \`fetch\` и \`XMLHttpRequest\` и модули \`http\`/\`https\`. Настоящий сервер и порт **не** поднимаются.
- **\`setupWorker\` (из \`msw/browser\`)** — режим для браузера: регистрирует Service Worker, который перехватывает запросы страницы.
- **Service Worker** — скрипт, который браузер запускает отдельно от страницы; он может перехватывать сетевые запросы этой страницы.
- **Runtime handler (\`server.use\`)** — временное переопределение handler внутри одного теста.
- **\`server.resetHandlers()\`** — сброс всех временных переопределений к исходному набору.
- **\`onUnhandledRequest\`** — что делать с запросом, для которого нет handler: \`'warn'\` (по умолчанию), \`'error'\`, \`'bypass'\` или своя функция.
- **\`HttpClient\` и backend** — Angular-клиент для HTTP. Сам запросы он не отправляет: это делает backend — \`XMLHttpRequest\` по умолчанию или \`fetch\` при \`withFetch()\`.
- **\`HttpTestingController\`** — штатный Angular-инструмент: подменяет backend, и тест вручную «отвечает» на перехваченные запросы.
- **jsdom** — эмуляция браузерного DOM в Node; в ней Angular-тесты обычно и выполняются под Vitest или Jest.
- **Изоляция тестов (test isolation)** — каждый тест сам готовит окружение и убирает за собой, поэтому результат не зависит от порядка запуска.

## Как это работает под капотом

Что происходит в Node-тесте после \`server.listen()\`:

1. MSW подменяет глобальные \`fetch\` и \`XMLHttpRequest\` и патчит \`http\`/\`https\` своими перехватчиками (библиотека \`@mswjs/interceptors\`). Поэтому код приложения не нужно менять: оно вызывает те же функции, что и в браузере.
2. Приложение делает запрос. Перехватчик не пускает его в сеть, а превращает в стандартный объект \`Request\` — с URL, методом, заголовками и телом.
3. MSW перебирает handlers: сначала временные из \`server.use()\` (последний добавленный — первым), потом исходные из \`setupServer(...)\`. Первый handler, у которого совпали метод и путь и resolver вернул ответ, побеждает.
4. Resolver строит настоящий \`Response\`, и перехватчик отдаёт его приложению так, будто он пришёл из сети. Статус, заголовки, тело, задержка — всё как у настоящего сервера.
5. Если ни один handler не подошёл, срабатывает стратегия \`onUnhandledRequest\`: предупредить и пропустить в реальную сеть (\`warn\`), молча пропустить (\`bypass\`) или напечатать ошибку и завершить запрос ошибкой (\`error\`).
6. В браузере схема та же, но перехватывает Service Worker: он ловит \`fetch\`-события страницы, пересылает запрос в основной поток, где живут handlers, и возвращает ответ. Запросы при этом видны во вкладке Network.

Упрощённо логика выбора ответа выглядит так:

\`\`\`js
function handleRequest(request, runtimeHandlers, initialHandlers, onUnhandledRequest) {
  for (const handler of [...runtimeHandlers, ...initialHandlers]) {
    const match = handler.match(request);                 // метод + путь, достаём :params
    if (!match) continue;
    const response = handler.resolver({ request, params: match.params });
    if (response) return response;                        // первый ответивший побеждает
  }
  return onUnhandledRequest(request);                     // 'warn' | 'error' | 'bypass'
}
\`\`\`

Ключевая мысль: подменяется не ваш сервис, а «провод». Всё, что приложение делает до провода — сборка URL, сериализация тела, заголовки из интерсепторов, — работает по-настоящему и тоже проверяется.

### Пример 1. MSW в чистом Node

\`\`\`js
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('*/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Ada' })),
);
server.listen({ onUnhandledRequest: 'error' });

const r1 = await fetch('http://localhost/api/users/42');
console.log(r1.status, await r1.json());          // 200 { id: '42', name: 'Ada' }

server.use(http.get('*/api/users/:id', () => new HttpResponse(null, { status: 500 })));
const r2 = await fetch('http://localhost/api/users/42');
console.log(r2.status, r2.ok);                    // 500 false

server.resetHandlers();
const r3 = await fetch('http://localhost/api/users/42');
console.log(r3.status, await r3.json());          // 200 { id: '42', name: 'Ada' }

await fetch('http://localhost/api/orders');
// [MSW] Error: intercepted a request without a matching request handler:
//   • GET http://localhost/api/orders
// ...и сам fetch завершается ошибкой
\`\`\`

Три наблюдения. \`params.id\` — строка \`'42'\`, а не число: параметры пути всегда строки. \`server.use\` переопределил ответ, а \`resetHandlers\` вернул исходный. Забытый эндпоинт при стратегии \`'error'\` не утёк в сеть, а стал понятной ошибкой. Звёздочка в \`*/api/...\` значит «любой хост»: в чистом Node нет \`location\`, поэтому относительный путь \`/api/users/:id\` с абсолютным URL запроса **не совпадёт** (проверено — MSW сообщил о необработанном запросе).

### Пример 2. Angular \`HttpClient\` + MSW в Vitest

Так выглядит тест из сниппета под ответом, доведённый до рабочего состояния (проверено на Angular 21.1, Vitest 4, jsdom 27 и MSW 2):

\`\`\`ts
@Injectable({ providedIn: 'root' })
class UserApi {
  private http = inject(HttpClient);
  getUser(id: number) { return this.http.get<{ id: string; name: string }>(\`/api/users/\${id}\`); }
}

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Ada' })),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserApi', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(withFetch())] }));

  it('загружает пользователя', async () => {
    const user = await firstValueFrom(TestBed.inject(UserApi).getUser(42));
    expect(user).toEqual({ id: '42', name: 'Ada' });          // ✓
  });

  it('500 превращается в HttpErrorResponse', async () => {
    server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
    await expect(firstValueFrom(TestBed.inject(UserApi).getUser(1)))
      .rejects.toMatchObject({ status: 500 });                  // ✓
  });
});
\`\`\`

Здесь относительный путь работает: в jsdom есть \`document.baseURI\` (по умолчанию \`http://localhost:3000/\`), и MSW, и \`HttpClient\` разрешают \`/api/...\` относительно него. Тот же тест проходит и без \`withFetch()\`, когда \`HttpClient\` ходит через \`XMLHttpRequest\`, — MSW перехватывает оба способа. Сервис ничего не знает о тесте: настоящий \`HttpClient\`, настоящие интерсепторы, настоящий разбор JSON.

### Пример 3. Проверяем, что приложение отправило

\`\`\`ts
server.use(
  http.put('/api/users/:id', async ({ request, params }) => {
    const body = await request.json();
    console.log(request.method, params.id, request.headers.get('content-type'), body);
    return HttpResponse.json({ ok: true });
  }),
);
await firstValueFrom(api.rename(7, 'Grace'));  // this.http.put(\`/api/users/\${id}\`, { name })
// PUT 7 application/json { name: 'Grace' }
\`\`\`

Handler видит настоящий запрос: метод, параметры пути, заголовки (включая добавленные интерсепторами — например, токен авторизации) и тело. Если сервис по ошибке отправит \`{ fullName }\` вместо \`{ name }\` или забудет \`id\` в URL, это всплывёт здесь. Шпион на \`HttpClient.put\` такой баг не воспроизводит вообще.

### Пример 4. Пограничные случаи одной строкой

\`\`\`ts
// Сетевой сбой (нет связи, CORS): HttpClient вернёт HttpErrorResponse со status 0
server.use(http.get('/api/users/:id', () => HttpResponse.error()));

// Первый запрос — 503, следующий — обычный ответ: проверка retry
server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 503 }), { once: true }));

// Пустой список: проверка empty state
server.use(http.get('/api/orders', () => HttpResponse.json([])));

// «Вечная» загрузка: проверка спиннера и skeleton
server.use(http.get('/api/orders', async () => { await delay('infinite'); }));
\`\`\`

В прогоне с \`{ once: true }\` первый вызов вернул 503, второй — нормального пользователя; \`HttpResponse.error()\` дал \`HttpErrorResponse\` со статусом 0. Каждый сценарий — это handler, а не хрупкая конфигурация шпионов с \`throwError\` и счётчиками вызовов.

### Три способа мокать HTTP в Angular

**Шпион на сервисе или \`HttpClient\`.** Подменяется ваш код: \`vi.spyOn(http, 'get').mockReturnValue(of(user))\`. Быстро и просто, годится для теста компонента, которому всё равно, откуда данные. Минус — тест знает детали реализации и не видит ошибок в URL, теле и интерсепторах.

**\`HttpTestingController\`.** Подменяется backend \`HttpClient\`, тест вручную отвечает на запросы:

\`\`\`ts
TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
const ctrl = TestBed.inject(HttpTestingController);
TestBed.inject(UserApi).getUser(42).subscribe((u) => (result = u));
const req = ctrl.expectOne('/api/users/42');   // req.request.method === 'GET'
req.flush({ id: '42', name: 'Ada' });          // result → { id: '42', name: 'Ada' }
ctrl.verify();                                  // не осталось неотвеченных запросов
\`\`\`

Штатно, синхронно, детерминированно, видит URL и тело. Минус — работает только с \`HttpClient\` и только внутри Angular: не переиспользуется в Storybook, e2e и dev-режиме, а тест управляет каждым запросом вручную.

**MSW.** Подменяется сеть. Тест не управляет запросами, а описывает «мир», в котором приложение живёт. Работает с любым клиентом, а handlers переиспользуются везде.

### Как выбрать

- **Unit-тест логики компонента**, где данные — просто вход: шпион или фейковый сервис, это быстрее всего.
- **Тест API-сервиса или интерсептора**, где важны URL, заголовки, порядок запросов и retry: \`HttpTestingController\` или MSW.
- **Интеграционный тест «компонент + сервисы + HttpClient»**, Storybook и dev-режим без бэкенда: MSW с общим набором handlers.
- Не смешивайте в одном тесте: при \`provideHttpClientTesting()\` запросы до «провода» не доходят — в прогоне MSW не увидел ни одного запроса.

### MSW в браузере и dev-режиме

\`\`\`bash
npx msw init public/   # кладёт mockServiceWorker.js в папку, которую раздаёт dev-сервер
\`\`\`

\`\`\`ts
// main.ts — моки включаются только в dev-сборке с флагом
async function enableMocking() {
  if (!isDevMode() || !environment.mockApi) return;
  const { worker } = await import('./mocks/browser');   // setupWorker(...handlers)
  await worker.start({ onUnhandledRequest: 'bypass' });  // реальные запросы проходят мимо
}
enableMocking().then(() => bootstrapApplication(AppComponent, appConfig));
\`\`\`

Ждать \`worker.start()\` до старта приложения обязательно: иначе первые запросы улетят раньше, чем Service Worker начнёт их перехватывать. Тот же массив handlers импортируют unit-тесты (\`setupServer\`), Storybook (через аддон для MSW) и dev-сборка. В итоге один набор «фейкового бэкенда» на все случаи, и фронтенд разрабатывается без поднятого бэкенда.

### Где это применяется на практике

- **Тесты API-слоя enterprise-приложения**: сервисы, интерсепторы авторизации и обработки ошибок, retry и refresh токена проверяются на настоящем \`HttpClient\`.
- **Сложные экраны с несколькими запросами**: дашборд, который грузит 5 виджетов, — тест описывает ответы всех эндпоинтов и проверяет, что при падении одного остальные работают.
- **Состояния больших таблиц и форм**: пусто, 10 000 строк, ошибка сервера, ошибка валидации 422 — без бэкенда и без хрупких шпионов.
- **Фронтенд обгоняет бэкенд**: API согласован, но не готов — фронтенд пишет handlers по контракту и разрабатывает фичу параллельно.
- **Демо и стабильные скриншот-тесты**: детерминированные данные из handlers делают экраны одинаковыми при каждом запуске.

## Важные нюансы и подводные камни

- **Забыли \`resetHandlers()\` в \`afterEach\`** — переопределения текут между тестами, появляется зависимость от порядка запуска. Самый частый источник флака при работе с MSW.
- **\`onUnhandledRequest: 'bypass'\` в тестах** маскирует забытые эндпоинты: запрос уходит в реальную сеть, и тест становится недетерминированным. В тестах — всегда \`'error'\`; по умолчанию стоит \`'warn'\`, и предупреждение в логе легко пропустить.
- **Handlers расходятся с реальным API.** MSW не проверяет ответы по схеме, поэтому может давать ложную уверенность. Сочетайте с contract testing или генерируйте handlers и типы из OpenAPI.
- **«MSW заменяет e2e?» — нет.** Он убирает бэкенд из уравнения, но настоящую интеграцию с сервером не проверяет.
- **Настройка окружения в Node.** MSW 2 требует Node 18+ и глобальных \`fetch\`, \`Request\`, \`Response\`, \`TextEncoder\`. Классическое «MSW не перехватывает» — это Jest с jsdom-окружением, где этих глобалов нет (лечится, например, окружением \`jest-fixed-jsdom\`); у Vitest с jsdom они на месте. Вышедший в конце сентября 2026 года MSW 3 распространяется только как ES-модули и требует Node 22.12+, при этом базовый API \`http\`, \`HttpResponse\`, \`setupServer\` сохранился.
- **Относительные пути в чистом Node не совпадают.** Без jsdom нет базового URL, поэтому пишите \`*/api/...\` или полный адрес.
- **Запомненный заранее \`fetch\` не перехватывается.** Если библиотека сохранила ссылку на \`globalThis.fetch\` до \`server.listen()\`, её запросы уходят мимо MSW — в проверке такой вызов ушёл в реальную сеть и упал с \`ENOTFOUND\`. Запускайте \`listen()\` в setup-файле до импорта такого кода.
- **Параметры пути — строки.** \`params.id\` равен \`'42'\`; если приложение ждёт число, handler должен вернуть число явно.
- **Слишком «умный» handler** с состоянием и логикой превращается в маленький второй бэкенд, который тоже надо поддерживать и отлаживать. Handler должен быть тупым: вход → заготовленный ответ.
- **Worker-скрипт нужно обновлять.** После обновления пакета MSW заново выполните \`npx msw init\`, иначе версия \`mockServiceWorker.js\` разойдётся с библиотекой.

**Плюсы:** тесты проверяют поведение, а не реализацию, и переживают рефакторинг слоя данных; видны ошибки в URL, заголовках и сериализации; детерминизм без реальной сети; пограничные случаи описываются одной строкой; один набор handlers для тестов, Storybook, e2e и разработки без бэкенда.
**Минусы:** handlers могут разойтись с реальным API; нужна аккуратная настройка окружения и изоляции; интеграционные тесты медленнее чистых unit-тестов со шпионами; не заменяет e2e и contract testing.

## Как это спрашивают на собеседовании

**Главный вывод:** MSW мокает не код, а сеть: приложение делает настоящий запрос, а отвечает handler. Поэтому тесты не зависят от деталей реализации и ловят ошибки в URL и теле, а изоляцию держат \`resetHandlers()\` в \`afterEach\` и \`onUnhandledRequest: 'error'\`.

Типичные формулировки: «Как вы мокаете HTTP в тестах?», «Чем MSW лучше \`HttpTestingController\` или моков \`HttpClient\`?», «Почему тесты ломаются при рефакторинге сервиса, хотя поведение не изменилось?», «Как разрабатывать фронтенд, пока бэкенд не готов?».

Что могут спросить следом:

- *Как MSW перехватывает запросы в Node, если там нет Service Worker?* — Подменяет глобальные \`fetch\`, \`XMLHttpRequest\` и модули \`http\`/\`https\`; порт не открывается.
- *Чем \`server.use\` отличается от handlers в \`setupServer\`?* — \`server.use\` добавляет временные переопределения с приоритетом, \`resetHandlers\` их снимает.
- *Почему \`onUnhandledRequest: 'error'\`?* — Забытый эндпоинт становится понятным падением теста, а не тихим походом в реальную сеть.
- *Когда всё-таки \`HttpTestingController\`?* — Для точных проверок последовательности запросов внутри Angular-сервиса, когда переиспользование handlers не нужно.

### Ответ на 1 минуту

> Обычные моки подменяют \`HttpClient\` или \`fetch\` шпионами, и тест привязывается к реализации: переписали слой данных — тесты красные, хотя поведение то же, а ошибку в URL или теле шпион вообще не заметит. MSW перехватывает запросы на сетевом уровне: в браузере через Service Worker, в Node — подменяя \`fetch\`, \`XMLHttpRequest\` и \`http\`. Приложение делает настоящий вызов, а отвечают объявленные handlers, поэтому проверяется поведение, а заодно URL, заголовки из интерсепторов и сериализация тела. Пограничные случаи — 500, сетевая ошибка, пустой список, вечная загрузка — описываются одной строкой через \`server.use\`. Изоляцию держит \`server.resetHandlers()\` в \`afterEach\`, а \`onUnhandledRequest: 'error'\` не даёт забытому эндпоинту уйти в сеть. Один набор handlers я переиспользую в тестах, Storybook и dev-режиме без бэкенда. Ограничение: MSW не сверяет ответы со схемой, это закрывает contract testing.`,
      en: `## In short

An ordinary mock replaces **your code**: you spy on \`HttpClient\` or \`fetch\` and end up negotiating with yourself. MSW replaces **the network**: the app makes a real request, it's just that the other end of the line is answered by a handler you declared.

Analogy: to test how someone handles a phone call, you could rip the phone out of the wall and act out a pretend conversation — that's spy mocks. Or you could leave the phone real and put an actor on the other end — that's MSW. The second way also verifies they **dialled the right number** (URL, method, headers, body serialization).

## How it works, step by step

1. You declare **handlers**: "for \`GET /api/users/:id\`, respond with this JSON".
2. In tests you start \`setupServer(...handlers)\`; in the browser it's a Service Worker. Interception happens **at the network layer**, not inside your code.
3. The app performs a **real** \`fetch\` or \`HttpClient\` call. It has no idea it's running in a test environment.
4. MSW catches the request and answers per the handler. The test doesn't know **how** the app fetched the data — it asserts **behavior**, not implementation. So moving from axios to fetch, or REST to GraphQL, doesn't turn tests red.
5. \`server.resetHandlers()\` after each test clears temporary overrides so tests don't leak into one another.
6. The same handler set is reused across **unit tests, component tests and Storybook, e2e, and dev mode** — you can develop with no backend running at all.

## Example

\`\`\`ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // catch forgotten endpoints
afterEach(() => server.resetHandlers());   // isolation: overrides don't leak onward
afterAll(() => server.close());

it('renders an error state on 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... the app makes a REAL request; the component renders the error branch
});
\`\`\`

Why this works: \`onUnhandledRequest: 'error'\` is the single most useful setting. It turns "we forgot to mock that endpoint" from a silent leak into the real network into an obvious test failure. And \`server.use(...)\` inside a test overrides the response for that test only.

## What it buys you in isolation and robustness

- **Determinism**: no real network hop, so no flakiness from latency, timeouts or an unavailable staging box.
- **Isolation**: resetting handlers in \`afterEach\` guarantees the suite passes in any order.
- **Edge cases in one line**: 500, timeout, empty array, slow response, partial failure — all expressed as a handler rather than a brittle spy configuration.
- **An honest client-side contract check**: a wrong URL or badly serialized body simply won't match the handler. With spy mocks that class of bug can't even be reproduced.

## What to say in the interview

> Ordinary mocks stub \`HttpClient\` or \`fetch\` with spies, which couples the test to implementation details: rewrite the data layer from axios to fetch or REST to GraphQL and the tests go red even though behavior didn't change. MSW intercepts at the network layer — a Service Worker in the browser, Node-level interception in tests. The app makes a real call and declared handlers answer it, so you assert behavior rather than implementation, and you also catch URL and body-serialization mistakes. One handler set is reused across unit tests, Storybook, e2e and backend-free dev mode. Isolation rests on \`server.resetHandlers()\` in \`afterEach\`, and \`onUnhandledRequest: 'error'\` stops a forgotten endpoint quietly reaching the real network. One important limitation: MSW doesn't validate responses against a schema, so handlers can drift from the real API — that's what contract testing covers.

## Gotchas

- **Forgetting \`resetHandlers()\` in \`afterEach\`** — state leaks between tests and you get order dependence. The most common source of flakiness with MSW.
- **\`onUnhandledRequest: 'bypass'\`** hides forgotten endpoints: the request escapes to the real network and the test becomes non-deterministic. In tests always use \`'error'\`.
- **Handlers drifting from the real API** — MSW doesn't schema-check responses, so it can give false confidence. Pair it with contract testing or generate mocks from OpenAPI.
- They'll ask "does MSW replace e2e?" No. It removes the backend from the equation but doesn't verify real integration.
- In Node you need the right setup for your runtime (fetch/undici) — bad init is the classic "MSW isn't intercepting".
- An over-clever stateful handler full of logic becomes a second little backend that you now also have to maintain and debug.`,
    },
    codeSnippet: `import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // catch forgotten endpoints
afterEach(() => server.resetHandlers());   // isolation: no leakage between tests
afterAll(() => server.close());

it('renders an error state on 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... app makes a REAL request; component shows the error path
});`,
  },
  {
    id: 'arch-053',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['flaky-tests', 'signals-testing', 'test-isolation'],
    question: {
      ru: 'Как тестировать сигнальные/zoneless-компоненты и системно бороть flaky-тесты?',
      en: 'How do you test signal-based/zoneless components and systematically tackle flaky tests?',
    },
    answer: {
      ru: `## В чём суть

В zoneless-режиме больше нет Zone.js, которая раньше «магически» замечала любое асинхронное действие и сама запускала проверку изменений. Теперь Angular узнаёт об изменениях только от сигналов, событий шаблона и явных вызовов. В тестах из этого следует одно правило: **значение сигнала меняется сразу, а DOM — позже**: когда отработает планировщик (\`await fixture.whenStable()\`) или когда вы явно скажете «перерисуй» (\`fixture.detectChanges()\`). Вторая половина вопроса — flaky-тесты, которые то проходят, то падают без изменений в коде; их не терпят и не ретраят, а системно устраняют причины.

Аналогия: раньше в офисе сидел секретарь (Zone.js), который слышал каждый чих и сам бежал переписывать доску. Его уволили. Теперь сотрудник (сигнал) сам сообщает дежурному (планировщику): «у меня изменилось», и дежурный перерисует доску (DOM) при ближайшей возможности — но не в ту же секунду. В тесте вы либо дожидаетесь дежурного, либо требуете перерисовать прямо сейчас. Флакующий тест — пожарная сигнализация, которая воет каждый раз, когда жаришь котлеты: через неделю на неё перестают реагировать, и настоящий пожар проходит незамеченным.

**Какую проблему решает.** Тесты, написанные «под Zone.js», в zoneless-проекте ведут себя неожиданно: \`fakeAsync\` падает с ошибкой, проверка DOM видит старое значение, эффект «не срабатывает». Понимание того, когда именно обновляется DOM и выполняются эффекты, делает тесты детерминированными. А системная борьба с флаком возвращает доверие к CI: красный прогон снова означает баг, а не «просто перезапусти».

## Словарик терминов

- **Zone.js** — библиотека, которая патчит \`setTimeout\`, промисы и события браузера, чтобы Angular знал «что-то асинхронное закончилось» и запускал проверку изменений.
- **Zoneless** — режим Angular без Zone.js: проверку изменений запускают сигналы, события шаблона, \`markForCheck\` и \`setInput\`. В Angular 21 \`TestBed\` по умолчанию работает в zoneless-режиме.
- **Change detection (проверка изменений, CD)** — проход Angular по компонентам: вычислить выражения шаблона и обновить DOM там, где значения изменились.
- **Планировщик (scheduler)** — часть Angular, которая получает уведомление «что-то изменилось» и откладывает проверку изменений: ставит \`setTimeout\` и \`requestAnimationFrame\`, срабатывает то, что наступит раньше.
- **Сигнал (\`signal\`)** — реактивная переменная: \`count()\` читает значение, \`count.set(5)\` меняет его и уведомляет всех зависящих.
- **\`computed\`** — производный сигнал, значение которого вычисляется из других сигналов: лениво (только при чтении) и с кэшированием.
- **\`effect\`** — функция, которая перезапускается при изменении прочитанных в ней сигналов; нужна для побочных действий (запись в \`localStorage\`, лог).
- **Glitch-free** — свойство сигналов: никто не увидит «промежуточное» несогласованное состояние, когда один источник уже обновлён, а другой ещё нет.
- **\`TestBed\` и \`ComponentFixture\`** — тестовая среда Angular и обёртка над созданным в ней компонентом (\`fixture.nativeElement\`, \`fixture.componentInstance\`, \`fixture.componentRef\`).
- **\`fixture.detectChanges()\`** — синхронно запустить проверку изменений прямо сейчас.
- **\`fixture.whenStable()\`** — промис, который выполнится, когда у приложения не останется незавершённых задач, включая запланированную проверку изменений.
- **\`TestBed.tick()\`** — синхронно выполнить отложенную работу: эффекты и проверку изменений. Заменил \`TestBed.flushEffects()\`, который с Angular 20 помечен как устаревший.
- **\`fakeAsync\` / \`tick\`** — «виртуальное время» Angular для Zone.js-тестов. Без Zone.js не работает.
- **Fake timers (\`vi.useFakeTimers\`)** — подменённые таймеры Vitest: время движется только по команде теста.
- **Flaky-тест** — тест, который на одном и том же коде то проходит, то падает.
- **Shuffle и seed** — запуск тестов в случайном порядке; seed (зерно) позволяет повторить тот же «случайный» порядок.
- **Карантин (quarantine)** — временное исключение флакующего теста из блокирующего прогона с тикетом, владельцем и сроком починки.

## Как это работает под капотом

Что происходит в zoneless-тесте, когда вы меняете сигнал:

1. \`count.set(5)\` синхронно записывает новое значение и помечает «грязными» всех потребителей: шаблон компонента, \`computed\`, эффекты. Поэтому \`count()\` сразу возвращает 5.
2. Шаблон, читающий сигнал, уведомляет планировщик. Планировщик не перерисовывает сразу, а откладывает проверку изменений до ближайшего \`setTimeout\` или кадра анимации и регистрирует «незавершённую задачу». Поэтому в этот момент \`fixture.isStable()\` возвращает \`false\`, а DOM ещё старый.
3. В zoneless-режиме \`ComponentFixture\` по умолчанию в режиме autoDetect: тестовый компонент подключён к приложению и обновляется планировщиком, как в настоящем приложении. Поэтому \`await fixture.whenStable()\` дожидается запланированного прохода, и после него DOM актуален.
4. \`fixture.detectChanges()\` не ждёт: он синхронно вызывает \`appRef.tick()\` для всех тестовых вью, а затем в dev-режиме повторный проход-проверку \`checkNoChanges\`.
5. Во время прохода сначала выполняются корневые эффекты (созданные в сервисах), затем обновляются вью; эффекты компонента выполняются вместе с проверкой его вью. Несколько \`set\` подряд до прохода дают **один** запуск эффекта с последним значением.
6. Если состояние поменяли без уведомления (обычное поле класса вместо сигнала), планировщик ничего не узнает: \`whenStable()\` не обновит DOM, а \`detectChanges()\` в dev-режиме бросит \`NG0100: ExpressionChangedAfterItHasBeenCheckedError\`. Тест прямо сообщает: компонент не готов к zoneless.

Так выглядит \`detectChanges\` в исходниках \`@angular/core/testing\` 21 (сокращённо):

\`\`\`js
detectChanges(checkNoChanges = true) {
  if (this.zonelessEnabled) {
    this._testAppRef.includeAllTestViews = true;
    this._appRef.tick();                       // эффекты + проверка всех тестовых вью
    this._testAppRef.includeAllTestViews = false;
  } else {
    this._ngZone.run(() => {                   // старый путь с Zone.js
      this.rootEffectScheduler.flush();
      this.changeDetectorRef.detectChanges();
      this.checkNoChanges();
    });
  }
}
\`\`\`

А \`TestBed.tick()\` (и устаревший \`TestBed.flushEffects()\`, который просто вызывает его) — это тот же \`appRef.tick()\` по всем тестовым вью.

### Пример 1. Сигнал синхронен, DOM — нет

\`\`\`ts
@Component({
  selector: 'app-counter',
  template: \`<span>{{ count() }}</span><b>{{ double() }}</b>\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CounterComponent {
  count = signal(0);
  double = computed(() => this.count() * 2);
}

it('обновляет вью после изменения сигнала', async () => {
  const fixture = TestBed.createComponent(CounterComponent);
  fixture.nativeElement.textContent;              // ""   — ещё ни одного прохода
  fixture.detectChanges();
  fixture.nativeElement.textContent;              // "00"
  fixture.componentInstance.count.set(5);
  fixture.componentInstance.count();              // 5    — значение уже новое
  fixture.nativeElement.textContent;              // "00" — DOM ещё старый
  fixture.isStable();                             // false — проход запланирован
  await fixture.whenStable();
  fixture.nativeElement.textContent;              // "510" — планировщик отработал
  fixture.componentInstance.count.set(7);
  fixture.detectChanges();
  fixture.nativeElement.textContent;              // "714" — явный синхронный проход
});
\`\`\`

Значения в комментариях получены прогоном в Vitest 4 на Angular 21.1. Две проверки в тесте из сниппета под ответом проверяют **разные вещи** — состояние и отрисовку; именно на их смешении и ловят: «сигнал же синхронный, почему в DOM старое значение?». Оба способа обновить DOM рабочие: \`await whenStable()\` ближе к реальному приложению, \`detectChanges()\` — синхронный и явный.

### Пример 2. Сигнальные входы: только через \`setInput\`

\`\`\`ts
@Component({ selector: 'app-price', template: \`{{ label() }}\` })
class PriceComponent {
  amount = input(0);
  label = computed(() => \`\${this.amount().toFixed(2)} ₽\`);
}

const fixture = TestBed.createComponent(PriceComponent);
await fixture.whenStable();                        // "0.00 ₽"
fixture.componentRef.setInput('amount', 1990);     // как будто родитель передал [amount]="1990"
await fixture.whenStable();                        // "1990.00 ₽"
fixture.componentInstance.amount.set(5);           // TypeError: ...amount.set is not a function
\`\`\`

\`input()\` создаёт сигнал только для чтения: у него нет \`set\`, менять его может лишь родитель. В тесте роль родителя играет \`fixture.componentRef.setInput(...)\`: он записывает значение, помечает компонент для проверки и уведомляет планировщик.

### Пример 3. \`computed\`: лениво, с кэшем и без промежуточных состояний

\`\`\`ts
const first = signal('Ada');
const last = signal('Lovelace');
let runs = 0;
const full = computed(() => { runs++; return \`\${first()} \${last()}\`; });

runs;                        // 0 — пока никто не читал, ничего не вычислено
full(); runs;                // "Ada Lovelace", 1
first.set('Grace'); last.set('Hopper');
runs;                        // 1 — изменения не пересчитали computed
full(); runs;                // "Grace Hopper", 2 — один пересчёт на оба изменения
full(); runs;                // "Grace Hopper", 2 — повторное чтение из кэша
\`\`\`

Промежуточного значения «Grace Lovelace» не существует: пересчёт происходит при чтении, когда оба источника уже обновлены. Пытаться поймать его в тесте бессмысленно — это и есть glitch-free.

### Пример 4. Эффекты: \`TestBed.tick()\` вместо надежды на удачу

\`\`\`ts
@Injectable({ providedIn: 'root' })
class CartStore {
  items = signal<string[]>([]);
  count = computed(() => this.items().length);
  constructor() {
    effect(() => localStorage.setItem('cart', JSON.stringify(this.items())));
  }
  add(item: string) { this.items.update((list) => [...list, item]); }
}

it('сохраняет корзину', () => {
  const store = TestBed.inject(CartStore);
  store.add('apple');
  expect(store.count()).toBe(1);                         // computed — сразу
  localStorage.getItem('cart');                          // null — эффект ещё не выполнялся
  TestBed.tick();
  expect(localStorage.getItem('cart')).toBe('["apple"]'); // ✓
});
\`\`\`

Эффект не выполняется синхронно в момент \`set\`: он ждёт ближайшего прохода. Ассерт до \`TestBed.tick()\` упадёт или, хуже, случайно пройдёт, если проход успел случиться. С эффектами компонентов то же самое: эффект с логом значения после \`fixture.detectChanges()\` записал \`effect 0\`, а после двух \`set(1)\`, \`set(2)\` и \`TestBed.tick()\` — только \`effect 2\`. Эффекты батчатся, промежуточная единица в лог не попала. Сниппет под ответом использует \`TestBed.flushEffects()\` — он работает, но с Angular 20 помечен устаревшим; новый код пишут через \`TestBed.tick()\`.

### Пример 5. Таймеры без Zone.js

\`\`\`ts
fakeAsync(() => tick(10))();
// Error: zone-testing.js is needed for the fakeAsync() test helper but could not be found.
\`\`\`

В типах Angular 21 у \`fakeAsync\`, \`tick\` и \`flush\` прямо написано: требуют Zone.js и не работают с Vitest-раннером. В zoneless-тестах время контролируют таймеры Vitest:

\`\`\`ts
@Component({ selector: 'app-search', template: \`<p>{{ status() }}</p>\` })
class SearchComponent {
  status = signal('idle');
  query(q: string) {
    this.status.set('typing');
    setTimeout(() => this.status.set('searching ' + q), 300);   // имитация debounce
  }
}

it('ищет через 300 мс', () => {
  vi.useFakeTimers();
  const fixture = TestBed.createComponent(SearchComponent);
  fixture.componentInstance.query('ng');
  fixture.detectChanges();      // "typing"
  vi.advanceTimersByTime(299);
  fixture.detectChanges();      // "typing"
  vi.advanceTimersByTime(1);
  fixture.detectChanges();      // "searching ng"
  vi.useRealTimers();
});
\`\`\`

Ловушка: планировщик Angular сам использует таймеры. С включёнными fake timers \`await fixture.whenStable()\` не выполнится, пока вы не продвинете время (в прогоне промис оставался в ожидании, а после \`await vi.advanceTimersByTimeAsync(20)\` выполнился). Поэтому с fake timers либо используют синхронный \`detectChanges()\`, либо двигают время асинхронными методами \`vi.advanceTimersByTimeAsync\` и \`vi.runAllTimersAsync\`.

### Откуда берётся flaky и как его лечить

**1. Время и асинхронность.** Настоящие \`setTimeout\`, \`Date.now()\`, анимации, debounce. Лечение — fake timers и замороженные часы:

\`\`\`ts
vi.useFakeTimers();
vi.setSystemTime(new Date('2025-03-01T12:00:00Z'));
isOverdue(new Date('2025-02-28T00:00:00Z'));   // true
isOverdue(new Date('2025-03-02T00:00:00Z'));   // false — завтра тест не сломается
\`\`\`

**2. Порядок запуска и общее состояние.** Глобальные синглтоны, несброшенные моки, \`localStorage\`, общий DOM. Angular пересоздаёт \`TestBed\` для каждого теста, но не чистит браузерные хранилища: в следующем тесте новый \`CartStore\` начал с пустой корзиной, а \`localStorage.getItem('cart')\` всё ещё вернул \`["apple"]\`. Проверяется случайным порядком:

\`\`\`ts
const cart: string[] = [];                      // общее состояние на уровне модуля
it('starts empty', () => { expect(cart).toEqual([]); });
it('adds an item', () => { cart.push('apple'); expect(cart).toEqual(['apple']); });
\`\`\`

\`\`\`text
vitest run                                         → 2 passed
vitest run --sequence.shuffle --sequence.seed=1    → 2 passed
vitest run --sequence.shuffle --sequence.seed=3    → 1 failed: starts empty
\`\`\`

В обычном порядке всё зелёное, а один из случайных порядков выдаёт скрытую зависимость. Seed из лога позволяет воспроизвести падение. Лечение — каждый тест сам готовит данные и убирает за собой в \`afterEach\`: \`localStorage.clear()\`, \`vi.restoreAllMocks()\`, свежие объекты вместо общих. В Jest аналог — \`--randomize\`, в Jasmine случайный порядок включён по умолчанию.

**3. Сеть.** Реальные запросы, недоступный стенд, недетерминированный порядок ответов. Лечение — MSW или \`HttpTestingController\`: ответы и их порядок задаёт тест.

**4. Хрупкие ожидания.** \`await sleep(500)\` в надежде, что «успеет»: на быстром ноутбуке хватает, на загруженном CI-раннере — нет. Ждут не время, а условие:

\`\`\`ts
// ❌ угадываем время
await new Promise((r) => setTimeout(r, 500));
expect(list.children.length).toBe(3);

// ✅ ждём условие (опрос до таймаута)
await vi.waitFor(() => expect(list.children.length).toBe(3));
await expect.poll(() => list.children.length).toBe(3);
// Playwright: await expect(page.getByRole('row')).toHaveCount(3) — ждёт автоматически
\`\`\`

**5. Случайность и окружение.** \`Math.random()\`, генерация id, часовой пояс и локаль раннера, размер окна. Лечение — фиксированный seed, фиксированные \`TZ\` и локаль в CI, явный viewport.

### Системный процесс, а не героизм

1. **Обнаружить.** CI должен считать флак: Playwright помечает тест, прошедший со второй попытки, как \`flaky\`, а опция \`failOnFlakyTests\` (\`--fail-on-flaky-tests\`) роняет такой прогон. Статистика падений по тестам показывает «хронических» виновников.
2. **Воспроизвести.** Прогнать подозреваемый тест много раз (\`--repeat-each=50\` в Playwright, опция \`repeats\` у теста в Vitest), в случайном порядке с seed, под нагрузкой.
3. **Изолировать.** Поставить в карантин: тест не блокирует CI, но у него есть тикет, владелец и срок. Карантин без срока — это просто удалённый тест.
4. **Починить причину** из списка выше: время, общее состояние, сеть, ожидания, окружение.
5. **Предотвратить.** Прогон в случайном порядке как постоянная настройка, запрет \`sleep\` в ревью и линтере, детерминированные данные и фабрики тестовых объектов.

\`retries: 3\` в CI — не лекарство: он рисует зелёную галочку поверх настоящей гонки, которая доедет до прода. Ретрай — индикатор проблемы, а не её решение.

### Где это применяется на практике

- **Миграция enterprise-приложения на zoneless**: тесты, которые падают с \`NG0100\` после \`detectChanges()\`, указывают на компоненты, меняющие обычные поля без сигналов и \`markForCheck\`.
- **Сигнальные сторы** (NgRx SignalStore или свои сервисы на \`signal\`/\`computed\`/\`effect\`): \`computed\` проверяют сразу, эффекты — после \`TestBed.tick()\`.
- **Поиск с debounce, автосохранение форм, таймауты сессии**: fake timers Vitest вместо \`fakeAsync\`.
- **Большие гриды и дашборды** с асинхронной загрузкой: MSW для данных, \`whenStable()\` или \`vi.waitFor\` для отрисовки, без \`sleep\`.
- **Большой CI с тысячами тестов**: случайный порядок, учёт флака, карантин с владельцами и \`failOnFlakyTests\` для e2e.

## Важные нюансы и подводные камни

- **«Сигнал синхронный, значит и DOM обновился» — нет.** Значение обновилось сразу, отрисовка требует \`await fixture.whenStable()\` или \`detectChanges()\`. Самая частая ошибка на zoneless.
- **«В zoneless-тесте DOM сам никогда не обновится» — тоже неверно.** В Angular 21 фикстура в zoneless-режиме по умолчанию в autoDetect: после уведомления от сигнала планировщик обновит DOM, и \`whenStable()\` этого дождётся. Отключить это нельзя: \`autoDetectChanges(false)\` бросает «Cannot set autoDetect to false with zoneless change detection».
- **Ассерт до \`TestBed.tick()\` или \`flushEffects()\`** — эффект ещё не выполнился, тест падает или, хуже, случайно проходит.
- **Попытка поймать промежуточное значение \`computed\`** — его не существует: цепочка вычисляется лениво и glitch-free.
- **\`fakeAsync\` и \`tick\` в zoneless-проекте** падают с «zone-testing.js is needed»: это API Zone.js. Используйте fake timers Vitest и помните, что с ними \`whenStable()\` ждёт продвижения времени.
- **Изменение обычного поля без сигнала.** \`whenStable()\` его не отрисует, а \`detectChanges()\` бросит \`NG0100\` (у OnPush-компонента DOM молча останется старым). Чинить нужно компонент, а не тест.
- **\`sleep(500)\` вместо \`waitFor\`** — на медленном CI-раннере тест упадёт, на быстром пройдёт. Классический флак.
- **\`retries: 3\` как «лекарство»** — зелёный CI поверх реальной гонки. Ретрай показывает проблему, а не решает её.
- **Тесты, которые проходят только в определённом порядке,** почти всегда означают общее состояние. Проверяется одним прогоном с \`--sequence.shuffle\`, и лучше узнать об этом самому, чем на собеседовании.
- **Сброс \`TestBed\` между тестами зависит от глобального \`afterEach\`.** Angular-сборщик тестов настраивает это сам; в самодельной конфигурации Vitest без \`globals: true\` второй тест падает с «Cannot configure the test module when the test module has already been instantiated» — проверено.

**Плюсы:** zoneless-тесты честнее отражают продакшен-поведение и сразу показывают компоненты, которые меняют состояние без уведомления; сигналы и \`computed\` тестируются как обычные значения, без \`TestBed\`; системная работа с флаком возвращает доверие к CI и экономит часы перезапусков.
**Минусы:** привычные \`fakeAsync\` и \`tick\` не работают, тесты с таймерами нужно переписывать; нужно помнить, что DOM и эффекты обновляются асинхронно; карантин и учёт флака требуют процесса и дисциплины; полное устранение флака в e2e дорого.

## Как это спрашивают на собеседовании

**Главный вывод:** в zoneless сигналы меняются синхронно, а DOM и эффекты — на ближайшем проходе планировщика: его дожидаются через \`await fixture.whenStable()\` или запускают сразу через \`fixture.detectChanges()\` и \`TestBed.tick()\`; время контролируют fake timers Vitest, а не \`fakeAsync\`. Флак лечат устранением причин — время, общее состояние, сеть, ожидания, окружение — а не ретраями.

Типичные формулировки: «Как тестировать компоненты на сигналах без Zone.js?», «Почему после \`set\` в DOM старое значение?», «Как тестировать \`effect\`?», «Как вы боретесь с нестабильными тестами?».

Что могут спросить следом:

- *Чем \`whenStable()\` отличается от \`detectChanges()\` в zoneless?* — \`whenStable()\` ждёт запланированный планировщиком проход, как в реальном приложении; \`detectChanges()\` запускает проход синхронно и добавляет проверку \`checkNoChanges\`.
- *Почему не работает \`fakeAsync\`?* — Он реализован поверх Zone.js; в zoneless-проекте на Vitest используют \`vi.useFakeTimers()\`.
- *Что заменило \`TestBed.flushEffects()\`?* — \`TestBed.tick()\`: выполняет эффекты и проверку изменений; \`flushEffects\` устарел с Angular 20.
- *Как найти тест, зависящий от порядка?* — Прогнать в случайном порядке с seed (\`--sequence.shuffle\`, в Jest \`--randomize\`) и воспроизвести падение тем же seed.
- *Почему не включить ретраи?* — Ретрай прячет гонку; правильно — карантин с владельцем и починка причины.

### Ответ на 1 минуту

> В zoneless нет Zone.js, которая сама запускала проверку изменений, поэтому в тестах я развожу состояние и отрисовку. Сигналы синхронны: \`count.set(5)\` и \`count()\` работают сразу, а \`computed\` ленивый, кэшируется и glitch-free. DOM обновляется на ближайшем проходе планировщика — я дожидаюсь его через \`await fixture.whenStable()\` или запускаю сразу \`fixture.detectChanges()\`. Входы задаю через \`setInput\`, эффекты прогоняю \`TestBed.tick()\` — он заменил устаревший \`flushEffects\`. \`fakeAsync\` без Zone.js не работает, поэтому время контролирую fake timers Vitest. С флаком борюсь системно: источники — время, общее состояние между тестами, сеть, \`sleep\` вместо ожидания условия и окружение. Лечение — fake timers и замороженные часы, изоляция с прогоном в случайном порядке, MSW вместо реальной сети и \`waitFor\`. Флакующие тесты ставлю в карантин с владельцем и чиню причину, потому что ретраи лишь маскируют гонку.`,
      en: `## In short

In zoneless mode there's no Zone.js to "magically" notice every async action and kick off change detection. So one thing changes in tests: **the value updates immediately, but the DOM updates only when you explicitly ask**.

Analogy: the office used to have a secretary (Zone.js) who heard every sneeze and ran to rewrite the whiteboard. They've been let go. The employee (the signal) still knows exactly what changed about them, but the whiteboard (the DOM) now gets redrawn on a schedule — and in a test there is no schedule, so you say "redraw" by hand via \`detectChanges()\`.

## How it works, step by step

1. **Signals are synchronous**: \`count.set(1); expect(count()).toBe(1)\` works with no TestBed at all. It's just a value in a box.
2. **The render won't update itself**: after a change, call \`fixture.detectChanges()\` or \`await fixture.whenStable()\` — the zone hook that used to do it for you is gone.
3. **\`computed\` is lazy and memoized**: it only evaluates on read. And it's glitch-free — change two source signals in a row and nobody ever observes the inconsistent intermediate value, so don't try to assert on one.
4. **\`effect()\` runs in a reactive context and not instantly**. To stop the assertion firing before the effect, call \`TestBed.flushEffects()\` explicitly (or \`tick()\` inside \`fakeAsync\`).
5. **Timers** — \`fakeAsync\` + \`tick()\`; **microtasks and promises** — \`await fixture.whenStable()\`.

## Example

\`\`\`ts
it('updates the view after a signal change (zoneless)', () => {
  const fixture = TestBed.createComponent(CounterComponent);
  fixture.detectChanges();                       // initial render
  fixture.componentInstance.count.set(5);        // the signal is synchronous...
  expect(fixture.componentInstance.count()).toBe(5);
  fixture.detectChanges();                       // ...but the DOM needs an explicit CD
  expect(fixture.nativeElement.textContent).toContain('5');
});

it('flushes effects deterministically', () => {
  const fixture = TestBed.createComponent(Cmp);
  fixture.componentInstance.value.set(1);
  TestBed.flushEffects();                        // run effects now, no implicit timing
  expect(logSpy).toHaveBeenCalledWith(1);
});
\`\`\`

Why this works: the two assertions in the first test check **different things** — state and rendering. Conflating them is exactly the trap: "the signal is synchronous, so why does the DOM still show the old value?"

## Where flakiness comes from and how to fight it systematically

A flaky test is a smoke alarm that screams every time you fry something. Within a week nobody reacts to it — and the real fire goes unnoticed. So flakes get fixed, not tolerated. Four sources:

1. **Time and async**: real \`setTimeout\`, \`Date.now()\`, animations. Cure: \`fakeAsync\` with \`tick()\`, fake timers, a frozen clock.
2. **Order and shared state**: global singletons, un-reset mocks, localStorage, a shared DOM. Every test must set itself up and clean up after itself: \`afterEach\` reset, a fresh TestBed.
3. **Network races**: real requests and non-deterministic response ordering. Cure: MSW or \`HttpTestingController\`.
4. **Brittle waits**: \`sleep(500)\` and hoping it's enough. Use \`waitFor\` on the actual condition.

Systematically: **isolation by default** — a randomized run (\`--shuffle\`) must be green; **quarantine and tracking** of flaky tests instead of blind retries; **deterministic data** — a fixed seed and frozen time.

## What to say in the interview

> In zoneless there's no Zone.js triggering change detection for you, so in tests I separate two things: signals are synchronous and read back immediately — \`count.set(1)\` then asserting \`count()\` works even without TestBed — whereas the DOM only updates after an explicit \`fixture.detectChanges()\` or \`await fixture.whenStable()\`. \`computed\` is lazy, memoized and glitch-free, so intermediate values are never observable. Effects don't run instantly — you need \`TestBed.flushEffects()\` or \`tick()\` inside \`fakeAsync\`, otherwise the assertion fires before the effect. On flakiness I work systematically: the four sources are time, state shared between tests, network races, and \`sleep\` instead of \`waitFor\`. The fixes are fake timers, full isolation verified by a randomized run order, MSW instead of the real network, and waiting on conditions. Flaky tests go into quarantine and I fix the cause, because \`retries: 3\` in CI only masks a real race.

## Gotchas

- **"The signal is synchronous, so the DOM updated too"** — no. The value updated immediately; rendering needs \`detectChanges()\`. The most common zoneless mistake.
- **Asserting before \`flushEffects()\`** — the effect hasn't run yet, so the test fails, or worse, passes by luck.
- Trying to **catch an intermediate \`computed\` value** — there isn't one: the chain evaluates glitch-free.
- **\`sleep(500)\` instead of \`waitFor\`** — fails on a slow CI runner, passes on a fast one. Textbook flakiness.
- **\`retries: 3\` as a "cure"** for flakiness: a green CI sitting on top of a real race that ships to prod. A retry is a symptom report, not a fix.
- Tests that only pass in a particular order almost always mean shared state. One \`--shuffle\` run proves it, and it's better to find that out yourself than in an interview.`,
    },
    codeSnippet: `it('updates the view after a signal change (zoneless)', () => {
  const fixture = TestBed.createComponent(CounterComponent);
  fixture.detectChanges();                       // initial render
  fixture.componentInstance.count.set(5);        // signal is synchronous...
  expect(fixture.componentInstance.count()).toBe(5);
  fixture.detectChanges();                        // ...but the DOM needs an explicit CD
  expect(fixture.nativeElement.textContent).toContain('5');
});

it('flushes effects deterministically', () => {
  const fixture = TestBed.createComponent(Cmp);
  fixture.componentInstance.value.set(1);
  TestBed.flushEffects();                          // run effects now, no implicit timing
  expect(logSpy).toHaveBeenCalledWith(1);
});`,
  },
];
