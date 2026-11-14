import type { components, paths } from "@/api/schema"

import { api, unwrap } from "@/api/client"

export type Season = components["schemas"]["Season"]
export type MissionProgress = components["schemas"]["MissionProgress"]
export type ServiceMeta =
  paths["/v1/meta"]["get"]["responses"]["200"]["content"]["application/json"]
export type MissionsResponse =
  paths["/v1/missions"]["get"]["responses"]["200"]["content"]["application/json"]
export type LeaderboardResponse =
  paths["/v1/leaderboard"]["get"]["responses"]["200"]["content"]["application/json"]

export function fetchMissions(): Promise<MissionsResponse> {
  return unwrap(api.GET("/v1/missions"))
}

export function fetchLeaderboard(limit = 10): Promise<LeaderboardResponse> {
  return unwrap(
    api.GET("/v1/leaderboard", {
      params: {
        query: { limit },
      },
    }),
  )
}

export function fetchMissionsMeta(): Promise<ServiceMeta> {
  return unwrap(api.GET("/v1/meta"))
}
