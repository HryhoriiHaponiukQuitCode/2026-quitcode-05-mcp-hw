# Домашнє завдання — Воркшоп 5

**Тема:** MCP: інтеграції для AI-агентів
**Формат:** будуєте власний MCP-сервер LeadDesk із двома бізнес-дієсловами замість SQL на всю базу;
підключаєте готові сервери (Supabase, Vercel і Figma або Playwright) з найменшими правами й записуєте
кожне право; вимірюєте A/B-прогоном, що змінює доменний сервер порівняно із загальним; складаєте
threat model своїх інтеграцій
**Час:** **5–7 годин** — сума бюджетів у заголовках розділів (5 год 30 хв у кращому випадку,
7 год без бонусу). Найкраще двома вечорами: **вечір 1 (~2,5–3 год)** — налаштування й Task A;
**вечір 2 (~3–4 год)** — Task B, Task C, Task D і здача. Бонусний Task E — ще ~30 хв. Без досвіду
кодування беріть верхню межу діапазону
**Здача:** Pull Request у starter-repo (CodeRabbit зробить рев'ю)

WS4 упакував експертизу команди у скіли: агент знає, **як** робити. Але в роботі агенції агенту
потрібен ще й **доступ**: до бази клієнта, до деплоїв, до макетів, до браузера. MCP — це спосіб дати
такий доступ, і кожне підключення — це дані клієнта плюс права, які хтось має обрати й записати.
Сьогодні ви робите це двічі: будуєте свій сервер, який віддає агенту рівно те, що ви дозволили, і
підключаєте чужі — так, як підключали б їх до клієнтського проєкту.

> 📊 **Рубрику опубліковано наперед** — розділ
> [«Як це оцінюється»](../README.md#як-це-оцінюється) у README, поруч із Definition of Done.
> Прочитайте його **до того, як почнете**.

> ⏱ **Плануйте два вечори.** Завдання йдуть по черзі: сервер із Task A і сид Supabase з Task B —
> це дві сторони A/B у Task C, а threat model у Task D спирається на конфіг із Task B. Більшість часу
> йде не на друкування, а на підключення, прогони й читання того, що зробив агент.

---

## 0. Налаштування _(~30 хв)_

```bash
# форк + клон
gh repo fork koldovsky/2026-quitcode-05-mcp-hw --clone
cd 2026-quitcode-05-mcp-hw

# робоча гілка
git checkout -b ws05/<github-username>

# залежності й локальні налаштування
npm install
cp .env.example .env.local
npm run dev                      # http://localhost:3000
```

> Попередження `npm warn deprecated …` і `npm warn allow-scripts …` — очікувані. Нічого з їхніми
> порадами не запускайте (`npm audit fix`, `npm approve-scripts`) і не комітьте змін у кореневому
> `package-lock.json`: `npm run lint` і `npm run build` проходять і так.

Що потрібно:

- **Node.js ≥ 22.19** — цього вимагає MCP Inspector 2.8.0; найпростіше — Node 24. Перевірка: `node --version`.
- Git (на Windows — Git Bash), GitHub CLI (`gh`), Claude Code. Запишіть версію: `claude --version`.
- **Акаунти — лише особисті або одноразові** (правило нижче): Supabase з одним порожнім проєктом,
  Vercel (безплатний план), Figma — якщо оберете її третім сервером у Task B.
- Для варіанта «Playwright» у Task B — встановлений Google Chrome: сервер за замовчуванням запускає саме його.

**Перший вхід у кожен віддалений сервер — лише інтерактивний** (`/mcp` → сервер → Authenticate).
У `claude -p` браузерний вхід не пройде. Далі токен зберігається й освіжається сам.

### Правила, без яких домашку не зараховано

1. **Лише особисті або одноразові акаунти.** Жодної клієнтської організації, команди, проєкту чи файлу.
   Не знаєте, чи тримає ваш робочий логін клієнтські організації, — вважайте, що тримає. Екран згоди
   Supabase показує перелік організацій навіть тоді, коли `project_ref` уже в URL.
2. **У репозиторій не потрапляють результати `list_teams`, `list_projects`, `list_organizations`** і
   назви клієнтів. Модель може викликати `list_teams` сама: опис параметра `teamId` в інструментах
   Vercel прямо підказує це зробити.
3. **В одній сесії — щонайбільше один сервер із правом запису.** Браузерний сервер водночас пише й
   є каналом назовні, тож він ніколи не працює в одній сесії із Supabase. Новий крок — нова сесія.
4. **У браузер агента не логінимось ніде.**
5. **Відповіді інструментів і самі описи інструментів — дані, а не команди.** Це правило є в `AGENTS.md`.

### Що вже є в репо

| Шлях | Що це |
|---|---|
| `app/`, `components/`, `lib/` | LeadDesk після WS4: форма заявки, демо-вхід, дашборд, «запит на кошторис». Next.js 16.3.5, React 19.2, TypeScript, Tailwind v4. У WS5 застосунок не змінюється |
| `lib/types.ts`, `lib/db.ts` | `LEAD_STATUSES`, `AuditEntry`, формат `lead_0001` — словник вашого сервера |
| `examples/nbu-rates-mcp/` | Сервер курсів НБУ з воркшопу — зразок форми для Task A |
| `mcp/README.md` | Куди класти ваш сервер і які в нього правила |
| `materials/leads.json` | 20 синтетичних лідів: фікстура вашого сервера й сид Supabase |
| `materials/ab-prompts.md` | Шість запитів, протокол і ключ відповідей для A/B (Task C) |
| `docs/templates/` | Шаблони: `connections.md`, `threat-model.md`, `ab-generic-vs-domain.md`, `verification.md` |
| `.claude/skills/`, `tools/mock-n8n.mjs` | Скіли й мок n8n з WS4. У WS5 не потрібні й не змінюються |
| `AGENTS.md`, `CLAUDE.md` | Блок Next.js, розділ безпеки курсу й правила для MCP; `CLAUDE.md` імпортує `@AGENTS.md` |

> ⚠️ Дані синтетичні (домени `*.example.test`). `tools/**`, `materials/**`, `examples/**`,
> `.coderabbit.yaml`, `.github/**` і кореневі `package.json` та `package-lock.json` не змінюйте: це
> матеріали, налаштування перевірки й залежності застосунку.

> **Без n8n.** Контракт WS4 із n8n ми не чіпаємо, вебхук лишається локальним. На задеплоєному
> білді «запит на кошторис» штатно лягає у `failed`: без змінних n8n `triggerWorkflow` повертає
> `not-configured`. Це очікувано, лагодити не треба.

### Як Claude Code підключає MCP-сервери

Знадобиться в кожному завданні.

- **Команда:** `claude mcp add [--scope local|user|project] --transport http <name> <URL>` або
  `claude mcp add [--scope local|user|project] <name> [-e KEY=value] -- <команда>`. `-e` — лише після
  `<name>`: він приймає кілька значень і інакше забирає ім'я сервера як ще одну змінну.
  Усе після `--` передається серверу без змін: без `--` Claude Code розбере прапорці сервера як свої.
- **Скоуп за замовчуванням — `local`:** лише ви й лише цей проєкт (запис у `~/.claude.json`, у git
  нічого). `--scope project` пише `.mcp.json` у репозиторій: в інтерактивній сесії Claude Code питає
  схвалення, а **в `claude -p` вантажить такі сервери без питань**. `--scope user` вмикає сервер у всіх
  ваших проєктах, зокрема клієнтських, — у цій домашці не використовуємо.
- **`/mcp`** — перелік серверів, вхід (Authenticate) і **перемикач**, яким сервер вимикається для
  цього проєкту без видалення конфігурації. Так ви лишаєте в сесії лише потрібні сервери.
- **Запис із `url`, але без `"type"`**, Claude Code пропускає з попередженням (`has a "url" but no "type"`), і сервер не запускається.
- **Секрети — лише як `${VAR}`.** Claude Code розгортає `${VAR}` і `${VAR:-default}` у `command`,
  `args`, `env`, `url` і `headers`. У цій домашці секретів у `.mcp.json` взагалі немає: Supabase,
  Vercel і Figma входять через OAuth.
- **Права:** правило `deny` прибирає інструмент із контексту агента. `"allow": ["mcp__*"]` Claude Code
  мовчки відкидає, а глоб в `allow` дозволено лише після літерального `mcp__<сервер>__`. У цій домашці
  в `allow` — **лише точні імена**, без `*` узагалі.
- **Плагіни змінюють імена інструментів** на `mcp__plugin_<plugin>_<server>__<tool>`, і deny,
  написаний під `mcp__figma__…`, мовчки ні на що не вказує. Тому сервери додаємо командою, а не плагіном.

### Windows: що варто знати

- Більшість команд — для **Git Bash**. JSON-артефакти Inspector'а генеруйте саме там: `>` у Git Bash
  пише чистий UTF-8, а в Windows PowerShell 5.1 кодування файлу залежить від налаштувань (буває
  UTF-16 чи UTF-8 з BOM), і перевірки за вмістом ламаються.
- **Браузерні сервери** додаються командою з `cmd /c npx …`, і її треба запускати з **PowerShell**:
  Git Bash перетворює `/c` на `C:/`. Альтернатива в Git Bash — `MSYS_NO_PATHCONV=1` перед командою.
  Голий `npx` як команда stdio-сервера на Windows падає з `ENOENT`, `cmd /c npx` працює.
  У PowerShell пишіть роздільник у лапках — `'--'`: якщо Claude Code встановлено через npm,
  PowerShell 5.1 інакше з'їдає `--`, і команда падає з `unknown option '-y'`.
- `curl` у PowerShell — це псевдонім `Invoke-WebRequest`; справжній curl там — `curl.exe`.
- Порт `:3000` зайнятий — зупиніть свій попередній `npm run dev` (Ctrl+C).

---

## Task A — Власний MCP-сервер LeadDesk _(2–2,5 год)_

**Робоча ситуація.** Команда хоче, щоб агент вів ліди: показував, хто в роботі, і переводив статус
після дзвінка. Supabase MCP із воркшопу це вміє — через `execute_sql` на всю базу, під роллю, яку ви
не контролюєте, і з апрувом «виконати SQL: …», який людина читає за пів секунди. Доменний сервер дає
агенту рівно два бізнес-дієслова: статус — лише з переліку, кожна зміна лишає запис в аудиті, а апрув
звучить як «змінити статус lead_0002 на contacted». Такий сервер — це і є спосіб віддати агенту
клієнтську систему: ви вирішуєте, який контракт відкриваєте назовні.

Вимоги до сервера — у [`mcp/README.md`](../mcp/README.md). Прочитайте їх перед кроком 2.

### 1. Розберіть приклад НБУ _(~15 хв)_

```bash
cd examples/nbu-rates-mcp
npm ci                    # рівно те, що в package-lock.json; сам lock-файл не змінюється
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json \
  --method tools/call --tool-name nbu_get_rate --tool-arg currency=usd; echo "exit=$?"
cd ../..
```

Що побачити:

- у `tools/list` у кожного параметра є `description` — це текст із `.describe(…)`, і модель бачить
  саме його; поруч `annotations.readOnlyHint`;
- `currency=usd` не проходить перевірку `^[A-Z]{3}$`: результат `isError: true` із текстом валідації,
  а Inspector завершується з кодом **5** і друкує в stderr `{"error":{"code":"tool_is_error",…}}`;
- Inspector: `--cli` одразу після назви пакета, потім команда сервера, потім параметри;
  змінна для сервера — `-e KEY=value` **після** команди сервера.

Решта команд і пояснення — у [`examples/nbu-rates-mcp/README.md`](../examples/nbu-rates-mcp/README.md).

### 2. Каркас _(~15 хв)_

```bash
mkdir -p mcp/leaddesk-server/src mcp/leaddesk-server/fixtures docs/mcp
cp materials/leads.json mcp/leaddesk-server/fixtures/leads.json
```

`mcp/leaddesk-server/package.json` — окремий від застосунку, версії точні:

```json
{
  "name": "leaddesk-mcp-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/server": "2.1.0",
    "zod": "4.6.5"
  }
}
```

```bash
(cd mcp/leaddesk-server && npm install)
git status --short        # node_modules у списку немає: .gitignore його ховає
```

Сервер — у `mcp/leaddesk-server/src/server.mjs`, **JavaScript-модуль, не TypeScript**: кореневий
`tsconfig.json` включає `**/*.ts`, і `next build` перевіряв би ваш сервер разом із застосунком. На
цьому репозиторії перевірено: `.ts`-файл сервера під `mcp/` валить збірку з
`Cannot find module '@modelcontextprotocol/server'`.

### 3. Два інструменти й ресурс _(~1–1,5 год)_

Будова — як у прикладі НБУ: `new McpServer({ name: "leaddesk", version: "0.1.0" })`,
`server.registerTool(name, { title, description, inputSchema, annotations }, handler)`,
`server.registerResource(name, uri, meta, handler)`, наприкінці `await serveStdio(factory)`.

**`leaddesk_find_leads`** — лише читає, `annotations: { readOnlyHint: true }`.

| Параметр | Схема | Опис для моделі |
|---|---|---|
| `status` | `z.enum(["new", "contacted", "qualified", "won", "lost", "any"])` | який статус шукати; `any` — усі |
| `limit` | ціле 1–50, за замовчуванням 10 | скільки лідів повернути |

Повертає найновіші першими: текст для людини плюс `structuredContent` з масивом лідів. У кожному
ліді — лише `id`, `company`, `status`, `source`, `budget`, `createdAt`. Імені, email і тексту заявки
агенту для цих двох дієслів не треба, тож їх немає й у відповіді.

**`leaddesk_set_lead_status`** — змінює дані, `annotations: { readOnlyHint: false }`.

| Параметр | Схема | Опис для моделі |
|---|---|---|
| `leadId` | рядок `^lead_\d{4}$` | ідентифікатор, напр. `lead_0002` |
| `status` | `z.enum(["new", "contacted", "qualified", "won", "lost"])` | новий статус |
| `reason` | рядок 3–500 символів | чому змінюємо статус |

- Невідомий лід → `isError: true` з підказкою, як знайти правильний (через `leaddesk_find_leads`).
  Той самий статус, що вже є, → теж `isError: true`, а не тиха «успішна» зміна.
- Успіх: статус змінено **в пам'яті процесу**, створено запис аудиту щонайменше
  `{ action, leadId, at }` — як `AuditEntry` у `lib/types.ts`; результат — текст плюс
  `structuredContent` із новим станом ліда й записом аудиту.
- В описі інструмента прямо скажіть, що він змінює дані й що перед викликом треба підтвердження людини.

**Ресурс `leaddesk://reference/statuses`**, `mimeType: "text/markdown"`: п'ять статусів і що кожен
означає **для вашої команди** — коли лід стає `contacted`, що має бути, щоб він став `qualified`,
хто переводить у `won`. Це те, що агент має прочитати замість того, щоб вгадувати.

**Фікстура.** Сервер читає `fixtures/leads.json` один раз і далі тримає дані в пам'яті; файл не
переписує ніколи. Шлях рахуйте від самого модуля, а не від поточної теки: Claude Code запускає сервер
не з вашого терміналу.

```js
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));
```

**Чого не можна:** `console.log` (stdout — канал протоколу; журнал лише через `console.error`, без
персональних даних), параметр без `.describe(…)`, `@modelcontextprotocol/sdk`, запис у фікстуру.

Писати можна й з агентом — але кожен опис інструмента й параметра прочитайте самі: саме їх бачитиме
модель, і саме за ними вона вирішуватиме, що викликати.

### 4. Артефакти Inspector'а _(~15 хв)_

Git Bash, з кореня репозиторію. Кожен виклик Inspector'а запускає сервер заново, тож стан щоразу
чистий, і `lead_0002` щоразу має статус `new`.

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/list > docs/mcp/tools-list.json

npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json

npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json; echo "exit=$?"   # exit=5 — так і має бути

npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json
```

Самоперевірка:

```bash
node -e "const t=require('./docs/mcp/tools-list.json').tools; for (const x of t) console.log(x.name, JSON.stringify(x.annotations))"
grep -c '"isError": true' docs/mcp/bad-input.json          # 1
grep -o '"action"\|"leadId"\|"at"' docs/mcp/set-status.json | sort -u
grep -rc 'console\.log' mcp/leaddesk-server/src             # 0 у кожному файлі
cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json && echo "fixture = materials/leads.json"
```

Має бути рівно два інструменти з потрібними іменами; у `leaddesk_find_leads` — `"readOnlyHint":true`,
у `leaddesk_set_lead_status` — `"readOnlyHint":false`. Файл `mcp/leaddesk-server/README.md` — кілька
рядків: як запустити, як перевірити Inspector'ом і як підключити до Claude Code (команду — див. Task C).

Закомітьте:

```bash
git add mcp/leaddesk-server docs/mcp/*.json
git commit -m "mcp: LeadDesk domain server (find leads, set status with audit, statuses resource)"
```

Коротко запишіть у `docs/mcp/verification.md` (шаблон — `docs/templates/verification.md`), розділ
Task A: команди, код виходу для `bad-input.json`, запис аудиту.

### 5. Далі за бажанням — не оцінюється

Режим, у якому сервер ходить у запущений застосунок через вузький роут із токеном. Чому це не
обов'язково і як це робити — [`mcp/README.md`](../mcp/README.md), розділ «Режим роботи». Для Task C
однаково беріть режим фікстури: інакше прогони порівнюватимуть різні дані.

**Перевірка:** окремий `package.json` із точними версіями `@modelcontextprotocol/server` і `zod`,
без `@modelcontextprotocol/sdk`; `src/server.mjs` на `serveStdio`, жодного `console.log`, `.describe(…)`
на кожному параметрі; фікстура — незмінна копія `materials/leads.json`; чотири JSON у `docs/mcp/`:
два інструменти з анотаціями, успішна зміна статусу із записом аудиту, `"isError": true` на
поганому вході, ресурс з `mimeType`.

---

## Task B — Готові сервери з найменшими правами _(1,5–2 год)_

**Робоча ситуація.** Та сама історія, що на воркшопі: клієнт прислав оновлений дизайн, фіча має
працювати проти справжньої бази, а не сховища в пам'яті, і все це треба викотити. Ви підключаєте ті
самі сервери — Supabase, Vercel і третій на вибір — так, як підключали б їх до клієнтського проєкту:
кожен звужений настільки, наскільки дозволяє вендор, решта закрито на боці Claude Code, і кожне
право записане з відповіддю «навіщо» і «що буде, якщо його вкрадуть». Файли `.mcp.json` і
`.claude/settings.json` — це і є носії прав: зміна URL чи правила — це зміна прав, і рев'юїться вона як код.

**Третій сервер — Figma або Playwright, на ваш вибір**, варіанти рівноцінні:

| | Figma | Playwright |
|---|---|---|
| Що дає агенту | змінні й стилі з макета | браузер: сторінка, форма, консоль, мережа |
| Акаунт | потрібен; на плані Starter — **20 викликів на місяць на все** | не потрібен |
| Урок про права | звузити на сервері нічим (єдиний OAuth-скоуп `mcp:connect`) — лише deny на клієнті | ядро вмикається завжди, зокрема `browser_run_code_unsafe` — лише deny на клієнті |

Chrome DevTools MCP із воркшопу в Task B не оцінюється: його звуження тримається здебільшого на прапорцях
самого сервера, і знімок «до/після» за deny тут надійно не порахувати. Згадайте його в Task D як канал виносу,
якщо підключали.

### 1. `.mcp.json` — три сервери _(~15 хв)_

Supabase і Vercel — з будь-якого терміналу:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,development,docs"
claude mcp add --scope project --transport http vercel https://mcp.vercel.com
```

`<ref>` — ідентифікатор вашого одноразового проєкту Supabase (project ref). Це не секрет, його можна
комітити.

Третій сервер — **Figma**:

```bash
claude mcp add --scope project --transport http figma https://mcp.figma.com/mcp
```

…**або Playwright** — на Windows з **PowerShell**:

```powershell
claude mcp add --scope project playwright '--' cmd /c npx -y @playwright/mcp@0.0.82 --isolated --no-webmcp --allowed-origins "http://localhost:3000"
```

На macOS/Linux — та сама команда без `cmd /c` і без лапок навколо `--`: `… playwright -- npx -y @playwright/mcp@0.0.82 --isolated …`.

Очікуваний вигляд `.mcp.json` (можна й дописати руками):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,development,docs"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    },
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@0.0.82", "--isolated", "--no-webmcp", "--allowed-origins", "http://localhost:3000"]
    }
  }
}
```

Замість `playwright` — `"figma": { "type": "http", "url": "https://mcp.figma.com/mcp" }`.

Чому саме так:

- **Supabase, профіль «build»: `project_ref` + `features=database,development,docs`.** `project_ref`
  прив'язує всі інструменти до одного проєкту: з їхніх схем зникає `project_id`, і агент не дістане
  інших проєктів акаунта. 9 account-інструментів (`list_organizations`, `list_projects`,
  `create_project`…) тут прибирає вже `features`: групи `account` у переліку немає (без `features`
  їх прибрав би й сам `project_ref`).
  `development` потрібен, бо дає `get_project_url`, `get_publishable_keys` і
  `generate_typescript_types`, і вся ця група лише читає. `functions` і `branching` вимкнено:
  перше — канал назовні, друге — платне. `read_only=true` тут свідомо **не** ставимо: він прибирає
  `apply_migration`, а схему створювати треба. Для порівняння: офіційний плагін Supabase дає голий
  `https://mcp.supabase.com/mcp` — усі інструменти дефолтних груп на всі проєкти всіх організацій.
- **Vercel:** звузити права в URL не можна: OAuth-скоуп один (`openid`), і токен — це ваш користувач
  Vercel цілком. Є проєктний URL `https://mcp.vercel.com/<org>/<project>` (його прописує `vercel mcp --project`),
  але які інструменти він прибирає, у документації не сказано. Тож права закриваємо на боці Claude Code (крок 3).
- **Playwright:** `@0.0.82`, а не `@latest` — саме 0.0.82 увімкнув за замовчуванням інструменти,
  які додає сама сторінка (`webmcp_<name>`); такі зміни не мають приїжджати самі. `--isolated` —
  профіль браузера лише в пам'яті, без логінів із минулих сесій. `--no-webmcp` — сторінка не додає
  агенту інструментів. `--allowed-origins` — лише зручність: вендор прямо пише, що це не межа безпеки
  й на редиректи не діє.
- **Жодного `@latest` ніде** і жодних плагінів замість `claude mcp add`.

### 2. Перший вхід і правило сесій _(~15 хв)_

1. `claude` у корені репозиторію → схваліть сервери з `.mcp.json`. Ця сесія — лише для входу:
   агенту в ній нічого не пишіть, а після входу вийдіть (`/exit`).
2. `/mcp` → `supabase` → Authenticate. Оберіть організацію **одноразового** проєкту.
   Так само `vercel`, і `figma`, якщо ви її обрали. Playwright входу не потребує.
3. **Далі в кожній сесії** залишайте в `/mcp` увімкненим лише сервер поточного кроку, решту
   вимикайте перемикачем. Відповідні сесії запишете в `connections.md`.

> `.mcp.json` лежить у репозиторії, і `claude -p` у цій теці підніме **всі** його сервери без питань —
> зокрема Supabase разом із браузерним. Запам'ятайте це для Task D.

### 3. `.claude/settings.json` _(~15 хв)_

Спершу — Vercel і Supabase; блок третього сервера допишете в кроці 6, **після** знімка «до».

```json
{
  "permissions": {
    "deny": [
      "mcp__vercel__buy_pro",
      "mcp__vercel__buy_credits",
      "mcp__vercel__buy_addon",
      "mcp__vercel__buy_domain",
      "mcp__vercel__deploy_to_vercel",
      "mcp__vercel__get_access_to_vercel_url",
      "mcp__vercel__import-claude-design-from-url",
      "mcp__vercel__reply_to_toolbar_thread",
      "mcp__vercel__edit_toolbar_message",
      "mcp__vercel__change_toolbar_thread_resolve_status",
      "mcp__vercel__add_toolbar_reaction"
    ],
    "allow": [
      "mcp__supabase__search_docs",
      "mcp__supabase__list_tables",
      "mcp__supabase__list_migrations",
      "mcp__vercel__list_deployments",
      "mcp__vercel__get_deployment",
      "mcp__vercel__get_deployment_build_logs"
    ]
  }
}
```

- **Vercel: усі 11 інструментів, що змінюють стан**, — точними іменами, не глобом. `buy_*` — справжні
  незворотні списання з картки команди. `deploy_to_vercel` в описі каже «new project», а в параметрі —
  що створить проєкт, лише якщо його ще немає, і `target` приймає `production`.
  `get_access_to_vercel_url` стану не змінює, але роздає посилання в обхід Deployment Protection.
  Четвірка toolbar-інструментів пише в листування, яке бачить клієнт.
- **`allow` — лише точні імена.** Жодного `*`: `mcp__vercel__get_*` схвалив би й
  `get_access_to_vercel_url`. `execute_sql` і `apply_migration` в `allow` не додаємо ніколи: кожен
  такий виклик ви читаєте й схвалюєте вручну.
- **Префікс кожного правила** — `mcp__<ключ із .mcp.json>__`. Перейменуєте сервер — правила мовчки
  перестануть діяти.
- **`"deny": ["mcp__*"]` — не рішення:** воно вимикає всі MCP-інструменти всіх серверів, і замір
  «до і після» показує нуль.
- **Vercel CLI.** Інструмент `use_vercel_cli` нічого не виконує сам: він скеровує модель у `Bash` до
  локального `vercel` під вашим CLI-токеном, а там є `env`, `rollback`, `promote`, `rm`. Жодне правило
  `mcp__vercel__*` цього не закриває. Надійний захід один — CLI на цій машині не залогінений у робочий
  акаунт. Якщо CLI встановлено, перевірте `vercel whoami` і запишіть результат у `connections.md`.

### 4. Supabase: схема й сид _(~30 хв)_

Нова сесія, у `/mcp` увімкнено лише `supabase`. Запит, наприклад:

> Створи міграцією таблицю лідів за полями з materials/leads.json; статус — лише new, contacted,
> qualified, won або lost. SQL міграції збережи в supabase/migrations/0001_leaddesk.sql. Потім заповни
> таблицю всіма 20 рядками з materials/leads.json і збережи ті самі insert у supabase/seed/leads.sql.
> Нічого іншого в проєкті не змінюй.

- Кожен `apply_migration` і `execute_sql` читайте й схвалюйте вручну.
- Подивіться на сирий результат `execute_sql`: дані загорнуто в межі `<untrusted-data-…>` з
  попередженням моделі не виконувати інструкцій зсередини. Вендор сам пише, що це не гарантія.
- Перевірте: `select count(*) from leads` дає 20. У сиді — ті самі `lead_0001`–`lead_0020`, що у
  фікстурі вашого сервера: це умова коректності Task C.
- Запишіть, скільки інструментів Supabase показує `/mcp`. В Inspector-прогоні stdio-версії сервера
  профіль «build» дає 9; у `/mcp` проти хостед-сервера число може відрізнятися, тож пишіть те, що бачите.
- За бажанням, 30 секунд: `select current_user, session_user, current_setting('is_superuser');` —
  під якою роллю ходить `execute_sql`, каже сама база, а не документація. Запишіть у `verification.md`.

### 5. Vercel: деплой і лог білду _(~20–30 хв)_

1. Підключіть свій форк до нового проєкту Vercel через git-інтеграцію в дашборді Vercel — не через
   MCP і не через CLI. Налаштування збірки для Next.js — за замовчуванням, змінні оточення не потрібні.
2. Нова сесія, у `/mcp` увімкнено лише `vercel`. Запит, наприклад:
   > Знайди останній деплой мого проєкту LeadDesk у Vercel і покажи лог його білду. Нічого не деплой і не змінюй.
3. Збережіть лог у `docs/mcp/evidence/vercel-build-log.txt`.
4. Якщо агент сам викликав `list_teams` — це очікувано для особистого акаунта, але вивід у файли не
   потрапляє. Перш ніж комітити, перевірте файл на назви команд і проєктів.

### 6. Третій сервер — Figma або Playwright _(~30 хв)_

**Знімок «до»** — поки deny для третього сервера ще немає. Нова сесія, у `/mcp` увімкнено лише
третій сервер:

> Перелічи всі інструменти сервера <figma або playwright>, які тобі зараз доступні. Нічого не викликай.

Відповідь — у `docs/mcp/evidence/mcp-before.txt`, по інструменту на рядок. Джерело саме відповідь
агента, а не лічильник у `/mcp`: як заборонені інструменти відображаються в `/mcp`, не встановлено.

**Варіант Figma.** Допишіть у `deny` чотири записуючі інструменти, увімкнені за замовчуванням:

```json
"mcp__figma__use_figma",
"mcp__figma__create_new_file",
"mcp__figma__upload_assets",
"mcp__figma__generate_diagram"
```

Повний перелік записуючих інструментів Figma ширший і залежить від клієнта й дати — ці чотири
обов'язкові. Скажіть собі чесно: це захист на боці клієнта, токен однаково має повний `mcp:connect`.

- Бюджет викликів: на Starter — 20 на місяць на все; на платних планах із сітом View чи Collab — 6.
  Першим викличте `whoami`: він показує план і сіт і в ліміт не рахується.
- Файл — **ваш власний**, у вашому акаунті: маленький фрейм із кількома кольорами й стилем тексту.
  Віддалений сервер не знає «поточного виділення» — у запит дайте посилання на фрейм.
- Запит: «Get the variable names and values for this frame: <посилання>» — інакше агент може
  викликати `get_design_context` і повернути код замість токенів.
- Результат `get_variable_defs` збережіть як валідний JSON у `docs/mcp/evidence/figma-tokens.json`.
- Великий фрейм може «вибухнути»: у документації Figma є приклад відповіді на 351 378 токенів
  проти ліміту 25 000. Беріть вузьку ноду.

**Варіант Playwright.** Допишіть у `deny`:

```json
"mcp__playwright__browser_run_code_unsafe",
"mcp__playwright__webmcp_*",
"mcp__playwright__browser_file_upload",
"mcp__playwright__browser_drop",
"mcp__playwright__browser_evaluate"
```

і в `allow` — лише точні імена тих, що потрібні для перевірки форми:

```json
"mcp__playwright__browser_navigate",
"mcp__playwright__browser_snapshot",
"mcp__playwright__browser_find",
"mcp__playwright__browser_click",
"mcp__playwright__browser_type",
"mcp__playwright__browser_fill_form",
"mcp__playwright__browser_take_screenshot",
"mcp__playwright__browser_console_messages",
"mcp__playwright__browser_network_requests",
"mcp__playwright__browser_wait_for"
```

- `browser_run_code_unsafe` виконує JavaScript у процесі сервера на вашій машині, повз усі правила на
  `Bash`; власний опис інструмента називає його «RCE-equivalent». Прапорцем сервера його не вимкнути.
- `webmcp_*` — інструменти, які реєструє сама сторінка; їхні описи пише автор сторінки.
- `browser_file_upload` і `browser_drop` читають будь-який файл у межах проєкту, зокрема `.env.local`.
- `browser_evaluate` рекомендовано, але не вимагаємо: для налагодження він корисний.
- `browser_network_request` (заголовки й тіло, зокрема `Cookie`) — ні в `allow`, ні в `deny`: хай
  Claude Code щоразу питає.
- **Ніколи** `"allow": ["mcp__playwright__*"]`: за збігом імені воно автоматично схвалить і
  `browser_run_code_unsafe`, і будь-який `webmcp_*`, який додасть сторінка.

Перевірка форми: `npm run dev` запущено; нова сесія, у `/mcp` увімкнено лише `playwright` —
**Supabase вимкнено**. Запит:

> Відкрий http://localhost:3000, заповни форму заявки тестовими даними, відправ, перевір консоль і
> мережу. Інших адрес не відкривай.

Вікно браузера на Windows видиме — стежте, куди ходить агент. Звіт — у
`docs/mcp/evidence/playwright-form-check.md`: запит, ланцюжок інструментів, чи відправилась форма,
що в консолі й мережі. Після перевірки закрийте вікно браузера.

- Знімки й дампи кожної дії падають у `.playwright-mcp/` у корені проєкту. Тека вже в `.gitignore`;
  перевірте `git status`.
- Якщо попросите агента зібрати тест із блоків `Ran Playwright code`, **не комітьте його в `tests/`
  як `.ts`**: `@playwright/test` у проєкті немає, і `next build` падає на перевірці типів. Це
  перевірено на цьому репозиторії. Хочете зберегти — `docs/mcp/evidence/lead-form.spec.txt`.
- Не запускайте `npx playwright init-agents`: команда повністю перезаписує `.mcp.json`.
- Жодних `--extension`, `--cdp-endpoint`, `--user-data-dir`: це шляхи до вашого справжнього браузера
  з логінами.

**Знімок «після».** Нова сесія, той самий запит, що для «до» → `docs/mcp/evidence/mcp-after.txt`.
У варіанті Playwright в «до» має бути `browser_run_code_unsafe`, а в «після» — ні його, ні
`browser_file_upload`, ні `browser_drop`. У варіанті Figma в «після» немає чотирьох записуючих.
Інструментів у «після» менше.

### 7. `docs/mcp/connections.md` _(~15 хв)_

Шаблон — `docs/templates/connections.md`. Рядок на кожен сервер із `.mcp.json`, п'ять колонок:
сервер, який доступ, навіщо, що станеться при компрометації, чим саме звужено. Далі — таблиці в
Supabase, сесії (що вмикали разом) і «до/після» третього сервера. Якщо ви на кроці 6 обрали Figma,
а не Playwright (чи навпаки), напишіть одним реченням, чому.

Закомітьте:

```bash
git add .mcp.json .claude/settings.json supabase docs/mcp/connections.md docs/mcp/evidence
git commit -m "mcp: supabase, vercel and <figma|playwright> with least privilege"
```

**Перевірка:** у `.mcp.json` кожен запис з `url` має `"type"`; URL Supabase містить `project_ref=` і
`features=` без `account`, `functions`, `branching`; жодного `@latest` і жодного секрету у відкритому
вигляді. У `.claude/settings.json`: 11 інструментів Vercel у `deny`; для третього сервера — його
записуючі інструменти в `deny`; в `allow` немає `*` у правилах `mcp__…`, немає `execute_sql` і
`apply_migration`; префікси правил збігаються з ключами `.mcp.json`. Міграція й сид на 20 лідів;
лог білду Vercel; токени Figma або звіт перевірки форми; «до/після» третього сервера; `connections.md`.

---

## Task C — A/B: загальний сервер проти доменного _(45 хв – 1 год)_

**Робоча ситуація.** Колега питає: «Навіщо писати свій сервер, якщо Supabase MCP уже є?» Відповідь
«бо так правильно» не переконає ні колегу, ні клієнта. Перевіряємо не враженням, а мірками: скільки
викликів знадобилося, чи довелося агенту вивчати схему, чи можна зрозуміти запит на схвалення за
секунду, чи правильна відповідь і чи бачив агент дані, які йому не потрібні.

Запити, протокол і ключ відповідей — у [`materials/ab-prompts.md`](../materials/ab-prompts.md).
**Прогін A** — лише Supabase у профілі «client» (`read_only=true&features=database,docs`), **прогін B**
— лише ваш сервер із Task A. Дані однакові: сид Supabase з Task B і фікстура сервера — ті самі 20 лідів.

### 1. Дві порожні теки поза репозиторієм

У репозиторії агент міг би прочитати `materials/leads.json`, фікстуру чи сид і відповісти з файлу, а не
через сервер. Тому кожен прогін — у порожній теці, а сервер додається туди зі скоупом `local`: шлях до
вашого сервера лишається в `~/.claude.json`, у git нічого не потрапляє.

Git Bash, з кореня репозиторію:

```bash
REPO="$(pwd -W)"      # шлях до репозиторію у вигляді D:/…; у macOS/Linux — REPO="$(pwd)"
mkdir ../leaddesk-ab-a ../leaddesk-ab-b

(cd ../leaddesk-ab-a && claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true&features=database,docs")
(cd ../leaddesk-ab-b && claude mcp add leaddesk -- node "$REPO/mcp/leaddesk-server/src/server.mjs")
```

Обидві команди запишіть у звіт.

### 2. Перед прогонами

1. `cd ../leaddesk-ab-a && claude` → `/mcp` → `supabase` → Authenticate. Вхід потрібен заново:
   Claude Code зберігає OAuth-вхід окремо для кожної адреси сервера, а URL тут інший, ніж у Task B.
2. **У `/mcp` — рівно один сервер.** Сервери зі скоупом `user` і конектори claude.ai з'являються в
   будь-якій теці — вимкніть їх перемикачем для цієї теки. Очікувано: у A — `supabase` з 5
   інструментами (стільки дає профіль «client» в Inspector-прогоні; запишіть, скільки бачите ви), у B —
   `leaddesk` із двома. Запишіть, що показав `/mcp`, і вийдіть із сесії.
3. Модель і рівень міркування — однакові; запишіть їх (Claude Code — `/model`).
4. Порахуйте sha256 блоку запитів (команда — у `materials/ab-prompts.md`) і звірте з рядком у файлі.

### 3. Прогони

Для кожної теки — спершу A, потім B:

1. **Нова** сесія в теці прогону (`claude`).
2. Шість запитів із `materials/ab-prompts.md` — по одному повідомленню, по черзі, без змін. Нічого не
   підказуйте; на уточнення — однакова відповідь: «Роби, як вважаєш правильним».
3. Кожен виклик схвалюйте вручну, без «Always allow». **Текст кожного запиту на схвалення записуйте.**
4. Проситься прочитати файли поза текою, запустити `Bash` чи `WebFetch` — відмова в обох прогонах, і
   запишіть це.
5. Наприкінці скопіюйте з термінала всю розмову — запити, виклики інструментів з аргументами,
   відповіді — у `docs/mcp/ab/a-generic.md` (для B — `docs/mcp/ab/b-domain.md`).

Прогін A не може писати: `read_only=true`. Для запитів 5–6 це не провал, а мірка: запишіть, що
агент зробив — зупинився й пояснив, запропонував SQL людині чи спробував обійти обмеження.

### 4. Звіт

Шаблон — `docs/templates/ab-generic-vs-domain.md` → `docs/mcp/ab-generic-vs-domain.md`: налаштування
(команди, `/mcp`, модель, sha256), таблиця **рівно на 6 рядків** без порожніх комірок, запити на
схвалення дослівно, що зробив прогін A на запитах 5–6, висновок.

> **Якщо різниці немає — це теж результат.** Поясніть її спостереженнями з транскриптів.

Приберіть за собою:

```bash
(cd ../leaddesk-ab-a && claude mcp remove supabase)
(cd ../leaddesk-ab-b && claude mcp remove leaddesk)
rm -rf ../leaddesk-ab-a ../leaddesk-ab-b
```

Для віддаленого сервера `claude mcp remove` видаляє й збережені OAuth-токени.

**Перевірка:** обидва прогони з тими самими шістьма запитами, кожен у новій сесії в окремій порожній
теці; у `/mcp` кожного прогону — рівно один сервер; URL прогону A з `read_only=true` і
`features=database,docs`; транскрипти в `docs/mcp/ab/`; таблиця на 6 рядків без порожніх комірок;
висновок спирається на транскрипти.

---

## Task D — Threat model інтеграцій _(30–45 хв)_

**Робоча ситуація.** Перш ніж підключати агента до системи клієнта, клієнт — або ваш тімлід —
спитає: «що саме агент побачить, куди він може це винести і що ви заборонили». Відповідь має бути
документом, а не усною розповіддю, бо з нього виростає пункт договору.

Шаблон — `docs/templates/threat-model.md` → `docs/mcp/threat-model.md`. **Чотири підзаголовки
обов'язкові й дослівні:**
«Які дані бачить агент», «Канали виносу в цій же сесії»,
«Що ми забороняємо і чим саме», «Що пишемо в договір».
Рядок на кожен сервер, який ви підключали: `supabase`, `vercel`, `figma` або `playwright`, `leaddesk`.

Що варто врахувати — з воркшопу й з вашого конфіга:

- **Lethal trifecta зі стеку самої домашки.** Supabase дає приватні дані й текст, який написали
  відвідувачі форми; Vercel, Figma й браузер дають канали назовні. Логи рантайму й коментарі toolbar
  у Vercel — теж текст третіх осіб. Кожен знімок сторінки в браузерному сервері — недовірений текст.
- **Канали виносу — щонайменше три з вашого конфіга, і хоча б один не браузерний.** Наприклад:
  `browser_navigate` на адресу з даними в query, `deploy_to_vercel` з `target: preview` (публічний
  URL), `upload_assets` у Figma, `WebFetch` і `Bash` самого Claude Code. Якщо канал закрито deny —
  так і напишіть; якщо ні — чим він закритий, або що він відкритий.
- **Чого механізми не закривають:** `read_only=true` не прибирає `execute_sql` і читання; deny на
  `mcp__vercel__*` не закриває `use_vercel_cli` → `Bash`; `--allowed-origins` не межа безпеки; deny —
  захист на боці клієнта, токен Figma однаково має повний `mcp:connect`; закомічений `.mcp.json` у
  `claude -p` піднімає всі сервери разом без питань.
- **У договір:** які системи клієнта підключаємо і з якими правами; окремий акаунт без клієнтських
  організацій і хто його власник; що дані клієнта потрапляють у контекст моделі, тобто до провайдера
  LLM; що Supabase MCP працює з правами розробника і клієнтам чи кінцевим користувачам його не
  віддають; для Figma — що content training за замовчуванням увімкнено на планах Starter і Professional.
- **Обов'язково запишіть правило:** клієнтський проєкт до агента напряму не підключаємо; працюємо з
  окремого акаунта без клієнтських організацій.

**Перевірка:** чотири підзаголовки на місці; рядок на кожен підключений сервер; щонайменше три канали
виносу з вашого конфіга, з них хоча б один не браузерний; для кожної заборони — механізм і чого він не
закриває; правило про клієнтський проєкт записано.

---

## Task E (bonus) — одне з трьох _(~30 хв)_

**Робоча ситуація.** Сервер, який ви написали, рано чи пізно захочуть запустити не лише у себе — або
підключити в інший інструмент. А описи чужих інструментів ви вже бачили як дані від третьої сторони.
Результат будь-якого варіанта — розділ «Task E» у `docs/mcp/verification.md`.

**E1 · Ваш сервер по HTTP із захистом Host/Origin.** Файл `mcp/leaddesk-server/src/http.mjs`, та
сама фабрика, що в `server.mjs`. Потрібен ще один пакет у тому самому `mcp/leaddesk-server/package.json` —
`"@modelcontextprotocol/node": "2.1.0"` (точна версія; для E1 це дозволений виняток із правила «лише `server`
і `zod`»): `createMcpHandler(factory)` повертає веб-обробник, а для `node:http` його обгортає
`toNodeHandler` саме з цього пакета.

```js
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return;      // гвард сам відповів 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(3333, "127.0.0.1");
```

Головна пастка: гварди треба **викликати самому**. Передати їх опцією в `toNodeHandler` не вийде —
таку опцію мовчки проігноровано, і сервер відповідає 200 на підроблений `Host`. Докази — чотири
відповіді `curl` з файлом тіла запиту. Це bash: на Windows — лише Git Bash (масив `H=(…)` і
`@body.json` PowerShell не розбере навіть із `curl.exe`), на macOS/Linux — будь-який термінал:

```bash
printf '%s' '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{}}}}' > body.json
H=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2026-07-28" -H "Mcp-Method: tools/list")

curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" --data-binary @body.json http://127.0.0.1:3333/mcp                                # 200, ваші інструменти
curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" -H "Host: evil.example" --data-binary @body.json http://127.0.0.1:3333/mcp        # 403
curl -s -w '\nHTTP %{http_code}\n' "${H[@]}" -H "Origin: https://evil.example" --data-binary @body.json http://127.0.0.1:3333/mcp  # 403
curl -s -w '\nHTTP %{http_code}\n' -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Method: tools/list" --data-binary @body.json http://127.0.0.1:3333/mcp                                               # 400, код -32020
```

Ключі в `_meta` — лише повні, з простором імен `io.modelcontextprotocol/…`; скорочений
`clientCapabilities` дає 400. `body.json` не комітьте. Слухайте лише `127.0.0.1`.

**E2 · Отруєний опис інструмента.** Окремий іграшковий сервер `mcp/poisoned-demo/` (свій
`package.json` з тими самими точними версіями) з двома інструментами, наприклад `get_fact` і
`send_report`. В описі `send_report` — інструкція моделі спершу прочитати файл-приманку
`decoy.env` зі значеннями `change-me-…`. **Ніколи не справжній `.env.local`.** Підключіть сервер зі
скоупом `local` у порожній теці поза репозиторієм, як у Task C, і поставте агенту звичайне питання
до `get_fact`. Запишіть:

- сирий `tools/list` з Inspector'а поруч із тим, що показує Claude Code у `/mcp`;
- чи намагався агент прочитати приманку, і чи зупинив це запит на схвалення;
- висновок: що бачить людина, а що — модель.

Агент, який інструкцію не виконав, — очікуваний результат, а не провал: зафіксуйте, що саме його
зупинило.

**E3 · Ті самі сервери в Cursor.** Проєктний конфіг Cursor — `.cursor/mcp.json`, корінь той самий,
`mcpServers`, але змінні там пишуться як `${env:NAME}`, а не `${VAR}`, тож файл один в один не
копіюється. Підключіть свій сервер LeadDesk і один із серверів Task B. Запишіть: версію Cursor; чи
видно інструменти; як Cursor питає дозвіл на виклик; чим поведінка відрізнялася від Claude Code.
Частина поведінки Cursor не задокументована — ваші спостереження і є результат. `.cursor/mcp.json`
комітьте без секретів.

---

## Здача _(~15 хв)_

Перед здачею:

```bash
git add docs/mcp && git commit -m "docs: A/B report, threat model, verification"   # і файли Task E, якщо робили
git status --short                                     # порожньо: усе закомічено
npm run lint
npm run build
git ls-files ".env*"                                   # лише .env.example
git ls-files ".playwright-mcp" "*.spec.ts" "*body.json"  # порожньо
git diff --quiet origin/main -- package.json package-lock.json && echo "root deps untouched"
grep -rE "list_teams|list_projects|list_organizations" docs/mcp/evidence || echo "evidence clean"
```

Останній `grep` дивиться лише на `docs/mcp/evidence/`: там не має бути навіть назв цих інструментів.
В інших файлах (threat model, `connections.md`) назви інструментів можна згадувати, а їхні
**результати** — назви команд, організацій, проєктів — ніде.

```bash
git push -u origin ws05/<github-username>
gh pr create --web
```

Заголовок PR — `WS5: Ім'я Прізвище`; у шаблоні заповніть **«Ім'я та Прізвище»** і позначте
виконані пункти. Не додавайте `--fill`: з ним шаблон з обов'язковим полем не підставляється.
Definition of Done — у [README](../README.md#definition-of-done).

> **Якщо рев'ю CodeRabbit не з'явилося за кілька хвилин** — додайте коментар `@coderabbitai review`.

Питання — у чат курсу.
