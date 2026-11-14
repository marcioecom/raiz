import type { Reward } from "../../voucher"

import { Button } from "@/components/ui/button"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatSeeds } from "@/lib/format"

import { missingSeedsForReward } from "../../voucher"

export interface RewardCardProps {
  reward: Reward
  balance: number
  onSelect: (reward: Reward) => void
}

/** Card puro de benefício real do catálogo de prêmios. */
export function RewardCard({ reward, balance, onSelect }: RewardCardProps) {
  const cost = Math.max(0, Math.trunc(reward.cost ?? 0))
  const outOfStock = reward.stock === 0
  const canRedeem = Boolean(reward.affordable) && !outOfStock
  const missingSeeds = missingSeedsForReward(cost, balance)
  const stockLabel =
    reward.stock === null || reward.stock === undefined
      ? "Disponível sem limite"
      : `${reward.stock} restantes`

  return (
    <Card variant="surface" className="reward-subgrid-card flex h-full w-full flex-col p-4">
      <CardHeader className="min-w-0">
        <CardTitle className="min-w-0">{reward.title ?? "Benefício"}</CardTitle>
        {reward.store_name && (
          <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
            {reward.store_name}
          </p>
        )}
      </CardHeader>

      <div className="mt-3 flex min-w-0 flex-col gap-3 lg:mt-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] leading-[18px] tabular-nums">
          <span className="font-semibold text-gold-text">
            {formatSeeds(cost)} {cost === 1 ? "semente" : "sementes"}
          </span>
          <span aria-hidden="true" className="text-ink-muted">
            ·
          </span>
          <span className="font-medium text-ink-muted">{stockLabel}</span>
        </div>

        {reward.terms && (
          <p className="min-w-0 text-[13px] leading-[18px] text-ink-muted">{reward.terms}</p>
        )}
      </div>

      <CardFooter className="mt-4 w-full lg:mt-0 lg:self-end">
        {outOfStock ? (
          <Button variant="sand" size="lg" disabled>
            Sem estoque
          </Button>
        ) : canRedeem ? (
          <Button variant="primary" size="lg" onClick={() => onSelect(reward)}>
            <span>Resgatar</span>
            {reward.title && <span className="visually-hidden"> {reward.title}</span>}
          </Button>
        ) : (
          <Button variant="sand" size="lg" disabled>
            {missingSeeds > 0
              ? `Faltam ${formatSeeds(missingSeeds)} ${missingSeeds === 1 ? "semente" : "sementes"}`
              : "Saldo insuficiente"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
