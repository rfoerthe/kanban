# Drag-and-Drop

## Library

`@dnd-kit/core` (v6.3.1) for sensors, context, and overlay; `@dnd-kit/sortable` (v10.0.0) for sortable list behavior.

All DnD logic lives in `src/components/kanban/kanban-board.tsx` (context/handlers) and `src/components/kanban/kanban-column.tsx` (column draggable/droppable).

---

## Data model

Every draggable and droppable is tagged with a `type` in `data.current`:

```ts
// Task card (kanban-column.tsx, task-card.tsx)
useSortable({ id: task.id, data: { type: "task", task } })

// Column (kanban-column.tsx)
useSortable({ id: column.id, data: { type: "column", column } })
useDroppable({ id: column.id, data: { type: "column", column } })
```

All drag event handlers check `active.data.current?.type` and `over.data.current?.type` to branch between task-drag and column-drag logic.

---

## Sensors

```ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },  // must move 5px before drag starts
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

The 5px activation constraint prevents accidental drags when clicking task cards or buttons inside columns.

---

## Collision detection

A custom strategy is used instead of a single built-in algorithm:

```ts
const collisionDetection: CollisionDetection = useCallback((args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    // If pointer is over an empty column, return that column directly.
    // This solves the problem where an empty column has no task droppables to detect.
    const columnCollision = pointerCollisions.find(
      (c) => c.data?.droppableContainer?.data?.current?.type === "column"
    );
    if (columnCollision) {
      const col = board.columns.find((c) => c.id === columnCollision.id);
      if (col && col.tasks.length === 0) {
        return [columnCollision];
      }
    }
    return pointerCollisions;
  }

  // Fall back to closestCorners when the pointer is not over any droppable
  return closestCorners(args);
}, [board.columns]);
```

---

## Re-entry guard refs

Three `useRef` values prevent an infinite loop that would otherwise occur:

```
handleDragOver fires → moveTaskOptimistic() → Zustand set() → re-render
  → board.columns changes → handleDragOver fires again → infinite loop
```

| Ref | Type | Purpose |
|---|---|---|
| `dragOriginColRef` | `string \| null` | The column the task started in. After `moveTaskOptimistic`, `findColumnByTaskId` returns the new column — this ref preserves the original source. |
| `movedToColRef` | `string \| null` | The column we last moved the task into. If `handleDragOver` fires again for the same target column, it returns early. |
| `isProcessingDragOverRef` | `boolean` | Mutex. Set to `true` before calling `moveTaskOptimistic`, reset to `false` after. If `handleDragOver` is called re-entrantly during the synchronous Zustand update, it returns early. |

```ts
const dragOriginColRef = useRef<string | null>(null);
const movedToColRef = useRef<string | null>(null);
const isProcessingDragOverRef = useRef(false);
```

---

## Column drag flow

**`handleDragStart`:** sets `activeColumnId` for the overlay.

**`handleDragEnd` (column path):**

```ts
if (active.data.current?.type === "column" && over) {
  const oldIndex = board.columns.findIndex((c) => c.id === active.id);
  const newIndex = board.columns.findIndex((c) => c.id === over.id);
  if (oldIndex !== newIndex) {
    reorderColumnOptimistic(active.id, oldIndex, newIndex);
    persistColumnReorder(active.id, newIndex);
  }
}
```

`reorderColumnOptimistic` splices the column array and re-indexes positions sequentially. `persistColumnReorder` calls the `reorderColumns` Server Action; on failure it refetches and restores.

---

## Task drag flow

The task drag is split across two events: `handleDragOver` for cross-column moves and `handleDragEnd` for final position.

**`handleDragStart`:**
- Finds the task's column, stores it in `dragOriginColRef`.
- Resets `movedToColRef` to `null`.
- Sets `activeTask` for the overlay.

**`handleDragOver` (fires continuously while dragging):**
1. Returns early if `isProcessingDragOverRef.current` (re-entry guard).
2. Determines `targetColumnId`:
   - If `over` is a column (empty column): uses `over.id`, position = column.tasks.length.
   - If `over` is a task: finds the task's column, uses that column's id.
3. If `targetColumnId === currentSourceColId`: same column — no cross-column move needed, returns early.
4. If `movedToColRef.current === targetColumnId`: already moved here — skip duplicate event.
5. Sets `isProcessingDragOverRef.current = true`.
6. Calls `moveTaskOptimistic(activeTaskId, currentSourceColId, targetColumnId, targetPosition)`.
7. Updates `movedToColRef.current = targetColumnId`.
8. Resets `isProcessingDragOverRef.current = false`.

**`handleDragEnd` (task path):**
1. Finds the task's current column after all `handleDragOver` moves (`findColumnByTaskId`).
2. Gets the task's current position within that column.
3. If `over` is a different task in the same column, calls `moveTaskOptimistic` once more for the final position.
4. Calls `persistTaskMove(taskId, finalColumnId, finalPosition)`.
5. Clears all refs and overlay state.

---

## DragOverlay

```tsx
createPortal(
  <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
    {activeTask && <TaskCard task={activeTask} isOverlay />}
  </DragOverlay>,
  document.body
)
```

Rendered into `document.body` via `createPortal` to escape any stacking context. `activeColumnId` state is tracked but the column overlay is not currently implemented — columns use the native dnd-kit opacity during drag instead.

The `isOverlay` prop on `TaskCard` adds `rotate-2` rotation and a larger drop shadow to the dragged copy.

---

## Dual ref pattern in `KanbanColumn`

A column node must register with both `useSortable` (for column reordering) and `useDroppable` (for task drop detection). Both hooks need to set a ref on the same DOM node:

```tsx
const { setNodeRef: setSortableRef, ... } = useSortable({ id: column.id, data: { type: "column" } });
const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id, data: { type: "column" } });

const setRefs = useCallback(
  (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  },
  [setSortableRef, setDroppableRef]
);

return <div ref={setRefs}>...</div>;
```
