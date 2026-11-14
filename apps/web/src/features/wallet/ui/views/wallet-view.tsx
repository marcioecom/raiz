import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { RaizLogo } from "@/components/raiz-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

import {
  useLedgerInfiniteQuery,
  useWalletMeQuery,
  useWalletMetaQuery,
} from "../../hooks/use-wallet"
import { LedgerList } from "../components/ledger-list"
import { WalletHeroCard } from "../components/wallet-hero-card"

function WalletHeader({ demo }: { demo: boolean }) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-2">
      <RaizLogo />
      {demo && <DemoBadge />}
    </header>
  )
}

function WalletHeroSkeleton() {
  return (
    <SkeletonGroup label="Carregando saldo e ritmo" className="gap-4">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

function LedgerSkeleton() {
  return (
    <SkeletonGroup label="Carregando extrato de sementes" className="gap-2.5">
      <Skeleton className="h-4 w-36 rounded-md" />
      <Card variant="surface" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    </SkeletonGroup>
  )
}

function WalletSkeleton() {
  return (
    <SkeletonGroup label="Carregando carteira" className="gap-4">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="mt-1 h-4 w-36 rounded-md" />
      <Card variant="surface" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-warning"
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

/** Tela 4: Carteira, progresso de ritmo semanal e extrato completo por cursor. */
export function WalletView() {
  const meQuery = useWalletMeQuery()
  const ledgerQuery = useLedgerInfiniteQuery()
  const metaQuery = useWalletMetaQuery()

  const isDemoMode = metaQuery.data?.demo_mode === true
  const bothPending = meQuery.isPending && ledgerQuery.isPending
  const bothFailedWithoutData =
    meQuery.isError && !meQuery.data && ledgerQuery.isError && !ledgerQuery.data

  const cachedError =
    (meQuery.isError && meQuery.data ? meQuery.error : null) ??
    (ledgerQuery.isError && ledgerQuery.data && !ledgerQuery.isFetchNextPageError
      ? ledgerQuery.error
      : null)

  const handleRetryAll = () => {
    void meQuery.refetch()
    if (ledgerQuery.isFetchNextPageError) {
      void ledgerQuery.fetchNextPage()
      return
    }
    void ledgerQuery.refetch()
  }

  const entries = ledgerQuery.data?.pages.flatMap((page) => page.entries ?? []) ?? []

  return (
    <div className="flex flex-col gap-4 pb-2">
      <WalletHeader demo={isDemoMode} />

      <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">Carteira</h1>

      {cachedError && (
        <CachedErrorBanner
          message={messageFor(cachedError)}
          isFetching={meQuery.isFetching || ledgerQuery.isFetching}
          onRetry={handleRetryAll}
        />
      )}

      {bothPending ? (
        <WalletSkeleton />
      ) : bothFailedWithoutData ? (
        <ErrorState message={messageFor(meQuery.error)} onRetry={handleRetryAll} />
      ) : (
        <>
          {meQuery.isPending ? (
            <WalletHeroSkeleton />
          ) : meQuery.isError && !meQuery.data ? (
            <ErrorState
              message={messageFor(meQuery.error)}
              onRetry={() => {
                void meQuery.refetch()
              }}
            />
          ) : (
            <WalletHeroCard
              balance={meQuery.data.balance}
              tier={meQuery.data.tier}
              nextTierAt={meQuery.data.next_tier_at}
              streakWeeks={meQuery.data.streak_weeks}
              receiptsCount={meQuery.data.receipts_count}
            />
          )}

          {ledgerQuery.isPending ? (
            <LedgerSkeleton />
          ) : ledgerQuery.isError && !ledgerQuery.data ? (
            <ErrorState
              message={messageFor(ledgerQuery.error)}
              onRetry={() => {
                void ledgerQuery.refetch()
              }}
            />
          ) : (
            <LedgerList
              entries={entries}
              hasNextPage={Boolean(ledgerQuery.hasNextPage)}
              isFetchingNextPage={ledgerQuery.isFetchingNextPage}
              onLoadMore={() => {
                void ledgerQuery.fetchNextPage()
              }}
              nextPageErrorMessage={
                ledgerQuery.isFetchNextPageError ? messageFor(ledgerQuery.error) : null
              }
            />
          )}
        </>
      )}
    </div>
  )
}
