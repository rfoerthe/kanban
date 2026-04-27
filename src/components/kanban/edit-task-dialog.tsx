"use client";

import { useState, useEffect } from "react";
import { useBoardStore } from "@/lib/store";
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
import type { TaskWithRelations, Priority, TaskAssignee } from "@/lib/types";
import { getAssignableUsers } from "@/lib/actions";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithRelations;
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
}: EditTaskDialogProps) {
  const { updateTask } = useBoardStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(
    task.priority as Priority
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assigneeId ?? null);
  const [users, setUsers] = useState<TaskAssignee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assigneeLabel = (() => {
    if (!assigneeId) return "Unassigned";
    const user = users.find((u) => u.id === assigneeId);
    if (user) return `${user.firstName} ${user.lastName}`;
    if (task.assignee && task.assigneeId === assigneeId)
      return `${task.assignee.firstName} ${task.assignee.lastName}`;
    return "Loading…";
  })();

  useEffect(() => {
    if (open) {
      getAssignableUsers().then(setUsers);
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority as Priority);
      setAssigneeId(task.assigneeId ?? null);
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
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
              <Label htmlFor="edit-task-title">Title</Label>
              <Input
                id="edit-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details…"
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-task-priority">Priority</Label>
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
              <Label htmlFor="edit-task-assignee">Assignee</Label>
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
