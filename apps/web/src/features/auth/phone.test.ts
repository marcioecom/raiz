import { describe, expect, it } from "vitest"

import {
  authSearchSchema,
  formatPhoneInput,
  formatPhoneOnEdit,
  normalizePhone,
  normalizeReferralCode,
  otpCodeSchema,
  otpFormSchema,
  phoneFormSchema,
  phoneSchema,
  visitorNameSchema,
} from "@/features/auth/phone"

describe("normalizePhone", () => {
  it("remove máscara de telefone com 10 ou 11 dígitos", () => {
    expect(normalizePhone("(63) 99999-9999")).toBe("63999999999")
    expect(normalizePhone("(63) 3212-1234")).toBe("6332121234")
  })

  it("remove DDI 55 quando colado com 12 ou 13 dígitos, inclusive com DDD 55", () => {
    expect(normalizePhone("+55 (63) 99999-9999")).toBe("63999999999")
    expect(normalizePhone("5563999999999")).toBe("63999999999")
    expect(normalizePhone("556332121234")).toBe("6332121234")
    expect(normalizePhone("+55 (55) 99999-9999")).toBe("55999999999")
    expect(normalizePhone("555532121234")).toBe("5532121234")
  })

  it("NÃO corta DDD 55 quando o número já tem 10 ou 11 dígitos", () => {
    expect(normalizePhone("(55) 99999-9999")).toBe("55999999999")
    expect(normalizePhone("55999999999")).toBe("55999999999")
    expect(normalizePhone("(55) 3212-1234")).toBe("5532121234")
    expect(normalizePhone("5532121234")).toBe("5532121234")
  })
})

describe("formatPhoneInput e formatPhoneOnEdit", () => {
  it("aplica máscara visual para 10 e 11 dígitos, DDD 55 e colagem com +55", () => {
    expect(formatPhoneInput("63999999999")).toBe("(63) 99999-9999")
    expect(formatPhoneInput("6332121234")).toBe("(63) 3212-1234")
    expect(formatPhoneInput("55999999999")).toBe("(55) 99999-9999")
    expect(formatPhoneInput("5532121234")).toBe("(55) 3212-1234")
    expect(formatPhoneInput("+55 (63) 99999-9999")).toBe("(63) 99999-9999")
    expect(formatPhoneInput("+55 (55) 99999-9999")).toBe("(55) 99999-9999")
  })

  it("não trava edição parcial ao apagar dígitos", () => {
    expect(formatPhoneInput("")).toBe("")
    expect(formatPhoneInput("6")).toBe("(6")
    expect(formatPhoneInput("63")).toBe("(63")
    expect(formatPhoneInput("639")).toBe("(63) 9")
    expect(formatPhoneInput("639999")).toBe("(63) 9999")
    expect(formatPhoneInput("6399999")).toBe("(63) 9999-9")
  })

  it("preserva DDD 55 ao digitar um 12º dígito sem colar +55", () => {
    expect(formatPhoneOnEdit("(55) 99999-99991", "(55) 99999-9999")).toBe("(55) 99999-9999")
    expect(formatPhoneOnEdit("+55 (63) 99999-9999", "")).toBe("(63) 99999-9999")
  })
})

describe("phoneSchema e visitorNameSchema", () => {
  it("aceita telefones válidos de 10/11 dígitos, DDD 55 preservado e DDI +55/55 removido", () => {
    expect(phoneSchema.parse("63999999999")).toBe("63999999999")
    expect(phoneSchema.parse("(63) 99999-9999")).toBe("63999999999")
    expect(phoneSchema.parse("(55) 99999-9999")).toBe("55999999999")
    expect(phoneSchema.parse("5532121234")).toBe("5532121234")
    expect(phoneSchema.parse("+55 63 99999-9999")).toBe("63999999999")
    expect(phoneSchema.parse("+55 (55) 99999-9999")).toBe("55999999999")
    expect(phoneSchema.parse("556332121234")).toBe("6332121234")
  })

  it("rejeita DDD inválido e quantidades incorretas de dígitos", () => {
    expect(phoneSchema.safeParse("").success).toBe(false)
    expect(phoneSchema.safeParse("639999999").success).toBe(false)
    expect(phoneSchema.safeParse("639999999999").success).toBe(false)
    expect(phoneSchema.safeParse("+55639999999999").success).toBe(false)
    expect(phoneSchema.safeParse("00999999999").success).toBe(false)
    expect(phoneSchema.safeParse("01999999999").success).toBe(false)
    expect(phoneSchema.safeParse("10999999999").success).toBe(false)
  })

  it("normaliza nome opcional e valida limites de 2 a 80 caracteres", () => {
    expect(visitorNameSchema.parse(undefined)).toBeUndefined()
    expect(visitorNameSchema.parse("")).toBeUndefined()
    expect(visitorNameSchema.parse("   ")).toBeUndefined()
    expect(visitorNameSchema.parse("  Ana Clara  ")).toBe("Ana Clara")
    expect(visitorNameSchema.parse("Ju")).toBe("Ju")
    expect(visitorNameSchema.parse("a".repeat(80))).toHaveLength(80)
    expect(visitorNameSchema.safeParse("A").success).toBe(false)
    expect(visitorNameSchema.safeParse(" J ").success).toBe(false)
    expect(visitorNameSchema.safeParse("a".repeat(81)).success).toBe(false)
  })
})

describe("OTP, formulários e search params de auth", () => {
  it("aceita OTP de 6 dígitos incluindo 000000 e rejeita inválidos", () => {
    expect(otpCodeSchema.parse("000000")).toBe("000000")
    expect(otpCodeSchema.parse(" 042819 ")).toBe("042819")
    expect(otpCodeSchema.safeParse("").success).toBe(false)
    expect(otpCodeSchema.safeParse("00000").success).toBe(false)
    expect(otpCodeSchema.safeParse("0000000").success).toBe(false)
    expect(otpCodeSchema.safeParse("12ab56").success).toBe(false)
  })

  it("valida phoneFormSchema normalizando telefone limpo para a API", () => {
    expect(phoneFormSchema.parse({ name: "", phone: "(55) 99999-9999" })).toEqual({
      name: undefined,
      phone: "55999999999",
    })
    expect(phoneFormSchema.parse({ name: "  Carla  ", phone: "+55 (63) 99999-9999" })).toEqual({
      name: "Carla",
      phone: "63999999999",
    })
    expect(phoneFormSchema.safeParse({ name: "A", phone: "(63) 99999-9999" }).success).toBe(false)
  })

  it("exige consentimento LGPD explícito em otpFormSchema", () => {
    expect(otpFormSchema.parse({ code: "000000", consent: true })).toEqual({
      code: "000000",
      consent: true,
    })

    const withoutConsent = otpFormSchema.safeParse({ code: "000000", consent: false })
    expect(withoutConsent.success).toBe(false)
    if (!withoutConsent.success) {
      expect(withoutConsent.error.issues[0]?.message).toContain("aceite")
    }
  })

  it("valida passo e convite da URL em authSearchSchema", () => {
    expect(authSearchSchema.parse({ passo: "telefone" })).toEqual({ passo: "telefone" })
    expect(authSearchSchema.parse({ passo: "codigo" })).toEqual({ passo: "codigo" })
    expect(authSearchSchema.parse({ convite: " ju4821ab " })).toEqual({ convite: "JU4821AB" })
    expect(authSearchSchema.parse({ passo: "telefone", convite: "  ju4821  " })).toEqual({
      passo: "telefone",
      convite: "JU4821",
    })
    expect(authSearchSchema.parse({ passo: "codigo", convite: 123456 })).toEqual({
      passo: "codigo",
      convite: "123456",
    })
    expect(authSearchSchema.parse({ passo: "codigo", convite: 123 })).toEqual({
      passo: "codigo",
      convite: undefined,
    })
    expect(authSearchSchema.parse({ convite: "inv@lido" })).toEqual({ convite: undefined })
    expect(authSearchSchema.parse({ passo: "codigo", convite: "abc" })).toEqual({
      passo: "codigo",
      convite: undefined,
    })
    expect(authSearchSchema.parse({ passo: "telefone", convite: "A".repeat(17) })).toEqual({
      passo: "telefone",
      convite: undefined,
    })
    expect(
      authSearchSchema.parse({ passo: "codigo", convite: "<script>alert(1)</script>" }),
    ).toEqual({
      passo: "codigo",
      convite: undefined,
    })
    expect(authSearchSchema.parse({ passo: "codigo", convite: ["ju4821"] })).toEqual({
      passo: "codigo",
      convite: undefined,
    })
    expect(authSearchSchema.parse({ passo: "telefone", convite: null })).toEqual({
      passo: "telefone",
      convite: undefined,
    })
    expect(authSearchSchema.parse({})).toEqual({})
    expect(authSearchSchema.parse({ passo: "outro", convite: "ju4821" })).toEqual({
      passo: undefined,
      convite: "JU4821",
    })
  })

  it("normaliza código de convite aceitando alfanuméricos entre 4 e 16 caracteres", () => {
    expect(normalizeReferralCode(" ju4821 ")).toBe("JU4821")
    expect(normalizeReferralCode("ABCD")).toBe("ABCD")
    expect(normalizeReferralCode("1234567890ABCDEF")).toBe("1234567890ABCDEF")
    expect(normalizeReferralCode("")).toBeUndefined()
    expect(normalizeReferralCode("   ")).toBeUndefined()
    expect(normalizeReferralCode("abc")).toBeUndefined()
    expect(normalizeReferralCode("A".repeat(17))).toBeUndefined()
    expect(normalizeReferralCode("AB 12")).toBeUndefined()
    expect(normalizeReferralCode("AB-12")).toBeUndefined()
  })
})
