import type {
  BaseRedemption,
  MyRedemptionsResult,
  RedemptionStatus,
  ServerRedemption,
} from "@/api/extensions"
import type { components, paths } from "@/api/schema"

export type Reward = components["schemas"]["Reward"]
export type RewardsCatalog =
  paths["/v1/rewards"]["get"]["responses"]["200"]["content"]["application/json"]

export type { BaseRedemption, MyRedemptionsResult, RedemptionStatus, ServerRedemption }

export interface CopyCodeFeedback {
  tone: "success" | "error"
  text: string
}
