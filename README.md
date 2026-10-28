# SokoBora AI

## Accounts and access

Visitors can create a farmer or buyer account from the sign-in page. Successful registration and sign-in take the user to the commodity exchange. Administrator access cannot be selected during registration; an existing account must be promoted by a trusted database operator. Only accounts with the `ADMIN` role can view the Commercial Trading Overview, and its analytics API enforces the same check.

Set `SESSION_SECRET` to a random value of at least 32 characters for both the API and application. For local development, set `CLIENT_ORIGIN` if the Vite client is served from an origin other than `http://localhost:5173`.

The Vercel deployment uses one Node serverless function at `api/node/index.js` for the application API and a separate Python function at `api/index.py` for the AI service. Keep API handler modules outside the `api/` directory (they live under `lib/api/`) so Vercel does not deploy each handler as an additional serverless function.

Configure `DATABASE_URL` with the application's PostgreSQL connection URL. On Vercel with Supabase, use the transaction-pooler URL for runtime queries. Configure `DIRECT_URL` with a Supabase direct or session-pooler URL for Prisma migrations; do not use the transaction pooler for migrations. Copy both URLs from the Supabase project's **Connect** dialog and verify the pooler username, project reference, region, port, and password. Set both variables in the Vercel environment used by the deployment. The login API also requires `SESSION_SECRET` to be set in that same Vercel environment.

Generate a session secret with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After a user has registered, a database operator can grant administrator access to that account with:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Never expose administrator promotion through public registration.
