"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "@/components/kanban/task-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useBoardStore } from "@/lib/store";
import { CreateTaskDialog } from "@/components/kanban/create-task-dialog";
import { EditColumnDialog } from "@/components/kanban/edit-column-dialog";
import type { ColumnWithTasks } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: ColumnWithTasks;
  isOverlay?: boolean;
}

export function KanbanColumn({ column, isOverlay }: KanbanColumnProps) {
  const { deleteColumn } = useBoardStore();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditColumn, setShowEditColumn] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column", column },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <>
      <div
        ref={(node) => {
          setSortableRef(node);
          setDroppableRef(node);
        }}
        style={style}
        className={cn(
          "flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 border transition-all duration-200 animate-kanban-fade-in",
          isDragging && "opacity-40",
          isOver && "ring-2 ring-primary/20",
          isOverlay && "shadow-2xl rotate-2"
        )}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold">{column.title}</h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              {column.tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreateTask(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" />}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditColumn(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteColumn(column.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex min-h-[100px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          <SortableContext
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            {column.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </SortableContext>

          {column.tasks.length === 0 && (
            <div
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-xs text-muted-foreground transition-all duration-200",
                isOver && "animate-pulse bg-muted"
              )}
            >
              Drop tasks here
            </div>
          )}
        </div>

        <div className="border-t px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-1.5 text-muted-foreground"
            onClick={() => setShowCreateTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        columnId={column.id}
      />

      <EditColumnDialog
        open={showEditColumn}
        onOpenChange={setShowEditColumn}
        column={column}
      />
    </>
  );
}
