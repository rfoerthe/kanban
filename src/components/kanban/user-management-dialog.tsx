"use client";

import { useEffect, useState, useCallback } from "react";
import * as authActions from "@/lib/auth-actions";
import { useAuthStore } from "@/lib/auth-store";
import type { SafeUser } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  Check,
  Pencil,
  KeyRound,
  Plus,
  ArrowLeft,
  Trash2,
} from "lucide-react";

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "list" | "create" | "edit" | "reset-password";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  USER: "User",
  VIEWER: "Viewer",
};

export function UserManagementDialog({
  open,
  onOpenChange,
}: UserManagementDialogProps) {
  const { user: currentUser } = useAuthStore();
  const [view, setView] = useState<View>("list");
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<SafeUser | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authActions.getUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadUsers();
      setView("list");
    }
  }, [open, loadUsers]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setRole("USER");
    setError("");
    setSuccess("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
      setSelectedUser(null);
      setConfirmDeleteUser(null);
      setView("list");
    }
    onOpenChange(newOpen);
  };

  const goToList = () => {
    resetForm();
    setSelectedUser(null);
    setConfirmDeleteUser(null);
    setView("list");
    loadUsers();
  };

  const goToCreate = () => {
    resetForm();
    setView("create");
  };

  const goToEdit = (user: SafeUser) => {
    resetForm();
    setSelectedUser(user);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setUsername(user.username);
    setRole(user.role);
    setView("edit");
  };

  const goToResetPassword = (user: SafeUser) => {
    resetForm();
    setSelectedUser(user);
    setView("reset-password");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password)
      return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await authActions.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        password,
        role,
      });

      if (result.success) {
        goToList();
      } else {
        setError(result.error ?? "Failed to create user");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !firstName.trim() || !lastName.trim() || !username.trim())
      return;

    setError("");
    setIsSubmitting(true);
    try {
      const result = await authActions.updateUser(selectedUser.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        role,
      });

      if (result.success) {
        setSuccess("User updated successfully");
        loadUsers();
      } else {
        setError(result.error ?? "Failed to update user");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await authActions.resetPassword(
        selectedUser.id,
        password
      );

      if (result.success) {
        setSuccess("Password reset successfully");
        setPassword("");
      } else {
        setError(result.error ?? "Failed to reset password");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: SafeUser) => {
    setError("");
    setIsSubmitting(true);
    try {
      const result = await authActions.deleteUser(user.id);
      if (result.success) {
        setConfirmDeleteUser(null);
        loadUsers();
      } else {
        setError(result.error ?? "Failed to delete user");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusMessage = () => (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {view === "list" && "User Management"}
            {view === "create" && "Create User"}
            {view === "edit" &&
              `Edit User — ${selectedUser?.firstName} ${selectedUser?.lastName}`}
            {view === "reset-password" &&
              `Reset Password — ${selectedUser?.firstName} ${selectedUser?.lastName}`}
          </DialogTitle>
        </DialogHeader>

        {/* ====== USER LIST ====== */}
        {view === "list" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Username</th>
                      <th className="pb-2 pr-4 font-medium">Role</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {u.username}
                        </td>
                        <td className="py-2 pr-4">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => goToEdit(u)}
                              title="Edit user"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => goToResetPassword(u)}
                              title="Reset password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            {u.id !== currentUser?.id && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmDeleteUser(u)}
                                title="Delete user"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && !confirmDeleteUser && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {confirmDeleteUser && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <p className="text-sm">
                  Delete{" "}
                  <span className="font-medium">
                    {confirmDeleteUser.firstName} {confirmDeleteUser.lastName}
                  </span>
                  ? This cannot be undone.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteUser(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(confirmDeleteUser)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button className="gap-1.5" onClick={goToCreate}>
                <Plus className="h-3.5 w-3.5" />
                New User
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ====== CREATE USER ====== */}
        {view === "create" && (
          <form onSubmit={handleCreate}>
            <div className="space-y-3 py-2">
              {renderStatusMessage()}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-first-name">First Name</Label>
                  <Input
                    id="create-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Kanban"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-last-name">Last Name</Label>
                  <Input
                    id="create-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="User"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-username">Username</Label>
                <Input
                  id="create-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john.doe"
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    if (v) setRole(v);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={goToList}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={
                  !firstName.trim() ||
                  !lastName.trim() ||
                  !username.trim() ||
                  !password ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ====== EDIT USER ====== */}
        {view === "edit" && selectedUser && (
          <form onSubmit={handleUpdate}>
            <div className="space-y-3 py-2">
              {renderStatusMessage()}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    if (v) setRole(v);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <p className="text-xs text-muted-foreground">
                To reset this user&apos;s password, go back and click the key
                icon.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={goToList}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={
                  !firstName.trim() ||
                  !lastName.trim() ||
                  !username.trim() ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ====== RESET PASSWORD ====== */}
        {view === "reset-password" && selectedUser && (
          <form onSubmit={handleResetPassword}>
            <div className="space-y-3 py-2">
              {renderStatusMessage()}

              <p className="text-sm text-muted-foreground">
                Set a new password for{" "}
                <span className="font-medium text-foreground">
                  {selectedUser.firstName} {selectedUser.lastName}
                </span>{" "}
                ({selectedUser.username}).
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={goToList}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button type="submit" disabled={!password || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
