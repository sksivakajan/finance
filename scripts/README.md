# Dev scripts

## Database (Postgres + Redis)

`docker-compose.yml` at the repo root is the primary/portable way to run the
dev stack, and is what CI and other contributors should use.

**On this machine, Docker Desktop is not installed** (network policy also
blocks the official PostgreSQL installer download), so local dev instead uses
portable, no-install Windows binaries under `.tools/` (gitignored):

- `.tools/postgres` — PostgreSQL 18.6 portable build
  (github.com/theseus-rs/postgresql-binaries), data dir at `.tools/pgdata`,
  superuser `finance` / password `finance_dev_password` (matches
  `.env.example`'s `DATABASE_URL`), listening on `localhost:5432`.
- `.tools/redis` — Redis 8.10 portable build
  (github.com/redis-windows/redis-windows), listening on `localhost:6379`,
  no persistence configured (dev cache/queue only).

Run once per work session:

```powershell
powershell -File scripts/dev-db-start.ps1
```

Stop when done:

```powershell
powershell -File scripts/dev-db-stop.ps1
```

If Docker later becomes available on this machine, prefer switching to
`docker-compose up -d` instead — it's what's documented for everyone else and
keeps environments consistent. The portable setup here is a workaround, not
the recommended path.
