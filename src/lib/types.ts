import type { Board, Column, Task } from "@/generated/prisma/client";

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type TaskWithRelations = Task;

export type ColumnWithTasks = Column & {
  tasks: TaskWithRelations[];
};

export type BoardWithColumns = Board & {
  columns: ColumnWithTasks[];
};
