"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateColumnDialog } from "@/components/kanban/create-column-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelLeftOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { BoardWithColumns } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { EditBoardDialog } from "@/components/kanban/edit-board-dialog";
import { ThemeToggle } from "@/components/kanban/theme-toggle";

interface BoardHeaderProps {
  board?: BoardWithColumns;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function BoardHeader({
  board,
  sidebarOpen,
  onToggleSidebar,
}: BoardHeaderProps) {
  const { deleteBoard } = useBoardStore();
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showEditBoard, setShowEditBoard] = useState(false);

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
          <h1 className="text-lg font-semibold tracking-tight">
            {board?.title ?? "Select a Board"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {board && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAddColumn(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Column
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditBoard(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename Board
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteBoard(board.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      {board && (
        <>
          <CreateColumnDialog
            open={showAddColumn}
            onOpenChange={setShowAddColumn}
            boardId={board.id}
          />
          <EditBoardDialog
            open={showEditBoard}
            onOpenChange={setShowEditBoard}
            board={board}
          />
        </>
      )}
    </>
  );
}
