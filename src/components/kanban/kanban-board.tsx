"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCorners,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskCard } from "@/components/kanban/task-card";
import { useBoardStore } from "@/lib/store";
import type { BoardWithColumns, TaskWithRelations } from "@/lib/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  board: BoardWithColumns;
}

export function KanbanBoard({ board }: KanbanBoardProps) {
  const {
    moveTaskOptimistic,
    persistTaskMove,
    reorderColumnOptimistic,
    persistColumnReorder,
  } = useBoardStore();

  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // These three refs prevent the infinite loop: moveTaskOptimistic → re-render → dragOver → moveTaskOptimistic.
  // dragOriginColRef: the column the task started in (findColumnByTaskId is wrong after a move).
  // movedToColRef: the column we already moved into — skip repeated dragOver events for the same target.
  // isProcessingDragOverRef: blocks re-entrant calls during synchronous re-renders.
  const dragOriginColRef = useRef<string | null>(null);
  const movedToColRef = useRef<string | null>(null);
  const isProcessingDragOverRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args);

      if (pointerCollisions.length > 0) {
        const columnCollision = pointerCollisions.find(
          (c) => c.data?.droppableContainer?.data?.current?.type === "column"
        );

        if (columnCollision) {
          const colId = columnCollision.id;
          const col = board.columns.find((c) => c.id === colId);
          if (col && col.tasks.length === 0) {
            return [columnCollision];
          }
        }

        return pointerCollisions;
      }

      return closestCorners(args);
    },
    [board.columns]
  );

  const columnIds = useMemo(
    () => board.columns.map((c) => c.id),
    [board.columns]
  );

  const findColumnByTaskId = useCallback(
    (taskId: string) => {
      return board.columns.find((c) => c.tasks.some((t) => t.id === taskId));
    },
    [board.columns]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const activeData = active.data.current;

      if (activeData?.type === "task") {
        const col = findColumnByTaskId(active.id as string);
        const task = col?.tasks.find((t) => t.id === active.id);
        if (task) {
          setActiveTask(task);
          dragOriginColRef.current = col?.id ?? null;
          movedToColRef.current = null;
        }
      } else if (activeData?.type === "column") {
        setActiveColumnId(active.id as string);
      }
    },
    [findColumnByTaskId]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (isProcessingDragOverRef.current) return;

      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type !== "task") return;

      const activeTaskId = active.id as string;

      const currentSourceColId = movedToColRef.current ?? dragOriginColRef.current;
      if (!currentSourceColId) return;

      let targetColumnId: string;
      let targetPosition: number;

      if (overData?.type === "column") {
        targetColumnId = over.id as string;
        const targetCol = board.columns.find((c) => c.id === targetColumnId);
        targetPosition = targetCol?.tasks.length ?? 0;
      } else if (overData?.type === "task") {
        const overCol = findColumnByTaskId(over.id as string);
        if (!overCol) return;
        targetColumnId = overCol.id;
        const overIndex = overCol.tasks.findIndex((t) => t.id === over.id);
        targetPosition = overIndex;
      } else {
        return;
      }

      if (currentSourceColId === targetColumnId) return;
      if (movedToColRef.current === targetColumnId) return;

      isProcessingDragOverRef.current = true;

      moveTaskOptimistic(
        activeTaskId,
        currentSourceColId,
        targetColumnId,
        targetPosition
      );

      movedToColRef.current = targetColumnId;

      isProcessingDragOverRef.current = false;
    },
    [board.columns, findColumnByTaskId, moveTaskOptimistic]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.data.current?.type === "column" && over) {
        const oldIndex = board.columns.findIndex((c) => c.id === active.id);
        const newIndex = board.columns.findIndex((c) => c.id === over.id);

        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          reorderColumnOptimistic(active.id as string, oldIndex, newIndex);
          persistColumnReorder(active.id as string, newIndex);
        }
      }

      if (active.data.current?.type === "task" && activeTask && over) {
        const activeTaskId = active.id as string;
        const overData = over.data.current;
        const sourceCol = findColumnByTaskId(activeTaskId);

        if (sourceCol) {
          const targetColumnId = sourceCol.id;
          let targetPosition = sourceCol.tasks.findIndex((t) => t.id === activeTaskId);

          if (overData?.type === "task" && over.id !== activeTaskId) {
            const overCol = findColumnByTaskId(over.id as string);
            if (overCol && overCol.id === sourceCol.id) {
              const overIndex = overCol.tasks.findIndex((t) => t.id === over.id);
              if (overIndex !== -1 && overIndex !== targetPosition) {
                moveTaskOptimistic(activeTaskId, sourceCol.id, sourceCol.id, overIndex);
                targetPosition = overIndex;
              }
            }
          }

          persistTaskMove(activeTaskId, targetColumnId, targetPosition);
        }
      }

      dragOriginColRef.current = null;
      movedToColRef.current = null;
      isProcessingDragOverRef.current = false;
      setActiveTask(null);
      setActiveColumnId(null);
    },
    [
      board.columns,
      activeTask,
      findColumnByTaskId,
      moveTaskOptimistic,
      reorderColumnOptimistic,
      persistColumnReorder,
      persistTaskMove,
    ]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="h-full w-full overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex h-full gap-3 p-4 pb-8 sm:gap-4 sm:p-6">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                isOverlay={activeColumnId === column.id}
              />
            ))}
          </SortableContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {typeof window !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
            {activeTask && <TaskCard task={activeTask} isOverlay />}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}
