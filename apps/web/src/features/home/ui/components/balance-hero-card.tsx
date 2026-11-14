import type { components } from "@/api/schema"

import { Link } from "@tanstack/react-router"
import { ArrowRight, CalendarCheck2, Gift, ScanLine } from "lucide-react"
import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatSeeds, formatTierLabel } from "@/lib/format"

type HomeSchema = components["schemas"]["Home"]

export interface BalanceHeroCardProps {
  balance?: HomeSchema["balance"]
  tier?: HomeSchema["tier"]
  streakWeeks?: HomeSchema["streak_weeks"]
  closestReward?: HomeSchema["closest_reward"]
}

export function BalanceHeroCard({
  balance = 0,
  tier = "semente",
  streakWeeks = 0,
  closestReward,
}: BalanceHeroCardProps) {
  const headingId = useId()
  const safeBalance = Math.max(0, Math.trunc(balance))
  const safeStreak = Math.max(0, Math.trunc(streakWeeks))

  const hasClosestReward = Boolean(closestReward?.title && typeof closestReward.cost === "number")
  const rewardCost = hasClosestReward ? Math.max(0, Math.trunc(closestReward?.cost ?? 0)) : 0
  const rewardMissing =
    hasClosestReward && typeof closestReward?.missing === "number"
      ? Math.max(0, Math.trunc(closestReward.missing))
      : Math.max(0, rewardCost - safeBalance)

  return (
    <section
      aria-labelledby={headingId}
      className="flex h-full w-full flex-col justify-between gap-3"
    >
      <Card variant="hero" className="flex flex-1 flex-col justify-between p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id={headingId}
              className="text-xs font-semibold uppercase tracking-[0.06em] text-on-forest/80"
            >
              Saldo de sementes
            </h2>
            <Badge variant="gold">{formatTierLabel(tier)}</Badge>
          </div>

          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[2rem] font-bold leading-9 tracking-[-0.02em] tabular-nums text-on-forest">
              {formatSeeds(safeBalance)}
            </span>
            <span className="text-[0.9375rem] font-medium text-on-forest/85">
              {safeBalance === 1 ? "semente" : "sementes"}
            </span>
          </p>
        </div>

        <div className="min-w-0">
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-on-forest/15 pt-3">
            <p className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-on-forest/90">
              <CalendarCheck2
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.75}
              />
              <span>
                Ritmo:{" "}
                <strong className="font-semibold tabular-nums text-on-forest">
                  {formatSeeds(safeStreak)}
                </strong>{" "}
                {safeStreak === 1 ? "semana seguida" : "semanas seguidas"}
              </span>
            </p>

            <Link
              to="/carteira"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gold underline-offset-4 hover:underline"
            >
              <span>Ver carteira</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            </Link>
          </div>

          {hasClosestReward && closestReward?.title && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-on-forest/15 pt-3">
              <p className="flex min-w-0 flex-1 items-start gap-2 text-[0.8125rem] leading-[1.125rem] text-on-forest/90">
                <Gift
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                  strokeWidth={1.75}
                />
                <span className="min-w-0">
                  {rewardMissing > 0 ? (
                    <>
                      Faltam{" "}
                      <strong className="font-semibold tabular-nums text-on-forest">
                        {formatSeeds(rewardMissing)}
                      </strong>{" "}
                      {rewardMissing === 1 ? "semente" : "sementes"} para{" "}
                      <strong className="font-semibold text-on-forest">
                        {closestReward.title}
                      </strong>{" "}
                      <span className="tabular-nums text-on-forest/80">
                        ({formatSeeds(rewardCost)})
                      </span>
                    </>
                  ) : (
                    <>
                      Você já pode resgatar{" "}
                      <strong className="font-semibold text-on-forest">
                        {closestReward.title}
                      </strong>{" "}
                      <span className="tabular-nums text-on-forest/80">
                        ({formatSeeds(rewardCost)} sementes)
                      </span>
                    </>
                  )}
                </span>
              </p>

              <Link
                to="/premios"
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gold underline-offset-4 hover:underline"
              >
                <span>Ver prêmios</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              </Link>
            </div>
          )}
        </div>
      </Card>

      <Link to="/scan" className={buttonVariants({ variant: "primary", size: "lg" })}>
        <ScanLine aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span>Escanear cupom</span>
      </Link>
    </section>
  )
}
