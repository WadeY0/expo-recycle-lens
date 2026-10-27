import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import env from "@/config/env";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  getAchievements,
  getChallenges,
  getDiscoveries,
  getGamificationOverview,
  getXPHistory,
} from "../api/gamification-api";
export function gamificationKey(
  tenantId: string,
  userId: string | undefined,
  resource: string,
) {
  return ["gamification", tenantId, userId, resource] as const;
}
function useOwner() {
  return useAuthStore((state) => state.user?.id);
}
export function useEcoOverview() {
  const id = useOwner();
  return useQuery({
    queryKey: gamificationKey(env.API_TENANT_ID, id, "overview"),
    queryFn: getGamificationOverview,
    enabled: !!id,
  });
}
export function useAchievements() {
  const id = useOwner();
  return useQuery({
    queryKey: gamificationKey(env.API_TENANT_ID, id, "achievements"),
    queryFn: getAchievements,
    enabled: !!id,
  });
}
export function useChallenges() {
  const id = useOwner();
  return useQuery({
    queryKey: gamificationKey(env.API_TENANT_ID, id, "challenges"),
    queryFn: getChallenges,
    enabled: !!id,
  });
}
export function useXPHistory() {
  const id = useOwner();
  return useInfiniteQuery({
    queryKey: gamificationKey(env.API_TENANT_ID, id, "xp-history"),
    queryFn: ({ pageParam }) => getXPHistory(pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.page < page.totalPages ? page.page + 1 : undefined,
    enabled: !!id,
  });
}
export function useDiscoveries() {
  const id = useOwner();
  return useInfiniteQuery({
    queryKey: gamificationKey(env.API_TENANT_ID, id, "discoveries"),
    queryFn: ({ pageParam }) => getDiscoveries(pageParam),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.page < page.totalPages ? page.page + 1 : undefined,
    enabled: !!id,
  });
}
export function useEcoFocus(refetch: () => Promise<unknown>) {
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
}
export async function invalidateGamification(client: QueryClient) {
  await client.invalidateQueries({ queryKey: ["gamification"] });
}
