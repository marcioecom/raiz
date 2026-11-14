import { beforeEach, describe, expect, it } from "vitest"

import { clearToken, getToken, hasToken, setToken } from "@/api/token"

describe("token storage", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("armazena, lê e limpa o JWT em raiz.jwt", () => {
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)

    setToken("jwt-demo-token")
    expect(window.localStorage.getItem("raiz.jwt")).toBe("jwt-demo-token")
    expect(getToken()).toBe("jwt-demo-token")
    expect(hasToken()).toBe(true)

    clearToken()
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)
  })
})
