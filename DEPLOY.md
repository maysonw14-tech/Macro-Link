# Deploying Macro Link

## Local / zero-cost default

- `DATABASE_URL="file:./dev.db"` (SQLite file in project root after `prisma migrate`).
- Run `npm start` on a machine you control — no hosting bill.

## Free public hosting (easiest path)

1. Push the repo to GitHub.
2. Create a **Vercel** project from that repo.
3. Add a free **Neon** or **Turso** (or **Supabase**) database; set `DATABASE_URL` in Vercel to the provider connection string.
4. Run migrations against that database (`npx prisma migrate deploy` in CI or locally pointing at prod `DATABASE_URL`).
5. Macro refresh: use the in-app **Update macro data** button after deploy, or schedule `npm run macro:refresh` against the same `DATABASE_URL` from a trusted runner.

### Notes

- SQLite on Vercel’s serverless filesystem is **not durable** — use Neon/Turso/Supabase for production.
- Keep uploads under your host’s **request body limit** or add direct-to-blob uploads later.
- Set `DATABASE_URL` in Vercel environment variables; never commit secrets.
