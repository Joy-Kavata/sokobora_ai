# SokoBora AI

## Accounts and access

Visitors can create a farmer or buyer account from the sign-in page. Successful registration and sign-in take the user to the commodity exchange. Administrator access cannot be selected during registration; an existing account must be promoted by a trusted database operator. Only accounts with the `ADMIN` role can view the Commercial Trading Overview, and its analytics API enforces the same check.

Set `SESSION_SECRET` to a random value of at least 32 characters for both the API and application. For local development, set `CLIENT_ORIGIN` if the Vite client is served from an origin other than `http://localhost:5173`. Generate a session secret with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After a user has registered, a database operator can grant administrator access to that account with:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Never expose administrator promotion through public registration.
