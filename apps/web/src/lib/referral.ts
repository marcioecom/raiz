const REFERRAL_CODE_REGEX = /^[A-Z0-9]{4,16}$/

/** Normaliza código de convite (trim + maiúsculas) aceitando apenas 4 a 16 alfanuméricos. */
export function normalizeReferralCode(value?: string): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const normalized = value.trim().toUpperCase()
  if (!REFERRAL_CODE_REGEX.test(normalized)) {
    return undefined
  }
  return normalized
}
