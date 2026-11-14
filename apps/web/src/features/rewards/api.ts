import type { ServiceMeta } from "@/api/extensions"
import type { RewardsCatalog, ServerRedemption } from "./types"

import { api, unwrap } from "@/api/client"
import { fetchMyRedemptions, fetchServiceMeta } from "@/api/extensions"

export type { ServiceMeta }
export { fetchMyRedemptions, fetchServiceMeta as fetchRewardsMeta }

export function fetchRewards(): Promise<RewardsCatalog> {
  return unwrap(api.GET("/v1/rewards"))
}

export function redeemReward(rewardId: string): Promise<ServerRedemption> {
  return unwrap(
    api.POST("/v1/rewards/{id}/redeem", {
      params: {
        path: { id: rewardId },
      },
    }),
  )
}
