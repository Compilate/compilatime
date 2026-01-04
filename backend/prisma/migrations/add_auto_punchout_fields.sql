-- Add auto-punchout configuration fields to Company table
-- Migration: 20251222194500_add_auto_punchout_fields

-- Add auto-punchout configuration fields to Company table
ALTER TABLE "companies" 
ADD COLUMN "autoPunchoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autoPunchoutMaxMinutes" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN "autoPunchoutMarginBefore" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "autoPunchoutMarginAfter" INTEGER NOT NULL DEFAULT 30;

-- Add index for better performance on auto-punchout enabled companies
CREATE INDEX "companies_auto_punchout_enabled_idx" ON "companies"("active", "autoPunchoutEnabled");

-- Add comment to document the new fields
COMMENT ON COLUMN "companies"."autoPunchoutEnabled" IS 'Enable automatic punchout for employees who forget to clock out';
COMMENT ON COLUMN "companies"."autoPunchoutMaxMinutes" IS 'Maximum minutes before automatic punchout is triggered (default: 8 hours = 480 minutes)';
COMMENT ON COLUMN "companies"."autoPunchoutMarginBefore" IS 'Minutes before shift end to trigger automatic punchout (default: 15 minutes)';
COMMENT ON COLUMN "companies"."autoPunchoutMarginAfter" IS 'Minutes after shift end to trigger automatic punchout (default: 30 minutes)';