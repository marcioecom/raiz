import { describe, expect, it } from "vitest"

import { ApiError } from "@/api/client"
import { messageFor, translateApiCode } from "@/api/messages"

const DEFAULT_FALLBACK = "Não foi possível concluir agora. Tente de novo em instantes."
const BANNED_TONE_PATTERN = /\p{Extended_Pictographic}|moedinha|\bzap\b|parabéns/iu

const REQUIRED_API_CODES = [
  "already_claimed",
  "daily_limit",
  "store_daily_limit",
  "expired_receipt",
  "invalid_check_digit",
  "invalid_otp",
  "otp_expired",
  "rate_limited",
  "insufficient_balance",
  "insufficient_points",
  "out_of_stock",
  "unauthorized",
  "network_error",
] as const

const EXTRA_CONTRACT_CODES = [
  "daily_limit_reached",
  "receipt_too_old",
  "invalid_access_key",
  "empty_access_key",
  "invalid_length",
  "invalid_chars",
  "invalid_uf",
  "invalid_month",
  "invalid_model",
  "invalid_emission_type",
  "invalid_code",
  "invalid_phone",
  "name_required",
  "invalid_name",
  "invalid_body",
  "reward_not_found",
  "too_many_requests",
  "not_found",
] as const

describe("translateApiCode", () => {
  it("traduz todos os códigos principais e de contrato em PT-BR adulto sem emoji, moedinha ou zap", () => {
    for (const code of [...REQUIRED_API_CODES, ...EXTRA_CONTRACT_CODES]) {
      const translated = translateApiCode(code)
      expect(translated.length).toBeGreaterThan(10)
      expect(translated).not.toBe(DEFAULT_FALLBACK)
      expect(translated).not.toContain(code)
      expect(translated).not.toMatch(BANNED_TONE_PATTERN)
    }

    expect(translateApiCode("already_claimed")).toBe("Este cupom já foi registrado.")
    expect(translateApiCode("daily_limit")).toContain("5 cupons")
    expect(translateApiCode("store_daily_limit")).toContain("desta loja")
    expect(translateApiCode("expired_receipt")).toContain("72 horas")
    expect(translateApiCode("invalid_check_digit")).toContain("dígito verificador")
    expect(translateApiCode("invalid_otp")).toContain("6 dígitos")
    expect(translateApiCode("otp_expired")).toContain("expirou")
    expect(translateApiCode("rate_limited")).toContain("tentativas")
    expect(translateApiCode("insufficient_balance")).toContain("sementes")
    expect(translateApiCode("insufficient_points")).toContain("sementes")
    expect(translateApiCode("out_of_stock")).toContain("acabou")
    expect(translateApiCode("unauthorized")).toContain("sessão expirou")
    expect(translateApiCode("network_error")).toContain("Sem conexão")
  })

  it("retorna fallback genérico sem expor código desconhecido", () => {
    const msg = translateApiCode("some_unexpected_code")
    expect(msg).toBe(DEFAULT_FALLBACK)
    expect(msg).not.toContain("some_unexpected_code")
  })
})

describe("messageFor", () => {
  it("não vaza error.message cru de ApiError ou objetos com code", () => {
    const apiErr = new ApiError("already_claimed", 409, { raw: "internal detail" })
    expect(messageFor(apiErr)).toBe("Este cupom já foi registrado.")

    const payloadLike = { code: "rate_limited", message: "HTTP 429 from proxy internal-1" }
    const translated = messageFor(payloadLike)
    expect(translated).toBe(translateApiCode("rate_limited"))
    expect(translated).not.toContain("internal-1")

    const unknownCodePayload = { code: "db_timeout", message: "pq: canceling statement" }
    expect(messageFor(unknownCodePayload)).toBe(DEFAULT_FALLBACK)
  })

  it("traduz TypeError de rede como network_error", () => {
    expect(messageFor(new TypeError("Failed to fetch"))).toBe(translateApiCode("network_error"))
  })

  it("nunca expõe Error.message cru, strings soltas ou objetos sem code", () => {
    const inputs: unknown[] = [
      new Error("SQLSTATE 42P01 relation missing"),
      { message: "secret backend stack trace" },
      { code: "", message: "empty code leak" },
      "raw backend failure string",
      null,
      undefined,
    ]
    for (const err of inputs) {
      const msg = messageFor(err)
      expect(msg).toBe(DEFAULT_FALLBACK)
      expect(msg).not.toContain("SQLSTATE")
      expect(msg).not.toContain("secret")
      expect(msg).not.toContain("empty code")
      expect(msg).not.toContain("raw backend")
    }
  })
})
