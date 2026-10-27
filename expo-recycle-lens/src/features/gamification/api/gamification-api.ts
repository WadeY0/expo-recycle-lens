import { httpClient } from "@/shared/api/http-client";
import type {
  Achievement,
  Challenge,
  Discovery,
  GamificationOverview,
  LevelProgress,
  Page,
  Plant,
  XPEntry,
} from "../types/gamification.types";
async function get<T>(
  path: string,
  params?: { page: number; perPage: number },
) {
  const { data } = await httpClient.get<T>(`/gamification/${path}`, {
    requiresAuth: true,
    params,
  });
  return data;
}
export const getGamificationOverview = () =>
  get<GamificationOverview>("overview");
export const getAchievements = () => get<Achievement[]>("achievements");
export const getChallenges = () => get<Challenge[]>("challenges");
export const getChallenge = (key: string) =>
  get<Challenge>(`challenges/${encodeURIComponent(key)}`);
export const getPlant = () => get<Plant & LevelProgress>("plant");
export const getXPHistory = (page = 1, perPage = 20) =>
  get<Page<XPEntry>>("xp-history", { page, perPage });
export const getDiscoveries = (page = 1, perPage = 20) =>
  get<Page<Discovery>>("discoveries", { page, perPage });
