import type { components } from "@/api/schema"

import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatSeeds, formatShortDateBR } from "@/lib/format"

type MissionProgress = components["schemas"]["MissionProgress"]
type RuleType = NonNullable<MissionProgress["rule_type"]>

const RULE_CONTEXT_LABELS: Record<RuleType, string> = {
  stores: "Lojas diferentes em 7 dias",
  category: "Categorias na mesma semana",
  rhythm: "Semanas seguidas com cupom",
  first_receipt: "Primeiro cupom validado",
  referral: "Indicação validada",
}

export interface MissionCardProps {
  mission: MissionProgress
}

export function MissionCard({ mission }: MissionCardProps) {
  const title = mission.title ?? "Missão da safra"
  const progress = Math.max(mission.progress ?? 0, 0)
  const target = Math.max(mission.target ?? 0, 0)
  const rewardPoints = mission.reward_points ?? 0
  const isCompleted = Boolean(mission.completed_at)

  if (isCompleted) {
    const formattedDate = mission.completed_at ? formatShortDateBR(mission.completed_at) : "--"
    const completedLabel = formattedDate !== "--" ? `Concluída em ${formattedDate}` : "Concluída"

    return (
      <Card variant="sand" className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <Check className="h-4 w-4" strokeWidth={2.25} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-ink">{title}</h3>
            <Badge variant="gold" className="shrink-0 tabular-nums">
              +{formatSeeds(rewardPoints)} sementes
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium leading-[18px] text-success tabular-nums">
              {completedLabel}
            </span>
            {target > 0 && (
              <span className="text-[13px] font-medium leading-[18px] text-ink-muted tabular-nums">
                {progress}/{target}
              </span>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const ruleLabel = mission.rule_type ? RULE_CONTEXT_LABELS[mission.rule_type] : "Progresso"

  return (
    <Card variant="surface" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug text-ink">{title}</h3>
        <Badge variant="gold" className="shrink-0 tabular-nums">
          +{formatSeeds(rewardPoints)} sementes
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium leading-[18px] text-ink-muted">{ruleLabel}</span>
          <span className="text-[15px] font-semibold leading-5 text-ink tabular-nums">
            {progress}/{target}
          </span>
        </div>

        <Progress
          value={progress}
          max={target > 0 ? target : 1}
          label={`Progresso de ${title}: ${progress} de ${target}`}
        />
      </div>
    </Card>
  )
}
