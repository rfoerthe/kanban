# Kanban — Project Documentation

## What is this?

A full-stack kanban board application built with Next.js 16 App Router. All data mutations happen via **Next.js Server Actions** — there is no separate REST API. The single page at `/` serves both the authenticated board UI and the login screen, controlled by a client-side `AuthGuard` component.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI library | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Component primitives | shadcn/ui (Base UI) | @base-ui/react 1.3.0 |
| Drag-and-drop | dnd-kit | core 6.3.1 / sortable 10.0.0 |
| State management | Zustand | 5.0.12 |
| ORM | Prisma | 7.5.0 |
| Database adapter | LibSQL (@prisma/adapter-libsql) | 7.5.0 |
| Database | SQLite (local) / Turso (production) | — |
| Auth | PBKDF2-SHA512 + HTTP-only cookies | (Web Crypto API) |
| Icons | lucide-react | 0.577.0 |
| Theme | next-themes | 0.4.6 |

## Repository layout

```
kanban/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — ThemeProvider, TooltipProvider, fonts
│   │   ├── page.tsx            # Entry point (Server Component) — fetches boards, renders BoardShell
│   │   └── globals.css         # Tailwind import, CSS variables, custom animations
│   ├── components/
│   │   ├── kanban/             # 22 application-specific components
│   │   └── ui/                 # 13 shadcn/ui primitive components (owned code)
│   ├── generated/
│   │   └── prisma/             # Prisma client output (gitignored, generated at build)
│   └── lib/
│       ├── actions.ts          # Board/task/column Server Actions ("use server")
│       ├── auth-actions.ts     # Auth Server Actions ("use server")
│       ├── auth.ts             # PBKDF2 hashing, session cookie management
│       ├── auth-store.ts       # Zustand auth store ("use client")
│       ├── prisma.ts           # Prisma singleton with LibSQL adapter
│       ├── store.ts            # Zustand board store ("use client")
│       ├── types.ts            # Shared TypeScript types
│       └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── prisma/
│   ├── schema.prisma           # 5 models: User, Board, Column, Task, TaskHistory
│   ├── migrations/             # 3 SQL migration files
│   └── seed.ts                 # Seeds admin user + sample board
├── scripts/
│   └── migrate-turso.ts        # Custom migration runner (replaces prisma migrate deploy)
├── public/                     # Static assets
├── doc/                        # This documentation
├── CLAUDE.md / AGENTS.md       # Agent instructions
├── next.config.ts
├── prisma.config.ts
├── components.json             # shadcn/ui config
└── package.json
```

## Documentation map

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | Request lifecycle, Server/Client boundary, data mutation pattern, key decisions |
| [database.md](database.md) | All 5 models, position management algorithm, migrations, Prisma client setup |
| [authentication.md](authentication.md) | Password hashing, session cookies, RBAC permission table, security notes |
| [server-actions.md](server-actions.md) | Full reference for every exported Server Action |
| [components.md](components.md) | Component hierarchy, per-component docs, shadcn/ui notes, styling |
| [state-management.md](state-management.md) | Both Zustand stores, optimistic update pattern, initialization order |
| [setup.md](setup.md) | Local dev, environment variables, production Turso, npm scripts, gotchas |
| [feature-drag-and-drop.md](feature-drag-and-drop.md) | dnd-kit setup, collision detection, re-entry guard refs |
| [feature-user-management.md](feature-user-management.md) | Admin UI walkthrough, CRUD flows, role behavior |

## Quick start

See [setup.md](setup.md) for a step-by-step guide. The short version:

```bash
npm install
# create .env with TURSO_DATABASE_URL=file:./dev.db
npx prisma generate
npm run db:migrate
npx prisma db seed
npm run dev
# → http://localhost:3000  (login: admin / admin_772099)
```

## Default credentials

The seed script (`prisma/seed.ts`) creates a single admin user:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin_772099` |
| Role | `ADMIN` |

**Change this password before any public or shared deployment.**
