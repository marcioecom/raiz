import type { SyntheticEvent } from "react"

import { useEffect, useId, useRef } from "react"

import { cn } from "@/lib/utils"

export interface JasonScareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  durationMs?: number
}

const DEFAULT_DURATION_MS = 3000

function isPointerOutsideDialog(dialog: HTMLDialogElement, clientX: number, clientY: number) {
  const rect = dialog.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom
}

function LargeJasonMaskArtwork() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-52 w-48 shrink-0"
      fill="none"
      viewBox="0 0 24 26"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2.2C7.2 2.2 4.5 5.8 4.5 11.2C4.5 17.5 7.7 22.8 12 23.8C16.3 22.8 19.5 17.5 19.5 11.2C19.5 5.8 16.8 2.2 12 2.2Z"
        fill="var(--color-canvas)"
        stroke="var(--color-gold)"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <path
        d="M9.4 5.2L12 8.1L14.6 5.2"
        stroke="var(--color-error)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.45"
      />
      <path
        d="M6.4 14.5H8.2M15.8 14.5H17.6"
        stroke="var(--color-error)"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      <circle cx="9" cy="11.2" r="1.6" fill="var(--color-ink)" />
      <circle cx="15" cy="11.2" r="1.6" fill="var(--color-ink)" />
      <circle cx="11.1" cy="14.4" r="0.6" fill="var(--color-ink)" />
      <circle cx="12.9" cy="14.4" r="0.6" fill="var(--color-ink)" />
      <circle cx="9.6" cy="17.2" r="0.6" fill="var(--color-ink)" />
      <circle cx="12" cy="17.2" r="0.6" fill="var(--color-ink)" />
      <circle cx="14.4" cy="17.2" r="0.6" fill="var(--color-ink)" />
      <circle cx="10.8" cy="19.6" r="0.55" fill="var(--color-ink)" />
      <circle cx="13.2" cy="19.6" r="0.55" fill="var(--color-ink)" />
      <path
        d="M10.2 3.7C11.4 3.4 12.6 3.4 13.8 3.7"
        stroke="var(--color-border)"
        strokeLinecap="round"
        strokeWidth="0.6"
      />
    </svg>
  )
}

export function JasonScareDialog({
  open,
  onOpenChange,
  durationMs = DEFAULT_DURATION_MS,
}: JasonScareDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closingRef = useRef(false)
  const pointerDownOutsideRef = useRef(false)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  function closeTopLayer(dialog: HTMLDialogElement) {
    if (!dialog.open || closingRef.current) return
    closingRef.current = true
    dialog.dataset.closing = "true"

    const finishClose = () => {
      if (!closingRef.current) return
      closingRef.current = false
      delete dialog.dataset.closing
      if (!dialog.open) return
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
        onOpenChangeRef.current(false)
      }
    }

    const animations =
      typeof dialog.getAnimations === "function" ? dialog.getAnimations({ subtree: true }) : []

    if (animations.length === 0) {
      finishClose()
      return
    }

    void Promise.allSettled(animations.map((animation) => animation.finished)).then(finishClose)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!open) {
      if (dialog.open) {
        closeTopLayer(dialog)
      }
      return
    }

    closingRef.current = false
    delete dialog.dataset.closing
    dialog.setAttribute("closedby", "any")

    if (!dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    }

    const timer = window.setTimeout(() => {
      closeTopLayer(dialog)
    }, durationMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [open, durationMs])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (closingRef.current) return
    event.preventDefault()
    closeTopLayer(event.currentTarget)
  }

  function handleClose() {
    closingRef.current = false
    const dialog = dialogRef.current
    if (dialog) {
      delete dialog.dataset.closing
    }
    onOpenChangeRef.current(false)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "raiz-scare-dialog m-auto w-[min(90vw,23rem)] max-h-[90dvh] overflow-y-auto",
        "rounded-3xl border border-gold/35 bg-ink p-6 text-center text-on-forest shadow-2xl",
      )}
      data-surface="forest"
      onCancel={handleCancel}
      onClose={handleClose}
      onPointerDown={(event) => {
        const dialog = event.currentTarget
        if ("closedBy" in dialog) return
        pointerDownOutsideRef.current =
          event.target === dialog && isPointerOutsideDialog(dialog, event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        const dialog = event.currentTarget
        if ("closedBy" in dialog) return
        const wasOutside = pointerDownOutsideRef.current
        pointerDownOutsideRef.current = false
        if (
          wasOutside &&
          event.target === dialog &&
          isPointerOutsideDialog(dialog, event.clientX, event.clientY)
        ) {
          closeTopLayer(dialog)
        }
      }}
    >
      <LargeJasonMaskArtwork />
      <h2 id={titleId} className="mt-3 font-serif text-[26px] leading-8 font-normal text-on-forest">
        Sexta-feira 13 no Capim.
      </h2>
      <p className="mt-1.5 text-sm leading-5 text-on-forest/75">Você cutucou a raiz 13 vezes.</p>
      <div className="mt-5 flex justify-center">
        <button
          autoFocus
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-on-forest/25 px-5 text-sm font-medium text-on-forest transition-colors hover:bg-on-forest/10"
          type="button"
          onClick={() => {
            const dialog = dialogRef.current
            if (dialog) closeTopLayer(dialog)
          }}
        >
          Fechar
        </button>
      </div>
    </dialog>
  )
}
