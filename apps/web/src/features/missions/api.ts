import type { ServiceMeta } from "@/api/extensions"
import type { components, paths } from "@/api/schema"

import { api, unwrap } from "@/api/client"
import { fetchServiceMeta } from "@/api/extensions"

export type Season = components["schemas"]["Season"]
export type MissionProgress = components["schemas"]["MissionProgress"]
export type { ServiceMeta }
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

export { fetchServiceMeta as fetchMissionsMeta }
