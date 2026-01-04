-- Enhance Absence model with additional fields
ALTER TABLE "absences" 
ADD COLUMN "halfDay" BOOLEAN DEFAULT FALSE,
ADD COLUMN "startHalfDay" VARCHAR(10), -- 'morning' or 'afternoon'
ADD COLUMN "endHalfDay" VARCHAR(10),   -- 'morning' or 'afternoon'
ADD COLUMN "attachments" JSON[],        -- Array of file URLs
ADD COLUMN "requestedById" TEXT,       -- Who requested the absence
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "emergencyContact" TEXT,
ADD COLUMN "backupEmployeeId" TEXT,
ADD COLUMN "calendarEventId" TEXT;     -- Integration with calendar

-- Create VacationPolicy table
CREATE TABLE "vacation_policies" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "yearlyDays" INTEGER NOT NULL DEFAULT 22,
    "probationDays" INTEGER NOT NULL DEFAULT 0,
    "maxCarryOverDays" INTEGER NOT NULL DEFAULT 5,
    "minNoticeDays" INTEGER NOT NULL DEFAULT 7,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowHalfDays" BOOLEAN NOT NULL DEFAULT true,
    "restrictByDepartment" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_policies_pkey" PRIMARY KEY ("id")
);

-- Create VacationBalance table
CREATE TABLE "vacation_balances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carriedOverDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_balances_pkey" PRIMARY KEY ("id")
);

-- Create AbsenceRequest table for workflow
CREATE TABLE "absence_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "absenceId" TEXT,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "attachments" JSON[],
    "emergencyContact" TEXT,
    "backupEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_requests_pkey" PRIMARY KEY ("id")
);

-- Create AbsenceComment table for communication
CREATE TABLE "absence_comments" (
    "id" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL, -- 'employee' or 'manager'
    "comment" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false, -- Visible only to managers
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_comments_pkey" PRIMARY KEY ("id")
);

-- Create CompanyHoliday table
CREATE TABLE "company_holidays" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC', -- 'PUBLIC', 'COMPANY', 'RELIGIOUS'
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_holidays_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "vacation_policies_companyId_name_key" ON "vacation_policies"("companyId", "name");

CREATE UNIQUE INDEX "vacation_balances_companyId_employeeId_year_key" ON "vacation_balances"("companyId", "employeeId", "year");

CREATE INDEX "absence_requests_companyId_employeeId_status_idx" ON "absence_requests"("companyId", "employeeId", "status");

CREATE INDEX "absence_requests_status_createdAt_idx" ON "absence_requests"("status", "createdAt");

CREATE INDEX "absence_comments_absenceId_idx" ON "absence_comments"("absenceId");

CREATE UNIQUE INDEX "company_holidays_companyId_date_key" ON "company_holidays"("companyId", "date");

-- Add foreign key constraints
ALTER TABLE "vacation_policies" ADD CONSTRAINT "vacation_policies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vacation_balances" ADD CONSTRAINT "vacation_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vacation_balances" ADD CONSTRAINT "vacation_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vacation_balances" ADD CONSTRAINT "vacation_balances_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "vacation_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "absence_requests" ADD CONSTRAINT "absence_requests_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "absences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "absence_comments" ADD CONSTRAINT "absence_comments_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "absences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_holidays" ADD CONSTRAINT "company_holidays_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;