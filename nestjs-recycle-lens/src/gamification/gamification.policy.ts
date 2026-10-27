// All XP values and thresholds are server-owned. Changes apply to future events only.
export const XP_POLICY = Object.freeze({
  scan: 5,
  dailyScanLimit: 5,
  discovery: 20,
  dailyChallenge: 30,
  weeklyChallenge: 100,
  achievement: 0,
  articleOpen: 0,
});
export const LEVEL_THRESHOLDS = Object.freeze(
  Array.from({ length: 100 }, (_, i) => {
    const level = i + 1;
    if (level <= 5) return [0, 100, 250, 500, 900][i];
    const n = level - 5;
    return 900 + 400 * n + 75 * n * (n + 1);
  }),
);
export function levelProgress(totalXp: number) {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0)
    throw new Error('Invalid total XP');
  const index = LEVEL_THRESHOLDS.findIndex((threshold) => threshold > totalXp);
  const level = index < 0 ? LEVEL_THRESHOLDS.length : index;
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp = LEVEL_THRESHOLDS[level] ?? null;
  return {
    level,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    progressPercent:
      nextLevelXp === null
        ? 100
        : Math.min(
            100,
            ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
          ),
  };
}
export function plantState(level: number) {
  const stages = [
    'seed',
    'sprout',
    'young_plant',
    'growing_plant',
    'mature_plant',
  ];
  const titles = [
    'Hạt giống',
    'Mầm xanh',
    'Cây non',
    'Cây đang lớn',
    'Cây trưởng thành',
  ];
  const index = Math.min(Math.max(level - 1, 0), 4);
  return { stage: stages[index], title: titles[index], level };
}
