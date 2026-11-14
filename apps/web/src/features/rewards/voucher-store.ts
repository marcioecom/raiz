import type { Redemption } from "./voucher"

import { onUnauthorized } from "@/api/client"

import { isVoucherExpired, isVoucherStale } from "./voucher"

export const ACTIVE_VOUCHER_STORAGE_KEY = "raiz.active_voucher"

type StoredRedemption = Redemption & {
  code: string
  expires_at: string
  reward: NonNullable<Redemption["reward"]> & { id: string }
}

let initialized = false
let memoryVoucher: StoredRedemption | null = null
const listeners = new Set<() => void>()

function isValidRedemption(value: unknown): value is StoredRedemption {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  if (typeof candidate.code !== "string" || candidate.code.trim().length === 0) {
    return false
  }
  if (
    typeof candidate.expires_at !== "string" ||
    !Number.isFinite(Date.parse(candidate.expires_at))
  ) {
    return false
  }
  if (typeof candidate.reward !== "object" || candidate.reward === null) {
    return false
  }
  const reward = candidate.reward as Record<string, unknown>
  return typeof reward.id === "string" && reward.id.length > 0
}

function removeFromStorage(): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.sessionStorage.removeItem(ACTIVE_VOUCHER_STORAGE_KEY)
  } catch {
    // Ignora falhas de acesso ao sessionStorage em navegadores restritivos.
  }
}

function writeToStorage(voucher: Redemption): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.sessionStorage.setItem(ACTIVE_VOUCHER_STORAGE_KEY, JSON.stringify(voucher))
  } catch {
    // Ignora falhas de cota/acesso; memória segue mantendo o voucher atual.
  }
}

function readFromStorage(nowMs = Date.now()): StoredRedemption | null {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidRedemption(parsed) || isVoucherStale(parsed.expires_at, nowMs)) {
      removeFromStorage()
      return null
    }
    return parsed
  } catch {
    removeFromStorage()
    return null
  }
}

function ensureInitialized(nowMs = Date.now()): void {
  if (!initialized) {
    memoryVoucher = readFromStorage(nowMs)
    initialized = true
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

export const voucherStore = {
  /** Retorna a referência atual em memória para uso com `useSyncExternalStore`. */
  getSnapshot(): Redemption | null {
    ensureInitialized()
    return memoryVoucher
  },

  /** Lê o voucher persistido, descartando automaticamente se expirou há mais de 30min. */
  get(nowMs = Date.now()): Redemption | null {
    ensureInitialized(nowMs)
    if (
      memoryVoucher &&
      (!isValidRedemption(memoryVoucher) || isVoucherStale(memoryVoucher.expires_at, nowMs))
    ) {
      this.clear()
      return null
    }
    return memoryVoucher
  },

  /** Retorna o voucher apenas se ainda estiver dentro do prazo de uso no balcão. */
  getValid(nowMs = Date.now()): Redemption | null {
    const voucher = this.get(nowMs)
    if (!voucher || !voucher.expires_at || isVoucherExpired(voucher.expires_at, nowMs)) {
      return null
    }
    return voucher
  },

  /** Busca o voucher real armazenado correspondente a um prêmio específico. */
  getForReward(rewardId: string, nowMs = Date.now()): Redemption | null {
    const voucher = this.get(nowMs)
    if (!voucher || voucher.reward?.id !== rewardId) {
      return null
    }
    return voucher
  },

  /** Persiste exclusivamente a resposta real recebida do servidor ao resgatar. */
  set(redemption: Redemption): void {
    if (!isValidRedemption(redemption)) {
      return
    }
    initialized = true
    memoryVoucher = redemption
    writeToStorage(redemption)
    notifyListeners()
  },

  /** Remove o voucher da memória e do sessionStorage (conclusão ou expiração prolongada). */
  clear(): void {
    const hadVoucher = memoryVoucher !== null
    initialized = true
    memoryVoucher = null
    removeFromStorage()
    if (hadVoucher) {
      notifyListeners()
    }
  },

  /** Força reidratação a partir do sessionStorage (útil em testes). */
  reload(nowMs = Date.now()): Redemption | null {
    initialized = false
    return this.get(nowMs)
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Limpa apenas o voucher em sessão (ex.: ao expirar token com HTTP 401 ou trocar de conta). */
export function clearVoucherSession(): void {
  voucherStore.clear()
}

onUnauthorized(clearVoucherSession)
