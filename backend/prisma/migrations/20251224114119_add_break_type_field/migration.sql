-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "autoPunchoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoPunchoutMarginAfter" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "autoPunchoutMarginBefore" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "autoPunchoutMaxMinutes" INTEGER NOT NULL DEFAULT 480;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "breakTypeId" TEXT;

-- CreateTable
CREATE TABLE "break_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#F59E0B',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiresReason" BOOLEAN NOT NULL DEFAULT false,
    "maxMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "break_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "break_types_companyId_name_key" ON "break_types"("companyId", "name");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_breakTypeId_fkey" FOREIGN KEY ("breakTypeId") REFERENCES "break_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_types" ADD CONSTRAINT "break_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
