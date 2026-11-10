-- Keep customer-facing business identifiers short while retaining safe
-- allocation when concurrent requests share the same YYYYMMDDHHMMSS stamp.
CREATE TABLE IF NOT EXISTS "business_number_sequences" (
  "prefix" TEXT NOT NULL,
  "stamp" CHAR(14) NOT NULL,
  "sequence" INTEGER NOT NULL,
  CONSTRAINT "business_number_sequences_pkey" PRIMARY KEY ("prefix", "stamp")
);
