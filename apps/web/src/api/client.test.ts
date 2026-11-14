import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, client, unwrap } from "@/api/client"
import { clearToken, getToken, setToken } from "@/api/token"
import { DEFAULT_API_URL } from "@/env"

describe("api client", () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, "", "/")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("injeta Authorization Bearer e aponta para a API hospedada", async () => {
    setToken("meu-jwt")
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request
      expect(request.url).toBe(`${DEFAULT_API_URL}/healthz`)
      expect(request.headers.get("Authorization")).toBe("Bearer meu-jwt")
      return new Response(JSON.stringify({ status: "ok", service: "raiz-api" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const data = await unwrap(client.GET("/healthz"))
    expect(data.status).toBe("ok")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("converte envelope de erro padronizado em ApiError", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "already_claimed",
            message: "este cupom já foi registrado",
            details: { receipt_id: "123" },
          },
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      unwrap(
        client.POST("/v1/receipts", {
          body: { access_key: "17260112345678000199650010000001231123456787" },
        }),
      ),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "already_claimed",
      status: 409,
      details: { receipt_id: "123" },
    })
  })

  it("limpa o token em 401 fora de /v1/auth/*", async () => {
    setToken("expirado")
    window.history.replaceState({}, "", "/entrar")

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "unauthorized", message: "token expired" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(unwrap(client.GET("/v1/home"))).rejects.toBeInstanceOf(ApiError)
    expect(getToken()).toBeNull()
  })

  it("não limpa token quando 401 vem de /v1/auth/verify", async () => {
    setToken("sessao-existente")
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "invalid_otp", message: "invalid code" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      unwrap(
        client.POST("/v1/auth/verify", {
          body: { phone: "63999999999", code: "123456" },
        }),
      ),
    ).rejects.toMatchObject({ code: "invalid_otp", status: 401 })

    expect(getToken()).toBe("sessao-existente")
    clearToken()
  })

  it("traduz falha de rede do fetch para ApiError network_error", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(unwrap(client.GET("/v1/meta"))).rejects.toMatchObject({
      code: "network_error",
      status: 0,
    })
  })
})
