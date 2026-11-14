import { describe, expect, it } from "vitest"

import {
  formatCentsBRL,
  formatDateTimeBR,
  formatDelta,
  formatSeeds,
  formatShortDateBR,
  formatTierLabel,
} from "@/lib/format"

describe("format helpers", () => {
  it("formata sementes e deltas em pt-BR", () => {
    expect(formatSeeds(1240)).toBe("1.240")
    expect(formatDelta(58)).toBe("+58")
    expect(formatDelta(-1200)).toBe("-1.200")
    expect(formatDelta(0)).toBe("0")
  })

  it("formata centavos inteiros para BRL sem usar float na origem", () => {
    expect(formatCentsBRL(4800).replace(/\u00a0/g, " ")).toBe("R$ 48,00")
    expect(formatCentsBRL(0).replace(/\u00a0/g, " ")).toBe("R$ 0,00")
  })

  it("trata datas inválidas com fallback seguro", () => {
    expect(formatShortDateBR("invalid")).toBe("--")
    expect(formatDateTimeBR("invalid")).toBe("--")
    expect(formatShortDateBR("2026-11-13T15:00:00Z")).toMatch(/13\/11\/2026|12\/11\/2026/)
  })

  it("mapeia níveis do contrato para rótulos em português", () => {
    expect(formatTierLabel("semente")).toBe("Semente")
    expect(formatTierLabel("raiz")).toBe("Raiz")
    expect(formatTierLabel("dourado")).toBe("Dourado")
  })
})
