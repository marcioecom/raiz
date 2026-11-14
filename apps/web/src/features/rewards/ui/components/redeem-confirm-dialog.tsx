import type { Reward } from "../../voucher"

import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatSeeds } from "@/lib/format"

export interface RedeemConfirmDialogProps {
  reward: Reward | null
  balance: number
  isPending: boolean
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (reward: Reward) => void
}

/** Diálogo modal nativo (`showModal`) para confirmar o débito de sementes antes do resgate. */
export function RedeemConfirmDialog({
  reward,
  balance,
  isPending,
  errorMessage,
  onOpenChange,
  onConfirm,
}: RedeemConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (reward) {
      cancelButtonRef.current?.focus()
    }
  }, [reward])

  const cost = Math.max(0, Math.trunc(reward?.cost ?? 0))
  const safeBalance = Math.max(0, Math.trunc(balance))
  const balanceAfter = Math.max(0, safeBalance - cost)

  return (
    <Dialog
      open={Boolean(reward)}
      onOpenChange={onOpenChange}
      closedby={isPending ? "none" : "any"}
    >
      <DialogHeader>
        <DialogTitle>Confirmar resgate</DialogTitle>
        <DialogDescription>
          Ao confirmar, o código do voucher passa a valer por 10 minutos para apresentação no
          balcão.
        </DialogDescription>
      </DialogHeader>

      {reward && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-sand p-3.5">
          <div>
            <p className="text-base font-semibold leading-6 text-ink">
              {reward.title ?? "Benefício"}
            </p>
            {reward.store_name && (
              <p className="text-[13px] font-medium leading-[18px] text-ink-muted">
                {reward.store_name}
              </p>
            )}
          </div>

          <dl className="flex flex-col gap-1 border-t border-border pt-2 text-[13px] leading-[18px] tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-muted">Valor do resgate</dt>
              <dd className="font-semibold text-gold-text">
                {formatSeeds(cost)} {cost === 1 ? "semente" : "sementes"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-muted">Saldo após o resgate</dt>
              <dd className="font-semibold text-ink">
                {formatSeeds(balanceAfter)} {balanceAfter === 1 ? "semente" : "sementes"}
              </dd>
            </div>
          </dl>

          {reward.terms && (
            <p className="border-t border-border pt-2 text-[13px] leading-[18px] text-ink-muted">
              {reward.terms}
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-error"
        >
          {errorMessage}
        </p>
      )}

      <DialogFooter>
        <Button
          ref={cancelButtonRef}
          variant="secondary"
          autoFocus
          disabled={isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          loading={isPending}
          loadingText="Resgatando..."
          onClick={() => {
            if (reward) {
              onConfirm(reward)
            }
          }}
        >
          Confirmar resgate
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
