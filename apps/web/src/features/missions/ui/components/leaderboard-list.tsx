import type { paths } from "@/api/schema"

import { ListOrdered } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

type LeaderboardPayload =
  paths["/v1/leaderboard"]["get"]["responses"]["200"]["content"]["application/json"]
type LeaderboardEntry = NonNullable<LeaderboardPayload["entries"]>[number]
type LeaderboardMe = NonNullable<LeaderboardPayload["me"]>

export interface LeaderboardListProps {
  entries: LeaderboardEntry[]
  me?: LeaderboardMe | null
}

export function LeaderboardList({ entries, me = null }: LeaderboardListProps) {
  const isMeVisible = entries.some((entry) => entry.is_me === true)
  const showOutsideSummary = Boolean(me && !isMeVisible)

  if (entries.length === 0 && !showOutsideSummary) {
    return (
      <div className="flex flex-col gap-2">
        <EmptyState
          icon={ListOrdered}
          title="Classificação sem registros ainda"
          description="Envie seu primeiro cupom fiscal desta safra para abrir o ranking."
        />
        <p className="text-center text-[13px] leading-[18px] text-ink-muted">
          Ranking calculado direto do extrato da safra.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Card variant="surface" className="overflow-hidden p-0">
        {entries.length > 0 && (
          <ol role="list" className="list-none divide-y divide-border">
            {entries.map((entry, index) => {
              const position = entry.position ?? index + 1
              const points = entry.points ?? 0
              const isMe = entry.is_me === true

              return (
                <li
                  key={`${position}-${entry.display_name ?? "visitor"}`}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3",
                    isMe ? "bg-gold-soft" : "bg-card",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "w-8 shrink-0 font-mono text-sm font-bold tabular-nums",
                        position <= 3 || isMe ? "text-gold-text" : "text-ink-muted",
                      )}
                    >
                      #{position}
                    </span>
                    <span className="truncate text-[15px] font-medium leading-[22px] text-ink">
                      {entry.display_name ?? "Visitante"}
                    </span>
                    {isMe && (
                      <Badge variant="gold" className="shrink-0 bg-card text-gold-text">
                        Você
                      </Badge>
                    )}
                  </div>

                  <span className="shrink-0 font-mono text-sm font-medium text-ink tabular-nums">
                    {formatSeeds(points)} sementes
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {showOutsideSummary && me && (
          <div className={cn("p-3", entries.length > 0 && "border-t border-border bg-canvas")}>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-gold-soft px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 font-mono text-sm font-bold text-gold-text tabular-nums">
                  #{me.position ?? "--"}
                </span>
                <Badge variant="gold" className="shrink-0 bg-card text-gold-text">
                  Você
                </Badge>
                <span className="truncate text-[13px] font-medium leading-[18px] text-ink-muted">
                  Sua posição atual
                </span>
              </div>
              <span className="shrink-0 font-mono text-sm font-bold text-ink tabular-nums">
                {formatSeeds(me.points ?? 0)} sementes
              </span>
            </div>
          </div>
        )}
      </Card>

      <p className="text-center text-[13px] leading-[18px] text-ink-muted">
        Ranking calculado direto do extrato da safra.
      </p>
    </div>
  )
}
