import type { QueueNotice } from "../../hooks/use-scan"

import { Send, WifiOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface ScanStatusBannersProps {
  isOnline: boolean
  queuedCount: number
  isFlushingQueue: boolean
  queueNotice: QueueNotice | null
  showSuccessNotice: boolean
  onFlushQueue: () => void
}

/** Avisos de conectividade e fila offline exibidos durante o registro de cupons. */
export function ScanStatusBanners({
  isOnline,
  queuedCount,
  isFlushingQueue,
  queueNotice,
  showSuccessNotice,
  onFlushQueue,
}: ScanStatusBannersProps) {
  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5 text-warning"
        >
          <WifiOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p className="text-[13px] font-medium leading-[18px]">
            Sem conexão no momento. Ao registrar, o cupom fica guardado na fila deste aparelho e
            será enviado quando a internet voltar.
          </p>
        </div>
      )}

      {queuedCount > 0 && (
        <Card
          variant="surface"
          className="flex flex-col gap-2.5 border-border bg-warning-soft/60 p-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="warning">Guardado na fila deste aparelho</Badge>
            <span className="text-[13px] font-semibold text-ink tabular-nums">
              {queuedCount === 1 ? "1 cupom pendente" : `${queuedCount} cupons pendentes`}
            </span>
          </div>

          <p className="text-[13px] leading-[18px] text-ink-muted">
            O envio será retomado automaticamente assim que a conexão estabilizar.
          </p>

          {isOnline && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isFlushingQueue}
              loadingText="Enviando fila..."
              onClick={onFlushQueue}
            >
              <Send aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              <span>Enviar fila pendente</span>
            </Button>
          )}
        </Card>
      )}

      {queueNotice?.tone === "success" && queuedCount === 0 && showSuccessNotice && (
        <p
          role="status"
          className="rounded-xl border border-border bg-success-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-success"
        >
          {queueNotice.text}
        </p>
      )}

      {queueNotice?.tone === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-sm font-medium leading-5 text-error"
        >
          {queueNotice.text}
        </div>
      )}
    </>
  )
}
