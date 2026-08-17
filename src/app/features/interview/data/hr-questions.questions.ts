import { InterviewQuestion } from '../interfaces/question.interface';

/**
 * HR-screening questions.
 *
 * Unlike the technical modules, every answer is a **ready-to-say script**
 * given in both languages inside the same entry (English first, then the
 * Russian version), so the answer is usable no matter which locale is active.
 * Personal facts (8 years of experience, 4 of them on the current project,
 * English-only environment, salary range) are already filled in. The few
 * remaining square-bracket placeholders — `[компания]`, `[предыдущий проект]`,
 * `[домен]` — depend on the specific vacancy and are filled in per interview.
 */
export const HR_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'hr-001',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['self-presentation', 'intro', 'about-me'],
    question: {
      ru: 'Расскажите о себе и вашем профессиональном опыте. / Tell me about yourself and your qualifications.',
      en: 'Tell me about yourself and your qualifications. / Расскажите о себе и вашем профессиональном опыте.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

Hi, my name is Anton. I am a **Senior Frontend Developer** with **8 years** of commercial experience, specialised in **Angular**.

For the last **4 years** I have been at **Exadel** in Warsaw, working on a large enterprise portal in the **FinTech** domain. The stack is Angular, TypeScript, NgXs, RxJS, KendoUI and Jest.

I am responsible for the **shared components** that the whole team reuses, and I am the **main developer of the grid preset feature** — the part that lets users save and share their own configurations of the data grids. I also take care of the **KendoUI major upgrades**: going through breaking changes across the whole application without breaking production. And I cover my code with unit and integration tests.

All the communication on the project is in English — chats, calls, documentation.

Before Exadel I worked at **Lightpoint Global**, also on FinTech, with Angular and NgRx. Earlier — **iTechArt** and **Innowise**. Two of those applications I built from scratch, and I also have commercial experience with **React**, not only Angular.

Outside of work I build pet projects. The last one is a PWA for interview preparation — Angular, Signals, offline mode, deployed to production.

I like clean and readable code, and I like to understand how things work under the hood. That is why I am looking for a project where I can grow further.

## 🇷🇺 Перевод

Здравствуйте, меня зовут Антон. Я **Senior Frontend Developer**, **8 лет** коммерческого опыта, специализация — **Angular**.

Последние **4 года** работаю в **Exadel** в Варшаве над большим корпоративным порталом в домене **FinTech**. Стек: Angular, TypeScript, NgXs, RxJS, KendoUI, Jest.

Отвечаю за **общие компоненты**, которые переиспользует вся команда, и я **основной разработчик фичи grid presets** — той части, где пользователи сохраняют и шарят свои конфигурации таблиц. Также на мне **мажорные апгрейды KendoUI**: проходить breaking changes по всему приложению, не сломав продакшен. И покрываю код unit- и интеграционными тестами.

Всё общение на проекте — на английском: чаты, созвоны, документация.

До Exadel работал в **Lightpoint Global**, тоже FinTech, Angular и NgRx. Раньше — **iTechArt** и **Innowise**. Два приложения из них поднимал с нуля, и есть коммерческий опыт с **React**, не только Angular.

Вне работы делаю пет-проекты. Последний — PWA для подготовки к собеседованиям: Angular, Signals, офлайн-режим, задеплоено в прод.

Люблю чистый и читаемый код и люблю разбираться, как всё устроено внутри. Поэтому сейчас ищу проект, где смогу расти дальше.

## 💡 Как отвечать

- Формула: **настоящее → прошлое → будущее** (сейчас делаю / что было до / чего хочу дальше).
- Длительность — **1,5–2 минуты**. Это визитка, а не пересказ резюме.
- **Нужна 30-секундная версия?** Оставь первые два абзаца + последний. Остальное расскажешь, когда спросят подробнее.
- **Grid presets и апгрейды KendoUI — называй обязательно.** Это не «делал фичи», а «владею сложной областью, которую больше никто не тянет». Именно это отличает Senior от Middle в глазах интервьюера.
- **4 года на одном проекте — назови явно.** Сигнал: не прыгаешь между работами и умеешь жить с большой кодовой базой.
- **«Всё общение на английском» — тоже скажи сразу.** Снимает половину вопросов про язык до того, как их зададут.
- **React упомяни одной фразой.** Не как «я и туда и сюда», а как «мне не страшно за пределами Angular».
- Только профессиональное: возраст, семья, город — не нужно, если не спросили.
- Закончи «мостиком» к вакансии: *«That is why your position looks interesting to me.»*

## 🗣 Полезные фразы

- *I am a Senior Frontend Developer with 8 years of commercial experience.* — Я Senior Frontend-разработчик с 8 годами коммерческого опыта.
- *For the last 4 years I have been working on…* — Последние 4 года я работаю над…
- *I am the main developer of the grid preset feature.* — Я основной разработчик фичи grid presets.
- *I am responsible for…* — Я отвечаю за…
- *I take care of the KendoUI major upgrades.* — На мне мажорные апгрейды KendoUI.
- *Before that I worked at…* — До этого я работал в…`,
      en: `## 🇬🇧 English answer

Hi, my name is Anton. I am a **Senior Frontend Developer** with **8 years** of commercial experience, specialised in **Angular**.

For the last **4 years** I have been at **Exadel** in Warsaw, working on a large enterprise portal in the **FinTech** domain. The stack is Angular, TypeScript, NgXs, RxJS, KendoUI and Jest.

I am responsible for the **shared components** that the whole team reuses, and I am the **main developer of the grid preset feature** — the part that lets users save and share their own configurations of the data grids. I also take care of the **KendoUI major upgrades**: going through breaking changes across the whole application without breaking production. And I cover my code with unit and integration tests.

All the communication on the project is in English — chats, calls, documentation.

Before Exadel I worked at **Lightpoint Global**, also on FinTech, with Angular and NgRx. Earlier — **iTechArt** and **Innowise**. Two of those applications I built from scratch, and I also have commercial experience with **React**, not only Angular.

Outside of work I build pet projects. The last one is a PWA for interview preparation — Angular, Signals, offline mode, deployed to production.

I like clean and readable code, and I like to understand how things work under the hood. That is why I am looking for a project where I can grow further.

## 🇷🇺 Russian version

Я **Senior Frontend Developer**, **8 лет** опыта, специализация — **Angular**. Последние **4 года** в **Exadel** (Варшава), большой корпоративный портал, домен **FinTech**: Angular, TypeScript, NgXs, RxJS, KendoUI, Jest. Отвечаю за **общие компоненты** и я **основной разработчик фичи grid presets**; на мне **мажорные апгрейды KendoUI**. Всё общение на английском. До этого — **Lightpoint Global** (FinTech, Angular, NgRx), **iTechArt**, **Innowise**; два приложения поднимал с нуля, есть коммерческий опыт с **React**. Вне работы — пет-проекты, последний PWA для подготовки к интервью.

## 💡 How to answer

- Formula: **present → past → future** (what I do now / what I did before / what I want next).
- Keep it **1.5–2 minutes**. It is an elevator pitch, not a re-read of the CV.
- **Need a 30-second version?** Keep the first two paragraphs and the last one.
- **Always name grid presets and the KendoUI upgrades.** That is not "I did features" — it is "I own a hard area nobody else carries". This is exactly what separates a Senior from a Middle in the interviewer's head.
- **Say "4 years on one project" explicitly** — it signals that you do not job-hop and that you can live with a large codebase.
- **Mention that everything is in English** — it answers half of the language questions before they are asked.
- **Mention React in one sentence** — not as "I do a bit of everything", but as "I am not lost outside Angular".
- Professional facts only — age, family, city are not needed unless asked.
- Finish with a bridge to the vacancy: *"That is why your position looks interesting to me."*

## 🗣 Useful phrases

- *I am a Senior Frontend Developer with 8 years of commercial experience.*
- *For the last 4 years I have been working on…*
- *I am the main developer of the grid preset feature.*
- *I am responsible for…*
- *I take care of the KendoUI major upgrades.*
- *Before that I worked at…*`
    }
  },

  {
    id: 'hr-002',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['strengths', 'weaknesses', 'self-assessment'],
    question: {
      ru: 'Ваши сильные и слабые стороны. / Strengths and weaknesses.',
      en: 'What are your strengths and weaknesses? / Ваши сильные и слабые стороны.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

**Strengths:**

- **I learn fast.** When I get a new library or tool, I can start working with it in a few days.
- **I am attentive to details.** I try to check edge cases before QA finds them. This is why the KendoUI major upgrades on my project are on me — there you have to notice every small broken thing before production does.
- **I am responsible.** If I take a task, I bring it to the end, and I tell the team early if something goes wrong. For 4 years the grid preset feature has been fully on me, and it is still alive and growing.
- **I am good at debugging.** I like to find the real reason of a bug, not just hide the symptom.

**Weakness:**

Sometimes I go too deep into details and spend too much time on polishing the code. I work with this: I set a time limit for a task and I ask for feedback earlier, so I do not polish something that will change anyway.

Another point: sometimes I take too much on myself and try to solve a problem alone instead of asking a colleague. It can cost time. Now I have a simple rule — if I am stuck for more than an hour, I go and ask the team.

## 🇷🇺 Перевод

**Сильные стороны:**

- **Быстро учусь.** Новую библиотеку или инструмент осваиваю за несколько дней.
- **Внимателен к деталям.** Стараюсь проверить крайние случаи до того, как их найдёт QA. Поэтому мажорные апгрейды KendoUI на проекте — на мне: там нужно заметить каждую мелочь раньше, чем её заметит продакшен.
- **Ответственный.** Если взял задачу — довожу до конца, а если что-то идёт не так, сразу говорю команде. Фича grid presets 4 года полностью на мне, и она жива и развивается.
- **Хорошо дебажу.** Люблю найти настоящую причину бага, а не замаскировать симптом.

**Слабая сторона:**

Иногда слишком глубоко ухожу в детали и трачу лишнее время на «вылизывание» кода. Борюсь так: ставлю таймбокс на задачу и раньше прошу обратную связь, чтобы не полировать то, что всё равно изменится.

Второй момент — иногда беру слишком много на себя и пытаюсь решить проблему в одиночку, вместо того чтобы спросить коллегу. Это стоит времени. Сейчас у меня простое правило: застрял больше чем на час — иду к команде.

## 💡 Как отвечать

- Сильных сторон — **3–4**, и каждую подкрепить примером из работы, а не просто прилагательным.
- Слабая сторона — **одна**, настоящая, но **не критичная для работы**, и обязательно **с планом, как вы с ней работаете**.
- Нельзя: *«Я перфекционист / я слишком много работаю»* — это звучит как заготовка. Нельзя и настоящие красные флаги: «не соблюдаю дедлайны», «не люблю тесты».

## 🗣 Полезные фразы

- *My main strength is…* — Моя главная сильная сторона…
- *I would say my weak point is…, and here is how I deal with it.* — Скажу, что моя слабая сторона…, и вот как я с ней работаю.
- *I am still improving my…* — Я всё ещё подтягиваю…`,
      en: `## 🇬🇧 English answer

**Strengths:**

- **I learn fast.** When I get a new library or tool, I can start working with it in a few days.
- **I am attentive to details.** I try to check edge cases before QA finds them. This is why the KendoUI major upgrades on my project are on me — there you have to notice every small broken thing before production does.
- **I am responsible.** If I take a task, I bring it to the end, and I tell the team early if something goes wrong. For 4 years the grid preset feature has been fully on me, and it is still alive and growing.
- **I am good at debugging.** I like to find the real reason of a bug, not just hide the symptom.

**Weakness:**

Sometimes I go too deep into details and spend too much time on polishing the code. I work with this: I set a time limit for a task and I ask for feedback earlier, so I do not polish something that will change anyway.

Another point: sometimes I take too much on myself and try to solve a problem alone instead of asking a colleague. It can cost time. Now I have a simple rule — if I am stuck for more than an hour, I go and ask the team.

## 🇷🇺 Russian version

**Сильные стороны:**

- **Быстро учусь.** Новую библиотеку или инструмент осваиваю за несколько дней.
- **Внимателен к деталям.** Стараюсь проверить крайние случаи до того, как их найдёт QA. Поэтому мажорные апгрейды KendoUI на проекте — на мне: там нужно заметить каждую мелочь раньше, чем её заметит продакшен.
- **Ответственный.** Если взял задачу — довожу до конца, а если что-то идёт не так, сразу говорю команде. Фича grid presets 4 года полностью на мне, и она жива и развивается.
- **Хорошо дебажу.** Люблю найти настоящую причину бага, а не замаскировать симптом.

**Слабая сторона:**

Иногда слишком глубоко ухожу в детали и трачу лишнее время на «вылизывание» кода. Борюсь так: ставлю таймбокс на задачу и раньше прошу обратную связь.

Второй момент — иногда беру слишком много на себя и решаю проблему в одиночку вместо того, чтобы спросить коллегу. Правило: застрял больше чем на час — иду к команде.

## 💡 How to answer

- Give **3–4** strengths, each backed by a work example, not just an adjective.
- Give **one** weakness — real, but **not critical for the job**, and always **with the plan you use to fix it**.
- Avoid *"I am a perfectionist / I work too much"* — it sounds scripted. Avoid real red flags too ("I miss deadlines", "I don't like tests").

## 🗣 Useful phrases

- *My main strength is…*
- *I would say my weak point is…, and here is how I deal with it.*
- *I am still improving my…*`
    }
  },

  {
    id: 'hr-003',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['achievements', 'star', 'impact'],
    question: {
      ru: 'Расскажите о ваших достижениях. / Tell me about your achievements.',
      en: 'Tell me about your achievements. / Расскажите о ваших достижениях.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I can give a few examples.

**1. I own the grid preset feature.** In our FinTech portal the users work with huge data grids, and presets let them save their own configuration — columns, filters, sorting — and share it with colleagues. I am the **main developer** of this feature: I built a large part of it and I have been supporting and extending it for years. When something is wrong there, people come to me. It is one of the most complex parts of the application, and it is fully on me.

**2. I am responsible for the shared component library.** I create and maintain the components that the whole team reuses. This means I have to think not about one screen, but about the API of a component: how other developers will use it, what they will need in six months, and how not to break their code when I change something.

**3. I do the KendoUI major upgrades.** This is the task nobody wants. A major version means breaking changes across the entire application, and it has to be done without breaking production. I go through the migration guides, fix what is broken, check the regressions and roll it out. Thanks to this the project is not stuck on an old version of the library.

**4. I am the stable part of the team.** I have been on the same product for **4 years**, and during that time the team changed almost completely. I became one of the people who keep the knowledge about the product — I onboard new developers and explain the architecture and the business logic to them, so the team does not lose speed when someone leaves.

**5. I built applications from scratch.** On two earlier projects I set up the project structure myself and grew it into a working product — not only implemented tickets inside an existing codebase.

**6. Outside of work I built and published a PWA application** for interview preparation — from the idea to the production deploy, alone.

## 🇷🇺 Перевод

Могу привести несколько примеров.

**1. Я владею фичей grid presets.** В нашем FinTech-портале пользователи работают с огромными таблицами, и пресеты позволяют сохранить свою конфигурацию — колонки, фильтры, сортировку — и расшарить её коллегам. Я **основной разработчик** этой фичи: большую часть построил сам и уже несколько лет поддерживаю и развиваю. Если там что-то не так — идут ко мне. Это одна из самых сложных частей приложения, и она полностью на мне.

**2. Отвечаю за библиотеку общих компонентов.** Создаю и поддерживаю компоненты, которые переиспользует вся команда. Это значит думать не про один экран, а про API компонента: как им будут пользоваться другие разработчики, что им понадобится через полгода и как не сломать их код, когда я что-то меняю.

**3. Делаю мажорные апгрейды KendoUI.** Это задача, которую никто не хочет брать. Мажорная версия — это breaking changes по всему приложению, и сделать надо, не сломав продакшен. Я прохожу migration guides, чиню сломанное, проверяю регрессии и выкатываю. Благодаря этому проект не застрял на старой версии библиотеки.

**4. Я — стабильная часть команды.** Работаю над одним продуктом **4 года**, за это время команда сменилась почти полностью. Я стал одним из тех, кто держит знание о продукте: онборжу новых разработчиков, объясняю архитектуру и бизнес-логику, поэтому команда не теряет скорость, когда кто-то уходит.

**5. Поднимал приложения с нуля.** На двух прошлых проектах сам ставил структуру проекта и вырастил её в работающий продукт — а не только делал тикеты внутри готовой кодовой базы.

**6. Вне работы сделал и задеплоил PWA-приложение** для подготовки к собеседованиям — от идеи до продакшена, в одиночку.

## 💡 Как отвечать

- **«У меня нет достижений» — неправда, и это видно прямо по твоему резюме.** Все шесть пунктов выше взяты оттуда, я ничего не выдумал. Ты просто читаешь свои строчки как «обязанности», а это **зоны ответственности, которые тебе доверили** — а это и есть достижения.
- **Самое сильное — пункты 1–3.** «The main developer supporting the grid preset feature» в резюме звучит как рутина. Вслух это звучит как: *«это одна из самых сложных частей приложения, и она полностью на мне»*. Одна и та же правда, разный вес.
- **KendoUI-апгрейды не пропускай.** В резюме это одна строчка, а на самом деле это редкий и очень ценный навык: миграция большой системы без простоя. Многие senior-разработчики этого не делали ни разу.
- Формат каждого достижения: **проблема → что сделал я → результат**. Цифры сильно усиливают, даже приблизительные.
- Говори **«I did»**, а не «we did»: HR должен понять именно твой вклад.
- Достаточно **2–3** примеров на ответ. Бери 1 (grid presets) + 3 (KendoUI) + 4 (4 года и онбординг) — это самая сильная тройка.
- Не говори «я закрыл 200 тикетов»: количество — не достижение.

## 📊 Какие цифры стоит вспомнить заранее

Ответ станет вдвое сильнее, если подставишь конкретику. Вспомни и запиши:

- Со скольких до скольких версий поднимал **KendoUI**? (например, «with 14 to 18»)
- Сколько примерно **компонентов** в вашей shared-библиотеке?
- Сколько **разработчиков** в команде пользуются твоими компонентами?
- Сколько людей ты **заонбордил** за 4 года?
- Сколько примерно **пользователей** у портала?

## 🗣 Полезные фразы

- *The problem was that…* — Проблема была в том, что…
- *What I did was…* — Что я сделал — …
- *As a result, we reduced X from … to …* — В результате мы сократили X с … до …
- *I am proud of…* — Я горжусь…`,
      en: `## 🇬🇧 English answer

I can give a few examples.

**1. I own the grid preset feature.** In our FinTech portal the users work with huge data grids, and presets let them save their own configuration — columns, filters, sorting — and share it with colleagues. I am the **main developer** of this feature: I built a large part of it and I have been supporting and extending it for years. When something is wrong there, people come to me. It is one of the most complex parts of the application, and it is fully on me.

**2. I am responsible for the shared component library.** I create and maintain the components that the whole team reuses. This means I have to think not about one screen, but about the API of a component: how other developers will use it, what they will need in six months, and how not to break their code when I change something.

**3. I do the KendoUI major upgrades.** This is the task nobody wants. A major version means breaking changes across the entire application, and it has to be done without breaking production. I go through the migration guides, fix what is broken, check the regressions and roll it out. Thanks to this the project is not stuck on an old version of the library.

**4. I am the stable part of the team.** I have been on the same product for **4 years**, and during that time the team changed almost completely. I became one of the people who keep the knowledge about the product — I onboard new developers and explain the architecture and the business logic to them, so the team does not lose speed when someone leaves.

**5. I built applications from scratch.** On two earlier projects I set up the project structure myself and grew it into a working product — not only implemented tickets inside an existing codebase.

**6. Outside of work I built and published a PWA application** for interview preparation — from the idea to the production deploy, alone.

## 🇷🇺 Russian version

**1.** **Владею фичей grid presets** — сохранение и шаринг конфигураций больших таблиц. Основной разработчик, одна из самых сложных частей приложения, полностью на мне.

**2.** **Отвечаю за библиотеку общих компонентов** — думаю про API компонента для всей команды, а не про один экран.

**3.** **Делаю мажорные апгрейды KendoUI** — breaking changes по всему приложению без поломки продакшена. Задача, которую никто не хочет брать.

**4.** **4 года на одном продукте**: команда сменилась почти полностью, я держу знание о продукте и онборжу новых людей.

**5.** **Поднимал приложения с нуля** на двух прошлых проектах.

**6.** Вне работы сделал и задеплоил PWA для подготовки к собеседованиям — от идеи до прода.

## 💡 How to answer

- **"I have no achievements" is not true — it is visible right in your own CV.** All six points above come straight from it, nothing invented. You read your own lines as "duties", but they are **areas of responsibility that were trusted to you** — and that is exactly what an achievement is.
- **Points 1–3 are the strongest.** "The main developer supporting the grid preset feature" reads like routine on paper. Out loud it becomes: *"it is one of the most complex parts of the application, and it is fully on me."* Same truth, different weight.
- **Never skip the KendoUI upgrades.** One line in the CV, but in reality it is a rare and valuable skill: migrating a large system with no downtime. Many senior developers have never done it once.
- Shape of each story: **problem → what I did → result**. Numbers make it much stronger, even approximate ones.
- Say **"I did"**, not "we did" — the interviewer needs your personal contribution.
- **2–3** examples per answer is enough. Take 1 (grid presets) + 3 (KendoUI) + 4 (4 years and onboarding) — that is the strongest trio.
- An achievement is not "I closed 200 tickets" — volume is not an achievement.

## 📊 Numbers worth recalling in advance

The answer gets twice as strong with concrete numbers. Write these down before the interview:

- From which KendoUI version to which one did you migrate? ("from 14 to 18")
- Roughly how many components are in your shared library?
- How many developers use your components?
- How many people have you onboarded in 4 years?
- Roughly how many users does the portal have?

## 🗣 Useful phrases

- *The problem was that…*
- *What I did was…*
- *As a result, we reduced X from … to …*
- *I am proud of…*`
    }
  },

  {
    id: 'hr-004',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['hobbies', 'small-talk', 'personality'],
    question: {
      ru: 'Расскажите о ваших хобби. / Tell me about your hobbies.',
      en: 'Tell me about your hobbies. / Расскажите о ваших хобби.'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I have a few hobbies.

The main one is **tennis** — I play regularly. It helps me to switch off from the screen and to keep myself in good shape.

I also love **travelling**. I try to see a new country every year, and when I have a chance I go **surfing** — for me it is the best way to reset my head completely.

And one more, a bit unusual: I play **poker**. Not for the money — I like it because it is a game about probability and about making decisions when you do not have the full information. Honestly, it is not so far from what we do in development.

And I have a small professional hobby too — **pet projects**. Recently I built a PWA application for interview preparation. For me it is a safe place to try new technologies without any production risk.

## 🇷🇺 Перевод

У меня несколько хобби.

Главное — **теннис**, играю регулярно. Помогает переключиться от экрана и держать себя в форме.

Ещё люблю **путешествия**. Стараюсь каждый год увидеть новую страну, и при возможности катаюсь на **сёрфинге** — для меня это лучший способ полностью перезагрузить голову.

И ещё одно, чуть необычное: играю в **покер**. Не ради денег — мне нравится, что это игра про вероятности и про принятие решений, когда у тебя нет полной информации. Честно говоря, это не так далеко от того, чем мы занимаемся в разработке.

И есть небольшое профессиональное хобби — **пет-проекты**. Недавно собрал PWA-приложение для подготовки к собеседованиям. Для меня это безопасное место, где можно попробовать новые технологии без риска для продакшена.

## 💡 Как отвечать

- **30–60 секунд**, не больше. Это вопрос «на расслабиться» и на проверку живой речи.
- **2–3** хобби достаточно. У тебя удачный набор: спорт (теннис) → дисциплина, путешествия/сёрфинг → открытость, покер → аналитическое мышление, пет-проекты → любовь к профессии.
- **Про покер** обязательно добавляй фразу *«not for the money — it is a game about probability and decisions»*. Тогда даже консервативный HR слышит «аналитик», а не «азартный игрок». Если чувствуешь, что собеседник напрягся, — просто не развивай тему дальше.
- Не отвечайте односложно *«I have no hobbies, I just work»* — это плохой сигнал про выгорание.
- Хобби — лучший момент показать живой английский: терминов нет, говорите свободно и не бойтесь простых слов.

## 🗣 Полезные фразы

- *In my free time I usually…* — В свободное время я обычно…
- *I am really into…* — Я очень увлекаюсь…
- *It helps me to switch off / to reset my head.* — Это помогает мне переключиться / перезагрузить голову.
- *I have been playing tennis for [N] years.* — Я играю в теннис уже [N] лет.
- *It is a game about probability and decision making.* — Это игра про вероятности и принятие решений.`,
      en: `## 🇬🇧 English answer

I have a few hobbies.

The main one is **tennis** — I play regularly. It helps me to switch off from the screen and to keep myself in good shape.

I also love **travelling**. I try to see a new country every year, and when I have a chance I go **surfing** — for me it is the best way to reset my head completely.

And one more, a bit unusual: I play **poker**. Not for the money — I like it because it is a game about probability and about making decisions when you do not have the full information. Honestly, it is not so far from what we do in development.

And I have a small professional hobby too — **pet projects**. Recently I built a PWA application for interview preparation. For me it is a safe place to try new technologies without any production risk.

## 🇷🇺 Russian version

Главное хобби — **теннис**, играю регулярно. Люблю **путешествия**, при возможности катаюсь на **сёрфинге**. Играю в **покер** — не ради денег, а потому что это игра про вероятности и решения в условиях неполной информации. И есть профессиональное хобби — **пет-проекты**: недавно собрал PWA для подготовки к интервью.

## 💡 How to answer

- **30–60 seconds**, no more. This is a warm-up question and a check of your live speech.
- **2–3** hobbies is enough. Your set works well: sport (tennis) → discipline, travel/surfing → openness, poker → analytical thinking, pet projects → love for the craft.
- **With poker, always add** *"not for the money — it is a game about probability and decisions"*. Then even a conservative interviewer hears "analyst", not "gambler". If they look uncomfortable, just move on.
- Never answer *"I have no hobbies, I just work"* — it reads as a burnout signal.
- Hobbies are the easiest place to show your English: no terminology, just speak.

## 🗣 Useful phrases

- *In my free time I usually…*
- *I am really into…*
- *It helps me to switch off / to reset my head.*
- *I have been playing tennis for [N] years.*
- *It is a game about probability and decision making.*`
    }
  },

  {
    id: 'hr-005',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['unique', 'value', 'why-you'],
    question: {
      ru: 'Что делает вас уникальным? Почему мы должны нанять именно вас? / What makes you unique? Why should we hire you specifically?',
      en: 'What makes you unique? Why should we hire you specifically? / Что делает вас уникальным? Почему мы должны нанять именно вас?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I would not say that I am unique, but I have a combination that is not very common.

**First, I build for other developers, not only for users.** For 4 years I have been maintaining the shared component library and the grid preset feature on our portal. When you write a component that the whole team reuses, you stop thinking about one screen and start thinking about an **API**: how people will use it, what they will need in six months, and how not to break their code tomorrow. Not every frontend developer had to think that way.

**Second, I do the work that nobody volunteers for.** I am the one who does the **KendoUI major upgrades** — breaking changes across the whole application, without breaking production. It is not a fun task, but somebody has to keep the project from getting stuck on an old version, and on my project that person is me.

**Third, I have seen both ends.** I built two applications from scratch, and I have also supported a big system with a lot of history for years. I know how to start a project, and I know how to live with one that was started by somebody else.

**And I am not locked into one framework.** My depth is in Angular, but I also worked commercially with React, so I am not lost outside my main stack.

Plus the simple things: I do not just close tickets — I ask **why** we are doing the task, and quite often I suggest a simpler solution. I learn fast, I am easy to work with, and you will not need to push me.

## 🇷🇺 Перевод

Не сказал бы, что я уникальный, но у меня есть сочетание, которое встречается нечасто.

**Первое: я пишу для других разработчиков, а не только для пользователей.** 4 года поддерживаю библиотеку общих компонентов и фичу grid presets на нашем портале. Когда пишешь компонент, который переиспользует вся команда, перестаёшь думать про один экран и начинаешь думать про **API**: как им будут пользоваться, что понадобится через полгода и как не сломать чужой код завтра. Не каждому фронтендеру приходилось так думать.

**Второе: я делаю работу, которую никто не берёт добровольно.** Мажорные **апгрейды KendoUI** — это я. Breaking changes по всему приложению, и всё это без поломки продакшена. Задача невесёлая, но кто-то должен не давать проекту застрять на старой версии, и на моём проекте этот кто-то — я.

**Третье: я видел оба конца.** Два приложения поднимал с нуля и при этом несколько лет поддерживаю большую систему с длинной историей. Я знаю, как начинать проект, и знаю, как жить с проектом, который начал кто-то другой.

**И я не заперт в одном фреймворке.** Глубина у меня в Angular, но есть и коммерческий опыт с React — вне основного стека я не теряюсь.

Плюс простые вещи: я не просто закрываю тикеты — спрашиваю, **зачем** мы делаем задачу, и часто предлагаю решение проще. Быстро учусь, со мной легко работать, и подталкивать меня не нужно.

## 💡 Как отвечать

- Не сравнивай себя с другими кандидатами («я лучше всех») — ты их не знаешь. Говори про **своё сочетание** навыков.
- **Твоя главная карта — «я пишу для разработчиков, а не только для пользователей».** Shared-компоненты и grid presets — это мышление уровня библиотеки, а не уровня экрана. Именно это отличает Senior.
- **Вторая карта — KendoUI-апгрейды.** Это редкий опыт: миграция большой системы без простоя. Формулировка *«the work that nobody volunteers for»* работает очень хорошо — она показывает и навык, и характер сразу.
- Назови **2–3 конкретных факта**, а не набор прилагательных.
- Свяжи ответ с их вакансией: если у них legacy и миграции — дави на KendoUI; если дизайн-система — дави на shared-компоненты; если новый продукт — дави на «поднимал с нуля».

## 🗣 Полезные фразы

- *What makes me different is the combination of…* — Меня отличает сочетание…
- *I look at a feature from two sides.* — Я смотрю на фичу с двух сторон.
- *I do not just close tickets — I ask why.* — Я не просто закрываю тикеты, я спрашиваю «зачем».
- *You will not need to push me.* — Меня не нужно подталкивать.`,
      en: `## 🇬🇧 English answer

I would not say that I am unique, but I have a combination that is not very common.

**First, I build for other developers, not only for users.** For 4 years I have been maintaining the shared component library and the grid preset feature on our portal. When you write a component that the whole team reuses, you stop thinking about one screen and start thinking about an **API**: how people will use it, what they will need in six months, and how not to break their code tomorrow. Not every frontend developer had to think that way.

**Second, I do the work that nobody volunteers for.** I am the one who does the **KendoUI major upgrades** — breaking changes across the whole application, without breaking production. It is not a fun task, but somebody has to keep the project from getting stuck on an old version, and on my project that person is me.

**Third, I have seen both ends.** I built two applications from scratch, and I have also supported a big system with a lot of history for years. I know how to start a project, and I know how to live with one that was started by somebody else.

**And I am not locked into one framework.** My depth is in Angular, but I also worked commercially with React, so I am not lost outside my main stack.

Plus the simple things: I do not just close tickets — I ask **why** we are doing the task, and quite often I suggest a simpler solution. I learn fast, I am easy to work with, and you will not need to push me.

## 🇷🇺 Russian version

У меня есть сочетание, которое встречается нечасто. **Первое:** пишу для других разработчиков, а не только для пользователей — 4 года на shared-компонентах и grid presets, это мышление про API, а не про экран. **Второе:** делаю работу, которую никто не берёт, — мажорные апгрейды KendoUI без поломки прода. **Третье:** видел оба конца — два приложения с нуля и многолетняя поддержка большой системы. **И:** не заперт в одном фреймворке — глубина в Angular, но есть коммерческий React.

## 💡 How to answer

- Do not compare yourself with other candidates — you have not met them. Talk about **your own combination** of skills.
- **Your main card is "I build for developers, not only for users".** Shared components and grid presets are library-level thinking, not screen-level thinking. That is what reads as Senior.
- **Your second card is the KendoUI upgrades.** Migrating a large system with no downtime is rare experience. The phrase *"the work that nobody volunteers for"* lands very well — it shows a skill and a character trait at the same time.
- Give **2–3 concrete facts**, not a list of adjectives.
- Connect it to their job description: legacy and migrations → push KendoUI; design system → push shared components; a new product → push "I built two from scratch".

## 🗣 Useful phrases

- *What makes me different is the combination of…*
- *I look at a feature from two sides.*
- *I do not just close tickets — I ask why.*
- *You will not need to push me.*`
    }
  },

  {
    id: 'hr-006',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['conflict', 'soft-skills', 'teamwork'],
    question: {
      ru: 'Как бы вы решили конфликт с коллегой или менеджером? / How would you deal with a conflict with a co-worker or manager?',
      en: 'How would you deal with a conflict with a co-worker/manager? / Как бы вы решили конфликт с коллегой по работе или менеджером?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

First of all, I try not to take it personally. For me a conflict at work is usually a **difference of opinions**, not a fight.

My steps are simple:

1. I talk to the person **directly and in private** — not in a common chat and not in front of the whole team.
2. I ask about their arguments first and try to understand the reason. Very often it is just a misunderstanding.
3. We look at **facts** — requirements, documentation, measurements — instead of emotions.
4. If we still do not agree, we bring it to the team lead or the PM, and I accept the final decision and support it. I do not continue the argument after it is closed.

For example, on code review a colleague and I did not agree about the approach. We had a short call, I explained my reasons, he explained his, and in the end we took his solution because it was simpler for the team. It was absolutely fine for me — the goal is a good product, not to win.

## 🇷🇺 Перевод

Прежде всего стараюсь не воспринимать это лично. Для меня конфликт на работе — это обычно **разница во мнениях**, а не ссора.

Мои шаги простые:

1. Говорю с человеком **напрямую и один на один** — не в общем чате и не при всей команде.
2. Сначала спрашиваю его аргументы и стараюсь понять причину. Очень часто это просто недопонимание.
3. Опираемся на **факты** — требования, документацию, замеры, — а не на эмоции.
4. Если всё равно не договорились, выносим к тимлиду или PM, и я принимаю финальное решение и поддерживаю его. После закрытия вопроса спор не продолжаю.

Например, на код-ревью мы с коллегой не сошлись по подходу. Созвонились на десять минут, я объяснил свои аргументы, он — свои, в итоге взяли его решение, потому что оно было проще для команды. Для меня это нормально: цель — хороший продукт, а не победа в споре.

## 💡 Как отвечать

- Главный сигнал, который ждёт HR: вы **не эскалируете эмоции** и умеете принимать чужое решение.
- Дайте **алгоритм** (1-2-3-4) плюс **один короткий реальный пример**. Пример без алгоритма звучит случайно, алгоритм без примера — как теория.
- Никогда не говорите *«У меня не бывает конфликтов»* — это не верят, звучит как избегание.
- В примере выбирайте конфликт **рабочий** (подход, оценка, приоритет), а не личный.

## 🗣 Полезные фразы

- *I try not to take it personally.* — Стараюсь не принимать на свой счёт.
- *I prefer to talk one-on-one first.* — Сначала предпочитаю поговорить один на один.
- *Let us look at the facts.* — Давайте посмотрим на факты.
- *We escalated it to the team lead and I supported the final decision.* — Мы вынесли вопрос на тимлида, и я поддержал финальное решение.`,
      en: `## 🇬🇧 English answer

First of all, I try not to take it personally. For me a conflict at work is usually a **difference of opinions**, not a fight.

My steps are simple:

1. I talk to the person **directly and in private** — not in a common chat and not in front of the whole team.
2. I ask about their arguments first and try to understand the reason. Very often it is just a misunderstanding.
3. We look at **facts** — requirements, documentation, measurements — instead of emotions.
4. If we still do not agree, we bring it to the team lead or the PM, and I accept the final decision and support it. I do not continue the argument after it is closed.

For example, on code review a colleague and I did not agree about the approach. We had a short call, I explained my reasons, he explained his, and in the end we took his solution because it was simpler for the team. It was absolutely fine for me — the goal is a good product, not to win.

## 🇷🇺 Russian version

Стараюсь не воспринимать лично: конфликт на работе — это разница во мнениях. Шаги: поговорить напрямую и один на один → сначала выслушать аргументы → опираться на факты, а не на эмоции → если не договорились, вынести к тимлиду и принять финальное решение. Пример: на код-ревью не сошлись по подходу, созвонились, в итоге взяли решение коллеги, потому что оно проще для команды.

## 💡 How to answer

- The signal the interviewer looks for: you **do not escalate emotions** and you can accept someone else's decision.
- Give an **algorithm** (1-2-3-4) plus **one short real example**. An example alone sounds random; an algorithm alone sounds theoretical.
- Never say *"I never have conflicts"* — it reads as avoidance and nobody believes it.
- Pick a **work** conflict (approach, estimate, priority), not a personal one.

## 🗣 Useful phrases

- *I try not to take it personally.*
- *I prefer to talk one-on-one first.*
- *Let us look at the facts.*
- *We escalated it to the team lead and I supported the final decision.*`
    }
  },

  {
    id: 'hr-007',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['why-company', 'motivation', 'research'],
    question: {
      ru: 'Почему вас заинтересовали наша позиция и компания? / Why are you interested in our position and company?',
      en: 'Why are you interested in our position and company? / Почему вы заинтересованы нашей позицией и компанией?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I read about your company and the project, and there are three reasons for me.

**First, the stack.** You use **Angular**, **TypeScript** and **[что ещё есть в вакансии]** — this is exactly what I work with every day, so I can be useful from the first weeks and at the same time learn the parts I have less experience with.

**Second, the product.** It looks like a **long-term product**, not a short outsourcing task. I like to see the result of my work and to develop the same product for a long time, instead of jumping between small projects. And the domain — **[домен: fintech / healthcare / e-commerce]** — is interesting to me.

**Third, the team and processes.** From the job description I see that you have code review, tests and clear engineering culture. For me this is important, because I grow when I work with strong engineers who give honest feedback.

## 🇷🇺 Перевод

Я почитал про компанию и проект, и для меня есть три причины.

**Первая — стек.** У вас **Angular**, **TypeScript** и **[что ещё в вакансии]** — это ровно то, с чем я работаю каждый день, поэтому я смогу приносить пользу с первых недель и параллельно подтянуть то, где опыта меньше.

**Вторая — продукт и домен.** Это похоже на **долгосрочный продукт**, а не короткий аутсорс-таск. Мне нравится видеть результат работы и долго развивать один продукт — я 4 года на одном портале, и мне это подходит. **[Если FinTech:]** плюс я уже больше пяти лет работаю в FinTech, поэтому домен мне знаком: сложные таблицы, права доступа, требования к точности и безопасности данных. **[Если другой домен:]** и сам домен — **[домен]** — мне интересен, хочется попробовать что-то за пределами FinTech.

**Третья — команда и процессы.** Из описания вакансии видно, что у вас есть код-ревью, тесты и нормальная инженерная культура. Для меня это важно: я расту, когда работаю с сильными инженерами, которые дают честную обратную связь.

## 💡 Как отвечать

- **Обязательно погуглите компанию перед интервью**: сайт, продукт, домен, размер, отзывы. Ответ «ну, у вас интересная вакансия» — провал.
- Назовите **конкретику из вакансии** (технологии, домен, тип продукта). Это доказывает, что вы читали описание.
- Свяжите их потребность и ваш опыт: *«you need X — I have been doing X for [N] years»*.
- Не говорите про зарплату и «вы первые, кто ответил» — даже если это правда.

## 🗣 Полезные фразы

- *I did some research about your company…* — Я почитал про вашу компанию…
- *What attracted me the most is…* — Больше всего меня привлекло…
- *Your stack matches my experience.* — Ваш стек совпадает с моим опытом.
- *I can be useful from the first weeks.* — Я смогу приносить пользу с первых недель.`,
      en: `## 🇬🇧 English answer

I read about your company and the project, and there are three reasons for me.

**First, the stack.** You use **Angular**, **TypeScript** and **[whatever else the vacancy lists]** — this is exactly what I work with every day, so I can be useful from the first weeks and at the same time learn the parts I have less experience with.

**Second, the product and the domain.** It looks like a **long-term product**, not a short outsourcing task. I like to see the result of my work and to develop the same product for a long time — I have been on one portal for 4 years and it suits me. **[If FinTech:]** on top of that I have more than five years in FinTech, so the domain is familiar: complex data grids, access rights, strict requirements for data accuracy and security. **[If another domain:]** and the domain itself — **[domain]** — is interesting to me; I would like to try something outside FinTech.

**Third, the team and processes.** From the job description I see that you have code review, tests and a clear engineering culture. For me this is important, because I grow when I work with strong engineers who give honest feedback.

## 🇷🇺 Russian version

Три причины: **стек** (Angular, TypeScript — ровно то, с чем работаю каждый день, буду полезен с первых недель), **продукт** (долгосрочный продукт, а не короткий аутсорс; интересен домен) и **команда** (код-ревью, тесты, инженерная культура — я расту рядом с сильными инженерами).

## 💡 How to answer

- **Research the company before the interview**: site, product, domain, size, reviews. "Well, your vacancy looks interesting" is a fail.
- Quote **specifics from the job description** (technologies, domain, product type). It proves you actually read it.
- Link their need to your experience: *"you need X — I have been doing X for [N] years"*.
- Do not mention salary here, and never say "you were the first to reply" — even if it is true.

## 🗣 Useful phrases

- *I did some research about your company…*
- *What attracted me the most is…*
- *Your stack matches my experience.*
- *I can be useful from the first weeks.*`
    }
  },

  {
    id: 'hr-008',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['motivation', 'drive', 'values'],
    question: {
      ru: 'Какова ваша мотивация в работе? Что побуждает вас работать лучше и усерднее? / What is your motivation at work?',
      en: 'What is your motivation at work? What motivates you to work harder and better? / Какова ваша мотивация в работе?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

A few things motivate me.

- **Interesting tasks.** I like problems where I have to think and choose between options, not repeat the same CRUD screen ten times.
- **Real result.** It is important for me that real users work with what I build. When I see that a feature helps people or saves their time, I want to do more.
- **Growth.** New technologies, honest code review, feedback from stronger engineers. If I feel that I am better than half a year ago, I am happy.
- **A good team.** When people help each other and share knowledge, I want to give the same back.

And one practical thing: **clear goals**. When I understand *why* we are doing the task and what the deadline is, I work much better and faster.

## 🇷🇺 Перевод

Меня мотивируют несколько вещей.

- **Интересные задачи.** Люблю задачи, где надо думать и выбирать между вариантами, а не делать десятый одинаковый CRUD-экран.
- **Реальный результат.** Важно, чтобы тем, что я делаю, пользовались живые люди. Когда вижу, что фича помогает и экономит время, хочется делать больше.
- **Рост.** Новые технологии, честное код-ревью, обратная связь от более сильных инженеров. Если чувствую, что стал лучше, чем полгода назад, — я доволен.
- **Хорошая команда.** Когда люди помогают друг другу и делятся знаниями, хочется отдавать столько же.

И один практичный момент: **понятные цели**. Когда я понимаю, *зачем* мы делаем задачу и какой дедлайн, я работаю заметно лучше и быстрее.

## 💡 Как отвечать

- Деньги — **не первый** пункт. Про зарплату есть отдельный вопрос; здесь HR проверяет, что вас держит на проекте, кроме оплаты.
- Назовите **3–4** мотиватора и хотя бы один подкрепите примером.
- Хорошо звучит связка «рост + результат + команда». Плохо: «мне всё равно, что делать, лишь бы платили».
- Можно аккуратно добавить, что вас демотивирует (хаос в требованиях) — это выглядит честно и зрело.

## 🗣 Полезные фразы

- *What motivates me the most is…* — Больше всего меня мотивирует…
- *I like tasks where I have to think.* — Люблю задачи, где нужно думать.
- *It is important for me that real users…* — Для меня важно, чтобы реальные пользователи…
- *When I understand why we do it, I work better.* — Когда я понимаю, зачем мы это делаем, я работаю лучше.`,
      en: `## 🇬🇧 English answer

A few things motivate me.

- **Interesting tasks.** I like problems where I have to think and choose between options, not repeat the same CRUD screen ten times.
- **Real result.** It is important for me that real users work with what I build. When I see that a feature helps people or saves their time, I want to do more.
- **Growth.** New technologies, honest code review, feedback from stronger engineers. If I feel that I am better than half a year ago, I am happy.
- **A good team.** When people help each other and share knowledge, I want to give the same back.

And one practical thing: **clear goals**. When I understand *why* we are doing the task and what the deadline is, I work much better and faster.

## 🇷🇺 Russian version

Мотивируют: **интересные задачи** (где надо думать, а не десятый одинаковый CRUD), **реальный результат** (тем, что делаю, пользуются живые люди), **рост** (новые технологии, честное ревью, фидбэк от сильных инженеров), **хорошая команда**. И **понятные цели**: когда понимаю, зачем задача, работаю заметно лучше.

## 💡 How to answer

- Money is **not the first** item. Salary has its own question; here the interviewer checks what keeps you on a project besides pay.
- Name **3–4** motivators and back at least one with an example.
- "Growth + impact + team" is a strong combination. "I don't care what I do as long as I get paid" is not.
- You may carefully add what demotivates you (chaotic requirements) — it sounds honest and mature.

## 🗣 Useful phrases

- *What motivates me the most is…*
- *I like tasks where I have to think.*
- *It is important for me that real users…*
- *When I understand why we do it, I work better.*`
    }
  },

  {
    id: 'hr-009',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['expectations', 'new-job', 'culture-fit'],
    question: {
      ru: 'Каковы ваши ожидания от нового места работы? / What are your expectations from the new place of work?',
      en: 'What are your expectations from the new place of work? / Каковы ваши ожидания от нового места работы?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

From a new place I expect a few things.

- **An interesting project with a healthy codebase.** I do not expect a perfect code, but I would like a project where refactoring is possible and not forbidden.
- **A strong team and real code review.** I want colleagues I can learn from, and I am also happy to review and to share what I know.
- **Clear processes and clear tasks.** When requirements are written and priorities are visible, I spend my energy on development, not on guessing what the client wanted.
- **Room to grow.** New technologies, more responsibility, maybe mentoring later.
- **A normal balance and respect in the team.** I am fine with a hot period before a release, but I would like it to be an exception, not the standard.

## 🇷🇺 Перевод

От нового места я жду нескольких вещей.

- **Интересный проект со здоровой кодовой базой.** Я не жду идеального кода, но хочу проект, где рефакторинг возможен, а не запрещён.
- **Сильная команда и настоящее код-ревью.** Хочу коллег, у которых можно учиться, и сам с удовольствием ревьюю и делюсь знаниями.
- **Понятные процессы и понятные задачи.** Когда требования записаны, а приоритеты видны, я трачу силы на разработку, а не на угадывание, чего хотел клиент.
- **Пространство для роста.** Новые технологии, больше ответственности, возможно, менторство в будущем.
- **Нормальный баланс и уважение в команде.** Я спокойно отношусь к горячему периоду перед релизом, но хочу, чтобы это было исключением, а не нормой.

## 💡 Как отвечать

- Ожидания должны быть **про работу**, а не только про плюшки. Про зарплату, отпуск и удалёнку спрашивайте отдельно, в конце интервью.
- **3–5** пунктов. Формулируйте позитивно: не «чтобы не было переработок», а «хочу предсказуемый график».
- Хорошо добавить, что вы даёте взамен: *«I am also ready to review and to share knowledge»*.
- Этот вопрос — зеркало вопроса «почему уходите». Ответы не должны противоречить друг другу.

## 🗣 Полезные фразы

- *What I expect from a new project is…* — От нового проекта я жду…
- *I would like to work with a strong team.* — Хочу работать с сильной командой.
- *Clear requirements are important for me.* — Для меня важны понятные требования.
- *I am also ready to give the same back.* — Я и сам готов отдавать столько же.`,
      en: `## 🇬🇧 English answer

From a new place I expect a few things.

- **An interesting project with a healthy codebase.** I do not expect perfect code, but I would like a project where refactoring is possible and not forbidden.
- **A strong team and real code review.** I want colleagues I can learn from, and I am also happy to review and to share what I know.
- **Clear processes and clear tasks.** When requirements are written and priorities are visible, I spend my energy on development, not on guessing what the client wanted.
- **Room to grow.** New technologies, more responsibility, maybe mentoring later.
- **A normal balance and respect in the team.** I am fine with a hot period before a release, but I would like it to be an exception, not the standard.

## 🇷🇺 Russian version

Жду: **интересный проект со здоровой кодовой базой**, **сильную команду и настоящее код-ревью**, **понятные процессы и задачи**, **пространство для роста** и **нормальный баланс и уважение в команде**.

## 💡 How to answer

- Expectations should be **about the work**, not only about perks. Ask about salary, vacation and remote separately, at the end of the interview.
- Give **3–5** points, phrased positively: not "no overtime" but "a predictable schedule".
- Add what you give back: *"I am also ready to review and to share knowledge."*
- This question mirrors "why are you leaving" — the two answers must not contradict each other.

## 🗣 Useful phrases

- *What I expect from a new project is…*
- *I would like to work with a strong team.*
- *Clear requirements are important for me.*
- *I am also ready to give the same back.*`
    }
  },

  {
    id: 'hr-010',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['why-leaving', 'previous-job', 'red-flags'],
    question: {
      ru: 'Почему вы рассматриваете новое место работы? Возможно, вам что-то не понравилось на прежнем месте? / Why are you considering a new place of work?',
      en: "Why are you considering a new place of work? Perhaps you didn't like something at the previous place? / Почему вы рассматриваете новое место работы?"
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I am thankful to my current company — I have been there for **4 years**, I learned a lot and I have no conflicts with anyone.

But right now I feel that I **stopped growing** there. The tasks became repetitive: I already know how to do almost all of them, so there is not much new for me anymore. The team has also changed a lot over the last period — most of the people I started with are not on the project now.

So I am looking for a place where I can grow again: a modern stack, more responsibility and tasks that are actually interesting to solve.

It is not that something is bad there — I am simply moving **towards** what I want next.

## 🇷🇺 Перевод

Я благодарен текущей компании — я там **4 года**, многому научился, ни с кем нет конфликтов.

Но сейчас я чувствую, что **перестал расти**. Задачи стали однотипными: я уже знаю, как сделать почти любую из них, нового для меня немного. Команда за последнее время тоже сильно поменялась — большинства людей, с которыми я начинал, на проекте уже нет.

Поэтому ищу место, где смогу снова расти: современный стек, больше ответственности и задачи, которые действительно интересно решать.

Дело не в том, что там что-то плохо — я просто иду **к** тому, чего хочу дальше.

## 💡 Как отвечать

- **Никогда не критикуйте** текущего работодателя, менеджера или коллег. Даже одна фраза «там был ужасный менеджер» — большой красный флаг.
- **Про смену команды говорите фактом, без оценки.** «Most of the people I started with are not on the project now» — это факт. «Пришли слабые люди / стало некомфортно» — это жалоба, так нельзя.
- **«Задачи неинтересные» переводите в «я перестал расти».** Первое звучит как «мне лень», второе — как «я хочу развиваться». Смысл тот же, эффект противоположный.
- Говорите **«к чему я иду»**, а не «от чего я бегу». Мотивация «towards» звучит зрело, «away from» — как жалоба.
- Держитесь в **2–4 предложениях**. Долгое объяснение выглядит как оправдание.
- **4 года на месте — это ваш козырь здесь.** Скажите срок вслух: он доказывает, что вы уходите не от скуки через полгода, а после долгой и честной работы.
- Если причина всё же в деньгах — формулируйте нейтрально: *«I am also looking for a package that matches my current level.»*

## 🗣 Полезные фразы

- *I am thankful for my current company, I learned a lot there.* — Я благодарен текущей компании, многому там научился.
- *The project is mostly in support mode now.* — Сейчас проект в основном на поддержке.
- *I am looking for new challenges.* — Ищу новые вызовы.
- *It is more about where I am going than what I am leaving.* — Дело скорее в том, куда я иду, чем в том, что я оставляю.`,
      en: `## 🇬🇧 English answer

I am thankful to my current company — I have been there for **4 years**, I learned a lot and I have no conflicts with anyone.

But right now I feel that I **stopped growing** there. The tasks became repetitive: I already know how to do almost all of them, so there is not much new for me anymore. The team has also changed a lot over the last period — most of the people I started with are not on the project now.

So I am looking for a place where I can grow again: a modern stack, more responsibility and tasks that are actually interesting to solve.

It is not that something is bad there — I am simply moving **towards** what I want next.

## 🇷🇺 Russian version

Благодарен компании — я там 4 года, многому научился, конфликтов нет. Но перестал расти: задачи однотипные, я уже знаю, как сделать почти любую. Команда за последнее время сильно поменялась. Ищу место, где смогу снова расти: современный стек, больше ответственности, интересные задачи. Дело не в том, что там плохо, — я иду **к** тому, чего хочу дальше.

## 💡 How to answer

- **Never criticise** your current employer, manager or colleagues. One sentence like "the manager was terrible" is a big red flag.
- **State the team change as a fact, without judgement.** "Most of the people I started with are not on the project now" is a fact. "Weak people joined / it became uncomfortable" is a complaint — never say that.
- **Translate "boring tasks" into "I stopped growing".** The first sounds like laziness, the second like ambition. Same meaning, opposite effect.
- Talk about **where you are going**, not what you are running from. "Towards" motivation sounds mature; "away from" sounds like complaining.
- Keep it to **2–4 sentences**. A long explanation looks like an excuse.
- **4 years in one place is your trump card here.** Say the number out loud: it proves you are not leaving out of boredom after six months.
- If the real reason is money, phrase it neutrally: *"I am also looking for a package that matches my current level."*

## 🗣 Useful phrases

- *I am thankful for my current company, I learned a lot there.*
- *The project is mostly in support mode now.*
- *I am looking for new challenges.*
- *It is more about where I am going than what I am leaving.*`
    }
  },

  {
    id: 'hr-011',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['cv', 'resume', 'self-presentation'],
    question: {
      ru: 'Какой информации нет в вашем резюме? / What info don’t you have in your CV?',
      en: 'What info don’t you have in your CV? / Какой информации не хватает в резюме?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

My CV is quite short — it is mostly a list of technologies and duties. A few important things are not there.

- **The scale behind the words.** "Supporting the grid preset feature" is one line in my CV, but in reality it is one of the most complex parts of the product and it is fully on me. The same with the KendoUI upgrades — one line, but it means migrating a large application through breaking changes without breaking production.
- **The soft part.** Over 4 years the team changed almost completely, so I onboarded a lot of new developers — explained the architecture, the business logic, reviewed their code. I am comfortable with code review from both sides and I do not take comments personally.
- **The language environment.** My CV just says "English". It does not say that on my current project **everything** is in English — every chat, every call, every document, for 4 years.
- **Pet projects.** I build applications for myself. The last one is a PWA for interview preparation — Angular, Signals, offline mode, deployed to production. It is where I try things I cannot try in production.
- **Constant learning.** I regularly take courses — Angular, RxJS, TypeScript — and I read documentation and articles.

If you want, I can tell you in more detail about any project from my CV — there is only one or two lines per project there.

## 🇷🇺 Перевод

Резюме у меня довольно короткое — это в основном список технологий и обязанностей. Нескольких важных вещей там нет.

- **Масштаб за формулировками.** «Supporting the grid preset feature» — одна строчка в резюме, а на деле это одна из самых сложных частей продукта, и она полностью на мне. То же с апгрейдами KendoUI: одна строчка, а по факту — миграция большого приложения через breaking changes без поломки продакшена.
- **Софтовая часть.** За 4 года команда сменилась почти полностью, так что я заонбордил много новых разработчиков — объяснял архитектуру, бизнес-логику, ревьюил их код. Спокойно отношусь к ревью с обеих сторон, комментарии не воспринимаю лично.
- **Языковая среда.** В резюме просто написано «English». Там не написано, что на текущем проекте **всё** на английском — каждый чат, каждый созвон, каждый документ, и так уже 4 года.
- **Пет-проекты.** Делаю приложения для себя. Последнее — PWA для подготовки к собеседованиям: Angular, Signals, офлайн-режим, задеплоено в прод. Это место, где я пробую то, что нельзя пробовать в продакшене.
- **Постоянное обучение.** Регулярно прохожу курсы — Angular, RxJS, TypeScript — и читаю документацию и статьи.

Если хотите, могу подробнее рассказать про любой проект из резюме — там всего одна-две строки на проект.

## 💡 Как отвечать

- Это **подарок**, а не ловушка: у тебя есть свободная минута, чтобы продать то, что не влезло в резюме.
- **Главный приём здесь — «раскрыть строчку».** У тебя в CV всё написано сухо, языком обязанностей. Этот вопрос — легальный повод сказать вслух, что за этими строчками стоит.
- Не рассказывай то, что и так есть в резюме, — это выглядит как невнимательность к собственному CV.
- Закончи предложением углубиться: это подталкивает интервьюера задать удобный тебе вопрос.

## ⚠️ Что стоит поправить в самом резюме

- **«6 years experienced» — исправь на 8+.** По твоей же истории работы: с сентября 2017 по сегодня почти 9 лет. Ты сам себя недооцениваешь на три года, и это первое, что читает рекрутер.
- **Заголовок «Senior» есть, а в тексте profile — нет.** Добавь в profile «Senior», grid presets и KendoUI-миграции: сейчас самое сильное, что у тебя есть, спрятано в буллетах на первой строчке снизу.
- **«Angular 18» устареет.** Пиши «Angular 18+» или актуальную версию проекта.
- **Нет ни одной цифры.** Добавь хотя бы одну: размер команды, количество компонентов, с какой на какую версию KendoUI мигрировал.
- **Нет пет-проектов.** Добавь строчку с PWA и ссылкой — это бесплатный плюс, особенно с задеплоенным прод-приложением.

## 🗣 Полезные фразы

- *My CV is quite short, so a few things are not there.* — Резюме короткое, поэтому нескольких вещей в нём нет.
- *What is not in my CV is…* — Чего нет в резюме, так это…
- *I am comfortable with code review from both sides.* — Спокойно отношусь к ревью с обеих сторон.
- *I can tell you more about any project if you want.* — Могу рассказать подробнее про любой проект, если хотите.`,
      en: `## 🇬🇧 English answer

My CV is quite short — it is mostly a list of technologies and duties. A few important things are not there.

- **The scale behind the words.** "Supporting the grid preset feature" is one line in my CV, but in reality it is one of the most complex parts of the product and it is fully on me. The same with the KendoUI upgrades — one line, but it means migrating a large application through breaking changes without breaking production.
- **The soft part.** Over 4 years the team changed almost completely, so I onboarded a lot of new developers — explained the architecture, the business logic, reviewed their code. I am comfortable with code review from both sides and I do not take comments personally.
- **The language environment.** My CV just says "English". It does not say that on my current project **everything** is in English — every chat, every call, every document, for 4 years.
- **Pet projects.** I build applications for myself. The last one is a PWA for interview preparation — Angular, Signals, offline mode, deployed to production. It is where I try things I cannot try in production.
- **Constant learning.** I regularly take courses — Angular, RxJS, TypeScript — and I read documentation and articles.

If you want, I can tell you in more detail about any project from my CV — there is only one or two lines per project there.

## 🇷🇺 Russian version

Резюме короткое — это список технологий и обязанностей. Нет: **масштаба за формулировками** (grid presets и KendoUI-миграции — по строчке, а на деле самое сложное в продукте), **софтовой части** (за 4 года заонбордил много новых людей, команда сменилась почти целиком), **языковой среды** (написано «English», но не написано, что всё общение только на английском 4 года), **пет-проектов** (PWA в проде) и **постоянного обучения** (курсы по Angular, RxJS, TypeScript).

## 💡 How to answer

- This is a **gift**, not a trap: you get a free minute to sell what did not fit into the CV.
- **The main move here is "unpack a line".** Your CV is written in dry duty-language. This question is a legal excuse to say out loud what is actually behind those lines.
- Do not repeat what is already in the CV — it looks like you do not know your own resume.
- Finish by offering to go deeper: it nudges the interviewer to ask a question you are ready for.

## ⚠️ Fix these in the CV itself

- **"6 years experienced" → 8+.** Your own employment history starts in September 2017 — that is almost 9 years. You are underselling yourself by three years in the first paragraph a recruiter reads.
- **The header says "Senior", the profile text does not.** Put "Senior", grid presets and the KendoUI migrations into the profile — right now your strongest material is buried in bullet points.
- **"Angular 18" will go stale.** Write "Angular 18+" or the project's current version.
- **Not a single number anywhere.** Add at least one: team size, number of shared components, which KendoUI versions you migrated between.
- **No pet projects.** Add a line with the PWA and a link — a deployed production app is a free plus.

## 🗣 Useful phrases

- *My CV is quite short, so a few things are not there.*
- *What is not in my CV is…*
- *I am comfortable with code review from both sides.*
- *I can tell you more about any project if you want.*`
    }
  },

  {
    id: 'hr-012',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['notice-period', 'start-date', 'logistics'],
    question: {
      ru: 'Когда вы будете готовы приступить к работе? Какой у вас notice period? / When will you be ready to start? What is your notice period?',
      en: 'When will you be ready to start? / What is your notice period? / Когда вы будете готовы приступить к работе?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

My notice period is **one month**, so I can start about a month after we sign the offer.

I want to hand over my current tasks properly — I have been on this project for a long time and I do not want to leave it in a bad state. But if the start date is critical for you, I can talk to my current employer and try to make it faster.

In general, I am ready to move as soon as we agree on everything.

## 🇷🇺 Перевод

Мой срок отработки — **месяц**, поэтому смогу выйти примерно через месяц после подписания оффера.

Хочу нормально передать текущие задачи — я давно на этом проекте и не хочу оставлять его в плохом состоянии. Но если дата старта для вас критична, могу обсудить с текущим работодателем и постараться ускорить.

В целом я готов выходить, как только мы обо всём договоримся.

## ℹ️ Что такое notice period

Это **срок отработки** — сколько недель ты обязан доработать после того, как подал заявление об уходе. Не путать:

- **Notice period** — срок отработки при **увольнении** (у нас обычно 1 месяц). Спрашивают на каждом интервью — им нужно спланировать твой выход.
- **Probation period** — **испытательный срок** на новом месте (обычно 3 месяца). Это совсем другое, и спрашивают об этом редко, обычно наоборот — рассказывают тебе.

Твой ответ по умолчанию: **«My notice period is one month.»**

## 💡 Как отвечать

- Отвечайте **конкретно**: срок или дата. «Ну, наверное, скоро» — плохой ответ, HR планирует онбординг.
- Упомяните **передачу дел** — это показывает вас как ответственного человека, который так же корректно уйдёт и от них.
- **Не говорите «могу хоть завтра»**, если формально у вас месяц отработки. Это звучит либо ненадёжно («он и от нас так же сбежит»), либо как будто вас уже не держат на проекте.
- Не растягивайте: «через два месяца» без причины — вас могут не дождаться.
- Уточните у своего HR/менеджера точный срок в контракте — иногда бывает 2 недели или наоборот 2 месяца.

## 🗣 Полезные фразы

- *My notice period is one month.* — Мой срок отработки — месяц.
- *I can start on [date].* — Могу приступить [дата].
- *I would like to hand over my tasks properly.* — Хочу нормально передать свои задачи.
- *If it is critical for you, I can try to speed it up.* — Если для вас это критично, попробую ускорить.`,
      en: `## 🇬🇧 English answer

My notice period is **one month**, so I can start about a month after we sign the offer.

I want to hand over my current tasks properly — I have been on this project for a long time and I do not want to leave it in a bad state. But if the start date is critical for you, I can talk to my current employer and try to make it faster.

In general, I am ready to move as soon as we agree on everything.

## 🇷🇺 Russian version

Срок отработки — **месяц**, выйти смогу примерно через месяц после оффера. Хочу нормально передать задачи. Если дата критична — обсужу с текущим работодателем и постараюсь ускорить. В целом готов выходить, как только обо всём договоримся.

## ℹ️ Что такое notice period

**Срок отработки** — сколько нужно доработать после подачи заявления об уходе (обычно месяц). Не путать с **probation period** — это испытательный срок уже на новом месте (обычно 3 месяца). Спрашивают почти всегда именно про notice period, потому что HR планирует твой выход.

## 💡 How to answer

- Be **specific**: a period or a date. "Soon, probably" is a bad answer — the interviewer is planning onboarding.
- Mention the **handover** — it shows you are the kind of person who will leave them correctly too.
- **Do not say "I can start tomorrow"** if you formally owe a month. It sounds either unreliable ("he will run from us the same way") or like nobody needs you on your current project.
- Do not stretch it either: "in two months" without a reason and they may not wait.
- Check the exact number in your contract — sometimes it is 2 weeks, sometimes 2 months.

## 🗣 Useful phrases

- *My notice period is one month.*
- *I can start on [date].*
- *I would like to hand over my tasks properly.*
- *If it is critical for you, I can try to speed it up.*`
    }
  },

  {
    id: 'hr-013',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['english', 'language-level', 'communication'],
    question: {
      ru: 'Как бы вы оценили свой английский? Как вы использовали его в работе? / How would you rate your English skills? How did you use it at work?',
      en: 'How would you rate your English skills? How did you use it in work? / Как бы вы оценили свои знания английского языка?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

I would say my level is around **B1+, close to B2**.

But the most important thing is not the letter — it is that I use English **every day, all the time**. On my current project **the whole communication is in English**: all the chats, all the calls, all the discussions, the requirements and the documentation. There is no Russian on the project at all, and it has been like this for **4 years**.

So **reading and writing** are completely comfortable for me — tickets, code review comments, technical documentation, technical articles.

**Listening** is fine too. I take part in daily calls, demos, planning and discussions with the client, and I follow them without problems.

**Speaking** is the part I keep improving. I can explain a technical topic, ask questions and defend my solution, but sometimes I need a moment to build a longer sentence. It has never blocked my work — I have been working in an English-only environment for years.

## 🇷🇺 Перевод

Оценил бы свой уровень как **B1+, ближе к B2**.

Но важнее не буква, а то, что я использую английский **каждый день и постоянно**. На текущем проекте **всё общение на английском**: чаты, созвоны, обсуждения, требования, документация. Русского на проекте нет вообще, и так уже **4 года**.

Поэтому **чтение и письмо** для меня полностью комфортны — тикеты, комментарии на код-ревью, техническая документация, статьи.

**Аудирование** тоже нормально. Участвую в дейликах, демо, планированиях и обсуждениях с клиентом — понимаю без проблем.

**Говорение** — то, что продолжаю подтягивать. Могу объяснить техническую тему, задать вопросы, отстоять своё решение, но иногда нужна пауза, чтобы построить длинную фразу. Работе это никогда не мешало — я уже несколько лет работаю в полностью англоязычной среде.

## 💡 Как отвечать

- **Твой главный аргумент — не уровень, а среда.** «4 года всё общение на проекте только на английском» звучит сильнее любого сертификата и любой буквы. Скажи это **первым делом**, до того как назовёшь B1/B2.
- Не занижай себя. Если весь рабочий день идёт на английском — это как минимум крепкий **B2 в рабочем контексте**. Формулировка *«B1+, close to B2»* безопасна: не завышена, но и не продаёт тебя дешевле.
- Разложи по **четырём навыкам** (reading / writing / listening / speaking) — звучит честно и профессионально.
- **Не завышай наглухо**: следующая фраза интервьюера часто — *«Great, let's continue in English.»* Твой ответ должен выдерживать эту проверку — и он выдержит.
- Слабое место (speaking) назови сам, но сразу добавь, что оно не мешает работе.
- На созвоне не молчи. *«Could you repeat that, please?»* и *«Let me rephrase»* — абсолютно нормальные фразы, их используют и носители.

## 🗣 Полезные фразы

- *The whole communication on my project is in English.* — Всё общение на моём проекте — на английском.
- *I have been working in an English-only environment for 4 years.* — Я 4 года работаю в полностью англоязычной среде.
- *Reading and writing are completely comfortable for me.* — Чтение и письмо для меня полностью комфортны.
- *Could you repeat that, please?* — Не могли бы вы повторить?
- *Let me rephrase that.* — Позвольте я переформулирую.
- *Sorry, could you speak a bit slower?* — Извините, можно чуть медленнее?`,
      en: `## 🇬🇧 English answer

I would say my level is around **B1+, close to B2**.

But the most important thing is not the letter — it is that I use English **every day, all the time**. On my current project **the whole communication is in English**: all the chats, all the calls, all the discussions, the requirements and the documentation. There is no Russian on the project at all, and it has been like this for **4 years**.

So **reading and writing** are completely comfortable for me — tickets, code review comments, technical documentation, technical articles.

**Listening** is fine too. I take part in daily calls, demos, planning and discussions with the client, and I follow them without problems.

**Speaking** is the part I keep improving. I can explain a technical topic, ask questions and defend my solution, but sometimes I need a moment to build a longer sentence. It has never blocked my work — I have been working in an English-only environment for years.

## 🇷🇺 Russian version

Уровень — **B1+, ближе к B2**. Но важнее не буква: на текущем проекте **всё общение только на английском** (чаты, созвоны, обсуждения, требования, документация), и так уже **4 года**. Чтение и письмо полностью комфортны, аудирование нормальное (дейлики, демо, обсуждения с клиентом), говорение продолжаю подтягивать — иногда нужна пауза на длинную фразу, но работе это не мешает.

## 💡 How to answer

- **Your main argument is the environment, not the level.** "For 4 years all communication on my project has been in English" is stronger than any certificate. Say it **first**, before naming B1/B2.
- Do not undersell yourself. A full working day in English is a solid **working B2**. The phrasing *"B1+, close to B2"* is safe: not inflated, but not cheap either.
- Split it into the **four skills** (reading / writing / listening / speaking). It sounds honest and professional.
- **Do not overstate it either**: the very next sentence is often *"Great, let's continue in English."* Your answer must survive that check — and it will.
- Name your weakest skill (speaking) yourself, and add that it does not block your work.
- On a call, do not go silent. *"Could you repeat that, please?"* and *"Let me rephrase"* are completely normal phrases for native speakers too.

## 🗣 Useful phrases

- *The whole communication on my project is in English.*
- *I have been working in an English-only environment for 4 years.*
- *Reading and writing are completely comfortable for me.*
- *Could you repeat that, please?*
- *Let me rephrase that.*
- *Sorry, could you speak a bit slower?*`
    }
  },

  {
    id: 'hr-014',
    category: 'hr-questions',
    level: 'Medium',
    tags: ['salary', 'negotiation', 'compensation'],
    question: {
      ru: 'Каковы ваши зарплатные ожидания? / What are your salary expectations?',
      en: 'What are your salary expectations? / Каковы ваши ожидания по зарплате?'
    },
    answer: {
      ru: `## 🇬🇧 Что сказать по-английски

**Шаг 1 — мягко вернуть вопрос:**

Could you tell me the range you have for this position first? Then I can say if it works for me.

**Шаг 2 — если просят назвать число:**

My expectation is **2500–3000 USD gross** per month.

It depends on the whole package, of course — the level, the responsibilities, bonuses and the review policy. If the rest matches well, I am open to discuss the number.

**Шаг 3 — если сумма ниже ожиданий:**

Thank you for being open. The number is a bit below what I am looking for. Is there any flexibility, or maybe a salary review after the probation period?

## 🇷🇺 Перевод

**Шаг 1 — мягко вернуть вопрос:**

Не могли бы вы сначала назвать вилку, которая есть по этой позиции? Тогда я скажу, подходит ли она мне.

**Шаг 2 — если просят назвать число:**

Мои ожидания — **2500–3000 USD gross** в месяц.

Разумеется, это зависит от пакета в целом — уровня, зоны ответственности, бонусов и политики пересмотра. Если остальное хорошо совпадает, я готов обсуждать цифру.

**Шаг 3 — если сумма ниже ожиданий:**

Спасибо за откровенность. Цифра немного ниже того, что я ищу. Есть ли гибкость или, может быть, пересмотр зарплаты после испытательного срока?

## 💡 Как отвечать

- **⚠️ Про твою вилку.** Ты назвал 2000–3000. В скрипте я поставил **2500–3000** сознательно: **нижнюю границу вилки и предложат** — это её единственная функция. Если сказать «от 2000», разговор дальше пойдёт только про 2000, а 3000 ты уже не увидишь. Ставь нижней границей ту сумму, которая тебя действительно устраивает, а не абсолютный минимум выживания.
- **Сначала попробуйте узнать их вилку.** Часто она уже заложена в бюджет, и вы просто попадёте в неё.
- Называйте **вилку, а не одно число** — и держите её узкой (500, максимум 1000 разницы). Широкая вилка «2000–3000» читается как «я сам не знаю, сколько стою».
- Считайте от рынка и своего уровня, а не от текущей зарплаты. Формулировка *«хочу +20 % к нынешней»* привязывает вас к старой цифре.
- Всегда уточняйте **gross / net** и валюту — иначе легко разойтись в понимании в полтора раза. Твоя цифра — **gross**, так и говори: *«2500 to 3000 gross»*.
- Не извиняйтесь за цифру и не объясняйте её личными расходами (ипотека, семья). Обоснование — рынок и ваш опыт: 8 лет, 4 года на одном enterprise-продукте, полностью англоязычная среда.
- Спросите про **review policy**: пересмотр через 6–12 месяцев иногда важнее стартовой суммы.
- **Пауза — ваш друг.** Назвали цифру — замолчите. Не надо тут же добавлять «но вообще я гибкий, можно и меньше»: этим вы торгуетесь сами с собой.

## 🗣 Полезные фразы

- *Could you share the range for this position?* — Не подскажете вилку по этой позиции?
- *My expectation is between 2500 and 3000 gross.* — Мои ожидания — от 2500 до 3000 гросс.
- *It depends on the whole package.* — Это зависит от пакета в целом.
- *Is there any flexibility?* — Есть ли гибкость по цифре?
- *Do you have a salary review policy?* — Есть ли у вас практика пересмотра зарплаты?`,
      en: `## 🇬🇧 English answer

**Step 1 — softly return the question:**

Could you tell me the range you have for this position first? Then I can say if it works for me.

**Step 2 — if they insist on a number:**

My expectation is **2500–3000 USD gross** per month.

It depends on the whole package, of course — the level, the responsibilities, bonuses and the review policy. If the rest matches well, I am open to discuss the number.

**Step 3 — if their offer is below your expectation:**

Thank you for being open. The number is a bit below what I am looking for. Is there any flexibility, or maybe a salary review after the probation period?

## 🇷🇺 Russian version

**Шаг 1:** «Не могли бы вы сначала назвать вилку по этой позиции?» **Шаг 2:** «Мои ожидания — **2500–3000 USD gross**; зависит от пакета в целом». **Шаг 3:** «Цифра немного ниже того, что я ищу. Есть ли гибкость или пересмотр после испытательного срока?»

## 💡 How to answer

- **⚠️ About your range.** You said 2000–3000; the script says **2500–3000** on purpose. **The bottom of your range is what you will be offered** — that is its only function. Say "from 2000" and the rest of the conversation is about 2000. The floor must be a number you are genuinely happy with, not your survival minimum.
- **Try to learn their range first.** It is usually already budgeted, and you may simply fit into it.
- Give a **range, not a single number** — and keep it narrow (500, at most 1000 wide). A wide "2000–3000" reads as "I don't know what I'm worth".
- Anchor on the market and your level, not on your current salary. "I want +20% on my current pay" ties you to the old number.
- Always clarify **gross / net** and the currency — otherwise the misunderstanding can be 1.5x. Yours is **gross**, so say it: *"2500 to 3000 gross"*.
- Do not apologise for the number and do not justify it with personal expenses. The justification is the market and your experience: 8 years, 4 of them on one enterprise product, fully English-speaking environment.
- Ask about the **review policy**: a raise after 6–12 months is sometimes worth more than the starting number.
- **The pause is your friend.** Name the number, then stop talking. Do not add "but I'm flexible, less is fine too" — that is negotiating against yourself.

## 🗣 Useful phrases

- *Could you share the range for this position?*
- *My expectation is between 2500 and 3000 gross.*
- *It depends on the whole package.*
- *Is there any flexibility?*
- *Do you have a salary review policy?*`
    }
  }
];
