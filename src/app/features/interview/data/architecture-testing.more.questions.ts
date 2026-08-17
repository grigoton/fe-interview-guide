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
      ru: `## Коротко

Гексагональная архитектура («порты и адаптеры») — это способ **держать бизнес-правила отдельно от всего, что можно заменить**: UI, HTTP, localStorage. Домен ничего не знает ни про Angular, ни про сеть: он объявляет интерфейсы (**порты**), а всё внешнее подключается к ним как **адаптеры**.

Аналогия: чайник и розетка. Чайнику всё равно, откуда ток — ТЭЦ, генератор или солнечная панель. Он знает только **форму вилки**. Форма вилки — это порт, электростанция — адаптер. Поменяли источник энергии — чайник переделывать не надо.

## Из чего состоит

1. **Domain** — сущности, value-objects, правила вроде «заказ не может быть пустым». Чистый TypeScript: ни Angular, ни RxJS, ни \`HttpClient\`.
2. **Application (use-cases)** — сценарии-оркестраторы. \`PlaceOrderUseCase\` зависит от **порта** — интерфейса \`OrderRepository\`, а не от \`HttpClient\`.
3. **Infrastructure (adapters)** — реализации портов: \`HttpOrderRepository\`, \`LocalStorageCartRepository\`.
4. **Presentation** — компоненты и сторы, которые дёргают use-cases и показывают результат.

**Куда смотрят зависимости:** всегда **внутрь, к домену**. Домен объявляет интерфейс репозитория, инфраструктура его реализует, DI связывает их при старте. Это и есть **dependency inversion**: внешние слои зависят от абстракций, придуманных внутренними, а не наоборот.

## Пример

\`\`\`ts
// domain + application: ни одного импорта из Angular
export interface OrderRepository { save(o: Order): Promise<void>; }

export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}   // зависимость от ПОРТА
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}

// тест бизнес-правила: без TestBed, без HTTP, миллисекунды
it('не даёт оформить пустой заказ', async () => {
  const saved: Order[] = [];
  const fake: OrderRepository = { save: async (o) => { saved.push(o); } };
  await expect(new PlaceOrderUseCase(fake).exec(emptyOrder)).rejects.toThrow(EmptyOrderError);
  expect(saved).toHaveLength(0);
});
\`\`\`

Почему так: тест ничего не знает про HTTP и Angular — вместо репозитория подсунули обычный объект. Переезд с REST на GraphQL = новый адаптер, домен и этот тест не трогаем. И HTTP-DTO не «протекают» в шаблоны: наружу выходят доменные объекты.

## Когда оправдано, а когда вредно

- **Оправдано**: биллинг, страхование, трейдинг — там, где правил больше, чем экранов, продукт живёт годами и источников данных несколько.
- **Вредно**: CRUD из пяти форм, витрина, MVP. Слои превращаются в тонны маппинга DTO↔domain ради нуля бизнес-правил.
- **Компромисс, который стоит назвать**: начните с одного слоя доменных сервисов без мапперов и вводите порты **точечно** — только там, где инфраструктура реально меняется или где логику больно тестировать через TestBed.

## Что сказать на собеседовании

> Гексагональная архитектура изолирует домен от деталей доставки. В центре — сущности и бизнес-правила на чистом TypeScript, вокруг — use-cases, которые зависят от портов-интерфейсов, а не от \`HttpClient\`; конкретные адаптеры вроде \`HttpOrderRepository\` реализуют эти интерфейсы и подключаются через DI. Все зависимости направлены внутрь — это dependency inversion: домен диктует контракт, инфраструктура под него подстраивается. Выигрыш: бизнес-логика тестируется без TestBed за миллисекунды, переход с REST на GraphQL — это новый адаптер, а HTTP-DTO не протекают в шаблоны. Цена — лишние слои и маппинг, поэтому на CRUD из пяти форм это оверинжиниринг. Я применяю такое на доменно-сложных продуктах — биллинг, страхование, трейдинг. Главный риск — анемичная модель: сущности пустые, вся логика в сервисах, и получается процедурный код в дорогой обёртке.

## Ловушки

- **Анемичный домен** — сущности как «мешки данных», логика в сервисах. Слои формально есть, пользы ноль.
- **Маппинг ради маппинга**: DTO↔domain в обе стороны на каждый экран съедает больше времени, чем экономит.
- Спросят следом: «чем порт отличается от адаптера?» — порт это интерфейс, объявленный **внутри**; адаптер — реализация **снаружи**.
- Спросят: «где живут RxJS и сигналы?» — в presentation и application; домен остаётся синхронным и чистым.
- Команда без опыта DDD проводит границы не там, и неправильные слои хуже плоской структуры: рефакторить дороже.
- Не путайте с папками по типу файла (\`services/\`, \`models/\`): гексагон — про **направление зависимостей**, а не про имена папок.`,
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
      ru: `## Коротко

BFF — это **маленький бэкенд, который принадлежит фронтенду** и стоит между клиентом и микросервисами. Он ходит по сервисам вместо браузера, склеивает ответы в один и отдаёт ровно то, что рисует экран.

Аналогия: официант. Вы не бегаете сами на кухню, в бар и к кондитеру — говорите одному человеку, он собирает всё и приносит одним подносом. А для детского столика есть свой официант со своим меню — это и есть «свой BFF на каждый тип клиента»: web, iOS, Android.

## Как это работает по шагам

1. Клиент делает **один** запрос под конкретный экран: \`GET /bff/order-page/42\`.
2. BFF проверяет сессию. У web-BFF она лежит в **httpOnly-cookie**; BFF меняет её на внутренний access-token — браузер этот токен вообще не видит (**token handler pattern**).
3. BFF **агрегирует**: параллельно дёргает orders, users, shipping. Три round-trip'а происходят внутри дата-центра, а не по мобильной сети.
4. BFF делает **shape transformation**: выбрасывает лишние поля, переименовывает, склеивает имя и фамилию, переводит копейки в рубли. Внутренняя доменная модель не утекает в клиент.
5. По пути BFF централизует retry, circuit-breaker и кэш — клиенту это писать не нужно.

## Пример

\`\`\`ts
// BFF: один экран — один запрос
app.get('/bff/order-page/:id', async (req, res) => {
  const id = req.params.id;
  const token = await sessions.toAccessToken(req.cookies.session); // httpOnly

  const [order, user, delivery] = await Promise.all([   // агрегация, параллельно
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

Почему так: браузер сделал один запрос вместо трёх, получил готовые к рендеру поля и ни разу не увидел access-token — он остался между BFF и сервисами. Без BFF всё это писал бы клиент: агрегацию, маппинг, обработку частичных отказов.

## Trade-offs — что назвать честно

- ✅ Меньше round-trips (особенно заметно на 3G), тоньше клиент, лучше безопасность за счёт token-handler pattern.
- ❌ **Ещё один деплой-юнит**, свой мониторинг и команда-владелец. Владеть должен фронтенд, иначе BFF превращается в обычный бэкенд с очередью задач.
- ❌ Риск «толстого» BFF: в него незаметно переезжает бизнес-логика, которой место в доменных сервисах.
- ❌ Свой BFF на каждый клиент → **дрейф логики** между web и mobile. GraphQL или федерация BFF частично лечат это.
- **Когда не надо**: один web-клиент со стабильными контрактами. Тогда хватает хорошо спроектированного API-gateway, а BFF — только операционные расходы.

## Что сказать на собеседовании

> BFF — отдельный бэкенд под конкретный тип клиента, принадлежащий фронтенд-команде. Он решает проблемы прямых вызовов микросервисов: over- и under-fetching, N+1 round-trips на медленной сети, утечку внутренней доменной модели в клиент, CORS и дублирование агрегации в браузере. BFF агрегирует несколько вызовов в один ответ под экран, делает shape transformation и централизует retry, circuit-breaker и кэш. Плюс безопасность: web-BFF держит сессию в httpOnly-cookie и меняет её на внутренние токены, так что access-token браузеру не достаётся — это token handler pattern. Цена — ещё один деплой-юнит с владельцем, риск превратить BFF в толстый оркестратор с бизнес-логикой и дрейф логики между BFF разных платформ. Если клиент один и контракты стабильны, я предпочту API-gateway; BFF окупается при нескольких платформах с разными потребностями в данных.

## Ловушки

- **«BFF — это API Gateway?»** Нет. Gateway один на всех и занимается маршрутизацией, авторизацией, rate-limit. BFF свой на каждый клиент и знает про **экраны**.
- BFF **не отменяет авторизацию** в самих сервисах: он не граница доверия, а удобство. Проверки должны остаться и внутри.
- Без таймаута на каждый upstream один медленный сервис держит весь экран. Нужны таймауты + деградация до частичного ответа.
- BFF легко становится single point of failure — считайте его продакшн-сервисом со своими SLO и алертами.
- Спросят: «а бизнес-логику туда можно?» Ответ — только логику представления (склейка, форматирование); доменные правила остаются в сервисах.
- Три BFF на три платформы без общей библиотеки = три места, где надо править один и тот же баг.`,
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
      ru: `## Коротко

Обработка ошибок в SPA — это **три этажа защиты**: глобальный перехватчик, чтобы ни одна ошибка не потерялась молча; HTTP-интерсептор, чтобы централизованно разбирать 401/5xx и сеть; и границы ошибок, чтобы падение одного виджета не уносило всю страницу.

Аналогия: электрощиток в квартире. Замкнуло в ванной — выбивает **автомат на ванную**, а не весь дом; свет на кухне продолжает гореть (это error boundary). Общий счётчик записывает событие (это глобальный \`ErrorHandler\` и Sentry). А если линия постоянно коротит, разумно её вообще отключить и не щёлкать автоматом каждые пять секунд (это circuit breaker).

## Как это работает по шагам

1. **Глобальный \`ErrorHandler\`** (Angular) ловит все непойманные синхронные и RxJS-ошибки. Это единая точка: залогировать в Sentry, показать один общий toast. Но он **не локализует** сбой — упавший компонент сам себя не огораживает.
2. **HTTP-интерсептор** разбирает сетевой слой: 401 (refresh или logout), 403, 5xx, обрыв сети и retry с backoff для идемпотентных запросов. Так HTTP-ошибки не смешиваются с багами кода.
3. **Границы ошибок**. В React это \`componentDidCatch\` и \`<ErrorBoundary>\`, изолирующие поддерево. В Angular встроенных нет: паттерн собирают из \`@defer (error)\`, обёртки с локальным \`ErrorHandler\` в провайдерах компонента или перехвата ошибки на уровне роутера.
4. **Экран решает, как деградировать**: показать плейсхолдер, кнопку «повторить», старые данные из кэша — вместо белого экрана.

## Пример

\`\`\`ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService), log = inject(LogService);
  return next(req).pipe(
    retry({
      count: req.method === 'GET' ? 2 : 0,                  // ретраим ТОЛЬКО идемпотентное
      delay: (_, i) => timer(300 * 2 ** i + Math.random() * 100), // backoff + jitter
    }),
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401) auth.logout();
      log.capture(e);                    // никогда не глотаем молча
      return throwError(() => e);        // отдаём дальше — экран сам решит, как деградировать
    }),
  );
};

// Angular @defer как лёгкая граница ошибок для поддерева:
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }
\`\`\`

Почему так: \`count: 0\` для POST — не перестраховка, а защита от **двойных заказов**; повторять неидемпотентный запрос можно только с idempotency-key. \`jitter\` (случайная добавка к задержке) нужен, чтобы тысяча вкладок не пришла к упавшему серверу одновременно.

## Принципы устойчивости

- **Fail soft, не «упала вся страница»**: ошибка в виджете погоды не должна ронять дашборд — деградируйте до плейсхолдера.
- Различайте **ожидаемые** ошибки (валидация, 404 — это нормальный доменный поток) и **неожиданные** (баг → ErrorHandler + алерт разработчику). Пользователю никогда не показываем stack-trace.
- **Circuit breaker** на флапающий бэкенд: после N ошибок подряд временно отдаём кэш или фолбэк и перестаём долбить сервис — иначе клиенты добивают то, что и так лежит.
- **Конкретная рекомендация**: маленькому приложению хватает глобального \`ErrorHandler\` + интерсептора. Полноценные границы и circuit breaker внедряйте, когда на экране много независимых виджетов и падение одного не должно стоить всей страницы.

## Что сказать на собеседовании

> Я строю обработку ошибок тремя слоями. Глобальный \`ErrorHandler\` — единая точка логирования в Sentry и показа toast, он ловит всё непойманное, но не локализует сбой. HTTP-интерсептор централизованно разбирает 401 с refresh или logout, 403, 5xx и сетевые обрывы, и делает retry с экспоненциальным backoff и jitter — **только для идемпотентных запросов**, иначе повтор POST без idempotency-key даёт двойные заказы. Третий слой — границы ошибок: в React это \`componentDidCatch\`, в Angular встроенных нет, и я собираю их из \`@defer\` с блоком \`@error\` или локального \`ErrorHandler\` в провайдерах компонента. Принцип — fail soft: упавший виджет деградирует до плейсхолдера, а не роняет дашборд. Ожидаемые ошибки вроде валидации и 404 идут доменным потоком, неожиданные — в алерт. На флапающий бэкенд ставлю circuit breaker: после N ошибок отдаю кэш вместо запросов.

## Ловушки

- **Глобальный \`catchError\`, который всё проглатывает** — тихие баги, которых никто никогда не увидит. Логируйте всегда, даже когда показываете фолбэк.
- **Toast на каждую ошибку фонового поллинга** — спам, после которого пользователь перестаёт читать сообщения. Дедуплицируйте и не шумите про фон.
- **ErrorHandler, который сам бросает исключение** → бесконечный цикл и повешенный браузер.
- Спросят: «а в Angular есть error boundaries?» Правильный ответ — **встроенных нет**, есть \`@defer (error)\` и ручные обёртки.
- Retry на POST без ключа идемпотентности — классический продовый инцидент с дублями.
- Забыть про \`unhandledrejection\` и ошибки внутри \`effect\`/подписок: они мимо \`try/catch\` и легко теряются.`,
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
      ru: `## Коротко

Observability фронтенда — это умение ответить на вопрос «что сейчас происходит у реальных пользователей» без того, чтобы просить их прислать скриншот. Собирается из трёх вещей: **ошибки**, **RUM** (как быстро работает у живых людей) и **трейсы** (полный путь запроса от кнопки до базы).

Аналогия: посылка с трек-номером. Каждый курьер отмечает свой этап под **одним и тем же номером**, поэтому видно, где именно она застряла. Такой номер в вебе — заголовок \`traceparent\`: браузер его выдаёт, бэкенд продолжает. А source maps — это ключ к шифру: без них отчёт об ошибке приходит на языке минификатора (\`a.b is not a function\`) и не читается.

## Из чего состоит

1. **Errors** (Sentry/Bugsnag): непойманные исключения, \`unhandledrejection\`, ошибки фреймворка. Группируются по fingerprint и привязываются к **релизу**, чтобы видеть, какой деплой всё сломал.
2. **RUM (Real User Monitoring)**: настоящие **Core Web Vitals** — LCP, INP, CLS — с живых устройств. Смотреть надо **перцентили, в первую очередь p75**, а не среднее, и сегментировать по устройству, гео и релизу. Lighthouse — это лаборатория, RUM — реальность.
3. **Tracing**: браузер открывает span на \`fetch\`, прокидывает заголовок \`traceparent\` (W3C Trace Context / OpenTelemetry), бэкенд продолжает тот же трейс. Так «медленный LCP» превращается в «медленный конкретный downstream-сервис».
4. **Source maps** — критичная деталь. Минифицированный stack-trace бесполезен. Карты **загружаются в Sentry на шаге CI** и **не публикуются на прод** (иначе вы просто раздаёте исходники). Привязка идёт по \`release\` + \`dist\`: разошлись версии — символикация ломается и вы снова читаете \`a.b\`.

## Пример

\`\`\`ts
Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                    // ДОЛЖЕН совпадать с загруженными source maps
  tracesSampleRate: 0.15,                 // 15% трейсов — иначе счёт улетит в космос
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//],  // traceparent шлём только на свой бэкенд
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                     // вычищаем PII ДО отправки из браузера
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});

// шаг CI, наружу не публикуется:
// sentry-cli sourcemaps upload --release <GIT_SHA> ./dist
\`\`\`

Почему так: \`release\` связывает три мира — ошибки, метрики и загруженные карты. \`tracePropagationTargets\` не даёт улететь вашему \`traceparent\` на чужие домены. \`ignoreErrors\` выкидывает мусор от расширений браузера, без которого дашборд просто нечитаем.

## На что алертить

- На **регрессию p75 INP/LCP между релизами** и на всплеск error-rate — а не на каждую единичную ошибку. Единичные ошибки есть всегда, они не будят человека ночью.
- Алерт должен указывать на **релиз**: «после деплоя abc123 p75 LCP вырос с 2.1 до 3.4 с» — это сразу и диагноз, и решение (rollback).
- Полезный минимум: error-rate по релизу, p75 трёх Core Web Vitals по релизу, доля неуспешных ключевых запросов.

## Что сказать на собеседовании

> На фронтенде я собираю три сигнала. Ошибки в Sentry — непойманные исключения и \`unhandledrejection\`, сгруппированные по fingerprint и привязанные к релизу. RUM — реальные Core Web Vitals LCP, INP и CLS по перцентилям, обязательно p75, а не среднее, с сегментацией по устройству, гео и релизу; Lighthouse при этом остаётся лабораторным инструментом. И распределённые трейсы: браузер стартует span на \`fetch\` и прокидывает \`traceparent\` по W3C Trace Context, бэкенд продолжает тот же трейс, и медленный LCP отслеживается до конкретного downstream-сервиса. Критичная деталь — source maps: их грузят в Sentry на шаге CI и не публикуют на прод, иначе раздаёшь исходники, а привязка идёт по \`release\`, иначе символикация ломается. Из практики: чистить PII в \`beforeSend\`, держать \`tracesSampleRate\` около 0.1–0.2 ради счёта, и алертить на регрессию p75 по релизу.

## Ловушки

- **PII-утечки**: Sentry по умолчанию шлёт URL, иногда тела запросов. Без scrubbing в \`beforeSend\` это прямой конфликт с GDPR.
- **100% трейсов на проде** = огромный счёт. \`tracesSampleRate\` 0.1–0.2 плюс хвостовое семплирование ошибок.
- **Шум**: ошибки расширений и ботов (\`ResizeObserver loop\`, \`Script error.\`) забивают дашборд. Лечится \`ignoreErrors\` и \`denyUrls\`.
- **Quota / rate limiting**: при сторме ошибок провайдер начинает их резать, и реальная проблема тонет именно в тот момент, когда она важнее всего.
- Спросят разницу **лаборатория vs поле**: Lighthouse детерминирован и ловит регрессии в CI, RUM показывает, как оно у людей на дешёвом Android.
- \`release\` не совпал с загруженными картами — стеки снова минифицированные. Всегда берите один и тот же git SHA и в сборке, и в загрузке карт.
- Среднее вместо перцентиля прячет боль: p50 может быть отличным, а p75 — катастрофой.`,
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
      ru: `## Коротко

Производительность никогда не падает разом — она **сползает по чуть-чуть**: +10 КБ тут, +1 зависимость там, и через полгода приложение грузится вдвое дольше, а виноватого коммита нет. Performance budget — это **жёсткий потолок** (вес бандла, LCP, TBT), нарушение которого **роняет CI**, то есть регрессия видна в PR, а не в проде через месяц.

Аналогия: весы на стойке регистрации. Никто не набирает лишние 8 кг одним свитером — набирают по футболке. Поэтому весы стоят **до посадки**, а не в самолёте: перевес обнаруживают там, где его ещё дёшево исправить.

## Как это работает по шагам

1. **Bundle budgets** — первый и самый дешёвый уровень: быстрые, детерминированные, без флака. В Angular это секция \`budgets\` в \`angular.json\`: \`maximumError\` на initial-бандл и на компонентные стили. Ловит классику «случайно затащил moment.js вместе с локалями».
2. **Lighthouse CI** — второй уровень, уже про метрики. LHCI на каждый PR поднимает превью-сборку и меряет реальные показатели.
3. LHCI гоняет прогон **несколько раз и берёт медиану**, потому что Lighthouse шумный.
4. Результат сравнивается с бюджетом из \`lighthouserc.js\` через \`assertions\`, где каждая метрика помечена \`error\` (роняет сборку) или \`warn\` (только предупреждает).
5. Бюджет **калибруют от текущего значения + небольшой запас** и ужесточают постепенно — это называется ratchet. Потолок «с потолка» либо ничего не ловит, либо его отключают в первый же спринт.

## Пример

\`\`\`ts
// angular.json — жёсткий бюджет по весу, роняет сборку
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumError": "6kb" }
]

// lighthouserc.js — бюджеты по метрикам в CI
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },                  // медиана: Lighthouse шумный
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

Почему так: ассерты стоят **на конкретных метриках**, а не на общем performance-score. Со score можно «компенсировать» просевший LCP выросшим CLS и не заметить деградацию. А \`warn\` на нестабильной метрике — способ не превратить CI в источник ложных падений.

## Лаборатория и поле

- **Лаборатория (LHCI в CI)** — детерминированное измерение при фиксированном throttling CPU и сети. Её работа — ловить **регрессию между коммитами**, а не предсказывать реальные цифры.
- **Поле (RUM в проде)** — p75 у живых пользователей. Её работа — показывать **реальность**: медленный Android, 3G, холодный кэш.
- Нужны обе: лаборатория блокирует плохой PR, RUM говорит, что вообще стоит оптимизировать.
- **Конкретная рекомендация**: лендингу достаточно bundle budget — он бесплатный и не флачит. LHCI окупается на продуктовых SPA с командой и историей регрессий.

## Что сказать на собеседовании

> Производительность деградирует постепенно, поэтому нужен бюджет — жёсткий потолок, нарушение которого роняет CI и делает регрессию видимой в PR, а не в проде через месяц. Я строю два уровня. Первый — bundle budgets: в Angular это секция \`budgets\` в \`angular.json\` с \`maximumError\` на initial-бандл и стили; быстро, детерминированно, ловит случайно затащенную библиотеку. Второй — Lighthouse CI на каждый PR с ассертами на конкретные метрики: \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\`, а не на общий score, иначе просадку одной метрики маскирует рост другой. Lighthouse шумный, поэтому \`numberOfRuns\` с медианой и \`warn\` вместо \`error\` на нестабильных метриках. Лаборатория в CI ловит регрессии, а тренды я смотрю по RUM в проде. Бюджет калибрую от текущего значения и ужесточаю постепенно.

## Ловушки

- **Флаки-падения**: на шумном общем CI-раннере Lighthouse гуляет на ±5–10 баллов. Лечится медианой из N прогонов, выделенным раннером и \`warn\` на нестабильных метриках. Иначе команда быстро научится «перезапускать до зелёного».
- **Бюджет «на отвал»**: слишком щедрый ничего не ловит, слишком жёсткий отключают. Ratchet от текущих значений — единственный рабочий путь.
- **Только performance-score, без per-metric ассертов** — падение LCP спрячется за ростом чего-то другого.
- Спросят разницу **lab vs field**: Lighthouse это лаборатория, Core Web Vitals из CrUX/RUM — это поле, и цифры законно расходятся.
- Бюджет только на initial-бандл, без lazy-чанков: вес просто переезжает в ленивые модули, а метрики всё равно страдают.
- Гонять LHCI на localhost без throttling — цифры красивые, пользы ноль.`,
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
      ru: `## Коротко

Component-Driven Development — это сборка интерфейса **снизу вверх**: сначала изолированные «глупые» компоненты, потом их композиция в экраны. Storybook — каталог, в котором компонент живёт **отдельно от приложения, роутинга и бэкенда**, а каждое его состояние (loading, error, empty, RTL, тёмная тема) записано как отдельная story.

Аналогия: шоурум мебели. Диван стоит на подиуме, а не в чужой квартире: его можно обойти, посмотреть во всех обивках, проверить, раскладывается ли — не переезжая при этом в квартиру целиком. Design tokens в этой аналогии — каталог цветов RAL: маляр не смешивает краску на глаз, он берёт «RAL 5010», и стены во всех проектах компании одинаковые.

## Как это работает по шагам

1. Компонент пишут **изолированно**, принимающим все данные через входы, без обращений к сервисам и роутеру.
2. Каждое состояние оформляют **отдельной story**: не «кнопка», а «кнопка primary», «кнопка в загрузке», «кнопка disabled». Стало видно то, что в приложении воспроизводится с трудом.
3. Storybook рендерит эти stories без бэкенда — значит верстка и дизайн идут **параллельно** с разработкой API, данные просто мокаются пропсами.
4. Каталог сам по себе становится **живой визуальной документацией** — в отличие от скриншотов в Confluence, которые устарели в день публикации.
5. Поверх stories бесплатно навешиваются проверки: **visual regression** (Chromatic/Percy) и **accessibility** (a11y-аддон на базе axe).
6. **Interaction tests** через \`play\`-функции запускаются прямо на story: клик, ввод, проверка — без поднятия полного e2e.

## Пример

\`\`\`ts
// button.stories.ts — каждое состояние это отдельная story
export default { title: 'UI/Button', component: ButtonComponent };

export const Primary  = { args: { label: 'Сохранить', variant: 'primary' } };
export const Loading  = { args: { label: 'Сохранить', loading: true } };
export const Disabled = { args: { label: 'Сохранить', disabled: true } };

// interaction test прямо на story — без полного e2e
export const Submits = {
  args: { label: 'Сохранить' },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole('button', { name: 'Сохранить' });
    await userEvent.click(btn);
    await expect(onSubmit).toHaveBeenCalled();
  },
};

// tokens.json -> Style Dictionary -> CSS custom properties
// { "color": { "brand": { "value": "#0057b8" } } }
// :root { --color-brand: #0057b8; }  и компонент использует var(--color-brand)
\`\`\`

Почему так: состояние \`Loading\` в приложении надо ловить сетевой задержкой, а в Storybook это один аргумент. Именно поэтому редкие состояния перестают быть непротестированными.

## Design tokens

- Токен — **единый источник истины** для дизайн-значения: цвет, отступ, типографика, радиус. Хранится как платформо-независимые данные (JSON).
- Из этих данных **генерируются** CSS custom properties, SCSS-переменные, иногда нативные платформы — обычно через Style Dictionary.
- Смысл: разорвать связь «значение захардкожено внутри компонента». Ребрендинг и смена темы становятся правкой **в одном месте**, а тёмная тема — просто переопределением набора токенов.
- Без дисциплины система разваливается: нужен lint, запрещающий хардкод hex прямо в стилях компонента.

## Что сказать на собеседовании

> Component-driven development — это сборка UI снизу вверх: сначала изолированные компоненты, потом композиция. Storybook даёт каталог, где компонент рендерится в изоляции от приложения, роутинга и бэкенда, а каждое состояние — loading, error, empty, RTL, тёмная тема — оформлено отдельной story. Это даёт параллельную работу без готового API, живую визуальную документацию вместо устаревшего Confluence, а также базу для visual regression через Chromatic или Percy и для проверок доступности через a11y-аддон с axe. Интеракции можно тестировать прямо на story \`play\`-функциями, без полного e2e. Design tokens — единый источник истины для цветов, отступов и типографики в виде JSON, из которого Style Dictionary генерит CSS-переменные, так что ребрендинг и тёмная тема — правка в одном месте. Главный риск — дрейф: если не гонять Storybook в CI, stories превращаются в мёртвую документацию.

## Ловушки

- **Дрейф stories**: их не запускают в CI, они ломаются и незаметно устаревают. Storybook обязан быть частью пайплайна, иначе это мёртвая документация.
- Бизнес-моки в stories **расходятся с реальным API** — компонент красиво выглядит на выдуманных данных и падает на настоящих.
- Токены без линта → «magic colors» в обход системы, и вся идея единого источника истины рушится.
- Спросят: «Storybook заменяет unit-тесты?» Нет. Он закрывает визуальные состояния и интеракции, а логику по-прежнему тестируют отдельно.
- Компонент, который сам ходит в сервис, **в Storybook не заводится** — это хороший индикатор плохих границ, а не проблема Storybook.
- Для крошечного приложения Storybook — лишняя инфраструктура со своей сборкой и деплоем. Он окупается на дизайн-системах и многокомандных продуктах.`,
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
      ru: `## Коротко

Обе техники ловят то, что **обычные тесты не видят**. Contract testing проверяет, что фронт и бэкенд договорились об одном и том же API, не поднимая всю систему. Visual regression проверяет, что интерфейс не «поехал» визуально, хотя вся логика работает.

Аналогия для контрактов: мост строят с двух берегов. Ждать, пока половинки сойдутся посередине, — это e2e: долго, дорого и узнаёшь о расхождении в самом конце. Вместо этого обе команды сверяют **чертёж стыковочного узла**. Contract testing и есть такой чертёж: у фронта записано, чего он ждёт, а бэкенд у себя в CI доказывает, что он это отдаёт.

Аналогия для visual regression: игра «найди десять отличий», только сравнивает машина и на каждый пиксель.

## Как это работает по шагам (Pact, consumer-driven)

1. **Consumer** (фронтенд) в своих тестах описывает ожидаемые запросы и ответы: «на \`GET /users/42\` я жду 200 и поля \`id\`, \`name\`».
2. Из этого генерится **pact-файл** — машинно-читаемый контракт. Заодно эти же ожидания работают как моки для фронтовых тестов.
3. Контракт публикуется в **Pact Broker** — общее хранилище контрактов и результатов верификации.
4. **Provider** (бэкенд) в своём CI **верифицирует** контракт против реальной реализации: проигрывает описанные запросы и сверяет ответы.
5. Итог: бэкенд не может **тихо** сломать поле, которое нужно фронту — у него упадёт верификация. Регрессия ловится **на стороне провайдера до деплоя**, а не в проде.
6. Гейт \`can-i-deploy\` перед выкаткой спрашивает у брокера: «версия, которую я деплою, совместима со всеми, кто от неё зависит?» Без этого шага контракты есть, а защиты нет.

## Пример

\`\`\`ts
// Consumer (фронтенд): объявляем ожидаемое взаимодействие
provider.addInteraction({
  state: 'user 42 exists',                       // предусловие на стороне провайдера
  uponReceiving: 'a request for user 42',
  withRequest: { method: 'GET', path: '/users/42' },
  willRespondWith: {
    status: 200,
    body: { id: Matchers.like(42), name: Matchers.like('Ada') }, // ФОРМА, не значение
  },
});
// -> публикуется pact; провайдер обязан верифицировать его в своём CI,
//    а 'pact-broker can-i-deploy' блокирует релиз, если верификации нет или она красная.
\`\`\`

Почему так: \`Matchers.like\` фиксирует **тип и форму**, а не конкретное значение. Иначе контракт ломался бы от любых тестовых данных, и его быстро перестали бы чинить.

## Visual regression testing

- Скриншот компонента или страницы сравнивается с baseline попиксельно (Chromatic, Percy, Playwright \`toHaveScreenshot\`).
- Ловит ровно то, что функциональные тесты не видят: сломанный CSS, наезжающие элементы, регрессию тёмной темы, не подгрузившийся шрифт. Тест «кнопка кликается» останется зелёным, даже если кнопка уехала за край экрана.
- Цена — флак: антиалиасинг, шрифты, анимации, текущая дата дают ложные диффы. Лечится маскированием динамических зон, фиксацией вьюпорта и шрифтов, порогом по пикселям и детерминированными данными (замороженное время, фиксированный seed).
- **Рекомендация**: включайте visual regression точечно — на дизайн-систему и 5–10 ключевых экранов. Скриншоты всего приложения дают поток апдейтов baseline, которые аппрувят не глядя.

## Что сказать на собеседовании

> Contract testing решает проблему разошедшихся моков: юнит-тесты зелёные, потому что мок отвечает по-старому, а реальный API уже изменился. Pact работает consumer-driven: фронтенд в своих тестах описывает ожидаемые запросы и ответы, из этого генерится pact-файл, он публикуется в Pact Broker, а бэкенд в своём CI верифицирует контракт против реальной реализации. Поэтому провайдер не может тихо сломать нужное фронту поле — верификация упадёт до деплоя, и всё это без поднятия полной e2e-среды. Обязательный шаг — гейт \`can-i-deploy\`, иначе контракты есть, а релиз никто не блокирует. Для публичного API с тысячами неизвестных потребителей consumer-driven не работает, там берут OpenAPI и schema-валидацию. Visual regression дополняет это: сравнение скриншотов с baseline ловит сломанный CSS и наезд элементов, которых функциональные тесты не видят, ценой флака от шрифтов и анимаций.

## Ловушки

- **Pact — это не e2e**. Он проверяет совместимость контрактов, а не бизнес-сценарий целиком. Спросят обязательно.
- **Broker без \`can-i-deploy\`** = контракты ради контрактов: несовместимый деплой никто не остановит.
- Слишком **строгие матчеры** (точные значения вместо \`like\`) делают контракт хрупким, и команда начинает его игнорировать.
- Для **публичного API** с неизвестными потребителями consumer-driven не применим — нужен provider-driven контракт: OpenAPI + валидация схемы.
- **Флаки-скриншоты** без маскирования динамики и фиксации шрифтов быстро приучают команду жать «approve all» — и visual regression перестаёт что-либо ловить.
- Огромный объём baseline-апдейтов в одном PR — тот же rubber-stamp. Держите набор скриншотов маленьким и осмысленным.`,
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
      ru: `## Коротко

Здесь смешивают две **разные оси**, и на собеседовании важно их развести. Первая — **как код попадает в основную ветку** (feature branches / Gitflow против trunk-based). Вторая — **как готовая сборка попадает к пользователям** (blue-green против canary). Это ортогональные решения: можно быть trunk-based и при этом деплоить blue-green.

Аналогия для деплоя: canary — это буквально канарейка в шахте. Не гоните всю смену вниз, отправьте одну птицу: если с ней что-то не так, вы потеряли птицу, а не смену. Blue-green — две одинаковые сцены в театре: пока играют на одной, вторую готовят, а потом просто переводят свет; не понравилось — переводят обратно.

## Из чего состоит

1. **Feature branches / Gitflow** — долгоживущие ветки. Интеграция откладывается, конфликты копятся, в конце наступает «integration hell». Уместно для редких релизов и версионируемого ПО, которое ставят себе клиенты.
2. **Trunk-based** — все коммитят в \`main\` маленькими порциями, а незаконченные фичи прячутся за **feature flags**. Быстрая интеграция и фундамент CD. Требует сильного CI и дисциплины: изоляцию даёт флаг, а не ветка.
3. **Blue-green** — две идентичные среды. Трафик целиком переключают на «green», rollback мгновенный — переключением назад. Просто и предсказуемо, но платите двойной инфраструктурой.
4. **Canary** — новая версия получает **1–5% трафика**, вы следите за ошибками и метриками и постепенно поднимаете долю. Ограничивает радиус поражения и ловит проблемы на живом трафике, но требует хорошей observability и **автоматического rollback по SLO**.
5. Частая рабочая комбинация: **trunk-based + canary + feature flags** — маленькие изменения, узкая выкатка, быстрый откат без передеплоя (достаточно выключить флаг).

## Пример

\`\`\`ts
// trunk-based: незаконченная фича уезжает в main ВЫКЛЮЧЕННОЙ
if (flags.isOn('new-checkout')) {
  renderNewCheckout();          // включаем на 1% пользователей, потом на 10%, потом на всех
} else {
  renderOldCheckout();          // старый путь остаётся живым — это и есть мгновенный откат
}
\`\`\`

\`\`\`ts
// .changeset/tidy-pugs-jam.md — каждый PR декларирует свой бамп
// ---
// "@acme/ui": minor          // добавили DatePicker
// "@acme/api-client": patch  // починили заголовок retry
// ---
// Add DatePicker; fix retry header
\`\`\`

Почему так: флаг отделяет **деплой** от **релиза**. Код уже на проде, но выключен, поэтому «выкатить» и «показать пользователям» становятся двумя независимыми, обратимыми действиями.

## Semver и changesets в монорепо

- **Semantic versioning**: MAJOR — ломающее изменение, MINOR — новая функциональность, PATCH — исправление. Это контракт с теми, кто потребляет ваши пакеты.
- В монорепо возникает вопрос: версионировать всё **одной общей версией** или **независимо** по пакетам. Общая проще в голове, независимая честнее для потребителей.
- **Changesets** решают «что бампать» детерминированно: каждый PR прикладывает файл-changeset с типом бампа и описанием, а при релизе они агрегируются в версии и changelog **только затронутых пакетов**.
- Побочный, но важный плюс: changelog пишется в момент изменения, автором изменения, а не собирается из commit-сообщений постфактум.

## Что сказать на собеседовании

> Я разделяю две оси. Ветвление: Gitflow с долгоживущими ветками откладывает интеграцию и даёт болезненные merge-конфликты, поэтому для продуктовой разработки я выбираю trunk-based — маленькие коммиты в \`main\`, а незавершённые фичи за feature flags; это требует быстрого CI и дисциплины, но даёт непрерывную интеграцию. Деплой: blue-green — две идентичные среды с мгновенным откатом переключением трафика, просто, но платишь двойной инфраструктурой; canary — раскатка на 1–5% трафика с наблюдением за метриками, ограничивает радиус поражения, но нужен автоматический rollback по SLO. Обычно комбинирую trunk-based с canary. В монорепо версии держу на semver, а бампы — через changesets: каждый PR декларирует тип изменения, а релиз агрегирует это в версии и changelog только затронутых пакетов. Главные грабли — забытые флаги и несовместимые миграции БД, которые делают откат невозможным.

## Ловушки

- **Trunk-based без флагов и быстрого CI** — это не trunk-based, а сломанный \`main\`, который блокирует всю команду.
- **Забытые feature flags** — технический долг и комбинаторный взрыв состояний: два флага дают четыре пути кода, десять флагов — тысячу. Заводите срок жизни и уборку флага в Definition of Done.
- **Canary без авто-rollback по SLO** бесполезен: деградация тянется, пока человек посмотрит на дашборд.
- **Blue-green и миграции БД**: схема обязана быть **forward/backward-совместимой**, иначе откат технически невозможен — данные уже мигрировали. Классический вопрос на Senior.
- Спросят разницу **деплой vs релиз** — отвечайте про флаги: деплой это доставка кода, релиз это включение фичи пользователям.
- Canary на фронтенде отдельно коварен: кэшированный \`index.html\` и старые чанки могут смешаться с новыми. Нужны версионированные ассеты и осторожность с кэшем.`,
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
      ru: `## Коротко

Обычный мок подменяет **ваш код**: вы спай-ите \`HttpClient\` или \`fetch\` и договариваетесь с самим собой. MSW подменяет **сеть**: приложение делает настоящий запрос, просто на том конце провода отвечает не сервер, а объявленный вами handler.

Аналогия: чтобы проверить, как человек разговаривает по телефону, можно вырвать телефон из стены и играть в разговор понарошку — это спай-моки. А можно оставить телефон настоящим и посадить на том конце линии актёра — это MSW. Во втором случае вы заодно проверите, что человек **правильно набрал номер** (URL, метод, заголовки, сериализацию тела).

## Как это работает по шагам

1. Вы объявляете **handlers**: «на \`GET /api/users/:id\` отвечай вот таким JSON».
2. В тестах поднимается \`setupServer(...handlers)\`, в браузере — Service Worker. Перехват происходит **на сетевом уровне**, а не внутри вашего кода.
3. Приложение выполняет **настоящий** \`fetch\` или \`HttpClient\`-вызов. Оно вообще не знает, что находится в тестовой среде.
4. MSW ловит запрос и отвечает по handler-у. Тест не знает, **как** приложение сходило за данными, — он проверяет **поведение**, а не реализацию. Поэтому переезд с axios на fetch или с REST на GraphQL не красит тесты.
5. \`server.resetHandlers()\` после каждого теста сбрасывает временные переопределения, чтобы тесты не «протекали» друг в друга.
6. Один и тот же набор handler-ов переиспользуется в **unit-тестах, компонентных тестах и Storybook, e2e и dev-режиме** — можно разрабатывать вообще без поднятого бэкенда.

## Пример

\`\`\`ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // ловим забытые эндпоинты
afterEach(() => server.resetHandlers());   // изоляция: переопределения не текут дальше
afterAll(() => server.close());

it('показывает состояние ошибки при 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... приложение делает НАСТОЯЩИЙ запрос; компонент отрисовывает ветку ошибки
});
\`\`\`

Почему так: \`onUnhandledRequest: 'error'\` — самая полезная настройка. Она превращает «а мы забыли замокать этот эндпоинт» из тихой утечки в реальной сети в понятное падение теста. А \`server.use(...)\` внутри теста переопределяет ответ только для него.

## Что это даёт по изоляции и устойчивости

- **Детерминизм**: реальной сети нет, значит нет флака от latency, таймаутов и недоступного стенда.
- **Изоляция**: сброс handler-ов в \`afterEach\` гарантирует, что тесты можно запускать в любом порядке.
- **Edge-cases одной строкой**: 500, таймаут, пустой массив, медленный ответ, частичный отказ — всё это описывается handler-ом, а не хрупкой конфигурацией спаев.
- **Честная проверка контракта на стороне клиента**: неправильный URL или неверно сериализованное тело просто не совпадут с handler-ом. Со спай-моками такой баг не воспроизводится вообще.

## Что сказать на собеседовании

> Обычные моки подменяют \`HttpClient\` или \`fetch\` спай-ами, и тест оказывается завязан на детали реализации: переписали слой данных с axios на fetch или с REST на GraphQL — тесты красные, хотя поведение не изменилось. MSW перехватывает запросы на сетевом уровне: Service Worker в браузере и перехват на уровне Node в тестах. Приложение делает настоящий вызов, а отвечают объявленные handlers, поэтому проверяется поведение, а не реализация, и заодно ловятся ошибки в URL и сериализации тела. Один набор handler-ов переиспользуется в unit-тестах, Storybook, e2e и dev-режиме без бэкенда. Изоляция держится на \`server.resetHandlers()\` в \`afterEach\`, а \`onUnhandledRequest: 'error'\` не даёт забытому эндпоинту тихо уйти в реальную сеть. Важное ограничение: MSW не валидирует ответы против схемы, поэтому handlers могут разойтись с реальным API — это закрывают contract testing.

## Ловушки

- **Забыли \`resetHandlers()\` в \`afterEach\`** — состояние течёт между тестами, и появляется зависимость от порядка запуска. Самый частый источник флака при работе с MSW.
- **\`onUnhandledRequest: 'bypass'\`** маскирует забытые эндпоинты: запрос уходит в реальную сеть, тест становится недетерминированным. В тестах всегда \`'error'\`.
- **Handlers расходятся с реальным API** — MSW не проверяет ответы по схеме, поэтому даёт ложную уверенность. Сочетайте с contract testing или генерацией моков из OpenAPI.
- Спросят: «а MSW заменяет e2e?» Нет. Он убирает бэкенд из уравнения, но настоящую интеграцию не проверяет.
- В Node нужен правильный setup под версию (fetch/undici) — неверная инициализация даёт классическое «MSW не перехватывает».
- Слишком «умный» handler с состоянием и логикой превращается в маленький второй бэкенд, который тоже надо поддерживать и отлаживать.`,
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
      ru: `## Коротко

В zoneless-режиме больше нет Zone.js, которая раньше «магически» замечала любое асинхронное действие и сама запускала change detection. Поэтому в тестах меняется одна вещь: **значение обновляется сразу, а DOM — только когда вы явно попросите**.

Аналогия: раньше в офисе сидел секретарь (Zone.js), который слышал каждый чих и сам бежал переписывать доску. Его уволили. Теперь сотрудник (сигнал) точно знает, что у него изменилось, но доску (DOM) перерисовывают по расписанию — а в тесте расписания нет, поэтому вы говорите «перерисуй» вручную через \`detectChanges()\`.

## Как это работает по шагам

1. **Сигналы синхронны**: \`count.set(1); expect(count()).toBe(1)\` работает вообще без TestBed. Это просто значение в коробочке.
2. **Рендер сам не обновится**: после изменения вызывайте \`fixture.detectChanges()\` или \`await fixture.whenStable()\` — zone-хука, который делал это за вас, больше нет.
3. **\`computed\` ленив и мемоизирован**: он вычисляется только при чтении. И он «glitch-free» — если поменять два входных сигнала подряд, промежуточное несогласованное значение никто не увидит, поэтому не пытайтесь его поймать в тесте.
4. **\`effect()\` исполняется в реактивном контексте и не мгновенно**. Чтобы ассерт не сработал раньше эффекта, явно вызывайте \`TestBed.flushEffects()\` (или \`tick()\` внутри \`fakeAsync\`).
5. **Таймеры** — \`fakeAsync\` + \`tick()\`; **микротаски и промисы** — \`await fixture.whenStable()\`.

## Пример

\`\`\`ts
it('обновляет вью после изменения сигнала (zoneless)', () => {
  const fixture = TestBed.createComponent(CounterComponent);
  fixture.detectChanges();                       // первичный рендер
  fixture.componentInstance.count.set(5);        // сигнал синхронен...
  expect(fixture.componentInstance.count()).toBe(5);
  fixture.detectChanges();                       // ...но DOM требует явного CD
  expect(fixture.nativeElement.textContent).toContain('5');
});

it('детерминированно прогоняет эффекты', () => {
  const fixture = TestBed.createComponent(Cmp);
  fixture.componentInstance.value.set(1);
  TestBed.flushEffects();                        // выполняем эффекты сейчас, без «повезёт»
  expect(logSpy).toHaveBeenCalledWith(1);
});
\`\`\`

Почему так: два ассерта в первом тесте проверяют **разные вещи** — состояние и отрисовку. Именно на их смешении и ловят: «сигнал же синхронный, почему в DOM старое значение?».

## Откуда берётся flaky и как бороть системно

Флакующий тест — это пожарная сигнализация, которая воет каждый раз, когда жаришь котлеты. Через неделю на неё перестают реагировать — и настоящий пожар проходит незамеченным. Поэтому флак чинят, а не терпят. Четыре источника:

1. **Время и асинхронность**: настоящие \`setTimeout\`, \`Date.now()\`, анимации. Лечение — \`fakeAsync\` с \`tick()\`, fake timers, замороженные часы.
2. **Порядок и общее состояние**: глобальные синглтоны, несброшенные моки, localStorage, общий DOM. Каждый тест обязан сам себя подготовить и за собой убрать: \`afterEach\` с ресетом, свежий TestBed.
3. **Гонки в сети**: реальные запросы и недетерминированный порядок ответов. Лечение — MSW или \`HttpTestingController\`.
4. **Хрупкие ожидания**: \`sleep(500)\` в надежде, что «успеет». Нужен \`waitFor\` по фактическому условию.

Системно: **изоляция по умолчанию** — прогон в случайном порядке (\`--shuffle\`) должен быть зелёным; **карантин и учёт** флакующих тестов вместо слепого ретрая; **детерминизм данных** — фиксированный seed, замороженное время.

## Что сказать на собеседовании

> В zoneless нет Zone.js, которая раньше сама триггерила change detection, поэтому в тестах я развожу две вещи: сигналы синхронны и читаются сразу, \`count.set(1)\` и проверка \`count()\` работают даже без TestBed, а вот DOM обновляется только после явного \`fixture.detectChanges()\` или \`await fixture.whenStable()\`. \`computed\` ленив, мемоизирован и glitch-free, промежуточные значения не наблюдаемы. Эффекты не выполняются мгновенно — нужен \`TestBed.flushEffects()\` или \`tick()\` в \`fakeAsync\`, иначе ассерт сработает раньше эффекта. С флаком борюсь системно: четыре источника — время, общее состояние между тестами, сетевые гонки и \`sleep\` вместо \`waitFor\`. Лечение — fake timers, полная изоляция с прогоном в случайном порядке, MSW вместо реальной сети и ожидание по условию. Флакующие тесты я ставлю в карантин и чиню причину, потому что \`retries: 3\` в CI лишь маскирует настоящую гонку.

## Ловушки

- **«Сигнал синхронный, значит и DOM обновился»** — нет. Значение обновилось сразу, отрисовка требует \`detectChanges()\`. Самая частая ошибка на zoneless.
- **Ассерт до \`flushEffects()\`** — эффект ещё не выполнился, тест падает или, хуже, случайно проходит.
- Попытка **поймать промежуточное значение \`computed\`** — его не существует: цепочка вычисляется glitch-free.
- **\`sleep(500)\` вместо \`waitFor\`** — на медленном CI-раннере тест упадёт, на быстром пройдёт. Классический флак.
- **\`retries: 3\` как «лекарство»** от флака: зелёный CI поверх реальной гонки, которая доедет до прода. Ретрай — это индикатор проблемы, а не её решение.
- Тесты, которые проходят только в определённом порядке, — почти всегда общее состояние. Проверяется одним \`--shuffle\`, и лучше узнать об этом самому, чем на собеседовании.`,
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
