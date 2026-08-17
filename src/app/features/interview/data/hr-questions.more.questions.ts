import { InterviewQuestion } from '../interfaces/question.interface';

/**
 * HR-screening questions, part 2 (ids `hr-015`…`hr-029`).
 *
 * Same format as `hr-questions.questions.ts`: both languages live inside each
 * answer (EN script → RU translation → tips → useful phrases), so the card is
 * usable no matter which locale is active. Personal facts come from the CV:
 * 8 years of experience, 4 of them at Exadel on a FinTech enterprise portal,
 * grid presets + shared components + KendoUI major upgrades, English-only
 * project, Warsaw / B2B.
 */
export const HR_QUESTIONS_MORE: InterviewQuestion[] = [
  {
    id: 'hr-015',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['current-project', 'domain', 'self-presentation'],
    question: {
      ru: 'Расскажите о вашем текущем проекте: что это за продукт, какая команда, чем занимаетесь именно вы? / Tell me about your current project.',
      en: 'Tell me about your current project — what is the product, the team, and your role in it? / Расскажите о вашем текущем проекте.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I work on a large enterprise portal in the **FinTech** domain. It is used by the internal teams of the client to work with a big amount of financial data.

The main part of the interface is **data grids** — really big tables with many columns, filters, grouping and permissions. Almost everything the user does, they do inside a grid.

My own area is the **grid presets**. A preset is a saved configuration of a grid: which columns are visible, in which order, which filters and sorting are applied. Users create presets, save them and share them with colleagues, so they do not have to set up the same view every morning. I am the main developer of this feature. I also create and maintain the **shared components** for the whole team, and I am the person who does the **KendoUI major upgrades**.

The stack is **Angular, TypeScript, NgXs** for state, **RxJS**, **KendoUI** for the grid components and **Jest** for tests. The backend is a separate team, we work through a REST API.

The team is around **[N]** people — frontend, backend, QA, a business analyst and a PM. We work in two-week sprints, every merge request goes through code review, and all the communication is in English.

## 🇷🇺 Перевод

Я работаю над большим корпоративным порталом в домене **FinTech**. Им пользуются внутренние команды клиента для работы с большим объёмом финансовых данных.

Основная часть интерфейса — **таблицы данных**: действительно большие гриды с множеством колонок, фильтрами, группировкой и правами доступа. Почти всё, что делает пользователь, он делает внутри грида.

Моя зона — **grid presets**. Пресет — это сохранённая конфигурация таблицы: какие колонки видны, в каком порядке, какие фильтры и сортировка применены. Пользователи создают пресеты, сохраняют и шарят коллегам, чтобы не настраивать одно и то же представление каждое утро. Я основной разработчик этой фичи. Ещё я создаю и поддерживаю **общие компоненты** для всей команды и я тот, кто делает **мажорные апгрейды KendoUI**.

Стек: **Angular, TypeScript, NgXs** для состояния, **RxJS**, **KendoUI** для гридов и **Jest** для тестов. Бэкенд — отдельная команда, работаем через REST API.

В команде примерно **[N]** человек — фронтенд, бэкенд, QA, бизнес-аналитик и PM. Работаем двухнедельными спринтами, каждый merge request проходит код-ревью, всё общение на английском.

## 💡 Как отвечать

- Это **не то же самое**, что «расскажите о себе». Там про твою карьеру, здесь — про продукт. Не пересказывай биографию заново.
- Порядок: **что за продукт → кто пользователи → что самое сложное → что делаешь именно ты → стек → команда и процессы**. Держись 60–90 секунд.
- **Не называй клиента**, если есть NDA. Говори «a large financial company» или «the client». Никто не обидится, наоборот — это выглядит профессионально.
- **Объясняй домен простыми словами.** HR почти никогда не из финансов. Если он не понял, что делает продукт, весь остальной ответ пропал.
- **Обязательно вырули на свою зону.** Половина кандидатов рассказывает про проект и забывает сказать, что делали они лично.
- Заранее уточни **размер команды** — это спрашивают почти всегда, а цифру в моменте никто не помнит.

## 🗣 Полезные фразы

- *It is a large enterprise portal in the FinTech domain.* — Это большой корпоративный портал в домене финтех.
- *The users are the client's internal teams.* — Пользователи — внутренние команды клиента.
- *My own area is…* — Моя личная зона — …
- *I cannot share the client's name, but it is a large financial company.* — Не могу назвать клиента, но это крупная финансовая компания.
- *We work in two-week sprints.* — Работаем двухнедельными спринтами.`,
      en: `## 🇬🇧 English answer

I work on a large enterprise portal in the **FinTech** domain. It is used by the internal teams of the client to work with a big amount of financial data.

The main part of the interface is **data grids** — really big tables with many columns, filters, grouping and permissions. Almost everything the user does, they do inside a grid.

My own area is the **grid presets**. A preset is a saved configuration of a grid: which columns are visible, in which order, which filters and sorting are applied. Users create presets, save them and share them with colleagues, so they do not have to set up the same view every morning. I am the main developer of this feature. I also create and maintain the **shared components** for the whole team, and I am the person who does the **KendoUI major upgrades**.

The stack is **Angular, TypeScript, NgXs** for state, **RxJS**, **KendoUI** for the grid components and **Jest** for tests. The backend is a separate team, we work through a REST API.

The team is around **[N]** people — frontend, backend, QA, a business analyst and a PM. We work in two-week sprints, every merge request goes through code review, and all the communication is in English.

## 🇷🇺 Russian version

Большой корпоративный портал, домен **FinTech**, пользователи — внутренние команды клиента. Основа интерфейса — **большие таблицы** с колонками, фильтрами, группировкой и правами. Моя зона — **grid presets** (сохранённые конфигурации таблиц, которые можно шарить коллегам), плюс **общие компоненты** и **мажорные апгрейды KendoUI**. Стек: Angular, TypeScript, NgXs, RxJS, KendoUI, Jest. Команда ~**[N]** человек, двухнедельные спринты, код-ревью на каждый MR, всё на английском.

## 💡 How to answer

- This is **not** "tell me about yourself". That question is about your career, this one is about the product. Do not repeat your biography.
- Order: **what the product is → who the users are → what is hard about it → what you personally do → stack → team and process.** Keep it 60–90 seconds.
- **Do not name the client** if there is an NDA. Say "a large financial company" or "the client" — it reads as professional, not evasive.
- **Explain the domain in simple words.** The interviewer is rarely from finance. If they did not understand what the product does, the rest of the answer is lost.
- **Always land on your own area.** Half of the candidates describe the project and forget to say what they personally did.
- Check the **team size** in advance — it is asked almost every time and nobody remembers the number on the spot.

## 🗣 Useful phrases

- *It is a large enterprise portal in the FinTech domain.*
- *The users are the client's internal teams.*
- *My own area is…*
- *I cannot share the client's name, but it is a large financial company.*
- *We work in two-week sprints.*`
    }
  },

  {
    id: 'hr-016',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['career-goals', 'future', 'ambition'],
    question: {
      ru: 'Кем вы видите себя через 3–5 лет? / Where do you see yourself in 3–5 years?',
      en: 'Where do you see yourself in 3–5 years? / Кем вы видите себя через 3–5 лет?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

In three to five years I want to be a **strong technical expert** — a Lead or an Architect on the frontend side.

To be concrete: I want to be the person who **makes** the architecture decisions, not only implements them. I already do a part of this today — I design the API of the shared components and I own a complex feature end to end — but I want more of it and on a bigger scale.

I would also like to do **mentoring** more officially. I have onboarded a lot of developers over the last years, and I enjoy it.

What I do **not** want is to move fully into management and stop coding. I want to stay close to the code — a technical track, not a purely managerial one.

## 🇷🇺 Перевод

Через три-пять лет я хочу быть **сильным техническим экспертом** — Lead или архитектором на фронтенде.

Конкретно: хочу быть человеком, который **принимает** архитектурные решения, а не только их реализует. Частично я это уже делаю — проектирую API общих компонентов и владею сложной фичей целиком, — но хочу больше и на большем масштабе.

Ещё хотел бы заниматься **менторством** более официально. За последние годы я заонбордил много разработчиков, и мне это нравится.

Чего я **не** хочу — уйти целиком в менеджмент и перестать писать код. Хочу остаться близко к коду: технический трек, а не чисто управленческий.

## 💡 Как отвечать

- HR проверяет здесь три вещи: **есть ли у тебя амбиция**, **проживёшь ли ты у них хотя бы пару лет** и **совпадает ли твоя цель с тем, что они могут дать**.
- **Плохие ответы:** «не знаю», «посмотрим», «хочу свой стартап», «хочу вашу должность». Первые два — про безразличие, вторые два — про то, что ты уйдёшь.
- Называй **направление, а не должность в конкретной компании**. «Lead / Architect на фронтенде» — хорошо. «Хочу быть CTO у вас» — плохо.
- **Твой сильный ход** — сказать, что ты уже частично это делаешь. Shared-компоненты и владение grid presets — это ровно тот аргумент, что рост уже начался, а не мечта на пустом месте.
- Фраза *«I want to stay close to the code»* очень выручает: она показывает, что ты не сбежишь в менеджмент через полгода после найма.
- Если вакансия явно Lead — усиль первую часть. Если это обычная Senior-позиция без роста — не дави, скажи мягче, иначе прозвучит «мне у вас будет тесно».

## 🗣 Полезные фразы

- *I want to grow into a Lead or an Architect role.* — Хочу вырасти в Lead или архитектора.
- *I want to make the architecture decisions, not only implement them.* — Хочу принимать архитектурные решения, а не только реализовывать их.
- *I already do a part of this today.* — Частично я это уже делаю.
- *I want to stay close to the code.* — Хочу остаться близко к коду.
- *I would like to do mentoring more officially.* — Хотел бы заниматься менторством более официально.`,
      en: `## 🇬🇧 English answer

In three to five years I want to be a **strong technical expert** — a Lead or an Architect on the frontend side.

To be concrete: I want to be the person who **makes** the architecture decisions, not only implements them. I already do a part of this today — I design the API of the shared components and I own a complex feature end to end — but I want more of it and on a bigger scale.

I would also like to do **mentoring** more officially. I have onboarded a lot of developers over the last years, and I enjoy it.

What I do **not** want is to move fully into management and stop coding. I want to stay close to the code — a technical track, not a purely managerial one.

## 🇷🇺 Russian version

Через 3–5 лет — **сильный технический эксперт**: Lead или архитектор на фронтенде. Хочу **принимать** архитектурные решения, а не только реализовывать; частично уже делаю это (API общих компонентов, владение сложной фичей). Хотел бы официальное **менторство**. Не хочу уходить целиком в менеджмент — хочу остаться близко к коду.

## 💡 How to answer

- The interviewer is checking three things: **do you have ambition**, **will you stay for a couple of years**, and **does your goal fit what they can offer**.
- **Bad answers:** "I don't know", "we'll see", "I want my own startup", "I want your job". The first two read as indifference, the last two as "I will leave".
- Name a **direction, not a title in their company**. "Lead / Architect on the frontend" is good. "I want to be your CTO" is not.
- **Your strong move** is saying you already do part of it. Shared components and owning grid presets prove the growth already started — it is not a wish from nowhere.
- The phrase *"I want to stay close to the code"* helps a lot: it shows you will not disappear into management right after being hired.
- If the vacancy is explicitly a Lead role — push the first part harder. If it is a plain Senior seat with no growth path — soften it, otherwise it sounds like "I will outgrow you fast".

## 🗣 Useful phrases

- *I want to grow into a Lead or an Architect role.*
- *I want to make the architecture decisions, not only implement them.*
- *I already do a part of this today.*
- *I want to stay close to the code.*
- *I would like to do mentoring more officially.*`
    }
  },

  {
    id: 'hr-017',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['failure', 'mistake', 'star', 'behavioural'],
    question: {
      ru: 'Расскажите о вашей ошибке или неудаче. Как вы с ней справились? / Tell me about a mistake or a failure. How did you handle it?',
      en: 'Tell me about a mistake or a failure you made. How did you handle it? / Расскажите о вашей ошибке. Как вы с ней справились?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

Yes, I have a good example.

**Situation.** During one of the **KendoUI major upgrades** I underestimated the amount of breaking changes. I went through the migration guide, fixed everything that was obviously broken, ran the unit tests — and everything looked green.

**Problem.** But some of the grid behaviour changed in a way our tests did not cover. QA found several broken cases on the test environment, and it cost the team a couple of days.

**What I did.** I did not try to hide it or to fix it quietly. I told the team the same day, we rolled the branch back from the test environment, and then I went through **every** place where we use the library — screen by screen, together with QA.

**What I learned.** For this kind of task "the unit tests are green" is not enough, because a UI library changes behaviour, not only the API. Now, before any major upgrade, I agree on a **regression checklist with QA first**, and I plan the upgrade as a separate task with its own time, not as something I do between tickets.

The next upgrade went without any incident.

## 🇷🇺 Перевод

Да, есть хороший пример.

**Ситуация.** Во время одного из **мажорных апгрейдов KendoUI** я недооценил объём breaking changes. Прошёл migration guide, починил всё очевидно сломанное, прогнал unit-тесты — всё было зелёное.

**Проблема.** Но часть поведения гридов изменилась так, что тесты этого не покрывали. QA нашли несколько сломанных кейсов на тестовом окружении, и команда потеряла пару дней.

**Что я сделал.** Я не пытался это скрыть или тихо починить. В тот же день сказал команде, мы откатили ветку с тестового окружения, а потом я прошёл **все** места, где мы используем библиотеку, — экран за экраном, вместе с QA.

**Какой вывод.** Для такой задачи «unit-тесты зелёные» — недостаточно, потому что UI-библиотека меняет поведение, а не только API. Теперь перед любым мажорным апгрейдом я **сначала согласую с QA чек-лист регрессии** и планирую апгрейд как отдельную задачу со своим временем, а не «между тикетами».

Следующий апгрейд прошёл без инцидентов.

## 💡 Как отвечать

- **Никогда не говори «у меня не было ошибок».** Это читается как «я не беру ответственности» или «я не делал ничего сложного». Худший возможный ответ.
- Схема: **ситуация → в чём была моя ошибка → что я сделал → чему научился**. Последний пункт — самый важный, ради него и задают вопрос.
- **Не вали на других.** Ни «требования были плохие», ни «QA не проверили». Ошибка в твоей истории должна быть **твоя**.
- Бери ошибку **рабочую и техническую**, а не «поссорился с коллегой» и не «однажды я снёс прод». Что-то среднее: стоило команде времени, но никого не уволили.
- **Скажи, что сообщил сразу.** Это половина ответа. HR слушает не саму ошибку, а то, прячешь ты проблемы или выносишь их.
- Закончи на позитиве: «следующий раз прошёл нормально». Так история становится про рост, а не про провал.

## ⚠️ Проверь под себя

История выше построена на реальном контексте (апгрейды KendoUI на тебе), но детали я реконструировал. **Замени на то, что было на самом деле**: любой случай, где ты недооценил объём, сказал команде и после этого поменял процесс.

## 🗣 Полезные фразы

- *Yes, I have a good example.* — Да, есть хороший пример.
- *I underestimated the amount of work.* — Я недооценил объём работы.
- *I did not try to hide it — I told the team the same day.* — Я не стал это скрывать, сказал команде в тот же день.
- *What I learned from it is…* — Что я из этого вынес — …
- *The next time it went without any incident.* — В следующий раз всё прошло без инцидентов.`,
      en: `## 🇬🇧 English answer

Yes, I have a good example.

**Situation.** During one of the **KendoUI major upgrades** I underestimated the amount of breaking changes. I went through the migration guide, fixed everything that was obviously broken, ran the unit tests — and everything looked green.

**Problem.** But some of the grid behaviour changed in a way our tests did not cover. QA found several broken cases on the test environment, and it cost the team a couple of days.

**What I did.** I did not try to hide it or to fix it quietly. I told the team the same day, we rolled the branch back from the test environment, and then I went through **every** place where we use the library — screen by screen, together with QA.

**What I learned.** For this kind of task "the unit tests are green" is not enough, because a UI library changes behaviour, not only the API. Now, before any major upgrade, I agree on a **regression checklist with QA first**, and I plan the upgrade as a separate task with its own time, not as something I do between tickets.

The next upgrade went without any incident.

## 🇷🇺 Russian version

Во время мажорного апгрейда **KendoUI** недооценил объём breaking changes: migration guide прошёл, unit-тесты зелёные — но поведение гридов изменилось там, где тесты не покрывали, и QA нашли сломанные кейсы. Не стал скрывать: сказал команде в тот же день, откатили ветку, прошёл все места использования библиотеки вместе с QA. Вывод: «зелёные тесты» тут недостаточно, теперь **сначала чек-лист регрессии с QA** и апгрейд как отдельная задача. Следующий прошёл без инцидентов.

## 💡 How to answer

- **Never say "I have never made a mistake."** It reads as "I take no responsibility" or "I have never done anything hard". The worst possible answer.
- Structure: **situation → what my mistake was → what I did → what I learned.** The last part is the whole point of the question.
- **Do not blame others.** Not "the requirements were bad", not "QA missed it". The mistake in your story must be **yours**.
- Pick a **work-related, technical** mistake — not a fight with a colleague and not "I dropped the production database". Something in between: it cost the team time, but nobody got fired.
- **Say that you reported it immediately.** That is half of the answer. The interviewer is listening for whether you hide problems or surface them.
- End on the positive: "the next time went fine". That turns the story into growth instead of failure.

## ⚠️ Adapt it

The story above is built on real context (the KendoUI upgrades are genuinely yours), but the details are reconstructed. **Replace it with what actually happened** — any case where you underestimated the scope, told the team, and changed the process afterwards.

## 🗣 Useful phrases

- *Yes, I have a good example.*
- *I underestimated the amount of work.*
- *I did not try to hide it — I told the team the same day.*
- *What I learned from it is…*
- *The next time it went without any incident.*`
    }
  },

  {
    id: 'hr-018',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['deadlines', 'pressure', 'estimates'],
    question: {
      ru: 'Как вы справляетесь с дедлайнами и работой под давлением? Срывали ли вы сроки? / How do you handle deadlines and pressure?',
      en: 'How do you handle deadlines and working under pressure? Have you ever missed a deadline? / Как вы справляетесь с дедлайнами?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

My main idea is simple: I try to work so that the pressure **does not appear at the last moment**.

In practice it means three things.

**First, I give an estimate out loud** and I add a buffer for the unknown parts. If I have never done something before, I say that the estimate is rough and I ask for a spike first.

**Second, I raise the flag early.** If in the middle of the task I see that I will not make it, I say it the same day — not on the deadline day. From my experience a manager is completely fine with a delay he knows about three days earlier, and very unhappy about a surprise on Friday evening.

**Third, if the deadline is really fixed, I ask what we can cut.** Usually there is a part that can go to the next release. It is better to deliver the main flow fully working than everything half-finished.

Yes, I have missed deadlines — everyone has. But in those cases the team knew about it in advance, so we could re-plan instead of firefighting.

And I am fine with a hot period before a release, it happens on every project. I only would not want it to be the normal state all year round.

## 🇷🇺 Перевод

Основная мысль простая: я стараюсь работать так, чтобы давление **не возникало в последний момент**.

На практике это три вещи.

**Первое: я озвучиваю оценку вслух** и закладываю буфер на неизвестные части. Если я чего-то раньше не делал, честно говорю, что оценка грубая, и прошу сначала спайк.

**Второе: поднимаю флаг рано.** Если в середине задачи вижу, что не успеваю, говорю об этом в тот же день, а не в день дедлайна. По моему опыту, менеджер совершенно спокойно принимает задержку, о которой узнал за три дня, и очень плохо — сюрприз в пятницу вечером.

**Третье: если дедлайн действительно жёсткий, я спрашиваю, что можно урезать.** Обычно есть часть, которая может уехать в следующий релиз. Лучше отдать основной сценарий полностью рабочим, чем всё наполовину.

Да, я срывал сроки — как и все. Но в этих случаях команда знала заранее, поэтому мы могли перепланировать, а не тушить пожар.

И я нормально отношусь к горячему периоду перед релизом, он бывает на любом проекте. Не хотел бы только, чтобы это было нормой круглый год.

## 💡 Как отвечать

- **Ключевая мысль ответа — не «я работаю по ночам», а «я предупреждаю заранее».** HR ищет не героя, а предсказуемого человека.
- На вопрос «срывали ли вы дедлайны» отвечай **«да»**. «Нет, никогда» звучит как ложь или как «я беру только простые задачи».
- Приём **«что можно урезать»** — очень сильный. Он показывает, что ты думаешь про продукт, а не только про свои часы.
- **Про переработки говори аккуратно.** «Готов перерабатывать всегда» — плохо: сигнал, что тебя можно эксплуатировать и что ты плохо планируешь. «Никогда не перерабатываю» — тоже плохо. Золотая середина: спокойно отношусь к авралу перед релизом, но не хочу его как норму.
- Если давят вопросом «а если завтра всё нужно сдать?» — не спорь, а покажи процесс: сначала уточню приоритеты, потом что урежем, потом сделаю.

## 🗣 Полезные фразы

- *I try to raise the flag early.* — Я стараюсь поднимать флаг рано.
- *I would rather warn three days before than surprise you on Friday.* — Лучше предупрежу за три дня, чем удивлю в пятницу.
- *What can we cut from the scope?* — Что мы можем убрать из объёма?
- *It is better to deliver the main flow fully working.* — Лучше отдать основной сценарий полностью рабочим.
- *I am fine with a hot period before a release.* — Я нормально отношусь к авралу перед релизом.`,
      en: `## 🇬🇧 English answer

My main idea is simple: I try to work so that the pressure **does not appear at the last moment**.

In practice it means three things.

**First, I give an estimate out loud** and I add a buffer for the unknown parts. If I have never done something before, I say that the estimate is rough and I ask for a spike first.

**Second, I raise the flag early.** If in the middle of the task I see that I will not make it, I say it the same day — not on the deadline day. From my experience a manager is completely fine with a delay he knows about three days earlier, and very unhappy about a surprise on Friday evening.

**Third, if the deadline is really fixed, I ask what we can cut.** Usually there is a part that can go to the next release. It is better to deliver the main flow fully working than everything half-finished.

Yes, I have missed deadlines — everyone has. But in those cases the team knew about it in advance, so we could re-plan instead of firefighting.

And I am fine with a hot period before a release, it happens on every project. I only would not want it to be the normal state all year round.

## 🇷🇺 Russian version

Стараюсь, чтобы давление **не возникало в последний момент**: озвучиваю оценку вслух с буфером, **поднимаю флаг рано** (задержка, о которой знают за три дня, — нормально; сюрприз в пятницу — нет), и если дедлайн жёсткий — спрашиваю, **что можно урезать**. Сроки срывал, как и все, но команда знала заранее. К авралу перед релизом отношусь спокойно, не хочу только, чтобы это была норма.

## 💡 How to answer

- The core of this answer is **not "I work at night" but "I warn you early".** They are not looking for a hero, they are looking for a predictable person.
- When asked "have you ever missed a deadline" — say **yes**. "Never" sounds like a lie, or like "I only take easy tasks".
- The **"what can we cut"** move is very strong: it shows you think about the product, not only about your own hours.
- **Be careful about overtime.** "I am always ready to work overtime" is bad — it signals both that you can be exploited and that you plan poorly. "I never work overtime" is bad too. The middle: fine with a release crunch, not fine with it as the default.
- If they push with "what if everything must ship tomorrow?" — do not argue, show the process: clarify priorities, agree what to cut, then deliver.

## 🗣 Useful phrases

- *I try to raise the flag early.*
- *I would rather warn three days before than surprise you on Friday.*
- *What can we cut from the scope?*
- *It is better to deliver the main flow fully working.*
- *I am fine with a hot period before a release.*`
    }
  },

  {
    id: 'hr-019',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['prioritisation', 'time-management', 'process'],
    question: {
      ru: 'Как вы расставляете приоритеты, когда всё срочно? / How do you prioritise when everything is urgent?',
      en: 'How do you prioritise your tasks when everything is urgent? / Как вы расставляете приоритеты, когда всё срочно?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английski

First of all, I do not decide it alone. If everything is urgent, then the priority is a **manager's question**, not a developer's — so I go and ask.

But before I ask, I prepare my own version. I sort the tasks by two things: **what blocks users** and **what blocks other people**.

1. A **production bug** that blocks users always goes first.
2. Then something that **blocks a colleague** — if my task blocks another developer or QA, my task is more expensive than it looks, because two people are waiting instead of one.
3. Then everything that has a **real external deadline** — a demo, a release, a client commitment.
4. And only then my own tasks that can wait a day.

I bring this list to the PM or the lead and say: "this is my order, do you agree?" Usually we agree in two minutes, because the hard part was already done.

And one important detail — I **write the decision down** in the ticket or in the team chat. So a week later nobody is surprised why something was not done.

## 🇷🇺 Перевод

Прежде всего, я не решаю это в одиночку. Если всё срочно, то приоритет — это **вопрос менеджера**, а не разработчика, поэтому я иду и спрашиваю.

Но перед тем как спросить, я готовлю свою версию. Сортирую задачи по двум признакам: **что блокирует пользователей** и **что блокирует других людей**.

1. **Баг на проде**, который блокирует пользователей, всегда идёт первым.
2. Дальше то, что **блокирует коллегу** — если моя задача блокирует другого разработчика или QA, она дороже, чем кажется: ждут двое, а не один.
3. Дальше то, у чего есть **реальный внешний дедлайн** — демо, релиз, обещание клиенту.
4. И только потом мои задачи, которые могут подождать день.

Я приношу этот список PM или лиду и говорю: «вот мой порядок, согласны?» Обычно договариваемся за две минуты, потому что сложная часть уже сделана.

И важная деталь — я **фиксирую решение письменно**, в тикете или в командном чате. Чтобы через неделю никто не удивлялся, почему что-то не сделано.

## 💡 Как отвечать

- Главный сигнал: **ты не молчишь и не выбираешь наугад**. Разработчик, который сам себе тихо выбрал приоритет и ошибся, — это проблема.
- Но и **не перекладывай полностью**. Плохой ответ: «я просто спрошу у менеджера». Хороший: «я приду со своим вариантом и спрошу, согласны ли». Разница огромная.
- Критерий **«что блокирует других»** — то, что отличает senior-ответ от junior-ответа. Junior думает про свои задачи, senior — про поток команды.
- **Фиксировать решение письменно** — маленькая деталь, которая очень хорошо звучит. Показывает опыт работы в реальных командах, где потом спрашивают «а почему это не сделали».
- Если спросят про конкретный инструмент — можно упомянуть, что порядок в спринте задаёт PM, а внутри дня решаешь сам.

## 🗣 Полезные фразы

- *If everything is urgent, priority is a manager's question.* — Если всё срочно, приоритет — вопрос менеджера.
- *I come with my own version and ask if they agree.* — Я прихожу со своим вариантом и спрашиваю, согласны ли они.
- *A production bug that blocks users always goes first.* — Баг на проде, блокирующий пользователей, всегда первый.
- *If my task blocks a colleague, it is more expensive than it looks.* — Если моя задача блокирует коллегу, она дороже, чем кажется.
- *I write the decision down, so nobody is surprised later.* — Я фиксирую решение письменно, чтобы потом никто не удивлялся.`,
      en: `## 🇬🇧 English answer

First of all, I do not decide it alone. If everything is urgent, then the priority is a **manager's question**, not a developer's — so I go and ask.

But before I ask, I prepare my own version. I sort the tasks by two things: **what blocks users** and **what blocks other people**.

1. A **production bug** that blocks users always goes first.
2. Then something that **blocks a colleague** — if my task blocks another developer or QA, my task is more expensive than it looks, because two people are waiting instead of one.
3. Then everything that has a **real external deadline** — a demo, a release, a client commitment.
4. And only then my own tasks that can wait a day.

I bring this list to the PM or the lead and say: "this is my order, do you agree?" Usually we agree in two minutes, because the hard part was already done.

And one important detail — I **write the decision down** in the ticket or in the team chat. So a week later nobody is surprised why something was not done.

## 🇷🇺 Russian version

Один не решаю: если всё срочно — это **вопрос менеджера**. Но прихожу со своей версией, отсортированной по тому, **что блокирует пользователей** и **что блокирует других людей**: баг на проде → блокирую коллегу → внешний дедлайн → всё остальное. Приношу список лиду: «вот мой порядок, согласны?» И **фиксирую решение письменно**, чтобы потом не было вопросов.

## 💡 How to answer

- The key signal: **you neither go silent nor guess.** A developer who quietly picked a priority and picked wrong is a problem.
- But **do not fully hand it over either.** Bad answer: "I just ask the manager." Good answer: "I come with my own version and ask if they agree." The difference is huge.
- The **"what blocks other people"** criterion is what separates a senior answer from a junior one. A junior thinks about their own tasks; a senior thinks about the team's flow.
- **Writing the decision down** is a small detail that lands very well — it shows real team experience, where people later ask "why wasn't this done?".
- If asked about tooling: the sprint order is set by the PM, but inside a single day you decide yourself.

## 🗣 Useful phrases

- *If everything is urgent, priority is a manager's question.*
- *I come with my own version and ask if they agree.*
- *A production bug that blocks users always goes first.*
- *If my task blocks a colleague, it is more expensive than it looks.*
- *I write the decision down, so nobody is surprised later.*`
    }
  },

  {
    id: 'hr-020',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['challenge', 'problem-solving', 'star', 'grid-presets'],
    question: {
      ru: 'Расскажите о самой сложной задаче, которую вы решили. / Tell me about the most difficult task you have solved.',
      en: 'Tell me about the most difficult technical challenge you have solved. / Расскажите о самой сложной задаче, которую вы решили.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

The **grid preset** feature is probably the best example.

**What it is.** A preset is a saved configuration of a big data grid — which columns are visible, in which order, which filters, sorting and grouping are applied. Users save presets and share them with their colleagues.

**Why it is hard.** It sounds simple, but the complexity is in the details. A preset can be personal or shared with a team. The grid itself changes over time — columns are added and removed with every release. And every user has different permissions, so one user may not be allowed to see a column that is inside a preset somebody shared with them.

**The hardest part** was exactly this: what happens to an old preset when the grid behind it has changed. If a column disappears from the application, the preset must not break the whole page.

**What I did.** I separated the **stored** preset from the **applied** preset. The stored data is only an *intention* — "the user wanted these columns in this order". On load we resolve that intention against the current grid schema and the current user's permissions. Everything that no longer exists or is not allowed is simply dropped, not crashed.

**The result.** It has been working for years, it survived several KendoUI major upgrades and several schema changes, and users do not lose their configurations after releases.

## 🇷🇺 Перевод

Лучший пример — фича **grid presets**.

**Что это.** Пресет — это сохранённая конфигурация большой таблицы: какие колонки видны, в каком порядке, какие фильтры, сортировка и группировка применены. Пользователи сохраняют пресеты и шарят их коллегам.

**Почему это сложно.** Звучит просто, но сложность в деталях. Пресет может быть личным или расшаренным на команду. Сама таблица меняется со временем — колонки добавляются и удаляются с каждым релизом. И у каждого пользователя свои права, поэтому один человек может не иметь права видеть колонку, которая есть в пресете, расшаренном ему другим.

**Самое сложное** было именно это: что происходит со старым пресетом, когда таблица за ним изменилась. Если колонка исчезла из приложения, пресет не должен ломать всю страницу.

**Что я сделал.** Я разделил **сохранённый** пресет и **применённый**. Сохранённые данные — это только *намерение*: «пользователь хотел вот эти колонки в вот таком порядке». При загрузке мы разрешаем это намерение относительно текущей схемы таблицы и текущих прав пользователя. Всё, чего больше нет или что не разрешено, просто отбрасывается, а не падает.

**Результат.** Это работает годами, пережило несколько мажорных апгрейдов KendoUI и несколько изменений схемы, и пользователи не теряют свои конфигурации после релизов.

## 💡 Как отвечать

- Это твой **самый сильный технический ответ**. Он показывает не «я умею писать компоненты», а «я умею проектировать поведение системы во времени» — это уровень senior/lead.
- Схема: **что это → почему сложно → что было сложнее всего → что сделал я → результат**. Не начинай с решения, начинай с проблемы.
- **Мысль «сохранённое ≠ применённое» — ядро ответа.** Даже если HR не технический, идея «мы храним намерение, а не готовый результат» понятна и звучит умно.
- Не уходи в код и не сыпь названиями классов. Если интервьюер технический — он сам спросит подробности, и вот тогда углубляйся.
- Хорошо заканчивать **сроком жизни решения**: «работает годами, пережило несколько апгрейдов». Это доказывает, что решение было правильным, а не просто рабочим на момент сдачи.
- Тот же ответ подходит на вопросы *«Tell me about a complex feature you own»* и *«Give an example of a design decision you made»*.

## ⚠️ Проверь под себя

Механика («храним намерение, резолвим при загрузке») — это разумная реконструкция того, как такие фичи обычно устроены. **Сверь с тем, как это на самом деле сделано у вас**, и поправь: тебя могут спросить подробности, и ответ должен быть твоим.

## 🗣 Полезные фразы

- *It sounds simple, but the complexity is in the details.* — Звучит просто, но сложность в деталях.
- *The hardest part was…* — Самым сложным было…
- *I separated the stored data from the applied result.* — Я разделил сохранённые данные и применённый результат.
- *Everything that no longer exists is dropped, not crashed.* — Всё, чего больше нет, отбрасывается, а не падает.
- *It has been working for years.* — Это работает уже несколько лет.`,
      en: `## 🇬🇧 English answer

The **grid preset** feature is probably the best example.

**What it is.** A preset is a saved configuration of a big data grid — which columns are visible, in which order, which filters, sorting and grouping are applied. Users save presets and share them with their colleagues.

**Why it is hard.** It sounds simple, but the complexity is in the details. A preset can be personal or shared with a team. The grid itself changes over time — columns are added and removed with every release. And every user has different permissions, so one user may not be allowed to see a column that is inside a preset somebody shared with them.

**The hardest part** was exactly this: what happens to an old preset when the grid behind it has changed. If a column disappears from the application, the preset must not break the whole page.

**What I did.** I separated the **stored** preset from the **applied** preset. The stored data is only an *intention* — "the user wanted these columns in this order". On load we resolve that intention against the current grid schema and the current user's permissions. Everything that no longer exists or is not allowed is simply dropped, not crashed.

**The result.** It has been working for years, it survived several KendoUI major upgrades and several schema changes, and users do not lose their configurations after releases.

## 🇷🇺 Russian version

Лучший пример — **grid presets**: сохранённая конфигурация большой таблицы (колонки, порядок, фильтры, сортировка), личная или расшаренная. Сложность в том, что таблица меняется от релиза к релизу, а права у всех разные. Самое сложное — что делать со старым пресетом, когда схема за ним изменилась. Решение: разделить **сохранённый** пресет и **применённый** — храним *намерение* и резолвим его при загрузке относительно текущей схемы и прав; всё несуществующее отбрасывается, а не падает. Работает годами, пережило несколько мажорных апгрейдов KendoUI.

## 💡 How to answer

- This is your **strongest technical answer**. It shows not "I can write components" but "I can design how a system behaves over time" — that is senior/lead level.
- Structure: **what it is → why it is hard → what was hardest → what I did → the result.** Do not start with the solution, start with the problem.
- **The "stored ≠ applied" idea is the core.** Even a non-technical interviewer understands "we store an intention, not a finished result", and it sounds sharp.
- Do not dive into code or class names. If the interviewer is technical, they will ask for detail — that is when you go deeper.
- Finish with the **lifetime of the solution**: "it has been working for years, through several upgrades". That proves the decision was right, not just shippable.
- The same answer works for *"Tell me about a complex feature you own"* and *"Give an example of a design decision you made"*.

## ⚠️ Adapt it

The mechanism described ("store the intention, resolve it on load") is a reasonable reconstruction of how such features are usually built. **Check it against how it actually works on your project** and correct it — you may be asked for details, and the answer has to be yours.

## 🗣 Useful phrases

- *It sounds simple, but the complexity is in the details.*
- *The hardest part was…*
- *I separated the stored data from the applied result.*
- *Everything that no longer exists is dropped, not crashed.*
- *It has been working for years.*`
    }
  },

  {
    id: 'hr-021',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['learning', 'self-development', 'courses'],
    question: {
      ru: 'Как вы поддерживаете свои навыки в актуальном состоянии? Как изучаете новые технологии? / How do you keep your skills up to date?',
      en: 'How do you keep your skills up to date? How do you learn new technologies? / Как вы изучаете новые технологии?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I use a few sources, and they work differently.

**Courses**, when something is big and I want a structure. I took intensives on TypeScript, on RxJS, and an advanced Angular course. For a big topic I prefer one structured course over fifty random articles.

**Official documentation and release notes.** Because I am the person who does the library upgrades on my project, reading changelogs is literally part of my job. It is boring, but it is the only source that is always correct.

**Pet projects** — this is where I actually try things. At work we cannot jump to the newest Angular version immediately, so I try it at home first. My last pet project is a PWA for interview preparation built on the newest Angular with **Signals**, so I learned Signals there before I could use them anywhere else.

**And the team.** Code review is an underrated source. When somebody writes something better than I would, I ask why — it is the fastest feedback you can get.

## 🇷🇺 Перевод

Я использую несколько источников, и работают они по-разному.

**Курсы** — когда тема большая и нужна структура. Проходил интенсивы по TypeScript, по RxJS и продвинутый курс по Angular. Для большой темы я лучше пройду один структурный курс, чем пятьдесят случайных статей.

**Официальная документация и release notes.** Так как на проекте именно я делаю апгрейды библиотек, чтение changelog'ов — буквально часть моей работы. Скучно, но это единственный источник, который всегда правильный.

**Пет-проекты** — вот где я реально пробую. На работе мы не можем сразу прыгнуть на самую новую версию Angular, поэтому я сначала пробую дома. Последний пет-проект — PWA для подготовки к собеседованиям на новейшем Angular с **Signals**, так что Signals я освоил там раньше, чем смог применить где-либо ещё.

**И команда.** Код-ревью — недооценённый источник. Когда кто-то пишет лучше, чем написал бы я, я спрашиваю почему. Это самая быстрая обратная связь, которую можно получить.

## 💡 Как отвечать

- HR проверяет, **не остановился ли ты**. Особенно если ты 4 года на одном проекте — этот вопрос почти гарантированно прозвучит именно из-за этого.
- **Твой козырь — связка «пет-проект как полигон».** «На работе мы на Angular 18, а дома я уже потрогал Signals» — это идеальный ответ на скрытое опасение «он застрял на старом стеке».
- Называй **конкретные курсы и темы**, а не «постоянно учусь». У тебя они реально есть: TypeScript, RxJS, продвинутый Angular.
- **Changelog'и и апгрейды библиотек** — сильный и редкий пункт. Мало кто про это говорит, а это доказывает, что ты следишь за экосистемой не по верхам.
- Не перечисляй десять источников. **Три-четыре, но с примерами.**
- Если спросят «а что нового в Angular вы изучали последним?» — будь готов назвать: Signals, standalone-компоненты, новый control flow, SSR/гидрация.

## 🗣 Полезные фразы

- *I prefer one structured course over fifty random articles.* — Я лучше пройду один структурный курс, чем пятьдесят случайных статей.
- *Reading changelogs is part of my job.* — Чтение changelog'ов — часть моей работы.
- *Pet projects are where I actually try new things.* — Пет-проекты — это где я реально пробую новое.
- *At work we cannot jump to the newest version immediately.* — На работе мы не можем сразу прыгнуть на новейшую версию.
- *Code review is an underrated source of learning.* — Код-ревью — недооценённый источник обучения.`,
      en: `## 🇬🇧 English answer

I use a few sources, and they work differently.

**Courses**, when something is big and I want a structure. I took intensives on TypeScript, on RxJS, and an advanced Angular course. For a big topic I prefer one structured course over fifty random articles.

**Official documentation and release notes.** Because I am the person who does the library upgrades on my project, reading changelogs is literally part of my job. It is boring, but it is the only source that is always correct.

**Pet projects** — this is where I actually try things. At work we cannot jump to the newest Angular version immediately, so I try it at home first. My last pet project is a PWA for interview preparation built on the newest Angular with **Signals**, so I learned Signals there before I could use them anywhere else.

**And the team.** Code review is an underrated source. When somebody writes something better than I would, I ask why — it is the fastest feedback you can get.

## 🇷🇺 Russian version

Несколько источников: **курсы** для больших тем (проходил интенсивы по TypeScript, RxJS, продвинутый Angular); **документация и release notes** — я делаю апгрейды библиотек, так что changelog'и это часть работы; **пет-проекты** как полигон (последний — PWA на новейшем Angular с Signals, освоил их до того, как смог применить на работе); **и команда** — код-ревью даёт самую быструю обратную связь.

## 💡 How to answer

- They are checking whether you **stopped growing**. Especially after 4 years on one project — this question is almost guaranteed for exactly that reason.
- **Your trump card is "the pet project as a testing ground".** "At work we are on Angular 18, but at home I already used Signals" is the perfect answer to the unspoken worry that you are stuck on an old stack.
- Name **specific courses and topics**, not "I am always learning". You genuinely have them: TypeScript, RxJS, advanced Angular.
- **Changelogs and library upgrades** are a strong, rare point. Almost nobody mentions them, and it proves you follow the ecosystem properly.
- Do not list ten sources. **Three or four, with examples.**
- If they ask "what is the newest Angular thing you learned?" — be ready: Signals, standalone components, the new control flow, SSR/hydration.

## 🗣 Useful phrases

- *I prefer one structured course over fifty random articles.*
- *Reading changelogs is part of my job.*
- *Pet projects are where I actually try new things.*
- *At work we cannot jump to the newest version immediately.*
- *Code review is an underrated source of learning.*`
    }
  },

  {
    id: 'hr-022',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['code-review', 'feedback', 'soft-skills'],
    question: {
      ru: 'Как вы относитесь к код-ревью и критике вашей работы? / How do you handle code review and critical feedback?',
      en: 'How do you handle code review and critical feedback? / Как вы относитесь к код-ревью и критике вашей работы?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I like code review, and I am comfortable on both sides of it.

**When I receive comments.** I do not take them personally — a comment is about the code, not about me. If I agree, I fix it and say thank you. If I do not agree, I explain my reason. And if the reviewer still disagrees after that, we usually take the option that is simpler for the team, because readable code is worth more than my personal taste.

**When I give comments.** I try to separate "this is a problem" from "this is my preference". For a preference I write *"nit:"* in front, so the author knows he can ignore it without a discussion. And I always write **why**, not only **what** — a comment without a reason is just an order, and people push back on orders.

**One thing I do ask for**: that the review happens in the merge request, not in a private message. Not because of ego — because then the whole team sees the reasoning, and the next person does not repeat the same mistake.

And honestly, review is one of my main sources of learning. Over the last years the team changed a lot, and new people bring approaches I have not seen.

## 🇷🇺 Перевод

Мне нравится код-ревью, и я спокойно себя чувствую по обе стороны.

**Когда получаю комментарии.** Не воспринимаю их лично — комментарий про код, а не про меня. Если согласен — правлю и говорю спасибо. Если не согласен — объясняю свои причины. И если после этого ревьюер всё равно не согласен, обычно берём вариант, который проще для команды: читаемый код дороже моего личного вкуса.

**Когда пишу комментарии.** Стараюсь разделять «это проблема» и «это моё предпочтение». Для предпочтения пишу впереди *«nit:»*, чтобы автор знал: можно проигнорировать без дискуссии. И всегда пишу **почему**, а не только **что** — комментарий без причины это просто приказ, а на приказы люди огрызаются.

**Об одном прошу**: чтобы ревью проходило в merge request, а не в личных сообщениях. Не из-за эго, а потому что тогда рассуждение видит вся команда, и следующий человек не повторит ту же ошибку.

И честно говоря, ревью — один из моих главных источников обучения. За последние годы команда сильно менялась, и новые люди приносят подходы, которых я не видел.

## 💡 Как отвечать

- Это вопрос **не про код, а про эго**. HR проверяет, будешь ли ты спорить два дня из-за скобок и обижаться на комментарии.
- **Ключевая фраза — «a comment is about the code, not about me».** Простая, короткая, и она закрывает вопрос почти целиком.
- Обязательно покажи **обе стороны**: и как принимаешь, и как даёшь. Кандидаты обычно говорят только про первое.
- Приём **«nit:»** и «пишу почему, а не только что» — маленькие детали, которые сразу выдают человека с реальным опытом ревью, а не с теорией.
- **Хорошо иметь готовый механизм разрешения спора**: объяснил → всё ещё не согласны → берём проще для команды. Показывает, что ты умеешь уступать без драмы.
- Не говори «я всегда соглашаюсь» — это звучит как отсутствие позиции. И не говори «я отстаиваю своё до конца» — это звучит как конфликтность.

## 🗣 Полезные фразы

- *A comment is about the code, not about me.* — Комментарий про код, а не про меня.
- *If I agree, I fix it and say thank you.* — Если согласен — правлю и говорю спасибо.
- *I always write why, not only what.* — Я всегда пишу почему, а не только что.
- *Readable code is worth more than my personal taste.* — Читаемый код дороже моего личного вкуса.
- *Review is one of my main sources of learning.* — Ревью — один из моих главных источников обучения.`,
      en: `## 🇬🇧 English answer

I like code review, and I am comfortable on both sides of it.

**When I receive comments.** I do not take them personally — a comment is about the code, not about me. If I agree, I fix it and say thank you. If I do not agree, I explain my reason. And if the reviewer still disagrees after that, we usually take the option that is simpler for the team, because readable code is worth more than my personal taste.

**When I give comments.** I try to separate "this is a problem" from "this is my preference". For a preference I write *"nit:"* in front, so the author knows he can ignore it without a discussion. And I always write **why**, not only **what** — a comment without a reason is just an order, and people push back on orders.

**One thing I do ask for**: that the review happens in the merge request, not in a private message. Not because of ego — because then the whole team sees the reasoning, and the next person does not repeat the same mistake.

And honestly, review is one of my main sources of learning. Over the last years the team changed a lot, and new people bring approaches I have not seen.

## 🇷🇺 Russian version

Комфортно по обе стороны. **Получая комментарии**: не воспринимаю лично — комментарий про код, а не про меня; согласен — правлю, не согласен — объясняю, а если спор не сходится, берём то, что проще для команды. **Давая комментарии**: отделяю «это проблема» от «это моё предпочтение» (пишу *nit:*) и всегда объясняю **почему**, а не только **что**. Прошу об одном — ревью в merge request, а не в личке, чтобы рассуждение видела вся команда.

## 💡 How to answer

- This question is **not about code, it is about ego.** They are checking whether you will argue for two days about brackets and sulk over comments.
- **The key line is "a comment is about the code, not about me."** Short, simple, and it answers almost the whole question.
- Always show **both sides** — receiving and giving. Most candidates only talk about receiving.
- The **"nit:"** habit and "explain why, not only what" are small details that immediately mark someone with real review experience rather than theory.
- **Have a conflict-resolution rule ready**: I explain → we still disagree → we take the simpler option for the team. It shows you can concede without drama.
- Do not say "I always agree" — that reads as having no opinion. Do not say "I defend my position to the end" either — that reads as conflict-prone.

## 🗣 Useful phrases

- *A comment is about the code, not about me.*
- *If I agree, I fix it and say thank you.*
- *I always write why, not only what.*
- *Readable code is worth more than my personal taste.*
- *Review is one of my main sources of learning.*`
    }
  },

  {
    id: 'hr-023',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['team', 'manager', 'management-style', 'culture-fit'],
    question: {
      ru: 'Опишите вашу идеальную команду и руководителя. Какой стиль управления вам подходит? / Describe your ideal team and manager.',
      en: 'Describe your ideal team and manager. What management style works for you? / Опишите идеальную команду и руководителя.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

**About the team.** I like a team where people ask questions **without being afraid of looking stupid**, and where code review is normal and never personal. The size does not matter much to me — I worked in small and in large teams. What matters is that people talk to each other instead of sitting in silos.

**About the manager**, three things matter to me.

1. **Clear priorities.** I want to know what is the most important thing this week. If I know that, I can organise the rest myself.
2. **Trust.** Give me a task and a deadline, and let me decide how to do it. I do not need somebody checking on me every two hours — but I will report the status myself, so nobody has to ask.
3. **Honest and early feedback.** If something is wrong with my work, I would much rather hear it directly next week than find out at the yearly review.

**What does not work for me** is micromanagement — and, honestly, the opposite extreme too: when nobody sets priorities at all and every task is equally urgent. Both of them waste a lot of energy.

## 🇷🇺 Перевод

**Про команду.** Мне нравится команда, где люди задают вопросы, **не боясь выглядеть глупо**, и где код-ревью — это нормально и никогда не лично. Размер для меня не так важен: работал и в маленьких, и в больших командах. Важно, чтобы люди разговаривали друг с другом, а не сидели по своим норкам.

**Про руководителя** — важны три вещи.

1. **Понятные приоритеты.** Хочу знать, что самое важное на этой неделе. Если я это знаю, остальное организую сам.
2. **Доверие.** Дайте задачу и срок, а как делать — дайте решить мне. Мне не нужен кто-то, кто проверяет меня каждые два часа, — но статус я сообщаю сам, чтобы не приходилось спрашивать.
3. **Честная и ранняя обратная связь.** Если с моей работой что-то не так, я гораздо охотнее услышу это напрямую на следующей неделе, чем узнаю на годовом ревью.

**Что мне не подходит** — микроменеджмент. И, честно говоря, обратная крайность тоже: когда приоритеты не расставляет никто и все задачи одинаково срочные. И то и другое съедает уйму сил.

## 💡 Как отвечать

- Вопрос на **culture fit**. HR примеряет тебя к конкретному менеджеру, который у них есть.
- **Не описывай утопию** («идеальная команда — где нет дедлайнов и все всё успевают»). Говори про рабочие вещи: приоритеты, доверие, фидбэк.
- **Фраза про доверие обязательно с добавкой «но статус я сообщаю сам».** Иначе «не проверяйте меня» звучит как «не контролируйте меня» — это красный флаг.
- **Назвать микроменеджмент можно**, это безопасно и понятно всем. Но обязательно добавь и вторую крайность — тогда это выглядит как зрелое суждение, а не как жалоба на прошлого начальника.
- Не превращай ответ в описание того, чего тебе не хватало на прошлом месте. Держись формулировок «что мне подходит», а не «чего у них не было».
- Если знаешь про их процессы из вакансии (скрам, дейлики, ревью) — упомяни, что тебе это подходит.

## 🗣 Полезные фразы

- *A team where people are not afraid to ask questions.* — Команда, где люди не боятся задавать вопросы.
- *Give me a task and a deadline, and let me decide how.* — Дайте задачу и срок, а как делать — дайте решить мне.
- *I report the status myself, so nobody has to ask.* — Статус я сообщаю сам, чтобы не приходилось спрашивать.
- *I would rather hear it directly and early.* — Я предпочту услышать это прямо и рано.
- *Micromanagement does not work for me — and neither does no priorities at all.* — Мне не подходит микроменеджмент, как и полное отсутствие приоритетов.`,
      en: `## 🇬🇧 English answer

**About the team.** I like a team where people ask questions **without being afraid of looking stupid**, and where code review is normal and never personal. The size does not matter much to me — I worked in small and in large teams. What matters is that people talk to each other instead of sitting in silos.

**About the manager**, three things matter to me.

1. **Clear priorities.** I want to know what is the most important thing this week. If I know that, I can organise the rest myself.
2. **Trust.** Give me a task and a deadline, and let me decide how to do it. I do not need somebody checking on me every two hours — but I will report the status myself, so nobody has to ask.
3. **Honest and early feedback.** If something is wrong with my work, I would much rather hear it directly next week than find out at the yearly review.

**What does not work for me** is micromanagement — and, honestly, the opposite extreme too: when nobody sets priorities at all and every task is equally urgent. Both of them waste a lot of energy.

## 🇷🇺 Russian version

**Команда:** где не боятся задавать вопросы и где ревью — нормально и не лично; размер не важен. **Руководитель:** понятные приоритеты, доверие («дайте задачу и срок, а как — решу сам», но статус сообщаю сам), честная и ранняя обратная связь. **Не подходит:** микроменеджмент — и обратная крайность, когда приоритетов не ставит никто.

## 💡 How to answer

- This is a **culture-fit** question. They are matching you against a specific manager who actually exists there.
- **Do not describe a utopia** ("a team with no deadlines"). Talk about working things: priorities, trust, feedback.
- **The trust line must come with "but I report the status myself".** Otherwise "do not check on me" reads as "do not manage me" — a red flag.
- **Naming micromanagement is safe** and everyone understands it. But always add the opposite extreme too — then it reads as mature judgement rather than a complaint about your last boss.
- Do not turn the answer into a list of what was missing at your previous job. Stay on "what works for me", not "what they lacked".
- If the job description mentions their process (scrum, dailies, review), say it fits you.

## 🗣 Useful phrases

- *A team where people are not afraid to ask questions.*
- *Give me a task and a deadline, and let me decide how.*
- *I report the status myself, so nobody has to ask.*
- *I would rather hear it directly and early.*
- *Micromanagement does not work for me — and neither does no priorities at all.*`
    }
  },

  {
    id: 'hr-024',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['self-assessment', 'reputation', 'soft-skills'],
    question: {
      ru: 'Как бы вас описали коллеги или руководитель? / How would your colleagues or your manager describe you?',
      en: 'How would your colleagues or your manager describe you? / Как бы вас описали коллеги или руководитель?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I think they would say three things.

**First, reliable.** If a task is on me, nobody needs to check it. That is probably why the grid presets and the library upgrades stayed on me for years — people know that this area is covered.

**Second, easy to ask.** Over the last years our team changed a lot, and new developers usually come to me with questions about the product. I never make anyone feel stupid for asking, so they come back.

**Third, calm.** I do not panic during incidents and I do not turn a code review into a personal fight. When something is broken, I prefer to look at the logs rather than to look for the guilty person.

And if they wanted to criticise me, they would probably say that I sometimes go too deep into the details.

## 🇷🇺 Перевод

Думаю, они сказали бы три вещи.

**Первое — надёжный.** Если задача на мне, её никому не нужно проверять. Наверное, поэтому grid presets и апгрейды библиотек годами остаются на мне: люди знают, что эта область закрыта.

**Второе — к нему легко подойти.** За последние годы команда сильно менялась, и новые разработчики обычно идут с вопросами по продукту ко мне. Я никогда не даю человеку почувствовать себя глупо из-за вопроса — поэтому они возвращаются.

**Третье — спокойный.** Не паникую в инцидентах и не превращаю код-ревью в личную драку. Когда что-то сломалось, я предпочитаю смотреть в логи, а не искать виноватого.

А если бы захотели покритиковать, наверное, сказали бы, что я иногда слишком глубоко ухожу в детали.

## 💡 Как отвечать

- Формально вопрос про чужое мнение, но фактически это **проверка самооценки**. Отвечай так, как будто это правда сказали бы люди, а не как список желаемых качеств.
- **Каждое слово подкрепляй фактом.** «Надёжный» — пустое. «Надёжный, поэтому grid presets годами на мне» — доказательство. Это главное отличие сильного ответа.
- **Три качества максимум.** Пять прилагательных подряд не запоминаются и звучат как самореклама.
- **Добавь в конце одну возможную критику** — это резко повышает доверие ко всему остальному. И пусть она совпадает со слабой стороной из вопроса про сильные/слабые: интервьюеры сверяют ответы между собой.
- Хорошо работает, если качества **разные по типу**: одно про результат (надёжный), одно про людей (легко подойти), одно про поведение под стрессом (спокойный).
- Если спросят «а что бы сказал именно руководитель?» — сделай упор на предсказуемость: сроки, статусы, отсутствие сюрпризов.

## 🗣 Полезные фразы

- *I think they would say three things.* — Думаю, они сказали бы три вещи.
- *If a task is on me, nobody needs to check it.* — Если задача на мне, её никому не нужно проверять.
- *I never make anyone feel stupid for asking.* — Я никогда не даю человеку почувствовать себя глупо из-за вопроса.
- *I prefer to look at the logs rather than for the guilty person.* — Я предпочитаю смотреть в логи, а не искать виноватого.
- *If they wanted to criticise me, they would probably say…* — Если бы захотели покритиковать, наверное, сказали бы…`,
      en: `## 🇬🇧 English answer

I think they would say three things.

**First, reliable.** If a task is on me, nobody needs to check it. That is probably why the grid presets and the library upgrades stayed on me for years — people know that this area is covered.

**Second, easy to ask.** Over the last years our team changed a lot, and new developers usually come to me with questions about the product. I never make anyone feel stupid for asking, so they come back.

**Third, calm.** I do not panic during incidents and I do not turn a code review into a personal fight. When something is broken, I prefer to look at the logs rather than to look for the guilty person.

And if they wanted to criticise me, they would probably say that I sometimes go too deep into the details.

## 🇷🇺 Russian version

Три вещи. **Надёжный** — если задача на мне, её не надо проверять (поэтому grid presets и апгрейды годами на мне). **К нему легко подойти** — новые разработчики идут с вопросами ко мне, и я никогда не даю почувствовать себя глупо. **Спокойный** — не паникую в инцидентах, смотрю в логи, а не ищу виноватого. А покритиковали бы за то, что иногда слишком глубоко ухожу в детали.

## 💡 How to answer

- Formally it asks about other people's opinion, but really it is a **self-awareness check**. Answer as if people would actually say it, not as a wish list.
- **Back every word with a fact.** "Reliable" is empty. "Reliable — that is why grid presets stayed on me for years" is evidence. That is what separates a strong answer.
- **Three qualities, maximum.** Five adjectives in a row are unmemorable and sound like self-promotion.
- **Add one possible criticism at the end** — it sharply increases trust in everything before it. Make it match the weakness you gave in the strengths/weaknesses question: interviewers cross-check answers.
- It works best when the three qualities are **different in kind**: one about results (reliable), one about people (approachable), one about behaviour under stress (calm).
- If they ask "what would your manager say specifically?" — emphasise predictability: deadlines, status updates, no surprises.

## 🗣 Useful phrases

- *I think they would say three things.*
- *If a task is on me, nobody needs to check it.*
- *I never make anyone feel stupid for asking.*
- *I prefer to look at the logs rather than for the guilty person.*
- *If they wanted to criticise me, they would probably say…*`
    }
  },

  {
    id: 'hr-025',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['mentoring', 'leadership', 'onboarding'],
    question: {
      ru: 'Есть ли у вас опыт менторства или руководства командой? / Do you have experience with mentoring or leading?',
      en: 'Do you have any experience with mentoring or leading a team? / Есть ли у вас опыт менторства или руководства?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I do not have a formal Lead title, but I have been doing a part of that work for years.

**Onboarding.** Over four years our team changed almost completely, so I became the person who brings new developers in: I explain the architecture, the business logic, the parts that are not obvious from the code, and I review their first merge requests carefully — with explanations, not just with "please fix".

**Technical ownership.** I own the shared component library, and that is a form of technical leadership. When you decide the API of a component that the whole team will use, you are making a decision for other people, not for yourself. If I design it badly, ten developers feel it every day.

**Difficult work nobody claims.** The library upgrades are on me. Taking the unpleasant but necessary task is also a part of being senior in a team.

I would be happy to grow into an official Lead or mentor role — that is exactly the direction I want. The only thing I would not want is to stop coding completely.

## 🇷🇺 Перевод

Формального титула Lead у меня нет, но часть этой работы я делаю уже несколько лет.

**Онбординг.** За четыре года команда сменилась почти полностью, и я стал тем, кто вводит новых разработчиков: объясняю архитектуру, бизнес-логику, вещи, которые из кода не очевидны, и внимательно ревьюю их первые merge request'ы — с объяснениями, а не просто «поправьте».

**Техническое владение.** На мне библиотека общих компонентов, а это и есть форма технического лидерства. Когда ты определяешь API компонента, которым будет пользоваться вся команда, ты принимаешь решение за других людей, а не за себя. Спроектирую плохо — это каждый день будут чувствовать десять разработчиков.

**Тяжёлая работа, которую никто не берёт.** Апгрейды библиотек — на мне. Брать неприятную, но нужную задачу — тоже часть senior-роли в команде.

Я был бы рад вырасти в официального Lead или ментора — это ровно то направление, которого я хочу. Единственное, чего не хотел бы, — полностью перестать писать код.

## 💡 Как отвечать

- **Не говори «нет, опыта нет», даже если нет титула.** Почти у любого senior есть онбординг, ревью и владение областью — это и есть лидерство, просто неоформленное.
- **Формулировка «I do not have a formal title, but…» — идеальное начало.** Она честная (тебя не поймают на преувеличении) и сразу переводит разговор на то, что ты реально делал.
- **Сильнейший аргумент — про API общих компонентов.** «Я принимаю решение за десять разработчиков» — это ровно то, чем лидерство отличается от исполнения. Не пропускай эту мысль.
- Про онбординг говори **с деталью «с объяснениями, а не просто поправьте»**. Это отличает ментора от ревьюера.
- Если вакансия **Lead** — заканчивай уверенно: «готов и хочу». Если обычная **Senior** — скажи мягче, чтобы не выглядело, будто позиция тебе мала.
- Готовься к follow-up: **«Сколько людей вы заонбордили?»** Вспомни число заранее.

## 🗣 Полезные фразы

- *I do not have a formal Lead title, but I have been doing a part of that work for years.* — Формального титула Lead нет, но часть этой работы я делаю уже несколько лет.
- *I explain the parts that are not obvious from the code.* — Я объясняю то, что из кода не очевидно.
- *When you decide the API of a shared component, you decide for other people.* — Когда ты определяешь API общего компонента, ты решаешь за других людей.
- *Taking the unpleasant but necessary task is part of being senior.* — Брать неприятную, но нужную задачу — часть senior-роли.
- *I would not want to stop coding completely.* — Я не хотел бы полностью перестать писать код.`,
      en: `## 🇬🇧 English answer

I do not have a formal Lead title, but I have been doing a part of that work for years.

**Onboarding.** Over four years our team changed almost completely, so I became the person who brings new developers in: I explain the architecture, the business logic, the parts that are not obvious from the code, and I review their first merge requests carefully — with explanations, not just with "please fix".

**Technical ownership.** I own the shared component library, and that is a form of technical leadership. When you decide the API of a component that the whole team will use, you are making a decision for other people, not for yourself. If I design it badly, ten developers feel it every day.

**Difficult work nobody claims.** The library upgrades are on me. Taking the unpleasant but necessary task is also a part of being senior in a team.

I would be happy to grow into an official Lead or mentor role — that is exactly the direction I want. The only thing I would not want is to stop coding completely.

## 🇷🇺 Russian version

Формального титула Lead нет, но часть работы делаю годами. **Онбординг:** команда сменилась почти полностью, новых разработчиков ввожу я — архитектура, бизнес-логика, внимательное ревью первых MR с объяснениями. **Техническое владение:** библиотека общих компонентов — когда определяешь API, решаешь за других людей. **Тяжёлая работа:** апгрейды библиотек на мне. Готов вырасти в официального Lead, но не хочу полностью перестать кодить.

## 💡 How to answer

- **Do not say "no, I have no experience" just because you have no title.** Almost every senior does onboarding, review and area ownership — that is leadership, only unlabelled.
- **"I do not have a formal title, but…" is the perfect opening.** It is honest (nobody can catch you overstating) and it immediately moves the conversation to what you actually did.
- **The strongest argument is the shared-component API.** "I make a decision on behalf of ten developers" is exactly what separates leading from executing. Do not skip that line.
- Describe onboarding **with the detail "with explanations, not just 'please fix'"**. That is what separates a mentor from a reviewer.
- If the vacancy is a **Lead** role — finish confidently: "I am ready and I want it". If it is a plain **Senior** seat — soften it, so it does not sound like the role is too small for you.
- Prepare for the follow-up: **"How many people have you onboarded?"** Recall the number in advance.

## 🗣 Useful phrases

- *I do not have a formal Lead title, but I have been doing a part of that work for years.*
- *I explain the parts that are not obvious from the code.*
- *When you decide the API of a shared component, you decide for other people.*
- *Taking the unpleasant but necessary task is part of being senior.*
- *I would not want to stop coding completely.*`
    }
  },

  {
    id: 'hr-026',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['remote', 'hybrid', 'self-organisation', 'work-format'],
    question: {
      ru: 'Удалённо, гибрид или офис — что вам подходит? Как вы себя организуете на удалёнке? / Remote, hybrid or office?',
      en: 'Do you prefer remote, hybrid or office? How do you organise yourself working remotely? / Удалённо, гибрид или офис?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I have been working remotely for a long time and it works well for me.

**How I organise myself.** I keep **fixed working hours**, so the team always knows when I am available — this is the most important part, especially when people are in different time zones. I am online in the chat and I answer quickly. And if a discussion takes more than a few messages, I just start a call instead of typing — it is faster and it prevents misunderstandings.

I also try to make my work **visible**: I update the ticket status, I write in the daily channel what I am doing and where I am blocked. When people do not see you at a desk, written communication is what replaces it.

**I am fine with hybrid too.** Some things are honestly better in person — planning, workshops, and the first weeks of a new person on the team. I am comfortable coming to the office for those.

The only format I would like to avoid is full time in the office five days a week.

## 🇷🇺 Перевод

Я давно работаю удалённо, и мне это подходит.

**Как я себя организую.** Держу **фиксированные рабочие часы**, чтобы команда всегда знала, когда я доступен, — это самое важное, особенно если люди в разных часовых поясах. Я онлайн в чате и быстро отвечаю. А если обсуждение занимает больше нескольких сообщений, я просто начинаю созвон вместо переписки: быстрее и без недопониманий.

Ещё я стараюсь делать свою работу **видимой**: обновляю статусы тикетов, пишу в дейли-канал, что делаю и где заблокирован. Когда люди не видят тебя за столом, письменная коммуникация — это то, что заменяет присутствие.

**Гибрид тоже нормально.** Некоторые вещи честно лучше вживую — планирование, воркшопы и первые недели нового человека в команде. На такое я спокойно приезжаю в офис.

Единственный формат, которого хотел бы избежать, — полный офис пять дней в неделю.

## 💡 Как отвечать

- **Сначала посмотри вакансию.** Если там написано «hybrid, 2 days in the office» — не начинай с «я хочу полную удалёнку». Начни с «мне подходит гибрид», а потом добавь, что удалённо тоже давно работаю.
- Главное, что проверяют: **не пропадёшь ли ты**. Поэтому ответ должен быть не «мне удобно дома», а **«вот как я делаю себя доступным»**.
- **«Фиксированные часы» и «делаю работу видимой»** — две фразы, которые закрывают этот страх почти целиком.
- Приём **«больше нескольких сообщений — начинаю созвон»** отлично звучит: показывает, что ты не прячешься за перепиской и не боишься говорить (в том числе на английском).
- Не жалуйся на офис и не объясняй через быт («дорога занимает час»). Формулируй через **эффективность**, а не через комфорт.
- Будь готов к follow-up про **часовой пояс и перекрытие**: *«I am in Warsaw, so I overlap with most of Europe fully.»*

## 🗣 Полезные фразы

- *I keep fixed working hours, so the team knows when I am available.* — Я держу фиксированные часы, чтобы команда знала, когда я доступен.
- *If a discussion takes more than a few messages, I start a call.* — Если обсуждение больше нескольких сообщений, я начинаю созвон.
- *I try to make my work visible.* — Я стараюсь делать свою работу видимой.
- *Some things are better in person.* — Некоторые вещи лучше вживую.
- *I am in Warsaw, so I overlap with most of Europe.* — Я в Варшаве, так что перекрываюсь почти со всей Европой.`,
      en: `## 🇬🇧 English answer

I have been working remotely for a long time and it works well for me.

**How I organise myself.** I keep **fixed working hours**, so the team always knows when I am available — this is the most important part, especially when people are in different time zones. I am online in the chat and I answer quickly. And if a discussion takes more than a few messages, I just start a call instead of typing — it is faster and it prevents misunderstandings.

I also try to make my work **visible**: I update the ticket status, I write in the daily channel what I am doing and where I am blocked. When people do not see you at a desk, written communication is what replaces it.

**I am fine with hybrid too.** Some things are honestly better in person — planning, workshops, and the first weeks of a new person on the team. I am comfortable coming to the office for those.

The only format I would like to avoid is full time in the office five days a week.

## 🇷🇺 Russian version

Давно работаю удалённо. **Организую себя** так: фиксированные часы (команда знает, когда я доступен), быстрые ответы в чате, а если обсуждение больше нескольких сообщений — начинаю созвон. Делаю работу **видимой**: статусы тикетов, дейли-канал, где заблокирован. **Гибрид тоже ок** — планирование, воркшопы и первые недели нового человека лучше вживую. Избегал бы только полного офиса пять дней в неделю.

## 💡 How to answer

- **Read the job description first.** If it says "hybrid, 2 days in the office", do not open with "I want full remote". Open with "hybrid works for me", then add that you have long remote experience.
- What they are really checking: **will you disappear.** So the answer is not "I like working from home" but **"here is how I stay reachable"**.
- **"Fixed working hours" and "I make my work visible"** are the two phrases that close that fear almost completely.
- The **"more than a few messages → I start a call"** habit lands very well: it shows you do not hide behind text and you are not afraid to speak (including in English).
- Do not complain about offices or justify with logistics ("the commute takes an hour"). Frame it through **effectiveness**, not comfort.
- Be ready for the follow-up about **time zone and overlap**: *"I am in Warsaw, so I overlap with most of Europe fully."*

## 🗣 Useful phrases

- *I keep fixed working hours, so the team knows when I am available.*
- *If a discussion takes more than a few messages, I start a call.*
- *I try to make my work visible.*
- *Some things are better in person.*
- *I am in Warsaw, so I overlap with most of Europe.*`
    }
  },

  {
    id: 'hr-027',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['location', 'relocation', 'contract', 'b2b', 'logistics'],
    question: {
      ru: 'Где вы находитесь? Готовы ли к релокации? Какой формат контракта вам подходит? / Where are you based? Are you open to relocation? What contract type?',
      en: 'Where are you based, are you open to relocation, and what contract type do you work with? / Где вы находитесь и готовы ли к релокации?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I live in **Warsaw, Poland**, and I work through a **B2B contract**.

I have the right to work here, so **no visa or work permit process is needed** from your side.

I am open to **remote** work, and I am also open to **relocation** if the project needs it. For a hybrid setup the Warsaw office is completely comfortable for me.

**And a question back:** which contract type do you offer for this position — B2B or an employment contract? And is the position remote, hybrid or office-based?

## 🇷🇺 Перевод

Я живу в **Варшаве, Польша**, и работаю по **B2B-контракту**.

У меня есть право на работу здесь, поэтому **никаких виз и разрешений на работу с вашей стороны не потребуется**.

Я открыт к **удалённой** работе и также готов к **релокации**, если это нужно проекту. Для гибридного формата варшавский офис мне полностью удобен.

**И встречный вопрос:** какой тип контракта вы предлагаете на этой позиции — B2B или трудовой договор? И позиция удалённая, гибридная или офисная?

## 💡 Как отвечать

- Это **чисто административный вопрос**. Отвечай коротко и конкретно, без историй. Здесь тебя не оценивают — здесь закрывают чек-лист.
- **Фраза «no visa or work permit needed» — самая важная.** Для рекрутера это снятие целого блока рисков и бюрократии, и это реальное преимущество перед кандидатами без права на работу. Скажи её обязательно.
- **Сразу задай встречный вопрос про тип контракта.** B2B и трудовой договор — это принципиально разные суммы «на руки» при одном и том же числе в оффере. Выяснить это надо до разговора о деньгах, а не после.
- **Про релокацию не говори «да» автоматически.** Если готов только к некоторым странам или только при определённых условиях — скажи прямо: *«I am open to relocation within the EU»*. Отыграть назад потом сложно.
- Если позиция офисная в другом городе — уточни, **кто оплачивает релокацию** и есть ли поддержка. Это нормальный вопрос, его задают все.

## 🗣 Полезные фразы

- *I am based in Warsaw, Poland.* — Я нахожусь в Варшаве, Польша.
- *I work through a B2B contract.* — Я работаю по B2B-контракту.
- *No visa or work permit is needed from your side.* — С вашей стороны не нужны ни виза, ни разрешение на работу.
- *I am open to relocation if the project needs it.* — Я готов к релокации, если это нужно проекту.
- *Which contract type do you offer — B2B or an employment contract?* — Какой тип контракта вы предлагаете — B2B или трудовой договор?`,
      en: `## 🇬🇧 English answer

I live in **Warsaw, Poland**, and I work through a **B2B contract**.

I have the right to work here, so **no visa or work permit process is needed** from your side.

I am open to **remote** work, and I am also open to **relocation** if the project needs it. For a hybrid setup the Warsaw office is completely comfortable for me.

**And a question back:** which contract type do you offer for this position — B2B or an employment contract? And is the position remote, hybrid or office-based?

## 🇷🇺 Russian version

Живу в **Варшаве**, работаю по **B2B-контракту**. Право на работу есть — **виза и разрешение не нужны**. Открыт к удалёнке и к релокации, если нужно проекту; для гибрида варшавский офис удобен. Встречный вопрос: какой тип контракта на этой позиции — B2B или трудовой договор, и какой формат работы?

## 💡 How to answer

- This is a **purely administrative question**. Answer short and concrete, no stories. Nobody is evaluating you here — they are ticking a checklist.
- **"No visa or work permit needed" is the key line.** For a recruiter that removes a whole block of risk and paperwork, and it is a real advantage over candidates without work rights. Always say it.
- **Ask back about the contract type immediately.** B2B and an employment contract mean very different take-home amounts for the same offer number. Clarify it before the money conversation, not after.
- **Do not say "yes" to relocation automatically.** If you are only open to certain countries or conditions, say so: *"I am open to relocation within the EU."* Walking it back later is hard.
- If the role is office-based in another city, ask **who covers the relocation** and whether there is support. It is a normal question that everyone asks.

## 🗣 Useful phrases

- *I am based in Warsaw, Poland.*
- *I work through a B2B contract.*
- *No visa or work permit is needed from your side.*
- *I am open to relocation if the project needs it.*
- *Which contract type do you offer — B2B or an employment contract?*`
    }
  },

  {
    id: 'hr-028',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['other-offers', 'negotiation', 'process'],
    question: {
      ru: 'Рассматриваете ли вы другие компании? Есть ли у вас офферы? / Are you interviewing elsewhere? Do you have other offers?',
      en: 'Are you interviewing with other companies? Do you have any other offers? / Рассматриваете ли вы другие предложения?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

Yes, I am talking to a couple of other companies — I am doing the search seriously, so I am looking at several options in parallel.

Nothing is at the offer stage right now. **[Или, если есть:]** One process is at the final stage, so I expect to have some clarity within about **[N]** weeks.

Your position is one of the most interesting for me because of **[the stack / the product / the domain]**, so I would like to move forward here.

**Could you tell me what the next steps are and roughly what timeline you have?**

## 🇷🇺 Перевод

Да, я общаюсь ещё с парой компаний — я подхожу к поиску серьёзно, поэтому смотрю несколько вариантов параллельно.

На стадии оффера сейчас ничего нет. **[Или, если есть:]** Один процесс на финальной стадии, так что ясность появится примерно через **[N]** недель.

Ваша позиция для меня одна из самых интересных из-за **[стека / продукта / домена]**, поэтому я хотел бы двигаться дальше именно здесь.

**Не подскажете, какие следующие шаги и какие у вас примерно сроки?**

## 💡 Как отвечать

- **Отвечай честно «да».** Это нормально и ожидаемо: все кандидаты смотрят несколько мест. «Нет, только вы» звучит либо неправдоподобно, либо как «меня больше никуда не зовут» — и то и другое ослабляет твою позицию.
- **Но без имён и без цифр.** Не называй компании и не называй суммы чужих офферов. Во-первых, это непрофессионально, во-вторых, тебя тут же начнут сравнивать с чужой вилкой.
- **Не блефуй про несуществующий оффер.** Спросят детали, ты поплывёшь, и всё доверие уйдёт. Плюс это часто проверяется — рынок маленький.
- **Обязательно добавь, почему им ты хочешь идти дальше.** Иначе «я смотрю ещё пять мест» звучит холодно и они снизят приоритет.
- **Настоящая ценность этого вопроса — встречный.** Спроси про следующие шаги и сроки. Это единственный способ синхронизировать процессы, если у тебя действительно параллельно идут несколько компаний.
- Если оффер **правда есть и есть дедлайн** — скажи прямо: *«I have an offer with a deadline on [date], so it would help me a lot to understand your timeline.»* Это ускоряет процесс лучше любых уговоров.

## 🗣 Полезные фразы

- *Yes, I am talking to a couple of other companies.* — Да, я общаюсь ещё с парой компаний.
- *Nothing is at the offer stage right now.* — На стадии оффера сейчас ничего нет.
- *Your position is one of the most interesting for me.* — Ваша позиция для меня одна из самых интересных.
- *What are the next steps and what timeline do you have?* — Какие следующие шаги и какие у вас сроки?
- *It would help me a lot to understand your timeline.* — Мне бы очень помогло понимать ваши сроки.`,
      en: `## 🇬🇧 English answer

Yes, I am talking to a couple of other companies — I am doing the search seriously, so I am looking at several options in parallel.

Nothing is at the offer stage right now. **[Or, if there is:]** One process is at the final stage, so I expect to have some clarity within about **[N]** weeks.

Your position is one of the most interesting for me because of **[the stack / the product / the domain]**, so I would like to move forward here.

**Could you tell me what the next steps are and roughly what timeline you have?**

## 🇷🇺 Russian version

Да, общаюсь ещё с парой компаний — ищу серьёзно, смотрю несколько вариантов. На стадии оффера сейчас ничего нет. Ваша позиция для меня одна из самых интересных из-за **[стека / продукта / домена]**, хотел бы двигаться дальше здесь. Встречный вопрос: какие следующие шаги и какие у вас сроки?

## 💡 How to answer

- **Answer honestly: yes.** It is normal and expected — every candidate looks at several places. "No, only you" sounds either implausible or like "nobody else wants me", and both weaken your position.
- **But no names and no numbers.** Do not name companies and do not quote other offers' figures. It is unprofessional, and they will immediately benchmark you against somebody else's range.
- **Never bluff about an offer you do not have.** They will ask for details, you will stumble, and the trust is gone. It also gets checked — the market is small.
- **Always add why you want to move forward with them.** Otherwise "I am looking at five other places" sounds cold and they will lower your priority.
- **The real value of this question is the one you ask back.** Ask about next steps and timeline — it is the only way to synchronise processes if you genuinely have several running.
- If you **do have an offer with a deadline**, say it plainly: *"I have an offer with a deadline on [date], so it would help me a lot to understand your timeline."* That speeds things up better than any persuasion.

## 🗣 Useful phrases

- *Yes, I am talking to a couple of other companies.*
- *Nothing is at the offer stage right now.*
- *Your position is one of the most interesting for me.*
- *What are the next steps and what timeline do you have?*
- *It would help me a lot to understand your timeline.*`
    }
  },

  {
    id: 'hr-029',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['questions-to-ask', 'reverse-interview', 'closing'],
    question: {
      ru: 'У вас есть вопросы к нам? / Do you have any questions for us?',
      en: 'Do you have any questions for us? / У вас есть вопросы к нам?'
    },
    answer: {
      ru: `## 🇬🇧 Готовый список вопросов

Выбери **3–4** и задай. Не задавай все — это будет уже допрос.

**Про продукт и проект**

- *What is the product about, and who are the users?* — Что за продукт и кто пользователи?
- *What stage is the project at — is it a new product or an existing one?* — На какой стадии проект: новый продукт или уже существующий?
- *What is the biggest challenge for the team right now?* — Какая сейчас самая большая сложность у команды?

**Про команду**

- *How big is the frontend team, and who would I work with?* — Насколько велика фронтенд-команда и с кем я буду работать?
- *Is there a tech lead or an architect on the frontend side?* — Есть ли на фронтенде тимлид или архитектор?
- *Why is this position open — is the team growing, or is it a replacement?* — Почему позиция открыта: команда растёт или это замена?

**Про технику** *(самые ценные вопросы — задай хотя бы один)*

- *Which Angular version are you on, and how often do you upgrade?* — На какой версии Angular вы сейчас и как часто обновляетесь?
- *Do you have tests, and what is the coverage situation?* — Есть ли тесты и как обстоят дела с покрытием?
- *Is there a lot of technical debt, and is there time allocated for refactoring?* — Много ли технического долга и выделяется ли время на рефакторинг?
- *Is code review mandatory for every merge request?* — Обязательно ли ревью на каждый merge request?

**Про процессы**

- *How do you plan the work — sprints, kanban, something else?* — Как вы планируете работу: спринты, канбан, что-то другое?
- *Who sets the priorities, and how often do they change?* — Кто ставит приоритеты и как часто они меняются?
- *How often do you release?* — Как часто вы релизите?

**Про роль и рост**

- *What would you expect from me in the first three months?* — Чего вы ждёте от меня в первые три месяца?
- *What does success look like in this role after a year?* — Как выглядит успех в этой роли через год?
- *Is there a career path and a performance review process?* — Есть ли карьерный трек и процесс review?
- *Is there a budget for courses or conferences?* — Есть ли бюджет на курсы или конференции?

**В самом конце — обязательно**

- *What are the next steps, and when can I expect feedback?* — Какие следующие шаги и когда ждать обратной связи?

## 💡 Как отвечать

- **Ответ «нет, спасибо, всё понятно» — одна из самых частых и самых дорогих ошибок.** Он читается как «мне всё равно, где работать». Даже если тебе правда всё ясно — задай хотя бы два вопроса.
- **Готовь 5–7, задавай 3–4.** Часть вопросов отпадёт сама: на них ответят по ходу интервью. Это нормально и даже хорошо — можно сказать *«most of my questions you already answered»*, а потом всё равно задать оставшиеся.
- **Технические вопросы — самые сильные.** Спросив про версию Angular, тесты и техдолг, ты одновременно узнаёшь правду о проекте и показываешь, что мыслишь как инженер, а не как соискатель.
- **Вопрос «почему позиция открыта» — недооценённый.** Ответ «команда растёт» и ответ «человек ушёл, и до него ушёл ещё один» — это две очень разные компании.
- **Подстраивай под собеседника.** HR-скрининг: продукт, команда, процессы, следующие шаги. Техническое интервью: стек, техдолг, тесты, архитектура. Не спрашивай HR про архитектуру — он не знает и почувствует себя неловко.
- **Про деньги, отпуск и переработки — не на первом HR-звонке**, если только они сами не подняли тему. Оставь на этап оффера.
- **Про следующие шаги спрашивай всегда.** Это бесплатный способ и показать заинтересованность, и получить понятный срок вместо неизвестности.

## 🗣 Как начать и закончить

- *Yes, I have a few.* — Да, есть несколько.
- *Most of my questions you have already answered, but two things are still open.* — На большинство вопросов вы уже ответили, но два момента остались.
- *Can I ask a couple of technical questions about the project?* — Можно пару технических вопросов о проекте?
- *That is all from my side, thank you.* — С моей стороны это всё, спасибо.
- *Thank you, it was a very useful conversation.* — Спасибо, это был очень полезный разговор.`,
      en: `## 🇬🇧 A ready list of questions

Pick **3–4** and ask those. Do not ask all of them — that turns into an interrogation.

**About the product and the project**

- *What is the product about, and who are the users?*
- *What stage is the project at — is it a new product or an existing one?*
- *What is the biggest challenge for the team right now?*

**About the team**

- *How big is the frontend team, and who would I work with?*
- *Is there a tech lead or an architect on the frontend side?*
- *Why is this position open — is the team growing, or is it a replacement?*

**Technical** *(the most valuable ones — ask at least one)*

- *Which Angular version are you on, and how often do you upgrade?*
- *Do you have tests, and what is the coverage situation?*
- *Is there a lot of technical debt, and is there time allocated for refactoring?*
- *Is code review mandatory for every merge request?*

**About the process**

- *How do you plan the work — sprints, kanban, something else?*
- *Who sets the priorities, and how often do they change?*
- *How often do you release?*

**About the role and growth**

- *What would you expect from me in the first three months?*
- *What does success look like in this role after a year?*
- *Is there a career path and a performance review process?*
- *Is there a budget for courses or conferences?*

**At the very end — always**

- *What are the next steps, and when can I expect feedback?*

## 🇷🇺 Russian version

Готовый список: **продукт** (что за продукт, кто пользователи, какая сейчас главная сложность), **команда** (размер фронтенд-команды, есть ли лид, почему открыта позиция), **техника** (версия Angular, тесты, техдолг, обязательность ревью), **процессы** (спринты, кто ставит приоритеты, как часто релизы), **роль и рост** (что ждут в первые 3 месяца, как выглядит успех через год, есть ли review и бюджет на обучение) и **обязательно в конце** — следующие шаги и сроки обратной связи. Готовь 5–7, задавай 3–4.

## 💡 How to answer

- **"No thanks, everything is clear" is one of the most common and most expensive mistakes.** It reads as "I do not care where I work". Even if everything really is clear — ask at least two.
- **Prepare 5–7, ask 3–4.** Some will be answered during the interview anyway. That is fine — say *"most of my questions you already answered"* and then ask the remaining ones.
- **The technical questions are the strongest.** Asking about the Angular version, tests and technical debt tells you the truth about the project and shows you think like an engineer, not like an applicant.
- **"Why is this position open" is underrated.** "The team is growing" and "someone left, and someone left before them" describe two very different companies.
- **Match the questions to the person.** HR screening: product, team, process, next steps. Technical interview: stack, debt, tests, architecture. Do not ask HR about architecture — they will not know and will feel awkward.
- **Money, vacation and overtime: not on the first HR call**, unless they raise it. Save it for the offer stage.
- **Always ask about next steps.** It is a free way to show interest and to get a concrete date instead of uncertainty.

## 🗣 How to open and close

- *Yes, I have a few.*
- *Most of my questions you have already answered, but two things are still open.*
- *Can I ask a couple of technical questions about the project?*
- *That is all from my side, thank you.*
- *Thank you, it was a very useful conversation.*`
    }
  }
];
