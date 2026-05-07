# Server Actions Reference

All server-side mutations and authenticated reads are implemented as **Next.js Server Actions**. There are no API routes.

Main action files:

- `src/lib/actions.ts` — boards, columns, board tasks, backlog tasks, task history
- `src/lib/auth-actions.ts` — login/logout, current user, user CRUD, password flows

## Common behavior

- Authenticated reads use `requireAuth()`.
- Writes use `requireRole()`.
- Most mutating actions call `revalidatePath("/")`.
- Client components usually reach these actions through Zustand stores, except for some auth/user dialogs and history fetches.

## Domain actions (`src/lib/actions.ts`)

### Assignable-user helper

#### `getAssignableUsers()`

- auth: any authenticated user
- returns: users selectable as task assignees
- used by: board task dialogs and backlog task dialogs

## Board actions

### `getBoards()`

- auth: any authenticated user
- returns: all boards by `createdAt desc`
- includes:
  - columns by `position asc`
  - tasks by `position asc`
  - task assignee preview data

### `getBoard(boardId)`

- auth: any authenticated user
- returns: one board with columns, tasks, and assignee data

### `createBoard(title)`

- auth: `ADMIN`
- creates default columns:
  - `To Do`
  - `In Progress`
  - `Done`

### `updateBoard(boardId, title)`

- auth: `ADMIN`
- renames a board

### `deleteBoard(boardId)`

- auth: `ADMIN`
- deletes the board row
- note: because `Task.column` uses `SetNull`, tasks attached to deleted columns become backlog tasks
- important caveat: this is not the same flow as `unassignTaskFromBoard()`; the task becomes unassigned because the column disappears, but its status is not reset to `NEW` by this path

## Column actions

### `createColumn(boardId, title)`

- auth: `ADMIN`
- sets `position` to max existing position + 1

### `updateColumn(columnId, title)`

- auth: `ADMIN`
- renames a column

### `deleteColumn(columnId)`

- auth: `ADMIN`
- application guard: throws if the column still contains tasks
- message:

```text
Column still has tasks. Move or delete all tasks before deleting this column.
```

## Board-task actions

These actions operate on tasks already in board columns or being created directly into a board column.

### `createTask(columnId, title, description?, priority?, assigneeId?)`

- auth: `ADMIN` or `USER`
- behavior:
  - creates a task inside the target column
  - sets `status = "PLANNED"`
  - sets `position` to the end of the column
  - optionally assigns a user
- history:
  - always creates `Task created`
  - additionally creates `Assignee set` when an assignee is provided

### `updateTask(taskId, data)`

- auth: `ADMIN` or `USER`
- editable fields:
  - `title`
  - `description`
  - `priority`
  - `assigneeId`
- history entries are created for changed fields

### `deleteTask(taskId)`

- auth: `ADMIN` or `USER`
- deletes the task and its history via DB cascade

### `moveTask(taskId, targetColumnId, newPosition)`

- auth: `ADMIN` or `USER`
- used by: board drag-and-drop persistence
- behavior:
  - same-column reorder or cross-column move
  - shifts sibling positions transactionally

### `reorderColumns(columnId, newPosition)`

- auth: `ADMIN`
- used by: column drag-and-drop persistence
- shifts sibling column positions transactionally

### `getTaskHistory(taskId)`

- auth: any authenticated user
- returns: task history ordered by `createdAt desc`

## Backlog/tasks actions

These power the `TasksView` table and `useBacklogStore`.

### `getBacklogTasks()`

- auth: any authenticated user
- returns: all tasks by `createdAt desc`
- includes:
  - assignee preview
  - column summary
  - board summary through the column relation

### `getBoardSummaries()`

- auth: any authenticated user
- returns: `{ id, title }` for assignment dropdowns

### `createBacklogTask(title, description?, priority?, status?, assigneeId?)`

- auth: `ADMIN` or `USER`
- creates a task without assigning it to a board column
- history:
  - creates `Task created`

### `updateBacklogTask(taskId, data)`

- auth: `ADMIN` or `USER`
- editable fields:
  - `title`
  - `description`
  - `priority`
  - `status`
  - `assigneeId`
- special rule:
  - if the task is currently assigned to a board (`columnId` present), the action throws when trying to set a non-`PLANNED` status
- history:
  - creates entries for changed title, description, priority, status, and assignee changes

### `deleteBacklogTask(taskId)`

- auth: `ADMIN` or `USER`
- deletes the task

### `assignTaskToBoard(taskId, boardId)`

- auth: `ADMIN` or `USER`
- behavior:
  - finds the board’s leftmost column
  - appends the task to that column
  - sets `status = "PLANNED"`
  - writes `Assigned to board` history with board title

### `unassignTaskFromBoard(taskId)`

- auth: `ADMIN` or `USER`
- behavior:
  - clears `columnId`
  - sets `status = "NEW"`
  - resets `position = 0`
  - writes `Removed from board` history with the previous board title

This behavior applies only to explicit unassignment through the action. Board deletion follows the database relation path instead and does not reset status.

## Auth actions (`src/lib/auth-actions.ts`)

### `login(username, password)`

- auth: public
- success: `{ success: true, user }`
- failure: `{ success: false, error: "Invalid username or password" }`

### `logout()`

- auth: authenticated session implied
- clears the cookie session

### `getCurrentUser()`

- auth: reads the current cookie session
- returns: safe user or `null`

### `createUser(data)`

- auth: `ADMIN`
- creates a user after uniqueness check on username

### `changePassword(currentPassword, newPassword)`

- auth: any authenticated user
- verifies current password first

### `getUsers()`

- auth: `ADMIN`
- returns admin-manageable user list

### `updateUser(userId, data)`

- auth: `ADMIN`
- updates first name, last name, username, and/or role
- rejects duplicate usernames

### `deleteUser(userId)`

- auth: `ADMIN`
- rejects deleting the current admin user

### `resetPassword(userId, newPassword)`

- auth: `ADMIN`
- enforces minimum length 6

## Where actions are called from

| Area | Primary caller |
|---|---|
| Board CRUD and DnD | `src/lib/store.ts` |
| Backlog/tasks workflow | `src/lib/backlog-store.ts` |
| Login/session | `src/lib/auth-store.ts` |
| User management | `src/components/kanban/user-management-dialog.tsx` |
| Profile/password | `src/components/kanban/user-profile-dialog.tsx` |
| Task history modal | `src/components/kanban/task-history-dialog.tsx` |
