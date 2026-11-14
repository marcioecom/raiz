import { describe, expect, it } from "vitest"

import {
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

  it("gera objeto de exportação LGPD exato sem campos inventados (tier_points_12m, referral_code)", () => {
    const payload = buildLgpdExportPayload({
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

    expect(Object.keys(payload)).toEqual(["exported_at", "source", "notice", "profile", "ledger"])
    expect(Object.keys(payload.profile)).toEqual([
      "visitor",
      "balance",
      "tier",
      "tier_label",
      "next_tier_at",
      "streak_weeks",
      "receipts_count",
      "first_visit_at",
    ])
    expect(Object.keys(payload.ledger)).toEqual(["total_entries", "truncated", "entries"])
    expect(payload.profile.tier).toBe("dourado")
    expect(payload.profile.tier_label).toBe("Dourado")
    expect(payload.profile.next_tier_at).toBeNull()
    expect(payload.ledger.truncated).toBe(true)
    expect(payload.notice).toContain("CPF")
    expect("tier_points_12m" in payload.profile).toBe(false)
    expect("referral_code" in payload.profile).toBe(false)
  })
})
