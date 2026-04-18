# Macro Link

Australian **Retail** MVP: upload a budget/forecast spreadsheet, answer a few questions, confirm account mappings, then view a **macro scenario overlay** with transparent drivers and a short narrative (material factors, limitations, template recommendations).

Macro series and wizard state live in **PostgreSQL** (e.g. free **Neon** for local + Vercel). **Uploads do not call ABS** — use **Update macro data** (UI or `npm run macro:refresh`) to refresh the cache.

## Quick start

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL to your Postgres URL (e.g. create a free project at neon.tech).
npm install
npx prisma migrate dev
npm run macro:refresh   # or click “Update macro data” in the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload `public/sample.csv`, walk through Questions → Mappings → Results, then download the CSV report.

## How the macro overlay works

We shock each macro driver with its latest year-on-year change from the cache, pass each through line-specific betas and industry-by-driver weights, then multiply those channel effects on each month of the baseline—clear levers, scenario-only, not a full macro model.

**Example (one month, one line, simplified numbers):** Suppose **Revenue** maps to two drivers: retail turnover (β = 0.55) and headline CPI (β = 0.15), you pick **OTHER_RETAIL** (industry multiplier 1.0 on every driver), and “base already includes inflation” is **off** (scale = 1). For that month, say the cache implies **mom = 2%** for turnover and **mom = 3.5%** for CPI (each driver’s own YoY, replayed every forecast month). Then **effect_turnover = 0.55 × 1.0 × 1 × 0.02 = 0.011** and **effect_CPI = 0.15 × 1.0 × 1 × 0.035 = 0.00525**. The line multiplier is **(1 + 0.011) × (1 + 0.00525) ≈ 1.0163**, so a **$100,000** baseline revenue cell becomes about **$101,630** for that month before rollups—small numbers for illustration; your file and betas will differ.

**Spreadsheet layout:** the parser **auto-detects** the P&amp;L block across sheets. Empty number cells are read as **zero** (shown as a neutral “for your information” note, not an error). Use **Advanced: fix table layout** after upload if needed, with Excel-style **column letters** and 1-based sheet/tab and row numbers.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build (requires Postgres `DATABASE_URL`; runs `migrate deploy`) |
| `npm run build:next` | `next build` only (no DB migration; for quick checks if `DATABASE_URL` is not Postgres yet) |
| `npm run macro:refresh` | Batch-write macro cache (synthetic series if live ABS unavailable) |
| `npm test` | Vitest unit tests |

## Legal

This tool is **not financial advice**. ABS attribution applies to official statistics; the bundled synthetic series are placeholders until you wire live ABS endpoints and keys.

See [DEPLOY.md](DEPLOY.md) for free hosting notes (Vercel + Neon/Turso).
