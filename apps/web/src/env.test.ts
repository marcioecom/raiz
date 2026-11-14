import { describe, expect, it } from "vitest"

import { DEFAULT_API_URL, parseEnv } from "./env"

describe("env", () => {
  it("usa a API hospedada como padrão quando VITE_API_URL está ausente ou vazia", () => {
    expect(DEFAULT_API_URL).toBe("https://raiz-api.marcio.run")
    expect(parseEnv({}).VITE_API_URL).toBe("https://raiz-api.marcio.run")
    expect(parseEnv({ VITE_API_URL: "" }).VITE_API_URL).toBe("https://raiz-api.marcio.run")
    expect(parseEnv({ VITE_API_URL: "   " }).VITE_API_URL).toBe("https://raiz-api.marcio.run")
  })

  it("remove barras finais e aceita URL customizada válida", () => {
    expect(parseEnv({ VITE_API_URL: "https://raiz-api.marcio.run/" }).VITE_API_URL).toBe(
      "https://raiz-api.marcio.run",
    )
    expect(parseEnv({ VITE_API_URL: "http://localhost:8080///" }).VITE_API_URL).toBe(
      "http://localhost:8080",
    )
  })

  it("rejeita URL inválida em VITE_API_URL", () => {
    expect(() => parseEnv({ VITE_API_URL: "nao-e-url" })).toThrow()
  })
})
