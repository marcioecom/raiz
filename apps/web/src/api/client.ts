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

export interface ExtensionRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
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

const unauthorizedListeners = new Set<() => void>()

/** Registra um callback executado quando uma rota fora de `/v1/auth/*` retornar HTTP 401. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    listener()
  }
}

function attachBearerToken(headers: Headers): void {
  const token = getToken()
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`)
}

async function parseApiErrorResponse(response: Response, requestPath: string): Promise<ApiError> {
  let code =
    response.status === 401
      ? "unauthorized"
      : response.status === 404
        ? "not_found"
        : "unknown_error"
  let details: unknown

  try {
    const raw = await response.clone().text()
    if (raw.trim().length > 0) {
      const payload = JSON.parse(raw) as ApiErrorPayload
      if (payload?.error?.code) code = payload.error.code
      if (payload?.error && "details" in payload.error) details = payload.error.details
    }
  } catch {
    // Resposta sem JSON válido (ex.: "404 page not found"): mantém código derivado do status HTTP.
  }

  if (response.status === 401 && !requestPath.startsWith("/v1/auth/")) {
    clearToken()
    notifyUnauthorized()
    if (typeof window !== "undefined" && window.location.pathname !== "/entrar") {
      window.location.replace("/entrar")
    }
  }

  return new ApiError(code, response.status, details)
}

function buildExtensionUrl(
  normalizedPath: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const base = `${env.VITE_API_URL}${normalizedPath}`
  if (!query) return base
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized.length > 0 ? `${base}?${serialized}` : base
}

/** Indica se a falha representa rota ainda não implementada nesta versão da API (HTTP 404). */
export function isEndpointNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && error.code === "not_found"
}

const authAndErrorMiddleware: Middleware = {
  onRequest({ request }) {
    attachBearerToken(request.headers)
    return request
  },

  async onResponse({ response, schemaPath }) {
    if (response.ok) return response
    throw await parseApiErrorResponse(response, schemaPath)
  },

  onError({ error }) {
    return error instanceof ApiError ? error : new ApiError("network_error", 0)
  },
}

export const client = createClient<paths>({
  baseUrl: env.VITE_API_URL,
  fetch: (input) => globalThis.fetch(input),
})

client.use(authAndErrorMiddleware)

export const api = client

/** Executa chamadas tipadas para endpoints ou campos estendidos ainda ausentes em `schema.d.ts`. */
export async function requestExtensionJson<TResponse>(
  path: string,
  options: ExtensionRequestOptions = {},
): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = buildExtensionUrl(normalizedPath, options.query)
  const headers = new Headers(options.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  attachBearerToken(headers)

  const hasBody = options.body !== undefined
  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")

  let response: Response
  try {
    response = await globalThis.fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError("network_error", 0)
  }

  if (!response.ok) throw await parseApiErrorResponse(response, normalizedPath)

  const raw = await response.text()
  if (raw.trim().length === 0) return undefined as TResponse

  try {
    return JSON.parse(raw) as TResponse
  } catch {
    throw new ApiError("unknown_error", response.status)
  }
}

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
