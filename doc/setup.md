# Development Setup

## Prerequisites

- **Node.js 22.x**
- **npm**
- a project-root `.env` file

## Local development

```bash
npm install
echo "TURSO_DATABASE_URL=file:./dev.db" > .env
npx prisma generate
npm run db:migrate
npx prisma db seed
npm run dev
```

Warning: `npx prisma db seed` is destructive in the current implementation. The seed script clears existing tasks, columns, boards, and users before recreating the default admin account and sample board.

Then open `http://localhost:3000` and log in with:

- username: `admin`
- password: `admin_772099`

## Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `TURSO_DATABASE_URL` | yes | `file:./dev.db` | local SQLite or remote LibSQL URL |
| `TURSO_AUTH_TOKEN` | production only | `eyJ...` | omitted for local file-based SQLite |

## Production and deployment

Build script:

```bash
npm run build
```

Current build command:

```bash
prisma generate && npx tsx scripts/migrate-turso.ts && next build
```

That means production builds also:

1. regenerate Prisma client output
2. run pending SQL migrations through the custom LibSQL script
3. build the Next.js app

## Migrations

Apply pending migrations manually:

```bash
npm run db:migrate
```

Create a new migration after changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_the_change
npx prisma generate
```

`scripts/migrate-turso.ts` replaces `prisma migrate deploy` for deploy-time application because the LibSQL path is handled manually.

## Seed behavior

`prisma/seed.ts` currently:

- recreates the default admin user
- creates a sample board called `Project Board`
- seeds four board columns and sample tasks
- begins by deleting existing tasks, columns, boards, and users

## Useful scripts

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `prisma generate && npx tsx scripts/migrate-turso.ts && next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `db:migrate` | `npx tsx scripts/migrate-turso.ts` |

## Gotchas

### Generated Prisma client lives outside the default location

The client output path is:

```text
src/generated/prisma/
```

Run `npx prisma generate` on fresh checkouts before building or running the app.

### Tailwind is CSS-first

There is no classic `tailwind.config.js` in this repo. Theme and tokens live in `src/app/globals.css`.

### UI primitives use `@base-ui/react`

The trigger APIs differ from older Radix-based shadcn examples. Follow existing patterns in `src/components/ui/`.

### Server/client directives matter

`"use server"` and `"use client"` must remain at the top of the relevant files.

### There is no `.env.example`

At the time of writing, local setup depends on manually creating `.env`.
