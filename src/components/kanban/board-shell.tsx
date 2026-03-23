"use client";

import { useEffect, useState } from "react";
import { useBoardStore } from "@/lib/store";
import { Sidebar } from "@/components/kanban/sidebar";
import { BoardHeader } from "@/components/kanban/board-header";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { EmptyState } from "@/components/kanban/empty-state";
import { AuthGuard } from "@/components/kanban/auth-guard";
import type { BoardWithColumns } from "@/lib/types";

export function BoardShell({
  initialBoards,
}: {
  initialBoards: BoardWithColumns[];
}) {
  const {
    boards,
    activeBoardId,
    setBoards,
    setActiveBoardId,
    getActiveBoard,
  } = useBoardStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setBoards(initialBoards);
    if (initialBoards.length > 0 && !activeBoardId) {
      setActiveBoardId(initialBoards[0].id);
    }
  }, [initialBoards, setBoards, setActiveBoardId, activeBoardId]);

  const activeBoard = getActiveBoard();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-muted/30">
        <Sidebar
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={setActiveBoardId}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <BoardHeader
            board={activeBoard}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-hidden min-w-0">
            {activeBoard ? (
              <KanbanBoard board={activeBoard} />
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
