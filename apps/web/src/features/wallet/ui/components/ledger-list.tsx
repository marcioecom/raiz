import type { components } from "@/api/schema"

import { Link } from "@tanstack/react-router"
import { ChevronDown, ReceiptText, ScanLine } from "lucide-react"
import { useId } from "react"

import { EmptyState } from "@/components/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { LedgerEntryRow } from "./ledger-entry-row"

type LedgerEntry = components["schemas"]["LedgerEntry"]

export interface LedgerListProps {
  entries: LedgerEntry[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  nextPageErrorMessage?: string | null
}

/** Lista semântica de lançamentos do livro-caixa com paginação por cursor. */
export function LedgerList({
  entries,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  nextPageErrorMessage = null,
}: LedgerListProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2
          id={headingId}
          className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
        >
          Extrato
        </h2>
        <span className="text-[13px] font-medium leading-[18px] text-ink-muted">
          Livro-caixa de sementes
        </span>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Nenhum lançamento ainda"
          description="Escaneie o QR Code ou digite os 44 dígitos do cupom fiscal para somar suas primeiras sementes."
          action={
            <Link to="/scan" className={buttonVariants({ variant: "primary" })}>
              <ScanLine aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Escanear cupom</span>
            </Link>
          }
        />
      ) : (
        <Card variant="surface" className="overflow-hidden p-0">
          <div
            aria-hidden="true"
            className="hidden xl:grid xl:grid-cols-[minmax(0,1fr)_136px_104px] xl:gap-3 xl:border-b xl:border-border xl:px-4 xl:py-2 xl:text-[11px] xl:font-semibold xl:uppercase xl:tracking-wider xl:text-ink-muted"
          >
            <span>Movimento</span>
            <span>Data</span>
            <span className="text-right">Sementes</span>
          </div>

          <ul
            role="list"
            aria-label="Lançamentos de sementes"
            className="list-none divide-y divide-border"
          >
            {entries.map((entry, index) => (
              <LedgerEntryRow
                key={
                  entry.id ??
                  `${entry.kind ?? "adjustment"}-${entry.created_at ?? "sem-data"}-${index}`
                }
                entry={entry}
              />
            ))}
          </ul>

          {hasNextPage && (
            <div className="border-t border-border bg-sand/50 p-3">
              {nextPageErrorMessage && (
                <p role="alert" className="mb-2 text-[13px] font-medium leading-[18px] text-error">
                  {nextPageErrorMessage}
                </p>
              )}
              <Button
                variant="secondary"
                className="min-h-11 w-full"
                loading={isFetchingNextPage}
                loadingText="Carregando..."
                onClick={onLoadMore}
              >
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Carregar mais</span>
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  )
}
