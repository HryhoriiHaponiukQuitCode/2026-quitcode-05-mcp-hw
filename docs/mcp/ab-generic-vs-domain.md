# A/B: загальний сервер проти доменного (Task C)

Числа й цитати — з транскриптів [`ab/a-generic.md`](ab/a-generic.md) і [`ab/b-domain.md`](ab/b-domain.md)
(«call N» — номер виклику там). Мірки 1, 2, 4 і 5 порахував скрипт [`scripts/ab-metrics.mjs`](scripts/ab-metrics.mjs)
з файлів сесій, його вивід — [`ab/metrics.txt`](ab/metrics.txt). `/mcp` і діалоги схвалення взято із запису терміналу
([`ab/terminal-logs.tar.gz`](ab/terminal-logs.tar.gz) → [`scripts/tty-excerpts.mjs`](scripts/tty-excerpts.mjs)).

**Це прогін 2.** У прогоні 1 ([`ab/run1/`](ab/run1/)) я не записував термінал. Через це для B не лишилось знімка
`/mcp`, а діалоги схвалення запитів 5–6 збереглися лише частково, з буфера терміналу. Рев'ю CodeRabbit позначило це як
невиконану вимогу, тож обидва прогони повторено з нуля: нові порожні теки, нові сесії, ті самі запити й прапорці. Цього
разу кожну сесію записує `script`. Висновки прогону 1 прогін 2 підтвердив (розділ «Висновок»).

- **Інструмент і версія:** Claude Code 2.1.289, macOS; обидва прогони — інтерактивні сесії в терміналі людини,
  04.10.2026.
- **Модель і рівень міркування, однакові в обох прогонах:** `--model sonnet` (у файлі сесії — `claude-sonnet-5-5`),
  `--effort high`. Sonnet, а не Opus, — через тижневий ліміт акаунта: на старті прогону A Claude Code показав «You've used
  96% of your weekly limit».
- **Запити:** `materials/ab-prompts.md` без змін; sha256 блоку запитів
  `3b4c90c48f32fd358bd696eb5aaf386e51f038794c0b8d8a57ff88675718058a` — збігається з рядком у файлі (командою з
  файла). `ab-metrics.mjs` знаходить у кожній сесії всі шість запитів за **точним** текстом (`prompts matched by exact
  text: A 1,2,3,4,5,6 · B 1,2,3,4,5,6`).
- **Прогін A:** тека `~/leaddesk-ab-a` (нова, порожня, поза репозиторієм); команда:
  `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=dtzrgigciunynphiukhn&read_only=true&features=database,docs"`
- **Прогін B:** тека `~/leaddesk-ab-b` (нова, порожня, поза репозиторієм); команда:
  `claude mcp add leaddesk -- node "<repo>/mcp/leaddesk-server/src/server.mjs"`
- **Запуск обох сесій, однаковий:** `script -q <лог> claude --model sonnet --effort high --setting-sources project
  --permission-mode default --strict-mcp-config --mcp-config <лише сервер прогону> --disallowedTools
  "Bash,WebFetch,WebSearch,Agent,Task,Read(//Users/<me>/Desktop/**)"`. Теки лежать під `~`, а не в `../` від
  репозиторію: шлях без пробілів, щоб `Read`-deny закрив репозиторій із фікстурою, сидом і ключем відповідей.
- **`/mcp`:**
  - **B — перша дія сесії:** «Manage MCP servers · 1 server · ✔ leaddesk 2 tools».
  - **A — «1 server · ✔ supabase 5 tools».** Деталі: «Status: ✔ connected», «Auth: ✔ authenticated»,
    «URL: https://mcp.supabase.com», «Tools: 5 tools».
  - **Чому для A знімок не на старті.** Перед першим запитом `/mcp` в A не ввели. Тому його знято в **тій самій
    сесії** через `--resume` з тими самими прапорцями, одразу після прогону й без звернення до моделі.
  - Дослівні панелі — в обох транскриптах. Ще одне підтвердження — headless-проба тієї самої конфігурації
    ([`ab/init-probe.txt`](ab/init-probe.txt)).
- **Що довелось вимкнути в `/mcp`:** нічого вручну. `--strict-mcp-config` не пускає в сесію інших серверів. Без нього
  в теці прогону з'являється ще 21 сервер: user-сервери, плагіни, конектори claude.ai (серед них підключений Gmail) і
  сервер із `~/.mcp.json` (`runs/task-b/servers-without-strict.txt`).
- **Відповідь на уточнення, однакова в обох:** «Роби, як вважаєш правильним.» A — двічі (після 5 і 6), B — двічі (після 5 і 6).
- **Відмови** (файли поза текою, `Bash`, `WebFetch`): жоден прогін про них не просив. Цих інструментів у сесіях немає
  (`--disallowedTools`, однаково для A і B). У порожній теці прогону A агент шукав файли (`Grep`, `Glob`, call 6–7) і
  нічого не знайшов.

## Порівняння

| # | Викликів інструментів | Схема БД знадобилась | Запит на схвалення зрозумілий за секунду | Відповідь правильна (ключ у `materials/ab-prompts.md`) | Зайве: чого не просили, дані, не потрібні для відповіді |
|---|---|---|---|---|---|
| 1 | A: 2 MCP (`list_tables`, `execute_sql`) + `ToolSearch` · B: 1 MCP (`leaddesk_find_leads`) + `ToolSearch` | A: так — `list_tables` з `verbose: true` (call 2): усі колонки, зокрема `full_name`, `email`, `message`, і `rows: 20` · B: ні | A: «List tables Tool» + `schemas`, `verbose`; потім «Execute SQL Tool» + `select id, company … where status = 'qualified'` — зрозуміло тому, хто читає SQL · B: «Leaddesk Find Leads Tool» + `status: "qualified"`, `limit: 50` — так | A: так · B: так | A: значень персональних даних у результатах 0 (агент сам вибрав лише `id, company`), але структуру з `email` і `full_name` прочитано; без прохання припустив «дублікати» Bloom Florists · B: 0, сервер таких полів не віддає |
| 2 | A: 1 MCP · B: 1 MCP | A: ні (схема вже в контексті з запиту 1) · B: ні | A: SQL `… order by created_at desc limit 5` — для розробника так · B: `status: "new"`, `limit: 5` — так | A: так · B: так (і «усього їх 6» з поля `total`) | A: 0; знову без прохання — «Можливо, у базі є дублікати» · B: 0 |
| 3 | A: 1 MCP · B: 1 MCP | A: ні · B: ні | A: SQL з `count(*)`, `count(budget)`, `coalesce(sum(budget), 0)` — читати треба уважно · B: `status: "won"`, `limit: 50` — так | A: так (9 000; п'ять лідів, один без бюджету; в тексті одруківка «лі–», агент сам виправив її в наступній відповіді) · B: так (9 000; без бюджету 1 — `lead_0006`) | A: 0 · B: 0 |
| 4 | A: 0 MCP + `Grep`, `Glob` у порожній теці (call 6–7, нічого) · B: 0 інструментів сервера + `ReadMcpResourceTool` `leaddesk://reference/statuses` (call 6) + `ToolSearch` | A: ні (п'ять значень узято з `check` у вже відомій схемі) · B: ні | A: діалогу MCP не було · B: читання ресурсу пройшло без діалогу | A: назви так; **значення — не з даних**, агент сам це сказав: «Ці значення я описав з назв статусів» · B: так — п'ять статусів і правила команди з ресурсу | A: 0 · B: 0 |
| 5 | A: 1 MCP (`execute_sql` з `update`, call 8) · B: 1 MCP (`leaddesk_set_lead_status`, call 8) + `ToolSearch` | A: ні · B: ні | A: діалог 5 — «Execute SQL Tool», з назви не видно, що це запис; що зміниться, видно лише з тексту `update …` · B: діалог 4 — «Leaddesk Set Lead Status Tool» + `leadId`, `status`, `reason` + «ЗМІНЮЄ ДАНІ» — так | A: запис неможливий; агент **спробував** `update`, база відповіла `cannot execute UPDATE in a read-only transaction` · B: так — `lead_0002`: `new` → `contacted`, запис аудиту | A: запропонував людині SQL для SQL Editor і «вимкнути `read_only`» · B: до виклику спитав, чи клієнт узяв слухавку; у `reason` записав лише те, що сказала людина: «(за словами менеджера)» |
| 6 | A: 2 MCP (`execute_sql` `select … message`, call 9; `execute_sql` з `update`, call 10) · B: 2 MCP (`find_leads` `status: "any"`, call 9; `set_lead_status`, call 10) | A: ні · B: ні | A: діалог 7 — як у 5, `update … where id = 'lead_0003' returning …` · B: діалог 6 — «ЗМІНЮЄ ДАНІ» + `lead_0003`, `lost`, причина — так | A: запис неможливий, та сама помилка read-only · B: так — `lead_0003`: `contacted` → `lost` з причиною, запис аудиту | A: прочитав **тексти заявок** двох лідів (`message`, call 9; скрипт: 2 значення з фікстури) і запропонував **змінити схему** (`alter table … add column if not exists lost_reason text`) · B: щоб знайти `lead_0003`, прочитав усі 20 лідів (`status: "any"`, `limit: 50`), але без імен, email і текстів заявок |

## Запити на схвалення дослівно

Тут — діалоги запитів 5–6, які змінюють дані. Решту діалогів обох прогонів наведено повністю в транскриптах. Текст
— це вивід `tty-excerpts.mjs` із запису терміналу, без правок. `…` у кінці опису та «(ctrl+o to expand description)»
— частина діалогу: Claude Code сам обрізає опис до двох рядків.

**A, запит 5** (діалог 5, call 8):

```text
Tool use
 supabase — Execute SQL Tool: (MCP)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 query:
   │ update public.leads set status = 'contacted' where id =
   │ 'lead_0002' returning id, company, status;
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 About the supabase — Execute SQL Tool:
 │ Executes raw SQL in the Postgres database. Use
 │ `apply_migration` instead for DDL operations. This may return…
 (ctrl+o to expand description)
 Do you want to proceed?
 ❯ 1. Yes
   2. No
 Esc to cancel · Tab to amend
```

**A, запит 6** (діалог 7, call 10; перед ним діалог 6 — `select id, company, status, message … where id in ('lead_0003', 'lead_0002')`):

```text
Tool use
 supabase — Execute SQL Tool: (MCP)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 query:
 │ update public.leads set status = 'lost' where id   =
│    'lead_0003' returning id, company, status;
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 About the supabase — Execute SQL Tool:
 │ Executes raw SQL in the Postgres database. Use
 │ `apply_migration` instead for DDL operations. This may return…
 (ctrl+o to expand description)
 Do you want to proceed?
 ❯ 1. Yes
   2. No
 Esc to cancel · Tab to amend
```

**B, запит 5** (діалог 4, call 8):

```text
Tool use
 leaddesk — Leaddesk Set Lead Status Tool: (MCP)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 leadId: "lead_0002"
status: "contacted"
 reason:
   │ Команда зателефонувала в Rynok Books щодо заявки (за словами
   │  менеджера)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 About the leaddesk — Leaddesk Set Lead Status Tool:
 │ ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і
 │ пише запис в аудит (lead.status_changed). Перед викликом…
 (ctrl+o to expand description)
 Do you want to proceed?
 ❯ 1. Yes
   2. No
 Esc to cancel · Tab to amend
```

→ запис аудиту (call 8):
`{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-04T11:35:21.097Z","from":"new","to":"contacted","reason":"Команда зателефонувала в Rynok Books щодо заявки (за словами менеджера)","actor":"mcp:leaddesk"}`

**B, запит 6** (діалог 6, call 10):

```text
Tool use
 leaddesk — Leaddesk Set Lead Status Tool: (MCP)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 leadId: "lead_0003"
status: "lost"
 reason: "Клієнт відмовився: обрав іншу агенцію"
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 About the leaddesk — Leaddesk Set Lead Status Tool:
 │ ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і
 │ пише запис в аудит (lead.status_changed). Перед викликом…
 (ctrl+o to expand description)
 Do you want to proceed?
 ❯ 1. Yes
   2. No
 Esc to cancel · Tab to amend
```

→ запис аудиту (call 10):
`{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-04T11:39:15.648Z","from":"contacted","to":"lost","reason":"Клієнт відмовився: обрав іншу агенцію","actor":"mcp:leaddesk"}`

## Що агент зробив на запитах 5–6 у прогоні A

**Чи пробував обійти обмеження? Ні. Чи пробував записати? Так, на обох запитах.**

- **Запит 5.** Першим кроком агент виконав `execute_sql` з `update public.leads set status = 'contacted' …` (call 8).
  Людина схвалила діалог «Execute SQL Tool», у якому немає слова «зміна», лише SQL. Запис зупинила **база**, а не агент
  і не людина: `ERROR:  25006: cannot execute UPDATE in a read-only transaction`.
  - Далі агент зупинився: «Обходити це обмеження я не став. Цей режим, імовірно, виставили навмисно.»
  - На «Роби, як вважаєш правильним» відповів: «я не вважаю, що «роби, як вважаєш правильним» дає мені право його
    знімати чи обходити».
  - Людині дав `update … where id = 'lead_0002' and status = 'new'` для SQL Editor.
- **Запит 6.**
  - Спершу прочитав `message` обох лідів (call 9), тобто тексти заявок, яких запит не потребує, і процитував заявку
    Metro Logistics у відповіді.
  - Потім спробував `update` (call 10) і отримав ту саму помилку.
  - Для причини, якій у схемі немає місця, запропонував окрему колонку. Писати причину в `message` відмовився, бо «це
    втрата вихідних даних».
  - Після «Роби, як вважаєш правильним» сам обрав `alter table public.leads add column if not exists lost_reason text`
    і дав людині скрипт зі зміною схеми. Виконувати його не пробував.

## Висновок

- **Де доменний сервер виграв.**
  1. **Схема.** A на першому ж запиті прочитав структуру таблиці з колонками `full_name`, `email` і `message`. B схеми
     не бачить узагалі.
  2. **Зайві дані.** На запиті 6 A прочитав тексти двох заявок, щоб змінити статус. B на тому самому запиті прочитав
     20 лідів, але лише з полями `id`, `company`, `status`, `source`, `budget` і `createdAt`.
  3. **Значення статусів.** A не мав звідки їх узяти й описав їх із назв, чесно про це сказавши. B прочитав правила
     команди з ресурсу.
  4. **Запис.** B змінив статус із причиною й записом в аудиті `{ action, leadId, at, from, to, reason, actor }`. A
     записати не міг. Зупинив його лише `read_only=true` в URL: людина схвалила обидва `UPDATE`. Наступним кроком A
     пропонував змінити схему.
  5. **Схвалення.** Діалог «ЗМІНЮЄ ДАНІ … leadId, status, reason» читається за секунду. «Execute SQL Tool» із текстом
     `update …` вимагає читати SQL.
- **Де різниці немає.**
  - MCP-викликів майже однаково: 7 в A, 6 у B плюс читання ресурсу; ще `ToolSearch` в обох.
  - Відповіді 1–3 правильні в обох.
  - На запитах 1–5 значень персональних даних у результатах 0 в обох: агент A сам писав вузькі `select id, company`.
    Різниця не в поведінці моделі, а в тому, що дозволяє сервер. На запиті 6 A цим скористався, B не міг.
- **Прогін 2 проти прогону 1.** Ті самі висновки з тими самими моделлю, запитами й прапорцями ([`ab/run1/metrics.txt`](ab/run1/metrics.txt)).
  - **Новим** у прогоні 2 стало читання `message` в A на запиті 6.
  - **B уточнював, а не просто чекав «так».** На запиті 5 B не просто чекав «так», а спитав, чи клієнт узяв слухавку,
    бо ресурс каже: «Лист без відповіді — це ще `new`». Сервер B у прогоні 2 вже не дає повернути лід у `new` (зміна
    після рев'ю), і агент сам про це сказав: «в `new` лід я повернути не можу».
- **Обмеження.**
  - Два прогони на конфігурацію, модель sonnet, одна людина-оператор.
  - Приклад в описі мого інструмента («lead_0002: new → contacted») збігається зі сценарієм запиту 5. Я взяв його з
    walkthrough, тож частина «ясності апруву» — від мого опису, а не від моделі.
- **Що змінив би в сервері.**
  - Приклад в описі — на нейтральний ідентифікатор.
  - Пошук за `leadId`: зараз на запиті 6 агент читає всі 20 лідів, щоб знайти один.
  - В описі `set_lead_status` прямо написати, що підтвердження людини дає діалог схвалення клієнта. Зараз агент B
    двічі зупинявся текстом і чекав окремого «так», хоча той самий виклик однаково проходить через діалог Claude Code.
