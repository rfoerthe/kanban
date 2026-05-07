# Database

## Overview

The app uses Prisma 7 with the LibSQL adapter on top of:

- **local SQLite** during development
- **remote Turso/LibSQL** in production

Current schema models:

```text
User
Board ──< Column
Task ──< TaskHistory

Task ── optional → Column
Task ── optional → User (assignee)
```

The key evolution since the earlier board-only model is that a task can now exist **without a column**, which is how backlog tasks are represented.

## Models

### User

```prisma
model User {
  id            String   @id @default(cuid())
  firstName     String
  lastName      String
  username      String   @unique
  passwordHash  String
  role          String   @default("USER")
  createdAt     DateTime @default(now())
  assignedTasks Task[]   @relation("TaskAssignee")
}
```

Notes:

- roles are stored as plain strings
- `assignedTasks` is the reverse relation for task assignees
- there is still no session table

### Board

```prisma
model Board {
  id        String   @id @default(cuid())
  title     String
  columns   Column[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Column

```prisma
model Column {
  id       String @id @default(cuid())
  title    String
  position Int    @default(0)
  boardId  String
  board    Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks    Task[]

  @@index([boardId, position])
}
```

Notes:

- column ordering is per board via `position`
- deleting a board cascades to its columns

### Task

```prisma
model Task {
  id          String        @id @default(cuid())
  title       String
  description String?
  priority    String        @default("MEDIUM")
  status      String        @default("NEW")
  position    Int           @default(0)
  columnId    String?
  column      Column?       @relation(fields: [columnId], references: [id], onDelete: SetNull)
  assigneeId  String?
  assignee    User?         @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  history     TaskHistory[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([columnId, position])
  @@index([assigneeId])
  @@index([status])
}
```

Important fields:

| Field | Meaning |
|---|---|
| `priority` | `LOW`, `MEDIUM`, `HIGH` |
| `status` | `NEW`, `PLANNED`, `DONE`, `REVOKED` |
| `columnId` | nullable; `null` means backlog-only task |
| `assigneeId` | nullable task assignee |
| `position` | ordering within a board column |

### TaskHistory

```prisma
model TaskHistory {
  id         String   @id @default(cuid())
  taskId     String
  task       Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  changeType String
  detail     String?
  username   String
  createdAt  DateTime @default(now())

  @@index([taskId, createdAt])
}
```

This is an append-only change log for user-visible task changes while the task still exists.

It is not a permanent audit trail across task deletion, because `TaskHistory.task` uses `onDelete: Cascade`.

Observed change types in the current code include:

- `Task created`
- `Title changed`
- `Description changed`
- `Priority changed`
- `Status changed`
- `Assignee set`
- `Assignee changed`
- `Assignee removed`
- `Assigned to board`
- `Removed from board`

## Delete behavior

This is important because the current schema is no longer a pure downward cascade chain.

### Board deletion

- deleting a `Board` deletes its `Column` rows
- tasks linked to those columns are **not deleted by the `Task → Column` relation**
- because `Task.column` uses `onDelete: SetNull`, those tasks become backlog tasks with `columnId = null`

### Column deletion

- deleting a `Column` also sets linked task `columnId` values to `null`
- however, the application currently blocks deleting a non-empty column in `deleteColumn()`

### User deletion

- deleting a `User` sets `Task.assigneeId` to `null`
- task history entries remain because they store `username` as denormalized text

### Task deletion

- deleting a `Task` cascades to `TaskHistory`
- deleting a task therefore removes its history as well

## Board and backlog semantics

The schema intentionally supports both work modes:

- **Backlog task**: `columnId = null`
- **Board task**: `columnId` points to a column

Server actions use these transitions:

- `assignTaskToBoard()` sets `columnId` to the leftmost board column and `status = "PLANNED"`
- `unassignTaskFromBoard()` clears `columnId` and resets `status = "NEW"`

Board deletion is different from explicit unassignment. When a board is deleted, linked tasks fall back to `columnId = null` through Prisma's `SetNull` relation, but their status is not reset automatically.

## Position management

### Column ordering

Columns are ordered by integer `position` per board.

`reorderColumns()` shifts sibling positions inside a Prisma transaction.

### Task ordering inside a column

Board tasks are ordered by integer `position` within a column.

`moveTask()` handles:

- same-column reorder
- cross-column move
- sibling position shifting in both source and target columns

All writes are done transactionally.

Backlog-only tasks do not participate in DnD ordering; they are shown by `createdAt desc` in the tasks view.

## Migrations

Current migration set:

| Migration | Purpose |
|---|---|
| `20260319214244_init` | Initial board/column/task schema |
| `20260323000000_add_users` | Users |
| `20260324000000_add_task_history` | Task history |
| `20260417000000_add_task_assignee` | Task assignee support |
| `20260417100000_add_task_status_and_optional_column` | Task status + nullable `columnId` |

`prisma migrate deploy` is not used because LibSQL protocol support is missing for that path. Instead, migrations are applied by `scripts/migrate-turso.ts`.

## Prisma client setup

The Prisma client is generated to:

```text
src/generated/prisma/
```

Key setup files:

- `prisma/schema.prisma`
- `src/lib/prisma.ts`
- `prisma.config.ts`
- `scripts/migrate-turso.ts`

The app uses a Prisma singleton with the LibSQL adapter so Next.js hot reloads do not create unnecessary client instances.

## Seed data

`prisma/seed.ts` currently:

- clears tasks, columns, boards, and users
- creates the default admin account
- creates a sample board titled `Project Board`
- seeds four columns: `Backlog`, `To Do`, `In Progress`, `Done`

That seeded board-level `Backlog` column is different from the separate backlog/tasks surface, which is driven by tasks with `columnId = null`.
