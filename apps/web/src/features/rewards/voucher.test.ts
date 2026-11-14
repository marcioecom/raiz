import type { Redemption, RewardsCatalog } from "./voucher"

import { create as createQrCode } from "qrcode"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  applyOptimisticRedeem,
  formatCountdownMMSS,
  getRemainingSeconds,
  isVoucherExpired,
  isVoucherStale,
  missingSeedsForReward,
  VOUCHER_STALE_GRACE_MS,
} from "./voucher"
import { ACTIVE_VOUCHER_STORAGE_KEY, voucherStore } from "./voucher-store"

const TEN_MINUTES_MS = 10 * 60_000

describe("voucher pure helpers", () => {
  it("detecta expiração exata de 10 minutos em 00:00 e regressivo com teto em segundos", () => {
    const baseMs = Date.UTC(2026, 10, 14, 15, 0, 0)
    const expiresMs = baseMs + TEN_MINUTES_MS
    const expiresAt = new Date(expiresMs).toISOString()

    expect(getRemainingSeconds(expiresAt, baseMs)).toBe(600)
    expect(formatCountdownMMSS(getRemainingSeconds(expiresAt, baseMs))).toBe("10:00")
    expect(isVoucherExpired(expiresAt, baseMs)).toBe(false)

    expect(getRemainingSeconds(expiresAt, expiresMs - 1)).toBe(1)
    expect(formatCountdownMMSS(getRemainingSeconds(expiresAt, expiresMs - 1))).toBe("00:01")
    expect(isVoucherExpired(expiresAt, expiresMs - 1)).toBe(false)

    expect(getRemainingSeconds(expiresAt, expiresMs)).toBe(0)
    expect(formatCountdownMMSS(getRemainingSeconds(expiresAt, expiresMs))).toBe("00:00")
    expect(isVoucherExpired(expiresAt, expiresMs)).toBe(true)

    expect(getRemainingSeconds("invalid-date", baseMs)).toBe(0)
    expect(isVoucherExpired("", baseMs)).toBe(true)
    expect(formatCountdownMMSS(-12)).toBe("00:00")
    expect(formatCountdownMMSS(Number.NaN)).toBe("00:00")
  })

  it("descarta como stale apenas após 30 minutos da expiração", () => {
    const expiresMs = Date.UTC(2026, 10, 14, 15, 10, 0)
    const expiresAt = new Date(expiresMs).toISOString()

    expect(VOUCHER_STALE_GRACE_MS).toBe(30 * 60_000)
    expect(isVoucherStale(expiresAt, expiresMs + 10 * 60_000)).toBe(false)
    expect(isVoucherStale(expiresAt, expiresMs + VOUCHER_STALE_GRACE_MS)).toBe(false)
    expect(isVoucherStale(expiresAt, expiresMs + VOUCHER_STALE_GRACE_MS + 1)).toBe(true)
    expect(isVoucherStale("invalid", expiresMs)).toBe(true)
  })

  it("calcula sementes faltantes com segurança", () => {
    expect(missingSeedsForReward(400, 350)).toBe(50)
    expect(missingSeedsForReward(300, 300)).toBe(0)
    expect(missingSeedsForReward(300, 500)).toBe(0)
    expect(missingSeedsForReward(250.9, 100.2)).toBe(150)
    expect(missingSeedsForReward(-10, 100)).toBe(0)
  })

  it("aplica débito otimista apenas em balance e affordable, preservando snapshot para rollback e sem forjar código", () => {
    voucherStore.clear()
    const previousSnapshot: RewardsCatalog = {
      balance: 450,
      rewards: [
        { id: "r1", title: "Café na Casa do Pão", cost: 300, stock: 12, affordable: true },
        { id: "r2", title: "2h de estacionamento", cost: 400, stock: null, affordable: true },
        { id: "r3", title: "Brinde esgotado", cost: 100, stock: 0, affordable: false },
      ],
    }
    const frozenClone = structuredClone(previousSnapshot)

    const optimistic = applyOptimisticRedeem(previousSnapshot, previousSnapshot.rewards![0])

    expect(optimistic.balance).toBe(150)
    expect(optimistic.rewards).toEqual([
      { id: "r1", title: "Café na Casa do Pão", cost: 300, stock: 12, affordable: false },
      { id: "r2", title: "2h de estacionamento", cost: 400, stock: null, affordable: false },
      { id: "r3", title: "Brinde esgotado", cost: 100, stock: 0, affordable: false },
    ])
    expect("code" in optimistic).toBe(false)
    expect(voucherStore.getSnapshot()).toBeNull()
    expect(previousSnapshot).toEqual(frozenClone)

    const clamped = applyOptimisticRedeem(previousSnapshot, {
      id: "r4",
      title: "Experiência",
      cost: 900,
    })
    expect(clamped.balance).toBe(0)
  })
})

describe("voucherStore", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    voucherStore.clear()
  })

  it("persiste voucher real do servidor e exige prazo exato de 10min em getValid", () => {
    const baseMs = Date.UTC(2026, 10, 14, 15, 0, 0)
    const expiresMs = baseMs + TEN_MINUTES_MS
    const redemption: Redemption = {
      id: "red-1",
      code: "7F2K9A",
      expires_at: new Date(expiresMs).toISOString(),
      balance_after: 50,
      reward: {
        id: "reward-1",
        title: "Café na Casa do Pão",
        cost: 300,
        stock: 11,
        store_name: "Casa do Pão",
        affordable: false,
      },
    }

    voucherStore.set(redemption)

    expect(voucherStore.getValid(baseMs)).toEqual(redemption)
    expect(voucherStore.getValid(expiresMs - 1)).toEqual(redemption)
    expect(voucherStore.getValid(expiresMs)).toBeNull()
    expect(voucherStore.getForReward("reward-1", expiresMs)).toEqual(redemption)
    expect(voucherStore.getForReward("other-reward", baseMs)).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toContain("7F2K9A")
  })

  it("mantém voucher até 30min pós-expiração e descarta memória, storage e listeners após 30min", () => {
    const expiresMs = Date.UTC(2026, 10, 14, 15, 10, 0)
    const redemption: Redemption = {
      id: "red-2",
      code: "8K3M2P",
      expires_at: new Date(expiresMs).toISOString(),
      balance_after: 100,
      reward: { id: "reward-2", title: "2h de estacionamento", cost: 400 },
    }
    const listener = vi.fn()
    const unsubscribe = voucherStore.subscribe(listener)

    voucherStore.set(redemption)
    expect(listener).toHaveBeenCalledTimes(1)

    expect(voucherStore.get(expiresMs + VOUCHER_STALE_GRACE_MS)).toEqual(redemption)
    expect(voucherStore.reload(expiresMs + VOUCHER_STALE_GRACE_MS)).toEqual(redemption)

    expect(voucherStore.get(expiresMs + VOUCHER_STALE_GRACE_MS + 1)).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)

    voucherStore.set(redemption)
    expect(voucherStore.reload(expiresMs + VOUCHER_STALE_GRACE_MS + 1)).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toBeNull()
    unsubscribe()
  })

  it("ignora payloads inválidos em set() e JSON corrompido em sessionStorage", () => {
    voucherStore.set({ code: "", expires_at: new Date().toISOString(), reward: { id: "r1" } })
    voucherStore.set({ code: "123456", expires_at: "invalid", reward: { id: "r1" } })
    voucherStore.set({ code: "123456", expires_at: new Date().toISOString() })
    expect(voucherStore.getSnapshot()).toBeNull()

    window.sessionStorage.setItem(ACTIVE_VOUCHER_STORAGE_KEY, "{not-valid-json")
    expect(voucherStore.reload()).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toBeNull()
  })

  it("gera matriz QR válida para código real do voucher", () => {
    const qr = createQrCode("7F2K9A", { errorCorrectionLevel: "M" })
    expect(qr.modules.size).toBeGreaterThanOrEqual(21)
  })
})
