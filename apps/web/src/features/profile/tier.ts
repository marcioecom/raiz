import type { VisitorTier } from "@/lib/format"
import type {
  ExtendedMe,
  LedgerEntry,
  LgpdExportPayload,
  Me,
  ProfileOverview,
  ReceiptsExportResult,
  RedemptionsExportResult,
  TierSummary,
} from "./types"

import { formatSeeds, formatTierLabel } from "@/lib/format"
import { normalizeReferralCode } from "@/lib/referral"

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

/** Gera a URL de acesso/convite sem inventar código quando o backend ainda não retorna `referral_code`. */
export function buildClubInviteUrl(origin: string, referralCode?: string): string {
  const normalizedOrigin = origin.trim().replace(/\/+$/, "")
  const basePath =
    normalizedOrigin.length > 0 && normalizedOrigin !== "null"
      ? `${normalizedOrigin}/entrar`
      : "/entrar"
  const validCode = normalizeReferralCode(referralCode)
  return validCode ? `${basePath}?convite=${validCode}` : basePath
}

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
export function describeTierSummary(me: ExtendedMe): TierSummary {
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
export function buildProfileOverview(me: ExtendedMe): ProfileOverview {
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

/** Constrói o objeto JSON de portabilidade LGPD combinando perfil, extrato, cupons e resgates. */
export function buildLgpdExportPayload(input: {
  me: ExtendedMe
  entries: LedgerEntry[]
  truncated?: boolean
  receipts?: ReceiptsExportResult
  redemptions?: RedemptionsExportResult
  exportedAt?: Date
}): LgpdExportPayload {
  const overview = buildProfileOverview(input.me)
  const exportedAt = input.exportedAt ?? new Date()
  const referralCode =
    normalizeReferralCode(input.me.referral_code) ?? (input.me.referral_code?.trim() || undefined)
  const receipts = input.receipts ?? {
    supported: false,
    truncated: false,
    items: [],
  }
  const redemptions = input.redemptions ?? {
    supported: false,
    items: [],
  }

  return {
    exported_at: exportedAt.toISOString(),
    source: "raiz-web",
    notice:
      "Dados pessoais e extrato de sementes mantidos pelo Raiz (Capim Dourado Shopping). CPF presente em cupons fiscais não é armazenado.",
    profile: {
      visitor: input.me.visitor ?? null,
      ...(referralCode ? { referral_code: referralCode } : {}),
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
    receipts: {
      available: receipts.supported,
      total_receipts: receipts.items.length,
      truncated: receipts.truncated,
      items: receipts.items,
      ...(receipts.supported
        ? {}
        : { note: "Histórico detalhado de cupons ainda não disponível nesta versão da API." }),
    },
    redemptions: {
      available: redemptions.supported,
      total_redemptions: redemptions.items.length,
      items: redemptions.items,
      ...(redemptions.supported
        ? {}
        : { note: "Histórico de resgates ainda não disponível nesta versão da API." }),
    },
  }
}
