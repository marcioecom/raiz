import type { CopyCodeFeedback, RedemptionStatus } from "../../types"

import { Check, CheckCircle2, Clock, Copy, Info, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTimeBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { formatCountdownMMSS } from "../../voucher"
import { VoucherQrCode } from "./voucher-qr-code"

export interface VoucherStatusPanelProps {
  status: RedemptionStatus
  remainingSeconds: number
  usedAt?: string | null
  redemptionsSupported: boolean
  isOnline: boolean
}

export interface VoucherCodeCardProps {
  status: RedemptionStatus
  voucherCode: string
  copyFeedback: CopyCodeFeedback | null
  onCopyCode: () => void
}

/** Exibe o ciclo de vida do voucher no balcão (`pending`, `used`, `expired`) sem lógica de rede. */
export function VoucherStatusPanel({
  status,
  remainingSeconds,
  usedAt,
  redemptionsSupported,
  isOnline,
}: VoucherStatusPanelProps) {
  return (
    <>
      {status === "pending" && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-warning-soft px-3 py-2.5 text-[13px] font-semibold leading-[18px] text-warning lg:justify-start">
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p>
              <span className="font-mono font-bold tabular-nums">
                {formatCountdownMMSS(remainingSeconds)}
              </span>{" "}
              restantes para usar
            </p>
          </div>

          {(!isOnline || !redemptionsSupported) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-sand px-3.5 py-2.5 text-ink-muted">
              <Info
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                strokeWidth={1.75}
              />
              <p className="text-[13px] font-medium leading-[18px]">
                {!isOnline
                  ? "Sem conexão para acompanhar a baixa automática do balcão. O código segue válido dentro do prazo."
                  : "Confirmação automática do balcão indisponível no momento. Após apresentar ao atendente, confirme abaixo."}
              </p>
            </div>
          )}
        </div>
      )}

      {status === "used" && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-success/40 bg-success-soft px-3.5 py-3 text-left"
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-success"
            strokeWidth={1.75}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold leading-5 text-success">Utilizado no balcão</p>
            <p className="text-[13px] font-medium leading-[18px] text-ink tabular-nums">
              {usedAt
                ? `Baixa confirmada em ${formatDateTimeBR(usedAt)}.`
                : "Baixa confirmada pelo lojista."}
            </p>
          </div>
        </div>
      )}

      {status === "expired" && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 rounded-lg border border-error bg-error-soft px-3 py-2.5 text-[13px] font-semibold leading-[18px] text-error lg:justify-start"
        >
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p>
            <span className="font-mono font-bold tabular-nums">00:00</span> · Prazo de 10 minutos
            encerrado
          </p>
        </div>
      )}
    </>
  )
}

/** Card com código alfanumérico de 6 caracteres, QR Code óptico e orientação de balcão. */
export function VoucherCodeCard({
  status,
  voucherCode,
  copyFeedback,
  onCopyCode,
}: VoucherCodeCardProps) {
  return (
    <Card variant="surface" className="flex flex-col items-center gap-3 p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {status === "used"
          ? "Código validado"
          : status === "expired"
            ? "Código expirado"
            : "Código de balcão"}
      </p>

      <div
        className={cn(
          "w-full rounded-xl border border-border px-4 py-2.5",
          status === "pending" ? "bg-canvas" : "bg-sand",
        )}
      >
        <p
          className={cn(
            "select-all font-mono text-[32px] font-bold leading-9 tracking-[0.15em]",
            status === "pending" ? "text-ink" : "text-ink-muted",
          )}
        >
          {voucherCode}
        </p>
      </div>

      {status === "pending" ? (
        <>
          <Button type="button" variant="secondary" onClick={onCopyCode}>
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

          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-ink-muted lg:hidden">
            <Sun aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Aumente o brilho do celular se necessário</span>
          </p>

          <div className="hidden items-start gap-2 rounded-xl border border-border bg-sand px-3.5 py-2.5 text-left text-[13px] font-medium leading-[18px] text-ink-muted lg:flex">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-forest"
              strokeWidth={1.75}
            />
            <p>
              Leve este código de 6 caracteres ou abra este endereço no celular para apresentar no
              balcão dentro de 10 minutos.
            </p>
          </div>
        </>
      ) : (
        <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
          {status === "used"
            ? "Este voucher já recebeu baixa no balcão e não pode ser apresentado novamente."
            : "A validade de 10 minutos foi encerrada. Se tiver saldo, gere um novo resgate no catálogo."}
        </p>
      )}
    </Card>
  )
}
