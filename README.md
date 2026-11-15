# SokoBora AI

## Accounts and access

Visitors can create a farmer or buyer account from the sign-in page. Successful registration and sign-in take the user to the commodity exchange. Administrator access cannot be selected during registration; an existing account must be promoted by a trusted database operator. Only accounts with the `ADMIN` role can view the Commercial Trading Overview, and its analytics API enforces the same check.

The application separates signed-in dashboards by role: farmers can publish and manage their own listings and review incoming bids; buyers can browse the marketplace and place bids; administrators can view platform metrics and manage user roles. Listing creation, bidding, bid acceptance, and escrow status updates are also checked by the API against the signed-in user's role and listing ownership.

Farmers can edit or delete their own active listings until a buyer has placed a bid or a transaction has started. Listing changes are checked by the API for ownership and eligibility.

Set `SESSION_SECRET` to a random value of at least 32 characters for both the API and application. For local development, set `CLIENT_ORIGIN` if the Vite client is served from an origin other than `http://localhost:5173`.

Authentication cookies expire after 30 minutes, and the dashboard is restored only in a tab with an active session marker and an unexpired session. Closing the browser or tab ends the browser session; opening the app in a new tab requires signing in again. The server validates the signed session on every protected API request, so expired or missing sessions cannot access protected dashboards or data.

Escrow status tracking follows deposit recorded, buyer delivery confirmation, then farmer release recording. The buyer's confirmation is required before the release step. The prototype does not connect to a payment provider, so recording a release does not transfer funds to a farmer account. After pulling schema changes for local development, run `npx prisma db push` to apply them; the Vercel build applies the Prisma schema automatically.

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
