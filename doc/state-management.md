# State Management

Two Zustand stores manage all application state. There is no React Context for state, and no server-state library (no React Query or SWR).

---

## Board store (`src/lib/store.ts`)

```ts
import { useBoardStore } from "@/lib/store";
```

### State shape

```ts
interface BoardState {
  boards: BoardWithColumns[];      // flat list of all boards with nested columns + tasks
  activeBoardId: string | null;    // which board is currently shown
  isLoading: boolean;
}
```

### Actions

| Action | Description |
|---|---|
| `setBoards(boards)` | Directly set the boards array (used by BoardShell on initial hydration) |
| `setActiveBoardId(id)` | Set which board is displayed |
| `getActiveBoard()` | Derived — returns `boards.find(b => b.id === activeBoardId)` |
| `fetchBoards()` | Calls `getBoards()` Server Action, hydrates store, auto-selects first board if none active |
| `createBoard(title)` | Calls Server Action, prepends new board to `boards`, sets it as active |
| `updateBoard(boardId, title)` | Calls Server Action, updates title in local state |
| `deleteBoard(boardId)` | Calls Server Action, removes from `boards`, selects next board |
| `createColumn(boardId, title)` | Calls Server Action, appends column to the board's columns array |
| `updateColumn(columnId, title)` | Calls Server Action, updates column title in local state |
| `deleteColumn(columnId)` | Calls Server Action, removes column from local state |
| `createTask(columnId, title, description, priority)` | Calls Server Action, appends task to column |
| `updateTask(taskId, data)` | Calls Server Action, merges `data` into task in local state |
| `deleteTask(taskId)` | Calls Server Action, removes task from its column |
| `moveTaskOptimistic(...)` | Synchronous — moves task in local state immediately (no server call) |
| `persistTaskMove(...)` | Async — calls `moveTask` Server Action; rolls back on failure |
| `reorderColumnOptimistic(...)` | Synchronous — reorders column in local state immediately |
| `persistColumnReorder(...)` | Async — calls `reorderColumns` Server Action; rolls back on failure |

### Optimistic update pattern

Drag-and-drop requires immediate visual feedback. The two-phase pattern:

**Phase 1 — Optimistic (synchronous):**

```ts
moveTaskOptimistic(taskId, sourceColumnId, targetColumnId, newPosition)
```

Modifies `boards` synchronously via `set()`:
1. Finds the task in the source column.
2. Removes it from the source column's `tasks` array.
3. Inserts it at `newPosition` in the target column's `tasks` array.
4. Re-maps all tasks in both columns to have sequential `position` values starting at 0.
5. For same-column moves: splices and re-indexes in a single pass.

**Phase 2 — Persist (async, fire-and-forget):**

```ts
persistTaskMove(taskId, targetColumnId, newPosition)
```

Calls `moveTask()` Server Action. On failure:
```ts
const boards = await actions.getBoards();
set({ boards });  // full rollback to server state
```

The same pattern applies to `reorderColumnOptimistic` + `persistColumnReorder`.

### `fetchBoards` auto-selection

```ts
fetchBoards: async () => {
  const boards = await actions.getBoards();
  set({ boards });
  const { activeBoardId } = get();
  if (!activeBoardId && boards.length > 0) {
    set({ activeBoardId: boards[0].id });
  }
}
```

If no board is currently active (e.g. after login), the first board is auto-selected.

---

## Auth store (`src/lib/auth-store.ts`)

```ts
import { useAuthStore } from "@/lib/auth-store";
```

### State shape

```ts
interface AuthState {
  user: SafeUser | null;
  isLoading: boolean;
  isInitialized: boolean;  // true once the initial session check has completed
}
```

### Actions

| Action | Description |
|---|---|
| `setUser(user)` | Directly set the user |
| `initialize()` | Calls `getCurrentUser()` Server Action. Sets `isInitialized: true` in the `finally` block regardless of outcome. |
| `login(username, password)` | Calls `login()` Server Action, sets `user` on success |
| `logout()` | Calls `logout()` Server Action, sets `user: null` |
| `changePassword(current, new)` | Calls `changePassword()` Server Action, returns result |

### `isInitialized` flag

`isInitialized` starts as `false`. It is set to `true` in the `finally` block of `initialize()`, meaning it becomes `true` whether the session check succeeded or failed. This prevents `AuthGuard` from flashing the login form during the async session check.

```
Mount → initialize() starts → isInitialized: false → spinner shown
         → getCurrentUser() returns → isInitialized: true
           → if user: render app
           → if null: render LoginForm
```

---

## Initialization order

```
app/page.tsx
  → BoardShell renders with initialBoards (may be empty if user not authenticated)
    → BoardShell.useEffect: setBoards(initialBoards)
    → AuthGuard mounts
      → initialize() — checks session
        → on success: set user
          → AuthGuard second useEffect: user changed → fetchBoards()
            → boards hydrated, activeBoardId set
        → on failure: set user: null → LoginForm shown
```

---

## Type definitions (`src/lib/types.ts`)

```ts
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type UserRole = "ADMIN" | "USER" | "VIEWER";

export type SafeUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;     // string not UserRole — matches DB plain string
  createdAt: Date;
};

export type TaskHistoryEntry = {
  id: string;
  taskId: string;
  changeType: string;
  detail: string | null;
  username: string;
  createdAt: Date;
};

export type TaskWithRelations = Task;           // alias for Prisma Task
export type ColumnWithTasks = Column & { tasks: TaskWithRelations[] };
export type BoardWithColumns = Board & { columns: ColumnWithTasks[] };
```

Types are imported from `@/lib/types` in both stores and components.

---

## When to use store vs. local state

**Use the Zustand stores for:**
- Data that multiple distant components read or write (boards, columns, tasks, auth user)
- State that persists across component unmounts

**Use component-local `useState` for:**
- Dialog open/close state
- Form field values
- Hover/focus UI state
- Any state that only one component needs

Example: `BoardShell` keeps `sidebarOpen` in local state. `UserManagementDialog` keeps its current `view` ("list" | "create" | "edit" | "reset-password") in local state. Neither needs to be in a global store.
