import type { ProfileOverview } from "../../tier"

import { ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatSeeds, formatShortDateBR } from "@/lib/format"

export interface TierSummaryCardProps {
  overview: ProfileOverview
}

/** Exibe identidade mínima, nível atual/próximo nível, métricas do visitante e nota LGPD. */
export function TierSummaryCard({ overview }: TierSummaryCardProps) {
  const { tierSummary } = overview
  const badgeVariant = tierSummary.tier === "dourado" ? "goldSolid" : "gold"
  const streakUnit = overview.streakWeeks === 1 ? "semana" : "semanas"
  const receiptsUnit = overview.receiptsCount === 1 ? "cupom" : "cupons"
  const firstVisitLabel = overview.firstVisitAt
    ? formatShortDateBR(overview.firstVisitAt)
    : "Sem registro"

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
            {overview.visitorName}
          </h2>
          {overview.phoneMasked && (
            <p className="font-mono text-[13px] font-medium leading-[18px] text-ink-muted tabular-nums">
              {overview.phoneMasked}
            </p>
          )}
        </div>
        <Badge variant={badgeVariant}>Nível {tierSummary.tierLabel}</Badge>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Evolução de nível
          </span>
          <span className="text-[13px] font-semibold leading-[18px] text-ink tabular-nums">
            {tierSummary.progressLabel}
          </span>
        </div>

        <Progress
          value={tierSummary.progressStep}
          max={tierSummary.totalSteps}
          label={tierSummary.progressLabel}
          completed={tierSummary.isMaxTier}
        />

        <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
          Critério calculado sobre sementes acumuladas nos últimos 12 meses móveis.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-canvas px-3 py-2.5">
          <dt className="text-xs font-medium leading-4 text-ink-muted">Saldo atual</dt>
          <dd className="mt-0.5 text-[15px] font-bold leading-5 text-gold-text tabular-nums">
            {formatSeeds(overview.balance)} sementes
          </dd>
        </div>

        <div className="rounded-xl border border-border bg-canvas px-3 py-2.5">
          <dt className="text-xs font-medium leading-4 text-ink-muted">Ritmo atual</dt>
          <dd className="mt-0.5 text-[15px] font-bold leading-5 text-ink tabular-nums">
            {formatSeeds(overview.streakWeeks)} {streakUnit}
          </dd>
        </div>

        <div className="rounded-xl border border-border bg-canvas px-3 py-2.5">
          <dt className="text-xs font-medium leading-4 text-ink-muted">Cupons válidos</dt>
          <dd className="mt-0.5 text-[15px] font-bold leading-5 text-ink tabular-nums">
            {formatSeeds(overview.receiptsCount)} {receiptsUnit}
          </dd>
        </div>

        <div className="rounded-xl border border-border bg-canvas px-3 py-2.5">
          <dt className="text-xs font-medium leading-4 text-ink-muted">Primeira visita</dt>
          <dd className="mt-0.5 text-[15px] font-bold leading-5 text-ink tabular-nums">
            {firstVisitLabel}
          </dd>
        </div>
      </dl>

      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-sand p-3">
        <ShieldCheck
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-forest"
          strokeWidth={1.75}
        />
        <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
          Armazenamos apenas nome e telefone. Não coletamos CPF, e-mail ou localização.
        </p>
      </div>
    </Card>
  )
}
