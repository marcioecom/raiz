import { Navigate } from "@tanstack/react-router"
import { Check, CheckCircle2, Clock, Copy, Sun } from "lucide-react"

import { useHideBottomBar } from "@/components/bottom-bar-context"
import { RaizLogo } from "@/components/raiz-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatSeeds } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useVoucherDetail } from "../../hooks/use-voucher-detail"
import { formatCountdownMMSS } from "../../voucher"
import { VoucherQrCode } from "../components/voucher-qr-code"

export interface RewardDetailViewProps {
  rewardId: string
}

/** Tela 6B: Voucher ativo de balcão com código real, QR Code e contagem regressiva. */
export function RewardDetailView({ rewardId }: RewardDetailViewProps) {
  useHideBottomBar(true)

  const {
    redemption,
    remainingSeconds,
    expired,
    copyFeedback,
    copyCode,
    closeToCatalog,
    markAsUsed,
  } = useVoucherDetail(rewardId)

  if (!redemption) {
    return <Navigate to="/premios" replace />
  }

  const rewardTitle = redemption.reward?.title ?? "Benefício resgatado"
  const storeName = redemption.reward?.store_name
  const voucherCode = redemption.code ?? ""

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header className="flex min-h-11 items-center justify-between border-b border-border/70 pb-3">
        <RaizLogo />
        <Badge variant={expired ? "error" : "success"}>
          {expired ? (
            <Clock aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          <span>{expired ? "Expirado" : "Ativo"}</span>
        </Badge>
      </header>

      <section className="flex flex-col gap-1">
        <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
          Recompensa resgatada
        </p>
        <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">
          {rewardTitle}
        </h1>
        {storeName && (
          <p className="text-[13px] font-medium leading-[18px] text-ink-muted">{storeName}</p>
        )}
      </section>

      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold leading-[18px]",
          expired
            ? "border-error bg-error-soft text-error"
            : "border-border bg-warning-soft text-warning",
        )}
      >
        <Clock aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {expired ? (
          <p>
            <span className="font-mono font-bold tabular-nums">00:00</span> · Prazo de 10 minutos
            encerrado
          </p>
        ) : (
          <p>
            <span className="font-mono font-bold tabular-nums">
              {formatCountdownMMSS(remainingSeconds)}
            </span>{" "}
            restantes para usar
          </p>
        )}
      </div>

      <Card variant="surface" className="flex flex-col items-center gap-3 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Código de balcão
        </p>

        <div className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5">
          <p className="select-all font-mono text-[32px] font-bold leading-9 tracking-[0.15em] text-ink">
            {voucherCode}
          </p>
        </div>

        <Button type="button" variant="secondary" onClick={copyCode}>
          {copyFeedback?.tone === "success" ? (
            <Check
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-success"
              strokeWidth={1.75}
            />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          <span>Copiar código</span>
        </Button>

        <p
          role="status"
          className={cn(
            "min-h-[18px] text-[13px] font-medium leading-[18px]",
            copyFeedback?.tone === "error"
              ? "text-error"
              : copyFeedback?.tone === "success"
                ? "text-success"
                : "text-ink-muted",
          )}
        >
          {copyFeedback?.text ?? ""}
        </p>

        <VoucherQrCode
          value={voucherCode}
          label={`QR Code do voucher ${voucherCode} para validação no balcão`}
        />

        <p className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-ink-muted">
          <Sun aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>Aumente o brilho do celular se necessário</span>
        </p>
      </Card>

      <section className="flex flex-col gap-1.5 px-1 text-center">
        <p className="text-sm leading-5 text-ink-muted">
          {storeName
            ? `Apresente este código ou QR Code ao atendente de ${storeName} dentro da validade.`
            : "Apresente este código ou QR Code no balcão participante dentro da validade."}
        </p>
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
        <Button variant="primary" size="lg" onClick={closeToCatalog}>
          Fechar e voltar aos prêmios
        </Button>
        <Button variant="sand" size="lg" onClick={markAsUsed}>
          Já utilizei no balcão
        </Button>
      </div>
    </div>
  )
}
