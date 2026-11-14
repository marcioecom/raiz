import type { ServiceMeta } from "@/api/extensions"
import type { components, paths } from "@/api/schema"

import { client, unwrap } from "@/api/client"
import { fetchServiceMeta } from "@/api/extensions"

export type Me = components["schemas"]["Me"]
export type LedgerEntry = components["schemas"]["LedgerEntry"]
export type LedgerPage =
  paths["/v1/me/ledger"]["get"]["responses"]["200"]["content"]["application/json"]
export type { ServiceMeta }

export interface FetchLedgerPageParams {
  cursor?: string
  limit?: number
}

const DEFAULT_LEDGER_LIMIT = 20

/** Busca saldo, nível, ritmo e total de cupons do visitante em GET /v1/me. */
export function fetchWalletMe(): Promise<Me> {
  return unwrap(client.GET("/v1/me"))
}

/** Busca uma página do extrato de sementes em GET /v1/me/ledger usando cursor. */
export function fetchLedgerPage({
  cursor,
  limit = DEFAULT_LEDGER_LIMIT,
}: FetchLedgerPageParams = {}): Promise<LedgerPage> {
  return unwrap(
    client.GET("/v1/me/ledger", {
      params: {
        query: cursor ? { cursor, limit } : { limit },
      },
    }),
  )
}

/** Busca metadados do serviço para exibir selo explícito de demonstração quando ativo. */
export { fetchServiceMeta as fetchWalletMeta }
