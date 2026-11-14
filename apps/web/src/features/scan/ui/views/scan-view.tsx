import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Keyboard, ScanLine } from "lucide-react"

import { useHideBottomBar } from "@/components/bottom-bar-context"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { useScan } from "../../hooks/use-scan"
import { ManualKeyForm } from "../components/manual-key-form"
import { QrCameraPanel } from "../components/qr-camera-panel"
import { ReceiptSuccessCard } from "../components/receipt-success-card"
import { ScanHelpPanel } from "../components/scan-help-panel"
import { ScanStatusBanners } from "../components/scan-status-banners"

export function ScanView() {
  useHideBottomBar(true)
  const scan = useScan()

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col justify-between gap-6 lg:min-h-0 lg:justify-start">
      <div className="flex flex-col gap-4 lg:gap-6">
        <header
          className={cn(
            "flex min-h-11 items-center justify-between gap-2",
            !scan.successResult && "lg:flex-col lg:items-start lg:gap-1.5",
          )}
        >
          <Link
            to="/"
            className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl px-2 -ml-2 text-[15px] font-semibold text-ink hover:bg-sand"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
            <span>{scan.successResult ? "Início" : "Voltar"}</span>
          </Link>

          {scan.successResult ? (
            <div className="flex items-center gap-3">
              <h1 className="sr-only lg:not-sr-only lg:text-2xl lg:font-bold lg:leading-[30px] lg:tracking-[-0.015em] lg:text-ink">
                Cupom registrado
              </h1>
              <Badge variant="success">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                <span>Cupom registrado</span>
              </Badge>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold leading-6 tracking-[-0.01em] text-ink lg:text-2xl lg:font-bold lg:leading-[30px] lg:tracking-[-0.015em]">
                Escanear cupom
              </h1>
              <span aria-hidden="true" className="w-16 lg:hidden" />
            </>
          )}
        </header>

        {scan.successResult ? (
          <>
            <ScanStatusBanners
              isOnline={scan.isOnline}
              queuedCount={scan.queuedCount}
              isFlushingQueue={scan.isFlushingQueue}
              queueNotice={scan.queueNotice}
              showSuccessNotice={false}
              onFlushQueue={scan.flushQueue}
            />
            <ReceiptSuccessCard
              result={scan.successResult}
              onScanAnother={scan.resetForAnotherScan}
            />
          </>
        ) : (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
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

              <ScanStatusBanners
                isOnline={scan.isOnline}
                queuedCount={scan.queuedCount}
                isFlushingQueue={scan.isFlushingQueue}
                queueNotice={scan.queueNotice}
                showSuccessNotice
                onFlushQueue={scan.flushQueue}
              />

              {scan.mode === "camera" ? (
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

            <ScanHelpPanel className="lg:col-span-5" />
          </div>
        )}
      </div>

      <footer className="pb-1 pt-2 text-center lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Raiz Fidelidade · Capim Dourado Shopping
        </p>
      </footer>
    </div>
  )
}
