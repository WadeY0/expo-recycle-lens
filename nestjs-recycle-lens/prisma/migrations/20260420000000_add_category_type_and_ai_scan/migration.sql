-- Add ai_scan value to ArticleType enum
ALTER TYPE "ArticleType" ADD VALUE IF NOT EXISTS 'ai_scan';

-- Create CategoryType enum
DO $$ BEGIN
  CREATE TYPE "CategoryType" AS ENUM ('post', 'library');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add type column to categories table
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "type" "CategoryType" NOT NULL DEFAULT 'post';
