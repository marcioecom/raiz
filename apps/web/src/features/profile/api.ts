import type { paths } from "@/api/schema"
import type { LedgerEntry, Me } from "./tier"

import { client, unwrap } from "@/api/client"

export type ServiceMeta =
  paths["/v1/meta"]["get"]["responses"]["200"]["content"]["application/json"]

const LEDGER_EXPORT_PAGE_LIMIT = 50
const MAX_LEDGER_EXPORT_PAGES = 100

/** Busca o resumo do visitante autenticado em GET /v1/me. */
export function fetchMe(): Promise<Me> {
  return unwrap(client.GET("/v1/me"))
}

/** Busca metadados opcionais do serviço para detectar modo demonstração. */
export function fetchMeta(): Promise<ServiceMeta> {
  return unwrap(client.GET("/v1/meta"))
}

/** Coleta todas as páginas do extrato em GET /v1/me/ledger com trava segura de paginação. */
export async function fetchAllLedgerEntries(): Promise<{
  entries: LedgerEntry[]
  truncated: boolean
}> {
  const entries: LedgerEntry[] = []
  const seenCursors = new Set<string>()
  let cursor: string | undefined
  let pageCount = 0

  while (pageCount < MAX_LEDGER_EXPORT_PAGES) {
    const page = await unwrap(
      client.GET("/v1/me/ledger", {
        params: {
          query: cursor
            ? { cursor, limit: LEDGER_EXPORT_PAGE_LIMIT }
            : { limit: LEDGER_EXPORT_PAGE_LIMIT },
        },
      }),
    )

    if (Array.isArray(page.entries) && page.entries.length > 0) {
      entries.push(...page.entries)
    }

    pageCount += 1
    const nextCursor = page.next_cursor ?? null
    if (!nextCursor || seenCursors.has(nextCursor)) {
      return { entries, truncated: false }
    }

    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  return { entries, truncated: true }
}

/** Encerra e agenda anonimização da conta do visitante via DELETE /v1/me. */
export async function deleteMyAccount(): Promise<void> {
  await unwrap(client.DELETE("/v1/me"))
}
