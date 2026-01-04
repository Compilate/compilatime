/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `schedules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,name]` on the table `schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "schedules_companyId_name_dayOfWeek_key";

-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "dayOfWeek";

-- CreateTable
CREATE TABLE "schedule_days" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_scheduleId_dayOfWeek_key" ON "schedule_days"("scheduleId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_companyId_name_key" ON "schedules"("companyId", "name");

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
