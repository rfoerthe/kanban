"use client";

import { create } from "zustand";
import type {
  BoardWithColumns,
  ColumnWithTasks,
  Priority,
  TaskWithRelations,
} from "@/lib/types";
import * as actions from "@/lib/actions";

interface BoardState {
  boards: BoardWithColumns[];
  activeBoardId: string | null;
  isLoading: boolean;

  setBoards: (boards: BoardWithColumns[]) => void;
  setActiveBoardId: (id: string | null) => void;
  getActiveBoard: () => BoardWithColumns | undefined;
  fetchBoards: () => Promise<void>;

  createBoard: (title: string) => Promise<void>;
  updateBoard: (boardId: string, title: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (columnId: string, title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;

  createTask: (
    columnId: string,
    title: string,
    description: string,
    priority: Priority,
    assigneeId: string | null
  ) => Promise<void>;
  updateTask: (
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: Priority;
      assigneeId?: string | null;
    }
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  moveTaskOptimistic: (
    taskId: string,
    sourceColumnId: string,
    targetColumnId: string,
    newPosition: number
  ) => void;
  persistTaskMove: (
    taskId: string,
    targetColumnId: string,
    newPosition: number
  ) => Promise<void>;

  reorderColumnOptimistic: (
    columnId: string,
    oldPosition: number,
    newPosition: number
  ) => void;
  persistColumnReorder: (
    columnId: string,
    newPosition: number
  ) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoardId: null,
  isLoading: false,

  setBoards: (boards) => set({ boards }),

  setActiveBoardId: (id) => set({ activeBoardId: id }),

  getActiveBoard: () => {
    const { boards, activeBoardId } = get();
    return boards.find((b) => b.id === activeBoardId);
  },

  fetchBoards: async () => {
    try {
      const boards = await actions.getBoards();
      set({ boards });
      const { activeBoardId } = get();
      if (!activeBoardId && boards.length > 0) {
        set({ activeBoardId: boards[0].id });
      }
    } catch {
      set({ boards: [] });
    }
  },

  createBoard: async (title) => {
    const board = await actions.createBoard(title);
    set((state) => ({
      boards: [board, ...state.boards],
      activeBoardId: board.id,
    }));
  },

  updateBoard: async (boardId, title) => {
    await actions.updateBoard(boardId, title);
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId ? { ...b, title } : b
      ),
    }));
  },

  deleteBoard: async (boardId) => {
    await actions.deleteBoard(boardId);
    set((state) => {
      const filtered = state.boards.filter((b) => b.id !== boardId);
      return {
        boards: filtered,
        activeBoardId:
          state.activeBoardId === boardId
            ? filtered[0]?.id ?? null
            : state.activeBoardId,
      };
    });
  },

  createColumn: async (boardId, title) => {
    const column = await actions.createColumn(boardId, title);
    const columnWithTasks: ColumnWithTasks = { ...column, tasks: column.tasks };
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId
          ? { ...b, columns: [...b.columns, columnWithTasks] }
          : b
      ),
    }));
  },

  updateColumn: async (columnId, title) => {
    await actions.updateColumn(columnId, title);
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.map((c) =>
          c.id === columnId ? { ...c, title } : c
        ),
      })),
    }));
  },

  deleteColumn: async (columnId) => {
    await actions.deleteColumn(columnId);
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.filter((c) => c.id !== columnId),
      })),
    }));
  },

  createTask: async (columnId, title, description, priority, assigneeId) => {
    const task = await actions.createTask(columnId, title, description, priority, assigneeId);
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.map((c) =>
          c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c
        ),
      })),
    }));
  },

  updateTask: async (taskId, data) => {
    const task = await actions.updateTask(taskId, data);
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId ? { ...t, ...task } : t
          ),
        })),
      })),
    }));
  },

  deleteTask: async (taskId) => {
    await actions.deleteTask(taskId);
    set((state) => ({
      boards: state.boards.map((b) => ({
        ...b,
        columns: b.columns.map((c) => ({
          ...c,
          tasks: c.tasks.filter((t) => t.id !== taskId),
        })),
      })),
    }));
  },

  moveTaskOptimistic: (taskId, sourceColumnId, targetColumnId, newPosition) => {
    set((state) => ({
      boards: state.boards.map((b) => {
        const sourceCol = b.columns.find((c) => c.id === sourceColumnId);
        if (!sourceCol) return b;

        const task = sourceCol.tasks.find((t) => t.id === taskId);
        if (!task) return b;

        const updatedTask: TaskWithRelations = {
          ...task,
          columnId: targetColumnId,
          position: newPosition,
        };

        return {
          ...b,
          columns: b.columns.map((c) => {
            if (c.id === sourceColumnId && sourceColumnId === targetColumnId) {
              const filtered = c.tasks.filter((t) => t.id !== taskId);
              filtered.splice(newPosition, 0, updatedTask);
              return {
                ...c,
                tasks: filtered.map((t, i) => ({ ...t, position: i })),
              };
            }

            if (c.id === sourceColumnId) {
              return {
                ...c,
                tasks: c.tasks
                  .filter((t) => t.id !== taskId)
                  .map((t, i) => ({ ...t, position: i })),
              };
            }

            if (c.id === targetColumnId) {
              const tasks = [...c.tasks];
              tasks.splice(newPosition, 0, updatedTask);
              return {
                ...c,
                tasks: tasks.map((t, i) => ({ ...t, position: i })),
              };
            }

            return c;
          }),
        };
      }),
    }));
  },

  persistTaskMove: async (taskId, targetColumnId, newPosition) => {
    try {
      await actions.moveTask(taskId, targetColumnId, newPosition);
    } catch (error) {
      console.error("Failed to persist task move:", error);
      const boards = await actions.getBoards();
      set({ boards });
    }
  },

  reorderColumnOptimistic: (columnId, oldPosition, newPosition) => {
    set((state) => ({
      boards: state.boards.map((b) => {
        const colIndex = b.columns.findIndex((c) => c.id === columnId);
        if (colIndex === -1) return b;

        const columns = [...b.columns];
        const [moved] = columns.splice(oldPosition, 1);
        columns.splice(newPosition, 0, moved);

        return {
          ...b,
          columns: columns.map((c, i) => ({ ...c, position: i })),
        };
      }),
    }));
  },

  persistColumnReorder: async (columnId, newPosition) => {
    try {
      await actions.reorderColumns(columnId, newPosition);
    } catch (error) {
      console.error("Failed to persist column reorder:", error);
      const boards = await actions.getBoards();
      set({ boards });
    }
  },
}));
