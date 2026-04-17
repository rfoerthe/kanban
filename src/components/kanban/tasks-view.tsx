"use client";

import { useEffect, useState } from "react";
import { useBacklogStore } from "@/lib/backlog-store";
import { useBoardStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelLeftOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  UserCircle,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateBacklogTaskDialog } from "@/components/kanban/create-backlog-task-dialog";
import { EditBacklogTaskDialog } from "@/components/kanban/edit-backlog-task-dialog";
import { ThemeToggle } from "@/components/kanban/theme-toggle";
import { UserProfileDialog } from "@/components/kanban/user-profile-dialog";
import { UserManagementDialog } from "@/components/kanban/user-management-dialog";
import type { BacklogTask } from "@/lib/types";

interface TasksViewProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  NEW: {
    label: "New",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  PLANNED: {
    label: "Planned",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  DONE: {
    label: "Done",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  REVOKED: {
    label: "Revoked",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  HIGH: {
    label: "High",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

export function TasksView({ sidebarOpen, onToggleSidebar }: TasksViewProps) {
  const {
    tasks,
    boards,
    isLoading,
    fetchTasks,
    fetchBoards,
    deleteTask,
    assignToBoard,
    unassignFromBoard,
  } = useBacklogStore();
  const { fetchBoards: fetchBoardsFull } = useBoardStore();
  const { user, logout } = useAuthStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<BacklogTask | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BacklogTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const isViewer = user?.role === "VIEWER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    fetchTasks();
    fetchBoards();
  }, [fetchTasks, fetchBoards]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteTask(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignToBoard = async (taskId: string, boardId: string) => {
    await assignToBoard(taskId, boardId);
    await fetchBoardsFull();
  };

  const handleUnassignFromBoard = async (taskId: string) => {
    await unassignFromBoard(taskId);
    await fetchBoardsFull();
  };

  const getBoardLabel = (task: BacklogTask) => {
    if (!task.column) return null;
    return task.column.board.title;
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleSidebar}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isViewer && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </Button>
          )}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                <UserCircle className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowProfile(true)}>
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setShowUserManagement(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No tasks yet.</p>
            {!isViewer && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first task
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium w-24">Status</th>
                  <th className="px-4 py-3 font-medium w-24">Priority</th>
                  <th className="px-4 py-3 font-medium w-36">Assignee</th>
                  <th className="px-4 py-3 font-medium w-44">Board</th>
                  {!isViewer && (
                    <th className="px-4 py-3 font-medium w-24 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.NEW;
                  const priority =
                    PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
                  const boardLabel = getBoardLabel(task);
                  const boardValue = task.column
                    ? task.column.board.id
                    : "none";

                  return (
                    <tr
                      key={task.id}
                      className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">{task.title}</span>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            priority.className
                          )}
                        >
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {task.assignee
                          ? `${task.assignee.firstName} ${task.assignee.lastName}`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {isViewer ? (
                          <span className="text-muted-foreground">
                            {boardLabel ?? "\u2014"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Select
                              value={boardValue}
                              onValueChange={(v) => {
                                if (!v || v === "none") {
                                  handleUnassignFromBoard(task.id);
                                } else {
                                  handleAssignToBoard(task.id, v as string);
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-full">
                                <span className="flex flex-1 text-left truncate">
                                  {boardLabel ?? "No board"}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No board</SelectItem>
                                {boards.map((b) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {task.column && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  handleUnassignFromBoard(task.id)
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingTask(task)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setConfirmDelete(task)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <CreateBacklogTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {editingTask && (
        <EditBacklogTaskDialog
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
          task={editingTask}
        />
      )}

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {confirmDelete?.title}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
      />

      {isAdmin && (
        <UserManagementDialog
          open={showUserManagement}
          onOpenChange={setShowUserManagement}
        />
      )}
    </>
  );
}
