import type { DecodedAccessKey } from "../../access-key"

import { ReceiptText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface AccessKeyPreviewCardProps {
  chunks: string[]
  digitsCount: number
  decodedPreview: DecodedAccessKey | null
}

export function AccessKeyPreviewCard({
  chunks,
  digitsCount,
  decodedPreview,
}: AccessKeyPreviewCardProps) {
  return (
    <Card variant="sand" className="flex flex-col gap-2.5 p-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Conferência da chave
        </span>
        <span className="font-mono text-xs font-semibold text-ink-muted tabular-nums">
          <strong className="text-ink">{digitsCount}</strong> / 44 dígitos
        </span>
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-4 gap-1.5 font-mono text-[13px] leading-5 tabular-nums"
      >
        {chunks.map((chunk, index) => (
          <span
            key={index}
            className={cn(
              "rounded px-1.5 py-0.5 text-center",
              chunk.length > 0
                ? "border border-border bg-card font-bold text-ink"
                : "border border-dashed border-control-border/50 text-ink-muted",
            )}
          >
            {chunk.length === 4 ? chunk : chunk.length > 0 ? chunk.padEnd(4, "_") : "____"}
          </span>
        ))}
      </div>
      {decodedPreview && (
        <p className="border-t border-border pt-2 font-mono text-xs font-medium text-forest tabular-nums">
          CNPJ {decodedPreview.formattedCnpj} · {decodedPreview.ufName} ·{" "}
          {decodedPreview.yearMonthLabel} · {decodedPreview.model === 65 ? "NFC-e" : "NF-e"}
        </p>
      )}
    </Card>
  )
}

export interface AccessKeyHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AccessKeyHelpDialog({ open, onOpenChange }: AccessKeyHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} closedby="any">
      <DialogHeader>
        <DialogTitle>Onde encontrar a chave no cupom?</DialogTitle>
        <DialogDescription>
          Procure a sequência de 44 dígitos dividida em 11 blocos de 4 números.
        </DialogDescription>
      </DialogHeader>
      <Card variant="sand" className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ReceiptText aria-hidden="true" className="h-4 w-4 text-forest" strokeWidth={1.75} />
          <span>No papel do cupom fiscal (NFC-e)</span>
        </div>
        <p className="text-[14px] leading-5 text-ink-muted">
          Logo acima ou abaixo do QR Code aparece o título{" "}
          <strong className="text-ink">CHAVE DE ACESSO</strong> seguido por 11 grupos de 4 números:
        </p>
        <p className="rounded-lg border border-border bg-card p-2.5 text-center font-mono text-xs font-semibold leading-5 tracking-wider text-ink tabular-nums">
          1726 0112 3456 7800 0199 6500 1000 0001 2311 2345 6787
        </p>
      </Card>
      <DialogFooter>
        <Button
          type="button"
          variant="primary"
          size="lg"
          autoFocus
          onClick={() => onOpenChange(false)}
        >
          Entendi
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
