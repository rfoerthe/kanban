"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";
import type { Priority, TaskAssignee, TaskStatus } from "@/lib/types";

const TASK_INCLUDE = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, username: true },
  },
} as const;

export async function getAssignableUsers(): Promise<TaskAssignee[]> {
  await requireAuth();
  return prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, username: true },
    orderBy: { firstName: "asc" },
  });
}

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
            include: TASK_INCLUDE,
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
            include: TASK_INCLUDE,
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
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: TASK_INCLUDE,
          },
        },
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
    include: { tasks: { include: TASK_INCLUDE } },
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
  priority: Priority = "MEDIUM",
  assigneeId: string | null = null
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
      status: "PLANNED",
      columnId,
      assigneeId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: TASK_INCLUDE,
  });

  const historyEntries: { changeType: string; detail?: string }[] = [
    { changeType: "Task created" },
  ];

  if (assigneeId) {
    const assignee = task.assignee;
    if (assignee) {
      historyEntries.push({
        changeType: "Assignee set",
        detail: `${assignee.firstName} ${assignee.lastName}`,
      });
    }
  }

  await prisma.taskHistory.createMany({
    data: historyEntries.map((entry) => ({
      taskId: task.id,
      changeType: entry.changeType,
      detail: entry.detail ?? null,
      username: user.username,
    })),
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
    assigneeId?: string | null;
  }
) {
  const user = await requireRole(["ADMIN", "USER"]);

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: TASK_INCLUDE,
  });
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

  if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
    if (data.assigneeId === null) {
      const prev = existing.assignee;
      historyEntries.push({
        changeType: "Assignee removed",
        detail: prev ? `${prev.firstName} ${prev.lastName}` : undefined,
      });
    } else {
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { firstName: true, lastName: true },
      });
      if (newAssignee) {
        const prev = existing.assignee;
        const from = prev ? `${prev.firstName} ${prev.lastName}` : "Unassigned";
        historyEntries.push({
          changeType: "Assignee changed",
          detail: `${from} → ${newAssignee.firstName} ${newAssignee.lastName}`,
        });
      }
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
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

const BACKLOG_TASK_INCLUDE = {
  assignee: {
    select: { id: true, firstName: true, lastName: true, username: true },
  },
  column: {
    select: {
      id: true,
      board: { select: { id: true, title: true } },
    },
  },
} as const;

export async function getBacklogTasks() {
  await requireAuth();
  return prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: BACKLOG_TASK_INCLUDE,
  });
}

export async function getBoardSummaries() {
  await requireAuth();
  return prisma.board.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function createBacklogTask(
  title: string,
  description: string = "",
  priority: Priority = "MEDIUM",
  status: TaskStatus = "NEW",
  assigneeId: string | null = null
) {
  const user = await requireRole(["ADMIN", "USER"]);

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      priority,
      status,
      assigneeId,
    },
    include: BACKLOG_TASK_INCLUDE,
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

export async function updateBacklogTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    status?: TaskStatus;
    assigneeId?: string | null;
  }
) {
  const user = await requireRole(["ADMIN", "USER"]);

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: BACKLOG_TASK_INCLUDE,
  });
  if (!existing) throw new Error("Task not found");

  if (data.status && data.status !== "PLANNED" && existing.columnId) {
    throw new Error("Cannot change status while task is assigned to a board");
  }

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
  if (data.status !== undefined && data.status !== existing.status) {
    historyEntries.push({
      changeType: "Status changed",
      detail: `${existing.status} → ${data.status}`,
    });
  }
  if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
    if (data.assigneeId === null) {
      const prev = existing.assignee;
      historyEntries.push({
        changeType: "Assignee removed",
        detail: prev ? `${prev.firstName} ${prev.lastName}` : undefined,
      });
    } else {
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { firstName: true, lastName: true },
      });
      if (newAssignee) {
        const prev = existing.assignee;
        const from = prev ? `${prev.firstName} ${prev.lastName}` : "Unassigned";
        historyEntries.push({
          changeType: "Assignee changed",
          detail: `${from} → ${newAssignee.firstName} ${newAssignee.lastName}`,
        });
      }
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assigneeId: data.assigneeId,
    },
    include: BACKLOG_TASK_INCLUDE,
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

export async function deleteBacklogTask(taskId: string) {
  await requireRole(["ADMIN", "USER"]);

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath("/");
}

export async function assignTaskToBoard(taskId: string, boardId: string) {
  const user = await requireRole(["ADMIN", "USER"]);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });
  if (!board || board.columns.length === 0) {
    throw new Error("Board has no columns");
  }

  const leftmostColumn = board.columns[0];

  const maxPosition = await prisma.task.aggregate({
    where: { columnId: leftmostColumn.id },
    _max: { position: true },
  });

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: leftmostColumn.id,
      status: "PLANNED",
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: BACKLOG_TASK_INCLUDE,
  });

  await prisma.taskHistory.create({
    data: {
      taskId,
      changeType: "Assigned to board",
      detail: board.title,
      username: user.username,
    },
  });

  revalidatePath("/");
  return task;
}

export async function unassignTaskFromBoard(taskId: string) {
  const user = await requireRole(["ADMIN", "USER"]);

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        select: { board: { select: { title: true } } },
      },
    },
  });
  if (!existing) throw new Error("Task not found");

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: null,
      status: "NEW",
      position: 0,
    },
    include: BACKLOG_TASK_INCLUDE,
  });

  await prisma.taskHistory.create({
    data: {
      taskId,
      changeType: "Removed from board",
      detail: existing.column?.board.title,
      username: user.username,
    },
  });

  revalidatePath("/");
  return task;
}
