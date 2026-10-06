import { InterviewQuestion } from '../interfaces/question.interface';

export const ANGULAR_CORE_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'ng-037',
    category: 'network-browser',
    level: 'Hard',
    tags: ['http', 'interceptors', 'functional'],
    question: {
      ru: 'Как работают функциональные HTTP-интерсепторы и как на них построить auth, retry и кэширование?',
      en: 'How do functional HTTP interceptors work, and how do you build auth, retry and caching with them?',
    },
    answer: {
      ru: `## В чём суть

Интерсептор — это функция-посредник, через которую проходит каждый запрос, отправленный через \`HttpClient\`, по пути «наружу», и каждый ответ — по пути «обратно». С Angular 15 это обычная функция типа \`HttpInterceptorFn\`: она получает запрос и ссылку на следующее звено цепочки и возвращает Observable ответа. Всё, что касается «каждого запроса» — токен, повторы, кэш, логи, обработка 401, — пишется один раз и в одном месте.

Аналогия: посылка едет по конвейеру мимо нескольких столов. За первым столом наклеивают пропуск (токен), за вторым смотрят, нет ли такой же посылки на складе (кэш), за третьим ведут журнал. Ответ едет назад по тем же столам, но в **обратном** порядке. Любой стол может вообще не пускать посылку дальше и сразу вернуть готовый ответ со своего склада.

**Какую проблему решает.** Без интерсепторов каждый сервис сам добавляет заголовок \`Authorization\`, сам повторяет упавшие запросы и сам ловит 401. В корпоративном приложении таких сервисов десятки, и в одном обязательно забудут. Интерсептор — это сквозной слой (cross-cutting concern): одна функция применяется ко всем запросам, а сервисы остаются чистыми — «дай список пользователей», без инфраструктурного шума.

## Словарик терминов

- **\`HttpClient\`** — сервис Angular для HTTP-запросов. Его методы \`get\`, \`post\` и другие возвращают «холодный» Observable: запрос уходит в сеть только при подписке.
- **\`HttpRequest\`** — объект запроса: метод, URL, заголовки, тело, контекст. Он неизменяемый (immutable): поменять можно только копию, сделанную через \`req.clone()\`.
- **\`HttpInterceptorFn\`** — тип функции-интерсептора: \`(req, next) => Observable<HttpEvent>\`.
- **\`next\` (\`HttpHandlerFn\`)** — «следующий стол»: функция, которая передаёт запрос дальше по цепочке, а в самом конце — в \`HttpBackend\`.
- **\`HttpBackend\`** — последнее звено, которое реально ходит в сеть: \`HttpXhrBackend\` (через \`XMLHttpRequest\`, по умолчанию) или \`FetchBackend\` (через \`fetch\`, включается \`withFetch()\`).
- **\`HttpEvent\`** — событие в потоке ответа. Сначала приходит \`Sent\` (тип \`0\`, «запрос отправлен»), затем могут идти события прогресса, в конце — \`HttpResponse\` (тип \`4\`) или ошибка \`HttpErrorResponse\`.
- **\`provideHttpClient\` / \`withInterceptors\`** — функции настройки: первая подключает \`HttpClient\` к приложению, вторая регистрирует список функций-интерсепторов.
- **Injection context (контекст внедрения)** — момент, когда Angular разрешает вызывать \`inject()\`: конструктор, инициализатор поля, фабрика провайдера или функция внутри \`runInInjectionContext\`.
- **\`HttpContext\` / \`HttpContextToken\`** — типизированные «метки» на запросе. На сервер они не уходят, их читают только интерсепторы: «этот запрос не кэшировать», «сюда токен не добавлять».
- **Идемпотентный метод (idempotent)** — метод, повтор которого не меняет результат: \`GET\`, \`PUT\`, \`DELETE\`. \`POST\` не идемпотентен: повтор может создать второй заказ.
- **Exponential backoff (экспоненциальная задержка)** — пауза между повторами каждый раз удваивается: 300, 600, 1200 мс. Так клиенты не добивают и без того перегруженный сервер.
- **Access token и refresh token** — короткоживущий токен, который прикладывают к каждому запросу, и долгоживущий токен, которым получают новый access token, когда сервер ответил \`401 Unauthorized\`.
- **Инвалидация кэша** — удаление записей, которые устарели после изменения данных.

## Как это работает под капотом

Механизм по шагам:

1. \`provideHttpClient(withInterceptors([auth, retry, cache]))\` кладёт каждую функцию во внутренний multi-токен \`HTTP_INTERCEPTOR_FNS\` (multi — значит «список значений под одним ключом»). Сам Angular первым кладёт туда свой XSRF-интерсептор — он добавляет анти-CSRF заголовок к изменяющим запросам.
2. При первом запросе \`HttpClient\` собирает цепочку: проходит список справа налево (\`reduceRight\`) и вкладывает функции друг в друга, как матрёшку: \`auth(retry(cache(backend)))\`. Поэтому первая в списке функция — самая внешняя.
3. Вызов \`http.get()\` ещё ничего не отправляет: Observable холодный. Только при \`subscribe()\` создаётся \`HttpRequest\` и передаётся внешнему интерсептору.
4. Каждую функцию Angular вызывает внутри \`runInInjectionContext(injector, ...)\`, поэтому в её теле работает \`inject()\`. Но только синхронно: в колбэках RxJS, которые выполнятся позже, контекста уже нет.
5. Интерсептор может сделать одно из трёх: передать дальше изменённую копию запроса — \`next(req.clone(...))\`; не вызывать \`next\` и вернуть свой Observable (кэш, мок); навесить операторы на результат \`next(...)\` — \`retry\`, \`catchError\`, \`tap\`, \`finalize\`.
6. В конце цепочки \`HttpBackend\` отправляет запрос и выдаёт события: \`Sent\`, затем \`HttpResponse\` или ошибку. Они поднимаются через \`pipe\` каждого интерсептора в обратном порядке и попадают к подписчику.

Упрощённо сборка цепочки в \`@angular/common/http\` выглядит так:

\`\`\`ts
function buildChain(fns: HttpInterceptorFn[], backend: HttpBackend, injector: EnvironmentInjector) {
  const end: HttpHandlerFn = (req) => backend.handle(req);
  return fns.reduceRight<HttpHandlerFn>(
    (next, fn) => (req) => runInInjectionContext(injector, () => fn(req, next)),
    end,
  );
}
// [auth, retry, cache] превращается в:
// (req) => auth(req, (r1) => retry(r1, (r2) => cache(r2, end)))
\`\`\`

### Пример 1. Порядок: запрос сверху вниз, ответ снизу вверх

\`\`\`ts
const log = (name: string): HttpInterceptorFn => (req, next) => {
  console.log(name, '→ запрос');
  return next(req).pipe(tap(event => console.log(name, '← событие типа', event.type)));
};

provideHttpClient(withInterceptors([log('A'), log('B'), log('C')]));

http.get('/api/users').subscribe(users => console.log('компонент получил', users));
// A → запрос
// B → запрос
// C → запрос
// (запрос ушёл в сеть)
// C ← событие типа 0   ← Sent: «запрос отправлен»
// B ← событие типа 0
// A ← событие типа 0
// C ← событие типа 4   ← HttpResponse
// B ← событие типа 4
// A ← событие типа 4
// компонент получил [...]
\`\`\`

Запрос проходит функции в порядке регистрации, а события ответа поднимаются через их \`pipe\` в обратном порядке — так устроена матрёшка из \`reduceRight\`. И обратите внимание: через интерсептор идёт **поток событий**, а не одно значение. Первым всегда приходит \`Sent\`, и интерсептор, который ждёт тело ответа, должен фильтровать \`event instanceof HttpResponse\`.

### Пример 2. Auth-интерсептор и зачем нужен \`clone()\`

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};
\`\`\`

Мы не мутируем \`req\`, а создаём копию с новым заголовком и отдаём её дальше через \`next\`. Если токена нет, пропускаем оригинал, ничего не ломая. А вот что бывает, если про \`clone()\` забыть:

\`\`\`ts
// ❌ Изменение молча теряется
const wrong: HttpInterceptorFn = (req, next) => {
  req.headers.set('X-Trace', 'abc'); // вернул НОВЫЙ HttpHeaders, который никто не сохранил
  return next(req);
};
// сервер увидит X-Trace = null

// ✅ Правильно
const right: HttpInterceptorFn = (req, next) =>
  next(req.clone({ setHeaders: { 'X-Trace': 'abc' } }));
// сервер увидит X-Trace = abc
\`\`\`

\`HttpHeaders.set()\` не меняет объект, а возвращает новый — ровно как \`String.prototype.replace\`. Неизменяемость нужна потому, что один и тот же запрос может пройти цепочку несколько раз (например, при \`retry\`), и каждая попытка должна стартовать с исходного состояния.

### \`HttpContextToken\` — метки для интерсепторов

Иногда конкретному запросу нужно сказать «а тебя не трогаю»: не кэшировать отчёт, не добавлять токен к запросу на обновление токена. Для этого есть \`HttpContextToken\` — ключ со значением по умолчанию, и \`HttpContext\` — набор таких ключей на запросе:

\`\`\`ts
export const SKIP_CACHE = new HttpContextToken<boolean>(() => false);

// в сервисе: явно отключаем кэш для одного запроса
http.get('/api/report', { context: new HttpContext().set(SKIP_CACHE, true) });

// в интерсепторе: читаем метку
if (req.context.get(SKIP_CACHE)) return next(req);
// для запросов без метки get() вернёт значение по умолчанию — false
\`\`\`

Метка живёт только внутри приложения и на сервер не уходит. Это лучше, чем «магический» заголовок \`X-Skip-Cache\`, который пришлось бы вырезать перед отправкой.

### Пример 3. Retry с экспоненциальной задержкой

Оператор \`retry\` при ошибке заново подписывается на источник, то есть заново вызывает \`next(req)\` — запрос уходит ещё раз. Объект-конфиг принимает \`count\` (сколько повторов максимум) и \`delay\` — функцию \`(error, retryCount)\`, которая возвращает Observable: как только он выдаст значение, делается повтор; если он завершится ошибкой, ошибка уходит подписчику. Важная деталь: \`retryCount\` начинается с **1**, а не с 0.

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
// i = 1, 2, 3 → паузы 600, 1200, 2400 мс (а не 300, 600, 1200!)
\`\`\`

Для паузы в 300, 600, 1200 мс нужен \`2 ** (i - 1) * 300\`. Но в продакшене повторять всё подряд нельзя, поэтому полная версия фильтрует метод и статус:

\`\`\`ts
const RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
const RETRYABLE_STATUSES = [0, 502, 503, 504]; // 0 — сеть недоступна, запрос не дошёл

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!RETRYABLE_METHODS.includes(req.method)) {
    return next(req); // POST и PATCH не повторяем: риск дублей
  }
  return next(req).pipe(
    retry({
      count: 3,
      delay: (err: unknown, retryCount: number) => {
        const retryable = err instanceof HttpErrorResponse && RETRYABLE_STATUSES.includes(err.status);
        if (!retryable) {
          return throwError(() => err); // 400, 401, 404 — повтор не поможет
        }
        return timer(2 ** (retryCount - 1) * 300);
      },
    }),
  );
};

// GET, сервер трижды ответил 503, потом 200:
//    0 мс  попытка 1
//  300 мс  попытка 2
//  900 мс  попытка 3
// 2100 мс  попытка 4 → ответ ok
// POST с ответом 503: одна попытка, сразу ошибка 503
// GET с ответом 404:  одна попытка, сразу ошибка 404
\`\`\`

Повтор имеет смысл только для временных сбоев: сеть моргнула (\`status 0\`), шлюз не дождался бэкенда (\`502\`, \`504\`), сервис перегружен (\`503\`). Ошибка клиента \`4xx\` при повторе не исчезнет.

### Мелкие помощники: \`of\`, \`tap\`, \`timer\`, \`throwError\`

Эти функции RxJS встречаются во всех примерах, поэтому коротко о каждой:

\`\`\`ts
of(1, 2).pipe(tap(v => console.log('tap видит', v))).subscribe(v => console.log('next', v));
// tap видит 1
// next 1
// tap видит 2
// next 2

throwError(() => new Error('boom'))
  .pipe(catchError(e => of('fallback: ' + e.message)))
  .subscribe(v => console.log(v));
// fallback: boom

timer(300).subscribe(v => console.log('timer выдал', v));
// (через 300 мс) timer выдал 0
\`\`\`

- \`of(...)\` — создаёт поток из готовых значений и сразу завершается. В кэше так возвращают сохранённый ответ без похода в сеть.
- \`tap(fn)\` — «подсмотреть»: выполняет побочное действие (лог, запись в кэш), не меняя значения.
- \`timer(ms)\` — выдаёт \`0\` через заданное время и завершается. Используется как пауза перед повтором.
- \`throwError(() => err)\` — поток, который сразу падает с ошибкой. Им пробрасывают ошибку дальше из \`catchError\` или из \`delay\` в \`retry\`.

### Пример 4. Кэширующий интерсептор

Кэш — это \`Map\`, которая живёт в сервисе (в функции хранить состояние неудобно и плохо для тестов). Для GET: если ответ уже есть, возвращаем \`of(cached)\`, и \`next\` **вообще не вызывается** — запрос в сеть не уходит. Иначе пропускаем дальше и сохраняем ответ через \`tap\`.

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class HttpCache {
  private store = new Map<string, { response: HttpResponse<unknown>; expires: number }>();

  get(key: string) {
    const entry = this.store.get(key);
    return entry && entry.expires > Date.now() ? entry.response : undefined;
  }
  set(key: string, response: HttpResponse<unknown>, ttlMs = 60_000) {
    this.store.set(key, { response, expires: Date.now() + ttlMs });
  }
  clear() {
    this.store.clear();
  }
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCache);

  if (req.method !== 'GET') {
    cache.clear(); // самая простая инвалидация: любое изменение сбрасывает кэш
    return next(req);
  }
  if (req.context.get(SKIP_CACHE)) {
    return next(req);
  }

  const key = req.urlWithParams;
  const cached = cache.get(key);
  if (cached) {
    return of(cached.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        cache.set(key, event.clone());
      }
    }),
  );
};

// withInterceptors([cacheInterceptor, logger]), где logger печатает каждый запрос:
// GET #1             → logger видит GET, сеть, получили {"call":1}
// GET #2             → получили {"call":1}   (ни logger, ни сеть ничего не видели)
// GET с SKIP_CACHE   → logger видит GET, сеть, получили {"call":2}
// POST               → logger видит POST, сеть (кэш очищен)
// GET #3             → logger видит GET, сеть, получили {"call":4}
\`\`\`

Ключ — \`urlWithParams\`, то есть URL вместе с query-параметрами: \`/api/users?page=2\` и \`/api/users?page=3\` — разные записи. Фильтр \`instanceof HttpResponse\` отсекает событие \`Sent\`. А интерсептор \`logger\`, стоящий после кэша, второй GET не увидел вовсе: кэш «закоротил» цепочку.

### Пример 5. Обработка 401 и обновление токена без бесконечного цикла

Сценарий: access token истёк, сервер отвечает 401 на три параллельных запроса. Нужно один раз получить новый токен и повторить все три. Здесь работают ещё три оператора:

- \`catchError(fn)\` — перехватывает ошибку потока и заменяет его другим Observable: повтором запроса или новой ошибкой.
- \`switchMap(fn)\` — по каждому значению (новому токену) подписывается на новый поток (повтор запроса) и отдаёт его результат.
- \`shareReplay(1)\` — делает поток общим: сколько бы подписчиков ни пришло, источник (запрос на refresh) выполняется один раз, а последнее значение раздаётся всем.

\`\`\`ts
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly token = signal<string | null>(null);
  private refreshInFlight$: Observable<string> | null = null;

  refresh(): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<{ accessToken: string }>('/api/auth/refresh', null, {
        withCredentials: true,                               // refresh token лежит в httpOnly-куке
        context: new HttpContext().set(SKIP_AUTH, true),     // этот запрос интерсептор не трогает
      })
      .pipe(
        map(r => r.accessToken),
        tap(token => this.token.set(token)),
        finalize(() => (this.refreshInFlight$ = null)),      // следующий refresh — новый запрос
        shareReplay(1),                                      // один запрос на всех ждущих
      );
    return this.refreshInFlight$;
  }
}

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }) : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_AUTH)) {
    return next(req);
  }
  const auth = inject(AuthService); // inject — синхронно, в начале функции

  return next(withToken(req, auth.token())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(switchMap(token => next(withToken(req, token))));
    }),
  );
};

// forkJoin трёх GET со старым токеном:
//   0 мс  GET /api/a, /api/b, /api/c с Bearer old-token → все три 401
// 100 мс  POST /api/auth/refresh, Authorization = null  ← ровно один раз
// 300 мс  GET /api/a, /api/b, /api/c с Bearer new-token
// 400 мс  компонент получил ["/api/a ok","/api/b ok","/api/c ok"]
\`\`\`

Три защиты в этом коде. Первая — \`SKIP_AUTH\` на самом refresh-запросе: он тоже идёт через \`HttpClient\`, а значит, через этот же интерсептор. Без метки на 401 от refresh интерсептор снова позвал бы refresh — бесконечный цикл. Вторая — \`shareReplay(1)\`: три запроса получили 401 почти одновременно, а refresh ушёл один. Третья — \`inject()\` вызван в начале функции. Если перенести его внутрь \`catchError\`, он выполнится позже, вне контекста внедрения, и упадёт с ошибкой \`NG0203: inject() function must be called from an injection context\`.

### Классические интерсепторы и \`withInterceptorsFromDi()\`

До Angular 15 интерсепторы были классами с методом \`intercept(req, next: HttpHandler)\` и регистрировались через multi-провайдер \`HTTP_INTERCEPTORS\`. Такой код живёт во многих проектах и в библиотеках, и его можно подключить рядом с функциональными:

\`\`\`ts
@Injectable()
export class LegacyLogInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    console.log('legacy (класс)');
    return next.handle(req); // у класса next — объект с методом handle()
  }
}

provideHttpClient(withInterceptors([fnA, fnB]), withInterceptorsFromDi());
// порядок: fnA → fnB → legacy (класс)

provideHttpClient(withInterceptorsFromDi(), withInterceptors([fnA, fnB]));
// порядок: legacy (класс) → fnA → fnB

// и сам класс по-прежнему регистрируется провайдером:
{ provide: HTTP_INTERCEPTORS, useClass: LegacyLogInterceptor, multi: true }
\`\`\`

\`withInterceptorsFromDi()\` вставляет все классовые интерсепторы одним звеном туда, где эта функция стоит среди аргументов. Для нового кода берите функции: проще тестировать, порядок виден в одном массиве.

### \`HttpBackend\` — запрос в обход всех интерсепторов

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ConfigLoader {
  // HttpClient поверх «голого» бэкенда: цепочка интерсепторов пуста
  private rawHttp = new HttpClient(inject(HttpBackend));

  load() {
    return this.rawHttp.get<AppConfig>('/assets/config.json');
  }
}
// обычный http.get('/api/via-client') → интерсептор видит, затем сеть
// rawHttp.get('/api/via-backend')    → сразу сеть, интерсепторы молчат
\`\`\`

Так загружают конфигурацию до старта приложения (интерсепторы ещё не знают базовый URL) и так же можно разорвать цикл с refresh-токеном. Минус — пропадают вообще все интерсепторы, включая XSRF и логирование, поэтому для точечного исключения лучше \`HttpContextToken\`.

### Где это применяется на практике

- **Авторизация**: токен в \`Authorization\`, обновление по 401, редирект на логин при окончательном отказе.
- **Корпоративные заголовки**: \`X-Tenant-Id\` в мультиарендных системах, \`Accept-Language\` из текущей локали, \`X-Request-Id\` для сквозной трассировки запросов в логах бэкенда.
- **Глобальный индикатор загрузки**: счётчик активных запросов \`++\` при старте и \`--\` в \`finalize\`; полоса прогресса видна, пока счётчик больше нуля.
- **Единая обработка ошибок**: тост «Сервер недоступен» на \`5xx\`, страница «Нет доступа» на \`403\`.
- **Кэш справочников**: валюты, страны, статусы — их запрашивают фильтры больших гридов и десятки выпадающих списков в формах, а меняются они раз в месяц.
- **Метрики**: время ответа каждого эндпоинта через \`performance.now()\` до запроса и в \`finalize\`, отправка медленных запросов в мониторинг.
- **Моки для разработки и e2e**: интерсептор отдаёт фикстуру через \`of(new HttpResponse(...))\`, пока бэкенд не готов.

## Важные нюансы и подводные камни

- **Забыли \`clone()\`.** \`req.headers.set(...)\` возвращает новый объект, исходный запрос не меняется — изменение молча теряется.
- **Порядок регистрации — это логика.** Интерсептор после кэша не увидит запрос, который кэш «закоротил» через \`of(cached)\`. Логгер, стоящий до \`retry\`, увидит запрос один раз, а стоящий после — каждую попытку. Обычно auth ставят первым, а логирование — последним: так лог видит ровно то, что уходит в сеть, уже с токеном.
- **\`inject()\` — только синхронно в теле функции.** В колбэках \`catchError\`, \`tap\`, \`switchMap\` будет \`NG0203\`.
- **\`retryCount\` в \`retry({ delay })\` начинается с 1.** \`2 ** i * 300\` даёт 600, 1200, 2400 мс, а не 300, 600, 1200.
- **Retry неидемпотентных запросов** (\`POST\`, \`PATCH\`) создаёт дубли: сервер мог успеть создать заказ, а упал только ответ. Повторяйте по методу и статусу. \`4xx\` не повторяют вовсе.
- **Кэш без инвалидации** — классический баг: после \`POST\` или \`PUT\` пользователь видит старые данные. Чистите связанные ключи или весь кэш.
- **Кэш и смена пользователя.** Ключ — URL, а токен в ключ не входит. Если не очистить кэш при выходе из системы, следующий пользователь на том же компьютере увидит чужие данные.
- **\`HttpResponse.clone()\` — поверхностная копия.** Тело ответа — тот же объект: если компонент сделает \`users.push(...)\`, массив изменится и в кэше. Отдавайте данные как неизменяемые или копируйте тело.
- **\`HttpContext\` общий у клонов.** По документации контекст изменяем и разделяется между копиями запроса, сделанными через \`clone()\`: \`copy.context.set(...)\` виден и в оригинале.
- **Бесконечный цикл на 401.** Refresh-запрос сам проходит через auth-интерсептор. Помечайте его \`HttpContextToken\` или отправляйте через \`HttpBackend\`.
- **Параллельные 401.** Без общего \`shareReplay\` каждый упавший запрос запустит свой refresh; если сервер делает ротацию refresh-токенов, второй refresh придёт с уже использованным токеном и получит отказ, а защита от повторного использования может отозвать всю сессию.
- **Интерсепторы видят только \`HttpClient\`.** Обычный \`fetch()\`, \`<img src>\`, сторонние SDK со своим транспортом и \`navigator.sendBeacon\` идут мимо цепочки. \`httpResource\` (в Angular 21 помечен \`@experimental\`) построен на \`HttpClient\`, поэтому через интерсепторы проходит.
- **Ленивые маршруты.** Если в \`providers\` ленивого маршрута снова вызвать \`provideHttpClient()\`, там появится независимый \`HttpClient\` без корневых интерсепторов. Чтобы запросы шли и через родительскую цепочку, добавьте \`withRequestsMadeViaParent()\`.
- **\`HttpClient\` без \`provideHttpClient()\`.** В Angular 21 \`HttpClient\` помечен \`providedIn: 'root'\` и внедряется даже без \`provideHttpClient()\`, но ваших интерсепторов в цепочке тогда не будет: \`withInterceptors\` работает только как аргумент \`provideHttpClient\`.
- **\`withFetch()\` и прогресс загрузки.** \`FetchBackend\` не сообщает о прогрессе отправки файла (\`UploadProgress\`), это отмечено прямо в типах Angular.

**Плюсы:** одна точка для сквозной логики, функции легко читать и тестировать, неиспользуемые функции вырезаются сборщиком (tree-shaking), порядок виден в одном массиве, вся мощь RxJS на потоке ответа, \`inject()\` без конструктора.
**Минусы:** скрытая магия — новичок не видит, откуда взялся заголовок; порядок легко перепутать; ошибки в одном интерсепторе ломают все запросы приложения; асинхронный код внутри требует аккуратности с \`inject()\` и циклами.

## Как это спрашивают на собеседовании

**Главный вывод:** функциональный интерсептор — это \`(req, next) => Observable\`, вызванный в injection context. Запрос неизменяем, меняем его через \`clone()\`; результат \`next(req)\` — поток событий, на который навешиваются \`retry\`, \`catchError\`, \`tap\`. Запросы идут по цепочке в порядке регистрации, ответы — в обратном.

Типичные формулировки: «Как добавить токен ко всем запросам?», «Как сделать обновление токена по 401?», «Чем функциональные интерсепторы отличаются от классовых?», «Как закэшировать GET-запросы?».

Что могут спросить следом:

- *Как исключить один запрос из интерсептора?* — Через \`HttpContextToken\`: ставим метку в \`context\` запроса и проверяем её в интерсепторе.
- *Как избежать нескольких refresh при параллельных 401?* — Хранить один общий Observable обновления через \`shareReplay(1)\` и сбрасывать его в \`finalize\`.
- *Почему бы не делать retry для всех запросов?* — \`POST\` может продублировать операцию, а \`4xx\` повтором не лечится; повторяем только идемпотентные методы и временные статусы.
- *Как тестировать интерсептор?* — \`provideHttpClient(withInterceptors([fn]))\` плюс \`provideHttpClientTesting()\` и \`HttpTestingController\`, который ловит исходящие запросы и отдаёт фейковые ответы.
- *Что делает \`withRequestsMadeViaParent()\`?* — Направляет запросы дочернего \`HttpClient\` через родительский, чтобы сработали и корневые интерсепторы.

### Ответ на 1 минуту

> Начиная с Angular 15 интерсептор — это функция типа \`HttpInterceptorFn\`, которую регистрируют через \`provideHttpClient(withInterceptors([...]))\`. Она получает иммутабельный \`HttpRequest\` и \`next\`, поэтому запрос меняем через \`req.clone()\`, а результат \`next(req)\` — это поток событий, на который навешиваются RxJS-операторы. Angular собирает функции в матрёшку и вызывает каждую в injection context, так что \`inject()\` работает, но только синхронно. Запросы идут в порядке регистрации, ответы — в обратном. На этом я строю auth с обновлением токена по 401 через \`catchError\` и один общий refresh на \`shareReplay\`, retry с экспоненциальной задержкой только для GET и статусов 0, 502–504, и кэш справочников, где \`next\` не вызывается вовсе. Ловушки: refresh-запрос помечаю \`HttpContextToken\`, иначе будет цикл, а кэш чищу после изменений и при логауте. Старые классовые интерсепторы подключаю через \`withInterceptorsFromDi()\`.`,
      en: `## In short

An interceptor is a **middleman function** that every HTTP request passes through on its way out, and every response passes through on its way back. Since Angular 15 it is a plain function of type \`HttpInterceptorFn\`, not a class with constructor DI.

Analogy: a parcel travels along a conveyor past several desks. At the first desk they stick on a pass (the token), at the second they check whether the same parcel is already in the warehouse (cache), at the third they write it into a log. The response travels back past the same desks in **reverse** order.

## How it works, step by step

1. You register a list of functions: \`provideHttpClient(withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]))\`.
2. Each function gets two arguments: \`req\` — the request itself, and \`next\` — the "next desk" in the chain.
3. The request is **immutable**: you cannot change a header in place, you make a copy — \`req.clone({ setHeaders: ... })\`.
4. You return \`next(newReq)\`. That is an \`Observable\` of the response — you can pipe any RxJS operators onto it.
5. Requests travel the chain **top-down**, in registration order; responses come back **bottom-up**.
6. \`inject()\` works inside the function: it runs in an injection context, so you grab services without a constructor.

## Example

\`\`\`ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } })
    : req;
  return next(authReq);
};
\`\`\`

Why it looks like this: we never mutate \`req\`, we create a copy with the new header and hand it on via \`next\`. If there is no token we simply pass the original through, breaking nothing.

## Retry and caching on the same mechanism

Retry is just an operator on the response stream. \`retry\` with a \`delay\` function gives exponential backoff (0.3s, 0.6s, 1.2s):

\`\`\`ts
export const retryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(retry({ count: 3, delay: (_, i) => timer(2 ** i * 300) }));
\`\`\`

Caching is a \`Map<url, HttpResponse>\` (usually living in a service). For GETs: if the response is already in the map, return \`of(cached)\` and **never call** \`next\` — no network request goes out. Otherwise pass through and store the response via \`tap\`.

## What to say in the interview

> Since Angular 15 interceptors are functions of type \`HttpInterceptorFn\` registered in \`provideHttpClient(withInterceptors([...]))\`. The function receives an immutable \`HttpRequest\` and a \`next\` handler, so to modify the request you call \`req.clone()\`, and the result of \`next(req)\` is an Observable you can pipe RxJS operators onto. Requests travel the chain in registration order and responses come back in reverse, which is why auth goes first and logging last. On this you build auth (attaching the token), retry with exponential backoff via \`retry({ count, delay })\`, caching (returning \`of(cached)\` for GETs instead of calling \`next\`) and centralized 401 handling with a redirect to login. \`inject()\` works inside because the function runs in an injection context; legacy class-based \`HTTP_INTERCEPTORS\` are plugged in alongside via \`withInterceptorsFromDi()\`. The functional style is easier to test and it is tree-shakeable.

## Gotchas

- **Forgetting \`clone()\`** and trying \`req.headers.set(...)\` in place — headers are immutable, the change is silently lost.
- **Registration order**: an interceptor placed after the cache never sees a request the cache short-circuited with \`of(cached)\`.
- They will ask **how this coexists with legacy class interceptors** — the answer is \`withInterceptorsFromDi()\`.
- **Retrying non-idempotent requests** (POST/PATCH) creates duplicates — restrict by method and status.
- **A cache with no invalidation** is the classic bug: after a POST/PUT you must evict the matching keys.
- Catch 401 with \`catchError\` inside the interceptor, but **beware of an infinite loop**: the refresh request goes through the very same interceptor.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, retryInterceptor, cacheInterceptor]),
    ),
  ],
});`,
  },
  {
    id: 'ng-038',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['error-handling', 'error-handler', 'global'],
    question: {
      ru: 'Как организовать глобальную обработку ошибок через ErrorHandler и чем она отличается от перехвата в HTTP?',
      en: 'How do you set up global error handling via ErrorHandler, and how does it differ from HTTP-level handling?',
    },
    answer: {
      ru: `## В чём суть

\`ErrorHandler\` — это единый приёмник ошибок, которые никто не поймал. Исключение в обработчике клика, в шаблоне, в \`ngOnInit\`, в \`effect\` Angular перехватывает сам и передаёт в метод \`handleError\`. По умолчанию тот просто пишет в консоль \`ERROR ...\`; подменив его своим классом, вы получаете одно место для логирования (Sentry и аналоги) и для общего сообщения пользователю. Перехват в HTTP — другой уровень: интерсептор и \`catchError\` видят только ошибки запросов и ещё могут их «починить» — повторить запрос, обновить токен, превратить ответ сервера в понятную доменную ошибку.

Аналогия — цирк. HTTP-интерсептор — это страховочный трос на конкретном трюке: он рассчитан на одно известное падение и может вернуть акробата на трапецию (повторить запрос). \`ErrorHandler\` — сетка под всем манежем: ловит любого, кто сорвался неожиданно, ничего уже не исправляет, а фиксирует факт: кто упал, где и почему.

**Какую проблему решает.** Без центральной точки ошибки тонут в консоли браузера у пользователя: команда о них не знает, а пользователь видит полупустой экран без объяснений. Расставить \`try/catch\` везде невозможно — ошибки в шаблонах и хуках жизненного цикла вообще происходят внутри Angular, а не в вашем коде. \`ErrorHandler\` даёт один «последний рубеж», интерсептор — одно место для сетевой логики. Если смешать уровни, получится классика: один и тот же HTTP 500 показывается пользователю двумя тостами.

## Словарик терминов

- **Необработанная ошибка (uncaught error)** — исключение, которое никто не поймал через \`try/catch\`, \`catchError\` или колбэк \`error\` при подписке.
- **\`ErrorHandler\`** — класс из \`@angular/core\` с одним методом \`handleError(error)\`; Angular вызывает его для всех ошибок, которые перехватил сам.
- **DI-токен и провайдер (\`{ provide, useClass }\`)** — запись «по этому ключу выдавай вот этот класс»; так стандартный \`ErrorHandler\` подменяется своим.
- **HTTP-интерсептор (\`HttpInterceptorFn\`)** — функция-прослойка, через которую проходит каждый запрос \`HttpClient\` и каждый ответ; подключается через \`withInterceptors([...])\`.
- **\`HttpErrorResponse\`** — объект ошибки \`HttpClient\`: \`status\` (0 — нет связи или CORS, 4xx — ошибка запроса, 5xx — ошибка сервера), \`message\`, \`error\` (тело ответа).
- **\`catchError\`, \`throwError\`, \`retry\`** — RxJS-операторы: поймать ошибку потока, создать поток-ошибку, переподписаться на источник после ошибки.
- **Zone.js и \`NgZone\`** — библиотека, которая оборачивает таймеры, промисы и события браузера, чтобы Angular знал, что «что-то произошло»; \`NgZone\` — её Angular-обёртка с методами \`run\` и \`runOutsideAngular\`.
- **Zoneless** — режим без Zone.js: экран обновляется по сигналам и событиям шаблона. В Angular 21 это режим по умолчанию для новых приложений.
- **\`provideBrowserGlobalErrorListeners()\`** — провайдер (появился в Angular 20), который слушает события \`error\` и \`unhandledrejection\` на \`window\` и пересылает их в \`ErrorHandler\`.
- **\`unhandledrejection\`** — событие браузера «промис отклонён, а \`.catch\` у него нет».
- **Sentry** — внешний сервис сбора ошибок; дальше в тексте его можно заменить любым аналогом или своим бэкендом логов.

## Как это работает под капотом

Angular сам вызывает ваш код — обработчики событий, шаблоны, хуки, эффекты — и каждое такое место обёрнуто примерно так:

\`\`\`ts
// упрощённо: так Angular вызывает обработчик (click) из шаблона
function wrapListener(listenerFn) {
  return (event) => {
    try {
      return listenerFn(event);
    } catch (error) {
      reportError(error); // дальше по стеку ошибка не летит
    }
  };
}

// а так ошибка доставляется до вашего класса
function reportError(error) {
  ngZone.runOutsideAngular(() => {
    injector.get(ErrorHandler).handleError(error);
  });
}
\`\`\`

По шагам:

1. При старте в корневом инжекторе уже есть \`ErrorHandler\`: его регистрирует \`bootstrapApplication\` (в модульных приложениях — \`BrowserModule\`). Если вы добавили свой провайдер, по токену \`ErrorHandler\` достаётся ваш класс.
2. Ошибки «внутри Angular» ловятся без всяких зон: обработчики событий из шаблона, проверка изменений (шаблоны, \`ngOnInit\` и другие хуки), \`effect\`, неудачная загрузка \`@defer\` без блока \`@error\`, старт приложения и инициализаторы. Angular оборачивает эти вызовы в \`try/catch\` и отдаёт ошибку в \`handleError\`.
3. Асинхронный код (\`setTimeout\`, промис без \`.catch\`, Observable без обработчика \`error\`) вызывает уже браузер, а не Angular, поэтому \`try/catch\` фреймворка его не накрывает. В приложении с Zone.js такие ошибки перехватывает зона, сообщает через \`NgZone.onError\`, и Angular пересылает их в \`handleError\`.
4. В zoneless-приложении зоны нет, поэтому асинхронные ошибки доходят до \`ErrorHandler\`, только если подключён \`provideBrowserGlobalErrorListeners()\`: он вешает на \`window\` слушатели \`error\` и \`unhandledrejection\`.
5. Сам \`handleError\` Angular вызывает через \`runOutsideAngular\`, то есть вне зоны. В zone-приложении из-за этого изменение обычного поля в обработчике экран не обновит, а запись в сигнал — обновит.
6. HTTP-ошибка — не отдельный мир. \`HttpClient\` возвращает Observable, ошибка проходит цепочку интерсепторов (там живут \`retry\` и \`catchError\`) и приходит подписчику. Если подписчик не передал обработчик \`error\`, RxJS выбрасывает её через \`setTimeout\`, и дальше она идёт путём из шагов 3–4 прямо в \`ErrorHandler\`. Интерсептор — первая линия обороны, \`ErrorHandler\` — последняя.

### \`ErrorHandler\`: стандартная реализация и замена своей

Стандартный обработчик в Angular 21 устроен буквально так:

\`\`\`ts
class ErrorHandler {
  handleError(error: any): void {
    console.error('ERROR', error);
  }
}
// throw new Error('boom') в обработчике клика →
// в консоли: ERROR Error: boom
\`\`\`

Свой обработчик — обычный сервис с тем же методом, подключённый по токену:

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggingService);
  private toast = inject(ToastService);

  handleError(error: unknown): void {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.captureException(err);        // Sentry или свой бэкенд логов
      if (!(error instanceof HttpErrorResponse)) {
        this.toast.show('Что-то пошло не так');  // HTTP-тосты показывает интерсептор
      }
      console.error(err);                        // стек остаётся в консоли
    } catch (handlerError) {
      console.error('ErrorHandler failed', handlerError, error);
    }
  }
}

bootstrapApplication(App, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
});
\`\`\`

Почему так. В типах Angular параметр объявлен как \`any\`, а в своей реализации честнее писать \`unknown\`: через \`throw\` можно бросить строку, объект, \`HttpErrorResponse\` — что угодно. Поэтому сначала нормализуем ошибку, потом одним местом пишем лог и одним местом говорим пользователю. Внутренний \`try/catch\` нужен, чтобы сбой самого обработчика (упал сервис логов, тост ещё не создан) не похоронил исходную ошибку.

### \`provideBrowserGlobalErrorListeners\`: какие ошибки вообще доходят

Проверим на zoneless-приложении, что видит обработчик \`handleError(e) { console.log('ErrorHandler:', e.message) }\`:

\`\`\`ts
@Component({
  selector: 'app-demo',
  template: \`<button (click)="click()">x</button>\`,
})
export class Demo {
  n = signal(0);
  constructor() {
    effect(() => { if (this.n() === 1) throw new Error('effect error'); });
  }
  click()   { throw new Error('click handler error'); }
  timer()   { setTimeout(() => { throw new Error('setTimeout error'); }); }
  promise() { Promise.reject(new Error('promise rejection')); }
  http()    { throwError(() => new Error('HTTP 500')).subscribe(); } // нет error-колбэка
}

// БЕЗ provideBrowserGlobalErrorListeners():
// клик по кнопке → ErrorHandler: click handler error
// n.set(1)       → ErrorHandler: effect error
// timer()        → ErrorHandler молчит, ошибка уходит в консоль как необработанная
// promise()      → ErrorHandler молчит
// http()         → ErrorHandler молчит

// С provideBrowserGlobalErrorListeners():
// все пять случаев → ErrorHandler: ...
\`\`\`

Клик и \`effect\` Angular вызывает сам, поэтому ловит их в любом режиме. Таймер, промис и «осиротевший» Observable вызывает браузер, и без зоны единственный способ их увидеть — глобальные события \`window\`. Поэтому в Angular 20+ CLI добавляет \`provideBrowserGlobalErrorListeners()\` в новые проекты; в старом проекте, переведённом на zoneless, его легко забыть.

### \`NgZone.run\` и \`runOutsideAngular\`: почему из \`handleError\` не обновляется экран

\`runOutsideAngular(fn)\` выполняет код вне зоны Angular — зона не узнает о нём и не запустит проверку изменений. \`run(fn)\` — наоборот, возвращает код в зону. В приложении с Zone.js \`handleError\` всегда вызывается через \`runOutsideAngular\`:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal('');   // вариант 1: сигнал
  plainMessage = '';      // вариант 2: обычное поле
}

// handleError(e) { this.toast.message.set(e.message); }
// → текст тоста появляется на экране: запись в сигнал сама планирует обновление

// handleError(e) { this.toast.plainMessage = e.message; }
// → экран НЕ обновился: обработчик работает вне зоны, проверку изменений никто не запустил

// handleError(e) { this.zone.run(() => this.toast.plainMessage = e.message); }
// → снова работает: код вернули в зону
\`\`\`

Это проверено на Angular 21 с Zone.js: при ошибке в \`setTimeout\` и в обработчике клика \`NgZone.isInAngularZone()\` внутри \`handleError\` возвращает \`false\`. Сигналы спасают, потому что начиная с Angular 18 их изменение планирует проверку изменений и без помощи зоны.

### \`HttpInterceptorFn\` и \`withInterceptors\`

Интерсептор — функция \`(req, next) => Observable\`. Она получает запрос, может его изменить, передаёт дальше через \`next(req)\` и может обработать поток ответа. Внутри работает \`inject()\`.

\`\`\`ts
export const logInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('→', req.method, req.url);
  return next(req);
};

provideHttpClient(withInterceptors([authInterceptor, logInterceptor, httpErrorInterceptor]));
// GET /api/users → в консоли: → GET /api/users
\`\`\`

Порядок в массиве — это порядок обёрток: первый интерсептор видит запрос первым, а ответ и ошибку — последним. Сюда кладут всё, что касается сети: заголовки, токены, повторы, перевод ответов сервера в понятные ошибки.

### \`HttpErrorResponse\`: что лежит в ошибке запроса

- \`status === 0\` — ответа не было вообще: нет сети, CORS, запрос оборван. Пользователю — «нет связи».
- \`4xx\` — ошибка запроса: 401 (нужно войти или обновить токен), 403 (нет прав), 404, 409, 422 (ошибки валидации полей — их показывает форма, а не глобальный тост).
- \`5xx\` — сбой сервера: повтор для 502/503/504 часто помогает, для 500 — обычно нет.

### \`catchError\`, \`throwError\` и \`retry\` в интерсепторе

\`retry({ count, delay })\` переподписывается на запрос, то есть отправляет его заново; функция \`delay(err, attempt)\` возвращает таймер (повторить) или \`throwError\` (сдаться). \`catchError(fn)\` ловит ошибку и обязан вернуть новый поток: запасное значение или ту же ошибку через \`throwError(() => err)\`.

### Пример. Интерсептор и \`ErrorHandler\` работают вместе

\`\`\`ts
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    retry({
      count: 2,
      delay: (err: HttpErrorResponse, attempt) =>
        err.status === 503 ? timer(attempt * 500) : throwError(() => err),
    }),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) toast.show('Нет связи с сервером');
      else if (err.status >= 500) toast.show('Сервер недоступен, попробуйте позже');
      return throwError(() => err); // пробрасываем дальше: компонент может обработать сам
    }),
  );
};

export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);
  handleError(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      console.log('ErrorHandler: log only (HTTP', error.status + ')');
      return;
    }
    this.toast.show('Что-то пошло не так');
    console.log('ErrorHandler: log', (error as Error).message);
  }
}

// 1) GET /api/users → 500, компонент подписался без error-колбэка:
// toast: Сервер недоступен, попробуйте позже
// ErrorHandler: log only (HTTP 500)

// 2) GET /api/users → 503, 503, 200:
// users [ 'Anna' ]        ← две незаметные повторные попытки

// 3) TypeError в обычном коде:
// toast: Что-то пошло не так
// ErrorHandler: log Cannot read properties of null (reading 'x')
\`\`\`

Почему так. Интерсептор знает контекст запроса и решает, что сказать пользователю, а ошибку не глотает — компонент может показать свою подсказку. Если компонент её не обработал, ошибка всё равно долетает до \`ErrorHandler\`, но тот уже только пишет лог: тост показан, второй не нужен. \`retry\` стоит **до** \`catchError\`, иначе \`catchError\` перехватит ошибку раньше, чем \`retry\` успеет повторить запрос.

### Где это применяется на практике

- **Сбор ошибок в Sentry или свой бэкенд**: в \`handleError\` к ошибке добавляют id пользователя, текущий маршрут, версию сборки — без этого ошибку с прода не воспроизвести.
- **Единый тост «Что-то пошло не так»** с кнопкой «Обновить страницу» для всего, что не про сеть.
- **HTTP-слой корпоративного приложения**: 401 → обновить токен и повторить запрос, 403 → страница «нет доступа», 503 → повтор с паузой, \`status 0\` → баннер «вы офлайн».
- **Ошибка загрузки lazy-чанка после деплоя** (браузер держит старый \`index.html\`, а файлов уже нет): её распознают в общем обработчике или в \`withNavigationErrorHandler\` роутера и предлагают перезагрузить страницу.
- **Дашборды и большие гриды**: у каждого виджета свой \`catchError\` с заглушкой «не удалось загрузить», чтобы один упавший запрос не оставлял пустой экран; \`ErrorHandler\` страхует всё остальное.

## Важные нюансы и подводные камни

- **\`handleError\` вызывается вне Angular-зоны.** Распространённое заблуждение — что внутри можно спокойно менять поля и навигировать. В zone-приложении обычное поле экран не обновит; используйте сигналы или \`NgZone.run\`.
- **Zoneless без глобальных слушателей не видит асинхронные ошибки.** Ошибки из CD, хуков, событий шаблона и \`effect\` доходят и так, а \`setTimeout\`, промисы и Observable без обработчика — только с \`provideBrowserGlobalErrorListeners()\`.
- **Промисы вне зоны и в zone-приложении.** Код стороннего SDK, запущенный через \`runOutsideAngular\` или до старта Angular, зона не видит — те же глобальные слушатели закрывают и этот случай.
- **Ошибка внутри самого \`handleError\`.** Синхронный \`throw\` не зацикливается бесконечно: ошибку, брошенную внутри обработчика события \`error\`, браузер повторно не пересылает. Но исходная ошибка теряется в шуме, поэтому тело оборачивают в \`try/catch\`.
- **Настоящий бесконечный цикл — асинхронный.** Лог отправляется через \`HttpClient\`, запрос логов падает, его ошибка без обработчика снова приходит в \`handleError\`, тот снова шлёт лог… Запросы логов отправляют с собственным \`catchError(() => EMPTY)\` (или через \`navigator.sendBeacon\`), а одинаковые ошибки дедуплицируют.
- **Двойное уведомление.** Интерсептор показал тост про 500, \`ErrorHandler\` показал свой. Договоритесь, кто главный: HTTP-ошибки в \`ErrorHandler\` только логируются.
- **Молчаливое проглатывание.** Пустой \`catchError(() => EMPTY)\` убивает и ошибку, и шанс её найти. Если глотаете — логируйте.
- **Ошибки старта приложения.** Упавший инициализатор или конструктор корневого компонента попадает в \`ErrorHandler\`, и одновременно отклоняется промис \`bootstrapApplication\` — \`.catch(err => console.error(err))\` в \`main.ts\` не убирайте.
- **SSR.** На сервере нет \`window\`, тостов и \`localStorage\`; \`provideBrowserGlobalErrorListeners()\` там просто ничего не делает. Для сервера нужен свой обработчик, который пишет в серверный лог.
- **Тесты.** В \`TestBed\` опция \`rethrowApplicationErrors\` по умолчанию \`true\`: ошибка, пойманная при проверке изменений, не только уходит в \`ErrorHandler\`, но и пробрасывается, чтобы тест упал.
- **Не всё — для глобального обработчика.** Ошибки валидации (400/422 с полями) показывает форма рядом с полем; в глобальный тост они превращаются в бессмысленное «что-то пошло не так».

**Плюсы:** одна точка для логов и уведомлений, ловит ошибки шаблонов, хуков и эффектов, которые иначе не перехватить; интерсептор даёт одно место для повторов и обработки статусов.
**Минусы:** работает «после факта» и ничего не чинит; вызывается вне зоны; в zoneless требует явного подключения глобальных слушателей; легко получить двойные тосты или рекурсию с логированием по HTTP.

## Как это спрашивают на собеседовании

**Главный вывод:** \`ErrorHandler\` — последний рубеж для всех необработанных ошибок, где их логируют и показывают общий тост; HTTP-интерсептор — первая линия только для запросов, где их ещё можно повторить, обновить токен или перевести в доменную ошибку. Ошибка, которую интерсептор пробросил и никто не поймал, всё равно доходит до \`ErrorHandler\`.

Типичные формулировки: «Как организовать глобальную обработку ошибок в Angular?», «Чем \`ErrorHandler\` отличается от \`catchError\` в интерсепторе?», «Почему ошибка из \`setTimeout\` не дошла до нашего \`ErrorHandler\`?».

Что могут спросить следом:

- *Почему из \`handleError\` не обновляется экран?* — Angular вызывает его вне зоны; меняйте сигналы или оборачивайте в \`NgZone.run\`.
- *Что меняется в zoneless?* — Ошибки CD, событий и эффектов доходят как раньше, а таймеры и промисы — только с \`provideBrowserGlobalErrorListeners()\`.
- *Где делать retry и обновление токена?* — В интерсепторе: он знает запрос и может отправить его заново.
- *Как не показать два тоста на один HTTP 500?* — Тост показывает интерсептор, а \`ErrorHandler\` для \`HttpErrorResponse\` только логирует.
- *Можно ли логировать из \`ErrorHandler\` через \`HttpClient\`?* — Можно, но с собственным \`catchError\` у запроса логов, иначе его падение зациклит обработчик.

### Ответ на 1 минуту

> \`ErrorHandler\` — это DI-токен с методом \`handleError\`, единая точка для всех необработанных ошибок. Angular сам оборачивает в \`try/catch\` всё, что вызывает: обработчики событий, шаблоны, хуки, эффекты — и отдаёт ошибку туда. По умолчанию это \`console.error\`, а мы подменяем его своим классом через \`{ provide: ErrorHandler, useClass: ... }\` и шлём ошибки в Sentry плюс показываем общий тост. HTTP-интерсептор — другой уровень: там ошибку ещё можно исправить — повторить запрос через \`retry\`, обновить токен, превратить 4xx в доменную ошибку, — а дальше её пробрасывают, и если никто не поймал, она долетает до \`ErrorHandler\`, который её только логирует, чтобы не было двух тостов. Из нюансов: \`handleError\` вызывается вне зоны, поэтому UI обновляю через сигналы, а в zoneless для ошибок из таймеров и промисов нужно подключить \`provideBrowserGlobalErrorListeners()\`.`,
      en: `## In short

\`ErrorHandler\` is **one shared sink for every unhandled error** in the app. Anything that blew up and nobody caught — an exception in a lifecycle hook, in a click handler, in async code inside the zone — lands in its \`handleError\` method. By default it just does \`console.error\`; by swapping it out you centralize logging (Sentry, etc.).

Analogy: **the safety net under a circus trapeze**. The acrobat (your code) is supposed to land on their own; if they slip, the net catches them. HTTP handling is the opposite — a safety rope on one specific trick, catching only one kind of fall.

## How it works, step by step

1. Angular registers its own \`ErrorHandler\` in the root injector by default.
2. You write your own class with a \`handleError(error: unknown)\` method and override the token: \`{ provide: ErrorHandler, useClass: GlobalErrorHandler }\`.
3. Any error not caught locally (\`try/catch\`, \`catchError\`) bubbles up to Angular, and Angular calls your \`handleError\`.
4. Inside you decide what to do: log to an external service, show the user a toast, optionally navigate to an error page.
5. \`handleError\` runs **inside** the Angular zone, so navigating and updating the UI straight from it works.

## Example

\`\`\`ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notifier = inject(NotificationService);
  handleError(error: unknown): void {
    const e = error instanceof HttpErrorResponse ? error : asError(error);
    this.notifier.show('Something went wrong');
    console.error(e);
  }
}
// providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
\`\`\`

Why it looks like this: first we normalize "whatever came in" into a sane object (the parameter is \`unknown\` — a plain string can arrive), then we tell the user in one place and write to the log in one place.

## How it differs from HTTP-level handling

- An **HTTP interceptor / \`catchError\`** catches **network errors only**: 4xx/5xx statuses, timeouts. That is where retry, token refresh and mapping server responses to domain errors belong. It is the local, meaningful layer.
- \`ErrorHandler\` catches **everything else**: \`TypeError\`, render errors, uncaught \`throw\`. It is the last line of defence, where you no longer "fix" anything — you record the fact.
- Rule of thumb: fix and enrich in the interceptor, log and show a generic toast in \`ErrorHandler\`. Otherwise the same failure is reported to the user twice.

## What to say in the interview

> \`ErrorHandler\` is a DI token and the single entry point for all unhandled errors: exceptions in lifecycle hooks, event handlers and async code inside the zone. The default implementation writes to \`console.error\`; we replace it with our own class via \`{ provide: ErrorHandler, useClass: ... }\` and wire Sentry plus one user-facing notification there. It matters to separate the layers: the HTTP interceptor and \`catchError\` own network errors — retry, token refresh, mapping 4xx/5xx to domain errors; \`ErrorHandler\` is the last line of defence for everything else, including \`TypeError\` and render errors. It runs inside the Angular zone, so you can navigate and update the UI from it, but you must guard against throwing inside the handler itself — that loops. In zoneless mode the behaviour is the same: errors from change detection and effects still reach \`ErrorHandler\`. Promises rejected outside the zone never get there, so we also attach \`window.onunhandledrejection\`, and for SSR we keep a separate strategy because there is no \`window\` and no toasts on the server.

## Gotchas

- **Throwing inside \`handleError\`** produces a new error → infinite loop. Wrap the body in \`try/catch\`.
- **Double notification**: the interceptor already showed a toast for the 500 and \`ErrorHandler\` shows another. Decide who owns HTTP.
- **Promises outside the zone** (a \`.then\` from a third-party SDK) may not arrive — you need a global \`window.onunhandledrejection\`.
- **Silent swallowing**: an empty \`catchError(() => EMPTY)\` kills both the error and any chance of finding it. Always log.
- **SSR**: no \`window\`, no \`localStorage\`, no UI notifications on the server — you need a separate implementation.
- They will ask about **zoneless**: the answer is that nothing changes, errors from CD and \`effect\` still reach \`ErrorHandler\`.`,
    },
    codeSnippet: `@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggingService);
  handleError(error: unknown): void {
    this.logger.captureException(error);
  }
}`,
  },
  {
    id: 'ng-039',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['app-initializer', 'bootstrap', 'startup'],
    question: {
      ru: 'Зачем нужен APP_INITIALIZER / provideAppInitializer и как он влияет на старт приложения?',
      en: 'What is APP_INITIALIZER / provideAppInitializer for, and how does it affect app startup?',
    },
    answer: {
      ru: `## В чём суть

\`provideAppInitializer\` (и его старая форма \`APP_INITIALIZER\`) — это код «сделай до открытия»: Angular выполняет его **до** создания корневого компонента. Если функция вернула \`Promise\` или \`Observable\`, Angular дождётся завершения и только потом нарисует первый экран. Если что-то отклонилось — приложение не стартует вовсе.

Аналогия — магазин перед открытием. Пока двери закрыты, сотрудники включают свет, кладут в кассу размен и вешают актуальные ценники. Покупателей (UI) пускают только после этого. Загрузка конфигурации, фиче-флагов, переводов, проверка сессии — это те самые ценники: без них торговать нельзя, а повесить их на глазах у покупателей — значит показать людям неправильные цены.

**Какую проблему решает.** Многие сервисы хотят читать настройки **синхронно**: адрес API, включена ли фича, кто пользователь. Если грузить их «по ходу», каждый компонент вынужден ждать, проверять \`undefined\`, а интерфейс моргает: сначала фича выключена, через полсекунды включилась; сначала английский, потом русский; гвард первого маршрута не знает, залогинен ли пользователь. Инициализатор решает это одним махом: всё критичное загружено до первого кадра, дальше приложение работает с готовыми значениями.

## Словарик терминов

- **Бутстрап (bootstrap)** — запуск приложения: \`bootstrapApplication(App, config)\` создаёт инжекторы, выполняет инициализаторы и рисует корневой компонент.
- **Корневой компонент (root component)** — компонент, с которого начинается дерево приложения (\`App\`, тег \`<app-root>\` в \`index.html\`).
- **DI-токен и провайдер** — ключ, по которому DI выдаёт значение, и правило «что выдавать по этому ключу».
- **Multi-провайдер (\`multi: true\`)** — провайдер, который не заменяет предыдущий, а добавляется в массив; по токену приходит список всех значений.
- **Контекст внедрения (injection context)** — момент, когда можно вызывать \`inject()\`: конструктор, инициализатор поля, фабрика провайдера и функции, которые Angular явно запускает в этом контексте.
- **\`provideAppInitializer(fn)\`** — современный API (Angular 19+): регистрирует функцию-инициализатор; внутри доступен \`inject()\`.
- **\`APP_INITIALIZER\`** — старый multi-токен для того же самого; с Angular 19 помечен \`@deprecated\`, но работает.
- **\`ApplicationInitStatus\`** — сервис Angular (публичный, его можно инжектить), который запускает все инициализаторы и хранит флаг \`done\` и промис \`donePromise\` «всё готово».
- **\`ENVIRONMENT_INITIALIZER\` / \`provideEnvironmentInitializer\`** — синхронный хук «при создании инжектора окружения»; асинхронность не ждёт.
- **\`APP_BOOTSTRAP_LISTENER\`** — хук «корневой компонент уже создан»; на нём, например, роутер запускает первую навигацию.
- **Runtime-конфиг** — настройки, которые читаются при запуске (файл \`config.json\` на сервере), а не зашиты в сборку; один бандл для dev, stage и prod.
- **\`firstValueFrom\`** — функция RxJS: превращает Observable в Promise, который выполнится первым значением.
- **SSR (Server-Side Rendering)** — рендеринг страницы на сервере; инициализаторы при этом выполняются и там.

## Как это работает под капотом

Сердце механизма — метод \`ApplicationInitStatus.runInitializers()\`. Если убрать проверки, он выглядит почти так:

\`\`\`ts
runInitializers() {
  const asyncInitPromises = [];
  for (const init of this.appInits) {                     // все инициализаторы по порядку
    const result = runInInjectionContext(this.injector, init); // вызов синхронный, inject() работает
    if (isPromise(result)) {
      asyncInitPromises.push(result);
    } else if (isObservable(result)) {
      asyncInitPromises.push(new Promise((resolve, reject) => {
        result.subscribe({ complete: resolve, error: reject }); // ждём именно complete
      }));
    }                                                     // void — ждать нечего
  }
  Promise.all(asyncInitPromises).then(() => this.resolve(), (e) => this.reject(e));
}
\`\`\`

По шагам:

1. \`bootstrapApplication\` создаёт корневой инжектор окружения и сразу синхронно выполняет все \`ENVIRONMENT_INITIALIZER\` — поэтому они срабатывают раньше всего.
2. Затем \`ApplicationInitStatus\` берёт массив инициализаторов (это multi-токен, их может быть сколько угодно) и **по очереди, синхронно** вызывает каждый в порядке регистрации провайдеров.
3. Функция быстро возвращает результат — обычно промис уже запущенного запроса. Поэтому асинхронная работа всех инициализаторов идёт **одновременно**: второй не ждёт, пока закончится первый.
4. \`Promise\` ждётся до выполнения, \`Observable\` — до \`complete\` (значения игнорируются), \`void\` не ждётся вовсе.
5. \`Promise.all\` ждёт все результаты. Когда всё готово, Angular выставляет \`LOCALE_ID\`, создаёт корневой компонент, запускает проверку изменений и вызывает \`APP_BOOTSTRAP_LISTENER\` — роутер в этот момент начинает первую навигацию.
6. Если любой инициализатор бросил исключение или его промис отклонился, ошибка уходит в \`ErrorHandler\`, промис \`bootstrapApplication\` отклоняется, а корневой компонент **не создаётся** — пользователь видит то, что было в \`index.html\`.

### Пример 1. Временная шкала старта

\`\`\`ts
bootstrapApplication(App, {
  providers: [
    provideEnvironmentInitializer(() => log('ENV initializer')),
    provideAppInitializer(() => { log('A start'); return delay(60).then(() => log('A done')); }),
    provideAppInitializer(() => { log('B start'); return delay(20).then(() => log('B done')); }),
    provideAppInitializer(() => { log('C sync'); setTimeout(() => log('C timer fired'), 100); }),
    provideAppInitializer(() => { log('D observable'); return timer(30).pipe(map(() => log('D emitted'))); }),
  ],
}).then(() => log('bootstrap resolved'));
// конструктор App: log('App constructor')
// delay(ms) — промис, который выполнится через ms миллисекунд

//  12ms ENV initializer
//  13ms A start
//  14ms B start
//  14ms C sync
//  14ms D observable
//  35ms B done
//  45ms D emitted
//  75ms A done
//  88ms App constructor
//  91ms bootstrap resolved
// 116ms C timer fired          ← C ничего не вернул, его таймер «уплыл» мимо старта
\`\`\`

Что видно: все инициализаторы стартуют почти в одну миллисекунду и в порядке регистрации, но заканчиваются в своём темпе. Корневой компонент создаётся только после самого медленного (A, 60 мс). Инициализатор C ничего не вернул, поэтому Angular его не ждал — асинхронная работа внутри закончилась уже после старта приложения.

### \`provideAppInitializer\` и старый \`APP_INITIALIZER\`

\`\`\`ts
// Angular 19+: просто функция, inject() работает внутри
provideAppInitializer(() => inject(ConfigService).load());

// Классическая форма, которую вы встретите в легаси-проектах
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

Внутри \`provideAppInitializer\` — буквально \`{ provide: APP_INITIALIZER, multi: true, useValue: fn }\`, обёрнутый в \`makeEnvironmentProviders\`. Отличия только в удобстве: не нужен \`multi: true\` (забыть его — частая ошибка: в dev-режиме старт падает с сообщением, что по токену ожидался массив), не нужна фабрика, возвращающая функцию, и ручной список \`deps\`. Старую форму всё равно надо узнавать на глаз — её полно в существующем коде.

### Пример 2. Runtime-конфиг, который потом читается синхронно

\`\`\`ts
export interface AppConfig { apiUrl: string; features: Record<string, boolean>; }
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private config?: AppConfig;

  load(): Promise<void> {
    return firstValueFrom(this.http.get<AppConfig>('/config.json')).then(
      (c) => { this.config = c; },
      () => { this.config = { apiUrl: '/api', features: {} }; }, // запасной конфиг вместо белого экрана
    );
  }
  get value(): AppConfig {
    if (!this.config) throw new Error('Config is not loaded yet');
    return this.config;
  }
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideAppInitializer(() => inject(ConfigService).load()),
    { provide: APP_CONFIG, useFactory: () => inject(ConfigService).value },
  ],
});

// где угодно дальше — синхронно, без подписок и проверок:
const { apiUrl } = inject(APP_CONFIG);
\`\`\`

Почему так. \`InjectionToken\` с фабрикой — «витрина» для готовых значений: фабрика вызовется при первом \`inject(APP_CONFIG)\`, а компоненты и почти все сервисы создаются уже после инициализаторов. Исключение — если сам инициализатор или сервис, который он создаёт, попросит \`APP_CONFIG\` раньше времени: тогда геттер \`value\` честно бросит ошибку, а не вернёт \`undefined\`. Обработчик ошибки в \`load()\` — сознательное решение: лучше открыть приложение с запасными настройками, чем показать белый экран.

### \`firstValueFrom\`: Observable → Promise

\`\`\`ts
const p = firstValueFrom(of(1, 2, 3));
p.then(console.log); // 1
\`\`\`

Берёт первое значение и отписывается. Для HTTP это то же, что ждать завершения запроса, а для «бесконечных» потоков (store, \`BehaviorSubject\`) — единственный правильный способ вернуть их из инициализатора.

### Пример 3. Отклонение и поток, который никогда не завершается

\`\`\`ts
// 1) Инициализатор отклонился
bootstrapApplication(App, {
  providers: [
    { provide: ErrorHandler, useClass: MyHandler },
    provideAppInitializer(() => Promise.reject(new Error('config.json 404'))),
  ],
}).catch((e) => console.log('bootstrap rejected:', e.message));
// ErrorHandler got: config.json 404
// bootstrap rejected: config.json 404
// DOM: <app-root></app-root>   ← корневой компонент так и не создан

// 2) Observable без complete
provideAppInitializer(() => new BehaviorSubject({ apiUrl: '/api' }));
// через 500 мс: приложение всё ещё не запущено, <app-root></app-root> пуст
// исправление: () => firstValueFrom(subject) или subject.pipe(take(1))
\`\`\`

\`BehaviorSubject\` сразу выдаёт значение, но никогда не завершается, а Angular ждёт именно \`complete\`. Типичная ловушка — вернуть из инициализатора \`store.select(...)\` или поток из сервиса, который живёт всё время.

### \`ENVIRONMENT_INITIALIZER\`, \`PLATFORM_INITIALIZER\` и \`APP_BOOTSTRAP_LISTENER\`

- \`provideEnvironmentInitializer(fn)\` (вместо устаревшего токена \`ENVIRONMENT_INITIALIZER\`) — синхронный код при создании **каждого** инжектора окружения: корневого и, например, инжектора lazy-маршрута с \`providers\`. Результат не ждётся.
- \`providePlatformInitializer(fn)\` (вместо \`PLATFORM_INITIALIZER\`) — ещё раньше, при создании платформы; на практике нужен редко.
- \`APP_BOOTSTRAP_LISTENER\` — уже **после** создания корневого компонента; получает его \`ComponentRef\`.

Важное следствие, проверенное на Angular 21:

\`\`\`ts
// провайдеры lazy-маршрута создают дочерний инжектор окружения
createEnvironmentInjector([
  provideAppInitializer(() => console.log('lazy APP initializer ran')),
  provideEnvironmentInitializer(() => console.log('lazy ENV initializer ran')),
], appRef.injector);
// lazy ENV initializer ran
// (APP-инициализатор не выполнился вообще: старт давно закончился)
\`\`\`

\`ApplicationInitStatus\` живёт в корневом инжекторе и работает один раз при старте. Инициализатор, объявленный в \`providers\` маршрута, молча игнорируется — для «подготовки фичи» используйте \`provideEnvironmentInitializer\`, резолвер маршрута или гвард.

### Альтернатива: загрузить конфиг до бутстрапа

\`\`\`ts
// main.ts
fetch('/config.json')
  .then((r) => r.json())
  .then((config: AppConfig) =>
    bootstrapApplication(App, {
      providers: [{ provide: APP_CONFIG, useValue: config }, ...appConfig.providers],
    }),
  )
  .catch((err) => console.error(err));
\`\`\`

Так конфиг попадает в DI как обычное значение, и нет зависимости от \`HttpClient\` и интерсепторов на этапе старта. Минус — нельзя использовать DI-сервисы для самой загрузки.

### Где это применяется на практике

- **Runtime-конфиг**: один Docker-образ фронтенда на все окружения, адрес API и ключи берутся из \`config.json\` рядом с \`index.html\`.
- **Фиче-флаги**: чтобы интерфейс не мигал, показывая сначала выключенную фичу, а потом включённую.
- **Локаль и переводы**: первый кадр сразу на нужном языке, без вспышки ключей вроде \`HEADER.TITLE\`.
- **Проверка сессии**: обмен refresh-токена на access-токен до старта, чтобы гвард первого маршрута уже знал, кто пользователь.
- **Подготовка инфраструктуры**: инициализация SDK аналитики или мониторинга, регистрация иконок, которые нужны в первом экране.

## Важные нюансы и подводные камни

- **Долгий инициализатор = белый экран.** Каждая миллисекунда ожидания напрямую сдвигает первый рендер. Правило: сюда только то, без чего нельзя показать первый экран. Простая заглушка — разметка внутри \`<app-root>\` в \`index.html\`: она видна, пока Angular не создал корневой компонент.
- **Отклонение валит приложение целиком.** \`ErrorHandler\` получит ошибку, промис \`bootstrapApplication\` отклонится, интерфейс не появится. Нужен запасной конфиг или понятная страница ошибки.
- **\`Observable\` должен завершиться.** Angular ждёт \`complete\`, а не первое значение; \`BehaviorSubject\` и \`store.select\` подвесят старт навсегда.
- **Вернули \`void\` — Angular ничего не ждёт.** Забытый \`return\` перед \`config.load()\` — самая частая причина «конфиг иногда \`undefined\`».
- **Порядок запуска детерминирован, порядок завершения — нет.** Функции вызываются синхронно в порядке регистрации, но их асинхронная часть идёт параллельно, и второй не ждёт первого. Если B зависит от A, стройте цепочку внутри одного инициализатора: \`() => a.load().then(() => b.load())\`.
- **Не путать с \`ENVIRONMENT_INITIALIZER\`.** Тот синхронный, срабатывает раньше и для каждого инжектора окружения, асинхронность не ждёт. Любимый уточняющий вопрос.
- **В \`providers\` маршрута инициализатор не работает.** Как показано выше, он молча игнорируется.
- **\`provideAppInitializer\` возвращает \`EnvironmentProviders\`.** Его можно положить в \`bootstrapApplication\`, \`ApplicationConfig\` или \`importProvidersFrom\`, но не в \`providers\` компонента — там будет ошибка компиляции типов.
- **Циклическая зависимость с интерсепторами.** Если интерсептор на каждом запросе читает конфиг, а сам конфиг грузится через \`HttpClient\`, запрос за \`config.json\` проходит через этот интерсептор, когда конфига ещё нет. Решения: пропускать этот URL в интерсепторе, грузить конфиг через \`new HttpClient(inject(HttpBackend))\` (в обход интерсепторов) или через \`fetch\` до бутстрапа.
- **SSR.** Инициализаторы выполняются и на сервере, причём на каждый запрос. Обращение к \`window\` или \`localStorage\` там упадёт, а запрос за конфигом будет повторяться на каждый серверный рендер — его стоит кешировать.
- **\`APP_INITIALIZER\` устарел, но не удалён.** С Angular 19 он помечен \`@deprecated\` в пользу \`provideAppInitializer\`; на собеседовании полезно знать обе формы.

**Плюсы:** гарантирует, что критичные данные готовы до первого кадра; сервисы читают их синхронно; несколько инициализаторов работают параллельно; простая функция с \`inject()\` вместо фабрик.
**Минусы:** любая задержка — это задержка первого рендера; одна ошибка роняет всё приложение; легко подвесить старт незавершающимся Observable; не работает в lazy-провайдерах.

## Как это спрашивают на собеседовании

**Главный вывод:** инициализатор выполняется до создания корневого компонента, и если вернул \`Promise\` или \`Observable\`, Angular ждёт выполнения или \`complete\`. Все инициализаторы вызываются по очереди, но их асинхронная работа идёт параллельно; отклонение любого из них отменяет старт. Сюда кладут только то, без чего нельзя показать первый экран.

Типичные формулировки: «Зачем нужен \`APP_INITIALIZER\`?», «Как загрузить конфигурацию до старта приложения?», «Чем \`provideAppInitializer\` отличается от \`APP_INITIALIZER\`?».

Что могут спросить следом:

- *Инициализаторы выполняются последовательно или параллельно?* — Вызываются по очереди в порядке регистрации, но ждутся все вместе через \`Promise.all\`; зависимые шаги цепляют внутри одного.
- *Что будет, если инициализатор упал?* — Ошибка уйдёт в \`ErrorHandler\`, \`bootstrapApplication\` отклонится, корневой компонент не создастся.
- *Чем отличается \`ENVIRONMENT_INITIALIZER\`?* — Он синхронный, срабатывает раньше и при создании каждого инжектора окружения, асинхронность не ждёт.
- *Можно ли вернуть Observable?* — Да, но Angular ждёт \`complete\`; бесконечный поток подвесит старт, поэтому берут \`firstValueFrom\` или \`take(1)\`.
- *Как сделать конфиг доступным синхронно?* — Сохранить в сервисе и выдать через \`InjectionToken\` с фабрикой или загрузить \`fetch\` до бутстрапа и передать через \`useValue\`.

### Ответ на 1 минуту

> \`provideAppInitializer\` — это функция, которую Angular выполняет на старте до создания корневого компонента; раньше то же самое делали multi-провайдером \`APP_INITIALIZER\`, сейчас он deprecated. Внутри работает \`inject()\`, и если функция вернула \`Promise\` или \`Observable\`, бутстрап ждёт: промис — до выполнения, Observable — до \`complete\`. Все инициализаторы вызываются по очереди в порядке регистрации, но их асинхронная часть идёт параллельно, и Angular ждёт их через \`Promise.all\`; если любой отклонился, ошибка уходит в \`ErrorHandler\`, и приложение не стартует. Я использую это для runtime-конфига, фиче-флагов и проверки сессии, а значения потом отдаю синхронно через \`InjectionToken\`. Помню нюансы: долгий инициализатор — это белый экран, бесконечный поток подвешивает старт, а в providers lazy-маршрута инициализатор молча не выполняется.`,
      en: `## In short

It is the **"do this before opening"** hook: code Angular runs **before** it renders the root component. If your function returns a \`Promise\` or \`Observable\`, Angular **waits** for it — and only then shows the UI.

Analogy: a shop before opening. While the doors are locked you switch on the lights, put change in the till and hang up today's price list. Customers (the UI) are let in only after that. Loading runtime config, feature flags, locale, checking the session — that is exactly the "price list".

## How it works, step by step

1. You register an initializer in providers: modern — \`provideAppInitializer(fn)\`, legacy — the \`APP_INITIALIZER\` multi-provider.
2. On bootstrap Angular collects **all** registered initializers (it is a multi-token, there can be many).
3. It runs them **in parallel**, not one after another.
4. It waits until **all** returned \`Promise\`s/\`Observable\`s settle.
5. Only then does it create and render the root component.
6. If any one of them rejects, **bootstrap aborts** — the app never starts.

## Example

\`\`\`ts
// modern: Angular 19+
provideAppInitializer(() => {
  const config = inject(ConfigService);
  return config.load();
});

// how it used to look — same meaning, more boilerplate
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
}
\`\`\`

Why it looks like this: \`provideAppInitializer\` is just a function with \`inject()\` available inside, so no \`multi: true\` and no hand-written \`deps\` list. You still need to recognise the old form — legacy projects are full of it.

## Why you actually need it

- **Runtime config**: one built bundle, but different API hosts for dev/stage/prod — fetch \`config.json\` before startup so services read ready values synchronously.
- **Feature flags**: so the UI does not flicker, showing a feature off and then on.
- **Locale / translations**: so the very first frame is already in the right language.
- **Session check**: so the guard on the first route already knows whether the user is logged in.

Rule: only put in here what the first screen **cannot** be shown without. Everything else loads after startup.

## What to say in the interview

> \`APP_INITIALIZER\` is a multi-token whose factories Angular executes before rendering the root component; if a factory returns a \`Promise\` or \`Observable\`, bootstrap waits for it to settle. All initializers run in parallel and bootstrap awaits all of them, and a rejection in any one aborts app startup. Since Angular 19 there is a functional API, \`provideAppInitializer(fn)\` — no \`multi\`, no \`deps\`, with \`inject()\` available inside. Typical jobs: loading runtime config, feature flags, locale, checking the session; it is often combined with an \`InjectionToken\` factory so the rest of the app reads those values synchronously. I do not confuse it with \`ENVIRONMENT_INITIALIZER\`, which runs when each \`EnvironmentInjector\` is created — earlier in time and without awaiting async work. And I keep in mind that a slow initializer directly delays the first render, and that in SSR it also runs on the server, where there is no \`window\`.

## Gotchas

- **A slow initializer means a white screen.** Anything not required before the UI must not go in there.
- **A rejection kills the whole app.** Wrap in \`catchError\`/\`try\` and provide a fallback config.
- **Do not confuse it with \`ENVIRONMENT_INITIALIZER\`** — that fires when an EnvironmentInjector is created, earlier and per injector, and does not await async work. A favourite follow-up question.
- **Returning a non-Promise**: if the factory returns \`void\`, there is nothing to await — the async work inside floats past bootstrap.
- **SSR**: the initializer also runs on the server; touching \`window\`/\`localStorage\` there throws.
- **Order between initializers is not guaranteed** — they are parallel; if you need ordering, chain inside a single one.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideAppInitializer(() => inject(ConfigService).load()),
  ],
});`,
  },
  {
    id: 'ng-040',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['view-encapsulation', 'shadow-dom', 'styles'],
    question: {
      ru: 'Чем отличаются ViewEncapsulation Emulated, ShadowDom и None, и почему ::ng-deep устарел?',
      en: 'How do ViewEncapsulation Emulated, ShadowDom and None differ, and why is ::ng-deep deprecated?',
    },
    answer: {
      ru: `## В чём суть

Инкапсуляция стилей отвечает на вопрос: **насколько CSS компонента отделён от остального приложения**. У \`@Component\` есть опция \`encapsulation\` с тремя рабочими режимами: \`Emulated\` (по умолчанию — Angular имитирует изоляцию через атрибуты), \`ShadowDom\` (настоящий Shadow DOM браузера) и \`None\` (никакой изоляции, стили глобальные). \`::ng-deep\` — способ «пробить» эмулированную изоляцию, и Angular давно не рекомендует его для нового кода.

Аналогия — офис. **Emulated**: у каждого сотрудника бейдж отдела, а правила написаны как «только для владельцев бейджа №7» — ваши правила на чужих не действуют, но общие правила офиса действуют на всех, включая вас. **ShadowDom**: переговорка со звукоизоляцией — объявления из коридора внутрь не слышны, ваши разговоры наружу не выходят. **None**: вы кричите на весь опенспейс, и слышат все.

**Какую проблему решает.** CSS по природе глобален: правило \`.title { color: red }\` из одного компонента покрасит каждый \`.title\` на странице. В большом приложении с десятками команд это значит постоянные конфликты имён классов, «сломалось там, где не трогали» и страх удалять стили. Инкапсуляция позволяет писать короткие селекторы (\`.title\`, \`.body\`) и быть уверенным, что они не вылезут за пределы компонента.

## Словарик терминов

- **Селектор и специфичность (specificity)** — селектор выбирает элементы, специфичность решает, какое правило победит при конфликте: класс или атрибут весят больше, чем имя тега.
- **Наследование (inheritance)** — часть CSS-свойств (\`color\`, \`font-family\`, CSS-переменные) передаётся от родителя к детям сама.
- **Shadow DOM** — механизм браузера: у элемента появляется скрытое поддерево (shadow root) со своими стилями, отделёнными от документа; создаётся вызовом \`attachShadow\`.
- **\`_nghost-…\` / \`_ngcontent-…\`** — уникальные атрибуты, которые Angular в режиме \`Emulated\` ставит на элемент-хост компонента и на элементы его шаблона, например \`_ngcontent-ng-c281202177\`.
- **Хост (host element)** — сам тег компонента в DOM, например \`<app-card>\`.
- **\`:host\` / \`:host-context()\`** — селекторы «сам элемент компонента» и «элемент компонента, если у него или у предка есть такой класс».
- **\`::ng-deep\`** — Angular-комбинатор, отключающий добавление атрибута для правой части селектора; наследник удалённых из стандарта \`/deep/\` и \`>>>\`.
- **CSS-переменная (custom property)** — свойство вида \`--card-bg\`, которое читается через \`var(--card-bg)\` и наследуется сквозь любые границы, включая Shadow DOM.
- **\`::part()\` / \`::slotted()\`** — стандартные способы стилизовать внутренности Shadow DOM снаружи и вставленный в \`<slot>\` контент изнутри.
- **Глобальные стили** — файлы из секции \`styles\` в \`angular.json\` (обычно \`styles.scss\`), которые подключаются к документу целиком.
- **SSR** — серверный рендеринг страницы.

## Как это работает под капотом

Всё начинается при компиляции компонента: компилятор Angular переписывает его CSS в зависимости от режима, а при запуске рендерер решает, куда эти стили положить.

1. **Emulated.** Компилятор добавляет к каждому селектору атрибут-метку: \`:host\` превращается в \`[_nghost-%COMP%]\`, \`.title\` — в \`.title[_ngcontent-%COMP%]\`. Поэтому правило может сработать только на элементах, где этот атрибут есть.
2. При запуске \`%COMP%\` заменяется на id компонента (вида \`ng-c281202177\`), рендерер ставит \`_nghost-…\` на хост и \`_ngcontent-…\` на каждый элемент шаблона, а CSS кладёт одним тегом \`<style>\` в \`<head>\` — один раз на тип компонента, сколько бы экземпляров ни было.
3. Когда уничтожен последний экземпляр компонента, его \`<style>\` удаляется из \`<head>\` (в Angular это поведение по умолчанию).
4. **None.** Стили не переписываются вовсе и так же попадают в \`<head>\` — то есть становятся глобальными на всё время, пока жив хотя бы один экземпляр.
5. **ShadowDom.** Рендерер вызывает \`attachShadow({ mode: 'open' })\` на хосте, рисует шаблон внутри shadow root и кладёт туда же \`<style>\` компонента без переписывания — изоляцию обеспечивает сам браузер. Дополнительно Angular копирует в каждый shadow root стили остальных Angular-компонентов, которыми управляет (Emulated и None).
6. При SSR компоненты с \`ShadowDom\` рендерятся как \`Emulated\`: на сервере shadow root не создаётся.

### Пример 1. Что Emulated делает с CSS

\`\`\`ts
@Component({
  selector: 'emu-card',
  template: \`<h2 class="title">Emulated</h2><ng-content />\`,
  styles: [\`
    :host { display: block; }
    .title { color: red; }
    :host ::ng-deep .inner { color: blue; }
  \`],
})
export class EmuCard {}

// EmuCard.ɵcmp.styles после компиляции:
// [_nghost-%COMP%] { display: block; }
// .title[_ngcontent-%COMP%] { color: red; }
// [_nghost-%COMP%]     .inner { color: blue; }

// DOM после запуска:
// <emu-card _nghost-ng-c281202177="">
//   <h2 _ngcontent-ng-c281202177="" class="title">Emulated</h2>
//   <p class="inner">projected</p>      ← пришёл через ng-content, атрибута EmuCard нет
// </emu-card>
\`\`\`

Правило \`.title[...]\` может покрасить только \`<h2>\` этого компонента: у \`.title\` из другого компонента будет другой атрибут. Обратите внимание на спроецированный абзац \`p.inner\`: он принадлежит родительскому шаблону, поэтому обычные селекторы \`EmuCard\` до него не дотягиваются — только через \`::ng-deep\`.

### \`ViewEncapsulation.Emulated\`: глобальные стили всё равно внутри

Изоляция односторонняя. Правило \`button { border-radius: 0 }\` из \`styles.scss\` не содержит атрибутов, поэтому совпадёт с каждой кнопкой на странице, включая кнопки внутри компонентов. Защищает только специфичность: \`.btn[_ngcontent-…]\` (класс плюс атрибут) перебивает глобальное \`.btn\` (только класс). Отсюда частая ошибка: считать, что Emulated — это полная изоляция. Это изоляция «изнутри наружу», а не «снаружи внутрь». Плюс — работает в любом браузере и никак не мешает темам, глобальным ресетам и сторонним библиотекам.

### \`ViewEncapsulation.None\`: стили становятся глобальными

\`\`\`ts
@Component({
  selector: 'none-card',
  encapsulation: ViewEncapsulation.None,
  template: \`<h2 class="title">None</h2>\`,
  styles: [\`:host { display: block; } .title { color: red; } :host ::ng-deep .inner { color: blue; }\`],
})
export class NoneCard {}

// NoneCard.ɵcmp.styles — без изменений:
// :host { display: block; } .title { color: red; } :host ::ng-deep .inner { color: blue; }
// <style> с этим текстом попадает в <head>
// после уничтожения последнего <none-card> этот <style> из <head> удаляется
\`\`\`

Здесь два сюрприза. Первый: \`.title { color: red }\` теперь красит **все** \`.title\` в приложении, пока на экране есть хоть один \`<none-card>\`. Второй: \`:host\` и \`::ng-deep\` никто не переписал, а в обычном документе \`:host\` не совпадает ни с чем, \`::ng-deep\` браузер считает неизвестным псевдоэлементом и отбрасывает правило целиком. Режим \`None\` берут сознательно — для слоя дизайн-системы, глобальной темы или стилизации содержимого, которое вставляется через \`innerHTML\`.

### \`ViewEncapsulation.ShadowDom\`: нативная изоляция

\`\`\`ts
@Component({
  selector: 'shadow-card',
  encapsulation: ViewEncapsulation.ShadowDom,
  template: \`<h2 class="title">Shadow</h2><ng-content />\`,
  styles: [\`:host { display: block; } .title { color: blue; }\`],
})
export class ShadowCard {}
// на той же странице есть EmuCard (.title { color: red }, Emulated)
// и NoneCard (.title { color: green }, None)

// <shadow-card><p class="inner">projected</p></shadow-card>
// light DOM после рендера: "" — всё уехало в shadowRoot:
// <style>.title[_ngcontent-ng-c1414010770] { color: red; }</style>  ← копия стилей EmuCard
// <style>.title { color: green; }</style>                            ← копия стилей NoneCard
// <style>:host { display: block; } .title { color: blue; }</style>  ← свои стили, без переписывания
// <h2 class="title">Shadow</h2>
// <p class="inner">projected</p>     ← ng-content: узел физически перенесён внутрь
\`\`\`

Глобальные стили документа (\`styles.scss\`) внутрь не попадают, а стили компонента не выходят наружу — это делает браузер. Но изоляция не абсолютная. Наследуемые свойства (\`color\`, \`font-family\`) и CSS-переменные проходят сквозь границу от хоста. Стили других Angular-компонентов Angular сам копирует в shadow root — то есть правила \`None\`-компонентов действуют и внутри ShadowDom: здесь \`.title\` синий только потому, что собственный \`<style>\` идёт позже копии с зелёным при равной специфичности. И ещё: \`<ng-content>\` здесь не превращается в нативный \`<slot>\` — Angular переносит узлы внутрь shadow root, поэтому они получают стили компонента.

Когда это нужно: виджет, который встраивается в чужую страницу, Angular Elements (веб-компоненты), микрофронтенды, где нельзя допустить протекания стилей хоста.

### \`ViewEncapsulation.ExperimentalIsolatedShadowDom\` (Angular 21, experimental)

\`\`\`ts
@Component({
  selector: 'iso-card',
  encapsulation: ViewEncapsulation.ExperimentalIsolatedShadowDom,
  template: \`<b>iso</b>\`,
  styles: [\`b { color: red }\`],
})
export class IsoCard {}
// shadowRoot.innerHTML: <style>b { color: red }</style><b>iso</b>
// стилей других компонентов внутри нет
\`\`\`

То же самое, что \`ShadowDom\`, но без копирования чужих стилей — полная изоляция. Помечен \`@experimental 21.0\`, поэтому в продакшен-код осторожно.

### \`:host\` и \`:host-context()\`

\`\`\`ts
styles: [\`
  :host(.active) { border: 1px solid; }
  :host-context(.theme-dark) .title { color: white; }
\`]
// Emulated после компиляции:
// .active[_nghost-%COMP%] { border: 1px solid; }
// .theme-dark[_nghost-%COMP%]   .title[_ngcontent-%COMP%],
// .theme-dark   [_nghost-%COMP%]   .title[_ngcontent-%COMP%] { color: white; }
\`\`\`

\`:host\` — стили самого тега компонента (по умолчанию он \`display: inline\`, поэтому \`:host { display: block }\` пишут почти всегда). \`:host(.active)\` — когда на хосте есть класс. \`:host-context(.theme-dark)\` — когда класс есть на хосте или любом предке; в Emulated Angular разворачивает его в два обычных селектора, а в нативном Shadow DOM поддержка \`:host-context()\` зависит от браузера. В режиме \`None\` оба селектора не работают.

### \`::ng-deep\` (и устаревшие \`/deep/\`, \`>>>\`)

\`\`\`ts
styles: [\`
  :host ::ng-deep .mat-mdc-button { color: green; }
  ::ng-deep .mat-mdc-button { color: green; }
\`]
// Emulated после компиляции:
// [_nghost-%COMP%]     .mat-mdc-button { color: green; }   ← только внутри этого компонента
//   .mat-mdc-button { color: green; }                       ← на ВСЁ приложение
\`\`\`

Всё, что правее \`::ng-deep\`, остаётся без атрибута, поэтому стиль достаёт до элементов дочерних компонентов. Без \`:host\` слева правило становится полностью глобальным — классическая утечка. Почему он устарел: \`/deep/\` и \`>>>\` были «пробивающими» комбинаторами из ранней спецификации Shadow DOM, их убрали из стандарта и из браузеров; \`::ng-deep\` — Angular-имя той же идеи. Команда Angular давно пишет, что не рекомендует его для нового кода и держит только ради обратной совместимости, но даты удаления нет — полноценной замены для стилизации чужих компонентов в Emulated так и не появилось. В режиме \`ShadowDom\` он не работает вовсе: Angular не переписывает стили, и браузер отбрасывает правило с неизвестным псевдоэлементом.

### CSS-переменные — основная замена \`::ng-deep\`

Это и есть идея из \`codeSnippet\`: компонент читает цвет из переменной, а снаружи её переопределяют.

\`\`\`ts
@Component({
  selector: 'app-card',
  styles: [\`.body { background: var(--card-bg, white); }\`],
  template: \`<div class="body"><ng-content /></div>\`,
})
export class CardComponent {}
\`\`\`

\`\`\`css
/* styles.scss — тема задаётся снаружи, без ::ng-deep */
.theme-dark { --card-bg: #1e1e1e; }
app-card.highlighted { --card-bg: #fff8d6; }
\`\`\`

Переменные наследуются от предков к потомкам сквозь атрибуты Emulated и сквозь границу Shadow DOM, поэтому \`.theme-dark\` на \`<body>\` перекрасит все карточки. Тонкость: если компонент сам объявляет значение по умолчанию на \`:host\` (как в \`codeSnippet\`: \`:host { --card-bg: white; }\`), это объявление стоит прямо на хосте и перебивает значение, унаследованное от предка. Переопределить его можно только правилом на том же элементе со специфичностью выше, чем у \`[_nghost-…]\`, например \`app-card.highlighted\`. Поэтому для тем удобнее запасное значение в \`var(--card-bg, white)\`.

### \`::part()\` и \`::slotted()\` — для ShadowDom

\`\`\`html
<!-- шаблон ShadowDom-компонента app-dialog -->
<button part="action">OK</button>
<slot name="footer"></slot>
\`\`\`

\`\`\`css
/* снаружи, в глобальных стилях */
app-dialog::part(action) { background: tomato; }

/* внутри компонента: элементы, вставленные в нативный <slot> */
::slotted(p) { margin: 0; }
\`\`\`

\`part="..."\` — явное «окно» во внутренности: снаружи стилизуется только то, что автор компонента разрешил. \`::slotted()\` действует только на контент нативного \`<slot>\`; узлы, которые Angular перенёс через \`<ng-content>\`, лежат прямо в shadow root и стилизуются обычными селекторами компонента.

### Как выбрать

- **Emulated** — по умолчанию для 95% компонентов: изоляция наружу, совместимость с темами и глобальными стилями.
- **None** — только для компонента, который и есть источник глобальных стилей: тема, ресет, слой дизайн-системы, стилизация HTML из \`innerHTML\`.
- **ShadowDom** — виджеты для чужих страниц, Angular Elements, микрофронтенды; цена — сложная стилизация снаружи.
- **ExperimentalIsolatedShadowDom** — когда нужна полная изоляция даже от стилей других Angular-компонентов и вы готовы к experimental API.
- **Стилизация дочернего или стороннего компонента** — сначала CSS-переменные и API самой библиотеки, затем \`::part()\`, и только в крайнем случае \`:host ::ng-deep\`.

### Где это применяется на практике

- **Дизайн-система компании**: компоненты в Emulated, токены цветов и отступов — CSS-переменные на \`:root\`, тёмная тема переключается классом на \`<body>\`.
- **Кастомизация Angular Material, PrimeNG, Kendo UI**: правильный путь — переменные и миксины библиотеки; в легаси-коде вы почти наверняка встретите \`:host ::ng-deep .k-grid-header\`.
- **Встраиваемый виджет** (чат поддержки, калькулятор на сайте партнёра): \`ShadowDom\`, чтобы CSS чужого сайта не сломал вёрстку виджета.
- **Микрофронтенды** на веб-компонентах: изоляция стилей между приложениями разных команд.
- **Компонент для HTML из CMS или Markdown** (\`[innerHTML]\`): вставленные теги не получают атрибутов \`_ngcontent\`, поэтому стили для них пишут в \`None\` или в глобальном файле.

## Важные нюансы и подводные камни

- **Emulated ≠ полная изоляция.** Глобальный \`button { ... }\` достанет кнопки внутри компонента; защищает только специфичность.
- **\`:host\` и \`::ng-deep\` не работают в \`None\`.** Стили не переписываются, а в обычном документе \`:host\` ничего не выбирает. Распространённое утверждение «\`:host\` работает во всех режимах» неверно.
- **ShadowDom в Angular изолирован не полностью.** Стили других Angular-компонентов копируются в shadow root, наследуемые свойства и CSS-переменные проходят внутрь. Полную изоляцию даёт только \`ExperimentalIsolatedShadowDom\`.
- **Переезд на ShadowDom ломает темы и библиотеки.** Глобальный CSS перестаёт действовать, \`document.querySelector\` не видит элементы внутри shadow root, оверлеи (выпадающие списки, диалоги), которые библиотека рисует в \`<body>\`, теряют стили компонента.
- **\`::ng-deep\` без \`:host\` — утечка на всё приложение.** И она живёт, только пока компонент на экране: стиль появляется и исчезает вместе с ним, что даёт «плавающие» баги.
- **\`None\` у нескольких компонентов — гонка.** Чьи стили вставлены позже, тот и победил при равной специфичности; порядок зависит от того, какой компонент отрисовался первым.
- **Спроецированный контент принадлежит родителю.** В Emulated стили компонента не действуют на то, что пришло через \`<ng-content>\`; стилизуйте такой контент у родителя или через \`:host ::ng-deep\`.
- **HTML из \`innerHTML\` не получает атрибутов.** Стили компонента до него не доходят — нужен \`None\`, глобальный файл или \`::ng-deep\`.
- **Компонент без стилей не получает атрибутов.** Если у компонента нет \`styles\`, Angular не ставит \`_ngcontent\` на его элементы — это нормально.
- **Порядок глобальных и компонентных стилей.** Они конкурируют по обычным правилам специфичности и порядка: никакой особой магии у Angular здесь нет.
- **SSR и ShadowDom.** На сервере компонент рендерится как \`Emulated\`, на клиенте — уже с shadow root.

**Плюсы:** Emulated даёт короткие безопасные селекторы и работает с темами; ShadowDom даёт настоящую изоляцию для виджетов; CSS-переменные решают темизацию без хаков.
**Минусы:** Emulated не защищает от глобальных стилей; ShadowDom усложняет темы и интеграцию с библиотеками; None и \`::ng-deep\` легко превращаются в глобальные утечки.

## Как это спрашивают на собеседовании

**Главный вывод:** \`Emulated\` переписывает селекторы с уникальными атрибутами — стили не выходят наружу, но глобальные проходят внутрь; \`ShadowDom\` использует нативный shadow root; \`None\` делает стили глобальными. \`::ng-deep\` снимает атрибут с части селектора, давно не рекомендуется и не работает в Shadow DOM; замена — CSS-переменные и \`::part()\`.

Типичные формулировки: «Как Angular изолирует стили компонента?», «Что такое \`_ngcontent\` в DOM?», «Почему \`::ng-deep\` устарел и чем его заменить?».

Что могут спросить следом:

- *Как стилизовать сам тег компонента?* — Через \`:host\`; он по умолчанию inline, поэтому часто пишут \`:host { display: block }\`.
- *Как сделать тёмную тему для компонентов?* — Класс на \`<body>\` плюс CSS-переменные, либо \`:host-context(.theme-dark)\`.
- *Почему стиль не применяется к контенту из \`ng-content\`?* — Он принадлежит шаблону родителя и несёт его атрибуты, а не атрибуты компонента.
- *Чем опасен \`::ng-deep\` без \`:host\`?* — Правило становится глобальным на всё приложение, пока компонент на экране.
- *Что будет с \`::ng-deep\` в режиме ShadowDom?* — Ничего: Angular не переписывает стили, браузер отбросит правило.

### Ответ на 1 минуту

> \`ViewEncapsulation\` определяет, как скоупятся стили компонента. По умолчанию \`Emulated\`: компилятор переписывает селекторы, добавляя атрибуты вида \`_ngcontent-ng-c123\`, а рендерер ставит их на элементы шаблона — поэтому стили компонента наружу не выходят, но глобальные стили внутрь проходят, защищает только специфичность. \`ShadowDom\` создаёт нативный shadow root, и изоляцию даёт браузер, хотя Angular копирует туда стили других компонентов, а наследуемые свойства и CSS-переменные проходят сквозь границу. \`None\` просто кладёт стили в \`head\` глобально, и \`:host\` там не работает. \`::ng-deep\` снимает атрибут с правой части селектора — это наследник удалённых \`/deep/\` и \`>>>\`, его не рекомендуют для нового кода, а в Shadow DOM он не работает вовсе. Для тем я использую CSS-переменные, для веб-компонентов — \`::part()\`, а \`::ng-deep\` только как \`:host ::ng-deep\`.`,
      en: `## In short

Encapsulation answers one question: **how isolated a component's styles are from everything else**. There are three levels.

Analogy: an office. **Emulated** — everyone wears a department badge and the rules read "only for badge #7 holders": other people's rules still reach inside, yours never leave. **ShadowDom** — a real soundproofed meeting room: no sound out, no sound in. **None** — you just shout across the open-plan floor and everyone hears you.

## The three modes

1. **Emulated (default).** Angular **emulates** Shadow DOM without using it. At compile time a unique attribute (\`_ngcontent-xxx\`) is added to each component element and every selector in \`styles\` is rewritten with that attribute. Result: component styles **do not leak out**, but **global styles do seep in**. Works in any browser, no real Shadow DOM involved.
2. **ShadowDom.** Uses the browser's **native** Shadow DOM — \`attachShadow\`. Full isolation both ways: global styles do **not** get in, component styles do not get out. Content projection goes through the native \`<slot>\`. Downsides: styling from outside (theming) breaks, \`document\` selectors and some third-party libraries stop working.
3. **None.** Component styles become **global** — they are simply added to \`<head>\` with no scoping at all. Any component in the app can be affected. Use deliberately: global themes, resets, a design-system layer.

## Example

\`\`\`ts
@Component({ encapsulation: ViewEncapsulation.Emulated })
\`\`\`

Why it looks like this: it is the default and in 95% of cases you should not change it. Reach for \`ShadowDom\` when the component is embedded into someone else's page (a widget), and for \`None\` when the component itself is the source of global styles.

## Why ::ng-deep is deprecated and what replaces it

\`::ng-deep\` (and the ancient \`/deep/\`, \`>>>\`) disables scoping for part of a selector and lets a style **pierce the boundary** into child components. It is marked **deprecated** because it belongs to the removed Shadow DOM piercing spec — in native Shadow DOM it simply does not work.

What to use instead:

- **CSS Custom Properties (variables)** — they **inherit** across any boundary, Shadow DOM included. The ideal theming tool: the component declares \`--card-bg\` and you override it from outside.
- **\`::part()\` / \`::slotted()\`** — the sanctioned ways to expose internals in Shadow DOM.
- **Global styles** or \`encapsulation: None\` for one specific design-system layer.

## What to say in the interview

> \`ViewEncapsulation\` decides how a component's styles are scoped. The default is \`Emulated\`: Angular does not use real Shadow DOM but at compile time stamps elements with an attribute like \`_ngcontent-xxx\` and rewrites the selectors — so component styles never leak out, while global styles do seep in. \`ShadowDom\` turns on native \`attachShadow\` and gives full two-way isolation with projection through \`<slot>\`, at the price of the component being nearly impossible to theme from outside and \`document\` selectors plus some third-party libraries breaking. \`None\` dumps the styles into \`<head>\` globally — only deliberately, for resets and themes. \`::ng-deep\` along with the old \`/deep/\` and \`>>>\` is deprecated because it is a leftover of a piercing capability removed from the spec, and in native Shadow DOM it does not work at all; the modern replacement is CSS custom properties, which inherit across any boundary, plus \`::part()\` and \`::slotted()\`.

## Gotchas

- **Emulated is not isolation.** A common mistake is assuming a global \`button { ... }\` cannot reach inside a component. It can.
- **\`:host\` and \`:host-context\`** work in every mode — they are how you style the component's own element, and you will be asked about them.
- **Switching to ShadowDom breaks theming**: everything previously set by global CSS from outside stops applying.
- **\`::ng-deep\` without a leading \`:host\`** makes the rule effectively global — a leak across the whole app. If you must use it, write \`:host ::ng-deep .foo\`.
- **\`None\` on several components** turns into a race over whose stylesheet loaded last. Debugging is miserable.
- They will ask about **ordering**: global styles from \`styles.css\` and component styles compete by ordinary specificity rules — there is no magic here.`,
    },
    codeSnippet: `@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated, // default: attribute-scoped CSS
  styles: [':host { --card-bg: white; } .body { background: var(--card-bg); }'],
})
export class CardComponent {}`,
  },
  {
    id: 'ng-041',
    category: 'network-browser',
    level: 'Hard',
    tags: ['renderer2', 'dom-sanitizer', 'security', 'xss'],
    question: {
      ru: 'Зачем использовать Renderer2 и как DomSanitizer защищает от XSS?',
      en: 'Why use Renderer2, and how does DomSanitizer protect against XSS?',
    },
    answer: {
      ru: `## В чём суть

Здесь два разных механизма, и оба про то, чтобы не трогать DOM напрямую. \`Renderer2\` — прослойка между вашим кодом и платформой: вы говорите «добавь класс», а она решает, как это сделать в браузере, при серверном рендеринге или вместе с анимациями. \`DomSanitizer\` — встроенная защита Angular от XSS: каждое значение, которое вы привязываете к шаблону, проходит проверку по своему контексту, и опасные части обезвреживаются.

Аналогия: \`Renderer2\` — **переводчик**. Вы говорите на одном языке («поставь стиль»), а он переводит на язык конкретной площадки: браузерный DOM, его эмуляция на сервере, движок анимаций. \`DomSanitizer\` — **таможенник на границе шаблона**: всё, что вы ввозите в разметку, он досматривает и изымает опасное. \`bypassSecurityTrust*\` — дипломатический паспорт: проносите без досмотра, но и отвечаете сами.

**Какую проблему решает.** XSS (cross-site scripting) — это когда строка злоумышленника, например комментарий или имя пользователя, превращается в исполняемый код в браузере другого пользователя. Такой код читает токены, отправляет запросы от имени жертвы, подменяет интерфейс. Angular по умолчанию закрывает этот класс атак для всего, что идёт через шаблон. А прямой доступ к DOM в обход фреймворка ломает SSR и открывает дыру, которую санитайзер уже не видит.

## Словарик терминов

- **DOM (Document Object Model)** — дерево объектов, которым браузер представляет страницу. Меняете DOM — меняется то, что видит пользователь.
- **XSS (Cross-Site Scripting)** — внедрение чужого скрипта в страницу через данные: из базы (stored), из URL (reflected) или через код самой страницы (DOM-based).
- **Экранирование (escaping)** — превращение спецсимволов в безопасный текст: \`<\` выводится как символ, а не как начало тега.
- **Санитизация (sanitization)** — разбор HTML или URL и удаление опасных частей с сохранением безопасных: тег \`<strong>\` остаётся, \`<script>\` выбрасывается.
- **Allowlist (белый список)** — список разрешённых тегов, атрибутов и схем. Всё, что не в списке, удаляется.
- **\`SecurityContext\`** — тип места, куда попадает значение: \`HTML\`, \`STYLE\`, \`SCRIPT\`, \`URL\`, \`RESOURCE_URL\`. От контекста зависят правила проверки.
- **RESOURCE_URL** — адрес, по которому браузер загрузит и **выполнит** код: \`<iframe src>\`, \`<script src>\`, \`<embed src>\`, \`<link href>\`.
- **\`DomSanitizer\`** — сервис Angular, который санитизирует значения (\`sanitize()\`) и умеет помечать их доверенными (\`bypassSecurityTrustHtml()\` и родственные методы).
- **\`SafeValue\` (\`SafeHtml\`, \`SafeUrl\`, \`SafeResourceUrl\`…)** — обёртка, которую возвращает \`bypassSecurityTrust*\`. Видя её, Angular пропускает досмотр.
- **\`Renderer2\`** — абстракция над операциями с DOM: \`setStyle\`, \`addClass\`, \`setAttribute\`, \`setProperty\`, \`listen\`.
- **\`ElementRef\` / \`nativeElement\`** — ссылка на элемент шаблона; \`nativeElement\` — сам DOM-узел.
- **SSR (Server-Side Rendering)** — рендеринг страницы на сервере в Node.js, где нет настоящего браузера, глобальных \`window\` и \`document\`.
- **CSP (Content Security Policy)** — HTTP-заголовок, который ограничивает, какие скрипты и ресурсы страница может загружать и выполнять.
- **Trusted Types** — браузерный механизм в рамках CSP: опасные DOM-свойства вроде \`innerHTML\` принимают только специальные «доверенные» объекты, а не произвольные строки.

## Как это работает под капотом

Как Angular защищает привязки:

1. При компиляции шаблона Angular для каждой привязки определяет контекст безопасности по паре «элемент + свойство»: \`[innerHTML]\` — HTML, \`[href]\` у \`<a>\` — URL, \`[src]\` у \`<iframe>\` — RESOURCE_URL, \`[style.*]\` — STYLE. Текст между тегами \`{{ }}\` контекста не имеет: он станет текстовым узлом.
2. Поэтому в сгенерированный код для таких привязок вставляется вызов санитайзера нужного контекста. Для интерполяции в тексте ничего не вставляется: браузер не разбирает содержимое текстового узла как HTML.
3. При каждом изменении значения Angular проверяет: если это \`SafeValue\` нужного типа (результат \`bypassSecurityTrust*\`), он разворачивает обёртку и использует значение как есть. Если тип не тот — бросает ошибку. Если это обычная строка — санитизирует.
4. Для HTML строка разбирается в «инертном» документе: там скрипты не выполняются и картинки не грузятся. Затем Angular обходит дерево и оставляет только теги и атрибуты из белого списка, а атрибуты-ссылки прогоняет через URL-санитайзер.
5. Для URL всё, что начинается с \`javascript:\`, получает префикс \`unsafe:\` — браузер такую ссылку не выполнит.
6. Для RESOURCE_URL безопасной «очистки» не существует: исполняемый ресурс либо доверенный, либо нет. Поэтому обычная строка приводит к ошибке \`NG0904\`.
7. STYLE с Angular 10 не санитизируется: современные браузеры не выполняют JavaScript из CSS, и Angular передаёт значение как есть.
8. В режиме разработки каждое вмешательство санитайзера пишет предупреждение в консоль. В продакшене санитизация работает так же, только молча.

Упрощённо логика выглядит так:

\`\`\`ts
function sanitizeBinding(ctx: SecurityContext, value: unknown): string {
  if (value instanceof SafeValueImpl) {
    if (value.type !== ctx) throw new Error(\`Required a safe \${ctx}, got a \${value.type}\`);
    return value.changingThisBreaksApplicationSecurity; // настоящее имя поля в Angular
  }
  switch (ctx) {
    case SecurityContext.HTML:         return sanitizeHtml(String(value)); // белый список
    case SecurityContext.URL:          return sanitizeUrl(String(value));  // javascript: → unsafe:javascript:
    case SecurityContext.RESOURCE_URL: throw new Error('NG0904: unsafe value used in a resource URL context');
    case SecurityContext.STYLE:        return String(value);               // с Angular 10 — как есть
  }
}
\`\`\`

Имя поля \`changingThisBreaksApplicationSecurity\` — не шутка, оно действительно так называется в исходниках Angular. Это предупреждение тем, кто захочет «подправить» доверенное значение вручную.

### Пример 1. Интерполяция и \`[innerHTML]\`

\`\`\`ts
@Component({
  selector: 'app-comment',
  template: \`
    <p>{{ text }}</p>
    <div [innerHTML]="text"></div>
  \`,
})
export class CommentComponent {
  text = '<img src="x" onerror="alert(1)"><b>жирный</b><script>alert(2)</script>';
}
// <p>: на экране буквально видны теги: <img src="x" onerror="alert(1)"><b>жирный</b><script>...
// <div>: <img src="x"><b>жирный</b>
// консоль (dev): WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#...
\`\`\`

Интерполяция в тексте безопасна по определению: строка становится текстовым узлом, и браузер не видит в ней тегов. \`[innerHTML]\` вставляет разметку, но сначала санитайзер вырезал \`onerror\` (атрибута нет в белом списке) и \`<script>\` вместе с содержимым. Безопасные теги \`img\` и \`b\` остались.

### Пример 2. URL-контекст: \`javascript:\` получает префикс \`unsafe:\`

\`\`\`ts
@Component({
  selector: 'app-links',
  template: \`
    <a [href]="url">профиль</a>
    <a href="{{ url }}">профиль</a>
    <div [innerHTML]="html"></div>
  \`,
})
export class LinksComponent {
  url = 'javascript:alert(1)';
  html = '<a href="javascript:alert(1)">клик</a>';
}
// <a href="unsafe:javascript:alert(1)">профиль</a>   — оба варианта одинаково
// <a href="unsafe:javascript:alert(1)">клик</a>      — внутри [innerHTML] тоже
// консоль (dev): WARNING: sanitizing unsafe URL value javascript:alert(1) (see https://angular.dev/...)
// url = 'https://example.com/path?q=1' → проходит без изменений
// mailto:, tel:, ftp:, data:image/png;... → тоже проходят
\`\`\`

Две детали, которые любят спрашивать. Первая: интерполяция **в атрибуте** (\`href="{{ url }}"\`) — это та же привязка свойства, и она санитизируется по контексту. «\`{{ }}\` всегда безопасна» верно в смысле «не выполнится», но в атрибуте значение всё-таки проверяется. Вторая: опасную ссылку Angular не удаляет, а портит префиксом \`unsafe:\`: элемент остаётся на месте, но клик ничего не выполнит.

### Пример 3. RESOURCE_URL: \`<iframe>\` с видео

\`\`\`ts
@Component({
  selector: 'app-video',
  template: \`<iframe [src]="url"></iframe>\`,
})
export class VideoComponent {
  url = 'https://www.youtube.com/embed/abc';
}
// NG0904: unsafe value used in a resource URL context (see https://angular.dev/best-practices/security#...)
\`\`\`

Даже адрес YouTube Angular не пропустит: строка в \`[src]\` у \`<iframe>\` — сразу ошибка. Правильное решение — проверить адрес самим и только потом пометить его доверенным:

\`\`\`ts
const ALLOWED_HOSTS = new Set(['www.youtube.com', 'player.vimeo.com']);

@Component({
  selector: 'app-video',
  template: \`@if (embedUrl(); as src) { <iframe [src]="src"></iframe> }\`,
})
export class VideoComponent {
  private sanitizer = inject(DomSanitizer);
  videoUrl = input.required<string>();

  embedUrl = computed(() => {
    const url = new URL(this.videoUrl());
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
      return null; // чужой домен — не показываем вовсе
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url.href);
  });
}
\`\`\`

Bypass здесь оправдан, потому что значение прошло нашу собственную проверку: только HTTPS и только два известных хоста. \`bypassSecurityTrustResourceUrl(this.videoUrl())\` без проверки отдал бы злоумышленнику возможность встроить на вашу страницу любой сайт.

### \`DomSanitizer\`: \`sanitize()\` и \`bypassSecurityTrust*\`

У сервиса две группы методов. \`sanitize(context, value)\` — ручная санитизация, когда значение идёт мимо шаблона. \`bypassSecurityTrustHtml\`, \`...Style\`, \`...Script\`, \`...Url\`, \`...ResourceUrl\` — обернуть значение в \`SafeValue\` и выключить проверку для него.

\`\`\`ts
const s = inject(DomSanitizer);

s.sanitize(SecurityContext.HTML, '<b onclick="x()">hi</b><script>1</script>'); // '<b>hi</b>'
s.sanitize(SecurityContext.URL, 'javascript:alert(1)');      // 'unsafe:javascript:alert(1)'
s.sanitize(SecurityContext.STYLE, 'background:url(https://evil/x.png)'); // без изменений
s.sanitize(SecurityContext.RESOURCE_URL, 'https://x');       // ошибка NG05201: unsafe value used in a resource URL context
s.sanitize(SecurityContext.SCRIPT, 'alert(1)');              // ошибка NG05200: unsafe value used in a script context

s.sanitize(SecurityContext.HTML, s.bypassSecurityTrustUrl('https://x'));
// ошибка: Required a safe HTML, got a URL — обёртка не того типа

String(s.bypassSecurityTrustHtml('<b>x</b>'));
// 'SafeValue must use [property]=binding: <b>x</b> (see https://angular.dev/...)'
\`\`\`

Последняя строка объясняет частый баг: \`SafeHtml\` нельзя выводить через \`{{ }}\` — на экране появится этот служебный текст. Доверенное значение работает только в привязке свойства вроде \`[innerHTML]\`. Bypass применяйте **только** к строке, которую сформировали сами или проверили; к пользовательскому вводу — никогда.

### STYLE: почему стили больше не санитизируются

\`\`\`ts
// пользователь задал «цвет фона» своего профиля
cssEvil = 'url(https://attacker.example/track.png)';
// <div [style.background]="cssEvil"></div>
// результат: <div style="background: url(&quot;https://attacker.example/track.png&quot;);">
\`\`\`

До Angular 10 стили проверялись, затем эту санитизацию убрали: JavaScript из CSS в современных браузерах не выполняется. Но CSS-инъекция всё ещё неприятна: картинка-трекер сообщает чужому серверу, что страницу открыли, а \`position: fixed\` с огромным \`z-index\` позволяет перекрыть интерфейс фальшивой формой. Поэтому из пользовательского ввода принимайте только значения, а не CSS целиком: цвет — по шаблону \`#rrggbb\`, размер — числом.

### \`Renderer2\`: что умеет и как им пользоваться

\`\`\`ts
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  private r = inject(Renderer2);
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    const el = this.el.nativeElement;
    this.r.setStyle(el, 'background', 'yellow');
    this.r.addClass(el, 'highlighted');
    this.r.setAttribute(el, 'aria-live', 'polite');

    const offClick = this.r.listen(el, 'click', () => console.log('click!'));
    const offResize = this.r.listen('window', 'resize', () => this.recalc());
    this.destroyRef.onDestroy(() => {
      offClick();
      offResize();
    });
  }
  private recalc() {}
}
// <div apphighlight="" style="background: yellow;" class="highlighted" aria-live="polite">
// клик → click!; после offClick() клик больше ничего не печатает
\`\`\`

\`listen\` принимает элемент или строку \`'window'\`, \`'document'\`, \`'body'\` и возвращает функцию отписки. Её надо вызвать при уничтожении, иначе слушатель на \`window\` переживёт компонент и будет держать его в памяти. Через \`DestroyRef.onDestroy\` это делается в одном месте.

Две ловушки, проверенные в Angular 21. \`Renderer2\` **не защищает от XSS**: \`this.r.setProperty(el, 'innerHTML', '<img src="x" onerror="alert(1)">')\` вставит \`onerror\` как есть — в документации Angular прямо написано, что \`Renderer2\` не даёт дополнительной безопасности по сравнению с прямым DOM. Если нужно вставить HTML вручную, сначала \`sanitizer.sanitize(SecurityContext.HTML, html)\`. И \`Renderer2\` нельзя внедрить в сервис: \`inject(Renderer2)\` в \`@Injectable({ providedIn: 'root' })\` даёт \`NG0201: No provider found for Renderer2\`, потому что рендерер привязан к конкретному компоненту. В сервисе берут \`inject(RendererFactory2).createRenderer(null, null)\`.

### Зачем \`Renderer2\`, а не прямой доступ к DOM

- **SSR.** На сервере нет глобальных \`window\` и \`document\`, а DOM — упрощённая эмуляция без раскладки. Код вида \`document.querySelector(...)\` или \`window.innerWidth\` в конструкторе упадёт при серверном рендеринге, а вызовы \`Renderer2\` работают на любой платформе.
- **Анимации.** С подключёнными анимациями Angular подменяет рендерер на свой, который, например, откладывает удаление элемента до конца анимации ухода. Прямое \`el.remove()\` этот механизм обходит.
- **Свои рендереры.** Через \`RendererFactory2\` Angular можно научить рисовать не в DOM: так устроены нативные мобильные платформы вроде NativeScript.
- **Тестируемость и единый стиль.** Вся работа с элементом идёт через один API, который легко подменить.

А была ли поддержка Web Worker? Отдельная платформа \`@angular/platform-webworker\` существовала, но была объявлена устаревшей в Angular 8 и удалена в Angular 10, так что сегодня это не аргумент.

В современном Angular \`Renderer2\` нужен реже: стиль и класс декларативно ставятся через \`host: { '[style.background]': 'color()', '[class.active]': 'isActive()' }\`, глобальный документ — через \`inject(DOCUMENT)\`, а код, которому нужен настоящий браузер (замер размеров, сторонний виджет), — в \`afterNextRender()\`, который на сервере не вызывается.

### Trusted Types: защита на уровне браузера

Санитайзер Angular защищает только то, что идёт через шаблон. Trusted Types закрывают и остальное: с заголовком ниже браузер откажется присваивать в \`innerHTML\` обычную строку, даже если это сделал ваш собственный код или сторонняя библиотека.

\`\`\`text
Content-Security-Policy: trusted-types angular angular#unsafe-bypass; require-trusted-types-for 'script';
\`\`\`

Angular умеет работать в таком режиме: санитизированный HTML он создаёт через политику \`angular\`, а результаты \`bypassSecurityTrust*\` — через отдельную политику \`angular#unsafe-bypass\`. Если не разрешить вторую, все обходы санитизации перестанут работать — удобный способ найти их в коде. Поддержка Trusted Types зависит от браузера: в Chromium она давняя, в остальных появилась позже, поэтому проверяйте актуальные данные.

### Где это применяется на практике

- **Контент из CMS и Markdown.** Статьи, описания товаров, справка: HTML, собранный Markdown-рендерером, выводят через \`[innerHTML]\`, и санитайзер вырезает всё опасное.
- **Встраивание видео, карт и отчётов** в \`<iframe>\`: адрес проверяют по списку доменов, затем \`bypassSecurityTrustResourceUrl\`.
- **Предпросмотр писем и шаблонов** в админке: недоверенный HTML показывают в \`<iframe sandbox>\`, а не через bypass.
- **Директивы поведения**: подсветка, автофокус, тултипы, «липкие» заголовки большого грида — через \`Renderer2\` или host-привязки, чтобы работало и при SSR.
- **Интеграция сторонних библиотек** графиков и редакторов: их инициализируют в \`afterNextRender()\`, а слушатели на \`window\` снимают через функцию отписки.
- **Код-ревью безопасности**: поиск по проекту \`bypassSecurityTrust\`, \`nativeElement.innerHTML\` и \`setProperty(..., 'innerHTML'\` — первые кандидаты на XSS.

## Важные нюансы и подводные камни

- **\`bypassSecurityTrustHtml(userInput)\` — это и есть XSS.** Самая частая находка на код-ревью: bypass «чтобы не ругалось» на данные от пользователя.
- **Интерполяция и \`[innerHTML]\`.** \`{{ }}\` в тексте показывает теги как текст; \`[innerHTML]\` санитизирует, но всё-таки вставляет разметку. Спросят разницу.
- **Интерполяция в атрибуте тоже санитизируется.** \`href="{{ url }}"\` — та же привязка \`[href]\` в контексте URL.
- **\`javascript:\` не вырезается, а получает префикс \`unsafe:\`.** Ссылка остаётся в DOM, но не выполняется.
- **RESOURCE_URL нельзя санитизировать** — только bypass. Для \`<iframe [src]>\` нужны \`bypassSecurityTrustResourceUrl\` и собственная проверка домена.
- **Стили не санитизируются с Angular 10.** Риск — не выполнение скрипта, а CSS-инъекция: трекинг через \`url()\` и перекрытие интерфейса. Принимайте от пользователя значения, а не готовый CSS.
- **\`[innerHTML]\` — это не Angular-шаблон.** Компоненты (\`<app-user>\`), привязки и \`(click)\` внутри строки не заработают: неизвестные теги удаляются, текст из них остаётся. Под нож идут и \`<button>\`, \`<form>\`, \`<iframe>\`, \`<svg>\`.
- **Санитайзер удаляет \`id\`, \`name\` и \`style\`.** Этих атрибутов нет в белом списке, поэтому из \`[innerHTML]\` они молча пропадают. Якорные ссылки на заголовки Markdown вида \`#install\` из-за этого перестают работать.
- **\`Renderer2\` не санитизирует.** \`setProperty(el, 'innerHTML', x)\` так же опасен, как \`el.innerHTML = x\`. Для ручной вставки — \`sanitizer.sanitize(SecurityContext.HTML, x)\`.
- **Прямой \`nativeElement.innerHTML = ...\`** — классический антипаттерн: обходит санитайзер и ломает SSR, если опирается на браузерные глобальные объекты.
- **\`r.listen\` возвращает функцию отписки.** Не вызвали — слушатель на \`window\` или \`document\` живёт вечно и держит компонент в памяти.
- **\`Renderer2\` не внедряется в сервис** — \`NG0201\`; используйте \`RendererFactory2.createRenderer(null, null)\`.
- **\`SafeValue\` в \`{{ }}\`** выводит текст \`SafeValue must use [property]=binding\`. Обёртка работает только в привязке свойства.
- **Привязка к событиям-свойствам запрещена.** \`[attr.onclick]="code"\` бросает \`NG0306: Binding to event attribute 'onclick' is disallowed for security reasons\`.
- **\`data:\` в \`[href]\` пропускается.** Санитайзер блокирует только \`javascript:\`; переход на \`data:\`-адрес верхнего уровня современные браузеры блокируют сами, но открытый редирект на внешний адрес — ваша ответственность.
- **Санитизация защищает только DOM.** SQL-инъекции, генерация шаблонов на сервере из пользовательского ввода, открытые редиректы, \`eval\`, \`new Function\`, \`setTimeout('строка')\` и \`location.href = userUrl\` в вашем коде — вне её зоны.
- **Trusted Types** — браузерный механизм CSP, который запрещает присваивать в \`innerHTML\` произвольные строки; Angular с ним совместим через политики \`angular\` и \`angular#unsafe-bypass\`.

**Плюсы:** защита от XSS включена по умолчанию и не требует кода; правила зависят от контекста, поэтому полезная разметка сохраняется; \`Renderer2\` делает работу с элементами переносимой между браузером и сервером.
**Минусы:** санитайзер молча выкидывает \`id\`, \`style\`, кнопки и компоненты, что удивляет при выводе Markdown; bypass легко применить не к тем данным; \`Renderer2\` многословен и не даёт безопасности, а для многих задач уже есть более простые host-привязки.

## Как это спрашивают на собеседовании

**Главный вывод:** Angular контекстно санитизирует каждую привязку в шаблоне: текст экранируется, HTML чистится по белому списку, \`javascript:\`-ссылки портятся префиксом \`unsafe:\`, RESOURCE_URL требует явного доверия. \`bypassSecurityTrust*\` — только для проверенных значений. \`Renderer2\` нужен ради переносимости (SSR, анимации), а не ради безопасности.

Типичные формулировки: «Как Angular защищает от XSS?», «Чем \`{{ }}\` отличается от \`[innerHTML]\`?», «Зачем \`Renderer2\`, если есть \`nativeElement\`?», «Как вставить видео с YouTube в \`<iframe>\`?».

Что могут спросить следом:

- *Что будет, если привязать \`javascript:alert(1)\` к \`[href]\`?* — Angular запишет \`unsafe:javascript:alert(1)\` и выведет предупреждение в dev-режиме.
- *Почему \`<iframe [src]>\` со строкой падает?* — Это RESOURCE_URL: исполняемый ресурс нельзя частично очистить, нужен \`bypassSecurityTrustResourceUrl\` после своей проверки.
- *Защищает ли \`Renderer2\` от XSS?* — Нет, \`setProperty(el, 'innerHTML', ...)\` не санитизирует; санитизирует только шаблон или явный \`sanitize()\`.
- *Как внедрить \`Renderer2\` в сервис?* — Через \`RendererFactory2.createRenderer(null, null)\`.
- *Что такое Trusted Types?* — Режим CSP, при котором \`innerHTML\` и похожие свойства принимают только доверенные объекты; Angular создаёт их через политики \`angular\` и \`angular#unsafe-bypass\`.

### Ответ на 1 минуту

> \`Renderer2\` — это абстракция над DOM: \`setStyle\`, \`addClass\`, \`setAttribute\`, \`listen\`. Нужна она ради переносимости: при SSR нет \`window\` и \`document\`, анимации подменяют рендерер, поэтому прямой \`nativeElement.innerHTML\` — антипаттерн. Но важно: \`Renderer2\` сам не санитизирует. От XSS защищает шаблон: компилятор определяет контекст каждой привязки — HTML, URL, RESOURCE_URL, STYLE — и вставляет вызов санитайзера. Интерполяция в тексте становится текстовым узлом, \`[innerHTML]\` чистится по белому списку, \`javascript:\` в ссылках получает префикс \`unsafe:\`, а строка в \`<iframe [src]>\` даёт ошибку, потому что исполняемый ресурс можно только явно доверить. Для таких случаев есть \`DomSanitizer.bypassSecurityTrust*\`, но я применяю его только к значениям, которые сам проверил, например по списку доменов. Стили с Angular 10 не санитизируются, а сверху можно включить Trusted Types через CSP.`,
      en: `## In short

Two different mechanisms here, and both say "don't touch the DOM directly".

\`Renderer2\` is a **translator between your code and the platform**. You say "add a class" and it decides how: in the browser, on the server during SSR (where there is no \`document\` at all), or in a Web Worker.

\`DomSanitizer\` is **customs at the template border**. Everything you put into markup gets inspected and the dangerous parts are cut out. \`bypassSecurityTrust*\` is a diplomatic passport: you skip the check, and you carry the responsibility.

## How it works, step by step

1. A value reaches the template — via interpolation \`{{ x }}\` or a property binding like \`[innerHTML]\`, \`[src]\`, \`[style]\`.
2. Angular determines the **security context**: HTML, STYLE, URL or RESOURCE_URL — each with its own rules.
3. For interpolation \`{{ }}\` the value is simply **escaped as text**: tags never become tags. That is why \`{{ userInput }}\` is safe by definition.
4. For \`[innerHTML]\` the HTML-context sanitizer kicks in: \`<script>\`, \`onerror\`, \`javascript:\` links are **stripped**, safe markup survives.
5. If you **know for certain** the HTML is trusted, you mark it explicitly with \`DomSanitizer.bypassSecurityTrustHtml()\` — Angular receives a special wrapper object and skips the inspection.
6. For RESOURCE_URL (\`<iframe src>\`, \`<script src>\`) sanitization **does not exist** at all: Angular either accepts the value or demands a bypass — because there is no such thing as a partially safe URL for an executable resource.

## Example

\`\`\`ts
// Renderer2: platform-independent element manipulation
const r = inject(Renderer2);
r.setAttribute(el, 'aria-hidden', 'true');
r.addClass(el, 'active');
const unlisten = r.listen(el, 'click', () => {});

// DomSanitizer: a deliberate bypass of sanitization
const safe = inject(DomSanitizer).bypassSecurityTrustHtml(html);
// [innerHTML]="safe"
\`\`\`

Why it looks like this: \`r.listen\` returns an unlisten function you must call on destroy or you leak the listener. And \`bypassSecurityTrustHtml\` is applied **only** to a string you built yourself, never to user input — otherwise you are hand-crafting the XSS.

## Why Renderer2 instead of touching the DOM directly

- **SSR**: there is no \`document\` on the server — a direct \`nativeElement.innerHTML = ...\` simply throws or misbehaves.
- **Other platforms**: Web Workers, future render engines — \`Renderer2\` abstracts them all.
- **Security**: a direct \`innerHTML\` goes around the sanitizer — a ready-made XSS hole.
- **Compatibility** with Angular animations and its internal element bookkeeping.

A direct \`nativeElement.innerHTML = ...\` is the classic anti-pattern: it breaks SSR and opens XSS at the same time.

## What to say in the interview

> \`Renderer2\` is an abstraction over the DOM that lets you change elements without touching \`document\` directly: \`setAttribute\`, \`addClass\`, \`setStyle\`, \`listen\`. It exists for platform independence — SSR where \`document\` is missing, Web Workers, future renderers — and for compatibility with animations. Writing straight into \`nativeElement.innerHTML\` is an anti-pattern: it breaks SSR and bypasses sanitization. On XSS: by default Angular contextually sanitizes every interpolation and property binding across the HTML, STYLE, URL and RESOURCE_URL contexts. Interpolation escapes text, so \`{{ userInput }}\` is safe, while \`[innerHTML]\` goes through \`SecurityContext.HTML\`, where scripts and \`javascript:\` links get stripped. When you must insert known-trusted content you use \`DomSanitizer.bypassSecurityTrust*\` — an escape hatch strictly for values that do not come from users. RESOURCE_URL for \`iframe\` and \`script\` is a special case: it cannot be sanitized, only explicitly trusted. On top of that, Trusted Types at the CSP level harden things further.

## Gotchas

- **\`bypassSecurityTrustHtml(userInput)\`** is literally an XSS. The most common code-review finding.
- **Interpolation vs \`[innerHTML]\`**: \`{{ }}\` escapes and is always safe, \`[innerHTML]\` sanitizes but still inserts markup. You will be asked for the difference.
- **RESOURCE_URL cannot be sanitized** — only bypassed. For \`<iframe [src]>\` you must use \`bypassSecurityTrustResourceUrl\` and validate the domain yourself.
- **\`r.listen\` returns unlisten** — not calling it leaks the listener.
- **Sanitization is not a silver bullet**: it is about the DOM. SQL injection, server-side templates and open redirects are outside its scope.
- **Styles**: a \`[style]\` bound to a user-supplied string is dangerous too (\`SecurityContext.STYLE\`); binding individual properties is safer.
- They will ask about **Trusted Types** — a browser CSP mechanism that forbids assigning arbitrary strings to \`innerHTML\`; Angular is compatible with it.`,
    },
    codeSnippet: `@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  private r = inject(Renderer2);
  private el = inject(ElementRef);
  ngOnInit() {
    this.r.setStyle(this.el.nativeElement, 'background', 'yellow');
  }
}`,
  },
  {
    id: 'ng-042',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['ng-container', 'template-outlet', 'component-outlet'],
    question: {
      ru: 'Для чего нужны ng-container, ngTemplateOutlet и ngComponentOutlet?',
      en: 'What are ng-container, ngTemplateOutlet and ngComponentOutlet used for?',
    },
    answer: {
      ru: `## В чём суть

Все три инструмента — про то, **как положить что-то в шаблон, не мусоря в DOM и не дублируя разметку**. \`ng-container\` — невидимая обёртка: группирует узлы, но сама в DOM элементом не становится. \`ngTemplateOutlet\` берёт заранее описанный кусок шаблона (\`ng-template\`) и рисует его в нужном месте с переданными данными. \`ngComponentOutlet\` делает то же для целого компонента, класс которого выбирается во время работы приложения.

Аналогии. \`ng-container\` — **скрепка**: держит листы вместе, но в отсканированном документе её не видно. \`ngTemplateOutlet\` — **резиновый штамп**: вырезали один раз и ставите где угодно, каждый раз другими чернилами (контекстом). \`ngComponentOutlet\` — **розетка**: какой прибор в неё воткнуть, решается в момент включения, а не при строительстве дома.

**Какую проблему решает.** Без \`ng-container\` для каждого условия или цикла приходится заводить лишний \`div\`, а он ломает вёрстку: внутри \`ul\` допустимы только \`li\`, внутри \`tr\` — только \`td\`, у flex- и grid-контейнера лишняя обёртка становится отдельным элементом раскладки. Без \`ngTemplateOutlet\` компонент не может дать потребителю «подменить кусок разметки», оставив данные у себя, — получаются копипаста и десятки \`@Input\` для настроек вида. Без \`ngComponentOutlet\` динамические виджеты (дашборд, собранный из конфига) пришлось бы создавать вручную через \`ViewContainerRef\` с подписками и уборкой.

## Словарик терминов

- **\`ng-template\`** — описание куска разметки, которое само по себе ничего не рисует; это «чертёж», который кто-то должен отрисовать.
- **\`TemplateRef\`** — объект-ссылка на такой чертёж; его получают через ссылку \`#row\` в шаблоне или запросом \`viewChild\`/\`contentChild\`.
- **Встроенное представление (embedded view)** — отрисованный экземпляр \`ng-template\`: реальные DOM-узлы плюс свои привязки.
- **\`ViewContainerRef\`** — «точка вставки» в шаблоне, куда можно добавлять embedded views и компоненты (\`createEmbeddedView\`, \`createComponent\`, \`clear\`).
- **Контекст (context)** — объект с данными для \`ng-template\`; ключ \`$implicit\` — «главное значение», которое получает переменная без имени.
- **\`let-\`-переменная** — объявление переменной шаблона из контекста: \`let-item\` берёт \`$implicit\`, \`let-i="index"\` берёт поле \`index\`.
- **Структурная директива** — директива, которая создаёт и удаляет куски DOM: \`*ngIf\`, \`*ngFor\`; звёздочка — сокращённая запись через \`ng-template\`.
- **Встроенный control flow (\`@if\`, \`@for\`, \`@switch\`)** — синтаксис шаблонов, встроенный в компилятор Angular 17+; с Angular 20 \`*ngIf\`, \`*ngFor\` и \`*ngSwitch\` помечены устаревшими.
- **Узел-комментарий (anchor)** — комментарий вида \`<!--ng-container-->\`, которым Angular отмечает место в DOM; на вёрстку не влияет.
- **\`exportAs\`** — имя, под которым директиву можно получить в ссылку шаблона: \`#outlet="ngComponentOutlet"\`.

## Как это работает под капотом

1. Компилятор видит \`ng-container\` и вместо элемента создаёт узел-комментарий; дочерние узлы вставляются в DOM прямо рядом с ним, как будто обёртки нет. Поэтому на \`ng-container\` можно повесить директиву, а класс или стиль применить не к чему — элемента нет.
2. \`ng-template\` компилятор превращает в отдельную функцию отрисовки и объект \`TemplateRef\`, а в DOM оставляет только комментарий-якорь. Пока кто-то не вызовет \`createEmbeddedView\`, разметки нет.
3. \`ngTemplateOutlet\` — обычная директива. Когда меняется сам шаблон (или инжектор), она удаляет старое представление и вызывает \`viewContainerRef.createEmbeddedView(template, context)\`.
4. Если меняется только контекст, представление **не пересоздаётся**: директива передаёт в шаблон прокси, который всегда читает поля из актуального объекта контекста. DOM-узлы, фокус и состояние сохраняются.
5. \`ngComponentOutlet\` при смене класса компонента (а также проецируемого контента, инжектора или модуля) очищает контейнер и вызывает \`viewContainerRef.createComponent(componentClass)\`.
6. Значения из \`ngComponentOutletInputs\` директива на каждой проверке изменений передаёт через \`componentRef.setInput(name, value)\`; ключ, который пропал из объекта, получает \`undefined\`. Компонент при этом не пересоздаётся.

Упрощённо \`ngTemplateOutlet\` устроен так:

\`\`\`ts
class NgTemplateOutlet {
  private vcr = inject(ViewContainerRef);
  private viewRef: EmbeddedViewRef<unknown> | null = null;
  ngTemplateOutlet: TemplateRef<unknown> | null = null;
  ngTemplateOutletContext: object | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ngTemplateOutlet'] || changes['ngTemplateOutletInjector']) {
      if (this.viewRef) this.vcr.remove(this.vcr.indexOf(this.viewRef));
      if (!this.ngTemplateOutlet) { this.viewRef = null; return; }
      // прокси: шаблон всегда читает поля из текущего ngTemplateOutletContext
      const ctx = new Proxy({}, { get: (_, key) => (this.ngTemplateOutletContext as any)?.[key] });
      this.viewRef = this.vcr.createEmbeddedView(this.ngTemplateOutlet, ctx);
    }
  }
}
\`\`\`

### \`ng-container\`: группировка без лишнего элемента

\`\`\`html
<ul>
  @if (user(); as u) {
    <ng-container>
      <li>{{ u.name }}</li>
      <li>admin</li>
    </ng-container>
  }
</ul>
<!-- итоговый DOM:
<ul><li>Anna</li><li>admin</li><!--ng-container--><!--container--></ul>
-->
\`\`\`

Внутри \`ul\` остались только \`li\` — вёрстка и доступность не пострадали. Комментарии \`ng-container\` и \`container\` — якоря Angular, браузер их не отображает. С новым control flow \`ng-container\` для условий нужен реже: \`@if\` сам не создаёт элемента. Но в легаси-коде на \`*ngIf\`/\`*ngFor\` он незаменим: на одном элементе нельзя написать две структурные директивы.

\`\`\`html
<!-- ошибка компиляции:
     Can't have multiple template bindings on one element. Use only one attribute prefixed with * -->
<li *ngFor="let u of users" *ngIf="u.active">{{ u.name }}</li>

<!-- обход через ng-container -->
<ng-container *ngFor="let u of users">
  <li *ngIf="u.active">{{ u.name }}</li>
</ng-container>

<!-- современно, без обёрток -->
@for (u of users; track u.id) {
  @if (u.active) { <li>{{ u.name }}</li> }
}
\`\`\`

### \`ng-template\` и \`TemplateRef\`: чертёж, который сам не рисуется

\`\`\`html
<ng-template #row let-item let-i="index">[{{ i }}: {{ item }}]</ng-template>
<!-- на экране: ничего; в DOM: только комментарий-якорь -->
\`\`\`

\`#row\` — ссылка на \`TemplateRef\`. \`let-item\` без значения получает поле \`$implicit\` контекста, \`let-i="index"\` — поле \`index\`. Объявить шаблон и забыть его отрисовать — частый «баг-призрак»: на экране пусто, ошибок нет.

### \`ngTemplateOutlet\`: штамп с чернилами

\`\`\`html
<p>
  <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="ctx()" />
</p>
\`\`\`

\`\`\`ts
ctx = signal({ $implicit: 'first', index: 0 });

// DOM: <p>[0: first]<!--ng-container--></p>
// this.ctx.set({ $implicit: 'second', index: 1 });
// DOM: <p>[1: second]<!--ng-container--></p>   — тот же текстовый узел, представление не пересоздано
\`\`\`

Контекст поменялся, а DOM-узел остался прежним — работает прокси из шага 4. Если же подставить в \`ngTemplateOutlet\` другой шаблон, представление будет создано заново. Есть короткая форма через микросинтаксис: \`<ng-container *ngTemplateOutlet="row; context: { $implicit: 'first', index: 0 }" />\`, и третий вход \`ngTemplateOutletInjector\` — чтобы дать шаблону свой инжектор.

### Пример из \`codeSnippet\`: шаблон ячейки внутри цикла

\`\`\`html
<ng-template #cell let-value let-col="col">{{ col }}: {{ value }}; </ng-template>

<ng-container
  *ngFor="let row of rows"
  [ngTemplateOutlet]="cell"
  [ngTemplateOutletContext]="{ $implicit: row.value, col: row.col }" />
\`\`\`

\`\`\`ts
rows = [{ col: 'Name', value: 'Anna' }, { col: 'Age', value: 30 }];
// текст на экране: Name: Anna; Age: 30;
\`\`\`

На одном \`ng-container\` здесь одна структурная директива (\`*ngFor\`) и одна обычная (\`ngTemplateOutlet\`) — это разрешено. Так как \`*ngFor\` устарел с Angular 20, тот же код сегодня пишут так:

\`\`\`html
@for (row of rows; track row.col) {
  <ng-container *ngTemplateOutlet="cell; context: { $implicit: row.value, col: row.col }" />
}
\`\`\`

### Пример: «слот с данными» — таблица отдаёт строку, потребитель решает, как её рисовать

\`\`\`ts
@Component({
  selector: 'data-table',
  imports: [NgTemplateOutlet],
  template: \`
    <table><tbody>
      @for (row of rows(); track row.id; let i = $index) {
        <tr>
          @if (rowTemplate(); as tpl) {
            <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row, index: i }" />
          } @else {
            <td>{{ row.id }}</td>
          }
        </tr>
      }
    </tbody></table>\`,
})
export class DataTable<T extends { id: number }> {
  rows = input.required<T[]>();
  rowTemplate = input<TemplateRef<{ $implicit: T; index: number }>>();
}
\`\`\`

\`\`\`html
<ng-template #userRow let-user let-i="index">
  <td>{{ i + 1 }}</td><td>{{ user.name }}</td><td>{{ user.role }}</td>
</ng-template>
<data-table [rows]="users" [rowTemplate]="userRow" />
<data-table [rows]="users" />

<!-- первая таблица: 1 | Anna | admin  //  2 | Boris | user
     вторая (шаблон по умолчанию): 1  //  2 -->
\`\`\`

Таблица владеет данными, порядком строк и индексами, а внешний вид строки целиком отдан потребителю. Так устроены гриды Angular Material, PrimeNG и Kendo UI: шаблоны ячеек, заголовков и пустого состояния.

### \`ngComponentOutlet\`: розетка для компонента

\`\`\`ts
@Component({
  selector: 'app-dashboard',
  imports: [NgComponentOutlet],
  template: \`
    <section>
      <ng-container
        [ngComponentOutlet]="widget()"
        [ngComponentOutletInputs]="{ title: title() }"
        #outlet="ngComponentOutlet" />
    </section>
    <button (click)="msg = outlet.componentInstance?.refresh()">refresh</button>\`,
})
export class Dashboard {
  widget = signal<Type<unknown>>(ChartWidget);
  title = signal('Sales');
  msg = '';
}
// ChartWidget: title = input('?'), шаблон <b>Chart: {{ title() }}</b>, refresh() возвращает 'refreshed ' + title

// DOM: <section><chart-widget><b>Chart: Sales</b></chart-widget><!--ng-container--></section>
// title.set('Revenue')        → Chart: Revenue   (тот же экземпляр, новый input через setInput)
// клик по refresh             → msg = 'refreshed Revenue'
// widget.set(TableWidget)     → <table-widget><i>Table: Revenue</i></table-widget>  (старый уничтожен)
\`\`\`

Что умеет директива в Angular 21: \`ngComponentOutletInputs\` (с Angular 16.2), \`ngComponentOutletInjector\` и \`ngComponentOutletEnvironmentInjector\` — свои инжекторы, \`ngComponentOutletContent\` — массив массивов DOM-узлов для проекции в \`ng-content\`, \`ngComponentOutletNgModule\` — для старых компонентов из NgModule. Экземпляр доступен через \`exportAs\`: \`#outlet="ngComponentOutlet"\` и свойство \`componentInstance\`. Если в \`ngComponentOutletInputs\` передать ключ, которого нет среди inputs компонента, в dev-режиме в консоли появится ошибка \`NG0303: Can't set value of the 'title' input on the 'ChartWidget' component\`, а значение просто не дойдёт.

### \`ViewContainerRef.createComponent\`: ручной вариант

\`\`\`ts
export class WidgetHost {
  private vcr = inject(ViewContainerRef);
  open(type: Type<unknown>) {
    this.vcr.clear();
    const ref = this.vcr.createComponent(type, {
      bindings: [
        inputBinding('title', () => 'Sales'),
        outputBinding<string>('closed', (reason) => console.log('closed:', reason)),
      ],
    });
    return ref; // ComponentRef: ref.instance, ref.setInput(...), ref.destroy()
  }
}
\`\`\`

Ручной способ нужен, когда компонент создаётся по событию (диалог, тост), когда нужно подписаться на его outputs (у \`ngComponentOutlet\` нет входа для outputs) или вставлять его в контейнер вне шаблона. \`inputBinding\`/\`outputBinding\` — API Angular 20+; в более старых версиях делают \`ref.setInput()\` и подписку на \`ref.instance.closed\`.

### Как выбрать

- **\`ng-container\`** — нужна структурная группировка, а лишний элемент сломает вёрстку (\`ul\`/\`li\`, \`tr\`/\`td\`, \`select\`, flex, grid) или нужно совместить две структурные директивы в легаси-коде.
- **\`ngTemplateOutlet\`** — компонент отдаёт потребителю право нарисовать кусок разметки, а данные оставляет у себя: шаблоны ячеек, элементов списка, пустых состояний; или один фрагмент нужно нарисовать в нескольких местах.
- **\`ngComponentOutlet\`** — класс компонента неизвестен при написании шаблона и приходит из данных: конфиг дашборда, тип блока из CMS, плагины.
- **\`ViewContainerRef.createComponent\`** — нужен полный контроль: создание по событию, outputs, ручное уничтожение.

### Где это применяется на практике

- **Гриды и таблицы**: шаблоны ячеек и заголовков (\`#cellTemplate\`), строка «нет данных», шаблон развёрнутой строки.
- **Дашборды с настраиваемыми виджетами**: пользователь сохраняет набор и порядок виджетов, бэкенд отдаёт \`[{ type: 'chart', title: 'Sales' }]\`, а карта \`type → класс компонента\` плюс \`ngComponentOutlet\` собирает экран.
- **CMS и конструкторы страниц**: каждый блок из API рендерится своим компонентом по полю \`type\`.
- **Библиотечные компоненты** (select, autocomplete, tree): шаблон элемента списка задаёт потребитель через \`ngTemplateOutlet\`.
- **Вёрстка без лишних обёрток**: условные пункты меню, группы \`option\` в \`select\`, ячейки таблицы.

## Важные нюансы и подводные камни

- **\`ng-template\` сам ничего не рисует.** Объявили и не вывели — пусто и без ошибок.
- **\`$implicit\` — единственное безымянное значение.** \`let-item\` без \`=\` берёт именно его, остальное только по имени: \`let-i="index"\`.
- **Контекст по умолчанию не типизирован.** Ссылка \`#row\` даёт \`TemplateRef<any>\`, и переменные внутри — \`any\`. Строгая типизация требует своей директивы с \`ngTemplateContextGuard\`.
- **Две структурные директивы на одном элементе — ошибка компиляции.** Обход — \`ng-container\` или \`@for\`/\`@if\`.
- **Класс, стиль или \`(click)\` на \`ng-container\` молча не работают.** Элемента нет: в Angular 21 \`class="x"\` и \`[class.y]\` просто пропадают, а клик по комментарию никогда не случится — ошибки при этом нет.
- **\`ngComponentOutlet\` отдаёт экземпляр.** Старое утверждение «инстанс не получить» неверно: есть \`componentInstance\` через \`#outlet="ngComponentOutlet"\`. А вот outputs через директиву не подписать — нужен \`createComponent\`.
- **Standalone-компонент работает сразу; компонент из NgModule** — через \`ngComponentOutletNgModule\`, иначе ему не хватит зависимостей модуля.
- **Смена класса пересоздаёт компонент.** Состояние, фокус и подписки старого экземпляра теряются; смена inputs — нет.
- **Неизвестный ключ в \`ngComponentOutletInputs\`** даёт ошибку \`NG0303\` в dev-режиме — следите, чтобы конфиг совпадал с inputs виджета.
- **Динамический компонент и tree-shaking.** Класс, на который ссылается только карта \`type → компонент\`, попадёт в бандл; для тяжёлых виджетов делайте \`await import(...)\` и подставляйте класс после загрузки.
- **Директивы \`NgIf\`, \`NgForOf\` и \`NgSwitch\` устарели с Angular 20** (их звёздочные формы в шаблонах), удаление запланировано на v22. \`ng-container\` и аутлеты остаются актуальными — меняется только то, что вокруг них.

**Плюсы:** чистый DOM без обёрток; переиспользование разметки и кастомизация компонентов без десятков inputs; динамические компоненты декларативно, с автоматической уборкой.
**Минусы:** нетипизированный контекст шаблонов; «невидимые» ошибки, когда шаблон не отрисован; \`ngComponentOutlet\` не умеет outputs; динамические компоненты сложнее отлаживать и разбивать на чанки.

## Как это спрашивают на собеседовании

**Главный вывод:** \`ng-container\` — логическая обёртка без DOM-элемента; \`ngTemplateOutlet\` рисует \`TemplateRef\` в нужном месте с контекстом, где \`$implicit\` — безымянная \`let\`-переменная; \`ngComponentOutlet\` декларативно создаёт компонент по классу, выбранному в рантайме, и передаёт ему inputs.

Типичные формулировки: «Зачем нужен \`ng-container\`?», «Как сделать компонент с настраиваемым шаблоном строки?», «Как отрендерить компонент, класс которого приходит с бэкенда?».

Что могут спросить следом:

- *Что такое \`$implicit\`?* — Ключ контекста, который получает \`let\`-переменная без значения: \`let-item\`.
- *Пересоздаётся ли шаблон при смене контекста?* — Нет: \`ngTemplateOutlet\` пересоздаёт представление только при смене шаблона или инжектора.
- *Как получить экземпляр компонента из \`ngComponentOutlet\`?* — Через \`#outlet="ngComponentOutlet"\` и \`outlet.componentInstance\`.
- *Чем \`ngComponentOutlet\` хуже \`createComponent\`?* — Нет outputs и ручного контроля жизненного цикла.
- *Нужен ли \`ng-container\` при \`@if\`/\`@for\`?* — Для условий почти нет, но для группировки и аутлетов — да.

### Ответ на 1 минуту

> \`ng-container\` — логический узел, который не создаёт DOM-элемента: Angular оставляет только комментарий-якорь, а дети встают прямо в родителя. Я использую его, когда лишний \`div\` сломает вёрстку — в списках, таблицах, flex и grid, — и в легаси-коде, чтобы совместить \`ngFor\` и \`ngIf\`. \`ngTemplateOutlet\` рисует переданный \`TemplateRef\` в нужном месте и прокидывает контекст: ключ \`$implicit\` попадает в безымянную \`let\`-переменную, остальные — по имени; при смене контекста представление не пересоздаётся. Это основа паттерна «слот с данными», как шаблоны ячеек в гридах. \`ngComponentOutlet\` создаёт компонент по классу, выбранному в рантайме, передаёт \`ngComponentOutletInputs\` через \`setInput\` и сам убирает старый экземпляр — так собирают дашборды из конфига. Экземпляр можно получить через \`exportAs\`, а если нужны outputs, беру \`ViewContainerRef.createComponent\`.`,
      en: `## In short

Three tools about **putting things into a template without littering the DOM**.

Analogies: \`ng-container\` is a **paper clip** — it holds pages together but is not part of the finished document. \`ngTemplateOutlet\` is a **rubber stamp** — you carve it once and press it anywhere, each time with different ink (the context). \`ngComponentOutlet\` is a **power socket** — you can plug any appliance in, and the choice is made at runtime.

## What they are

1. **\`ng-container\`** — a logical container that creates **no DOM element**. Use it to attach a structural directive (\`*ngIf\`, \`*ngFor\`) or group nodes without an extra \`<div>\`. It is a lifesaver when you cannot put two structural directives on one element.
2. **\`ngTemplateOutlet\`** — renders an already declared \`ng-template\` at a chosen place and passes it a **context** (data). It is the mechanism for reusing template fragments and customizing components: the template comes from outside, the component decides where to draw it.
3. **\`ngComponentOutlet\`** — declaratively renders a **component by its class**, chosen dynamically, without a manual \`ViewContainerRef.createComponent\`. It supports inputs, a custom injector and content projection (Angular 16.2+).

## Example

\`\`\`html
<!-- 1. grouping with no extra DOM -->
<ng-container *ngIf="user as u">
  <h2>{{ u.name }}</h2>
</ng-container>

<!-- 2. stamp plus ink -->
<ng-template #row let-item let-i="index">{{ i }}: {{ item }}</ng-template>
<ng-container
  [ngTemplateOutlet]="row"
  [ngTemplateOutletContext]="{ $implicit: data, index: 0 }" />

<!-- 3. socket: the component class comes from data -->
<ng-container
  [ngComponentOutlet]="widgetClass"
  [ngComponentOutletInputs]="{ title: 'Hi' }" />
\`\`\`

Why it looks like this: the \`$implicit\` key of the context maps to the **unnamed** \`let-item\` — a convention meaning "the main value". Every other key is picked up by name: \`let-i="index"\`.

## When to use which

- **\`ng-container\`** — when you need structural grouping and an extra \`<div>\` would break the layout (grid, flex, \`<tr>\`/\`<td>\`, \`<select>\`).
- **\`ngTemplateOutlet\`** — when a component should let the consumer **swap a piece of markup** while the component still owns the data. The "slot with data" pattern: a table hands out the row and index, the consumer decides how to draw it.
- **\`ngComponentOutlet\`** — when the **component class itself** is unknown while writing the template: dashboards with configurable widgets, plugins, CMS blocks, rendering by a type coming from the backend.

## What to say in the interview

> \`ng-container\` is a logical grouping node that produces no DOM element; you use it to attach a structural directive or group markup without a redundant \`div\`, including the case where you need two structural directives but cannot put them on one element. \`ngTemplateOutlet\` renders a given \`TemplateRef\` at a chosen point and passes a context through \`ngTemplateOutletContext\`, where the \`$implicit\` key corresponds to the unnamed \`let\` variable — that is the basis of the "slot with data" pattern and of customizable components. \`ngComponentOutlet\` does the same for components: it declaratively instantiates a component from a class chosen at runtime, supports \`ngComponentOutletInputs\`, a custom injector and content projection since Angular 16.2, and replaces a manual \`ViewContainerRef.createComponent\`. In practice: \`ng-container\` is about structure, \`ngTemplateOutlet\` about reusing markup, \`ngComponentOutlet\` about picking a component dynamically.

## Gotchas

- **An \`ng-template\` renders nothing on its own.** Declare it and forget to output it and the screen stays blank with no error. A classic phantom bug.
- **\`$implicit\` is the only unnamed one.** \`let-item\` with no \`=\` picks exactly that; everything else is by name.
- **The context is untyped by default** — for strict typing you need an \`ngTemplateContextGuard\` in your own directive.
- **Two structural directives on one element** is a compile error; they will ask how to work around it (answer: \`ng-container\`).
- **\`ngComponentOutlet\` needs a standalone component** (or a correct injector) and does not hand you the instance — if you need the instance, use \`ViewContainerRef.createComponent\`.
- They will ask about **modern control flow**: \`@if\`/\`@for\` often remove the need for \`ng-container\` around conditions, but for grouping and for outlets it is still required.`,
    },
    codeSnippet: `<ng-template #cell let-value let-col="col">{{ col }}: {{ value }}</ng-template>

<ng-container
  *ngFor="let row of rows"
  [ngTemplateOutlet]="cell"
  [ngTemplateOutletContext]="{ $implicit: row.value, col: row.col }" />`,
  },
  {
    id: 'ng-043',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['structural-directives', 'microsyntax', 'template-ref'],
    question: {
      ru: 'Как написать кастомную структурную директиву и как разворачивается её микросинтаксис?',
      en: 'How do you write a custom structural directive, and how does its microsyntax desugar?',
    },
    answer: {
      ru: `## В чём суть

Структурная директива — это директива, которая **сама решает, появится ли кусок разметки в DOM и сколько раз**. Звёздочка в \`*appUnless="cond"\` — просто сокращение: компилятор заворачивает элемент в \`ng-template\`, а директива получает «чертёж» (\`TemplateRef\`) и «место для стройки» (\`ViewContainerRef\`) и по своей логике создаёт или удаляет копии. Микросинтаксис — мини-язык внутри звёздочки (\`let item of items; trackBy: fn\`), который компилятор по формальным правилам превращает в обычные inputs и \`let\`-переменные.

Аналогия: у вас есть **чертёж дома** (\`TemplateRef\`) и **пустой участок** (\`ViewContainerRef\`). Директива — прораб: смотрит на условие и решает, построить дом, снести его или поставить десять одинаковых домов в ряд. Сам чертёж на участке не стоит — это только инструкция.

**Какую проблему решает.** Встроенных \`@if\`/\`@for\` хватает для простых условий и циклов, но в реальном приложении много повторяющейся логики «показывать или нет»: по ролям пользователя, по фиче-флагам, по размеру экрана, «показать скелетон, пока грузится». Если писать её условиями в каждом шаблоне, логика размазывается и дублируется. Своя структурная директива упаковывает её в одно место: \`<button *appHasRole="'admin'">\` читается как предложение, а проверка ролей живёт в одном классе.

## Словарик терминов

- **Структурная директива** — директива, которая добавляет и удаляет фрагменты DOM, а не меняет атрибуты одного элемента (как атрибутная директива).
- **\`ng-template\`** — описание разметки, которое само не рисуется; звёздочка неявно создаёт именно его.
- **\`TemplateRef\`** — ссылка на этот чертёж; структурная директива получает её через \`inject(TemplateRef)\`.
- **\`ViewContainerRef\`** — точка вставки рядом с шаблоном; умеет \`createEmbeddedView\`, \`clear\`, \`remove\`, \`move\`, знает \`length\`.
- **Встроенное представление (embedded view, \`EmbeddedViewRef\`)** — один отрисованный экземпляр шаблона со своими DOM-узлами, привязками и контекстом.
- **Контекст и \`$implicit\`** — объект с данными для экземпляра; \`$implicit\` — значение «по умолчанию», которое получает \`let x\` без имени.
- **Микросинтаксис (microsyntax)** — язык внутри \`*директивы="..."\`: выражение, ключи вроде \`of\`/\`trackBy\`, \`let\`-объявления и \`as\`.
- **Input-сеттер / signal input** — способ принять значение: классический \`@Input() set name(v)\` или \`name = input()\` плюс \`effect\`.
- **\`effect\`** — функция Angular, которая перезапускается, когда меняются прочитанные в ней сигналы.
- **Type guard (\`ngTemplateGuard_…\`, \`ngTemplateContextGuard\`)** — статические подсказки для компилятора шаблонов: как сужать типы внутри шаблона директивы.
- **\`strictTemplates\`** — режим строгой проверки типов в шаблонах; именно в нём работают type guards.

## Как это работает под капотом

1. Вы пишете \`<h3 *appUnless="cond">текст</h3>\`. Компилятор переносит атрибут со звёздочкой на неявный \`ng-template\`, а сам \`h3\` кладёт внутрь: \`<ng-template [appUnless]="cond"><h3>текст</h3></ng-template>\`.
2. Селектор директивы \`[appUnless]\` совпадает с атрибутом на \`ng-template\`, поэтому Angular создаёт директиву на шаблоне, а не на \`h3\`. В DOM на месте шаблона остаётся только комментарий-якорь.
3. Через DI директива получает \`TemplateRef\` (содержимое шаблона) и \`ViewContainerRef\` (место рядом с якорем). Даже \`ElementRef\` здесь — это комментарий \`<!--container-->\`, а не \`h3\`.
4. Значение из \`*appUnless="cond"\` приходит в input **с тем же именем**, что и селектор, — \`appUnless\`. Angular вызывает сеттер при каждом изменении значения привязки.
5. В сеттере директива решает: \`vcr.createEmbeddedView(tpl, context)\` — построить экземпляр, \`vcr.clear()\` — снести все. Созданные представления Angular проверяет вместе с родительским шаблоном.
6. Когда директива уничтожается (например, родительский компонент ушёл со страницы), контейнер уничтожает все свои представления — вручную чистить не нужно.

### Как разворачивается микросинтаксис

Это реальный вывод парсера шаблонов Angular 21 (\`parseTemplate\` из \`@angular/compiler\`):

\`\`\`text
<p *appUnless="cond">
  => <ng-template [appUnless]="cond">

<li *ngFor="let item of items; let i = index; trackBy: trackById">
  => <ng-template ngFor [ngForOf]="items" [ngForTrackBy]="trackById" let-item="$implicit" let-i="index">

<li *ngFor="let item of items as list; index as i; let last = last">
  => <ng-template ngFor [ngForOf]="items" let-item="$implicit" let-list="ngForOf" let-i="index" let-last="last">

<div *ngIf="user$ | async as user; else loading">
  => <ng-template [ngIf]="user$ | async" [ngIfElse]="loading" let-user="ngIf">

<div *appRole="'admin'; else denied">
  => <ng-template [appRole]="'admin'" [appRoleElse]="denied">

<div *appRepeat="let n of 3">
  => <ng-template appRepeat [appRepeatOf]="3" let-n="$implicit">

<div *ngIf="a" *ngFor="let x of xs">
  => ошибка: Can't have multiple template bindings on one element. Use only one attribute prefixed with *
\`\`\`

Правила, которые отсюда видны:

1. Первое выражение после имени идёт в input с именем директивы: \`cond\` → \`[appUnless]\`.
2. Ключ (\`of\`, \`trackBy\`, \`else\`) склеивается с именем директивы с заглавной буквы: \`of\` → \`ngForOf\`, \`else\` → \`appRoleElse\`. Двоеточие после ключа необязательно.
3. \`let x\` без значения берёт \`$implicit\` из контекста, \`let i = index\` и \`index as i\` — поле \`index\`.
4. \`выражение as имя\` сохраняет значение input в переменную: \`as user\` → \`let-user="ngIf"\`, поэтому директива должна положить это значение в контекст под ключом \`ngIf\`.
5. Разделители \`;\` и \`,\` необязательны, но улучшают читаемость.

### Пример 1. \`appUnless\`: сеттер и флаг «уже создано»

\`\`\`ts
@Directive({ selector: '[appUnless]' })
export class UnlessDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private hasView = false;

  @Input() set appUnless(cond: unknown) {
    if (!cond && !this.hasView) {
      this.vcr.createEmbeddedView(this.tpl);
      this.hasView = true;
    } else if (cond && this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
\`\`\`

\`\`\`html
<p *appUnless="hidden()">visible {{ other() }}</p>
<!-- старт:              "visible 0", создано представлений: 1
     other.set(1):       "visible 1", создано: 1  (текст обновился, представление то же)
     hidden.set(true):   p нет в DOM
     hidden.set(false):  "visible 1", создано: 2 -->
\`\`\`

Флаг нужен, потому что сеттер вызывается при любом изменении значения, а значение может смениться с \`0\` на \`false\` или с \`null\` на \`''\` — оба «ложные». Без флага директива уничтожала бы и создавала представление заново, теряя фокус, введённый текст и состояние дочерних компонентов.

### Пример 2. \`appRepeat\` из \`codeSnippet\` и цена пересоздания

\`\`\`ts
@Directive({ selector: '[appRepeat]' })
export class RepeatDirective {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set appRepeat(count: number) {
    this.vcr.clear();
    for (let i = 0; i < count; i++) {
      this.vcr.createEmbeddedView(this.tpl, { $implicit: i });
    }
  }
}
\`\`\`

\`\`\`html
<input *appRepeat="n(); let i" [value]="i" />
<!-- n = 2: два поля со значениями 0, 1
     пользователь ввёл "typed" в первое поле, затем n.set(3):
     поля: 0, 1, 2   ← введённый текст пропал: все представления пересозданы -->
\`\`\`

Директива из \`codeSnippet\` корректна, но на каждое изменение сносит всё и строит заново. Для трёх кнопок это не важно, для списка полей ввода — заметная потеря состояния.

### Пример 3. Signal input, \`effect\` и инкрементальное обновление

\`\`\`ts
@Directive({ selector: '[appRepeat]' })
export class RepeatDirective {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  appRepeat = input.required<number>();

  constructor() {
    effect(() => {
      const count = this.appRepeat();
      while (this.vcr.length < count) {
        this.vcr.createEmbeddedView(this.tpl, { $implicit: this.vcr.length });
      }
      while (this.vcr.length > count) {
        this.vcr.remove(); // без индекса удаляет последнее
      }
    });
  }
}
// тот же сценарий: ввели "typed" в первое поле, n.set(3)
// поля: typed, 1, 2   ← существующие представления сохранились, добавилось одно
\`\`\`

Современная форма: значение приходит через signal input, а \`effect\` перезапускается при его изменении. Главное улучшение — не в сигналах, а в алгоритме: добавляем и удаляем только разницу, как это делает \`@for\` с \`track\`.

### \`ViewContainerRef\` и \`EmbeddedViewRef\`: инструменты прораба

\`\`\`ts
// шаблон: <li *appList="let name">{{ name }}</li>
const ref = this.vcr.createEmbeddedView(this.tpl, { $implicit: 'Anna' });     // Anna
this.vcr.createEmbeddedView(this.tpl, { $implicit: 'Boris' }, { index: 0 }); // Boris, Anna
this.vcr.length;         // 2
this.vcr.indexOf(ref);   // 1
ref.rootNodes;           // [li] — DOM-узлы этого экземпляра
this.vcr.move(ref, 0);   // Anna, Boris — переставили без пересоздания
this.vcr.remove(1);      // Anna — удалили по индексу (без индекса удаляется последнее)
this.vcr.clear();        // пусто — удалили все
\`\`\`

Сигнатура в Angular 21: \`createEmbeddedView(templateRef, context?, { index?, injector? })\`. Третий аргумент позволяет вставить экземпляр в нужную позицию и дать ему свой инжектор. Возвращаемый \`EmbeddedViewRef\` содержит \`rootNodes\` (DOM-узлы), \`context\` и \`destroy()\`.

### Пример 4. \`as\` и контекст: директива \`appLet\`

\`\`\`ts
interface LetContext<T> { $implicit: T; appLet: T; }

@Directive({ selector: '[appLet]' })
export class LetDirective<T> {
  private tpl = inject(TemplateRef<LetContext<T>>);
  private vcr = inject(ViewContainerRef);
  private ctx = { $implicit: null as T, appLet: null as T };
  private created = false;

  @Input() set appLet(value: T) {
    this.ctx.$implicit = this.ctx.appLet = value; // меняем контекст, а не пересоздаём
    if (!this.created) {
      this.vcr.createEmbeddedView(this.tpl, this.ctx);
      this.created = true;
    }
  }
}
\`\`\`

\`\`\`html
<p *appLet="total() as t">total={{ t }}, with tax={{ t * 1.2 }}</p>
<!-- price = 10, qty = 3: total=30, with tax=36
     qty.set(5):          total=50, with tax=60 -->
\`\`\`

\`as t\` превращается в \`let-t="appLet"\`, поэтому значение кладётся в контекст под ключом с именем директивы — так же устроен \`ngIf\`. Контекст — обычный объект: директива меняет его поля, и при следующей проверке изменений шаблон показывает новые значения. Сегодня для этой задачи есть встроенный \`@let t = total();\` (Angular 18.1+), но директива \`appLet\` встречается в легаси-коде и хорошо показывает механику \`as\`.

### \`ngTemplateGuard_\` и \`ngTemplateContextGuard\`: типы внутри шаблона

\`\`\`ts
interface IfCtx<T> { $implicit: T; }

@Directive({ selector: '[appIf]' })
export class IfDirective<T> {
  private tpl = inject(TemplateRef<IfCtx<T>>);
  private vcr = inject(ViewContainerRef);
  @Input() set appIf(v: T) {
    this.vcr.clear();
    if (v) this.vcr.createEmbeddedView(this.tpl, { $implicit: v });
  }
  static ngTemplateGuard_appIf: 'binding';
  static ngTemplateContextGuard<T>(dir: IfDirective<T>, ctx: unknown): ctx is IfCtx<NonNullable<T>> {
    return true;
  }
}
\`\`\`

\`\`\`html
<!-- user: User | null, strictTemplates: true; appIfPlain — та же директива без guards -->
<p *appIfPlain="user">{{ user.name }}</p>       <!-- error TS2531: Object is possibly 'null'. -->
<p *appIfPlain="user; let u">{{ u.length }}</p> <!-- ошибки нет: u имеет тип any -->
<p *appIf="user">{{ user.name }}</p>            <!-- ок: тип сужен до User -->
<p *appIf="user; let u">{{ u.length }}</p>      <!-- error TS2339: Property 'length' does not exist on type 'User'. -->
\`\`\`

\`ngTemplateGuard_appIf: 'binding'\` говорит компилятору: «внутри шаблона считай выражение из input истинным» — так \`*ngIf="user"\` убирает \`null\`. \`ngTemplateContextGuard\` описывает тип контекста, чтобы \`let u\` получил тип \`User\`, а не \`any\`. Без guards компилятор шаблонов ничего не знает о логике директивы. Это проверено компиляцией через \`ngc\` с \`strictTemplates\`.

### Где это применяется на практике

- **Права доступа**: \`*appHasRole="'admin'; else readOnly"\` — кнопки и разделы видны только нужным ролям, а логика проверки одна на всё приложение.
- **Фиче-флаги**: \`*appFeature="'new-grid'"\` подписывается на сервис флагов и включает фичу без правок шаблонов.
- **Адаптивность**: \`*appBreakpoint="'mobile'"\` рисует разный DOM для телефона и десктопа, а не просто прячет его через CSS.
- **Виртуальный скролл**: \`*cdkVirtualFor\` из Angular CDK — структурная директива, которая держит в DOM только видимые строки огромного списка.
- **Скелетоны и состояния загрузки**: \`*appLoading="isLoading(); skeleton: rowsSkeleton"\` показывает заглушку вместо контента.

## Важные нюансы и подводные камни

- **Одна структурная директива на элемент.** Две звёздочки — ошибка компиляции; обход — \`ng-container\` или вложенный элемент.
- **Пересоздание представлений стоит дорого.** Потеря фокуса, введённого текста, позиции скролла и состояния дочерних компонентов. Держите флаг «уже создано» или обновляйте только разницу.
- **Имя главного input обязано совпадать с селектором.** Для \`*appUnless\` это \`appUnless\`, для ключа \`else\` — \`appUnlessElse\`; иначе значение молча не придёт.
- **Забытый type guard** — внутри шаблона тип не сузится, и \`strictTemplates\` начнёт ругаться на \`possibly null\`; забытый context guard — переменные будут \`any\`.
- **\`ElementRef\` в структурной директиве — комментарий-якорь.** Чтобы добраться до DOM экземпляра, используйте \`EmbeddedViewRef.rootNodes\`.
- **\`@if\`/\`@for\` — не директивы.** Это синтаксис, встроенный в компилятор: их нельзя расширить, унаследовать или подключить через \`imports\`. Своя логика показа — по-прежнему своя структурная директива.
- **Директивы \`NgIf\`, \`NgForOf\` и \`NgSwitch\` устарели с Angular 20** (их звёздочные формы в шаблонах), удаление запланировано на v22. Механизм структурных директив при этом не устарел: свои директивы и \`*ngTemplateOutlet\` работают как раньше.
- **\`createEmbeddedView\` с контекстом.** Второй аргумент — объект контекста, где \`$implicit\` доступен как безымянный \`let x\`; менять поля контекста дешевле, чем пересоздавать представление.
- **Представления, созданные через \`templateRef.createEmbeddedView()\` без контейнера**, Angular не уничтожит сам — их нужно \`destroy()\` вручную.

**Плюсы:** логика показа упакована в одном месте и читается в шаблоне как предложение; полный контроль над созданием, порядком и переиспользованием представлений; с guards — строгая типизация.
**Минусы:** легко потерять состояние пересозданием; нужно помнить правила микросинтаксиса и имена inputs; одна директива на элемент; без guards типы в шаблоне превращаются в \`any\`.

## Как это спрашивают на собеседовании

**Главный вывод:** звёздочка — сахар над \`ng-template\`: директива получает \`TemplateRef\` и \`ViewContainerRef\` и сама вызывает \`createEmbeddedView\` или \`clear\`. Микросинтаксис разворачивается по правилам: первое выражение — в input с именем директивы, ключи склеиваются в \`директиваКлюч\`, \`let\` и \`as\` берут поля из контекста; типы в шаблоне дают \`ngTemplateGuard_\` и \`ngTemplateContextGuard\`.

Типичные формулировки: «Напишите свой \`*appUnless\`», «Во что компилятор превращает \`*ngFor="let item of items; let i = index"\`?», «Как работает \`as\` в \`*ngIf="user$ | async as user"\`?».

Что могут спросить следом:

- *Почему нельзя две звёздочки на элементе?* — Каждая создаёт свой \`ng-template\` вокруг элемента, и компилятору неясно, какой из них внешний.
- *Откуда \`index\` в \`*ngFor\`?* — Из контекста, который \`NgForOf\` передаёт в \`createEmbeddedView\`: \`$implicit\`, \`index\`, \`first\`, \`last\`, \`even\`, \`odd\`, \`count\`.
- *Как директиве поддержать \`else\`?* — Добавить input \`appUnlessElse: TemplateRef\` и рисовать его, когда основной шаблон скрыт.
- *Зачем \`ngTemplateGuard_\`?* — Чтобы компилятор сузил тип выражения внутри шаблона, как у \`ngIf\`.
- *Можно ли использовать signal inputs?* — Да: \`input.required()\` плюс \`effect\`, который создаёт и удаляет представления.

### Ответ на 1 минуту

> Структурная директива управляет тем, появится ли кусок разметки и сколько раз. Звёздочка — это сахар: компилятор превращает \`<h3 *appUnless="cond">\` в \`ng-template\` с \`[appUnless]="cond"\`, а сам элемент уезжает внутрь шаблона. Директива инжектит \`TemplateRef\` — чертёж — и \`ViewContainerRef\` — место вставки, и в сеттере input с тем же именем, что и селектор, вызывает \`createEmbeddedView\` или \`clear\`, держа флаг, чтобы не пересоздавать представление зря. Микросинтаксис разворачивается по правилам: первое выражение идёт в главный input, ключи вроде \`of\` и \`trackBy\` склеиваются в \`ngForOf\` и \`ngForTrackBy\`, \`let x\` берёт \`$implicit\` из контекста, а \`as\` — поле с именем директивы. Для строгой типизации добавляю статические \`ngTemplateGuard_\` и \`ngTemplateContextGuard\`. Использую это для прав доступа и фиче-флагов, помня, что \`@if\` и \`@for\` — не директивы и расширить их нельзя.`,
      en: `## In short

A structural directive is code that **decides for itself whether markup appears in the DOM** (and how many times). The asterisk \`*\` is just **shorthand**: the compiler expands it into an \`ng-template\`.

Analogy: you have a **house blueprint** (\`TemplateRef\`) and an **empty plot of land** (\`ViewContainerRef\`). The directive is the foreman: it looks at the condition and decides whether to build the house on that plot, demolish it, or put up ten copies.

## How it works, step by step

1. You write \`<div *appUnless="cond">\`.
2. The compiler **desugars** it into an \`ng-template\` wrapper — the \`div\` moves inside it and is not in the DOM yet.
3. Through DI the directive receives a \`TemplateRef\` (the blueprint — the template content) and a \`ViewContainerRef\` (the insertion point — the plot).
4. The value from \`*appUnless="cond"\` arrives in the **identically named input** — the \`appUnless\` setter.
5. In that setter you decide: \`vcr.createEmbeddedView(tpl)\` to build, \`vcr.clear()\` to demolish.
6. Angular destroys the created views automatically when the host is destroyed.

The desugared form looks like this:

\`\`\`html
<ng-template appUnless [appUnless]="cond">
  <div></div>
</ng-template>
\`\`\`

## Example

\`\`\`ts
@Directive({ selector: '[appUnless]' })
export class UnlessDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private created = false;

  @Input() set appUnless(cond: boolean) {
    if (!cond && !this.created) {
      this.vcr.createEmbeddedView(this.tpl);
      this.created = true;
    } else if (cond && this.created) {
      this.vcr.clear();
      this.created = false;
    }
  }
}
\`\`\`

Why it looks like this: the \`created\` flag exists so the view is **not recreated** on every identical value — otherwise the markup would die and be reborn on each update, losing focus and state.

## Microsyntax and typing

\`*ngFor="let item of items; let i = index; trackBy: fn"\` desugars by formal rules:

- The first word after \`*\` is the **directive name** and simultaneously its primary input.
- Keywords (\`of\`, \`as\`, arbitrary suffixes) are concatenated with the directive name into input names: \`of\` → \`ngForOf\`, \`trackBy\` → \`ngForTrackBy\`.
- \`let x = expr\` does not create an input — it declares a **local variable from the embedded view context** (\`index\`, \`first\`, \`even\`, and so on).
- \`as\` stores the result of an expression in a template variable.

For strict typing inside the template you add static **type guards** to the directive: \`ngTemplateGuard_<inputName>\` and \`ngTemplateContextGuard\`. They are precisely why \`*ngIf="user"\` narrows the type to non-null inside the template — without them the template compiler knows nothing about your condition.

## What to say in the interview

> The asterisk on a structural directive is syntactic sugar: the compiler expands \`<div *appUnless="cond">\` into \`<ng-template appUnless [appUnless]="cond">\` with that \`div\` inside. The directive itself injects \`TemplateRef\` — the template content — and \`ViewContainerRef\` — the insertion point — and in the setter of its primary input decides whether to call \`createEmbeddedView\` or \`clear\`. Microsyntax desugars by rules: the first word after the asterisk is the directive name and its primary input, keywords like \`of\` and \`trackBy\` concatenate into \`ngForOf\` and \`ngForTrackBy\`, and \`let x = expr\` creates a local variable from the embedded view context. To make types narrow inside the template the way \`ngIf\` does, you add the static \`ngTemplateGuard_\` and \`ngTemplateContextGuard\`.

## Gotchas

- **One structural directive per element.** Two is a compile error; work around it with \`ng-container\`.
- **Recreating the view on every update** loses focus, scroll position and child component state. Keep an "already created" flag.
- **Forgetting the type guard** means no narrowing inside the template, and strict template checking starts complaining about \`possibly null\`.
- **The input name must match the selector**: for \`*appUnless\` the primary input must be called \`appUnless\`, otherwise the value never arrives.
- **\`@if\`/\`@for\` do not replace everything**: they are built into the compiler and are not directives, so you cannot extend them. Custom logic still means a structural directive.
- They will ask about **\`createEmbeddedView\` with a context**: the second argument is the context object, where \`$implicit\` is available as the unnamed \`let-x\`.`,
    },
    codeSnippet: `@Directive({ selector: '[appRepeat]' })
export class RepeatDirective {
  private tpl = inject(TemplateRef<{ $implicit: number }>);
  private vcr = inject(ViewContainerRef);
  @Input() set appRepeat(count: number) {
    this.vcr.clear();
    for (let i = 0; i < count; i++) {
      this.vcr.createEmbeddedView(this.tpl, { $implicit: i });
    }
  }
}`,
  },
  {
    id: 'ng-044',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['animations', 'triggers', 'keyframes'],
    question: {
      ru: 'Как устроены анимации @angular/animations: триггеры, состояния, переходы и keyframes?',
      en: 'How do @angular/animations work: triggers, states, transitions and keyframes?',
    },
    answer: {
      ru: `## В чём суть

\`@angular/animations\` описывает анимации как **машину состояний** прямо в метаданных компонента: вы перечисляете, в каких состояниях бывает элемент (\`state\` + \`style\`), как он переходит между ними (\`transition\` + \`animate\`), и даёте всему этому имя (\`trigger\`). Дальше вы только меняете значение в шаблоне, а Angular сам находит нужный переход и проигрывает его через Web Animations API браузера. Важная новость для собеседования: с Angular 20.2 весь этот пакет помечен устаревшим (удаление запланировано на v23), а на смену пришли встроенные \`animate.enter\` и \`animate.leave\` плюс обычный CSS. Но спрашивать про триггеры будут ещё долго — ими полон существующий код.

Аналогия — **дверь**. У неё два положения: «закрыта» и «открыта», у каждого свой вид (\`state\` + \`style\`). То, как именно она поворачивается — за сколько миллисекунд и с каким ускорением, — это \`transition\`. Выключатель на стене, которым вы этим управляете, — \`trigger\`. А \`keyframes\` — раскадровка мультфильма: промежуточные кадры движения.

**Какую проблему решает.** Чистый CSS хорошо анимирует смену класса, но плохо справляется с тремя вещами. Первая — появление и удаление элемента: когда \`@if\` убирает элемент, он исчезает из DOM мгновенно, и анимации ухода просто негде проиграться. Вторая — высота «до содержимого»: \`height: auto\` в CSS не анимируется. Третья — координация: «пусть строки списка появляются волной по одной». Angular-анимации решали все три: откладывали удаление элемента до конца анимации, измеряли реальную высоту и умели запускать анимации дочерних элементов с задержкой.

## Словарик терминов

- **\`trigger(name, [...])\`** — именованный набор состояний и переходов; в шаблоне привязывается к элементу как \`[@name]="выражение"\`.
- **\`state(name, style)\`** — именованное состояние и стиль, который элемент сохраняет, пока находится в нём.
- **\`style({...})\`** — набор CSS-свойств в виде объекта: \`{ height: '0', opacity: 0 }\`.
- **\`transition(expr, steps)\`** — правило «при смене состояния A на B проиграй вот это»; \`<=>\` — в обе стороны, \`*\` — любое состояние.
- **\`animate(timings, style?)\`** — сама анимация: длительность, задержка и функция плавности (\`'300ms ease-in-out'\`).
- **\`void\`** — особое состояние «элемента нет в DOM»; \`:enter\` — то же, что \`void => *\`, \`:leave\` — \`* => void\`.
- **Звёздочка в стиле (\`AUTO_STYLE\`)** — значение \`'*'\`, «текущее вычисленное значение»: Angular измерит реальную высоту и подставит её.
- **\`keyframes([...])\`** — промежуточные кадры с \`offset\` от 0 до 1.
- **\`query\` / \`stagger\`** — найти дочерние элементы внутри анимируемого и запустить их анимации с задержкой друг за другом.
- **Web Animations API** — встроенный в браузер API \`element.animate(keyframes, options)\`, через который Angular проигрывает анимации.
- **\`provideAnimationsAsync()\`** — провайдер, который подключает движок анимаций с ленивой загрузкой его кода; \`provideNoopAnimations()\` — «пустой» движок для тестов.
- **\`animate.enter\` / \`animate.leave\`** — встроенный в шаблоны Angular 20.2+ механизм: добавить CSS-класс при появлении или удалении элемента и дождаться конца CSS-анимации.
- **\`prefers-reduced-motion\`** — медиа-запрос: пользователь попросил систему минимизировать анимации.

## Как это работает под капотом

1. \`trigger(...)\`, \`state(...)\`, \`transition(...)\` — не код анимации, а просто данные. Функции возвращают обычные объекты, которые компилятор кладёт в определение компонента.
2. \`provideAnimationsAsync()\` подменяет рендерер на анимационный: все вставки и удаления DOM-узлов и привязки \`[@trigger]\` теперь проходят через движок анимаций. Сам движок грузится отдельным чанком, а пока он не загружен, анимации не проигрываются.
3. На каждой проверке изменений движок сравнивает прошлое и новое значение привязки \`[@open]="..."\`. Значение превращается в имя состояния; при первом появлении элемента прошлое состояние — \`void\`.
4. Движок перебирает \`transition\` триггера **по порядку** и берёт первый подходящий: \`closed => open\`, \`closed <=> open\`, \`* => open\`, \`:enter\` и так далее.
5. Строится «таймлайн»: начальные стили берутся из текущего состояния, конечные — из целевого \`state\`. Значения \`'*'\` вычисляются по факту: Angular читает реальные размеры элемента.
6. Анимация проигрывается через \`element.animate()\` браузера. По окончании элемент получает стили конечного \`state\`, а Angular вызывает колбэки \`(@open.done)\`.
7. Если переход ведёт в \`void\` (\`:leave\`), Angular **не удаляет** элемент сразу: он остаётся в DOM, пока анимация не закончится, и только потом удаляется.

Вот как выглядит триггер изнутри — это реальный вывод \`JSON.stringify(trigger(...))\`:

\`\`\`ts
trigger('open', [
  state('closed', style({ height: '0', opacity: 0 })),
  state('open', style({ height: '*', opacity: 1 })),
  transition('closed <=> open', animate('300ms ease-in-out')),
]);
// {"type":7,"name":"open","definitions":[
//   {"type":0,"name":"closed","styles":{"type":6,"styles":{"height":"0","opacity":0},"offset":null}},
//   {"type":0,"name":"open","styles":{"type":6,"styles":{"height":"*","opacity":1},"offset":null}},
//   {"type":1,"expr":"closed <=> open","animation":{"type":4,"styles":null,"timings":"300ms ease-in-out"},"options":null}
// ],"options":{}}
// AUTO_STYLE === '*'
\`\`\`

### \`trigger\`, \`state\`, \`style\`, \`transition\`, \`animate\`: раскрывающаяся панель

\`\`\`ts
@Component({
  selector: 'app-panel',
  template: \`
    <button (click)="isOpen.set(!isOpen())">toggle</button>
    <div [@open]="isOpen() ? 'open' : 'closed'"
         (@open.start)="log($event)" (@open.done)="log($event)">panel</div>\`,
  animations: [
    trigger('open', [
      state('closed', style({ height: '0', opacity: 0 })),
      state('open', style({ height: '*', opacity: 1 })),
      transition('closed <=> open', animate('300ms ease-in-out')),
    ]),
  ],
})
export class Panel {
  isOpen = signal(false);
  log(e: AnimationEvent) {
    console.log(\`\${e.triggerName}.\${e.phaseName}: \${e.fromState} -> \${e.toState}\`);
  }
}
// при первом рендере:
// open.start: void -> closed
// open.done: void -> closed
// клик (isOpen = true):
// open.start: closed -> open
// open.done: closed -> open
\`\`\`

При первом рендере переход идёт из \`void\`: подходящего \`transition\` нет, поэтому элемент сразу встаёт в \`closed\` без анимации, но колбэки всё равно вызываются. Дальше каждый клик меняет строку \`'open'\`/\`'closed'\`, и движок проигрывает \`closed <=> open\`. \`height: '*'\` — главная фишка: Angular измерит реальную высоту контента, чего чистым CSS с \`height: auto\` не сделать. Объект \`AnimationEvent\` в колбэке содержит \`triggerName\`, \`phaseName\` (\`start\`/\`done\`), \`fromState\`, \`toState\` и \`totalTime\`.

### \`:enter\` и \`:leave\`: появление и удаление элемента

\`\`\`ts
trigger('fade', [
  transition(':enter', [style({ opacity: 0 }), animate('200ms')]),
  transition(':leave', animate('200ms', style({ opacity: 0 }))),
])
\`\`\`

\`\`\`html
@if (show()) { <p @fade (@fade.start)="log($event)">toast</p> }
<!-- появление:      fade.start: void -> null
     show.set(false): fade.start: null -> void   (элемент остаётся в DOM 200 мс, потом удаляется) -->
\`\`\`

\`@fade\` без значения даёт состояние \`null\`, нам и не нужно другое — важен только факт появления и исчезновения. В \`:enter\` первый \`style({ opacity: 0 })\` задаёт стартовую точку, а \`animate('200ms')\` без стиля анимирует к «естественному» состоянию элемента. В \`:leave\`, наоборот, анимируем к \`opacity: 0\`, и удаление элемента ждёт конца анимации.

### \`:increment\` и \`:decrement\`: числовые значения

\`\`\`ts
trigger('slide', [
  transition(':increment', [style({ transform: 'translateX(100%)' }), animate('200ms')]),
  transition(':decrement', [style({ transform: 'translateX(-100%)' }), animate('200ms')]),
])
// <span [@slide]="page()">{{ page() }}</span>
// page.set(2): slide.start: 1 -> 2   — сработал :increment, слайд въезжает справа
\`\`\`

Срабатывают, когда числовое значение выросло или уменьшилось — удобно для каруселей, пагинации и счётчиков.

### \`keyframes\`: промежуточные кадры

\`\`\`ts
trigger('flash', [
  transition(':enter', [
    animate('600ms', keyframes([
      style({ background: 'yellow', offset: 0 }),
      style({ background: 'orange', offset: 0.5 }),
      style({ background: 'transparent', offset: 1 }),
    ])),
  ]),
])
// новая строка таблицы: жёлтая → через 300 мс оранжевая → к 600 мс прозрачная
\`\`\`

Это пример из \`codeSnippet\`: подсветка только что добавленной записи. \`offset\` — доля от общей длительности: \`0.5\` от 600 мс — это 300 мс. Без \`offset\` кадры распределяются равномерно.

### \`query\` и \`stagger\`: волна вместо вспышки

\`\`\`ts
trigger('list', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0 }),
      stagger(50, animate('200ms', style({ opacity: 1 }))),
    ], { optional: true }),
  ]),
])
// <ul [@list]="items().length"> @for (i of items(); track i) { <li>{{ i }}</li> } </ul>
\`\`\`

Триггер стоит на \`ul\`, значение — длина списка, поэтому любой новый элемент запускает переход. \`query(':enter')\` находит только что добавленные \`li\`, а \`stagger(50, ...)\` запускает их анимации с шагом 50 мс. Без \`{ optional: true }\` при пустом результате (например, все элементы удалили) Angular бросает ошибку:

\`\`\`text
NG03014: \`query(":enter")\` returned zero elements. (Use \`query(":enter", { optional: true })\` if you wish to allow this.)
\`\`\`

### \`group\`, \`sequence\`, \`animateChild\`, \`animation\`/\`useAnimation\`

\`\`\`ts
// параллельно и последовательно
transition(':enter', [
  style({ opacity: 0, transform: 'scale(0.9)' }),
  group([
    animate('200ms', style({ opacity: 1 })),
    animate('300ms ease-out', style({ transform: 'scale(1)' })),
  ]),
]);
// по умолчанию шаги в массиве идут как sequence — друг за другом

// анимации детей с собственными триггерами (иначе родитель их блокирует)
transition('* => *', [query('@*', animateChild(), { optional: true })]);

// переиспользуемая анимация с параметрами
export const fadeIn = animation([style({ opacity: 0 }), animate('{{ time }}')], { params: { time: '200ms' } });
transition(':enter', useAnimation(fadeIn, { params: { time: '500ms' } }));
\`\`\`

\`group\` запускает шаги одновременно, \`sequence\` — по очереди. \`animateChild\` нужен, когда у родителя и детей свои триггеры: без него анимация родителя «глушит» анимации детей. \`animation\` + \`useAnimation\` — библиотека анимаций дизайн-системы с параметрами.

### Отключение: \`[@.disabled]\`, \`provideNoopAnimations\` и reduced motion

\`\`\`ts
reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// <div [@.disabled]="reduceMotion"> ... все анимации внутри отключены ... </div>

// в тестах:
providers: [provideNoopAnimations()] // колбэки .start/.done вызываются, но без реального проигрывания
\`\`\`

Анимации движения могут вызывать дискомфорт у части пользователей, поэтому их нужно уметь выключать по системной настройке.

### Современная замена: \`animate.enter\` и \`animate.leave\`

\`\`\`html
@if (show()) {
  <div class="toast" animate.enter="toast-in" animate.leave="toast-out">Сохранено</div>
}
\`\`\`

\`\`\`css
.toast-in  { animation: slide-in 200ms ease-out; }
.toast-out { animation: fade-out 150ms ease-in forwards; }
@keyframes slide-in { from { transform: translateY(20px); opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .toast-in, .toast-out { animation: none; }
}
\`\`\`

Как это работает в Angular 21: при появлении элемента Angular добавляет класс \`toast-in\` и снимает его, когда закончится самая длинная CSS-анимация или переход. При удалении добавляет \`toast-out\`, ждёт \`animationend\`/\`transitionend\` и только потом удаляет элемент. Если анимации нет (например, её отключило правило reduced motion), элемент удаляется уже на следующем кадре. Для JS-анимаций есть форма с функцией:

\`\`\`ts
// <div (animate.leave)="onLeave($event)">...</div>
onLeave(event: AnimationCallbackEvent) {
  const anim = event.target.animate([{ opacity: 1 }, { opacity: 0 }], 200);
  anim.onfinish = () => event.animationComplete(); // сообщаем Angular: можно удалять
}
\`\`\`

Если забыть вызвать \`animationComplete()\`, элемент удалится по таймауту \`MAX_ANIMATION_TIMEOUT\` — по умолчанию 4000 мс. Это стабильный API (\`@publicApi 20.2\`), он не требует пакета \`@angular/animations\` и провайдеров, и на сервере просто пропускается.

### Где это применяется на практике

- **Раскрывающиеся панели, аккордеоны, фильтры в гриде**: \`height: '*'\` в легаси-коде или \`animate.enter\` с CSS-переходом в новом.
- **Тосты, диалоги, выпадающие меню**: анимация ухода, которая успевает проиграться до удаления элемента.
- **Подсветка изменённых данных** в таблицах и дашбордах: \`keyframes\` для новой строки или обновлённой цены.
- **Анимации переходов между маршрутами**: триггер на контейнере \`router-outlet\` и \`query(':enter, :leave')\` — классика легаси-проектов; в новых проектах для этого есть View Transitions API.
- **Списки и карточки**: \`stagger\` при первой загрузке данных.

## Важные нюансы и подводные камни

- **Пакет устарел.** С Angular 20.2 \`trigger\`, \`state\`, \`transition\`, \`provideAnimations\` и \`provideAnimationsAsync\` помечены \`@deprecated\`, удаление запланировано на v23. Новый код — на \`animate.enter\`/\`animate.leave\` и CSS; старый мигрируют постепенно.
- **\`:leave\` срабатывает, только если элемент удаляет Angular.** Если вы сами убрали узел из DOM или очистили контейнер вручную, откладывать удаление некому.
- **Забыть \`{ optional: true }\` в \`query\`** — ошибка \`NG03014\`, как только искать нечего; она возникает даже на первом рендере пустого списка.
- **Порядок \`transition\` важен.** Берётся первый подходящий переход, поэтому общий \`* => *\` пишут последним.
- **Без провайдера анимации не работают.** Без \`provideAnimationsAsync()\` (или \`provideAnimations()\`) привязка \`[@open]\` даёт ошибку \`NG05105: Unexpected synthetic property @open found\` с подсказкой добавить провайдер.
- **Вес бандла.** Движок \`@angular/animations\` — заметные килобайты; \`provideAnimationsAsync\` выносит его в отдельный чанк. Новый \`animate.enter\` этого веса не добавляет.
- **Автовысота стоит измерения layout.** Чтобы узнать высоту для \`height: '*'\`, браузер пересчитывает раскладку; на длинных списках и одновременных анимациях это заметно.
- **SSR.** На сервере анимации не проигрываются, HTML приходит в конечном состоянии; неудачно выбранное начальное состояние даёт «прыжок» после гидратации.
- **Reduced motion.** Ни старый движок, ни новый механизм не отключают анимации сами — это задача ваших CSS-правил или \`[@.disabled]\`.
- **Зачем вообще, если есть CSS?** Классический ответ: состояния, \`:leave\`, \`stagger\`, анимация к \`height: auto\` и координация с жизненным циклом. Современный ответ: большую часть этого теперь закрывают CSS плюс \`animate.leave\`.

**Плюсы:** декларативная машина состояний; анимация удаления элементов; высота «до контента»; \`stagger\`, \`group\`, \`animateChild\` для сложной хореографии; колбэки \`start\`/\`done\`.
**Минусы:** пакет устарел и будет удалён; заметный вес бандла; отдельный DSL вместо стандартного CSS; сложная отладка вложенных триггеров.

## Как это спрашивают на собеседовании

**Главный вывод:** триггер — именованная машина состояний: \`state\` задаёт стили состояний, \`transition\` + \`animate\` — как между ними переходить, \`void\`, \`:enter\` и \`:leave\` описывают появление и удаление, а \`*\` подставляет вычисленное значение. С Angular 20.2 этот API устарел в пользу \`animate.enter\`/\`animate.leave\` и CSS.

Типичные формулировки: «Как устроены анимации в Angular?», «Как анимировать удаление элемента из \`@if\`?», «Что такое \`void\` и \`*\` в анимациях?».

Что могут спросить следом:

- *Как анимировать до \`height: auto\`?* — В старом API \`style({ height: '*' })\`: Angular измерит высоту; в CSS — через трюки с \`grid-template-rows\` или \`interpolate-size\` там, где браузер его поддерживает.
- *Что такое \`stagger\`?* — Запуск анимаций найденных через \`query\` элементов с задержкой друг за другом.
- *Как отключить анимации в тестах?* — \`provideNoopAnimations()\` или \`[@.disabled]\`.
- *Что пришло на смену \`@angular/animations\`?* — \`animate.enter\` и \`animate.leave\`: класс на время CSS-анимации и отложенное удаление.
- *Почему \`:leave\` не сработал?* — Элемент удалили не через Angular, или на нём нет триггера с переходом в \`void\`.

### Ответ на 1 минуту

> Классические анимации Angular описываются как машина состояний в метаданных компонента. \`trigger\` даёт имя, по которому анимация привязывается к элементу как \`[@name]\`, \`state\` задаёт стиль каждого состояния, а \`transition\` с \`animate\` — как переходить между ними, причём берётся первый подходящий переход. Есть особое состояние \`void\` — элемента нет в DOM, отсюда \`:enter\` и \`:leave\`, а значение \`*\` в стиле — это вычисленное значение, поэтому можно анимировать высоту до реального контента. Есть \`keyframes\` для промежуточных кадров, \`query\` и \`stagger\` для волны по списку. Под капотом движок проигрывает всё через Web Animations API и откладывает удаление элемента до конца анимации ухода. Но важно: с Angular 20.2 этот пакет помечен deprecated, и новый код я пишу на \`animate.enter\` и \`animate.leave\` — Angular добавляет CSS-класс и ждёт конца CSS-анимации перед удалением.`,
      en: `## In short

Angular animations are a **state machine** declared in the component metadata, not in CSS. You list the states an element can be in and how it travels between them; Angular plays the transition for you.

Analogy: **a door**. It has two states — closed and open — each with its own position (\`state\` + \`style\`). How exactly it swings between them, over how many milliseconds and with what easing, is the \`transition\`. The name of the wall switch you operate it all with is the \`trigger\`.

## How it works, step by step

1. Add the provider: \`provideAnimationsAsync()\` (or \`provideAnimations()\`).
2. In the component metadata declare \`trigger('open', [...])\` — that is the "switch name".
3. Inside it list \`state('closed', style({...}))\` and \`state('open', style({...}))\` — the **end** styles of each position.
4. Add \`transition('closed <=> open', animate('300ms ease-in-out'))\` — the rule for travelling between them.
5. In the template bind the trigger to an expression: \`<div [@open]="isOpen ? 'open' : 'closed'">\`.
6. As soon as the expression changes value, Angular picks the matching \`transition\` and plays it through the Web Animations API.

## Example

\`\`\`ts
animations: [
  trigger('open', [
    state('closed', style({ height: '0', opacity: 0 })),
    state('open', style({ height: '*', opacity: 1 })),
    transition('closed <=> open', animate('300ms ease-in-out')),
  ]),
]
// <div [@open]="isOpen ? 'open' : 'closed'">
\`\`\`

Why it looks like this: \`*\` means "**the current computed value**" — the real height of the content. It solves the classic CSS problem of not being able to animate to \`height: auto\`: Angular measures the actual height and substitutes it.

## Special transitions, keyframes and stagger

- **\`:enter\` / \`:leave\`** — aliases for \`void => *\` and \`* => void\`, i.e. an element appearing in and being removed from the DOM.
- **\`:increment\` / \`:decrement\`** — fire when a **numeric** value goes up or down (handy for carousels and counters).
- **\`keyframes\`** — intermediate frames with an \`offset\` from 0 to 1, like a cartoon storyboard.
- **\`query\` + \`stagger\`** — select a set of elements and start them not all at once but one after another with a delay: a wave instead of a flash.

\`\`\`ts
transition('* => *', [
  query(':enter', [
    style({ opacity: 0 }),
    stagger(50, animate('200ms', style({ opacity: 1 }))),
  ], { optional: true }),
])
\`\`\`

## What to say in the interview

> Angular animations are declared as a state machine in the component metadata and enabled via \`provideAnimationsAsync()\`. \`trigger\` gives the animation a name it is bound to the element with as \`[@name]\`; \`state\` describes a state's end style and \`transition\` the rule for moving between states with \`animate\`. The special value \`*\` means the current computed value, which is how you animate height up to the real content size — something plain CSS cannot do. There are built-in transitions \`:enter\` and \`:leave\`, aliases of \`void => *\` and \`* => void\`, plus \`:increment\` and \`:decrement\` for numeric values. Under the hood everything runs through the Web Animations API, and on \`:leave\` Angular defers the actual DOM removal until the animation finishes.

## Gotchas

- **\`:leave\` will not fire** if the element is removed by something other than Angular (e.g. you touched the DOM yourself) — it is the framework that defers the removal.
- **Forgetting \`{ optional: true }\` in \`query\`** — if there are no matching elements the animation throws.
- **Bundle weight**: \`@angular/animations\` is not free. They will ask why not just CSS transitions — the answer is states, \`:leave\`, \`stagger\` and lifecycle coordination.
- **SSR**: animations do not play on the server; the first frame after hydration can jump if the initial state is chosen badly.
- **\`height: '*'\` costs a layout recalculation** — noticeable on long lists.
- They will ask about **\`prefers-reduced-motion\`**: you must be able to switch animations off for users who need that.`,
    },
    codeSnippet: `trigger('flash', [
  transition(':enter', [
    animate('600ms', keyframes([
      style({ background: 'yellow', offset: 0 }),
      style({ background: 'orange', offset: 0.5 }),
      style({ background: 'transparent', offset: 1 }),
    ])),
  ]),
])`,
  },
  {
    id: 'ng-045',
    category: 'angular-signals',
    level: 'Medium',
    tags: ['ng-optimized-image', 'performance', 'lcp'],
    question: {
      ru: 'Что даёт директива NgOptimizedImage и как она улучшает LCP?',
      en: 'What does the NgOptimizedImage directive give you, and how does it improve LCP?',
    },
    answer: {
      ru: `## В чём суть

\`NgOptimizedImage\` — директива из \`@angular/common\`, которая заставляет и вас, и браузер грузить картинки по лучшим практикам. Вы пишете \`ngSrc\` вместо \`src\`, а директива сама расставляет атрибуты, от которых зависят метрики Core Web Vitals: \`loading\`, \`fetchpriority\`, \`decoding\`, \`srcset\`, обязательные \`width\`/\`height\`. Главная LCP-картинка помечается атрибутом \`priority\` и грузится первой, все остальные — лениво. В dev-режиме директива ещё и ругается на типичные ошибки: нет размеров, картинка в разы больше, чем нужно, LCP-картинка без приоритета.

Аналогия — хорошая служба доставки. Место под коробку в прихожей размечено заранее, поэтому, когда её принесут, мебель двигать не придётся (\`width\`/\`height\` против прыжков вёрстки). Один важный заказ едет экспрессом с мигалкой (\`priority\`), остальные — попутным рейсом, когда до них дойдёт очередь (\`loading="lazy"\`). А склад отдаёт коробку нужного размера, а не самую большую (\`srcset\` и image loader).

**Какую проблему решает.** Картинки — обычно самые тяжёлые ресурсы страницы, и с ними легко ошибиться тремя способами. Первый: главный баннер грузится в общей очереди вместе с иконками и картинками ниже экрана — страница долго выглядит пустой (плохой LCP). Второй: у \`img\` нет размеров, и когда картинка доезжает, текст под ней прыгает вниз (плохой CLS). Третий: телефону отдают файл для 4K-монитора. Директива закрывает все три и не даёт забыть про них при ревью.

## Словарик терминов

- **Core Web Vitals** — набор метрик Google о качестве загрузки и отзывчивости страницы; влияют на SEO и на ощущения пользователя.
- **LCP (Largest Contentful Paint)** — время, когда отрисован самый крупный видимый элемент первого экрана; часто это картинка-баннер. Хорошо — до 2,5 с.
- **CLS (Cumulative Layout Shift)** — суммарный «прыжок» вёрстки при загрузке; главные виновники — картинки без размеров.
- **\`loading="lazy"\` / \`"eager"\`** — атрибут \`img\`: грузить, когда картинка подъедет к экрану, или сразу.
- **\`fetchpriority="high"\`** — подсказка браузеру поставить загрузку в начало очереди.
- **\`decoding\`** — когда декодировать картинку: \`sync\` — сразу, \`async\` — не блокируя основной поток, \`auto\` — на усмотрение браузера.
- **\`srcset\` и \`sizes\`** — список вариантов файла разной ширины (\`640w\`) или плотности (\`2x\`) и подсказка, какую ширину картинка займёт на экране; браузер сам выбирает подходящий файл.
- **DPR (device pixel ratio)** — сколько физических пикселей в одном CSS-пикселе: на ретина-экране 2 или 3.
- **\`<link rel="preload">\` / \`<link rel="preconnect">\`** — подсказки в \`head\`: начать скачивать ресурс заранее / заранее открыть соединение с сервером картинок.
- **Image loader** — функция \`(config) => url\`, которая строит адрес картинки нужной ширины для вашего CDN; без неё директива использует \`ngSrc\` как есть.
- **CDN картинок** — сервис (Imgix, Cloudinary, ImageKit, Cloudflare, Netlify), который по параметрам в URL отдаёт картинку нужного размера и формата, например WebP или AVIF.
- **SSR** — серверный рендеринг, при котором HTML с тегами \`link\` формируется ещё на сервере.

## Как это работает под капотом

Вся работа происходит в \`ngOnInit\` директивы и сводится к расстановке атрибутов на \`img\`. Упрощённо:

\`\`\`ts
ngOnInit() {
  if (ngDevMode) {
    // проверки: есть ngSrc, нет src, есть width/height или fill, размеры > 0, ...
  }
  if (!this.fill) {
    setAttr('width', this.width);
    setAttr('height', this.height);
  }
  setAttr('loading', this.priority ? 'eager' : (this.loading ?? 'lazy'));
  setAttr('fetchpriority', this.priority ? 'high' : 'auto');
  setAttr('decoding', this.priority ? 'sync' : (this.decoding ?? 'auto'));
  setAttr('src', this.imageLoader({ src: this.ngSrc }));
  if (this.ngSrcset || (loaderConfigured && !this.disableOptimizedSrcset)) {
    setAttr('srcset', buildSrcset());       // через loader для каждой ширины
  }
  if (isServer && this.priority) {
    addPreloadLink();                       // <link rel="preload"> в head — только при SSR
  }
}
\`\`\`

По шагам:

1. **Проверки в dev-режиме.** Нет \`width\`/\`height\` и нет \`fill\` — ошибка \`NG02954\`. Указаны и \`src\`, и \`ngSrc\` — \`NG02950\`. Base64 в \`ngSrc\`, нулевые размеры, \`loading\` на приоритетной картинке — тоже ошибки. В продакшен-сборке этих проверок нет.
2. **Размеры.** \`width\` и \`height\` выставляются атрибутами, и браузер резервирует место по их пропорции ещё до загрузки файла — CLS исчезает.
3. **Приоритет.** Обычной картинке — \`loading="lazy"\`, \`fetchpriority="auto"\`. Картинке с \`priority\` — \`loading="eager"\`, \`fetchpriority="high"\`, \`decoding="sync"\`.
4. **Адрес.** \`src\` строится через image loader; по умолчанию loader возвращает \`ngSrc\` без изменений.
5. **\`srcset\` генерируется автоматически, только если подключён loader.** Без \`sizes\` — по плотности (\`1x\`, \`2x\` от \`width\`), с \`sizes\` — по ширинам из списка точек (16, 32, … 3840 пикселей). Для ленивых картинок в \`sizes\` добавляется \`auto\`.
6. **Preload.** Тег \`<link rel="preload" as="image" fetchpriority="high">\` для приоритетной картинки директива добавляет **только при серверном рендеринге** — в браузере он уже бесполезен, потому что \`img\` и так в DOM.
7. **Наблюдатель LCP в dev-режиме.** Через \`PerformanceObserver\` директива узнаёт, какая картинка оказалась LCP-элементом, и если у неё нет \`priority\`, пишет в консоль ошибку \`NG02955\`.

### Пример 1. Что директива делает с разметкой из \`codeSnippet\`

\`\`\`ts
@Component({
  imports: [NgOptimizedImage],
  template: \`
    <img ngSrc="hero.avif" width="1200" height="630" priority alt="Banner" />
    <img ngSrc="thumb.jpg" width="120" height="120" alt="Thumb" />
  \`,
})
export class GalleryComponent {}

// итоговые атрибуты (Angular 21, loader по умолчанию):
// <img ngsrc="hero.avif" width="1200" height="630" priority="" alt="Banner"
//      loading="eager" fetchpriority="high" decoding="sync" ng-img="true" src="hero.avif">
// <img ngsrc="thumb.jpg" width="120" height="120" alt="Thumb"
//      loading="lazy" fetchpriority="auto" decoding="auto" ng-img="true" src="thumb.jpg">
// <link> в head: нет (это не SSR)
\`\`\`

Баннер встаёт в начало очереди загрузки и декодируется сразу, миниатюра ждёт, пока до неё доскроллят. \`srcset\` не появился: без loader директиве неоткуда взять файлы других размеров, поэтому она его просто не генерирует.

### \`priority\`: что именно ускоряет LCP

LCP складывается из четырёх частей: ответ сервера, задержка до начала загрузки картинки, сама загрузка и отрисовка. \`priority\` бьёт по второй и третьей. \`fetchpriority="high"\` ставит запрос в начало очереди, а не после скриптов и других картинок. \`loading="eager"\` гарантирует, что браузер не отложит загрузку. При SSR preload-ссылка в \`head\` позволяет начать загрузку ещё до того, как браузер разберёт \`body\`. И главное — директива не даёт случайно сделать LCP-картинку ленивой: это одна из самых частых причин плохого LCP.

Правило: \`priority\` ставится на картинку, которая и есть LCP-элемент первого экрана, — обычно одну, максимум несколько для разных раскладок. Если отметить больше 10 картинок, dev-режим предупредит (\`NG02966\`), а при SSR больше 5 preload-ссылок — отдельное предупреждение \`NG02961\`.

### Image loader: \`provideImgixLoader\` и свой \`IMAGE_LOADER\`

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideImgixLoader('https://cdn.example.com/')],
});

// та же разметка из codeSnippet теперь даёт:
// hero:  src="https://cdn.example.com/hero.avif?auto=format"
//        srcset="https://cdn.example.com/hero.avif?auto=format&w=1200 1x,
//                https://cdn.example.com/hero.avif?auto=format&w=2400 2x"
// thumb: src="https://cdn.example.com/thumb.jpg?auto=format"
//        srcset="https://cdn.example.com/thumb.jpg?auto=format&w=120 1x,
//                https://cdn.example.com/thumb.jpg?auto=format&w=240 2x"
// + в dev-консоли: NG02956 ... there is no preconnect tag present for this image
\`\`\`

Готовые loader'ы в Angular 21: \`provideImgixLoader\`, \`provideCloudinaryLoader\`, \`provideImageKitLoader\`, \`provideCloudflareLoader\`, \`provideNetlifyLoader\`. Свой loader — просто функция по токену \`IMAGE_LOADER\`:

\`\`\`ts
{
  provide: IMAGE_LOADER,
  useValue: (config: ImageLoaderConfig) =>
    \`https://img.example.com/\${config.src}?w=\${config.width ?? 'orig'}\`,
}
// config: { src, width?, isPlaceholder?, loaderParams? }
\`\`\`

Сама директива файлы не сжимает и форматы не конвертирует — это делает CDN по параметрам из URL. Предупреждение \`NG02956\` подсказывает добавить в \`index.html\` \`<link rel="preconnect" href="https://cdn.example.com">\`, чтобы соединение с CDN открывалось заранее.

### \`sizes\` и \`ngSrcset\`: адаптивные картинки

\`\`\`html
<img ngSrc="photo.jpg" width="1600" height="900" sizes="(max-width: 768px) 100vw, 50vw" alt="" />
<!-- с loader выше:
  sizes="auto, (max-width: 768px) 100vw, 50vw"
  srcset="...photo.jpg?w=16 16w, ...?w=32 32w, ... ?w=640 640w, ?w=750 750w, ?w=828 828w,
          ?w=1080 1080w, ?w=1200 1200w, ?w=1920 1920w, ?w=2048 2048w, ?w=3840 3840w"
  loading="lazy" -->
\`\`\`

С \`sizes\` директива строит \`srcset\` по точкам из \`IMAGE_CONFIG.breakpoints\` (по умолчанию от 16 до 3840 пикселей), а браузер по \`sizes\` и DPR выбирает минимально достаточный файл: телефону с экраном 390 CSS-пикселей и DPR 3 — около 1200 пикселей, а не 3840. Если нужен свой набор, пишите \`ngSrcset="320w, 640w, 1280w"\` или \`ngSrcset="1x, 2x"\`. \`ngSrcset\` без loader бесполезен — все варианты указали бы на один файл, поэтому dev-режим предупреждает (\`NG02963\`).

### \`fill\`: картинка на весь контейнер

\`\`\`html
<div style="position: relative; height: 300px">
  <img ngSrc="bg.jpg" fill alt="" />
</div>
<!-- директива добавляет:
  style="position: absolute; width: 100%; height: 100%; inset: 0;"
  sizes="auto, 100vw"   и srcset от 640w до 3840w (точки меньше 640 отброшены для 100vw) -->
\`\`\`

\`fill\` нужен, когда размеры картинки заранее неизвестны (обложки, фоны). Вместо \`width\`/\`height\` картинка растягивается на родителя, поэтому у родителя должен быть \`position: relative\`, \`fixed\` или \`absolute\` и ненулевая высота — иначе dev-режим предупредит, что высота картинки нулевая. Обычно добавляют \`object-fit: cover\`.

### \`placeholder\`: размытая заглушка

\`\`\`html
<img ngSrc="hero.jpg" width="1200" height="630" priority placeholder alt="" />
<!-- placeholder без значения: loader строит URL шириной 30 px (placeholderResolution),
     картинка получает background-image с этим URL и filter: blur(15px), пока не загрузится основная -->
<img ngSrc="hero.jpg" width="1200" height="630" placeholder="data:image/webp;base64,..." alt="" />
\`\`\`

Заглушка показывает пользователю силуэт картинки вместо пустого места. Вариант без значения требует loader: без него заглушкой стал бы тот же большой файл, поэтому dev-режим бросает ошибку \`NG02963\`. Data URL длиннее 4000 символов вызывает предупреждение, длиннее 10000 — ошибку, потому что такие строки раздувают бандл.

### Ошибки, которые ловит dev-режим

\`\`\`html
<img ngSrc="x.jpg" alt="" />
<!-- NG02954: ... these required attributes are missing: "width", "height". ... -->

<img ngSrc="x.jpg" src="x.jpg" width="10" height="10" alt="" />
<!-- NG02950: ... both \`src\` and \`ngSrc\` have been set. Supplying both of these attributes breaks lazy loading. -->

<img ngSrc="y.jpg" [width]="w()" height="100" alt="" />
<!-- w.set(200) после первого рендера:
     NG02953: ... \`width\` was updated after initialization. The NgOptimizedImage directive will not react to this input change. -->
\`\`\`

А вот \`ngSrc\` менять можно: смена \`[ngSrc]\` с \`a.jpg\` на \`b.jpg\` пересчитывает \`src\` и \`srcset\`. Нельзя менять после инициализации \`width\`, \`height\`, \`priority\`, \`fill\`, \`loading\`, \`sizes\`, \`ngSrcset\` — директива на это не реагирует и в dev-режиме бросает ошибку.

### Где это применяется на практике

- **Главная страница и лендинги**: hero-баннер с \`priority\` — самый быстрый способ улучшить LCP; остальные картинки ленивые.
- **Интернет-магазины и каталоги**: сотни карточек товаров с CDN-loader и \`sizes\` — телефон качает маленькие файлы, а ленивая загрузка экономит трафик.
- **Новостные сайты и блоги с SSR**: preload LCP-картинки прямо в серверном HTML.
- **Админки и дашборды**: аватары и логотипы с фиксированными \`width\`/\`height\` против прыжков вёрстки в таблицах.
- **Галереи и обложки** неизвестных пропорций: \`fill\` с \`object-fit: cover\` внутри контейнера с заданной высотой.

## Важные нюансы и подводные камни

- **\`ngSrc\` и \`src\` одновременно нельзя** — ошибка \`NG02950\`: директива сама управляет \`src\`, иначе ленивая загрузка сломается.
- **Preload-ссылка появляется только при SSR.** В чисто клиентском приложении \`priority\` даёт \`eager\`, \`fetchpriority="high"\` и \`decoding="sync"\`, но тега \`link\` в \`head\` не будет.
- **Без loader нет \`srcset\`.** Директива его вообще не генерирует, а не «генерирует бесполезный». Экономия трафика на адаптивности требует CDN или своего loader.
- **\`priority\` на всех картинках обесценивает приоритет.** Браузер делит канал между всеми «срочными» запросами, и LCP-картинка грузится медленнее; dev-режим предупреждает после 10 таких картинок.
- **\`width\`/\`height\` — не CSS-размер.** Для фиксированной картинки это желаемый размер отрисовки, для адаптивной — собственный размер файла; главное, чтобы совпадала пропорция. Реальный размер задаёт CSS (часто \`width: 100%; height: auto\`), а неверную пропорцию dev-режим подсветит предупреждением.
- **Размеры нельзя менять после инициализации.** Если у динамических картинок разные пропорции, пересоздавайте \`img\` (через \`@if\` или \`@for\` с \`track\` по URL), а не меняйте \`[width]\` на лету.
- **Смена \`ngSrc\` у LCP-картинки** вызывает предупреждение \`NG02964\`: подмена главной картинки после старта замедляет LCP.
- **\`fill\` без позиционированного родителя** — картинка «уезжает» или получает нулевую высоту.
- **Проверки работают только в dev-режиме.** В продакшене ошибок не будет, будет просто медленная или прыгающая страница — поэтому смотрите консоль при разработке.
- **Не всё покрывает.** CSS-фоны (\`background-image\`) и \`picture\` с разными форматами директива не обрабатывает; для арт-дирекшна по-прежнему пишут \`picture\` вручную.
- **Обычные \`img\` тоже под присмотром.** Даже без директивы Angular в dev-режиме предупреждает (\`NG0913\`), если LCP-картинка помечена \`loading="lazy"\` или файл сильно больше отрисованного размера.

**Плюсы:** правильные атрибуты загрузки по умолчанию; защита от CLS обязательными размерами; автоматический \`srcset\` с CDN; dev-проверки ловят типичные ошибки до продакшена.
**Минусы:** без loader теряется половина пользы; жёсткие правила (обязательные размеры, нельзя менять после инициализации); preload только при SSR; не работает для CSS-фонов.

## Как это спрашивают на собеседовании

**Главный вывод:** \`NgOptimizedImage\` включается атрибутом \`ngSrc\`, требует \`width\`/\`height\` или \`fill\` (против CLS), делает все картинки ленивыми, а картинку с \`priority\` — \`eager\` с \`fetchpriority="high"\`, при SSR ещё и с preload. LCP улучшают именно приоритет загрузки и отказ от lazy для главной картинки, а размер файлов уменьшает \`srcset\`, который появляется только вместе с image loader.

Типичные формулировки: «Как Angular помогает улучшить LCP?», «Что делает атрибут \`priority\`?», «Зачем \`NgOptimizedImage\` требует \`width\` и \`height\`?».

Что могут спросить следом:

- *Что конкретно улучшает LCP?* — \`fetchpriority="high"\`, \`loading="eager"\` и preload при SSR для LCP-картинки, плюс меньший файл через \`srcset\`.
- *Почему не генерируется \`srcset\`?* — Не подключён image loader: без него директиве не из чего строить варианты.
- *Как вывести картинку неизвестного размера?* — \`fill\` внутри родителя с \`position: relative\` и заданной высотой.
- *Можно ли менять \`width\` динамически?* — Нет, это ошибка \`NG02953\`; пересоздавайте элемент.
- *Как узнать, какая картинка — LCP?* — DevTools Performance или Lighthouse; в dev-режиме директива сама подскажет ошибкой \`NG02955\`.

### Ответ на 1 минуту

> \`NgOptimizedImage\` — директива из \`@angular/common\`, которая включается заменой \`src\` на \`ngSrc\` и расставляет на картинке атрибуты по лучшим практикам. Она требует \`width\` и \`height\` или режим \`fill\`, поэтому браузер заранее резервирует место и уходит CLS. Все картинки по умолчанию получают \`loading="lazy"\`, а картинка с атрибутом \`priority\` — \`loading="eager"\`, \`fetchpriority="high"\` и \`decoding="sync"\`; при серверном рендеринге в \`head\` ещё добавляется preload-ссылка. Именно это и улучшает LCP: главная картинка встаёт в начало очереди и не бывает ленивой. Если подключить image loader, например \`provideImgixLoader\` или свою функцию, директива строит \`srcset\`, и телефон качает маленький файл; без loader \`srcset\` не появится. В dev-режиме она ловит ошибки: нет размеров, LCP-картинка без \`priority\`, картинка сильно больше нужного, размеры изменены после инициализации.`,
      en: `## In short

\`NgOptimizedImage\` is a directive that **makes you and the browser load images correctly**. You write \`ngSrc\` instead of \`src\` and it sets every attribute that matters for **Core Web Vitals** — primarily LCP (Largest Contentful Paint) and CLS.

Analogy: a good delivery service. The floor space for the box is marked out in advance, so when it arrives no furniture has to be shoved around (that is \`width\`/\`height\` versus CLS). One important parcel goes express (\`priority\`); the rest travel whenever there is room (\`loading="lazy"\`).

## How it works, step by step

1. You import \`NgOptimizedImage\` into the component and change \`src\` to \`ngSrc\`.
2. The directive **requires** \`width\` and \`height\` (or \`fill\`) — without them it errors. The browser reserves the space up front and **CLS disappears**.
3. By default it sets \`loading="lazy"\` on every image — they load only when needed.
4. For an image marked \`priority\` it does the opposite: \`loading="eager"\`, \`fetchpriority="high"\` and a **preload** hint in \`<head>\`. The browser starts fetching it immediately, before the whole DOM is parsed.
5. It generates a \`srcset\` from a set of breakpoints so a phone does not download the desktop-sized file.
6. In dev mode the directive **complains in the console**: the file is far larger than its displayed size, the LCP image has no \`priority\`, the declared dimensions do not match the real aspect ratio.

## Example

\`\`\`html
<img ngSrc="hero.jpg" width="800" height="600" priority alt="Hero" />
\`\`\`

Why it looks like this: \`priority\` goes on **exactly one** image on screen — the one that actually is the LCP element (usually the above-the-fold banner). Mark everything as priority and priority stops meaning anything; you just saturate the connection.

## Image loaders and the CDN

The directive itself **does not compress files**. What it can do is rewrite URLs for your CDN, and the CDN then serves the right size and format (WebP/AVIF):

\`\`\`ts
provideImgixLoader('https://cdn.example.com/')
\`\`\`

There are ready-made loaders (\`provideImgixLoader\`, \`provideCloudflareLoader\` and others) and you can write your own — it is just a function that builds the final URL from a file name and a requested width. That loader is what makes \`srcset\` meaningful: without it every candidate would point at the same file.

## What to say in the interview

> \`NgOptimizedImage\` is a directive applied through the \`ngSrc\` attribute that brings image loading up to best practice and directly affects Core Web Vitals. It mandates \`width\` and \`height\`, or the \`fill\` mode, so the browser reserves the space and CLS goes away. By default it applies \`loading="lazy"\`, while the \`priority\` attribute on the LCP image switches on \`loading="eager"\`, \`fetchpriority="high"\` and adds a preload hint to \`<head>\`. It also generates a \`srcset\` across breakpoints, and in dev mode warns about oversized files, incorrect dimensions and a missing \`priority\` on the LCP image. It does not optimize the images themselves — that is the CDN's job through an image loader such as \`provideImgixLoader\` or a custom function that rewrites the URL with the requested width and a WebP/AVIF format. For full-width images you use \`fill\`, which requires the parent to be \`position: relative\`, and \`ngSrcset\` lets you set densities or widths by hand.

## Gotchas

- **You cannot have \`ngSrc\` and \`src\` at the same time** — the directive throws.
- **\`priority\` on every image** devalues priority and hurts LCP. Exactly one image — the one visible immediately.
- **\`fill\` without \`position: relative\` on the parent** — the image escapes to full screen or collapses.
- **width/height are an aspect ratio, not a CSS size.** The real size comes from CSS; a wrong ratio triggers a directive warning.
- **Without an image loader \`srcset\` is pointless** — every candidate resolves to the same file, so nothing is saved.
- They will ask **what exactly improves LCP**: the answer is the preload plus \`fetchpriority="high"\`, not "image optimization" as such.
- **Dynamic URLs**: if \`ngSrc\` changes at runtime, make sure the dimensions change too, or you get a stretched image.`,
    },
    codeSnippet: `@Component({
  imports: [NgOptimizedImage],
  template: \`
    <img ngSrc="hero.avif" width="1200" height="630" priority alt="Banner" />
    <img ngSrc="thumb.jpg" width="120" height="120" alt="Thumb" />
  \`,
})
export class GalleryComponent {}`,
  },
  {
    id: 'ng-046',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['defer', 'triggers', 'prefetch', 'lazy-loading'],
    question: {
      ru: 'Какие триггеры, prefetch и блоки (@placeholder/@loading/@error) есть у @defer и как они работают?',
      en: 'What triggers, prefetch and blocks (@placeholder/@loading/@error) does @defer have, and how do they work?',
    },
    answer: {
      ru: `## В чём суть

\`@defer\` — это блок в шаблоне, который говорит Angular: «этот кусок интерфейса и код его компонентов на старте не нужен; вынеси его в отдельный файл и подгрузи, когда наступит условие». Условие называется **триггером** (\`on viewport\`, \`on hover\`, \`when ...\`), а вокруг основного блока можно описать три состояния: \`@placeholder\` — что показать до загрузки, \`@loading\` — пока код едет по сети, \`@error\` — если загрузка сорвалась.

Аналогия: **торговый автомат**. Товар лежит не в витрине, а на складе; его привозят, когда вы нажали кнопку (триггер). Пока ничего не нажато, на витрине стоит муляж (\`@placeholder\`), пока везут — горит лампочка «подождите» (\`@loading\`), если склад закрыт — табличка «товара нет» (\`@error\`). А \`prefetch\` — это кладовщик, который заранее принёс коробку в подсобку: вы нажимаете, и выдача мгновенная.

**Какую проблему решает.** Initial bundle (весь JavaScript, который браузер обязан скачать и выполнить до первого полезного экрана) растёт с каждым графиком, редактором и виджетом комментариев, хотя половину из них пользователь увидит только после прокрутки или клика. Раньше, чтобы загрузить компонент лениво, приходилось вручную писать \`import()\`, создавать компонент через \`ViewContainerRef.createComponent\`, заводить флаги «грузится / ошибка» и самому подключать \`IntersectionObserver\`. \`@defer\` (появился в Angular 17, стабилен с 18) делает всё это декларативно, одной конструкцией в шаблоне.

## Словарик терминов

- **Бандл и initial bundle (bundle)** — файл(ы) JavaScript, которые собирает сборщик; initial — то, что качается при открытии страницы, до любых действий пользователя.
- **Чанк (chunk)** — отдельный JS-файл, отрезанный от основного бандла; скачивается позже, по требованию.
- **Динамический импорт (\`import()\`)** — функция, которая загружает модуль во время работы программы и возвращает \`Promise\`; встретив её, сборщик выносит модуль в отдельный чанк.
- **Code splitting** — нарезка приложения на чанки, чтобы не грузить всё сразу.
- **Триггер (trigger)** — событие, по которому \`@defer\` начинает загрузку и показ: простой браузера, появление в экране, клик, наведение, таймер, условие.
- **Prefetch** — отдельный триггер «только скачать код заранее, но не показывать».
- **Связанные блоки (\`@placeholder\`, \`@loading\`, \`@error\`)** — состояния до загрузки, во время и при ошибке; пишутся сразу после \`@defer\`.
- **Standalone-компонент** — компонент, который сам объявляет свои зависимости в \`imports\` и не принадлежит \`NgModule\`; только такие можно отложить.
- **AOT-компилятор (Ahead-of-Time)** — компилятор Angular, который на этапе сборки превращает шаблоны в JavaScript; именно он решает, что уедет в чанк.
- **\`IntersectionObserver\`** — браузерный API, который сообщает, когда элемент пересёк видимую область экрана.
- **\`requestIdleCallback\`** — браузерный API «вызови меня, когда тебе нечем заняться».
- **LCP, TTI, CLS** — метрики Core Web Vitals: время отрисовки главного контента, время до интерактивности и «прыжки» вёрстки при подгрузке.
- **Гидрация (hydration)** — «оживление» HTML, отрендеренного на сервере (SSR): Angular подключается к готовой разметке вместо того, чтобы рисовать её заново.

## Как это работает под капотом

Механизм по шагам:

1. На этапе сборки AOT-компилятор находит в шаблоне \`@defer\` и собирает зависимости **основного** блока: компоненты, директивы, пайпы.
2. Если зависимость standalone, используется только внутри основного блока и больше нигде в этом файле не упоминается, компилятор **удаляет её статический \`import\`** и генерирует функцию зависимостей с динамическим \`import()\`. Сборщик (в Angular 17+ это esbuild) видит \`import()\` и выносит код в отдельный чанк.
3. Зависимости \`@placeholder\`, \`@loading\` и \`@error\` остаются обычными статическими импортами — эти блоки должны появиться мгновенно, поэтому живут в основном бандле.
4. В браузере блок стартует в состоянии «заглушка»: рендерится \`@placeholder\` (или ничего), а Angular регистрирует триггеры — слушатели событий, общий \`IntersectionObserver\`, idle-колбэк или таймер.
5. Триггер сработал — слушатели снимаются, Angular вызывает функцию зависимостей, и браузер идёт за чанком по сети. Если загрузка длится дольше \`after\`, показывается \`@loading\`.
6. Промис выполнился — Angular рендерит основной контент (с учётом \`minimum\`). Промис отклонился — рендерится \`@error\`; если его нет, в консоль уходит ошибка NG0750, а на экране остаётся то, что было (спиннер или заглушка).
7. Переход однонаправленный: загруженный блок обратно в заглушку не превращается, даже если условие \`when\` снова стало ложным.

### Пример 1. Что компилятор делает с \`@defer\`

Исходник компонента:

\`\`\`ts
import { Component } from '@angular/core';
import { Heavy } from './heavy';
import { Spinner } from './spinner';

@Component({
  selector: 'app-page',
  imports: [Heavy, Spinner],
  template: \`
    @defer (on hover; prefetch on idle) { <app-heavy [id]="7" /> }
    @placeholder { <button>Show</button> }
    @loading (minimum 300ms) { <app-spinner /> }
  \`,
})
export class Page {}
\`\`\`

Реальный результат \`ngc\` (Angular 21.1, сокращено):

\`\`\`ts
import { Spinner } from './spinner';            // остался: нужен @loading
// import { Heavy } from './heavy';             // ← исчез из статических импортов
const Page_Defer_3_DepsFn = () => [import('./heavy').then(m => m.Heavy)];

// внутри шаблонной функции:
ɵɵdefer(3, 0, Page_Defer_3_DepsFn, /* loading */ 1, /* placeholder */ 2, ...);
ɵɵdeferOnHover(0, -1);       // основной триггер
ɵɵdeferPrefetchOnIdle();     // prefetch-триггер
\`\`\`

Вся «магия» — в двух вещах: статический импорт \`Heavy\` заменён на \`import()\`, а триггеры превратились в обычные инструкции, которые подписываются на события.

### Пример 2. Когда отложить не получится

\`\`\`ts
@Component({
  imports: [Heavy],
  template: \`<app-heavy [id]="1" />  @defer { <app-heavy [id]="2" /> }\`,
})
export class Mixed {}
// ngc: import { Heavy } from './heavy';   ← статический импорт остался
//      const Mixed_Defer_2_DepsFn = () => [Heavy];   ← никакого import()

@Component({ imports: [Heavy], template: \`@defer { <app-heavy /> }\` })
export class Q { h = viewChild(Heavy); }
// ngc: тоже статический импорт — класс Heavy упомянут в коде компонента
\`\`\`

Компилятор молча оставляет зависимость в основном бандле, если она нужна где-то ещё: в шаблоне вне блока, в \`viewChild\`, в любом коде класса. Ошибки или предупреждения при этом нет — проверять приходится по выводу сборки.

### Блок \`@placeholder\`

Что видит пользователь до срабатывания триггера. Это обычная разметка из основного бандла, поэтому туда нельзя класть тяжёлые компоненты — они не откладываются. Параметр \`minimum\` задаёт, сколько заглушка должна провисеть, чтобы не мигнуть:

\`\`\`html
@defer (when show()) { <app-heavy /> }
@placeholder (minimum 500ms) { <span>Заглушка</span> }
\`\`\`

\`\`\`text
[  11ms] DOM: "Заглушка"        ← заглушка отрисована
[ 100ms] show.set(true)         ← условие выполнено, чанк грузится 50ms
[ 515ms] DOM: "HEAVY"           ← показ дождался 500ms с момента появления заглушки
\`\`\`

Отсчёт \`minimum\` идёт от момента, когда заглушка появилась на экране, а не от триггера. Совет из практики: делайте заглушку того же размера, что и будущий контент, иначе при подмене вёрстка «прыгнет» (метрика CLS).

### Блок \`@loading\` и параметры \`after\` / \`minimum\`

\`@loading\` показывается после срабатывания триггера, пока чанк едет по сети. Два параметра против мелькания: \`after\` — «не показывай спиннер, если загрузка уложилась в это время», \`minimum\` — «если уж показал, держи не меньше этого времени».

\`\`\`html
@defer (on interaction) { <app-heavy /> }
@placeholder { <button>Открыть</button> }
@loading (after 100ms; minimum 1s) { <span>LOADING</span> }
\`\`\`

Проверено в Angular 21.1 с искусственной задержкой сети:

\`\`\`text
Чанк грузится 50ms:
[ 101ms] click
[ 161ms] DOM: "HEAVY"      ← спиннер не появился вообще (50ms < after 100ms)

Чанк грузится 300ms:
[  99ms] click
[ 201ms] DOM: "LOADING"    ← через after = 100ms
[1226ms] DOM: "HEAVY"      ← спиннер провисел minimum = 1s, хотя код пришёл на 400ms
\`\`\`

Обратите внимание на второй случай: стоило спиннеру показаться хоть на миг, \`minimum\` удерживает его целую секунду. Поэтому \`minimum\` делают коротким (300–500ms), а \`after\` подбирают так, чтобы быстрые загрузки вообще не показывали спиннер. Без параметров \`@loading\` появляется сразу после триггера.

### Блок \`@error\`

Рендерится, если динамический импорт упал: пропала сеть или после деплоя старые файлы с хэшами в именах удалили с сервера, а у пользователя открыта старая версия страницы.

\`\`\`html
@defer (on interaction) { <app-heavy /> }
@placeholder { <button>PH</button> }
@loading { <span>LOADING</span> }
\`\`\`

\`\`\`text
// без @error, загрузка упала:
// console: ERROR NG0750: Loading dependencies for \`@defer\` block failed,
//          but no \`@error\` block was configured ...
// DOM: "LOADING"   ← спиннер крутится вечно
\`\`\`

Поэтому \`@error\` с кнопкой «Обновить страницу» — обязательная часть любого \`@defer\` с сетевой загрузкой.

### Триггер \`on idle\` — по умолчанию

Если не указать ни одного триггера, компилятор подставляет \`on idle\`. Под капотом — \`requestIdleCallback\` (в браузерах без него — \`setTimeout\`): код грузится, когда главный поток освободился после первой отрисовки. Подходит для всего, что почти наверняка понадобится, но не на первом кадре.

\`\`\`html
@defer { <app-recommendations /> }   <!-- то же самое, что @defer (on idle) -->
\`\`\`

### Триггер \`on viewport\`

Срабатывает, когда наблюдаемый элемент входит в видимую область. Без аргумента наблюдается **корневой элемент \`@placeholder\`**, с аргументом — любой элемент по шаблонной ссылке. Angular держит один общий \`IntersectionObserver\` на все блоки с одинаковыми настройками. В установленной 21.1 можно передать и опции наблюдателя:

\`\`\`html
@defer (on viewport) { <app-chart /> }
@placeholder { <div class="chart-skeleton"></div> }

<div #anchor>Раздел «Отзывы»</div>
@defer (on viewport(anchor)) { <app-reviews /> }

@defer (on viewport({ rootMargin: '300px' })) { <app-map /> }   <!-- начать за 300px до появления -->
@placeholder { <div class="map-skeleton"></div> }
\`\`\`

Без ссылки и без подходящей заглушки шаблон не скомпилируется: \`NG8019: Trigger with no target can only be placed on an @defer that has a @placeholder block\`, а для заглушки из двух корневых элементов — \`NG8020 ... with exactly one root element node\`.

### Триггер \`on interaction\`

Срабатывает на \`click\` или \`keydown\` по элементу — по умолчанию по корню заглушки, либо по ссылке \`on interaction(btn)\`. Классика — «Показать комментарии», «Открыть редактор».

\`\`\`html
@defer (on interaction) { <app-rich-editor /> }
@placeholder { <button>Редактировать</button> }
\`\`\`

\`keydown\` в списке не случайно: пользователь с клавиатуры тоже должен суметь «нажать» заглушку.

### Триггер \`on hover\`

Срабатывает на \`mouseenter\`, \`mouseover\` или \`focusin\` — наведение мышью или фокус с клавиатуры. Даёт фору в 100–300 мс между наведением и кликом, которой часто хватает на загрузку. Как и \`on interaction\`, наблюдает корень заглушки или элемент по ссылке \`on hover(ref)\`.

### Триггер \`on immediate\`

Начинает загрузку сразу после того, как отрисовался неотложенный контент. Смысл — не блокировать первый рендер, но и не ждать простоя: код в чанке, но запрос уходит немедленно.

\`\`\`html
@defer (on immediate) { <app-sidebar-widgets /> }
\`\`\`

### Триггер \`on timer\`

Загрузка через заданное время: \`on timer(500ms)\` или \`on timer(2s)\`. Полезно для баннеров и подсказок, которые и не должны появляться мгновенно.

\`\`\`html
@defer (on timer(2s)) { <app-promo-banner /> }
\`\`\`

### Триггер \`when\`

Принимает любое выражение — флаг, вызов сигнала, результат метода. Как только оно стало истинным, блок грузится. Срабатывает **однократно**:

\`\`\`text
[ 100ms] show.set(true)   → контент загружен и показан
[ 900ms] show.set(false)  → ничего не изменилось, контент остался
\`\`\`

Если нужно и показывать, и скрывать, оборачивайте \`@defer\` в \`@if\`: \`@if\` отвечает за видимость, \`@defer\` — за ленивую загрузку кода.

### Несколько триггеров сразу

Триггеры перечисляются через точку с запятой и работают по принципу «что раньше»: \`@defer (on viewport; on timer(5s))\` загрузится либо при прокрутке, либо через 5 секунд. \`on\` и \`when\` тоже можно смешивать: \`@defer (on interaction; when isAdmin())\`. Повторять один и тот же тип триггера нельзя — ошибка компиляции \`Duplicate "viewport" trigger is not allowed\`.

### \`prefetch\` — скачать заранее, показать позже

Пример под ответом — \`@defer (on hover; prefetch on idle)\` — разделяет два момента: **когда скачивать** (\`prefetch on idle\` — в простое браузера) и **когда показывать** (\`on hover\` — при наведении). Таймлайн из Angular 21.1:

\`\`\`text
[  26ms] chunk request start     ← prefetch on idle: код поехал, пока пользователь читает
[  31ms] DOM: "Show comments"    ← на экране по-прежнему заглушка
[ 326ms] hover на заглушке
[ 334ms] DOM: "<comments>"       ← показ мгновенный, @loading не понадобился
\`\`\`

Если prefetch не успел, по триггеру показа просто продолжится уже начатая загрузка — второй запрос не уходит. Если prefetch упал, по триггеру сразу покажется \`@error\`. Для \`prefetch\` доступны те же триггеры: \`prefetch on viewport\`, \`prefetch when cond()\`.

### \`@defer\` на сервере и триггеры \`hydrate\`

При SSR сервер не знает ни о прокрутке, ни о наведении, поэтому обычные триггеры там не срабатывают: в HTML попадает \`@placeholder\`. С включённой incremental hydration (\`withIncrementalHydration()\`, стабильна с Angular 20) появляются триггеры \`hydrate on ...\`: сервер рендерит **основной** контент, а клиент «оживляет» его кусками — \`hydrate on viewport\`, \`hydrate on interaction\`, \`hydrate never\`.

\`\`\`html
@defer (hydrate on viewport) { <app-product-reviews /> }
\`\`\`

### Как тестировать: \`DeferBlockBehavior\`

В \`TestBed\` по умолчанию режим \`DeferBlockBehavior.Playthrough\` — блоки ведут себя как в браузере. Режим \`Manual\` позволяет вручную переключать состояния:

\`\`\`ts
TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
const fixture = TestBed.createComponent(Page);
const [block] = await fixture.getDeferBlocks();
await block.render(DeferBlockState.Loading);   // проверить спиннер
await block.render(DeferBlockState.Complete);  // проверить контент
\`\`\`

### Где это применяется на практике

- **Дашборды**: тяжёлые графики (ECharts, Highcharts) ниже первого экрана — \`on viewport\` с заглушкой-скелетоном того же размера.
- **Карточка товара или статьи**: комментарии, отзывы, «похожие товары» — \`on viewport\` или \`on interaction; prefetch on idle\`.
- **Rich-text редакторы и карты**: сотни килобайт кода, нужные только после клика «Редактировать» или «Показать на карте» — \`on interaction; prefetch on hover\`.
- **Большие таблицы в enterprise-приложениях**: экспорт в Excel, панель настройки колонок, фильтры-конструкторы — \`on interaction\`.
- **Функции под флагом или ролью**: \`when isAdmin()\` — пользователи без прав вообще не скачивают код админских виджетов.
- **Маркетинговые виджеты и чаты поддержки** — \`on timer(5s)\` или \`on idle\`, чтобы не мешать первому экрану.

## Важные нюансы и подводные камни

- **Компонент используется и внутри, и снаружи блока.** Тогда он остаётся в основном бандле, и \`@defer\` не даёт ничего. То же самое, если класс упомянут в коде компонента (\`viewChild(Heavy)\`, проверка \`instanceof\`). Компилятор не предупреждает — проверяйте по выводу сборки (список lazy chunks в \`ng build\`).
- **Зависимости должны быть standalone.** Компоненты, объявленные в \`NgModule\`, грузятся сразу. Директивы и пайпы тоже откладываются только если standalone.
- **Тяжёлые зависимости в \`@placeholder\` и \`@loading\`** сводят идею на нет: эти блоки всегда в основном бандле.
- **\`on viewport\`, \`on interaction\`, \`on hover\` без ссылки** требуют \`@placeholder\` ровно с одним корневым элементом — иначе ошибки компиляции NG8019 / NG8020. Наблюдать пустоту невозможно.
- **\`@error\` часто забывают.** После деплоя старые чанки исчезают, загрузка падает, и без \`@error\` пользователь видит вечный спиннер, а в консоли — NG0750.
- **\`after\` и \`minimum\` у \`@loading\` взаимодействуют.** Если спиннер успел показаться, \`minimum\` удержит его, даже когда код уже пришёл. Слишком большой \`minimum\` искусственно замедляет интерфейс.
- **\`when\` срабатывает один раз.** Это не замена \`@if\`: скрыть загруженный блок через \`when\` нельзя.
- **Не оборачивайте в \`@defer\` контент первого экрана.** Код главного блока окажется в отдельном запросе, и LCP станет только хуже.
- **Вложенные \`@defer\` с одинаковыми триггерами** порождают каскад: загрузился внешний, отрисовал внутренний, тот начал свою загрузку. Для вложенных блоков выбирайте разные триггеры или предзагрузку.
- **Разница с ленивыми роутами** — любимый вопрос: \`@defer\` откладывает **часть шаблона** внутри страницы, \`loadComponent\` / \`loadChildren\` — **целый маршрут**. Они дополняют друг друга.
- **На сервере рендерится заглушка.** Если важен SEO-контент внутри \`@defer\`, нужен \`hydrate\`-триггер с incremental hydration, иначе поисковик увидит только placeholder.

**Плюсы:** декларативная ленивая загрузка без ручного \`import()\` и \`ViewContainerRef\`; меньше initial bundle и лучше TTI; встроенные состояния загрузки и ошибки; богатый набор триггеров и \`prefetch\`; связка с SSR через incremental hydration.
**Минусы:** работает только со standalone-зависимостями и только если они не используются снаружи блока (проверять вручную); лишний сетевой запрос и риск сдвига вёрстки; поведение \`after\`/\`minimum\` и однократного \`when\` легко понять неправильно; ошибки загрузки после деплоя нужно обрабатывать самим.

## Как это спрашивают на собеседовании

**Главный вывод:** \`@defer\` выносит standalone-зависимости блока в отдельный чанк и подгружает их по триггеру (по умолчанию \`on idle\`); \`@placeholder\` и \`@loading\` живут в основном бандле и закрывают состояния «до» и «во время», \`@error\` — сбой загрузки, а \`prefetch\` разделяет моменты скачивания и показа.

Типичные формулировки: «Какие триггеры есть у \`@defer\`?», «Чем \`prefetch\` отличается от основного триггера?», «Зачем \`after\` и \`minimum\` у \`@loading\`?», «Почему мой компонент не отложился?».

Что могут спросить следом:

- *Какой триггер по умолчанию?* — \`on idle\`, через \`requestIdleCallback\` с запасным \`setTimeout\`.
- *Почему компонент не попал в отдельный чанк?* — Он не standalone, используется вне блока или упомянут в коде класса — тогда импорт остаётся статическим.
- *Что увидит пользователь при SSR?* — Заглушку; основной контент на сервере рендерится только с \`hydrate\`-триггерами и incremental hydration.
- *Чем \`@defer\` отличается от ленивого роута?* — Роут откладывает целую страницу, \`@defer\` — кусок шаблона внутри страницы.
- *Что будет без \`@error\`, если чанк не загрузился?* — Ошибка NG0750 в консоли и вечный спиннер или заглушка на экране.

### Ответ на 1 минуту

> \`@defer\` — это ленивая загрузка части шаблона, появившаяся в Angular 17. Компилятор берёт standalone-зависимости основного блока, которые не используются больше нигде в файле, убирает их статический импорт и генерирует динамический \`import()\`, поэтому сборщик выносит их в отдельный чанк. Загрузка начинается по триггеру: по умолчанию \`on idle\`, ещё есть \`on viewport\` через \`IntersectionObserver\`, \`on interaction\`, \`on hover\`, \`on immediate\`, \`on timer\` и \`when\` по условию, их можно комбинировать. Пока код не пришёл, показывается \`@placeholder\`, во время загрузки — \`@loading\` с параметрами \`after\` и \`minimum\` против мелькания, при сбое — \`@error\`. Отдельно \`prefetch\` позволяет скачать код заранее, например в простое, а показать по наведению. Из нюансов: компонент, используемый и вне блока, останется в основном бандле, заглушка тоже в нём, а без \`@error\` после деплоя пользователь увидит вечный спиннер.`,
      en: `## In short

\`@defer\` (Angular 17+) is **"don't load it until it's needed"** written straight into the template. The code of the components inside the block moves into a **separate chunk**, and that chunk is downloaded only when a trigger fires. Result: a smaller initial bundle and a faster TTI.

Analogy: a **vending machine**. The goods are not in the display case but in the warehouse; they are brought over once you press the button. And \`prefetch\` is the stock keeper carrying the box into the back room in advance: you press, and delivery is instant.

## How it works, step by step

1. You wrap the heavy part of the template in \`@defer (...) { ... }\`.
2. The compiler sees which components, directives and pipes are used **only inside** the block and moves them into a separate chunk.
3. Initially the \`@placeholder\` renders — it lives in the main bundle, so it appears immediately.
4. A trigger fires (scroll, hover, click, browser idle…) — chunk loading starts and \`@loading\` is shown.
5. The chunk arrives — Angular replaces the placeholder with the real content.
6. If loading failed (network dropped, a deploy changed the file hashes) — \`@error\` is shown.

## Example

\`\`\`html
@defer (on viewport) {
  <app-heavy-chart [data]="data" />
} @placeholder (minimum 500ms) {
  <div>Scroll down</div>
} @loading (after 100ms; minimum 1s) {
  <app-spinner />
} @error {
  <p>Failed to load</p>
}
\`\`\`

Why it looks like this: \`after 100ms\` means "don't show a spinner if it loaded instantly", and \`minimum 1s\` means "if you did show it, keep it for at least a second". Together they remove the ugly flicker. \`minimum\` on \`@placeholder\` works the same way — it stops the placeholder from blinking.

## Triggers and prefetch

- \`on idle\` — the **default**, on \`requestIdleCallback\`, when the browser has nothing else to do.
- \`on viewport\` — when the block (or its placeholder) enters the viewport; IntersectionObserver under the hood.
- \`on interaction\`, \`on hover\` — on a user action.
- \`on timer(2s)\`, \`on immediate\` — on a timer, and right after rendering.
- \`when condition\` — on a boolean expression or a signal.

Triggers **combine** and can watch another element by reference: \`on viewport(ref)\`.

\`prefetch\` is a separate trigger for **downloading without showing**: \`@defer (on interaction; prefetch on idle)\`. While the user reads the page the code quietly lands in cache; the click then renders instantly.

## What to say in the interview

> \`@defer\` arrived in Angular 17 and lazily loads the code of a template section: the compiler moves the block's dependencies into a separate chunk that is downloaded only when a trigger fires, which shrinks the initial bundle and improves TTI. The block has a \`@placeholder\`, which lives in the main bundle and shows immediately, a \`@loading\` with \`after\` and \`minimum\` to prevent spinner flicker, and an \`@error\` for a failed chunk load. Triggers: \`on idle\` by default, \`on viewport\` via IntersectionObserver, \`on interaction\`, \`on hover\`, \`on timer\`, \`on immediate\` and \`when\` on a boolean expression or signal; they can be combined and bound to another element by reference. Separately there is \`prefetch\` with its own trigger, which pulls the chunk ahead of time without rendering anything so the reveal is instant. The key constraint: every dependency inside the block must be standalone and unused outside it, otherwise it ends up in the main bundle and nothing gets deferred.

## Gotchas

- **A component used both inside and outside the block** stays in the main bundle anyway, so \`@defer\` buys you nothing. Verify with the build output, not by intuition.
- **Dependencies must be standalone** — NgModule components cannot be deferred this way.
- **Heavy dependencies in \`@placeholder\`** defeat the purpose: the placeholder is not deferred.
- **\`on viewport\` with no \`@placeholder\`**: there is nothing to observe while the block is empty — you need a visible anchor.
- **\`@error\` is often forgotten**, and after a deploy the old chunks vanish and the user sees nothing.
- They will ask about **the difference from lazy routes**: \`@defer\` is about **template parts**, \`loadComponent\` about **routes**; they complement each other.
- **Do not wrap above-the-fold content in \`@defer\`** — you will only make LCP worse.`,
    },
    codeSnippet: `@defer (on hover; prefetch on idle) {
  <app-comments [postId]="id" />
} @placeholder {
  <button>Show comments</button>
} @loading (minimum 300ms) {
  <app-spinner />
}`,
  },
  {
    id: 'ng-047',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['destroy-ref', 'take-until-destroyed', 'cleanup'],
    question: {
      ru: 'Как DestroyRef и takeUntilDestroyed решают проблему отписок и где их можно вызывать?',
      en: 'How do DestroyRef and takeUntilDestroyed solve unsubscription, and where can they be used?',
    },
    answer: {
      ru: `## В чём суть

\`DestroyRef\` — это объект, через который можно сказать Angular: «когда этот компонент (директива, сервис, инжектор) будет уничтожен, вызови вот эту функцию». \`takeUntilDestroyed\` — готовый RxJS-оператор поверх него: подписка сама завершается в момент уничтожения, без \`ngOnDestroy\` и без ручного \`Subject\`.

Аналогия: **выезд из отеля**. Раньше вы перед отъездом сами бегали по ресепшену: отменить будильник, бронь спа, завтрак (это \`destroy$\`-\`Subject\` плюс \`ngOnDestroy\`). Забыли один пункт — вам продолжают приносить завтрак в пустой номер. Теперь при заселении вы записываете всё в лист на стойке (\`onDestroy\`), а при сдаче ключа администратор сам проходит по списку и всё отменяет.

**Какую проблему решает.** Подписка на бесконечный поток (\`interval\`, WebSocket, \`valueChanges\` формы, глобальный \`Subject\` в сервисе) живёт, пока её явно не закроют. Компонент уничтожился, а подписка осталась: колбэк продолжает выполняться, держит ссылку на компонент, и сборщик мусора не может его освободить. Это утечка памяти плюс «призрачные» побочные эффекты — лишние HTTP-запросы, логи, изменения состояния. Классическое решение требовало шаблонного кода в каждом компоненте, и один забытый \`takeUntil\` давал утечку.

## Словарик терминов

- **Подписка (\`subscribe\`, \`Subscription\`)** — момент, когда мы говорим потоку «начинай присылать значения»; возвращает объект, через который подписку можно отменить.
- **Отписка (\`unsubscribe\`)** — отмена подписки: поток перестаёт присылать нам значения, его функция очистки вызывается.
- **Утечка памяти (memory leak)** — объект больше не нужен, но на него осталась ссылка (например, из колбэка подписки), и сборщик мусора не может его удалить.
- **\`DestroyRef\`** — токен Angular, дающий доступ к моменту уничтожения текущего контекста; метод \`onDestroy(cb)\` регистрирует колбэк, свойство \`destroyed\` говорит, уничтожен ли контекст.
- **\`takeUntilDestroyed\`** — оператор из \`@angular/core/rxjs-interop\`, который завершает поток, когда срабатывает \`DestroyRef\`; стабилен с Angular 19.
- **\`takeUntil(notifier)\`** — RxJS-оператор: пропускает значения, пока \`notifier\` не выдаст первое значение, затем завершает поток (\`complete\`) и отписывается от источника.
- **DI-контекст / injection context** — момент, когда Angular создаёт объект и функция \`inject()\` знает, из какого инжектора брать зависимости: инициализатор поля, конструктор, фабрика провайдера, функция в \`runInInjectionContext\`.
- **\`inject()\`** — функция, которая достаёт зависимость из текущего инжектора; вне DI-контекста бросает ошибку NG0203.
- **Инжектор (injector)** — «склад» зависимостей. Бывает инжектор элемента (компонент или директива, живёт вместе с ним) и environment-инжектор (корневой приложения, инжектор ленивого маршрута).
- **Горячий источник (hot observable)** — поток, который работает независимо от подписчиков: WebSocket, глобальный \`Subject\`, события DOM.

## Как это работает под капотом

Механизм по шагам:

1. Когда Angular создаёт компонент, у него есть внутреннее представление — LView (массив с данными view). В нём есть список «что сделать при уничтожении».
2. \`inject(DestroyRef)\` в компоненте возвращает тонкую обёртку над этим LView, поэтому \`destroyRef.onDestroy(cb)\` просто кладёт \`cb\` в этот список и возвращает функцию, которая уберёт колбэк обратно.
3. В сервисе, созданном environment-инжектором (корневым или инжектором маршрута), \`DestroyRef\` — это сам инжектор: колбэки сработают при его уничтожении.
4. Когда компонент уничтожается (ушли с маршрута, \`@if\` стал ложным, \`ref.destroy()\`), Angular вызывает \`ngOnDestroy\`, а затем проходит по списку \`DestroyRef\` в порядке регистрации. После этого \`destroyed === true\`, и попытка зарегистрировать новый колбэк бросает \`NG0911: View has already been destroyed\`.
5. \`takeUntilDestroyed(ref?)\` устроен почти дословно так: если \`ref\` не передан — берёт его через \`inject(DestroyRef)\` (поэтому нужен DI-контекст); создаёт поток-уведомитель, который выдаёт значение из \`onDestroy\`; подключает обычный \`takeUntil\`.
6. Значит, при уничтожении поток получает \`complete\`: срабатывают колбэк \`complete\`, \`finalize\`, функции очистки источника.

Упрощённая реализация (сверено с исходником Angular 21.1):

\`\`\`ts
function takeUntilDestroyed<T>(destroyRef?: DestroyRef) {
  if (!destroyRef) {
    destroyRef = inject(DestroyRef);          // ← отсюда требование DI-контекста
  }
  const destroyed$ = new Observable<void>(subscriber => {
    if (destroyRef.destroyed) {               // контекст уже мёртв — завершаемся сразу
      subscriber.next();
      return;
    }
    return destroyRef.onDestroy(() => subscriber.next()); // вернёт функцию отмены регистрации
  });
  return (source: Observable<T>) => source.pipe(takeUntil(destroyed$));
}
\`\`\`

### Пример 1. Старый способ — \`destroy$\` и \`ngOnDestroy\`

\`\`\`ts
export class WidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.svc.stream$.pipe(takeUntil(this.destroy$)).subscribe(v => this.handle(v));
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(p => this.load(p));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
\`\`\`

Работает, но в каждом компоненте четыре строки церемоний, а забытый \`takeUntil\` в одном из потоков — тихая утечка. Интервьюеры любят спросить именно про этот паттерн и про то, что его заменило.

### \`DestroyRef.onDestroy\` — очистка чего угодно

\`onDestroy\` годится не только для RxJS: таймеры, слушатели DOM, сторонние библиотеки с методом \`dispose()\`.

\`\`\`ts
export class ClockComponent {
  private destroyRef = inject(DestroyRef);
  time = signal(new Date());

  constructor() {
    const id = setInterval(() => this.time.set(new Date()), 1000);
    const unregister = this.destroyRef.onDestroy(() => {
      clearInterval(id);
      console.log('timer cleared');
    });
    // unregister() — если очистку нужно отменить заранее
  }
}
// компонент уничтожен → "timer cleared"
\`\`\`

Главный плюс перед \`ngOnDestroy\`: регистрировать очистку можно **рядом с кодом, который создаёт ресурс**, и даже в отдельной функции вне класса.

### Пример 2. Переиспользуемая функция с собственной очисткой

\`\`\`ts
export function injectWindowWidth(): Signal<number> {
  const width = signal(window.innerWidth);
  const onResize = () => width.set(window.innerWidth);
  window.addEventListener('resize', onResize);
  inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
  return width.asReadonly();
}

export class LayoutComponent {
  width = injectWindowWidth();   // поле класса = DI-контекст, очистка привяжется к компоненту
}
\`\`\`

С \`ngOnDestroy\` так не сделать: хук — метод класса, а \`DestroyRef\` достаётся из любого кода, выполняемого в DI-контексте. На этом построены \`toSignal\`, \`effect\` и многие утилиты библиотек.

### \`takeUntilDestroyed\` — без аргумента и с аргументом

Проверено в Angular 21.1 (компонент создан, получил значение, затем уничтожен):

\`\`\`ts
export class Widget {
  destroyRef = inject(DestroyRef);

  constructor() {
    stream$.pipe(takeUntilDestroyed())        // конструктор — DI-контекст, ref берётся сам
      .subscribe({ next: v => log('ctor got ' + v), complete: () => log('ctor: complete') });
  }

  ngOnInit() {
    try {
      stream$.pipe(takeUntilDestroyed()).subscribe();   // ❌ DI-контекста уже нет
    } catch (e) { log(e.message); }
    stream$.pipe(takeUntilDestroyed(this.destroyRef))   // ✅ ref передан явно
      .subscribe({ complete: () => log('ngOnInit: complete') });
  }

  ngOnDestroy() { log('ngOnDestroy'); }
}
// NG0203: takeUntilDestroyed() can only be used within an injection context such as
//         a constructor, a factory function, a field initializer, or a function used
//         with \`runInInjectionContext\` ...
// ctor got 1
// --- ref.destroy()
// ngOnDestroy
// ctor: complete
// ngOnInit: complete
\`\`\`

Именно это и показывает пример под ответом: в \`ngOnInit\` DI-контекста нет, поэтому \`DestroyRef\` заранее забирают полем класса и передают явно.

### Где есть DI-контекст

- **Инициализаторы полей класса** — \`data = toSignal(this.svc.data$)\`, \`sub = this.x$.pipe(takeUntilDestroyed()).subscribe()\`.
- **Конструктор** компонента, директивы, пайпа, сервиса.
- **Фабрики провайдеров** (\`useFactory\`) и \`InjectionToken\` с \`factory\`.
- **Функциональные гварды, резолверы, интерсепторы** — Angular вызывает их внутри DI-контекста. Но \`DestroyRef\` там — от environment-инжектора (корневого или маршрута), а не от компонента.
- **\`runInInjectionContext(injector, fn)\`** — вручную создаёт контекст для произвольной функции.

Нет DI-контекста: в хуках жизненного цикла (\`ngOnInit\`, \`ngAfterViewInit\`), в обработчиках событий, в \`subscribe\`, в \`setTimeout\`, после \`await\`.

### \`runInInjectionContext\` — контекст по требованию

\`\`\`ts
export class ReportsComponent {
  private injector = inject(Injector);

  onExportClick() {
    runInInjectionContext(this.injector, () => {
      this.export$.pipe(takeUntilDestroyed()).subscribe();   // ref возьмётся из инжектора
    });
  }
}
\`\`\`

Помогает, когда код уже написан «на \`inject()\`», а вызвать его нужно позже. Если взять \`inject(Injector)\` в компоненте, это будет инжектор элемента, и очистка привяжется к компоненту. Если передать environment-инжектор (\`app.injector\`), поток проживёт до уничтожения приложения.

### Какой \`DestroyRef\` вы получите

Проверено в Angular 21.1:

\`\`\`ts
@Injectable({ providedIn: 'root' }) class RootSvc { /* inject(DestroyRef).onDestroy(...) */ }
@Injectable() class LocalSvc { /* inject(DestroyRef).onDestroy(...) */ }

@Component({ providers: [LocalSvc], ... })
class Panel { root = inject(RootSvc); local = inject(LocalSvc); }

// panelRef.destroy():
//   LocalSvc: ngOnDestroy
//   Panel: ngOnDestroy
//   LocalSvc: DestroyRef fired      ← сервис уровня компонента умирает вместе с ним
// app.destroy():
//   RootSvc: ngOnDestroy
//   RootSvc: DestroyRef fired       ← root-сервис — только с приложением
\`\`\`

Вывод: \`takeUntilDestroyed()\` в root-сервисе почти никогда не срабатывает — приложение в браузере обычно не уничтожают. Для очистки на уровне экрана сервис провайдят в \`providers\` компонента или маршрута.

### Пример 3. Почему \`takeUntilDestroyed\` ставят последним

\`\`\`ts
// ❌ takeUntilDestroyed ДО switchMap
clicks$.pipe(
  takeUntilDestroyed(),
  switchMap(() => interval(10)),
).subscribe(v => log('bad tick ' + v));

// ✅ takeUntilDestroyed ПОСЛЕДНИМ
clicks$.pipe(
  switchMap(() => interval(10)),
  takeUntilDestroyed(),
).subscribe();

// после destroy компонента:
// good: complete, inner finalize   ← всё закрылось
// bad tick 2
// bad tick 3 ...                   ← внутренний interval тикает вечно
\`\`\`

\`takeUntil\` завершает **поток над собой**. \`switchMap\`, получив \`complete\` от источника, честно ждёт завершения текущего внутреннего потока — а \`interval\` не завершается никогда. Отсюда правило: оператор отписки — последним перед \`subscribe\`. Линтер может следить за этим сам: правило \`no-unsafe-takeuntil\` из \`eslint-plugin-rxjs\` (и его форка \`eslint-plugin-rxjs-x\`) через опцию \`alias\` настраивают и на \`takeUntilDestroyed\`.

### \`toSignal\` и \`effect\` — отписка уже встроена

\`\`\`ts
export class UserCard {
  user = toSignal(inject(UserService).user$);   // подписка закроется с компонентом
  constructor() {
    effect(() => console.log(this.user()));     // effect тоже уничтожится сам
  }
}
\`\`\`

Оба внутри берут \`DestroyRef\` текущего контекста. Чем больше данных идёт через сигналы и \`async\`-пайп, тем реже нужен ручной \`subscribe\` с \`takeUntilDestroyed\`.

### Где это применяется на практике

- **Подписки на \`valueChanges\` форм**: автосохранение черновика, зависимые поля (страна → города) — \`debounceTime\` + \`takeUntilDestroyed\`.
- **WebSocket и SSE** в дашбордах реального времени: закрыть соединение или отписаться от канала при уходе с экрана.
- **Подписки на \`router.events\` и \`paramMap\`** в компонентах, которые не уничтожаются при смене параметров.
- **Интеграция сторонних библиотек** (графики, карты, редакторы): \`chart.destroy()\` в \`onDestroy\`.
- **Сервисы уровня экрана** (\`providers\` компонента или маршрута): опрос сервера по \`interval\` прекращается при уходе со страницы.
- **Composable-функции** (\`injectWindowWidth\`, \`injectHotkeys\`): ресурс и его очистка в одной функции.

## Важные нюансы и подводные камни

- **\`takeUntilDestroyed()\` без аргумента в \`ngOnInit\`** — рантайм-ошибка NG0203 про injection context. Самый популярный вопрос по теме. Лечится полем \`destroyRef = inject(DestroyRef)\` и передачей его явно.
- **\`takeUntilDestroyed\` не последним в \`pipe\`.** Операторы после него (\`switchMap\`, \`mergeMap\`, \`shareReplay\`) продолжают работать: внутренние потоки живут после уничтожения компонента. Ставьте его прямо перед \`subscribe\`.
- **Сервис в \`providedIn: 'root'\`** живёт всё приложение, его \`DestroyRef\` сработает только при уничтожении приложения. Для покомпонентной очистки провайдьте сервис на уровне компонента или маршрута.
- **\`DestroyRef\` в функциональном гварде или интерсепторе** — это environment-инжектор, а не компонент. Подписка с \`takeUntilDestroyed()\` там проживёт столько же, сколько приложение или маршрут.
- **Горячие источники не закрываются сами.** Отписка — это «мне больше не присылать», а не «закрыть WebSocket». Если соединение открыл компонент, закрывайте его явно в \`onDestroy\` или в teardown своего \`Observable\`.
- **\`onDestroy\` в методе, который вызывается многократно**, копит колбэки: каждое нажатие кнопки добавит ещё один. Регистрируйте один раз или используйте возвращённую функцию отмены.
- **Регистрация после уничтожения** бросает \`NG0911: View has already been destroyed\`. Проверить заранее можно через \`destroyRef.destroyed\`; \`takeUntilDestroyed\` сам это учитывает и завершает поток сразу.
- **Порядок срабатывания.** В текущей версии сначала вызывается \`ngOnDestroy\`, затем колбэки \`DestroyRef\` в порядке регистрации. Строить логику на этом порядке не стоит — это деталь реализации.
- **\`takeUntilDestroyed\` завершает поток, а не «обрывает молча»**: подписчик получит \`complete\`, сработают \`finalize\` и \`tap({ complete })\`. Это удобно для логов и сброса флагов.
- Спросят про **сигналы**: \`toSignal\` и \`effect\` отписываются сами через тот же \`DestroyRef\` — ещё один аргумент отказаться от ручных подписок.

**Плюсы:** нет шаблонного \`destroy$\` и \`ngOnDestroy\`; очистка регистрируется рядом с ресурсом; работает в компонентах, директивах, сервисах и обычных функциях; \`onDestroy\` подходит для любых ресурсов, не только RxJS; функция отмены регистрации и флаг \`destroyed\`.
**Минусы:** без аргумента требует DI-контекст (ошибка NG0203 — частая ловушка); легко ошибиться с позицией в \`pipe\`; в root-сервисах и функциональных гвардах привязка к «долгому» инжектору не даёт ожидаемой очистки; не закрывает горячие источники сам по себе.

## Как это спрашивают на собеседовании

**Главный вывод:** \`DestroyRef\` — это список колбэков очистки текущего контекста (компонента, директивы, инжектора), а \`takeUntilDestroyed\` — \`takeUntil\`, уведомитель которого срабатывает из \`DestroyRef\`. Без аргумента он берёт \`DestroyRef\` через \`inject()\`, поэтому вызывается только в DI-контексте; в \`ngOnInit\` и колбэках \`DestroyRef\` передают явно.

Типичные формулировки: «Как правильно отписываться в Angular?», «Чем \`takeUntilDestroyed\` лучше \`destroy$\`?», «Почему \`takeUntilDestroyed()\` падает в \`ngOnInit\`?», «Что такое \`DestroyRef\`?».

Что могут спросить следом:

- *Где можно вызывать \`takeUntilDestroyed()\` без аргумента?* — В инициализаторе поля, конструкторе, фабрике провайдера, функциональном гварде и внутри \`runInInjectionContext\`.
- *Что будет, если поставить его перед \`switchMap\`?* — Внутренний поток переживёт компонент; оператор отписки ставят последним.
- *Когда сработает \`DestroyRef\` в root-сервисе?* — Только при уничтожении приложения, то есть практически никогда.
- *Чем \`onDestroy\` удобнее \`ngOnDestroy\`?* — Очистку можно зарегистрировать из любой функции в DI-контексте, рядом с созданием ресурса, и отменить регистрацию.
- *Нужен ли \`takeUntilDestroyed\` с \`async\`-пайпом или \`toSignal\`?* — Нет, они отписываются сами.

### Ответ на 1 минуту

> \`DestroyRef\` — это инжектируемый объект, который даёт доступ к моменту уничтожения текущего контекста: компонента, директивы или инжектора. Через \`onDestroy\` я регистрирую колбэк очистки — для таймеров, слушателей, сторонних библиотек, — причём прямо рядом с кодом, который создаёт ресурс, даже в отдельной функции. \`takeUntilDestroyed\` построен поверх: это \`takeUntil\`, уведомитель которого срабатывает из \`DestroyRef\`, поэтому поток получает \`complete\` при уничтожении. Он заменил паттерн с \`destroy$\`-Subject и \`ngOnDestroy\`. Ключевой нюанс: без аргумента он делает \`inject(DestroyRef)\`, значит работает только в DI-контексте — поле класса, конструктор, фабрика, \`runInInjectionContext\`; в \`ngOnInit\` будет ошибка NG0203, там я передаю \`DestroyRef\`, сохранённый в поле. Ещё ставлю его последним в \`pipe\`, иначе внутренние потоки \`switchMap\` переживут компонент, и помню, что в root-сервисе он сработает только с уничтожением приложения.`,
      en: `## In short

\`DestroyRef\` is a **"things to do at checkout" list** for one specific component, directive or service. You register callbacks on it and Angular runs them at destruction time. \`takeUntilDestroyed\` is a ready-made RxJS operator built on top: the subscription completes itself.

Analogy: **checking out of a hotel**. You used to run around cancelling the alarm call, the spa booking and breakfast by hand (that is the \`destroy$\` Subject plus \`ngOnDestroy\`). Now reception keeps a list: hand back the key and everything is cancelled automatically.

## How it works, step by step

1. The old way: declare \`private destroy$ = new Subject<void>()\`, call \`next()\` and \`complete()\` in \`ngOnDestroy\`, and add \`takeUntil(this.destroy$)\` to every stream. Lots of boilerplate, and one forgotten \`takeUntil\` equals a leak.
2. Now you inject \`DestroyRef\` — a token giving access to the destruction moment of the **current** context.
3. You call \`destroyRef.onDestroy(cb)\` — the callback joins the cleanup queue.
4. When Angular destroys the component/directive/service, it walks that queue and runs every callback.
5. \`takeUntilDestroyed()\` does the same for you: internally it grabs \`DestroyRef\` and completes the stream on destruction.

## Example

\`\`\`ts
private destroyRef = inject(DestroyRef);
ngOnInit() {
  const id = setInterval(tick, 1000);
  this.destroyRef.onDestroy(() => clearInterval(id));
}
\`\`\`

\`\`\`ts
this.data$
  .pipe(takeUntilDestroyed()) // in constructor/field — grabs DestroyRef itself
  .subscribe();
\`\`\`

Why it looks like this: \`onDestroy\` suits **any** cleanup — timers, listeners, WebSockets — not just RxJS. \`takeUntilDestroyed\` is the special, and by far the most common, case.

## Where you can call it

- **Without an argument** \`takeUntilDestroyed()\` must be called in an **injection context**: a class field initializer or the constructor. Only there is \`inject()\` available, which is how it obtains \`DestroyRef\`.
- **Outside** an injection context — in \`ngOnInit\`, in a callback, inside a method — you must pass the reference explicitly: \`takeUntilDestroyed(this.destroyRef)\`, with \`destroyRef\` captured earlier as a class field.
- The same rule governs \`inject()\` in general: the context exists while the instance is being created, not at an arbitrary later moment.

## What to say in the interview

> \`DestroyRef\` is an injectable token giving access to the destruction moment of the current DI context: a component, a directive or a service with the same lifecycle. Its \`onDestroy\` method registers a cleanup callback, which is handy not only for RxJS but for timers, listeners and sockets. On top of it sits the \`takeUntilDestroyed\` operator, which completes a subscription automatically when the context is destroyed and replaces the classic pattern with a \`destroy$\` Subject and \`takeUntil\` in \`ngOnDestroy\`. The important nuance is where you call it: without an argument it must run in an injection context, i.e. a field initializer or the constructor, because it uses \`inject()\` internally; in \`ngOnInit\` or a callback you have to pass the \`DestroyRef\` explicitly. It works for any DI context, including services provided at component level and destroyed along with the component. It does not remove the need to complete hot sources, and combined with signals and \`toSignal\` unsubscription is automatic, so manual \`takeUntilDestroyed\` is needed less and less.

## Gotchas

- **\`takeUntilDestroyed()\` with no argument inside \`ngOnInit\`** throws an injection-context runtime error. The most popular question on this topic.
- **\`takeUntilDestroyed\` not last in the \`pipe\`** — operators after it keep working; put it as close to \`subscribe\` as possible.
- **A \`providedIn: 'root'\` service** lives for the whole app, so its \`DestroyRef\` fires only when the app is destroyed — for per-component cleanup, provide the service at component level.
- **Hot sources** (a global \`Subject\`, a WebSocket) do not close themselves — unsubscribing is not the same as completing the source.
- **\`onDestroy\` registers once**: calling it inside a method that runs repeatedly piles up callbacks.
- They will ask about **signals**: \`toSignal\` unsubscribes on its own, which is another argument for dropping manual subscriptions.`,
    },
    codeSnippet: `export class WidgetComponent {
  private destroyRef = inject(DestroyRef);
  private svc = inject(DataService);

  ngOnInit() {
    this.svc.stream$
      .pipe(takeUntilDestroyed(this.destroyRef)) // explicit ref outside ctor
      .subscribe(v => this.handle(v));
  }
}`,
  },
  {
    id: 'ng-048',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['effect', 'untracked', 'computed-equality'],
    question: {
      ru: 'Как работают cleanup в effect, untracked и кастомное equality у computed?',
      en: 'How do effect cleanup, untracked and custom computed equality work?',
    },
    answer: {
      ru: `## В чём суть

Это три тонких инструмента реактивности сигналов, и каждый лечит свою болезнь. \`onCleanup\` в \`effect\` убирает за предыдущим запуском эффекта (отменяет запрос, таймер, подписку), прежде чем начнётся следующий. \`untracked\` позволяет прочитать сигнал, не подписываясь на него. Опция \`equal\` у \`computed\` (и у \`signal\`) решает, считать ли новое значение «изменившимся» — и тем самым гасит лишние пересчёты дальше по цепочке.

Аналогия: **помощник, который переделывает работу, когда меняются входные данные**. \`onCleanup\` — «прежде чем переделывать, отмени то, что начал в прошлый раз: позвони в типографию и отзови старый заказ». \`untracked\` — «посмотри на настенные часы, но не подписывайся на уведомления от них». \`equal\` — вахтёр, который сравнивает новый список гостей со старым: «состав тот же, рассадку не переделываем».

**Какую проблему решает.** Сигналы сами отслеживают, кто что читает, и сами перезапускают зависящий код. Это удобно, пока не начинаются три типичные беды: эффект делает асинхронную работу, и старые запросы догоняют новые (гонка); эффект перезапускается от сигналов, которые он читал «просто посмотреть»; вычисление возвращает новый массив с теми же данными, и всё, что от него зависит, пересчитывается и перерисовывается впустую. Эти три механизма — штатные ответы Angular на каждую из бед.

## Словарик терминов

- **Сигнал (\`signal\`)** — реактивная переменная: хранит значение, читается вызовом \`count()\`, меняется через \`set\` / \`update\`, а при изменении уведомляет всех, кто её читал.
- **\`computed\`** — производный сигнал: значение вычисляется функцией из других сигналов, кэшируется и пересчитывается лениво, только когда входы изменились и кто-то его читает.
- **\`effect\`** — функция с побочными эффектами (запрос, лог, запись в \`localStorage\`), которая сама перезапускается, когда меняются прочитанные в ней сигналы. Стабилен с Angular 20.
- **Зависимость и автоматическое отслеживание (dependency tracking)** — любой сигнал, прочитанный во время выполнения \`computed\` или \`effect\`, автоматически становится его зависимостью.
- **Граф реактивности (producer / consumer)** — сеть связей «кто от кого зависит»: сигналы — производители (producer), \`computed\` и \`effect\` — потребители (consumer).
- **\`onCleanup\` (\`EffectCleanupRegisterFn\`)** — функция, которую \`effect\` передаёт в свой колбэк; через неё регистрируют уборку перед следующим запуском и при уничтожении эффекта.
- **\`untracked(fn)\`** — выполняет \`fn\`, отключив отслеживание: прочитанные внутри сигналы не становятся зависимостями.
- **Функция равенства (\`equal\`, \`ValueEqualityFn\`)** — \`(a, b) => boolean\`; по умолчанию \`Object.is\`, то есть сравнение по ссылке для объектов.
- **\`Object.is\`** — строгое сравнение, похожее на \`===\`; два разных массива с одинаковым содержимым для него разные.
- **Гонка запросов (race condition)** — ответ на старый запрос приходит позже ответа на новый и затирает свежие данные.
- **\`AbortController\`** — браузерный объект для отмены \`fetch\`: \`controller.abort()\` прерывает запрос, переданный с \`signal: controller.signal\`.
- **\`EffectRef\`** — то, что возвращает \`effect()\`; метод \`destroy()\` останавливает эффект вручную.

## Как это работает под капотом

Механизм по шагам:

1. У системы сигналов есть глобальная переменная «активный потребитель» (active consumer). Перед запуском своей функции \`computed\` или \`effect\` записывает туда себя.
2. Когда во время выполнения читается сигнал, он смотрит на активного потребителя и регистрирует связь «этот потребитель зависит от меня». Поэтому зависимости находятся сами — по факту чтения, а не по объявлению.
3. \`untracked(fn)\` просто временно обнуляет активного потребителя: сигналы внутри \`fn\` читаются, но связь не создаётся.
4. При \`set\` сигнал сравнивает новое значение со старым через \`equal\`. Равны — ничего не происходит. Не равны — значение и номер версии обновляются, а все потребители помечаются «грязными» (dirty).
5. \`computed\` пересчитывается лениво — при следующем чтении. Новый результат он тоже сравнивает со старым через свой \`equal\`. Если функция сказала «равны», \`computed\` **оставляет старое значение и не меняет версию** — потребители ниже видят «ничего не изменилось» и не пересчитываются.
6. \`effect\` не запускается синхронно в момент \`set\`: Angular планирует его и выполняет при ближайшей проверке изменений (change detection). Несколько \`set\` подряд дадут один запуск с последним значением.
7. Перед каждым повторным запуском и при уничтожении эффекта вызываются все колбэки, зарегистрированные через \`onCleanup\` на прошлом запуске — в обратном порядке и с выключенным отслеживанием.

Упрощённая модель, по которой это легко запомнить:

\`\`\`ts
let activeConsumer: Consumer | null = null;

function untracked<T>(fn: () => T): T {
  const prev = activeConsumer;
  activeConsumer = null;             // никто не подписывается
  try { return fn(); } finally { activeConsumer = prev; }
}

function recomputeComputed(node) {
  const newValue = node.computation();          // зависимости собираются тут
  if (node.hasValue && node.equal(node.value, newValue)) {
    return;                                     // старое значение и версия остаются
  }
  node.value = newValue;
  node.version++;                               // потребители увидят изменение
}

function runEffect(node) {
  while (node.cleanupFns.length) node.cleanupFns.pop()();  // уборка, LIFO
  node.fn((cleanup) => node.cleanupFns.push(cleanup));      // новый запуск
}
\`\`\`

### Пример 1. Эффект сам находит зависимости и запускается асинхронно

Все выводы в этой статье проверены на Angular 21.1:

\`\`\`ts
const n = signal(1);
effect(() => console.log(\`effect sees n=\${n()}\`));
// effect sees n=1        ← первый запуск при ближайшей проверке изменений

n.set(2);
n.set(3);
// effect sees n=3        ← один запуск: промежуточное 2 эффект не увидел
\`\`\`

Отсюда важное следствие: \`effect\` не подходит для логики «отреагировать на **каждое** изменение» — он видит только итоговое состояние на момент запуска.

### \`onCleanup\` — уборка перед следующим запуском

Колбэк эффекта получает аргумент — функцию регистрации уборки. Всё, что в неё передано, выполнится перед следующим запуском этого эффекта и один раз при его уничтожении:

\`\`\`ts
const query = signal('a');
const ref = effect((onCleanup) => {
  const q = query();
  console.log(\`run \${q}\`);
  onCleanup(() => console.log(\`cleanup \${q}\`));
});
// run a
query.set('b');   // cleanup a, run b
query.set('c');   // cleanup b, run c
ref.destroy();    // cleanup c
query.set('d');   // ничего: эффект уничтожен
\`\`\`

Колбэк уборки — замыкание, поэтому он «помнит» значение своего запуска: \`cleanup a\` отменяет именно то, что запустил \`run a\`. Для эффекта внутри компонента \`destroy()\` вызывать не нужно — он уничтожится вместе с компонентом через \`DestroyRef\`.

### Пример 2. Гонка запросов и \`AbortController\`

Пусть запрос по \`"a"\` идёт 100 мс, а по \`"ab"\` — 30 мс (пользователь быстро допечатал букву):

\`\`\`ts
// search(q, signal) — обёртка над fetch(\`/api/search?q=\${q}\`, { signal })
effect((onCleanup) => {
  const q = query();
  const ctrl = new AbortController();
  onCleanup(() => { console.log(\`abort "\${q}"\`); ctrl.abort(); }); // ← без этой строки будет гонка
  search(q, ctrl.signal)
    .then(r => { results.set(r); console.log(\`results = \${r}\`); })
    .catch(e => console.log(\`"\${q}": \${e.name}\`));
});
query.set('ab');   // через 10 мс после "a"

// без onCleanup:
//   results = results for "ab"
//   results = results for "a"     ← старый ответ пришёл позже и затёр свежий
//   (итог: results() === 'results for "a"')
// с onCleanup:
//   abort "a"                     ← старый запрос отменён до старта нового
//   "a": AbortError
//   results = results for "ab"
//   (итог: results() === 'results for "ab"')
\`\`\`

Это ровно та же проблема, которую в RxJS решает \`switchMap\`: новый запрос отменяет предыдущий. В мире сигналов отмену приходится описать самому — через \`onCleanup\`.

### Несколько \`onCleanup\` в одном запуске

Регистрировать можно несколько колбэков. Они выполняются в **обратном** порядке, как стек — что логично: последний открытый ресурс закрывается первым.

\`\`\`ts
effect((onCleanup) => {
  x();
  onCleanup(() => console.log('cleanup 1'));
  onCleanup(() => console.log('cleanup 2'));
});
x.set(2);
// cleanup 2
// cleanup 1
\`\`\`

Внутри колбэка уборки отслеживание выключено: чтение сигналов там не создаёт зависимостей.

### Подписка RxJS внутри эффекта

Пример под ответом использует ту же идею для потока: на каждый новый \`query()\` создаётся подписка, а старая закрывается в \`onCleanup\`.

\`\`\`ts
effect((onCleanup) => {
  const sub = stream(query()).subscribe();
  onCleanup(() => sub.unsubscribe());   // при смене query старая подписка закрывается
});
\`\`\`

Без уборки каждая смена \`query\` оставляла бы живую подписку, и через десять изменений их было бы десять. Если таких мест много, удобнее перевести всю цепочку на RxJS: \`toObservable(query)\` превращает сигнал в Observable, а \`switchMap\` сам отменяет предыдущую подписку — \`toObservable(query).pipe(switchMap(q => stream(q)))\`. Или на \`resource\` (о нём ниже).

### \`untracked\` — прочитать, не подписываясь

\`\`\`ts
const data = signal(1);
const config = signal('cfg-A');

effect(() => {
  const v = data();                          // зависимость
  const c = untracked(() => config());       // НЕ зависимость
  console.log(\`effect: data=\${v}, config=\${c}\`);
});
// effect: data=1, config=cfg-A
config.set('cfg-B');   // эффект не перезапустился
data.set(2);
// effect: data=2, config=cfg-B   ← при запуске прочитано актуальное значение
\`\`\`

Эффект реагирует только на то, что действительно является причиной перезапуска (\`data\`), а «справочные» значения (\`config\`, текущий пользователь, настройки) берёт свежими, но без подписки. \`untracked\` не замораживает значение — он возвращает актуальное на момент вызова.

### Пример 3. Скрытая зависимость через вспомогательную функцию

Самая коварная ловушка: сигнал читается не в самом эффекте, а в функции, которую он вызывает.

\`\`\`ts
const user = signal('Ann');
const page = signal(1);
const logVisit = (p: number) => console.log(\`visit page \${p} by \${user()}\`);

effect(() => logVisit(page()));
// visit page 1 by Ann
user.set('Bob');
// visit page 1 by Bob     ← сменился пользователь, а не страница — эффект всё равно сработал

effect(() => {
  const p = page();
  untracked(() => logVisit(p));      // всё внутри — без отслеживания
});
user.set('Cid');                     // эффект не запускается
\`\`\`

Отслеживание работает по факту чтения во время выполнения, на любой глубине вызовов. Поэтому правило: в эффекте явно прочитайте сигналы-причины, а вызовы сервисов, логгеров и сторонних методов оборачивайте в \`untracked\`.

### Запись в сигналы внутри \`effect\`

С Angular 19 запись в сигналы из эффекта разрешена по умолчанию, а опция \`allowSignalWrites\` объявлена устаревшей и ничего не делает (в 17–18 без неё была ошибка). Но опасность осталась: если эффект **читает и пишет один и тот же сигнал**, он перезапускает сам себя.

\`\`\`ts
const count = signal(0);
effect(() => count.set(count() + 1));
// бесконечный цикл: в Angular 21.1 проверено 100 000 перезапусков подряд —
// ни ошибки, ни предупреждения, вкладка просто зависает

effect(() => { trigger(); count.update(v => v + 1); });
// один запуск на каждое изменение trigger: update читает старое значение без отслеживания

effect(() => { const t = trigger(); count.set(untracked(() => count()) + t); });
// то же самое через untracked
\`\`\`

Запись в сигнал внутри \`computed\` — другое дело: она запрещена и сразу бросает \`NG0600: Writing to signals is not allowed in a computed\`. Обёрнутая в \`untracked\`, запись внутри \`computed\` формально не падает, но это антипаттерн: \`computed\` должен быть чистой функцией. Если значение выводится из других сигналов — это работа для \`computed\` или \`linkedSignal\` (записываемый сигнал, который сам пересчитывается из источника при его смене, но его можно и поправить вручную через \`set\`), а не для эффекта с \`set\`:

\`\`\`ts
// ❌ эффект синхронизирует один сигнал с другим
effect(() => selectedId.set(items()[0]?.id));

// ✅ linkedSignal: по умолчанию первый элемент, пользователь может выбрать другой
const selectedId = linkedSignal(() => items()[0]?.id);
selectedId.set(42);   // ручной выбор; при смене items снова станет items()[0]?.id
\`\`\`

### \`equal\` у \`computed\` — гасим пустые пересчёты

\`\`\`ts
const items = signal([{ id: 1, active: true }, { id: 2, active: false }]);

const activeIds = computed(() => items().filter(i => i.active).map(i => i.id));
const activeIdsEq = computed(
  () => items().filter(i => i.active).map(i => i.id),
  { equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]) },
);
effect(() => { activeIds(); runsDefault++; });
effect(() => { activeIdsEq(); runsEq++; });
// after init: default effect runs=1, equal effect runs=1

items.update(list => list.map(i => i.id === 2 ? { ...i } : i));  // новый массив, те же активные id
// after same-content update: default runs=2, equal runs=1
\`\`\`

\`filter\` и \`map\` всегда возвращают новый массив, поэтому для \`Object.is\` результат «изменился», и всё ниже по графу — эффекты, другие \`computed\`, шаблон — пересчитывается. Своя функция \`equal\` сравнивает по содержимому, и цепочка останавливается на этом узле. Сам \`computed\` при этом пересчитался — \`equal\` экономит работу **потребителей**, а не его собственную.

### Пример 4. \`equal\` возвращает старое значение

Это прямо касается примера под ответом: \`computed(() => expensiveTransform(source()), { equal: (a, b) => a.id === b.id })\`.

\`\`\`ts
const src = signal({ id: 1, title: 'Draft' });
const result = computed(() => ({ ...src() }), { equal: (a, b) => a.id === b.id });

result();                                // {"id":1,"title":"Draft"}
src.set({ id: 1, title: 'Published' });
result();                                // {"id":1,"title":"Draft"}  ← старый объект!
\`\`\`

Комментарий в сниппете «skip recompute when id is stable» надо читать точно: \`expensiveTransform\` всё равно выполнится при каждом изменении \`source\`, а пропускаются пересчёты **зависящих** узлов. И раз \`equal\` вернул \`true\`, \`computed\` хранит прежний объект — изменения других полей наружу не попадут. Такой \`equal\` честен, только если для потребителей объекты с одинаковым \`id\` действительно взаимозаменяемы.

### \`equal\` у \`signal\`

Та же опция есть у обычного сигнала — она срабатывает прямо в \`set\`:

\`\`\`ts
const pos = signal({ x: 0, y: 0 }, { equal: (a, b) => a.x === b.x && a.y === b.y });
effect(() => { pos(); posRuns++; });   // posRuns = 1
pos.set({ x: 0, y: 0 });               // posRuns = 1 — «то же самое», уведомлений нет
pos.set({ x: 5, y: 0 });               // posRuns = 2
\`\`\`

Полезно, когда новые объекты приходят извне (WebSocket, polling) и чаще всего совпадают со старыми.

### Мутация не видна никакому \`equal\`

\`\`\`ts
const arr = signal([1, 2]);
arr().push(3);
arr.set(arr());          // та же ссылка → Object.is === true → эффект не запустился
// value=[1,2,3], runs=1
arr.update(a => [...a, 4]);
// runs=2
\`\`\`

Ни дефолтное сравнение, ни своя функция тут не помогут: старое и новое значение — один и тот же объект, сравнивать нечего. Сигналы рассчитаны на иммутабельные обновления — новая ссылка на каждое изменение.

### \`resource\` — когда эффект с \`fetch\` вообще не нужен

Для загрузки данных по сигналу в Angular есть \`resource\` (в 21.1 помечен \`@experimental\`) и \`rxResource\` для Observable. Отмена устаревшей загрузки там встроена через \`abortSignal\`:

\`\`\`ts
const results = resource({
  params: () => query(),
  loader: ({ params, abortSignal }) =>
    fetch(\`/api/search?q=\${params}\`, { signal: abortSignal }).then(r => r.json()),
});
// query: "a" → "ab":
//   load "a"
//   aborted "a"
//   load "ab"
//   value=results for "ab" status=resolved
\`\`\`

Если задача — «загрузить данные по параметрам», \`resource\` честнее, чем \`effect\` + \`onCleanup\` + ручные \`isLoading\` и \`error\`.

### Где это применяется на практике

- **Поиск и автокомплит** на сигналах: \`onCleanup\` с \`AbortController\` или \`resource\`, чтобы ответы не перемешивались.
- **Интеграция с императивными библиотеками** (графики, карты, редакторы): эффект пересоздаёт виджет при смене конфигурации, \`onCleanup\` вызывает \`chart.destroy()\`.
- **Синхронизация с \`localStorage\` и аналитикой**: эффект реагирует на фильтры таблицы, а текущего пользователя и настройки читает через \`untracked\`.
- **Большие таблицы и дашборды**: \`computed\` со списком отфильтрованных id, видимых колонок или агрегатов с \`equal\` по содержимому — шаблон не перерисовывается, когда пришёл тот же набор.
- **Данные из WebSocket и polling**: \`signal\` с \`equal\` по ключевым полям — повторные одинаковые сообщения не будят всё дерево.
- **Таймеры и подписки, зависящие от сигналов**: \`setInterval\` с частотой из настроек, подписка на канал по выбранному id — с уборкой в \`onCleanup\`.

## Важные нюансы и подводные камни

- **\`untracked\` не «замораживает» значение.** Он вернёт актуальное на момент вызова, просто не создаст зависимость. Частое заблуждение.
- **Скрытые зависимости через вызовы функций.** Сервис, логгер или геттер, читающий сигнал внутри эффекта, молча добавляет зависимость. Оборачивайте такие вызовы в \`untracked\`.
- **Чтение и запись одного сигнала в эффекте — бесконечный цикл.** С Angular 19 запись разрешена, \`allowSignalWrites\` устарел, и защиты от зацикливания нет. Используйте \`update\`, \`untracked\` или перенесите логику в \`computed\` / \`linkedSignal\`.
- **Запись в \`computed\` запрещена** — \`NG0600\`. Обход через \`untracked\` технически не падает, но ломает идею чистого вычисления.
- **\`onCleanup\` не вызывается для «текущего» запуска** — только перед следующим и при уничтожении. Логика «отменить прямо сейчас» так не пишется.
- **Забыть \`onCleanup\` при \`fetch\`** — классическая гонка: ответ на старый запрос приходит позже нового и затирает свежие данные.
- **Несколько \`onCleanup\` выполняются в обратном порядке**, и чтения сигналов в них не отслеживаются.
- **Эффект асинхронен.** Несколько \`set\` подряд дают один запуск с итоговым значением; промежуточные состояния эффект не видит.
- **Тяжёлая \`equal\`-функция** может стоить дороже, чем лишний пересчёт. Глубокое сравнение большого дерева на каждый пересчёт — почти всегда плохая идея; сравнивайте длину и ссылки элементов или версию.
- **\`equal\` хранит старое значение.** Если функция сравнивает не все значимые поля (как \`a.id === b.id\`), потребители увидят устаревший объект.
- **\`equal\` не экономит работу самого \`computed\`** — функция вычисления выполнится, экономия только ниже по графу.
- **\`equal\` не сделает мутацию видимой**: если вы мутируете массив по той же ссылке, сигнал изменения вообще не увидит — тут поможет только новая ссылка.
- Спросят разницу с RxJS: \`untracked\` — это про **граф зависимостей**, а не про «пропустить эмит»; по смыслу похоже на \`withLatestFrom\`, но прямого аналога нет. \`equal\` ближе всего к \`distinctUntilChanged(comparator)\`, а \`onCleanup\` с отменой — к \`switchMap\`.

**Плюсы:** точный контроль над тем, что перезапускает эффект; штатное место для отмены запросов, таймеров и подписок; \`equal\` останавливает лишние пересчёты и перерисовки на нужном узле графа; всё работает без RxJS и без ручных флагов.
**Минусы:** зависимости неявные и легко «подцепляются» через вызовы функций; нет защиты от цикла «прочитал-записал»; \`equal\` может вернуть устаревший объект и сам стоит времени; отмену асинхронной работы приходится писать руками (или переходить на экспериментальный \`resource\`).

## Как это спрашивают на собеседовании

**Главный вывод:** \`onCleanup\` вызывается перед каждым повторным запуском эффекта и при его уничтожении — туда кладут \`abort\`, \`clearInterval\`, \`unsubscribe\`. \`untracked\` читает сигнал без создания зависимости. \`equal\` у \`computed\` и \`signal\` заменяет \`Object.is\`: если он вернул \`true\`, значение считается прежним, и потребители ниже не пересчитываются.

Типичные формулировки: «Как отменить запрос в \`effect\` при смене сигнала?», «Почему мой эффект срабатывает слишком часто?», «Зачем \`equal\` у \`computed\`?», «Что делает \`untracked\`?».

Что могут спросить следом:

- *Можно ли писать в сигнал внутри \`effect\`?* — С Angular 19 да, без флагов; но чтение и запись одного сигнала зациклят эффект, Angular этого не ловит.
- *В каком порядке вызываются несколько \`onCleanup\`?* — В обратном порядке регистрации, перед следующим запуском или при уничтожении.
- *Пересчитается ли сам \`computed\`, если \`equal\` вернёт \`true\`?* — Да, функция выполнится; не пересчитаются только его потребители, и он сохранит старое значение.
- *Чем \`untracked\` отличается от того, чтобы просто не читать сигнал?* — Значение вы получаете актуальное, просто эффект на него не подписывается.
- *Что лучше для загрузки данных по сигналу?* — \`resource\` или \`rxResource\`: отмена через \`abortSignal\` и статусы загрузки встроены.

### Ответ на 1 минуту

> Колбэк \`effect\` получает функцию \`onCleanup\`: всё, что я в неё передам, вызовется перед следующим запуском эффекта и при его уничтожении, причём в обратном порядке. Туда я кладу \`AbortController.abort\`, \`clearInterval\` или \`unsubscribe\` — иначе при смене сигнала старый запрос может прийти позже нового и затереть свежие данные. \`untracked\` нужен, потому что любой сигнал, прочитанный во время эффекта или \`computed\`, даже внутри вызванной функции, автоматически становится зависимостью; обернув чтение в \`untracked\`, я получаю актуальное значение без подписки. Опция \`equal\` у \`computed\` и \`signal\` заменяет сравнение \`Object.is\`: новый массив с тем же содержимым иначе считается изменением, а своя функция возвращает \`true\`, и потребители ниже не пересчитываются. Нюансы: сам \`computed\` всё равно пересчитается и сохранит старый объект, а чтение и запись одного сигнала в эффекте зацикливают его без всякого предупреждения.`,
      en: `## In short

Three fine-grained tools of signal reactivity, each solving its own problem.

The analogy is **an assistant who redoes a job whenever the inputs change**. \`onCleanup\` says "before redoing it, cancel what you started last time". \`untracked\` says "glance at the wall clock, but don't subscribe to notifications from it". \`equal\` is the doorman comparing two guest lists and saying "same people, no need to redo the seating".

## The three mechanisms

1. **Cleanup in \`effect\`.** The effect callback receives an \`onCleanup\` function. Whatever you pass into it runs **before every** re-run of the effect and once on destruction. It is the sanctioned place to cancel timers, subscriptions and in-flight HTTP requests.
2. **\`untracked\`.** By default **any** signal read inside an \`effect\` or \`computed\` automatically becomes a dependency. Wrapping the read in \`untracked(() => ...)\` reads the value **without** registering a dependency — a change to it will not re-run the effect.
3. **A custom \`equal\` on \`computed\`.** Signals compare the old and new value with \`Object.is\`. For objects and arrays that means **a new reference holding the same data** counts as a change and drags a recompute down the whole graph. The \`equal\` option supplies your own comparator.

## Example

\`\`\`ts
effect((onCleanup) => {
  const ctrl = new AbortController();
  fetch(url(), { signal: ctrl.signal });
  onCleanup(() => ctrl.abort());
});

effect(() => {
  const value = data();                  // dependency
  const cfg = untracked(() => config()); // NOT a dependency
  log(value, cfg);
});

const list = computed(() => filter(items()), {
  equal: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]),
});
\`\`\`

Why it looks like this: in the first effect, when \`url()\` changes the old request is **aborted** before the new one starts — otherwise you get a race and a stale response can overwrite the fresh one. In the second, the effect reacts to \`data\` but reads the "current" \`config\` without subscribing to it. In the third, if \`equal\` returns \`true\` the value counts as unchanged and dependent \`computed\`s, effects and the template do **not** recompute.

## Why you actually need it

- **onCleanup** is the only correct way not to leave loose ends when an effect re-runs often: request races, piled-up \`setInterval\`s, live subscriptions.
- **untracked** cures "my effect re-runs far too often". It separates what you react to from what you merely read. It is also how you safely call a method or write something inside a \`computed\` without dragging extra dependencies into the graph.
- **equal** cures "everything recomputes even though the data is identical". Especially with arrays rebuilt on every request: compare by content and the whole tail of dependents stays untouched, saving change detection.

## What to say in the interview

> An \`effect\` callback takes an \`onCleanup\` function, invoked before every re-run and on destruction of the effect — that is where \`AbortController.abort\`, \`clearInterval\` and unsubscribes go, so restarted runs do not race each other. \`untracked\` exists because by default any signal read inside an \`effect\` or \`computed\` automatically becomes a dependency: wrapping the read in \`untracked\` gives you the current value without subscribing to it, so there are no superfluous re-runs. It is also used to call a method outside reactive tracking inside a computed. Finally, \`signal\` and \`computed\` accept an \`equal\` option: comparison defaults to \`Object.is\`, so a new array with identical content counts as a change; a custom comparator can return \`true\`, and then dependent computeds, effects and the template do not recompute, which saves change detection. That said, an overly heavy \`equal\` can cost more than the redundant recompute, so it is a question of measurement.

## Gotchas

- **\`untracked\` does not "freeze" the value** — it returns the value current at call time, it just does not create a dependency. A common misconception.
- **A heavy \`equal\` function** can cost more than the extra recompute. Deep-comparing a large tree is almost always a bad idea.
- **Writing to a signal inside an \`effect\`** without \`untracked\` easily creates a loop; Angular complains about such writes for a reason.
- **\`onCleanup\` does not fire for the current run** — only before the next one and on destruction. "Cancel right now" cannot be written this way.
- **Forgetting \`onCleanup\` around a \`fetch\`** is the classic race: the stale response lands after the fresh one and overwrites good data.
- **\`equal\` will not make a mutation visible**: mutate an array under the same reference and the signal sees no change at all — only a new reference helps.
- They will ask how it maps to RxJS: \`untracked\` is about the **dependency graph**, not about skipping an emission — there is no direct \`withLatestFrom\` here, even if the intent rhymes.`,
    },
    codeSnippet: `const result = computed(
  () => expensiveTransform(source()),
  { equal: (a, b) => a.id === b.id }, // skip recompute when id is stable
);

effect((onCleanup) => {
  const sub = stream(query()).subscribe();
  onCleanup(() => sub.unsubscribe());
});`,
  },
  {
    id: 'ng-049',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['forms', 'form-array', 'value-changes', 'update-on'],
    question: {
      ru: 'Как работать с FormArray, updateOn и valueChanges в типизированных реактивных формах?',
      en: 'How do you work with FormArray, updateOn and valueChanges in typed reactive forms?',
    },
    answer: {
      ru: `## В чём суть

\`FormArray\` — это **список контролов переменной длины**: элементы адресуются по номеру, а не по имени, и их можно добавлять и удалять во время работы. \`updateOn\` говорит, **когда** значение из поля ввода попадает в контрол и запускаются валидаторы: на каждое нажатие, при уходе из поля или только при отправке формы. \`valueChanges\` — поток (Observable), который выдаёт новое значение после каждого такого обновления; в типизированных формах он сразу знает тип значения.

Аналогия: \`FormGroup\` — **печатный бланк** с заранее заданными полями «Имя», «Дата рождения». \`FormArray\` — **нумерованный список**, куда вы дописываете строки ручкой: телефон 1, телефон 2, телефон 3. А \`updateOn\` — это момент, когда кассир пробивает чек: на каждый товар (\`change\`), когда лента закончилась (\`blur\`) или только когда вы нажали «оплатить» (\`submit\`). \`valueChanges\` — табло над кассой, на котором после каждого пробития загорается новая сумма.

**Какую проблему решает.** Реальные формы почти никогда не бывают фиксированными: несколько телефонов, строки счёта, участники мероприятия, условия фильтра. Без \`FormArray\` пришлось бы генерировать имена полей (\`phone1\`, \`phone2\`…) и вручную собирать массив. Без \`updateOn\` асинхронный валидатор «логин свободен?» стрелял бы на каждую букву, а пользователя ругали бы за незаконченный ввод. Без \`valueChanges\` нельзя было бы реактивно сделать автосохранение, зависимые поля (страна → города) или пересчёт итогов. А типизация (Angular 14+) ловит на этапе компиляции опечатки и \`null\` там, где их быть не должно.

## Словарик терминов

- **Реактивные формы (Reactive Forms)** — подход, в котором модель формы создаётся в TypeScript-коде, а шаблон к ней только привязывается (\`[formGroup]\`, \`formControlName\`).
- **\`FormControl\`** — одно поле: хранит значение, статус валидности, флаги \`touched\` и \`dirty\`.
- **\`FormGroup\`** — объект из именованных контролов фиксированной структуры; значение — объект.
- **\`FormArray\`** — массив контролов по индексу; значение — массив. Методы: \`push\`, \`insert\`, \`removeAt\`, \`at\`, \`clear\`, \`setControl\`, свойство \`length\`.
- **\`FormRecord\`** — группа с динамическими ключами одного типа (например, словарь настроек по id).
- **Типизированные формы (typed forms)** — с Angular 14 у контролов есть параметр типа: \`FormControl<string>\`, \`FormArray<FormControl<string>>\`, и TypeScript знает тип \`value\`.
- **\`nonNullable\` и \`NonNullableFormBuilder\`** — режим, в котором тип не содержит \`| null\`, а \`reset()\` возвращает начальное значение вместо \`null\`.
- **\`FormBuilder\`** — сервис-фабрика, сокращающий запись: \`fb.group\`, \`fb.array\`, \`fb.control\`.
- **\`updateOn\`** — опция контрола или группы: \`'change'\` (по умолчанию), \`'blur'\` или \`'submit'\`.
- **\`valueChanges\` / \`statusChanges\`** — потоки нового значения и нового статуса (\`VALID\`, \`INVALID\`, \`PENDING\`, \`DISABLED\`).
- **\`events\`** — общий поток всех событий контрола (Angular 18+): значение, статус, \`touched\`, \`pristine\`, отправка и сброс формы.
- **\`value\` и \`getRawValue()\`** — значение без отключённых (\`disabled\`) контролов и полное значение со всеми.
- **\`setValue\` / \`patchValue\`** — записать значение целиком (строго все поля) или частично.
- **\`emitEvent\` и \`onlySelf\`** — опции методов изменения: не выпускать события; не пересчитывать родителя.
- **\`ControlValueAccessor\`** — мост между DOM-элементом и контролом; для \`input\` это встроенный \`DefaultValueAccessor\`, слушающий события \`input\` и \`blur\`.
- **Асинхронный валидатор (async validator)** — функция проверки, возвращающая Observable или Promise (например, запрос на сервер); пока он работает, статус \`PENDING\`.
- **\`debounceTime(ms)\`** — RxJS-оператор: пропускает значение, только если после него \`ms\` миллисекунд не было новых.

## Как это работает под капотом

Механизм по шагам:

1. Каждый контрол хранит значение, статус и ссылку на родителя. \`FormGroup\` и \`FormArray\` своего значения не хранят «вручную» — они **собирают** его из детей: группа — объект, массив — массив значений по порядку, пропуская отключённые элементы.
2. Пользователь печатает в \`input\`. \`DefaultValueAccessor\` ловит DOM-событие \`input\` и передаёт значение в форму. Дальше смотрится \`updateOn\` контрола: при \`'change'\` значение сразу записывается в контрол; при \`'blur'\` откладывается в «ожидающее» (pending) и применяется на событии \`blur\`; при \`'submit'\` — ждёт отправки формы.
3. Запись идёт через \`setValue\`, который вызывает \`updateValueAndValidity\`: пересчитать значение, прогнать синхронные валидаторы, затем асинхронные (только если синхронные прошли), выпустить \`valueChanges\` и \`statusChanges\`.
4. После этого контрол вызывает то же самое у родителя — и так до корня формы. Поэтому сначала эмитит ребёнок, потом родитель; в момент эмита ребёнка \`value\` родителя ещё старый.
5. \`push\`, \`insert\`, \`removeAt\`, \`clear\` у \`FormArray\` меняют список и тоже запускают \`updateValueAndValidity\` массива — значит, \`valueChanges\` массива срабатывает и на добавление строки.
6. Опция \`emitEvent: false\` выключает эмиты (значение всё равно меняется), \`onlySelf: true\` не даёт пересчитать родителей.

### \`FormArray\` — список контролов

Все выводы в статье проверены на Angular 21.1:

\`\`\`ts
const fb = inject(FormBuilder);
const phones = fb.array([fb.control('111', { nonNullable: true })]);

phones.push(fb.control('222', { nonNullable: true }));    // в конец
phones.insert(0, fb.control('000', { nonNullable: true })); // в позицию 0
console.log(phones.value, phones.length, phones.at(1).value);
// ["000","111","222"] 3 111

phones.removeAt(0);
console.log(phones.value);
// ["111","222"]
\`\`\`

Элементом массива может быть не только \`FormControl\`, но и \`FormGroup\` — так описывают строки таблицы: \`fb.array([fb.group({ product: [''], qty: [1] })])\`. Значение тогда — массив объектов.

### Типизация: что выводит TypeScript

\`\`\`ts
form = this.fb.group({
  name: this.fb.control('', { nonNullable: true }),
  phones: this.fb.array<FormControl<string>>([]),
  tags: this.fb.array(['a']),
});

form.controls.phones.valueChanges;  // Observable<string[]>
form.controls.phones.at(0);         // FormControl<string>
form.controls.tags;                 // FormArray<FormControl<string | null>>
form.value;                         // Partial<{ name: string; phones: string[]; tags: (string | null)[] }>
form.getRawValue();                 // { name: string; phones: string[]; tags: (string | null)[] }
\`\`\`

Три вещи, которые стоит запомнить. Обычный \`FormBuilder\` создаёт nullable-контролы (\`tags\` получил \`string | null\`). Типовой параметр у \`fb.array<FormControl<string>>([])\` нужен, когда массив создаётся пустым — иначе TypeScript не знает тип элементов. \`form.value\` — \`Partial\`, потому что любой ребёнок может быть отключён и пропасть из значения; \`getRawValue()\` возвращает полный тип. Отсюда и подпись в примере под ответом: \`phones: string[]\`.

### \`nonNullable\` и \`NonNullableFormBuilder\`

\`\`\`ts
const plain = new FormControl('init');
const strict = new FormControl('init', { nonNullable: true });
plain.setValue('x'); strict.setValue('x');
plain.reset(); strict.reset();
console.log(plain.value, strict.value);   // null init
\`\`\`

Без \`nonNullable\` тип — \`FormControl<string | null>\`, потому что \`reset()\` записывает \`null\`. С флагом тип чистый, а \`reset()\` возвращает начальное значение. Чтобы не писать флаг у каждого поля, берут \`inject(NonNullableFormBuilder)\` или \`fb.nonNullable\`.

### Пример: список телефонов в шаблоне

\`\`\`ts
export class PhonesComponent {
  private fb = inject(NonNullableFormBuilder);
  form = this.fb.group({
    name: [''],
    phones: this.fb.array([this.fb.control('111', Validators.required)]),
  });
  get phones() { return this.form.controls.phones; }
  add() { this.phones.push(this.fb.control('', Validators.required)); }
  remove(i: number) { this.phones.removeAt(i); }
}
\`\`\`

\`\`\`html
<form [formGroup]="form">
  <div formArrayName="phones">
    @for (ctrl of phones.controls; track ctrl; let i = $index) {
      <input [formControlName]="i">
      <button type="button" (click)="remove(i)">×</button>
    }
  </div>
  <button type="button" (click)="add()">Добавить телефон</button>
</form>
\`\`\`

\`\`\`text
add(), ввод "222" во второе поле → value: {"name":"","phones":["111","222"]}
remove(0)                        → value: {"name":"","phones":["222"]}, inputs: ['222']
\`\`\`

\`formArrayName\` говорит дочерним \`formControlName\`, что имена — это индексы в массиве. \`track ctrl\` (сам объект контрола, а не \`$index\`) нужен, чтобы при удалении из середины Angular переиспользовал правильные DOM-элементы. Геттер \`phones\` избавляет шаблон от длинной цепочки и сохраняет типизацию.

### \`updateOn\` — когда значение попадает в контрол

Проверено в DOM (jsdom) с настоящим \`ReactiveFormsModule\`:

\`\`\`ts
form = new FormGroup({
  change: new FormControl('', { nonNullable: true }),
  blur: new FormControl('', { nonNullable: true, updateOn: 'blur' }),
});
form2 = new FormGroup({ s: new FormControl('', { nonNullable: true }) }, { updateOn: 'submit' });
\`\`\`

\`\`\`text
печать "abc" в поле change:
  [change] valueChanges: "a"
  [change] valueChanges: "ab"
  [change] valueChanges: "abc"
печать "abc" в поле blur:
  before blur: control.value=""     ← ни одного эмита, значение не тронуто
blur:
  [blur] valueChanges: "abc"        ← один эмит на уход из поля
печать "xyz" в форму с updateOn submit:
  before submit: ""
submit:
  [submit] valueChanges: "xyz"
  ngSubmit, form2.value={"s":"xyz"} ← значение применено до вызова (ngSubmit)
\`\`\`

Когда что выбирать:

- **\`'change'\`** — интерактивные подсказки прямо во время ввода: индикатор силы пароля, счётчик символов, живой поиск.
- **\`'blur'\`** — почти всё остальное. Пользователя не ругают, пока он ещё печатает; асинхронные валидаторы срабатывают один раз на поле, а не на каждую букву.
- **\`'submit'\`** — длинные анкеты, где показывать ошибки до нажатия кнопки только раздражает.

### Наследование \`updateOn\` и программный \`setValue\`

\`\`\`ts
const g = new FormGroup({
  email: new FormControl(''),
  code: new FormControl('', { updateOn: 'change' }),
}, { updateOn: 'blur' });
console.log(g.updateOn, g.controls.email.updateOn, g.controls.code.updateOn);
// blur blur change      ← ребёнок наследует от группы, если не задал своё

g.controls.email.setValue('a@b.c');
// value=a@b.c, emits=1  ← программная запись применяется сразу, blur не нужен
\`\`\`

\`updateOn\` управляет только тем, когда **ввод пользователя** попадает в модель. \`setValue\` и \`patchValue\` из кода работают мгновенно при любой стратегии.

### \`valueChanges\` — реакция на изменения

Пример под ответом — каноническая подписка с побочным эффектом:

\`\`\`ts
this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones));   // phones: string[]
\`\`\`

\`debounceTime(300)\` превращает серию нажатий в одно сохранение через 300 мс после последнего, а \`takeUntilDestroyed\` закрывает подписку вместе с компонентом. Ещё одна деталь: \`valueChanges\` эмитит при каждом \`setValue\`, даже если значение не изменилось:

\`\`\`ts
const c = new FormControl('a');
c.valueChanges.subscribe(() => n++);
c.setValue('a'); c.setValue('a');
// n = 2
\`\`\`

Поэтому перед дорогими действиями добавляют \`distinctUntilChanged()\` (для массивов и объектов — со своей функцией сравнения).

### Порядок эмитов: ребёнок раньше родителя

\`\`\`ts
const form = fb.group({ name: fb.control('Ann', { nonNullable: true }) });
form.controls.name.valueChanges.subscribe(v =>
  console.log(\`child emits \${v}; parent.value.name=\${form.value.name}\`));
form.valueChanges.subscribe(v => console.log(\`parent emits \${JSON.stringify(v)}\`));

form.controls.name.setValue('Bob');
// child emits Bob; parent.value.name=Ann     ← родитель ещё не пересчитан
// parent emits {"name":"Bob"}
\`\`\`

Частый баг: в подписке на поле читают \`form.value\` целиком и получают устаревшие данные. Если нужна вся форма — подписывайтесь на \`form.valueChanges\`, а не на поле.

### \`statusChanges\` и \`events\`

\`statusChanges\` выдаёт статус после каждого пересчёта. \`events\` (Angular 18+) объединяет всё в один поток типизированных событий и, в отличие от \`valueChanges\`, сообщает и о \`touched\` / \`pristine\`:

\`\`\`ts
arr.events.subscribe(e => console.log(e.constructor.name));
arr.push(fb.control('y'));
// ValueChangeEvent
// StatusChangeEvent
arr.at(0).markAsTouched();
// TouchedChangeEvent       ← всплыл от ребёнка, valueChanges об этом молчит
\`\`\`

Через \`events\` удобно, например, показывать ошибки только после того, как поле «потрогали», не опрашивая флаги в шаблоне.

### \`emitEvent\` и \`onlySelf\`

\`\`\`ts
form.controls.name.setValue('Cid', { emitEvent: false });
// никаких эмитов, но value = Cid

form.controls.name.setValue('Dan', { onlySelf: true });
// child emits Dan; родитель не пересчитан: form.value.name всё ещё Cid
\`\`\`

\`emitEvent: false\` — главный способ разорвать цикл, когда в подписке на \`valueChanges\` нужно поправить значение того же контрола:

\`\`\`ts
const t = new FormControl('');
t.valueChanges.subscribe(v => t.setValue(v.trim()));
t.setValue(' y ');
// RangeError: Maximum call stack size exceeded    ← setValue снова вызвал подписку

t.valueChanges.subscribe(v => t.setValue(v.trim(), { emitEvent: false }));  // ✅
\`\`\`

### \`value\` и \`getRawValue()\` — отключённые элементы

\`\`\`ts
const arr = fb.array(['a', 'b', 'c'].map(v => fb.control(v, { nonNullable: true })));
arr.at(1).disable();
console.log(arr.value, arr.getRawValue());
// ["a","c"] ["a","b","c"]
\`\`\`

Отключённый элемент **выпадает** из \`value\` массива — индексы значения перестают совпадать с индексами контролов. Классический баг «поле пропало при сабмите» лечится \`getRawValue()\`. Исключение: если отключены все элементы, \`value\` содержит их все, а статус массива — \`DISABLED\`.

### \`setValue\` и \`patchValue\` у \`FormArray\`

\`\`\`ts
const two = fb.array([fb.control(''), fb.control('')]);
two.setValue(['x']);
// NG01002: Must supply a value for form control at index: 1
two.setValue(['x', 'y', 'z']);
// NG01001: Cannot find form control at index: 2
two.patchValue(['p', 'q', 'r']);
// ["p","q"]           ← лишнее молча проигнорировано

const empty = fb.group({ tags: fb.array([]) });
empty.patchValue({ tags: ['x', 'y'] });
// {"tags":[]}         ← patchValue НЕ создаёт контролы
\`\`\`

\`setValue\` требует точного совпадения структуры, \`patchValue\` обновляет только то, что уже есть. Поэтому данные с сервера в \`FormArray\` загружают так: \`clear()\` и \`push\` по элементу (или \`setControl('tags', fb.array(...))\`), а уже потом \`patchValue\` для остального.

Похожая ловушка с \`reset()\`: он сбрасывает каждый **существующий** контрол к его собственному начальному значению, но не возвращает удалённые элементы и не убирает добавленные — длина массива остаётся прежней.

### Сигналы: \`toSignal\` и Signal Forms

Значение формы можно поднять в сигнал, но \`valueChanges\` не выдаёт начальное значение:

\`\`\`ts
sig = toSignal(this.form.controls.change.valueChanges);
// undefined до первого ввода
sig2 = toSignal(this.form.controls.change.valueChanges, { initialValue: this.form.controls.change.value });
// "" сразу
\`\`\`

В Angular 21 появились Signal Forms — \`form()\` из \`@angular/forms/signals\`, где модель формы — это сигнал. API помечен \`@experimental 21.0.0\`, поэтому в продакшене основной инструмент пока — реактивные формы.

### Где это применяется на практике

- **Контакты и анкеты**: несколько телефонов, email-адресов, адресов доставки — \`FormArray<FormControl<string>>\` с кнопками «добавить / удалить».
- **Редактируемые таблицы и строки документа** (счёт, заказ, смета): \`FormArray<FormGroup<...>>\`, \`valueChanges\` с \`debounceTime\` пересчитывает итоги.
- **Конструкторы фильтров и правил**: условия «поле / оператор / значение» добавляются динамически, состояние сериализуется в URL.
- **Регистрация и проверка уникальности**: \`updateOn: 'blur'\` для логина и email с асинхронным валидатором — один запрос на поле.
- **Длинные мастера (wizard) и анкеты** — \`updateOn: 'submit'\` на шаге, ошибки только после «Далее».
- **Автосохранение черновика**: \`form.valueChanges.pipe(debounceTime(1000), distinctUntilChanged(...), takeUntilDestroyed())\`.
- **Зависимые поля**: страна → список городов, тип клиента → набор обязательных полей; изменения делаются с \`emitEvent: false\`, чтобы не зациклиться.

## Важные нюансы и подводные камни

- **\`disabled\` контролы не попадают в \`value\`.** В \`FormArray\` это ещё и сдвигает индексы. Для сабмита используйте \`getRawValue()\`.
- **Бесконечный цикл**: в подписке на \`valueChanges\` вызвали \`setValue\` / \`patchValue\` того же контрола без \`{ emitEvent: false }\` — \`RangeError: Maximum call stack size exceeded\`.
- **\`setValue\` требует ВСЕ поля**, \`patchValue\` — только нужные. У \`FormArray\` \`setValue\` с другой длиной бросает NG01001 / NG01002, а \`patchValue\` не добавляет новых контролов. Спросят разницу почти наверняка.
- **\`updateOn: 'blur'\` плюс программный \`setValue\`**: значение обновится сразу, стратегия касается только пользовательского ввода.
- **\`removeAt\` внутри цикла** по возрастанию индексов сдвигает элементы: из \`["A","B","C","D"]\` вызовы \`removeAt(1)\`, \`removeAt(2)\` дают \`["A","C"]\` вместо \`["A","D"]\`. Идите с конца или пересоберите массив.
- **Подписка на поле читает устаревший \`form.value\`** — родитель пересчитывается после эмита ребёнка.
- **\`valueChanges\` не дедуплицирует** — одинаковое значение эмитится повторно; добавляйте \`distinctUntilChanged\`.
- **\`reset()\` не восстанавливает длину массива** — только значения существующих контролов.
- **\`track $index\` в \`@for\` по контролам** при удалении из середины переиспользует не те DOM-элементы (фокус, анимации); трекайте сам контрол.
- **Пустой массив без типового параметра** (\`fb.array([])\`) теряет тип элементов — пишите \`fb.array<FormControl<string>>([])\`.
- **Подписка без \`takeUntilDestroyed\`** на \`valueChanges\` — утечка при пересоздании компонента.
- Спросят про **современный подход**: значения формы можно поднять в сигнал через \`toSignal(form.valueChanges)\` (с \`initialValue\`), но сама форма остаётся RxJS-ориентированной; Signal Forms в 21-й версии экспериментальны.

**Плюсы:** динамические списки любой вложенности с единым API; строгая типизация значения и контролов; \`updateOn\` снижает число прогонов валидаторов и не раздражает пользователя; \`valueChanges\` и \`events\` дают реактивную модель для автосохранения и зависимых полей.
**Минусы:** много тонкостей — \`Partial\` в \`value\`, выпадающие отключённые элементы, \`patchValue\` без создания контролов; циклы и устаревший родитель в подписках; ручное управление подписками; API потоков не дедуплицирует и не выдаёт начальное значение.

## Как это спрашивают на собеседовании

**Главный вывод:** \`FormArray\` — это динамический список контролов по индексу с методами \`push\`, \`insert\`, \`removeAt\`, \`clear\`; \`updateOn\` (\`change\`, \`blur\`, \`submit\`) определяет, когда пользовательский ввод попадает в модель и валидируется; \`valueChanges\` эмитит после каждого такого обновления, сначала у ребёнка, потом у родителя, и в типизированных формах уже знает тип значения.

Типичные формулировки: «Как сделать динамический список полей?», «Зачем \`updateOn: 'blur'\`?», «Как избежать бесконечного цикла в \`valueChanges\`?», «Почему отключённое поле пропало из значения формы?».

Что могут спросить следом:

- *Чем \`setValue\` отличается от \`patchValue\`?* — \`setValue\` требует полной структуры и бросает ошибку, \`patchValue\` обновляет только существующие поля и не создаёт новых.
- *Почему \`form.value\` типизирован как \`Partial\`?* — Отключённые контролы выпадают из \`value\`; полный тип даёт \`getRawValue()\`.
- *Влияет ли \`updateOn\` на \`setValue\` из кода?* — Нет, программная запись применяется сразу.
- *Как загрузить с сервера массив в \`FormArray\`?* — \`clear()\` и \`push\` по элементу или \`setControl\` с новым массивом; \`patchValue\` элементов не добавит.
- *Как остановить цикл при правке значения в подписке?* — \`{ emitEvent: false }\`.

### Ответ на 1 минуту

> \`FormArray\` — это динамическая коллекция контролов по числовому индексу, в отличие от \`FormGroup\` с фиксированными именованными полями; я беру его для списков переменной длины — телефоны, строки таблицы — и управляю через \`push\`, \`insert\`, \`removeAt\`, \`clear\`. С типизированными формами \`FormArray<FormControl<string>>\` даёт \`value: string[]\`, а \`nonNullable\` убирает \`null\` и заставляет \`reset\` возвращать начальное значение. \`updateOn\` определяет, когда ввод пользователя попадает в модель и валидируется: \`change\` по умолчанию, \`blur\` для тяжёлых асинхронных валидаторов, \`submit\` для длинных анкет; программный \`setValue\` применяется сразу. \`valueChanges\` эмитит после каждого обновления, сначала у ребёнка, потом у родителя, обычно с \`debounceTime\` и \`takeUntilDestroyed\`. Из практики: \`getRawValue\` включает disabled-контролы, \`patchValue\` не создаёт элементы массива, а \`emitEvent: false\` спасает от цикла при правке значения в подписке.`,
      en: `## In short

\`FormArray\` is a **variable-length list of controls**, addressed by index rather than by name. \`updateOn\` says **when** a control updates its value and validates. \`valueChanges\` is the stream that emits those updates.

Analogy: \`FormGroup\` is a **printed form** with predefined fields "Name" and "Date of birth". \`FormArray\` is a **numbered list** where you keep writing extra rows by hand: phone 1, phone 2, phone 3. And \`updateOn\` is the moment the cashier rings things up: on every item, at the end of the belt, or only when you hit "pay".

## How it works, step by step

1. You create the array: \`this.fb.array<FormControl<string>>([])\` — empty at first.
2. You add items at runtime with \`push(control)\` and remove with \`removeAt(i)\`; there are also \`insert\`, \`clear\` and \`at(i)\`.
3. With strictly typed forms (Angular 14+), \`FormArray<FormControl<string>>\` yields a type-safe \`value: string[]\` — TypeScript knows the contents are strings.
4. \`nonNullable: true\` (or \`NonNullableFormBuilder\`) strips \`| null\` from the type and makes \`reset()\` restore the **initial value** instead of \`null\`.
5. \`updateOn\` sets the update moment: \`'change'\` (default, on every keystroke), \`'blur'\` (on focus loss), \`'submit'\` (only on submit). Set it on the group and children inherit it.
6. \`valueChanges\` emits **according to** \`updateOn\`, handing you an already typed value. Its sibling \`statusChanges\` covers validity.

## Example

\`\`\`ts
form = this.fb.group({
  name: this.fb.control('', { nonNullable: true }),
  phones: this.fb.array<FormControl<string>>([]),
});
get phones() { return this.form.controls.phones; }
addPhone() {
  this.phones.push(this.fb.control('', { nonNullable: true }));
}
removePhone(i: number) { this.phones.removeAt(i); }
\`\`\`

\`\`\`ts
new FormControl('', { updateOn: 'blur', validators: [Validators.required] })
\`\`\`

Why it looks like this: the \`phones\` getter keeps the template free of long chains and preserves typing. And \`updateOn: 'blur'\` sharply reduces validator runs — critical when the validator is async and hits the server.

## Which updateOn to choose

- **\`'change'\`** — live hints while typing: a password-strength meter, a character counter.
- **\`'blur'\`** — almost everything else. The user is not scolded while still typing, and async validators fire once per field rather than once per letter.
- **\`'submit'\`** — long questionnaire-style forms where showing errors before the button is pressed is simply annoying.

For \`valueChanges\` with side effects (autosave, a server call) you almost always need \`debounceTime\` plus \`takeUntilDestroyed\`, otherwise you get a request per keystroke and a leaked subscription.

## What to say in the interview

> \`FormArray\` is a dynamic collection of controls addressed by numeric index, unlike \`FormGroup\` with its fixed set of named fields; you use it for variable-length lists — phones, tags, table rows — and manage it with \`push\`, \`removeAt\`, \`insert\` and \`clear\`. With the strictly typed forms introduced in Angular 14, \`FormArray<FormControl<string>>\` gives a type-safe \`value: string[]\`, while the \`nonNullable\` flag or \`NonNullableFormBuilder\` removes \`null\` from the type and makes \`reset\` restore the initial value instead of \`null\`. \`updateOn\` decides when the value updates and validates — \`change\` by default, \`blur\` for heavy async validators, \`submit\` for long forms. From practice it matters that \`getRawValue\` includes disabled controls that are absent from \`value\`, and that \`emitEvent: false\` suppresses the emission so programmatic updates do not loop.

## Gotchas

- **Disabled controls are missing from \`value\`.** The classic "my field vanished on submit" bug — fixed with \`getRawValue()\`.
- **Infinite loop**: calling \`patchValue\` inside a \`valueChanges\` subscription without \`{ emitEvent: false }\`.
- **\`setValue\` requires EVERY field**, \`patchValue\` only the ones you pass. You will almost certainly be asked the difference.
- **\`updateOn: 'blur'\` plus a programmatic \`setValue\`**: the value updates immediately — the strategy governs user input only.
- **\`removeAt\` inside an ascending loop** shifts the remaining items — iterate backwards or rebuild the array.
- **Subscribing to \`valueChanges\` without \`takeUntilDestroyed\`** leaks when the component is recreated.
- They will ask about the **modern approach**: you can lift form values into a signal with \`toSignal(form.valueChanges)\`, but the forms API itself is still RxJS-oriented.`,
    },
    codeSnippet: `this.form.controls.phones.valueChanges
  .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
  .subscribe(phones => this.savePhones(phones)); // phones: string[]`,
  },
  {
    id: 'ng-050',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'can-deactivate', 'route-reuse-strategy'],
    question: {
      ru: 'Как работают CanDeactivate и RouteReuseStrategy и какие задачи они решают?',
      en: 'How do CanDeactivate and RouteReuseStrategy work, and what problems do they solve?',
    },
    answer: {
      ru: `## В чём суть

Оба механизма касаются **момента ухода с маршрута**, но отвечают на разные вопросы. \`CanDeactivate\` — гвард, который спрашивает «можно ли уйти?» и может отменить навигацию, например, если в форме несохранённые изменения. \`RouteReuseStrategy\` решает «что сделать с компонентом, с которого ушли, и что показать при возврате»: уничтожить и потом создать заново (так по умолчанию) или сохранить живым и вернуть как был.

Аналогия. \`CanDeactivate\` — **вахтёр на выходе**: перед тем как вас выпустить, он спрашивает «точно уходите? у вас же несохранённый черновик» и может не выпустить. \`RouteReuseStrategy\` — **правило гостиницы**: после выезда номер убирают и сдают заново (поведение по умолчанию) или оставляют как есть — с вашими вещами на столе — и выдают тому же гостю при следующем заезде.

**Какую проблему решает.** Без \`CanDeactivate\` пользователь, заполнивший половину длинной формы, случайно кликает по пункту меню и теряет всё. Без кастомной \`RouteReuseStrategy\` каждый возврат на экран — это новый компонент: заново запросы, заново фильтры и сортировка, прокрутка в начале списка. Для списка результатов поиска, вкладок или тяжёлого дашборда это раздражает и стоит секунды загрузки. Оба механизма встроены в роутер и не требуют обходных путей вроде глобальных сервисов-хранилищ всего состояния экрана.

## Словарик терминов

- **Навигация (navigation)** — процесс перехода роутера с одного URL на другой: распознать маршрут, проверить гварды, загрузить данные, активировать компоненты.
- **Гвард (guard)** — функция, которую роутер вызывает во время навигации, чтобы решить, можно ли продолжать: \`canMatch\`, \`canActivate\`, \`canActivateChild\`, \`canDeactivate\`.
- **\`CanDeactivateFn<T>\`** — тип функционального гварда ухода: получает **экземпляр компонента**, текущий снапшот маршрута, текущее и следующее состояние роутера.
- **\`GuardResult\`** — что может вернуть гвард: \`boolean\`, \`UrlTree\` или \`RedirectCommand\`; можно обернуть в \`Observable\` или \`Promise\` (\`MaybeAsync\`).
- **\`UrlTree\`** — объектное представление URL; возврат его из гварда означает «отменить текущую навигацию и пойти туда».
- **\`ActivatedRouteSnapshot\`** — неизменяемый «снимок» сопоставленного маршрута: параметры, \`data\`, \`routeConfig\` (объект из массива \`routes\`).
- **\`RouteReuseStrategy\`** — абстрактный класс с пятью методами, через которые роутер спрашивает: переиспользовать ли маршрут, отсоединить ли его, сохранить, присоединить обратно.
- **\`DetachedRouteHandle\`** — непрозрачный «пакет» с живым компонентом и его поддеревом, который роутер отдаёт вам на хранение.
- **\`BaseRouteReuseStrategy\`** — готовая базовая реализация (её же Angular использует по умолчанию): переиспользует только при совпадении конфигурации маршрута и ничего не хранит.
- **Detach / attach** — отсоединить view компонента от \`router-outlet\`, не уничтожая, и присоединить его обратно.
- **\`beforeunload\`** — событие браузера перед закрытием вкладки или перезагрузкой; единственный способ предупредить о потере данных при уходе со страницы целиком.

## Как это работает под капотом

Как роутер проходит навигацию (только важные для темы шаги):

1. Пользователь кликает ссылку или нажимает «назад». Роутер разбирает URL и строит дерево будущего состояния. Для каждого узла он спрашивает \`shouldReuseRoute(future, curr)\`: если \`true\`, текущий компонент останется на месте, просто получит новые параметры.
2. Затем идёт проверка гвардов. Сначала \`canDeactivate\` уходящих маршрутов — каждый получает экземпляр компонента, с которого уходят. Только после них — \`canActivateChild\` и \`canActivate\` целевых маршрутов.
3. Если \`canDeactivate\` вернул \`false\`, навигация отменяется (\`NavigationCancel\`), \`navigate()\` резолвится в \`false\`, URL остаётся прежним. \`UrlTree\` или \`RedirectCommand\` отменяют её и запускают новую — по указанному адресу. \`Observable\` или \`Promise\` роутер дожидается.
4. Если все гварды пропустили, выполняются резолверы, и начинается активация. Для каждого уходящего маршрута роутер спрашивает \`shouldDetach(route)\`. \`false\` — компонент уничтожается (\`ngOnDestroy\`). \`true\` — компонент отсоединяется от outlet живым, и роутер вызывает \`store(route, handle)\`, отдавая его вам.
5. Для каждого приходящего маршрута роутер спрашивает \`shouldAttach(route)\`. \`true\` — он берёт \`retrieve(route)\` и вставляет сохранённый компонент обратно вместо создания нового, а затем вызывает \`store(route, null)\`, сообщая, что пакет забран.
6. Восстановленный компонент не проходит \`ngOnInit\` заново — для него ничего не «начиналось». Узнать о возвращении можно через события \`(attach)\` / \`(detach)\` у \`router-outlet\`.

### \`CanDeactivateFn\` — гвард ухода

Пример под ответом — современная функциональная форма:

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<EditComponent> = (component) => {
  if (component.form.pristine) return true;          // ничего не меняли — уходим
  const dialog = inject(ConfirmDialog);              // функции-гварды работают в DI-контексте
  return dialog.confirm('Discard changes?');         // Observable<boolean> или Promise<boolean>
};
// route: { path: 'edit', component: EditComponent, canDeactivate: [unsavedGuard] }
\`\`\`

Главная особенность этого гварда — первый аргумент: **экземпляр компонента**, с которого уходят. Ни один другой гвард его не видит. Поэтому решение принимается по состоянию самого компонента: \`form.pristine\` (форму ещё не меняли), флаг «есть несохранённые изменения», идёт ли загрузка.

Проверено на Angular 21.1:

\`\`\`text
> navigate /admin                  (форма изменена, гвард вернул false)
  canDeactivate: component is Edit, from /edit to /admin, pristine=false
  NavigationCancel code=3          ← GuardRejected
  result=false, url now=/edit

> navigate /admin                  (гвард вернул Observable — «диалог» ответил через 30ms)
  canDeactivate: component is Edit, from /edit to /admin, pristine=false
  dialog answered: discard
  canActivate admin                ← canActivate цели — только после canDeactivate
  Edit destroyed
  NavigationEnd /admin
\`\`\`

### Классовый \`CanDeactivate<T>\` — legacy-форма

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class UnsavedGuard implements CanDeactivate<EditComponent> {
  canDeactivate(component: EditComponent) { return component.form.pristine || confirm('Уйти?'); }
}
// canDeactivate: [UnsavedGuard]
\`\`\`

Сам интерфейс не устарел, но передача класса или токена в массив \`canDeactivate\` относится к типу \`DeprecatedGuard\` и помечена \`@deprecated\`. Если класс уже есть, его подключают функцией: \`canDeactivate: [(c) => inject(UnsavedGuard).canDeactivate(c)]\` или через \`mapToCanDeactivate([UnsavedGuard])\`.

### Пример 1. Универсальный гвард для любых форм

\`\`\`ts
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (cmp) =>
  !cmp.hasUnsavedChanges() || inject(ConfirmDialog).confirm('Есть несохранённые изменения. Уйти?');

// EditUserComponent implements HasUnsavedChanges { hasUnsavedChanges() { return this.form.dirty; } }
// EditOrderComponent implements HasUnsavedChanges { ... }
\`\`\`

Один гвард на всё приложение: каждый экран сам знает, что значит «несохранённые изменения», а гвард лишь спрашивает через общий интерфейс.

### Пример 2. Возврат \`UrlTree\` и ловушка с циклом

\`\`\`ts
const guard: CanDeactivateFn<Edit> = (cmp, route, state, next) =>
  cmp.form.pristine ? true : inject(Router).createUrlTree(['/home']);
\`\`\`

\`\`\`text
> navigate /admin
  canDeactivate: from /edit to /admin, pristine=false
  NavigationCancel "Redirecting to "/home""
  canDeactivate: from /edit to /home, pristine=false     ← редирект тоже уходит с /edit!
  NavigationCancel "Redirecting to "/home""
  canDeactivate: from /edit to /home, pristine=false
  ... (бесконечно)
\`\`\`

Редирект — это новая навигация, которая тоже покидает \`/edit\`, поэтому гвард вызывается снова. Если он опять вернёт \`UrlTree\`, получится бесконечный цикл (проверено на Angular 21.1). Выход — проверять \`next.url\` или вообще не редиректить из \`canDeactivate\`: этот гвард должен отвечать «да / нет».

### \`beforeunload\` — уход со страницы целиком

\`CanDeactivate\` работает только для навигации **внутри** приложения. Закрытие вкладки, перезагрузка, ввод другого адреса в строку — это уход со страницы, о котором роутер не знает. Для этого — браузерное событие:

\`\`\`ts
@HostListener('window:beforeunload', ['$event'])
onBeforeUnload(e: BeforeUnloadEvent) {
  if (this.form.dirty) {
    e.preventDefault();       // браузер покажет свой стандартный диалог
    e.returnValue = '';       // для старых браузеров, которые не смотрят на preventDefault
  }
}
\`\`\`

Текст диалога браузеры не дают менять — показывается их собственное сообщение. Кроме того, многие браузеры показывают диалог, только если пользователь уже взаимодействовал со страницей (кликал, печатал), — детали зависят от браузера и версии.

### Переиспользование по умолчанию: \`shouldReuseRoute\`

Стратегия по умолчанию (\`BaseRouteReuseStrategy\`) реализует \`shouldReuseRoute\` как \`future.routeConfig === curr.routeConfig\`: если сопоставился **тот же объект конфигурации**, компонент не пересоздаётся. Это срабатывает при смене параметров, query-параметров или фрагмента:

\`\`\`ts
// { path: 'user/:id', component: User }
export class User {
  route = inject(ActivatedRoute);
  constructor() { this.route.paramMap.subscribe(p => console.log(\`paramMap id=\${p.get('id')}\`)); }
  ngOnInit() { console.log(\`ngOnInit snapshot id=\${this.route.snapshot.paramMap.get('id')}\`); }
}
\`\`\`

\`\`\`text
> navigate /user/1
  User created
  paramMap id=1
  ngOnInit snapshot id=1
> navigate /user/2
  paramMap id=2           ← тот же экземпляр, ngOnInit НЕ вызван повторно
> navigate /home
  User destroyed
\`\`\`

Если читать \`id\` из \`snapshot\` один раз в \`ngOnInit\`, при переходе \`/user/1\` → \`/user/2\` на экране останутся данные первого пользователя. Правильно — подписка на \`paramMap\` (обычно \`switchMap\` на запрос) или, в современном Angular, \`withComponentInputBinding()\`: параметр приходит в \`input()\`, и сигнал сам обновится при переиспользовании.

### \`RouteReuseStrategy\` — пять методов

- **\`shouldReuseRoute(future, curr)\`** — оставить ли текущий компонент при навигации (по умолчанию: та же конфигурация маршрута).
- **\`shouldDetach(route)\`** — при уходе: сохранить компонент вместо уничтожения?
- **\`store(route, handle)\`** — роутер отдаёт пакет на хранение; \`handle === null\` означает «пакет забран, удалите запись».
- **\`shouldAttach(route)\`** — при приходе: есть ли сохранённый компонент для этого маршрута?
- **\`retrieve(route)\`** — отдать сохранённый пакет (или \`null\`).

### Пример 3. Кастомная стратегия «keep-alive»

\`\`\`ts
@Injectable()
export class KeepAliveStrategy extends BaseRouteReuseStrategy {
  private handles = new Map<Route, DetachedRouteHandle>();

  override shouldDetach(route: ActivatedRouteSnapshot) {
    return route.data['keepAlive'] === true;              // только помеченные маршруты
  }
  override store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null) {
    if (handle) this.handles.set(route.routeConfig!, handle);
    else this.handles.delete(route.routeConfig!);
  }
  override shouldAttach(route: ActivatedRouteSnapshot) {
    return !!route.routeConfig && this.handles.has(route.routeConfig);
  }
  override retrieve(route: ActivatedRouteSnapshot) {
    return route.routeConfig ? this.handles.get(route.routeConfig) ?? null : null;
  }
  evict(path: string) {                                    // политика очистки
    for (const [cfg, h] of this.handles) {
      if (cfg.path === path) { destroyDetachedRouteHandle(h); this.handles.delete(cfg); }
    }
  }
}
// providers: [{ provide: RouteReuseStrategy, useClass: KeepAliveStrategy }]
// routes:    { path: 'list', component: List, data: { keepAlive: true } }
\`\`\`

Реальная последовательность вызовов в Angular 21.1 (список → карточка → список → другая страница с вытеснением):

\`\`\`text
> navigate /list
  List#1 created, ngOnInit
> navigate /details/42
  shouldDetach(list) -> true
  (detach) event: List#1
  store(list, handle)                 ← компонент жив, ngOnDestroy не вызван
> navigate /list
  shouldAttach(list) -> true
  retrieve(list) -> handle
  store(list, null)                   ← роутер сообщает: пакет забран
  (attach) event: List#1              ← тот же экземпляр, ngOnInit не вызван
> navigate /other, затем evict('list')
  List#1 ngOnDestroy                  ← destroyDetachedRouteHandle
> navigate /list
  List#2 created, ngOnInit
\`\`\`

Ключ в \`Map\` — объект \`routeConfig\`, а не строка пути: так не путаются маршруты с одинаковыми путями в разных модулях. Решение «сохранять или нет» принимается по флагу \`data\`, а не для всех подряд — это ключ к тому, чтобы не утечь.

### \`destroyDetachedRouteHandle\` — освобождение памяти

Сохранённый пакет держит живой компонент со всеми подписками и DOM. Если его не вернуть и не уничтожить, это утечка. В установленной 21.1 есть публичная функция \`destroyDetachedRouteHandle(handle)\` — она уничтожает компонент из пакета (вызывается \`ngOnDestroy\`). Раньше для этого лезли во внутреннее поле \`handle.componentRef\`. Типичная политика очистки: держать N последних экранов (LRU), сбрасывать всё при логауте, вытеснять экран после сохранения изменений.

### События \`(attach)\` и \`(detach)\` у \`router-outlet\`

\`\`\`html
<router-outlet (attach)="onAttach($event)" (detach)="onDetach($event)" />
\`\`\`

Восстановленный компонент не получает \`ngOnInit\`, поэтому «обновить данные при возврате» или «вернуть прокрутку» вешают на \`(attach)\` — в событие приходит экземпляр компонента. Альтернатива — сервис, который компонент сам слушает.

### Где это применяется на практике

- **Редакторы и формы в CRM, ERP, админках**: \`unsavedChangesGuard\` на всех маршрутах редактирования плюс \`beforeunload\` на случай закрытия вкладки.
- **Мастера из нескольких шагов**: \`canDeactivate\` не даёт уйти посреди процесса, пока не подтвердили.
- **Список → карточка → назад**: результаты поиска, большие таблицы с фильтрами и прокруткой сохраняются через keep-alive стратегию.
- **Вкладки-маршруты в enterprise-приложениях**: пользователь переключается между открытыми документами, каждый держит своё состояние.
- **Тяжёлые дашборды** с графиками, пересоздание которых занимает секунды.
- **Маршрут с параметром** (\`/user/:id\`, \`/order/:id\`): понимание \`shouldReuseRoute\` объясняет баг «перешёл к другому пользователю, а данные старые».

## Важные нюансы и подводные камни

- **\`ngOnInit\` не вызовется повторно** при переиспользовании (и при смене параметров, и при восстановлении из стратегии). Читайте параметры через подписку на \`paramMap\` / \`data\` или через \`withComponentInputBinding\`, а не из \`snapshot\` один раз. Это тот самый баг «перешёл на другого юзера, а данные старые».
- **Утечка памяти** в кастомной стратегии: сохранили пакет и никогда не восстановили и не уничтожили. Нужна политика очистки и \`destroyDetachedRouteHandle\`.
- **\`store(route, null)\`** вызывается при восстановлении — стратегия должна удалять запись, а не хранить \`null\`.
- **\`CanDeactivate\` не ловит закрытие вкладки** — для этого нужен \`beforeunload\`. Спрашивают часто.
- **\`UrlTree\` из \`canDeactivate\` может зациклиться**: редирект — новая навигация с того же экрана, гвард вызовется снова.
- **Возврат \`false\` и кнопка «назад».** При навигации по истории браузер меняет URL раньше, чем отработал гвард; роутер затем восстанавливает адрес. По умолчанию (\`canceledNavigationResolution: 'replace'\`) он заменяет запись в истории, и история может «поплыть»; вариант \`'computed'\` в \`withRouterConfig\` возвращает пользователя на правильную позицию в истории. В старых версиях здесь бывали визуальные артефакты.
- **Устаревшее состояние**: восстановленный компонент показывает данные, которые уже неактуальны. Нужен явный refresh в \`(attach)\`.
- **Гвард с \`confirm()\`** блокирует главный поток и плохо тестируется — используйте свой диалоговый сервис через \`inject()\`, возвращающий \`Observable\` или \`Promise\`.
- **Порядок гвардов**: \`canDeactivate\` уходящего маршрута выполняется **раньше**, чем \`canActivate\` целевого.
- **Сохранённые маршруты с дочерними** сохраняются целым поддеревом; ключ по \`routeConfig\` надёжнее, чем по строке URL, но для маршрутов с параметрами (\`/doc/:id\`) нужно решить, храните вы один экземпляр на конфигурацию или по экземпляру на каждый \`id\`.

**Плюсы:** \`CanDeactivate\` — единая точка защиты от потери данных с доступом к компоненту и поддержкой асинхронных диалогов; \`RouteReuseStrategy\` позволяет сохранять состояние, прокрутку и тяжёлые компоненты между переходами без глобального хранилища.
**Минусы:** \`CanDeactivate\` не покрывает закрытие вкладки и может зациклиться с редиректом; кастомная стратегия — глобальная и сложная, легко получить утечки и устаревшие данные, восстановленный компонент не проходит \`ngOnInit\`, а отладка последовательности вызовов неочевидна.

## Как это спрашивают на собеседовании

**Главный вывод:** \`CanDeactivate\` вызывается до ухода с маршрута, получает экземпляр компонента и может отменить навигацию (\`false\`), перенаправить её (\`UrlTree\`) или дождаться диалога (\`Observable\` / \`Promise\`). \`RouteReuseStrategy\` решает судьбу компонента: по умолчанию он переиспользуется только при совпадении конфигурации маршрута, а кастомная стратегия через \`shouldDetach\` / \`store\` / \`shouldAttach\` / \`retrieve\` сохраняет и восстанавливает целые экраны.

Типичные формулировки: «Как предупредить о несохранённых изменениях?», «Почему при переходе \`/user/1\` → \`/user/2\` не вызывается \`ngOnInit\`?», «Как сохранить состояние списка при возврате из карточки?», «Какие методы у \`RouteReuseStrategy\`?».

Что могут спросить следом:

- *Сработает ли \`CanDeactivate\` при закрытии вкладки?* — Нет, для этого \`beforeunload\`.
- *В каком порядке выполняются гварды?* — Сначала \`canDeactivate\` уходящих маршрутов, потом \`canActivateChild\` и \`canActivate\` целевых.
- *Как узнать, что компонент восстановлен из стратегии?* — Через события \`(attach)\` / \`(detach)\` у \`router-outlet\`; \`ngOnInit\` не вызывается.
- *Как не допустить утечки в keep-alive стратегии?* — Сохранять только помеченные маршруты, ограничивать число пакетов и уничтожать лишние через \`destroyDetachedRouteHandle\`.
- *Как заставить компонент пересоздаваться при смене параметра?* — Переопределить \`shouldReuseRoute\`, вернув \`false\` для нужного маршрута; но обычно правильнее реагировать на \`paramMap\`.

### Ответ на 1 минуту

> \`CanDeactivate\` — гвард, который роутер вызывает перед уходом с маршрута, раньше \`canActivate\` целевого. Он единственный получает экземпляр компонента, поэтому решает по его состоянию, например \`form.dirty\`: вернуть \`false\` — отменить навигацию, \`UrlTree\` — перенаправить, \`Observable\` или \`Promise\` — дождаться ответа из диалога. Закрытие вкладки он не ловит, для этого \`beforeunload\`. \`RouteReuseStrategy\` отвечает на другой вопрос — что делать с компонентом. По умолчанию \`shouldReuseRoute\` переиспользует его, если совпала конфигурация маршрута, поэтому при \`/user/1\` → \`/user/2\` \`ngOnInit\` не вызывается, и параметры надо читать через \`paramMap\`. Кастомная стратегия через \`shouldDetach\`, \`store\`, \`shouldAttach\` и \`retrieve\` сохраняет экран живым — список, вкладку, дашборд — и возвращает тот же экземпляр. Риски — утечки памяти, поэтому нужна политика очистки и \`destroyDetachedRouteHandle\`, и устаревшие данные: обновлять их приходится в событии \`attach\`.`,
      en: `## In short

Both mechanisms are about **the moment you leave a route**, but they solve different problems.

\`CanDeactivate\` is the **guard at the exit**: before letting you out it asks "are you sure — you have unsaved changes?" and can cancel the navigation.

\`RouteReuseStrategy\` is the **hotel policy**: do we tear the room down after checkout, or keep it exactly as it was and hand it back to the same guest next time? By default Angular tears it down; a custom strategy lets you store and restore whole subtrees.

## How it works, step by step

1. The user starts navigating away from the current route.
2. The router collects the \`canDeactivate\` guards of the outgoing route and calls them **before** activating the new one.
3. The guard receives the **component instance** — its distinguishing feature: it is the only guard that sees the component you are leaving.
4. Returning \`true\` lets you go; \`false\` cancels the navigation and the address bar rolls back; a \`UrlTree\` sends you somewhere else instead; you can also return an \`Observable\`/\`Promise\` and show a modal.
5. Once you have left, the router asks the \`RouteReuseStrategy\`: \`shouldDetach\` — should this subtree be kept? If yes, \`store\` puts the handle into your map.
6. On the way back: \`shouldAttach\` — is anything stored? \`retrieve\` returns the handle and Angular **restores** that exact component with all its state instead of creating a new one.

## Example

\`\`\`ts
export const unsavedGuard: CanDeactivateFn<FormComponent> = (cmp) =>
  cmp.form.pristine || confirm('Leave without saving?');
\`\`\`

\`\`\`ts
class TabReuseStrategy extends BaseRouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.data['reuse'] === true;
  }
  store(route, handle) { this.handlers[key(route)] = handle; }
  shouldAttach(route) { return !!this.handlers[key(route)]; }
  retrieve(route) { return this.handlers[key(route)] ?? null; }
}
// { provide: RouteReuseStrategy, useClass: TabReuseStrategy }
\`\`\`

Why it looks like this: the functional \`CanDeactivateFn\` replaced the old class interface — \`inject()\` works inside, so swapping \`confirm\` for your own dialog service is trivial. And in the strategy the decision to store is driven by a flag in \`route.data\` rather than "everything, always" — that is the key to not leaking.

## Why a custom RouteReuseStrategy

By default Angular reuses the component **when only the parameters of the same route change**: going from \`/user/1\` to \`/user/2\` does not recreate the component, it just emits a new \`paramMap\`. That decision lives in \`shouldReuseRoute\`, which compares the \`future\` and \`curr\` snapshots.

A custom strategy is for keeping state **across different routes**:

- tabs the user jumps between, where losing scroll position and filters is unacceptable;
- search results: you open a product page, go back, and the list and scroll offset are still there;
- heavy dashboards whose recreation costs a full second.

## What to say in the interview

> \`CanDeactivate\` is a guard invoked before leaving a route; it is the only guard that receives the component instance and it can cancel navigation by returning \`false\`, redirect it by returning a \`UrlTree\`, or return an \`Observable\`/\`Promise\` and wait for the user's answer from a modal. The classic case is warning about unsaved changes. \`RouteReuseStrategy\` answers a different question: whether to recreate the route component. By default Angular reuses it when only that same route's parameters changed — then instead of recreation it simply emits \`paramMap\`, and the decision comes from \`shouldReuseRoute\`. The main pitfall is that on reuse \`ngOnInit\` is not called again, so parameters must be read via a \`paramMap\` subscription rather than once from the snapshot.

## Gotchas

- **\`ngOnInit\` does not run again** on reuse. Read parameters via a \`paramMap\`/\`data\` subscription, not once from \`snapshot\`. This is exactly the "switched user, still showing the old data" bug.
- **Memory leak** in a custom strategy: a handle stored and then never restored nor destroyed. You need an eviction policy.
- **\`CanDeactivate\` does not catch closing the tab** — that needs \`beforeunload\`. Asked often.
- **Returning \`false\` and the address bar**: on popstate the browser already changed the URL and the router rolls it back — older versions had visual artefacts here.
- **Stale state**: the restored component shows data that is no longer current. You need an explicit refresh on attach.
- **A guard using \`confirm()\`** blocks the thread and is awkward to test — use your own dialog service via \`inject()\`.
- They will ask about **guard ordering**: the outgoing route's \`canDeactivate\` runs **before** the target route's \`canActivate\`.`,
    },
    codeSnippet: `export const unsavedGuard: CanDeactivateFn<EditComponent> = (component) => {
  if (component.form.pristine) return true;
  const dialog = inject(ConfirmDialog);
  return dialog.confirm('Discard changes?');
};
// route: { path: 'edit', component: EditComponent, canDeactivate: [unsavedGuard] }`,
  },
  {
    id: 'ng-051',
    category: 'angular-signals',
    level: 'Hard',
    tags: ['router', 'preloading', 'code-splitting'],
    question: {
      ru: 'Какие стратегии preloading бывают и как работает route-level code splitting?',
      en: 'What preloading strategies exist, and how does route-level code splitting work?',
    },
    answer: {
      ru: `## В чём суть

Route-level code splitting — это нарезка приложения по маршрутам: код каждого ленивого маршрута (\`loadComponent\`, \`loadChildren\` с динамическим \`import()\`) уезжает в **отдельный чанк**, который браузер скачивает только при первом переходе на этот маршрут. Preloading убирает главный минус такого подхода — задержку первого перехода: после завершения навигации роутер **тихо докачивает чанки в фоне**, а какие именно — решает стратегия предзагрузки.

Аналогия: **ресторан**. Ленивая загрузка — блюдо начинают готовить только когда вы его заказали: холодильник маленький, но ждать придётся. Preloading — повар в тихий час заранее нарезал заготовки: заказ выносят почти мгновенно, а зал при этом не заставлен готовыми тарелками. Стратегия предзагрузки — шеф, который решает, для каких блюд делать заготовки: для всех (\`PreloadAllModules\`), ни для каких (\`NoPreloading\`) или только для самых популярных (своя стратегия).

**Какую проблему решает.** Если всё приложение — один бандл, пользователь при первом открытии качает и выполняет код админки, отчётов и настроек, которые, возможно, никогда не откроет. Страдают время до интерактивности (TTI) и мобильный трафик. Code splitting делает старт быстрым, но первый переход на ленивый маршрут ждёт сети — на медленном мобильном интернете это заметная пауза. Preloading соединяет лучшее из двух миров: быстрый старт и мгновенные переходы.

## Словарик терминов

- **Бандл и initial bundle** — JS-файлы приложения; initial — то, что браузер обязан скачать до первого экрана.
- **Чанк (chunk)** — отдельный JS-файл, отрезанный от основного бандла и загружаемый по требованию.
- **Динамический импорт (\`import()\`)** — загрузка модуля во время работы программы, возвращает \`Promise\`; для сборщика это сигнал «вынеси модуль в отдельный чанк».
- **Code splitting** — нарезка кода на чанки; route-level — по маршрутам.
- **Ленивый маршрут (lazy route)** — маршрут, код которого загружается при первом переходе: \`loadComponent\` (один компонент) или \`loadChildren\` (массив дочерних маршрутов).
- **Default export** — \`export default\` в модуле; с ним можно писать \`import('./reports.routes')\` без \`.then(m => m.routes)\`.
- **Preloading (предзагрузка)** — фоновое скачивание чанков ленивых маршрутов до того, как пользователь на них перешёл.
- **\`PreloadingStrategy\`** — абстрактный класс с методом \`preload(route, load)\`: решает для каждого ленивого маршрута, вызывать ли \`load()\`.
- **\`withPreloading\`** — функция-фича для \`provideRouter\`, подключающая стратегию предзагрузки.
- **\`NoPreloading\` / \`PreloadAllModules\`** — встроенные стратегии: ничего не грузить / грузить всё.
- **\`NavigationEnd\`** — событие роутера «навигация успешно завершилась»; после него и стартует предзагрузка.
- **\`canMatch\` / \`canLoad\`** — гварды, которые решают, может ли маршрут вообще сопоставиться (и загрузиться); \`canLoad\` устарел в пользу \`canMatch\`.
- **esbuild** — сборщик, который использует Angular CLI с версии 17 (builder \`@angular/build:application\`).
- **Network Information API (\`navigator.connection\`)** — браузерный API с данными о соединении (\`saveData\`, \`effectiveType\`); есть не во всех браузерах.

## Как это работает под капотом

Механизм по шагам:

1. В конфигурации маршрута вы пишете \`loadComponent: () => import(...)\` или \`loadChildren: () => import(...)\`. Это функция — при старте приложения она **не вызывается**.
2. При сборке esbuild видит \`import()\` и выносит модуль (и всё, что нужно только ему) в отдельный чанк. Код, общий для нескольких ленивых маршрутов, попадает в общий чанк, а не копируется.
3. Пользователь открывает приложение — качается только initial bundle.
4. Пользователь переходит на ленивый маршрут. Для \`loadChildren\` роутер должен узнать дочерние пути, поэтому качает чанк ещё на этапе сопоставления URL — после \`canMatch\`, но **до** \`canActivate\`. Для \`loadComponent\` чанк качается позже — после гвардов и резолверов, прямо перед активацией. Результат кэшируется в объекте маршрута: второй раз не грузится.
5. Если подключён \`withPreloading(strategy)\`, роутер при старте подписывается на свои события и после **каждого** \`NavigationEnd\` обходит конфигурацию. Для каждого ещё не загруженного ленивого маршрута (кроме \`loadChildren\` с гвардом \`canLoad\`) он вызывает \`strategy.preload(route, load)\`.
6. Если стратегия вызвала \`load()\`, чанк скачивается и кэшируется так же, как при обычном переходе; если загрузились дочерние маршруты, их ленивые потомки обходятся рекурсивно. Следующая навигация на этот маршрут уже не ждёт сети.

Упрощённо — так выглядит предзагрузчик роутера (по исходнику Angular 21.1):

\`\`\`ts
class RouterPreloader {
  setUpPreloading() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      concatMap(() => this.processRoutes(this.router.config)),  // проходы идут по очереди
    ).subscribe();
  }

  processRoutes(routes: Route[]) {
    const tasks = [];
    for (const route of routes) {
      const notLoadedYet =
        (route.loadChildren && !route._loadedRoutes && route.canLoad === undefined) ||
        (route.loadComponent && !route._loadedComponent);
      if (notLoadedYet) {
        tasks.push(this.strategy.preload(route, () => loadChunk(route)));   // решает стратегия
      }
      if (route.children || route._loadedRoutes) {
        tasks.push(this.processRoutes(route.children ?? route._loadedRoutes));  // вглубь
      }
    }
    return from(tasks).pipe(mergeAll());   // внутри прохода — параллельно
  }
}
\`\`\`

### \`loadComponent\` — ленивый компонент

\`\`\`ts
{
  path: 'settings',
  canActivate: [authGuard],
  loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
}
\`\`\`

Проверено на Angular 21.1 (без предзагрузки):

\`\`\`text
> navigate /settings
  canActivate settings              ← гвард отрабатывает ДО загрузки чанка
  chunk "settings" requested
  chunk "settings" loaded
  NavigationEnd /settings
\`\`\`

Если гвард не пустил, чанк вообще не скачивается — бесплатная экономия для закрытых разделов. Если в модуле компонент экспортирован по умолчанию (\`export default class SettingsComponent\`), \`.then(...)\` можно не писать.

### \`loadChildren\` — ленивая группа маршрутов

Пример под ответом использует короткую форму с default export:

\`\`\`ts
// app.routes.ts
{ path: 'reports', loadChildren: () => import('./reports.routes') }

// reports.routes.ts — обязательно export default
export default [
  { path: '', component: ReportsListComponent },
  { path: ':id', loadComponent: () => import('./report-details.component') },
] satisfies Routes;
\`\`\`

Роутер сам берёт \`default\` из загруженного модуля. Порядок гвардов здесь другой:

\`\`\`text
> navigate /guarded                 (canMatch + canActivate + loadChildren)
  canMatch guarded                  ← до загрузки
  chunk "guarded.routes" requested
  chunk "guarded.routes" loaded
  canActivate guarded               ← ПОСЛЕ загрузки: роутеру нужны дочерние пути
  NavigationEnd /guarded
\`\`\`

Отсюда правило: чтобы чанк раздела не скачивался вообще без прав, проверку ставят в \`canMatch\`, а не в \`canActivate\`.

### Что делает сборщик: чанки и общий код

Для проверки — два ленивых маршрута, оба используют \`formatMoney\` из \`shared.js\`, собранные esbuild (тем же, что внутри Angular CLI) с code splitting:

\`\`\`text
out/main.js            → loadChildren: () => import("./chunk-YPVD4QMQ.js")
                         loadComponent: () => import("./chunk-Z36OY5E5.js").then(m => m.Admin)
out/chunk-YPVD4QMQ.js  → reports; import { formatMoney } from "./chunk-EFTAXG6F.js"
out/chunk-Z36OY5E5.js  → admin;   import { formatMoney } from "./chunk-EFTAXG6F.js"
out/chunk-EFTAXG6F.js  → shared.js: function formatMoney(...)
\`\`\`

Общий код не дублируется — он выносится в третий чанк, который обе страницы импортируют. Плата — дополнительный запрос: браузер узнаёт об \`import\` общего чанка, только скачав и разобрав чанк страницы. Реальную картину смотрят в выводе \`ng build\` (список lazy chunk files с размерами) и в анализаторе бандла по \`stats.json\` (\`ng build --stats-json\`).

### \`withPreloading\` и момент старта

Предзагрузка подключается фичей в \`provideRouter\`:

\`\`\`ts
bootstrapApplication(App, {
  providers: [provideRouter(routes, withPreloading(PreloadAllModules))],
});
\`\`\`

Когда она начинается — видно по таймлайну (Angular 21.1):

\`\`\`text
[114ms] NavigationEnd /                 ← первая навигация завершилась
[114ms]   chunk "reports.routes" requested
[114ms]   chunk "admin" requested
[114ms]   chunk "settings" requested    ← все ленивые маршруты — параллельно
[126ms]   chunk "reports.routes" loaded
[127ms]   chunk "deep" requested        ← ленивый маршрут внутри reports — после загрузки родителя
\`\`\`

Триггер — \`NavigationEnd\`, а не «приложение стало стабильным»: роутер сначала спокойно завершает первую навигацию, потом использует свободный канал. После каждой следующей навигации проход повторяется и подхватывает маршруты, ставшие доступными (например, дочерние у только что загруженного раздела).

### \`NoPreloading\` — по умолчанию

Если \`withPreloading\` не подключён, работает поведение по умолчанию: ничего не предзагружается, чанки качаются только при переходе. Явно \`withPreloading(NoPreloading)\` пишут редко — например, чтобы переопределить стратегию в отдельной сборке.

\`\`\`text
=== no preloading (default)
[ 33ms] NavigationEnd /       ← и больше ни одного запроса
\`\`\`

Подходит, когда ленивых маршрутов очень много, трафик дорог, или большинство разделов доступны единицам пользователей.

### \`PreloadAllModules\` — грузить всё

Реализация в Angular — буквально одна строка:

\`\`\`ts
class PreloadAllModules implements PreloadingStrategy {
  preload(route: Route, fn: () => Observable<any>) {
    return fn().pipe(catchError(() => of(null)));   // ошибки загрузки проглатываются
  }
}
\`\`\`

Из проверки выше видно ещё два правила: маршрут с \`loadChildren\` и гвардом \`canLoad\` не предзагружается (его чанк не скачался), а сбой загрузки одного чанка не ломает остальные и не попадает в консоль. Для небольшой админки это отличный выбор одной строкой; на крупном продукте вы выкачиваете мегабайты, которые пользователь не откроет.

### Кастомная \`PreloadingStrategy\`

Золотая середина — предзагружать только вероятные следующие экраны по флагу в \`data\`:

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] === true ? load() : of(null);
  }
}
// provideRouter(routes, withPreloading(SelectivePreload))
// { path: 'reports', loadChildren: ..., data: { preload: true } }
\`\`\`

\`\`\`text
[197ms] NavigationEnd /
[197ms]   strategy.preload(reports) -> load()
[197ms]   chunk "reports.routes" requested
[197ms]   strategy.preload(admin) -> of(null)
[197ms]   strategy.preload(settings) -> of(null)
[208ms]   chunk "reports.routes" loaded
[208ms]   strategy.preload(deep) -> of(null)    ← вложенный маршрут тоже спросили
\`\`\`

Стратегия вызывается для **каждого** ленивого маршрута, включая вложенные, как только стал известен их родитель. Флаг лежит рядом с описанием маршрута — решение видно в одном месте.

### Пример: стратегия с учётом сети

\`\`\`ts
@Injectable({ providedIn: 'root' })
export class NetworkAwarePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    const conn = (navigator as any).connection;          // есть не во всех браузерах
    const slow = conn?.saveData || /2g/.test(conn?.effectiveType ?? '');
    return !slow && route.data?.['preload'] ? load() : of(null);
  }
}
\`\`\`

\`navigator.connection\` поддерживают в основном браузеры на Chromium; в остальных \`conn\` будет \`undefined\`, и стратегия ведёт себя как обычная селективная. Есть и готовые решения: библиотека \`ngx-quicklink\` предзагружает маршруты, ссылки на которые сейчас видны на экране.

### Ошибка загрузки чанка после деплоя

Имена чанков содержат хэш содержимого. После нового деплоя старые файлы обычно удаляются, а у пользователя открыта старая версия приложения со старыми ссылками:

\`\`\`text
> navigate /broken
  chunk "broken" requested
  navigate rejected: Failed to fetch dynamically imported module
\`\`\`

Навигация падает с \`NavigationError\`. Обработать централизованно можно через \`withNavigationErrorHandler\`:

\`\`\`ts
provideRouter(routes, withNavigationErrorHandler((e: NavigationError) => {
  const msg = String((e.error as Error)?.message ?? '');
  if (/dynamically imported module|Importing a module script failed/.test(msg)) {
    location.assign(e.url);        // полная загрузка новой версии по нужному адресу
  }
}));
\`\`\`

Тексты ошибки отличаются по браузерам, а защиту от бесконечной перезагрузки (флаг в \`sessionStorage\`) стоит добавить обязательно. Альтернатива — не удалять старые чанки сразу после деплоя.

### \`@defer\` и preloading — разные уровни

\`@defer\` откладывает **часть шаблона** внутри уже открытой страницы и умеет \`prefetch\` по своим триггерам (\`on idle\`, \`on hover\`, \`on viewport\`). Preloading работает с **маршрутами целиком** и запускается после навигации. В реальном приложении их комбинируют: маршрут отчётов предзагружается, а тяжёлый график на нём дополнительно стоит в \`@defer (on viewport)\`.

### Где это применяется на практике

- **Enterprise-порталы** с десятками разделов: каждый раздел — \`loadChildren\`, предзагружаются только 2–3 самых посещаемых по \`data: { preload: true }\`.
- **Админка и закрытые разделы**: \`loadChildren\` + \`canMatch\` по роли — обычный пользователь не скачивает код админки вовсе.
- **Небольшие внутренние приложения**: \`PreloadAllModules\` одной строкой — после первого экрана всё приложение в кэше.
- **Мобильные PWA**: стратегия с учётом \`saveData\` и типа сети, чтобы не тратить трафик.
- **Лендинг + личный кабинет**: лендинг в initial bundle, кабинет — ленивый и предзагружается после первой навигации, пока пользователь читает страницу.
- **Мастера и воронки** (checkout, онбординг): следующий шаг предзагружается, пока пользователь заполняет текущий.

## Важные нюансы и подводные камни

- **\`PreloadAllModules\` на большом приложении** — вы качаете всё, включая админку, которую пользователь не увидит. Мобильный трафик скажет спасибо.
- **Предзагрузка стартует после \`NavigationEnd\`**, а не «когда приложение стало стабильным», и повторяется после каждой навигации. Проходы обрабатываются по очереди (\`concatMap\`), поэтому кастомная стратегия должна возвращать завершающийся Observable — бесконечный поток заблокирует следующие проходы.
- **Порядок гвардов и загрузки зависит от типа маршрута.** Для \`loadComponent\` чанк качается после \`canActivate\` и резолверов. Для \`loadChildren\` — после \`canMatch\`, но до \`canActivate\`: тяжёлый или запрещающий \`canActivate\` не экономит загрузку раздела. Запрещать «не качать вовсе» нужно через \`canMatch\`.
- **\`canLoad\` отключает предзагрузку**, \`canMatch\` — нет. Маршрут с \`canMatch\` будет предзагружен стратегией независимо от прав (секретов в клиентском коде всё равно быть не должно).
- **Общий код нескольких ленивых маршрутов** esbuild выносит в общий чанк, а не дублирует. Но это лишние запросы и «водопад» загрузки — смотрите на реальную карту бандла, а не на предположения.
- **Не путать preloading с \`prefetch\` у \`@defer\`**: разные уровни (маршрут против части шаблона), любимый уточняющий вопрос.
- **Ошибка загрузки чанка после деплоя**: хэши файлов поменялись, старый чанк исчез, навигация падает. Нужен \`withNavigationErrorHandler\` с мягкой перезагрузкой или хранение старых чанков. \`PreloadAllModules\` такие ошибки молча проглатывает.
- **Статический импорт убивает ленивость.** Если ленивый компонент где-то импортирован обычным \`import\` (например, ради типа в значении, константы или в другом eager-компоненте), его код попадёт в чанк, который грузится при старте, а «ленивый» чанк станет пустой обёрткой-реэкспортом (так ведёт себя esbuild — проверено).
- **Слишком мелкая нарезка** маршрутов даёт десятки запросов вместо одного — накладные расходы съедают выигрыш.
- Спросят про **SSR**: сервер рендерит ленивый маршрут целиком, но для гидрации текущей страницы клиенту всё равно нужен её чанк, поэтому для первого экрана ленивость не экономит время; incremental hydration работает на уровне \`@defer\`-блоков, а не маршрутов.

**Плюсы:** маленький initial bundle и быстрый старт; код закрытых разделов не скачивается без прав (при \`canMatch\`); предзагрузка убирает задержку переходов; стратегия — одна функция, которую легко подстроить под данные, сеть и роли.
**Минусы:** первый переход без предзагрузки ждёт сети; \`PreloadAllModules\` расходует трафик; ошибки загрузки чанков после деплоя надо обрабатывать; порядок гвардов и загрузки разный для \`loadComponent\` и \`loadChildren\`; лишняя нарезка порождает водопад запросов.

## Как это спрашивают на собеседовании

**Главный вывод:** \`loadComponent\` и \`loadChildren\` с динамическим \`import()\` превращают маршрут в отдельный чанк, который грузится при первом переходе; \`withPreloading\` после каждого \`NavigationEnd\` вызывает стратегию для каждого незагруженного ленивого маршрута — \`NoPreloading\` по умолчанию, \`PreloadAllModules\` грузит всё, а своя \`PreloadingStrategy\` выбирает нужное по \`route.data\`.

Типичные формулировки: «Как работает lazy loading в Angular?», «Какие стратегии preloading бывают?», «Как написать свою стратегию предзагрузки?», «Чем preloading отличается от \`@defer\`?».

Что могут спросить следом:

- *Когда начинается предзагрузка?* — После \`NavigationEnd\` первой навигации и затем после каждой следующей.
- *Что вернуть из \`preload\`, чтобы пропустить маршрут?* — \`of(null)\`; чтобы загрузить — результат \`load()\`.
- *Предзагружается ли маршрут с \`canMatch\`? А с \`canLoad\`?* — С \`canMatch\` да, с \`canLoad\` (для \`loadChildren\`) нет.
- *Когда грузится чанк \`loadChildren\` относительно \`canActivate\`?* — До него: роутеру нужны дочерние маршруты для сопоставления URL.
- *Что делать с «Failed to fetch dynamically imported module» после деплоя?* — Ловить \`NavigationError\` в \`withNavigationErrorHandler\` и делать полную перезагрузку с защитой от цикла.

### Ответ на 1 минуту

> Code splitting на уровне маршрутов — это \`loadComponent\` и \`loadChildren\` с динамическим \`import()\`: сборщик выносит код маршрута в отдельный чанк, общий код — в общие чанки, и initial bundle уменьшается. Плата — задержка при первом переходе, пока чанк едет по сети. Её убирает preloading, который подключается через \`withPreloading\` в \`provideRouter\`: после каждого \`NavigationEnd\` роутер обходит конфигурацию и для каждого незагруженного ленивого маршрута вызывает \`preload(route, load)\` стратегии. По умолчанию это \`NoPreloading\`; \`PreloadAllModules\` качает всё и проглатывает ошибки, на большом приложении это лишние мегабайты. Поэтому я обычно пишу свою стратегию: флаг \`preload\` в \`route.data\`, иногда проверка \`saveData\` у соединения. Из нюансов: маршруты с \`canLoad\` не предзагружаются, чанк \`loadChildren\` грузится до \`canActivate\`, так что закрывать раздел лучше \`canMatch\`, а ошибки загрузки чанков после деплоя ловлю в \`withNavigationErrorHandler\`.`,
      en: `## In short

Code splitting slices the app up: the code of each lazy route moves into a **separate chunk** downloaded only when you navigate to that route. Preloading removes the main drawback of that approach — it quietly **fetches those chunks in the background** while the user is doing nothing.

Analogy: a **restaurant**. Lazy loading means the dish is only started once you order it: a small fridge, but you wait. Preloading is the chef prepping ingredients during the quiet hour: the order comes out almost instantly, and the dining room is not cluttered with pre-made plates.

## How it works, step by step

1. In your routes you write \`loadComponent\` or \`loadChildren\` with a dynamic \`import()\`.
2. The bundler sees the dynamic import and **carves** that code out of the main bundle into its own chunk.
3. The user opens the app — only the main bundle is downloaded, so startup is faster.
4. The user navigates to \`/admin\` — only now does the browser fetch the chunk over the network. That is the drawback: **the first navigation stalls**.
5. You enable preloading in \`provideRouter\`, and the router — once the app becomes **stable**, i.e. after the first render — starts fetching lazy chunks in the background.
6. By the time the real navigation happens the chunk is already cached, and the transition is instant.

## Example

\`\`\`ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
}
\`\`\`

\`\`\`ts
@Injectable()
export class SelectivePreload implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>) {
    return route.data?.['preload'] ? load() : of(null);
  }
}
provideRouter(routes, withPreloading(SelectivePreload))
\`\`\`

Why it looks like this: a strategy is a "fetch or not" function called for **every** lazy route. Return \`load()\` and it downloads; return \`of(null)\` and it skips. The flag comes from \`route.data\`, so the decision stays next to the route definition.

## Which strategy to pick

- **\`NoPreloading\`** — the default. Nothing is prefetched; fine when bandwidth is expensive or you have a great many lazy routes.
- **\`withPreloading(PreloadAllModules)\`** — fetches **everything**. One line, an excellent result for a small admin app; on a large product you download megabytes the user will never open.
- **A custom strategy** — the sweet spot: preload the two or three most likely next screens via a \`data: { preload: true }\` flag. You can also check \`navigator.connection\` (Network Information API) and fetch nothing on a slow or flaky connection.

And separately: \`@defer\` and preloading are **different** tools. \`@defer\` defers **parts of a template**, preloading works with **routes**. Real apps combine them.

## What to say in the interview

> Route-level code splitting is done with \`loadComponent\` and \`loadChildren\` plus a dynamic \`import()\`: the bundler moves that code into a separate chunk and the initial bundle shrinks. The price is a delay on the first navigation while the chunk travels over the network. Preloading removes it, configured in \`provideRouter\` through \`withPreloading\`. Out of the box there is \`NoPreloading\` by default and \`PreloadAllModules\`, which fetches every lazy route in the background — simple, but excessive on a large app. So people usually write their own \`PreloadingStrategy\`: its \`preload\` method receives the \`Route\` and a load function and decides whether to call it or return \`of(null)\`; the decision typically comes from a flag in \`route.data\`. An important detail: preloading only starts once the app is stable, that is after the first render, so it does not compete for bandwidth with critical resources.

## Gotchas

- **\`PreloadAllModules\` on a large app** downloads everything, including the admin area the user will never see. Mobile data users will not thank you.
- **A shared dependency across several lazy routes** either duplicates across chunks or gets hoisted into a common one — read the real bundle map instead of guessing.
- **Do not confuse preloading with \`@defer\`'s prefetch**: different levels (route versus template part), a favourite follow-up question.
- **Guards run before the chunk loads** — a heavy \`canActivate\` cancels out the gain.
- **Chunk load failures after a deploy**: file hashes changed, the old chunk is gone, navigation throws. You need a retry or a soft page reload.
- **Over-splitting routes** produces dozens of requests instead of one — the overhead eats the benefit.
- They will ask about **SSR**: lazy routes affect hydration boundaries, which matters for incremental hydration.`,
    },
    codeSnippet: `bootstrapApplication(App, {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
// route: { path: 'reports', loadChildren: () => import('./reports.routes') }`,
  },
  {
    id: 'ng-052',
    category: 'angular-signals',
    level: 'Expert',
    tags: ['async-pipe', 'pure-pipe', 'memoization'],
    question: {
      ru: 'Как async pipe работает внутри и почему чистые пайпы мемоизируются, а нечистые — нет?',
      en: 'How does the async pipe work internally, and why are pure pipes memoized while impure ones are not?',
    },
    answer: {
      ru: `## В чём суть

Пайп — это функция преобразования, которую вызывают прямо в шаблоне: \`{{ price | currency }}\`. По умолчанию пайп **чистый (pure)**: Angular запоминает последние аргументы и результат и не вызывает \`transform\`, пока не изменилась **ссылка** хотя бы на один аргумент. \`pure: false\` эту память отключает, и \`transform\` вызывается на **каждом** проходе проверки изменений. \`AsyncPipe\` — как раз нечистый пайп с состоянием: он сам подписывается на Observable или Promise, хранит последнее значение, помечает компонент для перерисовки при новом значении и сам отписывается.

Аналогия: **калькулятор с памятью**. Спросили «2 + 2» — посчитал и записал ответ на бумажку. Спросили то же самое — просто показал бумажку, не считая заново. Это pure. Нечистый пайп — сотрудник, который на каждый взгляд в его сторону пересчитывает всё с нуля: иногда так надо, но дорого. А \`async\` — **секретарь, подписанный на рассылку**: пришло письмо — кладёт его на стол и вешает флажок «есть новое»; вы смотрите на стол — видите последнее письмо; секретарь уволился — рассылку он отменил сам.

**Какую проблему решает.** Выражения шаблона пересчитываются при каждой проверке изменений (change detection), а их могут быть десятки в секунду. Если в шаблоне вызван метод \`{{ format(user) }}\`, он выполняется каждый раз. Чистый пайп даёт бесплатную мемоизацию: дорогое форматирование выполнится только при смене входа. \`AsyncPipe\` решает вечную проблему ручных подписок: не нужно писать \`subscribe\`, хранить значение в поле, помнить об отписке и вручную будить OnPush-компонент.

## Словарик терминов

- **Пайп (pipe)** — класс с декоратором \`@Pipe\` и методом \`transform(value, ...args)\`; в шаблоне вызывается через \`|\`.
- **Change detection (CD), проход проверки** — процесс, в котором Angular обходит дерево компонентов, пересчитывает выражения шаблонов и обновляет DOM, если значения изменились.
- **Чистый пайп (pure pipe)** — пайп, результат которого зависит только от аргументов; Angular вызывает его только при смене аргументов. Это значение по умолчанию.
- **Нечистый пайп (impure pipe, \`pure: false\`)** — пайп, который вызывается на каждом проходе CD, потому что может зависеть от внутреннего состояния, времени или мутаций.
- **Мемоизация (memoization)** — запоминание результата функции для тех же аргументов, чтобы не считать повторно.
- **\`Object.is\`** — строгое сравнение; для объектов и массивов сравнивает ссылки, а не содержимое.
- **\`OnPush\`** — стратегия CD, при которой компонент проверяется, только если изменился его \`input\` по ссылке, произошло событие в нём или его явно пометили.
- **\`ChangeDetectorRef.markForCheck()\`** — пометить view компонента и всех его предков «надо проверить» при ближайшем проходе CD; сама проверка сразу не запускается.
- **\`detectChanges()\`** — синхронно запустить проверку этого компонента и его детей прямо сейчас.
- **Zoneless** — режим без Zone.js (\`provideZonelessChangeDetection()\`), где проверка запускается только по сигналам, событиям шаблона и \`markForCheck\`.
- **\`AsyncPipe\`** — встроенный нечистый пайп \`async\` для Observable, Promise и любых объектов с методом \`subscribe\` (\`Subscribable\`).
- **\`@let\`** — объявление локальной переменной в шаблоне: \`@let user = user$ | async;\`.
- **Dev mode и \`checkNoChanges\`** — в режиме разработки Angular после проверки делает контрольный проход, чтобы поймать значения, изменившиеся во время самой проверки (ошибка NG0100).

## Как это работает под капотом

Как Angular вызывает пайп:

1. Компилятор превращает каждое использование \`| pipe\` в шаблоне в две инструкции: \`ɵɵpipe(slot, 'name')\` при создании view (создаёт **отдельный экземпляр** пайпа на каждое место использования) и \`ɵɵpipeBind1(slot, offset, value)\` при каждом обновлении.
2. На проходе CD \`pipeBind\` смотрит флаг \`pure\` в определении пайпа.
3. Для чистого пайпа он сравнивает каждый аргумент с сохранённым в слотах этого view через \`Object.is\`. Все совпали — возвращает сохранённый результат, **не вызывая** \`transform\`. Хоть один отличается — вызывает \`transform\` и запоминает новые аргументы и результат.
4. Кэш — размером в одну запись на каждое место использования: помнится только последний вызов. Это не словарь «аргументы → результат».
5. Для нечистого пайпа шаг сравнения пропускается: \`transform\` вызывается на каждом проходе. В dev mode проходов два (обычный и контрольный \`checkNoChanges\`), значит и вызовов два.
6. Если view вообще не проверяется (например, OnPush-компонент без изменений), \`pipeBind\` не выполняется, и никакой пайп — даже нечистый — не вызывается.

Упрощённо (по исходнику Angular 21.1):

\`\`\`ts
function pipeBind1(slot: number, bindingIdx: number, value: unknown) {
  const pipe = lView[slot];
  if (!pipeDef.pure) {
    return pipe.transform(value);                       // impure: всегда
  }
  if (Object.is(lView[bindingIdx], value)) {
    return lView[bindingIdx + 1];                       // pure: тот же аргумент → кэш
  }
  lView[bindingIdx] = value;
  return (lView[bindingIdx + 1] = pipe.transform(value)); // новый аргумент → пересчёт
}
\`\`\`

### Пример 1. Сколько раз вызывается \`transform\`

Два одинаковых пайпа-сумматора, чистый и нечистый, и сигнал \`other\`, чтобы гонять проверки, не трогая \`items\` (Angular 21.1, zoneless):

\`\`\`ts
@Pipe({ name: 'sum' })                 class SumPipe       { transform(a: number[]) { calls.pure++;   return a.reduce((x, y) => x + y, 0); } }
@Pipe({ name: 'sumImpure', pure: false }) class SumImpurePipe { transform(a: number[]) { calls.impure++; return a.reduce((x, y) => x + y, 0); } }

// template: pure={{ items | sum }} impure={{ items | sumImpure }} again={{ items | sum }} other={{ other() }}
// items = [1, 2, 3]
\`\`\`

\`\`\`text
initial                         pure=6 impure=6 again=6   | pure calls=2, impure calls=2
pure pipe instances (2 usages): 2
after 3 unrelated CD passes     pure=6 impure=6 again=6   | pure calls=2, impure calls=8
after items.push(4) + CD        pure=6 impure=10 again=6  | pure calls=2, impure calls=10
after new array reference + CD  pure=10 impure=10 again=10| pure calls=4, impure calls=12
\`\`\`

Что видно. Чистый пайп за три лишних прохода не вызвался ни разу. Нечистый вызывался по два раза за проход — это dev mode; в production-сборке (проверено с \`enableProdMode()\`) тот же сценарий даёт по одному вызову: 1, 4, 5, 6. Два использования \`| sum\` — два экземпляра и два вызова: кэш не общий.

### Чистый пайп и мутация

Строка \`after items.push(4)\` из примера выше — главная ловушка темы: массив изменился, но ссылка та же, \`Object.is\` говорит «то же самое», и чистый пайп продолжает показывать \`6\`. Нечистый увидел \`10\`, потому что не сравнивает. Правильное лечение — не делать пайп нечистым, а обновлять данные иммутабельно:

\`\`\`ts
this.items = [...this.items, 4];            // новая ссылка → чистый пайп пересчитается
this.items.update(list => [...list, 4]);    // то же самое с сигналом
\`\`\`

### Нечистый пайп — пример под ответом

\`\`\`ts
@Pipe({ name: 'filter', pure: false })   // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term));   // keep this cheap!
  }
}
\`\`\`

Его сделали нечистым, чтобы он замечал мутации массива \`items\` (\`push\`, \`splice\`). Цена: \`filter\` по всему списку на каждом проходе CD — от клика, таймера, любого события — и ещё раз в dev mode. На списке в 10 000 строк это заметно. Кроме того, каждый вызов возвращает **новый** массив; в dev mode контрольный проход сравнивает массивы поэлементно, поэтому ошибки NG0100 нет, но всё, что ниже зависит от этого массива по ссылке, тоже будет считать его изменившимся.

Современная замена — \`computed\`, который мемоизирует по сигналам и пересчитывается только при реальной смене входов:

\`\`\`ts
items = signal<Item[]>([]);
term = signal('');
filtered = computed(() => this.items().filter(i => i.name.includes(this.term())));
// template: @for (item of filtered(); track item.id) { ... }
\`\`\`

### Встроенные нечистые пайпы

Из \`@angular/common\` нечистые: \`async\` (состояние — подписка), \`json\` (для отладки: должен показывать мутации объекта), \`keyvalue\` (обходит объект или \`Map\`, которые часто мутируют), \`slice\` (работает с мутируемыми массивами и строками). Остальные — \`date\`, \`currency\`, \`number\`, \`percent\`, \`uppercase\`, \`titlecase\` — чистые: их результат зависит только от аргументов.

### Метод в шаблоне, пайп или \`computed\`

\`\`\`html
{{ formatName(user) }}          <!-- метод: вызывается на КАЖДОМ проходе CD -->
{{ user | fullName }}           <!-- чистый пайп: только при смене ссылки user -->
{{ fullName() }}                <!-- computed: только при смене сигналов-входов -->
\`\`\`

Чистый пайп — лучший выбор для переиспользуемых преобразований «вход → выход» (форматирование, маппинг справочников). \`computed\` — для производного состояния конкретного компонента. Метод в шаблоне допустим, если он тривиален.

### \`AsyncPipe\` изнутри

Сокращённо — так он устроен в Angular 21.1:

\`\`\`ts
@Pipe({ name: 'async', pure: false })
export class AsyncPipe implements OnDestroy {
  private latestValue: any = null;
  private obj: Observable<any> | Promise<any> | null = null;
  private subscription: Unsubscribable | null = null;
  private markOnUpdate = true;

  constructor(private ref: ChangeDetectorRef) {}

  transform(obj) {
    if (!this.obj) {                                   // 1. первый вызов
      if (obj) {
        this.markOnUpdate = false;                     //    синхронное значение просто вернём
        this.subscribe(obj);
        this.markOnUpdate = true;
      }
      return this.latestValue;                         //    null, пока ничего не пришло
    }
    if (obj !== this.obj) {                            // 2. источник сменился по ссылке
      this.dispose();                                  //    отписка от старого
      return this.transform(obj);                      //    и подписка на новый
    }
    return this.latestValue;                           // 3. обычный проход: только кэш
  }

  private subscribe(obj) {
    this.obj = obj;
    this.subscription = untracked(() => obj.subscribe({    // Promise — через .then
      next: v => this.update(obj, v),
      error: e => errorHandler.handleError(e),             // ошибка уходит в ErrorHandler
    }));
  }

  private update(obj, v) {
    if (obj === this.obj) {                            // ответ от старого источника игнорируется
      this.latestValue = v;
      if (this.markOnUpdate) this.ref.markForCheck();  // 4. «есть новое»
    }
  }

  private dispose() {
    this.subscription?.unsubscribe();
    this.latestValue = null; this.obj = null; this.subscription = null;
  }

  ngOnDestroy() { if (this.subscription) this.dispose(); }   // 5. автоматическая отписка
}
\`\`\`

Ключевая мысль: пайп нечистый, \`transform\` зовётся часто, но работы в нём почти нет — сравнение ссылок и возврат кэша. Реальная работа происходит только при новом значении из потока.

### Пример 2. Два \`| async\` — две подписки

\`\`\`ts
const fakeHttp = (name: string) => defer(() => { console.log('HTTP request'); return timer(20).pipe(map(() => ({ name }))); });

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`name={{ (user$ | async)?.name }} again={{ (user$ | async)?.name }}\`,
})
class Two { user$ = fakeHttp('Ann'); }
\`\`\`

\`\`\`text
HTTP request #1 (Ann)
HTTP request #2 (Ann)                 ← каждый | async — свой экземпляр и своя подписка
before value: "name= again="          ← до первого значения async возвращает null
after value: "name=Ann again=Ann"     ← OnPush-компонент обновился сам, через markForCheck
\`\`\`

Холодный Observable (а \`HttpClient\` возвращает именно такой) выполняется заново для каждого подписчика. Два \`| async\` в шаблоне — два HTTP-запроса.

### \`@let\` и \`as\` — одна подписка

\`\`\`html
@let user = user$ | async;
name={{ user?.name }} again={{ user?.name }}
<!-- HTTP request #1 (Bob); " name=Bob again=Bob" requests=1 -->

@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Оба способа сохраняют результат одного \`| async\` в переменную шаблона. Но у \`@if (...; as x)\` есть ловушка — ложные значения:

\`\`\`html
@if (count$ | async; as count) { count={{ count }} } @else { (nothing shown) }
<!-- count$ = of(0) → "(nothing shown)": 0 — falsy, блок не рендерится -->
\`\`\`

Для чисел, строк и флагов, где \`0\`, \`''\` и \`false\` — законные значения, используйте \`@let\` (появился в Angular 18.1). Ещё вариант — поделиться одним выполнением потока через \`shareReplay({ bufferSize: 1, refCount: true })\`, но это уже лечение на стороне данных.

### Пример 3. Смена источника и уничтожение

\`\`\`ts
@Component({ template: \`@if (show()) { {{ src() | async }} }\` })
class Swap { src = signal(mk('A')); show = signal(true); }
// mk(name) — Observable, который логирует subscribe/unsubscribe и каждые 5ms выдаёт name
\`\`\`

\`\`\`text
subscribe A
shows "A"
src.set(mk('B'))  → unsubscribe A
                    subscribe B
shows "B"
show.set(false)   → unsubscribe B     ← ngOnDestroy пайпа при уничтожении view
\`\`\`

Вот почему \`async\` не течёт: отписка происходит и при смене источника по ссылке, и при уничтожении view, в котором стоит пайп. Отсюда же совет: не создавайте Observable в шаблоне вызовом метода. Каждый проход вернёт новую ссылку, пайп отпишется и подпишется заново, а пришедший ответ вызовет новый проход:

\`\`\`ts
getUser() { return defer(() => { requests++; return timer(10).pipe(map(() => 'Ann')); }); }
// template: user={{ getUser() | async }}
// через 200ms: requests = 32, DOM "user="   ← бесконечный цикл запросов, значение так и не показалось
\`\`\`

Observable создают один раз — в поле класса — и в шаблоне ссылаются на поле.

### \`markForCheck\`, а не \`detectChanges\`

Получив значение, \`AsyncPipe\` вызывает \`markForCheck()\`: помечает свой view и все view-предки до корня как «требующие проверки». Сама проверка не запускается немедленно — она пройдёт при ближайшем цикле CD. Так несколько значений, пришедших подряд, приводят к одной перерисовке, а OnPush-предки не отрезают компонент от проверки. В zoneless-режиме \`markForCheck\` ещё и сообщает планировщику, что нужен проход CD, — поэтому пример 2 обновился без Zone.js и без ручного вызова.

### Ошибки в потоке

\`\`\`ts
e$ = timer(5).pipe(map(() => { throw new Error('boom'); }));
// template: v={{ e$ | async }}
// DOM: "v="   ErrorHandler got: ["boom"]
\`\`\`

Ошибка не ломает шаблон: она уходит в \`ErrorHandler\`, а пайп продолжает возвращать последнее значение (здесь \`null\`). Показать пользователю состояние ошибки — задача потока: \`catchError(() => of(fallback))\` или отдельный поток ошибки.

### \`toSignal\` — альтернатива \`async\`

\`\`\`ts
user = toSignal(this.api.getUser());          // Signal<User | undefined>
// template: {{ user()?.name }}  — одна подписка, сколько бы раз ни читали
\`\`\`

\`toSignal\` подписывается один раз в классе компонента, отписывается через \`DestroyRef\`, а в шаблоне читается как обычный сигнал — проблема «двух \`| async\`» исчезает сама. В сигнальном коде это всё чаще заменяет \`async\`.

### Где это применяется на практике

- **Форматирование в больших таблицах**: даты, валюты, статусы по справочнику — чистые пайпы, которые не пересчитываются, пока строка не изменилась.
- **Маппинг кодов в подписи** (\`status | statusLabel\`, \`userId | userName\`) с переводами — чистый пайп, справочник в сервисе.
- **Отображение потоков из сервисов и NgRx**: \`@let vm = vm$ | async;\` в OnPush-компонентах.
- **Переводы**: пайп \`translate\` в ngx-translate нечистый — он должен заметить смену языка, поэтому его вызовы — это цена каждого прохода CD.
- **Отладка**: \`{{ form.value | json }}\` — нечистый, чтобы показывать мутации объекта формы.
- **Миграция на сигналы**: \`computed\` вместо нечистых пайпов фильтрации, \`toSignal\` вместо множества \`| async\`.

## Важные нюансы и подводные камни

- **\`arr.push()\` и чистый пайп** — экран не обновился. Классика; лечится новой ссылкой (\`[...arr, x]\`), а не превращением пайпа в нечистый.
- **Несколько \`| async\` на один поток** = несколько подписок = несколько HTTP-запросов. Спасает \`@let\`, \`as\`, \`shareReplay\` или \`toSignal\`.
- **\`@if (x$ | async; as x)\` скрывает \`0\`, \`''\` и \`false\`** — для таких значений берите \`@let\`.
- **\`async\` возвращает \`null\` до первого значения** — тип результата \`T | null\`, в шаблоне нужен \`?.\` или начальное значение в потоке (\`startWith\`).
- **Метод, возвращающий Observable, в шаблоне** (\`getUser() | async\`) — новая ссылка на каждом проходе, бесконечные переподписки и запросы, а значение может так и не появиться.
- **Тяжёлая логика в нечистом пайпе** убивает производительность: он выполняется на каждом проходе CD, в dev mode — дважды.
- **Фильтрация и сортировка в пайпах** — известный антипаттерн; Angular сознательно не даёт \`filter\` / \`orderBy\` из коробки. Используйте \`computed\` или подготовку данных в компоненте.
- **Пайп с сайд-эффектами** (запрос внутри \`transform\`) непредсказуем: вы не контролируете, сколько раз его вызовут.
- **Кэш чистого пайпа — одна запись на место использования.** Если аргументы чередуются (\`a\`, \`b\`, \`a\`), пересчёт будет каждый раз; экземпляры в разных местах шаблона и в разных строках \`@for\` кэш не делят.
- **Состояние внутри чистого пайпа** — ошибка: результат обязан зависеть только от аргументов, иначе мемоизация покажет устаревшее значение.
- Спросят: **почему \`async\` не течёт** — ответ про \`ngOnDestroy\` самого пайпа и отписку при смене источника по ссылке.
- **\`markForCheck\`, а не \`detectChanges\`** — важная деталь: пайп только помечает путь до корня грязным, а не запускает проверку немедленно.
- **Promise в \`async\` не отменяется** — при смене источника или уничтожении результат просто игнорируется, запрос всё равно выполнится.

**Плюсы:** чистые пайпы дают бесплатную мемоизацию прямо в шаблоне и переиспользуемы; нечистые позволяют работать с изменяемыми и зависящими от времени данными; \`async\` убирает ручные подписки, отписки и \`markForCheck\`, корректно работает с OnPush и zoneless.
**Минусы:** чистый пайп слеп к мутациям и кэширует только последний вызов; нечистый дорог и вызывается дважды в dev mode; каждый \`| async\` — отдельная подписка, \`null\` до первого значения и ловушка с falsy-значениями в \`as\`; ошибки потока уходят в \`ErrorHandler\`, а не в UI.

## Как это спрашивают на собеседовании

**Главный вывод:** чистый пайп вызывается только при смене аргументов по \`Object.is\` — Angular хранит последние аргументы и результат в слотах view, это мемоизация размером в одну запись; нечистый вызывается на каждом проходе CD. \`AsyncPipe\` — нечистый пайп с состоянием: подписывается, кэширует последнее значение, вызывает \`markForCheck\` при новом и отписывается при смене источника и уничтожении view.

Типичные формулировки: «Чем pure pipe отличается от impure?», «Почему пайп не обновился после \`push\`?», «Как \`async\` работает с OnPush?», «Почему \`async\` не даёт утечек?».

Что могут спросить следом:

- *Делит ли Angular экземпляр пайпа между местами использования?* — Нет, каждое \`| pipe\` в шаблоне — свой экземпляр и свой кэш.
- *Что вернёт \`async\` до первого значения?* — \`null\`.
- *Почему \`async\` вызывает \`markForCheck\`, а не \`detectChanges\`?* — Чтобы не запускать проверку на каждое значение синхронно, а пометить путь к корню и дождаться ближайшего прохода; это и будит OnPush-предков.
- *Как избежать двух подписок?* — \`@let\`, \`as\`, \`shareReplay\` или \`toSignal\`.
- *Чем заменить нечистый пайп фильтрации?* — \`computed\` по сигналам или подготовкой данных в компоненте.

### Ответ на 1 минуту

> По умолчанию пайп чистый: компилятор создаёт экземпляр на каждое место использования, а при проверке изменений Angular сравнивает аргументы с сохранёнными через \`Object.is\` и, если ссылки те же, отдаёт сохранённый результат без вызова \`transform\`. Это мемоизация на одну запись, поэтому мутация массива через \`push\` чистый пайп не обновит — нужна новая ссылка. \`pure: false\` отключает сравнение: \`transform\` вызывается на каждом проходе, в dev mode даже дважды, значит он обязан быть дешёвым, а фильтрацию лучше делать через \`computed\`. \`AsyncPipe\` — нечистый пайп с состоянием: при первом вызове подписывается, на каждое значение сохраняет его и вызывает \`markForCheck\`, что будит OnPush и zoneless, а \`transform\` просто возвращает кэш. При смене источника по ссылке и в \`ngOnDestroy\` он отписывается, поэтому не течёт. Нюанс: каждый \`| async\` — отдельная подписка, так что результат я выношу в \`@let\`.`,
      en: `## In short

A pipe is **pure** by default: Angular remembers the last result and does not recompute it until the **reference** of an input argument changes. \`pure: false\` switches that memory off, and \`transform\` runs on **every** change detection pass.

Analogy: **a calculator with memory**. You ask "2 + 2" — it computes and writes the answer on a sticky note. Ask the same again — it just shows the note without recomputing. That is pure. An impure pipe is the colleague who recalculates everything from scratch every time you glance their way: sometimes necessary, always expensive.

## How it works, step by step

1. On every change detection cycle Angular reaches the expression containing the pipe.
2. For a **pure** pipe it compares the input arguments with the previous ones — by reference, via \`Object.is\`.
3. Same arguments — \`transform\` is **not called at all**, the stored result is returned. This is CD-level memoization, and it is exactly what makes pipes cheap.
4. Reference changed — \`transform\` runs and the result is cached anew.
5. Hence the important consequence: **mutating an array without a new reference** (\`arr.push(x)\`) does **not** update a pure pipe. You need a new reference.
6. For an **impure** pipe (\`pure: false\`) the comparison step is dropped: \`transform\` runs on every CD pass. That is required by pipes depending on internal state or time: \`async\`, \`json\` for debugging, a filter over a mutated array. The cost is hundreds of calls per second, so \`transform\` must be extremely cheap.

## Example

\`\`\`html
@if (user$ | async; as user) { {{ user.name }} }
\`\`\`

Why it looks like this: \`as user\` stores the result in a template variable. Without that trick each repeated \`user$ | async\` in the markup creates its **own subscription** — and for an HTTP stream that means another request.

## How AsyncPipe works inside

\`AsyncPipe\` is an impure pipe **with state**:

1. On the first \`transform(obs$)\` it **subscribes** to the Observable or Promise and remembers the source reference.
2. On each incoming value the callback stores it in a field and calls \`ChangeDetectorRef.markForCheck()\` — marking the view and all its ancestors dirty. That is precisely why \`async\` works correctly with OnPush and in zoneless mode.
3. \`transform\` itself merely returns the **cached latest value**. It is called often, since the pipe is impure, but real work only happens on a new emission.
4. If the source reference **changes**, the pipe **unsubscribes** from the old one and subscribes to the new one.
5. In the pipe's \`ngOnDestroy\` the subscription is closed — that is the **automatic unsubscription** with no leaks.

## What to say in the interview

> By default a pipe is pure, and Angular calls its \`transform\` only when the reference of an input argument changes; the result is cached, so this is memoization at the change detection level, which is what makes pipes cheap. The \`pure: false\` flag disables memoization and \`transform\` starts running on every CD pass; that is needed for pipes with internal state or a time dependency, so such a \`transform\` must be as light as possible. \`AsyncPipe\` is exactly that kind of stateful impure pipe: on the first call it subscribes to the Observable or Promise and remembers the reference, on each value it stores the value and calls \`ChangeDetectorRef.markForCheck()\`, which is critical for OnPush and zoneless, while \`transform\` itself just hands back the last cached value. In its own \`ngOnDestroy\` it closes the subscription — hence automatic unsubscription without leaks. A practical nuance: several \`async\` pipes on the same stream create several subscriptions, so the result is extracted via \`as\`.

## Gotchas

- **\`arr.push()\` with a pure pipe** — the screen does not update. A classic; fixed with a new reference (\`[...arr, x]\`).
- **Several \`| async\` on one stream** = several subscriptions = several HTTP requests. Use \`as\` or \`shareReplay\`.
- **Heavy logic in an impure pipe** destroys performance: it runs on every CD pass, and there can be hundreds.
- **Filtering and sorting inside pipes** is a well-known anti-pattern; Angular deliberately ships no built-in \`filter\`/\`orderBy\`.
- **A pipe with side effects** (a request inside \`transform\`) is unpredictable: you do not control how many times it is invoked.
- They will ask **why \`async\` does not leak** — the answer is the pipe's own \`ngOnDestroy\` plus the source-reference swap.
- **\`markForCheck\`, not \`detectChanges\`** — an important detail: the pipe only marks the path to the root dirty, it does not trigger a check immediately.`,
    },
    codeSnippet: `@Pipe({ name: 'filter', pure: false }) // impure: runs every CD pass
export class FilterPipe implements PipeTransform {
  transform(items: Item[], term: string): Item[] {
    return items.filter(i => i.name.includes(term)); // keep this cheap!
  }
}`,
  },
];
