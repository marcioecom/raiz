import { Link, Navigate } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react"

import { messageFor } from "@/api/messages"
import { useHideBottomBar } from "@/components/bottom-bar-context"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { RaizLogo } from "@/components/raiz-logo"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useRewardsMeta } from "../../hooks/use-rewards"
import { useVoucherDetail } from "../../hooks/use-voucher-detail"
import { VoucherSkeleton } from "../components/voucher-skeleton"
import { VoucherCodeCard, VoucherStatusPanel } from "../components/voucher-status-panel"

export interface RewardDetailViewProps {
  rewardId: string
}

const DESKTOP_BACK_LINK_CLASS =
  "hidden min-h-11 items-center gap-2 self-start text-sm font-semibold text-forest hover:underline lg:inline-flex"

const STATUS_BADGE_MAP = {
  pending: { variant: "success", label: "Ativo", Icon: CheckCircle2 },
  used: { variant: "gold", label: "Utilizado no balcão", Icon: CheckCircle2 },
  expired: { variant: "error", label: "Expirado", Icon: Clock },
} as const

/** Tela 6B: Voucher de balcão com reidratação do servidor, polling de 5s e 3 estados. */
export function RewardDetailView({ rewardId }: RewardDetailViewProps) {
  useHideBottomBar(true)

  const metaQuery = useRewardsMeta()
  const isDemoMode = metaQuery.data?.demo_mode === true

  const {
    redemption,
    status,
    remainingSeconds,
    isInitialLoading,
    isLoadError,
    loadError,
    redemptionsSupported,
    isOnline,
    copyFeedback,
    copyCode,
    retryLoad,
    closeToCatalog,
    markAsUsed,
  } = useVoucherDetail(rewardId)

  const desktopTopBar = (
    <div className="hidden lg:flex lg:items-center lg:justify-between">
      <Link to="/premios" className={DESKTOP_BACK_LINK_CLASS}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        <span>Voltar aos prêmios</span>
      </Link>
      {isDemoMode && <DemoBadge />}
    </div>
  )

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-4 pb-4 lg:mx-auto lg:w-full lg:max-w-[860px]">
        <header className="flex min-h-11 items-center justify-between border-b border-border/70 pb-3 lg:hidden">
          <RaizLogo />
        </header>
        {desktopTopBar}
        <h1 className="visually-hidden">Detalhes do prêmio</h1>
        <VoucherSkeleton />
      </div>
    )
  }

  if (isLoadError) {
    return (
      <div className="flex flex-col gap-4 pb-4 lg:mx-auto lg:w-full lg:max-w-[860px]">
        <header className="flex min-h-11 items-center justify-between border-b border-border/70 pb-3 lg:hidden">
          <RaizLogo />
        </header>
        {desktopTopBar}
        <h1 className="visually-hidden">Detalhes do prêmio</h1>
        <ErrorState message={messageFor(loadError)} onRetry={retryLoad} />
        <Link
          to="/premios"
          className={cn(buttonVariants({ variant: "sand", size: "lg" }), "lg:hidden")}
        >
          Voltar aos prêmios
        </Link>
      </div>
    )
  }

  if (!redemption || !status) {
    return <Navigate to="/premios" replace />
  }

  const rewardTitle = redemption.reward?.title ?? "Benefício resgatado"
  const storeName = redemption.reward?.store_name
  const voucherCode = redemption.code ?? ""
  const badgeConfig = STATUS_BADGE_MAP[status]
  const StatusIcon = badgeConfig.Icon

  const statusBadge = (
    <Badge variant={badgeConfig.variant}>
      <StatusIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span>{badgeConfig.label}</span>
    </Badge>
  )

  return (
    <div className="flex flex-col gap-4 pb-4 lg:mx-auto lg:w-full lg:max-w-[860px]">
      <header className="flex min-h-11 items-center justify-between border-b border-border/70 pb-3 lg:hidden">
        <RaizLogo />
        {statusBadge}
      </header>

      {desktopTopBar}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6 lg:gap-y-4">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-6 lg:col-start-1 lg:row-start-1">
          <section className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
                Recompensa resgatada
              </p>
              <div className="hidden lg:block">{statusBadge}</div>
            </div>
            <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">
              {rewardTitle}
            </h1>
            {storeName && (
              <p className="text-[13px] font-medium leading-[18px] text-ink-muted">{storeName}</p>
            )}
          </section>

          <VoucherStatusPanel
            status={status}
            remainingSeconds={remainingSeconds}
            usedAt={redemption.used_at}
            redemptionsSupported={redemptionsSupported}
            isOnline={isOnline}
          />
        </div>

        <div className="min-w-0 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
          <VoucherCodeCard
            status={status}
            voucherCode={voucherCode}
            copyFeedback={copyFeedback}
            onCopyCode={copyCode}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-6 lg:col-start-1 lg:row-start-2">
          <section className="flex flex-col gap-1.5 px-1 text-center lg:px-0 lg:text-left">
            {status === "pending" && (
              <p className="text-sm leading-5 text-ink-muted">
                {storeName
                  ? `Apresente este código ou QR Code ao atendente de ${storeName} dentro da validade.`
                  : "Apresente este código ou QR Code no balcão participante dentro da validade."}
              </p>
            )}
            {redemption.reward?.terms && (
              <p className="text-[13px] leading-[18px] text-ink-muted">{redemption.reward.terms}</p>
            )}
            {typeof redemption.balance_after === "number" && (
              <p className="text-[13px] font-medium leading-[18px] tabular-nums text-ink-muted">
                Saldo após o resgate: {formatSeeds(redemption.balance_after)}{" "}
                {redemption.balance_after === 1 ? "semente" : "sementes"}
              </p>
            )}
          </section>

          <div className="flex flex-col gap-2.5 pt-1">
            {status === "pending" ? (
              <>
                <Button type="button" variant="primary" size="lg" onClick={closeToCatalog}>
                  Fechar e voltar aos prêmios
                </Button>
                <Button type="button" variant="sand" size="lg" onClick={markAsUsed}>
                  Já utilizei no balcão
                </Button>
              </>
            ) : (
              <Button type="button" variant="primary" size="lg" onClick={closeToCatalog}>
                Voltar aos prêmios
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
