# Kanban — Project Documentation

## What this app is

This repository contains a full-stack kanban and backlog management app built with Next.js 16 App Router, Prisma 7, Turso/LibSQL, and Zustand.

The authenticated UI has **two primary surfaces**:

- **Boards view** — classic kanban boards with columns, drag-and-drop, and column/task management.
- **Tasks view** — a backlog table for all tasks, including unassigned tasks, board assignment, status management, and assignee management.

All data mutations happen through **Next.js Server Actions**. There are **no REST API routes** and no middleware-based auth layer.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| UI library | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Component primitives | shadcn/ui over `@base-ui/react` | `@base-ui/react` 1.3.0 |
| Drag-and-drop | dnd-kit | core 6.3.1 / sortable 10.0.0 |
| State management | Zustand | 5.0.12 |
| ORM | Prisma | 7.5.0 |
| Database adapter | `@prisma/adapter-libsql` | 7.5.0 |
| Database | SQLite locally / Turso remotely | — |
| Auth | PBKDF2-SHA512 + HTTP-only cookie session | Web Crypto API |
| Icons | lucide-react | 0.577.0 |
| Theme | next-themes | 0.4.6 |

## Repository layout

```text
kanban/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, theme + tooltip providers
│   │   ├── page.tsx            # Server entry point, loads initial boards
│   │   └── globals.css         # Tailwind import, theme tokens, animations
│   ├── components/
│   │   ├── kanban/             # App-specific board, task, auth, and user UI
│   │   └── ui/                 # Owned shadcn/ui component source
│   ├── generated/
│   │   └── prisma/             # Generated Prisma client output
│   └── lib/
│       ├── actions.ts          # Board, task, backlog, history server actions
│       ├── auth-actions.ts     # Login/user/password server actions
│       ├── auth.ts             # Password hashing + cookie session helpers
│       ├── auth-store.ts       # Auth Zustand store
│       ├── backlog-store.ts    # Backlog/tasks Zustand store
│       ├── prisma.ts           # Prisma + LibSQL adapter singleton
│       ├── store.ts            # Board Zustand store
│       ├── types.ts            # Shared domain types
│       └── utils.ts            # cn() helper
├── prisma/
│   ├── schema.prisma           # Current data model
│   ├── migrations/             # SQL migrations
│   └── seed.ts                 # Seed admin user + sample board
├── scripts/
│   └── migrate-turso.ts        # Custom migration runner
├── doc/                        # Project documentation
├── next.config.ts
├── prisma.config.ts
├── components.json
└── package.json
```

## Documentation map

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | Request lifecycle, board/tasks view split, Server/Client boundary, data flow |
| [database.md](database.md) | Current Prisma schema, task status/assignee model, delete behavior, migrations |
| [authentication.md](authentication.md) | Password hashing, cookie session design, roles, security notes |
| [server-actions.md](server-actions.md) | Full catalog of board, backlog, auth, and user server actions |
| [components.md](components.md) | Board UI, tasks/backlog UI, dialogs, shared primitives |
| [state-management.md](state-management.md) | All three Zustand stores and how they interact |
| [setup.md](setup.md) | Local setup, Turso deployment, migrations, scripts, gotchas |
| [feature-drag-and-drop.md](feature-drag-and-drop.md) | dnd-kit implementation for the board surface |
| [feature-user-management.md](feature-user-management.md) | Admin CRUD flows, reset password, self-service profile/password |

## Quick start

```bash
npm install
# create .env with TURSO_DATABASE_URL=file:./dev.db
npx prisma generate
npm run db:migrate
# warning: the next command deletes existing app data before reseeding
npx prisma db seed
npm run dev
# → http://localhost:3000
# login: admin / admin_772099
```

After login, use the sidebar to switch between **Tasks** and **Boards**.

## Default credentials

The seed script creates a single admin user:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin_772099` |
| Role | `ADMIN` |

Change this password before any shared or public deployment.
