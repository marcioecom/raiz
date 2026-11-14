import type { ComponentProps, ReactEventHandler } from "react"

import { createContext, useContext, useEffect, useId, useRef } from "react"

import { cn } from "@/lib/utils"

interface DialogContextValue {
  titleId: string
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  closedby?: "any" | "closerequest" | "none"
  className?: string
  children: React.ReactNode
}

export function Dialog({
  open,
  onOpenChange,
  closedby = "closerequest",
  className,
  children,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    dialog.setAttribute("closedby", closedby)

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, closedby])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || closedby !== "any" || "closedBy" in HTMLDialogElement.prototype) {
      return
    }

    let pressedOutside = false
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect()
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
    }

    const onPointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close()
      }
      pressedOutside = false
    }

    dialog.addEventListener("pointerdown", onPointerDown)
    dialog.addEventListener("pointerup", onPointerUp)
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown)
      dialog.removeEventListener("pointerup", onPointerUp)
    }
  }, [closedby])

  const handleCancel: ReactEventHandler<HTMLDialogElement> = (event) => {
    if (closedby === "none") {
      event.preventDefault()
    }
  }

  const handleClose: ReactEventHandler<HTMLDialogElement> = (event) => {
    event.currentTarget.returnValue = ""
    onOpenChange(false)
  }

  const close = () => {
    dialogRef.current?.close()
  }

  return (
    <DialogContext.Provider value={{ titleId, close }}>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={handleCancel}
        onClose={handleClose}
        className={cn(
          "mt-auto mb-0 mx-auto w-full max-w-[448px] rounded-t-3xl border border-border bg-card p-5 text-ink shadow-[0_12px_32px_rgba(22,36,29,0.16)] sm:my-auto sm:max-w-[416px] sm:rounded-2xl",
          className,
        )}
      >
        <div className="flex flex-col gap-4">{children}</div>
      </dialog>
    </DialogContext.Provider>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />
}

export function DialogTitle({ className, ...props }: ComponentProps<"h2">) {
  const ctx = useContext(DialogContext)
  return (
    <h2
      id={ctx?.titleId}
      className={cn("text-lg font-bold leading-6 tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-[15px] leading-[22px] text-ink-muted", className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}
