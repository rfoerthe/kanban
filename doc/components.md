# Frontend Components

## Component hierarchy

```
src/app/page.tsx  (Server Component)
└── BoardShell  (Client, Server/Client boundary)
    └── AuthGuard
        ├── [unauthenticated] LoginForm
        └── [authenticated]
            ├── Sidebar
            │   └── CreateBoardDialog
            ├── BoardHeader
            │   ├── CreateColumnDialog
            │   ├── EditBoardDialog
            │   ├── UserProfileDialog
            │   ├── UserManagementDialog  (ADMIN only)
            │   └── ThemeToggle
            └── main
                ├── [no board] EmptyState
                └── [board selected] KanbanBoard
                    └── KanbanColumn  (per column)
                        ├── CreateTaskDialog
                        ├── EditColumnDialog
                        └── TaskCard  (per task)
                            ├── EditTaskDialog
                            └── TaskHistoryDialog
```

---

## Kanban components (`src/components/kanban/`)

### `auth-guard.tsx`

Gate component that wraps the entire authenticated UI.

**Props:** `{ children: React.ReactNode }`

**Behavior:**
- On mount, calls `useAuthStore.initialize()` once (guarded by `isInitialized` flag).
- Second `useEffect` watches `user`: triggers `fetchBoards()` once on first login (guarded by `hasFetchedRef` to prevent double-fetch on re-renders); resets the ref on logout.
- While `!isInitialized || isLoading`: renders a centered `Loader2` spinner.
- If `user === null`: renders `<LoginForm />`.
- Otherwise: renders `children`.

**Stores:** reads `useAuthStore` (user, isLoading, isInitialized, initialize), `useBoardStore` (fetchBoards)

---

### `board-shell.tsx`

Main layout container. The Server/Client boundary.

**Props:** `{ initialBoards: BoardWithColumns[] }`

**Behavior:**
- Hydrates the Zustand board store with `initialBoards` on mount via `setBoards()`.
- If no `activeBoardId` and boards exist, sets the first board as active.
- Manages `sidebarOpen` local state (toggleable).
- Renders `Sidebar`, `BoardHeader`, and either `KanbanBoard` or `EmptyState` based on whether an active board exists.
- Wraps everything in `AuthGuard`.

**Stores:** reads/writes `useBoardStore` (boards, activeBoardId, setBoards, setActiveBoardId, getActiveBoard)

---

### `kanban-board.tsx`

Drag-and-drop root. See [feature-drag-and-drop.md](feature-drag-and-drop.md) for full detail.

**Props:** `{ board: BoardWithColumns }`

**Behavior:**
- Sets up `DndContext` with `PointerSensor` (5px activation threshold) and `KeyboardSensor`.
- Custom collision detection: prioritizes `pointerWithin`; returns the column droppable directly for empty columns.
- Three `useRef` guards prevent re-entrant `handleDragOver` loops.
- On drag end: calls `reorderColumnOptimistic` + `persistColumnReorder` for column drags, or `persistTaskMove` for task drags.
- Renders columns inside `SortableContext` (horizontal strategy).
- `DragOverlay` via `createPortal` to `document.body` shows the active task card during drag.

**Stores:** reads/writes `useBoardStore` (moveTaskOptimistic, persistTaskMove, reorderColumnOptimistic, persistColumnReorder)

---

### `kanban-column.tsx`

Individual column with a list of sortable tasks.

**Props:** `{ column: ColumnWithTasks; isOverlay?: boolean }`

**Behavior:**
- Uses both `useSortable` and `useDroppable` on the same DOM node via a merged callback ref.
- The `data` object passed to `useSortable` includes `type: "column"` for identification in drag handlers.
- Shows a task count badge in the header.
- ADMIN sees a column menu (rename, delete via `EditColumnDialog`).
- Non-VIEWER users see an "Add Task" button (opens `CreateTaskDialog`).
- Drag handle is visible only to ADMIN.
- Tasks rendered inside a `SortableContext` (vertical strategy).

**Stores:** reads `useAuthStore` (user role)

---

### `task-card.tsx`

Individual task card.

**Props:** `{ task: TaskWithRelations; isOverlay?: boolean }`

**Behavior:**
- Uses `useSortable`. Disabled for VIEWER role.
- Data includes `type: "task"`.
- Shows priority badge with color coding: LOW (muted), MEDIUM (default), HIGH (destructive).
- Task history button (clock icon) visible on hover, opens `TaskHistoryDialog`.
- Edit/delete dropdown menu hidden from VIEWER.
- `isOverlay` prop: applied to the `DragOverlay` copy, adds `rotate-2` and shadow styles.

**Stores:** reads `useAuthStore` (user role)

---

### `sidebar.tsx`

Left-side board list.

**Props:**
```ts
{
  boards: BoardWithColumns[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Behavior:**
- Collapsible (controlled by `isOpen`/`onToggle` from `BoardShell`).
- "New Board" button visible only to ADMIN, opens `CreateBoardDialog`.
- Each board item shows the board title. Clicking selects it.
- ADMIN boards show a delete button that opens an inline confirmation dialog (`AlertDialog`).

---

### `board-header.tsx`

Top bar of the application.

**Props:** `{ board?: BoardWithColumns; sidebarOpen: boolean; onToggleSidebar: () => void }`

**Behavior:**
- Shows the active board title (or "Select a board" if none).
- ADMIN sees: "Add Column" button (opens `CreateColumnDialog`), board settings menu (opens `EditBoardDialog` or delete confirmation).
- All users see: user menu (user name, role badge, "Profile", "User Management" for ADMIN, "Sign out").
- `ThemeToggle` is always visible.
- Sidebar toggle button.

**Stores:** reads `useAuthStore` (user, logout), `useBoardStore` (deleteBoard)

---

### `login-form.tsx`

Full-screen centered login form.

**Behavior:**
- Controlled form with username + password fields.
- Calls `useAuthStore.login()` on submit.
- Shows error message on failure.
- Disables the submit button while `isLoading`.

**Stores:** reads/writes `useAuthStore` (login, isLoading)

---

### `empty-state.tsx`

Shown in the main area when no board is selected or no boards exist.

**Props:** none

Simple centered illustration with text.

---

### `theme-toggle.tsx`

Dark/light mode toggle button.

Uses `useTheme()` from `next-themes` to toggle between `"light"` and `"dark"`. Renders a Sun or Moon icon.

---

### Dialog components

All dialogs are **controlled** — they receive `open` and `onOpenChange` props (or manage their own open state with a trigger button).

| Component | Trigger | What it does |
|---|---|---|
| `create-board-dialog.tsx` | Sidebar "New Board" | Creates a board via `useBoardStore.createBoard()` |
| `edit-board-dialog.tsx` | Board header menu | Renames a board via `useBoardStore.updateBoard()` |
| `create-column-dialog.tsx` | Board header "Add Column" | Adds a column via `useBoardStore.createColumn()` |
| `edit-column-dialog.tsx` | Column header menu | Renames or provides delete trigger for a column |
| `create-task-dialog.tsx` | Column "Add Task" | Creates a task with title, description, priority via `useBoardStore.createTask()` |
| `edit-task-dialog.tsx` | Task card menu | Edits task title, description, priority via `useBoardStore.updateTask()` |
| `task-history-dialog.tsx` | Task card clock icon | Calls `getTaskHistory()` Server Action directly on open, displays history entries |
| `user-profile-dialog.tsx` | Header user menu "Profile" | Shows current user info, change-password form via `useAuthStore.changePassword()` |
| `user-management-dialog.tsx` | Header user menu "User Management" (ADMIN) | Full user CRUD UI — see [feature-user-management.md](feature-user-management.md) |
| `create-user-dialog.tsx` | User management list | Creates a new user via `createUser()` auth action |

---

## shadcn/ui components (`src/components/ui/`)

These are **owned source files** — not imported from a package. They were generated by the shadcn CLI and can be freely modified.

| Component | Used by |
|---|---|
| `badge.tsx` | Task priority badge, user role badge |
| `button.tsx` | All interactive buttons |
| `card.tsx` | Task cards |
| `dialog.tsx` | All modal dialogs |
| `dropdown-menu.tsx` | Board/column/task action menus, user menu |
| `input.tsx` | All text inputs |
| `label.tsx` | Form labels |
| `scroll-area.tsx` | Board horizontal scroll, column task scroll |
| `select.tsx` | Priority selector in task forms |
| `separator.tsx` | Menu separators |
| `sheet.tsx` | (Available, not currently in main use) |
| `textarea.tsx` | Task description field |
| `tooltip.tsx` | Icon button tooltips |

**Important:** This project uses `@base-ui/react` primitives, not Radix UI. The API differs — trigger elements use a `render` prop pattern instead of `asChild`:

```tsx
// @base-ui/react pattern
<DropdownMenuTrigger render={<Button variant="ghost" />}>
  ...
</DropdownMenuTrigger>
```

---

## Styling conventions

- **Tailwind CSS 4** with `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js`).
- `cn()` utility from `src/lib/utils.ts` merges class names: `clsx` for conditionals, `tailwind-merge` to resolve conflicts.
- CSS variables for theme colors defined in `globals.css` under `:root` and `.dark`.
- Custom animations: `animate-kanban-fade-in` and `animate-kanban-slide-in`.
