import type { paths } from "@/api/schema"
import type { Middleware } from "openapi-fetch"

import createClient from "openapi-fetch"

import { clearToken, getToken } from "@/api/token"
import { env } from "@/env"

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(code: string, status: number, details?: unknown) {
    super(code)
    this.name = "ApiError"
    this.code = code
    this.status = status
    this.details = details
  }
}

const authAndErrorMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getToken()
    if (token && !request.headers.has("Authorization")) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    return request
  },

  async onResponse({ response, schemaPath }) {
    if (response.ok) {
      return response
    }

    let code = response.status === 401 ? "unauthorized" : "unknown_error"
    let details: unknown

    try {
      const payload = (await response.clone().json()) as ApiErrorPayload
      if (payload?.error?.code) {
        code = payload.error.code
      }
      if (payload?.error && "details" in payload.error) {
        details = payload.error.details
      }
    } catch {
      // Resposta sem JSON válido: mantém código derivado do status HTTP.
    }

    if (response.status === 401 && !schemaPath.startsWith("/v1/auth/")) {
      clearToken()
      if (typeof window !== "undefined" && window.location.pathname !== "/entrar") {
        window.location.replace("/entrar")
      }
    }

    throw new ApiError(code, response.status, details)
  },

  onError({ error }) {
    if (error instanceof ApiError) {
      return error
    }
    return new ApiError("network_error", 0)
  },
}

export const client = createClient<paths>({
  baseUrl: env.VITE_API_URL,
  fetch: (input) => globalThis.fetch(input),
})

client.use(authAndErrorMiddleware)

export const api = client

export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const result = await promise
  if (result.error) {
    const payload = result.error as ApiErrorPayload
    throw new ApiError(
      payload?.error?.code ?? "unknown_error",
      result.response.status,
      payload?.error?.details,
    )
  }
  return result.data as T
}
