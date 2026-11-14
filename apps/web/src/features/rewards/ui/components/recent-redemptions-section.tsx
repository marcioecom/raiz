import type { ServerRedemption } from "../../types"

import { Link } from "@tanstack/react-router"
import { ArrowRight, CheckCircle2, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTimeBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { formatCountdownMMSS, getRemainingSeconds, resolveVoucherStatus } from "../../voucher"

export interface RecentRedemptionsSectionProps {
  items: readonly ServerRedemption[]
  nowMs: number
}

/** Lista enxuta dos vouchers recentes retornados por `GET /v1/me/redemptions`. */
export function RecentRedemptionsSection({ items, nowMs }: RecentRedemptionsSectionProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="recent-redemptions-title" className="flex flex-col gap-3">
      <h2
        id="recent-redemptions-title"
        className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
      >
        Seus vouchers recentes
      </h2>

      <ul role="list" className="flex list-none flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
        {items.map((item, index) => {
          const status = resolveVoucherStatus(item, nowMs)
          const title = item.reward?.title ?? "Benefício"
          const rewardId = item.reward?.id
          const remaining =
            status === "pending" && item.expires_at
              ? formatCountdownMMSS(getRemainingSeconds(item.expires_at, nowMs))
              : null

          return (
            <li key={item.id ?? `${item.code ?? "voucher"}-${index}`} className="min-w-0">
              <Card
                variant="surface"
                className="flex h-full flex-wrap items-center justify-between gap-3 p-3.5"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 text-sm font-semibold leading-5 text-ink">{title}</p>
                    {status === "pending" && (
                      <Badge variant="success" className="tabular-nums">
                        <Clock aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
                        <span>Ativo · {remaining}</span>
                      </Badge>
                    )}
                    {status === "used" && (
                      <Badge variant="gold">
                        <CheckCircle2 aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
                        <span>Utilizado</span>
                      </Badge>
                    )}
                    {status === "expired" && (
                      <Badge variant="error">
                        <Clock aria-hidden="true" className="h-3 w-3" strokeWidth={1.75} />
                        <span>Expirado</span>
                      </Badge>
                    )}
                  </div>

                  <p className="text-[13px] font-medium leading-[18px] text-ink-muted tabular-nums">
                    {item.code && (
                      <span className="font-mono font-semibold text-ink">{item.code}</span>
                    )}
                    {item.reward?.store_name && ` · ${item.reward.store_name}`}
                    {status === "used" && item.used_at && ` · ${formatDateTimeBR(item.used_at)}`}
                    {status === "expired" &&
                      item.expires_at &&
                      ` · ${formatDateTimeBR(item.expires_at)}`}
                  </p>
                </div>

                {rewardId && (
                  <Link
                    to="/premios/$rewardId"
                    params={{ rewardId }}
                    className={cn(
                      buttonVariants({
                        variant: status === "pending" ? "primary" : "secondary",
                        size: "sm",
                      }),
                      "shrink-0",
                    )}
                  >
                    <span>Abrir</span>
                    <span className="visually-hidden"> voucher {title}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                      strokeWidth={1.75}
                    />
                  </Link>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
