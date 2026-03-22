"use client";

import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/lib/store";
import { useState } from "react";
import { CreateBoardDialog } from "@/components/kanban/create-board-dialog";

export function EmptyState() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No board selected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new board or select one from the sidebar.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Board</Button>
      </div>

      <CreateBoardDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
