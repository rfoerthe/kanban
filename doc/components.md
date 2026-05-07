# Frontend Components

## Top-level hierarchy

```text
src/app/page.tsx (Server Component)
└── BoardShell (Client)
    └── AuthGuard
        ├── [unauthenticated] LoginForm
        └── [authenticated]
            ├── Sidebar
            └── [activeView]
                ├── boards
                │   ├── BoardHeader
                │   └── main
                │       ├── EmptyState
                │       └── KanbanBoard
                │           └── KanbanColumn
                │               └── TaskCard
                └── tasks
                    └── TasksView
```

## Shell and navigation

### `board-shell.tsx`

Main authenticated shell.

Responsibilities:

- hydrates `useBoardStore` from `initialBoards`
- keeps `sidebarOpen`
- keeps `activeView: "boards" | "tasks"`
- switches between the board surface and tasks surface

### `sidebar.tsx`

Left sidebar with two responsibilities:

- top-level switch between **Tasks** and **Boards**
- board list and board creation/deletion controls when the active view is `boards`

Admin-only behavior:

- create board
- delete board

### `auth-guard.tsx`

Client auth gate for the entire app.

Behavior:

- runs `useAuthStore.initialize()` on mount
- renders a spinner during initial auth load
- renders `LoginForm` when unauthenticated
- renders children when authenticated

## Boards surface

### `board-header.tsx`

Header for the boards view.

Features:

- current board title
- reopen-sidebar button when collapsed
- add column button (admin only)
- rename/delete board menu (admin only)
- theme toggle
- profile menu
- user management entry for admins

### `kanban-board.tsx`

Root dnd-kit board canvas.

Responsibilities:

- sensors and collision detection
- column drag handling
- task drag handling
- drag overlay
- coordination with optimistic store actions

See `feature-drag-and-drop.md` for details.

### `kanban-column.tsx`

Column card that is both sortable and droppable.

Features:

- column drag handle for admins
- add task buttons for non-viewers
- rename/delete column menu for admins
- empty-column droppable state
- renders `TaskCard` inside a `SortableContext`

### `task-card.tsx`

Interactive task card in the board view.

Features:

- sortable task handle for non-viewers
- priority badge
- assignee initials badge when assigned
- “assign to me” quick action for non-viewers when task is assigned to someone else or unassigned
- history dialog trigger
- edit/delete menu for non-viewers

### Board dialogs

| Component | Purpose |
|---|---|
| `create-board-dialog.tsx` | Create a board |
| `edit-board-dialog.tsx` | Rename a board |
| `create-column-dialog.tsx` | Create a column |
| `edit-column-dialog.tsx` | Rename a column |
| `create-task-dialog.tsx` | Create a board task with title, description, priority, assignee |
| `edit-task-dialog.tsx` | Edit a board task with title, description, priority, assignee |
| `task-history-dialog.tsx` | Show task history entries |

`create-task-dialog.tsx` and `edit-task-dialog.tsx` both call `getAssignableUsers()` when opened so assignee options are current.

## Tasks/backlog surface

### `tasks-view.tsx`

Table-based backlog and assignment surface.

Features:

- fetches all backlog tasks via `useBacklogStore`
- fetches board summaries for assignment dropdowns
- shows title, status, priority, assignee, and board
- create/edit/delete task actions for non-viewers
- assign/unassign task to board
- profile menu and admin user-management entry

This surface does **not** use drag-and-drop.

### Backlog dialogs

| Component | Purpose |
|---|---|
| `create-backlog-task-dialog.tsx` | Create a backlog task with title, description, priority, status, assignee |
| `edit-backlog-task-dialog.tsx` | Edit backlog task title, description, priority, status, assignee |

Notes:

- The create dialog exposes `NEW`, `DONE`, and `REVOKED` in the status picker.
- The edit dialog disables status changes when the current task is `PLANNED`.
- The server action layer also blocks non-`PLANNED` status changes while a task is assigned to a board.

## Auth and user components

### `login-form.tsx`

Full-screen login form used by `AuthGuard`.

### `user-profile-dialog.tsx`

Current-user profile surface, including self-service password change.

### `user-management-dialog.tsx`

Admin-only user management modal with four internal views:

- list
- create
- edit
- reset-password

It is reachable from both `BoardHeader` and `TasksView`.

### `create-user-dialog.tsx`

Additional admin user creation dialog source in the repo. The main admin flow is currently centered around `user-management-dialog.tsx`.

## Shared UI primitives

All files under `src/components/ui/` are owned source code, not runtime imports from a UI package.

Commonly used primitives include:

- `button.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `input.tsx`
- `label.tsx`
- `select.tsx`
- `textarea.tsx`
- `badge.tsx`
- `scroll-area.tsx`
- `tooltip.tsx`
- `separator.tsx`

This project uses `@base-ui/react`, so trigger patterns follow the `render` prop style rather than Radix’s `asChild` pattern.

## Styling conventions

- Tailwind CSS 4 with CSS-first config in `src/app/globals.css`
- `cn()` helper from `src/lib/utils.ts`
- theme tokens live in CSS variables
- custom app animation classes are used throughout the kanban UI
