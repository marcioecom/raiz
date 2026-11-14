import type { ServiceMeta } from "@/api/extensions"
import type {
  ExtendedMe,
  LedgerEntry,
  ReceiptsExportResult,
  VisitorReceipt,
  VisitorReceiptsPage,
} from "./types"

import { client, isEndpointNotImplemented, requestExtensionJson, unwrap } from "@/api/client"
import { fetchMyRedemptions, fetchServiceMeta } from "@/api/extensions"

export type { ServiceMeta }
export { fetchMyRedemptions, fetchServiceMeta as fetchMeta }

const EXPORT_PAGE_LIMIT = 50
const MAX_EXPORT_PAGES = 100

/** Busca o resumo do visitante autenticado em GET /v1/me (incluindo `referral_code` quando disponível). */
export function fetchMe(): Promise<ExtendedMe> {
  return requestExtensionJson<ExtendedMe>("/v1/me")
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

  while (pageCount < MAX_EXPORT_PAGES) {
    const page = await unwrap(
      client.GET("/v1/me/ledger", {
        params: {
          query: cursor ? { cursor, limit: EXPORT_PAGE_LIMIT } : { limit: EXPORT_PAGE_LIMIT },
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

/** Coleta páginas de cupons em GET /v1/me/receipts, degradando graciosamente quando retornar 404. */
export async function fetchAllReceipts(): Promise<ReceiptsExportResult> {
  const items: VisitorReceipt[] = []
  const seenCursors = new Set<string>()
  let cursor: string | undefined
  let pageCount = 0

  while (pageCount < MAX_EXPORT_PAGES) {
    let page: VisitorReceiptsPage
    try {
      page = await requestExtensionJson<VisitorReceiptsPage>("/v1/me/receipts", {
        query: cursor ? { cursor, limit: EXPORT_PAGE_LIMIT } : { limit: EXPORT_PAGE_LIMIT },
      })
    } catch (error) {
      if (pageCount === 0 && isEndpointNotImplemented(error)) {
        return { supported: false, truncated: false, items: [] }
      }
      throw error
    }

    if (Array.isArray(page.items) && page.items.length > 0) {
      items.push(...page.items)
    }

    pageCount += 1
    const nextCursor = page.next_cursor ?? null
    if (!nextCursor || seenCursors.has(nextCursor)) {
      return { supported: true, truncated: false, items }
    }

    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  return { supported: true, truncated: true, items }
}

/** Encerra e agenda anonimização da conta do visitante via DELETE /v1/me. */
export async function deleteMyAccount(): Promise<void> {
  await unwrap(client.DELETE("/v1/me"))
}
