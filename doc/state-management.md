# State Management

The app currently uses **three Zustand stores**:

- `src/lib/auth-store.ts`
- `src/lib/store.ts`
- `src/lib/backlog-store.ts`

There is no React Context-based app state and no React Query/SWR layer.

## Auth store (`src/lib/auth-store.ts`)

Responsibilities:

- current authenticated user
- auth loading state
- one-time initialization state
- login/logout/password-change actions

### State

```ts
{
  user: SafeUser | null;
  isLoading: boolean;
  isInitialized: boolean;
}
```

### Actions

- `setUser(user)`
- `initialize()`
- `login(username, password)`
- `logout()`
- `changePassword(currentPassword, newPassword)`

`AuthGuard` depends on `isInitialized` to avoid flashing the login form before the initial session check completes.

## Board store (`src/lib/store.ts`)

This store powers the **Boards** surface.

### State

```ts
{
  boards: BoardWithColumns[];
  activeBoardId: string | null;
  isLoading: boolean;
}
```

Note: `isLoading` exists in the state shape but is not actively driven by the current board-store methods.

### Core actions

- `setBoards(boards)`
- `setActiveBoardId(id)`
- `getActiveBoard()`
- `fetchBoards()`

### Board actions

- `createBoard(title)`
- `updateBoard(boardId, title)`
- `deleteBoard(boardId)`

### Column actions

- `createColumn(boardId, title)`
- `updateColumn(columnId, title)`
- `deleteColumn(columnId)`

### Task actions

- `createTask(columnId, title, description, priority, assigneeId)`
- `updateTask(taskId, data)`
- `deleteTask(taskId)`

Board-task `updateTask()` supports:

- `title`
- `description`
- `priority`
- `assigneeId`

### DnD actions

- `moveTaskOptimistic(taskId, sourceColumnId, targetColumnId, newPosition)`
- `persistTaskMove(taskId, targetColumnId, newPosition)`
- `reorderColumnOptimistic(columnId, oldPosition, newPosition)`
- `persistColumnReorder(columnId, newPosition)`

### Optimistic update pattern

The board store handles drag-and-drop in two phases:

1. **optimistic local move**
2. **async persistence**

If persistence fails, the store refetches boards from the server to restore canonical state.

## Backlog store (`src/lib/backlog-store.ts`)

This store powers the **Tasks** view.

### State

```ts
{
  tasks: BacklogTask[];
  boards: BoardSummary[];
  isLoading: boolean;
}
```

### Read actions

- `fetchTasks()` — loads all tasks for the tasks table
- `fetchBoards()` — loads board summaries for assignment dropdowns

### Write actions

- `createTask(title, description, priority, status, assigneeId)`
- `updateTask(taskId, data)`
- `deleteTask(taskId)`
- `assignToBoard(taskId, boardId)`
- `unassignFromBoard(taskId)`

Backlog-task `updateTask()` supports:

- `title`
- `description`
- `priority`
- `status`
- `assigneeId`

## How the stores interact

### Login flow

`useAuthStore.login()` authenticates the user and stores the safe user object.

### App initialization

`AuthGuard` initializes auth first. After that, feature surfaces fetch their own data.

### Boards surface

- `BoardShell` hydrates `useBoardStore` with `initialBoards`
- `BoardHeader`, `KanbanBoard`, `KanbanColumn`, and `TaskCard` work against `useBoardStore`

### Tasks surface

- `TasksView` loads `useBacklogStore` data on mount
- when assigning or unassigning tasks to boards, `TasksView` also calls `useBoardStore.fetchBoards()` so the board surface stays current

## Local component state vs. store state

Use the stores for:

- domain entities shared across distant components
- authenticated user state
- board/backlog task state

Use local `useState` for:

- dialog visibility
- form inputs
- shell UI state like `sidebarOpen`
- the shell’s top-level `activeView`

## Important shared types

Defined in `src/lib/types.ts`:

- `Priority`
- `TaskStatus`
- `UserRole`
- `SafeUser`
- `TaskAssignee`
- `TaskWithRelations`
- `BacklogTask`
- `BoardSummary`
- `ColumnWithTasks`
- `BoardWithColumns`
