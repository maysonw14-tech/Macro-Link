# Macro Link

Australian **Retail** MVP: upload a budget/forecast spreadsheet, answer a few questions, confirm account mappings, then view a **macro scenario overlay** with transparent drivers and a short narrative (material factors, limitations, template recommendations).

Macro series are stored in a **local SQLite cache** (or Postgres/Turso in production). **Uploads do not call ABS** — use **Update macro data** (UI or `npm run macro:refresh`) to refresh the cache.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run macro:refresh   # or click “Update macro data” in the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload `public/sample.csv`, walk through Questions → Mappings → Results, then download the CSV report.

**Spreadsheet layout:** the parser **auto-detects** the P&amp;L block across sheets. Empty number cells are read as **zero** (shown as a neutral “for your information” note, not an error). Use **Advanced: fix table layout** after upload if needed, with Excel-style **column letters** and 1-based sheet/tab and row numbers.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build |
| `npm run macro:refresh` | Batch-write macro cache (synthetic series if live ABS unavailable) |
| `npm test` | Vitest unit tests |

## Legal

This tool is **not financial advice**. ABS attribution applies to official statistics; the bundled synthetic series are placeholders until you wire live ABS endpoints and keys.

See [DEPLOY.md](DEPLOY.md) for free hosting notes (Vercel + Neon/Turso).
