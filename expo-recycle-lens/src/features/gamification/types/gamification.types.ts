export interface LevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
}
export type PlantStage =
  | "seed"
  | "sprout"
  | "young_plant"
  | "growing_plant"
  | "mature_plant";
export interface Plant {
  stage: PlantStage;
  title: string;
  level: number;
}
export interface Achievement {
  key: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  rewardXp: number;
}
export interface Challenge {
  key: string;
  title: string;
  period: "daily" | "weekly";
  periodKey: string;
  startsAt: string;
  endsAt: string;
  target: number;
  progress: number;
  rewardXp: number;
  completedAt: string | null;
  rewardedAt: string | null;
}
export interface GamificationOverview extends LevelProgress {
  timezone: string;
  serverTime: string;
  plant: Plant;
  uniqueDiscoveries: number;
  eligibleScans: number;
  activeChallenges: Challenge[];
  recentAchievements: Achievement[];
  policy: {
    scan: number;
    dailyScanLimit: number;
    discovery: number;
    dailyChallenge: number;
    weeklyChallenge: number;
    achievement: number;
    articleOpen: number;
  };
}
export interface XPEntry {
  id: string;
  kind: "scan" | "discovery" | "daily_challenge" | "weekly_challenge";
  amount: number;
  reason: string;
  scanId: string | null;
  occurredAt: string;
  localDay: string;
}
export interface Discovery {
  wasteSlug: string;
  name: string;
  articleId: string | null;
  discoveredAt: string;
  historical: boolean;
}
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
