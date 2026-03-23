import type { Board, Column, Task } from "@/generated/prisma/client";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

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

export type TaskWithRelations = Task;

export type ColumnWithTasks = Column & {
  tasks: TaskWithRelations[];
};

export type BoardWithColumns = Board & {
  columns: ColumnWithTasks[];
};
