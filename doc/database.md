# Database

## Overview

SQLite database managed by Prisma 7 with the LibSQL adapter. Five models:

```
User
Board ──< Column ──< Task ──< TaskHistory
```

Cascade deletes propagate downward: deleting a Board deletes its Columns, which delete their Tasks, which delete their TaskHistory entries.

## Models

### User

```prisma
model User {
  id           String   @id @default(cuid())
  firstName    String
  lastName     String
  username     String   @unique
  passwordHash String
  role         String   @default("USER")
  createdAt    DateTime @default(now())
}
```

| Field | Notes |
|---|---|
| `id` | CUID primary key |
| `username` | Unique. Used for login. |
| `passwordHash` | Format: `saltHex:hashHex` (PBKDF2-SHA512). See [authentication.md](authentication.md). |
| `role` | Plain string: `"ADMIN"`, `"USER"`, or `"VIEWER"`. Enforced by application logic, not a DB enum. |

No email field. No sessions table — sessions are managed as stateless cookies.

---

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

A board is just a title and a list of ordered columns.

---

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

| Field | Notes |
|---|---|
| `position` | 0-based integer. Columns in a board are ordered by this field. |
| `boardId` | Foreign key. Cascade delete: deleting the board deletes all its columns. |

**Business rule:** A column cannot be deleted if it has tasks. This is enforced in the `deleteColumn` Server Action (throws an error if `taskCount > 0`), not at the database level.

---

### Task

```prisma
model Task {
  id          String        @id @default(cuid())
  title       String
  description String?
  priority    String        @default("MEDIUM")
  position    Int           @default(0)
  columnId    String
  column      Column        @relation(fields: [columnId], references: [id], onDelete: Cascade)
  history     TaskHistory[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([columnId, position])
}
```

| Field | Notes |
|---|---|
| `description` | Optional. |
| `priority` | Plain string: `"LOW"`, `"MEDIUM"`, or `"HIGH"`. Default: `"MEDIUM"`. |
| `position` | 0-based integer within its column. |
| `columnId` | Foreign key. Cascade delete: deleting the column deletes all its tasks. |

---

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

Immutable audit log. Records are created automatically by `createTask` and `updateTask` Server Actions.

| Field | Notes |
|---|---|
| `changeType` | Free-text string: `"Task created"`, `"Title changed"`, `"Description changed"`, `"Priority changed"` |
| `detail` | Optional context, e.g. `"MEDIUM → HIGH"` for priority changes |
| `username` | Denormalized — stored as a string, not a foreign key to User. History is preserved even if the user is deleted. |

---

## Position management

Both `moveTask` and `reorderColumns` use integer-shift transactions — no fractional positions.

### Moving a task between columns

```
1. Decrement position of all tasks in the SOURCE column where position > task.position
2. Increment position of all tasks in the TARGET column where position >= newPosition
3. Update the task: set columnId = targetColumnId, position = newPosition
```

### Moving a task within the same column

```
Moving DOWN (newPosition > oldPosition):
  Decrement position of tasks where position > oldPosition AND position <= newPosition

Moving UP (newPosition < oldPosition):
  Increment position of tasks where position >= newPosition AND position < oldPosition

Update the task: set position = newPosition
```

### Reordering columns

Same pattern as within-column task reorder, applied to the `Column` model scoped by `boardId`.

All position updates run inside a `prisma.$transaction` to ensure consistency.

---

## Migrations

Three migrations under `prisma/migrations/`:

| Migration | What it adds |
|---|---|
| `20260319214244_init` | Board, Column, Task models |
| `20260323000000_add_users` | User model |
| `20260324000000_add_task_history` | TaskHistory model |

**Important:** `prisma migrate deploy` does not support the LibSQL protocol. Migrations are applied by `scripts/migrate-turso.ts`, which reads the SQL files directly and tracks applied migrations in a `_prisma_migrations` table it creates itself. This script runs automatically as part of `npm run build`.

To apply migrations manually:

```bash
npm run db:migrate
```

To create a new migration after editing `schema.prisma`:

```bash
npx prisma migrate dev --name <name>
# Commit the generated SQL file in prisma/migrations/
# On next deploy, npm run build will apply it automatically
```

---

## Prisma client

The client is generated into `src/generated/prisma/` (configured via `generator client { output = "../src/generated/prisma" }` in `schema.prisma`). This directory is **gitignored** — it must be regenerated on every fresh checkout.

The singleton lives in `src/lib/prisma.ts`. It wires the LibSQL adapter using environment variables:

```ts
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(client);
```

Run `npx prisma generate` after any schema change to regenerate the client.
