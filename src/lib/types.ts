import type { Board, Column, Task } from "@/generated/prisma/client";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type TaskStatus = "NEW" | "PLANNED" | "DONE" | "REVOKED";

export type UserRole = "ADMIN" | "USER" | "VIEWER";

export type SafeUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
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

export type TaskAssignee = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

export type TaskWithRelations = Task & {
  assignee: TaskAssignee | null;
};

export type BacklogTask = Task & {
  assignee: TaskAssignee | null;
  column: {
    id: string;
    board: { id: string; title: string };
  } | null;
};

export type BoardSummary = {
  id: string;
  title: string;
};

export type ColumnWithTasks = Column & {
  tasks: TaskWithRelations[];
};

export type BoardWithColumns = Board & {
  columns: ColumnWithTasks[];
};
