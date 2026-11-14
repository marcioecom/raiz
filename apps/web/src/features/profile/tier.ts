import type { components } from "@/api/schema"
import type { VisitorTier } from "@/lib/format"

import { formatSeeds, formatTierLabel } from "@/lib/format"

export type Me = components["schemas"]["Me"]
export type LedgerEntry = components["schemas"]["LedgerEntry"]

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
    visitor: Me["visitor"] | null
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
}

const NEXT_TIER_MAP: Record<VisitorTier, VisitorTier | null> = {
  semente: "raiz",
  raiz: "dourado",
  dourado: null,
}

const TIER_STEP_MAP: Record<VisitorTier, number> = {
  semente: 1,
  raiz: 2,
  dourado: 3,
}

const TOTAL_TIER_STEPS = 3

/** Normaliza o identificador de nível recebido da API para um valor conhecido do contrato. */
export function normalizeTier(tier: Me["tier"]): VisitorTier {
  if (tier === "raiz" || tier === "dourado") {
    return tier
  }
  return "semente"
}

function toSafeCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.trunc(value))
}

function toSafeBalance(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.trunc(value)
}

/** Calcula o resumo de nível e meta do próximo estágio usando apenas campos de Me. */
export function describeTierSummary(me: Me): TierSummary {
  const tier = normalizeTier(me.tier)
  const tierLabel = formatTierLabel(tier)
  const nextTier = NEXT_TIER_MAP[tier]
  const nextTierLabel = nextTier ? formatTierLabel(nextTier) : null
  const isMaxTier = nextTier === null
  const nextTierAt =
    !isMaxTier && typeof me.next_tier_at === "number" && Number.isFinite(me.next_tier_at)
      ? Math.max(0, Math.trunc(me.next_tier_at))
      : null

  let progressLabel = `Nível máximo: ${tierLabel}`
  if (nextTierLabel && nextTierAt !== null) {
    const seedsUnit = nextTierAt === 1 ? "semente" : "sementes"
    progressLabel = `Faltam ${formatSeeds(nextTierAt)} ${seedsUnit} para ${nextTierLabel}`
  } else if (nextTierLabel) {
    progressLabel = `Próximo nível: ${nextTierLabel}`
  }

  return {
    tier,
    tierLabel,
    nextTier,
    nextTierLabel,
    nextTierAt,
    progressStep: TIER_STEP_MAP[tier],
    totalSteps: TOTAL_TIER_STEPS,
    progressLabel,
    isMaxTier,
  }
}

/** Monta a visão normalizada do perfil para exibição sem cálculos na UI. */
export function buildProfileOverview(me: Me): ProfileOverview {
  const visitorName = me.visitor?.name?.trim() || "Visitante"
  const phoneMasked = me.visitor?.phone_masked?.trim() || null

  return {
    visitorName,
    phoneMasked,
    balance: toSafeBalance(me.balance),
    streakWeeks: toSafeCount(me.streak_weeks),
    receiptsCount: toSafeCount(me.receipts_count),
    firstVisitAt: me.first_visit_at ?? null,
    tierSummary: describeTierSummary(me),
  }
}

/** Constrói o objeto JSON de portabilidade LGPD a partir de GET /v1/me e GET /v1/me/ledger. */
export function buildLgpdExportPayload(input: {
  me: Me
  entries: LedgerEntry[]
  truncated?: boolean
  exportedAt?: Date
}): LgpdExportPayload {
  const overview = buildProfileOverview(input.me)
  const exportedAt = input.exportedAt ?? new Date()

  return {
    exported_at: exportedAt.toISOString(),
    source: "raiz-web",
    notice:
      "Dados pessoais e extrato de sementes mantidos pelo Raiz (Capim Dourado Shopping). CPF presente em cupons fiscais não é armazenado.",
    profile: {
      visitor: input.me.visitor ?? null,
      balance: overview.balance,
      tier: overview.tierSummary.tier,
      tier_label: overview.tierSummary.tierLabel,
      next_tier_at: overview.tierSummary.nextTierAt,
      streak_weeks: overview.streakWeeks,
      receipts_count: overview.receiptsCount,
      first_visit_at: overview.firstVisitAt,
    },
    ledger: {
      total_entries: input.entries.length,
      truncated: Boolean(input.truncated),
      entries: input.entries,
    },
  }
}
