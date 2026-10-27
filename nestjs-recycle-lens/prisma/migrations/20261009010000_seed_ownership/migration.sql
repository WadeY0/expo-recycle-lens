-- Additive only. Existing users/content/progress and applied migrations remain intact.
CREATE TABLE "seed_records" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "recordId" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seed_records_entity_known" CHECK ("entity" IN ('user', 'category', 'article'))
);
CREATE UNIQUE INDEX "seed_records_entity_recordId_key" ON "seed_records"("entity", "recordId");
