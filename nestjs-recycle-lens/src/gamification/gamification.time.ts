export const GAMIFICATION_TIMEZONE = 'Asia/Ho_Chi_Minh';
const OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
// Vietnam is UTC+7 without daylight saving; all boundaries are end-exclusive.
export function periodsAt(now: Date) {
  const shifted = new Date(now.getTime() + OFFSET);
  const midnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const monday = midnight - ((shifted.getUTCDay() + 6) % 7) * DAY;
  return {
    daily: {
      key: new Date(midnight).toISOString().slice(0, 10),
      start: new Date(midnight - OFFSET),
      end: new Date(midnight - OFFSET + DAY),
    },
    weekly: {
      key: new Date(monday).toISOString().slice(0, 10),
      start: new Date(monday - OFFSET),
      end: new Date(monday - OFFSET + 7 * DAY),
    },
  };
}
