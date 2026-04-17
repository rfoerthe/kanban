"use client";

import { create } from "zustand";
import type {
  BacklogTask,
  BoardSummary,
  Priority,
  TaskStatus,
} from "@/lib/types";
import * as actions from "@/lib/actions";

interface BacklogState {
  tasks: BacklogTask[];
  boards: BoardSummary[];
  isLoading: boolean;

  fetchTasks: () => Promise<void>;
  fetchBoards: () => Promise<void>;

  createTask: (
    title: string,
    description: string,
    priority: Priority,
    status: TaskStatus,
    assigneeId: string | null
  ) => Promise<void>;

  updateTask: (
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: Priority;
      status?: TaskStatus;
      assigneeId?: string | null;
    }
  ) => Promise<void>;

  deleteTask: (taskId: string) => Promise<void>;

  assignToBoard: (taskId: string, boardId: string) => Promise<void>;
  unassignFromBoard: (taskId: string) => Promise<void>;
}

export const useBacklogStore = create<BacklogState>((set) => ({
  tasks: [],
  boards: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const tasks = await actions.getBacklogTasks();
      set({ tasks });
    } catch {
      set({ tasks: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBoards: async () => {
    try {
      const boards = await actions.getBoardSummaries();
      set({ boards });
    } catch {
      set({ boards: [] });
    }
  },

  createTask: async (title, description, priority, status, assigneeId) => {
    const task = await actions.createBacklogTask(
      title,
      description,
      priority,
      status,
      assigneeId
    );
    set((state) => ({ tasks: [task, ...state.tasks] }));
  },

  updateTask: async (taskId, data) => {
    const task = await actions.updateBacklogTask(taskId, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
    }));
  },

  deleteTask: async (taskId) => {
    await actions.deleteBacklogTask(taskId);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },

  assignToBoard: async (taskId, boardId) => {
    const task = await actions.assignTaskToBoard(taskId, boardId);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
    }));
  },

  unassignFromBoard: async (taskId) => {
    const task = await actions.unassignTaskFromBoard(taskId);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? task : t)),
    }));
  },
}));
