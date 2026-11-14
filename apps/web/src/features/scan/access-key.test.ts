import { describe, expect, it } from "vitest"

import {
  chunkAccessKey,
  computeCheckDigit,
  extractAccessKeyDigits,
  formatAccessKeyGroups,
  formatCnpj,
  normalizeAccessKey,
  validateAccessKey,
} from "./access-key"

const VALID_TO = "17260112345678000199650010000001231123456787"
const VALID_SP = "35251060746948000112650020000000451876543219"
const VALID_NFE = "17260112345678000199550010000001231123456784"
const VALID_MOD0_DV0 = "17260112345678000199650010000001231123456760"
const VALID_MOD1_DV0 = "17260112345678000199650010000001231123456680"
const VALID_MOD10_DV1 = "17260112345678000199650010000001231123456701"

describe("normalizeAccessKey", () => {
  it("remove espaços, tabulações, quebras de linha, pontos e hifens", () => {
    const raw = "  1726 0112.3456-7800\t0199\n6500\r1000 0001 2311 2345 6787  "
    expect(normalizeAccessKey(raw)).toBe(VALID_TO)
  })

  it("extrai chave de URL com p= terminada por |, & ou fim da URL", () => {
    expect(
      normalizeAccessKey(`https://www.sefaz.to.gov.br/nfce/qrcode?p=${VALID_TO}|2|1|1|HASH123`),
    ).toBe(VALID_TO)
    expect(
      normalizeAccessKey(`https://portal.fazenda.sp.gov.br/nfce?v=2&p=${VALID_SP}&tpAmb=1`),
    ).toBe(VALID_SP)
    expect(normalizeAccessKey(`https://www.sefaz.to.gov.br/nfce/qrcode?p=${VALID_TO}`)).toBe(
      VALID_TO,
    )
    expect(
      normalizeAccessKey(
        "https://www.sefaz.to.gov.br/nfce/qrcode?p=1726.0112-3456 78000199650010000001231123456787|2|1",
      ),
    ).toBe(VALID_TO)
  })
})

describe("computeCheckDigit", () => {
  it("retorna 0 quando soma % 11 resulta em 0 ou 1", () => {
    expect(computeCheckDigit(VALID_MOD0_DV0.slice(0, 43))).toBe(0)
    expect(computeCheckDigit(VALID_MOD1_DV0.slice(0, 43))).toBe(0)
    expect(computeCheckDigit("1726011234567800019965001000000123112345671")).toBe(0)
  })

  it("calcula módulo 11 pesos 2..9 cobrindo dígitos verificadores de 1 a 9", () => {
    const modCases: Array<[string, number]> = [
      [VALID_MOD10_DV1.slice(0, 43), 1],
      ["1726011234567800019965001000000123112345675", 2],
      ["1726011234567800019965001000000123112345666", 3],
      [VALID_NFE.slice(0, 43), 4],
      ["1726011234567800019965001000000123112345679", 5],
      ["1726011234567800019965001000000123112345673", 6],
      [VALID_TO.slice(0, 43), 7],
      ["1726011234567800019965001000000123112345672", 8],
      [VALID_SP.slice(0, 43), 9],
    ]
    for (const [base43, expectedDv] of modCases) {
      expect(computeCheckDigit(base43)).toBe(expectedDv)
    }
  })
})

describe("validateAccessKey", () => {
  it("valida chave NFC-e e extrai UF IBGE, CNPJ, emissão e modelo 65 ou 55", () => {
    const result = validateAccessKey(VALID_TO)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.key).toBe(VALID_TO)
    expect(result.decoded).toEqual({
      raw: VALID_TO,
      uf: "17",
      ufName: "TO",
      year: 2026,
      month: 1,
      yearMonthLabel: "01/2026",
      cnpj: "12345678000199",
      formattedCnpj: "12.345.678/0001-99",
      model: 65,
      series: 1,
      number: 123,
      emissionType: 1,
      randomCode: "12345678",
    })
  })

  it("aceita DVs 0 e 1, URLs com & ou |, NF-e 55 e extremos da tabela de UF IBGE", () => {
    const validInputs = [
      VALID_MOD0_DV0,
      VALID_MOD1_DV0,
      VALID_MOD10_DV1,
      `https://www.sefaz.to.gov.br/nfce/qrcode?p=${VALID_TO}|2|1|1|HASH`,
      `https://portal.fazenda.sp.gov.br/nfce?v=2&p=${VALID_SP}&tpAmb=1`,
      VALID_NFE,
      "11260112345678000199650010000001231123456783",
      "53261212345678000199650010000001239123456785",
    ]
    for (const input of validInputs) {
      expect(validateAccessKey(input).ok).toBe(true)
    }

    const df = validateAccessKey("53261212345678000199650010000001239123456785")
    expect(df.ok && df.decoded).toMatchObject({
      uf: "53",
      ufName: "DF",
      month: 12,
      yearMonthLabel: "12/2026",
      emissionType: 9,
    })

    const nfe = validateAccessKey(VALID_NFE)
    expect(nfe.ok && nfe.decoded.model).toBe(55)
  })

  it("retorna todos os códigos de erro espelhando apps/api/internal/receipt/accesskey.go", () => {
    const invalidEmissionBase = "1726011234567800019965001000000123012345678"
    const invalidEmission = `${invalidEmissionBase}${computeCheckDigit(invalidEmissionBase)}`

    const cases: Array<[string, string]> = [
      ["", "empty_access_key"],
      ["  \t\n ", "empty_access_key"],
      ["12345", "invalid_length"],
      [VALID_TO.slice(0, 43), "invalid_length"],
      [`${VALID_TO}0`, "invalid_length"],
      ["https://www.sefaz.to.gov.br/nfce/qrcode?p=|2|1", "invalid_length"],
      ["1726011234567800019965001000000123112345678a", "invalid_chars"],
      ["1726011234567800019965001000000123112345678/", "invalid_chars"],
      ["17260112345678000199650010000001231123456788", "invalid_check_digit"],
      ["17260112345678000199650010000001231123456761", "invalid_check_digit"],
      ["17260112345678000199650010000001231123456689", "invalid_check_digit"],
      ["00260112345678000199650010000001231123456780", "invalid_uf"],
      ["18260112345678000199650010000001231123456784", "invalid_uf"],
      ["99260112345678000199650010000001231123456782", "invalid_uf"],
      ["17260012345678000199650010000001231123456783", "invalid_month"],
      ["17261312345678000199650010000001231123456787", "invalid_month"],
      ["17260112345678000199000010000001231123456782", "invalid_model"],
      ["17260112345678000199990010000001231123456780", "invalid_model"],
      [invalidEmission, "invalid_emission_type"],
    ]

    for (const [input, expectedCode] of cases) {
      const result = validateAccessKey(input)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(expectedCode)
      }
    }
  })
})

describe("helpers visuais de chave e CNPJ", () => {
  it("extrai dígitos de QR, divide em 11 blocos de 4 e formata grupos e CNPJ", () => {
    expect(extractAccessKeyDigits(`https://sefaz.to.gov.br?p=${VALID_TO}|2|1`)).toBe(VALID_TO)
    expect(extractAccessKeyDigits(`${VALID_TO}999`)).toBe(VALID_TO)

    const chunks = chunkAccessKey(VALID_TO)
    expect(chunks).toHaveLength(11)
    expect(chunks.join("")).toBe(VALID_TO)
    expect(chunks[0]).toBe("1726")
    expect(chunks[10]).toBe("6787")

    expect(formatAccessKeyGroups("1726011234")).toBe("1726 0112 34")
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99")
    expect(formatCnpj("12345")).toBe("12345")
  })
})
