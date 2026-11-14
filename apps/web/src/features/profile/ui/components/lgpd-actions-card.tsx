import { Download, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface LgpdActionsCardProps {
  isExporting: boolean
  exportFeedback: string | null
  exportErrorMessage: string | null
  onExport: () => void
  isDeleteDialogOpen: boolean
  isDeleting: boolean
  deleteErrorMessage: string | null
  onDeleteDialogOpenChange: (open: boolean) => void
  onConfirmDelete: () => void
}

/** Seção de direitos LGPD com exportação JSON local e exclusão segura por diálogo nativo. */
export function LgpdActionsCard({
  isExporting,
  exportFeedback,
  exportErrorMessage,
  onExport,
  isDeleteDialogOpen,
  isDeleting,
  deleteErrorMessage,
  onDeleteDialogOpenChange,
  onConfirmDelete,
}: LgpdActionsCardProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isDeleteDialogOpen) {
      cancelButtonRef.current?.focus()
    }
  }, [isDeleteDialogOpen])

  return (
    <section aria-labelledby="lgpd-section-title" className="flex flex-col gap-3 pt-1">
      <h2
        id="lgpd-section-title"
        className="px-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted"
      >
        Seus dados e LGPD
      </h2>

      <Button
        variant="secondary"
        size="lg"
        loading={isExporting}
        loadingText="Preparando arquivo..."
        onClick={onExport}
      >
        <Download aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>Baixar meus dados</span>
      </Button>

      {exportErrorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-error"
        >
          {exportErrorMessage}
        </p>
      )}

      <p
        role="status"
        className={cn(
          "text-[13px] font-medium leading-[18px]",
          exportFeedback ? "text-success" : "visually-hidden",
        )}
      >
        {exportFeedback ?? ""}
      </p>

      <Button variant="destructive" size="lg" onClick={() => onDeleteDialogOpenChange(true)}>
        <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>Apagar minha conta</span>
      </Button>

      <p className="px-0.5 text-[13px] font-medium leading-[18px] text-ink-muted">
        Ao confirmar a exclusão, o acesso é encerrado na hora e os dados são anonimizados em até 30
        dias.
      </p>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
        closedby={isDeleting ? "none" : "closerequest"}
      >
        <DialogHeader>
          <DialogTitle>Apagar minha conta?</DialogTitle>
          <DialogDescription>
            Seu acesso ao Raiz será encerrado imediatamente e seus dados pessoais serão anonimizados
            em até 30 dias. Sementes e benefícios pendentes não poderão ser recuperados.
          </DialogDescription>
        </DialogHeader>

        {deleteErrorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-error bg-error-soft px-3.5 py-2.5 text-[13px] font-medium leading-[18px] text-error"
          >
            {deleteErrorMessage}
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            autoFocus
            disabled={isDeleting}
            onClick={() => onDeleteDialogOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            loading={isDeleting}
            loadingText="Apagando conta..."
            onClick={onConfirmDelete}
          >
            Confirmar exclusão
          </Button>
        </DialogFooter>
      </Dialog>
    </section>
  )
}
