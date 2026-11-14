import type { ServerRedemption } from "@/api/extensions"
import type { components } from "@/api/schema"
import type { VisitorTier } from "@/lib/format"

export type Me = components["schemas"]["Me"]
export type LedgerEntry = components["schemas"]["LedgerEntry"]
export type {
  MyRedemptionsResult as RedemptionsExportResult,
  RedemptionStatus,
} from "@/api/extensions"
export type RedemptionRecord = ServerRedemption

export type ExtendedMe = Me & {
  referral_code?: string
}

export interface VisitorReceipt {
  id?: string
  access_key?: string
  store_name?: string | null
  total_cents?: number | null
  points_awarded?: number
  status?: "accepted" | "review"
  issued_at?: string
  created_at?: string
}

export interface VisitorReceiptsPage {
  items?: VisitorReceipt[]
  next_cursor?: string | null
}

export interface ReceiptsExportResult {
  supported: boolean
  truncated: boolean
  items: VisitorReceipt[]
}

export interface TierSummary {
  tier: VisitorTier
  tierLabel: string
  nextTier: VisitorTier | null
  nextTierLabel: string | null
  nextTierAt: number | null
  progressStep: number
  totalSteps: number
  progressLabel: string
  isMaxTier: boolean
}

export interface ProfileOverview {
  visitorName: string
  phoneMasked: string | null
  balance: number
  streakWeeks: number
  receiptsCount: number
  firstVisitAt: string | null
  tierSummary: TierSummary
}

export interface LgpdExportPayload {
  exported_at: string
  source: "raiz-web"
  notice: string
  profile: {
    visitor: ExtendedMe["visitor"] | null
    referral_code?: string
    balance: number
    tier: VisitorTier
    tier_label: string
    next_tier_at: number | null
    streak_weeks: number
    receipts_count: number
    first_visit_at: string | null
  }
  ledger: {
    total_entries: number
    truncated: boolean
    entries: LedgerEntry[]
  }
  receipts: {
    available: boolean
    total_receipts: number
    truncated: boolean
    items: VisitorReceipt[]
    note?: string
  }
  redemptions: {
    available: boolean
    total_redemptions: number
    items: RedemptionRecord[]
    note?: string
  }
}
