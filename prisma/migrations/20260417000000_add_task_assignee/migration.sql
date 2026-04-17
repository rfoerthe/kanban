-- AlterTable
ALTER TABLE "Task" ADD COLUMN "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");
