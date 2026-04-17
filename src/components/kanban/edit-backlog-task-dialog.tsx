"use client";

import { useState, useEffect } from "react";
import { useBacklogStore } from "@/lib/backlog-store";
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
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { BacklogTask, Priority, TaskStatus, TaskAssignee } from "@/lib/types";
import { getAssignableUsers } from "@/lib/actions";

interface EditBacklogTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: BacklogTask;
}

export function EditBacklogTaskDialog({
  open,
  onOpenChange,
  task,
}: EditBacklogTaskDialogProps) {
  const { updateTask } = useBacklogStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority as Priority);
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId ?? null);
  const [users, setUsers] = useState<TaskAssignee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPlanned = task.status === "PLANNED";

  useEffect(() => {
    if (open) {
      getAssignableUsers().then(setUsers);
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority as Priority);
      setStatus(task.status as TaskStatus);
      setAssigneeId(task.assigneeId ?? null);
    }
  }, [open, task]);

  const assigneeLabel = (() => {
    if (!assigneeId) return "Unassigned";
    const u = users.find((u) => u.id === assigneeId);
    if (u) return `${u.firstName} ${u.lastName}`;
    if (task.assignee && task.assigneeId === assigneeId)
      return `${task.assignee.firstName} ${task.assignee.lastName}`;
    return "Loading…";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        ...(!isPlanned && { status }),
        assigneeId,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-backlog-title">Title</Label>
              <Input
                id="edit-backlog-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="edit-backlog-description">Description</Label>
              <Textarea
                id="edit-backlog-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details…"
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-backlog-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-backlog-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as TaskStatus)}
                  disabled={isPlanned}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="PLANNED" disabled>Planned</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="REVOKED">Revoked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-backlog-assignee">Assignee</Label>
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
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
