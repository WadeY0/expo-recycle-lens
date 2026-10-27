-- Additive only: all existing Articles, categories, likes and scans remain intact.
CREATE TABLE "waste_items" (
  "slug" TEXT NOT NULL PRIMARY KEY,
  "articleId" UUID NOT NULL UNIQUE,
  "nameEn" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL,
  "materials" TEXT[] NOT NULL,
  "searchText" TEXT NOT NULL,
  "guidance" JSONB NOT NULL,
  "version" TEXT NOT NULL,
  CONSTRAINT "waste_items_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "waste_items_materials_idx" ON "waste_items" USING GIN ("materials");
CREATE TABLE "scan_analyses" (
  "articleId" UUID NOT NULL PRIMARY KEY,
  "wasteSlug" TEXT,
  "result" JSONB NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scan_analyses_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "scan_analyses_wasteSlug_fkey" FOREIGN KEY ("wasteSlug") REFERENCES "waste_items"("slug") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "articles_createdById_type_createdAt_idx" ON "articles"("createdById", "type", "createdAt");
