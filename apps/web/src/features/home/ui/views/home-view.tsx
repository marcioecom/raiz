import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { RaizLogo } from "@/components/raiz-logo"
import { Button } from "@/components/ui/button"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

import { useHomeQuery } from "../../hooks/use-home"
import { BalanceHeroCard } from "../components/balance-hero-card"
import { NextStepCard } from "../components/next-step-card"
import { TodayFeed } from "../components/today-feed"

function HomeHeader({ demo }: { demo: boolean }) {
  return (
    <header className="flex min-h-11 flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <RaizLogo />
        {demo && <DemoBadge />}
      </div>
    </header>
  )
}

function HomeSkeleton() {
  return (
    <SkeletonGroup label="Carregando painel inicial" className="gap-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

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
        <HomeHeader demo={false} />
        <HomeSkeleton />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <HomeHeader demo={false} />
        <h1 className="text-2xl font-bold leading-[1.875rem] tracking-[-0.015em] text-ink">
          Hoje no Capim
        </h1>
        <ErrorState
          message={messageFor(error)}
          onRetry={() => {
            void refetch()
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <HomeHeader demo={Boolean(data.demo)} />

      {isError && (
        <CachedErrorBanner
          message={messageFor(error)}
          isFetching={isFetching}
          onRetry={() => {
            void refetch()
          }}
        />
      )}

      <BalanceHeroCard
        greetingName={data.greeting_name}
        balance={data.balance}
        tier={data.tier}
        streakWeeks={data.streak_weeks}
        closestReward={data.closest_reward}
      />

      {data.next_step && <NextStepCard nextStep={data.next_step} />}

      <TodayFeed events={data.today?.events ?? []} offers={data.today?.offers ?? []} />
    </div>
  )
}
