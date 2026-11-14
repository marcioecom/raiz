import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/api/client"
import { fetchMyRedemptions, fetchServiceMeta } from "@/api/extensions"
import { clearToken, setToken } from "@/api/token"
import { DEFAULT_API_URL } from "@/env"

describe("api extensions", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    clearToken()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("fetchServiceMeta consulta GET /v1/meta e propaga erros reais", async () => {
    const okMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request
      expect(request.url).toBe(`${DEFAULT_API_URL}/v1/meta`)
      expect(request.method).toBe("GET")
      return new Response(
        JSON.stringify({
          service: "raiz-api",
          version: "0.1.0",
          env: "production",
          demo_mode: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    })
    vi.stubGlobal("fetch", okMock)

    await expect(fetchServiceMeta()).resolves.toEqual({
      service: "raiz-api",
      version: "0.1.0",
      env: "production",
      demo_mode: true,
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    )
    await expect(fetchServiceMeta()).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      code: "unknown_error",
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      }),
    )
    await expect(fetchServiceMeta()).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      code: "network_error",
    })
  })

  it("fetchMyRedemptions retorna 200 com Bearer, degrada 404 de rota ausente e propaga 404 de domínio", async () => {
    setToken("jwt-ext-shared")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(`${DEFAULT_API_URL}/v1/me/redemptions`)
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer jwt-ext-shared")
        return new Response(
          JSON.stringify({
            items: [{ id: "red-1", code: "7F2K9A", status: "pending" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )
      }),
    )

    await expect(fetchMyRedemptions()).resolves.toEqual({
      supported: true,
      items: [{ id: "red-1", code: "7F2K9A", status: "pending" }],
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("404 page not found\n", { status: 404 })),
    )
    await expect(fetchMyRedemptions()).resolves.toEqual({ items: [], supported: false })

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: "not_found", message: "route not found" } }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          ),
      ),
    )
    await expect(fetchMyRedemptions()).resolves.toEqual({ items: [], supported: false })

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { code: "voucher_not_found", message: "voucher not found" } }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          ),
      ),
    )
    await expect(fetchMyRedemptions()).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      code: "voucher_not_found",
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 })),
    )
    await expect(fetchMyRedemptions()).rejects.toBeInstanceOf(ApiError)
  })
})
