import { create as createQrCode } from "qrcode"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

export interface VoucherQrCodeProps {
  value: string
  label: string
  className?: string
}

const QR_QUIET_ZONE_MODULES = 4

function buildQrSvgData(value: string): { totalModules: number; pathData: string } | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  try {
    const qr = createQrCode(trimmed, { errorCorrectionLevel: "M" })
    const size = qr.modules.size
    const segments: string[] = []
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (qr.modules.get(row, col)) {
          segments.push(`M${col + QR_QUIET_ZONE_MODULES},${row + QR_QUIET_ZONE_MODULES}h1v1h-1z`)
        }
      }
    }
    return {
      totalModules: size + QR_QUIET_ZONE_MODULES * 2,
      pathData: segments.join(""),
    }
  } catch {
    return null
  }
}

/** Renderiza QR Code óptico client-side em `#16241D` sobre `#FFFFFF` para leitura no balcão. */
export function VoucherQrCode({ value, label, className }: VoucherQrCodeProps) {
  const qrData = useMemo(() => buildQrSvgData(value), [value])

  if (!qrData) {
    return (
      <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-border bg-sand p-4 text-center text-[13px] font-medium text-ink-muted">
        QR Code indisponível. Apresente o código de 6 caracteres no balcão.
      </div>
    )
  }

  return (
    <div
      className={cn("inline-flex rounded-xl border border-border bg-[#FFFFFF] p-2.5", className)}
    >
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${qrData.totalModules} ${qrData.totalModules}`}
        shapeRendering="crispEdges"
        className="h-48 w-48 sm:h-52 sm:w-52"
      >
        <rect width={qrData.totalModules} height={qrData.totalModules} fill="#FFFFFF" />
        <path d={qrData.pathData} fill="#16241D" />
      </svg>
    </div>
  )
}
