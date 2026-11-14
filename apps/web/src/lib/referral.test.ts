import { describe, expect, it } from "vitest"

import { normalizeReferralCode } from "@/lib/referral"

describe("normalizeReferralCode", () => {
  it("normaliza espaços nas bordas e converte código alfanumérico válido para maiúsculas", () => {
    expect(normalizeReferralCode("ju4821")).toBe("JU4821")
    expect(normalizeReferralCode("  ju4821ab  ")).toBe("JU4821AB")
    expect(normalizeReferralCode("ABCD")).toBe("ABCD")
    expect(normalizeReferralCode("1234567890abcdef")).toBe("1234567890ABCDEF")
  })

  it("rejeita valores ausentes, curtos, longos, com símbolos ou tentativa de XSS", () => {
    expect(normalizeReferralCode(undefined)).toBeUndefined()
    expect(normalizeReferralCode("")).toBeUndefined()
    expect(normalizeReferralCode("   ")).toBeUndefined()
    expect(normalizeReferralCode("abc")).toBeUndefined()
    expect(normalizeReferralCode("A".repeat(17))).toBeUndefined()
    expect(normalizeReferralCode("AB 12")).toBeUndefined()
    expect(normalizeReferralCode("AB-12")).toBeUndefined()
    expect(normalizeReferralCode("AB_12")).toBeUndefined()
    expect(normalizeReferralCode("ju4821!")).toBeUndefined()
    expect(normalizeReferralCode("açúcar")).toBeUndefined()
    expect(normalizeReferralCode("<script>alert(1)</script>")).toBeUndefined()
    expect(normalizeReferralCode(null as unknown as string)).toBeUndefined()
    expect(normalizeReferralCode(123456 as unknown as string)).toBeUndefined()
  })
})
