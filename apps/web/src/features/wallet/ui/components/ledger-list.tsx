import type { components } from "@/api/schema"
import type { LucideIcon } from "lucide-react"

import { Link } from "@tanstack/react-router"
import {
  CalendarCheck2,
  ChevronDown,
  Gift,
  ListChecks,
  ReceiptText,
  ScanLine,
  Share2,
  SlidersHorizontal,
} from "lucide-react"
import { useId } from "react"

import { EmptyState } from "@/components/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTimeBR, formatDelta } from "@/lib/format"
import { cn } from "@/lib/utils"

type LedgerEntry = components["schemas"]["LedgerEntry"]
type LedgerKind = NonNullable<LedgerEntry["kind"]>

export interface LedgerListProps {
  entries: LedgerEntry[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  nextPageErrorMessage?: string | null
}

const KIND_ICONS: Record<LedgerKind, LucideIcon> = {
  receipt: ReceiptText,
  mission: ListChecks,
  rhythm: CalendarCheck2,
  referral: Share2,
  redeem: Gift,
  adjustment: SlidersHorizontal,
}

const KIND_FALLBACK_DESCRIPTIONS: Record<LedgerKind, string> = {
  receipt: "Cupom registrado",
  mission: "Missão concluída",
  rhythm: "Bônus de ritmo semanal",
  referral: "Indicação validada",
  redeem: "Resgate de prêmio",
  adjustment: "Ajuste de sementes",
}

function toSafeDelta(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.trunc(value)
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
          <ul
            role="list"
            aria-label="Lançamentos de sementes"
            className="list-none divide-y divide-border"
          >
            {entries.map((entry, index) => {
              const kind: LedgerKind = entry.kind ?? "adjustment"
              const Icon = KIND_ICONS[kind] ?? SlidersHorizontal
              const delta = toSafeDelta(entry.delta)
              const isPositive = delta > 0
              const description =
                entry.description?.trim() || KIND_FALLBACK_DESCRIPTIONS[kind] || "Lançamento"
              const storeName = entry.store_name?.trim() || null
              const createdAt = entry.created_at
              const formattedDate = createdAt ? formatDateTimeBR(createdAt) : "--"

              return (
                <li
                  key={entry.id ?? `${kind}-${createdAt ?? "sem-data"}-${index}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                        isPositive
                          ? "border-success/25 bg-success-soft text-success"
                          : "border-border bg-sand text-ink",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold leading-5 text-ink">{description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-medium leading-[18px] text-ink-muted">
                        {storeName && (
                          <>
                            <span className="truncate">{storeName}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        {createdAt ? (
                          <time dateTime={createdAt} className="tabular-nums">
                            {formattedDate}
                          </time>
                        ) : (
                          <span className="tabular-nums">{formattedDate}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        "font-mono text-[15px] font-bold leading-5 tabular-nums",
                        isPositive ? "text-success" : "text-ink",
                      )}
                    >
                      {formatDelta(delta)}
                    </span>
                    <span className="block text-xs font-medium leading-4 text-ink-muted">
                      {Math.abs(delta) === 1 ? "semente" : "sementes"}
                    </span>
                  </div>
                </li>
              )
            })}
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
