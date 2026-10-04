# Перевірка (Task A, Task B, бонус E)

Тут лише те, що справді сталося: команди, коди виходу, числа й цитати. Біля кожного — файл, звідки воно
взяте. A/B описано в [`ab-generic-vs-domain.md`](ab-generic-vs-domain.md), threat model — у
[`threat-model.md`](threat-model.md), права й сесії — у [`connections.md`](connections.md).

- **Інструмент і версія, модель:**
  - Claude Code 2.1.282: Task A, E1 і Playwright-частина Task B, 28.09.2026;
  - Claude Code 2.1.289: решта Task B і Task C, 04.10.2026.
  - Сесії агента: `claude-opus-5-5` для знімків Playwright, перевірки форми й знімків Vercel; `claude-sonnet-5-5` для міграції, логу білду й A/B (через ліміт акаунта). Модель кожного прогону записана в його `meta.txt` або в заголовку транскрипту.
- **ОС і термінал, Node:** macOS (Darwin 25.6) · zsh · Node 22.21.0 (walkthrough вимагає ≥ 22.19 для Inspector 2.8.0).
- **Усі перевірки однією командою:** `bash docs/mcp/scripts/run-checks.sh` — базова лінія `main` у свіжому worktree,
  lint і build гілки, контракт, self-test, HTTP, конфіг, сид, підрахунок deny Vercel, посилання, знеособлення,
  таблиця файлів, незмінність кореневих `package*.json`. Кожен крок і його exit code —
  [`evidence/checks.txt`](evidence/checks.txt).

## Базова лінія (`main` = `958d2ee`, до будь-яких змін)

- `npm ci`, `npm run lint`, `npm run build` у свіжому worktree `main` — exit 0, 9 маршрутів
  ([`evidence/checks.txt`](evidence/checks.txt), розділ «baseline»).
- `npm install` на цій машині переписав кореневий `package-lock.json`: прибрав поля `libc`. Зміну
  відкочено (`git checkout package-lock.json`), далі ставив лише `npm ci`. Кореневий lock-файл у гілці не змінено.

## Task A — сервер в Inspector

- **Команди.** Чотири файли в `docs/mcp/` зроблено командами walkthrough (Task A, крок 4) через
  [`mcp/leaddesk-server/scripts/make-inspector-artifacts.sh`](../../mcp/leaddesk-server/scripts/make-inspector-artifacts.sh).
  Скрипт ще й перевіряє, що кожен файл — чистий JSON. Він пише вивід Inspector'а в `/dev/null`, щоб діагностика не
  змішувалась із JSON; самі команди не змінено.
- **`tools-list.json`.** Рівно два інструменти. `leaddesk_find_leads` має `{"readOnlyHint":true,"openWorldHint":false}`,
  `leaddesk_set_lead_status` — `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`.
  У кожного параметра є `description`. Модель бачить, наприклад, такі описи:
  - `leadId`: «Ідентифікатор ліда у форматі lead_0002: lead_ і чотири цифри. Невідомий — знайди через leaddesk_find_leads»;
  - `limit`: «… Поле total у відповіді каже, скільки їх усього»;
  - опис `set_lead_status` починається з «ЗМІНЮЄ ДАНІ: …» і вимагає підтвердження людини.
- **`bad-input.json`.** Зламані аргументи: `leadId=nope` і `reason=ok`. Текст помилки: «Input validation error: Invalid arguments
  for tool leaddesk_set_lead_status: leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small:
  expected string to have >=3 characters», `"isError": true`. Inspector завершився з **exit 5**.
- **`set-status.json`.** Лід `lead_0002`: `new` → `contacted`. Запис аудиту:
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "…Z", "from": "new", "to": "contacted", "reason":
  "перевірка в Inspector", "actor": "mcp:leaddesk" }`. Форма — `AuditEntry` застосунку; назва дії — як у `logAudit("lead.created", …)`.
- **`resource-read.json`.** `leaddesk://reference/statuses`, `"mimeType": "text/markdown"`.
- **Перевірка контракту.** [`check-contract.mjs`](../../mcp/leaddesk-server/scripts/check-contract.mjs) дає **16/16 PASS**
  ([`evidence/task-a/check-contract.txt`](evidence/task-a/check-contract.txt)). Перевірки чорною скринькою через
  Inspector:
  - відповіді за ключем A/B (запити 1–3);
  - відсутність імен, email і текстів заявок у `find` (порівняно з усіма 20 лідами фікстури);
  - той самий статус, невідомий лід і закрита угода — усі дають `isError`;
  - 9 невалідних входів: `leadId=nope`; статус `hot` в обох інструментах; `reason` з 2 символів, з 501 символа,
    `"   ok   "` (після `trim` — 2); `limit` 0, 51, 1.5;
  - фікстура після змін незмінна; stdout без клієнта порожній.
- **Self-test.** 9 мутантів сервера, кожен порушує одне правило. Кожного ловить своя перевірка: «self-test: every
  mutant was caught by its own check» ([`evidence/task-a/check-contract-self-test.txt`](evidence/task-a/check-contract-self-test.txt)).
- **Що було найважче:**
  1. Описи пишуться для моделі, а не для людини. Тому в `limit` прямо сказано про `total`: без нього агент на
     «скільки лідів» рахував би лише показані 10. А в `set_lead_status` прямо написано «ЗМІНЮЄ ДАНІ». Те, що це
     спрацювало, видно в A/B: прогін B на запиті 2 відповів «усього їх 6» з поля `total`.
  2. Межа «двох дієслів»: агент не може перевідкрити `won`/`lost`. Це рішення команди, а не вимога рубрики, і воно
     перевіряється мутантом M3.
- **Що з'ясувалось під час роботи:**
  - **Inspector змішав stderr сервера зі stdout.** У найпершому запуску рядок журналу сервера
    («leaddesk: 20 leads loaded…») потрапив у `tools-list.json` після JSON, і файл перестав парситись
    ([`evidence/task-a/tools-list.first-run.invalid.txt`](evidence/task-a/tools-list.first-run.invalid.txt)). За 20
    повторами це не відтворилося: 0 з 20 ([`evidence/task-a/inspector-stdout-repeat.txt`](evidence/task-a/inspector-stdout-repeat.txt)).
    Причину не встановлено, тому скрипт генерації тепер відмовляється залишати не-JSON.
  - **Inspector не помічає `console.log`.** Мутант M6 (`console.log` на старті) пройшов **усі** перевірки через
    Inspector і впав лише на окремій перевірці stdout (C15). Отже, Inspector 2.8.0 мовчки пропускає сміття в stdout.
  - **Фабрику викликають не раз.** `createMcpHandler` викликає її на **кожен** HTTP-запит (тип `McpServerFactory`
    у `@modelcontextprotocol/server` 2.1.0), а `serveStdio` — на кожне з'єднання. Тому ліди й аудит живуть на рівні
    модуля `src/leaddesk.mjs`, а не у фабриці. Абляція в E1 це доводить.

## Task B — що зробили агенти з серверами

- **Supabase** ([`connections.md`](connections.md), розділ «Supabase: схема й сид»). Агент прочитав
  `materials/leads.json`, записав обидва SQL-файли, викликав `list_tables` (`{"tables":[]}`) і два `select`. Перед
  `apply_migration` він **зупинився й попросив «так»**, як вимагає `AGENTS.md`. Людина відповіла «так» і вручну схвалила
  `apply_migration`, `execute_sql` (insert на 20 рядків) і `execute_sql` (`count` → `[{"count":20}]`). Нічого не
  відхиляли. У базу пішов той самий SQL, що лежить у файлах (`runs/task-b/applied-sql-vs-files.txt`), а сид збігається з
  фікстурою поле в поле (`check-seed.mjs` → all PASS). Роль: `select current_user, session_user,
  current_setting('is_superuser')` → `postgres`, `postgres`, `off`.
- **Vercel.** Деплой зроблено через git-інтеграцію в дашборді: форк, гілка `main`, коміт `958d2ee`. Лог отримано
  інструментом `list_deployment_events` (`get_deployment_build_logs` у walkthrough на сервері вже немає). Перед ним агент
  викликав `get_deployment` за hostname. У логу 76 подій: «Cloning github.com/HryhoriiHaponiukQuitCode/2026-quitcode-05-mcp-hw
  (Branch: main, Commit: 958d2ee)» … «Build Completed in /vercel/output [35s]» … «Deployment completed», жодного
  `error`/`failed` ([`evidence/vercel-build-log.txt`](evidence/vercel-build-log.txt)).
- **Playwright.** Ланцюжок: `navigate` → `snapshot` → `fill_form` → `console_messages` → `click` → `snapshot` →
  `console_messages` → `network_requests` ×2. Форма відправилась (`POST /` → 200, «Дякуємо! Заявку отримано.»). У консолі
  0 помилок і 0 попереджень, усі 22 запити йшли лише на `localhost:3000`
  ([`evidence/playwright-form-check.md`](evidence/playwright-form-check.md)).
- **Що агент зробив сам, без прохання:**
  - Агент Vercel після `ToolSearch` одразу викликав `list_teams`, потім `list_projects`. Обидва виклики відхилено, бо їх немає в
    `allow`, тож результату немає (`runs/task-b/vercel-build-log-1-list-denied.md`). Далі агенту дали hostname деплою.
  - Агент Supabase сам додав у міграцію RLS без політик і два індекси. Про RLS він сам сказав, що на виклики MCP під
    `postgres` це не впливає.
  - У тестовому прогоні хоста схвалень (`haiku`, не в доказах) агент, у якого забрали `Bash`, запустив субагента
    `Agent`, і той пройшов без жодного запиту на дозвіл. Відтоді кожна інтерактивна сесія (міграція, A/B) має
    `--disallowedTools Bash,WebFetch,WebSearch,Agent,Task`. Headless-сесії (`-p --permission-mode default`) дістають лише
    інструменти з `--allowedTools`, і схвалити решту там нікому.
- **Сервер Vercel не той, під який писали walkthrough.** 244 інструменти; з 11 імен deny існують 10; дозволеного
  `get_deployment_build_logs` немає. Що розширено в deny і чому — у [`connections.md`](connections.md), розділ «Що
  змінилось проти walkthrough». Deny із walkthrough закриває 10 інструментів, лишається 234. 41 глоб на дієслова закриває 107, 5 точних імен — ще 5,
  разом 113, лишається 131 ([`count-vercel-deny.mjs`](scripts/count-vercel-deny.mjs) →
  `runs/task-b/vercel-deny-count.txt`). Спершу в `connections.md` стояло «93» — число, яке я не зміг відтворити;
  замінено на 107 з підрахунку.
- **`allow` проєкту для MCP-інструментів у headless не діє.** Це виміряно 8 сесіями
  (`runs/task-b/allow-probe.txt`). Тому headless-кроки отримують ті самі імена через `--allowedTools`, згенеровані з
  файла.
- **Хто схвалював.** Ви доручили мені зробити це самому, і перший крок міграції пройшов через мій скрипт-хост
  ([`scripts/approval-host.mjs`](scripts/approval-host.mjs)) із записаною політикою (`runs/task-b/supabase-build.md`).
  Схвалення зміни бази від імені людини класифікатор Claude Code заблокував («Create Unsafe Agents»). Я не шукав
  обхідного шляху: «так» і всі схвалення запису дала людина в терміналі.

## Task E (бонус)

- **Варіант:** E1, HTTP-сервер [`mcp/leaddesk-server/src/http.mjs`](../../mcp/leaddesk-server/src/http.mjs) — та сама
  фабрика `createLeadDeskServer` і те саме сховище, що в `server.mjs`. `@modelcontextprotocol/node` 2.1.0 стоїть точною
  версією. Сервер слухає лише `127.0.0.1:3333`. Гварди `localhostHostValidation()` і `localhostOriginValidation()`
  **викликаються** в обробнику до `mcp(req, res)`.
- **Чотири відповіді `curl`** командами walkthrough. Тіло запиту — у тимчасовому файлі, `body.json` у репозиторії не
  створюється ([`evidence/task-e/http-check.txt`](evidence/task-e/http-check.txt)):
  - без підроблених заголовків → **HTTP 200**, у тілі `leaddesk_find_leads` і `leaddesk_set_lead_status`;
  - `Host: evil.example` → **HTTP 403**, `{"code":-32000,"message":"Invalid Host: evil.example"}`;
  - `Origin: https://evil.example` → **HTTP 403**, `"Invalid Origin: evil.example"`;
  - без `MCP-Protocol-Version` → **HTTP 400**, `"code":-32020`, «the required MCP-Protocol-Version header is absent».
- **Атаки на гварди.** Усього 33 очікування, усі виконано (`RESULT: all expectations met`):
  - `localhost.evil.example`, `127.0.0.1.nip.io`, `evil.example:3333`, `localhost@evil.example` і порожній `Host` → 403;
  - запит **без** `Host` → 400 від самого `node:http`, ще до гварда. Спершу я очікував тут 403 і помилився;
  - `Origin: null`, `http://localhost.evil.example`, `https://127.0.0.1.nip.io`, `not a url` → 403;
  - з'єднання на LAN-адресу → `000`, бо сервер слухає лише `127.0.0.1`.
- **Чого гварди не закривають.** `Origin` перевіряється **без порту**: `http://localhost:3000` і
  `http://127.0.0.1:5173` проходять (200). Будь-яка сторінка з будь-якого локального порту може викликати сервер, а
  автентифікації в нього немає. Це внесено в threat model.
- **Абляція в тимчасових копіях:**
  - **A1:** гварди передано опцією в `toNodeHandler` замість виклику → `Host: evil.example` дає **200**: пастку з
    walkthrough відтворено;
  - **A2:** без гварда `Origin` → підроблений `Origin` проходить (200), `Host` і далі 403;
  - **A3:** сховище створюється у фабриці → `set_lead_status` повертає успіх, а наступний запит бачить 6 нових лідів
    замість 5, тобто зміну втрачено.
- **Стан між запитами** на справжньому коді: `new` до зміни 6, після `set lead_0002 → contacted` у наступному
  HTTP-запиті 5. Журнал сервера без email (перевірено: `0`).

## Мої помилки і що з ними зроблено

| Що сталося | Як помітив | Що зроблено |
|---|---|---|
| `npm install` змінив кореневий `package-lock.json` | `git status` після встановлення | відкат, далі лише `npm ci` |
| `meta.txt` писав «dirty: no» для файла поза git і sha `settings.json` для сесій **поза** репозиторієм, де він не діяв | перечитав `meta.txt` перед звітом | скрипт виправлено; у двох `meta.txt` дописано позначене виправлення |
| Знеособлювач Vercel замінив і синтетичні email лідів у транскрипті Supabase | ненульовий лічильник замін у транскрипті, де Vercel немає | email відновлено з фікстури в початковому порядку, вміст `Read` знову дорівнює `materials/leads.json` (перевірено), правило `email` прибрано, перевірка `--check` ідемпотентна |
| Перевірка ключа A/B позначила правильну відповідь A на запит 3 як хибну | розходження з текстом відповіді | у JavaScript `\b` не працює поруч із кирилицею; регулярний вираз виправлено, коментар у коді |
| Знімок Vercel із deny walkthrough перезаписано новим | перед звітом не знайшов файла | повторний прогін з тимчасово відновленим `settings.json` |
| Упаковувач прогонів витягнув `meta`/`stderr` окремими файлами й пропустив прогін без `meta.txt` | перелік файлів після упаковки | виправлено; архів розпаковується в оригінали (перевірено `diff -r`) |
| `"test"` у `mcp/leaddesk-server/package.json` вказував на неіснуючу теку `test/` | звіряння перед здачею | `npm test` тепер запускає `check-contract.mjs` з кореня репозиторію (16/16) |
| Звіти твердили більше, ніж доказано: «93» інструменти Vercel, `--disallowedTools` «у кожній сесії», цитати вендора, яких у знімку немає | окремий агент-звіряльник (read-only) порівняв звіти з доказами | кожну розбіжність виправлено в `verification.md`, `threat-model.md`, `connections.md`; числа, яких не було в доказах, тепер записано (`checks.txt`, `vercel-deny-count.txt`, `vercel-cli.txt`) або прибрано |
| Очікування «запит без `Host` → 403» | `check-http.sh` FAIL | це 400 від `node:http`; очікування розділено на «без заголовка» і «порожній заголовок» |

## Усі змінені файли

Таблицю згенеровано з `git diff --name-status main...HEAD` скриптом
[`scripts/changed-files.mjs`](scripts/changed-files.mjs); `--check` перевіряє, що вона не розійшлася з гілкою.

<!-- changed-files:start -->
<!-- changed-files:end -->
