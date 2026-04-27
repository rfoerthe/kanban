"use client";

import { useState } from "react";
import { useBacklogStore } from "@/lib/backlog-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Priority, TaskStatus, TaskAssignee } from "@/lib/types";
import { getAssignableUsers } from "@/lib/actions";
import { useEffect } from "react";

interface CreateBacklogTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBacklogTaskDialog({
  open,
  onOpenChange,
}: CreateBacklogTaskDialogProps) {
  const { createTask } = useBacklogStore();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("NEW");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [users, setUsers] = useState<TaskAssignee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      getAssignableUsers().then(setUsers);
    }
  }, [open]);

  const isViewer = user?.role === "VIEWER";

  const assigneeLabel = (() => {
    if (!assigneeId) return "Unassigned";
    const u = users.find((u) => u.id === assigneeId);
    return u ? `${u.firstName} ${u.lastName}` : "Loading…";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask(title.trim(), description.trim(), priority, status, assigneeId);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setStatus("NEW");
      setAssigneeId(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isViewer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="backlog-task-title">Title</Label>
              <Input
                id="backlog-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="mt-1.5"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="backlog-task-description">Description</Label>
              <Textarea
                id="backlog-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details…"
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backlog-task-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger className="mt-1.5">
                    <span className="flex flex-1 text-left">{{ LOW: "Low", MEDIUM: "Medium", HIGH: "High" }[priority]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="backlog-task-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TaskStatus)}
                >
                  <SelectTrigger className="mt-1.5">
                    <span className="flex flex-1 text-left">{{ NEW: "New", PLANNED: "Planned", DONE: "Done", REVOKED: "Revoked" }[status]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="backlog-task-assignee">Assignee</Label>
              <Select
                value={assigneeId ?? "unassigned"}
                onValueChange={(v) => setAssigneeId(v === "unassigned" ? null : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <span className="flex flex-1 text-left">{assigneeLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
