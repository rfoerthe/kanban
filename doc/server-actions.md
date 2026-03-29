# Server Actions Reference

All mutations are implemented as Next.js Server Actions — async functions marked `"use server"` that are called directly from client code. There are no HTTP API routes.

## How Server Actions work here

- All Server Action files live in `src/lib/actions.ts` (board/task operations) and `src/lib/auth-actions.ts` (auth operations).
- Every action checks authentication before doing anything. Authorization failures throw `Error("Unauthorized")` or `Error("Forbidden")`.
- Business logic errors either throw (e.g. `deleteColumn` with tasks) or return `{ success: false, error: string }` (auth actions).
- All mutating actions call `revalidatePath("/")` to clear the Next.js full-route cache, ensuring fresh data on the next server render.
- Callers (Zustand store methods) wrap thrown errors in try/catch and update local state after success.

---

## Board & Task Actions (`src/lib/actions.ts`)

### `getBoards()`

```ts
async function getBoards(): Promise<BoardWithColumns[]>
```

| | |
|---|---|
| Required role | Any authenticated user |
| Returns | All boards ordered by `createdAt desc`, each including columns (ordered by `position asc`) and tasks (ordered by `position asc`) |

---

### `getBoard(boardId)`

```ts
async function getBoard(boardId: string): Promise<BoardWithColumns | null>
```

| | |
|---|---|
| Required role | Any authenticated user |
| Returns | Single board with columns and tasks, or `null` if not found |

---

### `createBoard(title)`

```ts
async function createBoard(title: string): Promise<BoardWithColumns>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | New board with three default columns: "To Do" (pos 0), "In Progress" (pos 1), "Done" (pos 2) |

---

### `updateBoard(boardId, title)`

```ts
async function updateBoard(boardId: string, title: string): Promise<Board>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | Updated board (without columns) |

---

### `deleteBoard(boardId)`

```ts
async function deleteBoard(boardId: string): Promise<void>
```

| | |
|---|---|
| Required role | ADMIN |
| Notes | Cascade deletes all columns, tasks, and task history via DB foreign key cascade |

---

### `createColumn(boardId, title)`

```ts
async function createColumn(boardId: string, title: string): Promise<ColumnWithTasks>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | New column with empty `tasks` array |
| Notes | Position is set to `max(existing positions) + 1` |

---

### `updateColumn(columnId, title)`

```ts
async function updateColumn(columnId: string, title: string): Promise<Column>
```

| | |
|---|---|
| Required role | ADMIN |

---

### `deleteColumn(columnId)`

```ts
async function deleteColumn(columnId: string): Promise<void>
```

| | |
|---|---|
| Required role | ADMIN |
| Throws | `Error("Column still has tasks. Move or delete all tasks before deleting this column.")` if the column has any tasks |
| Notes | This constraint is enforced by application logic, not by the database |

---

### `createTask(columnId, title, description?, priority?)`

```ts
async function createTask(
  columnId: string,
  title: string,
  description?: string,    // default: ""
  priority?: Priority      // default: "MEDIUM"
): Promise<Task>
```

| | |
|---|---|
| Required role | ADMIN or USER |
| Returns | New task |
| Side effects | Creates a `TaskHistory` entry: `changeType: "Task created"`, `username: currentUser.username` |
| Notes | Position is set to `max(existing positions in column) + 1` |

---

### `updateTask(taskId, data)`

```ts
async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
  }
): Promise<Task>
```

| | |
|---|---|
| Required role | ADMIN or USER |
| Returns | Updated task |
| Side effects | Creates `TaskHistory` entries for each changed field: `"Title changed"`, `"Description changed"`, `"Priority changed"` (with `detail: "OLD → NEW"` for priority) |

---

### `deleteTask(taskId)`

```ts
async function deleteTask(taskId: string): Promise<void>
```

| | |
|---|---|
| Required role | ADMIN or USER |
| Notes | Cascade deletes all `TaskHistory` entries for the task |

---

### `moveTask(taskId, targetColumnId, newPosition)`

```ts
async function moveTask(
  taskId: string,
  targetColumnId: string,
  newPosition: number
): Promise<void>
```

| | |
|---|---|
| Required role | ADMIN or USER |
| Notes | Runs inside a `prisma.$transaction`. Shifts sibling task positions in both source and target columns. See [database.md](database.md) for the algorithm detail. |

---

### `reorderColumns(columnId, newPosition)`

```ts
async function reorderColumns(columnId: string, newPosition: number): Promise<void>
```

| | |
|---|---|
| Required role | ADMIN |
| Notes | Runs inside a `prisma.$transaction`. Shifts sibling column positions within the same board. |

---

### `getTaskHistory(taskId)`

```ts
async function getTaskHistory(taskId: string): Promise<TaskHistory[]>
```

| | |
|---|---|
| Required role | Any authenticated user |
| Returns | All history entries for the task, ordered by `createdAt desc` |

---

## Auth Actions (`src/lib/auth-actions.ts`)

### `login(username, password)`

```ts
async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: SafeUser }>
```

| | |
|---|---|
| Required role | None (public) |
| Returns | `{ success: true, user }` on success; `{ success: false, error: "Invalid username or password" }` on failure |
| Side effects | Sets `kanban_session` HTTP-only cookie on success |
| Notes | Error message is generic regardless of whether username or password was wrong (prevents username enumeration) |

---

### `logout()`

```ts
async function logout(): Promise<void>
```

Deletes the `kanban_session` cookie.

---

### `getCurrentUser()`

```ts
async function getCurrentUser(): Promise<SafeUser | null>
```

Calls `getSession()`. Returns the currently authenticated user or `null`.

---

### `createUser(data)`

```ts
async function createUser(data: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: string;
}): Promise<{ success: boolean; error?: string }>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | `{ success: true }` or `{ success: false, error: "Username already exists" }` |

---

### `getUsers()`

```ts
async function getUsers(): Promise<SafeUser[]>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | All users ordered by `createdAt asc`, without `passwordHash` |

---

### `updateUser(userId, data)`

```ts
async function updateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    role?: string;
  }
): Promise<{ success: boolean; error?: string }>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | `{ success: true }` or `{ success: false, error }` |
| Notes | Checks username uniqueness before updating. Role change takes effect on the user's next authenticated request. |

---

### `deleteUser(userId)`

```ts
async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }>
```

| | |
|---|---|
| Required role | ADMIN |
| Returns | `{ success: false, error: "You cannot delete your own account" }` if the caller tries to delete themselves |

---

### `changePassword(currentPassword, newPassword)`

```ts
async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }>
```

| | |
|---|---|
| Required role | Any authenticated user |
| Notes | Requires the current password. Does not log out existing sessions. |

---

### `resetPassword(userId, newPassword)`

```ts
async function resetPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }>
```

| | |
|---|---|
| Required role | ADMIN |
| Notes | Does not require knowing the old password. Minimum 6 characters enforced. Does not invalidate existing sessions for the target user. |

---

## Error handling convention

| Scenario | Behavior |
|---|---|
| No session cookie | `requireAuth()` throws `Error("Unauthorized")` |
| Wrong role | `requireRole()` throws `Error("Forbidden")` |
| Business rule violation (e.g. delete column with tasks) | Server Action throws a descriptive `Error` |
| Recoverable failure (e.g. duplicate username) | Returns `{ success: false, error: string }` |
| Task/column/user not found | Returns `{ success: false, error: "... not found" }` or throws depending on the action |

Callers in the Zustand store catch thrown errors. For optimistic DnD operations, a caught error triggers `getBoards()` to roll back local state.
