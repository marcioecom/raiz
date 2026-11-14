import type { components } from "@/api/schema"

import { Calendar } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatShortDateBR } from "@/lib/format"

type Season = components["schemas"]["Season"]

export interface SeasonBannerProps {
  season: Season
}

export function SeasonBanner({ season }: SeasonBannerProps) {
  const startLabel = season.starts_at ? formatShortDateBR(season.starts_at) : "--"
  const endLabel = season.ends_at ? formatShortDateBR(season.ends_at) : "--"

  return (
    <Card
      variant="sand"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-6 lg:py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 lg:order-2 lg:shrink-0 lg:flex-col lg:items-end lg:gap-2">
        <Badge variant="gold">Safra ativa</Badge>
        <p className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-ink-muted tabular-nums">
          <Calendar aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>
            {startLabel} – {endLabel}
          </span>
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-1 lg:order-1 lg:max-w-[65ch]">
        <h2 className="font-serif text-[22px] font-normal leading-7 text-ink lg:text-[26px] lg:leading-8">
          {season.name ?? "Safra em andamento"}
        </h2>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Ciclo de 8 semanas no Capim Dourado. Suas sementes registradas no extrato contam para as
          missões do período e para a classificação dos 10 primeiros.
        </p>
      </div>
    </Card>
  )
}
