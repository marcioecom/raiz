import type {
  MyRedemptionsResult,
  RedemptionStatus,
  Reward,
  RewardsCatalog,
  ServerRedemption,
} from "./types"

export type { MyRedemptionsResult, RedemptionStatus, Reward, RewardsCatalog, ServerRedemption }
export type Redemption = ServerRedemption

export const VOUCHER_STALE_GRACE_MS = 30 * 60 * 1000

function parseTimestampMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const parsed = Date.parse(iso)
  return Number.isFinite(parsed) ? parsed : null
}

/** Calcula quantos segundos inteiros restam até `expiresAt` a partir de `nowMs`. */
export function getRemainingSeconds(expiresAt: string, nowMs = Date.now()): number {
  const expiresMs = parseTimestampMs(expiresAt)
  if (expiresMs === null) return 0
  const diffMs = expiresMs - nowMs
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0
}

/** Formata segundos restantes no relógio regressivo `MM:SS`. */
export function formatCountdownMMSS(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00"
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

/** Informa se o voucher já ultrapassou a validade no balcão. */
export function isVoucherExpired(expiresAt: string, nowMs = Date.now()): boolean {
  const expiresMs = parseTimestampMs(expiresAt)
  return expiresMs === null || nowMs >= expiresMs
}

/** Informa se o voucher expirou há mais de 30 minutos e deve ser descartado do armazenamento. */
export function isVoucherStale(
  expiresAt: string,
  nowMs = Date.now(),
  graceMs = VOUCHER_STALE_GRACE_MS,
): boolean {
  const expiresMs = parseTimestampMs(expiresAt)
  return expiresMs === null || nowMs - expiresMs > graceMs
}

/** Resolve o estado efetivo do voucher considerando uso no balcão, status do servidor e validade local. */
export function resolveVoucherStatus(
  redemption: Pick<ServerRedemption, "status" | "used_at" | "expires_at">,
  nowMs = Date.now(),
): RedemptionStatus {
  const hasUsedAt = typeof redemption.used_at === "string" && redemption.used_at.trim().length > 0
  if (redemption.status === "used" || hasUsedAt) return "used"
  if (
    redemption.status === "expired" ||
    !redemption.expires_at ||
    isVoucherExpired(redemption.expires_at, nowMs)
  ) {
    return "expired"
  }
  return "pending"
}

function isSameRedemption(a: ServerRedemption, b: ServerRedemption): boolean {
  if (a.id && b.id) return a.id === b.id
  if (a.code && b.code) return a.code === b.code
  return false
}

function mergeRedemptionPair(
  serverItem: ServerRedemption,
  storedItem: ServerRedemption,
): ServerRedemption {
  const reward =
    serverItem.reward || storedItem.reward
      ? { ...storedItem.reward, ...serverItem.reward }
      : undefined
  return {
    ...storedItem,
    ...serverItem,
    reward,
    balance_after: serverItem.balance_after ?? storedItem.balance_after,
    used_at: serverItem.used_at ?? storedItem.used_at,
    status: serverItem.status ?? storedItem.status,
  }
}

/** Mescla resgates do servidor com o `voucherStore`, priorizando status do servidor sem perder pós-POST. */
export function mergeServerAndStoredRedemptions(
  serverItems: readonly ServerRedemption[],
  storedVoucher: ServerRedemption | null,
): ServerRedemption[] {
  const merged: ServerRedemption[] = []
  let matchedStored = false

  for (const item of serverItems) {
    if (merged.some((existing) => isSameRedemption(existing, item))) {
      continue
    }
    if (storedVoucher && isSameRedemption(item, storedVoucher)) {
      matchedStored = true
      merged.push(mergeRedemptionPair(item, storedVoucher))
    } else {
      merged.push(item)
    }
  }

  if (storedVoucher && !matchedStored) {
    return [storedVoucher, ...merged]
  }

  return merged
}

/** Seleciona o voucher ativo (`pending`) para exibir o banner na tela de catálogo. */
export function selectCatalogActiveVoucher(
  redemptions: readonly ServerRedemption[],
  nowMs = Date.now(),
): ServerRedemption | null {
  return (
    redemptions.find(
      (item) =>
        Boolean(item.code) &&
        Boolean(item.reward?.id) &&
        resolveVoucherStatus(item, nowMs) === "pending",
    ) ?? null
  )
}

function getRedemptionTimestampMs(item: ServerRedemption): number {
  return (
    parseTimestampMs(item.expires_at) ??
    parseTimestampMs(item.created_at) ??
    parseTimestampMs(item.used_at) ??
    Number.NEGATIVE_INFINITY
  )
}

function pickLatestRedemption(items: readonly ServerRedemption[]): ServerRedemption {
  return items.reduce((latest, candidate) =>
    getRedemptionTimestampMs(candidate) > getRedemptionTimestampMs(latest) ? candidate : latest,
  )
}

/** Seleciona o voucher mais relevante para um `rewardId` (prioriza o `pending` mais recente, depois os demais). */
export function selectVoucherForReward(
  redemptions: readonly ServerRedemption[],
  rewardId: string,
  nowMs = Date.now(),
): ServerRedemption | null {
  const matches = redemptions.filter((item) => item.reward?.id === rewardId && Boolean(item.code))
  if (matches.length === 0) return null

  const pending = matches.filter((item) => resolveVoucherStatus(item, nowMs) === "pending")
  return pending.length > 0 ? pickLatestRedemption(pending) : pickLatestRedemption(matches)
}

/** Calcula quantas sementes faltam para alcançar o custo do prêmio. */
export function missingSeedsForReward(cost: number, balance: number): number {
  const safeCost = Number.isFinite(cost) ? Math.max(0, Math.trunc(cost)) : 0
  const safeBalance = Number.isFinite(balance) ? Math.max(0, Math.trunc(balance)) : 0
  return Math.max(0, safeCost - safeBalance)
}

/** Aplica débito otimista apenas no saldo e na disponibilidade de saldo (`affordable`), sem inventar código ou estoque. */
export function applyOptimisticRedeem(catalog: RewardsCatalog, reward: Reward): RewardsCatalog {
  const currentBalance = Number.isFinite(catalog.balance)
    ? Math.max(0, Math.trunc(catalog.balance ?? 0))
    : 0
  const rewardCost = Number.isFinite(reward.cost) ? Math.max(0, Math.trunc(reward.cost ?? 0)) : 0
  const nextBalance = Math.max(0, currentBalance - rewardCost)

  const nextRewards = (catalog.rewards ?? []).map((item) => {
    const itemCost = Number.isFinite(item.cost) ? Math.max(0, Math.trunc(item.cost ?? 0)) : 0
    return {
      ...item,
      affordable: item.stock === 0 ? false : itemCost <= nextBalance,
    }
  })

  return {
    ...catalog,
    balance: nextBalance,
    rewards: nextRewards,
  }
}
