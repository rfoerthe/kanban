# Drag-and-Drop

## Scope

Drag-and-drop exists only in the **Boards** surface.

- `src/components/kanban/kanban-board.tsx` — DnD context and handlers
- `src/components/kanban/kanban-column.tsx` — sortable/droppable column nodes
- `src/components/kanban/task-card.tsx` — sortable task nodes
- `src/lib/store.ts` — optimistic move/reorder state updates
- `src/lib/actions.ts` — final persistence via `moveTask()` and `reorderColumns()`

The **Tasks** view is table-based and has no drag-and-drop.

## Libraries

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

## Draggable types

Two domain types are used in `data.current`:

- `type: "column"`
- `type: "task"`

These tags let the handlers branch correctly during drag events.

## Sensors

The board uses:

- `PointerSensor` with a 5px activation distance
- `KeyboardSensor` with `sortableKeyboardCoordinates`

The small activation threshold helps avoid accidental drags from clicks inside cards and columns.

## Column drag behavior

- only `ADMIN` can drag columns
- `KanbanColumn` disables `useSortable` for columns when the user is not admin
- on drop, `KanbanBoard` calls:
  - `reorderColumnOptimistic(...)`
  - then `persistColumnReorder(...)`

`persistColumnReorder()` calls `reorderColumns()` server-side and refetches boards if persistence fails.

## Task drag behavior

- `VIEWER` cannot drag tasks
- `TaskCard` disables `useSortable` for viewers
- tasks can move:
  - within a column
  - across columns
  - into empty columns

The flow is:

1. optimistic local move in `useBoardStore`
2. async persistence with `moveTask()`
3. rollback via refetch on failure

## Empty-column support

`KanbanColumn` registers both:

- a sortable ref for column DnD
- a droppable ref for task drop detection

That dual registration is what allows empty columns to accept dropped tasks.

## Collision strategy

`KanbanBoard` uses custom collision handling built around dnd-kit helpers so empty columns can still be targeted correctly instead of only existing task cards.

## Overlay behavior

Task drags render an overlay version of `TaskCard` with extra visual treatment.

Columns rely on the regular dragging state rather than a fully custom overlay card.

## Persistence semantics

### `moveTask(taskId, targetColumnId, newPosition)`

- handles same-column and cross-column moves
- shifts sibling positions transactionally

### `reorderColumns(columnId, newPosition)`

- shifts sibling column positions within the board transactionally

## Important limitation

DnD changes **position and column placement only**. It does not directly edit:

- task priority
- task assignee
- task history display
- backlog-only task status management

Those are handled elsewhere in dialogs and server actions.
