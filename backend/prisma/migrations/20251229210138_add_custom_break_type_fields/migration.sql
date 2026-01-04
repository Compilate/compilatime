-- AlterTable
ALTER TABLE "break_types" ADD COLUMN     "customName" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false;
