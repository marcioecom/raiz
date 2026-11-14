import { Link } from "@tanstack/react-router"
import { ArrowRight, Clock, Gift, WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { RaizLogo } from "@/components/raiz-logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useRewardsCatalog } from "../../hooks/use-rewards"
import { formatCountdownMMSS } from "../../voucher"
import { RedeemConfirmDialog } from "../components/redeem-confirm-dialog"
import { RewardCard } from "../components/reward-card"

function RewardsSkeleton() {
  return (
    <SkeletonGroup label="Carregando catálogo de prêmios" className="gap-3.5">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

/** Tela 6A: Catálogo de prêmios reais resgatáveis na mesma visita. */
export function RewardsView() {
  const {
    rewardsQuery,
    isDemoMode,
    redeemMutation,
    selectedReward,
    openConfirm,
    handleDialogOpenChange,
    activeBannerVoucher,
    activeBannerRemainingSeconds,
  } = useRewardsCatalog()

  const { data, isPending, isError, error, refetch, isFetching } = rewardsQuery
  const balance = Math.max(0, Math.trunc(data?.balance ?? 0))
  const rewards = data?.rewards ?? []

  return (
    <div className="flex flex-col gap-5 pb-2">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-border/70 pb-3">
        <RaizLogo />
        <div className="flex items-center gap-2">
          {isDemoMode && <DemoBadge />}
          {isPending ? (
            <Skeleton className="h-7 w-28 rounded-full" />
          ) : (
            data && (
              <div className="inline-flex items-center rounded-full border border-border bg-gold-soft px-3 py-1">
                <span className="text-xs font-semibold leading-4 tabular-nums text-gold-text">
                  {formatSeeds(balance)} {balance === 1 ? "semente" : "sementes"}
                </span>
              </div>
            )
          )}
        </div>
      </header>

      {activeBannerVoucher?.reward?.id && (
        <Card
          variant="surface"
          className="flex flex-wrap items-center justify-between gap-3 border-success/40 bg-success-soft p-3.5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Clock
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              strokeWidth={1.75}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-semibold leading-5 text-ink">
                Você tem um voucher ativo no balcão
              </p>
              <p className="text-[13px] font-medium leading-[18px] tabular-nums text-success">
                {activeBannerVoucher.reward.title ?? "Benefício"} ·{" "}
                {formatCountdownMMSS(activeBannerRemainingSeconds)} restantes
              </p>
            </div>
          </div>

          <Link
            to="/premios/$rewardId"
            params={{ rewardId: activeBannerVoucher.reward.id }}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0")}
          >
            <span>Abrir voucher</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          </Link>
        </Card>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">Prêmios</h1>
        <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
          Benefícios reais resgatáveis na mesma visita. Sem sorteio.
        </p>
      </div>

      {isError && data && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5 text-[13px] leading-[18px] text-warning"
        >
          <p className="flex min-w-0 flex-1 items-start gap-2 font-medium">
            <WifiOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Sem conexão. Mostrando o que já foi salvo.</span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={isFetching}
            loadingText="Tentando..."
            onClick={() => void refetch()}
          >
            Tentar de novo
          </Button>
        </div>
      )}

      {isPending ? (
        <RewardsSkeleton />
      ) : isError && !data ? (
        <ErrorState message={messageFor(error)} onRetry={() => void refetch()} />
      ) : rewards.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhum prêmio disponível no momento"
          description="Novos benefícios do Capim Dourado Shopping aparecem aqui em breve. Continue escaneando seus cupons."
        />
      ) : (
        <ul role="list" className="flex list-none flex-col gap-3.5">
          {rewards.map((reward, index) => (
            <li key={reward.id ?? `${reward.title ?? "reward"}-${index}`}>
              <RewardCard reward={reward} balance={balance} onSelect={openConfirm} />
            </li>
          ))}
        </ul>
      )}

      <footer className="pt-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          RAIZ · CAPIM DOURADO SHOPPING
        </p>
      </footer>

      <RedeemConfirmDialog
        reward={selectedReward}
        balance={balance}
        isPending={redeemMutation.isPending}
        errorMessage={redeemMutation.errorMessage}
        onOpenChange={handleDialogOpenChange}
        onConfirm={(reward) => redeemMutation.mutate(reward)}
      />
    </div>
  )
}
