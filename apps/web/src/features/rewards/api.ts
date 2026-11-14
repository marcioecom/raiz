import type { paths } from "@/api/schema"
import type { Redemption, RewardsCatalog } from "./voucher"

import { api, unwrap } from "@/api/client"

export type ServiceMeta =
  paths["/v1/meta"]["get"]["responses"]["200"]["content"]["application/json"]

export function fetchRewards(): Promise<RewardsCatalog> {
  return unwrap(api.GET("/v1/rewards"))
}

export function fetchRewardsMeta(): Promise<ServiceMeta> {
  return unwrap(api.GET("/v1/meta"))
}

export function redeemReward(rewardId: string): Promise<Redemption> {
  return unwrap(
    api.POST("/v1/rewards/{id}/redeem", {
      params: {
        path: { id: rewardId },
      },
    }),
  )
}
