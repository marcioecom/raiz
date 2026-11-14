const ACCESS_KEY_LENGTH = 44

const UFS: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
}

export type AccessKeyErrorCode =
  | "empty_access_key"
  | "invalid_length"
  | "invalid_chars"
  | "invalid_check_digit"
  | "invalid_uf"
  | "invalid_month"
  | "invalid_model"
  | "invalid_emission_type"

export interface DecodedAccessKey {
  raw: string
  uf: string
  ufName: string
  year: number
  month: number
  yearMonthLabel: string
  cnpj: string
  formattedCnpj: string
  model: 55 | 65
  series: number
  number: number
  emissionType: number
  randomCode: string
}

export type AccessKeyValidationResult =
  | { ok: true; key: string; decoded: DecodedAccessKey }
  | { ok: false; code: AccessKeyErrorCode; key: string }

/** Normaliza entrada bruta (dígitos, separadores ou URL NFC-e com parâmetro `p=`). */
export function normalizeAccessKey(raw: string): string {
  let normalized = raw.trim()
  const paramIndex = normalized.indexOf("p=")
  if (paramIndex >= 0) {
    normalized = normalized.slice(paramIndex + 2)
    const cutIndex = normalized.search(/[&|]/)
    if (cutIndex >= 0) {
      normalized = normalized.slice(0, cutIndex)
    }
  }
  return normalized.replace(/[ \t\n\r.-]/g, "")
}

/** Calcula o dígito verificador módulo 11 (pesos 2..9 da direita para a esquerda). */
export function computeCheckDigit(base43: string): number {
  let sum = 0
  let weight = 2
  for (let index = base43.length - 1; index >= 0; index--) {
    const digit = base43.charCodeAt(index) - 48
    sum += digit * weight
    weight++
    if (weight > 9) {
      weight = 2
    }
  }
  const dv = 11 - (sum % 11)
  return dv < 10 ? dv : 0
}

/** Formata CNPJ de 14 dígitos para exibição (`00.000.000/0000-00`). */
export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "")
  if (digits.length !== 14) {
    return cnpj
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

/** Extrai somente dígitos (limitado a 44) a partir de chave ou URL de QR NFC-e. */
export function extractAccessKeyDigits(raw: string): string {
  const normalized = raw.includes("p=") ? normalizeAccessKey(raw) : raw
  return normalized.replace(/\D/g, "").slice(0, ACCESS_KEY_LENGTH)
}

/** Formata dígitos em blocos de 4 separados por espaço para digitação manual. */
export function formatAccessKeyGroups(raw: string): string {
  const digits = extractAccessKeyDigits(raw)
  const groups = digits.match(/.{1,4}/g)
  return groups ? groups.join(" ") : ""
}

/** Divide a chave em 11 grupos de até 4 dígitos para conferência visual em grade. */
export function chunkAccessKey(key: string): string[] {
  const digits = extractAccessKeyDigits(key)
  return Array.from({ length: 11 }, (_, index) => digits.slice(index * 4, index * 4 + 4))
}

/** Valida localmente a chave NFC-e/NF-e espelhando o parser do backend Go. */
export function validateAccessKey(raw: string): AccessKeyValidationResult {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return { ok: false, code: "empty_access_key", key: "" }
  }

  const key = normalizeAccessKey(trimmed)
  if (key.length !== ACCESS_KEY_LENGTH) {
    return { ok: false, code: "invalid_length", key }
  }

  if (!/^\d{44}$/.test(key)) {
    return { ok: false, code: "invalid_chars", key }
  }

  const gotDigit = Number(key[43])
  const expectedDigit = computeCheckDigit(key.slice(0, 43))
  if (gotDigit !== expectedDigit) {
    return { ok: false, code: "invalid_check_digit", key }
  }

  const uf = key.slice(0, 2)
  const ufName = UFS[uf]
  if (!ufName) {
    return { ok: false, code: "invalid_uf", key }
  }

  const yy = Number(key.slice(2, 4))
  const mm = Number(key.slice(4, 6))
  if (mm < 1 || mm > 12) {
    return { ok: false, code: "invalid_month", key }
  }

  const model = Number(key.slice(20, 22))
  if (model !== 55 && model !== 65) {
    return { ok: false, code: "invalid_model", key }
  }

  const emissionType = Number(key.slice(34, 35))
  if (emissionType < 1 || emissionType > 9) {
    return { ok: false, code: "invalid_emission_type", key }
  }

  const cnpj = key.slice(6, 20)
  const year = 2000 + yy
  const monthText = String(mm).padStart(2, "0")

  return {
    ok: true,
    key,
    decoded: {
      raw: key,
      uf,
      ufName,
      year,
      month: mm,
      yearMonthLabel: `${monthText}/${year}`,
      cnpj,
      formattedCnpj: formatCnpj(cnpj),
      model,
      series: Number(key.slice(22, 25)),
      number: Number(key.slice(25, 34)),
      emissionType,
      randomCode: key.slice(35, 43),
    },
  }
}
