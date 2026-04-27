"use client";

import { useState } from "react";
import { useBoardStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreateBoardDialog } from "@/components/kanban/create-board-dialog";
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  Trash2,
  Loader2,
  ClipboardList,
} from "lucide-react";
import type { BoardWithColumns } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ActiveView = "boards" | "tasks";

interface SidebarProps {
  boards: BoardWithColumns[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
}

export function Sidebar({
  boards,
  activeBoardId,
  onSelectBoard,
  isOpen,
  onToggle,
  activeView,
  onChangeView,
}: SidebarProps) {
  const { deleteBoard } = useBoardStore();
  const { user } = useAuthStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState<{ id: string; title: string } | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const handleDelete = async () => {
    if (!confirmDeleteBoard) return;
    setDeletingId(confirmDeleteBoard.id);
    try {
      await deleteBoard(confirmDeleteBoard.id);
      setConfirmDeleteBoard(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <aside
        className={cn(
          "flex h-full flex-col border-r bg-card transition-all duration-300",
          isOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Kanban Boards</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggle}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="px-2 py-2 space-y-1">
          <button
            onClick={() => onChangeView("tasks")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              activeView === "tasks"
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <ClipboardList className="h-4 w-4" />
            Tasks
          </button>
          <button
            onClick={() => onChangeView("boards")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              activeView === "boards"
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Boards
          </button>
        </div>

        <Separator />

        {activeView === "boards" && (
          <>
            <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-1">
            {boards.map((board) => (
              <div
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectBoard(board.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectBoard(board.id);
                  }
                }}
                className={cn(
                  "group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-150 cursor-pointer animate-kanban-slide-in",
                  activeBoardId === board.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="truncate">{board.title}</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
                      activeBoardId === board.id
                        ? "hover:bg-primary-foreground/20 text-primary-foreground"
                        : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteBoard({ id: board.id, title: board.title });
                    }}
                    disabled={deletingId === board.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {isAdmin && (
          <div className="p-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              New Board
            </Button>
          </div>
        )}
          </>
        )}
      </aside>

      <CreateBoardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <Dialog
        open={confirmDeleteBoard !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteBoard(null); }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {confirmDeleteBoard?.title}
              </span>
              ? All columns and tasks will be permanently removed. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteBoard(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete Board"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
