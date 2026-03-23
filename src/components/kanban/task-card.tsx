"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, GripVertical, History } from "lucide-react";
import { useBoardStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { EditTaskDialog } from "@/components/kanban/edit-task-dialog";
import { TaskHistoryDialog } from "@/components/kanban/task-history-dialog";
import type { TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithRelations;
  isOverlay?: boolean;
}

const priorityConfig = {
  HIGH: {
    label: "High",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  MEDIUM: {
    label: "Medium",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  LOW: {
    label: "Low",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
} as const;

export function TaskCard({ task, isOverlay }: TaskCardProps) {
  const { deleteTask } = useBoardStore();
  const { user } = useAuthStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const isViewer = user?.role === "VIEWER";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: isViewer,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md animate-kanban-fade-in",
          isDragging && !isOverlay && "opacity-30",
          isOverlay && "shadow-xl ring-2 ring-primary/20 rotate-3"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {!isViewer && (
              <button
                className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{task.title}</p>
              {task.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {!isViewer && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {priority && (
          <div className="mt-2 flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0", priority.className)}
            >
              {priority.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              onClick={() => setShowHistoryDialog(true)}
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <EditTaskDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        task={task}
      />

      <TaskHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        taskId={task.id}
      />
    </>
  );
}
