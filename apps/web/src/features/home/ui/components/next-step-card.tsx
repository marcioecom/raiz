import type { components } from "@/api/schema"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

type HomeNextStep = NonNullable<components["schemas"]["Home"]["next_step"]>
type NextStepKind = NonNullable<HomeNextStep["kind"]>
type SafeHomeRoute = "/scan" | "/missoes" | "/premios" | "/carteira"

const KIND_LABELS: Record<NextStepKind, string> = {
  mission: "Missão",
  reward: "Prêmio",
  event: "Evento",
}

const KNOWN_ROUTES: readonly SafeHomeRoute[] = ["/scan", "/missoes", "/premios", "/carteira"]

const CTA_LABELS: Record<SafeHomeRoute, string> = {
  "/scan": "Escanear cupom",
  "/missoes": "Ver missões",
  "/premios": "Ver prêmios",
  "/carteira": "Ver carteira",
}

function resolveNextStepRoute(href?: string): SafeHomeRoute {
  if (!href || !href.startsWith("/")) {
    return "/missoes"
  }
  const pathname = href.split(/[?#]/)[0]?.replace(/\/+$/, "") ?? ""
  const matched = KNOWN_ROUTES.find((route) => pathname === route)
  return matched ?? "/missoes"
}

export interface NextStepCardProps {
  nextStep: HomeNextStep
}

export function NextStepCard({ nextStep }: NextStepCardProps) {
  const headingId = useId()
  const kindLabel = nextStep.kind ? KIND_LABELS[nextStep.kind] : undefined
  const safeRoute = resolveNextStepRoute(nextStep.href)
  const ctaLabel = CTA_LABELS[safeRoute]

  const hasProgress =
    typeof nextStep.target === "number" &&
    nextStep.target > 0 &&
    typeof nextStep.progress === "number"
  const progress = hasProgress ? Math.max(0, Math.trunc(nextStep.progress ?? 0)) : 0
  const target = hasProgress ? Math.max(1, Math.trunc(nextStep.target ?? 1)) : 0
  const hasRewardPoints = typeof nextStep.reward_points === "number" && nextStep.reward_points > 0

  return (
    <section aria-labelledby={headingId}>
      <article>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={headingId}
                className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
              >
                Próximo passo
              </h2>
              {kindLabel && <Badge variant="neutral">{kindLabel}</Badge>}
            </div>

            {hasRewardPoints && nextStep.reward_points && (
              <Badge variant="gold" className="tabular-nums">
                +{formatSeeds(nextStep.reward_points)} sementes
              </Badge>
            )}
          </div>

          {(nextStep.title || hasProgress) && (
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              {nextStep.title && (
                <h3 className="text-[1.0625rem] font-semibold leading-6 tracking-[-0.01em] text-ink">
                  {nextStep.title}
                </h3>
              )}
              {hasProgress && (
                <span className="shrink-0 text-base font-bold tabular-nums text-gold-text">
                  {formatSeeds(progress)}/{formatSeeds(target)}
                </span>
              )}
            </div>
          )}

          {hasProgress && (
            <Progress
              className="mt-3"
              value={progress}
              max={target}
              label={nextStep.title ?? "Progresso do próximo passo"}
              completed={progress >= target}
            />
          )}

          {nextStep.subtitle && (
            <p className="mt-2.5 text-sm leading-5 text-ink-muted">{nextStep.subtitle}</p>
          )}

          <Link
            to={safeRoute}
            className={cn(buttonVariants({ variant: "sand", size: "lg" }), "mt-4 justify-between")}
          >
            <span>{ctaLabel}</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          </Link>
        </Card>
      </article>
    </section>
  )
}
