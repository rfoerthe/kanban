# Architecture

## Request lifecycle

1. Browser navigates to `/`.
2. Next.js runs `src/app/page.tsx` as an async **Server Component**.
3. `page.tsx` calls `getBoards()` (a Server Action). Because there is no valid session cookie on first visit, `getBoards` throws and the catch returns an empty array.
4. `page.tsx` renders `<BoardShell initialBoards={[]} />`. `BoardShell` is a **Client Component** — this is the Server/Client boundary.
5. `BoardShell` wraps everything in `<AuthGuard>`. On mount, `AuthGuard` calls `useAuthStore.initialize()`, which calls the `getCurrentUser()` Server Action.
6. While initializing, `AuthGuard` renders a spinner. On success it renders children; on failure (no session) it renders `<LoginForm />`.
7. After a successful login, `AuthGuard` triggers `fetchBoards()` from the board store, which hydrates the Zustand store with all boards.
8. All subsequent user interactions call Server Actions directly from client code — no `fetch()`, no REST endpoints.

## Server vs. Client components

| File | Type | Reason |
|---|---|---|
| `src/app/page.tsx` | Server Component | Fetches initial board data server-side |
| `src/app/layout.tsx` | Server Component | Static layout shell |
| `src/components/kanban/board-shell.tsx` | Client Component | Manages sidebar state, owns the Zustand store |
| Everything in `src/components/kanban/` | Client Component | All interactive UI |
| `src/lib/actions.ts` | Server Action file | `"use server"` directive |
| `src/lib/auth-actions.ts` | Server Action file | `"use server"` directive |

The Server/Client boundary sits at `BoardShell`. Anything above it (page, layout) is server-rendered. Anything it renders is client-rendered.

## Data mutation pattern

Every mutation follows the same cycle:

```
UI event
  → Zustand store method
    → call Server Action
      → server validates session + role (requireAuth / requireRole)
        → Prisma writes to DB
          → revalidatePath("/") clears Next.js cache
    → Zustand state updated locally (no refetch needed)
```

For drag-and-drop, an **optimistic update** is applied first:

```
drag event
  → moveTaskOptimistic() — synchronous Zustand update (instant UI)
  → persistTaskMove()    — async Server Action (fire-and-forget)
    → on failure: fetchBoards() to roll back to server state
```

## Authentication flow

```
App mount
  → AuthGuard.useEffect → initialize()
    → getCurrentUser() Server Action
      → reads kanban_session cookie
        → decodes base64 JSON → extracts userId
          → prisma.user.findUnique(userId)
            → returns SafeUser | null
      → sets useAuthStore.user
  → if user: AuthGuard renders children + triggers fetchBoards()
  → if null: AuthGuard renders LoginForm

Login submit
  → useAuthStore.login(username, password)
    → login() Server Action
      → prisma.user.findUnique(username)
        → verifyPassword(input, storedHash)
          → createSession(userId) — sets HTTP-only cookie
      → returns { success, user }
    → sets useAuthStore.user → AuthGuard re-renders children
```

## Database layer

Prisma 7 with the LibSQL adapter (`@prisma/adapter-libsql`) connects to:

- **Development:** local SQLite file at `./dev.db` via `TURSO_DATABASE_URL=file:./dev.db`
- **Production:** remote Turso database via `TURSO_DATABASE_URL=libsql://...` and `TURSO_AUTH_TOKEN`

The Prisma client is generated into `src/generated/prisma/` (not the default location). The singleton is in `src/lib/prisma.ts` with a global cache to prevent connection exhaustion during Next.js hot-reloads:

```ts
// src/lib/prisma.ts
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Theme system

`next-themes` wraps the root layout. The `dark` class is applied to `<html>`. Tailwind CSS 4 uses `@custom-variant dark (&:is(.dark *))` in `globals.css`.

Two custom animations are defined in `globals.css`:
- `kanban-fade-in` — opacity 0→1
- `kanban-slide-in` — translateY(8px)→0 + opacity 0→1

Used via `animate-kanban-fade-in` and `animate-kanban-slide-in` utility classes.

## Key architectural decisions

**Server Actions instead of API routes** — mutations are co-located with the server logic that executes them; no need to maintain a separate HTTP layer or handle CORS.

**Zustand instead of React Query/SWR** — drag-and-drop requires synchronous, mutable state updates (`moveTaskOptimistic`). React Query's async model cannot provide the immediate position changes dnd-kit expects. Zustand's synchronous `set()` does.

**LibSQL/Turso** — SQLite-compatible wire protocol that works locally as a file and in production as a distributed edge database, with no schema changes required between environments.

**shadcn/ui (Base UI)** — components are owned source code in `src/components/ui/`, not a dependency. They can be freely modified. This project uses the newer `@base-ui/react` primitives which have a different API from Radix UI (note the `render` prop pattern on trigger elements).

**No session store table** — sessions are stateless cookies. Each Server Action that needs auth calls `getSession()`, which decodes the cookie and does a DB lookup by `userId`. This avoids a sessions table but means there is no server-side session invalidation (other than cookie deletion on logout).
