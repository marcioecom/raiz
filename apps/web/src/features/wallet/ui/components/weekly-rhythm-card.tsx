import { CalendarCheck2, Check, Info } from "lucide-react"
import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

const RHYTHM_STEPS = [1, 2, 3, 4] as const

export interface WeeklyRhythmCardProps {
  streakWeeks: number
}

/** Exibe o avanço do ritmo semanal em 4 etapas sem punição em caso de pausa. */
export function WeeklyRhythmCard({ streakWeeks }: WeeklyRhythmCardProps) {
  const headingId = useId()
  const completedWeeks = Math.min(streakWeeks, 4)

  return (
    <section aria-labelledby={headingId}>
      <Card variant="sand" className="flex flex-col gap-3.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck2
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-forest"
              strokeWidth={1.75}
            />
            <h2 id={headingId} className="text-base font-semibold leading-6 text-ink">
              Ritmo semanal
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink tabular-nums">
              {completedWeeks}/4
            </span>
            <Badge variant="gold" className="shrink-0 tabular-nums">
              +200 sementes
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
            Sequência atual:{" "}
            <strong className="font-semibold text-ink tabular-nums">
              {formatSeeds(streakWeeks)}
            </strong>{" "}
            {streakWeeks === 1 ? "semana seguida" : "semanas seguidas"}
          </p>
          <Progress
            value={completedWeeks}
            max={4}
            label={`Ritmo semanal: ${completedWeeks} de 4 semanas seguidas`}
            completed={completedWeeks >= 4}
          />
        </div>

        <ol
          role="list"
          aria-label="Etapas do ritmo semanal"
          className="grid list-none grid-cols-4 gap-2"
        >
          {RHYTHM_STEPS.map((step) => {
            const isDone = step <= completedWeeks
            const isCurrentTarget = !isDone && step === completedWeeks + 1
            return (
              <li key={step} className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={cn(
                    "flex min-h-10 w-full items-center justify-center rounded-lg text-[13px] font-bold tabular-nums",
                    isDone && "bg-forest text-on-forest",
                    isCurrentTarget && "border-2 border-dashed border-forest bg-card text-forest",
                    !isDone && !isCurrentTarget && "border border-border bg-canvas text-ink-muted",
                  )}
                >
                  {isDone ? (
                    <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
                  ) : (
                    `${step}ª`
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs leading-4",
                    isCurrentTarget ? "font-semibold text-forest" : "font-medium text-ink-muted",
                  )}
                >
                  {isCurrentTarget ? "Meta atual" : `Semana ${step}`}
                </span>
                <span className="visually-hidden">
                  {isDone ? "concluída" : isCurrentTarget ? "meta atual" : "pendente"}
                </span>
              </li>
            )
          })}
        </ol>

        <p className="flex items-start gap-2 border-t border-border pt-3 text-[13px] leading-[18px] text-ink-muted text-pretty">
          <Info
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
            strokeWidth={1.75}
          />
          <span>
            4 semanas seguidas com cupom liberam +200 sementes. Quebrar o ritmo apenas reinicia o
            contador — suas sementes continuam intactas.
          </span>
        </p>
      </Card>
    </section>
  )
}
