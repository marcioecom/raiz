import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Keyboard, ScanLine, Send, WifiOff } from "lucide-react"

import { useHideBottomBar } from "@/components/bottom-bar-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useScan } from "../../hooks/use-scan"
import { ManualKeyForm } from "../components/manual-key-form"
import { QrCameraPanel } from "../components/qr-camera-panel"
import { ReceiptSuccessCard } from "../components/receipt-success-card"

export function ScanView() {
  useHideBottomBar(true)
  const scan = useScan()

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col justify-between gap-6">
      <div className="flex flex-col gap-4">
        <header className="flex min-h-11 items-center justify-between gap-2">
          <Link
            to="/"
            className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-2 -ml-2 text-[15px] font-semibold text-ink hover:bg-sand"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
            <span>{scan.successResult ? "Início" : "Voltar"}</span>
          </Link>

          {scan.successResult ? (
            <Badge variant="success">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              <span>Cupom registrado</span>
            </Badge>
          ) : (
            <>
              <h1 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink">
                Escanear cupom
              </h1>
              <span aria-hidden="true" className="w-16" />
            </>
          )}
        </header>

        {!scan.successResult && (
          <div
            role="group"
            aria-label="Forma de inserção do cupom"
            className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-sand p-1"
          >
            <button
              type="button"
              aria-pressed={scan.mode === "camera"}
              onClick={() => scan.switchMode("camera")}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors duration-150",
                scan.mode === "camera"
                  ? "bg-forest text-on-forest"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <ScanLine aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              <span>Câmera QR</span>
            </button>

            <button
              type="button"
              aria-pressed={scan.mode === "manual"}
              onClick={() => scan.switchMode("manual")}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors duration-150",
                scan.mode === "manual"
                  ? "bg-forest text-on-forest"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Keyboard aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              <span>Digitar 44 dígitos</span>
            </button>
          </div>
        )}

        {!scan.isOnline && (
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

        {scan.queuedCount > 0 && (
          <Card
            variant="surface"
            className="flex flex-col gap-2.5 border-border bg-warning-soft/60 p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="warning">Guardado na fila deste aparelho</Badge>
              <span className="text-[13px] font-semibold text-ink tabular-nums">
                {scan.queuedCount === 1
                  ? "1 cupom pendente"
                  : `${scan.queuedCount} cupons pendentes`}
              </span>
            </div>

            <p className="text-[13px] leading-[18px] text-ink-muted">
              O envio será retomado automaticamente assim que a conexão estabilizar.
            </p>

            {scan.isOnline && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={scan.isFlushingQueue}
                loadingText="Enviando fila..."
                onClick={scan.flushQueue}
              >
                <Send aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                <span>Enviar fila pendente</span>
              </Button>
            )}
          </Card>
        )}

        {scan.queueNotice?.tone === "success" && scan.queuedCount === 0 && !scan.successResult && (
          <p
            role="status"
            className="rounded-xl border border-border bg-success-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-success"
          >
            {scan.queueNotice.text}
          </p>
        )}

        {scan.queueNotice?.tone === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-sm font-medium leading-5 text-error"
          >
            {scan.queueNotice.text}
          </div>
        )}

        {scan.successResult ? (
          <ReceiptSuccessCard
            result={scan.successResult}
            onScanAnother={scan.resetForAnotherScan}
          />
        ) : scan.mode === "camera" ? (
          <QrCameraPanel
            videoRef={scan.videoRef}
            cameraStatus={scan.cameraStatus}
            torchSupported={scan.torchSupported}
            torchEnabled={scan.torchEnabled}
            isSubmitting={scan.isSubmitting}
            scanError={scan.submitError}
            onToggleTorch={scan.toggleTorch}
            onRetryCamera={scan.retryCamera}
            onSwitchToManual={() => scan.switchMode("manual")}
          />
        ) : (
          <ManualKeyForm
            form={scan.manualForm}
            chunks={scan.chunks}
            digitsCount={scan.digitsCount}
            decodedPreview={scan.decodedPreview}
            isPending={scan.isSubmitting}
            apiError={scan.submitError}
            helpOpen={scan.helpOpen}
            onHelpOpenChange={scan.setHelpOpen}
            onFormatChange={scan.handleManualInputChange}
            onPasteClick={scan.handlePasteKey}
            onSubmit={scan.onSubmitManual}
          />
        )}
      </div>

      <footer className="pb-1 pt-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Raiz Fidelidade · Capim Dourado Shopping
        </p>
      </footer>
    </div>
  )
}
