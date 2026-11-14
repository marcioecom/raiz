import type { components, paths } from "@/api/schema"

export type Reward = components["schemas"]["Reward"]
export type Redemption = components["schemas"]["Redemption"]
export type RewardsCatalog =
  paths["/v1/rewards"]["get"]["responses"]["200"]["content"]["application/json"]

export const VOUCHER_STALE_GRACE_MS = 30 * 60 * 1000

function parseTimestampMs(iso: string): number | null {
  if (!iso) {
    return null
  }
  const parsed = Date.parse(iso)
  return Number.isFinite(parsed) ? parsed : null
}

/** Calcula quantos segundos inteiros restam até `expiresAt` a partir de `nowMs`. */
export function getRemainingSeconds(expiresAt: string, nowMs = Date.now()): number {
  const expiresMs = parseTimestampMs(expiresAt)
  if (expiresMs === null) {
    return 0
  }
  const diffMs = expiresMs - nowMs
  if (diffMs <= 0) {
    return 0
  }
  return Math.ceil(diffMs / 1000)
}

/** Formata segundos restantes no relógio regressivo `MM:SS`. */
export function formatCountdownMMSS(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00"
  }
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

/** Informa se o voucher já ultrapassou a validade no balcão. */
export function isVoucherExpired(expiresAt: string, nowMs = Date.now()): boolean {
  const expiresMs = parseTimestampMs(expiresAt)
  if (expiresMs === null) {
    return true
  }
  return nowMs >= expiresMs
}

/** Informa se o voucher expirou há mais de 30 minutos e deve ser descartado do armazenamento. */
export function isVoucherStale(
  expiresAt: string,
  nowMs = Date.now(),
  graceMs = VOUCHER_STALE_GRACE_MS,
): boolean {
  const expiresMs = parseTimestampMs(expiresAt)
  if (expiresMs === null) {
    return true
  }
  return nowMs - expiresMs > graceMs
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
