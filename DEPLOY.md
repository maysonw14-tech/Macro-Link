# Deploying Macro Link

## Database (required)

The app uses **PostgreSQL** via Prisma. **SQLite is no longer supported** in this repo.

1. Create a free database at [Neon](https://neon.tech) (or Supabase, Railway, etc.).
2. Copy the **connection string** (`postgresql://…`).
3. Set **`DATABASE_URL`** in Vercel → Project → Settings → Environment Variables (Production + Preview).
4. Default **`npm run build`** runs **`prisma migrate deploy`** then **`next build`**, so tables are created on each deploy when `DATABASE_URL` is set.

## Local

- Put the same `DATABASE_URL` in `.env` (see `.env.example`).
- `npx prisma migrate dev` for local schema changes; `npm run macro:refresh` to seed macro cache.

## Free public hosting (Vercel + Neon)

1. Push the repo to GitHub.
2. Connect the repo to **Vercel**.
3. Create **Neon** Postgres; paste connection string as **`DATABASE_URL`** on Vercel.
4. Deploy (build runs migrations automatically).
5. After deploy, use **Update macro data** in the app (or `npm run macro:refresh` with prod `DATABASE_URL` from a trusted machine) to load macro series.

### Notes

- If `prisma migrate deploy` fails with Neon’s **pooled** URL, use Neon’s **direct / non-pooled** connection string for `DATABASE_URL`, or add Neon’s documented `directUrl` setup in Prisma.
- Keep uploads under your host’s **request body limit** or add direct-to-blob uploads later.
- Never commit secrets; use environment variables only.
