import type { Redemption, RewardsCatalog, ServerRedemption } from "./voucher"

import { create as createQrCode } from "qrcode"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/api/client"
import { clearToken, setToken } from "@/api/token"
import { DEFAULT_API_URL } from "@/env"

import { fetchMyRedemptions } from "./api"
import {
  applyOptimisticRedeem,
  formatCountdownMMSS,
  getRemainingSeconds,
  isVoucherExpired,
  isVoucherStale,
  mergeServerAndStoredRedemptions,
  missingSeedsForReward,
  resolveVoucherStatus,
  selectCatalogActiveVoucher,
  selectVoucherForReward,
  VOUCHER_STALE_GRACE_MS,
} from "./voucher"
import { ACTIVE_VOUCHER_STORAGE_KEY, clearVoucherSession, voucherStore } from "./voucher-store"

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

describe("voucher lifecycle and server sync helpers", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    clearToken()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("resolve status efetivo (pending, used, expired) respeitando baixa no balcão mesmo após validade e fallback nowMs", () => {
    const baseMs = Date.UTC(2026, 10, 14, 15, 0, 0)
    const expiresAt = new Date(baseMs + TEN_MINUTES_MS).toISOString()

    expect(resolveVoucherStatus({ expires_at: expiresAt }, baseMs)).toBe("pending")
    expect(resolveVoucherStatus({ status: "pending", expires_at: expiresAt }, baseMs)).toBe(
      "pending",
    )
    expect(
      resolveVoucherStatus({ status: "pending", used_at: "   ", expires_at: expiresAt }, baseMs),
    ).toBe("pending")
    expect(
      resolveVoucherStatus({ status: "pending", used_at: null, expires_at: expiresAt }, baseMs),
    ).toBe("pending")
    expect(
      resolveVoucherStatus({ status: "pending", expires_at: expiresAt }, baseMs + TEN_MINUTES_MS),
    ).toBe("expired")
    expect(resolveVoucherStatus({ status: "pending", expires_at: undefined }, baseMs)).toBe(
      "expired",
    )
    expect(resolveVoucherStatus({ status: "pending", expires_at: "invalid" }, baseMs)).toBe(
      "expired",
    )
    expect(resolveVoucherStatus({ status: "expired", expires_at: expiresAt }, baseMs)).toBe(
      "expired",
    )
    expect(resolveVoucherStatus({ status: "used", expires_at: expiresAt }, baseMs)).toBe("used")
    expect(
      resolveVoucherStatus(
        { status: "used", used_at: "2026-11-14T15:02:00Z", expires_at: expiresAt },
        baseMs + TEN_MINUTES_MS * 2,
      ),
    ).toBe("used")
    expect(
      resolveVoucherStatus(
        { used_at: "2026-11-14T15:02:00Z", expires_at: expiresAt },
        baseMs + TEN_MINUTES_MS * 2,
      ),
    ).toBe("used")

    vi.useFakeTimers()
    vi.setSystemTime(baseMs + 5_000)
    expect(resolveVoucherStatus({ status: "pending", expires_at: expiresAt })).toBe("pending")

    vi.setSystemTime(baseMs + TEN_MINUTES_MS)
    expect(resolveVoucherStatus({ status: "pending", expires_at: expiresAt })).toBe("expired")
  })

  it("mescla resgates do servidor com voucherStore priorizando servidor, preservando pós-POST e ordenação", () => {
    const expiresAt = "2026-11-14T15:10:00Z"
    const stored: ServerRedemption = {
      id: "red-1",
      code: "7F2K9A",
      status: "pending",
      expires_at: expiresAt,
      balance_after: 150,
      reward: {
        id: "rew-1",
        title: "Café na Casa do Pão",
        store_name: "Casa do Pão",
        terms: "Válido hoje",
      },
    }
    const serverUsed: ServerRedemption = {
      id: "red-1",
      code: "7F2K9A",
      status: "used",
      used_at: "2026-11-14T15:04:00Z",
      expires_at: expiresAt,
      reward: { id: "rew-1", title: "Café na Casa do Pão" },
    }

    const mergedUpdated = mergeServerAndStoredRedemptions([serverUsed], stored)
    expect(mergedUpdated).toHaveLength(1)
    expect(mergedUpdated[0]).toMatchObject({
      id: "red-1",
      status: "used",
      used_at: "2026-11-14T15:04:00Z",
      balance_after: 150,
    })
    expect(mergedUpdated[0]?.reward?.terms).toBe("Válido hoje")
    expect(mergedUpdated[0]?.reward?.store_name).toBe("Casa do Pão")

    const serverMatchedByCodeOnly: ServerRedemption = {
      code: "7F2K9A",
      status: "expired",
      expires_at: expiresAt,
      reward: { id: "rew-1", title: "Café na Casa do Pão" },
    }
    const mergedByCode = mergeServerAndStoredRedemptions([serverMatchedByCodeOnly], stored)
    expect(mergedByCode).toHaveLength(1)
    expect(mergedByCode[0]?.status).toBe("expired")
    expect(mergedByCode[0]?.balance_after).toBe(150)

    const olderServer: ServerRedemption = {
      id: "red-0",
      code: "3B9K2P",
      status: "expired",
      expires_at: "2026-11-14T12:10:00Z",
      reward: { id: "rew-2", title: "2h de estacionamento" },
    }
    const oldestServer: ServerRedemption = {
      id: "red-oldest",
      code: "9A1B2C",
      status: "used",
      used_at: "2026-11-14T10:15:00Z",
      expires_at: "2026-11-14T10:20:00Z",
      reward: { id: "rew-3", title: "Sorvete" },
    }
    const mergedImmediatePost = mergeServerAndStoredRedemptions([olderServer, oldestServer], stored)
    expect(mergedImmediatePost.map((item) => item.id)).toEqual(["red-1", "red-0", "red-oldest"])

    const mergedPreserveServerOrder = mergeServerAndStoredRedemptions(
      [olderServer, serverUsed, serverUsed, oldestServer],
      stored,
    )
    expect(mergedPreserveServerOrder.map((item) => item.id)).toEqual([
      "red-0",
      "red-1",
      "red-oldest",
    ])
    expect(mergedPreserveServerOrder[1]?.status).toBe("used")

    expect(mergeServerAndStoredRedemptions([], stored)).toEqual([stored])
    expect(mergeServerAndStoredRedemptions([], null)).toEqual([])
  })

  it("seleciona voucher ativo para catálogo (sem retornar expirado) e voucher mais relevante para rewardId", () => {
    const baseMs = Date.UTC(2026, 10, 14, 15, 0, 0)
    const usedVoucher: ServerRedemption = {
      id: "red-used",
      code: "111AAA",
      status: "used",
      used_at: "2026-11-14T14:55:00Z",
      created_at: "2026-11-14T14:50:00Z",
      expires_at: "2026-11-14T15:00:00Z",
      reward: { id: "rew-1", title: "Café" },
    }
    const olderUsedVoucher: ServerRedemption = {
      id: "red-used-old",
      code: "000ZZZ",
      status: "used",
      used_at: "2026-11-14T11:55:00Z",
      created_at: "2026-11-14T11:50:00Z",
      expires_at: "2026-11-14T12:00:00Z",
      reward: { id: "rew-1", title: "Café" },
    }
    const pendingVoucher: ServerRedemption = {
      id: "red-pending",
      code: "222BBB",
      status: "pending",
      expires_at: new Date(baseMs + TEN_MINUTES_MS).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    const expiredEvenIfPending: ServerRedemption = {
      id: "red-pending-stale",
      code: "444DDD",
      status: "pending",
      expires_at: new Date(baseMs).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    const expiredVoucher: ServerRedemption = {
      id: "red-exp",
      code: "333CCC",
      status: "expired",
      created_at: "2026-11-14T12:50:00Z",
      expires_at: "2026-11-14T13:00:00Z",
      reward: { id: "rew-2", title: "Estacionamento" },
    }
    const missingRewardVoucher: ServerRedemption = {
      id: "red-no-reward",
      code: "555EEE",
      status: "pending",
      expires_at: new Date(baseMs + TEN_MINUTES_MS).toISOString(),
    }

    expect(
      selectCatalogActiveVoucher(
        [usedVoucher, expiredVoucher, expiredEvenIfPending, missingRewardVoucher],
        baseMs,
      ),
    ).toBeNull()
    expect(
      selectCatalogActiveVoucher(
        [expiredEvenIfPending, usedVoucher, pendingVoucher, expiredVoucher],
        baseMs,
      )?.id,
    ).toBe("red-pending")

    expect(
      selectVoucherForReward([expiredEvenIfPending, usedVoucher, pendingVoucher], "rew-1", baseMs)
        ?.id,
    ).toBe("red-pending")
    expect(selectVoucherForReward([olderUsedVoucher, usedVoucher], "rew-1", baseMs)?.id).toBe(
      "red-used",
    )
    expect(selectVoucherForReward([expiredVoucher, usedVoucher], "rew-1", baseMs)?.id).toBe(
      "red-used",
    )
    expect(selectVoucherForReward([usedVoucher], "rew-999", baseMs)).toBeNull()

    vi.useFakeTimers()
    vi.setSystemTime(baseMs + TEN_MINUTES_MS)
    expect(selectCatalogActiveVoucher([pendingVoucher])).toBeNull()
    expect(selectVoucherForReward([pendingVoucher, usedVoucher], "rew-1")?.id).toBe("red-pending")
    expect(selectVoucherForReward([expiredEvenIfPending, usedVoucher], "rew-1")?.id).toBe(
      "red-pending-stale",
    )

    const newerUsedVoucher: ServerRedemption = {
      id: "red-used-newer",
      code: "777HHH",
      status: "used",
      used_at: new Date(baseMs + TEN_MINUTES_MS + 60_000).toISOString(),
      expires_at: new Date(baseMs + TEN_MINUTES_MS + 5 * 60_000).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    expect(selectVoucherForReward([pendingVoucher, newerUsedVoucher], "rew-1")?.id).toBe(
      "red-used-newer",
    )

    vi.setSystemTime(baseMs)
    const olderPending: ServerRedemption = {
      id: "red-pending-older",
      code: "888III",
      status: "pending",
      expires_at: new Date(baseMs + 5 * 60_000).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    expect(selectVoucherForReward([olderPending, pendingVoucher], "rew-1")?.id).toBe("red-pending")
  })

  it("fetchMyRedemptions degrada 404 (texto puro e JSON not_found) graciosamente, retorna 200 com Bearer e propaga falhas reais", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("404 page not found\n", { status: 404 })),
    )
    await expect(fetchMyRedemptions()).resolves.toEqual({ items: [], supported: false })

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: "not_found", message: "route not found" } }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          ),
      ),
    )
    await expect(fetchMyRedemptions()).resolves.toEqual({ items: [], supported: false })

    setToken("jwt-rewards")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(`${DEFAULT_API_URL}/v1/me/redemptions`)
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-rewards")
        return new Response(
          JSON.stringify({
            items: [{ id: "red-1", code: "7F2K9A", status: "pending" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }),
    )
    const okResult = await fetchMyRedemptions()
    expect(okResult.supported).toBe(true)
    expect(okResult.items).toHaveLength(1)
    expect(okResult.items[0]?.code).toBe("7F2K9A")

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    )
    await expect(fetchMyRedemptions()).resolves.toEqual({ items: [], supported: true })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("internal error", { status: 500 })),
    )
    await expect(fetchMyRedemptions()).rejects.toBeInstanceOf(ApiError)

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      }),
    )
    await expect(fetchMyRedemptions()).rejects.toMatchObject({ code: "network_error", status: 0 })
  })

  it("limpa apenas voucherStore ao receber HTTP 401 protegido e preserva fila offline de cupons", async () => {
    window.history.replaceState({}, "", "/entrar")
    window.localStorage.setItem("raiz.scan.queue.v1", JSON.stringify([{ id: "q-1" }]))
    setToken("jwt-expirado")
    voucherStore.set({
      id: "red-active",
      code: "6A7B8C",
      expires_at: new Date(Date.now() + TEN_MINUTES_MS).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    })
    expect(voucherStore.get()).not.toBeNull()

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "unauthorized", message: "expired" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    )

    await expect(fetchMyRedemptions()).rejects.toMatchObject({ code: "unauthorized", status: 401 })
    expect(voucherStore.get()).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem("raiz.scan.queue.v1")).toBe(JSON.stringify([{ id: "q-1" }]))
  })

  it("clearVoucherSession limpa apenas voucherStore e notifica inscritos", () => {
    window.localStorage.setItem("raiz.scan.queue.v1", JSON.stringify([{ id: "q-2" }]))
    const listener = vi.fn()
    const unsubscribe = voucherStore.subscribe(listener)

    voucherStore.set({
      id: "red-session",
      code: "9Z8Y7X",
      expires_at: new Date(Date.now() + TEN_MINUTES_MS).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    })
    expect(listener).toHaveBeenCalledTimes(1)

    clearVoucherSession()

    expect(voucherStore.get()).toBeNull()
    expect(window.sessionStorage.getItem(ACTIVE_VOUCHER_STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem("raiz.scan.queue.v1")).toBe(JSON.stringify([{ id: "q-2" }]))
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it("evita que used_at tardio de resgate antigo vença resgate mais recente sem created_at e trata empates/fallback", () => {
    const baseMs = Date.UTC(2026, 10, 14, 15, 0, 0)
    const olderUsedWithLateBaixa: ServerRedemption = {
      id: "red-old-used",
      code: "111AAA",
      status: "used",
      used_at: new Date(baseMs + 25 * 60_000).toISOString(),
      expires_at: new Date(baseMs + TEN_MINUTES_MS).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    const newerExpiredNoCreatedAt: ServerRedemption = {
      id: "red-newer-exp",
      code: "222BBB",
      status: "expired",
      expires_at: new Date(baseMs + 20 * 60_000).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }

    expect(
      selectVoucherForReward([olderUsedWithLateBaixa, newerExpiredNoCreatedAt], "rew-1", baseMs)
        ?.id,
    ).toBe("red-newer-exp")

    const usedWithoutExpiresWithLaterUsedAt: ServerRedemption = {
      id: "red-used-fallback",
      code: "333CCC",
      status: "used",
      used_at: new Date(baseMs + 30 * 60_000).toISOString(),
      reward: { id: "rew-1", title: "Café" },
    }
    expect(
      selectVoucherForReward(
        [newerExpiredNoCreatedAt, usedWithoutExpiresWithLaterUsedAt],
        "rew-1",
        baseMs,
      )?.id,
    ).toBe("red-used-fallback")

    const noTimestampFirst: ServerRedemption = {
      id: "red-no-ts-1",
      code: "444DDD",
      status: "expired",
      reward: { id: "rew-2", title: "Estacionamento" },
    }
    const noTimestampSecond: ServerRedemption = {
      id: "red-no-ts-2",
      code: "555EEE",
      status: "expired",
      reward: { id: "rew-2", title: "Estacionamento" },
    }
    expect(selectVoucherForReward([noTimestampFirst, noTimestampSecond], "rew-2", baseMs)?.id).toBe(
      "red-no-ts-1",
    )
    expect(
      selectVoucherForReward([noTimestampFirst, newerExpiredNoCreatedAt], "rew-1", baseMs)?.id,
    ).toBe("red-newer-exp")
  })
})
