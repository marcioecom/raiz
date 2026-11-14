import type { components } from "@/api/schema"
import type { LucideIcon } from "lucide-react"

import {
  CalendarCheck2,
  Gift,
  ListChecks,
  ReceiptText,
  Share2,
  SlidersHorizontal,
} from "lucide-react"

import { formatDateTimeBR, formatDelta } from "@/lib/format"
import { cn } from "@/lib/utils"

type LedgerEntry = components["schemas"]["LedgerEntry"]
type LedgerKind = NonNullable<LedgerEntry["kind"]>

export interface LedgerEntryRowProps {
  entry: LedgerEntry
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

/** Linha individual do extrato com layout compacto no celular e colunas em desktop. */
export function LedgerEntryRow({ entry }: LedgerEntryRowProps) {
  const kind: LedgerKind = entry.kind ?? "adjustment"
  const Icon = KIND_ICONS[kind] ?? SlidersHorizontal
  const delta = toSafeDelta(entry.delta)
  const isPositive = delta > 0
  const description = entry.description?.trim() || KIND_FALLBACK_DESCRIPTIONS[kind] || "Lançamento"
  const storeName = entry.store_name?.trim() || null
  const createdAt = entry.created_at
  const formattedDate = createdAt ? formatDateTimeBR(createdAt) : "--"

  const dateNode = createdAt ? (
    <time dateTime={createdAt} className="tabular-nums">
      {formattedDate}
    </time>
  ) : (
    <span className="tabular-nums">{formattedDate}</span>
  )

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-canvas/70 xl:grid xl:grid-cols-[minmax(0,1fr)_136px_104px] xl:items-center xl:gap-3 xl:px-4">
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
          <p
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-medium leading-[18px] text-ink-muted",
              !storeName && "xl:hidden",
            )}
          >
            {storeName && (
              <>
                <span className="truncate">{storeName}</span>
                <span aria-hidden="true" className="xl:hidden">
                  ·
                </span>
              </>
            )}
            <span className="xl:hidden">{dateNode}</span>
          </p>
        </div>
      </div>

      <div className="hidden text-[13px] font-medium leading-[18px] text-ink-muted tabular-nums xl:block">
        {dateNode}
      </div>

      <div className="shrink-0 text-right tabular-nums">
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
}
