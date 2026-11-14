import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { MobileBrandHeader } from "@/components/mobile-brand-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useHomeQuery } from "../../hooks/use-home"
import { BalanceHeroCard } from "../components/balance-hero-card"
import { HomeSkeleton } from "../components/home-skeleton"
import { NextStepCard } from "../components/next-step-card"
import { TodayFeed } from "../components/today-feed"

function CachedErrorBanner({
  message,
  isFetching,
  onRetry,
}: {
  message: string
  isFetching: boolean
  onRetry: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5 text-[0.8125rem] leading-[1.125rem] text-warning"
    >
      <p className="flex min-w-0 flex-1 items-start gap-2">
        <WifiOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>{message} Mostrando os últimos dados salvos.</span>
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        loading={isFetching}
        loadingText="Tentando..."
      >
        Tentar de novo
      </Button>
    </div>
  )
}

export function HomeView() {
  const { data, isPending, isError, error, refetch, isFetching } = useHomeQuery()

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <MobileBrandHeader demo={false} className="min-h-11" />
        <h1 className="visually-hidden">Painel inicial do Raiz</h1>
        <HomeSkeleton />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <MobileBrandHeader demo={false} className="min-h-11" />
        <header className="lg:border-b lg:border-border/70 lg:pb-4">
          <h1 className="text-2xl font-bold leading-[1.875rem] tracking-[-0.015em] text-ink">
            Hoje no Capim
          </h1>
        </header>
        <ErrorState
          message={messageFor(error)}
          onRetry={() => {
            void refetch()
          }}
        />
      </div>
    )
  }

  const normalizedName = data.greeting_name?.trim()
  const greetingText = normalizedName ? `Olá, ${normalizedName}` : "Olá"

  return (
    <div className="flex flex-col gap-4">
      <MobileBrandHeader demo={Boolean(data.demo)} className="min-h-11" />

      <div className="flex flex-col gap-3 lg:gap-6">
        <header className="flex flex-col gap-0.5 lg:flex-row lg:items-end lg:justify-between lg:border-b lg:border-border/70 lg:pb-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl font-bold leading-[1.875rem] tracking-[-0.015em] text-ink">
              {greetingText}
            </h1>
            <p className="hidden text-[13px] font-medium leading-[18px] text-ink-muted lg:block">
              Hoje no Capim Dourado Shopping
            </p>
          </div>
          {data.demo && (
            <div className="hidden lg:block">
              <DemoBadge />
            </div>
          )}
        </header>

        {isError && (
          <CachedErrorBanner
            message={messageFor(error)}
            isFetching={isFetching}
            onRetry={() => {
              void refetch()
            }}
          />
        )}

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
          <div className={cn("min-w-0", data.next_step ? "lg:col-span-7" : "lg:col-span-12")}>
            <BalanceHeroCard
              balance={data.balance}
              tier={data.tier}
              streakWeeks={data.streak_weeks}
              closestReward={data.closest_reward}
            />
          </div>

          {data.next_step && (
            <div className="min-w-0 lg:col-span-5">
              <NextStepCard nextStep={data.next_step} />
            </div>
          )}

          <div className="min-w-0 lg:col-span-12">
            <TodayFeed events={data.today?.events ?? []} offers={data.today?.offers ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
