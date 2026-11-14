import { useQuery } from "@tanstack/react-query"

import { fetchLeaderboard, fetchMissions, fetchMissionsMeta } from "../api"

export const missionKeys = {
  all: () => ["missions"] as const,
  list: () => [...missionKeys.all(), "list"] as const,
  leaderboard: (limit: number) => [...missionKeys.all(), "leaderboard", limit] as const,
  meta: () => [...missionKeys.all(), "meta"] as const,
}

export function useMissions() {
  return useQuery({
    queryKey: missionKeys.list(),
    queryFn: fetchMissions,
  })
}

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: missionKeys.leaderboard(limit),
    queryFn: () => fetchLeaderboard(limit),
  })
}

export function useMissionsMeta() {
  return useQuery({
    queryKey: missionKeys.meta(),
    queryFn: fetchMissionsMeta,
    staleTime: 5 * 60_000,
  })
}
