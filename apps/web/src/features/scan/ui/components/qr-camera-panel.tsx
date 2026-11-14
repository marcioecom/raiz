import type { RefObject } from "react"
import type { CameraStatus } from "../../types"

import { CameraOff, Flashlight, FlashlightOff, Keyboard, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface QrCameraPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>
  cameraStatus: CameraStatus
  torchSupported: boolean
  torchEnabled: boolean
  isSubmitting: boolean
  scanError: string | null
  onToggleTorch: () => void
  onRetryCamera: () => void
  onSwitchToManual: () => void
}

const CAMERA_SCAN_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes raiz-qr-sweep {
    0% {
      transform: translateY(8px);
      opacity: 0.35;
    }
    50% {
      opacity: 0.95;
    }
    100% {
      transform: translateY(196px);
      opacity: 0.35;
    }
  }
  .raiz-qr-sweep-line {
    top: 0;
    transform: translateY(8px);
    animation: raiz-qr-sweep 2.4s ease-in-out infinite alternate;
  }
}
`

export function QrCameraPanel({
  videoRef,
  cameraStatus,
  torchSupported,
  torchEnabled,
  isSubmitting,
  scanError,
  onToggleTorch,
  onRetryCamera,
  onSwitchToManual,
}: QrCameraPanelProps) {
  const isReady = cameraStatus === "ready"
  const isFallback = cameraStatus === "denied" || cameraStatus === "unavailable"

  return (
    <section aria-label="Leitor de Código QR" className="flex flex-col gap-4">
      <style>{CAMERA_SCAN_CSS}</style>

      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-forest lg:mx-auto lg:max-w-[380px]">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn(
            "h-full w-full object-cover",
            isReady ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />

        {isReady && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink/35" />

            {torchSupported && (
              <button
                type="button"
                onClick={onToggleTorch}
                aria-pressed={torchEnabled}
                aria-label={
                  torchEnabled ? "Desativar lanterna da câmera" : "Ativar lanterna da câmera"
                }
                className={cn(
                  "absolute top-3 right-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-150",
                  torchEnabled
                    ? "border-gold bg-gold text-ink"
                    : "border-on-forest/35 bg-forest/85 text-on-forest hover:bg-forest",
                )}
              >
                {torchEnabled ? (
                  <FlashlightOff aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Flashlight aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                )}
              </button>
            )}

            <div
              aria-hidden="true"
              className="pointer-events-none relative z-10 flex h-[216px] w-[216px] items-center justify-center"
            >
              <span className="absolute -top-px -left-px h-7 w-7 rounded-tl border-t-[3px] border-l-[3px] border-gold" />
              <span className="absolute -top-px -right-px h-7 w-7 rounded-tr border-t-[3px] border-r-[3px] border-gold" />
              <span className="absolute -bottom-px -left-px h-7 w-7 rounded-bl border-b-[3px] border-l-[3px] border-gold" />
              <span className="absolute -right-px -bottom-px h-7 w-7 rounded-br border-r-[3px] border-b-[3px] border-gold" />

              <span className="raiz-qr-sweep-line absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-gold to-transparent" />

              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-on-forest/30 motion-safe:animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              </span>
            </div>
          </>
        )}

        {cameraStatus === "starting" && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-on-forest"
          >
            <p className="text-[15px] font-medium leading-[22px]">Abrindo câmera...</p>
            <p className="text-[13px] leading-[18px] text-on-forest/80">
              Se preferir, digite os 44 dígitos abaixo.
            </p>
          </div>
        )}

        {isFallback && (
          <div
            data-surface="forest"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-on-forest"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-on-forest/25 bg-on-forest/10">
              <CameraOff aria-hidden="true" className="h-6 w-6 text-gold" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold leading-6">
                {cameraStatus === "denied"
                  ? "Câmera sem permissão"
                  : "Câmera indisponível neste aparelho"}
              </p>
              <p className="text-[13px] leading-[18px] text-on-forest/85">
                {cameraStatus === "denied"
                  ? "Libere o acesso à câmera nas configurações do navegador ou digite os 44 números."
                  : "Use a opção abaixo para digitar ou colar os 44 números do cupom."}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onRetryCamera}>
              <RefreshCw aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              <span>Tentar câmera de novo</span>
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-[15px] leading-[22px] text-ink-muted">
        {isSubmitting ? "Validando cupom..." : "Aponte para o QR Code da NFC-e."}
      </p>

      {scanError && (
        <Card variant="surface" role="alert" className="border-error bg-error-soft p-3.5">
          <p className="text-sm font-medium leading-5 text-error">{scanError}</p>
        </Card>
      )}

      <Button
        type="button"
        variant="sand"
        size="lg"
        onClick={onSwitchToManual}
        className="border-forest text-forest"
      >
        <Keyboard aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
        <span>Digitar 44 dígitos</span>
      </Button>

      <p className="text-center text-[13px] font-medium leading-[18px] text-ink-muted">
        Cupom já usado não pontua.
      </p>
    </section>
  )
}
