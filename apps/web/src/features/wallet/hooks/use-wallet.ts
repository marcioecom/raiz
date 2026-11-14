import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { fetchLedgerPage, fetchWalletMe, fetchWalletMeta } from "../api"

export const walletKeys = {
  all: () => ["wallet"] as const,
  me: () => [...walletKeys.all(), "me"] as const,
  ledger: () => [...walletKeys.all(), "ledger"] as const,
  meta: () => [...walletKeys.all(), "meta"] as const,
}

const DEFAULT_LEDGER_LIMIT = 20

/** Carrega saldo, nível e ritmo do visitante via GET /v1/me. */
export function useWalletMeQuery() {
  return useQuery({
    queryKey: walletKeys.me(),
    queryFn: fetchWalletMe,
  })
}

/** Carrega o extrato de sementes paginado por cursor via GET /v1/me/ledger. */
export function useLedgerInfiniteQuery(limit = DEFAULT_LEDGER_LIMIT) {
  return useInfiniteQuery({
    queryKey: walletKeys.ledger(),
    queryFn: ({ pageParam }) => fetchLedgerPage({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  })
}

/** Consulta os metadados do serviço para sinalizar modo demonstração na tela. */
export function useWalletMetaQuery() {
  return useQuery({
    queryKey: walletKeys.meta(),
    queryFn: fetchWalletMeta,
    staleTime: 5 * 60_000,
  })
}
