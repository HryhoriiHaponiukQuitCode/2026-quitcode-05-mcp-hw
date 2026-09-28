# Приклад: курси НБУ як MCP-сервер

Сервер, який ми будуємо наживо в частині 2 воркшопу. Офіційні курси Національного банку України з
відкритого API `bank.gov.ua` — без ключа й без акаунта. Це **зразок форми** для вашого Task A: ваш
сервер LeadDesk має ту саму будову, лише з іншою системою за ним і з одним інструментом, що змінює стан.

> Тека — матеріал воркшопу. Не змінюйте її: свій сервер будуйте в `mcp/leaddesk-server/`
> (вимоги — у [`mcp/README.md`](../../mcp/README.md)).

## Що всередині

| Файл | Що це |
|---|---|
| `server.mjs` | Увесь сервер: два інструменти, один ресурс, `serveStdio(factory)`. Чистий Node, без збірки |
| `fixtures/rates.json` | Справжні курси НБУ на 25.09.2026 (USD, EUR, PLN, GBP, CHF) для офлайн-режиму |
| `package.json` | Точні версії: `@modelcontextprotocol/server` **2.1.0** і `zod` **4.6.5** — без `^` |
| `package-lock.json` | Зафіксоване дерево залежностей |

| Що в сервері | Тип | Навіщо |
|---|---|---|
| `nbu_get_rate` | інструмент, `readOnlyHint: true` | курс гривні до валюти на дату |
| `nbu_convert` | інструмент, `readOnlyHint: true` | перерахунок суми через гривню, округлення до копійок |
| `nbu://reference/currencies` | ресурс, `text/markdown` | перелік валют, для яких НБУ встановлює курс |

На що дивитися в коді, бо саме це перевіряють у Task A:

- `inputSchema` — **об'єкт Zod-полів**, а не `z.object({…})`; у кожного поля є `.describe(…)`. Опис
  параметра — єдина документація, яку бачить модель.
- Невалідний вхід (`usd` замість `USD`) SDK відхиляє сам, і клієнт отримує `isError: true` із текстом
  валідації. Помилку з даними (невідома валюта) сервер повертає теж як `isError: true` з підказкою, що
  робити далі, а не кидає виняток.
- Жодного `console.log`: у stdio-сервера stdout — це канал протоколу. Журнал, якщо він потрібен, —
  лише в stderr (`console.error`).
- Офлайн-режим: змінна `NBU_FIXTURE` перемикає сервер з мережі на файл. Це план Б на сцені й основа
  для перевірок без мережі.

## Запуск

Потрібно Node.js ≥ 22.19 (цього вимагає MCP Inspector 2.8.0; найпростіше — Node 24). Команди нижче —
для **Git Bash** на Windows (у macOS/Linux — будь-який термінал), з цієї теки:

```bash
cd examples/nbu-rates-mcp
npm install
```

`node server.mjs` запускає сервер і чекає клієнта на stdin — це нормально, термінал просто «висить».
Зупинка — Ctrl+C. Говорити з ним зручніше через Inspector.

## Inspector CLI

Прапорець `--cli` стоїть **одразу** після назви пакета, далі — команда сервера, далі — параметри
Inspector. Змінна оточення для сервера передається як `-e KEY=value` **після** команди сервера (так
вона працює й на Windows).

```bash
# які інструменти бачить клієнт (офлайн)
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json --method tools/list

# виклик інструмента
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json \
  --method tools/call --tool-name nbu_convert --tool-arg amount=1000 --tool-arg from=EUR --tool-arg to=USD --tool-arg date=2026-09-25
# → "1000 EUR = 1136.73 USD (НБУ, 25.09.2026)" + structuredContent

# невалідний вхід: isError: true, Inspector виходить з кодом 5
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json \
  --method tools/call --tool-name nbu_get_rate --tool-arg currency=usd

# ресурс
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node server.mjs -e NBU_FIXTURE=fixtures/rates.json \
  --method resources/read --uri nbu://reference/currencies
```

Без `-e NBU_FIXTURE=…` сервер ходить у живий API НБУ.

Що варто знати про вивід:

- Результат Inspector друкує в stdout, тож `> файл.json` дає чистий JSON.
- Коли інструмент повернув `isError: true`, Inspector додатково друкує в **stderr** рядок
  `{"error":{"code":"tool_is_error",…}}` і завершується з кодом **5**. Так помилку можна відрізнити від
  успіху програмно. Ненульовий код тут — очікуваний результат, а не збій команди.
- `--tool-arg key=value` пробує прочитати значення як JSON: `amount=1000` стає числом, а `USD`
  лишається рядком.

## Підключення до Claude Code

Скоуп за замовчуванням — `local`: сервер бачите лише ви і лише в цьому проєкті. Усе після `--`
передається серверу без змін. Шлях — абсолютний, до вашої копії репозиторію:

```bash
claude mcp add nbu -- node "D:/path/to/2026-quitcode-05-mcp-hw/examples/nbu-rates-mcp/server.mjs"
```

Далі в новій сесії — `/mcp`: сервер `nbu` і два інструменти. Прибрати — `claude mcp remove nbu`.
