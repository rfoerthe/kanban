# Development Setup

## Prerequisites

- **Node.js 22.x** — required by the `engines` field in `package.json`. Use nvm or similar to manage versions.
- **npm** — bundled with Node.js.
- A `.env` file at the project root (see Environment variables below).

---

## Local development (SQLite)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
echo "TURSO_DATABASE_URL=file:./dev.db" > .env

# 3. Generate the Prisma client (outputs to src/generated/prisma/)
npx prisma generate

# 4. Apply all migrations to create the local SQLite database
npm run db:migrate

# 5. Seed the database with the admin user and sample board
npx prisma db seed

# 6. Start the development server
npm run dev
```

Open http://localhost:3000 and log in as `admin` / `admin_772099`.

---

## Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `TURSO_DATABASE_URL` | Yes | `file:./dev.db` | Local SQLite file for dev; Turso URL for production |
| `TURSO_AUTH_TOKEN` | Production only | `eyJ...` | Not needed for local SQLite file |

The `TURSO_AUTH_TOKEN` can be omitted when `TURSO_DATABASE_URL` is a `file:` path. The LibSQL client does not require an auth token for local files.

---

## Production (Turso)

1. Create a Turso database: https://turso.tech/
2. Get the database URL (`libsql://your-db.turso.io`) and auth token.
3. Set environment variables on your hosting platform:
   ```
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=eyJ...
   ```
4. Deploy. The build command runs migrations automatically:
   ```bash
   npm run build
   # equivalent to: prisma generate && npx tsx scripts/migrate-turso.ts && next build
   ```

The custom migration script (`scripts/migrate-turso.ts`) is used instead of `prisma migrate deploy` because Prisma's built-in deploy command does not support the libsql protocol. The script:
- Creates a `_prisma_migrations` table if it doesn't exist.
- Reads migration SQL files from `prisma/migrations/` in alphabetical order.
- Skips migrations already recorded in `_prisma_migrations`.
- Applies new migrations using `client.executeMultiple()`.

---

## Adding a new migration

1. Edit `prisma/schema.prisma` with your changes.
2. Generate the migration SQL file:
   ```bash
   npx prisma migrate dev --name describe_the_change
   ```
   This creates a new folder under `prisma/migrations/` with a `migration.sql` file.
3. Regenerate the Prisma client:
   ```bash
   npx prisma generate
   ```
4. Commit the new migration folder and the updated schema.
5. On next deploy, `npm run build` will apply the migration automatically.

---

## npm scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start the development server with hot reload |
| `build` | `prisma generate && npx tsx scripts/migrate-turso.ts && next build` | Production build: generate client, run migrations, build Next.js |
| `start` | `next start` | Start the production server (requires a build first) |
| `lint` | `eslint` | Run ESLint |
| `db:migrate` | `npx tsx scripts/migrate-turso.ts` | Apply pending migrations without a full build |

---

## Common gotchas

**`src/generated/prisma/` is gitignored.**
You must run `npx prisma generate` on every fresh checkout before building or starting the dev server. The build script does this automatically.

**Tailwind CSS 4 has no `tailwind.config.js`.**
Configuration is done via CSS at the top of `src/app/globals.css` using `@import "tailwindcss"` and `@theme`. If you need to add custom tokens, add them there.

**shadcn/ui uses `@base-ui/react`, not Radix UI.**
The component API differs. Trigger elements use a `render` prop instead of `asChild`. Check the existing components in `src/components/ui/` for the correct patterns before adding new ones.

**`"use server"` and `"use client"` directives must be the first line.**
No comments, imports, or blank lines before the directive. Violating this causes a build error.

**The `TURSO_AUTH_TOKEN` env var can be `undefined` for local files.**
The `createClient` call passes `authToken: process.env.TURSO_AUTH_TOKEN` — if the variable is not set, it's `undefined`, which is valid for local SQLite but required for remote Turso connections.

**`prisma migrate deploy` will not work.**
Always use `npm run db:migrate` or the build script to apply migrations. See the migration section above.
