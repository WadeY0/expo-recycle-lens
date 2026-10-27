-- AlterTable
ALTER TABLE "scan_analyses" ADD COLUMN     "requestKey" TEXT,
ADD COLUMN     "requestUserId" UUID;

-- CreateTable
CREATE TABLE "gamification_settings" (
    "key" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_gamification_profiles" (
    "userId" UUID NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "eligibleScans" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gamification_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "scanId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localDay" TEXT NOT NULL,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_discoveries" (
    "userId" UUID NOT NULL,
    "wasteSlug" TEXT NOT NULL,
    "firstScanId" UUID,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "waste_discoveries_pkey" PRIMARY KEY ("userId","wasteSlug")
);

-- CreateTable
CREATE TABLE "achievement_definitions" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "achievement_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "userId" UUID NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("userId","achievementKey")
);

-- CreateTable
CREATE TABLE "challenge_definitions" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "challenge_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_challenge_progress" (
    "userId" UUID NOT NULL,
    "challengeKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "user_challenge_progress_pkey" PRIMARY KEY ("userId","challengeKey","periodKey")
);

-- CreateIndex
CREATE INDEX "xp_transactions_userId_kind_localDay_idx" ON "xp_transactions"("userId", "kind", "localDay");

-- CreateIndex
CREATE INDEX "xp_transactions_userId_occurredAt_id_idx" ON "xp_transactions"("userId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_userId_eventKey_key" ON "xp_transactions"("userId", "eventKey");

-- CreateIndex
CREATE INDEX "waste_discoveries_userId_discoveredAt_idx" ON "waste_discoveries"("userId", "discoveredAt");

-- CreateIndex
CREATE INDEX "user_challenge_progress_userId_periodKey_idx" ON "user_challenge_progress"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "scan_analyses_requestUserId_requestKey_key" ON "scan_analyses"("requestUserId", "requestKey");

-- AddForeignKey
ALTER TABLE "user_gamification_profiles" ADD CONSTRAINT "user_gamification_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_discoveries" ADD CONSTRAINT "waste_discoveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_discoveries" ADD CONSTRAINT "waste_discoveries_wasteSlug_fkey" FOREIGN KEY ("wasteSlug") REFERENCES "waste_items"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementKey_fkey" FOREIGN KEY ("achievementKey") REFERENCES "achievement_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challengeKey_fkey" FOREIGN KEY ("challengeKey") REFERENCES "challenge_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Additive checks: protect the ledger/counters even from accidental internal writes.
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_amount_nonnegative" CHECK ("amount" >= 0);
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_kind_known" CHECK ("kind" IN ('scan','discovery','daily_challenge','weekly_challenge'));
ALTER TABLE "user_gamification_profiles" ADD CONSTRAINT "gamification_nonnegative" CHECK ("totalXp" >= 0 AND "eligibleScans" >= 0);
ALTER TABLE "achievement_definitions" ADD CONSTRAINT "achievement_target_positive" CHECK ("target" > 0);
ALTER TABLE "challenge_definitions" ADD CONSTRAINT "challenge_valid" CHECK ("target" > 0 AND "rewardXp" >= 0 AND "period" IN ('daily','weekly'));
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "challenge_progress_nonnegative" CHECK ("progress" >= 0);
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "challenge_reward_requires_completion" CHECK ("rewardedAt" IS NULL OR "completedAt" IS NOT NULL);

INSERT INTO "gamification_settings" ("key") VALUES ('phase3');
INSERT INTO "achievement_definitions" ("key","title","description","metric","target","sortOrder") VALUES
 ('first_scan','Lần quét đầu tiên','Hoàn tất một lần quét đủ điều kiện sau Phase 3.','eligible_scans',1,1),
 ('first_discovery','Khám phá đầu tiên','Khám phá một loại rác mới được thưởng XP.','rewarded_discoveries',1,2),
 ('discover_5','Nhà khám phá xanh','Đã khám phá 5 loại rác chuẩn.','discoveries',5,3),
 ('discover_10','Am hiểu vật liệu','Đã khám phá 10 loại rác chuẩn.','discoveries',10,4),
 ('discover_18','Bộ sưu tập MVP','Đã khám phá toàn bộ 18 loại rác MVP.','discoveries',18,5),
 ('first_daily','Thói quen xanh','Hoàn tất thử thách hằng ngày đầu tiên.','daily_completions',1,6),
 ('first_weekly','Tuần xanh','Hoàn tất thử thách hằng tuần đầu tiên.','weekly_completions',1,7),
 ('level_5','Cây trưởng thành','Đạt cấp độ 5.','user_level',5,8);
INSERT INTO "challenge_definitions" ("key","title","period","metric","target","rewardXp","sortOrder") VALUES
 ('daily_scan_3','Quét 3 lần đủ điều kiện','daily','eligible_scans',3,30,1),
 ('daily_scan_5','Quét 5 lần đủ điều kiện','daily','eligible_scans',5,30,2),
 ('weekly_days_3','Quét vào 3 ngày khác nhau','weekly','distinct_scan_days',3,100,3),
 ('weekly_daily_5','Hoàn tất 5 thử thách hằng ngày','weekly','daily_completions',5,100,4);

-- Preserve valid historical discoveries WITHOUT awarding any historical XP.
-- Match schemaVersion/status/reasons/FK exactly; JSON malformed/uncertain cannot qualify.
INSERT INTO "waste_discoveries" ("userId","wasteSlug","firstScanId","discoveredAt","historical")
SELECT DISTINCT ON (a."createdById", s."wasteSlug")
 a."createdById", s."wasteSlug", s."articleId", s."createdAt", TRUE
FROM "scan_analyses" s
JOIN "articles" a ON a."id" = s."articleId"
JOIN "waste_items" w ON w."slug" = s."wasteSlug"
JOIN "articles" wa ON wa."id" = w."articleId"
LEFT JOIN "categories" c ON c."id" = wa."categoryId"
WHERE a."createdById" IS NOT NULL AND a."type" = 'ai_scan' AND a."deletedAt" IS NULL
 AND wa."type" = 'library' AND wa."status" = 'active' AND wa."deletedAt" IS NULL
 AND (c."id" IS NULL OR (c."status" = 'active' AND c."deletedAt" IS NULL))
 AND s."result"->'schemaVersion' = '1'::jsonb
 AND s."result"->>'status' IN ('matched','hazardous')
 AND s."result"->'reasons' = '[]'::jsonb
 AND s."result"->'matchedWaste'->>'slug' = s."wasteSlug"
ORDER BY a."createdById", s."wasteSlug", s."createdAt", s."articleId"
ON CONFLICT ("userId","wasteSlug") DO NOTHING;
