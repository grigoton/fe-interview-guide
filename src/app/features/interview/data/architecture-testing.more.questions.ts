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
      ru: `## 🧩 Простыми словами

Представь ресторан. Есть **кухня** (главные рецепты и правила приготовления) — это самое ценное, ради чего люди приходят. И есть официанты, меню, доставка, касса — способы «доставить» блюдо гостю. Чистая (гексагональная) архитектура говорит: держи кухню отдельно и защищённо, чтобы можно было поменять официантов, дизайн меню или систему доставки, не переписывая рецепты. В коде «кухня» — это бизнес-логика (домен), а «официанты и доставка» — это UI, HTTP-запросы и хранилище.

### Что такое слои

Идея называется **ports & adapters** (порты и адаптеры). Порт — это розетка (интерфейс, договор), адаптер — вилка, которая в неё вставляется (конкретная реализация). Код делят на слои:

- **Domain (домен)** — сущности, value-objects (объекты-значения, например «Деньги» или «Email») и бизнес-правила. Это чистый TypeScript без Angular и RxJS — как рецепт, который не зависит от того, кто и как его подаёт.
- **Application (сценарии, use-cases)** — оркестрация, то есть «дирижирование» шагами. Например, \`PlaceOrderUseCase\` («оформить заказ») зависит от **порта** — интерфейса \`OrderRepository\`, а не от конкретного \`HttpClient\`. Он знает *что* надо сделать, но не знает *как именно* данные сохранятся.
- **Infrastructure (адаптеры)** — конкретные реализации портов: \`HttpOrderRepository\` (сохраняет через HTTP), \`LocalStorageCartRepository\` (кладёт корзину в браузер).
- **Presentation (представление)** — компоненты и сторы (хранилища состояния), которые вызывают use-cases.

### Куда указывают зависимости

Главное правило: все зависимости смотрят **внутрь, к домену**. Внешние слои зависят от абстракций, которые задают внутренние слои — не наоборот. Это называется **dependency inversion** (инверсия зависимостей): домен объявляет интерфейс репозитория (договор «я хочу уметь сохранять заказ»), а инфраструктура его реализует и подключается через DI (dependency injection — механизм, который сам подставляет нужную реализацию). Домен диктует правила, инфраструктура подстраивается.

### Зачем это всё

- Бизнес-логику можно тестировать **без TestBed** (тяжёлого тестового окружения Angular) — это обычные быстрые unit-тесты, которые проверяют один кусочек логики за наносекунды.
- Заменить REST на GraphQL = написать новый адаптер, домен вообще не трогаем.
- Явные границы не дают HTTP-DTO (сырым структурам данных из ответа сервера) «протекать» прямо в шаблоны и захламлять UI.

### Как это выглядит в коде

\`\`\`ts
// domain/order.ts — чистый, без фреймворка
export class Order {
  constructor(public readonly id: string, private items: Item[]) {}
  total(): Money { return this.items.reduce((s, i) => s.add(i.price), Money.zero()); }
}

// application/place-order.usecase.ts — зависит от ПОРТА
export interface OrderRepository { save(o: Order): Promise<void>; }
export class PlaceOrderUseCase {
  constructor(private repo: OrderRepository) {}      // инверсия
  async exec(order: Order) {
    if (order.total().isZero()) throw new EmptyOrderError();
    await this.repo.save(order);
  }
}

// infrastructure/http-order.repository.ts — АДАПТЕР
@Injectable()
export class HttpOrderRepository implements OrderRepository {
  constructor(private http: HttpClient) {}
  save(o: Order) { return firstValueFrom(this.http.post('/api/orders', toDto(o))); }
}
\`\`\`

Обрати внимание: \`Order\` ничего не знает про HTTP. \`PlaceOrderUseCase\` работает с интерфейсом \`OrderRepository\`, а не с \`HttpClient\`. И только \`HttpOrderRepository\` — адаптер — знает про сеть. Захотим сохранять в другом месте — пишем новый класс с тем же интерфейсом.

## ⚠️ Подводные камни

- **Over-engineering (переусложнение)**: на CRUD-приложении из пяти форм эти слои — чистый оверхед и тонны ручного маппинга DTO ↔ domain (перекладывания полей туда-сюда).
- **Anemic domain (анемичный домен)**: если сущности — просто структуры данных без методов, а вся логика свалена в сервисы, вы получили обычный процедурный код, только в дорогой обёртке. Логика должна жить внутри сущностей.
- Команда без опыта DDD часто проводит границы «не там», и последующий рефакторинг оказывается больнее, чем если бы была простая плоская структура.

## 🎯 Запомни

- Гексагональная архитектура = **изолировать домен** от деталей доставки (UI, HTTP, storage); зависимости всегда указывают внутрь, к домену.
- Домен объявляет **интерфейсы (порты)**, инфраструктура даёт **реализации (адаптеры)** — это инверсия зависимостей через DI.
- Оправдано на **доменно-сложных** продуктах (страхование, биллинг, трейдинг), а не на витринах и простых CRUD.
- Главные враги — over-engineering и анемичный домен: слои без реальной бизнес-логики внутри сущностей бессмысленны.`,
      en: `## 🧩 In plain words

Picture a restaurant. There's the **kitchen** (the core recipes and cooking rules) — the most precious thing, the reason people come. And there are waiters, menus, delivery, the cash register — ways to *deliver* the dish to the guest. Clean (hexagonal) architecture says: keep the kitchen separate and protected, so you can swap waiters, redesign the menu, or change the delivery service without rewriting the recipes. In code, the "kitchen" is your business logic (the domain), and the "waiters and delivery" are the UI, HTTP calls, and storage.

### What the layers are

The idea is called **ports & adapters**. A port is a wall socket (an interface, a contract); an adapter is the plug that fits into it (a concrete implementation). The code is split into layers:

- **Domain** — entities, value-objects (value-typed objects like "Money" or "Email"), and business rules. This is pure TypeScript with no Angular or RxJS — like a recipe that doesn't care who serves it or how.
- **Application (use-cases)** — orchestration, i.e. "conducting" the steps. For example, \`PlaceOrderUseCase\` depends on a **port** — the \`OrderRepository\` interface — not on a concrete \`HttpClient\`. It knows *what* to do but not *how exactly* the data gets saved.
- **Infrastructure (adapters)** — concrete port implementations: \`HttpOrderRepository\` (saves over HTTP), \`LocalStorageCartRepository\` (stores the cart in the browser).
- **Presentation** — components and stores (state containers) that invoke use-cases.

### Which way dependencies point

The golden rule: all dependencies point **inward, toward the domain** — never outward. Outer layers depend on abstractions defined by the inner ones. This is called **dependency inversion**: the domain declares the repository interface (the contract "I want to be able to save an order"), and infrastructure implements it and is wired in via DI (dependency injection — the mechanism that plugs in the right implementation for you). The domain dictates the rules; infrastructure adapts.

### Why bother

- Business logic can be tested **without TestBed** (Angular's heavy test harness) — these are plain, fast unit tests that check one bit of logic in nanoseconds.
- Swapping REST for GraphQL = write a new adapter; the domain is never touched.
- Explicit boundaries stop HTTP DTOs (raw data structures from the server response) from leaking straight into templates and cluttering the UI.

### What it looks like in code

\`\`\`ts
// domain/order.ts — pure, no framework
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
}
\`\`\`

Notice: \`Order\` knows nothing about HTTP. \`PlaceOrderUseCase\` works with the \`OrderRepository\` interface, not with \`HttpClient\`. Only \`HttpOrderRepository\` — the adapter — knows about the network. Want to save somewhere else? Write a new class with the same interface.

## ⚠️ Common pitfalls

- **Over-engineering**: on a 5-form CRUD app these layers are pure overhead and endless manual DTO ↔ domain mapping (shuffling fields back and forth).
- **Anemic domain**: if entities are just data bags with no methods and all the logic sits in services, you've written plain procedural code in an expensive wrapper. Logic belongs inside the entities.
- A team with no DDD experience often draws the boundaries in the wrong place, and the later refactor hurts more than a plain flat structure would have.

## 🎯 Key takeaways

- Hexagonal architecture = **isolate the domain** from delivery details (UI, HTTP, storage); dependencies always point inward, toward the domain.
- The domain declares **interfaces (ports)**; infrastructure supplies **implementations (adapters)** — that's dependency inversion via DI.
- It's justified on **domain-rich** products (insurance, billing, trading), not on content sites or simple CRUD.
- The main enemies are over-engineering and the anemic domain: layers with no real business logic inside the entities are pointless.`,
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
      ru: `## 🧩 Простыми словами

Представь, что ты гость в отеле и хочешь завтрак, свежие полотенца и такси. Можно бегать самому на кухню, в прачечную и на стоянку — утомительно и легко запутаться. А можно позвонить **консьержу**, который сам всё соберёт и принесёт тебе один аккуратный результат. BFF (Backend-for-Frontend, «бэкенд для фронтенда») — это такой консьерж: отдельный маленький сервер, который стоит между вашим приложением и кучей внутренних сервисов и собирает для конкретного экрана ровно то, что нужно.

### Проблема прямых вызовов

Когда SPA (одностраничное приложение) само дёргает напрямую, скажем, 8 микросервисов, начинаются боли:

- **Over-fetching / under-fetching** — сервер отдаёт либо слишком много лишних полей, либо слишком мало, и приходится делать ещё запросы.
- **N+1 round-trips** — много последовательных походов туда-обратно по сети; на медленном мобильном интернете это заметные тормоза (round-trip — один полный цикл «запрос-ответ»).
- **Утечка внутренней доменной модели** в клиент — браузер начинает знать про внутреннюю кухню сервисов.
- **CORS-ад** — мучения с настройкой межсайтовых запросов к десятку доменов (CORS — правила браузера о том, кому можно слать запросы).
- Дублирование агрегации (сборки данных из разных источников) и авторизации прямо на клиенте.

### Идея BFF

BFF — это **отдельный бэкенд под каждый тип клиента** (web, iOS, Android), потому что у них разные потребности в данных. Что он делает:

- **Агрегирует** несколько вызовов сервисов в один ответ, заточенный под конкретный экран. Один запрос от клиента — один готовый результат.
- Делает **shape transformation** (преобразование формы данных) — отдаёт ровно те поля, что нужны UI, ничего лишнего.
- Держит **секреты и токены на сервере**. Например, web-BFF хранит сессию в httpOnly-cookie (куке, которую JavaScript в браузере не может прочитать) и обменивает её на внутренние токены. Клиент вообще не видит access-token — это называется token handler pattern и заметно повышает безопасность.
- Централизует **retry** (повтор запроса), **circuit-breaker** (см. ниже) и кэш в одном месте, а не в каждом клиенте.

### Компромиссы (trade-offs)

Плюсы:
- Меньше round-trips, клиент становится тоньше и проще.
- Лучше безопасность за счёт token-handler pattern — токены не утекают в браузер.

Минусы:
- **Ещё один деплой-юнит** (отдельная штука, которую надо разворачивать, мониторить и обновлять) и команда-владелец.
- Риск, что BFF превратится в «толстого» оркестратора, набитого бизнес-логикой. А бизнес-логика должна жить в доменных сервисах, не в BFF.
- Если делать по BFF на каждый клиент, логика начинает **дрейфовать** — расходиться и дублироваться. GraphQL или BFF-федерация (объединение нескольких BFF в один граф) частично это лечат.

## ⚠️ Подводные камни

- **Circuit breaker** («предохранитель») — паттерн, когда после серии ошибок BFF временно перестаёт долбить упавший сервис. Полезно централизовать здесь, но легко забыть.
- Не плодите BFF, если у вас **один тип клиента** и стабильные контракты — это лишняя операционная стоимость.
- Один web-клиент плюс хорошо спроектированный **API-gateway** (единая точка входа, маршрутизирующая запросы) часто уже достаточен без отдельного BFF.

## 🎯 Запомни

- BFF — отдельный бэкенд под каждый тип клиента, который **агрегирует, преобразует форму данных и прячет токены**.
- Главные выгоды: меньше round-trips, тоньше клиент, безопаснее (token-handler pattern).
- Цена: ещё один деплой-юнит и риск «толстого» BFF с бизнес-логикой, которой там не место.
- Оправдан при **множестве платформ** с разными потребностями в данных; для одного клиента часто хватает API-gateway.`,
      en: `## 🧩 In plain words

Imagine you're a hotel guest who wants breakfast, fresh towels, and a taxi. You could run to the kitchen, the laundry, and the parking lot yourself — tiring and easy to get muddled. Or you call the **concierge**, who gathers everything and hands you one tidy result. A BFF (Backend-for-Frontend) is that concierge: a small dedicated server sitting between your app and a pile of internal services, assembling exactly what a given screen needs.

### The problem with direct calls

When a SPA (single-page app) hits, say, 8 microservices directly, the pain starts:

- **Over-fetching / under-fetching** — the server returns either too many useless fields or too few, forcing extra requests.
- **N+1 round-trips** — many sequential trips across the network; on slow mobile connections that's noticeable lag (a round-trip is one full request-response cycle).
- **Leaking the internal domain model** to the client — the browser ends up knowing the services' internal plumbing.
- **CORS hell** — the misery of configuring cross-site requests to a dozen domains (CORS is the browser's rules about who is allowed to send requests where).
- Duplicated aggregation (assembling data from several sources) and authorization right in the browser.

### The BFF idea

A BFF is **a dedicated backend per client type** (web, iOS, Android), because they have different data needs. What it does:

- **Aggregates** several service calls into one screen-shaped response. One request from the client, one ready-made result.
- Does **shape transformation** — returns exactly the fields the UI needs, nothing extra.
- Keeps **secrets and tokens server-side**. For example, a web BFF stores the session in an httpOnly cookie (a cookie the browser's JavaScript cannot read) and exchanges it for internal tokens. The client never sees the access token — this is the token-handler pattern, and it meaningfully improves security.
- Centralizes **retry** (re-issuing a request), **circuit-breaker** (see below), and caching in one place instead of in every client.

### Trade-offs

Upsides:
- Fewer round-trips; the client gets thinner and simpler.
- Better security via the token-handler pattern — tokens never leak into the browser.

Downsides:
- **Another deploy unit** (a separate thing to deploy, monitor, and update) and an owning team.
- The risk the BFF turns into a fat orchestrator stuffed with business logic. Business logic belongs in the domain services, not in the BFF.
- If you build one BFF per client, logic starts to **drift** — diverge and duplicate. GraphQL or BFF federation (merging several BFFs into one graph) partly cures this.

## ⚠️ Common pitfalls

- **Circuit breaker** — a pattern where, after a run of failures, the BFF temporarily stops hammering a downed service. Good to centralize here, but easy to forget.
- Don't multiply BFFs if you have **one client type** and stable contracts — that's needless operational cost.
- A single web client plus a well-designed **API gateway** (one entry point that routes requests) is often already enough without a separate BFF.

## 🎯 Key takeaways

- A BFF is a dedicated backend per client type that **aggregates, reshapes data, and hides tokens**.
- Main wins: fewer round-trips, a thinner client, better security (token-handler pattern).
- The cost: another deploy unit and the risk of a fat BFF holding business logic that doesn't belong there.
- It's justified with **multiple platforms** that have different data needs; for a single client an API gateway is often enough.`,
    },
  },
  {
    id: 'arch-043',
    category: 'architecture-testing',
    level: 'Hard',
    tags: ['graphql', 'apollo', 'normalized-cache'],
    question: {
      ru: 'GraphQL против REST на клиенте: какие проблемы решает нормализованный кэш Apollo и где он подводит?',
      en: 'GraphQL vs REST on the client: what does Apollo\'s normalized cache solve and where does it bite?',
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь два способа заказать еду. **REST** — это фиксированное комплексное меню: тебе приносят готовый набор блюд, даже если половина не нужна (или наоборот, чего-то не хватает и ты заказываешь ещё). **GraphQL** — это когда ты сам пишешь официанту точный список: «мне вот эти три блюда, и вот такие гарниры». Один запрос — ровно то, что нужно для экрана. А **нормализованный кэш Apollo** — это умный холодильник клиента, который раскладывает все продукты по полочкам-ярлыкам, чтобы не хранить один помидор в трёх местах.

### REST против GraphQL на клиенте

REST работает с фиксированными ресурсами по URL-адресам. Отсюда болячки: over/under-fetching (сервер отдаёт лишнее или недостаточно), версионирование API и много эндпоинтов (адресов), которые надо помнить.

GraphQL переворачивает подход: **клиент сам описывает форму данных** в запросе. Один запрос на целый экран, а строгая схема (schema — типизированное описание всех доступных данных) служит контрактом между фронтом и бэком. Цена — сложность кэширования на клиенте и риск дорогих или N+1 резолверов на сервере (резолвер — функция, добывающая одно поле; N+1 значит, что для списка из N элементов он лезет в базу N+1 раз).

### Нормализованный кэш Apollo

Apollo (популярный GraphQL-клиент) не хранит ответы «как есть, по запросам». Он разбирает ответ на отдельные объекты, у каждого берёт ключ из \`__typename\` (тип объекта, например \`User\`) плюс \`id\`, и складывает их **плоско** — как маленькую базу данных, где у каждого объекта одна запись. Полезные эффекты:

- Мутация (запрос на изменение данных), вернувшая \`User{id, name}\`, **автоматически обновит** все экраны, где показан этот пользователь — потому что это одна и та же запись в кэше.
- **Дедупликация**: один объект хранится в одном месте, а не копируется по разным запросам.

### Где кэш подводит (failure modes)

- **Списки не нормализуются волшебно.** После мутации \`addTodo\` новый элемент сам собой в закэшированном списке НЕ появится — Apollo не знает, в какие списки его вставить. Нужен \`update\`-колбэк или \`refetchQueries\` (принудительный перезапрос). Это классический баг новичков.
- **Объекты без \`id\`** (или когда ты забыл выбрать \`id\` в запросе) не могут получить нормальный ключ и кэшируются по пути запроса → дубли и рассинхрон данных. Лечится указанием \`keyFields\` (какие поля образуют идентичность).
- **Пагинация** (постраничная подгрузка) требует ручных функций \`merge\`/\`read\` в \`typePolicies\`; иначе новая страница затрёт предыдущую вместо склейки.
- **Инвалидация кэша** (понимание, когда данные устарели) по-прежнему трудна — недаром её зовут «одной из двух сложнейших проблем в программировании».

### Как это настраивают в коде

\`\`\`ts
const cache = new InMemoryCache({
  typePolicies: {
    User: { keyFields: ['id'] },               // идентичность для нормализации
    Query: {
      fields: {
        feed: {                                 // склейка страниц (курсорная пагинация)
          keyArgs: ['filter'],
          merge(existing = { items: [] }, incoming) {
            return { ...incoming, items: [...existing.items, ...incoming.items] };
          },
        },
      },
    },
  },
});

// после мутации списки надо обновлять ЯВНО — они НЕ вставляются сами
addTodo({
  variables: { text },
  update(cache, { data }) {
    cache.modify({ fields: { todos: (refs = []) => [...refs, data.addTodo] } });
  },
});
\`\`\`

Здесь \`keyFields: ['id']\` говорит Apollo, как опознавать пользователя; функция \`merge\` для \`feed\` склеивает страницы вместо перезаписи; а \`update\` вручную дописывает новый todo в список после мутации.

## ⚠️ Подводные камни

- Забыл \`update\`/\`refetchQueries\` после мутации → добавленный элемент не виден, хотя на сервере он есть.
- Забыл выбрать \`id\` в запросе → тихие дубли и «мигающие» данные.
- Не настроил \`merge\` для пагинации → каждая новая страница стирает предыдущую.

## 🎯 Запомни

- GraphQL: **клиент задаёт форму данных**, один запрос на экран, схема как контракт; цена — сложность кэша.
- Нормализованный кэш Apollo хранит объекты плоско по \`__typename\`+\`id\`, поэтому мутации автообновляют все экраны с этим объектом.
- Списки, объекты без \`id\` и пагинация **не работают магически** — нужны \`update\`, \`keyFields\`, \`merge\`.
- Не бери GraphQL «потому что модно»: для простого CRUD \`fetch\` + RTK Query / TanStack Query часто проще, а HTTP-кэш/CDN на REST может дать больше пользы.`,
      en: `## 🧩 In plain words

Picture two ways to order food. **REST** is a fixed set menu: you get a preset bundle of dishes, even if half of them aren't needed (or worse, something's missing and you order again). **GraphQL** is when you write the waiter a precise list: "give me these three dishes with these sides." One request — exactly what the screen needs. And **Apollo's normalized cache** is the client's smart fridge that sorts every ingredient onto labeled shelves, so it never stores the same tomato in three places.

### REST vs GraphQL on the client

REST deals with fixed resources at URL addresses. Hence the aches: over/under-fetching (the server returns too much or too little), API versioning, and many endpoints (addresses) to remember.

GraphQL flips this: **the client declares the data shape** in the query itself. One request per whole screen, and a strict schema (a typed description of all available data) serves as the contract between front and back. The cost is client-side cache complexity and the risk of expensive or N+1 resolvers on the server (a resolver is a function fetching one field; N+1 means that for a list of N items it hits the database N+1 times).

### Apollo's normalized cache

Apollo (a popular GraphQL client) doesn't store responses "as-is, per query." It splits a response into individual objects, keys each one by \`__typename\` (the object's type, e.g. \`User\`) plus \`id\`, and stores them **flat** — like a little database where each object has one record. Handy effects:

- A mutation (a request that changes data) returning \`User{id, name}\` **auto-updates** every screen showing that user — because it's the same record in the cache.
- **Deduplication**: one object lives in one place instead of being copied across queries.

### Where it bites (failure modes)

- **Lists are not magically normalized.** After an \`addTodo\` mutation, the new item will NOT appear in a cached list by itself — Apollo doesn't know which lists to insert it into. You need an \`update\` callback or \`refetchQueries\` (a forced refetch). This is a classic beginner bug.
- **Objects without an \`id\`** (or when you forgot to select \`id\` in the query) can't get a proper key and cache by query path → duplicates and data drift. Fix it by declaring \`keyFields\` (which fields form the identity).
- **Pagination** requires manual \`merge\`/\`read\` functions in \`typePolicies\`; otherwise a new page overwrites the previous one instead of appending.
- **Cache invalidation** (knowing when data is stale) is still hard — it's famously "one of the two hard problems in computer science."

### How it's configured in code

\`\`\`ts
const cache = new InMemoryCache({
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
});
\`\`\`

Here \`keyFields: ['id']\` tells Apollo how to identify a user; the \`merge\` function for \`feed\` appends pages instead of overwriting; and \`update\` manually adds the new todo to the list after the mutation.

## ⚠️ Common pitfalls

- Forgot \`update\`/\`refetchQueries\` after a mutation → the added item is invisible even though it exists on the server.
- Forgot to select \`id\` in the query → silent duplicates and "flickering" data.
- Didn't set up \`merge\` for pagination → each new page wipes out the previous one.

## 🎯 Key takeaways

- GraphQL: **the client declares the data shape**, one request per screen, schema as contract; the cost is cache complexity.
- Apollo's normalized cache stores objects flat by \`__typename\`+\`id\`, so mutations auto-update every screen showing that object.
- Lists, id-less objects, and pagination **don't work by magic** — you need \`update\`, \`keyFields\`, \`merge\`.
- Don't adopt GraphQL "because it's trendy": for simple CRUD, \`fetch\` + RTK Query / TanStack Query is often simpler, and HTTP caching/CDN over REST may buy you more.`,
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
      ru: `## 🧩 Простыми словами

Представь корабль с водонепроницаемыми отсеками. Если в одном отсеке пробоина, его перекрывают — и корабль плывёт дальше, а не тонет целиком. Хорошая обработка ошибок в SPA (одностраничном приложении) работает так же: одна упавшая часть интерфейса не должна топить весь экран. Для этого выстраивают несколько «уровней защиты» — от общей ловушки на всё приложение до маленьких границ вокруг рискованных виджетов.

### Уровни обработки ошибок

1. **Глобальный \`ErrorHandler\`** (в Angular) — общая ловушка для непойманных синхронных и RxJS-ошибок (RxJS — библиотека для работы с потоками событий). Это единая точка, где удобно логировать ошибку в Sentry (сервис сбора ошибок) и показать toast (всплывающее уведомление). Но он **не локализует** сбой: упавший компонент сам себя не «огораживает» — глобальный обработчик просто узнаёт о проблеме постфактум.
2. **HTTP-интерсептор** (перехватчик сетевых запросов) — централизованно обрабатывает 401 (не авторизован → обновить токен или разлогинить), 403 (нет прав), 5xx (ошибки сервера), сетевые сбои и делает retry с backoff (повтор с нарастающей паузой) для идемпотентных запросов.
3. **Границы ошибок (error boundaries)** — изолируют поддерево интерфейса. В React это \`componentDidCatch\` или компонент \`<ErrorBoundary>\`. В Angular встроенных нет, поэтому паттерн реализуют через блок \`@defer (error)\`, обёртку с локальным \`ErrorHandler\` или ловлю ошибок рендера на уровне роутера.

### Что такое «идемпотентный» и «backoff»

**Идемпотентная** операция — та, что при повторе даёт тот же результат (например, GET или удаление уже удалённого). **Backoff** — стратегия, когда после неудачи ждёшь всё дольше перед следующей попыткой; **jitter** — добавление случайного разброса к паузе, чтобы клиенты не ломанулись повторять все разом.

### Принципы устойчивости

- **Fail soft, а не всей страницей.** Ошибка в виджете «погода» не должна ронять весь дашборд — деградируйте (переходите в упрощённый режим) до плейсхолдера-заглушки.
- Различайте **ожидаемые** ошибки (валидация формы, 404 → это нормальный доменный поток) и **неожиданные** (баг → в \`ErrorHandler\` плюс алерт команде). Пользователю никогда не показывайте stack-trace (техническую распечатку стека вызовов).
- **Circuit breaker** («предохранитель») на флапающий (нестабильный, то падающий, то встающий) бэкенд: после N ошибок временно отдавайте кэш или фолбэк, а не долбите умирающий сервис.
- Сетевые сбои → retry с экспоненциальным backoff и jitter, но **только для идемпотентных** операций. POST с повтором без ключа идемпотентности = двойные заказы у пользователя.

### Как это выглядит в коде

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private sentry = inject(SentryService);
  private toast = inject(ToastService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? null : error; // HTTP — в интерсепторе
    if (e) { this.sentry.capture(e); this.toast.errorOnce('Something went wrong'); }
    console.error(error);            // никогда не глотаем молча
  }
}

// Angular @defer работает как лёгкая граница ошибок для поддерева:
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }
\`\`\`

Здесь HTTP-ошибки отдаются интерсептору, остальное логируется в Sentry и показывается пользователю **один раз** (\`errorOnce\`), и ничего не проглатывается молча.

## ⚠️ Подводные камни

- Глобальный \`catchError\`, который проглатывает всё подряд → «тихие» баги, которые никто не видит. Логируйте всегда.
- Toast на каждую ошибку фонового поллинга (периодического опроса сервера) → спам уведомлениями. Дедуплицируйте.
- \`ErrorHandler\`, который сам бросает ошибку внутри обработки → бесконечный цикл.

## 🎯 Запомни

- Стройте **несколько уровней**: глобальный \`ErrorHandler\` + HTTP-интерсептор + границы ошибок вокруг рискованных поддеревьев.
- **Fail soft**: деградируйте до заглушки, а не роняйте весь экран; отделяйте ожидаемые ошибки от неожиданных.
- Retry с backoff + jitter — **только для идемпотентных** запросов; POST-retry без ключа идемпотентности = дубли.
- Никогда не глотайте ошибки молча и не показывайте пользователю stack-trace; для маленьких приложений хватит \`ErrorHandler\` + интерсептора.`,
      en: `## 🧩 In plain words

Picture a ship with watertight compartments. If one compartment springs a leak, you seal it off — and the ship keeps sailing instead of sinking whole. Good error handling in a SPA (single-page app) works the same way: one crashed piece of UI must not sink the entire screen. To get there you build several "layers of defense" — from one catch-all for the whole app down to small fences around risky widgets.

### Layers of error handling

1. **Global \`ErrorHandler\`** (in Angular) — a catch-all for uncaught synchronous and RxJS errors (RxJS is a library for working with streams of events). It's one place to conveniently log the error to Sentry (an error-collection service) and show a toast (a pop-up notification). But it **does not localize** the failure: a crashed component doesn't fence itself off — the global handler just learns of the problem after the fact.
2. **HTTP interceptor** (a network-request middleman) — centrally handles 401 (unauthorized → refresh the token or log out), 403 (forbidden), 5xx (server errors), network failures, and does retry-with-backoff (retry with a growing pause) for idempotent requests.
3. **Error boundaries** — isolate a subtree of the UI. In React that's \`componentDidCatch\` or the \`<ErrorBoundary>\` component. Angular has none built-in, so the pattern is done via a \`@defer (error)\` block, a wrapper with a local \`ErrorHandler\`, or catching render errors at the router level.

### What "idempotent" and "backoff" mean

An **idempotent** operation gives the same result when repeated (e.g. a GET, or deleting something already deleted). **Backoff** is a strategy where after a failure you wait longer and longer before the next attempt; **jitter** adds a random spread to the pause so clients don't all retry in the same instant.

### Resilience principles

- **Fail soft, not whole-page.** An error in a "weather" widget must not crash the whole dashboard — degrade (fall back to a simpler mode) to a placeholder.
- Distinguish **expected** errors (form validation, 404 → this is a normal domain flow) from **unexpected** ones (a bug → into \`ErrorHandler\` plus an alert to the team). Never show users a stack trace (the technical printout of the call stack).
- **Circuit breaker** on a flapping (unstable, up-then-down) backend: after N failures, temporarily serve cache or a fallback instead of hammering a dying service.
- Network failures → retry with exponential backoff and jitter, but **only for idempotent** operations. A POST retried without an idempotency key = double orders for the user.

### What it looks like in code

\`\`\`ts
@Injectable()
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
// @defer (on viewport) { <risky-widget/> } @error { <fallback-placeholder/> }
\`\`\`

Here HTTP errors are handed off to the interceptor, everything else is logged to Sentry and shown to the user **once** (\`errorOnce\`), and nothing is swallowed silently.

## ⚠️ Common pitfalls

- A global \`catchError\` that swallows everything → silent bugs nobody sees. Always log.
- A toast on every background-poll error (periodic server polling) → notification spam. Deduplicate.
- An \`ErrorHandler\` that itself throws during handling → an infinite loop.

## 🎯 Key takeaways

- Build **several layers**: a global \`ErrorHandler\` + an HTTP interceptor + error boundaries around risky subtrees.
- **Fail soft**: degrade to a placeholder rather than crashing the whole screen; separate expected errors from unexpected ones.
- Retry with backoff + jitter **only for idempotent** requests; a POST retry without an idempotency key = duplicates.
- Never swallow errors silently and never show users a stack trace; for small apps an \`ErrorHandler\` + interceptor is enough.`,
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
      ru: `## 🧩 Простыми словами

Observability (наблюдаемость) — это как приборная панель в машине. Пока едешь, ты хочешь видеть, не загорелась ли лампочка (ошибка), не перегрелся ли двигатель (тормоза страницы), и на каком именно участке дороги стало плохо (какой сервис тормозит). Для фронтенда это набор инструментов, которые непрерывно рассказывают, что происходит у **реальных пользователей** в их браузерах, а не только на твоём ноутбуке.

Идея простая: собрать три вида сигналов (ошибки, скорость, путь запроса), а потом настроить умные оповещения, чтобы тебя будили только по важному, а не по каждому чиху.

### Три столпа наблюдаемости

Observability на фронтенде держится на трёх видах данных:

- **Errors (ошибки)** — инструменты вроде **Sentry** или **Bugsnag** ловят непойманные исключения, «оборванные» промисы (\`unhandledrejection\` — это когда \`Promise\` упал с ошибкой, а её никто не обработал) и ошибки фреймворка. Похожие ошибки группируются по **fingerprint** («отпечатку» — набору признаков, по которому система понимает, что это одна и та же проблема) и привязываются к конкретному **release** (версии сборки).
- **RUM (Real User Monitoring)** — «мониторинг реальных пользователей». Он замеряет настоящие **Core Web Vitals** (ключевые метрики скорости от Google) на устройствах живых людей. Главные: **LCP** (Largest Contentful Paint — когда отрисовался самый крупный элемент, ощущение «страница загрузилась»), **INP** (Interaction to Next Paint — насколько быстро страница отвечает на клики) и **CLS** (Cumulative Layout Shift — насколько дёргается вёрстка). Смотреть надо не среднее, а **перцентили**, обычно **p75** (значение, хуже которого только у 25% пользователей) — так видно опыт большинства, а не идеального случая.
- **Tracing (трассировка)** — распределённые трейсы, которые связывают один запрос из браузера с работой бэкенда через специальный заголовок \`traceparent\` (стандарт W3C Trace Context / OpenTelemetry).

Важно: RUM — это НЕ лабораторный Lighthouse. Lighthouse гоняется на одной «стерильной» машине, а RUM показывает реальность на дешёвых телефонах и плохих сетях. Данные полезно **сегментировать** по устройству, географии и релизу, чтобы видеть, у кого именно проблема.

### Source maps — почему без них никак

Когда код едет в прод, он **минифицируется**: имена переменных сжимаются до \`a\`, \`b\`, всё в одну строку. Если такая версия упадёт, стек-трейс (список вызовов, приведших к ошибке) будет нечитаемым мусором.

**Source map** — это файл-«переводчик», который сопоставляет минифицированный код обратно с твоим исходником. Ключевой момент: source maps **загружаются в Sentry на этапе CI** (во время сборки), а **не публикуются на проде** — иначе любой сможет скачать твой исходный код. Sentry потом сам «расшифрует» (символицирует) стек по этим картам.

Привязка идёт по паре \`release\` + \`dist\`. Если версия релиза в коде не совпадёт с версией загруженных source maps — расшифровка сломается, и ты снова получишь нечитаемый стек. Поэтому корректный version-контроль релизов критичен.

### Distributed tracing на практике

Представь эстафету. Браузер стартует **span** (отрезок трассы — «участок пути с таймингом») на вызове \`fetch\`, кладёт в запрос заголовок \`traceparent\`, и бэкенд подхватывает **тот же самый** trace и продолжает его своими span'ами.

В итоге ты видишь весь путь запроса из конца в конец: «медленный LCP на странице» → и сразу понятно, что виноват конкретный медленный downstream-сервис (нижестоящий сервис, к которому обращается бэкенд). Без трассировки ты бы только знал «медленно», но не знал бы, где именно.

### Sampling и стоимость

Собирать 100% всех трейсов на большом проде — это гигантский счёт за телеметрию. Поэтому используют **sampling** (выборку): \`tracesSampleRate\` 0.1–0.2 означает «сохраняй 10–20% трейсов». Плюс **хвостовое семплирование** (tail sampling) — умный приём: решение «сохранять или нет» принимается уже после запроса, чтобы гарантированно оставить все трейсы с ошибками, даже если общий процент низкий.

### Пример настройки

\`\`\`ts
Sentry.init({
  dsn: env.dsn,
  release: env.gitSha,                 // должен совпадать с загруженными source maps
  tracesSampleRate: 0.15,              // семплирование распределённых трейсов
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [/^\\/api\\//], // добавлять traceparent только к нашему API
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Script error.'],
  beforeSend(event) {                  // вычищаем PII до отправки из браузера
    if (event.request?.url) event.request.url = stripQuery(event.request.url);
    return event;
  },
});
// Шаг CI (не попадает в прод): sentry-cli sourcemaps upload --release $GIT_SHA ./dist
\`\`\`

Здесь \`release\` привязывает ошибки к версии, \`tracePropagationTargets\` следит, чтобы заголовок трассировки добавлялся только к своим запросам (а не улетал на чужие домены), \`ignoreErrors\` глушит известный шум, а \`beforeSend\` — это хук, который срабатывает перед отправкой каждого события и позволяет вырезать лишнее.

## ⚠️ Подводные камни

- **Утечки PII** (персональных данных): Sentry по умолчанию шлёт URL, а иногда и тела запросов. Настрой очистку в \`beforeSend\` — это требование GDPR.
- **Sampling**: 100% трейсов на проде = огромный счёт. Держи \`tracesSampleRate\` 0.1–0.2 и добавь хвостовое семплирование ошибок.
- **Шум**: ошибки от расширений браузера и ботов (\`ResizeObserver loop\`, \`Script error.\`) захламляют дашборд. Глуши их через \`ignoreErrors\` / \`denyUrls\`, иначе метрики бесполезны.
- **Quota / rate limiting**: при шторме ошибок провайдер начнёт их резать, и это замаскирует настоящую проблему под общим потоком.

## 🎯 Запомни

- Три столпа фронтенд-observability: **ошибки**, **RUM (Core Web Vitals по p75)** и **распределённые трейсы**.
- **Source maps грузятся в Sentry на CI, а не на прод**, и должны совпадать с \`release\` — иначе стеки нечитаемы.
- Всегда **семпли трейсы** и **чисти PII**, иначе получишь огромный счёт и штраф GDPR.
- Алёрть на **регрессию p75 INP/LCP по релизу** и на всплеск error-rate, а не на единичные абсолютные ошибки.`,
      en: `## 🧩 In plain words

Observability is like the dashboard in your car. While driving, you want to see whether a warning light came on (an error), whether the engine is overheating (the page is slow), and exactly where on the road things went bad (which service is dragging). For the frontend, it's a set of tools that continuously tell you what's happening for **real users** in their browsers — not just on your laptop.

The idea is simple: collect three kinds of signals (errors, speed, the path of a request), then set up smart alerts so you're woken only for what matters, not for every hiccup.

### The three pillars of observability

Frontend observability rests on three kinds of data:

- **Errors** — tools like **Sentry** or **Bugsnag** catch uncaught exceptions, rejected promises (\`unhandledrejection\` — when a \`Promise\` fails and nobody handles the error), and framework errors. Similar errors are grouped by **fingerprint** (a signature the system uses to decide "this is the same problem") and tied to a specific **release** (build version).
- **RUM (Real User Monitoring)** — it measures the real **Core Web Vitals** (Google's key speed metrics) on the devices of actual people. The main ones: **LCP** (Largest Contentful Paint — when the biggest element renders, the "page loaded" feeling), **INP** (Interaction to Next Paint — how quickly the page responds to clicks), and **CLS** (Cumulative Layout Shift — how much the layout jumps around). Don't look at the average — look at **percentiles**, usually **p75** (the value that only 25% of users see something worse than). That reflects the majority's experience, not the lucky case.
- **Tracing** — distributed traces that link one browser request to the backend's work via a special \`traceparent\` header (the W3C Trace Context / OpenTelemetry standard).

Important: RUM is NOT lab Lighthouse. Lighthouse runs on one sterile machine; RUM shows reality on cheap phones and bad networks. It helps to **segment** the data by device, geography, and release so you can see who exactly is affected.

### Source maps — why you can't skip them

When code ships to prod it gets **minified**: variable names shrink to \`a\`, \`b\`, everything on one line. If that version crashes, the stack trace (the list of calls that led to the error) is unreadable garbage.

A **source map** is a "translator" file that maps minified code back to your original source. The key point: source maps are **uploaded to Sentry during CI** (at build time) and are **not published to prod** — otherwise anyone could download your source code. Sentry then "de-obfuscates" (symbolicates) the stack using those maps.

The link is the \`release\` + \`dist\` pair. If the release version in your code doesn't match the version of the uploaded source maps, symbolication breaks and you're back to an unreadable stack. That's why correct release versioning is critical.

### Distributed tracing in practice

Picture a relay race. The browser starts a **span** (a segment of the trace — "a leg of the journey with timing") on a \`fetch\` call, puts a \`traceparent\` header into the request, and the backend picks up the **same** trace and continues it with its own spans.

The result: you see the request's full path end to end: "slow LCP on this page" → and it's immediately clear that a specific slow downstream service (a service the backend calls) is to blame. Without tracing you'd only know "it's slow" but not where.

### Sampling and cost

Collecting 100% of all traces on a large prod system means a huge telemetry bill. So you use **sampling**: \`tracesSampleRate\` 0.1–0.2 means "keep 10–20% of traces." Plus **tail sampling** — a clever trick where the keep-or-drop decision is made after the request finishes, so you guarantee that all traces with errors are kept even when the overall rate is low.

### Setup example

\`\`\`ts
Sentry.init({
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
// CI step (not shipped to prod): sentry-cli sourcemaps upload --release $GIT_SHA ./dist
\`\`\`

Here \`release\` ties errors to a version, \`tracePropagationTargets\` ensures the trace header is attached only to your own requests (not leaked to third-party domains), \`ignoreErrors\` silences known noise, and \`beforeSend\` is a hook that runs before each event is sent, letting you strip out anything sensitive.

## ⚠️ Common pitfalls

- **PII leaks** (personal data): Sentry sends URLs, and sometimes request bodies, by default. Configure scrubbing in \`beforeSend\` — this is a GDPR requirement.
- **Sampling**: 100% of traces in prod = a huge bill. Keep \`tracesSampleRate\` at 0.1–0.2 and add tail-sampling of errors.
- **Noise**: errors from browser extensions and bots (\`ResizeObserver loop\`, \`Script error.\`) clutter the dashboard. Silence them via \`ignoreErrors\` / \`denyUrls\`, or the metrics are useless.
- **Quota / rate limiting**: during an error storm the provider starts dropping events, which masks the real problem inside the flood.

## 🎯 Key takeaways

- The three pillars of frontend observability: **errors**, **RUM (Core Web Vitals at p75)**, and **distributed traces**.
- **Source maps are uploaded to Sentry in CI, not to prod**, and must match the \`release\` — otherwise stacks are unreadable.
- Always **sample traces** and **scrub PII**, or you'll get a giant bill and a GDPR violation.
- Alert on a **per-release p75 INP/LCP regression** and on error-rate spikes, not on isolated absolute errors.`,
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
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['oauth2', 'oidc', 'pkce', 'token-storage'],
    question: {
      ru: 'Глубоко об аутентификации SPA: OAuth2/OIDC, PKCE, хранение токенов, silent refresh, CSRF.',
      en: 'Deep dive on SPA auth: OAuth2/OIDC, PKCE, token storage, silent refresh, and CSRF.',
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь клуб с фейс-контролем. OAuth2 — это правила, по которым тебе выдают **браслет на руку** (токен), чтобы пускать к бару, к танцполу и т.д. OIDC добавляет **паспорт на входе** — подтверждение, кто ты вообще такой. А главный головняк для SPA (одностраничного приложения, которое живёт целиком в браузере) — где хранить этот браслет, чтобы его не украл вор.

Вся тема сводится к одному честному признанию: **абсолютно безопасного места для токена в браузере не существует**. Ты просто выбираешь, от какой угрозы защищаешься сильнее.

### Поток авторизации для SPA

Современный стандарт — **Authorization Code Flow + PKCE**.

**Authorization Code Flow** — схема, где приложение сначала получает временный «код», а потом меняет его на токен. Старый **Implicit flow** устарел, потому что он клал токен прямо в URL-фрагмент (часть адреса после \`#\`) — а оттуда его легко украсть (история браузера, логи, \`Referer\`).

**PKCE** (Proof Key for Code Exchange, произносится «пикси») защищает **публичного клиента** — то есть приложение, у которого нет секретного ключа (в браузере любой секрет виден всем, поэтому его там просто нет). Как работает:

1. Клиент генерит случайную строку — \`code_verifier\`.
2. Считает от неё хэш SHA-256 — это \`code_challenge\` — и отправляет только хэш при запросе кода.
3. Когда меняет код на токен, предъявляет исходный \`code_verifier\`.

Смысл: даже если злоумышленник перехватит код, без \`code_verifier\` он бесполезен — обменять его не выйдет. Это как отдать код только тому, кто знает пароль, придуманный в самом начале.

### OIDC поверх OAuth2

Легко путать, но разница фундаментальная:

- **OAuth2 = авторизация** — «что тебе разрешено делать» (доступ к API). Он выдаёт \`access_token\`.
- **OIDC (OpenID Connect) = аутентификация** — «кто ты» — надстройка над OAuth2. Она добавляет \`id_token\` (это **JWT** — JSON Web Token, подписанный токен с полями-**claims** о пользователе: имя, email, id).

Важное правило: **не используй \`access_token\` для идентификации пользователя**. Он предназначен для доступа к ресурсам, а не для ответа на вопрос «кто это». Для «кто это» есть \`id_token\`.

### Хранение токенов — главный спор

Это самая горячая часть темы. Варианты:

- **localStorage** — хранилище в браузере, доступное **любому JavaScript** на странице. Значит, оно **уязвимо к XSS** (Cross-Site Scripting — атака, когда чужой скрипт исполняется на твоей странице; украл скрипт токен — украл сессию). Удобно, но небезопасно.
- **httpOnly + Secure + SameSite cookie** — cookie с флагом \`httpOnly\` **не читается из JavaScript**. Значит, XSS не может украсть токен. Но появляется другой вектор — **CSRF** (Cross-Site Request Forgery, о нём ниже). Флаг \`Secure\` = только по HTTPS, \`SameSite\` ограничивает отправку cookie на чужие сайты.
- **BFF / token-handler pattern** — считается лучшим для веба. **BFF** (Backend For Frontend) — это твой лёгкий бэкенд-посредник. Реальные токены живут на нём, а браузер держит только обычную сессионную \`httpOnly\`-cookie. Клиентский JS вообще никогда не трогает access-token.
- **Компромисс**: access-token хранить в памяти (обычная переменная JS, исчезает при перезагрузке), а refresh-token — в \`httpOnly\`-cookie.

### Silent refresh — тихое обновление

Access-token делают **короткоживущим** (5–15 минут) — чтобы украденный токен быстро протух. Но пользователя нельзя разлогинивать каждые 10 минут, поэтому есть **refresh-token**, которым молча получают новый access.

Правильный современный способ — **refresh-token rotation** (ротация): при каждом обновлении старый refresh аннулируется и выдаётся новый, через \`httpOnly\`-cookie на бэкенде (не в JS!). Старый способ через скрытый iframe (\`silent renew\`) сейчас ломается, потому что браузеры блокируют third-party cookies (сторонние cookie).

### CSRF — и когда он вообще опасен

**CSRF** (подделка межсайтового запроса) — атака, где чужой сайт заставляет твой браузер отправить запрос на сервер, к которому ты залогинен, используя твои cookie автоматически. Ключевой момент: **CSRF возможен только при cookie-based auth** (когда браузер сам прикрепляет cookie к запросу).

Защита:

- \`SameSite=Lax\` или \`Strict\` — cookie не отправляется на межсайтовых запросах.
- **double-submit token** — секрет, который лежит и в cookie, и в заголовке; сервер сверяет.
- Проверка заголовка \`Origin\`.

Если же токен передаётся в заголовке \`Authorization: Bearer ...\`, а не в cookie — CSRF неактуален (браузер не прикрепляет заголовок сам). Но тогда токен снова доступен JS → возвращается риск XSS. Замкнутый круг.

### Пример: PKCE и BFF

\`\`\`ts
// PKCE: выводим challenge из случайного verifier
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(digest));
// authorize: редирект с code_challenge=<challenge>&code_challenge_method=S256
// обмен кода: POST code + code_verifier=<verifier>  — доказывает владение

// Token-handler/BFF: клиент вообще не касается access-token
// GET /bff/me  ->  cookie: session=<httpOnly>  ->  BFF сам добавляет Bearer к upstream
\`\`\`

Здесь видно суть PKCE (хэш вперёд, секрет потом) и суть BFF (браузер знает только про безобидную сессионную cookie, а Bearer-токен добавляет сервер-посредник по пути к upstream — вышестоящему API).

## ⚠️ Подводные камни

- Не путай \`access_token\` и \`id_token\`: первый — «что можно», второй — «кто ты».
- «Безопасного localStorage» не бывает — это всегда XSS-риск.
- Long-lived access-token — плохо: украли один раз, пользуются долго. Держи их короткими + refresh с ротацией.
- Silent renew через iframe умирает из-за блокировки third-party cookies — не строй на нём новое.
- Ушёл от cookie к заголовку \`Authorization\` — избавился от CSRF, но вернул XSS. Это всегда размен, а не победа.

## 🎯 Запомни

- Для SPA — **только Authorization Code Flow + PKCE**; Implicit flow мёртв.
- **OAuth2 = авторизация, OIDC = аутентификация** (\`id_token\` для «кто это»).
- Хранение токенов — это выбор **XSS-риск vs CSRF-риск**; идеального места нет.
- Для серьёзных продуктов бери **BFF/token-handler** и не держи токены в JS-доступной памяти дольше необходимого.`,
      en: `## 🧩 In plain words

Picture a club with a bouncer. OAuth2 is the rules for handing you a **wristband** (a token) so you can get into the bar, the dance floor, and so on. OIDC adds a **passport check at the door** — proof of who you actually are. And the big headache for a SPA (a single-page app that lives entirely in the browser) is where to keep that wristband so a thief can't grab it.

The whole topic comes down to one honest admission: **there is no perfectly safe place for a token in the browser**. You're just choosing which threat to defend against more.

### The authorization flow for SPAs

The modern standard is **Authorization Code Flow + PKCE**.

**Authorization Code Flow** is the scheme where the app first receives a temporary "code" and then exchanges it for a token. The old **Implicit flow** is deprecated because it put the token straight into the URL fragment (the part of the address after \`#\`) — where it's easy to steal (browser history, logs, the \`Referer\` header).

**PKCE** (Proof Key for Code Exchange, pronounced "pixie") protects a **public client** — an app with no secret key (in a browser any secret is visible to everyone, so there simply isn't one). How it works:

1. The client generates a random string — the \`code_verifier\`.
2. It computes a SHA-256 hash of it — the \`code_challenge\` — and sends only the hash when requesting the code.
3. When it exchanges the code for a token, it presents the original \`code_verifier\`.

The point: even if an attacker intercepts the code, it's useless without the \`code_verifier\` — they can't exchange it. It's like handing the code only to someone who knows a password made up at the very start.

### OIDC on top of OAuth2

Easy to confuse, but the difference is fundamental:

- **OAuth2 = authorization** — "what you're allowed to do" (API access). It issues an \`access_token\`.
- **OIDC (OpenID Connect) = authentication** — "who you are" — a layer on top of OAuth2. It adds an \`id_token\` (a **JWT** — JSON Web Token, a signed token holding **claims** about the user: name, email, id).

Key rule: **don't use the \`access_token\` to identify the user**. It's meant for accessing resources, not for answering "who is this." For "who is this," use the \`id_token\`.

### Token storage — the core debate

This is the hottest part of the topic. The options:

- **localStorage** — browser storage readable by **any JavaScript** on the page. That means it's **vulnerable to XSS** (Cross-Site Scripting — an attack where a foreign script runs on your page; steal the script's access, steal the token). Convenient but unsafe.
- **httpOnly + Secure + SameSite cookie** — a cookie with the \`httpOnly\` flag **can't be read from JavaScript**. So XSS can't steal the token. But you introduce another vector — **CSRF** (below). \`Secure\` means HTTPS-only; \`SameSite\` limits sending the cookie to other sites.
- **BFF / token-handler pattern** — considered best for the web. A **BFF** (Backend For Frontend) is your thin backend intermediary. The real tokens live on it, and the browser holds only an ordinary session \`httpOnly\` cookie. Client JS never touches the access token at all.
- **Compromise**: keep the access token in memory (a plain JS variable, gone on reload), and the refresh token in an \`httpOnly\` cookie.

### Silent refresh

Access tokens are made **short-lived** (5–15 minutes) so a stolen one expires fast. But you can't log the user out every 10 minutes, so there's a **refresh token** used to silently obtain a new access token.

The correct modern approach is **refresh-token rotation**: on every renewal the old refresh token is invalidated and a new one issued, via a backend \`httpOnly\` cookie (not in JS!). The old hidden-iframe approach (\`silent renew\`) now breaks because browsers block third-party cookies.

### CSRF — and when it's actually dangerous

**CSRF** (Cross-Site Request Forgery) is an attack where another site makes your browser send a request to a server you're logged into, using your cookies automatically. The key point: **CSRF is only possible with cookie-based auth** (when the browser attaches the cookie itself).

Defenses:

- \`SameSite=Lax\` or \`Strict\` — the cookie isn't sent on cross-site requests.
- **double-submit token** — a secret placed both in a cookie and in a header; the server compares them.
- Checking the \`Origin\` header.

If the token is instead sent in an \`Authorization: Bearer ...\` header rather than a cookie, CSRF is moot (the browser doesn't attach the header itself). But then the token is JS-reachable again → the XSS risk returns. A vicious circle.

### Example: PKCE and BFF

\`\`\`ts
// PKCE: derive the challenge from a random verifier
const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(digest));
// authorize: redirect with code_challenge=<challenge>&code_challenge_method=S256
// token exchange: POST code + code_verifier=<verifier>  — proves possession

// Token-handler/BFF: client never touches the access token
// GET /bff/me  ->  cookie: session=<httpOnly>  ->  BFF attaches Bearer to upstream
\`\`\`

This shows the essence of PKCE (hash first, secret later) and of the BFF (the browser only knows a harmless session cookie, while the intermediary server attaches the Bearer token on the way to upstream — the higher-level API).

## ⚠️ Common pitfalls

- Don't confuse \`access_token\` and \`id_token\`: the first is "what you can do," the second is "who you are."
- There's no "safe localStorage" — it's always an XSS risk.
- A long-lived access token is bad: stolen once, abused for a long time. Keep them short + refresh with rotation.
- Iframe-based silent renew is dying due to third-party cookie blocking — don't build anything new on it.
- Moving from a cookie to the \`Authorization\` header removes CSRF but brings XSS back. It's always a trade-off, not a win.

## 🎯 Key takeaways

- For SPAs, use **Authorization Code Flow + PKCE only**; Implicit flow is dead.
- **OAuth2 = authorization, OIDC = authentication** (\`id_token\` for "who is this").
- Token storage is a choice between **XSS risk vs CSRF risk**; there's no perfect place.
- For serious products use a **BFF/token-handler** and don't keep tokens in JS-reachable memory longer than necessary.`,
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
    category: 'architecture-testing',
    level: 'Expert',
    tags: ['csp', 'sri', 'supply-chain-security'],
    question: {
      ru: 'Как Content Security Policy, SRI и борьба с supply-chain атаками защищают фронтенд?',
      en: 'How do Content Security Policy, SRI, and supply-chain defenses protect the frontend?',
    },
    answer: {
      ru: `## 🧩 Простыми словами

Представь, что твой сайт — это дом. XSS (внедрение чужого скрипта) — это когда вор пробрался внутрь. Идея «защиты в глубину» в том, чтобы даже пробравшийся вор не смог ничего сделать: двери комнат заперты (CSP), на посылках стоят пломбы (SRI), а поставщиков ты проверяешь, чтобы они сами не подсунули закладку (supply-chain защита).

Три инструмента этой темы: **CSP** ограничивает, какому коду вообще позволено выполняться; **SRI** проверяет, что скачанный файл не подменили; а **supply-chain защита** следит за тем, чтобы зараза не приехала внутри твоих же зависимостей.

### CSP — защита от XSS «в глубину»

**CSP** (Content Security Policy, политика безопасности контента) — это HTTP-заголовок, который говорит браузеру: «скрипты, стили и сетевые запросы разрешены только отсюда». Даже если злоумышленник смог внедрить свой скрипт на страницу, CSP может **не дать ему выполниться**. Это второй рубеж обороны — «в глубину».

Как настраивать правильно:

- \`script-src 'self'\` — разрешает скрипты только со своего домена, блокирует inline-скрипты (написанные прямо в HTML) и сторонние. Если inline всё же нужен, разрешай его через **nonce** — случайное одноразовое число (\`'nonce-abc'\`), которое генерится на **каждый** запрос и ставится и в заголовок, и в тег \`<script>\`; либо через **hash** содержимого. Но **не** через \`'unsafe-inline'\` — это по сути «разрешить всё» и убивает смысл CSP.
- Избегай \`'unsafe-eval'\` — он разрешает \`eval()\` и динамическую генерацию кода. Angular в режиме **AOT** (Ahead-of-Time компиляция — шаблоны компилируются заранее, при сборке) его не требует.
- \`'strict-dynamic'\` + nonce — современный «правильный» CSP: доверенный скрипт может подгружать другие, и тебе не нужно вести белый список хостов вручную.
- Начинай с режима **\`Content-Security-Policy-Report-Only\`** плюс \`report-uri\` (адрес, куда браузер шлёт отчёты о нарушениях). В этом режиме политика **ничего не блокирует**, только сообщает, что бы она заблокировала. Так ты не сломаешь прод, соберёшь список нарушений, а потом переключишься в боевой enforce-режим.

### SRI (Subresource Integrity)

**SRI** (целостность подресурсов) — механизм: \`<script integrity="sha384-..." crossorigin>\`. Ты заранее прописываешь ожидаемый хэш файла. Браузер скачивает файл, считает его хэш и сверяет. Если CDN (сеть доставки контента, откуда грузится библиотека) взломали и подменили файл — хэши не совпадут, и скрипт **просто не выполнится**.

Это обязательно для скриптов, которые грузятся с внешних CDN: ты им доверяешь, но SRI даёт гарантию, что доверяешь именно тем байтам, которые проверил.

### Supply-chain атаки

Главная угроза 2020-х. **Supply-chain атака** (атака на цепочку поставок) — это когда вредоносный код не в **твоём** коде, а в **зависимости**, которую ты подключил. Ты сам, ничего не подозревая, притаскиваешь заразу через \`npm install\`. Реальные примеры: пакеты \`event-stream\`, \`ua-parser-js\`, а также **typosquatting** (злоумышленник публикует пакет с именем, похожим на популярное, в расчёте на опечатку) и **hijack мейнтейнера** (угон аккаунта автора пакета).

Как защищаться:

- **Lockfile** (\`package-lock.json\`) + команда \`npm ci\` — она ставит строго те версии, что записаны в lockfile. Никаких «плавающих» версий на проде, где \`^1.2.0\` может внезапно подтянуть заражённый \`1.2.9\`.
- **Аудит**: \`npm audit\`, а также Snyk / Socket в CI. Флаг \`--ignore-scripts\` не даёт исполняться \`postinstall\`-скриптам пакетов (частый путь заражения — вредонос в скрипте установки).
- **SBOM** (Software Bill of Materials, «список ингредиентов» ПО, формат CycloneDX) и **provenance / sigstore** — криптографическое подтверждение, что пакет собран из того исходника, что заявлен.
- Минимизируй дерево зависимостей: каждый transitive-пакет (подтянутый не тобой напрямую, а твоей зависимостью) — это дополнительная поверхность атаки.

### Пример: строгий CSP и SRI

\`\`\`html
<!-- Сильный CSP на основе nonce (ставится сервером на каждый ответ):
 Content-Security-Policy:
   default-src 'self';
   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
   object-src 'none'; base-uri 'self';
   report-to csp-endpoint -->
<script nonce="r4Nd0m" src="/main.js"></script>

<!-- SRI фиксирует точные байты CDN-ресурса -->
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
\`\`\`

Обрати внимание: \`object-src 'none'\` запрещает опасные плагины, \`base-uri 'self'\` мешает подмене базового URL, \`nonce-r4Nd0m\` в заголовке и в теге должны совпадать (и меняться на каждый запрос).

## ⚠️ Подводные камни

- Слишком слабый CSP с \`'unsafe-inline'\` — это театр безопасности: выглядит как защита, но не защищает.
- SRI на файле, который на CDN часто обновляют, **сломает загрузку** при легитимном обновлении (хэш изменится). SRI хорош для запинованных, неизменных версий.
- \`npm audit\` тонет в шуме из low-severity transitive-уязвимостей → усталость, и люди начинают всё игнорировать. Приоритизируй **достижимые** (реально эксплуатируемые в твоём коде) уязвимости.

## 🎯 Запомни

- **CSP** — второй рубеж от XSS: даже внедрённый скрипт не выполнится. Используй **nonce + \`'strict-dynamic'\`**, а не \`'unsafe-inline'\`.
- Внедряй CSP через **Report-Only**, потом переключай на enforce.
- **SRI** гарантирует, что скрипт с CDN — именно тот, что ты проверил.
- Главная современная угроза — **supply-chain**: lockfile + \`npm ci\`, аудит, \`--ignore-scripts\`, минимум зависимостей.`,
      en: `## 🧩 In plain words

Imagine your site is a house. XSS (injecting a foreign script) is a burglar getting inside. The idea of "defense in depth" is that even a burglar who got in can't do anything: the room doors are locked (CSP), the parcels have tamper seals (SRI), and you vet your suppliers so they don't slip a booby trap into the goods themselves (supply-chain defense).

The three tools of this topic: **CSP** restricts what code is even allowed to run; **SRI** verifies a downloaded file wasn't swapped; and **supply-chain defense** makes sure the infection doesn't arrive inside your own dependencies.

### CSP — defense-in-depth against XSS

**CSP** (Content Security Policy) is an HTTP header that tells the browser: "scripts, styles, and network requests are only allowed from here." Even if an attacker manages to inject their script into the page, CSP can **prevent it from executing**. That's the second line of defense — "in depth."

How to configure it correctly:

- \`script-src 'self'\` allows scripts only from your own domain, blocking inline scripts (written directly in the HTML) and third-party ones. If you truly need inline, allow it via a **nonce** — a random one-time number (\`'nonce-abc'\`) generated on **every** request and placed in both the header and the \`<script>\` tag; or via a content **hash**. But **not** via \`'unsafe-inline'\` — that's essentially "allow everything" and kills the point of CSP.
- Avoid \`'unsafe-eval'\` — it permits \`eval()\` and dynamic code generation. Angular in **AOT** mode (Ahead-of-Time compilation — templates compiled in advance, at build) doesn't need it.
- \`'strict-dynamic'\` + nonce is the modern "correct" CSP: a trusted script may load others, and you don't have to maintain a host whitelist by hand.
- Start in **\`Content-Security-Policy-Report-Only\`** mode plus a \`report-uri\` (the address the browser sends violation reports to). In this mode the policy **blocks nothing** — it only reports what it would have blocked. That way you don't break prod, you collect the list of violations, and then you switch to the enforcing mode.

### SRI (Subresource Integrity)

**SRI** is a mechanism: \`<script integrity="sha384-..." crossorigin>\`. You write down the file's expected hash in advance. The browser downloads the file, computes its hash, and compares. If a CDN (the content delivery network the library loads from) is hacked and the file is swapped, the hashes won't match and the script **simply won't run**.

This is mandatory for scripts loaded from external CDNs: you trust them, but SRI guarantees you're trusting exactly the bytes you verified.

### Supply-chain attacks

The dominant 2020s threat. A **supply-chain attack** is when the malicious code is not in **your** code but in a **dependency** you pulled in. You unknowingly bring the infection in yourself via \`npm install\`. Real examples: the \`event-stream\` and \`ua-parser-js\` packages, plus **typosquatting** (an attacker publishes a package with a name close to a popular one, banking on a typo) and **maintainer hijack** (taking over a package author's account).

How to defend:

- **Lockfile** (\`package-lock.json\`) + the \`npm ci\` command — it installs exactly the versions recorded in the lockfile. No "floating" versions in prod, where \`^1.2.0\` could suddenly pull in an infected \`1.2.9\`.
- **Audit**: \`npm audit\`, plus Snyk / Socket in CI. The \`--ignore-scripts\` flag stops packages' \`postinstall\` scripts from running (a common infection path — malware in the install script).
- **SBOM** (Software Bill of Materials, an "ingredient list" for software, the CycloneDX format) and **provenance / sigstore** — cryptographic proof that a package was built from the source it claims.
- Minimize the dependency tree: every transitive package (one pulled in not by you directly but by your dependency) is extra attack surface.

### Example: a strong CSP and SRI

\`\`\`html
<!-- Strong, nonce-based CSP (set per-response on the server):
 Content-Security-Policy:
   default-src 'self';
   script-src 'self' 'nonce-r4Nd0m' 'strict-dynamic';
   object-src 'none'; base-uri 'self';
   report-to csp-endpoint -->
<script nonce="r4Nd0m" src="/main.js"></script>

<!-- SRI pins the exact bytes of a CDN asset -->
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
\`\`\`

Note: \`object-src 'none'\` bans dangerous plugins, \`base-uri 'self'\` prevents base-URL hijacking, and the \`nonce-r4Nd0m\` in the header and the tag must match (and change on every request).

## ⚠️ Common pitfalls

- A too-weak CSP with \`'unsafe-inline'\` is security theater: it looks like protection but protects nothing.
- SRI on a file the CDN updates often will **break loading** on a legitimate update (the hash changes). SRI is best for pinned, immutable versions.
- \`npm audit\` drowns in noise from low-severity transitive vulnerabilities → fatigue, and people start ignoring everything. Prioritize **reachable** (actually exploitable in your code) vulnerabilities.

## 🎯 Key takeaways

- **CSP** is the second line against XSS: even an injected script won't run. Use **nonce + \`'strict-dynamic'\`**, not \`'unsafe-inline'\`.
- Roll out CSP via **Report-Only**, then switch to enforce.
- **SRI** guarantees a script from a CDN is exactly the one you verified.
- The dominant modern threat is **supply-chain**: lockfile + \`npm ci\`, auditing, \`--ignore-scripts\`, minimal dependencies.`,
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
      ru: `## 🧩 Простыми словами

Представь, что у тебя есть допустимый вес рюкзака в походе. Каждый раз кто-то хочет докинуть «всего одну баночку», и незаметно рюкзак весит на 10 кг больше. **Performance budget** — это весы на входе: если сборка превысила потолок (по размеру или по скорости), сборка **падает**, и ты видишь проблему прямо в pull request'е, а не через месяц на проде, когда всё уже тормозит.

Идея в том, чтобы производительность деградировала не втихую, а громко и сразу — пока изменение ещё маленькое и понятно, кто его добавил.

### Зачем вообще нужны бюджеты

Производительность почти никогда не падает сразу. Она деградирует **постепенно**: тут +10 КБ, там +1 зависимость. По отдельности каждое изменение «незаметное», а через полгода сайт тормозит, и уже не найти, кто виноват.

**Performance budget** — это **жёсткий потолок** на какую-то метрику (размер бандла, LCP, TBT). Его нарушение **ломает CI** (автоматическую сборку/проверку). Смысл — сделать регрессию (ухудшение) видимой сразу в PR.

Расшифруем метрики: **LCP** (Largest Contentful Paint) — время отрисовки самого крупного элемента, «страница выглядит загруженной». **TBT** (Total Blocking Time) — суммарное время, когда главный поток был заблокирован и не отвечал на клики. **CLS** (Cumulative Layout Shift) — насколько скачет вёрстка при загрузке.

### Два уровня бюджетов

1. **Bundle budgets (бюджеты на размер бандла)** — быстрые и детерминированные (всегда дают один и тот же результат). В Angular задаются в \`angular.json\` в секции \`budgets\`: \`maximumError\` на \`initial\` (начальный бандл) и на стили компонентов. Ловят ситуацию «случайно затащил в бандл тяжёлую библиотеку вроде moment.js». Это просто измерение байтов — никакого шума.
2. **Lighthouse CI (LHCI)** — про реальные метрики скорости. Прогоняет Lighthouse на каждый PR и проверяет (**ассертит**) конкретные значения: \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\`, общий performance-score.

### Как встроить в пайплайн

- LHCI поднимает превью-сборку, гоняет её **несколько раз** и берёт **медиану** — потому что Lighthouse шумный, один прогон может случайно «повезти» или «не повезти». Затем сравнивает результат с бюджетом из файла \`lighthouserc.js\`. В блоке \`assertions\` каждая метрика помечается как \`error\` (роняет сборку) или \`warn\` (только предупреждает).
- Мерить в CI лучше **лабораторно и детерминированно** — со стабильным throttling'ом CPU и сети (искусственным замедлением до фиксированного уровня), чтобы результат зависел от кода, а не от загрузки раннера. А **тренды** в реальности лучше смотреть через **RUM** (Real User Monitoring — метрики от живых пользователей) на проде. Разделение труда: лаборатория ловит регрессии до релиза, RUM показывает, как оно на самом деле у людей.

### Пример настройки

\`\`\`js
// angular.json — жёсткий бюджет на размер бандла, роняет сборку
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumError": "6kb" }
]

// lighthouserc.js — бюджеты на метрики в CI
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },                 // медиана; Lighthouse шумный
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

Здесь bundle-бюджет упадёт, если initial-бандл превысит 1 МБ. А LHCI провалит сборку, если медианный LCP хуже 2500 мс или TBT хуже 300 мс, но по CLS только предупредит (\`warn\`) — потому что CLS в CI обычно нестабилен.

## ⚠️ Подводные камни

- **Флакость (нестабильность)**: Lighthouse на шумном CI-раннере скачет на ±5–10 баллов → ложные падения, которые бесят команду. Лечение: медиана из N прогонов, \`warn\` вместо \`error\` на нестабильных метриках, выделенный (dedicated) раннер.
- **Бюджет «на отвал»**: слишком щедрый потолок ничего не ловит; слишком жёсткий — люди начнут его отключать в обход. Калибруй от текущего значения плюс небольшой запас и ужесточай **постепенно** (приём «ratchet» — храповик, только в сторону строже).
- **Только общий score без ассертов по каждой метрике** опасен: падение одной метрики можно «замаскировать» ростом другой, и общий балл не изменится. Ассерть отдельные метрики.

### Когда достаточно малого

Не всё требует тяжёлой машинерии. Для простого лендинга хватит одного bundle-budget. Полноценный Lighthouse CI окупается на продуктовых SPA — там, где есть команда, частые изменения и уже была история регрессий.

## 🎯 Запомни

- Performance budget — это **жёсткий потолок, который роняет CI**, чтобы ловить регрессии в PR, а не на проде.
- Два уровня: **bundle budgets** (быстро, детерминированно) и **Lighthouse CI** (метрики, но шумно → медиана из N).
- Мерь в CI **лабораторно**, а тренды смотри через **RUM** на проде.
- Калибруй бюджеты от текущих значений и **ужесточай постепенно** (ratchet); не делай их беззубыми и не делай флакистыми.`,
      en: `## 🧩 In plain words

Imagine you have a weight limit for a hiking backpack. Every time someone wants to toss in "just one more can," and the backpack quietly ends up 10 kg heavier. A **performance budget** is a scale at the entrance: if the build exceeds the ceiling (in size or speed), the build **fails**, and you see the problem right in the pull request — not a month later in prod when everything is already sluggish.

The idea is to make performance decay loud and immediate rather than quiet — while the change is still small and it's clear who added it.

### Why budgets exist at all

Performance almost never drops all at once. It decays **gradually**: +10 KB here, +1 dependency there. Each change on its own is "unnoticeable," and six months later the site is slow and you can no longer tell who's to blame.

A **performance budget** is a **hard ceiling** on some metric (bundle size, LCP, TBT). Breaching it **fails CI** (the automated build/check). The point is to make a regression (a worsening) visible right away in the PR.

Decoding the metrics: **LCP** (Largest Contentful Paint) — the time to render the largest element, the "page looks loaded" moment. **TBT** (Total Blocking Time) — the total time the main thread was blocked and unresponsive to clicks. **CLS** (Cumulative Layout Shift) — how much the layout jumps around during load.

### Two budget levels

1. **Bundle budgets** — fast and deterministic (always give the same result). In Angular they're set in \`angular.json\` under \`budgets\`: \`maximumError\` on \`initial\` (the initial bundle) and on component styles. They catch "accidentally pulled a heavy library like moment.js into the bundle." It's pure byte counting — no noise.
2. **Lighthouse CI (LHCI)** — about real speed metrics. It runs Lighthouse per PR and **asserts** specific values: \`largest-contentful-paint\`, \`total-blocking-time\`, \`cumulative-layout-shift\`, and the overall performance score.

### How to wire it into the pipeline

- LHCI boots a preview build, runs it **several times**, and takes the **median** — because Lighthouse is noisy and a single run can get "lucky" or "unlucky." Then it compares the result against the budget in \`lighthouserc.js\`. In the \`assertions\` block each metric is marked \`error\` (fails the build) or \`warn\` (only warns).
- Measure in CI **in the lab, deterministically** — with stable CPU and network throttling (artificial slowdown to a fixed level) so the result depends on the code, not on the runner's load. Track **trends** in reality via **RUM** (Real User Monitoring — metrics from live users) in prod. Division of labor: the lab catches regressions before release, RUM shows how it actually is for people.

### Setup example

\`\`\`js
// angular.json — hard bundle budget, fails the build
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
};
\`\`\`

Here the bundle budget fails if the initial bundle exceeds 1 MB. And LHCI fails the build if the median LCP is worse than 2500 ms or TBT worse than 300 ms, but only warns (\`warn\`) on CLS — because CLS in CI is usually unstable.

## ⚠️ Common pitfalls

- **Flakiness (instability)**: Lighthouse on a noisy CI runner swings ±5–10 points → false failures that annoy the team. Fix: median of N runs, \`warn\` instead of \`error\` on unstable metrics, a dedicated runner.
- **Toothless budget**: too generous a ceiling catches nothing; too strict and people start disabling it. Calibrate from the current value plus a small margin and tighten **gradually** (the "ratchet" technique — only ever moving toward stricter).
- **Score-only, no per-metric asserts** is dangerous: a drop in one metric can be "masked" by another rising, leaving the overall score unchanged. Assert individual metrics.

### When less is enough

Not everything needs heavy machinery. For a simple landing page a single bundle budget suffices. Full Lighthouse CI pays off on product SPAs — where there's a team, frequent changes, and an existing history of regressions.

## 🎯 Key takeaways

- A performance budget is a **hard ceiling that fails CI**, so you catch regressions in the PR, not in prod.
- Two levels: **bundle budgets** (fast, deterministic) and **Lighthouse CI** (metrics, but noisy → median of N).
- Measure in CI **in the lab**, and track trends via **RUM** in prod.
- Calibrate budgets from current values and **tighten gradually** (ratchet); don't make them toothless and don't make them flaky.`,
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
      ru: `## 🧩 Простыми словами

Представь, что UI собирают, как из кубиков Lego: сначала делают отдельные кубики (кнопки, поля, карточки), а уже потом строят из них домик-страницу. Storybook — это витрина, где каждый кубик стоит на полке отдельно, и его можно повертеть во всех состояниях, не запуская всё приложение. А design tokens — это единый прайс-лист цветов и отступов: поменял одно число в списке — и оно обновилось везде.

### Component-Driven Development (CDD): собираем снизу вверх

CDD — это подход, при котором UI строят **снизу вверх**: сначала маленькие изолированные «глупые» компоненты (они просто рисуют то, что им передали в пропсах, и ничего не знают о приложении), а потом из них складывают страницы.

**Storybook** — это каталог таких компонентов. Каждый компонент рендерится в **изоляции от приложения, роутинга и бэкенда**. Каждое состояние — загрузка, ошибка, пустой список, RTL (справа-налево, для арабского/иврита), тёмная тема — оформляется как отдельная «story» (история, конкретный сценарий показа компонента).

### Зачем это нужно

- **Параллельная работа**: верстальщик делает интерфейс, не дожидаясь готового API, — данные просто мокаются (подставляются фейковые пропсы). Мок — это подделка настоящего значения.
- **Живая визуальная документация** вместо устаревшей странички в Confluence: витрина всегда показывает реальный текущий компонент.
- База для **visual regression** — автоматической проверки, что внешний вид случайно не сломался (инструменты Chromatic, Percy).
- База для **accessibility** (доступности для людей с ограничениями) — аддон a11y и движок axe прямо в Storybook проверяют разметку.
- **Interaction tests**: функции \`play\` на самих stories умеют кликать и вводить текст, проверяя поведение — без запуска тяжёлого end-to-end теста через всё приложение.

### Design tokens: единый источник истины для дизайна

**Design tokens** (дизайн-токены) — это единый источник правды для дизайн-значений: цветов, отступов, типографики, радиусов скругления. Они хранятся как платформо-независимые данные (обычно JSON — простой текстовый формат), а из них **генерируются** уже конкретные вещи: CSS custom properties (CSS-переменные), SCSS-переменные, иногда даже настройки для нативных мобильных платформ. Делает это, например, инструмент Style Dictionary.

Главная выгода: значение больше не «зашито» внутри компонента. Смена темы или ребрендинг — это правка **в одном месте**, а тёмная тема получается простым переопределением токенов.

## ⚠️ Подводные камни

- **Drift (расхождение)**: stories устаревают, если их не прогонять в CI (автоматической сборке) → документация становится «мёртвой». Включайте Storybook в pipeline.
- Дублирование логики: бизнес-моки в stories со временем расходятся с реальностью.
- Токены без дисциплины → в коде появляются «magic colors» — захардкоженные hex-цвета в обход системы. Нужен линтер, запрещающий такой хардкод.
- Для крошечного приложения Storybook — лишняя инфраструктура; окупается на дизайн-системах и продуктах с несколькими командами.

## 🎯 Запомни

- CDD строит UI из изолированных компонентов снизу вверх; Storybook — витрина, где они живут во всех состояниях отдельно от приложения.
- Storybook даёт параллельную работу, живую документацию и базу для visual regression, a11y и interaction-тестов.
- Design tokens — единый источник правды для цветов/отступов; правишь в одном месте, темизация становится тривиальной.`,
      en: `## 🧩 In plain words

Think of building a UI like building with Lego bricks: first you make the individual bricks (buttons, inputs, cards), and only then do you assemble them into a house — the page. Storybook is a showroom where each brick sits on its own shelf, so you can turn it around in every state without launching the whole app. Design tokens are a shared price list of colors and spacings: change one number in the list and it updates everywhere.

### Component-Driven Development (CDD): building bottom-up

CDD is an approach where you build the UI **bottom-up**: first small, isolated "dumb" components (they just render what you pass them via props and know nothing about the app), then you compose pages out of them.

**Storybook** is a catalog of such components. Each one renders **isolated from the app, routing, and backend**. Every state — loading, error, empty list, RTL (right-to-left, for Arabic/Hebrew), dark theme — becomes a separate "story" (one specific display scenario for the component).

### Why it's useful

- **Parallel work**: a UI developer builds the interface without waiting for a ready API — the data is simply mocked (fake props are supplied). A mock is a stand-in for a real value.
- **Living visual documentation** instead of a stale Confluence page: the showroom always shows the real, current component.
- A base for **visual regression** — automatic checks that the look didn't accidentally break (tools like Chromatic, Percy).
- A base for **accessibility** (usability for people with disabilities) — the a11y addon and the axe engine check the markup right inside Storybook.
- **Interaction tests**: \`play\` functions on the stories themselves can click and type to verify behavior — without running a heavy end-to-end test through the whole app.

### Design tokens: a single source of truth for design

**Design tokens** are the single source of truth for design values: colors, spacing, typography, corner radii. They live as platform-agnostic data (usually JSON — a simple text format), and from them concrete things are **generated**: CSS custom properties (CSS variables), SCSS variables, and sometimes even settings for native mobile platforms. A tool like Style Dictionary does this.

The key benefit: a value is no longer hardcoded inside a component. Changing a theme or rebranding is an edit **in one place**, and dark theme becomes a simple token override.

## ⚠️ Common pitfalls

- **Drift**: stories rot if you don't run them in CI (automated builds) → the docs become dead. Put Storybook in the pipeline.
- Logic duplication: business mocks in stories drift from reality over time.
- Tokens without discipline → "magic colors" appear in the code — hardcoded hex values bypassing the system. You need a lint rule forbidding such hardcoding.
- For a tiny app Storybook is excess infrastructure; it pays off on design systems and multi-team products.

## 🎯 Key takeaways

- CDD builds the UI from isolated components bottom-up; Storybook is the showroom where they live in every state apart from the app.
- Storybook enables parallel work, living docs, and a base for visual regression, a11y, and interaction tests.
- Design tokens are a single source of truth for colors/spacing; edit in one place and theming becomes trivial.`,
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
      ru: `## 🧩 Простыми словами

Представь, что фронтенд и бэкенд — два человека, которые договорились встретиться: один обещает прийти в кафе в 18:00, другой рассчитывает его там встретить. Contract testing — это записанная бумажка с их договорённостью, которую каждый может проверить у себя, не устраивая настоящую встречу. А visual regression testing — это две фотографии страницы «до» и «после», которые накладывают друг на друга: если что-то съехало, разница сразу видна.

### Какую проблему решает contract testing

End-to-end тесты, которые гоняют запрос через все сервисы сразу, — медленные и хрупкие. А mock-и (подделки ответов) в юнит-тестах **могут разойтись с реальным API**: тогда тесты зелёные, а на проде всё падает, потому что бэкенд на самом деле отвечает иначе.

**Contract testing** (тестирование контрактов) проверяет, что **ожидания клиента и возможности провайдера совпадают**, — но без поднятия всей системы. Клиент (consumer) — тот, кто зовёт API. Провайдер (provider) — тот, кто его предоставляет.

### Pact (consumer-driven)

**Pact** — популярный инструмент, работающий по схеме consumer-driven («ведёт потребитель»):

- **Consumer** (фронтенд) в своих тестах описывает, какие запросы он шлёт и какие ответы ждёт → из этого генерируется **pact-файл** (сам контракт).
- Контракт публикуется в **Pact Broker** — центральное хранилище контрактов.
- **Provider** (бэкенд) в своём CI **верифицирует** контракт против настоящей реализации: реально ли он отвечает так, как записано.
- Итог: бэкенд не может «тихо» сломать или убрать поле, которое нужно фронту, — верификация провайдера сразу упадёт. Это ловит интеграционные регрессии **на стороне провайдера ещё до деплоя**.

### Когда Pact НЕ подходит

Для публичного API с тысячами неизвестных потребителей consumer-driven схема не работает — ведь контракты пишут сами потребители, а их не собрать. Тогда используют **provider-driven** подход: схема/OpenAPI (формальное описание API) плюс валидация ответов против этой схемы. Pact силён, когда потребителей немного и они известны, обычно внутри одной организации.

### Visual regression testing

Здесь скриншот компонента или страницы сравнивается с **baseline** (эталонным снимком) попиксельно (инструменты Chromatic, Percy, а в Playwright — метод \`toHaveScreenshot\`). Это ловит то, чего **функциональные тесты не видят**: сломанный CSS, наезжающие друг на друга элементы, регрессию темы, неправильный шрифт. Функция может работать логически верно, но выглядеть уродливо — вот это и отлавливается.

\`\`\`ts
// Consumer (фронтенд) Pact-тест — объявляет ожидаемое взаимодействие
provider.addInteraction({
  state: 'user 42 exists',
  uponReceiving: 'a request for user 42',
  withRequest: { method: 'GET', path: '/users/42' },
  willRespondWith: {
    status: 200,
    body: { id: Matchers.like(42), name: Matchers.like('Ada') }, // форма, а не точное значение
  },
});
// -> публикуется pact; CI провайдера обязан его верифицировать, а
//    'pact-broker can-i-deploy' блокирует релиз, если верификации нет или она падает.
\`\`\`

Обрати внимание на \`Matchers.like\`: контракт проверяет **форму** данных (что \`id\` — число, \`name\` — строка), а не конкретные «42» и «Ada». Это важно: реальные значения в проде другие, но структура должна совпадать.

## ⚠️ Подводные камни

- **Flaky-скриншоты** (нестабильные): антиалиасинг, шрифты, анимации, дата/время дают ложные диффы. Решение: маскировать динамичные области, фиксировать вьюпорт и шрифты, задать пиксельный threshold (порог допустимой разницы), использовать детерминированные (предсказуемые) данные.
- Огромный поток обновлений baseline → люди аппрувят их «не глядя» (rubber-stamp), и смысл теряется.
- Pact Broker без гейта \`can-i-deploy\` = контракты есть, но никто не блокирует несовместимый деплой.

## 🎯 Запомни

- Contract testing проверяет, что ожидания клиента и ответы провайдера совпадают, не поднимая всю систему; Pact — consumer-driven, силён при немногих известных потребителях.
- Ключевой гейт — \`can-i-deploy\`: без него контракты бесполезны, потому что ничто не блокирует плохой деплой.
- Visual regression ловит визуальные поломки (CSS, шрифты, наезды), которые функциональные тесты пропускают; главная боль — flaky-скриншоты.`,
      en: `## 🧩 In plain words

Imagine the frontend and backend as two people who agreed to meet: one promises to show up at the cafe at 6 PM, the other expects to find them there. Contract testing is the written note of their agreement, which each can check on their own without staging a real meeting. Visual regression testing is two photos of the page, "before" and "after," laid on top of each other: if something shifted, the difference is instantly visible.

### The problem contract testing solves

End-to-end tests that route a request through all services at once are slow and brittle. And mocks (fake responses) in unit tests **can drift from the real API**: then the tests stay green while prod breaks, because the backend actually responds differently.

**Contract testing** verifies that **consumer expectations and provider capabilities match** — without standing up the whole system. The consumer is whoever calls the API. The provider is whoever serves it.

### Pact (consumer-driven)

**Pact** is a popular tool that works consumer-driven ("the consumer leads"):

- The **consumer** (frontend) describes in its tests which requests it sends and which responses it expects → from this a **pact file** (the contract itself) is generated.
- The contract is published to a **Pact Broker** — a central store of contracts.
- The **provider** (backend) **verifies** the contract against its real implementation in its CI: does it actually respond the way the contract says?
- The result: the backend can't silently break or remove a field the frontend needs — provider verification fails immediately. This catches integration regressions **on the provider side before deploy**.

### When Pact does NOT fit

For a public API with thousands of unknown consumers, the consumer-driven scheme doesn't work — the consumers author the contracts, and you can't gather them all. Then you use a **provider-driven** approach: a schema/OpenAPI (a formal API description) plus validating responses against that schema. Pact shines when consumers are few and known, usually inside one organization.

### Visual regression testing

Here a screenshot of a component or page is compared to a **baseline** (reference snapshot) pixel by pixel (tools like Chromatic, Percy, and in Playwright the \`toHaveScreenshot\` method). It catches what **functional tests can't see**: broken CSS, overlapping elements, a theme regression, a wrong font. A feature may be logically correct but look ugly — that's exactly what gets caught.

\`\`\`ts
// Consumer (frontend) Pact test — declares the expected interaction
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
//    'pact-broker can-i-deploy' gates the release if verification is missing/failing.
\`\`\`

Notice \`Matchers.like\`: the contract checks the **shape** of the data (that \`id\` is a number, \`name\` is a string), not the literal "42" and "Ada." This matters: real production values differ, but the structure must match.

## ⚠️ Common pitfalls

- **Flaky screenshots**: anti-aliasing, fonts, animations, date/time cause false diffs. Fix: mask dynamic regions, pin the viewport and fonts, set a pixel threshold (allowed difference), use deterministic (predictable) data.
- A flood of baseline updates → people approve them without looking (rubber-stamp), and the point is lost.
- A Pact Broker without a \`can-i-deploy\` gate = contracts exist but nothing blocks an incompatible deploy.

## 🎯 Key takeaways

- Contract testing verifies that consumer expectations and provider responses match without standing up the whole system; Pact is consumer-driven and shines with a few known consumers.
- The key gate is \`can-i-deploy\`: without it contracts are useless, because nothing blocks a bad deploy.
- Visual regression catches visual breakage (CSS, fonts, overlaps) that functional tests miss; the main pain is flaky screenshots.`,
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
      ru: `## 🧩 Простыми словами

Есть два разных вопроса: **как командам вести общий код** (стратегии ветвления) и **как безопасно выкатывать новую версию пользователям** (стратегии деплоя). Ветвление — это про то, как вы работаете в Git до релиза; деплой — про то, как вы подменяете старую версию на новую в бою. А semver и changesets — это правила, как нумеровать версии, чтобы все понимали, насколько изменение опасное.

### Стратегии ветвления: как вести код

- **Feature branches / Gitflow**: долгоживущие ветки под каждую фичу. Проблема — болезненные merge-конфликты и отложенная интеграция: код неделями живёт отдельно, а при слиянии наступает «integration hell» (ад интеграции). Подходит, когда релизы редкие или ПО версионируемое (например, библиотеки).
- **Trunk-based**: все коммитят прямо в \`main\` маленькими порциями, а незаконченные фичи прячут за **feature flags** (флаги-переключатели, включающие/выключающие код без нового деплоя). Даёт быструю интеграцию и лежит в основе CD (continuous delivery — непрерывной поставки). Требует сильного CI и дисциплины: прятать за флагами, а не за ветками.

### Стратегии деплоя: как выкатывать

- **Blue-green**: две одинаковые среды — «blue» (текущая) и «green» (новая). Весь трафик переключают на green целиком; откат мгновенный — переключаем обратно на blue. Просто, но дорого: держишь двойную инфраструктуру.
- **Canary** («канарейка», по шахтёрским канарейкам, предупреждавшим об опасности): новую версию выкатывают **на 1–5% трафика**, следят за метриками и ошибками, потом постепенно увеличивают долю. Ограничивает «радиус поражения» (blast radius) — если версия плохая, пострадает лишь малая часть пользователей. Ловит проблемы на реальном трафике, но требует хорошей observability (наблюдаемости — метрик, логов) и автоматического отката при нарушении SLO (целевых показателей качества).
- На практике часто комбинируют: trunk-based + canary.

### Semver и changesets в монорепо

**Semantic versioning (semver)** — схема нумерации \`MAJOR.MINOR.PATCH\`:
- MAJOR — ломающее изменение (breaking, старый код перестанет работать),
- MINOR — новая фича без поломки,
- PATCH — багфикс.

Это контракт для потребителей пакета: по номеру видно, опасно ли обновляться.

**Монорепо** — один репозиторий с множеством пакетов. Встаёт вопрос: версионировать всё одной общей версией или каждый пакет независимо? Тут помогает **Changesets** — инструмент, где каждый PR прикладывает «changeset»: тип бампа (major/minor/patch) плюс описание изменения. При релизе все changeset-ы агрегируются в повышение версии и changelog **только затронутых пакетов**. Это делает ответ на вопрос «что бампать» детерминированным, а не на глаз.

## ⚠️ Подводные камни

- Trunk-based **без** флагов и быстрого CI → сломанный \`main\`, который блокирует всю команду.
- Canary без авто-отката → деградация тянется, пока живой человек её не заметит.
- Забытые feature flags → технический долг и комбинаторный взрыв состояний (слишком много комбинаций включённого/выключенного).
- Blue-green со stateful-миграциями БД: схема базы должна быть **forward/backward-совместимой** (работать и со старой, и с новой версией кода), иначе откат назад станет невозможен.

## 🎯 Запомни

- Ветвление (feature-branch vs trunk-based) — про работу с кодом до релиза; деплой (blue-green vs canary) — про безопасную подмену версии в бою.
- Trunk-based + feature flags + canary — типичный современный стек для непрерывной поставки; требует CI и observability.
- Semver кодирует опасность обновления (MAJOR/MINOR/PATCH), а changesets в монорепо детерминированно решают, какие пакеты и как бампать.`,
      en: `## 🧩 In plain words

There are two different questions: **how teams share code** (branching strategies) and **how you safely roll a new version out to users** (deployment strategies). Branching is about how you work in Git before release; deployment is about how you swap the old version for the new one in production. Semver and changesets are the rules for numbering versions so everyone knows how risky a change is.

### Branching strategies: how you carry the code

- **Feature branches / Gitflow**: long-lived branches per feature. The problem — painful merge conflicts and deferred integration: code lives apart for weeks, and merging brings "integration hell." Fits when releases are infrequent or the software is versioned (e.g. libraries).
- **Trunk-based**: everyone commits straight to \`main\` in small slices, and unfinished features hide behind **feature flags** (toggle switches that enable/disable code without a new deploy). It gives fast integration and is the basis of CD (continuous delivery). It needs strong CI and discipline: hide behind flags, not branches.

### Deployment strategies: how you roll out

- **Blue-green**: two identical environments — "blue" (current) and "green" (new). All traffic switches to green at once; rollback is instant — switch back to blue. Simple but expensive: you keep double the infrastructure.
- **Canary** (named after coal-mine canaries that warned of danger): the new version rolls out to **1–5% of traffic**, you watch metrics and errors, then gradually increase the share. It limits the blast radius — if the version is bad, only a small slice of users is affected. It catches issues on real traffic but needs good observability (metrics, logs) and automatic rollback on an SLO breach (quality-target violation).
- In practice they're often combined: trunk-based + canary.

### Semver and changesets in a monorepo

**Semantic versioning (semver)** — the numbering scheme \`MAJOR.MINOR.PATCH\`:
- MAJOR — a breaking change (old code will stop working),
- MINOR — a new feature with no breakage,
- PATCH — a bug fix.

It's a contract for the package's consumers: the number tells you whether upgrading is risky.

A **monorepo** is one repository with many packages. The question arises: version everything with one shared version, or each package independently? Here **Changesets** helps — a tool where each PR attaches a "changeset": the bump type (major/minor/patch) plus a description of the change. At release, all changesets aggregate into a version bump and changelog for **only the affected packages**. This makes the answer to "what to bump" deterministic instead of guesswork.

## ⚠️ Common pitfalls

- Trunk-based **without** flags and fast CI → a broken \`main\` that blocks the whole team.
- Canary without auto-rollback → degradation drags on until a live human notices.
- Forgotten feature flags → tech debt and a combinatorial explosion of states (too many on/off combinations).
- Blue-green with stateful DB migrations: the schema must be **forward/backward-compatible** (work with both the old and new code), or rolling back becomes impossible.

## 🎯 Key takeaways

- Branching (feature-branch vs trunk-based) is about working with code before release; deployment (blue-green vs canary) is about safely swapping the version in production.
- Trunk-based + feature flags + canary is the typical modern stack for continuous delivery; it needs CI and observability.
- Semver encodes upgrade risk (MAJOR/MINOR/PATCH), and changesets in a monorepo deterministically decide which packages to bump and how.`,
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
      ru: `## 🧩 Простыми словами

Когда тестируешь приложение, ему нужно откуда-то брать данные с сервера — но настоящий сервер в тестах дёргать нельзя (медленно и ненадёжно). Обычный подход — подсунуть коду фейковую функцию вместо \`fetch\`. Проблема: тест начинает знать слишком много про то, *как именно* код ходит в сеть. MSW заходит с другой стороны — он как «фейковый почтальон», который перехватывает настоящие письма-запросы на выходе и сам отвечает на них. Код при этом делает всё по-настоящему и ничего не подозревает.

### Проблема обычных моков

Классический способ — подменить \`HttpClient\` или \`fetch\` спаями (spy — шпион, подставная функция, следящая за вызовами). Беда в том, что тест завязывается на **детали реализации**. Переписали слой данных — например, REST на GraphQL или axios на fetch — и тесты краснеют, хотя поведение приложения не изменилось. Плюс легко замокать «не то» и пропустить настоящий баг в сериализации данных или в URL.

### MSW (Mock Service Worker)

**MSW** перехватывает запросы **на сетевом уровне**, а не подменяет функции в коде. В браузере это делается через Service Worker (фоновый скрипт-перехватчик запросов), а в тестах — через перехват на уровне Node. Ключевой момент: код приложения делает **настоящий вызов \`fetch\`/HttpClient**, а MSW отвечает на него по заранее объявленным handler-ам (обработчикам конкретных эндпоинтов).

- Один и тот же набор handler-ов переиспользуется в **юнит-тестах, компонентных (Storybook), e2e и в dev-режиме** — можно даже разрабатывать без готового бэкенда.
- Тест не знает, *как* приложение делает запрос → проверяется поведение, а не реализация. Рефакторинг клиента не ломает тесты.

\`\`\`ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // ловим забытые эндпоинты
afterEach(() => server.resetHandlers());   // изоляция: тесты не «протекают» друг в друга
afterAll(() => server.close());

it('renders an error state on 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... приложение делает НАСТОЯЩИЙ запрос; компонент показывает ветку ошибки
});
\`\`\`

Что тут происходит: \`setupServer\` объявляет обработчики; \`server.listen\` включает перехват; \`server.use\` в конкретном тесте временно переопределяет ответ (эмулирует ошибку 500), а \`resetHandlers\` потом стирает это переопределение.

### Изоляция и устойчивость

- **Детерминизм** (предсказуемость): нет похода в реальную сеть → нет флака (случайных падений) из-за задержек или недоступности сервера.
- **Изоляция**: \`server.resetHandlers()\` после каждого теста сбрасывает временные переопределения → один тест не влияет на другой.
- Легко эмулировать **edge-cases** (крайние случаи): ответ 500, таймаут, пустой массив, медленный ответ — без хрупких конфигов со спаями.

## ⚠️ Подводные камни

- Забыли \`resetHandlers()\` в \`afterEach\` → состояние «течёт» между тестами, и они начинают зависеть от порядка запуска.
- Handler-ы расходятся с реальным API (MSW не валидирует ответы против схемы) → ложная уверенность; сочетайте с contract testing.
- \`onUnhandledRequest: 'bypass'\` молча пропускает незамоканные запросы и маскирует забытые эндпоинты → в тестах ставьте \`'error'\`.
- В Node нужен правильный setup под конкретную версию (fetch/undici); неверная инициализация — частая причина «MSW не перехватывает запросы».

## 🎯 Запомни

- MSW перехватывает запросы на сетевом уровне, поэтому код делает настоящий \`fetch\`, а тест проверяет поведение, а не реализацию — рефактор клиента тесты не ломает.
- Один набор handler-ов работает в юнит/компонентных/e2e-тестах и в dev-режиме без бэкенда.
- Всегда \`resetHandlers()\` в \`afterEach\` для изоляции и \`onUnhandledRequest: 'error'\`, чтобы ловить забытые эндпоинты.`,
      en: `## 🧩 In plain words

When you test an app, it needs to get server data from somewhere — but you can't hit a real server in tests (slow and unreliable). The usual approach is to slip a fake function in place of \`fetch\`. The problem: the test starts knowing too much about *how exactly* the code talks to the network. MSW comes from the other side — it's like a "fake mail carrier" that intercepts the real request-letters on the way out and answers them itself. The code, meanwhile, does everything for real and suspects nothing.

### The problem with ordinary mocks

The classic way is to replace \`HttpClient\` or \`fetch\` with spies (a spy is a stand-in function that watches calls). The trouble is the test gets coupled to **implementation details**. Rewrite the data layer — say REST to GraphQL, or axios to fetch — and the tests go red even though the app's behavior didn't change. It's also easy to mock the wrong thing and miss a real bug in data serialization or in the URL.

### MSW (Mock Service Worker)

**MSW** intercepts requests **at the network layer** instead of swapping functions in the code. In the browser this is done via a Service Worker (a background script that intercepts requests), and in tests via Node-level interception. The key point: application code makes a **real \`fetch\`/HttpClient call**, and MSW answers it per pre-declared handlers (handlers for specific endpoints).

- The same set of handlers is reused across **unit tests, component tests (Storybook), e2e, and dev mode** — you can even develop without a ready backend.
- The test doesn't know *how* the app makes the request → you assert behavior, not implementation. A client refactor doesn't break the tests.

\`\`\`ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users/:id', ({ params }) =>
    HttpResponse.json({ id: params.id, name: 'Ada' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // catch forgotten endpoints
afterEach(() => server.resetHandlers());   // isolation: tests don't leak into each other
afterAll(() => server.close());

it('renders an error state on 500', async () => {
  server.use(http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 })));
  // ... the app makes a REAL request; the component shows the error path
});
\`\`\`

What's happening here: \`setupServer\` declares the handlers; \`server.listen\` turns interception on; \`server.use\` inside a specific test temporarily overrides the response (emulating a 500 error), and \`resetHandlers\` then wipes that override.

### Isolation and robustness

- **Determinism** (predictability): no real network hop → no flakiness (random failures) from latency or an unreachable server.
- **Isolation**: \`server.resetHandlers()\` after each test clears temporary overrides → one test doesn't affect another.
- Easy to emulate **edge cases**: a 500 response, a timeout, an empty array, a slow response — without brittle spy configs.

## ⚠️ Common pitfalls

- Forgetting \`resetHandlers()\` in \`afterEach\` → state leaks between tests, and they start depending on run order.
- Handlers drift from the real API (MSW doesn't validate responses against a schema) → false confidence; pair it with contract testing.
- \`onUnhandledRequest: 'bypass'\` silently lets unmocked requests through and hides forgotten endpoints → set \`'error'\` in tests.
- In Node you need the right setup for the specific version (fetch/undici); wrong init is a common "MSW doesn't intercept requests" cause.

## 🎯 Key takeaways

- MSW intercepts requests at the network layer, so the code makes a real \`fetch\` and the test checks behavior, not implementation — a client refactor doesn't break tests.
- One set of handlers works across unit/component/e2e tests and in dev mode without a backend.
- Always \`resetHandlers()\` in \`afterEach\` for isolation and \`onUnhandledRequest: 'error'\` to catch forgotten endpoints.`,
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
      ru: `## 🧩 Простыми словами

Раньше в Angular был «умный дворецкий» — Zone.js. Он незаметно следил за всем, что происходит (клики, таймеры, ответы сети), и после каждого события сам обновлял экран. В zoneless-режиме дворецкого уволили: теперь мы сами говорим приложению «обнови картинку». В тестах это значит, что данные меняются мгновенно, а вот DOM (то, что видно на экране) обновится только когда мы явно попросим.

А flaky-тесты («мигающие» тесты) — это тесты, которые то проходят, то падают без изменений в коде. Они как лампочка с плохим контактом: раздражают и подрывают доверие ко всему CI. Ниже — как их тестировать правильно и как системно убирать «мигание».

### Сигналы синхронны, а рендер — нет

Сигнал (\`signal\`) — это переменная-реактив: положил в неё значение — и оно там сразу. Поэтому проверять само значение можно без всякой машинерии:

\`\`\`ts
count.set(1);
expect(count()).toBe(1); // читается мгновенно, TestBed не нужен
\`\`\`

Но экран (DOM) сам не перерисуется, потому что нет Zone.js, который раньше делал это автоматически. После изменения нужно явно запустить change detection — процесс, когда Angular сверяет данные с разметкой и обновляет её:

\`\`\`ts
fixture.componentInstance.count.set(5); // данные поменялись сразу
fixture.detectChanges();                // а вот DOM просим обновить руками
expect(fixture.nativeElement.textContent).toContain('5');
\`\`\`

Вместо \`detectChanges()\` можно \`await fixture.whenStable()\` — он дожидается, пока все запланированные обновления «устаканятся».

### computed и effect

\`computed\` — это вычисляемое значение, которое зависит от других сигналов. Оно **ленивое** (считается только когда его читают) и **мемоизированное** (запоминает результат и не пересчитывает зря). Проверяют его просто чтением. Важно: computed «glitch-free» — вы никогда не увидите промежуточных, ещё не досчитанных значений, только финальное.

\`effect()\` — это побочное действие (например, запись в лог), которое само перезапускается, когда меняются его сигналы. В тесте эффект не срабатывает мгновенно, поэтому его надо принудительно «прогнать», иначе ассерт проверит результат раньше, чем эффект успел отработать:

\`\`\`ts
fixture.componentInstance.value.set(1);
TestBed.flushEffects(); // выполнить эффекты прямо сейчас, без неявных задержек
expect(logSpy).toHaveBeenCalledWith(1);
\`\`\`

### Таймеры и микротаски

Для таймеров (\`setTimeout\`, интервалы) используйте \`fakeAsync\` + \`tick()\` — они дают «поддельные часы», которые вы прокручиваете вручную, так что тест не ждёт реального времени. Для микротасок (например, разрешённых промисов) подойдёт \`await fixture.whenStable()\`.

### Откуда берётся «мигание» (flaky)

1. **Время и async** — реальные \`setTimeout\`, \`Date.now()\`, анимации делают тест зависящим от часов. Лечение: \`fakeAsync\`, поддельные таймеры, мок часов.
2. **Порядок и общее состояние** — глобальные синглтоны, не сброшенные моки/сторадж, общий DOM. Если тест A оставил мусор, тест B падает. Лечение: каждый тест сам себя готовит и чистит (\`afterEach\` со сбросом, свежий TestBed).
3. **Гонки сети** — реальные запросы приходят в непредсказуемом порядке. Лечение: мокать сеть через MSW или \`HttpTestingController\`.
4. **Хрупкие ожидания** — \`sleep(500)\` в надежде «наверное, за полсекунды успеет». Лечение: \`waitFor\` по реальному условию, а не по таймеру.

### Как бороть системно

- **Изоляция по умолчанию**: тесты обязаны проходить в любом порядке. Запуск с \`--shuffle\` (случайный порядок, фиксируемый seed) это проверяет и вскрывает скрытые зависимости.
- **Карантин + учёт**: нашли flaky — не «ретраить вслепую», а пометить и починить причину. Автоматический retry прячет реальные баги-гонки, которые потом выстрелят в проде.
- **Детерминизм данных**: фиксированный seed для случайных данных, замороженное время — чтобы результат всегда был один и тот же.

## ⚠️ Подводные камни

- Забыть \`detectChanges()\`/\`whenStable()\` после смены сигнала — данные верны, а DOM «отстаёт», и тест падает на текстовом ассерте.
- Проверять результат \`effect()\` без \`flushEffects()\` — ассерт срабатывает раньше эффекта.
- \`retries: 3\` в CI как «лекарство» от flaky: CI зеленеет поверх реальной гонки, и баг едет в прод. Retry — это индикатор проблемы, а не её решение.
- \`sleep(500)\` вместо ожидания по условию — на медленной машине CI тест всё равно моргнёт.

## 🎯 Запомни

- Сигналы читаются синхронно, но DOM надо обновлять явно (\`detectChanges()\`/\`whenStable()\`); эффекты — через \`flushEffects()\`.
- Flaky = недетерминизм: время, общее состояние, гонки сети, ожидания по таймеру. Убирайте источник, а не симптом.
- Тесты должны проходить в любом порядке — проверяйте \`--shuffle\`.
- Retry маскирует баг-гонку. Чините причину, а не перезапускайте.`,
      en: `## 🧩 In plain words

Angular used to have a "smart butler" called Zone.js. It quietly watched everything that happened (clicks, timers, network responses) and, after each event, refreshed the screen for you. In zoneless mode that butler is gone: now we tell the app "redraw the picture" ourselves. In tests this means data changes instantly, but the DOM (what you actually see on screen) only updates when we explicitly ask.

And flaky tests are tests that sometimes pass and sometimes fail with no code change. They're like a lamp with a loose wire: annoying, and they erode trust in your whole CI. Below is how to test signals correctly and how to kill flakiness systematically.

### Signals are synchronous, the render is not

A \`signal\` is a reactive variable: put a value in and it's there immediately. So you can assert the value itself with no machinery:

\`\`\`ts
count.set(1);
expect(count()).toBe(1); // reads instantly, no TestBed needed
\`\`\`

But the screen (DOM) won't repaint by itself, because there's no Zone.js doing it automatically anymore. After a change you must explicitly run change detection — the process where Angular compares data against the template and updates it:

\`\`\`ts
fixture.componentInstance.count.set(5); // data changes immediately
fixture.detectChanges();                // but we refresh the DOM by hand
expect(fixture.nativeElement.textContent).toContain('5');
\`\`\`

Instead of \`detectChanges()\` you can \`await fixture.whenStable()\` — it waits until all scheduled updates settle.

### computed and effect

\`computed\` is a derived value that depends on other signals. It's **lazy** (only computed when read) and **memoized** (caches the result and won't recompute needlessly). You assert it simply by reading it. Important: computed is "glitch-free" — you never observe intermediate, half-computed values, only the final one.

\`effect()\` is a side effect (e.g. writing to a log) that re-runs itself whenever its signals change. In a test the effect doesn't fire instantly, so you must force it to run, or the assertion will check the result before the effect has done its work:

\`\`\`ts
fixture.componentInstance.value.set(1);
TestBed.flushEffects(); // run effects right now, no implicit timing
expect(logSpy).toHaveBeenCalledWith(1);
\`\`\`

### Timers and microtasks

For timers (\`setTimeout\`, intervals) use \`fakeAsync\` + \`tick()\` — they give you a "fake clock" you wind forward manually, so the test never waits on real time. For microtasks (e.g. resolved promises) use \`await fixture.whenStable()\`.

### Where flakiness comes from

1. **Time and async** — real \`setTimeout\`, \`Date.now()\`, animations make a test depend on the clock. Fix: \`fakeAsync\`, fake timers, mock the clock.
2. **Order and shared state** — global singletons, un-reset mocks/storage, a shared DOM. If test A leaves garbage behind, test B fails. Fix: each test sets up and cleans up after itself (\`afterEach\` reset, fresh TestBed).
3. **Network races** — real requests arrive in an unpredictable order. Fix: mock the network with MSW or \`HttpTestingController\`.
4. **Brittle waits** — \`sleep(500)\` hoping "it'll probably finish in half a second." Fix: \`waitFor\` on the actual condition, not a timer.

### How to tackle it systematically

- **Isolation by default**: tests must pass in any order. Running with \`--shuffle\` (random order with a recorded seed) proves it and exposes hidden dependencies.
- **Quarantine + tracking**: found a flake — don't retry it blindly, tag it and fix the cause. Auto-retry hides real race bugs that later blow up in prod.
- **Deterministic data**: a fixed seed for random data, frozen time — so the result is always the same.

## ⚠️ Common pitfalls

- Forgetting \`detectChanges()\`/\`whenStable()\` after a signal change — the data is right but the DOM lags, and the text assertion fails.
- Checking an \`effect()\` result without \`flushEffects()\` — the assertion fires before the effect.
- \`retries: 3\` in CI as a "cure" for flakiness: CI goes green over a real race, and the bug ships to prod. A retry is a signal of a problem, not a solution.
- \`sleep(500)\` instead of waiting on a condition — on a slow CI machine the test still flickers.

## 🎯 Key takeaways

- Signals read synchronously, but the DOM must be updated explicitly (\`detectChanges()\`/\`whenStable()\`); effects via \`flushEffects()\`.
- Flaky = non-determinism: time, shared state, network races, timer-based waits. Remove the source, not the symptom.
- Tests must pass in any order — verify with \`--shuffle\`.
- Retry masks a race bug. Fix the cause, don't rerun.`,
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
