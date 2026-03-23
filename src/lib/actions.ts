"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import type { Priority } from "@/lib/types";

export async function getBoards() {
  await requireAuth();
  return prisma.board.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
}

export async function getBoard(boardId: string) {
  await requireAuth();
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
}

export async function createBoard(title: string) {
  await requireRole(["ADMIN"]);

  const board = await prisma.board.create({
    data: {
      title,
      columns: {
        create: [
          { title: "To Do", position: 0 },
          { title: "In Progress", position: 1 },
          { title: "Done", position: 2 },
        ],
      },
    },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { tasks: true },
      },
    },
  });

  revalidatePath("/");
  return board;
}

export async function updateBoard(boardId: string, title: string) {
  await requireRole(["ADMIN"]);

  const board = await prisma.board.update({
    where: { id: boardId },
    data: { title },
  });

  revalidatePath("/");
  return board;
}

export async function deleteBoard(boardId: string) {
  await requireRole(["ADMIN"]);

  await prisma.board.delete({
    where: { id: boardId },
  });

  revalidatePath("/");
}

export async function createColumn(boardId: string, title: string) {
  await requireRole(["ADMIN"]);

  const maxPosition = await prisma.column.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const column = await prisma.column.create({
    data: {
      title,
      boardId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: { tasks: true },
  });

  revalidatePath("/");
  return column;
}

export async function updateColumn(columnId: string, title: string) {
  await requireRole(["ADMIN"]);

  const column = await prisma.column.update({
    where: { id: columnId },
    data: { title },
  });

  revalidatePath("/");
  return column;
}

export async function deleteColumn(columnId: string) {
  await requireRole(["ADMIN"]);

  const taskCount = await prisma.task.count({ where: { columnId } });
  if (taskCount > 0) {
    throw new Error(
      "Column still has tasks. Move or delete all tasks before deleting this column."
    );
  }

  await prisma.column.delete({
    where: { id: columnId },
  });

  revalidatePath("/");
}

export async function createTask(
  columnId: string,
  title: string,
  description: string = "",
  priority: Priority = "MEDIUM"
) {
  const user = await requireRole(["ADMIN", "USER"]);

  const maxPosition = await prisma.task.aggregate({
    where: { columnId },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      priority,
      columnId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await prisma.taskHistory.create({
    data: {
      taskId: task.id,
      changeType: "Task created",
      username: user.username,
    },
  });

  revalidatePath("/");
  return task;
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
  }
) {
  const user = await requireRole(["ADMIN", "USER"]);

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error("Task not found");

  const historyEntries: { changeType: string; detail?: string }[] = [];

  if (data.title !== undefined && data.title !== existing.title) {
    historyEntries.push({ changeType: "Title changed" });
  }

  if (data.description !== undefined && data.description !== existing.description) {
    historyEntries.push({ changeType: "Description changed" });
  }

  if (data.priority !== undefined && data.priority !== existing.priority) {
    historyEntries.push({
      changeType: "Priority changed",
      detail: `${existing.priority} → ${data.priority}`,
    });
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
  });

  if (historyEntries.length > 0) {
    await prisma.taskHistory.createMany({
      data: historyEntries.map((entry) => ({
        taskId,
        changeType: entry.changeType,
        detail: entry.detail ?? null,
        username: user.username,
      })),
    });
  }

  revalidatePath("/");
  return task;
}

export async function deleteTask(taskId: string) {
  await requireRole(["ADMIN", "USER"]);

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/");
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  newPosition: number
) {
  await requireRole(["ADMIN", "USER"]);

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
    });

    if (!task) throw new Error("Task not found");

    const isMovingBetweenColumns = task.columnId !== targetColumnId;

    if (isMovingBetweenColumns) {
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          position: { gt: task.position },
        },
        data: { position: { decrement: 1 } },
      });

      await tx.task.updateMany({
        where: {
          columnId: targetColumnId,
          position: { gte: newPosition },
        },
        data: { position: { increment: 1 } },
      });
    } else {
      if (newPosition > task.position) {
        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: { gt: task.position, lte: newPosition },
            id: { not: taskId },
          },
          data: { position: { decrement: 1 } },
        });
      } else if (newPosition < task.position) {
        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: { gte: newPosition, lt: task.position },
            id: { not: taskId },
          },
          data: { position: { increment: 1 } },
        });
      }
    }

    await tx.task.update({
      where: { id: taskId },
      data: {
        columnId: targetColumnId,
        position: newPosition,
      },
    });
  });

  revalidatePath("/");
}

export async function reorderColumns(
  columnId: string,
  newPosition: number
) {
  await requireRole(["ADMIN"]);

  await prisma.$transaction(async (tx) => {
    const column = await tx.column.findUnique({
      where: { id: columnId },
    });

    if (!column) throw new Error("Column not found");

    if (newPosition > column.position) {
      await tx.column.updateMany({
        where: {
          boardId: column.boardId,
          position: { gt: column.position, lte: newPosition },
          id: { not: columnId },
        },
        data: { position: { decrement: 1 } },
      });
    } else if (newPosition < column.position) {
      await tx.column.updateMany({
        where: {
          boardId: column.boardId,
          position: { gte: newPosition, lt: column.position },
          id: { not: columnId },
        },
        data: { position: { increment: 1 } },
      });
    }

    await tx.column.update({
      where: { id: columnId },
      data: { position: newPosition },
    });
  });

  revalidatePath("/");
}

export async function getTaskHistory(taskId: string) {
  await requireAuth();

  return prisma.taskHistory.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
}
