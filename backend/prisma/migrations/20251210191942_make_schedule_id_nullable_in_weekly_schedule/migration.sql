/*
  Warnings:

  - A unique constraint covering the columns `[companyId,employeeId,weekStart,dayOfWeek]` on the table `weekly_schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "weekly_schedules_companyId_employeeId_weekStart_dayOfWeek_s_key";

-- AlterTable
ALTER TABLE "weekly_schedules" ALTER COLUMN "scheduleId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "weekly_schedules_companyId_employeeId_weekStart_dayOfWeek_key" ON "weekly_schedules"("companyId", "employeeId", "weekStart", "dayOfWeek");
