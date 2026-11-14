import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { MobileBrandHeader } from "@/components/mobile-brand-header"
import { Button } from "@/components/ui/button"

import {
  useLedgerInfiniteQuery,
  useWalletMeQuery,
  useWalletMetaQuery,
} from "../../hooks/use-wallet"
import { LedgerList } from "../components/ledger-list"
import { WalletHeroCard } from "../components/wallet-hero-card"
import { LedgerSkeleton, WalletHeroSkeleton, WalletSkeleton } from "../components/wallet-skeleton"

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
    <div className="flex flex-col gap-4 pb-2 lg:gap-6 lg:pb-6">
      <MobileBrandHeader demo={isDemoMode} className="min-h-11" />

      <header className="flex items-center justify-between gap-4 lg:border-b lg:border-border/70 lg:pb-4">
        <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink lg:text-[28px] lg:leading-9">
          Carteira
        </h1>
        {isDemoMode && (
          <div className="hidden lg:block">
            <DemoBadge />
          </div>
        )}
      </header>

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
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
          <div className="min-w-0 lg:sticky lg:top-6 lg:col-span-5">
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
          </div>

          <div className="min-w-0 lg:col-span-7">
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
          </div>
        </div>
      )}
    </div>
  )
}
