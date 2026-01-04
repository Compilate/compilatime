/*
  Warnings:

  - The `status` column on the `absence_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `attachments` column on the `absence_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `attachments` column on the `absences` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `company_holidays` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `absence_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `halfDay` on table `absences` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('PUBLIC', 'COMPANY', 'RELIGIOUS');

-- DropIndex
DROP INDEX "absence_comments_absenceId_idx";

-- DropIndex
DROP INDEX "absence_requests_companyId_employeeId_status_idx";

-- DropIndex
DROP INDEX "absence_requests_status_createdAt_idx";

-- AlterTable
ALTER TABLE "absence_requests" DROP COLUMN "type",
ADD COLUMN     "type" "AbsenceType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "attachments",
ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "absences" ALTER COLUMN "halfDay" SET NOT NULL,
ALTER COLUMN "startHalfDay" SET DATA TYPE TEXT,
ALTER COLUMN "endHalfDay" SET DATA TYPE TEXT,
DROP COLUMN "attachments",
ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "company_holidays" DROP COLUMN "type",
ADD COLUMN     "type" "HolidayType" NOT NULL DEFAULT 'PUBLIC';
