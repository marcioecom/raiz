import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ApiError,
  client,
  isEndpointNotImplemented,
  onUnauthorized,
  requestExtensionJson,
  unwrap,
} from "@/api/client"
import { clearToken, getToken, setToken } from "@/api/token"
import { DEFAULT_API_URL, env } from "@/env"

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

  it("limpa o token e notifica listeners em 401 fora de /v1/auth/*", async () => {
    setToken("expirado")
    window.history.replaceState({}, "", "/entrar")
    const onUnauthorizedSpy = vi.fn()
    const unsubscribe = onUnauthorized(onUnauthorizedSpy)

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: { code: "unauthorized", message: "token expired" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    try {
      await expect(unwrap(client.GET("/v1/home"))).rejects.toBeInstanceOf(ApiError)
      expect(getToken()).toBeNull()
      expect(onUnauthorizedSpy).toHaveBeenCalledTimes(1)

      unsubscribe()
      unsubscribe()

      setToken("expirado-de-novo")
      await expect(requestExtensionJson("/v1/me")).rejects.toMatchObject({
        code: "unauthorized",
        status: 401,
      })
      expect(getToken()).toBeNull()
      expect(onUnauthorizedSpy).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })

  it("não notifica listeners de onUnauthorized quando 401 vem de /v1/auth/*", async () => {
    setToken("sessao-previa")
    const onUnauthorizedSpy = vi.fn()
    const unsubscribe = onUnauthorized(onUnauthorizedSpy)

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "invalid_code", message: "bad otp" } }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    )

    try {
      await expect(
        unwrap(
          client.POST("/v1/auth/verify", {
            body: { phone: "63999999999", code: "123456" },
          }),
        ),
      ).rejects.toMatchObject({ code: "invalid_code", status: 401 })

      await expect(
        requestExtensionJson("/v1/auth/verify", {
          method: "POST",
          body: { phone: "63999999999", code: "123456" },
        }),
      ).rejects.toMatchObject({ code: "invalid_code", status: 401 })

      expect(getToken()).toBe("sessao-previa")
      expect(onUnauthorizedSpy).not.toHaveBeenCalled()
    } finally {
      unsubscribe()
      clearToken()
    }
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

  it("converte 404 em texto puro (Chi) para ApiError status 404 sem SyntaxError", async () => {
    setToken("jwt-valido")
    const fetchMock = vi.fn(async () => {
      return new Response("404 page not found\n", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    let caught: unknown
    try {
      await requestExtensionJson("/v1/me/redemptions")
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect(caught).not.toBeInstanceOf(SyntaxError)
    expect(caught).toMatchObject({ code: "not_found", status: 404 })
    expect(isEndpointNotImplemented(caught)).toBe(true)
    expect(isEndpointNotImplemented(new ApiError("unknown_error", 500))).toBe(false)
    expect(isEndpointNotImplemented(new Error("404"))).toBe(false)
  })

  it("requestExtensionJson envia Authorization, query, body JSON e trata 401 fora de /v1/auth/*", async () => {
    setToken("jwt-ext")
    window.history.replaceState({}, "", "/entrar")

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${DEFAULT_API_URL}/v1/me/receipts?cursor=c1&limit=50`)
      const headers = new Headers(init?.headers)
      expect(headers.get("Authorization")).toBe("Bearer jwt-ext")
      expect(headers.get("Content-Type")).toBe("application/json")
      expect(init?.method).toBe("POST")
      expect(init?.body).toBe(JSON.stringify({ referral_code: "JU4821" }))
      return new Response(JSON.stringify({ items: [{ id: "r1" }], next_cursor: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await requestExtensionJson<{ items: Array<{ id: string }>; next_cursor: null }>(
      "/v1/me/receipts",
      {
        method: "POST",
        query: { cursor: "c1", limit: 50, empty: undefined },
        body: { referral_code: "JU4821" },
      },
    )

    expect(result.items).toEqual([{ id: "r1" }])

    const unauthorizedMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "token expired" } }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", unauthorizedMock)

    await expect(requestExtensionJson("/v1/me/redemptions")).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    })
    expect(getToken()).toBeNull()
  })

  it("omite Authorization sem token e preserva header Authorization explícito do chamador", async () => {
    const noTokenMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input instanceof Request) {
        expect(input.headers.get("Authorization")).toBeNull()
      } else {
        const headers = new Headers(init?.headers)
        expect(headers.get("Authorization")).toBeNull()
      }
      return new Response(JSON.stringify({ service: "raiz-api" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", noTokenMock)

    await unwrap(client.GET("/v1/meta"))
    await requestExtensionJson("/v1/meta")

    setToken("jwt-sessao")
    const customAuthMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get("Authorization")).toBe("Bearer token-custom")
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", customAuthMock)

    await requestExtensionJson("v1/me", {
      headers: { Authorization: "Bearer token-custom" },
    })
  })

  it("resolve base URL sem barra inicial, trata 204 vazio, JSON inválido em 200 e falha de rede em requestExtensionJson", async () => {
    const emptyBodyMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(`${env.VITE_API_URL}/v1/me`)
      return new Response(null, { status: 204 })
    })
    vi.stubGlobal("fetch", emptyBodyMock)
    await expect(requestExtensionJson("v1/me", { method: "DELETE" })).resolves.toBeUndefined()

    const invalidJsonMock = vi.fn(async () => {
      return new Response("<html>proxy ok</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    })
    vi.stubGlobal("fetch", invalidJsonMock)
    await expect(requestExtensionJson("/v1/me")).rejects.toMatchObject({
      name: "ApiError",
      code: "unknown_error",
      status: 200,
    })

    const networkMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", networkMock)
    await expect(requestExtensionJson("/v1/me")).rejects.toMatchObject({
      name: "ApiError",
      code: "network_error",
      status: 0,
    })
  })

  it("não limpa token em 401 de /v1/auth/verify via requestExtensionJson", async () => {
    setToken("sessao-previa")
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { code: "invalid_code", message: "bad otp" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      requestExtensionJson("/v1/auth/verify", {
        method: "POST",
        body: { phone: "63999999999", code: "111111" },
      }),
    ).rejects.toMatchObject({ code: "invalid_code", status: 401 })
    expect(getToken()).toBe("sessao-previa")
  })

  it("preserva códigos de 404 JSON de domínio vs rota ausente e os distingue em isEndpointNotImplemented", async () => {
    const chiPlainText404 = vi.fn(async () => {
      return new Response("404 page not found\n", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      })
    })
    vi.stubGlobal("fetch", chiPlainText404)

    await expect(unwrap(client.GET("/v1/home"))).rejects.toMatchObject({
      name: "ApiError",
      code: "not_found",
      status: 404,
    })

    const routeNotFoundJson = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "route not found",
            details: { method: "GET", path: "/v1/me/redemptions" },
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", routeNotFoundJson)

    let routeError: unknown
    try {
      await requestExtensionJson("/v1/me/redemptions")
    } catch (error) {
      routeError = error
    }
    expect(routeError).toBeInstanceOf(ApiError)
    expect(routeError).toMatchObject({
      code: "not_found",
      status: 404,
      details: { method: "GET", path: "/v1/me/redemptions" },
    })
    expect(isEndpointNotImplemented(routeError)).toBe(true)

    const domainVoucherNotFound = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "voucher_not_found",
            message: "voucher not found",
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", domainVoucherNotFound)

    let voucherError: unknown
    try {
      await requestExtensionJson("/v1/me/redemptions")
    } catch (error) {
      voucherError = error
    }
    expect(voucherError).toBeInstanceOf(ApiError)
    expect(voucherError).toMatchObject({ code: "voucher_not_found", status: 404 })

    const domainRewardNotFound = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "reward_not_found",
            message: "reward not found",
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", domainRewardNotFound)

    let rewardError: unknown
    try {
      await unwrap(client.POST("/v1/rewards/{id}/redeem", { params: { path: { id: "missing" } } }))
    } catch (error) {
      rewardError = error
    }
    expect(rewardError).toBeInstanceOf(ApiError)
    expect(rewardError).toMatchObject({ code: "reward_not_found", status: 404 })

    expect(isEndpointNotImplemented(voucherError)).toBe(false)
    expect(isEndpointNotImplemented(rewardError)).toBe(false)
  })
})
