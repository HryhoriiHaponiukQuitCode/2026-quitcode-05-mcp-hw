// NBU exchange rates as an MCP server — the one we build live on stage in Workshop 5.
// Official rates of the National Bank of Ukraine, public API, no key.
//
//   node server.mjs                      live API (bank.gov.ua)
//   NBU_FIXTURE=fixtures/rates.json node server.mjs   offline: plan B on stage, and the tests
//
// Everything here only reads, so every tool carries readOnlyHint: true.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const API = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange";
const FIXTURE = process.env.NBU_FIXTURE;

// "2026-09-25" → "20260925"; the API takes the date without dashes.
const apiDate = (iso) => iso.replaceAll("-", "");
const today = () => new Date().toISOString().slice(0, 10);

// One row per currency: { cc: "USD", txt: "Долар США", rate: 44.9729, exchangedate: "25.09.2026" }.
async function fetchRates(date) {
  if (FIXTURE) {
    const all = JSON.parse(await readFile(FIXTURE, "utf8"));
    return all[date] ?? all.default;
  }
  const res = await fetch(`${API}?date=${apiDate(date)}&json`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`НБУ відповів ${res.status}`);
  return res.json();
}

async function rateOf(cc, date) {
  if (cc === "UAH") return { cc: "UAH", txt: "Українська гривня", rate: 1, exchangedate: date };
  const row = (await fetchRates(date)).find((r) => r.cc === cc);
  if (!row) throw new Error(`НБУ не встановлює курс для ${cc} на ${date}. Перелік валют — у ресурсі nbu://reference/currencies`);
  return row;
}

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .describe("Код валюти ISO 4217 великими літерами: USD, EUR, PLN. Гривня — UAH");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("Дата курсу у форматі РРРР-ММ-ДД. Без дати — сьогодні. НБУ встановлює курс і на вихідні");

const fail = (e) => ({ isError: true, content: [{ type: "text", text: e.message }] });

const factory = () => {
  const server = new McpServer({ name: "nbu-rates", version: "1.0.0" });

  server.registerTool(
    "nbu_get_rate",
    {
      title: "Офіційний курс НБУ",
      description:
        "Повертає офіційний курс гривні до валюти на дату за даними Національного банку України. Застосовуй, коли в кошторисі чи звіті потрібен курс, а не ринкова ціна. Тільки читає.",
      inputSchema: { currency, date },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ currency: cc, date: d = today() }) => {
      try {
        const r = await rateOf(cc, d);
        return {
          content: [{ type: "text", text: `1 ${r.cc} = ${r.rate} UAH (НБУ, ${r.exchangedate})` }],
          structuredContent: { currency: r.cc, rate: r.rate, date: r.exchangedate, source: "НБУ" },
        };
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "nbu_convert",
    {
      title: "Перерахунок за курсом НБУ",
      description:
        "Перераховує суму з однієї валюти в іншу через офіційні курси НБУ на дату (крос-курс через гривню). Застосовуй для кошторисів у кількох валютах. Тільки читає; результат округлено до копійок.",
      inputSchema: {
        amount: z.number().positive().max(1e12).describe("Сума у вихідній валюті, більше нуля"),
        from: currency,
        to: currency,
        date,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ amount, from, to, date: d = today() }) => {
      try {
        const [a, b] = await Promise.all([rateOf(from, d), rateOf(to, d)]);
        const result = Math.round(((amount * a.rate) / b.rate) * 100) / 100;
        return {
          content: [{ type: "text", text: `${amount} ${from} = ${result} ${to} (НБУ, ${a.exchangedate})` }],
          structuredContent: { amount, from, to, result, date: a.exchangedate, rateFrom: a.rate, rateTo: b.rate },
        };
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerResource(
    "nbu-currencies",
    "nbu://reference/currencies",
    { title: "Валюти НБУ", description: "Валюти, для яких НБУ сьогодні встановлює курс: код і назва", mimeType: "text/markdown" },
    async (uri) => {
      const rows = await fetchRates(today());
      const lines = rows.map((r) => `- \`${r.cc}\` — ${r.txt}`).sort();
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# Валюти НБУ (${rows.length})\n\n${lines.join("\n")}\n` }] };
    },
  );

  return server;
};

await serveStdio(factory);
