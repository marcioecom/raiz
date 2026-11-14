import type { components } from "@/api/schema"
import type { VisitorTier } from "@/lib/format"

import { Link } from "@tanstack/react-router"
import { Gift, ReceiptText, ScanLine } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatSeeds, formatTierLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

import { WeeklyRhythmCard } from "./weekly-rhythm-card"

type MeSchema = components["schemas"]["Me"]

export interface WalletHeroCardProps {
  balance?: MeSchema["balance"]
  tier?: MeSchema["tier"]
  nextTierAt?: MeSchema["next_tier_at"]
  streakWeeks?: MeSchema["streak_weeks"]
  receiptsCount?: MeSchema["receipts_count"]
}

function toSafeCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function normalizeTier(tier: MeSchema["tier"]): VisitorTier {
  return tier === "raiz" || tier === "dourado" ? tier : "semente"
}

/** Exibe card herói de saldo/nível/atalhos e bloco de ritmo semanal em 4 etapas. */
export function WalletHeroCard({
  balance,
  tier,
  nextTierAt,
  streakWeeks,
  receiptsCount,
}: WalletHeroCardProps) {
  const safeBalance = toSafeCount(balance)
  const safeTier = normalizeTier(tier)
  const safeStreak = toSafeCount(streakWeeks)
  const safeReceipts = toSafeCount(receiptsCount)
  const hasNextTier = typeof nextTierAt === "number" && Number.isFinite(nextTierAt)

  return (
    <div className="flex flex-col gap-4">
      <Card variant="hero" className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.06em] text-on-forest/80">
              Saldo disponível
            </span>
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[2rem] font-bold leading-9 tracking-[-0.02em] text-on-forest tabular-nums">
                {formatSeeds(safeBalance)}
              </span>
              <span className="text-[15px] font-medium leading-[22px] text-on-forest/90">
                {safeBalance === 1 ? "semente" : "sementes"}
              </span>
            </p>
          </div>

          <Badge variant="goldSolid" className="shrink-0">
            Nível {formatTierLabel(safeTier)}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-on-forest/15 pt-3.5 text-[13px] font-medium leading-[18px] text-on-forest/90">
          <p className="flex items-center gap-2">
            <ReceiptText
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-gold"
              strokeWidth={1.75}
            />
            <span>
              Total de cupons:{" "}
              <strong className="font-semibold text-on-forest tabular-nums">
                {formatSeeds(safeReceipts)}
              </strong>{" "}
              {safeReceipts === 1 ? "cupom registrado" : "cupons registrados"}
            </span>
          </p>

          <p className="text-on-forest/80">
            {hasNextTier ? (
              <>
                Próximo nível em{" "}
                <strong className="font-semibold text-on-forest tabular-nums">
                  {formatSeeds(toSafeCount(nextTierAt))}{" "}
                  {toSafeCount(nextTierAt) === 1 ? "semente" : "sementes"}
                </strong>{" "}
                no ciclo de 12 meses.
              </>
            ) : (
              "Nível máximo alcançado no ciclo de 12 meses."
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-0.5">
          <Link
            to="/premios"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "min-h-11 flex-1 basis-[9.5rem] border-canvas bg-canvas text-forest hover:bg-sand active:bg-sand",
            )}
          >
            <Gift aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Ver prêmios</span>
          </Link>
          <Link
            to="/scan"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "min-h-11 flex-1 basis-[9.5rem] border-gold bg-gold text-ink hover:bg-gold-soft active:bg-gold-soft",
            )}
          >
            <ScanLine aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Escanear cupom</span>
          </Link>
        </div>
      </Card>

      <WeeklyRhythmCard streakWeeks={safeStreak} />
    </div>
  )
}
