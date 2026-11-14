import type { DecodedAccessKey } from "../../access-key"

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

import { AccessKeyLocationCard } from "./access-key-help-content"

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
        className="grid grid-cols-4 gap-1.5 font-mono text-[13px] leading-5 tabular-nums lg:grid-cols-6"
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
      <AccessKeyLocationCard />
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
