-- AlterTable
ALTER TABLE "task_lists" ADD COLUMN     "taskOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "tasks_taskListId_completed_idx" ON "tasks"("taskListId", "completed");

-- CreateIndex
CREATE INDEX "tasks_taskListId_completed_date_idx" ON "tasks"("taskListId", "completed", "date");

-- CreateIndex
CREATE INDEX "tasks_taskListId_createdAt_idx" ON "tasks"("taskListId", "createdAt");

-- CreateIndex
CREATE INDEX "tasks_completed_idx" ON "tasks"("completed");

-- CreateIndex
CREATE INDEX "tasks_date_idx" ON "tasks"("date");

-- CreateIndex
CREATE INDEX "tasks_taskListId_completed_date_createdAt_idx" ON "tasks"("taskListId", "completed", "date", "createdAt");
