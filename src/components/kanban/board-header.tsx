"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateColumnDialog } from "@/components/kanban/create-column-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCircle,
  LogOut,
  Users,
  Loader2,
} from "lucide-react";
import type { BoardWithColumns } from "@/lib/types";
import { useBoardStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";
import { EditBoardDialog } from "@/components/kanban/edit-board-dialog";
import { UserProfileDialog } from "@/components/kanban/user-profile-dialog";
import { UserManagementDialog } from "@/components/kanban/user-management-dialog";
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
  const { user, logout } = useAuthStore();
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const handleDeleteBoard = async () => {
    if (!board) return;
    setIsDeleting(true);
    try {
      await deleteBoard(board.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
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
          <h1 className="text-lg font-semibold tracking-tight">
            {board?.title ?? "Select a Board"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {board && isAdmin && (
            <>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAddColumn(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Column
                </Button>
              )}

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
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
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

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {board?.title}
              </span>
              ? All columns and tasks will be permanently removed. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBoard}
              disabled={isDeleting}
            >
              {isDeleting ? (
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
