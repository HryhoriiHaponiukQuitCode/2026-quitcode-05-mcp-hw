<!-- Заголовок PR: WS5: <Ім'я Прізвище> -->

## Учасник

**Ім'я та Прізвище:**

<!-- ⚠️ ОБОВ'ЯЗКОВЕ ПОЛЕ. Впишіть повне ім'я, напр.: Олена Петренко.
     GitHub-логін не завжди дозволяє вас ідентифікувати, а сертифікат
     виписується на реальне ім'я. -->

**Основний інструмент:** <!-- Claude Code (версія, модель) -->

**Третій сервер у Task B:** <!-- Figma чи Playwright -->

## Що зроблено (Definition of Done)

- [ ] **Task A:** `mcp/leaddesk-server/` — окремий `package.json` з точними версіями `@modelcontextprotocol/server` і `zod` (без `@modelcontextprotocol/sdk`), `package-lock.json`, `README.md`, `fixtures/leads.json` = `materials/leads.json`, `src/server.mjs` на `serveStdio` без `console.log`; `leaddesk_find_leads`, `leaddesk_set_lead_status` (запис аудиту), ресурс `leaddesk://reference/statuses`; у `docs/mcp/` — `tools-list.json`, `set-status.json`, `bad-input.json` (`"isError": true`), `resource-read.json`
- [ ] **Task B:** `.mcp.json` (Supabase з `project_ref=` і `features=`, Vercel, Figma або Playwright; жодного `@latest` і секрету) і `.claude/settings.json` (11 інструментів Vercel і записуючі інструменти третього сервера в `deny`; в `allow` лише точні імена); `supabase/migrations/0001_leaddesk.sql` і `supabase/seed/leads.sql` на 20 лідів; `docs/mcp/connections.md`; у `docs/mcp/evidence/` — `vercel-build-log.txt`, `figma-tokens.json` або `playwright-form-check.md`, `mcp-before.txt`, `mcp-after.txt`
- [ ] **Task C:** `docs/mcp/ab-generic-vs-domain.md` — ті самі шість запитів (sha256 збігається), дві нові сесії в порожніх теках поза репозиторієм, у `/mcp` рівно один сервер; таблиця на 6 рядків без порожніх комірок; транскрипти `docs/mcp/ab/a-generic.md` і `docs/mcp/ab/b-domain.md`
- [ ] **Task D:** `docs/mcp/threat-model.md` — чотири обов'язкові підзаголовки, рядок на кожен сервер, щонайменше три канали виносу (хоча б один не браузерний), правило про клієнтський проєкт
- [ ] **Task E (bonus):** <!-- E1 HTTP-сервер / E2 отруєний опис / E3 Cursor — або приберіть пункт -->
- [ ] `docs/mcp/verification.md` — розділи Task A і Task B (і Task E, якщо робили)
- [ ] `npm run build` і `npm run lint` без помилок; кореневі `package.json` і `package-lock.json` не змінені
- [ ] Лише особисті або одноразові акаунти; жодного виводу `list_teams` / `list_projects` / `list_organizations` і назв клієнтів у репозиторії
- [ ] Жодних секретів у git (лише `.env.example`); `.playwright-mcp/` і `body.json` не закомічено; `tools/**`, `materials/**`, `examples/**`, `.coderabbit.yaml` і `.github/**` не змінені

## Що показала A/B-перевірка

<!-- коротко: A (Supabase, профіль «client») → B (ваш сервер): виклики, схема БД, запити на схвалення,
     правильність відповідей; що агент зробив у прогоні A на запитах 5–6; або чесне «різниці немає» і чому -->

## Threat model коротко

<!-- 2–4 рядки: найнебезпечніший канал виносу у вашому конфігу, чим його закрито і чого цей механізм
     не закриває; що з цього піде в договір -->

---
CodeRabbit зробить рев'ю. Якщо воно не з'явилося за кілька хвилин — додайте коментар `@coderabbitai review`.
Інші команди: `@coderabbitai summary`, `@coderabbitai help`.
