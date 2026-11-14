import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/api/client"
import { clearToken, setToken } from "@/api/token"
import { DEFAULT_API_URL } from "@/env"

import { fetchAllReceipts, fetchMyRedemptions } from "./api"
import {
  buildClubInviteUrl,
  buildLgpdExportPayload,
  buildProfileOverview,
  describeTierSummary,
  normalizeTier,
} from "./tier"

const BANNED_TONE_PATTERN = /\p{Extended_Pictographic}|moedinha|parabéns|você subiu de nível/iu

describe("profile tier helpers", () => {
  it("normaliza níveis válidos e aplica fallback seguro para semente", () => {
    expect(normalizeTier("semente")).toBe("semente")
    expect(normalizeTier("raiz")).toBe("raiz")
    expect(normalizeTier("dourado")).toBe("dourado")
    expect(normalizeTier(undefined)).toBe("semente")
  })

  it("descreve semente, raiz e dourado com linguagem adulta e sem termos proibidos", () => {
    const semente = describeTierSummary({ tier: "semente", next_tier_at: 260, balance: 240 })
    expect(semente).toEqual({
      tier: "semente",
      tierLabel: "Semente",
      nextTier: "raiz",
      nextTierLabel: "Raiz",
      nextTierAt: 260,
      progressStep: 1,
      totalSteps: 3,
      progressLabel: "Faltam 260 sementes para Raiz",
      isMaxTier: false,
    })

    const raiz = describeTierSummary({ tier: "raiz", next_tier_at: 1320, balance: 680 })
    expect(raiz).toEqual({
      tier: "raiz",
      tierLabel: "Raiz",
      nextTier: "dourado",
      nextTierLabel: "Dourado",
      nextTierAt: 1320,
      progressStep: 2,
      totalSteps: 3,
      progressLabel: "Faltam 1.320 sementes para Dourado",
      isMaxTier: false,
    })

    const faltaUma = describeTierSummary({ tier: "semente", next_tier_at: 1, balance: 499 })
    expect(faltaUma.progressLabel).toBe("Faltam 1 semente para Raiz")

    const dourado = describeTierSummary({ tier: "dourado", next_tier_at: null, balance: 2450 })
    expect(dourado).toEqual({
      tier: "dourado",
      tierLabel: "Dourado",
      nextTier: null,
      nextTierLabel: null,
      nextTierAt: null,
      progressStep: 3,
      totalSteps: 3,
      progressLabel: "Nível máximo: Dourado",
      isMaxTier: true,
    })

    for (const summary of [semente, raiz, faltaUma, dourado]) {
      expect(summary.tierLabel).not.toMatch(BANNED_TONE_PATTERN)
      expect(summary.progressLabel).not.toMatch(BANNED_TONE_PATTERN)
    }
  })

  it("trata next_tier_at === null em qualquer nível sem exibir valores inválidos", () => {
    const sementeSemMeta = describeTierSummary({ tier: "semente", next_tier_at: null })
    expect(sementeSemMeta.nextTierAt).toBeNull()
    expect(sementeSemMeta.progressLabel).toBe("Próximo nível: Raiz")
    expect(sementeSemMeta.isMaxTier).toBe(false)

    const raizSemMeta = describeTierSummary({ tier: "raiz", next_tier_at: null })
    expect(raizSemMeta.nextTierAt).toBeNull()
    expect(raizSemMeta.progressLabel).toBe("Próximo nível: Dourado")
    expect(raizSemMeta.isMaxTier).toBe(false)

    const douradoComMetaIgnorada = describeTierSummary({ tier: "dourado", next_tier_at: 9999 })
    expect(douradoComMetaIgnorada.nextTierAt).toBeNull()
    expect(douradoComMetaIgnorada.isMaxTier).toBe(true)
  })

  it("normaliza campos reais e aplica fallbacks seguros em buildProfileOverview", () => {
    const overview = buildProfileOverview({
      visitor: {
        id: "vis-1",
        name: "  Juliana Martins ",
        phone_masked: "(63) 9****-4821",
        created_at: "2026-09-01T14:00:00Z",
      },
      balance: 310,
      tier: "semente",
      next_tier_at: 500,
      streak_weeks: 3,
      receipts_count: 7,
      first_visit_at: "2026-09-01T14:20:00Z",
    })

    expect(overview.visitorName).toBe("Juliana Martins")
    expect(overview.phoneMasked).toBe("(63) 9****-4821")
    expect(overview.balance).toBe(310)
    expect(overview.streakWeeks).toBe(3)
    expect(overview.receiptsCount).toBe(7)
    expect(overview.firstVisitAt).toBe("2026-09-01T14:20:00Z")
    expect(overview.tierSummary.tier).toBe("semente")

    const minimal = buildProfileOverview({ visitor: { name: "   " } })
    expect(minimal.visitorName).toBe("Visitante")
    expect(minimal.phoneMasked).toBeNull()
    expect(minimal.balance).toBe(0)
    expect(minimal.streakWeeks).toBe(0)
    expect(minimal.receiptsCount).toBe(0)
    expect(minimal.firstVisitAt).toBeNull()
  })

  it("monta URL de convite real apenas quando há código válido sem inventar fallback", () => {
    expect(buildClubInviteUrl("https://raiz.app")).toBe("https://raiz.app/entrar")
    expect(buildClubInviteUrl("https://raiz.app/", undefined)).toBe("https://raiz.app/entrar")
    expect(buildClubInviteUrl("  https://raiz.app///  ", "ju4821")).toBe(
      "https://raiz.app/entrar?convite=JU4821",
    )
    expect(buildClubInviteUrl("https://raiz.app", "")).toBe("https://raiz.app/entrar")
    expect(buildClubInviteUrl("https://raiz.app", "abc")).toBe("https://raiz.app/entrar")
    expect(buildClubInviteUrl("https://raiz.app", "invalido!")).toBe("https://raiz.app/entrar")
    expect(buildClubInviteUrl("https://raiz.app/", "<script>alert(1)</script>")).toBe(
      "https://raiz.app/entrar",
    )
    expect(buildClubInviteUrl("https://raiz.app", " ju4821ab ")).toBe(
      "https://raiz.app/entrar?convite=JU4821AB",
    )
    expect(buildClubInviteUrl("null", "JU4821AB")).toBe("/entrar?convite=JU4821AB")
    expect(buildClubInviteUrl("", undefined)).toBe("/entrar")
  })

  it("gera objeto de exportação LGPD compatível em degradação 404 e completo quando disponível", () => {
    const degradedPayload = buildLgpdExportPayload({
      me: {
        visitor: {
          id: "vis-1",
          name: "Juliana Martins",
          phone_masked: "(63) 9****-4821",
          created_at: "2026-09-01T14:00:00Z",
        },
        balance: 2450,
        tier: "dourado",
        next_tier_at: null,
        streak_weeks: 6,
        receipts_count: 24,
        first_visit_at: "2026-09-01T14:20:00Z",
      },
      entries: [
        {
          id: "led-1",
          kind: "receipt",
          delta: 58,
          description: "Cupom fiscal validado",
          store_name: "Casa do Pão",
          created_at: "2026-11-10T18:30:00Z",
        },
      ],
      truncated: true,
      exportedAt: new Date("2026-11-14T12:00:00Z"),
    })

    expect(Object.keys(degradedPayload)).toEqual([
      "exported_at",
      "source",
      "notice",
      "profile",
      "ledger",
      "receipts",
      "redemptions",
    ])
    expect(Object.keys(degradedPayload.profile)).toEqual([
      "visitor",
      "balance",
      "tier",
      "tier_label",
      "next_tier_at",
      "streak_weeks",
      "receipts_count",
      "first_visit_at",
    ])
    expect(Object.keys(degradedPayload.ledger)).toEqual(["total_entries", "truncated", "entries"])
    expect(degradedPayload.profile.tier).toBe("dourado")
    expect(degradedPayload.profile.tier_label).toBe("Dourado")
    expect(degradedPayload.profile.next_tier_at).toBeNull()
    expect(degradedPayload.ledger.truncated).toBe(true)
    expect(degradedPayload.receipts.available).toBe(false)
    expect(degradedPayload.redemptions.available).toBe(false)
    expect(degradedPayload.notice).toContain("CPF")
    expect("tier_points_12m" in degradedPayload.profile).toBe(false)
    expect("referral_code" in degradedPayload.profile).toBe(false)

    const fullPayload = buildLgpdExportPayload({
      me: {
        visitor: { id: "vis-1", name: "Juliana Martins" },
        referral_code: "JU4821AB",
        balance: 300,
        tier: "semente",
      },
      entries: [],
      receipts: {
        supported: true,
        truncated: false,
        items: [
          {
            id: "rec-1",
            access_key: "17260112345678000199650010000001231123456787",
            store_name: "Casa do Pão",
            total_cents: 4800,
            points_awarded: 58,
            status: "accepted",
            issued_at: "2026-11-10T18:00:00Z",
            created_at: "2026-11-10T18:30:00Z",
          },
        ],
      },
      redemptions: {
        supported: true,
        items: [
          {
            id: "red-1",
            code: "7F2K9A",
            status: "used",
            used_at: "2026-11-11T12:00:00Z",
            expires_at: "2026-11-11T12:05:00Z",
            reward: { id: "rew-1", title: "Café na Casa do Pão", cost: 300 },
          },
        ],
      },
    })

    expect(fullPayload.profile.referral_code).toBe("JU4821AB")
    expect(fullPayload.receipts.available).toBe(true)
    expect(fullPayload.receipts.truncated).toBe(false)
    expect(fullPayload.receipts.note).toBeUndefined()
    expect(fullPayload.receipts.total_receipts).toBe(1)
    expect(fullPayload.receipts.items[0]?.id).toBe("rec-1")
    expect(fullPayload.redemptions.available).toBe(true)
    expect(fullPayload.redemptions.note).toBeUndefined()
    expect(fullPayload.redemptions.total_redemptions).toBe(1)
    expect(fullPayload.redemptions.items[0]?.status).toBe("used")

    const truncatedAndExplicitUnsupported = buildLgpdExportPayload({
      me: { visitor: { id: "vis-1", name: "Juliana" } },
      entries: [],
      receipts: {
        supported: true,
        truncated: true,
        items: [{ id: "rec-99" }],
      },
      redemptions: {
        supported: false,
        items: [],
      },
    })
    expect(truncatedAndExplicitUnsupported.receipts.available).toBe(true)
    expect(truncatedAndExplicitUnsupported.receipts.truncated).toBe(true)
    expect(truncatedAndExplicitUnsupported.receipts.total_receipts).toBe(1)
    expect(truncatedAndExplicitUnsupported.receipts.note).toBeUndefined()
    expect(truncatedAndExplicitUnsupported.redemptions.available).toBe(false)
    expect(truncatedAndExplicitUnsupported.redemptions.total_redemptions).toBe(0)
    expect(truncatedAndExplicitUnsupported.redemptions.note).toContain("resgates")
  })
})

describe("profile extension endpoints fallback", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    clearToken()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("degrada graciosamente 404 (texto puro e JSON not_found) de /v1/me/receipts e /v1/me/redemptions na exportação LGPD", async () => {
    const plainText404 = vi.fn(async () => new Response("404 page not found\n", { status: 404 }))
    vi.stubGlobal("fetch", plainText404)

    await expect(fetchAllReceipts()).resolves.toEqual({
      supported: false,
      truncated: false,
      items: [],
    })
    await expect(fetchMyRedemptions()).resolves.toEqual({
      supported: false,
      items: [],
    })

    const jsonNotFound404 = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: "not_found", message: "route not found" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", jsonNotFound404)

    await expect(fetchAllReceipts()).resolves.toEqual({
      supported: false,
      truncated: false,
      items: [],
    })
    await expect(fetchMyRedemptions()).resolves.toEqual({
      supported: false,
      items: [],
    })
  })

  it("pagina /v1/me/receipts em respostas 200, envia Bearer, evita loop de cursor e sinaliza truncamento", async () => {
    setToken("jwt-export")
    const fetchPaginatedMock = vi
      .fn()
      .mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(`${DEFAULT_API_URL}/v1/me/receipts?limit=50`)
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-export")
        return new Response(
          JSON.stringify({
            items: [{ id: "rec-1", points_awarded: 10 }],
            next_cursor: "cursor-2",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      })
      .mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(`${DEFAULT_API_URL}/v1/me/receipts?cursor=cursor-2&limit=50`)
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-export")
        return new Response(
          JSON.stringify({
            items: [{ id: "rec-2", points_awarded: 25 }],
            next_cursor: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      })
    vi.stubGlobal("fetch", fetchPaginatedMock)

    await expect(fetchAllReceipts()).resolves.toEqual({
      supported: true,
      truncated: false,
      items: [
        { id: "rec-1", points_awarded: 10 },
        { id: "rec-2", points_awarded: 25 },
      ],
    })
    expect(fetchPaginatedMock).toHaveBeenCalledTimes(2)

    const repeatedCursorMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "rec-a" }], next_cursor: "dup" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "rec-b" }], next_cursor: "dup" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
    vi.stubGlobal("fetch", repeatedCursorMock)
    await expect(fetchAllReceipts()).resolves.toEqual({
      supported: true,
      truncated: false,
      items: [{ id: "rec-a" }, { id: "rec-b" }],
    })

    let pageNumber = 0
    const truncatedMock = vi.fn(async () => {
      pageNumber += 1
      return new Response(
        JSON.stringify({
          items: [{ id: `rec-${pageNumber}` }],
          next_cursor: `cursor-${pageNumber}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", truncatedMock)
    const truncatedResult = await fetchAllReceipts()
    expect(truncatedResult.supported).toBe(true)
    expect(truncatedResult.truncated).toBe(true)
    expect(truncatedResult.items).toHaveLength(100)
  })

  it("fetchMyRedemptions retorna 200 e propaga erros reais em /v1/me/receipts e /v1/me/redemptions", async () => {
    const redemptions200 = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [{ id: "red-1", code: "7F2K9A", status: "used" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    )
    vi.stubGlobal("fetch", redemptions200)
    await expect(fetchMyRedemptions()).resolves.toEqual({
      supported: true,
      items: [{ id: "red-1", code: "7F2K9A", status: "used" }],
    })

    const emptyObject200 = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", emptyObject200)
    await expect(fetchMyRedemptions()).resolves.toEqual({
      supported: true,
      items: [],
    })

    const secondPage404 = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "rec-1" }], next_cursor: "c2" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response("404 page not found\n", { status: 404 }))
    vi.stubGlobal("fetch", secondPage404)
    await expect(fetchAllReceipts()).rejects.toMatchObject({ status: 404, code: "not_found" })

    const server500 = vi.fn(async () => new Response("internal error", { status: 500 }))
    vi.stubGlobal("fetch", server500)
    await expect(fetchAllReceipts()).rejects.toBeInstanceOf(ApiError)
    await expect(fetchMyRedemptions()).rejects.toBeInstanceOf(ApiError)
  })
})
