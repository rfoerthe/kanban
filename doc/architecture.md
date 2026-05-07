# Architecture

## High-level shape

This app is a **single-route authenticated application** served from `/`.

- `src/app/page.tsx` is the only route entry in the app surface documented here.
- `src/components/kanban/board-shell.tsx` is the main client shell.
- The shell can render either:
  - **Boards view** via `BoardHeader` + `KanbanBoard`
  - **Tasks view** via `TasksView`

There are no API routes. Client components call server actions directly.

## Request lifecycle

1. Browser navigates to `/`.
2. Next.js runs `src/app/page.tsx` as an async Server Component.
3. `page.tsx` attempts `getBoards()` from `src/lib/actions.ts`.
4. If `getBoards()` throws for any reason, `page.tsx` falls back to `[]`.
5. `page.tsx` renders `<BoardShell initialBoards={boards} />`.
6. `BoardShell` is a Client Component and therefore the main Server/Client boundary.
7. `BoardShell` wraps the entire app in `AuthGuard`.
8. `AuthGuard` calls `useAuthStore.initialize()`, which invokes `getCurrentUser()`.
9. If authenticated, the user sees the shell and the stores fetch fresh board/task data.
10. If unauthenticated, the user sees `LoginForm`.

## Server vs. Client components

| File | Type | Responsibility |
|---|---|---|
| `src/app/page.tsx` | Server Component | Initial board fetch with graceful fallback |
| `src/app/layout.tsx` | Server Component | Root layout, providers, metadata |
| `src/components/kanban/board-shell.tsx` | Client Component | Main authenticated shell, view switching |
| `src/components/kanban/tasks-view.tsx` | Client Component | Backlog/tasks surface |
| `src/components/kanban/kanban-board.tsx` | Client Component | Board DnD surface |
| `src/lib/actions.ts` | Server Actions | Boards, columns, tasks, backlog, history |
| `src/lib/auth-actions.ts` | Server Actions | Login/logout/user/password operations |

## Main UI split

`BoardShell` owns two local UI states:

- `sidebarOpen: boolean`
- `activeView: "boards" | "tasks"`

The sidebar is not just a board list anymore. It acts as the top-level switcher between:

- **Boards** — board navigation and kanban work
- **Tasks** — backlog/table work

## Data mutation pattern

The common mutation path is:

```text
UI event
  → Zustand store method
    → Server Action
      → auth/role guard
        → Prisma write
          → revalidatePath("/")
    → local state update in the store
```

Examples:

- `useBoardStore.createTask()` → `createTask()` server action
- `useBacklogStore.assignToBoard()` → `assignTaskToBoard()` server action
- `useAuthStore.login()` → `login()` auth action

## Store architecture

Three Zustand stores divide the app by responsibility:

- `src/lib/auth-store.ts` — current user/session state
- `src/lib/store.ts` — boards, columns, in-board tasks, optimistic DnD
- `src/lib/backlog-store.ts` — all tasks table, board assignment, backlog edits

The board and backlog surfaces share the same underlying `Task` model, but present it differently.

## Board vs. backlog model

The current `Task` model supports both board tasks and backlog tasks.

- A task with a `columnId` is placed on a board.
- A task with `columnId = null` exists only in the backlog/tasks view.
- Assigning a backlog task to a board sets its `columnId` to the leftmost board column and forces `status = "PLANNED"`.
- Removing a task from a board sets `columnId = null` and `status = "NEW"`.

Important caveat: explicit removal through `unassignTaskFromBoard()` is not the same as deleting a board. If a board is deleted, Prisma nulls the linked `columnId` values through `onDelete: SetNull`, but task status is not reset by that path. Those tasks reappear in the backlog/tasks surface with `columnId = null` and whatever status they already had, commonly `PLANNED`.

## Authentication flow

```text
App mount
  → AuthGuard.initialize()
    → getCurrentUser()
      → getSession()
        → read kanban_session cookie
        → decode base64 JSON
        → lookup prisma.user by userId
  → if user exists:
      render app and fetch domain data
  → else:
      render LoginForm
```

The session is cookie-based and stateless on the server side. See `authentication.md` for caveats.

## Drag-and-drop architecture

Only the **Boards** surface uses drag-and-drop.

- `KanbanBoard` manages the `DndContext`, collision detection, and overlay state.
- `KanbanColumn` is both sortable and droppable.
- `TaskCard` is sortable.
- `useBoardStore` performs optimistic updates.
- `moveTask()` and `reorderColumns()` persist the final positions server-side.

The **Tasks** surface is table-based and does not use DnD.

## Theme and styling

- `next-themes` wraps the app at the layout level.
- Tailwind CSS 4 is configured through `src/app/globals.css`.
- Shared UI primitives live in `src/components/ui/` and are owned source files.

## Key architectural decisions

### Server Actions instead of an HTTP API

This keeps validation, auth checks, and persistence in one place without building a separate REST layer.

### Zustand instead of React Query/SWR

The board surface needs synchronous optimistic state changes for dnd-kit. Zustand provides direct mutable update flows that fit DnD better.

### One `Task` model for both board and backlog work

Using nullable `columnId` and explicit `status` allows a single task entity to exist either in a board column or in the backlog/tasks view.

### Stateless cookie session

The server only rehydrates the session by `userId` from the cookie payload. This keeps the implementation simple, but comes with revocation and validation tradeoffs.
