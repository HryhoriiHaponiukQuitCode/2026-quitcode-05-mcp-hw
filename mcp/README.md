# `mcp/` — ваш власний MCP-сервер (Task A)

Сюди кладете сервер LeadDesk, який будуєте в Task A: **`mcp/leaddesk-server/`**. Інших серверів
у цій теці не треба (бонусні варіанти Task E — у [`docs/walkthrough.md`](../docs/walkthrough.md)).
Покроково — [`docs/walkthrough.md`](../docs/walkthrough.md), Task A. Зразок форми — сервер курсів
НБУ з воркшопу: [`examples/nbu-rates-mcp/`](../examples/nbu-rates-mcp/).

## Структура

```
mcp/leaddesk-server/
├── package.json          # окремий від застосунку; "type": "module"; точні версії залежностей
├── package-lock.json
├── README.md             # як запустити, як підключити до Claude Code, які змінні оточення
├── fixtures/
│   └── leads.json        # копія materials/leads.json — без змін
└── src/
    └── server.mjs        # serveStdio(factory); за потреби — ще модулі .mjs поруч
```

Результати перевірки Inspector'ом лягають не сюди, а в `docs/mcp/` (див. нижче).

## Обов'язкові правила

1. **Окремий `package.json`.** Кореневий `package.json` і `package-lock.json` застосунку не змінюються.
2. **Лише `@modelcontextprotocol/server` і `zod`, точні версії** — без `^`, `~`, `*`, `latest`.
   На воркшопі — `"@modelcontextprotocol/server": "2.1.0"` і `"zod": "4.6.5"`.
   Пакета `@modelcontextprotocol/sdk` тут бути не повинно: це стара лінія SDK, і вона оновлюється
   в ті самі дні, що й нова, тож «свіжа версія» нічого не доводить.
3. **JavaScript-модулі `.mjs`, а не TypeScript.** Кореневий `tsconfig.json` включає `**/*.ts` і
   `**/*.mts`, тож `next build` перевіряв би й ваш сервер. А на Vercel залежностей сервера немає,
   і збірка застосунку впала б на `Cannot find module`. Перевірено на цьому репозиторії.
4. **Жодного `console.log`** у `src/`. У stdio-сервера stdout — канал протоколу. Журнал — лише
   `console.error` (stderr), і без персональних даних.
5. **Рівно два інструменти й один ресурс** з цими іменами:

   | Ім'я | Що робить | Анотації |
   |---|---|---|
   | `leaddesk_find_leads` | ліди за статусом, найновіші першими | `readOnlyHint: true` |
   | `leaddesk_set_lead_status` | змінює статус ліда й пише запис в аудит | `readOnlyHint: false` |
   | `leaddesk://reference/statuses` | ресурс `text/markdown`: п'ять статусів і що кожен означає для команди | — |

6. **Словник — із застосунку, а не вигаданий.** Статуси — рівно `new`, `contacted`, `qualified`,
   `won`, `lost` (`LEAD_STATUSES` у `lib/types.ts`); у `leaddesk_find_leads` до них додається `any`.
   Ідентифікатор ліда — `lead_0001` (`leadId()` у `lib/db.ts`), тобто перевірка `^lead_\d{4}$`.
7. **`.describe(…)` на кожному полі** `inputSchema`. `inputSchema` — об'єкт Zod-полів, як у прикладі НБУ.
8. **Лише потрібні поля в результаті.** `leaddesk_find_leads` повертає `id`, `company`, `status`,
   `source`, `budget`, `createdAt` — без імені, email і тексту заявки: агенту для цих двох дієслів
   вони не потрібні. Це і є «рівно те, що ви дозволили».
9. **Аудит на кожну зміну.** Успішний `leaddesk_set_lead_status` створює запис щонайменше
   `{ action, leadId, at }` — та сама форма, що `AuditEntry` у `lib/types.ts`, — і повертає його в
   `structuredContent`.

## Режим роботи: фікстура обов'язкова, роут у застосунку — за бажанням

**Обов'язковий режим — офлайн на фікстурі.** Сервер читає `fixtures/leads.json` (20 лідів,
`lead_0001`–`lead_0020`) і тримає зміни **в пам'яті процесу**. Файл фікстури сервер не переписує
ніколи: після перезапуску дані знову ті самі, а файл у git лишається копією `materials/leads.json`.

Чому так, а не через HTTP API застосунку:

- **Однакові дані в A/B.** У Task C прогін A читає Supabase, куди ви заливаєте ті самі 20 рядків
  (Task B), а прогін B — ваш сервер. Сховище застосунку в пам'яті тримає ~200 інших синтетичних
  лідів, тож через роут прогони порівнювали б різні дані, а не два інтерфейси.
- **Урок доменного сервера від цього не зменшується:** два бізнес-дієслова замість SQL на всю базу,
  статус лише з переліку, запис в аудит на кожну зміну, апрув, який людина читає за секунду.
- **Бюджет Task A — 2–2,5 години,** а застосунок у цьому воркшопі не змінюється.

**За бажанням (не оцінюється):** режим, у якому сервер ходить у запущений `npm run dev` через вузький
роут застосунку, наприклад `app/api/mcp/leads/route.ts`, з власним токеном у заголовку. Перемикач —
змінна `LEADDESK_BASE_URL`; без неї сервер працює на фікстурі. Якщо робите: токен лише серверний
(`.env.local`, без префікса `NEXT_PUBLIC_`), у `.env.example` — лише `change-me-…`, роут віддає тільки
ті поля й дії, що й інструменти, а `npm run lint` і `npm run build` проходять. Для Task C однаково
беріть режим фікстури.

## Артефакти перевірки — у `docs/mcp/`

Команди — у walkthrough, Task A, крок 5 (Git Bash, з кореня репозиторію).

| Файл | Що в ньому |
|---|---|
| `docs/mcp/tools-list.json` | `tools/list`: два інструменти, описи, схеми з описами параметрів, анотації |
| `docs/mcp/set-status.json` | успішний `leaddesk_set_lead_status`: новий статус і запис аудиту `{ action, leadId, at }` |
| `docs/mcp/bad-input.json` | невалідний вхід: `"isError": true` з текстом валідації |
| `docs/mcp/resource-read.json` | `resources/read` для `leaddesk://reference/statuses` з `mimeType` |
