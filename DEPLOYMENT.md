# FinConnect production deployment on Render

## 1. Connect the repository

Push this repository, including `render.yaml`, to GitHub. In Render, select **New > Blueprint**, select the repository and branch, then review the four resources the blueprint creates: `finconnect-db`, `finconnect-redis`, `finconnect-api`, and `finconnect-web`.

Use a paid Render plan for the database, Redis, API, and web service. The supplied blueprint uses `starter` so production does not depend on free-tier sleep, expiry, or non-persistent datastore behavior.

## 2. Configure the API environment

Render wires `DATABASE_URL`, `REDIS_URL`, and the two JWT secrets automatically. Before the first deploy, set these API variables in the Render dashboard. Do not commit their values.

| Variable | Required value |
| --- | --- |
| `TWO_FACTOR_ENCRYPTION_KEY` | A newly generated 64-character hexadecimal key. Keep it for the lifetime of existing TOTP enrollments. |
| `WEB_ORIGIN` | The final public web origin, such as `https://your-domain.example`, without a trailing slash. |
| `CORS_ORIGIN` | The same public web origin. It is only a narrow fallback; browser traffic normally uses the same-origin proxy. |
| `SMTP_HOST` | SMTP hostname supplied by the provider. |
| `SMTP_PORT` | Provider SMTP port. |
| `SMTP_USER` | Provider SMTP username. |
| `SMTP_PASS` | Provider SMTP password or API key. |
| `MAIL_FROM` | Verified sender, for example `FinConnect <no-reply@your-domain.example>`. |
| `STORAGE_S3_BUCKET` | Private bucket for FinConnect uploads. |
| `STORAGE_S3_REGION` | Region required by the chosen S3-compatible provider. |
| `STORAGE_S3_ENDPOINT` | HTTPS S3-compatible endpoint, with no bucket path. |
| `STORAGE_S3_ACCESS_KEY_ID` | Object-storage access key, scoped only to this bucket. |
| `STORAGE_S3_SECRET_ACCESS_KEY` | Matching object-storage secret key. |

The API rejects a production deployment that uses console email, local disk storage, missing SMTP settings, incomplete S3 settings, or a non-HTTPS S3 endpoint. This is deliberate: user verification and uploads must remain functional after restarts.

The web service needs no secret variables. `NEXT_PUBLIC_API_URL=/api` is public by design. `API_INTERNAL_URL` is supplied from the private API service and must never be exposed as a `NEXT_PUBLIC_*` variable.

## 3. Object storage

Create a private S3-compatible bucket and an application-specific credential with object read/write permission limited to that bucket. The application stores randomized objects under `<user-id>/<random-file>`, and serves them only through its own `/uploads/*` route. Do not configure a public bucket policy or a public storage URL.

## 4. Email

Use a transactional SMTP provider and verify the sender domain before deployment. Development keeps `EMAIL_DRIVER=console` and may use Mailpit from `docker-compose.yml`; production uses `EMAIL_DRIVER=smtp` from the blueprint.

## 5. Database migrations and backups

The API build generates Prisma Client. Render then runs `pnpm --filter @finance/api run prisma:deploy` as its pre-deploy command. It applies committed migrations only and never runs `prisma migrate dev`, resets, or seeds production.

Enable Render Postgres backups and point-in-time recovery on the selected paid database plan. Before schema changes, take an on-demand backup and review the generated migration against a staging database. Test restoring a backup periodically.

## 6. Deploy and verify

Complete the environment variables, then apply the Blueprint. Future pushes to the connected branch trigger builds automatically. The web service is the only public service; the API, Postgres, and Redis stay on Render's private network.

After a deploy, verify from the public web URL:

- `GET /` returns the web application.
- `GET /health` returns `{ "status": "ok" }` through the web-to-API proxy.
- Register, verify email, log in, refresh the session, and log out.
- Create income, an expense with a split, and confirm balances.
- Send and accept a friend request; create a conversation and send a message.
- Create a group, add a member, and create a settlement.
- Upload an avatar, receipt, and chat attachment; reload each through `/uploads/*`.
- Check loans and forecast access with authenticated and unauthenticated accounts.

Use dedicated smoke-test credentials supplied as CI secrets, never source-controlled values. Run the existing e2e suite against a disposable test environment, not production data.

## 7. Custom domain and HTTPS

Add the custom domain to the **finconnect-web** service only. Update DNS exactly as Render instructs, wait for certificate issuance, then set both `WEB_ORIGIN` and `CORS_ORIGIN` to the HTTPS custom origin and redeploy the API. Redirect any secondary domain to the canonical one at the edge or DNS provider.

## 8. Rollback and troubleshooting

Use Render's deploy history to roll the web or API service back to the prior known-good deploy. Do not roll back database migrations by resetting the database. For a migration incident, first restore service code, assess compatibility, and restore a verified database backup only under an approved incident procedure.

If the API fails before startup, inspect the configuration error in Render logs: environment validation names the missing or invalid variable without printing a secret. If the web service cannot reach the API, verify that `API_INTERNAL_URL` references the `finconnect-api` private service and that both services share a Render region. If uploads fail, confirm the endpoint is HTTPS, the bucket is private, and the S3 credential has bucket-scoped read/write access. If email links point to the wrong host, correct `WEB_ORIGIN` and redeploy the API.
